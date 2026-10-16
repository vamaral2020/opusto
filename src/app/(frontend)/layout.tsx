import type { Metadata } from 'next'
import { connection } from 'next/server'
import type { ReactNode } from 'react'

import { Brand } from '@/components/Brand'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { absoluteURL } from '@/lib/format'
import { contentMetadata } from '@/lib/metadata'
import { getSiteSettings } from '@/lib/site-settings'

import './styles.css'

export async function generateMetadata(): Promise<Metadata> {
  await connection()
  const settings = await getSiteSettings()
  const defaults = contentMetadata({
    title: settings.shortName || 'Opus TO',
    description:
      settings.description ||
      'Grupo Musical Opus Tocantins, iniciativa dedicada à música de concerto no Tocantins.',
    socialImage: settings.socialImage,
  })
  return {
    ...defaults,
    metadataBase: new URL(absoluteURL()),
    title: {
      default: settings.shortName || 'Opus TO',
      template: `%s | ${settings.shortName || 'Opus TO'}`,
    },
    openGraph: {
      ...defaults.openGraph,
      locale: 'pt_BR',
      siteName: settings.shortName || 'Opus TO',
      type: 'website',
    },
  }
}

export default async function FrontendLayout({ children }: { children: ReactNode }) {
  await connection()
  const settings = await getSiteSettings()
  return (
    <html lang="pt-BR">
      <body>
        <a className="skip-link" href="#conteudo">
          Pular para o conteúdo
        </a>
        <Header brand={<Brand logo={settings.logo} />} />
        <main id="conteudo">{children}</main>
        <Footer logo={settings.logo} />
      </body>
    </html>
  )
}
