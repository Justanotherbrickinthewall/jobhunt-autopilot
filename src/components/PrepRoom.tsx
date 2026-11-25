import { useMemo } from 'react'
import type { PrepContent, PrepTab } from '../data/prepTypes.ts'
import { drillable } from '../data/prepRecall.ts'
import { moveText, sectionConfidence } from '../data/prepConfidence.ts'
import type { DrillSummary } from './PrepDrill.tsx'
import { PageHeader } from './PageHeader.tsx'
import { useCrumbs } from './crumbs.ts'

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`

function lastLine(s: DrillSummary): string {
  const { had, shaky, missed } = s.counts
  const base = `Last sitting: ${plural(had + shaky + missed, 'question')}. You had ${had}, ${shaky} ${shaky === 1 ? 'was' : 'were'} shaky and you missed ${missed}.`
  return s.before !== undefined && s.after !== undefined ? `${base} ${s.title} went from ${s.before}% to ${s.after}%.` : base
}

export function PrepRoom({ content, last, onSection, onQuick, onLedger, onBank }: {
  content: PrepContent
  last: DrillSummary | null
  onSection: (t: PrepTab) => void
  onQuick: () => void
  onLedger: (tabId?: string) => void
  onBank: () => void
}) {
  useCrumbs([{ label: 'Interview prep' }])
  const { sections, reference, overall, weakest } = useMemo(() => {
    const sections = content.tabs.filter((t) => drillable(t).length > 0).map((t) => ({ tab: t, r: sectionConfidence(drillable(t)) }))
    return {
      sections,
      reference: content.tabs.filter((t) => !sections.some((s) => s.tab === t)),
      overall: sectionConfidence(content.tabs.flatMap(drillable)),
      weakest: sections.reduce<(typeof sections)[number] | undefined>((w, s) => (!w || s.r.pct < w.r.pct ? s : w), undefined),
    }
  }, [content])

  // quickCheck takes one question from each of up to six sections.
  const quickN = Math.min(6, sections.length)
  const quickLine = `${plural(quickN, 'question')} across ${plural(quickN, 'section')}.`

  const summary = overall.tried === 0
    ? 'The meters start at zero. Take the quick check to see where you stand.'
    : `Overall confidence is ${overall.pct}%.${weakest ? ` The weakest section is ${weakest.tab.title}.` : ''}`

  return (
    <>
      <PageHeader cap="Interview prep" title="What do you want to prep for today?" sub={summary}>
        <button className="btn" onClick={() => onLedger()}>All questions</button>
      </PageHeader>
      <div className="scroll">
        <div className="prep room">
          {last && <p className="muted room-line">{lastLine(last)}</p>}
          <div className="room-quick">
            <button className="btn fill" onClick={onQuick}>Quick check</button>
            <span className="muted">{quickLine}</span>
          </div>
          <div className="room-list">
            {sections.map(({ tab, r }) => (
              <button key={tab.id} className="room-row" onClick={() => onSection(tab)}>
                <span className="room-main">
                  <span className="room-name">{tab.title}</span>
                  <span className="muted room-purpose">{tab.purpose}</span>
                  <span className="muted num room-seen">{[[r.counts.weak, 'weak'], [r.counts.shaky, 'shaky'], [r.counts.strong, 'strong'], [r.counts.none, 'not tried']].filter(([n]) => n).map(([n, w]) => `${n} ${w}`).join(', ')}</span>
                </span>
                <span className="room-meta">
                  <span className="room-gauge">
                    <span className="room-meter" aria-hidden="true"><i style={{ width: `${r.pct}%` }} /></span>
                    <span className="num room-pct">{r.pct}%</span>
                  </span>
                  {r.move !== 0 && <span className="muted num room-seen">{moveText(r.move)}</span>}
                </span>
              </button>
            ))}
            <button className="room-row room-bank" onClick={onBank}>
              <span className="room-main">
                <span className="room-name">Question bank</span>
                <span className="muted room-purpose">Questions from your courses, with browse, drill and mock</span>
              </span>
            </button>
          </div>
          {reference.length > 0 && (
            <p className="muted room-ref">
              Reference:{' '}
              {reference.map((t, i) => <span key={t.id}>{i > 0 && ', '}<button className="room-link" onClick={() => onLedger(t.id)}>{t.title}</button></span>)}
            </p>
          )}
        </div>
      </div>
    </>
  )
}
