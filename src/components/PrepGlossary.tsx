import { useMemo, useState } from 'react'
import type { GlossaryFile, GlossaryTerm } from '../data/prepTypes.ts'
import { matches } from '../data/prep.ts'
import { Md, PrepReadingContext, type PrepReading } from './PrepQuestion.tsx'

const letterOf = (t: GlossaryTerm) => (t.term.trim()[0] ?? '#').toUpperCase().replace(/[^A-Z]/u, '#')

// Glossary terms grouped as the file groups them, filtered by the shared search box and an A-Z strip.
export function PrepGlossary({ glossary, query, blobs }: { glossary: GlossaryFile; query: string; blobs: ReadonlyMap<string, string> }) {
  const [letter, setLetter] = useState('')
  const names = useMemo(() => new Map(glossary.groups.flatMap((g) => g.terms.map((t) => [t.id, t.term] as const))), [glossary])
  const letters = useMemo(() => [...new Set(glossary.groups.flatMap((g) => g.terms.map(letterOf)))].sort(), [glossary])

  const groups = glossary.groups
    .map((g) => ({ ...g, terms: g.terms.filter((t) => (!letter || letterOf(t) === letter) && (!query.trim() || matches(blobs.get(t.id) ?? '', query))) }))
    .filter((g) => g.terms.length > 0)
  const shown = groups.reduce((n, g) => n + g.terms.length, 0)

  return (
    <div className="gloss">
      <div className="az" role="group" aria-label="Filter by first letter">
        <button aria-pressed={letter === ''} onClick={() => setLetter('')}>All</button>
        {letters.map((l) => <button key={l} aria-pressed={letter === l} onClick={() => setLetter(letter === l ? '' : l)}>{l}</button>)}
        <span className="muted num az-count">{shown} terms</span>
      </div>
      {groups.length === 0 && <div className="empty small"><p>No terms match.</p></div>}
      {groups.map((g) => (
        <section key={g.id} className="gloss-group">
          <h3>{g.title} <span className="muted num">{g.terms.length}</span></h3>
          <div className="gloss-cols">
            {g.terms.map((t) => <Term key={t.id} t={t} names={names} />)}
          </div>
        </section>
      ))}
    </div>
  )
}

function Term({ t, names }: { t: GlossaryTerm; names: Map<string, string> }) {
  const [open, setOpen] = useState(false)
  const related = (Array.isArray(t.related) ? t.related : []).map((id) => names.get(id)).filter((x): x is string => !!x)
  // An entry joins the read-along, and can be saved, only while it is open.
  const reading: PrepReading = { base: `gl-${t.id}`, ctx: { speak: open, crumb: `Prep > Glossary > ${t.term}`, kind: 'glossary', link: () => `#prep/${t.id}` } }
  return (
    <PrepReadingContext.Provider value={reading}>
      <div className={`term${open ? ' open' : ''}`} id={t.id}>
        <button className="term-head" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <b>{t.term}</b>
          {t.gloss && <span className="term-gloss muted">{t.gloss}</span>}
        </button>
        <div className="term-def">
          <div className="term-line"><Md text={t.oneLine} field="line" /></div>
          <div className="term-body">
            <Md text={t.meaning} field="meaning" />
            {t.example && <div className="term-part"><span className="pfield-label">Example</span><Md text={t.example} field="example" /></div>}
            {t.whyItMatters && <div className="term-part"><span className="pfield-label">Why it matters</span><Md text={t.whyItMatters} field="why" /></div>}
            {t.onYourCv && <div className="term-part"><span className="pfield-label">On your CV</span><Md text={t.onYourCv.text} field="cv" /></div>}
            {Array.isArray(t.tags) && t.tags.length > 0 && <div className="ptags">{t.tags.map((x) => <span key={x} className="chip tone-gray">{x}</span>)}</div>}
            {related.length > 0 && <div className="muted term-rel">Related: {related.join(', ')}</div>}
          </div>
        </div>
      </div>
    </PrepReadingContext.Provider>
  )
}
