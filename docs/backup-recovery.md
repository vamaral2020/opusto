# Backup Restic no Cloudflare R2 e recuperação isolada

## Escopo

O backup contém um dump PostgreSQL custom (`pg_dump --format=custom`) e os arquivos do volume `opusto_media` **no mesmo snapshot**. Restic 0.18.1 mantém sua criptografia e deduplicação padrão. O bucket R2 `opusto-backups` já possui um repositório inicializado: **não executar `restic init`, mudar a senha ou alterar o prefixo do repositório**.

A implementação não inicia/paralisa a aplicação, não modifica tabelas, não executa migrations e não escreve no volume de mídia. PostgreSQL oferece um dump transacionalmente consistente. O dump e o filesystem são capturados em momentos diferentes: evite exclusões/substituições de arquivos durante a execução; não é um snapshot atômico entre banco e disco. Uma restauração real deve conferir os vínculos de mídia.

## Arquivos separados

- `/opt/opusto/.env`: configurações existentes da aplicação e PostgreSQL; formato `KEY=value` compatível com shell, como já exigido pelo deploy.
- `/opt/opusto/.env.backup`: somente `RESTIC_REPOSITORY`, `RESTIC_PASSWORD`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` e, opcionalmente, `AWS_DEFAULT_REGION=auto` e `HEALTHCHECKS_PING_URL`. Use formato Docker env-file: valores literais, sem aspas, `export`, interpolação de `$` ou comentários no fim de valores. Caracteres como `$`, `#` e `=` na senha são preservados literalmente. Não copie senhas com aspas de shell ao redor.

O exemplo [.env.backup.example](../.env.backup.example) usa o endpoint S3 do R2. Preserve a URL **exata** já configurada, inclusive eventual prefixo após `opusto-backups`. Se a região não estiver no arquivo, o script usa `auto`. Restrinja o token ao bucket necessário; retenção com prune também precisa de permissão de exclusão. Guarde a senha do repositório e o token em um cofre separado da VPS. Não configure lifecycle que expire objetos internos do repositório sem passar pelo Restic.

O carregamento de credenciais não executa shell, recusa campos desconhecidos e não usa credenciais herdadas do ambiente ou de `.env` como fallback. Somente os cinco nomes necessários são encaminhados ao container Restic; credenciais PostgreSQL/Payload não são encaminhadas. A configuração Docker existente ainda lê `.env` normalmente para o `pg_dump`.

Opções operacionais em `.env` (defaults):

```dotenv
BACKUP_REQUIRED=false
BACKUP_STAGING_DIR=/var/backups/opusto
BACKUP_LOCK_FILE=/run/lock/opusto-backup.lock
BACKUP_MEDIA_VOLUME=opusto_media
BACKUP_HOST=opusto-production
BACKUP_RETENTION_ENABLED=false
RESTIC_IMAGE=restic/restic:0.18.1
```

`BACKUP_REQUIRED` continua controlando o backup pré-deploy já existente. Não habilitá-lo automaticamente. `DEPLOY_DIR`, `ENV_FILE`, `BACKUP_ENV_FILE` e `COMPOSE_FILE` podem ser fornecidos pelo chamador para ambientes isolados. Não compartilhe um `BACKUP_HOST` entre instalações diferentes.

## Fluxo e falhas

1. Validar os dois arquivos e as credenciais sem imprimi-los; desativar xtrace e aplicar `umask 077`.
2. Obter `flock` exclusivo compartilhado entre agendamento, execução manual, pré-deploy e verificação. Concorrência retorna 75; outras falhas retornam código não zero. O arquivo da trava nunca é apagado para preservar seu inode.
3. Criar subdiretório temporário privado no staging. Conferir o código de saída do `pg_dump`, tamanho não zero, assinatura `PGDMP` e decodificar **todo** o arquivo com `pg_restore --file=/dev/null`, sem conexão a banco. Essa verificação não substitui a restauração em um banco novo.
4. Conferir que o volume existe antes de montar; montar dump e mídia somente para leitura. Usar caminhos estáveis `/backup/postgres.dump` e `/media`, host estável e tag `opusto`. A etiqueta adicional identifica `scheduled`, `predeploy` ou uma execução manual.
5. Aceitar somente exit 0 do upload. O exit 3 do Restic indica backup incompleto e também falha. Ler o ID do resumo JSON, consultar o snapshot no repositório, conferir host/caminhos/tag e executar `restic check` antes de retenção.
6. Simular ou aplicar retenção conforme as proteções abaixo. Eliminar o dump temporário e arquivos JSON ao terminar, inclusive em falhas/sinais capturáveis. Interrupção abrupta da máquina/SIGKILL pode deixar staging privado; após confirmar que não há execução ativa, o operador deve revisar esses diretórios. Não remover o arquivo da trava.

