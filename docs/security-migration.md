# Isolamento administrativo e migração do CI/CD

## Auditoria

O fluxo anterior enviava Compose e scripts via SCP a `/opt/opusto`, gravável por `deploy`. O serviço root de backup executava código desse diretório. Proteger somente o arquivo não impedia substituição pelo diretório ancestral. Sudo irrestrito e grupo Docker tornavam a chave CI equivalente a root. **O risco continua na VPS até concluir esta migração administrativa.** Este PR não modifica a VPS.

## Arquitetura

O administrador humano mantém chave e canal de recuperação próprios. `opusto-ci` tem grupo exclusivo, nenhum sudo, nenhuma participação no grupo Docker e home root-owned. SSH usa chave exclusiva em `/etc/ssh/authorized_keys/opusto-ci`, comando forçado e bloqueio de SCP/SFTP, forwarding, TTY e user rc.

A única operação aceita é `deploy ghcr.io/vamaral2020/opusto@sha256:<64 hex minúsculos> <40 hex minúsculos>`. O cliente encaminha a requisição ao socket root:opusto-ci 0660 em `/run/opusto-deploy.sock`. systemd inicia um executor root por conexão; ele valida a entrada limitada, usa lock exclusivo, ambiente fixo, Python isolado e caminhos absolutos. Não há eval, shell de comandos remotos ou caminhos enviados pelo CI. Docker/Compose não retornam saída ao CI, pois pode conter secrets. Resultado: `OK` ou `FAILED`, com código não zero nas falhas.

| Recurso                                              | Permissões / atualização                                                   |
| ---------------------------------------------------- | -------------------------------------------------------------------------- |
| `/usr/local/libexec/opusto` e ancestrais             | root, sem escrita de grupo/outros; somente release administrativa revisada |
| Scripts shell privilegiados                          | root:root 0700                                                             |
| Gateway Python                                       | root:root 0755, sem imports do checkout                                    |
| `/etc/opusto` e registry                             | root:root 0700                                                             |
| `.env`, `.env.backup`, Compose, registry/config.json | root:root 0600                                                             |
| `/var/lib/opusto` e estado de deploy                 | root:root 0700                                                             |
| Home CI e diretório de chaves SSH                    | root, sem escrita do CI                                                    |
| Socket de deploy                                     | root:opusto-ci 0660                                                        |
| Docker socket                                        | CI sem acesso                                                              |

O executor recusa symlinks, ownership diferente de root e escrita por grupo/outros em código, configuração, estado e todos os ancestrais. Verificar também ACLs: nenhuma deve conceder escrita ou leitura de secrets ao CI. Arquivos em `.env` continuam sendo configuração shell confiada ao administrador.

A imagem autorizada executa código que necessariamente acessa PostgreSQL e mídia. Permissão para publicar/aprovar uma imagem continua sendo confiança no código da aplicação; este isolamento não impede exfiltração por código malicioso aprovado. A imagem não recebe Restic/R2/Healthchecks nem socket Docker. Compose fixa UID/GID 1001, remove capabilities e aplica no-new-privileges em app e migrations. Repositório/digest restritos impedem troca de registry, tags móveis e injeção; não comprovam autoria do conteúdo. O executor também confere labels OCI de source/revision antes de migrar; labels são metadados, não uma assinatura. Proteger publicação no GHCR e revisões/builds de `main`.

## Pré-condições e revisão separada

1. Revisar PR e resultados de testes de segurança e recuperação em ambiente descartável. Configurar branch rules em `main`: PR e checks obrigatórios, revisão CODEOWNERS, sem bypass do CI e sem force push. CODEOWNERS sozinho não aplica essas regras. Ter um revisor humano independente; se houver somente um mantenedor, criar a segunda identidade antes de habilitar a política. Restringir alterações de rules, environments e secrets.
2. Confirmar **segunda sessão administrativa independente**, chave própria, sudo funcional e console Hostinger. Manter essa sessão aberta. Nunca remover acesso antigo antes dessa confirmação e da validação do fluxo novo.
3. Bloquear novos deploys no environment `production-opus`, mantendo aplicação e timer de backup. Aguardar deploys/backups ativos concluírem. Guardar cópia root-only de units, manifests e estado antigos; registrar IDs de imagem/snapshot e timers sem imprimir env ou inspect completo.
4. Infraestrutura exige aprovação administrativa separada. Manter aprovação temporária no environment durante a ativação. Depois, deploy de aplicação pode continuar automático após revisão/checks de `main`. Alterar `ops/`, Compose ou units no Git **não instala** esses arquivos: administrador deve aplicar release privilegiada revisada por canal próprio.

