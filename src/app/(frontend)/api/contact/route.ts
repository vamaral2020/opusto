import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getCMS } from '@/lib/payload'

export const dynamic = 'force-dynamic'

const schema = z.object({
  company: z.string().max(0).optional().default(''),
  consent: z.literal('true'),
  email: z.string().trim().email().max(254),
  message: z.string().trim().min(10).max(5000),
  name: z.string().trim().min(2).max(100),
  subject: z.string().trim().min(3).max(150),
})

const attempts = new Map<string, { count: number; expiresAt: number }>()

function allowed(ip: string): boolean {
  const now = Date.now()
  const windowMs = Number(process.env.CONTACT_RATE_LIMIT_WINDOW_MS || 600_000)
  const maximum = Number(process.env.CONTACT_RATE_LIMIT_MAX || 5)
  const current = attempts.get(ip)
  if (!current || current.expiresAt <= now) {
    attempts.set(ip, { count: 1, expiresAt: now + windowMs })
    if (attempts.size > 2000) {
      for (const [key, entry] of attempts) if (entry.expiresAt <= now) attempts.delete(key)
    }
    return true
  }
  current.count += 1
  return current.count <= maximum
}

function errorResponse(code: string, message: string, requestId: string, status: number) {
  return NextResponse.json({ error: { code, message, requestId } }, { status })
}

export async function POST(request: NextRequest) {
  const requestId = randomUUID()
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')
  const ip = request.headers.get('x-real-ip') || forwardedFor?.at(-1)?.trim() || 'unknown'
  if (!allowed(ip))
    return errorResponse(
      'RATE_LIMITED',
      'Muitas tentativas. Aguarde alguns minutos.',
      requestId,
      429,
    )

  try {
    const input = schema.safeParse(await request.json())
    if (!input.success)
      return errorResponse('INVALID_INPUT', 'Revise os campos informados.', requestId, 400)
    if (input.data.company)
      return NextResponse.json({ requestId, status: 'accepted' }, { status: 202 })

    const payload = await getCMS()
    await payload.create({
      collection: 'contact-submissions',
      data: {
        consentAt: new Date().toISOString(),
        email: input.data.email,
        message: input.data.message,
        name: input.data.name,
        status: 'new',
        subject: input.data.subject,
      },
      draft: false,
      overrideAccess: true,
    })
    payload.logger.info({ msg: 'Contact submission stored', requestId })
    return NextResponse.json({ requestId, status: 'created' }, { status: 201 })
  } catch (error) {
    const payload = await getCMS().catch(() => null)
    payload?.logger.error({ err: error, msg: 'Contact submission failed', requestId })
    return errorResponse('INTERNAL_ERROR', 'Não foi possível enviar a mensagem.', requestId, 500)
  }
}
