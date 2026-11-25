import type { Chapter } from "../types";

const chapter: Chapter = {
  "id": "agents-14-reflection",
  "course": "agents",
  "number": 14,
  "title": "Reflection pairs a writer with a critic until the critic passes it",
  "tagline": "How do I get a better answer by having a second call check the first?",
  "minutes": 60,
  "objectives": [
    "Say what reflection adds to one model call, and how it differs from chapters 11 to 13.",
    "Name the four parts of a reflection loop and who owns each.",
    "Write a loop that stops on a pass or at a round cap.",
    "Catch, with a grounded check, the wrong PEP that a self-refine critic passes.",
    "Carry lessons forward with Reflexion, and end an endless critic with the cap.",
    "Name four failures, price the rounds and say when reflection pays.",
    "Give the 30-second answer, and map the loop onto LangGraph."
  ],
  "sections": [
    {
      "id": "s1-problem",
      "title": "One model call can cite the wrong PEP, and nothing in that call checks it",
      "goal": "Why does one model call need a second look, and what does reflection add?",
      "blocks": [
        {
          "kind": "p",
          "text": "Chapter 13 ended on a question. How do I improve an answer the model has already given? This chapter answers a sharper version. How do I get a better answer by having a second call check the first?"
        },
        {
          "kind": "p",
          "text": "Start with the failure. Ask the PEP desk which PEP added the walrus operator. A model can cite PEP 527 fluently, when the answer is PEP 572. Nothing in a single model call checks it."
        },
        {
          "kind": "p",
          "text": "**Reflection** adds a second look. A writer drafts, a critic reviews and the writer revises until the critic passes it. The writer has chapter 1's job, which is to write the reply. Here it drafts for a critic, and revises when the critic finds problems."
        },
        {
          "kind": "p",
          "text": "The critic is a second model call with its own prompt. It reads the draft and returns a verdict: pass, or fail with a list of issues. One draft and one review make a round. Code ends the loop on a pass or after a fixed number of rounds."
        },
        {
          "kind": "p",
          "text": "Chapters 11 to 13 were about choosing the next step. Reflection's steps never change: write, review, revise. It loops on the quality of one answer, and asks whether that answer is good enough to ship."
        },
        {
          "kind": "quiz",
          "id": "agents14-q1",
          "question": "In a reflection loop, what does the critic return?",
          "options": [
            "The next tool to call.",
            "A verdict, such as a pass flag and a list of issues, which code reads.",
            "A rewritten answer that replaces the draft.",
            "A new plan for the writer to follow."
          ],
          "answer": 1,
          "explain": "The critic labels the draft. It does not rewrite it. Code reads the verdict, decides whether to stop, and hands the issues back to the writer."
        },
        {
          "kind": "p",
          "text": "Those are the parts in outline. The next section says what each part may do, and who owns it."
        }
      ]
    },
    {
      "id": "s2-how",
      "title": "Code runs the loop, and each model call has one narrow job",
      "goal": "What are the parts of a reflection loop, and who owns each one?",
      "blocks": [
        {
          "kind": "p",
          "text": "The writer and the critic are model calls. The other two parts are code. A grounded check settles a fact by calling a tool instead of asking a model. The loop runs the rounds."
        },
        {
          "kind": "compare",
          "caption": "The parts of a reflection loop, and who owns each",
          "columns": [
            "Part",
            "What it does",
            "Who owns it",
            "What it must not do"
          ],
          "rows": [
            [
              "Writer",
              "Drafts the answer, then revises it with the issues",
              "A model call",
              "Review its own draft or end the loop"
            ],
            [
              "Critic",
              "Reads the draft and returns a verdict",
              "A model call with its own prompt",
              "Rewrite the draft"
            ],
            [
              "Grounded check",
              "Looks up facts the critic can't know, such as whether a PEP exists",
              "Code that calls a tool",
              "Rate style or tone"
            ],
            [
              "Loop",
              "Runs the rounds, adds the check's issues and enforces the cap",
              "Code",
              "Leave the stop rule to a model"
            ]
          ]
        },
        {
          "kind": "p",
          "text": "The state is small. It holds the question, the draft so far, the critic's issues and a round counter. The writer owns the draft. Code owns the counter and the stop rule."
        },
        {
          "kind": "p",
          "text": "This matches chapter 10's table, where reflection is the row in which code alternates a draft call and a review call. The verdict also works like chapter 12's decision point. The critic picks pass or fail, and code routes on it."
        },
        {
          "kind": "callout",
          "tone": "insight",
          "title": "Reflection loops on one output, and its steps stay fixed",
          "text": "In ReAct the model picks each step and decides when to stop. In plan-and-execute the model writes the steps. In reflection the steps are fixed: write, review, revise. Only the number of rounds varies, and code caps it."
        },
        {
          "kind": "quiz",
          "id": "agents14-q2",
          "question": "Who should decide that a reflection loop is over?",
          "options": [
            "The writer, when it feels done.",
            "Code, on a critic pass or on reaching the round cap.",
            "The critic alone, with no cap.",
            "The user, after reading every draft."
          ],
          "answer": 1,
          "explain": "Code owns the stop rule. A critic that decides alone can keep a loop running for ever, so the cap is the guarantee. You met the same rule in chapter 6, where a budget ends a run."
        },
        {
          "kind": "p",
          "text": "That is the design on paper. The next section writes it as one Python function."
        }
      ]
    },
    {
      "id": "s3-loop",
      "title": "The loop is one Python function that stops on a pass or at the cap",
      "goal": "What does the loop look like in code, and where does each part live?",
      "blocks": [
        {
          "kind": "p",
          "text": "Work in your AskPEP repository, in `src/askpep/patterns/`. The reference copy is `capstone/src/askpep/patterns/reflect.py` in the my-learn folder. Your file should match it. Everything runs on the kit from chapter 10, so it needs no network."
        },
        {
          "kind": "step",
          "id": "agents14-s1",
          "title": "Write the prompts, the call counter and the grounded check",
          "text": "Start `reflect.py`. The critic prompt asks for a verdict dict and forbids a rewrite. `Both` adds up the writer's and the critic's calls, counting a shared model once. `check_citations` is the grounded check. It calls `read_pep_section` for each cited PEP and reports any that return a `ToolError`.",
          "lang": "python",
          "file": "src/askpep/patterns/reflect.py",
          "code": "\"\"\"Reflection: a writer drafts, a critic returns a verdict, and the writer revises until a pass.\n\nStandard library only. Run it offline with: python -m askpep.patterns.reflect\n\"\"\"\n\nimport json\nimport re\nimport sys\n\nfrom askpep.patterns.kit import Run, fake_pep_tools, make_model, trace\n\nWRITER_PROMPT = \"You answer questions about PEPs. Cite the PEP number and the Python version.\"\nCRITIC_PROMPT = 'You review a draft answer. Reply with {\"pass\": true or false, \"issues\": [short strings]}. Do not rewrite it.'\n\n\nclass Both:\n    \"\"\"Adds up the calls and tokens of the writer and the critic, counting a shared model once.\"\"\"\n\n    def __init__(self, *models):\n        self.models = list({id(m): m for m in models}.values())\n\n    @property\n    def n_calls(self) -> int:\n        return sum(m.n_calls for m in self.models)\n\n    @property\n    def tokens(self) -> int:\n        return sum(m.tokens for m in self.models)\n\n\ndef check_citations(draft: str, tools) -> list[str]:\n    \"\"\"Code checks what a critic cannot see: does every cited PEP exist on the desk?\"\"\"\n    cited = sorted({int(n) for n in re.findall(r\"PEP (\\d+)\", draft)})\n    return [\n        f\"PEP {n} is not on the desk\"\n        for n in cited\n        if str(tools.call(\"read_pep_section\", {\"pep\": n, \"section\": \"title\"})).startswith(\"ToolError\")\n    ]"
        },
        {
          "kind": "step",
          "id": "agents14-s2",
          "title": "Write the loop",
          "text": "Append `reflect`. Each round, the writer drafts, the critic returns a verdict and the check adds its issues. A pass needs a critic pass and no issues. On a fail, the loop saves a lesson to `memory`, keeps the last three and sends the issues back. After `max_rounds`, it returns the last draft marked as gave up.",
          "lang": "python",
          "file": "src/askpep/patterns/reflect.py",
          "code": "def reflect(question, writer, critic, check=None, max_rounds=3, memory=None) -> Run:\n    \"\"\"Draft, review, revise. Stops on a pass or after max_rounds, and keeps the last draft either way.\"\"\"\n    memory = memory if memory is not None else []\n    lessons = \"\".join(f\"\\nLesson: {m}\" for m in memory)\n    messages = [\n        {\"role\": \"system\", \"content\": WRITER_PROMPT + lessons},\n        {\"role\": \"user\", \"content\": question},\n    ]\n    run = Run(question, model=Both(writer, critic))\n    for round_no in range(1, max_rounds + 1):\n        draft = writer(messages)[\"answer\"]\n        run.add(\"draft\", f\"round {round_no}: {draft}\")\n        messages.append({\"role\": \"assistant\", \"content\": draft})\n        verdict = critic(\n            [\n                {\"role\": \"system\", \"content\": CRITIC_PROMPT},\n                {\"role\": \"user\", \"content\": f\"Question: {question}\\nDraft: {draft}\"},\n            ]\n        )\n        run.add(\"critic\", json.dumps(verdict))\n        issues = list(verdict[\"issues\"])\n        found = check(draft) if check else []\n        if found:\n            run.add(\"check\", \"; \".join(found))\n            issues += found\n        if verdict[\"pass\"] and not issues:\n            run.answer = draft\n            run.add(\"answer\", draft)\n            return run\n        memory.append(f\"A draft failed review: {issues[0]}. Check it before you cite it.\")\n        del memory[:-3]\n        messages.append({\"role\": \"user\", \"content\": \"Revise the draft. Fix: \" + \"; \".join(issues)})\n    run.answer = draft\n    run.add(\"answer\", f\"gave up after {max_rounds} rounds: {draft}\")\n    return run"
        },
        {
          "kind": "p",
          "text": "`max_rounds` is the round cap, the most rounds code allows. It is a budget, from chapter 6, counted in rounds."
        },
        {
          "kind": "p",
          "text": "Note three more details. The verdict is a plain dict, so a test can build one by hand. The check runs in code, after the critic. The memory list is an argument that a caller can share across questions."
        },
        {
          "kind": "fold",
          "tone": "hood",
          "title": "Why the verdict is a dict instead of a sentence",
          "text": "If the critic wrote prose, code would have to parse it, and a polite sentence such as looks fine could mean pass or fail. A dict with a boolean makes the stop rule a plain if statement. The issues list is the only free text, and it goes straight back to the writer."
        },
        {
          "kind": "p",
          "text": "The next section runs the loop twice: once with a critic that shares the writer's blind spot, once with a grounded check."
        }
      ]
    },
    {
      "id": "s4-grounded",
      "title": "A grounded check catches the wrong PEP that the critic waved through",
      "goal": "Why does a critic pass the wrong PEP, and what catches it?",
      "blocks": [
        {
          "kind": "p",
          "text": "First, the failure. In **self-refine**, one model writes the draft and then reviews it. Append a demo where the same scripted model plays both roles. Its draft cites PEP 527, and its review passes it."
        },
        {
          "kind": "step",
          "id": "agents14-s3",
          "title": "Write the self-refine demo",
          "text": "Append the constants and `demo_self`. The same model object is both writer and critic. The script gives it a wrong draft, then a pass.",
          "lang": "python",
          "file": "src/askpep/patterns/reflect.py",
          "code": "QUESTION = \"Which PEP added the walrus operator, and in which Python version?\"\nWRONG = {\"answer\": \"PEP 527 added the walrus operator in Python 3.8.\"}\nRIGHT = {\"answer\": \"PEP 572 added the walrus operator in Python 3.8.\"}\nPASS = {\"pass\": True, \"issues\": []}\n\n\ndef demo_self(live: bool = False) -> Run:\n    \"\"\"One model writes and reviews. The same blind spot sits on both sides.\"\"\"\n    model = make_model([WRONG, PASS], live)\n    return reflect(QUESTION, model, model)"
        },
        {
          "kind": "step",
          "id": "agents14-s4",
          "title": "Run it",
          "text": "Run the demo with the trace printer. Two model calls make one round, and the wrong number ships.",
          "lang": "bash",
          "code": "uv run --no-sync python -c \"from askpep.patterns.kit import trace; from askpep.patterns.reflect import demo_self; trace(demo_self())\"",
          "expect": "Q: Which PEP added the walrus operator, and in which Python version?\n 1. draft   round 1: PEP 527 added the walrus operator in Python 3.8.\n 2. critic  {\"pass\": true, \"issues\": []}\n 3. answer  PEP 527 added the walrus operator in Python 3.8.\nmodel calls: 2, rough tokens: 152"
        },
        {
          "kind": "p",
          "text": "A real model fails this way for a real reason. The belief that produced the number is the belief that reviews it. Self-refine is cheap and helps with clarity and format, but it adds no knowledge the writer lacked."
        },
        {
          "kind": "p",
          "text": "A **separate critic** has its own prompt and its own job: review the draft, return a verdict and never rewrite. A different model is better still, because its blind spots differ. But a critic with no evidence can still pass a confident error. So add the grounded check."
        },
        {
          "kind": "step",
          "id": "agents14-s5",
          "title": "Write the grounded demo",
          "text": "Append `demo_grounded`. The writer and the critic are separate models. The critic still waves the first draft through. The check calls the tool and finds that PEP 527 is not on the desk.",
          "lang": "python",
          "file": "src/askpep/patterns/reflect.py",
          "code": "def demo_grounded(live: bool = False, memory=None) -> Run:\n    \"\"\"A separate critic, plus a code check that looks the PEP number up.\"\"\"\n    writer = make_model([WRONG, RIGHT], live)\n    critic = make_model([PASS, PASS], live)\n    tools = fake_pep_tools()\n    return reflect(QUESTION, writer, critic, check=lambda d: check_citations(d, tools), memory=memory)"
        },
        {
          "kind": "step",
          "id": "agents14-s6",
          "title": "Run it and read the check line",
          "text": "Run the grounded demo. Line 2 is the critic's pass, and line 3 is the check overriding it. Line 4 revises, and line 6 ships the right PEP, for four model calls instead of two.",
          "lang": "bash",
          "code": "uv run --no-sync python -c \"from askpep.patterns.kit import trace; from askpep.patterns.reflect import demo_grounded; trace(demo_grounded())\"",
          "expect": "Q: Which PEP added the walrus operator, and in which Python version?\n 1. draft   round 1: PEP 527 added the walrus operator in Python 3.8.\n 2. critic  {\"pass\": true, \"issues\": []}\n 3. check   PEP 527 is not on the desk\n 4. draft   round 2: PEP 572 added the walrus operator in Python 3.8.\n 5. critic  {\"pass\": true, \"issues\": []}\n 6. answer  PEP 572 added the walrus operator in Python 3.8.\nmodel calls: 4, rough tokens: 346"
        },
        {
          "kind": "p",
          "text": "The check proves less than it seems. The kit holds only PEPs 8, 572 and 703. The real index has a PEP 527, about file types on the Python Package Index, so a check against it would pass. A stronger check reads the PEP and looks for the feature."
        },
        {
          "kind": "widget",
          "id": "agents14-who-catches",
          "intro": "Six drafts, each with one flaw. Decide for each whether the critic can catch it or only a grounded check can. Predict before you check. Watch the PEP that exists but is the wrong one."
        },
        {
          "kind": "quiz",
          "id": "agents14-q3",
          "question": "The critic returns pass, and the grounded check finds a PEP number that is not on the desk. What should the loop do?",
          "options": [
            "Ship the draft, because the critic passed it.",
            "Treat the draft as failed, add the check's issue and revise.",
            "Ask the critic to run again until it agrees with the check.",
            "Ignore the check, because only a model can review an answer."
          ],
          "answer": 1,
          "explain": "A pass needs a critic pass and no issues from the check. A lookup is certain where a critic is not, so the check wins. Running the critic again only gives the same blind spot another chance."
        },
        {
          "kind": "p",
          "text": "The grounded demo fixed its error in one revision. The next section keeps that lesson for later questions, and shows what ends a critic that never passes."
        }
      ]
    },
    {
      "id": "s5-memory",
      "title": "Reflexion carries lessons forward, and the round cap ends an endless critic",
      "goal": "How does a failed draft help the next question, and what stops a critic that never passes?",
      "blocks": [
        {
          "kind": "p",
          "text": "**Reflexion** is reflection with a memory. After a failed attempt, the system writes a short lesson and keeps it. The next attempt starts with those lessons in its prompt. `reflect` already does this: it appends a lesson on every fail and keeps the last three."
        },
        {
          "kind": "step",
          "id": "agents14-s7",
          "title": "Write the Reflexion demo",
          "text": "Append `demo_reflexion`. It runs the grounded demo once with a shared `memory` list. Then it asks a second question with the same list, and checks that the lesson reached the writer's prompt.",
          "lang": "python",
          "file": "src/askpep/patterns/reflect.py",
          "code": "def demo_reflexion() -> None:\n    \"\"\"Reflexion: a failed attempt leaves a lesson, and the next question starts with it.\"\"\"\n    memory: list[str] = []\n    demo_grounded(memory=memory)\n    print(\"memory:\", memory)\n    writer = make_model([{\"answer\": \"PEP 8 limits lines to 79 characters.\"}])\n    critic = make_model([PASS])\n    reflect(\"What is the line length limit in PEP 8?\", writer, critic, memory=memory)\n    print(\"lesson in next prompt:\", \"Lesson:\" in writer.calls[0][0][0][\"content\"])"
        },
        {
          "kind": "step",
          "id": "agents14-s8",
          "title": "Run it",
          "text": "The memory holds one lesson from the failed draft, and the second question's prompt starts with it.",
          "lang": "bash",
          "code": "uv run --no-sync python -c \"from askpep.patterns.reflect import demo_reflexion; demo_reflexion()\"",
          "expect": "memory: ['A draft failed review: PEP 527 is not on the desk. Check it before you cite it.']\nlesson in next prompt: True"
        },
        {
          "kind": "p",
          "text": "Keep the memory short. A long list costs tokens on every call and teaches the writer to chase old problems. Three lessons is a sensible limit. Clear the list when the task type changes."
        },
        {
          "kind": "step",
          "id": "agents14-s9",
          "title": "Add the endless critic and the entry point",
          "text": "Now the opposite failure. Append `demo_cap`, where a nitpicking critic fails every draft, and the `__main__` block. Only the round cap can end this loop. The last trace shows it stop after six model calls with no pass.",
          "lang": "python",
          "file": "src/askpep/patterns/reflect.py",
          "code": "def demo_cap() -> Run:\n    \"\"\"A critic that never passes. Only the round cap ends the loop.\"\"\"\n    nit = {\"pass\": False, \"issues\": [\"Add more detail.\"]}\n    writer = make_model([RIGHT, RIGHT, RIGHT])\n    critic = make_model([nit, nit, nit])\n    return reflect(QUESTION, writer, critic)\n\n\nif __name__ == \"__main__\":\n    if \"--live\" in sys.argv:\n        trace(demo_grounded(live=True))\n        raise SystemExit\n    print(\"1. One model reviews itself\")\n    trace(demo_self())\n    print(\"\\n2. A separate critic and a code check\")\n    trace(demo_grounded())\n    print(\"\\n3. Reflexion memory\")\n    demo_reflexion()\n    print(\"\\n4. A critic that never passes\")\n    trace(demo_cap())"
        },
        {
          "kind": "step",
          "id": "agents14-s10",
          "title": "Run the module",
          "text": "Run the whole module and compare all four traces. The model calls must match: two, four, then the memory lines, then six.",
          "lang": "bash",
          "code": "uv run --no-sync python -m askpep.patterns.reflect",
          "expect": "1. One model reviews itself\nQ: Which PEP added the walrus operator, and in which Python version?\n 1. draft   round 1: PEP 527 added the walrus operator in Python 3.8.\n 2. critic  {\"pass\": true, \"issues\": []}\n 3. answer  PEP 527 added the walrus operator in Python 3.8.\nmodel calls: 2, rough tokens: 152\n\n2. A separate critic and a code check\nQ: Which PEP added the walrus operator, and in which Python version?\n 1. draft   round 1: PEP 527 added the walrus operator in Python 3.8.\n 2. critic  {\"pass\": true, \"issues\": []}\n 3. check   PEP 527 is not on the desk\n 4. draft   round 2: PEP 572 added the walrus operator in Python 3.8.\n 5. critic  {\"pass\": true, \"issues\": []}\n 6. answer  PEP 572 added the walrus operator in Python 3.8.\nmodel calls: 4, rough tokens: 346\n\n3. Reflexion memory\nmemory: ['A draft failed review: PEP 527 is not on the desk. Check it before you cite it.']\nlesson in next prompt: True\n\n4. A critic that never passes\nQ: Which PEP added the walrus operator, and in which Python version?\n 1. draft   round 1: PEP 572 added the walrus operator in Python 3.8.\n 2. critic  {\"pass\": false, \"issues\": [\"Add more detail.\"]}\n 3. draft   round 2: PEP 572 added the walrus operator in Python 3.8.\n 4. critic  {\"pass\": false, \"issues\": [\"Add more detail.\"]}\n 5. draft   round 3: PEP 572 added the walrus operator in Python 3.8.\n 6. critic  {\"pass\": false, \"issues\": [\"Add more detail.\"]}\n 7. answer  gave up after 3 rounds: PEP 572 added the walrus operator in Python 3.8.\nmodel calls: 6, rough tokens: 586"
        },
        {
          "kind": "quiz",
          "id": "agents14-q4",
          "question": "A critic always fails the draft with the issue Add more detail. What ends the loop?",
          "options": [
            "The writer gives up on its own.",
            "The round cap, and the run returns the last draft marked as gave up.",
            "The critic eventually runs out of issues.",
            "The scripted model repeats its last reply forever."
          ],
          "answer": 1,
          "explain": "Only the cap ends it. Without the cap the loop would run until a budget stopped it, as chapter 6 shows. The last draft is still returned, so a person or a fallback can use it."
        },
        {
          "kind": "p",
          "text": "The demos showed the loop working and failing. The next section names the failures you'll meet in production, and what each round costs."
        }
      ]
    },
    {
      "id": "s6-breaks",
      "title": "Four failures break reflection loops, and each one has a guard",
      "goal": "How does a reflection loop fail, what does a round cost, and when does reflection pay?",
      "blocks": [
        {
          "kind": "list",
          "ordered": true,
          "items": [
            "A sycophantic critic agrees with whatever it reads, so it passes everything. The loop doubles the cost and adds nothing. Guard it by testing the critic on drafts with known flaws, and by checking facts in code.",
            "A nitpicking critic never passes. The guard is a round cap of two or three. The gave-up draft then waits in a review queue, as in chapter 12, or goes to a fallback.",
            "Cost grows faster than the rounds. Each round is at least two model calls, and the writer rereads a longer history. The guard is the cap, plus an early stop when a round fixes nothing.",
            "A style-only critic praises the prose and misses the facts. The guard is a critic prompt built around claims and sources, with grounded checks for facts."
          ]
        },
        {
          "kind": "widget",
          "id": "agents14-round-cost",
          "intro": "Move the slider to the number of rounds before the critic passes. Read the calls and tokens against one plain draft. Then read the verdict, and decide where you would set the cap."
        },
        {
          "kind": "fold",
          "tone": "industry",
          "title": "Reflection goes by other names",
          "text": "Anthropic's guide Building effective agents calls it the evaluator-optimizer workflow. Other docs say generator and critic. Self-refine and Reflexion name two variants: one model in both roles, and a loop with memory. The shape is always a producer, a reviewer and a stop rule."
        },
        {
          "kind": "p",
          "text": "Reflection pays when a bad draft is common and checkable. It doesn't pay when one call is already right, or when the critic knows no more than the writer. Measure it. Run both designs on the same golden set, and compare the error rate and the cost."
        },
        {
          "kind": "p",
          "text": "Interviewers ask about this pattern, usually as a question about quality against cost. The last section gives the answer to have ready."
        }
      ]
    },
    {
      "id": "s7-interview",
      "title": "In an interview, say the critic labels, code decides and facts are checked in code",
      "goal": "What is the 30-second answer, and how does the loop map onto LangGraph?",
      "blocks": [
        {
          "kind": "p",
          "text": "Reflection comes up in interviews as a question about output quality. Give the shape first, then the separate critic, the grounded check and the cap."
        },
        {
          "kind": "callout",
          "tone": "interview",
          "title": "The 30-second answer",
          "text": "Reflection is a writer and a critic in a loop that code runs. The critic returns a verdict, a pass flag and issues. The writer revises until a pass or the round cap."
        },
        {
          "kind": "callout",
          "tone": "interview",
          "title": "Why a separate critic",
          "text": "I use a separate critic, because one model reviewing itself shares its blind spots. I check facts in code, such as whether a cited PEP exists. Each round costs at least two model calls, so I cap it at two or three rounds."
        },
        {
          "kind": "p",
          "text": "In LangGraph, the writer and the critic are two nodes. A conditional edge, from chapter 3, follows the critic. It sends the run back to the writer, or to the end on a pass or at the cap. The sketch below shows the shape."
        },
        {
          "kind": "code",
          "lang": "python",
          "caption": "The loop as a LangGraph graph. A sketch of the shape, not a runnable file.",
          "code": "from langgraph.graph import END, START, StateGraph\n\ndef after_critic(state):\n    done = state[\"verdict\"][\"pass\"] or state[\"round\"] >= 3\n    return END if done else \"write\"\n\ngraph = StateGraph(State)\ngraph.add_node(\"write\", write)\ngraph.add_node(\"critique\", critique)\ngraph.add_edge(START, \"write\")\ngraph.add_edge(\"write\", \"critique\")\ngraph.add_conditional_edges(\"critique\", after_critic, [\"write\", END])\napp = graph.compile()"
        },
        {
          "kind": "p",
          "text": "The by-hand version and the graph do the same job. The graph adds saved state and tracing. The by-hand version shows that the stop rule is one if statement, and that the grounded check sits in code beside the critic."
        },
        {
          "kind": "p",
          "text": "Reflection runs its calls in strict order, because each review needs the draft before it. Some tasks have parts that need nothing from each other, and running them one by one only adds waiting. That raises the next chapter's question. What if the parts of the work don't depend on each other?"
        }
      ]
    }
  ],
  "lab": {
    "title": "Change the loop and watch the verdicts",
    "goal": "Run the module, then make three changes and read what each does. Every step runs offline. Compare your file with `capstone/src/askpep/patterns/reflect.py` in the my-learn folder.",
    "minutes": 20,
    "files": [
      "src/askpep/patterns/reflect.py"
    ],
    "steps": [
      {
        "title": "Run it unchanged",
        "text": "Run the module and compare all four traces with the chapter. The model calls and rough tokens must match: 2 at 152, 4 at 346 and 6 at 586. The memory section prints one lesson, then `lesson in next prompt: True`.",
        "code": "uv run --no-sync python -m askpep.patterns.reflect"
      },
      {
        "title": "Remove the grounded check",
        "text": "In `demo_grounded`, pass `check=None`. Predict the result, then run it. Section 2 now prints the same trace as section 1. The wrong PEP ships after one round, with 2 model calls at 152 rough tokens, because the critic passes it. Section 3 changes too. Its first question no longer fails, so `memory` prints an empty list and the lesson line prints False. Put the check back.",
        "code": "uv run --no-sync python -m askpep.patterns.reflect"
      },
      {
        "title": "Lower the round cap",
        "text": "In `demo_cap`, pass `max_rounds=1` to `reflect`. Predict the result, then run it. The last line says `gave up after 1 rounds`. The model calls fall from six to two, and the rough tokens from 586 to 156. A cap of one gives a single review with no revision. Put the cap back.",
        "code": "uv run --no-sync python -m askpep.patterns.reflect"
      },
      {
        "title": "Add a version check",
        "text": "Above `reflect`, write `check_version(draft, tools)`. It calls `python_feature_version` with the feature `walrus operator`, finds each `Python 3.x` in the draft and returns an issue for any version that differs. In `demo_grounded`, join it to `check_citations` with `+` inside the lambda. Change `WRONG` to cite PEP 572 and Python 3.9. Predict, then run it. In section 2, the check line names Python 3.9, round 2 ships 3.8 and the calls stay at four. Section 3's lesson now names the version. Section 1 ships the 3.9 draft in two calls, because self-refine has no check.",
        "code": "uv run --no-sync python -m askpep.patterns.reflect"
      }
    ],
    "verify": "uv run --no-sync python -m askpep.patterns.reflect"
  },
  "recap": [
    "Reflection is a writer, a critic and a loop. The critic returns a verdict, and code stops the loop.",
    "Its steps stay fixed. It loops on the quality of one answer.",
    "A model reviewing its own draft shares its blind spots, so use a separate critic.",
    "Check facts in code. A grounded check caught the PEP that the critic passed.",
    "Reflexion feeds short lessons from past failures into the next attempt.",
    "Cap the rounds. A critic that always passes, never passes or checks only style wastes calls."
  ],
  "reinforcement": "I am becoming a forward-deployed AI engineer. In reflection I learned that a critic labels a draft, code owns the loop and the cap, and facts are checked in code because a model critic shares the writer's blind spots. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  "interviewIds": [
    "agents-c14-q01",
    "agents-c14-q02",
    "agents-c14-q03"
  ]
};

export default chapter;
