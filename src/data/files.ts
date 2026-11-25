// Every file the dashboard reads, loaded by Vite at dev time. Keys are repo-root paths
// such as '/my-sessions/ledger/prospects.csv'. Saving a file under these globs reloads the page.
const text = import.meta.glob<string>(
  [
    '/my-sessions/ledger/prospects.csv',
    '/my-sessions/ledger/contacted.csv',
    '/my-sessions/ledger/outreach.csv',
    '/my-profile/inputs.toml',
    '/my-sessions/*/board.csv',
    '/my-sessions/ledger/roles/*.md',
    '/my-applications/index.json',
    '/my-applications/*/jd.md',
    '/my-interviews/index.json',
    '/my-interviews/*/review.md',
    '/my-interviews/*/transcript.md',
    '/my-interviews/*/analysis.json',
    '/my-profile/interview-prep/links.json',
  ],
  { query: '?raw', import: 'default', eager: true },
)

const pdfs = import.meta.glob<string>(
  ['/my-applications/*/*.pdf', '/my-sessions/ledger/artifacts/*.pdf', '/my-profile/resume/**/*.pdf'],
  { query: '?url', import: 'default', eager: true },
)

export function readText(path: string): string | null {
  return text[path] ?? null
}

export function pdfUrl(path: string): string | null {
  return pdfs[path] ?? null
}

export function textPaths(prefix: string, suffix: string): string[] {
  return Object.keys(text).filter((p) => p.startsWith(prefix) && p.endsWith(suffix))
}
