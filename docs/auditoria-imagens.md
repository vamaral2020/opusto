# Auditoria e gerenciamento de imagens — OpusTO

## Escopo e diagnóstico

Auditoria de `src/app/(frontend)`, componentes, globals, collections, metadados, `public`, CSS, Dockerfile e fluxo de deploy. Base: `origin/main` em `8f41cd8`. Nenhuma imagem remota fixa foi encontrada no código público. O único arquivo de imagem em `public` é `public/placeholders/orchestra-hall.webp`. O normalizador introduzido no PR #6 foi preservado; nenhuma permissão remota foi adicionada ao Next.js.

| Arquivo/localização                                                          | Classificação                | Situação anterior                                             | Solução                                                                                                                                 |
| ---------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/(frontend)/page.tsx`, banner                                        | Editorial                    | `home.heroImage`, já administrável                            | Mantido; seletor visual no admin, descrição 16:9 e carregamento prioritário                                                             |
| Mesmo arquivo, seção institucional                                           | Editorial                    | `media={null}`, sempre placeholder                            | Novo `home.aboutImage` independente do banner; fallback preservado                                                                      |
| `src/app/(frontend)/sobre/page.tsx`                                          | Editorial                    | `about.image`                                                 | Campo existente reutilizado, seletor visual e orientação 3:2                                                                            |
| `src/components/PostCard.tsx`, `src/app/(frontend)/noticias/[slug]/page.tsx` | Editorial                    | `posts.cover`                                                 | Mesmo ID/campo; seletor visual, descrição 3:2 e MediaImage preservado                                                                   |
| `src/components/EventCard.tsx`, `src/app/(frontend)/agenda/[slug]/page.tsx`  | Editorial                    | `events.cover`                                                | Mesmo ID/campo; seletor visual, descrição 3:2 e prioridade no detalhe                                                                   |
| `src/app/(frontend)/musicos/page.tsx`, `musicos/[slug]/page.tsx`             | Editorial                    | `musicians.portrait`                                          | Mesmo campo; seletor visual com orientação de retrato 4:5                                                                               |
| `src/app/(frontend)/galeria/page.tsx`, `galeria/[slug]/page.tsx`             | Editorial                    | `galleries.images[].image`; primeira imagem como capa         | Mantido; seletor visual por item, descrição 3:2 e legenda preservada                                                                    |
| `src/app/(frontend)/patrocinadores/page.tsx`                                 | Editorial                    | `sponsors.logo` obrigatório                                   | Campo obrigatório mantido; seletor visual, dimensões e proporção originais                                                              |
| `src/components/RichContent.tsx`                                             | Editorial                    | Conversor padrão do Lexical gerava img/picture sem MediaImage | Conversor de uploads passa pelo MediaImage; alt por ocorrência, legenda e crédito preservados; imagem responsiva                        |
| `src/components/Brand.tsx`, `BrandMark.tsx`, cabeçalho e rodapé              | Identidade configurável      | Símbolo SVG no código                                         | Novo `site-settings.logo`; seleção opcional, SVG original como fallback; execução no servidor antes de passar a marca ao Header cliente |
| `src/globals/SiteSettings.ts`, imagem social                                 | Identidade configurável      | `socialImage` persistida, não consumida                       | Agora utilizada como imagem Open Graph/Twitter padrão pelo layout e páginas; 1200 × 630 px                                              |
| `src/fields/seo.ts`, `meta.image`                                            | Editorial/SEO                | Campo existente, ignorado pelos metadados                     | Seletor visual em português; utilizado nas páginas correspondentes                                                                      |
| Home, Sobre, Contato e Privacidade, `generateMetadata`                       | Editorial/SEO                | Metadados fixos ou ausentes                                   | Usa meta do global; fallback para imagem do conteúdo e imagem social padrão                                                             |
| Notícias, Concertos, Músicos e Galerias, detalhes                            | Editorial/SEO                | Texto parcial ou nenhum metadado                              | Usa meta da collection; fallback para capa/retrato/primeira fotografia e imagem social padrão                                           |
| Listagens de Agenda, Notícias, Músicos, Galeria e Patrocinadores             | SEO compartilhado            | Nenhuma imagem específica de listagem                         | Herdam a imagem social padrão do layout, sem novos campos duplicados                                                                    |
| `src/components/MediaImage.tsx`, `public/placeholders/orchestra-hall.webp`   | Recurso técnico de fallback  | Imagem local para relações ausentes                           | Preservado para mídia ausente, inválida, não populada ou removida; não representa uma seleção editorial                                 |
| `BrandMark.tsx` sem logotipo configurado                                     | Fallback de identidade       | SVG original                                                  | Preservado para manter a identidade existente sem migrar dados                                                                          |
| Ícones Lucide, SVGs funcionais e estilos CSS                                 | Recurso técnico da interface | Navegação, contato, botões e formas estruturais               | Mantidos no código; não precisam de uploads                                                                                             |
| Contato e Privacidade                                                        | Editorial                    | Não há fotografias no corpo dessas páginas                    | Nenhum campo decorativo inventado; imagens de SEO existentes conectadas                                                                 |

## Campos do painel

Somente dois novos campos persistidos:

- **Página inicial → Imagem institucional** (`home.aboutImage`), opcional, recomendação 3:2, 1080 px de largura.
- **Configurações do site → Logotipo do site** (`site-settings.logo`), opcional, símbolo transparente 3:5, altura recomendada de 180 px. Nome e assinatura da marca permanecem no layout atual.

Campos existentes convertidos de `relationship` para `upload`, sem renomear nem alterar seus IDs: `home.heroImage`, `about.image`, `posts.cover`, `events.cover`, `musicians.portrait`, `galleries.images[].image`, `sponsors.logo`, `site-settings.socialImage` e todos os `meta.image` existentes. O Payload oferece seleção visual, upload e remoção de seleção; os campos já obrigatórios continuam obrigatórios. Legenda, crédito e texto alternativo continuam na coleção **Mídias**; a legenda específica de um item de galeria e o alt por ocorrência no texto rico são preservados.

As descrições e rótulos dos campos de imagem e SEO estão em português. As proporções são orientações, sem recorte destrutivo dos originais. Não foram criadas collections novas.

## Publicação e atualização

As páginas e o layout públicos chamam `connection()` e leem o Payload durante a requisição. `getSiteSettings` usa apenas o cache de renderização do React, sem cache entre requisições. Home, Sobre, Contato, Privacidade e collections com drafts mostram os documentos publicados; após editar uma imagem, use **Publicar**. Configurações do site não possui drafts: use **Salvar**.

Trocar uma seleção aponta para outro upload, com URL própria; a próxima requisição pública usa o novo arquivo sem build ou deploy. Para evitar cache de URL de arquivo já otimizado, prefira carregar um novo arquivo na coleção Mídias e substituir a seleção. Remover a seleção não apaga o arquivo: ele pode continuar sendo usado em outras páginas. A exclusão de um registro de Mídias remove o arquivo pelo comportamento normal do Payload; confira antes todos os seus usos.

SEO: prioridade `meta.image` → imagem do conteúdo (quando houver) → `site-settings.socialImage`. URLs de compartilhamento são absolutas, apropriadas para crawlers; URLs passadas ao otimizador continuam relativas quando pertencem a `SITE_URL`. Redes sociais podem manter seu próprio cache da prévia.

## Migration e segurança dos dados

`20261016_180912_cms_managed_images` foi gerada pela CLI do Payload a partir do snapshot anterior. A migration `up` somente adiciona três colunas nullable, respectivas FKs para Mídias com `ON DELETE SET NULL` e índices: `home.about_image_id`, `_home_v.version_about_image_id` e `site_settings.logo_id`. Não atualiza, exclui ou recria registros/tabelas. O histórico existente permanece intacto. O snapshot e o registro em `src/migrations/index.ts` são versionados.

O `down` gerado existe para reversão de schema e remove exclusivamente os campos novos; não foi executado. Não use rollback de schema após preencher esses campos sem avaliar a perda desses valores. O deploy existente reverte somente a imagem da aplicação, preservando migrations já aplicadas.

`compose.prod.yaml`, Dockerfile e scripts operacionais não foram alterados. App e serviço migrate continuam montando o volume nomeado `opusto_media` em `/app/media`; o build não copia arquivos editoriais para substituir o volume. Nenhum comando foi executado na VPS. Os testes de banco usam somente um PostgreSQL local temporário com armazenamento em tmpfs, sem volumes existentes.

## Validação reproduzível

Validação local concluída: formatação, lint, typecheck, 35 testes unitários e build passaram. A migration foi aplicada com sucesso em PostgreSQL 18.6 temporário, com comparação de dados e arquivos antes/depois. Os testes de navegador passaram em 7 casos; a repetição da edição administrativa em mobile foi ignorada intencionalmente. Os dois workflows alterados também passaram no actionlint.

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
PAYLOAD_SECRET=build-only-test-secret PAYLOAD_DISABLE_PUSH=true pnpm build
```

