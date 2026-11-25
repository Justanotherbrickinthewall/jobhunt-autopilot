// Hold reasons, shared by the board, the drawer and the server. It imports nothing, so Vite and Node both load it.
// The apply stage writes each reason with a type prefix (ACCOUNT:, DOMAIN: and so on), and ingest copies them into
// the ledger notes as `held: <reason>; <reason>`. A reason with no known type is free text, usually a question the
// answer bank cannot answer. R10 in process/instructions.md says what settles each type.

export type HoldKind = 'account' | 'signin' | 'domain' | 'captcha' | 'checkpoint' | 'staffing' | 'consent'
  | 'duplicate' | 'resume' | 'blocked' | 'question' | 'failed' | 'stopped'

// `open` opens a page in the pinned Chrome, `sent` records a form the candidate sent by hand and `answer` drafts a
// faq.md row. Rerun and Drop are not listed: the drawer adds them by status.
export type Fix = { action: 'open' | 'sent' | 'answer'; label: string }

export const INFO: Record<HoldKind, { label: string; step: string; fixes: Fix[] }> = {
  account: { label: 'Needs an account', step: 'Click Open sign-up page and make the account yourself in the pinned Chrome. Then click Rerun.', fixes: [{ action: 'open', label: 'Open sign-up page' }] },
  signin: { label: 'Needs a sign-in', step: 'Click Sign in and sign in yourself in the pinned Chrome. Then click Rerun.', fixes: [{ action: 'open', label: 'Sign in' }] },
  domain: { label: 'Site not allowed', step: 'Click Open site and allow Claude in Chrome on that site yourself. Then click Rerun.', fixes: [{ action: 'open', label: 'Open site' }] },
  captcha: { label: 'Captcha', step: 'Click Open form, solve the captcha and submit the form yourself. Then click I sent it.', fixes: [{ action: 'open', label: 'Open form' }, { action: 'sent', label: 'I sent it' }] },
  checkpoint: { label: 'LinkedIn check', step: 'Click Open LinkedIn and clear the security check yourself. Then click Rerun.', fixes: [{ action: 'open', label: 'Open LinkedIn' }] },
  staffing: { label: 'Staffing agency', step: 'Click Rerun to apply through the agency, or Drop to skip the role.', fixes: [] },
  consent: { label: 'Extra consent box', step: 'Click Rerun to accept the extra consent box, or Drop to skip the role.', fixes: [] },
  duplicate: { label: 'Duplicate listing', step: 'Keep the other listing and drop this one with Drop.', fixes: [] },
  resume: { label: 'Resume claim', step: 'Fix the resume with /profile and click Rerun, or click Drop.', fixes: [] },
  blocked: { label: 'Agent blocked', step: 'Click Rerun to try again. The click approves each step up to the submit.', fixes: [] },
  question: { label: 'Needs your answer', step: 'Click Answer. Save and rerun adds your answer to the answer bank and tries again.', fixes: [{ action: 'answer', label: 'Answer' }] },
  failed: { label: 'Run failed', step: 'Click Rerun to try again now, or leave it for the next hunt.', fixes: [] },
  stopped: { label: 'Run stopped', step: 'Check the employer site or your email. If the form went through, click I sent it. If not, click Rerun, or Drop.', fixes: [{ action: 'sent', label: 'I sent it' }] },
}

// The open fix pages, and the kinds a Rerun click settles in the go-ahead.
export const OPEN_KINDS: ReadonlySet<HoldKind> = new Set(['account', 'signin', 'domain', 'captcha', 'checkpoint'])
export const RERUN_SETTLES: ReadonlySet<HoldKind> = new Set(['staffing', 'consent', 'blocked'])
// A duplicate is never rerun: a second listing of one opening could be sent twice.
export const NO_RERUN: ReadonlySet<HoldKind> = new Set(['duplicate'])

