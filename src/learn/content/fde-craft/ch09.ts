import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "fde-craft-08-live-coding-on-messy-data",
  course: "fde-craft",
  number: 9,
  title: "The prototype on Harbour's real data",
  tagline: "The spec has three open questions. How do you answer them cheaply before you build?",
  minutes: 15,
  objectives: [
    "Say what a prototype can answer from a 60-row export and what it cannot.",
    "Profile a messy file and rank its problems by rows touched and silent damage.",
    "Build one narrow task with a reply schema check, one retry and a count.",
    "Turn the counts into answers to the open questions and record them as spec v0.2.",
  ],
  sections: [
    {
      id: "prototype-why",
      title: "The prototype answers three questions from a 60-row export",
      goal: "What can a prototype answer before the build, and what can it not?",
      blocks: [
        {
          kind: "p",
          text: "The spec from chapter eight ends with three open questions. A **prototype** is a throwaway build that tests those questions on real data. Nobody ships it. Its only product is the answers.",
        },
        {
          kind: "p",
          text: "The lab, in `labs/fde-craft`, holds the register export of 60 invoice rows and the ledger export of 45 entries Harbour has already posted. Every count below comes from them.",
        },
        {
          kind: "list",
          items: [
            "Dates come in four formats: 13 rows use ISO, 17 use slashes, 29 use month names and one says TBC.",
            "Totals come in pounds, euros and dollars, and three euro rows use decimal commas.",
            "Six invoices are duplicates, and three suppliers are blank.",
            "Four totals differ from net amount plus VAT.",
          ],
        },
        {
          kind: "p",
          text: "The prototype cannot show everything. It does not read a PDF, because the export is already text. Its model step returns a category, a supplier and a confidence, not the nine header fields the product returns. So its failure rate is an early reading, not a measurement.",
        },
        {
          kind: "p",
          text: "The first job is to read the file before touching it.",
        },
      ],
    },
    {
      id: "s2-read-first",
      title: "Count the file first, then rank problems by rows touched and silent damage",
      goal: "How do I profile the file before I fix anything, and which problems come first?",
      blocks: [
        {
          kind: "p",
          text: "Reading the data means counting, not scrolling. To **profile** a file is to count what is in it before you change it. Print the row count, the blank counts and the **shape** of each risky column. A shape turns every digit into 9 and every letter into a, so 4 Mar 2026 becomes 9 aaa 9999.",
        },
        {
          kind: "p",
          text: "On the Harbour file one print shows seven shapes in the date column and thirteen in the total column. That shows the date formats, the currency marks and the decimal commas before you write a parser.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "The seven date shapes in the register export, with their row counts.",
          code: `99/99/9999    17
9999-99-99    13
99 aaa 9999   10
aaa 99, 9999   9
aaa 9, 9999    6
9 aaa 9999     4
aaa            1`,
        },
        {
          kind: "p",
          text: "Now rank the problems. Ask two questions of each. How many rows does it touch? Does it change a number without any error? A wrong number that raises no error is silent damage.",
        },
        {
          kind: "p",
          text: "A blank supplier is loud, because a person must look. A slash date read the wrong way round is silent. The string 01/02/2026 parses either way and gives the wrong month.",
        },
        {
          kind: "list",
          items: [
            "Dates: 47 of 60 rows are not ISO, and 17 use slashes. Harbour is in the UK, so a slash date is day first. Write that assumption down.",
            "Amounts: only 12 of 60 totals are bare numbers. Read the mark and the separator in one function.",
            "Duplicates: 6 rows, one tenth of the file. They inflate every count and cost model calls for nothing.",
          ],
        },
        {
          kind: "p",
          text: "Everything else waits. The 3 blank suppliers, 2 unreadable dates and 1 unreadable total make 6 rows for a person. You send them to the review queue and count them. Four totals differ from net amount plus VAT. You flag and count those, and you do not fix them.",
        },
        {
          kind: "widget",
          id: "fde-craft-data-triage",
          intro: "Read the sample rows and the counts, then pick the three problems to handle first. Think about rows touched and silent damage.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "A parser built for row one fails on most of the file",
          text: "The first row of the Harbour file is tidy. Its date is ISO and its total has a plain pound sign. A parser built for it fails on 47 of the 60 dates. Profile first, then parse.",
        },
        {
          kind: "quiz",
          id: "fde-craft08-q2",
          question: "A UK supplier's file contains the date 01/02/2026. What should you do?",
          options: [
            "Read it as 2 January, because that is the American order.",
            "Read it as 1 February, and write the assumption down where the reviewer can see it.",
            "Drop the row, because it is ambiguous.",
            "Ask the model to guess the order.",
          ],
          answer: 1,
          explain: "A UK source writes day first. Make the choice, state it and move on. If someone disagrees, the change is one line in the date function.",
        },
        {
          kind: "p",
          text: "You have the profile and the ranking. Now give the file one task to do.",
        },
      ],
    },
    {
      id: "s3-build",
      title: "Build one narrow task: extract, retry once, check a sample, then count",
      goal: "Which task do I build, and where does each number in the report come from?",
      blocks: [
        {
          kind: "p",
          text: "With the file profiled, pick one narrow task and say it aloud. For this file it is to give each invoice line a category and read the supplier name, so finance can group spend. A model does this well and a regular expression does not.",
        },
        {
          kind: "p",
          text: "Send the model only the rows that can use it. Start with 60 rows. Remove 6 duplicates and you have 54. Remove the 6 rows that need a person and you have 48. Those 48 reach the model. The other 12 cost nothing.",
        },
        {
          kind: "p",
          text: "Ask for JSON with three fields: a category from a closed list of eight, a supplier name and a confidence from 0 to 1. That is the prototype's reply schema, the JSON the model must return. Validate every reply against it in code. Replies can arrive fenced, as prose, with an unlisted category or with a confidence of 1.4. The lab replays recorded replies, so it needs no key.",
        },
        {
          kind: "p",
          text: "When a reply fails, retry once and attach the validation errors to the second request. Do not loop. In the lab run, 41 rows pass first time, 5 pass on the retry, and 2 fail twice. That is 46 passes and 2 failures. The calls add up as 41 plus 10 plus 4, which is 55.",
        },
        {
          kind: "p",
          text: "A confidence below 0.6 is low confidence. Keep that row, and count it. The model writes that number about itself, so it is a rough signal. Three extractions came back below 0.6.",
        },
        {
          kind: "quiz",
          id: "fde-craft08-q3",
          question: "48 rows each make one model call. 7 of them fail the reply schema and are retried once. How many calls is that in all?",
          options: ["48", "53", "55", "62"],
          answer: 2,
          explain: "48 first calls plus 7 retries is 55. Count retries in the cost estimate, because they are real calls.",
        },
        {
          kind: "p",
          text: "Read ten rows by hand before you trust any number. This takes two minutes and catches a prompt that quietly misreads every freight line.",
        },
        {
          kind: "p",
          text: "Two cheap checks then catch what the model cannot. The sum check tests that each total equals its net amount plus VAT. The ledger check matches each row against the ledger export, on the normalised supplier name and the invoice number.",
        },
        {
          kind: "p",
          text: "The ledger holds 45 entries. Of the 48 ready rows, 38 match, 4 differ in amount and 6 are not in the ledger. That is 38 plus 4 plus 6, which is 48. The ledger has 3 entries that no invoice matched, because 45 less 42 is 3.",
        },
        {
          kind: "callout",
          tone: "insight",
          title: "A sum check and a ledger check catch different errors",
          text: "Rows R005 and R022 fail the sum check, and the ledger holds the sum that adds up. In R011 and R030 the invoice adds up and the ledger differs. R038 and R057 fail the sum check but match the ledger, which carries the same wrong total. Run both checks.",
        },
        {
          kind: "p",
          text: "Two differences from the product must be said plainly. The prototype counts a total mismatch and lets the row through, while the product sends it to review. The prototype also uses floats, while the schema uses `numeric`, so its amounts are only close.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "The reference run in the lab.",
          code: `$ uv run pytest --solutions
...
38 passed`,
        },
        {
          kind: "p",
          text: "The counts are in. Now they have to become answers.",
        },
      ],
    },
    {
      id: "prototype-findings",
      title: "The prototype closes three questions and changes the spec",
      goal: "What do the counts say about the three open questions, and what changes in the spec?",
      blocks: [
        {
          kind: "p",
          text: "The report is one paragraph that carries every count as digits and says what a person should do next. This is the prototype's, word for word.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "The prototype's report paragraph.",
          code: `We read 60 invoice rows and removed 6 duplicates. 6 rows went to a person because the supplier, date or total was unreadable, which left 48 to reconcile. Of those, 38 match the ledger, 4 differ in amount and 6 are not in the ledger; 3 ledger entries have no invoice. 4 invoices have a total that does not equal net plus VAT. The model made 55 calls: 46 extractions passed the schema, 2 failed twice and 3 came back with confidence below 0.6. Next, someone should clear the 6 review rows, check the 4 amount differences and the 6 missing entries, and read the 2 failed and 3 low-confidence extractions by hand.`,
        },
        {
          kind: "code",
          lang: "text",
          caption: "Prototype findings and the change they make to the spec.",
          code: `Prototype findings: Harbour Intake
Run on: register export (60 rows) and ledger export (45 entries). No PDF read.

OQ-1  Do the register's supplier names match the ledger as typed?
      No. Names differ in capitals, suffix and punctuation.
      Spec change: normalise names, and seed supplier_alias from the names found.
OQ-2  Can slash dates be read safely?
      Yes. 17 of 60 rows are slash dates. They read safely day-first. 2 rows are
      unreadable and go to review.
      Spec change: AC-07 confirms day-first.
OQ-3  How often does a model reply fail the schema?
      41 right first time, 5 right on retry, 2 failing. 55 calls for 48 rows,
      15 percent extra. An early reading: the prototype returns three fields.
      Spec change: AC-03 budgets 15 percent extra model calls.

Spec: v0.1 becomes v0.2.`,
        },
        {
          kind: "p",
          text: "Read the findings out as three answers. Names do not match as typed, so the system normalises them and seeds supplier_alias. Slash dates read day first, and two rows go to review. Retries cost about 15 percent extra calls.",
        },
        {
          kind: "p",
          text: "Spec v0.2 records those three changes and nothing else. The third answer is only an early reading, because the prototype's model step is not the real extraction.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next customer: a findings sheet, one block for each open question.",
          code: `Prototype findings: <customer system>
Run on: <the exports used>. Not tested: <what the data cannot show>.

OQ-<n>  <the open question, as the spec words it>
        Answer: <yes, no or a count>.   Evidence: <the number from the run>.
        Spec change: <the one line that changes>.

Early readings: <any answer the prototype can only hint at>.
Spec: v0.1 becomes v0.2.`,
        },
        {
          kind: "p",
          text: "What a prototype can and can't tell you comes up in interviews. The answer is the same list of what you tested and what you did not.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "What is a prototype for, and what can't it tell you?",
          text: "Open with the answer: it settles named questions cheaply and tells you nothing outside the data it ran on. Give Harbour's three questions and the answers. Then name what it could not show, such as whether a model reads a PDF well. Interviewers push on how you would close the gap.",
        },
        {
          kind: "quiz",
          id: "fde-craft-proto-q1",
          question: "What can't the Harbour prototype tell you?",
          options: [
            "Whether slash dates can be read day first.",
            "Whether the supplier names match the ledger as typed.",
            "Whether a model reads a PDF well.",
            "How many rows need a person.",
          ],
          answer: 2,
          explain: "The prototype runs on text exports and never reads a PDF. Reading a PDF waits for the build and is measured in the pilot.",
        },
        {
          kind: "p",
          text: "The open questions are closed, so it is time to build. How do you build the real thing quickly and still own it?",
        },
      ],
    },
  ],
  lab: {
    title: "Messy invoices in 45 minutes",
    goal: "Read, parse and clean a messy invoice CSV, extract a category with a schema check, reconcile against a ledger and write a one-paragraph report, inside five timed blocks.",
    minutes: 45,
    files: [
      "labs/fde-craft/craft/types.py",
      "labs/fde-craft/craft/fake_model.py",
      "labs/fde-craft/craft/data.py",
      "labs/fde-craft/craft/parse.py",
      "labs/fde-craft/craft/clean.py",
      "labs/fde-craft/craft/extract.py",
      "labs/fde-craft/craft/reconcile.py",
      "labs/fde-craft/craft/report.py",
      "labs/fde-craft/craft/pipeline.py",
      "labs/fde-craft/tests/test_craft.py",
      "labs/fde-craft/solutions/pipeline.py",
    ],
    steps: [
      {
        title: "Start the clock and see every test fail",
        text: "Run uv sync. Read the README, then open types.py, fake_model.py and data.py in the craft folder. They are given and need no edits. Start a 45-minute timer and run uv run pytest. All 38 tests fail with NotImplementedError, which is the starting line. The model call replays recorded replies, so you need no network and no key.",
        code: "cd labs/fde-craft\nuv sync\nuv run pytest",
      },
      {
        title: "Minutes 0 to 10: read the data",
        text: "Write shape_of, which turns every digit into 9 and every letter into a. Write profile, which counts the rows, the blank suppliers and the shapes of the dates and totals. Run the profile on the real file and read what it prints. If you run short: skip profile and print three rows by hand, but never skip reading the data.",
        code: "def shape_of(s: str) -> str:\n    # digits -> 9, letters -> a, everything else stays\n    raise NotImplementedError(\"fde-craft-08 step 2\")\n\n\ndef profile(rows: list[Row]) -> Profile:\n    # rows, blank_suppliers, date_shapes, total_shapes\n    raise NotImplementedError(\"fde-craft-08 step 2\")",
        test: "cd labs/fde-craft && uv run pytest tests/test_craft.py -k ch08_s2",
      },
      {
        title: "Minutes 10 to 20: parse",
        text: "Write parse_csv for quoted fields, escaped quotes, line breaks inside quotes and CRLF. Write parse_date for four formats, with a slash date day first and None for a date that does not exist. Write parse_amount for marks and decimal commas, then parse_invoices. If you run short: support the three formats you saw most and return None for the rest.",
        code: "# parse_csv: csv.reader(io.StringIO(text)) keeps line breaks inside quotes.\n# text.splitlines() loses them.\n\ndef parse_date(s: str) -> str | None:\n    # 2026-03-04, 04/03/2026, 4 Mar 2026, Mar 4, 2026\n    # 31/02/2026 does not exist: None\n    raise NotImplementedError(\"fde-craft-08 step 3\")",
        test: "cd labs/fde-craft && uv run pytest tests/test_craft.py -k ch08_s3",
      },
      {
        title: "Minutes 20 to 30: clean",
        text: "Write normalise_supplier and dedupe, which keeps the first invoice for each supplier, invoice number, currency and total. Write find_issues and triage. A blank supplier, an unreadable date or an unreadable total goes to a person. A total mismatch does not. The real file has 6 duplicates and 6 review rows. If you run short: drop the sum check and say so.",
        code: "def dedupe(invoices: list[Invoice]) -> Deduped:\n    # key: normalised supplier | upper-case invoice number | currency | total\n    # keep the first in file order\n    raise NotImplementedError(\"fde-craft-08 step 4\")",
        test: "cd labs/fde-craft && uv run pytest tests/test_craft.py -k ch08_s4",
      },
      {
        title: "Minutes 30 to 40: extract and reconcile",
        text: "Write parse_json_reply, which accepts fenced JSON and never raises. Write validate_extraction, which names every bad field. Write extract_row, which retries once with the errors as feedback. Then write reconcile against the ledger. If you run short: make max_attempts 1 and report the failures, and reconcile on exact keys only.",
        code: "def extract_row(model: Model, inv: Invoice, max_attempts: int = 2) -> ExtractResult:\n    # call, parse, validate; on failure pass the errors in feedback\n    raise NotImplementedError(\"fde-craft-08 step 5\")",
        test: "cd labs/fde-craft && uv run pytest tests/test_craft.py -k ch08_s5",
      },
      {
        title: "Minutes 40 to 45: report and run the pipeline",
        text: "Write build_report, one paragraph that carries every count as digits and says what a person should do next. Write run_pipeline to wire it all together. The full run reads 60 rows, reconciles 48 and makes 55 model calls. If you run short: print the summary object and say what the paragraph would hold.",
        code: "def run_pipeline(csv_text: str, ledger: list[LedgerEntry], model: Model) -> tuple[Summary, str]:\n    # parse, dedupe, triage, extract the ready rows, reconcile, count, report\n    raise NotImplementedError(\"fde-craft-08 step 6\")",
        test: "cd labs/fde-craft && uv run pytest tests/test_craft.py -k ch08_s6",
      },
    ],
    verify: "cd labs/fde-craft && uv run pytest   # to check the reference solution instead: uv run pytest --solutions",
  },
  recap: [
    "A prototype answers named questions on real data. It cannot show what its data does not hold, such as how a model reads a PDF.",
    "Profile first and rank problems by rows touched and silent damage.",
    "Send the model only usable rows, validate each reply, retry once and count failures.",
    "The prototype lets a total mismatch through and uses floats. The product sends it to review and uses numeric.",
    "Answer each open question with its evidence, and record the changes as spec v0.2.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. On Harbour I learned that a prototype answers named questions cheaply on real data and says what it cannot show. I profile a file first, build one narrow task, check a sample and report counts. I close each open question with its evidence and record the change as spec v0.2. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["fde-craft-q16", "fde-craft-q24"],
};

export default chapter;
