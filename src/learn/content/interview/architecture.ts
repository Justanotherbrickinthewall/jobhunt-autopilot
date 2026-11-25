import type { InterviewQuestion } from "../types";

const questions: InterviewQuestion[] = [
  // was llmops-q05
  // real Q25
  {
    id: "architecture-q01",
    course: "architecture",
    category: "routing",
    level: "deep",
    chapterId: "architecture-02-models-and-routing",
    source: "practice",
    question: "How would you route requests across models and fall back when a provider fails?",
    idealAnswer:
      "I would route with plain rules first, on task type, risk, complexity, context size, latency and budget. Easy tasks such as classification go to a small model. Rare, high-risk steps go to a strong one. A learned router comes later, once I have labelled data on which route succeeded. For failure, I would set timeouts and handle rate limits with backoff. I would add a circuit breaker per provider. It opens after a run of failures, rejects calls without hitting the provider, and probes after a cooldown. Fallback has limits: one fallback attempt per request, inside the request deadline, with a capacity check on the fallback's quota. Every route, including the fallback, passes the same schema validation and the same quality gate, so an outage does not lower the bar. I would alert on fallback rate and test the fallback with a regular drill. Then I would monitor quality per route, so a weak route cannot hide inside the average. The trade-off is complexity. Each route is something to test and monitor, so I would keep the number of routes small and justify each with a measured saving.",
    keywords: ["routing rules", "risk", "circuit breaker", "fallback limit", "schema gate", "quality per route", "timeouts", "rate limits", "fallback drill"],
    followUps: [
      "What are the three states of a circuit breaker?",
      "How do you stop a fallback from silently lowering quality?",
      "When would you use a learned router?",
    ],
  },
  // was llmops-q06
  // CHECK: architecture-q02 names LiteLLM (open source, needs hosting), Portkey, OpenRouter, Azure API Management as an AI gateway, and cross-region inference on Amazon Bedrock. None was read in current docs. Confirm that each exists and does what the answer says.
  {
    id: "architecture-q02",
    course: "architecture",
    category: "routing",
    level: "core",
    chapterId: "architecture-02-models-and-routing",
    question: "Would you put an LLM gateway in front of your providers?",
    idealAnswer:
      "It depends on how many teams and providers there are. For one service and one or two providers, I would keep a small router module in my own code. A gateway adds a hop, a failure point and another place where prompts pass through. I would add a gateway when several teams call models, when I need central keys and spend limits, or when providers change often. A gateway centralises routing rules, fallback, retries, rate limits and logging, so each team does not rewrite them. Real options include LiteLLM, which is open source and needs hosting, and Portkey. Others are OpenRouter, Azure API Management used as an AI gateway, and cross-region inference on Amazon Bedrock for capacity. Before choosing one I would check what it logs and who can read prompts. I would also check where it runs, its added latency and what happens when it is down. The privacy and guardrail rules I apply to my own code apply to the gateway too. The gateway does not remove the need for per-route quality monitoring or for a final quality gate. It only puts the policy in one place.",
    keywords: ["gateway", "central policy", "extra hop", "LiteLLM", "Portkey", "OpenRouter", "Azure API Management", "Bedrock", "privacy", "own router module"],
    followUps: [
      "What new failure modes does a gateway add?",
      "What would you check about its logging?",
      "Could you start without one and add it later?",
    ],
  },
  // was llmops-q07
  // real Q54
  {
    id: "architecture-q03",
    course: "architecture",
    category: "async",
    level: "deep",
    chapterId: "architecture-05-serving-shape",
    source: "practice",
    question: "How do you separate synchronous API work from long-running AI jobs?",
    idealAnswer:
      "I keep the request path short and move long work into a job. The path is: validate the input, write a job record, enqueue or start an orchestration, and return a job id with a 202 response. The row is written before the message, so a crash leaves something I can find and retry. The client sends an idempotency key, so a retried submission returns the same job. Workers process the job with bounded concurrency, sized with arrival rate times job time and capped by provider rate limits. They retry transient failures with backoff and jitter, and the work is idempotent so a retry cannot repeat a side effect. After a fixed number of attempts, the item goes to a dead-letter queue with its reason. Jobs have explicit states: queued, running, succeeded, failed and needs-review. A running job holds a lease, so a dead worker's job returns to the queue. Callers read state from a status endpoint, or get a callback or event. Metrics are queue age, backlog and dead-letter depth. The trade-off is complexity. I would keep fast, user-waiting work, such as streaming chat, synchronous, and put only slow, fan-out or unattended work into jobs.",
    keywords: ["short request path", "job record", "enqueue", "job id", "idempotency key", "bounded concurrency", "dead-letter queue", "job states", "lease", "status endpoint"],
    followUps: [
      "Why write the job row before enqueueing?",
      "How many workers do you need for 2 jobs a second at 30 seconds each?",
      "What is the needs-review state for?",
    ],
  },
  // was llmops-q08
  {
    id: "architecture-q04",
    course: "architecture",
    category: "caching",
    level: "senior",
    chapterId: "architecture-05-serving-shape",
    question: "Should we add a semantic cache?",
    idealAnswer:
      "Not first, and not without measuring. I would start with an exact response cache, because it is safe if the key is right. The key carries the model and version, the prompt version and the normalised input. It also carries the user's permission scope and the version of the data behind the answer. Then I would ask what a semantic cache adds. It raises the hit rate, but it returns the answer to the nearest earlier question. Embeddings treat a changed PEP number, version or rule as a small change when the answer changes completely. A question about PEP 8 and the same question about PEP 257 sit very close together, so no sensible threshold removes every wrong match. My recommendation is a staged one. Collect real query pairs, label which are truly equivalent, and measure the wrong-answer rate at several thresholds. Only launch for a narrow class of questions that do not depend on a PEP number, a version or a user. Keep the PEP number in the exact part of the key. Add a time limit and invalidation on data change. Monitor wrong-answer reports and be ready to switch it off. If the wrong-answer rate is not near zero for that class, I would not ship it.",
    keywords: ["exact cache", "cache key", "permission scope", "similarity threshold", "wrong answers", "PEP number", "invalidation", "measure first", "narrow class"],
    followUps: [
      "What goes in an exact cache key?",
      "How would you measure a semantic cache's wrong-answer rate?",
      "How does a cache interact with permissions?",
    ],
  },
  {
    id: "architecture-q05",
    course: "architecture",
    category: "system-design",
    level: "core",
    chapterId: "architecture-01-the-method",
    question: "A client asks you to design an LLM system. What do you write down before you choose any component?",
    idealAnswer:
      "I write the requirements as numbers, before I name a single component. Each one is a sentence that a test can fail. Examples are an answer-quality floor on a labelled slice and a recall floor for retrieval. Others are a latency limit at the 95th percentile, a cost per successful task and a ceiling on the attack rate. If the client cannot give me a number, I propose one and mark it as a target, not a measurement. Then I write the constraints. These are the providers the client allows, where stored data may live, the budget and who operates the system after I leave. A constraint rules options out before any number is compared. Only then do I list options for each component, and doing nothing is always one of them. I compare the options on the same measurements and pick the cheapest one that meets every requirement. I record each choice in a decision record, with the evidence and the event that would show it wrong. The trade-off is speed. This feels slow on day one. It stops the team arguing about tools when the real argument is about limits.",
    keywords: ["requirements as numbers", "testable", "target and measurement", "constraints", "options", "cheapest that passes", "decision record", "operator"],
    followUps: [
      "What do you do when the client cannot give you a number?",
      "Give an example of a constraint that rules out an option.",
      "How is a target different from a measurement?",
    ],
  },
  {
    id: "architecture-q06",
    course: "architecture",
    category: "system-design",
    level: "core",
    chapterId: "architecture-01-the-method",
    question: "What goes in an architecture decision record?",
    idealAnswer:
      "An architecture decision record, or ADR, records one decision and why it won. It has five parts. The context gives the requirement and the numbers behind it. The options come next, and one of them is doing nothing. Each option has its cost and its risk. The decision is one sentence that someone can quote. The consequences say what gets harder. They also name the event that would show the decision was wrong, such as a latency figure passing a limit. The evidence lets a reviewer run the numbers again, so it points at a command, a file or an eval run. I keep each record to one decision, because a record that holds three decisions cannot be superseded cleanly. Records are numbered in the order they were written. If a decision changes, a new record supersedes the old one, and the old one stays in the folder. A record without a reversal condition is only an opinion. A record with one tells the next engineer when to reopen the question, and that is what makes it useful a year later.",
    keywords: ["context", "options", "do nothing", "decision", "consequences", "reversal condition", "evidence", "supersede", "one decision"],
    followUps: [
      "Why is doing nothing always an option?",
      "What would you write as the reversal condition for a model choice?",
      "When do you write a new record, and when do you add a line to an old one?",
    ],
  },
  // CHECK: architecture-q07 names Vertex AI Vector Search. Google renamed Vertex AI to Gemini Enterprise Agent Platform on 22 April 2026 (see src/content/architecture/ch03.ts). Confirm the current product name.
  {
    id: "architecture-q07",
    course: "architecture",
    category: "production",
    level: "senior",
    chapterId: "architecture-03-retrieval-stack",
    question: "Would you move AskPEP's retrieval from pgvector to Vertex AI Vector Search, and what would make you?",
    idealAnswer:
      "Not by default. The default is Cloud SQL with pgvector, and it stays until a measured number changes. I would ask four questions. How many chunks are there? What share of queries carry a filter? How fresh must a new document be? Who operates the store? Filters matter most. The index returns its nearest candidates first and the filter then removes some. So the pool must be about k divided by the share that passes. At k of 5 and a 1 percent share, that is 500, and the speed the index bought is gone. Size matters too, because pgvector indexes a vector column up to 2,000 dimensions and a halfvec column up to 4,000. If those numbers point at a move, I run both stacks on the same golden set. A gap of one or two questions out of twenty is a tie, and a tie keeps the default. I put the cost of the move in the ADR: the migration, the re-ingest of every chunk, and a new threshold for the new reranker. I also name the number that would make me reverse the decision.",
    keywords: ["corpus size", "filter share", "freshness", "operator", "post-filter pool", "halfvec", "re-ingest", "golden set", "tie"],
    followUps: [
      "What do you measure first?",
      "Why does a new reranker need a new threshold?",
      "What does the ADR count as the cost of the switch?",
    ],
  },
  {
    id: "architecture-q08",
    course: "architecture",
    category: "orchestration",
    level: "core",
    chapterId: "architecture-04-orchestration",
    question: "Which agent runtime would you choose, and why?",
    idealAnswer:
      "I start with who operates it, because a runtime is a framework on a host, and the host is where the cost sits. I list six duties: state, limits, side effects, serving, reach and scale. State is the checkpoints. Limits are the step and token budgets. Side effects are the writes that must happen once. Serving is the API contract. Reach is who can call it, and scale is how many instances run. Then I mark which duties a managed runtime takes and which stay with me. It usually takes machines and stored state. The limits and the idempotency key stay in my code. Next I price the switch twice, once for the rewrite to get in and once for the cost of leaving. For AskPEP I would keep LangGraph on Cloud Run. Doing nothing adds no bill and no rewrite, and leaving is cheap because the image is a container. Nobody has run the desk on a managed runtime either, so no figure compares the options. I say plainly what I measured and what I did not, and I name what would make me move.",
    keywords: ["who operates it", "framework and host", "six duties", "state", "limits", "side effects", "price the switch", "cost of leaving", "measured"],
    followUps: [
      "What would make you move to a managed runtime?",
      "Which number would you log first?",
      "Why is leaving a cost?",
    ],
  },
  // CHECK: architecture-q09 repeats the chapter 4 claims that Agent Runtime scales the host and can keep session history, and that a front service on Cloud Run still checks the API key. FACTS.md holds none of them. See the CHECKs in src/content/architecture/ch04.ts.
  {
    id: "architecture-q09",
    course: "architecture",
    category: "orchestration",
    level: "deep",
    chapterId: "architecture-04-orchestration",
    question: "What does a managed agent platform take off your pager?",
    idealAnswer:
      "Machines and stored state, and little else. The platform runs and scales the host. It can also keep session history, so I stop operating a checkpoint table and its schema. It does not take my rules. The step and token limits are code. So are the idempotency key that stops a repeat from writing twice, the model fallback and the API contract. They stay mine. A front service often comes back too. If callers must keep sending an API key, something still has to check it. So I deploy and watch a small service on Cloud Run in front of the platform. That is a deploy I thought I had removed. I would not count the saving in hours until someone measured it, because nobody has timed these jobs. I would also ask who owns the session store after the move, and what happens to old threads if I leave. The honest summary for a client is that the pager gets lighter for hosts and storage and stays the same for behaviour. A bad answer, a repeated write or a blown budget still pages me.",
    keywords: ["machines", "stored state", "step limits", "idempotency key", "model fallback", "API contract", "front service", "session store", "pager"],
    followUps: [
      "What does the front service cost?",
      "Who owns the session store after the move?",
      "How would you measure the hours a managed runtime saves?",
    ],
  },
  // CHECK: architecture-q10 says Cloud Tasks delivers at least once and that a second create with the same task name fails. FACTS.md holds neither. See the CHECKs in src/content/architecture/ch05.ts.
  {
    id: "architecture-q10",
    course: "architecture",
    category: "reliability",
    level: "deep",
    chapterId: "architecture-05-serving-shape",
    question: "A queue delivers a job twice. How do you keep the work safe?",
    idealAnswer:
      "I assume it will, because Cloud Tasks delivers at least once. So I protect the work in three layers. First, I name each task from a stable id, such as the thread id. A second create with the same name fails, so a repeat is stopped at the queue. Second, the worker checks the job's status before it runs. A finished job is left alone, and a stopped job resumes from its checkpoint. Third, every write the job makes is idempotent so a run that does repeat cannot charge or send twice. Those layers cover a repeat that arrives after the first run has ended. A repeat that overlaps a live run needs a fourth. A run in progress can read as stopped, so the status check alone lets two workers run the thread. AskPEP takes a Postgres advisory lock on the thread id before it reads the status. A second delivery finds the lock held, runs nothing and answers 503, so the queue retries it later. The lock holds one pool connection for the whole run, and ten runs at once would starve a pool of ten. I would cap the queue's concurrent dispatches below the pool size. Then I would test it by sending the same task twice, once after the first run ends and once during it.",
    keywords: ["at least once", "task name", "stable id", "status check", "resume", "idempotent writes", "overlap", "advisory lock", "pool connection", "deadline"],
    followUps: [
      "Why does a task name stop a repeat?",
      "How does the worker tell a finished job from a running one?",
      "What does the lock cost you?",
      "How would you test the overlap case?",
    ],
  },
  {
    id: "architecture-q11",
    course: "architecture",
    category: "system-design",
    level: "core",
    chapterId: "architecture-05-serving-shape",
    question: "How do you decide whether a cache or a queue fixes a slow, costly endpoint?",
    idealAnswer:
      "With two numbers, one for each tool. A cache saves money only on repeats, so the repeat rate in the traces bounds the saving. I count how many requests in a window share a question and multiply by the cost of one call. A hit costs nothing, so a rate of 0.3 saves at most 30 percent of the model spend. A queue does a different job. It fixes the caller's wait and does nothing for the cost. If the run takes longer than the caller will wait, the work moves to a queue. A desk run is allowed 60 seconds, and the interactive limit is 10, so the desk needs one. The caller gets a 202 with a job id and polls for the result. So the two are not rivals for one problem. A high repeat rate with short runs points to a cache. Long runs point to a queue, whatever the repeat rate, and some endpoints need both. Before I turn a cache on, I measure the hit rate on a running server, because one instance's counters are not the service's. I also start with an exact key and not a semantic one.",
    keywords: ["repeat rate", "traces", "hit rate", "caller wait", "run time", "202", "job id", "exact key", "per instance"],
    followUps: [
      "How would you measure the repeat rate?",
      "When do you need both a cache and a queue?",
      "Why is a hit rate from one instance not the service's hit rate?",
    ],
  },
  {
    id: "architecture-q12",
    course: "architecture",
    category: "state-and-data",
    level: "core",
    chapterId: "architecture-06-state-and-data",
    question: "A user asks you to delete their data. How do you do it in a system with checkpoints, traces and an audit log?",
    idealAnswer:
      "I start by listing every store that holds a copy, and the key that finds the data in each. In AskPEP the checkpoint tables are found by thread id. Notes are found by user id, because the thread id sits only inside the value. So I decide which key my policy deletes by, and I write it down. The checkpointer has a delete_thread call that clears all three checkpoint tables. A hand-written delete that misses one table leaves the conversation behind. Audit is the hard case. It is append-only on purpose, and the service has insert and read rights on it and nothing more. So I either keep the row and replace the user id with a token that maps to nothing, or I keep it whole. If I keep it whole, I say why in the policy. The customer's rules decide, and an ADR records the choice. Last come the copies outside my database. A tracing service holds the run for its own retention window, and a golden-set file in Git may hold a copied question. I name who deletes each of those. Then I prove the deletion by searching every store for the key afterwards.",
    keywords: ["every store", "thread id", "user id", "delete_thread", "append-only", "token", "retention", "tracing service", "golden set"],
    followUps: [
      "What do you do about the audit log?",
      "How would you prove the deletion worked?",
      "Which key would you delete notes by, and why?",
    ],
  },
  // CHECK: architecture-q13 says the Anthropic API and Voyage may offer a region option, that LangSmith defaults to the US and has an EU endpoint, and that Gemini is served from the global location by default. FACTS.md holds none of them. See the CHECKs in src/content/architecture/ch06.ts.
  {
    id: "architecture-q13",
    course: "architecture",
    category: "state-and-data",
    level: "senior",
    chapterId: "architecture-06-state-and-data",
    question: "Can you promise that customer data never leaves the EU?",
    idealAnswer:
      "Not from the code alone, so I would not say yes. I would list every hop that sees the text and mark each as pinned or open. In AskPEP the API, the database and the image registry sit in europe-west3, and Model Armor uses a region setting that defaults there. The Gemini calls default to the global location. Claude and Voyage are called directly, with no region set. Tracing goes to LangSmith's default region, which is the US, unless the endpoint setting points at its EU endpoint. So the promise I can keep today is narrow. The API, the database and Model Armor stay in the region. I would not promise that question text stays in the EU. To widen it, each open hop needs a setting, a contract or a replacement. Each of those has a cost, so each is its own decision with its own ADR. I would also check the vendors' current terms, because I have not read whether Anthropic or Voyage offer a region option. I would rather give the client a smaller promise that is true.",
    keywords: ["residency", "every hop", "region pin", "model location", "tracing endpoint", "data processing terms", "narrow promise", "ADR"],
    followUps: [
      "Which hop would you fix first?",
      "How would you test that a hop stays in the region?",
      "Do log lines count as a hop?",
    ],
  },
  {
    id: "architecture-q14",
    course: "architecture",
    category: "safety-and-quality",
    level: "core",
    chapterId: "architecture-07-safety-and-quality-by-design",
    question: "Your guards add latency. How do you budget it?",
    idealAnswer:
      "I take each guard's p95 from my own audit rows, because the audit table records a latency for every guard decision. Then I add up only the guards on the path the caller waits for, and I compare the sum with the latency limit. Local guards, such as a pattern check, cost little, so I run them first. A remote screening call costs real time, so I use one only where it earns its place. Then I say what the sum leaves out. Stage p95s don't add exactly, because the slow cases rarely line up. And the audit insert runs after the timer stops, so the recorded latency misses it. Streaming matters as well. If I hold the stream until an output guard has read the answer, the first token waits for the whole check. In the chapter's worked example, the desk with Model Armor and one reask takes 9.76 seconds against a 10-second limit. A third remote call would break it. So the budget has to be written down before the guards are added, not after.",
    keywords: ["p95", "audit rows", "path the caller waits for", "local guards first", "stage p95s", "audit write", "held stream", "first token"],
    followUps: [
      "What does a held stream do to the first token?",
      "Where does a slow guard hurt least?",
      "Why don't stage p95s add up?",
    ],
  },
  {
    id: "architecture-q15",
    course: "architecture",
    category: "safety-and-quality",
    level: "core",
    chapterId: "architecture-07-safety-and-quality-by-design",
    question: "Where do you run evals in an LLM system?",
    idealAnswer:
      "Before release and after the answer, and never in the request path. A gate in CI runs a fixed golden set and catches regressions before they ship. A judge over a sample of stored traces catches drift on live traffic. I keep the judge off the path because it adds a model call. In this course's worked example that is about 3 seconds and 1.275 cents on placeholder prices. With the desk at 9.76 seconds, a judge on every answer would pass the 10-second limit, and it would double the cost of a request. Off the path does not mean free. At a sample rate of 0.1, 2,000 requests a day give 200 judge calls, which is $2.55 a day in the example. Raise the rate to 0.2 and the spend doubles to $5.10. So I set the sample rate from a daily budget and not from a feeling. I also check that the judge's calls show up in the cost report. In AskPEP they do not, so I add them by hand.",
    keywords: ["CI gate", "golden set", "online judge", "sample of traces", "off the request path", "sample rate", "daily budget", "drift"],
    followUps: [
      "What would a judge on every answer do to the SLOs?",
      "How do you size the sample?",
      "How does a cached answer affect the judge?",
    ],
  },
  {
    id: "architecture-q16",
    course: "architecture",
    category: "safety-and-quality",
    level: "deep",
    chapterId: "architecture-07-safety-and-quality-by-design",
    question: "Does a cache hit need to run your guardrails?",
    idealAnswer:
      "The input guards still run on a hit, and the output guards do not need to. A stored answer was cited and not refused, and it passed the output guards when it was first written. The input guards screen the question and never the answer, so they run before the cache lookup. The key also holds the guard settings, so a settings change means a miss. There is one gap. The key holds a Model Armor template's name and not its contents. Say I tighten the template in the console and keep its name. A repeat question then gets the old answer until the time limit ends or a restart empties the cache. That answer never met the new rule. So after editing a template I clear the cache or rename the template. A hit also affects the online judge. The trace of a hit has no retrieved ids, so the judge reads a cached answer with an empty source list. A grounded judge may fail or give noise on that, so I would check what it does and add a switch to skip hits.",
    keywords: ["input guards", "output guards", "cache key", "guard settings", "template name", "stale answer", "time limit", "retrieved ids", "online judge"],
    followUps: [
      "What do you do after editing a screening template?",
      "How does a hit affect an online judge?",
      "Why do the input guards run before the lookup?",
    ],
  },
  // CHECK: architecture-q17 says Google bills Model Armor per call. FACTS.md holds no billing unit and no price. Confirm both on the Model Armor pricing page.
  {
    id: "architecture-q17",
    course: "architecture",
    category: "safety-and-quality",
    level: "senior",
    chapterId: "architecture-07-safety-and-quality-by-design",
    question: "Your cost report says an answer costs 1.275 cents. Why can the real bill per request be higher?",
    idealAnswer:
      "Because the report counts only the usage that reaches a trace, and screening still sits outside it. Google bills Model Armor per call, outside the model prices, and the trace has no field for it. I have no price for it, so I would say so. Two other gaps are closed now. A reask used to drop its usage. When a citation check fails, the service asks the model again, and a request that made two calls was priced as one. The reask's usage now goes into the request's trace, so `cost_usd` counts both calls. The online judge used to store a feedback row and no trace. Each verdict now writes a trace of its own, on a route that `askpep cost` reads and the request counts leave out. So judge spend shows in the cost report and does not count as traffic. Traces written before those fixes still undercount, so I would not compare a window that spans them. To find the screening cost, I compare the provider's invoice with the report and count the screening events in the audit rows. Then I add it to the cost model by hand, and I mark the result as a floor. The prices here are placeholders from a worked example.",
    keywords: ["reask", "cost_usd", "Model Armor", "screening", "online judge", "own trace", "invoice", "cost model", "floor"],
    followUps: [
      "How do you find the screening cost?",
      "Why do old traces still undercount?",
      "Why does missing spend change cost per successful task?",
    ],
  },
  {
    id: "architecture-q18",
    course: "architecture",
    category: "cost",
    level: "core",
    chapterId: "architecture-08-design-review",
    question: "How would you estimate the monthly bill for this service?",
    idealAnswer:
      "I name the inputs before I give a total. Tokens in and out come from a sample of real traces, so they are measured. The price per million tokens comes from the pricing file, and the request volume is a forecast, so I give a range for it. The cache hit rate is an assumption until a running server reports one. The arithmetic is short: cost per request, times requests a day, times days, times one minus the hit rate. In the course's worked example, 240 traced rows at 1,000 requests a day for 30 days come to 351.60 dollars, on placeholder prices. Cost per successful task divides the cost per request by the share of requests that succeed. That share is measured and then held fixed. So if I reroute a stage to a cheaper model, the figure assumes the same success share. Only an eval on the cheaper model can confirm that. I finish with what the bill leaves out. In that example only the generate stage carries a cost. Reasks, screening calls, judge calls and people's time sit outside the number.",
    keywords: ["measured inputs", "forecast inputs", "tokens in and out", "price per million tokens", "hit rate", "cost per successful task", "success share held fixed", "what the bill leaves out"],
    followUps: [
      "Which inputs are measured and which are forecast?",
      "What does a reroute assume about the cheaper model?",
      "What would you leave out of the estimate, and say so?",
    ],
  },
  {
    id: "architecture-q19",
    course: "architecture",
    category: "reliability",
    level: "deep",
    chapterId: "architecture-08-design-review",
    question: "How does your design fail?",
    idealAnswer:
      "I follow the request path and give every failure three views. The caller's view is what they see. The operator's view is what shows up in logs and counters. The third is what recovers it. Then I mark which failures the system absorbs and which need a person. In AskPEP a provider answering 429 is absorbed, because the routed model falls back to Claude. The caller gets a slower answer and the operator sees a fallback warning. A queue that delivers a job twice is absorbed. A finished thread is left alone, and a duplicate mid-run finds the thread's lock held and gets a 503, so the queue retries it later. A new instance starts cold, so its cache is empty and answers are slower until it fills. A blocked job gives the poll a 404, the same as an unknown thread, though a repeat post of that thread answers 409. The inline queue loses a job in a restart, and a person has to resubmit under a new thread id. I would also name a failure I found by reading the code and did not run, such as the lock holding one pool connection for a whole run. I write it as an open question and say how I would test it.",
    keywords: ["request path", "caller view", "operator view", "recovery", "absorbed", "needs a person", "fallback", "cold instance", "read not run"],
    followUps: [
      "Which failures need a person?",
      "How would you test the lock's connection cost?",
      "How does the caller tell a blocked job from an unknown thread?",
    ],
  },
  {
    id: "architecture-q20",
    course: "architecture",
    category: "evaluation",
    level: "senior",
    chapterId: "architecture-08-design-review",
    question: "A saving in your design rests on a number nobody measured. What do you do?",
    idealAnswer:
      "I mark the claim as an assumption and I leave the ADR accepted. A number nobody measured makes the claim a guess. It does not contradict the claim, and only a contradiction earns a new ADR. In the review I add one line to Consequences. It names the measurement and the number that would show the ADR wrong. Take the cache in the worked example. A hit rate of 0.3 saves $105.48 a month, but the rate is a guess. The admin endpoint reports counters for one instance, and each instance has its own cache. So the figure is real for that instance and an assumption for the service. The action is to measure on a running server over enough traffic, then replace the guess with the result. I would not drop the cache, since it costs nothing at one instance. I would stop quoting the saving as a result in any document until the measurement is in. If the measured rate contradicts the claim, that is when a new ADR supersedes the old one.",
    keywords: ["assumption", "accepted", "contradiction", "Consequences", "measurement", "reversal number", "per instance", "supersede", "design review"],
    followUps: [
      "When does a claim earn a new ADR?",
      "What would you write on the Consequences line?",
      "Why is a hit rate from one instance only an assumption for the service?",
    ],
  },
  {
    id: "architecture-q21",
    course: "architecture",
    category: "design-review",
    level: "senior",
    chapterId: "architecture-09-design-decision",
    source: "practice",
    question: "Your design passes review, but the launch condition isn't met yet. What do you tell the stakeholders?",
    idealAnswer:
      "I say that those are two decisions, and I record them separately. The design review tests whether the plan holds up against numbers and code. The launch decision depends on evidence from a running system. So a design can be approved while a team still waits. In the record I write one decision for each, and one row for each open condition. Every row gets an owner and a test or a date. If someone argues that a few good days are enough, I show the window the condition names. A target and a condition are different things. A rate can sit above target and still not have held for the agreed period. I give the earliest possible date, and I say what has to be true for that date to stand. I also list what the review did not decide, such as quota under real load. That keeps the next piece of work honest about what it has to find out.",
    keywords: ["two decisions", "design review", "launch condition", "owner", "earliest date", "error budget", "not decided", "evidence from a running system"],
    followUps: [
      "What would make you move the date?",
      "Who should own a condition about answer quality?",
      "How do you stop an approved design being read as a launch?",
    ],
  },
  {
    id: "architecture-q22",
    course: "architecture",
    category: "design-review",
    level: "senior",
    chapterId: "architecture-09-design-decision",
    source: "practice",
    question: "What should a design leave undecided, and how do you hand that over?",
    idealAnswer:
      "A design should leave undecided anything that only a running system can answer. Quota under real load is one example. The real infrastructure bill is another, and so is the latency of an outside service nobody has called from this system. I do not guess those to make the document look finished. I write them down as things to measure, each with an owner. The hand-over note has four parts. It lists what is settled, what must ship, what must be measured and what must not change without a new decision record. It also names the people waiting, so the urgency is visible. The settled list protects the next engineer from reopening each decision by accident. The measurement list stops anyone from treating an assumption as a fact. When a measurement comes back, it either confirms the claim or it earns a new decision record that says what changed.",
    keywords: ["hand-over", "settled", "must ship", "must measure", "assumption", "quota", "infrastructure cost", "decision record"],
    followUps: [
      "What goes wrong when a design guesses a quota?",
      "When may the next engineer change a settled decision?",
      "How do you keep the list of measurements from being forgotten?",
    ],
  },
];

export default questions;
