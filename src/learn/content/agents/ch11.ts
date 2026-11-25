import type { Chapter } from "../types";

const chapter: Chapter = {
  "id": "agents-11-react-by-hand",
  "course": "agents",
  "number": 11,
  "title": "ReAct is a loop of think, act and observe that your code runs",
  "tagline": "What does a ReAct loop look like when you write it by hand, with no framework?",
  "minutes": 60,
  "objectives": [
    "Name the three moves of a ReAct loop, and say which two your code makes.",
    "Write the loop in plain Python, with the model returning data and your code running the tools.",
    "Stop the loop with an answer, a step budget or a repeated call, and size the budget to the task.",
    "Feed a tool error and a reply that does not parse back to the model as text, and say why that beats crashing.",
    "Place the original ReAct prompt, native tool calling and `create_agent` on one line, and say why the loop is the same in all three.",
    "Say when ReAct is the wrong choice, and give the 30-second answer in an interview."
  ],
  "sections": [
    {
      "id": "s1-loop",
      "title": "ReAct is a loop of three moves, and your code makes two of them",
      "goal": "What are the three moves, and why does one PEP question need a loop?",
      "blocks": [
        {
          "kind": "p",
          "text": "Chapter 10 ended on a question. What does the simplest architecture, where the model picks every step, look like when you write it by hand? Its kit ran a fifteen-line demo of that design, with one stop at five model calls. This chapter builds it properly in plain Python, then breaks it on purpose."
        },
        {
          "kind": "p",
          "text": "Start with a question the desk gets: which Python version added the walrus operator? A good answer names the version and the PEP. That takes two tools, a search for the PEP and a version lookup. After each result, something has to decide whether to call another tool or to answer."
        },
        {
          "kind": "p",
          "text": "**ReAct** is a loop where the model reasons, calls a tool and reads the result until it answers. The name joins reasoning and acting. A 2022 research paper introduced it. Each pass through the loop has three moves: think, act and observe."
        },
        {
          "kind": "p",
          "text": "In the think move, the model writes a short thought and a tool call. In the act move, your code runs that tool. In the observe move, your code sends the result back to the model as an observation. Then the model is called again."
        },
        {
          "kind": "p",
          "text": "Look at who does what. The model only writes text. Your code runs the tool, appends the observation and calls the model again. The model never runs anything. In chapter 10's terms, the loop owns the state: one list of messages that only grows."
        },
        {
          "kind": "compare",
          "caption": "The three moves of the loop, and who makes each one",
          "columns": [
            "Move",
            "Who makes it",
            "What it produces",
            "Where it goes"
          ],
          "rows": [
            [
              "Think",
              "The model",
              "A short thought and a choice of tool",
              "Into the message list as an assistant message"
            ],
            [
              "Act",
              "Your code",
              "The tool run with the model's arguments",
              "Nowhere yet, only a result"
            ],
            [
              "Observe",
              "Your code",
              "The tool result, or the error text",
              "Into the message list as the next user message"
            ]
          ]
        },
        {
          "kind": "quiz",
          "id": "agents11-q1",
          "question": "In a ReAct loop, who runs the tool?",
          "options": [
            "The model, from inside its reply.",
            "Your code, which reads the tool call and runs it.",
            "The model provider's server, always.",
            "A second model that checks the first."
          ],
          "answer": 1,
          "explain": "The model returns text that names a tool and its arguments. Your code runs the tool and appends the result. Everything the model knows about the world arrives through that observation."
        },
        {
          "kind": "fold",
          "tone": "plain",
          "title": "Why the thought is worth keeping",
          "text": "The loop never acts on the thought. It records it in the trace and keeps it in the history. It helps you most. Printed in a trace, it shows why the model chose a call, which is the first thing you read when a run goes wrong. Some models also reason better when they write the thought first."
        },
        {
          "kind": "p",
          "text": "Two of the three moves belong to your code, so you can write them yourself. The next section writes the whole loop."
        }
      ]
    },
    {
      "id": "s2-build",
      "title": "The whole loop fits in about forty lines of plain Python",
      "goal": "What does the whole loop look like in plain Python?",
      "blocks": [
        {
          "kind": "p",
          "text": "Work in your AskPEP repository. The file is `src/askpep/patterns/react.py`, and it imports the kit from chapter 10. The reference copy is `capstone/src/askpep/patterns/react.py` in the my-learn folder. Yours should match it."
        },
        {
          "kind": "step",
          "id": "agents11-s1",
          "title": "Write the reply check",
          "text": "Start the file with `parse`. A reply from the model is a dict. It is either an answer, or a tool name with an args object. Anything else raises `ValueError`. This check is the boundary between model text and your code. `MAX_STEPS` at the top caps the model calls in one run, and the next section explains why.",
          "lang": "python",
          "file": "src/askpep/patterns/react.py",
          "code": "\"\"\"ReAct by hand: think, act and observe in a loop that your code runs.\n\nThe model returns a thought and a tool call, or a final answer. Your code does everything else.\n\"\"\"\n\nimport json\nimport sys\n\nfrom askpep.patterns.kit import Run, Tools, fake_pep_tools, make_model, trace\n\nMAX_STEPS = 6\n\n\ndef parse(reply: dict) -> tuple[str, dict]:\n    \"\"\"Say what a reply is: (\"answer\", reply) or (\"tool\", reply). Anything else raises ValueError.\"\"\"\n    if not isinstance(reply, dict):\n        raise ValueError(\"the reply is not a JSON object\")\n    if \"answer\" in reply:\n        return \"answer\", reply\n    if isinstance(reply.get(\"tool\"), str) and isinstance(reply.get(\"args\"), dict):\n        return \"tool\", reply\n    raise ValueError(\"the reply needs an answer, or a tool name with an args object\")"
        },
        {
          "kind": "step",
          "id": "agents11-s2",
          "title": "Write the loop",
          "text": "Append `react`. It builds the message list, then asks the model once on each pass. A good tool call runs, and its result goes back as an observation. Three stops sit in the loop: an answer, a repeated call and a spent budget. Read the `except` branch twice. A reply that does not parse becomes text, not a crash.",
          "lang": "python",
          "file": "src/askpep/patterns/react.py",
          "code": "def react(question: str, model, tools: Tools, max_steps: int = MAX_STEPS) -> Run:\n    \"\"\"Run the loop until an answer, a repeated call or the step budget ends it.\"\"\"\n    run = Run(question, model=model)\n    messages = [\n        {\"role\": \"system\", \"content\": f\"Reply with a tool call or a final answer. Tools: {', '.join(tools.names())}\"},\n        {\"role\": \"user\", \"content\": question},\n    ]\n    seen = set()\n    for _ in range(max_steps):\n        try:\n            kind, reply = parse(model(messages))\n        except ValueError as exc:  # a live model that answers in prose raises a JSON error, which is a ValueError\n            note = f\"FormatError: {exc}\"\n            run.add(\"error\", note)\n            messages.append({\"role\": \"user\", \"content\": note})\n            continue\n        if kind == \"answer\":\n            run.answer = reply[\"answer\"]\n            run.add(\"answer\", run.answer)\n            return run\n        run.add(\"think\", reply.get(\"thought\", \"\"))\n        run.add(\"tool\", f\"{reply['tool']}({json.dumps(reply['args'])})\")\n        call = (reply[\"tool\"], json.dumps(reply[\"args\"], sort_keys=True))\n        if call in seen:\n            run.add(\"stop\", \"the same call came twice\")\n            return run\n        seen.add(call)\n        result = tools.call(reply[\"tool\"], reply[\"args\"])\n        run.add(\"observe\", json.dumps(result))\n        messages.append({\"role\": \"assistant\", \"content\": json.dumps(reply)})\n        messages.append({\"role\": \"user\", \"content\": f\"Observation: {json.dumps(result)}\"})\n    run.add(\"stop\", f\"step budget of {max_steps} reached\")\n    return run"
        },
        {
          "kind": "quiz",
          "id": "agents11-q2",
          "question": "After a tool runs, what does `react` add to the message list?",
          "options": [
            "Nothing. Only the trace grows.",
            "The model's reply, then the observation as a user message.",
            "Only the observation.",
            "The whole trace so far."
          ],
          "answer": 1,
          "explain": "The loop appends the assistant reply, then the observation. The next model call sees both, which is how the model learns the result of its last move. The trace is a separate record for you, and the model never sees it."
        },
        {
          "kind": "fold",
          "tone": "hood",
          "title": "Why the repeat check uses sorted arguments",
          "text": "The key is the tool name plus the arguments written as JSON with sorted keys. Two calls with the same arguments in a different order then count as the same call. The check is exact. A call that changes one word of a query is a new call."
        },
        {
          "kind": "step",
          "id": "agents11-s3",
          "title": "Add five scripted runs and run them",
          "text": "Append the scripted replies and `main`. Each run asks the same question with a different script, so you can watch one behaviour at a time. Run the module. It needs no network and no key.",
          "lang": "python",
          "file": "src/askpep/patterns/react.py",
          "code": "SEARCH = {\"thought\": \"Find the PEP first.\", \"tool\": \"search_peps\", \"args\": {\"query\": \"walrus\"}}\nVERSION = {\"thought\": \"Now the version.\", \"tool\": \"python_feature_version\", \"args\": {\"feature\": \"walrus operator\"}}\nANSWER = {\"answer\": \"The walrus operator came in Python 3.8, through PEP 572.\"}\nQUESTION = \"Which Python version added the walrus operator?\"\n\nSCENARIOS = {\n    \"a clean run\": ([SEARCH, VERSION, ANSWER], MAX_STEPS),\n    \"a tool error, then a retry\": (\n        [\n            {\"thought\": \"I know the feature.\", \"tool\": \"python_feature_version\", \"args\": {\"feature\": \"walrus\"}},\n            VERSION,\n            ANSWER,\n        ],\n        MAX_STEPS,\n    ),\n    \"a reply that does not parse\": ([{\"thought\": \"Let me think about it.\"}, SEARCH, VERSION, ANSWER], MAX_STEPS),\n    \"a repeated call\": ([SEARCH, SEARCH], MAX_STEPS),\n    \"a step budget of 3\": ([SEARCH, VERSION, {**SEARCH, \"args\": {\"query\": \"assignment\"}}, ANSWER], 3),\n}\n\n\ndef main(live: bool = False) -> None:\n    for name, (replies, max_steps) in SCENARIOS.items():\n        print(f\"== {name} ==\")\n        trace(react(QUESTION, make_model(replies, live), fake_pep_tools(), max_steps))\n        print()\n\n\nif __name__ == \"__main__\":\n    main(live=\"--live\" in sys.argv)",
          "expect": "== a clean run ==\nQ: Which Python version added the walrus operator?\n 1. think   Find the PEP first.\n 2. tool    search_peps({\"query\": \"walrus\"})\n 3. observe [\"PEP 572: Assignment Expressions\"]\n 4. think   Now the version.\n 5. tool    python_feature_version({\"feature\": \"walrus operator\"})\n 6. observe \"3.8\"\n 7. answer  The walrus operator came in Python 3.8, through PEP 572.\nmodel calls: 3, rough tokens: 389\n\n== a tool error, then a retry ==\nQ: Which Python version added the walrus operator?\n 1. think   I know the feature.\n 2. tool    python_feature_version({\"feature\": \"walrus\"})\n 3. observe \"ToolError: unknown feature 'walrus'. Known: walrus operator, f-strings, match statement\"\n 4. think   Now the version.\n 5. tool    python_feature_version({\"feature\": \"walrus operator\"})\n 6. observe \"3.8\"\n 7. answer  The walrus operator came in Python 3.8, through PEP 572.\nmodel calls: 3, rough tokens: 425\n\n== a reply that does not parse ==\nQ: Which Python version added the walrus operator?\n 1. error   FormatError: the reply needs an answer, or a tool name with an args object\n 2. think   Find the PEP first.\n 3. tool    search_peps({\"query\": \"walrus\"})\n 4. observe [\"PEP 572: Assignment Expressions\"]\n 5. think   Now the version.\n 6. tool    python_feature_version({\"feature\": \"walrus operator\"})\n 7. observe \"3.8\"\n 8. answer  The walrus operator came in Python 3.8, through PEP 572.\nmodel calls: 4, rough tokens: 532\n\n== a repeated call ==\nQ: Which Python version added the walrus operator?\n 1. think   Find the PEP first.\n 2. tool    search_peps({\"query\": \"walrus\"})\n 3. observe [\"PEP 572: Assignment Expressions\"]\n 4. think   Find the PEP first.\n 5. tool    search_peps({\"query\": \"walrus\"})\n 6. stop    the same call came twice\nmodel calls: 2, rough tokens: 205\n\n== a step budget of 3 ==\nQ: Which Python version added the walrus operator?\n 1. think   Find the PEP first.\n 2. tool    search_peps({\"query\": \"walrus\"})\n 3. observe [\"PEP 572: Assignment Expressions\"]\n 4. think   Now the version.\n 5. tool    python_feature_version({\"feature\": \"walrus operator\"})\n 6. observe \"3.8\"\n 7. think   Find the PEP first.\n 8. tool    search_peps({\"query\": \"assignment\"})\n 9. observe [\"PEP 572: Assignment Expressions\"]\n10. stop    step budget of 3 reached\nmodel calls: 3, rough tokens: 394"
        },
        {
          "kind": "p",
          "text": "Read the first run. It is the loop at its simplest: three model calls, two tools and an answer. The other four runs show what goes wrong, and the next two sections read them one by one."
        }
      ]
    },
    {
      "id": "s3-stops",
      "title": "Three conditions stop the loop, and the model controls only one",
      "goal": "What stops the loop, and which stop does the model control?",
      "blocks": [
        {
          "kind": "p",
          "text": "Read the clean run again. It stops because the model returned an answer. That is the only stop the model chooses. If your loop has no other stop, a model that never answers runs for ever and bills you for every call."
        },
        {
          "kind": "p",
          "text": "The second stop is a budget, from chapter 6, counted in steps. Here it is the step budget: at most `MAX_STEPS` model calls, 6 by default. At the cap, the loop adds a stop line and the run ends with no answer. The last scripted run sets it to 3, so the model never gets its fourth reply."
        },
        {
          "kind": "p",
          "text": "The third stop catches a repeated call, from chapter 6: the same tool called with the same arguments again and again. A second run of the tool would return the same result, so the model is stuck. The loop stops before the tool runs the second time."
        },
        {
          "kind": "p",
          "text": "Chapter 6 built both guards on the LangGraph desk. Its budget counted model calls across the whole desk. Its check fired when the last three tool calls matched. This loop stops the second time any call repeats an earlier one. The idea is the same, and the threshold is your choice."
        },
        {
          "kind": "widget",
          "id": "agents11-loop-referee",
          "intro": "Be the loop for six model replies. Pick what your code does next, and read the reason after each. Watch for the case where the tool fails but the loop does not."
        },
        {
          "kind": "quiz",
          "id": "agents11-q3",
          "question": "The model repeats `search_peps({\"query\": \"walrus\"})` on its third step. What should the loop do?",
          "options": [
            "Run it again, because tools may change.",
            "Raise the step budget by one.",
            "Ask the model to repeat itself.",
            "Stop before running it, because the same call cannot give new information."
          ],
          "answer": 3,
          "explain": "A repeat with identical arguments adds nothing. Stopping early saves the model calls that would follow. A stricter loop can instead feed back a note such as `you already made this call` once, then stop on the second repeat."
        },
        {
          "kind": "widget",
          "id": "agents11-budget-dial",
          "intro": "Set the step budget and the repeat check. Run the clean question and the stuck model together. Aim to finish the first and stop the second within three calls."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "A budget is a backstop, so size it to the real path",
          "text": "The budget should sit just above the longest healthy run. Too low, and good runs are cut off with no answer. Too high, and a stuck model spends the whole allowance. Here the longest healthy run takes four model calls, so 6 leaves a margin of two."
        },
        {
          "kind": "p",
          "text": "Two runs are still unread. In each, something fails in the middle of the loop, and the run still ends with an answer. The next section reads them."
        }
      ]
    },
    {
      "id": "s4-errors",
      "title": "Tool errors and replies that do not parse go back to the model as text",
      "goal": "What happens when a tool fails, or when the model's reply breaks the format?",
      "blocks": [
        {
          "kind": "p",
          "text": "Read the second run. The model asks for the feature `walrus`, and the tool doesn't know it. The tool returns a `ToolError` string that lists the known features. The loop does nothing special. It appends that string as the observation, and the model retries with `walrus operator`."
        },
        {
          "kind": "p",
          "text": "This is the contract from chapter 2. A tool failure is data the model can read, so the error text should say what to try next. The loop stays simple because the tools never raise into it. The kit's `Tools.call` turns any exception into that text."
        },
        {
          "kind": "p",
          "text": "Read the third run. The first reply has a thought and no tool call, so `parse` raises `ValueError`. The loop writes a `FormatError` line into the history and asks again. The bad reply still costs a step. So a model that can't produce a valid reply can't run for ever."
        },
        {
          "kind": "list",
          "items": [
            "A tool error is the tool's own failure, and the tool writes the hint.",
            "A format error is the model's failure to follow the reply format, and the loop writes the hint.",
            "Both come back as plain text in the next user message.",
            "Both cost a step, so the budget still bounds the cost."
          ]
        },
        {
          "kind": "quiz",
          "id": "agents11-q4",
          "question": "A live model answers in prose, so `json.loads` fails inside the model call. In `react`, what happens?",
          "options": [
            "The `except ValueError` branch catches it, adds a FormatError observation and asks again.",
            "The run crashes with a stack trace.",
            "The loop treats the prose as the final answer.",
            "The loop stops with the step budget."
          ],
          "answer": 0,
          "explain": "A JSON decode error is a `ValueError`, so the same branch handles it. A real build might retry once with a firmer instruction, but the shape holds: turn the failure into text and let the budget bound the retries."
        },
        {
          "kind": "fold",
          "tone": "trouble",
          "title": "When feeding errors back makes things worse",
          "text": "A model that ignores the hint repeats the same bad call. The repeat check then stops it on the second try. Without the check, the budget is the only guard, and you pay for every wasted step. Run the loop against a model that always fails and see which guard fires."
        },
        {
          "kind": "p",
          "text": "Every reply in this chapter is a JSON object that `parse` can check. The first ReAct systems got plain text from the model instead. The next section shows what changed since then, and what didn't."
        }
      ]
    },
    {
      "id": "s5-native",
      "title": "Native tool calling changed the reply format, and the loop stayed the same",
      "goal": "What did native tool calling change, and what stayed the same?",
      "blocks": [
        {
          "kind": "p",
          "text": "The first ReAct systems asked the model to write plain text. The model wrote lines that began with Thought and Action. Your code cut the text apart with a pattern and hoped the format held. A misplaced word broke the parse."
        },
        {
          "kind": "p",
          "text": "Today's models offer native tool calling. They take tool definitions, from chapter 2, as a separate input. They return a structured tool call, with a name and an arguments object, beside any text. The provider guarantees that shape far better than a text pattern could, so your reply check gets simpler."
        },
        {
          "kind": "p",
          "text": "The loop itself didn't change. The model still picks a tool, your code still runs it, and the result still goes back as the next message. In chapter 1, `create_agent` ran this loop for you. Your hand-built `react` and that call run the same loop."
        },
        {
          "kind": "compare",
          "caption": "Three forms of the same loop",
          "columns": [
            "Form",
            "How the model asks for a tool",
            "What your code does",
            "What stays the same"
          ],
          "rows": [
            [
              "Original ReAct prompt",
              "Text lines that begin with Thought and Action",
              "Cuts the text apart with a pattern",
              "Run the tool, append the observation, call again"
            ],
            [
              "Native tool calling",
              "A structured call with a name and arguments",
              "Reads the fields and runs the tool",
              "Run the tool, append the observation, call again"
            ],
            [
              "create_agent in chapter 1",
              "A structured call, handled for you",
              "Nothing, the library runs the loop",
              "Run the tool, append the observation, call again"
            ]
          ]
        },
        {
          "kind": "p",
          "text": "What `create_agent` adds is the plumbing. It turns your functions into tool definitions, runs the tool calls, handles tool errors and stops at the recursion limit from chapter 6. What it hides is the loop you just wrote. When a run misbehaves, you can now read it as three moves."
        },
        {
          "kind": "quiz",
          "id": "agents11-q5",
          "question": "What did native tool calling change about the ReAct loop?",
          "options": [
            "It removed the need to run tools in your code.",
            "It made the model's request for a tool a structured field, and the loop stayed the same.",
            "It replaced the observation with a hidden step.",
            "It lets the model choose its own step budget."
          ],
          "answer": 1,
          "explain": "The structured call makes parsing safer. Your code still runs the tool and still appends the result. The budget and the repeat check are still yours."
        },
        {
          "kind": "fold",
          "tone": "industry",
          "title": "Some frameworks still print Thought and Action",
          "text": "You will see the old names in docs, in prompts and in a few agent classes. They describe the same cycle. If a library says it runs a ReAct agent, check whether it parses text or reads structured calls. The answer tells you how it fails."
        },
        {
          "kind": "p",
          "text": "You now know what the loop does and what a framework hides. One question is left: when should you not use this loop at all?"
        }
      ]
    },
    {
      "id": "s6-interview",
      "title": "ReAct is the wrong choice when you can write the steps down",
      "goal": "When is ReAct the wrong choice, and how do you say so in an interview?",
      "blocks": [
        {
          "kind": "p",
          "text": "The loop gives the model the path. That helps when you can't write the steps down. It costs you when you can. A model that picks each step can pick a wrong one, skip one, or take ten steps where two would do."
        },
        {
          "kind": "p",
          "text": "Four signs say the loop is the wrong choice."
        },
        {
          "kind": "list",
          "items": [
            "The steps are known in advance, so a fixed list of calls in code is cheaper and easier to test.",
            "Money moves, so one wrong tool call has a cost that no budget undoes.",
            "A rule must hold every time, such as a legal check, and the model can't be the one to decide whether it runs.",
            "You must explain every run to an auditor, and a different path each time makes that hard."
          ]
        },
        {
          "kind": "p",
          "text": "Hold one test: if you can write the steps down, don't let the model choose them."
        },
        {
          "kind": "p",
          "text": "This comes up in interviews, usually as a question about when you would not use an agent. Describe the loop in one breath, then name the cases where you avoid it."
        },
        {
          "kind": "callout",
          "tone": "interview",
          "title": "The 30-second answer",
          "text": "ReAct is a loop. The model writes a thought and a tool call, my code runs the tool and appends the observation, and the model is called again. It stops on an answer, a step budget or a repeated call. Tool errors and bad replies go back as text."
        },
        {
          "kind": "callout",
          "tone": "interview",
          "title": "When I use it",
          "text": "I use it when the path is open. I avoid it when I can write the steps down, when money moves, or when a rule must hold."
        },
        {
          "kind": "quiz",
          "id": "agents11-q6",
          "question": "A refund flow always checks the order, then the policy, then pays. Is ReAct a good fit?",
          "options": [
            "Yes, because the model can choose the order.",
            "Yes, if the budget is high enough.",
            "No. The steps are known and money moves, so code should own the path.",
            "No, because ReAct cannot call more than one tool."
          ],
          "answer": 2,
          "explain": "A known order needs no model to choose it. A wrong tool call on a payment cannot be undone by a step budget. Keep the model for the parts that need judgement, and let code run the sequence."
        },
        {
          "kind": "fold",
          "tone": "industry",
          "title": "The LangGraph equivalent in one line",
          "text": "`create_agent` from chapter 1 builds this loop as a LangGraph graph. One node calls the model and one runs the tools. A conditional edge after the model sends the run to the tools while the reply holds a tool call, and ends it when it holds none. Your `react` is that graph with the nodes written out."
        },
        {
          "kind": "p",
          "text": "In those cases your code should own the path, and the model should only fill a blank or pick from a list your code wrote. That raises the next chapter's question. What if code, and not the model, should decide the order of steps?"
        }
      ]
    }
  ],
  "lab": {
    "title": "Change the loop and watch what stops it",
    "goal": "Run the module, then change one thing at a time and predict which stop line you will see. Every step runs offline. Compare your file with `capstone/src/askpep/patterns/react.py` in the my-learn folder.",
    "minutes": 20,
    "files": [
      "src/askpep/patterns/react.py"
    ],
    "steps": [
      {
        "title": "Run it unchanged",
        "text": "Run the module and compare all five runs with the output in the chapter. The model call counts must match: 3, 3, 4, 2 and 3, at 389, 425, 532, 205 and 394 rough tokens.",
        "code": "uv run --no-sync python -m askpep.patterns.react"
      },
      {
        "title": "Break the budget",
        "text": "Set `MAX_STEPS` to 2. Predict which runs now end with a stop line, then run it. The clean run makes both lookups and stops at `step budget of 2 reached`, one call short of its answer. The tool-error run and the does-not-parse run stop the same way. The repeated-call run still stops on the repeat, and the last run keeps its own budget of 3. Then set it back to 6.",
        "code": "uv run --no-sync python -m askpep.patterns.react"
      },
      {
        "title": "Remove the repeat check",
        "text": "Delete the `call` line, the `if call in seen` block and the `seen.add(call)` line. Predict what the repeated-call run does now, then run it. Its header prints, then `RuntimeError: ScriptedModel has no replies left`. The loop ran the search twice and asked for a third reply, which the script doesn't have. Its trace never prints, because `trace` runs only after the loop returns. Restore the lines afterwards.",
        "code": "uv run --no-sync python -m askpep.patterns.react"
      },
      {
        "title": "Make the format error worse",
        "text": "Change the first reply in `a reply that does not parse` to the plain string `I think it is 3.8`. Predict whether `parse` catches it, then run it. It does. The error line now reads `FormatError: the reply is not a JSON object`, from the first check in `parse` instead of the last.",
        "code": "uv run --no-sync python -m askpep.patterns.react"
      },
      {
        "title": "Add a stop reason",
        "text": "Give `Run` callers a way to tell stops apart. Change each `run.add(\"stop\", ...)` line to start with its reason in capitals, such as `REPEAT:` or `BUDGET:`. Run it. The repeated-call run now ends with `REPEAT: the same call came twice`, and the last run with `BUDGET: step budget of 3 reached`.",
        "code": "uv run --no-sync python -m askpep.patterns.react"
      }
    ],
    "verify": "uv run --no-sync python -m askpep.patterns.react"
  },
  "recap": [
    "ReAct is a loop. The model writes a thought and a tool call, your code runs the tool, and the result goes back as an observation.",
    "The model never runs anything. It returns data, and your code decides what it means.",
    "Three things stop the loop: a final answer, a step budget and a repeated call. Only the first is the model's choice.",
    "A tool error and a reply that does not parse both go back as text, and both cost a step.",
    "Native tool calling made the tool call a structured field. The loop, the budget and the repeat check stayed the same.",
    "Avoid ReAct when you can write the steps down, when money moves or when a rule must hold."
  ],
  "reinforcement": "I am becoming a forward-deployed AI engineer. In ReAct by hand I learned that an agent loop is the model returning a tool call and my code running it, with a step budget and a repeat check as stops. Errors go back as observations. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  "interviewIds": [
    "agents-c11-q01",
    "agents-c11-q02",
    "agents-c11-q03"
  ]
};

export default chapter;
