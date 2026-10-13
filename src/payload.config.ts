import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'node:path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'

import { ContactSubmissions } from '@/collections/ContactSubmissions'
import { Events } from '@/collections/Events'
import { Galleries } from '@/collections/Galleries'
import { Media } from '@/collections/Media'
import { Musicians } from '@/collections/Musicians'
import { Posts } from '@/collections/Posts'
import { Sponsors } from '@/collections/Sponsors'
import { Users } from '@/collections/Users'
import { About } from '@/globals/About'
import { Contact } from '@/globals/Contact'
import { Home } from '@/globals/Home'
import { Privacy } from '@/globals/Privacy'
import { SiteSettings } from '@/globals/SiteSettings'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const siteURL = process.env.SITE_URL || 'http://localhost:3000'

const getPayloadSecret = (): string => {
  const secret = process.env.PAYLOAD_SECRET

  if (secret) return secret
  if (process.env.NODE_ENV === 'production') {
    throw new Error('PAYLOAD_SECRET is required when NODE_ENV=production')
  }

  return 'development-secret-change-before-production'
}

export default buildConfig({
  admin: {
    meta: { titleSuffix: ' | Opus TO' },
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
  },
  collections: [Users, Media, Events, Posts, Musicians, Galleries, Sponsors, ContactSubmissions],
  globals: [Home, About, Contact, Privacy, SiteSettings],
  cors: [siteURL],
  csrf: [siteURL],
  db: postgresAdapter({
    migrationDir: path.resolve(dirname, 'migrations'),
    pool: {
      connectionString:
        process.env.DATABASE_URL || 'postgresql://opusto:opusto@127.0.0.1:5432/opusto',
    },
    push: process.env.NODE_ENV === 'development' && process.env.PAYLOAD_DISABLE_PUSH !== 'true',
  }),
  editor: lexicalEditor(),
  graphQL: { disable: true },
  maxDepth: 4,
  secret: getPayloadSecret(),
  serverURL: siteURL,
  sharp,
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  upload: {
    limits: { fileSize: Number(process.env.MAX_UPLOAD_BYTES || 10_000_000) },
  },
})
