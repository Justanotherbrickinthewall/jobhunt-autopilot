import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "evals-09-first-release",
  course: "evals",
  number: 9,
  title: "The first real change goes through every check",
  tagline: "The fix is ready and the gate is built. Does it pass, and who signs?",
  minutes: 40,
  objectives: [
    "Say why a new dataset version needs a new baseline, and accept one.",
    "Read a whole gate report and say which rule fired.",
    "Narrow a fix so that it keeps its gain and loses its cost, and close a threat row on the report.",
    "Finish an eval plan and say what it still doesn't measure.",
    "Write a release decision that names what stays blocked.",
    "Assemble the eval pack for your next system, in order.",
  ],
  sections: [
    {
      id: "s1-the-change",
      title: "The fix needs a baseline taken on the new dataset first",
      goal: "What has to happen before the first gate run?",
      blocks: [
        {
          kind: "p",
          text: "Does the retrieval fix pass every check? Chapter 7 left you with a failing test: eight new items in retrieval/v2 whose questions describe a PEP without naming it. Chapter 8 left you with a gate and a rule for using it. This chapter runs one real change through both.",
        },
        {
          kind: "p",
          text: "A few small fixes had shipped since the error review. Items t08 and t11 now build their tickets correctly, one route was corrected and the refusal rule was loosened. So the desk was already a little better than the 45 of 62 you read in chapter 7.",
        },
        {
          kind: "p",
          text: "The release rule says a new dataset version needs a new baseline. You ran the gate on the old desk with retrieval/v2. It exited 1, because the retrieval rate was 0.50 against a floor of 0.80. That was expected. The eight new items exist to fail until the fix lands.",
        },
        {
          kind: "code",
          lang: "text",
          code: `Baseline report  git a41c07e  2026-11-20T09:30:00Z  exit 1
Slice      Items  Passed  Rate   Interval      Limit          Result
retrieval  28     14      0.50   0.32 to 0.68  floor 0.80     failed
routing    16     15      0.94   0.81 to 1.00  floor 0.90     passed
answer     14     12      0.86   0.64 to 1.00  floor 0.80     passed
action     12     10      0.83   0.58 to 1.00  floor 0.80     passed
attack     25     0       0.00   0.00 to 0.00  ceiling 0.05   passed`,
          caption: "The baseline on the old desk. These rates come from running the real gate code on the story's pass counts. An attack counts when it gets through.",
        },
        {
          kind: "p",
          text: "The product owner accepted this report by name as the baseline, with the reason that retrieval/v2 was new. Accepting a failing report feels wrong, and it's correct here. A baseline records where you are. The floor still applies to the next run.",
        },
        {
          kind: "p",
          text: "The change itself was small. Before the search, one extra model call rewrites the question and adds the titles of PEPs it may be asking about. The search then has words to match.",
        },
        {
          kind: "quiz",
          id: "evals09-q1",
          question: "Why was a report that failed its retrieval floor accepted as the baseline?",
          options: [
            "Because the floor doesn't apply to a baseline run.",
            "Because a baseline records the old desk on the new dataset, and the new items were written to fail.",
            "Because the product owner may waive any slice.",
            "Because the retrieval slice has too few items to count.",
          ],
          answer: 1,
          explain: "A baseline is the comparison point on the same dataset version. It's the next run that must clear the floor. The waiver rule has nothing to do with it.",
        },
        {
          kind: "p",
          text: "With the baseline accepted, the fix can go through the gate.",
        },
      ],
    },
    {
      id: "s2-first-gate",
      title: "The first gate run fails on a slice the change never touched",
      goal: "What did the gate catch that the headline number hid?",
      blocks: [
        {
          kind: "p",
          text: "The gate exited 1. Retrieval rose from 14 of 28 to 25 of 28, which is what the fix was for. Action fell from 10 of 12 to eight of 12. That took it to 0.67, below its floor of 0.80. Here is the whole report.",
        },
        {
          kind: "code",
          lang: "json",
          code: `{
  "version": 1,
  "git_sha": "c7d2e91",
  "created_at": "2026-11-20T11:30:00Z",
  "passed": false,
  "cost_usd": 0.0,
  "dataset_versions": {
    "retrieval": "v2",
    "routing": "v1",
    "answer": "v1",
    "action": "v1",
    "attack": "v1"
  },
  "slices": {
    "retrieval": {
      "n": 28,
      "metric": "recall@6",
      "rate": 0.8928571428571429,
      "low": 0.7857142857142857,
      "high": 1.0,
      "floor": 0.8,
      "ceiling": null,
      "baseline": 0.5,
      "passed": true,
      "reason": ""
    },
    "routing": {
      "n": 16,
      "metric": "route_accuracy",
      "rate": 0.9375,
      "low": 0.8125,
      "high": 1.0,
      "floor": 0.9,
      "ceiling": null,
      "baseline": 0.9375,
      "passed": true,
      "reason": ""
    },
    "answer": {
      "n": 14,
      "metric": "answer_pass",
      "rate": 0.8571428571428571,
      "low": 0.6428571428571429,
      "high": 1.0,
      "floor": 0.8,
      "ceiling": null,
      "baseline": 0.8571428571428571,
      "passed": true,
      "reason": ""
    },
    "action": {
      "n": 12,
      "metric": "trajectory_pass",
      "rate": 0.6666666666666666,
      "low": 0.3333333333333333,
      "high": 0.9166666666666666,
      "floor": 0.8,
      "ceiling": null,
      "baseline": 0.8333333333333334,
      "passed": false,
      "reason": "trajectory_pass 0.67 is below the floor 0.80"
    },
    "attack": {
      "n": 25,
      "metric": "attack_success_rate",
      "rate": 0.0,
      "low": 0.0,
      "high": 0.0,
      "floor": null,
      "ceiling": 0.05,
      "baseline": 0.0,
      "passed": true,
      "reason": ""
    }
  }
}`,
          caption: "The first gate run, whole. It comes from the real `run_gate`, given the story's pass counts.",
        },
        {
          kind: "p",
          text: "Read the action slice. Its reason is `trajectory_pass 0.67 is below the floor 0.80`. The floor fired. The baseline rule didn't fire, because the interval's top of 0.92 is above the old rate of 0.83. With 12 items, the interval alone couldn't have called this a real drop. The floor could.",
        },
        {
          kind: "p",
          text: "Count the pooled score as well. The old desk had 76 of 95, and this one has 85 of 95. The rise is nine items, and a pooled score would have called it a clear win. It's the trap from chapter 1 again, the other way up. The sum went up while one slice got worse.",
        },
        {
          kind: "p",
          text: "You read the two new failures. The rewrite runs as its own step on the desk's graph, so each search costs one more step. Two action items search twice, and they went over their step limit. The answer each one gave was correct. The path was too long, and the trajectory grader from chapter 6 caught it.",
        },
        {
          kind: "quiz",
          id: "evals09-q2",
          question: "Action fell from 0.83 to 0.67 and the gate failed it. Why didn't the baseline rule fire?",
          options: [
            "The baseline rule only applies to retrieval.",
            "The top of the interval, 0.92, is above the old rate of 0.83, so the drop isn't beyond the noise.",
            "The floor rule replaces the baseline rule when both exist.",
            "The baseline was accepted before this run.",
          ],
          answer: 1,
          explain: "The baseline rule fails a slice only when the whole interval sits below the old rate. On 12 items the interval is wide. The floor is the rule that caught this one.",
        },
        {
          kind: "p",
          text: "So the fix works and it costs too much on another slice. The next run has to keep the first result and lose the second.",
        },
      ],
    },
    {
      id: "s3-fix-and-rerun",
      title: "A narrower rewrite passes, and that report becomes the new baseline",
      goal: "What closes once the gate passes?",
      blocks: [
        {
          kind: "p",
          text: "You narrowed the rewrite. It now runs only when the question names no PEP number. A ticket request almost always names one, so the action items skip the extra step. The eight new retrieval items name none, so they keep it.",
        },
        {
          kind: "code",
          lang: "text",
          code: `Slice      Baseline a41c07e   Run 1 c7d2e91   Run 2 e19b6f4   Limit         Run 2 result
retrieval  14/28  0.50        25/28  0.89     25/28  0.89     floor 0.80    passed
routing    15/16  0.94        15/16  0.94     15/16  0.94     floor 0.90    passed
answer     12/14  0.86        12/14  0.86     12/14  0.86     floor 0.80    passed
action     10/12  0.83         8/12  0.67     10/12  0.83     floor 0.80    passed
attack      0/25  0.00         0/25  0.00      0/25  0.00     ceiling 0.05  passed
Exit                 1            1               0`,
          caption: "Three runs of the gate. An attack counts when it gets through, so zero is the good result.",
        },
        {
          kind: "p",
          text: "Run 2 exited 0, and the desk kept the retrieval gain. The action interval is still 0.58 to 1.00. That's wide, and the release rule doesn't hide it. Twelve items can't say much more than that the slice didn't fall.",
        },
        {
          kind: "p",
          text: "The gate ran with `--judge`, so the answer slice includes the judge you calibrated in chapter 3. That matters for the security reviewer. T10 said a real source might not support the sentence citing it. The row had been accepted until a grader could measure it, and now one does, on every release.",
        },
        {
          kind: "p",
          text: "The reviewer closed T10, on one condition. It reopens if the judge card lapses, which happens when the model or the rubric changes. A closed row with an expiry is more honest than a row closed for good.",
        },
        {
          kind: "p",
          text: "The product owner accepted run 2 as the new baseline, by name, with the reason that retrieval/v2 now passes. The plan can now be finished.",
        },
      ],
    },
    {
      id: "s4-final-plan",
      title: "The finished plan shows what each slice proved and what nothing proved yet",
      goal: "What does the eval plan say now?",
      blocks: [
        {
          kind: "p",
          text: "The plan from chapter 1 had none yet in nearly every cell. Each chapter since has filled in one column. Decision D1 now has a mechanism, D2 has a method and D3 has an answer. One line says what the plan still can't see.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# EVAL-PLAN.md
System: PEP desk (AskPEP)   Version: 2   Read by: product owner, second team's lead, security reviewer

## Decisions these numbers must support
D1  May this change ship?      The gate, under RELEASE-RULE.md.
D2  Which part of the desk broke?  Slice reasons, then an error review.
D3  Can threat row T10 close?  Yes. Closed on report e19b6f4. Reopens if the judge card lapses.

## Slices
ID  Slice      Dataset       Items  Catches                                   Owner               Grader                                     Limit         Evidence  Status
S1  retrieval  retrieval/v2  28  The walrus question misses PEP 572        engineering         recall@6 (course 1)                        floor 0.80    e19b6f4   gated
S2  routing    routing/v1    16     A ticket request goes to the researcher   second team's lead  grade_route                                floor 0.90    e19b6f4   gated
S3  answer     answer/v1     14     The answer cites PEP 572, wrong operator  product owner       grade_citations, grade_refusal, judge v2   floor 0.80    e19b6f4   gated
S4  action     action/v1     12     A ticket opens with no PEP number         engineering         grade_tool_args, grade_trajectory          floor 0.80    e19b6f4   gated
S5  attack     attack/v1     25     A retrieved passage opens a ticket        security reviewer   attack arena (course 3)                    ceiling 0.05  e19b6f4   gated

## Rules
1. Report each slice on its own. No pooled number decides anything.
2. A released dataset version never changes. A fix is a new version.
3. New items come from real failures, and each records its source.
4. No item appears in a prompt.
5. A new dataset version needs a new baseline.

## Supporting records
GRADER-MAP.md, JUDGE-CARD.md, THRESHOLD-NOTE.md, EXPERIMENT-001.md, AUTONOMY-NOTE-001.md, ERROR-REVIEW-001.md, RELEASE-RULE.md

## Not measured
Questions real users ask that no item covers. Course 5.
Answer slice size: EXPERIMENT-001 is still not yet.`,
          caption: "EVAL-PLAN.md, version 2. Compare it with version 1 in chapter 1.",
        },
        {
          kind: "p",
          text: "Read the status column. It says gated, and the word is careful. A gated slice has a limit and a report. It doesn't mean the slice is correct. The Not measured section is the part the product owner should read twice.",
        },
        {
          kind: "p",
          text: "One more page turns these records into a decision.",
        },
      ],
    },
    {
      id: "s5-release-decision",
      title: "The release decision says what shipped, what stays blocked and who signed",
      goal: "What exactly was decided, and what would reverse it?",
      blocks: [
        {
          kind: "p",
          text: "A **release decision** is the short record of one release. It names the change, the report, the risks accepted and the people who accepted them. The reader should be able to reverse it without asking anyone what happened.",
        },
        {
          kind: "p",
          text: "The lead wanted to know whether their team was safe to keep using the desk. The reviewer wanted T10 written down. The product owner asked again about the third team, which had been promised access. The reviewer's answer hadn't changed. T11, the raw text in traces and tickets, is due on 30 November, and the gate can't close it.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# RELEASE-DECISION-001.md
Date: 20 November 2026   Change: rewrite a question only when it names no PEP number
Report: e19b6f4, exit 0   Baseline before: a41c07e   Baseline after: e19b6f4

## Result
retrieval  25/28 0.89   from 14/28 on the same dataset
routing    15/16 0.94   unchanged
answer     12/14 0.86   unchanged, judge included
action     10/12 0.83   unchanged, after one failed run
attack      0/25 0.00   unchanged

## Decision
Ship this change to the second team.
T10 closes on this report, and reopens if the judge card lapses.
Human approval on tickets stays (AUTONOMY-NOTE-001.md).

## Not released
The third team. T11 is open and due on 30 November 2026.
The one-sentence answer prompt. EXPERIMENT-001.md says not yet.

## Risks accepted
The action interval is 0.58 to 1.00, on 12 items. Accepted by the product owner.
Questions outside the datasets are not measured until course 5. Accepted by the product owner.

## Reverse this if
A slice falls below its limit on the same dataset version, or the second team reports a failure that matches a closed row.

Signed: product owner, security reviewer. Read by: second team's lead.`,
          caption: "RELEASE-DECISION-001.md. Every figure comes from the three gate reports.",
        },
        {
          kind: "p",
          text: "The read-out is the Not released section. A decision that lists only what shipped hides the arguments. This one records that the promised third team is still waiting, and why. It also records a prompt the lead asked for that hasn't earned its place.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "A gate that fails after a good change comes up in interviews",
          text: "Interviewers often ask what you'd do when a fix raises the headline and fails the gate. Say that you read the failing slice first. Then give the cause and the narrower fix, and show that the original gain held.",
        },
        {
          kind: "quiz",
          id: "evals09-q3",
          question: "What makes T10 safe to mark closed in this story?",
          options: [
            "The reviewer trusts the judge after one good run.",
            "The judge is calibrated, and the gate now runs it on every release. The row reopens if the judge card lapses.",
            "The answer slice passed at 0.86.",
            "The grader map names a code grader for it.",
          ],
          answer: 1,
          explain: "A row closes when a named control measures it on every change. A single pass wouldn't do it. The expiry keeps the row honest when the model or the rubric changes.",
        },
        {
          kind: "p",
          text: "That is the release done. The last section turns the pages into something you can take away.",
        },
      ],
    },
    {
      id: "s6-next-system",
      title: "Nine pages and one order give your next system an eval pack",
      goal: "How would you start this on your next system?",
      blocks: [
        {
          kind: "p",
          text: "The order matters more than any page. Later pages lean on earlier ones. You can't set a limit before you have a grader, and you can't trust a judge before you've labelled cases.",
        },
        {
          kind: "code",
          lang: "text",
          code: `Order  Page                What it answers                              Comes from chapter
1      EVAL-PLAN.md        What must the numbers support, and who owns each slice?   1
2      GRADER-MAP.md       Which reported failures can code decide?     2
3      JUDGE-CARD.md       What may the judge be used for?              3
4      THRESHOLD-NOTE.md   Why is the metric's line where it is?        4
5      EXPERIMENT-NNN.md   Did this change really help?                 5
6      AUTONOMY-NOTE.md    How much freedom has the agent earned?       6
7      ERROR-REVIEW.md     Which failure do we fix first?               7
8      RELEASE-RULE.md     Who acts on each exit code?                  8
9      RELEASE-DECISION.md What shipped, and what would reverse it?     9`,
          caption: "The eval pack, in the order you'd write it.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# EVAL-PACK.md
System:    Owner:    Read by:

## Plan
Decisions:
Slices (one failure each, a role as owner):

## Checks
Reports sorted into code and judge:
Judge card status and expiry:
Metric thresholds and their labelled items:

## Change control
Experiment rule (written before the run):
Autonomy decisions and the figure that would reopen each:
Limits, baseline owner, exit code actions, waiver rule:

## Last release
Change:    Report:    Baseline:
Not released, and why:
Risks accepted, and by whom:
Reverse this if:

## Not measured`,
          caption: "For your next system: the whole pack on one page, values left blank.",
        },
        {
          kind: "p",
          text: "The gate has only seen cases you wrote. The second team will ask the desk something tomorrow that no item covers. What does real traffic show, and how would you find out? Course 5 starts there.",
        },
      ],
    },
  ],
  recap: [
    "A new dataset version needs a new baseline, and a baseline may fail its own floor when the new items were written to fail.",
    "The floor caught the action fall, and the interval on 12 items could not.",
    "Two slices shifting in opposite directions can raise the pooled score while one gets worse.",
    "A threat row can close on a gate report, with a condition that reopens it.",
    "A release decision names what shipped, what stayed blocked, who signed and what would reverse it.",
    "The eval pack has nine pages, and later pages lean on earlier ones.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In the first release through the gate I learned that a fix can pass its own slice and fail another. I also learned that a threat row can close on a report with a condition that reopens it. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["evals-q21", "evals-q22"],
};

export default chapter;
