// Publishes my-phone/dist to a separate public repo that holds built files only. Not run by the build.
// It works in a fresh temp folder, so this repo's .git, its remotes and its git identity are never touched.
import { execFileSync, spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parse } from 'smol-toml'
import { DIST, OUT, PROFILE, oddEntries, treeHash, walk } from './lib.ts'
import { tokenHash } from './scan.ts'

const REPO = 'night-reading'
const AUTHOR = 'Night reading'

// git sees no identity, config, hook or template from this machine, and stamps the commit in UTC.
const CLEAN_ENV = (): NodeJS.ProcessEnv => {
  const env: NodeJS.ProcessEnv = {}
  for (const [k, v] of Object.entries(process.env)) if (!k.startsWith('GIT_')) env[k] = v
  return { ...env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', TZ: 'UTC' }
}
const run = (cmd: string, args: string[], cwd?: string, env?: NodeJS.ProcessEnv): string => execFileSync(cmd, args, { cwd, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim()

// The account the owner meant, from inputs.toml. A different gh login is refused.
function expectedLogin(): string {
  const phone = (parse(readFileSync(join(PROFILE, 'inputs.toml'), 'utf8')) as { phone?: { github_login?: unknown } }).phone
  const login = phone?.github_login
  if (typeof login !== 'string' || login.trim() === '') throw new Error('Set [phone] github_login in the profile inputs.toml before publishing.')
  return login.trim()
}

// Only an absent repo, an empty one, or one whose latest commit this script made may be overwritten, and it must be public.
function checkRepo(slug: string): void {
  if (run('gh', ['repo', 'view', slug, '--json', 'visibility', '--jq', '.visibility']).toUpperCase() !== 'PUBLIC') throw new Error('The existing repository is not public, so it will not be published to.')
  const r = spawnSync('gh', ['api', `repos/${slug}/commits?per_page=1`, '--jq', '.[0].commit.author.name // ""'], { encoding: 'utf8' })
  if (r.status === 0) {
    const name = r.stdout.trim()
    if (name === '' || name === AUTHOR) return
    throw new Error('The repository already exists and its latest commit was not made by this script, so it will not be overwritten.')
  }
  if (/HTTP 409\b/u.test(r.stderr)) return   // the API's answer for a repository with no commits
  throw new Error('The existing repository head could not be read, so it will not be overwritten.')
}

function main(): void {
  const pass = join(OUT, 'scan-pass.json')
  if (!existsSync(DIST) || !existsSync(pass)) throw new Error('There is no passed scan for my-phone/dist. Run npm run phone:build first.')
  const { sha256, tokens, files } = JSON.parse(readFileSync(pass, 'utf8')) as { sha256?: string; tokens?: string; files?: number }
  if (sha256 !== treeHash(DIST)) throw new Error('my-phone/dist has changed since the scan passed. Run npm run phone:build again.')
  if (tokens !== tokenHash()) throw new Error('The profile, git history or gh account has changed since the scan passed. Run npm run phone:build again.')
  if (oddEntries(DIST).length > 0) throw new Error('my-phone/dist holds a symlink or special file.')

  const login = run('gh', ['api', 'user', '--jq', '.login'])
  if (login.toLowerCase() !== expectedLogin().toLowerCase()) throw new Error('The gh account is not the one named in inputs.toml [phone] github_login. Run gh auth switch.')
  const slug = `${login}/${REPO}`
  if (spawnSync('gh', ['repo', 'view', slug], { stdio: 'ignore' }).status !== 0) {
    run('gh', ['repo', 'create', slug, '--public', '--disable-issues', '--disable-wiki'])
  } else checkRepo(slug)

  const env = CLEAN_ENV()
  const tmp = mkdtempSync(join(tmpdir(), 'night-reading-'))
  try {
    cpSync(DIST, tmp, { recursive: true })
    if (treeHash(tmp) !== sha256 || oddEntries(tmp).length > 0) throw new Error('The copy to publish differs from the scanned my-phone/dist.')
    run('git', ['init', '--template=', '-b', 'main'], tmp, env)
    // No ignore file of this machine applies, and a file it would have skipped is added anyway.
    run('git', ['-c', 'core.excludesFile=/dev/null', 'add', '-f', '-A'], tmp, env)
    const staged = run('git', ['ls-files', '-z'], tmp, env).split('\0').filter(Boolean).length
    if (staged !== files || staged !== walk(DIST).length) throw new Error(`Git holds ${staged} files and the scan covered ${files ?? 'an unknown number of'}, so nothing was published.`)
    run('git', ['-c', `user.name=${AUTHOR}`, '-c', 'user.email=noreply@users.noreply.github.com', '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null',
      'commit', '--no-verify', '-m', 'Publish', '-m', 'Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>'], tmp, env)
    run('git', ['-c', 'credential.helper=', '-c', 'credential.helper=!gh auth git-credential', 'push', '--no-verify', '--force', `https://github.com/${slug}.git`, 'HEAD:main'], tmp, env)
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }

  const pages = spawnSync('gh', ['api', `repos/${slug}/pages`, '--jq', '.source.branch + .source.path'], { encoding: 'utf8' })
  if (pages.status !== 0) run('gh', ['api', '-X', 'POST', `repos/${slug}/pages`, '-f', 'source[branch]=main', '-f', 'source[path]=/'])
  else if (pages.stdout.trim() !== 'main/') run('gh', ['api', '-X', 'PUT', `repos/${slug}/pages`, '-f', 'source[branch]=main', '-f', 'source[path]=/'])
  console.log(`Published. It will be at https://${login}.github.io/${REPO}/ in a minute or two.`)
}

try { main() } catch (e) { console.error(e instanceof Error ? e.message : String(e)); process.exitCode = 1 }
