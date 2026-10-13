import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { absoluteURL } from '@/lib/format'

import './styles.css'

export const metadata: Metadata = {
  metadataBase: new URL(absoluteURL()),
  title: { default: 'Opus TO', template: '%s | Opus TO' },
  description:
    'Grupo Musical Opus Tocantins, iniciativa dedicada à música de concerto no Tocantins.',
  openGraph: { locale: 'pt_BR', siteName: 'Opus TO', type: 'website' },
}

export default function FrontendLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <a className="skip-link" href="#conteudo">
          Pular para o conteúdo
        </a>
        <Header />
        <main id="conteudo">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
