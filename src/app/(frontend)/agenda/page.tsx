import type { Metadata } from 'next'
import { connection } from 'next/server'

import { EmptyState } from '@/components/EmptyState'
import { EventCard } from '@/components/EventCard'
import { PageIntro } from '@/components/PageIntro'
import { getCMS } from '@/lib/payload'

export const metadata: Metadata = { title: 'Agenda' }

export default async function EventsPage() {
  await connection()
  const events = await (
    await getCMS()
  ).find({ collection: 'events', depth: 1, limit: 50, overrideAccess: false, sort: 'startsAt' })
  return (
    <>
      <PageIntro
        eyebrow="Concertos"
        lead="Apresentações e encontros musicais publicados pela Opus TO."
        title="Agenda"
      />
      <section className="band">
        <div className="shell">
          {events.docs.length ? (
            <div className="card-grid">
              {events.docs.map((event) => (
                <EventCard event={event} key={event.id} />
              ))}
            </div>
          ) : (
            <EmptyState message="Não há apresentações publicadas no momento." />
          )}
        </div>
      </section>
    </>
  )
}
