import Link from 'next/link'

export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="Opus TO, página inicial">
      <span className="brand-mark" aria-hidden="true">
        O
      </span>
      <span>
        <strong>Opus TO</strong>
        <small>Grupo Musical</small>
      </span>
    </Link>
  )
}
