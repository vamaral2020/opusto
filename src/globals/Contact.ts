import type { GlobalConfig } from 'payload'

import { authenticated } from '@/access'
import { seoFields } from '@/fields/seo'

export const Contact: GlobalConfig = {
  slug: 'contact',
  label: 'Página de contato',
  access: { read: () => true, update: authenticated },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Título',
      defaultValue: 'Entre em contato',
      required: true,
    },
    {
      name: 'introduction',
      type: 'textarea',
      label: 'Introdução',
      defaultValue: 'Use este canal para falar com a equipe da Opus TO.',
      required: true,
    },
    { name: 'email', type: 'email', label: 'E-mail público' },
    { name: 'phone', type: 'text', label: 'Telefone público' },
    seoFields,
  ],
  versions: { drafts: true, max: 20 },
}
