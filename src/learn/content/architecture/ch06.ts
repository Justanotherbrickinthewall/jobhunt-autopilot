import type { Chapter } from "../types";

// Tag: askpep-c6-architecture. This chapter has no lab. The learner writes section 5 of docs/design.md and one ADR.
// Every state fact below was read in capstone/src/askpep on main, in the locked langgraph-checkpoint-postgres 3.2.0,
// or in setup/revision5/FACTS.md (checked 20 October 2026).

const chapter: Chapter = {
  id: "architecture-06-state-and-data",
  course: "architecture",
  number: 6,
  title: "Each kind of state needs one owner and one store",
  tagline: "Map every row AskPEP keeps to one writer, a retention rule and a region. That map is how T11 closes.",
  minutes: 70,
  objectives: [
    "List what AskPEP keeps, and find the one place that writes each kind.",
    "Find what ends the life of each kind of state.",
    "Set a retention floor for each store from the code that reads it.",
    "Follow one desk request into every store, and say which copies you can delete.",
    "Place the golden set, the baseline, the reports and the verdicts.",
    "Name the region of each hop, and say what you can promise.",
    "Write the state section and ADR from your own numbers.",
    "Read AskPEP's own state ADR, and reuse its shape to close a data finding.",
  ],
  sections: [
    {
      id: "s1-one-writer-one-store",
      title: "Seven of AskPEP's eight kinds of state have one writer and one store",
      goal: "What does AskPEP keep, and who writes each kind?",
      blocks: [
        {
          kind: "p",
          text: "Every copy of a question lives in a place a course added, and nobody planned them as a set. That is why T11 is still open. On Tuesday 8 December the security reviewer asks for the whole map, with a date on it. After one desk request ends, rows are left in several places.",
        },
        {
          kind: "p",
          text: "In this chapter, **state** means anything AskPEP remembers after the code that made it has returned. A **store** is the place that state lives, such as a table, a file or the memory of a process. The **owner** of a kind of state is the one function that writes it.",
        },
        {
          kind: "p",
          text: "Section 5 of the design is still empty. By the end of this chapter you will have filled it and written one ADR.",
        },
        {
          kind: "p",
          text: "The table lists the eight kinds of state that AskPEP keeps. Four of the stores are AskPEP's own tables, made by migrations. The checkpoint tables and the `store` table belong to LangGraph. Read the last column first.",
        },
        {
          kind: "compare",
          caption: "Eight kinds of state, where each one lives and the one writer of each.",
          columns: ["Kind of state", "What it is", "Where it lives", "The one writer"],
          rows: [
            ["Checkpoints", "The desk's saved state after each graph step, from the agents course.", "The tables `checkpoints`, `checkpoint_blobs` and `checkpoint_writes` in Postgres.", "LangGraph's `PostgresSaver`."],
            ["Notes", "What the desk remembers about one user.", "The `store` table in Postgres, under the namespace `askpep`, `notes` and the user id.", "`remember` in `agents/memory.py`."],
            ["Tickets", "The tickets the desk files after a person approves.", "The `tickets` table in Postgres.", "`open_ticket` in `agents/tools.py`."],
            ["Traces", "One row per request, with timings, tokens, cost and stop reason.", "The `traces` table in Postgres.", "`Trace.write` in `tracing.py`."],
            ["Audit events", "One row per guard decision, permission check or approval.", "The `audit` table in Postgres, append-only.", "The audit sink in `guards/audit.py`."],
            ["Feedback", "One verdict on one trace, from a user's thumbs or an online judge.", "The `feedback` table in Postgres.", "`record_feedback` in `telemetry/feedback.py`."],
            ["Answer cache", "A finished answer kept for the next identical question.", "The memory of one process.", "`InMemoryCache` in `cache.py`."],
            ["Eval records", "Golden questions, labels, baselines and reports.", "Files in Git, files Git ignores, and outside services.", "Four. The section on eval records lists them."],
          ],
        },
        {
          kind: "p",
          text: "Every table in that list has exactly one function that inserts into it. A teammate who wants to know how a ticket is written reads `open_ticket` and nothing else. That is the rule in the title of this chapter.",
        },
        {
          kind: "p",
          text: "Almost nothing updates a row after it is written. The one exception is `record_feedback`. A second verdict from the same person on the same trace replaces the first.",
        },
        {
          kind: "p",
          text: "The cache is off in AskPEP's design, with `CACHE_ENABLED=false`. When it is on, it is the only kind of state in the table that lives in the memory of a process.",
        },
        {
          kind: "p",
          text: "The ownership is already right for seven of the eight. What is missing is a rule for how long each store keeps its rows. The next three sections are about that rule. First, test your own map.",
        },
        {
          kind: "widget",
          id: "architecture06-store-sorter",
          intro:
            "Eight things happen in AskPEP, one for each kind of state. Pick the store for each one, then check. The first check marks each pick right or wrong and says nothing more. Try to place all eight before the second check, which shows the reasons.",
        },
        {
          kind: "quiz",
          id: "architecture06-q1",
          question: "A teammate adds a second function that inserts into `traces`, called from the API layer. What is the first cost?",
          options: [
            "The table gets slower, because two writers lock it.",
            "A change to the shape of a trace row now needs two edits, and a bad row has two suspects.",
            "Postgres refuses the second writer.",
            "Nothing, because both functions write the same columns.",
          ],
          answer: 1,
          explain:
            "Postgres allows many writers, and two inserts do not slow each other in any way you would notice. The cost is in the code. A new column needs two edits, and a bad row could have come from either function. One owner removes both problems.",
        },
        {
          kind: "p",
          text: "Ownership is the easy half. What ends the life of each row?",
        },
      ],
    },
    {
      id: "s2-only-the-cache-expires",
      title: "Only the cache expires, so every other store grows until a person deletes rows",
      goal: "What deletes each kind of state, and what does the code end on its own?",
      blocks: [
        {
          kind: "p",
          text: "**Retention** is how long a store keeps a row before something deletes it. A store with no retention rule keeps its rows forever. That describes most of AskPEP.",
        },
        {
          kind: "p",
          text: "You can check this against your own project. The three steps below count the rows, weigh the tables, and search the code for anything that deletes. Run them from the project folder, with Postgres up.",
        },
        {
          kind: "step",
          id: "architecture06-s01",
          title: "Count the rows in each store",
          text: "Run this from the project folder. It reads six stores and changes nothing. If a table is missing, run `uv run askpep migrate` first, which creates every table, LangGraph's included.",
          lang: "bash",
          code: `docker compose exec db psql -U askpep -c "
SELECT 'traces' AS state, count(*) AS row_count, min(ts) AS oldest FROM traces
UNION ALL SELECT 'audit', count(*), min(ts) FROM audit
UNION ALL SELECT 'tickets', count(*), min(created_at) FROM tickets
UNION ALL SELECT 'feedback', count(*), min(ts) FROM feedback
UNION ALL SELECT 'checkpoints', count(*), NULL FROM checkpoints
UNION ALL SELECT 'store', count(*), min(created_at) FROM store
"`,
          expect:
            "Six lines, one each for traces, audit, tickets, feedback, checkpoints and store. Each has a row count. A table that nothing has written to shows 0 and an empty oldest date. The checkpoints line never has an oldest date, because that table keeps none. Your numbers differ from anyone else's.",
        },
        {
          kind: "step",
          id: "architecture06-s02",
          title: "Weigh every table",
          text: "Run this next. It lists each table with its total size, indexes included, largest first. Write down the sizes of `traces` and `checkpoint_blobs`. Step 6 uses them as evidence.",
          lang: "bash",
          code: `docker compose exec db psql -U askpep -c "
SELECT relname AS table_name, pg_size_pretty(pg_total_relation_size(oid)) AS total_size
FROM pg_class
WHERE relkind = 'r' AND relnamespace = 'public'::regnamespace
ORDER BY pg_total_relation_size(oid) DESC
"`,
          expect:
            "One line per table, largest first. `chunks` is usually on top, because it holds the corpus and its vectors. The checkpoint tables and `traces` come after it. A table with no rows still shows a small size, because of its indexes. Your sizes differ.",
        },
        {
          kind: "step",
          id: "architecture06-s03",
          title: "Search the code for anything that deletes",
          text: "Run this in the project folder. It searches the AskPEP source for a delete statement and for the three delete tools in the locked packages. Read the result before you read on.",
          lang: "bash",
          code: `grep -rnE "DELETE FROM|delete_thread|prune\\(|sweep_ttl" src/askpep`,
          expect:
            "Two lines, both in `src/askpep/ingest.py`. One removes the chunks of a changed document and the other removes documents that left the corpus. Nothing removes a trace, a ticket, an audit row, a note or a checkpoint.",
        },
        {
          kind: "p",
          text: "The cache is the one store with a rule. It drops an entry after `CACHE_TTL_SECONDS`, which is 3600, and it holds at most `CACHE_MAX_ENTRIES`, which is 1000. A restart empties it. Chapter 5 built it.",
        },
        {
          kind: "p",
          text: "One job you already know could be mistaken for a clean-up. `askpep desk expire`, from the guardrails course, resumes each approval that timed out. It removes nothing.",
        },
        {
          kind: "p",
          text: "The packages that AskPEP uses could do more. The checkpointer in your lock file has `delete_thread`, which removes one thread from all three checkpoint tables. It also has `prune`, which takes a strategy. The strategy `delete` removes whole threads, and `keep_latest` keeps only the newest checkpoint of each.",
        },
        {
          kind: "p",
          text: "The store accepts a `ttl` in minutes when you write a note, and it has a sweeper that removes expired notes. AskPEP calls none of these tools. They are there for the day you write the rule.",
        },
        {
          kind: "p",
          text: "One more gap sits in the schema. A ticket has a `status` column that allows `closed`. No code sets it, so every ticket the desk files stays open. A rule that deleted closed tickets would delete none.",
        },
        {
          kind: "quiz",
          id: "architecture06-q2",
          question: "A trace row in your database is 400 days old. What in AskPEP will delete it?",
          options: [
            "The `CACHE_TTL_SECONDS` setting, after 3600 seconds.",
            "`askpep desk expire`, the next time it runs.",
            "Nothing. You would have to write a job that does it.",
            "The checkpointer's `prune`, which runs on every request.",
          ],
          answer: 2,
          explain:
            "The cache setting only governs cache entries. `desk expire` resumes paused approvals and deletes nothing. `prune` exists in the package, and AskPEP never calls it. The step 3 search showed that only ingest deletes anything.",
        },
        {
          kind: "p",
          text: "Rows can be deleted, but too early breaks something. How long must each one stay?",
        },
      ],
    },
    {
      id: "s3-floor-from-readers",
      title: "A store's retention floor is the longest window that any reader needs",
      goal: "How long must each store keep its rows, and who says so?",
      blocks: [
        {
          kind: "p",
          text: "A **retention floor** is the shortest time a store must keep a row, because something still reads it. A **retention ceiling** is the longest time you may keep it. Your customer's rules, your own policy or the law that applies to the data set the ceiling.",
        },
        {
          kind: "p",
          text: "Find the floor first. A row deleted before its reader is done breaks that reader. The ceiling comes second, and the gap between the two is yours to choose.",
        },
        {
          kind: "p",
          text: "The table gives each store, the code that reads it and the floor that follows. Two rows need more than a number, so the next paragraphs explain them.",
        },
        {
          kind: "compare",
          caption: "The floor of each store, from its readers. The checkpoint figure is a worked example for one setting of `desk expire`.",
          columns: ["Store", "The reader", "The floor", "Where the floor comes from"],
          rows: [
            ["Traces", "`load_rows`, for the cost report and the service objectives.", "28 days.", "The window in `slos.json`, set in course 5."],
            ["Checkpoints", "`resume_desk`, which `desk expire` calls.", "3600 seconds plus the gap between runs of `desk expire`.", "`APPROVAL_TIMEOUT_SECONDS`."],
            ["Audit", "`recent`, which reads the newest 1000 rows.", "The checkpoint floor for pending approvals. For the record of who approved, your policy.", "`desk expire`, and the guardrails course."],
            ["Tickets", "The API and the command line, newest first.", "Set by the people who work the tickets.", "No code needs an old ticket."],
            ["Notes", "`recall`, which reads at most 200 notes of one user.", "Until the user asks to forget.", "`agents/memory.py`."],
            ["Feedback", "`load_feedback`, and the eval step that turns a thumbs-down into a candidate question.", "The trace floor, because a verdict means little without its trace.", "The `trace_id` join."],
            ["Cache", "`get`.", "3600 seconds, already enforced.", "`CACHE_TTL_SECONDS`."],
          ],
        },
        {
          kind: "p",
          text: "A paused desk run waits for a person for up to `APPROVAL_TIMEOUT_SECONDS`, which is 3600. After that, `askpep desk expire` resumes the thread with a timeout. The resume reads the checkpoint, so the checkpoint has to be there.",
        },
        {
          kind: "p",
          text: "Say you run `desk expire` every hour. The floor is then two hours, one for the timeout and up to one more for the wait. Delete a checkpoint at 90 minutes and the command raises a `LookupError` for that thread and skips it.",
        },
        {
          kind: "p",
          text: "`prune` with `keep_latest` is the safer tool. It shrinks a thread and leaves the checkpoint that a resume loads. Use the `delete` strategy only after the floor has passed.",
        },
        {
          kind: "p",
          text: "Audit has two readers. People read it to see who approved what. `desk expire` reads its newest 1000 rows to find pauses that nobody has decided. A job that deletes by age can remove a `requested` row that `desk expire` still needs.",
        },
        {
          kind: "p",
          text: "The reverse also bites. If 1000 newer audit rows pile up behind a pause, `desk expire` never sees that pause. Its checkpoint then stays forever. Both limits belong in your ADR.",
        },
        {
          kind: "p",
          text: "Traces carry one more limit. The reader takes at most the newest 5000 rows. A service with more than 5000 requests in 28 days shows a shorter window than the one you set. At 1,000 requests a day, AskPEP's window would be five days.",
        },
        {
          kind: "quiz",
          id: "architecture06-q3",
          question: "You run `askpep desk expire` every 30 minutes. What is the shortest checkpoint retention that still lets it resume every expired pause?",
          options: ["30 minutes.", "60 minutes.", "90 minutes.", "28 days."],
          answer: 2,
          explain:
            "A pause is due after 3600 seconds, which is 60 minutes. The command then runs at most 30 minutes later, so the checkpoint has to last 90 minutes. Anything shorter can delete a checkpoint that the next run still needs. The 28 days belong to traces and are far above the need.",
        },
        {
          kind: "p",
          text: "A schedule covers old rows. What about one person's conversation on a day they choose?",
        },
      ],
    },
    {
      id: "s4-deletion-reaches-every-copy",
      title: "A request to delete one conversation has to reach every copy of it",
      goal: "Where does one conversation end up, and which copies can you delete?",
      blocks: [
        {
          kind: "p",
          text: "Retention deletes on a schedule. A person can also ask you to delete their data on a day of their choosing. The code for that is different, and AskPEP has none of it today.",
        },
        {
          kind: "p",
          text: "Follow one request through the stores. A user asks the desk to file a ticket. The desk pauses, a person approves, and the ticket is filed. Five copies of that request now exist.",
        },
        {
          kind: "p",
          text: "Two details change what a trace holds. First, `/search` stores the query as typed, while `/ask` and the desk store the text that the input guard returned. Second, a trace keeps at most 4000 characters of the answer, set by `ANSWER_LIMIT`.",
        },
        {
          kind: "p",
          text: "One copy sits outside your database. When tracing is on, LangSmith holds the run. Its Developer plan keeps a base trace for 14 days, as checked on 20 October 2026.",
        },
        {
          kind: "widget",
          id: "architecture06-copy-clock",
          intro:
            "Pick the copies that still exist on day 40, then check. After the verdict, a slider lets you move the age of the request and watch which copies expire. LangSmith holds a copy only when tracing is on. The ages are illustrative.",
        },
        {
          kind: "p",
          text: "Four of the copies share a key. The checkpoint tables, `traces`, `audit` and `tickets` all have a `thread_id` column. A deletion by thread can reach all four. The `feedback` table joins a trace by `trace_id`, so it needs one more hop.",
        },
        {
          kind: "p",
          text: "Notes are keyed by user and keep the thread id only inside the value. A deletion by thread has no key for them, and a deletion by user does. Decide which key your policy deletes by, and write it down.",
        },
        {
          kind: "p",
          text: "Audit is the hard case. It is append-only on purpose, so that nobody can rewrite who approved what. A deletion request asks you to rewrite it. The cloud course grants the service insert and read rights on that table only. The service could not delete an audit row even if you asked.",
        },
        {
          kind: "p",
          text: "One option is to keep the row and replace the user id with a token that nothing maps back. Another is to keep it whole and say why in your policy. Your customer's rules decide between them, and your ADR records the choice.",
        },
        {
          kind: "fold",
          tone: "hood",
          title: "Why one thread leaves rows in three checkpoint tables",
          text: "The checkpointer writes a row to `checkpoints` after each graph step. The larger values go to `checkpoint_blobs`, and writes that are still pending go to `checkpoint_writes`. A hand-written delete has to hit all three tables, and a missed table leaves the conversation behind. `delete_thread` hits all three.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "A user asks you to delete their data",
          text: "Answer first: list every store that holds the data, then name the key that finds it in each. Say which stores can delete by that key and which are append-only. For the append-only store, say what you keep, what you strip and why. Close with the outside copies, such as a tracing service, and who deletes those.",
        },
        {
          kind: "quiz",
          id: "architecture06-q4",
          question:
            "A desk conversation ended with an approved ticket. Tracing is off and nobody gave a thumbs. Which stores hold a copy of it?",
          options: [
            "The checkpoint tables only, because the desk's state is the one copy.",
            "The checkpoint tables and the tickets table.",
            "The checkpoint tables, `traces`, `audit` and `tickets`.",
            "Nothing, because the audit detail is redacted.",
          ],
          answer: 2,
          explain:
            "Each of the four writers inserted its own row, and all four rows carry the thread id. Redaction removes personal text from the audit detail. It does not remove the row, which still names the thread and the user. The cache holds an answer, not this conversation.",
        },
        {
          kind: "p",
          text: "One kind of state in the table was left vague. Where do the eval records fit?",
        },
      ],
    },
    {
      id: "s5-eval-records-need-a-row-each",
      title: "Eval records have several writers, so the map needs a row for each kind",
      goal: "Why do eval records need four rows in the map?",
      blocks: [
        {
          kind: "p",
          text: "The last kind of state in the table looks like one thing and is four. Each has a different writer, a different store and a different life. Treat them as separate rows in section 5.",
        },
        {
          kind: "list",
          items: [
            "The golden set, the datasets, the labels and the gate settings are files in Git. A pull request writes them, so their history is the repository's history.",
            "The baseline, `evals/baselines/main.json`, is also a file in Git. You write it by running the gate live and committing the report. The gate compares every later run with it.",
            "Reports and candidates sit in `evals/reports` and `evals/candidates`. Git ignores both. The eval commands write them, and they live on the machine that ran the command.",
            "Verdicts on live traffic are rows in the `feedback` table, and runs in an outside service such as LangSmith or Braintrust.",
          ],
        },
        {
          kind: "p",
          text: "The ignored folders cost you something. A hosted runner that starts clean for each job loses its reports when the job ends. If the gate compares with a baseline that only exists on your laptop, it gives a different answer in each place.",
        },
        {
          kind: "p",
          text: "Outside services have their own clocks. LangSmith's 14 days came up in the deletion section, and Braintrust Starter keeps data for 14 days as well. Both were checked on 20 October 2026. A 28 day objective cannot be fed from either.",
        },
        {
          kind: "p",
          text: "One path carries state between stores. `golden_candidates`, from the llmops course, turns a failed trace into a candidate question with its text redacted. A person labels it and promotes it into `golden.jsonl`. The question is then a file that Git keeps forever. Deleting the trace row does not delete it.",
        },
        {
          kind: "p",
          text: "So the promotion step needs two rules. Redaction catches emails, phone numbers, card numbers and secrets, and it misses a name in free text. A person must read each candidate before the commit. The candidate id also holds the first 12 characters of the trace id, so a deletion request can search the golden set for it.",
        },
        {
          kind: "quiz",
          id: "architecture06-q5",
          question:
            "A user's thumbs-down was mined into `golden.jsonl`, and the file was committed. The user then asks you to delete their data. What is true?",
          options: [
            "Deleting their trace and feedback rows is enough, because the golden set is derived from them.",
            "The question survives in Git history, so you would have to rewrite the file and its history, or have kept it out of the file.",
            "Git removes it on the next gate run.",
            "The question is safe, because the golden set is ignored by Git.",
          ],
          answer: 1,
          explain:
            "A promoted question is a copy in a file, and a file in Git outlives the rows it came from. The golden set is not ignored. Only the candidates folder is. The cheap fix is a person who reads each candidate before the commit.",
        },
        {
          kind: "p",
          text: "Each store has an owner and an age. Each also has a location. Where is it?",
        },
      ],
    },
    {
      id: "s6-residency-per-hop",
      title: "Residency is a property of every hop, and AskPEP pins only three",
      goal: "Which hops are pinned to a region, and what can you honestly promise?",
      blocks: [
        {
          kind: "p",
          text: "**Residency** is the place where data is stored and processed. A **hop** is one service that receives a copy of the request text on its way to an answer. A customer who says the data must stay in the EU is asking about every hop, and the database is only one of them.",
        },
        {
          kind: "p",
          text: "AskPEP's own pieces sit in one region. The deploy steps from the rag course put Cloud Run, Cloud SQL and the image registry in `europe-west3`. Model Armor, from the guardrails course, uses `GCP_REGION`, which defaults to `europe-west3`. These product names were checked on 20 October 2026.",
        },
        {
          kind: "p",
          text: "The model calls differ. `VERTEX_LOCATION` and `STRONG_LOCATION` both default to `global`. Google's model page lists `gemini-3.5-flash` for `europe-west3`. Whether pay-as-you-go calls work on that endpoint is still an open question.",
        },
        {
          kind: "p",
          text: "Claude and Voyage are outside Google. AskPEP calls their APIs directly and sets no region on either call. The code gives you no way to say that those calls stay in the EU. Whether either vendor offers an EU option is a question for its current terms.",
        },
        // CHECK: Anthropic's API and Voyage may offer a region or data-residency option. FACTS.md holds neither. Confirm both on the vendors' current pages.
        {
          kind: "p",
          text: "Tracing is the last hop. With `LANGSMITH_TRACING` on and `LANGSMITH_ENDPOINT` empty, runs go to LangSmith's default region, which is the US. LangSmith documents an EU endpoint, and you set it in `LANGSMITH_ENDPOINT`. AskPEP masks personal data in a run before it leaves the process.",
        },
        // CHECK: the LangSmith EU endpoint https://eu.api.smith.langchain.com. config.py already carries this check. Confirm it in the current LangSmith docs.
        {
          kind: "p",
          text: "Log lines and spans carry ids, counts, costs and stop reasons, and no text. They do not move question text anywhere. The sort below covers the hops that do.",
        },
        {
          kind: "widget",
          id: "architecture06-region-hops",
          intro:
            "Seven hops carry one desk request. For each one, say whether AskPEP as shipped pins it to `europe-west3`. The first check marks each answer right or wrong, and the second shows the reasons.",
        },
        {
          kind: "p",
          text: "So the promise you can make is narrow. The API, the database and Model Armor sit in `europe-west3`. You cannot promise that question text stays in the EU.",
        },
        {
          kind: "p",
          text: "Widening the promise means changing each open hop. Each needs a setting, a contract or a replacement, and each is a decision with a cost. That makes each one an ADR of its own, and this chapter writes none of them.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Can you promise that customer data never leaves the EU?",
          text: "Answer first: not from the code alone. List every hop that sees the text, and say which are pinned to the region and which are not. Offer the narrow promise you can keep today. Then name what each open hop needs before you could widen it.",
        },
        {
          kind: "quiz",
          id: "architecture06-q6",
          question: "A customer asks for an EU-only promise. Which reply does AskPEP as shipped support?",
          options: [
            "Yes, because the database and the API are in `europe-west3`.",
            "Yes, because the log lines carry no text.",
            "Only for the database, the API and Model Armor. Model calls, ranking and tracing need other settings or contracts.",
            "No, because Cloud Run cannot run in the EU.",
          ],
          answer: 2,
          explain:
            "Three hops are pinned. The Gemini location defaults to global, and AskPEP sets no region for Claude or Voyage. Tracing goes to the US by default. Log lines carry no text, which is true and does not matter, since the text leaves through other hops. Cloud Run can run in the EU, and the deploy steps already use it.",
        },
        {
          kind: "p",
          text: "The map is complete. How does it become a decision someone can check?",
        },
      ],
    },
    {
      id: "s7-write-section-and-adr",
      title: "Section 5 and one ADR turn the map into decisions you can defend",
      goal: "How do the map and the floors become a section and an ADR?",
      blocks: [
        {
          kind: "p",
          text: "Section 5 opens with a claim that a reviewer could disagree with. The numbers that support it follow, and each one says where it came from. A section with no number is a guess.",
        },
        {
          kind: "step",
          id: "architecture06-s04",
          title: "Write the claim and the map",
          text: "Open `docs/design.md`. Replace the instruction text of section 5 with this claim and table. The floors come from this chapter. Leave the ceilings for the ADR in step 6, since they are your choice.",
          lang: "markdown",
          file: "docs/design.md",
          code: `## 5. State and data

Seven of AskPEP's eight kinds of state have one writer and one store, and only the answer cache has a
retention rule. Every other store keeps its rows until a person deletes them.

| Kind of state | Store | Owner | Retention floor | Retention ceiling | Region |
|---------------|-------|-------|-----------------|-------------------|--------|
| Checkpoints | checkpoint tables in Postgres | PostgresSaver | 3600 seconds plus the gap between desk expire runs | Set in the ADR | europe-west3 |
| Notes | store table in Postgres | remember in agents/memory.py | Until the user asks to forget | Set in the ADR | europe-west3 |
| Tickets | tickets table in Postgres | open_ticket in agents/tools.py | Set by the people who work them | Set in the ADR | europe-west3 |
| Traces | traces table in Postgres | Trace.write in tracing.py | 28 days | Set in the ADR | europe-west3 |
| Audit events | audit table in Postgres | audit sink in guards/audit.py | Pending approvals, then your policy | Set in the ADR | europe-west3 |
| Feedback | feedback table in Postgres | record_feedback | The trace floor | Set in the ADR | europe-west3 |
| Answer cache | memory of one process | InMemoryCache | 3600 seconds | 3600 seconds | The region of the instance |
| Eval records | files in Git, reports on disk, outside services | people, eval commands, record_feedback | Git history | Set in the ADR | Your Git host |`,
          expect:
            "Section 5 has a claim, then a table of eight rows. No floor cell is empty. Every ceiling cell except the cache says it is set in the ADR.",
        },
        {
          kind: "step",
          id: "architecture06-s05",
          title: "Write the residency promise",
          text: "Add this under the table. It lists the pinned hops and the open hops, then states the one promise that you can keep. If you changed a setting in your own deployment, change the lists to match.",
          lang: "markdown",
          file: "docs/design.md",
          code: `Residency, as read on 22 October 2026 from DEPLOY.md and config.py.

Pinned to europe-west3: the API on Cloud Run, the Postgres database on Cloud SQL, and Model Armor.
Not pinned: Gemini (the location is global by default), Claude through the Anthropic API, Voyage, and
LangSmith when tracing is on.

We promise that the database, the API and Model Armor run in europe-west3.
We do not promise that question text stays in the EU. Each open hop needs a setting, a contract or a
replacement, and each of those is its own ADR.`,
          expect:
            "Section 5 ends with the residency promise. Each of the seven hops from the widget appears in one of the two lists. The promise names only the pinned hops.",
        },
        {
          kind: "step",
          id: "architecture06-s06",
          title: "Write the state ADR",
          text: "Copy `docs/adr/0000-template.md` to `docs/adr/0005-state-and-retention.md`. Chapters 2 to 5 wrote 0001 to 0004, so this is 0005. Fill it in from this skeleton. Every line that says Write needs a number from this chapter, and the place it came from.",
          lang: "markdown",
          file: "docs/adr/0005-state-and-retention.md",
          code: `# 0005. We will keep all state in one Postgres and delete by age

- Status: proposed
- Date: write today's date, as 22 October 2026.

## Context

Seven kinds of state have one writer each, eval records have four, and only the cache expires
(design.md section 5).
Write the row count and the oldest date that step 1 printed for traces.
Write the sizes of traces and checkpoint_blobs from step 2.
Write the floor for traces (28 days, from slos.json, course 5) and for checkpoints (the approval timeout of
3600 seconds plus your gap between desk expire runs).
Write the requirement from section 1 that this decision serves.

## Options

Option A, do nothing. Rows stay forever. Cost: storage grows with traffic, on a database tier that Google
says is shared-core and outside the SLA (db-f1-micro, checked 20 October 2026). Risk: no way to answer a
deletion request. To leave it later, write the jobs in option B.

Option B, one Postgres, with a job that deletes by age. Cost: one scheduled job per store. Risk: deleting a
checkpoint before desk expire has run, or an audit row that desk expire still needs. To leave it, stop the
job. Rows already deleted are gone.

Option C, a separate store for traces and audit. This is a proposal, because no code in AskPEP does it.
Cost: a second system to run. The cost report, load_rows and desk expire all read these tables with SQL
today, so each one changes. Risk: the two stores drift apart. To leave it, copy the rows back.

## Decision

We will keep one Postgres and delete by age. Write the one or two reasons that decided it, using the sizes from
step 2. Write the ceiling you chose for each store, and the key you delete a conversation by.

## Consequences

Easier: one backup, one region, one place to read every kind of state.
Harder: jobs to run and to test, and a rule for audit that you write down.
Write the number that would show this was wrong. For example, the size of traces reaching a share of the
disk that you name, or desk expire skipping a thread with a LookupError. Then move to option C.

## Evidence

List the step 1 and step 2 commands, the step 3 search, and the commit of this ADR.`,
          expect:
            "An ADR file with the template's five headings. Every number in Context says which step, chapter or file it came from. The Decision starts with We will, and the Consequences name a number that would prove it wrong.",
        },
        {
          kind: "step",
          id: "architecture06-s07",
          title: "List the ADR in section 10",
          text: "Add a row for the ADR to the table in section 10 of `docs/design.md`. Use the same number as the file name. Then read the ADR once, and check that no number in it is a guess.",
          lang: "markdown",
          file: "docs/design.md",
          code: `| 0005 | We will keep all state in one Postgres and delete by age | proposed |`,
          expect:
            "Section 10 lists the ADR, and the number matches the file name. In the ADR, each number points to a step of this chapter, a chapter of an earlier course or a file in the project.",
        },
        {
          kind: "p",
          text: "You now have a map, a floor for each store and a promise that the code can keep. What does AskPEP's own version say, and does it close T11?",
        },
      ],
    },
    {
      id: "s8-state-adr",
      title: "AskPEP's state ADR gives T11 a dated plan and exposes a five-day reporting window",
      goal: "What does AskPEP's state ADR decide, and does it close T11?",
      blocks: [
        {
          kind: "p",
          text: "The ADR gives T11 a plan and leaves it open until the code ships. Three facts come from this chapter's commands. Nothing deletes a trace, a ticket or a checkpoint. `traces.query` holds what the input guard returned, and for most questions that is the text as typed. The reader keeps only 5,000 rows.",
        },
        {
          kind: "p",
          text: "That last fact matters at design traffic. At 1,000 requests a day, 5,000 rows is five days, so a 28-day objective would quietly read five. The checkpoint tables are the other surprise. They hold 410 MB after 1,632 desk runs, about 0.25 MB a run, which fills a 10 GB disk in about 59 days.",
        },
        {
          kind: "p",
          text: "The security reviewer asks whether redaction can reach names. It can't, because the redactor matches patterns. The reviewer accepts that only on a written condition, and only until Model Armor's result is known. The product owner asks for the third team's date, and you say the plan closes T11 by 14 December only if the code ships first.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# 0005. We will keep all state in one Postgres and delete by age

- Status: accepted
- Date: 8 December 2026

## Context
T11: raw text in traces.query, checkpoints and ticket bodies. Due 14 December 2026.
Only the cache expires. Every other store grows until someone deletes rows.
Measured 8 December: checkpoint tables 410 MB after 1,632 desk runs, about 0.25 MB a run.
At 680 desk runs a day that is about 170 MB a day, and a 10 GB disk fills in about 59 days.
load_rows reads the newest 5,000 rows. At 1,000 requests a day that is 5 days, against a 28-day window.
Floors: traces 28 days. Checkpoints 2 hours, with desk expire run hourly.

## Options
A. Do nothing. T11 stays open, and the disk fills.
B. One Postgres, redact at write, delete by age.
C. A second store for traces and audit. A new system, and three readers change.

## Decision
We will keep one Postgres, redact at write and delete by age.

Store         Redact at write    Ceiling        Delete key
traces.query  redact_pii         90 days        ts
checkpoints   none, needed       14 days        thread_id, delete_thread
tickets.body  redact_pii         180 days       created_at
audit         ids only           365 days       ts, leaving pending approvals
feedback      none, no free text 90 days        with its trace
notes         none               until forgotten  user id

We will raise the load_rows limit to 50,000 rows, so the 28-day window holds at 1,000 a day.

## Consequences
Easier: one backup, one region, one place to read state.
Harder: four scheduled jobs on an operator with no rota.
Names in free text are not caught. Accepted by the security reviewer until the Model Armor result.
T11 stays open until the jobs and the redaction run on staging. Owner: engineering. Due 14 December 2026.
Wrong if: desk expire logs a LookupError, or the checkpoint tables pass 4 GB.
Then: stop the checkpoint job and read the floor again.

## Evidence
The row count, the table sizes and the delete search, 8 December.
THREAT-MODEL.md T11. TRACE-SHARING-001.`,
          caption: "ADR 0005, whole. The sizes and limits belong to the story.",
        },
        {
          kind: "p",
          text: "Read the Decision table across, then read the line about names. Each row is a plan that someone can check on a date. The line about names is the hard part of T11. It states the gap in plain words, so the reviewer signs what is really there.",
        },
        {
          kind: "p",
          text: "Reuse this when a review finding is about data. List every place the data sits, one row for each. Then give each row a treatment, a ceiling and a key.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# NNNN. We will <where state lives and how it ends>

- Status:
- Date:

## Context
Finding this closes:      (name, owner, due date)
What grows, and how fast:
Reader limits at design traffic:
Floors:

## Options
A. Do nothing.

## Decision
We will

Store   Treatment at write   Ceiling   Delete key

## Consequences
Easier:
Harder:
What is still not caught:
Stays open until:
Wrong if:
Then:

## Evidence`,
          caption: "For your next data finding, the same ADR with blank values.",
        },
        {
          kind: "p",
          text: "T11 has a dated plan. The names gap waits on Model Armor, and that is the second condition. Where does each check run on the path, and what does it cost? Chapter 7 starts there.",
        },
      ],
    },
  ],
  recap: [
    "AskPEP keeps eight kinds of state. Seven have one writer and one store, and eval records have four.",
    "Only the cache expires. Every other store keeps its rows until a person deletes them.",
    "A retention floor comes from the code that reads a store. The checkpoint floor is the approval timeout plus the gap between `desk expire` runs.",
    "A deletion request has to reach every store that holds the thread. Git and outside services need their own answer.",
    "AskPEP pins three hops to `europe-west3`. The other four need a setting, a contract or a replacement before you promise EU only.",
    "ADR 0005 gives T11 a dated plan. It redacts at write, deletes by age and raises the 5,000-row reader limit. T11 stays open until that ships.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In state and data I learned that every kind of state needs one owner, one store and a retention rule. AskPEP has the first two, and only its cache has the third. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["architecture-q12", "architecture-q13"],
};

export default chapter;
