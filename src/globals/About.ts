import type { GlobalConfig } from 'payload'

import { authenticated } from '@/access'
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
    { name: 'image', type: 'relationship', label: 'Imagem', relationTo: 'media' },
    { name: 'content', type: 'richText', label: 'Conteúdo institucional' },
    seoFields,
  ],
  versions: { drafts: true, max: 20 },
}
