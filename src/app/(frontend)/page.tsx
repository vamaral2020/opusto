import type { Metadata } from 'next'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { connection } from 'next/server'

import { EmptyState } from '@/components/EmptyState'
import { EventCard } from '@/components/EventCard'
import { MediaImage } from '@/components/MediaImage'
import { PostCard } from '@/components/PostCard'
import { contentMetadata } from '@/lib/metadata'
import { getSiteSettings } from '@/lib/site-settings'
import { getCMS } from '@/lib/payload'

export async function generateMetadata(): Promise<Metadata> {
  await connection()
  const home = await (await getCMS()).findGlobal({ slug: 'home', depth: 1, overrideAccess: false })
  const settings = await getSiteSettings()
  return contentMetadata({
    title: home.title,
    description: home.introduction,
    meta: home.meta,
    image: home.heroImage,
    socialImage: settings.socialImage,
  })
}

export default async function HomePage() {
  await connection()
  const payload = await getCMS()
  const [home, events, posts] = await Promise.all([
    payload.findGlobal({ slug: 'home', depth: 2, overrideAccess: false }),
    payload.find({
      collection: 'events',
      depth: 1,
      limit: 3,
      overrideAccess: false,
      sort: 'startsAt',
      where: { startsAt: { greater_than_equal: new Date().toISOString() } },
    }),
    payload.find({
      collection: 'posts',
      depth: 1,
      limit: 3,
      overrideAccess: false,
      sort: '-publishedAt',
    }),
  ])

  return (
    <>
      <section className="hero">
        <div className="hero-media">
          <MediaImage
            fallbackAlt="Interior de uma sala de concertos"
            media={home.heroImage}
            priority
          />
        </div>
        <div className="shell">
          <div className="hero-content">
            <p className="eyebrow">{home.eyebrow}</p>
            <h1>{home.title}</h1>
            <p className="hero-lead">{home.introduction}</p>
            <div className="hero-actions">
              <Link className="button" href="/agenda">
                Ver agenda
              </Link>
              <Link className="button button-secondary" href="/sobre">
                Conheça a Opus TO
              </Link>
            </div>
          </div>
        </div>
      </section>
      <section className="band band-white">
        <div className="shell split">
          <div className="editorial-image">
            <MediaImage
              fallbackAlt="Detalhe de instrumentos de orquestra"
              media={home.aboutImage}
            />
          </div>
          <div className="editorial-copy">
            <p className="eyebrow">Opus Tocantins</p>
            <h2>{home.aboutTitle}</h2>
            <p>
              {home.aboutText ||
                'A Opus TO desenvolve sua trajetória com o propósito de fortalecer a música de concerto no estado.'}
            </p>
            <Link className="text-link inline-link" href="/sobre">
              Nossa história <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </div>
        </div>
      </section>
      <section className="band">
        <div className="shell">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Próximos encontros</p>
              <h2>Agenda</h2>
            </div>
            <Link className="text-link" href="/agenda">
              Agenda completa
            </Link>
          </div>
          {events.docs.length ? (
            <div className="card-grid">
              {events.docs.map((event) => (
                <EventCard event={event} key={event.id} />
              ))}
            </div>
          ) : (
            <EmptyState message="Novas apresentações serão publicadas em breve." />
          )}
        </div>
      </section>
      <section className="band band-white">
        <div className="shell">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Acompanhe a Opus TO</p>
              <h2>Notícias</h2>
            </div>
            <Link className="text-link" href="/noticias">
              Todas as notícias
            </Link>
          </div>
          {posts.docs.length ? (
            <div className="card-grid">
              {posts.docs.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <EmptyState message="As novidades da Opus TO aparecerão aqui." />
          )}
        </div>
      </section>
    </>
  )
}
