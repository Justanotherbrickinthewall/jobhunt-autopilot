import type { Chapter } from "../types";

const chapter: Chapter = {
  "id": "agents-17-supervisor-by-hand",
  "course": "agents",
  "number": 17,
  "title": "A supervisor is a model whose tools are other agents",
  "tagline": "What changes when a model decides which agent works next and calls agents as tools? Each worker sees only its task, and every hop costs a model call.",
  "minutes": 60,
  "objectives": [
    "Say what changes when a model picks which agent works next, and place the supervisor on chapter 10's map.",
    "Build a supervisor as the chapter 11 loop over worker tools, and count a team's model calls with `.n_calls`.",
    "Say what crosses the boundary between supervisor and worker, and write a task that carries what the worker needs.",
    "Decide who writes the final answer, build a hierarchical team and say when the extra layer pays.",
    "Name the three breaks, the bottleneck, detail lost upward and cost per hop, and the guard for each.",
    "Choose between a deterministic workflow, plan-and-execute and a supervisor, and give the 30-second answer."
  ],
  "sections": [
    {
      "id": "s1-idea",
      "title": "A supervisor is the chapter 11 loop with agents where the tools were",
      "goal": "What changes when a model picks which agent works next, and each tool is an agent?",
      "blocks": [
        {
          "kind": "p",
          "text": "Chapter 16 left code in charge. Code decided which call ran next, and a rule picked the answer. This chapter hands that choice to a model. What changes when a model decides which agent works next and calls agents as tools?"
        },
        {
          "kind": "p",
          "text": "Ask the desk which Python version added the walrus operator, and whether the change was contested. Three jobs hide in that question: read the PEP, check the version and write the reply. One agent can hold all three tools. Its history then fills with search results it no longer needs."
        },
        {
          "kind": "p",
          "text": "Chapter 5 met a design that splits the jobs. A supervisor is an agent whose tools call the other agents, so it decides who works next. A worker is an agent that a supervisor calls as a tool. A call tool is a tool that runs a worker agent and returns its answer."
        },
        {
          "kind": "p",
          "text": "Chapter 5 built it on LangGraph, with `call_researcher`, `call_code_advisor` and `call_writer`. Here you build the same shape by hand, so you can see where each message goes."
        },
        {
          "kind": "p",
          "text": "The supervisor is a ReAct loop, exactly as in chapter 11. Each of its tools runs a worker, which runs a small loop of its own and returns one short result. The worker's loop is `react` from chapter 11, called inside a tool."
        },
        {
          "kind": "compare",
          "caption": "A plain ReAct agent and a supervisor, side by side",
          "columns": [
            "Part",
            "Plain ReAct agent",
            "Supervisor"
          ],
          "rows": [
            [
              "The tools",
              "Functions that fetch data, such as search_peps.",
              "Workers, each one a loop wrapped as a tool."
            ],
            [
              "The model's reply",
              "A tool name and arguments.",
              "A worker name and a task written in plain words."
            ],
            [
              "The observation",
              "Whatever the function returned.",
              "The short result the worker returned."
            ],
            [
              "Who picks the next step",
              "The model, from one flat list.",
              "The supervisor picks the worker. Each worker picks its own tools."
            ]
          ]
        },
        {
          "kind": "callout",
          "tone": "insight",
          "title": "The supervisor is chapter 10's controller",
          "text": "On chapter 10's map, a model picks the next step, and the supervisor is the controller that owns the state. The cost on the map is one extra model call for every decision."
        },
        {
          "kind": "quiz",
          "id": "agents17-q1",
          "question": "What is a worker in a supervisor design?",
          "options": [
            "A thread that runs the supervisor's loop in the background.",
            "A function the supervisor calls as a tool, which runs its own small agent loop and returns a short result.",
            "A second copy of the supervisor with the same history.",
            "A rule in code that routes the question."
          ],
          "answer": 1,
          "explain": "A worker is a tool whose body is an agent. The supervisor sees a task going in and a result coming out. Everything the worker does in between stays inside it."
        },
        {
          "kind": "fold",
          "tone": "plain",
          "title": "Why call the loop a team",
          "text": "The word team is only a picture. In code there is one ordinary loop, plus functions that each run another ordinary loop. No new machinery exists. That is why the build below reuses `react` without changing it."
        },
        {
          "kind": "p",
          "text": "That is the whole idea. The next section writes it in one file and runs five teams through it."
        }
      ]
    },
    {
      "id": "s2-build",
      "title": "A worker is a loop wrapped in a tool, and the supervisor is the same loop over those tools",
      "goal": "How do you build a supervisor from chapter 11's loop, and what does a team cost in model calls?",
      "blocks": [
        {
          "kind": "p",
          "text": "Work in your AskPEP repository. The file is `src/askpep/patterns/supervisor.py`. It imports the kit from chapter 10 and `react` from chapter 11. The reference copy is `capstone/src/askpep/patterns/supervisor.py` in the my-learn folder. Yours should match it."
        },
        {
          "kind": "step",
          "id": "agents17-s1",
          "title": "Write the worker and the supervisor",
          "text": "`lend` gives a worker the PEP tools it needs. `worker` returns a `Tool` that plays chapter 5's call tool. Called with a task, it runs `react` on that task alone. With no answer, it returns a `WorkerError`: a worker failure the supervisor sees as a tool result. `supervise` is one line, the chapter 11 loop over the workers.",
          "lang": "python",
          "file": "src/askpep/patterns/supervisor.py",
          "code": "\"\"\"A supervisor by hand: a ReAct loop whose tools are other agents.\n\nEach worker is a tool. Its function runs a small loop of its own and returns a short result.\n\"\"\"\n\nimport sys\n\nfrom askpep.patterns.kit import Tool, Tools, fake_pep_tools, make_model, trace\nfrom askpep.patterns.react import react\n\nQUESTION = \"Which Python version added the walrus operator, and was it contested?\"\n\n\ndef lend(peps: Tools, *names: str) -> Tools:\n    \"\"\"Give a worker only the PEP tools it needs.\"\"\"\n    return Tools(*(Tool(n, n, lambda _n=n, **args: peps.call(_n, args)) for n in names))\n\n\ndef worker(name: str, description: str, model, tools: Tools, log: list) -> Tool:\n    \"\"\"Wrap a loop as a tool. The worker sees its task and nothing else, and returns a short result.\"\"\"\n\n    def run(task: str) -> str:\n        result = react(task, model, tools, max_steps=4)\n        answer = result.answer or f\"WorkerError: {name} found no answer\"\n        log.append((name, task, answer))\n        return answer\n\n    return Tool(name, description, run)\n\n\ndef supervise(question: str, model, workers: list[Tool], max_steps: int = 8):\n    \"\"\"The supervisor is the chapter 11 loop with the workers as its tools.\"\"\"\n    return react(question, model, Tools(*workers), max_steps)"
        },
        {
          "kind": "step",
          "id": "agents17-s2",
          "title": "Script five teams",
          "text": "Append the scripted replies. Every model gets its own script, so each model call is predictable. The first two teams are a flat team with a writer and a supervisor that writes for itself. The next two have a worker that drops a detail and a worker that finds nothing. The last puts a supervisor under a supervisor.",
          "lang": "python",
          "file": "src/askpep/patterns/supervisor.py",
          "code": "def call(name: str, task: str, thought: str = \"\") -> dict:\n    return {\"thought\": thought, \"tool\": name, \"args\": {\"task\": task}}\n\n\nSEARCH = {\"thought\": \"Find the PEP.\", \"tool\": \"search_peps\", \"args\": {\"query\": \"walrus\"}}\nHISTORY = {\"thought\": \"Read its history.\", \"tool\": \"read_pep_section\", \"args\": {\"pep\": 572, \"section\": \"history\"}}\nVERSION = {\"thought\": \"Look up the version.\", \"tool\": \"python_feature_version\", \"args\": {\"feature\": \"walrus operator\"}}\nRESEARCH = call(\"researcher\", \"Find the PEP for the walrus operator and read its history section.\", \"Get the PEP facts.\")\nCHECK = call(\"version_checker\", \"Which Python version added the walrus operator?\", \"Now the version.\")\nFULL = \"PEP 572 added the walrus operator. It was accepted after a long and bitter debate.\"\nTERSE = \"PEP 572 added the walrus operator.\"\n\nSCENARIOS = {\n    \"a flat team with a writer\": {\n        \"supervisor\": [\n            RESEARCH,\n            CHECK,\n            call(\"writer\", \"Write one sentence: the walrus operator came in 3.8 through PEP 572, after a bitter debate.\", \"Ask the writer.\"),\n            {\"answer\": \"The walrus operator came in Python 3.8, through PEP 572, after a bitter debate.\"},\n        ],\n        \"researcher\": [SEARCH, HISTORY, {\"answer\": FULL}],\n        \"version_checker\": [VERSION, {\"answer\": \"3.8\"}],\n        \"writer\": [{\"answer\": \"The walrus operator came in Python 3.8, through PEP 572, after a bitter debate.\"}],\n    },\n    \"the supervisor writes the answer itself\": {\n        \"supervisor\": [RESEARCH, CHECK, {\"answer\": \"The walrus operator came in Python 3.8, through PEP 572, after a bitter debate.\"}],\n        \"researcher\": [SEARCH, HISTORY, {\"answer\": FULL}],\n        \"version_checker\": [VERSION, {\"answer\": \"3.8\"}],\n        \"writer\": [],\n    },\n    \"detail lost on the way up\": {\n        \"supervisor\": [RESEARCH, CHECK, {\"answer\": \"The walrus operator came in Python 3.8, through PEP 572.\"}],\n        \"researcher\": [SEARCH, HISTORY, {\"answer\": TERSE}],\n        \"version_checker\": [VERSION, {\"answer\": \"3.8\"}],\n        \"writer\": [],\n    },\n    \"a worker that finds nothing\": {\n        \"supervisor\": [RESEARCH, CHECK, {\"answer\": \"The walrus operator came in Python 3.8. I could not check whether it was contested.\"}],\n        \"researcher\": [SEARCH, SEARCH],\n        \"version_checker\": [VERSION, {\"answer\": \"3.8\"}],\n        \"writer\": [],\n    },\n    \"a supervisor under a supervisor\": {\n        \"supervisor\": [\n            call(\"research_desk\", \"Find the PEP for the walrus operator, its history and its version.\", \"Hand the research to the desk.\"),\n            call(\"writer\", \"Write one sentence: 3.8, through PEP 572, after a bitter debate.\", \"Ask the writer.\"),\n            {\"answer\": \"The walrus operator came in Python 3.8, through PEP 572, after a bitter debate.\"},\n        ],\n        \"research_desk\": [RESEARCH, CHECK, {\"answer\": \"PEP 572, Python 3.8, accepted after a bitter debate.\"}],\n        \"researcher\": [SEARCH, HISTORY, {\"answer\": FULL}],\n        \"version_checker\": [VERSION, {\"answer\": \"3.8\"}],\n        \"writer\": [{\"answer\": \"The walrus operator came in Python 3.8, through PEP 572, after a bitter debate.\"}],\n    },\n}"
        },
        {
          "kind": "step",
          "id": "agents17-s3",
          "title": "Run the teams and count the calls",
          "text": "Append `run_scenario` and `main`. `run_scenario` builds the workers, runs the supervisor and prints its trace. Then it prints what each worker got and returned. The last line adds up `.n_calls`, the kit's count of model calls from chapter 10, across every model. Run the module. It needs no network and no key.",
          "lang": "python",
          "file": "src/askpep/patterns/supervisor.py",
          "code": "def run_scenario(scripts: dict, live: bool = False) -> None:\n    log: list = []\n    peps = fake_pep_tools()\n    models = {name: make_model(replies, live) for name, replies in scripts.items()}\n    researcher = worker(\"researcher\", \"Find and read PEP text.\", models[\"researcher\"], lend(peps, \"search_peps\", \"read_pep_section\"), log)\n    checker = worker(\"version_checker\", \"Look up the version of a feature.\", models[\"version_checker\"], lend(peps, \"python_feature_version\"), log)\n    writer = worker(\"writer\", \"Write the final sentence from facts.\", models[\"writer\"], Tools(), log)\n    if \"research_desk\" in models:\n        desk = worker(\"research_desk\", \"A team that researches and checks versions.\", models[\"research_desk\"], Tools(researcher, checker), log)\n        team = [desk, writer]\n    else:\n        team = [researcher, checker, writer]\n    run = supervise(QUESTION, models[\"supervisor\"], team)\n    trace(run)\n    for name, task, result in log:\n        print(f\"   {name} got:      {task}\")\n        print(f\"   {name} returned: {result}\")\n    seen = str(models[\"researcher\"].calls[0][0]) if models[\"researcher\"].calls else \"\"\n    print(f\"the question reached the researcher: {QUESTION in seen}\")\n    print(f\"supervisor calls: {models['supervisor'].n_calls}, all calls: {sum(m.n_calls for m in models.values())}\")\n\n\ndef main(live: bool = False) -> None:\n    for name, scripts in SCENARIOS.items():\n        print(f\"== {name} ==\")\n        run_scenario(scripts, live)\n        print()\n\n\nif __name__ == \"__main__\":\n    main(live=\"--live\" in sys.argv)",
          "expect": "== a flat team with a writer ==\nQ: Which Python version added the walrus operator, and was it contested?\n 1. think   Get the PEP facts.\n 2. tool    researcher({\"task\": \"Find the PEP for the walrus operator and read its history section.\"})\n 3. observe \"PEP 572 added the walrus operator. It was accepted after a long and bitter debate.\"\n 4. think   Now the version.\n 5. tool    version_checker({\"task\": \"Which Python version added the walrus operator?\"})\n 6. observe \"3.8\"\n 7. think   Ask the writer.\n 8. tool    writer({\"task\": \"Write one sentence: the walrus operator came in 3.8 through PEP 572, after a bitter debate.\"})\n 9. observe \"The walrus operator came in Python 3.8, through PEP 572, after a bitter debate.\"\n10. answer  The walrus operator came in Python 3.8, through PEP 572, after a bitter debate.\nmodel calls: 4, rough tokens: 796\n   researcher got:      Find the PEP for the walrus operator and read its history section.\n   researcher returned: PEP 572 added the walrus operator. It was accepted after a long and bitter debate.\n   version_checker got:      Which Python version added the walrus operator?\n   version_checker returned: 3.8\n   writer got:      Write one sentence: the walrus operator came in 3.8 through PEP 572, after a bitter debate.\n   writer returned: The walrus operator came in Python 3.8, through PEP 572, after a bitter debate.\nthe question reached the researcher: False\nsupervisor calls: 4, all calls: 10\n\n== the supervisor writes the answer itself ==\nQ: Which Python version added the walrus operator, and was it contested?\n 1. think   Get the PEP facts.\n 2. tool    researcher({\"task\": \"Find the PEP for the walrus operator and read its history section.\"})\n 3. observe \"PEP 572 added the walrus operator. It was accepted after a long and bitter debate.\"\n 4. think   Now the version.\n 5. tool    version_checker({\"task\": \"Which Python version added the walrus operator?\"})\n 6. observe \"3.8\"\n 7. answer  The walrus operator came in Python 3.8, through PEP 572, after a bitter debate.\nmodel calls: 3, rough tokens: 476\n   researcher got:      Find the PEP for the walrus operator and read its history section.\n   researcher returned: PEP 572 added the walrus operator. It was accepted after a long and bitter debate.\n   version_checker got:      Which Python version added the walrus operator?\n   version_checker returned: 3.8\nthe question reached the researcher: False\nsupervisor calls: 3, all calls: 8\n\n== detail lost on the way up ==\nQ: Which Python version added the walrus operator, and was it contested?\n 1. think   Get the PEP facts.\n 2. tool    researcher({\"task\": \"Find the PEP for the walrus operator and read its history section.\"})\n 3. observe \"PEP 572 added the walrus operator.\"\n 4. think   Now the version.\n 5. tool    version_checker({\"task\": \"Which Python version added the walrus operator?\"})\n 6. observe \"3.8\"\n 7. answer  The walrus operator came in Python 3.8, through PEP 572.\nmodel calls: 3, rough tokens: 446\n   researcher got:      Find the PEP for the walrus operator and read its history section.\n   researcher returned: PEP 572 added the walrus operator.\n   version_checker got:      Which Python version added the walrus operator?\n   version_checker returned: 3.8\nthe question reached the researcher: False\nsupervisor calls: 3, all calls: 8\n\n== a worker that finds nothing ==\nQ: Which Python version added the walrus operator, and was it contested?\n 1. think   Get the PEP facts.\n 2. tool    researcher({\"task\": \"Find the PEP for the walrus operator and read its history section.\"})\n 3. observe \"WorkerError: researcher found no answer\"\n 4. think   Now the version.\n 5. tool    version_checker({\"task\": \"Which Python version added the walrus operator?\"})\n 6. observe \"3.8\"\n 7. answer  The walrus operator came in Python 3.8. I could not check whether it was contested.\nmodel calls: 3, rough tokens: 455\n   researcher got:      Find the PEP for the walrus operator and read its history section.\n   researcher returned: WorkerError: researcher found no answer\n   version_checker got:      Which Python version added the walrus operator?\n   version_checker returned: 3.8\nthe question reached the researcher: False\nsupervisor calls: 3, all calls: 7\n\n== a supervisor under a supervisor ==\nQ: Which Python version added the walrus operator, and was it contested?\n 1. think   Hand the research to the desk.\n 2. tool    research_desk({\"task\": \"Find the PEP for the walrus operator, its history and its version.\"})\n 3. observe \"PEP 572, Python 3.8, accepted after a bitter debate.\"\n 4. think   Ask the writer.\n 5. tool    writer({\"task\": \"Write one sentence: 3.8, through PEP 572, after a bitter debate.\"})\n 6. observe \"The walrus operator came in Python 3.8, through PEP 572, after a bitter debate.\"\n 7. answer  The walrus operator came in Python 3.8, through PEP 572, after a bitter debate.\nmodel calls: 3, rough tokens: 483\n   researcher got:      Find the PEP for the walrus operator and read its history section.\n   researcher returned: PEP 572 added the walrus operator. It was accepted after a long and bitter debate.\n   version_checker got:      Which Python version added the walrus operator?\n   version_checker returned: 3.8\n   research_desk got:      Find the PEP for the walrus operator, its history and its version.\n   research_desk returned: PEP 572, Python 3.8, accepted after a bitter debate.\n   writer got:      Write one sentence: 3.8, through PEP 572, after a bitter debate.\n   writer returned: The walrus operator came in Python 3.8, through PEP 572, after a bitter debate.\nthe question reached the researcher: False\nsupervisor calls: 3, all calls: 12"
        },
        {
          "kind": "p",
          "text": "Read the first run. The trace line `model calls: 4, rough tokens: 796` counts the supervisor's model alone. It made four calls: one for each worker and one for its final answer. Each worker has a model of its own, so the whole team makes ten. Chapter 11's clean run answered the version question in three."
        },
        {
          "kind": "quiz",
          "id": "agents17-q2",
          "question": "In the first run, the supervisor's trace shows 4 model calls. Why does the last line say 10?",
          "options": [
            "The kit counts every call twice.",
            "The workers have models of their own, and their calls are counted separately.",
            "The supervisor retried three calls.",
            "The trace hides six tool calls."
          ],
          "answer": 1,
          "explain": "Each worker owns a model, and each has its own `.n_calls`. The supervisor's trace shows only its own model calls. To see the cost of the team, add every model's count."
        },
        {
          "kind": "fold",
          "tone": "hood",
          "title": "Why a worker can be a plain function",
          "text": "`react` already takes a model and a set of tools and returns a run. A worker only fixes the model and the tools, and hands back the answer. Because the worker is a closure, it keeps its model between calls, so a scripted worker's replies carry on where they stopped. Its history doesn't carry over. Each call to `react` starts a fresh message list with only the system line and the task."
        },
        {
          "kind": "p",
          "text": "Each run also reports whether the user's question reached the researcher. It never does, and the next section shows why."
        }
      ]
    },
    {
      "id": "s3-isolation",
      "title": "A worker sees only its task, so the task must carry everything it needs",
      "goal": "What crosses the boundary between supervisor and worker, and what makes a good task?",
      "blocks": [
        {
          "kind": "p",
          "text": "Look at the end of the first run. The line `the question reached the researcher: False` is the point of the design. The researcher's prompt holds a system line and the task. The supervisor's question, and the rest of its history, never arrive."
        },
        {
          "kind": "p",
          "text": "That is **context isolation**: each worker sees only what the supervisor passes it, not the whole conversation. It is the controller's job from chapter 10, deciding what each agent sees. It keeps each worker's prompt short and focused. It also means the supervisor must write the task well."
        },
        {
          "kind": "p",
          "text": "If the researcher needs a PEP number, the task has to contain it. The worker can't ask what the user said. Three things cross the boundary, or stay behind it."
        },
        {
          "kind": "list",
          "items": [
            "Going in: one string, the task the supervisor wrote.",
            "Coming back: one string, the worker's final answer.",
            "Staying inside: the worker's searches, its thoughts and every tool result it read."
          ]
        },
        {
          "kind": "p",
          "text": "The same wall protects the supervisor. The researcher read a whole PEP section, but only its short answer reaches the supervisor's history. The supervisor's prompt grows by a sentence for each worker, not by a page."
        },
        {
          "kind": "widget",
          "id": "agents17-brief-writer",
          "intro": "Pick the task the supervisor should send to each worker. Watch for the task that is too thin for the worker to act on, and the one that dumps the whole history."
        },
        {
          "kind": "quiz",
          "id": "agents17-q3",
          "question": "The writer worker has no tools. What must the supervisor's task for it contain?",
          "options": [
            "Nothing, because the writer can read the supervisor's history.",
            "The facts to write from, because the writer sees only the task.",
            "The names of all the other workers.",
            "The step budget."
          ],
          "answer": 1,
          "explain": "The writer starts with an empty history. If the task does not hold the facts, the writer has nothing to write from. It will either guess or say so, and a guess is worse."
        },
        {
          "kind": "fold",
          "tone": "trouble",
          "title": "When the supervisor writes a thin task",
          "text": "A task such as look into it sends the worker searching blind. The worker may answer a different question and still look confident. When a worker returns something odd, read the task first. The fault is often in the brief, not in the worker."
        },
        {
          "kind": "p",
          "text": "Isolation has one more effect. No worker knows when the whole job is done, so that decision stays with the supervisor. The next section shows how it decides, and what a deeper team costs."
        }
      ]
    },
    {
      "id": "s4-finish",
      "title": "The supervisor decides when the work is done, and a deeper tree adds hops",
      "goal": "Who writes the final answer, and when does a second layer of supervisors pay for itself?",
      "blocks": [
        {
          "kind": "p",
          "text": "Nothing in the workers says the job is finished. The supervisor decides, by returning an answer instead of another worker call. Compare the first two runs. In the first, the supervisor asks the writer for the final text. In the second, it writes the text itself."
        },
        {
          "kind": "p",
          "text": "The writer costs two more calls here, ten against eight. The supervisor spends one call to ask for the text, and the writer spends one to write it. That pays off when the final text needs a different prompt, a different model or a style check. If the supervisor can write the sentence, let it."
        },
        {
          "kind": "p",
          "text": "A worker can itself be a supervisor. Chapter 10 named this a hierarchical team: a top supervisor calls team supervisors, and each of those calls workers."
        },
        {
          "kind": "p",
          "text": "Look at the last run. The `research_desk` is a worker whose tools are the researcher and the version checker. The top supervisor sees one worker for all research, and the desk handles the details."
        },
        {
          "kind": "code",
          "lang": "python",
          "code": "desk = worker(\"research_desk\", \"A team that researches and checks versions.\", models[\"research_desk\"], Tools(researcher, checker), log)\nteam = [desk, writer]",
          "caption": "A hierarchy is a worker whose tools are workers. The top supervisor needs no change."
        },
        {
          "kind": "p",
          "text": "The top supervisor now makes three calls instead of four, because it hands the research over once. The desk makes three calls of its own: two to pick workers and one to write its summary. So the whole team makes twelve calls against ten."
        },
        {
          "kind": "widget",
          "id": "agents17-count-calls",
          "intro": "Predict the total model calls for each team before you reveal it. Count the supervisor's model calls first, then add each worker's."
        },
        {
          "kind": "p",
          "text": "A second level can pay in four cases."
        },
        {
          "kind": "list",
          "items": [
            "The top supervisor has too many workers, so its prompt and its choices get confused.",
            "A group of workers share a theme, such as research, and the top level need not see their steps.",
            "Two groups need different budgets, models or checks.",
            "Each group can be built and tested alone."
          ]
        },
        {
          "kind": "p",
          "text": "Add the layer when one of those holds. With three workers, as on the PEP desk, a second level only adds calls."
        },
        {
          "kind": "quiz",
          "id": "agents17-q4",
          "question": "Why does the two-level team make 12 model calls when the flat team with a writer makes 10?",
          "options": [
            "The top supervisor makes more calls.",
            "The research desk is a supervisor with its own model, so it adds three calls of its own and removes one from the top.",
            "The writer is called twice.",
            "Hierarchies always double the cost."
          ],
          "answer": 1,
          "explain": "The top supervisor drops from four calls to three. The desk adds three of its own: two worker calls and one answer. The net change is two more calls, and the flat run had ten."
        },
        {
          "kind": "fold",
          "tone": "industry",
          "title": "Teams that nest",
          "text": "LangGraph's documentation has a hierarchical agent teams tutorial, in which a top supervisor calls team supervisors. Notice what the four cases above buy: smaller prompts and clear ownership. None of them promises a more accurate answer. Ask what each level buys before you add one, because the extra hop is paid on every request."
        },
        {
          "kind": "p",
          "text": "Every layer adds calls, and every hop adds a summary. The next section reads the runs where the design breaks."
        }
      ]
    },
    {
      "id": "s5-breaks",
      "title": "A supervisor is a bottleneck, loses detail upward and pays a model call per hop",
      "goal": "Where does a supervisor break, and what guards each break?",
      "blocks": [
        {
          "kind": "p",
          "text": "Every step passes through one model. The supervisor reads each result, picks the next worker and writes the next task. Workers can't talk to each other. They also run one at a time, because each supervisor reply names one worker. A slow worker stalls the whole run."
        },
        {
          "kind": "p",
          "text": "Read the third run. The researcher read the history section, which says the change was accepted after a bitter debate. Its answer was one short sentence. The supervisor never saw the debate, so the final reply can't mention it. The question asked for exactly that."
        },
        {
          "kind": "p",
          "text": "Each summary drops something. The more hops, the more is lost. Two guards help. Tell the worker in its task what must survive, such as any dispute. Or have the worker return a short answer plus its source, so the supervisor can ask again."
        },
        {
          "kind": "p",
          "text": "Read the fourth run. The researcher sent the same search twice, and chapter 11's loop stopped it on the repeated call. The worker had no answer, so it returned a `WorkerError` string. The supervisor read it as a tool result and said what it couldn't check. A worker must always return text, even when it fails."
        },
        {
          "kind": "p",
          "text": "Cost is the third break. The supervisor's own count is three or four. The team total is seven to twelve. Give the supervisor a step budget and each worker a smaller one. Here `supervise` allows 8 model calls, and `worker` allows 4."
        },
        {
          "kind": "compare",
          "caption": "Three breaks, what you see, and the guard",
          "columns": [
            "Break",
            "What you see",
            "Guard"
          ],
          "rows": [
            [
              "Bottleneck",
              "Every step waits on one model, and workers never run together.",
              "Keep the team small. Use chapter 15's fan-out for work that can run at once."
            ],
            [
              "Detail lost upward",
              "A fact the worker read is missing from the final reply.",
              "Name what must survive in the task. Return the source with the answer."
            ],
            [
              "Cost per hop",
              "Total calls far above the supervisor's own count.",
              "Add up every .n_calls. Give each loop a step budget."
            ]
          ]
        },
        {
          "kind": "quiz",
          "id": "agents17-q5",
          "question": "A worker's answer drops a fact the user asked about. Where is the best place to fix it?",
          "options": [
            "Raise the supervisor's step budget.",
            "Add a second supervisor above it.",
            "Change the task so it says what must survive, or have the worker return its source.",
            "Remove the worker's tools."
          ],
          "answer": 2,
          "explain": "The loss happens when the worker summarises. A more precise task, or a source the supervisor can follow up on, keeps the detail. Extra layers add more summaries and lose more."
        },
        {
          "kind": "fold",
          "tone": "trouble",
          "title": "A worker that never fails loudly",
          "text": "If a worker returns an empty string on failure, the supervisor treats it as a result and moves on. Return an error string that names the failure, as `worker` does. The supervisor can then retry, skip or say what is missing."
        },
        {
          "kind": "p",
          "text": "Each break is a reason to choose another design. The last section sets the supervisor beside the two designs it competes with most."
        }
      ]
    },
    {
      "id": "s6-choose",
      "title": "Use a supervisor when the path is open and the jobs need different tools",
      "goal": "When does a supervisor beat a deterministic workflow or a plan, and how do you say it in 30 seconds?",
      "blocks": [
        {
          "kind": "p",
          "text": "Three designs can handle a question with several jobs. Chapter 12's deterministic workflow fixes the route in code, and at each decision point the model picks one option from a fixed set."
        },
        {
          "kind": "p",
          "text": "Chapter 13's plan-and-execute has a planner write the steps once and an executor work them. A supervisor's model picks the next worker after every result."
        },
        {
          "kind": "compare",
          "caption": "Who picks the next step in each design",
          "columns": [
            "Design",
            "Who picks the next step",
            "Cost of a change of mind",
            "Fits when"
          ],
          "rows": [
            [
              "Deterministic workflow, chapter 12",
              "Code, on a fixed route.",
              "None. The route never changes.",
              "The steps are known and a rule must hold."
            ],
            [
              "Plan-and-execute, chapter 13",
              "The model, once, up front.",
              "A replanner call.",
              "The steps are open but stable."
            ],
            [
              "Supervisor, this chapter",
              "The supervisor's model, after every result.",
              "None. It picks another worker.",
              "The next job depends on the last result, and the jobs need different tools."
            ]
          ]
        },
        {
          "kind": "p",
          "text": "The supervisor is the most flexible of the three and the most expensive. Chapter 4's handoff is the other way to move work: control moves to the next agent, and the first agent steps out. A supervisor keeps control the whole time."
        },
        {
          "kind": "p",
          "text": "This choice comes up in interviews. The interviewer wants to hear who picks the next step, and what each extra model call costs."
        },
        {
          "kind": "callout",
          "tone": "interview",
          "title": "The 30-second answer",
          "text": "A supervisor is a ReAct loop whose tools are worker agents. Each worker runs its own loop on one task and returns a short result, so its context stays small. The supervisor decides which worker to call and when to stop. It costs a model call on every hop, loses detail as results are summarised, and is a bottleneck. I use it when the next job depends on the last result. I use a deterministic workflow when the steps are known."
        },
        {
          "kind": "widget",
          "id": "agents17-pick-shape",
          "intro": "Choose the design for each desk question: a deterministic workflow, plan-and-execute or a supervisor. Watch for the question where the next step depends on what the last worker found."
        },
        {
          "kind": "quiz",
          "id": "agents17-q6",
          "question": "A refund flow always checks the order, then the policy, then pays. Which design fits?",
          "options": [
            "A supervisor, so the model can reorder the steps.",
            "A hierarchy with two layers.",
            "A deterministic workflow, because the order is known and money moves.",
            "A plan that the model rewrites after every step."
          ],
          "answer": 2,
          "explain": "The steps and their order are fixed, and a mistake costs money. Code should own that path. A supervisor adds a model call on each hop and a chance to pick the wrong worker."
        },
        {
          "kind": "p",
          "text": "In LangGraph the same shape takes a few lines. Each worker is an agent built with `create_agent` from chapter 1, and a call tool wraps it."
        },
        {
          "kind": "code",
          "lang": "python",
          "code": "researcher = create_agent(model, tools=[search_peps, read_pep_section])\n\n\n@tool\ndef call_researcher(task: str) -> str:\n    \"\"\"Find and read PEP text. Give it one task.\"\"\"\n    out = researcher.invoke({\"messages\": [(\"user\", task)]})\n    return out[\"messages\"][-1].content\n\n\nsupervisor = create_agent(model, tools=[call_researcher, call_version_checker, call_writer])",
          "caption": "A sketch of the LangGraph version. The worker is an agent, and the call tool is its wrapper."
        },
        {
          "kind": "fold",
          "tone": "industry",
          "title": "The LangGraph equivalent",
          "text": "Each call tool invokes its worker with the task and returns the last message. The supervisor is another `create_agent` whose tools are those call tools. Chapter 5's `make_call_tool` is this shape, and its worker's messages also start with the task alone. It seeds the question, the sources and the counters too. A `Command` carries the sources and counters back."
        },
        {
          "kind": "p",
          "text": "A supervisor keeps every decision in one place, and pays a model call for each one. Chapter 18 takes the centre away. What if agents pass the work directly, with no one in charge?"
        }
      ]
    }
  ],
  "lab": {
    "title": "Change the team and watch the calls",
    "goal": "Run the module, then change one thing at a time and predict the effect before you run it. Every step runs offline. Compare your file with `capstone/src/askpep/patterns/supervisor.py` in the my-learn folder.",
    "minutes": 20,
    "files": [
      "src/askpep/patterns/supervisor.py"
    ],
    "steps": [
      {
        "title": "Run it unchanged",
        "text": "Run the module and compare all five runs with the chapter. The last lines must read all calls 10, 8, 8, 7 and 12, in that order. The first run's trace ends `model calls: 4, rough tokens: 796`, which counts the supervisor's model alone.",
        "code": "uv run --no-sync python -m askpep.patterns.supervisor"
      },
      {
        "title": "Remove the writer",
        "text": "In the first team's supervisor script, delete the `call(\"writer\", ...)` line, so the supervisor answers directly. Predict the total number of calls, then run it. The first run drops from ten calls to eight, the same as the second run. Its trace now matches the second run line for line.",
        "code": "uv run --no-sync python -m askpep.patterns.supervisor"
      },
      {
        "title": "Starve the worker",
        "text": "Change the `max_steps` inside `worker` from 4 to 2. The researcher needs three model calls: a search, a read and an answer. Predict which runs now show a `WorkerError`, then run it. All five do. The version checker needs only two calls, so it still answers. In the last run the research desk is a worker too, so it also stops short and returns a `WorkerError`. The totals read 9, 7, 7, 7 and 10. Three scripted supervisors still write the debate sentence, though no fact about it arrived. A live one would have no basis for it.",
        "code": "uv run --no-sync python -m askpep.patterns.supervisor"
      },
      {
        "title": "Thin the task",
        "text": "Change the task in `RESEARCH` to `Look into it.` Predict whether the scripted researcher notices. It doesn't, because its replies are fixed. The `got:` lines change, and so does line 2 of the first four traces. The rough tokens drop too, from 796 to 742 in the first run. A live model would have no PEP to look for, so say what it would do instead.",
        "code": "uv run --no-sync python -m askpep.patterns.supervisor"
      },
      {
        "title": "Keep the debate",
        "text": "In the detail-lost run, the researcher's answer dropped the debate. Add this line under `RESEARCH`: `KEEP = call(\"researcher\", \"Find the PEP for the walrus operator and read its history section. Keep any dispute in your answer.\", \"Get the PEP facts.\")`. In that run's supervisor script, use `KEEP` in place of `RESEARCH`, and end its final answer with `through PEP 572, after a bitter debate.` Change the researcher's scripted answer from `TERSE` to `FULL`. Run it. The debate now reaches the final answer. The run still makes 8 calls, and the supervisor's rough tokens rise from 446 to 501.",
        "code": "uv run --no-sync python -m askpep.patterns.supervisor"
      }
    ],
    "verify": "uv run --no-sync python -m askpep.patterns.supervisor"
  },
  "recap": [
    "A supervisor is a ReAct loop whose tools are workers, and each worker runs its own loop and returns a short result.",
    "Context isolation means a worker sees only its task, so the supervisor must put everything the worker needs into that task.",
    "The supervisor decides when the work is done, by answering instead of calling another worker.",
    "A hierarchical team is a worker whose tools are workers. It pays only when one level has too many workers or a group needs its own budget.",
    "A supervisor is a bottleneck, it loses detail as results are summarised, and its cost is the sum of every model's calls.",
    "Choose a deterministic workflow for known steps, plan-and-execute for open but stable steps, and a supervisor when the next job depends on the last result."
  ],
  "reinforcement": "I am becoming a forward-deployed AI engineer. In the supervisor by hand I learned that a supervisor is a loop whose tools are worker agents, each seeing only its task. It costs a model call per hop and loses detail upward. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  "interviewIds": [
    "agents-c17-q01",
    "agents-c17-q02",
    "agents-c17-q03"
  ]
};

export default chapter;
