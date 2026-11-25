import type { Chapter } from "../types";

const chapter: Chapter = {
  "id": "agents-19-blackboard",
  "course": "agents",
  "number": 19,
  "title": "A blackboard lets many agents share one record, keyed by the task ID",
  "tagline": "How can many agents work on one task through a shared record instead of messages? Build the board in SQLite, pick agents by their conditions, resume a killed run and reject a stale write.",
  "minutes": 60,
  "objectives": [
    "Say who picks the next agent in a supervisor, a swarm and a blackboard.",
    "Write each agent's condition as a test on the board.",
    "Keep the board in SQLite, with a version number that guards every write.",
    "Write the agents and a controller that stops in three ways.",
    "Resume a killed run from the saved board.",
    "Reject a stale write, and decide what the losing writer does next.",
    "Choose a blackboard over the other patterns, and give the 30-second answer."
  ],
  "sections": [
    {
      "id": "s1-board",
      "title": "Agents that pass work along must know each other, and a shared board removes that",
      "goal": "What breaks when agents pass work along, and what does one shared record change?",
      "blocks": [
        {
          "kind": "p",
          "text": "Chapter 18 ended on a question. What if many agents need to read and write the same state? A swarm lets only the active agent write, and each agent must name the next one. This chapter drops both rules. How can many agents work on one task through a shared record instead of messages?"
        },
        {
          "kind": "p",
          "text": "Take a version question about a PEP. It has four jobs. The researcher searches the PEPs. The versioner looks up the Python version. The writer drafts the answer from both results. The reviewer checks the draft."
        },
        {
          "kind": "p",
          "text": "You could chain them, so each agent passes its result to the next. That works until a job changes. Add a second searcher, and every agent that passes work to a searcher must learn about it. Drop the versioner, and the writer waits for a result that never comes."
        },
        {
          "kind": "p",
          "text": "A **blackboard** is one shared record per task that agents read and write, while a controller picks who acts. The record is chapter 10's shared state, keyed by the task ID. Chapter 10's map called it the board. It has named sections: the question, the findings, the versions, a draft and a status."
        },
        {
          "kind": "p",
          "text": "Agents never message each other. Each one reads the board and writes its own section. No agent holds control, and no agent names the next one."
        },
        {
          "kind": "p",
          "text": "Chapters 17 and 18 also kept the state in one place. What differs is who picks the next agent. On a blackboard, nobody picks by name, and what is already on the board decides."
        },
        {
          "kind": "compare",
          "caption": "Three ways to share the work of one task",
          "columns": [
            "Pattern",
            "Who picks the next agent",
            "Where the state lives",
            "What an agent knows about the others"
          ],
          "rows": [
            [
              "Supervisor, chapter 17",
              "The supervisor's model",
              "In the supervisor's own messages",
              "Nothing, because the supervisor calls it"
            ],
            [
              "Handoffs, chapter 18",
              "The active agent",
              "In a store under the task ID",
              "Who it may hand to, from the `ALLOWED` table"
            ],
            [
              "Blackboard, this chapter",
              "A controller, by testing conditions on the board",
              "In one record under the task ID, split into sections",
              "Nothing. It reads the board and writes its section"
            ]
          ]
        },
        {
          "kind": "quiz",
          "id": "agents19-q1",
          "question": "On a blackboard, how does the writer get what the researcher found?",
          "options": [
            "The researcher sends it a message when it finishes.",
            "The researcher hands over control with the findings attached.",
            "It reads the findings section of the shared board.",
            "The supervisor copies the findings into its prompt."
          ],
          "answer": 2,
          "explain": "Agents never message each other on a blackboard. The researcher writes its findings section, and any agent that needs them reads the board. Neither agent needs to know the other exists."
        },
        {
          "kind": "p",
          "text": "If no agent names the next one, something still has to choose. The next section shows how the board does it."
        }
      ]
    },
    {
      "id": "s2-controller",
      "title": "Each agent declares a condition on the board, and a controller runs the first that holds",
      "goal": "With no agent naming the next one, how does the board decide who acts?",
      "blocks": [
        {
          "kind": "p",
          "text": "The board has two kinds of part. The sections hold data. The conditions hold the rules. Each agent declares the condition under which it can act, written as a test on the board."
        },
        {
          "kind": "list",
          "items": [
            "The researcher can act when the question exists and there are no findings.",
            "The versioner can act when the question exists and there is no versions section.",
            "The writer can act when the findings and the versions exist and there is no draft.",
            "The reviewer can act when a draft exists and the status isn't done."
          ]
        },
        {
          "kind": "p",
          "text": "The controller is a loop with no model in it. It reads the board and runs the first agent whose condition holds. That agent writes one section. The controller then reads the board again."
        },
        {
          "kind": "p",
          "text": "Chapter 10's controller owned the state, as a supervisor does. Here the board owns the state, and the controller only picks who acts."
        },
        {
          "kind": "p",
          "text": "At the start, two conditions hold: the researcher's and the versioner's. Neither agent is told to go first. The order of the agent list breaks the tie. The writer needs no rule that says wait, because its condition stays false until the findings and the versions exist."
        },
        {
          "kind": "widget",
          "id": "agents19-who-acts",
          "intro": "Be the controller for six boards. Predict who acts before you pick. Watch the board where an agent has been removed."
        },
        {
          "kind": "quiz",
          "id": "agents19-q2",
          "question": "Both the researcher's and the versioner's conditions hold. What decides who acts first?",
          "options": [
            "The agent that finishes faster.",
            "The order of the agent list in the controller.",
            "A vote between the two agents.",
            "The agent with the shorter prompt."
          ],
          "answer": 1,
          "explain": "The controller runs the first agent in its list whose condition holds. The other agent acts on the next pass of the loop, because its condition still holds. The list order is the only tie-break, so keep it explicit."
        },
        {
          "kind": "p",
          "text": "A model can be the controller instead. It reads the board and names the agent. That helps when the conditions are fuzzy. It also costs a model call for every pick, and the same board may not get the same pick twice. This chapter keeps the controller as plain code."
        },
        {
          "kind": "p",
          "text": "The conditions read the board on every pass. So the board must sit where every agent can reach it, and it must outlive a crash. The next section stores it."
        }
      ]
    },
    {
      "id": "s3-store",
      "title": "The board is one SQLite row per task ID, with a version number on every write",
      "goal": "Where does the board live, so that it survives a crash and refuses a stale write?",
      "blocks": [
        {
          "kind": "p",
          "text": "Work in your AskPEP repository. The file is `src/askpep/patterns/blackboard.py`, and it imports the kit from chapter 10. The reference copy is `capstone/src/askpep/patterns/blackboard.py` in the my-learn folder."
        },
        {
          "kind": "p",
          "text": "A board in memory dies with the process. The standard library has `sqlite3`, which needs no server. One table holds one row for each task ID. The row holds a version number and the board as JSON text. The version number counts the writes."
        },
        {
          "kind": "step",
          "id": "agents19-s1",
          "title": "Write the store",
          "text": "Start the file with `StaleWrite` and `Store`. `read` returns the version number and the board. `write` sets one section and commits at once, so nothing the board knows lives only in memory. The path defaults to `:memory:`, and a file path makes the board durable. `MAX_STEPS` at the top caps the controller, which comes later.",
          "lang": "python",
          "file": "src/askpep/patterns/blackboard.py",
          "code": "\"\"\"Blackboard by hand: agents share one board per task, and a controller picks who acts.\n\nAgents never message each other. Each reads the board and writes one section of it.\nThe board lives in SQLite, so a killed run resumes from the saved board.\n\"\"\"\n\nimport json\nimport sqlite3\nimport sys\nimport tempfile\nfrom dataclasses import dataclass\nfrom pathlib import Path\nfrom typing import Any, Callable\n\nfrom askpep.patterns.kit import Run, fake_pep_tools, make_model, trace\n\nMAX_STEPS = 8\nQUESTION = \"Which Python version added the walrus operator?\"\n\n\nclass StaleWrite(Exception):\n    \"\"\"The board changed after the writer read it.\"\"\"\n\n\nclass Store:\n    \"\"\"One row per task ID. The version counts writes and guards against stale ones.\"\"\"\n\n    def __init__(self, path: str = \":memory:\"):\n        self.db = sqlite3.connect(path)\n        self.db.execute(\"create table if not exists boards (task_id text primary key, version integer not null, body text not null)\")\n\n    def create(self, task_id: str, question: str) -> None:\n        self.db.execute(\"insert or ignore into boards values (?, 0, ?)\", (task_id, json.dumps({\"question\": question})))\n        self.db.commit()\n\n    def read(self, task_id: str) -> tuple[int, dict]:\n        version, body = self.db.execute(\"select version, body from boards where task_id = ?\", (task_id,)).fetchone()\n        return version, json.loads(body)\n\n    def write(self, task_id: str, section: str, value: Any, seen: int) -> int:\n        \"\"\"Set one section if the board is still at the version the writer read. Return the new version.\"\"\"\n        version, board = self.read(task_id)\n        board[section] = value\n        cur = self.db.execute(\n            \"update boards set version = version + 1, body = ? where task_id = ? and version = ?\",\n            (json.dumps(board), task_id, seen),\n        )\n        self.db.commit()\n        if cur.rowcount == 0:\n            raise StaleWrite(f\"{section} rejected: you read version {seen}, the board is at {version}\")\n        return seen + 1"
        },
        {
          "kind": "p",
          "text": "Read the `update` in `write`. It carries `where version = ?`, and the value is `seen`, the version number the writer read. If another write got in first, the version number has moved. The update then changes zero rows, and `write` raises `StaleWrite`."
        },
        {
          "kind": "p",
          "text": "This is compare-and-swap: write only if the value is still the one you read. A stale write is one made from an old read. The check lives in the database, not in your Python. Two processes sharing the file get the same protection."
        },
        {
          "kind": "quiz",
          "id": "agents19-q3",
          "question": "What does `where task_id = ? and version = ?` in the update do?",
          "options": [
            "It makes the update faster.",
            "It writes only if nobody has written since this writer read the board.",
            "It locks the table for every other task.",
            "It deletes older versions of the board."
          ],
          "answer": 1,
          "explain": "The update succeeds only when the stored version equals the version the writer read. If it does not, no row changes and the code raises `StaleWrite`. The write is refused, and nothing is lost silently."
        },
        {
          "kind": "fold",
          "tone": "hood",
          "title": "The version number covers the whole board, not one section",
          "text": "Two agents that write different sections still conflict if both read the same version number. The second must read again and write. That is cheap with four agents. With many busy writers, you would keep a version number for each section instead."
        },
        {
          "kind": "p",
          "text": "The store gives you a board that survives a crash. Next come the agents that write to it and the loop that picks them."
        }
      ]
    },
    {
      "id": "s4-agents",
      "title": "An agent is a name, a condition and an act, and the controller is a short loop",
      "goal": "What does an agent look like here, and how short can the controller be?",
      "blocks": [
        {
          "kind": "step",
          "id": "agents19-s2",
          "title": "Write the agents",
          "text": "Append `Agent`, `ask` and `make_agents`. An agent has a name, a `can_act` test and an `act` function. `act` receives the board and the agent's own model, and returns a section and a value. It never sees another agent. The researcher and the versioner call a fake PEP tool, the writer returns an answer, and the reviewer approves.",
          "lang": "python",
          "file": "src/askpep/patterns/blackboard.py",
          "code": "@dataclass\nclass Agent:\n    name: str\n    can_act: Callable[[dict], bool]  # the condition on the board under which this agent can act\n    act: Callable[[dict, Callable], tuple[str, Any]]  # (board, model) -> (section, value)\n\n\ndef ask(model, board: dict) -> dict:\n    return model([{\"role\": \"user\", \"content\": json.dumps(board)}])\n\n\ndef make_agents(with_versioner: bool = True) -> list[Agent]:\n    tools = fake_pep_tools()\n\n    def use_tool(section: str):\n        def act(board, model):\n            reply = ask(model, board)\n            return section, tools.call(reply[\"tool\"], reply[\"args\"])\n        return act\n\n    agents = [\n        Agent(\"researcher\", lambda b: \"question\" in b and \"findings\" not in b, use_tool(\"findings\")),\n        Agent(\"versioner\", lambda b: \"question\" in b and \"versions\" not in b, use_tool(\"versions\")),\n        Agent(\"writer\", lambda b: \"findings\" in b and \"versions\" in b and \"draft\" not in b,\n              lambda b, m: (\"draft\", ask(m, b)[\"answer\"])),\n        Agent(\"reviewer\", lambda b: \"draft\" in b and b.get(\"status\") != \"done\",\n              lambda b, m: (\"status\", \"done\" if ask(m, b)[\"approve\"] else \"rejected\")),\n    ]\n    return agents if with_versioner else [a for a in agents if a.name != \"versioner\"]"
        },
        {
          "kind": "step",
          "id": "agents19-s3",
          "title": "Write the controller",
          "text": "Append `control`. It reads the board, stops if the status is done, and picks the first agent whose condition holds. That agent writes, and the controller records the new version number. The three stops sit in the loop: a done status, no agent able to act, and the step budget.",
          "lang": "python",
          "file": "src/askpep/patterns/blackboard.py",
          "code": "def control(store: Store, task_id: str, agents: list[Agent], models: dict, run: Run, max_steps: int = MAX_STEPS) -> None:\n    \"\"\"Read the board, pick the first agent whose condition holds, let it write, and repeat.\"\"\"\n    for _ in range(max_steps):\n        version, board = store.read(task_id)\n        if board.get(\"status\") == \"done\":\n            run.add(\"stop\", \"status is done\")\n            return\n        agent = next((a for a in agents if a.can_act(board)), None)\n        if agent is None:\n            run.add(\"stop\", f\"no agent can act on {sorted(board)}\")\n            return\n        section, value = agent.act(board, models[agent.name])\n        new = store.write(task_id, section, value, version)\n        run.add(\"write\", f\"{agent.name} wrote {section}, board now v{new}\")\n    run.add(\"stop\", f\"step budget of {max_steps} reached\")"
        },
        {
          "kind": "p",
          "text": "The step budget is `MAX_STEPS`, set to 8. It is a budget, from chapter 6, counted in steps. Each pass that lets an agent act makes one model call, so 8 passes allow at most 8 steps. This `MAX_STEPS` is this file's own, separate from chapter 11's."
        },
        {
          "kind": "p",
          "text": "Each agent gets its own scripted model when the module runs. That lets one run crash a single agent and leave the others alone. The next section runs it."
        }
      ]
    },
    {
      "id": "s5-run",
      "title": "A run ends in one of three ways, and a killed run resumes from the saved board",
      "goal": "What does a clean run print, and how does a killed run carry on?",
      "blocks": [
        {
          "kind": "step",
          "id": "agents19-s4",
          "title": "Add the scripted runs and run them",
          "text": "Append the scripts and the four scenarios. Run the module. It needs no network and no key. The second scenario uses a temporary file, because an in-memory database disappears with its connection.",
          "lang": "python",
          "file": "src/askpep/patterns/blackboard.py",
          "code": "SEARCH = {\"thought\": \"Find the PEP.\", \"tool\": \"search_peps\", \"args\": {\"query\": \"walrus\"}}\nVERSION = {\"thought\": \"Find the version.\", \"tool\": \"python_feature_version\", \"args\": {\"feature\": \"walrus operator\"}}\nDRAFT = {\"answer\": \"The walrus operator came in Python 3.8, through PEP 572.\"}\nAPPROVE = {\"approve\": True}\n\n\ndef models_for(live: bool = False) -> dict:\n    scripts = {\"researcher\": [SEARCH], \"versioner\": [VERSION], \"writer\": [DRAFT], \"reviewer\": [APPROVE]}\n    return {name: make_model(replies, live) for name, replies in scripts.items()}\n\n\ndef crash(_messages):\n    raise RuntimeError(\"the process was killed\")\n\n\ndef show(store: Store, task_id: str) -> None:\n    version, board = store.read(task_id)\n    print(f\"board v{version}: {json.dumps(board)}\")\n\n\ndef clean_run(live: bool) -> None:\n    store = Store()\n    store.create(\"t1\", QUESTION)\n    run, models = Run(QUESTION), models_for(live)\n    control(store, \"t1\", make_agents(), models, run)\n    trace(run)\n    show(store, \"t1\")\n    print(f\"model calls: {sum(m.n_calls for m in models.values())}\")\n\n\ndef kill_and_resume(live: bool) -> None:\n    with tempfile.TemporaryDirectory() as folder:\n        path = str(Path(folder) / \"boards.db\")\n        first = Store(path)\n        first.create(\"t2\", QUESTION)\n        run, models = Run(QUESTION), models_for(live)\n        models[\"writer\"] = crash  # the process dies when the writer starts\n        try:\n            control(first, \"t2\", make_agents(), models, run)\n        except RuntimeError as exc:\n            run.add(\"crash\", str(exc))\n        trace(run)\n        first.db.close()  # everything in memory is gone\n\n        second = Store(path)  # a new process opens the same file\n        print(\"-- resumed --\")\n        show(second, \"t2\")\n        run, models = Run(QUESTION), models_for(live)\n        control(second, \"t2\", make_agents(), models, run)\n        trace(run)\n        show(second, \"t2\")\n        print(f\"model calls after the resume: {sum(m.n_calls for m in models.values())}\")\n\n\ndef stale_write() -> None:\n    store = Store()\n    store.create(\"t3\", QUESTION)\n    seen_a, _ = store.read(\"t3\")\n    seen_b, _ = store.read(\"t3\")  # both writers read version 0\n    print(\"a writes:\", store.write(\"t3\", \"draft\", \"Draft from writer A.\", seen_a))\n    try:\n        store.write(\"t3\", \"draft\", \"Draft from writer B.\", seen_b)\n    except StaleWrite as exc:\n        print(\"b is rejected:\", exc)\n        seen_b, board = store.read(\"t3\")\n        print(f\"b re-reads v{seen_b} and keeps: {board['draft']}\")\n\n\ndef stuck_board(live: bool) -> None:\n    store = Store()\n    store.create(\"t4\", QUESTION)\n    run, models = Run(QUESTION), models_for(live)\n    control(store, \"t4\", make_agents(with_versioner=False), models, run)\n    trace(run)\n    show(store, \"t4\")\n\n\ndef main(live: bool = False) -> None:\n    print(\"== a clean run ==\")\n    clean_run(live)\n    print(\"\\n== kill and resume ==\")\n    kill_and_resume(live)\n    print(\"\\n== two writers, one section ==\")\n    stale_write()\n    print(\"\\n== a board nobody can act on ==\")\n    stuck_board(live)\n\n\nif __name__ == \"__main__\":\n    main(live=\"--live\" in sys.argv)",
          "expect": "== a clean run ==\nQ: Which Python version added the walrus operator?\n 1. write   researcher wrote findings, board now v1\n 2. write   versioner wrote versions, board now v2\n 3. write   writer wrote draft, board now v3\n 4. write   reviewer wrote status, board now v4\n 5. stop    status is done\nboard v4: {\"question\": \"Which Python version added the walrus operator?\", \"findings\": [\"PEP 572: Assignment Expressions\"], \"versions\": \"3.8\", \"draft\": \"The walrus operator came in Python 3.8, through PEP 572.\", \"status\": \"done\"}\nmodel calls: 4\n\n== kill and resume ==\nQ: Which Python version added the walrus operator?\n 1. write   researcher wrote findings, board now v1\n 2. write   versioner wrote versions, board now v2\n 3. crash   the process was killed\n-- resumed --\nboard v2: {\"question\": \"Which Python version added the walrus operator?\", \"findings\": [\"PEP 572: Assignment Expressions\"], \"versions\": \"3.8\"}\nQ: Which Python version added the walrus operator?\n 1. write   writer wrote draft, board now v3\n 2. write   reviewer wrote status, board now v4\n 3. stop    status is done\nboard v4: {\"question\": \"Which Python version added the walrus operator?\", \"findings\": [\"PEP 572: Assignment Expressions\"], \"versions\": \"3.8\", \"draft\": \"The walrus operator came in Python 3.8, through PEP 572.\", \"status\": \"done\"}\nmodel calls after the resume: 2\n\n== two writers, one section ==\na writes: 1\nb is rejected: draft rejected: you read version 0, the board is at 1\nb re-reads v1 and keeps: Draft from writer A.\n\n== a board nobody can act on ==\nQ: Which Python version added the walrus operator?\n 1. write   researcher wrote findings, board now v1\n 2. stop    no agent can act on ['findings', 'question']\nboard v1: {\"question\": \"Which Python version added the walrus operator?\", \"findings\": [\"PEP 572: Assignment Expressions\"]}"
        },
        {
          "kind": "p",
          "text": "Read the clean run. Four agents write four sections, and the board ends at version 4 after four model calls. Each agent ran once. The order came from the conditions, and no agent named the next."
        },
        {
          "kind": "p",
          "text": "Read the kill and resume. The writer's model raises, so the process dies at version 2. The first store closes, and everything in memory is gone. A second store opens the same file and finds the board at version 2. Only the writer and the reviewer are left, so the resume costs two model calls."
        },
        {
          "kind": "p",
          "text": "Chapter 7 resumed a LangGraph run from its checkpoint. This is the same idea, with the board as the checkpoint. The task ID is the key, and every write is a save point."
        },
        {
          "kind": "p",
          "text": "The trace shows the three ways a run ends."
        },
        {
          "kind": "list",
          "items": [
            "The status is done. The controller checks this first, before it picks anyone.",
            "No agent can act. The last scenario removes the versioner, so the writer waits for a section nobody writes. The stop line lists the sections it can see.",
            "The step budget runs out. A pair of agents that keep undoing each other's work would hit it."
          ]
        },
        {
          "kind": "quiz",
          "id": "agents19-q4",
          "question": "After the crash at version 2, which agents run on the resume?",
          "options": [
            "All four, because the run restarts.",
            "The writer and the reviewer, because the researcher's and versioner's sections are on the saved board.",
            "Only the reviewer.",
            "None, because the run is lost."
          ],
          "answer": 1,
          "explain": "The saved board holds the findings and the version facts. The researcher's and versioner's conditions are false, so they do not run. The resume starts at the first agent whose condition still holds."
        },
        {
          "kind": "p",
          "text": "In every run so far, one agent wrote at a time. The next section lets two agents write at once."
        }
      ]
    },
    {
      "id": "s6-conflict",
      "title": "Two writers on one section need the version check, or the last write wins silently",
      "goal": "What happens when two agents write the same section at once?",
      "blocks": [
        {
          "kind": "p",
          "text": "Chapter 18 warned that if two processes load the same task and both act, you get two answers. A board has the same risk. A retry might start a second worker while the first is slow. Two controllers might run on one task ID."
        },
        {
          "kind": "p",
          "text": "Read the third scenario. Writers A and B both read version 0. A writes first, and the board moves to version 1. B then writes with the old version number, and the store rejects it. B reads the board again and finds A's draft."
        },
        {
          "kind": "p",
          "text": "Without the check, B's write would replace A's draft, and nobody would know. That is a lost update, where a second write silently replaces the first. The check doesn't decide who is right. It makes the loss visible, so the loser can keep the other draft, merge the two or write over it."
        },
        {
          "kind": "widget",
          "id": "agents19-stale-write",
          "intro": "Run the two writers by hand. Make B write on an old version, read the rejection, and let B recover."
        },
        {
          "kind": "quiz",
          "id": "agents19-q5",
          "question": "Writer B is rejected with `StaleWrite`. What is the safest next move?",
          "options": [
            "Retry the same write at once with the new version number.",
            "Read the board again, look at what changed, then decide what to write.",
            "Delete the board and start again.",
            "Ignore the error, because A's write already succeeded."
          ],
          "answer": 1,
          "explain": "A retry with the new number would overwrite A's draft, which is the silent loss the check prevented. B should read the new board and decide. The decision depends on the domain."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "A blind retry defeats the check",
          "text": "If the code catches `StaleWrite` and writes again with the fresh version number, it brings the lost update back. Read the board again first. Write only when the new board still needs your section."
        },
        {
          "kind": "p",
          "text": "You now have the whole pattern: the board, the conditions, the controller and the version check. The last section asks when it is worth building."
        }
      ]
    },
    {
      "id": "s7-interview",
      "title": "Choose a blackboard when the board's contents should decide the order, and say it in 30 seconds",
      "goal": "When does a blackboard beat the other patterns, and how do you explain it?",
      "blocks": [
        {
          "kind": "p",
          "text": "A blackboard fits when the order of work depends on what is on the board. It also fits when several specialists add to one record, and when a run is long enough that it must resume."
        },
        {
          "kind": "list",
          "items": [
            "Use it when the next step depends on which sections exist, not on a fixed path.",
            "Use it when you want every write numbered, so the trace shows who wrote each section at which version number.",
            "Skip it when you can write the steps down. A deterministic workflow from chapter 12 is simpler and cheaper.",
            "Skip it when one agent can do the job, or when many agents write at once and every write conflicts."
          ]
        },
        {
          "kind": "p",
          "text": "Compare it with chapter 18. Both designs keep the record under the task ID. In a swarm, the active agent picks the next one, so the route lives in the agents and the `ALLOWED` table."
        },
        {
          "kind": "p",
          "text": "On a blackboard, the board's contents pick, through the conditions. A new agent is cheap to add, because no other agent must learn to pass work to it. The price is that every agent depends on the board's section names."
        },
        {
          "kind": "code",
          "lang": "python",
          "caption": "The same design in LangGraph. A sketch for reading, not a file you run in this chapter.",
          "code": "import operator\nfrom typing import Annotated, TypedDict\n\nfrom langgraph.checkpoint.sqlite import SqliteSaver\nfrom langgraph.graph import END, START, StateGraph\n\n\nclass Board(TypedDict, total=False):\n    question: str\n    findings: Annotated[list[str], operator.add]  # a reducer merges writes\n    versions: str\n    draft: str\n    status: str\n\n\ndef pick(state: Board) -> str:  # the controller, as a routing function\n    if state.get(\"status\") == \"done\":\n        return END\n    return next((a.name for a in AGENTS if a.can_act(state)), END)\n\n\ngraph = StateGraph(Board)\ngraph.add_conditional_edges(START, pick)\nfor agent in AGENTS:  # each node returns {section: value}\n    graph.add_node(agent.name, agent.node)\n    graph.add_conditional_edges(agent.name, pick)\n\nwith SqliteSaver.from_conn_string(\"boards.db\") as saver:\n    app = graph.compile(checkpointer=saver)\n    app.invoke({\"question\": QUESTION}, {\"configurable\": {\"thread_id\": \"t1\"}})"
        },
        {
          "kind": "p",
          "text": "The graph state is the board, and the routing function `pick` is the controller. The checkpointer saves the state after every node. The `thread_id` plays the task ID."
        },
        {
          "kind": "p",
          "text": "The `operator.add` reducer merges writes from nodes in the same round, as chapter 3 showed. Here `pick` runs one node at a time, so it never merges anything. Nothing in the sketch stops two processes running one thread at once. That still needs a version check."
        },
        {
          "kind": "p",
          "text": "This design comes up in interviews, so here is the short answer."
        },
        {
          "kind": "callout",
          "tone": "interview",
          "title": "The 30-second answer",
          "text": "A blackboard is one shared record per task ID, with a section for each kind of finding. Agents never message each other. Each one declares a condition on the board. A controller runs the first agent whose condition holds, and that agent writes its section. I save the board after every write, so a killed run resumes from it. A version number rejects stale writes. I use it when the order of work depends on what is on the board."
        },
        {
          "kind": "fold",
          "tone": "industry",
          "title": "The checkpointer for SQLite is a separate package",
          "text": "Chapter 7 used `InMemorySaver` and `PostgresSaver`. LangGraph also has `SqliteSaver`. It ships apart from the core package, and the capstone doesn't install it. It suits a single process and local work. For several workers on one task, use the Postgres saver from chapter 7."
        },
        {
          "kind": "p",
          "text": "Every run so far began with a person waiting for an answer. Some work has nobody waiting. What about work that no user asks for, which arrives on a schedule?"
        }
      ]
    }
  ],
  "lab": {
    "title": "Change the board and watch what happens",
    "goal": "Run the module, then change one thing at a time and predict the output before you run it. Every lab step runs offline. Compare your file with `capstone/src/askpep/patterns/blackboard.py` in the my-learn folder.",
    "minutes": 20,
    "files": [
      "src/askpep/patterns/blackboard.py"
    ],
    "steps": [
      {
        "title": "Run it unchanged",
        "text": "Run the module and compare all four scenarios with the output in the chapter. The clean run makes four model calls and the resume makes two.",
        "code": "uv run --no-sync python -m askpep.patterns.blackboard"
      },
      {
        "title": "Move the writer to the front",
        "text": "In `make_agents`, move the writer's entry to the top of the list. Predict whether the trace changes, then run it. It doesn't. The writer's condition needs the findings and the versions, so it still waits until both exist. List order only breaks ties between agents that can act. Put the order back afterwards.",
        "code": "uv run --no-sync python -m askpep.patterns.blackboard"
      },
      {
        "title": "Take the version check out",
        "text": "In `Store.write`, delete ` and version = ?` from the SQL and `, seen` from the parameters. Predict what the third scenario prints, then run it. Only `a writes: 1` appears. Writer B's stale write now succeeds without a word and replaces A's draft. That is the lost update. Then restore both.",
        "code": "uv run --no-sync python -m askpep.patterns.blackboard"
      },
      {
        "title": "Cut the step budget",
        "text": "Set `MAX_STEPS` to 3 and run it. Predict which stop line the clean run ends with and which version number the board reaches. It stops at `step budget of 3 reached`, with the board at v3 and no review. The resume still finishes, because it needs only two steps. Then set it back to 8.",
        "code": "uv run --no-sync python -m askpep.patterns.blackboard"
      },
      {
        "title": "Add a second reviewer",
        "text": "Add a second `Agent` named `editor` after the reviewer, with the same condition and the same act function. Give it a script in `models_for`. Predict whether the editor ever runs. It doesn't. The reviewer comes first in the list and writes the status done. The next pass stops at the done check, before it tests any condition. Two agents with one condition means the second never acts.",
        "code": "uv run --no-sync python -m askpep.patterns.blackboard"
      }
    ],
    "verify": "uv run --no-sync python -m askpep.patterns.blackboard"
  },
  "recap": [
    "A blackboard is one shared record per task that agents read and write, while a controller picks who acts.",
    "The controller runs the first agent whose condition holds. It stops on a done status, when no agent can act, or when the step budget runs out.",
    "Saving the board after every write lets a second process resume a killed run.",
    "A version number turns a silent overwrite into a rejected write. The loser must read the board again before it writes.",
    "A supervisor's model or a swarm's active agent picks the next agent by name. On a blackboard, the board's contents pick.",
    "LangGraph states the same design as graph state, a routing function and a checkpointer."
  ],
  "reinforcement": "I am becoming a forward-deployed AI engineer. In the blackboard chapter I learned that agents can share one record keyed by the task ID instead of messaging each other. A controller runs the first agent whose condition holds, the board is saved after every write, and a version number rejects stale writes. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  "interviewIds": [
    "agents-c19-q01",
    "agents-c19-q02",
    "agents-c19-q03"
  ]
};

export default chapter;
