import { describe, expect, it } from 'vitest'

import { isAdminUser, publishedOrAuthenticated } from '@/access'

describe('content access', () => {
  it('recognizes only the administrator role as admin', () => {
    expect(isAdminUser({ role: 'admin' })).toBe(true)
    expect(isAdminUser({ role: 'editor' })).toBe(false)
    expect(isAdminUser(null)).toBe(false)
  })

  it('limits anonymous reads to published documents', () => {
    const anonymous = publishedOrAuthenticated({ req: { user: null } } as Parameters<
      typeof publishedOrAuthenticated
    >[0])

    expect(anonymous).toEqual({ _status: { equals: 'published' } })
  })

  it('allows authenticated users to read drafts', () => {
    const authenticated = publishedOrAuthenticated({ req: { user: { id: 1 } } } as Parameters<
      typeof publishedOrAuthenticated
    >[0])

    expect(authenticated).toBe(true)
  })
})
