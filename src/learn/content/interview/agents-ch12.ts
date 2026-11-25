import type { InterviewQuestion } from "../types";

// Chapter 12 questions. Ids are agents-cNN-qNN.
const questions: InterviewQuestion[] = [
  {
    id: "agents-c12-q01",
    course: "agents",
    category: "orchestration",
    level: "core",
    chapterId: "agents-12-deterministic-workflows",
    question: "What is a deterministic workflow, and how does it differ from an autonomous agent?",
    idealAnswer:
      "It is a graph where code routes and the model picks from a fixed set. The graph is written in code. The nodes are functions, and the edges say what runs next. At a decision point the model gets a short list of options and returns one of them. It can't invent a route, call a tool I didn't list or decide when the run ends. Code then checks the choice. It must be in the enum, and it must be allowed for the current state. If not, code takes a safe default, such as a review queue. An autonomous agent differs on one axis: the model picks every next step and decides when to stop. So the workflow's path is fixed and its cost is capped, while the agent's path varies. The model's wording can still vary in a workflow. The path cannot. That is what makes it testable and auditable. I start with a workflow, and I move to an agent only when I can't write the steps down in advance.",
    keywords: ["code routes", "fixed set", "enum", "validate", "safe default", "review queue", "who picks the next step", "path"],
    followUps: [
      "What does the model do at a decision point?",
      "Where does the state live, and when is it saved?",
      "Is the output deterministic if the model's text varies?",
    ],
  },
  {
    id: "agents-c12-q02",
    course: "agents",
    category: "orchestration",
    level: "deep",
    chapterId: "agents-12-deterministic-workflows",
    question: "The model picks a route from an enum. How do you make sure a bad pick can't do harm?",
    idealAnswer:
      "I never act on the raw reply. A check node sits between the model and the edge, and it applies two tests. First, is the value in the enum, as an exact match? A reply such as a capital letter or a sentence of prose fails that test. Second, is it allowed for this state? A route can be valid in general and still be wrong here. For example, a version lookup is allowed only when the question names a feature the system knows. If either test fails, the check writes a safe default into the state, usually a review queue, and it adds a note that says why. The next edge reads the checked route and not the model's choice. I also count what lands in the review queue, because a default nobody reads is a silent failure. Validation catches illegal choices. It does not catch a legal but wrong choice, so I add evals for route accuracy as well.",
    keywords: ["check node", "exact match", "allowed for the state", "safe default", "review queue", "note", "evals", "route accuracy"],
    followUps: [
      "Would you retry the model before falling back?",
      "How do you measure whether the router picks the right route?",
      "What if the enum has twenty options?",
    ],
  },
  {
    id: "agents-c12-q03",
    course: "agents",
    category: "orchestration",
    level: "senior",
    chapterId: "agents-12-deterministic-workflows",
    question: "When would you choose a fixed workflow over an autonomous agent, and when would you not?",
    idealAnswer:
      "I choose a fixed workflow when the process is known and when a wrong step is costly. Money, compliance and anything irreversible fit that rule. In those cases I want code to own the path. Then the maximum cost is known and a test can assert the route. An audit can read the saved path and state. I also choose it when the volume is high and the steps repeat, because a loop would pay for model calls that add nothing. I choose an autonomous agent for open-ended work, such as research. There each result decides the next query, and I can't write the edges in advance. Even then I keep code in charge of the limits: a step budget, a fixed list of tools and a fallback. The honest cost of a workflow is rigidity. A request that needs a step I didn't draw lands in the review queue. So I read the review queue and add edges where the volume justifies them.",
    keywords: ["known process", "costly wrong step", "money", "compliance", "audit", "predictable cost", "open-ended research", "step budget", "rigidity"],
    followUps: [
      "How would you move from a workflow to an agent gradually?",
      "How do you evaluate each design?",
      "What goes in the review queue, and who owns it?",
    ],
  },
  {
    id: "agents-c12-q04",
    course: "agents",
    category: "frameworks",
    level: "core",
    chapterId: "agents-12-deterministic-workflows",
    question: "How would you build a router workflow in LangGraph?",
    idealAnswer:
      "I use a StateGraph over a TypedDict state. Each stage is a node, a function that reads the state and returns the keys it changes. The classify node asks the model for one label from a fixed list, and it writes the label into the state. A check node follows it, in plain code. It confirms the label is in the list and allowed for the state. Then it writes the final route, or the review queue as the fallback. Then I add a conditional edge from the check node. Its function reads the final route from the state, and a mapping turns each route into the next node. The other edges are fixed. I compile the graph and invoke it with a request ID, and I add a checkpointer so the state is saved after each node. The one node I always write myself is the check node, because the framework won't write it for me.",
    keywords: ["StateGraph", "node", "add_conditional_edges", "check node", "fallback", "checkpointer", "state", "route"],
    followUps: [
      "Why not let the conditional edge read the model's raw reply?",
      "What would the checkpointer give you?",
      "How would you add a gate before the answer node?",
    ],
  },
];

export default questions;