// Ledger statuses. A rerun works an unsubmitted row, and Start now is a rerun of a row no matcher has scored. A spent row is never sent again.
export const RERUNNABLE: ReadonlySet<string> = new Set(['new', 'extracted', 'held', 'blocked_info', 'ready', 'scored'])
export const UNREAD: ReadonlySet<string> = new Set(['new', 'extracted'])
// A scored or ready row is part-way through a run, so its button reads Resume, not Rerun.
export const RESUME: ReadonlySet<string> = new Set(['scored', 'ready'])
// The statuses `ingest skip` accepts. Nothing in the engine picks up `queued`, so Drop is its only way out.
export const OPEN: ReadonlySet<string> = new Set([...RERUNNABLE, 'queued'])
export const HELD: ReadonlySet<string> = new Set(['held', 'blocked_info'])
export const SPENT: ReadonlySet<string> = new Set(['applied'])

// A board row in one of these lanes waits for the candidate (held) or for the next hunt (blocked).
export const HOLD_LANES: ReadonlySet<string> = new Set(['held', 'blocked'])

const PREFIXES = 'ACCOUNT|DOMAIN|CAPTCHA|CHECKPOINT|STAFFING|CONSENT|DUPLICATE|STOPPED'
const TYPE = new RegExp(`^(${PREFIXES})(?::\\s*|(?=\\s+at\\s))`, 'u')
// heldReasons in process/tools/session.ts joins an apply file's reasons and its question with `; `. A URL holds no
// space, so splitting on `;` plus whitespace never cuts one.
const SPLIT = /;\s+/u
const BANK = /faq\.md|\bbank\b|\banswer|\bquestion|\?/iu

// With no `resume:` fragment, the last fragment is the best guess at the reason.
function untagged(notes: string[]): string[] {
  const i = notes.findLastIndex((f) => f.startsWith('resume:'))
  return (i < 0 ? notes.slice(-1) : notes.slice(i + 1)).filter(Boolean)
}

// The reasons a held or blocked row waits. A session board keeps the text cut to 160 characters, so the ledger
// wins. A blocked row has its failure in the board note as `apply failed: <why>`.
export function holdReasons(column: string, ledgerNotes: string, boardNote: string, ledgerHeld = false): string[] | null {
  if (!HOLD_LANES.has(column)) return null
  const fragments = (note: string) => note.split(' | ').map((f) => f.trim())
  if (column === 'blocked') {
    const failed = fragments(boardNote).filter((f) => f.startsWith('apply failed:')).map((f) => f.slice('apply failed:'.length).trim())
    return failed.length ? failed : boardNote.trim() ? [boardNote.trim()] : []
  }
  // The last `held:` fragment is the current hold: an earlier one was released and held again.
  const held = [ledgerNotes, boardNote].map((n) => fragments(n).filter((f) => f.startsWith('held:')).pop()).find(Boolean)
  // An older held row has no `held:` fragment, so its reasons are the fragments after its last `resume:` one.
  const parts = held ? held.slice('held:'.length).split(SPLIT).map((r) => r.trim()).filter(Boolean) : ledgerHeld ? untagged(fragments(ledgerNotes)) : []
  // The apply file's question repeats a reason, so a part that an earlier part already contains is dropped.
  const reasons = parts.filter((r, i) => !parts.slice(0, i).some((p) => p.toLowerCase().includes(r.toLowerCase())))
  // `ingest hold` writes one reason that can hold `; `, so untyped text that names no bank question continues the reason before it.
  return reasons.reduce<string[]>((out, r) => {
    if (out.length && !BANK.test(r) && classify(r, false).kind === 'question') out[out.length - 1] += `; ${r}`
    else out.push(r)
    return out
  }, [])
}

export type Hold = { kind: HoldKind; text: string; raw: string }

