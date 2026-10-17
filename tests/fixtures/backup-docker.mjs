// Fake Docker for backup script tests. Never connects to a Docker daemon.
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'

const args = process.argv.slice(2)
appendFileSync(
  process.env.BACKUP_TEST_LOG,
  `${JSON.stringify({
    args,
    credentials: Object.fromEntries(
      [
        'RESTIC_REPOSITORY',
        'RESTIC_PASSWORD',
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY',
        'AWS_DEFAULT_REGION',
      ].map((key) => [key, process.env[key]]),
    ),
  })}\n`,
)
// Simulate a tool accidentally logging secrets: wrapper logs must suppress them.
process.stderr.write(`${process.env.RESTIC_PASSWORD || 'tool-error-secret'}\n`)
const scenario = process.env.BACKUP_TEST_SCENARIO || ''
const snapshot = 'a'.repeat(64)
const metadata = {
  hostname: 'opusto-production',
  paths: ['/backup/postgres.dump', '/media'],
  tags: ['opusto', 'recovery-verified'],
}
if (args[0] === 'compose') {
  if (args.includes('pg_dump')) {
    if (scenario === 'dump-empty') process.exit(0)
    process.stdout.write(scenario === 'dump-header' ? 'invalid' : 'PGDMP archive fixture')
    process.exit(scenario === 'dump-error' ? 1 : 0)
  }
  if (args.includes('pg_restore')) {
    if (!readFileSync(0, 'utf8').startsWith('PGDMP')) process.exit(1)
    process.exit(scenario === 'dump-invalid' ? 1 : 0)
  }
  throw new Error('Unexpected Compose operation')
}
if (args[0] === 'volume' && args[1] === 'inspect')
  process.exit(scenario === 'volume-missing' ? 1 : 0)
if (args[0] !== 'run') throw new Error('Unexpected Docker operation')
if (args.includes('backup')) {
  const mount = args.find((value) => value.startsWith('type=bind,'))
  const source = mount
    .split(',')
    .find((value) => value.startsWith('source='))
    .slice(7)
  if (!existsSync(`${source}/postgres.dump`)) throw new Error('Dump not mounted')
  if (scenario === 'hold') {
    writeFileSync(process.env.BACKUP_TEST_READY, 'ready')
    while (!existsSync(process.env.BACKUP_TEST_RELEASE))
      await new Promise((resolve) => setTimeout(resolve, 20))
  }
  process.stdout.write(
    JSON.stringify({
      message_type: 'summary',
      snapshot_id: scenario === 'summary-invalid' ? 'invalid' : snapshot,
    }),
  )
  process.exit(scenario === 'upload-error' ? 1 : scenario === 'upload-partial' ? 3 : 0)
}
if (args.includes('cat')) {
  process.stdout.write(
    JSON.stringify(scenario === 'snapshot-invalid' ? { ...metadata, paths: ['/media'] } : metadata),
  )
  process.exit(scenario === 'snapshot-error' ? 1 : 0)
}
if (args.includes('snapshots')) {
  process.stdout.write(
    JSON.stringify(['unverified', 'verify-empty'].includes(scenario) ? [] : [metadata]),
  )
  process.exit(0)
}
if (args.includes('check')) process.exit(scenario === 'check-error' ? 1 : 0)
if (args.includes('forget')) {
  process.stdout.write(`${process.env.AWS_SECRET_ACCESS_KEY}\n`)
  process.exit(scenario === 'retention-error' ? 1 : 0)
}
throw new Error('Unexpected Restic operation')
