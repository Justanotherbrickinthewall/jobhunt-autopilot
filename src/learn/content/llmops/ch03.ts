import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "llmops-03-opentelemetry-and-cloud-trace",
  course: "llmops",
  number: 3,
  title: "Instrument once with OpenTelemetry and export anywhere",
  tagline: "One answer took 38 seconds, and LangSmith can't say why. Open spans through one interface, and let a setting decide where they go.",
  minutes: 60,
  objectives: [
    "Say what a span, a trace and an exporter are, and why the code that opens spans never names a vendor.",
    "Read the span tree of an AskPEP request, and say why every span is handed its parent.",
    "Name the GenAI attributes AskPEP sets, and sort what may go on a span from what may not.",
    "Choose an exporter, and say why one desk question shows as two traces today.",
    "Say what would make you move from Cloud Trace to Langfuse, Arize Phoenix or Datadog.",
    "Say how a callback handler turns desk calls into spans.",
    "Read one slow request and write down what it does and doesn't show.",
    "Name what each exporter needs.",
  ],
  sections: [
    {
      id: "s1-emit-once",
      title: "Spans are emitted through one interface, and a setting picks where they go",
      goal: "What are a span, a trace and an exporter, and why does AskPEP's code name no vendor?",
      blocks: [
        {
          kind: "p",
          text: "A timed tree of spans shows where the 38 seconds went. The `traces` table holds one row for each request, and LangSmith shows what the model read. Neither shows the order of the steps or the time each one took. This chapter adds that third view.",
        },
        {
          kind: "p",
          text: "**OpenTelemetry**, or OTel, is an open standard for emitting traces. A **span** is one timed step, such as an embedding call. It has a name, a start time, an end time and **attributes**. An attribute is a key with a value, such as a token count.",
        },
        {
          kind: "p",
          text: "A **trace** is the tree of spans that one request made. Every span in it shares one **trace id**. The span at the top is the **root span**, and AskPEP names it `askpep.request`. Each stage of the request opens a child span under it.",
        },
        {
          kind: "p",
          text: "An **exporter** sends finished spans to a backend, which is a service that stores and shows them. The code that opens spans never names the backend. It calls a `Tracer`, a small interface for opening spans. A setting decides which exporter sits behind it. Moving to another backend means a new exporter and no other change.",
        },
        // CHECK: every Cloud Trace claim here was read at https://docs.cloud.google.com/trace/docs/overview on 22 October 2026.
        // The page says Cloud Trace records request latency across Google Cloud services and instrumented applications,
        // and that Trace Explorer shows a latency heatmap and lets you examine individual traces in detail.
        // It does not say that a trace is drawn as a waterfall, so this chapter does not say so either.
        {
          kind: "p",
          text: "**Cloud Trace** is Google Cloud's service for request latency. It takes spans from Google Cloud services and from your own instrumented applications. Its Trace Explorer lets you open one trace in detail and see its spans.",
        },
        {
          kind: "callout",
          tone: "insight",
          title: "LangSmith and Cloud Trace answer different questions",
          text: "LangSmith shows what the model saw and said, masked first. A span in Cloud Trace never holds the question, a prompt or an answer. It holds names, sizes, times and outcomes. Use LangSmith to read one bad answer, and Cloud Trace to find the slow step. The `traces` table stays the local record.",
        },
        {
          kind: "quiz",
          id: "llmops03-q1",
          question: "You move AskPEP's spans from Cloud Trace to another backend that takes OpenTelemetry. What changes?",
          options: [
            "Every place in the code that opens a span.",
            "The exporter that sits behind the tracer.",
            "The `traces` table, which would hold the spans.",
            "The names of the span attributes.",
          ],
          answer: 1,
          explain: "The code opens spans through one interface, and only the exporter knows the backend. The attribute names come from the conventions, and the `traces` table stays the local record.",
        },
        {
          kind: "p",
          text: "The next section looks at the tree one request makes.",
        },
      ],
    },
    {
      id: "s2-span-tree",
      title: "A request is a tree of spans, and each span is handed its parent",
      goal: "What does the span tree of a request look like, and why is every span given its parent?",
      blocks: [
        {
          kind: "p",
          text: "An `ask` request makes one root span and one child span for each stage. The stages are `embed`, `dense`, `sparse`, `fuse`, `rerank` and `generate`. The `rerank` stage runs only when a reranker is set. A child is named `askpep.` followed by its stage.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "The spans of one `ask` request. An indent shows a child under its parent.",
          code: `askpep.request           askpep.route, such as ask
  askpep.embed
  askpep.dense
  askpep.sparse
  askpep.fuse
  askpep.rerank          only when a reranker is set
  askpep.generate        model, input tokens and output tokens`,
        },
        {
          kind: "p",
          text: "AskPEP's own attributes start with `askpep.`. The root span gets `askpep.route`, and `askpep.thread_id` when the request has a thread. When the request ends, the root also gets `askpep.success`, `askpep.refused` and, if one is set, `askpep.stop_reason`. Chapter 4 adds `askpep.cost_usd`.",
        },
        {
          kind: "p",
          text: "The LangSmith run `askpep.retrieve` from chapter 2 is a different thing. The `@traced` decorator makes it. It is a LangSmith run, so it does not appear in this tree.",
        },
        {
          kind: "p",
          text: "Every span is handed its parent as an argument. OpenTelemetry can also keep a current span in a context variable, and most examples use it. AskPEP does not. The `ask_stream` generator yields from inside the `generate` stage. A web server may resume it on another thread, and the current span there is the wrong one.",
        },
        {
          kind: "p",
          text: "`tracing.py` holds the two interfaces. A `Span` has `set_attribute` and `set_error`. A `Tracer` has one method, `span`, which returns a context manager that yields a `Span`. `NoopTracer` is the default, and its spans do nothing.",
        },
        {
          kind: "p",
          text: "`Trace` is the object that already times each request. It now opens the root span when it is made. Its `stage` method opens a child span and still fills `timings`. If the tracer fails, `Trace` logs it and carries on, because tracing must never break a request.",
        },
        {
          kind: "p",
          text: "Tests need a tracer that remembers what it was asked. `RecordingTracer` is that fake. It keeps every span in a list, in the order they opened, with each span's parent, trace id, attributes and error. You write it in lab step 1.",
        },
        {
          kind: "quiz",
          id: "llmops03-q2",
          question: "`ask_stream` yields from inside the `generate` stage. Why does AskPEP hand each span its parent instead of reading the current span?",
          options: [
            "A context variable is too slow for a request.",
            "OpenTelemetry has no way to find the current span.",
            "A web server may resume the generator on another thread, where the current span is the wrong one.",
            "The parent is needed to work out how long the span took.",
          ],
          answer: 2,
          explain: "A context variable belongs to whoever is running the code. A generator that resumes elsewhere sees that caller's current span. A parent that was passed in cannot be wrong.",
        },
        {
          kind: "p",
          text: "The tree has a shape. The next question is what each span may carry.",
        },
      ],
    },
    {
      id: "s3-genai-spans",
      title: "A model-call span holds sizes and names, never text",
      goal: "Which attributes does a model-call span carry, and what must never go on one?",
      blocks: [
        {
          kind: "p",
          text: "OpenTelemetry publishes **semantic conventions**, which are agreed names for attributes. The **GenAI conventions** cover model calls. A backend that knows these names can show tokens and models with no custom code.",
        },
        {
          kind: "p",
          text: "AskPEP keeps the names in one constant, `GENAI_ATTRS`, in `telemetry/otel.py`. The table lists its seven keys and says when AskPEP sets each one. The desk sets the last two, and the next section covers that.",
        },
        // CHECK: these names were read at open-telemetry/semantic-conventions-genai, commit 547934a, on 18 October 2026.
        // The GenAI conventions have Development status and no release or tag, so the names can change.
        // `gen_ai.usage.output_tokens` is not confirmed. `gen_ai.provider.name` is in the constant but no code sets it.
        // Re-check every name against the current conventions before you rely on a backend that reads them.
        {
          kind: "compare",
          caption: "The GenAI attribute names in `GENAI_ATTRS`, read at commit 547934a of the conventions repository on 18 October 2026.",
          columns: ["Key in GENAI_ATTRS", "Attribute name", "When AskPEP sets it"],
          rows: [
            ["operation", "`gen_ai.operation.name`", "On every model call, with the value `chat`. A desk tool call uses `execute_tool`, which the next section explains."],
            ["provider", "`gen_ai.provider.name`", "Never. The constant has it, and no code sets it."],
            ["model", "`gen_ai.request.model`", "On a model call. It is the model name from your settings."],
            ["input_tokens", "`gen_ai.usage.input_tokens`", "On a model call. It is a count."],
            ["output_tokens", "`gen_ai.usage.output_tokens`", "On a model call. It is a count, and this name is not confirmed."],
            ["agent", "`gen_ai.agent.name`", "On a desk model call, with the name of the agent."],
            ["tool", "`gen_ai.tool.name`", "On a desk tool call, with the name of the tool."],
          ],
        },
        {
          kind: "callout",
          tone: "warn",
          title: "The attribute names can change",
          text: "The GenAI conventions have Development status and no release. AskPEP read the names at commit `547934a` on 18 October 2026, and one of them, `gen_ai.usage.output_tokens`, was not confirmed. That is why every name lives in one constant. When the conventions move, one place changes.",
        },
        {
          kind: "p",
          text: "A span can leave your process for a store that other people read. So a span holds sizes, names, counts and outcomes. It never holds the question, a prompt, an answer or the arguments of a tool call, such as a call to the desk's `search_peps` tool. AskPEP never sets an attribute called `askpep.query`.",
        },
        {
          kind: "p",
          text: "A second layer covers text that the code builds, such as an exception message. A failed span keeps that message as its status message, and its `error.type` attribute holds the class name, such as `TimeoutError`. While `TRACE_REDACT` is on, which is the default from chapter 2, every text value goes through `redact_pii`, the masking function from the guardrails course, first.",
        },
        {
          kind: "widget",
          id: "llmops03-span-attributes",
          intro: "Sort eight possible attributes into three bins. For each one, decide whether AskPEP keeps it as it is, masks it first, or never puts it on a span.",
        },
        {
          kind: "quiz",
          id: "llmops03-q3",
          question: "A teammate adds `span.set_attribute(\"askpep.query\", question)` to help with debugging. What is wrong with it?",
          options: [
            "The name is too long for an attribute.",
            "A span can hold only numbers.",
            "Nothing is wrong, because `TRACE_REDACT` masks every question.",
            "The question can hold personal data, and a span leaves the process for a store that other people read.",
          ],
          answer: 3,
          explain: "Masking is the second layer, and it only catches the patterns it knows. The first layer is to never set the text. The `traces` table already keeps the question locally.",
        },
        {
          kind: "p",
          text: "That covers the stages AskPEP times itself. The desk's model calls happen inside LangGraph, so they need another route.",
        },
      ],
    },
    {
      id: "s4-desk-spans",
      title: "A callback handler turns each desk model call and tool call into a span",
      goal: "How do the desk's model calls and tool calls become spans?",
      blocks: [
        {
          kind: "p",
          text: "The desk runs on LangGraph, which makes its model calls and tool calls inside its own code. You can't wrap them in `with trace.stage(...)`. LangChain offers **callbacks** for this. A **callback handler** is an object whose methods LangChain calls when a model call or tool call starts, ends or fails.",
        },
        {
          kind: "p",
          text: "`SpanCallbackHandler` is that object for AskPEP. It opens a span named `chat <model>` for each model call, with the model's name in place of the angle brackets. It opens `execute_tool <name>` for each tool call, such as `execute_tool search_peps`. Both sit under the request's root span.",
        },
        {
          kind: "p",
          text: "A model-call span carries the operation, the model, the agent that made the call and the token counts. When the call ends, the handler calls `add_usage` on the trace. That counts the call against the agent and adds its tokens to the request's totals. Several calls can end at once on different threads, so `add_usage` takes a lock.",
        },
        {
          kind: "p",
          text: "The handler also adds each agent's model time to `timings` under its name, and each tool's under `tool.<name>`.",
        },
        {
          kind: "p",
          text: "A tool span carries the operation and the tool's name. It never records the arguments, because they hold the user's words. A tool that returns an error ends its span in error. A pause for human approval is a `GraphBubbleUp` in LangGraph. It is not a failure, so that span ends with no error.",
        },
        {
          kind: "p",
          text: "LangChain logs and swallows an exception that a handler raises. So a bug in the handler can't break a desk run, and it also fails quietly. That is why the lab tests call the handler's methods directly.",
        },
        {
          kind: "p",
          text: "Spans now exist for every step. A setting decides where they go.",
        },
      ],
    },
    {
      id: "s5-exporters",
      title: "One setting picks where the spans go",
      goal: "Which exporter do you choose, and what does each one need?",
      blocks: [
        {
          kind: "p",
          text: "The setting is `OTEL_EXPORTER`, and it takes `none`, `console` or `gcp`. The function `configure_otel` reads it and returns the tracer. With `none`, which is the default, it returns the `NoopTracer`, and no span is opened at all.",
        },
        {
          kind: "compare",
          caption: "The three values of `OTEL_EXPORTER`.",
          columns: ["Value", "Where the spans go", "What it needs", "Use it for"],
          rows: [
            ["`none`", "Nowhere. The tracer opens no spans.", "Nothing.", "The default, and every test."],
            ["`console`", "Stderr, as a block of JSON for each span.", "Nothing.", "Seeing spans on your own machine."],
            ["`gcp`", "Cloud Trace.", "`GOOGLE_CLOUD_PROJECT`, credentials and the Cloud Trace Agent role.", "A deployed service."],
          ],
        },
        {
          kind: "p",
          text: "The console exporter writes to stderr. The AskPEP MCP server talks over stdout, so spans on stdout would corrupt its messages. Stderr keeps stdout clean.",
        },
        // CHECK: the SDK flushes a batch processor at exit because TracerProvider is built with shutdown_on_exit=True,
        // its default. Read in opentelemetry-sdk 1.45.1, the version FACTS.md pins, on 22 October 2026.
        {
          kind: "p",
          text: "A **batch processor** collects finished spans and sends them in groups on a timer, which keeps the request fast. The SDK flushes the batch when the process exits, and `flush` on the tracer does it on demand. A **simple processor** sends each span as it ends. A test passes its own exporter and gets a simple processor.",
        },
        // CHECK: the role was read at https://docs.cloud.google.com/trace/docs/iam on 22 October 2026.
        // Cloud Trace Agent is `roles/cloudtrace.agent`, for service accounts, with the permissions
        // `cloudtrace.traces.patch` and `telemetry.traces.write`. The overview page does not name a role.
        // Application Default Credentials is Google's standard way to find credentials. It was read on the OTLP
        // migration guide at https://github.com/GoogleCloudPlatform/opentelemetry-operations-python/blob/main/MIGRATION.md.
        {
          kind: "p",
          text: "To use `gcp`, set `GOOGLE_CLOUD_PROJECT` and give the process credentials. Its identity needs the Cloud Trace Agent role, `roles/cloudtrace.agent`. On your machine, Google's libraries find credentials through Application Default Credentials. A deployed service uses its own service account. The cloud course teaches service accounts, roles and Workload Identity Federation.",
        },
        // CHECK: read on 22 October 2026. The PyPI page of opentelemetry-exporter-gcp-trace (latest 1.15.0, released
        // 19 August 2026) says "This exporter is deprecated." The README of
        // https://github.com/GoogleCloudPlatform/opentelemetry-operations-python says the repository and all of its contents
        // are deprecated and will be archived on 30 October 2026. The Cloud Trace overview page lists the Telemetry API
        // (`telemetry.googleapis.com`) as the recommended way to send traces, and the Cloud Trace API
        // (`cloudtrace.googleapis.com`) as the other. MIGRATION.md names `OTLPSpanExporter` from
        // `opentelemetry-exporter-otlp-proto-grpc`, the endpoint `telemetry.googleapis.com` and Application Default
        // Credentials. The capstone's `gcp` branch still uses `CloudTraceSpanExporter`. Whether to replace it is the learner's call.
        {
          kind: "callout",
          tone: "warn",
          title: "The Cloud Trace exporter in AskPEP is deprecated",
          text: "The `gcp` branch uses `CloudTraceSpanExporter` from the package `opentelemetry-exporter-gcp-trace`. Its PyPI page calls it deprecated, and its repository will be archived on 30 October 2026. Google now recommends the Telemetry API at `telemetry.googleapis.com`, which takes spans in the OpenTelemetry protocol, OTLP. Your spans stay the same. Only the exporter branch would change.",
        },
        {
          kind: "p",
          text: "The lab keeps the exporter that the capstone ships. The offline tests swap in a fake, so none of them calls Google. Before you deploy, read Google's migration guide and plan the change to OTLP. It is one branch in `configure_otel`.",
        },
        // CHECK: the expected output below was seen on 22 October 2026, from a run of this command in `capstone/` with the
        // fake providers and the fixture store, on opentelemetry-sdk 1.45.1. The ids, times and cost differ on every run.
        {
          kind: "step",
          id: "llmops03-s01",
          title: "See the spans of one request on the console",
          text: "Do this after lab step 6. Run it in the `capstone/` folder inside `my-learn/`, with the fixture store from step 1 of chapter 5 of the multi-agent course. The `console` setting prints each span on stderr.",
          lang: "bash",
          code: `PROVIDERS=fake EMBED_DIM=64 STORE=local LOCAL_STORE_PATH=data/fixture-store.json OTEL_EXPORTER=console uv run askpep ask "Why was the walrus operator controversial?"`,
          expect: "The answer prints first. Two log lines and then one block of JSON for each span follow on stderr. Every block has the same trace_id, and the askpep.request block comes last, because a span prints when it ends. That block has askpep.route set to cli.ask. The askpep.generate block holds the model name and token counts, and no question text.",
        },
        {
          kind: "quiz",
          id: "llmops03-q4",
          question: "You set `OTEL_EXPORTER=console` and start the MCP server. Where do the spans go?",
          options: [
            "To stdout, beside the MCP messages.",
            "To stderr, so stdout stays clean for the MCP messages.",
            "To Cloud Trace, because MCP needs a backend.",
            "Nowhere, because the console exporter ignores servers.",
          ],
          answer: 1,
          explain: "The MCP server talks over stdout. The console exporter writes to stderr, so the spans and the protocol never mix.",
        },
        {
          kind: "p",
          text: "Spans reach a backend. Reading one desk question there has one surprise.",
        },
      ],
    },
    {
      id: "s6-two-traces",
      title: "A desk request shows as two traces, each with its own id",
      goal: "Why does one desk question leave more than one trace?",
      blocks: [
        {
          kind: "p",
          text: "AskPEP picks the trace id when a request starts. It is 32 lower-case hex digits, the form Cloud Trace takes. The id goes in the `traces` row and on the root span. Chapter 5 uses it to tie feedback to a request, and chapter 6 adds it to the log lines.",
        },
        {
          kind: "p",
          text: "The id also reaches the caller. The `Done` event that ends an answer stream has a `trace_id`, and so does a `DeskResult`. A desk stream sends the id in its last event, `done`. Its first event, `start`, carries only the thread id. A request that a guard blocks still gets a trace and an id.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "One desk question is two traces today",
          text: "The desk's search tool, `search_peps`, calls the same `search` function as the search route. That function opens its own trace on the route `agent.search`, with its own trace id and no thread id. The desk's trace holds the model and tool spans. The search stages sit in the other trace. A question that searches twice leaves three.",
        },
        {
          kind: "p",
          text: "The retrieval spans do not nest under the desk's `askpep.request`. Nesting them would mean handing the desk's trace to the search, and the code does not do that today. You match the two traces by start time and by route. The search trace starts while the `execute_tool search_peps` span is open.",
        },
        {
          kind: "p",
          text: "The reports that count requests use a fixed list of routes, such as `ask`, `search` and `agent`. The `agent.search` row is stored and priced, but it is not a request. Chapter 6 adds the request log line, and it skips this route too.",
        },
        {
          kind: "widget",
          id: "llmops03-two-traces",
          intro: "Predict how many traces one desk question leaves in Cloud Trace. Then look at both traces on one time line, and answer two questions about them.",
        },
        {
          kind: "quiz",
          id: "llmops03-q5",
          question: "A desk question makes two searches. How many traces does it leave, and how many of them count as requests?",
          options: [
            "Three traces, and one counts as a request.",
            "Two traces, and both count as requests.",
            "Three traces, and all three count as requests.",
            "One trace, because the retrieval spans nest under the desk's span.",
          ],
          answer: 0,
          explain: "The desk makes one trace, and each search makes its own on the route agent.search. The reports count the route agent and skip agent.search, so a search trace is never a request. Nesting would need the desk's trace handed to the search, and the code does not do that.",
        },
        {
          kind: "p",
          text: "You can read a trace now. Before you settle on these tools, it helps to know what would make you change them.",
        },
      ],
    },
    {
      id: "s7-alternatives",
      title: "OpenTelemetry keeps the exit open when you weigh Langfuse, Arize Phoenix and Datadog",
      goal: "What would make you leave Cloud Trace and LangSmith for another tool?",
      blocks: [
        {
          kind: "p",
          text: "AskPEP's default is OpenTelemetry spans to Cloud Trace, plus LangSmith for what the model saw and said. That pairing suits a team that already runs on Google Cloud. Other teams have reasons to choose differently. The table sets out the options as of 22 October 2026.",
        },
        // CHECK: every claim about Langfuse, Arize Phoenix and Datadog was read on 22 October 2026, and FACTS.md holds none of them.
        // Langfuse: https://github.com/langfuse/langfuse (an open source LLM engineering platform, MIT licence except the
        // `ee` folders, self-hostable with Docker Compose, Kubernetes and Terraform templates) and
        // https://langfuse.com/docs/opentelemetry/get-started (it takes OpenTelemetry traces at `/api/public/otel` over
        // HTTP with JSON or protobuf, and gRPC is not supported yet).
        // Arize Phoenix: https://github.com/Arize-ai/phoenix (an AI observability platform under the Elastic License 2.0,
        // installed with `pip install arize-phoenix` and started with `phoenix serve`, self-hosted, built on OpenTelemetry
        // with OpenInference instrumentation) and https://arize.com/docs/phoenix. Neither page says whether Phoenix reads
        // the GenAI conventions.
        // Datadog: https://docs.datadoghq.com/llm_observability/ (the product is now called Agent Observability, and the
        // page says it is metered by the LLM spans ingested) and
        // https://docs.datadoghq.com/llm_observability/instrumentation/otel_instrumentation/ (it takes OpenTelemetry traces
        // directly, with the GenAI conventions from version 1.37 or the OpenInference conventions, and the page has no
        // preview or general availability label).
        // The wording of the Cloud Trace and LangSmith rows is the chapter's own summary. No price is quoted anywhere.
        {
          kind: "compare",
          caption: "Five ways to see what your application did, as of 22 October 2026. These are trade-offs and not a ranking. Check each vendor's current documentation before you choose.",
          columns: ["Tool", "Best at", "When you switch to it", "What it costs you"],
          rows: [
            [
              "OpenTelemetry to Cloud Trace, AskPEP today",
              "The time and size of each step, in a service you already run on Google Cloud.",
              "You run on Google Cloud and want the spans in the same place as your other telemetry.",
              "No text, so you can't read a prompt there. The exporter the capstone uses is deprecated.",
            ],
            [
              "LangSmith",
              "Reading one run in full, with what the model saw and said.",
              "You build with LangChain or LangGraph and need to debug one bad answer.",
              "Run text leaves your project, so AskPEP masks it first.",
            ],
            [
              "Langfuse",
              "An open source platform for building, monitoring, evaluating and debugging LLM applications. It takes OpenTelemetry traces over HTTP.",
              "You want to host your own traces, or keep traces and prompt versions in one place.",
              "You run it if you self-host. It does not take gRPC yet, so an exporter built for gRPC needs a change.",
            ],
            [
              "Arize Phoenix",
              "Tracing and evaluation built on OpenTelemetry, which starts on your own machine with `phoenix serve`.",
              "You want tracing and evaluation that you host yourself.",
              "It carries the Elastic License 2.0, so read the terms first. Its instrumentation follows OpenInference, a separate set of conventions, so check how it reads the `gen_ai.*` names.",
            ],
            [
              "Datadog Agent Observability",
              "LLM traces inside a platform you may already use. It takes OpenTelemetry traces directly.",
              "Your company already runs on Datadog and wants LLM traces beside its other telemetry.",
              "It is a paid product, metered by the LLM spans ingested. It reads the GenAI conventions from version 1.37, and AskPEP read a commit with no version, so test it.",
            ],
          ],
        },
        {
          kind: "p",
          text: "Moving to one of them needs one new branch in `configure_otel`. It would use an OTLP exporter, as the Cloud Trace section above describes. The code that opens spans stays as it is. That is the point of instrumenting through one interface.",
        },
        {
          kind: "p",
          text: "Two things do not move for free. A backend reads attribute names, so check that it reads the ones in `GENAI_ATTRS`. A hosted backend is also a second place that holds your data. Keep the same rule for it as for Cloud Trace. A span holds sizes and names, and masked text is the only text.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "How would you use LangSmith or an equivalent tool",
          text: "Answer first: you use it to read one bad run in full, and you keep your spans portable. Instrument through OpenTelemetry, so Langfuse, Arize Phoenix or Cloud Trace is a choice of exporter. Name the privacy rule. A span holds sizes and names, and text is masked first. Add that tracing complements metrics and does not replace them.",
        },
        {
          kind: "quiz",
          id: "llmops03-q6",
          question: "Your company adopts Datadog. What is the smallest change to AskPEP's tracing?",
          options: [
            "Rewrite every place that opens a span.",
            "Replace the `traces` table with Datadog.",
            "Add an exporter branch to `configure_otel`, then check that Datadog reads the attribute names.",
            "Switch `TRACE_REDACT` off, because Datadog is a trusted vendor.",
          ],
          answer: 2,
          explain: "The code opens spans through one interface, so a new backend is a new exporter. A backend reads attribute names, so test that it reads the ones in `GENAI_ATTRS`. The privacy rule stays on.",
        },
        {
          kind: "p",
          text: "The tools are settled for the pilot, and the lead's 38 seconds are still unexplained. Now you can read them.",
        },
      ],
    },
    {
      id: "s8-readout",
      title: "The 38 seconds were the researcher re-reading its own history",
      goal: "Where did the 38 seconds go, and what can one trace not tell you?",
      blocks: [
        {
          kind: "p",
          text: "The trace says the researcher spent 25 seconds re-reading its own history. Reading one slow request is a skill with a fixed order. Start with the root span's total. List the children by time. Then look at one number that grows.",
        },
        {
          kind: "p",
          text: "The lead names the question: at about 11:12 on Wednesday, someone asked how Python's type hint syntax had changed over the years. You find the row in `traces` by route and time, and you take its `trace_id`. You switched spans on that morning, so the trace is in Cloud Trace.",
        },
        {
          kind: "code",
          lang: "text",
          code: `askpep.request                  38,412 ms   route agent   success true   stop done
  chat triage                     812 ms   in   890   out  28
  chat researcher               3,904 ms   in 3,120   out  96
  execute_tool search_peps      1,640 ms
  chat researcher               4,876 ms   in 5,410   out 104
  execute_tool search_peps      1,702 ms
  chat researcher               5,633 ms   in 7,802   out 111
  execute_tool search_peps      1,588 ms
  chat researcher               6,310 ms   in 10,144  out 108
  execute_tool search_peps      1,655 ms
  chat researcher               4,388 ms   in 12,506  out 62
  chat writer                   5,280 ms   in 4,210   out 612`,
          caption: "The spans of one desk run, in the order they opened. The figures belong to the story.",
        },
        {
          kind: "p",
          text: "Add it up. The researcher's five model calls take 25,111 ms, and the four searches take 6,585 ms. The writer takes 5,280 ms and triage takes 812 ms. That is 37,788 ms in all, and the other 624 ms sit between the spans.",
        },
        {
          kind: "p",
          text: "The researcher holds 65% of the request. Now read the input tokens: 3,120, then 5,410, 7,802, 10,144 and 12,506. Each call re-reads everything that came before, so each one is longer. The model searched four times because the question named no PEP number.",
        },
        {
          kind: "p",
          text: "Four searches also mean five traces in Cloud Trace. There is one desk trace and one `agent.search` trace for each search. You check the four searches by start time, and each one took under two seconds. Retrieval isn't the slow part, and rerank isn't either.",
        },
        {
          kind: "p",
          text: "The lead asks if you can make it faster by tomorrow. You say you could, and the fix is not obvious. A cap on the researcher's searches would cut the time and might cost the answer. It goes through the gate like any other change, so you record it and don't ship it today.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# TRACE-READOUT-001.md
Date: 25 November 2026   Reported by: second team's lead
Trace: 5 traces, 1 request. Root route: agent. Outcome: success, stop done.

## Where the time went
Stage            Time       Share
researcher (5)   25,111 ms  65%
search_peps (4)   6,585 ms  17%
writer            5,280 ms  14%
triage              812 ms   2%
between spans       624 ms   2%
Total            38,412 ms

## What the trace shows
Input tokens grew at each researcher call: 3,120 to 12,506.
The question named no PEP number, so the researcher searched four times.
Each search took under two seconds. Retrieval is not the slow part.

## What the trace does not show
Whether the answer was right. Whether this request is typical.

## Options, not shipped
Cap the researcher's searches. Needs the gate, because a cap can cost an answer.

## Records to keep
OTel spans to Cloud Trace for every request.
LangSmith, in the two-hour window from TRACE-SHARING-001.`,
          caption: "TRACE-READOUT-001.md, whole.",
        },
        {
          kind: "p",
          text: "Read the middle section. The shares come from the spans and they add up. The section after it matters as much. One trace shows one request, so it can't say if this is common. Seven requests in 200 ran over 10 seconds on Tuesday, and this was one kind.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# TRACE-READOUT-(number).md
Date:   Reported by:
Trace:   Root route:   Outcome:

## Where the time went
Stage   Time   Share

## What the trace shows

## What the trace does not show

## Options, not shipped

## Records to keep`,
          caption: "For your next slow request: the read-out, values left blank.",
        },
        {
          kind: "p",
          text: "Growing input tokens are a time problem, and they are also a bill. The product owner asks the next question. What does the pilot cost, and what does one good answer cost? Chapter 4 starts there.",
        },
      ],
    },
  ],
  lab: {
    title: "Emit spans from the PEP desk and export them",
    goal: "Build the tracer in six steps, then wire it into AskPEP. Steps 1 and 2 edit files you already own, `fakes.py` and `tracing.py`, and have no stub. Steps 3 to 5 replace stubs in `src/askpep/telemetry/otel.py` that raise `NotImplementedError(\"llmops-03 step N\")`. Step 6 edits the services and the call sites. The tests are offline and use fakes. Chapter 1 added the three telemetry packages to your dependencies, so they collect. The one live test, in step 4, needs a Google Cloud project and is yours to run. A failure that names another chapter's step means that step is not done yet.",
    minutes: 90,
    files: [
      "src/askpep/fakes.py",
      "src/askpep/tracing.py",
      "src/askpep/telemetry/otel.py",
      "src/askpep/config.py",
      "src/askpep/services.py",
      "src/askpep/generation.py",
      "src/askpep/guards/flow.py",
      "src/askpep/retrieval.py",
      "src/askpep/agents/graph.py",
      "tests/llmops/test_llmops03_opentelemetry.py",
    ],
    steps: [
      {
        title: "A tracer for tests",
        text: "Add `RecordedSpan` and `RecordingTracer` to `fakes.py`. The tracer opens no real span. Its `span` method makes a `RecordedSpan`, appends it to `self.spans`, yields it and sets `ended` when the block leaves. A block that raises records the error on the span and lets the exception go on. `named` returns the spans with that name.",
        code: `# src/askpep/fakes.py
@dataclass
class RecordedSpan:
    name: str
    attributes: dict = field(default_factory=dict)
    parent: "RecordedSpan | None" = None
    trace_id: str | None = None  # the id a root span was asked to start a trace with
    error: BaseException | None = None
    ended: bool = False

    def set_attribute(self, key: str, value) -> None:
        # your turn: keep the value under the key. A second call with the same key replaces it.
        ...

    def set_error(self, exc: BaseException) -> None:
        # your turn: keep the exception in self.error.
        ...


class RecordingTracer:
    def __init__(self) -> None:
        self.spans: list[RecordedSpan] = []

    @contextmanager
    def span(
        self,
        name: str,
        attributes: Mapping | None = None,
        *,
        parent: "RecordedSpan | None" = None,
        trace_id: str | None = None,
    ) -> Iterator[RecordedSpan]:
        # your turn: copy the attributes into a new RecordedSpan and append it to self.spans. Yield it.
        # On an Exception, call set_error on it and raise it again. Set ended in a finally.
        ...

    def named(self, name: str) -> list[RecordedSpan]:
        # your turn: the spans with that name, in the order they opened.
        ...`,
        test: "uv run pytest tests/llmops -k llmops03_s1",
      },
      {
        title: "Spans on a trace",
        text: "Edit `tracing.py`. Add the `Span` and `Tracer` protocols, `NoopTracer` and `new_trace_id`. Give `Trace` its new fields, open the root span in `__post_init__` and a child span in `stage`, and write `add_usage` under a lock. Write `_close`. Put `trace_id`, `thread_id` and `usage` in the INSERT.",
        code: `# src/askpep/tracing.py
class Span(Protocol):
    def set_attribute(self, key: str, value: AttrValue) -> None: ...

    def set_error(self, exc: BaseException) -> None: ...


class Tracer(Protocol):
    def span(
        self,
        name: str,
        attributes: Mapping[str, AttrValue] | None = None,
        *,
        parent: Span | None = None,
        trace_id: str | None = None,
    ) -> AbstractContextManager[Span]: ...


class NoopTracer:
    # span(...) returns nullcontext(_NoopSpan()). _NoopSpan has the two Span methods, and they do nothing.
    ...


def new_trace_id() -> str:
    # 32 lower-case hex digits, from uuid.uuid4().hex
    ...


@dataclass
class Trace:
    # New fields: trace_id (default new_trace_id), thread_id, tracer, usage (a dict), root, _root_cm, _open
    # and _lock. Keep root and the three private ones out of __init__ and repr.

    def __post_init__(self) -> None:
        # Use a NoopTracer when there is no tracer. Open the span "askpep.request" with trace_id=self.trace_id
        # and the attribute askpep.route, plus askpep.thread_id when there is a thread. Keep the context
        # manager in _root_cm and the span in root. If opening it fails, log it and use a no-op span.
        ...

    @contextmanager
    def stage(self, name: str) -> Iterator[Span]:
        # Keep the timing you already have. Open "askpep." plus the name under self.root, and keep the span
        # in _open while the stage runs. On an Exception, call set_error on the span and raise it again.
        ...

    def add_usage(self, stage: str, model: str, tokens_in: int, tokens_out: int) -> None:
        # Under self._lock, update usage[stage] (model, calls, tokens_in, tokens_out) and the totals.
        # Then, when that stage has an open span, set the GENAI_ATTRS operation, model and token attributes.
        ...

    def _close(self, svc: Services) -> None:
        # Fill usage from the totals when no stage added any. Put askpep.success, askpep.refused and
        # askpep.stop_reason on the root, record an error if there is one, and end the root once.
        # Never raise. Chapter 4 adds the cost here.
        ...

    def write(self, svc: Services) -> None:
        # Call self._close(svc) first. Then add trace_id, thread_id and usage (as Jsonb) to the INSERT.
        ...`,
        test: "uv run pytest tests/llmops -k llmops03_s2",
      },
      {
        title: "The OpenTelemetry tracer",
        text: "Replace `OtelTracer.span`, which raises `llmops-03 step 3`. Start the span with `self.tracer.start_span` and end it yourself, and never use the current-span helpers. Give it the parent's context when there is a parent. A root span takes its trace id through `FORCED_TRACE_ID`. Pass every attribute through `clean`, and record an exception before you raise it again.",
        code: `# src/askpep/telemetry/otel.py
class OtelTracer:
    @contextmanager
    def span(
        self,
        name: str,
        attributes: "Mapping[str, AttrValue] | None" = None,
        *,
        parent: "Span | None" = None,
        trace_id: str | None = None,
    ) -> "Iterator[Span]":
        # your turn, with self.tracer.start_span and no ambient context:
        # 1. With a parent, start under it: context=otel_trace.set_span_in_context(parent.span).
        # 2. With no parent, start a root. When trace_id is given, set FORCED_TRACE_ID to int(trace_id, 16)
        #    around the start_span call and reset it after.
        # 3. Pass each attribute value through clean(value, self.redact).
        # 4. Yield _OtelSpan(span, self.redact). On an Exception, call set_error and raise it again.
        #    End the span in a finally.
        raise NotImplementedError("llmops-03 step 3")`,
        test: "uv run pytest tests/llmops -k llmops03_s3",
      },
      {
        title: "Choosing an exporter",
        text: "Replace `configure_otel`, which raises `llmops-03 step 4`. An exporter that is passed in goes through a `SimpleSpanProcessor`. Otherwise `settings.otel_exporter` picks one: none, console on stderr, or gcp. Build a `TracerProvider` with the service name and `_ForcedIds`, and return an `OtelTracer`. The live Cloud Trace test is yours to run.",
        code: `# src/askpep/telemetry/otel.py
def configure_otel(settings: "Settings", exporter: SpanExporter | None = None) -> "Tracer":
    # your turn:
    # 1. With an exporter passed in, use it through a SimpleSpanProcessor.
    # 2. Otherwise settings.otel_exporter decides. "none" returns a NoopTracer, imported from
    #    askpep.tracing inside this function. "console" uses ConsoleSpanExporter(out=sys.stderr) and
    #    "gcp" uses CloudTraceSpanExporter(project_id=settings.google_cloud_project or None), imported
    #    inside its branch. Both go through a BatchSpanProcessor. Anything else raises ValueError.
    # 3. Build a TracerProvider with Resource.create({"service.name": settings.otel_service_name}) and
    #    id_generator=_ForcedIds(). Add the processor. Return an OtelTracer over provider.get_tracer("askpep")
    #    with redact=settings.trace_redact.
    raise NotImplementedError("llmops-03 step 4")`,
        test: "uv run pytest tests/llmops -k llmops03_s4",
      },
      {
        title: "Spans for model and tool calls",
        text: "Replace the six callbacks of `SpanCallbackHandler`, which raise `llmops-03 step 5`. The stub already has `_begin`, `_end` and `_tool_failure`. A model call opens `chat <model>` and ends with its tokens added to the trace. A tool call opens `execute_tool <name>` and records no arguments. An approval pause ends with no error.",
        code: `# src/askpep/telemetry/otel.py
class SpanCallbackHandler(BaseCallbackHandler):
    # The numbered notes in the class docstring are the brief for the six callbacks.

    def on_llm_end(self, response: LLMResult, *, run_id: UUID, **kwargs: Any) -> None:
        # your turn: read usage_metadata from the reply, with 0 when there is none. Put the two token counts
        # on the open span, call self.trace.add_usage(agent, model, tokens_in, tokens_out), then self._end(run_id).
        raise NotImplementedError("llmops-03 step 5")

    def on_tool_end(self, output: Any, *, run_id: UUID, **kwargs: Any) -> None:
        # your turn: end the span with _tool_failure(output), a module function that returns None when the tool worked.
        raise NotImplementedError("llmops-03 step 5")

    # Also replace on_chat_model_start, on_llm_error, on_tool_start and on_tool_error. Their signatures
    # are in the stub. A GraphBubbleUp reaching on_tool_error ends the span with no error.`,
        test: "uv run pytest tests/llmops -k llmops03_s5",
      },
      {
        title: "Wiring the tracer in",
        text: "Add the two exporter settings, then `Services.tracer` and `build_tracer`. Give every `Trace` the tracer with `tracer=svc.tracer`. Put `trace_id` on `Done` and `DeskResult`. In the desk, add `SpanCallbackHandler(trace)` to the callbacks, and close it before `trace.write`. Hand the trace id to the result.",
        code: `# src/askpep/services.py
# In Services, add:  tracer: "Tracer | None" = None
def build_tracer(settings: Settings) -> "Tracer":
    from askpep.telemetry.otel import configure_otel

    return configure_otel(settings)


# In build_services, build the tracer beside LangSmith and pass it to Services:
#   langsmith, tracer = build_langsmith(settings), build_tracer(settings)
#   ... Services(..., tracer=tracer)
#
# src/askpep/config.py
#   otel_exporter: str = "none"  # "none", "console" or "gcp"
#   otel_service_name: str = "askpep"
#
# src/askpep/generation.py
#   Done gains trace_id: str | None = None. When no trace is passed in, ask_stream makes
#   Trace(route, question, tracer=svc.tracer). It calls trace.add_usage("generate", trace.model,
#   item.tokens_in, item.tokens_out) in place of setting the tokens, and each Done it yields carries
#   trace.trace_id.
#
# src/askpep/guards/flow.py
#   guarded_ask_stream makes Trace(route, verdict.text, tracer=svc.tracer). The Done of a blocked
#   request carries trace_id=trace.trace_id.
#
# src/askpep/retrieval.py
#   search makes Trace(route, query, tracer=svc.tracer).
#
# src/askpep/agents/graph.py
#   DeskResult gains trace_id: str | None = None. Each desk trace is
#   Trace(route, question, thread_id=thread_id, tracer=svc.tracer). A run adds SpanCallbackHandler(trace)
#   to its callbacks after the LangSmith ones, and calls the handler's close() in the finally block,
#   before trace.write. Recording a result gives it the id: replace(result, trace_id=trace.trace_id).
#   Your helper names may differ. In the capstone these live in _callbacks and _record.`,
        test: "uv run pytest tests/llmops -k llmops03_s6",
      },
    ],
    verify: "uv run pytest tests/llmops -k llmops03",
  },
  recap: [
    "A span is one timed step, a trace is the tree of spans for one request, and an exporter decides where finished spans go.",
    "AskPEP hands each span its parent on purpose, because a generator can resume on another thread where the current span is wrong.",
    "A span holds names, sizes, counts and outcomes. It never holds the question, a prompt, an answer or tool arguments, and text that is set goes through `redact_pii`.",
    "`OTEL_EXPORTER` takes `none`, `console` or `gcp`. The `gcp` branch uses an exporter that is deprecated, and Google recommends OTLP to the Telemetry API.",
    "A desk question that searches once leaves two traces, and the retrieval spans do not nest under the desk's request span.",
    "Langfuse, Arize Phoenix and Datadog take OpenTelemetry traces, so moving to one is a new exporter. Check how each reads your attribute names.",
    "`TRACE-READOUT-001.md` shows the researcher's five model calls took 65% of a 38-second request, with input tokens growing at each call.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In OpenTelemetry tracing I learned to open spans through one interface and let a setting pick the exporter. I keep text off spans. I know that one desk question leaves two traces. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["llmops-q18"],
};

export default chapter;