export function classify(raw: string, blocked: boolean): Hold {
  if (blocked) return { kind: 'failed', text: raw, raw }
  const m = TYPE.exec(raw)
  if (m) {
    const text = raw.slice(m[0].length).trim()
    const kind: HoldKind = m[1] === 'ACCOUNT' ? (/session lapsed/iu.test(text) ? 'signin' : 'account') : (m[1].toLowerCase() as HoldKind)
    return { kind, text, raw }
  }
  if (/classifier|timed out/iu.test(raw)) return { kind: 'blocked', text: raw, raw }
  if (/work-portfolio\.md|resume (?:keeps|claim)/iu.test(raw)) return { kind: 'resume', text: raw, raw }
  return { kind: 'question', text: raw, raw }
}

const http = (u: string): string | null => {
  try { const p = new URL(u); return p.protocol === 'https:' || p.protocol === 'http:' ? p.href : null } catch { return null }
}

// The page an open button shows. Only http(s) URLs pass; anything else is null and the button is refused.
export function urlFor(h: Hold, link: string): string | null {
  if (h.kind === 'account' || h.kind === 'signin') {
    const m = /sign up at (https?:\/\/\S+)/iu.exec(h.text)
    return http(m ? m[1].replace(/[.,;)]+$/u, '') : link)
  }
  if (h.kind === 'domain') {
    const d = /^([a-z0-9-]+(?:\.[a-z0-9-]+)+)/iu.exec(h.text)
    return d ? http(`https://${d[1]}/`) : null
  }
  if (h.kind === 'checkpoint') return http(/^https:\/\/(?:[a-z]+\.)?linkedin\.com\//iu.test(link) ? link : 'https://www.linkedin.com/feed/')
  if (h.kind === 'captcha') return http(link)
  return null
}

// The site a wall names, with no fallback to the row link: the host after "at", a URL's host, or the host a DOMAIN
// reason starts with. Retro groups by it, and openFix marks every row held at it.
const HOST = /(?:^|\bat\s+|https?:\/\/)((?:[a-z0-9-]+\.)+[a-z]{2,})/iu
export const hostIn = (text: string): string | null => HOST.exec(text)?.[1].toLowerCase() ?? null

// Every email address in a text, replaced, so no screen shows one.
export const maskEmail = (s: string): string => s.replace(/[^\s;,<>()]+@[^\s;,<>()]+\.[^\s;,<>()]+/gu, 'an email address')

// Rule 8 backstop for text the screen shows from mail and notes: a line that talks about pay is replaced whole.
const PAY_LINE = /\b(?:pay|salary|ctc|lpa|compensation|lakhs?|lacs?|inr|usd|rs)\b|[₹$]/iu
export const maskPay = (text: string): string => text.split('\n').map((l) => (PAY_LINE.test(l) ? 'One line about pay is hidden here.' : l)).join('\n')

const FILES: [RegExp, string][] = [[/\bfaq\.md\b/giu, 'the answer bank'], [/\bprofile\.md\b/giu, 'your profile'], [/\bwork-portfolio\.md\b/giu, 'your portfolio']]
const TAG = new RegExp(`^\\s*(?:QUESTION|${PREFIXES})\\s*:\\s*`, 'iu')

// The applier's reason text for the candidate: one clause per line, with no type tag, URL, file name, HTTP call or email address.
// shortcut: a clause that still names a file or a call is dropped whole; the full text stays in the drawer's history.
export function plainLines(raw: string): string[] {
  const lines = raw.split(/\n|;\s+/u).map((l) => {
    let t = maskEmail(l).replace(TAG, '').replace(/,?\s*sign up at https?:\/\/\S+/giu, '').replace(/\bhttps?:\/\/([^\s/]+)\S*/giu, '$1')
    for (const [re, to] of FILES) t = t.replace(re, to)
    return t.trim()
  })
  return [...new Set(lines.filter((l) => l !== '' && !/\.(?:md|json|toml|csv)\b|\b(?:GET|POST|PUT|HTTP)\b|apply-workflow/u.test(l)))]
}
