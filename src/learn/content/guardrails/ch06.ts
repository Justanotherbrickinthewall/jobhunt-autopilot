import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "guardrails-06-human-approval",
  course: "guardrails",
  number: 6,
  title: "Pause before an irreversible action and resume from the checkpoint",
  tagline: "How does a person approve a ticket without the desk filing it twice?",
  minutes: 60,
  objectives: [
    "Say why an action you can't undo waits for a person, and why the pause is code in the tool.",
    "Use `interrupt()` and `Command(resume=...)`, and say which lines of the node run again when a paused run resumes.",
    "Name the four decisions, say which two file a ticket, and say what `settle_approval` and `HaltMiddleware` each do.",
    "Explain why `file_ticket` holds its audit rows in a buffer, and why it files the approved draft when a worker proposes another.",
    "Say who may decide, and why the MCP server has no approval tool.",
    "Say how an expire job ends a request that nobody answered.",
    "Carry a decision from HTTP or the terminal back to a paused run.",
    "Read one approved ticket from the audit trail, and write the approval policy it proves.",
  ],
  sections: [
    {
      id: "s1-gate",
      title: "An action you can't undo should wait for a person, and the pause is code",
      goal: "Why does the desk need an approval gate, and where does it sit?",
      blocks: [
        {
          kind: "p",
          text: "The desk can file tickets. In course 2, the writer agent called `open_ticket`, and the row went into the `tickets` table at once. Nobody read it first. That was acceptable while you were the only user.",
        },
        {
          kind: "p",
          text: "Row T7 of the threat model is still open. A user, or a retrieved passage, can talk a model into an action it should not take. The guards from chapters 2 to 5 catch many of those attempts.",
        },
        {
          kind: "p",
          text: "They don't catch all of them, as the reworded order in chapter 3 showed. For an action with a cost, add one more check, and make that check a person.",
        },
        {
          kind: "p",
          text: "A ticket can be closed again, so it isn't truly irreversible. Treat it as a stand-in for the actions you can't take back, such as a sent email or a refund. The pattern is the same for all of them.",
        },
        {
          kind: "p",
          text: "The pattern has a plain shape. The tool pauses before it acts. A person reads the request and answers. Then the run carries on from where it stopped.",
        },
        {
          kind: "p",
          text: "The pause is code, and it lives in a new function called `file_ticket`. A prompt that says 'ask before you file' is only a request. The model can forget it, or a hostile passage can argue it away. Code stops the run, and only a decision starts it again.",
        },
        {
          kind: "p",
          text: "Gate sparingly. If every tool call waits for approval, approvers stop reading. Gate the calls that change the world and cost something to undo. In AskPEP that is `open_ticket`. The four read tools run free.",
        },
        {
          kind: "p",
          text: "One rule follows from this. The model must never be the person who decides. A later section comes back to it.",
        },
        {
          kind: "callout",
          tone: "analogy",
          title: "A card machine and the PIN",
          text: "A shop assistant presses the button, but the card machine waits for you to enter the PIN. The assistant can't enter it for you. The approval gate works the same way. The model asks, and a person answers.",
        },
        {
          kind: "quiz",
          id: "guardrails06-q1",
          question: "Where should the approval pause for open_ticket live?",
          options: [
            "In the writer's prompt, as an instruction to ask before filing",
            "In the tool, as code that stops the run until a decision arrives",
            "In the output guard, which checks the final answer",
            "In the model, by asking it to rate its own confidence",
          ],
          answer: 1,
          explain:
            "A prompt is a request. The model can forget it, and a hostile passage can argue it away. The output guard sees the answer after the ticket exists. Only code in the tool stops the write before it happens.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "When do you bring a human into the loop, and what do you watch?",
          text: "A good answer says which actions get a gate and why. Name the cost of the action, and say whether it can be undone. Then say what you measure. If reviewers approve almost everything, either the gate sits on the wrong actions or nobody is reading. Both are findings, and the approval log is how you see them.",
        },
        {
          kind: "p",
          text: "LangGraph already has the pause you need, and it behaves in one surprising way.",
        },
      ],
    },
    {
      id: "s2-interrupt",
      title: "interrupt() saves the run and stops it, and the node starts again from its first line",
      goal: "What does interrupt do, and what runs twice when the run resumes?",
      blocks: [
        {
          kind: "p",
          text: "LangGraph has a function for this pause. `interrupt(value)` saves the run to its checkpoint and stops it. The `value` is what you want a person to see. The checkpoint is the one from course 2. With the Postgres saver, a waiting run survives a restart.",
        },
        {
          kind: "p",
          text: "To continue, you call the graph again on the same thread, with `Command(resume=decision)`. This is the `Command` class the handoffs used. The `interrupt()` call then returns the decision, and the node carries on.",
        },
        {
          kind: "p",
          text: "AskPEP wraps the call in one function. `request_approval(req)` is `interrupt(req)` and nothing else. The request is an `ApprovalRequest`. It holds the kind of action, which is `open_ticket`, and the thread id.",
        },
        {
          kind: "p",
          text: "It carries the idempotency key from course 2, the requester and the expiry time. Its main field is the **draft**, which is the title, body and PEP numbers that the model proposed.",
        },
        {
          kind: "code",
          lang: "python",
          code: `def file_ticket(svc, runtime, title, body, peps):
    draft = build_the_draft(title, body, peps)  # runs on pass 1 and again on pass 2
    request = build_the_request(draft)          # runs on both passes too
    decision = request_approval(request)        # pass 1 stops here. Pass 2 returns the decision.
    return open_ticket(draft)                   # runs on pass 2 only`,
          caption: "A sketch of the node. Pass 1 stops at the pause. Pass 2 starts again from the top.",
        },
        {
          kind: "p",
          text: "Now the part that catches people out. When the run resumes, LangGraph doesn't continue from the `interrupt()` line. It runs the node again from its first line. This time `interrupt()` returns the decision, and the code after it runs.",
        },
        {
          kind: "p",
          text: "So every line before `interrupt()` runs twice. It runs on pass 1, which stops at the pause. It runs again on pass 2, which finishes. Code before the pause must be safe to repeat.",
        },
        {
          kind: "p",
          text: "You met this rule in course 2, with crashes. A resume is a planned restart, and it has the same shape. Two later sections show where it bites.",
        },
        {
          kind: "callout",
          tone: "insight",
          title: "A paused run costs no process",
          text: "Nothing waits in memory while a person thinks. The run is stored in the checkpoint. With the Postgres checkpointer, a decision can arrive an hour later, and a different server can resume the run.",
        },
        {
          kind: "quiz",
          id: "guardrails06-q2",
          question: "A node calls interrupt() on its third line. After the person answers, which lines run on the resume?",
          options: [
            "Only the lines after the interrupt call",
            "None, because the checkpoint already holds the result",
            "All of them, from the first line, and interrupt() returns the decision",
            "Only the lines before the interrupt call",
          ],
          answer: 2,
          explain:
            "The node starts again from its first line. The first two lines run a second time, and interrupt() returns the decision instead of stopping. That is why code before the pause must be safe to repeat.",
        },
        {
          kind: "p",
          text: "The pause is settled. The next question is what the person can say.",
        },
      ],
    },
    {
      id: "s3-decisions",
      title: "A decision is approve, edit, reject or timeout, and only two of them file a ticket",
      goal: "What can a person decide, and what checks the decision before the run sees it?",
      blocks: [
        {
          kind: "p",
          text: "The person answers with an `ApprovalDecision`. Its `decision` field holds one of four values. They are `approve`, `edit`, `reject` and `timeout`. The decision may also carry an `approver`, a `draft` and a `reason`.",
        },
        {
          kind: "code",
          lang: "python",
          code: `class ApprovalDecision(TypedDict, total=False):
    decision: Literal["approve", "edit", "reject", "timeout"]
    approver: str
    draft: TicketDraft  # required for "edit"
    reason: str`,
        },
        {
          kind: "p",
          text: "An **approve** files the draft the person saw. An **edit** files a draft the person changed. A **reject** files nothing. A **timeout** files nothing either. It is the answer you get when nobody replies in time.",
        },
        {
          kind: "p",
          text: "One function checks a decision before the run sees it. `settle_approval(request, decision)` raises `ValueError` for a decision that isn't one of the four. It insists that an edit carries a valid draft. It turns a decision that arrives after `expires_at` into a timeout, whatever the person chose.",
        },
        {
          kind: "p",
          text: "It also does one quiet thing. For an approve, it copies the request's draft into the decision, and it ignores any draft the caller sent. The ticket filed is the one the person saw. A later section shows why that matters.",
        },
        {
          kind: "p",
          text: "A reject or a timeout ends the run. The tool sets `stop_reason` to `approval_rejected` or `approval_timeout`, and it tells the model not to call the tool again. That is only a request, and a model can ignore a request.",
        },
        {
          kind: "p",
          text: "So a small piece of middleware makes it final. `HaltMiddleware` runs before every model call, like the budget middleware from course 2. If `stop_reason` is a halting reason, it ends the agent with a fixed message from a table called `HALT_TEXT`. The model never writes that message.",
        },
        {
          kind: "compare",
          caption: "What each decision does. Only an approve or an edit files a ticket.",
          columns: ["Decision", "Who sends it", "What the desk files", "How the run ends"],
          rows: [
            ["approve", "A person", "The draft the person saw", "The run carries on, and the writer reports the ticket"],
            ["edit", "A person", "The draft the person changed", "The run carries on, and the writer reports the ticket"],
            ["reject", "A person", "Nothing", "Stopped as approval_rejected, with the fixed message"],
            ["timeout", "The clock, or a late answer", "Nothing", "Stopped as approval_timeout, with the fixed message"],
          ],
        },
        {
          kind: "quiz",
          id: "guardrails06-q3",
          question: "The approver sends an approve with a different draft attached. What does settle_approval do with that draft?",
          options: [
            "It files the attached draft, because the approver chose it",
            "It raises ValueError, because an approve can't carry a draft",
            "It merges the attached draft into the request's draft",
            "It ignores the attached draft and uses the request's draft",
          ],
          answer: 3,
          explain:
            "An approve says yes to the request, and the request holds the draft the approver saw. settle_approval copies that draft in, so the ticket filed is the one the person read. To change the ticket, the approver sends an edit.",
        },
        {
          kind: "p",
          text: "The answer is checked. The desk still has to check who gave it.",
        },
      ],
    },
    {
      id: "s4-decider",
      title: "The decider needs a role, and the model never holds one",
      goal: "Who may decide, and why does the MCP server have no approval tool?",
      blocks: [
        {
          kind: "p",
          text: "A person decides through the resume route, `POST /agent/{thread_id}/resume`, which the last section builds. Anyone who can reach that route could try to approve a ticket, so the desk checks who they are first.",
        },
        {
          kind: "p",
          text: "Chapter 5 gave every API key a role, and its policy table has a line for this action. `approve_ticket` needs the role `staff`. Admins outrank staff, so they pass too. Readers don't.",
        },
        {
          kind: "p",
          text: "The approver is the caller, and never a name in the body. The route has no approver field. A function called `prepare_resume` does the checking, before any run resumes. It takes the principal who made the call and writes it into the decision. If a body names Stan and the key belongs to Ada, an admin, the ticket records Ada.",
        },
        {
          kind: "p",
          text: "It makes three checks in a fixed order, and it resumes nothing until all three pass.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "The role check. A caller without the role gets a `PermissionError`, which the route turns into a 403. The denial goes to the audit trail.",
            "The waiting check. A thread with no waiting request raises `LookupError`, which the route turns into a 409.",
            "The decision check. `settle_approval` raises `ValueError` for a decision that doesn't fit, and the route answers 422.",
          ],
        },
        {
          kind: "p",
          text: "The MCP server has no approval tool, on purpose. An MCP client is a model. If the server offered one, the model that asked for the ticket could approve it. An injected passage could do the same. So `ask_desk` returns the status `awaiting_approval` with the request, and a person decides through the API or the CLI.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Why does your MCP server have no approval tool?",
          text: "A good answer names the threat. The MCP client is a model, so an approval tool would let the model approve its own request. A hostile passage could do the same. End with where the decision goes instead. It goes to an API route or a command that checks the caller's role.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "AskPEP lets a requester approve their own ticket",
          text: "The check looks at the role and nothing else. Stan is staff and asked for the ticket, so Stan may approve it. A stricter desk would also compare `approver` with `requested_by`, and refuse a match. That is a policy choice. The ticket records both names, so you can audit it.",
        },
        {
          kind: "widget",
          id: "guardrails06-decision-paths",
          intro: "Stan asked the desk to open a ticket, and the run paused. Six decisions arrive, one at a time. For each one, predict what the desk does next, then check your answer. A wrong first guess gets a hint and a second try. Watch for the decision that the desk refuses while the run keeps waiting.",
        },
        {
          kind: "quiz",
          id: "guardrails06-q4",
          question: "Ada's key calls the resume route with the body {\"decision\": \"approve\", \"approver\": \"stan\"}. Whose name does the approval row record?",
          options: [
            "stan, because the body names Stan",
            "ada, because the approver is the caller",
            "owner, because the route runs as the owner",
            "Nobody, because the route has no approver field and answers 422",
          ],
          answer: 1,
          explain:
            "The route has no approver field, so a name in the body is ignored. prepare_resume sets the approver to the principal who called, and that is Ada. The extra field does not cause an error.",
        },
        {
          kind: "p",
          text: "A valid decision restarts the node from its first line, and that has two costs.",
        },
      ],
    },
    {
      id: "s5-twice",
      title: "Because the node runs twice, hold the audit rows and file the approved draft",
      goal: "What breaks because the node runs twice, and how do you fix it?",
      blocks: [
        {
          kind: "p",
          text: "The restart has two costs. One is quiet and one is surprising. Both come from the same fact. Code before `interrupt()` runs on pass 1 and again on pass 2.",
        },
        {
          kind: "p",
          text: "The quiet cost is in the audit trail. The checks before the pause write audit rows, such as the authorisation row from chapter 5. Written straight to the audit trail, each row would appear twice. A paused run would also leave a row that says the call was allowed, for a ticket nobody has approved.",
        },
        {
          kind: "p",
          text: "`AuditBuffer` fixes this. Chapter 3 used it to hold events in memory, with `write` and `take`. It also has `flush(sink)`, which writes every held row in order. `file_ticket` writes its rows to the buffer and calls `flush` only when the decision is back. Pass 1 loses its buffer when the node stops. Pass 2 writes each row once.",
        },
        {
          kind: "p",
          text: "In effect, `file_ticket` is `call_tool` with a pause in the middle. `call_tool` is the wrapper that runs the checks around every model-facing tool. `file_ticket` runs the same checks, then asks, then opens the ticket, then writes the executed row.",
        },
        {
          kind: "p",
          text: "Two rows come from outside the node. When a run pauses, the code that called the graph writes a `requested` row once, with the expiry. Each decision also writes a row before the run resumes, with the decision as its `action`.",
        },
        {
          kind: "p",
          text: "The surprising cost comes from the supervisor design in course 2. It runs each worker with `checkpointer=False`. A worker keeps no checkpoint of its own, so on a resume the worker's model runs again from its start. A model can give a different answer the second time. On pass 2 it may ask for a different ticket.",
        },
        {
          kind: "p",
          text: "Suppose the approver read 'Fix the PEP 572 page' and pressed approve. On pass 2 the worker proposes 'Fix the walrus docs'. If the tool filed the pass 2 draft, the ticket would be one that nobody approved.",
        },
        {
          kind: "p",
          text: "So the tool files the draft the decision carries. For an approve, `settle_approval` has copied the request's draft in, so that is the draft the person saw. It also copies in the request's idempotency key, and `file_ticket` uses it for an approve and an edit, so a retry finds the ticket.",
        },
        {
          kind: "p",
          text: "All three designs from course 2 file the ticket once after an approve. Those are handoffs, the supervisor and the baseline. The tests run each design and count the rows.",
        },
        {
          kind: "widget",
          id: "guardrails06-resume-twice",
          intro: "The node `file_ticket` runs twice for one approval. In round 1, choose where the node writes its audit rows, and read both passes line by line. Ship the design you would trust. In round 2, the supervisor's worker proposes a different ticket on pass 2. Choose which draft the node files.",
        },
        {
          kind: "quiz",
          id: "guardrails06-q5",
          question: "On a resume, a supervisor worker's model proposes 'Fix the walrus docs'. The approver read 'Fix the PEP 572 page'. What does file_ticket file?",
          options: [
            "The pass 2 draft, because it is the newest",
            "Both drafts, with one key each",
            "The approved draft, under the request's own key",
            "Neither, and it asks the approver again",
          ],
          answer: 2,
          explain:
            "The approval covers the draft the person read. settle_approval copied it and the request's key into the decision, and file_ticket files the draft under that key. The pass 2 proposal is dropped.",
        },
        {
          kind: "quiz",
          id: "guardrails06-q6",
          question: "Why does file_ticket hold its audit rows in an AuditBuffer until the decision comes back?",
          options: [
            "To save memory while the run waits",
            "Because the audit trail can't take writes during a pause",
            "Because the buffer encrypts each row",
            "Because the node starts again from its first line, so rows written before the pause would be written twice",
          ],
          answer: 3,
          explain:
            "Pass 1 loses its buffer when the node stops, and pass 2 writes each row once. A paused run also leaves no authz row for a ticket nobody has approved.",
        },
        {
          kind: "p",
          text: "Those fixes assume somebody answers. Often nobody does.",
        },
      ],
    },
    {
      id: "s6-expiry",
      title: "A request that nobody answers must expire, or the run waits forever",
      goal: "What happens when nobody answers a request?",
      blocks: [
        {
          kind: "p",
          text: "A paused run costs something. It holds a checkpoint, and a user is waiting for a ticket. If nobody answers, it waits forever. A request needs a deadline.",
        },
        {
          kind: "p",
          text: "Every request carries `expires_at`, set when it is built. The setting `approval_timeout_seconds` reads `APPROVAL_TIMEOUT_SECONDS`. It defaults to 3600, which is one hour. Two things act on the deadline.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "A late decision. `settle_approval` turns it into a timeout, whatever the person chose. A decision at the exact instant of expiry is still in time.",
            "No decision at all. `expire_desk` finds the waiting requests whose expiry has passed, and resumes each one with a timeout.",
          ],
        },
        {
          kind: "p",
          text: "A checkpoint doesn't say how old a pause is, so `expire_desk` reads the audit trail instead. Each pause wrote a `requested` row whose detail holds `expires_at`. `pending_requests` returns the threads whose newest approval row is still `requested`.",
        },
        {
          kind: "p",
          text: "A request that someone decided has a newer row, so the job skips it. The job resumes the rest as the `system` principal, which is an admin, so the role check passes. `askpep desk expire` runs the function and prints `expired N`. You run it on a schedule, from cron.",
        },
        {
          kind: "p",
          text: "The job reads only the last 1000 audit rows. A request older than that would be missed. That is a limit of this design, so a busy desk should run the job often.",
        },
        {
          kind: "widget",
          id: "guardrails06-expiry-clock",
          intro: "Four requests wait on the desk, and one of them has been decided. The expire job runs three times, at three different minutes. Each time, predict which requests it resumes with a timeout. Watch the round where the job runs at the exact minute a request expires.",
        },
        {
          kind: "quiz",
          id: "guardrails06-q7",
          question: "askpep desk expire runs at 10:00:00. A request expires at 10:00:00, and nobody has decided it. What happens?",
          options: [
            "It resumes the request with a timeout, because the deadline has arrived",
            "It leaves the request waiting, because a request is expired only after its expiry has passed",
            "It rejects the request, because the job runs as an admin",
            "It raises an error, because the two times match",
          ],
          answer: 1,
          explain:
            "The job skips any request whose expires_at is not before the cutoff. A decision at the exact instant of expiry is also still in time. The next run of the job, a moment later, resumes it.",
        },
        {
          kind: "p",
          text: "All of this lives in one tool so far. The rest of the desk has to carry the pause and the decision.",
        },
      ],
    },
    {
      id: "s7-wire",
      title: "The graph, the API and the CLI carry a decision to the paused run",
      goal: "How does a decision reach the paused run from HTTP or the terminal?",
      blocks: [
        {
          kind: "p",
          text: "So far the pause lives in `file_ticket`. Three more places must know about it. The graph code reads the pause. The API takes the decision. The CLI lets you decide from a terminal.",
        },
        {
          kind: "p",
          text: "In the graph code, a paused run isn't a failed run. The state that comes back carries an `__interrupt__` key that holds the request. `result_from_state` turns it into a `DeskResult` with the status `awaiting_approval`, and the request sits under `approval`.",
        },
        {
          kind: "p",
          text: "The `/agent` route streams a run as server-sent events, as in course 2. A pause adds an `interrupt` event with the request, just before `done`. The new route `POST /agent/{thread_id}/resume` takes a decision and streams the rest of the run, with the same events.",
        },
        {
          kind: "p",
          text: "The resume route has four failures. It answers 404 for a thread it doesn't know and 409 for one that isn't waiting. It answers 403 for a caller without the role and 422 for a decision that doesn't fit. All four come before the stream starts, so the caller gets a status code and never a half-open stream.",
        },
        {
          kind: "p",
          text: "The 404 covers a second case. A caller with the role who did not start the thread, and is not an admin, gets the 404 that an unknown thread gets. A caller without the role gets the 403 first. The check is `require_thread_owner`, from chapter 5.",
        },
        {
          kind: "p",
          text: "The CLI gets two commands. `askpep desk resume` runs as the owner, an admin, and takes `--decision approve`, `edit` or `reject`. An edit starts from the waiting draft and changes only the `--title` or `--body` you pass. `askpep desk expire` runs the expiry job.",
        },
        {
          kind: "p",
          text: "Five follow-along steps make the edits that the lab's tests need. Each one says which lab step needs it. Do them in order.",
        },
        {
          kind: "step",
          id: "guardrails06-s01",
          title: "Let open_ticket record the approver and take a key",
          text: "Edit `open_ticket` in `src/askpep/agents/tools.py`. Add two keyword arguments, `approved_by` and `key`, both defaulting to `None`. Use `key` when it is given, and work it out from the arguments when it isn't. Add `approved_by` to the insert. The column has existed since the course 2 migration. Do this before lab step 3.",
          file: "src/askpep/agents/tools.py",
          lang: "python",
          code: `# src/askpep/agents/tools.py
@safely
def open_ticket(
    svc: Services,
    title: str,
    body: str,
    peps: list[int],
    *,
    thread_id: str,
    principal: Principal,
    approved_by: str | None = None,
    key: str | None = None,
) -> TicketRef | ToolError:
    # your edit, in three places:
    # 1. The two new keyword arguments above. Both default to None, so course 2 callers keep working.
    # 2. Where you worked out the key, write: key = key or idempotency_key(thread_id, title, peps)
    # 3. In the INSERT, add the column approved_by, and add approved_by to the values.
    ...`,
          expect: "No test covers this edit alone. The Postgres tests in lab step 4 read the approved_by column back.",
        },
        {
          kind: "step",
          id: "guardrails06-s02",
          title: "Report a pause as awaiting_approval",
          text: "A paused run isn't a failed run, so `result_from_state` in `graph.py` must say so. Add `_approval_of`, which finds the open_ticket request among a run's interrupts. Then read the `__interrupt__` key in `result_from_state`. `DeskResult` already has the `approval` field and the `awaiting_approval` status from course 2. Do this before lab step 3.",
          file: "src/askpep/agents/graph.py",
          lang: "python",
          code: `# src/askpep/agents/graph.py
def _approval_of(interrupts: Any) -> ApprovalRequest | None:
    """The approval request among a run's interrupts, or None."""
    for item in interrupts or ():
        value = getattr(item, "value", None)
        if isinstance(value, dict) and value.get("kind") == "open_ticket":
            return value
    return None


# In result_from_state, once you have stop_reason, answer and refused:
#     approval = _approval_of(state.get("__interrupt__"))
#     status = "awaiting_approval" if approval else "done" if stop_reason in FINISHED else "stopped"
#     if approval:
#         answer, refused = "", False
# Then pass status=status and approval=dict(approval) if approval else None to DeskResult.`,
          expect: "A paused run reports status awaiting_approval and an empty answer. The tests in lab step 3 check both.",
        },
        {
          kind: "step",
          id: "guardrails06-s03",
          title: "Announce the pause in the audit trail",
          text: "When a run pauses, write one `requested` row, from outside the node. Its detail holds the expiry, so `expire_desk` can find the request later. Call `_announce` where a run becomes a `DeskResult`, before the output guards. In the capstone that is `_finish`, which `_run` and `_stream` both call. Do this before lab step 4.",
          file: "src/askpep/agents/graph.py",
          lang: "python",
          code: `# src/askpep/agents/graph.py
def _announce(svc: Services, request: ApprovalRequest, who: Principal) -> None:
    """Record that a run is waiting for a person. The row's detail holds the expiry."""
    # your turn: when svc.audit is not None, write one AuditEvent:
    #   AuditEvent("approval", "open_ticket", "requested", who["user_id"], who["role"], request["thread_id"], detail=detail)
    # where detail holds "expires_at", "idempotency_key" and "title" (the draft's title).
    ...


# Where a run becomes a DeskResult, before the output guards (the capstone's _finish):
#     who = state.get("principal") or OWNER  # OWNER is already imported from askpep.agents.tools
#     if result.approval:
#         _announce(svc, result.approval, who)
#         return result  # a paused run has no answer yet, so the output guards have nothing to check`,
          expect: "A paused run leaves one approval row whose action is requested. Its detail holds expires_at, idempotency_key and title.",
        },
        {
          kind: "step",
          id: "guardrails06-s04",
          title: "Stream the pause, and the rest of the run",
          text: "Move the part of `stream_desk` that runs the graph into `_stream`, as you moved the invoke code into `_run` in course 2. Make it yield an `interrupt` event when a run pauses. Then write `stream_resume`, which records the decision and streams the rest. Do this before lab step 6.",
          file: "src/askpep/agents/graph.py",
          lang: "python",
          code: `# src/askpep/agents/graph.py
def _stream(graph, payload: Any, *, svc: Services, thread_id: str) -> Iterator[DeskEvent]:
    # your turn: this is the graph-running part of stream_desk, moved here.
    # stream_desk keeps its start event and the input guards, and ends with
    #   yield from _stream(graph, _turn_input(verdict.text, who), svc=svc, thread_id=thread_id)
    # Two changes inside _stream:
    #   - In "updates" mode, a chunk with no namespace and an "__interrupt__" key is a pause.
    #       paused = data["__interrupt__"]
    #       request = _approval_of(paused)
    #       if request: yield DeskEvent("interrupt", {"request": request})
    #       continue
    #   - After the loop, put the pause back into the state: if paused: state["__interrupt__"] = paused
    #     Then finish the run as _run does, through the same helper, and yield done.
    ...


def stream_resume(graph, resumption: Resumption, *, svc: Services) -> Iterator[DeskEvent]:
    # your turn: yield DeskEvent("start", {"thread_id": resumption.thread_id}), call _record_decision(svc, resumption), then
    #   yield from _stream(graph, Command(resume=resumption.decision), svc=svc, thread_id=resumption.thread_id)
    ...`,
          expect: "The stream of a run that pauses ends with an interrupt event and then done. The done event has the status awaiting_approval.",
        },
        {
          kind: "step",
          id: "guardrails06-s05",
          title: "Decide from the terminal",
          text: "Edit `src/askpep/cli.py`. Make `desk ask` print the waiting request and the command that decides it. Add `desk resume`, which runs as the owner. For an edit, it starts from the waiting draft and changes only the title or body you pass. Add `desk expire`, which prints one line for each request it resumed, and then a count.",
          file: "src/askpep/cli.py",
          lang: "python",
          code: `# src/askpep/cli.py
@desk_app.command("resume")
def desk_resume(
    thread: str,
    decision: Annotated[str, typer.Option("--decision", help="approve, edit or reject.")],
    title: Annotated[str, typer.Option("--title", help="For edit: the new ticket title.")] = "",
    body: Annotated[str, typer.Option("--body", help="For edit: the new ticket body.")] = "",
    reason: Annotated[str, typer.Option("--reason", help="Why. It goes to the audit trail.")] = "",
    graph: Annotated[str, typer.Option("--graph", help="The design that ran the thread.")] = "handoffs",
) -> None:
    """Decide a run that is waiting for approval. The command runs as the owner, who may approve."""
    # your turn:
    # 1. Anything but approve, edit or reject is a typer.BadParameter.
    # 2. Open services and build the graph with check_graph(graph), as desk ask does, and close them in a finally block.
    #    Build an ApprovalDecision with the decision and the reason.
    # 3. For an edit, read the waiting request with pending_approval. None means print the problem to stderr and exit 1.
    #    Otherwise the draft is a TicketDraft with your title or body, and the waiting PEPs.
    # 4. Call resume_desk. LookupError, PermissionError and ValueError print to stderr and exit 1.
    # 5. Print: thread <id>  status <status>  stop <reason>. Then the ticket line, or "no ticket was opened".
    ...


@desk_app.command("expire")
def desk_expire(
    graph: Annotated[str, typer.Option("--graph", help="The design that ran the threads.")] = "handoffs",
) -> None:
    """Resume every request that is past its expiry with timeout. Run it from cron."""
    # your turn: call expire_desk, print one line for each result as in desk resume, then: expired <count>
    ...


# At the end of desk_ask, when result.approval is set, print two lines:
#   waiting for approval: '<title>', expires <expires_at>
#   decide with: askpep desk resume <thread> --decision approve|edit|reject`,
          expect: "desk ask prints the waiting for approval line and the decide with line. desk resume prints the thread, the status and the ticket, or no ticket was opened. desk expire ends with expired and a count.",
        },
        {
          kind: "p",
          text: "The desk can pause and resume now. The reviewer wants to see one ticket go through, and to read the rules it followed.",
        },
      ],
    },
    {
      id: "s8-approval-policy",
      title: "One real approval shows the audit rows in order, and the policy states what code enforces",
      goal: "What does one approved ticket prove, and what must the policy say?",
      blocks: [
        {
          kind: "p",
          text: "An approval policy states what is gated, who decides, how long a request waits and what the approver must check. Prove it by running one request from end to end and reading the audit rows. If a rule in the policy has no matching row, the code doesn't enforce it.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Run one real request up to the pause.",
            "Decide it as a different person.",
            "Read the audit rows in order.",
            "Write the policy, and mark each rule as enforced by code or by habit.",
            "Update the threat model.",
          ],
        },
        {
          kind: "p",
          text: "Stan, who is staff, asked the desk to open a ticket titled Fix the PEP 8 page. The run stopped with the status `awaiting_approval`. The request below is the real object it returned. Ada, an admin, called the resume route and approved it. The ticket was filed once, with `approved_by` set to ada.",
        },
        {
          kind: "p",
          text: "The reviewer read the warning from earlier in this chapter and wrote: so the person who raised a ticket could have approved it? You confirmed it. The check looks at the role only. The reviewer asked for separation, and the product owner said the second team has only two staff members at first.",
        },
        {
          kind: "p",
          text: "You settled it this way. Self-approval stays possible in code for the pilot. The policy marks that rule as enforced by habit, and a weekly query compares `approver` with `requested_by`. A stricter check goes in before the second team grows.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# The request the paused run returned
{"kind": "open_ticket",
 "thread_id": "722ae4b4ae534c1585ce6a5c0e3d6550",
 "idempotency_key": "05fc0036adc469ee33aa2ac1f9d06168ac12d7a1cb07a5fe17ec25e6ec243ce1",
 "draft": {"title": "Fix the PEP 8 page about PEP 8.",
           "body": "Requested in the conversation.",
           "peps": [8]},
 "requested_by": "stan",
 "expires_at": "2026-11-09T15:50:32.145055+00:00"}

# The audit rows, in order
name                  action     who         stage      detail
guard:injection       allow      stan/staff  input      text_chars=52 score=0.0
approval:open_ticket  requested  stan/staff             expires_at, idempotency_key, title
approval:open_ticket  approve    ada/admin              idempotency_key, requested_by=stan
authz:open_ticket     allow      stan/staff             reason="staff may use open_ticket"
guard:injection       allow      stan/staff  tool_call  text_chars=99 score=0.0 tool=open_ticket
tool:open_ticket      executed   stan/staff             ok=True approved_by=ada ticket_id=1
guard:output          allow      stan/staff  output     text_chars=5 score=0.0
guard:pii             allow      stan/staff  output     text_chars=5 score=0.0

# APPROVAL-POLICY.md
Gated actions     open_ticket. The four read tools are not gated.
Who may decide    staff or admin, through POLICY entry approve_ticket.         Enforced by code
The model         never decides. The MCP server has no approval tool.          Enforced by code
What is filed     the draft the approver saw, under the request's key.         Enforced by code
Deadline          APPROVAL_TIMEOUT_SECONDS=3600. After that, a timeout.        Enforced by code
Expire job        askpep desk expire, every 5 minutes, from cron.              Operations
Self-approval     allowed in code. Weekly query: approver = requested_by.      Enforced by habit
Approver checks   1. Did the requester ask for this?
                  2. Does the title or body hold an order, a link or a name?
                  3. Do the PEP numbers match the question?
                  4. If the wording is wrong, send edit. Don't approve.
Watch             If nearly every request is approved for a month, review the gate.`,
          caption: "The request and audit rows are real output from the finished course desk, run on 9 November 2026. The policy is the team's decision.",
        },
        {
          kind: "p",
          text: "Read the audit rows from the top. The `authz` row comes after the approval, because `file_ticket` held its rows in the buffer until the decision came back. Each row appears once, even though the node ran twice. The `executed` row names ada, so the trail joins the request to the person.",
        },
        {
          kind: "p",
          text: "The policy has one column worth reading twice. Four rules are enforced by code. One depends on operations and one on habit. The reviewer accepted that because the file says so, and a rule enforced by habit is the first thing a later audit should test.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# Threat model changes
T7   open_ticket  Evidence: -k guardrails06, audit rows above   closed (self-approval by habit, weekly query)
T2   retrieved    A reworded passage can reach the model, and any ticket it causes now waits for a person   open`,
          caption: "THREAT-MODEL.md, the rows this chapter changes.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# APPROVAL-POLICY.md
Gated actions
Who may decide                                  Enforced by:
The model
What is filed
Deadline
Expire job
Self-approval
Approver checks   (at most four, each a question with a yes or no answer)
Watch             (what you measure, and what makes you review the gate)`,
          caption: "For your next approval gate: the same policy with the values left blank.",
        },
        {
          kind: "p",
          text: "Every control in the threat model now exists. Nothing yet tells you when one stops working. That is row T8. Chapter 7 answers the next question. How do you prove that every layer still holds, on every release?",
        },
      ],
    },
  ],
  lab: {
    title: "Pause the desk before a ticket, and decide from the API or the terminal",
    goal: "Build the approval gate for `open_ticket`. It has the pause, the checks on a decision, the resume and the expiry. It also has the route and commands that carry a decision to a paused run. Steps 1 and 2 start from a stub that raises `NotImplementedError(\"guardrails-06 step N\")`. Four of the 90 tests need a real Postgres, and they skip without one.",
    minutes: 90,
    files: [
      "src/askpep/guards/approval.py",
      "src/askpep/agents/tools.py",
      "src/askpep/agents/factory.py",
      "src/askpep/agents/graph.py",
      "src/askpep/api.py",
      "src/askpep/cli.py",
      "tests/guardrails/test_guardrails06_approval.py",
    ],
    steps: [
      {
        title: "Pause the run and build the request",
        text: "Write `request_approval` and `approval_request` in `src/askpep/guards/approval.py`. The stub raises `guardrails-06 step 1`. `request_approval` is one line that calls `interrupt`. `approval_request` builds the request, copies the draft, and sets `expires_at` to now plus the timeout, as an ISO 8601 string in UTC. The three types ship complete. All nine tests run offline.",
        code: `# src/askpep/guards/approval.py
from datetime import UTC, datetime, timedelta

from langgraph.types import interrupt


def request_approval(req: ApprovalRequest) -> ApprovalDecision:
    # your turn: one line. The first call stops the graph, with req as the pending request.
    # After a resume, the same call returns the decision.
    ...


def approval_request(
    thread_id: str,
    idempotency_key: str,
    draft: TicketDraft,
    requested_by: str,
    *,
    timeout_seconds: int,
    now: datetime | None = None,
) -> ApprovalRequest:
    # your turn:
    # 1. start = now or datetime.now(UTC)
    # 2. Copy the draft: TicketDraft(title=..., body=..., peps=list(...)).
    # 3. expires_at = (start + timedelta(seconds=timeout_seconds)).isoformat()
    # 4. Return the six fields: kind "open_ticket", thread_id, idempotency_key, the draft copy, requested_by, expires_at.
    ...`,
        test: "uv run pytest tests/guardrails -k guardrails06_s1",
      },
      {
        title: "Settle a decision",
        text: "Write `settle_approval` in the same file. The stub raises `guardrails-06 step 2`. Raise `ValueError` for any decision outside the four. Turn a decision after `expires_at` into a `timeout`. Make an edit prove its draft with `_valid_draft`. Give an approve a copy of the request's draft. Carry the request's key into every result. All fourteen tests run offline.",
        code: `# src/askpep/guards/approval.py
def settle_approval(
    request: ApprovalRequest, decision: ApprovalDecision, *, now: datetime | None = None
) -> ApprovalDecision:
    # your turn, in this order:
    # 1. kind = decision.get("decision"). If it is not in DECISIONS, raise ValueError.
    # 2. settled = ApprovalDecision(decision=kind, idempotency_key=request["idempotency_key"]).
    #    Copy approver and reason across when the decision has them. A key in the decision is ignored.
    # 3. If (now or datetime.now(UTC)) is later than datetime.fromisoformat(request["expires_at"]):
    #    set settled["decision"] = "timeout". Unless kind already was "timeout", set the reason
    #    to "The decision came after the request expired." Return it.
    # 4. An edit: settled["draft"] = _valid_draft(decision.get("draft")).
    #    An approve: settled["draft"] = _valid_draft(request["draft"]), whatever the decision held.
    # 5. Return settled, a new dict. A reject needs nothing more.
    ...`,
        test: "uv run pytest tests/guardrails -k guardrails06_s2",
      },
      {
        title: "Pause inside file_ticket",
        text: "Edit `src/askpep/agents/tools.py`. Write `needs_approval` and `file_ticket`, and make `open_ticket_tool` return `file_ticket(svc, runtime, title, body, peps)`. Then add `HaltMiddleware` to `desk_middleware` in `factory.py`, after `UsageMiddleware()`. Do follow-along steps 1 and 2 first. All twelve tests run offline.",
        code: `# src/askpep/agents/tools.py
from askpep.guards.approval import TicketDraft, approval_request, request_approval
from askpep.guards.audit import AuditBuffer


def needs_approval(svc: Services, name: str) -> bool:
    # your turn: True when name is "open_ticket" and the desk keeps an audit trail (svc.audit is not None).
    ...


def file_ticket(svc: Services, runtime: ToolRuntime, title: str, body: str, peps: list[int]) -> Command | str:
    name = "open_ticket"
    who, thread = _principal(runtime), _thread_id(runtime)
    held = AuditBuffer()  # the node starts again on resume, so hold the audit rows back
    stop, args = check_call(svc, runtime, name, {"title": title, "body": body, "peps": peps}, held)
    if stop is not None:
        held.flush(svc.audit)
        return stop
    draft = TicketDraft(title=args["title"], body=args["body"], peps=list(args["peps"]))
    key = idempotency_key(thread, draft["title"], draft["peps"])
    approver: str | None = None
    if needs_approval(svc, name):
        # your turn:
        # 1. request = approval_request(thread, key, draft, who["user_id"],
        #                               timeout_seconds=svc.settings.approval_timeout_seconds)
        # 2. decision = request_approval(request). The run stops here, and starts again at the top on resume.
        # 3. held.flush(svc.audit), now that the decision is back.
        # 4. kind = decision.get("decision"). For anything but approve or edit, return
        #    stop_call(runtime, name, reason, error). The reason is "approval_timeout" for a timeout
        #    and "approval_rejected" otherwise. The error says the ticket was not opened.
        # 5. approver = decision.get("approver") or "unknown", as text.
        #    If the decision carries a draft, file that draft. Take the key from the decision's
        #    idempotency_key, for an approve and an edit, because a re-run worker may propose another draft.
        ...
    else:
        held.flush(svc.audit)
    # your turn: what call_tool does after the checks.
    # Call open_ticket(svc, ..., thread_id=thread, principal=who, approved_by=approver, key=key) with the draft.
    # Write the executed row as call_tool does: _sink(svc).write(AuditEvent("tool", name, "executed", who["user_id"],
    # who["role"], thread, detail=detail)). The detail holds ok and approved_by, and the ticket id when there is one.
    # An error result goes to observe(runtime, name, result). A good one adds ticket=result.
    ...


# In src/askpep/agents/factory.py, add: from askpep.guards.halt import HaltMiddleware
# desk_middleware then returns:
#   [UsageMiddleware(), HaltMiddleware(), BudgetMiddleware(...), NotesMiddleware(...), ContextMiddleware(...)]`,
        test: "uv run pytest tests/guardrails -k guardrails06_s3",
      },
      {
        title: "Resume a run",
        text: "Edit `src/askpep/agents/graph.py`. Add the `Resumption` class, then write `pending_approval`, `prepare_resume`, `_record_decision` and `resume_desk`. `prepare_resume` checks the role, then the waiting request, then the decision. Do follow-along step 3 first, so a pause leaves its `requested` row. Four tests need Postgres, and they read a real ticket row.",
        code: `# src/askpep/agents/graph.py
from datetime import datetime

from langgraph.types import Command

from askpep.guards.approval import ApprovalDecision, ApprovalRequest, settle_approval
from askpep.guards.authz import authorise


@dataclass(frozen=True)
class Resumption:
    """A decision that has been checked and is ready to carry a paused run on."""

    thread_id: str
    request: ApprovalRequest
    decision: ApprovalDecision  # settled: the approver is set, and a late decision is a timeout
    approver: Principal


def pending_approval(graph, thread_id: str) -> ApprovalRequest | None:
    # your turn: graph.get_state({"configurable": {"thread_id": thread_id}}). A graph with no checkpointer
    # raises ValueError, so return None. Otherwise return _approval_of(snapshot.interrupts).
    ...


def prepare_resume(
    graph,
    thread_id: str,
    decision: ApprovalDecision,
    *,
    svc: Services,
    approver: Principal | None = None,
    now: datetime | None = None,
) -> Resumption:
    # your turn, in this order:
    # 1. who = approver or OWNER
    # 2. allowed = authorise(who, "approve_ticket"). When it is denied, write
    #    AuditEvent("authz", "approve_ticket", "denied", who["user_id"], who["role"], thread_id, reason=allowed.reason)
    #    to svc.audit when there is one, then raise PermissionError(allowed.reason).
    # 3. request = pending_approval(graph, thread_id). None raises LookupError.
    # 4. settled = settle_approval(request, decision, now=now). Then settled["approver"] = who["user_id"].
    # 5. Return Resumption(thread_id, request, settled, who).
    ...


def _record_decision(svc: Services, resumption: Resumption) -> None:
    # your turn: when svc.audit is not None, write AuditEvent("approval", "open_ticket", the decision, the approver's id,
    # the approver's role, the thread id, reason=the decision's reason or "", detail={"idempotency_key": ..., "requested_by": ...}).
    ...


def resume_desk(
    graph,
    thread_id: str,
    decision: ApprovalDecision,
    *,
    svc: Services,
    approver: Principal | None = None,
    now: datetime | None = None,
) -> DeskResult:
    # your turn: prepare_resume, then _record_decision, then
    #   _run(graph, Command(resume=resumption.decision), svc=svc, thread_id=thread_id)
    ...`,
        test: "uv run pytest tests/guardrails -k guardrails06_s4",
      },
      {
        title: "Expire what nobody answered",
        text: "Add `SYSTEM` and `expire_desk` to `graph.py`. Read `svc.audit.recent(1000)` and keep the threads that `pending_requests` returns. Skip a request whose expiry is not before the cutoff. Resume the rest as `SYSTEM` with a `timeout`. A desk with no audit trail returns an empty list. All eight tests run offline.",
        code: `# src/askpep/agents/graph.py
from datetime import UTC

from askpep.guards.audit import pending_requests

SYSTEM: Principal = {"user_id": "system", "role": "admin"}


def expire_desk(graph, *, svc: Services, now: datetime | None = None) -> list[DeskResult]:
    # your turn:
    # 1. recent = getattr(svc.audit, "recent", None). With none, return [].
    # 2. cutoff = now or datetime.now(UTC)
    # 3. For each row in pending_requests(recent(1000)): skip it when it has no expires_at,
    #    or when datetime.fromisoformat(row["expires_at"]) >= cutoff.
    # 4. Otherwise resume it with
    #      resume_desk(graph, row["thread_id"], ApprovalDecision(decision="timeout", reason="The request expired."),
    #                  svc=svc, approver=SYSTEM, now=cutoff)
    #    and skip a LookupError, because someone decided it first.
    # 5. Return the list of results.
    ...`,
        test: "uv run pytest tests/guardrails -k guardrails06_s5",
      },
      {
        title: "Decide over HTTP and from the terminal",
        text: "Add `POST /agent/{thread_id}/resume` to `src/askpep/api.py`. The caller is the approver, and a bad request fails before the stream starts. Then do follow-along steps 4 and 5. They add the `interrupt` event and `stream_resume` to `graph.py`, and the `desk resume` and `desk expire` commands to `cli.py`.",
        code: `# src/askpep/api.py
class DraftBody(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    body: str = Field(max_length=4000)
    peps: list[int] = Field(max_length=20)


class ResumeRequest(BaseModel):
    """A decision on a paused run. The approver is the caller, so there is no field for it."""

    decision: Literal["approve", "edit", "reject"]
    draft: DraftBody | None = None  # the edited ticket, for edit
    reason: str = Field(default="", max_length=500)


# Inside create_app, with your other routes:
    @app.post("/agent/{thread_id}/resume")
    def resume_route(
        thread_id: str,
        body: ResumeRequest,
        who: Annotated[Principal, Depends(require_key)],
        graph: GraphName = "handoffs",
    ) -> StreamingResponse:
        # your turn:
        # 1. compiled = desk_graph(graph). If desk_status(compiled, thread_id) is None, raise HTTPException(status_code=404, detail="Unknown thread").
        #    Then, if authorise(who, "approve_ticket").allowed, call require_thread_owner(compiled, thread_id, who).
        #    Import authorise from askpep.guards.authz. A caller without the role skips the check, and
        #    gets the 403 from prepare_resume.
        # 2. decision = ApprovalDecision(decision=body.decision, reason=body.reason).
        #    With a draft, add decision["draft"] = TicketDraft(**body.draft.model_dump()).
        # 3. resumption = prepare_resume(compiled, thread_id, decision, svc=svc, approver=who).
        #    PermissionError becomes a 403, LookupError a 409 and ValueError a 422.
        # 4. Return a StreamingResponse over stream_resume, as the /agent route does for stream_desk.
        #    On a failure, yield one error event.
        ...`,
        test: "uv run pytest tests/guardrails -k guardrails06_s6",
      },
    ],
    verify: "uv run pytest tests/guardrails -k guardrails06",
  },
  recap: [
    "An action you can't undo should wait for a person, and the pause is code in the tool, because a prompt is only a request.",
    "`interrupt()` saves the run to its checkpoint. A resume runs the node again from its first line, so code before the pause must be safe to repeat.",
    "A decision is approve, edit, reject or timeout. Approve and edit file a ticket, and `settle_approval` turns a late decision into a timeout.",
    "The approver is the caller and needs the role `staff` or higher. The MCP server has no approval tool, because the model that asks must not be the one that approves.",
    "`file_ticket` holds its audit rows in an `AuditBuffer` until the decision is back. It files the approved draft, because a resumed worker may propose another.",
    "An `expires_at` on every request and an expire job end a pause that nobody answers. A request counts as expired only after its expiry has passed.",
    "An approval policy marks each rule as enforced by code or by habit, and one traced ticket shows which is which.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In human approval I learned that an irreversible action should pause inside the tool with interrupt(). On resume the node starts again from its first line, so anything before the pause must be safe to run twice. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["guardrails-q07", "guardrails-q08", "guardrails-q20", "guardrails-q21", "guardrails-q22"],
};

export default chapter;
