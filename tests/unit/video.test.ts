import { describe, expect, it } from 'vitest'

import { externalVideoEmbed } from '@/lib/video'

describe('externalVideoEmbed', () => {
  it('uses YouTube privacy-enhanced embeds', () => {
    expect(externalVideoEmbed('https://www.youtube.com/watch?v=abc123')).toBe(
      'https://www.youtube-nocookie.com/embed/abc123',
    )
    expect(externalVideoEmbed('https://youtu.be/abc123')).toBe(
      'https://www.youtube-nocookie.com/embed/abc123',
    )
  })

  it('accepts Vimeo and rejects unapproved providers', () => {
    expect(externalVideoEmbed('https://vimeo.com/123456')).toBe(
      'https://player.vimeo.com/video/123456',
    )
    expect(externalVideoEmbed('https://example.com/video/123456')).toBeNull()
    expect(externalVideoEmbed('not a URL')).toBeNull()
  })
})
