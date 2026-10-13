import Link from 'next/link'

import { Brand } from './Brand'

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div>
          <Brand />
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
