import type { MissingKeyword } from '../../process/lib/rolesMarkdown.ts'
import type { DropReason } from './drops.ts'
export type { MissingKeyword }

export interface Component { key: string; value: number | null; max: number }

export interface Card {
  id: string
  company: string
  role: string
  source: string
  channel: string
  column: string             // one of the five board columns; a value outside the vocabulary keeps its own name
  ledgerStatus: string | null
  match: number | null
  semantic: number | null
  components: Component[]
  evidence: string
  location: string
  workMode: string
  link: string
  dateFound: string
  appliedDate: string
  missing: MissingKeyword[]
  jd: string | null          // markdown
  resume: { url: string; tailored: boolean; variant?: string } | null // variant: the my-profile/resume/<folder> name of a fixed variant
  warnings: string[]
  holdReasons: string[] | null // why a held or blocked row waits, one reason each, prefix intact; null for any other row
  dropReason: DropReason | null // why a skipped, wrong_job or dropped ledger row was closed; null when it is another status or notes name no reason
  notes: string              // the ledger notes cell; Retro reads the earlier held: fragments in it
}

export interface Tally { name: string; count: number }

export interface Analytics {
  sources: Tally[]
  found: number
  swept: number
  applied: number
  avgMatch: number | null
  scoredCount: number
  missingNo: Tally[]
  missingPartial: Tally[]
  matchBins: number[]        // scored cards per band of 10: 0-9, 10-19, ... 90-100
}

export interface Board {
  view: string
  columns: { key: string; cards: Card[] }[]
  analytics: Analytics
  problems: string[]
  empty: boolean             // no ledger yet, so no hunt has run
}

export interface SessionInfo { name: string; label: string; sortKey: string; count: number }
