// The link graph between Interviews, Prep and Learn, built once on load. Every file behind it is optional.
// Chapter titles live in Learn's content, which is a separate chunk, so they load on first use (useLinksReady).
import { useEffect, useState } from 'react'
import { loadInterviews } from './interviews.ts'
import { readText } from './files.ts'
import { loadPrepSources, tabQuestions } from './prep.ts'

export type Link = { label: string; href: string }

let titles: Map<string, string> | null = null
let pending: Promise<void> | null = null
function loadTitles(): Promise<void> {
  pending ??= import('../learn/content/courses.ts').then((m) => { titles = new Map(m.chapters.map((c) => [c.id, c.title])) }, () => { titles = new Map() })
  return pending
}
// Call in any component that shows chapter links. It re-renders the component once the titles are in.
export function useLinksReady(): void {
  const [, set] = useState(titles !== null)
  useEffect(() => { if (!titles) void loadTitles().then(() => set(true)) }, [])
}

type Graph = {
  prepText: Map<string, string>
  prepToLearn: Map<string, string[]>
  asked: Map<string, Link[]>
  learnToAsked: Map<string, Link[]>
}
let graph: Graph | null = null
function build(): Graph {
  const prepText = new Map<string, string>()
  for (const s of loadPrepSources()) for (const t of s.content.tabs) for (const q of tabQuestions(t)) if (typeof q.question === 'string') prepText.set(q.id, q.question)
  const prepToLearn = new Map<string, string[]>()
  try {
    const raw = readText('/my-profile/interview-prep/links.json')
    for (const [id, v] of Object.entries(raw ? JSON.parse(raw) : {})) if (prepText.has(id) && Array.isArray(v)) prepToLearn.set(id, v.filter((x): x is string => typeof x === 'string'))
  } catch { /* a damaged links.json means no prep links */ }
  const asked = new Map<string, Link[]>()
  const learnToAsked = new Map<string, Link[]>()
  const push = (m: Map<string, Link[]>, k: string, l: Link) => { const a = m.get(k) ?? []; if (!a.some((x) => x.href === l.href)) a.push(l); m.set(k, a) }
  for (const i of loadInterviews().interviews) {
    const day = new Date(`${i.date}T00:00:00`)
    const when = Number.isNaN(day.getTime()) ? i.date : day.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    for (const r of i.analysis?.questions ?? []) {
      const link = { label: `${i.company}, ${when}`, href: `/#interviews/${encodeURIComponent(i.folder)}/${encodeURIComponent(r.id)}` }
      for (const p of r.prepIds) if (prepText.has(p)) push(asked, p, link)
      for (const c of r.learn) push(learnToAsked, c, link)
    }
  }
  return { prepText, prepToLearn, asked, learnToAsked }
}
const g = (): Graph => (graph ??= build())

const chapterLink = (id: string): Link | null => {
  const t = titles?.get(id)
  return t ? { label: t, href: `/learn/chapter/${id}` } : null
}
const clip = (s: string, n = 70) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)
const prepLink = (id: string): Link => ({ label: clip(g().prepText.get(id) ?? id), href: `/#prep/${encodeURIComponent(id)}` })
const real = (l: Link | null): l is Link => l !== null

export const learnFor = (prepId: string): Link[] => (g().prepToLearn.get(prepId) ?? []).map(chapterLink).filter(real)
export const askedIn = (prepId: string): Link[] => g().asked.get(prepId) ?? []
// Prep questions that point at a chapter, and interview rows that point at it.
export function linksForChapter(chapterId: string): { prep: Link[]; asked: Link[] } {
  const prep = [...g().prepToLearn].filter(([, c]) => c.includes(chapterId)).map(([id]) => prepLink(id))
  return { prep, asked: (g().learnToAsked.get(chapterId) ?? []) }
}
// For a row of an interview: its Learn and Prep links, with unresolved ids dropped.
export const linksForRow = (r: { prepIds: string[]; learn: string[] }): { learn: Link[]; prep: Link[] } =>
  ({ learn: r.learn.map(chapterLink).filter(real), prep: r.prepIds.filter((p) => g().prepText.has(p)).map(prepLink) })
