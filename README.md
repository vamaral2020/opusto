# Opus TO

Monólito modular do Grupo Musical Opus Tocantins. O site público, o painel administrativo e as APIs do Payload CMS são executados pela mesma aplicação Next.js; PostgreSQL e os arquivos enviados ficam em volumes persistentes separados.

## Stack

- Node.js 24 LTS, Next.js 16 (App Router), React 19 e TypeScript strict
- Payload CMS 3 com RBAC e editor Lexical
- PostgreSQL 18 pelo adaptador oficial do Payload
- Tailwind CSS 4 e componentes Server React por padrão
- Docker Compose, Nginx, Let's Encrypt e GitHub Actions

## Desenvolvimento

Pré-requisitos: Node.js conforme [`.nvmrc`](.nvmrc), pnpm 11 e Docker com Compose.

```bash
cp .env.example .env
# Troque ao menos PAYLOAD_SECRET e POSTGRES_PASSWORD.
docker compose up --build
```

Abra `http://localhost:3000`. No primeiro acesso a `http://localhost:3000/admin`, o Payload permite criar o primeiro administrador. A porta do PostgreSQL de desenvolvimento é ligada apenas a `127.0.0.1`.

Para executar a aplicação no host e somente o banco no Docker:

```bash
docker compose up -d postgres
pnpm install --frozen-lockfile
pnpm dev
```

Nesse caso, ajuste `DATABASE_URL` para `127.0.0.1`. Em desenvolvimento, o Payload pode sincronizar o schema automaticamente. Migrações versionadas continuam obrigatórias para produção.

## Comandos

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
pnpm migrate
pnpm migrate:create nome_da_migracao
```

Após alterar coleções ou globais, execute `pnpm generate:types`, crie uma migração e revise os arquivos em `src/migrations`.

## Variáveis

Use [`.env.example`](.env.example) como referência. `PAYLOAD_SECRET`, senha do PostgreSQL e credenciais de backup nunca devem ser commitidos. Em produção, `PAYLOAD_SECRET` é obrigatório e a aplicação recusa a inicialização sem ele. `SITE_URL` deve conter a origem HTTPS sem barra final.

## Estrutura

- `src/app/(frontend)`: site, SEO e health checks
- `src/app/(payload)`: painel e endpoints nativos do Payload
- `src/collections`, `src/globals`, `src/access`: modelo de conteúdo e autorização
- `src/migrations`: migrações PostgreSQL versionadas
- `ops`: Nginx, deploy, monitoramento e backup
- `.github/workflows`: validação, imagem GHCR e entrega
- `docs`: decisões de arquitetura e runbooks

Consulte [arquitetura](docs/architecture.md), [infraestrutura](docs/infrastructure.md), [deploy](docs/deployment.md) e [backup/recuperação](docs/backup-recovery.md).