## Provisionamento após aprovação

Roteiro manual; não executado pelo PR/Actions. Ensaiar primeiro em VPS descartável Ubuntu 24.04. Pré-requisitos: Docker/Compose existentes, Python 3, OpenSSH, systemd, Bash, jq, curl, util-linux/flock e CA certificados.

1. Obter archive do commit revisado, conferir SHA por canal confiável e extrair como root em `/root/opusto-reviewed`. Não executar installer por sudo de checkout editável pelo CI. Staging e ancestrais devem pertencer a root, sem symlinks ou escrita por grupo/outros; não incluir `.git` ou node_modules. Após revisar seu diff:

   ```bash
   sudo /bin/bash /root/opusto-reviewed/ops/security/install-reviewed.sh --install-reviewed
   ```

   Cria usuário CI dedicado, diretórios e arquivos revisados. Recusa conta existente com grupos/home/shell inesperados. Não remove grupos/sudoers, não copia secrets, não inicia/recarrega serviços e não altera banco/volumes/containers.

2. Administrador copia `.env` e `.env.backup` existentes para `/etc/opusto`, com os **mesmos valores literais**, root:root 0600. Não alterar senha, endpoint R2, Healthchecks, host/tags do backup ou retenção. Depois de aguardar todas as execuções antigas terminarem, ajustar somente a opção operacional `BACKUP_LOCK_FILE=/var/lib/opusto/backup.lock` na cópia protegida de `.env`: o novo lock fica em diretório root-only. Não misturar execuções com caminhos de lock diferentes. Transferir `.deploy-state` para `/var/lib/opusto/.deploy-state`, root-only e sem symlinks. Conferir ownership/permissões/ACLs com `namei -l` e `getfacl` em todos os caminhos da tabela e ancestrais. Não deixar cópias antigas acessíveis ao CI.

3. GHCR privado: configurar credencial root **somente read:packages** em `/etc/opusto/registry/config.json` 0600 por stdin seguro, sem token de publicação do Actions. Conferir que Compose mantém projeto `opusto`, portas, volumes `opusto_media` e `opusto_postgres`. Não executar `up` nesta etapa.

4. Instalar chave pública nova com opção `restrict` em `/etc/ssh/authorized_keys/opusto-ci`, root:root 0600. Não reutilizar a chave antiga. Verificar ausência de regras sudo diretas/indiretas/wildcard/LDAP com `sudo -l -U opusto-ci`, grupos com `id`, e nenhum ACL adicional. Conferir `sshd -t` e `sshd -T -C user=opusto-ci,host=localhost,addr=127.0.0.1`: ForceCommand correto, DisableForwarding yes, AuthorizedKeysFile absoluto. Revisar AllowUsers/AllowGroups e AcceptEnv existentes: não aceitar variáveis arbitrárias de ambiente (especialmente LD_*, BASH_ENV ou ENV); manter PermitUserEnvironment global desabilitado. Após confirmar segunda sessão administrativa, `systemctl reload ssh` sem fechá-la.

5. Aguardar backup ativo terminar, validar units e ativar somente socket:

   ```bash
   sudo systemd-analyze verify /etc/systemd/system/opusto-deploy.socket /etc/systemd/system/opusto-deploy@.service /etc/systemd/system/opusto-backup.service /etc/systemd/system/opusto-monitor.service
   sudo systemctl daemon-reload
   sudo systemctl enable --now opusto-deploy.socket
   ```

   Backup e monitor passam ao código protegido e configuração `/etc/opusto`. O backup passa a compartilhar o lock protegido `/var/lib/opusto/backup.lock`; repositório, staging, volumes e política permanecem iguais. Se o staging atual não for `/var/backups/opusto`, revisar separadamente `ReadWritePaths` do executor para permitir esse diretório protegido antes de habilitar backup pré-deploy. Timers mantêm agenda/Persistent, sem disable/re-enable. Não executar `restic init`, `forget`, `prune` ou retag na migração. Snapshots e tag `recovery-verified` permanecem intactos. Conferir `systemctl list-timers`, `systemctl cat opusto-backup.service` e próximo sucesso no Healthchecks. Verificação sem notificações:

   ```bash
   sudo env DEPLOY_DIR=/var/lib/opusto ENV_FILE=/etc/opusto/.env BACKUP_ENV_FILE=/etc/opusto/.env.backup COMPOSE_FILE=/etc/opusto/compose.prod.yaml /usr/local/libexec/opusto/verify-backup.sh
   ```

