'use client'

import { Send } from 'lucide-react'
import Link from 'next/link'
import { type FormEvent, useState } from 'react'

type State = 'idle' | 'sending' | 'success' | 'error'

export function ContactForm() {
  const [state, setState] = useState<State>('idle')
  const [message, setMessage] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setState('sending')
    setMessage('')
    const form = event.currentTarget
    const payload = Object.fromEntries(new FormData(form).entries())

    try {
      const response = await fetch('/api/contact', {
        body: JSON.stringify(payload),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      })
      const result = (await response.json()) as { error?: { message?: string } }
      if (!response.ok)
        throw new Error(result.error?.message || 'Não foi possível enviar a mensagem.')
      form.reset()
      setState('success')
      setMessage('Mensagem enviada. A equipe da Opus TO responderá assim que possível.')
    } catch (error) {
      setState('error')
      setMessage(error instanceof Error ? error.message : 'Não foi possível enviar a mensagem.')
    }
  }

  return (
    <form className="contact-form" onSubmit={submit}>
      <div className="form-grid">
        <label>
          Nome
          <input autoComplete="name" maxLength={100} name="name" required />
        </label>
        <label>
          E-mail
          <input autoComplete="email" maxLength={254} name="email" required type="email" />
        </label>
      </div>
      <label>
        Assunto
        <input maxLength={150} name="subject" required />
      </label>
      <label>
        Mensagem
        <textarea maxLength={5000} name="message" required rows={7} />
      </label>
      <label className="honeypot" aria-hidden="true">
        Empresa
        <input autoComplete="off" name="company" tabIndex={-1} />
      </label>
      <label className="consent">
        <input name="consent" required type="checkbox" value="true" />
        <span>
          Autorizo o uso destes dados para responder ao contato e li o{' '}
          <Link href="/privacidade">aviso de privacidade</Link>.
        </span>
      </label>
      <div className="form-actions">
        <button className="button" disabled={state === 'sending'} type="submit">
          {state === 'sending' ? (
            'Enviando…'
          ) : (
            <>
              Enviar mensagem <Send aria-hidden="true" size={17} />
            </>
          )}
        </button>
        {message ? (
          <p aria-live="polite" className={`form-message ${state}`}>
            {message}
          </p>
        ) : null}
      </div>
    </form>
  )
}
