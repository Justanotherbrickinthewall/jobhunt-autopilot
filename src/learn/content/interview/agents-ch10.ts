import type { InterviewQuestion } from "../types";

// Chapter 10 questions. Each Part 2 chapter adds its own agents-chNN.ts file, so no two agents edit one file.
// Ids are agents-cNN-qNN. The loader picks up any file in this folder, and the bank groups by `course`.
const questions: InterviewQuestion[] = [
  {
    id: "agents-c10-q01",
    course: "agents",
    category: "orchestration",
    level: "core",
    chapterId: "agents-10-architecture-map",
    question: "How do you tell a workflow from an agent, and how do you decide which to build?",
    idealAnswer:
      "I ask one question: who picks the next step, my code or the model? In a workflow my code owns the path. The model may fill in a blank or choose one label from a list I wrote, but it never decides what runs next. In an agent the model picks the next step, and it also decides when to stop. I build the workflow first, because it is cheaper, faster, easier to test and easier to explain. I move to an agent only when I can't write the steps down in advance. For example, the number of lookups may depend on what each lookup finds. Even then code keeps the limits: a budget, a fixed list of tools and a fallback to the fixed path. On a PEP desk, a cited answer to one question is a workflow. Following a chain of PEPs that replace each other is a loop the model drives.",
    keywords: ["who picks the next step", "workflow", "agent", "fixed set", "budget", "fixed list of tools", "fallback", "testability"],
    followUps: [
      "Where would you put a human in each design?",
      "How does the eval change when the path is not fixed?",
      "What would make you move an agent back to a workflow?",
    ],
  },
  {
    id: "agents-c10-q02",
    course: "agents",
    category: "multi-agent",
    level: "deep",
    chapterId: "agents-10-architecture-map",
    question: "Name the main multi-agent architectures and say how they differ.",
    idealAnswer:
      "They differ in two things: who picks the next step, and who owns the state. A tool loop, ReAct, has one model that picks every step. A router has a model pick one label and then code runs a fixed branch. Plan-and-execute has a model write the plan once and code work through it. Reflection has a second call review each draft. Fan-out splits work whose parts don't need each other, runs it at once and merges it. Voting and debate spend extra calls on accuracy. A supervisor is a model whose tools are other agents, so control stays in one place. Handoffs, or a swarm, pass control from agent to agent with no one in charge. So the task ID and the shared state must travel with the work. A blackboard gives every agent one shared state keyed by the task ID. Event-driven agents start from a schedule or a work queue. Hierarchical teams stack supervisors. The rule I use is to start with the least autonomy that does the job.",
    keywords: ["ReAct", "router", "plan-and-execute", "reflection", "fan-out", "supervisor", "handoff", "blackboard", "event-driven", "state ownership"],
    followUps: [
      "Which of these would you never use for a payment flow, and why?",
      "How does a hierarchical team differ from a supervisor?",
      "Where do MCP and A2A fit in this list?",
    ],
  },
  {
    id: "agents-c10-q03",
    course: "agents",
    category: "protocols",
    level: "deep",
    chapterId: "agents-10-architecture-map",
    question: "Where do MCP and A2A fit? Are they architectures?",
    idealAnswer:
      "No. They are protocols, so they sit underneath an architecture and don't replace one. MCP, the Model Context Protocol, standardises how an agent reaches tools and data. It answers the question of how my agent calls a tool that someone else wrote. A2A, the agent-to-agent protocol, standardises how one agent talks to another agent that may run in a different service or framework. It answers the question of how my supervisor calls a worker I don't own. Neither one tells me who picks the next step. I still choose a supervisor, a workflow or a swarm, and then I choose the wire it speaks. In a single codebase I don't need either. A function call is cheaper than a network hop. I reach for MCP when tools are shared across clients, and for A2A when agents belong to different teams or vendors. Both add latency, a failure point and a trust boundary to guard.",
    keywords: ["protocol", "MCP", "A2A", "tools and data", "agent to agent", "trust boundary", "latency", "not an architecture"],
    followUps: [
      "What new risks does an MCP server add?",
      "When is a plain function call the better choice?",
      "How would you authenticate an agent from another team?",
    ],
  },
  {
    id: "agents-c10-q04",
    course: "agents",
    category: "orchestration",
    level: "senior",
    chapterId: "agents-10-architecture-map",
    question: "You are asked to design a multi-agent system. How do you pick the architecture?",
    idealAnswer:
      "I start from the task, not the pattern. First I ask whether I can write the steps down. If I can, I build a workflow and use the model only to fill in or to label. Second, I ask whether the parts need each other's results. If they don't, fan-out cuts latency without giving the model more control. Third, I ask whether a written standard can check the result, because then a review call after each draft buys quality. Only when the path is open do I give the model the loop. Then I ask whether the work needs several specialities with their own tools. If it does, a supervisor keeps control in one place, and handoffs trade that control for flexibility. I also ask how the work arrives. A work queue or a schedule is a trigger, and it wraps whichever pattern I chose. I price each choice in model calls and latency, set a budget, and write the fallback before I write the agent. Then I say what I would measure to prove the extra autonomy pays.",
    keywords: ["steps written down", "fan-out", "review call", "supervisor", "handoffs", "trigger", "budget", "fallback", "cost in model calls", "least autonomy"],
    followUps: [
      "What would you measure to justify a second agent?",
      "How would you test the fallback path?",
      "Walk me through the failure modes of the design you picked.",
    ],
  },
];

export default questions;
