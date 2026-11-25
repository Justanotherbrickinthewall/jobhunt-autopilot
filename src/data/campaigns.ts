// Campaigns as a view over the run folders. The server route /api/runs reads each run's notes.md and board.csv, and this file
// groups the runs by kind and lanes. Nothing here writes. A campaign is not stored anywhere yet.
import { useEffect, useState } from 'react'
import type { OpenRun, Run } from '../../server/runs.ts'
import { shortDate } from '../components/format.ts'
import { maskEmail, plainLines } from './holds.ts'
import type { Contact } from './outreach.ts'

export type { OpenRun, Run }
export type RunsData = { runs: Run[]; open: OpenRun | null; cooldownUntil: string | null }
export type CampaignKey = 'full' | 'naukri' | 'hirist' | 'remote_boards' | 'linkedin-ea' | 'linkedin-ex' | 'roles' | 'posts'

export interface Campaign {
  key: CampaignKey
  title: string
  blurb: string
  lanes: string
  command: string
  caps: string[]       // the inputs.toml keys the campaign reads; the values stay in the file
  linkedin: boolean    // the LinkedIn security cooldown stops it
  people: boolean      // its rows are people, not roles
}

export const CAMPAIGNS: readonly Campaign[] = [
  { key: 'full', title: 'Full hunt', blurb: 'Every live lane', lanes: 'Naukri, Hirist, Remote boards, LinkedIn Easy Apply and LinkedIn external', command: '/hunt', caps: ['top_choice_per_month', 'top_choice_min_match'], linkedin: false, people: false },
  { key: 'naukri', title: 'Naukri invites', blurb: 'Recruiter invites from the Naukri inbox, answered whatever the score', lanes: 'Naukri', command: '/hunt --naukri', caps: [], linkedin: false, people: false },
  { key: 'hirist', title: 'Hirist', blurb: 'Roles found by search on Hirist, applied with its one-click Apply', lanes: 'Hirist', command: '/hunt --hirist', caps: [], linkedin: false, people: false },
  { key: 'remote_boards', title: 'Remote boards', blurb: 'Remote roles from four public board feeds, any country, any time zone', lanes: 'Remote OK, Himalayas, Remotive and We Work Remotely', command: '/hunt --remote-boards', caps: ['max_rows_per_run', 'posted_within_days'], linkedin: false, people: false },
  { key: 'linkedin-ea', title: 'LinkedIn Easy Apply', blurb: 'Roles that apply inside LinkedIn', lanes: 'LinkedIn Easy Apply', command: '/hunt --linkedin-ea', caps: ['top_choice_per_month', 'top_choice_min_match'], linkedin: true, people: false },
  { key: 'linkedin-ex', title: 'LinkedIn external', blurb: 'Roles that apply on the company form', lanes: 'LinkedIn external', command: '/hunt --linkedin-ex', caps: ['top_choice_per_month', 'top_choice_min_match'], linkedin: true, people: false },
  { key: 'roles', title: 'Role contacts', blurb: 'One person at each applied or held role above the bar', lanes: 'LinkedIn people at applied and held roles', command: '/outreach --roles', caps: ['roles_match_min', 'roles_per_run', 'people_searches_per_run', 'invites_per_day', 'invites_per_week', 'max_pending_invites', 'inmail_per_month'], linkedin: true, people: true },
  { key: 'posts', title: 'Hiring posts', blurb: 'Outreach, within the prospect caps', lanes: 'LinkedIn hiring posts', command: '/outreach --posts', caps: ['invites_per_day', 'invites_per_week', 'max_pending_invites', 'inmail_per_month', 'withdraw_after_days'], linkedin: true, people: true },
]

// A run belongs to the campaign its kind and lanes name. A hunt that swept two or more lanes is the Full hunt, and one that swept a
// single lane is that lane's campaign. A hunt that swept none worked single held roles for /retro or the dashboard, and an
// outreach run that worked neither `roles` nor `posts` only answered the inbox. Neither belongs to a campaign.
function campaignOf(r: Run): CampaignKey | null {
  if (r.kind === 'outreach') return r.lanes[0] === 'roles' || r.lanes[0] === 'posts' ? r.lanes[0] : null
  if (r.lanes.length >= 2) return 'full'
  const only = r.lanes[0]
  return only === 'naukri' || only === 'hirist' || only === 'remote_boards' || only === 'linkedin-ea' || only === 'linkedin-ex' ? only : null
}

export type Status = 'Ready' | 'Running' | 'Paused'
export interface Stat {
  campaign: Campaign
  runs: Run[]            // newest first
  status: Status
  reason: string         // why it is Paused, or Never run; else the blurb
  last: Run | null
  found: number          // the last 14 days
  applied: number
  replies: number
  held: number
  days: number[]         // runs started on each of the last 14 days, oldest first
}

