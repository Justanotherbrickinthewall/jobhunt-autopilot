import type { InterviewQuestion } from "../types";

// Chapter 26 questions. Ids are agents-cNN-qNN. The loader picks up any file in this folder.
const questions: InterviewQuestion[] = [
  {
    id: "agents-c26-q01",
    course: "agents",
    category: "guardrails",
    level: "senior",
    chapterId: "agents-26-capstone-evals-guards",
    question: "Walk me through the guardrails on an agent that can send payment emails and issue refunds.",
    idealAnswer:
      "I use four layers, and each one answers a different question. The first is what the model may see. It gets derived signals, such as the sign of the shortfall and whether the link has expired. It never gets an amount or a customer name, and a check proves it by scanning every prompt for currency and names. The second is what it may choose. The model picks from a fixed set of steps, and code computes which steps are allowed for those signals. A refund on a customer who still owes money is blocked, the model is asked once more, and then the case goes to a person. The third is what may leave the system. The model drafts an email with placeholders, code fills in the real amount and name, and a mail check runs before the send. It looks for leftover placeholders, a missing link and any amount that is not the one due. The fourth is who decides when the rules don't cover a case. That is a sales queue with a human on it. Idempotency keys sit under all four, so a retry never pays or mails twice.",
    keywords: ["signals only", "allowed steps", "mail check", "placeholders", "sales queue", "prompt-leak check", "idempotency", "fixed set"],
    followUps: [
      "Which layer would you add first on day one, and why?",
      "What does the guard not catch?",
      "How do you stop the model learning the amount from the email it drafts?",
    ],
  },
  {
    id: "agents-c26-q02",
    course: "agents",
    category: "evaluation",
    level: "deep",
    chapterId: "agents-26-capstone-evals-guards",
    question: "Your task success is 1.00. Does that mean the agent is good?",
    idealAnswer:
      "No. A perfect task success rate only says every case reached its labelled end state. It says nothing about the path. In my simulation the customers follow fixed scripts, so a customer pays whatever the desk does. A wrong step still ends in a paid instalment. So I score four more things. Action accuracy compares each decision with the reference step. Trajectory match checks that a whole itinerary's history stays inside the steps its label allows. It amplifies rare slips. 19 wrong decisions out of 1508 are 1.3 per cent of decisions, but they fail 11 of 200 itineraries, which is 5.5 per cent. The mail pass rate counts first drafts that pass the mail check, which shows the cost of redrafting. Pass^k repeats each decision k times and counts a case only if all k are right, so it catches flakiness. I also gate on two ceilings, zero unsafe actions and zero prompt leaks. Task success is a smoke alarm. The path metrics do the real work.",
    keywords: ["task success", "action accuracy", "trajectory match", "pass^k", "reference step", "labels", "scripted customers", "ceilings"],
    followUps: [
      "How would you make task success mean more?",
      "Why can the guard catch fewer errors than the evals?",
      "How do you get ground truth for a real desk?",
    ],
  },
  {
    id: "agents-c26-q03",
    course: "agents",
    category: "evaluation",
    level: "senior",
    chapterId: "agents-26-capstone-evals-guards",
    question: "How do you gate a release of a non-deterministic agent?",
    idealAnswer:
      "I run the same seeded simulation on every change and compare a fixed set of metrics with thresholds. Quality metrics have floors: task success, action accuracy, trajectory match, mail pass rate and pass^k. Safety metrics have ceilings of zero: unsafe actions executed and prompt leaks. If any metric misses, the run exits with a non-zero code and CI fails the build. The thresholds sit a little below what the current system scores, so normal noise passes and a real regression doesn't. To deal with non-determinism I use pass^k, which repeats each decision k times and passes a case only when all k are right. That punishes flakiness, which a single run hides. When I raised the scripted model's error rate to 15 per cent, the guard still blocked every unsafe step and task success stayed at 1.00. The release gate failed on trajectory match at 0.805 against a floor of 0.85. That is the sign a release gate is built on the right metrics.",
    keywords: ["release gate", "thresholds", "floors", "ceilings", "pass^k", "seeded simulation", "exit code", "CI", "regression"],
    followUps: [
      "How do you choose the thresholds?",
      "What do you do when the release gate fails on a Friday and the fix isn't clear?",
      "How would the release gate change with a live model?",
    ],
  },
];

export default questions;
