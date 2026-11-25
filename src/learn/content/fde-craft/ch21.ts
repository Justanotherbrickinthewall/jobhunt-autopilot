import type { Chapter } from "../types";

const COMPARE = (mine: string, ref: string) =>
  `Compare my file ${mine} with the reference ${ref}.\nList only what is missing or different, one line each.\nDo not rewrite anything. Do not print the reference text.\nEnd with what you did not check.`;

const chapter: Chapter = {
  id: "fde-craft-build-your-kit",
  course: "fde-craft",
  number: 21,
  title: "Building your own kit from a blank page",
  tagline: "How do you get a kit you can use under the clock? You write it from memory, then check it against a reference.",
  minutes: 10,
  objectives: [
    "Say why a kit you rebuilt stays with you and a kit you copied does not.",
    "Write the workbook template from memory and correct it by hand.",
    "Write the run sheet and the prompts from memory.",
    "Write the five skills and the standing rules file from memory.",
    "Run a full dry run on Calder against a 60-minute timer and score it.",
  ],
  sections: [
    {
      id: "uc-why-from-memory",
      title: "A kit you rebuilt from memory is one you can use under the clock",
      goal: "Why build the kit instead of copying it?",
      blocks: [
        {
          kind: "p",
          text: "Chapters seventeen to twenty taught the hour, the workbook, the spec and the prompts. This chapter turns them into **the kit**, a folder of files you bring to a live session. The kit is your own copy of the templates, the run sheet and the prompt library.",
        },
        {
          kind: "p",
          text: "You could copy the reference folder in one minute. That would give you files and no memory of them. In the hour you have no time to read your own files. You need to know what the workbook asks without looking.",
        },
        {
          kind: "p",
          text: "So you build each file with the page closed. Recalling a thing is what makes it stay. Then Claude compares your file with the reference and lists the gaps. You fix them by hand.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "The folder you will build. The reference copy is in the labs folder under kit-reference.",
          code: `usecase-kit/
  RUNSHEET.md
  CLAUDE.md
  templates/workbook.md
  templates/spec.md
  prompts.md
  .claude/skills/uc-map/SKILL.md
  .claude/skills/uc-gaps/SKILL.md
  .claude/skills/uc-spec/SKILL.md
  .claude/skills/uc-plan/SKILL.md
  .claude/skills/uc-walk/SKILL.md`,
        },
        {
          kind: "p",
          text: "Each exercise has the same two steps. First you write the file. Then you run the comparison prompt. Claude must not rewrite anything, because a rewritten file teaches you nothing.",
        },
        {
          kind: "quiz",
          id: "fde-craft-uc21-q1",
          question: "Why does the comparison prompt tell Claude not to rewrite your file?",
          options: [
            "Rewrites take too long.",
            "You fix each gap by hand, and the fixing is the practice.",
            "Claude cannot edit files.",
            "The reference must stay secret.",
          ],
          answer: 1,
          explain: "Finding and fixing your own gap is a second act of recall. A rewrite hands you the answer and skips it.",
        },
      ],
    },
    {
      id: "uc-workbook-exercise",
      title: "Write the workbook from memory, then fix only what the comparison finds",
      goal: "How do I rebuild the workbook template?",
      blocks: [
        {
          kind: "step",
          id: "fdecraft21-s1",
          title: "Write the workbook template with the page closed",
          text: "Open a new file called templates/workbook.md. Write the seven sections, the mechanism letters and the seven exceptions. Leave every value blank. Stop when you cannot recall more.",
          file: "usecase-kit/templates/workbook.md",
          expect: "Seven numbered sections, the five mechanism letters, the seven exception rows and the open questions table, all blank.",
        },
        {
          kind: "step",
          id: "fdecraft21-s2",
          title: "Have Claude list what is missing, then fix it yourself",
          text: "Run this prompt. Read the list aloud. Then edit your file by hand, one line at a time.",
          lang: "text",
          code: COMPARE("usecase-kit/templates/workbook.md", "my-learn/labs/usecase-round/kit-reference/templates/workbook.md"),
          file: "usecase-kit/templates/workbook.md",
          expect: "A short list of single lines. An empty list means your file matches. Each line names a section, a letter or an exception.",
        },
      ],
    },
    {
      id: "uc-runsheet-exercise",
      title: "Write the run sheet and the prompts from memory, then compare",
      goal: "How do I rebuild the run sheet and the prompt library?",
      blocks: [
        {
          kind: "step",
          id: "fdecraft21-s3",
          title: "Write the run sheet and the three rules",
          text: "Write the six blocks with their minutes, what you produce, what Claude does and the cut line. Add the three rules and the three questions for before minute 0.",
          file: "usecase-kit/RUNSHEET.md",
          expect: "Six blocks that add up to 60 minutes. Three rules. Three questions about the model, your prompt files and the code.",
        },
        {
          kind: "step",
          id: "fdecraft21-s4",
          title: "Write the prompts P1 to P9 in your own words",
          text: "Write each prompt as you would paste it. Say what each does and the minute you use it. The wording may differ from the reference, but the constraints must not.",
          file: "usecase-kit/prompts.md",
          expect: "Nine prompts. Each states what Claude must not do, such as solve, fill a blank or write code.",
        },
        {
          kind: "step",
          id: "fdecraft21-s5",
          title: "Compare both files with the reference",
          text: "Run this prompt on both files. Fix the gaps by hand. A constraint you left out matters more than a word you changed.",
          lang: "text",
          code: COMPARE("usecase-kit/RUNSHEET.md and usecase-kit/prompts.md", "the same names in my-learn/labs/usecase-round/kit-reference/") +
            "\nFor prompts, report only a missing constraint, not a changed word.",
          file: "usecase-kit/prompts.md",
          expect: "A list of missing minutes, cut lines or constraints. Changed wording does not appear.",
        },
      ],
    },
    {
      id: "uc-skills-exercise",
      title: "Write the five skills and the standing rules, then check the file format",
      goal: "How do I turn the prompts into skills Claude Code can run?",
      blocks: [
        {
          kind: "p",
          text: "A **skill** is a Markdown file with a short header holding a name and a description, then the instructions. Claude Code reads project skills from a skills folder in the repository and runs one by its name. The reference folder shows the exact layout.",
        },
        {
          kind: "step",
          id: "fdecraft21-s6",
          title: "Write the standing rules file",
          text: "Write CLAUDE.md with seven rules, from memory. It starts with who drives. It ends with what Claude did not check.",
          file: "usecase-kit/CLAUDE.md",
          expect: "Seven numbered rules: never guess, never invent, plan before code, one step at a time, your cases, no new dependency, and the closing line.",
        },
        {
          kind: "step",
          id: "fdecraft21-s7",
          title: "Write the five skills",
          text: "Make one folder for each of the map, gaps, spec, plan and walk prompts. Each holds a SKILL.md with a name and a description, then the prompt as instructions.",
          file: "usecase-kit/.claude/skills/uc-map/SKILL.md",
          expect: "Five folders named uc-map, uc-gaps, uc-spec, uc-plan and uc-walk. Each description says when to use it.",
        },
        {
          kind: "step",
          id: "fdecraft21-s8",
          title: "Compare the rules and the skills with the reference",
          text: "Run this prompt, then fix by hand. Open a Claude Code session in the kit folder and type a slash and uc to see whether your skills appear.",
          lang: "text",
          code: COMPARE("usecase-kit/CLAUDE.md and usecase-kit/.claude/skills/", "the same names in my-learn/labs/usecase-round/kit-reference/") +
            "\nAlso check each SKILL.md has a name and a description.",
          file: "usecase-kit/CLAUDE.md",
          expect: "A list of missing rules or missing header lines. All five skills appear in the slash menu.",
        },
      ],
    },
    {
      id: "uc-dry-run",
      title: "A full dry run on Calder against the timer shows what the kit still lacks",
      goal: "Does the kit work for a whole hour?",
      blocks: [
        {
          kind: "p",
          text: "The last exercise uses everything. Calder is the fictional energy supplier from chapter seventeen. Its repository is the case zero lab. You run the hour in two Claude sessions, one as the interviewer and one as your working tool, as the lab's README explains.",
        },
        {
          kind: "step",
          id: "fdecraft21-s9",
          title: "Set a 60-minute timer and run the hour",
          text: "Copy the case zero repository to a scratch folder, as the README says, and copy your kit into the copy. Start the timer. Work the six blocks in order, say each cut aloud, and use only your own files. Stop at 60 minutes whatever state the code is in.",
          lang: "text",
          code: "cd my-learn/labs/usecase-round/case-0\ncat README.md",
          file: "workbook.md, spec.md and the changed code",
          expect: "A workbook, a one-page spec, a running slice with tests from your own cases, a findings list and a spoken close.",
        },
        {
          kind: "step",
          id: "fdecraft21-s10",
          title: "Score the run on the nine-line scoring sheet",
          text: "Score each line 0, 1 or 2 against the scoring sheet in `interviewer/rubric.md`. Then note which kit file you reached for too late or not at all. Fix that file by hand.",
          file: "usecase-kit/score.md",
          expect: "Nine scores, a total out of 18, and one kit file you changed because of it.",
        },
        {
          kind: "quiz",
          id: "fde-craft-uc21-q2",
          question: "At minute 50 the slice does not run. What does the run sheet say to do?",
          options: [
            "Keep building until it runs.",
            "Skip the walk and the close.",
            "Cut to one path from start to finish, walk one scenario, and give the close.",
            "Ask the interviewer for ten more minutes.",
          ],
          answer: 2,
          explain: "The close is never cut. Each earlier block has a named cut line, and the build's is one path from start to finish.",
        },
      ],
    },
    {
      id: "uc-keep-ready",
      title: "Keep the kit small, rebuilt and ready before any session",
      goal: "How do I keep the kit useful until the day?",
      blocks: [
        {
          kind: "p",
          text: "Rebuild one file each day in the week before a live session, with the page closed. Keep the folder small, because a long kit cannot be recalled. Ask the three questions first, and use only the files the session allows.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "What do you bring to a live build session, and what do you ask first?",
          text: "Open with the answer: a small kit of templates, a run sheet and prompts, and three questions. Ask what may be sent to the model, whether your own prompt files may be used, and whether the code is supplied. If files are not allowed, say you will paste the prompts by hand.",
        },
      ],
    },
  ],
  recap: [
    "Build the kit from memory, then have Claude list the gaps without rewriting, and fix them by hand.",
    "The workbook template has seven sections, five mechanism letters and seven exceptions.",
    "The run sheet has six blocks that sum to 60 minutes, three rules and three questions to ask first.",
    "Five skills and one rules file make up the rest of the kit.",
    "A timed dry run on Calder, scored on nine lines, shows which file to fix.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In building my kit I learned that recalling the files from memory is what makes them stay. I compare my version with a reference and fix the gaps by hand. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["fde-craft-q31"],
};

export default chapter;
