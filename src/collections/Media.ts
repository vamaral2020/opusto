import path from 'node:path'
import type { CollectionConfig } from 'payload'

import { authenticated } from '@/access'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { plural: 'Mídias', singular: 'Mídia' },
  admin: { useAsTitle: 'alt' },
  access: {
    create: authenticated,
    delete: authenticated,
    read: () => true,
    update: authenticated,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      label: 'Texto alternativo',
      required: true,
      admin: {
        description: 'Descreva o conteúdo da imagem para pessoas que usam leitores de tela.',
      },
    },
    {
      name: 'caption',
      type: 'textarea',
      label: 'Legenda',
      admin: {
        description:
          'Texto de apoio da imagem; exibido em uploads de textos ricos. Galerias também podem definir uma legenda por item.',
      },
    },
    {
      name: 'credit',
      type: 'text',
      label: 'Crédito ou licença',
      admin: {
        description:
          'Autoria ou licença de uso da imagem; preservada para consulta e exibida nos textos ricos.',
      },
    },
  ],
  upload: {
    adminThumbnail: 'thumbnail',
    staticDir: process.env.MEDIA_DIR || path.join(process.cwd(), 'media'),
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'],
    imageSizes: [
      { name: 'thumbnail', width: 480, height: 320, position: 'centre' },
      { name: 'card', width: 960, height: 640, position: 'centre' },
      { name: 'hero', width: 1920, height: 1080, position: 'centre' },
    ],
  },
}
