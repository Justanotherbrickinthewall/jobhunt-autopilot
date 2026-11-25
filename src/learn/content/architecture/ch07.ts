import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "architecture-07-safety-and-quality-by-design",
  course: "architecture",
  number: 7,
  title: "Guards and evals are components with latency and cost budgets",
  tagline: "Place each guard and each eval on the path, then price it with numbers you can name.",
  minutes: 70,
  objectives: [
    "Sort every check into the ones a caller waits for and the ones it never sees.",
    "Give each check a latency budget and a cost budget, and name each number's source.",
    "Place each eval, and price the one that runs on live traffic.",
    "Say why a cache hit may skip the output guards, and find the change the key can't see.",
    "Measure your guards, then write section 6 and its ADR.",
    "Read AskPEP's safety ADR, and reuse its shape to place a new check.",
  ],
  sections: [
    {
      id: "s1-place-each-check",
      title: "A check on the request path adds to the wait, and one beside it doesn't",
      goal: "Which checks does a caller wait for, and which does it never see?",
      blocks: [
        {
          kind: "p",
          text: "Each check has a place and a price, and you find both by asking who waits for it. On Wednesday 9 December the security reviewer asks for that list. The names gap from T11 waits on Model Armor, and Model Armor sits on the path.",
        },
        {
          kind: "p",
          text: "Today you fill in section 6 of the design and write one ADR. There is no lab, because the output is a document.",
        },
        {
          kind: "p",
          text: "The **request path** is everything that runs between a caller sending a question and the caller reading the answer. A check in that path adds its time to the wait. A check that runs in CI, or on stored traces, adds nothing to it. Settle that first for every check.",
        },
        {
          kind: "p",
          text: "Course 3 gave you four stages where a guard can run. `input` is the question, before the model reads it. `retrieved` is the passages a search returned. `tool_call` is a tool call the model has chosen, before it runs. `output` is the finished answer.",
        },
        {
          kind: "p",
          text: "AskPEP has four guards, and `build_guards` chains them in a fixed order. A chain runs the guards of one stage in order and stops at the first block. `InjectionGuard` comes first and covers three stages. The Guardrails AI guard checks citations on the answer. `PiiGuard` redacts personal data in it.",
        },
        {
          kind: "p",
          text: "`ArmorGuard` comes last. It sends the question and the answer to Model Armor, and only when `MODEL_ARMOR_TEMPLATE` is set. The other three guards are local code. So order is a budget decision. A block from a cheap guard ends the chain before the network call. The Model Armor name was checked on 22 October 2026.",
        },
        {
          kind: "compare",
          caption: "Where each path runs its guards. Chapter 5 added `/jobs/agent` and the cache.",
          columns: ["Path", "Input guards", "Passage screening", "Tool-call guards", "Output guards"],
          rows: [
            [
              "`/ask`",
              "Yes, before retrieval.",
              "Yes, between packing and the model. No `<untrusted>` marking.",
              "None. It calls no tools.",
              "Yes. They hold the stream.",
            ],
            [
              "`/agent`",
              "Yes.",
              "Yes, in the desk's tool wrapper.",
              "Yes, and an approval before `open_ticket`.",
              "Yes. They hold the stream.",
            ],
            [
              "`/jobs/agent`",
              "Yes, as `/agent`.",
              "Yes, as `/agent`.",
              "Yes, as `/agent`.",
              "Yes, but nothing streams. The caller polls.",
            ],
            [
              "A cache hit on `/ask`",
              "Yes. The hit still screens the question.",
              "None. No retrieval runs.",
              "None.",
              "Skipped.",
            ],
          ],
        },
        {
          kind: "callout",
          tone: "warn",
          title: "`/ask` screens its passages but doesn't mark them as data",
          text: "The `retrieved` stage runs in the desk's tool wrapper and in `guarded_ask_stream`. The desk also wraps each passage in an `<untrusted>` block. `/ask` doesn't. It leans on a system-prompt line that says to treat source text as data. A prompt line proves nothing. Record this as a known gap in section 6.",
        },
        {
          kind: "widget",
          id: "architecture07-path-placer",
          intro:
            "Ten checks come up one at a time. Place each one before the model, inside the run, on the answer, before release or after the request. The last screen lists the right place for each check, as the start of section 6.",
        },
        {
          kind: "quiz",
          id: "architecture07-q1",
          question: "Which path sends retrieved passages to the model without wrapping them in `<untrusted>` blocks?",
          options: [
            "`/agent`, because its tool wrapper skips the passages that `search_peps` returns.",
            "`/ask`, because only the desk's tool wrapper adds `<untrusted>` blocks.",
            "`/jobs/agent`, because the worker runs with no guards.",
            "None of them. Every path marks its passages.",
          ],
          answer: 1,
          explain:
            "The desk's tool wrapper screens each passage and wraps it, so `/agent` and `/jobs/agent` do both. `/ask` screens its passages with `guarded_ask_stream` and then sends them as plain text, under its system prompt's rule.",
        },
        {
          kind: "p",
          text: "You now know where each check sits. How much is each one allowed to add?",
        },
      ],
    },
    {
      id: "s2-budgets",
      title: "A budget caps what a check may add, and every number names its source",
      goal: "How much time and money may each check add, and who says so?",
      blocks: [
        {
          kind: "p",
          text: "A **budget** is the most time and money a check may add to a request. R3 and the other objectives set the ceiling. 95 percent of requests must finish within 10,000 ms. At least 97 percent must pass the guards. Cost per successful task must stay under 0.02 USD.",
        },
        {
          kind: "p",
          text: "That 0.02 USD limit is a worked example, because the llmops course prices models with placeholders. Every cost in this chapter is a worked example for the same reason. Every number also needs a source, and a number with no source is a guess.",
        },
        {
          kind: "p",
          text: "This chapter uses only numbers that an earlier course gives, and it names that course. Where no course gives a number, the table says so. Then you measure it on your own traffic.",
        },
        // CHECK: that Model Armor is billed per call and that no price is known. No chapter on main gives a Model Armor price or a measured latency. The 380 ms is the p95 of course 3's 20 made-up call times. Read the current Model Armor pricing page before you put a number in a design.
        {
          kind: "compare",
          caption:
            "What each check adds, and the course that gives the number. Every cost is a worked example on placeholder prices.",
          columns: ["Check", "Time it adds", "Money it adds", "Source"],
          rows: [
            ["`InjectionGuard`", "Microseconds. It makes no network call.", "Nothing.", "Course 3"],
            [
              "The output guard, with the stream held",
              "Milliseconds for the check. The first token arrives at about 6 s instead of 3 s in the example.",
              "Nothing, until it asks again.",
              "Course 3",
            ],
            [
              "A reask",
              "One more model call, 3 s. The most is `OUTPUT_MAX_REASKS`, which is 1 by default.",
              "One more answer call. 1.275 cents if it matches the 3,000 in and 250 out worked request.",
              "courses 3 and 5",
            ],
            [
              "`PiiGuard`",
              "Local code. No chapter gives a figure, so measure it.",
              "Nothing.",
              "Course 3",
            ],
            [
              "Model Armor, one call",
              "Your own p95. The made-up times give 380 ms, and 760 ms for both ends.",
              "Google bills each call. No chapter gives a price.",
              "Course 3",
            ],
            [
              "The approval before `open_ticket`",
              "As long as a person takes, up to 3,600 s.",
              "No model call while it waits. A paused run holds a checkpoint, not a process.",
              "Course 3",
            ],
            ["The kill switch", "None. The service reads it once, at start.", "Nothing.", "Course 3"],
          ],
        },
        {
          kind: "p",
          text: "One cost still misses `cost_usd`. A reask is counted on `/ask` and on the desk, because the output guard runs inside `reporting_to(trace)`. Model Armor is the cost that is missed. Google bills it outside your model prices. Add it by hand.",
        },
        {
          kind: "p",
          text: "Time has its own blind spot. The `latency_ms` column in the `audit` table times only the guard's check. The audit INSERT that follows is a synchronous database write, and the timer has already stopped. So the sum of your guard p95s is a floor on what the guards add.",
        },
        // CHECK: that the first reask in a process takes seconds longer than later reasks. Course 3 saw about 4 seconds longer on its test machine and did not confirm the cause.
        {
          kind: "fold",
          tone: "hood",
          title: "The first reask in a process runs slow",
          text: "Course 3 saw the first reask in a process take about 4 seconds longer than the next ones. It did not confirm why. A pause like that lands in the tail of the distribution. So budget on the p95 and not the p50.",
        },
        {
          kind: "p",
          text: "The queue changes who feels a slow check. `POST /jobs/agent` answers 202 at once. A worker calls `run_desk`, which returns the finished run and streams nothing. The caller polls `GET /agent/{thread_id}`. Nobody watches a blank screen.",
        },
        {
          kind: "widget",
          id: "architecture07-wait-budget",
          intro:
            "Five requests, each with a timeline. Predict the wait, then read the bar. The seconds are course 3's, the 380 ms is course 3's made-up p95, and the 10 s limit is course 5's.",
        },
        {
          kind: "quiz",
          id: "architecture07-q2",
          question:
            "A `/ask` request needs one reask. In course 5's worked example an answer call costs 1.275 cents. What does `cost_usd` on the trace show, and what did the request cost?",
          options: [
            "2.55 cents on the trace, and 2.55 cents in all.",
            "1.275 cents on the trace, and 2.55 cents in all.",
            "1.275 cents on the trace, and 1.275 cents in all, because a reask is free.",
            "2.55 cents on the trace, and 5.1 cents in all.",
          ],
          answer: 0,
          explain:
            "The reask's tokens go on the request's trace as a `reask` stage, so the trace counts two calls. If the reask is the same size as the first call, the request cost 2.55 cents. That is above the 2 cent limit.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Your guards add latency. How do you budget it?",
          text: "Answer first: take each guard's p95 from your own audit rows. Add the ones on the path the caller waits for, and compare the sum with the SLO. Then say what the sum leaves out. Stage p95s don't add exactly, and the audit write sits outside the timer. Say which guards are local and put them first.",
        },
        {
          kind: "p",
          text: "Guards cost the caller time. What do the evals cost, and who pays?",
        },
      ],
    },
    {
      id: "s3-evals",
      title: "Evals run before release or after the answer, so none adds to the wait",
      goal: "Where does each eval run, and what does the live one cost?",
      blocks: [
        {
          kind: "p",
          text: "An eval scores the system and changes nothing the caller receives. So it has no reason to sit in the request path. Each eval you built runs before a release or after a request. None adds a second to a caller's wait. They add money, and some add review time.",
        },
        {
          kind: "compare",
          caption: "When each eval runs, what it costs, and the course that gives the figure.",
          columns: ["Eval", "When it runs", "What it costs", "Source"],
          rows: [
            [
              "The release gate, `askpep eval gate`",
              "In CI, on every pull request, before a change ships.",
              "It plays five slices and 104 questions. A live run calls Gemini and Voyage and costs money. The attack slice plays offline and is free.",
              "courses 4 and 5",
            ],
            [
              "Judge calibration, `askpep eval calibrate`",
              "When the judge's model, rubric or settings change.",
              "56 calls to Claude: 24 verdicts, then 16 and 16 for the two bias checks. The judge gates only at kappa 0.6 or more and 10 percent false passes or fewer.",
              "Course 4",
            ],
            [
              "The online judge, `askpep eval online`",
              "After the request, as a command over stored traces.",
              "One judge call for each sampled trace that has sources. At the default rate of 0.1 that is up to 200 calls on 2,000 requests a day.",
              "Course 5",
            ],
            [
              "The thumbs button, `POST /feedback`",
              "After the answer, when a user clicks.",
              "One row in the `feedback` table. No model call.",
              "Course 5",
            ],
            [
              "The SLO report, `askpep slo`",
              "After the fact, as a command over 28 days of traces.",
              "It reads stored traces and calls no model. It prints six lines.",
              "Course 5",
            ],
          ],
        },
        {
          kind: "p",
          text: "Price the online judge. At the default sample rate of 0.1, 2,000 requests a day give 200 judged answers (course 5). Suppose a judge call costs what one answer call costs, which is 1.275 cents in course 5's worked request. Then the judge costs 200 times 1.275 cents, or $2.55 a day.",
        },
        {
          kind: "p",
          text: "That is a worked example on placeholder prices. A verdict is short, so a real judge call probably costs less. The spend shows in your cost report, on a line of its own. `eval online` writes one trace for each verdict, on the route `eval.judge`. `askpep cost` prints their total as `online judges`, outside the cost per task.",
        },
        {
          kind: "p",
          text: "The judge costs people time too. Course 5's worked example assumes 10 percent of judged answers fail. That gives 20 failures and 5 thumbs-down, so 25 candidates a day. At 3 minutes each, that is 75 minutes a day. Budget the reviewer like any other cost.",
        },
        {
          kind: "p",
          text: "You could run the judge on every answer, inside the request path. Put numbers on that option. One more model call adds about 3 s (course 3) and, in the worked example, 1.275 cents. Cost per request doubles to 2.55 cents, past the 2 cent limit.",
        },
        {
          kind: "p",
          text: "The time breaks the budget too. The desk with Model Armor and one reask already takes 9.76 s in the widget's example. Three more seconds put it past the 10 s limit. This is the option your ADR rejects, and these numbers are the reason.",
        },
        {
          kind: "quiz",
          id: "architecture07-q3",
          question:
            "You raise the online sample rate from 0.1 to 0.2 on 2,000 requests a day. A judge call costs 1.275 cents in the worked example. What happens?",
          options: [
            "The cost stays at $2.55 a day, because the judge runs off the request path.",
            "The cost doubles to $5.10 a day, and no caller waits any longer.",
            "The cost doubles, and every caller waits 3 s longer.",
            "The cost rises by 10 percent.",
          ],
          answer: 1,
          explain:
            "The sample is hash-based and nested, so the 200 judged answers stay judged and 200 more join them. 400 calls at 1.275 cents is $5.10. Off the path means no caller waits. It doesn't mean no spend.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Where do you run evals in an LLM system",
          text: "Answer first: before release and after the answer, never in the request path. A gate in CI catches regressions on a fixed set. A judge over a sample of stored traces catches drift on live traffic. Then name the cost. The judge's calls are real spend, so set the sample rate from a daily budget.",
        },
        {
          kind: "p",
          text: "Guards and evals are placed. One design choice can skip a guard altogether. Which one?",
        },
      ],
    },
    {
      id: "s4-cache",
      title: "A cache hit skips the output guards, so the key must hold every guard setting",
      goal: "What would a cache hit do to the guards on the day the cache is on?",
      blocks: [
        {
          kind: "p",
          text: "Chapter 5 left AskPEP's cache off, and its ADR says when to reopen that. So read this section as the check for that day. A hit returns a stored answer, so no model runs. This is what a hit does to the guards when the cache is on.",
        },
        {
          kind: "p",
          text: "A hit still runs the input guards. The question is screened, and the audit row is written. A hit skips the output guards. Section 9, item 1 of `docs/design.md` gives the reason. The cache stores only a cited, unrefused answer, so every stored answer passed the output guards once.",
        },
        {
          kind: "p",
          text: "That holds only while the key changes whenever a guard setting changes. An answer cleared under old settings must not be served under new ones. The key holds the settings that shape the answer and the guards. It also holds the corpus version and a scope.",
        },
        {
          kind: "compare",
          caption: "What the cache key sees when a guard setting changes. The cache lives in one process and the TTL is 3,600 s by default.",
          columns: ["Change", "In the key?", "What the cache does next"],
          rows: [
            ["`GUARD_STAGES`", "Yes.", "The old keys no longer match. The next request is a miss and runs the new guards."],
            ["`OUTPUT_MAX_REASKS`", "Yes.", "The same. The next request is a miss."],
            ["`MODEL_ARMOR_TEMPLATE`, the name", "Yes.", "The same. The next request is a miss."],
            [
              "The template's contents, edited in the console",
              "No. The key holds the name and not the contents.",
              "Old answers stay valid until the TTL, `CACHE_TTL_SECONDS`, runs out or the process restarts.",
            ],
          ],
        },
        {
          kind: "p",
          text: "The last row is a gap. A template tightened in the console leaves every stored answer in place, and those answers never met the new rule. After an edit like that, restart the service. A restart empties an in-memory cache. Write the gap into section 6.",
        },
        {
          kind: "p",
          text: "A hit also changes the bill and the wait. With Model Armor set, a hit makes one call and a miss makes two, because the output guards are skipped. That saves 380 ms of the 760 ms in the worked example, and every token a model would have cost.",
        },
        {
          kind: "quiz",
          id: "architecture07-q4",
          question: "Why is it safe for a cache hit to skip the output guards?",
          options: [
            "The output guards are slow, so skipping them on a hit is a deliberate trade for speed.",
            "The cache stores only a cited, unrefused answer that passed them once, and the key holds the guard settings.",
            "The input guards on a hit already check the answer.",
            "It is not safe. A hit should run every guard again.",
          ],
          answer: 1,
          explain:
            "A stored answer was cited and not refused, and it passed the output guards when it was first written. The key holds the guard settings, so a settings change means a miss. The input guards screen the question and never the answer.",
        },
        {
          kind: "quiz",
          id: "architecture07-q5",
          question:
            "The cache is on. You tighten the Model Armor template in the console and keep its name. What does a repeat question get?",
          options: [
            "A miss, because the template changed.",
            "A miss, because the audit row changed.",
            "The stored answer, until the TTL runs out or the process restarts.",
            "An error, because the template and the key no longer match.",
          ],
          answer: 2,
          explain:
            "The key holds the template's name and not its contents. An edit in the console changes neither the name nor the key. The stored answer never met the new rule, and it is served until the TTL ends or a restart empties the cache.",
        },
        {
          kind: "p",
          text: "A hit has one more side effect, on the online judge. The trace of a hit has no `retrieved_ids`, and `eval online` takes its sources from them. A row with no sources is skipped, because a judge with nothing to check against fails the answer for want of evidence. The report counts it as `no_sources`.",
        },
        {
          kind: "p",
          text: "So a hit costs no judge call, and it still counts in the sample. You can count hits with a query on the `traces` table, because a hit has a `cache` key in `timings`. Step 2 below does that. Subtract the hits when you size the judge spend.",
        },
        {
          kind: "p",
          text: "The placement is settled. How do you defend it to someone who has not read this chapter?",
        },
      ],
    },
    {
      id: "s5-write-it-down",
      title: "Section 6 and its ADR defend the placement with your own measured numbers",
      goal: "How do your own measurements become section 6 and an ADR?",
      blocks: [
        {
          kind: "p",
          text: "Now write it down. You measure two things on your own traffic, write section 6, then write one ADR. Every number goes in with its source. A number from a course names the course. A number you measured names the command.",
        },
        {
          kind: "step",
          id: "architecture07-s01",
          title: "Measure each guard's median and 95th percentile from the audit table",
          text: "Send at least 20 questions through `uv run askpep desk ask` or the API, with `STORE=pg` set and the compose database up. Then run the query. It reports each guard's calls, median and 95th percentile over the last day. With fewer than 20 calls in a row, the p95 is just the slowest call.",
          lang: "bash",
          code: `docker compose exec -T db psql -U askpep <<'EOF'
SELECT stage, name, count(*) AS calls,
       round(percentile_cont(0.5) WITHIN GROUP (ORDER BY latency_ms)::numeric, 2) AS p50_ms,
       round(percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms)::numeric, 2) AS p95_ms
FROM audit
WHERE event = 'guard' AND ts > now() - interval '24 hours'
GROUP BY stage, name
ORDER BY stage, name;
EOF`,
          expect:
            "One row for each stage and guard that ran, such as input with injection, and output with output and pii. With Model Armor set you also see model_armor at the input and output stages. Each row has a calls count, a p50 and a p95 in milliseconds. With PROVIDERS=fake they show only the local guards' time.",
        },
        {
          kind: "step",
          id: "architecture07-s02",
          title: "Count the cache hits and read the six SLO lines",
          text: "Count how many `/ask` requests in the last day were cache hits. The hit count tells you how much of the answer traffic skipped the output guards. A count of 0 is normal while the cache is off. Then read the SLO report, which exits 1 when an objective is missed.",
          lang: "bash",
          code: `docker compose exec -T db psql -U askpep <<'EOF'
SELECT count(*) AS requests,
       count(*) FILTER (WHERE timings ? 'cache') AS cache_hits
FROM traces
WHERE route = 'ask' AND ts > now() - interval '24 hours';
EOF
uv run askpep slo`,
          expect:
            "One row with your request count and your cache-hit count. Then six SLO lines, each with its attainment and its error budget. The exit code is 1 when an objective is missed. That is information, and not a fault in the command.",
        },
        {
          kind: "step",
          id: "architecture07-s03",
          title: "Write section 6 of docs/design.md",
          text: "Open `docs/design.md` and replace the instruction under section 6. Open with one claim a reviewer could dispute. Then add a table row for each of the ten checks in the widget. Give each its place, its latency, its cost and the source of every number. Close with the known gaps.",
          lang: "markdown",
          file: "docs/design.md",
          code: `## 6. Safety and quality in the request path

<One claim a reviewer could dispute. For example: guards run at four stages, and every eval stays out of the request path.>

| Check | Runs | Adds to the wait | Adds to the bill | Source |
|-------|------|------------------|------------------|--------|
| Kill switch | before any route | none, read once at start | nothing | course 3 |
| InjectionGuard, input | before the model | microseconds | nothing | course 3 |
| Output guard and PiiGuard | on the answer, stream held | <your p95 from step 1> | nothing | the audit query |
| Reask | after a failed citation check | about 3 s for each reask | about 1.275 cents, worked example | courses 3 and 5 |
| Model Armor, both ends | last in each chain | <your p95>, or 760 ms as a worked example | billed by Google, price not known | course 3 |
| Approval before open_ticket | inside the run | up to 3,600 s, a person's time | no model call while paused | course 3 |
| InjectionGuard, retrieved passages | in the tool wrapper, and on /ask before the model | microseconds for each passage | nothing | course 3 |
| Release gate | CI, each pull request | none | a live run costs money | course 4 |
| Judge calibration | before release, when the judge changes | none | 56 calls to Claude | course 4 |
| Online judge | after the request, 10 percent sample | none | 200 calls a day, at your cost per call | course 5 |
| Thumbs button | after the request | none | one row in the feedback table | course 5 |

Known gaps: <the /ask passages that are screened but carry no untrusted marking, and the template edit that the cache key can't see>.`,
          expect: "Section 6 holds one claim, a table with a source in every row, and a list of known gaps.",
        },
        {
          kind: "step",
          id: "architecture07-s04",
          title: "Write the ADR that defends the placement",
          text: "Copy `docs/adr/0000-template.md` to `docs/adr/0006-guards-and-evals-placement.md`. Chapters 2 to 6 wrote 0001 to 0005, so this is 0006. Fill in every section from the skeleton, and replace each worked-example number you can with one you measured. Delete the template's instruction lines. Then add a row for it to the table in section 10.",
          lang: "markdown",
          file: "docs/adr/0006-guards-and-evals-placement.md",
          code: `# 0006. Guards run at four stages and every eval stays out of the request path

- Status: accepted
- Date: <the day you decided, written as 22 October 2026>

## Context

The SLOs in course 5 allow 10,000 ms at the 95th percentile and 0.02 USD for each successful task. The output guards hold the stream, so the first token arrives at about 6 s instead of 3 s (course 3). Our audit p95 for the output stage is <your number> ms (step 1).

## Options

1. Everything in the path. A judge on every answer adds one model call, about 3 s (course 3) and 1.275 cents in the worked example (course 5). With Model Armor and one reask the desk would pass 10 s: 9.76 s plus 3 s.
2. Guards in the path and every eval beside it. The guards add <your total> ms. The online judge adds 200 calls a day and nothing to the wait (course 5).
3. No output guards. The first token comes at 3 s, but an answer with a bad citation reaches the user. To leave this option later, we would add the guards back, and the first token would arrive at about 6 s.

## Decision

We will run the guards at four stages and keep every eval out of the request path. <Your one or two reasons, each with a number and its source.>

## Consequences

Easier: <what the placement gives you>. Harder: <the Model Armor spend that cost_usd misses, and the /ask passages that are screened but not marked untrusted>. The decision is wrong if <the output p95 or the first-token time passes a number you name>. Then we would <your action>.

## Evidence

The audit query in step 1. The SLO report from step 2. Courses 3 and 5, by their worked examples.`,
          expect:
            "A new ADR file, and a row in section 10 with its number, its decision and the status accepted. Chapter 8's review defends your ADRs against the numbers, so every figure needs a source.",
        },
        {
          kind: "step",
          id: "architecture07-s05",
          title: "Check section 9, item 1, against your section 6",
          text: "Read item 1 of section 9, then read your section 6. They must agree. The item says a hit skips the output guards and that the key holds the guard settings. Your section 6 must show a hit running only the input guards, and it must name the template gap.",
          expect: "Section 6 and item 1 say the same thing about a hit, and section 6 adds the one case the key can't see.",
        },
        {
          kind: "p",
          text: "That was your version. What did AskPEP's own guards measure?",
        },
      ],
    },
    {
      id: "s6-safety-adr",
      title: "AskPEP's guards stay on the path, and Model Armor's cost stays an assumption",
      goal: "Where does AskPEP place its checks, and which of its numbers are still unproven?",
      blocks: [
        {
          kind: "p",
          text: "Every guard stays on the path and every eval stays beside it. Step 1's query on staging gives the local guards' p95s. They are 0.4 ms for injection, 21 ms for the output check and 5 ms for PII. That is 26 ms on a path whose other stages sum to 5,358 ms.",
        },
        {
          kind: "p",
          text: "The security reviewer asks if Model Armor can be measured today. It can't, because the pilot's project has no template yet. Course 7 creates one. So 760 ms stays the made-up figure from course 3, and the ADR says so. With it, the sum of p95s is 6,144 ms.",
        },
        {
          kind: "p",
          text: "A reask is the tight case. At 3 s the sum is 9,144 ms. At generate's own p95 of 4,600 ms it is 10,744 ms, which is over R3's limit. Last week 11 of 264 `/ask` requests needed a reask, which is 4.2%. So `OUTPUT_MAX_REASKS` stays at 1.",
        },
        {
          kind: "p",
          text: "The product owner asks why the judge can't run on every answer. It would cost 12.30 dollars a day against 1.23 at the sample rate. It would also add a model call to the wait. At a sample of 0.1, 100 answers a day are judged. If 10% fail, a person reads 10 of them.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# 0006. Guards run on the request path and every eval runs beside it

- Status: accepted
- Date: 9 December 2026

## Context
R3 allows 10,000 ms for 95% of /ask and /agent requests. Stage p95s for /ask sum to 5,358 ms.
Local guard p95s on staging: injection 0.4 ms, output 21 ms, PII 5 ms. Total 26 ms.
Model Armor: 760 ms for both ends is course 3's made-up figure. Not measured here.
Reasks: 11 of 264 /ask requests, 4.2%.

## Options
1. Everything on the path. A judge on every answer: 12.30 usd a day and one more model call.
2. Guards on the path, every eval beside it. Judge at 0.1: 100 calls, 1.23 usd a day.
3. No output guards. Faster first token, and an uncited answer reaches the user.

## Decision
We will run guards at four stages and keep every eval off the request path.
OUTPUT_MAX_REASKS stays 1. The online sample rate stays 0.1.

## Consequences
Easier: the wait has one known list of additions.
Harder: 10 judged failures a day at 3 minutes is 2.5 hours a week for one engineer.
That counts towards ADR 0003's trigger of 8 hours a week.
Known gaps: /ask screens its passages but does not mark them untrusted.
Model Armor spend never reaches cost_usd.
Stays open: Model Armor run live, and CLASSIFIER-NOTE.md finished. Owner: security reviewer.
Wrong if: Model Armor's measured p95 for both ends passes 2,000 ms.
Then: move Model Armor to input only and record the reviewer's answer.

## Evidence
Audit query, staging, 9 December. Reask count from traces, 24 to 27 November.

## 6. Safety and quality in the request path (docs/design.md)

Claim: guards add 26 ms today, and Model Armor is the one unmeasured item on the path.

Check             Runs                    Adds to the wait       Adds to the bill        Source
Kill switch       before any route        none                   nothing                 course 3
Injection         input and passages      0.4 ms p95             nothing                 audit, 9 December
Output, PII       on the answer           26 ms p95 together     nothing                 audit, 9 December
Reask             failed citation check   3 s to 4.6 s           one answer call         course 3, traces
Model Armor       last, both ends         760 ms, assumed        billed by Google        not measured
Approval          before open_ticket      up to 3,600 s          no model call           course 3
Gate              CI, each pull request   none                   a live run costs money  course 4
Calibration       when the judge changes  none                   56 calls                course 4
Online judge      after, 0.1 sample       none                   1.23 usd a day at most  ADR 0006
Thumbs            after the answer        none                   one row                 course 5`,
          caption: "ADR 0006 and section 6 of the design, whole. The figures belong to the story.",
        },
        {
          kind: "p",
          text: "Read the Stays open line first. It tells the reader which condition the ADR can't close. Then read the Wrong if line. It puts a number on Model Armor before anyone has measured it, so the measurement can fail.",
        },
        {
          kind: "p",
          text: "Reuse this shape when a new check is proposed. Say who waits for it, what it adds, and whether that figure was measured.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# NNNN. We will run <check> at <place>

- Status:
- Date:

## Context
Budget it spends from:
What the path adds today:
Measured here, or assumed from where:

## Options
1. On the path.
2. Beside the path.
3. Not at all.

## Decision
We will

## Consequences
Easier:
Harder:     (including people's time)
Known gaps:
Stays open:
Wrong if:   (a number)
Then:

## Evidence`,
          caption: "For your next check, the same ADR with blank values.",
        },
        {
          kind: "p",
          text: "Six sections of the design are written. Two remain, and each ADR still has to survive a hostile reader. What does the design cost at 1,000 a day, how does it fail, and which claims hold? Chapter 8 starts there.",
        },
      ],
    },
  ],
  recap: [
    "A check on the request path adds to the caller's wait. A check in CI or on stored traces adds none.",
    "Each check gets a latency budget and a cost budget, and each number names where it came from. Model Armor spend never reaches `cost_usd`.",
    "Evals run before release or after the request. The online judge has its own line in `askpep cost`.",
    "A cache hit runs the input guards and skips the output guards, so the key must hold every guard setting. A template edit stays invisible to it.",
    "Section 6 and one ADR defend the placement with your own audit numbers.",
    "AskPEP's local guards add 26 ms. Model Armor's 760 ms stays an assumption until course 7 can measure it.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In safety and quality by design I learned that every guard and eval is a component. Each has a place in the request path, a latency budget and a cost. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["architecture-q14", "architecture-q15", "architecture-q16", "architecture-q17"],
};

export default chapter;