Teste de integração: `DATABASE_URL` deve apontar para uma base **nova, descartável**, no host local e com nome terminado em `_test`. O teste recusa bases que já tenham migrations. Não aponta para produção, não limpa tabelas nem reseta bases existentes.

```sh
DATABASE_URL=postgresql://opusto_test:opusto_test@127.0.0.1:55436/opusto_images_test pnpm test:cms
```

O teste aplica o schema anterior, insere documentos com relacionamentos de mídia, salva os bytes de um arquivo, aplica a migration nova e compara todos os registros de teste e o arquivo antes/depois. Verifica também campos opcionais, troca/remoção independente, versões e reaplicação sem efeito. Imprime `CMS_IMAGE_TEST_MEDIA_DIR` com o diretório temporário que deve ser usado pelo servidor para os testes de navegador. O CI executa essa validação antes de iniciar o site.

Para repetir a validação de navegador, inicie o build com o mesmo `DATABASE_URL`, `PAYLOAD_SECRET`, `SITE_URL` e `MEDIA_DIR` impresso pelo teste. Em outro terminal, execute com a mesma base de testes:

```sh
CMS_IMAGE_TESTS=true PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 DATABASE_URL=postgresql://opusto_test:opusto_test@127.0.0.1:55436/opusto_images_test pnpm test:e2e
```

