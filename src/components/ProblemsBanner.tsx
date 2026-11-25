// Rows or files that could not be read. The rest of the board still renders.
const DEFAULT_LABEL = (n: number) => `${n} ${n === 1 ? 'row or file' : 'rows or files'} could not be read`

export function ProblemsBanner({ problems, label = DEFAULT_LABEL }: { problems: string[]; label?: (n: number) => string }) {
  if (problems.length === 0) return null
  return (
    <details className="banner">
      <summary>
        <span className="warn-mark" aria-hidden="true">!</span>
        <span className="grow">{label(problems.length)}</span>
        <span className="muted banner-toggle">Details</span>
      </summary>
      <ul>{problems.map((p, i) => <li key={`${p}-${i}`}>{p}</li>)}</ul>
    </details>
  )
}
