import type { InterviewQuestion } from "../types";

// Chapter 17 questions. Ids are agents-cNN-qNN.
const questions: InterviewQuestion[] = [
  {
    id: "agents-c17-q01",
    course: "agents",
    category: "orchestration",
    level: "core",
    chapterId: "agents-17-supervisor-by-hand",
    question: "Explain the supervisor pattern. How does it differ from a single ReAct agent?",
    idealAnswer:
      "A supervisor is a ReAct loop whose tools are other agents. The model picks a worker and writes it a task. The worker runs its own small loop on that task and returns one short result. That result goes back to the supervisor as the observation, and the supervisor picks the next worker or writes the final answer. A single ReAct agent has one flat list of tools, and its history collects every result. In a supervisor, each worker keeps its own context. It sees only the task it was given, so its prompt stays short and its tools stay few. The supervisor's history grows by one sentence for each worker. That is the gain. The price is a model call on every hop, and the supervisor must write good tasks because workers cannot see the user's question. On the PEP desk I would use a researcher, a version checker and a writer, and the supervisor would decide when the work is done.",
    keywords: ["ReAct loop", "worker as a tool", "context isolation", "task", "short result", "observation", "final answer", "model call per hop"],
    followUps: [
      "What does the worker see, and what does it not see?",
      "Who writes the final answer, and what changes if the supervisor does it?",
      "How does this differ from a handoff?",
    ],
  },
  {
    id: "agents-c17-q02",
    course: "agents",
    category: "reliability",
    level: "deep",
    chapterId: "agents-17-supervisor-by-hand",
    question: "Where does a supervisor design break, and how would you guard against each failure?",
    idealAnswer:
      "I see three breaks. First, the supervisor is a bottleneck. Every step goes through one model, workers cannot talk to each other, and a slow worker stalls the run. I keep the team small, and I use parallel fan-out for work that can run at once. Second, detail is lost on the way up. Each worker summarises, and the supervisor sees only the summary, so a fact the user asked about can vanish. I name what must survive in the task, and I have the worker return its source so the supervisor can ask again. Third, cost grows with each hop. The supervisor's own call count understates it, because every worker has a model too. I add up every model's call count, set a step budget on the supervisor and a smaller one on each worker. A worker must also return an error string that names the failure, so the supervisor can retry or say what is missing.",
    keywords: ["bottleneck", "detail lost", "summary", "cost per hop", "step budget", "worker error", "fan-out", "call count"],
    followUps: [
      "How would you measure the extra cost of the supervisor against a single agent?",
      "What do you do when a worker returns nothing?",
      "How would you test that a fact survives the summary?",
    ],
  },
  {
    id: "agents-c17-q03",
    course: "agents",
    category: "orchestration",
    level: "senior",
    chapterId: "agents-17-supervisor-by-hand",
    question: "When would you add a second level of supervisors, and when would you pick a workflow or a plan instead?",
    idealAnswer:
      "I add a second level only when it buys something specific. A group of workers shares a theme and the top level need not see their steps. The top supervisor has so many workers that it chooses badly. Two groups need different budgets, models or checks. Or each group must be built and tested alone. Each extra level adds model calls and another summary, so on a team of three I would not add one. The choice between designs depends on who should pick the next step. If the steps and their order are known, or money moves, I use a deterministic workflow. Code fixes the route, and the model picks from a fixed set. If the steps are open but stable once chosen, I use plan-and-execute: a planner writes the steps once and an executor works them. I use a supervisor when the next job depends on the last result and the jobs need different tools. It is the most flexible design and the most expensive.",
    keywords: ["second level", "hierarchical team", "deterministic workflow", "plan-and-execute", "who picks the next step", "flexibility", "cost", "summary"],
    followUps: [
      "How would you move from a supervisor to a workflow once a path became stable?",
      "What would you measure to justify the second level?",
      "How does a handoff change who holds control?",
    ],
  },
];

export default questions;
