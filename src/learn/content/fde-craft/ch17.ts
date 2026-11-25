import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "fde-craft-use-case-round",
  course: "fde-craft",
  number: 17,
  title: "The one-hour use-case round",
  tagline: "Chapter sixteen ended on two timed labs. What happens when the round is a whole hour, a customer case and code you did not write?",
  minutes: 15,
  objectives: [
    "Say what the use-case round gives you and the four things it scores.",
    "Lay out the hour in six blocks, each with its cut line.",
    "Drive the tool by three rules, so the judgement stays yours.",
    "Ask three questions before the clock starts.",
    "Tag a brief and restate it in one sentence inside five minutes.",
    "Score a run on the nine lines of the scoring sheet.",
  ],
  sections: [
    {
      id: "uc-round-shape",
      title: "The use-case round gives you an hour, a customer case and code you did not write",
      goal: "What is the use-case round, and what does the interviewer score?",
      blocks: [
        {
          kind: "p",
          text: "Harbour's engagement is finished. This chapter starts a new format with a new customer, Calder Energy, which is fictional, as Harbour was.",
        },
        {
          kind: "p",
          text: "The **use-case round** is a one-hour live session that some employers run. The interviewer brings a customer case. The code is brownfield, the word chapter thirteen used for an existing system you did not write. Any LLM tool is allowed, and you must drive it.",
        },
        {
          kind: "p",
          text: "The interviewer watches four things.",
        },
        {
          kind: "list",
          items: [
            "How you break the problem down.",
            "How you reach a technical specification.",
            "How you build a prototype in the real code.",
            "How you use the tool: who decides, and who types.",
          ],
        },
        {
          kind: "p",
          text: "The case is often an enterprise that runs AI agents on its own systems and data. Calder's case is one of these.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "A fast tool makes a weak round look busy",
          text: "Claude can produce a lot of code in an hour. Code only scores when you chose what it does, so a run that never asks a question loses marks on three of the four.",
        },
        {
          kind: "p",
          text: "An hour is short, so it needs a plan you know by heart.",
        },
      ],
    },
    {
      id: "uc-the-hour",
      title: "The hour runs in six blocks, and each block has a cut line",
      goal: "How do I spend the sixty minutes?",
      blocks: [
        {
          kind: "p",
          text: "**The hour** is the name for the round's clock and the plan that fills it. It has six blocks in a fixed order: Listen, Discover, Specify, Build, Walk and Close.",
        },
        {
          kind: "p",
          text: "Each block produces one thing you can show. Each also has a cut line, the smallest version you take when time runs short, as in chapter sixteen. The **run sheet** is the one page that holds all of this, and you keep it beside you.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "The run sheet: six blocks, what each one produces, what Claude does, and the cut line. The three rules sit underneath.",
          code: `| Minutes | Block | You produce | Claude does | Cut line |
|---|---|---|---|---|
| 0 to 5 | Listen | The brief, tagged, and one sentence that restates it | Nothing | None |
| 5 to 15 | Discover | The workbook: charter, steps, exceptions, data, open questions | Maps the repository, read-only, while you ask questions | Keep three exceptions, drop the rest |
| 15 to 25 | Specify | The one-page spec with the first slice | Drafts from your workbook, and you correct it | Three acceptance criteria |
| 25 to 50 | Build | The slice running in the real code, with tests from your cases | Plans, writes tests, writes code in small steps | One path from start to finish |
| 50 to 57 | Walk | The walked scenarios and a findings list | Runs the scenario, and you read the result | Walk one scenario |
| 57 to 60 | Close | The spoken close: works, cut, open, next hour | Nothing | Never cut |

Three rules run under every block.

1. Say it first, check it second. The learner states the breakdown, the letter or the design aloud, then asks Claude what is missing. Claude never produces the first version of a judgement.
2. Claude types, and the learner decides. Plans come before code. Tests come from the learner's cases with the learner's expected values. Every diff is read aloud before it is kept.
3. A gap stays a gap. An unknown is written as \`GAP\` with who could answer it. Nobody invents a value, not the learner and not Claude.`,
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Listen, minutes 0 to 5. You tag the brief and say it back in one sentence.",
            "Discover, minutes 5 to 15. You fill the workbook while Claude maps the code. The cut is three exceptions.",
            "Specify, minutes 15 to 25. Claude drafts the spec from your workbook, and you correct it. The cut is three acceptance criteria.",
            "Build, minutes 25 to 50. Claude plans, tests and codes in small steps. The cut is one path from start to finish.",
            "Walk, minutes 50 to 57. Claude runs a scenario, and you read the result. The cut is one scenario.",
            "Close, minutes 57 to 60. You say what works, what you cut, what is open and what is next. It is never cut.",
          ],
        },
        {
          kind: "p",
          text: "Build gets the most time, but it starts at minute 25. The first 25 minutes go on understanding the problem.",
        },
        {
          kind: "quiz",
          id: "fde-craft-uc17-q1",
          question: "It is minute 14. You have three exceptions in the workbook and four still blank. What do you do?",
          options: [
            "Finish all seven, because discovery matters most.",
            "Keep the three, say aloud that you are cutting the rest, and move to the spec at minute 15.",
            "Skip the spec and start building, to win the time back.",
            "Ask Claude to fill the four blank exceptions.",
          ],
          answer: 1,
          explain: "Discover's cut line is three exceptions. Taking the cut aloud keeps the hour on time and shows judgement. Skipping the spec makes the build guess, and Claude filling blanks would invent values.",
        },
        {
          kind: "p",
          text: "The run sheet ends in three rules. They decide who does what in every block.",
        },
      ],
    },
    {
      id: "uc-three-rules",
      title: "Three rules keep the judgement with you while Claude types",
      goal: "How do I use Claude without handing it the problem?",
      blocks: [
        {
          kind: "p",
          text: "You work in Claude Code, the command-line tool that lets Claude read and edit a repository. The risk is that Claude does the thinking the interviewer came to watch. Three rules stop that.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Say it first, check it second. You state the breakdown, the mechanism or the design aloud. Then you ask Claude what is missing.",
            "Claude types, and you decide. Plans come before code, and tests come from your cases with your expected values. You read every diff aloud before you keep it.",
            "A gap stays a gap. You write an unknown as `GAP`, with who could answer it. Nobody invents a value, you or Claude.",
          ],
        },
        {
          kind: "p",
          text: "The first rule shows your thinking before the tool shapes it. The second keeps you the owner of the code, as chapter ten said. The third stops a guess from turning into a fact.",
        },
        {
          kind: "callout",
          tone: "insight",
          title: "A diff read aloud is the evidence that you own it",
          text: "The interviewer cannot see inside your head. A diff kept in silence looks the same as one you never read.",
        },
        {
          kind: "quiz",
          id: "fde-craft-uc17-q2",
          question: "Claude fills in a value the customer never gave you, and it looks right. What do the three rules tell you to do?",
          options: [
            "Keep it, because it saves time.",
            "Replace it with GAP and the name of who could answer, then ask.",
            "Keep it, and note that Claude suggested it.",
            "Delete the field from the workbook.",
          ],
          answer: 1,
          explain: "A gap stays a gap. A plausible guess is the most dangerous kind, because nobody checks it later. Writing GAP with an owner turns it into a question you can ask now.",
        },
        {
          kind: "p",
          text: "The rules start working before the clock does.",
        },
      ],
    },
    {
      id: "uc-before-zero",
      title: "Three questions before minute 0 tell you what the tool may touch",
      goal: "What do I ask before the hour starts?",
      blocks: [
        {
          kind: "p",
          text: "Before the clock starts, ask the interviewer three things.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "What may be sent to the model? If the answer is nothing real, you use sample data only.",
            "May I use my own prompt files? Chapter twenty-one builds a **kit**, a folder of your own templates, prompts and Claude Code skills.",
            "Is the code supplied, or mine to start? Supplied code is read before it is changed.",
          ],
        },
        {
          kind: "p",
          text: "For Calder, the answers are sample data only, your own files allowed and the code supplied.",
        },
        {
          kind: "p",
          text: "Now the clock starts, and the interviewer gives the brief.",
        },
      ],
    },
    {
      id: "uc-listen-calder",
      title: "In five minutes you tag Calder's brief and say it back in one sentence",
      goal: "What do I do in the Listen block?",
      blocks: [
        {
          kind: "p",
          text: "Listen is the first five minutes. You write down what the interviewer says, one line at a time. You give each line a **tag**, a word for what kind of line it is: pain, constraint, fact, idea or question. Then you say the whole brief back in one sentence.",
        },
        {
          kind: "p",
          text: "Tags keep the kinds apart. A pain is what the customer loses today, and an idea is someone's guess at the fix. You can question the idea and keep the pain.",
        },
        {
          kind: "p",
          text: "Here is Calder's brief, as the interviewer says it. \"Customers keep asking the agent to move their direct debit date, and it tells them to phone us. Make it do that.\"",
        },
        {
          kind: "p",
          text: "Calder's chat agent answers balance questions today. A **direct debit** is a payment the supplier collects from the customer's bank on a fixed day each month.",
        },
        {
          kind: "p",
          text: "You write five tagged lines, two of them questions for the next block. Then you say your sentence aloud and ask, \"Have I got that right?\" The interviewer says yes.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "Calder's brief, tagged, with the one-sentence restatement. It becomes section 1 of the workbook.",
          code: `## 1 Brief
Tag every line: pain, constraint, fact, idea or question.
- [fact] Customers ask the chat agent to move their direct debit date.
- [pain] The agent tells them to phone, so every request becomes a call.
- [idea] Make the agent move the date itself.
- [question] Which rules decide whether a date may move?
- [question] How many of these calls come in today?
Restated in one sentence: A customer who asks the chat agent to move their direct debit date gets it moved there, within the rules, or is told why not and offered a person.`,
        },
        {
          kind: "p",
          text: "The brief holds one fact, one pain, one idea and two questions. The restatement adds what the brief only implies: there are rules, and a customer they refuse still needs a person.",
        },
        {
          kind: "step",
          id: "fdecraft17-s1",
          title: "Ask Claude to check the breakdown",
          text: "Only now do you turn to Claude. At minute 5, paste section 1 of your workbook into this prompt, and decide which of its questions to ask.",
          lang: "text",
          code: `P1  Check my breakdown (minute 5)
Here are my notes from the brief, tagged, and my one-sentence restatement.
Do not solve anything. Tell me which lines I tagged wrongly, and which three
questions I have not asked that would change the scope most. One line each.
<paste section 1 of the workbook>`,
          file: "workbook.md",
          expect: "One line for each tag Claude would change, with a reason, or a line saying none. Three questions, such as who owns the process, what the target is and what happens to an account in arrears. No design and no code.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next round. Section 1 of the workbook, blank.",
          code: `## 1 Brief
Tag every line: pain, constraint, fact, idea or question.
- [pain] ...
Restated in one sentence: ...`,
        },
        {
          kind: "p",
          text: "At minute 60 the interviewer scores what they saw.",
        },
      ],
    },
    {
      id: "uc-scoring-sheet",
      title: "The scoring sheet has nine lines, and seven are scored before the Build block",
      goal: "How is the hour scored, and how do I score my own practice runs?",
      blocks: [
        {
          kind: "p",
          text: "**The scoring sheet** has nine lines, and each one scores 0, 1 or 2, so the most is 18. A 0 means it did not happen, a 1 means it was late or prompted, and a 2 means on time and unprompted.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "The scoring sheet. Score each line 0, 1 or 2.",
          code: `1. Restated the brief in one sentence before solving anything.
2. Named the process, its owner and a baseline, or wrote the baseline as a gap.
3. Said what is out of scope, with a reason.
4. Gave every step a mechanism letter with a reason, and did not default to AI.
5. Asked at least three of the seven exceptions.
6. Read the existing system before changing it, and named the seam.
7. Wrote acceptance criteria a stranger can check, and named where a person stays in control.
8. Had one path running from start to finish by minute 50, with tests from their own cases.
9. Drove the tool: said it first, read each diff aloud, and closed with works, cut, open and next.`,
        },
        {
          kind: "p",
          text: "Line one belongs to Listen, and lines two to six to Discover. Line seven is the spec, and line eight the build. Line nine covers how you used the tool all hour.",
        },
        {
          kind: "p",
          text: "So seven of the nine lines are earned before the build starts at minute 25. A candidate who starts coding at minute 2 has lost most of them.",
        },
        {
          kind: "quiz",
          id: "fde-craft-uc17-q3",
          question: "A slice runs at minute 48 with tests Claude wrote and Claude's expected values. The candidate never named the process owner. Which lines lose marks?",
          options: [
            "None, because the slice runs before minute 50.",
            "Line 8 only, because the tests were not the candidate's.",
            "Line 2 for the owner, and line 8 for the tests.",
            "Line 9 only, because Claude did too much.",
          ],
          answer: 2,
          explain: "Line 8 asks for tests from the candidate's own cases, so Claude's expected values do not count. Line 2 asks for the process, its owner and a baseline. Line 9 may lose a mark too, if the candidate never read the tests aloud.",
        },
        {
          kind: "p",
          text: "Calder's brief is tagged and restated, and the clock reads minute 5. The next ten minutes fill the rest of the page. What goes on that page, and how do you fill it while the interviewer watches?",
        },
      ],
    },
  ],
  recap: [
    "The use-case round is an hour, a customer case, code you did not write and any LLM tool.",
    "The hour runs Listen, Discover, Specify, Build, Walk and Close, each with a cut line.",
    "Say it first, let Claude type while you decide, and keep every gap a gap.",
    "Before minute 0, ask about the data, your own files and the code.",
    "In Listen, tag each line of the brief and say it back in one sentence.",
    "The scoring sheet has nine lines, and seven are earned before the build.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In the use-case round I learned to run the hour in six blocks, to say each judgement before Claude checks it, and to write every unknown as a gap. I tag the brief and restate it before I touch the tool. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["fde-craft-q27"],
};

export default chapter;
