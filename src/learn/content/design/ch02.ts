import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "design-02-document-intake-at-scale",
  course: "design",
  number: 2,
  title: "A deadline sizes a document pipeline at half the cost of its peak",
  tagline: "How do you size a system that must absorb a daily peak? Start from the deadline, put a queue before every stage and give every failure a control that keeps the document.",
  minutes: 50,
  objectives: [
    "State the requirements of a document intake system as numbers, including the arrival peak and the turnaround.",
    "Draw the six components with a queue between them and an alert age on each queue.",
    "Size workers, Document AI quota and model tokens per minute from a volume and a deadline.",
    "Choose a mitigation for a poison document, a duplicate, a provider outage and a review backlog.",
    "Plan evals and a shadow-then-canary rollout with gates written as numbers.",
    "Fill in the whole design sheet for intake and start the trade-off ledger.",
  ],
  sections: [
    {
      id: "s1-requirements",
      title: "A four-hour turnaround turns a vague intake into numbers you can size",
      goal: "What are the volume, the arrival shape and the deadline, as numbers?",
      blocks: [
        {
          kind: "p",
          text: "The prompt is short: design a pipeline that handles every supplier document Harbour receives. The group receives 50,000 documents a day. How do you size a system that must absorb a daily peak? This chapter answers by running the seven steps from chapter one on one design.",
        },
        {
          kind: "p",
          text: "Ask the questions that change the design. Which documents arrive, and by what route? What does done mean? At Harbour Supplies the answer is firm. Every document is either posted to the ledger, or sitting in the review queue with a reason, within four hours of arrival.",
        },
        {
          kind: "compare",
          caption: "The requirements, all illustrative, and the design decision each one drives. Document AI is Google Cloud's service for reading text and layout from scanned and PDF documents.",
          columns: ["Requirement", "Number", "What it drives"],
          rows: [
            ["Volume", "50,000 documents a day, 3 pages each, so 150,000 pages", "Per-page cost and the size of every queue"],
            ["Arrival shape", "60 percent arrive in the three hours from 08:00", "The peak rate, which is 10,000 documents an hour"],
            ["Turnaround", "Posted or queued for review within 4 hours of arrival", "The processing rate and the alert age on each queue"],
            ["Accuracy", "98 percent per field, six required fields", "The review rate and the evals"],
            ["Review", "5 percent of documents go to a person", "Reviewer headcount and most of the cost"],
            ["Residency", "Documents stay in the UK", "Region for storage, Document AI and the model"],
          ],
        },
        {
          kind: "p",
          text: "Two numbers matter most. The peak is 60 percent of 50,000, which is 30,000 documents in three hours, or 10,000 an hour. The deadline is four hours. A four-hour limit does not mean you must keep pace with the peak. It means no document waits longer than four hours.",
        },
        {
          kind: "p",
          text: "That difference saves money. The pipeline can queue the peak and drain it afterwards, so you size for a lower rate than the arrivals. Section three works out how much lower.",
        },
        {
          kind: "quiz",
          id: "design02-q1",
          question: "Harbour Supplies receives 60 percent of 50,000 documents in three hours. What is the peak arrival rate?",
          options: [
            "2,083 documents an hour, the daily average.",
            "30,000 documents an hour.",
            "10,000 documents an hour.",
            "16,667 documents an hour.",
          ],
          answer: 2,
          explain: "60 percent of 50,000 is 30,000 documents. Spread over three hours that is 10,000 an hour. The daily average of 2,083 hides the peak completely.",
        },
        { kind: "p", text: "The numbers are on the board. Next come the parts that have to meet them." },
      ],
    },
    {
      id: "s2-components",
      title: "Six components with a queue between each pair keep a slow stage from blocking a fast one",
      goal: "Which six parts do the work, and what does each one cost?",
      blocks: [
        {
          kind: "p",
          text: "Draw one diagram, left to right. A document lands in the inbox. The classifier names its type. Extraction reads the fields. Validation checks them against rules and the purchase order that Harbour placed with the supplier. The ledger takes the clean documents, and the review queue takes the rest.",
        },
        { kind: "p", text: "Extraction gives each field a confidence score between 0 and 1. Any field below 0.85 sends the document to review, whatever the rules say. The ledger write carries an idempotency key, from course two, so a replay posts only once." },
        {
          kind: "p",
          text: "Put a queue in front of every stage. A queue lets one stage run slower than the next without losing work. It also gives you a number to watch, which is the age of the oldest message waiting.",
        },
        {
          kind: "compare",
          caption: "The components, the model calls with their cost per document, and the age at which each queue raises an alert. Model prices come from Harbour's sheet. The Document AI price is illustrative, so take a real one from the current Google Cloud price list. The ages add up to 220 minutes, which leaves 20 minutes inside the four hours.",
          columns: ["Component", "Job", "Model call and cost", "Alert when the oldest item is older than"],
          rows: [
            ["Inbox", "Stores the raw file, assigns an id, records the file hash", "None", "5 minutes"],
            ["Classifier", "Names the document type and splits bundles", "Medium model, 500 tokens in, 0.1 pence", "10 minutes"],
            ["Extraction", "Document AI on 3 pages, then field mapping", "3 pages at 0.5 pence is 1.5 pence. Mapping on the medium model reads 1,000 tokens and writes 500, which costs 0.6 pence.", "3 hours"],
            ["Validation", "Rules, purchase order match, duplicate check", "None", "10 minutes"],
            ["Ledger", "Posts once, under an idempotency key", "None", "15 minutes"],
            ["Review queue", "A person fixes the flagged fields", "None", "Its own target of one working day"],
          ],
        },
        // CHECK: the Document AI per-page price was not confirmed on 21 Oct 2026. The 0.5 pence a page is illustrative and labelled so in the caption. Replace it with the price for the processor you choose.
        {
          kind: "p",
          text: "The extraction stage is the slow one. Document AI reads the pages, then a model call maps the text and layout to the six required fields. Together they take 6 seconds a document, measured on a sample of 200.",
        },
        {
          kind: "p",
          text: "Every other stage takes about a second, so the backlog forms in front of extraction. That is why extraction gets 3 of the 4 hours.",
        },
        {
          kind: "p",
          text: "At the deadline rate, the extraction queue peaks at 11:00. By then 30,000 documents have arrived and 16,071 are done, so 13,929 are waiting. The last of them finishes at about 13:36, 2.6 hours after it arrived, inside the 3-hour alert.",
        },
        {
          kind: "p",
          text: "Add up the machine cost. Classification is 0.1 pence, Document AI is 1.5 pence and mapping is 0.6 pence. That is 2.2 pence a document, or £1,100 a day at 50,000 documents. Chapter one says to mark each call on the diagram. Do that here, because the cost is the first thing an interviewer asks about.",
        },
        {
          kind: "callout",
          tone: "insight",
          title: "Queue age is a better alarm than queue length",
          text: "A length of 5,000 means nothing without the rate. An age of three hours means the deadline is close, whatever the rate. Alert on age, and the same alert works on a quiet Sunday and on month end.",
        },
        {
          kind: "quiz",
          id: "design02-q2",
          question: "Why put a queue between the classifier and extraction?",
          options: [
            "To make the pipeline cheaper to run.",
            "So extraction can fall behind during the peak without dropping documents or blocking the classifier.",
            "Because Document AI requires a queue.",
            "To reduce the number of model calls.",
          ],
          answer: 1,
          explain: "A queue absorbs the difference between two rates. Extraction runs slower than classification, so the backlog waits in the queue, and its age tells you how close the deadline is.",
        },
        { kind: "p", text: "You know the parts and the slowest stage. The next section works out how much of each one to buy." },
      ],
    },
    {
      id: "s3-capacity",
      title: "The deadline rate plus 25 percent headroom needs 9 workers where the raw peak needs 17",
      goal: "How many workers, how much quota and how many tokens does the deadline need?",
      blocks: [
        {
          kind: "p",
          text: "Start with the last document of the peak. It arrives at 11:00, behind 30,000 others, and it must finish by 15:00. If the pool starts at 08:00, it has seven hours to clear 30,000 documents. 30,000 divided by 7 is 4,286 documents an hour.",
        },
        {
          kind: "p",
          text: "Add 25 percent headroom for retries, slow documents and a worker restart. 4,286 times 1.25 is 5,357 an hour, or 1.49 a second. Then work out the three resources in turn.",
        },
        {
          kind: "list",
          items: [
            "Workers: rate times seconds per document. 1.49 times 6 seconds is 8.9, so 9 workers. This is Little's law, from course seven: work in progress equals arrival rate times time in the system.",
            "Document AI calls: 1.49 a second. In a single region such as the UK, the default quota is 6 requests a minute per processor type, and a quota request raises it. Assume Harbour has raised it to 15 requests a second. This stage then has ten times the headroom it needs.",
            "Model tokens: 89.3 documents a minute times 2,000 tokens is 178,600 a minute. Ask for 180,000.",
          ],
        },
        // CHECK: Document AI online quotas (120 a minute per project per processor type in the US and EU, 6 in a single region, increase requested in the console) were read on 21 Oct 2026 from https://docs.cloud.google.com/document-ai/quotas through a summary of the page, so confirm them. The 15 requests a second in the text is an assumption, stated as one. Also confirm whether Document AI offers a processor in europe-west2 for the UK residency row.
        {
          kind: "compare",
          caption: "Three ways to size the same pipeline. Only the deadline method meets the deadline without paying for the raw peak. Token figures are rounded up to the next 10,000.",
          columns: ["Sized on", "Documents an hour", "Workers", "Tokens a minute", "Meets the deadline"],
          rows: [
            ["The daily average", "2,083", "4", "70,000", "No. The peak queue never clears in time."],
            ["The raw peak", "10,000", "17", "340,000", "Yes, with almost twice the capacity needed."],
            ["The deadline plus 25 percent headroom", "5,357", "9", "180,000", "Yes."],
          ],
        },
        {
          kind: "widget",
          id: "design-intake-capacity",
          intro: "Three cases for Harbour Supplies. In each, choose the smallest plan that meets the deadline. Watch which limit binds first, the workers or the model quota.",
        },
        {
          kind: "p",
          text: "Now the money. A review costs 3 minutes of a clerk at £18 an hour, which is 90 pence. Five percent of documents go to review, so review adds 4.5 pence per document. Add the 2.2 pence of machine cost and the total is 6.7 pence, or £3,350 a day.",
        },
        {
          kind: "p",
          text: "Review is 67 percent of that bill. One point of review rate is 500 reviews a day, worth £450. Halving the model price saves £175. So the cheapest improvement is almost always fewer documents sent to review, not a cheaper model.",
        },
        {
          kind: "fold",
          tone: "hood",
          title: "Why the last document of the peak sets the rate",
          text: "A pool that starts at 08:00 and runs at a steady rate finishes the document that arrived at hour t after 10,000 times t divided by the rate hours. That document waits that time minus t. The wait is largest for the last arrival, at t equal to 3, so the check at the end of the peak covers every earlier document.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Size a document intake system for 50,000 documents a day",
          text: "Open with the answer: a pool sized to the deadline, not the peak, with quotas worked from the per-document figures. Then give the steps. Peak documents divided by hours to the last deadline, plus headroom, then workers, calls and tokens. Interviewers push on how you measured seconds per document, and what happens when the mix changes.",
        },
        {
          kind: "quiz",
          id: "design02-q3",
          question: "Month end sends 80 percent of 50,000 documents in two hours. The deadline is four hours. What rate must the pool sustain before headroom?",
          options: [
            "20,000 documents an hour.",
            "6,667 documents an hour.",
            "10,000 documents an hour.",
            "2,083 documents an hour.",
          ],
          answer: 1,
          explain: "The peak is 40,000 documents. The last arrives at hour 2 and must finish at hour 6, so 40,000 divided by 6 is 6,667 an hour. The raw peak of 20,000 an hour is three times too high.",
        },
        {
          kind: "quiz",
          id: "design02-q4",
          question: "Which change is worth more per day: halving the model price, or cutting the review rate by one point?",
          options: [
            "Halving the model price, which saves £175.",
            "Cutting the review rate by one point, which saves £450.",
            "They are worth the same.",
            "Neither changes the daily bill.",
          ],
          answer: 1,
          explain: "One point of review rate is 500 reviews of 90 pence, which is £450. Halving 0.7 pence of model cost on 50,000 documents saves £175. Review is the larger lever.",
        },
        { kind: "p", text: "That sizing holds on a good day. The next section takes the four ways a day goes bad." },
      ],
    },
    {
      id: "s4-failures",
      title: "Four failure modes decide whether the pipeline survives a bad day",
      goal: "Which control keeps the work when each of four failures hits?",
      blocks: [
        {
          kind: "p",
          text: "A poison document crashes the worker every time it is read, such as a 400-page scan or a corrupt PDF. The queue redelivers it and the next worker crashes. Cap delivery at three attempts. Then move the message to a dead-letter queue, from course two, which holds messages that keep failing, with the error attached, and alert a person.",
        },
        {
          kind: "p",
          text: "Suppliers send the same invoice twice, by email and through Harbour's supplier portal. Hash the file at the inbox for exact copies. Then build a business key from supplier, invoice number and total. The ledger refuses a second write under the same key. The Document AI course, later in the app, builds this in code.",
        },
        {
          kind: "p",
          text: "A provider outage needs three controls. Retry with exponential backoff and jitter, from course one. Stop calling once failures pass a threshold, which is a circuit breaker. Let the queue hold the work. At 5,357 an hour, a 40-minute outage leaves 3,571 documents waiting.",
        },
        {
          kind: "p",
          text: "Off peak, the other 20,000 documents arrive over 21 hours, which is about 952 an hour. The pool then has 4,405 an hour spare. 3,571 divided by 4,405 is 0.81 hours, about 49 minutes to clear. The same outage at the peak has no spare capacity. Tell the business early, because some documents will miss the deadline.",
        },
        {
          kind: "p",
          text: "A review backlog grows when the review rate rises. One reviewer clears 20 documents an hour. Seventeen reviewers working 7.5 hours clear 2,550 a day. At 5 percent, 2,500 arrive, so there is almost no slack. At 9 percent, 4,500 arrive and the queue grows by 1,950 a day.",
        },
        {
          kind: "widget",
          id: "design-intake-failure",
          intro: "Four incidents at Harbour Supplies. For each one, choose the mitigation that keeps the work and leaves a record. Read the rejected options too, because each is a mistake teams actually make.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Never lower the review threshold to clear a backlog",
          text: "The queue shrinks because errors are posted instead of caught. Rank by due date and amount, add reviewers, and fix the cause. A supplier with a new layout is the usual cause.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "A provider outage, duplicate submissions and a poison document hit in the same hour. What happens?",
          text: "Open with the answer: each failure has its own control, and none of them loses a document. Name the dead-letter queue, the idempotency key and the circuit breaker. Interviewers push on how you know the queue will recover, and who is told when it does not.",
        },
        {
          kind: "quiz",
          id: "design02-q5",
          question: "A message has crashed three workers in a row. What should the queue do with it?",
          options: [
            "Keep redelivering it with a longer delay.",
            "Delete it and log a warning.",
            "Move it to a dead-letter queue with the error and alert a person.",
            "Send it to the review queue as a normal document.",
          ],
          answer: 2,
          explain: "Parking the message ends the loop and keeps the file with its error. Deleting loses a document, and endless redelivery keeps taking workers.",
        },
        { kind: "p", text: "Each failure now has a control. You still have to prove that the pipeline reads documents correctly before it posts one." },
      ],
    },
    {
      id: "s5-evals-rollout",
      title: "Whole-document pass rate gates a two-stage rollout, with each gate written as a number",
      goal: "Which numbers prove the pipeline works, and which gates release it?",
      blocks: [
        {
          kind: "p",
          text: "Field precision says how good each field is. The whole-document pass rate is what the business feels. Take six required fields, each right 98 percent of the time, with independent errors. A document passes 0.98 to the power six, which is 88.6 percent. About one document in nine has a wrong field.",
        },
        {
          kind: "p",
          text: "Build a golden set of 1,000 labelled documents and slice it by supplier and by scanner. Report field precision and the whole-document pass rate on each slice. Chapter one of the evaluation course shows how to build the set. A single overall figure hides the one supplier who is failing.",
        },
        { kind: "p", text: "Now check that figure against the review rate, because an interviewer will. If 11.4 percent of documents hold a wrong field, that is 5,700 a day. Only 2,500 reach a person. Validation has to account for the difference." },
        { kind: "p", text: "Say validation detects 5,600 of the 5,700, through the purchase order match and the sum check from the FDE craft course. One re-read of the failed field repairs 3,350 of them. Those re-reads cost about 34 pounds a day, which is small enough to leave out of the sum." },
        { kind: "p", text: "The other 2,250 go to review. Validation also flags 250 clean documents by mistake, and that makes the 2,500 reviews. The 100 it misses are posted wrong, which is 0.2 percent of documents. These figures are illustrative, and the sum is the point." },
        {
          kind: "p",
          text: "Roll out in two stages. In shadow, the new pipeline reads live arrivals and posts nothing. You compare its output with what the clerks post, for two weeks.",
        },
        {
          kind: "p",
          text: "A canary, from course seven, releases a change to a small slice of live traffic first. Here the pipeline posts for 5 percent of live documents, which is 2,500 a day, and the clerks do the rest.",
        },
        {
          kind: "list",
          items: [
            "Shadow gate: whole-document pass rate of at least 88 percent before validation, and wrong postings under 0.3 percent after it.",
            "Canary gate, held for two days at each step: review rate under 6 percent, and the slowest 5 percent of documents done inside 3 hours.",
            "Widen from 5 to 25, 50 and 100 percent only when the gate holds.",
            "Rollback: one switch sends all documents back to the clerks, and it is tested before the canary starts.",
          ],
        },
        // CHECKED 17 Oct 2026: no vendor source applies. The figures are arithmetic (0.98 to the power 6 is 88.6 percent) and are now labelled illustrative in the text.
        {
          kind: "p",
          text: "These gates are illustrative. In a real engagement, set them from the customer's measured baseline. Write the gates before the stage starts. A gate set after seeing the results will always be passed. In an interview, say which number would make you stop, and who you would tell.",
        },
        {
          kind: "quiz",
          id: "design02-q6",
          question: "Six required fields are each 98 percent accurate. What is the whole-document pass rate, if errors are independent?",
          options: [
            "98 percent.",
            "92 percent.",
            "88.6 percent.",
            "86 percent.",
          ],
          answer: 2,
          explain: "0.98 to the power six is 0.886. Each extra required field lowers the pass rate, which is why the whole-document figure is always lower than the field figure.",
        },
        { kind: "p", text: "Every step of the method now has an answer. The last section puts them on one page." },
      ],
    },
    {
      id: "s6-design-sheet",
      title: "The intake design fits on one page and writes the ledger's first row",
      goal: "What does the finished intake design look like?",
      blocks: [
        { kind: "p", text: "Fill the sheet from the sections above, one step at a time. Keep the sizing and the cost next to the components they price. The ledger's first row records the decision that drives most of the bill, which is sending doubtful documents to a person." },
        { kind: "code", lang: "text", caption: "The finished intake design, as you would leave it on the board.", code: "DESIGN SHEET: document intake for the Harbour group\nPrompt              Handle every supplier document Harbour receives\n\n1 Users and volumes 50,000 documents a day, 3 pages each\n                    60 percent arrive in the three hours from 08:00\n                    Peak of 10,000 documents an hour\n2 Non-functionals   Posted or in review within 4 hours of arrival\n                    98 percent per field, six required fields\n                    5 percent of documents reviewed\n                    Documents stay in the UK\n3 Components        Inbox, classifier, extraction, validation, ledger, review queue\n                    A queue before every stage, alerted on its oldest item's age\n4 Data flow         File stored and hashed. Type named. Fields read and mapped\n                    Rules, purchase order match and duplicate check\n                    Clean documents post once. The rest wait for a person\nSizing              30,000 documents in 7 hours is 4,286 an hour\n                    Plus 25 percent headroom is 5,357 an hour, or 1.49 a second\n                    9 workers at 6 seconds a document\n                    1.49 Document AI calls a second, quota raised to 15\n                    180,000 model tokens a minute\nCost                Machine 2.2 pence. Review 4.5 pence. Total 6.7 pence\n                    3,350 pounds a day, of which review is 67 percent\n5 Failure modes     Poison document: three attempts, then the dead-letter queue\n                    Duplicate: file hash, then a business key at the ledger\n                    Outage: backoff, circuit breaker, the queue holds the work\n                    Review backlog: rank by due date and amount, add reviewers\n6 Evals             Golden set of 1,000, sliced by supplier and scanner\n                    Whole-document pass rate 88.6 percent before validation\n                    Wrong postings 0.2 percent after validation\n7 Rollout           Shadow for two weeks, then a 5 percent canary\n                    Then 25, 50 and 100 percent, two days at each step\n                    One tested switch returns all documents to the clerks\n\nLedger\nDecision                      Gave up                                   Revisit when\nReview below 0.85 confidence  Reviewer hours: 2,500 a day at 5 percent  Queue age passes half a working day" },
        { kind: "p", text: "Read it out like this. The pipeline takes 50,000 documents a day and finishes each within four hours. It is sized from the deadline, so it needs 9 workers where the raw peak would need 17. A queue with an age alert sits before every stage." },
        { kind: "p", text: "Then say where the money goes. It costs 6.7 pence a document, and review is 67 percent of that. So I work on the review rate before the model price. Each failure has a control that keeps the document, and whole-document pass rate gates the release." },
        { kind: "code", lang: "text", caption: "For your next pipeline. It adds the sizing lines that a pipeline needs to the blank sheet.", code: "Peak                ____  (documents an hour in the busiest period)\nDeadline rate       ____  (peak documents / hours to the last deadline)\nHeadroom            ____  (usually 25 percent)\nWorkers             ____  (rate per second x seconds per document)\nProvider quota      ____  (calls per second, and the limit today)\nTokens a minute     ____  (documents a minute x tokens per document)\nCost per document   ____  (machine, then review, shown apart)\nQueue alert ages    ____  (they must add up to less than the deadline)" },
        { kind: "p", text: "This pipeline reads documents and posts them under fixed rules. It never decides anything for itself. Chapter three takes the next step. What may an agent do without a person?" },
      ],
    },
  ],
  recap: [
    "Write requirements as numbers: 50,000 documents a day, a 10,000 an hour peak and a four-hour turnaround.",
    "Put a queue in front of every stage and alert on the age of the oldest item.",
    "Size from the deadline, not the peak: 30,000 documents in 7 hours is 4,286 an hour, plus 25 percent headroom.",
    "Review is 67 percent of the cost, so the review rate matters more than the model price.",
    "Park poison documents, key duplicates, hold the queue through outages, and rank the review backlog.",
    "Gate shadow and canary stages on whole-document pass rate, review rate and turnaround.",
    "Validation must account for the gap between 11.4 percent of documents with a wrong field and the 5 percent that a person sees.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In document intake at scale I learned to size from the deadline and not the peak. I put a queue and an alert age in front of every stage. I give every failure a mitigation that keeps the document. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["design-q03", "design-q04"],
};

export default chapter;
