import { getImageProps } from 'next/image'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { MediaImage } from '@/components/MediaImage'
import { normalizeMediaURL } from '@/lib/media'

const siteURL = 'https://music.example:8443'
const path = '/api/media/file/images.-orc.jpeg'

afterEach(() => vi.unstubAllEnvs())

describe('normalizeMediaURL', () => {
  it('preserves relative paths, query strings and encoding', () => {
    const value = `${path}?v=2&name=a%20b#preview`
    expect(normalizeMediaURL(value, siteURL)).toBe(value)
    expect(normalizeMediaURL('/placeholders/orchestra-hall.webp', siteURL)).toBe(
      '/placeholders/orchestra-hall.webp',
    )
  })

  it('converts same-origin URLs to local paths while preserving query strings', () => {
    expect(normalizeMediaURL(`${siteURL}${path}?v=2&name=a%20b#preview`, siteURL)).toBe(
      `${path}?v=2&name=a%20b#preview`,
    )
  })

  it('reads the application origin from SITE_URL at call time', () => {
    vi.stubEnv('SITE_URL', siteURL)
    expect(normalizeMediaURL(`${siteURL}${path}`)).toBe(path)
    vi.stubEnv('SITE_URL', 'https://another.example')
    expect(normalizeMediaURL(`https://another.example${path}`)).toBe(path)
  })

  it('uses the existing localhost default when SITE_URL is absent', () => {
    vi.stubEnv('SITE_URL', undefined)
    expect(normalizeMediaURL(`http://localhost:3000${path}`)).toBe(path)
  })

  it.each([
    'https://external.example',
    'https://music.example',
    'http://music.example:8443',
    'https://music.example:9443',
    'https://music.example.evil.example:8443',
  ])('preserves external origins without implicitly allowing them: %s', (origin) => {
    const value = `${origin}${path}?v=2`
    expect(normalizeMediaURL(value, siteURL)).toBe(value)
  })

  it.each([
    undefined,
    null,
    '',
    'not a URL',
    'https://',
    '//external.example/image.jpeg',
    'javascript:alert(1)',
    'data:image/png;base64,abc',
    `${siteURL}//external.example/image.jpeg`,
  ])('returns null for missing, invalid or unsupported URLs: %s', (value) => {
    expect(normalizeMediaURL(value, siteURL)).toBeNull()
  })

  it('handles invalid SITE_URL without throwing and preserves relative paths', () => {
    expect(normalizeMediaURL(`${siteURL}${path}`, 'invalid')).toBeNull()
    expect(normalizeMediaURL(path, 'invalid')).toBe(path)
  })
})

describe('MediaImage', () => {
  it('passes a local CMS source to Next Image and preserves image properties', () => {
    vi.stubEnv('SITE_URL', siteURL)
    const image = MediaImage({
      className: 'cover',
      fill: false,
      media: { url: `${siteURL}${path}?v=2`, alt: 'Orquestra', height: 600, width: 900 },
      priority: true,
    })
    const optimized = new URL(getImageProps(image.props).props.src, siteURL)
    expect(optimized.pathname).toBe('/_next/image')
    expect(optimized.searchParams.get('url')).toBe(`${path}?v=2`)
    expect(image.props).toMatchObject({
      src: `${path}?v=2`,
      alt: 'Orquestra',
      className: 'cover',
      height: 600,
      width: 900,
      priority: true,
    })
  })

  it('preserves fill, sizes, fallback text and the placeholder for missing or invalid media', () => {
    for (const media of [null, 42, { url: 'invalid' }]) {
      expect(MediaImage({ media, fallbackAlt: 'Sala de concertos' }).props).toMatchObject({
        src: '/placeholders/orchestra-hall.webp',
        alt: 'Sala de concertos',
        fill: true,
        sizes: '100vw',
        priority: false,
      })
    }
    expect(MediaImage({ media: null, fill: false }).props).toMatchObject({
      width: 1080,
      height: 720,
    })
  })
})
