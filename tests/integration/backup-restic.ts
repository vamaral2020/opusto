/** No R2 access, Compose stack or existing volume is used by this recovery rehearsal. */
import assert from 'node:assert/strict'
import { execFile, execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer, type Server } from 'node:https'
import { randomUUID } from 'node:crypto'
import { promisify } from 'node:util'
import os from 'node:os'
import path from 'node:path'

const directory = mkdtempSync(path.join(os.tmpdir(), 'opusto-restic-integration-'))
const docker = execFileSync('/bin/sh', ['-c', 'command -v docker'], { encoding: 'utf8' }).trim()
const image = 'restic/restic:0.18.1'
const resticUser = `${process.getuid?.() ?? 1000}:${process.getgid?.() ?? 1000}`
const database = `opusto-backup-test-${process.pid}`
const restoredDatabase = `${database}-restore`
const createdContainers: string[] = []
let monitoringServer: Server | undefined
const execFileAsync = promisify(execFile)
const repository = path.join(directory, 'repository')
const media = path.join(directory, 'media')
const restore = path.join(directory, 'restore')
const bin = path.join(directory, 'bin')
const initializationScript = path.join(directory, 'wait-for-initialization.sql')
writeFileSync(
  initializationScript,
  "SELECT pg_sleep(1);\nALTER DATABASE backup_test SET app.opusto_initialized = 'true';\n",
)
for (const name of [repository, media, restore, bin]) mkdirSync(name, { mode: 0o700 })
const localEnv = {
  ...process.env,
  RESTIC_REPOSITORY: '/repository',
  RESTIC_PASSWORD: 'disposable-integration-password',
}
const runDocker = (args: string[], input?: Buffer | string) =>
  execFileSync(docker, args, {
    env: localEnv,
    input,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  })
const restic = (args: string[], mounts: string[] = []) =>
  runDocker([
    'run',
    '--rm',
    '--network',
    'none',
    '--user',
    resticUser,
    '--env',
    'RESTIC_CACHE_DIR=/tmp/restic-cache',
    '--env',
    'RESTIC_REPOSITORY',
    '--env',
    'RESTIC_PASSWORD',
    '--mount',
    `type=bind,source=${repository},target=/repository`,
    ...mounts.flatMap((mount) => ['--mount', mount]),
    image,
    ...args,
  ])

