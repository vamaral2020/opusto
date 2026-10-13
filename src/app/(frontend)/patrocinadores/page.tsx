import type { Metadata } from 'next'
import { connection } from 'next/server'

import { EmptyState } from '@/components/EmptyState'
import { MediaImage } from '@/components/MediaImage'
import { PageIntro } from '@/components/PageIntro'
import { getCMS } from '@/lib/payload'

export const metadata: Metadata = { title: 'Patrocinadores' }

export default async function SponsorsPage() {
  await connection()
  const sponsors = await (
    await getCMS()
  ).find({ collection: 'sponsors', depth: 1, limit: 100, overrideAccess: false, sort: 'order' })
  return (
    <>
      <PageIntro
        eyebrow="Apoio"
        lead="Instituições que tornam possível o desenvolvimento das atividades da Opus TO."
        title="Patrocinadores"
      />
      <section className="band">
        <div className="shell">
          {sponsors.docs.length ? (
            <div className="sponsor-grid">
              {sponsors.docs.map((sponsor) => {
                const content = (
                  <>
                    <MediaImage fill={false} fallbackAlt={sponsor.name} media={sponsor.logo} />
                    <span>{sponsor.name}</span>
                  </>
                )
                return sponsor.website ? (
                  <a href={sponsor.website} key={sponsor.id} rel="noreferrer" target="_blank">
                    {content}
                  </a>
                ) : (
                  <div key={sponsor.id}>{content}</div>
                )
              })}
            </div>
          ) : (
            <EmptyState message="Patrocinadores e apoiadores serão apresentados aqui." />
          )}
        </div>
      </section>
    </>
  )
}
