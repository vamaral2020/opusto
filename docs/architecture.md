# Arquitetura

## Visão geral

O projeto é um monólito modular. Uma única aplicação Node.js contém o site institucional, o painel autenticado e as APIs geradas pelo Payload. Isso reduz operação e consumo de memória na VPS de 4 GB sem impedir a separação futura do armazenamento de mídia.

```text
Internet -> Nginx/HTTPS -> Next.js + Payload -> PostgreSQL (rede Docker)
                              |
                              +-> volume local de mídia
```

O PostgreSQL não possui porta publicada no Compose de produção. O processo Next.js é publicado somente em `127.0.0.1`, ficando acessível externamente apenas pelo Nginx.

## Módulos implementados

- Páginas públicas: início, sobre, agenda, notícias, músicos, galeria, patrocinadores, contato e privacidade.
- Conteúdo: eventos, notícias, músicos, galerias, patrocinadores e mídia.
- Configuração institucional: início, sobre, contato, privacidade e configurações do site.
- Administração: usuários autenticados com papéis `admin` e `editor`.
- Contato: validação Zod, honeypot, limitação básica por IP e armazenamento privado no CMS.
- Operação: liveness, readiness com consulta ao banco, logs do processo e identificação do build.

Coleções editoriais usam rascunho/publicação. Visitantes leem somente conteúdo publicado; usuários autenticados podem revisar rascunhos. Somente administradores gerenciam usuários. Senhas, sessão, bloqueio após tentativas e hashing são recursos nativos do Payload.

## Renderização e dados

As páginas que consultam conteúdo do CMS são Server Components renderizados no servidor. O acesso usa a Local API do Payload dentro do mesmo processo, sem uma chamada HTTP intermediária. Páginas de conteúdo usam SSR para refletir publicações imediatamente; `robots.txt` e sitemap são produzidos pelo App Router. Otimizações futuras podem introduzir cache e revalidação explícita quando o volume justificar.

Vídeos permanecem externos: somente URLs YouTube/Vimeo são convertidas em embeds. Uploads do CMS aceitam formatos de imagem explícitos e têm limite configurável. O diretório de mídia é abstraído por configuração e volume, permitindo migrar para um adaptador S3 sem alterar as páginas.

## Segurança

- TLS e HSTS terminados no Nginx.
- Aplicação e banco não expostos diretamente à internet.
- `PAYLOAD_SECRET` obrigatório em produção e segredos fora do repositório.
- RBAC por coleção/operação e rotas administrativas protegidas pelo Payload.
- Rate limiting adicional no Nginx para contato e login.
- Cabeçalhos de segurança no Next.js e no proxy.
- GraphQL desativado; APIs REST nativas continuam disponíveis conforme as regras de acesso.
- Imagens imutáveis identificadas pelo SHA do commit.

O rate limiting em memória do formulário é uma proteção complementar e local ao processo. Em uma única réplica atende ao porte inicial; uma solução compartilhada só será necessária com múltiplas réplicas.

## Migrações

Produção usa migrações em `src/migrations`; `push` de schema fica desativado. Cada deploy executa a migração antes de trocar a aplicação. Mudanças devem ser compatíveis entre a versão anterior e a nova sempre que possível: adicionar antes de remover, preencher dados em etapa separada e só tornar campos obrigatórios depois.

Rollback de imagem não desfaz migração. Alterações destrutivas exigem backup verificado e um plano de restauração ou migração reversa revisada.

## Diagnóstico e roteiro

O repositório inicial continha apenas metadados de Git/IDE, sem aplicação preservável. A adequação obrigatória criou a base Next/Payload/PostgreSQL, containers, migração inicial, CI/CD, controles de acesso e documentação.

Melhorias recomendadas após entrada de conteúdo real: adapter de e-mail transacional para alertas de contato, armazenamento S3 compatível, monitor externo de URL e uma política editorial de imagens/alt text. Implementações futuras incluem cache com revalidação sob demanda, testes de restauração automatizados e perfis administrativos mais granulares.

Decisões pendentes: confirmação do domínio, provedor/bucket de backup, endereço de e-mail operacional, política de consentimento/privacidade final e credenciais definitivas da VPS. Nenhum recurso externo foi contratado ou provisionado pelo projeto.
