// Integration adapter: only disposable test PostgreSQL and a LOCAL Restic repository.
import { spawnSync } from 'node:child_process'

const args = process.argv.slice(2)
const database = process.env.BACKUP_INTEGRATION_DATABASE
if (!database?.startsWith('opusto-backup-test-')) throw new Error('Not an isolated test container')
let forwarded
if (args[0] === 'compose') {
  const command = args.slice(args.indexOf('postgres') + 1)
  if (!['pg_dump', 'pg_restore'].includes(command[0]))
    throw new Error('Unexpected PostgreSQL command')
  forwarded = ['exec', '-i', database, ...command]
} else if (
  args[0] === 'volume' &&
  args[1] === 'inspect' &&
  args[2] === 'opusto_backup_integration_media'
) {
  // A bind directory replaces the named media volume in this isolated test.
  process.exit(0)
} else if (args[0] === 'run' && args.includes('restic/restic:0.18.1')) {
  forwarded = [
    'run',
    '--network',
    'none',
    // Keep restored files and repository directories owned by the Linux CI user.
    '--user',
    `${process.getuid()}:${process.getgid()}`,
    '--env',
    'RESTIC_CACHE_DIR=/tmp/restic-cache',
    '--mount',
    `type=bind,source=${process.env.BACKUP_INTEGRATION_REPOSITORY},target=/repository`,
    ...args
      .slice(1)
      .map((value) =>
        value === 'type=volume,source=opusto_backup_integration_media,target=/media,readonly'
          ? `type=bind,source=${process.env.BACKUP_INTEGRATION_MEDIA},target=/media,readonly`
          : value,
      ),
  ]
} else {
  throw new Error('Refusing an unexpected Docker operation')
}
const result = spawnSync(process.env.BACKUP_INTEGRATION_DOCKER, forwarded, {
  stdio: 'inherit',
  env: { ...process.env, RESTIC_REPOSITORY: '/repository' },
})
process.exit(result.status ?? 1)
