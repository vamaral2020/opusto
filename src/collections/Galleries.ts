import type { CollectionConfig } from 'payload'

import { authenticated, publishedOrAuthenticated } from '@/access'
import { imageField } from '@/fields/image'
import { seoFields } from '@/fields/seo'
import { slugField } from '@/fields/slug'

export const Galleries: CollectionConfig = {
  slug: 'galleries',
  labels: { plural: 'Galerias', singular: 'Galeria' },
  admin: { defaultColumns: ['title', 'eventDate', '_status'], useAsTitle: 'title' },
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
    { name: 'description', type: 'textarea', label: 'Descrição', maxLength: 500 },
    { name: 'eventDate', type: 'date', label: 'Data' },
    {
      name: 'images',
      type: 'array',
      label: 'Imagens',
      fields: [
        imageField(
          'image',
          'Imagem da galeria',
          'Fotografia da galeria. Proporção recomendada: 3:2, largura de 1200 px.',
          true,
        ),
        { name: 'caption', type: 'text', label: 'Legenda' },
      ],
    },
    {
      name: 'externalVideos',
      type: 'array',
      label: 'Vídeos externos',
      fields: [
        {
          name: 'url',
          type: 'text',
          label: 'URL do YouTube ou Vimeo',
          required: true,
          validate: (value: null | string | undefined) => {
            if (!value) return 'Informe uma URL.'
            try {
              const hostname = new URL(value).hostname.replace(/^www\./, '')
              return ['youtube.com', 'youtu.be', 'vimeo.com'].includes(hostname)
                ? true
                : 'Use uma URL do YouTube ou Vimeo.'
            } catch {
              return 'Informe uma URL válida.'
            }
          },
        },
        { name: 'title', type: 'text', label: 'Título', required: true },
      ],
    },
    seoFields,
  ],
  versions: { drafts: true, maxPerDoc: 20 },
}
