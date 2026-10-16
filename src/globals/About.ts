import type { GlobalConfig } from 'payload'

import { authenticated } from '@/access'
import { imageField } from '@/fields/image'
import { seoFields } from '@/fields/seo'

export const About: GlobalConfig = {
  slug: 'about',
  label: 'Sobre a Opus TO',
  access: { read: () => true, update: authenticated },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Título',
      defaultValue: 'Sobre a Opus TO',
      required: true,
    },
    { name: 'lead', type: 'textarea', label: 'Introdução', maxLength: 500 },
    imageField(
      'image',
      'Imagem institucional',
      'Imagem da página Sobre. Proporção recomendada: 3:2, largura de 1080 px.',
    ),
    { name: 'content', type: 'richText', label: 'Conteúdo institucional' },
    seoFields,
  ],
  versions: { drafts: true, max: 20 },
}