O teste administrativo roda uma vez em desktop: seleciona uma imagem no painel, publica, troca/remove a seleção no servidor já em execução, confere a independência do banner, resposta 200 do otimizador, logotipo e metatags sociais. Os testes públicos rodam em desktop e mobile; a repetição administrativa em mobile é explicitamente ignorada.

Os testes unitários cobrem URLs do Payload, fallback, troca de imagem da home sem rebuild, identidade, conversão do texto rico e prioridade dos metadados. Um teste do fluxo de deploy executa o script com Docker/curl simulados, verificando os comandos de implantação sem executar Docker real ou remover volumes.

## Roteiro de homologação

1. Em ambiente de homologação, com backup e revisão da migration, aplicar `pnpm migrate` e iniciar a versão proposta. Esse é o único deploy necessário para disponibilizar os campos novos.
2. Entrar no painel com um usuário autorizado. Em Mídias, cadastrar duas imagens com alt, legenda e crédito diferentes.
3. Em Página inicial, selecionar uma imagem em **Imagem principal** e outra em **Imagem institucional** usando o seletor visual. Publicar. Abrir a home e conferir as duas imagens, prioridade no banner e layout em desktop/mobile.
4. Trocar apenas a imagem institucional e publicar. Recarregar a home: o banner deve continuar igual. Remover somente a seleção institucional: deve reaparecer o fallback. Repetir no banner, sem apagar os arquivos de Mídias.
5. Em Sobre, Notícias, Concertos, Músicos, Galerias e Patrocinadores, selecionar/trocar uma mídia e publicar. Conferir cartões e detalhes; legenda da galeria e fotografias em textos ricos devem continuar corretas. A logomarca de patrocinador e imagens de itens da galeria continuam obrigatórias; para removê-las do site, remover o item/documento ou despublicá-lo.
6. Em Configurações do site, selecionar um logotipo transparente e uma imagem social padrão. Salvar; recarregar páginas públicas e conferir cabeçalho, rodapé e metatags. Remover o logotipo e conferir o símbolo SVG atual.
7. Em uma notícia ou global, selecionar **SEO → Imagem de compartilhamento** e publicar. Inspecionar `og:image`, `og:image:alt` e `twitter:image`; limpar a seleção e conferir fallback para a imagem do conteúdo ou padrão.
8. Conferir que `/_next/image` recebe `url=/api/media/file/...` para mídia da própria aplicação e responde 200. Verificar lazy loading das imagens secundárias, alt e ausência de deslocamento do layout.
9. Confirmar que nenhum novo build, reinício ou deploy ocorre durante as trocas dos passos 3–7. Os uploads antigos e vínculos não editados devem continuar disponíveis.

Os testes locais não substituem a conferência visual da arte definitiva e das prévias em redes sociais em homologação.