6. Atualizar `VPS_SSH_KEY` do environment com chave exclusiva CI, conferir host/known_hosts fora de banda. Workflow usa `opusto-ci`; `VPS_USER` e `VPS_DEPLOY_PATH` ficam obsoletos. Testar SSH com `id`, SCP, forwarding e leitura de secrets: devem falhar. Conferir por `runuser` negação de sudo, Docker e escrita nos diretórios, sem imprimir arquivos. Primeiro deploy aprovado usa digest de build validado de `main`. Ensaiar rollback em homologação. Liberar automação somente mantendo política de revisão/checks.

7. Após fluxo novo validado, administrador revoga chave antiga CI e remove privilégios sudo/Docker de `deploy`, em mudança própria revisada. Auditar regras indiretas e sessões/processos antigos que ainda conservem grupo Docker, encerrando-os somente após confirmar acesso independente. Até concluir isso, a identidade antiga continua com risco root. Proteger/remover cópias antigas de secrets/scripts em `/opt/opusto` conforme política de recuperação. Nenhum processo root pode continuar dependendo de diretório gravável por deploy. Confirmar próximo backup agendado e Healthchecks.

## Rollback e disponibilidade

Instalação/socket/chave não recriam containers. A aplicação continua com a imagem atual até deploy autorizado. Uma réplica Compose pode ter breve indisponibilidade na troca da imagem; isso não oferece alta disponibilidade nem rollback de banco.

Se migração falhar, manter deploy bloqueado, desativar somente `opusto-deploy.socket` e corrigir pelo administrador. Preservar timer de backup ativo. Restaurar units anteriores apenas se scripts/configurações e **todos os ancestrais** tiverem sido tornados root-owned, sem escrita CI/deploy; não reintroduzir SCP ou privilégios irrestritos. Pode usar scripts novos com units corrigidos/configs protegidas. Falha de SSH/socket não exige restauração dos dados.

Deploy registra imagem anterior; falha na troca/readiness restaura app e retorna erro. Falhas de backup/pull/migration abortam publicação. Migrations não são revertidas: usar expand/contract e [ensaio isolado de recuperação](backup-recovery.md). Rollback manual exclusivo do administrador:

```bash
sudo env DEPLOY_DIR=/var/lib/opusto ENV_FILE=/etc/opusto/.env COMPOSE_FILE=/etc/opusto/compose.prod.yaml /usr/local/libexec/opusto/rollback.sh
```

Atualizações privilegiadas futuras repetem release revisada, staging root-only, diff e autorização administrativa. Arquivar hash/aprovador/resultado sem secrets. Nunca colocar installer, sudo, SSH administrativo ou upload de manifests no pipeline comum.

## Testes

`pnpm test:security`: gramática, injeção, repositórios/tags, owners, symlinks e ancestrais. `pnpm test:security:linux`: Ubuntu descartável sem Docker socket/volumes/credenciais do host; instala provisionamento, testa negação real de sudo/Docker/leitura/escrita/renomeação, política efetiva sshd, IPC e deploy simulado, incluindo ancestral adulterado. Os ensaios existentes de backup mantêm dump, upload, retenção, recuperação e Healthchecks com dados descartáveis.

Referências: [OpenSSH](https://man.openbsd.org/sshd_config.5) e [systemd socket activation](https://www.freedesktop.org/software/systemd/man/latest/systemd.socket.html). `Accept=yes` e `StandardInput=socket` fornecem uma conexão por instância.
