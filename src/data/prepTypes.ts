// Types for the interview-prep content behind the dashboard's Prep tab.
//
// Content lives as JSON in my-profile/interview-prep/:
//   meta.json      PrepMeta: tab order, titles, categories and the batch file list
//   glossary.json  GlossaryFile
//   <batch>.json   PrepBatchFile, one per writer batch
// A tab's categories may be filled from more than one batch file. The loader merges
// questions into the category structure meta.json declares, in meta.json's order.
//
// Nothing here names a candidate. Plain type aliases only, because erasableSyntaxOnly is on.

// ---------- Shared vocabularies ----------

// How strongly a fact is evidenced. Same meaning as the profile files' tags.
export type AuthorityTag = 'stated' | 'artefact' | 'ours'

// What the candidate may claim. 'built' only where the portfolio shows they built it.
export type Confidence = 'built' | 'evaluated' | 'understand'

// Where a question's wording came from, against the source document.
export type Provenance = 'kept-verbatim' | 'reworded' | 'new'

// One piece of evidence behind a claim. `source` is a repo-relative path, optionally with a
// section anchor, e.g. 'my-profile/work-portfolio.md#numbers-that-may-be-quoted'.
export type PrepEvidence = {
  text: string
  tag: AuthorityTag
  source: string
}

// Set when the profile has nothing to support an answer. The answer then says "No evidence yet".
export type NoEvidence = {
  note: string
  prepare: string[] // what the candidate should prepare or confirm
}

// One labelled paragraph of a spoken answer, e.g. { label: 'Where it broke', text: '...' }.
export type AnswerPoint = {
  label: string
  text: string
}

// A nested follow-up or gotcha. Follow-ups nest to any depth.
export type FollowUp = {
  question: string
  answer: string
  remember?: string
  trap?: string
  evidence?: PrepEvidence[]
  followUps?: FollowUp[]
}

// ---------- Questions ----------

// Fields every question carries, whatever its tab.
export type QuestionBase = {
  id: string // stable, '<tab>-<nnn>', e.g. 'tech-012'. Also the practised-checkbox key
  question: string
  provenance: Provenance
  sourceRef?: string // the source item it came from, e.g. 'Technical A3'
  confidence: Confidence | null // null only on coaching, HR and quick-reference items
  searchTerms?: string[] // extra keywords for search beyond the visible text
  simple?: string // the plain-language explanation box, 2 to 4 sentences
  answer: AnswerPoint[] // the spoken answer points, in order
  remember?: string // the one-line memory hook
  projectTags: string[]
  toolTags: string[]
  steer?: string // the steering hook: a line that moves the interviewer to stronger ground
  trap?: string // what not to say
  followUps: FollowUp[]
  evidence: PrepEvidence[] // empty only when noEvidence is set
  noEvidence?: NoEvidence
  checks?: string[] // facts tagged 'ours' or caveated, for the candidate to confirm before use
}

// Technical, Cloud and FDE-practice questions use the base shape as it is.
export type StandardQuestion = QuestionBase & { kind: 'standard' }

export type NarrativeQuestion = QuestionBase & {
  kind: 'narrative'
  throughLine?: string
  deliveryTip?: string
}

export type ProjectSection =
  | 'overview'
  | 'architecture'
  | 'decisions'
  | 'challenges'
  | 'deep-dive'
  | 'numbers'
  | 'gotchas'

export type MetricLine = {
  text: string
  evidence: PrepEvidence
}

export type MetricGroup = {
  title: string // e.g. 'Scale', 'Delivery', 'Quality'
  lines: MetricLine[]
}

// Gotcha questions go in followUps, each with its own trap.
export type ProjectQuestion = QuestionBase & {
  kind: 'project'
  section: ProjectSection
  metrics?: MetricGroup[] // only on the 'numbers' section
}

export type Star = {
  situation: string
  task: string
  action: string
  result: string
}

// When noEvidence is set, star is omitted and the answer explains what to prepare.
export type BehaviouralQuestion = QuestionBase & {
  kind: 'behavioural'
  theme: string
  variations: string[] // other phrasings of the same prompt
  star?: Star
  deliveryTip?: string
}

