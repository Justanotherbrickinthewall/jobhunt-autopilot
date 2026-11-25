import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "guardrails-08-incidents-and-evidence",
  course: "guardrails",
  number: 8,
  title: "A control without an audit trail can't be shown to work",
  tagline: "What happens on the day something goes wrong?",
  minutes: 75,
  objectives: [
    "Say what one row of the `audit` table holds, and why the application only inserts and reads.",
    "Write the Postgres sink that stores one redacted row and reads the newest rows back.",
    "Set `KILL_SWITCH` to `actions` or `all`, and say what each value switches off.",
    "Put the kill switch first in `check_call`, and give three reasons for that order.",
    "Read the trail from a command and from an admin route, and use it to reconstruct one run.",
    "Run an incident drill and write its record from the audit rows.",
    "Write a system card, and answer a security questionnaire from it without claiming more than the evidence shows.",
  ],
  sections: [
    {
      id: "s1-the-audit-table",
      title: "A guard that writes no row can't be shown to have fired",
      goal: "What does one row of the audit table hold, and who may change it?",
      blocks: [
        {
          kind: "p",
          text: "Row T9 of the threat model is the last one still waiting for its chapter. It says that nobody can stop the desk or explain it. The security reviewer from the second team asks whether your injection guard works.",
        },
        {
          kind: "p",
          text: "You say yes. They ask you to prove it. Your tests prove it on your machine, on the day you ran them. The reviewer wants proof from real traffic, and only a record written when the guard decided can give it.",
        },
        {
          kind: "p",
          text: "That record is a row in the `audit` table. Every guard verdict, every authorisation, every approval and every tool run writes one. In chapter 1 the guard chain already wrote an event for each verdict, into a list in memory. This chapter stores the events in Postgres.",
        },
        {
          kind: "p",
          text: "An audit event is one decision, before it is stored. `AuditEvent` is a frozen dataclass, so nothing can edit an event after a guard writes it. It ships complete in your `audit.py`. Here are its fields.",
        },
        {
          kind: "code",
          lang: "python",
          code: `# src/askpep/guards/audit.py
@dataclass(frozen=True)
class AuditEvent:
    """One row of \`audit\`, without \`id\` and \`ts\`, which Postgres fills."""

    event: EventKind
    name: str  # the guard or tool name
    action: str  # allow|modify|block|denied|requested|approve|edit|reject|timeout|executed
    principal_id: str
    role: str
    thread_id: str | None = None
    stage: "Stage | None" = None
    reason: str = ""
    detail: dict[str, Any] = field(default_factory=dict)
    latency_ms: float | None = None`,
          caption: "An event has no id and no time. Postgres adds both when it stores the row.",
        },
        {
          kind: "list",
          items: [
            "`principal_id` and `role` say who acted. They come from the API key you met in chapter 5, never from the model.",
            "`event` says what kind of decision it was: `guard`, `authz`, `approval`, `tool` or `kill_switch`.",
            "`name` says which guard or tool, and `stage` says where a guard ran.",
            "`action` is the verdict, such as `allow`, `block`, `denied`, `approve` or `executed`. `reason` says why, in one sentence.",
            "`thread_id` ties every row of one desk run together.",
            "`detail` holds a small JSON object, and `latency_ms` holds how long the check took.",
          ],
        },
        {
          kind: "code",
          lang: "sql",
          code: `-- 005_audit.sql (course 3). Append-only. Course 7 grants the runtime role INSERT and SELECT only.
CREATE TABLE audit (
    id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ts           timestamptz NOT NULL DEFAULT now(),
    thread_id    text,
    principal_id text NOT NULL,
    role         text NOT NULL,
    event        text NOT NULL CHECK (event IN ('guard', 'authz', 'approval', 'tool', 'kill_switch')),
    stage        text CHECK (stage IN ('input', 'retrieved', 'tool_call', 'output')),
    name         text NOT NULL,      -- the guard or tool name
    action       text NOT NULL,      -- allow|modify|block|denied|requested|approve|edit|reject|timeout|executed
    reason       text NOT NULL DEFAULT '',
    detail       jsonb NOT NULL DEFAULT '{}',    -- always passed through redact_pii first
    latency_ms   real
);
CREATE INDEX audit_ts_idx ON audit (ts DESC);
CREATE INDEX audit_thread_idx ON audit (thread_id);`,
          caption: "Migration 005 ships in your starter, and the migrate command applies it.",
        },
        {
          kind: "p",
          text: "The table is **append-only**. The application inserts rows and reads rows. Nothing updates a row, and nothing deletes one. A record that the application can edit is not evidence.",
        },
        {
          kind: "p",
          text: "Today that is a rule in code. A later course limits the database role to `INSERT` and `SELECT`, so the database enforces it too. Until then, an honest answer to a reviewer says that the rule lives in the application.",
        },
        {
          kind: "p",
          text: "Two more rules keep the trail itself safe. A guard row holds the length of the text it checked, never the text. And the sink redacts the `reason` and every string in `detail` before it inserts the row. You built `redact_pii` in chapter 5. Here it runs on the way into the table.",
        },
        {
          kind: "p",
          text: "A sink is any object with a `write` method that takes an event. Your `MemoryAuditSink` from chapter 1 keeps events in a list and redacts nothing. `PgAuditSink` writes to Postgres, and it is the sink that redacts. You write its `write` and `recent` methods in the lab.",
        },
        {
          kind: "callout",
          tone: "analogy",
          title: "A flight recorder",
          text: "A flight recorder doesn't stop a crash. It lets investigators say what happened, and whether each system did its job. The audit table does the same for your guards. It stops nothing, and it is the only way to show that a guard fired.",
        },
        {
          kind: "fold",
          tone: "plain",
          title: "Why a table and not a log file",
          text: "A log line is free text that someone must parse. An audit row has typed columns, so every block by the injection guard this week is one query. The table also refuses an unknown kind of event, because the migration holds a check on the `event` column.",
        },
        {
          kind: "quiz",
          id: "guardrails08-q1",
          question: "A guard blocks a question that contains a customer's email address. What does its audit row hold?",
          options: [
            "The question, with the address replaced by a label.",
            "The length of the question in `detail`, and a reason with any address replaced by a label.",
            "The question exactly as asked, because evidence must be complete.",
            "Nothing yet. The row is written when someone first reads the trail.",
          ],
          answer: 1,
          explain:
            "A guard row holds the length of the text, never the text. The sink then redacts the reason and the detail before the insert, in case a guard quoted something. The trail proves what happened and doesn't become a second copy of the data.",
        },
        {
          kind: "p",
          text: "The table can now explain what happened. Next you need a way to make it stop happening.",
        },
      ],
    },
    {
      id: "s2-the-kill-switch",
      title: "The kill switch must be the first check, so it works when the others fail",
      goal: "How do you stop the desk, and why does that check come first?",
      blocks: [
        {
          kind: "p",
          text: "Sooner or later something goes wrong in production. A prompt injection gets through, or the model files tickets nobody wanted. You stop the damage first and find the cause second. A **kill switch** is a setting you change to stop part of the desk. It needs no new code, and no model decides anything.",
        },
        {
          kind: "p",
          text: "AskPEP has two scopes. `KILL_SWITCH=actions` stops the tools that change something. The set `ACTION_TOOLS` lists them, and today it holds one tool, `open_ticket`. Searching and reading carry on.",
        },
        {
          kind: "p",
          text: "`KILL_SWITCH=all` stops that tool too. It also makes every route except `/health` answer with HTTP status 503, which means the service is unavailable. Any other value, including an empty one, switches nothing off. With `all`, the API answers 503 before it checks the key. It records a caller with no valid key as `anonymous`, with the role `none`.",
        },
        {
          kind: "compare",
          caption: "Each value of the kill switch, and what it stops.",
          columns: ["Value", "What stops", "What keeps running"],
          rows: [
            ["Empty, or any other value", "Nothing", "Everything"],
            ["`actions`", "`open_ticket`", "Search and read tools, every route, `/health`"],
            ["`all`", "`open_ticket`, and every route except `/health`", "`/health`, and the search and read tools when run from the command line"],
          ],
        },
        {
          kind: "p",
          text: "The `/health` route stays up on purpose. A platform that sees a failing health check may restart the service. A restart doesn't help a desk that is off on purpose.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Flipping the switch takes a restart",
          text: "The service reads `KILL_SWITCH` once, when it starts. The function `get_settings` caches the settings, so a new value takes effect at the next start. On a managed platform that usually means a new deployment with the changed variable. No request pays for a lookup. The cost is that the switch is only as fast as a restart.",
        },
        {
          kind: "p",
          text: "The function that reads the switch is small. It strips and lower-cases the value, so a stray space or a capital letter still counts. It then asks one question. Does this value cover this scope?",
        },
        {
          kind: "code",
          lang: "python",
          code: `# src/askpep/guards/audit.py
def kill_switch_active(settings: Settings, scope: Literal["actions", "all"] = "actions") -> bool:
    """Whether the kill switch covers \`scope\`. \`KILL_SWITCH=all\` covers both scopes. \`actions\` covers
    only the tools that change something. Any other value, including an empty one, covers neither."""
    mode = settings.kill_switch.strip().lower()
    return mode == "all" or mode == scope`,
        },
        {
          kind: "p",
          text: "You built `check_call` in chapter 3 and extended it in chapter 5. It runs before every tool call. The first version ran the `tool_call` guards. The second added `authorise`. This is the third version, with the kill switch on top.",
        },
        {
          kind: "code",
          lang: "python",
          code: `# src/askpep/agents/tools.py
def check_call(
    svc: Services, runtime: ToolRuntime, name: str, args: dict[str, Any], audit: AuditSink
) -> tuple[Command | None, dict[str, Any]]:
    """The checks before a tool runs. Returns the reply when the call is stopped, else None, and the
    arguments to run with. A \`tool_call\` guard may change the arguments, so use the ones returned.

    The order is the kill switch, authorisation and then the \`tool_call\` guards. Every step writes its
    row to \`audit\`. A denied call gets an error the model can read. A kill switch or a guard block also
    ends the run, through \`stop_reason\`.
    """
    who, thread = _principal(runtime), _thread_id(runtime)
    if name in ACTION_TOOLS and kill_switch_active(svc.settings, "actions"):
        reason = f"KILL_SWITCH={svc.settings.kill_switch.strip()} is on, so {name} is off"
        audit.write(
            AuditEvent("kill_switch", name, "block", who["user_id"], who["role"], thread, reason=reason)
        )
        return stop_call(runtime, name, "kill_switch", f"{name} is switched off."), args
    decision = authorise(who, name)
    action = "allow" if decision.allowed else "denied"
    audit.write(
        AuditEvent("authz", name, action, who["user_id"], who["role"], thread, reason=decision.reason)
    )
    if not decision.allowed:
        hint = "This user may not use this tool. Tell them so, and do not call it again."
        return observe(runtime, name, ToolError(error=decision.reason, hint=hint)), args
    if svc.guards is not None and svc.guards.covers("tool_call"):
        ctx = GuardContext("tool_call", who, thread, name, tuple(runtime.state.get("sources", [])))
        verdict = screen(GuardChain(svc.guards.guards, audit), json.dumps(args, sort_keys=True), ctx)
        if verdict.action == "modify":
            try:
                changed = json.loads(verdict.text)
            except ValueError:
                changed = None
            if isinstance(changed, dict) and set(changed) == set(args):
                return None, changed
            verdict = replace(
                verdict, action="block", reason="a guard changed the arguments into something invalid"
            )
        if verdict.action == "block":
            return stop_call(
                runtime, name, "guard_blocked", f"A guard blocked this call: {verdict.reason}"
            ), args
    return None, args`,
          caption: "The whole function. The first block, from the if to its return, is new in this chapter.",
        },
        {
          kind: "p",
          text: "The switch comes first for three reasons.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "It must work when another check is the fault. A switch placed behind a guard that crashes would never be read.",
            "A stopped call writes one row. A reader's `open_ticket` call leaves a single `kill_switch` row, with no `authz` row, because the call never reaches authorisation.",
            "Nothing waits for a person. The approval pause from chapter 6 sits later, inside the ticket tool. A stopped call never reaches it, so no request sits waiting for an answer.",
          ],
        },
        {
          kind: "p",
          text: "To stop a call, `check_call` returns the result of `stop_call`, which you wrote in chapter 3. It gives the model an error to read and sets `stop_reason` in the desk state.",
        },
        {
          kind: "p",
          text: "A model can ignore a hint. So `HaltMiddleware`, from chapter 6, checks `stop_reason` before every model call. When the reason is `kill_switch`, it ends the run with a fixed sentence. The model never writes that sentence.",
        },
        {
          kind: "fold",
          tone: "trouble",
          title: "Why check_call takes a sink as an argument",
          text: "A paused run restarts the ticket tool from its first line when it resumes. Rows written before the pause would then be written twice. So `file_ticket` gives `check_call` an `AuditBuffer`, a sink that holds rows in memory. It flushes the buffer when the approval decision is back. A call stopped before the pause flushes at once.",
        },
        {
          kind: "widget",
          id: "guardrails08-switch-order",
          intro: "Each case sets `KILL_SWITCH`, a role and a call. Predict which audit rows the call writes. Look for the case where the call writes one row where you expect two.",
        },
        {
          kind: "step",
          id: "guardrails08-s01",
          title: "Ask the switch a question",
          text: "Do this after lab step 3. Build a `Settings` with the switch on `actions`, then ask `kill_switch_active` about both scopes. Run it from your AskPEP workspace root.",
          lang: "bash",
          code: `uv run python -c "from askpep.config import Settings; from askpep.guards.audit import kill_switch_active as on; s = Settings(kill_switch='actions'); print(on(s), on(s, 'all'))"`,
          expect: "It prints True False. The value actions covers the actions scope and not the all scope.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "How an interviewer asks about stopping an agent",
          text: "Your agent starts misbehaving at night, they say. What do you do? Lead with the answer: a switch that stops the actions and leaves reads running, checked in code before any other check. Then give the cost. A change takes a restart. Then say how you know it worked, which is a row for every stopped call.",
        },
        {
          kind: "quiz",
          id: "guardrails08-q2",
          question: "`KILL_SWITCH=actions` is on, and a reader asks the desk to file a ticket. How many audit rows does that `open_ticket` call write?",
          options: [
            "None, because a reader has no right to call it.",
            "One, a `kill_switch` row with the action `block`.",
            "Two, an `authz` row with `denied` and then a `kill_switch` row.",
            "Three, one for each check in `check_call`.",
          ],
          answer: 1,
          explain:
            "The kill switch is the first check. The call stops there and writes one row. Authorisation never runs, so no `authz` row exists, and the approval pause never starts.",
        },
        {
          kind: "p",
          text: "The desk can now stop its own tools. The API needs the same switch, and an operator needs a way to read the rows.",
        },
      ],
    },
    {
      id: "s3-the-api-switch-and-the-trail",
      title: "An operator can switch the API off and read the trail without writing code",
      goal: "How does an operator stop the API and read the trail?",
      blocks: [
        {
          kind: "p",
          text: "The desk stops its own tools. The API needs a switch of its own for `KILL_SWITCH=all`. FastAPI lets you register a **middleware**, a function that sees every request before any route does. The kill switch is one. When it is on, it answers 503 and never calls the route.",
        },
        {
          kind: "p",
          text: "Order matters. You register this middleware before the CORS middleware, so CORS wraps it. CORS is the check that lets a browser app call the API from another origin. With that order, a browser app still reads the 503 and can show a message.",
        },
        {
          kind: "p",
          text: "The middleware also writes a `kill_switch` row for the caller. A caller with no valid key still gets 503, not 401. The row names that caller `anonymous` with the role `none`. During an incident you want every attempt on the trail, including the ones that would have failed anyway.",
        },
        {
          kind: "code",
          lang: "python",
          code: `# src/askpep/api.py
def create_app(settings: Settings | None = None, services: Services | None = None) -> FastAPI:
    ...
    app = FastAPI(title="AskPEP", lifespan=lifespan)

    @app.middleware("http")
    async def kill_switch(request: Request, call_next):
        """KILL_SWITCH=all answers every route but /health with 503. It is registered before CORS, so CORS
        wraps it and a browser still reads the 503."""
        if request.url.path == "/health" or not kill_switch_active(settings, "all"):
            return await call_next(request)
        who = principal_for_key(settings, request.headers.get("x-api-key", ""))
        if svc.audit is not None:
            event = AuditEvent(
                "kill_switch",
                request.url.path,
                "block",
                who["user_id"] if who else "anonymous",
                who["role"] if who else "none",
                reason="KILL_SWITCH=all",
            )
            await run_in_threadpool(svc.audit.write, event)
        return JSONResponse({"detail": "The desk is switched off."}, status_code=503)

    app.add_middleware(
        CORSMiddleware,
        ...
    )`,
          caption: "The switch sits above the CORS middleware, so it is added first.",
        },
        {
          kind: "p",
          text: "The row is written by a blocking database call, and the middleware is asynchronous. `run_in_threadpool` hands the write to a worker thread, so the event loop keeps serving other requests.",
        },
        {
          kind: "p",
          text: "Writing rows is half the job. An operator must be able to read them. Both ways are for admins only. The command `askpep audit list` prints the newest rows. The route `/admin/audit` returns them as JSON.",
        },
        {
          kind: "code",
          lang: "python",
          code: `# src/askpep/cli.py
@audit_app.command("list")
def audit_list(limit: int = 50) -> None:
    """List the newest audit rows. The trail lives in Postgres, so this needs the database."""
    svc = open_services()
    recent = getattr(svc.audit, "recent", None)
    if recent is None:
        typer.echo("The audit trail needs Postgres. Set STORE=pg.", err=True)
        raise typer.Exit(code=1)
    rows = recent(limit)
    for r in rows:
        when = f"{r['ts']:%Y-%m-%d %H:%M:%S}" if r["ts"] else "-"  # the in-memory sink keeps no time
        typer.echo(
            f"{r['id']}  {when}  {r['event']}:{r['name']}  {r['action']}  "
            f"{r['principal_id']}/{r['role']}  thread {r['thread_id']}  {r['reason']}"
        )
    if not rows:
        typer.echo("no audit rows")`,
        },
        {
          kind: "p",
          text: "The command prints one line per row, newest first, and takes a `--limit` with a default of 50. A desk that keeps its trail in memory can't read rows back. So the command prints a message and exits with code 1.",
        },
        {
          kind: "code",
          lang: "python",
          code: `# src/askpep/api.py
    @app.get("/admin/audit", dependencies=[Depends(require_admin)])
    def audit_route(limit: int = Query(default=50, ge=1, le=500)) -> list[dict]:
        """The newest audit rows, for an admin. The Postgres sink redacted each row when it wrote it."""
        recent = getattr(svc.audit, "recent", None)
        return recent(limit) if recent else []`,
        },
        {
          kind: "p",
          text: "The route takes a `limit` from 1 to 500, with a default of 50. A value outside that range gets a 422. A staff or reader key gets 403, and a missing or wrong key gets 401. A desk with no sink returns an empty list.",
        },
        {
          kind: "p",
          text: "Here is how you use the trail after an incident. A ticket exists that nobody expected. You take its thread id from the tickets list and look for that thread in the output. These rows are illustrative. Read them from the bottom up.",
        },
        {
          kind: "code",
          lang: "text",
          code: `19  2026-10-21 14:06:31  tool:open_ticket  executed  stan/staff  thread th-9
18  2026-10-21 14:06:30  guard:injection  allow  stan/staff  thread th-9
17  2026-10-21 14:06:30  authz:open_ticket  allow  stan/staff  thread th-9  staff may use open_ticket
16  2026-10-21 14:06:30  approval:open_ticket  approve  ada/admin  thread th-9
15  2026-10-21 14:04:02  approval:open_ticket  requested  stan/staff  thread th-9
14  2026-10-21 14:04:01  guard:injection  allow  stan/staff  thread th-9`,
          caption: "Illustrative output of the audit list command, newest first.",
        },
        {
          kind: "p",
          text: "The injection guard allowed the question. The desk asked for approval, and a second person approved it. The authorisation row comes after the approval rows, because the buffer from section 2 holds it until the decision is back.",
        },
        {
          kind: "p",
          text: "The injection guard then allowed the tool's arguments, and the tool ran. Each fact is a row with a time and a name.",
        },
        {
          kind: "p",
          text: "The command doesn't filter by thread, so you scan the output for the thread id. That is enough for an incident. The index `audit_thread_idx` is ready for the day you add a filter.",
        },
        {
          kind: "p",
          text: "When something goes wrong, work in this order.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Switch off the narrowest scope first. The value `actions` stops the writes and keeps the reads.",
            "Read the trail for the thread, and name the guard that missed.",
            "Fix it in code, and add the attack to the attack set from chapter 7.",
            "Switch the desk back on when the attack gate passes.",
          ],
        },
        {
          kind: "step",
          id: "guardrails08-s02",
          title: "Read the trail from your shell",
          text: "Do this after lab step 5. Apply the migrations, then ask for the newest rows. The command needs your Postgres from course 1, and `STORE` must be `pg`, which is the default.",
          lang: "bash",
          code: `uv run askpep migrate
uv run askpep audit list --limit 10`,
          expect: "The migrate command lists 005_audit the first time it applies the file, and prints up to date after that. The audit list command prints no audit rows on an empty table. After a desk run it prints one line for each row, newest first.",
        },
        {
          kind: "quiz",
          id: "guardrails08-q3",
          question: "`KILL_SWITCH=all` is on, and a caller posts to `/search` with a wrong API key. What happens?",
          options: [
            "The caller gets 401 and nothing is written, because the key check runs first.",
            "The caller gets 503, and a `kill_switch` row names the caller `anonymous`.",
            "The caller gets 503, and nothing is written, because an unknown caller has no principal.",
            "The caller gets 401, and an `authz` row records the denial.",
          ],
          answer: 1,
          explain:
            "The middleware runs before any route and before the key check. It answers 503 for everyone. It records an unknown caller as anonymous with the role none, so the attempt is on the trail.",
        },
        {
          kind: "p",
          text: "That order reads well on a page. The next section runs it once, before a real incident needs it.",
        },
      ],
    },
    {
      id: "s6-incident-drill",
      title: "A rehearsed incident proves the switch and the trail before you need them",
      goal: "How do you know the switch and the trail work on a bad day?",
      blocks: [
        {
          kind: "p",
          text: "An incident drill has five steps. Pick a failure the threat model already names. Stop the narrowest thing that stops the harm, and time it. Rebuild what happened from the audit rows alone. Name the control that missed. Then write down what you couldn't do.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Pick a failure from the threat model.",
            "Set the narrowest scope of the kill switch, and note the time.",
            "Rebuild the run from the audit rows, and name the control that missed.",
            "Fix it, add the attack to the set, and run the gate.",
            "Write the record, including what went badly.",
          ],
        },
        {
          kind: "p",
          text: "You ran the drill on a Thursday with the reviewer watching. The story was one the threat model expects. A reworded order in a planted passage got past the injection rules, and the desk asked to open a ticket. The approver was busy, and approved it without reading the title.",
        },
        {
          kind: "p",
          text: "The product owner said the fix was obvious: take the desk down. You said that a whole outage wasn't needed yet. Reading was still safe, and only the ticket tool could do harm. So you set `KILL_SWITCH` to `actions` and restarted the service.",
        },
        {
          kind: "p",
          text: "The first ticket call after the restart stopped with a single `kill_switch` row. No request waited for anyone. Then you looked for the bad ticket's thread in the `audit list` output. The reviewer pointed out that you were scanning by eye, because the command has no filter for a thread. That went into the record as a finding.",
        },
        {
          kind: "p",
          text: "The rows showed which control had missed. The injection guard had allowed the text, and a person had approved the call.",
        },
        {
          kind: "p",
          text: "The approval had worked as designed and failed as a check, because nothing made the approver read. You added the reworded passage to the attack set as a new record, and the gate failed on it until the rule was fixed.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# INCIDENT-DRILL-001.md
Type: rehearsal, no customer harm   Watched by: security reviewer, second team
Failure rehearsed: T2 and T7. A reworded order in a passage leads to an approved ticket.

## Timeline (illustrative clock times)
14:00  Ticket "Rotate the production keys." noticed by staff. Nobody expected it.
14:03  KILL_SWITCH=actions set. Service restart started.
14:05  Restart finished. Ticket tool off, search and read still on.
14:06  First stopped call confirmed from the trail.
14:20  Thread found by scanning the audit list output.
14:35  Control that missed named: injection rules, then the approver.
15:10  Passage added to the attack set. Gate run, fails on the new record until the rule is fixed.
15:40  Rule fixed. Gate exits 0. KILL_SWITCH cleared and service restarted.

## The row that proved the stop (real output, desk run offline on 9 November 2026)
kill_switch:open_ticket  block  stan/staff  stage=None
reason='KILL_SWITCH=actions is on, so open_ticket is off'

## What the rows showed
guard:injection  input      allow     the passage was not caught by the rules
approval         requested  stan/staff
approval         approve    ada/admin the approver did not read the title
tool:open_ticket executed   approved_by ada

## What went badly
1. audit list has no thread filter, so finding the thread took 14 minutes.
2. The stop took 5 minutes from the first report, and 2 of those were the restart.
3. The approval card showed the title, and nothing made the approver read it.

## Actions
Add a thread filter to audit list.         Owner: engineering   Due: before launch
Time a restart on the real platform.       Owner: engineering   Due: before launch
Add a second reader for any ticket about credentials.   Owner: product owner   Due: open`,
          caption: "INCIDENT-DRILL-001.md. It records a rehearsal. The clock times are illustrative, and the kill switch row is real.",
        },
        {
          kind: "p",
          text: "Read the record for what it admits. The stop took five minutes from the first report, and two of those were the restart. The longest gap was finding the thread, and a one-line filter closes it. The third item is the one a reviewer will press. A person approving a ticket is only a control when that person reads it.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# Threat model changes
T9  operations  Evidence: kill_switch row, -k guardrails08, INCIDENT-DRILL-001.md   closed`,
          caption: "THREAT-MODEL.md, the row this chapter closes.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# INCIDENT-DRILL-NNN.md
Type:    Watched by:
Failure rehearsed: (a row of the threat model)

## Timeline
(time)  (what happened, one line each)

## The row that proved the stop
## What the rows showed
## What went badly
1.

## Actions
(action)    Owner:    Due:`,
          caption: "For your next incident drill: the same record with the values left blank.",
        },
        {
          kind: "p",
          text: "The drill showed that the desk can be stopped and explained. The reviewer now wants one document that says what the desk is and what backs each claim.",
        },
      ],
    },
    {
      id: "s4-the-system-card",
      title: "A system card keeps each claim next to its evidence and its date",
      goal: "What does a system card hold, and how do you write one?",
      blocks: [
        {
          kind: "p",
          text: "The audit table proves what happened. A reviewer also asks what the system is for, what it can touch and who owns it. A **system card** is a short document, in your repository, that answers those questions. It states plain facts about one system and names the evidence for each one.",
        },
        {
          kind: "p",
          text: "Keep the card next to the code. Then a change to a guard and a change to the card go through the same review. A card in a slide deck goes stale the first time the code changes.",
        },
        {
          kind: "list",
          items: [
            "The intended use, and what the system is not for.",
            "The tools it can call, and the role each one needs.",
            "The data flows, which say what goes to which service.",
            "The controls, each with the evidence that it fires.",
            "The known gaps, each with the event that closes it.",
            "The owner.",
          ],
        },
        {
          kind: "p",
          text: "Every figure on the card carries a date. The attack success rate from chapter 7 is 0.0 with the guards on the 25 attacks of set `v1`, and about 0.92 without them. Both are in-sample, which means measured on the attacks the guards were built against. A bare 0.0 is a claim a careful reviewer won't believe.",
        },
        {
          kind: "code",
          lang: "markdown",
          code: `# AskPEP system card

Card date: 21 October 2026. Owner: the person who deploys AskPEP.
Review again after any change to a guard or a tool.

## Intended use
Answers questions about 18 Python PEPs, with citations, for a small team.
Opens tickets about those PEPs, and a person approves each one first.
Not for legal, medical or financial advice. Not for decisions about people.

## Tools and who may call them
- search_peps, read_pep_section, lint_snippet, python_feature_version: reader and above.
- open_ticket: staff and above. Evidence: POLICY in askpep/guards/authz.py, and the authz rows.

## Data flows
- A question goes to the embedding and rerank provider, the answer model and the desk model.
- Passages, tickets and audit rows stay in our Postgres.
- Provider terms on training and retention: link the pages and write the date you read them.

## Controls and evidence
- Injection rules on input and retrieved text. Evidence: askpep redteam.
- Citation check on every answer. Evidence: guard rows at the output stage.
- PII redaction before an audit row is stored. Covers emails, phone numbers, card numbers and secrets.
- Approval before open_ticket. Evidence: approval rows.
- Kill switch, actions and all. Evidence: kill_switch rows. A change takes a restart.
- Attack success rate: 0.0 guarded and about 0.92 unguarded, on the 25 attacks of set v1.
  In-sample. Measured on the card date.

## Known gaps
- The audit table is append-only in code. The database role can still change rows.
  Closes when the role is limited to insert and select.
- PII redaction misses names and addresses. Closes when a name detector is added.
- The attack set is in-sample. Closes when someone else writes a held-out set.`,
          caption: "Illustrative. Your dates and figures will differ, and so will your gaps.",
        },
        {
          kind: "p",
          text: "Read the gaps again. A gap you name costs you one follow-up question. A gap you hide costs you the reviewer's trust in every other line.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# <System name> system card
Card date:    Owner:
Review again after:

## Intended use
## Tools and who may call them
## Data flows
## Controls and evidence
## Known gaps
(the gap, and the event that closes it)`,
          caption: "For your next system card: the same headings with the values left blank.",
        },
        {
          kind: "widget",
          id: "guardrails08-card-review",
          intro: "Here is a draft card for AskPEP. Judge each line. Keep it, or mark it as an over-claim, or mark it as a line with no evidence.",
        },
        {
          kind: "step",
          id: "guardrails08-s03",
          title: "Write the system card for your AskPEP",
          text: "Create a file called SYSTEM-CARD.md at the root of your AskPEP workspace. Copy the headings from the card above. Fill each line with your own facts, evidence and date. Leave a gap as a gap.",
          file: "SYSTEM-CARD.md",
          expect: "Every claim names its evidence, every figure has a date, and every gap names the event that closes it.",
        },
        {
          kind: "quiz",
          id: "guardrails08-q4",
          question: "Your card says the guarded attack success rate is 0.0. What else must that line say?",
          options: [
            "That the rate is perfect, so the attack set needs no more work.",
            "The attack set and its size, that the figure is in-sample, and the date it was measured.",
            "The names of the people who wrote the attacks.",
            "Nothing. A number speaks for itself.",
          ],
          answer: 1,
          explain:
            "A rate means nothing without its set, its size and its date. In-sample means the guards were built with these attacks in view, so a low rate is the minimum you would expect. A reviewer who finds that out later stops trusting the card.",
        },
        {
          kind: "p",
          text: "The card is written for one reader who has time. A questionnaire comes from someone who doesn't, and it has its own shape.",
        },
      ],
    },
    {
      id: "s5-the-questionnaire",
      title: "A questionnaire answer is a sentence from the card with evidence behind it",
      goal: "Which questionnaire items are yours to answer, and how do you answer them?",
      blocks: [
        {
          kind: "p",
          text: "A **security questionnaire** is a list of questions a buyer sends before a system goes near their data. For AskPEP, the second team plays the buyer. The subjects repeat from buyer to buyer. They ask about audit logs, access control, where data goes, how long it is kept, how you test and who approves what.",
        },
        {
          kind: "p",
          text: "Before you write a word, sort each item into one of four piles. Then you know whose answer it is. Engineering items come from the card and the trail. The other three piles come from outside your repository.",
        },
        {
          kind: "compare",
          caption: "Four piles, and who answers each one.",
          columns: ["Pile", "Example item", "Where the answer comes from", "Who signs"],
          rows: [
            ["Engineering", "Is there an audit trail?", "The card, and the audit list command", "You"],
            ["Model provider", "Is our data used for training?", "The provider's current terms, with a link and a date", "You quote it"],
            ["Company", "Do you hold SOC 2 or ISO 27001?", "The company's reports and certificates", "The company"],
            ["Legal", "Which EU AI Act tier? Is a DPIA done?", "Legal's decision, with your facts", "Legal"],
          ],
        },
        // CHECK: SOC 2 is an auditor's attestation report on a company's controls, and ISO/IEC 27001 is a certifiable standard for information security management. Confirm both against the AICPA and ISO pages.
        {
          kind: "p",
          text: "A certificate belongs to a company. SOC 2 is an auditor's report on a company's controls. ISO 27001 is a certificate for a company's security management. A repository can hold neither. So the honest answer for AskPEP is no, followed by the controls you do have.",
        },
        // CHECK: The EU AI Act sorts AI systems into risk tiers, and a DPIA is the data protection impact assessment of GDPR article 35. Confirm both against the Official Journal texts.
        {
          kind: "p",
          text: "The last pile is legal. The EU AI Act sorts AI systems into risk tiers. A **DPIA** is a data protection impact assessment, which GDPR can require before risky processing of personal data. You don't decide either one. You hand legal the facts, which are the intended use, the data flows and the controls.",
        },
        {
          kind: "callout",
          tone: "insight",
          title: "An over-claim costs more than a gap",
          text: "A buyer who finds a gap asks one follow-up. A buyer who finds an over-claim doubts every other answer. When the honest answer is no, write no, and write what you do instead.",
        },
        {
          kind: "p",
          text: "A good answer is one or two sentences. It states a fact, points to a number or a file, and says what it does not cover. Take the oversight item. A good answer reads: \"Yes, for the one action tool. Each ticket pauses for a person's approval, and the decision is a row in the audit table.\"",
        },
        {
          kind: "p",
          text: "Keep every answer in one file, with its evidence and the date you checked it. The next questionnaire then starts mostly filled. An answer older than the last change to the code needs a check before you reuse it.",
        },
        {
          kind: "widget",
          id: "guardrails08-questionnaire",
          intro: "A reviewer sent seven items. Read the facts first. Then pick the answer that is true, specific and inside what an engineer may claim.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "How an interviewer asks about a security review",
          text: "A client asks how you will get your agent through their security review. Lead with the answer: you make approval easy. Send the card and a data-flow diagram early. Answer each item in a sentence with evidence. Name every gap, with the event that closes it. Then give the cost, which is documents before code.",
        },
        {
          kind: "quiz",
          id: "guardrails08-q5",
          question: "A buyer asks whether AskPEP's audit trail can be edited. The application only inserts and reads, and the database role is not yet limited. Which answer is best?",
          options: [
            "No. Nobody can change it.",
            "The application only inserts and reads. The database role can still change rows until it is limited, and that gap is on the card.",
            "Yes, but only administrators can.",
            "That is a legal question, so legal answers it.",
          ],
          answer: 1,
          explain:
            "The first answer over-claims, because the database role can still change rows. The third invents a rule. The fourth sends an engineering fact to legal. The second states the control, its limit and where the gap is recorded.",
        },
        {
          kind: "p",
          text: "You now hold every control and every record the reviewer wanted. The last chapter puts them together, and answers whether AskPEP can launch.",
        },
      ],
    },
  ],
  lab: {
    title: "Store the audit trail and add the kill switch to AskPEP",
    goal: "Write the Postgres sink, the kill switch check, the kill switch in `check_call` and in the API, and the `audit list` command with its route. Steps 1 to 3 start from stubs that raise `NotImplementedError`. The nine tests with postgres in their name skip unless `TEST_DATABASE_URL` points at a Postgres you can reach.",
    minutes: 60,
    files: [
      "src/askpep/guards/audit.py",
      "src/askpep/agents/tools.py",
      "src/askpep/api.py",
      "src/askpep/cli.py",
      "tests/guardrails/test_guardrails08_audit.py",
    ],
    steps: [
      {
        title: "Write an audit row",
        text: "Write `PgAuditSink.write` in `audit.py`. Take the redacted copy of the event first. Then insert one row, with every value passed as a parameter and `detail` wrapped in `Jsonb`. Leave out `id` and `ts`. Add the `Jsonb` import. The stub raises `guardrails-08 step 1`.",
        code: `# src/askpep/guards/audit.py
# Add this import beside the others: from psycopg.types.json import Jsonb
class PgAuditSink:
    """Writes events to the \`audit\` table. It only ever inserts and selects."""

    def __init__(self, pool: ConnectionPool):
        self.pool = pool

    def write(self, event: AuditEvent) -> None:
        """Insert one row. The stored \`reason\` and \`detail\` are the redacted ones. \`detail\` is jsonb."""
        # your turn:
        # 1. e = event.redacted(). Every value below comes from e, never from event.
        # 2. Open one connection with self.pool.connection().
        # 3. Run one INSERT INTO audit for thread_id, principal_id, role, event, stage, name, action,
        #    reason, detail and latency_ms. Leave out id and ts, which Postgres fills.
        # 4. Pass the values as parameters, never inside the SQL text. Wrap detail as Jsonb(e.detail).
        raise NotImplementedError("guardrails-08 step 1")`,
        test: "uv run pytest tests/guardrails -k guardrails08_s1",
      },
      {
        title: "Read the newest rows",
        text: "Write `PgAuditSink.recent` in `audit.py`. Run one `SELECT` of every column in `COLUMNS`, from `audit`, with the newest row first and the limit as a parameter. Return the rows as the list of dicts the pool gives you. The stub raises `guardrails-08 step 2`.",
        code: `# src/askpep/guards/audit.py
    def recent(self, limit: int = 50) -> list[dict[str, Any]]:
        """The newest rows first, each as a dict of the table's columns."""
        # your turn:
        # 1. Open a connection and run SELECT {COLUMNS} FROM audit ORDER BY id DESC LIMIT %s.
        #    The id grows with every insert, so the highest id is the newest row.
        # 2. Pass limit as the parameter, and return the fetched rows.
        raise NotImplementedError("guardrails-08 step 2")`,
        test: "uv run pytest tests/guardrails -k guardrails08_s2",
      },
      {
        title: "Ask whether the switch is on",
        text: "Write `kill_switch_active` in `audit.py`. Strip and lower-case `settings.kill_switch`. The switch covers a scope when the value is `all` or equals the scope. Any other value, including an empty one, covers neither. The stub raises `guardrails-08 step 3`.",
        code: `# src/askpep/guards/audit.py
def kill_switch_active(settings: Settings, scope: Literal["actions", "all"] = "actions") -> bool:
    """Whether the kill switch covers \`scope\`. \`KILL_SWITCH=all\` covers both scopes. \`actions\` covers
    only the tools that change something. Any other value, including an empty one, covers neither."""
    # your turn: mode = the stripped, lower-cased setting. Return True for "all" or for the scope.
    raise NotImplementedError("guardrails-08 step 3")`,
        test: "uv run pytest tests/guardrails -k guardrails08_s3",
      },
      {
        title: "Put the kill switch in the desk and the API",
        text: "Add `ACTION_TOOLS` and the kill switch block to `check_call`, before the authorisation call. Then add the `kill_switch` middleware to `create_app` in `api.py`, which section 3 shows in full. Both stops write a `kill_switch` row. The tests fail with `guardrails-08 step 4` until both stops work.",
        code: `# src/askpep/agents/tools.py
# Add this import: from askpep.guards.audit import AuditEvent, kill_switch_active
ACTION_TOOLS = frozenset({"open_ticket"})  # the tools that change something. KILL_SWITCH=actions stops them.


def check_call(
    svc: Services, runtime: ToolRuntime, name: str, args: dict[str, Any], audit: AuditSink
) -> tuple[Command | None, dict[str, Any]]:
    who, thread = _principal(runtime), _thread_id(runtime)
    # your turn, before the authorise call:
    # 1. When name is in ACTION_TOOLS and kill_switch_active(svc.settings, "actions") is true, stop.
    # 2. Write one AuditEvent: kind "kill_switch", the tool name, action "block", the user id and role
    #    of who, the thread, and a reason that names the setting and the tool.
    # 3. Return stop_call(runtime, name, "kill_switch", f"{name} is switched off."), args.
    #    stop_call ends the run from inside a tool. You wrote it in chapter 3.
    decision = authorise(who, name)
    ...  # the rest of check_call is unchanged

# api.py: inside create_app, above app.add_middleware(CORSMiddleware, ...), add the kill_switch
# middleware from section 3. Add these imports to api.py:
#   from starlette.concurrency import run_in_threadpool
#   from fastapi import Request                    (add Request to your fastapi line)
#   from fastapi.responses import JSONResponse    (add JSONResponse to your line)
#   from askpep.guards.audit import AuditEvent, kill_switch_active`,
        test: "uv run pytest tests/guardrails -k guardrails08_s4",
      },
      {
        title: "Read the trail",
        text: "Add the `audit list` command to `cli.py` and the `/admin/audit` route to `api.py`. The command prints one line per row, newest first, and exits with code 1 when the sink can't read rows back. The route is for admins and takes a `limit` from 1 to 500. Section 3 shows both.",
        code: `# src/askpep/cli.py
# Add these beside desk_app and tickets_app. They register the audit group.
audit_app = typer.Typer(no_args_is_help=True, help="Read the guard and approval audit trail.")
app.add_typer(audit_app, name="audit")


@audit_app.command("list")
def audit_list(limit: int = 50) -> None:
    """List the newest audit rows. The trail lives in Postgres, so this needs the database."""
    svc = open_services()
    # your turn:
    # 1. recent = getattr(svc.audit, "recent", None). When it is None, print "The audit trail needs
    #    Postgres. Set STORE=pg." with typer.echo(..., err=True), then raise typer.Exit(code=1).
    # 2. rows = recent(limit).
    # 3. For each row print one line: the id, the time, event:name, the action, principal_id/role,
    #    "thread " and the thread id, then the reason. Format the time as %Y-%m-%d %H:%M:%S,
    #    or print "-" when ts is empty, as the in-memory sink keeps no time.
    # 4. When there are no rows, print "no audit rows".
    ...

# api.py: inside create_app, beside the other admin routes, add GET /admin/audit.
#   It depends on require_admin, and takes limit: int = Query(default=50, ge=1, le=500).
#   It returns recent(limit) when svc.audit has a recent method, and an empty list when it has none.`,
        test: "uv run pytest tests/guardrails -k guardrails08_s5",
      },
    ],
    verify: "uv run pytest tests/guardrails -k guardrails08",
  },
  recap: [
    "An audit row records one decision with who, what, which run and why, and the application only inserts and reads it.",
    "The sink redacts the reason and the detail before the insert, and a guard row holds the text length and never the text.",
    "`KILL_SWITCH=actions` stops the action tools, and `all` also answers 503 on every route except `/health`.",
    "The kill switch is the first check in `check_call`, so it works when another check fails, writes one row and leaves no approval waiting.",
    "A system card keeps each claim next to its evidence and its date, and it names the gaps and the event that closes each one.",
    "Answer a questionnaire from the card, say no when the answer is no, and send the legal items to legal with your facts.",
    "An incident drill rehearses a failure from the threat model, and its record says what went badly.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In incidents and evidence I learned that a control I can't show firing is only a claim. Every guard writes a row, and a card names the evidence. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["guardrails-q15", "guardrails-q16", "guardrails-q23", "guardrails-q09", "guardrails-q10"],
};

export default chapter;
