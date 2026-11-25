import { linksForChapter, useLinksReady } from '../../data/links.ts'
import { WikiLine } from '../../components/WikiLinks.tsx'

// The end of a chapter: where interviews asked about it and which Prep questions practise it. Nothing shows when there are no links.
export function ChapterWiki({ chapterId }: { chapterId: string }) {
  useLinksReady()
  const { prep, asked } = linksForChapter(chapterId)
  return <div className="wiki-end"><WikiLine label="Asked in" links={asked} /><WikiLine label="Practise in Prep" links={prep} /></div>
}
