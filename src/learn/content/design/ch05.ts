import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "design-05-questions-over-data",
  course: "design",
  number: 5,
  title: "Let the model write the query, and let the database decide whether it runs",
  tagline: "What changes when the answer is a number computed from tables? The number has to be right, so the checks move out of the model and into code and the database.",
  minutes: 45,
  objectives: [
    "Write the requirements for a questions-over-data system: who asks, which tables, and what it must refuse.",
    "Name the six components between a question and an answer, and say what each one prevents.",
    "Spot an unsafe generated query and name the control that stops it.",
    "Score a text-to-SQL system by execution accuracy, with ambiguity and refusal cases.",
    "Recognise the wrong join, the silent empty result and the wide scan before a user does.",
    "Fill in the design sheet for text to SQL and add a ledger row.",
  ],
  sections: [
    {
      id: "s1-requirements",
      title: "Decide who asks, what they may see and what you refuse before you pick a model",
      goal: "Who asks, what may they see, and what must the system refuse?",
      blocks: [
        {
          kind: "p",
          text: "The copilot in chapter four returned passages of text for a person to read. This prompt returns a number, and people act on numbers without reading further.",
        },
        {
          kind: "p",
          text: "Harbour Supplies has a finance team of nine. They ask questions about money, such as how much was paid to a supplier in September. Today they ask an analyst, who answers within a day.",
        },
        {
          kind: "p",
          text: "The project is to answer in seconds, from the 20 tables of the finance warehouse. Most questions touch three of them: `ledger`, `suppliers` and `invoices`.",
        },
        {
          kind: "p",
          text: "Start with the readers. Nine analysts who know the schema can read the SQL and spot a bad join. A hundred managers cannot. The more people who trust a number without checking it, the more of the checking you must build into the system.",
        },
        {
          kind: "list",
          items: [
            "Who asks, and can they read SQL? This sets how much of the work you show with each answer.",
            "Which tables and columns may be queried? Supplier bank details are out, always.",
            "Which questions must be refused? Questions about the pay of a named employee are one, and any request to change data is another.",
            "Which copy of the data do you query, and how fresh must it be? A read replica, which is a copy that only serves reads, and never the live ledger.",
            "What do a wrong answer and a slow answer cost? A wrong total in a board pack, the papers sent to the directors, costs far more than a ten-second wait.",
          ],
        },
        {
          kind: "p",
          text: "Write the answers down as a contract. At Harbour Supplies it has five lines. The system is read-only. It reads the 20 warehouse tables with the supplier bank columns denied. It refuses questions about named staff. Answers arrive within ten seconds. Every answer shows its SQL and its filters.",
        },
        {
          kind: "p",
          text: "The last line matters most. An answer that shows its query lets an analyst check it in seconds. That turns a risky black box into a fast assistant, and it costs almost nothing to build.",
        },
        {
          kind: "quiz",
          id: "design05-q1",
          question: "Managers will paste answers into a board pack without reading the SQL. What does that change in the design?",
          options: [
            "You need a bigger model.",
            "You build in the checks a reader would have done: shown filters, refusals, and tests on a question set.",
            "You drop validation to save time.",
            "You allow the system to write to the ledger.",
          ],
          answer: 1,
          explain: "Nobody downstream will catch an error, so the system has to. A bigger model lowers the error rate but removes no check.",
        },
        { kind: "p", text: "The contract is written. The next section names the parts that keep it." },
      ],
    },
    {
      id: "s2-components",
      title: "Six components sit between the question and the answer, and schema linking decides most of the quality",
      goal: "Which six parts sit between the question and the answer?",
      blocks: [
        {
          kind: "p",
          text: "**Schema linking** comes first. It picks the few tables and columns a question needs and passes only those to the model. Harbour Supplies' data warehouse has 20 tables. At about 10 tokens per column and 12 columns per table, the full schema costs 2,400 tokens on every call. Three linked tables cost 360.",
        },
        {
          kind: "p",
          text: "With the managers on board, expect 300 questions a day. That is 720,000 input tokens against 108,000. Cost is the smaller win. A model shown 20 tables will sometimes join the wrong pair, because two tables both hold a column called amount.",
        },
        {
          kind: "p",
          text: "A semantic layer, from course one, is a set of views that define business terms once. A view called `open_invoices` fixes what open means. The model writes against the views, so the meaning of overdue lives in one place and not in every generated query.",
        },
        {
          kind: "compare",
          caption: "Each of the six components has its own failure, so each needs its own check.",
          columns: ["Component", "What it does", "How it fails"],
          rows: [
            ["Schema linking", "Picks the tables and columns the question needs", "Chooses a lookalike table, or misses one"],
            ["Semantic layer", "Defines business terms once, as views", "Two views define overdue differently"],
            ["Generation", "Writes one read-only SELECT", "A join that looks right and is not"],
            ["Validation", "Parses the SQL and applies the rules", "A parser gap lets a denied column through"],
            ["Sandboxed execution", "Runs on a replica with a limited role and a time-out", "A scan that starves the replica"],
            ["Result summarising", "Turns rows into a sentence and shows the SQL", "Says none when the filter was wrong"],
          ],
        },
        {
          kind: "p",
          text: "Generation writes one SELECT. Give it the linked schema, the view definitions, three worked examples and a rule to ask a question when it is unsure. The summariser sees the rows and the SQL, and it must quote the filters it used.",
        },
        {
          kind: "widget",
          id: "design-schema-link",
          intro: "Three questions from the finance team, and a 20-table schema. Choose the tables each question needs. Fewer tables is cheaper, but a missing table makes the right query impossible.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Explain a text-to-SQL system for a finance team",
          text: "Open with the answer: the model writes a query, and code and the database decide whether it runs. Then give the flow in order: link the schema, generate, validate, execute in a read-only sandbox, summarise with the SQL shown. Interviewers push on safety next, then on measurement. A weak answer stops at the prompt.",
        },
        {
          kind: "quiz",
          id: "design05-q2",
          question: "Why link a few tables before generation instead of passing all 20?",
          options: [
            "The model cannot read more than three tables.",
            "Fewer tables means fewer lookalike columns to confuse the join, and fewer tokens on every call.",
            "It removes the need for validation.",
            "It lets the model skip the WHERE clause.",
          ],
          answer: 1,
          explain: "A smaller schema lowers both the error rate and the cost. It does not remove any later check.",
        },
        { kind: "p", text: "The parts are in place, and one of them runs text that a model wrote. So what stops that text doing harm?" },
      ],
    },
    {
      id: "s3-safety",
      title: "The database role enforces safety, because generated SQL cannot be trusted",
      goal: "Which control still holds when the generated SQL is wrong?",
      blocks: [
        {
          kind: "p",
          text: "Treat every generated query as untrusted input. The model can be wrong, and a user can try to steer it. So the checks live outside the model, in code and in the database. A prompt that says never write data is only a request.",
        },
        {
          kind: "list",
          items: [
            "A read-only role. It holds SELECT on approved columns and nothing else, so a write cannot run whatever the text says.",
            "Denied tables and columns. A parser lists every table and column in the query, subqueries included, and rejects any on the deny list.",
            "A row limit. The runner appends a cap of 500 and stops reading there.",
            "A time-out. Statements stop after 10 seconds, and a plan that estimates a full scan of the ledger is rejected before it runs.",
            "Bound parameters. Values from the question travel as parameters and are never pasted into the SQL text.",
          ],
        },
        {
          kind: "p",
          text: "Parameters matter because the question is user text. If a supplier name is pasted into a string, a name containing a quote can change the query. A bound value cannot.",
        },
        {
          kind: "p",
          text: "Layer the controls in this order. The parser catches the obvious case early and cheaply. The role is the backstop that still holds when the parser has a gap. Never rely on the parser alone.",
        },
        {
          kind: "code",
          lang: "sql",
          caption: "The role does the enforcing. Column grants make the bank columns unreadable even if a query names them. The three core tables are shown, and the other 17 follow the same pattern.",
          code: "CREATE ROLE sql_agent LOGIN NOINHERIT;\nGRANT SELECT (id, name, country, payment_terms) ON suppliers TO sql_agent;\nGRANT SELECT ON invoices, ledger TO sql_agent;\nALTER ROLE sql_agent SET default_transaction_read_only = on;\nALTER ROLE sql_agent SET statement_timeout = '10s';",
        },
        {
          kind: "widget",
          id: "design-sql-guard",
          intro: "Six generated queries and the Harbour Supplies policy. One query breaks it. Find that query, then name the rule. Watch for a denied column hidden in an allowed table.",
        },
        {
          kind: "quiz",
          id: "design05-q3",
          question: "The SQL parser has a bug and misses a denied column. Which control still protects the bank details?",
          options: [
            "A stronger instruction in the prompt.",
            "A second model that reviews the SQL.",
            "Column-level grants on the read-only role.",
            "A longer time-out.",
          ],
          answer: 2,
          explain: "The database refuses to return a column the role cannot read, whatever the parser decided. The prompt and a reviewing model are both soft controls.",
        },
        { kind: "p", text: "Safe queries can still be wrong ones. The next section measures whether they are right." },
      ],
    },
    {
      id: "s4-evals",
      title: "Score execution accuracy on a question set, and score refusals as answers too",
      goal: "How do you know the numbers are right?",
      blocks: [
        {
          kind: "p",
          text: "String match is the wrong test. Two queries can differ in every character and return the same rows. Run the generated SQL and a reference SQL against the same data, and compare the result sets. That score is **execution accuracy**.",
        },
        {
          kind: "p",
          text: "Harbour Supplies' set has 80 questions, each with reference SQL written by an analyst. The system passes 66, so execution accuracy is 66 over 80, which is 82.5 percent. String match would pass only 41, or about 51 percent, because 25 of the 66 correct queries were written differently from the reference.",
        },
        {
          kind: "p",
          text: "Compare results with care. Ignore column order, and ignore row order unless the question asks for a ranking. Round money to the penny. Compare the values and not the column names.",
        },
        {
          kind: "p",
          text: "Twelve more questions are traps, so the whole set holds 92. Six are ambiguous. Who is our biggest supplier could mean spend, invoice count or open balance. Six ask for something the system must refuse, such as a supplier's bank details. For these, the right output is a question back or a refusal.",
        },
        {
          kind: "p",
          text: "Score those as answers. If the system refuses 5 of the 6 refusal cases, refusal recall is 5 of 6, about 83 percent. A missed refusal is a safety failure, so it blocks a release even when execution accuracy is high. Build the set as chapter one of the evaluation course describes.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "How do you know a text-to-SQL system is right?",
          text: "Open with the answer: execution accuracy on a labelled question set, plus ambiguity and refusal cases. Say why string match fails and give a number. Interviewers push on how you compare result sets and who writes the reference SQL. A weak answer says you spot-checked a few queries.",
        },
        {
          kind: "quiz",
          id: "design05-q4",
          question: "A system passes 66 of 80 by execution match but only 41 of 80 by string match. What does the gap tell you?",
          options: [
            "The reference SQL is wrong for 25 questions.",
            "Most queries are right but written differently, so string match under-reports accuracy.",
            "The system is overfitted to the reference.",
            "Execution match is too lenient to trust.",
          ],
          answer: 1,
          explain: "Different SQL can return identical rows. The gap of 25 is correct queries that string match cannot recognise.",
        },
        { kind: "p", text: "A score on a question set catches the failures you listed. The next section covers the ones that look like success." },
      ],
    },
    {
      id: "s5-failures",
      title: "The worst failures return a confident answer from a query that is wrong",
      goal: "Which failures return a confident answer that is wrong?",
      blocks: [
        {
          kind: "p",
          text: "A join can multiply rows. One Harbour invoice for 10,000 pounds has three ledger postings, because it was part-paid twice. Join invoices to the ledger on the invoice number and sum the invoice total. The invoice appears three times, so the sum is 30,000.",
        },
        {
          kind: "p",
          text: "The query runs, and the number looks plausible. It is three times too big. Fix it by summing each table before the join, or by exposing a view that has one row per invoice. Then put a join-fan-out case in the question set.",
        },
        {
          kind: "p",
          text: "A silent empty result is the second failure. The model filters on `status = 'Paid'`, but the column stores `PAID`. The query returns zero rows, and the summary says no invoices were paid. Treat zero rows as a signal. Check the distinct values in the filter column, and tell the user which filters were applied.",
        },
        {
          kind: "p",
          text: "A wide scan is the third. The ledger holds six million rows, and a question with no date range reads all of them. At the 10 second time-out it fails, which is safe but unhelpful. Require a date range in the validator, and answer with the range you assumed.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Every answer shows the SQL, the filters, the row count and the date range",
          text: "All three failures share one remedy, which is showing your work. An analyst can see in five seconds that the query joined on the wrong key or filtered on the wrong value. A bare number hides all of it.",
        },
        {
          kind: "quiz",
          id: "design05-q5",
          question: "An invoice for 10,000 pounds has three ledger postings. A query joins invoices to the ledger and sums the invoice total. What does it return for that invoice?",
          options: ["10,000", "20,000", "30,000", "3,333"],
          answer: 2,
          explain: "The join repeats the invoice row once per posting, so the total is added three times. Aggregate before joining.",
        },
        {
          kind: "quiz",
          id: "design05-q6",
          question: "A generated query returns zero rows. What should the system do?",
          options: [
            "Tell the user there were none.",
            "Retry with a larger model.",
            "Check the filter values against the data, and report the filters it used.",
            "Remove the WHERE clause and try again.",
          ],
          answer: 2,
          explain: "Zero rows is as likely to mean a wrong filter as a true absence. Checking the values and showing the filters lets the user see which it is.",
        },
        { kind: "p", text: "Every step now has an answer. The last section puts the design on one page." },
      ],
    },
    {
      id: "s6-design-sheet",
      title: "The text-to-SQL design fits on one page and adds one ledger row",
      goal: "What does the finished text-to-SQL design look like?",
      blocks: [
        { kind: "p", text: "This sheet leads with the contract, because the contract decides how much checking the system must do. The controls go in the order a query meets them, and the database role goes last because it is the backstop." },
        { kind: "code", lang: "text", caption: "The finished text-to-SQL design, with the contract as the requirements.", code: "DESIGN SHEET: finance questions over data\nPrompt              Answer finance questions from the warehouse in plain English\n\n1 Users and volumes Nine analysts today, 100 managers later, 300 questions a day\n                    20 warehouse tables, 6,000,000 ledger rows\n2 Non-functionals   Read-only. Answer within 10 seconds\n                    Supplier bank columns denied\n                    Questions about named staff refused\n                    Every answer shows its SQL and its filters\n3 Components        Schema linking, semantic layer, generation\n                    Validation, sandboxed execution, result summarising\n4 Data flow         Link about 3 tables. Generate one SELECT against the views\n                    Parse and apply the deny list and row cap\n                    Run on a read replica as a read-only role\n                    Summarise with the SQL, filters, row count and date range\nCost                360 schema tokens a call rather than 2,400\n                    108,000 schema tokens a day rather than 720,000\n5 Failure modes     Unsafe SQL: role and column grants, then the parser\n                    Join fan-out: aggregate first, one row per invoice in views\n                    Silent empty result: check filter values, report filters\n                    Wide scan: require a date range, 10 second time-out\n6 Evals             80 questions with reference SQL, 66 pass, 82.5 percent\n                    12 traps. Refusal recall 5 of 6 blocks this release\n7 Rollout           Analysts first, because they can read the SQL\n                    Managers join only when refusal recall reaches 6 of 6\n\nLedger, new row\nDecision                          Gave up                       Revisit when\nQuery a view set, not raw tables  Coverage: unlisted questions  Refusals pass 15 percent\n                                  refused" },
        { kind: "p", text: "Read it out like this. The model writes one read-only query, and code and the database decide whether it runs. Schema linking cuts 20 tables to about three. The role and its column grants are the control I trust, because they hold even when the parser has a gap." },
        { kind: "p", text: "Then give the proof. Execution accuracy is 82.5 percent on 80 questions, and string match would have reported 51. A missed refusal blocks the release whatever that score is. Every answer shows its SQL, its filters and its row count." },
        { kind: "code", lang: "text", caption: "For your next questions-over-data system. Fill the contract before you pick a model.", code: "Readers       ____  (who asks, and can they read SQL)\nTables        ____  (which ones, and which columns are denied)\nRefused       ____  (questions the system must never answer)\nData copy     ____  (replica or warehouse, and how fresh)\nTime limit    ____  (seconds per statement)\nRow cap       ____  (rows returned per query)\nShown         ____  (what every answer displays)\nQuestion set  ____  (reference SQL count, ambiguity cases, refusal cases)" },
        { kind: "p", text: "All four systems so far answer as work arrives. Chapter six removes that pressure and adds a different one. What changes when nobody is waiting and the job lasts for days?" },
      ],
    },
  ],
  recap: [
    "Write the contract first: who asks, which tables, what is refused, and that every answer shows its SQL.",
    "Link a few tables before generation, because a smaller schema is cheaper and joins less wrongly.",
    "The read-only role with column grants enforces safety, and the parser and prompt only help.",
    "Score execution accuracy on a question set, and count ambiguity and refusal cases as answers.",
    "Watch for join fan-out, silent empty results and wide scans, and show the filters to expose them.",
    "The finished sheet leads with the contract, and the ledger gains a row for querying views.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In questions over data I learned that the model writes the query, and the database role and the evals decide whether to trust it. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["design-q09", "design-q10"],
};

export default chapter;
