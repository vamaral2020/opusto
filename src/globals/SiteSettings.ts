import type { GlobalConfig } from 'payload'

import { authenticated } from '@/access'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Configurações do site',
  access: { read: () => true, update: authenticated },
  fields: [
    {
      name: 'organizationName',
      type: 'text',
      label: 'Nome da organização',
      defaultValue: 'Grupo Musical Opus Tocantins',
      required: true,
    },
    {
      name: 'shortName',
      type: 'text',
      label: 'Nome curto',
      defaultValue: 'Opus TO',
      required: true,
    },
    { name: 'description', type: 'textarea', label: 'Descrição padrão para SEO', maxLength: 170 },
    {
      name: 'socialImage',
      type: 'relationship',
      label: 'Imagem social padrão',
      relationTo: 'media',
    },
    {
      name: 'socialLinks',
      type: 'array',
      label: 'Redes sociais',
      fields: [
        { name: 'label', type: 'text', label: 'Nome', required: true },
        { name: 'url', type: 'text', label: 'URL', required: true },
      ],
    },
    { name: 'footerText', type: 'text', label: 'Texto do rodapé' },
  ],
}
