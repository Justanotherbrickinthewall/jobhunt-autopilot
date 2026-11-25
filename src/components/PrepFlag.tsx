import { Spark } from './ui.tsx'
import { FLAG_LABEL, FLAG_TONE, flagTitle, questionConfidence } from '../data/prepConfidence.ts'

// The confidence flag draws Retro's Kind pill (the Chip markup) here, because Chip.tsx pulls in format.ts, which the phone scan rejects. Only the flag carries colour.
export function QuestionFlag({ id }: { id: string }) {
  const c = questionConfidence(id)
  return (
    <>
      <span className={`tag tone-${FLAG_TONE[c.flag]} small`} title={flagTitle(c)}>{FLAG_LABEL[c.flag]}</span>
      {c.move !== 0 && <span className="muted"> {c.move > 0 ? 'up' : 'down'} {Math.abs(c.move)}</span>}
    </>
  )
}

// One muted line under the title. With no pass it is absent.
export function PassLine({ id }: { id: string }) {
  const c = questionConfidence(id)
  if (c.passes === 0) return null
  return (
    <p className="pd-note pass-line">
      {c.passes} {c.passes === 1 ? 'pass' : 'passes'}, latest {c.latest} of 10{c.passes > 1 && c.move !== 0 ? `, ${c.move > 0 ? 'up' : 'down'} from ${c.first}` : ''}
      {c.scores.length > 1 && <Spark values={c.scores} label={`Pass scores: ${c.scores.join(', ')}`} />}
    </p>
  )
}
