import type { Metadata } from 'next'
import { connection } from 'next/server'

import { PageIntro } from '@/components/PageIntro'
import { RichContent } from '@/components/RichContent'
import { contentMetadata } from '@/lib/metadata'
import { getSiteSettings } from '@/lib/site-settings'
import { getCMS } from '@/lib/payload'

export async function generateMetadata(): Promise<Metadata> {
  await connection()
  const privacy = await (
    await getCMS()
  ).findGlobal({ slug: 'privacy', depth: 1, overrideAccess: false })
  const settings = await getSiteSettings()
  return contentMetadata({
    title: privacy.title,
    description: privacy.summary,
    meta: privacy.meta,
    image: undefined,
    socialImage: settings.socialImage,
  })
}

export default async function PrivacyPage() {
  await connection()
  const privacy = await (await getCMS()).findGlobal({ slug: 'privacy', overrideAccess: false })
  return (
    <>
      <PageIntro eyebrow="Seus dados" lead={privacy.summary} title={privacy.title} />
      <section className="band">
        <div className="shell narrow">
          <RichContent data={privacy.content} />
          <p className="privacy-note">
            Este texto é provisório e deve ser revisado antes da publicação oficial do site.
          </p>
        </div>
      </section>
    </>
  )
}
