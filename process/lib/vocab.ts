// Ledger statuses and board lanes at engine commit 85a71e6. constants.ts re-exports the sets; the
// dashboard imports everything. STATUSES and LANES hold every legacy value too.
export const STATUSES: ReadonlySet<string> = new Set([
  'new', 'extracted', 'ready', 'scored', 'queued', 'applied', 'skipped', 'wrong_job',
  'held', 'blocked_info', 'dropped',
])
// `blocked_info` is the older name for `held`. One row may still carry it; nothing new writes it.
export const HELD_STATUSES: ReadonlySet<string> = new Set(['held', 'blocked_info'])
export const LANES: readonly string[] = [
  'swept', 'matching', 'matched', 'tailoring', 'tailored', 'applying', 'sent', 'held',
  'dropped', 'blocked',
]
// A lane only an old board carries. validate accepts it on a closed session.
export const LEGACY_LANES: ReadonlySet<string> = new Set(['ready_to_send'])

// Legacy value -> the column that holds its current equivalent. Only the dashboard uses it.
const LEGACY_STATUS = new Map<string, string>([['blocked_info', 'held']])
export const currentStatus = (status: string): string => LEGACY_STATUS.get(status) ?? status
