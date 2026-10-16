/** Run only against a NEW disposable PostgreSQL test database; never production. */
import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import {
  sql,
  type PostgresAdapter,
  type MigrateUpArgs,
  type MigrateDownArgs,
} from '@payloadcms/db-postgres'
import { getPayload } from 'payload'
import sharp from 'sharp'

const databaseURL = new URL(process.env.DATABASE_URL || 'postgresql://invalid/invalid')
assert(['127.0.0.1', 'localhost'].includes(databaseURL.hostname), 'Use a local test database')
assert(databaseURL.pathname.endsWith('_test'), 'Database name must end in _test')
assert.equal(process.env.PAYLOAD_DISABLE_PUSH, 'true')
assert.equal(process.env.NODE_ENV, 'test')

const mediaDir = await mkdtemp(path.join(os.tmpdir(), 'opusto-cms-images-'))
process.env.MEDIA_DIR = mediaDir
process.env.PAYLOAD_SECRET ||= 'cms-images-test-only-secret'
process.env.SITE_URL ||= 'http://127.0.0.1:3000'
const { default: config } = await import('../../src/payload.config')
const { migrations } = await import('../../src/migrations')
const payload = await getPayload({ config })
const db = payload.db as unknown as PostgresAdapter

try {
  const existing = await db.drizzle.execute(
    sql`SELECT to_regclass('public.payload_migrations') AS name`,
  )
  assert.equal(
    existing.rows[0].name,
    null,
    'Use a fresh database; this test never resets existing data',
  )
  await db.migrate({
    migrations: [
      {
        name: migrations[0].name,
        up: (args: unknown) => migrations[0].up(args as MigrateUpArgs),
        down: (args: unknown) => migrations[0].down(args as MigrateDownArgs),
      },
    ],
  })

  // These records represent existing production relationships BEFORE the additive migration.
  await db.drizzle.execute(sql`
    INSERT INTO media (id, alt, caption, credit, filename, mime_type, width, height)
      VALUES (100, 'Orquestra existente', 'Legenda existente', 'Crédito existente', 'legacy.webp', 'image/webp', 1080, 720);
    INSERT INTO home (id, title, hero_image_id, meta_image_id, _status)
      VALUES (100, 'Home existente', 100, 100, 'published');
    INSERT INTO _home_v (id, version_title, version_hero_image_id, version_meta_image_id, version__status, latest)
      VALUES (100, 'Home existente', 100, 100, 'published', true);
    INSERT INTO about (id, title, image_id, meta_image_id, _status)
      VALUES (100, 'Sobre existente', 100, 100, 'published');
    INSERT INTO site_settings (id, organization_name, short_name, social_image_id)
      VALUES (100, 'Grupo Musical Opus Tocantins', 'Opus TO', 100);
    INSERT INTO posts (id, title, slug, cover_id, meta_image_id, _status)
      VALUES (100, 'Notícia existente', 'noticia-existente', 100, 100, 'published');
    INSERT INTO events (id, title, slug, cover_id, meta_image_id, _status)
      VALUES (100, 'Concerto existente', 'concerto-existente', 100, 100, 'published');
    INSERT INTO musicians (id, name, slug, portrait_id, meta_image_id, _status)
      VALUES (100, 'Músico existente', 'musico-existente', 100, 100, 'published');
    INSERT INTO sponsors (id, name, logo_id, _status)
      VALUES (100, 'Patrocinador existente', 100, 'published');
    INSERT INTO galleries (id, title, slug, meta_image_id, _status)
      VALUES (100, 'Galeria existente', 'galeria-existente', 100, 'published');
    INSERT INTO galleries_images (id, _order, _parent_id, image_id, caption)
      VALUES ('legacy-image', 1, 100, 100, 'Legenda da galeria');
  `)
  const { copyFile } = await import('node:fs/promises')
  const legacyFile = path.join(mediaDir, 'legacy.webp')
  await copyFile('public/placeholders/orchestra-hall.webp', legacyFile)
  const legacyBytes = await readFile(legacyFile)

  const snapshot = async () => {
    const result = await db.drizzle.execute(sql`
      SELECT 'home' AS source, to_jsonb(t) - 'about_image_id' AS doc FROM home t
      UNION ALL SELECT '_home_v', to_jsonb(t) - 'version_about_image_id' FROM _home_v t
      UNION ALL SELECT 'site_settings', to_jsonb(t) - 'logo_id' FROM site_settings t
      UNION ALL SELECT 'media', to_jsonb(t) FROM media t
      UNION ALL SELECT 'about', to_jsonb(t) FROM about t
      UNION ALL SELECT 'posts', to_jsonb(t) FROM posts t
      UNION ALL SELECT 'events', to_jsonb(t) FROM events t
      UNION ALL SELECT 'musicians', to_jsonb(t) FROM musicians t
      UNION ALL SELECT 'sponsors', to_jsonb(t) FROM sponsors t
      UNION ALL SELECT 'galleries', to_jsonb(t) FROM galleries t
      UNION ALL SELECT 'galleries_images', to_jsonb(t) FROM galleries_images t
      ORDER BY source
    `)
    return result.rows
  }
  const before = await snapshot()
  await db.migrate()
  assert.deepEqual(
    await snapshot(),
    before,
    'Existing records and relationships must remain identical',
  )
  assert.deepEqual(
    await readFile(legacyFile),
    legacyBytes,
    'Migration must preserve uploaded files',
  )
  await db.migrate()
  assert.deepEqual(await snapshot(), before, 'Re-running migrations must be a no-op')

  const home = await payload.findGlobal({ slug: 'home', depth: 1 })
  assert.equal(home.aboutImage, null)
  assert.equal(typeof home.heroImage === 'object' && home.heroImage?.id, 100)
  const replacement = await payload.create({
    collection: 'media',
    data: { alt: 'Orquestra substituta', caption: 'Nova legenda', credit: 'Novo crédito' },
    file: {
      data: await sharp({ create: { width: 120, height: 80, channels: 3, background: '#a48042' } })
        .png()
        .toBuffer(),
      mimetype: 'image/png',
      name: 'replacement.png',
      size: 0,
    },
  })
  const updated = await payload.updateGlobal({
    slug: 'home',
    data: { aboutImage: replacement.id, _status: 'published' },
    depth: 1,
  })
  assert.equal(typeof updated.aboutImage === 'object' && updated.aboutImage?.id, replacement.id)
  assert.equal(typeof updated.heroImage === 'object' && updated.heroImage?.id, 100)
  await payload.updateGlobal({ slug: 'home', data: { aboutImage: null, _status: 'published' } })
  const removed = await payload.findGlobal({ slug: 'home', depth: 1, draft: false })
  assert.equal(removed.aboutImage, null)
  assert.equal(typeof removed.heroImage === 'object' && removed.heroImage?.id, 100)
  const versions = await payload.findGlobalVersions({ slug: 'home', depth: 0 })
  assert(
    versions.docs.some((entry) => entry.version.aboutImage === replacement.id),
    'Version history must store the new field',
  )

  await payload.create({
    collection: 'users',
    data: {
      name: 'Administrador de testes',
      email: 'cms-images@example.test',
      password: 'cms-images-test-password',
      role: 'admin',
    },
  })
  console.log(
    'PASS: migration preserves existing records, media relationships and file bytes; optional fields, independent replacement/removal, versions and repeated migrations verified.',
  )
  console.log(`CMS_IMAGE_TEST_MEDIA_DIR=${mediaDir}`)
} finally {
  await payload.destroy()
}

// Payload migration workers can keep handles alive after the pool is destroyed.
process.exit(0)