Os logs contêm horário UTC, etapa, ID do snapshot quando validado e resultado. Saída bruta de Docker/PostgreSQL/Restic é suprimida para não vazar credenciais em erros de ferramentas; não há log com `set -x` nem argumentos contendo valores de segredos. Consulte a etapa registrada para investigar de forma controlada. Falha de retenção deixa o job com erro mesmo se o snapshot tiver sido enviado.

## Monitoramento opcional com Healthchecks.io

A variável `HEALTHCHECKS_PING_URL` já pode existir em `/opt/opusto/.env.backup`. O script agora a reconhece; não é preciso copiar ou substituir esse arquivo. A URL é um segredo: não colocá-la no Git, em comandos de teste, em logs ou em argumentos de processos. O exemplo versionado mantém o valor vazio, o que desabilita os pings. O script ignora valores herdados de `.env` ou do ambiente para essa variável e não a exporta nem encaminha aos containers.

A URL deve ser a base HTTPS de ping, sem sufixos `/start` ou `/fail`. Uma barra final é normalizada. Depois de obter o lock, a execução efetiva de backup envia um **GET** para `/start`. Ao sair, depois da limpeza do staging, envia GET à URL base somente se o backup completo, a validação do snapshot e a retenção configurada tiverem terminado com sucesso. Uma falha após o início efetivo, inclusive dump parcial, validação, retenção ou sinal capturável, envia GET para `/fail` e mantém o código de saída do backup.

Execuções recusadas pelo `flock`, verificações `--verify` (bem-sucedidas ou não) e falhas de preparação anteriores à aquisição do lock **não enviam pings**. Assim, uma tentativa concorrente não sobrescreve o estado do job ativo. Falhas que impedem o script de chegar ao início, assim como SIGKILL/desligamento abrupto, devem ser detectadas pelo atraso/ausência de pings configurado no Healthchecks.

Cada chamada usa curl com timeout de conexão de 2 segundos, limite total de 5 segundos e sem retries. Uma indisponibilidade pode acrescentar até 10 segundos ao job (ping inicial e final). HTTP não 2xx, timeout, curl ausente ou outro erro de transporte produzem apenas um aviso genérico no stderr/journal; não fazem o backup bem-sucedido falhar e não substituem um código de erro existente. Uma configuração inválida também é avisada sem mostrar seu valor. O script não segue redirects e mantém a verificação TLS.

A URL é passada ao curl por configuração em stdin, com escape de aspas/barras invertidas e rejeição de caracteres de controle/espaços. Não aparece em argv, na saída bruta do curl ou no trace; `.curlrc` do usuário é desconsiderado. Nenhum dump, credencial, corpo de logs ou conteúdo de mídia é enviado ao Healthchecks.

Para aplicar a integração, após revisar e aprovar o PR, instalar a nova versão de `ops/backup.sh` conforme os comandos abaixo. Não recriar `.env.backup`, alterar credenciais, reiniciar o banco ou habilitar novamente um timer que já esteja ativo. O próximo backup usará a variável existente. Os testes deste repositório usam URLs fictícias e um servidor HTTPS em loopback, nunca o endpoint real da VPS.

No painel do Healthchecks.io, conferir manualmente a periodicidade diária e uma tolerância que cubra o horário do timer (03:15, America/Araguaina), seu atraso aleatório de até 20 minutos e a duração esperada do backup. O `/start` permite detectar jobs demorados; dimensionar também o grace time para a duração máxima aceitável. Uma execução adicional manual ou pré-deploy usa o mesmo check, pois o mesmo script envia pings para qualquer backup efetivo. `--verify` não altera o check diário. Nenhuma configuração do Healthchecks ou agendamento é alterada automaticamente por este PR.

## Retenção: 7 diários, 4 semanais, 3 mensais

Por padrão `BACKUP_RETENTION_ENABLED=false`: o script executa `forget --dry-run`, sem `prune`. **Nenhum snapshot é removido antes do ensaio de recuperação e da habilitação explícita.**

