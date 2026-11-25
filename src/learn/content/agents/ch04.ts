import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "agents-04-handoffs",
  course: "agents",
  number: 4,
  title: "A handoff passes control and context to the next agent in one tool call",
  tagline: "How does one agent pass the work, and what it knows, to another agent? With a handoff: one tool call that moves both.",
  minutes: 50,
  objectives: [
    "Say what a handoff moves, and why control and context must move together.",
    "Write the `Command` a transfer tool returns, and say what `graph=Command.PARENT` does.",
    "List what a handoff update must carry, and name what breaks when each part is missing.",
    "Wire a desk graph with no edge out of any agent, and predict what a static edge would add.",
    "Read a run as a trajectory of tool calls, handoffs and one answer, and run the desk from the command line.",
  ],
  sections: [
    {
      id: "s1-control-and-context",
      title: "A handoff must move control and context together, or the next agent starts blind",
      goal: "What has to move when one agent passes the work to another?",
      blocks: [
        {
          kind: "p",
          text: "Chapter 3 ended on a question. How does one agent pass the work, and what it knows, to another agent? So far you have built triage and the researcher. Triage reads a question and picks one agent, and that agent answers alone. This works until a question needs a tool the agent doesn't hold.",
        },
        {
          kind: "p",
          text: "The desk's three agents each hold their own tools. The researcher holds `search_peps` and `read_pep_section`. The code advisor holds `lint_snippet`, `python_feature_version` and `search_peps`. The writer holds `open_ticket`, which is a stub until chapter 7 writes it.",
        },
        {
          kind: "p",
          text: "Take this question: which Python version added the walrus operator, `:=`? The researcher can find PEP 572 with `search_peps`. The version sits in the PEP header, and `python_feature_version` from chapter 2 reads it. The researcher doesn't hold that tool. The code advisor does.",
        },
        {
          kind: "p",
          text: "A **handoff** is a tool call that moves control to another agent and passes context in the same step. The agent calls a tool named `transfer_to_<agent>`, such as `transfer_to_code_advisor`. The table `ALLOWED_TOOLS`, in your stub, lists every tool each agent gets. The researcher can hand to the code advisor and to the writer.",
        },
        {
          kind: "p",
          text: "**Control** is which agent runs next. **Context** is what that agent receives to work with, such as the messages and the sources. Move control alone and the next agent starts blind. Move context alone and nothing runs. The transfer tool does both in one return value.",
        },
        {
          kind: "p",
          text: "You have met that return value. In chapter 3 your tools returned a `Command` to write sources into state, and triage returned one to pick a route. Its `update` writes to the desk state. Its `goto` names the next node. A handoff tool sets both.",
        },
        {
          kind: "code",
          lang: "python",
          code: `Command(
    goto="code_advisor",  # control: the node that runs next
    update={...},         # context: what the next agent sees
)`,
          caption: "The two halves of a handoff. The next section adds a third field.",
        },
        {
          kind: "callout",
          tone: "analogy",
          title: "A shift handover",
          text: "A nurse handing over a ward passes on the patient list and the charts, along with the keys. A handoff that moves control without context is the keys without the charts. The next shift can open every door and knows nothing about the patients.",
        },
        {
          kind: "quiz",
          id: "agents04-q1",
          question: "The researcher calls `transfer_to_writer`. What does that one call move?",
          options: [
            "Only control. The writer starts with an empty conversation.",
            "Control and context. The writer runs next, and it sees the messages and the sources.",
            "Only context. The researcher still decides who runs next.",
            "Nothing yet. The graph decides later which agent runs.",
          ],
          answer: 1,
          explain:
            "A handoff is one return value. It sets who runs next and what that agent sees. Control alone leaves the writer blind, and context alone runs nothing.",
        },
        {
          kind: "p",
          text: "A transfer tool runs inside an agent, though, and not in the desk graph itself. The next section shows what that changes.",
        },
      ],
    },
    {
      id: "s2-subgraph",
      title: "An agent is a subgraph, so a handoff must name the parent graph",
      goal: "Why does a handoff's `Command` have to name the parent graph?",
      blocks: [
        {
          kind: "p",
          text: "Each desk agent comes from `create_agent`, through chapter 1's `create_desk_agent`. As chapter 3 showed, `create_agent` returns a graph of its own with two nodes. The `model` node calls the model. The `tools` node runs the tools the model asked for. The two loop until the model answers.",
        },
        {
          kind: "p",
          text: "The desk graph adds each agent as one node. A **subgraph** is a graph that runs as one node inside a parent graph. So each agent is a subgraph, and the desk graph is its parent. Inside the researcher's graph, a `goto` can name `model` or `tools`. It can't name `writer`, because the writer is a node of the parent.",
        },
        {
          kind: "p",
          text: "So the `Command` carries a third field. `graph=Command.PARENT` says that the `goto` and the `update` belong to the parent graph. The researcher's graph stops, and the parent runs the writer.",
        },
        {
          kind: "code",
          lang: "python",
          code: `# src/askpep/agents/tools.py
def make_handoff_tool(to: AgentName) -> BaseTool:
    @tool(f"transfer_to_{to}")
    def transfer(reason: str, runtime: ToolRuntime) -> Command:
        ...
        return Command(goto=to, update=update, graph=Command.PARENT)`,
          caption: "The shape of the handoff tool. The value of to is researcher, code_advisor or writer.",
        },
        {
          kind: "p",
          text: "`make_handoff_tool` builds one such tool for each target. The `@tool` decorator takes the tool's name. The model fills in `reason` only. LangChain fills in `runtime`, so the model never sees it. You met `ToolRuntime` in chapter 3. It holds the agent's current state as `runtime.state`, and the id of this call as `runtime.tool_call_id`.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "A handoff without the parent still looks like a success",
          text: "Leave out `graph=Command.PARENT` and the tool reply still says `Transferred to writer`. The `goto` points at a node the researcher's own graph doesn't have. The researcher carries on alone, and the writer never runs. After a handoff, check that the target agent ran.",
        },
        {
          kind: "quiz",
          id: "agents04-q2",
          question:
            "A transfer tool returns `Command(goto=\"writer\", update=update)` with no `graph` argument. What happens in the desk?",
          options: [
            "The writer runs, because the `goto` names a node in the desk.",
            "LangGraph refuses to compile the desk.",
            "The researcher carries on alone, the writer never runs, and the tool reply still says `Transferred to writer`.",
            "The desk graph ends at once with the researcher's answer.",
          ],
          answer: 2,
          explain:
            "With no `graph`, the `goto` is looked up in the researcher's own graph, which has no writer. The agent's loop carries on. The reply the model read says the transfer worked, so nothing in the transcript warns you.",
        },
        {
          kind: "p",
          text: "Only the update crosses into the parent. The next section asks what it must carry.",
        },
      ],
    },
    {
      id: "s3-the-update",
      title: "The update must carry everything the agent produced, because nothing else survives",
      goal: "What must the update carry, and what breaks when a part is missing?",
      blocks: [
        {
          kind: "p",
          text: "When the handoff leaves for the parent, the researcher's graph is abandoned. Only the `update` reaches the desk state. Anything the researcher found and left out of the update is gone for good.",
        },
        {
          kind: "p",
          text: "The desk's update has six parts. Each one protects something the next agent needs.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "`messages`: every message the agent holds, plus a reply to each of its tool calls. Without them the writer sees only the question.",
            "`sources`: the PEP passages the agent found. An answer cites a source as `[n]`, where n is its place in the list. Without the sources, `[1]` points at nothing.",
            "`steps`, `tokens_in` and `tokens_out`: what the agent added to the counters. Without them the desk under-counts.",
            "`handoffs`: one record of who passed to whom, and why.",
            "`active_agent`: the agent that now holds the thread.",
            "`ticket`: the ticket the agent opened, if it opened one.",
          ],
        },
        // CHECK: that Gemini, through langchain-google-genai, rejects a conversation in which a tool call has no reply.
        {
          kind: "p",
          text: "The messages carry one more rule. Every tool call needs a reply, which is a `ToolMessage` with the same call id. The transfer call gets `Transferred to writer`, built with `runtime.tool_call_id`. A model API rejects a conversation in which a call has no reply.",
        },
        {
          kind: "p",
          text: "A model can ask for two tools in one model call. Say it asks for `search_peps` and `transfer_to_writer` together. The handoff answers the search call too. Its reply has `status=\"error\"` and says the call was skipped. Every call then has a reply.",
        },
        {
          kind: "p",
          text: "The update resends all of the agent's messages, including some the parent already holds. Nothing appears twice. The `add_messages` reducer merges by message id, so a resent message replaces itself.",
        },
        {
          kind: "p",
          text: "The counters need care. `steps`, `tokens_in` and `tokens_out` add up across the run, because `operator.add` is their reducer. A subgraph starts with the parent's counters. Triage has counted one call, so the researcher starts at one. If it sent back its own totals, the desk would count triage's call twice.",
        },
        {
          kind: "p",
          text: "So `UsageMiddleware`, the middleware from chapter 1, keeps the books. When an agent starts, it records the counters under the key `entry`. It adds each model call as it happens. `usage_delta(state)` returns the counters minus `entry`, which is what this agent added.",
        },
        {
          kind: "p",
          text: "An agent that finishes normally has its `entry` subtracted on the way out. A handoff leaves early, so it sends the difference itself. This also holds when an agent runs twice in one run, as when the writer hands back to the researcher.",
        },
        {
          kind: "p",
          text: "Here is the whole update, as the reference code sends it. The variable `messages` holds the agent's own messages. The variable `replies` holds the transfer reply and any skipped replies. The ticket goes in only when the agent opened one.",
        },
        {
          kind: "code",
          lang: "python",
          code: `# src/askpep/agents/tools.py
update: dict[str, Any] = {
    "active_agent": to,
    "handoffs": [Handoff(from_agent=state.get("active_agent", "triage"), to_agent=to, reason=reason)],
    "sources": state.get("sources", []),
    "messages": [*messages, *replies],
    **usage_delta(state),
}
if state.get("ticket"):
    update["ticket"] = state["ticket"]
return Command(goto=to, update=update, graph=Command.PARENT)`,
          caption: "The update the reference handoff sends.",
        },
        {
          kind: "widget",
          id: "agents04-handoff-update",
          intro:
            "A run is in progress. The researcher has found two passages on PEP 572 and is about to call `transfer_to_writer`. Build the update it sends, then run the handoff and read what the writer gets. Predict first. For each field, ask what breaks if it is missing. Check the counters twice, because two of the three choices give wrong totals.",
        },
        // CHECK: that the LangChain handoff example sends only the last AI message and the transfer reply.
        {
          kind: "fold",
          tone: "industry",
          title: "The LangChain docs example sends less",
          text: "The LangChain docs show a handoff whose update holds the last AI message and the transfer reply. That keeps the next agent's context short, and it drops the research. The desk sends everything, because the writer has to see the passages the researcher read.",
        },
        {
          kind: "quiz",
          id: "agents04-q3",
          question:
            "The researcher's model asks for `search_peps` and `transfer_to_writer` in the same model call. What does the handoff do with the search call?",
          options: [
            "Nothing. The search call is dropped from the history.",
            "It runs the search, then transfers.",
            "It answers the search call with an error reply that says it was skipped, so every call has a reply.",
            "It raises an error, because one model call can't ask for two tools.",
          ],
          answer: 2,
          explain:
            "The agent's graph is abandoned before the search runs. The call still sits in the history, and a call with no reply breaks the next model call. A skipped reply with `status=\"error\"` keeps the history whole.",
        },
        {
          kind: "p",
          text: "The update decides what the next agent sees. The next section wires the graph that decides where the run goes.",
        },
      ],
    },
    {
      id: "s4-no-edges-out",
      title: "No edge leaves an agent, because each handoff names the next node",
      goal: "How does the desk graph move between agents with no edge out of any of them?",
      blocks: [
        {
          kind: "p",
          text: "`build_desk` makes a `StateGraph` over `OwnedDeskState` and adds five nodes: `triage`, `researcher`, `code_advisor`, `writer` and `refuse`. Each agent comes from `build_agent`. It picks the agent's tools from `ALLOWED_TOOLS` and passes them to `create_desk_agent`.",
        },
        {
          kind: "p",
          text: "`refuse` is a plain function. It writes `REFUSAL`, the fixed refusal text from course 1, and ends the run.",
        },
        {
          kind: "p",
          text: "`OwnedDeskState` is `DeskState` with one more key, `owner`, and your stub ships it complete. Course 3, on guardrails, uses `owner` to keep a thread to the caller who started it. Until then the key only rides along in the state.",
        },
        {
          kind: "p",
          text: "Only two edges exist. One runs from `START`, the entry point, to `triage`. One runs from `refuse` to `END`, the exit. Triage returns `Command(goto=route)`, so it picks its own next node. The agents have no edge out, because their handoff `Command`s pick the next node. A run ends when an agent answers without calling a transfer tool.",
        },
        {
          kind: "code",
          lang: "python",
          code: `# src/askpep/agents/graph.py
def build_desk(svc: Services, *, checkpointer=None, store=None):
    graph = StateGraph(OwnedDeskState)
    graph.add_node("triage", triage_node(svc))
    graph.add_node("researcher", build_researcher(svc))
    graph.add_node("code_advisor", build_code_advisor(svc))
    graph.add_node("writer", build_writer(svc))
    graph.add_node("refuse", refuse_node)
    graph.add_edge(START, "triage")
    graph.add_edge("refuse", END)
    return compile_desk(svc, graph, checkpointer=checkpointer, store=store)`,
          caption: "The desk graph. The checkpointer from chapter 3 is optional. So is the store, and chapter 7 fills it.",
        },
        {
          kind: "p",
          text: "You might add `graph.add_edge(\"researcher\", \"writer\")` so that the writer always has the last word. Leave it out. That is a static edge, an edge whose target never changes. It fires every time the researcher finishes, whether it handed over or answered.",
        },
        {
          kind: "p",
          text: "Recall from chapter 3 that LangGraph runs a graph in rounds. Each round runs every node that is ready, then merges their updates. A key with no reducer takes one write per round, and `question` has none.",
        },
        {
          kind: "p",
          text: "Now picture the researcher handing to the code advisor with that edge in place. The `Command` makes the code advisor ready, and the edge makes the writer ready. Both run in the next round. Each agent hands its whole state back when it finishes, so both write `question`. LangGraph raises `InvalidUpdateError`.",
        },
        {
          kind: "widget",
          id: "agents04-edge-or-command",
          intro:
            "Three runs follow. Each mixes an edge and a handoff in a different way. For each, predict what runs after the researcher, then check. Watch which nodes light up. In the last case, count how many nodes become ready in a single round.",
        },
        {
          kind: "compare",
          caption: "Three ways to pick the next node",
          columns: ["Form", "Who decides", "When it fires"],
          rows: [
            ["Static edge", "You, in the graph", "Every time the node finishes"],
            ["Conditional edge", "A routing function that reads the state", "When the node finishes, and the function picks one target"],
            ["`Command(goto=...)`", "The node, or a tool the node calls", "Only when that node returns it"],
          ],
        },
        {
          kind: "quiz",
          id: "agents04-q4",
          question: "Why does `build_desk` add no edge out of the researcher?",
          options: [
            "LangGraph forbids edges out of a subgraph.",
            "A handoff already names the next node. An edge would fire on every finish as well, so a second node could run in the same round.",
            "An edge would end the run before the researcher answers.",
            "The researcher never finishes a run.",
          ],
          answer: 1,
          explain:
            "A `Command` picks the next node when the agent hands over. A static edge adds a second route that fires every time. With a handoff and an edge together, two agents run in one round and collide on `question`.",
        },
        {
          kind: "p",
          text: "The graph now runs, but what it leaves behind is a long list of messages. The next section turns that list into something you can read.",
        },
      ],
    },
    {
      id: "s5-trajectory",
      title: "A trajectory turns the messages of a run into a list you can read",
      goal: "How do you see what a run did, and run the desk yourself?",
      blocks: [
        {
          kind: "p",
          text: "A finished run leaves a long message list, and you rarely want to read it raw. A trajectory, from course 1, is the sequence of searches and tool calls an agent made. On the desk it also holds the handoffs and the answer.",
        },
        {
          kind: "p",
          text: "`trajectory_from_state` builds it as a list of `TrajectoryStep` records. There is one for each tool call, one for each handoff and one for the answer. Each record names its agent, its kind (`tool`, `handoff` or `answer`), the tool and whether it worked.",
        },
        {
          kind: "p",
          text: "Three rules shape it. It reads only the messages after the last human message, which are what the desk did for this question. The agent is the `name` on the AI message, and a message with no name belongs to triage. A record is ok when its reply exists, isn't marked `error` and isn't a `ToolError` from chapter 1.",
        },
        {
          kind: "p",
          text: "The answer is the last AI message that has text and no tool calls. That is why `refuse_node` signs its message `triage`. The trajectory then shows who refused.",
        },
        {
          kind: "p",
          text: "`run_desk` runs one question. It makes a thread id when you give none, invokes the graph and times the run. It returns a `DeskResult`, which holds the answer, the citations, the sources, the trajectory and the counters.",
        },
        {
          kind: "p",
          text: "`_turn_input` ships complete. It resets the counters and the handoffs, so the counts cover one question. It leaves the messages and the sources alone, so a second question on the same thread sees the first. `askpep desk ask` is the command-line way in. Pass `--thread` to continue a conversation.",
        },
        {
          kind: "p",
          text: "Every test in this chapter runs offline. A `ScriptedChatModel` replays the messages you give it, with one script for each agent role. A role with no script fails the test if the desk calls it. So a test can prove that the writer never ran.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "A scripted model hides a missing reply",
          text: "The scripted model accepts any message list. A handoff update with no reply to the transfer call passes offline and fails against a real model. Lab step 1's tests check the message kinds for that reason. After your first live run, read the trajectory once.",
        },
        {
          kind: "p",
          text: "Interviewers often probe what a handoff passes, as the follow-up to a design question.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "How an interviewer probes a handoff",
          text: "Design a multi-agent research pipeline, they say. Then: what does the second agent see when the first hands over? A strong answer names the update. It carries the history with a reply to the transfer call, the sources, only the counters the agent added, and the handoff record. Then it names what each omission breaks.",
        },
        {
          kind: "quiz",
          id: "agents04-q5",
          question:
            "A handoff update omits the reply to the transfer call. The offline tests pass, but the live desk fails at the writer's first model call. Why did the tests pass?",
          options: [
            "The scripted model replays its messages and accepts any history.",
            "Scripted models retry a failed call until it works.",
            "Tests skip the handoff tool.",
            "The checkpointer repairs the history.",
          ],
          answer: 0,
          explain:
            "A scripted model never checks the history it is given. A real model API does, and it rejects a call with no reply. That is why lab step 1's tests check the kinds of the messages in the update.",
        },
        {
          kind: "p",
          text: "So the desk now passes a question from agent to agent, and each handoff carries what the next agent needs. But triage and every handoff add model calls, and each call costs time and money. Is a team of agents better than one agent holding every tool? Chapter 5 answers that.",
        },
      ],
    },
  ],
  lab: {
    title: "Build the handoffs of the PEP desk",
    goal: "Write the handoff tool, the two new agents, the refusal, the desk graph, the trajectory and `run_desk`. Each step starts from a stub that raises `NotImplementedError(\"agents-04 step N\")`. The tests script the models, so nothing calls Gemini. Run them from your AskPEP workspace root. Then compare your files with `capstone/src/askpep/agents/` in the my-learn folder.",
    minutes: 75,
    files: [
      "src/askpep/agents/tools.py",
      "src/askpep/agents/advisor.py",
      "src/askpep/agents/writer.py",
      "src/askpep/agents/graph.py",
      "src/askpep/cli.py",
      "tests/agents/test_agents04_handoffs.py",
    ],
    steps: [
      {
        title: "Write the handoff tool",
        text: "Write `make_handoff_tool` in `tools.py`. It returns a tool named `transfer_to_<agent>` that takes a `reason`. The tool returns a `Command` to the parent graph, and its update carries everything the agent produced. Add the imports the comments list. The stub raises `agents-04 step 1`.",
        code: `# src/askpep/agents/tools.py
# Add these imports. HANDOFF_HELP and agent_tools already ship in your stub.
#   from langchain.tools import ToolRuntime, tool         (add tool to your existing line)
#   from langchain_core.messages import AIMessage, ToolMessage   (add AIMessage)
#   from askpep.agents.state import Handoff               (beside AgentName)
#   from askpep.agents.usage import usage_delta


def make_handoff_tool(to: AgentName) -> BaseTool:
    @tool(f"transfer_to_{to}")
    def transfer(reason: str, runtime: ToolRuntime) -> Command:
        """Hand the conversation to another agent. Give a short reason."""
        state = runtime.state
        messages = list(state["messages"])
        # your turn:
        # 1. Take the tool calls of the last AIMessage in messages. Each call is a dict with "id" and "name".
        # 2. Reply to this call with ToolMessage(content=f"Transferred to {to}",
        #    tool_call_id=runtime.tool_call_id, name=f"transfer_to_{to}").
        # 3. Reply to every other call of that turn with status="error" and the text
        #    "Skipped. The conversation was handed over first."
        # 4. Build the update: active_agent, one Handoff record, the sources, all the messages plus
        #    the replies, and usage_delta(state). Add the ticket only when the state has one.
        update: dict[str, Any] = ...
        return Command(goto=to, update=update, graph=Command.PARENT)

    # your turn: after the function, set transfer.description from HANDOFF_HELP[to].
    # Name the target in words, so code_advisor reads as "code advisor".
    return transfer`,
        test: "uv run pytest tests/agents -k agents04_s1",
      },
      {
        title: "Build the code advisor and the writer",
        text: "Write `build_code_advisor` in `advisor.py` and `build_writer` in `writer.py`. Each calls `build_agent`, as the researcher does. The prompts ship in your stubs. The tools come from `ALLOWED_TOOLS`, so the writer has no lint tool and the advisor has no ticket tool. The stubs raise `agents-04 step 2`.",
        code: `# src/askpep/agents/research.py
# The researcher ships complete. Copy its shape into advisor.py and writer.py.
def build_researcher(
    svc: Services,
    *,
    tools: dict[str, BaseTool] | None = None,
    handoffs: bool = True,
    checkpointer: Any = None,
):
    return build_agent(
        svc, "researcher", RESEARCHER_PROMPT, tools=tools, handoffs=handoffs, checkpointer=checkpointer
    )

# your turn: the same body in advisor.py, with "code_advisor" and ADVISOR_PROMPT,
# and in writer.py, with "writer" and WRITER_PROMPT.
# Both files need: from askpep.agents.factory import build_agent`,
        test: "uv run pytest tests/agents -k agents04_s2",
      },
      {
        title: "Write the refusal",
        text: "Write `refuse_node` in `graph.py`. It returns three keys. `messages` holds an `AIMessage` with the fixed `REFUSAL` text, signed `triage`. `answer` holds the same text. `stop_reason` is `refused`. Add `AIMessage` to your imports. The stub raises `agents-04 step 3`.",
        code: `# src/askpep/agents/graph.py
def refuse_node(state: DeskState) -> dict[str, Any]:
    """The route for questions the desk won't answer. It writes the fixed refusal and ends the run."""
    # your turn: return the three keys. Sign the message name="triage",
    # so the trajectory in step 5 can tell who refused.
    ...`,
        test: "uv run pytest tests/agents -k agents04_s3",
      },
      {
        title: "Wire the desk graph",
        text: "Write `build_desk` in `graph.py`. Add the five nodes and two edges: `START` to `triage`, and `refuse` to `END`. Add no edge out of an agent. Build it over `OwnedDeskState`. Return `compile_desk(...)`, which ships complete. The stub raises `agents-04 step 4`.",
        code: `# src/askpep/agents/graph.py
def build_desk(svc: Services, *, checkpointer=None, store=None):
    graph = StateGraph(OwnedDeskState)
    graph.add_node("triage", triage_node(svc))
    # your turn: add the researcher, code_advisor, writer and refuse nodes, then the two edges.
    # Imports: StateGraph, START and END from langgraph.graph; OwnedDeskState from askpep.agents.state;
    # triage_node from askpep.agents.triage; the three builders; compile_desk from askpep.agents.factory.
    return compile_desk(svc, graph, checkpointer=checkpointer, store=store)`,
        test: "uv run pytest tests/agents -k agents04_s4",
      },
      {
        title: "Build the trajectory of a run",
        text: "Write `trajectory_from_state` in `graph.py`. It reads the messages after the last human message, which `current_turn` returns. It gives one `TrajectoryStep` for each tool call, one for each handoff and one for the final answer. The agent is the name on the AI message. The stub raises `agents-04 step 5`.",
        code: `# src/askpep/agents/graph.py
def trajectory_from_state(state: Mapping[str, Any]) -> list[TrajectoryStep]:
    """The tool calls, handoffs and final answer of the current turn, in order, with the agent for each.

    The agent is the name on the AI message. A tool counts as ok when its result is not an error.
    """
    # your turn:
    # 1. turn = current_turn(list(state.get("messages", []))). It ships complete.
    # 2. replies = every ToolMessage of the turn, keyed by its tool_call_id.
    # 3. last_answer = the index of the last AI message that has text and no tool calls, or -1.
    # 4. For each AI message, agent = message.name or "triage". Add one step for each call.
    #    The kind is "handoff" when the name starts with "transfer_to_", else "tool".
    #    ok comes from _reply_ok(replies.get(call["id"])).
    # 5. At index last_answer, add TrajectoryStep(agent, "answer", "answer", {}, True).
    ...`,
        test: "uv run pytest tests/agents -k agents04_s5",
      },
      {
        title: "Run the desk and add the command",
        text: "Write `run_desk` in `graph.py`, then the `desk ask` command in `cli.py`. `run_desk` makes a thread id when none is given, times the run and returns `result_from_state`. The command prints the answer, the citations, the thread id and the trajectory. The stub raises `agents-04 step 6`.",
        code: `# graph.py. Add import uuid at the top.
def run_desk(
    graph, question: str, *, svc: Services, thread_id: str | None = None, principal: Principal | None = None
) -> DeskResult:
    # your turn:
    # 1. thread_id = thread_id or uuid.uuid4().hex
    # 2. Start a timer with time.perf_counter().
    # 3. state = dict(graph.invoke(...)), with _turn_input(question, principal) and _config(svc, thread_id).
    # 4. Work out the elapsed milliseconds.
    # 5. Return result_from_state(state, thread_id=thread_id, latency_ms=elapsed_ms).
    ...


# cli.py. Add this beside your other commands.
desk_app = typer.Typer(no_args_is_help=True, help="Run the multi-agent PEP desk.")
app.add_typer(desk_app, name="desk")


@desk_app.command("ask")
def desk_ask(
    question: str,
    thread: Annotated[str, typer.Option("--thread", help="Continue this thread. Default: a new one.")] = "",
) -> None:
    """Run the desk on one question and print the answer, its sources and what the agents did."""
    # your turn: import build_desk and run_desk, open the services, and run the question with
    # thread_id=thread or None. Then print the answer, one line per citation with its heading path
    # and url, a line with the thread id, and a line with the trajectory as agent:name pairs.
    ...`,
        test: "uv run pytest tests/agents -k agents04_s6",
      },
    ],
    verify: "uv run pytest tests/agents -k agents04",
  },
  recap: [
    "A handoff is a tool call that returns one `Command`, which moves control and context together.",
    "An agent is a subgraph, so the handoff needs `graph=Command.PARENT` to reach the desk graph.",
    "The update carries every message with a reply to each call, the sources, the counters the agent added and the handoff record.",
    "Send only what the agent added to the counters, or the desk counts triage twice.",
    "Give the agents no edge out. An edge fires on every finish and can run two nodes in one round.",
    "A trajectory turns the messages of a run into tool calls, handoffs and one answer.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In handoffs I learned that one return value moves control and context together. Anything the update leaves out is lost when the agent's graph is abandoned. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["agents-q22"],
};

export default chapter;
