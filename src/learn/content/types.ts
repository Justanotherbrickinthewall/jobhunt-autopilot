// The content schema. Every course, chapter and interview question conforms to this.
// Contract details and writing rules: setup/SPEC.md.

export type CalloutTone = "insight" | "warn" | "interview" | "analogy";
export type FoldTone = "plain" | "hood" | "industry" | "dyk" | "trouble";

export type Block =
  | { kind: "p"; text: string }
  | { kind: "list"; items: string[]; ordered?: boolean }
  | { kind: "callout"; tone: CalloutTone; title: string; text: string }
  | { kind: "code"; lang: string; code: string; caption?: string }
  | { kind: "widget"; id: string; intro: string }
  | { kind: "fold"; tone: FoldTone; title: string; text: string }
  | { kind: "quiz"; id: string; question: string; options: string[]; answer: number; explain: string }
  | { kind: "compare"; caption?: string; columns: string[]; rows: string[][] }
  // A follow-along step: a checkable card with an optional command or file and the
  // output you should see. `text` is narrated; code and expect are not.
  | { kind: "step"; id: string; title: string; text: string; lang?: string; code?: string; file?: string; expect?: string };

export type Section = {
  id: string;
  title: string; // an assertion, not a topic
  goal: string;
  blocks: Block[];
};

export type LabStep = {
  title: string;
  text: string;
  code?: string;
  test?: string; // the pytest command that checks this step, such as "uv run pytest tests/x.py -k ch03_s2"
};

export type Lab = {
  title: string;
  goal: string;
  minutes: number;
  files: string[]; // paths under labs/<course>/ this lab creates or edits
  steps: LabStep[];
  verify: string; // the command that proves the lab works
};

export type Chapter = {
  id: string; // e.g. "rag-03-chunking"
  course: string; // course id
  number: number;
  title: string;
  tagline: string;
  minutes: number;
  objectives: string[];
  sections: Section[];
  lab?: Lab;
  recap: string[];
  reinforcement: string;
  interviewIds?: string[];
};

export type CourseStatus = "live" | "soon";

export type Course = {
  id: string;
  title: string;
  tagline: string;
  status: CourseStatus;
  order: number;
  colour: "accent" | "teal" | "amber" | "rose";
};

// A free-form category label. The UI only displays and filters on it, so each course
// picks its own. RAG uses: fundamentals, chunking, embeddings, retrieval, generation,
// evaluation, production, advanced, system-design. Other courses: see setup/CURRICULUM.md.
export type InterviewCategory = string;

// Where a question came from. "asked" means a real interviewer asked it; "practice" means
// it came from interview preparation. Original questions written for the app omit it.
export type InterviewSource = "asked" | "practice";

export type InterviewLevel = "core" | "deep" | "senior";

export type InterviewQuestion = {
  id: string; // e.g. "rag-q01"
  course: string;
  category: InterviewCategory;
  level: InterviewLevel;
  question: string;
  idealAnswer: string; // 120-220 words, spoken register, answer first
  keywords: string[]; // 5-10 terms a strong answer uses
  followUps: string[]; // 2-4 likely interviewer follow-ups
  chapterId?: string;
  source?: InterviewSource;
};
