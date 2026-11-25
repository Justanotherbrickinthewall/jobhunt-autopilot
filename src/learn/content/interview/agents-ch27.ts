import type { InterviewQuestion } from "../types";

// Chapter 27 questions. Ids are agents-c27-qNN.
const questions: InterviewQuestion[] = [
  {
    id: "agents-c27-q01",
    course: "agents",
    category: "reliability",
    level: "core",
    chapterId: "agents-27-capstone-recovery",
    question: "A consumer crashes after it sends a customer an email and before it commits. How do you stop the customer getting two emails?",
    idealAnswer:
      "I assume the topic delivers at least once, so the event will come back, and I make every effect safe to repeat. Each effect carries an idempotency key built from the event, never from the clock or a random number. The mail key is mail plus the event ID. The link key and the refund key work the same way, and a refund key also carries the amount. The mailer, the payment provider and the refund table each remember the keys they have seen. A repeat returns the first result and changes nothing, and I count the blocked repeats so I can see them. I also save the run state after every node. A redelivered event loads the saved state, skips the nodes already done and carries on. If the run had already finished, only the commit was lost, so I return it untouched. I would not claim exactly-once delivery. I claim at-least-once delivery with idempotent effects, and I can show the counter of blocked duplicates after a forced crash.",
    keywords: ["at-least-once", "idempotency key", "derived from the event", "commit", "saved state", "skip done nodes", "blocked duplicates"],
    followUps: [
      "What goes wrong if the key includes a timestamp?",
      "Where would you store the keys in production, and for how long?",
      "How would you test this without waiting for a real crash?",
    ],
  },
  {
    id: "agents-c27-q02",
    course: "agents",
    category: "reliability",
    level: "core",
    chapterId: "agents-27-capstone-recovery",
    question: "How do you deal with agent runs that hang or never finish?",
    idealAnswer:
      "I use two timers with different jobs. The first is a force-close. A run open for more than 5 minutes goes to a person, through the sales queue, with the reason timeout. I hand it over and I do not retry blindly, because a hung run may have done half its work. In PayDesk the link might exist and the mail might not, and a person can see that. The second is a nightly recovery sweep. It finds every run that never reached a closed status, plus the runs the force-close handed over. It releases them and puts each one back on the topic as a new event. The graph starts again and reads today's signals, so it decides on the world as it is now. In one simulated run, an instalment was force-closed in the morning, the customer paid by midnight, and the sweep closed it with no second email. In production the sweep is its own scheduled task, because a hung consumer cannot sweep itself. I would also add a timeout on each call and a dead-letter list for events that crash every time.",
    keywords: ["force-close", "5 minutes", "hand to human", "nightly sweep", "fresh signals", "separate scheduled task", "dead-letter list"],
    followUps: [
      "Why not retry the run straight away?",
      "How would you pick the 5-minute limit?",
      "What would you alert on?",
    ],
  },
  {
    id: "agents-c27-q03",
    course: "agents",
    category: "deployment",
    level: "core",
    chapterId: "agents-27-capstone-recovery",
    question: "How would you deploy a scheduled, event-driven multi-agent system like this one?",
    idealAnswer:
      "I split it into four pieces and add two checks. A managed scheduler fires the jobs: the 09:00 due and overdue jobs and the 00:00 reconcile job. Each job publishes events and stops. A topic carries the events. I reuse the one the platform already runs, because a second one is a second thing to operate. The 09:00 schedule makes a burst, and the topic absorbs it. The consumers are container tasks that pull events. I scale them on lag, and I can run many because the state is not in the process. The state lives in managed Postgres, so any task can pick up any instalment. The recovery sweep is its own small scheduled task. Tracing records one trace per run, with a span per node. An eval run in CI runs the simulation and the release gate on every change to a prompt, a policy or a guard. A failing release gate blocks the merge. On one cloud that is a managed scheduler, container tasks on a serverless container service, a managed message queue or Kafka, and managed Postgres.",
    keywords: ["scheduler", "topic", "container tasks", "Postgres", "scale on lag", "separate sweep task", "tracing", "eval in CI"],
    followUps: [
      "Why not run the consumers as functions?",
      "How do two consumers avoid taking the same instalment?",
      "What would you trace on every run?",
    ],
  },
  {
    id: "agents-c27-q04",
    course: "agents",
    category: "system-design",
    level: "deep",
    chapterId: "agents-27-capstone-recovery",
    question: "Walk me through your payments multi-agent system in about a minute.",
    idealAnswer:
      "It collects instalments for a travel operator. The pattern is a deterministic workflow: code routes, and the model only picks the next step from a fixed set that code then checks. A handoff passes the instalment ID and the shared state as it moves through the statuses. There is no free-text-to-SQL step, because calculate is plain code over the store, and the model sees signals and never amounts or names. A 09:00 schedule puts one event per instalment on a topic the platform already runs, and that schedule makes a burst. Consumers pull from the topic. Pull and push is a different question from point-to-point and publish-subscribe. Idempotency keys make a redelivered event harmless. A run open for 5 minutes is force-closed to sales, and a nightly sweep takes stuck runs through again on fresh signals. It deploys as a scheduler, the topic, container tasks and Postgres, with tracing and the release gate in CI. Evals check the path as well as the outcome, and the release gate blocks a change that adds an unsafe action.",
    keywords: ["deterministic workflow", "fixed set", "instalment ID", "no free-text-to-SQL", "topic the platform runs", "pull", "idempotency", "force-close", "nightly sweep", "deployment"],
    followUps: [
      "Which part would you cut first if you had a week?",
      "Where is the model actually making a decision?",
      "What would change if volume grew ten times?",
    ],
  },
];

export default questions;
