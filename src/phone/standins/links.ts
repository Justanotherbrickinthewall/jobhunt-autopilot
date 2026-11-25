// Stands in for src/data/links.ts in the phone build. The real module links Prep to interviews and the profile
// folder, so the phone shows no cross links.
import type * as Real from '../../data/links.ts'

export type { Link } from '../../data/links.ts'
export const useLinksReady: typeof Real.useLinksReady = () => {}
export const learnFor: typeof Real.learnFor = () => []
export const askedIn: typeof Real.askedIn = () => []
export const linksForChapter: typeof Real.linksForChapter = () => ({ prep: [], asked: [] })
export const linksForRow: typeof Real.linksForRow = () => ({ learn: [], prep: [] })