Depois do ensaio, marcar o snapshot recuperado com `recovery-verified` e habilitar retenção em `.env`. Mesmo habilitada, a execução falha antes de qualquer exclusão se não encontrar um baseline com tags `opusto` e `recovery-verified`, mesmo host e os dois caminhos esperados.

A política usa `--keep-last 1 --keep-daily 7 --keep-weekly 4 --keep-monthly 3 --keep-tag recovery-verified --prune`, filtrando `--host opusto-production --tag opusto --group-by host`. Assim, o snapshot mais recente e todos os baselines de recuperação permanecem protegidos; diários, semanais e mensais podem se sobrepor. `check` é repetido após retenção.

O agrupamento por host é explícito: timestamps nos nomes antigos de dump e tags diferentes de agendamento não devem criar uma política separada por execução. Snapshots antigos sem `opusto` **não são gerenciados** pela política nova. Avalie-os separadamente; não os retague em massa nem remova o único backup antigo durante a transição. Baselines continuam retidos até uma decisão operacional explícita de retirar sua tag; atualize o baseline após mudanças importantes de schema/aplicação e repita o ensaio trimestralmente.

## Instalação manual na VPS (não executada por este PR)

Use um checkout/release revisado em diretório separado, não substitua `.env` ou `.env.backup` existentes:

```bash
cd /caminho/do/checkout-revisado
sudo apt-get update
sudo apt-get install -y jq util-linux tzdata curl ca-certificates
sudo install -d -m 0750 /opt/opusto/ops
sudo install -o root -g root -m 0750 ops/backup.sh /opt/opusto/ops/backup.sh
sudo install -o root -g root -m 0750 ops/verify-backup.sh /opt/opusto/ops/verify-backup.sh
sudo chown root:root /opt/opusto/.env.backup
sudo chmod 0600 /opt/opusto/.env.backup
sudo install -d -o root -g root -m 0700 /var/backups/opusto
sudo install -m 0644 ops/systemd/opusto-backup.service /etc/systemd/system/
sudo install -m 0644 ops/systemd/opusto-backup.timer /etc/systemd/system/
sudo systemd-analyze verify /etc/systemd/system/opusto-backup.service /etc/systemd/system/opusto-backup.timer
sudo systemctl daemon-reload
```

Conferir também que `.env` está protegido e que o backup pode ser lido pelo root. Se não houver `.env.backup`, criá-lo com `sudoedit` e modo 0600 a partir do exemplo, usando os segredos **do repositório existente**. Não exibir arquivos, `env`, `docker inspect` de containers com credenciais, nem comandos de trace no terminal/journal.

Primeiro backup e verificação manuais, ainda sem retenção destrutiva:

```bash
sudo /opt/opusto/ops/backup.sh initial-r2
sudo /opt/opusto/ops/verify-backup.sh
sudo journalctl -u opusto-backup.service --since today --no-pager
```

A execução direta escreve no terminal; o journal da unit só contém execuções feitas via systemd. A verificação amostra 5% dos dados e confere metadados; não comprova restauração completa. Antes de habilitar retenção, executar o procedimento isolado abaixo e registrar o ID recuperado, versão da aplicação, contagem de registros, amostras de mídia, duração e responsável.

Após o ensaio, usar o ID explícito recuperado (não `latest`):

```bash
sudo docker run --rm --env-file /opt/opusto/.env.backup \
  -e AWS_DEFAULT_REGION=auto restic/restic:0.18.1 \
  tag --add recovery-verified SNAPSHOT_VALIDADO
sudo docker run --rm --env-file /opt/opusto/.env.backup \
  -e AWS_DEFAULT_REGION=auto restic/restic:0.18.1 \
  snapshots --host opusto-production --tag opusto,recovery-verified
```

Adicionar tag altera o ID do snapshot; registrar o novo ID apresentado. Uma prévia legível da política, sem exclusões:

```bash
sudo docker run --rm --env-file /opt/opusto/.env.backup \
  -e AWS_DEFAULT_REGION=auto restic/restic:0.18.1 \
  forget --host opusto-production --tag opusto --group-by host \
  --keep-last 1 --keep-daily 7 --keep-weekly 4 --keep-monthly 3 \
  --keep-tag recovery-verified --dry-run
```

Só então editar `.env` com `sudoedit` e definir `BACKUP_RETENTION_ENABLED=true`. A aplicação não precisa ser reiniciada para essa opção: o script relê os arquivos a cada execução.

Para ativar **manualmente**, após a validação e aprovação operacional:

