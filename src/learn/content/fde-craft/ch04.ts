import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "fde-craft-07-the-business-case",
  course: "fde-craft",
  number: 4,
  title: "The business case and statement of work",
  tagline: "The plan has a cost, so how do you show it is worth paying for? You measure what the work costs today, price the system line by line, and write the deal down.",
  minutes: 20,
  objectives: [
    "Measure a cost baseline in hours and errors from a timed sample.",
    "Work out the monthly run cost of the system, line by line.",
    "Calculate payback, test it on its weakest input and lay out a one-page case for a new customer.",
    "Choose between a fixed fee and time and materials, and write a statement of work with exit criteria.",
  ],
  sections: [
    {
      id: "s1-baseline",
      title: "A business case is only as good as a cost baseline you measured",
      goal: "How do you find out what the manual work costs today?",
      blocks: [
        {
          kind: "p",
          text: "Chapter three ended with a plan, and a plan has a cost. So how do you show it is worth paying for? Every saving you claim is a difference between two numbers, and the first is what the work costs today.",
        },
        {
          kind: "p",
          text: "Call it the **cost baseline**: today's monthly cost of the manual process. It is in pounds. The baseline from chapter two is a different number, because it measures the metric, and you take it in week one.",
        },
        {
          kind: "p",
          text: "Harbour's finance director says an invoice takes about six minutes. In chapter one that was an estimate to be measured. Ask two clerks to log start and finish times for 200 current invoices in one week. Cover both digital and scanned invoices. Take the error count from the finance team's correction log, not from memory.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "The Harbour cost baseline. Volume, times and rates are illustrative. The clerk rate of 28 pounds an hour is a **loaded cost**, the full hourly cost of a person, including tax and overhead.",
          code: "Volume:        4,000 invoices a month\nHandling:      4,000 x 6 minutes = 24,000 minutes = 400 hours\n               400 hours x 28 pounds = 11,200 pounds\nRework:        3 percent = 120 invoices x 15 minutes = 30 hours\n               30 hours x 28 pounds = 840 pounds\nBaseline:      12,040 pounds a month",
        },
        {
          kind: "p",
          text: "With 200 invoices, one extra error shifts the rate by half a point. Six errors gives 3 percent. It is rough, but the finance team can recount it.",
        },
        {
          kind: "p",
          text: "Hours and errors are the two columns that matter. Count delay only if you can name the fee. Leave out any figure you cannot trace to a log, an invoice or a timesheet.",
        },
        {
          kind: "p",
          text: "Run this time log before the statement of work, because the price rests on it. It covers 200 current invoices, separate from the charter's 200 from last quarter. One week of two clerks is a rough check, so six minutes stays an estimate. Next you need the other number, which is what the system costs to run.",
        },
        {
          kind: "quiz",
          id: "fde-craft07-q1",
          question: "The finance director says invoices take about six minutes. What do you do?",
          options: [
            "Use six minutes, because the customer knows their own process.",
            "Time 200 real invoices across both formats, and take errors from the correction log.",
            "Use an industry average from a vendor report.",
            "Skip the baseline and report the model's accuracy.",
          ],
          answer: 1,
          explain: "A stated figure is a starting guess. A timed sample from the customer's own work is the only baseline that survives a sceptical finance team.",
        },
      ],
    },
    {
      id: "s2-system-cost",
      title: "Review labour is the largest run cost line, and tokens are the smallest",
      goal: "What does the system cost to run each month?",
      blocks: [
        {
          kind: "p",
          text: "The **run cost** is what the system costs to operate each month. It has five lines: tokens, infrastructure, review labour, maintenance and the rework that still happens. Tokens are the units of text a model reads and writes, from course 1. Most people price only tokens, so payback comes out too short.",
        },
        {
          kind: "p",
          text: "One input drives the biggest line. The **review share** is the share of invoices a person still checks. Harbour assumes 30 percent, at 3 minutes each. Both are estimates until the pilot measures them.",
        },
        // CHECKED 17 Oct 2026: https://platform.claude.com/docs/en/about-claude/pricing (Sonnet 5.5 lists $2 and $10 per million tokens, about 1.60 and 8.00 pounds; Sonnet 4.6 lists $3 and $15, about 2.40 and 12.00 pounds. Kept as illustrative round figures in a plausible mid-tier range. The 70 pound engineer rate is an assumption, not a vendor fact.)
        {
          kind: "code",
          lang: "text",
          caption: "Monthly run cost for Harbour. Token prices and the engineer rate are assumptions, so replace them with current figures.",
          code: "Tokens:         3,000 in + 500 out per invoice\n                at 2.40 and 12.00 pounds per million tokens\n                = 0.0132 pounds x 4,000 = 53 pounds\nInfrastructure: hosting and storage = 400 pounds\nReview labour:  30 percent = 1,200 invoices x 3 minutes = 60 hours\n                60 hours x 28 pounds = 1,680 pounds\nMaintenance:    8 engineer hours x 70 pounds = 560 pounds\nResidual rework: 1 percent = 40 invoices x 15 minutes = 10 hours\n                10 hours x 28 pounds = 280 pounds\nRun cost:       2,973 pounds a month",
        },
        {
          kind: "p",
          text: "Read the shares. Review labour is 57 percent of the run cost. Maintenance is 19 percent, infrastructure 13 percent and residual rework 9 percent. Tokens are under 2 percent. The model bill is the line everyone argues about, and it hardly matters.",
        },
        {
          kind: "callout",
          tone: "insight",
          title: "Cut the review share before the token bill",
          text: "Cutting the review share by 10 points saves 400 reviews of 3 minutes. That is 20 hours, or 560 pounds a month. It is ten times the token bill. Better extraction pays more than a cheaper model.",
        },
        {
          kind: "p",
          text: "Retries and long documents push the token line up, so measure real usage in the pilot. Course 5 covers cost per successful task. Even doubled, tokens stay the smallest line. Next, set the saving against the price.",
        },
        {
          kind: "quiz",
          id: "fde-craft07-q2",
          question: "In the Harbour run cost, which change saves the most money each month?",
          options: [
            "Halving the token price.",
            "Cutting the review share from 30 percent to 20 percent.",
            "Cutting hosting by 10 percent.",
            "Using a model with a larger context window.",
          ],
          answer: 1,
          explain: "Halving tokens saves about 26 pounds. Ten points of review share saves 560 pounds. Review labour is the largest line.",
        },
      ],
    },
    {
      id: "s3-payback",
      title: "Payback is the number a finance director will test, so show the working",
      goal: "How long until the saving covers the build fee?",
      blocks: [
        {
          kind: "p",
          text: "**Payback** is the build cost divided by the monthly saving, in months. The saving is the cost baseline minus the run cost. For Harbour, that is 12,040 minus 2,973, which is 9,067 pounds a month.",
        },
        {
          kind: "p",
          text: "The **build fee** is what the supplier charges for the build. Harbour's is 48,000 pounds, and the next section shows where it comes from. Assume the build covers all invoices and writes to the ledger. That is wider than the pilot in chapter two.",
        },
        {
          kind: "p",
          text: "Divide 48,000 by 9,067 and payback is 5.3 months. Now stress the least certain input. If the review share rises to 45 percent, the saving falls to 8,227 pounds and payback is 5.8 months. The case survives.",
        },
        {
          kind: "p",
          text: "Volume is the input that breaks cases. At 1,500 invoices a month the same system saves only 2,800 pounds, so payback is over 17 months. The fixed costs of 960 pounds a month do not shrink with volume.",
        },
        {
          kind: "p",
          text: "That gives the **break-even volume**, the monthly volume where payback meets your target. Each invoice saves 3.01 pounds of clerk time and costs about 0.50 pounds to run, so it nets about 2.51 pounds. A six-month payback needs 8,000 pounds a month, plus the fixed 960. That is 8,960 divided by 2.51, about 3,600 invoices.",
        },
        {
          kind: "widget",
          id: "fde-craft-roi-calc",
          intro: "Three Harbour entities, each quoted the same build fee. Work out payback from the saving, then apply the finance director's rule shown in the widget. Watch which input changes the answer.",
        },
        {
          kind: "p",
          text: "Put all of it on one page. A **one-page case** is six short blocks with no appendix. Here is Harbour's, with the numbers from this chapter.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "Harbour's one-page case. Each heading is one short block.",
          code: "1. Problem:   Invoice handling costs 12,040 pounds a month. This is the cost\n              baseline, timed on 200 invoices and recounted from the correction log.\n2. Proposal:  One workflow, invoice intake from born-digital PDFs, with a person\n              checking the doubtful ones. One metric, measured in week one.\n3. Cost:      Build fee 48,000 pounds. Run cost 2,973 pounds a month at an\n              assumed review share of 30 percent. Review labour is the largest line.\n4. Payback:   5.3 months. 5.8 months if the review share rises to 45 percent.\n              Break-even volume is about 3,600 invoices a month.\n5. Risks:     Review share above 30 percent: the pilot measures it.\n              Data access after day five: the schedule slips with it.\n6. Decision:  The finance director signs the statement of work before work starts.",
        },
        {
          kind: "p",
          text: "Read the page aloud and four things stand out. The problem is a measured figure. The cost has two parts, a fee and a monthly run cost. Payback comes with its worst case and the volume that breaks it. The last line names who decides.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next customer. Fill each field from a log, an invoice or a timesheet.",
          code: "1. Problem:   ___  (the cost baseline, with how you measured it)\n2. Proposal:  ___  (one workflow, one metric)\n3. Cost:      Build fee ___. Run cost ___ a month.\n4. Payback:   ___ months. Worst case ___ months. Break-even volume ___.\n5. Risks:     ___  (two, each with its check)\n6. Decision:  ___  (who signs, and what)",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "How an interviewer presses on the business case",
          text: "Interviews often ask: how would you justify this project to a finance director? A strong answer names a measured cost baseline, itemises the run cost, gives payback with a worst case, and says what would make you stop. A weak answer says the model will save time.",
        },
        {
          kind: "quiz",
          id: "fde-craft07-q3",
          question: "A build costs 48,000 pounds and saves 6,000 pounds a month. What is the payback?",
          options: ["4 months", "6 months", "8 months", "12 months"],
          answer: 2,
          explain: "48,000 divided by 6,000 is 8. Always divide the cost by the monthly saving, then check it against the worst case.",
        },
        {
          kind: "p",
          text: "The case says the build is worth paying for. Next you turn the price into a contract.",
        },
      ],
    },
    {
      id: "s4-pricing",
      title: "A fixed fee suits a clear scope, and the statement of work protects both sides",
      goal: "How do you price the build, and what do you write down?",
      blocks: [
        {
          kind: "p",
          text: "Pricing is a choice about who carries risk. Under a **fixed fee**, the supplier does. Under **time and materials**, where the customer pays for the days worked, the customer does. Pick the one that matches how well the scope is known.",
        },
        {
          kind: "p",
          text: "Harbour's build is chapter three's sixteen weeks at five days a week. That is 80 engineer days at 500 pounds a day, or 40,000 pounds. Add 20 percent for risk and the build fee is 48,000 pounds. A 25 percent overrun is 20 days, or 10,000 pounds. Under a fixed fee, the supplier absorbs it.",
        },
        {
          kind: "compare",
          caption: "Two ways to price the same Harbour build.",
          columns: ["", "Fixed fee", "Time and materials"],
          rows: [
            ["Who carries overrun", "The supplier", "The customer"],
            ["Fits when", "Scope and exit criteria are written down", "The scope will change as you learn"],
            ["Typical failure", "Disputes over what was in scope", "Cost drifts with no end date"],
            ["Harbour build", "48,000 pounds, written scope, exit criteria", "500 pounds a day, capped at 80 days"],
          ],
        },
        {
          kind: "p",
          text: "A **statement of work** is the short contract document that turns the price into commitments. Without it, a fixed fee invites arguments about scope. Write it before work starts and keep it to two pages. Tie payment to milestones, not dates.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "Harbour's statement of work. Ten fields, each one short.",
          code: "Statement of work: Harbour Intake\nScope          Read born-digital PDF invoices. Send doubtful ones to a review\n               page. Post approved invoices to the ledger.\nOut of scope   Scans. Credit notes. The chatbot.\nDeliverables   One per milestone, each with its demo.\nExit criteria  Go at baseline plus 20 points, with zero wrong amounts approved.\nAssumptions    Data access by day five. Two named reviewers. Security review\n               clears in three weeks.\nPrice          48,000 pounds, fixed.\nPayment        30 percent at signing (14,400 pounds). 40 percent when the\n               baseline and the eval set are accepted (19,200 pounds). 30 percent\n               when the exit criteria are met (14,400 pounds).\nChange         Anything outside this scope gets a written change with its own price.\nFirst cut      Posting, from the twelve-week date, agreed by the finance director.\nHandover       Harbour's two-person IT team runs it after week 16.",
        },
        {
          kind: "p",
          text: "Read the key points aloud. The scope names what is out as well as what is in. The exit criteria are a go line and a hard zero on wrong amounts. Payment follows the baseline, the eval set and the exit criteria. A change gets its own price. The first cut says what goes if time runs short.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next customer. Keep every field, and leave none blank.",
          code: "Statement of work: ___\nScope          ___  (what is built, in one sentence)\nOut of scope   ___  (name what they might assume)\nDeliverables   ___  (one per milestone, each with a demo)\nExit criteria  ___  (the metric, the line, any hard zero)\nAssumptions    ___  (data access date, named people, approvals)\nPrice          ___  (fixed or time and materials, with any cap)\nPayment        ___  (tied to milestones, not dates)\nChange         ___\nFirst cut      ___  (what goes first if time runs short)\nHandover       ___  (who runs it afterwards)",
        },
        {
          kind: "quiz",
          id: "fde-craft07-q4",
          question: "Which build suits a fixed fee?",
          options: [
            "One invoice workflow with a written metric and exit criteria.",
            "An exploratory build where the goal will be decided in week three.",
            "A build with no named data source.",
            "A build where the customer will add features weekly.",
          ],
          answer: 0,
          explain: "A fixed fee works when scope and acceptance are written down. Where the scope is still moving, time and materials with a cap is safer for both sides.",
        },
        {
          kind: "p",
          text: "The price is agreed and the contract is signed. Now the real work starts. What do you do in the first week on site?",
        },
      ],
    },
  ],
  recap: [
    "Measure the cost baseline from a timed sample and a correction log, not from a stated figure.",
    "Run cost has five lines. Review labour is the largest at Harbour, and tokens are the smallest.",
    "Payback is the build cost divided by the monthly saving, tested on its least certain input.",
    "Use a fixed fee when scope and exit criteria are written down, and put both in the statement of work.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In the business case I learned that a case rests on a measured cost baseline, an itemised run cost and a payback tested on its worst input. A statement of work then turns the price into scope, exit criteria and payment. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["fde-craft-q13"],
};

export default chapter;
