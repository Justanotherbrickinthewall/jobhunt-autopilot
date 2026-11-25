import type { Chapter } from "../types";

const chapter: Chapter = {
  "id": "agents-10-architecture-map",
  "course": "agents",
  "number": 10,
  "title": "Agent architectures differ in who picks the next step and who owns the state",
  "tagline": "There are many agent architectures, so what actually tells them apart?",
  "minutes": 60,
  "objectives": [
    "Tell a workflow from an agent by asking who picks the next step.",
    "Name the four owners of state, and say what a task ID and shared state are for.",
    "Place eleven architectures on the two axes, and find the chapter that builds each one.",
    "Answer a design question by naming the two axes before any pattern.",
    "Build the by-hand kit and run its demo offline.",
    "Say what a scripted run proves and what it can't."
  ],
  "sections": [
    {
      "id": "s1-the-line",
      "title": "A workflow and an agent differ in who picks the next step",
      "goal": "What separates a workflow from an agent?",
      "blocks": [
        {
          "kind": "p",
          "text": "Part 1 ended on a question. Beyond the PEP desk, what other shapes can a multi-agent system take? There are many, and each framework names them its own way. So this chapter asks what actually tells them apart. The answer is two questions, and together they place any design you'll meet."
        },
        {
          "kind": "p",
          "text": "Part 1 built the desk on LangGraph, so you used a framework before you saw inside one. Part 2 opens it up. Each chapter builds one architecture by hand in plain Python, so you can see what the framework hides. This chapter draws the map, then builds the small kit that every later chapter uses."
        },
        {
          "kind": "p",
          "text": "Start with the line most framework docs draw. Chapter 1 defined a workflow as code that fixes the steps and their order, with a model inside some steps. An agent is an LLM that chooses its next action in a loop. In a workflow code decides the path, and in an agent the model does."
        },
        {
          "kind": "p",
          "text": "Everything in between is a question of how much the model decides. That gives the map its first axis: who picks the next step? Here the next step means whatever the run does next. It might call a tool, pass the work to another agent or stop."
        },
        {
          "kind": "p",
          "text": "The answer can be code, or the model, or the model choosing one label from a list that code wrote. The model may also decide when the run ends, or it may not. A model that picks the tools and says when it's done holds the most control."
        },
        {
          "kind": "callout",
          "tone": "insight",
          "title": "Labelling is not steering",
          "text": "A model that returns the word `research` from a list of three words has picked a label. Code still owns the path, because code decides what each label does. A model that calls any tool it likes, and says when it is done, owns the path. Most of the design risk sits in that second case."
        },
        {
          "kind": "widget",
          "id": "agents10-who-picks",
          "intro": "Nine designs follow. Sort each one by who picks the next step, and predict before you check. Watch the three that use a model and still leave code in charge of the path."
        },
        {
          "kind": "quiz",
          "id": "agents10-q1",
          "question": "A router asks the model to return `research`, `code` or `refuse`. Code then runs the branch for that label. Which description fits?",
          "options": [
            "An agent, because a model made a decision.",
            "A workflow, because code owns what each label does and the model only labels.",
            "A multi-agent system, because there are three branches.",
            "Neither, because routing needs a framework."
          ],
          "answer": 1,
          "explain": "The model picks one label from a fixed set. Code decides what happens next for each label. That is a workflow with one model call, like the triage node chapter 3 built."
        },
        {
          "kind": "p",
          "text": "Who picks the next step is half the map. The other half is what the run remembers, and who may change it."
        }
      ]
    },
    {
      "id": "s2-state",
      "title": "The second axis is who owns the state, and four owners cover most designs",
      "goal": "What does a run remember, and who may change it?",
      "blocks": [
        {
          "kind": "p",
          "text": "State, from chapter 3, is the record a graph carries between nodes, which every node reads and updates. Every architecture has state, graph or not. A run holds messages and tool results, and perhaps a plan or a draft."
        },
        {
          "kind": "p",
          "text": "Someone has to own each piece. Most multi-agent bugs come from two agents that both think they own a piece, or from a piece that nobody passes on. Four owners are common."
        },
        {
          "kind": "p",
          "text": "The **loop** owns state in a tool loop: one list of messages that only grows. The **controller** owns it in a supervisor, and decides what each agent sees. The **baton** carries it in a handoff, from one agent to the next. The **board** holds it for everyone, and every agent reads and writes the same record."
        },
        {
          "kind": "p",
          "text": "Once several agents share one task, each needs to say which task it means. A **task ID** is an ID made once per task, which every agent, message and record carries. Their **shared state** is the record every agent on a task reads and writes, keyed by the task ID."
        },
        {
          "kind": "p",
          "text": "Part 1 never needed a task ID, because the thread id was enough to find each desk run. Chapters 18 to 20 pass it between agents, into a board and onto a work queue. A work queue is a list of tasks waiting to be picked up."
        },
        {
          "kind": "quiz",
          "id": "agents10-q2",
          "question": "Two agents each write the `draft` key of a shared record at the same time. Which is the root cause?",
          "options": [
            "The model is too weak.",
            "State has no single owner for that key, so a write is lost or rejected.",
            "The task ID is too long.",
            "The framework needs a newer version."
          ],
          "answer": 1,
          "explain": "When two writers share a key, one write wins or the framework raises an error. LangGraph raised one for `question` in chapter 4. Give each key one owner, or give it a reducer that merges the writes."
        },
        {
          "kind": "p",
          "text": "Two questions now place any design: who picks the next step, and who owns the state. The next section lays the known architectures out on both."
        }
      ]
    },
    {
      "id": "s3-catalogue",
      "title": "Eleven architectures cover almost every design you will meet",
      "goal": "Where does each architecture sit on the two axes, and which chapter builds it?",
      "blocks": [
        {
          "kind": "p",
          "text": "The table lists them. Part 1 already built four in their framework form: the tool loop, the router, the supervisor and handoffs. Part 2 rebuilds those by hand and adds the rest. Each row here is one plain line, and its chapter does the explaining. So read the table for the two axes, not for the names."
        },
        {
          "kind": "compare",
          "caption": "The architectures, by who picks the next step and who owns the state",
          "columns": [
            "Architecture",
            "Chapter",
            "Who picks the next step",
            "State and its owner",
            "What it costs you"
          ],
          "rows": [
            [
              "ReAct tool loop",
              "11 (met in 1)",
              "The model, every step",
              "The loop: one list of messages that only grows",
              "Steps run on until code caps them"
            ],
            [
              "Router",
              "3",
              "The model picks a label, then code branches",
              "The desk state, owned by code",
              "One extra model call"
            ],
            [
              "Fixed workflow",
              "12",
              "Code; the model only picks from fixed options",
              "Code's own record",
              "Can't handle a case the code didn't foresee"
            ],
            [
              "Plan and execute",
              "13",
              "The model once, up front; code works the plan",
              "The plan and each step's result",
              "A plan written early can go out of date"
            ],
            [
              "Reflection",
              "14",
              "Code, alternating a draft call and a review call",
              "The draft and the review notes",
              "At least two calls for every answer"
            ],
            [
              "Parallel fan-out",
              "15",
              "Code splits the work and merges it",
              "One result per piece, merged by code",
              "Works only when the pieces don't need each other"
            ],
            [
              "Voting and debate",
              "16",
              "Code collects several answers, then a rule or a model picks one",
              "Every answer, kept by code",
              "Several calls for one answer"
            ],
            [
              "Supervisor",
              "17 (met in 5)",
              "A model that calls the other agents as tools",
              "The controller",
              "One extra model call for every decision"
            ],
            [
              "Handoffs",
              "18 (met in 4)",
              "The agent holding the work picks who gets it next",
              "The baton",
              "No single agent sees the whole run"
            ],
            [
              "Blackboard",
              "19",
              "A controller, reading the board",
              "The board",
              "Agents can overwrite each other's work"
            ],
            [
              "Event-driven",
              "20",
              "A schedule or a work queue starts each run",
              "Each run's own record, keyed by the task ID",
              "Work can arrive twice or late"
            ]
          ]
        },
        {
          "kind": "p",
          "text": "Two more names turn up in interviews. A **hierarchical team** stacks supervisors: a top supervisor calls team supervisors, and each of those calls workers. It is chapter 5's supervisor applied twice. A **network**, or **swarm**, is handoffs with no agent in charge. Both add depth, and both make traces longer."
        },
        {
          "kind": "p",
          "text": "MCP and A2A aren't in the table, because they aren't architectures. They are protocols, and they sit under an architecture. MCP standardises how an agent reaches tools and data. A2A, from chapter 9, lets one agent call an agent that another team runs. Neither says who picks the next step."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Pick the least autonomy that does the job",
          "text": "More autonomy means more model calls, wider latency, harder evals and more ways to fail. A supervisor over five agents is slower than a workflow that does the same job. Earn each extra piece of autonomy with a result you can measure."
        },
        {
          "kind": "widget",
          "id": "agents10-architecture-chooser",
          "intro": "Pick one task on the PEP desk and answer five questions about it. Read the architecture the rule gives, and its reason. Then judge whether it fits your task. Change one answer and watch which architecture drops out."
        },
        {
          "kind": "fold",
          "tone": "industry",
          "title": "Frameworks give the same pattern different names",
          "text": "A supervisor is an orchestrator-worker design in some docs. A handoff is a transfer or a routine in others. A swarm is a network in LangGraph. Learn the axis, who picks the next step, and the names stop mattering."
        },
        {
          "kind": "quiz",
          "id": "agents10-q3",
          "question": "Which statement about MCP and A2A is correct?",
          "options": [
            "They are architectures, like a supervisor and a swarm.",
            "They are protocols. They sit under an architecture and do not decide who picks the next step.",
            "MCP replaces the tool loop.",
            "A2A is needed whenever there are two agents in one codebase."
          ],
          "answer": 1,
          "explain": "A protocol is a wire format and a contract. In one codebase a function call is cheaper than either protocol. You reach for MCP to share tools and for A2A to cross a team boundary."
        },
        {
          "kind": "p",
          "text": "A map earns its keep when someone asks you to design a system, and interviewers do. The next section turns the two axes into an answer."
        }
      ]
    },
    {
      "id": "s4-interview",
      "title": "In an interview, name the two axes before any pattern",
      "goal": "How do I answer a design question with this map?",
      "blocks": [
        {
          "kind": "p",
          "text": "Interviewers often ask how you would design a multi-agent system. The question tests whether you reason from the task or from a favourite pattern. So don't open with a pattern name. Say who picks the next step and who owns the state. Then name the pattern those two answers give."
        },
        {
          "kind": "callout",
          "tone": "interview",
          "title": "The 30-second answer",
          "text": "I ask who picks the next step. If I can write the steps down, I build a workflow and let the model fill blanks. If the parts don't need each other's results, I run them at once."
        },
        {
          "kind": "callout",
          "tone": "interview",
          "title": "Then the guards I add",
          "text": "If the path is open, I give one model a tool loop. I add a supervisor only when the work needs several specialities. I keep a budget and a fallback, and I price every extra model call."
        },
        {
          "kind": "p",
          "text": "Each Part 1 build maps to a row of the table. In Part 1's code, a tool loop is `create_agent`. A router is a node that returns `Command(goto=...)`. A supervisor is an agent whose tools wrap other agents. A handoff is a tool that returns `Command(graph=Command.PARENT)`."
        },
        {
          "kind": "p",
          "text": "An answer like that needs a feel for each pattern, and building one by hand gives it. Every build in Part 2 needs the same few parts, so the next section makes them once."
        }
      ]
    },
    {
      "id": "s5-kit",
      "title": "The kit is five small pieces, and every later chapter uses them",
      "goal": "What does a by-hand build need, and how does it run offline?",
      "blocks": [
        {
          "kind": "p",
          "text": "Every build in Part 2 needs a model, some tools and a way to print a run. The kit supplies all three with only the standard library. Its `ScriptedModel` works like chapter 1's scripted chat model, returning replies you queue. So every run is the same, needs no key and prints what the chapter shows."
        },
        {
          "kind": "p",
          "text": "Work in your own AskPEP repository, in `src/askpep/patterns/`. The reference copy is `capstone/src/askpep/patterns/kit.py` in the my-learn folder. Your file should match it."
        },
        {
          "kind": "step",
          "id": "agents10-s1",
          "title": "Create the patterns package",
          "text": "Make the folder and an empty `__init__.py`. Every pattern in Part 2 lives in this package.",
          "lang": "bash",
          "code": "mkdir -p src/askpep/patterns && touch src/askpep/patterns/__init__.py"
        },
        {
          "kind": "step",
          "id": "agents10-s2",
          "title": "Write the scripted model",
          "text": "Start `kit.py`. A reply is a dict. `ScriptedModel` pops one reply for each call, records a copy of the messages in and the reply out, and keeps a rough token count. It raises when the script runs out, so a loop that runs too long fails loudly.",
          "lang": "python",
          "file": "src/askpep/patterns/kit.py",
          "code": "\"\"\"The by-hand kit: a scripted model, tools, fake PEP data and a trace printer.\n\nStandard library only. LiveModel imports the course model on first use, so this module runs offline.\n\"\"\"\n\nimport json\nfrom dataclasses import dataclass, field\nfrom typing import Any, Callable\n\nReply = dict[str, Any]\n\n\ndef rough_tokens(value: Any) -> int:\n    \"\"\"About four characters to a token. Good enough to compare patterns.\"\"\"\n    return len(json.dumps(value, default=str)) // 4\n\n\nclass ScriptedModel:\n    \"\"\"Returns queued replies in order and records every call.\"\"\"\n\n    def __init__(self, replies: list[Reply]):\n        self.replies = list(replies)\n        self.calls: list[tuple[list[dict], Reply]] = []\n        self.tokens = 0\n\n    def __call__(self, messages: list[dict]) -> Reply:\n        if not self.replies:\n            raise RuntimeError(\"ScriptedModel has no replies left\")\n        reply = self.replies.pop(0)\n        self.calls.append((list(messages), reply))\n        self.tokens += rough_tokens(messages) + rough_tokens(reply)\n        return reply\n\n    @property\n    def n_calls(self) -> int:\n        return len(self.calls)"
        },
        {
          "kind": "step",
          "id": "agents10-s3",
          "title": "Add the live model",
          "text": "Append `LiveModel` and `make_model`. `LiveModel` has the same call shape over the course model. It imports that model only on first use, so the module still runs offline. Every pattern calls `make_model`, so the `--live` flag swaps the model in one place.",
          "lang": "python",
          "file": "src/askpep/patterns/kit.py",
          "code": "class LiveModel:\n    \"\"\"The same interface over the course model. It asks for JSON and parses it.\"\"\"\n\n    def __init__(self, role: str = \"researcher\"):\n        self.role = role\n        self.calls: list[tuple[list[dict], Reply]] = []\n        self.tokens = 0\n        self._chat = None\n\n    def __call__(self, messages: list[dict]) -> Reply:\n        if self._chat is None:\n            from askpep.config import get_settings\n            from askpep.providers import make_chat_model\n\n            self._chat = make_chat_model(get_settings(), self.role)\n        prompt = [(m[\"role\"], m[\"content\"]) for m in messages]\n        prompt.append((\"system\", \"Reply with one JSON object and nothing else.\"))\n        text = self._chat.invoke(prompt).content\n        text = text if isinstance(text, str) else str(text)\n        reply = json.loads(text.strip().removeprefix(\"```json\").removesuffix(\"```\").strip())\n        self.calls.append((list(messages), reply))\n        self.tokens += rough_tokens(messages) + rough_tokens(reply)\n        return reply\n\n    @property\n    def n_calls(self) -> int:\n        return len(self.calls)\n\n\ndef make_model(replies: list[Reply], live: bool = False) -> \"ScriptedModel | LiveModel\":\n    \"\"\"Every pattern module calls this, so --live swaps the model in one place.\"\"\"\n    return LiveModel() if live else ScriptedModel(replies)"
        },
        {
          "kind": "step",
          "id": "agents10-s4",
          "title": "Add the tools and the fake PEP data",
          "text": "Append the tool registry and three fake tools over a tiny in-memory set of PEPs. A failing tool returns a `ToolError` string instead of raising, which keeps chapter 2's rule: return an error the model can act on. Each error lists the valid choices, so a model can retry.",
          "lang": "python",
          "file": "src/askpep/patterns/kit.py",
          "code": "@dataclass\nclass Tool:\n    name: str\n    description: str\n    fn: Callable[..., Any]\n\n\nclass Tools:\n    \"\"\"A small registry. A failing call comes back as text the model can read.\"\"\"\n\n    def __init__(self, *tools: Tool):\n        self._tools = {t.name: t for t in tools}\n\n    def names(self) -> list[str]:\n        return list(self._tools)\n\n    def call(self, name: str, args: dict) -> Any:\n        tool = self._tools.get(name)\n        if tool is None:\n            return f\"ToolError: no tool named {name}. Tools: {', '.join(self._tools)}\"\n        try:\n            return tool.fn(**args)\n        except Exception as exc:\n            return f\"ToolError: {exc}\"\n\n\nPEPS = {\n    8: {\n        \"title\": \"Style Guide for Python Code\",\n        \"summary\": \"Style rules for Python code, such as indentation and naming.\",\n        \"line length\": \"Limit lines to 79 characters. Limit docstrings and comments to 72.\",\n    },\n    572: {\n        \"title\": \"Assignment Expressions\",\n        \"summary\": \"Adds the walrus operator, :=, which assigns inside an expression.\",\n        \"history\": \"Accepted for Python 3.8 after a long and bitter debate.\",\n    },\n    703: {\n        \"title\": \"Making the Global Interpreter Lock Optional\",\n        \"summary\": \"Lets CPython build without the GIL, so threads can run in parallel.\",\n        \"status\": \"Accepted. Python 3.13 ships an experimental free-threaded build.\",\n    },\n}\n\nFEATURES = {\"walrus operator\": \"3.8\", \"f-strings\": \"3.6\", \"match statement\": \"3.10\"}\n\n\ndef fake_pep_tools() -> Tools:\n    def search_peps(query: str) -> list[str]:\n        words = query.lower().split()\n        hits = [\n            f\"PEP {n}: {p['title']}\"\n            for n, p in PEPS.items()\n            if any(w in \" \".join(p.values()).lower() for w in words)\n        ]\n        return hits or [\"no match\"]\n\n    def read_pep_section(pep: int, section: str) -> str:\n        if pep not in PEPS:\n            raise ValueError(f\"PEP {pep} is not in the desk\")\n        if section not in PEPS[pep]:\n            raise ValueError(f\"PEP {pep} has no section {section!r}. Sections: {', '.join(PEPS[pep])}\")\n        return PEPS[pep][section]\n\n    def python_feature_version(feature: str) -> str:\n        if feature not in FEATURES:\n            raise ValueError(f\"unknown feature {feature!r}. Known: {', '.join(FEATURES)}\")\n        return FEATURES[feature]\n\n    return Tools(\n        Tool(\"search_peps\", \"Find PEPs by keyword.\", search_peps),\n        Tool(\"read_pep_section\", \"Read one section of one PEP.\", read_pep_section),\n        Tool(\"python_feature_version\", \"The Python version that added a feature.\", python_feature_version),\n    )"
        },
        {
          "kind": "step",
          "id": "agents10-s5",
          "title": "Add the run record and the trace printer",
          "text": "Append `Step`, `Run` and `trace`. A `Run` holds a question and its trace lines, each a `Step` with a kind and some text. `trace` prints them as numbered lines, with the model's totals at the end. Every later chapter prints its expected output with it.",
          "lang": "python",
          "file": "src/askpep/patterns/kit.py",
          "code": "@dataclass\nclass Step:\n    kind: str  # \"think\", \"tool\", \"observe\" or \"answer\"\n    text: str\n\n\n@dataclass\nclass Run:\n    question: str\n    steps: list[Step] = field(default_factory=list)\n    answer: str = \"\"\n    model: Any = None\n\n    def add(self, kind: str, text: str) -> None:\n        self.steps.append(Step(kind, text))\n\n\ndef trace(run: Run) -> None:\n    \"\"\"Print a run as numbered lines, then its totals when a model is attached.\"\"\"\n    print(f\"Q: {run.question}\")\n    for i, s in enumerate(run.steps, 1):\n        print(f\"{i:>2}. {s.kind:<7} {s.text}\")\n    if run.model is not None:\n        print(f\"model calls: {run.model.n_calls}, rough tokens: {run.model.tokens}\")"
        },
        {
          "kind": "step",
          "id": "agents10-s6",
          "title": "Add the demo and run it",
          "text": "Append a demo that drives a tiny loop with the scripted model. This loop is the ReAct pattern in about fifteen lines, and chapter 11 rebuilds it properly. Run it with `uv run --no-sync python -m askpep.patterns.kit`. It needs no network and no key.",
          "lang": "python",
          "file": "src/askpep/patterns/kit.py",
          "code": "def demo(live: bool = False) -> Run:\n    \"\"\"One question, one tool call, one answer, driven by a loop of a few lines.\"\"\"\n    tools = fake_pep_tools()\n    model = make_model(\n        [\n            {\"thought\": \"I need the PEP that added the walrus operator.\", \"tool\": \"search_peps\", \"args\": {\"query\": \"walrus\"}},\n            {\"thought\": \"Now the version.\", \"tool\": \"python_feature_version\", \"args\": {\"feature\": \"walrus operator\"}},\n            {\"answer\": \"The walrus operator came in Python 3.8, through PEP 572.\"},\n        ],\n        live,\n    )\n    run = Run(\"Which Python version added the walrus operator?\", model=model)\n    messages = [{\"role\": \"user\", \"content\": run.question}]\n    for _ in range(5):\n        reply = model(messages)\n        if \"answer\" in reply:\n            run.answer = reply[\"answer\"]\n            run.add(\"answer\", run.answer)\n            break\n        run.add(\"think\", reply[\"thought\"])\n        run.add(\"tool\", f\"{reply['tool']}({json.dumps(reply['args'])})\")\n        result = tools.call(reply[\"tool\"], reply[\"args\"])\n        run.add(\"observe\", json.dumps(result))\n        messages.append({\"role\": \"assistant\", \"content\": json.dumps(reply)})\n        messages.append({\"role\": \"user\", \"content\": f\"Observation: {json.dumps(result)}\"})\n    return run\n\n\nif __name__ == \"__main__\":\n    import sys\n\n    trace(demo(live=\"--live\" in sys.argv))",
          "expect": "Q: Which Python version added the walrus operator?\n 1. think   I need the PEP that added the walrus operator.\n 2. tool    search_peps({\"query\": \"walrus\"})\n 3. observe [\"PEP 572: Assignment Expressions\"]\n 4. think   Now the version.\n 5. tool    python_feature_version({\"feature\": \"walrus operator\"})\n 6. observe \"3.8\"\n 7. answer  The walrus operator came in Python 3.8, through PEP 572.\nmodel calls: 3, rough tokens: 307"
        },
        {
          "kind": "p",
          "text": "Read the trace once. Lines 1 to 3 come from the first model call: the model thinks and picks a tool, and code runs it and adds the observation. Lines 4 to 6 come from the second call. Line 7 is the third call's answer. The footer counts the three model calls."
        },
        {
          "kind": "quiz",
          "id": "agents10-q4",
          "question": "`ScriptedModel` is called a fourth time with only three replies queued. What happens, and why is that useful?",
          "options": [
            "It repeats the last reply, so a loop never fails.",
            "It returns an empty dict, so a loop ends quietly.",
            "It raises `RuntimeError`, so a run that goes past its script fails loudly.",
            "It calls the live model instead."
          ],
          "answer": 2,
          "explain": "A pattern that asks for one reply too many has a control-flow bug. The scripted model turns it into an error at once, which a real model would hide behind a plausible answer."
        },
        {
          "kind": "p",
          "text": "The run matches the chapter to the token. That proves less than it seems, and the next section says what it leaves out."
        }
      ]
    },
    {
      "id": "s6-limits",
      "title": "The kit proves the control flow, and it cannot prove the prompts",
      "goal": "What does a scripted run prove, and what does it hide?",
      "blocks": [
        {
          "kind": "p",
          "text": "A scripted model shows that your loop, your tools and your stop rules work. It doesn't show that a real model would write those replies. You met this in chapter 4, where a scripted model accepted a history that a real API rejected. So run each pattern once with `--live` before you trust it."
        },
        {
          "kind": "list",
          "items": [
            "The token count is the length of the JSON divided by four. It compares patterns well, but it isn't a bill.",
            "`LiveModel` strips a json code fence and parses the rest. If the model answers in prose, `json.loads` raises. A real build adds one retry.",
            "The demo loop stops after five model calls. That cap is a budget, and every later pattern keeps one.",
            "A tool failure comes back as text. A model that ignores the hint can still go round in circles, so the cap matters."
          ]
        },
        {
          "kind": "fold",
          "tone": "hood",
          "title": "Why the kit takes a function and not a class",
          "text": "A model here is any callable that takes messages and returns a dict. A test double, a live model and a lambda all fit. That is the whole interface, so a pattern never depends on a vendor library."
        },
        {
          "kind": "p",
          "text": "The demo loop is the simplest design on the map: the model picks every step. Fifteen lines can't show how such a loop fails or how it stops. So the next chapter asks the obvious question. What does the simplest architecture, where the model picks every step, look like when you write it by hand?"
        }
      ]
    }
  ],
  "lab": {
    "title": "Change the kit and watch what breaks",
    "goal": "Run the kit, then change it three ways and read what each change shows. Every step runs the module offline. Compare your file with `capstone/src/askpep/patterns/kit.py` in the my-learn folder.",
    "minutes": 20,
    "files": [
      "src/askpep/patterns/__init__.py",
      "src/askpep/patterns/kit.py"
    ],
    "steps": [
      {
        "title": "Run it unchanged",
        "text": "Run the module and compare the trace with the one in the chapter. The numbers must match: 3 model calls and 307 rough tokens.",
        "code": "uv run --no-sync python -m askpep.patterns.kit"
      },
      {
        "title": "Give the model a bad tool argument",
        "text": "In `demo`, change the feature in the second reply from `walrus operator` to `walrus`. Run it. The observe line shows a `ToolError` that lists the known features. That is the hint a real model would use to retry. The answer line still says 3.8, because a scripted model never reads the observation.",
        "code": "uv run --no-sync python -m askpep.patterns.kit"
      },
      {
        "title": "Remove the last reply",
        "text": "Delete the answer reply from the script. Predict what happens, then run it. The loop asks for a third reply, and the scripted model raises `RuntimeError: ScriptedModel has no replies left`. Restore the reply afterwards.",
        "code": "uv run --no-sync python -m askpep.patterns.kit"
      },
      {
        "title": "Search for other PEPs",
        "text": "In `demo`, change the first query from `walrus` to `accepted`. Predict which PEPs come back, then run it. PEP 572 and PEP 703 both do, because `search_peps` matches any query word in any section. Then add `20: {\"title\": \"The Zen of Python\", \"summary\": \"Guiding principles, such as readability counts.\"},` to `PEPS`, change the query to `zen` and run it again. The observe line shows PEP 20 alone.",
        "code": "uv run --no-sync python -m askpep.patterns.kit"
      }
    ],
    "verify": "uv run --no-sync python -m askpep.patterns.kit"
  },
  "recap": [
    "A workflow lets code pick the next step, even when a model picks a label from a fixed set. An agent lets the model pick it, and often decide when to stop.",
    "The second axis is who owns the state: the loop, the controller, the baton or the board.",
    "A task ID ties every agent's work on one task to the same shared state.",
    "Eleven architectures sit on the two axes, from the tool loop and the router to the board and event-driven runs.",
    "MCP and A2A are protocols under an architecture. They don't decide who picks the next step.",
    "In an interview, name the two axes first, and pick the least autonomy that does the job.",
    "The kit gives every later build a scripted model, fake PEP tools and a trace, all offline."
  ],
  "reinforcement": "I am becoming a forward-deployed AI engineer. In agent architectures I learned that two questions place any design: who picks the next step, code or the model, and who owns the state. Start with the least autonomy that does the job. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  "interviewIds": [
    "agents-c10-q01",
    "agents-c10-q02",
    "agents-c10-q03",
    "agents-c10-q04"
  ]
};

export default chapter;
