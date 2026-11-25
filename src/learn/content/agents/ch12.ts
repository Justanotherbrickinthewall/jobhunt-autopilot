import type { Chapter } from "../types";

const chapter: Chapter = {
  "id": "agents-12-deterministic-workflows",
  "course": "agents",
  "number": 12,
  "title": "In a workflow, code routes and the model picks from a fixed set",
  "tagline": "When should code fix the steps and let the model only choose from a set?",
  "minutes": 60,
  "objectives": [
    "Say when code should fix the steps, and name the pattern in one sentence.",
    "Check a model's choice against the enum and the state, and send a failed choice to a review queue.",
    "Write a small graph engine and a prompt chain that saves the state after each node.",
    "Add a gate node that ends the run before the model can guess.",
    "Build a router whose decision point code checks, and run three requests through it.",
    "Compare the workflow with chapter 11's ReAct loop on who picks, cost, testing and audit, and say where it breaks.",
    "Give the 30-second answer in an interview, and map the graph onto LangGraph."
  ],
  "sections": [
    {
      "id": "s1-problem",
      "title": "Code should fix the steps whenever you can write them down",
      "goal": "When should code fix the steps, and what is that design called?",
      "blocks": [
        {
          "kind": "p",
          "text": "Chapter 11 ended on a question. What if code, and not the model, should decide the order of steps? This chapter answers a sharper version. When should code fix the steps and let the model only choose from a set?"
        },
        {
          "kind": "p",
          "text": "Chapter 11's loop gave the model the path. It picked each tool, and it said when to stop. That suits a question whose path you can't predict. Most PEP desk questions are not like that. You already know the steps."
        },
        {
          "kind": "p",
          "text": "Take \"What is PEP 703 about?\" You search for the PEP, read its summary and write one sentence. The same three steps serve every question of that kind. A loop that rediscovers them on each run pays for model calls that add nothing."
        },
        {
          "kind": "p",
          "text": "Chapter 1 called this kind of code a workflow: code that fixes the steps and their order, with a model inside some steps. A **deterministic workflow** is a workflow whose route is fixed in code, so the same input takes the same path. Code routes, and the model picks from a fixed set."
        },
        {
          "kind": "callout",
          "tone": "insight",
          "title": "Deterministic means the path, not the words",
          "text": "The model's text can still vary from run to run. The path cannot. For one state and one choice, code takes the same edge every time. That is what lets you test the path and know its cost before the run."
        },
        {
          "kind": "quiz",
          "id": "agents12-q1",
          "question": "Which PEP desk request is the best fit for a fixed workflow?",
          "options": [
            "Find every PEP that ever mentioned threads and say how the story changed.",
            "Look up one PEP by number, read its summary and state it in a sentence.",
            "Explore an archive whose layout you have not seen yet.",
            "Plan a reading list, then change it as you learn."
          ],
          "answer": 1,
          "explain": "The steps are known and the same each time. The other three depend on what each lookup finds, so a loop or a plan fits them better."
        },
        {
          "kind": "p",
          "text": "The next section shows where the model's choice enters the graph, and how code keeps it in bounds."
        }
      ]
    },
    {
      "id": "s2-how",
      "title": "The graph is code, and the model only picks one option from an enum",
      "goal": "Where does the model choose, and what does code do with a choice it can't accept?",
      "blocks": [
        {
          "kind": "p",
          "text": "You met state, nodes and edges in chapter 3. Here the state is a plain dict, and each node is a plain function that writes into it. The edges are a dict in code."
        },
        {
          "kind": "p",
          "text": "A **decision point** is a node where the model picks one option from a fixed set and code routes on it. The set is an enum, from chapter 2. The model can't invent a route, call a tool you didn't list or end the run early."
        },
        {
          "kind": "p",
          "text": "Then code checks the choice with two tests. Is the value in the enum, exactly as written? Is it allowed for the current state? A value can pass the first test and fail the second. If either test fails, code takes a safe default. The model proposes, and code decides."
        },
        {
          "kind": "p",
          "text": "In this chapter the safe default is a **review queue**, the list where held items wait for a person to look at them. A request that lands there gets no answer from the model. It waits with a note that says why code held it."
        },
        {
          "kind": "widget",
          "id": "agents12-route-checker",
          "intro": "Six model choices follow, each with the routes that code allows for that state. Predict what code does with each one. Watch the case where the value is in the enum and not allowed here."
        },
        {
          "kind": "fold",
          "tone": "hood",
          "title": "Why the check lives in code and not in the prompt",
          "text": "A prompt that says \"only answer with lookup, version or refuse\" is a request. The model usually obeys, and sometimes it does not. A few lines of code that test membership never fail that way. Write the prompt to help the model, and write the check to protect the system."
        },
        {
          "kind": "quiz",
          "id": "agents12-q2",
          "question": "The model returns `Lookup` with a capital L. The enum holds `lookup`. What should the workflow do?",
          "options": [
            "Lower-case it and carry on, since the meaning is clear.",
            "Treat it as invalid and send the request to the review queue.",
            "Ask the model again until it spells it right.",
            "Run every route and keep the best answer."
          ],
          "answer": 1,
          "explain": "The check is an exact match. A tolerant parser is a second place for bugs. If you want leniency, put it in one visible function and test it. Otherwise fall back to the review queue."
        },
        {
          "kind": "p",
          "text": "That is the design on paper. The next section builds the engine that runs it, and the simplest shape."
        }
      ]
    },
    {
      "id": "s3-chain",
      "title": "A prompt chain is a fixed list of nodes that share one state dict",
      "goal": "How small can the engine be, and what does the simplest shape look like?",
      "blocks": [
        {
          "kind": "p",
          "text": "Work in your own AskPEP repository, next to `kit.py`. The reference is `capstone/src/askpep/patterns/workflow.py` in the my-learn folder. Your file should match it."
        },
        {
          "kind": "p",
          "text": "The engine is small. `run_graph` runs a node, appends its name to the path, saves the state and follows the edge. An edge is a node name or a function of the state. After twelve nodes the engine raises an error, so a bad edge can't run for ever."
        },
        {
          "kind": "step",
          "id": "agents12-s1",
          "title": "Write the state, the registry and the engine",
          "text": "Start `workflow.py`. The state is one dict per request, stored under its request ID in `STORE`. `save` stores a JSON copy, so a later node can't change an earlier snapshot. The `node` decorator registers a function under its own name. `to_run` turns a finished state into a kit `Run`, so `trace` can print it.",
          "lang": "python",
          "file": "src/askpep/patterns/workflow.py",
          "code": "\"\"\"A deterministic workflow on the PEP desk: code routes and the model picks from a fixed set.\n\nStandard library only. Nodes are functions, the graph is a dict, and the state is one dict saved after each node.\n\"\"\"\n\nimport json\nfrom typing import Callable\n\nfrom askpep.patterns.kit import FEATURES, Run, fake_pep_tools, make_model, trace\n\nState = dict\nSTORE: dict[str, State] = {}  # shortcut: memory only, use a database once runs must outlive the process\nNODES: dict[str, Callable] = {}\nTOOLS = fake_pep_tools()\n\n\ndef node(fn: Callable) -> Callable:\n    \"\"\"Register a function as a node. The function name is the node name.\"\"\"\n    NODES[fn.__name__] = fn\n    return fn\n\n\ndef new_state(request_id: str, question: str) -> State:\n    return {\"request_id\": request_id, \"question\": question, \"status\": \"open\", \"path\": []}\n\n\ndef save(state: State) -> None:\n    STORE[state[\"request_id\"]] = json.loads(json.dumps(state))  # a copy, so later edits do not leak\n\n\ndef run_graph(state: State, edges: dict, model, start: str) -> State:\n    \"\"\"Run one node, save, follow the edge. An edge is a node name or a function of the state.\"\"\"\n    name = start\n    while name != \"end\":\n        if len(state[\"path\"]) >= 12:\n            raise RuntimeError(\"workflow ran past 12 nodes\")\n        NODES[name](state, model)\n        state[\"path\"].append(name)\n        save(state)\n        edge = edges[name]\n        name = edge(state) if callable(edge) else edge\n    return state\n\n\ndef to_run(state: State, model) -> Run:\n    run = Run(state[\"question\"], model=model)\n    for name in state[\"path\"]:\n        run.add(\"node\", name)\n    if state.get(\"note\"):\n        run.add(\"note\", state[\"note\"])\n    run.add(\"end\", f\"{state['status']}: {state['answer']}\" if state.get(\"answer\") else state[\"status\"])\n    return run"
        },
        {
          "kind": "p",
          "text": "The file builds three shapes: a prompt chain, a router and a gate node. Its comments number them in that order. A prompt chain is a fixed list of nodes, each feeding the next."
        },
        {
          "kind": "p",
          "text": "This chain has four nodes. Two call the model: `extract` picks a search word, and `write` drafts the answer from one fact. Two are plain code: `search` and `read` call the fake PEP tools. The edges are a dict, with one fixed next node for each."
        },
        {
          "kind": "step",
          "id": "agents12-s2",
          "title": "Add the prompt chain",
          "text": "Append the four nodes, the `CHAIN` edges and a demo. The trace lists the nodes in order, and the footer shows two model calls, one for each model node.",
          "lang": "python",
          "file": "src/askpep/patterns/workflow.py",
          "code": "# --- shape 1: a prompt chain, step after step ---\n\n\n@node\ndef extract(state, model):\n    state[\"query\"] = model([{\"role\": \"user\", \"content\": f\"Give one search word for: {state['question']}\"}])[\"query\"]\n\n\n@node\ndef search(state, _):\n    state[\"evidence\"] = TOOLS.call(\"search_peps\", {\"query\": state[\"query\"]})\n\n\n@node\ndef read(state, _):\n    pep = int(state[\"evidence\"][0].split()[1].rstrip(\":\"))\n    state[\"fact\"] = TOOLS.call(\"read_pep_section\", {\"pep\": pep, \"section\": \"summary\"})\n\n\n@node\ndef write(state, model):\n    prompt = f\"Answer using only this fact: {state['fact']}\\nQuestion: {state['question']}\"\n    state[\"answer\"] = model([{\"role\": \"user\", \"content\": prompt}])[\"answer\"]\n    state[\"status\"] = \"done\"\n\n\nCHAIN = {\"extract\": \"search\", \"search\": \"read\", \"read\": \"write\", \"write\": \"end\"}\n\n\ndef demo_chain(live: bool = False) -> None:\n    model = make_model([{\"query\": \"GIL\"}, {\"answer\": \"PEP 703 lets CPython build without the GIL.\"}], live)\n    state = run_graph(new_state(\"req-1\", \"What is PEP 703 about?\"), CHAIN, model, \"extract\")\n    trace(to_run(state, model))",
          "expect": "Q: What is PEP 703 about?\n 1. node    extract\n 2. node    search\n 3. node    read\n 4. node    write\n 5. end     done: PEP 703 lets CPython build without the GIL.\nmodel calls: 2, rough tokens: 78"
        },
        {
          "kind": "code",
          "lang": "bash",
          "code": "uv run --no-sync python -c \"from askpep.patterns.workflow import demo_chain; demo_chain()\"",
          "caption": "Run the chain demo on its own. The file has no main block until the last step."
        },
        {
          "kind": "p",
          "text": "The model never chose a node here. The path is the same for every question of this kind. The only thing that varies is the text the model writes."
        },
        {
          "kind": "quiz",
          "id": "agents12-q3",
          "question": "`save` stores `json.loads(json.dumps(state))` and not `state` itself. Why?",
          "options": [
            "JSON is faster than a dict.",
            "A later node edits the live dict, and the saved snapshot must stay as it was after each node.",
            "The model needs JSON as input.",
            "A dict can't be stored under a string key."
          ],
          "answer": 1,
          "explain": "Without a copy, STORE would point at the live dict, and every snapshot would show the final state. A real database writes a copy by nature."
        },
        {
          "kind": "p",
          "text": "A chain has one weakness. It runs to the end even when a node finds nothing."
        }
      ]
    },
    {
      "id": "s4-gate",
      "title": "A gate node stops the run when the evidence is missing",
      "goal": "How do you stop the chain before the model drafts an answer from nothing?",
      "blocks": [
        {
          "kind": "p",
          "text": "Suppose the search finds no PEP. The chain still runs `read` and `write`. The write node would draft an answer with no fact behind it, and a real model fills that gap with something plausible. That is the failure you least want."
        },
        {
          "kind": "p",
          "text": "A **gate node** is a node that tests the state and ends the run when the test fails. It is plain code. The edge after it is a function: if the status is still open, go to `read`, otherwise go to the end. No model call happens after the gate node closes."
        },
        {
          "kind": "step",
          "id": "agents12-s3",
          "title": "Add the gate node",
          "text": "Append the `gate` node, the `GATED` edges and a demo. The question asks about PEP 999, which the desk doesn't hold. The search returns `no match`, and the gate node stops the run. The trace ends after three nodes, with one model call.",
          "lang": "python",
          "file": "src/askpep/patterns/workflow.py",
          "code": "# --- shape 3: a gate stops the chain ---\n\n\n@node\ndef gate(state, _):\n    hits = state[\"evidence\"]\n    if not hits or hits == [\"no match\"] or str(hits[0]).startswith(\"ToolError\"):\n        state[\"status\"] = \"stopped\"\n        state[\"answer\"] = \"The desk has nothing on that, so it did not guess.\"\n\n\nGATED = {\n    \"extract\": \"search\",\n    \"search\": \"gate\",\n    \"gate\": lambda s: \"read\" if s[\"status\"] == \"open\" else \"end\",\n    \"read\": \"write\",\n    \"write\": \"end\",\n}\n\n\ndef demo_gate(live: bool = False) -> None:\n    model = make_model([{\"query\": \"zzz\"}], live)\n    state = run_graph(new_state(\"req-2\", \"What does PEP 999 say?\"), GATED, model, \"extract\")\n    trace(to_run(state, model))",
          "expect": "Q: What does PEP 999 say?\n 1. node    extract\n 2. node    search\n 3. node    gate\n 4. end     stopped: The desk has nothing on that, so it did not guess.\nmodel calls: 1, rough tokens: 24"
        },
        {
          "kind": "code",
          "lang": "bash",
          "code": "uv run --no-sync python -c \"from askpep.patterns.workflow import demo_gate; demo_gate()\"",
          "caption": "Run the gate demo on its own."
        },
        {
          "kind": "p",
          "text": "The desk says it has nothing, and the status is `stopped`. A caller can tell a stop from an answer by that one field."
        },
        {
          "kind": "quiz",
          "id": "agents12-q4",
          "question": "What does the gate node in `GATED` save you on a question the desk can't answer?",
          "options": [
            "One search call.",
            "The write call, and an answer the model would have made up.",
            "The cost of saving state.",
            "Nothing, because the chain would also have stopped."
          ],
          "answer": 1,
          "explain": "The chain has no stop of its own. Without the gate node, `read` would fail on the no-match text, or `write` would draft from nothing. The gate node turns both into a clean stop."
        },
        {
          "kind": "p",
          "text": "So far the path never forks. The router lets the model choose a branch, and code checks the choice."
        }
      ]
    },
    {
      "id": "s5-router",
      "title": "A router lets the model choose a path, and code decides whether the choice stands",
      "goal": "How does a decision point choose a branch without the model taking over the path?",
      "blocks": [
        {
          "kind": "p",
          "text": "Chapter 3's triage was a router. Triage picked the specialist for a question through structured output. When no decision came back, code fell back to the researcher. This router is built by hand, and it adds a second test: is the route allowed for this request?"
        },
        {
          "kind": "p",
          "text": "The router sits in front of the gated chain, so you built the gate node first. The `classify` node is the decision point. It asks the model for one route from `ROUTES`. The `check_route` node is plain code. It accepts the choice only if it is in the allowed set for this request."
        },
        {
          "kind": "p",
          "text": "The allowed set depends on the state. A version lookup needs a feature the desk knows, so `version` is allowed only when the question names one. A choice that fails either test goes to the `human_queue` node, with a note that says why. That node marks the request `queued`."
        },
        {
          "kind": "p",
          "text": "Here the review queue is every saved state whose status is `queued`. A real desk would show that list to a person. The code's node name and note say human queue, and they mean this review queue."
        },
        {
          "kind": "step",
          "id": "agents12-s4",
          "title": "Add the router",
          "text": "Append the routes, the allowed set, the five router nodes, the full `ROUTED` graph and a demo with three cases. The first choice is valid. The second is not in the enum. The third is in the enum and not allowed for that question.",
          "lang": "python",
          "file": "src/askpep/patterns/workflow.py",
          "code": "# --- shape 2: a router, where the model picks from a fixed set and code checks it ---\n\nROUTES = (\"lookup\", \"version\", \"refuse\")\n\n\ndef feature_in(question: str) -> str | None:\n    return next((f for f in FEATURES if f in question.lower()), None)\n\n\ndef allowed_routes(state: State) -> set[str]:\n    \"\"\"What code allows for this state. A version lookup needs a feature the desk knows.\"\"\"\n    allowed = {\"lookup\", \"refuse\"}\n    if feature_in(state[\"question\"]):\n        allowed.add(\"version\")\n    return allowed\n\n\n@node\ndef classify(state, model):\n    prompt = f\"Pick one of {', '.join(ROUTES)} for: {state['question']}\"\n    state[\"choice\"] = model([{\"role\": \"user\", \"content\": prompt}]).get(\"route\")\n\n\n@node\ndef check_route(state, _):\n    if state[\"choice\"] in allowed_routes(state):\n        state[\"route\"] = state[\"choice\"]\n    else:\n        state[\"route\"] = \"human_queue\"\n        state[\"note\"] = f\"choice {state['choice']!r} is not allowed here, sent to the human queue\"\n\n\n@node\ndef version(state, _):\n    state[\"fact\"] = TOOLS.call(\"python_feature_version\", {\"feature\": feature_in(state[\"question\"])})\n\n\n@node\ndef refuse(state, _):\n    state[\"status\"] = \"refused\"\n    state[\"answer\"] = \"The desk answers questions about Python PEPs only.\"\n\n\n@node\ndef human_queue(state, _):\n    state[\"status\"] = \"queued\"\n\n\nROUTE_TO_NODE = {\"lookup\": \"extract\", \"version\": \"version\", \"refuse\": \"refuse\", \"human_queue\": \"human_queue\"}\n\nROUTED = {\n    **GATED,\n    \"classify\": \"check_route\",\n    \"check_route\": lambda s: ROUTE_TO_NODE[s[\"route\"]],\n    \"version\": \"write\",\n    \"refuse\": \"end\",\n    \"human_queue\": \"end\",\n}\n\nCASES = [\n    (\"req-3\", \"Which Python version added the walrus operator?\", [{\"route\": \"version\"}, {\"answer\": \"Python 3.8 added it.\"}]),\n    (\"req-4\", \"Why is the walrus operator controversial?\", [{\"route\": \"poetry\"}]),\n    (\"req-5\", \"What is the capital of France?\", [{\"route\": \"version\"}]),\n]\n\n\ndef demo_router(live: bool = False) -> None:\n    for request_id, question, replies in CASES:\n        model = make_model(replies, live)\n        state = run_graph(new_state(request_id, question), ROUTED, model, \"classify\")\n        trace(to_run(state, model))\n        print()",
          "expect": "Q: Which Python version added the walrus operator?\n 1. node    classify\n 2. node    check_route\n 3. node    version\n 4. node    write\n 5. end     done: Python 3.8 added it.\nmodel calls: 2, rough tokens: 74\n\nQ: Why is the walrus operator controversial?\n 1. node    classify\n 2. node    check_route\n 3. node    human_queue\n 4. note    choice 'poetry' is not allowed here, sent to the human queue\n 5. end     queued\nmodel calls: 1, rough tokens: 32\n\nQ: What is the capital of France?\n 1. node    classify\n 2. node    check_route\n 3. node    human_queue\n 4. note    choice 'version' is not allowed here, sent to the human queue\n 5. end     queued\nmodel calls: 1, rough tokens: 31"
        },
        {
          "kind": "code",
          "lang": "bash",
          "code": "uv run --no-sync python -c \"from askpep.patterns.workflow import demo_router; demo_router()\"",
          "caption": "Run the router demo on its own."
        },
        {
          "kind": "p",
          "text": "Both bad choices end in `queued` after one model call. Nothing ran that code did not choose to run."
        },
        {
          "kind": "step",
          "id": "agents12-s5",
          "title": "Add the entry point and run the whole file",
          "text": "Append the `__main__` block. It runs all three shapes, then lists the request IDs saved in memory. A real desk would keep this state in a database. Here it stays in a dict.",
          "lang": "python",
          "file": "src/askpep/patterns/workflow.py",
          "code": "if __name__ == \"__main__\":\n    import sys\n\n    live = \"--live\" in sys.argv\n    print(\"== chain ==\")\n    demo_chain(live)\n    print(\"\\n== gate ==\")\n    demo_gate(live)\n    print(\"\\n== router ==\")\n    demo_router(live)\n    print(f\"saved requests: {', '.join(STORE)}\")",
          "expect": "== chain ==\nQ: What is PEP 703 about?\n 1. node    extract\n 2. node    search\n 3. node    read\n 4. node    write\n 5. end     done: PEP 703 lets CPython build without the GIL.\nmodel calls: 2, rough tokens: 78\n\n== gate ==\nQ: What does PEP 999 say?\n 1. node    extract\n 2. node    search\n 3. node    gate\n 4. end     stopped: The desk has nothing on that, so it did not guess.\nmodel calls: 1, rough tokens: 24\n\n== router ==\nQ: Which Python version added the walrus operator?\n 1. node    classify\n 2. node    check_route\n 3. node    version\n 4. node    write\n 5. end     done: Python 3.8 added it.\nmodel calls: 2, rough tokens: 74\n\nQ: Why is the walrus operator controversial?\n 1. node    classify\n 2. node    check_route\n 3. node    human_queue\n 4. note    choice 'poetry' is not allowed here, sent to the human queue\n 5. end     queued\nmodel calls: 1, rough tokens: 32\n\nQ: What is the capital of France?\n 1. node    classify\n 2. node    check_route\n 3. node    human_queue\n 4. note    choice 'version' is not allowed here, sent to the human queue\n 5. end     queued\nmodel calls: 1, rough tokens: 31\n\nsaved requests: req-1, req-2, req-3, req-4, req-5"
        },
        {
          "kind": "widget",
          "id": "agents12-state-stepper",
          "intro": "Walk the router graph for one request, one edge at a time. At each node, predict the next node before you reveal it. Watch how the state dict grows one key at a time, and where the path forks."
        },
        {
          "kind": "p",
          "text": "You now have three shapes in one graph. The next section sets it beside chapter 11's loop."
        }
      ]
    },
    {
      "id": "s6-breaks",
      "title": "A workflow trades flexibility for a known cost and a path you can test",
      "goal": "What does a workflow buy you over the ReAct loop, and where does it break?",
      "blocks": [
        {
          "kind": "p",
          "text": "Put this chapter next to chapter 11. In ReAct the model picks every step and decides when to stop. Here the model picks one route at a decision point, and code does the rest. The table sets the two side by side."
        },
        {
          "kind": "compare",
          "caption": "A deterministic workflow against a ReAct loop, on the four questions that decide a design",
          "columns": [
            "Question",
            "Deterministic workflow",
            "ReAct loop"
          ],
          "rows": [
            [
              "Who picks the next step",
              "Code does, through edges you wrote",
              "The model does, after every tool result, and it decides when to stop"
            ],
            [
              "How predictable is the cost",
              "The model calls are the model nodes on the path, so the maximum is known",
              "The calls grow with the steps, so a step budget caps them"
            ],
            [
              "How do you test it",
              "Script the choice and assert the path the run took",
              "Score the answer and the path, because the path varies"
            ],
            [
              "How do you audit it",
              "The saved path and state list every node that ran, in order",
              "You read the transcript of thoughts and tool calls"
            ]
          ]
        },
        {
          "kind": "p",
          "text": "The price of a workflow is rigidity. A question that needs a step you didn't draw has no edge for it. The router sends it to the review queue, or down the wrong branch. You pay for that in coverage, and you find the gaps by reading the review queue."
        },
        {
          "kind": "p",
          "text": "Four more limits are worth knowing."
        },
        {
          "kind": "list",
          "items": [
            "A long route list makes the choice harder, and the model starts to confuse similar routes.",
            "A review queue that nobody reads is a silent failure. Count what lands there and look at it.",
            "A wrong but valid choice still passes the check. The check catches only illegal choices. A golden set with the right route for each question catches the wrong ones.",
            "A gate node that is too strict turns good questions into stops. Track the stop rate."
          ]
        },
        {
          "kind": "widget",
          "id": "agents12-fit-check",
          "intro": "Six situations on the PEP desk follow. Decide whether each one is better served by a fixed workflow or by a model-driven loop. Predict first. Watch how often the deciding fact is that you can write the steps down in advance."
        },
        {
          "kind": "fold",
          "tone": "industry",
          "title": "Anthropic's agent guide draws the same line",
          "text": "Anthropic's guide Building effective agents, from December 2024, calls the prompt chain, the router and parallelisation workflows. It keeps the word agent for designs where the model directs its own steps. It advises starting with the simplest design that works. That matches the rule from chapter 10: pick the least autonomy that does the job."
        },
        {
          "kind": "quiz",
          "id": "agents12-q5",
          "question": "You must prove that a question about the walrus operator never reaches the `refuse` node. Which design lets you do it with one plain assertion?",
          "options": [
            "A ReAct loop, by reading the model's thoughts.",
            "The workflow, by scripting the model's choice and asserting the path the run took.",
            "Either one, since both log the answer.",
            "Neither, since both use a model."
          ],
          "answer": 1,
          "explain": "In the workflow the path is data in the saved state, and the choice is the only model output that matters. Script it, run the graph and assert on the path list."
        },
        {
          "kind": "p",
          "text": "Those are the trade-offs. Interviewers ask about this design often, and the last section gives the answer to have ready."
        }
      ]
    },
    {
      "id": "s7-interview",
      "title": "In an interview, name the pattern first, then say when you would not use it",
      "goal": "What is the 30-second answer, and how does the graph map onto LangGraph?",
      "blocks": [
        {
          "kind": "p",
          "text": "This pattern comes up in interviews, usually as a question about when you would not use an agent. Start with the name. Say it is a deterministic workflow, where code routes and the model picks from a fixed set. Then give the mechanisms."
        },
        {
          "kind": "callout",
          "tone": "interview",
          "title": "The 30-second answer",
          "text": "It is a deterministic workflow, where code routes and the model picks from a fixed set. The graph is fixed in code. At a decision point the model returns one option from an enum. Code checks that the option is allowed for the current state, or sends the request to a review queue."
        },
        {
          "kind": "callout",
          "tone": "interview",
          "title": "When I use it",
          "text": "I use it when the process is known, or when a wrong step is costly, such as money or compliance. I use an autonomous agent for open-ended research, where I can't write the steps in advance."
        },
        {
          "kind": "p",
          "text": "In LangGraph the same graph takes a few lines. You met `StateGraph` in chapter 3, where the desk's state and its triage node came from it. A LangGraph node takes the state alone and returns the keys it changes. So the nodes in this sketch are LangGraph versions of yours, with the model bound in."
        },
        {
          "kind": "code",
          "lang": "python",
          "code": "from langgraph.graph import END, START, StateGraph\n\n# RouterState is a TypedDict of question, choice, route and note.\n# Each node takes the state alone and returns the keys it changes, as in chapter 3.\ngraph = StateGraph(RouterState)\ngraph.add_node(\"classify\", classify)\ngraph.add_node(\"check_route\", check_route)\ngraph.add_node(\"extract\", extract)\ngraph.add_node(\"human_queue\", human_queue)\ngraph.add_edge(START, \"classify\")\ngraph.add_edge(\"classify\", \"check_route\")\ngraph.add_conditional_edges(\n    \"check_route\",\n    lambda state: state[\"route\"],\n    {\"lookup\": \"extract\", \"human_queue\": \"human_queue\"},\n)\ngraph.add_edge(\"human_queue\", END)\napp = graph.compile()",
          "caption": "The router in LangGraph, cut to two routes. The conditional edge reads the route that the code check wrote, not the raw model reply."
        },
        {
          "kind": "p",
          "text": "The mapping is direct. `run_graph` is `compile` and `invoke`. The `ROUTED` dict is the set of edges. `save` after each node is chapter 3's checkpointer. The code check stays your own node, because LangGraph will not write it for you."
        },
        {
          "kind": "fold",
          "tone": "dyk",
          "title": "Structured output is the enum in a framework",
          "text": "Structured output, from chapter 3, builds the enum for you when the schema has a `Literal` field, and the library parses the reply. The model can still return junk, and the library may raise. Keep your own check after it, so one bad reply lands in the review queue and not in a stack trace."
        },
        {
          "kind": "p",
          "text": "A workflow works because you can write every edge before the run starts. Some tasks don't allow that. Their steps depend on the question, and you only see them once you read it. That raises the next chapter's question. What if the task needs steps that code can't know in advance?"
        }
      ]
    }
  ],
  "lab": {
    "title": "Change the workflow and watch the path",
    "goal": "Run the module, change it two ways, then read what the saved state holds. Every lab step runs offline. Compare your file with `capstone/src/askpep/patterns/workflow.py` in the my-learn folder.",
    "minutes": 20,
    "files": [
      "src/askpep/patterns/workflow.py"
    ],
    "steps": [
      {
        "title": "Run it unchanged",
        "text": "Run the module and compare each trace with the chapter. The model calls and rough tokens must match: 2 at 78, 1 at 24, 2 at 74, 1 at 32 and 1 at 31. The last line lists the five saved requests, `req-1` to `req-5`.",
        "code": "uv run --no-sync python -m askpep.patterns.workflow"
      },
      {
        "title": "Make a bad choice valid",
        "text": "In `CASES`, change the second case's replies from `[{\"route\": \"poetry\"}]` to `[{\"route\": \"lookup\"}]`. Predict what happens, then run it. The chain, the gate node and the first router case print as before. Then a traceback ends the run. Read its last frames. The last one in `workflow.py` is `extract`, and the last line is `RuntimeError: ScriptedModel has no replies left`. The choice is now allowed, so code sent the run down the chain. The chain's two model nodes, `extract` and `write`, each need a reply, and the script holds only the route. The second case's trace never prints, because `trace` runs only after the graph returns. Now make the list `[{\"route\": \"lookup\"}, {\"query\": \"walrus\"}, {\"answer\": \"PEP 572 added the walrus operator.\"}]` and rerun. The case passes seven nodes, from `classify` to `write`, and ends `done` with 3 model calls at 118 rough tokens. The valid choice set the path, and the path set the cost. Put `poetry` back afterwards.",
        "code": "uv run --no-sync python -m askpep.patterns.workflow"
      },
      {
        "title": "Take the gate node away",
        "text": "In `GATED`, change the `search` edge from `\"gate\"` to `\"read\"`. Predict what happens to the PEP 999 question, then run it. The chain prints as before. The gate demo prints its header, then a traceback. Its last frame is `read`, on the line that turns the first search result into a PEP number. The error is `ValueError: invalid literal for int() with base 10: 'match'`. The word `match` comes from the search result `no match`. Here the failure is loud. A `read` node that tolerated the text would pass nothing to `write`, and a real model would write a plausible answer anyway. The gate node turns both cases into a clean stop. Put the edge back.",
        "code": "uv run --no-sync python -m askpep.patterns.workflow"
      },
      {
        "title": "Read the saved state",
        "text": "At the end of the `__main__` block, add `print(json.dumps(STORE['req-4'], indent=2))`, indented like the lines above it. Run it. Find the choice, the route, the note and the path in the state. Then answer: could you rebuild the run from this alone? You can rebuild its path. The question and the one choice, `poetry`, fix every edge, so a replay with that scripted choice takes the same path. The state keeps no prompt and no token count, so the cost needs a record of its own.",
        "code": "uv run --no-sync python -m askpep.patterns.workflow"
      }
    ],
    "verify": "uv run --no-sync python -m askpep.patterns.workflow"
  },
  "recap": [
    "A deterministic workflow is a workflow whose route is fixed in code. Code routes, and the model picks from a fixed set.",
    "The graph is code. Nodes are functions on one state dict, and edges are node names or functions of the state.",
    "At a decision point, code checks the model's choice against the enum and against what the state allows. A failed choice goes to the review queue.",
    "A prompt chain, a router and a gate node are the three shapes, and they combine in one graph.",
    "One state dict per request ID, saved after each node, gives you the path for tests and audits.",
    "Use a fixed workflow when the process is known or a wrong step is costly. Use an agent loop for open-ended research."
  ],
  "reinforcement": "I am becoming a forward-deployed AI engineer. In deterministic workflows I learned that code owns the graph, the model only picks one option from an enum, and code checks the pick and sends a failed one to a review queue. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  "interviewIds": [
    "agents-c12-q01",
    "agents-c12-q02",
    "agents-c12-q03",
    "agents-c12-q04"
  ]
};

export default chapter;
