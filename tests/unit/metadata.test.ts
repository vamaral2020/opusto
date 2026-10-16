import { afterEach, describe, expect, it, vi } from 'vitest'

import { contentMetadata } from '@/lib/metadata'

afterEach(() => vi.unstubAllEnvs())

const image = (name: string) => ({ url: `/api/media/file/${name}.webp`, alt: name })

describe('contentMetadata', () => {
  it('uses page SEO image before content image and site default', () => {
    vi.stubEnv('SITE_URL', 'https://music.example')
    const metadata = contentMetadata({
      title: 'Notícia',
      description: 'Resumo',
      meta: { title: 'Título SEO', description: 'Descrição SEO', image: image('seo') },
      image: image('cover'),
      socialImage: image('default'),
    })
    expect(metadata).toMatchObject({
      title: 'Título SEO',
      description: 'Descrição SEO',
      openGraph: { images: [{ url: 'https://music.example/api/media/file/seo.webp', alt: 'seo' }] },
      twitter: {
        card: 'summary_large_image',
        images: [{ url: 'https://music.example/api/media/file/seo.webp', alt: 'seo' }],
      },
    })
  })

  it('falls back from missing or invalid relationships to content and default images', () => {
    vi.stubEnv('SITE_URL', 'https://music.example')
    expect(
      contentMetadata({
        title: 'Página',
        meta: { image: 42 },
        image: image('cover'),
        socialImage: image('default'),
      }),
    ).toMatchObject({
      openGraph: { images: [{ url: 'https://music.example/api/media/file/cover.webp' }] },
    })
    expect(
      contentMetadata({
        title: 'Página',
        image: { url: 'invalid' },
        socialImage: image('default'),
      }),
    ).toMatchObject({
      openGraph: { images: [{ url: 'https://music.example/api/media/file/default.webp' }] },
    })
    expect(contentMetadata({ title: 'Página' })).not.toHaveProperty('openGraph')
  })

  it('keeps query strings and uses absolute public URLs for social crawlers', () => {
    vi.stubEnv('SITE_URL', 'https://music.example')
    expect(
      contentMetadata({
        title: 'Página',
        image: { url: 'https://music.example/api/media/file/photo.webp?v=2' },
      }),
    ).toMatchObject({
      openGraph: {
        images: [{ url: 'https://music.example/api/media/file/photo.webp?v=2', alt: 'Página' }],
      },
    })
  })
})
