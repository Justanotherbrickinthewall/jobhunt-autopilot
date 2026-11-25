import type { Chapter } from "../types";

// Revision 5, course 6, chapter 8. No lab: the learner writes sections 7 and 8 and the opening claim of section 3
// of docs/design.md, checks sections 9 and 10, and reviews the ADRs, all as follow-along steps.
// Every dollar figure is a worked example. It comes from `askpep cost-model` run on the 240 rows of
// `askpep incident seed --kind slow_rerank` (seed 7) with the placeholder prices in capstone/pricing.json, at
// 1,000 requests a day for 30 days. Nothing was run against a live service.
// CHECK: pricing.json holds placeholder prices (its _checked field says unchecked). Every dollar figure in this chapter is a worked example, not a current price.

const chapter: Chapter = {
  id: "architecture-08-design-review",
  course: "architecture",
  number: 8,
  title: "A design review defends the ADRs against the numbers",
  tagline: "Run the cost model, test five failures and put every ADR in front of a hostile reader.",
  minutes: 85,
  objectives: [
    "Say what a reviewer asks of a claim, and name the three verdicts.",
    "Run the cost model and say where each input comes from.",
    "Check a reroute against the code before you quote its saving.",
    "Find the weakest input of a cost figure, and say what would measure it.",
    "Write five failures with what the caller and the operator see.",
    "Tie each shipped behaviour to a requirement, and make the ADR list complete.",
    "Write the claim that opens section 3, and give each ADR a verdict.",
    "Read AskPEP's review, and reuse its shape for your own.",
  ],
  sections: [
    {
      id: "s1-review",
      title: "A design review tests every claim against a number or a line of code",
      goal: "What does a reviewer ask of each claim, and what can the answer be?",
      blocks: [
        {
          kind: "p",
          text: "A design survives review when each claim can name its number. On Thursday 10 December you play the reader who tries to break it. Chapters 1 to 7 wrote `docs/design.md` and the ADRs it links to. This chapter reviews all of it.",
        },
        {
          kind: "p",
          text: "An ADR is the short decision file from chapter 1, with its context, options, decision, consequences and evidence. A reviewer asks the same three questions of every claim in the design and in the ADRs.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "What number supports this claim?",
            "Where was the number measured, and by which command or run?",
            "What would change the number, and would the claim survive?",
          ],
        },
        {
          kind: "p",
          text: "A reviewer gives each claim one of three verdicts.",
        },
        {
          kind: "list",
          items: [
            "Stands. A measured number supports the claim, and the code agrees.",
            "Rests on an assumption. The number is a forecast or a placeholder, so say so and plan the measurement.",
            "Contradicted. The code or another number disagrees, so the claim or the code must change.",
          ],
        },
        {
          kind: "p",
          text: "The review has five parts. Each one writes or checks a part of `docs/design.md`.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Section 7, the cost model, from a run of `askpep cost-model`.",
            "Section 8, five failure scenarios, each read from what the code does today.",
            "Section 9, the behaviours the code already has, and section 10, the list of ADRs.",
            "The opening claim of section 3, which needs all four component rows.",
            "A verdict on each ADR, recorded in `docs/review.md`.",
          ],
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Every dollar figure is a worked example",
          text: "The prices in `pricing.json` are the placeholders that course 5 shipped. The traces are the seeded rows from the llmops incident rehearsal. The arithmetic is real and its inputs are not. Your figures match these only while your `pricing.json` still holds the placeholders.",
        },
        {
          kind: "quiz",
          id: "architecture08-q1",
          question: "Section 7 says the cache will cut the bill by a good margin. It gives no hit rate. What does the reviewer do?",
          options: [
            "Accepts it, because the cache is off by default and costs nothing to try.",
            "Asks which hit rate it assumes and where that was measured, and marks the claim a guess until it has a number.",
            "Replaces it with a saving quoted from an article about caches.",
            "Deletes the sentence, because cost belongs in the ADRs only.",
          ],
          answer: 1,
          explain: "`docs/design.md` says a section with no number is a guess. The reviewer asks the first two questions, what number and where it was measured. A figure from an article was measured on someone else's traffic.",
        },
        {
          kind: "p",
          text: "The first claim to test is the bill. Where does its figure come from?",
        },
      ],
    },
    {
      id: "s2-cost-model",
      title: "Section 7 is a projection, and each input of it is either measured or assumed",
      goal: "Where does each input of the cost model come from?",
      blocks: [
        {
          kind: "p",
          text: "The routing lab in chapter 2 built `askpep cost-model`. It prices a month of traffic from trace rows, the per-request records that the `traces` table holds. Course 5 priced what happened. This command prices what could happen.",
        },
        {
          kind: "p",
          text: "You give it a trace file. Four settings change the answer: requests a day, a number of days, a cache hit rate and a model change for a stage. A stage is one costed step of a request. In the seeded file the only costed stage is `generate`, the model call that writes the answer.",
        },
        {
          kind: "compare",
          caption: "The inputs of the cost model, and whether each one is measured.",
          columns: ["Input", "Where it comes from", "Measured or assumed"],
          rows: [
            ["Tokens in and out", "The trace rows. Here, the 240 seeded slow_rerank rows.", "Measured on the rows. The seeded rows are made up."],
            ["Price per million tokens", "`pricing.json`.", "Assumed. The file holds placeholders."],
            ["Requests a day", "`--requests-per-day`, which defaults to 1000.", "Assumed. It is a forecast."],
            ["Cache hit rate", "`--cache-hit-rate`, which defaults to 0.", "Assumed until `GET /admin/cache` measures it."],
            ["Model for a stage", "`--reroute STAGE=MODEL`.", "A proposal. The code may not be able to make it."],
            ["Success share", "The same rows: no error, no refusal, no early stop.", "Measured on the rows, then held fixed."],
          ],
        },
        {
          kind: "p",
          text: "It gives back three numbers. The cost per request is the mean model spend of one row. The cost per successful task divides that by the share of requests that succeed. The monthly total scales the cost per request to your volume.",
        },
        {
          kind: "p",
          text: "Here `hit` is the cache hit rate. A cache hit costs nothing and counts as a success.",
        },
        {
          kind: "code",
          lang: "text",
          code: [
            "monthly total = cost per request x requests a day x days x (1 - hit)",
            "cost per task = (1 - hit) x cost per request / (hit + (1 - hit) x success share)",
          ].join("\n"),
          caption: "The two lines of arithmetic behind every figure.",
        },
        {
          kind: "step",
          id: "architecture08-s01",
          title: "Seed the traces and price the baseline",
          text: "Seed the slow_rerank file from the llmops rehearsal, then price it with the defaults. The figures below match yours while `pricing.json` still holds the placeholder prices.",
          lang: "bash",
          code: "uv run askpep incident seed --kind slow_rerank\nuv run askpep cost-model --file incident/traces.jsonl",
          expect: [
            "wrote 240 rows with slow_rerank to incident/traces.jsonl",
            "stage              now usd    with changes usd",
            "generate            351.60              351.60",
            "rerank                0.00                0.00",
            "embed                 0.00                0.00",
            "dense                 0.00                0.00",
            "sparse                0.00                0.00",
            "fuse                  0.00                0.00",
            "240 request rows, 1000 requests a day for 30 days",
            "total now: 351.60 usd. With the changes: 351.60 usd.",
            "cost per successful task with the changes: 0.0119 usd",
          ].join("\n"),
        },
        {
          kind: "quiz",
          id: "architecture08-q2",
          question: "`askpep cost-model` reports a lower cost per successful task after a reroute. What does the figure assume about the cheaper model?",
          options: [
            "That it answers as well as the current model, because the eval was run on it.",
            "That it succeeds on the same share of requests as the traced model, because the command holds the success share fixed.",
            "That it uses fewer tokens, because cheaper models write shorter answers.",
            "That it raises the cache hit rate.",
          ],
          answer: 1,
          explain: "A reroute swaps the price and keeps the token counts and the success share. The command cannot see answer quality. Only an eval run on the cheaper model can.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Interview: estimating a monthly bill",
          text: "Name the inputs before the total. Take the mean tokens in and out from a sample of real traces, price them, then scale by requests a day and by 30. Say which inputs are measured and which are forecast, and give a range for each forecast. Finish with what the bill leaves out.",
        },
        {
          kind: "p",
          text: "The model prices any change you name. Can the code make every change it prices?",
        },
      ],
    },
    {
      id: "s3-reroute",
      title: "The cost model can price a change that the code cannot make",
      goal: "How do you check a reroute before you quote its saving?",
      blocks: [
        {
          kind: "p",
          text: "Send the `generate` stage to `gemini-3.8-flash` and the monthly total falls from $351.60 to $63.82. That is a saving of 82 percent. Before you quote it, ask whether the code can make the change.",
        },
        {
          kind: "p",
          text: "The model `gemini-3.8-flash` is the desk model from the agents course, and it has a price in `pricing.json`.",
        },
        {
          kind: "p",
          text: "The code cannot make the change. The `ROUTES` setting names a model for a desk role such as `researcher`. The `/ask` route is not a desk role. It builds one `ClaudeLLM` client from `ANSWER_MODEL`, and that client talks to the Anthropic API only.",
        },
        {
          kind: "p",
          text: "So the command prices the change and the code refuses it. The command swaps a price. It never asks whether the swap is possible, and it accepts any stage name and any model that has a price.",
        },
        {
          kind: "step",
          id: "architecture08-s02",
          title: "Price the reroute, then try it as a route",
          text: "Price the Flash reroute with a 0.3 hit rate, then ask `parse_routes` to accept the same change as a route. The second command fails with a traceback. The expected lines are the last three of the first command and the last line of the traceback.",
          lang: "bash",
          code: [
            "uv run askpep cost-model --file incident/traces.jsonl --cache-hit-rate 0.3 --reroute generate=gemini-3.8-flash",
            "uv run python -c \"from askpep.routing import parse_routes; parse_routes('{\\\"generate\\\": \\\"gemini-3.8-flash\\\"}')\"",
          ].join("\n"),
          expect: [
            "240 request rows, 1000 requests a day for 30 days",
            "total now: 351.60 usd. With the changes: 44.67 usd.",
            "cost per successful task with the changes: 0.0015 usd",
            "ValueError: ROUTES names 'generate', which is not a role that can be routed",
          ].join("\n"),
        },
        {
          kind: "quiz",
          id: "architecture08-q3",
          question: "The cost model prices `--reroute generate=gemini-3.8-flash` without complaint. What does that show?",
          options: [
            "That `ROUTES` can send `generate` to that model.",
            "That the model has a price in `pricing.json`, and nothing about whether the code can use it.",
            "That the model passed the eval for the `generate` stage.",
            "That `/ask` is routed whenever `ROUTING_ENABLED` is true.",
          ],
          answer: 1,
          explain: "The command swaps a price and keeps the token counts. It does not read `ROUTES`, the eval or the code. In this capstone `/ask` is never routed, and `parse_routes` refuses `generate` as a role.",
        },
        {
          kind: "p",
          text: "A reviewer marks this reroute as contradicted. The same saving may exist on the desk, so check the names first. A desk stage in the traces is the agent's name, and `ROUTES` is keyed by role. Confirm that both use the same word.",
        },
        {
          kind: "p",
          text: "Chapter 2 chose each role's model with `cheapest_passing`. It picks the cheapest model whose eval score reaches a floor, the lowest score a model may have.",
        },
        {
          kind: "p",
          text: "A price can be wrong even when the code can do the change. Which input is weakest?",
        },
      ],
    },
    {
      id: "s4-assumptions",
      title: "A cost figure fails on its hit rate, its success share or its scope",
      goal: "Which input of a cost figure is weakest, and what would measure it?",
      blocks: [
        {
          kind: "p",
          text: "The hit rate is the first weak input. The seeded traces were written with no cache, so they hold no hit rate. A figure such as 0.3 is a guess, and the only measure is `GET /admin/cache` on a running server. Nothing in this chapter turns the cache on, and it ships off.",
        },
        {
          kind: "p",
          text: "That route reports one process. The cache lives in the memory of one process, so each Cloud Run instance has its own and a restart empties it. The rate you measure on one instance is not the rate of the service.",
        },
        {
          kind: "p",
          text: "The cache also answers `/ask` only. The cost model applies the hit rate to every request row, so a file that mixes `/ask` and `/agent` rows overstates the saving.",
        },
        {
          kind: "fold",
          tone: "trouble",
          title: "`askpep cache stats` shows an empty cache",
          text: "The command runs in its own process, and that process has its own empty cache. Read a running server with `GET /admin/cache` and an admin key.",
        },
        {
          kind: "p",
          text: "The success share is the second weak input. The model holds it fixed, so it cannot see a cheaper model fail. The cost per successful task is therefore a poor gate.",
        },
        {
          kind: "p",
          text: "With these rows the break-even is about 18 percent. A cheaper model that succeeded on one request in five would still show a lower cost per successful task than the current model does.",
        },
        {
          kind: "p",
          text: "The answer-success objective would catch that model, because its target is 95 percent. So the eval floor and the objective gate a model. The cost figure only reports what the gate allowed.",
        },
        {
          kind: "p",
          text: "The scope is the third weak input. The table printed rerank, embed, dense, sparse and fuse at $0.00. The command prices only stages that record model tokens. It leaves out the Voyage embedding and rerank calls, the Postgres database, the Cloud Run service, the Cloud Tasks queue and trace storage.",
        },
        {
          kind: "p",
          text: "None of these has a price in `pricing.json`. The bill is a floor. Section 7 lists the left-out lines by name, with no figure, until someone prices them from the providers' own pages.",
        },
        {
          kind: "widget",
          id: "architecture08-bill-levers",
          intro: "Choose a model for `generate`, a cache hit rate and a success share. The widget prices the 240 seeded rows at the placeholder prices and says whether the code can make each change. Then choose the figure that heads section 7.",
        },
        {
          kind: "quiz",
          id: "architecture08-q4",
          question: "You read `GET /admin/cache` on one of three Cloud Run instances and it shows a hit rate of 0.4. What does section 7 do with that?",
          options: [
            "Uses 0.4 for the whole service, because it was measured.",
            "Records 0.4 as measured on one instance, and treats the rate for the service as an assumption, because each instance has its own cache.",
            "Averages 0.4 with the default of 0, and records 0.2.",
            "Drops the cache from the model, because a cache in memory cannot be measured.",
          ],
          answer: 1,
          explain: "The counters belong to one process. A new or restarted instance starts empty, so the other two may be colder. The figure is real for that instance and an assumption for the service.",
        },
        {
          kind: "step",
          id: "architecture08-s03",
          title: "Write section 7",
          text: "Write section 7 from your own run. Use the seeded file unless your traces table holds enough real rows, and say which one you used. Name every assumption. The text below is a worked example.",
          file: "docs/design.md",
          lang: "md",
          code: [
            "## 7. Cost model",
            "",
            "Claim: at 1,000 requests a day the model spend is about $352 a month. That figure is a worked example, and only the token counts behind it are measured.",
            "",
            "| Figure | Value | Where it came from |",
            "|--------|-------|--------------------|",
            "| Cost per request | $0.0117 | The monthly total over 30,000 requests |",
            "| Cost per successful task | $0.0119 | `askpep cost-model --file incident/traces.jsonl`, 240 seeded rows |",
            "| Monthly total | $351.60 | The same run, 1,000 requests a day for 30 days |",
            "| Cache hit rate | 0 | The cache is off by default |",
            "| Model changes | none | `/ask` is not routed, so the Flash reroute is not available |",
            "",
            "Assumptions: the placeholder prices in `pricing.json`, a forecast of 1,000 requests a day, and the success share of the seeded rows.",
            "",
            "Saving not counted: a 0.3 hit rate would give $246.12 a month. That rate is a guess until `GET /admin/cache` measures it.",
            "",
            "Left out of the bill: Voyage embedding and rerank calls, the Postgres database, the Cloud Run service, the Cloud Tasks queue and trace storage.",
          ].join("\n"),
        },
        {
          kind: "p",
          text: "The bill has limits, and you have named them. What happens when something breaks?",
        },
      ],
    },
    {
      id: "s5-failures",
      title: "Section 8 holds five failures, each read from what the code does today",
      goal: "What does the caller see, what does the operator see, and what recovers it?",
      blocks: [
        {
          kind: "p",
          text: "A failure scenario is a short story about one thing going wrong. Section 8 asks for five. Each one says what the caller sees, what the operator sees and what recovers it. A scenario that says what the code should do is a wish, so write what it does today.",
        },
        {
          kind: "p",
          text: "Creating the queue, its service account and the Cloud Run service belongs to the cloud course. This review reads the code and deploys nothing. This product name was checked on 22 October 2026.",
        },
        {
          kind: "p",
          text: "The widget has five failures. Pick what the code does in each one.",
        },
        {
          kind: "list",
          items: [
            "A provider answers 429 on a routed role.",
            "The queue delivers a job twice.",
            "A guard blocks a queued job, and the caller polls it.",
            "A new instance starts with an empty cache.",
            "The inline queue loses a job in a restart.",
          ],
        },
        {
          kind: "p",
          text: "Two terms first. A 429 is the status a provider sends when you call it too often. The inline queue is the default `ASYNC_MODE`, which runs each job on a thread in the same process.",
        },
        // CHECKED 22 Oct 2026: https://docs.cloud.google.com/tasks/docs/dual-overview says Cloud Tasks delivers a task at least once and that handlers should be safe to repeat.
        {
          kind: "widget",
          id: "architecture08-failure-walk",
          intro: "Five failures of the capstone as it runs today. Pick what happens in each one. Every answer comes from reading the code, and none was run against a live service.",
        },
        {
          kind: "p",
          text: "Case 2 rests on a lock. `desk_status`, the function behind the poll route, reports a thread with unfinished steps as stopped, whether it crashed or is still running. A duplicate that arrives mid-run would continue the same thread a second time. So `run_job` first takes a Postgres advisory lock on the thread, and the duplicate gets a 503.",
        },
        {
          kind: "p",
          text: "The lock holds one pool connection for the whole run. Nobody ran that race against a live queue here, so write the cost as a question.",
        },
        // CHECK: Cloud Tasks reserves a task name after the task is deleted or has run, for up to 24 hours (up to 9 days for queues made with queue.yaml), and tasks.create answers ALREADY_EXISTS for a reused name. Source: the tasks.create REST reference, read on 22 October 2026 through a summarising fetch, not the page itself. Also confirm that ALREADY_EXISTS reaches the capstone as HTTP 409.
        {
          kind: "fold",
          tone: "trouble",
          title: "A blocked job retried on the same thread id answers 409, and its poll still answers 404",
          text: "A blocked run leaves no checkpoint, so the status check alone would pass a retry with the same thread id. The default inline queue never forgets an id, and Cloud Tasks may hold the name too, which `CloudTasksQueue.enqueue` counts as success. The caller would get a 202 and nothing would run. So `input_blocked` reads the guard's audit row, and the route answers 409. The poll still answers 404. Nobody ran it against a live queue.",
        },
        {
          kind: "step",
          id: "architecture08-s04",
          title: "Find the line behind each failure",
          text: "For each failure, find the line of code that decides it. Line numbers differ in your files, so search for the text.",
          lang: "bash",
          code: [
            "grep -n \"is_provider_error\" src/askpep/routing.py",
            "grep -n \"409\\|404\" src/askpep/api.py",
            "grep -n \"class InMemoryCache\" src/askpep/cache.py",
            "grep -n \"class InlineQueue\" src/askpep/fakes.py",
          ].join("\n"),
        },
        {
          kind: "quiz",
          id: "architecture08-q5",
          question: "A caller sends `POST /jobs/agent` twice with the same new thread id before the worker has started. What does the capstone do?",
          options: [
            "It runs the desk twice, because each request is a new job.",
            "It answers 202 both times and queues one job, because no checkpoint exists yet and the task name comes from the thread id.",
            "It answers 409 to the second request, because the thread id is already known.",
            "It answers 502 to the second request, because the queue refuses a repeated name.",
          ],
          answer: 1,
          explain: "The 409 needs a checkpoint, and none exists until the worker starts. The task name is a hash of the thread id, so the queue takes the second call as a repeat and queues nothing. Both callers get a 202 and one run happens.",
        },
        {
          kind: "step",
          id: "architecture08-s05",
          title: "Write section 8",
          text: "Write five failures into section 8, each with the three views. Use these five or choose your own, and read each one from your code. The rows below are a worked example.",
          file: "docs/design.md",
          lang: "md",
          code: [
            "## 8. Failure scenarios",
            "",
            "Claim: the code absorbs two of the five failures below and leaves three to a person.",
            "",
            "| # | Failure | The caller sees | The operator sees | What recovers it |",
            "|---|---------|-----------------|-------------------|------------------|",
            "| 1 | A routed provider answers 429 | A slower answer from Claude | A fallback warning in the log, and a higher cost on that call | Nothing to do. A 400 or a 401 does not fall back |",
            "| 2 | The queue delivers a job twice | One answer | Two calls to `/internal/tasks/agent`, and a 503 if the first run is still going | Nothing to do. A duplicate mid-run waits on the thread's lock and the queue retries it |",
            "| 3 | A guard blocks a queued job | A 404 on `GET /agent/{thread_id}`, the same as an unknown thread. A repeat post answers 409 | The input guard's audit event, and a trace with no stages | By design. Ask whether a block needs its own answer on the poll |",
            "| 4 | A new instance starts cold | Slower answers for questions that were hits elsewhere | Counters at zero on `GET /admin/cache` for that instance | Time, up to 1,000 entries that each last 3,600 seconds |",
            "| 5 | The inline queue loses a job in a restart | A 404, or a stopped status that answers 409 to a repeat with the same thread id | Nothing | A new thread id, or `ASYNC_MODE=cloud_tasks` |",
          ].join("\n"),
        },
        // CHECK: Cloud Tasks retries a task whose call does not answer 2xx, under the queue's own retry settings. Source: the Cloud Tasks retry documentation, not read for this chapter.
        {
          kind: "callout",
          tone: "interview",
          title: "Interview: how does your design fail?",
          text: "Follow the request path, and give every failure a caller view, an operator view and a recovery. Say which failures the system absorbs and which need a person. Then name one failure you found by reading the code and did not run, and say how you would test it.",
        },
        {
          kind: "p",
          text: "Those failures came from reading code. Which other behaviours did the code choose for you?",
        },
      ],
    },
    {
      id: "s6-behaviours",
      title: "Each behaviour in section 9 needs a requirement behind it",
      goal: "Which requirement does each shipped behaviour serve?",
      blocks: [
        {
          kind: "p",
          text: "Section 9 of `docs/design.md` came with the course's starter files. It lists four decisions that the reference code made for you. A reviewer asks which requirement each one serves. A decision with no requirement behind it is an accident.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "A cache hit runs the input guards and skips the output guards.",
            "The cache lives in one process, so each instance has its own.",
            "A queue delivers a job at least once, and a repeated thread id runs once.",
            "A guard-blocked run leaves no checkpoint, so polling it answers 404.",
          ],
        },
        {
          kind: "callout",
          tone: "insight",
          title: "Why a hit can skip the output guards",
          text: "Only a cited answer that was not refused is stored, and the cache key holds the guard settings. So each stored answer passed the output guards once, under the settings of that day. The risk is a change to guard code or to the prompt, which the key does not see.",
        },
        {
          kind: "quiz",
          id: "architecture08-q6",
          question: "A requirement says every answer a caller gets has passed the output guards. Which behaviour in section 9 puts it at risk?",
          options: [
            "A cache hit skips the output guards, so a change to guard code does not reach stored answers until they expire.",
            "The cache lives in one process.",
            "A queue delivers a job at least once.",
            "A blocked run leaves no checkpoint.",
          ],
          answer: 0,
          explain: "A stored answer passed the guards once, under the settings in its key. The key holds no guard code and no prompt. A change there reaches a hit only after the entry expires, 3,600 seconds by default, or after a restart.",
        },
        {
          kind: "step",
          id: "architecture08-s06",
          title: "Review the four behaviours",
          text: "Add a review line under each behaviour in section 9. Say which requirement it serves, what it puts at risk, and your verdict. Leave the existing text as it is. The lines below are a worked example.",
          file: "docs/design.md",
          lang: "md",
          code: [
            "1. A cache hit runs the input guards and skips the output guards. (existing text)",
            "   Review: serves the latency requirement, since a hit makes no model call. A change to the prompt or to guard code does not reach stored answers for up to 3,600 seconds. Verdict: stands for settings changes, contradicted for code changes.",
            "",
            "2. The cache lives in one process. (existing text)",
            "   Review: costs nothing at one instance. At several, the hit rate differs per instance, and the rate in section 7 is a guess. Verdict: rests on an assumption.",
            "",
            "3. A queue delivers a job at least once. (existing text)",
            "   Review: serves any requirement that a question runs once. A duplicate that arrives mid-run waits on a lock that holds one pool connection for the whole run, so ten runs at once starve the pool. Verdict: stands, with one limit to watch.",
            "",
            "4. A run that a guard blocked leaves no checkpoint. (existing text)",
            "   Review: keeps no state for a blocked question, which is cheap. A caller cannot tell a block from an unknown thread on a poll, though a repeat post answers 409. Verdict: rests on an assumption that callers never need to.",
          ].join("\n"),
        },
        {
          kind: "p",
          text: "Section 10 lists every ADR. A reviewer checks it from both ends. Every file in `docs/adr/` except the template needs a row, and every row needs a file and a status.",
        },
        {
          kind: "step",
          id: "architecture08-s07",
          title: "Check the ADR list from both ends",
          text: "List the ADR files, then open section 10. Match each file to a row and each row to a file. Fix the list before you go on.",
          lang: "bash",
          code: "ls docs/adr",
        },
        {
          kind: "p",
          text: "Every section has been tested. What claim does the whole design make?",
        },
      ],
    },
    {
      id: "s7-verdicts",
      title: "The opening claim of section 3 comes last, because it needs every row",
      goal: "What does the design claim overall, and does each ADR survive?",
      blocks: [
        {
          kind: "p",
          text: "The opening claim of section 3 says which component choices matter most, and why. It comes last because it needs all four rows: chat models, retrieval stack, agent runtime and serving shape. Chapters 2 to 5 filled them.",
        },
        {
          kind: "p",
          text: "Write a claim that a reviewer can attack with a number from this chapter. The worked example points at the chat model and serving shape rows, because `generate` is the only priced stage, at $351.60 of $351.60.",
        },
        {
          kind: "step",
          id: "architecture08-s08",
          title: "Write the opening claim of section 3",
          text: "Write the claim above the component table. Cite one number from section 7, and say which rows it leaves out. The text below is a worked example.",
          file: "docs/design.md",
          lang: "md",
          code: "The chat model row and the serving shape row matter most. In the worked example, `generate` is the only priced stage, so it makes up the whole $351.60 a month. The cache and the model choice are the two levers on it. The retrieval stack and agent runtime rows are decided on latency and operations. The bill leaves out their costs.",
        },
        {
          kind: "widget",
          id: "architecture08-claim-audit",
          intro: "Six claims from a sample AskPEP design. Give each one a verdict: stands, rests on an assumption or contradicted. A wrong pick shows a nudge, and you get one more try.",
        },
        {
          kind: "p",
          text: "Apply the same three verdicts to each ADR. Take the claim in its Decision sentence and test it against the numbers. Then act on the verdict.",
        },
        {
          kind: "list",
          items: [
            "Stands. Leave the ADR accepted.",
            "Rests on an assumption. Leave it accepted, and add a line to Consequences that names the measurement which would settle it.",
            "Contradicted. Write a new ADR for the change, and set the old one to superseded by its number.",
          ],
        },
        {
          kind: "quiz",
          id: "architecture08-q7",
          question: "An ADR turned the cache on and cited a 0.3 hit rate that nobody measured. What does the review record?",
          options: [
            "Stands, because the cache is off by default and can be turned off again.",
            "Rests on an assumption. Consequences gets a line that names `GET /admin/cache` as the measure and the hit rate that would show it wrong.",
            "Contradicted, with a new ADR that turns the cache off.",
            "Nothing, because an accepted ADR is not reviewed again.",
          ],
          answer: 1,
          explain: "An unmeasured hit rate is a guess and not a contradiction, so the ADR stays accepted. The review adds the measurement and the number that would make it wrong. A new ADR is for a claim that the code or a number contradicts.",
        },
        {
          kind: "step",
          id: "architecture08-s09",
          title: "Record a verdict for each ADR",
          text: "Create `docs/review.md` with one row for each claim you test, named by its ADR. An ADR with two claims gets two rows. Give the claim, your verdict, the evidence and the action. The rows below are a worked example, so use your own ADR numbers and titles.",
          file: "docs/review.md",
          lang: "md",
          code: [
            "# Design review of AskPEP",
            "",
            "Date: the day you ran the review, written as 22 October 2026.",
            "",
            "| ADR | Claim tested | Verdict | Evidence | Action |",
            "|-----|--------------|---------|----------|--------|",
            "| 0001 Route triage to a cheaper model, with Claude behind it | Routing cuts desk spend | Rests on an assumption | The seeded file has no desk rows, so no desk saving was priced | Run `askpep cost-model` on real desk rows with `--reroute <agent>=<model>` |",
            "| 0004 Serving shape: leave the cache off | A 0.3 hit rate would save $105.48 a month, and nobody has seen 0.3 | Rests on an assumption | The rate is a guess, and `GET /admin/cache` reports one instance | Measure on a running server, and add the rate that would show the ADR wrong to Consequences |",
            "| 0004 Serving shape: queue long work with Cloud Tasks | A thread queued twice runs once | Stands | Section 9, item 3, and the job tests | Add the lock's one-connection cost to Consequences as a limit |",
          ].join("\n"),
        },
        {
          kind: "p",
          text: "That is your review. What did AskPEP's find?",
        },
      ],
    },
    {
      id: "s8-review-record",
      title: "AskPEP's review finds one queue claim that its own code contradicts",
      goal: "What did AskPEP's review find, and what must change because of it?",
      blocks: [
        {
          kind: "p",
          text: "Twelve claims went in. Five stand, six rest on assumptions, and one is contradicted. You run the review yourself, with the security reviewer reading over your shoulder. The bill passes. At 1,000 requests a day the model spend is 353.64 dollars a month, against a ceiling of 600.",
        },
        {
          kind: "p",
          text: "The contradicted claim is in ADR 0004. It says queued runs answer to R6 alone. So you read `run_job`, and it calls `desk_job`. `desk_job` calls `run_desk` and passes no route. The default route is `agent`, and `askpep slo` counts that route. A 40-second overnight run would count against R3.",
        },
        {
          kind: "p",
          text: "The security reviewer asks if R3's 0.962 is still good. It is, because no queued run has happened yet. The queue is not on. So the fault is caught before it costs anything, and the fix is one label. It is ADR 0007, and it needs a line of code before the queue goes on.",
        },
        {
          kind: "code",
          lang: "text",
          code: `## 7. Cost model

Claim: at 1,000 requests a day the model spend is 353.64 usd a month, 59% of the ceiling.

Figure                         Value        Where it came from
Cost per request, 25 Nov       0.0101       askpep cost, 2.0181 usd over 200 requests
30,000 requests                302.72       the line above x 30,000
Routing, ADR 0001              -3.98        298.74, askpep cost-model
Chunk limit 512, ADR 0002      +18.00       0.12 usd a day x 5 x 30 days
Model spend                    316.74
Online judge at 0.1, ADR 0006  +36.90       100 calls x 0.0123 x 30, an upper bound
Total                          353.64       ceiling 600, constraint C3
Cost per success               0.0115       316.74 over 27,600 successes at 92%. R4 allows 0.02
Cache                          0            off, ADR 0004

Assumptions: placeholder prices, 1,000 a day from one estimate, and 92% success.
Left out: Voyage, Postgres, Cloud Run, Cloud Tasks, trace storage, Model Armor.

## 8. Failure scenarios

Claim: the code absorbs four of these five, and one reaches a caller by design.

#  Failure                           The caller sees              The operator sees            What recovers it
1  Flash answers 429 on triage       A slower triage on Claude    A fallback warning           Nothing to do
2  The queue delivers a job twice    One answer                   A second run returning       Nothing to do
                                                                  status running
3  A guard blocks a queued job       404 on the poll, 409 on      An input guard audit event   By design
                                     a repeat post
4  An instance dies mid-run          A longer wait                A stopped thread, a retry    Redelivery continues from
                                                                                             the last checkpoint
5  Two posts with one new thread id  One 202, one run             One task name                Nothing to do. An existing
                                                                                             task name counts as success

Not run: each row comes from reading the code. None ran against a live queue.`,
          caption: "Sections 7 and 8 of the design, whole. Every dollar uses placeholder prices.",
        },
        {
          kind: "p",
          text: "Read the Cost per success line against R4. It leaves 0.0085 dollars of room, and that room is only as good as the 92% beside it. Read the Left out line next. The bill is a floor, and course 7 prices the rest.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# Design review of AskPEP, 10 December 2026

ADR   Claim                                    Verdict      Evidence                         Action
0001  Triage holds 15 of 16 on Flash           Stands       Three runs: 15, 15, 16           None
0001  Flash quota holds at 1,000 a day         Assumption   Not measured                     Load test, course 7
0002  Chunk limit 512 lifts answer to 21/23    Stands       Staging commit 3c91e2b           None
0002  The fix brings R7 to 0.95                Assumption   Under one working week of data   Two full working weeks
0003  One engineer can run this on Cloud Run   Assumption   Nine days of the hours log       Reopen at 8 hours a week
0004  The cache isn't worth turning on         Assumption   Second team only                 Measure the third team
0004  Queued runs answer to R6 only            Contradicted desk_job passes no route, so     ADR 0007, before the queue
                                                            traces read agent and count      goes on
                                                            towards R3
0004  A thread delivered twice runs once       Stands       Advisory lock in run_job,        Keep the one-connection
                                                            read and not raced live          limit in Consequences
0005  14-day checkpoints fit the disk          Stands       2.4 GB of 10 GB                  None
0005  Redact at write closes T11               Assumption   A plan, and names are not caught T11, due 14 December
0006  Evals add nothing to the wait            Stands       No eval runs in a route          None
0006  Model Armor adds 760 ms                  Assumption   Made-up figure                   Measure, course 7

# 0007. Queued runs get their own trace route

- Status: accepted
- Date: 10 December 2026
- Supersedes: the measurement clause of 0004. The rest of 0004 stands.

## Context
desk_job calls run_desk with no route. The default is agent, which counts towards R3.

## Decision
We will have desk_job pass route="agent.queued" and count that route under R6 only.
The cost report keeps counting it, so it joins REQUEST_ROUTES.

## Consequences
Easier: R3 measures people waiting, as ADR 0004 meant.
Harder: one more route in each report.
Not done: the code. Owner: engineering. Before ASYNC_MODE=cloud_tasks goes live.

## Evidence
api.py desk_job, agents/graph.py run_desk, telemetry/records.py REQUEST_ROUTES.`,
          caption: "docs/review.md and ADR 0007, whole.",
        },
        {
          kind: "p",
          text: "Read the Action column before the Verdict column. An assumption with no action is a claim nobody will check. The contradicted row names the three files that disagree, so anyone can confirm it in a minute.",
        },
        {
          kind: "p",
          text: "Reuse this table for any review. One claim per row, and a claim has to be something a number could break.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# Design review of <system>, <date>

ADR   Claim   Verdict   Evidence   Action

Verdicts: Stands. Assumption. Contradicted.
Every Assumption names a measurement.
Every Contradicted names a new ADR.

## 7. Cost model
Claim:
Figure   Value   Where it came from
Assumptions:
Left out:

## 8. Failure scenarios
Claim:
#   Failure   The caller sees   The operator sees   What recovers it
Not run:`,
          caption: "For your next design review, the same record with blank values.",
        },
        {
          kind: "p",
          text: "The review is written. Tomorrow the people who own the conditions read it. Does the third team join, and what does the next course inherit? Chapter 9 ends the course there.",
        },
      ],
    },
  ],
  recap: [
    "A design review gives each claim one verdict: stands, rests on an assumption, or contradicted.",
    "Each input of the cost model is measured or assumed, and section 7 says which.",
    "The cost model prices any reroute, so check that the code can make it before you quote the saving.",
    "The eval floor and the answer-success objective gate a cheaper model. The cost per successful task only reports the result.",
    "A failure scenario names what the caller sees, what the operator sees and what recovers it, read from today's code.",
    "Each behaviour in section 9 needs a requirement behind it, and every ADR needs a row in section 10.",
    "The opening claim of section 3 is written last, and each ADR leaves the review accepted, annotated or superseded.",
    "AskPEP's review put 12 claims to the test: five stand, six are assumptions and one is contradicted by `desk_job`.",
  ],
  reinforcement: "Open `docs/design.md` tomorrow and pick one number in it. Say where it was measured, by which command, and on whose traffic. If you cannot, mark it an assumption and write the measurement that would settle it. Then check that the same number appears nowhere else in the design with a different value.",
  interviewIds: ["architecture-q18", "architecture-q19", "architecture-q20"],
};

export default chapter;
