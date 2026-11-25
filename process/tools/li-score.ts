// The matcher agent for LinkedIn rows as one text `claude -p` Sonnet call a role. No browser, no tools, no pay figure in the prompt.
// `score <row-id> --out <dir>` is dry: it writes the would-be extract, triage, role file, JD copy and findings into <dir> and nothing else.
// `hunt --session <R> [--ids a,b,c] [--jobs 4]` is what step 3a runs. It writes through the engine as the matcher agent does.
// A row it cannot score is a fallback and gets nothing written, so the matcher agent starts clean. The reply is untrusted input.
// Exit codes: 0 done, 1 failed, 2 usage, 3 timeout. Result lines start `LS-`.
import { spawn } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as C from '../constants.ts'
import { readDicts } from '../lib/csv.ts'
import { extractJson } from '../../server/claude.ts'
import { engine } from './ea-apply.ts'
import { checkStageData } from './ingest.ts'

const BUDGET_S = 420 // the parent's Bash call has 480 s. No new call starts after this many seconds, and the run exits 3 40 s later.
const CALL_MS = 180_000
const PARTS = { fd_30: 30, ai_25: 25, reach_20: 20, level_15: 15, stack_10: 10 } as const
const KINDS = 'primary skill|strict stack|not building|domain years'
const LANE_CHANNEL: Record<string, string> = { 'easy_apply': 'easy_apply', 'external_ats': 'external_ats' }

