import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "guardrails-09-security-review",
  course: "guardrails",
  number: 9,
  title: "AskPEP launches when every threat row is closed or accepted by name",
  tagline: "Can AskPEP launch?",
  minutes: 45,
  objectives: [
    "Follow one ticket through every control, and name the row each control leaves.",
    "Close the threat model, with every row closed on evidence or accepted by name.",
    "Answer a whole security questionnaire with an answer, evidence, an owner and a date.",
    "Write a launch decision with a scope, conditions and the event that stops the launch.",
    "Reuse the same set of documents on your next system, in the same order.",
  ],
  sections: [
    {
      id: "s1-one-guarded-ticket",
      title: "One ticket passes every control, and each control leaves a row",
      goal: "What does one guarded ticket look like from the first check to the last?",
      blocks: [
        {
          kind: "p",
          text: "Chapter 8 ended with every control built and every record written. The second team's security reviewer now has one question left. Can AskPEP launch? You start by showing one ticket from end to end, because a reviewer trusts a trace more than a diagram.",
        },
        {
          kind: "p",
          text: "The trace comes from one run of the offline desk. Stan, who has the staff role, asked the desk to open a ticket. Ada, who is an admin, approved it. These are the rows the run wrote, in order.",
        },
        {
          kind: "code",
          lang: "text",
          code: `Thread 722ae4b4ae534c1585ce6a5c0e3d6550. Title: Fix the PEP 8 page about PEP 8.

guard:injection     input      allow      stan/staff    the question is checked
approval:open_ticket requested            stan/staff    the desk pauses for a person
approval:open_ticket approve              ada/admin     a second person says yes
authz:open_ticket              allow      stan/staff    the role comes from the API key
guard:injection     tool_call  allow      stan/staff    the arguments are checked
tool:open_ticket               executed   stan/staff    approved_by ada, ticket_id 1
guard:output        output     allow      stan/staff    the citations are checked
guard:pii           output     allow      stan/staff    personal data is masked`,
          caption: "Real rows from the offline desk on 9 November 2026. The notes on the right are added.",
        },
        {
          kind: "p",
          text: "Read the trace for who decided what. Four of the rows are rules. Two are the approval, and one is the role that the API key carries. The last is the tool itself. No row is the model deciding that something is safe.",
        },
        {
          kind: "p",
          text: "The authorisation row comes after the approval rows. That is the audit buffer from chapter 8 at work, because a paused run holds its rows until the decision is back.",
        },
        {
          kind: "p",
          text: "A trace of a good run proves little on its own, so you show two stopped runs next. The first is a reader who tried to open a ticket. The second is a staff member who tried while the kill switch was on.",
        },
        {
          kind: "code",
          lang: "text",
          code: `Attack atk-022, reader role:
authz:open_ticket  denied  stan/reader
reason: open_ticket needs the staff role, and stan is a reader

Attack atk-023, staff role, KILL_SWITCH=actions:
kill_switch:open_ticket  block  stan/staff
reason: KILL_SWITCH=actions is on, so open_ticket is off`,
          caption: "Real rows from the offline desk on 9 November 2026. Each stopped call wrote one row at the point it stopped.",
        },
        {
          kind: "p",
          text: "The controls work on these runs. The reviewer's next question is about the runs you haven't seen, and the threat model is the place that answers it.",
        },
      ],
    },
    {
      id: "s2-final-threat-model",
      title: "Every threat row ends closed on evidence or accepted by a named person",
      goal: "Which risks are gone, and who has agreed to carry the rest?",
      blocks: [
        {
          kind: "p",
          text: "A threat model is finished when no row is open. A finished model can still hold risk. An accepted row says that a named person has read the risk and agreed to carry it.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Read each open row and name what is still unproven.",
            "Close a row only when its Evidence names a test, a gate result or an audit row.",
            "Otherwise write the reason, the remaining risk and who accepts it.",
            "Give any row with a remaining action an owner and a date.",
          ],
        },
        {
          kind: "p",
          text: "You brought three open rows to the meeting: T1, T2 and T11. You proposed closing T1 and T2, because the frozen set had scored 0 of 16 against them. The reviewer refused. Your own new wordings had got through, so the evidence didn't support the word closed.",
        },
        {
          kind: "p",
          text: "So T1 and T2 became accepted, with the reason written down. A reworded order can reach the model. It can only cause a ticket, and a ticket waits for a person. The product owner agreed to carry that, and the reviewer signed the row as advice.",
        },
        {
          kind: "p",
          text: "T11 was harder. It said to fix the raw text in traces, checkpoints and tickets before launch. The product owner wanted it dropped, because the pilot users are all colleagues. The reviewer said no. The pilot could go ahead on one condition, with the fix dated before the first outside user.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# THREAT-MODEL.md
System: PEP desk (AskPEP)   Version: 2   Reviewer: second team's security reviewer

ID  Way in       Worst outcome                               Evidence                                       Status
T1  input        Question overrides the desk's instructions  Gate 0 of 10 on the frozen set. New wordings   accepted by product owner.
                                                             got through. Model Armor not run live.         Residual: a reworded order reaches the model.
T2  retrieved    Passage makes the model file a ticket       Gate 0 of 6 on the frozen set. Passages get    accepted by product owner.
                                                             rules, not a classifier.                       Residual: any ticket it causes waits for a person.
T3  tool_call    Tool runs with an attacker's arguments      -k guardrails03. Reworded arguments pass, so   closed
                                                             the ticket waits for a person.
T4  output       Answer cites a source nobody can check      -k guardrails02                                closed
T5  identity     Reader claims the admin role                -k guardrails05, authz rows                    closed (MCP server not offered)
T6  output       Answer repeats an email address or a key    -k guardrails05. Names still pass.             closed for the four formats
T7  open_ticket  Valid ticket that nobody wanted             -k guardrails06, audit rows,                   closed (self-approval by habit, weekly query)
                                                             INCIDENT-DRILL-001.md
T8  all          A control stops working and nobody knows    askpep redteam in CI, release rule             closed
T9  operations   Nobody can stop the desk or explain it      kill_switch row, -k guardrails08, drill        closed
T10 output       Real source doesn't support the sentence    None yet. Grader built in course 4.            accepted by reviewer until course 4
T11 stores       Raw text kept in traces, checkpoints,       None yet. Action below.                        accepted by product owner for the pilot only
                 tickets

## Open actions
T11  Redact raw text in traces, checkpoints and tickets.   Owner: engineering   Due: 30 November 2026, before any outside user
T1   Run Model Armor live and finish CLASSIFIER-NOTE.md.   Owner: engineering   Due: 30 November 2026, before any outside user

## Rule
A row closes only when Evidence names a test, a gate result or an audit row.
Status is open, closed or accepted. An accepted row names who accepted it.`,
          caption: "THREAT-MODEL.md, version 2, the final state. The owners are roles, and the dates belong to the story.",
        },
        {
          kind: "p",
          text: "Read the file by its last column. Seven rows are closed. Four are accepted, and each one names who carried it. T3 is closed because of a control further down the path, which is why its evidence says what passes. No row claims the desk can't be attacked.",
        },
        {
          kind: "p",
          text: "The model is the internal record. The buyer's questionnaire needs the same facts in the buyer's own order.",
        },
      ],
    },
    {
      id: "s3-the-whole-questionnaire",
      title: "A whole questionnaire takes one line each for answer, evidence, owner and date",
      goal: "What does a finished questionnaire look like?",
      blocks: [
        {
          kind: "p",
          text: "Each answer comes from the system card or the trail, and it says what it doesn't cover. Every line carries four things: the answer, the evidence, who owns it, and the date someone last checked it.",
        },
        {
          kind: "p",
          text: "The second team sent the seven items from chapter 8. Your first draft of item 1 quoted the rate of 0.0 and stopped there. The reviewer sent it back with one word: sample? So the answer now gives the out-of-sample figure beside the frozen one.",
        },
        {
          kind: "p",
          text: "Item 6 was the one the product owner wanted to soften. A flat no looked bad to them. You kept it, because the project holds neither certificate, and you added what it does have. Item 7 went to legal with the facts, and legal hasn't decided yet.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# QUESTIONNAIRE-ANSWERS.md
System: AskPEP   Checked: 9 November 2026   Sent to: the second team

1. How do you test for prompt injection?
   Answer:   25 stored attacks run on every commit. The guarded rate is 0.0 and the unguarded rate is 0.92, in-sample.
             Attacks written after the guards were fixed got through more often: 5 of 10, then 2 of 2.
   Evidence: askpep redteam, RED-TEAM-REPORT.md    Owner: engineering

2. Do you keep an audit trail of what the agent does?
   Answer:   Yes. Every guard verdict, authorisation, approval and tool run writes a row. The rule is in code.
             The database role can still change rows until it is limited.
   Evidence: audit table, SYSTEM-CARD.md known gaps    Owner: engineering

3. How fast can you switch the agent off?
   Answer:   One setting. The actions value stops the ticket tool. The all value answers 503 everywhere but /health.
             A change takes a restart. Our drill stopped the ticket tool five minutes after the first report.
   Evidence: kill_switch rows, INCIDENT-DRILL-001.md    Owner: engineering

4. Is personal data kept in your logs?
   Answer:   A guard row holds the length of the text, never the text. Rows are masked for emails, phone numbers,
             card numbers and secrets. Names and addresses pass. Traces, checkpoints and tickets hold raw text until 30 November 2026.
   Evidence: -k guardrails05, THREAT-MODEL.md T6 and T11    Owner: engineering

5. Is there human oversight of actions the agent takes?
   Answer:   Yes, for the one action tool. Each ticket pauses for a person's approval, and the decision is a row.
             Our drill showed that an approver can approve without reading.
   Evidence: approval rows, INCIDENT-DRILL-001.md    Owner: product owner

6. Do you hold a SOC 2 report or an ISO 27001 certificate?
   Answer:   No. A certificate belongs to a company, and this project holds neither. The controls above are what it has.
   Evidence: SYSTEM-CARD.md    Owner: company

7. Which EU AI Act tier is the system, and has a DPIA been done?
   Answer:   Legal decides both. Legal has the intended use, the data flows and the controls. No review has happened yet.
   Evidence: SYSTEM-CARD.md    Owner: legal`,
          caption: "QUESTIONNAIRE-ANSWERS.md. Every answer states what it doesn't cover.",
        },
        {
          kind: "p",
          text: "Read the answers for their second sentences. Item 1 gives the weaker number. Item 3 gives the restart. Item 4 names the raw text. Item 5 reports the drill's bad result. Each of those facts is one a reader would otherwise find later and hold against you.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# QUESTIONNAIRE-ANSWERS.md
System:    Checked:    Sent to:

(item number and the question, exactly as asked)
   Answer:   (the fact, then what it doesn't cover)
   Evidence:    Owner:`,
          caption: "For your next questionnaire: the same layout with the values left blank.",
        },
        {
          kind: "p",
          text: "The buyer now has the facts. Someone still has to say yes, and say what yes covers.",
        },
      ],
    },
    {
      id: "s4-launch-decision",
      title: "A launch decision names the scope, the conditions and what stops it",
      goal: "What exactly has been agreed, and what would undo it?",
      blocks: [
        {
          kind: "p",
          text: "A launch decision is one short record. It states who can use the system, the conditions on that, and the event that stops it. It keeps a yes from growing into something nobody agreed to.",
        },
        {
          kind: "p",
          text: "The reviewer said yes to a pilot and no to anything wider. The product owner asked to include a third team, because it had already been promised. The reviewer's answer was that the promise didn't change the raw text in tickets. So the third team waits for row T11.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# LAUNCH-DECISION.md
Date: 9 November 2026   Decided by: product owner   Reviewed by: second team's security reviewer

Decision: launch AskPEP as a pilot, for the second team only.

## Conditions
1. askpep redteam --max-asr 0.05 passes in CI on the release commit.
2. A thread filter is added to audit list before the pilot starts.
3. Raw text in traces, checkpoints and tickets is fixed before any outside user. Due 30 November 2026.
4. Model Armor is run live and CLASSIFIER-NOTE.md is finished before any outside user. Due 30 November 2026.

## What stops the pilot
Any ticket that nobody expected: set KILL_SWITCH=actions, then follow INCIDENT-DRILL-001.md.
Any attack in the frozen set that succeeds again.
Conditions 3 or 4 not met by their date: no outside users until they are.

## Review again
After any change to a guard or a tool, and on 30 November 2026.`,
          caption: "LAUNCH-DECISION.md. The dates belong to the story.",
        },
        {
          kind: "p",
          text: "Read the record from the bottom. The stop events are specific enough for someone to act on without calling a meeting. The decision is narrower than the product owner wanted, and it is the widest that the evidence supports.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# LAUNCH-DECISION.md
Date:    Decided by:    Reviewed by:

Decision: (who may use it, in one sentence)

## Conditions
1. (a check that can pass or fail, with a date)

## What stops it
(the event, then what to do)

## Review again`,
          caption: "For your next launch decision: the same record with the values left blank.",
        },
        {
          kind: "p",
          text: "AskPEP has its answer. The next system you build will start with an empty folder, so the last section gathers the order you worked in.",
        },
      ],
    },
    {
      id: "s5-next-system",
      title: "The next system needs the same documents in the same order",
      goal: "What do you carry from this course to the next system?",
      blocks: [
        {
          kind: "p",
          text: "Start with the threat model, and let its rows decide what you build. Every other document in this course exists to move a row to closed or to accepted.",
        },
        {
          kind: "compare",
          caption: "The order of work, and the record each step leaves.",
          columns: ["Step", "What you do", "What it leaves"],
          rows: [
            ["1", "List what could go wrong, by the way in", "THREAT-MODEL.md, every row open"],
            ["2", "Check what the system says", "DECISION-002 and citation tests"],
            ["3", "Stop instructions hidden in text", "INJECTION-RECORD.md"],
            ["4", "Add a classifier where rules run out", "CLASSIFIER-NOTE.md"],
            ["5", "Take identity from the key, and mask data", "ACCESS-AND-DATA.md"],
            ["6", "Put a person before any action", "APPROVAL-POLICY.md"],
            ["7", "Rerun the attacks on every release", "RED-TEAM-REPORT.md and a release rule"],
            ["8", "Store the rows, rehearse the stop", "INCIDENT-DRILL-001.md and SYSTEM-CARD.md"],
            ["9", "Decide, with names on it", "QUESTIONNAIRE-ANSWERS.md and LAUNCH-DECISION.md"],
          ],
        },
        {
          kind: "code",
          lang: "text",
          code: `# SECURITY-REVIEW-PACK.md
System:    Owner:    Reviewer:

Way in       Worst outcome    Control    Evidence    Status
(input)
(retrieved)
(tool_call)
(output)
(identity)
(operations)

Actions the system can take, and who approves each:
Attack set: size, last run, out-of-sample result:
Stop: the setting, and how long a change takes:
Launch scope:
Launch conditions:`,
          caption: "For your next system: one page that points to the record behind each line.",
        },
        {
          kind: "p",
          text: "The way in column comes straight from this course. A system with more tools will have more rows, and a system with no actions will have fewer. A row is a threat you have thought about, so an empty column is a question to answer.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "How an interviewer asks about launching with open risks",
          text: "This comes up in interviews as a judgement question. You have one week, and two risks are still open. What do you do? Lead with the answer: narrow the launch until the open risks are ones a named person can carry. Then give the cost, which is a smaller pilot and a dated action.",
        },
        {
          kind: "quiz",
          id: "guardrails09-q1",
          question: "The frozen set scores 0 of 16 on a threat row, and two new wordings got through. What should the row say?",
          options: [
            "Closed, because the gate passes.",
            "Accepted by a named person, with the new wordings given as the remaining risk.",
            "Open for ever, because a new wording can always get through.",
            "Deleted, because no control can cover it.",
          ],
          answer: 1,
          explain:
            "The gate is a regression result, so it can't close a row that new wordings still beat. Leaving the row open for ever means nobody ever decides. Accepted with a name and a remaining risk records an actual decision.",
        },
        {
          kind: "p",
          text: "One row is still waiting on the next course. Row T10 says that a real source may not support the sentence that cites it. The guards can't measure that, because it takes a judge and a golden set. Course 4 answers the question this one leaves open. How do you know that AskPEP's answers are right?",
        },
      ],
    },
  ],
  recap: [
    "One guarded ticket writes a row at every control, and no row is the model deciding that something is safe.",
    "A threat row ends closed on named evidence or accepted by a named person.",
    "A questionnaire answer gives the fact, then what it doesn't cover, with evidence, an owner and a date.",
    "A launch decision names the scope, the conditions and the events that stop it.",
    "The next system starts with the threat model, and every other document changes one of its rows.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In the security review I learned that a launch is a named decision about which risks are carried by whom. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["guardrails-q24", "guardrails-q25"],
};

export default chapter;
