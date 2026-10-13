import type { Field } from 'payload'

export const seoFields: Field = {
  name: 'meta',
  type: 'group',
  label: 'SEO',
  fields: [
    {
      name: 'title',
      type: 'text',
      maxLength: 70,
    },
    {
      name: 'description',
      type: 'textarea',
      maxLength: 170,
    },
    {
      name: 'image',
      type: 'relationship',
      relationTo: 'media',
    },
  ],
}
