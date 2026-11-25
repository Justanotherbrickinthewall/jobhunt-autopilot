import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "llmops-02-langsmith-tracing",
  course: "llmops",
  number: 2,
  title: "A trace is useful only if it is safe to share",
  tagline: "The second team's lead wants to read the traces. Send them to LangSmith cleaned first, and write down what stays raw.",
  minutes: 50,
  objectives: [
    "Say what a LangSmith run stores, and find where personal data lands in a trace of the desk.",
    "Write `redact_run` so that dictionaries, messages, dataclasses and lists are cleaned before a run is exported.",
    "Build one client and bind it with `trace_context`, and keep the SDK's own tracing switch quiet.",
    "Trace retrieval with a decorator that leaves the services out of the run.",
    "Read a trace for leaks, and say what a pattern redactor misses.",
    "Join the client to the services and the desk with four edits.",
    "Write a trace-sharing note that says what stays raw.",
  ],
  sections: [
    {
      id: "s1-leak",
      title: "One email in a question is stored in every run that carries it",
      goal: "Where does personal data land in a trace of the desk, and who can read it there?",
      blocks: [
        {
          kind: "p",
          text: "A trace is safe to share only after you clean what leaves your system. The second team's lead wants to read the desk's traces this week. The security reviewer asks how that fits with threat row T11, which says raw text sits in traces, checkpoints and tickets. So this chapter opens with one question: what does a trace hold?",
        },
        {
          kind: "p",
          text: "In chapter 3 of the agents course you opened one LangSmith trace. A trace is a tree of **runs**. Each node of the graph and each model call is a run. Each run stores its inputs and its outputs as text.",
        },
        {
          kind: "p",
          text: "Take a question about the walrus operator, with one extra sentence. A user types: What does `:=` do? Reply to `rita.shaw@example.com` please. The address is made up, on the reserved domain example.com. A real user could type a real address, a phone number or a card number just as easily.",
        },
        {
          kind: "p",
          text: "The desk puts that question into its state. So every run that receives the state or the conversation receives the address. That includes the top run, triage, the researcher and each model call. A run that receives only a search query may not. It depends on how the model rewrote the question.",
        },
        {
          kind: "p",
          text: "LangSmith keeps those runs long after the request is over. Anyone with access to the project can read them.",
        },
        {
          // CHECK: LangSmith free Developer plan figures (1 seat, 5,000 base traces a month, 14-day base retention), checked 20 October 2026 against docs.langchain.com/langsmith/pricing-plans. Plans change, so re-check before release.
          kind: "p",
          text: "On the free Developer plan, one seat gets 5,000 base traces a month, and base traces are kept for 14 days. Those figures were checked on 20 October 2026. Plans change, so read the pricing page before you rely on them.",
        },
        {
          kind: "widget",
          id: "llmops02-leak-walk",
          intro: "Mark every run that holds the address. The tree comes from a scripted run of the real desk, and LangSmith names its top run LangGraph. The last run, `askpep.retrieve`, is the retrieval function that section 4 traces. After you check, a switch shows what the redaction hook of section 2 changes. With the hook on, the address reads `[EMAIL]`.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "A run that looks clean is no guarantee",
          text: "The search runs were clean because the model wrote a short query. A different model, or a different question, can copy the whole question into a search or into a ticket body. A redactor that cleans only the runs you expect to be dirty will miss the ones you did not expect.",
        },
        {
          kind: "quiz",
          id: "llmops02-q1",
          question: "A model rewrites a user's question into a short search query before it calls `search_peps`. The question held the user's email address. Which statement is true?",
          options: [
            "The retrieval run is clean, so the trace is safe to share.",
            "The address is still in the inputs of the top run and of the model calls, so the trace is not safe.",
            "LangSmith removes email addresses when it stores a run.",
            "The address appears only in the outputs of the graph.",
          ],
          answer: 1,
          explain: "The address entered with the question. It sits in every run that receives the state or the conversation, whatever the model later searched for. A clean search run says nothing about the rest of the tree.",
        },
        {
          kind: "p",
          text: "The address reaches more runs than you would guess. So the cleaning has to happen in one place that covers them all.",
        },
      ],
    },
    {
      id: "s2-hook",
      title: "One hook on the client cleans every run, so no node has to remember",
      goal: "Where should you clean a run, and what does the cleaning function do?",
      blocks: [
        {
          kind: "p",
          text: "You can clean in three places. You can clean the question before the graph sees it. You can clean inside each node. Or you can clean at the edge, where a run leaves your process. Only the last one covers a node that someone adds next month.",
        },
        {
          kind: "p",
          text: "Cleaning the question first changes what the model reads, so you no longer observe the system you shipped. Cleaning in each node fails the first time someone forgets. Cleaning at the edge changes nothing that your code sees. The local `traces` table stays as your own record. The export is what gets cleaned.",
        },
        {
          kind: "p",
          text: "The LangSmith **client** has that edge built in. You pass it two functions, `hide_inputs` and `hide_outputs`. The client calls them on the inputs and on the outputs of every run, just before it sends the run. You write one function, `redact_run`, and pass it as both.",
        },
        {
          kind: "p",
          text: "`redact_run` builds on a tool you already have. In chapter 5 of the guardrails course you wrote `redact_pii`. It replaces an email, a phone number, a card number or a secret with a label. The labels are `[SECRET]`, `[CARD]`, `[EMAIL]` and `[PHONE]`.",
        },
        {
          kind: "p",
          text: "`redact_detail` ships complete. It applies `redact_pii` to every string inside a nested value. It cannot read the shape of a run. That is the job of `redact_run`, which follows four rules.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "A mapping keeps its keys. If a key, in lower case, is a secret name such as `authorization`, `password` or `x-api-key`, its whole value becomes the mask `[REDACTED]`. Every other value is cleaned the same way.",
            "A pydantic model or a dataclass instance becomes a dictionary of its fields, and that dictionary is cleaned. A LangChain message is a pydantic model.",
            "A list or a tuple becomes a list of cleaned items.",
            "A string goes through `redact_detail`. Anything else, such as a number, comes back as it is.",
          ],
        },
        {
          kind: "p",
          text: "Rule 2 is the one people skip. A run's inputs hold message objects, not only dictionaries. LangSmith turns each object into a dictionary after the hook has run. So a hook that cleans only dictionaries passes the object through, and the email leaves in the converted copy.",
        },
        {
          kind: "code",
          lang: "python",
          caption: "One run's inputs through the hook. The address and the header are made up. The function returns a new value and leaves the one it was given alone.",
          code: `redact_run({
    "question": "What does := do? Reply to rita.shaw@example.com please.",
    "headers": {"Authorization": "Bearer abc123"},
})
# returns a new dictionary:
# {
#     "question": "What does := do? Reply to [EMAIL] please.",
#     "headers": {"Authorization": "[REDACTED]"},
# }`,
        },
        {
          kind: "p",
          text: "Two details decide what the redactor finds. A card number counts only when it passes the **Luhn check**, the checksum that real card numbers satisfy. And a date or a dotted version, such as `2026-10-21` or `3.12.1`, is never read as a phone number.",
        },
        {
          kind: "widget",
          id: "llmops02-redact-judge",
          intro: "Predict what `redact_run` returns for each of seven texts. The first wrong answer lets you try once more.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "A pattern redactor finds patterns and nothing else",
          text: "A name and a street address have no pattern, so `Rita Shaw` passes through untouched. If your traffic holds names, add a name detector to `redact_run`, or keep that traffic out of the export. Decide this before you turn tracing on for a client, not after.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "What would you not store in a trace, and how do you keep it out",
          text: "Answer first: nothing that identifies a person, unless you need it and have cleaned it. Say where you clean, which is one hook on the exporting client. Say what it misses, which is names and addresses. Then give the trade-off. Cleaned text is harder to debug, so keep the full record locally, under access control.",
        },
        {
          kind: "quiz",
          id: "llmops02-q2",
          question: "Your `redact_run` walks dictionaries, lists and strings. A run's inputs hold a `HumanMessage` with an email in its content. What reaches LangSmith?",
          options: [
            "The email as `[EMAIL]`, because the walker reaches the message's content.",
            "The email in clear text, because the hook returns the message object unchanged and LangSmith converts it afterwards.",
            "Nothing, because LangSmith drops message objects.",
            "An error, because the hook is only ever given dictionaries.",
          ],
          answer: 1,
          explain: "The walker has no rule for an object, so it returns the object as it is. LangSmith turns the object into a dictionary after the hook has run, and the email goes with it. Rule 2 closes that gap.",
        },
        {
          kind: "p",
          text: "The hook is written, and something has to carry it. The next section builds the client that does.",
        },
      ],
    },
    {
      id: "s3-client",
      title: "The services hold the client, so tracing stays off unless they say so",
      goal: "How do you keep tracing off unless the services turn it on?",
      blocks: [
        {
          kind: "p",
          text: "`configure_langsmith` builds the client. It returns `None` unless the setting `langsmith_tracing` is true and an API key is set. With the setting `trace_redact` on, which is the default, it passes `redact_run` as both hooks. With it off, the text goes out as it is.",
        },
        {
          // CHECK: LangSmith's EU endpoint is https://eu.api.smith.langchain.com, and runs sent there stay in the EU. Confirm both in the current docs.
          kind: "p",
          text: "The setting `langsmith_endpoint` points the client at a region. Empty means the SDK default, which is the US region. LangSmith's EU address is `https://eu.api.smith.langchain.com`. Use it when the data must stay in Europe.",
        },
        {
          kind: "p",
          text: "`trace_context` binds the client to a block of code. Inside the block, every run goes to that client and that project. A **project** is the folder in LangSmith that collects runs, and yours is `askpep`. Given `None`, `trace_context` turns tracing off. Off means off, even when the SDK's environment says otherwise.",
        },
        {
          kind: "p",
          text: "The SDK has its own switch. If the process environment holds `LANGSMITH_TRACING=true` and a key, the SDK traces by itself, with a default client. That client has no redaction hook. So an environment variable can send raw text while your cleaned client sits unused.",
        },
        {
          kind: "p",
          text: "AskPEP reads the same name as a setting. `Settings` reads `.env` by itself and exports nothing. So put `LANGSMITH_TRACING=true` in `.env`, and run `uv run askpep`. Never run `export LANGSMITH_TRACING=true` in your shell, because the SDK would read it directly.",
        },
        {
          kind: "p",
          text: "`silence_sdk_tracing` is the backstop. When the services are built, it removes four SDK variables from the environment. They are `LANGSMITH_TRACING`, `LANGCHAIN_TRACING_V2`, `LANGSMITH_TRACING_V2` and `LANGCHAIN_TRACING`. On Cloud Run you set the variable on the service, so it is real in the process. There the backstop does the work.",
        },
        {
          kind: "p",
          text: "Chapter 3 of the agents course started its scratch script with `uv run --env-file .env`, which exports every line of `.env`. That script now sends nothing. It calls `build_services`, which removes the switch before the graph runs. It passes no callbacks of its own.",
        },
        {
          kind: "p",
          text: "`askpep` commands read `.env` themselves, so they need no `--env-file`. Keep that flag for tools that read the process environment, such as Braintrust in the evals course and this chapter's live test.",
        },
        {
          kind: "compare",
          caption: "Four ways to set the switch, and what each one sends.",
          columns: ["Where it is set", "Who reads it", "What is sent"],
          rows: [
            [
              "`LANGSMITH_TRACING=true` and a key in `.env`, then `uv run askpep desk ask`",
              "`Settings`, then `configure_langsmith`",
              "Runs from your client, cleaned by the hook.",
            ],
            [
              "`export LANGSMITH_TRACING=true` and a key in the shell, then a script that never calls `build_services`",
              "The SDK, which builds a default client",
              "Raw runs, with no hook.",
            ],
            [
              "The same export, then `uv run askpep desk ask`",
              "`Settings`, and the SDK until `build_services` removes its copy",
              "Runs from your client, cleaned. The backstop caught the variable.",
            ],
            [
              "`LANGSMITH_TRACING=true` on a Cloud Run service",
              "`Settings`, then `silence_sdk_tracing`",
              "Runs from your client, cleaned. A LangChain call outside the graph's callbacks sends nothing.",
            ],
          ],
        },
        {
          kind: "quiz",
          id: "llmops02-q3",
          question: "A teammate exports `LANGSMITH_TRACING=true` and `LANGSMITH_API_KEY` in their shell. They run a scratch script that builds its own LangChain model and never calls `build_services`. What is sent?",
          options: [
            "Nothing, because the `Settings` class has tracing off.",
            "Runs from the services' client, cleaned by the hook.",
            "Raw runs from the SDK's default client, with no redaction.",
            "An error, because the two switches conflict.",
          ],
          answer: 2,
          explain: "The script never builds the services, so `silence_sdk_tracing` never runs and no hooked client exists. The SDK reads the exported variable itself and traces with its default client. That is why the variable lives in `.env` and not in the shell.",
        },
        {
          kind: "p",
          text: "The client covers the graph. Retrieval is a plain function, so it needs one more piece.",
        },
      ],
    },
    {
      id: "s4-traceable",
      title: "A decorator adds retrieval to the tree and keeps the services out of it",
      goal: "How does retrieval become its own run, with only its real inputs?",
      blocks: [
        {
          kind: "p",
          text: "LangGraph makes a run for each node and each model call. Retrieval is a plain Python function called `retrieve`, so it makes no run of its own.",
        },
        {
          kind: "p",
          text: "LangSmith's `@traceable` decorator turns a function into a traced function. Each call becomes a run, with the arguments as its inputs and the return value as its outputs. Called inside another run, it becomes a child of that run.",
        },
        {
          kind: "p",
          text: "`retrieve` takes the services, `svc`, and `trace`, the object that records the request's stages. The services hold the database pool, the model clients and the keys. Neither argument is data, and neither belongs in a run. A decorator that recorded every argument would send both.",
        },
        {
          kind: "p",
          text: "So you write your own decorator, `traced`. It wraps `traceable` and gives it `process_inputs`, a function that drops `svc` and `trace` from the inputs. The wrapper takes `svc` first, and runs the call inside `trace_context` with the services' client. The services decide whether the call is traced, and with which client.",
        },
        {
          kind: "code",
          lang: "python",
          caption: "One line on `retrieve`. The first argument is the run's name, and the second is its type.",
          code: `# src/askpep/retrieval.py
@traced("askpep.retrieve", "retriever")
def retrieve(svc: Services, query: str, trace: Trace, k: int | None = None) -> list[Hit]:`,
        },
        {
          kind: "p",
          text: "LangSmith knows a few run types, among them `chain`, `llm`, `tool` and `retriever`. The runs you saw earlier were chains, model calls and a tool. This one is a retriever.",
        },
        {
          kind: "p",
          text: "Now the tree has one more run. `askpep.retrieve` sits under the `search_peps` tool run. Its inputs are the query and `k`, and they hold no `svc` and no `trace`. Outside the graph, in the plain `ask` command, `askpep.retrieve` is the top of its own trace.",
        },
        {
          kind: "p",
          text: "`askpep.retrieve` is a LangSmith run. It is not an OpenTelemetry span. Chapter 3 of this course adds spans for the stages of a request. A run and a span are two records of the same call, kept in two places.",
        },
        {
          kind: "quiz",
          id: "llmops02-q4",
          question: "Why does `traced` drop `svc` and `trace` from a run's inputs?",
          options: [
            "The run would be too long to read.",
            "They hold the pool, the clients and the keys. They are never data, so they must not be sent.",
            "LangSmith cannot store Python objects.",
            "The redaction hook cannot clean a dataclass.",
          ],
          answer: 1,
          explain: "The services carry connections and keys, and `trace` carries the request's own record. Dropping them at the decorator means no hook has to guess what is safe. The hook does clean dataclasses, so that is not the reason.",
        },
        {
          kind: "p",
          text: "All the parts exist, and four small edits connect them.",
        },
      ],
    },
    {
      id: "s5-wire",
      title: "Four small edits wire the client into the desk",
      goal: "Which edits join the client to the desk?",
      blocks: [
        {
          kind: "p",
          text: "Lab step 5 wires the client in, and it touches four of your own files. `config.py` gets five settings. `Services` gets one field, and `build_langsmith` fills it. `retrieve` gets the decorator. The desk's config gets the callbacks.",
        },
        {
          kind: "code",
          lang: "python",
          caption: "The five settings. Each `.env` name is the setting in upper case. Tracing is off by default, the project is askpep, and redaction is on.",
          code: `# src/askpep/config.py
    langsmith_tracing: bool = False
    langsmith_api_key: str = ""
    langsmith_project: str = "askpep"
    # CHECK: LangSmith's EU endpoint is https://eu.api.smith.langchain.com. Confirm it in the current docs.
    langsmith_endpoint: str = ""  # empty means the SDK default, which is the US region
    trace_redact: bool = True`,
        },
        {
          kind: "p",
          text: "`build_langsmith` calls `silence_sdk_tracing` first and `configure_langsmith` second. `Services` holds the result in a field named `langsmith`, which is `None` when tracing is off. A test builds services with a fake client in that field.",
        },
        {
          kind: "code",
          lang: "python",
          caption: "The field, and the function that fills it. In `build_services`, call `build_langsmith(settings)` once, and pass the result into both `Services` calls.",
          code: `# src/askpep/services.py
# Add under your TYPE_CHECKING imports: from langsmith import Client
class Services:
    # ...your existing fields, then one more:
    langsmith: "Client | None" = None  # None means tracing is off


def build_langsmith(settings: Settings) -> "Client | None":
    from askpep.telemetry.langsmith import configure_langsmith, silence_sdk_tracing

    silence_sdk_tracing()
    return configure_langsmith(settings)`,
        },
        {
          kind: "p",
          text: "The graph needs the client too. LangGraph runs its nodes under callbacks. `langchain_callbacks(svc)` returns one `LangChainTracer` over the services' client, or an empty list when tracing is off. Passing it explicitly replaces the tracer that LangChain would build from the environment. So the redaction hook applies.",
        },
        {
          kind: "code",
          lang: "python",
          caption: "`_config` takes the callbacks. In `_run`, and in `_stream` where it builds the config, pass `langchain_callbacks(svc)` as the third argument.",
          code: `# src/askpep/agents/graph.py
# Add: from askpep.telemetry.langsmith import langchain_callbacks
def _config(svc: Services, thread_id: str, callbacks: list | None = None) -> dict[str, Any]:
    config: dict[str, Any] = {
        "recursion_limit": svc.settings.desk_recursion_limit,
        "configurable": {"thread_id": thread_id},
    }
    if callbacks:
        config["callbacks"] = callbacks
    return config`,
        },
        {
          kind: "p",
          text: "Chapter 3 of this course adds a handler that opens spans, beside this tracer. It also compares LangSmith with Langfuse, Phoenix and Datadog. Chapter 7 settles which tracing stack to keep, with numbers.",
        },
        {
          kind: "p",
          text: "The wiring is done. Before anyone else opens a trace, you read one yourself.",
        },
      ],
    },
    {
      id: "s6-read",
      title: "Read the trace for leaks before anyone else does",
      goal: "How do you prove that the cleaning works?",
      blocks: [
        {
          kind: "p",
          text: "Do this after lab step 5. You will send the same question twice and compare the traces. The first run turns redaction off for one command. The made-up address then leaves your machine in clear text. That is fine for this test and for nothing else.",
        },
        {
          kind: "step",
          id: "llmops02-s01",
          title: "Set the tracing lines in `.env`",
          text: "Chapter 1 of this course moved your workspace to the llmops files and ran the `uv add` line, so `langsmith` is installed. `.env.example` already lists these lines with tracing off, so change the values in `.env` and add no second copy. Keep the file out of git. The step needs your own LangSmith account and key.",
          lang: "bash",
          file: ".env",
          code: `LANGSMITH_TRACING=true
LANGSMITH_API_KEY=paste-your-key-here
LANGSMITH_PROJECT=askpep
TRACE_REDACT=true`,
        },
        {
          kind: "step",
          id: "llmops02-s02",
          title: "Send the question with redaction off",
          text: "This sends one made-up address to LangSmith in clear text. It makes live Gemini calls, so your Google Cloud setup from the agents course must work. The `TRACE_REDACT=false` in front applies to this one command only.",
          lang: "bash",
          code: `TRACE_REDACT=false uv run askpep desk ask "What does := do? Reply to rita.shaw@example.com please."`,
          expect: "The desk prints an answer about the walrus operator with its sources, then a line with the thread, the status and the route. The model words the answer, so yours will differ.",
        },
        {
          kind: "step",
          id: "llmops02-s03",
          title: "Send the same question with redaction on",
          text: "Run the same command without the override. `TRACE_REDACT` is `true` in your `.env`, so the hook runs on every run before it is sent.",
          lang: "bash",
          code: `uv run askpep desk ask "What does := do? Reply to rita.shaw@example.com please."`,
          expect: "The same kind of answer, with the same status line.",
        },
        {
          // CHECK: confirm the current LangSmith trace layout: the project list, the run tree, and the names of the top run, the node runs and the tool run. The steps below describe the layout as documented on 20 October 2026.
          kind: "step",
          id: "llmops02-s04",
          title: "Open both traces and look for the address",
          text: "Open LangSmith, pick the `askpep` project and open the two newest traces. The newest is the redacted one. Read the input of the top run, and of `triage`, in each trace.",
          expect: "The older trace shows the address in the top run, in `triage` and in the model calls. The newer trace shows `[EMAIL]` in the same places.",
        },
        {
          kind: "step",
          id: "llmops02-s05",
          title: "Read the retrieval run",
          text: "Open `askpep.retrieve`, under the `search_peps` run. If the researcher answered without searching, ask a question that needs a PEP passage. If you see `svc` or `trace` in its inputs, `traced` is not dropping them. Fix that before you share anything.",
          expect: "The inputs hold `query` and `k`, and nothing else.",
        },
        {
          kind: "step",
          id: "llmops02-s06",
          title: "Run the one live test",
          text: "The lab has one test that sends a real run, to a project named `askpep-tests`. It checks that a traced call goes through your configured client and that the flush completes. It reads the key from the process environment, so it needs `--env-file`. Only you can run it.",
          lang: "bash",
          code: "uv run --env-file .env pytest tests/llmops -k llmops02_s4_live -m live",
          expect: "1 passed. Without `LANGSMITH_API_KEY` the test is skipped.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "A client wants tracing on for their app. What do you check first",
          text: "Answer first: where the data goes, and who can read it. Name the region, the retention and the people with access. Then say what the runs hold, and clean it at the client that exports. Finally, prove it. Send a known fake address, and read the trace for it. A claim that the hook works is not a test.",
        },
        {
          kind: "quiz",
          id: "llmops02-q5",
          question: "With redaction on, a trace still shows a user's full name in a model call's input. What is the right conclusion?",
          options: [
            "`redact_run` is broken, because it should mask everything personal.",
            "The hook found no pattern in a name. Add a name detector, or keep that traffic out of the export.",
            "LangSmith stores names separately, so they are safe.",
            "The hook runs only on outputs.",
          ],
          answer: 1,
          explain: "The hook is working as written. It matches emails, phone numbers, cards and secrets, and a name has no pattern. The gap is a design decision to make before the export goes live.",
        },
        {
          kind: "p",
          text: "The hook passed its test. A test result on your own screen doesn't let anyone else read a trace. That takes a decision.",
        },
      ],
    },
    {
      id: "s7-sharing-note",
      title: "The export is clean and T11 stays open, and one note says both",
      goal: "What does the security reviewer need in writing before anyone else reads a trace?",
      blocks: [
        {
          kind: "p",
          text: "The note says the export is clean, and T11 stays open. A sharing decision needs a record of what leaves the system, who reads it and what the check showed. This chapter's record is one short note that the security reviewer can sign.",
        },
        {
          kind: "p",
          text: "On Wednesday 25 November you run the test from the last section, with the made-up address on the reserved domain. The newer trace shows `[EMAIL]` in the top run, in `triage` and in every model call. The older one shows the address. You delete the older trace.",
        },
        {
          kind: "p",
          text: "The security reviewer reads the result and asks two questions. Does this close T11? And what about names? You answer the first with a list of the places the raw text still sits. The `query` column in `traces` holds the question as typed. Checkpoints and ticket bodies hold it too.",
        },
        {
          kind: "p",
          text: "The hook covers LangSmith and nothing else. So T11 does not close. The export no longer adds a new raw copy, which is all you can claim. The reviewer agrees and asks for that sentence in writing.",
        },
        {
          kind: "p",
          text: "You answer the second question from the warning earlier. Rows in this pilot hold colleagues' names, and a pattern redactor can't find a name. The lead wants tracing on all day. The reviewer says no, and you agree on a window. LangSmith is on for two hours when someone is diagnosing, and off otherwise.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# TRACE-SHARING-001.md
Date: 25 November 2026   Asked by: second team's lead
Approved by: security reviewer   Threat row: T11

## What leaves the system
LangSmith runs: inputs and outputs of each node, model call and tool. Cleaned by redact_run.

## Who can read it
Project askpep. Two people: engineering and the second team's lead.
Plan retention: read from the pricing page on the day you set this up.

## The check
Sent one made-up address on example.com, with redaction off and then on.
Off: address in the top run, triage and every model call. Trace deleted.
On:  [EMAIL] in the same places. No address in any run.

## What the hook misses
Names and street addresses. Pilot questions can hold a colleague's name.

## Decision
LangSmith is on for a window of two hours, when someone is diagnosing. Off otherwise.

## T11
Not closed. The export adds no new raw copy.
Still raw: the query column in traces, checkpoints, ticket bodies.
Owner: engineering   Due: 30 November 2026`,
          caption: "TRACE-SHARING-001.md, whole.",
        },
        {
          kind: "p",
          text: "Read the last section twice. The hook is real progress, and the note claims exactly that much. A reviewer can check each line against a trace. The two-hour window is the price of a redactor that can't find names, and the lead has agreed to pay it.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# TRACE-SHARING-(number).md
Date:   Asked by:
Approved by:   Threat row:

## What leaves the system

## Who can read it
Plan retention:

## The check
Sent:
Off:
On:

## What the hook misses

## Decision

## Threat row status
Still raw:
Owner:   Due:`,
          caption: "For your next sharing decision: the note, values left blank.",
        },
        {
          kind: "p",
          text: "The lead has one trace in mind already. Someone on the team waited 38 seconds for an answer that morning. LangSmith shows what the model read, and it does not show where the time went. Chapter 3 adds the record that does.",
        },
      ],
    },
  ],
  lab: {
    title: "Build the redaction hook and trace the desk",
    goal: "Write the hook, the client, the context and the decorator in `src/askpep/telemetry/langsmith.py`. Then wire them into your settings, services, retrieval and desk. Steps 1 to 4 start from stubs that raise `NotImplementedError(\"llmops-02 step N\")`. Step 5 edits four files you wrote earlier. The tests use a fake session, so nothing reaches LangSmith. Run them from your AskPEP workspace root.",
    minutes: 60,
    files: [
      "src/askpep/telemetry/langsmith.py",
      "src/askpep/config.py",
      "src/askpep/services.py",
      "src/askpep/retrieval.py",
      "src/askpep/agents/graph.py",
      "tests/llmops/test_llmops02_langsmith.py",
    ],
    steps: [
      {
        title: "Redact a run",
        text: "Write `redact_run` in `telemetry/langsmith.py`. It cleans mappings, models, dataclasses, lists and strings, and returns a new value. Add the imports the comments list. The stub raises `llmops-02 step 1`.",
        code: `# src/askpep/telemetry/langsmith.py
# Add these imports, which the stub leaves out:
#   from dataclasses import fields, is_dataclass
#   from pydantic import BaseModel
#   from askpep.guards.pii import redact_detail
# SECRET_KEYS and MASK ship in your stub.
def redact_run(value: Any) -> Any:
    # your turn:
    # 1. A dict: keep every key. A value whose key, in lower case, is in SECRET_KEYS becomes MASK.
    #    Every other value goes through redact_run again.
    # 2. A BaseModel: call redact_run on value.model_dump(). A dataclass instance (is_dataclass, and not a
    #    class): call it on a dict of its fields.
    # 3. A list or a tuple: return a list of redact_run over each item.
    # 4. Anything else: return redact_detail(value).
    ...`,
        test: "uv run pytest tests/llmops -k llmops02_s1",
      },
      {
        title: "Configure the client",
        text: "Write `configure_langsmith`. It returns `None` unless tracing is on and a key is set. Otherwise it builds a `Client` with the endpoint, when one is set, and with `redact_run` as both hooks unless redaction is off. The `session` argument is for tests. The stub raises `llmops-02 step 2`.",
        code: `# src/askpep/telemetry/langsmith.py
def configure_langsmith(settings: "Settings", session: Any = None) -> Client | None:
    # your turn:
    # 1. Return None unless settings.langsmith_tracing is true and settings.langsmith_api_key is not empty.
    # 2. Start options with api_key=settings.langsmith_api_key. Add api_url=settings.langsmith_endpoint
    #    when that is not empty.
    # 3. When settings.trace_redact is true, add hide_inputs=redact_run and hide_outputs=redact_run.
    # 4. When session is not None, add session=session and auto_batch_tracing=False.
    # 5. Return Client(**options).
    ...`,
        test: "uv run pytest tests/llmops -k llmops02_s2",
      },
      {
        title: "Bind a client to a block of code",
        text: "Write `trace_context`. With a client it returns the SDK's `tracing_context`, enabled, with that client and project. With `None` it returns one that is disabled. Add `tracing_context` to your `langsmith` import. The stub raises `llmops-02 step 3`.",
        code: `# src/askpep/telemetry/langsmith.py
# Change your import to: from langsmith import Client, tracing_context
def trace_context(client: Client | None, project: str = "askpep") -> AbstractContextManager:
    # your turn: with None, return tracing_context(enabled=False).
    # With a client, return tracing_context(enabled=True, client=client, project_name=project).
    ...`,
        test: "uv run pytest tests/llmops -k llmops02_s3",
      },
      {
        title: "Trace a function",
        text: "Write `traced`. It wraps a function with `traceable`, and `process_inputs` drops `svc` and `trace`. The wrapper takes `svc` first and calls the function inside `trace_context`. Keep the name with `functools.wraps`. Add the imports. The stub raises `llmops-02 step 4`.",
        code: `# src/askpep/telemetry/langsmith.py
# Add: import functools, and traceable to your langsmith import.
def traced(name: str, run_type: str = "chain") -> Callable[[Callable], Callable]:
    def drop_services(inputs: dict) -> dict:
        # your turn: return inputs without the keys in HIDDEN_INPUTS.
        ...

    def decorate(fn: Callable) -> Callable:
        # your turn: inner = traceable(name=name, run_type=run_type, process_inputs=drop_services)(fn)
        @functools.wraps(fn)
        def wrapper(svc: "Services", *args: Any, **kwargs: Any) -> Any:
            # your turn: call inner(svc, *args, **kwargs) inside
            # trace_context(svc.langsmith, svc.settings.langsmith_project).
            ...

        return wrapper

    return decorate`,
        test: "uv run pytest tests/llmops -k llmops02_s4",
      },
      {
        title: "Trace the desk",
        text: "Make the four edits from section 5. They are in `config.py`, `services.py`, `retrieval.py` and `agents/graph.py`. Do step 4 first, because `retrieval.py` imports `traced` when it loads. A failing test names `llmops-02 step 5` until the wiring exists.",
        code: `# src/askpep/services.py
# your turn, in build_services:
# 1. langsmith = build_langsmith(settings), called once, beside the other builders.
# 2. Local branch: pass langsmith as the last argument of Services(...), after audit.
# 3. Postgres branch: pass langsmith=langsmith.
# The other three edits are in section 5: the settings, the decorator and the callbacks.
def build_services(settings: Settings) -> Services:
    ...`,
        test: "uv run pytest tests/llmops -k llmops02_s5",
      },
    ],
    verify: "uv run pytest tests/llmops -k llmops02 -q",
  },
  recap: [
    "A run stores its inputs and its outputs as text, so a trace is a copy of your traffic on someone else's servers.",
    "Clean at the client's `hide_inputs` and `hide_outputs` hooks. One function then covers every node, including the ones you add later.",
    "`redact_run` must clean models and dataclasses as well as dictionaries, because LangSmith converts message objects after the hook runs.",
    "The services hold the client, and `trace_context` binds it. Keep `LANGSMITH_TRACING` in `.env` and out of your shell, because the SDK reads it with a client that has no hook.",
    "`@traceable` makes retrieval a run. Drop `svc` and `trace` from its inputs, because they hold connections and keys.",
    "A pattern redactor finds emails, phone numbers, cards and secrets. It does not find names. Say that limit out loud before you turn tracing on for a client.",
    "`TRACE-SHARING-001.md` lets the lead read cleaned traces for a two-hour window. T11 stays open, because the `query` column, checkpoints and ticket bodies stay raw.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In LangSmith tracing I learned that a trace stores every input and output as text. So I clean runs at the exporting client's hook, and I keep the services out of every run. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["llmops-q10", "llmops-q17"],
};

export default chapter;
