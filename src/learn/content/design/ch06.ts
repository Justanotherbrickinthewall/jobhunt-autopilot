import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "design-06-a-million-record-batch-job",
  course: "design",
  number: 6,
  title: "A million-record job is safe when a crash costs one chunk",
  tagline: "What changes when nobody is waiting and the job lasts days? Three numbers set the shape, and a record of finished work makes every crash cheap.",
  minutes: 50,
  objectives: [
    "Turn a deadline, a budget and an error rate into the shape of a million-record job.",
    "Name the five components of a restartable batch pipeline and the failure each one absorbs.",
    "Estimate the tokens for a run, price it under batch and live, and check the time against the deadline.",
    "Design a stratified review sample with a stop rule that pauses the run.",
    "Pick checkpoint and idempotency keys so a crash costs one chunk and never the whole run.",
    "Fill in the design sheet for the batch job and add a ledger row.",
  ],
  sections: [
    {
      id: "s1-requirements",
      title: "Three numbers decide the design before any component does",
      goal: "Which three numbers decide this design, and what does each rule out?",
      blocks: [
        {
          kind: "p",
          text: "All four systems so far answer as work arrives. This one has no one waiting.",
        },
        {
          kind: "p",
          text: "Harbour inherited 1,000,000 archived invoice records from the businesses it bought. Finance wants each one read again under a new schema.",
        },
        {
          kind: "p",
          text: "The schema adds the supplier's VAT number, which identifies it for sales tax. It also adds the payment terms, meaning how many days Harbour has to pay. Nobody is waiting on any single record, and that is the first fact that matters.",
        },
        {
          kind: "p",
          text: "That fact makes a **batch API** possible. You send the model provider a file of requests and collect the results later.",
        },
        {
          kind: "p",
          text: "The provider promises the results inside a window, which is up to 24 hours at Anthropic and OpenAI. It charges about half the live price. Each request carries a custom id that you choose. The same id comes back on its result, so you can match results to records.",
        },
        {
          kind: "p",
          text: "In the interview, start with three questions and write the answers where the interviewer can see them. Everything you draw afterwards comes from these three numbers.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "The deadline is 120 hours from Monday morning. It decides whether a batch API is allowed.",
            "The budget is 3,000 pounds. It decides whether live calls are affordable.",
            "The error rate is 1 percent on the header fields, such as supplier, date and total, and every error must be findable. It decides how much human review you pay for.",
          ],
        },
        {
          kind: "p",
          text: "Then ask three smaller questions. Can the job be run again on its own? Where do the results land? Who is told when it stops? At Harbour the results land in a staging table. Nothing reaches the finance ledger until a review passes.",
        },
        {
          kind: "p",
          text: "That one answer removes the worst failure, which is a wrong write into a system of record. Every later decision gets easier because a mistake costs money and time but never corrupts the ledger.",
        },
        {
          kind: "callout",
          tone: "insight",
          title: "An error rate is a budget of wrong records",
          text: "A 1 percent error rate on 1,000,000 records allows 10,000 wrong ones. Say that number aloud. It makes the review sample and the stop rule in section four easy to defend, because you are spending a stated allowance.",
        },
        {
          kind: "quiz",
          id: "design06-q1",
          question: "Finance needs every record by tomorrow morning, which is 16 hours away. The batch window is up to 24 hours. What does the deadline decide?",
          options: [
            "Batch is allowed, because most batches finish early.",
            "Batch is ruled out, because the window can be longer than the deadline.",
            "Batch is allowed if you split the records into more chunks.",
            "The deadline has no effect on the mode.",
          ],
          answer: 1,
          explain: "A completion window is a maximum. It promises nothing about speed. A deadline shorter than the window rules batch out.",
        },
        {
          kind: "quiz",
          id: "design06-q2",
          question: "Where should the first pass of results be written?",
          options: [
            "Straight into the finance ledger, to save a copy step.",
            "Into a staging table, and promoted to the ledger only after review passes.",
            "Into a log file that finance reads by hand.",
            "Into the prompt of the next chunk.",
          ],
          answer: 1,
          explain: "Staging keeps a bad run reversible. The cost of an error is the compute spent, not a corrupted system of record.",
        },
        { kind: "p", text: "Three numbers now fix the shape. The next section builds the parts that let a job survive its own length." },
      ],
    },
    {
      id: "s2-components",
      title: "Five small components make a million-record job safe to restart",
      goal: "Which five components make the job safe to restart?",
      blocks: [
        {
          kind: "p",
          text: "A batch job is a loop with a memory. Split the records into chunks. Submit each chunk. Collect the results. Write them. The memory is what makes the loop survivable, because a process that runs for days will die at some point.",
        },
        {
          kind: "p",
          text: "Take chunks of 50,000 records. A million records then make 20 chunks. Chunk size is a trade-off. A small chunk loses little when it fails. A large chunk carries less overhead. Section five prices one lost chunk.",
        },
        {
          kind: "compare",
          caption: "Each component absorbs one named failure, and the manifest ties the others together.",
          columns: ["Component", "What it holds", "The failure it absorbs"],
          rows: [
            ["Chunk manifest", "One row per chunk: record range, state and batch id", "A crash between chunks"],
            ["Idempotent write", "One result row per record and extraction version", "A chunk processed twice"],
            ["Checkpoint", "Each state change, committed before the next step", "Lost progress after a restart"],
            ["Bounded retry", "Two resubmissions of failed records only", "A few bad records costing a whole chunk"],
            ["Dead letter", "Failed records with a reason code", "One bad record blocking the run"],
          ],
        },
        {
          kind: "p",
          text: "The manifest is the checkpoint. Each chunk goes through five states: pending, submitting, submitted, collected and written. The state only goes forward. Each change is committed to the database before the next step begins.",
        },
        // CHECKED 9 Nov 2026: https://platform.claude.com/docs/en/build-with-claude/batch-processing (100,000 requests or 256 MB, 24-hour expiry), https://developers.openai.com/api/docs/guides/batch (50,000 requests, 200 MB, 24h, metadata)
        {
          kind: "p",
          text: "A chunk of 50,000 fits both providers by request count. Anthropic allows 100,000 requests or 256 megabytes a batch. OpenAI allows 50,000 requests and 200 megabytes a file. At about 4 kilobytes a request, 50,000 records is close to 200 megabytes, so measure a real file.",
        },
        // CHECKED 9 Nov 2026: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/batch-prediction-gemini (50 percent, 72-hour queue expiry, most jobs within 24 hours once running, 200,000 requests, 1 GB). BigQuery input is shown through the linked guide.
        {
          kind: "p",
          text: "Harbour runs on Google Cloud, so Vertex AI batch inference is also an option. It also charges about half price. One job takes up to 200,000 requests, from a Cloud Storage file of up to 1 gigabyte or from a BigQuery table. A chunk of 50,000 fits that limit as well.",
        },
        {
          kind: "code",
          lang: "ts",
          caption: "The manifest row is the checkpoint. The key is the idempotency guard.",
          code: "type ChunkState = \"pending\" | \"submitting\" | \"submitted\" | \"collected\" | \"written\";\n\ntype ChunkRow = {\n  chunkId: number; // 1 to 20\n  firstRecord: number;\n  lastRecord: number;\n  state: ChunkState;\n  batchId: string | null; // set once the provider accepts the batch\n  pass: 0 | 1 | 2; // the resubmission pass\n};\n\n// One key serves as the batch custom id and as the primary key of the result row.\nfunction resultKey(recordId: string, extractionVersion: string): string {\n  return `${recordId}:${extractionVersion}`;\n}",
        },
        {
          kind: "p",
          text: "The write is an upsert on that key. Writing the same result twice leaves one row. Chapter seven of the multi-agent course explains why a key comes from the intent of the operation and never from a timestamp. The same rule holds here, one level up.",
        },
        {
          kind: "p",
          text: "A record that fails validation is resubmitted at most twice, in the next pass. After that it goes to the dead letter table with a reason, such as unreadable scan or schema violation. At a failure rate of 0.5 percent that is 5,000 records. Group them by reason, because most share a cause.",
        },
        {
          kind: "p",
          text: "The LLM engineering course, later in the app, covers the batch API itself, including custom ids and partial failure. Resuming after a crash from a saved record of finished steps is in chapter seven of the multi-agent course. This chapter uses both ideas at the level of the whole job.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Design a job that runs a model over a million records",
          text: "Open with the three numbers: deadline, budget and error rate. Then name the five components and the failure each one absorbs. Interviewers push on chunk size, and on what happens if the process dies between submitting a batch and recording its id.",
        },
        {
          kind: "quiz",
          id: "design06-q3",
          question: "What does the chunk manifest give you after a crash?",
          options: [
            "A copy of every prompt that was sent.",
            "The state of each chunk, so the restart knows what is done, what is running and what is untouched.",
            "A faster model for the remaining chunks.",
            "A list of the records the reviewers disliked.",
          ],
          answer: 1,
          explain: "The manifest is the job's memory. Without it a restart cannot tell finished work from unfinished work, and it has to start again.",
        },
        {
          kind: "quiz",
          id: "design06-q4",
          question: "A record fails validation after its second resubmission. What happens to it?",
          options: [
            "It is resubmitted until it passes.",
            "It is dropped, because 99.5 percent succeeded.",
            "It goes to the dead letter table with a reason code, and the run carries on.",
            "The whole run stops until someone fixes it.",
          ],
          answer: 2,
          explain: "A bounded retry stops one bad record from costing money for ever. The dead letter table keeps the record and its reason for a person to handle.",
        },
        { kind: "p", text: "The job can restart. Whether it is worth starting depends on what it costs and how long it takes." },
      ],
    },
    {
      id: "s3-cost",
      title: "Batch costs half of live, so the arithmetic picks the mode",
      goal: "What does the run cost, and does it meet the deadline?",
      blocks: [
        {
          kind: "p",
          text: "Estimate tokens from a sample and never from a guess. Take 200 records and count their characters. A Harbour invoice averages 2,800 characters. At about four characters a token that is 700 tokens. The prompt and schema add 200, so each call sends about 900 input tokens.",
        },
        {
          kind: "p",
          text: "The answer is a JSON object with a dozen fields. It runs to about 150 output tokens. Over 1,000,000 records that makes 900 million input tokens and 150 million output tokens. Check the rule of four against the provider's own token counter before you trust it.",
        },
        {
          kind: "p",
          text: "Use the large model from Harbour's sheet, at 3 pounds per million input tokens and 15 pounds per million output tokens. Live input costs 900 times 3, which is 2,700 pounds. Live output costs 150 times 15, which is 2,250 pounds. The live total is 4,950 pounds.",
        },
        {
          kind: "p",
          text: "Batch is half price, so the total is 2,475 pounds. That is about a quarter of a penny a record. Reserve a tenth of the budget for resubmissions, which is 300 pounds of the 3,000. The planned run then has 2,700 pounds, and 2,475 fits.",
        },
        // CHECKED 17 Oct 2026: https://platform.claude.com/docs/en/build-with-claude/batch-processing (50 percent, expires after 24 hours), https://platform.claude.com/docs/en/api/rate-limits, Message Batches API table (batch requests in the processing queue: Start 200,000, Build 300,000, Scale 500,000; 100,000 is the per-batch limit, not the queue limit), https://developers.openai.com/api/docs/guides/batch (50 percent, 24h, separate pool)
        {
          kind: "p",
          text: "Time works differently. Live is limited by your quota. If the job may use 200,000 input tokens a minute, 900 million tokens take 4,500 minutes, which is 75 hours. Batch is limited by the window. Allow 24 hours for each pass.",
        },
        {
          kind: "p",
          text: "Run chunk one alone as a pilot. That is 24 hours. Release the other 19 chunks together for 24 more, if the queue limits allow it. Anthropic caps queued requests at 200,000 to 500,000 by tier, and OpenAI caps queued tokens per model. Otherwise release them in groups.",
        },
        {
          kind: "p",
          text: "Add a resubmission pass of 24. The total is 72 hours against a deadline of 120, which leaves 48 hours of margin.",
        },
        {
          kind: "p",
          text: "Check that 24 against the provider you will use. A Vertex AI batch job can wait in the queue for up to 72 hours before it expires. Most jobs finish within 24 hours once they are running. Three passes at the 72 hour ceiling would take 216 hours and miss the deadline.",
        },
        {
          kind: "p",
          text: "On Vertex AI, the pilot chunk does two jobs. It tests the extraction, and it measures how long Harbour's queue takes.",
        },
        {
          kind: "p",
          text: "With a 24-hour window, both modes meet the deadline here. Only batch meets the budget, because 4,950 pounds is above 3,000. The budget picked the mode, and the clock did not. Chapter four of the observability course shows why cost per successful task is the fairer measure once failures are counted.",
        },
        {
          kind: "widget",
          id: "design-batch-cost",
          intro: "Three Harbour jobs arrive with a size, a deadline and a budget. Choose live, batch or neither for each one. Work out the cost and the time first. Watch for the job where the saving is real but the window is too long.",
        },
        {
          kind: "quiz",
          id: "design06-q5",
          question: "At the chapter's prices, what does a batch run of 500,000 records cost, at 900 input and 150 output tokens each?",
          options: [
            "618.75 pounds",
            "2,475 pounds",
            "1,237.50 pounds",
            "4,950 pounds",
          ],
          answer: 2,
          explain: "Live cost is 450 times 3 plus 75 times 15, which is 1,350 plus 1,125, or 2,475 pounds. Batch halves it to 1,237.50 pounds.",
        },
        {
          kind: "quiz",
          id: "design06-q6",
          question: "Live and batch both fit the budget, and the deadline is 20 hours. The batch window is up to 24 hours. Live would take 15 hours of quota. What do you choose?",
          options: [
            "Batch, for the saving.",
            "Batch with a warning email.",
            "Live, because the window is longer than the deadline.",
            "Neither, because the saving is too small.",
          ],
          answer: 2,
          explain: "A window longer than the deadline rules batch out, and live finishes in time. Pay the live price and keep the deadline.",
        },
        { kind: "p", text: "Batch fits the budget and the deadline. It would also be cheap to get wrong a million times, so the next section checks quality as the run goes." },
      ],
    },
    {
      id: "s4-quality",
      title: "A stratified sample with a stop rule catches a bad run while it is still cheap",
      goal: "How do you find a bad run while it is still cheap?",
      blocks: [
        {
          kind: "p",
          text: "You cannot read a million records. You can read a few thousand, if you choose them well. A flat random sample copies the mix of the data, so rare classes barely appear. That is the wrong shape for a check that must find the worst class.",
        },
        {
          kind: "compare",
          caption: "A flat sample starves the rare classes, and the rare classes are where extraction fails. A credit note is a supplier document that reduces an earlier invoice.",
          columns: ["Class", "Records in the run", "A flat sample of 100 expects", "A stratified sample draws"],
          rows: [
            ["Standard invoices", "700,000", "70", "25"],
            ["Credit notes", "100,000", "10", "25"],
            ["Scanned invoices", "150,000", "15", "25"],
            ["Foreign currency", "50,000", "5", "25"],
          ],
        },
        {
          kind: "p",
          text: "Draw 25 records from each class in every chunk. That is 100 reviews a chunk, and 2,000 across 20 chunks. Each class gets 500 reviews. At 30 seconds a record the whole sample takes 1,000 minutes, about 17 hours of reviewer time.",
        },
        {
          kind: "p",
          text: "A flat sample would give foreign currency 100 reviews over the run. One error among them would read as 1 percent. With 500 reviews, an error rate near 1 percent shows up as about five errors, which is a number you can act on.",
        },
        {
          kind: "p",
          text: "A stop rule turns the sample into a control. Write it before the run starts. Pause when any class shows an error rate above 3 percent, after at least 50 reviewed records in that class. That is three times the target, so the margin leaves room for the noise of a small sample.",
        },
        {
          kind: "p",
          text: "Pause means no new chunks are submitted. Chunks already running finish, and their results stay in staging. A person reads the errors, fixes the cause and releases the run. Nothing reached the ledger, so the cost of the pause is money spent and never wrong data.",
        },
        {
          kind: "p",
          text: "Chunk one is the pilot. Its 50,000 records cost about 124 pounds at batch prices. That is cheap enough to run and review before anything else is submitted. Reviewed records also join the golden set from chapter one of the evaluation course, and the reviewers' corrections become your next test cases.",
        },
        {
          kind: "quiz",
          id: "design06-q7",
          question: "Which sample finds a fault in foreign currency invoices soonest?",
          options: [
            "A flat random sample of 100 per chunk.",
            "A sample of the first 100 records in each chunk.",
            "A stratified sample with 25 foreign currency records per chunk.",
            "A sample drawn after the run has finished.",
          ],
          answer: 2,
          explain: "Foreign currency is 5 percent of the data. A flat sample of 100 expects five of them, while the stratified sample guarantees 25.",
        },
        {
          kind: "quiz",
          id: "design06-q8",
          question: "The stop rule trips on chunk six. What do you do first?",
          options: [
            "Cancel the chunks already running, to save money.",
            "Stop submitting new chunks, let running ones finish into staging, and read the errors.",
            "Promote the good classes to the ledger and carry on.",
            "Raise the threshold so the rule stops tripping.",
          ],
          answer: 1,
          explain: "Pause stops new spending without throwing away work in flight. Raising the threshold removes the control instead of acting on it.",
        },
        { kind: "p", text: "A stop rule catches bad extraction. The last failures come from the job's own length." },
      ],
    },
    {
      id: "s5-failures",
      title: "A restart is safe when the manifest and the key say what already happened",
      goal: "Which keys make each of the three failures harmless?",
      blocks: [
        {
          kind: "p",
          text: "Three failures decide whether the job survives its own length. They are partial completion, schema drift in the middle of the run, and duplicate processing after a restart. Each one has a different cost, and each one has a cheap defence.",
        },
        {
          kind: "p",
          text: "Partial completion is the common case. On day four, 14 chunks are written and six are not. Report by count: 696,500 written, 300,000 pending, 3,500 dead-lettered. If the stop rule never tripped, finance can use the 696,500 now. Say so, and give a date for the rest.",
        },
        {
          kind: "p",
          text: "Schema drift is slower. Midway, someone edits the prompt to fix a bug, or a new currency code appears. Results from before and after no longer match. Put an extraction version in every key and every row, and validate every result against the schema.",
        },
        {
          kind: "p",
          text: "If more than 2 percent of a chunk fails validation, stop submitting. Then re-run only the chunks that used the old version. The new keys differ from the old, so the old rows stay in place until you promote the new ones.",
        },
        {
          kind: "p",
          text: "Duplicate processing is the expensive one. Suppose the process dies after it submits a batch and before it records the batch id. The manifest says submitting. The batch may be running. Resubmitting pays twice.",
        },
        {
          kind: "p",
          text: "One chunk is 50,000 records at about a quarter of a penny each, which is about 124 pounds. That is the worst case, and it is why chunks are small.",
        },
        {
          kind: "p",
          text: "On restart, list the provider's batches for that chunk. OpenAI lets you set metadata on a batch, but you filter the list yourself. Anthropic has no batch tag, so match on creation time and request count.",
        },
        {
          kind: "p",
          text: "On Vertex AI, give each job a display name that holds the chunk id, and look the name up. Attach to one if it exists. Submit only if none does.",
        },
        // CHECK: that a Vertex AI batch job can be listed and found by its display name was not confirmed on the batch-prediction-gemini page read on 21 Oct 2026.
        // CHECKED 17 Oct 2026: https://platform.claude.com/docs/en/build-with-claude/batch-processing (list endpoint, no batch-level metadata), https://developers.openai.com/api/reference/resources/batches/methods/create (metadata up to 16 pairs, list takes limit and after only)
        {
          kind: "p",
          text: "Collecting results twice is harmless, because the write is an upsert on the key. The only duplicate that costs money is a duplicate submission, so the manifest guards the submit step with the most care.",
        },
        {
          kind: "widget",
          id: "design-restart-plan",
          intro: "A job crashed at 400,000 records. Choose the key for the result write, the checkpoint that records progress, and the restart action for a chunk caught mid-submission. Check each choice against the cost of getting it wrong.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "The job crashed at 400,000 records. How do you restart it?",
          text: "Open with the answer: read the manifest, never start again from record one. Then cover the three cases by state. Written chunks are skipped, submitted chunks are polled by batch id, and submitting chunks are looked up at the provider before any resubmission. Interviewers push on the key and on the cost of a duplicate chunk.",
        },
        {
          kind: "quiz",
          id: "design06-q9",
          question: "Which key makes a restart overwrite a result and not duplicate it, while keeping results from different prompts apart?",
          options: [
            "The batch id and the position in the batch.",
            "The record id and the time of the call.",
            "The record id and the extraction version.",
            "A new random id for every attempt.",
          ],
          answer: 2,
          explain: "The record id and version are the same on every attempt at the same work. A batch id, a timestamp or a random id changes on a retry and creates a second row.",
        },
        {
          kind: "quiz",
          id: "design06-q10",
          question: "On restart, chunk nine is marked submitting and no batch id is stored. What do you do?",
          options: [
            "Submit it again at once.",
            "Mark it written and move on.",
            "Look up the provider's batches for chunk nine. Attach if one exists, and submit only if none does.",
            "Dead-letter all 50,000 records.",
          ],
          answer: 2,
          explain: "The outcome of the submit is unknown, as with a timed-out write in chapter seven of the multi-agent course. Checking first avoids a duplicate chunk that would cost about 124 pounds.",
        },
        { kind: "p", text: "Every step now has an answer. The last section puts the design on one page." },
      ],
    },
    {
      id: "s6-design-sheet",
      title: "The batch design fits on one page and adds one ledger row",
      goal: "What does the finished batch design look like?",
      blocks: [
        { kind: "p", text: "A batch sheet leads with the three numbers, because they decide the mode. The cost and the clock go side by side, since either one can rule a mode out. Failure modes are written by chunk state, because that is how a restart reads them." },
        { kind: "code", lang: "text", caption: "The finished batch design, with the numbers that picked the mode.", code: "DESIGN SHEET: re-extract the invoice archive\nPrompt              Read 1,000,000 archived records again under a new schema\n\n1 Users and volumes 1,000,000 records. Nobody waits on any single one\n2 Non-functionals   Deadline 120 hours. Budget 3,000 pounds\n                    1 percent error on header fields, so 10,000 wrong at most\n                    Results land in staging, never straight in the ledger\n3 Components        Chunk manifest, idempotent write, checkpoint\n                    Bounded retry, dead letter table\n4 Data flow         20 chunks of 50,000 records\n                    Each chunk: pending, submitting, submitted, collected, written\n                    Key: record id and extraction version\nCost                900 million tokens in, 150 million out\n                    Live 4,950 pounds. Batch 2,475 pounds\n                    300 pounds held back for resubmissions\nTime                Pilot 24 hours. Other 19 chunks 24. Resubmission 24\n                    Total 72 hours against 120\n5 Failure modes     Partial completion: report by count, use what passed\n                    Schema drift: version in every key, stop above 2 percent\n                    Duplicate submission: look up the provider first\n                    Bad record: two resubmissions, then the dead letter table\n6 Evals             25 records per class per chunk, 2,000 reviews, 17 hours\n                    Stop above 3 percent in a class, after 50 reviewed\n7 Rollout           Chunk one is the pilot, at about 124 pounds\n                    Nothing reaches the ledger until review passes\n\nLedger, new row\nDecision                     Gave up                            Revisit when\nBatch with a 24-hour window  Speed: no result before the        A deadline under 24 hours\n                             window closes" },
        { kind: "p", text: "Read it out like this. Nobody is waiting, so I use batch, and the budget decided it. Live costs 4,950 pounds against a budget of 3,000, and batch costs 2,475. Three passes take 72 hours against a deadline of 120." },
        { kind: "p", text: "Then give the safety argument. Twenty chunks and a manifest mean a crash costs at most one chunk, about 124 pounds. Results stay in staging until a stratified review passes. A stop rule above 3 percent pauses new submissions while the mistake is cheap." },
        { kind: "code", lang: "text", caption: "For your next batch job. Fill the first three lines before you choose a mode.", code: "Deadline           ____  (hours, against the provider's window)\nBudget             ____  (money, with a tenth held back for retries)\nError allowance    ____  (rate x records, said as a count)\nChunk size         ____  (records, and the cost of losing one chunk)\nKey                ____  (the same on every attempt at the same work)\nModes priced       ____  (live and batch, cost and time for each)\nSample             ____  (per class, per chunk, reviewer hours)\nStop rule          ____  (threshold, and the minimum reviewed)\nRestart by state   ____  (what happens to a chunk in each state)" },
        { kind: "p", text: "You now have five finished designs and a ledger with six rows. In a real round, the design is only the first half. What happens when the interviewer changes one fact?" },
      ],
    },
  ],
  recap: [
    "Ask for the deadline, the budget and the error rate first, and write them down.",
    "Five components make a job restartable: a chunk manifest, idempotent writes, checkpoints, bounded retries and a dead letter table.",
    "Estimate tokens from a sample, price the run under both modes, and check the time against the deadline.",
    "Review a stratified sample per chunk, and write a stop rule that pauses new submissions before the run starts.",
    "Key results by record id and extraction version, and look up a half-submitted chunk before you resubmit it.",
    "The finished sheet leads with deadline, budget and error rate, and the ledger gains a row for the batch window.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In batch job design I learned that the deadline, the budget and the error rate come first. A chunk manifest and a key built from record id and version make a restart safe. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["design-q11", "design-q12"],
};

export default chapter;
