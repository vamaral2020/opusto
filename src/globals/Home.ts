import type { GlobalConfig } from 'payload'

import { authenticated } from '@/access'
import { seoFields } from '@/fields/seo'

export const Home: GlobalConfig = {
  slug: 'home',
  label: 'Página inicial',
  access: { read: () => true, update: authenticated },
  fields: [
    {
      name: 'eyebrow',
      type: 'text',
      label: 'Chamada curta',
      defaultValue: 'Música de concerto no Tocantins',
    },
    {
      name: 'title',
      type: 'text',
      label: 'Título',
      defaultValue: 'Grupo Musical Opus Tocantins',
      required: true,
    },
    {
      name: 'introduction',
      type: 'textarea',
      label: 'Apresentação',
      defaultValue:
        'Uma iniciativa cultural dedicada à música de concerto e à formação de uma orquestra filarmônica no Tocantins.',
      required: true,
    },
    { name: 'heroImage', type: 'relationship', label: 'Imagem principal', relationTo: 'media' },
    {
      name: 'aboutTitle',
      type: 'text',
      label: 'Título da seção institucional',
      defaultValue: 'Uma orquestra em construção',
    },
    { name: 'aboutText', type: 'textarea', label: 'Resumo institucional', maxLength: 600 },
    {
      name: 'featuredEvents',
      type: 'relationship',
      hasMany: true,
      label: 'Concertos em destaque',
      maxRows: 3,
      relationTo: 'events',
    },
    {
      name: 'featuredPosts',
      type: 'relationship',
      hasMany: true,
      label: 'Notícias em destaque',
      maxRows: 3,
      relationTo: 'posts',
    },
    seoFields,
  ],
  versions: { drafts: true, max: 20 },
}
