import type { GlobalConfig } from 'payload'

import { authenticated } from '@/access'
import { imageField } from '@/fields/image'

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
    imageField(
      'logo',
      'Logotipo do site',
      'Símbolo exibido junto ao nome no cabeçalho e rodapé. Recomenda-se PNG ou WebP transparente, proporção 3:5 e altura de 180 px. Sem seleção, será usado o símbolo atual.',
    ),
    imageField(
      'socialImage',
      'Imagem social padrão',
      'Compartilhamento de páginas sem imagem específica. Proporção recomendada: 1,91:1 (1200 × 630 px).',
    ),
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
