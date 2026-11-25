import type { InterviewQuestion } from "../types";

// Chapter 24 questions: PayDesk 1, the domain and the deterministic core.
const questions: InterviewQuestion[] = [
  {
    id: "agents-c24-q01",
    course: "agents",
    category: "multi-agent",
    level: "core",
    chapterId: "agents-24-capstone-core",
    question: "You built a desk that chases instalment payments. Which architecture is it, and why not a free agent?",
    idealAnswer:
      "It is a deterministic workflow. Code routes every run. The model does one job: it picks the next step from a fixed set of five. The five are send a link, send a reminder, refund, close and hand to sales. Code then checks that the pick is allowed for the signals, and rejects it if not. I chose this over a free agent because the task is money. The steps are known in advance, so I can write them down. A free agent adds cost, latency and ways to fail, and it gains nothing here. A fixed set also makes the evals simple, because every run has an expected action I can compare with. The model's only freedom is a label, and code decides what each label does. I would move towards an agent only if the path became open, for example if the desk had to investigate disputes. Even then I would keep the money steps in code behind the same allow-list.",
    keywords: ["deterministic workflow", "code routes", "fixed set", "allow-list", "five steps", "least autonomy", "evals", "money"],
    followUps: [
      "What would make you give the model more control?",
      "How do you enforce that a pick is allowed?",
      "How does this differ from a supervisor with tools?",
    ],
  },
  {
    id: "agents-c24-q02",
    course: "agents",
    category: "guardrails",
    level: "deep",
    chapterId: "agents-24-capstone-core",
    question: "How do you stop a payment amount or a customer name reaching the model?",
    idealAnswer:
      "I design the data flow so the model never receives them. A deterministic Calculate step reads the store and compares expected with received. It returns two things: the amount still owed, which stays in code, and a small record of derived signals. The signals are the sign of the delta, whether the link has expired and the days since the last mail. They also say whether the plan changed and where the instalment sits. None holds money or identity. The model drafts a mail with placeholders, and code fills the amounts and the name afterwards. A check runs on the mail before it is sent. Because the model never held the values, it cannot repeat them. I then test it, with an eval that scans every prompt for an amount or a name and fails the release if it finds one. The guard is structural first and tested second, so I do not rely on an instruction like do not reveal amounts.",
    keywords: ["derived signals", "calculate", "placeholders", "fill in code", "output check", "prompt-leak eval", "structural guard", "no amounts"],
    followUps: [
      "What do you do when a decision needs the amount?",
      "How would you prove no amount ever reached a prompt?",
      "What stays in the trace, and who can read it?",
    ],
  },
  {
    id: "agents-c24-q03",
    course: "agents",
    category: "system-design",
    level: "senior",
    chapterId: "agents-24-capstone-core",
    question: "A customer adds an extra to their trip after paying two of four instalments. How does the system respond, and is a model involved?",
    idealAnswer:
      "No model is involved. The value rises, and the nightly reconciliation notices that the instalments no longer sum to it. It runs a rebalance. The rule has two halves. Paid instalments stay exactly as they were, because that money is already taken. The unpaid ones share the new value, less the paid total, in their original proportions. I use the unpaid amounts themselves as weights, so the proportions carry over. Integer division loses pence, so the last slot absorbs the remainder and the plan sums to the new value exactly. The function asserts both guarantees, so a bug fails loudly. Meanwhile a signal called plan changed tells the model to wait for tonight's rebalance instead of mailing a stale amount. I would test it with property checks: the paid slots never move, the sum matches, and the unpaid ratios are preserved. The open case is a value cut below what is paid, which needs a human.",
    keywords: ["rebalance", "paid untouched", "original proportions", "integer pence", "rounding remainder", "assert", "nightly reconciliation", "plan_changed"],
    followUps: [
      "What if the value falls below the amount already paid?",
      "Why integer pence and not decimals?",
      "How do you stop a mail with the old amount going out?",
    ],
  },
  {
    id: "agents-c24-q04",
    course: "agents",
    category: "evals",
    level: "deep",
    chapterId: "agents-24-capstone-core",
    question: "You can't test on real customers. How do you build test data for the payment desk, and how do you score it?",
    idealAnswer:
      "I generate it from a seed. The generator makes about 200 itineraries with labelled behaviours: on time, late, partial, overpaid, never pays, add-on and cancelled. Each label carries the outcome a correct desk should reach, for example refunded for overpaid and handed to sales for never pays. That pairing is the ground truth. A simulated clock plays the customers' payments day by day, so a two-month run takes seconds and is repeatable. Because the seed is fixed, a failing case can be reproduced exactly. I then score the desk against the labels. Task success is whether the final outcome matches. Action accuracy and trajectory match compare the path taken with the expected one. The weakness is realism, so I review the label weights against real traffic. I add a new label whenever production shows a behaviour the generator lacks. There is no pytest in the loop, only the simulation and its report.",
    keywords: ["seeded generator", "labels", "expected outcome", "ground truth", "simulated clock", "reproducible", "task success", "trajectory match"],
    followUps: [
      "How would you check the data is realistic?",
      "What label would you add next?",
      "How is this different from replaying production traces?",
    ],
  },
];

export default questions;
