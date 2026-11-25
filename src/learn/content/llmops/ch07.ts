import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "llmops-07-incident-investigation",
  course: "llmops",
  number: 7,
  title: "Rehearse the incident before it happens",
  tagline: "A page names a symptom. Rehearse the answer on a seeded regression, write the runbook, and be ready before the real one arrives.",
  minutes: 65,
  objectives: [
    "Seed each of the three regressions and say what each does to the numbers.",
    "Find the stage that moved by comparing two windows, and find when it moved with a change point.",
    "Say why `diagnose` checks refusals first, then tokens, then latency.",
    "Work out which alert rule would have caught each regression, and how late.",
    "Settle the tracing stack from the span counts and the free allowance.",
    "Find the stage that changed from two windows of rows.",
    "Say why a recorded time beats a change point.",
    "Write a runbook that puts stopping the harm before finding the cause.",
  ],
  sections: [
    {
      id: "s1-seed",
      title: "A seeded regression lets you practise the diagnosis with a known answer",
      goal: "What does the seeder write, and why is a known answer worth having?",
      blocks: [
        {
          kind: "p",
          text: "A rehearsal with a known answer is the cheapest way to learn an incident. It is Friday morning, 27 November, and the alerts have been live for one night. Nobody has answered a page yet.",
        },
        {
          kind: "p",
          text: "You cannot practise on a system that is not failing, so the course breaks one for you. The command `askpep incident seed` writes 240 made-up request rows to a file. The first 120 are healthy. From row 120 on, one thing is wrong.",
        },
        {
          kind: "p",
          text: "Each row has the fields of a row in the `traces` table. Those are the route, the time in each stage, the tokens used and whether the request was refused. The rows come 30 seconds apart, so the file covers two hours.",
        },
        {
          kind: "p",
          text: "A regression is a change that makes the system worse than it was. You choose one of three kinds with `--kind`. Each kind breaks a different part of the system, and each hides from a different check.",
        },
        // CHECK: pricing.json holds placeholder prices (its _checked field says unchecked). Every dollar figure in this chapter is a worked example, not a current price.
        {
          kind: "compare",
          caption: "What the seeder changes in the second half, and what the traces show.",
          columns: ["Kind", "What the seeder changes", "What the traces show"],
          rows: [
            ["slow_rerank", "The rerank stage takes nine times as long.", "Rerank is slow. Failures, chunks and tokens look normal."],
            ["token_bloat", "The prompt grows to four times as many input tokens, and generation slows down.", "Input tokens, generate time and the cost per successful task all rise."],
            ["empty_retrieval", "Most requests find no chunks and are refused.", "Failures jump. Latency and cost fall."],
          ],
        },
        {
          kind: "p",
          text: "The rows are made up, and so is every number in this chapter. Each figure comes from one run with the fixed seed and the placeholder prices, so the dollar amounts are worked examples. Your run gives the same figures. Only the clock times differ, because the seeder ends at the moment you run it.",
        },
        {
          kind: "p",
          text: "The objectives from chapter 1 are `Slo` entries in the code, and the commands print them as objectives. A regression matters when it breaks one.",
        },
        {
          kind: "p",
          text: "The diagnosis answers four questions, and each has a lab step.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Which stage moved? Step 1 compares two windows of rows.",
            "When did it move? Step 2 looks for a change point.",
            "What broke? Step 3 names the kind of change and the objectives that went from met to missed.",
            "What do you write down? Step 4 drafts the postmortem.",
          ],
        },
        {
          kind: "quiz",
          id: "llmops07-q1",
          question: "You seed slow_rerank on Monday and again on Tuesday, with the default settings. What differs between the two files?",
          options: [
            "Nothing. The two files are identical.",
            "Only the clock times of the rows, because the rows end at the moment you run the command.",
            "The row where the regression starts, because the seeder picks it at random.",
            "The kind of regression, because the seed changes each day.",
          ],
          answer: 1,
          explain: "The seed is fixed, so the timings, tokens and refusals repeat exactly. The rows end at the time you run the command, so the timestamps move. The regression always starts at row 120.",
        },
        {
          kind: "p",
          text: "The file is ready. The first question is which stage changed.",
        },
      ],
    },
    {
      id: "s2-stage-shifts",
      title: "The stage that moved shows up when two windows are compared",
      goal: "Which stage changed between a healthy window and a bad one?",
      blocks: [
        {
          kind: "p",
          text: "A window is a run of rows in time order. Take one window before the change and one after. For each stage, work out its p95. Then compare the two windows stage by stage.",
        },
        {
          kind: "p",
          text: "Step 1 returns one `StageShift` for each stage. It holds the p95 before and after, and the mean input tokens before and after. Two properties do the comparing. `added_ms` is the p95 after minus the p95 before. `token_ratio` is the tokens after divided by the tokens before.",
        },
        {
          kind: "p",
          text: "Only request rows count. The `traces` table also holds rows from evaluation runs and inner search calls. They would skew the windows, so `request_rows` drops them. Call it first.",
        },
        {
          kind: "compare",
          caption: "Illustrative figures: p95 in milliseconds for each stage in the slow_rerank file, cut at the true change, biggest slowdown first.",
          columns: ["Stage", "p95 before", "p95 after", "added_ms"],
          rows: [
            ["rerank", "155", "1,352", "+1,197"],
            ["embed", "79", "80", "+2"],
            ["dense", "51", "52", "+1"],
            ["fuse", "4", "4", "0"],
            ["sparse", "35", "35", "0"],
            ["generate", "3,309", "3,095", "-214"],
          ],
        },
        {
          kind: "p",
          text: "Rerank added 1,197 ms, and nothing else moved by more than a few milliseconds. The minus 214 for generate is noise. A p95 over 120 requests rests on the six slowest, so it wanders a little between windows.",
        },
        {
          kind: "quiz",
          id: "llmops07-q2",
          question: "A stage has a p95 of 400 ms before and 150 ms after. What is its `added_ms`, and where does it sort?",
          options: [
            "250, because the number is always positive.",
            "-250, and it sorts after every stage that slowed down.",
            "-250, and it sorts first, because it changed the most.",
            "0, because only slowdowns count.",
          ],
          answer: 1,
          explain: "The value is the p95 after minus the p95 before, so a stage that got faster has a negative number. The sort puts the largest number first, so this stage goes near the end.",
        },
        {
          kind: "p",
          text: "You can compare two windows once you know where to cut. The next section finds the cut.",
        },
      ],
    },
    {
      id: "s3-change-point",
      title: "A change point finds when the numbers moved, and it can be one row early",
      goal: "When did it change, and when do you trust a recorded time instead?",
      blocks: [
        {
          kind: "p",
          text: "A comparison needs a time to cut at. A deploy log is the record of what shipped and when, and it gives one. A config change gives another. When you have neither, `change_point` estimates the time from the numbers.",
        },
        {
          kind: "p",
          text: "It reads one series, the total latency of each request in time order. It tries every cut that leaves at least 3 rows on each side. For each cut it takes the mean on each side and scores the cut. The best score wins.",
        },
        {
          kind: "code",
          lang: "python",
          caption: "The score of one cut. The cut with the highest score is the change point.",
          code: "score = abs(mean_after - mean_before) * sqrt(n_before * n_after / n)",
        },
        {
          kind: "p",
          text: "The first factor is the gap between the two means. The second factor shrinks the score of cuts near the ends, where one side has few rows. A big gap between two lucky rows does not win.",
        },
        {
          kind: "fold",
          tone: "hood",
          title: "Why the score has a square root in it",
          text: "Take a cut at row 3. Its before mean rests on three rows, so one slow request can make a large gap. The factor is the square root of the rows before times the rows after, divided by all the rows. It is smallest at the ends and largest in the middle, so the middle cuts get a fair hearing.",
        },
        {
          kind: "p",
          text: "Three guards stop false alarms. With fewer than 8 rows the function returns `None`. On a tie it keeps the earliest cut. When the means of the best cut differ by less than 25 percent of the earlier mean, it also returns `None`, because nothing moved.",
        },
        {
          kind: "widget",
          id: "llmops07-change-point",
          intro: "Two runs of the same function. In the first, drag the split to where you think the latency changed, lock it, and read what `change_point` found. In the second, nothing is broken, and you predict the result.",
        },
        {
          kind: "p",
          text: "On the seeded slow_rerank file the function returns row 119, one row before the real change. One healthy request lands in the bad window. The postmortem then shows 0.8 percent of requests inside the rerank limit after the change. The true cut gives 0.0 percent.",
        },
        {
          kind: "p",
          text: "One row is 30 seconds, so the error is small. It still shows the rule. A recorded time beats an estimate, so pass the time from your deploy log to `incident diagnose` with `--at` whenever you have one.",
        },
        {
          kind: "quiz",
          id: "llmops07-q3",
          question: "The deploy log says the bad release went out at 10:00. The function returns 09:59:30. Which time goes in the postmortem, and how do you make `incident diagnose` use it?",
          options: [
            "09:59:30, because it was computed from the data.",
            "10:00 from the deploy log, passed with `--at`.",
            "Either, because they are only 30 seconds apart.",
            "10:00, after editing the times in the traces file.",
          ],
          answer: 1,
          explain: "The log is a record, and the function is an estimate. The `--at` option makes the command cut at your time instead of calling `change_point`. The traces file stays as it was.",
        },
        {
          kind: "p",
          text: "You have the windows and the shifts. Now the code has to name the cause.",
        },
      ],
    },
    {
      id: "s4-diagnose",
      title: "The diagnosis rules check refusals first, then tokens, then latency",
      goal: "Why does the order of the rules matter?",
      blocks: [
        {
          kind: "p",
          text: "Step 3 turns the shifts into a verdict. A request fails when it errors, is refused, or stops for any reason other than `done`. The function `diagnose` takes the first rule that holds.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Refusals. The share of failed requests rose by 10 points or more. The stage is `retrieval`.",
            "Tokens. Some stage has a `token_ratio` of 1.5 or more. The stage is that one.",
            "Latency. The top stage added at least 100 ms, and its p95 is at least 1.5 times what it was.",
            "None. No stage moved enough, and the headline says so.",
          ],
        },
        {
          kind: "p",
          text: "The order puts the cause before the symptom. A refusal storm makes requests faster, because a refused request skips generation. A token bloat makes generate slower, because the prompt is bigger. Each earlier rule catches a case where a later number is only an effect.",
        },
        {
          kind: "p",
          text: "Try it the other way round. If latency came first, it would blame generate for the token bloat, because generate added 1,952 ms. For the refusal storm it would say nothing, because nothing got slower.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "What `incident diagnose` printed for each kind in the worked runs, with the times left out.",
          code: [
            "slow_rerank",
            "  The rerank stage got much slower.",
            "    The p95 of rerank rose from 155 ms to 1352 ms.",
            "  objectives broken: rerank-latency",
            "",
            "token_bloat",
            "  The generate stage sends far more input tokens than before.",
            "    Mean input tokens in generate rose from 2194 to 8785, a factor of 4.0.",
            "  objectives broken: cost-per-success",
            "",
            "empty_retrieval",
            "  Requests failed far more often because retrieval returned too little.",
            "    The share of failed requests rose from 2% to 69%.",
            "    The mean number of retrieved chunks fell from 6.0 to 1.9.",
            "  objectives broken: answer-success",
          ].join("\n"),
        },
        {
          kind: "widget",
          id: "llmops07-incident-drill",
          intro: "Three seeded files, one at a time. Open at least three clues in each, then name what changed. One of the files is built to tempt you into the latency-first answer.",
        },
        {
          kind: "callout",
          tone: "insight",
          title: "A flat number is evidence too",
          text: "In the rerank file, the chunks, the input tokens and the failure share barely moved. Each flat number rules out a rule. By the time you reach latency, only one stage is left to name.",
        },
        {
          kind: "quiz",
          id: "llmops07-q4",
          question: "In a token_bloat file, the generate p95 rose from 3,309 ms to 5,261 ms and its input tokens rose by a factor of 4.0. Which rule names the cause?",
          options: [
            "Latency, because generate added more than 100 ms.",
            "Tokens, because the factor is above 1.5 and that rule comes before latency.",
            "Refusals, because slower requests are more likely to fail.",
            "None, because both changes are inside normal variation.",
          ],
          answer: 1,
          explain: "The token rule comes before the latency rule, and a factor of 4.0 passes it. The slowdown in generate follows from the bigger prompt, so naming generate as slow would describe the symptom and miss the cause.",
        },
        {
          kind: "p",
          text: "The diagnosis says what broke. The next question is how long it would have run before anyone heard.",
        },
      ],
    },
    {
      id: "s5-detection",
      title: "The alerts catch slow_rerank in 43 minutes, empty_retrieval in 2.5 hours and token_bloat never",
      goal: "Which alert rule fires for each regression, and how late?",
      blocks: [
        {
          kind: "p",
          text: "A diagnosis starts after you know something is wrong, and an alert is what tells you. Chapter 6 set up burn-rate alerts on the objectives. Here you use them to ask how long each regression would have run before anyone was paged.",
        },
        {
          kind: "p",
          text: "The highest possible burn rate on a 95 percent objective is 20, when every request is bad.",
        },
        // CHECK: the two burn-rate rules (14.4 over 3600 s with a 300 s short window, and 6.0 over 21600 s with a 1800 s short window) are the lab's choice in BURN_RULES. They are not a confirmed standard. The objective targets in slos.json are also the lab's choice.
        {
          kind: "p",
          text: "The rules are the lab's choice, and they are not a standard. The fast rule pages when the burn rate is above 14.4 over the last hour and the last 5 minutes agree. The slow rule uses 6.0 over 6 hours and the last 30 minutes.",
        },
        {
          kind: "p",
          text: "Take slow_rerank. After the change every request breaks the rerank-latency objective, so the burn rate climbs toward 20. The hour passes 14.4 when 72 percent of it is bad, because 14.4 divided by 20 is 0.72. That is about 43 minutes after the change.",
        },
        {
          kind: "p",
          text: "Take empty_retrieval. The answer-success objective allows 5 percent failures, and 69 percent fail, so the burn rate tops out near 13.8. That is below 14.4, so the fast rule can never fire. The slow rule needs about 2.5 hours of the incident.",
        },
        {
          kind: "p",
          text: "Take token_bloat. The only objective that broke is the cost per successful task. A cost objective has no burn-rate alert, so no alert fires at all. The bill grows until someone reads it. Only the cost tile and `askpep cost` watch it. A threshold alert on that tile could open a ticket.",
        },
        {
          kind: "compare",
          caption: "Hand-worked from the rule settings, with steady traffic. No alert was applied or run in this rehearsal.",
          columns: ["Kind", "What broke", "Alert that can fire", "Time to fire"],
          rows: [
            ["slow_rerank", "rerank-latency", "The fast rule", "About 43 minutes"],
            ["empty_retrieval", "answer-success", "The slow rule only", "About 2.5 hours"],
            ["token_bloat", "cost-per-success", "None", "Never"],
          ],
        },
        {
          kind: "callout",
          tone: "warn",
          title: "The total latency objective stayed green",
          text: "In slow_rerank the total p95 rose from 3,579 ms to 4,309 ms, and the limit is 10,000 ms. That objective stays met while one stage is nine times slower. An objective on each stage you can name catches what the total hides.",
        },
        {
          kind: "quiz",
          id: "llmops07-q5",
          question: "In an empty_retrieval incident 69 percent of requests fail, and the objective allows 5 percent. The fast rule needs a burn rate above 14.4. What happens?",
          options: [
            "The fast rule fires within minutes, because 69 percent is a large share.",
            "The fast rule never fires, because the burn rate tops out near 13.8.",
            "The fast rule fires after 43 minutes, as it did for slow_rerank.",
            "No rule can fire, because the slow rule needs a burn rate above 20.",
          ],
          answer: 1,
          explain: "The burn rate is 69.2 divided by 5, which is 13.8, even when the whole window is bad. That sits under 14.4. The slow rule has a lower threshold of 6.0, so it can fire, but only after about 2.5 hours.",
        },
        {
          kind: "p",
          text: "So the alerts are late, and sometimes silent. Whatever they catch still needs writing down.",
        },
      ],
    },
    {
      id: "s6-postmortem",
      title: "A postmortem draft comes free, and its actions are yours to write",
      goal: "What does the `postmortem` draft give you, and what must you write by hand?",
      blocks: [
        {
          kind: "p",
          text: "A postmortem is a short written account of an incident, read after it is over. Step 4 writes the draft from the diagnosis and the two windows. It has five headings, and the code fills each one.",
        },
        {
          kind: "list",
          items: [
            "Summary holds the headline.",
            "Impact has one line for each objective that broke, with its share before and after.",
            "Timeline has the first and the last time in the bad window.",
            "Root cause has one line for each piece of evidence.",
            "Actions has one generic line.",
          ],
        },
        {
          kind: "p",
          text: "The draft is thin on purpose. It cannot know what you changed, who was told, or what you will do next. The generic action names the kind and the stage and adds an alert. Everything else is yours to write.",
        },
        {
          kind: "fold",
          tone: "trouble",
          title: "The cost line in the draft has no unit",
          text: "A cost objective has no share of good requests, so the Impact line gives its value instead. For token_bloat that reads 0.0118 before and 0.0317 after. The draft rounds to four places but writes no unit. Add it by hand: dollars for each successful task.",
        },
        {
          kind: "p",
          text: "Now rehearse the whole loop yourself. Do the four steps below after lab step 5, in your AskPEP workspace. They need no database and no API key.",
        },
        {
          kind: "step",
          id: "llmops07-s01",
          title: "Seed a regression",
          text: "Do this after lab step 5. Seed the slow_rerank file. The rows go to `incident/traces.jsonl` unless you pass `--out`.",
          lang: "bash",
          code: "uv run askpep incident seed --kind slow_rerank",
          expect: "wrote 240 rows with slow_rerank to incident/traces.jsonl",
        },
        {
          kind: "step",
          id: "llmops07-s02",
          title: "Diagnose it and write the draft",
          text: "Do this after lab step 5. Run the diagnosis on the file and ask for the postmortem. Your clock time differs from the one below. The row counts and the figures match.",
          lang: "bash",
          code: "uv run askpep incident diagnose --file incident/traces.jsonl --postmortem incident/postmortem.md",
          expect: [
            "changed at 2026-10-21T19:38:36.640663+00:00  (119 rows before, 121 after)",
            "The rerank stage got much slower.",
            "  The p95 of rerank rose from 155 ms to 1352 ms.",
            "objectives broken: rerank-latency",
            "post-mortem written to incident/postmortem.md",
          ].join("\n"),
        },
        {
          kind: "step",
          id: "llmops07-s03",
          title: "Try a file too short to diagnose",
          text: "Do this after lab step 5. Seed only 6 rows and diagnose them. With fewer than 8 rows `change_point` returns `None`, and the command says the latency looks steady.",
          lang: "bash",
          code: "uv run askpep incident seed --kind slow_rerank --count 6 --out incident/short.jsonl\nuv run askpep incident diagnose --file incident/short.jsonl",
          expect: "wrote 6 rows with slow_rerank to incident/short.jsonl\nNo change found in 6 rows. The latency looks steady.",
        },
        {
          kind: "step",
          id: "llmops07-s04",
          title: "Write the actions by hand",
          text: "Do this after lab step 5. Open `incident/postmortem.md` and replace the generic Actions line with three of your own: restore, detect and prevent. The text below is a worked example for slow_rerank.",
          file: "incident/postmortem.md",
          lang: "md",
          code: [
            "## Actions",
            "",
            "- Restore: roll back the rerank change, then confirm the rerank p95 is back near 155 ms.",
            "- Detect: the fast rule would have paged after about 43 minutes. Decide whether a shorter window is worth the extra false alarms.",
            "- Prevent: add a rerank latency check to the release gate, so a nine-times slowdown fails before it ships.",
          ].join("\n"),
          expect: "Your file has five headings, and the Actions section has three lines that name a stage, a time and a gate.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "How do you investigate rising latency, cost or errors?",
          text: "Say who is affected and since when, then compare against a baseline. Break the time and cost down by stage from traces. Name the order you check things in, with the cause before the symptom. Close with the alert that would have caught it sooner and the case you add to the evaluation set.",
        },
        {
          kind: "p",
          text: "The rehearsal needed none of the vendor tools. So it's time to settle which of them stay on.",
        },
      ],
    },
    {
      id: "s7-stack",
      title: "Settle the stack: keep the table, export spans, and open LangSmith for a window",
      goal: "Which records run all the time, and which do you open only when you need them?",
      blocks: [
        {
          kind: "p",
          text: "The course gave you three records of a request. They are the `traces` table, OpenTelemetry spans exported to Cloud Trace, and LangSmith runs. Chapter 3 also compared Langfuse, Arize Phoenix and Datadog. The rehearsal needed none of them. This section settles which of the three records to run all the time.",
        },
        {
          kind: "p",
          text: "The table stays. It is the local record, and LangSmith and Cloud Trace are exports on top of it. The seeded file has the same fields as a table row, and the diagnosis found all three regressions in it with no vendor.",
        },
        {
          kind: "p",
          text: "A plain ask opens at most 7 spans. They are the request, then embed, dense, sparse, fuse, rerank and generate. A refused request opens 6. The spans hold names, sizes, counts and outcomes, and no question or answer text.",
        },
        {
          kind: "p",
          text: "Take 120 requests an hour, the rate the widget below starts from. That is 2,880 requests a day and 86,400 in a 30-day month. At 7 spans each, the month produces 604,800 spans.",
        },
        // CHECK: the Cloud Trace price, its billing unit and its free allowance were not confirmed for this chapter, so no price is given. The product name Cloud Trace was checked on 20 October 2026. Read the current pricing page before you quote a figure.
        {
          kind: "p",
          text: "Cloud Trace bills on the spans you send. The product name was checked on 20 October 2026. This chapter gives no price, because prices change and the pricing page is the source. Multiply the spans a month by the rate you read there.",
        },
        // CHECK: LangSmith Developer plan figures (1 seat, 5,000 base traces a month, base traces kept 14 days) are from FACTS.md, checked 20 October 2026. The 1.7-day figure assumes LangSmith counts one base trace for each request. That is an assumption, so confirm it on the pricing page.
        {
          kind: "p",
          text: "LangSmith's free Developer plan has one seat and 5,000 base traces a month. A base trace is the standard kind, kept for 14 days. The plan was checked on 20 October 2026. At 120 requests an hour, one trace for each request would use the allowance in about 1.7 days.",
        },
        {
          kind: "p",
          text: "In the capstone, LangSmith receives the retrieval run and the runs of the desk graph. A plain ask call to the model is not a LangSmith run. The switch in `.env` is all or nothing, so you open it for a window and then close it.",
        },
        {
          kind: "p",
          text: "The course measured no latency overhead for tracing, so this chapter gives none. The exporters in the capstone batch spans and send them from a background thread. That is a design fact, not a measurement. If the cost matters to you, run the same load with spans on and then off.",
        },
        {
          kind: "widget",
          id: "llmops07-stack-budget",
          intro: "Move the request rate and the share sent to LangSmith, and watch the span count and the free allowance. Then choose the setup you would run. The figures are illustrative.",
        },
        {
          kind: "step",
          id: "llmops07-s05",
          title: "Price the spans",
          text: "Do this after lab step 5. Open the Cloud Trace pricing page and find the price for ingested spans and the free allowance. Multiply by 604,800 spans for one month at 120 requests an hour. Write the sum and the date you read the page in a note.",
          file: "incident/stack.md",
          lang: "md",
          code: [
            "## Tracing stack",
            "",
            "- Table: kept, the local record.",
            "- Spans: 604,800 a month at 120 requests an hour and 7 spans a request.",
            "- Cloud Trace: write the price you read, the free allowance and the date here.",
            "- LangSmith: opened for a window, then closed. The free plan has 5,000 base traces a month.",
          ].join("\n"),
          expect: "Your note names a price, a date and a monthly sum, all from the pricing page and not from this chapter.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Why not rely on the tracing tool alone?",
          text: "A tracing tool explains one request. It pages nobody, and it keeps a window of data you pay for. Keep your own record, alert on the objectives, and open the tool to explain what an alert found.",
        },
        {
          kind: "quiz",
          id: "llmops07-q6",
          question: "At 120 requests an hour, with one LangSmith trace for each request, about how long do 5,000 free base traces last?",
          options: [
            "About 1.7 days.",
            "About 17 days.",
            "About 42 days.",
            "The whole 30-day month.",
          ],
          answer: 0,
          explain: "120 an hour is 2,880 a day, and 5,000 divided by 2,880 is about 1.7. Sending one request in ten would stretch that to about 17 days. The capstone switch cannot do that, so you open it for a window.",
        },
        {
          kind: "p",
          text: "Your tools are settled. It's time to run the whole rehearsal once and keep what it teaches.",
        },
      ],
    },
    {
      id: "s8-runbook",
      title: "The rehearsal found the seeded fault, and the runbook is what it leaves behind",
      goal: "What does a rehearsal leave behind for the next real page?",
      blocks: [
        {
          kind: "p",
          text: "The rehearsal found the seeded fault, and the runbook is what it leaves behind. A page at four in the afternoon needs a written order of work, because nobody thinks well with a team waiting. This chapter's two records are a finished postmortem and a one-page runbook.",
        },
        {
          kind: "p",
          text: "You seed `slow_rerank` into a file at eleven o'clock on Friday, so the live pilot isn't touched. You don't look at the seed settings, and you start from the symptom. Then you run the diagnosis and ask for the draft.",
        },
        {
          kind: "code",
          lang: "text",
          code: `wrote 240 rows with slow_rerank to incident/traces.jsonl
changed at 2026-11-27T09:59:30+00:00  (119 rows before, 121 after)
The rerank stage got much slower.
  The p95 of rerank rose from 155 ms to 1352 ms.
objectives broken: rerank-latency
post-mortem written to incident/postmortem.md`,
          caption: "A real offline run of the capstone's seeder and diagnosis. Only the clock time is changed to the story's.",
        },
        {
          kind: "p",
          text: "The tool found the stage and the objective, and it found the time one row early, as section 3 said. The draft has five headings. Its one action line is generic, so you write three by hand. Restore, detect and prevent are the three things any incident owes.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# POSTMORTEM-REHEARSAL.md

## Summary

The rerank stage got much slower.

## Impact

- rerank-latency: 100.0% before and 0.8% after.

## Timeline

- The bad window began at 2026-11-27T09:59:30+00:00.
- It was last seen at 2026-11-27T10:59:30+00:00.

## Root cause

- The p95 of rerank rose from 155 ms to 1352 ms.

## Actions

- Restore: roll back the rerank change. Confirm the rerank p95 is back near 155 ms.
- Detect: the fast rule would have paged after about 43 minutes. Keep it for the pilot.
- Prevent: add a rerank latency check to the release gate.`,
          caption: "POSTMORTEM-REHEARSAL.md. The first four sections are the tool's draft, and Actions is yours.",
        },
        {
          kind: "p",
          text: "The rehearsal also shows what you did in order. You read the policy name. You ran `askpep slo`, then `askpep incident diagnose`. You would have told the lead, and you would have stopped the harm. You write that order down, with the kill switch from course 3 in the place it belongs.",
        },
        {
          kind: "p",
          text: "The security reviewer asks one question of the draft. If a page comes in while the desk is creating unexpected tickets, what happens first? You point to the stop event in the launch decision from course 3. The runbook sends you to that drill, and it doesn't restate it.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# RUNBOOK-001.md
Service: PEP desk (AskPEP)   Owner: engineering   Date: 27 November 2026

Trigger: a page from ALERT-MAP.md, or a report from the second team's lead.

1. Read the policy name. It names the objective, and the objective names the symptom.
2. Run askpep slo --since 2h. Note which objectives are missed.
3. Run askpep incident diagnose --since 6h.
   If the deploy log has a time, add --at with that time.
4. Stop the harm.
   Roll back the last change.
   For an unexpected ticket, set KILL_SWITCH=actions and follow INCIDENT-DRILL-001.md.
5. Tell the second team's lead within 15 minutes of the page.
6. Open LangSmith only if a trace is needed, under TRACE-SHARING-001.
7. Write the postmortem within two working days.
   Finish the Actions by hand: restore, detect, prevent.
8. If the gate could have held this, add an eval item, with its source.`,
          caption: "RUNBOOK-001.md, whole.",
        },
        {
          kind: "p",
          text: "Read step 4 and step 5 together. Stopping the harm comes before finding the cause, and telling people has a clock on it. Step 8 closes the loop with course 4. A postmortem that adds nothing to the gate leaves the same hole open for next time.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# RUNBOOK-(number).md
Service:   Owner:   Date:

Trigger:

1. Read the alert.
2. Measure the objectives.
3. Find the stage and the time.
4. Stop the harm:
5. Tell:   Within:
6. Extra tools, and the rule that allows them:
7. Postmortem due:
8. Add to the gate if:`,
          caption: "For your next service: the runbook, values left blank.",
        },
        {
          kind: "p",
          text: "The rehearsal had a known answer. What happens when the real one arrives, with the third team waiting? Chapter 8 starts there.",
        },
      ],
    },
  ],
  lab: {
    title: "Find the regression and write it up",
    goal: "Write `stage_shifts`, `change_point`, `diagnose` and `postmortem` in `incident.py`, then add the `incident` commands to `cli.py`. Each stub raises `NotImplementedError(\"llmops-07 step N\")`. The tests build their own rows, so nothing calls an API and nothing needs Postgres. Run everything from your AskPEP workspace root, with the packages that chapter 1 installed. Then compare your files with `capstone/src/askpep/telemetry/incident.py` in the my-learn folder.",
    minutes: 75,
    files: [
      "src/askpep/telemetry/incident.py",
      "src/askpep/cli.py",
      "tests/llmops/test_llmops07_incident.py",
    ],
    steps: [
      {
        title: "Find which stage moved",
        text: "Write `stage_shifts` in `incident.py`. For every stage in either window, work out the p95 before and after, and the mean input tokens before and after. Sort by `added_ms`, largest first, then by stage name. The stub raises `llmops-07 step 1`.",
        code: `# src/askpep/telemetry/incident.py
# The StageShift dataclass, _p95 and _mean_tokens_in ship complete in your stub.
def stage_shifts(before: Sequence[Row], after: Sequence[Row]) -> list[StageShift]:
    """How each stage changed between two windows, the biggest slowdown first."""
    # your turn:
    # 1. old, new = request_rows(before), request_rows(after).
    # 2. A stage is any name in a row's timings, or in row_usage(row), in either window.
    # 3. Build one StageShift for each stage from _p95(old, stage), _p95(new, stage),
    #    _mean_tokens_in(old, stage) and _mean_tokens_in(new, stage).
    # 4. Return them sorted by (-added_ms, stage).
    ...`,
        test: "uv run pytest tests/llmops -k llmops07_s1",
      },
      {
        title: "Find when it moved",
        text: "Write `change_point`. Sort the rows by time, try every cut that leaves 3 rows on each side, and score each cut with the formula from this chapter. Return `None` for fewer than 8 rows, or when the best gap is under 25 percent. The stub raises `llmops-07 step 2`.",
        code: `# src/askpep/telemetry/incident.py
def change_point(rows: Sequence[Row], metric: str = "latency_ms") -> datetime | None:
    """When a metric stepped to a new level: the ts of the first row of the later level."""
    # your turn:
    # 1. points = (ts, float(row[metric])) for the rows that have both, sorted by ts. Under 8 points: None.
    # 2. For each cut i from 3 to n - 3, take both means and score
    #    abs(mean_after - mean_before) * math.sqrt(i * (n - i) / n).
    # 3. Keep the best score. Use a strict greater-than, so a tie keeps the earliest cut.
    # 4. If the best cut's means differ by less than 0.25 * abs(mean_before), return None.
    # 5. Otherwise return the ts of points[best_cut].
    ...`,
        test: "uv run pytest tests/llmops -k llmops07_s2",
      },
      {
        title: "Say what broke",
        text: "Write `diagnose`. List the objectives that were met before and missed after. Then take the first rule that holds: refusals, tokens, latency, none. Change the `slo` import to add `is_success` and `measure`. The stub raises `llmops-07 step 3`.",
        code: `# src/askpep/telemetry/incident.py
# Change the import to: from askpep.telemetry.slo import Slo, is_success, measure
def diagnose(before: Sequence[Row], after: Sequence[Row], slos: Sequence[Slo]) -> Diagnosis:
    """Say what changed between a healthy window and a bad one."""
    # your turn:
    # 1. broken = the name of each slo where measure(slo, before).met and not measure(slo, after).met.
    # 2. bad_before and bad_after = _share(rows, lambda r: not is_success(r)).
    # 3. If bad_after - bad_before >= 0.10: kind "refusals", stage "retrieval". Evidence says both
    #    shares as percentages and the mean number of retrieved_ids in each window.
    # 4. Else for each shift in stage_shifts(before, after): the first with token_ratio >= 1.5 is kind "tokens".
    # 5. Else the first shift, if added_ms >= 100 and p95_after >= 1.5 * p95_before, is kind "latency".
    # 6. Else Diagnosis("none", None, "No stage moved enough to explain the change.", [], broken).
    ...`,
        test: "uv run pytest tests/llmops -k llmops07_s3",
      },
      {
        title: "Write the postmortem draft",
        text: "Write `postmortem`. It returns Markdown with five `##` headings in this order: Summary, Impact, Timeline, Root cause and Actions. Fill them from the diagnosis and the two windows. A person edits the draft afterwards. The stub raises `llmops-07 step 4`.",
        code: `# src/askpep/telemetry/incident.py
def postmortem(diagnosis: Diagnosis, before: Sequence[Row], after: Sequence[Row], slos: Sequence[Slo]) -> str:
    """A draft postmortem in Markdown, with the numbers filled in."""
    # your turn:
    # 1. Impact: for each name in diagnosis.broken_slos, measure the slo on before and on after.
    #    Write "- name: X.X% before and Y.Y% after." from .attainment. For a cost slo, which has none,
    #    write the .value of each instead, rounded to 4 places.
    # 2. Timeline: the first and last ts of after, as ISO strings, in two bullets.
    # 3. Root cause: one bullet for each line of diagnosis.evidence.
    # 4. Actions: one bullet that names diagnosis.kind and, when there is one, diagnosis.stage.
    # 5. Join the lines with newlines. The headings are Summary, Impact, Timeline, Root cause and Actions.
    ...`,
        test: "uv run pytest tests/llmops -k llmops07_s4",
      },
      {
        title: "Add the incident commands",
        text: "Add the `incident` sub-app and its two commands to `cli.py`. `seed` writes the rows and prints a line. `diagnose` reads the file or the `traces` table. It cuts at `--at` or at the change point, then prints the headline, the evidence and the broken objectives.",
        code: `# src/askpep/cli.py
# Beside the other sub-apps at the top of the file, add:
#   incident_app = typer.Typer(no_args_is_help=True, help="Seed a regression in the traces and find it again.")
#   app.add_typer(incident_app, name="incident")


@incident_app.command("seed")
def incident_seed(
    kind: Annotated[str, typer.Option("--kind", help="slow_rerank, token_bloat or empty_retrieval.")],
    count: Annotated[int, typer.Option("--count", help="How many requests to make up.")] = 240,
    out: Annotated[str, typer.Option("--out", help="Default: incident/traces.jsonl.")] = "",
) -> None:
    """Write made-up trace rows with a regression in their second half, for \`incident diagnose\` to find."""
    # your turn:
    # 1. Prices come from load_prices(get_settings().pricing_file). On OSError, use None.
    # 2. rows = incident.seed_rows(kind, count=count, prices=prices).
    # 3. The target is Path(out), or incident.INCIDENT_FILE. Call incident.write_rows(target, rows).
    # 4. On OSError, ValueError or KeyError, print the message to stderr and exit with code 2.
    # 5. Print "wrote {len(rows)} rows with {kind} to {target}".
    ...


@incident_app.command("diagnose")
def incident_diagnose(
    file: Annotated[
        str, typer.Option("--file", help="Rows from \`incident seed\`. Default: the traces table.")
    ] = "",
    since: Annotated[str, typer.Option("--since", help="With no --file, how far back to look.")] = "2h",
    at: Annotated[
        str, typer.Option("--at", help="When it broke, as an ISO time. Default: found in the latency.")
    ] = "",
    slos: Annotated[str, typer.Option("--slos", help="Default: infra/monitoring/slos.json.")] = "",
    postmortem: Annotated[str, typer.Option("--postmortem", help="Also write the post-mortem here.")] = "",
) -> None:
    """Find when the traces changed, name the stage that moved, and say which objectives broke."""
    # your turn:
    # 1. Start with svc = None and call close_eval(svc) in a finally block. Load the objectives with
    #    load_slos. With --file, rows = incident.read_rows(Path(file)). With no file, open the
    #    services. With no pool, say "Pass --file, or set STORE=pg to read the traces table." and
    #    exit with code 1. Otherwise rows = load_rows(svc.pool, parse_since(since)).
    # 2. when = datetime.fromisoformat(at) if --at is set, else incident.change_point(rows).
    #    A time with no timezone gets UTC. On OSError, ValueError or KeyError, exit with code 2.
    # 3. When is None, print "No change found in {len(rows)} rows. The latency looks steady." and return.
    # 4. Split with incident.split_window, then diagnose. Print "changed at {when.isoformat()}  (N rows
    #    before, M after)", then the headline, each evidence line indented, and "objectives broken: ..."
    #    with "none" if empty.
    # 5. With --postmortem, write incident.postmortem(...) to that path and print where it went.
    ...`,
        test: "uv run pytest tests/llmops -k llmops07_s5",
      },
    ],
    verify: "uv run pytest tests/llmops -k llmops07",
  },
  recap: [
    "A seeded regression gives the diagnosis a known answer to practise on.",
    "Compare a healthy window with a bad one, and rank the stages by the p95 they added.",
    "A change point estimates when a metric moved, and a recorded deploy time beats it.",
    "The function `diagnose` checks refusals, then tokens, then latency, so a cause is never hidden by its symptom.",
    "Each regression slips past a different alert, and the cost objective has no alert at all.",
    "Keep the traces table, export spans for every request, and open LangSmith for a window.",
    "`RUNBOOK-001.md` sets the order for a real page: read, measure, diagnose, stop the harm, tell the lead within 15 minutes, and write it up.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In incident investigation I learned that the diagnosis rules check the cause before the symptom. A token bloat is then never blamed on a slow stage. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["llmops-q12", "llmops-q23", "llmops-q24"],
};

export default chapter;
