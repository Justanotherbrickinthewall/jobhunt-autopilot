import type { InterviewQuestion } from "../types";

// Chapter 21 questions. Ids are agents-cNN-qNN.
const questions: InterviewQuestion[] = [
  {
    id: "agents-c21-q01",
    course: "agents",
    category: "evaluation",
    level: "core",
    chapterId: "agents-21-evaluating-agents",
    question: "How do you evaluate an agent, as opposed to a single model call?",
    idealAnswer:
      "I score the path as well as the answer. An agent can reach a right answer by a bad route, such as three needless tool calls, or a lucky guess that skips the evidence. So I build a small golden set. Each case has the question and the words a right answer must hold. It also has the tool calls a right run makes, and a label for the behaviour it tests. Then I check four levels. First, is the final answer correct. Second, did it call the right tool with the right arguments. Third, does the trajectory match, in exact, in-order subset or any-order mode, depending on how much freedom I allow. Fourth, did it stay inside a budget of model calls, tool calls and tokens. Some answers a string check can't grade. For those I add an LLM judge with a written rubric, and I check it against a few cases a person has labelled. Every change then runs the set. A regression gate with a threshold per metric blocks the change and names the case that broke.",
    keywords: ["golden set", "trajectory", "tool-call accuracy", "final answer", "budget", "LLM judge", "rubric", "regression gate"],
    followUps: [
      "Why not score only the final answer?",
      "How big should the golden set be?",
      "What goes in the label on a case?",
    ],
  },
  {
    id: "agents-c21-q02",
    course: "agents",
    category: "evaluation",
    level: "deep",
    chapterId: "agents-21-evaluating-agents",
    question: "What is the difference between pass@k and pass^k, and which one do you gate an autonomous agent on?",
    idealAnswer:
      "Both repeat the same case k times. Pass@k asks whether at least one of the k runs succeeded. Pass^k asks whether all k succeeded. If one run passes with probability p, pass@k is one minus the chance that every run fails, so it climbs toward one as k grows. Pass^k is p to the power k, so it falls as k grows. At p of 0.8 and k of 5, pass@k is nearly one and pass^k is about a third. Pass@k fits a setting where a person picks the best of several attempts, like code suggestions. A back-office agent that acts on its own has no such person. Every run is the one that happens, and a single bad run can be a wrong refund or a wrong email. So I gate it on pass^k, usually over a handful of repeats per case. The cost is more runs per evaluation. So I keep the golden set small and cheap, and I run the repeats on the cases that carry risk.",
    keywords: ["pass@k", "pass^k", "repeated runs", "reliability", "autonomous", "probability", "consistency", "cost of repeats"],
    followUps: [
      "How many repeats do you run, and why that number?",
      "What causes the run-to-run variation if the prompt is fixed?",
      "How does temperature change this?",
    ],
  },
  {
    id: "agents-c21-q03",
    course: "agents",
    category: "evaluation",
    level: "senior",
    chapterId: "agents-21-evaluating-agents",
    question: "You grade answers with an LLM judge. How do you know the LLM judge itself can be trusted?",
    idealAnswer:
      "I treat the LLM judge as a model under test. First I write a rubric with anchored scores, so a five means correct and supported, and a one means wrong or invented. Then I take a few cases a person has already marked, run the LLM judge on them, and measure agreement. If it passes answers the person failed, it is too lenient. I fix the rubric before it gates anything. Raising the pass score hides the problem. It does not fix it. I also force a fixed output format, a score and a reason, and reject any reply that breaks it. The reason lets me read why a score was given. I re-run the agreement check whenever I change the model or the rubric. Where one exists, I keep a string check beside it, such as a keyword match. Then the LLM judge is never the only signal. For a high-risk case I sample its passes and read them by hand. An LLM judge that was never checked is a guess with a number attached.",
    keywords: ["rubric", "agreement", "hand-labelled", "lenient", "score and reason", "format check", "re-run on change", "string check"],
    followUps: [
      "What agreement rate is good enough?",
      "Would you use the same model for the LLM judge and the agent?",
      "How do you stop the LLM judge favouring longer answers?",
    ],
  },
];

export default questions;
