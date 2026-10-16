import type { CollectionConfig } from 'payload'

import { authenticated, publishedOrAuthenticated } from '@/access'
import { imageField } from '@/fields/image'

export const Sponsors: CollectionConfig = {
  slug: 'sponsors',
  labels: { plural: 'Patrocinadores', singular: 'Patrocinador' },
  admin: { defaultColumns: ['name', 'tier', 'order', '_status'], useAsTitle: 'name' },
  access: {
    create: authenticated,
    delete: authenticated,
    read: publishedOrAuthenticated,
    readVersions: authenticated,
    update: authenticated,
  },
  fields: [
    { name: 'name', type: 'text', label: 'Nome', required: true },
    imageField(
      'logo',
      'Logomarca',
      'Use PNG ou WebP com fundo transparente e largura de 600 px; a proporção original será preservada.',
      true,
    ),
    { name: 'website', type: 'text', label: 'Site' },
    {
      name: 'tier',
      type: 'select',
      label: 'Categoria',
      defaultValue: 'supporter',
      options: [
        { label: 'Patrocinador', value: 'sponsor' },
        { label: 'Apoiador', value: 'supporter' },
        { label: 'Parceiro institucional', value: 'partner' },
      ],
      required: true,
    },
    { name: 'order', type: 'number', label: 'Ordem', defaultValue: 100, min: 0 },
  ],
  versions: { drafts: true, maxPerDoc: 20 },
}
