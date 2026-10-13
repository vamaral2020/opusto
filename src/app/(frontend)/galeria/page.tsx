import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'

import { EmptyState } from '@/components/EmptyState'
import { MediaImage } from '@/components/MediaImage'
import { PageIntro } from '@/components/PageIntro'
import { formatDate } from '@/lib/format'
import { getCMS } from '@/lib/payload'

export const metadata: Metadata = { title: 'Galeria' }

export default async function GalleryPage() {
  await connection()
  const galleries = await (
    await getCMS()
  ).find({
    collection: 'galleries',
    depth: 1,
    limit: 30,
    overrideAccess: false,
    sort: '-eventDate',
  })
  return (
    <>
      <PageIntro
        eyebrow="Registros"
        lead="Imagens e vídeos externos de apresentações e atividades."
        title="Galeria"
      />
      <section className="band">
        <div className="shell">
          {galleries.docs.length ? (
            <div className="card-grid">
              {galleries.docs.map((gallery) => (
                <Link className="gallery-card" href={`/galeria/${gallery.slug}`} key={gallery.id}>
                  <div className="gallery-image">
                    <MediaImage fallbackAlt="" media={gallery.images?.[0]?.image} />
                  </div>
                  <p className="card-meta">
                    {gallery.eventDate ? formatDate(gallery.eventDate) : 'Galeria'}
                  </p>
                  <h3>{gallery.title}</h3>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState message="Os registros da Opus TO serão publicados aqui." />
          )}
        </div>
      </section>
    </>
  )
}
