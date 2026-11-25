import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "docai-05-intake-pipeline",
  course: "docai",
  number: 5,
  title: "Every document gets an id, a state and exactly one outcome",
  tagline: "An intake pipeline survives duplicates, outages and bad files when every step is durable and safe to repeat.",
  minutes: 48,
  objectives: [
    "Lay out the intake flow from the inbox to the audit record and say what each stage stores.",
    "Give every document a stable id from its checksum, and carry a correlation id through every step.",
    "Handle duplicates, transient failures and poison documents with different exits.",
    "Size a pipeline from a volume and a turnaround, and check it against the service's quota.",
    "Build an idempotent intake state machine and make its tests pass."
  ],
  sections: [
    {
      id: "s1-flow",
      title: "The flow runs from intake to audit, and every step is asynchronous",
      goal: "How does a file get from the inbox to one final outcome?",
      blocks: [
        {
          kind: "p",
          text: "Chapter four ended with readers, checks and a review screen, and nothing to connect them. Harbour's invoices arrive by email and through the supplier portal. Both must end in the same place: a posted ledger entry or the review queue, with a record of what happened."
        },
        {
          kind: "p",
          text: "The queue is the main design choice. The portal has a 5 second limit, and extraction is slow and uneven. So the request that accepts a file stores it, writes a message and returns an id, and workers do the rest."
        },
        {
          kind: "p",
          text: "Store the raw file before anything else, because the original is your evidence. If extraction fails, a model improves or an auditor asks, you can rerun from the original. Never process a file that exists only in memory."
        },
        {
          kind: "p",
          text: "The team wrote the flow as a table of states, because each row is something a worker can resume from. Every row is durable, so a crash between two rows loses nothing."
        },
        {
          kind: "code",
          lang: "text",
          caption: "Harbour Reader's state table. Each row is written before the next begins.",
          code: "INTAKE STATE TABLE: Harbour Reader\n\n#  Stage              Writes                                     State after\n1  Intake             document id, correlation id                received\n2  File validation    accept or reject, with the reason          validated\n3  Storage            raw file in Cloud Storage, metadata row    stored\n4  Queue message      { docId, correlationId } and nothing else  queued\n5  Classify, extract  raw result, evidence, reader and version   extracted\n6  Normalise          typed values beside the raw strings        normalised\n7  Validate, gate     list of failed rules, or an empty list     checked\n8  Route              ledger entry under the key, or review item posted / needs_review\n9  Audit              original, result, versions, decision       at every change\n\nOther exits: quarantined, dead_lettered, duplicate."
        },
        {
          kind: "p",
          text: "Row 4 is deliberately small. The message carries two ids and no document data, so a redelivered message is cheap and holds nothing sensitive. Row 9 runs at every change of state, which means an auditor can replay a document's whole history."
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next customer: copy this and fill in the Writes column.",
          code: "INTAKE STATE TABLE: [customer]\n\n#  Stage    Writes    State after\n\nOther exits:"
        },
        {
          kind: "p",
          // CHECKED 9 Nov 2026: https://docs.cloud.google.com/document-ai/limits
          text: "Remember from chapter two that online processing takes 15 pages per request. File validation can therefore route longer files to batch. Course 6 covers asynchronous paths in general, and course 7 covers Cloud Storage, Cloud Run and the rest of the plumbing."
        },
        {
          kind: "quiz",
          id: "docai05-q1",
          question: "Why does the supplier portal store the file and return an id, instead of returning the extracted fields?",
          options: [
            "Extraction is slow and spiky, so the request must not wait for it. Workers read from a queue.",
            "Extraction results cannot be returned over HTTP.",
            "It saves storage.",
            "The queue is faster than the database."
          ],
          answer: 0,
          explain: "A synchronous call holds a connection open for the slowest step and fails under bursts. Storing first and queuing lets workers absorb load at their own pace."
        },
        {
          kind: "p",
          text: "Pipeline design is a staple of interviews."
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Design an end-to-end document pipeline",
          text: "Give the flow in execution order: intake, validation, raw storage, queue, classify and extract, normalise, validate, route, audit. Then name the properties: asynchronous, idempotent, observable and secure. Close with the exits: retry, a second reader or review. Fit it into the six-part answer frame from course 8."
        },
        {
          kind: "p",
          text: "A table of states needs something to attach them to. Harbour needs an id that survives retries."
        }
      ]
    },
    {
      id: "s2-ids",
      title: "Document and correlation ids make every step traceable",
      goal: "Which ids stay stable when a file is retried or sent twice?",
      blocks: [
        {
          kind: "p",
          text: "Two ids do different jobs. The **document id** names the document for ever. The **correlation id** names one journey through the pipeline, so a log search finds every step of one attempt. Both ride on every queue message and every log line."
        },
        {
          kind: "p",
          text: "Derive the document id from content. A **checksum** is a fixed-length fingerprint of the bytes, such as a SHA-256 hash. The same bytes always give the same checksum. Harbour uses the first twelve characters with a prefix, as in the doc-3fa94c1e0b77 you saw on the review item."
        },
        {
          kind: "p",
          text: "Random ids look tidy and break retries. If the queue delivers a message twice, a random id makes two documents. A content id makes one, and the second delivery finds the first. Course 1 used the same idea for stable chunk ids."
        },
        {
          kind: "list",
          items: [
            "The document id comes from the checksum, so it survives email resends, retries and restarts.",
            "The correlation id is generated at intake, one per submission, and logged everywhere.",
            "The idempotency key for the ledger is the document id, so a replay can't write twice.",
            "File names are never used, because they repeat, change and collide."
          ]
        },
        {
          kind: "p",
          text: "A checksum of bytes misses a re-scan or a re-export of the same invoice, since those are different files. Those need a business key, and the next section shows both layers."
        },
        {
          kind: "quiz",
          id: "docai05-q2",
          question: "Two emails carry the same PDF under different file names. What do the two document ids look like?",
          options: [
            "Different, because the names differ.",
            "Identical, because the id comes from the content checksum.",
            "Random.",
            "Identical only if sent in the same minute."
          ],
          answer: 1,
          explain: "A content checksum ignores names. That is exactly why it is a good document id."
        },
        {
          kind: "p",
          text: "Ids make duplicates visible. Stopping them takes more."
        }
      ]
    },
    {
      id: "s3-duplicates",
      title: "Duplicates are caught at three layers, and the ledger is the last",
      goal: "How does Harbour stop the same invoice being paid twice?",
      blocks: [
        {
          kind: "p",
          text: "Duplicates come from many places. A supplier sends the same email twice. A queue delivers a message at least once. A worker crashes after posting and before saying so. Each needs a guard, and the guards sit at different layers."
        },
        {
          kind: "list",
          items: [
            "The intake guard spots a checksum already handled, returns the earlier outcome and makes no reader call.",
            "The business guard spots the same supplier, invoice number and total from a different file, and holds it for review.",
            "The ledger guard takes an idempotency key, so a second write with the same key changes nothing."
          ]
        },
        {
          kind: "p",
          text: "Northgate tested the second guard a week after go-live. Its accounts office emailed a PDF of invoice 20418 and also posted the paper copy to the depot. The two files had different checksums. The business key matched, so the second one was held for a clerk and no second payment was made."
        },
        {
          kind: "p",
          text: "The ledger guard matters most, because it's the last line. Even if everything upstream repeats, the money is paid once. This is idempotency from course 2, applied to a finance write."
        },
        {
          kind: "code",
          lang: "python",
          code: "def post_to_ledger(ledger: Ledger, key: str, invoice: Invoice):\n    if key in ledger.entries:\n        return \"already_posted\"  # replay: change nothing\n    ledger.entries[key] = LedgerEntry(key, invoice)\n    return \"posted\"",
          caption: "The idempotent write. In a database this is a unique constraint on the key, or an insert that ignores conflicts."
        },
        {
          kind: "p",
          text: "Use a real database constraint in production. Two workers can pass a check together. A unique index makes the database decide, and the loser gets a conflict it can treat as already posted."
        },
        {
          kind: "widget",
          id: "docai-pipeline-stepper",
          intro: "A batch of six files goes through the intake with three attempts allowed. At each stage, decide what the pipeline does next, then read the reason. Watch which file never reaches the extractor, and which one is retried twice."
        },
        {
          kind: "quiz",
          id: "docai05-q3",
          question: "A worker posts to the ledger, then crashes before acknowledging the queue message. The message is redelivered. What stops a double payment?",
          options: [
            "Nothing, so you must avoid crashes.",
            "The ledger write is keyed by document id, so the replay reports already posted and writes nothing.",
            "A longer acknowledgement deadline.",
            "Deleting the message first."
          ],
          answer: 1,
          explain: "At-least-once delivery is a fact of queues. The defence is to make the side effect idempotent, so a replay is harmless."
        },
        {
          kind: "p",
          text: "Duplicates are one kind of repeat. The other kind is a call that failed and deserves another try."
        }
      ]
    },
    {
      id: "s4-transient",
      title: "Transient failures retry with bounded backoff",
      goal: "What counts as transient, and how long should Harbour keep trying?",
      blocks: [
        {
          kind: "p",
          text: "A **transient failure** is one that a later attempt can fix. The document is fine and the world is briefly not. For a reader that means rate limits, service unavailable errors, timeouts and dropped connections."
        },
        {
          kind: "p",
          text: "Retry with exponential backoff and jitter, from course 1. With a base of one second and four attempts, the waits are one, two and four seconds. There's no wait after the fourth failure, so the total delay is seven seconds."
        },
        {
          kind: "list",
          items: [
            "Bound the attempts, or one bad hour becomes a permanent jam.",
            "Bound the total time as well, because a day of retries misses the turnaround anyway.",
            "Respect Retry-After headers when the service sends them.",
            "Treat unknown errors as transient, up to the cap only.",
            "Inject the clock, so tests never wait for real time."
          ]
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Pause the queue when the service itself is failing",
          text: "If every document starts failing at once, the cause is the service or your credentials. Don't dead-letter a thousand healthy files. A circuit breaker from course 6, or a pause on the queue, protects them."
        },
        {
          kind: "quiz",
          id: "docai05-q4",
          question: "Base wait is 500 milliseconds, doubling, with four attempts. What are the waits between attempts?",
          options: [
            "500, 500, 500",
            "500, 1000, 2000",
            "500, 1000, 2000, 4000",
            "1000, 2000, 4000"
          ],
          answer: 1,
          explain: "Four attempts means three gaps. They are 500, 1000 and 2000 milliseconds. There is no wait after the last attempt."
        },
        {
          kind: "p",
          text: "Some files will never succeed, however long you wait. They need a different exit."
        }
      ]
    },
    {
      id: "s5-poison",
      title: "Each kind of failure has its own exit, and every exit has an owner",
      goal: "Where does a document go when it can't be processed?",
      blocks: [
        {
          kind: "p",
          text: "A **poison document** fails the same way every time. It may be encrypted, corrupt, too large or the wrong type. Retrying wastes money and blocks the line. The right exit is quarantine at once: set it aside, record why and tell a person."
        },
        {
          kind: "p",
          text: "A **dead-letter queue** holds messages that exhausted their retries. The cause was probably transient, but it outlasted your patience. A person or a scheduled redrive looks at it later."
        },
        {
          kind: "compare",
          caption: "Harbour's four exits, what triggers each and what happens next.",
          columns: [
            "Exit",
            "Trigger",
            "Retried?",
            "Next step"
          ],
          rows: [
            [
              "Posted",
              "Extracted and validated",
              "Not needed",
              "Audit record written"
            ],
            [
              "Review queue",
              "Extracted, but a rule or the confidence gate failed",
              "No",
              "A clerk decides, with evidence shown"
            ],
            [
              "Quarantine",
              "Poison file: unreadable, encrypted, wrong type",
              "Never",
              "Tell the sender or fix the file"
            ],
            [
              "Dead-letter queue",
              "Transient failures hit the attempt cap",
              "Already did",
              "Redrive after the cause is fixed, or review by hand"
            ]
          ]
        },
        {
          kind: "widget",
          id: "docai-poison-or-transient",
          intro: "Eight failures from the intake log. Classify each as transient, poison or a business rule failure. Ask yourself one question each time: would the same request fail again?"
        },
        {
          kind: "p",
          text: "A dead-letter queue needs an owner, and at Harbour that's the IT lead. A queue nobody reads is a silent loss, so alert on its depth and on the age of the oldest message. Redriving is safe, because the ledger key stops a redriven document posting twice."
        },
        {
          kind: "quiz",
          id: "docai05-q5",
          question: "A PDF is password protected and no password is on file. Which exit?",
          options: [
            "Retry with backoff.",
            "Quarantine at once with a reason, and notify.",
            "Dead-letter after three attempts.",
            "Post with empty fields."
          ],
          answer: 1,
          explain: "The same request will fail every time. Retrying burns attempts and delays the real answer, which needs a person."
        },
        {
          kind: "p",
          text: "Interviewers tend to group these failure types together."
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Duplicates, transient failures and poison documents",
          text: "Give each its own mechanism. Duplicates: a stable id from the checksum and an idempotency key on the ledger write. Transient: bounded exponential backoff with jitter. Poison: quarantine at once. Exhausted retries: dead-letter with an owner. End with the rule that retries must never duplicate a side effect."
        },
        {
          kind: "p",
          text: "The pipeline is correct now. The sponsor's next question was whether it was big enough."
        }
      ]
    },
    {
      id: "s6-scale",
      title: "Sizing is arithmetic you can do aloud, and the quota can overrule it",
      goal: "How many workers does a volume and a turnaround need?",
      blocks: [
        {
          kind: "p",
          text: "Harbour's own load is easy. About 12,300 documents a month over 21 working days is roughly 590 a day. Assume ten seconds per document for extraction and validation, so one worker handles 360 an hour. Two workers cover Harbour, and the second is there in case the first fails."
        },
        {
          kind: "p",
          text: "The sponsor then asked a harder question. The group is looking at buying other distributors, and the plan could reach 50,000 documents a day with a four hour promise. Would this design hold? Fifty thousand over 24 hours is about 2,100 an hour, so the average needs about six workers."
        },
        {
          kind: "p",
          text: "Averages lie, because invoices arrive in bursts. Suppose 20,000 land in one hour at month end, on top of the usual 2,100. The last of them must be done four hours later. In those four hours the system faces 20,000 plus four times 2,100, which is 28,400."
        },
        {
          kind: "p",
          text: "Divide by four hours to get 7,100 an hour. At 360 per worker that's 19.7, so 20 workers. Without a queue you'd size for the peak of 22,100 an hour, which needs 62 workers. The queue and the four hours save 42 of them."
        },
        {
          kind: "p",
          // CHECKED 9 Nov 2026: https://docs.cloud.google.com/document-ai/quotas
          text: "Then the FDE checked the quota, and the sum stopped mattering. Google allows 120 online requests a minute in the US and EU multi-regions. Single regions such as London get 6 a minute, which is 360 an hour for a processor type in a project."
        },
        {
          kind: "p",
          text: "Harbour's scans need about 100 requests a day, so 6 a minute is plenty. The 50,000 plan would need 7,100 an hour at the burst. So that plan needs batch processing or a quota increase from Google, and neither can be assumed. This is the capacity sheet."
        },
        {
          kind: "code",
          lang: "text",
          caption: "Harbour Reader's capacity sheet. Service time is an assumption until it's measured.",
          code: "CAPACITY SHEET: Harbour Reader\n\n                        Harbour today      Group plan\nDocuments per day       590 (working day)  50,000\nAverage per hour        about 74 (8 h)     about 2,100\nService time (assumed)  10 s               10 s\nPer worker per hour     360                360\nBurst                   none sized         20,000 in 1 hour\nPromise                 same working day   4 hours\nMust clear              n/a                28,400 in 4 hours = 7,100/h\nWorkers                 2 (1 + 1 spare)    20\n\nOnline quota, London    360/hour           360/hour\nFits the quota?         yes                NO: needs batch or an increase\nReview at 5 percent     30 a day           2,500 a day"
        },
        {
          kind: "p",
          text: "The bottom two rows decide the design. A worker count is easy to change. A quota belongs to Google, and 2,500 reviews a day belongs to Harbour's finance team. Find those limits before you offer a number."
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next customer: copy this and fill it in.",
          code: "CAPACITY SHEET: [customer]\n\nDocuments per day\nAverage per hour\nService time       [measured or assumed]\nPer worker per hour\nBurst\nPromise\nMust clear\nWorkers\nService quota      [read from the provider's page]\nFits the quota?\nReview load        [documents a day for people]"
        },
        {
          kind: "list",
          items: [
            "Scale on queue depth and on the age of the oldest message, and leave CPU out of it.",
            "Let large or time-critical invoices jump the queue.",
            "Track turnaround as a service level: the share of documents finished inside the promise."
          ]
        },
        {
          kind: "quiz",
          id: "docai05-q6",
          question: "50,000 documents a day at ten seconds each. About how many workers cover the average load?",
          options: [
            "About 1",
            "About 6",
            "About 60",
            "About 600"
          ],
          answer: 1,
          explain: "50,000 per day is about 2,100 per hour. One worker does 360 per hour at ten seconds each. 2,100 divided by 360 is about six, before allowing for peaks. The month-end burst in this section needs about 20."
        },
        {
          kind: "p",
          text: "A sizing question like this comes up in document AI interviews."
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Design intake for 50,000 documents a day in four hours",
          text: "Lead with the shape: queue-based, idempotent workers that scale on queue age. Do the arithmetic aloud, with your service time marked as an assumption. Check the provider's quota for the region. Name the controls: dead letters, quarantine and review. Name the metrics: queue age, turnaround rate, review rate. State the trade-off between peak headroom and cost, and the fallback when the reader is down."
        },
        {
          kind: "p",
          text: "So far every file has been one document. Harbour's post room holds files that are several documents stapled together, and those come next."
        }
      ]
    }
  ],
  lab: {
    title: "An idempotent intake state machine",
    goal: "Build checksum dedup, bounded retries with an injected clock, quarantine, dead-lettering and an idempotent ledger write, so a replay never posts twice.",
    minutes: 40,
    files: [
      "labs/docai/src/docai_lab/types.py",
      "labs/docai/src/docai_lab/fakes.py",
      "labs/docai/src/docai_lab/intake.py",
      "labs/docai/tests/test_intake.py",
      "labs/docai/solutions/intake.py"
    ],
    steps: [
      {
        title: "Read the given files",
        text: "types.py defines the document, the five end states, the outcome, the ledger and its entries. fakes.py holds a scripted extractor and a fake clock. A new Ledger starts empty. Neither file needs a network or a key. Run uv sync once, then uv run pytest in labs/docai. Every test fails with NotImplementedError. That is the starting line.",
        code: "cd labs/docai\nuv sync\nuv run pytest"
      },
      {
        title: "Checksum and backoff",
        text: "Write checksum with hashlib, a hex SHA-256 of the content encoded as UTF-8. Write backoff_delay, which doubles the base for each attempt and caps at sixty thousand milliseconds. Attempt one waits the base.",
        code: "import hashlib\n\n\ndef checksum(content: str) -> str:\n    # your turn: sha256 of the UTF-8 bytes, as hex\n    raise NotImplementedError(\"docai-05 step 2\")\n\n\ndef backoff_delay(attempt: int, base_delay_ms: int) -> int:\n    # base * 2^(attempt - 1), capped\n    raise NotImplementedError(\"docai-05 step 2\")",
        test: "cd labs/docai && uv run pytest tests/test_intake.py -k ch05_s2"
      },
      {
        title: "The idempotent ledger write",
        text: "Write post_to_ledger. If the key is already in the entries dictionary, change nothing and return already_posted. The first write wins, even if a replay carries different numbers. A real system uses a unique constraint to the same effect.",
        code: "def post_to_ledger(ledger: Ledger, key: str, invoice: Invoice) -> LedgerResult:\n    # already there: return \"already_posted\"\n    # otherwise store LedgerEntry(key, invoice) in ledger.entries and return \"posted\"\n    raise NotImplementedError(\"docai-05 step 3\")",
        test: "cd labs/docai && uv run pytest tests/test_intake.py -k ch05_s3"
      },
      {
        title: "Process one clean document",
        text: "Write doc_id as doc- plus twelve characters of the checksum. Then write process for the happy path. Call the extractor, check two business rules and post with the document id as the key. A blank invoice number or a zero total goes to needs_review and is not posted. The reason must contain `invoice number` or `total`.",
        code: "def process(self, doc: RawDocument) -> Outcome:\n    doc_id = self.doc_id(doc)\n    # __init__ already stored self._deps and self._opts\n    # attempts = 1, call self._deps.extractor.extract(doc)\n    # rule check fails: needs_review. Otherwise post_to_ledger(self._deps.ledger, doc_id, invoice)\n    ...",
        test: "cd labs/docai && uv run pytest tests/test_intake.py -k ch05_s4"
      },
      {
        title: "Catch duplicates before paying for an extraction",
        text: "Remember the outcome of every document by its id. When the same id comes again, return a duplicate outcome with zero attempts, name the first document in duplicate_of and make no extractor call. This is the intake guard.",
        code: "# in __init__\nself._seen: dict[str, Outcome] = {}\n# at the top of process: if doc_id in self._seen: return Outcome(..., state=\"duplicate\")",
        test: "cd labs/docai && uv run pytest tests/test_intake.py -k ch05_s5"
      },
      {
        title: "Retry transient failures with the injected clock",
        text: "Wrap the extractor call in a loop. A PoisonError ends in quarantined with no retry. Any other error is transient: if attempts remain, compute the delay, record it in the outcome, call clock.sleep and try again. After the last attempt, dead-letter with no sleep.",
        code: "while True:\n    attempts += 1\n    try:\n        invoice = self._deps.extractor.extract(doc)\n    except PoisonError:\n        ...  # quarantined\n        break\n    except Exception:\n        if attempts >= self._opts.max_attempts:\n            ...  # dead_lettered\n            break\n        wait = backoff_delay(attempts, self._opts.base_delay_ms)\n        delays.append(wait)\n        self._deps.clock.sleep(wait)\n        continue\n    ...  # rule check and ledger post, as in step 4\n    break",
        test: "cd labs/docai && uv run pytest tests/test_intake.py -k ch05_s6"
      },
      {
        title: "Prove replay safety",
        text: "Add the quarantine and dead_letters properties. Then run the replay tests. A second Intake instance has no memory, but it shares the ledger. It must reprocess the document and find the ledger write already done, with exactly one entry at the end.",
        test: "cd labs/docai && uv run pytest tests/test_intake.py -k ch05_s7"
      }
    ],
    verify: "cd labs/docai && uv run pytest   # to check the reference solution instead: uv run pytest --solutions"
  },
  recap: [
    "The intake flow is asynchronous and durable at every step: store the original first, then queue, extract, validate, route and audit.",
    "The document id comes from the content checksum, and a correlation id follows each journey through the logs.",
    "Duplicates are stopped at three layers, with the idempotent ledger write as the last line.",
    "Transient failures retry with bounded exponential backoff and jitter, and unknown errors count as transient only up to the cap.",
    "Poison files are quarantined at once, exhausted retries go to an owned dead-letter queue, and rule failures go to review.",
    "Sizing is arithmetic, and the provider's quota for your region can overrule it."
  ],
  reinforcement: "I am becoming a forward-deployed AI engineer. In the document intake pipeline I learned that every document needs a content-derived id, a recorded state and exactly one outcome, that writes are idempotent and retries are bounded, and that poison files get separate exits. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: [
    "docai-q09",
    "docai-q10",
    "docai-q11"
  ]
};

export default chapter;
