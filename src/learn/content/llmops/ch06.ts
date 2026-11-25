import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "llmops-06-dashboards-and-alerts",
  course: "llmops",
  number: 6,
  title: "Alert on symptoms the user feels",
  tagline: "Nobody runs a command at three in the morning. One log line for each request feeds the metrics, the objectives, the alerts and the dashboard.",
  minutes: 60,
  objectives: [
    "Say why a page should name a symptom a user feels, and why a dashboard should hold the causes.",
    "Write the `request_done` log line, and say which requests write it and which fields it leaves out.",
    "Build the log-based metrics, with each latency threshold on a bucket edge.",
    "Build an SLO body and a two-window burn-rate policy, and work out when each rule fires and what two rules miss.",
    "Render all 26 monitoring files offline, and list what applying them to a project needs.",
    "Read a request line and say which requests write one.",
    "Say what an SLO resource holds.",
    "Write an alert map that names what stays silent.",
  ],
  sections: [
    {
      id: "s1-symptoms-and-causes",
      title: "A page names a symptom a user feels, and a dashboard holds the causes",
      goal: "What is an alert for, and which five links join a log line to a page?",
      blocks: [
        {
          kind: "p",
          text: "Nobody runs `askpep slo` at three in the morning, so the SLOs have to watch themselves. Chapter 1 gave the desk six of them. They live in `infra/monitoring/slos.json`, and the command checks them only when you run it.",
        },
        {
          kind: "p",
          text: "You will write the files that tell Google Cloud what to count. They also say which SLO to track and when to message a person. You write every file offline.",
        },
        {
          kind: "p",
          text: "One module, `telemetry/monitoring.py`, builds them. Its functions `log_metrics`, `service_slo`, `burn_rate_policy`, `dashboard` and `render` each make one kind of file. Applying them needs a Google Cloud project, so that part is follow-along.",
        },
        {
          kind: "p",
          text: "Start with what an alert is for. A **symptom** is something a person feels: the answer failed, or the answer was slow. A **cause** is something inside the desk: a tool timing out, or the reranker slowing down.",
        },
        {
          kind: "p",
          text: "An alert on a symptom pages a person only when someone is hurt. An alert on a cause pages for things nobody feels. A tool call may time out, and the agent may retry and answer a second late. Nobody felt that, so nobody should wake up for it.",
        },
        {
          kind: "p",
          text: "The rule for this chapter is short. Alert on symptoms, and chart the causes. The SLOs are the symptoms. The causes go on a dashboard that you open once a page arrives.",
        },
        // CHECK: that Cloud Run sends everything a container writes to stderr to Cloud Logging, and that Cloud Monitoring is the service that stores the metrics and sends the alerts. The paragraph takes the first from RAG chapter 11 and was not re-read in the current Google Cloud docs.
        {
          kind: "p",
          text: "Two Google Cloud services do the work. **Cloud Logging** stores the desk's log lines. Cloud Run sends everything the desk writes to stderr there, and chapter 11 of the RAG course named it. **Cloud Monitoring** stores numbers over time, draws charts and sends alerts.",
        },
        {
          kind: "p",
          text: "Five links join a log line to a page. Sections 2 to 6 take them in this order, and section 7 applies the result to a project.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "The desk writes one JSON log line for each request.",
            "Log-based metrics count the lines that match a filter, or read a number inside them.",
            "A service level objective resource tells Monitoring the goal for a metric.",
            "A burn-rate alert policy watches each objective, and pages when the budget is going too fast.",
            "A dashboard charts the causes.",
          ],
        },
        {
          kind: "callout",
          tone: "insight",
          title: "A page asks one question",
          text: "Is a person being hurt, at a rate that will break an SLO? If the answer is no, the signal belongs on the dashboard, or in tomorrow's ticket queue.",
        },
        {
          kind: "quiz",
          id: "llmops06-q1",
          question: "Which of these should page the person on call?",
          options: [
            "A tool call timed out, and the agent retried it.",
            "The reranker's 95th percentile rose from 150 ms to 220 ms, and its limit is 400 ms.",
            "A guard blocked one question.",
            "Failed answers are using up the error budget fast enough to empty it in two days.",
          ],
          answer: 3,
          explain:
            "Only the last names an SLO that will break at the current rate. The other three are causes or single events. They belong on the dashboard, where you look once a page has told you something is wrong.",
        },
        {
          kind: "p",
          text: "The first link is the log line, so the next section starts there.",
        },
      ],
    },
    {
      id: "s2-request-line",
      title: "One JSON log line per request feeds every metric in this chapter",
      goal: "What does the request line hold, and which requests write one?",
      blocks: [
        // CHECK: that Cloud Logging parses one JSON line on stderr into a structured entry, and puts its keys under jsonPayload. Not re-read in the current Cloud Logging docs.
        {
          kind: "p",
          text: "Chapter 12 of the RAG course gave the desk a JSON formatter. Every log call writes one line to stderr, and each extra field becomes a key. Cloud Logging reads such a line as a structured entry. It puts the keys under **`jsonPayload`**, so a filter can read `jsonPayload.route` the way code reads a dictionary.",
        },
        {
          kind: "p",
          text: "Two keys have a fixed meaning. `severity` sets the entry's level, and `message` sets its text. Your formatter writes `level` and `msg` today. Step 1 adds `severity` and `message` beside them, so nothing that reads the old keys breaks.",
        },
        {
          kind: "p",
          text: "A third key, `logging.googleapis.com/trace`, links an entry to a trace. Its value is `projects/<project>/traces/<trace id>`. Cloud Logging uses it to tie the line to its trace, so you can open the trace from the line.",
        },
        {
          kind: "p",
          text: "The desk writes one line for each request, with the message `request_done`. Step 1 makes `Trace.write` emit it when it saves the trace. It also adds a `log` helper to `logs.py`. The helper adds the trace link when it has a project and a trace id. Chapter 3 gave every trace that id.",
        },
        {
          kind: "code",
          lang: "json",
          code: `{
  "ts": "2026-10-22T09:14:03+0000",
  "level": "INFO",
  "logger": "askpep.events",
  "msg": "request_done",
  "severity": "INFO",
  "message": "request_done",
  "route": "ask",
  "status": "ok",
  "success": true,
  "latency_ms": 3842.6,
  "stage_ms": {"embed": 118.4, "dense": 41.2, "sparse": 22.7, "fuse": 1.1, "rerank": 162.9, "generate": 3481.5},
  "tokens_in": 5120,
  "tokens_out": 310,
  "cost_usd": 0.0041,
  "refused": false,
  "stop_reason": "done",
  "guard_blocked": false,
  "thread_id": null,
  "trace_id": "9f3c2a7e5b1d4c68a0e2f7d1b4c93a58",
  "logging.googleapis.com/trace": "projects/my-project/traces/9f3c2a7e5b1d4c68a0e2f7d1b4c93a58"
}`,
          caption:
            "One request_done line, laid out over several rows. The real line is one row. Every figure is made up, and the prices behind cost_usd are placeholders.",
        },
        {
          kind: "p",
          text: "`route` and `status` say what the request was and how it ended. `latency_ms` and `stage_ms` say how long it took, in total and for each stage. `tokens_in`, `tokens_out` and `cost_usd` say what it cost. `refused`, `stop_reason` and `guard_blocked` say why it ended.",
        },
        {
          kind: "p",
          text: "`success` is the answer that `is_success` from chapter 1 gives for this request. A line with `success` false is a failure for the SLOs. `thread_id` is set for a desk run that belongs to a conversation, and it is null for a plain question.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "A log line is not redacted",
          text: "LangSmith runs pass through `redact_run` from chapter 2. A log line does not. So the request line holds ids, numbers and labels, and never the question or the answer. Anyone who can read the project's logs can read every line.",
        },
        {
          kind: "p",
          text: "The `status` field has six values, and the order of the checks matters. An error wins. Then a pause for approval, then a guard block, then a refusal. Anything else is `ok` when the request succeeded, and `stopped` when it did not.",
        },
        {
          kind: "compare",
          caption: "How a request ends, what the line says, and what the SLOs make of it.",
          columns: ["How the request ended", "`status`", "`success`", "What the SLOs count"],
          rows: [
            ["The desk gave an answer", "`ok`", "true", "A success"],
            ["The model declined to answer", "`refused`", "false", "A failure"],
            ["A guard blocked the question or the answer", "`blocked`", "false", "A failure. `refused` stays false."],
            ["A budget stopped the run", "`stopped`", "false", "A failure"],
            ["An exception was raised", "`error`", "false", "A failure, logged at level ERROR"],
            ["The run paused for a person to approve a step", "`awaiting_approval`", "false", "Neither. The run has not finished."],
          ],
        },
        {
          kind: "p",
          text: "A guard block and a budget stop each write an event line of their own. `guard_blocked` carries the route and the trace id. `budget_stop` carries those and the stop reason, one of the five from chapter 6 of the multi-agent course: `step_budget`, `token_budget`, `time_budget`, `loop` or `recursion_limit`. A third event, `tool_error`, already comes from the tools of agents chapter 2.",
        },
        {
          kind: "p",
          text: "Not every trace writes `request_done`. Only the routes a person calls do: `ask`, `search`, `agent`, `cli.ask`, `cli.search`, `mcp.ask` and `mcp.search`. The agent's search tool runs on the route `agent.search`. The desk runs of `eval run`, `eval gate` and `desk compare` use the route `eval`. They are practice, not traffic, so they would skew every number.",
        },
        {
          kind: "p",
          text: "A failing log call must never fail a request. Wrap the call in `try` and `except`, and log `request log failed` with `log.exception`. The trace row is then written either way.",
        },
        {
          kind: "quiz",
          id: "llmops06-q2",
          question: "What does the `request_done` line leave out on purpose, and why?",
          options: [
            "The route, because the metric name already says it.",
            "The question and the answer, because a log line is not redacted and many people can read the logs.",
            "The trace id, because Cloud Trace stores it already.",
            "The cost, because Monitoring works it out later.",
          ],
          answer: 1,
          explain:
            "The line carries the route, the trace id and the cost, because the metrics read them. It carries no question or answer text. Redaction in chapter 2 covers LangSmith, not the log, so text in a log line reaches everyone who can read the logs.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "How an interviewer asks about logging",
          text: "What should you log, measure and trace in a production LLM application? A strong answer sorts the signals. Logs carry ids and one line per request. Metrics carry rates and percentiles. Traces carry the path of one request. Then it names what stays out: raw text, unless it is redacted first.",
        },
        {
          kind: "p",
          text: "Every request now leaves one line. The next link counts those lines.",
        },
      ],
    },
    {
      id: "s3-log-based-metrics",
      title: "Log-based metrics turn log lines into the counters and distributions that the objectives divide",
      goal: "Which nine metrics do you need, and why is each bucket edge where it is?",
      blocks: [
        {
          kind: "p",
          text: "Monitoring can't divide log lines. It divides numbers over time. A **log-based metric** is a rule in Cloud Logging that turns matching lines into such numbers. The rule is a filter, and the metric type is `logging.googleapis.com/user/<name>`.",
        },
        {
          kind: "p",
          text: "There are two kinds. A **counter** adds one for each matching line. A **distribution** reads a number from each matching line and sorts it into a bucket. Counters answer how many. Distributions answer how long, or how much.",
        },
        {
          kind: "p",
          text: "A **distribution bucket** is a range of values with an upper **bound**. Cloud Logging counts how many readings fall in each bucket. From those counts, Monitoring can estimate a percentile, and it can count the readings at or below one bound.",
        },
        // CHECK: that a log-based metric counts only entries received after it is created, and never reads back through old logs. Not re-read in the current Cloud Logging docs.
        {
          kind: "callout",
          tone: "warn",
          title: "A metric counts only what arrives after it exists",
          text: "A log-based metric counts entries received after you create it. It does not read back through old logs. Create the metrics first, and expect empty charts until traffic arrives.",
        },
        {
          kind: "p",
          text: "Every metric starts from the same prefix. It keeps the metric to the Cloud Run service `askpep`, so another service's logs never count. Most metrics add the request filter below.",
        },
        // CHECK: confirm that NOT jsonPayload.stop_reason="awaiting_approval" also matches a line whose stop_reason is null. If it does not, a request with no stop reason would drop out of every count.
        {
          kind: "code",
          lang: "text",
          code: `resource.type="cloud_run_revision"
AND resource.labels.service_name="askpep"
AND jsonPayload.message="request_done"
AND NOT jsonPayload.stop_reason="awaiting_approval"`,
          caption: "The request filter. Three of the five counters and all four distributions use it.",
        },
        {
          kind: "p",
          text: "Five counters carry the rates.",
        },
        {
          kind: "list",
          items: [
            "`askpep_requests` counts every finished request. It is the total that the success and guard-block SLOs divide by.",
            "`askpep_requests_failed` counts those with `success=false`.",
            "`askpep_guard_blocked` counts those with `guard_blocked=true`.",
            "`askpep_budget_stops` counts the `budget_stop` event lines.",
            "`askpep_tool_errors` counts the `tool_error` event lines.",
          ],
        },
        {
          kind: "p",
          text: "Each counter has one **label**, `route`. A label is a key that splits one metric into a series for each value, so you can chart `ask` apart from `agent`. The counter fills it with `EXTRACT(jsonPayload.route)`, which reads the value out of each line.",
        },
        {
          kind: "p",
          text: "Label by route and by nothing else. A label with a new value for every request would make a new series for every request, and no chart can read that.",
        },
        // CHECK: the JSON shape of a log-based metric is best effort and has not been applied to a project. Check the LogMetric reference. Also check whether gcloud logging metrics create accepts a file whose body holds name, since the command takes the name as an argument.
        {
          kind: "code",
          lang: "json",
          code: `{
  "name": "askpep_requests_failed",
  "description": "Requests that gave no answer",
  "filter": "resource.type=\\"cloud_run_revision\\" AND resource.labels.service_name=\\"askpep\\" AND jsonPayload.message=\\"request_done\\" AND NOT jsonPayload.stop_reason=\\"awaiting_approval\\" AND jsonPayload.success=false",
  "metricDescriptor": {
    "metricKind": "DELTA",
    "valueType": "INT64",
    "unit": "1",
    "labels": [{"key": "route", "valueType": "STRING"}]
  },
  "labelExtractors": {"route": "EXTRACT(jsonPayload.route)"}
}`,
          caption: "infra/monitoring/log-metrics/askpep_requests_failed.json, laid out over fewer rows than the file.",
        },
        {
          kind: "p",
          text: "Read it from the top. `filter` selects the lines. `metricDescriptor` says what the metric is. `DELTA` means each point is the change since the last point. INT64 is a whole number, and the unit `\"1\"` is a plain count. `labelExtractors` fills the `route` label.",
        },
        {
          kind: "p",
          text: "Here is the part to predict. Eight illustrative log lines follow, and each one is a line the desk can write. For every line, pick the counters it adds one to. Two of the lines add to none.",
        },
        {
          kind: "widget",
          id: "llmops06-counter-matrix",
          intro: "Pick the counters for each of the eight lines, then check.",
        },
        {
          kind: "p",
          text: "The paused run is the subtle one. A run that waits for a person's approval writes `request_done` with `success` false, but it has not failed. The filter leaves it out, so asking for approval never spends error budget.",
        },
        {
          kind: "p",
          text: "Four distributions measure numbers. Each has a `valueExtractor` that reads the number from a line. `askpep_cost_usd` reads `cost_usd`. Each latency SLO gets one, `askpep_latency_<stage>_ms`, for the stages `total`, `generate` and `rerank`. The total reads `latency_ms`. The other two read `stage_ms.<stage>`.",
        },
        {
          kind: "p",
          text: "Each distribution has a fixed list of bucket bounds. The latency list runs from 50 ms to 60000 ms. `log_metrics` adds the SLO's threshold to it, sorted and with no repeats. The three shipped thresholds, 10000, 7000 and 400 ms, are already on the list. A threshold of 2500 ms would be added.",
        },
        {
          kind: "code",
          lang: "json",
          code: `{
  "name": "askpep_latency_total_ms",
  "description": "Time of the total stage",
  "filter": "resource.type=\\"cloud_run_revision\\" AND resource.labels.service_name=\\"askpep\\" AND jsonPayload.message=\\"request_done\\" AND NOT jsonPayload.stop_reason=\\"awaiting_approval\\"",
  "valueExtractor": "EXTRACT(jsonPayload.latency_ms)",
  "metricDescriptor": {"metricKind": "DELTA", "valueType": "DISTRIBUTION", "unit": "ms"},
  "bucketOptions": {
    "explicitBuckets": {"bounds": [50, 100, 200, 400, 800, 1600, 3200, 5000, 7000, 10000, 20000, 60000]}
  }
}`,
          caption: "infra/monitoring/log-metrics/askpep_latency_total_ms.json. The valueExtractor reads the number from each line.",
        },
        {
          kind: "p",
          text: "The sixth SLO has no metric. Cost per success divides spend by successes, and a log-based metric can't divide. The cost ceiling becomes a red line on the dashboard at 0.02 USD, and `askpep cost` from chapter 4 gives the exact figure.",
        },
        {
          kind: "p",
          text: "Every cost figure in this chapter is a worked example. The prices in `pricing.json` are placeholders. Replace them from the provider pages before you trust a cost figure.",
        },
        // CHECK: confirm that a distributionCut range whose max falls inside a bucket is estimated, and that one on a bucket edge is an exact count, as the quiz explanation says.
        {
          kind: "quiz",
          id: "llmops06-q3",
          question: "`log_metrics` adds each latency threshold to the bucket bounds. Why?",
          options: [
            "Cloud Logging rejects a metric whose bounds lack a number the objective uses.",
            "The percentile chart needs it to draw its red line.",
            "The count of readings under the threshold is then exact, because the threshold is a bucket edge.",
            "It makes the metric cheaper, because there are fewer buckets.",
          ],
          answer: 2,
          explain:
            "A bucket count is exact only at a bucket edge. With the threshold on an edge, the share of requests under it is a plain count. Without that, Monitoring would have to guess inside one bucket.",
        },
        {
          kind: "p",
          text: "The numbers exist in Monitoring. An SLO resource says what they should be.",
        },
      ],
    },
    {
      id: "s4-slo-resources",
      title: "An SLO resource holds the target, and Monitoring does the budget arithmetic",
      goal: "What are the four parts of an SLO body?",
      blocks: [
        {
          kind: "p",
          text: "Chapter 1 kept each SLO in `slos.json`, and `measure` counted good and total rows from the traces. Cloud Monitoring can do that sum itself, if you give it the SLO as a resource. It then keeps the error budget and the burn rate, which the alerts in the next section read.",
        },
        {
          kind: "p",
          text: "A **service** is Monitoring's name for the thing the SLOs are about. `service.json` creates one called `askpep`. Its `custom` body marks it as a service you define yourself. An **SLO resource** sits under a service and holds one SLO.",
        },
        {
          kind: "p",
          text: "The body has four parts. `displayName` names the SLO. `goal` is the target as a share, such as 0.95. `rollingPeriod` is the window in seconds, counted back from now. `serviceLevelIndicator` says how to count good and total.",
        },
        {
          kind: "p",
          text: "A **rolling period** follows the clock, so the oldest minute drops out as a new one arrives. The files use 28 days, which is 2419200 seconds. The error budget is the share of requests the goal lets fail over that period.",
        },
        {
          kind: "p",
          text: "There are two ways to count. A `goodTotalRatio` reads a bad metric and a total metric, and good is total minus bad. A `distributionCut` reads a distribution and counts the readings inside a range. The total is every reading.",
        },
        {
          kind: "compare",
          caption: "The five SLOs that get a resource. Cost per success gets none.",
          columns: ["SLO", "Indicator", "Metrics", "Good means"],
          rows: [
            ["`answer-success`", "`goodTotalRatio`", "`askpep_requests_failed` over `askpep_requests`", "A request that gave an answer"],
            ["`guard-block-rate`", "`goodTotalRatio`", "`askpep_guard_blocked` over `askpep_requests`", "A request no guard blocked"],
            ["`total-latency`", "`distributionCut`", "`askpep_latency_total_ms`, max 10000", "A request done within 10 seconds"],
            ["`generate-latency`", "`distributionCut`", "`askpep_latency_generate_ms`, max 7000", "An answer generated within 7 seconds"],
            ["`rerank-latency`", "`distributionCut`", "`askpep_latency_rerank_ms`, max 400", "A rerank call within 400 ms"],
          ],
        },
        // CHECK: the JSON shape of a service level objective is best effort and has not been applied to a project. Check the ServiceLevelObjective reference, including the rolling period limit (the chapter says whole days up to 30) and the field names under requestBased.
        {
          kind: "code",
          lang: "json",
          code: `{
  "displayName": "answer-success",
  "goal": 0.95,
  "rollingPeriod": "2419200s",
  "serviceLevelIndicator": {
    "requestBased": {
      "goodTotalRatio": {
        "badServiceFilter": "metric.type=\\"logging.googleapis.com/user/askpep_requests_failed\\"",
        "totalServiceFilter": "metric.type=\\"logging.googleapis.com/user/askpep_requests\\""
      }
    }
  }
}`,
          caption: "infra/monitoring/slo/answer-success.json, laid out over fewer rows.",
        },
        {
          kind: "p",
          text: "A latency SLO has the same body with a `distributionCut` in place of the `goodTotalRatio`. Its `range` has only a `max`, so every reading up to the threshold is good.",
        },
        {
          kind: "code",
          lang: "json",
          code: `"distributionCut": {
  "distributionFilter": "metric.type=\\"logging.googleapis.com/user/askpep_latency_total_ms\\"",
  "range": {"max": 10000}
}`,
          caption: "The indicator of total-latency.",
        },
        {
          kind: "p",
          text: "Create each SLO with its `serviceLevelObjectiveId` set to its `displayName`. The alert policies in the next section name an SLO by that path. A different id breaks them.",
        },
        {
          kind: "p",
          text: "`service_slo` raises `ValueError` for the cost SLO. That SLO is a ceiling on money for each success. It is not a share of requests, and no ratio of two counts can express it.",
        },
        {
          kind: "callout",
          tone: "insight",
          title: "slos.json stays the one source",
          text: "Monitoring now holds a copy of each SLO. Change a target in `slos.json`, then run `render` again and apply the new SLO file. If you don't, Monitoring and `askpep slo` will disagree about the same traffic.",
        },
        {
          kind: "quiz",
          id: "llmops06-q4",
          question: "Why does `service_slo` raise `ValueError` for `cost-per-success`?",
          options: [
            "An SLO resource counts good and total events, and a cost SLO is a ceiling on money for each success.",
            "Cost is always zero in the traces, so there is nothing to count.",
            "Monitoring refuses any goal below 0.5.",
            "Monitoring has no unit for money.",
          ],
          answer: 0,
          explain:
            "An SLO resource divides good events by total events. Cost per success divides spend by successes, which is a different shape. So the ceiling lives on the dashboard, and `askpep cost` reports the exact figure.",
        },
        {
          kind: "p",
          text: "Monitoring now keeps the budget. The next link decides when a person hears about it.",
        },
      ],
    },
    {
      id: "s5-burn-rate-alerts",
      title: "A burn-rate alert pages only when the budget is going fast and is still going",
      goal: "When does each rule fire, and what do two rules still miss?",
      blocks: [
        {
          kind: "p",
          text: "The burn rate from chapter 1 says how fast the error budget is going. A burn rate of 2 spends it in half the window.",
        },
        {
          kind: "p",
          text: "The target decides how much failure a burn rate means. A 95% target allows 5% of requests to fail. A burn rate of 14.4 then means 72% failing, because 14.4 times 5% is 72%. A 97% target allows 3%, so the same rate means 43.2% blocked.",
        },
        {
          kind: "p",
          text: "A **burn-rate alert** compares the burn rate over a window with a limit. It uses two windows. The **long window** shows that the budget really is going. The **short window** shows that it is still going.",
        },
        {
          kind: "p",
          text: "The lab ships two rules. A **fast rule** pages at a burn rate above 14.4 over one hour, when the last five minutes agree. A **slow rule** pages above 6 over six hours, when the last thirty minutes agree.",
        },
        // CHECK: the two rates and their windows are the lab's choice, not a confirmed standard. The SRE Workbook chapter on alerting on SLOs is quoted from memory (14.4 over one hour, 6 over six hours, a short window of one twelfth of the long one, for a 30-day window). Confirm those figures. Also confirm the lookback limit of select_slo_burn_rate (24 hours is assumed, and six hours fits under it).
        {
          kind: "compare",
          caption: "The two rules for a 28-day window. The budget figures are worked out here, not read from Monitoring.",
          columns: ["Rule", "Burn rate above", "Long window", "Short window", "Budget spent over the long window", "Budget gone in"],
          rows: [
            ["fast", "14.4", "1 hour", "5 minutes", "2.1%", "1.9 days"],
            ["slow", "6", "6 hours", "30 minutes", "5.4%", "4.7 days"],
          ],
        },
        {
          kind: "p",
          text: "The SRE Workbook, in its chapter on alerting on SLOs, uses the same pair of rates for a 30-day window. A 28-day window spends a slightly bigger share of the budget over the same hours, which is why 2.1% here replaces the Workbook's 2%.",
        },
        {
          kind: "p",
          text: "The short window earns its place after an outage ends. The bad minutes are still inside the last hour, so the one-hour burn rate stays high. After a total outage that lasted an hour or more, more than 72% of the last hour is still failing for about 17 minutes.",
        },
        {
          kind: "p",
          text: "Without the short window, you would be paged for 17 minutes about an outage that is over. With it, the rule goes quiet within five minutes of the fix. The tester below replays six incidents so that you can see both windows move.",
        },
        {
          kind: "widget",
          id: "llmops06-burn-rule-tester",
          intro:
            "Each incident runs against one SLO, with steady traffic that fails 1% of the time. Predict which rule pages, then check the windows.",
        },
        {
          kind: "p",
          text: "An **alert policy** is the Monitoring resource that holds the conditions and the text of a page. The policy below joins two conditions with `combiner` set to `AND`. Each condition calls `select_slo_burn_rate`, a Monitoring function that returns the burn rate of one SLO over one window.",
        },
        {
          kind: "p",
          text: "`COMPARISON_GT` means greater than, and `thresholdValue` is the limit. `duration` is `0s`, so the condition holds as soon as the rate crosses the limit.",
        },
        // CHECK: the JSON shape of an alert policy is best effort and has not been applied to a project. Check the AlertPolicy reference: select_slo_burn_rate as a conditionThreshold filter, a duration of 0s, the AND combiner, and the ${PROJECT_ID} placeholder the files carry.
        {
          kind: "code",
          lang: "json",
          code: `{
  "displayName": "askpep answer-success: fast burn",
  "combiner": "AND",
  "conditions": [
    {
      "displayName": "answer-success burns above 14.4x over the long window",
      "conditionThreshold": {
        "filter": "select_slo_burn_rate(\\"projects/\${PROJECT_ID}/services/askpep/serviceLevelObjectives/answer-success\\", \\"3600s\\")",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 14.4,
        "duration": "0s"
      }
    },
    {
      "displayName": "answer-success burns above 14.4x over the short window",
      "conditionThreshold": {
        "filter": "select_slo_burn_rate(\\"projects/\${PROJECT_ID}/services/askpep/serviceLevelObjectives/answer-success\\", \\"300s\\")",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 14.4,
        "duration": "0s"
      }
    }
  ],
  "documentation": {
    "mimeType": "text/markdown",
    "content": "The error budget of \`answer-success\` is burning at 14.4 times the planned rate over 3600s, and the last 300s agree. Run \`askpep incident diagnose\` to find the stage."
  },
  "userLabels": {"service": "askpep", "slo": "answer-success", "rule": "fast"},
  "notificationChannels": []
}`,
          caption: "infra/monitoring/alerts/answer-success-fast.json, laid out over fewer rows. The file carries ${PROJECT_ID} as a placeholder.",
        },
        {
          kind: "p",
          text: "`documentation` is the text a person reads when the page arrives. It names the SLO, the rate and the window, and it says to run `askpep incident diagnose`. Chapter 7 builds that command. `userLabels` let you filter policies by service, SLO and rule.",
        },
        {
          kind: "p",
          text: "`notificationChannels` is empty on purpose. A **notification channel** is where Monitoring sends a page, such as an email address. Channels belong to a project, and the files can't know yours. Until you attach one, a policy opens an incident and tells nobody.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Two rules leave a gap",
          text: "A steady 8% failure rate is a burn rate of 1.6 on a 95% target. It spends the budget in 17.5 days, and neither rule fires. A third rule that opens a ticket would catch it. The lab ships two, so watch `askpep slo` for slow leaks.",
        },
        {
          kind: "quiz",
          id: "llmops06-q5",
          question: "A target of 99% allows 1% of requests to fail. What failing share is a burn rate of 14.4?",
          options: ["1%", "14.4%", "72%", "99%"],
          answer: 1,
          explain:
            "Burn rate is the failing share divided by the allowed share. At a 99% target the allowed share is 1%, so 14.4 means 14.4% failing. The same rate at a 95% target is 72%, so a looser target pages later.",
        },
        {
          kind: "quiz",
          id: "llmops06-q6",
          question:
            "A total outage lasted two hours and ended ten minutes ago. The one-hour burn rate is still above 14.4. Why does the fast rule stop paging?",
          options: [
            "The long window ignores outages that are over.",
            "Monitoring waits an hour after an outage before it pages again.",
            "The five-minute window is back under the limit, and the rule needs both windows above it.",
            "A total outage is not a symptom a user feels.",
          ],
          answer: 2,
          explain:
            "The policy joins its two conditions with AND. The one-hour window still holds the bad minutes, but the last five minutes are clean. So the second condition is false and the page stops.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "How an interviewer asks about alerts",
          text: "What reliability targets would you define, and how would you alert on them? Say that you page on the burn of the error budget, over two windows. The long one shows the budget is going. The short one shows it still is. Then say what a slow leak does, and who sees it.",
        },
        {
          kind: "p",
          text: "A page says something is wrong. The causes need somewhere to be read.",
        },
      ],
    },
    {
      id: "s6-dashboard-and-render",
      title: "A dashboard holds the causes, and one command writes every file",
      goal: "What does the dashboard show, and which command writes all 26 files?",
      blocks: [
        {
          kind: "p",
          text: "A page says that an SLO is going to break. It doesn't say why. The dashboard does. It charts the counters and distributions from section 3, so you can see which cause moved when the page arrived.",
        },
        {
          kind: "p",
          text: "A dashboard body has a `displayName` and a **mosaic layout**: a grid 24 columns wide. Each **tile** has a position, a width, a height and one chart. Every tile of `dashboard` is 12 columns wide and 4 rows tall, so two sit side by side.",
        },
        {
          kind: "p",
          text: "There are eight tiles. Five come first, and then one for each latency SLO.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Requests per second, with one line for each route.",
            "Failed requests per second.",
            "Guard blocks per second.",
            "Budget stops and tool errors per second, in one chart.",
            "Cost per request at the 95th percentile, with a red line at 0.02 USD.",
            "Tiles 6 to 8, one for each latency SLO: its 95th percentile, with a red line at its threshold.",
          ],
        },
        {
          kind: "p",
          text: "A counter and a distribution need different charts. An **aligner** turns the raw points in each period into one value. A counter is charted as a rate per second, with `ALIGN_RATE`. A distribution is charted as its 95th percentile, the value that 95% of readings stay under, with `ALIGN_PERCENTILE_95`. Both use a period of 60 seconds.",
        },
        {
          kind: "p",
          text: "The first tile also adds up the series that share a route, with `REDUCE_SUM` grouped by `metric.label.route`. That gives one line for each route.",
        },
        // CHECK: the JSON shape of a dashboard is best effort and has not been applied to a project. Check the Dashboard reference: the mosaicLayout tile fields, the xyChart dataSets and the thresholds field.
        {
          kind: "code",
          lang: "json",
          code: `{
  "xPos": 0,
  "yPos": 8,
  "width": 12,
  "height": 4,
  "widget": {
    "title": "Cost per request, 95th percentile (USD)",
    "xyChart": {
      "dataSets": [
        {
          "timeSeriesQuery": {
            "timeSeriesFilter": {
              "filter": "metric.type=\\"logging.googleapis.com/user/askpep_cost_usd\\"",
              "aggregation": {"alignmentPeriod": "60s", "perSeriesAligner": "ALIGN_PERCENTILE_95"}
            }
          },
          "plotType": "LINE"
        }
      ],
      "thresholds": [{"value": 0.02, "color": "RED", "direction": "ABOVE"}]
    }
  }
}`,
          caption: "Tile 5 of infra/monitoring/dashboard.json, laid out over fewer rows. The red line is the cost ceiling.",
        },
        {
          kind: "p",
          text: "The red lines come from `slos.json`: `limit_usd` for the cost tile and `threshold_ms` for each latency tile. Edit the file and render again, and the dashboard follows.",
        },
        {
          kind: "p",
          text: "`render` puts every file in one dict, keyed by its path. The order is `service.json`, then the nine metrics, the five SLO files, the ten alert files and `dashboard.json`. That is 1 + 9 + 5 + 10 + 1, or 26 files. `write_monitoring` writes the dict to disk.",
        },
        {
          kind: "step",
          id: "llmops06-s01",
          title: "Write the monitoring files",
          text: "Do this after lab step 6. The command writes the tree under `infra/monitoring/` from the `slos.json` you already have. It touches no Google Cloud project. Run it again whenever you edit `slos.json`.",
          lang: "bash",
          code: "uv run python -m askpep.telemetry.monitoring",
          expect:
            "One line, `wrote 26 files under infra/monitoring`. The step 6 test that compares a render with these files runs now, where it skipped before.",
        },
        {
          kind: "p",
          text: "All 26 files are written. They do nothing until a project holds them.",
        },
      ],
    },
    {
      id: "s7-apply",
      title: "Applying the files needs a Google Cloud project, so these steps are follow-along",
      goal: "In what order do the files apply, and what do you check first?",
      blocks: [
        {
          kind: "callout",
          tone: "warn",
          title: "These steps need a project, and nobody has applied these files",
          text: "Everything above ran offline. The steps below need a Google Cloud project with billing. The JSON shapes follow the API reference as closely as the lab could, and no one has applied them yet. Run the steps on a test project first.",
        },
        {
          kind: "p",
          text: "Order matters. A metric must exist before an objective can point at it. An objective must exist before an alert can point at it. The dashboard needs only the metrics. The commands read `PROJECT_ID`, which you set in chapter 14 of the RAG course.",
        },
        // CHECK: confirm the two API ids, logging.googleapis.com and monitoring.googleapis.com.
        {
          kind: "step",
          id: "llmops06-s02",
          title: "Turn on the two APIs",
          text: "Cloud Logging and Cloud Monitoring each have an API. Turn both on for your project. The command does nothing harmful if they are already on.",
          lang: "bash",
          code: "gcloud services enable logging.googleapis.com monitoring.googleapis.com",
          expect: "A line that says the operation finished successfully.",
        },
        // CHECK: gcloud logging metrics create takes the metric name as an argument, and each file also holds name. Run it once to see whether the command accepts that. If it refuses, remove name from the body with jq first.
        {
          kind: "step",
          id: "llmops06-s03",
          title: "Create the nine metrics",
          text: "Each file in `log-metrics/` is the body of one metric. The loop names each metric from its file name. A metric counts only entries received after you create it, so create these before the traffic you want to measure.",
          lang: "bash",
          code: `for f in infra/monitoring/log-metrics/*.json; do
  name=$(basename "$f" .json)
  gcloud logging metrics create "$name" --config-from-file="$f"
done`,
          expect: "One line for each of the nine metrics that says it was created.",
        },
        // CHECK: the Service Monitoring REST paths, the serviceId and serviceLevelObjectiveId query parameters, and whether a gcloud command now covers services and SLOs.
        {
          kind: "step",
          id: "llmops06-s04",
          title: "Create the service and the five objectives",
          text: "These calls go to the Service Monitoring API with `curl`. Create the service `askpep` first. Then create each SLO with its id set to its file name, because the alerts name an SLO by that path.",
          lang: "bash",
          code: `TOKEN=$(gcloud auth print-access-token)
API=https://monitoring.googleapis.com/v3/projects/$PROJECT_ID
curl -s -X POST "$API/services?serviceId=askpep" \\
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\
  -d @infra/monitoring/service.json
for f in infra/monitoring/slo/*.json; do
  id=$(basename "$f" .json)
  curl -s -X POST "$API/services/askpep/serviceLevelObjectives?serviceLevelObjectiveId=$id" \\
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\
    -d @"$f"
done`,
          expect:
            "A JSON reply for the service, then one for each objective, with a `name` that ends in `/serviceLevelObjectives/<id>`. An `error` object means the body was refused.",
        },
        // CHECK: the GA command is gcloud monitoring policies create, which the chapter and the capstone monitoring.py docstring both use. Confirm the flag --policy-from-file, and that select_slo_burn_rate is accepted with a duration of 0s.
        {
          kind: "step",
          id: "llmops06-s05",
          title: "Create the ten alert policies",
          text: "The policy files carry the placeholder `${PROJECT_ID}`. The loop swaps in your project id, writes each policy to a temporary file and creates it from there.",
          lang: "bash",
          code: `for f in infra/monitoring/alerts/*.json; do
  tmp=$(mktemp)
  sed "s/\\\${PROJECT_ID}/$PROJECT_ID/g" "$f" > "$tmp"
  gcloud monitoring policies create --policy-from-file="$tmp"
  rm "$tmp"
done`,
          expect: "One line for each of the ten policies that says it was created.",
        },
        // CHECK: confirm that gcloud monitoring dashboards create accepts --validate-only, and what it prints.
        {
          kind: "step",
          id: "llmops06-s06",
          title: "Create the dashboard",
          text: "Check the body first. With `--validate-only`, Monitoring checks the dashboard and creates nothing. Then run the command again without the flag.",
          lang: "bash",
          code: `gcloud monitoring dashboards create --config-from-file=infra/monitoring/dashboard.json --validate-only
gcloud monitoring dashboards create --config-from-file=infra/monitoring/dashboard.json`,
          expect: "The first command reports no error. The second creates the dashboard and prints its name.",
        },
        {
          kind: "p",
          text: "Next, give the policies somewhere to send a page. In the Cloud console, add an email notification channel under Monitoring, then attach it to each policy. Only you can do this step, because the channel is your address.",
        },
        {
          kind: "p",
          text: "Rehearse once. Copy the `answer-success-fast` policy, and set both `thresholdValue` fields to 0.1. Send a few questions the desk refuses. The copy should page once the metrics catch up, and the real policies stay quiet. Delete the copy afterwards.",
        },
        {
          kind: "p",
          text: "Applying from CI needs the pipeline to sign in to Google Cloud without a key file. That is Workload Identity Federation. The cloud course, course 7, covers it, and it puts these same files under Terraform. Until then, apply by hand from your own machine.",
        },
        {
          kind: "p",
          text: "The files can go live now. Before they do, the team needs to know what they will and won't do.",
        },
      ],
    },
    {
      id: "s8-alert-map",
      title: "Two rules cover a fast outage, and a daily job covers the slow leak",
      goal: "What pages, who hears it, and what stays silent?",
      blocks: [
        {
          kind: "p",
          text: "The rules cover a fast outage, and a daily command covers the rest. An alert set needs one page that says what pages, who hears it and what stays silent. This chapter's page is the alert map.",
        },
        {
          kind: "p",
          text: "You apply the files at eight o'clock on Thursday evening. A log-based metric counts only from the moment it exists, so this means every row of Friday counts. The authors of this course have not applied these files to a project. The story assumes they were, and any page in chapters 7 or 8 is part of the story.",
        },
        {
          kind: "p",
          text: "Take the pilot's traffic first. It carries 25 requests an hour. So the fast rule's one-hour window holds about 25 requests, and 72% of those is 18 failures. Its five-minute window holds about two requests, so one or two requests decide it. The rule still works, but it is coarse.",
        },
        {
          kind: "p",
          text: "The security reviewer asks who gets a page at night. Nobody does. The pilot runs from nine to six on working days, and the second team isn't using it after hours. So the channel is email and the team chat, for engineering, in those hours.",
        },
        {
          kind: "p",
          text: "Then you check the map against the readings you already have. Tuesday's burn rate on `answer-success` was 1.6, which is the steady 8% leak. Neither rule fires at 1.6. The budget would last 28 divided by 1.6, or 17.5 days, and nothing would ever page.",
        },
        {
          kind: "p",
          text: "Cost has a gap too, because a cost objective has no burn-rate rule. So you add a daily job for each. At nine each morning `askpep slo --since 1d` runs, and an exit of 1 keeps one standing ticket open, owned by the product owner. `askpep cost` runs beside it, and opens a ticket above two cents.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# ALERT-MAP.md
Date: 26 November 2026   Applied: 20:00   Files: 26, from python -m askpep.telemetry.monitoring
Hours: 09:00 to 18:00, working days. Channel: email and team chat, to engineering.
Nights and weekends: nobody is paged.

## What pages
SLO               Fast rule         Slow rule        First thing to read
answer-success    14.4, 1 h, 5 min  6, 6 h, 30 min   failure share tile, retrieved chunks
total-latency     14.4, 1 h, 5 min  6, 6 h, 30 min   stage p95 tiles
generate-latency  14.4, 1 h, 5 min  6, 6 h, 30 min   generate p95 tile, input tokens
rerank-latency    14.4, 1 h, 5 min  6, 6 h, 30 min   rerank p95 tile
guard-block-rate  14.4, 1 h, 5 min  6, 6 h, 30 min   guard block tile

## What makes a ticket
Daily 09:00  askpep slo --since 1d   exit 1 keeps one standing ticket open. Owner: product owner.
Daily 09:00  askpep cost --since 1d  above 0.02 opens a ticket. Owner: product owner.

## What stays silent
A leak below burn 6 pages nobody. Tuesday's leak was burn 1.6, 17.5 days to empty.
At 25 requests an hour, the 5-minute window holds about 2 requests.

## Runbook
None yet.`,
          caption: "ALERT-MAP.md, whole.",
        },
        {
          kind: "p",
          text: "Read the section called what stays silent. Most alert maps list only what fires. This one admits that a pilot this small can leak for weeks without a page. It gives that gap a daily job and an owner. The last line says the page has nothing to send you to.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# ALERT-MAP.md
Date:   Applied:   Files:
Hours:   Channel:
Nights and weekends:

## What pages
SLO   Fast rule   Slow rule   First thing to read

## What makes a ticket

## What stays silent

## Runbook`,
          caption: "For your next alert set: the map, values left blank.",
        },
        {
          kind: "p",
          text: "A page names a symptom. What do you do when it arrives? Chapter 7 starts there.",
        },
      ],
    },
  ],
  lab: {
    title: "Write the monitoring files for AskPEP",
    goal: "Add the request log line to your own files. Then write the five functions that build the metrics, the SLO bodies, the burn-rate policies, the dashboard and the full file set. Run the tests from your AskPEP workspace root, with the packages that chapter 1 installed. Steps 2 to 6 start from a stub that raises `NotImplementedError(\"llmops-06 step N\")`. Step 1 fails with the same label until you edit your files. No test needs Postgres or a Google Cloud project. Then compare your files with `capstone/src/askpep/telemetry/monitoring.py` in the my-learn folder.",
    minutes: 80,
    files: [
      "src/askpep/logs.py",
      "src/askpep/tracing.py",
      "src/askpep/telemetry/monitoring.py",
      "tests/llmops/test_llmops06_dashboards.py",
    ],
    steps: [
      {
        title: "Write one log line for each request",
        text: "Edit your own `logs.py` and `tracing.py`. `log` writes a JSON event, and the formatter gains `severity` and `message`. `Trace.write` emits `request_done` and the two event lines. `guards/flow.py` needs no change, because both block paths already write the trace. The tests raise `llmops-06 step 1` until you finish.",
        code: `# src/askpep/logs.py
# Add EVENTS = logging.getLogger("askpep.events") and EVENT_LEVELS, which maps tool_error and
# budget_stop to logging.WARNING. Every other event logs at INFO.
# In JsonFormatter.format, add "severity" (the level name) and "message" (the text) to the entry,
# beside "level" and "msg".


def log(
    event: str, *, trace_id: str | None = None, project: str = "", level: int | None = None, **fields
) -> None:
    """Write one structured event, such as request_done, as a JSON line. Pass no personal data."""
    # your turn:
    # 1. extra = dict(fields).
    # 2. With a trace_id, add it to extra. With a project as well, add the key
    #    logging.googleapis.com/trace, set to projects/<project>/traces/<trace_id>.
    # 3. Log it on EVENTS with event as the message. Use level when it is given,
    #    else EVENT_LEVELS.get(event, logging.INFO), and pass extra=extra.
    ...


# src/askpep/tracing.py. No def lines are shown, because you edit methods you already have.
# 1. BUDGET_STOPS = frozenset({"step_budget", "token_budget", "time_budget", "loop", "recursion_limit"}).
#    Import: from askpep.logs import log as emit, and from askpep.telemetry.records import REQUEST_ROUTES.
# 2. Trace gets a property guard_blocked, true when stop_reason is "guard_blocked", and a property status:
#    error, then awaiting_approval, then blocked, then refused, then "ok" when success is true, else "stopped".
# 3. Trace gets a method _emit(self, svc). The project is svc.settings.google_cloud_project.
#    For a route in REQUEST_ROUTES, emit request_done with route, status, success, latency_ms, stage_ms (the
#    timings), tokens_in and tokens_out (0 when None), cost_usd, refused, stop_reason, guard_blocked, thread_id,
#    trace_id and project. Use level logging.ERROR when error is set.
#    When guard_blocked is true, emit guard_blocked with route and trace_id.
#    When stop_reason is in BUDGET_STOPS, emit budget_stop with route, stop_reason and trace_id.
# 4. In write, call self._emit(svc) inside try and except, and log log.exception("request log failed").
#    A failing log must never stop the traces row being written.`,
        test: "uv run pytest tests/llmops -k llmops06_s1",
      },
      {
        title: "Write the log-based metrics",
        text: "Write `log_metrics` in `monitoring.py`. It returns the nine metric bodies in a fixed order. Five are counters with a `route` label. Four are distributions with bucket bounds. Each latency threshold joins the bounds. The stub raises `llmops-06 step 2`.",
        code: `# src/askpep/telemetry/monitoring.py
# CHECK: the JSON shape of this resource is best effort and has not been applied to a project. Check it
# against the Cloud Monitoring API reference before you apply it.
def log_metrics(slos: list[Slo], service: str = "askpep") -> list[dict]:
    """The log-based metrics, as the bodies of projects.metrics.create, in this order."""
    # your turn:
    # 1. base = _base(service). It ships complete: resource.type="cloud_run_revision" AND
    #    resource.labels.service_name="<service>".
    # 2. request = base AND the message request_done AND NOT the stop reason awaiting_approval.
    # 3. Five counters, each with metricKind DELTA, valueType INT64, unit "1", and a route label read with
    #    EXTRACT(jsonPayload.route), declared in labelExtractors and in the descriptor's labels:
    #    askpep_requests (request), askpep_requests_failed (request AND success=false),
    #    askpep_guard_blocked (request AND guard_blocked=true), askpep_budget_stops (base AND the message
    #    budget_stop) and askpep_tool_errors (base AND the message tool_error).
    # 4. askpep_cost_usd: request filter, valueExtractor EXTRACT(jsonPayload.cost_usd), unit "USD", COST_BOUNDS.
    # 5. For each latency SLO, in file order, askpep_latency_<stage>_ms: the request filter, unit "ms", and
    #    bounds = sorted BOUNDS plus threshold_ms with no repeats. The extractor is
    #    EXTRACT(jsonPayload.latency_ms) for the stage total, else EXTRACT(jsonPayload.stage_ms.<stage>).
    # 6. Give every body a name and a one-line description.
    ...`,
        test: "uv run pytest tests/llmops -k llmops06_s2",
      },
      {
        title: "Write the SLO body",
        text: "Write `service_slo` in `monitoring.py`. It builds the body of one SLO: the name, the goal, the window in seconds and the indicator. Success and guard-block SLOs use `goodTotalRatio`. Latency SLOs use `distributionCut`. The cost SLO raises `ValueError`. The stub raises `llmops-06 step 3`.",
        code: `# src/askpep/telemetry/monitoring.py
# CHECK: the JSON shape of this resource is best effort and has not been applied to a project. Check it
# against the Cloud Monitoring API reference before you apply it.
def service_slo(slo: Slo, service: str = "askpep") -> dict:
    """The body of services.serviceLevelObjectives.create for one ratio SLO. The cost kind raises ValueError."""
    # your turn:
    # 1. For the cost kind, raise ValueError(f"{slo.name!r} is a cost SLO, and has no SLO resource").
    # 2. Write a small helper for the filter metric.type="<metric_type(name)>". metric_type and _latency_name
    #    ship complete.
    # 3. latency: distributionCut with distributionFilter for _latency_name(slo) and range {"max": threshold_ms}.
    # 4. success: goodTotalRatio, with askpep_requests_failed as the bad metric and askpep_requests as the total.
    #    guard_block: the same, with askpep_guard_blocked as the bad metric.
    # 5. Return displayName (the SLO's name), goal (its target), rollingPeriod (window_days times 86400, as
    #    "<n>s") and serviceLevelIndicator.requestBased.
    ...`,
        test: "uv run pytest tests/llmops -k llmops06_s3",
      },
      {
        title: "Write the burn-rate policy",
        text: "Write `burn_rate_policy` in `monitoring.py`. It builds the alert policy for one SLO and one `BurnRule`. Two conditions join with `AND`, one for the long window and one for the short. The cost kind raises `ValueError`. The stub raises `llmops-06 step 4`.",
        code: `# src/askpep/telemetry/monitoring.py
# CHECK: the JSON shape of this resource is best effort and has not been applied to a project. Check it
# against the Cloud Monitoring API reference before you apply it.
def burn_rate_policy(slo: Slo, rule: BurnRule, service: str = "askpep") -> dict:
    """The body of alertPolicies.create that pages when slo burns too fast under rule."""
    # your turn:
    # 1. For the cost kind, raise ValueError(f"{slo.name!r} is a cost SLO, and has no burn rate").
    # 2. path = projects/\${PROJECT_ID}/services/<service>/serviceLevelObjectives/<slo name>. Use the PROJECT
    #    constant for the placeholder.
    # 3. Two conditionThreshold conditions. Each filter is select_slo_burn_rate("<path>", "<window>"). Use
    #    COMPARISON_GT, thresholdValue = rule.rate and duration "0s". The first uses rule.long, the second rule.short.
    # 4. displayName "<service> <slo name>: <rule name> burn", combiner "AND", documentation (mimeType
    #    text/markdown, content naming the SLO, the rate and the window, and saying to run askpep incident
    #    diagnose), userLabels (service, slo in lower case with - for _, rule) and an empty notificationChannels.
    ...`,
        test: "uv run pytest tests/llmops -k llmops06_s4",
      },
      {
        title: "Write the dashboard",
        text: "Write `dashboard` in `monitoring.py`. It returns one `mosaicLayout` of chart tiles, each 12 wide and 4 tall. Counters chart as a rate. Distributions chart as the 95th percentile. The cost tile and each latency tile carry a red threshold line. The stub raises `llmops-06 step 5`.",
        code: `# src/askpep/telemetry/monitoring.py
# CHECK: the JSON shape of this resource is best effort and has not been applied to a project. Check it
# against the Cloud Monitoring API reference before you apply it.
def dashboard(slos: list[Slo], service: str = "askpep") -> dict:
    """The body of dashboards.create: one mosaicLayout of xyChart tiles on a 24-column grid."""
    # your turn: build the tiles in this order, then wrap them as the layout.
    # 1. Requests per second (askpep_requests, ALIGN_RATE, grouped by metric.label.route with REDUCE_SUM).
    # 2. Failed requests per second. 3. Guard blocks per second.
    # 4. Budget stops and tool errors in one chart, both ALIGN_RATE.
    # 5. Cost per request (askpep_cost_usd, ALIGN_PERCENTILE_95), with a RED ABOVE threshold at limit_usd
    #    when the SLOs hold a cost SLO.
    # 6. One 95th-percentile tile for each latency SLO, in file order, with a threshold at threshold_ms.
    # Each tile is width 12 and height 4. xPos is 12 * (index % 2) and yPos is 4 * (index // 2).
    # Each chart has dataSets[].timeSeriesQuery.timeSeriesFilter.filter, set to metric.type="<metric type>",
    # with an aggregation of alignmentPeriod "60s" and the aligner. The displayName is "<service> overview".
    ...`,
        test: "uv run pytest tests/llmops -k llmops06_s5",
      },
      {
        title: "Render every file",
        text: "Write `render` in `monitoring.py`. It returns a dict from each file's path to its JSON body. The order is fixed: the service, the metrics, the SLOs, the alerts and the dashboard. `BURN_RULES` and `write_monitoring` ship complete. The stub raises `llmops-06 step 6`.",
        code: `# src/askpep/telemetry/monitoring.py
def render(slos: list[Slo], service: str = "askpep") -> dict[str, dict]:
    """Every file, as a dict from its path under the monitoring folder to its JSON body."""
    # your turn, in this order:
    # 1. "service.json": {"displayName": service, "custom": {}}.
    # 2. "log-metrics/<name>.json" for each body of log_metrics.
    # 3. "slo/<slo name>.json" for each SLO that is not a cost SLO.
    # 4. "alerts/<slo name>-<rule name>.json" for each of those SLOs and each rule in BURN_RULES.
    # 5. "dashboard.json".
    ...`,
        test: "uv run pytest tests/llmops -k llmops06_s6",
      },
    ],
    verify: "uv run pytest tests/llmops -k llmops06",
  },
  recap: [
    "Page on a symptom a user feels, and chart the causes on a dashboard that you open after the page.",
    "One `request_done` line for each request holds the route, the status, the times, the cost and the stop reason. It never holds the question or the answer.",
    "Counters count matching lines, and distributions read a number from each line. Each latency threshold sits on a bucket edge.",
    "An SLO resource holds a goal, a rolling window and two metrics or one distribution cut, and Monitoring keeps the budget.",
    "A burn-rate alert needs a long window to show the budget is going and a short window to show it still is. The rates are the lab's choice, and two rules miss a steady 8% leak.",
    "`render` writes all 26 files offline, and applying them needs a project, a notification channel and a test run.",
    "`ALERT-MAP.md` lists the pages for working hours and gives the 1.6 burn leak and cost a daily job with an owner.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In dashboards and alerts I learned to page on a symptom and to chart the causes. One log line for each request feeds the metrics, the objectives and the alerts. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["llmops-q22"],
};

export default chapter;
