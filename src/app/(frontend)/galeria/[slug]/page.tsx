import { notFound } from 'next/navigation'
import { connection } from 'next/server'

import { MediaImage } from '@/components/MediaImage'
import { getCMS } from '@/lib/payload'
import { externalVideoEmbed } from '@/lib/video'

export default async function GalleryDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  await connection()
  const { slug } = await params
  const result = await (
    await getCMS()
  ).find({
    collection: 'galleries',
    depth: 1,
    limit: 1,
    overrideAccess: false,
    where: { slug: { equals: slug } },
  })
  const gallery = result.docs[0]
  if (!gallery) notFound()
  return (
    <>
      <section className="page-intro">
        <div className="shell narrow">
          <p className="eyebrow">Galeria</p>
          <h1>{gallery.title}</h1>
          {gallery.description ? <p className="page-lead">{gallery.description}</p> : null}
        </div>
      </section>
      <section className="band">
        <div className="shell media-grid">
          {gallery.images?.map((item) => (
            <figure key={item.id}>
              <div className="gallery-detail-image">
                <MediaImage fallbackAlt={item.caption || ''} media={item.image} />
              </div>
              {item.caption ? <figcaption>{item.caption}</figcaption> : null}
            </figure>
          ))}
          {gallery.externalVideos?.map((video) => {
            const embed = externalVideoEmbed(video.url)
            return embed ? (
              <div className="video-frame" key={video.id}>
                <iframe
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  src={embed}
                  title={video.title}
                />
              </div>
            ) : null
          })}
        </div>
      </section>
    </>
  )
}