async function startPostgres(name: string) {
  runDocker([
    'run',
    '--detach',
    '--network',
    'none',
    '--name',
    name,
    '--tmpfs',
    '/var/lib/postgresql:rw',
    '--mount',
    `type=bind,source=${initializationScript},target=/docker-entrypoint-initdb.d/99-readiness.sql,readonly`,
    '--env',
    'POSTGRES_USER=backup_test',
    '--env',
    'POSTGRES_PASSWORD=test-only',
    '--env',
    'POSTGRES_DB=backup_test',
    'postgres:18.6-alpine',
  ])
  createdContainers.push(name)
  for (let attempt = 0; attempt < 100; attempt++) {
    if (
      // The entrypoint's temporary server accepts Unix-socket connections before
      // POSTGRES_DB exists. Only the final server listens on TCP; execute SQL
      // against the intended database to wait for completed initialization.
      spawnSync(
        docker,
        [
          'exec',
          '--env',
          'PGPASSWORD=test-only',
          name,
          'psql',
          '--host=127.0.0.1',
          '--username=backup_test',
          '--dbname=backup_test',
          '--no-psqlrc',
          '--set=ON_ERROR_STOP=1',
          '--tuples-only',
          '--no-align',
          '--command=SELECT 1',
        ],
        { stdio: 'ignore' },
      ).status === 0
    ) {
      // Regression guard: readiness must never accept the temporary init server.
      assert.equal(
        runDocker([
          'exec',
          name,
          'psql',
          '-U',
          'backup_test',
          '-d',
          'backup_test',
          '-Atqc',
          "SELECT current_setting('app.opusto_initialized')",
        ]).trim(),
        'true',
      )
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error(`Temporary PostgreSQL did not become ready: ${runDocker(['logs', name])}`)
}

try {
  // Exercise the actual curl/TLS transport only against a disposable local server.
  const certificate = path.join(directory, 'monitor.crt')
  const privateKey = path.join(directory, 'monitor.key')
  const certificateConfig = path.join(directory, 'monitor.cnf')
  writeFileSync(
    certificateConfig,
    '[req]\ndistinguished_name=dn\nx509_extensions=ext\nprompt=no\n[dn]\nCN=127.0.0.1\n[ext]\nsubjectAltName=IP:127.0.0.1\nbasicConstraints=critical,CA:TRUE\nkeyUsage=critical,digitalSignature,keyEncipherment,keyCertSign\nextendedKeyUsage=serverAuth\n',
  )
  execFileSync(
    'openssl',
    [
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-keyout',
      privateKey,
      '-out',
      certificate,
      '-days',
      '1',
      '-config',
      certificateConfig,
    ],
    { stdio: 'ignore' },
  )
  const requests: { method?: string; url?: string }[] = []
  let monitoringStatus = 200
  monitoringServer = createServer(
    { key: readFileSync(privateKey), cert: readFileSync(certificate) },
    (request, response) => {
      requests.push({ method: request.method, url: request.url })
      response.writeHead(monitoringStatus)
      response.end('OK')
    },
  )
  await new Promise<void>((resolve) => monitoringServer!.listen(0, '127.0.0.1', resolve))
  const address = monitoringServer.address()
  assert(address && typeof address === 'object')
  const monitoringPath = `/test-${randomUUID()}`
  const monitoringURL = `https://127.0.0.1:${address.port}${monitoringPath}`

  await startPostgres(database)
  runDocker(
    [
      'exec',
      '-i',
      database,
      'psql',
      '-U',
      'backup_test',
      '-d',
      'backup_test',
      '-v',
      'ON_ERROR_STOP=1',
    ],
    "CREATE TABLE recovery_probe (id int primary key, title text); INSERT INTO recovery_probe VALUES (1, 'Opus TO recovery');",
  )
  const sample = readFileSync('public/placeholders/orchestra-hall.webp')
  writeFileSync(path.join(media, 'orchestra.webp'), sample)
  restic(['init']) // Only a brand-new LOCAL repository, never the existing R2 bucket.

  writeFileSync(
    path.join(bin, 'docker'),
    `#!/usr/bin/env node\n${readFileSync('tests/fixtures/backup-docker-local.mjs', 'utf8')}`,
    { mode: 0o755 },
  )
  if (process.platform === 'darwin') {
    writeFileSync(
      path.join(bin, 'flock'),
      `#!/usr/bin/env python3
import fcntl, sys
fcntl.flock(int(sys.argv[-1]), fcntl.LOCK_EX | fcntl.LOCK_NB)
`,
      { mode: 0o755 },
    )
  }
  const appFile = path.join(directory, '.env')
  const writeAppConfig = (retention: boolean) =>
    writeFileSync(
      appFile,
      `POSTGRES_USER=backup_test\nPOSTGRES_DB=backup_test\nBACKUP_STAGING_DIR=${directory}/staging\nBACKUP_LOCK_FILE=${directory}/backup.lock\nBACKUP_MEDIA_VOLUME=opusto_backup_integration_media\nBACKUP_RETENTION_ENABLED=${retention}\n`,
    )
  writeAppConfig(false)
  writeFileSync(
    path.join(directory, '.env.backup'),
    `RESTIC_REPOSITORY=s3:https://unused.invalid/test\nRESTIC_PASSWORD=disposable-integration-password\nAWS_ACCESS_KEY_ID=test-only\nAWS_SECRET_ACCESS_KEY=test-only\nHEALTHCHECKS_PING_URL=${monitoringURL}\n`,
  )
  writeFileSync(
    path.join(directory, 'compose.yaml'),
    '# Never used by the isolated Docker adapter\n',
  )
  const backupEnv = {
    ...process.env,
    CURL_CA_BUNDLE: certificate,
    PATH: `${bin}:${process.env.PATH}`,
    DEPLOY_DIR: directory,
    ENV_FILE: appFile,
    BACKUP_ENV_FILE: path.join(directory, '.env.backup'),
    COMPOSE_FILE: path.join(directory, 'compose.yaml'),
    BACKUP_INTEGRATION_DATABASE: database,
    BACKUP_INTEGRATION_DOCKER: docker,
    BACKUP_INTEGRATION_REPOSITORY: repository,
    BACKUP_INTEGRATION_MEDIA: media,
  }
  const backup = () =>
    execFileAsync('bash', ['ops/backup.sh', 'integration'], { env: backupEnv, encoding: 'utf8' })
  await backup()
  assert.deepEqual(
    requests.map((request) => request.url),
    [`${monitoringPath}/start`, monitoringPath],
  )
  type Snapshot = { id: string; hostname: string; tags: string[]; paths: string[] }
  const snapshots = (): Snapshot[] => JSON.parse(restic(['snapshots', '--json']))
  const first = snapshots()[0]
  assert.equal(snapshots().length, 1, 'Dry-run must preserve the only snapshot')
  assert.deepEqual(first.paths.sort(), ['/backup/postgres.dump', '/media'].sort())
  restic(
    ['restore', first.id, '--target', '/restore'],
    [`type=bind,source=${restore},target=/restore`],
  )
  assert.deepEqual(readFileSync(path.join(restore, 'media/orchestra.webp')), sample)

  await startPostgres(restoredDatabase)
  runDocker(
    [
      'exec',
      '-i',
      restoredDatabase,
      'pg_restore',
      '-U',
      'backup_test',
      '-d',
      'backup_test',
      '--no-owner',
      '--no-acl',
      '--exit-on-error',
    ],
    readFileSync(path.join(restore, 'backup/postgres.dump')),
  )
  const restored = runDocker([
    'exec',
    restoredDatabase,
    'psql',
    '-U',
    'backup_test',
    '-d',
    'backup_test',
    '-Atc',
    'SELECT title FROM recovery_probe WHERE id = 1',
  ])
  assert.equal(restored.trim(), 'Opus TO recovery')

  // Exercise actual Restic policy with historical snapshots, not only argument mocks.
  const mounts = [
    `type=bind,source=${restore}/backup,target=/backup,readonly`,
    `type=bind,source=${restore}/media,target=/media,readonly`,
  ]
  const historical: string[] = []
  for (const date of [
    '2020-01-01',
    '2020-02-01',
    ...['01', '02', '03', '04', '05', '06', '07'].map((month) => `2021-${month}-01`),
  ]) {
    const output = restic(
      [
        'backup',
        '--json',
        '--host',
        'opusto-production',
        '--tag',
        'opusto',
        '--time',
        `${date} 00:00:00`,
        '/backup/postgres.dump',
        '/media',
      ],
      mounts,
    )
    const summary = output
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line))
      .find((line) => line.message_type === 'summary')
    historical.push(summary.snapshot_id)
  }
  // The contents match the fully restored sample; keep this old baseline beyond normal retention.
  restic(['tag', '--add', 'recovery-verified', historical[0]])
  const pinned = snapshots().find((snapshot) => snapshot.tags?.includes('recovery-verified'))!
  const unrelatedOutput = restic(
    ['backup', '--json', '--host', 'another-host', '--tag', 'unrelated', '/media'],
    mounts,
  )
  const unrelatedID = JSON.parse(unrelatedOutput.trim().split('\n').at(-1)!).snapshot_id
  writeAppConfig(true)
  await backup()
  const kept = snapshots()
  assert(
    kept.some((snapshot) => snapshot.id === pinned.id),
    'Restore-verified baseline must survive pruning',
  )
  assert(
    kept.some((snapshot) => snapshot.id === unrelatedID),
    'Retention must not touch unrelated snapshots',
  )
  assert(
    !kept.some((snapshot) => snapshot.id === historical[1]),
    'Old unpinned snapshots must be pruned by the real policy',
  )
  assert(
    kept.some((snapshot) => snapshot.hostname === 'opusto-production' && snapshot.id !== pinned.id),
    'Retention must preserve a current backup',
  )
  restic(['check', '--read-data'])
  assert.deepEqual(
    requests.map((request) => request.url),
    [`${monitoringPath}/start`, monitoringPath, `${monitoringPath}/start`, monitoringPath],
  )
  writeFileSync(
    appFile,
    readFileSync(appFile, 'utf8').replace('POSTGRES_DB=backup_test', 'POSTGRES_DB=missing_test'),
  )
  await assert.rejects(backup(), { code: 1 })
  assert.equal(requests.at(-1)?.url, `${monitoringPath}/fail`)
  const notificationCount = requests.length
  await execFileAsync('bash', ['ops/verify-backup.sh'], { env: backupEnv })
  assert.equal(requests.length, notificationCount, 'Manual verification must not notify')
  writeAppConfig(true)
  monitoringStatus = 503
  const outage = await backup()
  assert.match(outage.stderr, /WARNING: Healthchecks communication failed/)
  assert(!outage.stderr.includes(monitoringURL), 'A transport warning must not disclose the URL')
  assert.deepEqual(
    requests.slice(-2).map((request) => request.url),
    [`${monitoringPath}/start`, monitoringPath],
  )
  assert(requests.every((request) => request.method === 'GET'))
  console.log(
    'PASS: real PostgreSQL custom dump restored into isolated PostgreSQL; media bytes match; encrypted Restic backup/restore, single-snapshot protection, 7/4/3 retention, pinned baseline and host scope verified; real local HTTPS start/success/fail, verification silence and monitoring outage isolation verified. No R2, production data or existing volumes used.',
  )
} finally {
  if (monitoringServer) {
    monitoringServer.closeAllConnections()
    await new Promise<void>((resolve) => monitoringServer!.close(() => resolve()))
  }
  for (const container of createdContainers.reverse())
    spawnSync(docker, ['rm', '--force', container], { stdio: 'ignore' })
  rmSync(directory, { recursive: true, force: true })
}
