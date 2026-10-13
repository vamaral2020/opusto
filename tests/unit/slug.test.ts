import { describe, expect, it } from 'vitest'

import { formatSlug } from '@/fields/slug'

describe('formatSlug', () => {
  it('normalizes accents, spaces, and punctuation', () => {
    expect(formatSlug('  Orquestra Filarmônica do Tocantins!  ')).toBe(
      'orquestra-filarmonica-do-tocantins',
    )
  })

  it('does not leave separators at the edges', () => {
    expect(formatSlug('---Opus TO---')).toBe('opus-to')
  })
})
