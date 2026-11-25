import type { InterviewQuestion } from "../types";

// Chapter 13 questions. Ids are agents-c13-qNN.
const questions: InterviewQuestion[] = [
  {
    "id": "agents-c13-q01",
    "course": "agents",
    "category": "orchestration",
    "level": "core",
    "chapterId": "agents-13-plan-and-execute",
    "question": "What is plan-and-execute, and when does it beat a ReAct loop?",
    "idealAnswer": "Plan-and-execute has a planner call write a numbered list of steps once. An executor then works each step, as a direct tool call or a small loop. A final call writes the answer from the results. The model picks the steps once and code owns the order after that. It beats a ReAct loop when I can list the parts before I start. One example is to read one PEP, look up a version, then search for it. Direct steps need no model call, so the run costs the planning call and the write-up plus any loop steps. A ReAct loop pays a model call for every tool it picks, and it re-sends a growing history. I still choose ReAct when the next step depends on what the last one found. On the PEP desk the clean plan made four calls, the same as the loop, but used fewer tokens. The saving is real only when most steps are direct.",
    "keywords": [
      "planner",
      "executor",
      "direct tool call",
      "replanner",
      "model calls",
      "ReAct",
      "write-up",
      "tokens"
    ],
    "followUps": [
      "What does a clean run cost in model calls?",
      "How do you handle a step that needs an earlier result?",
      "When would you not use it?"
    ]
  },
  {
    "id": "agents-c13-q02",
    "course": "agents",
    "category": "orchestration",
    "level": "deep",
    "chapterId": "agents-13-plan-and-execute",
    "question": "How do you handle a plan that goes wrong in the middle of a run?",
    "idealAnswer": "I treat a failed step as the trigger for a replan. Code decides that a step failed: the tool returned an error, or a search found nothing. The executor then calls a replanner with the question, the finished results, the failed step with its error and the steps still waiting. The replanner returns a new list for the failed step and what follows, and it never touches finished work. I cap the replans, usually at one or two, because a replanner is a model and can return the same bad step again. After the cap, the failure goes into the results and the run carries on, and the writer must say what it could not find. I also make the tool error list the valid choices, so the replanner can fix a bad name or argument. The three failures I look for are a stale plan, an invented tool and a hidden dependency between steps.",
    "keywords": [
      "replan",
      "cap",
      "ToolError",
      "stale plan",
      "invented tool",
      "hidden dependency",
      "finished results",
      "writer"
    ],
    "followUps": [
      "What goes into the replanner's prompt?",
      "How would you check tool names before the first step?",
      "How do you test the failure path?"
    ]
  },
  {
    "id": "agents-c13-q03",
    "course": "agents",
    "category": "orchestration",
    "level": "senior",
    "chapterId": "agents-13-plan-and-execute",
    "question": "What is ReWOO, and what does it trade away?",
    "idealAnswer": "ReWOO, reasoning without observation, has the planner write every tool call at the start. A later call can name an earlier result with a placeholder such as #E2. The executor swaps each placeholder for the real result and calls the tool, so it makes no model call per step. A run costs two calls: one to write the plan and one to write the answer. On the PEP desk it made two calls and 299 rough tokens, against four calls and 764 tokens for a tool loop. The price is that the planner cannot read any result before it plans. A step that needs to look at a result and then decide has no place in it. A wrong placeholder also fails quietly, because nothing between steps checks the evidence. I use it when the calls are known and the data flows in a straight line, and I validate the plan before running it. For anything open-ended I use a tool loop.",
    "keywords": [
      "ReWOO",
      "placeholder",
      "#E",
      "two calls",
      "no model call per step",
      "planner",
      "tokens",
      "validate the plan"
    ],
    "followUps": [
      "How would you validate a ReWOO plan?",
      "What breaks when a tool returns an unexpected shape?",
      "How does it differ from plan-and-execute?"
    ]
  }
];

export default questions;
