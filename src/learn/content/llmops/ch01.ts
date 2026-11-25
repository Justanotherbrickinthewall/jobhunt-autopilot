import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "llmops-01-what-to-observe",
  course: "llmops",
  number: 1,
  title: "Decide the questions before you pick a tool",
  tagline: "The pilot is live and nobody can say if it works. So you write the objectives first, and then you measure them.",
  minutes: 75,
  objectives: [
    "Turn the question \"is AskPEP working?\" into SLOs of four kinds, and say what each one counts.",
    "Choose the kind of SLO that catches a given complaint: success, latency, guard block or cost.",
    "Decide which trace rows count as requests, and which finished requests count as successes.",
    "Work out attainment, error budget and burn rate from a count of good and bad requests.",
    "Record how every request ended, and read the SLOs with `askpep slo`.",
    "Finish every request's trace, and read why a zero cost line means no data.",
    "Run the course 5 setup and read the failing tests as a list of work.",
    "Write the four functions that measure an SLO.",
    "Write an operations plan that shows its own blanks.",
  ],
  sections: [
    {
      id: "s1-questions",
      title: "A tracing tool answers only the questions you wrote down first",
      goal: "What must AskPEP answer in production, and what is an SLO?",
      blocks: [
        {
          kind: "p",
          text: "On Monday 23 November the product owner asks one question. Is the second team getting answers? AskPEP went to the second team on Friday 20 November, and report e19b6f4 passed every slice of the gate. Nobody can answer the question.",
        },
        {
          kind: "p",
          text: "You open the `traces` table from course 1, and you find a few rows on the route `agent.search`. A desk run leaves no row of its own. A question that a guard blocked leaves no row at all. The evidence for the whole pilot is a handful of searches.",
        },
        {
          kind: "p",
          text: "Courses 1 to 4 built four layers: retrieval, an agent desk, guards and an eval gate. The gate scored 95 cases across five slices before the release. This course starts after the release, when real people use the desk.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Every pilot figure in this course is a story figure",
          text: "The pilot's traffic, its failures and its dollars are invented for the story, and every sum is shown. The chapters also keep their worked examples, such as 2,000 requests a day. Those are arithmetic to follow. None of these numbers is a measurement.",
        },
        {
          kind: "p",
          text: "The gate tells you whether the desk was right on 95 cases you chose. It cannot tell you that Tuesday was slow, or that this week's bill doubled. Those questions need numbers taken from live requests.",
        },
        {
          kind: "p",
          text: "A tracing tool does not supply those numbers on its own. LangSmith, which course 2 used as a viewer, shows a thousand traces as readily as ten. It cannot know which of them matter to you. So you write the questions down first and choose the tool afterwards.",
        },
        {
          kind: "p",
          text: "A question that a number can answer is a service level objective, or SLO. An SLO has four parts.",
        },
        {
          kind: "list",
          items: [
            "A measure, such as the share of requests that gave an answer.",
            "A target for that share, such as 0.95. At least 95 requests in 100 must be good.",
            "A window, such as 28 days. Only requests inside the window count.",
            "An error budget. It is what the target leaves over, and section 4 works it out.",
          ],
        },
        {
          kind: "p",
          text: "AskPEP gets one kind of SLO for each of four questions.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Do people get an answer? The measure is the answer success rate.",
            "Is it fast enough? The measure is p95 for each stage of a request. p95 is the time that 95 requests in 100 beat.",
            "Is each answer affordable? The measure is the cost per successful task.",
            "Do the guards leave people alone? The measure is the guard block rate.",
          ],
        },
        {
          kind: "p",
          text: "A stage is one timed step of a request. Course 1 timed six of them: `embed`, `dense`, `sparse`, `fuse`, `rerank` and `generate`. The `timings` column of `traces` holds one time for each.",
        },
        {
          kind: "p",
          text: "Later chapters send these traces to tools. Chapter 2 sends them to LangSmith. Chapter 3 sends them to Google Cloud Trace through OpenTelemetry, an open standard that records each timed step of a request as a span. The `traces` table stays as the local record, and the tools sit on top of it.",
        },
        {
          kind: "p",
          text: "This chapter builds the base. You write a file of SLOs and the code that measures them from `traces`. Then you add a command, `askpep slo`, that prints the result.",
        },
        {
          kind: "quiz",
          id: "llmops01-q1",
          question:
            "The eval gate passed at 0.93 before a release. A week later users say the desk feels slow. Which statement is right?",
          options: [
            "The gate would have caught slowness, so the users must be mistaken.",
            "The gate scores answers on a fixed set. Speed on live traffic needs its own SLO, measured from live traces.",
            "Run the gate again with more golden items until it shows the slowness.",
            "A tracing tool raises an alert about slowness without being told what slow means.",
          ],
          answer: 1,
          explain:
            "The gate marks answers right or wrong on items you chose. It says nothing about the time real requests take. A tracing tool stores times, but you must decide what counts as too slow. That decision is a latency SLO.",
        },
        {
          kind: "p",
          text: "Four questions give four kinds of SLO. The next section sets them out.",
        },
      ],
    },
    {
      id: "s2-kinds",
      title: "Four kinds of SLO cover what a person feels and what the service costs",
      goal: "Which four kinds of SLO does AskPEP need, and what does each one count?",
      blocks: [
        {
          kind: "p",
          text: "The four questions of section 1 give four kinds of SLO. The lab code calls them `success`, `latency`, `guard_block` and `cost`. Each one reads the `traces` table in its own way.",
        },
        {
          kind: "compare",
          caption:
            "The four kinds. The first three are shares with a target. The cost kind is a ceiling. Section 3 says which rows count as requests.",
          columns: ["Kind", "It counts", "A request is good when", "The question"],
          rows: [
            ["success", "Every request", "It gave an answer", "Do people get an answer?"],
            [
              "latency",
              "Every request that has a time for its stage",
              "The stage finished within `threshold_ms`",
              "Is it fast enough?",
            ],
            ["guard_block", "Every request", "No guard blocked it", "Do the guards leave people alone?"],
            [
              "cost",
              "Every request",
              "It succeeded. Spend is divided across the successes",
              "Is each answer affordable?",
            ],
          ],
        },
        {
          kind: "p",
          text: "Latency needs a stage. The stage `total` means the whole request. Any other stage reads one time from `timings`. AskPEP watches three: `total`, `generate` and `rerank`.",
        },
        {
          kind: "p",
          text: "A p95 target and a share target say the same thing. \"p95 under 10 seconds\" means that 95% of requests finish in under 10 seconds. The share form is easier to count, because each request is either inside the limit or outside it. So a latency SLO is a share and a threshold.",
        },
        {
          kind: "p",
          text: "Why one for each stage? When `total-latency` is missed, the stage SLOs show where to look first. Only three stages have one. A slow `embed` shows in the total and nowhere else.",
        },
        {
          kind: "p",
          text: "A cost SLO is a ceiling in dollars. Spend per successful task must stay at or below `limit_usd`. A failed request still costs money and adds no success, so failures push the figure up.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Every dollar figure in this course is a worked example",
          text: "The 2 cent limit below is a worked example. The prices in `pricing.json` are placeholders until you replace them with the provider's current prices. Chapter 4 puts a cost on each trace. Until then no trace has one.",
        },
        {
          kind: "p",
          text: "You state SLOs in a JSON file, `infra/monitoring/slos.json`. Setup below adds it. These four entries show one SLO of each kind.",
        },
        // CHECK: the targets, thresholds and windows in slos.json are the lab's choice, not a recommendation. The alert rules and the Cloud Monitoring files built from them in chapter 6 have not been applied to a Google Cloud project.
        {
          kind: "code",
          lang: "json",
          code: `{
  "slos": [
    {
      "name": "answer-success",
      "kind": "success",
      "target": 0.95,
      "window_days": 28,
      "description": "95% of requests give an answer: no error, no refusal, no guard block and no budget stop."
    },
    {
      "name": "total-latency",
      "kind": "latency",
      "stage": "total",
      "threshold_ms": 10000,
      "target": 0.95,
      "window_days": 28,
      "description": "95% of requests finish within 10 seconds."
    },
    {
      "name": "guard-block-rate",
      "kind": "guard_block",
      "target": 0.97,
      "window_days": 28,
      "description": "At most 3% of requests are blocked by a guard. A higher rate means a guard is too strict or under attack."
    },
    {
      "name": "cost-per-success",
      "kind": "cost",
      "limit_usd": 0.02,
      "window_days": 28,
      "description": "Spend per successful task, with failed requests counted, stays at or below 2 cents."
    }
  ]
}`,
          caption:
            "Four of the six SLOs in the file. The other two are `generate-latency` and `rerank-latency`. They differ from `total-latency` in their stage and threshold.",
        },
        {
          kind: "p",
          text: "The targets, thresholds and windows are choices. A team sets them from what its users put up with, and changes them as it learns. These values are the lab's own.",
        },
        {
          kind: "widget",
          id: "llmops01-slo-kind",
          intro:
            "Match four made-up complaints to the kind of SLO that would catch each one. Each complaint belongs to one kind.",
        },
        {
          kind: "quiz",
          id: "llmops01-q2",
          question:
            "`total-latency` is missed this week. `generate-latency` and `rerank-latency` are both met. What does that tell you?",
          options: [
            "The SLOs contradict each other, so the data must be wrong.",
            "A total cannot be missed while its stages are met.",
            "The time is going into a stage that has no SLO, or into desk runs, which have no `generate` or `rerank` time. Look at those first.",
            "Raise the total threshold, because the stages are healthy.",
          ],
          answer: 2,
          explain:
            "The total includes `embed`, `dense`, `sparse` and `fuse`, and none of them has an SLO. Desk runs have a total time and no `generate` or `rerank` time, so they feed `total-latency` and neither stage SLO. A missed total with healthy stages points at one of those.",
        },
        {
          kind: "p",
          text: "Each kind counts requests and successes. So the next question is what those two words mean in a row of `traces`.",
        },
      ],
    },
    {
      id: "s3-success",
      title: "A request succeeds only when the person got an answer",
      goal: "Which trace rows count as requests, and which of those succeeded?",
      blocks: [
        {
          kind: "p",
          text: "Every SLO in section 2 depends on one decision: what counts as a request, and what counts as a success. A wrong rule makes every number built on it wrong. So the lab spends time here.",
        },
        {
          kind: "p",
          text: "Course 1 introduced the `traces` table. Each row is one run of one route. These columns decide the count.",
        },
        {
          kind: "compare",
          caption: "The columns the rules read.",
          columns: ["Column", "What it holds"],
          rows: [
            ["route", "Where the run came from, such as `ask`, `search` or `agent`."],
            ["error", "The text of an exception, or empty."],
            ["refused", "True when the answer was the refusal text."],
            ["stop_reason", "How the run ended, such as `done`, `refused`, `guard_blocked` or `step_budget`."],
            ["timings and latency_ms", "One time for each stage, and the time for the whole request, in milliseconds."],
          ],
        },
        {
          kind: "p",
          text: "Course 2 named the stop reasons of a desk run. Migration 006, which setup applies, adds a `stop_reason` column so that every route can store one. A row written before that migration has no stop reason.",
        },
        {
          kind: "p",
          text: "A request is a row on a route that a person calls: `ask`, `search`, `agent`, `cli.ask`, `cli.search`, `mcp.ask` or `mcp.search`. Two routes are not requests. The route `agent.search` is a tool call inside a desk run, and the desk run has its own row. The route `eval` marks evaluation runs, which are tests and not traffic.",
        },
        {
          kind: "p",
          text: "A request is finished unless its stop reason is `awaiting_approval`. That is a desk run paused for a person to approve a ticket. It will finish later, so no SLO counts it yet.",
        },
        {
          kind: "p",
          text: "A finished request succeeds when it has no error, did not refuse, and has a stop reason of `done` or none. A missing stop reason counts as `done`, so rows from before the migration still count.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "A correct refusal still counts as a failure",
          text: "Sometimes refusing is the right behaviour. A question with no answer in the PEPs gets the refusal text. The success SLO still counts that as a failure, because the person got no answer. So a stream with unanswerable questions cannot reach 1.0. Chapter 5 reads live answers to judge their quality.",
        },
        {
          kind: "p",
          text: "A guard block sets `refused` to False, because no model ever saw the question. Its stop reason is `guard_blocked`, and that alone makes it a failure. The guard block SLO then counts these on their own.",
        },
        {
          kind: "widget",
          id: "llmops01-count-rows",
          intro:
            "Mark ten made-up trace rows as good, bad or not counted for the answer success SLO. The result is the attainment, which is the share of counted requests that were good.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "An empty window counts as met",
          text: "An SLO with no requests in its window is met. The `askpep slo` command that you build later prints `no requests in the window`. A quiet system and a broken logger look the same. Read the request count as well as the status.",
        },
        {
          kind: "quiz",
          id: "llmops01-q3",
          question:
            "A guard blocks a question. Its trace has `refused` False and `stop_reason` `guard_blocked`. What does the answer success SLO do with it?",
          options: [
            "It counts a success, because `refused` is False.",
            "It counts a failure, because any stop reason other than `done` is a failure.",
            "It leaves the row out, because no model ran.",
            "It counts a failure only when `error` is also set.",
          ],
          answer: 1,
          explain:
            "The rule reads the stop reason as well as `refused`. A guard block has `refused` False, but its stop reason is `guard_blocked`, so the person got no answer and the request failed. The row also counts against the guard block SLO.",
        },
        {
          kind: "p",
          text: "You can now count good and bad requests. The next section turns those counts into a budget.",
        },
      ],
    },
    {
      id: "s4-budget",
      title: "An error budget turns a target into a count, and burn rate is its speed",
      goal: "How do attainment, error budget and burn rate come from counts of good and bad requests?",
      blocks: [
        {
          kind: "p",
          text: "A target of 0.95 is hard to feel. The error budget turns it into a count of requests. It is the total times one minus the target, which is the number of bad requests the target allows. Attainment is the share that were good: good divided by total.",
        },
        {
          kind: "p",
          text: "Take 2,000 requests in the window and a target of 0.95. The target allows 5% of them to be bad, which is 100 requests. Suppose 1,930 were good. Attainment is 1,930 divided by 2,000, or 0.965. The 70 bad requests used 70% of the budget, so 30% is left and the SLO is met.",
        },
        {
          kind: "p",
          text: "The lab reports the budget left as 1 minus bad over allowed. It reads 1.0 when untouched and 0.0 when spent. Below 0.0 the budget is overspent, and the SLO is missed.",
        },
        {
          kind: "p",
          text: "Attainment tells you where you stand. It does not tell you how fast you got there. The burn rate does. It is the bad share divided by the share the target allows. A burn rate of 1.0 spends the budget exactly over the window. A rate of 2.0 spends it in half the window.",
        },
        {
          kind: "p",
          text: "Take 1,000 requests with 100 bad ones and a target of 0.95. The bad share is 0.10 and the target allows 0.05. The burn rate is 2.0, so a 28-day budget lasts 14 days.",
        },
        {
          kind: "p",
          text: "Chapter 6 builds alerts on the burn rate. A fast burn needs attention now, and a slow one can wait until morning. A burn rate of 14.4 empties a 28-day budget in 28 divided by 14.4 days, which is just under two days.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "A loose target caps the burn rate",
          text: "The highest possible burn rate is 1 divided by the share the target allows. Every request must fail to reach it. At a target of 0.95 that is 20, so a burn rate of 14.4 needs 72% of requests to fail. At 0.999 the same rate needs only 1.44% to fail. Choose targets with the alert rates in mind.",
        },
        {
          kind: "widget",
          id: "llmops01-burn-rate",
          intro:
            "Three SLOs each saw 1,000 requests. Predict which one is spending its budget fastest, then try your own numbers.",
        },
        {
          kind: "quiz",
          id: "llmops01-q4",
          question:
            "`guard-block-rate` has a target of 0.97. In 1,000 requests, 30 were blocked by a guard. What is the burn rate?",
          options: ["0.03", "1.0", "30", "0.97"],
          answer: 1,
          explain:
            "The bad share is 30 out of 1,000, which is 0.03. The target allows 1 minus 0.97, which is also 0.03. The ratio is 1.0, so the budget is spent exactly over the window, and the SLO is just met.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "What reliability targets would you set for an LLM service?",
          text: "I would set two groups, because the service can be up and still answer badly. Operational targets cover speed, errors and cost per successful task. Quality targets cover whether answers are good. Each target gets a window and an error budget, and I would alert on how fast the budget burns.",
        },
        {
          kind: "p",
          text: "That is the arithmetic. The lab needs starter files before you can run any of it.",
        },
      ],
    },
    {
      id: "s5-setup",
      title: "Course 5 setup adds the telemetry package, one migration and three Python packages",
      goal: "What does the course 5 setup add to your repo?",
      blocks: [
        {
          kind: "p",
          text: "You build on your AskPEP repo again. Work from its root, and do the setup steps once, in order. Setup adds the course 5 starter files, installs three Python packages and changes the `traces` table. It also needs Postgres running, as in course 1.",
        },
        {
          kind: "step",
          id: "llmops01-s01",
          title: "Pull the course 5 starter files",
          text: "Run `pull-course.sh` from the root of your repo, with the course name `llmops`. It copies the starter files and never overwrites a file. If you started before course 5, add `incident/` and `evals/candidates/` to your `.gitignore`. Commit the result before you write any code.",
          lang: "bash",
          code: `my-learn/labs/askpep/template/scripts/pull-course.sh llmops
git add -A
git commit -m "Add the course 5 starter files"`,
          expect:
            "One added line for each new file, and a count such as 23 added, 0 kept. A kept file is one you already had. Then a note that this course adds packages, with the uv add line that a later step runs.",
        },
        {
          kind: "p",
          text: "The pull did four things.",
        },
        {
          kind: "list",
          items: [
            "It adds `src/askpep/telemetry/`, a package for the course. `records.py` ships complete and `slo.py` is this chapter's stub. Six more modules are stubs for later chapters.",
            "It adds the migration `src/askpep/migrations/006_feedback.sql`.",
            "It adds `infra/monitoring/slos.json` and a root `pricing.json`. The prices in `pricing.json` are placeholders.",
            "It adds the tests for the course, and a test plugin.",
          ],
        },
        {
          kind: "p",
          text: "Course 5 has no dependency group. The tracing code runs inside every request, so its packages go in your main dependencies, as they do in the reference solution in `capstone/`. Three packages join them.",
        },
        {
          kind: "list",
          items: [
            "`langsmith` is the LangSmith client. Chapter 2 uses it.",
            "`opentelemetry-sdk` makes spans. Chapter 3 uses it.",
            "`opentelemetry-exporter-gcp-trace` sends spans to Google Cloud Trace. Chapter 3 uses it.",
          ],
        },
        {
          kind: "step",
          id: "llmops01-s02",
          title: "Install the course 5 packages",
          text: "The pull printed this line and ran nothing. Run it from your repo root. With no `--group` flag, `uv add` writes to the `dependencies` list in `pyproject.toml`.",
          lang: "bash",
          code: `uv add "langsmith>=0.14.11" "opentelemetry-sdk>=1.45.1" "opentelemetry-exporter-gcp-trace>=1.15.0"`,
          expect:
            "uv installs the packages and exits without an error. Your pyproject.toml gains three lines under dependencies, and uv.lock changes.",
        },
        {
          kind: "step",
          id: "llmops01-s03",
          title: "Check the install",
          text: "Run `uv sync` once. Then check that the three packages import and report a version.",
          lang: "bash",
          code: `uv sync
uv run python -c "import importlib.metadata as m; print(m.version('langsmith'), m.version('opentelemetry-sdk'), m.version('opentelemetry-exporter-gcp-trace'))"`,
          expect:
            "Three version numbers: 0.14.11 or later for langsmith, 1.45.1 or later for opentelemetry-sdk and 1.15.0 or later for the exporter.",
        },
        {
          kind: "p",
          text: "Migration 006 changes the `traces` table. It adds six columns: `trace_id`, `thread_id`, `cost_usd`, `stop_reason`, `usage` and `answer`. It also adds a `feedback` table. This chapter writes `stop_reason` and `answer`. Later chapters fill the rest.",
        },
        {
          kind: "step",
          id: "llmops01-s04",
          title: "Apply the migration",
          text: "Start Postgres if it is not running, then apply the migrations. Run `askpep migrate` before any command that reads `traces`. A query that names `stop_reason` fails on a table that lacks the column.",
          lang: "bash",
          code: `docker compose up -d db
uv run askpep migrate`,
          expect:
            "The migrate command prints applied: 006_feedback the first time, and up to date after that.",
        },
        {
          kind: "step",
          id: "llmops01-s05",
          title: "See the starting point",
          text: "Run this chapter's tests before you write anything. All 118 fail. Each failure names the lab step that fixes it, such as `llmops-01 step 1`. If Postgres is not running, 13 of them skip instead. Nothing is broken, because the failures are the to-do list.",
          lang: "bash",
          code: `uv run pytest tests/llmops -k llmops01 -q`,
          expect: "A summary line that reads 118 failed. Each failure names a step, such as llmops-01 step 1.",
        },
        {
          kind: "p",
          text: "The failing tests are your list of work, and four of them come first.",
        },
      ],
    },
    {
      id: "s6-slo-module",
      title: "Four functions in slo.py turn a JSON file and trace rows into a verdict",
      goal: "Which four functions turn a file of SLOs and some trace rows into a verdict?",
      blocks: [
        {
          kind: "p",
          text: "Lab steps 1 to 4 fill the stub `src/askpep/telemetry/slo.py`. It ships with two dataclasses and the tuple `KINDS`. You write the four functions that use them.",
        },
        {
          kind: "code",
          lang: "python",
          code: `# src/askpep/telemetry/slo.py
KINDS = ("success", "latency", "guard_block", "cost")
DEFAULT_SLOS = Path("infra/monitoring/slos.json")  # relative to the working directory


@dataclass(frozen=True)
class Slo:
    name: str
    kind: str  # one of KINDS
    target: float = 0.0  # the share that must be good, strictly between 0 and 1. Unused by cost.
    window_days: int = 28
    stage: str | None = None  # latency only: a stage in a trace's timings, or "total"
    threshold_ms: float | None = None  # latency only
    limit_usd: float | None = None  # cost only
    description: str = ""


@dataclass(frozen=True)
class SloStatus:
    name: str
    good: int  # requests that met the objective. For cost, the successful ones.
    total: int  # requests the objective counts
    attainment: float | None  # good / total, or None when nothing was counted and for cost
    met: bool
    budget_remaining: float | None  # 1.0 untouched, 0.0 spent, negative overspent. None for cost.
    value: float | None = None  # cost only: spend per successful task, or None with no success`,
          caption:
            "These ship complete. An `Slo` is one entry of the JSON file. An `SloStatus` is one measured result.",
        },
        {
          kind: "p",
          text: "Step 1 is `load_slos`. It reads the file and rejects a bad SLO with a message that names it. A bad SLO is easier to find here than as a strange number later. The table lists the six rules.",
        },
        {
          kind: "compare",
          caption: "The rules `load_slos` enforces. Each one raises `ValueError` and names the SLO.",
          columns: ["Rule", "It raises when"],
          rows: [
            ["1", "Two SLOs share a name."],
            ["2", "`kind` is not one of the four."],
            ["3", "A share kind has a `target` outside 0 to 1, with 0 and 1 excluded."],
            ["4", "A latency SLO has no `stage`, or a `threshold_ms` that is not above 0."],
            ["5", "A cost SLO has a `limit_usd` that is not above 0."],
            ["6", "`window_days` is below 1."],
          ],
        },
        {
          kind: "p",
          text: "A target of 1.0 allows no failures at all, so the burn rate would divide by zero. That is why a target must lie strictly between 0 and 1. A missing file raises `OSError`, and the caller sees it.",
        },
        {
          kind: "p",
          text: "Step 2 is `is_success`, which is the rule from section 3 in one line. Read the three keys with `row.get`. A row from before migration 006 has no `stop_reason`, and a missing key must not raise.",
        },
        {
          kind: "fold",
          tone: "hood",
          title: "One function decides success for a live trace and a stored row",
          text: "`Trace.success`, which you add in step 5, calls `is_success` on its own fields. A stored row goes through the same function. So a request and its row in the table cannot disagree about whether it succeeded.",
        },
        {
          kind: "p",
          text: "Step 3 is `measure`. It keeps the finished request rows and counts good and total by kind. The table shows what each kind keeps and what it counts as good.",
        },
        {
          kind: "compare",
          caption: "What `measure` does for each kind.",
          columns: ["Kind", "It keeps", "Good", "Met when"],
          rows: [
            ["success", "Finished requests", "`is_success` is true", "The attainment is at least the target"],
            [
              "latency",
              "Finished requests with a time for the stage",
              "The time is at most `threshold_ms`",
              "The attainment is at least the target",
            ],
            [
              "guard_block",
              "Finished requests",
              "`stop_reason` is not `guard_blocked`",
              "The attainment is at least the target",
            ],
            ["cost", "Finished requests", "The request succeeded", "Spend per success is at most `limit_usd`"],
          ],
        },
        {
          kind: "p",
          text: "A desk run has no `generate` or `rerank` time. Chapter 3 adds a time for each agent and each tool under its own name. So a desk run counts for `total-latency` and for neither stage SLO. A row with no time for the stage is left out. It is not counted as slow.",
        },
        {
          kind: "p",
          text: "Compare the attainment with the target using a tolerance of 1e-9, because an attainment can land exactly on the target. A window with no counted rows is met, with a budget of 1.0.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Until chapter 4 the cost SLO reads zero",
          text: "No trace holds a cost yet. Chapter 4 writes `cost_usd` on each one. Until then every spend counts as 0, and `cost-per-success` reads 0.0000 and is met. Read that as no data. It does not mean the desk is free.",
        },
        {
          kind: "p",
          text: "Step 4 is `burn_rate`, the formula from section 4. Check the target first, so a bad target raises even when there are no requests. No requests give 0.0.",
        },
        {
          kind: "p",
          text: "The functions are right, and they would still read nothing true. The rows they need aren't being written yet.",
        },
      ],
    },
    {
      id: "s7-record-outcomes",
      title: "Recording how every request ended takes changes in six files",
      goal: "How does every request come to write exactly one trace?",
      blocks: [
        {
          kind: "p",
          text: "The rule in section 3 reads `stop_reason`, but nothing writes it on every route yet. A desk run leaves no row of its own, only an `agent.search` row for each search it made. A question that a guard blocked leaves no row at all. An SLO over those traces would look better than the truth.",
        },
        {
          kind: "p",
          text: "Step 5 closes the gap. After it, every request writes exactly one trace that says how it ended. You change six files, in this order. The first is `tracing.py`, and its code is in lab step 5. The other five have steps below, and `graph.py` has two.",
        },
        {
          kind: "step",
          id: "llmops01-s06",
          title: "Record the outcome in ask_stream",
          text: "`ask_stream` answers a question for the `ask` routes. It now takes an optional trace from its caller, so the guards can add to the same trace. It sets the stop reason and the answer at each of its three ends: a refusal, an answer and an error.",
          lang: "python",
          file: "src/askpep/generation.py",
          code: `# src/askpep/generation.py
def ask_stream(
    svc: Services,
    question: str,
    route: str = "ask",
    *,
    trace: Trace | None = None,
    screen: Callable[[PackedContext], PackedContext] | None = None,
) -> Iterator[Token | Done]:
    """Retrieve, then stream the answer token by token, then yield one Done with the citations."""
    # your turn:
    # 1. Keep the screen parameter from guardrails-03, and add the keyword-only parameter trace
    #    beside it. Start with trace = trace or Trace(route, question).
    # 2. In the refusal branch, set trace.stop_reason to "refused" and trace.answer to REFUSAL.
    # 3. After the model has answered, set trace.answer to the answer. Set trace.stop_reason to "refused"
    #    when trace.refused is true, and to "done" otherwise.
    # 4. In the except block, set trace.error to repr(exc) and trace.stop_reason to "error". Then raise.
    ...`,
          expect:
            "Run uv run pytest tests/llmops -k \"llmops01_s5 and (answered_question or refusal or failed_request)\" -q. Three tests pass.",
        },
        {
          kind: "step",
          id: "llmops01-s07",
          title: "Write one trace for a guarded request",
          text: "`guarded_ask_stream` wraps `ask_stream` with the guards. It now makes the trace and passes it down. An input block never reaches `ask_stream`, so it writes the trace itself. An output block changes the trace and leaves the write to `ask_stream`, so one request writes one trace.",
          lang: "python",
          file: "src/askpep/guards/flow.py",
          code: `# src/askpep/guards/flow.py
# Add these imports: from askpep.tracing import Trace, and from askpep.guards.protocol import reporting_to


def guarded_ask_stream(
    svc: Services, question: str, principal: Principal, route: str = "ask"
) -> Iterator[Token | Done]:
    """ask_stream with the input and output guards around it."""
    # your turn:
    # 1. After guard_input, make trace = Trace(route, verdict.text).
    # 2. On an input block, set trace.stop_reason to "guard_blocked" and call trace.write(svc)
    #    before the first yield.
    # 3. Pass trace=trace to ask_stream.
    # 4. On an output block, set trace.stop_reason to "guard_blocked" and trace.answer to None.
    #    Do not write the trace. ask_stream writes it when its generator ends.
    # 5. On a modify, set trace.answer to the changed text, out.text.
    # 6. Wrap the guard_output call in "with reporting_to(trace):", so a reask's tokens reach this
    #    trace. Keep every yield outside the block.
    ...`,
          expect:
            "Run uv run pytest tests/llmops -k \"llmops01_s5 and guard and not desk_run\" -q. Four tests pass.",
        },
        {
          kind: "fold",
          tone: "hood",
          title: "A block that wrote its own trace would count the request twice",
          text: "If the output block wrote a trace, `ask_stream` would write a second one when its generator ended. One request would then be two rows, and every SLO would count it twice. The block only changes the trace.",
        },
        {
          kind: "step",
          id: "llmops01-s08",
          title: "Give each desk run a trace",
          text: "A desk run had no trace. Four helpers build, record and write one. `_run` writes it in a `finally`, so a run that raises still leaves a row. `run_desk` also gains a `route` argument. The default is `agent`, and the eval code passes `eval` in the last two steps.",
          lang: "python",
          file: "src/askpep/agents/graph.py",
          code: `# src/askpep/agents/graph.py
# Add this import: from askpep.tracing import Trace
# Add the four helpers below after _checkpoint_values.


def _new_trace(svc: Services, thread_id: str, question: str, route: str = "agent") -> Trace:
    return Trace(route, question)  # chapter 3 uses svc and thread_id


def _resumed_trace(graph, svc: Services, thread_id: str) -> Trace:
    """The trace of a run that carries on from a checkpoint, with the question the thread last held."""
    # your turn: the question is _checkpoint_values(graph, _config(svc, thread_id)).get("question", "").
    # Turn it into a str, and use "" if reading it raises. Return _new_trace(svc, thread_id, question).
    ...


def _record(trace: Trace, result: DeskResult) -> DeskResult:
    """Put the outcome of a run on its trace, and return the result."""
    # your turn:
    # 1. paused = result.status == "awaiting_approval".
    # 2. Set trace.refused to result.refused.
    # 3. Set trace.stop_reason to "awaiting_approval" when paused, and to result.stop_reason otherwise.
    # 4. Set trace.answer to None when paused or when the stop reason is "guard_blocked".
    #    Otherwise set it to result.answer.
    # 5. Return result.
    ...


def _blocked(svc: Services, trace: Trace, thread_id: str) -> DeskResult:
    """The result for a question an input guard blocked. Its trace is written, with no stages."""
    # your turn: record blocked_result(thread_id, 0.0) on the trace, write the trace, return the result.
    ...


def _run(graph, payload: Any, *, svc: Services, thread_id: str, trace: Trace) -> DeskResult:
    # your turn: keep the body you have, and wrap it in try, except Exception and finally.
    # 1. In the try, return _record(trace, _finish(...)) in place of the bare _finish(...).
    # 2. In the except, set trace.error to repr(exc) and trace.stop_reason to "error". Then raise.
    # 3. In the finally, call trace.write(svc).
    # 4. Wrap the _finish(...) call in "with reporting_to(trace):", so a reask in the output guard
    #    is counted on this trace. Import reporting_to from askpep.guards.protocol.
    ...


def run_desk(
    graph,
    question: str,
    *,
    svc: Services,
    thread_id: str | None = None,
    principal: Principal | None = None,
    route: str = "agent",
) -> DeskResult:
    # your turn:
    # 1. Add the route parameter, as above.
    # 2. Make trace = _new_trace(svc, thread_id, question, route) before the input guard runs.
    # 3. After the guard, set trace.query to verdict.text.
    # 4. On a block, return _blocked(svc, trace, thread_id).
    # 5. Pass trace=trace to _run.
    ...


def continue_desk(graph, thread_id: str, *, svc: Services) -> DeskResult:
    # your turn: pass trace=_resumed_trace(graph, svc, thread_id) to _run.
    ...


def resume_desk(
    graph,
    thread_id: str,
    decision: ApprovalDecision,
    *,
    svc: Services,
    approver: Principal | None = None,
    now: datetime | None = None,
) -> DeskResult:
    # your turn: pass the same trace= argument to _run.
    ...`,
          expect:
            "Run uv run pytest tests/llmops -k \"llmops01_s5 and desk_run and not streamed\" -q. Some desk run tests pass. The streamed ones wait for the next step.",
        },
        {
          kind: "step",
          id: "llmops01-s09",
          title: "Write the trace when a stream ends",
          text: "A streamed run is a generator, and a client can stop reading it early. So `_stream` becomes a wrapper whose `finally` writes the trace, however the stream ends. The old body moves to `_stream_run`. `stream_desk` gets the same `route` argument and the same trace.",
          lang: "python",
          file: "src/askpep/agents/graph.py",
          code: `# src/askpep/agents/graph.py
def _stream(graph, payload: Any, *, svc: Services, thread_id: str, trace: Trace) -> Iterator[DeskEvent]:
    """Run payload and yield the events. The run's trace is written when the stream ends, however it ends."""
    # your turn: this becomes a wrapper.
    #   try:
    #       yield from _stream_run(
    #           graph, payload, svc=svc, thread_id=thread_id, trace=trace, config=_config(svc, thread_id)
    #       )
    #   finally:
    #       trace.write(svc)
    ...


def _stream_run(
    graph, payload: Any, *, svc: Services, thread_id: str, trace: Trace, config: dict[str, Any]
) -> Iterator[DeskEvent]:
    # your turn: this is the old body of _stream. It takes config instead of building it.
    # 1. In the except Exception block, set trace.error to repr(exc) and trace.stop_reason to "error".
    #    Keep the error event and the return.
    # 2. Wrap the finished result: result = _record(trace, _finish(...)).
    # 3. Wrap the _finish(...) call in "with reporting_to(trace):" too. Keep every yield outside
    #    the block, because a generator can resume on another thread.
    ...


def stream_desk(
    graph,
    question: str,
    *,
    svc: Services,
    thread_id: str | None = None,
    principal: Principal | None = None,
    route: str = "agent",
) -> Iterator[DeskEvent]:
    # your turn: build the trace as run_desk does, with the route argument.
    # On an input block, use _blocked and yield asdict(result) in the done event.
    # Otherwise pass trace=trace to _stream.
    ...


def stream_resume(graph, resumption: Resumption, *, svc: Services) -> Iterator[DeskEvent]:
    # your turn: pass trace=_resumed_trace(graph, svc, resumption.thread_id) to _stream.
    ...`,
          expect:
            "Run uv run pytest tests/llmops -k \"llmops01_s5 and desk_run\" -q. Seven tests pass.",
        },
        {
          kind: "p",
          text: "Two files remain, and both run the desk over the golden set. The retrieval slice already used the route `eval` in course 4, so only the desk runs need the change. Without it, each golden item would add an `agent` row, and a test run would look like traffic.",
        },
        {
          kind: "step",
          id: "llmops01-s10",
          title: "Run graph comparisons on the route eval",
          text: "`compare_graphs` runs every golden item through each graph. Pass `route=\"eval\"` to `run_desk`, so these runs stay out of every SLO.",
          lang: "python",
          file: "src/askpep/agents/compare.py",
          code: `# src/askpep/agents/compare.py
def compare_graphs(
    svc: Services, graphs: Mapping[str, Any], golden: Sequence[GoldenItem]
) -> list[GraphStats]:
    """Run every golden question through every graph, each on a thread of its own, and score them."""
    # your turn: call run_desk(graph, item.question, svc=svc, route="eval").
    ...`,
          expect:
            "Run uv run pytest tests/llmops -k \"llmops01_s5 and graph_comparison\" -q. One test passes.",
        },
        {
          kind: "step",
          id: "llmops01-s11",
          title: "Run the gate's desk on the route eval",
          text: "`live_backends` builds the functions that the gate calls. Its desk function runs one golden item. Give it the same `route=\"eval\"`.",
          lang: "python",
          file: "src/askpep/evals/runner.py",
          code: `# src/askpep/evals/runner.py
def live_backends(svc: "Services", graph: str = "handoffs") -> Backends:
    """The real system: retrieval through the services' store, and the desk graph with its guards."""
    # your turn: in the inner desk function, call run_desk(compiled, item.question, svc=svc, route="eval").
    ...`,
          expect:
            "Run uv run pytest tests/llmops -k llmops01_s5 -q. All 23 step 5 tests pass.",
        },
        {
          kind: "quiz",
          id: "llmops01-q5",
          question:
            "The eval gate runs the desk over the golden set before a release. What goes wrong if those runs keep the default route `agent`?",
          options: [
            "Nothing. The SLOs ignore the route, so the extra rows are harmless.",
            "Each golden run counts as a person's request, so test failures show in the success and cost SLOs as if users had hit them.",
            "The runs write no trace, because only the route `eval` writes one.",
            "The runs fail, because `run_desk` accepts only the route `eval`.",
          ],
          answer: 1,
          explain:
            "The SLOs keep rows whose route is a request route, and `agent` is one. A gate run would add its failures to `answer-success` and its spend to the cost SLO. The route `eval` is not a request route, so those rows are left out.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "What would you log, measure and trace in a production LLM application?",
          text: "I would trace each request under one id, with time, status and tokens on each span. I would measure error rate, latency per stage and cost per task, and record how each request ended. Sensitive text is redacted before it leaves the system. I keep every failure and sample the rest.",
        },
        {
          kind: "p",
          text: "Every request now leaves one honest row. One command can read them all.",
        },
      ],
    },
    {
      id: "s8-slo-command",
      title: "The slo command prints every objective and exits 1 when one is missed",
      goal: "What does `askpep slo` print, and when does it exit 1?",
      blocks: [
        {
          kind: "p",
          text: "Step 6 adds the command that ties the chapter together. `askpep slo` loads the SLOs, reads recent rows from `traces`, measures each SLO and prints one line for it. A cron job or a CI step can use its exit code.",
        },
        {
          kind: "compare",
          caption:
            "The exit codes. It reads the last 28 days by default. `--since 7d` narrows the window, and `--file` points it at another SLO file.",
          columns: ["Exit code", "When"],
          rows: [
            ["0", "Every SLO is met."],
            [
              "1",
              "An SLO is missed, or there is no database. The `STORE` setting must be `pg`, which is the default.",
            ],
            ["2", "The SLO file, an SLO in it or the window cannot be read."],
          ],
        },
        {
          kind: "p",
          text: "The helper `load_rows` ships complete in `records.py`. It reads the newest 5,000 rows in the window. On a busy system with a long window, the attainment describes only those rows. Chapter 6 adds log-based metrics. They count the log line that each request writes, so they cover every request.",
        },
        {
          kind: "step",
          id: "llmops01-s12",
          title: "Read your SLOs",
          text: "Do this after lab step 6. The command reads your own `traces` table, so the numbers depend on what you have run. A small table gives few requests for each SLO.",
          lang: "bash",
          code: `uv run askpep slo`,
          expect:
            "Six lines, one for each SLO in the file, with met or MISSED at the start. The cost line reads 0.0000 usd per successful task until chapter 4. If the table has no request rows, every line reads no requests in the window.",
        },
        {
          kind: "code",
          lang: "text",
          code: `MISSED  answer-success      0.900 of 40, target 0.95, budget left -100%
met     total-latency       1.000 of 40, target 0.95, budget left 100%
met     generate-latency    1.000 of 40, target 0.95, budget left 100%
met     rerank-latency      1.000 of 40, target 0.95, budget left 100%
met     guard-block-rate    0.975 of 40, target 0.97, budget left 17%
met     cost-per-success    0.0000 usd per successful task, limit 0.02`,
          caption:
            "Output for a made-up set of 40 requests: 36 good, 2 refused, 1 guard block and 1 error. Yours will differ.",
        },
        {
          kind: "p",
          text: "Read the first line. The 4 bad requests are twice the 2 that the target allows, so the budget left is minus 100% and the SLO is missed. Its burn rate is 2.0. The three latency SLOs are met. The guard block line has 17% of its budget left.",
        },
        {
          kind: "fold",
          tone: "trouble",
          title: "A cost line can say no requests in the window and still read MISSED",
          text: "If every request in the window failed, there is no success to divide the spend by. The cost line then has no value, so it prints no requests in the window. Its status is still MISSED. Read the success line next to it, which shows the failures.",
        },
        {
          kind: "p",
          text: "Every later chapter reports against these SLOs. Exports to Google Cloud need credentials. The cloud course covers Workload Identity Federation, so this course does not teach it.",
        },
        {
          kind: "list",
          items: [
            "Chapter 2 traces the desk in LangSmith and redacts what leaves your system.",
            "Chapter 3 adds OpenTelemetry spans and exports them to Cloud Trace.",
            "Chapter 4 writes `cost_usd` on each trace, so the cost SLO reads a real figure.",
            "Chapter 5 samples live traffic for judging, and works out how many answers a person must review.",
            "Chapter 6 alerts on the burn rate.",
            "Chapter 7 seeds a regression and finds it with the SLOs and the traces.",
            "Chapter 8 meets a real incident in the pilot and decides whether the third team can join.",
          ],
        },
        {
          kind: "p",
          text: "One command now answers the product owner's question for one day. A team needs that answer written down.",
        },
      ],
    },
    {
      id: "s9-ops-plan",
      title: "The first reading shows one objective missed, so the plan starts there",
      goal: "What does one day of traffic say, and what does the plan still owe?",
      blocks: [
        {
          kind: "p",
          text: "The first reading shows one objective missed, and the plan starts from that. A service needs one page that says what you watch, who owns each number and what is still blank. This course calls that page the operations plan. It sits beside the eval plan from course 4.",
        },
        {
          kind: "p",
          text: "You ship the recording on Monday. Tuesday is the pilot's first full day with honest rows. On Wednesday 25 November at nine o'clock you run `askpep slo --since 1d`.",
        },
        {
          kind: "code",
          lang: "text",
          code: `MISSED  answer-success      0.920 of 200, target 0.95, budget left -60%
met     total-latency       0.965 of 200, target 0.95, budget left 30%
met     generate-latency    0.984 of 64, target 0.95, budget left 69%
met     rerank-latency      1.000 of 64, target 0.95, budget left 100%
met     guard-block-rate    0.985 of 200, target 0.97, budget left 50%
met     cost-per-success    0.0000 usd per successful task, limit 0.02`,
          caption: "The first reading, for Tuesday's traffic. The figures belong to the story.",
        },
        {
          kind: "p",
          text: "Read the first line with a pencil. The target allows 5% of 200 requests to fail, which is 10. Sixteen failed, so the budget is overspent by six, or 60%. The burn rate is 0.08 divided by 0.05, which is 1.6.",
        },
        {
          kind: "p",
          text: "The 200 requests were 64 `/ask` calls and 136 desk runs. Only `/ask` has a `generate` or `rerank` time, so those two lines count 64. The cost line reads zero because nothing has priced a trace yet. It is no data, and the plan must say so.",
        },
        {
          kind: "p",
          text: "You count the 16 failures from the rows. Eleven were refusals, three were guard blocks, one was a step budget stop and one was an error. Eleven plus three plus one plus one is 16.",
        },
        {
          kind: "p",
          text: "You show this to the product owner at ten. The product owner reads 0.920 and asks if the target is wrong. You say nobody can tell yet, because some of those refusals may be correct. Lowering a target on the second day would only hide the question.",
        },
        {
          kind: "p",
          text: "The second team's lead adds one sentence. The team says the desk refuses too often on packaging questions. You write that down as a lead to check, because one sentence is not a count. So the target stays, and the plan records the miss.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# OPS-PLAN.md
System: PEP desk (AskPEP)   Version: 1   Date: 25 November 2026
Read by: product owner, second team's lead, security reviewer
Follows: EVAL-PLAN.md version 2

## Decisions these numbers must support
O1  Is the second team getting answers?      askpep slo
O2  What does a successful answer cost?      none yet
O3  Are real answers any good?               none yet
O4  Who is told when the desk breaks?        none yet
O5  Can the third team join on 30 November?  none yet

## Objectives
ID  SLO               Target        Tuesday       Owner              Alert     Runbook
A1  answer-success    0.95          0.920 MISSED  product owner      none yet  none yet
A2  total-latency     0.95, 10 s    0.965 met     engineering        none yet  none yet
A3  generate-latency  0.95, 7 s     0.984 met     engineering        none yet  none yet
A4  rerank-latency    0.95, 400 ms  1.000 met     engineering        none yet  none yet
A5  guard-block-rate  0.97          0.985 met     security reviewer  none yet  none yet
A6  cost-per-success  0.02 usd      no data       product owner      none yet  none yet

## Rules
1. A target changes only in writing, with the reading that justifies it.
2. A run the gate started is never traffic.
3. A zero with no data behind it is not a good reading.

## Not measured yet
Whether a live answer was correct. Questions no eval item covers.`,
          caption: "OPS-PLAN.md, version 1. Later chapters fill in the blanks.",
        },
        {
          kind: "p",
          text: "Read the plan by its blanks. O1 now has a command behind it, and every other decision says none yet. A6 says no data, where the tool printed a reassuring zero. The plan's job is to stop anyone reading that zero as a saving.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# OPS-PLAN.md
System:            Version:    Date:
Read by:
Follows:

## Decisions these numbers must support
O1  (a question someone will really ask)   (command or none yet)

## Objectives
ID  SLO   Target   Latest reading   Owner   Alert   Runbook

## Rules
1. A target changes only in writing, with the reading that justifies it.
2. A run the gate started is never traffic.
3. A zero with no data behind it is not a good reading.

## Not measured yet`,
          caption: "For your next service: the operations plan, values left blank.",
        },
        {
          kind: "p",
          text: "Before anyone reads a trace, the security reviewer has a question. A trace holds the user's words, so is it safe to share? Chapter 2 starts there.",
        },
      ],
    },
  ],
  lab: {
    title: "Write the SLOs, measure them from traces and read them with askpep slo",
    goal: "Write four functions in `slo.py`, record how every request ended, and add the `slo` command. Steps 1 to 4 start from stubs that raise `NotImplementedError(\"llmops-01 step N\")`. Steps 5 and 6 edit your own files, and their tests fail until you do. No test calls a model. Step 6 needs Postgres. Then compare with `capstone/src/askpep/`.",
    minutes: 75,
    files: [
      "src/askpep/telemetry/slo.py",
      "src/askpep/tracing.py",
      "src/askpep/generation.py",
      "src/askpep/guards/flow.py",
      "src/askpep/agents/graph.py",
      "src/askpep/agents/compare.py",
      "src/askpep/evals/runner.py",
      "src/askpep/cli.py",
      "tests/llmops/test_llmops01_slos.py",
    ],
    steps: [
      {
        title: "Read the objectives from a file",
        text: "Write `load_slos` in `slo.py`. It reads `slos.json` into `Slo` objects in file order, and raises `ValueError` naming the SLO when a rule breaks. Add `import json` first, because the stub leaves it out. The stub raises `llmops-01 step 1`.",
        code: `# src/askpep/telemetry/slo.py
# Add this import: import json


def load_slos(path: Path = DEFAULT_SLOS) -> list[Slo]:
    """Read the SLOs from a JSON file shaped {"slos": [{...}, ...]}, in file order."""
    # your turn:
    # 1. Read path as UTF-8 JSON and take its "slos" list. A missing file raises OSError. Let it.
    # 2. Build each entry with Slo(**entry). A field the entry omits takes the dataclass default.
    # 3. Raise ValueError, naming the SLO, for each rule in the table of section 6:
    #    a repeated name, a kind outside KINDS, a share kind with a target outside 0 to 1,
    #    a latency SLO with no stage or a threshold_ms not above 0, a cost SLO with a limit_usd
    #    not above 0, and a window_days below 1.
    # 4. Return the SLOs in file order.
    ...`,
        test: "uv run pytest tests/llmops -k llmops01_s1",
      },
      {
        title: "Decide what counts as a success",
        text: "Write `is_success` in `slo.py`. A row succeeds when it has no `error`, did not refuse, and its `stop_reason` is `done` or missing. Read each key with `row.get`. The stub raises `llmops-01 step 2`.",
        code: `# src/askpep/telemetry/slo.py
def is_success(row: Row) -> bool:
    """Whether a request gave an answer."""
    # your turn: one expression over row.get("error"), row.get("refused") and row.get("stop_reason").
    # A stop reason of None counts as done. Every other stop reason except "done" is a failure.
    ...`,
        test: "uv run pytest tests/llmops -k llmops01_s2",
      },
      {
        title: "Measure one objective against rows",
        text: "Write `measure` in `slo.py`. Keep only finished request rows, then count good and total by kind. Add `is_finished` and `request_rows` to your import from `askpep.telemetry.records`, because the stub leaves them out. The stub raises `llmops-01 step 3`.",
        code: `# src/askpep/telemetry/slo.py
# Add is_finished and request_rows to your import from askpep.telemetry.records.


def measure(slo: Slo, rows: Sequence[Row]) -> SloStatus:
    """Check one SLO against trace rows."""
    # your turn:
    # 1. counted = the request rows that are finished.
    # 2. cost: wins = the counted rows that succeed. spend = the sum of cost_usd, with a missing one as 0.
    #    value = spend / wins, or None with no wins. met = value <= limit_usd, and True with no counted rows.
    #    Return SloStatus(slo.name, wins, len(counted), None, met, None, value).
    # 3. latency: take latency_ms when the stage is "total", else timings[stage]. Leave out a row with no
    #    such number. good = how many are at or below threshold_ms.
    # 4. guard_block: good = the counted rows whose stop_reason is not "guard_blocked".
    # 5. success: good = the counted rows for which is_success is true.
    # 6. With a total of 0, return a met status with attainment None and budget_remaining 1.0.
    # 7. Otherwise attainment = good / total and allowed = total * (1 - target). It is met when
    #    attainment >= target - 1e-9. budget_remaining = 1 - (total - good) / allowed.
    ...`,
        test: "uv run pytest tests/llmops -k llmops01_s3",
      },
      {
        title: "Work out the burn rate",
        text: "Write `burn_rate` in `slo.py`. It divides the bad share by the share the target allows. A target outside 0 to 1 raises `ValueError`, and you check it first. No requests give 0.0. The stub raises `llmops-01 step 4`.",
        code: `# src/askpep/telemetry/slo.py
def burn_rate(good: int, total: int, target: float) -> float:
    """How many times faster than planned the error budget is going."""
    # your turn:
    # 1. Raise ValueError when target is not strictly between 0 and 1.
    # 2. Return 0.0 when total is 0.
    # 3. Return the bad share, (total - good) / total, divided by 1 - target.
    ...`,
        test: "uv run pytest tests/llmops -k llmops01_s4",
      },
      {
        title: "Record how every request ended",
        text: "Add `stop_reason`, `answer` and `success` to `Trace`, and write both columns in its INSERT. Then change the five files in the steps of section 7: generation, flow, graph, compare and runner. The tests raise `llmops-01 step 5` until the work is done.",
        code: `# src/askpep/tracing.py
# Add this after the log line:
#   ANSWER_LIMIT = 4000  # characters of the answer that the traces table keeps


@dataclass
class Trace:
    """One per request. Stages are timed with: with trace.stage("dense"):"""

    # your turn: add two fields after started, each with the default None.
    #   stop_reason: str | None = None   how the run ended: done, refused, guard_blocked, error and the rest
    #   answer: str | None = None        the text the person was given

    @property
    def success(self) -> bool:
        """The request gave an answer: no error, no refusal, no guard block and no budget stop."""
        # your turn: import is_success from askpep.telemetry.slo inside this method, as the reference does.
        # Call it on a dict with the keys error, refused and stop_reason, taken from self.
        ...

    def write(self, svc: Services) -> None:
        """Persist the trace and log it as one JSON line. Never raises."""
        # your turn: in the INSERT, add stop_reason and answer after error, with two more %s.
        # The values are self.stop_reason, and self.answer cut to ANSWER_LIMIT characters when it is
        # not None.
        ...`,
        test: "uv run pytest tests/llmops -k llmops01_s5",
      },
      {
        title: "Add the slo command",
        text: "Write the `slo` command in `cli.py`. It loads the SLOs, reads the traces with `load_rows`, measures each one and prints a line for it. It exits 0 when all are met. It exits 1 on a miss or with no database, and 2 for a bad file, SLO or window.",
        code: `# src/askpep/cli.py
@app.command()
def slo(
    since: Annotated[str, typer.Option("--since", help="How far back to look. Default: 28d.")] = "28d",
    file: Annotated[str, typer.Option("--file", help="Default: infra/monitoring/slos.json.")] = "",
) -> None:
    """Print each objective's attainment and its error budget. Exits 1 if one is missed."""
    # your turn:
    # 1. Inside the function, import Path, load_rows, parse_since, DEFAULT_SLOS, load_slos and measure.
    # 2. svc = open_services(). When svc.pool is None, print "SLOs read the traces table. Set STORE=pg."
    #    to stderr and exit 1.
    # 3. Load the SLOs from Path(file), or DEFAULT_SLOS when file is empty. Then
    #    rows = load_rows(svc.pool, parse_since(since)) and measure each SLO.
    #    An OSError, ValueError or KeyError prints its message to stderr and exits 2.
    # 4. Call close_eval(svc) in a finally, however the command ends.
    # 5. Print one line for each SLO: "met" or "MISSED" padded to 8, the name padded to 20, then a reading.
    #      cost:   f"{status.value:.4f} usd per successful task, limit {objective.limit_usd}"
    #      ratio:  f"{status.attainment:.3f} of {status.total}, target {objective.target}"
    #              then f", budget left {status.budget_remaining:.0%}"
    #      none:   "no requests in the window"
    # 6. Exit 0 when every SLO is met, and 1 otherwise.
    ...`,
        test: "uv run pytest tests/llmops -k llmops01_s6",
      },
    ],
    verify: "uv run pytest tests/llmops -k llmops01",
  },
  recap: [
    "A tracing tool answers only the questions you wrote down. So AskPEP states SLOs of four kinds first: answer success, p95 for each stage, cost per successful task and guard block rate.",
    "An SLO has a measure, a target, a window and an error budget. The budget is the total times one minus the target.",
    "A request is a finished row on a request route. A success has no error, no refusal and a stop reason of `done` or none.",
    "A refusal, a guard block and a budget stop all count as failures of the success SLO. A window with no requests counts as met.",
    "A burn rate is the bad share divided by the share the target allows. A rate of 1.0 spends the budget exactly over the window.",
    "`Trace` now records `stop_reason` and `answer`, every desk run writes one trace, and eval runs use the route `eval`, so they are not traffic.",
    "`askpep slo` prints one line for each SLO and exits 1 on a miss. The cost line reads zero until chapter 4.",
    "The first reading of the pilot missed `answer-success` at 0.920, and `OPS-PLAN.md` version 1 records the miss and every blank.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In what to observe I learned that you write the objectives before you pick a tool. SLOs and an error budget turn \"is it working?\" into counts you can alert on. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["llmops-q11", "llmops-q09"],
};

export default chapter;
