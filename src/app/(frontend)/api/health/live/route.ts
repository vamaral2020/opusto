import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json({ build: process.env.BUILD_SHA || 'development', status: 'ok' })
}
