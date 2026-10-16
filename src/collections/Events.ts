import type { CollectionConfig } from 'payload'

import { authenticated, publishedOrAuthenticated } from '@/access'
import { imageField } from '@/fields/image'
import { seoFields } from '@/fields/seo'
import { slugField } from '@/fields/slug'

export const Events: CollectionConfig = {
  slug: 'events',
  labels: { plural: 'Concertos', singular: 'Concerto' },
  admin: { defaultColumns: ['title', 'startsAt', 'venue', '_status'], useAsTitle: 'title' },
  access: {
    create: authenticated,
    delete: authenticated,
    read: publishedOrAuthenticated,
    readVersions: authenticated,
    update: authenticated,
  },
  fields: [
    { name: 'title', type: 'text', label: 'Título', required: true },
    slugField(),
    { name: 'summary', type: 'textarea', label: 'Resumo', maxLength: 320, required: true },
    { name: 'startsAt', type: 'date', label: 'Início', required: true },
    { name: 'endsAt', type: 'date', label: 'Término' },
    { name: 'venue', type: 'text', label: 'Local', required: true },
    { name: 'city', type: 'text', label: 'Cidade', defaultValue: 'Palmas - TO' },
    { name: 'ticketURL', type: 'text', label: 'Link de ingressos' },
    imageField(
      'cover',
      'Imagem do concerto',
      'Usada na agenda e no destaque do concerto. Proporção recomendada: 3:2, largura mínima de 1200 px.',
    ),
    { name: 'content', type: 'richText', label: 'Descrição' },
    seoFields,
  ],
  versions: { drafts: true, maxPerDoc: 20 },
}
