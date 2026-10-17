// Fake Healthchecks transport: no real network requests or real ping URLs.
import { appendFileSync, existsSync, readFileSync, readdirSync } from 'node:fs'

const args = process.argv.slice(2)
const config = readFileSync(0, 'utf8')
const match = /^url = "(.*)"\n$/.exec(config)
if (!match) throw new Error('Expected one URL in curl stdin config')
const url = match[1].replace(/\\([\\"])/g, '$1')
appendFileSync(
  process.env.BACKUP_TEST_LOG,
  `${JSON.stringify({ args, notification: url, cleaned: !existsSync(`${process.env.DEPLOY_DIR}/staging`) || readdirSync(`${process.env.DEPLOY_DIR}/staging`).length === 0 })}\n`,
)
// Simulate curl printing a sensitive URL: this must be suppressed by the wrapper.
process.stderr.write(`curl transport failure at ${url}\n`)
const scenario = process.env.BACKUP_TEST_HTTP_SCENARIO
process.stdout.write(scenario === 'redirect' ? '302' : '200')
process.exit(scenario === 'timeout' ? 28 : scenario === 'error' ? 22 : 0)
