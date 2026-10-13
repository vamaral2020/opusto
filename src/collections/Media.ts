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
    { name: 'alt', type: 'text', label: 'Texto alternativo', required: true },
    { name: 'caption', type: 'textarea', label: 'Legenda' },
    { name: 'credit', type: 'text', label: 'Crédito ou licença' },
  ],
  upload: {
    staticDir: process.env.MEDIA_DIR || path.join(process.cwd(), 'media'),
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'],
    imageSizes: [
      { name: 'thumbnail', width: 480, height: 320, position: 'centre' },
      { name: 'card', width: 960, height: 640, position: 'centre' },
      { name: 'hero', width: 1920, height: 1080, position: 'centre' },
    ],
  },
}
