import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "agents-07-side-effects-and-durable-runs",
  course: "agents",
  number: 7,
  title: "A side effect must be safe to run twice",
  tagline: "If a run crashes after filing a ticket, how do you stop the retry filing it twice? Give the write a key, and let the run carry on from where it stopped.",
  minutes: 45,
  objectives: [
    "Explain why a crash or a retry runs a write again, and why that is harmless for a read and harmful for a write.",
    "Build an idempotency key from the content of a request, and say why a call id, a random value or the clock fails.",
    "Use a unique constraint and ON CONFLICT DO NOTHING to file a ticket once, and tell a new ticket from an existing one.",
    "Say what a checkpoint holds, what a thread id names, and what runs again when you continue a run.",
    "Choose between the Postgres and the in-memory checkpointer, and say which one survives a dead process.",
    "Read the tickets back through the API and the command line, without asking the model.",
  ],
  sections: [
    {
      id: "s1-twice",
      title: "A crash makes a tool run again, so a write must be harmless to repeat",
      goal: "If a run stops after doing something real, what happens on the retry?",
      blocks: [
        {
          kind: "p",
          text: "Chapter 6 ended on a question. If a run stops after doing something real, what happens on the retry? So far nothing the desk did was real in that sense. Its agents search the PEPs, read a section, lint a snippet and look up a Python version. Every one of those tools only reads.",
        },
        {
          kind: "p",
          text: "The writer has a fifth tool, `open_ticket`, which has been a stub since chapter 1. This chapter writes it. A **ticket** is a row in Postgres that asks a person to follow up on a question. One might ask for a fix to the page for PEP 572. The rows live in the `tickets` table.",
        },
        {
          kind: "p",
          text: "Filing a ticket is a **side effect**: a change outside the run, such as a row written or a mail sent. The row stays after the run ends. Each ticket also records its thread, chapter 3's name for one conversation's saved run.",
        },
        {
          kind: "p",
          text: "So the question gets sharper. If a run crashes after filing a ticket, how do you stop the retry filing it twice? A repeated read costs a little time. A repeated write leaves two tickets, and a person has to close one. The harm of a repeat depends on the kind of tool.",
        },
        {
          kind: "p",
          text: "Repeats happen more often than you expect. A model may call the tool again. A user may ask twice. A network call may fail after the work was done, so the code tries again. A process may die in the middle of a tool call. Each time, the write runs again from its first line.",
        },
        {
          kind: "p",
          text: "The crash is the hardest case. The tool may have inserted the row just before the process died. Nothing recorded the result, so the desk can't tell whether the ticket exists. That is an **unknown outcome**: a call that timed out or crashed, so you can't tell whether its effect happened.",
        },
        {
          kind: "p",
          text: "The fix is to give each request a label built from what it asks for. An **idempotency key** is a value built from the request that the store accepts only once, so a repeat changes nothing. The `tickets` table keeps the key and refuses a second row that carries it.",
        },
        {
          kind: "widget",
          id: "agents07-lost-ticket",
          intro: "The writer called `open_ticket`, and the call died before the desk saw a result. Two worlds are possible, and the desk can't tell which one it is in. Choose how the desk reacts, then predict whether both worlds end with exactly one ticket. Run them and compare. Then switch the key on and try again.",
        },
        {
          kind: "callout",
          tone: "analogy",
          title: "A lift button",
          text: "Press a lift button twice and one lift comes. The second press changes nothing. A doorbell is different, because every press rings. A tool that writes should behave like the lift button.",
        },
        {
          kind: "quiz",
          id: "agents07-q1",
          question: "Which of the desk's five tools needs an idempotency key?",
          options: [
            "search_peps, because it runs a query",
            "lint_snippet, because it checks code",
            "python_feature_version, because it looks up a version",
            "open_ticket, because it inserts a row that outlives the run",
          ],
          answer: 3,
          explain: "The first three only read or check. A repeat costs time and nothing else. open_ticket changes the world, so run twice it leaves two tickets.",
        },
        {
          kind: "fold",
          tone: "plain",
          title: "Why nobody promises exactly once",
          text: "A sender that gets no reply has two choices. It can send again, which may duplicate the work. Or it can give up, which may lose the work. No network can promise exactly once. Real systems send at least once and make repeats harmless. That is the design in this chapter.",
        },
        {
          kind: "p",
          text: "A key that works must match every repeat of a request and nothing else. The next section works out what to build it from.",
        },
      ],
    },
    {
      id: "s2-key",
      title: "An idempotency key comes from what the request says, never from the call that carries it",
      goal: "What should the key be built from, so a retry gets the same key and a new request gets a new one?",
      blocks: [
        {
          kind: "p",
          text: "Course 1 called an operation idempotent when running it twice gives the same result as running it once. A read is idempotent already. A write becomes idempotent when the system can recognise a repeat. The idempotency key is how it recognises one.",
        },
        {
          kind: "p",
          text: "The key is a short text that names one intent. Same intent, same key. Different intent, different key. Four rules follow from that.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Build the key from the content of the request, not from the call that carries it.",
            "Build it in code, from the arguments. The model supplies a title, a body and PEP numbers. It never supplies the key, because it would invent a new one on a retry.",
            "Normalise the input, so harmless differences vanish. To normalise is to rewrite variants into one form, such as lower case with single spaces.",
            "Choose the scope on purpose, because the key decides what counts as the same ticket.",
          ],
        },
        {
          kind: "p",
          text: "Three things look stable and are not. Every tool call carries a call id from the framework, and a replayed model call gets a new one. A random value changes on every attempt. So does the clock. None of them can tell a retry from a new request.",
        },
        {
          kind: "p",
          text: "The thread id is the one stable value the run carries. The same id continues a conversation, and a new id starts a new one.",
        },
        {
          kind: "p",
          text: "AskPEP builds its key from three parts. The first is the thread id. The second is the title in lower case, with the spaces collapsed. The third is the PEP numbers, sorted, with repeats removed. Code joins the parts and hashes them with SHA-256, which turns any text into a fixed-length fingerprint.",
        },
        {
          kind: "p",
          text: "The body is left out on purpose. A model that retries may reword the body, and that should not open a second ticket. The thread is in the key on purpose too. The same request next week, in a new conversation, is a new ticket.",
        },
        {
          kind: "widget",
          id: "agents07-ticket-key",
          intro: "Eleven ticket requests reach `open_ticket`. Some repeat an earlier one and some are new. Choose what the key is built from, and read each row. Look for new tickets the key wrongly blocks, and for repeats it lets through. Then ship the key you would trust.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "A reworded request still files a second ticket",
          text: "A key built from content recognises repeats of the same request. It can't recognise the same wish in other words. If the model rewords the title, the desk files a second ticket. Row 11 in the widget shows the gap. The writer's prompt tells it to file once, which covers some of it.",
        },
        {
          kind: "quiz",
          id: "agents07-q2",
          question: "Which is the best idempotency key for open_ticket?",
          options: [
            "The tool call id, because it is unique",
            "A random identifier made inside the tool",
            "A hash of the thread id, the normalised title and the sorted PEP numbers",
            "The current time in milliseconds",
          ],
          answer: 2,
          explain: "The call id, the random value and the clock all change between attempts, so a retry looks like a new request. A hash of the content stays the same for a repeat and changes for a different ticket.",
        },
        {
          kind: "quiz",
          id: "agents07-q3",
          question: "A retry words the title as Fix PEP 572 page instead of Fix the PEP 572 page. What happens?",
          options: [
            "The key matches, and no second ticket is made",
            "The key differs, so the desk files a second ticket",
            "The tool raises an error",
            "The table merges the two tickets",
          ],
          answer: 1,
          explain: "The title is part of the key, and the two titles normalise to different text. A content key catches the same words. Catching the same wish needs meaning, which no hash has.",
        },
        {
          kind: "p",
          text: "A key does nothing until something remembers it and refuses the repeat. The next section gives that job to the database.",
        },
      ],
    },
    {
      id: "s3-insert",
      title: "The database enforces the key, so two callers cannot both win",
      goal: "How does the table refuse a repeat, and how does the tool tell a new ticket from an old one?",
      blocks: [
        {
          kind: "p",
          text: "The `tickets` table has an `idempotency_key` column with a **unique constraint**: a database rule that rejects a second row with the same value. It holds even when two processes insert at the same moment. The stubs ship the table as the migration `004_tickets.sql`, so you don't write it.",
        },
        {
          kind: "p",
          text: "You could look for the key first and insert only when it is missing. That leaves a gap. Two callers can both look, both find nothing and both insert. Let the database decide instead, in one statement.",
        },
        {
          kind: "code",
          lang: "sql",
          caption: "The insert inside open_ticket. The driver fills in the six values.",
          code: `INSERT INTO tickets (idempotency_key, thread_id, title, body, peps, created_by)
VALUES (%s, %s, %s, %s, %s, %s)
ON CONFLICT (idempotency_key) DO NOTHING
RETURNING id`,
        },
        {
          kind: "p",
          text: "`ON CONFLICT DO NOTHING` skips the insert when the key already exists, and it raises no error. `RETURNING id` hands back the id of a new row. When the insert was skipped, no row comes back.",
        },
        {
          kind: "p",
          text: "So the result tells you what happened. A row back means this call made the ticket, and the tool reports `created`. No row means a ticket with that key was already there. The tool then reads its id and reports `existing`.",
        },
        {
          kind: "compare",
          caption: "What open_ticket returns in each case.",
          columns: ["Situation", "The insert gives", "The tool returns"],
          rows: [
            ["The first request", "A new row's id", "A ticket reference with status created"],
            ["A repeat of that request", "No row", "The first ticket's id, with status existing"],
            ["A request the tool refuses", "Nothing, because no insert ran", "A tool error with an error and a hint"],
          ],
        },
        {
          kind: "p",
          text: "Before any insert, the tool checks its input. The title must have 1 to 120 characters. The body can have at most 4000. Every PEP number must be in the corpus.",
        },
        {
          kind: "p",
          text: "A failed check returns a `ToolError`, the pair of an error and a hint from chapter 2. The model reads it and can fix the call. A run with no database gets one too. Nothing was written, so nothing needs undoing.",
        },
        {
          kind: "p",
          text: "The model supplies only the title, the body and the PEP numbers. Code supplies the rest. The tool wrapper reads the thread id from the run's configuration. It reads the principal from state, the user the run acts for, from chapter 3. Until course 3 adds roles, the principal is always the owner. The key is never a tool argument.",
        },
        {
          kind: "quiz",
          id: "agents07-q4",
          question: "The insert with ON CONFLICT DO NOTHING and RETURNING id comes back with no row. What does that tell you?",
          options: [
            "The insert failed, and the ticket must be sent again",
            "A ticket with that key already exists, so the tool should look up its id",
            "The database is down",
            "The title was too long",
          ],
          answer: 1,
          explain: "A skipped insert means the key was already in the table. The tool reads the id of that first ticket and reports it as existing. A down database or a bad title raises or returns an error, and it never reaches this branch.",
        },
        {
          kind: "p",
          text: "Interviewers often ask how you make a write safe to retry.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "How do you make a write safe to retry?",
          text: "A strong answer names the key and where it comes from. It says the key is built in code from stable content, never from a call id or a random value. It says the database enforces it with a unique constraint, and that a repeat returns the first result. Add the limit. A content key misses a reworded request.",
        },
        {
          kind: "fold",
          tone: "hood",
          title: "Why the key lives in the ticket row",
          text: "The key and the ticket are one row, written by one statement. One can't exist without the other. A design with a separate table of keys has a gap. The key could be saved while the ticket insert fails, or the other way round. A single row has no such gap.",
        },
        {
          kind: "p",
          text: "The key makes the write safe to repeat. It does nothing for the model calls that came before the write. A crashed run that starts again from the question pays for them twice. The next section keeps that work.",
        },
      ],
    },
    {
      id: "s4-resume",
      title: "A checkpointer saves every node, so a crashed run carries on where it stopped",
      goal: "After a crash, what survives, and what runs again?",
      blocks: [
        {
          kind: "p",
          text: "A safe write is half the job. The other half is carrying on. Without saved state, a crashed run starts again from the question. Every model is asked again, which costs money. The writer may also choose new words, so the key changes and the ticket doubles.",
        },
        {
          kind: "p",
          text: "Chapter 3's checkpointer prevents that. It saves the state after every node, so a run can resume after a crash. Each save is a **checkpoint**: one saved copy of the state, taken after a node. The checkpointer files each one under the thread id.",
        },
        {
          kind: "p",
          text: "Each desk agent runs as a subgraph, as chapter 4 showed. The checkpointer saves the agent's own nodes too, under the same thread. The desk's own state still shows the agent as one node, as chapter 6 found. The agent's progress sits in its own checkpoints.",
        },
        {
          kind: "p",
          text: "The desk graph gets its checkpointer from `Services`. You give each run a thread id. After a crash, you ask the graph to continue that thread. It loads the last checkpoint and runs the node that was unfinished.",
        },
        {
          kind: "p",
          text: "That node starts again from its first line. It does not resume halfway through. A tool that already wrote something will write it again, unless the write is safe to repeat. This is why the key and the checkpointer come as a pair.",
        },
        {
          kind: "widget",
          id: "agents07-resume-replay",
          intro: "The desk is filing a ticket when the process dies inside `open_ticket`. Choose where it dies, and whether a checkpointer and a key are on. Predict how many tickets exist and how many model calls were paid for. Then continue the run. Try the crash right after the insert with each setting.",
        },
        {
          kind: "p",
          text: "In AskPEP the function is `continue_desk`. It takes the graph and a thread id. It runs the graph with no new input, which tells LangGraph to resume from the checkpoint. It returns the same `DeskResult` as `run_desk`, and its step and token counts cover the whole run.",
        },
        {
          kind: "compare",
          caption: "What a continued run does with each node.",
          columns: ["Node", "What the continued run does"],
          rows: [
            ["Finished before the crash", "Skips it, and loads its result from the checkpoint"],
            ["The node that crashed", "Runs it again from its first line"],
            ["Not reached yet", "Runs it for the first time"],
          ],
        },
        {
          kind: "p",
          text: "A thread that already finished is safe to continue. You get the same answer back, and no model is called.",
        },
        {
          kind: "p",
          text: "The lab simulates a crash with a tool that raises `KeyboardInterrupt`. The `safely` wrapper from chapter 2 catches `Exception`. A `KeyboardInterrupt` is not an `Exception`, so it passes through, as a killed process would.",
        },
        {
          kind: "callout",
          tone: "insight",
          title: "The saved model message keeps the key steady",
          text: "A checkpoint holds the model's exact tool call, with its title. A resume reuses it, so the key comes out the same. A restart asks the model again, and the model may choose new words. That is why the key needs the checkpointer, and why the checkpointer needs the key.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Existing after a resume still means your own ticket",
          text: "After a crash and a continue, the ticket's status can read `existing`. That doesn't mean someone else filed it. It means the key already had a row, and your crashed attempt made it. The id is the right one.",
        },
        {
          kind: "quiz",
          id: "agents07-q5",
          question: "A run crashes inside open_ticket right after the insert. A checkpointer and a key are both on. What does continue_desk do?",
          options: [
            "Starts again from triage and asks every model again",
            "Skips the finished model calls and runs open_ticket again, and the key makes it return the existing ticket",
            "Skips open_ticket, because it already inserted",
            "Raises an error, because the run is corrupt",
          ],
          answer: 1,
          explain: "The checkpoints hold the finished nodes, so no model call repeats. The tool runs again from its first line. The key matches the row that already exists, so no second ticket is made. LangGraph can't skip the tool, because it never learned that the insert landed.",
        },
        {
          kind: "fold",
          tone: "trouble",
          title: "How to tell that a run stopped part-way",
          text: "Read the graph's state for the thread with `graph.get_state(config)`. If its `next` field lists nodes, the run stopped before it finished. An empty `next` means it reached the end. The lab's crash test checks exactly this.",
        },
        {
          kind: "p",
          text: "All of this assumes the checkpoints are still there after the crash. Where they live decides that, and the next section moves them into Postgres.",
        },
      ],
    },
    {
      id: "s5-postgres",
      title: "Postgres keeps the checkpoint after the process is gone",
      goal: "Where should the checkpoints live, so they outlast the process that wrote them?",
      blocks: [
        {
          kind: "p",
          text: "A checkpoint lives where the checkpointer puts it. `InMemorySaver` keeps it in the process's memory. That survives an exception, as in the lab's crash tests. It does not survive a dead process. `PostgresSaver` keeps it in the database, so a new process with a new graph can continue the thread.",
        },
        {
          kind: "p",
          text: "Course 1 gave AskPEP one Postgres database and a folder of numbered migrations. `PostgresSaver` needs tables too. You don't write them, because LangGraph owns that schema. One call, `setup()`, creates them, and it is safe to repeat.",
        },
        {
          kind: "p",
          text: "`setup()` runs when you deploy, not on every run. It creates tables including `checkpoints`, `checkpoint_blobs` and `checkpoint_writes`. The **Store** is LangGraph's long-lived key-value storage, shared across threads. It needs one more table, `store`. Chapter 8 uses it. This chapter only creates it, because it shares the database and the setup call.",
        },
        {
          kind: "p",
          text: "LangGraph's savers need their own connections. Each statement must commit at once, which is called autocommit. Rows must come back as dictionaries. So `make_checkpointer` builds a separate connection pool. The pool opens no connection until a run needs one.",
        },
        {
          kind: "p",
          text: "That pool needs closing when a command or the API ends. `close_langgraph` in `db.py` closes the pool behind a saver or a store. It skips the in-memory pair, which has no pool. You write it in lab step 3 and wire it in at lab step 6.",
        },
        {
          kind: "p",
          text: "Which saver a run gets is a setting. `CHECKPOINTER=postgres` is the default, and `CHECKPOINTER=memory` picks the in-memory pair. A run with no database, such as local mode from course 1, always gets memory, whatever the setting says. `build_durability` makes that choice, and `build_services` calls it.",
        },
        {
          kind: "compare",
          caption: "Which saver and store a run gets.",
          columns: ["CHECKPOINTER", "Database", "Saver and store", "Survives a dead process"],
          rows: [
            ["postgres", "Yes", "PostgresSaver and PostgresStore", "Yes"],
            ["memory", "Yes", "InMemorySaver and InMemoryStore", "No"],
            ["Either value", "No, local mode", "InMemorySaver and InMemoryStore", "No"],
          ],
        },
        {
          kind: "quiz",
          id: "agents07-q6",
          question: "You run the desk in local mode with CHECKPOINTER set to postgres. Which saver does it get?",
          options: [
            "PostgresSaver, because the setting says so",
            "InMemorySaver, because a run with no database always gets memory",
            "No saver at all",
            "An error at start-up",
          ],
          answer: 1,
          explain: "Local mode has no pool, so there is nowhere to keep Postgres checkpoints. build_durability falls back to memory whatever the setting says. The run works, but a dead process loses its checkpoints.",
        },
        {
          kind: "p",
          text: "A crash now costs nothing it shouldn't. One check is left: reading what the desk actually wrote.",
        },
      ],
    },
    {
      id: "s6-read",
      title: "A write you can't read back is a write you can't audit",
      goal: "How do you check the tickets without trusting the model's report?",
      blocks: [
        {
          kind: "p",
          text: "The model reports ticket ids, and it can be wrong or silent. The `tickets` table holds the truth. Two small reads show it without asking any model.",
        },
        {
          kind: "p",
          text: "`GET /tickets` returns the newest tickets first, as JSON. It takes a `limit` from 1 to 500, and the default is 50. It needs the API key, like every other route. In local mode there is no table, so it returns an empty list.",
        },
        {
          kind: "p",
          text: "`askpep tickets list` prints one line for each ticket. A line holds the id, the status, the PEP numbers, the title and the thread. With no database it says so and exits with code 1.",
        },
        {
          kind: "p",
          text: "These reads let you check that the key worked. After a crash and a continue, one thread should show one ticket. If it shows two, the key or the checkpointer is wrong, and you know which thread to look at.",
        },
        {
          kind: "p",
          text: "Interviewers often ask how an agent survives a crash without repeating its side effects.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "How do you make an agent survive a crash without repeating side effects?",
          text: "A strong answer has two halves. Save state after every node under a thread id, so you resume without paying for finished work. Make every write idempotent, because the resumed node runs again. Say where the checkpoints live and what happens when the process dies. Interviewers listen for the unknown outcome, where the insert landed but nothing recorded it.",
        },
        {
          kind: "p",
          text: "The desk now survives a crash and files each ticket once. Its checkpointer keeps every thread whole, and the Store sits empty. A long thread keeps growing, and a new thread knows nothing of the last one. How does the desk remember what was said earlier in a thread, and the user across threads? Chapter 8 answers that.",
        },
      ],
    },
  ],
  lab: {
    title: "Make a ticket safe to file twice, and resume a crashed run",
    goal: "Build the desk's first write and its durability: an idempotency key, `open_ticket`, LangGraph's savers, `continue_desk` and two ways to read the tickets. Lab steps 1, 2 and 5 start from a stub that raises `NotImplementedError(\"agents-07 step N\")`. 21 of the 50 tests need a real Postgres, and they skip without one. Lab step 2 shows how to run them.",
    minutes: 60,
    files: [
      "src/askpep/agents/tools.py",
      "src/askpep/db.py",
      "src/askpep/services.py",
      "src/askpep/agents/graph.py",
      "src/askpep/api.py",
      "src/askpep/cli.py",
      "tests/agents/test_agents07_side_effects_and_durable_runs.py",
    ],
    steps: [
      {
        title: "Build the idempotency key",
        text: "Write `idempotency_key` in `src/askpep/agents/tools.py`. Its stub raises `agents-07 step 1`. Lower-case the title and collapse every run of spaces to one space. Sort the PEP numbers and drop repeats. The argument `peps` can be any iterable, such as a tuple or an iterator, so build the sorted set once. Join the thread id, the title and the PEP numbers, and return the SHA-256 hex digest. Add `import hashlib` at the top of the file. All the tests for this step run offline.",
        code: `# src/askpep/agents/tools.py
import hashlib


def idempotency_key(thread_id: str, title: str, peps: Iterable[int]) -> str:
    # your turn:
    # 1. Normalise the title: lower case, then split on whitespace and join with one space.
    # 2. Normalise the PEPs: sorted(set(peps)), written as text and joined with commas.
    # 3. Hash the thread id, the title and the PEPs, each on its own line, with hashlib.sha256.
    #    Return the hex digest. Call ids, clocks and random values play no part.
    ...`,
        test: "uv run pytest tests/agents -k agents07_s1",
      },
      {
        title: "Open a ticket once",
        text: "Write `open_ticket` in the same file. Its stub raises `agents-07 step 2`. Put `@safely` on it, as lab steps 3 and 4 of chapter 2 did for their tools. `TicketRef` already exists in the file. Check in this order, and return a `ToolError` each time. First, no pool, which means no Postgres. Say so in the error, with the word Postgres. Second, a title that is empty or longer than `TITLE_MAX_CHARS` after stripping. Third, a body longer than `BODY_MAX_CHARS`. Fourth, a PEP number that is not in the `documents` table. Then insert, and read the result as the chapter showed. The pool returns rows as dictionaries, so read `row[\"id\"]`. `open_ticket` is no longer a stub, so the baseline from chapter 5 can file a ticket. `test_agents07_s2_the_baseline_files_a_ticket` checks that offline. It accepts the no-database error only when the error names Postgres. Ten of this step's thirteen tests need Postgres, and a skipped test proves nothing. Start the course 1 database with `docker compose up -d db` in your AskPEP folder. The tests read `TEST_DATABASE_URL`, which defaults to that database. Each test makes a throwaway database and drops it. Set the variable only when your Postgres runs somewhere else.",
        code: `# src/askpep/agents/tools.py
@safely
def open_ticket(
    svc: Services, title: str, body: str, peps: list[int], *, thread_id: str, principal: Principal
) -> TicketRef | ToolError:
    # your turn:
    # 1. No pool: return ToolError(error=..., hint=...). The hint tells the model to give the user the title and body.
    # 2. Strip the title. Check its length against TITLE_MAX_CHARS, and the body against BODY_MAX_CHARS.
    # 3. key = idempotency_key(thread_id, title, peps)
    # 4. Inside "with svc.pool.connection() as conn:", look up the PEPs with
    #      SELECT id FROM documents WHERE id = ANY(%s)
    #    and return a ToolError that includes corpus_hint() when one is missing.
    # 5. Insert the ticket, with created_by set to principal["user_id"] and the PEPs sorted and unique:
    #      INSERT INTO tickets (idempotency_key, thread_id, title, body, peps, created_by)
    #      VALUES (%s, %s, %s, %s, %s, %s) ON CONFLICT (idempotency_key) DO NOTHING RETURNING id
    # 6. A row back: return TicketRef(ticket_id=..., idempotency_key=key, status="created").
    # 7. No row back: SELECT id FROM tickets WHERE idempotency_key = %s, then return status="existing".
    ...`,
        test: "uv run pytest tests/agents -k agents07_s2",
      },
      {
        title: "Create LangGraph's tables and its savers",
        text: "Edit `src/askpep/db.py`, the file from course 1. Write `setup_langgraph`. It opens `PostgresSaver.from_conn_string` and `PostgresStore.from_conn_string` one after the other, each in a `with` block, and calls `setup()` on each. Import both classes inside the function, so a course 1 command never loads LangGraph. Then write `_langgraph_pool`, `make_checkpointer` and `make_store`. The pool has no minimum size, so it opens no connection until a run needs one. The tests prove that, because they build a saver for a database that doesn't exist and nothing fails. Last, write `close_langgraph`. No test covers it, so read it back once. Three of the five tests need Postgres.",
        // CHECK: autocommit and dict_row for PostgresSaver are in the langgraph-checkpoint-postgres docs, read on 21 Oct 2026. prepare_threshold=0 for a pooled connection came from the capstone code and was not found in those docs. Confirm that LangGraph still needs it.
        code: `# src/askpep/db.py
def setup_langgraph(settings: Settings) -> None:
    # your turn: import PostgresSaver and PostgresStore here, inside the function.
    # For each, open .from_conn_string(settings.database_url) in a with block and call .setup().
    ...


def _langgraph_pool(settings: Settings) -> ConnectionPool:
    # your turn: a ConnectionPool on settings.database_url with min_size=0, max_size=5 and open=True.
    # Its kwargs are {"autocommit": True, "prepare_threshold": 0, "row_factory": dict_row}.
    ...


def make_checkpointer(settings: Settings):
    # your turn: import PostgresSaver here, and return PostgresSaver(_langgraph_pool(settings)).
    ...


def make_store(settings: Settings):
    # your turn: the same, with PostgresStore.
    ...


def close_langgraph(*parts: object) -> None:
    """Close the pool behind a checkpointer or store from the factories above. Anything else is ignored."""
    # your turn: for each part, take conn = getattr(part, "conn", None).
    # If conn is a ConnectionPool, call conn.close(). The in-memory saver and store have no conn.
    ...`,
        test: "uv run pytest tests/agents -k agents07_s3",
      },
      {
        title: "Choose the checkpointer",
        text: "Edit `src/askpep/services.py`. Write `build_durability`. It returns a Postgres saver and store when `with_postgres` is true and `settings.checkpointer` is `postgres`. Otherwise it returns `InMemorySaver` and `InMemoryStore`. Import the in-memory classes inside the function. Then change `build_services`. The local branch calls `build_durability(settings, with_postgres=False)`. The database branch calls it with `True`. Pass the two results to `Services` as `checkpointer` and `memory`. `Services` has had those fields since chapter 1. All the tests for this step run offline.",
        code: `# src/askpep/services.py
from askpep.db import make_checkpointer, make_pool, make_store


def build_durability(settings: Settings, *, with_postgres: bool) -> "tuple[BaseCheckpointSaver, BaseStore]":
    """Checkpointer and store. Postgres when the pool exists and CHECKPOINTER=postgres, else in memory."""
    # your turn:
    # 1. If with_postgres and settings.checkpointer == "postgres",
    #    return make_checkpointer(settings) and make_store(settings).
    # 2. Otherwise import InMemorySaver (langgraph.checkpoint.memory) and InMemoryStore (langgraph.store.memory),
    #    and return one of each.
    ...


def build_services(settings: Settings) -> Services:
    # Keep what the function does today, and add the durability pair:
    # - in the local branch: checkpointer, memory = build_durability(settings, with_postgres=False)
    # - in the database branch: the same call with with_postgres=True
    # - pass checkpointer=checkpointer and memory=memory to Services in both branches
    ...`,
        test: "uv run pytest tests/agents -k agents07_s4",
      },
      {
        title: "Continue a crashed run",
        text: "Edit `src/askpep/agents/graph.py`. Your `run_desk` already invokes the graph and turns the final state into a `DeskResult`. Move that part into a helper, `_run(graph, payload, *, svc, thread_id)`. If you already did that in chapter 6, only `continue_desk` is left. The helper builds the config with `_config`, times the call, catches `GraphRecursionError` as `run_desk` does, and calls `result_from_state`. Then `run_desk` becomes one line that calls `_run` with `_turn_input(question, principal)` as the payload. `continue_desk` is one line too. It calls `_run` with `None` as the payload, which tells LangGraph to resume from the checkpoint. The tests crash a tool on purpose with `crash_once` from `tests/agents/helpers.py`, which you don't write. Two of the eight tests need Postgres.",
        code: `# src/askpep/agents/graph.py
def _run(graph, payload: dict[str, Any] | None, *, svc: Services, thread_id: str) -> DeskResult:
    # your turn: this is the invoke-and-convert code from run_desk.
    # 1. config = _config(svc, thread_id), and start the clock with time.perf_counter().
    # 2. state = dict(graph.invoke(payload, config)). On GraphRecursionError, the state is
    #    {**_checkpoint_values(graph, config), "stop_reason": "recursion_limit"}.
    # 3. Return result_from_state(state, thread_id=thread_id, latency_ms=...).
    ...


def continue_desk(graph, thread_id: str, *, svc: Services) -> DeskResult:
    """Carry on a run that stopped part-way, from its last checkpoint. It needs a checkpointer."""
    # your turn: one line. Call _run with None as the payload.
    ...`,
        test: "uv run pytest tests/agents -k agents07_s5",
      },
      {
        title: "Read the tickets",
        text: "Edit `src/askpep/api.py`. Add `GET /tickets`, behind the same `require_key` as the other routes. It takes `limit` from 1 to 500, with a default of 50, and returns the newest tickets first. FastAPI's `Query` enforces the range, so a bad limit gives a 422. In local mode, where `svc.pool` is `None`, return an empty list. Then edit `src/askpep/cli.py`. Add a `tickets` command group with one command, `list`, that takes `--limit` with a default of 20. It prints one line for each ticket: the id, the status, the PEP numbers, the title and the thread. With no tickets it prints `no tickets`. With no database it prints a message to the error stream and exits with code 1. Then close the LangGraph pools, which no test covers. In `desk ask` and `desk compare`, put the work in `try` and call `close_langgraph(svc.checkpointer, svc.memory)` in `finally`. Import it from `askpep.db` inside each function. Your `lifespan` in `api.py` already uses an `AsyncExitStack`. Add `stack.callback(close_langgraph, svc.checkpointer, svc.memory)` as its first callback, above the one that closes `svc.pool`. An exit stack runs its callbacks in reverse, so this one runs last. Six of the ten tests need Postgres.",
        code: `# src/askpep/api.py
    @app.get("/tickets", dependencies=[Depends(require_key)])
    def tickets(limit: int = Query(default=50, ge=1, le=500)) -> list[dict]:
        # your turn:
        # 1. In local mode (svc.pool is None) return [].
        # 2. Otherwise select id, thread_id, title, body, peps, status, created_by and created_at
        #    from tickets, newest first (ORDER BY id DESC), with LIMIT %s.
        # 3. The pool returns dictionaries, so fetchall() is the list to return.
        ...`,
        test: "uv run pytest tests/agents -k agents07_s6",
      },
    ],
    verify: "uv run pytest tests/agents -k agents07",
  },
  recap: [
    "A side effect is a change outside the run. Any tool call can run again, through a retry, a double click or a continue after a crash.",
    "An idempotency key comes from the content of the request. Code builds it. A call id, a random value or the clock would change on every attempt.",
    "A unique constraint with ON CONFLICT DO NOTHING lets the database refuse the repeat, and RETURNING tells you whether this call made the row.",
    "A checkpointer saves a checkpoint after each node under a thread id. A continued run skips finished nodes and reruns only the one that crashed.",
    "The key and the checkpointer work as a pair, because the checkpoint keeps the model's exact words and the key stops the repeated insert.",
    "PostgresSaver keeps checkpoints after the process dies, and LangGraph's own setup call creates its tables.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In side effects and durable runs I learned that any tool call can run twice. So every write needs an idempotency key built from the request's content, and every run needs a checkpointer so a crash resumes instead of restarting. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["agents-q07", "agents-q08", "agents-q17", "agents-q23", "agents-q24"],
};

export default chapter;
