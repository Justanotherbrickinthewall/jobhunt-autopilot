import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "agents-03-langgraph-state",
  course: "agents",
  number: 3,
  title: "State you can print is state you can debug",
  tagline: "Once a run has several steps, where does it keep what it knows? In one state record, where every key has one rule for two writes.",
  minutes: 45,
  objectives: [
    "Explain a graph as one state record, nodes that return updates and edges that pick the next node.",
    "Choose a reducer for each key, and predict what two writes leave behind.",
    "Define the desk state as plain data, so a checkpointer can save it under a thread.",
    "Make a tool write its sources to state, so the citation numbers stay true.",
    "Move a run to its next node with a `Command` that also updates the state.",
    "Ask a model for a typed route with structured output, and fall back safely when it fails.",
    "Read one LangSmith trace to find the node that wrote a wrong value.",
  ],
  sections: [
    {
      id: "s1-graph",
      title: "A run keeps what it knows in one state record that nodes update",
      goal: "Where does a LangGraph run keep what it knows, and how do you watch it change?",
      blocks: [
        {
          kind: "p",
          text: "Chapter 2 ended on a question. Once a run has several steps, where does it keep what it knows? Chapter 1 gave half the answer. `create_agent` returned the agent's final state, and its `messages` key held the whole history. This chapter opens that state up and gives the whole desk one.",
        },
        {
          kind: "p",
          text: "Under `create_agent` runs LangGraph, which runs an agent as a graph with saved state. At its simplest, that graph has two parts. One calls the model, and the other runs the tools the model asked for. Every LangGraph graph is built from the same three pieces.",
        },
        {
          kind: "p",
          text: "The **state** is the record a graph carries between nodes, which every node reads and updates. A **node** is one function in a graph that reads the state and returns an update. An **edge** is a link that says which node runs next. The two parts of `create_agent`'s graph are nodes, and the moves between them are edges.",
        },
        {
          kind: "p",
          text: "Course 1 used both words in other senses. There a node was LlamaIndex's name for a chunk, and an edge was a relationship in a knowledge graph. In this course they always mean the parts of a LangGraph graph.",
        },
        {
          kind: "p",
          text: "A node returns only the keys it changed. LangGraph merges that update into the state. So a node never copies the whole record, and it can't overwrite a key it didn't name.",
        },
        {
          kind: "code",
          lang: "python",
          caption: "A graph with one node. Streaming the updates prints what each node returned.",
          code: `from typing import TypedDict

from langgraph.graph import END, START, StateGraph


class Tally(TypedDict):
    question: str
    word_count: int


def count(state: Tally) -> dict:
    return {"word_count": len(state["question"].split())}


graph = StateGraph(Tally)
graph.add_node("count", count)
graph.add_edge(START, "count")
graph.add_edge("count", END)
app = graph.compile()

for update in app.stream({"question": "What does PEP 572 add?"}, stream_mode="updates"):
    print(update)
# {'count': {'word_count': 5}}`,
        },
        {
          kind: "p",
          text: "That print is your debugger. With `stream_mode=\"updates\"`, LangGraph streams one entry per node, and each entry shows what that node returned. When an answer is wrong, read the entries in order. The first wrong value points at the node that wrote it. The setting `stream_mode=\"values\"` streams the whole state after each update instead.",
        },
        {
          kind: "p",
          text: "This chapter gives the PEP desk one shared state. It also builds the member chapter 1 called the triage router.",
        },
        {
          kind: "p",
          text: "As a graph node it is **triage**, the desk's first node, which picks the specialist for a question. It picks one of four routes: researcher, code advisor, writer, or `refuse` for questions that aren't about Python. Chapter 4 joins the agents behind it.",
        },
        {
          kind: "quiz",
          id: "agents03-q1",
          question: "A node in a LangGraph graph finishes. What does it return?",
          options: [
            "The complete new state, with every key.",
            "Only the keys it changed.",
            "The name of the next node, and nothing else.",
            "A message for the user.",
          ],
          answer: 1,
          explain: "A node returns a partial update. LangGraph merges it into the state, so the keys the node did not name keep the values they had.",
        },
        {
          kind: "p",
          text: "The next section asks what happens when two updates reach the same key.",
        },
      ],
    },
    {
      id: "s2-reducers",
      title: "A key with no reducer keeps only the last write",
      goal: "What happens when two writes reach one key?",
      blocks: [
        {
          kind: "p",
          text: "Two writes can reach one key. A search tool adds passages, and then a second search adds more. LangGraph needs a rule for that, and the default rule is that the new value replaces the old one.",
        },
        {
          kind: "p",
          text: "A **reducer** is the rule that merges a node's update into one state key, such as appending messages. In code it's a function that takes the old value and the new one, and returns what to keep. You attach it to a key with `Annotated`, and the key then merges its writes instead of replacing them.",
        },
        {
          kind: "code",
          lang: "python",
          caption: "Two keys with a reducer. A node that returns a list for `found` adds to the list.",
          code: `import operator
from typing import Annotated, TypedDict


class State(TypedDict):
    found: Annotated[list[str], operator.add]
    steps: Annotated[int, operator.add]`,
        },
        {
          kind: "p",
          text: "A few reducers cover most keys. `operator.add` joins two lists and adds two numbers. `add_messages`, from LangGraph, appends new messages and replaces a message that has the same id. A reducer you write yourself is an ordinary function.",
        },
        {
          kind: "p",
          text: "AskPEP needs one reducer of its own. Two searches can return the same passage. If the list held it twice, the passage would take two places, and the numbers cited in an answer would shift. `add_sources` keeps each source once, in the order first seen. You write it in lab step 2.",
        },
        {
          kind: "p",
          text: "Two nodes can also run side by side. LangGraph runs a graph in rounds, and each round runs every node that is ready.",
        },
        {
          kind: "p",
          text: "If two nodes in one round write a key with no reducer, LangGraph doesn't pick a winner. It raises `InvalidUpdateError`, and the message names the key. Treat that error as useful, because it points at a key that needs a rule.",
        },
        {
          kind: "fold",
          tone: "hood",
          title: "Why updates are applied after the round",
          text: "Every node in a round reads the same state. When they all finish, LangGraph applies their updates together, through the reducers. That is why two nodes in one round can't see each other's writes. It is also why a key without a reducer can't take two of them. LangGraph's docs call a round a super-step.",
        },
        {
          kind: "callout",
          tone: "analogy",
          title: "A whiteboard with one box per key",
          text: "Picture a whiteboard with a box for each key. Each node walks up and writes in the boxes it owns, and nobody redraws the board. A reducer is the house rule for what happens when two people write in the same box. The default rule is to wipe the box and write again.",
        },
        {
          kind: "p",
          text: "The desk's state, which the next section defines, has many keys. Three matter here. `question` holds the user's latest question. `sources` holds the passages found so far. `steps` counts the model calls a run has made, so that chapter 6 can cap them.",
        },
        {
          kind: "widget",
          id: "agents03-state-reducer",
          intro: "Each of the three keys receives two writes, one after the other. First predict which keys end wrong with the reducers picked now, then run. Next pick a reducer for each key until all three end right. Watch the question key, because the default is the right rule there.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "A reducer on every key is also a bug",
          text: "A reducer is not safety gear. A key that should hold the latest value, such as the user's question, must keep the default. Put `operator.add` on a string and two questions join into one. For each key, ask whether two writes combine or whether the newer one replaces the older.",
        },
        {
          kind: "quiz",
          id: "agents03-q2",
          question: "Two nodes run in the same round. Both write a key that has no reducer. What does LangGraph do?",
          options: [
            "Keeps the value from the node that finishes last.",
            "Keeps the value from the node that was added first.",
            "Raises InvalidUpdateError and names the key.",
            "Merges the two values into a list.",
          ],
          answer: 2,
          explain: "LangGraph refuses to pick a winner. The error names the key, so you add a reducer on purpose. Last write wins only when writes arrive one after the other.",
        },
        {
          kind: "p",
          text: "The next section lists every key the desk keeps, with its rule.",
        },
      ],
    },
    {
      id: "s3-state",
      title: "The desk state lists every key once, with its rule",
      goal: "What does the desk keep in its state, and why must every value be plain data?",
      blocks: [
        {
          kind: "p",
          text: "`DeskState` is the one record the whole desk shares. It's a `TypedDict` declared with `total=False`, so every key is optional and a node can write just its own. Each key has one type and one rule for two writes.",
        },
        {
          kind: "compare",
          caption: "The desk's keys, grouped by the rule each group follows. Some keys wait for a later chapter to fill them.",
          columns: ["Keys", "What they hold", "Rule for two writes"],
          rows: [
            ["messages", "The conversation, as chat messages.", "add_messages appends, and replaces a message with the same id."],
            ["sources", "The passages found so far, as source records.", "add_sources keeps each one once, in first-seen order."],
            ["handoffs", "The transfers between agents. Chapter 4 fills it.", "operator.add joins the lists."],
            ["steps, tokens_in, tokens_out", "Model calls, and the tokens sent and received.", "operator.add adds the numbers."],
            ["question, answer, summary", "The latest question, the final answer and a long conversation's summary. Chapter 8 fills summary.", "None. The last write wins."],
            ["route, route_reason, active_agent", "Where triage sent the question, why, and which agent holds it now.", "None. The last write wins."],
            ["started_at, stop_reason, ticket, principal", "The start time, why the run stopped, its ticket and who is asking.", "None. The last write wins."],
          ],
        },
        {
          kind: "p",
          text: "Keep the state plain. A **checkpointer** saves the state after every node, so a run can resume after a crash. Chapter 7 builds one. A checkpointer saves plain values reliably: text, numbers, lists and `TypedDict` records. A database connection or a model object wouldn't save.",
        },
        {
          kind: "p",
          text: "A checkpointer files each save under a thread. A **thread** is one conversation's saved run, found by its thread id. Triage moves the thread to an agent, and the agent's updates land in the same state.",
        },
        {
          kind: "p",
          text: "One key, `principal`, says who is asking. A **principal** is the user a run acts for, whose rights limit what it may do. In code it's a record with a `user_id` and a `role` of reader, staff or admin.",
        },
        {
          kind: "p",
          text: "This course has one owner for the one API key, and the owner is an admin. Course 3, on guardrails, maps each API key to a person and checks what that role may do.",
        },
        {
          kind: "p",
          text: "Why you'd reach for a graph at all is a common interview question.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Why a graph, when a loop would do",
          text: "An interviewer asks why you used LangGraph for this. A strong answer starts with state. The graph gives every node one typed record, a rule for merging writes, and a saved copy after each node. It then admits that one agent needs none of this, and that you add it once several agents share state.",
        },
        {
          kind: "quiz",
          id: "agents03-q3",
          question: "Which of these may go into the desk state?",
          options: [
            "An open database connection.",
            "The chat model object.",
            "A function the next node should call.",
            "A record that holds strings and numbers.",
          ],
          answer: 3,
          explain: "A checkpointer saves the state after every node, so each value must be plain data. Keep connections, models and functions outside the state, in the `Services` object you met in chapter 1.",
        },
        {
          kind: "p",
          text: "The next section shows how a tool puts what it found into `sources`.",
        },
      ],
    },
    {
      id: "s4-tools-state",
      title: "A tool that writes to state lets the answer cite what it found",
      goal: "How does a tool put what it found into the state, with numbers the answer can cite?",
      blocks: [
        {
          kind: "p",
          text: "In chapters 1 and 2 a tool returned text. The agent stored that text as a message and did nothing more. The passages sat inside the message, so no other node could use them as sources.",
        },
        {
          kind: "p",
          text: "A tool can return a `Command` instead. A `Command` is a node's or tool's return value that updates the state and names the next node at once. A tool uses only the update half, and section 5 uses the other half. Its `update` can write any key, so the passages go into `sources`.",
        },
        {
          kind: "p",
          text: "The update must also hold a `ToolMessage`, the message that carries the observation back to the model. Without it LangGraph raises an error, because the model's call would have no reply.",
        },
        {
          kind: "p",
          text: "A tool gets the run's state and ids through a `ToolRuntime` argument. The model never sees that argument. The reply message takes its id from `runtime.tool_call_id`.",
        },
        {
          kind: "p",
          text: "Citation numbers need the state too. The model cites a source as `[n]`, where `n` is the source's place in `state[\"sources\"]`, counting from 1. The tool must tell the model each `n` when it hands over the passages.",
        },
        {
          kind: "p",
          text: "`observe` does this. It turns the tool's result into source records with `source_refs`. Then it merges them into the sources already in state with `add_sources`, and reads off each passage's place. That `n` goes into each hit the model reads. LangGraph runs the same merge later, so the number the model saw is the number the list holds.",
        },
        {
          kind: "code",
          lang: "python",
          caption: "`observe` ships complete in your stub. Read it before you change `make_tools`.",
          code: `# src/askpep/agents/tools.py
def observe(runtime: ToolRuntime, name: str, result: Any, **state_update: Any) -> Command | str:
    """What the model gets back. Sources and tickets also go to state, so the wrapper returns a Command.

    The model cites a source by its \`n\`, which is its place in \`state["sources"]\`. This works out \`n\` the
    way the reducer will merge the new sources. Two search calls in one step can't see each other, so
    they can give the same \`n\` twice. The prompts tell the model to call one tool at a time.
    """
    refs = source_refs(result)
    shown = result
    if refs:
        merged = add_sources(runtime.state.get("sources", []), refs)
        place = {source_key(r): i + 1 for i, r in enumerate(merged)}
        if isinstance(result, list):
            shown = [{**item, "n": place[source_key(r)]} for item, r in zip(result, refs, strict=True)]
        else:
            shown = {**result, "n": place[source_key(refs[0])]}
        state_update["sources"] = refs
    text = json.dumps(shown, ensure_ascii=False)
    if not state_update:
        return text
    message = ToolMessage(content=text, tool_call_id=runtime.tool_call_id, name=name)
    return Command(update={"messages": [message], **state_update})`,
        },
        {
          kind: "p",
          text: "One gap remains. Two searches asked for in one model call run in the same round, so neither sees the other's sources. Both could then claim the same number, so the agents are told to call one tool at a time.",
        },
        {
          kind: "p",
          text: "Only tools that find evidence write sources. A tool error adds nothing, and linting or a version lookup returns text only.",
        },
        {
          kind: "quiz",
          id: "agents03-q4",
          question: "A tool returns a Command that updates sources, but holds no ToolMessage. What happens?",
          options: [
            "The model reads the sources anyway.",
            "LangGraph raises an error, because the model's call has no reply.",
            "The sources are dropped and the run carries on.",
            "The tool is called again with the same arguments.",
          ],
          answer: 1,
          explain: "Every tool call in the history must have a matching ToolMessage. LangGraph checks this when a tool returns a Command, and it raises an error when the message is missing.",
        },
        {
          kind: "p",
          text: "The next section uses the other half of `Command`, which picks the node that runs next.",
        },
      ],
    },
    {
      id: "s5-command",
      title: "A node can update the state and choose the next node in one return",
      goal: "How does a node choose which node runs next?",
      blocks: [
        {
          kind: "p",
          text: "So far the edges were fixed: after node A, run node B. A **conditional edge** is an edge whose target a function picks from the state. `create_agent`'s graph has one after its model node. It goes to the tools node when the reply holds tool calls, and to the end when it holds none.",
        },
        {
          kind: "p",
          text: "A conditional edge splits one decision in two. One node writes its choice into the state, and a separate function reads it back to pick the target.",
        },
        {
          kind: "p",
          text: "`Command` joins them. A node returns `Command(goto=\"writer\", update={...})`. LangGraph merges the update into the state and moves to the node named in `goto`. One function makes the decision, and it keeps the route and the reason together.",
        },
        {
          kind: "code",
          lang: "python",
          caption: "The shape of the triage node, with its body left out. The last line is the whole hand-off.",
          code: `def triage_node(svc: Services):
    ...

    def triage(
        state: DeskState, config: RunnableConfig
    ) -> Command[Literal["researcher", "code_advisor", "writer", "refuse"]]:
        ...
        return Command(goto=decision.route, update=update)

    return triage`,
        },
        {
          kind: "p",
          text: "The return annotation lists the nodes the command can reach. It doesn't change how the run behaves. It lets LangGraph draw the graph, with an edge from triage to each route.",
        },
        {
          kind: "p",
          text: "`triage_node(svc)` is a factory. It takes the services once and returns the node function. The node reads `svc` from its closure. That's how every desk node gets its models and tools without putting them in state.",
        },
        {
          kind: "p",
          text: "`decision` still has to come from a model. The next section makes that answer safe to branch on.",
        },
      ],
    },
    {
      id: "s6-structured",
      title: "Structured output turns a model's choice into a value your code can branch on",
      goal: "How does triage get a route it can trust from a model, and what happens when the model fails?",
      blocks: [
        {
          kind: "p",
          text: "Triage needs one decision from a model: a route and a reason. Free text would need parsing, and a parse fails now and then. **Structured output** is a model reply forced into a typed shape, such as a route choice. The library asks the model for that shape and checks the reply.",
        },
        {
          kind: "p",
          text: "The shape is a Pydantic class, `TriageDecision`. Its `route` field is a `Literal` of the four routes, so a reply of `planner` fails validation. Each field carries a `description` that the model reads.",
        },
        {
          kind: "code",
          lang: "python",
          caption: "A simplified view of the triage call. `TRIAGE_PROMPT` is the system prompt that describes the four routes.",
          code: `model = svc.chat("triage").with_structured_output(TriageDecision, include_raw=True)
out = model.invoke([SystemMessage(TRIAGE_PROMPT), *messages])
# out["raw"]           the model's own message, with its token counts
# out["parsed"]        a TriageDecision, or None when the reply did not fit
# out["parsing_error"] the validation error, or None`,
        },
        {
          kind: "p",
          text: "Ask for `include_raw=True`. The result is then a dictionary with `raw`, `parsed` and `parsing_error`. If the reply doesn't fit the schema, `parsed` is `None` and nothing is raised. The raw message carries the token counts, and triage adds them to `tokens_in` and `tokens_out`.",
        },
        {
          kind: "p",
          text: "A router must never drop a question. If `parsed` is `None`, or the model call raises, triage sends the question to the researcher and records why in `route_reason`. The researcher only reads, so it's the safest place for a question you couldn't place.",
        },
        {
          kind: "p",
          text: "Triage builds its structured model once, when the node is built, and reuses it for every question. This matters in tests. A scripted chat model replays its replies in order, so a fresh model for each question would start the script again.",
        },
        {
          kind: "p",
          text: "The node writes five keys. `route` and `route_reason` hold the decision. `steps` goes up by one, and the token counters go up by the model's usage. `active_agent` is the route, except for a refusal, which stays with triage because no other agent took the question.",
        },
        {
          kind: "widget",
          id: "agents03-triage-router",
          intro: "Six cases, each with a scripted model answer. Pick the route you expect triage to choose, then read the decision and the update the node returns. The last case shows a model that fails. Look at what happens to steps and active_agent in every case.",
        },
        {
          kind: "p",
          text: "Routing with a model comes up in interviews, and the follow-up is nearly always about failure.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Routing with a model, and what happens when it fails",
          text: "A strong answer uses a schema with an enum, validates the reply, and names a fallback route, so a bad reply never drops the question. It counts the router's own tokens as cost. It tests the router on labelled questions, because one wrong route sends everything after it the wrong way.",
        },
        {
          kind: "quiz",
          id: "agents03-q5",
          question: "Why does triage ask for include_raw=True?",
          options: [
            "So the model can explain its choice at length.",
            "So it also gets the model's own message, which holds the token counts.",
            "So the route is not validated.",
            "So the model call runs faster.",
          ],
          answer: 1,
          explain: "The parsed value has no token counts. The raw message does, and triage adds them to the counters so the cost of routing is counted.",
        },
        {
          kind: "p",
          text: "The next section shows the same state on a page you can open after the run.",
        },
      ],
    },
    {
      id: "s7-trace",
      title: "A LangSmith trace shows the state you printed, one node at a time",
      goal: "How do you read a run's state, node by node, after it has finished?",
      blocks: [
        {
          kind: "p",
          text: "Printing updates works on your machine. A trace, from course 1, is the record of one request's path through the system. For a graph it holds each node and each model call, with inputs, outputs, tokens and time. **LangSmith** is a hosted viewer for traces, made by the company behind LangChain.",
        },
        {
          kind: "p",
          text: "This chapter uses LangSmith as a viewer only. Course 5's LangSmith tracing chapter teaches it properly, including how to keep personal data out of a trace. Here you turn it on and read one trace.",
        },
        {
          // CHECK: LangSmith free Developer plan figures (1 seat, 5,000 base traces a month, 14-day retention), checked 20 October 2026 against docs.langchain.com/langsmith/pricing-plans. Plans change, so re-check before release.
          kind: "fold",
          tone: "industry",
          title: "What the free plan covers",
          text: "The free Developer plan has one seat and 5,000 base traces a month, and base traces last 14 days. Those figures were checked on 20 October 2026. Plans change, so look at the pricing page before you rely on them.",
        },
        {
          kind: "p",
          text: "Tracing needs no code change. LangChain and LangGraph read three environment variables when the process starts. `LANGSMITH_TRACING` set to `true` turns tracing on. `LANGSMITH_API_KEY` holds your key. `LANGSMITH_PROJECT` names the project that collects the traces. The `.env.example` in AskPEP lists all three.",
        },
        {
          // CHECK: confirm with a live LangSmith key that LANGSMITH_* set through `uv run --env-file .env` turns tracing on for the scratch graph. Settings ignores them and does not export them (checked offline on 21 October 2026).
          kind: "p",
          text: "Your `.env` file doesn't reach the process by itself. The desk's `Settings` class reads `.env` for its own fields, and it doesn't export the rest. So start Python with `uv run --env-file .env`, which exports every line first.",
        },
        {
          // CHECK: confirm where LangSmith keeps API keys and the sign-up flow in its current web app. Only the learner can do this step, because it creates an account.
          kind: "step",
          id: "agents03-s01",
          title: "Turn tracing on",
          text: "Make a free LangSmith account, and create an API key in its settings. Then set three lines in your `.env`. Keep that file out of git.",
          lang: "bash",
          file: ".env",
          code: `LANGSMITH_TRACING=true
LANGSMITH_API_KEY=paste-your-key-here
LANGSMITH_PROJECT=askpep`,
        },
        {
          kind: "step",
          id: "agents03-s02",
          title: "Write a scratch graph around triage",
          text: "This script builds your triage node and a stand-in for each of the four routes. A stand-in only writes an answer, and chapter 4 replaces them with the real agents. `build_services` leaves `chat` empty until lab step 6 of chapter 5, so the script sets it, as chapter 1's try-it did. You can delete this scratch script afterwards.",
          lang: "python",
          file: "scratch/trace_triage.py",
          code: `# scratch/trace_triage.py
from functools import partial

from langchain_core.messages import HumanMessage
from langgraph.graph import START, StateGraph

from askpep.agents.state import DeskState
from askpep.agents.triage import triage_node
from askpep.config import Settings
from askpep.providers import make_chat_model
from askpep.services import build_services

svc = build_services(Settings())
svc.chat = partial(make_chat_model, svc.settings)
graph = StateGraph(DeskState)
graph.add_node("triage", triage_node(svc))
for name in ("researcher", "code_advisor", "writer", "refuse"):
    graph.add_node(name, lambda state, name=name: {"answer": f"{name} would answer here"})
graph.add_edge(START, "triage")
desk = graph.compile()

question = "Check this for me: def add(a, b) return a + b"
out = desk.invoke({"question": question, "messages": [HumanMessage(question)]})
print(out["route"], "-", out["route_reason"])
print(out["answer"])`,
        },
        {
          kind: "step",
          id: "agents03-s03",
          title: "Run it once and open the trace",
          text: "This makes one live model call, so your Gemini setup from chapter 1 must work. The reason line is worded by the model, so yours will differ. If the route isn't the code advisor, read the trace to see why.",
          lang: "bash",
          code: "uv run --env-file .env python scratch/trace_triage.py",
          expect: `code_advisor - The user pasted code to check.
code_advisor would answer here`,
        },
        {
          // CHECK: confirm the current LangSmith trace layout: the project list, the run tree, and the names of the root run, node runs and model run. The steps below describe the layout as documented on 20 October 2026.
          kind: "p",
          text: "Open LangSmith, pick the `askpep` project and click the newest run. Read it in four moves.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "The top run is the whole graph. Its input and output are the state going in and the state coming out.",
            "Each node is a child run, in the order it ran. A node's output is the update it returned.",
            "Under triage, the model call shows the prompt, the TriageDecision it returned, the token counts and the time.",
            "Compare the route here with the one you printed. They match, because both come from the same state.",
          ],
        },
        {
          kind: "callout",
          tone: "warn",
          title: "A trace sends prompts and outputs off your machine",
          text: "The PEP text is public, so nothing here is sensitive. A client's data would be. Check the client's data rules before you turn tracing on for it. Course 5's LangSmith tracing chapter adds redaction.",
        },
        {
          kind: "quiz",
          id: "agents03-q6",
          question: "In a trace, where do you read the update that a node returned?",
          options: [
            "In the input of the top run.",
            "In the prompt of the model call.",
            "In the output of that node's own run.",
            "In the project settings.",
          ],
          answer: 2,
          explain: "A node's run shows what it got and what it returned. That output is the update LangGraph merged into the state, so the first wrong value leads you to the node that wrote it.",
        },
        {
          kind: "p",
          text: "So a run keeps what it knows in one state record, with one rule for each key. Tools write their sources into it, and triage moves the thread with a `Command`. But triage only picks an agent, and that agent answers alone. How does one agent pass the work, and what it knows, to another agent? Chapter 4 answers that.",
        },
      ],
    },
  ],
  lab: {
    title: "Build the desk's state and its triage node",
    goal: "Add `Role` and `Principal`, the sources reducer, `DeskState`, the tool wrappers that write state, and the triage node. Steps 2, 3 and 5 start from a stub in your repo that raises `NotImplementedError(\"agents-03 step N\")` until you replace it. Steps 1 and 4 edit files you wrote earlier. The tests script the models, so nothing calls a paid API.",
    minutes: 60,
    files: [
      "src/askpep/types.py",
      "src/askpep/agents/state.py",
      "src/askpep/agents/tools.py",
      "src/askpep/agents/triage.py",
      "tests/agents/test_agents03_langgraph_state.py",
    ],
    steps: [
      {
        title: "Say who is asking",
        text: "Add `Role` and `Principal` to `types.py`. `Role` is a `Literal` of `reader`, `staff` and `admin`. `Principal` is a `TypedDict` with a `user_id` string and a `role`. Keep both plain, so a checkpoint can hold them. `state.py` reads `Principal` from your file once it exists. `OWNER` in `tools.py` already holds the single API key's principal, an admin.",
        code: `# src/askpep/types.py
from typing import Literal, TypedDict  # add TypedDict to your import

# your turn: add Role, a Literal of "reader", "staff" and "admin".


class Principal(TypedDict):
    """Who is asking. Course 2 uses one owner for the single API_KEY."""

    # your turn: add user_id (a str) and role (a Role).`,
        test: "uv run pytest tests/agents/test_agents03_langgraph_state.py -k agents03_s1",
      },
      {
        title: "Merge sources without duplicates",
        text: "Write `add_sources` in `state.py`. It returns one list that holds each source once, in the order first seen. The first copy wins, and neither input changes. `None` counts as an empty list. `source_key` ships in your stub. It uses the chunk id, and falls back to the doc id, headings and text when a chunk has none.",
        code: `# src/askpep/agents/state.py
def source_key(ref: SourceRef) -> tuple:
    """Two refs are the same source when this key matches."""
    if ref["chunk_id"] is not None:
        return ("chunk", ref["chunk_id"])
    return ("text", ref["doc_id"], tuple(ref["heading_path"]), ref["text"])


def add_sources(left: Sequence[SourceRef] | None, right: Sequence[SourceRef] | None) -> list[SourceRef]:
    """The reducer for \`sources\`: keep every source once, in the order first seen. The first one wins.

    The key is the chunk id. A LocalStore chunk has none, so its doc id, headings and text stand in.
    """
    # your turn:
    # 1. Treat None on either side as an empty list.
    # 2. Walk left, then right. Keep a ref when its source_key has not been seen yet.
    # 3. Return a new list. Never change the inputs.
    raise NotImplementedError("agents-03 step 2")`,
        test: "uv run pytest tests/agents/test_agents03_langgraph_state.py -k agents03_s2",
      },
      {
        title: "Write the desk state",
        text: "Fill in `DeskState`. The docstring in your stub is a table of the fifteen keys to add, with a type and a rule for each. Use `add_sources` for `sources`. Use `operator.add` for `handoffs`, `steps`, `tokens_in` and `tokens_out`. Keep `total=False`. The tests run the state through a checkpointer, so every type must be plain.",
        code: `# src/askpep/agents/state.py
class DeskState(TypedDict, total=False):
    messages: Annotated[list[AnyMessage], add_messages]
    # your turn: add the other fifteen keys, in the order of the table in the docstring.
    # question, route, route_reason, active_agent, sources, handoffs, steps, tokens_in,
    # tokens_out, started_at, summary, answer, ticket, stop_reason, principal`,
        test: "uv run pytest tests/agents/test_agents03_langgraph_state.py -k agents03_s3",
      },
      {
        title: "Let the tools write sources",
        text: "Edit `make_tools` in `tools.py`. Give `search_peps_tool` and `read_pep_section_tool` a `runtime: ToolRuntime` argument, before any argument that has a default. Return `observe(runtime, name, result)` in place of `json.dumps(result)`. The lint and version tools stay as they are. Keep every docstring, because the model reads them. `observe` ships in your stub, and it needs your `add_sources`.",
        code: `# src/askpep/agents/tools.py
def make_tools(svc: Services) -> dict[str, BaseTool]:
    """The five tools, under their own names. \`svc\` and the runtime stay out of the model's schema."""

    @tool("search_peps", parse_docstring=True)
    def search_peps_tool(query: str, runtime: ToolRuntime, k: int = 6) -> Command | str:
        # your turn: keep the docstring, and return
        # observe(runtime, "search_peps", search_peps(svc, query, k)).
        ...

    @tool("read_pep_section", parse_docstring=True)
    def read_pep_section_tool(pep: int, section: str, runtime: ToolRuntime) -> Command | str:
        # your turn: keep the docstring, and return
        # observe(runtime, "read_pep_section", read_pep_section(svc, pep, section)).
        ...`,
        test: "uv run pytest tests/agents/test_agents03_langgraph_state.py -k agents03_s4",
      },
      {
        title: "Route with triage",
        text: "Define `TriageDecision` and `triage_node` in `triage.py`. The node builds the structured model once, and returns a `Command` whose `goto` is the route. It sets the route, its reason and the active agent, adds 1 to `steps`, and adds the tokens. With no decision, it falls back to the researcher. `TRIAGE_PROMPT`, `FALLBACK_REASON` and `_usage` ship in your stub.",
        code: `# src/askpep/agents/triage.py
class TriageDecision(BaseModel):
    """What the triage model returns."""

    # your turn: add route (a Route) and reason (a str), each with Field(description=...).


def triage_node(svc: Services):
    """Build the triage node for \`svc\`. It returns a \`Command\` whose \`goto\` is the route."""
    # your turn: ask the factory for the triage model once, here, and wrap it with
    # with_structured_output(TriageDecision, include_raw=True).

    def triage(
        state: DeskState, config: RunnableConfig
    ) -> Command[Literal["researcher", "code_advisor", "writer", "refuse"]]:
        # your turn. \`config\` is for chapter 8, so leave it unused.
        # 1. Take the question from state, or from the last message.
        # 2. Invoke the model with TRIAGE_PROMPT as a SystemMessage, then the messages.
        #    If it raises, log it and treat the result as no decision.
        # 3. If parsed is None, use TriageDecision(route="researcher", reason=FALLBACK_REASON).
        # 4. Return Command(goto=route, update={...}) with route, route_reason, active_agent,
        #    steps and the usage.
        ...

    return triage`,
        test: "uv run pytest tests/agents/test_agents03_langgraph_state.py -k agents03_s5",
      },
    ],
    verify: "uv run pytest tests/agents/test_agents03_langgraph_state.py -k agents03",
  },
  recap: [
    "A run keeps what it knows in one state record. A node returns only the keys it changed, and streaming the updates shows what each node did.",
    "A key with no reducer keeps the last write. Give a reducer to keys that combine writes, and keep the default on keys that hold the latest value.",
    "Two nodes that write one key in the same round need a reducer, or LangGraph raises an error.",
    "The desk state holds plain data, so a checkpointer can save it under the thread after every node.",
    "A tool that returns a Command writes its sources to state, and observe numbers them with the same reducer the state uses.",
    "Triage asks for a typed decision and falls back to the researcher when it gets none. It returns a Command that sets state and picks the next node.",
    "A LangSmith trace shows each node's update, so the first wrong value leads to the node that wrote it.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In LangGraph state I learned that every key needs one owner and one rule for two writes. I find a bug by reading the updates in order, in a print or a trace. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["agents-q03", "agents-q04", "agents-q20", "agents-q21"],
};

export default chapter;
