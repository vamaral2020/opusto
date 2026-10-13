# Backup e recuperação

## Escopo e política

O backup inclui um dump consistente do PostgreSQL e todo o volume de mídia. `ops/backup.sh` usa restic para criptografar e enviar os dados a um repositório externo S3 compatível. Nada é ativado ou contratado automaticamente.

Retenção inicial: 7 diários, 4 semanais e 3 mensais. Objetivos operacionais sugeridos: RPO de 24 horas e RTO de 4 horas. Ajuste depois de validação com os responsáveis pelo projeto.

Não mantenha a única cópia na VPS. Restrinja a credencial do bucket, habilite versionamento/imutabilidade quando disponível e guarde a senha do restic em um cofre separado da máquina.

## Configuração

Preencha em `/opt/opusto/.env`:

```dotenv
RESTIC_REPOSITORY=s3:https://endpoint/bucket/opusto
RESTIC_PASSWORD=segredo-longo
AWS_ACCESS_KEY_ID=identificador
AWS_SECRET_ACCESS_KEY=segredo
AWS_DEFAULT_REGION=us-east-1
```

Inicialize uma vez e faça o primeiro backup:

```bash
docker run --rm --env-file /opt/opusto/.env restic/restic:0.18.1 init
sudo /opt/opusto/ops/backup.sh initial
sudo /opt/opusto/ops/verify-backup.sh
```

Ative o timer conforme `docs/infrastructure.md`. Verifique semanalmente o journal e snapshots; execute `verify-backup.sh` pelo menos mensalmente. Um `restic check` não substitui um ensaio de restauração.

## Restauração

Planeje janela de manutenção e registre a imagem e o snapshot escolhidos. Primeiro preserve o estado atual com um backup, quando possível.

1. Pare a aplicação, mantendo PostgreSQL disponível:

```bash
cd /opt/opusto
docker compose --env-file .env -f compose.prod.yaml stop app
mkdir -p /var/restore/opusto
docker run --rm --env-file .env -v /var/restore/opusto:/restore restic/restic:0.18.1 \
  restore latest --target /restore
```

2. Localize o dump restaurado em `/var/restore/opusto/backup`. Recrie o banco e restaure (substitua o nome do arquivo):

```bash
set -a; . /opt/opusto/.env; set +a
docker compose --env-file .env -f compose.prod.yaml exec -T postgres \
  dropdb --username "$POSTGRES_USER" --force "$POSTGRES_DB"
docker compose --env-file .env -f compose.prod.yaml exec -T postgres \
  createdb --username "$POSTGRES_USER" --owner "$POSTGRES_USER" "$POSTGRES_DB"
cat /var/restore/opusto/backup/postgres-TIMESTAMP.dump | \
  docker compose --env-file .env -f compose.prod.yaml exec -T postgres \
  pg_restore --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --no-owner
```

3. Restaure a mídia para o volume, depois ajuste propriedade para o UID/GID 1001 da aplicação:

```bash
docker run --rm -v /var/restore/opusto/media:/from:ro -v opusto_media:/to alpine:3.22 \
  sh -c 'rm -rf /to/* && cp -a /from/. /to/ && chown -R 1001:1001 /to'
```

4. Suba a imagem compatível com o snapshot e valide:

```bash
docker compose --env-file .env -f compose.prod.yaml up -d app
curl --fail http://127.0.0.1:3000/api/health/ready
```

Confirme login, páginas públicas, contagem de documentos e amostras de mídia. Só então remova `/var/restore/opusto` de forma segura.

## Ensaio

Trimestralmente restaure o snapshot em banco/volume temporários, sem tocar produção. Registre duração, tamanho, versão PostgreSQL, checks executados e responsável. Uma política de backup só é considerada válida depois que a restauração completa foi comprovada.
