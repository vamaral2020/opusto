import type { Field } from 'payload'

import { imageField } from './image'

export const seoFields: Field = {
  name: 'meta',
  type: 'group',
  label: 'SEO',
  fields: [
    {
      name: 'title',
      label: 'Título para busca e compartilhamento',
      admin: { description: 'Opcional. Sem preenchimento, usa o título do conteúdo.' },
      type: 'text',
      maxLength: 70,
    },
    {
      name: 'description',
      label: 'Descrição para busca e compartilhamento',
      admin: { description: 'Opcional. Resumo de até 170 caracteres.' },
      type: 'textarea',
      maxLength: 170,
    },
    imageField(
      'image',
      'Imagem de compartilhamento',
      'Imagem específica para Open Graph e redes sociais. Proporção recomendada: 1,91:1 (1200 × 630 px). Sem seleção, usa a imagem do conteúdo ou a imagem social padrão.',
    ),
  ],
}
