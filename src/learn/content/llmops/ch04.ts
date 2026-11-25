import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "llmops-04-cost-and-latency",
  course: "llmops",
  number: 4,
  title: "Cost per successful task is the number to manage",
  tagline: "The product owner asks what the pilot costs. Price each request from its own tokens, then divide the spend by the requests that worked.",
  minutes: 65,
  objectives: [
    "Work out cost per successful task from a ledger of requests, and say why failed requests stay in the spend.",
    "Price a call from its tokens, and say what a trace stores when a model has no price.",
    "Account calls, tokens, cost and p95 time for each stage, and say why the dearest stage is not always the slowest.",
    "Read `askpep cost` and the `cost_usd` of a gate report, and name what each one leaves out.",
    "Test a cost cut against the success objective, using the break-even success rate.",
    "Say which rows go into cost per successful task, and which stay out.",
    "Write a cost note that says what its figure leaves out.",
  ],
  sections: [
    {
      id: "s1-the-number",
      title: "Cost per successful task counts failed requests, so it is the number to manage",
      goal: "What is cost per successful task, and why does a price per token hide it?",
      blocks: [
        {
          kind: "p",
          text: "One number answers the product owner. On Thursday 26 November the product owner asks what the pilot costs, and what one good answer costs. The operations plan says no data.",
        },
        {
          kind: "p",
          text: "Chapter 1 set the limit at two cents for each successful task. This chapter measures that number from the traces AskPEP already writes. It also finds the stage that spends the most.",
        },
        // CHECK: the placeholder prices in capstone/pricing.json. They are 3 and 15 dollars per million tokens in and out for claude-sonnet-5-5, and 0.5 and 3 for gemini-3.8-flash. Replace each with the price on the provider's page, then set `_checked` to the date. FACTS.md does not confirm the id claude-sonnet-5-5, so confirm it is the model that `/ask` uses.
        {
          kind: "p",
          text: "Every cost in this chapter is a worked example. It uses the placeholder prices that ship in `pricing.json`, a file that section 2 explains. You replace them with the provider's current prices before you trust a figure. Read each number here as arithmetic to follow, and never as a bill.",
        },
        {
          kind: "p",
          text: "A provider bills per million tokens. It sets one price for tokens in and a higher price for tokens out. Take an `/ask` request that sends 3,000 tokens and gets 250 back. At the placeholder prices of 3 dollars in and 15 dollars out per million, it costs 0.01275 dollars, about 1.3 cents.",
        },
        {
          kind: "p",
          text: "A price per request is easy to read and easy to cut. A shorter prompt cuts it, and so does a cheaper model. Neither tells you whether the money bought an answer. A request that ends in a refusal, an output guard block or a budget stop still spent its tokens.",
        },
        {
          kind: "p",
          text: "So the number to manage is **cost per successful task**. Add up the spend on every request, failed ones included. Divide by the number of requests that succeeded. A success means what it meant in chapter 1: no error, no refusal and a stop reason of `done`.",
        },
        {
          kind: "p",
          text: "Failures go into the sum and stay out of the divisor. That is deliberate. If a failure left the number unchanged, nothing in the number would push you to fix it.",
        },
        {
          kind: "p",
          text: "One outcome is neither a success nor a failure. A desk run can pause to wait for a person's approval, with the stop reason `awaiting_approval`. Its tokens are spent, so they stay in the sum. It has no place in the divisor until it finishes.",
        },
        {
          kind: "widget",
          id: "llmops04-cost-ledger",
          intro:
            "A ledger of twelve requests from one quiet hour follows. Each row shows what the request cost, in cents, and how it ended. Work out the cost per successful task in your head, then pick your answer. The figures are illustrative.",
        },
        {
          kind: "callout",
          tone: "analogy",
          title: "A kitchen counts the dishes it bins",
          text: "A kitchen pays for every dish it cooks and is paid for the dishes it serves. If one dish in five goes in the bin, a served dish carries 25 percent more food cost than a cooked one. A request that fails goes in the same bin.",
        },
        {
          kind: "quiz",
          id: "llmops04-q1",
          question:
            "An output guard blocks an answer after the model wrote it. The request cost 0.4 cents. How does it enter cost per successful task?",
          options: [
            "It is left out, because the person got no answer.",
            "Its 0.4 cents go into the spend, and it adds nothing to the count of successes.",
            "It counts as a success, because the model did its job.",
            "It counts as half a success, because the answer existed.",
          ],
          answer: 1,
          explain:
            "The spend counts every request. The divisor counts only successes. A blocked answer used tokens and delivered nothing, so it raises the number. That pressure is the reason to manage this number and not the price per request.",
        },
        {
          kind: "p",
          text: "The number needs a dollar figure for each request. The next section shows where that figure comes from.",
        },
      ],
    },
    {
      id: "s2-price-a-request",
      title: "A trace prices itself from its own usage, with no call to the provider",
      goal: "How do token counts become dollars on a trace?",
      blocks: [
        {
          kind: "p",
          text: "Chapter 3 gave every trace a `usage` record. It holds one entry for each stage, with the model, the number of calls, and the tokens in and out. A price list turns those tokens into money. AskPEP keeps it in `pricing.json`, which `pull-course.sh llmops` put in your workspace.",
        },
        {
          kind: "code",
          lang: "json",
          code: `{
  "_checked": "unchecked",
  "claude-sonnet-5-5": {"input": 3.0, "output": 15.0},
  "gemini-3.8-flash": {"input": 0.5, "output": 3.0}
}`,
          caption: "The shape of pricing.json, trimmed to two models. Prices are dollars per million tokens, and these are placeholders.",
        },
        {
          kind: "p",
          text: "The file carries a `_checked` date. It records when someone last compared the prices with the provider's page, and it reads `unchecked` until you do. A key that starts with an underscore is a note, not a model.",
        },
        {
          kind: "p",
          text: "`load_prices` reads the file and returns one `Price` for each model. It raises `ValueError` for a file with no `_checked`, for a model that lacks `input` or `output`, and for a negative price. The message names the model. A missing file is an `OSError`, and the caller sees it.",
        },
        {
          kind: "p",
          text: "`cost_usd` prices one call. It multiplies the tokens in by the input price, and the tokens out by the output price. It adds the two and divides by one million. Here is the request from section 1.",
        },
        {
          kind: "code",
          lang: "text",
          code: `(3000 * 3.0 + 250 * 15.0) / 1_000_000
= (9000 + 3750) / 1_000_000
= 0.01275`,
          caption: "The `/ask` request from section 1, at the placeholder prices.",
        },
        {
          kind: "p",
          text: "The name `cost_usd` turns up in five places. It is a function in `cost.py` and a field on `Trace`. It is a column of the `traces` table. The root span carries it as the attribute `askpep.cost_usd`, and the gate report has a field of the same name. All five deal in dollars.",
        },
        // CHECK: that Gemini's API adds a leading `models/` to a model name, as the paragraph says. Compare with the model name that a real trace holds.
        {
          kind: "p",
          text: "Two helpers ship complete. `price_of` finds a model's price, and it ignores a leading `models/`, which Gemini's API adds. It raises `KeyError` for a model with no price, because a guessed price would be a wrong number that looks right. `usage_cost` adds `cost_usd` over every stage of a `usage` record, each at its own model's price.",
        },
        {
          kind: "p",
          text: "A trace prices itself when it is written. `Trace._cost` loads the price list and calls `usage_cost` on the trace's `usage`. The result goes into `cost_usd`, into the row of the `traces` table, and onto the root span as `askpep.cost_usd`. A trace viewer can then show what a request cost beside its stages.",
        },
        {
          kind: "p",
          text: "A trace that has a model and token totals but no `usage` gets one `generate` stage made from them first. Older code sets the totals directly, and this keeps those traces priced.",
        },
        {
          kind: "p",
          text: "Writing a trace must never break a request. So `_cost` catches a missing price file, a bad one and a model with no price, and returns `None`. A request that called no model costs 0. The write path never raises. The cost command later in this chapter is stricter.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "A missing price hides spend instead of raising it",
          text: "The write path stores `None` for the whole trace when one stage uses a model with no price. The cost objective from chapter 1 reads a missing cost as 0. Switch the writer to an unpriced model, and the objective stays green while spend rises. Add the price in the same change.",
        },
        {
          kind: "p",
          text: "Pricing at write time has one more effect. The stored cost is frozen at the prices of that day. Change `pricing.json` later, and old rows keep their old cost. Rows written before lab step 3 have no stored cost at all.",
        },
        // CHECK: that the Gemini integration's output token count includes thinking tokens. If it leaves them out, the computed cost under-counts. Compare a day of computed cost with the provider's usage page.
        {
          kind: "fold",
          tone: "industry",
          title: "A provider can bill more than two prices",
          text: "A provider may bill cached input tokens at a lower rate, and may count a model's thinking tokens as output. `Price` has two numbers and `usage` has two counts, so the arithmetic here prices neither case apart. Compare a day of computed cost with the provider's own usage page before you quote the figure to anyone.",
        },
        {
          kind: "quiz",
          id: "llmops04-q2",
          question:
            "You switch the writer to a model that `pricing.json` has no price for. What does a desk trace written afterwards store in `cost_usd`?",
          options: [
            "An error, and the request fails.",
            "`None` for the whole trace, and the request completes.",
            "Zero for the writer's stage and the right cost for the others.",
            "The price of the nearest model in the file.",
          ],
          answer: 1,
          explain:
            "Writing a trace never raises, so the request completes. One unpriced model makes `usage_cost` raise `KeyError`, and `_cost` turns that into `None` for the whole trace. The other stages lose their cost too, and the cost objective reads the gap as 0.",
        },
        {
          kind: "p",
          text: "Each trace now has a price. Adding the prices up by stage shows where the money went.",
        },
      ],
    },
    {
      id: "s3-stages",
      title: "The dearest stage is not always the slowest, so account for cost and time apart",
      goal: "Which stage spends the most, and is it also the slowest?",
      blocks: [
        {
          kind: "p",
          text: "A stage is any name in a trace's `usage` or its `timings`. An `/ask` request has six: `embed`, `dense`, `sparse`, `fuse`, `rerank` and `generate`. A desk request has one stage for each agent that ran, which are `triage`, `researcher`, `code_advisor` and `writer`. It has one for each tool too, such as `tool.search_peps`.",
        },
        {
          kind: "p",
          text: "An agent stage times its model calls only. Its tools have their own stages, so no time is counted twice.",
        },
        {
          kind: "p",
          text: "Only stages that call a chat model have tokens. In `/ask` that is `generate` alone. Voyage serves `embed` and `rerank`, and `usage` records no tokens for them. The database serves `dense` and `sparse`. These stages carry time and no cost.",
        },
        // CHECK: that Voyage bills embedding and rerank calls by tokens, and that the plan in use charges for them. The chapter says only that a bill exists and that no trace prices it.
        {
          kind: "callout",
          tone: "warn",
          title: "A zero cost is not a free stage",
          text: "`askpep cost` prices chat-model tokens only. Voyage bills the `embed` and `rerank` calls, and nothing in a trace prices them. They show 0.0000 in the cost column and 0 percent of the share. Read that zero as unpriced. Your Voyage invoice holds the real figure.",
        },
        {
          kind: "p",
          text: "`stage_costs` adds up each stage over the request rows. The next section says which rows those are. For each stage it gives the calls, the tokens in and out, the cost, the stage's share of all the cost and the p95 time. It sorts the dearest stage first. Ties go to the higher p95, then to the name.",
        },
        {
          kind: "p",
          text: "Cost and time have different drivers. A model reads its input in one pass and writes its output one token at a time. So input tokens are cheap and quick, and output tokens are dearer and slower.",
        },
        {
          kind: "p",
          text: "A stage that re-reads a long history can be costly and fast. A stage that writes a long answer can be slow and cost less. Ranking by cost and ranking by time can put different stages first.",
        },
        {
          kind: "widget",
          id: "llmops04-dearest-stage",
          intro:
            "Sixteen desk requests follow, with the tokens each stage used. Predict first. Which stage costs the most, and which has the highest p95? Then switch to `/ask` traffic and look at the stages that show zero. The prices are placeholders and the figures are illustrative.",
        },
        {
          kind: "p",
          text: "In the desk data the researcher is the dearest stage. It holds 60 percent of the cost. It calls the model two or three times for one question, and each call re-reads the history so far. The writer has the highest p95. It makes one call with a long output.",
        },
        {
          kind: "p",
          text: "A fix aimed at the researcher's reads will not move the writer's tail. A fix aimed at the writer's length will not cut the researcher's bill. You need both rankings to choose.",
        },
        {
          kind: "p",
          text: "A p95 belongs to one stage and its own rows. A desk request that never reached the writer adds nothing to the writer's p95. Stage p95s do not add up either. The p95 of a whole request is not the sum of its stage p95s. The slowest request at one stage is rarely the slowest at another.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Average latency looks fine, but users say it is slow",
          text: "Answer first: the average hides the tail, so look at the p95. Then say it per stage, because p95s do not add and the slow stage may not be the dear one. Ask the traces which stage owns the tail. Close with the fix for that stage and a check that the tail moved.",
        },
        {
          kind: "quiz",
          id: "llmops04-q3",
          question:
            "The p95 times of the four desk agent stages are 0.9, 7.0, 3.8 and 8.9 seconds. What is the p95 of the whole request?",
          options: [
            "20.6 seconds, the sum of the four.",
            "8.9 seconds, the largest of the four.",
            "It can't be read from the stage p95s. You take the p95 over the times of whole requests.",
            "5.2 seconds, the mean of the four.",
          ],
          answer: 2,
          explain:
            "A p95 describes one set of times. The slowest tail at the researcher and the slowest tail at the writer usually come from different requests. The sum overstates the total and the largest understates it. Use the request totals themselves.",
        },
        {
          kind: "p",
          text: "The stage table counts request rows. The next section says exactly which rows those are.",
        },
      ],
    },
    {
      id: "s4-per-task",
      title: "Cost per successful task counts a person's requests, and only those",
      goal: "Which rows go into the number, and what does `None` mean?",
      blocks: [
        {
          kind: "p",
          text: "`cost_per_successful_task` takes request rows and a price list. It adds `usage_cost` over every row. It divides by the number of rows for which `is_success` is true. With no success it returns `None`, because the result of a division by zero would mean nothing.",
        },
        {
          kind: "p",
          text: "The term request rows has an exact meaning. `request_rows` keeps the routes that a person's request takes, such as `ask`, `agent` and `mcp.ask`. It drops route `eval`. The gate, `eval run` and `desk compare` all write rows on that route. They are tests, and their spend would swell a number meant to describe real use.",
        },
        {
          kind: "p",
          text: "It also drops `agent.search`. That route is one tool call inside a desk run, and not a request. A row from before the `usage` column has no `usage`. `row_usage` makes one `generate` stage from its model and token totals, so old rows still price.",
        },
        {
          kind: "compare",
          caption: "Which rows go into cost per successful task",
          columns: ["Row", "In the spend", "In the successes"],
          rows: [
            ["A request that succeeded", "Yes", "Yes"],
            ["A refusal, an error or a guard block", "Yes", "No"],
            ["A run stopped by a budget", "Yes", "No"],
            ["A desk run waiting for approval", "Yes", "No, and it is not yet a failure"],
            ["A row on route `eval`", "No", "No"],
            ["A tool call on route `agent.search`", "No", "No"],
          ],
        },
        {
          kind: "quiz",
          id: "llmops04-q4",
          question:
            "`askpep eval gate` runs 40 desk questions and spends 30 cents. Where does that spend appear in `cost_per_successful_task` for the last 24 hours?",
          options: [
            "In the spend, and the questions that passed count as successes.",
            "In the spend only, because the gate's runs never count as successes.",
            "Nowhere. The rows are on route `eval`, which `request_rows` drops.",
            "Nowhere, because the gate's runs have no `usage`.",
          ],
          answer: 2,
          explain:
            "The gate's desk runs write rows on route `eval`, and `request_rows` leaves that route out of the spend and the successes. They do have `usage`, so the gate can still report their cost. That is the job of the `cost_usd` field in its report.",
        },
        {
          kind: "p",
          text: "The definitions are settled. One command prints them all.",
        },
      ],
    },
    {
      id: "s5-command-and-gate",
      title: "The cost command shows where money goes, and the gate reports its own spend",
      goal: "What does the cost report print, and what does the gate's `cost_usd` cover?",
      blocks: [
        {
          kind: "p",
          text: "`askpep cost` reads the request rows of the last 24 hours. `--since` widens or narrows the window, in minutes, hours or days, such as `30m` or `7d`. It prints one line for each stage, the dearest first. Then it prints the number of requests, the number that succeeded, and the cost per successful task.",
        },
        {
          kind: "p",
          text: "It reads at most the newest 5,000 rows of the window, so a busy week is a sample of its newest rows.",
        },
        {
          kind: "p",
          text: "With no database the command exits 1, because it has nothing to read. A price file it can't read, a model with no price or a bad window exits 2 with a message. This is the strict path. The write path stored `None`, and the report refuses to guess.",
        },
        {
          kind: "code",
          lang: "text",
          code: `stage           calls  tokens in  tokens out   cost usd  share   p95 ms
generate            3       8364         933     0.0391   100%     4400
rerank              0          0           0     0.0000     0%      502
embed               0          0           0     0.0000     0%      270
dense               0          0           0     0.0000     0%       64
sparse              0          0           0     0.0000     0%       41
fuse                0          0           0     0.0000     0%        3
3 requests, 3 successful, 0.0391 usd in all
cost per successful task: 0.0130 usd`,
          caption: "A worked example of the output, from three `/ask` requests at the placeholder prices.",
        },
        {
          kind: "p",
          text: "The `embed` and `rerank` lines show 0.0000, as the earlier warning said. The command prices chat-model tokens only, so no Voyage call is in any figure here. The line `3 requests, 3 successful` counts request rows only.",
        },
        {
          kind: "step",
          id: "llmops04-s01",
          title: "Read the cost of three real questions",
          text: "Do this after lab step 6. It makes three real model calls, which the provider bills. Run the migration, ask three questions, then read the cost report. Each command sets `STORE=pg`, because the cost report reads the `traces` table.",
          lang: "bash",
          code: `STORE=pg uv run askpep migrate
STORE=pg uv run askpep ask "Why was the walrus operator controversial?"
STORE=pg uv run askpep ask "What does PEP 8 say about line length?"
STORE=pg uv run askpep ask "What is a PEP?"
STORE=pg uv run askpep cost --since 1h`,
          expect:
            "A table with one line for each stage. The `generate` line comes first and holds 100% of the cost. The `embed` and `rerank` lines show 0.0000. The last two lines give 3 requests and a cost per successful task. Your numbers differ from the example above.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "askpep slo and askpep cost can disagree",
          text: "The cost objective reads the `cost_usd` stored in each row, at the prices of the day it was written. `askpep cost` prices `usage` again with today's `pricing.json`. The objective also leaves out runs waiting for approval, and the command counts them. After you edit a price, expect a gap until the old rows leave the window.",
        },
        {
          kind: "p",
          text: "In chapter 8 of the evaluation course the gate report carried `cost_usd: 0.0`, and the chapter promised that course 5 would measure it. This is the measurement. The gate's desk runs are rows on route `eval`. `count_traces` collects the trace id of each desk run. `gate_cost` then sums their stored cost with `traces_cost`, which ships complete.",
        },
        {
          kind: "code",
          lang: "json",
          code: `{
  "version": 1,
  "created_at": "2026-10-21T09:30:00Z",
  "passed": true,
  "cost_usd": 0.0412,
  "dataset_versions": { "routing": "v1" },
  "slices": { }
}`,
          caption: "The top of a gate report, with a made-up figure and the slices left out. The field is the dollars that the gate's desk runs spent.",
        },
        {
          kind: "p",
          text: "Read the field with its limits. It covers the chat-model tokens of the gate's desk runs, priced from their `usage`. It leaves out Voyage calls, the judge model that `--judge` adds, and any slice that runs no desk. It is not a bill. The gate does not fail on cost, because the field is there to read.",
        },
        {
          kind: "p",
          text: "With no database the field is still 0.0. A failed read also gives 0.0, and prints `cost of the gate not read` on stderr. So a 0.0 still needs a second look.",
        },
        {
          kind: "step",
          id: "llmops04-s02",
          title: "Read the cost of a gate run",
          text: "Do this after lab step 6, and only if you have the keys. The gate calls Gemini through the desk and Voyage for retrieval, and the provider bills both. It writes a report to `evals/reports/`. With `STORE=pg` set, the report holds the cost of the desk runs.",
          lang: "bash",
          code: `STORE=pg uv run askpep eval gate`,
          expect:
            "The JSON report prints `cost_usd` as a number above 0.0. With `STORE=local`, the field prints 0.0 and the run still passes or fails on its slices.",
        },
        {
          kind: "quiz",
          id: "llmops04-q5",
          question:
            "After this chapter's change, an `eval gate` report still says `cost_usd: 0.0`. Which cause is possible?",
          options: [
            "The run was free, because the desk calls were cached.",
            "No database was set, so there were no traces to read.",
            "The gate stops early when its cost reaches 0.0.",
            "The field is still a placeholder that nothing writes.",
          ],
          answer: 1,
          explain:
            "With no database the gate has no `traces` table to read, so it reports 0.0. A failed read does the same and prints a line on stderr. The field is measured now, so it is no placeholder, and it is not a bill either.",
        },
        {
          kind: "p",
          text: "You can now read what the desk spends. The next question is what to do about it.",
        },
      ],
    },
    {
      id: "s6-cut-test",
      title: "A cut wins only if cost per success falls and success holds",
      goal: "How do you test a cut against both numbers?",
      blocks: [
        {
          kind: "p",
          text: "Cost per successful task is the spend per request divided by the success rate. A cut lowers the first number. If it also lowers the second, the quotient may not fall. Cut the spend per request by a quarter. Cost per success then falls only while the new success rate stays above three quarters of the old one.",
        },
        {
          kind: "p",
          text: "That break-even is generous, and it is a trap. With a success rate of 96 percent, the new rate may fall to 72 percent and the cost number still improves. The success objective in `slos.json` asks for 95 percent. It fails long before the cost number does.",
        },
        {
          kind: "p",
          text: "Cost per success measures money. It says nothing about whether people got what they came for. So test every cut against both numbers on the same traffic. Cost per success must fall, and the success objective must still hold. The eval gate from the evals course is where the quality side runs.",
        },
        {
          kind: "widget",
          id: "llmops04-cut-test",
          intro:
            "A month of AskPEP traffic has a spend per request and a success rate. Predict first. A cut lowers the spend per request by a quarter. How low can the success rate go before cost per success gets worse? Then move the sliders and watch both objectives. The figures are illustrative.",
        },
        {
          kind: "p",
          text: "The stage table tells you where to cut. In the desk data the researcher holds 60 percent of the cost, so a change there pays most. Fewer search results per call is one idea, because it shortens the history that each later call re-reads. Whether it hurts the success rate is a question for the gate.",
        },
        {
          kind: "p",
          text: "The larger levers are model routing and caching. Course 6, on architecture, covers both. Each one is a cut like any other. Judge it by the number from this chapter and the success objective from chapter 1.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Your agent costs too much. Where do you start",
          text: "Answer first: measure before you cut. Say cost per successful task, with failures in the spend. Name the dearest stage from the traces, and say that cost and time rank stages differently. Then name the cut and the check beside it. Admit what you can't see, such as Voyage calls.",
        },
        {
          kind: "quiz",
          id: "llmops04-q6",
          question:
            "Spend per request is 0.5 cents with a success rate of 96 percent. A change cuts spend per request by 20 percent, and the success rate falls to 80 percent. What follows?",
          options: [
            "Ship it. Cost per success fell from about 0.52 cents to 0.50 cents.",
            "Reject it. Cost per success rose, because the success rate fell.",
            "Ship it, because the success rate only fell by 16 points.",
            "Reject it. Cost per success barely moved, and the success objective of 95 percent is missed.",
          ],
          answer: 3,
          explain:
            "Before, 0.5 divided by 0.96 is about 0.52 cents. After, 0.4 divided by 0.80 is 0.50 cents. The cost number improved a little, and the success rate is 15 points under its objective. A cost-only review would pass this change and it would break the product.",
        },
        {
          kind: "p",
          text: "That is the method. The product owner's question is still open, and Wednesday's rows can answer it.",
        },
      ],
    },
    {
      id: "s7-cost-note",
      title: "One good answer costs 1.1 cents, and the researcher holds 41% of the spend",
      goal: "What does the pilot cost, and can a cheaper researcher ship?",
      blocks: [
        {
          kind: "p",
          text: "One good answer costs 1.1 cents, on placeholder prices, and the pilot is inside its limit. A cost question needs a short note with the reading, the dearest stages, what the reading leaves out and what you decided. This chapter's note answers the product owner in one page.",
        },
        {
          kind: "p",
          text: "At nine o'clock on Thursday 26 November you run `askpep cost --since 1d` over Wednesday's traffic. The command prices each row's `usage` with today's price list, so it can read rows written before you added the stored cost.",
        },
        {
          kind: "code",
          lang: "text",
          code: `stage             calls  tokens in  tokens out   cost usd  share   p95 ms
researcher          326    1238800       68460     0.8248    41%     8900
generate             64     185600       15360     0.7872    39%     4600
writer              128     268800       53760     0.2957    15%     6400
triage              136     122400        4080     0.0734     4%      880
code_advisor         22      39600        5720     0.0370     2%     3700
tool.search_peps      0          0           0     0.0000     0%     1720
rerank                0          0           0     0.0000     0%      380
embed                 0          0           0     0.0000     0%      270
dense                 0          0           0     0.0000     0%       64
sparse                0          0           0     0.0000     0%       41
fuse                  0          0           0     0.0000     0%        3
200 requests, 184 successful, 2.0181 usd in all
cost per successful task: 0.0110 usd`,
          caption: "Wednesday's cost report. The figures belong to the story, and the prices are the placeholders.",
        },
        {
          kind: "p",
          text: "Check one line by hand. The researcher read 1,238,800 tokens at 0.5 dollars a million, which is 0.6194. It wrote 68,460 tokens at 3 dollars a million, which is 0.2054. The two add up to 0.8248. The shares are rounded, so they add up to 101.",
        },
        {
          kind: "p",
          text: "Now divide. The spend of 2.0181 over 184 successes is 0.0110 dollars, which is 55% of the two cent limit. Sixteen requests failed on Wednesday, and their spend is in that sum.",
        },
        {
          kind: "p",
          text: "Split the spend by route. The 64 `/ask` calls spent 0.7872, or 0.0123 each. The 136 desk runs spent the other 1.2309, or 0.0091 each. A desk run is cheaper here because its agents use the small model, and `/ask` writes with the large one.",
        },
        {
          kind: "p",
          text: "The researcher is the dearest stage, and you already know why from the 38-second trace. Each call re-reads what came before. So you try one cut. You cap the researcher at three searches, on a branch at commit f3a90c2. From Wednesday's rows you estimate that this removes 30% of the researcher's spend.",
        },
        {
          kind: "p",
          text: "That is 0.2474 dollars, so the day would have cost 1.7707, or 0.0096 for each success if success holds. The break-even success rate is 0.92 times 1.7707 divided by 2.0181, which is 0.81. The cost number alone would allow a fall to 81%.",
        },
        {
          kind: "p",
          text: "So the gate decides. The answer slice falls to 10 of 14, which is 0.71, with an interval from 0.50 to 0.93. The floor is 0.80, and the gate exits 1. Two answers that needed a fourth search now stop short. You don't ship the cut.",
        },
        {
          kind: "p",
          text: "The product owner reads the figure and asks if it is real. You say the arithmetic is real and the prices are not, because `pricing.json` still says `unchecked`. Voyage calls aren't in it either. The product owner asks you to replace the prices and to write down what the figure leaves out.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# COST-NOTE-001.md
Date: 26 November 2026   Asked by: product owner
Window: Wednesday 25 November, 200 requests, 184 successful
Prices: placeholders from pricing.json, _checked: unchecked

## Reading
Spend                     2.0181 usd
Cost per successful task  0.0110 usd   limit 0.02   55% of the limit
Spend per /ask call       0.0123 usd   64 calls
Spend per desk run        0.0091 usd   136 runs

## Dearest stages
researcher  0.8248 usd  41%
generate    0.7872 usd  39%
writer      0.2957 usd  15%

## Not in the reading
Voyage embed and rerank calls. They show 0.0000. Read the invoice.
Any provider discount for cached input.

## Cut tried
Cap the researcher at 3 searches, commit f3a90c2.
Estimated spend 1.7707 usd, 0.0096 per success if success holds.
Break-even success 0.81.
Gate: answer 10/14 = 0.71, interval 0.50 to 0.93, floor 0.80. Exit 1.

## Decision
Not shipped. The pilot is inside its limit, so no cut is needed this week.

## Next
Replace the placeholder prices and set _checked. Owner: engineering.
OPS-PLAN A6 now reads 0.0110, on placeholder prices.`,
          caption: "COST-NOTE-001.md, whole.",
        },
        {
          kind: "p",
          text: "Read the cut's section first. The cost number improved, and the cut still failed, because the gate measures what the cost number can't. The section called not in the reading stops anyone quoting 1.1 cents as the whole bill. The last line keeps the operations plan honest about where its figure came from.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# COST-NOTE-(number).md
Date:   Asked by:
Window:
Prices:

## Reading
Spend:
Cost per successful task:   limit:

## Dearest stages

## Not in the reading

## Cut tried
Change:   Commit:
Estimated saving:   Break-even success:
Gate result:

## Decision

## Next`,
          caption: "For your next cost question: the note, values left blank.",
        },
        {
          kind: "p",
          text: "None of these numbers says whether the answers are any good. How do you judge answers nobody wrote? Chapter 5 starts there.",
        },
      ],
    },
  ],
  lab: {
    title: "Price the tokens of AskPEP",
    goal: "Write the price list reader, then price a call, a trace and each stage. Divide the spend by the successes, then add the `askpep cost` command and the gate's cost line. Steps 1, 2, 4 and 5 start from a stub that raises `NotImplementedError(\"llmops-04 step N\")`. Steps 3 and 6 edit your own files. The tests call no model, and step 6 needs your Postgres. Run them from your AskPEP workspace root. Then compare with `capstone/src/askpep/` in the my-learn folder.",
    minutes: 80,
    files: [
      "src/askpep/telemetry/cost.py",
      "src/askpep/tracing.py",
      "src/askpep/config.py",
      "src/askpep/cli.py",
      "tests/llmops/test_llmops04_cost.py",
    ],
    steps: [
      {
        title: "Read the price list",
        text: "Write `load_prices` in `cost.py`. It reads `pricing.json` and returns a `Price` for each model. Skip keys that start with an underscore. Raise `ValueError` when `_checked` is missing, or when a model lacks `input` or `output` or has a negative price. Name the model in the message. The stub raises `llmops-04 step 1`.",
        code: `# src/askpep/telemetry/cost.py
# Add import json at the top. Price, Path and the other imports ship in your stub.
def load_prices(path: Path | str) -> dict[str, Price]:
    """Read pricing.json and return one Price for each model."""
    # your turn:
    # 1. data = json.loads(Path(path).read_text(encoding="utf-8")). A missing file raises OSError.
    #    Let it through, because the caller decides what to do.
    # 2. A file with no "_checked" key raises ValueError.
    # 3. For each key that does not start with an underscore, build
    #    Price(float(entry["input"]), float(entry["output"])).
    #    A missing key or a bad entry raises ValueError that names the model.
    # 4. A price below 0 raises ValueError that names the model.
    ...`,
        test: "uv run pytest tests/llmops -k llmops04_s1",
      },
      {
        title: "Price one call",
        text: "Write `cost_usd` in `cost.py`. It multiplies the tokens in by the input price and the tokens out by the output price, adds them, and divides by one million. A negative token count raises `ValueError`. The stub raises `llmops-04 step 2`.",
        code: `# src/askpep/telemetry/cost.py
def cost_usd(price: Price, tokens_in: int, tokens_out: int) -> float:
    """The cost of one model call, in dollars."""
    # your turn: raise ValueError for a negative token count, then return the cost.
    # Check: 1,000 tokens in and 200 out at the prices 3.0 and 15.0 cost 0.006 dollars.
    ...`,
        test: "uv run pytest tests/llmops -k llmops04_s2",
      },
      {
        title: "Price a request when its trace is written",
        text: "Edit `tracing.py` and `config.py`. Add the `pricing_file` setting. Give `Trace` a `cost_usd` field and a `_cost` method that prices its `usage` and never raises. Set it when the trace closes, put it on the root span, and add the column to the `traces` insert. This step has no stub.",
        code: `# src/askpep/tracing.py
# 1. In config.py, add to Settings: pricing_file: str = "pricing.json"
# 2. In Trace, add the field beside stop_reason and answer:
#        cost_usd: float | None = None
# 3. Add this method to Trace. The capstone puts the import inside the method.
    def _cost(self, svc: Services) -> float | None:
        from askpep.telemetry.cost import load_prices, usage_cost

        # your turn: return usage_cost(load_prices(svc.settings.pricing_file), self.usage).
        # A missing file, a bad file and a model with no price must not raise.
        # Catch OSError, ValueError and KeyError, and return None.
        ...

# 4. In the method that ends the root span (the capstone calls it _close), before the span ends:
#    - When self.usage is empty and the trace has a model and token totals, make one "generate"
#      entry from them: {"model": ..., "calls": 1, "tokens_in": ..., "tokens_out": ...}.
#    - Set self.cost_usd = self._cost(svc).
#    - When it is not None, call root.set_attribute("askpep.cost_usd", self.cost_usd).
# 5. In the INSERT INTO traces, add the column cost_usd and the value self.cost_usd.
#    Keep the column list, the placeholders and the values in step.
# 6. Nothing more to write for a reask. Its tokens reach the trace through report_usage in your
#    services.py reask (guardrails-04) and the reporting_to blocks from llmops-01 steps 7 to 9.`,
        test: "uv run pytest tests/llmops -k llmops04_s3",
      },
      {
        title: "Add up each stage",
        text: "Write `stage_costs` in `cost.py`. Use request rows only. For each stage in a row's `usage` or `timings`, add its calls, tokens and cost, and take the p95 of its times. A stage's share is its cost over the total. Sort by cost, then p95, then name. The stub raises `llmops-04 step 4`.",
        code: `# src/askpep/telemetry/cost.py
# Change the records import to: from askpep.telemetry.records import Row, percentile, request_rows
def stage_costs(rows: Sequence[Row], prices: Mapping[str, Price]) -> list[StageCost]:
    """Add up tokens, cost and time for each stage over request rows, the dearest stage first."""
    # your turn:
    # 1. Loop over request_rows(rows). For each row read row_usage(row) and row.get("timings") or {}.
    # 2. For each usage entry, add its calls (default 1), tokens in and tokens out to the stage's
    #    counters. Add cost_usd(price_of(prices, entry["model"]), ...) to the stage's spend.
    # 3. For each timing, keep the milliseconds in a list for that stage.
    # 4. total is the sum of every stage's spend. A stage's share is its spend over total, or 0.0
    #    when total is 0.
    # 5. Build one StageCost for each name that appears in either place. p95_ms is percentile(times, 95).
    # 6. Return the list sorted by (-cost_usd, -p95_ms, stage).
    ...`,
        test: "uv run pytest tests/llmops -k llmops04_s4",
      },
      {
        title: "Divide the spend by the successes",
        text: "Write `cost_per_successful_task` in `cost.py`. Take the request rows. Add `usage_cost(prices, row_usage(row))` for every one, failed or not. Divide by the rows for which `is_success` is true. With no success, return `None`. The stub raises `llmops-04 step 5`.",
        code: `# src/askpep/telemetry/cost.py
# Add to your imports: from askpep.telemetry.slo import is_success
def cost_per_successful_task(rows: Sequence[Row], prices: Mapping[str, Price]) -> float | None:
    """All the spend on the request rows, divided by the rows that succeeded."""
    # your turn:
    # 1. counted = request_rows(rows)
    # 2. wins = how many of counted satisfy is_success. With no wins, return None.
    # 3. Return the sum of usage_cost(prices, row_usage(row)) over counted, divided by wins.
    ...`,
        test: "uv run pytest tests/llmops -k llmops04_s5",
      },
      {
        title: "Add the cost command and the gate's cost",
        text: "Edit `cli.py`. Add the `cost` command. It prints a line for each stage, the request and success counts, and the cost per successful task. Exit 1 with no database and 2 on a bad price file or window. Then write `count_traces` and `gate_cost`, and pass the cost to `eval gate`. This step has no stub.",
        code: `# src/askpep/cli.py
def count_traces(backends):
    """The same backends, and the list that fills with the trace id of each desk run."""
    # your turn: when backends.desk is None, return backends and an empty list. Otherwise wrap the
    # desk so that each call appends result.trace_id (or "") to the list. Return
    # dataclasses.replace(backends, desk=wrapped) and the list.
    ...


def gate_cost(svc, trace_ids: list[str]) -> float:
    """What the desk runs of a gate cost, from the traces they wrote."""
    # your turn: import traces_cost from askpep.telemetry.cost and return
    # traces_cost(getattr(svc, "pool", None), trace_ids). When that raises, print
    # "cost of the gate not read: <error>" to stderr and return 0.0.
    ...


# In eval_gate, right after open_eval, add: backends, trace_ids = count_traces(backends)
# Then pass cost_usd=gate_cost(svc, trace_ids) to run_gate.


@app.command()
def cost(
    since: Annotated[
        str, typer.Option("--since", help="How far back to look, such as 30m, 24h or 7d.")
    ] = "24h",
) -> None:
    """Print what the models cost for each stage, and the cost of each successful task."""
    # your turn:
    # 1. svc = open_services(). With no svc.pool, print "Cost reads the traces table. Set STORE=pg."
    #    to stderr and exit 1.
    # 2. rows = load_rows(svc.pool, parse_since(since)), then prices = load_prices(svc.settings.pricing_file).
    #    An OSError, ValueError or KeyError prints its message to stderr and exits 2.
    # 3. Call close_eval(svc) in a finally block.
    # 4. Print a header, then one line for each StageCost: stage, calls, tokens in, tokens out,
    #    cost with four decimals, share as a percentage and p95 in milliseconds.
    # 5. Print "<n> requests, <m> successful, <x> usd in all". n counts request_rows(rows), and m
    #    counts is_success. x is the sum of the stage costs.
    # 6. Print "cost per successful task: <x> usd", or "cost per successful task: none, nothing
    #    succeeded" when cost_per_successful_task gives None.
    ...`,
        test: "uv run pytest tests/llmops -k llmops04_s6",
      },
    ],
    verify: "uv run pytest tests/llmops -k llmops04",
  },
  recap: [
    "Cost per successful task is all the spend divided by the successes, so failed requests raise it.",
    "A trace prices its own `usage` when it is written, and stores `None` when a model has no price.",
    "`stage_costs` ranks stages by cost and by p95, and the two rankings often differ.",
    "A p95 belongs to one stage, so p95s do not add up to the p95 of a request.",
    "`askpep cost` prices chat-model tokens only, and the gate's `cost_usd` covers its own desk runs only.",
    "A cut is a win only when cost per success falls and the success objective still holds.",
    "`COST-NOTE-001.md` puts Wednesday at 0.0110 dollars per success on placeholder prices. A cap on the researcher's searches failed the gate, so it did not ship.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In cost and latency I learned that cost per successful task keeps failed requests in the spend, so it pushes me to fix failures. I also learned that cost and time rank stages differently. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["llmops-q02", "llmops-q01", "llmops-q03", "llmops-q04"],
};

export default chapter;
