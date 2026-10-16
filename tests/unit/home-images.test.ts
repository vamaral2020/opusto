import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

const cms = vi.hoisted(() => ({ findGlobal: vi.fn(), find: vi.fn() }))
vi.mock('@/lib/payload', () => ({ getCMS: async () => cms }))
vi.mock('next/server', () => ({ connection: async () => undefined }))

import HomePage from '@/app/(frontend)/page'
import { Brand } from '@/components/Brand'
import { RichContent } from '@/components/RichContent'

afterEach(() => vi.unstubAllEnvs())

const media = (name: string) => ({
  url: `https://music.example/api/media/file/${name}.webp`,
  alt: name,
  width: 120,
  height: 80,
})

describe('public CMS images', () => {
  it('renders home images independently and reads replacements on the next request', async () => {
    vi.stubEnv('SITE_URL', 'https://music.example')
    cms.find.mockResolvedValue({ docs: [] })
    cms.findGlobal.mockResolvedValue({
      title: 'Opus',
      heroImage: media('hero'),
      aboutImage: media('institutional'),
    })
    const first = renderToStaticMarkup(await HomePage())
    expect(first).toContain('alt="hero"')
    expect(first).toContain('alt="institutional"')
    expect(first).toContain('url=%2Fapi%2Fmedia%2Ffile%2Finstitutional.webp')
    cms.findGlobal.mockResolvedValue({
      title: 'Opus',
      heroImage: media('hero'),
      aboutImage: media('replacement'),
    })
    const second = renderToStaticMarkup(await HomePage())
    expect(second).toContain('alt="hero"')
    expect(second).toContain('alt="replacement"')
    expect(second).not.toContain('institutional.webp')
    cms.findGlobal.mockResolvedValue({ title: 'Opus', heroImage: media('hero'), aboutImage: null })
    const removed = renderToStaticMarkup(await HomePage())
    expect(removed).toContain('orchestra-hall.webp')
    expect(removed).toContain('alt="hero"')
  })

  it('keeps the existing vector identity until a CMS logo is configured', () => {
    vi.stubEnv('SITE_URL', 'https://music.example')
    expect(renderToStaticMarkup(Brand({}))).toContain('<svg')
    const uploaded = renderToStaticMarkup(Brand({ logo: media('logo') }))
    expect(uploaded).toContain('alt="logo"')
    expect(uploaded).toContain('class="brand-logo"')
    expect(uploaded).not.toContain('<svg')
  })

  it('normalizes rich text uploads and preserves alt overrides, captions and credits', () => {
    vi.stubEnv('SITE_URL', 'https://music.example')
    const upload = {
      type: 'upload',
      relationTo: 'media',
      version: 3,
      fields: { alt: 'Texto alternativo local' },
      value: { ...media('article'), caption: 'Legenda da imagem', credit: 'Crédito da imagem' },
    }
    const html = renderToStaticMarkup(
      RichContent({
        data: {
          root: {
            type: 'root',
            direction: 'ltr',
            format: '',
            indent: 0,
            version: 1,
            children: [upload],
          },
        },
      }),
    )
    expect(html).toContain('url=%2Fapi%2Fmedia%2Ffile%2Farticle.webp')
    expect(html).toContain('alt="Texto alternativo local"')
    expect(html).toContain('<figcaption>Legenda da imagem</figcaption>')
    expect(html).toContain('Crédito da imagem')
  })
})
