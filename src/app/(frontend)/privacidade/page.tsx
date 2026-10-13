import type { Metadata } from 'next'
import { connection } from 'next/server'

import { PageIntro } from '@/components/PageIntro'
import { RichContent } from '@/components/RichContent'
import { getCMS } from '@/lib/payload'

export const metadata: Metadata = { title: 'Privacidade' }

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
