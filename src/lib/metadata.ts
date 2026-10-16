import type { Metadata } from 'next'

import type { MediaLike } from '@/components/MediaImage'

import { absoluteURL } from './format'
import { normalizeMediaURL } from './media'

type Image = MediaLike | number | null | undefined

type Options = {
  title: string
  description?: string | null
  meta?: { title?: string | null; description?: string | null; image?: Image } | null
  image?: Image
  socialImage?: Image
}

/** Shared by every content page; all image choices come from populated CMS fields. */
export function contentMetadata({
  title,
  description,
  meta,
  image,
  socialImage,
}: Options): Metadata {
  const chosen = [meta?.image, image, socialImage].find(
    (value) => typeof value === 'object' && value && normalizeMediaURL(value.url),
  )
  const src = typeof chosen === 'object' && chosen ? normalizeMediaURL(chosen.url) : null
  const images = src
    ? [{ url: absoluteURL(src), alt: (typeof chosen === 'object' && chosen?.alt) || title }]
    : undefined

  return {
    title: meta?.title || title,
    description: meta?.description || description || undefined,
    ...(images
      ? {
          openGraph: {
            title: meta?.title || title,
            description: meta?.description || description || undefined,
            locale: 'pt_BR',
            type: 'website',
            images,
          },
          twitter: { card: 'summary_large_image', images },
        }
      : {}),
  }
}
