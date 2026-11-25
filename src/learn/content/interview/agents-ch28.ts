import type { InterviewQuestion } from "../types";

// Chapter 28 questions. Ids are agents-c28-qNN.
const questions: InterviewQuestion[] = [
  {
    id: "agents-c28-q01",
    course: "agents",
    category: "system-design",
    level: "senior",
    chapterId: "agents-28-system-design",
    question: "Design a multi-agent system for a task you have not seen before. How do you start?",
    idealAnswer:
      "I say my order first, so the interviewer can follow. I clarify the task, the users and the worst failure. Then I pick the architecture by asking who picks the next step. If I can write the steps down, I build a workflow and let the model fill blanks or pick from a fixed set. If the parts are independent, I fan them out. If the path is open, I use one tool loop with a step budget. I add a supervisor only when the work needs several specialities, and I say what a workflow could not do. After that I decide the state and its owner, keyed by a task ID. I put the rules for tools, data and actions in code. I plan a golden set and a regression gate. I key every effect so a repeat changes nothing, and give stuck runs a force-close and a sweep. I end with calls per task, latency and a monthly cost, and I state my assumptions.",
    keywords: ["clarify", "who picks the next step", "least autonomy", "workflow", "state owner", "guardrails in code", "regression gate", "idempotency", "cost"],
    followUps: [
      "Which question would change your design the most?",
      "What would make you move from a workflow to a supervisor?",
      "What do you cut if you only have 20 minutes?",
    ],
  },
  {
    id: "agents-c28-q02",
    course: "agents",
    category: "system-design",
    level: "deep",
    chapterId: "agents-28-system-design",
    question: "The same method gave a tool loop for one project and a workflow for another. Why?",
    idealAnswer:
      "The method is the same, and the answers to the first stage differ. The PEP desk serves an engineer who is waiting. The path is open, because a question may need one search or three. Its one write is a ticket a person can close, and the worst failure is a wrong citation. So one tool loop with a step budget fits, plus a code check that each cited PEP is on the desk. About three model calls a question keeps it near six seconds at an assumed two seconds a call. PayDesk runs on a schedule with nobody present. Its five possible steps are known, and a refund or a mail cannot be taken back. So code routes and the model picks one step from five. Code checks the choice against the signals, and the model never sees an amount. The topic, the keys, the force-close and the sweep follow from unattended, at-least-once delivery. The risk and the known steps decided the architecture. The method did not.",
    keywords: ["tool loop", "workflow", "open path", "known steps", "irreversible", "unattended", "step budget", "signals only", "at-least-once"],
    followUps: [
      "What change to the PEP desk would make you add a supervisor?",
      "Could PayDesk ever use a tool loop? Under what limits?",
      "Which of the seven stages differed most between them?",
    ],
  },
  {
    id: "agents-c28-q03",
    course: "agents",
    category: "judgement",
    level: "senior",
    chapterId: "agents-28-system-design",
    question: "What are the common mistakes in a multi-agent design answer, and how do you avoid them?",
    idealAnswer:
      "Six mistakes come up again and again. The first is an autonomous agent where a workflow would do, so I ask whether I can write the steps down. The second is a supervisor where code could route, so I check whether a field in the data already decides. The third is no evals, so I bring a golden set and a regression gate that fails the build. The fourth is guardrails only in the prompt, so I put each limit in the function that acts. The fifth is no answer for a repeated event or a stuck run, so I use idempotency keys, a force-close and a sweep. The sixth is no cost numbers, so I count model calls, state a latency assumption and give a monthly figure. I also say what I left out and why, because that shows judgement. If I notice a gap mid-answer, I name it and fix it aloud.",
    keywords: ["autonomous agent", "supervisor", "golden set", "regression gate", "guardrails in code", "idempotency key", "force-close", "sweep", "cost numbers"],
    followUps: [
      "Which of these do you think is most common?",
      "How would you test a design for the fourth mistake?",
      "Give a cost figure for a design you built.",
    ],
  },
  {
    id: "agents-c28-q04",
    course: "agents",
    category: "system-design",
    level: "core",
    chapterId: "agents-28-system-design",
    question: "Design an expense-approval desk that reads receipts, applies a policy and books payouts.",
    idealAnswer:
      "I would build a deterministic workflow, because the steps are known. First I clarify the claim limit that needs a manager, how duplicates are found and who pays out. I assume 6,000 claims a month and no user waiting. The model does two narrow jobs: it reads the receipt into fields, and it picks one of approve, query the employee, escalate or reject. A policy table routes by category and amount, so I reject a supervisor. State is one record per claim ID, saved after each node. Booking a payout is irreversible, so it carries an idempotency key and needs a manager's approval above the limit. Code checks the amount against the receipt, and the model never sees bank details. A golden set of past claims, with a regression gate that fails on any unsafe payout, covers evals. Claims arrive on a topic, and a repeated claim ID changes nothing. A stuck run is force-closed to finance. That is two model calls per claim, or 12,000 a month on my assumed volume.",
    keywords: ["workflow", "claim limit", "policy table", "claim ID", "irreversible", "idempotency key", "approval", "golden set", "calls per claim"],
    followUps: [
      "How do you catch a forged receipt?",
      "What if the policy changes mid-month?",
      "How would you roll this out to 2,000 staff?",
    ],
  },
];

export default questions;
