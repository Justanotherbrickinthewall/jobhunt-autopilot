import type { Chapter } from "../types";

const chapter: Chapter = {
  "id": "agents-15-parallel-fan-out",
  "course": "agents",
  "number": 15,
  "title": "Fan-out splits independent work, runs it at once and merges it",
  "tagline": "When parts of a task don't depend on each other, how do I run them at once?",
  "minutes": 55,
  "objectives": [
    "Say when a task's parts are independent, and name the design that runs them at once.",
    "Name fan-out's three stages, what each holds and who owns it.",
    "Write a splitter and a worker that each use their own model.",
    "Run the workers under one shared timeout, and merge in id order, naming every missing sub-question.",
    "Show that fan-out cuts wall time and leaves calls and tokens unchanged.",
    "Spot a dependent split, and guard it with `depends_on`.",
    "Explain fan-out as map-reduce, and say how LangGraph's `Send` expresses it."
  ],
  "sections": [
    {
      "id": "s1-problem",
      "title": "Independent sub-questions shouldn't wait behind each other",
      "goal": "When can the parts of a task run at once, and what is that design called?",
      "blocks": [
        {
          "kind": "p",
          "text": "Chapter 14 ended on a question. What if the parts of the work don't depend on each other? This chapter answers it. When parts of a task don't depend on each other, how do you run them at once?"
        },
        {
          "kind": "p",
          "text": "Ask the desk for the key fact from PEP 8, PEP 572 and PEP 703. Chapter 11's ReAct loop answers in series. It looks up one PEP after another. Each lookup takes two model calls, so the user waits for six model calls in a row. That wait, from question to answer, is the wall time."
        },
        {
          "kind": "p",
          "text": "Yet the three lookups share nothing. Two pieces of work are **independent** when neither needs the other's result. Independent work can run at the same time."
        },
        {
          "kind": "p",
          "text": "**Fan-out** is splitting independent work, running the pieces at once and merging the results. Here it has three stages. A splitter makes one model call that breaks the question into sub-questions. Workers answer the sub-questions at once. A merge step joins the answers in a fixed order."
        },
        {
          "kind": "callout",
          "tone": "insight",
          "title": "After the split, code owns the route",
          "text": "By chapter 10's map, code picks every step in fan-out. The model answers inside each worker and never picks the path. Once the split is made, the run is a deterministic workflow with parallel branches, as in chapter 12."
        },
        {
          "kind": "quiz",
          "id": "agents15-q1",
          "question": "Which task suits fan-out on the PEP desk?",
          "options": [
            "Summarise 18 PEPs, one summary for each.",
            "Find the PEP that replaced an old one, then summarise the new one.",
            "Write a draft, then list its weak claims.",
            "Retry a tool until it stops failing."
          ],
          "answer": 0,
          "explain": "Eighteen summaries share nothing, so they can run at once. The other three each need the output of an earlier step."
        },
        {
          "kind": "p",
          "text": "The next section names what each stage holds, and who owns it."
        }
      ]
    },
    {
      "id": "s2-how",
      "title": "Fan-out has three stages, and code owns the state in each",
      "goal": "What does each stage hold, and who owns it?",
      "blocks": [
        {
          "kind": "p",
          "text": "The state is small. The splitter returns a list of sub-questions. In the code, each one is a dict called a part. A part holds an id, the question and the ids it depends on. Each worker returns one answer. The merge holds the list of answers and builds the final text."
        },
        {
          "kind": "compare",
          "caption": "The three stages of fan-out, by who runs them and what state they hold",
          "columns": [
            "Stage",
            "Who runs it",
            "State it holds",
            "Failure it must handle"
          ],
          "rows": [
            [
              "Split",
              "One model call, then code reads the list",
              "The list of sub-questions",
              "A split that cuts a dependent question in two"
            ],
            [
              "Work",
              "Code starts the workers, and each worker has its own model",
              "One answer for each sub-question, kept inside its worker",
              "A worker that is slow or fails"
            ],
            [
              "Merge",
              "Code, in id order",
              "The list of answers and the missing sub-questions",
              "A merge that hides a missing sub-question"
            ]
          ]
        },
        {
          "kind": "p",
          "text": "No worker reads another worker's state. The fixed order is id order. Workers finish in any order, so the merge sorts by id and never by finish time. Without that, the same question would give its answers in a different order on different runs."
        },
        {
          "kind": "p",
          "text": "With the stages named, the next section writes the first two: the splitter and one worker."
        }
      ]
    },
    {
      "id": "s3-split-worker",
      "title": "The splitter and the worker are two small functions",
      "goal": "How do you write the split and one worker so their replies never mix?",
      "blocks": [
        {
          "kind": "p",
          "text": "Work in your own AskPEP repository. The file is `src/askpep/patterns/fan_out.py`. The reference copy is `capstone/src/askpep/patterns/fan_out.py` in the my-learn folder. It imports chapter 10's kit and nothing outside the standard library."
        },
        {
          "kind": "step",
          "id": "agents15-s1",
          "title": "Start the file with the imports and the split",
          "text": "Add the imports, two constants and `split`. `DELAY` is how long one worker model call takes, so the timing is visible. `WORKER_TIMEOUT` is how long the whole fan-out waits for its workers. The split is one model call. Each part carries the ids it depends on.",
          "lang": "python",
          "file": "src/askpep/patterns/fan_out.py",
          "code": "\"\"\"Parallel fan-out: a splitter breaks a question into parts, workers answer at once, code merges.\n\nStandard library only. Each worker gets its own model, so scripted replies stay in order.\n\"\"\"\n\nimport json\nimport sys\nimport time\nfrom concurrent.futures import ThreadPoolExecutor, wait\n\nfrom askpep.patterns.kit import Run, fake_pep_tools, make_model, trace\n\nDELAY = 0.25  # seconds one worker model call takes, so the timing is visible\nWORKER_TIMEOUT = 0.8  # seconds the whole fan-out waits before it gives up on slow parts\n\n\ndef split(question: str, splitter) -> list[dict]:\n    \"\"\"One model call. Each part has an id, a question and the ids it depends on.\"\"\"\n    reply = splitter([{\"role\": \"user\", \"content\": f\"Split into independent sub-questions: {question}\"}])\n    return reply[\"parts\"]"
        },
        {
          "kind": "step",
          "id": "agents15-s2",
          "title": "Add the worker",
          "text": "Add `run_part`. A worker makes two model calls: one picks a tool and one answers. It takes its own model as an argument. The `context` argument carries earlier answers, which only the in-order run passes. The fake tools only read data, so threads can share them safely.",
          "lang": "python",
          "file": "src/askpep/patterns/fan_out.py",
          "code": "def run_part(part: dict, model, tools, delay: float, context: list[str] | None = None) -> str:\n    \"\"\"One worker: two model calls. The first picks a tool, the second answers.\"\"\"\n    messages = [{\"role\": \"user\", \"content\": part[\"question\"]}]\n    if context:\n        messages.append({\"role\": \"user\", \"content\": \"Earlier answers: \" + \" \".join(context)})\n    time.sleep(delay)\n    call = model(messages)\n    result = tools.call(call[\"tool\"], call[\"args\"])\n    messages.append({\"role\": \"user\", \"content\": f\"Observation: {json.dumps(result)}\"})\n    time.sleep(delay)\n    return model(messages)[\"answer\"]"
        },
        {
          "kind": "p",
          "text": "Each worker gets its own scripted model. A scripted model returns its replies in call order. If three threads shared one, the replies would go to whichever thread asked first. The output would then change between runs."
        },
        {
          "kind": "p",
          "text": "One worker answers one sub-question. The next section runs all the workers at once, under one shared timeout."
        }
      ]
    },
    {
      "id": "s4-pool",
      "title": "One shared timeout lets the merge name what is missing",
      "goal": "How do you run the workers at once, wait a bounded time and still report every sub-question?",
      "blocks": [
        {
          "kind": "p",
          "text": "A thread pool is a fixed set of threads that run the functions you submit. Python's `ThreadPoolExecutor` is one. Each worker runs on its own thread, so the workers' model calls overlap."
        },
        {
          "kind": "step",
          "id": "agents15-s3",
          "title": "Run the sub-questions at once",
          "text": "Add `run_at_once`. It submits one `run_part` call for each sub-question to the pool. Then `wait` blocks until every worker finishes or the timeout passes. That is one timeout for the whole fan-out, not one for each worker. A worker that isn't done is timed out. A worker that raised is failed. The loop reports them in id order.",
          "lang": "python",
          "file": "src/askpep/patterns/fan_out.py",
          "code": "def run_at_once(parts, workers, tools, delays, timeout):\n    \"\"\"Submit every part, wait up to one deadline, and report each part in part order.\"\"\"\n    pool = ThreadPoolExecutor(max_workers=len(parts))\n    futures = [pool.submit(run_part, p, m, tools, d) for p, m, d in zip(parts, workers, delays)]\n    done, _ = wait(futures, timeout=timeout)\n    # Python cannot kill a thread. A slow worker keeps running, so give real calls their own timeout too.\n    pool.shutdown(wait=False, cancel_futures=True)\n    outcomes = []\n    for f in futures:\n        if f not in done:\n            outcomes.append((False, \"timed out\"))\n        elif f.exception():\n            outcomes.append((False, f\"failed: {f.exception()}\"))\n        else:\n            outcomes.append((True, f.result()))\n    return outcomes"
        },
        {
          "kind": "fold",
          "tone": "hood",
          "title": "Why threads and not asyncio",
          "text": "A model call spends nearly all its time waiting on the network. A waiting thread lets other threads run, so plain threads overlap the calls. asyncio overlaps them too, on one thread. Threads keep the worker code as ordinary blocking Python, which is why this build uses `ThreadPoolExecutor`."
        },
        {
          "kind": "p",
          "text": "The pool shuts down with `wait=False`. A `with` block would wait for a slow worker on exit, and that would defeat the timeout."
        },
        {
          "kind": "quiz",
          "id": "agents15-q2",
          "question": "Why does `run_at_once` call `shutdown(wait=False)` and not use a `with` block?",
          "options": [
            "A `with` block cannot start threads.",
            "A `with` block waits for running workers on exit, so a slow worker would hold the answer past the timeout.",
            "`wait=False` makes the workers faster.",
            "A `with` block hides exceptions from workers."
          ],
          "answer": 1,
          "explain": "Leaving a `with` block calls `shutdown(wait=True)`. The code would stop at the end of the block until the slow worker returned. The timeout would stop mattering."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "A timeout stops the wait and leaves the work running",
          "text": "Python cannot kill a thread. A timed-out worker keeps running, and it keeps costing money until its model call returns. In a real system, also set a timeout on each model call."
        },
        {
          "kind": "step",
          "id": "agents15-s4",
          "title": "Add the in-order run and the merge",
          "text": "Add `run_in_order` and `merge`. The in-order run is the baseline. It is also the fallback when sub-questions depend on each other, so it passes each one the answers it depends on. `merge` joins the answers in id order. For each missing sub-question it adds the id and the reason. The whole answer never fails because one sub-question did.",
          "lang": "python",
          "file": "src/askpep/patterns/fan_out.py",
          "code": "def run_in_order(parts, workers, tools, delays):\n    \"\"\"One part after another. A part sees the answers of the parts it depends on.\"\"\"\n    answers, outcomes = {}, []\n    for p, m, d in zip(parts, workers, delays):\n        context = [answers[i] for i in p[\"depends_on\"] if i in answers]\n        try:\n            answers[p[\"id\"]] = run_part(p, m, tools, d, context)\n            outcomes.append((True, answers[p[\"id\"]]))\n        except Exception as exc:\n            outcomes.append((False, f\"failed: {exc}\"))\n    return outcomes\n\n\ndef merge(run: Run, parts, outcomes) -> None:\n    \"\"\"Join the answers in part order, not in the order they finished. Name every missing part.\"\"\"\n    pieces, missing = [], []\n    for p, (ok, text) in zip(parts, outcomes):\n        if ok:\n            run.add(\"worker\", f\"{p['id']}. {text}\")\n            pieces.append(text)\n        else:\n            run.add(\"missing\", f\"{p['id']}. {text}\")\n            missing.append(f\"part {p['id']} ({text})\")\n    answer = \" \".join(pieces)\n    if missing:\n        answer += f\" Missing: {', '.join(missing)}.\"\n    run.add(\"merge\", answer)\n    run.answer = answer"
        },
        {
          "kind": "step",
          "id": "agents15-s5",
          "title": "Add the entry point",
          "text": "Add `fan_out`. It splits, builds one model for each sub-question, runs the dependency guard and merges. The guard reads the splitter's `depends_on` lists. If any sub-question depends on another, the run goes in order. `fan_out` returns the run and every model, and `totals` adds up their calls and tokens.",
          "lang": "python",
          "file": "src/askpep/patterns/fan_out.py",
          "code": "def fan_out(question, splitter, make_worker, tools, timeout=WORKER_TIMEOUT, delays=None, parallel=True):\n    \"\"\"Split, run, merge. Returns the run and every model used, so the caller can count calls.\"\"\"\n    run = Run(question)\n    parts = split(question, splitter)\n    for p in parts:\n        run.add(\"split\", f\"{p['id']}. {p['question']}\")\n    delays = delays or [DELAY] * len(parts)\n    workers = [make_worker(i) for i in range(len(parts))]\n    if any(p[\"depends_on\"] for p in parts):\n        run.add(\"guard\", \"a part needs another part's answer, so no fan-out\")\n        parallel = False\n    if parallel:\n        outcomes = run_at_once(parts, workers, tools, delays, timeout)\n    else:\n        outcomes = run_in_order(parts, workers, tools, delays)\n    merge(run, parts, outcomes)\n    return run, [splitter, *workers]\n\n\ndef totals(models) -> tuple[int, int]:\n    return sum(m.n_calls for m in models), sum(m.tokens for m in models)"
        },
        {
          "kind": "p",
          "text": "The file can now split, run and merge. The next section adds the demo data and runs it."
        }
      ]
    },
    {
      "id": "s5-run",
      "title": "Fan-out cuts wall time and leaves calls and tokens where they were",
      "goal": "What does fan-out save, and what does it still cost?",
      "blocks": [
        {
          "kind": "step",
          "id": "agents15-s6",
          "title": "Add the demo data",
          "text": "Add `worker_script`, `three_parts` and `three_workers`. The scripts stand in for what a real model would reply to each sub-question. Add the question as well.",
          "lang": "python",
          "file": "src/askpep/patterns/fan_out.py",
          "code": "def worker_script(tool: str, args: dict, answer: str) -> list[dict]:\n    return [{\"tool\": tool, \"args\": args}, {\"answer\": answer}]\n\n\ndef three_parts() -> list[dict]:\n    return [\n        {\"id\": 1, \"question\": \"What is the key rule in PEP 8?\", \"depends_on\": []},\n        {\"id\": 2, \"question\": \"What is the key fact about PEP 572?\", \"depends_on\": []},\n        {\"id\": 3, \"question\": \"What is the key fact about PEP 703?\", \"depends_on\": []},\n    ]\n\n\ndef three_workers() -> list[list[dict]]:\n    return [\n        worker_script(\"read_pep_section\", {\"pep\": 8, \"section\": \"line length\"}, \"PEP 8 limits lines to 79 characters.\"),\n        worker_script(\"read_pep_section\", {\"pep\": 572, \"section\": \"history\"}, \"PEP 572 was accepted for Python 3.8.\"),\n        worker_script(\"read_pep_section\", {\"pep\": 703, \"section\": \"status\"}, \"PEP 703 is accepted, with an experimental build in 3.13.\"),\n    ]\n\n\nQUESTION = \"Give the key fact from PEP 8, PEP 572 and PEP 703.\""
        },
        {
          "kind": "step",
          "id": "agents15-s7",
          "title": "Add the demos and run the module",
          "text": "Add three demos and the `__main__` block, then run the module with the command below. Timings print to a tenth of a second, so a busy machine may show 0.6 or 1.6 instead.",
          "lang": "python",
          "file": "src/askpep/patterns/fan_out.py",
          "code": "def demo_speed(live: bool = False) -> None:\n    \"\"\"Same work twice. Fan-out saves time and not calls.\"\"\"\n    tools = fake_pep_tools()\n    for label, parallel in ((\"fan-out\", True), (\"in order\", False)):\n        start = time.perf_counter()\n        run, models = fan_out(\n            QUESTION,\n            make_model([{\"parts\": three_parts()}], live),\n            lambda i: make_model(three_workers()[i], live),\n            tools,\n            parallel=parallel,\n        )\n        wall = time.perf_counter() - start\n        if parallel:\n            trace(run)\n        calls, tokens = totals(models)\n        print(f\"{label:<8} {calls} calls, {tokens} tokens, about {wall:.1f}s\")\n\n\ndef demo_partial(live: bool = False) -> None:\n    \"\"\"Part 2 is too slow and part 3 fails. The merge names both and keeps part 1.\"\"\"\n    delays = [DELAY, 1.0, DELAY]\n    workers = three_workers()\n    workers[2] = workers[2][:1]  # the second reply never comes\n    run, _ = fan_out(\n        QUESTION,\n        make_model([{\"parts\": three_parts()}], live),\n        lambda i: make_model(workers[i], live),\n        fake_pep_tools(),\n        delays=delays,\n    )\n    trace(run)\n\n\ndef demo_dependent(live: bool = False) -> None:\n    \"\"\"Part 2 needs part 1's answer. Fanned out, it guesses. With the dependency marked, it waits.\"\"\"\n    question = \"Which Python version added the feature that PEP 572 introduced?\"\n    parts = [\n        {\"id\": 1, \"question\": \"What does PEP 572 add?\", \"depends_on\": []},\n        {\"id\": 2, \"question\": \"Which Python version added that feature?\", \"depends_on\": []},\n    ]\n    first = worker_script(\"read_pep_section\", {\"pep\": 572, \"section\": \"summary\"}, \"PEP 572 adds the walrus operator.\")\n    guess = worker_script(\"python_feature_version\", {\"feature\": \"f-strings\"}, \"It was added in Python 3.6.\")\n    informed = worker_script(\"python_feature_version\", {\"feature\": \"walrus operator\"}, \"It was added in Python 3.8.\")\n    tools = fake_pep_tools()\n    print(\"-- the splitter calls the parts independent\")\n    run, _ = fan_out(question, make_model([{\"parts\": parts}], live), lambda i: make_model([first, guess][i], live), tools)\n    trace(run)\n    print(\"-- the splitter marks the dependency\")\n    parts[1] = {**parts[1], \"depends_on\": [1]}\n    run, _ = fan_out(question, make_model([{\"parts\": parts}], live), lambda i: make_model([first, informed][i], live), tools)\n    trace(run)\n\n\nif __name__ == \"__main__\":\n    live = \"--live\" in sys.argv\n    print(\"== two ways to run the same three parts\")\n    demo_speed(live)\n    print(\"== one slow part and one failing part\")\n    demo_partial(live)\n    print(\"== parts that depend on each other\")\n    demo_dependent(live)",
          "expect": "== two ways to run the same three parts\nQ: Give the key fact from PEP 8, PEP 572 and PEP 703.\n 1. split   1. What is the key rule in PEP 8?\n 2. split   2. What is the key fact about PEP 572?\n 3. split   3. What is the key fact about PEP 703?\n 4. worker  1. PEP 8 limits lines to 79 characters.\n 5. worker  2. PEP 572 was accepted for Python 3.8.\n 6. worker  3. PEP 703 is accepted, with an experimental build in 3.13.\n 7. merge   PEP 8 limits lines to 79 characters. PEP 572 was accepted for Python 3.8. PEP 703 is accepted, with an experimental build in 3.13.\nfan-out  7 calls, 366 tokens, about 0.5s\nin order 7 calls, 366 tokens, about 1.5s\n== one slow part and one failing part\nQ: Give the key fact from PEP 8, PEP 572 and PEP 703.\n 1. split   1. What is the key rule in PEP 8?\n 2. split   2. What is the key fact about PEP 572?\n 3. split   3. What is the key fact about PEP 703?\n 4. worker  1. PEP 8 limits lines to 79 characters.\n 5. missing 2. timed out\n 6. missing 3. failed: ScriptedModel has no replies left\n 7. merge   PEP 8 limits lines to 79 characters. Missing: part 2 (timed out), part 3 (failed: ScriptedModel has no replies left).\n== parts that depend on each other\n-- the splitter calls the parts independent\nQ: Which Python version added the feature that PEP 572 introduced?\n 1. split   1. What does PEP 572 add?\n 2. split   2. Which Python version added that feature?\n 3. worker  1. PEP 572 adds the walrus operator.\n 4. worker  2. It was added in Python 3.6.\n 5. merge   PEP 572 adds the walrus operator. It was added in Python 3.6.\n-- the splitter marks the dependency\nQ: Which Python version added the feature that PEP 572 introduced?\n 1. split   1. What does PEP 572 add?\n 2. split   2. Which Python version added that feature?\n 3. guard   a part needs another part's answer, so no fan-out\n 4. worker  1. PEP 572 adds the walrus operator.\n 5. worker  2. It was added in Python 3.8.\n 6. merge   PEP 572 adds the walrus operator. It was added in Python 3.8."
        },
        {
          "kind": "code",
          "lang": "bash",
          "code": "uv run --no-sync python -m askpep.patterns.fan_out",
          "caption": "Run the module from your repository. It needs no network and no key."
        },
        {
          "kind": "p",
          "text": "Read the first section. Fan-out and the in-order run each made seven calls: one split and six worker calls. Both used the same 366 rough tokens. Fan-out took about 0.5 seconds against 1.5. You paid the same and waited a third as long."
        },
        {
          "kind": "widget",
          "id": "agents15-latency-cost",
          "intro": "Set the number of sub-questions and slow one of them. Predict the fan-out wall time before you check. Watch which sub-question sets the time, and what the call count does."
        },
        {
          "kind": "quiz",
          "id": "agents15-q3",
          "question": "Fan-out cuts three sub-questions from 1.5 seconds to 0.5 seconds. What happens to the total model calls?",
          "options": [
            "They fall by two thirds.",
            "They stay the same.",
            "They rise by a third.",
            "They fall to one."
          ],
          "answer": 1,
          "explain": "Every sub-question still needs its own worker calls. Fan-out overlaps them in time. The total, and the tokens, stay where they were."
        },
        {
          "kind": "p",
          "text": "Read the second section. Sub-question 2 was too slow, and sub-question 3 had no second reply. The merge kept sub-question 1 and named the other two with their reasons. The user gets a partial answer and knows exactly what is missing."
        },
        {
          "kind": "fold",
          "tone": "industry",
          "title": "Parallel calls reach rate limits sooner",
          "text": "Fan-out puts the same tokens into a shorter window, so it reaches per-minute limits sooner. Cap `max_workers` at the concurrency limit of your model's API. Retry a rate-limited sub-question after a delay rather than failing it."
        },
        {
          "kind": "p",
          "text": "Both of those runs split into independent sub-questions. The third section shows what happens when the split is wrong."
        }
      ]
    },
    {
      "id": "s6-breaks",
      "title": "Fan-out gives a confident wrong answer when sub-questions depend on each other",
      "goal": "What happens when the split is wrong, and how does code guard against it?",
      "blocks": [
        {
          "kind": "p",
          "text": "Read the third section of the output. The question needs two facts in order: what PEP 572 added, then when that feature arrived. The splitter called the two sub-questions independent. Worker 2 couldn't tell what 'that feature' meant, so it guessed f-strings and answered 3.6."
        },
        {
          "kind": "p",
          "text": "The merge printed a fluent, wrong answer. Nothing failed and no timeout fired. This is fan-out's worst failure, because it looks like success. Chapter 13 met the same trap inside a plan, as a hidden dependency."
        },
        {
          "kind": "p",
          "text": "The fix has two halves. The splitter lists `depends_on` for each sub-question. Code reads those lists and runs dependent sub-questions in order, passing earlier answers as context. The guard line in the second run shows it, and the answer becomes 3.8."
        },
        {
          "kind": "widget",
          "id": "agents15-safe-to-split",
          "intro": "Six splits follow. Decide for each whether the sub-questions are independent. Predict before you check. Watch the case where the lookups are independent and the comparison is not."
        },
        {
          "kind": "list",
          "items": [
            "A dependent split gives a wrong answer with no error. Guard it with `depends_on`, and test the splitter on dependent questions.",
            "A slow sub-question holds the whole fan-out until the timeout. Set the timeout from the slowest sub-question you will accept.",
            "A missing sub-question must be named in the answer. A silent gap reads as a complete answer.",
            "A burst of parallel calls reaches the API's rate limits sooner. Cap the worker count."
          ]
        },
        {
          "kind": "quiz",
          "id": "agents15-q4",
          "question": "Fan-out answered 'It was added in Python 3.6' for the wrong feature. What was the root cause?",
          "options": [
            "The timeout was too short.",
            "The splitter treated dependent sub-questions as independent.",
            "The merge sorted the answers wrongly.",
            "The workers shared one model."
          ],
          "answer": 1,
          "explain": "Sub-question 2 needed sub-question 1's answer and never saw it. It guessed. No timeout, ordering or model sharing was involved, and the run reported no error."
        },
        {
          "kind": "fold",
          "tone": "trouble",
          "title": "If the output changes between runs",
          "text": "Check two things. Each worker needs its own scripted model, because a shared one hands replies to whichever thread asks first. The merge must sort by id, because finish order changes from run to run."
        },
        {
          "kind": "p",
          "text": "You have now built every piece by hand. The last section names the general shape and shows how a framework spells it."
        }
      ]
    },
    {
      "id": "s7-interview",
      "title": "In an interview, call it map-reduce and say what happens when a sub-question fails",
      "goal": "What is the 30-second answer, and how does LangGraph express fan-out?",
      "blocks": [
        {
          "kind": "p",
          "text": "Fan-out comes up in interviews, often as a question about latency. Name the general shape first. **Map-reduce** is fan-out where one function runs on each piece and another merges them. Here the map is the worker and the reduce is `merge`. Batch data jobs use the same shape."
        },
        {
          "kind": "p",
          "text": "LangGraph spells fan-out with the `Send` API. A conditional edge returns one `Send` for each sub-question, and the branches run in the same graph step. A reducer on the results key collects the answers."
        },
        {
          "kind": "code",
          "lang": "python",
          "code": "import operator\nfrom typing import Annotated, TypedDict\n\nfrom langgraph.types import Send\n\n\nclass State(TypedDict):\n    parts: list[dict]\n    results: Annotated[list[dict], operator.add]\n\n\ndef fan(state: State) -> list[Send]:\n    return [Send(\"worker\", {\"part\": p}) for p in state[\"parts\"]]\n\n\nbuilder.add_conditional_edges(\"split\", fan, [\"worker\"])\nbuilder.add_edge(\"worker\", \"merge\")",
          "caption": "The Send version of fan-out. Each worker returns a one-item results list with its id, and the merge node sorts by id."
        },
        {
          "kind": "p",
          "text": "What you built by hand is what `Send` hides: the pool and the collection. You still decide the timeout, the dependency check and how the merge names a missing sub-question."
        },
        {
          "kind": "callout",
          "tone": "interview",
          "title": "The 30-second answer",
          "text": "I use fan-out when the sub-questions are independent. A splitter breaks the question up, workers answer at once, and code merges the answers in a fixed order. Wall time drops to the slowest sub-question."
        },
        {
          "kind": "callout",
          "tone": "interview",
          "title": "What it does not buy",
          "text": "It doesn't cut calls or tokens, and it reaches rate limits sooner. The workers share one timeout, and the merge names any missing sub-question. I check dependencies before I split, because a dependent split gives a confident wrong answer."
        },
        {
          "kind": "p",
          "text": "Fan-out ran different sub-questions at once. The same machinery can run one question several times. That raises the next chapter's question. Can several answers to one question beat a single answer?"
        }
      ]
    }
  ],
  "lab": {
    "title": "Change the fan-out and watch it",
    "goal": "Run the module, then change it three ways and read what each change does. Every step runs offline. Compare your file with `capstone/src/askpep/patterns/fan_out.py` in the my-learn folder.",
    "minutes": 20,
    "files": [
      "src/askpep/patterns/fan_out.py"
    ],
    "steps": [
      {
        "title": "Run it unchanged",
        "text": "Run the module. The three sections must match the chapter. The timings show about 0.5 and 1.5 seconds.",
        "code": "uv run --no-sync python -m askpep.patterns.fan_out"
      },
      {
        "title": "Give the slow sub-question more time",
        "text": "Set `WORKER_TIMEOUT` to 2.5. Predict the second section before you run it. Sub-question 2 now finishes and joins the merge. Sub-question 3 still fails, because its second reply never comes.",
        "code": "uv run --no-sync python -m askpep.patterns.fan_out"
      },
      {
        "title": "Make every model call faster",
        "text": "Set `DELAY` to 0.1. Predict the two timings, then run it. Fan-out takes about 0.2 seconds and the in-order run about 0.6. The ratio stays one to three, because the three sub-questions take equal time.",
        "code": "uv run --no-sync python -m askpep.patterns.fan_out"
      },
      {
        "title": "Mark a dependency",
        "text": "In `three_parts`, change the third entry's `depends_on` to `[2]`. Run it. The first section shows a guard line, and the fan-out time rises to the in-order time, about 1.5 seconds. Tokens rise from 366 to 409 in both runs, because sub-question 3 now reads sub-question 2's answer. The second section changes too. The in-order run has no timeout, so sub-question 2 answers after two seconds.",
        "code": "uv run --no-sync python -m askpep.patterns.fan_out"
      }
    ],
    "verify": "uv run --no-sync python -m askpep.patterns.fan_out"
  },
  "recap": [
    "Fan-out splits independent work, runs the pieces at once and merges the results.",
    "Each worker needs its own model, and the merge sorts by id.",
    "Wall time drops to the slowest sub-question. Calls and tokens stay the same.",
    "One shared timeout and a merge that names missing sub-questions give a partial answer, not a failed one.",
    "A dependent split gives a confident wrong answer, so code checks `depends_on`.",
    "Map-reduce is the general shape, and LangGraph's `Send` is the framework version."
  ],
  "reinforcement": "I am becoming a forward-deployed AI engineer. In parallel fan-out I learned that independent work can run at once, which cuts wall time and leaves calls and tokens unchanged, and that a dependent split gives confident wrong answers. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  "interviewIds": [
    "agents-c15-q01",
    "agents-c15-q02",
    "agents-c15-q03",
    "agents-c15-q04"
  ]
};

export default chapter;
