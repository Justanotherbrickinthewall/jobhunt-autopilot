import type { InterviewQuestion } from "../types";

const questions: InterviewQuestion[] = [
  {
    id: "agents-q01",
    course: "agents",
    category: "fundamentals",
    level: "core",
    chapterId: "agents-01-tool-loop",
    question: "What is the difference between an agent and a workflow, and when do you pick each?",
    idealAnswer:
      "In a workflow, my code fixes the steps and the model fills in the blanks. In an agent, the model picks the next step at run time, usually by choosing a tool inside a loop. I pick a workflow by default. Fixed steps are cheaper, faster and easier to test and to explain. I pick an agent when the path depends on what the tools return and I can't list the branches in advance. On AskPEP, ingesting a PEP is a workflow. So is a cited answer to one question: search, build the prompt, answer. Following a chain of PEPs that replace each other is different. The number of lookups depends on what each one finds, so I give a model the tools and a loop. Autonomy has a cost. It means more model calls, a wider spread in latency, harder evals and more ways to fail. My middle ground is a workflow with one small agentic step inside it. If the agent misbehaves, my fallback is the fixed path.",
    keywords: ["workflow", "agent", "model-chosen steps", "fixed steps", "cost of autonomy", "predictability", "testability", "tool loop"],
    followUps: [
      "Give me an example where you would start with an agent and later replace it with a workflow.",
      "How do you evaluate an agent differently from a workflow?",
      "Where does a human fit in?",
    ],
  },
  {
    id: "agents-q02",
    course: "agents",
    category: "fundamentals",
    level: "core",
    chapterId: "agents-02-tools-for-models",
    question: "How do you design a tool the model will use well?",
    idealAnswer:
      "I treat the tool definition as a contract the model reads. The name, the description and the argument schema do the teaching. The name is a verb and a noun, such as search_peps. The description says when to use the tool, when not to, and what comes back. Arguments are typed. A PEP number is an integer, and a closed set becomes an enum. Each argument gets a short description. I prefer small tools with one job over one large tool with a mode flag. Results are compact and shaped for the model. Errors say how to fix the call. On AskPEP, a bad section name returns a ToolError whose hint lists the valid sections, so the model can retry. A wrapper called safely turns any other fault into the same ToolError. Runtime objects such as the services container stay hidden from the model. Side effects get their own tool, and my code checks permission, not the prompt. Past a dozen tools, selection accuracy drops, so I group or route. I test with a tool-selection eval over real questions.",
    keywords: ["tool contract", "description", "typed arguments", "enum", "small tools", "ToolError with a hint", "hidden runtime", "side effects", "tool selection eval"],
    followUps: [
      "What do you do when you have fifty tools?",
      "How do you shape a tool result so it does not blow up the context?",
      "How would you test a tool description change?",
    ],
  },
  // real Q17
  {
    id: "agents-q03",
    course: "agents",
    category: "orchestration",
    level: "core",
    source: "practice",
    chapterId: "agents-03-langgraph-state",
    question: "Explain LangGraph state, nodes, edges and conditional routing.",
    idealAnswer:
      "In LangGraph, the state is a typed record that every node reads and updates. A node is a function that does one job. It returns only the keys it changed. Edges say which node runs next. A conditional edge is a function of the state that returns the next node name. On the PEP desk the state is DeskState. It holds the messages, the sources, the route and the usage counters. The triage node asks a model for a route. Then it returns Command(goto=route, update={...}), so the decision and the reason travel together. Where two nodes write one key, a reducer says how to merge. The messages use add_messages, the sources use add_sources, and the step and token counters use operator.add. A key with no reducer keeps the last write. The control flow is explicit and bounded. A checkpointer saves the state after each node, so a run can pause or resume. The trade-off is more design up front than a bare loop.",
    keywords: ["state", "node", "edge", "conditional edge", "Command goto", "reducer", "routing", "checkpointer", "bounded loop"],
    followUps: [
      "What happens when two parallel nodes write the same state key?",
      "How do you stop a conditional edge looping forever?",
      "What does the checkpointer give you in production?",
    ],
  },
  {
    id: "agents-q04",
    course: "agents",
    category: "orchestration",
    level: "deep",
    chapterId: "agents-03-langgraph-state",
    question: "Why use a graph framework instead of a simple agent loop?",
    idealAnswer:
      "Often you should not. A loop of call the model, run the tool and append the result is fine for one agent over one search tool. I move to a graph when a loop gets awkward. First, explicit control flow. Routing, validation and retries become named steps that I can test one by one. Second, shared state across several agents, with one rule for each key. Third, durable state. Checkpoints let a run resume after a crash, which matters once the PEP desk's writer files tickets. Fourth, observability, because each node is a span with clear inputs and outputs. The costs are a framework to learn, its abstractions to debug and version churn. So I keep the node logic in plain functions that could move elsewhere. My rule is to start with the loop and write down the first time it hurts. I adopt a graph when the pain is shared state, checkpoints or branching. The fallback is that nodes are plain code, so removing the framework is cheap.",
    keywords: ["simple loop", "explicit control flow", "shared state", "checkpointing", "parallel branches", "observability", "framework cost", "plain functions"],
    followUps: [
      "Which alternative to LangGraph would you consider, and when?",
      "How do you avoid lock-in to the framework?",
      "What breaks when you upgrade the framework?",
    ],
  },
  {
    id: "agents-q20",
    course: "agents",
    category: "orchestration",
    level: "deep",
    chapterId: "agents-03-langgraph-state",
    question: "Two nodes write the same state key. What decides the result, and how do you choose?",
    idealAnswer:
      "The key's reducer decides. A key with no reducer keeps the last write. If two nodes write it in the same round, LangGraph raises InvalidUpdateError. So I give every key that takes several writes a reducer, and I pick it by what the key means. A list that should grow takes a function that merges the new items in. On the PEP desk the sources use add_sources for that. The messages take add_messages, which appends new messages and replaces one with the same id. A counter takes operator.add, so each node returns the amount to add and not a new total. A key that holds the latest value, such as the route, keeps the default, and one node owns it. DeskState uses all of these rules. The risk is a reducer that hides a bug. An appending list can grow without bound, so I watch its size. I read the streamed updates in order to see which node wrote what. My test has two nodes write one key in one round, and it checks the result.",
    keywords: ["reducer", "last write wins", "InvalidUpdateError", "operator.add", "add_messages", "add_sources", "single owner", "same step"],
    followUps: [
      "What does add_messages do when two messages share an id?",
      "When is last write wins the right rule?",
      "How would you test a reducer?",
    ],
  },
  {
    id: "agents-q21",
    course: "agents",
    category: "orchestration",
    level: "deep",
    chapterId: "agents-03-langgraph-state",
    question: "How do you route a question with a model, and what happens when the model fails?",
    idealAnswer:
      "I ask the model for a typed decision and not free text. The schema has a route field limited to an enum of the routes, and a one-sentence reason. On the PEP desk, triage uses structured output with include_raw set to true. That gives me the parsed object and the raw message, so I can read the token usage from the raw message. If the call raises, or the parsed value is None, triage falls back to the researcher. It records a fixed fallback reason, so a trace shows that the fallback happened. The researcher is the safest route, because it only reads. Triage returns Command(goto=route, update=...), so the decision, the reason and the counters move in one return value. Routing costs a model call, so I count its tokens in the same usage totals. I test routing on labelled questions, one set for each route. I also track how often the fallback fires. A rising rate means the schema or the prompt has drifted.",
    keywords: ["structured output", "enum route", "include_raw", "parsed is None", "fallback route", "route_reason", "Command goto", "routing eval"],
    followUps: [
      "Why fall back to the researcher and not refuse?",
      "How would you test the router?",
      "What if the model picks the wrong route with confidence?",
    ],
  },
  {
    id: "agents-q22",
    course: "agents",
    category: "multi-agent",
    level: "deep",
    chapterId: "agents-04-handoffs",
    question: "In a LangGraph multi-agent graph, how does one agent hand the conversation to another, and what goes wrong if the update leaves something out?",
    idealAnswer:
      "The agent calls a transfer tool, and the tool returns a Command. The Command has a goto that names the next agent, and an update. Each desk agent is its own subgraph, so the Command needs graph=Command.PARENT. Without it, the goto is looked up in the agent's own graph and finds nothing. The agent carries on alone, and the tool reply still says the transfer worked. Then the update must carry everything the agent produced, because the agent's graph is abandoned. The messages need a reply to the transfer call, as a ToolMessage with the same tool_call_id. Without it, the model API rejects the conversation. The sources go too, or a citation like [1] points at nothing. The usage delta goes too, so the desk counts each step and token once. A handoff record says who passed to whom, and a ticket goes back if one was opened. I test a handoff with a graph run that checks the target agent ran. A scripted model can pass a test while a reply is missing.",
    keywords: ["Command", "goto", "graph=Command.PARENT", "subgraph", "ToolMessage", "tool_call_id", "add_messages", "usage delta"],
    followUps: [
      "Why does an agent have no static edge out of it?",
      "The model asks for another tool in the same call as the handoff. What do you do?",
      "How can a scripted model test miss a missing reply?",
    ],
  },
  // real Q15
  {
    id: "agents-q09",
    course: "agents",
    category: "multi-agent",
    level: "deep",
    source: "practice",
    chapterId: "agents-05-supervisor-or-handoffs",
    question: "How would you design a multi-agent research pipeline?",
    idealAnswer:
      "I would start by proving the single-agent baseline, then add roles only where they earn their cost. Take a brief on how a Python feature changed across several PEPs. In execution order, a planner turns the topic into research questions. Parallel researchers read the PEPs. A validation step checks and dedups the sources. A synthesis step writes the brief. A verifier checks each claim against its source. All of it shares typed state, so every claim stays tied to its source and its citation. The graph uses explicit nodes and conditional edges, with bounded loops. Steps, tokens and time are capped per branch and in total, and checkpoints save progress. A failed branch then returns a partial brief with its limits stated. Metrics are citation accuracy, claim coverage, cost per brief and latency. The trade-off is that each extra agent adds cost, latency and coordination failures. So I compare the pipeline against one agent holding all the tools, on a fixed set of topics. That single agent is also my fallback.",
    keywords: ["planner", "parallel researchers", "source validation", "dedup", "synthesis", "verification", "typed state", "single-agent baseline", "partial results"],
    followUps: [
      "How do you keep citations attached to claims through the pipeline?",
      "What happens if one researcher branch fails?",
      "How would you evaluate the pipeline against the baseline?",
    ],
  },
  {
    id: "agents-q10",
    course: "agents",
    category: "multi-agent",
    level: "senior",
    chapterId: "agents-05-supervisor-or-handoffs",
    question: "When is a multi-agent system worse than a single agent?",
    idealAnswer:
      "It is worse whenever the extra agents add cost and failure modes without adding quality. Each agent is another model call with its own prompt, so cost and latency rise. Every handoff is lossy, because context gets summarised or dropped, and errors compound along the chain. Debugging gets harder, because a wrong answer could come from any role. Coordination itself can fail: agents repeat each other's work, disagree, or loop passing a task back and forth. A single agent with good tools is usually better when the task fits one context window. It is also better when the steps are sequential and depend on each other, and when you cannot yet show a quality gain. Multiple agents earn their place with real parallelism, with different tool or permission sets that should be separated, or when a context would otherwise overflow. My test is an eval: same tasks, same tools, single agent against pipeline, measuring quality, cost per successful task and latency. If the pipeline does not beat the baseline by enough to pay for itself, I ship the baseline. The fallback is to collapse roles back into one prompt.",
    keywords: ["coordination failures", "handoff loss", "cost and latency", "compounding errors", "baseline", "parallelism", "permission separation", "context overflow"],
    followUps: [
      "What gain would justify the extra cost?",
      "Which pattern would you try first, supervisor, handoff or parallel?",
      "How do you debug a wrong answer from a pipeline?",
    ],
  },
  // real Q16
  {
    id: "agents-q05",
    course: "agents",
    category: "control",
    level: "core",
    source: "practice",
    chapterId: "agents-06-budgets-and-stopping",
    question: "How do you stop agents repeating searches or running forever?",
    idealAnswer:
      "I put the limits in code and not in the prompt. A run has a budget for steps, tokens and time. The desk checks it before every model call, in that order. When one trips, the run stops with a fixed message and a typed stop reason, such as step_budget or token_budget. To catch repeated calls, I compare tool calls. The desk reads the last three calls after the user's last message. If all three have the same name and the same arguments, with the arguments sorted, it stops with the reason loop. LangGraph's own recursion limit is a backstop, and a run that hits it is marked stopped too. A dedup key is one more idea. I hash a normalised query with the tool name, and I return the earlier result for a repeat. The metric I watch is the share of runs that end on each stop reason. The trade-off is that tight budgets cut off hard but legitimate questions, so I tune them from traces. The repeated-call check has one limit: a repeat with reworded arguments passes it.",
    keywords: ["step budget", "token budget", "time budget", "repeated-call check", "stop reason", "recursion limit", "dedup key", "sorted arguments"],
    followUps: [
      "How aggressive should query normalisation be?",
      "Which budget do you expect to trip first, and why?",
      "How do you pick the step limit?",
      "What does the repeated-call check miss?",
    ],
  },
  {
    id: "agents-q06",
    course: "agents",
    category: "control",
    level: "deep",
    chapterId: "agents-06-budgets-and-stopping",
    question: "Your agent hits its budget halfway through. What does the user get?",
    idealAnswer:
      "The user gets a clear stop and the real reason. They don't get a bare failure, and they don't get an answer that pretends to be complete. On the PEP desk, a middleware hook runs before every model call. When a budget would break, it jumps to the end of the run with a fixed message and a typed stop reason. The run is marked stopped and carries no citations. A caller can read the reason and decide whether to retry or hand the question to a person. A richer design makes one last model call with the tools off, to report what was found. That reads better, but it spends more after the budget is gone, and the model can overclaim. So I start with the fixed message. Two gaps remain. A call that is already running isn't interrupted, and tokens are counted after a call returns, so a run can overshoot. I log the budget that tripped, because the stop-reason rate tells me whether my limits are wrong.",
    keywords: ["stop inside the loop", "before_model", "fixed message", "stop reason", "stopped status", "no citations", "last call with tools off", "overshoot"],
    followUps: [
      "How do you stop the model overclaiming in a partial answer?",
      "Would you let the user extend the budget and resume?",
      "What do you log when a budget trips?",
    ],
  },
  // real Q74
  {
    id: "agents-q18",
    course: "agents",
    category: "production",
    level: "deep",
    source: "practice",
    chapterId: "agents-05-supervisor-or-handoffs",
    question: "Your agent run is slow and expensive. How do you find out why?",
    idealAnswer:
      "I instrument every node and read a trace. Each node records its start, its duration, its input and output tokens, its model and its retries. Cost is tokens times a versioned price, worked out when the span is written. Then I read the trace column by column. Time points at the slow node and tokens point at the costly one. They are usually different nodes. Say an outside API call took 6.2 seconds and used no tokens, while one model call read 11,500 input tokens. The API is the slow node, and the model call is the costly one. Latency fixes take work off the critical path, such as running a call in parallel or sending an email after the answer. A branch that is already off the critical path saves nothing. Cost fixes cut tokens. Say 7,000 of those 11,500 tokens were a raw search result. Trimming it leaves 4,500 on that call. I would try a smaller model only after an eval run shows quality holds. I track p95 latency per node, cost per successful task and tokens per step.",
    keywords: ["per-node trace", "critical path", "tokens", "cost per successful task", "p95 latency", "tool result trimming", "parallel", "versioned price table"],
    followUps: [
      "How would you alert on cost drift for one node?",
      "What do you do if the slow node is an external API you do not own?",
      "How do you prove a smaller model did not hurt quality?",
    ],
  },
  // real Q18
  {
    id: "agents-q07",
    course: "agents",
    category: "tools",
    level: "core",
    source: "practice",
    chapterId: "agents-07-side-effects-and-durable-runs",
    question: "How do you handle tool failures, retries and side effects?",
    idealAnswer:
      "I sort failures first, because each kind needs a different response. Before a call, my code validates the arguments. A bad argument goes back to the model as a ToolError with a hint, so it can fix the call. On the PEP desk, a wrapper called safely turns a fault or bad input into that ToolError, so a failing tool never crashes the run. A permission failure stops the run or escalates. A timeout or a rate limit is transient, so I retry a bounded number of times with backoff and jitter. Reads are safe to retry. For a side effect, such as open_ticket, I build an idempotency key in code, so a repeat files nothing new. If the response is lost, the outcome is unknown. I check what exists before I retry, and I report the outcome as unknown if I can't tell. The metrics are retry rate, unknown-outcome count and duplicate tickets, which should be zero. The trade-off is extra latency and code on the write path. For anything still unknown, the fallback is a human review item and not a blind retry.",
    keywords: ["validation", "ToolError with a hint", "safely wrapper", "transient errors", "backoff with jitter", "idempotency key", "unknown outcome", "check before retry"],
    followUps: [
      "Which errors should the model see and which should your code swallow?",
      "How do you tell a transient error from a permanent one?",
      "What does compensation look like when a ticket was filed by mistake?",
    ],
  },
  {
    id: "agents-q08",
    course: "agents",
    category: "tools",
    level: "senior",
    chapterId: "agents-07-side-effects-and-durable-runs",
    question: "How do you design an idempotency key for a write such as filing a ticket?",
    idealAnswer:
      "The key must be the same on every retry of one intent and different for a different intent. So I derive it from the content of the request and not from the call. A call id, a random value and the clock all change on a retry, so each makes a retry look new. On the PEP desk, code builds the key from the thread id, the normalised title and the sorted PEP numbers, then hashes them with SHA-256. The model never supplies it. I normalise the title, so a stray space doesn't make a new key. I leave the body out, because a retrying model may reword it. The thread id scopes the key. The same request next week, in a new conversation, is a new ticket. The database enforces the key with a unique constraint and ON CONFLICT DO NOTHING, and a repeat returns the existing row. That key never expires, because it lives in the ticket row. A payment API that expires keys needs a window longer than any retry horizon. The limit is that a reworded title files a second ticket.",
    keywords: ["idempotency key", "derived not random", "built in code", "normalised title", "thread scope", "body left out", "unique constraint", "ON CONFLICT", "key expiry"],
    followUps: [
      "What happens if the key is stored but the result never was?",
      "How long should keys live?",
      "What if the downstream system has no idempotency support?",
    ],
  },
  // real Q73
  {
    id: "agents-q17",
    course: "agents",
    category: "production",
    level: "senior",
    source: "practice",
    chapterId: "agents-07-side-effects-and-durable-runs",
    question: "How do you make a long-running agent survive a crash and a multi-day human approval without repeating side effects?",
    idealAnswer:
      "I save two things, and each answers a different question. A Postgres checkpointer saves state after every node, so I know what finished. A table of writes records what each write did. On the PEP desk that table is tickets, and its unique idempotency key is the ledger. When I continue the thread, finished nodes are skipped. The node that crashed runs again from its first line. Its ticket call carries the same key, so the database returns the existing row and files nothing new. The key comes from the thread, the title and the PEP numbers, so a wrong guess is harmless. Over days, two things bite. A run that pauses for a person resumes the paused node from its first line, so side effects go after the pause. And a key that expires would be gone after a two-day wait, so a key must outlive the longest resume window. Tokens are fetched at call time and never stored in state. I would use the framework checkpointer first. I would move to Temporal or Durable Functions only when runs span services or weeks.",
    keywords: ["checkpointer", "Postgres", "thread id", "ledger table", "unique key", "skip finished nodes", "re-run the crashed node", "pause for a person", "key expiry", "resume"],
    followUps: [
      "What happens if the process dies after the ticket insert but before the node ends?",
      "Why is the checkpoint alone not enough to stop a duplicate?",
      "When would you choose Temporal over the framework checkpointer?",
    ],
  },
  {
    id: "agents-q23",
    course: "agents",
    category: "tools",
    level: "deep",
    chapterId: "agents-07-side-effects-and-durable-runs",
    question: "A crash replays a tool call. How do you stop it filing two tickets?",
    idealAnswer:
      "I make the call safe to repeat, so the replay finds the ticket already filed. Code builds an idempotency key from the thread id, the normalised title and the sorted PEP numbers, and hashes them. The model never supplies it. I leave the body out, because a retrying model may reword it. The insert uses a unique constraint on the key, with ON CONFLICT DO NOTHING and RETURNING id. If a row comes back, this call made the ticket, and the status is created. If no row comes back, the ticket already existed. I select it and return it with the status existing. The model sees the same ticket id either way, so its answer reads the same. The key and the checkpointer work as a pair. The checkpointer skips finished nodes, and the key protects the one node that runs again. The limit is a reworded title. It files a second ticket, because the key is built from the title. I accept that for now, because a fuzzy match could merge two different requests.",
    keywords: ["idempotency key", "built in code", "normalised title", "unique constraint", "ON CONFLICT DO NOTHING", "RETURNING", "created or existing", "checkpointer pair"],
    followUps: [
      "Why leave the body out of the key?",
      "What if two requests arrive at the same instant?",
      "What happens when the title is reworded?",
    ],
  },
  {
    id: "agents-q24",
    course: "agents",
    category: "production",
    level: "core",
    chapterId: "agents-07-side-effects-and-durable-runs",
    question: "What does a checkpointer save, and what runs again when you continue?",
    idealAnswer:
      "A checkpointer saves the graph's state after every node, filed under a thread id. Each save is a checkpoint. When I continue a thread, LangGraph loads the last checkpoint. Finished nodes are skipped. The node that crashed runs again from its first line. That last point matters. A node that made a side effect before it crashed makes it again, so side effects need an idempotency key. On the PEP desk, continue_desk runs the graph with no new input, which tells LangGraph to resume from the checkpoint. A thread that already finished returns the same answer and calls no model. The saver decides what survives. InMemorySaver survives an exception but not a dead process. PostgresSaver keeps checkpoints in the database, so a new process can continue the thread. A function called build_durability picks one from a setting, and local mode with no database always gets memory. To check a run, I read get_state. A non-empty next field means the run stopped early.",
    keywords: ["checkpointer", "checkpoint", "thread id", "skips finished nodes", "re-runs the crashed node", "continue_desk", "PostgresSaver", "InMemorySaver", "build_durability", "get_state"],
    followUps: [
      "Why must a tool be safe to run twice?",
      "What does a new thread id give you?",
      "How do you know a run stopped early?",
    ],
  },
  // real Q69
  {
    id: "agents-q13",
    course: "agents",
    category: "context",
    level: "deep",
    source: "practice",
    chapterId: "agents-08-context-and-memory",
    question: "Your agent's context fills up on a long task. What do you do?",
    idealAnswer:
      "I treat the context window as a budget and work in a fixed order: measure, cap, trim, summarise, then write things down. First I measure. Every call resends the whole history. A 30-step run that adds 3,250 tokens per step sends about 1.5 million input tokens, and tool results are most of the growth. Second, I cap and shape tool results, returning ids and the fields the next step needs. That loses little and costs nothing. Third, I trim what the model sees on each call. On the PEP desk, a middleware hook on the model call shows the agent only the newest messages that fit its budget. The stored thread stays whole. Fourth, before the context window is nearly full, I summarise the old part. I tell the summary to keep the task word for word, the open questions and the exact PEP numbers. I keep the last few messages as they are. Durable facts go to a memory store. I check a summary by replaying the next step. Each summary breaks the cache prefix and loses detail, so I summarise rarely and by a lot.",
    keywords: ["token budget", "resends the whole history", "cap tool results", "trim to budget", "summarise", "open questions", "exact ids", "last few messages", "cache prefix", "memory store"],
    followUps: [
      "How do you know the summary lost nothing important?",
      "What does summarising do to prompt caching?",
      "When would you use a sub-agent instead of summarising?",
    ],
  },
  // real Q70
  {
    id: "agents-q14",
    course: "agents",
    category: "context",
    level: "senior",
    source: "practice",
    chapterId: "agents-08-context-and-memory",
    question: "How do you give an agent memory across sessions without polluting it?",
    idealAnswer:
      "I separate two things. The thread holds one conversation, and the checkpointer saves it. Long-term memory outlives the thread, and it accepts writes only through a policy in code. On the PEP desk, the model never decides what to remember. Code writes a note only when the user's own message says to remember something. Text from a tool result, a retrieved PEP or any third party never becomes a note. That closes the memory-poisoning route. Each note is scoped to the user_id. Its key is a hash of the lower-cased text, so a repeat writes nothing and the first copy stays. On read, the desk finds a few notes by word overlap with the question and shows them to the model. The desk has no review date or expiry yet, and I would add both. For a fact that matters, I re-check it against the system of record. The trade-off is recall against risk. A strict policy forgets useful things. For borderline writes, a person can check the note before it is saved.",
    keywords: ["thread against store", "write policy", "user scope", "untrusted text", "memory poisoning", "hashed key", "word-overlap recall", "expiry", "system of record"],
    followUps: [
      "How would you detect that a bad memory has already been stored?",
      "Who deletes a memory when a customer asks for their data to be removed?",
      "Why not let the model decide what is worth remembering?",
    ],
  },
  // real Q71
  {
    id: "agents-q15",
    course: "agents",
    category: "tools",
    level: "deep",
    source: "practice",
    chapterId: "agents-02-tools-for-models",
    question: "Your agent has forty tools and keeps choosing the wrong one. What do you change?",
    idealAnswer:
      "I would measure before I change anything. I build about twenty real questions, each with the tool the agent should call first, and run each one five times. The wrong first calls show me which pairs of tools get confused. Usually the cause is near-duplicate tools or thin descriptions. So I merge tools by task, not by endpoint, and I keep every write in a tool of its own. Then I rewrite the descriptions to say what the tool returns, when not to use it and which neighbour to use instead. I run the set again, and I trust the gain only if it beats the run-to-run spread. With forty tools, the definitions also cost tokens on every model call. Past about a dozen, I load definitions on demand from a short index. The same rules hold for MCP servers. I wrap third-party tools behind my own definitions, because I can fix and test those. The trade-off is that deferred loading adds a search step and a possible miss. If the miss rate stays high, the fallback is a fixed workflow that routes the question to the right tool before the model chooses.",
    keywords: ["first-tool miss rate", "confused pairs", "merge by task", "near duplicates", "description rewrite", "run-to-run spread", "deferred loading", "MCP wrapper"],
    followUps: [
      "How do you know a description change helped and was not noise?",
      "Why keep writes in separate tools when you are merging reads?",
      "What do you do about tools that come from a third-party MCP server?",
    ],
  },
  // real Q72
  {
    id: "agents-q16",
    course: "agents",
    category: "tools",
    level: "senior",
    source: "practice",
    chapterId: "agents-02-tools-for-models",
    question: "A tool returns thousands of tokens and the agent gets worse over a long run. How do you reshape the response?",
    idealAnswer:
      "I reshape the response to what the next step needs, because every tool result is resent on each later step. A 4,000-token result at step three of a 30-step run costs 108,000 tokens, since 27 later calls carry it. So I return ids and the few fields that choose between rows, and I put detail behind a second call. I paginate with a cursor. When I cut a result, I say how many matched, how many I returned and how to get the rest. Silent truncation makes the model report a partial list as complete. I also sort for the task, so the cut keeps the rows the next step needs. I check the change with a test: does the next step still succeed on the trimmed version? In traces I watch tokens per result, tokens per run and task success. The trade-off is an extra call when the model wants detail. If a trimmed result loses accuracy, the fallback is to restore the one field the failing case needed, not to restore everything.",
    keywords: ["tool result size", "resent each step", "ids over blobs", "pagination cursor", "truncate with a hint", "sort order", "detail behind a second call", "tokens per run"],
    followUps: [
      "Why does the sort order matter when you truncate?",
      "How would you find which tool is the biggest source of bloat?",
      "What does the model do wrong when truncation is silent?",
      "How does prompt caching change the cost, and what does it not change?",
    ],
  },
  // real Q19
  {
    id: "agents-q11",
    course: "agents",
    category: "protocols",
    level: "deep",
    source: "practice",
    chapterId: "agents-09-serving-and-alternatives",
    question: "How do you expose a LangGraph workflow as an API?",
    idealAnswer:
      "I wrap it in a service layer, for example FastAPI, with a clear contract. The request schema carries the user input, a thread id for conversation state and optional budget overrides within server limits. The response schema carries the answer, a status of complete or partial, the limits hit, citations and a run id. In execution order: authenticate the caller, authorise the request and create a run id. Then invoke the graph with a budget and a timeout, and map the result to the response. Secrets live in config, and errors return a stable code, never internals or stack traces. For long runs, I return a job id straight away and run the graph in a background process. I offer a status endpoint, plus streamed events for progress. I instrument latency per node, tool and model call, and tag all of it with the run id. The metrics are p95 latency, error rate by type, budget-hit rate and cost per run. The trade-off is sync simplicity against async complexity. The fallback on a timeout is a partial response with the run id so the caller can poll.",
    keywords: ["FastAPI", "request schema", "response schema", "authn and authz", "run id", "timeouts and budgets", "job id", "status endpoint", "streaming events", "per-node latency"],
    followUps: [
      "How do you stop a client sending a huge budget?",
      "Sync endpoint or job id: how do you decide?",
      "What goes in the error response?",
    ],
  },
  // real Q20
  {
    id: "agents-q12",
    course: "agents",
    category: "protocols",
    level: "core",
    source: "practice",
    chapterId: "agents-09-serving-and-alternatives",
    question: "What is MCP versus A2A?",
    idealAnswer:
      "MCP, the Model Context Protocol, standardises how an AI application reaches tools and context exposed by servers. It is about the connection between an agent and its capabilities: a client in the app talks to servers that offer tools, resources and prompts. A2A, the Agent2Agent protocol, lets one agent call an agent that another team runs, so separate agents can coordinate. An agent in one system can hand work to an agent in another and follow the task. So MCP is agent to tool, and A2A is agent to agent. I use MCP when I want a standard interface to a data source or a tool. Any compatible client can then use it, which is what I did for the AskPEP MCP server from course 1. I would reach for A2A only when independent agents, perhaps owned by different teams or vendors, must collaborate. Often neither is needed, and plain function calling or a REST API is enough. The trade-off is standard interfaces against extra moving parts and security surface. A2A is newer and the ecosystem is still settling, so I would check current details before committing.",
    keywords: ["MCP", "A2A", "agent to tool", "agent to agent", "servers and clients", "tools and resources", "interoperability", "function calling", "ecosystem still settling"],
    followUps: [
      "When would plain function calling be enough?",
      "What are the security risks of connecting to a third-party MCP server?",
      "How would you authenticate an MCP server over HTTP?",
    ],
  },
  {
    id: "agents-q19",
    course: "agents",
    category: "orchestration",
    level: "core",
    chapterId: "agents-09-serving-and-alternatives",
    question: "Which agent framework would you pick, and why?",
    idealAnswer:
      "I name the constraints first, because they pick the framework. There are four. Who operates the runtime? Which models does the agent call? How does a run resume after a crash? How do clients get streamed results? Then I match a framework to each answer. LangGraph fits when I want explicit state, checkpoints and routing I can test, on infrastructure I run. Deep Agents shares the LangGraph runtime, so checkpoints carry over and it costs the least to adopt. Google's Agent Development Kit fits a team that already deploys on Google Cloud with Gemini and a managed runtime. The OpenAI Agents SDK fits a small loop on OpenAI models. CrewAI fits role-based crews. I price the switch next. Node logic in plain functions moves easily. State schemas and checkpoints don't. What survives a switch is the event contract that clients see, and the golden set. I prove a port by running the golden set on both versions, and I ship only if nothing regresses. I stay on LangGraph while state and durable runs are the pain.",
    keywords: ["constraints first", "runtime operator", "model provider", "resume behaviour", "streaming contract", "switch cost", "event contract", "golden set", "LangGraph", "Google ADK"],
    followUps: [
      "How do you stop a port from changing answers?",
      "What would make you stay on LangGraph?",
      "What does a port to ADK keep, and what does it rewrite?",
    ],
  },
];

export default questions;
