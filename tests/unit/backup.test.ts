import { spawn, spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const directories: string[] = []
const secret = 'literal-credential-$notExpanded-$(touch SHOULD_NOT_EXIST)'
type Call = { args: string[]; credentials: Record<string, string> }

function fixture(scenario = '', retention = false) {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'opusto-backup-test-'))
  directories.push(directory)
  const bin = path.join(directory, 'bin')
  mkdirSync(bin)
  const docker = path.join(bin, 'docker')
  const contents = readFileSync('tests/fixtures/backup-docker.mjs', 'utf8')
  writeFileSync(docker, `#!/usr/bin/env node\n${contents}`, { mode: 0o755 })
  // macOS lacks util-linux flock; exercise the same OS flock(2) on inherited FD 9.
  if (process.platform === 'darwin') {
    writeFileSync(
      path.join(bin, 'flock'),
      `#!/usr/bin/env python3
import fcntl, sys
try:
    fcntl.flock(int(sys.argv[-1]), fcntl.LOCK_EX | fcntl.LOCK_NB)
except BlockingIOError:
    sys.exit(1)
`,
      { mode: 0o755 },
    )
  }
  const envFile = path.join(directory, '.env')
  const backupEnvFile = path.join(directory, '.env.backup')
  const staging = path.join(directory, 'staging')
  writeFileSync(
    envFile,
    `POSTGRES_USER=test\nPOSTGRES_DB=test\nPOSTGRES_PASSWORD=app-secret\nPAYLOAD_SECRET=payload-secret\nBACKUP_STAGING_DIR=${staging}\nBACKUP_LOCK_FILE=${directory}/backup.lock\nRESTIC_IMAGE=restic/restic:0.18.1\nBACKUP_RETENTION_ENABLED=${retention}\n`,
  )
  writeFileSync(
    backupEnvFile,
    `RESTIC_REPOSITORY=s3:https://account.r2.cloudflarestorage.com/opusto-backups\nRESTIC_PASSWORD=${secret}\nAWS_ACCESS_KEY_ID=test-access-key\nAWS_SECRET_ACCESS_KEY=test-secret-key\n`,
  )
  writeFileSync(path.join(directory, 'compose.yaml'), '')
  const log = path.join(directory, 'calls.jsonl')
  const env = {
    ...process.env,
    PATH: `${bin}:${process.env.PATH}`,
    DEPLOY_DIR: directory,
    ENV_FILE: envFile,
    BACKUP_ENV_FILE: backupEnvFile,
    COMPOSE_FILE: path.join(directory, 'compose.yaml'),
    BACKUP_TEST_LOG: log,
    BACKUP_TEST_SCENARIO: scenario,
    BACKUP_TEST_READY: path.join(directory, 'ready'),
    BACKUP_TEST_RELEASE: path.join(directory, 'release'),
  }
  const run = (verify = false) =>
    spawnSync(
      'bash',
      [
        path.resolve(verify ? 'ops/verify-backup.sh' : 'ops/backup.sh'),
        ...(verify ? [] : ['scheduled']),
      ],
      { env, encoding: 'utf8' },
    )
  const calls = (): Call[] =>
    existsSync(log)
      ? readFileSync(log, 'utf8')
          .trim()
          .split('\n')
          .map((line) => JSON.parse(line))
      : []
  return { directory, envFile, backupEnvFile, staging, env, run, calls }
}

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true })
})

