// Stands in for src/data/prep.ts in the phone build. The real module reads the profile folder with a glob.
// This one holds whatever prep.json loaded, and the helpers come from the same parser the app uses.
import type * as Real from '../../data/prep.ts'
import { blobsOf, type PrepSource } from '../../data/prepParse.ts'
import type { PrepContent } from '../../data/prepTypes.ts'

export * from '../../data/prepParse.ts'
export * from '../../data/prepPractised.ts'

let sources: PrepSource[] = []
export function setPrepContent(content: PrepContent): void { sources = [{ content, blobs: blobsOf(content) }] }
export const loadPrepSources: typeof Real.loadPrepSources = () => sources
