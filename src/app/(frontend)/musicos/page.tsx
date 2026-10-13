import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'

import { EmptyState } from '@/components/EmptyState'
import { MediaImage } from '@/components/MediaImage'
import { PageIntro } from '@/components/PageIntro'
import { getCMS } from '@/lib/payload'

export const metadata: Metadata = { title: 'Músicos' }

export default async function MusiciansPage() {
  await connection()
  const musicians = await (
    await getCMS()
  ).find({ collection: 'musicians', depth: 1, limit: 100, overrideAccess: false, sort: 'order' })
  return (
    <>
      <PageIntro
        eyebrow="A formação"
        lead="Conheça os músicos apresentados pela Opus TO."
        title="Músicos"
      />
      <section className="band">
        <div className="shell">
          {musicians.docs.length ? (
            <div className="people-grid">
              {musicians.docs.map((musician) => (
                <Link className="person" href={`/musicos/${musician.slug}`} key={musician.id}>
                  <div className="person-image">
                    <MediaImage fallbackAlt="" media={musician.portrait} />
                  </div>
                  <h3>{musician.name}</h3>
                  <p>{musician.instrument}</p>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState message="Os perfis dos músicos serão publicados aqui." />
          )}
        </div>
      </section>
    </>
  )
}
