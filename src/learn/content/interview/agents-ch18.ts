import type { InterviewQuestion } from "../types";

// Chapter 18 questions. Ids are agents-cNN-qNN.
const questions: InterviewQuestion[] = [
  {
    "id": "agents-c18-q01",
    "course": "agents",
    "category": "orchestration",
    "level": "core",
    "chapterId": "agents-18-handoffs-by-hand",
    "question": "What does a handoff pass between agents, and what does the next agent do with it?",
    "idealAnswer": "A handoff passes the task ID and the shared state, along with a short note on why control moved. The state is one record with a status field. The status takes values from a fixed list, such as new, triaged, researched and done. The next agent loads the state by the task ID and carries on from the status it finds. It doesn't need the previous agent's tool calls or its message history. In my swarm, triage sets the status to triaged and hands to the researcher. The researcher fills in the findings, sets researched and hands to the writer. The writer reads the findings and answers. The note goes to the trace for a person to read. It never drives routing. The fixed status list matters because my code can check every update and refuse a name that is not on the list. Because the state sits in a store under the ID, the same design works across processes. A restart can load the task and carry on.",
    "keywords": [
      "task ID",
      "shared state",
      "status field",
      "fixed statuses",
      "loads by ID",
      "carries on from the status",
      "note",
      "store"
    ],
    "followUps": [
      "Why not pass the whole message history instead?",
      "What goes wrong if the status is free text?",
      "Where does the state live in production?"
    ]
  },
  {
    "id": "agents-c18-q02",
    "course": "agents",
    "category": "orchestration",
    "level": "deep",
    "chapterId": "agents-18-handoffs-by-hand",
    "question": "How is a handoff swarm different from a supervisor, and when would you choose each?",
    "idealAnswer": "In a supervisor, control returns to the central agent after every worker. The supervisor sees every result and picks the next worker. In a handoff swarm, each agent has a handoff tool. Calling it switches the active agent, and control does not come back unless an agent hands it back. No agent holds the whole plan. I choose a supervisor when I need one place to log, audit and cap the run, because every routing decision passes through it. The cost is an extra model call after each worker. I choose a swarm when the route depends on what each agent finds. I also choose it when the agents belong to different teams and can't share a central brain. The cost is that I must build the oversight myself. In practice I mix them. A supervisor runs the main flow, and a handoff passes a task to a specialist team. I say that explicitly, because the choice depends on where I need control, not on which shape sounds more advanced.",
    "keywords": [
      "control returns",
      "control moves on",
      "no central supervisor",
      "active agent",
      "handoff tool",
      "audit",
      "extra model call",
      "mixed design"
    ],
    "followUps": [
      "Which one is easier to debug?",
      "What does the supervisor cost per task?",
      "Can a swarm have a hidden supervisor?"
    ]
  },
  {
    "id": "agents-c18-q03",
    "course": "agents",
    "category": "reliability",
    "level": "senior",
    "chapterId": "agents-18-handoffs-by-hand",
    "question": "What guards do you put on a handoff swarm, and what does each one catch?",
    "idealAnswer": "I put three guards in the shared loop, because a swarm has no centre that could count. The first is an ALLOWED table that says which agent may hand to which. It makes a wrong route impossible and logs the refusal as a stop. The second is a handoff cap on each task, which bounds the cost of any loop I did not foresee. The third is a ping-pong check that looks at the last four agents and stops the run if two of them alternate. It catches the common loop earlier than the cap would. It misses a longer loop, such as the researcher circling between triage and the writer, so I keep the cap as the final guard. I also validate that each status update is on the fixed list. A refused handoff must stop or fall back with a logged reason. It must never vanish quietly, or the task looks alive while nobody works on it. For a task that crosses processes, I make the store let only one worker act on each status.",
    "keywords": [
      "ALLOWED table",
      "handoff cap",
      "ping-pong check",
      "status validation",
      "stop reason",
      "longer loop",
      "one worker per status",
      "bounded cost"
    ],
    "followUps": [
      "What would you set the cap to?",
      "How would you detect a longer loop?",
      "What happens to a task that hits the cap?"
    ]
  }
];

export default questions;