const DAY = 86_400_000
const ymd = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const timeOf = (iso: string): string => (iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '')
export const dayOf = (iso: string): string => shortDate(iso.slice(0, 10))

export function ago(iso: string, now = Date.now()): string {
  const min = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000))
  if (!Number.isFinite(min)) return ''
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  return min < 1440 ? `${Math.round(min / 60)} h ago` : `${Math.round(min / 1440)} d ago`
}

export function stats(d: RunsData, now = Date.now()): Stat[] {
  const from = ymd(new Date(now - 13 * DAY))
  return CAMPAIGNS.map((campaign) => {
    const runs = d.runs.filter((r) => campaignOf(r) === campaign.key)
    const recent = runs.filter((r) => ymd(new Date(r.started)) >= from)
    const sum = (f: (r: Run) => number): number => recent.reduce((n, r) => n + f(r), 0)
    const running = d.open !== null && runs.some((r) => r.name === d.open?.name)
    const paused = campaign.linkedin && d.cooldownUntil !== null && !running
    const days = Array.from({ length: 14 }, (_, i) => { const day = ymd(new Date(now - (13 - i) * DAY)); return recent.filter((r) => ymd(new Date(r.started)) === day).length })
    return {
      campaign, runs, last: runs[0] ?? null, days,
      status: running ? 'Running' : paused ? 'Paused' : 'Ready',
      reason: running ? `Started ${ago(d.open?.started ?? '', now)}` : paused ? `LinkedIn security check, until ${timeOf(d.cooldownUntil ?? '')}` : runs.length === 0 ? 'Never run' : campaign.blurb,
      found: sum((r) => r.found), applied: sum((r) => r.applied), replies: sum((r) => r.replies), held: sum((r) => r.held),
    }
  })
}

// The text of a go-ahead or a log line for the screen: one clause, no email address, cut to `max` characters.
export function plain(raw: string, max = 70): string {
  const t = maskEmail(plainLines(raw)[0] ?? '').replace(/\s+/gu, ' ').trim()
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t
}

export interface ClaudeCard { title: string; lines: string[]; open: boolean }

// The rail card: the open run and its last log line, or the last hunt, plus the LinkedIn cooldown when it runs.
export function claudeCard(d: RunsData | null): ClaudeCard {
  if (!d) return { title: 'Claude', lines: ['Checking runs'], open: false }
  const o = d.open
  if (o) {
    const title = o.kind === 'hunt' ? 'Hunt running' : o.kind === 'outreach' ? 'Outreach running' : 'Retro open'
    return { title, lines: [plain(o.last, 40), `Updated ${ago(o.updated)}`].filter(Boolean), open: true }
  }
  const hunt = d.runs.find((r) => r.kind === 'hunt' && r.lanes.length > 0)
  const lines = [hunt ? `Last hunt ${dayOf(hunt.started)}, ${timeOf(hunt.started)}` : 'No hunt yet']
  if (d.cooldownUntil) lines.push(`LinkedIn paused until ${timeOf(d.cooldownUntil)}`)
  return { title: 'No run open', lines, open: false }
}

// The server's runs, fetched on mount, on window focus and every 20 seconds. The rail card and Campaigns both read it.
export function useRuns(): { data: RunsData | null; down: boolean } {
  const [data, setData] = useState<RunsData | null>(null)
  const [down, setDown] = useState(false)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let gone = false
    fetch('/api/runs').then((r) => (r.ok ? (r.json() as Promise<RunsData>) : Promise.reject(new Error(String(r.status))))).then(
      (d) => { if (!gone) { setData(d); setDown(false) } },
      () => { if (!gone) setDown(true) }, // a failed poll keeps the last runs on screen
    )
    return () => { gone = true }
  }, [tick])
  useEffect(() => {
    const bump = () => setTick((n) => n + 1)
    const t = setInterval(bump, 20_000)
    window.addEventListener('focus', bump)
    return () => { clearInterval(t); window.removeEventListener('focus', bump) }
  }, [])
  return { data, down }
}

const squash = (t: string): string => t.toLowerCase().replace(/\s+/gu, ' ').trim()

// The people a campaign wrote to. Role contacts owns the rows that carry a role id. Hiring posts owns the other rows its runs wrote and every
// row that came from a post, because a /retro reply overwrites the row's session. A role campaign matches by company.
export function contactsOf(contacts: readonly Contact[], s: Stat, companies: readonly string[]): Contact[] {
  if (s.campaign.key === 'roles') return contacts.filter((c) => c.fromRole)
  if (s.campaign.people) {
    const names = new Set(s.runs.map((r) => r.name))
    return contacts.filter((c) => !c.fromRole && ((c.session !== '' && names.has(c.session)) || c.fromPost))
  }
  const co = new Set(companies.map(squash).filter(Boolean))
  return contacts.filter((c) => c.company !== '' && co.has(squash(c.company)))
}
