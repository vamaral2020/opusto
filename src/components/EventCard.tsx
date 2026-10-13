import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

import { formatDate } from '@/lib/format'
import type { Event } from '@/payload-types'

import { MediaImage } from './MediaImage'

export function EventCard({ event }: { event: Event }) {
  return (
    <article className="content-card">
      <div className="card-image">
        <MediaImage fallbackAlt="" media={event.cover} />
      </div>
      <div className="card-body">
        <p className="card-meta">
          {formatDate(event.startsAt)} · {event.venue}
        </p>
        <h3>{event.title}</h3>
        <p>{event.summary}</p>
        <Link className="text-link inline-link" href={`/agenda/${event.slug}`}>
          Ver concerto <ArrowRight aria-hidden="true" size={16} />
        </Link>
      </div>
    </article>
  )
}
