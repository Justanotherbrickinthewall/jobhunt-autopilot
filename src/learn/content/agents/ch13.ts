import type { Chapter } from "../types";

const chapter: Chapter = {
  "id": "agents-13-plan-and-execute",
  "course": "agents",
  "number": 13,
  "title": "Plan-and-execute writes the plan once, then works it step by step",
  "tagline": "How can the model plan the steps up front, and what happens when the plan goes wrong?",
  "minutes": 55,
  "objectives": [
    "Say when a plan written up front beats a tool loop, and who decides what.",
    "Name the planner, executor, replanner and writer, and say when each calls the model.",
    "Build the planner, the executor and the writer in plain Python on chapter 11's loop.",
    "Add a capped replanner, and read what a replan changes in a trace.",
    "Build ReWOO, and explain why its executor needs no model call.",
    "Measure the calls against chapter 11's loop, and name the three ways a plan breaks.",
    "Place the pattern between ReAct and a deterministic workflow, and give the 30-second answer."
  ],
  "sections": [
    {
      "id": "s1-problem",
      "title": "A tool loop re-plans on every model call, even when the steps are known",
      "goal": "When does it pay to let the model write the steps before any tool runs?",
      "blocks": [
        {
          "kind": "p",
          "text": "Chapter 12 ended on a question. What if the task needs steps that code can't know in advance? This chapter answers it in two parts. How can the model plan the steps up front, and what happens when the plan goes wrong?"
        },
        {
          "kind": "p",
          "text": "A deterministic workflow fixes its steps in code before the run starts. That works when every question of one kind takes the same path. Many questions don't. Their steps depend on what each question asks, so code can't write them down. The model can, once it has read the question."
        },
        {
          "kind": "p",
          "text": "Take one PEP question with two parts. What is the line length limit in PEP 8, and which PEP was accepted for the Python version that added the walrus operator? Once you have read it, the steps are plain. Read PEP 8. Find the version. Search for the PEP accepted for that version."
        },
        {
          "kind": "p",
          "text": "Chapter 11's ReAct loop could answer it. But a tool loop picks the next step afresh on every model call. Each call rereads a growing history and plans again. When the steps are clear from the question alone, that repeated planning buys nothing."
        },
        {
          "kind": "p",
          "text": "**Plan-and-execute** is a pattern where a planner writes the steps once, an executor runs them and a replanner revises them after a failure. A last call writes the answer from the results. The model picks the steps once, and code picks the order after that."
        },
        {
          "kind": "callout",
          "tone": "insight",
          "title": "The plan is state, and code owns it",
          "text": "After the planner returns, the steps are a plain Python list. Code takes them one at a time. The model can change the list only through a replanner call, and code decides when to make that call. In a tool loop the model owns the next step on every call."
        },
        {
          "kind": "quiz",
          "id": "agents13-q1",
          "question": "A tool loop and plan-and-execute answer the same two-part question. What is the main difference in who decides?",
          "options": [
            "The tool loop uses code to pick steps and plan-and-execute uses the model.",
            "The tool loop lets the model pick each step as it goes. Plan-and-execute has the model write the steps once, then code works through them.",
            "Plan-and-execute has no model calls.",
            "They are the same pattern with two names."
          ],
          "answer": 1,
          "explain": "In a tool loop the model owns the next step on every model call. In plan-and-execute the model writes the list once and code owns the order. A replanner can revise the list, but only when code calls it."
        },
        {
          "kind": "p",
          "text": "Writing a plan, working it and fixing it are separate jobs. The next section gives each job a role and counts what it costs."
        }
      ]
    },
    {
      "id": "s2-how",
      "title": "Four roles split the work, and only two of them call the model on every run",
      "goal": "Who are the four roles, and when does each one call the model?",
      "blocks": [
        {
          "kind": "p",
          "text": "The pattern has four roles. The **planner** writes the steps once, before any tool runs. The **executor** works the steps one at a time. The **replanner** rewrites the failed step and the ones after it. The writer does chapter 1's writer's job: it writes the reply, here from the step results."
        },
        {
          "kind": "compare",
          "caption": "The four roles of plan-and-execute, and what each one costs",
          "columns": [
            "Role",
            "What it does",
            "Model calls",
            "State it owns"
          ],
          "rows": [
            [
              "Planner",
              "Writes the numbered steps once, before any tool runs",
              "One call on every run",
              "Nothing after it returns"
            ],
            [
              "Executor",
              "Works each step, as a direct tool call or a small tool loop",
              "None for a direct step, and one or more for a loop step",
              "The list of steps and the results so far"
            ],
            [
              "Replanner",
              "Replaces the failed step and the remaining ones",
              "One call for each replan, capped",
              "Nothing after it returns"
            ],
            [
              "Writer",
              "Writes the answer from the question and the step results",
              "One call on every run",
              "Nothing after it returns"
            ]
          ]
        },
        {
          "kind": "p",
          "text": "Each item on the plan is a plan step. Each has a goal, and it may also name a tool and its arguments. If it does, the executor calls the tool directly, with no model call. A step with no tool needs an earlier result. The executor hands it to chapter 11's loop, with the results so far."
        },
        {
          "kind": "p",
          "text": "Code decides when a plan step has failed, not the model. A step fails when its tool returns a `ToolError` or a search finds `no match`. On a failure the executor calls the replanner, up to a cap. After the cap, it records the failure and carries on, and the writer sees it."
        },
        {
          "kind": "p",
          "text": "That is the whole design. The next section writes it in plain Python, on chapter 10's kit and chapter 11's loop."
        }
      ]
    },
    {
      "id": "s3-build",
      "title": "The planner and the executor fit in about ninety lines of plain Python",
      "goal": "What does each role look like in code?",
      "blocks": [
        {
          "kind": "p",
          "text": "Work in your own AskPEP repository. The file goes in `src/askpep/patterns/` next to the kit. The reference copy is `capstone/src/askpep/patterns/plan_execute.py` in the my-learn folder. All three model roles share one model object, so `.n_calls` counts the whole run."
        },
        {
          "kind": "step",
          "id": "agents13-s1",
          "title": "Write the header, the loop hand-off and the planner",
          "text": "Create `plan_execute.py`. `ask` makes one model call with an instruction and the facts as JSON. `solve` hands a plan step that names no tool to chapter 11's `react` loop. It gives that loop a step budget of three and copies its trace into this run. `make_plan` is the one planning call.",
          "lang": "python",
          "file": "src/askpep/patterns/plan_execute.py",
          "code": "\"\"\"Plan and execute: one planning call, a step-by-step executor and one write-up call.\n\nStandard library only. ReWOO, the variant that writes the tool calls up front, comes after it.\n\"\"\"\n\nimport json\n\nfrom askpep.patterns.kit import Run, Tools, fake_pep_tools, make_model, trace\nfrom askpep.patterns.react import react\n\nQUESTION = (\n    \"What is the line length limit in PEP 8, and which PEP was accepted \"\n    \"for the Python version that added the walrus operator?\"\n)\nMAX_REPLANS = 1\nMAX_TURNS = 3\n\n\ndef ask(model, system: str, **payload):\n    \"\"\"One model call: an instruction, then the facts as JSON.\"\"\"\n    return model([{\"role\": \"system\", \"content\": system}, {\"role\": \"user\", \"content\": json.dumps(payload)}])\n\n\ndef solve(task: str, tools: Tools, model, run: Run, cap: int = MAX_TURNS) -> str:\n    \"\"\"Hand one step to the chapter 11 loop, and keep its trace in this run.\"\"\"\n    sub = react(task, model, tools, cap)\n    run.steps.extend(sub.steps)\n    return sub.answer or f\"ToolError: {sub.steps[-1].text}\"\n\n\ndef make_plan(model, question: str, tools: Tools) -> list[dict]:\n    \"\"\"The planning call. It runs once and returns the steps.\"\"\"\n    system = (\n        'Write a plan as JSON: {\"steps\": [{\"goal\", \"tool\", \"args\"}]}. '\n        \"Leave tool and args out of a step that needs an earlier result. Tools: \" + \", \".join(tools.names())\n    )\n    return ask(model, system, question=question)[\"steps\"]"
        },
        {
          "kind": "step",
          "id": "agents13-s2",
          "title": "Write the executor, the replanner and the writer",
          "text": "Append `failed`, `replan`, `execute`, `write_answer` and `plan_and_execute`. The executor takes one plan step at a time. It calls a tool directly when the step names one, and runs the small loop when it doesn't. On a failure it replans, at most `MAX_REPLANS` times.",
          "lang": "python",
          "file": "src/askpep/patterns/plan_execute.py",
          "code": "def failed(result) -> bool:\n    \"\"\"A step failed when the tool errored or found nothing.\"\"\"\n    return (isinstance(result, str) and result.startswith(\"ToolError\")) or result == [\"no match\"]\n\n\ndef replan(model, question, results, step, error, remaining) -> list[dict]:\n    \"\"\"The replanner sees what is done, what failed and what is left, and returns new remaining steps.\"\"\"\n    system = 'A step failed. Return {\"steps\": [...]} that replaces the failed step and the remaining ones.'\n    return ask(model, system, question=question, done=results, failed=step, error=error, remaining=remaining)[\"steps\"]\n\n\ndef execute(question: str, steps: list[dict], tools: Tools, model, run: Run) -> list[tuple[str, object]]:\n    \"\"\"Work the steps in order. A failure triggers a replan, at most MAX_REPLANS times.\"\"\"\n    results: list[tuple[str, object]] = []\n    queue, replans = list(steps), 0\n    while queue:\n        step = queue.pop(0)\n        run.add(\"step\", step[\"goal\"])\n        if \"tool\" in step:\n            run.add(\"tool\", f\"{step['tool']}({json.dumps(step['args'])})\")\n            result = tools.call(step[\"tool\"], step[\"args\"])\n        else:\n            known = \"; \".join(f\"{goal} -> {json.dumps(r)}\" for goal, r in results)\n            result = solve(f\"{step['goal']} Known so far: {known}\", tools, model, run)\n        run.add(\"result\", json.dumps(result))\n        if failed(result) and replans < MAX_REPLANS:\n            replans += 1\n            queue = replan(model, question, results, step, result, queue)\n            run.add(\"replan\", f\"{len(queue)} steps left: \" + \"; \".join(s[\"goal\"] for s in queue))\n            continue\n        results.append((step[\"goal\"], result))\n    return results\n\n\ndef write_answer(model, question: str, results: list) -> str:\n    return ask(model, \"Write the final answer from the step results.\", question=question, results=results)[\"answer\"]\n\n\ndef plan_and_execute(question: str, replies: list[dict], live: bool = False) -> Run:\n    tools = fake_pep_tools()\n    model = make_model(replies, live)\n    run = Run(question, model=model)\n    steps = make_plan(model, question, tools)\n    run.add(\"plan\", \"; \".join(f\"{i}. {s['goal']}\" for i, s in enumerate(steps, 1)))\n    results = execute(question, steps, tools, model, run)\n    run.answer = write_answer(model, question, results)\n    run.add(\"answer\", run.answer)\n    return run"
        },
        {
          "kind": "p",
          "text": "Read `execute` once, slowly. `queue` holds the plan steps still to run. A replan replaces that list, and a step that succeeds goes into `results`. Nothing in this function asks the model which step is next. That choice was made when the plan was written."
        },
        {
          "kind": "quiz",
          "id": "agents13-q2",
          "question": "In `execute`, a step has no `tool` key. What does the executor do?",
          "options": [
            "It skips the step.",
            "It calls the planner again.",
            "It runs the chapter 11 `react` loop with the results so far in the task text.",
            "It raises an error."
          ],
          "answer": 2,
          "explain": "A step without a tool needs an earlier result. The executor hands the goal and the results so far to the small loop, which picks a tool with a model call. That is how a later step reads what an earlier one found."
        },
        {
          "kind": "p",
          "text": "The file has its roles but no scripts. The next section gives it two, one where the plan holds and one where a step fails."
        }
      ]
    },
    {
      "id": "s4-replan",
      "title": "A capped replanner revises the plan after a failed step",
      "goal": "What does a replan change in the trace, and what does it cost?",
      "blocks": [
        {
          "kind": "p",
          "text": "Now give the module two scripts. The clean script has a right plan. In the failing script, the planner guessed the feature name as `walrus`, when the tool wants `walrus operator`. The tool error lists the known names, so the replanner has what it needs."
        },
        {
          "kind": "step",
          "id": "agents13-s3",
          "title": "Add the two scripts and run them",
          "text": "Append the scripted replies and a `__main__` that prints both runs. Read the second trace for the `replan` line. Count the model calls in each footer.",
          "lang": "python",
          "file": "src/askpep/patterns/plan_execute.py",
          "code": "READ_LINE = {\"goal\": \"Read the line length rule in PEP 8.\", \"tool\": \"read_pep_section\", \"args\": {\"pep\": 8, \"section\": \"line length\"}}\nFIND_PEP = {\"goal\": \"Find the PEP accepted for that version.\"}\nANSWER = {\"answer\": \"PEP 8 limits lines to 79 characters. The walrus operator came in Python 3.8, and PEP 572 was accepted for it.\"}\n\n\ndef version_step(feature: str) -> dict:\n    return {\"goal\": \"Find the Python version that added the walrus operator.\", \"tool\": \"python_feature_version\", \"args\": {\"feature\": feature}}\n\n\n# Clean run: the plan is right, so there is no replan. Four model calls.\nCLEAN = [\n    {\"steps\": [READ_LINE, version_step(\"walrus operator\"), FIND_PEP]},\n    {\"thought\": \"The version is 3.8, so search for it.\", \"tool\": \"search_peps\", \"args\": {\"query\": \"3.8\"}},\n    {\"answer\": \"PEP 572: Assignment Expressions\"},\n    ANSWER,\n]\n\n# Failing run: the planner guessed the feature name, the tool errors and the replanner fixes the step.\nREPLAN = [\n    {\"steps\": [READ_LINE, version_step(\"walrus\"), FIND_PEP]},\n    {\"steps\": [version_step(\"walrus operator\"), FIND_PEP]},\n    {\"thought\": \"The version is 3.8, so search for it.\", \"tool\": \"search_peps\", \"args\": {\"query\": \"3.8\"}},\n    {\"answer\": \"PEP 572: Assignment Expressions\"},\n    ANSWER,\n]\n\n\nif __name__ == \"__main__\":\n    import sys\n\n    live = \"--live\" in sys.argv\n    trace(plan_and_execute(QUESTION, CLEAN, live))\n    print()\n    trace(plan_and_execute(QUESTION, REPLAN, live))",
          "expect": "Q: What is the line length limit in PEP 8, and which PEP was accepted for the Python version that added the walrus operator?\n 1. plan    1. Read the line length rule in PEP 8.; 2. Find the Python version that added the walrus operator.; 3. Find the PEP accepted for that version.\n 2. step    Read the line length rule in PEP 8.\n 3. tool    read_pep_section({\"pep\": 8, \"section\": \"line length\"})\n 4. result  \"Limit lines to 79 characters. Limit docstrings and comments to 72.\"\n 5. step    Find the Python version that added the walrus operator.\n 6. tool    python_feature_version({\"feature\": \"walrus operator\"})\n 7. result  \"3.8\"\n 8. step    Find the PEP accepted for that version.\n 9. think   The version is 3.8, so search for it.\n10. tool    search_peps({\"query\": \"3.8\"})\n11. observe [\"PEP 572: Assignment Expressions\"]\n12. answer  PEP 572: Assignment Expressions\n13. result  \"PEP 572: Assignment Expressions\"\n14. answer  PEP 8 limits lines to 79 characters. The walrus operator came in Python 3.8, and PEP 572 was accepted for it.\nmodel calls: 4, rough tokens: 642\n\nQ: What is the line length limit in PEP 8, and which PEP was accepted for the Python version that added the walrus operator?\n 1. plan    1. Read the line length rule in PEP 8.; 2. Find the Python version that added the walrus operator.; 3. Find the PEP accepted for that version.\n 2. step    Read the line length rule in PEP 8.\n 3. tool    read_pep_section({\"pep\": 8, \"section\": \"line length\"})\n 4. result  \"Limit lines to 79 characters. Limit docstrings and comments to 72.\"\n 5. step    Find the Python version that added the walrus operator.\n 6. tool    python_feature_version({\"feature\": \"walrus\"})\n 7. result  \"ToolError: unknown feature 'walrus'. Known: walrus operator, f-strings, match statement\"\n 8. replan  2 steps left: Find the Python version that added the walrus operator.; Find the PEP accepted for that version.\n 9. step    Find the Python version that added the walrus operator.\n10. tool    python_feature_version({\"feature\": \"walrus operator\"})\n11. result  \"3.8\"\n12. step    Find the PEP accepted for that version.\n13. think   The version is 3.8, so search for it.\n14. tool    search_peps({\"query\": \"3.8\"})\n15. observe [\"PEP 572: Assignment Expressions\"]\n16. answer  PEP 572: Assignment Expressions\n17. result  \"PEP 572: Assignment Expressions\"\n18. answer  PEP 8 limits lines to 79 characters. The walrus operator came in Python 3.8, and PEP 572 was accepted for it.\nmodel calls: 5, rough tokens: 883"
        },
        {
          "kind": "p",
          "text": "In the first run, steps one and two are direct tool calls. Only step three needs the model, and it takes two calls through chapter 11's loop. With the plan and the write-up, that makes four. In the second run, the error on line 7 triggers one replan, and the total is five."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Cap the replans",
          "text": "A replanner is a model, and it can return the same bad step again. With no cap, one failing step makes an endless chain of replans. `MAX_REPLANS = 1` is a budget, from chapter 6, counted in replans. After the cap, the failure goes to the writer, and a good writer says what it could not find."
        },
        {
          "kind": "quiz",
          "id": "agents13-q3",
          "question": "A step returns `ToolError: unknown feature 'walrus'` and `MAX_REPLANS` is 1. The replanner returns the same step with the same bad argument. What happens?",
          "options": [
            "The run replans again, with no limit.",
            "The second failure is recorded in the results and the executor carries on to the next step.",
            "The run stops with an exception.",
            "The planner is called from scratch."
          ],
          "answer": 1,
          "explain": "The cap is spent after one replan. The executor appends the failed result and moves on, and the writer sees the failure in its input. A desk that must not answer without that result could send the run to a review queue instead, as chapter 12 did."
        },
        {
          "kind": "fold",
          "tone": "hood",
          "title": "Why the replanner sees the done steps",
          "text": "The replanner gets the results so far, the failed step with its error, and the steps still waiting. It returns a new list for the failed step and what follows. It never touches finished steps, so a replan cannot redo work or change a result code has already used."
        },
        {
          "kind": "p",
          "text": "Each plan step still waits for the one before it. Step three paid two model calls just to read step two's result. The next section removes those calls."
        }
      ]
    },
    {
      "id": "s5-rewoo",
      "title": "ReWOO writes the tool calls up front, so the executor needs no model call",
      "goal": "Can the plan pass one tool's result to a later call without asking the model?",
      "blocks": [
        {
          "kind": "p",
          "text": "**ReWOO** is plan-and-execute where the plan names every tool call, so the executor never asks the model. The name stands for reasoning without observation. A later call may name an earlier result with a placeholder such as `#E2`. The executor swaps each placeholder for the real result, then calls the tool."
        },
        {
          "kind": "p",
          "text": "That removes the model call from every step. A run needs two calls in total, one to write the plan and one to write the answer. The price is that the planner must know every call before it sees any result. It can name results, but it can't read them."
        },
        {
          "kind": "step",
          "id": "agents13-s4",
          "title": "Add ReWOO and run it",
          "text": "Append `fill`, `rewoo` and its script. Replace the old `__main__` block with the new one. In the script, step three searches for `#E2`, which is the version found in step two.",
          "lang": "python",
          "file": "src/askpep/patterns/plan_execute.py",
          "code": "def fill(value, evidence: dict):\n    \"\"\"Swap each #E id in a string argument for the result it names.\"\"\"\n    if not isinstance(value, str):\n        return value\n    for key, item in evidence.items():  # shortcut: #E1 also matches inside #E10, so use a regex past nine steps\n        value = value.replace(key, str(item))\n    return value\n\n\ndef rewoo(question: str, replies: list[dict], live: bool = False) -> Run:\n    \"\"\"Reasoning without observation: the planner writes every call up front, with #E ids for earlier results.\"\"\"\n    tools = fake_pep_tools()\n    model = make_model(replies, live)\n    run = Run(question, model=model)\n    system = (\n        'Write every tool call up front as JSON: {\"steps\": [{\"id\": \"#E1\", \"tool\", \"args\"}]}. '\n        \"An argument may contain an earlier id, such as #E1. Tools: \" + \", \".join(tools.names())\n    )\n    plan = ask(model, system, question=question)[\"steps\"]\n    run.add(\"plan\", \"; \".join(f\"{s['id']} = {s['tool']}\" for s in plan))\n    evidence: dict[str, object] = {}\n    for s in plan:  # no model call in this loop\n        args = {k: fill(v, evidence) for k, v in s[\"args\"].items()}\n        run.add(\"tool\", f\"{s['id']} = {s['tool']}({json.dumps(args)})\")\n        evidence[s[\"id\"]] = tools.call(s[\"tool\"], args)\n        run.add(\"observe\", json.dumps(evidence[s[\"id\"]]))\n    run.answer = ask(model, \"Write the final answer from the evidence.\", question=question, evidence=evidence)[\"answer\"]\n    run.add(\"answer\", run.answer)\n    return run\n\n\nREWOO = [\n    {\n        \"steps\": [\n            {\"id\": \"#E1\", \"tool\": \"read_pep_section\", \"args\": {\"pep\": 8, \"section\": \"line length\"}},\n            {\"id\": \"#E2\", \"tool\": \"python_feature_version\", \"args\": {\"feature\": \"walrus operator\"}},\n            {\"id\": \"#E3\", \"tool\": \"search_peps\", \"args\": {\"query\": \"#E2\"}},\n        ]\n    },\n    ANSWER,\n]\n\n\nif __name__ == \"__main__\":\n    import sys\n\n    trace(rewoo(QUESTION, REWOO, live=\"--live\" in sys.argv))",
          "expect": "Q: What is the line length limit in PEP 8, and which PEP was accepted for the Python version that added the walrus operator?\n 1. plan    #E1 = read_pep_section; #E2 = python_feature_version; #E3 = search_peps\n 2. tool    #E1 = read_pep_section({\"pep\": 8, \"section\": \"line length\"})\n 3. observe \"Limit lines to 79 characters. Limit docstrings and comments to 72.\"\n 4. tool    #E2 = python_feature_version({\"feature\": \"walrus operator\"})\n 5. observe \"3.8\"\n 6. tool    #E3 = search_peps({\"query\": \"3.8\"})\n 7. observe [\"PEP 572: Assignment Expressions\"]\n 8. answer  PEP 8 limits lines to 79 characters. The walrus operator came in Python 3.8, and PEP 572 was accepted for it.\nmodel calls: 2, rough tokens: 299"
        },
        {
          "kind": "p",
          "text": "Compare this trace with the plan-and-execute one. Step three needed the version from step two. In plan-and-execute that step took a small loop and two model calls. Here the placeholder carries the version, so the whole run costs two calls and 299 rough tokens."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "A wrong placeholder fails quietly",
          "text": "If the planner writes `#E1` where it meant `#E2`, nothing raises. The search runs with the PEP 8 sentence and returns two PEPs, PEP 8 and PEP 572. The answer then rests on the wrong evidence. ReWOO has no model between steps to notice. Check the plan before you run it."
        },
        {
          "kind": "fold",
          "tone": "industry",
          "title": "Where ReWOO came from",
          "text": "ReWOO began as a 2023 research paper and is now a pattern name. Frameworks build it as a planner node, a node that fills placeholders and runs the tools, and a solver node that writes the answer. It claims fewer model calls and tokens than a tool loop. Measure that on your own questions before you rely on it."
        },
        {
          "kind": "p",
          "text": "ReWOO is the cheapest run so far. The next section sets all four runs side by side, then looks at where a plan breaks."
        }
      ]
    },
    {
      "id": "s6-breaks",
      "title": "Plan-and-execute saves calls only when the plan holds, and three things break it",
      "goal": "What does a plan save against chapter 11's loop, and how does it go wrong?",
      "blocks": [
        {
          "kind": "p",
          "text": "Now measure. Add chapter 11's loop on the same question, a script where the planner invents tools, and a `compare` function. The function prints model calls and rough tokens for four runs. Read the numbers before you read the next paragraph."
        },
        {
          "kind": "step",
          "id": "agents13-s5",
          "title": "Add the baseline, the invented tools and the comparison",
          "text": "Append the ReAct baseline and the `compare` function. Replace the `__main__` block again. The first trace shows the replan cap at work. The table after it is the cost comparison.",
          "lang": "python",
          "file": "src/askpep/patterns/plan_execute.py",
          "code": "REACT = [\n    {\"thought\": \"Read the PEP 8 rule.\", \"tool\": \"read_pep_section\", \"args\": {\"pep\": 8, \"section\": \"line length\"}},\n    {\"thought\": \"Now the version.\", \"tool\": \"python_feature_version\", \"args\": {\"feature\": \"walrus operator\"}},\n    {\"thought\": \"Search for that version.\", \"tool\": \"search_peps\", \"args\": {\"query\": \"3.8\"}},\n    ANSWER,\n]\n\n# Two failures in a row: the replanner invents a tool too, so the replan cap ends the retries.\nINVENTED = [\n    {\"steps\": [{\"goal\": \"Search the web for the PEP 8 rule.\", \"tool\": \"web_search\", \"args\": {\"query\": \"PEP 8 line length\"}}, version_step(\"walrus operator\")]},\n    {\"steps\": [{\"goal\": \"Browse the PEP 8 page.\", \"tool\": \"browse_docs\", \"args\": {\"url\": \"pep-0008\"}}, version_step(\"walrus operator\")]},\n    {\"answer\": \"I found the walrus version, 3.8, but I could not read the PEP 8 rule.\"},\n]\n\n\ndef react_baseline(question: str, live: bool = False) -> Run:\n    \"\"\"Chapter 11 on the same question: one loop, no plan.\"\"\"\n    return react(question, make_model(REACT, live), fake_pep_tools())\n\n\ndef compare() -> None:\n    runs = {\n        \"react\": react_baseline(QUESTION),\n        \"plan-execute\": plan_and_execute(QUESTION, CLEAN),\n        \"plan-execute, one replan\": plan_and_execute(QUESTION, REPLAN),\n        \"rewoo\": rewoo(QUESTION, REWOO),\n    }\n    for name, run in runs.items():\n        print(f\"{name:<26} calls {run.model.n_calls}  tokens {run.model.tokens}\")\n\n\nif __name__ == \"__main__\":\n    import sys\n\n    trace(plan_and_execute(QUESTION, INVENTED, live=\"--live\" in sys.argv))\n    print()\n    compare()",
          "expect": "Q: What is the line length limit in PEP 8, and which PEP was accepted for the Python version that added the walrus operator?\n 1. plan    1. Search the web for the PEP 8 rule.; 2. Find the Python version that added the walrus operator.\n 2. step    Search the web for the PEP 8 rule.\n 3. tool    web_search({\"query\": \"PEP 8 line length\"})\n 4. result  \"ToolError: no tool named web_search. Tools: search_peps, read_pep_section, python_feature_version\"\n 5. replan  2 steps left: Browse the PEP 8 page.; Find the Python version that added the walrus operator.\n 6. step    Browse the PEP 8 page.\n 7. tool    browse_docs({\"url\": \"pep-0008\"})\n 8. result  \"ToolError: no tool named browse_docs. Tools: search_peps, read_pep_section, python_feature_version\"\n 9. step    Find the Python version that added the walrus operator.\n10. tool    python_feature_version({\"feature\": \"walrus operator\"})\n11. result  \"3.8\"\n12. answer  I found the walrus version, 3.8, but I could not read the PEP 8 rule.\nmodel calls: 3, rough tokens: 549\n\nreact                      calls 4  tokens 764\nplan-execute               calls 4  tokens 642\nplan-execute, one replan   calls 5  tokens 883\nrewoo                      calls 2  tokens 299"
        },
        {
          "kind": "p",
          "text": "Plan-and-execute with a clean plan made four calls, the same as the tool loop. It used fewer tokens, 642 against 764, because the loop re-sends a growing history. One replan raised it to five calls and 883 tokens. ReWOO made two calls and 299 tokens. The saving is real only when most steps are direct."
        },
        {
          "kind": "widget",
          "id": "agents13-count-calls",
          "intro": "Predict the model calls for five runs, then check them. Watch which steps cost a call and which are free. Decide for yourself when a plan beats a loop."
        },
        {
          "kind": "p",
          "text": "Three failures matter. A **stale plan** is a plan whose later steps no longer fit what the earlier steps found. A **planner that invents tools** names a tool that does not exist, and the run only finds out when the step runs. A **hidden dependency** is a step whose argument depends on an earlier result that the plan guessed."
        },
        {
          "kind": "p",
          "text": "Each failure has a cure, and one more cure covers the writer."
        },
        {
          "kind": "list",
          "items": [
            "Stale plan: replan when a step fails or finds nothing, and keep the cap so one bad step cannot spin the run.",
            "Invented tool: the `ToolError` lists the real tools, so the replanner can fix the name. A gate node, as in chapter 12, can test every tool name before step one runs.",
            "Hidden dependency: leave tool and args out of a step that needs an earlier result. The executor then runs a loop that reads it.",
            "Lost failure: pass failed results to the writer, so the answer admits what is missing."
          ]
        },
        {
          "kind": "widget",
          "id": "agents13-spot-the-break",
          "intro": "Five plans follow. Name the failure in each, or say there is none. Predict before you check. Watch how often the cure is a replan and how often it is a better plan."
        },
        {
          "kind": "quiz",
          "id": "agents13-q4",
          "question": "In the invented-tool run, the replanner also invents a tool. The model made 3 calls. Why not 4 or more?",
          "options": [
            "The scripted model ran out of replies.",
            "The replan cap of 1 stopped a second replan, so the failure went to the writer.",
            "The planner was called again and succeeded.",
            "Invented tools are never counted."
          ],
          "answer": 1,
          "explain": "There was one plan call, one replan call and one write-up call. The cap blocked a second replan. A run with no cap would have kept replanning."
        },
        {
          "kind": "fold",
          "tone": "trouble",
          "title": "The writer can still invent",
          "text": "If a failed result reaches the writer, a weak model may answer as if the step had worked. Tell the writer to list what it could not find. Then add a golden-set case that checks the answer names the failed step."
        },
        {
          "kind": "p",
          "text": "You can now build the pattern, measure it and say where it breaks. The last section places it among its neighbours, which is how interviews ask about it."
        }
      ]
    },
    {
      "id": "s7-interview",
      "title": "In an interview, say who plans, who executes and when the plan may change",
      "goal": "Where does the pattern sit among its neighbours, and what is the 30-second answer?",
      "blocks": [
        {
          "kind": "p",
          "text": "Plan-and-execute comes up in interviews, often as a contrast with ReAct. Place it by chapter 10's axis: who picks the next step, and when. The table puts it between chapter 11's ReAct loop and chapter 12's deterministic workflow."
        },
        {
          "kind": "compare",
          "caption": "Three ways to run a multi-step PEP question, by who picks the next step and when",
          "columns": [
            "Pattern",
            "Who picks the next step",
            "When the path is fixed",
            "What it costs"
          ],
          "rows": [
            [
              "ReAct, chapter 11",
              "The model, on every model call",
              "Never, because each call can change course",
              "A model call for every tool, and a growing history"
            ],
            [
              "Plan-and-execute, this chapter",
              "The model writes the plan once, then code works it",
              "When the planner returns, until a replan",
              "Two calls on every run, plus loop steps and replans"
            ],
            [
              "Deterministic workflow, chapter 12",
              "Code; the model picks from a fixed set at each decision point",
              "Before the run starts, in the code",
              "Little, but the path cannot adapt"
            ]
          ]
        },
        {
          "kind": "p",
          "text": "In LangGraph the same pattern is a graph with four nodes. A conditional edge after `execute` decides whether to run the next step, replan or answer. The state holds the plan, the past steps and a replan counter."
        },
        {
          "kind": "code",
          "lang": "python",
          "code": "from langgraph.graph import StateGraph, START, END\n\ngraph = StateGraph(PlanState)  # plan, past_steps, replans, answer\ngraph.add_node(\"plan\", plan_node)\ngraph.add_node(\"execute\", execute_node)\ngraph.add_node(\"replan\", replan_node)\ngraph.add_node(\"answer\", answer_node)\ngraph.add_edge(START, \"plan\")\ngraph.add_edge(\"plan\", \"execute\")\ngraph.add_conditional_edges(\"execute\", route)  # returns \"execute\", \"replan\" or \"answer\"\ngraph.add_edge(\"replan\", \"execute\")\ngraph.add_edge(\"answer\", END)\napp = graph.compile()",
          "caption": "Plan-and-execute as a LangGraph graph"
        },
        {
          "kind": "callout",
          "tone": "interview",
          "title": "The 30-second answer",
          "text": "Plan-and-execute has a planner write the steps once, an executor work them and a writer compose the answer. A replanner revises the remaining steps after a failure, up to a cap. It beats a tool loop when I can list the parts after reading the question, because direct steps cost no model call."
        },
        {
          "kind": "callout",
          "tone": "interview",
          "title": "What I guard against",
          "text": "I cap replans, check tool names and let failures reach the writer. I use a tool loop when the next step depends on what the last one found."
        },
        {
          "kind": "callout",
          "tone": "interview",
          "title": "A follow-up to expect",
          "text": "They may ask how ReWOO differs. Say that its planner writes every tool call up front with placeholders for earlier results, so the executor makes no model calls. The cost is that the planner cannot read any result before it plans."
        },
        {
          "kind": "p",
          "text": "Every pattern so far decides the next step: a tool, a route or a plan step. None of them checks the answer it ends with. Here the writer composes one answer, and the run returns it as it stands. That raises the next chapter's question. How do I improve an answer the model has already given?"
        }
      ]
    }
  ],
  "lab": {
    "title": "Change the plan and watch the calls",
    "goal": "Run the module, change it three ways and predict the call count each time. Every lab step runs offline. Compare your file with `capstone/src/askpep/patterns/plan_execute.py` in the my-learn folder.",
    "minutes": 20,
    "files": [
      "src/askpep/patterns/plan_execute.py"
    ],
    "steps": [
      {
        "title": "Run it unchanged",
        "text": "Run the module and compare the trace and the table with the chapter. The invented-tool trace ends with 3 model calls at 549 rough tokens. The table rows show 4, 4, 5 and 2 calls, at 764, 642, 883 and 299 tokens.",
        "code": "uv run --no-sync python -m askpep.patterns.plan_execute"
      },
      {
        "title": "Switch replanning off",
        "text": "Set `MAX_REPLANS = 0`. Then delete the reply that holds revised steps in two scripts: the second reply of `REPLAN` and of `INVENTED`. Left in, each would reach the write-up call and stop the run with `KeyError: 'answer'`. Predict the call counts and the line after the first failed result, then run it. There is no `replan` line. The version step follows the `web_search` error, because the failure went straight into the results. The run makes 2 model calls at 307 rough tokens, and the writer still admits it could not read the PEP 8 rule. The one-replan row drops to 4 calls and 703 tokens, though its label still says one replan. Restore all three changes.",
        "code": "uv run --no-sync python -m askpep.patterns.plan_execute"
      },
      {
        "title": "Point a placeholder at the wrong result",
        "text": "In `REWOO`, change the search query from `#E2` to `#E1`. At the end of the `__main__` block, add `trace(rewoo(QUESTION, REWOO))`, indented like the lines above it. Predict whether the run raises, then run it. It doesn't. The `#E3` tool line now searches for the whole PEP 8 sentence, and its observe line returns PEP 8 and PEP 572. The rewoo row stays at 2 calls and moves from 299 to 309 tokens. The scripted answer can't change, because its reply is fixed. A live writer would get evidence that never searched for the version, and nothing flags it. Undo both changes.",
        "code": "uv run --no-sync python -m askpep.patterns.plan_execute"
      },
      {
        "title": "Make step three direct",
        "text": "In `CLEAN`, the first reply's plan ends with `FIND_PEP`. Change that entry to `{**FIND_PEP, \"tool\": \"search_peps\", \"args\": {\"query\": \"3.8\"}}`, and delete the two loop replies after the plan. Edit `CLEAN` only, because `REPLAN` also uses `FIND_PEP`. Predict the new call count, then run it. The plan-execute row drops from 4 calls and 642 tokens to 2 calls and 359. The plan now carries `3.8`, a value that step two was meant to find. That is a hidden dependency, written in on purpose, and it saved two calls. Restore `CLEAN`.",
        "code": "uv run --no-sync python -m askpep.patterns.plan_execute"
      }
    ],
    "verify": "uv run --no-sync python -m askpep.patterns.plan_execute"
  },
  "recap": [
    "Plan-and-execute has the model write the steps once, and code works them in order.",
    "A plan step with a tool is a direct call with no model call. A step without one runs a small loop.",
    "A replanner revises the remaining steps after a failure, and a cap stops it spinning.",
    "ReWOO writes every call up front with placeholders, so a run costs two model calls.",
    "The saving depends on the plan holding. A clean run matched the loop on calls, and one replan cost more.",
    "A plan breaks when it is stale, invents a tool or hides a dependency."
  ],
  "reinforcement": "I am becoming a forward-deployed AI engineer. In plan-and-execute I learned that a model writes the plan once and code works it, which saves model calls only while the plan holds. Cap the replans, check tool names and pass failures to the writer. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  "interviewIds": [
    "agents-c13-q01",
    "agents-c13-q02",
    "agents-c13-q03"
  ]
};

export default chapter;
