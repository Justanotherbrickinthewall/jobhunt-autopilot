import type { Chapter } from "../types";

const chapter: Chapter = {
  "id": "agents-20-event-driven",
  "course": "agents",
  "number": 20,
  "title": "Back-office agents wake on a schedule and pull work from a topic",
  "tagline": "How do agents run work nobody is waiting for, from a schedule or a topic? Build a simulated clock, a topic with offsets and a pull consumer by hand, then make a crash and a bad event harmless.",
  "minutes": 60,
  "objectives": [
    "Say what starts a back-office agent, and keep the schedule apart from the agent.",
    "Explain why a topic sits between the schedule and the agents.",
    "Build a simulated clock and a topic with one offset per consumer group.",
    "Write a consumer that commits last, and size a group by its partitions.",
    "Keep pull against push apart from point-to-point against publish-subscribe.",
    "Show a crash repeat an event, then stop the repeat with an idempotency key.",
    "Cap retries and park an event that keeps failing on a dead-letter list.",
    "Give the 30-second answer, and map the build to deployed pieces."
  ],
  "sections": [
    {
      "id": "s1-problem",
      "title": "A back-office agent starts at a clock or an event and not at a user",
      "goal": "What starts an agent when nobody is waiting for an answer?",
      "blocks": [
        {
          "kind": "p",
          "text": "Chapter 19 ended on a question. What about work that no user asks for, which arrives on a schedule? Every run so far began with a person who asked a question. This chapter asks how agents run work that nobody is waiting for."
        },
        {
          "kind": "p",
          "text": "Call such an agent a back-office agent. It starts because a clock says so, or because something changed. Its answer goes to a mailbox or another system, not to a screen."
        },
        {
          "kind": "p",
          "text": "The PEP desk has one. Each night at 02:00 a job finds the PEPs that changed today. For each one it writes an event, a small record that says something happened. It puts the events on a **topic**, which is a named, ordered list of events. Agents then summarise each changed PEP, one event at a time."
        },
        {
          "kind": "p",
          "text": "Three questions follow. What fires the job? Where do the events wait? What happens when an agent dies halfway through one? The standard library answers all three, with no framework."
        },
        {
          "kind": "callout",
          "tone": "insight",
          "title": "The schedule is not the agent",
          "text": "The schedule is a few lines of ordinary code. It decides nothing and calls no model. The agent starts later, once for each event. Keep that split and each part is easy to test."
        },
        {
          "kind": "p",
          "text": "What starts a run is separate from how the run works. The run an event starts can use any pattern from chapters 11 to 19. Here it is a small deterministic workflow, as in chapter 12."
        },
        {
          "kind": "quiz",
          "id": "agents20-q1",
          "question": "Which of these is a back-office agent?",
          "options": [
            "A chat agent that answers a question about PEP 8.",
            "A job at 02:00 that puts one summary event on a topic for each PEP changed today.",
            "A ReAct loop a researcher starts by hand.",
            "A router that picks lookup or refuse for one question."
          ],
          "answer": 1,
          "explain": "The nightly job starts at a clock and has no user waiting. The other three begin with a person who is present, and the answer goes back to that person."
        },
        {
          "kind": "p",
          "text": "The next section asks why the events go on a topic and not straight to an agent."
        }
      ]
    },
    {
      "id": "s2-queue",
      "title": "A topic sits between the schedule and the agents because a schedule makes a burst",
      "goal": "Why put a topic between the schedule and the agents, and how does each reader keep its place?",
      "blocks": [
        {
          "kind": "p",
          "text": "At 02:00 the job publishes every changed PEP at once. On the PEP desk that is three events, and on a larger system it can be thousands. If the schedule called an agent directly, the agent would take the whole burst. Calls it couldn't take would time out."
        },
        {
          "kind": "p",
          "text": "A topic absorbs the burst. The schedule writes its events and is done. A **consumer** reads events from a topic, at its own pace. If a consumer is slow or down, the events wait on the topic."
        },
        {
          "kind": "p",
          "text": "The second reason is practical. A platform often runs topics already, so one more adds nothing new to run, secure or pay for. Say that in an interview, because it is a fair reason."
        },
        {
          "kind": "p",
          "text": "Four parts make the design. A **schedule** is a timer that starts a run at fixed times. The topic holds the events in order. A **consumer group** splits one topic so each event goes to one member. A consumer calls `poll` to get an event, does the work, then calls `commit`."
        },
        {
          "kind": "p",
          "text": "The group keeps one **offset**, the position of the next event the group has not finished. `poll` returns the event at that position and does not move it. `commit` says the event is finished and moves the offset on by one. A consumer that never commits gets the same event again."
        },
        {
          "kind": "p",
          "text": "**Lag** is the number of events the group has not committed yet. A lag that keeps growing means the consumers are slower than the schedule."
        },
        {
          "kind": "fold",
          "tone": "industry",
          "title": "Log-based streams and managed message queues keep the same book differently",
          "text": "A log-based stream keeps every event in order and gives each group an offset. A managed message queue usually hides a message for a while after delivery. It removes the message when the worker acknowledges it. The idea is the same: work is not finished until you say so. Only the book-keeping differs."
        },
        {
          "kind": "quiz",
          "id": "agents20-q2",
          "question": "What does lag measure?",
          "options": [
            "How long the model takes to answer one event.",
            "How many events the group has not yet committed.",
            "How many seconds the schedule runs late.",
            "How many events were dead-lettered."
          ],
          "answer": 1,
          "explain": "Lag is the topic's length minus the group's offset. A lag that grows tells you the consumers are slower than the schedule."
        },
        {
          "kind": "p",
          "text": "The next section writes the clock and the topic in a few dozen lines."
        }
      ]
    },
    {
      "id": "s3-clock-topic",
      "title": "A simulated clock and a topic with an offset per group fit in one screen of code",
      "goal": "How little code do a clock and a topic need?",
      "blocks": [
        {
          "kind": "p",
          "text": "Work in your own AskPEP repository, next to `kit.py` and `workflow.py`. The reference is `capstone/src/askpep/patterns/events.py` in the my-learn folder. Your file should match it."
        },
        {
          "kind": "p",
          "text": "Real time would change the output on every run. So the clock is a number of minutes, and `tick` moves it on by one. A job is a function. When the clock reaches the job's time of day, `tick` calls it."
        },
        {
          "kind": "p",
          "text": "The topic is a list and a dict. The list is the topic's log, and `publish` appends to it. The dict holds one offset for each group name. Two groups can read the same log, and neither moves the other's offset."
        },
        {
          "kind": "step",
          "id": "agents20-s1",
          "title": "Write the clock and the topic",
          "text": "Start `events.py`. It imports `new_state`, `node` and `run_graph` from chapter 12's `workflow.py`, because each event runs a small workflow. `Clock.daily` registers a job. `Topic.poll` returns the next uncommitted event and does not move the offset. `Topic.commit` moves it on.",
          "lang": "python",
          "file": "src/askpep/patterns/events.py",
          "code": "\"\"\"Event-driven agents on the PEP desk: a schedule fills a topic and consumers pull work from it.\n\nStandard library only. A simulated clock drives the schedule, so the output is the same on every run.\nEach event runs a small workflow like the one in workflow.py.\n\"\"\"\n\nimport sys\nfrom collections.abc import Callable\n\nfrom askpep.patterns.kit import fake_pep_tools, make_model\nfrom askpep.patterns.workflow import new_state, node, run_graph\n\nTOOLS = fake_pep_tools()\nMAX_TRIES = 3\nLIVE = \"--live\" in sys.argv\n\n\ndef to_minutes(hhmm: str) -> int:\n    h, m = hhmm.split(\":\")\n    return int(h) * 60 + int(m)\n\n\nclass Clock:\n    \"\"\"A simulated clock in whole minutes. tick() moves it on and fires the jobs that are due.\"\"\"\n\n    def __init__(self, start: str = \"01:58\"):\n        self.now = to_minutes(start)\n        self.jobs: list[tuple[int, Callable]] = []\n\n    def daily(self, hhmm: str, job: Callable) -> None:\n        self.jobs.append((to_minutes(hhmm), job))\n\n    def stamp(self) -> str:\n        day, minute = divmod(self.now, 1440)\n        return f\"day {day + 1} {minute // 60:02d}:{minute % 60:02d}\"\n\n    def tick(self) -> None:\n        self.now += 1\n        for at, job in self.jobs:\n            if self.now % 1440 == at:\n                job()\n\n\nclass Topic:\n    \"\"\"An append-only log. Each consumer group keeps an offset: the index of its next uncommitted event.\"\"\"\n\n    def __init__(self, name: str):\n        self.name = name\n        self.log: list[dict] = []\n        self.offsets: dict[str, int] = {}\n\n    def publish(self, key: str, payload: dict) -> None:\n        self.log.append({\"key\": key, \"payload\": payload})\n\n    def poll(self, group: str) -> dict | None:\n        \"\"\"The next uncommitted event. Polling twice with no commit returns the same event.\"\"\"\n        i = self.offsets.get(group, 0)\n        return self.log[i] if i < len(self.log) else None\n\n    def commit(self, group: str) -> None:\n        self.offsets[group] = self.offsets.get(group, 0) + 1\n\n    def lag(self, group: str) -> int:\n        return len(self.log) - self.offsets.get(group, 0)\n"
        },
        {
          "kind": "p",
          "text": "Neither one does any work. The next section adds the work and the consumer."
        }
      ]
    },
    {
      "id": "s4-consumer",
      "title": "A consumer polls, works and commits, and the commit comes last",
      "goal": "What does a consumer do with one event, and why must the commit come last?",
      "blocks": [
        {
          "kind": "p",
          "text": "Each event runs three nodes, as a deterministic workflow from chapter 12. `fetch` reads the PEP's summary. `summarise` asks the model for one line. `notify` appends a mail to an outbox, which stands in for any side effect. The edges are fixed in code."
        },
        {
          "kind": "p",
          "text": "`handle` builds a fresh state for each event. The event's key is its request ID, which plays the task ID from chapter 10. `run_graph` saves the state under that ID after every node, so each run keeps its own record."
        },
        {
          "kind": "p",
          "text": "`consume` handles one event. It polls, runs the workflow and commits as its last line. Putting the commit last is the whole safety story. Work that did not finish is never marked finished."
        },
        {
          "kind": "step",
          "id": "agents20-s2",
          "title": "Add the work and the consumer",
          "text": "The three nodes register themselves with `node`. `handle` builds a state for one event and runs the graph. `consume` wraps it with the commit. Leave in the `idempotent`, `crash_on` and retry parts, because sections 6 and 7 use them. `OUTBOX` collects the mails, so you can count the side effects.",
          "lang": "python",
          "file": "src/askpep/patterns/events.py",
          "code": "# --- the work: one small workflow per event ---\n\nOUTBOX: list[str] = []  # the side effect, one mail per summary\nSEEN: set[str] = set()  # idempotency keys of events already handled\nTRIES: dict[str, int] = {}\nDEAD: list[dict] = []\n\n\nclass Crash(Exception):\n    \"\"\"The consumer process dies. The offset is not committed.\"\"\"\n\n\n@node\ndef fetch(state, _):\n    fact = TOOLS.call(\"read_pep_section\", {\"pep\": state[\"pep\"], \"section\": \"summary\"})\n    if str(fact).startswith(\"ToolError\"):\n        raise ValueError(fact)\n    state[\"fact\"] = fact\n\n\n@node\ndef summarise(state, model):\n    prompt = f\"Summarise in one line: {state['fact']}\"\n    state[\"answer\"] = model([{\"role\": \"user\", \"content\": prompt}])[\"answer\"]\n    state[\"status\"] = \"done\"\n\n\n@node\ndef notify(state, _):\n    OUTBOX.append(f\"PEP {state['pep']}: {state['answer']}\")\n\n\nSUMMARY = {\"fetch\": \"summarise\", \"summarise\": \"notify\", \"notify\": \"end\"}\n\n\ndef handle(event: dict, model, idempotent: bool) -> str:\n    key = event[\"key\"]\n    if idempotent and key in SEEN:\n        return f\"skip {key} (already done)\"\n    state = new_state(key, f\"Summarise PEP {event['payload']['pep']}\")\n    state[\"pep\"] = event[\"payload\"][\"pep\"]\n    run_graph(state, SUMMARY, model, \"fetch\")\n    # shortcut: the key is set after the effect, so a crash between the two repeats it; use one transaction\n    SEEN.add(key)\n    return f\"done {key}\"\n\n\ndef consume(topic: Topic, group: str, model, idempotent: bool = False, crash_on: set | None = None) -> str:\n    \"\"\"One pull: poll, process, commit. A crash skips the commit. A failure retries, then dead-letters.\"\"\"\n    event = topic.poll(group)\n    if event is None:\n        return \"idle\"\n    key = event[\"key\"]\n    try:\n        result = handle(event, model, idempotent)\n    except Exception as exc:\n        TRIES[key] = TRIES.get(key, 0) + 1\n        if TRIES[key] < MAX_TRIES:\n            return f\"fail {key} try {TRIES[key]}: {exc}\"\n        DEAD.append({\"key\": key, \"reason\": str(exc)})\n        topic.commit(group)  # moving on is the point of a dead-letter list\n        return f\"dead-letter {key} after {TRIES[key]} tries\"\n    if crash_on and key in crash_on:\n        crash_on.discard(key)\n        raise Crash(f\"consumer died after the work on {key}\")\n    topic.commit(group)\n    return result\n\n\ndef reset() -> None:\n    OUTBOX.clear()\n    SEEN.clear()\n    TRIES.clear()\n    DEAD.clear()\n"
        },
        {
          "kind": "step",
          "id": "agents20-s3",
          "title": "Add the nightly job and the first demo",
          "text": "`changed_today` stands in for a query on the PEP store. `nightly_job` publishes one event per changed PEP, with a key that names the PEP and the day. `demo_schedule` ticks the clock and lets the consumer take one event per tick. It then polls and commits once for a second group, `audit`, to show the two offsets are separate.",
          "lang": "python",
          "file": "src/askpep/patterns/events.py",
          "code": "def changed_today() -> list[int]:\n    \"\"\"Stands in for a query on the PEP store. Three PEPs changed today.\"\"\"\n    return [8, 572, 703]\n\n\ndef nightly_job(clock: Clock, topic: Topic) -> None:\n    day = clock.stamp().split()[1]\n    for pep in changed_today():\n        topic.publish(f\"pep-{pep}-day{day}\", {\"pep\": pep})\n    print(f\"{clock.stamp()}  schedule fired, published {len(topic.log)} events\")\n\n\nSUMMARIES = [\n    {\"answer\": \"Style rules for Python code.\"},\n    {\"answer\": \"Adds the walrus operator.\"},\n    {\"answer\": \"Makes the GIL optional.\"},\n]\n\n\ndef demo_schedule() -> None:\n    reset()\n    clock, topic = Clock(\"01:58\"), Topic(\"pep_changed\")\n    clock.daily(\"02:00\", lambda: nightly_job(clock, topic))\n    model = make_model(SUMMARIES, LIVE)\n    for _ in range(6):\n        clock.tick()\n        print(f\"{clock.stamp()}  lag {topic.lag('summaries')}  {consume(topic, 'summaries', model)}\")\n    # A second group has its own offset, so it reads the same log from the start.\n    topic.poll(\"audit\")\n    topic.commit(\"audit\")\n    print(f\"offsets: {topic.offsets}\")\n    print(f\"outbox: {len(OUTBOX)} mails\")\n"
        },
        {
          "kind": "p",
          "text": "To go faster, add consumers to the group. A real topic is split into **partitions**, which are ordered slices of its log. Inside a group, one consumer reads a partition at a time. So two partitions keep at most two consumers of a group busy. The topic you built has one."
        },
        {
          "kind": "widget",
          "id": "agents20-drain-time",
          "intro": "Six bursts follow, each with its own number of consumers or partitions. Predict how long the topic takes to empty. Watch the cases where more consumers don't help, and the case with no topic at all."
        },
        {
          "kind": "quiz",
          "id": "agents20-q3",
          "question": "A topic has 2 partitions and a group has 5 consumers. How many consumers get work?",
          "options": [
            "5, because every consumer in a group shares the log.",
            "2, because one consumer reads a partition at a time.",
            "1, because a group has one active consumer.",
            "0, until the group is renamed."
          ],
          "answer": 1,
          "explain": "A partition goes to one consumer in the group at a time. The other three wait as spares. To use five consumers you need at least five partitions."
        },
        {
          "kind": "p",
          "text": "Our consumer asks the topic for each event. The next section names the other ways events reach a worker."
        }
      ]
    },
    {
      "id": "s5-pull-push",
      "title": "Pull against push is a different axis from point-to-point against publish-subscribe",
      "goal": "Who starts each exchange, and who gets a copy of each event?",
      "blocks": [
        {
          "kind": "p",
          "text": "Two questions describe how events reach a worker. The first is who starts the exchange. In **pull**, the worker asks for work when it's ready. In **push**, the sender delivers work as it arrives. Our consumer calls `poll`, so it pulls."
        },
        {
          "kind": "p",
          "text": "Chapter 10's map said a schedule or a work queue starts each event-driven run. A work queue is plain words for a topic that workers pull tasks from. It is not chapter 12's review queue, which holds items for a person."
        },
        {
          "kind": "p",
          "text": "The second question is who gets a copy. In **point-to-point**, each event goes to one worker. In **publish-subscribe**, every subscriber or group gets its own copy. The two questions are independent, and candidates often blur them."
        },
        {
          "kind": "compare",
          "caption": "The two questions give four cells, each with a common generic example.",
          "columns": [
            "Who starts the exchange",
            "Each event goes to one worker",
            "Each group gets every event"
          ],
          "rows": [
            [
              "Pull: the worker asks when it's ready",
              "A managed message queue. Workers ask for a message, and each message goes to one of them.",
              "A log-based stream. Each group asks from its own offset, so every group sees every event."
            ],
            [
              "Push: the sender delivers as events arrive",
              "A webhook to one URL. The sender picks the moment, and one receiver gets the event.",
              "Webhooks to many URLs. The sender calls every subscriber, and each one gets its own call."
            ]
          ]
        },
        {
          "kind": "p",
          "text": "A log-based stream sits in two cells at once. Inside a group it shares events among the consumers, which is point-to-point. Across groups it copies them, which is publish-subscribe. In both cases the consumers pull."
        },
        {
          "kind": "p",
          "text": "Pull suits agents. A model call is slow and uneven. A pull consumer takes one event only when it is free, so a burst can't overload it. A push sender sets the pace, and the agent must refuse or buffer what it can't take."
        },
        {
          "kind": "widget",
          "id": "agents20-pull-push",
          "intro": "Six systems follow, each with four possible cells. Place each one. Watch for the webhook sent to three subscribers, which is push and still publish-subscribe."
        },
        {
          "kind": "quiz",
          "id": "agents20-q4",
          "question": "A teammate says a log-based stream is publish-subscribe, so it must be push. What is wrong?",
          "options": [
            "Nothing. Publish-subscribe always means push.",
            "Pull or push is a separate axis. Consumers of a log-based stream pull, and they pull from their own offsets.",
            "Streams are point-to-point only.",
            "Push means the consumer keeps the offset."
          ],
          "answer": 1,
          "explain": "Who starts the exchange and who gets a copy are different questions. A stream can copy events to many groups and still have each group ask for its next batch."
        },
        {
          "kind": "p",
          "text": "Pulling one event at a time protects the agent from a burst, but not from a crash. The next section causes one on purpose."
        }
      ]
    },
    {
      "id": "s6-delivery",
      "title": "A crash before the commit repeats the event, so the work must be safe to run twice",
      "goal": "What happens when a consumer dies after the work and before the commit?",
      "blocks": [
        {
          "kind": "p",
          "text": "When the commit comes last, a crash after the work and before the commit brings the event back. This is called **at-least-once** delivery. It delivers every event, maybe twice, and loses none."
        },
        {
          "kind": "p",
          "text": "The other choice is **at-most-once**. The consumer commits first and works second, so it delivers each event once or never. A crash between the two loses the event. For money or mail, a lost event is usually worse than a repeat."
        },
        {
          "kind": "p",
          "text": "So make the repeat harmless with an idempotency key, from chapter 7. There it was a label built from what the request asks for. Here the request is an event. The consumer records the keys it has finished, and a repeat finds its key and does nothing."
        },
        {
          "kind": "p",
          "text": "The crash demo keys each event by its PEP, such as `pep-572`. The nightly job adds the day, as in `pep-572-day1`, so tomorrow's change to the same PEP counts as a new event."
        },
        {
          "kind": "step",
          "id": "agents20-s4",
          "title": "Crash after the work and before the commit",
          "text": "`run_until_idle` is the consumer process. When `consume` raises `Crash`, it prints the crash and polls again, as a restarted process would. `demo_crash` crashes once on `pep-572`, after the work and before the commit. The entry point runs it with the key off, then on. The next step runs everything.",
          "lang": "python",
          "file": "src/askpep/patterns/events.py",
          "code": "def run_until_idle(topic: Topic, group: str, model, idempotent: bool, crash_on: set) -> None:\n    while True:\n        try:\n            result = consume(topic, group, model, idempotent, crash_on)\n        except Crash as crash:\n            print(f\"  crash: {crash}\")\n            continue  # the process restarts and polls again\n        print(f\"  {result}\")\n        if result == \"idle\":\n            break\n\n\ndef demo_crash(idempotent: bool) -> None:\n    reset()\n    topic = Topic(\"pep_changed\")\n    for pep in changed_today():\n        topic.publish(f\"pep-{pep}\", {\"pep\": pep})\n    replies = SUMMARIES[:2] + [{\"answer\": \"Adds the walrus operator.\"}] + SUMMARIES[2:]\n    model = make_model(replies if not idempotent else SUMMARIES, LIVE)\n    run_until_idle(topic, \"summaries\", model, idempotent, {\"pep-572\"})\n    print(f\"  mails sent: {len(OUTBOX)}, model calls: {model.n_calls}\")\n"
        },
        {
          "kind": "widget",
          "id": "agents20-redelivery",
          "intro": "Six crashes follow. For each one, predict how many mails go out for that one event. Watch the case where the key exists but is stored after the mail, and the case where the consumer commits first."
        },
        {
          "kind": "fold",
          "tone": "hood",
          "title": "The idempotency key in this build still has a gap",
          "text": "The code sets the key after the work. A crash between the mail and the key still repeats the mail. The reference marks this with a shortcut comment. In production, store the key and the effect in one database transaction. Or pass the key to the mail service, so it refuses a second send."
        },
        {
          "kind": "quiz",
          "id": "agents20-q5",
          "question": "The consumer crashes after the work and before the commit. The handler uses an idempotency key. What happens on redelivery?",
          "options": [
            "The work runs again and sends a second mail.",
            "The handler finds the key and does nothing, then the consumer commits.",
            "The event is dead-lettered at once.",
            "The offset moves back to the start."
          ],
          "answer": 1,
          "explain": "The key was stored right after the work, before the crash. The repeat finds it and does nothing, and the commit then moves the offset on. The model isn't called again, which also saves tokens."
        },
        {
          "kind": "p",
          "text": "A crashed event deserves a fresh try. Some events fail every time, and the next section stops them blocking the rest."
        }
      ]
    },
    {
      "id": "s7-retries",
      "title": "Retries need a cap, and a dead-letter list holds the events that keep failing",
      "goal": "What stops one bad event from blocking every event behind it?",
      "blocks": [
        {
          "kind": "p",
          "text": "Some failures never clear. PEP 999 is not on the desk, so every attempt fails the same way. Without a cap, the consumer retries that one event for ever. Every event behind it waits."
        },
        {
          "kind": "p",
          "text": "The cap is `MAX_TRIES`, and `TRIES` counts failures for each event key. Below the cap, `consume` doesn't commit, so the same event comes round again. At the cap, the event goes to the **dead-letter list**, `DEAD`, and the offset moves on."
        },
        {
          "kind": "p",
          "text": "The dead-letter list is where an event goes after it fails `MAX_TRIES` times, for a person to inspect. Managed services call it a dead-letter queue. Chapter 12's review queue holds requests that code refused to route, and this list holds events whose work kept failing."
        },
        {
          "kind": "p",
          "text": "A crash is not a failure here. The process died, and the event deserves a fresh try. A failure is an exception raised by the work. Only failures count toward the cap."
        },
        {
          "kind": "step",
          "id": "agents20-s5",
          "title": "Add the retry demo and run the file",
          "text": "`demo_retries` publishes one bad event, `pep-999`, then a good one. The fake tool returns a `ToolError` string, and `fetch` turns that into an exception. Add the entry point and run all four demos. Compare every line with the output below.",
          "lang": "python",
          "file": "src/askpep/patterns/events.py",
          "code": "def demo_retries() -> None:\n    reset()\n    topic = Topic(\"pep_changed\")\n    topic.publish(\"pep-999\", {\"pep\": 999})\n    topic.publish(\"pep-703\", {\"pep\": 703})\n    model = make_model([SUMMARIES[2]], LIVE)\n    run_until_idle(topic, \"summaries\", model, True, set())\n    print(f\"  dead letters: {DEAD}\")\n\n\nif __name__ == \"__main__\":\n    print(\"== schedule, topic and consumer ==\")\n    demo_schedule()\n    print(\"\\n== crash after the work, no idempotency key ==\")\n    demo_crash(False)\n    print(\"\\n== crash after the work, with an idempotency key ==\")\n    demo_crash(True)\n    print(\"\\n== retries and a dead-letter list ==\")\n    demo_retries()\n",
          "expect": "== schedule, topic and consumer ==\nday 1 01:59  lag 0  idle\nday 1 02:00  schedule fired, published 3 events\nday 1 02:00  lag 3  done pep-8-day1\nday 1 02:01  lag 2  done pep-572-day1\nday 1 02:02  lag 1  done pep-703-day1\nday 1 02:03  lag 0  idle\nday 1 02:04  lag 0  idle\noffsets: {'summaries': 3, 'audit': 1}\noutbox: 3 mails\n\n== crash after the work, no idempotency key ==\n  done pep-8\n  crash: consumer died after the work on pep-572\n  done pep-572\n  done pep-703\n  idle\n  mails sent: 4, model calls: 4\n\n== crash after the work, with an idempotency key ==\n  done pep-8\n  crash: consumer died after the work on pep-572\n  skip pep-572 (already done)\n  done pep-703\n  idle\n  mails sent: 3, model calls: 3\n\n== retries and a dead-letter list ==\n  fail pep-999 try 1: ToolError: PEP 999 is not in the desk\n  fail pep-999 try 2: ToolError: PEP 999 is not in the desk\n  dead-letter pep-999 after 3 tries\n  done pep-703\n  idle\n  dead letters: [{'key': 'pep-999', 'reason': 'ToolError: PEP 999 is not in the desk'}]"
        },
        {
          "kind": "p",
          "text": "Read the blocks in order. Lag falls from 3 to 0 as the consumer drains the burst. Without the key, the crash sends 4 mails for 3 events. With it, the repeat is skipped and 3 mails go out."
        },
        {
          "kind": "p",
          "text": "In the last block the bad event fails twice, then goes to the dead-letter list on its third try. The good event behind it still runs, so the topic never stalls."
        },
        {
          "kind": "p",
          "text": "Four risks come with every design like this."
        },
        {
          "kind": "list",
          "items": [
            "Duplicates: a redelivered event repeats a side effect unless an idempotency key guards it.",
            "Poison events: a bad event blocks the group until a retry cap and a dead-letter list move it aside.",
            "Silent lag: a stuck consumer looks healthy until you watch the lag. Alert on it.",
            "Cost: a burst of 200 events means 200 model calls. The pull pace is your rate limit, so size the consumers to the budget."
          ]
        },
        {
          "kind": "quiz",
          "id": "agents20-q6",
          "question": "Why does the dead-letter path commit the offset?",
          "options": [
            "So the failed event is deleted for ever.",
            "So the group moves on to the next event, and the failed one is kept in the dead-letter list for a person.",
            "So the model gets one more try.",
            "So the schedule can fire again."
          ],
          "answer": 1,
          "explain": "The commit lets the group continue. The dead-letter list keeps the event and its reason, so nothing is lost and nothing is blocked."
        },
        {
          "kind": "p",
          "text": "You have built every part. The last section turns it into an interview answer."
        }
      ]
    },
    {
      "id": "s8-interview",
      "title": "In an interview, name the schedule, the topic, the pull and the safe repeat",
      "goal": "How do you explain this design in an interview, and what runs it in production?",
      "blocks": [
        {
          "kind": "p",
          "text": "This pattern comes up in interviews, probed in four places. Why a topic at all? Do the consumers pull, or are they pushed to? What happens on a crash? What happens to an event that never succeeds? Answer each with the mechanism, not the product name."
        },
        {
          "kind": "callout",
          "tone": "interview",
          "title": "The 30-second answer",
          "text": "Back-office agents wake on a schedule or an event, not on a user. A nightly schedule puts one event per item on a topic. Consumers pull from the topic at their own pace, so the burst is absorbed. Delivery is at-least-once, so a crash repeats an event. An idempotency key makes the repeat harmless. A retry cap and a dead-letter list stop a bad event from blocking the rest. I would reuse the topics the platform already runs."
        },
        {
          "kind": "p",
          "text": "The build maps to four deployed pieces. A cloud scheduler plays the clock. A managed stream or a managed message queue plays the topic. Container tasks play the consumers. A database holds each run's state and the idempotency keys. Name the piece first, then your vendor if asked."
        },
        {
          "kind": "fold",
          "tone": "dyk",
          "title": "Exactly-once is a claim about the log, not your mail server",
          "text": "Some streaming systems offer exactly-once processing between their own topics. A call to an outside service, such as a mail send, sits outside that guarantee. For side effects, the dependable design is at-least-once delivery plus an idempotent handler."
        },
        {
          "kind": "quiz",
          "id": "agents20-q7",
          "question": "Which sentence best explains why this desk pulls from a topic and isn't pushed to by a webhook?",
          "options": [
            "Webhooks cannot carry JSON.",
            "A free consumer takes one event at a time, so a burst of slow agent runs waits on the topic and nothing is dropped.",
            "Pull is faster than push for every workload.",
            "Push needs a model call."
          ],
          "answer": 1,
          "explain": "The pull consumer sets the pace, and the topic holds the rest. A push sender sets the pace, so the agent must refuse or buffer what it can't take."
        },
        {
          "kind": "p",
          "text": "Every pattern from chapters 11 to 20 can now run, with or without a user. So far you have read each trace by eye. How do I know any of these agents took the right path?"
        }
      ]
    }
  ],
  "lab": {
    "title": "Change the consumer and watch what repeats",
    "goal": "Run the module, then change one thing at a time and predict the output before you run it. Every lab step runs offline. Compare your file with `capstone/src/askpep/patterns/events.py` in the my-learn folder.",
    "minutes": 20,
    "files": [
      "src/askpep/patterns/events.py"
    ],
    "steps": [
      {
        "title": "Run it unchanged",
        "text": "Run the module and compare each block with the chapter. The lag, the offsets and the mail counts must match.",
        "code": "uv run --no-sync python -m askpep.patterns.events"
      },
      {
        "title": "Stop the clock early",
        "text": "In `demo_schedule`, change `range(6)` to `range(2)`. Predict the offsets and the mail count before you run it. The clock stops at 02:00, so the consumer handles one event and two wait on the topic. The offsets print as `summaries` 1 and `audit` 1, and the outbox holds 1 mail. Nothing is lost. Put it back.",
        "code": "uv run --no-sync python -m askpep.patterns.events"
      },
      {
        "title": "Remove the retries",
        "text": "Set `MAX_TRIES = 1`. Run it. The bad event goes to the dead-letter list on its first failure. The last block prints `dead-letter pep-999 after 1 tries` and no fail lines. Then set it to 3 again.",
        "code": "uv run --no-sync python -m askpep.patterns.events"
      },
      {
        "title": "Commit before the work",
        "text": "In `consume`, cut the last `topic.commit(group)`, just before `return result`, and paste it after `key = event[\"key\"]`. The consumer now commits first, which is at-most-once. Predict the crash blocks and the retry block. Nothing repeats, so each crash block sends 3 mails. The bad event fails once and never comes back, because its offset already moved. `dead letters` prints an empty list, so nobody learns the event was lost. Put the line back.",
        "code": "uv run --no-sync python -m askpep.patterns.events"
      }
    ],
    "verify": "uv run --no-sync python -m askpep.patterns.events"
  },
  "recap": [
    "A back-office agent wakes on a schedule or an event, and a topic sits between the schedule and the agents.",
    "A schedule makes a burst. The topic absorbs it, and consumers pull at their own pace.",
    "A topic keeps one offset for each consumer group. A consumer polls, works and commits last.",
    "Pull against push is a different axis from point-to-point against publish-subscribe.",
    "At-least-once delivery repeats an event after a crash, so an idempotency key makes the work safe to repeat.",
    "A retry cap and a dead-letter list stop one bad event from blocking the topic."
  ],
  "reinforcement": "I am becoming a forward-deployed AI engineer. In event-driven agents I learned that a schedule feeds a topic, consumers pull and commit last, delivery is at-least-once, and an idempotency key plus a retry cap and a dead-letter list make it safe. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  "interviewIds": [
    "agents-c20-q01",
    "agents-c20-q02",
    "agents-c20-q03",
    "agents-c20-q04"
  ]
};

export default chapter;