type Prow = Record<string, string>
type Usage = { tokens: number; seconds: number; calls: number }
class Fallback extends Error {}
const fb = (m: string) => new Fallback(m.replace(/\s+/g, ' ').slice(0, 160))
const first = (s: string) => s.split('\n')[0]
const ist = () => new Date(Date.now() + 5.5 * 3600_000).toISOString()
const norm = (s: string) => s.toLowerCase().replace(/[\s"'`‘’“”]+/g, ' ').replace(/…|\.\.\./g, ' ').trim()
const children = new Set<ReturnType<typeof spawn>>()

// ---- the prompt ------------------------------------------------------------------------------------------------

// A section runs from its heading to the next heading of the same or a higher level.
function section(text: string, heading: string): string {
  const lines = text.split('\n')
  const lvl = /^#+/.exec(heading)![0].length
  const s = lines.findIndex((l) => l.startsWith(heading))
  if (s < 0) throw new Error('no heading ' + heading)
  let e = lines.length
  for (let i = s + 1; i < lines.length; i++) { const m = /^(#+) /.exec(lines[i]); if (m && m[1].length <= lvl) { e = i; break } }
  return lines.slice(s, e).join('\n')
}
const without = (text: string, heading: string) => text.replace(section(text, heading), '')

function rules(): string {
  const instr = readFileSync(join(C.PROCESS, 'instructions.md'), 'utf8')
  const li = readFileSync(join(C.RUNNERS, 'linkedin.md'), 'utf8')
  // R1 holds Match, the decision table, Hard filters and Deal-breakers. Prelim and Naukri invites decide nothing for a LinkedIn row.
  const r1 = without(without(section(instr, '## R1: scoring'), '### Prelim'), '### Naukri invites')
  return [r1, section(instr, '## R4: matcher output'), section(li, '## Money rule')].join('\n\n')
}

const OUTSPEC = `Reply with ONE JSON object and nothing else, no code fence. Keys:
"closed": true only when the JD text itself says the posting is closed or no longer accepting applications, else false; "closed_quote": that JD line, else "";
"hard_fail": one sentence naming a hard-filter fact (R1 Hard filters) the JD states, else null; "hard_fail_quote": the JD line that states it, else "". A deal-breaker is never a hard_fail;
"fd_30","ai_25","reach_20","level_15","stack_10": integers, each within its maximum (30,25,20,15,10); "match": their sum; "semantic": integer 0-100; "evidence": the JD quotes the scores rest on;
"decision": one of "scored","dropped","wrong_job", the first row of the R1 decision table that applies. Row 3 is "dropped" with the reason \`deal-breaker <kind>: "<the JD line>"\`, <kind> being one of ${KINDS.replaceAll('|', ', ')}, the line copied word for word from the JD. Row 4 is "wrong_job". Rows 2 and 5 are settled by the script after your reply, and no other ground turns a role down: a low match or a low part score never does, and when in doubt the decision is "scored";
"reason": "" for scored, else the row's wording; "resume_variant": the id picked per R4 for a scored role, else "";
"pay_band_text": the pay band as the JD states it, else ""; "pay_band_top_usd_year": the top of a USD band in dollars a year when the JD states one with a clear period, else null; "pay_ambiguous": true when the JD states a band whose period or currency is unclear, else false;
"location_wording": the location as the JD gives it; "remote_scope": "anywhere", "country:<X>" or "none"; "work_mode": "remote", "hybrid", "onsite" or "" when neither the JD nor its Workplace type states one; "seniority"; "stack": a list of strings; "employment_type": as shown, such as "Full-time"; "country": the country of the job's location;
"jd_phrases": 3 to 6 JD quotes; "why": an object with one sentence for each of fd_30, ai_25, reach_20, level_15 and stack_10; "care": 3 to 5 short strings; "proofs": 2 to 4 strings naming projects and numbers from the portfolio; "missing": a list of {"keyword","jd_quote","evidence"} for JD terms the picked resume lacks, evidence being "yes", "no" or "partial", checked against the portfolio.
You cannot run the engine. Score only from the JD below, never from a card or a title.`

function prompt(row: Prow, jd: string, digest: string, config: string): string {
  const channel = row['channel']
  return `You are the matcher for a job search. Decide whether one role reaches the candidate. Follow the rules below exactly. No tools are available; everything you need is here.

# Configuration (thresholds are the [scores] and [reach] keys, the lists are the [deal_breakers] keys)
${config.split('\n').filter((l) => !/^(paths|\s+(REPO|PROCESS|RUNNERS|INSTRUCTIONS|CONTRACTS|SESSIONS|LEDGER|PROSPECTS|APPLIED|COMPANY_CAREERS|ATS_DOMAINS|CONTACTED|ROLES|ARTIFACTS|APPLICATIONS|LOCAL_JSON|PROFILE|INPUTS)\s)/.test(l)).join('\n')}

# Candidate profile and portfolio digest
${digest}

# Rules
${rules()}

# The role
id: ${row['id']}
channel: ${channel}
status: ${row['status']}
override: ${row['override'] ? 'yes' : 'no'}

The saved JD:
<jd>
${jd}
</jd>

# Output
${OUTSPEC}`
}

// ---- the call --------------------------------------------------------------------------------------------------

// shortcut: copied from ea-apply.ts, move to a shared module when a third script needs it. An empty temp cwd and locked flags: no tools, MCP, hooks or session file.
function claudeText(p: string): Promise<{ text: string; tokens: number }> {
  const cwd = mkdtempSync(join(tmpdir(), 'li-score-'))
  const args = ['-p', '--output-format', 'json', '--model', 'sonnet', '--tools', '', '--safe-mode', '--strict-mcp-config', '--no-chrome', '--no-session-persistence', '--disable-slash-commands']
  const env = { ...process.env }
  delete env.CLAUDE_CONFIG_DIR
  return new Promise((resolve, reject) => {
    const child = spawn('claude', args, { cwd, env, stdio: ['pipe', 'pipe', 'pipe'] })
    children.add(child)
    let out = '', err = ''
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('claude timed out')) }, CALL_MS)
    child.stdout.on('data', (d: Buffer) => { out += d })
    child.stderr.on('data', (d: Buffer) => { err += d })
    child.on('error', reject)
    child.on('close', () => {
      clearTimeout(timer); children.delete(child); rmSync(cwd, { recursive: true, force: true })
      try {
        let e = JSON.parse(out)
        if (Array.isArray(e)) e = e.find((x: { type?: string }) => x?.type === 'result') ?? e[e.length - 1]
        if (e.is_error) throw new Error(String(e.result).slice(0, 200))
        const u = e.usage ?? {}
        resolve({ text: String(e.result ?? ''), tokens: (u.input_tokens ?? 0) + (u.output_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) })
      } catch (x) { reject(new Error(`claude failed: ${(x as Error).message} ${err.slice(-120)}`)) }
    })
    child.stdin.on('error', () => { /* close reports it */ })
    child.stdin.end(p)
  })
}

// ---- the resume variant ----------------------------------------------------------------------------------------

type Variant = { id: string; pdf: string; status: string; def: boolean; sendable: boolean }
function variants(digest: string): Variant[] {
  const today = ist().slice(0, 10)
  const sec = digest.split(/^## Resume variants$/mu)[1]?.split(/^## /mu)[0] ?? ''
  return sec.split('\n').filter((l) => l.startsWith('| `')).map((l) => l.split('|').slice(1, -1).map((c) => c.trim())).filter((c) => c.length >= 6).map((c) => {
    const pdf = c[1].replaceAll('`', '')
    const ret = /^retired after (\d{4}-\d{2}-\d{2})$/u.exec(c[4])
    const live = c[4] === 'live' || (!!ret && ret[1] > today) // R4 step 2
    return { id: c[0].replaceAll('`', ''), pdf, status: c[4], def: c[5] === 'yes', sendable: live && existsSync(join(C.profileDir(), 'resume', pdf)) }
  })
}

// R4: the best fit if it can be sent, else the default row, said in the reason.
function pick(vs: Variant[], wanted: string): { id: string; file: string; note: string } {
  const w = vs.find((v) => v.id === wanted)
  if (!w) throw fb(`resume_variant "${wanted}" is not in the variants table`)
  const use = w.sendable ? w : vs.find((v) => v.def && v.sendable)
  if (!use) throw fb('no sendable resume variant')
  return { id: use.id, file: 'my-profile/resume/' + use.pdf, note: w.sendable ? '' : `variant: wanted ${w.id}, ${w.status === 'live' ? 'its PDF is missing' : w.status}; sent ${use.id}` }
}

// ---- validating the reply --------------------------------------------------------------------------------------

type Scored = {
  extract: Record<string, unknown> | null // null when the row is not `new`
  role: Prow; triage: Record<string, unknown> | null; findings: Record<string, unknown>[]; roleMd: string; stop: 'closed' | 'hard' | ''; log: string
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const int = (v: unknown, max: number): number => { if (!Number.isInteger(v) || (v as number) < 0 || (v as number) > max) throw fb('part or semantic out of range'); return v as number }
const inJd = (jdN: string, q: string) => { const n = norm(q); return n.length >= 8 && jdN.includes(n) }

function check(j: Record<string, unknown>, row: Prow, jd: string, vs: Variant[], createExtract: boolean): Scored {
  const jdN = norm(jd)
  const id = row['id']
  const roleFile = `my-sessions/ledger/roles/${id}.md`
  const ext: Record<string, unknown> = { id, role_file: roleFile, closed: false, channel: row['channel'] }
  const facts = () => {
    const wm = str(j['work_mode']), rs = str(j['remote_scope'])
    if (str(j['location_wording'])) ext['location_wording'] = str(j['location_wording'])
    if (/^(anywhere|none|country:\S.*)$/u.test(rs)) ext['remote_scope'] = rs
    if (['remote', 'hybrid', 'onsite'].includes(wm)) ext['work_mode'] = wm
    ext['pay'] = str(j['pay_band_text'])
    if (str(j['seniority'])) ext['seniority'] = str(j['seniority'])
    if (Array.isArray(j['stack'])) ext['stack'] = (j['stack'] as unknown[]).map(str).filter(Boolean)
    for (const k of ['employment_type', 'country']) if (str(j[k])) ext[k] = str(j[k])
    // the saved JD does not carry the people the page shows, so these stay null and are never guessed
    ext['poster'] = null; ext['hiring_contact'] = null
  }
  let stop: Scored['stop'] = ''
  if (j['closed'] === true) {
    if (!inJd(jdN, str(j['closed_quote']))) throw fb('closed without a JD line to quote')
    ext['closed'] = true; stop = 'closed'
  } else if (j['hard_fail'] !== null && j['hard_fail'] !== undefined && j['hard_fail'] !== false) {
    const hf = str(j['hard_fail'])
    if (!hf || hf.length > 400 || !inJd(jdN, str(j['hard_fail_quote']))) throw fb('hard_fail without a JD line to quote')
    facts(); ext['hard_fail'] = hf; stop = 'hard'
  } else { facts(); ext['hard_fail'] = null }
  if (stop && !createExtract) throw fb(`${stop} fact on a row that is not new; the matcher agent writes it`)

  const parts = Object.entries(PARTS).map(([k, max]) => [k, int(j[k], max)] as const)
  const sem = int(j['semantic'], 100)
  const match = parts.reduce((a, [, v]) => a + v, 0)
  const evidence = str(j['evidence'])
  if (!evidence) throw fb('no evidence')
  const why = (typeof j['why'] === 'object' && j['why'] !== null ? j['why'] : {}) as Record<string, unknown>
  for (const [k] of parts) if (!str(why[k])) throw fb('no why for ' + k)

  let decision = str(j['decision'])
  let reason = str(j['reason'])
  let variant = '', file: string | null = null
  const notes: string[] = []
  if (!stop) {
    if (!['scored', 'dropped', 'wrong_job'].includes(decision)) throw fb(`decision "${decision}" is not one the model may give`)
    if (decision === 'dropped') {
      const m = new RegExp(`^deal-breaker (${KINDS}): "([\\s\\S]+)"$`, 'u').exec(reason)
      if (!m || !inJd(jdN, m[2])) throw fb('dropped without a quoted deal-breaker line found in the JD')
    }
    if (decision === 'wrong_job' && !reason) throw fb('wrong_job without a reason')
    const override = row['override'] === 'yes' // R1: an override row skips decision rows 2 to 6, so the model's other decisions go to the agent
    if (override && decision !== 'scored') throw fb(`override row, model decision ${decision}`)
    if (!override && decision !== 'dropped' && decision !== 'wrong_job') {
      // row 2 and row 5 of the decision table, as the money rule says: the script compares the band so the model never sees the floor
      const top = j['pay_band_top_usd_year']
      if (top !== null && top !== undefined && (typeof top !== 'number' || !(top > 0))) throw fb('pay_band_top_usd_year is not a number')
      const amb = j['pay_ambiguous'] === true
      if (typeof top === 'number' && !amb) {
        const r = engine('pay', 'below', 'abroad', String(Math.round(top)))
        if (r.code !== 0 || !/^(below|not below)$/.test(r.out)) throw fb('pay below failed')
        if (r.out === 'below') { decision = 'skipped'; reason = `HELD: pay band below floor, band ${str(j['pay_band_text']) || 'as stated in the JD'}`; notes.push('row 2') }
      }
      if (decision === 'scored' && amb) { decision = 'skipped'; reason = `HELD: pay band ambiguous, ${str(j['pay_band_text']) || 'period or currency unclear'}`; notes.push('row 5') }
    }
    if (decision === 'scored') {
      const p = pick(vs, str(j['resume_variant']))
      variant = p.id; file = p.file; reason = [reason, p.note].filter(Boolean).join('; ')
    }
  }
  const triage = stop ? null : { id, ...Object.fromEntries(parts), match, semantic: sem, evidence, decision, reason, resume_variant: variant, resume_file: file }
  if (triage) {
    const errs = checkStageData('triage', triage) // the same checks ingest makes, with the live [scores] values
    if (errs.length) throw fb('triage fails ingest: ' + errs.join('; '))
    if (decision === 'skipped' && !reason.startsWith(C.HELD_PREFIX)) throw fb('skipped reason must start HELD:')
  }
  const ee = checkStageData('extract', ext)
  if (createExtract && ee.length) throw fb('extract fails ingest: ' + ee.join('; '))

  const missing = (Array.isArray(j['missing']) ? j['missing'] : []).slice(0, 12).map((m: Record<string, unknown>) => ({ keyword: str(m?.['keyword']), jd_quote: str(m?.['jd_quote']), evidence: str(m?.['evidence']) }))
    .filter((m) => m.keyword && m.jd_quote && ['yes', 'no', 'partial'].includes(m.evidence))
  const findings = missing.map((m) => ({ kind: 'keyword_gap', stage: 'triage', id, summary: `${m.keyword} is in the JD and not on the resume.`, proposed: { keyword: m.keyword, jd_quote: m.jd_quote, in_portfolio: m.evidence } }))
  const list = (v: unknown, n: number) => (Array.isArray(v) ? v : []).slice(0, n).map(str).filter(Boolean)
  const loc = str(j['location_wording']) || row['location']
  const mode = ['remote', 'hybrid', 'onsite'].includes(str(j['work_mode'])) ? str(j['work_mode']) : row['work_mode']
  const roleMd = `# ${row['company']} - ${row['role']}

| | |
|---|---|
| Id | ${id} |
| Source | ${row['source']} |
| Posting | ${row['link']} |
| Location and mode | ${[loc, mode].filter(Boolean).join(', ')} |
| Found | ${row['date_found']} |

## The JD in their words
${list(j['jd_phrases'], 6).map((q) => `- "${q.replace(/^"|"$/g, '')}"`).join('\n')}

## Score breakdown
| Part | Max | Given | Why |
|---|---|---|---|
${parts.map(([k, v]) => `| ${k} | ${PARTS[k as keyof typeof PARTS]} | ${v} | ${str(why[k]).replace(/\|/g, '/')} |`).join('\n')}

Match ${match}. Semantic ${sem}. ${str(j['pay_band_text']) ? `Pay band: ${str(j['pay_band_text'])}.` : 'No pay band stated.'}${stop === 'hard' ? ` Hard filter: ${str(j['hard_fail'])}` : ''}${stop === 'closed' ? ' The posting is closed.' : ''}${triage ? ` Decision ${decision}${reason ? ': ' + reason : ''}.` : ''}

## What they clearly care about
${list(j['care'], 5).map((c, i) => `${i + 1}. ${c}`).join('\n')}

## Matching proof points
${list(j['proofs'], 4).map((p) => `- ${p}`).join('\n')}

## Missing keywords
${missing.length ? `| Keyword | Evidence |\n|---|---|\n${missing.map((m) => `| ${m.keyword.replace(/\|/g, '/')} | ${m.evidence} |`).join('\n')}` : 'None found.'}

## The human
Not shown on the saved JD.

## Artifacts
@ARTIFACTS@
## History
| Date | Event |
|---|---|
@HISTORY@`
  const event = stop === 'closed' ? 'JD read from the saved guest page. Posting closed.' : stop === 'hard' ? 'JD read from the saved guest page. Hard filter failed.'
    : `JD read from the saved guest page. ${decision === 'scored' ? `Scored ${match}, resume ${variant}.` : `${decision}, match ${match}.`}`
  return { extract: createExtract ? ext : null, role: row, triage, findings, roleMd: roleMd.replace('@HISTORY@', `| ${ist().slice(0, 10)} | ${event} |`), stop, log: stop ? `m-${id}: ${stop === 'closed' ? 'posting closed' : 'hard filter'}` : `m-${id}: match ${match}, ${decision}` }
}

// ---- one row ---------------------------------------------------------------------------------------------------

type Ctx = { digest: string; config: string; vs: Variant[]; cfg: ReturnType<typeof C.cfg>; deadline: number }

function loadRow(id: string): Prow {
  const r = readDicts(readFileSync(C.PROSPECTS, 'utf8')).rows.find((x) => x['id'] === id)
  if (!r) throw fb('no prospects row')
  return r as Prow
}
const jdPath = (row: Prow): string | null => {
  const job = /\/jobs\/view\/(\d+)/u.exec(row['link'] ?? '')?.[1]
  const staged = job ? join(C.ROLES, `linkedin-${job}.jd.md`) : ''
  if (staged && existsSync(staged)) return staged
  const own = join(C.ROLES, `${row['id']}.jd.md`) // a row the matcher agent already read keeps its JD here
  return existsSync(own) ? own : null
}

// Everything up to the commit point. Throws a Fallback with nothing written.
async function score(id: string, ctx: Ctx, dry: boolean): Promise<{ s: Scored; jdFile: string; u: Usage; raw: string; prompt: string }> {
  const row = loadRow(id)
  if (row['source'] !== 'linkedin' || !LANE_CHANNEL[row['channel']]) throw fb(`not a LinkedIn lane (${row['source']} ${row['channel']})`)
  if (!dry && !['new', 'extracted'].includes(row['status'])) throw fb(`status is ${row['status']}`)
  const jdFile = jdPath(row)
  if (!jdFile) throw fb('no saved JD')
  const jd = readFileSync(jdFile, 'utf8')
  // shortcut: 200 chars, the shortest real saved guest JD is about 500; raise it if a real short JD gets sent to the agent
  if (jd.replace(/<!--[\s\S]*?-->/g, '').trim().length < 200) throw fb('JD too short')
  const p = prompt(row, jd, ctx.digest, ctx.config)
  const u: Usage = { tokens: 0, seconds: 0, calls: 0 }
  const t0 = Date.now()
  let last = '', raw = ''
  for (let a = 0; a < 2; a++) { // one retry, for a failed call or a reply that fails validation
    if (Date.now() > ctx.deadline) throw fb('time budget spent')
    u.calls++
    try {
      const r = await claudeText(p)
      u.tokens += r.tokens; raw = r.text
      const j = extractJson(r.text)
      if (typeof j !== 'object' || j === null || Array.isArray(j)) throw fb('reply is not a JSON object')
      const s = check(j as Record<string, unknown>, row, jd, ctx.vs, dry || row['status'] === 'new')
      u.seconds = (Date.now() - t0) / 1000
      return { s, jdFile, u, raw, prompt: p }
    } catch (e) { last = (e as Error).message }
  }
  throw fb(last)
}

const j1 = (o: unknown) => JSON.stringify(o, null, 1) + '\n'
function put(path: string, text: string) { mkdirSync(join(path, '..'), { recursive: true }); writeFileSync(path + '.tmp', text); renameSync(path + '.tmp', path) }

function mergeRole(path: string, md: string): string {
  const old = existsSync(path) ? readFileSync(path, 'utf8') : ''
  const art = /## Artifacts\n([\s\S]*?)\n## History/u.exec(old)?.[1]?.trim()
  const hist = /## History\n\| Date \| Event \|\n\|---\|---\|\n([\s\S]*)$/u.exec(old)?.[1]?.trim()
  const human = /## The human\n([\s\S]*?)\n## Artifacts/u.exec(old)?.[1]?.trim()
  const out = md.replace('@ARTIFACTS@\n', art ? art + '\n' : '').replace('## The human\nNot shown on the saved JD.\n', human ? `## The human\n${human}\n` : '## The human\nNot shown on the saved JD.\n')
  const at = out.lastIndexOf('\n| ')
  return (hist ? out.slice(0, at) + '\n' + hist + out.slice(at) : out).trimEnd() + '\n'
}

function writeAll(S: string | null, dir: string | null, id: string, r: Awaited<ReturnType<typeof score>>) {
  const { s } = r
  const roleMd = mergeRole(dir ? join(dir, `${id}.md`) : join(C.ROLES, `${id}.md`), s.roleMd)
  if (dir) {
    put(join(dir, `${id}.md`), roleMd)
    copyFileSync(r.jdFile, join(dir, `${id}.jd.md`))
    if (s.extract) put(join(dir, `${id}.extract.json`), j1(s.extract))
    if (s.triage) put(join(dir, `${id}.triage.json`), j1(s.triage))
    put(join(dir, `${id}.findings.json`), j1(s.findings))
    put(join(dir, `${id}.raw.txt`), r.raw)
    put(join(dir, `${id}.usage.json`), j1(r.u))
    return
  }
  const eng = (...a: string[]) => engine('--session', S!, ...a)
  put(join(C.ROLES, `${id}.md`), roleMd)
  if (r.jdFile !== join(C.ROLES, `${id}.jd.md`)) copyFileSync(r.jdFile, join(C.ROLES, `${id}.jd.md`))
  if (s.extract) put(join(S!, '.stage/extract', `${id}.json`), j1(s.extract))
  if (s.triage) put(join(S!, '.stage/triage', `${id}.json`), j1(s.triage)) // the commit point: the tick ingests it
  for (const f of s.findings) eng('finding', 'add', '--json', JSON.stringify(f))
  eng('session', 'log', s.log)
}

// ---- commands --------------------------------------------------------------------------------------------------

function context(deadline: number): Ctx {
  const d = engine('profile', 'digest'), c = engine('config')
  if (d.code !== 0 || c.code !== 0) throw new Error('profile digest or config failed')
  if (/pay\.[a-z_]+\s+\d{3,}|\$\s?\d{4,}/i.test(d.out + c.out)) throw new Error('a pay figure is in the digest or config')
  return { digest: d.out, config: c.out, vs: variants(d.out), cfg: C.cfg(), deadline }
}

async function dry(id: string, out: string, budgetS: number): Promise<number> {
  const hard = setTimeout(() => { console.log('LS-DONE timeout'); process.exit(3) }, (budgetS + 40) * 1000)
  try {
    const r = await score(id, context(Date.now() + budgetS * 1000), true)
    mkdirSync(out, { recursive: true })
    put(join(out, `${id}.prompt.txt`), r.prompt)
    writeAll(null, out, id, r)
    const t = r.s.triage
    console.log(`LS-RESULT ${id} scored ${t ? t['decision'] : r.s.stop} ${t ? t['match'] : '-'} tokens ${r.u.tokens} seconds ${r.u.seconds.toFixed(1)}`)
    return 0
  } catch (e) {
    if (!(e instanceof Fallback)) { console.error((e as Error).message); return 1 }
    console.log(`LS-RESULT ${id} fallback ${e.message}`)
    return 0
  } finally { clearTimeout(hard) }
}

async function hunt(S: string, ids: string[] | null, jobs: number, budgetS: number): Promise<number> {
  const t0 = Date.now()
  let scored = 0, fell = 0
  const hard = setTimeout(() => { for (const c of children) c.kill('SIGKILL'); console.log(`LS-DONE timeout scored ${scored} fallback ${fell}`); process.exit(3) }, (budgetS + 40) * 1000)
  try {
    const ctx = context(t0 + budgetS * 1000)
    const queue: string[] = []
    const claimedBrief = new Map<string, unknown>()
    // Without --ids the script claims as step 3a's tick does. A row it cannot work stays claimed and is printed for the parent to dispatch the matcher agent.
    const claimMore = () => {
      const r = engine('--session', S, 'session', 'next', 'matching', '--claim', '--limit', String(jobs))
      if (r.code !== 0) throw new Error('session next failed: ' + first(r.out))
      const items = JSON.parse(r.out) as { tag: string; row: Prow }[]
      for (const it of items) { queue.push(it.row['id']); claimedBrief.set(it.row['id'], it) }
      return items.length
    }
    if (ids) queue.push(...ids); else claimMore()
    const lines = (id: string, msg: string) => { console.log(msg); if (claimedBrief.has(id) && msg.includes(' fallback ')) console.log('LS-ROW ' + JSON.stringify(claimedBrief.get(id))) }
    let stopClaiming = !!ids
    const worker = async () => {
      for (;;) {
        const id = queue.shift()
        if (!id) { if (stopClaiming || Date.now() > ctx.deadline || !claimMore()) return; continue }
        try {
          const r = await score(id, ctx, false)
          writeAll(S, null, id, r)
          const t = r.s.triage
          scored++
          lines(id, `LS-RESULT ${id} scored ${t ? t['decision'] : r.s.stop} ${t ? t['match'] : '-'}`)
          console.error(`LS-USAGE ${id} tokens ${r.u.tokens} seconds ${r.u.seconds.toFixed(1)} calls ${r.u.calls}`)
        } catch (e) {
          if (!(e instanceof Fallback)) console.error(id + ' threw: ' + first((e as Error).message))
          fell++
          lines(id, `LS-RESULT ${id} fallback ${e instanceof Fallback ? e.message : 'internal error'}`)
          if (!/LinkedIn lane/.test((e as Error).message)) continue
          stopClaiming = true // a non-LinkedIn row came up: hand the rest back to the tick
        }
      }
    }
    await Promise.all(Array.from({ length: jobs }, worker))
    console.log(`LS-DONE scored ${scored} fallback ${fell}`)
    return 0
  } catch (e) {
    console.error((e as Error).message)
    for (const id of ids ?? []) console.log(`LS-RESULT ${id} fallback ${first((e as Error).message)}`) // nothing was scored, so no row is left stuck
    console.log(`LS-DONE scored ${scored} fallback ${fell}`); return 1
  } finally { clearTimeout(hard) }
}

async function main(argv: string[]): Promise<number> {
  const [cmd, arg] = argv
  const val = (n: string) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : undefined)
  const budget = Number(val('--budget') ?? BUDGET_S)
  if (cmd === 'score' && arg && val('--out')) return dry(arg, val('--out')!, budget)
  if (cmd === 'hunt' && val('--session')) {
    if (!existsSync(val('--session')!)) { console.error('usage: the session folder does not exist: ' + val('--session')); return 2 }
    const jobs = Math.min(4, Math.max(1, Number(val('--jobs') ?? 4) || 4))
    return hunt(val('--session')!, val('--ids') ? val('--ids')!.split(',').filter(Boolean) : null, jobs, budget)
  }
  console.error('usage: li-score.ts score <row-id> --out <dir> | hunt --session <R> [--ids a,b,c] [--jobs 4] [--budget <s>]')
  return 2
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(await main(process.argv.slice(2)))
