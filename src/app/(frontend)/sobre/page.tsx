import type { Metadata } from 'next'
import { connection } from 'next/server'

import { MediaImage } from '@/components/MediaImage'
import { PageIntro } from '@/components/PageIntro'
import { RichContent } from '@/components/RichContent'
import { contentMetadata } from '@/lib/metadata'
import { getSiteSettings } from '@/lib/site-settings'
import { getCMS } from '@/lib/payload'

export async function generateMetadata(): Promise<Metadata> {
  await connection()
  const about = await (
    await getCMS()
  ).findGlobal({ slug: 'about', depth: 1, overrideAccess: false })
  const settings = await getSiteSettings()
  return contentMetadata({
    title: about.title,
    description: about.lead,
    meta: about.meta,
    image: about.image,
    socialImage: settings.socialImage,
  })
}

export default async function AboutPage() {
  await connection()
  const about = await (
    await getCMS()
  ).findGlobal({ slug: 'about', depth: 1, overrideAccess: false })
  return (
    <>
      <PageIntro eyebrow="Institucional" lead={about.lead} title={about.title} />
      <section className="band">
        <div className="shell split split-start">
          <div className="editorial-image">
            <MediaImage fallbackAlt="Música de concerto" media={about.image} />
          </div>
          <RichContent data={about.content} />
        </div>
      </section>
    </>
  )
}