describe('encrypted R2 backup', () => {
  it('validates the dump and stores database plus read-only media in one stable snapshot', () => {
    const context = fixture()
    const result = context.run()
    expect(result.status, result.stderr).toBe(0)
    const calls = context.calls()
    expect(calls[0].args).toContain('pg_dump')
    expect(calls[0].args).toContain('--format=custom')
    expect(calls[1].args).toContain('pg_restore')
    expect(calls[1].args).toContain('--file=/dev/null')
    const backup = calls.find(({ args }) => args.includes('backup'))!
    expect(backup.args.slice(-2)).toEqual(['/backup/postgres.dump', '/media'])
    expect(backup.args).toContain('type=volume,source=opusto_media,target=/media,readonly')
    expect(backup.args).toContain('--json')
    expect(backup.args).not.toContain('--env-file')
    expect(backup.args.join(' ')).not.toContain(secret)
    expect(backup.args.join(' ')).not.toContain('POSTGRES_PASSWORD')
    expect(backup.credentials.RESTIC_PASSWORD).toBe(secret)
    expect(backup.credentials.AWS_DEFAULT_REGION).toBe('auto')
    expect(existsSync(path.join(context.directory, 'SHOULD_NOT_EXIST'))).toBe(false)
    const retention = calls.find(({ args }) => args.includes('forget'))!.args
    expect(retention).toEqual(
      expect.arrayContaining([
        '--dry-run',
        '--keep-daily',
        '7',
        '--keep-weekly',
        '4',
        '--keep-monthly',
        '3',
        '--keep-last',
        '1',
        '--keep-tag',
        'recovery-verified',
      ]),
    )
    expect(retention).not.toContain('--prune')
    expect(
      retention.slice(retention.indexOf('--group-by'), retention.indexOf('--group-by') + 2),
    ).toEqual(['--group-by', 'host'])
    expect(result.stdout + result.stderr).not.toContain(secret)
    expect(result.stdout + result.stderr).not.toContain('test-secret-key')
    expect(readdirSync(context.staging)).toEqual([])
  })

  it.each(['RESTIC_REPOSITORY', 'RESTIC_PASSWORD', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'])(
    'rejects a missing %s even if inherited from application config or environment',
    (key) => {
      const context = fixture()
      writeFileSync(
        context.backupEnvFile,
        readFileSync(context.backupEnvFile, 'utf8')
          .split('\n')
          .filter((line) => !line.startsWith(`${key}=`))
          .join('\n'),
      )
      Object.assign(context.env, { [key]: 'inherited' })
      writeFileSync(
        context.envFile,
        readFileSync(context.envFile, 'utf8') + `${key}=application-value\n`,
      )
      expect(context.run().status).not.toBe(0)
      expect(context.calls()).toEqual([])
    },
  )

  it.each(['envFile', 'backupEnvFile'] as const)('fails before Docker if %s is absent', (key) => {
    const context = fixture()
    rmSync(context[key])
    expect(context.run().status).not.toBe(0)
    expect(context.calls()).toEqual([])
  })

  it.each([
    'dump-error',
    'dump-empty',
    'dump-header',
    'dump-invalid',
    'volume-missing',
    'upload-error',
    'upload-partial',
    'summary-invalid',
    'snapshot-invalid',
    'snapshot-error',
    'check-error',
  ])('stops without retention and cleans plaintext staging on %s', (scenario) => {
    const context = fixture(scenario)
    const result = context.run()
    expect(result.status).not.toBe(0)
    expect(context.calls().some(({ args }) => args.includes('forget'))).toBe(false)
    expect(result.stdout + result.stderr).not.toContain(secret)
    expect(readdirSync(context.staging)).toEqual([])
  })

  it('never prunes before a restore-verified baseline exists', () => {
    const context = fixture('unverified', true)
    expect(context.run().status).not.toBe(0)
    expect(context.calls().some(({ args }) => args.includes('forget'))).toBe(false)
  })

  it('applies retention only after validation, preserving verified snapshots and the latest', () => {
    const context = fixture('', true)
    expect(context.run().status).toBe(0)
    const calls = context.calls()
    const index = calls.findIndex(({ args }) => args.includes('forget'))
    expect(calls[index].args).toEqual(
      expect.arrayContaining(['--prune', '--keep-tag', 'recovery-verified', '--keep-last', '1']),
    )
    expect(calls[index - 1].args).toContain('opusto,recovery-verified')
    expect(calls[index + 1].args).toContain('check')
  })

  it.each([false, true])('returns nonzero if retention fails (enabled=%s)', (enabled) => {
    const context = fixture('retention-error', enabled)
    expect(context.run().status).not.toBe(0)
    expect(readdirSync(context.staging)).toEqual([])
  })

  it('uses the same credential separation for read-only verification', () => {
    const context = fixture()
    expect(context.run(true).status).toBe(0)
    const calls = context.calls()
    expect(calls.every(({ args }) => args[0] === 'run')).toBe(true)
    expect(calls[0].args).toContain('--read-data-subset=5%')
    expect(calls.some(({ args }) => args.includes('forget'))).toBe(false)
  })

  it('rejects verification of a repository without a matching snapshot', () => {
    const context = fixture('verify-empty')
    expect(context.run(true).status).not.toBe(0)
  })

  it('does not expose credentials even when invoked with tracing enabled', () => {
    const context = fixture()
    const result = spawnSync('bash', ['-x', path.resolve('ops/backup.sh')], {
      env: context.env,
      encoding: 'utf8',
    })
    expect(result.status).toBe(0)
    expect(result.stdout + result.stderr).not.toContain(secret)
    expect(result.stdout + result.stderr).not.toContain('test-secret-key')
  })

  it('refuses a concurrent invocation while the first still holds the host lock', async () => {
    const context = fixture('hold')
    const first = spawn('bash', [path.resolve('ops/backup.sh')], {
      env: context.env,
      stdio: 'ignore',
    })
    const completed = new Promise<number | null>((resolve) => first.once('exit', resolve))
    try {
      await vi.waitFor(() => expect(existsSync(context.env.BACKUP_TEST_READY)).toBe(true), {
        timeout: 5000,
      })
      expect(context.run().status).toBe(75)
    } finally {
      writeFileSync(context.env.BACKUP_TEST_RELEASE, '')
      await completed
    }
    expect(context.calls().filter(({ args }) => args.includes('pg_dump'))).toHaveLength(1)
  })
})
