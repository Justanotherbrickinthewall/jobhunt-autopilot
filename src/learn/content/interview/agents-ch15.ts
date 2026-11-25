import type { InterviewQuestion } from "../types";

// Chapter 15 questions.
const questions: InterviewQuestion[] = [
  {
    "id": "agents-c15-q01",
    "course": "agents",
    "category": "orchestration",
    "level": "core",
    "chapterId": "agents-15-parallel-fan-out",
    "question": "When would you use parallel fan-out, and what does it cost?",
    "idealAnswer": "I use fan-out when a question splits into independent sub-questions. Each one must be answerable without the others' output. A splitter call breaks the question up, workers answer at once, and code merges the results in a fixed order. The gain is latency. Wall time drops to the slowest sub-question instead of the sum of all of them. The cost is that nothing else drops. Total model calls and tokens stay the same, because every sub-question still needs its own work. A split also adds one call, and a burst of parallel calls reaches rate limits sooner. On the PEP desk, giving the key fact from three PEPs is a good fit, because each lookup reads its own PEP. Finding the PEP that replaced another, then summarising it, is a poor fit. The second step needs the first step's answer. I would measure the wall time and the call count before and after. I keep fan-out only if the time saving matters to the user.",
    "keywords": [
      "independent sub-questions",
      "splitter",
      "merge in a fixed order",
      "wall time",
      "slowest sub-question",
      "same calls and tokens",
      "rate limits"
    ],
    "followUps": [
      "How do you decide the number of workers?",
      "What would you measure to prove it was worth it?",
      "When is the extra split call not worth paying?"
    ]
  },
  {
    "id": "agents-c15-q02",
    "course": "agents",
    "category": "reliability",
    "level": "deep",
    "chapterId": "agents-15-parallel-fan-out",
    "question": "One worker in a fan-out times out and another fails. What does your system return?",
    "idealAnswer": "It returns a partial answer that says what is missing. All workers share one timeout, not one each, so the total wait is bounded. When the timeout passes, any worker that hasn't finished is marked timed out. A worker that raised is marked failed with its error. The merge walks the sub-questions in id order and keeps every answer that arrived. It then appends a line naming each missing sub-question and the reason. The user gets what the system knows and sees exactly what it doesn't. I would not fail the whole answer, and I would not hide the gap. A silent gap reads as a complete answer, which is worse than an error. In Python a timeout stops the wait and leaves the thread running. So I also set a timeout on each model call. For critical sub-questions I can retry once before I mark them missing. The caller can then decide whether a partial answer is acceptable.",
    "keywords": [
      "shared timeout",
      "partial answer",
      "name the missing sub-question",
      "id order",
      "retry",
      "model call timeout",
      "thread keeps running"
    ],
    "followUps": [
      "When would you fail the whole request instead?",
      "How would you retry only the failed sub-questions?",
      "How do you log which sub-questions were missing?"
    ]
  },
  {
    "id": "agents-c15-q03",
    "course": "agents",
    "category": "reliability",
    "level": "senior",
    "chapterId": "agents-15-parallel-fan-out",
    "question": "Fan-out returned a fluent wrong answer and no error. What went wrong, and how do you prevent it?",
    "idealAnswer": "The likely cause is a split that cut a dependent question into sub-questions that were not independent. Say the question is which Python version added the feature PEP 572 introduced. The splitter makes 'what does PEP 572 add' and 'which version added that feature' two parallel sub-questions. Then the second worker never sees the first answer. It guesses a feature, answers confidently, and the merge joins both. Nothing times out or raises, so no monitor fires. I prevent it in three ways. The splitter must return a depends_on list for each sub-question, and code must check it. Dependent sub-questions run in order and receive the earlier answers as context. And I add dependent questions to the splitter's evals, because the split decision is where the risk sits. Where I can, I also check the merged answer against a rule. For example, a version number must match the feature's record. Fan-out is cheap when the split is right and expensive when it is wrong.",
    "keywords": [
      "dependent split",
      "depends_on",
      "run in order",
      "context",
      "split evals",
      "no error",
      "confident wrong answer"
    ],
    "followUps": [
      "How would you evaluate the splitter?",
      "Could the model itself judge independence?",
      "Where would you add a check on the merged answer?"
    ]
  },
  {
    "id": "agents-c15-q04",
    "course": "agents",
    "category": "frameworks",
    "level": "deep",
    "chapterId": "agents-15-parallel-fan-out",
    "question": "How does fan-out map to map-reduce, and how do you build it in LangGraph?",
    "idealAnswer": "Fan-out with a merge is map-reduce. The map step runs one job, a worker, over many inputs, the sub-questions. The reduce step combines the results, which is my merge. In LangGraph I use the Send API. A conditional edge after the split node returns one Send for each sub-question. Each Send names the worker node and its input. The branches run in the same graph step. The results key carries a reducer, such as operator.add on a list, so the answers from all branches are collected. A merge node then sorts by id and builds the final text. Arrival order is not fixed, so I carry the id with every result. What the framework does not decide for me is the policy. I still choose the timeout, the handling of a failed branch, the dependency check and how the merge names a missing sub-question. By hand I write a thread pool and a timeout. In LangGraph the pool is hidden, and the policy stays mine.",
    "keywords": [
      "map-reduce",
      "Send API",
      "conditional edge",
      "reducer",
      "operator.add",
      "id on every result",
      "merge node",
      "policy"
    ],
    "followUps": [
      "How does a failed branch behave in LangGraph?",
      "How would you cap concurrency?",
      "When would you skip the framework and use a thread pool?"
    ]
  }
];

export default questions;
