import type { InterviewQuestion } from "../types";

// Chapter 11 questions. Ids are agents-cNN-qNN.
const questions: InterviewQuestion[] = [
  {
    id: "agents-c11-q01",
    course: "agents",
    category: "orchestration",
    level: "core",
    chapterId: "agents-11-react-by-hand",
    question: "Walk me through how a ReAct agent works, and what your code does at each step.",
    idealAnswer:
      "ReAct is a loop with three moves: think, act and observe. The model returns a short thought and a tool call, or a final answer. My code reads the reply and checks its shape. If it is a tool call, my code runs the tool and appends the result to the message list as an observation. Then it calls the model again. The model never runs anything. It only writes text that names a tool and its arguments. The loop ends when the model returns an answer, or when my code stops it. I always add two stops of my own. One is a step budget, which caps the number of model calls. The other is a check for a repeated identical tool call. Without them, a model that never answers runs and bills for ever. On the PEP desk, the walrus question takes two lookups: a search for the PEP and a version check. The model reads each result before it picks the next move. Today the tool call is a structured field, but the loop is the same.",
    keywords: ["think act observe", "tool call", "observation", "message list", "step budget", "repeated call", "final answer", "structured tool call"],
    followUps: [
      "What does the model see after the tool runs?",
      "Why keep the thought if the loop never acts on it?",
      "How does create_agent relate to the loop you described?",
    ],
  },
  {
    id: "agents-c11-q02",
    course: "agents",
    category: "reliability",
    level: "deep",
    chapterId: "agents-11-react-by-hand",
    question: "How do you stop a ReAct loop from running away, and what happens on a tool error or a malformed reply?",
    idealAnswer:
      "I use three stops. The model owns one of them, the final answer. My code owns the other two: a step budget and a repeated-call check. The budget caps model calls, and I set it just above the longest healthy run. Too low cuts off good runs, and too high lets a stuck model spend everything. The repeat check stops when the same tool is called with the same arguments twice, since a second run returns the same result. For failures, I never let them crash the loop. A tool error comes back as a string that says what went wrong and what to try, so the model can retry. A reply that does not parse, such as prose where I expect JSON, becomes a format error in the history. Then the model is asked again. Both cost a step, so the budget still bounds the cost. When the loop stops without an answer, I return a clear stop reason or fall back to a safe reply, and I log it.",
    keywords: ["step budget", "repeated call", "tool error", "format error", "observation", "stop reason", "fallback", "bounded cost"],
    followUps: [
      "What would you set the budget to, and how would you find out?",
      "What if the model keeps ignoring the error hint?",
      "How would you tell a stuck run from a long healthy one?",
    ],
  },
  {
    id: "agents-c11-q03",
    course: "agents",
    category: "orchestration",
    level: "senior",
    chapterId: "agents-11-react-by-hand",
    question: "When would you not use a ReAct agent?",
    idealAnswer:
      "I avoid ReAct when I can write the steps down in advance, when money moves, and when a rule has to hold on every run. The loop hands the model the path, and that is useful only when I can't specify the path. When I can, a fixed sequence in code is cheaper, faster, easier to test and easier to explain. A model that picks each step can pick a wrong one, skip one, or take ten steps where two would do. For money, a step budget can't undo a wrong tool call. So code must own the order and the checks, and the model can at most fill a blank or choose from a list I wrote. For compliance, I need the same checks in the same order every time, and I need to show an auditor why. So I keep the loop for open questions, such as a research lookup whose next step depends on the last result. Everything else gets a path that my code controls.",
    keywords: ["known steps", "money", "compliance", "audit", "testability", "cost", "model picks the path", "code owns the path"],
    followUps: [
      "What would you use for a refund flow instead?",
      "Where in that flow would you still use the model?",
      "How do you explain the choice to a product owner?",
    ],
  },
];

export default questions;
