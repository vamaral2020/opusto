import Link from 'next/link'

import { BrandMark } from './BrandMark'

export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="Opus TO, página inicial">
      <BrandMark />
      <span>
        <strong>Opus TO</strong>
        <small>Núcleo Musical · Tocantins</small>
      </span>
    </Link>
  )
}
