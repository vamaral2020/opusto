import Link from 'next/link'

import { normalizeMediaURL } from '@/lib/media'

import { MediaImage, type MediaLike } from './MediaImage'
import { BrandMark } from './BrandMark'

export function Brand({ logo }: { logo?: MediaLike | number | null }) {
  return (
    <Link className="brand" href="/" aria-label="Opus TO, página inicial">
      {typeof logo === 'object' && logo && normalizeMediaURL(logo.url) ? (
        <MediaImage className="brand-logo" fill={false} media={logo} sizes="32px" />
      ) : (
        <BrandMark />
      )}
      <span>
        <strong>Opus TO</strong>
        <small>Núcleo Musical · Tocantins</small>
      </span>
    </Link>
  )
}
