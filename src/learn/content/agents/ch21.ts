import type { Chapter } from "../types";

const chapter: Chapter = {
  "id": "agents-21-evaluating-agents",
  "course": "agents",
  "number": 21,
  "title": "An agent is tested on the path it took as well as its answer",
  "tagline": "How do I test an agent when the right answer can come by the wrong path? Score the path and the answer, check the LLM judge, and block a change that regresses.",
  "minutes": 75,
  "objectives": [
    "Say why an agent is tested on its path as well as its answer, and name the four levels of check.",
    "Write a golden set whose cases hold the answer words, the expected calls and a label, and run two agents behind one function.",
    "Code the four checks, with trajectory match in three modes, and read one run at every level.",
    "Write an LLM judge with a rubric, and measure how often it agrees with a person.",
    "Tell pass@k from pass^k, and say why an agent that acts alone must pass on every run.",
    "Gate a change with a threshold for each metric, and read a failure that names the case.",
    "Name three ways evals mislead and the guard for each, and give the 30-second answer."
  ],
  "sections": [
    {
      "id": "s1-path",
      "title": "A right answer reached by a wrong path is still a failing agent",
      "goal": "Why isn't a right answer enough, and what else must a test of an agent check?",
      "blocks": [
        {
          "kind": "p",
          "text": "Chapter 20 ended on a question. How do I know any of these agents took the right path? Every agent since chapter 10 chooses its own steps, and a test that reads only the answer can't see them. So this chapter asks: how do I test an agent when the right answer can come by the wrong path?"
        },
        {
          "kind": "p",
          "text": "Take the walrus question. Chapter 11's ReAct loop and chapter 12's deterministic workflow both answer Python 3.8. The ReAct loop searches the PEPs first, then asks the version tool. The workflow goes straight to the version tool. A check on the final answer can't tell the two runs apart, and you want to know which one was sound."
        },
        {
          "kind": "p",
          "text": "An agent chooses its own steps, so the steps are part of its behaviour. A run can reach the right answer through three needless calls. It can guess a version it never looked up. It can read a tool error, ignore it and still land near the truth. The answer hides each of these defects."
        },
        {
          "kind": "p",
          "text": "So you test an agent on a golden set, from course 1. Each case holds the words a right answer must contain and the tool calls a right run makes. It also carries a **label**, which names the behaviour the case tests. When a case fails, its label tells you what broke."
        },
        {
          "kind": "p",
          "text": "The checks read each run's trajectory, as chapter 4 did, and this chapter also calls it the path. You check each run at four levels. Efficiency compares the run with a budget, from chapter 6, set for the whole run. The levels cost more as you go down, and each catches a failure the others miss."
        },
        {
          "kind": "compare",
          "caption": "The four levels of check, and what each one catches",
          "columns": [
            "Level",
            "What it asks",
            "What it catches",
            "What it misses"
          ],
          "rows": [
            [
              "Final answer",
              "Does the answer hold the facts the case needs",
              "A wrong or missing answer",
              "A lucky guess, and any needless work on the way"
            ],
            [
              "Tool-call accuracy",
              "Did the run call the right tool with the right arguments",
              "A wrong tool, a wrong argument, a call that never happened",
              "The order of the calls, and extra calls"
            ],
            [
              "Trajectory match",
              "Does the whole sequence of calls fit the expected one",
              "A wrong order, a skipped step, a detour",
              "A valid path that the case did not expect"
            ],
            [
              "Efficiency",
              "Are the model calls, tool calls and tokens inside a budget",
              "A run that is right but slow or costly",
              "Whether the run was right at all"
            ]
          ]
        },
        {
          "kind": "quiz",
          "id": "agents21-q1",
          "question": "A run answers the walrus question correctly after calling `search_peps` three times with the same query, a repeated call from chapter 6. Which level catches the waste?",
          "options": [
            "Final answer, because the answer is wrong.",
            "Efficiency, because the run used more calls than the budget allows.",
            "None of them. Waste is not a defect if the answer is right.",
            "Tool-call accuracy, because it counts the calls."
          ],
          "answer": 1,
          "explain": "The final answer is right, so level one passes. Tool-call accuracy only asks whether each expected call happened, so it passes too. The extra calls break the budget at level four, and the exact trajectory mode fails them at level three."
        },
        {
          "kind": "fold",
          "tone": "plain",
          "title": "Why the word is golden",
          "text": "The set is golden because its answers are fixed and trusted. A person checked each one. You run the same set on every change, so a score that moves means the agent moved, not the questions."
        },
        {
          "kind": "p",
          "text": "Before any check can run, you need the cases and a way to see each agent's calls. The next section builds both."
        }
      ]
    },
    {
      "id": "s2-golden",
      "title": "A golden set of five cases covers five behaviours, and both agents run behind one function",
      "goal": "What goes in a test case for an agent, and how do two different agents run under the same checks?",
      "blocks": [
        {
          "kind": "p",
          "text": "Work in your AskPEP repository. The file is `src/askpep/patterns/evals.py`. It imports the kit from chapter 10, the ReAct loop from chapter 11 and the deterministic workflow from chapter 12. The reference copy is in `capstone/src/askpep/patterns/evals.py` in the my-learn folder."
        },
        {
          "kind": "step",
          "id": "agents21-s1",
          "title": "Write the golden set",
          "text": "Start the file with the imports and the five cases. Each case has an id, a label, the question, `answer_has` and `calls`. The field `answer_has` holds the words a right answer must contain. The field `calls` holds the tool calls a right run makes, each as a tool name and its arguments. The off-topic case expects no calls.",
          "lang": "python",
          "file": "src/askpep/patterns/evals.py",
          "code": "\"\"\"Evaluating agents by hand: a golden set, four levels of check, a judge, pass^k and a gate.\n\nStandard library only. It scores the chapter 11 ReAct agent and the chapter 12 workflow on the same cases.\n\"\"\"\n\nimport sys\nfrom dataclasses import dataclass\n\nfrom askpep.patterns import workflow\nfrom askpep.patterns.kit import Tools, fake_pep_tools, make_model\nfrom askpep.patterns.react import react\n\n# --- the golden set: a question, the words a right answer holds, the calls a right run makes, a label ---\n\nGOLDEN = [\n    {\n        \"id\": \"version\",\n        \"label\": \"picks the one right tool\",\n        \"question\": \"Which Python version added the walrus operator?\",\n        \"answer_has\": [\"3.8\"],\n        \"calls\": [(\"python_feature_version\", {\"feature\": \"walrus operator\"})],\n    },\n    {\n        \"id\": \"summary\",\n        \"label\": \"two lookups in order\",\n        \"question\": \"What is PEP 703 about?\",\n        \"answer_has\": [\"gil\"],\n        \"calls\": [(\"search_peps\", {\"query\": \"GIL\"}), (\"read_pep_section\", {\"pep\": 703, \"section\": \"summary\"})],\n    },\n    {\n        \"id\": \"line-length\",\n        \"label\": \"reads the exact section\",\n        \"question\": \"What does PEP 8 say about line length?\",\n        \"answer_has\": [\"79\"],\n        \"calls\": [(\"read_pep_section\", {\"pep\": 8, \"section\": \"line length\"})],\n    },\n    {\n        \"id\": \"off-topic\",\n        \"label\": \"refuses without a tool\",\n        \"question\": \"What is the capital of France?\",\n        \"answer_has\": [\"python\", \"peps\"],\n        \"calls\": [],\n    },\n    {\n        \"id\": \"unknown-pep\",\n        \"label\": \"does not guess\",\n        \"question\": \"What does PEP 999 say?\",\n        \"answer_has\": [\"nothing\"],\n        \"calls\": [(\"search_peps\", {\"query\": \"999\"})],\n    },\n]"
        },
        {
          "kind": "p",
          "text": "Read the labels. One case tests tool choice, one tests two lookups in order, and one tests the exact section argument. The last two test restraint: a refusal with no tool, and an answer that admits there is nothing to find. Write cases for the behaviours you fear as well as the happy path."
        },
        {
          "kind": "p",
          "text": "Next, wrap the two agents. The checks need to read the calls, but neither agent returns them. A `Spy` wraps the tool registry and records every call it forwards. Both agents use it, so one check can compare the ReAct loop's calls with the workflow's."
        },
        {
          "kind": "step",
          "id": "agents21-s2",
          "title": "Wrap both agents and script their replies",
          "text": "Append the result type, the spy, one runner for each agent and the scripted replies. `run_react` passes the spy to chapter 11's loop. `run_workflow` swaps the spy into the workflow's tool registry for one run, then restores the old one. Each workflow script starts with the route its decision point picks. The kit's scripted model plays every script.",
          "lang": "python",
          "file": "src/askpep/patterns/evals.py",
          "code": "# --- two agents behind one function, so the same checks score both ---\n\n\n@dataclass\nclass Result:\n    answer: str\n    calls: list  # (tool, args) pairs in the order the agent made them\n    model_calls: int\n    tokens: int\n\n\nclass Spy:\n    \"\"\"Wraps a Tools registry and records every call, so a check can read the trajectory.\"\"\"\n\n    def __init__(self, tools: Tools):\n        self.tools, self.calls = tools, []\n\n    def names(self) -> list[str]:\n        return self.tools.names()\n\n    def call(self, name: str, args: dict):\n        self.calls.append((name, args))\n        return self.tools.call(name, args)\n\n\ndef run_react(case: dict, replies: list, live: bool = False) -> Result:\n    spy, model = Spy(fake_pep_tools()), make_model(replies, live)\n    run = react(case[\"question\"], model, spy)\n    return Result(run.answer, spy.calls, model.n_calls, model.tokens)\n\n\ndef run_workflow(case: dict, replies: list, live: bool = False) -> Result:\n    spy, model, saved = Spy(fake_pep_tools()), make_model(replies, live), workflow.TOOLS\n    workflow.TOOLS = spy  # shortcut: swaps a module global for one run, so never run two at once\n    try:\n        state = workflow.run_graph(workflow.new_state(case[\"id\"], case[\"question\"]), workflow.ROUTED, model, \"classify\")\n    finally:\n        workflow.TOOLS = saved\n    return Result(state.get(\"answer\", \"\"), spy.calls, model.n_calls, model.tokens)\n\n\ndef call(tool: str, **args) -> dict:\n    return {\"thought\": f\"Call {tool}.\", \"tool\": tool, \"args\": args}\n\n\ndef say(text: str) -> dict:\n    return {\"answer\": text}\n\n\nREACT_SCRIPTS = {\n    \"version\": [call(\"search_peps\", query=\"walrus\"), call(\"python_feature_version\", feature=\"walrus operator\"), say(\"Python 3.8 added the walrus operator.\")],\n    \"summary\": [call(\"search_peps\", query=\"GIL\"), call(\"read_pep_section\", pep=703, section=\"summary\"), say(\"PEP 703 lets CPython build without the GIL.\")],\n    \"line-length\": [call(\"read_pep_section\", pep=8, section=\"line length\"), say(\"PEP 8 limits lines to 79 characters.\")],\n    \"off-topic\": [say(\"I answer questions about Python PEPs only.\")],\n    \"unknown-pep\": [call(\"read_pep_section\", pep=999, section=\"summary\"), say(\"PEP 999 sets the release schedule.\")],\n}\nREACT_FIXED = {**REACT_SCRIPTS, \"unknown-pep\": [call(\"search_peps\", query=\"999\"), say(\"The desk has nothing on PEP 999.\")]}\nWORKFLOW_SCRIPTS = {\n    \"version\": [{\"route\": \"version\"}, say(\"Python 3.8 added the walrus operator.\")],\n    \"summary\": [{\"route\": \"lookup\"}, {\"query\": \"GIL\"}, say(\"PEP 703 lets CPython build without the GIL.\")],\n    \"line-length\": [{\"route\": \"lookup\"}, {\"query\": \"line length\"}, say(\"PEP 8 is the style guide for Python code.\")],\n    \"off-topic\": [{\"route\": \"refuse\"}],\n    \"unknown-pep\": [{\"route\": \"lookup\"}, {\"query\": \"999\"}],\n}"
        },
        {
          "kind": "p",
          "text": "Two scripts are wrong on purpose. On the unknown PEP, the ReAct script reads a section of a PEP that doesn't exist, then invents an answer. On the line length case, the workflow's read node always asks for the summary section, so its answer lacks the number. The checks should find both."
        },
        {
          "kind": "p",
          "text": "The workflow gets the unknown PEP right for a reason you've met. Its search finds nothing, and chapter 12's gate node ends the run with an answer that says so."
        },
        {
          "kind": "p",
          "text": "Because the scripts are written by hand, the scores in this chapter show how the checks behave. They say nothing about how a live model performs. The token counts are the kit's rough count, about four characters to a token. Run the module with `--live` to point the same checks at the real model."
        },
        {
          "kind": "quiz",
          "id": "agents21-q2",
          "question": "Why does `run_react` hand the ReAct loop a `Spy` instead of the plain tool registry?",
          "options": [
            "The spy makes the tools faster.",
            "The spy records every call, so the checks can read the trajectory afterwards.",
            "The ReAct loop from chapter 11 refuses a plain registry.",
            "The spy stops the model repeating a call."
          ],
          "answer": 1,
          "explain": "Neither agent returns its calls as data. The spy sits between the agent and the tools, forwards each call and keeps a copy. The agent notices nothing."
        },
        {
          "kind": "p",
          "text": "With the cases written and every call recorded, the checks have something to read."
        }
      ]
    },
    {
      "id": "s3-checks",
      "title": "Four checks of a few lines each catch four different failures",
      "goal": "How do you code each level, and what does one run look like at all four?",
      "blocks": [
        {
          "kind": "p",
          "text": "Each level is one small function. The first looks for words in the answer. The second counts how many expected calls were made with the right arguments. The third compares the sequence of calls in one of three modes. The fourth compares counts with the budget."
        },
        {
          "kind": "step",
          "id": "agents21-s3",
          "title": "Write the four checks and the case scorer",
          "text": "Append the checks, `score_case`, `evaluate` and `rates`. Read `trajectory` closely. The exact mode needs the same list. The any-order mode needs every expected call somewhere. The in-order subset walks forward through the calls made, so every expected call must appear, in the same order. The budget sits above the checks as a constant.",
          "lang": "python",
          "file": "src/askpep/patterns/evals.py",
          "code": "# --- four levels of check, each a few lines ---\n\nBUDGET = {\"model_calls\": 3, \"tool_calls\": 2, \"tokens\": 300}\n\n\ndef answer_ok(case: dict, result: Result) -> bool:\n    \"\"\"Level 1: the final answer holds every word the case needs.\"\"\"\n    return all(word in result.answer.lower() for word in case[\"answer_has\"])\n\n\ndef tool_accuracy(case: dict, result: Result) -> float:\n    \"\"\"Level 2: the share of expected calls made with the right tool and the right arguments.\"\"\"\n    want, got = case[\"calls\"], result.calls\n    if not want:\n        return 1.0 if not got else 0.0\n    return sum(c in got for c in want) / len(want)\n\n\ndef trajectory(case: dict, result: Result, mode: str) -> bool:\n    \"\"\"Level 3: compare the calls made with the calls expected, in one of three modes.\"\"\"\n    want, got = case[\"calls\"], result.calls\n    if mode == \"exact\":\n        return want == got\n    if mode == \"any_order\":\n        return all(c in got for c in want)\n    it = iter(got)  # in-order subset: `in` on an iterator walks forward, so order counts\n    return all(c in it for c in want)\n\n\ndef efficiency(result: Result) -> dict:\n    \"\"\"Level 4: model calls, tool calls and tokens, each against its budget.\"\"\"\n    used = {\"model_calls\": result.model_calls, \"tool_calls\": len(result.calls), \"tokens\": result.tokens}\n    return {k: (used[k], BUDGET[k], used[k] <= BUDGET[k]) for k in BUDGET}\n\n\ndef score_case(case: dict, result: Result) -> dict:\n    return {\n        \"answer\": answer_ok(case, result),\n        \"tools\": tool_accuracy(case, result) == 1.0,\n        \"exact\": trajectory(case, result, \"exact\"),\n        \"subset\": trajectory(case, result, \"subset\"),\n        \"any_order\": trajectory(case, result, \"any_order\"),\n        \"efficiency\": all(ok for _, _, ok in efficiency(result).values()),\n    }\n\n\ndef evaluate(agent, scripts: dict, live: bool = False) -> list:\n    \"\"\"Run the agent on every golden case. Each row is (case, result, scores).\"\"\"\n    rows = []\n    for case in GOLDEN:\n        result = agent(case, scripts[case[\"id\"]], live)\n        rows.append((case, result, score_case(case, result)))\n    return rows\n\n\ndef rates(rows: list) -> dict:\n    return {m: sum(s[m] for _, _, s in rows) / len(rows) for m in rows[0][2]}"
        },
        {
          "kind": "p",
          "text": "The three modes trade strictness for freedom. **Exact** match accepts only the expected sequence. **In-order subset** accepts extra calls between the expected ones. **Any-order** accepts the expected calls in any order, with or without extras. Each mode is looser than the last, and a looser mode forgives more valid paths."
        },
        {
          "kind": "step",
          "id": "agents21-s4",
          "title": "Read one run at every level, then the three modes",
          "text": "Append the two show functions. The first scores the ReAct run on the walrus question at all four levels. The second runs the three trajectory modes on three hand-made call lists. The file has no `main` yet, so run them with `uv run --no-sync python -c \"from askpep.patterns.evals import show_levels, show_modes; show_levels(); print(); show_modes()\"`.",
          "lang": "python",
          "file": "src/askpep/patterns/evals.py",
          "code": "def show_levels(live: bool = False) -> None:\n    case = GOLDEN[0]\n    result = run_react(case, REACT_SCRIPTS[\"version\"], live)\n    print(f\"case {case['id']}: {case['question']}\")\n    print(f\"  calls made: {[c[0] for c in result.calls]}\")\n    print(f\"  1 answer correct:  {answer_ok(case, result)}\")\n    print(f\"  2 tool accuracy:   {tool_accuracy(case, result):.2f}\")\n    for mode in (\"exact\", \"subset\", \"any_order\"):\n        print(f\"  3 trajectory {mode:<9} {trajectory(case, result, mode)}\")\n    for name, (used, budget, ok) in efficiency(result).items():\n        print(f\"  4 {name:<12} {used} of {budget}: {'ok' if ok else 'over budget'}\")\n\n\ndef show_modes(live: bool = False) -> None:\n    search, read = (\"search_peps\", {\"query\": \"GIL\"}), (\"read_pep_section\", {\"pep\": 703, \"section\": \"summary\"})\n    extra = (\"python_feature_version\", {\"feature\": \"f-strings\"})\n    case = {\"calls\": [search, read]}\n    for name, calls in {\"same calls\": [search, read], \"one extra call\": [search, extra, read], \"swapped order\": [read, search]}.items():\n        result = Result(\"\", calls, 0, 0)\n        print(f\"{name:<15}\" + \"  \".join(f\"{m} {trajectory(case, result, m)}\" for m in (\"exact\", \"subset\", \"any_order\")))",
          "expect": "case version: Which Python version added the walrus operator?\n  calls made: ['search_peps', 'python_feature_version']\n  1 answer correct:  True\n  2 tool accuracy:   1.00\n  3 trajectory exact     False\n  3 trajectory subset    True\n  3 trajectory any_order True\n  4 model_calls  3 of 3: ok\n  4 tool_calls   2 of 2: ok\n  4 tokens       389 of 300: over budget\n\nsame calls     exact True  subset True  any_order True\none extra call exact False  subset True  any_order True\nswapped order  exact False  subset False  any_order True"
        },
        {
          "kind": "p",
          "text": "Read the first output. The ReAct run searched first, then looked up the version. The case expects only the version call. The answer is right and the tool accuracy is full. The exact mode fails because of the extra search, and the subset and any-order modes pass."
        },
        {
          "kind": "p",
          "text": "The run is also over its token budget, 389 against 300. Three model calls each reread a growing history, so the extra search cost tokens as well as a call. Whether that search is a defect is your call, and section 7 comes back to it."
        },
        {
          "kind": "widget",
          "id": "agents21-trajectory-modes",
          "intro": "Score five runs against the same expected calls. For each, say which modes accept it. Watch the swapped order, and the run that took a shorter path."
        },
        {
          "kind": "quiz",
          "id": "agents21-q3",
          "question": "A run makes the two expected calls in the wrong order. Which trajectory modes accept it?",
          "options": [
            "Exact only.",
            "Exact and in-order subset.",
            "Any-order only.",
            "All three."
          ],
          "answer": 2,
          "explain": "Exact needs the same sequence and in-order subset needs the same order, so both fail. Any-order only asks that each expected call happened."
        },
        {
          "kind": "fold",
          "tone": "hood",
          "title": "Why `c in it` checks order",
          "text": "The in-order subset reuses one iterator over the calls made. Each `in` test advances the iterator past the match it finds. The next expected call can then only match something later. That gives a subsequence test in one line."
        },
        {
          "kind": "p",
          "text": "Words in an answer only go so far. The next section grades answers that need reading."
        }
      ]
    },
    {
      "id": "s4-judge",
      "title": "An LLM judge scores what a string check cannot, and it needs a check of its own",
      "goal": "When a string check can't grade an answer, what grades it, and what checks the grader?",
      "blocks": [
        {
          "kind": "p",
          "text": "The answer check looks for words. It can't tell a correct answer from one that happens to contain the right word. Some answers need reading. For those you use an **LLM judge**, a model that grades another model's output against a rubric. Course 1 called this LLM-as-judge."
        },
        {
          "kind": "p",
          "text": "Keep it apart from chapter 16's debate judge. The debate judge read two agents arguing and gave a verdict. An LLM judge reads one answer and scores it. Here it is one more model call. It reads the question, a reference answer and the answer, and returns a score with a reason."
        },
        {
          "kind": "p",
          "text": "An LLM judge is only as good as its rubric, the written grading rules from course 1. Anchor the ends: say what a five looks like and what a one looks like. Force a fixed reply, a dict with a `score` and a `reason`, and reject any reply that breaks the format. When you disagree, read the reason."
        },
        {
          "kind": "step",
          "id": "agents21-s5",
          "title": "Write the rubric, the LLM judge and its check",
          "text": "Append the rubric, the `judge` function and six answers a person has already marked. `agreement` runs the LLM judge on all six and counts how often it agrees with the person. The strict script scores like the person. The lenient script gives a 4 to wrong answers. Run it with `uv run --no-sync python -c \"from askpep.patterns.evals import show_judge; show_judge()\"`.",
          "lang": "python",
          "file": "src/askpep/patterns/evals.py",
          "code": "# --- an LLM judge with a written rubric, and a check on the judge ---\n\nRUBRIC = \"\"\"Score the answer from 1 to 5 against the reference.\n5: correct, complete, and says only what the reference supports.\n3: partly right, or right with a claim the reference does not support.\n1: wrong, invented, or does not answer the question.\nReply with JSON: {\"score\": <1 to 5>, \"reason\": \"<one sentence>\"}\"\"\"\nPASS_SCORE = 4\n\n\ndef judge(model, question: str, reference: str, answer: str) -> dict:\n    \"\"\"Ask the judge model for a score and a reason, and refuse a reply that breaks the format.\"\"\"\n    reply = model([\n        {\"role\": \"system\", \"content\": RUBRIC},\n        {\"role\": \"user\", \"content\": f\"Question: {question}\\nReference: {reference}\\nAnswer: {answer}\"},\n    ])\n    if not isinstance(reply.get(\"score\"), int) or not 1 <= reply[\"score\"] <= 5 or not reply.get(\"reason\"):\n        raise ValueError(f\"the judge broke its format: {reply}\")\n    return reply\n\n\n# (question, reference, answer, did a person pass it)\nLABELLED = [\n    (\"Which Python version added the walrus operator?\", \"Python 3.8, through PEP 572.\", \"Python 3.8, through PEP 572.\", True),\n    (\"Which Python version added the walrus operator?\", \"Python 3.8, through PEP 572.\", \"Python 3.10.\", False),\n    (\"What is PEP 703 about?\", \"It makes the GIL optional.\", \"It lets CPython build without the GIL, so threads run in parallel.\", True),\n    (\"What does PEP 8 say about line length?\", \"Lines are limited to 79 characters.\", \"PEP 8 is the style guide for Python code.\", False),\n    (\"What does PEP 999 say?\", \"The desk has no PEP 999.\", \"PEP 999 sets the release schedule.\", False),\n    (\"What is the capital of France?\", \"Refuse: the desk covers Python PEPs only.\", \"The desk answers questions about Python PEPs only.\", True),\n]\nSTRICT = [\n    {\"score\": 5, \"reason\": \"It matches the reference.\"},\n    {\"score\": 1, \"reason\": \"Wrong version.\"},\n    {\"score\": 5, \"reason\": \"Correct, and the extra detail is supported.\"},\n    {\"score\": 2, \"reason\": \"True, but it does not answer the question.\"},\n    {\"score\": 1, \"reason\": \"Invented a PEP the desk does not have.\"},\n    {\"score\": 5, \"reason\": \"A correct refusal.\"},\n]\nLENIENT = [\n    {\"score\": 5, \"reason\": \"Good.\"},\n    {\"score\": 2, \"reason\": \"Close, but wrong.\"},\n    {\"score\": 5, \"reason\": \"Good.\"},\n    {\"score\": 4, \"reason\": \"Relevant to the topic.\"},\n    {\"score\": 4, \"reason\": \"Sounds plausible.\"},\n    {\"score\": 5, \"reason\": \"Good.\"},\n]\n\n\ndef agreement(replies: list, live: bool = False) -> float:\n    \"\"\"Run the judge on the hand-labelled cases and return how often it agrees with the person.\"\"\"\n    model, hits = make_model(replies, live), 0\n    for question, reference, answer, human in LABELLED:\n        verdict = judge(model, question, reference, answer)\n        hits += (verdict[\"score\"] >= PASS_SCORE) == human\n        print(f\"  judge {verdict['score']}, person {'pass' if human else 'fail'}: {verdict['reason']}\")\n    return hits / len(LABELLED)\n\n\ndef show_judge(live: bool = False) -> None:\n    for name, replies in ((\"strict judge\", STRICT), (\"lenient judge\", LENIENT)):\n        print(f\"{name}\")\n        print(f\"  agreement with the person: {agreement(replies, live):.2f}\")",
          "expect": "strict judge\n  judge 5, person pass: It matches the reference.\n  judge 1, person fail: Wrong version.\n  judge 5, person pass: Correct, and the extra detail is supported.\n  judge 2, person fail: True, but it does not answer the question.\n  judge 1, person fail: Invented a PEP the desk does not have.\n  judge 5, person pass: A correct refusal.\n  agreement with the person: 1.00\nlenient judge\n  judge 5, person pass: Good.\n  judge 2, person fail: Close, but wrong.\n  judge 5, person pass: Good.\n  judge 4, person fail: Relevant to the topic.\n  judge 4, person fail: Sounds plausible.\n  judge 5, person pass: Good.\n  agreement with the person: 0.67"
        },
        {
          "kind": "p",
          "text": "The strict LLM judge agrees with the person on all six. The lenient one gave a 4 to a true but irrelevant answer. It gave another 4 to an invented PEP, so it agrees on four of six. Its passes would let both through. An LLM judge that was never checked is a guess with a number on it."
        },
        {
          "kind": "p",
          "text": "So an LLM judge needs its own check. Keep a handful of cases a person has marked. Measure agreement whenever you change the model or the rubric. Course 1 called this calibration. Keep a plain string check beside it where one exists, so the LLM judge is never your only signal."
        },
        {
          "kind": "widget",
          "id": "agents21-judge-audit",
          "intro": "Move the pass score and watch the agreement with the person. Find the setting that agrees on all six, then read what the verdict says about that fix."
        },
        {
          "kind": "quiz",
          "id": "agents21-q4",
          "question": "The LLM judge agrees with the person on four of six cases and passes two wrong answers. What do you change first?",
          "options": [
            "Raise the pass score to 5 and ship.",
            "Switch the LLM judge to a bigger model without checking again.",
            "Tighten the rubric so a wrong or invented answer cannot score a 4, then re-run the agreement check.",
            "Drop the LLM judge and trust the string check alone."
          ],
          "answer": 2,
          "explain": "A higher pass score hides the leniency and breaks again when scores shift. The rubric is the LLM judge's definition of correct. Fix it, then measure agreement on the same six cases."
        },
        {
          "kind": "fold",
          "tone": "trouble",
          "title": "An LLM judge can favour length or its own style",
          "text": "The model behind an LLM judge may prefer longer answers, or answers that sound like its own. Put short correct answers and long wrong ones in your labelled set, so agreement exposes the bias."
        },
        {
          "kind": "p",
          "text": "A checked LLM judge still grades one run. A model can answer differently on the next run, and the next section measures that."
        }
      ]
    },
    {
      "id": "s5-passk",
      "title": "Pass^k asks for success on every run, and an agent that acts alone needs it",
      "goal": "A model's reply changes from run to run, so how many runs of a case must pass?",
      "blocks": [
        {
          "kind": "p",
          "text": "A model does not return the same reply every time. A case that passes once may fail on the next run. So you repeat each case k times and ask a question about the k results. There are two natural questions, and they give very different numbers."
        },
        {
          "kind": "p",
          "text": "**pass@k** asks whether at least one of the k runs succeeded. **pass^k** asks whether all k succeeded. Say one run passes with probability p. Then pass@k is one minus the chance that every run fails. For pass^k, multiply p by itself k times. The first climbs with k and the second falls."
        },
        {
          "kind": "step",
          "id": "agents21-s6",
          "title": "Repeat two cases five times each",
          "text": "Append the repeat scripts and `show_repeats`. The version case has one bad run among five. The line length case passes all five. The function also prints both formulas for a run that passes eighty times in a hundred. Run it with `uv run --no-sync python -c \"from askpep.patterns.evals import show_repeats; show_repeats()\"`.",
          "lang": "python",
          "file": "src/askpep/patterns/evals.py",
          "code": "# --- pass@k against pass^k ---\n\nBAD_VERSION = [call(\"python_feature_version\", feature=\"walrus operator\"), say(\"Python 3.10 added the walrus operator.\")]\nREPEATS = {\n    \"version\": [REACT_SCRIPTS[\"version\"]] * 2 + [BAD_VERSION] + [REACT_SCRIPTS[\"version\"]] * 2,\n    \"line-length\": [REACT_SCRIPTS[\"line-length\"]] * 5,\n}\n\n\ndef show_repeats(live: bool = False) -> None:\n    for case in GOLDEN:\n        if case[\"id\"] not in REPEATS:\n            continue\n        passed = [answer_ok(case, run_react(case, replies, live)) for replies in REPEATS[case[\"id\"]]]\n        k = len(passed)\n        print(f\"{case['id']:<12} {sum(passed)} of {k} passed: pass@{k} {any(passed)}, pass^{k} {all(passed)}\")\n    p = 0.8\n    print(f\"if each run passes with chance {p}:\")\n    for k in (1, 3, 5, 10):\n        print(f\"  k={k:<2} pass@k {1 - (1 - p) ** k:.2f}, pass^k {p**k:.2f}\")",
          "expect": "version      4 of 5 passed: pass@5 True, pass^5 False\nline-length  5 of 5 passed: pass@5 True, pass^5 True\nif each run passes with chance 0.8:\n  k=1  pass@k 0.80, pass^k 0.80\n  k=3  pass@k 0.99, pass^k 0.51\n  k=5  pass@k 1.00, pass^k 0.33\n  k=10 pass@k 1.00, pass^k 0.11"
        },
        {
          "kind": "p",
          "text": "Read the table. At k of 5, one success in five is almost certain, and five in a row comes up only a third of the time. The same agent looks reliable or shaky depending on the question you ask."
        },
        {
          "kind": "p",
          "text": "Which question is right depends on who picks. If a person sees several attempts and takes the best, pass@k fits. A back-office agent acts on its own, and nobody chooses the lucky run. Each run is the one that happens, and a bad one may be a wrong action in production. Hold that agent to pass^k."
        },
        {
          "kind": "widget",
          "id": "agents21-pass-k",
          "intro": "Move both sliders and watch the two bars. Then choose the number you would hold an unattended agent to."
        },
        {
          "kind": "quiz",
          "id": "agents21-q5",
          "question": "An agent passes a case with probability 0.9 on each run. What is pass^3?",
          "options": [
            "About 0.73, which is 0.9 times itself three times.",
            "About 0.99, because one success in three is likely.",
            "0.9, because each run is independent.",
            "0.27, which is 0.9 divided by 3."
          ],
          "answer": 0,
          "explain": "Pass^3 needs three successes in a row, so it is 0.9 multiplied by 0.9 multiplied by 0.9, about 0.73. Pass@3 would be one minus 0.1 cubed, about 0.999."
        },
        {
          "kind": "fold",
          "tone": "industry",
          "title": "The cost of repeats",
          "text": "pass^k multiplies every evaluation by k. Keep the golden set small and run one repeat on every change. Run the full k on risky cases and before a release."
        },
        {
          "kind": "p",
          "text": "A score on its own blocks nothing. The next section makes the scores stop a bad change."
        }
      ]
    },
    {
      "id": "s6-gate",
      "title": "A regression gate makes scores block a bad change, and one set compares two agents",
      "goal": "How do scores stop a bad change, and what does the same set say about two agents?",
      "blocks": [
        {
          "kind": "p",
          "text": "Scores sit in a report until something acts on them. A **regression gate** is a check that fails the build when a score drops under its threshold. It runs on every change to the prompt, the tools or the model, and it holds one threshold for each metric. If any metric falls short, the change does not ship."
        },
        {
          "kind": "p",
          "text": "A bare failure is not enough. The regression gate must also say which case broke, because that case's label says what behaviour was lost. A report that says only that tools fell to 0.80 sends you hunting. A report that names the case sends you to the fix."
        },
        {
          "kind": "step",
          "id": "agents21-s7",
          "title": "Compare the agents, then run each through the regression gate",
          "text": "Append the thresholds, `gate`, the comparison, the regression gate's report and `main`. The thresholds are per metric. Efficiency has the lowest, because a slow right run costs less than a wrong one. Run the whole module. The last two sections of the output are shown here.",
          "lang": "python",
          "file": "src/askpep/patterns/evals.py",
          "code": "# --- compare two agents, then gate the change ---\n\nTHRESHOLDS = {\"answer\": 0.9, \"tools\": 0.9, \"subset\": 0.8, \"efficiency\": 0.6}\n\n\ndef gate(rows: list, thresholds: dict = THRESHOLDS) -> list:\n    \"\"\"Return one failure per metric under its threshold, with the cases that broke it.\"\"\"\n    r = rates(rows)\n    return [(m, r[m], t, [c[\"id\"] for c, _, s in rows if not s[m]]) for m, t in thresholds.items() if r[m] < t]\n\n\ndef show_compare(live: bool = False) -> None:\n    agents = {\"react\": evaluate(run_react, REACT_SCRIPTS, live), \"workflow\": evaluate(run_workflow, WORKFLOW_SCRIPTS, live)}\n    metrics = (\"answer\", \"tools\", \"exact\", \"subset\", \"efficiency\")\n    print(f\"{'case':<12}\" + \"\".join(f\"{m:<12}\" for m in metrics) + \"agent\")\n    for i, case in enumerate(GOLDEN):\n        for name, rows in agents.items():\n            scores = rows[i][2]\n            print(f\"{case['id']:<12}\" + \"\".join(f\"{'ok' if scores[m] else 'no':<12}\" for m in metrics) + name)\n    print()\n    for name, rows in agents.items():\n        r = rates(rows)\n        used = sum(res.model_calls for _, res, _ in rows), sum(res.tokens for _, res, _ in rows)\n        print(f\"{name:<9}\" + \"  \".join(f\"{m} {r[m]:.2f}\" for m in metrics) + f\"  | model calls {used[0]}, tokens {used[1]}\")\n\n\ndef show_gate(live: bool = False) -> bool:\n    ok = True\n    for name, agent, scripts in ((\"react\", run_react, REACT_SCRIPTS), (\"workflow\", run_workflow, WORKFLOW_SCRIPTS), (\"react, fixed\", run_react, REACT_FIXED)):\n        failures = gate(evaluate(agent, scripts, live))\n        ok = ok and not failures\n        print(f\"{name}: {'PASS' if not failures else 'FAIL'}\")\n        for metric, value, threshold, cases in failures:\n            print(f\"  {metric} {value:.2f} is under {threshold:.2f}; broke on: {', '.join(cases)}\")\n    print(f\"one case moves a rate by {1 / len(GOLDEN):.2f}, so a set of {len(GOLDEN)} cases cannot tell a 0.80 from a 0.60\")\n    return ok\n\n\ndef main(live: bool = False) -> bool:\n    sections = ((\"one run, four levels\", show_levels), (\"three trajectory modes\", show_modes), (\"the judge\", show_judge), (\"repeated runs\", show_repeats), (\"two agents, one set\", show_compare), (\"the gate\", show_gate))\n    ok = True\n    for title, fn in sections:\n        print(f\"== {title} ==\")\n        result = fn(live)\n        ok = ok and result is not False\n        print()\n    return ok\n\n\nif __name__ == \"__main__\":\n    passed = main(live=\"--live\" in sys.argv)\n    sys.exit(0 if passed or \"--gate\" not in sys.argv else 1)",
          "expect": "== two agents, one set ==\ncase        answer      tools       exact       subset      efficiency  agent\nversion     ok          ok          no          ok          no          react\nversion     ok          ok          ok          ok          ok          workflow\nsummary     ok          ok          ok          ok          no          react\nsummary     ok          ok          ok          ok          ok          workflow\nline-length ok          ok          ok          ok          ok          react\nline-length no          no          no          no          ok          workflow\noff-topic   ok          ok          ok          ok          ok          react\noff-topic   ok          ok          ok          ok          ok          workflow\nunknown-pep no          no          no          no          ok          react\nunknown-pep ok          ok          ok          ok          ok          workflow\n\nreact    answer 0.80  tools 0.80  exact 0.60  subset 0.80  efficiency 0.60  | model calls 11, tokens 1256\nworkflow answer 0.80  tools 0.80  exact 0.80  subset 0.80  efficiency 1.00  | model calls 11, tokens 384\n\n== the gate ==\nreact: FAIL\n  answer 0.80 is under 0.90; broke on: unknown-pep\n  tools 0.80 is under 0.90; broke on: unknown-pep\nworkflow: FAIL\n  answer 0.80 is under 0.90; broke on: line-length\n  tools 0.80 is under 0.90; broke on: line-length\nreact, fixed: PASS\none case moves a rate by 0.20, so a set of 5 cases cannot tell a 0.80 from a 0.60"
        },
        {
          "kind": "p",
          "text": "Read the comparison. Each agent fails one case. ReAct fails the unknown PEP, where it read a PEP that does not exist and made one up. The workflow fails the line length case, where it never read the section. ReAct also spent 1,256 rough tokens to the workflow's 384."
        },
        {
          "kind": "p",
          "text": "Read the regression gate. Both agents fail the answer and tools thresholds, and the report names the case each time. The third result is `REACT_FIXED`, which stands in for a fixed prompt. Its unknown PEP script searches, finds nothing and says so, and it passes."
        },
        {
          "kind": "p",
          "text": "Run the module with `--gate` and it exits with code 1 when any agent fails. A build server reads that code and stops the change. The last printed line is a warning about the set itself."
        },
        {
          "kind": "quiz",
          "id": "agents21-q6",
          "question": "The regression gate fails with `tools 0.80 is under 0.90; broke on: unknown-pep`. What is the most useful next step?",
          "options": [
            "Lower the tools threshold to 0.80.",
            "Open the unknown-pep run, read its trajectory, and fix the cause.",
            "Add four easy cases so the rate rises.",
            "Re-run until it passes."
          ],
          "answer": 1,
          "explain": "The report points to the case. The trajectory shows what the agent did wrong. Lowering the threshold or padding the set hides the regression instead of removing it."
        },
        {
          "kind": "p",
          "text": "That warning is the first of three ways a good score can mislead. The next section names all three."
        }
      ]
    },
    {
      "id": "s7-breaks",
      "title": "Evals mislead when the set is small, the LLM judge is lenient or the path is rigid",
      "goal": "How do good scores lie, and how do you explain the whole method in an interview?",
      "blocks": [
        {
          "kind": "p",
          "text": "Three failures account for most bad eval results. Each one looks like a good score."
        },
        {
          "kind": "list",
          "items": [
            "The golden set is too small. With five cases, one case moves a rate by 0.20, so 0.80 and 0.60 are one case apart. Report the count beside every rate, and add a case each time a real failure shows up.",
            "The LLM judge is too lenient. It passes wrong answers, so the score rises while quality falls. Measure its agreement with hand-labelled cases, anchor the rubric, and keep a string check beside it.",
            "The trajectory check punishes a valid path. The exact mode failed the ReAct run on the walrus question, though its extra search did no harm. Use the loosest mode that still catches the failure, and score the outcome where the path is open."
          ]
        },
        {
          "kind": "p",
          "text": "Keep the strict modes for steps that must happen. A refund must pass a policy check before it is paid. That order is a rule, so the subset mode should enforce it. A search before a lookup is a choice, so the answer and the budget are the better test."
        },
        {
          "kind": "p",
          "text": "Frameworks package the same steps. A dataset runner runs your agent on each case of a golden set. It applies your checks to the output and the trace, and stores one record per run. Your `evaluate` is that runner, and your `Spy` keeps a small trace."
        },
        {
          "kind": "code",
          "lang": "python",
          "caption": "The shape of a dataset runner. The names differ by library.",
          "code": "for case in dataset:                      # the golden set\n    with trace() as t:                    # records every model and tool call\n        output = agent(case[\"question\"])\n    scores = [check(case, output, t) for check in checks]\n    store(case[\"id\"], t, scores)          # one record per run, linked to its trace"
        },
        {
          "kind": "p",
          "text": "Interviewers ask how you would test an agent, often as a follow-up to a design question. The answer below covers the method in about thirty seconds."
        },
        {
          "kind": "callout",
          "tone": "interview",
          "title": "The 30-second answer",
          "text": "I test an agent on its path as well as its answer. I keep a small golden set where each case has the expected answer, the expected tool calls and a behaviour label. I check four levels: final answer, tool-call accuracy, trajectory match and efficiency against a budget. For fuzzy answers I use an LLM judge with a written rubric, and I check it against hand-labelled cases. I repeat each case and hold an autonomous agent to pass^k, not pass@k. A regression gate with thresholds runs on every change and names the case that broke."
        },
        {
          "kind": "quiz",
          "id": "agents21-q7",
          "question": "Your trajectory check fails a run that reached the right answer by a shorter valid path. What is the best fix?",
          "options": [
            "Make the check stricter so the agent copies the expected path.",
            "Loosen the mode, or list the shorter path as a second accepted trajectory.",
            "Delete the trajectory check.",
            "Ask the LLM judge to ignore the path."
          ],
          "answer": 1,
          "explain": "A rigid check punishes a good run and teaches the team to ignore failures. Accept the valid path, or score only the outcome and keep strict order for steps that must happen."
        },
        {
          "kind": "fold",
          "tone": "industry",
          "title": "Dataset runners and traces in frameworks",
          "text": "Most agent frameworks ship a way to trace a run and a way to score a dataset against it. You supply the checks you built here. Learn the pieces by hand first, and a library is a faster way to run them."
        },
        {
          "kind": "p",
          "text": "Every check here asks whether the agent did its job. None asks what the agent could do if a tool result told it to do something else. A passing agent can still be tricked, so what may it touch? Chapter 22 answers that."
        }
      ]
    }
  ],
  "lab": {
    "title": "Change the set and watch the scores move",
    "goal": "Run the module, then change one thing at a time and predict the score before you look. Every step runs offline. Compare your file with `capstone/src/askpep/patterns/evals.py` in the my-learn folder.",
    "minutes": 25,
    "files": [
      "src/askpep/patterns/evals.py"
    ],
    "steps": [
      {
        "title": "Run it unchanged",
        "text": "Run the module and compare all six sections with the output in the chapter.",
        "code": "uv run --no-sync python -m askpep.patterns.evals"
      },
      {
        "title": "Add a sixth case",
        "text": "Add a sixth case to `GOLDEN`: id `fstrings`, label `picks the one right tool`, the question `Which Python version added f-strings?`, `answer_has` of `[\"3.6\"]` and `calls` of `[(\"python_feature_version\", {\"feature\": \"f-strings\"})]`. Add `\"fstrings\": [call(\"python_feature_version\", feature=\"f-strings\"), say(\"Python 3.6 added f-strings.\")]` to `REACT_SCRIPTS`. Add `\"fstrings\": [{\"route\": \"version\"}, say(\"Python 3.6 added f-strings.\")]` to `WORKFLOW_SCRIPTS`. `REACT_FIXED` copies `REACT_SCRIPTS`, so it needs no entry. Predict the new rates, then run the module. Both agents now score 0.83 on the answer, and one case moves a rate by 0.17. Take the case out again before the next step, so its counts match.",
        "code": "uv run --no-sync python -m askpep.patterns.evals"
      },
      {
        "title": "Tighten the budget",
        "text": "Set the `tokens` budget to 100 and run it. Predict which agent fails efficiency on more cases, and whether the regression gate now fails the fixed ReAct run. The ReAct agent fails efficiency on four cases and the workflow on two, and `react, fixed` now prints FAIL. Then set it back to 300.",
        "code": "uv run --no-sync python -m askpep.patterns.evals"
      },
      {
        "title": "Break the LLM judge",
        "text": "Change the first reply in `STRICT` to a score of 7. Run `show_judge`. Predict which function raises, and read the message. It is `judge`, with a `ValueError` that begins `the judge broke its format`. The header `strict judge` prints, then the traceback. Then restore the reply.",
        "code": "uv run --no-sync python -c \"from askpep.patterns.evals import show_judge; show_judge()\""
      },
      {
        "title": "Make the agent flaky",
        "text": "In `REPEATS`, replace one of the five line length scripts with `BAD_VERSION`. Predict pass@5 and pass^5, then run `show_repeats`. The line length case now reads 4 of 5 passed, pass@5 True and pass^5 False.",
        "code": "uv run --no-sync python -c \"from askpep.patterns.evals import show_repeats; show_repeats()\""
      },
      {
        "title": "Read the exit code",
        "text": "Run the module with `--gate` and print the exit code. It should be 1, because the ReAct agent and the workflow both fail the regression gate. Lower the `answer` and `tools` thresholds to 0.8 and run it again. The exit code becomes 0.",
        "code": "uv run --no-sync python -m askpep.patterns.evals --gate > /dev/null; echo $?"
      }
    ],
    "verify": "uv run --no-sync python -m askpep.patterns.evals"
  },
  "recap": [
    "An agent is tested on its path as well as its answer, because a wrong path can still land on a right answer.",
    "Each golden case holds the question, the answer words, the expected calls and a label that names the behaviour.",
    "Four checks catch four failures: the answer, the tool calls, the trajectory and the budget.",
    "An LLM judge needs a written rubric and a check against hand-labelled cases, or it passes wrong answers.",
    "pass^k needs success on every run, and an agent that acts alone should be held to it.",
    "A regression gate sets a threshold for each metric and names the case that broke.",
    "A small set, a lenient LLM judge and a rigid path check each make a weak agent look good."
  ],
  "reinforcement": "I am becoming a forward-deployed AI engineer. In evaluating agents I learned that an agent is tested on its path as well as its answer: a golden set, checks on the answer, calls, trajectory and budget, an LLM judge that is itself checked, pass^k for agents that act alone, and a regression gate that names the case that broke. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  "interviewIds": [
    "agents-c21-q01",
    "agents-c21-q02",
    "agents-c21-q03"
  ]
};

export default chapter;
