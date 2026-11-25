import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "agents-09-serving-and-alternatives",
  course: "agents",
  number: 9,
  title: "Serve the desk first, then judge a framework by how it runs in production",
  tagline: "How do I serve the desk to users, and would another framework serve it better? Stream its events over HTTP and MCP, then judge each framework by what it does when a run fails.",
  minutes: 40,
  objectives: [
    "Name the eight events a desk run streams, and say what a client does with each one.",
    "Serve the desk at POST /agent as server-sent events, and explain why a failed run is an error event inside a 200 response.",
    "Read a thread's status from its checkpoint, and say what a 404 means.",
    "Offer the desk to other agents as the ask_desk MCP tool, and say why open_ticket stays out of MCP.",
    "Judge LangGraph, Google ADK, the OpenAI Agents SDK, CrewAI and Deep Agents on the same five production questions.",
    "Say what a port to another framework keeps and what it replaces, and how the golden set proves the port.",
  ],
  sections: [
    {
      id: "s1-events",
      title: "A desk run is a stream of events a client can show as they happen",
      goal: "What does a desk run report while it works, and where does each report come from?",
      blocks: [
        {
          kind: "p",
          text: "Chapter 8 ended on a question. How do you put the desk in front of users, and is this framework the right one? So far the desk runs only from tests and the command line. This chapter serves it, first to people and then to other agents. Then it asks whether another framework would serve it better.",
        },
        {
          kind: "p",
          text: "Start with what a user sees. A desk run is a chain of model calls. Triage makes one. The researcher makes at least two, one to ask for a search and one to answer. A user who waits on a blank page for the whole chain will leave. So the desk reports its progress as it goes.",
        },
        {
          kind: "p",
          text: "PEP 572 added assignment expressions, which you write with the walrus operator `:=`. This chapter follows one question about it, 'What does PEP 572 say about the walrus operator?' Triage sends the question to the researcher. The researcher searches the PEPs and answers with a citation.",
        },
        {
          kind: "p",
          text: "Course 1 streamed answers from `/ask` as server-sent events, or SSE. Each event is a name line, a data line and a blank line. The desk streams the same way, but it has more to report than words. Each report is a `DeskEvent`, an event name with a dict of JSON-safe data. Your stub already defines it.",
        },
        {
          kind: "p",
          text: "Two names come from earlier chapters. A thread id, from chapter 3, finds one conversation's saved run, and the checkpointer keeps its history. A `DeskResult`, from chapter 4, is what `run_desk` returns. It holds the answer, the route, the citations and the `stop_reason`.",
        },
        {
          kind: "compare",
          caption: "The events of a desk run. Each name is also the SSE event name on the wire.",
          columns: ["Event", "It fires when", "Its data holds"],
          rows: [
            ["`start`", "The run begins, before any model call.", "`thread_id`."],
            ["`route`", "Triage has picked an agent.", "`route` and `reason`."],
            ["`handoff`", "One agent passes the thread to another.", "`from_agent`, `to_agent` and `reason`."],
            ["`tool_call`", "An agent's model asks for a tool.", "`agent`, `name` and `args`."],
            ["`tool_result`", "The tool has answered.", "`agent`, `name` and `ok`, which is false when the tool returned an error."],
            ["`token`", "The model writes a piece of the answer.", "`text`, one piece."],
            ["`done`", "The run has ended.", "The whole `DeskResult`, as JSON."],
            ["`error`", "The run has failed.", "`message`, one fixed sentence."],
          ],
        },
        {
          kind: "p",
          text: "A handoff needs one note. The model makes it by calling a tool named `transfer_to_<agent>`. The desk reports it as a `handoff` event and never as a `tool_call`, because a handoff passes control and is not a lookup. A refused question streams the fixed refusal sentence as one `token` event.",
        },
        {
          kind: "p",
          text: "`stream_desk(graph, question, svc=svc, thread_id=thread_id)` is a generator. It yields `start`, then calls `graph.stream` and turns what LangGraph reports into events. It asks for three **stream modes** at once, the kinds of update a LangGraph run can stream, such as state values or tokens. Each chunk arrives as a tuple of namespace, mode and data.",
        },
        {
          kind: "list",
          items: [
            "`updates` carries what each node just wrote to the state. It gives `route`, `handoff`, `tool_call` and `tool_result`.",
            "`messages` carries the model's output in small pieces. It gives `token`.",
            "`values` carries the whole state after each round of nodes. The last top-level one is the final state, which becomes `done`.",
          ],
        },
        {
          kind: "p",
          text: "The namespace says where a chunk came from. This is not chapter 8's Store namespace. It is the path of subgraphs the chunk came through. It is empty for the desk graph itself. For a chunk from inside an agent it names that agent, because each agent is a subgraph. You ask for subgraph chunks with `subgraphs=True`.",
        },
        {
          kind: "p",
          text: "The shipped helper `_update_events` already turns an `updates` chunk into events. Your job is the loop around it. Send model text as `token` events, keep the last top-level `values` chunk and finish with `done`.",
        },
        {
          kind: "p",
          text: "Two filters keep `token` clean. Only text from a node named `model` counts, so triage's routing call never streams. A chunk that carries tool-call fragments is skipped, so a call to `search_peps` never shows up as text.",
        },
        {
          kind: "widget",
          id: "agents09-event-stream",
          intro: "Four runs of the desk. The start event is already shown. Pick the event the client receives next, one event at a time. A wrong pick gives a hint, and a second wrong pick shows the answer. Watch what each event would make the client show, and where done and error fall.",
        },
        {
          kind: "p",
          text: "Two endings need care. A run that hits the recursion limit still ends with `done`, and its `stop_reason` is `recursion_limit`, as chapter 6 set up. Any other exception is logged with `log.exception`. The stream then ends with one `error` event that carries a fixed sentence.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Put no exception text in an error event",
          text: "Exception text can hold a connection string, a prompt or a user's question. The client sees one fixed sentence. The detail goes to the server log, where only operators read it.",
        },
        {
          kind: "quiz",
          id: "agents09-q1",
          question: "The researcher's model calls the tool `transfer_to_writer`. What does the client receive?",
          options: [
            "A `tool_call` event that names `transfer_to_writer`.",
            "A `handoff` event, and no `tool_call` for the transfer.",
            "A `route` event, because the writer is a route.",
            "Nothing, because handoffs are internal to the graph.",
          ],
          answer: 1,
          explain: "The helper skips tool calls whose name starts with `transfer_to_`, because a handoff passes control and is not a lookup. It reads the handoff record from the state update and sends one `handoff` event with the two agents and the reason.",
        },
        {
          kind: "p",
          text: "The desk now reports its progress as a stream of events. A browser can't call a Python generator, though. How do those events reach a client over HTTP, and what happens when a run fails halfway?",
        },
      ],
    },
    {
      id: "s2-route",
      title: "POST /agent sends the events as SSE, and a failed run is still a 200",
      goal: "How do the events reach a client over HTTP, and what does a failure look like once the stream has started?",
      blocks: [
        {
          kind: "p",
          text: "`POST /agent` runs one question and streams its events. The body is JSON with a `question`, an optional `thread_id` and an optional `graph`. The graph names the design to run, which is `handoffs`, `supervisor` or `baseline`. Chapters 4 and 5 built them. The default is `handoffs`.",
        },
        {
          kind: "p",
          text: "A Pydantic model, `AgentRequest`, checks the body before anything runs. The question must be 1 to 2000 characters. A thread id may use letters, digits and the characters `_ . : -`, up to 100 of them. A bad body gets a 422 and no model call.",
        },
        {
          kind: "p",
          text: "The thread id becomes a key in the checkpoint table and a field in your logs. A strict pattern keeps junk out of both. A newline in a thread id could forge a log line.",
        },
        {
          kind: "code",
          lang: "text",
          code: `event: start
data: {"thread_id": "th-1"}

event: tool_call
data: {"agent": "researcher", "name": "search_peps", "args": {"query": "walrus", "k": 2}}
`,
          caption: "Two frames on the wire. Each ends with a blank line.",
        },
        {
          kind: "p",
          text: "The route wraps `stream_desk` in a generator and sends each event through `sse(event, data)`, which writes one frame. A `StreamingResponse` sends the frames as they appear. Its media type is `text/event-stream`.",
        },
        {
          kind: "p",
          text: "Two headers matter. `Cache-Control: no-cache` stops caches from keeping the stream. `X-Accel-Buffering: no` asks an nginx proxy not to hold frames back. The generator is a plain `def`, not an `async def`. So Starlette, the toolkit under FastAPI, runs it in a thread pool, and a slow model call blocks no other request.",
        },
        {
          kind: "p",
          text: "Here is the hard part. The 200 status and the headers leave before the first event. After that, the server cannot change the status. So a run that fails halfway cannot become a 500. It becomes an `error` event inside a 200 response.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Read the last event, not the status code",
          text: "A 200 means only that the stream opened. The client should treat `done` as success and `error` as failure. A stream that ends with neither was cut off, and the client should treat it as a dropped connection.",
        },
        {
          kind: "p",
          text: "The route builds a graph the first time a design is asked for, then reuses it. A graph holds no per-user state. State lives in the checkpointer under the thread id. So one compiled graph serves every request, and a second request with the same thread id continues that thread.",
        },
        {
          kind: "quiz",
          id: "agents09-q2",
          question: "A run fails after the `route` event, in a call to `POST /agent`. What does the client see?",
          options: [
            "A 500 response that holds the error text.",
            "A 200 response whose last event is `error`, with a fixed message.",
            "A 200 response that ends with `done`, and a `stop_reason` of `error`.",
            "A dropped connection, with no further event.",
          ],
          answer: 1,
          explain: "The status and headers had already gone out, so the server cannot send a 500. The stream ends with one `error` event. Its message is a fixed sentence, and the real exception goes to the log.",
        },
        {
          kind: "p",
          text: "The stream works while the connection holds. Phones sleep and proxies time out, though. When a stream breaks halfway, how does the client find out how the run ended?",
        },
      ],
    },
    {
      id: "s3-status",
      title: "A thread's status comes from its checkpoint, so the server keeps no run table",
      goal: "How does a client that lost its stream recover the result, without new storage?",
      blocks: [
        {
          kind: "p",
          text: "A stream can break. A phone goes to sleep, or a proxy times out. The client still has the thread id from the `start` event. It needs a way to ask what happened to that thread.",
        },
        {
          kind: "p",
          text: "`GET /agent/{thread_id}` answers from the thread's latest checkpoint, chapter 7's saved copy of the state. It returns `thread_id`, `status`, `answer` and `stop_reason`. It needs no table of runs, because the checkpointer already saves the state after every node.",
        },
        {
          kind: "p",
          text: "`desk_status(graph, thread_id)` calls `graph.get_state(config)`. The snapshot it gets back holds `values`, the saved state, and `next`, the nodes still waiting to run. Three cases follow.",
        },
        {
          kind: "list",
          items: [
            "No saved values means nobody ran that thread. The function returns `None`, and the route answers 404.",
            "A non-empty `next` means the run stopped part-way. The status is `stopped`, the `stop_reason` is `error` and the answer is empty.",
            "Anything else goes through `result_from_state`. It gives `done` or `stopped`, with the answer and the real `stop_reason`.",
          ],
        },
        {
          kind: "callout",
          tone: "warn",
          title: "A running thread looks stopped",
          text: "While a run is in progress, its latest snapshot also has a non-empty `next`. This code cannot tell a running thread from a crashed one. Treat 'stopped with error' as 'not finished'. To carry on a crashed thread, chapter 7's `continue_desk` resumes from the same checkpoint.",
        },
        {
          kind: "p",
          text: "A 404 has two causes. The thread id was never used, or the checkpointer forgot it. With `CHECKPOINTER=memory`, which tests and fake mode use, a server restart forgets every thread. With Postgres, threads survive.",
        },
        {
          kind: "p",
          text: "The route takes a `graph` query parameter, which defaults to `handoffs`. Pass the value you started the thread with. The route reads the checkpoint through that design's graph. Like `/agent`, it needs the `X-API-Key` header. It checks nothing else, so any caller who knows a thread id can read that thread. Course 3 gives each thread an owner.",
        },
        {
          kind: "quiz",
          id: "agents09-q3",
          question: "`GET /agent/th-9` returns a 404 an hour after the server ran a thread called `th-9`. What is the most likely cause?",
          options: [
            "The thread failed, and failed threads are deleted.",
            "The server uses the in-memory checkpointer and restarted.",
            "The API key is wrong.",
            "The thread finished, and finished threads are deleted.",
          ],
          answer: 1,
          explain: "A wrong key gives a 401. Failed and finished threads both stay in the checkpointer. Only a checkpointer that forgets, such as the in-memory one after a restart, makes a known thread look unknown.",
        },
        {
          kind: "p",
          text: "People now have two surfaces: the stream while they watch, and the status route afterwards. Other agents are clients too, and they don't read event streams. How do they use the desk?",
        },
      ],
    },
    {
      id: "s4-mcp",
      title: "ask_desk gives other agents the desk through MCP, and open_ticket stays out",
      goal: "How do other agents use the desk, without a back door to its side effects?",
      blocks: [
        {
          kind: "p",
          text: "HTTP serves your own clients. Other agents, such as a coding assistant, usually speak MCP, the Model Context Protocol. Course 1 put AskPEP behind an MCP server, and chapter 2 served the desk's tools from it. It already offers `search_peps`, `read_pep_section` and `ask_peps`. This chapter adds `ask_desk`.",
        },
        {
          kind: "p",
          text: "`ask_desk(question, thread_id=None)` runs the whole desk. It returns the status, the answer, whether the desk refused, the `stop_reason`, the thread id, the sources and the ticket. A caller passes the thread id back to continue the conversation.",
        },
        {
          kind: "p",
          text: "A tool call returns one result. So `ask_desk` calls `run_desk` and waits for the end. It does not stream. A client that wants live events uses `POST /agent`. Each source in the reply holds `n`, `title` and `url`, so the calling model can cite it.",
        },
        {
          kind: "p",
          text: "The desk graph is built on the first call and reused. A `functools.cache` on a small function does it. Building the MCP server then costs nothing. A client that only calls `search_peps` never pays for a desk.",
        },
        {
          kind: "p",
          text: "`open_ticket` is not an MCP tool. It has a side effect, and an MCP client is someone else's agent. A ticket can only come from a desk run, through the writer. The reply carries a `ticket` field for that case.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "A missing tool is not a permission check",
          text: "`ask_desk` runs the desk as the owner, because every API key is the admin owner until course 3 adds roles. A client can still cause a ticket by asking for one, and the writer will open it. Course 3 adds a role check in front of it. Chapter 23 shows how to hold such an action until a person approves it.",
        },
        {
          kind: "p",
          text: "MCP connects an agent to tools. **A2A**, the Agent2Agent protocol, lets one agent call an agent that another team runs. The desk looks like one tool to its callers, so MCP fits. You would look at A2A only if another team's agent had to run a long task with the desk and follow its progress.",
        },
        {
          kind: "widget",
          id: "agents09-surface-picker",
          intro: "Five clients need something from the desk. Pick the surface each one should use: the stream at POST /agent, the status route, ask_desk over MCP, or run_desk called in the same process. Decide before you check. Then read why each one fits.",
        },
        {
          kind: "p",
          text: "How to expose an agent as an API comes up in interviews. This section and the three before it hold the whole answer.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "How do you expose a LangGraph workflow as an API?",
          text: "A strong answer gives a request schema with a thread id, a stream of events and a status route for a client that dropped. It says what a failure looks like after the stream starts: an error event and not a 500. It adds authentication and input limits. Then it says which clients use HTTP and which use MCP.",
        },
        {
          kind: "quiz",
          id: "agents09-q4",
          question: "An MCP client asks `ask_desk` to open a ticket about a wrong answer. Which statement is true today?",
          options: [
            "It fails, because `open_ticket` is not an MCP tool.",
            "The desk runs, its writer can open the ticket, and the ticket comes back in the `ticket` field.",
            "The MCP server opens the ticket directly, without the desk.",
            "The ticket waits for a person until course 3 adds roles.",
          ],
          answer: 1,
          explain: "Leaving the tool out stops direct calls. It does not stop the desk from doing its job, and the desk runs as the owner for now. Course 3 puts a role check in front of the write, and chapter 23 shows how to hold the write for a person's approval.",
        },
        {
          kind: "p",
          text: "The desk now has a surface for each kind of client. All of it runs on LangGraph, which you wired by hand. Would another framework serve it better?",
        },
      ],
    },
    {
      id: "s5-frameworks",
      title: "Each framework suits a different production constraint, and none replaces the golden set",
      goal: "Would another framework serve the desk better, judged on how it runs and not on how it demos?",
      blocks: [
        {
          kind: "p",
          text: "AskPEP runs on LangChain and LangGraph, so every comparison starts there. LangGraph gives you an explicit graph, saved state per thread, streaming and pauses for a human. You pay by writing the wiring, as this course did. Four other frameworks make different trades.",
        },
        {
          kind: "p",
          text: "Judge each one on the same five questions. A demo answers none of them.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "State. How does a run survive a crash, and how does a thread continue?",
            "Control. How are agents joined, and can you test each hop?",
            "Serving. How does a client stream the result?",
            "Deploy. Where does it run, and who operates it?",
            "Exit. What does leaving cost?",
          ],
        },
        // CHECK: confirm against the OpenAI Agents SDK docs that a handoff is a tool named transfer_to_<agent>, that Sessions, tracing and MCP support are built in, and that non-OpenAI models work through adapters.
        {
          kind: "p",
          text: "The OpenAI Agents SDK is the smallest of the four. You define an `Agent` with instructions and tools, and a `Runner` runs the loop. A handoff is a tool named `transfer_to_<agent>`, as in your desk. Sessions keep history. Tracing is built in, and MCP servers plug in as tools. It favours OpenAI models, and other providers go through adapters.",
        },
        // CHECK: confirm against the CrewAI docs the Crew and Flow split, the role, goal and backstory fields, the sequential and hierarchical processes, and built-in memory.
        {
          kind: "p",
          text: "CrewAI has two layers. A Crew is a team of agents, each with a role, a goal and a backstory. A sequential process runs their tasks in order, and a hierarchical one lets a manager agent hand them out. A Flow wraps crews and plain code with state and branching. Memory is built in.",
        },
        // CHECK: confirm against the Deep Agents docs create_deep_agent, the task tool for subagents, the filesystem tools, that write_todos is opt-in, that it runs on the LangGraph runtime, and the langchain version range it needs (1.4.6 or later, below 2).
        {
          kind: "p",
          text: "Deep Agents is a LangChain package for long, open-ended jobs. `create_deep_agent` builds an agent with a filesystem to read and write, and a `task` tool that starts subagents with their own context. A planning tool, `write_todos`, is opt-in. It runs on the LangGraph runtime, so checkpoints and streaming carry over.",
        },
        // CHECK: confirm against the Google ADK docs the google-adk package, Agent with a model, instruction and tools, tools as plain functions, output_schema with a Pydantic model, the sequential, loop and parallel workflow agents, and sessions with state.
        {
          kind: "p",
          text: "Google's Agent Development Kit, ADK, is code-first. You build an `Agent` from a model, an instruction and tools, and a tool is a plain Python function. An `output_schema` takes a Pydantic model, as your triage does. Workflow agents run subagents in sequence, in a loop or in parallel. Sessions hold state.",
        },
        // CHECK: confirm that adk api_server still serves /run_sse, and that Cloud Run, GKE and Agent Runtime are the current deploy targets. FACTS.md says Agent Engine became Agent Runtime on 22 April 2026.
        {
          kind: "p",
          text: "ADK serves over HTTP too. `adk api_server` starts a server with a `/run_sse` endpoint. For production you deploy to Cloud Run, GKE (Google's managed Kubernetes) or Agent Runtime (Google's managed runtime for agents). The desk already runs Gemini on Vertex and AskPEP already runs on Cloud Run, so ADK fits that ground.",
        },
        {
          kind: "compare",
          caption: "Five ways to run the desk, read on 21 October 2026. These are trade-offs for AskPEP and not a ranking.",
          columns: ["Tool", "Best at", "When you switch to it", "What it costs you"],
          rows: [
            [
              "LangGraph, AskPEP today",
              "Explicit graphs with saved state per thread, streaming and pauses for a human.",
              "You need runs that resume after a crash and routes you can test one by one.",
              "You write the wiring, the state and the serving yourself, as this course did.",
            ],
            [
              "Google ADK",
              "Gemini agents with a deploy path that Google operates.",
              "Your team runs on Google Cloud and wants a managed runtime.",
              "A new session and state model. Your `DeskState` reducers and Postgres checkpointer do not carry over.",
            ],
            [
              "OpenAI Agents SDK",
              "A few agents joined by handoffs, with tracing built in.",
              "Your models are OpenAI's and you want handoffs and tracing with little code.",
              "Other providers go through adapters. Its Sessions are not your LangGraph checkpoints, so saved threads do not carry over.",
            ],
            [
              "CrewAI",
              "Role-based teams that follow a process, with Flows around them.",
              "The work reads as a team with roles, and a process you can describe in a page.",
              "Behaviour hangs on role and goal text, so you prove it with the golden set. Its state differs from LangGraph's.",
            ],
            [
              "Deep Agents",
              "Long, open-ended jobs that need planning, files and subagents.",
              "A job is too big for one context window, such as a report across many PEPs.",
              "The agent plans for itself, so budgets and the golden set matter more. A PEP lookup does not need it.",
            ],
          ],
        },
        {
          kind: "p",
          text: "Read the table with the five questions. Conversation history is not the same as resuming a run at the node that failed. Ask each framework which one it gives you. Deep Agents shares LangGraph's runtime, so it has the lowest exit cost from AskPEP. The others ask you to rebuild state.",
        },
        {
          kind: "fold",
          tone: "industry",
          title: "Why this table carries a date",
          text: "Agent frameworks change names, defaults and APIs within months. This table is a reading of 21 October 2026. Recheck a framework's docs before you commit to it. The five questions stay the same.",
        },
        {
          kind: "quiz",
          id: "agents09-q5",
          question: "Which constraint is the strongest reason to look at Google ADK for AskPEP?",
          options: [
            "The team wants a managed deploy path on Google Cloud, which Google operates.",
            "You need LangGraph's checkpoints to carry over unchanged.",
            "You want agents defined by role and backstory text instead of explicit routes.",
            "You want the smallest agent loop on OpenAI models.",
          ],
          answer: 0,
          explain: "ADK's strength for this desk is the Google Cloud path, with Gemini and a managed runtime. Checkpoints that carry over point to Deep Agents. Roles and backstories point to CrewAI. A small loop on OpenAI models points to the OpenAI Agents SDK.",
        },
        {
          kind: "p",
          text: "Say a framework wins on your constraints. What would moving the desk to it cost, and how would you know the move didn't make answers worse?",
        },
      ],
    },
    {
      id: "s6-port",
      title: "A port replaces the engine and keeps the contract, so the golden set outlives the framework",
      goal: "What does a port to another framework keep, what does it replace, and what proves the answers didn't get worse?",
      blocks: [
        {
          kind: "p",
          text: "Some of AskPEP knows about LangGraph and some of it does not. `search_peps` and `read_pep_section` are plain functions that take a `Services` object and return records. The `/agent` route only reads `DeskEvent` values. A `DeskResult` has no graph in it. The golden set, the fixed questions you score answers against, grades that result.",
        },
        {
          kind: "p",
          text: "Other parts are LangGraph all through. `make_tools` wraps the functions as LangChain tools that return a `Command`. `DeskState` and its reducers are LangGraph state. `triage_node` and the handoffs are `Command` values. The checkpointer and thread ids store LangGraph checkpoints.",
        },
        {
          kind: "p",
          text: "A port that keeps `stream_desk` and `run_desk` honest keeps everything above them. They must still yield the same eight events and return a `DeskResult`.",
        },
        {
          kind: "widget",
          id: "agents09-port-map",
          intro: "Eight parts of AskPEP. For each one, decide what a port to another framework does with it. It keeps working as it is, it gets a new engine behind the same contract, or it is rewritten. Check your sorting at the end. The reasons matter more than the score.",
        },
        {
          kind: "p",
          text: "Lab step 5 ports one piece, triage, to Google ADK. It is optional and it has no test. You judge it by reading what it prints next to your LangGraph triage. Do it if you want the contrast in your hands. The course does not need it.",
        },
        {
          kind: "p",
          text: "Interviewers often ask which framework you would pick. The port is the core of a good answer, because it prices the switch.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Which agent framework would you pick, and why?",
          text: "A weak answer names a favourite. A strong answer names the constraints first: who runs it, which models, how runs resume and how clients stream. It maps a framework to each constraint and prices a switch. It names what survives a switch: the event contract and the golden set.",
        },
        {
          kind: "quiz",
          id: "agents09-q6",
          question: "You port the desk to another framework. What is the best evidence that the port did not make answers worse?",
          options: [
            "The new framework's own demo.",
            "The golden set, scored on the `DeskResult` from both engines.",
            "The number of lines you deleted.",
            "The event names in the SSE stream.",
          ],
          answer: 1,
          explain: "Two engines are compared fairly only on the same questions with the same graders. The golden set scores a `DeskResult`, and both engines return one. Event names show that the contract holds. They say nothing about quality.",
        },
        {
          kind: "p",
          text: "That closes Part 1. You built one desk on LangGraph, kept it within budget, made its side effects safe and served it. Yet the desk is one shape among many. Beyond the PEP desk, what other shapes can a multi-agent system take? Part 2 answers that, starting with chapter 10.",
        },
      ],
    },
  ],
  lab: {
    title: "Serve the desk over HTTP and MCP",
    goal: "Stream the desk's events, serve them at `POST /agent`, read a thread's status and offer `ask_desk` over MCP. Lab steps 1 and 3 start from stubs that raise `NotImplementedError(\"agents-09 step N\")`. Lab step 5 is optional and has no test. All 46 tests use the in-memory checkpointer, so they need no network and no Postgres. One lab step 2 test runs the route with fake providers, so it needs `build_chat` from lab step 6 of chapter 5.",
    minutes: 60,
    files: [
      "src/askpep/agents/graph.py",
      "src/askpep/api.py",
      "src/askpep/mcp_server.py",
      "tests/agents/test_agents09_serving_and_alternatives.py",
    ],
    steps: [
      {
        title: "Stream the run as events",
        text: "Write `stream_desk` in `graph.py`. Its stub raises `agents-09 step 1`. Yield `start`, then loop over `graph.stream` with the three stream modes. Send `updates` through `_update_events`, send model text as `token`, and keep the last top-level `values`. End with `done`. A recursion error still ends in `done`. Any other error ends in one `error` event. Add the imports the code needs.",
        code: `# src/askpep/agents/graph.py
import uuid
from dataclasses import asdict

from langchain_core.messages import AIMessageChunk
from langgraph.errors import GraphRecursionError


def stream_desk(
    graph, question: str, *, svc: Services, thread_id: str | None = None, principal: Principal | None = None
) -> Iterator[DeskEvent]:
    # your turn:
    # 1. Use the thread id you were given, or make one with uuid.uuid4().hex.
    # 2. Build the config with _config(svc, thread_id) and note the start time with time.perf_counter().
    # 3. Yield DeskEvent("start", {"thread_id": thread_id}).
    # 4. Loop over graph.stream(_turn_input(question, principal), config,
    #    stream_mode=["updates", "messages", "values"], subgraphs=True).
    #    Each chunk is (namespace, mode, data).
    # 5. Mode "updates": yield from _update_events(namespace, data).
    # 6. Mode "messages": data is (chunk, meta). Yield DeskEvent("token", {"text": chunk.text}) when
    #    meta["langgraph_node"] is "model", the chunk is an AIMessageChunk, it has no tool_call_chunks
    #    and its text is not empty.
    # 7. Mode "values" with an empty namespace: keep dict(data) as the final state.
    # 8. A GraphRecursionError: read the state with _checkpoint_values(graph, config), falling back to
    #    the last state you kept, and set stop_reason to "recursion_limit".
    # 9. Any other Exception: call log.exception("desk_stream_failed"), yield one "error" event whose
    #    message is a fixed sentence with no exception text, and return.
    # 10. Last, yield DeskEvent("done", asdict(result)), where result comes from result_from_state(state,
    #     thread_id=thread_id, latency_ms=...).
    ...`,
        test: "uv run pytest tests/agents -k agents09_s1",
      },
      {
        title: "Serve the stream at POST /agent",
        text: "Open `api.py`, the file you wrote in course 1. Add `AgentRequest` and `sse`. Inside `create_app`, add `desk_graph` and the `/agent` route, which needs the API key. A bad body gets a 422 before any model runs. A good one streams `text/event-stream`. A failure while streaming becomes an `error` frame inside a 200. Build each design's graph once. One test sends a question with `PROVIDERS=fake`, through `build_chat` from lab step 6 of chapter 5.",
        code: `# src/askpep/api.py
from askpep.agents.graph import GraphName, build_graph, stream_desk


class AgentRequest(BaseModel):
    # your turn: question is 1 to 2000 characters. thread_id is optional and matches
    # ^[A-Za-z0-9_.:-]{1,100}$. graph is a GraphName and defaults to "handoffs".
    ...


def sse(event: str, data: dict) -> str:
    # your turn: one frame is "event: <name>", then "data: <json>", then a blank line.
    ...


def create_app(settings: Settings | None = None, services: Services | None = None) -> FastAPI:
    # Inside create_app, next to the routes you already have:
    graphs: dict[str, object] = {}  # compiled desk graphs, built on first use

    def desk_graph(name: GraphName):
        # your turn: call build_graph(name, svc) the first time a name is asked for, then reuse it.
        ...

    @app.post("/agent", dependencies=[Depends(require_key)])
    def agent_route(body: AgentRequest) -> StreamingResponse:
        def events() -> Iterator[str]:
            # your turn: send every event from stream_desk through sse(). Any exception becomes
            # one error frame with a fixed message.
            ...

        # your turn: return a StreamingResponse with media type "text/event-stream" and the
        # headers Cache-Control: no-cache and X-Accel-Buffering: no.
        ...`,
        test: "uv run pytest tests/agents -k agents09_s2",
      },
      {
        title: "Read a thread's status",
        text: "Write `desk_status` in `graph.py`. Its stub raises `agents-09 step 3`. Read the checkpoint with `graph.get_state(config)`. Empty `values` returns `None`. A non-empty `next` returns a stopped record. Anything else goes through `result_from_state`. Then add `GET /agent/{thread_id}` to `api.py`. It takes a `graph` query parameter, needs the API key and answers 404 for `None`.",
        code: `# src/askpep/agents/graph.py
def desk_status(graph, thread_id: str) -> dict[str, Any] | None:
    # your turn:
    # 1. Build config = {"configurable": {"thread_id": thread_id}} and read snapshot = graph.get_state(config).
    # 2. No snapshot.values: return None.
    # 3. A non-empty snapshot.next: return {"thread_id": ..., "status": "stopped", "answer": "",
    #    "stop_reason": "error"}.
    # 4. Otherwise turn snapshot.values into a result with result_from_state(..., latency_ms=0.0)
    #    and return its thread_id, status, answer and stop_reason.
    ...`,
        test: "uv run pytest tests/agents -k agents09_s3",
      },
      {
        title: "Offer the desk over MCP",
        text: "In `mcp_server.py`, inside `build_mcp`, add `desk`, wrapped in `functools.cache`. It builds the handoff graph with `build_desk(svc)` on the first call. Import `build_desk` inside it, so building the server builds no desk. Then add the `ask_desk` tool. It runs `run_desk` and returns a dict. Add no ticket tool.",
        code: `# src/askpep/mcp_server.py
    @functools.cache  # the handoff graph, built on the first ask_desk call
    def desk():
        # your turn: import build_desk here, then return build_desk(svc).
        ...

    @mcp.tool()
    def ask_desk(question: str, thread_id: str | None = None) -> dict:
        """Ask the PEP desk, which routes the question to a researcher, a code advisor or a writer.

        Pass the thread_id from an earlier answer to continue that conversation.
        """
        # your turn: call run_desk(desk(), question, svc=svc, thread_id=thread_id). Return a dict with
        # status, answer, refused, stop_reason, thread_id, sources and ticket. Each source is a dict
        # with n, title and url.
        ...`,
        test: "uv run pytest tests/agents -k agents09_s4",
      },
      // CHECK: confirm that adk run takes a folder with an __init__.py that imports agent and an agent.py that defines root_agent.
      // CHECK: confirm that ADK reaches Vertex through GOOGLE_GENAI_USE_ENTERPRISE, GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION. FACTS.md records the 22 April 2026 renames.
      // CHECK: confirm that ADK's output_schema accepts a Pydantic model with a Literal field, such as TriageDecision.route.
      {
        title: "Optional: port triage to Google ADK (no test)",
        text: "This step has no test, and the course does not need it. It shows what a port feels like. Run `uv add google-adk`. Make a folder called `adk_triage` and put the code below in its `agent.py`. Run `uv run adk run adk_triage`. Type a PEP question, a snippet to lint and 'Write me a poem.' Compare the routes with your LangGraph triage.",
        code: `# adk_triage/agent.py
# Also make adk_triage/__init__.py with one line: from . import agent
# ADK reaches Gemini through your Google Cloud project. Set these variables first:
# GOOGLE_GENAI_USE_ENTERPRISE=1, GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION.
from google.adk import Agent

from askpep.agents.triage import TRIAGE_PROMPT, TriageDecision
from askpep.config import get_settings

root_agent = Agent(
    name="triage",
    model=get_settings().desk_model,
    instruction=TRIAGE_PROMPT,
    output_schema=TriageDecision,
)

# What you did not write: no reducers, no Command and no graph.stream.
# What you gave up: nothing sets DeskState.route, so nothing downstream reads the route.`,
      },
    ],
    verify: "uv run pytest tests/agents -k agents09",
  },
  recap: [
    "The desk streams eight kinds of event: start, route, handoff, tool_call, tool_result, token, done and error. `stream_desk` builds them from the updates, messages and values stream modes.",
    "POST /agent sends the events as SSE. A bad request is a 422 before the stream. A run that fails after the stream starts ends with an error event inside a 200.",
    "A client reads the last event, not the status code. Done is success and error is failure. A stream that ends with neither was cut off.",
    "GET /agent/{thread_id} reads the checkpoint. A 404 means the thread never ran, or the checkpointer forgot it. A running thread and a crashed one look alike.",
    "ask_desk gives MCP clients the whole desk as one tool, and builds the graph on first use. open_ticket stays out of MCP, and the desk runs as the owner until course 3.",
    "Judge a framework on state, control, serving, deploy and exit cost. A port replaces the engine and keeps the contract, and the golden set judges the result.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In serving and alternatives I learned that a desk run is a stream of events. A failed run is an error event inside a 200 response. A framework port keeps the contract and replaces the engine. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["agents-q11", "agents-q12", "agents-q19"],
};

export default chapter;
