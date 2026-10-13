import { Mail, Phone } from 'lucide-react'
import type { Metadata } from 'next'
import { connection } from 'next/server'

import { ContactForm } from '@/components/ContactForm'
import { PageIntro } from '@/components/PageIntro'
import { getCMS } from '@/lib/payload'

export const metadata: Metadata = { title: 'Contato' }

export default async function ContactPage() {
  await connection()
  const contact = await (await getCMS()).findGlobal({ slug: 'contact', overrideAccess: false })
  return (
    <>
      <PageIntro eyebrow="Fale conosco" lead={contact.introduction} title={contact.title} />
      <section className="band">
        <div className="shell contact-layout">
          <ContactForm />
          <aside className="contact-details">
            <h2>Canais diretos</h2>
            {contact.email ? (
              <a href={`mailto:${contact.email}`}>
                <Mail aria-hidden="true" />
                {contact.email}
              </a>
            ) : null}
            {contact.phone ? (
              <a href={`tel:${contact.phone}`}>
                <Phone aria-hidden="true" />
                {contact.phone}
              </a>
            ) : null}
            <p>Os canais oficiais serão atualizados pela equipe no painel administrativo.</p>
          </aside>
        </div>
      </section>
    </>
  )
}
