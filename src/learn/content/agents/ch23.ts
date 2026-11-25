import type { Chapter } from "../types";

const chapter: Chapter = {
  "id": "agents-23-guardrails-actions",
  "course": "agents",
  "number": 23,
  "title": "Guardrails on actions decide what may leave the system",
  "tagline": "How do I stop an agent's action reaching the outside world before it's safe? Classify each action, check it, hold the irreversible ones for a person and log every step.",
  "minutes": 80,
  "objectives": [
    "Sort actions into read-only, reversible and irreversible, and say which guards each class gets.",
    "Draft with placeholders and fill every number and link in code, so the model never writes them.",
    "Write schema, policy and content checks that block an action and record why.",
    "Pause a run before an irreversible action, and resume it by task ID on approve, edit or reject.",
    "Run a dry run and a retry, and read the audit log that explains both.",
    "Say where each action guard breaks, and give the fix for each.",
    "Give the 30-second answer, and show the same pause in LangGraph."
  ],
  "sections": [
    {
      "id": "s1-risk",
      "title": "An action's risk class decides which guards it needs",
      "goal": "Which actions need a guard, and how strict should each guard be?",
      "blocks": [
        {
          "kind": "p",
          "text": "Chapter 22 ended on a question. What about actions that leave the system and can't be undone? This chapter asks it in full: how do I stop an agent's action reaching the outside world before it's safe?"
        },
        {
          "kind": "p",
          "text": "Until now the PEP desk mostly answered. Chapter 7 gave it one side effect, a ticket, and made it safe to run twice. Now give it three side effects that reach other people. It can post an answer to a public forum, email a subscriber and file a correction to the PEP index."
        },
        {
          "kind": "p",
          "text": "Chapter 22 guarded what goes into the model and which tools it may call. Some tools that send must stay on the allow-list, because the job needs them. So this chapter starts after the model has spoken. It covers what the system does with the action the model proposes."
        },
        {
          "kind": "p",
          "text": "An **action guard** is code that checks each proposed action before it runs, and blocks it or holds it. A blocked action never runs. A held action waits, with its run paused, until a person decides."
        },
        {
          "kind": "p",
          "text": "Why code and not a better prompt? A model writes plausible text. It may write that PEP 703 lands in Python 3.14. The desk's PEP data says no such thing, and nothing inside the model checks. An email can't be unsent, so the check has to happen before it leaves."
        },
        {
          "kind": "p",
          "text": "Start by sorting actions into risk classes. A **read-only** action changes nothing. A **reversible** action changes something that a person can undo. An **irreversible** action can't be taken back once it leaves. Code sets the class, and the model never does."
        },
        {
          "kind": "widget",
          "id": "agents23-risk-sorter",
          "intro": "Sort six actions into the three classes. Predict all six before you check. Then read why the borderline ones land where they do."
        },
        {
          "kind": "quiz",
          "id": "agents23-q1",
          "question": "Which question sets an action's risk class?",
          "options": [
            "How likely the model is to be wrong.",
            "Whether the system can take the action back before anyone relies on it.",
            "How many arguments the action takes.",
            "Whether the user typed the request."
          ],
          "answer": 1,
          "explain": "The class is about the cost of a mistake, not its odds. A rare error in an irreversible action still needs a person. A frequent error in a read-only action costs little."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Classify by the worst case",
          "text": "A forum post is reversible only if someone watches the forum. A correction to the index is irreversible if other sites copy it, even though the index has an edit button. When a case is close, pick the stricter class."
        },
        {
          "kind": "p",
          "text": "This chapter builds eight guards, in this order. Each one is small, and each one is plain Python."
        },
        {
          "kind": "list",
          "ordered": true,
          "items": [
            "A risk class for every action, set in code.",
            "Draft text with placeholders, and code fills in the facts.",
            "Schema, policy and content checks on every proposed action.",
            "An **approval**: a person's approve, edit or reject on a held action.",
            "A **dry run**: running an action's checks and showing its effect without performing it.",
            "An idempotency key from chapter 7: a value built from the request that the store accepts only once, so a repeat changes nothing.",
            "An **audit log**: an append-only record of every action, who asked for it and what happened.",
            "The review queue from chapter 12, for the cases the rules don't cover."
          ]
        },
        {
          "kind": "compare",
          "caption": "Three risk classes on the PEP desk and the guards each one gets",
          "columns": [
            "Class",
            "Example on the desk",
            "Guards that apply",
            "Why"
          ],
          "rows": [
            [
              "Read-only",
              "Reading a section of a PEP",
              "Schema and policy checks, and the audit log",
              "Nothing changes, so the risk is a wrong or leaked read"
            ],
            [
              "Reversible",
              "Posting an answer to a public forum thread",
              "Schema, policy and content checks, an idempotency key, a dry run and the audit log",
              "A person can delete the post, so no approval is needed"
            ],
            [
              "Irreversible",
              "Emailing a subscriber, or filing a correction to the PEP index",
              "The same guards, plus approval before it runs",
              "It can't be taken back, so a person decides first"
            ]
          ]
        },
        {
          "kind": "p",
          "text": "The cheapest of these guards stops a bad draft from existing at all. Section 2 builds it, along with the action table."
        }
      ]
    },
    {
      "id": "s2-placeholders",
      "title": "The model drafts the words, and code supplies every number and link",
      "goal": "How do you stop the model writing a wrong number or link in the first place?",
      "blocks": [
        {
          "kind": "p",
          "text": "The cheapest guard removes the chance of a mistake. The model never writes a number or a link that should come from a trusted source. It writes a placeholder such as `{{status}}`, and code swaps in the real value."
        },
        {
          "kind": "p",
          "text": "A check can only reject a bad draft. A placeholder stops the bad draft from existing. You will still add a content check, because a model can ignore the instruction. The placeholder is the main guard, and the check is the backstop."
        },
        {
          "kind": "p",
          "text": "Work in your own AskPEP repository. The file is `src/askpep/patterns/approvals.py`. The reference copy is `capstone/src/askpep/patterns/approvals.py` in the my-learn folder. It uses only the standard library and the kit from chapter 10."
        },
        {
          "kind": "step",
          "id": "agents23-s1",
          "title": "Create the module and its stores",
          "text": "Start the file. Five stores hold what the desk needs to run and to explain itself. `STORE` keeps each run's saved state by task ID. `AUDIT` is the audit log, and `DONE` remembers the actions that ran. `QUEUE` is the review queue, and `OUTBOX` stands in for the outside world. `reset` clears them all.",
          "lang": "python",
          "file": "src/askpep/patterns/approvals.py",
          "code": "\"\"\"Guards on actions on the PEP desk: classify, check, approve, replay safely and log.\n\nStandard library only. The model proposes an action. Code decides whether it leaves the system.\n\"\"\"\n\nimport hashlib\nimport json\nimport re\n\nfrom askpep.patterns.kit import PEPS, Tool, Tools, fake_pep_tools, make_model\n\nState = dict\nSTORE: dict[str, State] = {}  # shortcut: memory only, a real desk saves to a database\nAUDIT: list[dict] = []  # one row per proposal, check, decision and outcome\nDONE: dict[str, str] = {}  # idempotency key -> result of the action that ran\nQUEUE: list[dict] = []  # the person's queue, for cases the rules do not cover\nOUTBOX: list[str] = []  # what actually left the desk\n\n\ndef reset() -> None:\n    \"\"\"Clear every store, so each demo starts clean.\"\"\"\n    for store in (STORE, AUDIT, DONE, QUEUE, OUTBOX):\n        store.clear()\n\n\ndef log(task_id: str, event: str, detail: str) -> None:\n    AUDIT.append({\"task\": task_id, \"event\": event, \"detail\": detail})\n\n\ndef show(task_id: str) -> None:\n    print(f\"-- {task_id}: {STORE[task_id]['status']}\")\n    for row in AUDIT:\n        if row[\"task\"] == task_id:\n            print(f\"   {row['event']:<14} {row['detail']}\")"
        },
        {
          "kind": "step",
          "id": "agents23-s2",
          "title": "List the actions and their classes",
          "text": "Add the action table. Each action has a risk class, a field table for the schema check and a key. The key names the fields that identify the target, and section 5 uses it. `GUARDS` maps each class to its checks and to whether it needs approval. `new_state` starts a run, and `save` stores a copy.",
          "lang": "python",
          "file": "src/askpep/patterns/approvals.py",
          "code": "# --- actions and their risk ---\n\n# read: nothing changes. reversible: a person can undo it. irreversible: it cannot be unsent.\nACTIONS = {\n    \"read_pep_section\": {\"risk\": \"read\", \"fields\": {\"pep\": int, \"section\": str}, \"key\": ()},\n    \"post_forum_answer\": {\n        \"risk\": \"reversible\",\n        \"fields\": {\"thread\": str, \"pep\": int, \"text\": str},\n        \"key\": (\"thread\", \"pep\"),\n    },\n    \"email_subscriber\": {\n        \"risk\": \"irreversible\",\n        \"fields\": {\"to\": str, \"pep\": int, \"text\": str},\n        \"key\": (\"to\", \"pep\"),\n    },\n    \"file_index_correction\": {\n        \"risk\": \"irreversible\",\n        \"fields\": {\"pep\": int, \"field\": str, \"text\": str},\n        \"key\": (\"pep\", \"field\"),\n    },\n}\n\n# The class decides which guards apply. Idempotency and dry-run cover every action with an effect.\n# The audit log covers all.\nGUARDS = {\n    \"read\": {\"checks\": (\"schema\", \"policy\"), \"approval\": False},\n    \"reversible\": {\"checks\": (\"schema\", \"policy\", \"content\"), \"approval\": False},\n    \"irreversible\": {\"checks\": (\"schema\", \"policy\", \"content\"), \"approval\": True},\n}\n\n\ndef show_classes() -> None:\n    for name, spec in ACTIONS.items():\n        guard = GUARDS[spec[\"risk\"]]\n        approval = \"approval\" if guard[\"approval\"] else \"no approval\"\n        print(f\"{name:<22} {spec['risk']:<13} {'+'.join(guard['checks'])}, {approval}\")\n\n\ndef new_state(task_id: str, question: str, dry_run: bool = False) -> State:\n    return {\n        \"task_id\": task_id,\n        \"question\": question,\n        \"status\": \"open\",\n        \"dry_run\": dry_run,\n        \"subscribers\": [\"ana@example.org\"],  # who has opted in to mail\n        \"open_threads\": [\"t-901\"],  # forum threads that accept answers\n        \"proposal\": None,\n    }\n\n\ndef save(state: State) -> None:\n    STORE[state[\"task_id\"]] = json.loads(json.dumps(state))  # a copy, so later edits do not leak"
        },
        {
          "kind": "step",
          "id": "agents23-s2r",
          "title": "Print the classes",
          "text": "Run the printer. The code spells read-only as `read`. Check that each class gets the guards in the table.",
          "lang": "bash",
          "code": "uv run --no-sync python -c \"from askpep.patterns.approvals import show_classes; show_classes()\"",
          "expect": "read_pep_section       read          schema+policy, no approval\npost_forum_answer      reversible    schema+policy+content, no approval\nemail_subscriber       irreversible  schema+policy+content, approval\nfile_index_correction  irreversible  schema+policy+content, approval"
        },
        {
          "kind": "step",
          "id": "agents23-s3",
          "title": "Draft with placeholders and fill in code",
          "text": "Add the trusted facts and the filler. `facts_for` is the only source for a number or a link in outgoing text. `fill` swaps `{{name}}` for a fact and leaves an unknown name alone. `links_and_numbers` finds links and numbers, and the content check uses it.",
          "lang": "python",
          "file": "src/askpep/patterns/approvals.py",
          "code": "# --- draft with placeholders, fill facts in code ---\n\n\ndef facts_for(pep: int) -> dict[str, str]:\n    \"\"\"The only source for a number or a link in outgoing text.\"\"\"\n    p = PEPS[pep]\n    return {\n        \"pep\": str(pep),\n        \"title\": p[\"title\"],\n        \"status\": p.get(\"status\", p[\"summary\"]),\n        \"url\": f\"https://peps.python.org/pep-{pep:04d}/\",\n    }\n\n\ndef fill(text: str, facts: dict[str, str]) -> str:\n    \"\"\"Replace {{name}} with a fact. An unknown name stays, and the content check blocks it.\"\"\"\n    return re.sub(r\"\\{\\{(\\w+)\\}\\}\", lambda m: facts.get(m.group(1), m.group(0)), text)\n\n\ndef links_and_numbers(text: str) -> tuple[set[str], set[str]]:\n    links = {m.rstrip(\".,)\") for m in re.findall(r\"https?://\\S+\", text)}\n    rest = re.sub(r\"https?://\\S+\", \" \", text)\n    return links, set(re.findall(r\"\\d+(?:\\.\\d+)*\", rest))"
        },
        {
          "kind": "step",
          "id": "agents23-s3r",
          "title": "Fill a draft",
          "text": "Fill a draft that uses a real name and a made-up one. Then find the number and the link in a sentence.",
          "lang": "bash",
          "code": "uv run --no-sync python -c \"from askpep.patterns.approvals import fill, facts_for, links_and_numbers; print(fill('PEP {{pep}}: {{status}} {{url}} {{bogus}}', facts_for(703))); print(links_and_numbers('Python 3.14 at https://x.example/a.'))\"",
          "expect": "PEP 703: Accepted. Python 3.13 ships an experimental free-threaded build. https://peps.python.org/pep-0703/ {{bogus}}\n({'https://x.example/a'}, {'3.14'})"
        },
        {
          "kind": "p",
          "text": "Read the output. The real names became facts. The unknown `{{bogus}}` stayed as it was, and the content check will block it. The second line shows what the finder sees. It strips the final dot from the link, and it keeps `3.14` as a number."
        },
        {
          "kind": "quiz",
          "id": "agents23-q2",
          "question": "The desk must tell a subscriber which Python version PEP 703 ships in. Which design removes the chance of a wrong version?",
          "options": [
            "Ask the model to double-check its numbers.",
            "The model writes a `{{status}}` placeholder and code fills it from the PEP data.",
            "Lower the model's temperature.",
            "Add three more examples to the prompt."
          ],
          "answer": 1,
          "explain": "A placeholder means the model never writes the number. The other options reduce the odds of a mistake. Only the placeholder removes the chance."
        },
        {
          "kind": "p",
          "text": "A placeholder works only if the model uses it. Section 3 adds the checks that catch a draft that doesn't."
        }
      ]
    },
    {
      "id": "s3-checks",
      "title": "Three checks run in a fixed order, and a failure blocks the action",
      "goal": "What must a proposed action pass before it may leave?",
      "blocks": [
        {
          "kind": "p",
          "text": "Now add the checks that run before anything leaves. Each one returns `None` for a pass or a reason for a failure. The reason goes into the audit log, so write it for the person who reads it later."
        },
        {
          "kind": "p",
          "text": "Chapter 2 made a schema the typed list of a tool's arguments. Here each action has one, in its field table. The policy check asks whether the action is allowed in the current state. The content check reads the outgoing words."
        },
        {
          "kind": "compare",
          "caption": "The three output checks, what each asks and where its facts come from",
          "columns": [
            "Check",
            "What it asks",
            "Example failure on the desk",
            "Where its facts come from"
          ],
          "rows": [
            [
              "Schema",
              "Is the proposal well formed?",
              "The pep field is a string and not an integer",
              "The field table in the action list"
            ],
            [
              "Policy",
              "Is this action allowed in the current state?",
              "The address has not subscribed",
              "The run's state, such as subscribers and open threads"
            ],
            [
              "Content",
              "Are the outgoing words safe to send?",
              "The text holds the number 3.14, which no trusted source gave",
              "The trusted facts for that PEP, and a short banned list"
            ]
          ]
        },
        {
          "kind": "p",
          "text": "The order matters. Policy reads fields such as `pep` and `to`. It can trust them only after the schema check says they exist and have the right type. Content comes last. It reads the finished text, so code fills the placeholders just before it."
        },
        {
          "kind": "step",
          "id": "agents23-s4",
          "title": "Write the three checks",
          "text": "Add the checks and the runner. `run_checks` goes through the checks for the action's class, in order. It fills the placeholders just before the content check. It logs every result and stops at the first failure. You run it in section 4, once `start` exists.",
          "lang": "python",
          "file": "src/askpep/patterns/approvals.py",
          "code": "# --- the output checks: schema, policy and content ---\n\n\ndef check_schema(state: State) -> str | None:\n    args, spec = state[\"proposal\"][\"args\"], ACTIONS[state[\"proposal\"][\"action\"]]\n    for name, kind in spec[\"fields\"].items():\n        if name not in args:\n            return f\"missing field {name!r}\"\n        if type(args[name]) is not kind:\n            return f\"field {name!r} must be {kind.__name__}, got {type(args[name]).__name__}\"\n    extra = set(args) - set(spec[\"fields\"])\n    return f\"unexpected field {sorted(extra)[0]!r}\" if extra else None\n\n\ndef check_policy(state: State) -> str | None:\n    \"\"\"Is this action allowed here? The schema says it is well formed, not that it is allowed.\"\"\"\n    action, args = state[\"proposal\"][\"action\"], state[\"proposal\"][\"args\"]\n    if args[\"pep\"] not in PEPS:\n        return f\"PEP {args['pep']} is not on the desk\"\n    if action == \"email_subscriber\" and args[\"to\"] not in state[\"subscribers\"]:\n        return f\"{args['to']} has not subscribed\"\n    if action == \"post_forum_answer\" and args[\"thread\"] not in state[\"open_threads\"]:\n        return f\"thread {args['thread']} is not open\"\n    if action == \"file_index_correction\" and args[\"field\"] not in PEPS[args[\"pep\"]]:\n        return f\"the index has no field {args['field']!r}\"\n    if action == \"read_pep_section\" and args[\"section\"] not in PEPS[args[\"pep\"]]:\n        return f\"PEP {args['pep']} has no section {args['section']!r}\"\n    return None\n\n\nBANNED = (\"guarantee\", \"legal advice\")\n\n\ndef check_content(state: State) -> str | None:\n    \"\"\"Check the outgoing text. Every number and link in it must come from the trusted facts.\"\"\"\n    args = state[\"proposal\"][\"args\"]\n    text = args[\"text\"]\n    if \"{{\" in text:\n        return \"an unfilled placeholder is left in the text\"\n    if len(text) > 300:\n        return f\"the text is {len(text)} characters, the limit is 300\"\n    for word in BANNED:\n        if word in text.lower():\n            return f\"the text contains {word!r}\"\n    links, numbers = links_and_numbers(text)\n    trusted_links, trusted_numbers = links_and_numbers(\" \".join(facts_for(args[\"pep\"]).values()))\n    untrusted = sorted(links - trusted_links) + sorted(numbers - trusted_numbers)\n    return f\"{untrusted[0]!r} did not come from a trusted source\" if untrusted else None\n\n\nCHECKS = {\"schema\": check_schema, \"policy\": check_policy, \"content\": check_content}\n\n\ndef run_checks(state: State) -> str | None:\n    \"\"\"Run the checks for this risk class in order. Return the first failure, or None.\"\"\"\n    args = state[\"proposal\"][\"args\"]\n    for name in GUARDS[state[\"risk\"]][\"checks\"]:\n        if name == \"content\":\n            args[\"text\"] = fill(args[\"text\"], facts_for(args[\"pep\"]))  # code fills the facts, then we check\n        reason = CHECKS[name](state)\n        log(state[\"task_id\"], f\"check:{name}\", reason or \"pass\")\n        if reason:\n            return f\"{name}: {reason}\"\n    return None"
        },
        {
          "kind": "widget",
          "id": "agents23-check-judge",
          "intro": "Six proposals are waiting to leave. For each one, say which check stops it, or whether all three pass. Watch for the case where the arguments are well formed and still not allowed."
        },
        {
          "kind": "quiz",
          "id": "agents23-q3",
          "question": "Why does the schema check run before the policy check?",
          "options": [
            "Schema is the cheapest check, and the order is arbitrary.",
            "Policy reads fields such as `pep` and `to`, and can trust them only once the schema has confirmed they exist and have the right type.",
            "The model asked for that order.",
            "Policy needs the filled text."
          ],
          "answer": 1,
          "explain": "Each check assumes what the one before it proved. Run them in the wrong order and the policy check crashes on a missing field instead of reporting it."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "The content check is a backstop, not a proof",
          "text": "It finds numbers and links that didn't come from a trusted source. It can't weigh a claim made in words. A text that says PEP 703 was rejected passes. A number that happens to match a trusted one passes too. Facts filled by code and a person's approval cover what the check can't."
        },
        {
          "kind": "p",
          "text": "The checks decide whether an action may run. For an irreversible action, passing them isn't enough. Section 4 makes it wait for a person."
        }
      ]
    },
    {
      "id": "s4-approval",
      "title": "An irreversible action pauses its run until a person decides",
      "goal": "How does a run wait for a person who may answer tomorrow?",
      "blocks": [
        {
          "kind": "p",
          "text": "An irreversible action needs a person. This is the human in the loop from course 1: a person who approves each output before it takes effect. The run can't wait inside a function, because the person may answer in an hour or tomorrow."
        },
        {
          "kind": "p",
          "text": "So the run holds the action. It stops, saves its state under the task ID from chapter 10 and returns. A second call brings in only the task ID and the decision."
        },
        {
          "kind": "p",
          "text": "This is the checkpoint idea from chapter 7 and the saved state from chapter 12. The state is one dict, and `save` stores a JSON copy of it. Here `STORE` is a dict in memory. A real desk keeps it in a database, so a held run survives a restart."
        },
        {
          "kind": "p",
          "text": "An approval takes one of three forms. Approve runs the action as proposed. Edit replaces the text, and the new text goes through the checks again. Reject ends the run with a reason. Every form leaves an audit row with the person's name."
        },
        {
          "kind": "step",
          "id": "agents23-s5",
          "title": "Write the effects, the key and the outcomes",
          "text": "Add the three effects as plain functions that write to `OUTBOX`, and register them in the kit's `Tools`. `READ` holds the kit's fake PEP tools. Add `idem_key`, which keys on the task, the action and the target, and leaves out the wording. Add `finish`, `hand_to_person` and `execute`. `execute` calls the tool and remembers the result under the key.",
          "lang": "python",
          "file": "src/askpep/patterns/approvals.py",
          "code": "# --- the effects, and the run that proposes, checks and executes ---\n\n\ndef post_forum_answer(thread, pep, text):\n    OUTBOX.append(f\"forum {thread}: {text}\")\n    return f\"posted to {thread}\"\n\n\ndef email_subscriber(to, pep, text):\n    OUTBOX.append(f\"email {to}: {text}\")\n    return f\"emailed {to}\"\n\n\ndef file_index_correction(pep, field, text):\n    OUTBOX.append(f\"index PEP {pep} {field}: {text}\")\n    return f\"filed a correction on PEP {pep}\"\n\n\nEFFECTS = Tools(\n    Tool(\"post_forum_answer\", \"Post an answer to a public thread.\", post_forum_answer),\n    Tool(\"email_subscriber\", \"Email one subscriber.\", email_subscriber),\n    Tool(\"file_index_correction\", \"File a correction to the PEP index.\", file_index_correction),\n)\nREAD = fake_pep_tools()\n\n\ndef idem_key(state: State) -> str:\n    \"\"\"Key on the task and the target, not the wording. A retry may word the text differently.\"\"\"\n    action, args = state[\"proposal\"][\"action\"], state[\"proposal\"][\"args\"]\n    target = [args[f] for f in ACTIONS[action][\"key\"]]\n    return hashlib.sha256(json.dumps([state[\"task_id\"], action, target]).encode()).hexdigest()[:10]\n\n\ndef finish(state: State, status: str, detail: str) -> State:\n    state[\"status\"] = status\n    log(state[\"task_id\"], status, detail)\n    save(state)\n    return state\n\n\ndef hand_to_person(state: State, reason: str) -> State:\n    QUEUE.append({\"task\": state[\"task_id\"], \"reason\": reason})\n    return finish(state, \"queued\", reason)\n\n\ndef execute(state: State) -> State:\n    action, args = state[\"proposal\"][\"action\"], state[\"proposal\"][\"args\"]\n    tools = READ if state[\"risk\"] == \"read\" else EFFECTS\n    result = tools.call(action, args)\n    if state[\"risk\"] != \"read\":\n        DONE[idem_key(state)] = result\n    return finish(state, \"done\", str(result))"
        },
        {
          "kind": "step",
          "id": "agents23-s6",
          "title": "Write start",
          "text": "Add the prompt and `start`. Read it as a list of exits. An unknown action goes to the review queue. A failed check blocks. A repeated key is skipped. A dry run stops before any effect. An irreversible action pauses. Only a read-only or reversible action that passed everything falls through to `execute`.",
          "lang": "python",
          "file": "src/askpep/patterns/approvals.py",
          "code": "PROMPT = (\n    \"Pick one action from {actions} for: {question}\\n\"\n    \"Write any text with the placeholders {{{{pep}}}}, {{{{title}}}}, {{{{status}}}} and {{{{url}}}}. \"\n    \"Never write a number or a link yourself.\"\n)\n\n\ndef start(task_id: str, question: str, model, dry_run: bool = False) -> State:\n    \"\"\"Propose, check, then execute, pause or stop. Returns the state after the first call.\"\"\"\n    state = new_state(task_id, question, dry_run)\n    prompt = PROMPT.format(actions=\", \".join(ACTIONS), question=question)\n    reply = model([{\"role\": \"user\", \"content\": prompt}])\n    # a copy, so filling never edits the model's reply\n    state[\"proposal\"] = {\"action\": reply.get(\"action\"), \"args\": dict(reply.get(\"args\", {}))}\n    log(task_id, \"proposed\", f\"{state['proposal']['action']} {json.dumps(state['proposal']['args'])}\")\n    if state[\"proposal\"][\"action\"] not in ACTIONS:\n        return hand_to_person(state, f\"no rule covers the action {state['proposal']['action']!r}\")\n    state[\"risk\"] = ACTIONS[state[\"proposal\"][\"action\"]][\"risk\"]\n    reason = run_checks(state)\n    if reason:\n        return finish(state, \"blocked\", reason)\n    if state[\"risk\"] != \"read\" and idem_key(state) in DONE:\n        return finish(state, \"duplicate\", f\"skipped, key {idem_key(state)} already ran\")\n    if state[\"dry_run\"] and state[\"risk\"] != \"read\":\n        approval = \"after approval\" if GUARDS[state[\"risk\"]][\"approval\"] else \"at once\"\n        return finish(state, \"dry_run\", f\"would run {state['proposal']['action']} {approval}, did nothing\")\n    if GUARDS[state[\"risk\"]][\"approval\"]:\n        return finish(state, \"waiting\", \"paused for a person, saved under the task ID\")\n    return execute(state)"
        },
        {
          "kind": "step",
          "id": "agents23-s7",
          "title": "Write resume",
          "text": "Add `resume`. It loads the saved state by task ID and refuses to run unless the status is `waiting`. Then it logs the decision and acts on it. An edit runs the checks again.",
          "lang": "python",
          "file": "src/askpep/patterns/approvals.py",
          "code": "def resume(task_id: str, decision: dict) -> State:\n    \"\"\"The second call. Only the task ID and the decision come in. The state comes from the store.\"\"\"\n    state = json.loads(json.dumps(STORE[task_id]))\n    if state[\"status\"] != \"waiting\":\n        raise ValueError(f\"task {task_id} is {state['status']}, not waiting\")\n    kind = decision[\"decision\"]\n    log(task_id, \"decision\", f\"{kind} by {decision.get('by', 'unknown')}\")\n    if kind == \"reject\":\n        return finish(state, \"rejected\", decision.get(\"reason\", \"no reason given\"))\n    if kind == \"edit\":\n        state[\"proposal\"][\"args\"][\"text\"] = decision[\"text\"]\n        reason = run_checks(state)  # an edit goes through the same checks again\n        if reason:\n            return finish(state, \"blocked\", reason)\n    elif kind != \"approve\":\n        raise ValueError(f\"unknown decision {kind!r}\")\n    return execute(state)"
        },
        {
          "kind": "p",
          "text": "The six cases in the next step reach three exits. Case one passes and posts. Cases two and three are blocked for an invented number and an invented link. Case four is blocked by policy and case five by schema. Case six is an action no rule covers. The pause, the dry run and the duplicate come later."
        },
        {
          "kind": "step",
          "id": "agents23-s8",
          "title": "Try six proposals",
          "text": "Add the sample requests and the first demo. Each case is one scripted proposal. `show` prints the audit rows for it.",
          "lang": "python",
          "file": "src/askpep/patterns/approvals.py",
          "code": "# --- demos ---\n\nFORUM = {\"thread\": \"t-901\", \"pep\": 703, \"text\": \"PEP {{pep}}, {{title}}. {{status}} Details: {{url}}\"}\nMAIL = {\"to\": \"ana@example.org\", \"pep\": 703, \"text\": \"Hello. PEP {{pep}} is accepted. Read it at {{url}}\"}\n\n\ndef post(**over) -> dict:\n    return {\"action\": \"post_forum_answer\", \"args\": {**FORUM, **over}}\n\n\ndef demo_checks(live: bool = False) -> None:\n    reset()\n    cases = [\n        (\"c-1\", \"Answer the GIL thread.\", {\"action\": \"post_forum_answer\", \"args\": FORUM}),\n        (\"c-2\", \"Answer the GIL thread.\", post(text=\"PEP 703 lands in Python 3.14.\")),\n        (\"c-3\", \"Answer the GIL thread.\", post(text=\"More at https://pep-news.example/703\")),\n        (\"c-4\", \"Mail the news.\", {\"action\": \"email_subscriber\", \"args\": {**MAIL, \"to\": \"bob@example.org\"}}),\n        (\"c-5\", \"Mail the news.\", {\"action\": \"email_subscriber\", \"args\": {**MAIL, \"pep\": \"703\"}}),\n        (\"c-6\", \"Remove PEP 8.\", {\"action\": \"delete_pep\", \"args\": {\"pep\": 8}}),\n    ]\n    for task_id, question, reply in cases:\n        start(task_id, question, make_model([reply], live))\n        show(task_id)\n    print(f\"outbox: {OUTBOX}\")\n    print(f\"queue: {QUEUE}\")"
        },
        {
          "kind": "step",
          "id": "agents23-s8r",
          "title": "Run the six proposals",
          "text": "Run the demo. Predict each status before you read it.",
          "lang": "bash",
          "code": "uv run --no-sync python -c \"from askpep.patterns.approvals import demo_checks; demo_checks()\"",
          "expect": "-- c-1: done\n   proposed       post_forum_answer {\"thread\": \"t-901\", \"pep\": 703, \"text\": \"PEP {{pep}}, {{title}}. {{status}} Details: {{url}}\"}\n   check:schema   pass\n   check:policy   pass\n   check:content  pass\n   done           posted to t-901\n-- c-2: blocked\n   proposed       post_forum_answer {\"thread\": \"t-901\", \"pep\": 703, \"text\": \"PEP 703 lands in Python 3.14.\"}\n   check:schema   pass\n   check:policy   pass\n   check:content  '3.14' did not come from a trusted source\n   blocked        content: '3.14' did not come from a trusted source\n-- c-3: blocked\n   proposed       post_forum_answer {\"thread\": \"t-901\", \"pep\": 703, \"text\": \"More at https://pep-news.example/703\"}\n   check:schema   pass\n   check:policy   pass\n   check:content  'https://pep-news.example/703' did not come from a trusted source\n   blocked        content: 'https://pep-news.example/703' did not come from a trusted source\n-- c-4: blocked\n   proposed       email_subscriber {\"to\": \"bob@example.org\", \"pep\": 703, \"text\": \"Hello. PEP {{pep}} is accepted. Read it at {{url}}\"}\n   check:schema   pass\n   check:policy   bob@example.org has not subscribed\n   blocked        policy: bob@example.org has not subscribed\n-- c-5: blocked\n   proposed       email_subscriber {\"to\": \"ana@example.org\", \"pep\": \"703\", \"text\": \"Hello. PEP {{pep}} is accepted. Read it at {{url}}\"}\n   check:schema   field 'pep' must be int, got str\n   blocked        schema: field 'pep' must be int, got str\n-- c-6: queued\n   proposed       delete_pep {\"pep\": 8}\n   queued         no rule covers the action 'delete_pep'\noutbox: ['forum t-901: PEP 703, Making the Global Interpreter Lock Optional. Accepted. Python 3.13 ships an experimental free-threaded build. Details: https://peps.python.org/pep-0703/']\nqueue: [{'task': 'c-6', 'reason': \"no rule covers the action 'delete_pep'\"}]"
        },
        {
          "kind": "p",
          "text": "Case one shows the audit trail of a pass. The `proposed` row still holds the placeholders, and the outbox holds the filled text."
        },
        {
          "kind": "p",
          "text": "Case six never reaches a check. An unknown action has no class, so it has no list of checks. It goes to the review queue. In chapter 22's words, the desk fails closed: it refuses to act when it doesn't know."
        },
        {
          "kind": "step",
          "id": "agents23-s9",
          "title": "Pause, then resume in a second call",
          "text": "Add the pause demo. The first call proposes an email to a subscriber. That is irreversible, so the run pauses. Then the demo throws the state away and calls `resume` with only the task ID and an edit. A second task is rejected.",
          "lang": "python",
          "file": "src/askpep/patterns/approvals.py",
          "code": "def demo_pause(live: bool = False) -> None:\n    reset()\n    model = make_model([{\"action\": \"email_subscriber\", \"args\": MAIL}], live)\n    state = start(\"t-10\", \"Tell ana@example.org that PEP 703 is accepted.\", model)\n    print(f\"call 1: {state['status']}, outbox has {len(OUTBOX)}\")\n    state = None  # the process could end here. Only the store keeps the run.\n    edit = {\"decision\": \"edit\", \"by\": \"sam\", \"text\": \"Hello. PEP {{pep}} is accepted. Details: {{url}}\"}\n    state = resume(\"t-10\", edit)\n    print(f\"call 2: {state['status']}, outbox has {len(OUTBOX)}\")\n    show(\"t-10\")\n    fix = {\"pep\": 703, \"field\": \"status\", \"text\": \"Status is out of date.\"}\n    model = make_model([{\"action\": \"file_index_correction\", \"args\": fix}], live)\n    start(\"t-11\", \"Fix the status of PEP 703.\", model)\n    state = resume(\"t-11\", {\"decision\": \"reject\", \"by\": \"sam\", \"reason\": \"status is current\"})\n    print(f\"call 2: {state['status']}, outbox has {len(OUTBOX)}\")\n    show(\"t-11\")"
        },
        {
          "kind": "step",
          "id": "agents23-s9r",
          "title": "Run the pause",
          "text": "Run the demo. Look for the moment the outbox is still empty, and for the checks that run again after the edit.",
          "lang": "bash",
          "code": "uv run --no-sync python -c \"from askpep.patterns.approvals import demo_pause; demo_pause()\"",
          "expect": "call 1: waiting, outbox has 0\ncall 2: done, outbox has 1\n-- t-10: done\n   proposed       email_subscriber {\"to\": \"ana@example.org\", \"pep\": 703, \"text\": \"Hello. PEP {{pep}} is accepted. Read it at {{url}}\"}\n   check:schema   pass\n   check:policy   pass\n   check:content  pass\n   waiting        paused for a person, saved under the task ID\n   decision       edit by sam\n   check:schema   pass\n   check:policy   pass\n   check:content  pass\n   done           emailed ana@example.org\ncall 2: rejected, outbox has 1\n-- t-11: rejected\n   proposed       file_index_correction {\"pep\": 703, \"field\": \"status\", \"text\": \"Status is out of date.\"}\n   check:schema   pass\n   check:policy   pass\n   check:content  pass\n   waiting        paused for a person, saved under the task ID\n   decision       reject by sam\n   rejected       status is current"
        },
        {
          "kind": "p",
          "text": "Call one ends with the status `waiting` and an empty outbox. The audit log has a `waiting` row. Call two logs the decision and runs all three checks on the edited text. Then the email leaves. The rejected task sends nothing, and its log says who rejected it and why."
        },
        {
          "kind": "widget",
          "id": "agents23-pause-resume",
          "intro": "Run call 1, then decide as the person. Try the edit that adds a version by hand, and see the checks stop it. Then approve, and predict what a redelivered event does."
        },
        {
          "kind": "quiz",
          "id": "agents23-q4",
          "question": "Call 2 of a paused run receives only a task ID and a decision. Where does the rest of the run come from?",
          "options": [
            "From the model, which is asked again.",
            "From the saved state in the store, found by the task ID.",
            "From the person, who retypes the proposal.",
            "From the audit log."
          ],
          "answer": 1,
          "explain": "The state was saved when the run paused. The audit log explains what happened, but the saved state is what the run restarts from."
        },
        {
          "kind": "fold",
          "tone": "hood",
          "title": "Why the saved copy goes through JSON",
          "text": "`save` writes the state through `json.dumps` and `json.loads`. That proves the state can be written out and read back, which a database needs. A state that holds a file handle or a function fails here, in a demo, and not after a crash in production."
        },
        {
          "kind": "p",
          "text": "A paused run survives the wait. Two risks remain: trying a change safely, and a retry that repeats an action. Section 5 covers both, and the log that explains them."
        }
      ]
    },
    {
      "id": "s5-repeat",
      "title": "Dry runs, idempotency keys and the audit log make repeats safe",
      "goal": "How do you try a change safely, and stop a retry repeating an action?",
      "blocks": [
        {
          "kind": "p",
          "text": "Three more guards are in the code already. The dry run skips the effect. The idempotency key makes a retry harmless. The audit log records every proposal, check, decision and outcome. Each needs only a few lines."
        },
        {
          "kind": "code",
          "lang": "python",
          "code": "    if state[\"risk\"] != \"read\" and idem_key(state) in DONE:\n        return finish(state, \"duplicate\", f\"skipped, key {idem_key(state)} already ran\")\n    if state[\"dry_run\"] and state[\"risk\"] != \"read\":\n        approval = \"after approval\" if GUARDS[state[\"risk\"]][\"approval\"] else \"at once\"\n        return finish(state, \"dry_run\", f\"would run {state['proposal']['action']} {approval}, did nothing\")",
          "caption": "The duplicate check and the dry run, from start"
        },
        {
          "kind": "p",
          "text": "A dry run is a mode of the whole run. The model still proposes, and the checks still run. Only the effect is skipped, and the audit log says what would have happened. Use it to try a new prompt or a new rule on real traffic before it can send anything."
        },
        {
          "kind": "step",
          "id": "agents23-s10",
          "title": "Add the dry run demo",
          "text": "Add the demo. The same email is proposed with `dry_run=True`.",
          "lang": "python",
          "file": "src/askpep/patterns/approvals.py",
          "code": "def demo_dry_run(live: bool = False) -> None:\n    reset()\n    model = make_model([{\"action\": \"email_subscriber\", \"args\": MAIL}], live)\n    state = start(\"d-1\", \"Tell ana@example.org that PEP 703 is accepted.\", model, dry_run=True)\n    print(f\"{state['status']}, outbox has {len(OUTBOX)}\")\n    show(\"d-1\")"
        },
        {
          "kind": "step",
          "id": "agents23-s10r",
          "title": "Run the dry run",
          "text": "Run it. The outbox must stay empty.",
          "lang": "bash",
          "code": "uv run --no-sync python -c \"from askpep.patterns.approvals import demo_dry_run; demo_dry_run()\"",
          "expect": "dry_run, outbox has 0\n-- d-1: dry_run\n   proposed       email_subscriber {\"to\": \"ana@example.org\", \"pep\": 703, \"text\": \"Hello. PEP {{pep}} is accepted. Read it at {{url}}\"}\n   check:schema   pass\n   check:policy   pass\n   check:content  pass\n   dry_run        would run email_subscriber after approval, did nothing"
        },
        {
          "kind": "p",
          "text": "Now the retry. Chapter 20's topics deliver at least once, so an event can arrive twice. A model may also word the same email differently the second time. So the key is built from the task, the action and the target. It leaves the wording out, as chapter 7 left out the ticket's body."
        },
        {
          "kind": "p",
          "text": "The duplicate check runs before the pause, so a retry of a finished action never asks the person again. Here the key lives in a dict. In production it lives in a table with a unique constraint, like chapter 7's tickets table. Two workers can race, and a dict can't stop them."
        },
        {
          "kind": "step",
          "id": "agents23-s11",
          "title": "Add the retry demo",
          "text": "Add the demo. It approves one email, then replays the event with different wording.",
          "lang": "python",
          "file": "src/askpep/patterns/approvals.py",
          "code": "def demo_retry(live: bool = False) -> None:\n    reset()\n    model = make_model([{\"action\": \"email_subscriber\", \"args\": MAIL}], live)\n    start(\"r-1\", \"Tell ana@example.org that PEP 703 is accepted.\", model)\n    resume(\"r-1\", {\"decision\": \"approve\", \"by\": \"sam\"})\n    reworded = {**MAIL, \"text\": \"Hi. PEP {{pep}} is accepted: {{url}}\"}  # a retry, with different wording\n    model = make_model([{\"action\": \"email_subscriber\", \"args\": reworded}], live)\n    start(\"r-1\", \"Tell ana@example.org that PEP 703 is accepted.\", model)\n    print(f\"outbox has {len(OUTBOX)}\")\n    show(\"r-1\")"
        },
        {
          "kind": "step",
          "id": "agents23-s11r",
          "title": "Run the retry",
          "text": "Run it. Count the emails in the outbox, and find the row that says why the second event did nothing.",
          "lang": "bash",
          "code": "uv run --no-sync python -c \"from askpep.patterns.approvals import demo_retry; demo_retry()\"",
          "expect": "outbox has 1\n-- r-1: duplicate\n   proposed       email_subscriber {\"to\": \"ana@example.org\", \"pep\": 703, \"text\": \"Hello. PEP {{pep}} is accepted. Read it at {{url}}\"}\n   check:schema   pass\n   check:policy   pass\n   check:content  pass\n   waiting        paused for a person, saved under the task ID\n   decision       approve by sam\n   done           emailed ana@example.org\n   proposed       email_subscriber {\"to\": \"ana@example.org\", \"pep\": 703, \"text\": \"Hi. PEP {{pep}} is accepted: {{url}}\"}\n   check:schema   pass\n   check:policy   pass\n   check:content  pass\n   duplicate      skipped, key 99f772bc5a already ran"
        },
        {
          "kind": "p",
          "text": "The outbox holds one email. The log shows both proposals, and the second ends in `duplicate`. Only the audit log tells this story. Each row names the task, the event and the detail, and a decision row names the person. Rows are only ever appended."
        },
        {
          "kind": "step",
          "id": "agents23-s12",
          "title": "Add the main block",
          "text": "Add the entry point. It runs the five sections in order. Like every module in Part 2, it takes `--live`.",
          "lang": "python",
          "file": "src/askpep/patterns/approvals.py",
          "code": "if __name__ == \"__main__\":\n    import sys\n\n    live = \"--live\" in sys.argv\n    print(\"== classes ==\")\n    show_classes()\n    print(\"\\n== checks ==\")\n    demo_checks(live)\n    print(\"\\n== pause and resume ==\")\n    demo_pause(live)\n    print(\"\\n== dry run ==\")\n    demo_dry_run(live)\n    print(\"\\n== retry ==\")\n    demo_retry(live)"
        },
        {
          "kind": "step",
          "id": "agents23-s12r",
          "title": "Run the whole module",
          "text": "Run the module. The output must match every section above, one after the other.",
          "lang": "bash",
          "code": "uv run --no-sync python -m askpep.patterns.approvals",
          "expect": "== classes ==\nread_pep_section       read          schema+policy, no approval\npost_forum_answer      reversible    schema+policy+content, no approval\nemail_subscriber       irreversible  schema+policy+content, approval\nfile_index_correction  irreversible  schema+policy+content, approval\n\n== checks ==\n-- c-1: done\n   proposed       post_forum_answer {\"thread\": \"t-901\", \"pep\": 703, \"text\": \"PEP {{pep}}, {{title}}. {{status}} Details: {{url}}\"}\n   check:schema   pass\n   check:policy   pass\n   check:content  pass\n   done           posted to t-901\n-- c-2: blocked\n   proposed       post_forum_answer {\"thread\": \"t-901\", \"pep\": 703, \"text\": \"PEP 703 lands in Python 3.14.\"}\n   check:schema   pass\n   check:policy   pass\n   check:content  '3.14' did not come from a trusted source\n   blocked        content: '3.14' did not come from a trusted source\n-- c-3: blocked\n   proposed       post_forum_answer {\"thread\": \"t-901\", \"pep\": 703, \"text\": \"More at https://pep-news.example/703\"}\n   check:schema   pass\n   check:policy   pass\n   check:content  'https://pep-news.example/703' did not come from a trusted source\n   blocked        content: 'https://pep-news.example/703' did not come from a trusted source\n-- c-4: blocked\n   proposed       email_subscriber {\"to\": \"bob@example.org\", \"pep\": 703, \"text\": \"Hello. PEP {{pep}} is accepted. Read it at {{url}}\"}\n   check:schema   pass\n   check:policy   bob@example.org has not subscribed\n   blocked        policy: bob@example.org has not subscribed\n-- c-5: blocked\n   proposed       email_subscriber {\"to\": \"ana@example.org\", \"pep\": \"703\", \"text\": \"Hello. PEP {{pep}} is accepted. Read it at {{url}}\"}\n   check:schema   field 'pep' must be int, got str\n   blocked        schema: field 'pep' must be int, got str\n-- c-6: queued\n   proposed       delete_pep {\"pep\": 8}\n   queued         no rule covers the action 'delete_pep'\noutbox: ['forum t-901: PEP 703, Making the Global Interpreter Lock Optional. Accepted. Python 3.13 ships an experimental free-threaded build. Details: https://peps.python.org/pep-0703/']\nqueue: [{'task': 'c-6', 'reason': \"no rule covers the action 'delete_pep'\"}]\n\n== pause and resume ==\ncall 1: waiting, outbox has 0\ncall 2: done, outbox has 1\n-- t-10: done\n   proposed       email_subscriber {\"to\": \"ana@example.org\", \"pep\": 703, \"text\": \"Hello. PEP {{pep}} is accepted. Read it at {{url}}\"}\n   check:schema   pass\n   check:policy   pass\n   check:content  pass\n   waiting        paused for a person, saved under the task ID\n   decision       edit by sam\n   check:schema   pass\n   check:policy   pass\n   check:content  pass\n   done           emailed ana@example.org\ncall 2: rejected, outbox has 1\n-- t-11: rejected\n   proposed       file_index_correction {\"pep\": 703, \"field\": \"status\", \"text\": \"Status is out of date.\"}\n   check:schema   pass\n   check:policy   pass\n   check:content  pass\n   waiting        paused for a person, saved under the task ID\n   decision       reject by sam\n   rejected       status is current\n\n== dry run ==\ndry_run, outbox has 0\n-- d-1: dry_run\n   proposed       email_subscriber {\"to\": \"ana@example.org\", \"pep\": 703, \"text\": \"Hello. PEP {{pep}} is accepted. Read it at {{url}}\"}\n   check:schema   pass\n   check:policy   pass\n   check:content  pass\n   dry_run        would run email_subscriber after approval, did nothing\n\n== retry ==\noutbox has 1\n-- r-1: duplicate\n   proposed       email_subscriber {\"to\": \"ana@example.org\", \"pep\": 703, \"text\": \"Hello. PEP {{pep}} is accepted. Read it at {{url}}\"}\n   check:schema   pass\n   check:policy   pass\n   check:content  pass\n   waiting        paused for a person, saved under the task ID\n   decision       approve by sam\n   done           emailed ana@example.org\n   proposed       email_subscriber {\"to\": \"ana@example.org\", \"pep\": 703, \"text\": \"Hi. PEP {{pep}} is accepted: {{url}}\"}\n   check:schema   pass\n   check:policy   pass\n   check:content  pass\n   duplicate      skipped, key 99f772bc5a already ran"
        },
        {
          "kind": "p",
          "text": "The last guard is the review queue. A case the rules don't cover goes there with its reason, and the desk does nothing else. A model that proposes `delete_pep` is outside the action table. Code can't say what is safe to do, so it asks a person."
        },
        {
          "kind": "quiz",
          "id": "agents23-q5",
          "question": "A retry words the same email differently. Which key still catches it?",
          "options": [
            "A hash of the full text.",
            "A hash of the task ID, the action and the target.",
            "A random ID made on each call.",
            "The time of the call."
          ],
          "answer": 1,
          "explain": "The wording changes between attempts, and so do random IDs and times. Only the task and the target stay the same. That is what a repeat has in common with the original."
        },
        {
          "kind": "p",
          "text": "Every guard works in the demos. Section 6 shows how each one fails in production."
        }
      ]
    },
    {
      "id": "s6-breaks",
      "title": "Each guard fails in a known way, with a fix cheaper than a bigger model",
      "goal": "Where do the action guards break, and what does each break cost?",
      "blocks": [
        {
          "kind": "p",
          "text": "Every guard here is plain code, so none adds a model call. In the demos each proposal costs one scripted model call. The real cost is a person's time. An irreversible action waits for as long as the person takes. Nothing runs while it waits, because the state sits in the store."
        },
        {
          "kind": "compare",
          "caption": "Where the action guards break and the fix for each",
          "columns": [
            "Failure",
            "What you see",
            "The fix"
          ],
          "rows": [
            [
              "Approval fatigue",
              "A person approves forty emails in a minute without reading",
              "Keep the irreversible class small, and show the checks and the text with each request"
            ],
            [
              "A wrong class",
              "An action marked reversible proves to be permanent",
              "Classify by the worst case, and review the action table like any other code"
            ],
            [
              "State changes during the pause",
              "A subscriber leaves while the email waits, and the approval still sends it",
              "Run the policy check again when the run resumes"
            ],
            [
              "A key that is too fine",
              "Two near-identical emails to the same person both go out",
              "Key on the target and leave the wording out"
            ],
            [
              "A claim in words",
              "The text says a PEP was rejected, and the content check passes it",
              "Fill facts in code, and keep approval for the irreversible class"
            ]
          ]
        },
        {
          "kind": "p",
          "text": "The third row is a real gap in the reference code. `resume` runs the checks again only after an edit. An approval doesn't recheck policy. Lab step 4 asks you to close it."
        },
        {
          "kind": "quiz",
          "id": "agents23-q6",
          "question": "A person approves forty emails in a row in under a minute. Which fix helps most?",
          "options": [
            "Add a second approval step for the same emails.",
            "Shrink the irreversible class so fewer actions need approval, and show the checks and the text with each request.",
            "Remove approval for emails.",
            "Ask the model to rank the emails by risk."
          ],
          "answer": 1,
          "explain": "Approval only works if a person reads it. Too many requests teach people to click through. Send fewer, and show them what they need to decide."
        },
        {
          "kind": "callout",
          "tone": "warn",
          "title": "An approval you can't see is not a guard",
          "text": "If the audit log doesn't name who decided and what they saw, you can't tell a real approval from a click. Log the person, the decision and the text that was approved."
        },
        {
          "kind": "p",
          "text": "These breaks are what an interviewer probes. Section 7 puts the chapter into one answer."
        }
      ]
    },
    {
      "id": "s7-interview",
      "title": "In an interview, name the action's class before you name the guard",
      "goal": "How do you explain action guards in thirty seconds, and what does the pause look like in LangGraph?",
      "blocks": [
        {
          "kind": "p",
          "text": "Action guards come up in interviews, usually as a question about stopping an agent doing harm. Start with the actions. Say which are read-only, which are reversible and which are irreversible. Then say which guards each class gets. That shows you guard the output as well as the prompt."
        },
        {
          "kind": "callout",
          "tone": "interview",
          "title": "The 30-second answer",
          "text": "I classify every action as read-only, reversible or irreversible, and the class picks the guards. Each action gets schema, policy and content checks, and code fills the facts. Irreversible actions pause, save under the task ID and resume on approve, edit or reject. I add a dry run, an idempotency key and an audit log. Uncovered cases go to a review queue."
        },
        {
          "kind": "p",
          "text": "Frameworks package the pause. In LangGraph a node calls `interrupt()`, which stops the run so the checkpointer can save it. You resume with `Command(resume=...)` on the same thread, and `interrupt()` returns the decision."
        },
        {
          "kind": "code",
          "lang": "python",
          "code": "from langgraph.checkpoint.memory import InMemorySaver\nfrom langgraph.types import Command, interrupt\n\n\ndef approve(state):\n    decision = interrupt({\"proposal\": state[\"proposal\"], \"why\": \"irreversible\"})\n    if decision[\"decision\"] == \"reject\":\n        return {\"status\": \"rejected\"}\n    return {\"status\": \"approved\", \"proposal\": decision.get(\"edited\", state[\"proposal\"])}\n\n\ngraph = builder.compile(checkpointer=InMemorySaver())\nconfig = {\"configurable\": {\"thread_id\": \"t-10\"}}\ngraph.invoke({\"proposal\": proposal}, config)  # runs to interrupt() and stops\ngraph.invoke(Command(resume={\"decision\": \"approve\"}), config)  # same thread, carries on",
          "caption": "The same pause in LangGraph"
        },
        {
          "kind": "p",
          "text": "There is one trap. On resume, LangGraph runs the node again from its first line. Anything before the `interrupt()` call runs twice. So keep side effects out of that part of the node, or give them an idempotency key. The key from this chapter does that job."
        },
        {
          "kind": "p",
          "text": "A checkpointer is required, as in chapter 7. The thread ID plays the part of the task ID. Use a database-backed checkpointer in production, because the in-memory one dies with the process."
        },
        {
          "kind": "p",
          "text": "That ends Part 2. You built each architecture by hand, scored its path and guarded what it may touch and send. Each piece worked on the PEP desk, where a mistake is embarrassing. How do these pieces combine into one desk that moves money? PayDesk 1 (chapter 24) opens the capstone with that question."
        }
      ]
    }
  ],
  "lab": {
    "title": "Change the guards and watch the action",
    "goal": "Run the module, then break it three ways. Each step runs offline. Compare your file with `capstone/src/askpep/patterns/approvals.py` in the my-learn folder.",
    "minutes": 25,
    "files": [
      "src/askpep/patterns/approvals.py"
    ],
    "steps": [
      {
        "title": "Run it unchanged",
        "text": "Run the module and compare each section with the chapter. The statuses and the outbox counts must match.",
        "code": "uv run --no-sync python -m askpep.patterns.approvals"
      },
      {
        "title": "Reclassify the email",
        "text": "In `ACTIONS`, change the risk of `email_subscriber` from `\"irreversible\"` to `\"reversible\"`. Predict what `demo_pause` does before you run it. The email now leaves at once, so the run prints `call 1: done, outbox has 1`. Then `resume` raises `ValueError: task t-10 is done, not waiting`, and the run stops before the dry run. Read the error, then change it back.",
        "code": "uv run --no-sync python -m askpep.patterns.approvals"
      },
      {
        "title": "Sneak in a trusted number",
        "text": "In `demo_checks`, change the text of case two to `PEP 703 ships in Python 3.13.` Predict the status. The run prints `c-2: done`, because 3.13 appears in the trusted status text. The check tests where a number could come from, not whether the claim is right. Write down which guard would catch this.",
        "code": "uv run --no-sync python -m askpep.patterns.approvals"
      },
      {
        "title": "Close the gap on resume",
        "text": "In `resume`, just above the last line, add `if kind == \"approve\":`. Under it, set `reason = CHECKS[\"policy\"](state)`, and return `finish(state, \"blocked\", f\"policy: {reason}\")` if `reason` is set. In `demo_pause`, add `STORE[\"t-10\"][\"subscribers\"] = []` just above `state = None`, and change `edit` to `{\"decision\": \"approve\", \"by\": \"sam\"}`. Predict call 2. It prints `call 2: blocked, outbox has 0`, because the subscriber left during the pause.",
        "code": "uv run --no-sync python -m askpep.patterns.approvals"
      }
    ],
    "verify": "uv run --no-sync python -m askpep.patterns.approvals"
  },
  "recap": [
    "An action guard checks each proposed action before it runs, and blocks it or holds it.",
    "Code sets each action's risk class, read-only, reversible or irreversible, by whether the system can take it back.",
    "The model drafts with placeholders, and code fills every number and link from a trusted source.",
    "Schema, policy and content checks run in order, and a failure blocks the action and records why.",
    "An irreversible action pauses its run under the task ID and resumes on a person's approve, edit or reject.",
    "A dry run, an idempotency key, an audit log and the review queue make the desk safe to repeat and easy to explain.",
    "Each guard fails in a known way, and the fix is code or a smaller irreversible class, not a bigger model."
  ],
  "reinforcement": "I am becoming a forward-deployed AI engineer. In guardrails on actions I learned that code, not the model, decides what leaves the system: classify every action by whether it can be taken back, fill facts in code, check the output, and make a person approve what is irreversible. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  "interviewIds": [
    "agents-c23-q01",
    "agents-c23-q02",
    "agents-c23-q03",
    "agents-c23-q04"
  ]
};

export default chapter;