```bash
sudo systemctl enable --now opusto-backup.timer
sudo systemctl list-timers opusto-backup.timer
sudo systemctl status opusto-backup.timer
sudo journalctl -u opusto-backup.service --since today --no-pager
```

O timer roda diariamente às 03:15 em `America/Araguaina`, com atraso aleatório de até 20 minutos. `Persistent=true` recupera uma ocorrência perdida quando o timer voltar a ficar ativo após desligamento; não executa um backup para cada dia perdido. Serviço ordenado após Docker/rede, com timeout de 6 horas, prioridade reduzida e sem restart automático. Se o PostgreSQL ainda não estiver pronto ou houver erro de rede, o job falha e exige acompanhamento no journal; `Persistent` não é um mecanismo de retry de falhas. Conecte o estado de falha ao monitor operacional existente. Para suspender: `sudo systemctl disable --now opusto-backup.timer`.

## Restauração em ambiente isolado

Executar em máquina de recuperação autorizada, com Docker e espaço livre. Usar uma cópia protegida de `.env.backup`, sem a configuração Compose de produção. Os comandos abaixo **não usam** `opusto_media`, o banco de produção ou `/opt/opusto/compose.prod.yaml`. Não executar `stop app`, `dropdb`, `down -v` nem copiar arquivos sobre o volume de produção durante o ensaio.

1. Abrir um shell administrativo e manter os blocos seguintes nesse mesmo shell, para preservar as variáveis. Preparar um diretório vazio e listar snapshots:

```bash
sudo -i
RESTORE_ROOT=$(mktemp -d /var/tmp/opusto-restore.XXXXXXXX)
chmod 0700 "$RESTORE_ROOT"
BACKUP_CREDENTIALS=/caminho/seguro/.env.backup
sudo docker run --rm --env-file "$BACKUP_CREDENTIALS" \
  -e AWS_DEFAULT_REGION=auto restic/restic:0.18.1 \
  snapshots --host opusto-production --tag opusto
```

2. Escolher um **ID explícito**, anotar sua data e restaurar somente no diretório de ensaio. Não usar `latest` sem conferir host, tags e caminhos:

```bash
SNAPSHOT_ID=ID_EXPLICITO_ESCOLHIDO
sudo docker run --rm --env-file "$BACKUP_CREDENTIALS" \
  -e AWS_DEFAULT_REGION=auto \
  --mount "type=bind,source=$RESTORE_ROOT,target=/restore" \
  restic/restic:0.18.1 restore "$SNAPSHOT_ID" --target /restore
sudo test -s "$RESTORE_ROOT/backup/postgres.dump"
sudo test -d "$RESTORE_ROOT/media"
```

Snapshots do script antigo podem ter `/backup/postgres-TIMESTAMP.dump`. Conferir `restic ls ID` e usar o arquivo correto; não habilitar a retenção nova com baseline que não tenha os dois caminhos novos.

3. Criar um PostgreSQL 18 **novo**, sem portas de host, sem redes externas e sem volumes existentes. Nome gerado para evitar colisões:

```bash
RESTORE_DB="opusto-restore-$(date +%s)"
RESTORE_PASSWORD=$(openssl rand -hex 24)
export RESTORE_PASSWORD
sudo docker run -d --name "$RESTORE_DB" --network none \
  --tmpfs /var/lib/postgresql:rw \
  -e POSTGRES_USER=opusto_restore -e POSTGRES_DB=opusto_restore \
  -e POSTGRES_PASSWORD="$RESTORE_PASSWORD" postgres:18.6-alpine
# Repetir até retornar 1 com exit 0; exige banco criado e servidor TCP final:
sudo docker exec -e PGPASSWORD="$RESTORE_PASSWORD" "$RESTORE_DB" psql \
  --host=127.0.0.1 --username=opusto_restore --dbname=opusto_restore \
  --no-psqlrc --set=ON_ERROR_STOP=1 --tuples-only --no-align --command='SELECT 1'
```

Não usar somente `pg_isready`: a imagem oficial inicia um servidor temporário por socket durante a preparação, que pode aceitar conexões antes de criar o banco. A consulta TCP ao banco escolhido aguarda a inicialização completa.

A senha acima é descartável para o container isolado, não uma credencial de produção. Não ativar trace. O tmpfs usa RAM e não é adequado a bases maiores que a memória disponível: nesses casos, fazer o ensaio em host separado com bind de um diretório vazio e exclusivo de recuperação em `/var/lib/postgresql`, nunca o volume de produção. Encerrar esse container elimina seu banco temporário; conservar o snapshot remoto e o diretório restaurado até validar o ensaio.

