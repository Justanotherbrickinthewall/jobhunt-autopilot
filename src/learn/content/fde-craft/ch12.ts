import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "fde-craft-03-delivery-and-handover",
  course: "fde-craft",
  number: 12,
  title: "UAT, go-live, hyper-care and handover",
  tagline: "How do you take it live and leave it with Harbour? The finance director said go. Now the clerks must accept it, and the IT team must own it.",
  minutes: 15,
  objectives: [
    "Run UAT, a go-live and hyper-care for one supplier, each with a written plan and a stop rule.",
    "Track four adoption numbers each week and pick the action each pattern supports.",
    "Build a handover pack that passes the Monday test.",
  ],
  sections: [
    {
      id: "uat-and-hyper-care",
      title: "UAT, go-live and hyper-care carry a passed pilot into daily use",
      goal: "How does a pilot that passed become something staff use every day?",
      blocks: [
        {
          kind: "p",
          text: "The finance director said go at the end of chapter eleven. A pilot that passed still has to be accepted by the people who use it. **User acceptance testing**, or **UAT**, is where the customer's own staff run real cases against the exit criteria. You fix what fails. They sign when it passes.",
        },
        {
          kind: "p",
          text: "Harbour ran UAT in week nine. Two clerks and the accounts payable lead took 30 current invoices.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "Harbour's UAT script, week nine",
          code: "UAT script: week 9. Two clerks and the accounts payable lead, 30 current invoices.\nU1  A clean Tideway invoice.         Approved within 15 minutes, fields match the PDF.\nU2  A slash date.                    Read day-first.\nU3  A resend in different capitals.  Stored as duplicate and never approved.\nU4  Total differs from net plus VAT. Review page shows total_mismatch and the PDF.\nU5  A clerk corrects a date.         One correction row and one audit event.\nU6  An unknown supplier.             Goes to unknown_supplier.\nU7  A scan.                          Goes to scan_out_of_scope with no model call.\nU8  Switch Tideway back to manual.   No invoice is read and the inbox still works.\nResult: U6 failed once because an alias was missing. Fixed and rerun. All 8 passed.\nSign-off: accounts payable lead and finance manager.",
        },
        {
          kind: "p",
          text: "Eight cases cover the clean path and each failure path. U8 tests the way back. U6 failed once, because one supplier alias was missing. The team fixed it and reran the script. The accounts payable lead and the finance manager signed.",
        },
        {
          kind: "p",
          text: "Then comes **go-live**, the day real work starts flowing through the system. It gets a date and a small slice. Harbour's slice was Tideway Packaging only, with a person still posting. A **rollback** is the agreed way back. Here it was switching Tideway to manual keying.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "Harbour's go-live plan, week ten",
          code: "Go-live plan: week 10\nSlice     Tideway Packaging only. A person still posts.\nBefore    The eval set scores at or above the go line on the release build.\n          Rollback rehearsed. Clerks trained on the review page.\nDay 1     Switch Tideway on. Two clerks check everything on the first day.\nWatch     Review share by supplier, wrong amounts approved, time to status.\nStop      One wrong amount approved, or the queue backs up past an hour.\nRollback  Switch the supplier back to manual keying.\nNext      Other born-digital formats, weeks 10 to 13. Posting goes live in the\n          release window at the end of week 13.",
        },
        {
          kind: "p",
          text: "The plan has two stop rules, agreed before day one: one wrong amount approved, or a queue older than an hour. So going back is a decision and not an argument.",
        },
        {
          kind: "p",
          text: "**Hyper-care** is a fixed period after posting goes live when the builders stay close. Harbour's ran weeks 14 to 16. It ended on a written rule.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "Harbour's hyper-care log, weeks 14 to 16",
          code: "Hyper-care log: weeks 14 to 16\nDay  Item                                          Severity  Action\n3    A supplier changed its PDF layout             Medium    New labelling rule, eval rerun\n5    Mailbox token expired, no reads for 4 hours   Serious   Renewed, expiry alert added\n9    Reviewers want the PDF beside the fields      Low       Put on the phase-two list\nExit Ten working days with no serious issue: days 6 to 15. Ended, end of week 16.",
        },
        {
          kind: "p",
          text: "Three items in three weeks. The serious one on day five reset the clock, so the ten quiet days ran from day six to day fifteen. The low item went on the phase-two list.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next customer: UAT script, go-live plan and hyper-care log",
          code: "UAT script: week __. Who runs it, and how many current invoices.\nU1  <case>   <expected result, one line>\n... one row per case, with a failure path and the way back.\nResult: <what failed, fixed and rerun>\nSign-off: <roles>\n\nGo-live plan: week __\nSlice     <one supplier or one team>\nBefore    <the score that must hold, rollback rehearsed>\nDay 1     <who checks everything>\nWatch     <three numbers>\nStop      <the line that triggers rollback>\nRollback  <the way back>\nNext      <what follows>\n\nHyper-care log: weeks __ to __\nDay  Item  Severity  Action\nExit <quiet days needed, no serious issue>",
        },
        {
          kind: "p",
          text: "Is the saving real if the clerks work around the system?",
        },
      ],
    },
    {
      id: "s5-adoption",
      title: "Adoption decides whether the saving happens, so track four numbers every week",
      goal: "How do you know people use the system, and what do you do when they do not?",
      blocks: [
        {
          kind: "p",
          text: "The saving only exists if people use the system. Half the clerks working around it means full cost for half the benefit. Payback then stretches well past the 5.4 months in the case.",
        },
        {
          kind: "p",
          text: "Track four numbers each week. **Active users** counts who used the tool, out of those licensed. **Task completion** is the share of invoices finished inside it. **Override rate** is the share of results a reviewer changed. The fourth is training: who has been trained, and who has not.",
        },
        {
          kind: "p",
          text: "Each number points at a different owner. Falling use points at training. A rising override rate points at the extraction. A falling override rate needs an audit, because tired reviewers accept everything. Course 3 covers review design.",
        },
        {
          kind: "widget",
          id: "fde-craft-adoption-dash",
          intro: "Four dashboards from the Harbour rollout, four weeks each. Read the trend before the levels. Choose the one action each pattern supports.",
        },
        {
          kind: "p",
          text: "Read the trend before the level. A completion rate of 81 percent that is climbing is healthy. The same rate falling for three weeks is a warning. Pair every number with its direction, and with the sentence that says what you will do about it.",
        },
        {
          kind: "p",
          text: "Untrained users create a false signal. A clerk who never learned the review screen will override everything or nothing. Train in the first week, in small groups, using the clerks' own invoices.",
        },
        {
          kind: "p",
          text: "Send the **status report** weekly, even when nothing is wrong. It is a one-screen summary of those numbers for the sponsor. Steady numbers earn trust for the red week. End every report with the decision you need and the date you need it by.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "A weekly status report for the sponsor. Illustrative figures, one screen, sent every Friday.",
          code: "Week 4 of 8\nActive clerks:    16 of 18 (up 1)\nCompletion:       81 percent (target 85)\nOverride rate:    9 percent (steady)\nTrained:          15 of 18; three booked for Tuesday\nAudit:            50 accepted results checked, 1 error\nRisk:             new supplier format live in week 6\nDecision needed:  approve the second supplier, by Friday",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "How an interviewer presses on adoption",
          text: "Interviews often ask: three weeks after launch, usage is falling. What do you check? A strong answer separates use from quality, asks the users who stopped, and looks at override and completion before touching the model. A weak answer retunes the prompt.",
        },
        {
          kind: "quiz",
          id: "fde-craft07-q5",
          question: "Active users hold steady, but the override rate rises from 12 percent to 33 percent over four weeks. What do you do first?",
          options: [
            "Run more training sessions.",
            "Read the overridden invoices to find what changed.",
            "Report the pilot as a success because use is steady.",
            "Remove the review step.",
          ],
          answer: 1,
          explain: "Steady use rules out an adoption problem. A rising override rate means the results got worse, so the overridden invoices show where.",
        },
        {
          kind: "p",
          text: "Numbers keep it healthy while you are there. What stays when you leave?",
        },
      ],
    },
    {
      id: "s2-handover",
      title: "A handover pack passes when Harbour's IT team can run it on Monday",
      goal: "What does the receiving team need in its hands on the first Monday?",
      blocks: [
        {
          kind: "p",
          text: "Code handed over alone is a gift that breaks. The **handover pack** is everything else the receiving team needs. Test it with the **Monday test**: could they run this on Monday without calling you?",
        },
        {
          kind: "code",
          lang: "text",
          caption: "Harbour's handover pack",
          code: "Handover pack: Harbour Intake\nOwner     Harbour's two-person IT team, from the end of week 16\nRunbook   Model errors. A backed-up queue. Mailbox token expiry. A supplier\n          format change. A ledger rejection. Each has a symptom, a check and an action.\nRollback  Switch one supplier back to manual keying.\nEval set  One command reruns it. A Harbour engineer ran it unaided in week 16.\nCosts     Where the monthly bill is read, and what a normal month looks like.\nAccess    Every account and who holds it. FDE accounts removed at the end.\nOpen      The list agreed for phase two.",
        },
        {
          kind: "p",
          text: "Seven lines, each one an answer to a question Harbour's IT team would otherwise ask you. The owner is named. The runbook covers five failures, each with a symptom, a check and an action. The rollback is the one from go-live.",
        },
        {
          kind: "p",
          text: "The eval set reruns with one command, and a Harbour engineer ran it alone in week 16. That is the proof. The pack also says where the bill is read, who holds each account, and what was left for phase two.",
        },
        {
          kind: "p",
          text: "Have the receiving team do the deploy, not you. Watch where they stop. Each stop is a missing line in the runbook. Fix it while you are still there.",
        },
        {
          kind: "p",
          text: "Hand over the things you chose not to do as well. The Open line is that list. Scans and the reviewers' request for the PDF beside the fields sit on it. A short list of known limits stops the team being blamed for gaps that were agreed.",
        },
        {
          kind: "p",
          text: "Name the owner before the last week. A system with no owner decays. If nobody will take it, raise that as a risk with the sponsor, and do it early. The person who is paged at night must be a person, not a team alias.",
        },
        {
          kind: "p",
          text: "Remove your own access last. Harbour's pack lists every account and who holds it, and the FDE accounts come off at the end. That one line shows the customer the system is theirs.",
        },
        {
          kind: "widget",
          id: "fde-craft-handover-checklist",
          intro: "Three handover packages for the invoice pipeline. Judge each against the Monday test.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "How an interviewer tests handover",
          text: "Handover comes up in interviews as: what does a good handover look like? A strong answer lists the runbook, the eval set, the owner and the alerts, and says the receiving team ran the deploy while you watched. A weak answer says documentation and a training session.",
        },
        {
          kind: "quiz",
          id: "fde-craft03-q2",
          question: "How do you find the gaps in a runbook before you leave?",
          options: [
            "Read it aloud to the customer.",
            "Have the receiving team do a deploy and a rollback from it while you watch.",
            "Ask the sponsor to approve it.",
            "Add more pages.",
          ],
          answer: 1,
          explain: "A runbook is correct when someone unfamiliar can follow it. Doing so exposes every missing step.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next customer: handover pack",
          code: "Handover pack: <project>\nOwner     <who, from which date>\nRunbook   <the five likeliest failures>. Each has a symptom, a check and an action.\nRollback  <the way back>\nEval set  <the command>. <who ran it unaided, and when>\nCosts     <where the bill is read, what a normal month looks like>\nAccess    <every account and who holds it>. <your accounts removed at the end>\nOpen      <the list agreed for the next phase>",
        },
        {
          kind: "p",
          text: "Harbour's team now owns it. A week later, the finance director asks for more. What happens when Harbour asks for more?",
        },
      ],
    },
  ],
  recap: [
    "UAT, go-live and hyper-care each get a written plan, a slice, a stop rule and an end condition.",
    "Track active users, task completion, override rate and training every week, and send a status report with a decision in it.",
    "A handover pack passes the Monday test when the receiving team has run the deploy and the eval set unaided.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In rollout and handover I learned that I am done when the customer's team can run, change and evaluate the system without me. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["fde-craft-q05", "fde-craft-q14"],
};

export default chapter;