export type ScenarioQuestion = QuestionBase & {
  kind: 'scenario'
  scenario: string // the problem as the interviewer states it
  testing: string // what they are really testing
  structure: string // the shape of a good response
  keyPhrases: string[]
}

export type ClarifyingQuestion = {
  question: string
  why: string
}

export type DesignStep = {
  title: string
  text: string
}

export type DesignQuestion = QuestionBase & {
  kind: 'design'
  problem: string
  clarifying: ClarifyingQuestion[]
  steps: DesignStep[] // requirements, architecture, data flow, key component, scaling, evaluation
  whiteboard: string // the architecture diagram described in prose
  tradeOffs: DesignStep[]
}

export type HrQuestion = QuestionBase & {
  kind: 'hr'
  redFlags: string[]
  variations: string[]
}

export type TrendQuestion = QuestionBase & {
  kind: 'trend'
  whatItIs: string
  opinion: string
  cvConnection: string // says plainly whether it was used in shipped work
  example?: string
  ifAskedUsed: string // the honest answer to "Have you used this?"
}

export type ScriptLine = {
  say: string
  effect: string
}

export type CoachingBlock = {
  heading: string
  text?: string
  items?: string[]
  scripts?: ScriptLine[]
}

// Coding and Tactics items. These are preparation notes, not questions to answer.
export type CoachingQuestion = QuestionBase & {
  kind: 'coaching'
  blocks: CoachingBlock[]
}

export type PrepQuestion =
  | StandardQuestion
  | NarrativeQuestion
  | ProjectQuestion
  | BehaviouralQuestion
  | ScenarioQuestion
  | DesignQuestion
  | HrQuestion
  | TrendQuestion
  | CoachingQuestion

// ---------- Quick reference ----------

export type CardTone = 'neutral' | 'remember' | 'steer' | 'trap' | 'tip'

export type QuickRefCard = {
  id: string // 'qr-<nnn>'
  title: string
  tone: CardTone
  lines: string[]
  evidence?: PrepEvidence[]
}

// ---------- Files ----------

// 'flat' tabs hold one category whose header the UI hides.
export type TabLayout = 'categories' | 'flat' | 'cards' | 'glossary'

export type PrepCategoryMeta = {
  id: string
  title: string
  purpose?: string
}

export type PrepTabMeta = {
  id: string // the id prefix its questions use, e.g. 'tech'
  title: string
  purpose: string // the one-line section header
  layout: TabLayout
  categories: PrepCategoryMeta[] // empty for 'cards' and 'glossary' tabs
}

// meta.json
export type PrepMeta = {
  version: 1
  title: string
  subtitle: string
  updated: string // ISO date
  tabs: PrepTabMeta[] // in display order
  files: string[] // batch file names to load, e.g. ['projects.json', 'story.json']
}

export type PrepCategoryContent = {
  tabId: string
  categoryId: string
  questions: PrepQuestion[] // in display order
}

// <batch>.json
export type PrepBatchFile = {
  version: 1
  batch: string // e.g. 'B1'
  categories: PrepCategoryContent[]
  cards?: QuickRefCard[] // only the batch that owns the quick-reference tab
}

export type GlossaryTerm = {
  id: string // 'gl-<slug>'
  term: string
  gloss: string // five words or so, shown beside the term
  oneLine: string
  meaning: string
  example: string
  whyItMatters: string
  tags: string[]
  onYourCv?: {
    text: string
    evidence: PrepEvidence[]
  }
  related?: string[] // other term ids
}

export type GlossaryGroup = {
  id: string
  title: string
  terms: GlossaryTerm[]
}

// glossary.json
export type GlossaryFile = {
  version: 1
  groups: GlossaryGroup[]
}

// ---------- Merged view the Prep tab renders ----------

export type PrepCategory = PrepCategoryMeta & {
  questions: PrepQuestion[]
}

export type PrepTab = Omit<PrepTabMeta, 'categories'> & {
  categories: PrepCategory[]
  cards: QuickRefCard[]
}

export type PrepContent = {
  meta: PrepMeta
  tabs: PrepTab[]
  glossary: GlossaryFile | null
  problems: string[] // load or merge errors, shown in the UI rather than thrown
}