4. Validar e importar o dump, encerrando com erro se houver falha:

```bash
sudo docker exec -i "$RESTORE_DB" pg_restore --file=/dev/null \
  < "$RESTORE_ROOT/backup/postgres.dump"
sudo docker exec -i "$RESTORE_DB" pg_restore \
  --username opusto_restore --dbname opusto_restore \
  --no-owner --no-acl --exit-on-error \
  < "$RESTORE_ROOT/backup/postgres.dump"
sudo docker exec "$RESTORE_DB" psql -U opusto_restore -d opusto_restore \
  -v ON_ERROR_STOP=1 -c 'SELECT count(*) FROM media;'
sudo docker exec "$RESTORE_DB" psql -U opusto_restore -d opusto_restore \
  -v ON_ERROR_STOP=1 -c 'SELECT filename, alt FROM media ORDER BY id LIMIT 10;'
```

O shell administrativo iniciado no passo 1 consegue ler os arquivos restaurados pelo container. Não alterar permissões para leitura pública.

5. As mídias já foram restauradas em `$RESTORE_ROOT/media`. Comparar nomes/quantidades com a tabela `media`, abrir amostras e conferir tamanhos/checksums dos originais e variantes do Payload. Para validar a aplicação completa, usar uma stack separada e a imagem compatível com o snapshot, com banco novo, `PAYLOAD_DISABLE_PUSH=true`, segredo **de teste**, URLs de teste e um bind deste diretório de mídia. Não conectar essa aplicação ao banco de produção ou ao R2 para gravação. Acessar login, home, notícias, galerias e arquivos referenciados; não publicar automaticamente essa instância. Registrar divergências e só marcar `recovery-verified` se o ensaio for aprovado.

6. Após registrar o resultado, encerrar apenas o container de ensaio pelo nome anotado. O diretório de recuperação continua disponível para inspeção; removê-lo de forma controlada depois, sem comandos globais de limpeza de volumes:

```bash
sudo docker rm --force "$RESTORE_DB"
unset RESTORE_PASSWORD
```

Restaurar produção é outra operação, que exige plano e aprovação específicos. Este procedimento não fornece comandos para sobrescrever banco ou mídias de produção.

## Testes do repositório

```bash
pnpm test
pnpm test:backup
pnpm format:check
pnpm lint
pnpm typecheck
```

`pnpm test` inclui cenários com Docker simulado: sucesso, credenciais ausentes, arquivo de configuração ausente, dump com erro/vazio/inválido, volume ausente, upload com falha/parcial, metadados inválidos, check com falha, retenção desabilitada/habilitada/com erro, verificação, concorrência e pings de início/sucesso/falha. Os testes conferem que valores literais não são executados nem aparecem nos logs e que o staging é limpo.

`pnpm test:backup` requer Docker, Bash, jq e flock (no macOS há um adaptador de teste usando Python 3). Usa PostgreSQL 18.6 e Restic 0.18.1 reais, contêineres exclusivos sem rede/portas e diretórios temporários. Um adaptador encaminha somente dump/validação para o banco de teste e troca o endpoint por um repositório **local**. Confere restauração de registros e bytes de mídia, retenção real com snapshots históricos, proteção de baseline e escopo por host. Também usa curl real e certificado de teste gerado com OpenSSL em servidor HTTPS local: valida GETs de início/sucesso/falha, ausência de pings na verificação e sucesso do backup mesmo com resposta HTTP 503. Requer curl e OpenSSL além das dependências anteriores. Os recursos de teste são removidos no `finally`. Não lê credenciais reais, não conecta ao R2 e não monta volumes existentes. O CI executa esse ensaio antes dos testes da aplicação.

## Referências

- [Healthchecks.io: pings de início e conclusão](https://healthchecks.io/docs/measuring_script_run_time/).
- [Healthchecks.io: sinalização de falhas](https://healthchecks.io/docs/signaling_failures/).
- [Restic 0.18.1: política de retenção e agrupamento](https://restic.readthedocs.io/en/v0.18.1/060_forget.html).
- [Restic 0.18.1: backups e códigos de saída](https://restic.readthedocs.io/en/v0.18.1/040_backup.html).
- [Cloudflare R2: endpoint S3 e região auto](https://developers.cloudflare.com/r2/get-started/s3/).
