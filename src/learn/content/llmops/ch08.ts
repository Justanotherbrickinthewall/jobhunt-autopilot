import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "llmops-08-first-operations-review",
  course: "llmops",
  number: 8,
  title: "The first real incident decides the first review",
  tagline: "A fix for the refusals breaks the desk. Find it, write it up, change the rule, and decide if the third team can join.",
  minutes: 60,
  objectives: [
    "Say why a change that touches no code still needs the gate.",
    "Work out when each alert rule fires on a real incident.",
    "Read a diagnosis that lists no broken objective, and say why.",
    "Finish a postmortem with the times people acted and the mistakes they made.",
    "Add a change type to a release rule, and ship it through the gate.",
    "Run an operations review that ends in one decision and written conditions.",
    "List the operations pack and what each record is for.",
  ],
  sections: [
    {
      id: "s1-reingest",
      title: "The fix for the refusals skipped the gate, because nobody called it a release",
      goal: "Why did a fix for refusals go out without the gate?",
      blocks: [
        {
          kind: "p",
          text: "The first real incident came from a fix, and the fix skipped the gate. On Friday 27 November you add five packaging PEPs to the corpus, as the online review decided. The third team is due to join on Monday 30 November, if the review allows it.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "The incident in this chapter is invented",
          text: "The rows were made by the capstone's seeder and respaced to the pilot's traffic. The diagnosis and the postmortem draft are the real tool's output on those rows. Chapter 6 said these alerts were never applied to a project, so every page here is part of the story.",
        },
        {
          kind: "p",
          text: "The release rule from course 4 says a code change goes through the gate. A re-ingest changes no code. Nobody decided to skip the gate, because nobody thought of a re-ingest as a release.",
        },
        {
          kind: "p",
          text: "At 14:05 the job starts against the live store. It rewrites the store in batches, old chunks first, so the store is thin until the job finishes. One batch fails, and the job stops. It records the failure in its own log, and nobody reads that log.",
        },
        {
          kind: "p",
          text: "From that minute, a search finds far fewer chunks than before. A question with too little evidence gets a refusal, which is the desk behaving as designed. Each refusal counts as a failed request, and each one is quick.",
        },
        {
          kind: "p",
          text: "At about 15:20 the second team's lead writes in the team chat that the desk is refusing everything. You read it as the old packaging complaint. You reply that the new PEPs are going in today, and you don't open the runbook. That is the mistake of the afternoon.",
        },
        {
          kind: "quiz",
          id: "llmops08-q1",
          question: "Why did the re-ingest reach the live store without a gate run?",
          options: [
            "The gate was switched off for the pilot.",
            "The rule named code changes, and a re-ingest changes no code.",
            "The gate failed and was overridden.",
            "The product owner approved a skip.",
          ],
          answer: 1,
          explain: "The release rule named code changes. A corpus change alters what the desk can answer, and the rule didn't cover it.",
        },
        {
          kind: "p",
          text: "So the desk has been failing for over an hour, and one person has said so. The next question is when the alerts noticed.",
        },
      ],
    },
    {
      id: "s2-page",
      title: "The lead felt it first, and the page came 2 hours 50 minutes late",
      goal: "Why did the alert take so long?",
      blocks: [
        {
          kind: "p",
          text: "The page came 2 hours 50 minutes after the change, and a person had said it 95 minutes earlier. The slow rule fired at 16:55:30. The fast rule never fired. Chapter 7 predicted this shape for a refusal storm, and now it has happened on your desk.",
        },
        {
          kind: "p",
          text: "Start with the slow rule. Over the six hours before 16:55:30, 46 of 150 requests failed, which is 31%. Divide by the 5% the objective allows, and the burn rate is 6.1. Over the last 30 minutes, 10 of 13 failed, so that burn rate is 15.4. Both are above 6, so the rule pages.",
        },
        {
          kind: "p",
          text: "Now the fast rule. It needs a burn rate above 14.4 over an hour, which means 72% of that hour failing. After the change, 56% of requests failed, which is a burn rate of 11.2. The rule can't reach its limit on this incident.",
        },
        {
          kind: "callout",
          tone: "insight",
          title: "A person is also a detector",
          text: "The lead noticed about 75 minutes after the change, and the alert took 170. Pilot users are few, and they talk to you. A runbook that starts only from a page throws that signal away.",
        },
        {
          kind: "p",
          text: "The slow rule was doing what chapter 6 said. It needs six hours of history to show the budget is really going, so it pays for its low noise in delay. At 25 requests an hour, there is no quick way to be sure.",
        },
        {
          kind: "quiz",
          id: "llmops08-q2",
          question: "56% of requests fail after a change, against a 95% objective. What does the fast rule do?",
          options: [
            "It fires within five minutes.",
            "It fires once the hour is full.",
            "It never fires, because the burn rate tops out at 11.2.",
            "It fires when the short window agrees.",
          ],
          answer: 2,
          explain: "The burn rate is 0.56 divided by 0.05, which is 11.2. The fast rule's limit is 14.4, so it can't fire however long this lasts.",
        },
        {
          kind: "p",
          text: "The page has arrived at last. The runbook says what comes next.",
        },
      ],
    },
    {
      id: "s3-diagnose",
      title: "The tool named the cause and reported no broken objective, and both were right",
      goal: "What did the diagnosis say, and why did it list nothing as broken?",
      blocks: [
        {
          kind: "p",
          text: "The diagnosis named retrieval, and it listed no broken objective because the objective was already missed. You follow RUNBOOK-001 for the first time at 16:58. The job's own log gives the time it started, so you pass that time with `--at`. You widen the window to nine hours, so the whole morning counts as the healthy side.",
        },
        {
          kind: "code",
          lang: "bash",
          code: `askpep incident diagnose --since 9h --at 2026-11-27T14:05:00+00:00 --postmortem incident/INCIDENT-001.md`,
          caption: "Run at 17:10 on Friday.",
        },
        {
          kind: "code",
          lang: "text",
          code: `changed at 2026-11-27T14:05:00+00:00  (127 rows before, 78 after)
Requests failed far more often because retrieval returned too little.
  The share of failed requests rose from 6% to 56%.
  The mean number of retrieved chunks fell from 6.0 to 2.6.
objectives broken: none
post-mortem written to incident/INCIDENT-001.md`,
          caption: "The real tool's output on the invented rows.",
        },
        {
          kind: "p",
          text: "The headline and both figures are what you needed. Failures went from 8 of 127 to 44 of 78, and chunks fell from 6.0 to 2.6. A falling chunk count points at the store, and only one thing touched the store today.",
        },
        {
          kind: "p",
          text: "The last line needs care. `diagnose` lists objectives that went from met to missed. Before 14:05, `answer-success` stood at 119 of 127, which is 0.937. It was already below 0.95, so it can't go from met to missed. The worst incident of the pilot reads as nothing broken.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "An objective already missed hides the next incident",
          text: "A tool that compares met with missed goes quiet once the objective is red. The 8% leak from chapter 1 was tolerated all week, and it cost you this line of the report. Read the failure share, and don't stop at the list of broken objectives.",
        },
        {
          kind: "p",
          text: "The runbook says stop the harm first. You don't try to finish the job. At 17:30 you restore the previous snapshot of the store, and you confirm a search returns six chunks again. You've told the lead by then, and you've said the desk will be back within minutes.",
        },
        {
          kind: "p",
          text: "Up to 17:30 there were 86 requests after the change, and 50 of them failed. The last half hour of the day held 12 requests, and one failed.",
        },
        {
          kind: "quiz",
          id: "llmops08-q3",
          question: "`diagnose` prints `objectives broken: none`, and 56% of requests are failing. What is the most likely reason?",
          options: [
            "The tool has a bug.",
            "The objective was already missed before the change.",
            "The window is too short.",
            "No objective covers failures.",
          ],
          answer: 1,
          explain: "`diagnose` lists only objectives that went from met to missed. `answer-success` was already below target, so it can't appear.",
        },
        {
          kind: "p",
          text: "The desk is back. The record of what happened is next, while the times are still fresh.",
        },
      ],
    },
    {
      id: "s4-postmortem",
      title: "The draft holds the numbers, and only you can write who was told what",
      goal: "What does the finished postmortem add to the tool's draft?",
      blocks: [
        {
          kind: "p",
          text: "The finished postmortem adds the times people acted and the mistakes they made. The tool wrote five headings from the rows. It couldn't know about the lead's message, the job's log or the restore. You finish it within the two working days the runbook gives.",
        },
        {
          kind: "p",
          text: "You change one line of the draft outright. The tool wrote that no healthy objective broke, which is true and misleading. So you replace it with the count. Friday had 225 requests, because the desk ran at 25 an hour through lunch. Of the 86 requests from 14:05 to 17:30, 50 failed.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# INCIDENT-001.md
Date: 27 November 2026   Owner: engineering   Reviewed: 30 November 2026

## Summary

Requests failed far more often because retrieval returned too little.
A corpus re-ingest failed partway and left the live store thin.

## Impact

86 requests after the change, 50 failed.
answer-success was already missed before the change: 119/127 = 0.937.
The tool printed no broken objective for that reason.

## Timeline

14:05  Re-ingest of five packaging PEPs starts on the live store. One batch fails.
15:20  The second team's lead reports the desk refusing everything. Read as the old complaint.
16:55  Slow rule pages on answer-success. Burn 6.1 over 6 h, 15.4 over 30 min.
16:58  RUNBOOK-001 opened.
17:10  Diagnosis names retrieval and 14:05.
17:30  Previous snapshot restored. Searches return six chunks.

## Root cause

The share of failed requests rose from 6% to 56%.
The mean number of retrieved chunks fell from 6.0 to 2.6.
The release rule named code changes, so a re-ingest skipped the gate.

## Actions

Restore: done at 17:30, from the previous snapshot. Owner: engineering.
Detect: a report from someone using the desk starts RUNBOOK-001. Owner: engineering.
Detect: the job fails loudly, with a message to the team chat. Owner: engineering.
Prevent: a corpus re-ingest goes through the gate, on a staging store first. Owner: product owner.

## Not added to the gate

No new eval item. The gate would have caught this if it had run.`,
          caption: "INCIDENT-001.md, whole.",
        },
        {
          kind: "p",
          text: "Read the last section. Step 8 of the runbook asks if the gate could have held this, and the honest answer is that it already could. The failure was in the process, so a new item would only add work. The 15:20 line is in the timeline because a postmortem that leaves out your own mistake teaches nothing.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# INCIDENT-(number).md
Date:   Owner:   Reviewed:

## Summary

## Impact
Requests affected:   Failed:

## Timeline
(time, what happened, including what people said and did)

## Root cause

## Actions
Restore:   Owner:
Detect:   Owner:
Prevent:   Owner:

## Eval item added, or why not`,
          caption: "For your next incident: the postmortem, values left blank.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Tell me about an incident you handled",
          text: "This comes up in interviews. Answer first with what broke and how long it lasted. Then say who noticed first and how late the alert was. Name your own mistake, and close with the process change. A clean story with no mistake in it doesn't sound real.",
        },
        {
          kind: "p",
          text: "The postmortem's main action is a rule. It has to be written where the next person will read it.",
        },
      ],
    },
    {
      id: "s5-gate-rule",
      title: "A corpus re-ingest is a change, so it goes through the gate",
      goal: "How does the re-ingest finally ship?",
      blocks: [
        {
          kind: "p",
          text: "The re-ingest ships on Monday, through the gate, on a staging store. The release rule gains one line: a corpus re-ingest is a change, and it goes through the gate. That covers the hole the incident found, and it costs one gate run for each re-ingest.",
        },
        {
          kind: "p",
          text: "On Monday morning you rerun the job on a staging store, at commit d4e7a10. You read the job's log this time. All batches finish, and you run the gate against that store.",
        },
        {
          kind: "code",
          lang: "text",
          code: `slice      version   score                     floor    result
retrieval  v2        25/28 = 0.89              0.80     pass
routing    v1        15/16 = 0.94              0.90     pass
answer     v2        19/23 = 0.83 (0.65-0.96)  0.80     pass
action     v1        10/12 = 0.83              0.80     pass
attack     v1         0/25 = 0.00              0.05 max pass
commit d4e7a10   exit 0`,
          caption: "The gate on the staging store, set out by slice. The figures belong to the story.",
        },
        {
          kind: "p",
          text: "Read the answer slice. The old items still score 12 of 14. The nine new ones now score 7, because two of the four packaging items pass. So the total is 19 of 23, or 0.83, and it clears the floor. The other two packaging items need a closer look at how those PEPs are chunked.",
        },
        {
          kind: "p",
          text: "The product owner accepts this report as the new baseline, and you swap the staging store in at noon. Two of the four packaging questions now get answers, and two still don't.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# RELEASE-RULE.md, the added line
A corpus re-ingest is a change. It goes through the gate, on a staging store, before the live store.`,
          caption: "The one line added to the release rule.",
        },
        {
          kind: "p",
          text: "The rule is in place, and the review is at three o'clock.",
        },
      ],
    },
    {
      id: "s6-review",
      title: "The third team stays blocked, because two conditions are still open",
      goal: "What does a week of the pilot decide?",
      blocks: [
        {
          kind: "p",
          text: "The third team stays blocked, because T11 is open and `answer-success` is missed. An **operations review** is a short meeting that reads the plan's numbers and makes one decision. On Monday 30 November the decision is O5: can the third team join today?",
        },
        {
          kind: "p",
          text: "Do the sum first. Tuesday to Friday had 200, 200, 200 and 225 requests, which is 825. Failures were 16, 16, 15 and 59, which is 106. So 719 succeeded, and attainment is 0.8715. The objective allows 5% of 825, which is 41.25 failures. You spent 106, so the budget left is minus 157%.",
        },
        {
          kind: "p",
          text: "The product owner reads that and asks how much was the incident. Take out the incident's 86 requests and 50 failures. The week then has 56 failures in 739 requests, which is 0.924. So the steady leak was already over budget. The incident made a miss worse, and the leak is what needs work.",
        },
        {
          kind: "p",
          text: "The security reviewer goes next. T11 was due today, and the `query` column, checkpoints and ticket bodies are still raw. So the condition from course 3 isn't met, and the third team can't join. The Model Armor condition stays with the reviewer, and nothing this week changed it. Engineering sets a new due date of 14 December 2026.",
        },
        {
          kind: "p",
          text: "The lead asks if the second team must stop. The product owner says no. The harm so far was refused answers, the rollback worked and the team knows the limits. So the second team carries on.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# OPS-PLAN.md
System: PEP desk (AskPEP)   Version: 2   Date: 30 November 2026
Read by: product owner, second team's lead, security reviewer
Follows: EVAL-PLAN.md version 2

## Decisions these numbers must support
O1  Is the second team getting answers?      askpep slo. 0.8715, missed
O2  What does a successful answer cost?      askpep cost. COST-NOTE-001
O3  Are real answers any good?               askpep eval online. /ask only. ONLINE-REVIEW-001
O4  Who is told when the desk breaks?        ALERT-MAP, RUNBOOK-001
O5  Can the third team join?                 Not yet. OPS-REVIEW-001

## Objectives, Tuesday 24 to Friday 27 November
ID  SLO               Target        Reading       Owner              Alert      Runbook
A1  answer-success    0.95          0.8715 MISSED product owner      ALERT-MAP  RUNBOOK-001
A2  total-latency     0.95, 10 s    0.962 met     engineering        ALERT-MAP  RUNBOOK-001
A3  generate-latency  0.95, 7 s     0.985 met     engineering        ALERT-MAP  RUNBOOK-001
A4  rerank-latency    0.95, 400 ms  1.000 met     engineering        ALERT-MAP  RUNBOOK-001
A5  guard-block-rate  0.97          0.985 met     security reviewer  ALERT-MAP  RUNBOOK-001
A6  cost-per-success  0.02 usd      0.0110 met    product owner      daily job  RUNBOOK-001

## Rules
1. A target changes only in writing, with the reading that justifies it.
2. A run the gate started is never traffic.
3. A zero with no data behind it is not a good reading.
4. A report from someone using the desk starts RUNBOOK-001.

## Not measured yet
Whether a desk run's answer was correct, except by thumbs. A6 uses placeholder prices, Wednesday only.`,
          caption: "OPS-PLAN.md, version 2. Every blank from version 1 is filled, or says why not.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# OPS-REVIEW-001.md
Date: 30 November 2026   Period: 24 to 27 November
Present: product owner, second team's lead, security reviewer, engineering

## Reading
825 requests, 719 successful, attainment 0.8715, target 0.95.
Budget left -157%. Without the incident: 56 failures in 739 requests, 0.924.
Incident: INCIDENT-001. 86 requests, 50 failed.

## Decision on O5
The third team does not join today.

## Conditions before it can
1. T11 closed: query column, checkpoints and ticket bodies. Owner: engineering. Due: 14 December 2026.
2. answer-success at or above target for two working weeks. Owner: product owner.
3. The Model Armor condition from the launch decision. Owner: security reviewer.

## What continues
The second team stays on the desk.

## Open work
Reduce the steady refusals, starting with the two packaging items still failing.
Measure desk-run answers. The judge reads 32% of traffic.
Replace the placeholder prices.`,
          caption: "OPS-REVIEW-001.md, whole.",
        },
        {
          kind: "p",
          text: "Read the conditions as tests that someone can fail. Each has an owner, and the first has a date. The review didn't find a way to say yes, and that is what it's for. The second team's lead got a straight answer too, which is that the desk stays and the third team waits.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# OPS-REVIEW-(number).md
Date:   Period:
Present:

## Reading

## Decision

## Conditions before it changes
(each with an owner and a date)

## What continues

## Open work`,
          caption: "For your next operations review: the record, values left blank.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "When do you say no to expanding a pilot?",
          text: "This comes up in interviews. Give a real number, such as attainment against target, and an open security condition. Then say what continues, because a flat no leaves people stranded. Close with the tests that would change the answer.",
        },
        {
          kind: "quiz",
          id: "llmops08-q4",
          question: "The week's attainment is 0.8715 and the incident caused 50 of the 106 failures. What does taking the incident out show?",
          options: [
            "The pilot was on target.",
            "The week would be at 0.924, so the steady leak is over budget too.",
            "The objective is wrong.",
            "The incident didn't matter.",
          ],
          answer: 1,
          explain: "Without the incident's 86 requests and 50 failures, 56 of 739 failed. Attainment is 0.924, still below 0.95.",
        },
        {
          kind: "p",
          text: "The decision is written down. The last job is to leave the next course a clear place to start.",
        },
      ],
    },
    {
      id: "s7-pack",
      title: "The course leaves ten records and a desk that is measured and still small",
      goal: "What does AskPEP look like at the end of this course?",
      blocks: [
        {
          kind: "p",
          text: "AskPEP is measured and still small. It serves the second team only, on 18 PEPs plus five packaging ones. Six objectives have owners, and one is missed. Alerts cover working hours. A runbook has been used once. The third team waits on three written conditions.",
        },
        {
          kind: "p",
          text: "The course leaves ten records. Together they let a new owner answer the first question in this course without asking anyone.",
        },
        {
          kind: "code",
          lang: "text",
          code: `OPS-PLAN.md              version 2. What is watched, who owns it, what is still blank.
TRACE-SHARING-001.md     What leaves the system for LangSmith, and what stays raw.
TRACE-READOUT-001.md     Where one 38-second request spent its time.
COST-NOTE-001.md         0.0110 usd per success, on placeholder prices.
ONLINE-REVIEW-001.md     What the judge read, and the packaging gap.
ALERT-MAP.md             What pages, what makes a ticket, what stays silent.
POSTMORTEM-REHEARSAL.md  The seeded fault, finished by hand.
RUNBOOK-001.md           The order of work for a real page.
INCIDENT-001.md          The re-ingest, with the 15:20 line left in.
OPS-REVIEW-001.md        Why the third team waits, and what would change that.`,
          caption: "The operations pack at the end of course 5.",
        },
        {
          kind: "code",
          lang: "text",
          code: `OPS-PLAN           what you watch and who owns it
SHARING NOTE       what may leave the system, and what stays raw
ONE READ-OUT       one slow or bad request, read to the end
COST NOTE          the number, what it leaves out, the cut you tried
ONLINE REVIEW      what the judge read, what it did not, what people said
ALERT MAP          what pages, what makes a ticket, what stays silent
REHEARSAL          a seeded fault with a known answer
RUNBOOK            stop the harm before you find the cause
POSTMORTEM         include your own mistake
OPERATIONS REVIEW  one decision, with conditions someone can fail`,
          caption: "For your next pilot: the pack, one line each.",
        },
        {
          kind: "p",
          text: "The desk is measured. Why is each part of it built the way it is, and what must change for wider traffic? Course 6 starts there.",
        },
      ],
    },
  ],
  recap: [
    "A corpus re-ingest changes what the desk can answer, so it goes through the gate.",
    "A person noticed about 75 minutes after the change, and the page took 170 minutes.",
    "The fast rule can't fire at a 56% failure share, because the burn rate tops out at 11.2.",
    "`diagnose` lists only objectives that went from met to missed, so an objective already missed hides the next incident.",
    "A postmortem records the times people acted and the mistakes they made.",
    "An operations review reads the numbers and makes one decision, with conditions someone can fail.",
    "The third team waits on T11, on `answer-success` and on the Model Armor condition.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In my first operations review I learned that a change to the corpus is a change like any other. A person often notices before the alert does. I write down my own mistake, and I end a review with one decision and conditions that someone can fail.",
  interviewIds: ["llmops-q25", "llmops-q26"],
};

export default chapter;
