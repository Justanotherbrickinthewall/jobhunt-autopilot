import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "agents-05-supervisor-or-handoffs",
  course: "agents",
  number: 5,
  title: "Keep a multi-agent design only if it beats one agent on the golden set",
  tagline: "Is a team of agents better than one agent holding every tool? Only when it beats that one agent by more than chance, at a price worth paying.",
  minutes: 85,
  objectives: [
    "Tell handoffs, a supervisor and a baseline apart by who keeps control and what the next agent sees.",
    "Build a one-agent baseline that is a fair test for a team.",
    "Build a supervisor from call tools, and say why a worker's inner calls stay out of its thread.",
    "Read a per-call trace, and say where a team's extra model calls and tokens go.",
    "Score one run against a golden question, and compute p50 and p95 latency.",
    "Compare the three designs on the golden set, and judge whether a gap is bigger than the noise.",
    "Decide whether a team earns its cost, and name the four reasons that can justify one.",
  ],
  sections: [
    {
      id: "s1-shapes",
      title: "A handoff gives control away, and a supervisor keeps it",
      goal: "What are the ways to build the desk, and what does each add to a simple lookup?",
      blocks: [
        {
          kind: "p",
          text: "Chapter 4 ended on a question. Is a team of agents better than one agent holding every tool? The desk you built is a team: a triage router and three agents, the researcher, the code advisor and the writer. Before you keep it, you need something to measure it against.",
        },
        {
          kind: "p",
          text: "Chapter 4 joined those agents with handoffs. A handoff is a tool call that moves control to another agent and passes context in the same step. Triage hands a question to the researcher, and the researcher answers the user. The agent that hands off steps out.",
        },
        {
          kind: "p",
          text: "This chapter adds two more designs. A **supervisor** is an agent whose tools call the other agents, so it decides who works next. It owns `call_researcher`, `call_code_advisor` and `call_writer`. A call gives a team member one task as text and returns one answer. The supervisor never steps out, and it writes the final reply.",
        },
        {
          kind: "p",
          text: "The third design has no team. The **baseline** is one agent holding every tool: the design a team must beat. Two of its five tools read PEP text: `search_peps` and `read_pep_section`. Two check code: `lint_snippet` and `python_feature_version`. One files a ticket: `open_ticket`, which is a stub until chapter 7 writes it.",
        },
        {
          kind: "compare",
          caption: "The three designs on a plain lookup that needs one search. The last column comes from the offline run in section 4.",
          columns: ["Design", "Who keeps control", "What the next agent sees", "Model calls on one lookup"],
          rows: [
            ["Handoffs", "Each agent, one after another. The last one answers.", "The whole conversation so far.", "3, which is the baseline's 2 plus triage."],
            ["Supervisor", "The supervisor, from start to finish.", "Only the task text the supervisor wrote.", "4, which is the baseline's 2 plus two supervisor calls."],
            ["Baseline", "The one agent.", "Everything, because it is the only agent.", "2."],
          ],
        },
        {
          kind: "p",
          text: "Every extra agent adds model calls, and each one costs money and time. Cost is counted in tokens, from course 1: pieces of text of about four characters each. The **tokens in** are the tokens the model reads on a call, and the **tokens out** are the tokens it writes. Each call rereads its whole input, so the tokens in add up fastest.",
        },
        {
          kind: "p",
          text: "That is the price of a team. This chapter measures what the price buys, on the golden set from course 1. The golden set is a list of questions with known good answers that every change is tested against.",
        },
        {
          kind: "quiz",
          id: "agents05-q1",
          question: "In a supervisor design, who writes the final reply to the user?",
          options: [
            "The researcher, as in a handoff.",
            "The supervisor, after a worker returns its answer.",
            "Triage, before any worker runs.",
            "The writer, always.",
          ],
          answer: 1,
          explain: "The supervisor never steps out. A worker returns its answer as a tool result, and the supervisor writes the reply from it. In a handoff, the last specialist answers the user directly.",
        },
        {
          kind: "p",
          text: "A team has to beat the baseline, so the baseline comes first. What does it need to be a fair test?",
        },
      ],
    },
    {
      id: "s2-baseline",
      title: "The baseline is the cheapest design that could work, so build it first",
      goal: "What does a one-agent baseline need, to be a fair test for a team?",
      blocks: [
        {
          kind: "p",
          text: "You can't judge a team without something to beat. The baseline takes the same input and returns the same result as the handoff graph. One scoring function can then judge all three designs.",
        },
        {
          kind: "p",
          text: "Chapter 4's `run_desk` runs a graph on one question and returns a `DeskResult`. It holds the answer, the citations, the status, the model calls, the tokens in and out, and the latency. Latency, from course 1, is the wait for an answer. Here it times the whole run, from question to final reply.",
        },
        {
          kind: "p",
          text: "Three functions build the baseline. `make_tools` returns the desk's five tools in a dict, keyed by name. `create_desk_agent`, from chapter 1, builds an agent from a prompt and a tool list. `single_agent_graph` puts that agent in a graph with the handoff graph's input and result.",
        },
        {
          kind: "p",
          text: "The baseline prompt ships in your stub. It covers every job, because the one agent does every job. It says five things.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Use `search_peps` for what a PEP says, and `read_pep_section` when a passage is too short.",
            "Use `lint_snippet` for pasted code. For a Python version, find the PEP first, then use `python_feature_version`.",
            "Use `open_ticket` once when the user asks for a ticket, then report the ticket id.",
            "Call one tool at a time, and cite every claim as [n], using the number in the tool result.",
            "If the tools return nothing useful, reply with the fixed refusal sentence, `REFUSAL`, from course 1.",
          ],
        },
        {
          kind: "p",
          text: "A prompt that grows with each new job is a common reason to split an agent. So is a tool list that grows with each new tool. Five tools is a short list, so the baseline is a fair fight.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "A careless baseline makes any team look good",
          text: "Give the baseline the same model, the same tools, the same retrieval and a prompt as careful as the team's. If you starve it, the team wins on paper and loses in production.",
        },
        {
          kind: "quiz",
          id: "agents05-q2",
          question: "Why does `build_baseline` return its graph through `single_agent_graph`?",
          options: [
            "So the baseline can hand off to other agents.",
            "So it takes the same input and returns the same result as the handoff graph, and one scorer can judge both.",
            "So it runs faster than a bare agent.",
            "So it needs no model.",
          ],
          answer: 1,
          explain: "The scorer reads a `DeskResult`. A bare agent returns raw messages. The wrapper gives it the desk's state and counters, so every design reports the same fields. It does not change the speed.",
        },
        {
          kind: "fold",
          tone: "hood",
          title: "Why the tools go in sorted",
          text: "`make_tools` returns a dict. The baseline sorts its keys before it passes the tools on. The model then sees the same tool order on every run, so a comparison can't shift because a dict was built in a different order.",
        },
        {
          kind: "p",
          text: "The baseline holds every tool itself. A supervisor spreads the same tools across a team. How does one agent run another from a single tool call?",
        },
      ],
    },
    {
      id: "s3-supervisor",
      title: "A supervisor is a tool whose body runs a whole agent",
      goal: "How does a supervisor run a whole agent from one tool call, and what comes back?",
      blocks: [
        {
          kind: "p",
          text: "A tool is a named function with a description and an input schema. The model asks for it, your code runs it, and the result goes back to the model as a message. Nothing says the function must be small. A **worker** is an agent that a supervisor calls as a tool. A **call tool** is a tool that runs a worker agent and returns its answer.",
        },
        {
          kind: "p",
          text: "`make_call_tool(name, worker)` builds one call tool. The model gives it a `task` as text. The tool runs the worker on that task to the end, and returns the worker's final text as the tool result. The model decides when to call it from a one-line description, which the stub keeps in `CALL_HELP`.",
        },
        {
          kind: "p",
          text: "The worker's own tool calls and their results stay inside the call. The researcher may search three times. The supervisor's thread shows only the task it sent and the answer it got back.",
        },
        {
          kind: "p",
          text: "The tool seeds the worker with the supervisor's question, sources, start time and counters. The counters are `steps`, `tokens_in` and `tokens_out`, and a step is one model call. Seeding keeps citation numbers counting upward across calls. It also lets chapter 6 cap the whole run with one limit.",
        },
        {
          kind: "code",
          lang: "python",
          caption: "`make_call_tool`, as it ships in the reference code. The seed is the worker's starting state. The `Command` carries one tool message, the worker's sources and its counters back into the supervisor's state.",
          code: `# src/askpep/agents/supervisor.py
def make_call_tool(name: str, worker) -> BaseTool:
    @tool(f"call_{name}", description=CALL_HELP[name])
    def call(task: str, runtime: ToolRuntime) -> Command:
        state = runtime.state
        seed: dict[str, Any] = {
            "messages": [HumanMessage(task)],
            "question": state.get("question", task),
            "sources": state.get("sources", []),
            "principal": state.get("principal"),
            "started_at": state.get("started_at"),
            "active_agent": name,
            **{key: state.get(key, 0) for key in COUNTERS},
        }
        out = worker.invoke({k: v for k, v in seed.items() if v is not None})
        reply = ToolMessage(
            content=final_text(out["messages"]), tool_call_id=runtime.tool_call_id, name=f"call_{name}"
        )
        update: dict[str, Any] = {
            "messages": [reply],
            "sources": out.get("sources", []),
            **{k: out.get(k, 0) for k in COUNTERS},
        }
        if out.get("ticket"):
            update["ticket"] = out["ticket"]
        return Command(update=update)

    return call`,
        },
        {
          kind: "p",
          text: "The tool returns a `Command` because a plain string would update only the messages. The tool also sends back the worker's sources and counters. If the writer filed a ticket, that goes back too.",
        },
        {
          kind: "p",
          text: "The `ToolMessage` carries `tool_call_id=runtime.tool_call_id`, as in a handoff. That id pairs the model's call with its answer. There is no `graph=Command.PARENT` here, because the supervisor never leaves its own graph.",
        },
        {
          kind: "p",
          text: "`build_supervisor` makes the three workers and wraps each in a call tool. It builds them with `handoffs=False`, so they have no transfer tools and can't give the conversation away mid-task.",
        },
        {
          kind: "p",
          text: "It also builds them with `checkpointer=False`. A checkpointer saves the state after every node, so a run can resume after a crash. The workers keep none of their own, and the supervisor's checkpointer saves its thread.",
        },
        {
          kind: "quiz",
          id: "agents05-q3",
          question: "What does a `Command` let `make_call_tool` do that a plain string would not?",
          options: [
            "A string can't hold a citation.",
            "It sends back the worker's sources and counters as well as a message.",
            "LangGraph rejects tools that return strings.",
            "A string would skip the model call.",
          ],
          answer: 1,
          explain: "A string becomes a tool message and nothing else. The supervisor also needs the worker's sources, so citation numbers continue, and its counters, so the comparison counts every call. A `Command` carries all of it.",
        },
        {
          kind: "quiz",
          id: "agents05-q4",
          question: "The researcher searches twice inside one `call_researcher`. What does the supervisor's message list hold for that call?",
          options: [
            "Both searches and both results.",
            "The task it sent and the researcher's final answer.",
            "Only the task.",
            "The searches, but not the results.",
          ],
          answer: 1,
          explain: "The worker runs inside the tool. Only its final text comes back as the tool result, so the supervisor's thread stays short. The price is that the supervisor can't see how the worker got there.",
        },
        // CHECK: FACTS item 13 says langgraph-supervisor-py is archived and read-only as of 20 October 2026, and that GitHub does not show the archive date. It also says the LangChain docs build the supervisor from tool calls and point to Deep Agents. Re-check the repository page and https://docs.langchain.com/oss/python/langchain/supervisor before release.
        {
          kind: "fold",
          tone: "industry",
          title: "Why this chapter does not install langgraph-supervisor",
          text: "The `langgraph-supervisor` library built supervisors for you. Its repository is archived and read-only as of 20 October 2026. LangChain now builds a supervisor from tool calls, as this chapter does, and points to Deep Agents for built-in multi-agent support. Chapter 9 compares Deep Agents with the other frameworks.",
        },
        {
          kind: "p",
          text: "So a supervisor wraps its own model calls around each worker's calls. Where do those extra calls and tokens go?",
        },
      ],
    },
    {
      id: "s4-calls",
      title: "Each extra agent adds model calls, and the supervisor adds two",
      goal: "Where do a team's extra model calls and tokens go on one question?",
      blocks: [
        {
          kind: "p",
          text: "In an agent loop the tokens in grow fastest, because each call rereads its whole message list. A trace of one question shows where they go.",
        },
        {
          kind: "p",
          text: "Lab step 6 gives your workspace a fake desk model, so the desk runs offline with no key or network. The fake picks its tool by rule, answers with canned text, and counts tokens as message characters divided by four. Its counts will differ from a live run. They still show where the cost comes from.",
        },
        {
          kind: "p",
          text: "Run these commands after lab step 6, in your own workspace.",
        },
        {
          kind: "step",
          id: "agents05-s01",
          title: "Load the five fixture PEPs into a local store",
          text: "The fixture PEPs are the five short PEP files the course 1 tests use, in `tests/fixtures`. This command chunks and embeds them with the fake embedder and writes a local JSON store. It needs no database and no key. The exported settings last for this terminal session.",
          lang: "bash",
          code: "export PROVIDERS=fake EMBED_DIM=64 STORE=local LOCAL_STORE_PATH=data/fixture-store.json\nCORPUS_DIR=tests/fixtures uv run askpep ingest --store local",
          expect: "wrote 16 chunks from 5 documents",
        },
        {
          kind: "step",
          id: "agents05-s02",
          title: "Ask one question through all three designs",
          text: "Ask the PEP 572 question once per design. The `--graph` option of `desk ask` comes from lab step 5. The program writes log lines to stderr, so `2>/dev/null` hides them. Compare the `steps` and `trajectory` lines.",
          lang: "bash",
          code: 'Q="Which operator does the assignment expression proposal add?"\nuv run askpep desk ask --graph handoffs "$Q" 2>/dev/null\nuv run askpep desk ask --graph supervisor "$Q" 2>/dev/null\nuv run askpep desk ask --graph baseline "$Q" 2>/dev/null',
          expect: "Each run prints the same answer and source, then a thread line, then two lines like these. Thread ids and milliseconds differ. These are the three runs in order.\nsteps 3  tokens 1408+12  20 ms\ntrajectory: researcher:search_peps, researcher:answer\nsteps 4  tokens 1683+22  22 ms\ntrajectory: supervisor:call_researcher, supervisor:answer\nsteps 2  tokens 1241+11  18 ms\ntrajectory: baseline:search_peps, baseline:answer",
        },
        {
          kind: "p",
          text: "The handoff trajectory lists two records, but `steps` says three. The third step is triage's routing call. Triage makes a model call but calls no tool, so the trajectory leaves it out.",
        },
        {
          kind: "widget",
          id: "agents05-call-trace",
          intro: "Before you press anything, predict which design makes the most model calls on that one question. Then go through each design one call at a time, and watch the calls and tokens add up. The totals match the three runs above. The labels Triage, Supervisor, Researcher and Baseline name the agent that made each call.",
        },
        {
          kind: "p",
          text: "Compare the researcher's second call in the handoff and supervisor designs. Both read 1,046 tokens, because the search result is about 800 tokens of PEP text. The supervisor's own second call reads only 201, because the worker kept that result to itself.",
        },
        {
          kind: "p",
          text: "Now add up what each team design costs on top of the baseline. Triage costs 117 tokens in. The supervisor's two calls cost 392 in, which is 191 plus 201. The researcher's prompt is also a little longer than the baseline's, which adds 25 tokens to each of its calls. That is the price of a team on a question that needed one search.",
        },
        {
          kind: "quiz",
          id: "agents05-q5",
          question: "On the PEP 572 trace, why does the supervisor's second call read far fewer tokens than the researcher's second call?",
          options: [
            "The supervisor uses a smaller model.",
            "The search result stayed inside the worker, so the supervisor reads only the worker's answer.",
            "Supervisors cache their input.",
            "The supervisor skips its system prompt.",
          ],
          answer: 1,
          explain: "The researcher's second call reads the search result, which is about 800 tokens. The supervisor's second call reads the task and the worker's short answer. That is why a supervisor's thread stays small, and why its own calls stay cheap.",
        },
        {
          kind: "p",
          text: "Calls and tokens are half of the comparison. The other half is whether the answers are right. How do you score a run?",
        },
      ],
    },
    {
      id: "s5-scoring",
      title: "A run passes only if it cites the right PEP, and a refusal passes only when there is no answer",
      goal: "How do you decide whether one run passed, and how do you report latency?",
      blocks: [
        {
          kind: "p",
          text: "The golden set has 22 questions. Each `GoldenItem` holds a question, the PEP numbers that answer it in `expected_docs`, and whether it is `answerable`. Two questions have no answer in the corpus, on purpose.",
        },
        {
          kind: "p",
          text: "`item_passed(item, result)` returns True or False for one question and one `DeskResult`. Two rules cover it.",
        },
        {
          kind: "compare",
          caption: "The pass rule for one golden question.",
          columns: ["Question kind", "Passes when", "Fails when"],
          rows: [
            ["Unanswerable", "The desk refused.", "The desk answered anyway."],
            ["Answerable", "The run finished, did not refuse, and cited at least one expected PEP.", "The desk refused, the run did not finish, or it cited only other PEPs."],
          ],
        },
        {
          kind: "p",
          text: "The rule checks what the answer cites. It never judges the prose. A fluent answer with no citation fails. A refusal on an answerable question fails too, even though a refusal does no harm.",
        },
        {
          kind: "p",
          text: "One citation from the expected set is enough. A run that cites two PEPs and gets one right passes. The rule can't see a wrong claim under a right citation. Faithfulness, from course 1, asks whether every claim in the answer is supported by the sources, and it catches that.",
        },
        {
          kind: "p",
          text: "Latency changes from run to run, and a mean hides the slow runs. So the comparison reports two percentiles. The **p50** is the median latency: half the runs finish faster than this. The p95 latency, from course 1, is the time that 95 percent of requests beat.",
        },
        {
          kind: "p",
          text: "`percentile(values, q)` takes a list and a q from 0 to 100. It sorts a copy and finds the position `(n - 1) * q / 100`. Then it blends the two values either side of that position. An empty list gives 0.0.",
        },
        {
          kind: "p",
          text: "Take the four values 10, 20, 30 and 40. The p50 sits at position 1.5, halfway between 20 and 30, so it is 25. The p95 sits at position 2.85, so it is 30 plus 0.85 times 10, which is 38.5.",
        },
        {
          kind: "quiz",
          id: "agents05-q6",
          question: "What does `percentile([10, 20, 30, 40], 50)` return?",
          options: ["20.0", "25.0", "30.0", "35.0"],
          answer: 1,
          explain: "The position is 3 times 50 over 100, which is 1.5. That is halfway between the values at positions 1 and 2, which are 20 and 30. The answer is 25.0.",
        },
        {
          kind: "quiz",
          id: "agents05-q7",
          question: "A golden question has no answer. The desk answers it and cites PEP 8. What does `item_passed` return?",
          options: [
            "True, because it cited a real PEP.",
            "False, because an unanswerable question passes only when the desk refuses.",
            "True, because the run finished.",
            "It depends on which PEP it cited.",
          ],
          answer: 1,
          explain: "For an unanswerable question the only thing that counts is the refusal. An answer fails it, however well it is cited.",
        },
        {
          kind: "fold",
          tone: "dyk",
          title: "Why the p95 and not the slowest run",
          text: "The slowest run may be one timeout or one cold start. The p95 ignores it. On 22 questions the p95 sits between the second and third slowest runs, so it still shows how bad a slow question gets.",
        },
        {
          kind: "p",
          text: "You can now score one run and sum up its latency. What happens when every golden question goes through all three designs?",
        },
      ],
    },
    {
      id: "s6-compare",
      title: "Compare the three designs on one golden set, and treat small gaps as noise",
      goal: "How do the three designs compare on the golden set, and when is a gap bigger than chance?",
      blocks: [
        {
          kind: "p",
          text: "`compare_graphs(svc, graphs, golden)` runs every golden question through every design. Each question gets a thread of its own, so one run can't leak into the next. It scores each run with `item_passed`, and it returns one `GraphStats` row per design.",
        },
        {
          kind: "compare",
          caption: "What a `GraphStats` row holds, and what to watch in each field.",
          columns: ["Field", "Meaning", "What to watch"],
          rows: [
            ["accuracy", "Passed questions divided by all questions.", "One question is 4.5 points on a 22 question set."],
            ["mean_tokens", "Tokens in plus tokens out, averaged per question.", "This is the cost column."],
            ["mean_steps", "Model calls per question, averaged.", "Each call adds latency."],
            ["p50_ms and p95_ms", "The median and the 95th percentile of latency, in milliseconds.", "The p95 shows how bad a slow question gets."],
          ],
        },
        {
          kind: "p",
          text: "The CLI wraps `compare_graphs`. `askpep desk compare` runs all three designs and prints one row each. `askpep desk ask --graph NAME` runs one question through one design, as in section 4.",
        },
        {
          kind: "code",
          lang: "python",
          caption: "The CLI changes. Add the `--graph` option to `desk ask`, then add `desk compare`. Imports sit inside the functions, as in the rest of the file.",
          code: `# src/askpep/cli.py
GRAPHS = ("handoffs", "supervisor", "baseline")


def check_graph(graph: str) -> str:
    if graph not in GRAPHS:
        raise typer.BadParameter(f"{graph!r} is not one of: {', '.join(GRAPHS)}", param_hint="--graph")
    return graph


@desk_app.command("ask")
def desk_ask(
    question: str,
    thread: Annotated[str, typer.Option("--thread", help="Continue this thread. Default: a new one.")] = "",
    graph: Annotated[str, typer.Option("--graph", help="handoffs, supervisor or baseline.")] = "handoffs",
) -> None:
    # The rest of this command stays as chapter 4 wrote it. Only the graph line changes.
    result = run_desk(build_graph(check_graph(graph), svc), question, svc=svc, thread_id=thread or None)


@desk_app.command("compare")
def desk_compare(
    dataset: Annotated[
        str, typer.Option("--dataset", help="A golden JSONL file. Default: evals/golden.jsonl.")
    ] = "",
) -> None:
    """Run the golden questions through all three designs. Prints accuracy, tokens, steps and latency."""
    from pathlib import Path

    from askpep.agents.compare import compare_graphs
    from askpep.agents.graph import build_graph
    from askpep.evals import GOLDEN, load_golden

    svc = open_services()
    graphs = {name: build_graph(name, svc) for name in GRAPHS}
    stats = compare_graphs(svc, graphs, load_golden(Path(dataset) if dataset else GOLDEN))
    typer.echo(f"{'graph':<12}{'accuracy':>10}{'tokens':>10}{'steps':>8}{'p50 ms':>10}{'p95 ms':>10}")
    for s in stats:
        typer.echo(
            f"{s.graph:<12}{s.accuracy:>10.2f}{s.mean_tokens:>10.0f}{s.mean_steps:>8.1f}{s.p50_ms:>10.0f}{s.p95_ms:>10.0f}"
        )`,
        },
        {
          kind: "p",
          text: "Chapter 7 adds a `finally` block that closes the LangGraph connections. The reference code's `desk compare` has it already. It is left out above because your workspace has nothing to close yet.",
        },
        {
          kind: "step",
          id: "agents05-s03",
          title: "Keep the golden questions the five PEPs can answer",
          text: "The full golden set needs all 18 PEPs. Five fixture PEPs answer only some of the questions. This command keeps eight. Six are answerable questions about PEPs 8, 20, 484, 572 and 703. Two have no answer.",
          lang: "bash",
          code: `grep -E '"id": "q(01|02|03|06|09|17|21|22)"' evals/golden.jsonl > data/fixture-golden.jsonl\nwc -l data/fixture-golden.jsonl`,
          expect: "8 data/fixture-golden.jsonl",
        },
        {
          kind: "step",
          id: "agents05-s04",
          title: "Run the comparison",
          text: "This runs 8 questions through 3 designs, which is 24 desk runs, all offline. The millisecond columns will differ on your machine. Ignore them offline. The fakes return at once, so the figures time Python code and no model.",
          lang: "bash",
          code: "uv run askpep desk compare --dataset data/fixture-golden.jsonl 2>/dev/null",
          expect: "graph         accuracy    tokens   steps    p50 ms    p95 ms\nhandoffs          0.75      1461     3.0         9        84\nsupervisor        0.75      1749     4.0        10        11\nbaseline          0.75      1292     2.0         7         8",
        },
        {
          kind: "step",
          id: "agents05-s05",
          title: "Price each design per passing question",
          text: "Accuracy is the same for all three, so the cost of one passing question is the mean tokens divided by the accuracy. Work it out with the numbers from your table.",
          lang: "bash",
          code: 'python3 -c "print(1461 / 0.75, 1749 / 0.75, 1292 / 0.75)"',
          expect: "1948.0 2332.0 1722.6666666666667",
        },
        // CHECK: these figures are real output of `askpep desk compare --dataset data/fixture-golden.jsonl` with PROVIDERS=fake EMBED_DIM=64, run on 8 November 2026 in a scratch copy of the reference code with the fixture PEPs at tests/fixtures. The 21 October run printed 210 fewer tokens per design, because the search result and the researcher and baseline prompts have grown since. A live Gemini run on the 22 questions will give different accuracy, tokens and latency, so the learner should run one and compare.
        {
          kind: "compare",
          caption: "Offline results from `askpep desk compare` with the fake desk model, run on 8 November 2026. Five fixture PEPs, 8 of the 22 golden questions. They are not live model results.",
          columns: ["Design", "Accuracy", "Mean tokens", "Mean steps", "Tokens per passing question", "Tokens against the baseline"],
          rows: [
            ["Handoffs", "0.75", "1,461", "3.0", "1,948", "+13%"],
            ["Supervisor", "0.75", "1,749", "4.0", "2,332", "+35%"],
            ["Baseline", "0.75", "1,292", "2.0", "1,723", "The reference"],
          ],
        },
        {
          kind: "p",
          text: "The three accuracy figures are the same, 0.75. The fake model runs the same search in every design and never refuses. So it fails the two unanswerable questions and passes the six it can. Six of eight is 0.75.",
        },
        {
          kind: "p",
          text: "Accuracy can't separate the designs offline. Tokens and steps can. The supervisor reads 35% more tokens than the baseline, and handoffs read 13% more. Fake providers show the table's shape, not real scores. If a live run looked like this, with no accuracy gain, you would drop both teams.",
        },
        {
          kind: "p",
          text: "A live run is where accuracy can differ. Set `GOOGLE_CLOUD_PROJECT`, ingest the 18 PEPs into Postgres, and run `askpep desk compare` with no `--dataset`. It reads the whole golden set, which makes 66 desk runs, 22 questions in 3 designs. Each has several model calls, so it costs real money. Run it once and keep the table.",
        },
        {
          kind: "p",
          text: "A pass rate from 22 questions is a rough number. The 22 questions are a small sample of what users ask, and a different 22 would give a different score. The gap that this luck alone could produce is the noise band. At scores near 17 of 22, it's over 20 points wide.",
        },
        {
          kind: "widget",
          id: "agents05-gap-cost",
          intro: "Predict what the evidence supports before you touch a slider. Then move the passes to see how big a gap must be to beat the noise band. The cost lines start from the offline token means.",
        },
        {
          kind: "p",
          text: "That band is a cautious estimate. Both designs answer the same questions, so their scores move together a little, and the true noise is somewhat smaller. The main point stands. On 22 questions, a gap of one or two is not evidence.",
        },
        {
          kind: "p",
          text: "Two fixes shrink the noise. Add questions, because chance matters less as the set grows. Or run each design several times and look at the spread, because a live model can score differently on the same question.",
        },
        {
          kind: "quiz",
          id: "agents05-q8",
          question: "All three designs score 0.75 offline. What does that tell you?",
          options: [
            "The designs are equally good.",
            "The fake model answers the same way in every design, so the table shows cost but cannot rank accuracy.",
            "Accuracy does not matter for desk designs.",
            "The golden set is too hard.",
          ],
          answer: 1,
          explain: "The fake picks the same search and gives the same canned answer whichever design wraps it. Only the number of calls and tokens differs. A live model is what makes accuracy differ.",
        },
        {
          kind: "quiz",
          id: "agents05-q9",
          question: "On a live run the supervisor passes 19 of 22 and the baseline passes 17 of 22. The supervisor reads 40% more tokens. What do you do?",
          options: [
            "Keep the supervisor, because it scored higher.",
            "Keep the baseline and add questions, because a two question gap is inside the noise.",
            "Keep the supervisor, because 40% is a small cost.",
            "Drop both and build a handoff design.",
          ],
          answer: 1,
          explain: "Two questions of 22 is a gap of 9 points, and the noise band at these scores is over 20 points. Nothing is proven, and the supervisor costs more. Keep the baseline until more questions show a clear gap.",
        },
        {
          kind: "fold",
          tone: "trouble",
          title: "The same design scores differently on two runs",
          text: "Symptom: you run `desk compare` twice and the baseline's accuracy changes by a question or two. Cause: a live model isn't deterministic, so it may pick a different tool or word an answer differently. Fix: treat that movement as part of the noise, and run each design several times before you call a gap real.",
        },
        {
          kind: "p",
          text: "So a gap must clear the noise band before it counts. When it does, how do you decide whether the team is worth its price?",
        },
      ],
    },
    {
      id: "s7-decision",
      title: "Keep the team only when the gain clears the noise and pays for its cost",
      goal: "When does a team earn its place over the baseline, and what can justify one?",
      blocks: [
        {
          kind: "p",
          text: "The decision takes three questions, and the order matters.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Did the team beat the baseline by more than the noise? If not, stop and keep the baseline.",
            "What does the gain cost, in tokens per extra correct answer?",
            "Is that price worth paying for this desk?",
          ],
        },
        {
          kind: "p",
          text: "A tie or a loss ends the argument at the first question. A team that matches the baseline and costs more is a worse baseline.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "A team that ties the baseline has lost",
          text: "Equal accuracy at higher cost is a loss. Extra agents add calls and latency. They also add new ways to fail: a vague task that starves a worker, or a loop where agents pass a task back and forth. Ship the baseline until a team beats it.",
        },
        {
          kind: "p",
          text: "Four reasons can justify a team even when the baseline looks close. Each one needs a measurement before you rely on it.",
        },
        {
          kind: "list",
          items: [
            "The tool list has outgrown one agent, and tool choice is failing.",
            "Different agents need different permissions. Only the writer should hold `open_ticket`, for example.",
            "Parts of the job can run in parallel, and latency matters.",
            "One context window can't hold the work, so each agent needs a window of its own.",
          ],
        },
        {
          kind: "compare",
          caption: "Choosing between the two team designs, once a team has earned its place.",
          columns: ["Question", "Handoffs", "Supervisor"],
          rows: [
            ["Who answers the user", "The last specialist.", "The supervisor."],
            ["What a specialist sees", "The whole conversation.", "Only the task text."],
            ["Where tool results pile up", "In the shared thread, where later agents read them.", "Inside the worker's call."],
            ["Extra calls on a lookup, against the baseline", "One, for triage.", "Two, for the supervisor's own calls."],
            ["Main risk", "The thread grows as agents add to it.", "A vague task starves the worker."],
          ],
        },
        {
          kind: "p",
          text: "When a team is worth it comes up in interviews, often as the follow-up to a design question.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "When is a multi-agent system worse than a single agent?",
          text: "Say it is worse when the extra agents add cost without adding quality. Name your test: same tasks, same tools, one agent against the team, scored on accuracy, cost per passing question, latency and steps. A team can win on four grounds: tool overload, separate permissions, parallel work and context limits. If it loses, ship the baseline.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "How would you design a multi-agent research pipeline?",
          text: "Start with the single-agent baseline, and add a role only where it earns its cost. Roles share typed state. Cap steps, tokens and time, add checkpoints, and return a partial result when one branch fails. Measure citation accuracy and cost. Close by saying you compare against the baseline on a fixed set and ship the winner.",
        },
        {
          kind: "quiz",
          id: "agents05-q10",
          question: "Which result justifies keeping a supervisor over the baseline?",
          options: [
            "It scores one question higher on a 22 question set.",
            "It matches the baseline's accuracy and looks cleaner in a diagram.",
            "It beats the baseline by more than the noise, and the cost per extra correct answer is worth paying for this desk.",
            "It reads more tokens, which means it thinks harder.",
          ],
          answer: 2,
          explain: "A team has to clear two tests. The gain must be bigger than chance, and it must be worth its price. A one question gap fails the first. A diagram fails both, and extra tokens are only a cost.",
        },
        {
          kind: "p",
          text: "Chapter 9 compares Deep Agents, Google ADK, the OpenAI Agents SDK and CrewAI with what you built here.",
        },
        {
          kind: "p",
          text: "So a team earns its place only when it beats the baseline by more than the noise, at a price worth paying. Every design here shares one risk. Each agent is a loop, and nothing yet ends a loop the model won't leave. What stops an agent that keeps calling tools and never finishes? Chapter 6 answers that.",
        },
      ],
    },
  ],
  lab: {
    title: "Build the baseline, the supervisor and the scoring, then run the desk with no model",
    goal: "Fill in five stubs in your AskPEP workspace, then add the fake desk model to two of your own files. Each stub raises `NotImplementedError(\"agents-05 step N\")` until you replace it. The tests use scripted models, so nothing touches the network. After step 6, the chapter's offline commands run in your own workspace.",
    minutes: 55,
    files: [
      "src/askpep/agents/baseline.py",
      "src/askpep/agents/supervisor.py",
      "src/askpep/agents/compare.py",
      "src/askpep/cli.py",
      "src/askpep/fakes.py",
      "src/askpep/services.py",
      "tests/agents/test_agents05_supervisor_or_handoffs.py",
    ],
    steps: [
      {
        title: "Build the baseline",
        text: "Write `build_baseline` in `baseline.py`. It wraps one five-tool agent with `single_agent_graph`. The prompt ships complete. The stub raises `agents-05 step 1`. One test checks that the agent is given all five tools, and nothing calls `open_ticket`. `open_ticket` is still the stub from chapter 1, and chapter 7 writes it.",
        code: `# src/askpep/agents/baseline.py
from askpep.agents.factory import create_desk_agent, single_agent_graph
from askpep.agents.tools import make_tools


def build_baseline(svc: Services, *, checkpointer=None, store=None):
    # your turn:
    # 1. tools = make_tools(svc) gives a dict of the five tools, keyed by name.
    # 2. agent = create_desk_agent(svc, "baseline", BASELINE_PROMPT, <the tools as a list>).
    #    Take the tools in sorted name order, so every run has the same order.
    # 3. Return single_agent_graph(svc, "baseline", agent, checkpointer=checkpointer, store=store).
    ...`,
        test: "uv run pytest tests/agents -k agents05_s1",
      },
      {
        title: "Build the supervisor",
        text: "Write `make_call_tool` and `build_supervisor` in `supervisor.py`. The prompt and `CALL_HELP` ship complete. `make_call_tool(name, worker)` returns a tool named `call_<name>` that takes a `task`. Both stubs raise `agents-05 step 2`. The worker must see only its task, and its inner calls must not appear in the supervisor's thread.",
        code: `# src/askpep/agents/supervisor.py
from typing import Any

from langchain.tools import ToolRuntime, tool
from langchain_core.messages import HumanMessage, ToolMessage
from langgraph.types import Command

from askpep.agents.advisor import build_code_advisor
from askpep.agents.factory import create_desk_agent, single_agent_graph
from askpep.agents.research import build_researcher
from askpep.agents.usage import COUNTERS, final_text
from askpep.agents.writer import build_writer


def make_call_tool(name: str, worker) -> BaseTool:
    @tool(f"call_{name}", description=CALL_HELP[name])
    def call(task: str, runtime: ToolRuntime) -> Command:
        state = runtime.state
        # your turn:
        # 1. Build the worker's starting state, as a dict. Its messages are [HumanMessage(task)].
        #    Copy question (default: the task), sources, principal and started_at from state.
        #    Set active_agent to name. Copy each counter in COUNTERS, with a default of 0.
        #    Leave out any key whose value is None.
        # 2. out = worker.invoke(<that state>).
        # 3. Make a ToolMessage with content=final_text(out["messages"]),
        #    tool_call_id=runtime.tool_call_id and name=f"call_{name}".
        # 4. Return Command(update=...) holding that message, out's sources, out's counters,
        #    and out's ticket when it has one.
        ...

    return call


def build_supervisor(svc: Services, *, checkpointer=None, store=None):
    # your turn:
    # 1. Build researcher, code_advisor and writer with build_researcher, build_code_advisor
    #    and build_writer. Pass handoffs=False and checkpointer=False to each.
    # 2. Wrap each one with make_call_tool(name, worker).
    # 3. agent = create_desk_agent(svc, "supervisor", SUPERVISOR_PROMPT, <the three call tools>).
    # 4. Return single_agent_graph(svc, "supervisor", agent, checkpointer=checkpointer, store=store).
    ...`,
        test: "uv run pytest tests/agents -k agents05_s2",
      },
      {
        title: "Judge one run",
        text: "Write `item_passed` in `compare.py`. An unanswerable item passes only if the desk refused. An answerable item needs a run that finished, did not refuse and cited at least one expected PEP. The stub raises `agents-05 step 3`.",
        code: `# src/askpep/agents/compare.py
def item_passed(item: GoldenItem, result: DeskResult) -> bool:
    # your turn:
    # 1. When the item is not answerable, return result.refused.
    # 2. When the run refused, or its status is not "done", return False.
    # 3. Collect the doc_id of every citation in result.citations. Return True when
    #    that set shares a member with item.expected_docs.
    ...`,
        test: "uv run pytest tests/agents -k agents05_s3",
      },
      {
        title: "Write the percentile",
        text: "Write `percentile` in `compare.py`. It uses linear interpolation, and it must not sort the caller's list in place. The stub raises `agents-05 step 4`.",
        code: `# src/askpep/agents/compare.py
import math


def percentile(values: Sequence[float], q: float) -> float:
    # your turn:
    # 1. An empty list gives 0.0.
    # 2. Sort a copy of the values.
    # 3. position = (len(ordered) - 1) * q / 100. low and high are math.floor and math.ceil of it.
    # 4. Return ordered[low] + (ordered[high] - ordered[low]) * (position - low).
    ...`,
        test: "uv run pytest tests/agents -k agents05_s4",
      },
      {
        title: "Compare the designs and add the commands",
        text: "Write `compare_graphs` in `compare.py`. `GraphStats` ships complete. The stub raises `agents-05 step 5`. The stub's `graph.py` already ships `build_graph`, which maps a design name to its builder. Then edit your `cli.py`. Add `GRAPHS` and `check_graph`, add the `--graph` option to `desk ask`, and add `desk compare`, all as shown in section 6.",
        code: `# src/askpep/agents/compare.py
from askpep.agents.graph import DeskResult, run_desk


def compare_graphs(
    svc: Services, graphs: Mapping[str, Any], golden: Sequence[GoldenItem]
) -> list[GraphStats]:
    # your turn: for each name and graph in graphs, in the order given:
    # 1. results = [(item, run_desk(graph, item.question, svc=svc)) for item in golden].
    #    run_desk starts a new thread for each call, so questions don't leak into each other.
    # 2. passed = how many results item_passed accepts. count = len(results) or 1,
    #    so an empty golden set gives zeros and no crash.
    # 3. Append GraphStats(graph=name, items=len(results), passed=passed, accuracy=passed / count,
    #    mean_tokens, mean_steps, p50_ms, p95_ms). mean_tokens adds tokens_in and tokens_out
    #    for each result, and mean_steps adds steps. Both divide by count.
    #    The two latencies come from percentile over every latency_ms.
    # 4. Return the list.
    ...`,
        test: "uv run pytest tests/agents -k agents05_s5",
      },
      {
        title: "Run the desk with no model",
        text: "Add `EchoDeskModel` to `fakes.py`, with the imports it needs, and `build_chat` to `services.py`. The desk then runs with `PROVIDERS=fake` and no keys. The echo model follows fixed rules, which the code comments list. `build_chat(settings)` returns a factory. With fake providers every role gets the echo model. Otherwise it returns `partial(make_chat_model, settings)`. Until now `build_services` left `chat` empty, and your tests and try-its set `svc.chat` by hand. Call `build_chat` in `build_services`, in both branches, and pass the result as `chat`.",
        code: `# src/askpep/fakes.py
# _stream_message is the helper you pasted in chapter 1, so it is already in this file.


class EchoDeskModel(BaseChatModel):
    tool_names: tuple[str, ...] = ()

    @property
    def _llm_type(self) -> str:
        return "askpep-echo-desk"

    def bind_tools(self, tools, **kwargs):
        # your turn: read each tool's name, and return a copy of the model that remembers them.
        # A copy leaves the first model alone, so binding tools never changes it.
        ...

    def _reply(self, messages: list[BaseMessage]) -> AIMessage:
        # your turn:
        # 1. The question is the last human message. A tool result after it means the tool has run.
        # 2. TriageDecision among the tools (with_structured_output binds the schema as a tool of that
        #    name): call it with route "researcher" and a one-sentence reason.
        # 3. search_peps among the tools and no result yet: call it with the question as the query.
        # 4. call_researcher among the tools and no result yet: call it with the question as the task.
        # 5. Otherwise answer "The first source is the best match [1]."
        # 6. Fill usage_metadata with input, output and total tokens, so the token counts have numbers.
        ...

    def _generate(self, messages, stop=None, run_manager=None, **kwargs):
        # your turn: wrap self._reply(messages) in a ChatResult.
        ...

    def _stream(self, messages, stop=None, run_manager=None, **kwargs):
        # your turn: yield from _stream_message(self._reply(messages), run_manager).
        ...`,
        test: "uv run pytest tests/agents -k agents05_s6",
      },
    ],
    verify: "uv run pytest tests/agents -k agents05",
  },
  recap: [
    "A handoff gives control to the next agent. A supervisor keeps it and calls workers as tools. The baseline is one agent with every tool.",
    "A supervisor adds model calls. In the offline PEP 572 trace it made four calls against the baseline's two.",
    "`item_passed` checks citations and refusals. It never reads the wording. `percentile` reports p50 and p95 with linear interpolation.",
    "`compare_graphs` returns accuracy, tokens, steps and latency for each design, with each question on its own thread.",
    "The fake desk model from lab step 6 runs the desk with no key. Its table shows cost, not real accuracy.",
    "On 22 questions, one question is 4.5 points, and a gap of one or two is inside the noise.",
    "Keep a team only if it beats the baseline by more than the noise, and the cost per extra correct answer is worth paying.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In supervisor or handoffs I learned that a multi-agent design must beat one agent on the golden set. The gain must be bigger than the noise before it earns its extra model calls. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["agents-q09", "agents-q10", "agents-q18"],
};

export default chapter;
