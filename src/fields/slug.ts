import type { Field, FieldHook } from 'payload'

export const formatSlug = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const formatSlugHook: FieldHook = ({ data, operation, value }) => {
  if (typeof value === 'string' && value.length > 0) return formatSlug(value)
  if (operation === 'create' && typeof data?.title === 'string') return formatSlug(data.title)
  if (operation === 'create' && typeof data?.name === 'string') return formatSlug(data.name)
  return value
}

export const slugField = (): Field => ({
  name: 'slug',
  type: 'text',
  admin: { position: 'sidebar' },
  hooks: { beforeValidate: [formatSlugHook] },
  index: true,
  required: true,
  unique: true,
})
