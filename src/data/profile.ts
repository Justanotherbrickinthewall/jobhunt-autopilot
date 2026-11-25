// Loads the three profile files for the My profile tab. Files are read as raw text; a missing file is
// an empty entry, never an error.
import { stripPrivate } from './private.ts'

const files = import.meta.glob<string>(['/my-profile/profile.md', '/my-profile/work-portfolio.md', '/my-profile/faq.md'], {
  eager: true,
  query: '?raw',
  import: 'default',
})

export type ProfileFileKey = 'profile' | 'work-portfolio' | 'faq'
export type ProfileFile = { key: ProfileFileKey; label: string; name: string; path: string; source: string | null }

const FILES: { key: ProfileFileKey; label: string; name: string }[] = [
  { key: 'profile', label: 'Profile', name: 'profile.md' },
  { key: 'work-portfolio', label: 'Work portfolio', name: 'work-portfolio.md' },
  { key: 'faq', label: 'Screening answers', name: 'faq.md' },
]

export function loadProfileFiles(): ProfileFile[] {
  return FILES.map((f) => {
    const path = `my-profile/${f.name}`
    const raw = files[`/${path}`]
    return { ...f, path, source: typeof raw === 'string' ? stripPrivate(raw) : null }
  })
}
