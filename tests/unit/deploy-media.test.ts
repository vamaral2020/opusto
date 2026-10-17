import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { expect, it } from 'vitest'

it('deploys the app and runs migrations without removing volumes or touching media files', () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'opusto-deploy-test-'))
  try {
    const bin = path.join(directory, 'bin')
    mkdirSync(bin)
    const log = path.join(directory, 'commands')
    writeFileSync(path.join(directory, '.env'), 'APP_PORT=3000\nBACKUP_REQUIRED=false\n')
    writeFileSync(
      path.join(bin, 'docker'),
      `#!/bin/sh
printf '%s\\n' "$*" >> "$DEPLOY_TEST_LOG"
if [ "$1" = image ]; then
  case "$*" in
    *revision*) echo test-sha ;;
    *source*) echo https://github.com/vamaral2020/opusto ;;
  esac
fi
if [ "$1" = inspect ]; then printf '%s\\n' previous-image; fi
`,
      { mode: 0o755 },
    )
    writeFileSync(path.join(bin, 'curl'), '#!/bin/sh\nexit 0\n', { mode: 0o755 })
    execFileSync('/bin/sh', [path.resolve('ops/deploy.sh'), 'test-image', 'test-sha'], {
      env: {
        ...process.env,
        DEPLOY_DIR: directory,
        ENV_FILE: path.join(directory, '.env'),
        COMPOSE_FILE: path.resolve('compose.prod.yaml'),
        DEPLOY_TEST_LOG: log,
        PATH: `${bin}:${process.env.PATH}`,
      },
    })
    const commands = readFileSync(log, 'utf8').trim().split('\n')
    expect(commands).toHaveLength(7)
    expect(commands[1]).toContain('pull app migrate')
    expect(commands[4]).toContain('up -d postgres')
    expect(commands[5]).toContain('--profile operations run --rm migrate')
    expect(commands[6]).toContain('up -d --no-deps app')
    for (const command of commands) {
      expect(command).not.toMatch(/(?:^|\s)(?:down|volume|prune|--renew-anon-volumes)(?:\s|$)/)
    }
    expect(readFileSync(path.join(directory, '.deploy-state/current-image'), 'utf8').trim()).toBe(
      'test-image',
    )
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
