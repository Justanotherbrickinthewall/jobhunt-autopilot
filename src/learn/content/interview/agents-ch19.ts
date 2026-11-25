import type { InterviewQuestion } from "../types";

// Chapter 19 questions. Ids are agents-cNN-qNN.
const questions: InterviewQuestion[] = [
  {
    id: "agents-c19-q01",
    course: "agents",
    category: "orchestration",
    level: "core",
    chapterId: "agents-19-blackboard",
    question: "What is a blackboard architecture, and how does it differ from a supervisor or a handoff?",
    idealAnswer:
      "A blackboard is one shared record for each task ID, with named sections such as the question, the findings, a draft and a status. Agents never message each other. Each one reads the board and writes its own section. A controller picks the next agent by checking the board. Every agent declares a condition under which it can act, for example findings exist and there is no draft. The controller runs the first agent whose condition holds. It stops when the status is done, when no agent can act, or when the step budget runs out. The difference is who picks the next agent. In a supervisor, a model picks, and the state sits in its messages. In a handoff, the agent holding control names the next one, and the state waits in a store under the task ID. On a blackboard, nobody picks by name, because the board's contents decide. That makes the order depend on the data and makes resumes easy. The trace shows who wrote each section at which version number.",
    keywords: ["shared record", "task ID", "sections", "controller", "condition", "no messaging", "board's contents decide", "status done"],
    followUps: [
      "Who decides the order when two agents can act?",
      "Why is the controller plain code and not a model?",
      "What does a new agent have to know about the existing ones?",
    ],
  },
  {
    id: "agents-c19-q02",
    course: "agents",
    category: "reliability",
    level: "deep",
    chapterId: "agents-19-blackboard",
    question: "How do you resume a multi-agent run after a crash, and what do you do when two agents write the same section?",
    idealAnswer:
      "I save the board after every write, keyed by the task ID. SQLite is enough for one machine, and Postgres suits several workers. A crash then loses at most the write in flight. A new process opens the same store, reads the board and runs the controller again. Agents whose sections already exist have false conditions, so they do not run, and the resume pays only for the missing work. For two writers on one section, I keep a version number on the board. A writer reads the version and sends it back with its write. The update applies only when the stored version still matches, so a stale write changes no rows and raises an error. The check lives in the database, so it holds across processes. A rejected writer must read the board again before it writes. A blind retry with the new number would overwrite the other draft and bring the bug back. Then it keeps the other draft, merges or overwrites, which is a domain choice.",
    keywords: ["save after every write", "task ID", "resume", "version number", "stale write", "compare-and-swap", "re-read", "lost update"],
    followUps: [
      "Would you version the whole board or each section?",
      "What happens to a write that was in flight when the process died?",
      "How would an idempotency key help on the resume?",
    ],
  },
  {
    id: "agents-c19-q03",
    course: "agents",
    category: "design",
    level: "senior",
    chapterId: "agents-19-blackboard",
    question: "When would you choose a blackboard over a workflow or a supervisor, and when would you not?",
    idealAnswer:
      "I choose a blackboard when the next step depends on what is already known. It also fits when several specialists add to one long-lived record, and the run must resume. A research task is a good fit. A searcher, a fact checker and a writer contribute in an order that depends on the findings. Every write is numbered, so the trace shows who wrote each section at which version number. I would not choose it when I can write the steps down. A deterministic workflow, where code fixes the route and the model only picks from a fixed set, is cheaper and easier to test. I would not choose it when one agent can do the job. I would be careful when many agents write at once, because every write competes for the same version number. Per-section version numbers help there. The cost of a blackboard is coupling to the board's shape. Every agent depends on the section names, so renaming a section touches all of them. I keep the controller as plain code, so the order is repeatable.",
    keywords: ["next step depends on data", "long-lived record", "resume", "numbered writes", "deterministic workflow", "write contention", "board shape", "plain-code controller"],
    followUps: [
      "How would you rename a section without breaking running tasks?",
      "Where would a model belong in this design?",
      "How would a model as the controller change the cost and the trace?",
    ],
  },
];

export default questions;
