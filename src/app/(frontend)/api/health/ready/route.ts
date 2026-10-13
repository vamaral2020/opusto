import { NextResponse } from 'next/server'

import { getCMS } from '@/lib/payload'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const payload = await getCMS()
    await payload.count({ collection: 'users', overrideAccess: true })
    return NextResponse.json({
      build: process.env.BUILD_SHA || 'development',
      database: 'ok',
      status: 'ready',
    })
  } catch {
    return NextResponse.json({ database: 'unavailable', status: 'not-ready' }, { status: 503 })
  }
}
