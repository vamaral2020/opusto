import type { CollectionConfig } from 'payload'

import { authenticated, publishedOrAuthenticated } from '@/access'
import { imageField } from '@/fields/image'
import { seoFields } from '@/fields/seo'
import { slugField } from '@/fields/slug'

export const Musicians: CollectionConfig = {
  slug: 'musicians',
  labels: { plural: 'Músicos', singular: 'Músico' },
  admin: { defaultColumns: ['name', 'instrument', 'order', '_status'], useAsTitle: 'name' },
  access: {
    create: authenticated,
    delete: authenticated,
    read: publishedOrAuthenticated,
    readVersions: authenticated,
    update: authenticated,
  },
  fields: [
    { name: 'name', type: 'text', label: 'Nome', required: true },
    slugField(),
    { name: 'instrument', type: 'text', label: 'Instrumento ou função', required: true },
    imageField(
      'portrait',
      'Fotografia do músico',
      'Retrato para a listagem e o perfil. Proporção recomendada: 4:5, largura de 800 px.',
    ),
    { name: 'biography', type: 'richText', label: 'Biografia' },
    { name: 'order', type: 'number', label: 'Ordem', defaultValue: 100, min: 0 },
    seoFields,
  ],
  versions: { drafts: true, maxPerDoc: 20 },
}
