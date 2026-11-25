import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "cloud-10-launch-decision",
  course: "cloud",
  number: 10,
  title: "The launch review lets the third team in, and the build team hands over",
  tagline: "Four conditions close, a real week tests the design, and AskPEP gets an owner.",
  minutes: 35,
  objectives: [
    "Check written conditions against dated evidence.",
    "Write a launch decision with stop rules that each have one owner.",
    "Set a real week's numbers beside the design and explain each gap.",
    "Say what the story claims and your lab doesn't do.",
    "Write a hand-over that lets the builder leave.",
  ],
  sections: [
    {
      id: "s1-conditions",
      title: "All four conditions closed, and each one points to a dated record",
      goal: "What must a launch review check, and where does the evidence come from?",
      blocks: [
        {
          kind: "p",
          text: "Yes, all four conditions are true, and the third team joins on Monday. The review got there by checking records, and nobody was asked for an opinion on them. It is Friday 8 January 2027.",
        },
        {
          kind: "p",
          text: "A launch review checks written conditions against dated evidence. Each condition gets one record, and the person who set the condition reads it. Anything that has not been measured stays on the list as a measurement with a date.",
        },
        {
          kind: "p",
          text: "Course 6 ended with four open conditions and a date of 18 December. That date failed in chapter 1 of this course, because the deployment did not exist yet. The conditions stayed the same.",
        },
        {
          kind: "compare",
          caption: "The four conditions from the design review, and the evidence for each. All dates after 11 December are invented.",
          columns: ["Condition", "Evidence", "Closed"],
          rows: [
            ["T11, retention jobs and redaction", "CUTOVER-NOTE on staging, then CANARY-001 into production", "18 December on staging, 23 December in production"],
            ["`answer-success` for two working weeks", "84 failures in 1,800 requests, where 90 were allowed. That is 0.9533.", "18 December"],
            ["Model Armor run live", "QUOTA-AND-RESIDENCY, p95 of 1,140 ms against the 2,000 ms line", "21 December"],
            ["ADR 0007 in code", "SERVICE-SIZING in the story, shipped in commit `5d2e9a1`", "17 December, in production 23 December"],
          ],
        },
        {
          kind: "p",
          text: "Chapters 1 to 8 added more that the design review never asked for. The pipeline, the canary, the budget, the kill switch and the restore all have records. The review reads those too, because a condition can pass while the service still cannot be run.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Launch reviews come up in interviews: how do you decide a system is ready?",
          text: "Launch reviews come up in interviews. Answer first: written conditions, each with dated evidence, and stop rules agreed before launch. Then name something you launched with an accepted risk, who owned it and when it gets reviewed. Say what was still unmeasured.",
        },
        {
          kind: "p",
          text: "The four conditions are closed. What did the people in the room still want before they said yes?",
        },
      ],
    },
    {
      id: "s2-review",
      title: "The launch review said go, with four stop rules agreed in advance",
      goal: "What does a launch decision record, and why write the stop rules first?",
      blocks: [
        {
          kind: "p",
          text: "A launch decision records who agreed, what is still open and what would stop the launch. Write the stop rules before launch, because in the middle of an incident nobody agrees on a line.",
        },
        {
          kind: "p",
          text: "Here is how the review went. Every remark and every time is invented.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "The product owner opened by asking, \"Is anything on the list unread?\" Engineering said the four conditions and OPS-READINESS-001 had all gone round on Thursday.",
            "The security reviewer asked about ADR 0009. They accepted it, and said, \"It stays on the list until 1 March, and I'll be the one who asks.\"",
            "The second team's lead said, \"If their tool slows us, pause their key.\" That became a stop rule, and the lead owns it.",
            "The third team's lead asked what they would see if a stop rule fired. Engineering said their calls would be refused with a `401`, and the on-call person would message them first.",
            "The product owner asked about the bill. Engineering said the pilot's figure was 180 dollars a month, and the bill at full traffic would be known by 15 January.",
            "Everyone agreed. The third team joins on Monday 11 January.",
          ],
        },
        {
          kind: "code",
          lang: "text",
          code: `# LAUNCH-REVIEW-001  Friday 8 January 2027
Present: product owner, security reviewer, second team's lead, third team's lead, engineering.
Production commit: 5d2e9a1. Decision: go. Third team joins Monday 11 January 2027.

Conditions from DESIGN-REVIEW-001
T11                      closed, in production 23 December
answer-success           closed, 0.9533 over two working weeks
Model Armor live         closed, p95 1,140 ms
ADR 0007                 closed, in production 23 December

Accepted risk
ADR 0009, IAP off on production. Owner: engineering. Review: 1 March 2027.

Stop rules, agreed before launch
Any attack passes the guards        KILL_SWITCH=actions       security reviewer
answer-success under 0.95, 2 days   pause the third team's key  second team's lead
Model and judges over 30 usd a day  pause the third team's key  product owner
Vertex 429s for 15 minutes          pause the third team's key  engineering

To measure by Friday 15 January
Flash quota. Model Armor p95. Infrastructure cost. Third team's traffic.`,
          caption: "The launch decision. Every value after 11 December is invented, and nothing here was run.",
        },
        {
          kind: "p",
          text: "Read the stop rules first. Each has a line, an action and one owner. The 30 dollars a day is one and a half times the 20 a day that a 600 dollar month allows.",
        },
        {
          kind: "p",
          text: "Then read the last two lines. The review said go with four things unmeasured, and it wrote down the date on which they stop being unknown.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# LAUNCH-REVIEW-<number>  <date>
Present:
Production commit:
Decision:

Conditions, with evidence and date:

Accepted risks, each with an owner and a review date:

Stop rules: line, action, owner:

To measure, and by when:`,
          caption: "For your next launch: no go without a stop rule that has one owner.",
        },
        {
          kind: "p",
          text: "The third team joined on Monday. What did a week of real traffic say?",
        },
      ],
    },
    {
      id: "s3-first-week",
      title: "The first week came in under the design, apart from one unannounced burst",
      goal: "Which design numbers does real traffic confirm, and which does it change?",
      blocks: [
        {
          kind: "p",
          text: "A first-week record sets each design number beside the measured one, and it explains every gap. The design said 1,000 requests a day. The week said 940 on average, with one day over.",
        },
        {
          kind: "p",
          text: "Here is the week of 11 to 15 January. Every figure is invented, and each one recomputes from the others.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "On Wednesday 13 January the build tool posted 120 desk jobs at the end of a release build. The lead had said 40.",
            "The queue held them. The burst of 40 took 307 seconds in chapter 3, so 120 took 921 seconds, about 15 minutes. No job was lost.",
            "The third team's lead said, \"Fifteen minutes at the end of a release is fine.\" The second team's lead said, \"I didn't notice anything.\"",
            "Their questions asked about different PEPs from the second team's, and cost slightly more to answer. Cost per successful answer came to 0.0131 against the design's 0.0115.",
            "No stop rule fired. The highest daily model spend was 15.21 dollars, about half the 30 dollar line.",
          ],
        },
        {
          kind: "code",
          lang: "text",
          code: `# FIRST-WEEK-001  Friday 15 January 2027
Week: Monday 11 to Friday 15 January. Commit: 5d2e9a1.

Third team's traffic, per day: 640, 710, 890, 760, 700. Total 3,700.
Pilot, 200 a day: 1,000.
All requests: 4,700. Average 940 a day. Design 1,000.
Busiest day: 13 January, 1,090. Peak hour 118. Design 111.

Measurement          Design or line       Measured
Flash quota          about 11 a minute    19 a minute at peak, limit 300
Model Armor p95      line 2,000 ms        1,210 ms
Infrastructure       unknown              38.50 usd for 5 days, 231 for 30
Model and judges     353.64 a month       59.22 for 5 days, 355.32 for 30
Cost per success     0.0115, limit 0.02   0.0131
answer-success       0.95 target          4,512 of 4,700 = 0.96, 188 failed, 235 allowed
Hourly repeat        reopen at 20%        6%, so the cache stays off

Spend for 30 days at this rate: 586.32 usd. Budget: 900 usd.
Thirty days at a weekday rate overstates the month, because weekends are quiet.
Stop rules fired: none.`,
          caption: "The first week against the design. Every figure is invented, and nothing was run.",
        },
        {
          kind: "p",
          text: "Read the Measured column against the Design column. Flash has about 15 times the room it needs at peak, where the design said 27. The room shrank, and it is still ample.",
        },
        {
          kind: "p",
          text: "Then read the cost. Unit cost rose 14 per cent, and traffic came in 6 per cent lower, so the monthly total landed within 2 dollars of the design. Those two errors cancelled out, and next month they might not.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# FIRST-WEEK-<number>  <date>
Week:
Traffic per day, by team:

Measurement    Design or line    Measured

Spend for 30 days at this rate, against the budget:
What the rate overstates or understates:
Stop rules fired:`,
          caption: "For your next launch: compare the first real week with the design, row by row.",
        },
        {
          kind: "p",
          text: "The four measurements are in, and the project is nearly done. Before the hand-over, what does your own lab still not do?",
        },
      ],
    },
    {
      id: "s4-lab-differs",
      title: "Your lab still differs from AskPEP's story in three places, and nothing here ran live",
      goal: "What did the story claim that your lab does not do?",
      blocks: [
        {
          kind: "p",
          text: "Three things in the story are not in the capstone code, and you should say so if you ever talk about this project. The story's team built them. Your lab does not have them.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "The capstone's `desk_job` in `api.py` passes no route. ADR 0007 is a decision in the story, and every queued run in your lab traces as `agent`.",
            "The capstone has no retention job and no redaction at write. T11 is closed in the story only.",
            "The capstone's `vertex.tf` sets `VERTEX_LOCATION` from `var.region`. ADR 0008's `eu` value is a story decision, so your lab calls the region you chose.",
          ],
        },
        {
          kind: "p",
          text: "Nothing in this course has run against a live Google Cloud project. The Terraform, the workflows and every `gcloud` line were written from the documents. Each step's expected output says whether it was recorded or described.",
        },
        {
          kind: "p",
          text: "Every value after 11 December 2026 is invented. That covers the dates, the bills, the timings and the remarks. The method is real, and the numbers are there so that you can practise reading them.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Say what you built, and only that",
          text: "You did this course's lab and read this story. If you describe AskPEP elsewhere, claim the code you wrote and the tests you ran. The story's drills and the first week didn't happen.",
        },
        {
          kind: "p",
          text: "That is the honest state of the lab. What does the team need in order to run AskPEP without the people who built it?",
        },
      ],
    },
    {
      id: "s5-hand-over",
      title: "The last hand-over leaves AskPEP with an owner and no open build work",
      goal: "What must a hand-over say for the builder to leave?",
      blocks: [
        {
          kind: "p",
          text: "A hand-over is complete when the owner can run the service with nobody from the build in the room. It says what is settled, what still has to happen, and who holds each item.",
        },
        {
          kind: "p",
          text: "Course 6 ended with a hand-over in five parts. Here is the same shape, filled in for the last time on Monday 18 January 2027. The on-call group takes over the service on that day.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# HAND-OVER-FINAL  Monday 18 January 2027
Service: AskPEP. Commit: 5d2e9a1. Region: europe-west3. Model location: eu.
Owner from today: the on-call group. Teams live: second and third.

Settled
Cloud Run, Cloud SQL, Cloud Tasks on, cache off, routing on, chunk limit 512.
Canary at 10, 50 and 100 percent. Gate of 104 questions before every deploy.

Must ship
Nothing outstanding. T11 and the ADR 0007 route label went out on 23 December.

Must measure
Flash quota, Model Armor p95, infrastructure cost and traffic: all measured.
Monthly from now on: the review, against 600 usd for the model and judges.

Must not change without an ADR
Everything under Settled. ADR 0008, the eu model location.

Open with a date
ADR 0009, IAP off on production. Owner: engineering. Review: 1 March 2027.
Port request from the group on Azure: answered, with no commitment.

People waiting: nobody.`,
          caption: "The last hand-over. Its shape comes from course 6, and every value is invented.",
        },
        {
          kind: "p",
          text: "Read the last line first. In course 6 that line said the third team was waiting, and it set the date for everything after it. Now it says nobody, and that is how you know the project is over.",
        },
        {
          kind: "p",
          text: "One item is still open, and it has an owner and a date. A hand-over with nothing open is usually one that is hiding something.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# HAND-OVER-FINAL  <date>
Service, commit, region:
Owner from today:

Settled:
Must ship:
Must measure:
Must not change without a decision record:
Open with a date:
People waiting:`,
          caption: "For your next hand-over: finish when the last line says nobody.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Ending an engagement comes up in interviews: what do you leave behind?",
          text: "Ending an engagement comes up in interviews. Answer first: a named owner, a runbook that has been drilled, and a list of what is settled and what is open. Then say what you did to prove the team could run it without you.",
        },
        {
          kind: "p",
          text: "AskPEP began in course 1 as one service that answered questions about Python's PEPs. It gained agents and guards, then evaluation, operations and an approved design. Now two teams use it, and someone else owns it. The project ends here.",
        },
      ],
    },
  ],
  recap: [
    "A launch review checks written conditions against dated evidence.",
    "Stop rules are agreed before launch, and each has one line, one action and one owner.",
    "AskPEP's first week came in near the design, because a higher unit cost and lower traffic cancelled out.",
    "Your lab has no route on `desk_job`, no retention job and no `eu` location, and nothing here ran live.",
    "A hand-over is done when the owner can run the service and the last line says nobody is waiting.",
  ],
  reinforcement: "I am becoming a forward-deployed AI engineer. I can take a system through its launch decision, measure it against its design and hand it over to the people who will run it.",
  interviewIds: ["cloud-q38", "cloud-q39"],
};

export default chapter;
