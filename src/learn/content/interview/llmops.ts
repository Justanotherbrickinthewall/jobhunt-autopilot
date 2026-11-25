import type { InterviewQuestion } from "../types";

const questions: InterviewQuestion[] = [
  // real Q2
  {
    id: "llmops-q01",
    course: "llmops",
    category: "cost",
    level: "core",
    chapterId: "llmops-04-cost-and-latency",
    source: "asked",
    question: "Beyond choosing a cheaper model, how would you bring down the cost of an AI agent?",
    idealAnswer:
      "I would start by measuring cost per successful task, then find the expensive nodes in a trace before cutting anything. Usually the last calls in the loop dominate, because each one carries the whole history. Then I would pull four levers in order. First, trim context, by summarising old tool results instead of carrying them. Second, cap output length. Third, cap iterations and tool calls, and hand off to a person when the cap hits. Fourth, avoid repeated retrieval by reading from run state. After those four I would cache stable results, such as a fixed prompt prefix, and batch any offline work that nobody is waiting on. I would also use small models for routing and classification and keep the strong model for the hard steps. I would put budgets and stop conditions on every run. The trade-off is quality. Every cut can lower task success, and a failed task usually costs more than the tokens it saved, because a person has to finish it. So each change ships with a quality number measured on the same golden set. If a cut fails that test, I revert it. A safety check is never a candidate for cutting.",
    keywords: ["cost per successful task", "expensive nodes", "trim context", "cap iterations", "repeated retrieval", "prompt caching", "batch", "small model routing", "quality beside cost"],
    followUps: [
      "Which of those levers would you pull first, and why?",
      "How do you decide an output cap without truncating answers?",
      "What would make you refuse a cost cut?",
    ],
  },
  {
    id: "llmops-q02",
    course: "llmops",
    category: "cost",
    level: "core",
    chapterId: "llmops-04-cost-and-latency",
    question: "What is cost per successful task, and why does it beat price per token?",
    idealAnswer:
      "Cost per successful task is everything you spend on a piece of work, divided by the number of tasks that ended correctly. Price per token is a vendor number. It ignores your retries, your failures and the human time spent finishing what the system could not. Here is an example with illustrative prices. One extraction attempt costs 3 cents. It succeeds 80 percent of the time and you allow one retry, so expected attempts are 1.2 and 4 percent of tasks still fail. If each failure costs 1.50 dollars of clerk time, then per 1,000 tasks the model costs 36 dollars and review costs 60. That is 96 dollars for 960 successes, so 10 cents each. The model is only 3.75 cents of it. The number AskPEP measures from its traces is that model part alone, because a trace holds no review time. So halving the input tokens saves little, while raising the success rate saves a lot. That is why the metric beats price per token: it points at the real lever. I would track it per route and per stage, alongside task success. Then a cheaper model that fails more shows up as a cost increase, not a saving.",
    keywords: ["total spend", "successes only", "retries", "review cost", "failure rate", "price per token", "worked example", "per route"],
    followUps: [
      "What goes in the numerator and what goes in the denominator?",
      "How would you measure the review cost?",
      "Retries are not independent in practice. How does that change the sum?",
    ],
  },
  // real Q27
  {
    id: "llmops-q03",
    course: "llmops",
    category: "latency",
    level: "deep",
    chapterId: "llmops-04-cost-and-latency",
    source: "practice",
    question: "How do you optimise quality, latency and cost together?",
    idealAnswer:
      "I measure the full path first, then change one thing at a time and check all three numbers. Measurement means a trace per request, with time and tokens per stage, plus a quality score from a golden set. Then the moves. To cut context and repeated calls, I trim prompts and reuse lookups. I cache where correctness allows, such as a stable prompt prefix. I choose models per task, with small ones for easy steps. I parallelise independent work, though fan-out raises the tail, so I keep it small. I stream for people, and I batch offline work. I make ingestion asynchronous. I track p95 latency and cost per successful task, alongside quality. The rule that matters most is not to trade tail latency or accuracy for a better average. A cache can improve the mean and leave p95 untouched, because the misses own the tail. A shorter prompt can be faster and less accurate. So each change has to improve one target and leave the other two inside their limits on the same evaluation. If a change fails that test, I do not ship it, however good one number looks.",
    keywords: ["measure the path", "trace", "p95", "cost per successful task", "cache", "model per task", "parallelise", "stream", "batch", "tail latency"],
    followUps: [
      "Give me an example where improving cost hurts quality.",
      "Which of the three do you protect first?",
      "How do you know a latency win did not cost accuracy?",
    ],
  },
  {
    id: "llmops-q04",
    course: "llmops",
    category: "latency",
    level: "senior",
    chapterId: "llmops-04-cost-and-latency",
    question: "Average latency looks fine, but users say the product is slow. What is going on?",
    idealAnswer:
      "Most likely the tail is bad, and the average is hiding it. Users remember the slow request, not the mean. I would pull p95 and p99 per request, not per call, and look at what the slow requests share. The usual causes are fan-out, retries, and a slow path that covers a few percent of traffic. Fan-out is the one people miss. If each of five parallel calls is slow 1 percent of the time, about 5 percent of requests wait on at least one slow call. The flow I would follow is this. Slice by cohort, such as tenant, route or input size. Compare a slow trace with a good one stage by stage. Check retries and timeouts, cache misses, and queueing. Then fix by cutting steps, shrinking prompts, setting timeouts near p99, and hedging safe calls. The metrics I would watch are p95, p99, time to first token and attempts per request. The trade-off is that hedging costs extra calls, so I would cap it. If the tail cannot be fixed fast, I would stream so the user sees progress. I would also tell them honestly that some answers take longer.",
    keywords: ["tail latency", "p99", "per request", "fan-out", "retries", "cohort", "hedged requests", "timeouts", "time to first token"],
    followUps: [
      "Why does fan-out make the tail worse?",
      "How would a cache improve the mean without helping p95?",
      "When would you not hedge a request?",
    ],
  },
  // real Q33
  {
    id: "llmops-q09",
    course: "llmops",
    category: "observability",
    level: "core",
    chapterId: "llmops-01-what-to-observe",
    source: "practice",
    question: "What should you log, measure and trace in a production LLM application?",
    idealAnswer:
      "I would trace each request end to end. One run id would cover the API, retrieval, agent nodes, tool calls and model calls, including across queues. Each span records start, duration, status and parent, and model spans add tokens, model and prompt version. For metrics, I would record volume, error rate, timeout rate and p50, p95 and p99 latency per stage. I would add queue backlog and oldest job age, retries and fallbacks, tokens and cost, cache hits, tool call counts, and provider failures. Quality is measured separately: retrieval relevance, groundedness, schema failures and review rate. Everything is tagged with model, prompt, index and config versions, so I can ask what changed. Privacy comes first. I redact secrets and sensitive content before recording, log ids, hashes and labels by default, set retention, and limit who can open raw traces. The trade-off is volume and cost. I would keep every failed or low-quality request and sample the rest. Traces explain individual requests, while metrics and alerts tell me when the service as a whole is unhealthy. I need both.",
    keywords: ["run id", "spans", "p95", "p99", "tokens and cost", "retries", "queue backlog", "quality metrics", "versions", "redaction"],
    followUps: [
      "Why pass the run id through the queue?",
      "What would you sample, and what would you always keep?",
      "Which metric tells you the prompt cache broke?",
    ],
  },
  // real Q35
  // CHECK: llmops-q10 says Langfuse and Arize Phoenix are equivalent tools that can be self-hosted, and that LangSmith suits an app already on LangChain or LangGraph. None was read in current docs. Confirm each claim.
  {
    id: "llmops-q10",
    course: "llmops",
    category: "observability",
    level: "deep",
    chapterId: "llmops-02-langsmith-tracing",
    source: "practice",
    question: "How would you use LangSmith or an equivalent tool?",
    idealAnswer:
      "I would use it to see why one request went wrong. It records the trace of a graph or agent run: each node, the model calls, tool results, latency, tokens and failures. I would attach the run id and the prompt and model versions to every trace. Then I can tell a regression caused by a prompt from one caused by data. Inputs and outputs are stored under privacy controls, with redaction first. Then I would link traces to evaluation cases. A bad production trace becomes a test case, and I can compare runs of a new prompt against the old one on the same cases. Equivalent tools include Langfuse, Arize Phoenix, and OpenTelemetry with any backend, which keeps traces portable. The tool is not a replacement for service monitoring. It complements metrics, alerts and secure logs. Nobody reads traces at three in the morning, so availability and latency alerts must still page someone, and the traces explain what that person finds. I would choose by fit. LangSmith suits an app that already runs on LangChain or LangGraph. An open tool suits several people who review traces and want to self-host.",
    keywords: ["trace", "run id", "prompt version", "eval cases", "compare runs", "privacy controls", "Langfuse", "Phoenix", "OpenTelemetry", "complements metrics"],
    followUps: [
      "Why not rely on the tracing tool alone?",
      "How does a bad trace become a regression test?",
      "What would you not store in a trace?",
    ],
  },
  // real Q55
  {
    id: "llmops-q11",
    course: "llmops",
    category: "observability",
    level: "senior",
    chapterId: "llmops-01-what-to-observe",
    source: "practice",
    question: "What reliability targets would you define for an LLM service?",
    idealAnswer:
      "I would define two separate sets, because an LLM service can be up and still answer badly. Operational targets come from user impact: availability, p95 and p99 latency, timeout and error rate, throughput, and cost per successful task. Quality targets measure whether answers are good: task success, groundedness, schema validity and review rate. Each target has a window and an alert threshold. For example, 99.9 percent availability over 30 days leaves an error budget of 43.2 minutes, and when it is spent, reliability work comes before features. Quality needs graded samples or per-response checks, and it has sampling noise. Grading 200 answers a day gives about plus or minus 3.8 points on a single day. So I would alert on a weekly window or a sustained drop, not one day. I would also alert on the cause metrics, such as cached token share and fallback rate, which warn earlier. The trade-off is that tighter targets cost more, in redundancy and grading effort. I would set them with the business owner, per use case: an approval summary needs a stricter quality target than a draft email.",
    keywords: ["availability", "p95", "p99", "error rate", "cost per successful task", "task success", "groundedness", "error budget", "alert windows", "up but wrong"],
    followUps: [
      "Why keep operational and quality targets separate?",
      "How do you handle sampling noise in a quality SLO?",
      "What does a spent error budget change?",
    ],
  },
  // real Q34
  {
    id: "llmops-q12",
    course: "llmops",
    category: "incidents",
    level: "senior",
    chapterId: "llmops-07-incident-investigation",
    source: "practice",
    question: "How do you investigate rising latency, cost, errors or hallucinations?",
    idealAnswer:
      "I start by finding who is affected and since when, then compare that cohort with a baseline. The cohort might be a tenant, a route, a model or a prompt version. The baseline is unaffected traffic or the same hour last week. Next I compare a healthy window with a bad one, stage by stage, from the traces. Then I check the causes in a fixed order: refusals first, then tokens, then latency. A refusal storm makes requests faster, and a token bloat makes generation slower, so reading latency first blames the wrong stage. Each check has one confirming and one ruling-out metric. The suspects behind them are traffic shifts, retries, context length, cache hit rate, throttling, index latency, deploys, config changes and provider degradation. I change one cause at a time, ideally with a revert. I validate on operational and quality metrics together, since a latency fix can lower groundedness. For hallucinations, I follow the same loop and add quality triage. At the end I add the failing case to the evaluation set and add the alert that would have caught it earlier. I practise the whole loop on a seeded regression, where the answer is known, before a real one arrives.",
    keywords: ["cohort", "baseline", "per-stage breakdown", "refusals then tokens then latency", "cache hit rate", "deploys", "one cause at a time", "operational and quality metrics", "add eval case", "seeded regression"],
    followUps: [
      "Cost doubled but traffic is flat. What do you check?",
      "Why check refusals before latency?",
      "Why change one cause at a time?",
      "How is a hallucination incident different from a latency incident?",
    ],
  },
  {
    id: "llmops-q17",
    course: "llmops",
    category: "observability",
    level: "core",
    chapterId: "llmops-02-langsmith-tracing",
    question: "A client asks you to turn tracing on for their app. What do you check first?",
    idealAnswer:
      "I check where the data goes before I touch anything. A trace holds the question, the retrieved text and the answer, so it leaves the client's boundary the moment I switch tracing on. I ask which region stores it, how long it is kept and who can read it. Then I list what each run actually holds: prompts, documents, tool arguments and outputs. I clean that data at the client that exports it, with one redaction hook, so nothing sensitive reaches the vendor at all. The hook has to handle message objects as well as plain dictionaries, or it misses most of what a model run carries. It also cannot find names, and I say that out loud. Then I prove it. I send a request with a known fake email address and read the trace in the tool to see whether the address arrived. A claim that the hook works is not a test. I keep the full record locally, under access control, so debugging does not depend on the vendor's copy. Last, I agree who can switch tracing on and off.",
    keywords: ["where the data goes", "region", "retention", "access", "what the runs hold", "redaction at the client", "message objects", "known fake address", "local record"],
    followUps: [
      "What would you do if the client needs the traces to stay in one country?",
      "What does a redaction hook still miss?",
      "How would you test the hook without real customer data?",
    ],
  },
  // CHECK: llmops-q18 repeats chapter 3's claims about Cloud Trace, Langfuse, Arize Phoenix and Datadog. Chapter 3 read them on 22 October 2026, and FACTS.md holds none of them. Confirm each, and confirm that a new backend is one new exporter.
  {
    id: "llmops-q18",
    course: "llmops",
    category: "observability",
    level: "deep",
    chapterId: "llmops-03-opentelemetry-and-cloud-trace",
    question: "Why instrument with OpenTelemetry instead of a vendor SDK, and what would make you change tool?",
    idealAnswer:
      "I instrument through OpenTelemetry because the spans belong to me and the backend becomes a choice of exporter. If I tie the code to one vendor's SDK, a change of tool means rewriting every place that opens a span. With OpenTelemetry the code that opens spans stays as it is, and a new backend is one new exporter. I still pick the backend on fit. Cloud Trace suits a team that already runs on Google Cloud and wants the timing of each step beside its other telemetry. LangSmith suits reading one bad run in full, with what the model saw and said. I would move to Langfuse or Arize Phoenix to host the traces myself, and to Datadog when the company already runs on it. Two things do not move for free. A backend reads attribute names, so I check that it reads the ones I set. A hosted backend is also a second place that holds my data, so the same rule applies: spans carry sizes and names, and masked text is the only text. A tracing tool complements metrics and alerts. It does not replace them.",
    keywords: ["OpenTelemetry", "exporter", "vendor lock-in", "Cloud Trace", "LangSmith", "Langfuse", "Arize Phoenix", "Datadog", "attribute names", "masked text"],
    followUps: [
      "What does a span hold, and what does it leave out?",
      "What would you check before you moved to a self-hosted backend?",
      "Why is a hosted backend a data risk?",
    ],
  },
  {
    id: "llmops-q19",
    course: "llmops",
    category: "evaluation",
    level: "deep",
    chapterId: "llmops-05-online-evaluation-and-feedback",
    question: "How would you evaluate a deployed LLM application on live traffic?",
    idealAnswer:
      "I would run a loop of four moves over the traces the service already writes. First, I sample a share of recent traffic, because judging every request costs too much. I choose the sample by hashing the trace id, so the same traces are picked every time and a higher rate only adds to the sample. Second, I judge each finished answer with a judge I calibrated offline against labelled cases. It needs no answer key, so it can score questions nobody wrote down. Third, I store the judge's scores and the users' thumbs in one table keyed by trace id. A thumbs-down catches what the judge cannot see, such as a refusal where retrieval missed a document that exists. Fourth, I turn the failures into candidate golden items with no labels, and a person labels them before they join a new dataset version. The offline gate then guards that version. I keep test runs out of the sample, so evaluation runs on a route of their own never count as user traffic. The trade-off is cost, so I keep the window short and the rate low.",
    keywords: ["sample", "hash of the trace id", "calibrated judge", "no answer key", "thumbs", "one table", "golden candidates", "human label", "offline gate", "eval route"],
    followUps: [
      "Why hash the trace id and not draw at random?",
      "What can the judge not see?",
      "Why keep gate runs out of the sample?",
    ],
  },
  {
    id: "llmops-q20",
    course: "llmops",
    category: "evaluation",
    level: "senior",
    chapterId: "llmops-05-online-evaluation-and-feedback",
    question: "How many human labels does a team need to review production traffic?",
    idealAnswer:
      "It depends on the question, so I name the job first. To measure a failure rate within 3 points at 95 percent confidence, with a guess of 10 percent, I need about 385 labels. The formula is 1.96 squared times p times one minus p, over the margin squared, and halving the margin quadruples the count. To see a 2 percent failure at least once with 95 percent confidence, I need about 149 labels, which is roughly three divided by the rate. To detect a rise from 10 to 15 percent between two windows, I need about 343 labels in each, so 686 in all. At an assumed three minutes a label, that is about 34 hours. Nobody does that every week, so I don't audit the rate by hand. A calibrated judge watches the rate. People spend their labels where the judge cannot help: calibrating it, checking a small pool of its passes each month, and labelling the failed candidates. At a sample rate of 0.1 on 2,000 requests a day, that queue is about 25 candidates, or 75 minutes, a day.",
    keywords: ["margin of error", "385 labels", "149 labels", "686 labels", "confidence", "calibrate the judge", "candidates", "sample rate", "labour budget"],
    followUps: [
      "What happens to the count if you halve the margin?",
      "How does the sample rate change the daily labelling queue?",
      "Where would you spend a fixed budget of 100 labels?",
    ],
  },
  {
    id: "llmops-q21",
    course: "llmops",
    category: "evaluation",
    level: "deep",
    chapterId: "llmops-05-online-evaluation-and-feedback",
    question: "How do you turn user feedback and production failures into a better eval set?",
    idealAnswer:
      "I collect the failures, a person labels them, and I release a new dataset version. A trace counts as failed when the judge says fail or a user sends a thumbs-down. One signal is enough. Each failed trace becomes a candidate item. It holds the real question, redacted, and a source of production. It has no answer key yet, because a bad verdict says the answer was wrong and not which document holds the right one. A person reads the question and fills in the expected documents and a reference answer. I never let a model do that, because the model that got it wrong would mark its own work. I drop duplicates of questions the golden set already holds, though an exact match misses a paraphrase. The release step validates every item, so a file with an unlabelled item is refused and nothing ships half-labelled. Then the gate scores the new version, so the production questions guard every later change. I also read the file for names before I commit it, because redaction does not find names.",
    keywords: ["failed trace", "thumbs-down", "candidate", "redaction", "expected docs", "human label", "duplicates", "release version", "gate", "production source"],
    followUps: [
      "Why not let a model label the candidates?",
      "What does the duplicate check miss?",
      "What stops a half-labelled file from shipping?",
    ],
  },
  {
    id: "llmops-q22",
    course: "llmops",
    category: "observability",
    level: "senior",
    chapterId: "llmops-06-dashboards-and-alerts",
    question: "What is a burn-rate alert, and why use two windows?",
    idealAnswer:
      "A burn rate says how many times faster than planned I am spending the error budget. A rate of 1 spends the budget exactly over the SLO window. A rate of 14.4 on a 28-day window spends about 2 percent of it in one hour, which is worth waking someone for. I page when a long window and a short window are both over the rate. The long window shows the problem is big enough to matter. The short window shows it is still happening, so the page stops soon after the cause is fixed. With one window I would either page late or keep paging after the outage ended. I usually run two rules. A fast one pages on a high rate over an hour. A slow one pages on a lower rate over six hours, to catch a leak that the fast rule misses. Neither rule catches a steady leak below the slow rate, such as an 8 percent failure rate against a 95 percent target. So I also keep a dashboard and a weekly review. The alert text names the SLO and says what to run first.",
    keywords: ["burn rate", "error budget", "long and short window", "fast and slow rule", "symptom not cause", "page", "dashboard", "SLO"],
    followUps: [
      "How long does the fast rule keep paging after an outage ends?",
      "What does a steady 8% failure rate do to a 28-day budget?",
      "Why alert on the symptom and not on the cause?",
    ],
  },
  {
    id: "llmops-q23",
    course: "llmops",
    category: "incidents",
    level: "deep",
    chapterId: "llmops-07-incident-investigation",
    question: "Your end-to-end latency objective is green, but one stage is nine times slower. What do you check, and what do you add?",
    idealAnswer:
      "I compare the stages, because a total can hide one. Say rerank takes nine times as long. The total p95 might move from 3.6 to 4.3 seconds against a limit of 10, so the objective stays green while one stage is far past its own limit. I pull two windows from the traces, before the change and after it, and compare the p95 of each stage. The stage that added the most time is the lead. I also check that the failure share, the chunks and the input tokens stayed flat, because each flat number rules out another cause. The fix is an objective on every stage I can name, such as a 400 millisecond limit on rerank, with a burn-rate alert on each. Then I work out how late it would fire. If every request breaks the stage limit, the burn rate heads for 20 against a 95 percent objective. The fast rule needs 14.4, which is 72 percent of the last hour, so it pages after about 43 minutes. I give the team that number and ask whether it is acceptable.",
    keywords: ["per-stage p95", "total hides the stage", "two windows", "per-stage objective", "burn rate", "fast rule", "43 minutes", "flat numbers rule out causes"],
    followUps: [
      "How would you find when the stage started to slow?",
      "What would make 43 minutes too late?",
      "Which stages would you give an objective, and which would you leave out?",
    ],
  },
  {
    id: "llmops-q24",
    course: "llmops",
    category: "incidents",
    level: "senior",
    chapterId: "llmops-07-incident-investigation",
    question: "An incident got past all your alerts. How do you decide which alert to add?",
    idealAnswer:
      "I replay the incident before I add anything. I take the rows from the traces and compare a healthy window with the bad one, which tells me which objectives went from met to missed. Then, for each broken objective, I ask whether any alert could ever have fired, and how late. An alert can miss in two ways. The first is that no alert exists. A cost objective is a limit on dollars for each successful task, and a burn-rate alert divides failed requests by total requests, so none applies. A token bloat that quadruples the prompt breaks cost and pages nobody. The second is a rate that cannot reach the limit. If 69 percent of requests fail against a 5 percent allowance, the burn rate tops out near 13.8. The fast rule needs 14.4, so it can never fire, and the slow rule needs about 2.5 hours. For the first gap I add a ticket alert on cost. For the second I lower the fast threshold for that objective, or I accept the slow rule's lead time and say so. I write the lead time into the postmortem and add the case to the evaluation set.",
    keywords: ["replay the incident", "met to missed", "could any alert fire", "no alert exists", "unreachable burn rate", "13.8", "ticket alert", "lead time", "postmortem"],
    followUps: [
      "Why can the fast rule never fire for a 69 percent failure share?",
      "What would a cost alert look like?",
      "How would you test a new alert before a real incident?",
    ],
  },
  {
    id: "llmops-q25",
    course: "llmops",
    category: "incidents",
    level: "deep",
    chapterId: "llmops-08-first-operations-review",
    question: "Your diagnosis tool reports no broken objective, but more than half of requests are failing. How do you read that?",
    idealAnswer:
      "I read the failure share before the list of broken objectives. A tool like this usually lists objectives that went from met to missed. If the objective was already below target, it can never appear on that list. So a steady leak that the team has tolerated can hide the next incident. Say the objective was at 0.937 against a target of 0.95 before the change. The failure share then rose from 6 percent to 56 percent, and the report still lists nothing. I would trust the evidence lines, which name the failure share and the chunk count. I would pass a recorded time for the cut, because a deploy or job log beats an estimate. Then I would fix the report so it shows objectives that got worse, as well as those that crossed the line. The bigger lesson is that a tolerated miss has a cost. It removes the alarm you were counting on, so I'd put a daily ticket and an owner on any missed objective.",
    keywords: ["already missed", "met to missed", "failure share", "evidence lines", "recorded time", "tolerated leak", "standing ticket"],
    followUps: [
      "Why can't the fast rule fire on a 56 percent failure share?",
      "What would you change in the report?",
      "Who should own a standing miss?",
    ],
  },
  {
    id: "llmops-q26",
    course: "llmops",
    category: "operations",
    level: "senior",
    chapterId: "llmops-08-first-operations-review",
    question: "A pilot had a bad week and another team wants to join it. How do you run that decision?",
    idealAnswer:
      "I run one short review that reads the numbers and makes one decision. I start with the sum: requests, successes, attainment against target and budget left. Then I separate the incident from the steady state, because they need different fixes. If I take the incident out and the week is still under target, the leak is the real work. Next I check the open conditions, such as a security item that was due. A condition is either met or it isn't, and a good story doesn't close it. If the answer is no, I say what continues, so the people already on the system aren't stranded. I write each condition as a test someone can fail, with an owner and a date. I would also say what the numbers can't show. If the judge reads a third of the traffic, I say so before anyone quotes a pass rate.",
    keywords: ["one decision", "attainment", "separate incident from steady state", "open conditions", "what continues", "owner and date", "what the numbers can't show"],
    followUps: [
      "What would make you let the team join anyway?",
      "How do you keep the review short?",
      "What if the product owner disagrees with the security reviewer?",
    ],
  },
];

export default questions;
