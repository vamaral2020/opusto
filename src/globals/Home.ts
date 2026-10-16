import type { GlobalConfig } from 'payload'

import { authenticated } from '@/access'
import { imageField } from '@/fields/image'
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
    imageField(
      'heroImage',
      'Imagem principal',
      'Banner da página inicial. Proporção recomendada: 16:9, largura de 1920 px.',
    ),
    {
      name: 'aboutTitle',
      type: 'text',
      label: 'Título da seção institucional',
      defaultValue: 'Uma orquestra em construção',
    },
    { name: 'aboutText', type: 'textarea', label: 'Resumo institucional', maxLength: 600 },
    imageField(
      'aboutImage',
      'Imagem institucional',
      'Seção institucional da página inicial. Proporção recomendada: 3:2, largura de 1080 px.',
    ),
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
