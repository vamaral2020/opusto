# Identidade visual da Opus Tocantins

## Paleta escolhida

| Cor           | HEX       | Uso                                                            |
| ------------- | --------- | -------------------------------------------------------------- |
| Azul profundo | `#0D1B2A` | Cabeçalho, rodapé, títulos, texto e superfícies institucionais |
| Dourado       | `#B4873B` | Símbolo, linhas, detalhes e chamadas em fundo azul             |
| Marfim        | `#F7F2E8` | Superfícies de leitura e texto em fundo azul                   |

Os tokens estão em `src/app/(frontend)/styles.css`. Tons auxiliares de borda,
texto secundário e hover derivam dessas cores. A cor de erro é semântica e não
faz parte da paleta institucional. Branco em uma superfície secundária não
substitui o marfim como fundo principal.

## Contraste

- Azul e marfim: aproximadamente 15,59:1.
- Dourado e azul: aproximadamente 5,36:1.
- Dourado e marfim: aproximadamente 2,91:1; não usar em texto de leitura.
- Dourado e branco: aproximadamente 3,25:1; não usar texto branco em botão dourado.

Botões principais de conteúdo usam azul/marfim. No cabeçalho e no hero,
botões de destaque usam dourado/azul. Chamadas pequenas no hero ficam em
marfim sobre uma área com camada azul opaca, evitando depender da fotografia
para obter contraste. O dourado permanece plano, sem simulação de metal.

## Marca e tipografia

`BrandMark.tsx` contém uma adaptação vetorial simplificada do motivo de
instrumento da arte fornecida. Não é uma extração fiel nem o arquivo oficial
da logo: a referência disponível é uma composição JPEG promocional. A
assinatura tem fundo transparente, usa cores planas e herda `currentColor`,
permitindo aplicação monocromática. A composição fotográfica, a moldura e o
pentagrama não são usados na navegação.

Substituir a adaptação pelo vetor original quando ele for disponibilizado.
A tipografia da assinatura e do site permanece provisória: Georgia nos
títulos e Arial no corpo, sem contratação ou escolha definitiva de fonte.

## Conteúdo e validação

Preservar os modelos editoriais e não inventar concertos, músicos ou fatos
institucionais. A sala de concertos é um placeholder, não uma fotografia da
Opus Tocantins. A definição de categorias para ensaios e projetos culturais
é uma decisão editorial separada desta correção visual.

Conferir no navegador: navegação por teclado, abertura/fechamento do menu,
foco visível, largura de 360 px, desktop e imagens reais cadastradas no CMS.
