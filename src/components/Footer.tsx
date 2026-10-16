import Link from 'next/link'

import type { MediaLike } from './MediaImage'
import { Brand } from './Brand'

export function Footer({ logo }: { logo?: MediaLike | number | null }) {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div>
          <Brand logo={logo} />
          <p className="footer-note">Música de concerto no Tocantins.</p>
        </div>
        <nav aria-label="Links do rodapé">
          <Link href="/agenda">Agenda</Link>
          <Link href="/noticias">Notícias</Link>
          <Link href="/contato">Contato</Link>
          <Link href="/privacidade">Privacidade</Link>
        </nav>
        <p className="footer-legal">© {new Date().getFullYear()} Grupo Musical Opus Tocantins.</p>
      </div>
    </footer>
  )
}
