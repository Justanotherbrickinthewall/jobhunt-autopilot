import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "fde-craft-pilot-and-demo",
  course: "fde-craft",
  number: 11,
  title: "The pilot: evaluation, demo and decision",
  tagline: "Does it work on Harbour's invoices, and who decides? A measured report answers the first question, and the sponsor answers the second.",
  minutes: 20,
  objectives: [
    "Build an eval set with a held-back set, and separate field accuracy from invoice accuracy.",
    "Plan a demo on the customer's own invoices, with synthetic ones labelled as synthetic.",
    "Show a planned failure and the check that catches it.",
    "Write an evaluation report, and read a result against the go, extend and stop lines.",
    "Put a decision, its conditions and its limits in front of the sponsor.",
  ],
  sections: [
    {
      id: "s3-eval-set",
      title: "The eval set is the most valuable thing you leave behind",
      goal: "How do you build a set of labelled invoices that can settle an argument about accuracy?",
      blocks: [
        {
          kind: "p",
          text: "Chapter ten left a reviewed change, so a system now exists. Does it work on Harbour's invoices, and who decides? The answer starts with the eval set, the labelled invoices every run is scored against.",
        },
        {
          kind: "p",
          text: "Harbour's eval set is 200 invoices from last quarter. Each has nine header fields, which gives 1,800 values to label. Of the 200, 160 are for tuning. The other 40 are the **held-back set**, which nobody tunes on.",
        },
        {
          kind: "p",
          text: "Two numbers describe a run, and they differ. **Field accuracy** is the share of the 1,800 values that are right. **Invoice accuracy** is the share of invoices with every field right. One wrong field fails the whole invoice, and the pilot metric is invoice accuracy.",
        },
        {
          kind: "p",
          text: "The `overall` line in `threshold.json` is field-level. It is separate from the pilot metric, which is invoice-level and has its own lines of 94 and 84.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "The eval set layout as handed over. The overall line is field-level, and every threshold is illustrative until the customer agrees it.",
          code: "evals/\n  cases/           one JSON file per labelled invoice, with its source file name\n  labels.md        labelling rules, with dated changes\n  run.sh           one command that scores the whole set\n  report.md        scores per field and per supplier, written by run.sh\n  threshold.json   {\"overall\": 0.95, \"date\": 0.90, \"total\": 0.99, \"wrong_amount_approved\": 0}",
        },
        {
          kind: "p",
          text: "With 1,800 values, 95 percent overall allows 90 misses. A total at 99 percent allows 2. Agree the lines before the first run.",
        },
        {
          kind: "p",
          text: "Write down a **labelling rule** wherever a document is ambiguous. It is the written decision on which value counts when an invoice shows two. Two reviewers then label it the same way.",
        },
        {
          kind: "quiz",
          id: "fde-craft03-q3",
          question: "Why does an eval set matter more than the code after handover?",
          options: [
            "It is shorter.",
            "It lets the new owners test any change to the code, the prompt or the model against known answers.",
            "Customers prefer spreadsheets.",
            "It replaces the need for monitoring.",
          ],
          answer: 1,
          explain: "Code changes, so the team needs a stable way to judge changes. The labelled set provides it.",
        },
        {
          kind: "p",
          text: "With a set that can measure, the next job is to show the sponsor the system on Harbour's own invoices.",
        },
      ],
    },
    {
      id: "s3-demo-own-data",
      title: "A demo on the customer's own data beats a polished one on yours",
      goal: "How do you plan a demo that a sceptic can believe?",
      blocks: [
        {
          kind: "p",
          text: "Chapter three set aside a demo set of fifty real invoices. The sponsor is the finance director, the person who decides whether Harbour pays for the next stage.",
        },
        {
          kind: "p",
          text: "A demo on your own data proves only that the demo works. So, beside the fifty, ask for ten fresh documents a week before, including a scan, a credit note and the one the team hates. Keep the awkward ones in the demo.",
        },
        {
          kind: "p",
          text: "Harbour's scope excludes scans and credit notes. So the demo shows both going to the review queue, which is the right result.",
        },
        {
          kind: "list",
          items: [
            "Get the documents under the customer's data rules.",
            "Run them all before the meeting, so you know what you will see.",
            "Prepare what you will say if the live run differs from the rehearsal.",
          ],
        },
        {
          kind: "p",
          text: "If the customer cannot share documents, use synthetic invoices and label them on screen.",
        },
        {
          kind: "quiz",
          id: "fde-craft02-q3",
          question: "The customer cannot share real invoices before the demo. What is the honest option?",
          options: [
            "Use synthetic invoices and label them as synthetic.",
            "Use your cleanest real samples from another customer.",
            "Cancel the demo.",
            "Show only the architecture slide.",
          ],
          answer: 0,
          explain: "Another customer's invoices break confidentiality. A clearly labelled synthetic set keeps the demo honest.",
        },
        {
          kind: "p",
          text: "Real documents will include cases the system gets wrong. Those can be your best evidence.",
        },
      ],
    },
    {
      id: "s4-show-failures",
      title: "Show a failure and the check that catches it, because that proves safety",
      goal: "How do you use errors in the demo as the evidence that the system is safe?",
      blocks: [
        {
          kind: "p",
          text: "A sponsor expects you to hide mistakes. Show an error and then the check that catches it, and you have given them your strongest evidence.",
        },
        {
          kind: "p",
          text: "Plan one failure on purpose. Pick an invoice whose total does not add up. Show the sum check catching it, and the invoice landing in the review queue with the reason attached. Say what share you expect to send there, and that you will measure it.",
        },
        {
          kind: "p",
          text: "If an unplanned failure happens live, say what happened. Show how the system caught it, or admit that it did not. Then note it for the pilot. Never skip it, because the sponsor saw it.",
        },
        {
          kind: "widget",
          id: "fde-craft-demo-honesty",
          intro: "Four moments in a demo to a sceptical sponsor. Each choice changes their trust. Predict which ones help before you click.",
        },
        {
          kind: "p",
          text: "Demos come up in interviews too, usually as a system that sometimes gets things wrong.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "How an interviewer tests demos",
          text: "They ask: how do you demo a system that sometimes gets things wrong? A strong answer shows real data, plans a visible failure, shows the review queue and says plainly that accuracy is not yet measured on their documents. A weak answer promises it rarely fails.",
        },
        {
          kind: "quiz",
          id: "fde-craft02-q4",
          question: "The sponsor asks for an accuracy figure and you have none on their data. What do you say?",
          options: [
            "Quote a figure from a blog post.",
            "Say it is very accurate.",
            "Say you do not have a figure yet, and that the first week of the pilot produces one on their documents.",
            "Change the subject.",
          ],
          answer: 2,
          explain: "An honest gap with a plan to close it builds trust. A borrowed figure becomes your promise.",
        },
        {
          kind: "quiz",
          id: "fde-craft02-q5",
          question: "What makes a planned failure in a demo valuable?",
          options: [
            "It lowers the sponsor's expectations.",
            "It shows the checks and the review queue working on a real case.",
            "It fills time.",
            "It tests the sponsor's patience.",
          ],
          answer: 1,
          explain: "The point is evidence about controls. A failure with a visible catch shows that errors do not reach the ledger silently.",
        },
        {
          kind: "p",
          text: "A demo persuades, but a report decides. So what did the pilot actually measure?",
        },
      ],
    },
    {
      id: "pilot-results",
      title: "Run 1 missed the line by five points, and one supplier explained it",
      goal: "How do you report a pilot result so the sponsor can act on it?",
      blocks: [
        {
          kind: "p",
          text: "An evaluation report answers one question: did the run clear the line the sponsor set? It states the set, the baseline, each run, the wrong fields, the cause, the fix and the limits. It fits on one page.",
        },
        {
          kind: "p",
          text: "Harbour's baseline is 74 percent right first time, measured from the PDFs in week one. Run 1 in week six scored 89 percent. That sits between the stop line of 84 and the go line of 94, so the decision is extend.",
        },
        {
          kind: "p",
          text: "Of 34 wrong fields, 12 were invoice dates. One supplier prints both a tax point and an invoice date, and the model read the wrong one. The fix was one labelling rule and one prompt change.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "Harbour's evaluation report for week eight, whole.",
          code: `Evaluation report: Harbour Intake, week 8
Eval set         200 invoices, 9 header fields, 1,800 values. 160 used for tuning,
                 40 held back.
Baseline         74.0 percent right first time (148 of 200)
Run 1, week 6    89.0 percent (178 of 200), up 15 points. Extend.
Wrong fields     34: supplier 2, number 1, invoice date 12, due date 9, PO 7,
                 net 1, VAT 1, total 1, currency 0.
Field accuracy   98.1 percent across all fields. Invoice date 0.94. Total 0.995.
Cause            One supplier prints both a tax point and an invoice date.
Fix              One labelling rule and one prompt change.
Run 2, week 8    95.5 percent (191 of 200), up 21.5 points. Go.
Held back 40     36 of 40 in run 1, 38 of 40 in run 2.
Wrong amounts    0 approved in both runs. The sum check caught the wrong total.
Review share     34 percent, at 3 minutes a review.
Limits           Two suppliers. Other formats are still untested.`,
        },
        {
          kind: "p",
          text: "Run 2 scored 95.5 percent against a go line of 94, and no wrong amount was approved in either run. Nobody tuned on the held-back forty, and they scored 95 percent in run 2. Field accuracy of 98.1 percent is invoice accuracy of 89 in run 1, because 34 wrong fields failed 22 invoices.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next customer: the evaluation report template. Fill every field from your own set.",
          code: `Evaluation report: <engagement>, week <n>
Eval set         <invoices, fields, values; how many tuned, how many held back>
Baseline         <percent right first time, count, how it was measured>
Run 1, week <n>  <percent, count, change in points. Go, extend or stop>
Wrong fields     <total, then the count for each field>
Field accuracy   <percent across all fields; the weakest field>
Cause            <what the wrong fields have in common>
Fix              <what changed, and who changed it>
Run 2, week <n>  <percent, count, change in points. Go, extend or stop>
Held back        <correct out of the held-back set, in each run>
Wrong amounts    <approved in each run>
Review share     <percent, minutes a review>
Limits           <what the sample does not cover>`,
        },
        {
          kind: "quiz",
          id: "fde-craft-pilot-q1",
          question: "Run 1 scores 89 percent against a go line of 94 and a stop line of 84. What is the decision?",
          options: [
            "Go, because it is well above the baseline.",
            "Extend: find the cause of the wrong fields, fix it and run again.",
            "Stop, because it missed the go line.",
            "Lower the go line to 89 so the pilot passes.",
          ],
          answer: 1,
          explain: "A result between the stop line and the go line means extend. Moving a line after seeing the result would make the lines worthless.",
        },
        {
          kind: "quiz",
          id: "fde-craft-pilot-q2",
          question: "Why is 98.1 percent of fields only 89 percent of invoices?",
          options: [
            "One wrong field fails the whole invoice, so 34 wrong fields can fail 22 invoices.",
            "The held-back set is harder than the tuning set.",
            "Invoice date counts double.",
            "Invoice accuracy includes the review share.",
          ],
          answer: 0,
          explain: "Invoice accuracy needs all nine fields right. Wrong fields cluster on a few invoices, but each of those invoices still fails.",
        },
        {
          kind: "p",
          text: "The result is now clear. Who reads it, and what do they decide?",
        },
      ],
    },
    {
      id: "pilot-decision",
      title: "The finance director says go at 95.5 percent, on a two-supplier sample",
      goal: "Who decides at the end of the pilot, and on what conditions?",
      blocks: [
        {
          kind: "p",
          text: "The engineer presents the evidence, and the sponsor decides. At Harbour that is the finance director. Write the decision down in the same meeting, with its conditions.",
        },
        {
          kind: "p",
          text: "The measured numbers also update the case from chapter four. A review share of 34 percent is 1,360 reviews, which is 68 hours and 1,904 pounds. The run cost becomes 3,197 pounds and the saving 8,843 pounds. Payback becomes 5.4 months.",
        },
        {
          kind: "p",
          text: "It is a two-supplier sample, and the case says so. Run 2 beat the go line, so the finance director said go, with conditions.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "Harbour's decision record for week eight, whole.",
          code: `Decision: Harbour Intake pilot, week 8
Decider     Finance director
Outcome     Go.
Evidence    95.5 percent against a line of 94. Zero wrong amounts approved.
Conditions  Tideway Packaging goes first. A person posts until the release window.
            One wrong amount approved stops it.
Limits      Two suppliers. The payback of 5.4 months is an estimate on that sample.`,
        },
        {
          kind: "p",
          text: "The outcome is go, on 95.5 percent against a line of 94 and zero wrong amounts approved. The conditions put Tideway Packaging first and keep a person posting until the release window. One wrong amount approved stops it. The limits are two suppliers and an estimated payback.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next customer: the decision record template.",
          code: `Decision: <engagement>, week <n>
Decider     <the role that owns the money and the risk>
Outcome     <Go, extend or stop>
Evidence    <the result against its line, and the amounts rule>
Conditions  <which supplier or team first; who does the risky step; what stops it>
Limits      <what the sample does not cover; which numbers are estimates>`,
        },
        {
          kind: "p",
          text: "A go with conditions is still a promise to deliver. How do you take it live and leave it with Harbour? Chapter twelve takes that.",
        },
      ],
    },
  ],
  recap: [
    "Split the eval set into tuning cases and a held-back set that nobody tunes on.",
    "Field accuracy and invoice accuracy are different numbers. One wrong field fails the invoice.",
    "The overall line in the threshold file is field-level, and the pilot metric is invoice-level.",
    "Demo on the customer's own invoices, show a planned failure, and say what you have not measured.",
    "A result between the stop line and the go line means extend, and a fix needs a labelling rule.",
    "The sponsor decides, and the decision record carries conditions and limits.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In the pilot I learned to score runs on an eval set with a held-back set, and to keep field accuracy apart from invoice accuracy. A demo on the customer's own data with a planned failure earns trust. The sponsor decides from a one-page report, and the decision names its conditions and limits. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["fde-craft-q04", "fde-craft-q25"],
};

export default chapter;
