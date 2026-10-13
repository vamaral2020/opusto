import type { Access, FieldAccess } from 'payload'

type UserWithRole = { role?: 'admin' | 'editor' } | null

export const isAdminUser = (user: UserWithRole): boolean => user?.role === 'admin'

export const authenticated: Access = ({ req: { user } }) => Boolean(user)

export const admins: Access = ({ req: { user } }) => isAdminUser(user as UserWithRole)

export const adminsField: FieldAccess = ({ req: { user } }) => isAdminUser(user as UserWithRole)

export const publishedOrAuthenticated: Access = ({ req: { user } }) => {
  if (user) return true

  return {
    _status: {
      equals: 'published',
    },
  }
}
