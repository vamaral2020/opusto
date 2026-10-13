import type { MetadataRoute } from 'next'

import { absoluteURL } from '@/lib/format'
import { getCMS } from '@/lib/payload'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const payload = await getCMS()
  const [events, posts, musicians, galleries] = await Promise.all([
    payload.find({
      collection: 'events',
      limit: 1000,
      overrideAccess: false,
      pagination: false,
      select: { slug: true, updatedAt: true },
    }),
    payload.find({
      collection: 'posts',
      limit: 1000,
      overrideAccess: false,
      pagination: false,
      select: { slug: true, updatedAt: true },
    }),
    payload.find({
      collection: 'musicians',
      limit: 1000,
      overrideAccess: false,
      pagination: false,
      select: { slug: true, updatedAt: true },
    }),
    payload.find({
      collection: 'galleries',
      limit: 1000,
      overrideAccess: false,
      pagination: false,
      select: { slug: true, updatedAt: true },
    }),
  ])
  const staticRoutes = [
    '',
    '/sobre',
    '/agenda',
    '/noticias',
    '/musicos',
    '/galeria',
    '/patrocinadores',
    '/contato',
    '/privacidade',
  ]
  return [
    ...staticRoutes.map((route) => ({ url: absoluteURL(route || '/') })),
    ...events.docs.map((item) => ({
      lastModified: item.updatedAt,
      url: absoluteURL(`/agenda/${item.slug}`),
    })),
    ...posts.docs.map((item) => ({
      lastModified: item.updatedAt,
      url: absoluteURL(`/noticias/${item.slug}`),
    })),
    ...musicians.docs.map((item) => ({
      lastModified: item.updatedAt,
      url: absoluteURL(`/musicos/${item.slug}`),
    })),
    ...galleries.docs.map((item) => ({
      lastModified: item.updatedAt,
      url: absoluteURL(`/galeria/${item.slug}`),
    })),
  ]
}
