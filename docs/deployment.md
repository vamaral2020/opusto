# Deploy

## Pré-requisitos da VPS

Use Ubuntu Server 24.04 LTS com 2 vCPU/4 GB, usuário sem senha com acesso por chave e `sudo`, Docker Engine/Compose, Nginx, Certbot e firewall liberando apenas SSH, 80 e 443. Reserve swap moderada se o plano não a fornecer e habilite atualizações automáticas de segurança.

Crie `/opt/opusto`, copie `compose.prod.yaml` e `ops`, e limite o arquivo de ambiente:

```bash
sudo install -d -m 750 -o "$USER" -g "$USER" /opt/opusto
cd /opt/opusto
install -m 600 .env.example .env
chmod 750 ops/*.sh
```

Preencha `.env` com domínio confirmado, segredo aleatório longo, credenciais PostgreSQL, referência de imagem. As credenciais Restic/R2 ficam separadas em `.env.backup`, com modo 600; consulte [backup e recuperação](backup-recovery.md). Não exponha `5432`. Para pacote GHCR privado, faça uma vez `docker login ghcr.io` usando um token somente `read:packages`.

## Primeiro deploy

1. Aponte os registros A de raiz e `www` para a VPS.
2. Obtenha o primeiro certificado antes de ativar a configuração TLS: pare o Nginx, execute `certbot certonly --standalone -d opusto.com.br -d www.opusto.com.br` e reinicie-o.
3. Renderize somente a variável de domínio para preservar variáveis internas do Nginx:

```bash
export APP_DOMAIN=opusto.com.br
envsubst '${APP_DOMAIN}' < ops/nginx/opusto.conf.template | sudo tee /etc/nginx/sites-available/opusto.conf >/dev/null
sudo ln -s /etc/nginx/sites-available/opusto.conf /etc/nginx/sites-enabled/opusto.conf
sudo nginx -t && sudo systemctl reload nginx
```

4. Inicie banco, aplique migrações e suba a aplicação:

```bash
docker compose --env-file .env -f compose.prod.yaml pull
docker compose --env-file .env -f compose.prod.yaml up -d postgres
docker compose --env-file .env -f compose.prod.yaml --profile operations run --rm migrate
docker compose --env-file .env -f compose.prod.yaml up -d app
curl --fail http://127.0.0.1:3000/api/health/ready
```

5. Abra `/admin`, crie o primeiro administrador e depois preencha os globais institucionais. Restrinja a criação do primeiro usuário ao período de implantação.

O Certbot deve instalar seu timer de renovação. Valide com `sudo certbot renew --dry-run`.

## GitHub Actions

Pull requests executam formatação, ESLint, typecheck, testes, migração limpa, build, smoke E2E, validação de Compose e build Docker. Um push em `main` repete as validações, publica `ghcr.io/<owner>/<repo>:<commit>` e só então conecta à VPS.

Configure o environment `production` e estes secrets:

- `VPS_HOST`: IP ou hostname da VPS.
- `VPS_USER`: usuário restrito de deploy.
- `VPS_SSH_KEY`: chave privada exclusiva da automação.
- `VPS_KNOWN_HOSTS`: linha verificada de `ssh-keyscan`.
- `VPS_DEPLOY_PATH`: normalmente `/opt/opusto`.

O token automático recebe apenas `contents:read` e `packages:write`. O build ocorre no GitHub, nunca na VPS. Proteja `main`, exija o workflow de CI e considere aprovação manual no environment de produção.

## Deploy e rollback

`ops/deploy.sh` registra a imagem corrente, opcionalmente executa backup, baixa a nova imagem, aplica migrações, troca o container e aguarda readiness. Se a aplicação falhar, volta para a imagem anterior e termina com erro.

Rollback manual:

```bash
sudo /opt/opusto/ops/rollback.sh
```

Isso restaura apenas a aplicação. Se a nova migração não for compatível com o código anterior, mantenha a versão nova, aplique uma migração corretiva ou siga o runbook de restauração. Nunca assuma que rollback de container altera PostgreSQL.

## Verificação

```bash
docker compose --env-file .env -f compose.prod.yaml ps
docker compose --env-file .env -f compose.prod.yaml logs --tail=200 app
curl --fail https://opusto.com.br/api/health/live
curl --fail https://opusto.com.br/api/health/ready
```

Teste também redirecionamento de `http` para `https`, `www` para raiz, login, upload de uma imagem e publicação de um item. Logs Docker têm rotação para não ocupar o disco indefinidamente.
