import { notFound } from 'next/navigation'
import { connection } from 'next/server'

import { MediaImage } from '@/components/MediaImage'
import { RichContent } from '@/components/RichContent'
import { getCMS } from '@/lib/payload'

export default async function MusicianPage({ params }: { params: Promise<{ slug: string }> }) {
  await connection()
  const { slug } = await params
  const result = await (
    await getCMS()
  ).find({
    collection: 'musicians',
    depth: 1,
    limit: 1,
    overrideAccess: false,
    where: { slug: { equals: slug } },
  })
  const musician = result.docs[0]
  if (!musician) notFound()
  return (
    <article className="band">
      <div className="shell profile-layout">
        <div className="profile-image">
          <MediaImage fallbackAlt="" media={musician.portrait} />
        </div>
        <div>
          <p className="eyebrow">{musician.instrument}</p>
          <h1 className="detail-title">{musician.name}</h1>
          <RichContent data={musician.biography} />
        </div>
      </div>
    </article>
  )
}
