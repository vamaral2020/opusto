import type { CollectionConfig } from 'payload'

import { admins, adminsField } from '@/access'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { plural: 'Usuários', singular: 'Usuário' },
  admin: { useAsTitle: 'email' },
  auth: {
    lockTime: 15 * 60 * 1000,
    maxLoginAttempts: 5,
    tokenExpiration: 8 * 60 * 60,
  },
  access: {
    admin: ({ req: { user } }) => Boolean(user),
    create: admins,
    delete: admins,
    read: admins,
    unlock: admins,
    update: admins,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Nome',
      required: true,
    },
    {
      name: 'role',
      type: 'select',
      label: 'Perfil',
      access: { create: adminsField, update: adminsField },
      defaultValue: 'admin',
      options: [
        { label: 'Administrador', value: 'admin' },
        { label: 'Editor', value: 'editor' },
      ],
      required: true,
      saveToJWT: true,
    },
  ],
  timestamps: true,
}
