import type { InterviewQuestion } from "../types";

// Chapter 14 questions. Ids are agents-c14-qNN.
const questions: InterviewQuestion[] = [
  {
    id: "agents-c14-q01",
    course: "agents",
    category: "orchestration",
    level: "core",
    chapterId: "agents-14-reflection",
    question: "What is the reflection pattern, and when would you add it to an agent?",
    idealAnswer:
      "Reflection pairs a writer with a critic. The writer drafts an answer. The critic returns a verdict, such as a pass flag and a list of issues. If it fails, the writer revises with those issues, and the loop repeats until a pass or a round cap. I add it when output quality matters more than latency and when a bad first draft is common and checkable. Examples are a cited answer, generated code, or a mail that must follow rules. I do not add it when a single call is already right, because every round costs at least two model calls. Code owns the loop, the cap and the stop rule. The critic only labels the draft as pass or fail. That makes it a workflow with a model in it, and it is easy to test because the verdict is a plain dict. On the PEP desk, a grounded check in the loop catches a draft that cites a PEP the desk doesn't hold.",
    keywords: ["writer", "critic", "verdict", "round cap", "revise", "loop", "quality over latency", "two calls per round"],
    followUps: [
      "How do you pick the round cap?",
      "What do you log so a failed loop can be debugged?",
      "When is a single well-prompted call better?",
    ],
  },
  {
    id: "agents-c14-q02",
    course: "agents",
    category: "multi-agent",
    level: "deep",
    chapterId: "agents-14-reflection",
    question: "Why not let the same model critique its own draft, and what do you do instead?",
    idealAnswer:
      "Self-refine uses one model for both roles. It is cheap and often helps with style, but the model shares its own blind spots. A fact it believes while writing, it also believes while reviewing, so it passes a confident wrong answer. I do three things instead. First, I give the critic its own prompt and its own job, such as checking each claim against evidence, and ideally a different model. Second, I put a grounded check in code for anything a lookup can settle. On the PEP desk, code calls a tool to see whether every cited PEP is on the desk. A missing PEP overrides the critic's pass. Third, I keep the verdict structured, so code can combine the critic's issues with the check's issues. A model critic is good at judgement about prose. Code is good at facts. I use each for what it does well and measure the pass rate against labelled bad drafts.",
    keywords: ["self-refine", "blind spots", "separate critic", "own prompt", "grounded check", "tool lookup", "structured verdict", "different model"],
    followUps: [
      "How would you measure whether the critic is any good?",
      "What if the critic and the writer are the same vendor's model?",
      "Which checks would you never leave to a model?",
    ],
  },
  {
    id: "agents-c14-q03",
    course: "agents",
    category: "multi-agent",
    level: "senior",
    chapterId: "agents-14-reflection",
    question: "How does a reflection loop fail in production, and how do you guard against each failure?",
    idealAnswer:
      "I see four failures. The first is a sycophantic critic that passes everything, so the loop adds cost and no quality. I guard against it by testing the critic on a set of drafts with known flaws and by adding grounded checks for facts. The second is a critic that never passes, often because it nitpicks. A hard round cap ends it. The run keeps the last draft and marks it as gave up, so a person or a fallback can take over. The third is cost. Each round is at least two calls, and the history grows, so cost climbs faster than the round count. I set the cap at two or three and stop early when a round fixes nothing. The fourth is a critic that checks only style, so facts slip through. I fix it by building the critic's prompt around claims and sources rather than tone. In Reflexion style I also keep a short memory of past failures and feed it to the next attempt.",
    keywords: ["sycophantic critic", "round cap", "gave up", "cost per round", "style-only critic", "claims and sources", "Reflexion memory", "early stop"],
    followUps: [
      "What would you alert on?",
      "How do you evaluate the loop as a whole?",
      "When would you replace the loop with a better single prompt?",
    ],
  },
];

export default questions;
