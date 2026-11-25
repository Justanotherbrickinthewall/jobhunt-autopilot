// The localStorage keys the browser mirrors to my-notebook/progress.json. The server and the browser both read
// this list, so a prefix added here is kept by both. Learn keeps its chapter and review state under fde:.
export const PROGRESS_PREFIXES = ['hunt-board:', 'fde:'] as const
// Learn follows the header's theme button, so its old theme key is never kept.
const SKIPPED: ReadonlySet<string> = new Set(['fde:theme'])

export const progressPrefix = (key: string): string | undefined =>
  SKIPPED.has(key) ? undefined : PROGRESS_PREFIXES.find((p) => key.startsWith(p))
