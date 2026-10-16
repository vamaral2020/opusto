import Image from 'next/image'

import { normalizeMediaURL } from '@/lib/media'

type MediaLike = {
  alt?: string | null
  height?: number | null
  url?: string | null
  width?: number | null
}

type Props = {
  className?: string
  fallbackAlt?: string
  fill?: boolean
  media?: MediaLike | number | null
  priority?: boolean
}

export function MediaImage({
  className,
  fallbackAlt = '',
  fill = true,
  media,
  priority = false,
}: Props) {
  const resolved = typeof media === 'object' && media ? media : null
  const src = normalizeMediaURL(resolved?.url) || '/placeholders/orchestra-hall.webp'
  const alt = resolved?.alt || fallbackAlt

  if (fill) {
    return (
      <Image alt={alt} className={className} fill priority={priority} sizes="100vw" src={src} />
    )
  }

  return (
    <Image
      alt={alt}
      className={className}
      height={resolved?.height || 720}
      priority={priority}
      src={src}
      width={resolved?.width || 1080}
    />
  )
}
