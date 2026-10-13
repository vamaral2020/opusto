import type { CollectionConfig } from 'payload'

import { admins } from '@/access'

export const ContactSubmissions: CollectionConfig = {
  slug: 'contact-submissions',
  labels: { plural: 'Mensagens de contato', singular: 'Mensagem de contato' },
  admin: { defaultColumns: ['name', 'email', 'subject', 'createdAt'], useAsTitle: 'subject' },
  access: { create: () => false, delete: admins, read: admins, update: admins },
  fields: [
    { name: 'name', type: 'text', label: 'Nome', required: true },
    { name: 'email', type: 'email', label: 'E-mail', required: true },
    { name: 'subject', type: 'text', label: 'Assunto', required: true },
    { name: 'message', type: 'textarea', label: 'Mensagem', required: true },
    { name: 'consentAt', type: 'date', label: 'Consentimento registrado em', required: true },
    {
      name: 'status',
      type: 'select',
      label: 'Status',
      defaultValue: 'new',
      options: [
        { label: 'Nova', value: 'new' },
        { label: 'Em atendimento', value: 'in-progress' },
        { label: 'Concluída', value: 'closed' },
      ],
      required: true,
    },
  ],
  timestamps: true,
}
