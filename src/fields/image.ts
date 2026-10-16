import type { UploadField } from 'payload'

/** Keeps existing media IDs while enabling Payload's visual upload selector. */
export const imageField = (
  name: string,
  label: string,
  description: string,
  required = false,
): UploadField => ({
  name,
  label,
  type: 'upload',
  relationTo: 'media',
  displayPreview: true,
  required,
  admin: {
    description: `${description} Selecione uma mídia existente ou carregue uma nova.${required ? '' : ' Remova a seleção para usar o fallback, quando disponível.'}`,
  },
})
