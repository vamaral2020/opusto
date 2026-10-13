import type { GlobalConfig } from 'payload'

import { authenticated } from '@/access'
import { seoFields } from '@/fields/seo'

export const Privacy: GlobalConfig = {
  slug: 'privacy',
  label: 'Privacidade',
  access: { read: () => true, update: authenticated },
  fields: [
    { name: 'title', type: 'text', label: 'Título', defaultValue: 'Privacidade', required: true },
    {
      name: 'summary',
      type: 'textarea',
      label: 'Resumo',
      defaultValue:
        'Os dados enviados pelo formulário são usados somente para responder ao contato e ficam disponíveis à equipe administrativa autorizada.',
      required: true,
    },
    { name: 'content', type: 'richText', label: 'Política completa' },
    seoFields,
  ],
  versions: { drafts: true, max: 20 },
}
