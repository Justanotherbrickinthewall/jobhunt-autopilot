import type { Chapter } from "../types";

const chapter: Chapter = {
  "id": "agents-18-handoffs-by-hand",
  "course": "agents",
  "number": 18,
  "title": "A handoff moves control and passes the task ID and shared state",
  "tagline": "How do agents pass work straight to each other without losing the task? Build a three-agent swarm by hand, pass the task ID, and bound every handoff in code.",
  "minutes": 60,
  "objectives": [
    "Say where control goes after a handoff, and how that differs from chapter 17's supervisor.",
    "Say what a handoff passes and how the next agent finds the shared state.",
    "Build `swarm.py`: the store, one agent's loop and the swarm loop.",
    "Read a swarm trace and say which keys each handoff changed.",
    "Bound a swarm with the `ALLOWED` table, a handoff cap and a ping-pong check.",
    "Resume a task by its ID, and place A2A as the same idea across teams.",
    "Choose between a swarm and a supervisor, and give the 30-second answer."
  ],
  "sections": [
    {
      "id": "s1-problem",
      "title": "A handoff moves control to the next agent, and no agent sits in the centre",
      "goal": "What changes when control moves on instead of going back to a supervisor?",
      "blocks": [
        {
          "kind": "p",
          "text": "Chapter 17 kept one model in charge, and every worker reported back to it. Take that centre away, and the agents must pass the work to each other. How do agents pass work straight to each other without losing the task?"
        },
        {
          "kind": "p",
          "text": "A PEP question can pass through three hands. Triage reads it and sorts it. The researcher looks things up. The writer turns the findings into an answer."
        },
        {
          "kind": "p",
          "text": "Chapter 4 built the tool for this. A handoff is a tool call that moves control to another agent and passes context in the same step. Give each agent a handoff tool. When the researcher finishes, it calls the tool and names the writer."
        },
        {
          "kind": "p",
          "text": "The writer is now the **active agent**, the agent that holds control right now. The researcher isn't asked again. Chapter 3's desk kept this name in its `active_agent` key. Chapter 10 named the whole shape: a swarm is handoffs with no agent in charge."
        },
        {
          "kind": "compare",
          "caption": "A supervisor and a swarm, side by side",
          "columns": [
            "Question",
            "Supervisor, chapter 17",
            "Swarm"
          ],
          "rows": [
            [
              "Where does control go after an agent finishes?",
              "Back to the supervisor, every time.",
              "On to the next agent, and it stays there."
            ],
            [
              "Who knows the whole plan?",
              "The supervisor.",
              "Nobody. Each agent knows its own job and who it may pass to."
            ],
            [
              "What happens when the task must go backwards?",
              "The supervisor calls an earlier worker again.",
              "The active agent hands it back, on purpose."
            ],
            [
              "What does the shape cost?",
              "One extra model call for every decision.",
              "No single agent sees the whole run, so loops are harder to spot."
            ]
          ]
        },
        {
          "kind": "widget",
          "id": "agents18-supervisor-or-handoff",
          "intro": "Sort six flows into supervisor or handoff. Ask one question of each: after an agent finishes, does control come back to the centre?"
        },
        {
          "kind": "quiz",
          "id": "agents18-q1",
          "question": "In a handoff swarm, the researcher finishes and hands to the writer. Who gets control next?",
          "options": [
            "The researcher, to check the writer's work.",
            "A supervisor, which then picks the writer.",
            "The writer, and control stays there until it hands on or answers.",
            "Triage, because it started the task."
          ],
          "answer": 2,
          "explain": "A handoff moves control on. Control comes back to the researcher only if the writer hands it back. That is the difference from chapter 17."
        },
        {
          "kind": "fold",
          "tone": "plain",
          "title": "Where the word swarm comes from",
          "text": "OpenAI's experimental Swarm library made the name popular in 2024, with its routines and handoffs. LangGraph now ships a swarm package that keeps the active agent's name in the graph state. The name says nothing about size. Three agents passing work among themselves are still a swarm. What defines it is that no agent holds the whole plan."
        },
        {
          "kind": "p",
          "text": "Control can now move without a centre. The next question is what moves with it, so the writer knows what the researcher found."
        }
      ]
    },
    {
      "id": "s2-payload",
      "title": "A handoff passes the task ID, and the status tells the next agent what to do",
      "goal": "What travels with a handoff, and how does the next agent know where the task stands?",
      "blocks": [
        {
          "kind": "p",
          "text": "This is the part interviews test. A handoff passes the task ID and the shared state, with a short note. Chapter 10 defined both terms. A task ID is an ID made once per task, which every agent, message and record carries."
        },
        {
          "kind": "p",
          "text": "The shared state is the record every agent on a task reads and writes, keyed by the task ID. In this chapter's code the record stays in a store. The handoff carries the task ID and an update, and the next agent loads the record by that ID."
        },
        {
          "kind": "p",
          "text": "The record has a `status` field: a word from a fixed list that says how far the task has got. In `swarm.py` the statuses are new, triaged, researched and done. Each one says what is finished and which agent moves next. A handoff is the moment the status changes."
        },
        {
          "kind": "compare",
          "caption": "The four parts of a handoff",
          "columns": [
            "Part",
            "What it holds",
            "What happens to it"
          ],
          "rows": [
            [
              "Task ID",
              "A stable name for the task, such as T-1.",
              "The next agent loads the shared state from the store under that name."
            ],
            [
              "Shared state",
              "The question, the findings so far, the draft, the status and a handoff count.",
              "The next agent reads the status and carries on from there."
            ],
            [
              "Update",
              "The keys the agent changed, such as a new status and its findings.",
              "The loop merges it into the shared state before control moves."
            ],
            [
              "Note",
              "One sentence on why control moved.",
              "It goes to the trace for a person to read. No agent sees it in this code."
            ]
          ]
        },
        {
          "kind": "p",
          "text": "The next agent loads the state by task ID and reads the status. At researched, it writes. At triaged, it researches. The status is the contract between the agents. Chapter 10's map called this owner of state the baton, because the state travels with control."
        },
        {
          "kind": "callout",
          "tone": "interview",
          "title": "Say what a handoff passes",
          "text": "Don't stop at \"it switches the active agent\". Say that a handoff passes the task ID and the shared state, and that the state moves through fixed statuses. The next agent loads the state by its ID and carries on from the status it finds. That is the sentence a weak answer lacks."
        },
        {
          "kind": "quiz",
          "id": "agents18-q2",
          "question": "A handoff arrives with only a task ID. What must the next agent do?",
          "options": [
            "Ask the previous agent for the findings.",
            "Load the shared state by that ID, read the status and carry on from it.",
            "Start the task again from the question.",
            "Ask a supervisor which agent owns the task."
          ],
          "answer": 1,
          "explain": "The state sits in a store under the task ID, and the status says where the task stands. Nothing else needs to travel, so the same design works across processes."
        },
        {
          "kind": "fold",
          "tone": "hood",
          "title": "Why the status is a fixed list",
          "text": "A free-text status, such as the model's own summary, can't drive routing. Your code can't compare it or reject it. A fixed list lets code check every update. The swarm in this chapter refuses a status that isn't in `STATUSES`."
        },
        {
          "kind": "p",
          "text": "That is the whole contract: a store, a task ID, a status and a note. The next section writes it as code."
        }
      ]
    },
    {
      "id": "s3-build",
      "title": "The whole swarm fits in 130 lines of plain Python",
      "goal": "How do the store, one agent's loop and the swarm loop fit together?",
      "blocks": [
        {
          "kind": "p",
          "text": "Work in your AskPEP repository. The file is `src/askpep/patterns/swarm.py`. It imports the kit from chapter 10 and `parse`, the reply check, from chapter 11. Each agent runs chapter 11's loop with one extra tool, the handoff. The reference copy is in the my-learn folder under `capstone`."
        },
        {
          "kind": "step",
          "id": "agents18-s1",
          "title": "Write the store and the statuses",
          "text": "Start with the constants. `STATUSES` is the fixed list. `OWNER` says which agent works a task in each status. `ALLOWED` says who may hand to whom. `STORE` holds the shared state, keyed by task ID. It is this file's own store, separate from chapter 12's.",
          "lang": "python",
          "file": "src/askpep/patterns/swarm.py",
          "code": "\"\"\"Handoffs by hand: each agent runs a loop, and a handoff tool moves control to the next agent.\n\nThere is no supervisor. A handoff passes the task ID and a note. The shared state sits in a store\nunder that ID, and its status says where the task is.\n\"\"\"\n\nimport json\nimport sys\n\nfrom askpep.patterns.kit import Run, Tools, fake_pep_tools, make_model, trace\nfrom askpep.patterns.react import parse\n\nSTATUSES = [\"new\", \"triaged\", \"researched\", \"done\"]\nOWNER = {\"new\": \"triage\", \"triaged\": \"researcher\", \"researched\": \"writer\"}  # who works a task in each status\nALLOWED = {\"triage\": {\"researcher\"}, \"researcher\": {\"writer\", \"triage\"}, \"writer\": {\"researcher\"}}\nMAX_TURNS = 4\n\nSTORE: dict[str, dict] = {}  # shared state, keyed by task ID\n\n\ndef snap(state: dict) -> str:\n    return json.dumps({k: v for k, v in state.items() if k != \"question\"})"
        },
        {
          "kind": "step",
          "id": "agents18-s2",
          "title": "Write one agent's loop",
          "text": "Add `run_agent`. It loads the state by task ID, builds the prompt and runs chapter 11's loop, for at most `MAX_TURNS` model calls. A handoff call ends the loop and returns its arguments. An answer sets the status to done. Any other tool runs, and its result goes back as an observation.",
          "lang": "python",
          "file": "src/askpep/patterns/swarm.py",
          "code": "def run_agent(name: str, task_id: str, model, run: Run) -> dict | None:\n    \"\"\"One agent's loop. Returns the handoff args if the agent handed off, or None if it answered.\"\"\"\n    state = STORE[task_id]  # the agent loads the state by ID and reads the status\n    tools = fake_pep_tools() if name == \"researcher\" else Tools()\n    names = tools.names() + [f\"handoff (to one of {sorted(ALLOWED[name])})\"]\n    messages = [\n        {\"role\": \"system\", \"content\": f\"You are the {name}. Tools: {', '.join(names)}. Answer, or hand off.\"},\n        {\"role\": \"user\", \"content\": f\"{state['question']}\\nState: {snap(state)}\"},\n    ]\n    for _ in range(MAX_TURNS):\n        try:\n            kind, reply = parse(model(messages))\n        except ValueError as exc:\n            note = f\"FormatError: {exc}\"\n            run.add(\"error\", note)\n            messages.append({\"role\": \"user\", \"content\": note})\n            continue\n        if kind == \"answer\":\n            state.update(draft=reply[\"answer\"], status=\"done\")\n            run.add(\"answer\", reply[\"answer\"])\n            return None\n        run.add(\"think\", reply.get(\"thought\", \"\"))\n        if reply[\"tool\"] == \"handoff\":\n            return reply[\"args\"]\n        run.add(\"tool\", f\"{reply['tool']}({json.dumps(reply['args'])})\")\n        result = tools.call(reply[\"tool\"], reply[\"args\"])\n        run.add(\"observe\", json.dumps(result))\n        messages.append({\"role\": \"assistant\", \"content\": json.dumps(reply)})\n        messages.append({\"role\": \"user\", \"content\": f\"Observation: {json.dumps(result)}\"})\n    return None"
        },
        {
          "kind": "step",
          "id": "agents18-s3",
          "title": "Write the swarm loop",
          "text": "Add `swarm`. It picks the first agent from the status it finds, then runs agents until one answers. A handoff must pass three guards in order: `ALLOWED`, `STATUSES` and a cap on handoffs per task. Then the loop applies the update and moves control. A fourth guard stops two agents passing the task back and forth.",
          "lang": "python",
          "file": "src/askpep/patterns/swarm.py",
          "code": "def swarm(question: str, task_id: str, model, max_handoffs: int = 4) -> Run:\n    \"\"\"Run agents until one answers. Control moves on with each handoff and never returns by itself.\"\"\"\n    run = Run(question, model=model)\n    STORE.setdefault(task_id, {\"task_id\": task_id, \"question\": question, \"status\": \"new\", \"findings\": [], \"draft\": \"\", \"handoffs\": 0})\n    state = STORE[task_id]\n    active = OWNER[state[\"status\"]]  # carry on from the status the state is in\n    visited = [active]\n    while True:\n        run.add(\"agent\", f\"{active} has task {task_id} at status {state['status']}\")\n        args = run_agent(active, task_id, model, run)\n        if args is None:\n            if state[\"status\"] != \"done\":\n                run.add(\"stop\", f\"{active} ran out of turns\")\n            return run\n        to, note, update = args.get(\"to\"), args.get(\"note\", \"\"), args.get(\"update\", {})\n        if to not in ALLOWED[active]:\n            run.add(\"stop\", f\"{active} may not hand to {to}\")\n            return run\n        if update.get(\"status\", state[\"status\"]) not in STATUSES:\n            run.add(\"stop\", f\"{update['status']!r} is not a status\")\n            return run\n        if state[\"handoffs\"] >= max_handoffs:\n            run.add(\"stop\", f\"handoff cap of {max_handoffs} reached\")\n            return run\n        run.add(\"handoff\", f\"{active} to {to}: {note}\")\n        run.add(\"state\", f\"before {snap(state)}\")\n        state.update(update, handoffs=state[\"handoffs\"] + 1)\n        run.add(\"state\", f\"after  {snap(state)}\")\n        active = to\n        visited.append(active)\n        last = visited[-4:]\n        if len(last) == 4 and last[0] == last[2] and last[1] == last[3] and last[0] != last[1]:\n            run.add(\"stop\", f\"ping-pong between {last[0]} and {last[1]}\")\n            return run"
        },
        {
          "kind": "step",
          "id": "agents18-s4",
          "title": "Add the scripted runs and run them",
          "text": "Append the scripts and `main`. Each scenario has its own task ID and replies, so one behaviour shows at a time. The last one starts from a state saved earlier. Run it with `uv run --no-sync python -m askpep.patterns.swarm`. It needs no network and no key.",
          "lang": "python",
          "file": "src/askpep/patterns/swarm.py",
          "code": "def hand(to: str, note: str, **update) -> dict:\n    return {\"thought\": f\"Hand to the {to}.\", \"tool\": \"handoff\", \"args\": {\"to\": to, \"note\": note, \"update\": update}}\n\n\nTRIAGE = hand(\"researcher\", \"a version question\", status=\"triaged\", topic=\"walrus operator\")\nSEARCH = {\"thought\": \"Find the PEP first.\", \"tool\": \"search_peps\", \"args\": {\"query\": \"walrus\"}}\nVERSION = {\"thought\": \"Now the version.\", \"tool\": \"python_feature_version\", \"args\": {\"feature\": \"walrus operator\"}}\nTO_WRITER = hand(\"writer\", \"found the version\", status=\"researched\", findings=[\"PEP 572\", \"3.8\"])\nBACK = hand(\"researcher\", \"the draft needs a source\", status=\"triaged\")\nANSWER = {\"answer\": \"The walrus operator came in Python 3.8, through PEP 572.\"}\nQUESTION = \"Which Python version added the walrus operator?\"\n\nSCENARIOS = {\n    \"a clean run\": (\"T-1\", [TRIAGE, SEARCH, VERSION, TO_WRITER, ANSWER], 4, None),\n    \"a handoff the rules refuse\": (\"T-2\", [hand(\"writer\", \"skip the research\", status=\"researched\"), ANSWER], 4, None),\n    \"ping-pong between two agents\": (\"T-3\", [TRIAGE, TO_WRITER, BACK, TO_WRITER, BACK], 6, None),\n    \"a cap of one handoff\": (\"T-4\", [TRIAGE, SEARCH, TO_WRITER], 1, None),\n    \"a task resumed by its ID\": (\n        \"T-5\",\n        [ANSWER],\n        4,\n        {\"task_id\": \"T-5\", \"question\": QUESTION, \"status\": \"researched\", \"findings\": [\"PEP 572\", \"3.8\"], \"draft\": \"\", \"handoffs\": 2},\n    ),\n}\n\n\ndef main(live: bool = False) -> None:\n    for name, (task_id, replies, cap, saved) in SCENARIOS.items():\n        STORE.clear()\n        if saved:\n            STORE[task_id] = saved  # as if another process had saved it\n        print(f\"== {name} ==\")\n        trace(swarm(QUESTION, task_id, make_model(replies, live), cap))\n        print()\n\n\nif __name__ == \"__main__\":\n    main(live=\"--live\" in sys.argv)",
          "expect": "== a clean run ==\nQ: Which Python version added the walrus operator?\n 1. agent   triage has task T-1 at status new\n 2. think   Hand to the researcher.\n 3. handoff triage to researcher: a version question\n 4. state   before {\"task_id\": \"T-1\", \"status\": \"new\", \"findings\": [], \"draft\": \"\", \"handoffs\": 0}\n 5. state   after  {\"task_id\": \"T-1\", \"status\": \"triaged\", \"findings\": [], \"draft\": \"\", \"handoffs\": 1, \"topic\": \"walrus operator\"}\n 6. agent   researcher has task T-1 at status triaged\n 7. think   Find the PEP first.\n 8. tool    search_peps({\"query\": \"walrus\"})\n 9. observe [\"PEP 572: Assignment Expressions\"]\n10. think   Now the version.\n11. tool    python_feature_version({\"feature\": \"walrus operator\"})\n12. observe \"3.8\"\n13. think   Hand to the writer.\n14. handoff researcher to writer: found the version\n15. state   before {\"task_id\": \"T-1\", \"status\": \"triaged\", \"findings\": [], \"draft\": \"\", \"handoffs\": 1, \"topic\": \"walrus operator\"}\n16. state   after  {\"task_id\": \"T-1\", \"status\": \"researched\", \"findings\": [\"PEP 572\", \"3.8\"], \"draft\": \"\", \"handoffs\": 2, \"topic\": \"walrus operator\"}\n17. agent   writer has task T-1 at status researched\n18. answer  The walrus operator came in Python 3.8, through PEP 572.\nmodel calls: 5, rough tokens: 781\n\n== a handoff the rules refuse ==\nQ: Which Python version added the walrus operator?\n 1. agent   triage has task T-2 at status new\n 2. think   Hand to the writer.\n 3. stop    triage may not hand to writer\nmodel calls: 1, rough tokens: 111\n\n== ping-pong between two agents ==\nQ: Which Python version added the walrus operator?\n 1. agent   triage has task T-3 at status new\n 2. think   Hand to the researcher.\n 3. handoff triage to researcher: a version question\n 4. state   before {\"task_id\": \"T-3\", \"status\": \"new\", \"findings\": [], \"draft\": \"\", \"handoffs\": 0}\n 5. state   after  {\"task_id\": \"T-3\", \"status\": \"triaged\", \"findings\": [], \"draft\": \"\", \"handoffs\": 1, \"topic\": \"walrus operator\"}\n 6. agent   researcher has task T-3 at status triaged\n 7. think   Hand to the writer.\n 8. handoff researcher to writer: found the version\n 9. state   before {\"task_id\": \"T-3\", \"status\": \"triaged\", \"findings\": [], \"draft\": \"\", \"handoffs\": 1, \"topic\": \"walrus operator\"}\n10. state   after  {\"task_id\": \"T-3\", \"status\": \"researched\", \"findings\": [\"PEP 572\", \"3.8\"], \"draft\": \"\", \"handoffs\": 2, \"topic\": \"walrus operator\"}\n11. agent   writer has task T-3 at status researched\n12. think   Hand to the researcher.\n13. handoff writer to researcher: the draft needs a source\n14. state   before {\"task_id\": \"T-3\", \"status\": \"researched\", \"findings\": [\"PEP 572\", \"3.8\"], \"draft\": \"\", \"handoffs\": 2, \"topic\": \"walrus operator\"}\n15. state   after  {\"task_id\": \"T-3\", \"status\": \"triaged\", \"findings\": [\"PEP 572\", \"3.8\"], \"draft\": \"\", \"handoffs\": 3, \"topic\": \"walrus operator\"}\n16. agent   researcher has task T-3 at status triaged\n17. think   Hand to the writer.\n18. handoff researcher to writer: found the version\n19. state   before {\"task_id\": \"T-3\", \"status\": \"triaged\", \"findings\": [\"PEP 572\", \"3.8\"], \"draft\": \"\", \"handoffs\": 3, \"topic\": \"walrus operator\"}\n20. state   after  {\"task_id\": \"T-3\", \"status\": \"researched\", \"findings\": [\"PEP 572\", \"3.8\"], \"draft\": \"\", \"handoffs\": 4, \"topic\": \"walrus operator\"}\n21. stop    ping-pong between researcher and writer\nmodel calls: 4, rough tokens: 541\n\n== a cap of one handoff ==\nQ: Which Python version added the walrus operator?\n 1. agent   triage has task T-4 at status new\n 2. think   Hand to the researcher.\n 3. handoff triage to researcher: a version question\n 4. state   before {\"task_id\": \"T-4\", \"status\": \"new\", \"findings\": [], \"draft\": \"\", \"handoffs\": 0}\n 5. state   after  {\"task_id\": \"T-4\", \"status\": \"triaged\", \"findings\": [], \"draft\": \"\", \"handoffs\": 1, \"topic\": \"walrus operator\"}\n 6. agent   researcher has task T-4 at status triaged\n 7. think   Find the PEP first.\n 8. tool    search_peps({\"query\": \"walrus\"})\n 9. observe [\"PEP 572: Assignment Expressions\"]\n10. think   Hand to the writer.\n11. stop    handoff cap of 1 reached\nmodel calls: 3, rough tokens: 440\n\n== a task resumed by its ID ==\nQ: Which Python version added the walrus operator?\n 1. agent   writer has task T-5 at status researched\n 2. answer  The walrus operator came in Python 3.8, through PEP 572.\nmodel calls: 1, rough tokens: 99"
        },
        {
          "kind": "p",
          "text": "The five runs make 5, 1, 4, 3 and 1 model calls. Read the first run first, because nothing goes wrong in it."
        },
        {
          "kind": "quiz",
          "id": "agents18-q3",
          "question": "In `swarm`, how does the loop know which agent starts?",
          "options": [
            "It always starts with triage.",
            "It reads the status in the state and looks up the owner.",
            "It asks the model.",
            "It starts with the agent named first in `ALLOWED`."
          ],
          "answer": 1,
          "explain": "The loop looks up `OWNER[state[\"status\"]]`. A new task starts at triage, and a researched task starts at the writer. That is also how a resumed task carries on."
        },
        {
          "kind": "fold",
          "tone": "hood",
          "title": "Why the shared state is a plain dict",
          "text": "A dict is easy to print, save as JSON and send to another process. Every agent reads the same keys, and updates merge in with `dict.update`. A real build would use a typed class, as chapter 3's state did. The mechanism is the same."
        },
        {
          "kind": "p",
          "text": "The next section reads that first run line by line, and watches the state change at each handoff."
        }
      ]
    },
    {
      "id": "s4-trace",
      "title": "In the trace the status moves forward, and control never returns",
      "goal": "What does the state look like before and after each handoff?",
      "blocks": [
        {
          "kind": "p",
          "text": "Open the clean run. Line 1 says triage has task T-1 at status new. Triage thinks, then calls the handoff tool. Line 3 shows the handoff: from triage to the researcher, with a one-line note."
        },
        {
          "kind": "p",
          "text": "Lines 4 and 5 show the state around that handoff. Before it, the status is new and the handoff count is 0. After it, the status is triaged, the count is 1 and a new `topic` key has appeared. Triage wrote that key in its update."
        },
        {
          "kind": "p",
          "text": "The researcher runs next. It searches, reads the observation, looks up the version and hands to the writer. The status becomes researched, and the findings are now in the state. The writer never sees the researcher's tool calls. It sees only the question and the state."
        },
        {
          "kind": "list",
          "items": [
            "The status goes from new to triaged to researched with each handoff, and to done when the writer answers.",
            "Each agent writes only what its job produces: triage the topic, the researcher the findings, the writer the draft. Nothing in the code enforces this. The scripts are simply written that way.",
            "The handoff count goes up by one each time, and the cap reads it.",
            "Control never returns to triage, because nobody hands to it."
          ]
        },
        {
          "kind": "widget",
          "id": "agents18-state-stepper",
          "intro": "Each case is a state loaded by its task ID. Say which agent carries on. Watch for the status that no agent owns."
        },
        {
          "kind": "quiz",
          "id": "agents18-q4",
          "question": "After the researcher's handoff in the clean run, which keys changed in the state?",
          "options": [
            "Only the status.",
            "The status, the findings and the handoff count.",
            "The question and the draft.",
            "Nothing, because the note carries the findings."
          ],
          "answer": 1,
          "explain": "The update set the status to researched and filled in the findings. The loop added one to the handoff count. The note is a sentence for the trace and holds no data."
        },
        {
          "kind": "fold",
          "tone": "trouble",
          "title": "When the next agent ignores the status",
          "text": "An agent that starts from the question alone, and not the status, repeats work the last agent did. You pay twice, and the findings may differ. If a run seems to redo a step, check that each agent reads the status and that the previous agent wrote it."
        },
        {
          "kind": "p",
          "text": "The clean run never tested a rule. The next section breaks the rules on purpose and watches what stops the run."
        }
      ]
    },
    {
      "id": "s5-guards",
      "title": "With no centre to count, guards in the shared loop bound the swarm",
      "goal": "What stops a swarm that loops for ever or takes a route it shouldn't?",
      "blocks": [
        {
          "kind": "p",
          "text": "A supervisor can count its own calls, because every decision passes through it. A swarm has no such place, so the guards live in the shared loop, `swarm`. Runs two to four each show one guard fire."
        },
        {
          "kind": "list",
          "items": [
            "The `ALLOWED` table says which agent may hand to which. Triage may hand only to the researcher. In the second run triage tries the writer, and the run stops with `triage may not hand to writer`.",
            "The handoff cap is the most handoffs one task may make. The fourth run sets it to 1. The researcher's handoff would be the second, so the run stops with `handoff cap of 1 reached`.",
            "The ping-pong check looks at the last four agents, and stops the run when two of them alternate. In the third run the writer sends the task back for a source, and the researcher and the writer swap it twice."
          ]
        },
        {
          "kind": "p",
          "text": "The cap alone would catch the ping-pong, but late. With a cap of 6, the third run could make six handoffs, and the ping-pong check stops it after four. The `ALLOWED` table works on routes. A route it doesn't list can't happen at all."
        },
        {
          "kind": "p",
          "text": "A fourth guard refuses any status that isn't in `STATUSES`. Without it, a typo in an update would leave the task under a status no agent owns."
        },
        {
          "kind": "widget",
          "id": "agents18-guard-judge",
          "intro": "Each case gives the settings and a path. Say which guard stops the run. Watch for the case where two guards could fire and only one gets there first."
        },
        {
          "kind": "quiz",
          "id": "agents18-q5",
          "question": "Why add a ping-pong check when a handoff cap already exists?",
          "options": [
            "The cap does not work on a swarm.",
            "The ping-pong check stops a loop earlier, at the first sign of two agents alternating.",
            "The ping-pong check lets agents hand back more often.",
            "The cap is only for the first handoff."
          ],
          "answer": 1,
          "explain": "A cap stops a loop after a fixed count, however high you set it. The ping-pong check spots the pattern itself and stops sooner. You want both: one catches the shape, the other bounds anything else."
        },
        {
          "kind": "fold",
          "tone": "hood",
          "title": "What the ping-pong check misses",
          "text": "It spots two agents that alternate. The researcher can still circle between triage and the writer: researcher, writer, researcher, triage, and round again. No four agents in a row alternate, so only the cap stops it. Counting repeated states catches more shapes, but a changing state can hide a loop too. Keep the cap as the final guard."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "A refused handoff must stop or fall back, never vanish",
          "text": "In the second run the swarm stops with a reason. A quieter design would drop the handoff and let the agent carry on. The task would look alive while nobody worked on it. Log every refusal, or put the task on a review queue as chapter 12 did."
        },
        {
          "kind": "p",
          "text": "Every run so far started at status new. The last run starts halfway, in a process that never saw the first two agents."
        }
      ]
    },
    {
      "id": "s6-across",
      "title": "Because the state lives under the task ID, another process can carry on",
      "goal": "How does a task carry on in a process that never saw its earlier agents?",
      "blocks": [
        {
          "kind": "p",
          "text": "Read the last run. Task T-5 starts from a saved state at status researched, with two handoffs already counted. This process never ran triage or the researcher. It loaded the state, looked up the owner of researched and started the writer. That is what the task ID buys."
        },
        {
          "kind": "p",
          "text": "The run fakes the other process by putting the saved state in `STORE` first. In production the store is a database table, or a checkpoint as in chapter 7. The shape of the handoff stays the same."
        },
        {
          "kind": "p",
          "text": "The same idea crosses team lines. Another team's citation checker, run as its own service, shares no process or dict with you. You send it a task with an ID, and it reports a status as it works."
        },
        {
          "kind": "p",
          "text": "A2A, from chapter 9, is a protocol that lets one agent call an agent that another team runs. Its tasks carry IDs and statuses. It is this chapter's handoff, with the names agreed between teams."
        },
        {
          "kind": "fold",
          "tone": "industry",
          "title": "What A2A adds to a handoff",
          "text": "An A2A agent publishes an agent card, which says what it can do and how to reach it. A client agent sends it a task with an ID, and the task moves through states such as working and completed. The two teams agree on those states. Check the current specification before you rely on any detail."
        },
        {
          "kind": "quiz",
          "id": "agents18-q6",
          "question": "Task T-5 arrives at a new process with a saved status of researched. What should the process do?",
          "options": [
            "Run triage first, to be safe.",
            "Run the researcher again, to check the findings.",
            "Start the writer, because the status says research is finished.",
            "Reject the task, because it did not start here."
          ],
          "answer": 2,
          "explain": "The status says what is done. The owner of researched is the writer, so the writer starts. Re-running earlier agents would waste calls and could change the findings."
        },
        {
          "kind": "callout",
          "tone": "insight",
          "title": "A handoff is only as good as its store",
          "text": "If two processes load the same task and both act, you get two answers. The store needs a rule that lets only one of them act on each status."
        },
        {
          "kind": "p",
          "text": "That is the whole mechanism. The last section decides when to use it."
        }
      ]
    },
    {
      "id": "s7-interview",
      "title": "Choose a swarm when the route depends on the task, and build its guards yourself",
      "goal": "When does a swarm beat a supervisor, and how do you say so in 30 seconds?",
      "blocks": [
        {
          "kind": "p",
          "text": "A swarm fits when the route depends on what each agent finds, or when the agents belong to different teams. It fits badly when you need one place to log, audit or cap the whole run. A supervisor gives you that place."
        },
        {
          "kind": "p",
          "text": "If code can fix the route in advance, chapter 12's deterministic workflow is cheaper than both. It needs no model call to pick the next agent."
        },
        {
          "kind": "p",
          "text": "In LangGraph, a node hands off by returning a `Command`. Its `goto` names the next node, and its `update` writes to the graph state. Chapter 3's triage node returned one, and so did chapter 4's transfer tools."
        },
        {
          "kind": "code",
          "lang": "python",
          "code": "def researcher(state: DeskState) -> Command:\n    findings = search(state[\"question\"])\n    return Command(goto=\"writer\", update={\"status\": \"researched\", \"findings\": findings})",
          "caption": "A LangGraph node that hands the task to the writer and moves the status to researched"
        },
        {
          "kind": "p",
          "text": "The graph state plays the shared dict. The checkpointer and the thread id play the store and the task ID. The guards are still yours. Chapter 6's recursion limit gives you a cap, and you write the table and the ping-pong check."
        },
        {
          "kind": "p",
          "text": "This choice comes up in interviews. The interviewer wants to hear what a handoff passes and what stops a swarm."
        },
        {
          "kind": "callout",
          "tone": "interview",
          "title": "The 30-second answer",
          "text": "In a handoff pattern each agent has a handoff tool. Calling it switches the active agent, and control comes back only if an agent hands it back. The handoff passes the task ID and the shared state, with a short note. The state moves through fixed statuses, and the next agent loads it by ID and carries on from the status. I bound it with a handoff cap, a ping-pong check and a table of who may hand to whom. In LangGraph a node returns a Command with goto and update."
        },
        {
          "kind": "quiz",
          "id": "agents18-q7",
          "question": "A team needs one log of every routing decision and a hard cap on cost. Which shape is easier?",
          "options": [
            "A swarm, because it has no centre.",
            "A supervisor, because every decision passes through one place.",
            "Either, because the guards are identical.",
            "Neither, because they cannot log."
          ],
          "answer": 1,
          "explain": "A supervisor is one place where every routing decision happens. You log and cap it there. A swarm spreads the decisions, so you must add the log and the cap to the shared loop yourself."
        },
        {
          "kind": "fold",
          "tone": "industry",
          "title": "Mixed designs are common",
          "text": "Many systems use a supervisor for the main flow and a handoff for a narrow case, such as passing a task to a specialist team. Nothing forces one shape. Pick by where you need control, and say so when you explain the design."
        },
        {
          "kind": "p",
          "text": "A swarm keeps one active agent at a time, so only one agent writes the state at any moment. Some tasks want several agents on one record at once, each adding its own part. What if many agents need to read and write the same state?"
        }
      ]
    }
  ],
  "lab": {
    "title": "Change the swarm and watch the guards",
    "goal": "Run the module, then change one thing at a time and predict the result before you run it. Every lab step runs offline. Compare your file with `capstone/src/askpep/patterns/swarm.py` in the my-learn folder.",
    "minutes": 20,
    "files": [
      "src/askpep/patterns/swarm.py"
    ],
    "steps": [
      {
        "title": "Run it unchanged",
        "text": "Run the module and compare all five runs with the chapter. The model call counts must read 5, 1, 4, 3 and 1, in that order.",
        "code": "uv run --no-sync python -m askpep.patterns.swarm"
      },
      {
        "title": "Allow the shortcut",
        "text": "Add `writer` to the triage entry in `ALLOWED`. Predict what the second run does now, then run it. The handoff goes through, and the state after it shows status researched with empty findings. The writer answers anyway, in 2 model calls and 208 rough tokens. Its script kept a spare answer for this lab step. Restore the table afterwards.",
        "code": "uv run --no-sync python -m askpep.patterns.swarm"
      },
      {
        "title": "Lower the cap on the ping-pong run",
        "text": "In the third scenario, change the cap from 6 to 3. Predict which guard fires first, and on which handoff, then run it. The run now ends with `handoff cap of 3 reached` at line 18. The researcher's fourth handoff is refused before the ping-pong check sees four agents in a row.",
        "code": "uv run --no-sync python -m askpep.patterns.swarm"
      },
      {
        "title": "Add a status",
        "text": "Add `\"checked\"` to `STATUSES`, before `\"done\"`. In the fifth scenario, change the saved status from `researched` to `checked`. Predict what happens, then run it. The first four runs print as before. The fifth prints its header, then a traceback. Read it from the bottom. The last line is `KeyError: 'checked'`, and the frame above it points into `swarm`, at `active = OWNER[state[\"status\"]]`. `STATUSES` let the status in, but `OWNER` names no agent for it. Add `\"checked\": \"writer\"` to `OWNER` and run it again. The writer starts at status checked and answers in one model call. The lesson is that a new status needs its owner in the same change. `done` has no owner either, so a task saved at done would crash the same way.",
        "code": "uv run --no-sync python -m askpep.patterns.swarm"
      },
      {
        "title": "Break the resume",
        "text": "In the fifth scenario, change the saved status from `researched` to `triaged`. Predict which agent starts and what it does with the scripted reply, then run it. The researcher starts at status triaged and takes the reply as its own answer, so no search runs. An agent trusts the status alone, so a wrong status sends the task to the wrong agent.",
        "code": "uv run --no-sync python -m askpep.patterns.swarm"
      }
    ],
    "verify": "uv run --no-sync python -m askpep.patterns.swarm"
  },
  "recap": [
    "A handoff switches the active agent, and control comes back only if an agent hands it back.",
    "A handoff passes the task ID and the shared state, with a short note for the trace.",
    "The next agent loads the state by task ID and carries on from the status it finds.",
    "A swarm has no centre, so the `ALLOWED` table, a handoff cap and a ping-pong check live in the shared loop.",
    "Every status an agent works needs an entry in `OWNER`, or the lookup that picks the next agent crashes.",
    "A2A carries the same idea across teams."
  ],
  "reinforcement": "I am becoming a forward-deployed AI engineer. In handoffs by hand I learned that a handoff moves control and passes the task ID and the shared state, which moves through fixed statuses. The next agent loads the state by its ID and carries on from the status. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  "interviewIds": [
    "agents-c18-q01",
    "agents-c18-q02",
    "agents-c18-q03"
  ]
};

export default chapter;
