import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "design-07-defending-the-design",
  course: "design",
  number: 7,
  title: "Follow-ups change one fact, and your ledger already holds the answer",
  tagline: "What happens when the interviewer changes one fact? Say what changes, what stays and what you would measure, with a number from the design.",
  minutes: 50,
  objectives: [
    "Name the five follow-ups an interviewer uses and tie each one to the design it attacks.",
    "Answer a follow-up in one minute by saying what changes, what stays and what you would measure.",
    "Predict which part of each of the five Harbour Supplies designs breaks first under load.",
    "Choose three alerts per design that would tell you a follow-up has already happened.",
    "Write a trade-off ledger that records what each decision gave up and when to revisit it.",
    "Prepare a defence card with one worked one-minute answer per follow-up.",
  ],
  sections: [
    {
      id: "s1-ladder",
      title: "Every follow-up changes one fact, and each one attacks a different design",
      goal: "Which five follow-ups come up, and which design does each one attack?",
      blocks: [
        {
          kind: "p",
          text: "Chapters two to six drew five systems for Harbour Supplies. An interviewer who has seen your drawing now changes one fact and watches what you do. The change is small to say and large to absorb. Your answer shows whether you built the design or memorised it.",
        },
        {
          kind: "p",
          text: "Five follow-ups cover most rounds: ten times the load, half the cost, a second tenant, a new residency rule and a model deprecation. Two more questions ride along with every one of them. What breaks first? How would you know? This chapter drills all seven.",
        },
        {
          kind: "compare",
          caption: "Each follow-up has a natural target among the five designs. Pairing them keeps your answers concrete.",
          columns: ["Follow-up", "Aimed at", "The fact that changes", "Your first question back"],
          rows: [
            ["Ten times the load", "Chapter two, intake", "50,000 documents a day becomes 500,000", "Is the peak ten times too, or only the average?"],
            ["Half the cost", "Chapter six, the batch job", "The budget for a million records halves", "Is quality allowed to move, and by how much?"],
            ["A second tenant", "Chapter four, the copilot", "A company outside the Harbour group shares the system", "May their documents ever appear in the first tenant's answers?"],
            ["A new residency rule", "Chapter five, text to SQL", "Rows may not leave one region", "Does the rule cover the prompt, or only the stored data?"],
            ["A model deprecation", "Chapter three, the agent", "The model is retired in 90 days", "What do my trajectory evals say about the replacement?"],
          ],
        },
        {
          kind: "p",
          text: "The pairing is a teaching choice. Any follow-up can land on any design. Practising each one against the design where it hurts most gives you five worked answers you can adapt on the day.",
        },
        {
          kind: "quiz",
          id: "design07-q1",
          question: "An interviewer says your text-to-SQL design must now keep all rows in one region. What is the best first reply?",
          options: [
            "Switch to a different database vendor.",
            "Ask whether the rule covers the prompt sent to the model, or only the stored data.",
            "Say it cannot be done with a hosted model.",
            "Offer to cache every answer.",
          ],
          answer: 1,
          explain: "Result rows go into the prompt, so the answer decides whether the model endpoint must move. One question changes the design far more than any vendor swap.",
        },
        { kind: "p", text: "You know the five follow-ups. The next section gives you the shape of the answer." },
      ],
    },
    {
      id: "s2-minute",
      title: "A one-minute answer says what changes, what stays and what you would measure",
      goal: "What shape does a one-minute answer take?",
      blocks: [
        {
          kind: "p",
          text: "Chapter one gave a three-beat answer: the part that breaks first, the change, the cost. Here is the same idea as a minute of speech. Say what changes. Say what stays the same, which is the part most candidates forget. Then say what you would measure to prove the change worked.",
        },
        {
          kind: "p",
          text: "Take ten times the load on intake. Chapter two sizes the pool from the deadline rather than the peak. With 25 percent headroom, intake needs 5,357 documents an hour, which is 1.49 a second. At ten times it is 14.9 a second.",
        },
        {
          kind: "p",
          text: "Workers first. Assume 6 seconds a document. Today 1.49 documents a second needs 9 workers, and at ten times it needs 90. That is a scaling setting, and it changes in minutes.",
        },
        {
          kind: "p",
          text: "Now the Document AI quota. Assume it is set to 15 requests a second, as in chapter two. Today's 1.49 a second leaves ten times the headroom. At ten times it is 14.9, which leaves no headroom, so ask for about twice the quota.",
        },
        {
          kind: "p",
          text: "A quota rise takes a support ticket and some days. Now the humans. Assume 5 percent of documents go to review and a reviewer clears 150 a day at three minutes each. Today that is 2,500 reviews and 17 reviewers. At ten times it is 25,000 reviews and 167 reviewers. Hiring takes months, so review breaks first.",
        },
        {
          kind: "p",
          text: "What changes: workers, quota and the review rate. What stays: the queue design, the idempotent ledger write and the validation rules. What you measure: review queue age, with an alert at half a working day. The lever is the review rate. Halving it to 2.5 percent cuts the need to about 84 reviewers.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "The interviewer says ten times the load and half the cost. How do you answer?",
          text: "Open with the answer: say which part breaks first and give a number. For load, it is the review queue at 167 reviewers, not the model. For cost, say which levers you pull and be honest about the gap. Interviewers push on what you would measure, and whether you would accept lower quality to hit the cost.",
        },
        {
          kind: "quiz",
          id: "design07-q2",
          question: "In the ten-times worked example, why does review break before the workers or the quota?",
          options: [
            "Reviewers are paid more than engineers.",
            "Workers and quota scale in minutes or days, while 167 trained reviewers take months.",
            "The model is slower at ten times the load.",
            "The queue loses documents above 500,000 a day.",
          ],
          answer: 1,
          explain: "The part that takes longest to scale is the part that breaks first. Compute is a setting, quota is a ticket, and people are a hiring plan.",
        },
        {
          kind: "p",
          text: "Cost follows the same shape. Take the batch job from chapter six, a million records. Assume 900 input tokens and 150 output tokens a record, at 3 pounds per million in and 15 per million out. Live, that is 2,700 plus 2,250, so 4,950 pounds. Batch at half price is 2,475.",
        },
        {
          kind: "p",
          text: "Half of that again is 1,237.50, which is the target. Trim the prompt and schema from 200 tokens to 100. That removes 100 million tokens, worth 300 pounds live and 150 on batch. The total falls to 2,325.",
        },
        {
          kind: "p",
          text: "Send the easy 40 percent to a model at a quarter of the price: that saves 697.50 more, giving 1,627.50. You are still 390 pounds short.",
        },
        {
          kind: "p",
          text: "Say so. A candidate who admits a 390 pound gap sounds like an engineer. The next lever might be a smaller QA sample or a cheaper model on the hard class. A claim with no arithmetic behind it sounds like a sales pitch.",
        },
        {
          kind: "quiz",
          id: "design07-q3",
          question: "After batch pricing and a shorter prompt the million-record job costs 2,325 pounds against a 1,237.50 target. What should you say?",
          options: [
            "That the target is met.",
            "That the target needs a third lever, and name it with its quality cost.",
            "That the interviewer's number is wrong.",
            "That you would drop the QA sample entirely.",
          ],
          answer: 1,
          explain: "The gap is 1,087.50 pounds. Name the next lever, such as a cheaper model for the easy class, and say what it does to quality.",
        },
        { kind: "p", text: "Every answer starts by naming what breaks first. So what does break first, in each design?" },
      ],
    },
    {
      id: "s3-breaks-first",
      title: "At ten times the load, people, quotas and queues break before the models do",
      goal: "What breaks first in each design at ten times the load?",
      blocks: [
        {
          kind: "p",
          text: "Models are the part of an LLM system that scales most easily. You call a bigger endpoint or a second region. What does not scale on request is a human, a rate limit, a downstream system or a permission sync. Look for those first.",
        },
        {
          kind: "compare",
          caption: "The first thing to break at ten times the load is rarely the model. It is the part with a human, a quota or a lag in it.",
          columns: ["Design", "Breaks first", "Why", "First sign"],
          rows: [
            ["Intake", "The review queue", "Reviewers scale with the review rate, and hiring takes months", "Queue age passes half a working day"],
            ["Agent", "The approval queue", "Approvers are fixed in number and approvals time out", "Approvals expire unread"],
            ["Copilot", "Change sync against source throttling", "Graph and ServiceNow limit requests, so the index falls behind", "Staleness passes its budget"],
            ["Text to SQL", "Warehouse scans", "More users mean more wide queries on shared compute", "Queries hit the time-out"],
            ["Batch job", "The schema check", "Longer runs meet input drift, and bad records pile up", "Dead letters grow past one percent"],
          ],
        },
        {
          kind: "p",
          text: "Each row gives you a one-line answer to what breaks first, and each has a fix. Let more documents skip review, in classes with proven precision. Add a second approver tier. Widen the staleness budget for low-risk sources. Cap scan size. Tighten the schema contract.",
        },
        {
          kind: "widget",
          id: "design-followup-drill",
          intro: "Choose one of the five Harbour Supplies designs and answer three timed follow-ups against it. For each, pick the one-minute answer that says what changes, what stays and what you would measure. Watch for answers that sound confident but name no number.",
        },
        {
          kind: "p",
          text: "Say the ordering out loud when you answer. The slowest thing to scale breaks first, and the cheapest thing to scale breaks last. That one sentence shows the interviewer a rule behind your answer, and a rule transfers to a design you have never seen.",
        },
        {
          kind: "p",
          text: "Rank the Harbour Supplies parts by time to scale. Compute takes minutes. A provider quota takes days. A source system's rate limit may never rise. A reviewer or approver takes months. Put the last two at the top of your list of what breaks first.",
        },
        {
          kind: "quiz",
          id: "design07-q4",
          question: "At ten times the load, which design is most likely to fail first because of a source system's rate limit?",
          options: [
            "Intake, because the classifier is slow.",
            "The copilot, because change sync against Graph and ServiceNow is throttled.",
            "The batch job, because the batch window is too short.",
            "The agent, because it has too many tools.",
          ],
          answer: 1,
          explain: "The copilot depends on how fast it can pull changes from systems it does not own. Throttling lets the index drift from the source.",
        },
        { kind: "p", text: "You can now predict the failure. The next question is how you would see it coming." },
      ],
    },
    {
      id: "s4-know",
      title: "Three alerts per design tell you the follow-up has already happened",
      goal: "How would you know, before the customer does?",
      blocks: [
        {
          kind: "p",
          text: "The last question is always: how would you know? A weak answer is dashboards. A strong answer names three signals per design, each with a threshold and an action. Keep one signal on load, one on quality and one on the failure mode that worries you most.",
        },
        {
          kind: "compare",
          caption: "Three alerts per design. The thresholds are illustrative and you would set them from a measured baseline.",
          columns: ["Design", "Load or lag", "Quality", "Failure mode"],
          rows: [
            ["Intake", "Review queue age over half a working day", "Field precision on the daily sample below 98 percent", "A document retried more than 3 times"],
            ["Agent", "Approvals expired unread above 5 percent a day", "Attack success rate above 0 on the weekly injection suite", "Any write call with no matching approval id"],
            ["Copilot", "Oldest unsynced item beyond its source's budget, such as 30 minutes for SharePoint", "95th percentile tokens per query over twice the baseline", "Any answer citing a source the asker cannot open"],
            ["Text to SQL", "Queries past the 10-second time-out above 2 percent", "Execution accuracy on the question set below 80 percent", "Validator rejections above 10 percent in an hour"],
            ["Batch job", "Chunks behind the plan by more than one hour", "Sampled error rate above the agreed ceiling", "Dead letters above 1 percent, or any duplicate write after a restart"],
          ],
        },
        {
          kind: "p",
          text: "Notice the third column. Some alerts have a threshold of zero. A write with no approval id, or an answer that cites a document the asker cannot open, is not a rate. It is a defect, and one occurrence pages someone.",
        },
        {
          kind: "p",
          text: "Derive each threshold from the design, not from habit. Intake gives the review queue one working day. A queue older than half a day has used half its target, so half a day is the alert. The same logic gives the copilot its source's budget, such as 30 minutes for SharePoint, and text to SQL its 10-second time-out.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "An alert without an action is a dashboard",
          text: "Write the action beside each threshold. Queue age over half a working day means letting proven classes skip review more often, or calling in reviewers. If you cannot name the action, the alert will be muted within a month.",
        },
        {
          kind: "quiz",
          id: "design07-q5",
          question: "Which alert for the agent should have a threshold of zero rather than a rate?",
          options: [
            "Approvals expiring unread.",
            "A write tool call with no matching approval id.",
            "Tokens per run above baseline.",
            "Average approval time.",
          ],
          answer: 1,
          explain: "An unapproved write means the gate was bypassed. That is a control failure, so one occurrence is an incident.",
        },
        { kind: "p", text: "Alerts watch the live system. The ledger watches your own decisions." },
      ],
    },
    {
      id: "s5-ledger",
      title: "A trade-off ledger records what each decision gave up and when to revisit it",
      goal: "How does the ledger stop a follow-up surprising you?",
      blocks: [
        {
          kind: "p",
          text: "Every decision in a design buys something and gives something up. Candidates who say only what they bought sound as if they never looked at the price. The trade-off ledger you have kept since chapter two puts the price beside each decision. It adds a trigger that tells you when to reopen it.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "The ledger as chapters two to six left it. Each row holds the decision, what it gave up and the trigger to revisit.",
          code: "Decision                          Gave up                                   Revisit when\nReview below 0.85 confidence       Reviewer hours: 2,500 a day at 5 percent   Queue age passes half a working day\nApprove every supplier email       Reply speed: held until approved           Approvals expire above 5 percent\nTrim permissions at query time     Latency: one lookup per query              95th percentile latency passes 3 seconds\nIndex per tenant                   Cost: storage and sync times tenants       Tenants pass 20\nQuery a view set, not raw tables   Coverage: unlisted questions refused       Refusals pass 15 percent\nBatch with a 24-hour window        Speed: no result before the window closes  A deadline under 24 hours",
        },
        {
          kind: "p",
          text: "The third column matters most. A trade-off is right at one scale and wrong at another. Writing the trigger turns a past decision into a plan. When the interviewer says ten times the load, you can point at the row that flips.",
        },
        {
          kind: "p",
          text: "Read the table once as an interviewer would. Review below 0.85 costs reviewer hours, so the trigger is queue age. The six rows come from five different designs, and each trigger is a number you can watch, like the alerts above. The ledger and the alerts are one system.",
        },
        {
          kind: "widget",
          id: "design-tradeoff-ledger",
          intro: "Six decisions from the five designs, and six costs they gave up. Pair each decision with the cost it actually carries. A cost fits one decision only, so a wrong pairing tells you which design you mixed up.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "What did you give up in this design, and how would you know it was starting to hurt?",
          text: "Open with the answer: name the biggest cost in one sentence with its number, then the alert that watches it. For intake, say reviewer hours, 2,500 reviews a day, watched by queue age. Interviewers push on whether you would still choose the same way at ten times the load.",
        },
        {
          kind: "quiz",
          id: "design07-q6",
          question: "Which ledger row is complete?",
          options: [
            "Trim permissions at query time. Gave up: nothing, it is safer.",
            "Batch with a 24-hour window. Gave up: speed, since nothing returns early. Revisit when a deadline falls under 24 hours.",
            "Index per tenant. Gave up: some complexity. Revisit: never.",
            "Query a view set. Gave up: coverage. Revisit: later.",
          ],
          answer: 1,
          explain: "A complete row names a real cost and a measurable trigger. The other rows claim no cost, or give a trigger nobody could check.",
        },
        { kind: "p", text: "You have the shape, the failure order, the alerts and the ledger. The last section writes one finished answer per follow-up." },
      ],
    },
    {
      id: "s6-defence-card",
      title: "Five one-minute answers fit on one card, and each one carries a number",
      goal: "What should you have ready for each follow-up?",
      blocks: [
        { kind: "p", text: "A defence card holds one rehearsed answer per follow-up. Each answer uses the same three fields, with a number taken from the design it attacks. You will not recite these on the day. Writing them proves that your designs can absorb a change." },
        { kind: "code", lang: "text", caption: "The whole defence card for the five designs.", code: "DEFENCE CARD: Harbour designs\n\nTen times the load, on intake\nChanges   Workers 9 to 90. Quota 15 to about 30 a second\n          Reviewers 17 to 167, unless the review rate falls\nStays     Queues, idempotent ledger write, validation rules\nMeasure   Review queue age, alert at half a working day\n\nHalf the cost, on the batch job\nChanges   Prompt trimmed to save 150 pounds\n          Easy 40 percent on a model a quarter of the price saves 697.50\n          Total 1,627.50 against a target of 1,237.50, so 390 pounds short\nStays     Chunks, manifest, key, stop rule\nMeasure   Error rate on the easy class in the stratified sample\n\nA second tenant, on the copilot\nChanges   One index per tenant, tenant taken from the token\nStays     Connectors, permission filter, source check\nMeasure   Cross-tenant tests, target zero leaks\n\nA new residency rule, on text to SQL\nChanges   Model endpoint, read replica and logs move into the region\nStays     Read-only role, parser, views, question set\nMeasure   Rerun execution accuracy, today 82.5 percent, in the new region\n\nA model deprecation, on the agent\nChanges   The model behind the agent, after a rerun on the replacement\nStays     Tools, tiers, approvals and the policy engine\nMeasure   Trajectory pass rate against the 94 percent baseline\n          Attack set on Tier 2 tools, target zero successes" },
        { kind: "p", text: "Read one out, and time it. A second tenant means one index per tenant, with the tenant taken from the verified token. The connectors, the permission filter and the source check stay as they are. I would prove it with cross-tenant tests, and the target is zero leaks." },
        { kind: "p", text: "That took about twenty seconds. A real answer adds your first question back and one trade-off from the ledger, and it still fits inside a minute." },
        { kind: "code", lang: "text", caption: "For your next design. Write one block for each follow-up before the round.", code: "Follow-up   ____  (the one fact that changes)\nAttacks     ____  (the part of this design it hurts most)\nAsk back    ____  (one question that narrows the change)\nChanges     ____  (each part, with a number)\nStays       ____  (the parts you would leave alone)\nMeasure     ____  (the metric, and its target)\nShort by    ____  (the gap, if the arithmetic falls short)" },
        { kind: "p", text: "So far each skill has had a chapter to itself. The round gives you one prompt and one clock. Can you do all of this, in order, inside 45 minutes?" },
      ],
    },
  ],
  recap: [
    "Five follow-ups change one fact each: ten times the load, half the cost, a second tenant, a new residency rule and a model deprecation.",
    "A one-minute answer says what changes, what stays and what you would measure.",
    "At ten times the load, the review queue at 167 reviewers breaks before the compute or the quota.",
    "Admit the gap when the arithmetic falls short, as with the 390 pounds left on the batch job.",
    "Three alerts per design, each with a threshold and an action, answer how would you know.",
    "A trade-off ledger pairs each decision with what it gave up and a trigger to revisit it.",
    "A defence card holds one rehearsed answer per follow-up, in the fields of changes, stays and measure.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In defending a design I learned that a follow-up changes one fact, and the answer is what changes, what stays and what I would measure, with a number. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["design-q13", "design-q14"],
};

// The Document AI quota of 15 requests a second is an assumption, and the CHECK in design-02 covers it. CHECKED 17 Oct 2026: https://platform.claude.com/docs/en/build-with-claude/batch-processing and https://developers.openai.com/api/docs/guides/batch (50 percent discount, 24-hour window)

export default chapter;
