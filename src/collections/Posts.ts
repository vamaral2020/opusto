import type { CollectionConfig } from 'payload'

import { authenticated, publishedOrAuthenticated } from '@/access'
import { seoFields } from '@/fields/seo'
import { slugField } from '@/fields/slug'

export const Posts: CollectionConfig = {
  slug: 'posts',
  labels: { plural: 'Notícias', singular: 'Notícia' },
  admin: { defaultColumns: ['title', 'publishedAt', '_status'], useAsTitle: 'title' },
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
    { name: 'excerpt', type: 'textarea', label: 'Resumo', maxLength: 320, required: true },
    {
      name: 'publishedAt',
      type: 'date',
      label: 'Data de publicação',
      admin: { position: 'sidebar' },
    },
    { name: 'cover', type: 'relationship', label: 'Imagem', relationTo: 'media' },
    { name: 'content', type: 'richText', label: 'Conteúdo', required: true },
    seoFields,
  ],
  versions: { drafts: true, maxPerDoc: 30 },
}
