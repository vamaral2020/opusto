import { ExternalLink } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'

import { MediaImage } from '@/components/MediaImage'
import { RichContent } from '@/components/RichContent'
import { formatDateTime } from '@/lib/format'
import { contentMetadata } from '@/lib/metadata'
import { getSiteSettings } from '@/lib/site-settings'
import { getCMS } from '@/lib/payload'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection()
  const { slug } = await params
  const result = await (
    await getCMS()
  ).find({
    depth: 1,
    collection: 'events',
    limit: 1,
    overrideAccess: false,
    where: { slug: { equals: slug } },
  })
  const event = result.docs[0]
  if (!event) return {}
  const settings = await getSiteSettings()
  return contentMetadata({
    title: event.title,
    description: event.summary,
    meta: event.meta,
    image: event.cover,
    socialImage: settings.socialImage,
  })
}

export default async function EventPage({ params }: Props) {
  await connection()
  const { slug } = await params
  const result = await (
    await getCMS()
  ).find({
    collection: 'events',
    depth: 1,
    limit: 1,
    overrideAccess: false,
    where: { slug: { equals: slug } },
  })
  const event = result.docs[0]
  if (!event) notFound()
  return (
    <>
      <section className="detail-hero">
        <MediaImage fallbackAlt="" media={event.cover} priority />
      </section>
      <article className="band">
        <div className="shell detail-layout">
          <div>
            <p className="eyebrow">Concerto</p>
            <h1 className="detail-title">{event.title}</h1>
            <p className="page-lead">{event.summary}</p>
            <RichContent data={event.content} />
          </div>
          <aside className="detail-aside">
            <dl>
              <dt>Data</dt>
              <dd>{formatDateTime(event.startsAt)}</dd>
              <dt>Local</dt>
              <dd>
                {event.venue}
                <br />
                {event.city}
              </dd>
            </dl>
            {event.ticketURL ? (
              <a className="button" href={event.ticketURL} rel="noreferrer" target="_blank">
                Ingressos <ExternalLink aria-hidden="true" size={16} />
              </a>
            ) : null}
          </aside>
        </div>
      </article>
    </>
  )
}
