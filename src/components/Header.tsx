'use client'

import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, type ReactNode } from 'react'

const links = [
  { href: '/sobre', label: 'Sobre' },
  { href: '/agenda', label: 'Agenda' },
  { href: '/noticias', label: 'Notícias' },
  { href: '/musicos', label: 'Músicos' },
  { href: '/galeria', label: 'Galeria' },
  { href: '/patrocinadores', label: 'Patrocinadores' },
]

export function Header({ brand }: { brand: ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <header className="site-header">
      <div className="shell header-inner">
        {brand}
        <button
          aria-expanded={open}
          aria-controls="navegacao-principal"
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          className="icon-button menu-button"
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
        <nav
          aria-label="Navegação principal"
          className={open ? 'main-nav is-open' : 'main-nav'}
          id="navegacao-principal"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setOpen(false)
              document.querySelector<HTMLButtonElement>('.menu-button')?.focus()
            }
          }}
        >
          {links.map((link) => (
            <Link
              aria-current={pathname.startsWith(link.href) ? 'page' : undefined}
              href={link.href}
              key={link.href}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link className="button button-small" href="/contato" onClick={() => setOpen(false)}>
            Contato
          </Link>
        </nav>
      </div>
    </header>
  )
}
