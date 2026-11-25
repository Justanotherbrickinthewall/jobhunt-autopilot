import type { Card } from '../data/types.ts'
import { FitBar, SegTag, StateLabel, Tile } from './Chip.tsx'
import { laneOf } from './format.ts'
import { reasonOf } from './rows.ts'

interface Props {
  columns: { key: string; cards: Card[] }[]
  selectedId: string | null
  openId: string | null
  onOpen: (c: Card) => void
}

// A column with no cards is left out.
// A card holds the company tile, the title, the company and lane, and the score. A held card adds its one reason.
export function BoardView({ columns, selectedId, openId, onOpen }: Props) {
  return (
    <section className="board">
      {columns.filter((col) => col.cards.length > 0).map((col) => (
        <div className="column" key={col.key}>
          <h2 className="col-head">
            <StateLabel value={col.key} />
            <span className="num fr-count">{col.cards.length}</span>
          </h2>
          <div className="col-body">
            {col.cards.map((c) => {
              const reason = reasonOf(c)
              const lane = laneOf(c.source, c.channel)
              return (
                <button
                  key={c.id}
                  data-id={c.id}
                  className={`card${selectedId === c.id ? ' selected' : ''}${openId === c.id ? ' open' : ''}`}
                  onClick={() => onOpen(c)}
                >
                  <span className="who">
                    <Tile name={c.company || '?'} />
                    <span className="who-text">
                      <span className="who-name">{c.role || 'Untitled role'}</span>
                      <span className="who-sub"><span>{c.company || 'Unknown company'}</span></span>
                    </span>
                  </span>
                  <span className="card-foot">
                    <SegTag tone={lane.tone}>{lane.text}</SegTag>
                    <FitBar value={c.match} />
                  </span>
                  {reason && <span className="card-reason">{reason}</span>}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </section>
  )
}
