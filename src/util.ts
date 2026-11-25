// Small helpers shared by the data layer and the views.

export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// A new set with `v` added, or removed when it was already there.
export function toggleSet<T>(s: ReadonlySet<T>, v: T): Set<T> {
  const n = new Set(s)
  if (n.has(v)) n.delete(v); else n.add(v)
  return n
}

// True when a key press belongs to a text field. Checkboxes and radios are not text fields, so j and k
// keep working after the candidate ticks one.
export function isTyping(target: EventTarget | null): boolean {
  const t = target as HTMLElement | null
  return !!t?.closest?.('input:not([type=checkbox]):not([type=radio]), textarea, select, [contenteditable="true"]')
}

// The window scrolls under 900px, so a change of place must start at the top. On wider screens .scroll scrolls and the window cannot.
// The braces matter. Current Chrome returns a Promise from scrollTo, and an effect that returns one crashes React.
export function toTop(): void { window.scrollTo(0, 0) }
