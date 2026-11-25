import type { InterviewQuestion } from "../types";

// Chapter 25 questions: PayDesk 2. Ids are agents-c25-qNN.
const questions: InterviewQuestion[] = [
  {
    id: "agents-c25-q01",
    course: "agents",
    category: "orchestration",
    level: "core",
    chapterId: "agents-25-capstone-graph",
    question: "Your payments desk uses a model and a graph. Is it a multi-agent system, and what pattern is it?",
    idealAnswer:
      "It is a deterministic workflow, and the model picks from a fixed set. Code owns the path: calculate, decide, guard, act, close, in that order, every time. The model appears in two places only. At the decide node it picks one step from five that I wrote: send a link, send a reminder, refund, close or hand to sales. In the mailer it drafts text with placeholders. I would not call it a free multi-agent system, because no agent chooses the next node or decides when to stop. I chose that on purpose. The job moves money, so I want a path I can test and replay. Code also checks the model's choice against what is safe for the signals, and a bad choice never reaches the payment provider. If someone asks where autonomy would help, I point to the cases that go to sales. I would add it there first, behind the same checks.",
    keywords: ["deterministic workflow", "fixed set", "code routes", "decide node", "guard", "one step from five", "five nodes", "autonomy only where measured"],
    followUps: [
      "What would make you give the model more control?",
      "How do you test a design where the model picks the step?",
      "Where would you add a second agent first?",
    ],
  },
  {
    id: "agents-c25-q02",
    course: "agents",
    category: "multi-agent",
    level: "core",
    chapterId: "agents-25-capstone-graph",
    question: "What does a handoff between your nodes actually pass?",
    idealAnswer:
      "It passes two things: the instalment ID and the shared state. The instalment ID is the key for the whole run. The state is one record for that ID, and each node reads it, adds its own keys and returns only what it changed. After every node the graph saves the whole record to the database. The status moves with it: initialized, then calculated, then link_generated, then email_sent, then closed, or handed_to_sales if the case leaves the desk. So the handoff carries no hidden memory and no chat history. If a node dies, the next worker loads the record by ID and carries on from the nodes already listed as done. That is the reason I save after every node. It also makes the run easy to audit. The record shows the signals, the step the model proposed, the step that ran and the mail that went. The event ID, built from the kind, the instalment and the day, keys the link and the mail. So a repeated event cannot send a second link or a second mail.",
    keywords: ["instalment ID", "shared state", "saved after every node", "status", "done list", "resume", "audit", "idempotency key"],
    followUps: [
      "Why not keep the state in memory between nodes?",
      "Which node owns which keys?",
      "How does a second worker pick up a half-finished run?",
    ],
  },
  {
    id: "agents-c25-q03",
    course: "agents",
    category: "async",
    level: "deep",
    chapterId: "agents-25-capstone-graph",
    question: "Why did you put a work queue between the schedule and the graph, and are the consumers pull or push?",
    idealAnswer:
      "I used a topic for two reasons. The platform already runs topics, so I add one and no new infrastructure. And a schedule makes a burst: at 09:00 every instalment due that day appears at once. On my seed-7 simulation the busiest morning put 69 events on the topic, and the quietest busy morning put one. The topic lets a small group of consumers drain that burst at their own speed. Consumers pull. Each one asks the topic for the next event, runs the graph, then commits the offset. A crash before the commit means the event comes back, which is why the graph must be safe to repeat. Pull versus push is a different axis from point-to-point versus publish-subscribe. Pull and push say who moves the message. Point-to-point and publish-subscribe say how many receivers get it. A consumer group is point-to-point inside the group, and two groups on one topic are publish-subscribe.",
    keywords: ["existing topic", "burst", "schedule", "consumer group", "pull", "offset commit", "point-to-point", "publish-subscribe", "at-least-once"],
    followUps: [
      "What happens if a consumer crashes after the mail and before the commit?",
      "How would you size the consumer group?",
      "When would push be the better delivery?",
    ],
  },
  {
    id: "agents-c25-q04",
    course: "agents",
    category: "guardrails",
    level: "senior",
    chapterId: "agents-25-capstone-graph",
    question: "How do you stop the model writing a wrong amount in a customer email?",
    idealAnswer:
      "I never give it the amount. The model sees signals only: the sign of the shortfall, whether the link expired, how long since the last mail. It drafts the email with placeholders such as {name}, {amount} and {link}. Code then fills them from the database. So the number in the email comes from the same code that calculated it, and the model cannot change it. That removes one class of error, but the model can still slip. It can drop the link, write a pound figure of its own or invent a placeholder. So a mail check runs after the fill and before the send. It looks for leftover braces, a missing name, amount or link, and any currency figure that is not the amount due. A failed mail gets one redraft, and then the case goes to sales. I measure the first-draft pass rate, because a falling rate tells me the prompt or the model has drifted before a customer sees anything.",
    keywords: ["placeholders", "signals only", "fill in code", "mail check", "redraft", "hand to sales", "first-draft pass rate", "no amount in prompt"],
    followUps: [
      "How would you prove no amount ever reached a prompt?",
      "What would you check if the model switched language?",
      "Why redraft once and not until it passes?",
    ],
  },
];

export default questions;
