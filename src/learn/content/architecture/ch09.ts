import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "architecture-09-design-decision",
  course: "architecture",
  number: 9,
  title: "The design is approved, and the third team still waits",
  tagline: "One page of design, one review meeting, three open conditions and a clear list for the next course.",
  minutes: 40,
  objectives: [
    "Read a whole design against its requirements on one page.",
    "Say why one good week doesn't meet a two-week condition.",
    "Separate approving a design from admitting a new team.",
    "Write down exactly what the next piece of work inherits.",
  ],
  sections: [
    {
      id: "s1-design-on-one-page",
      title: "Five requirements pass, R6 is unmeasured, and R7 has not held",
      goal: "What does the whole design say, and how does it score against the requirements?",
      blocks: [
        {
          kind: "p",
          text: "The third team doesn't join today, and the design is approved anyway. Those are two separate decisions. Friday 11 December is the review the third team's lead has waited for. You bring one page, because nobody in the room will read eight chapters.",
        },
        {
          kind: "p",
          text: "The page joins the seven ADRs to the seven requirements. R6 now has a design behind it, and the queue carries the runs nobody is waiting for. Its measured column still holds one trace, so its verdict is an assumption. Five requirements pass. R7 has a target and a recent number, and it has not held for long enough.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "The design summary, whole. Every figure belongs to the story, and prices are placeholders.",
          code: `AskPEP design summary, 11 December 2026
Design traffic: 1,000 requests a day. 800 are the third team's, from one estimate.

Req  Says                                Target    Measured       State
R1   Answer items that pass the graders    0.80      0.91 (21/23)   passes
R2   Right PEPs in the top six             0.80      0.93 (26/28)   passes
R3   /ask and /agent within 10 s           0.95      0.962          passes, margin 1.2 points
R4   Spend per successful task             0.02 usd  0.0115 usd     passes, placeholder prices
R5   Attacks that get through              0.05      0.00 (0/25)    passes
R6   A desk run ends within 60 s           60 s      one trace, 38.4 designed, not measured
R7   Requests that end in a good answer    0.95      0.9525, 4 days not yet held

Decision                        ADR    Setting
Route triage to Flash           0001   ROUTES on, Claude fallback
Keep the retrieval stack        0002   voyage-3.5, pgvector, rerank-2.5, chunk limit 512
Keep LangGraph on Cloud Run     0003   reopen at 8 operator hours a week
Queue the build tool            0004   ASYNC_MODE=cloud_tasks, 5 concurrent, 120 s deadline
Leave the cache off             0004   CACHE_ENABLED=false, reopen at 20% hourly repeat
One Postgres, delete by age     0005   retention jobs, reader limit 50,000
Guards on the path              0006   four stages, one reask, judge sample 0.1
Queued runs get their own route 0007   agent.queued, under R6 only

Bill: 353.64 usd a month of model and judge spend. Ceiling 600. Infrastructure not priced.
Open: T11. R7 for two working weeks. Model Armor run live. ADR 0007 in code.`,
        },
        {
          kind: "p",
          text: "Read the State column first. Two rows aren't passes, and they are R6 and R7. Then read the Open line. It holds four items, and the third team waits on all four.",
        },
        {
          kind: "p",
          text: "The R7 row looks like a pass. Why does the page still say not yet?",
        },
      ],
    },
    {
      id: "s2-one-good-week",
      title: "Answer-success reached its target, but one week is not the two the condition names",
      goal: "Why doesn't a good week meet a two-week condition?",
      blocks: [
        {
          kind: "p",
          text: "The condition asks for two working weeks at target, and AskPEP has four days. The objective started at 0.8715 in the week of the incident. The next week read 0.928 with 72 failures in 1,000 requests. The incident had left the window, so that rise fixed nothing.",
        },
        {
          kind: "p",
          text: "The chunk swap reached the live store on Monday 7 December. From Monday to Thursday the desk failed 38 of 800 requests, so the rate reads 0.9525. At a target of 0.95, those 800 requests allow 40 failures. Only two failures of room remain, and that is 5% of the budget.",
        },
        {
          kind: "compare",
          caption: "Answer-success since the pilot began. The figures are invented for the story.",
          columns: ["Period", "Requests", "Failed", "Answer-success", "Error budget left"],
          rows: [
            ["24 to 27 November", "825", "106", "0.8715", "Spent, the incident week"],
            ["30 November to 4 December", "1,000", "72", "0.928", "-44%"],
            ["7 to 10 December", "800", "38", "0.9525", "5%"],
          ],
        },
        {
          kind: "p",
          text: "The third team's lead says four good days should be enough. The product owner answers that the first working week ends today and the second ends on 18 December. Nobody chose those dates to be awkward. They come from the condition written on 30 November.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "A condition that bends once is no longer a condition",
          text: "The third team would add four times the traffic. An error budget with 5% left can't absorb that if the rate slips. Waiting one more week costs the third team five working days. Moving the date costs the review its meaning.",
        },
        {
          kind: "quiz",
          id: "architecture09-q1",
          question: "Answer-success reads 0.9525 over four days, against a target of 0.95. What is the right reading?",
          options: [
            "The objective is met, so the third team can join.",
            "The target is reached, and the condition isn't met until two working weeks have held.",
            "The objective is missed, because the error budget is nearly spent.",
            "The number is unusable, because 800 requests are too few.",
          ],
          answer: 1,
          explain: "The target and the condition are different things. The rate is above target, and the condition asks that it stay there for two working weeks. Four days can't show that.",
        },
        {
          kind: "p",
          text: "So the third team waits. Does that also stop the design?",
        },
      ],
    },
    {
      id: "s3-review-decision",
      title: "Approving a design and admitting a team are two decisions",
      goal: "What did the review decide, and who owns each open item?",
      blocks: [
        {
          kind: "p",
          text: "The design is approved because the review tested it, and it survived with one correction. Admission is a different question. It depends on evidence from a running system. Mixing the two would block the next piece of work for a week and teach nothing.",
        },
        {
          kind: "p",
          text: "The security reviewer accepts the T11 plan and won't sign until the jobs run on staging. The product owner approves the budget, with the warning that infrastructure is not yet priced. The third team's lead asks for one date. You give 18 December as the earliest, and only if all four items close.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "DESIGN-REVIEW-001, whole. The roles are fictional.",
          code: `DESIGN-REVIEW-001
Date: 11 December 2026
Present: product owner, security reviewer, second team's lead, third team's lead, engineering.

Decision 1. The design in docs/design.md and ADRs 0001 to 0007 is approved.
Decision 2. The third team does not join today.
Earliest date for the third team: 18 December 2026, if every condition below has closed.

Condition                              Owner              Due or test                State today
T11 retention and redaction on staging engineering        14 December 2026           Design agreed, code not shipped
Answer-success at 0.95, two weeks      product owner      7 to 18 December 2026      0.9525 over 4 days
Model Armor run live, classifier note  security reviewer  Before any outside user    Not run, no template yet
ADR 0007 in code                       engineering        Before the queue goes live Not done

Accepted risk: names in free text are not caught until the Model Armor result is known.
Accepted by the security reviewer on 8 December 2026.

Not decided here: infrastructure cost, Flash quota at 1,000 a day, the third team's real traffic.
Each needs a running deployment, and each goes to the next piece of work.

Second team: stays on the pilot, unchanged.`,
        },
        {
          kind: "p",
          text: "Read the two decisions as separate sentences. A reader who stops after the second one will think the review failed. Then read the Not decided line. It says what the design can't know from a desk, which is what the next course has to find out.",
        },
        {
          kind: "p",
          text: "Reuse this record when a design and a launch reach the same meeting. Give each its own decision and its own conditions.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next design review, the same record with blank values.",
          code: `DESIGN-REVIEW-NNN
Date:
Present:

Decision 1. The design is
Decision 2. The launch is
Earliest date:

Condition   Owner   Due or test   State today

Accepted risk:
Accepted by:

Not decided here:`,
        },
        {
          kind: "p",
          text: "The paper is finished. What exactly does the next course pick up?",
        },
      ],
    },
    {
      id: "s4-what-course-seven-inherits",
      title: "Course 7 inherits a decided design with four jobs that need a running system",
      goal: "What is settled, what is open, and what can only be learned by deploying?",
      blocks: [
        {
          kind: "p",
          text: "Course 7 should change no decision in this list without a new ADR. The design settled what to build, and it left the how of the cloud open on purpose. The pilot still serves the second team alone. Nothing here has been deployed the way the design describes.",
        },
        {
          kind: "list",
          items: [
            "The service runs on Cloud Run with one Postgres on Cloud SQL, in `europe-west3`.",
            "Cloud Tasks carries the build tool's desk runs, with `ASYNC_MODE=cloud_tasks`, five concurrent dispatches and a 120-second deadline.",
            "The cache stays off, routing stays on with the triage route, and the chunk limit stays at 512.",
            "ADR 0007 goes into the code before the queue goes live.",
          ],
        },
        {
          kind: "p",
          text: "Three figures can only come from a real deployment. They are the Flash quota at 1,000 requests a day, Model Armor's own p95, and the infrastructure bill that section 7 leaves out. Each one has a line in the review waiting for it.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "The hand-over note, whole, followed by the same note with blank values.",
          code: `HAND-OVER: AskPEP design to deployment, 11 December 2026
Settled:   Cloud Run, Cloud SQL, Cloud Tasks on, cache off, routing on, chunk limit 512.
Must ship: T11 jobs and redaction. ADR 0007 route label.
Must measure: Flash quota. Model Armor p95. Infrastructure cost. Third team's traffic.
Must not change without an ADR: everything under Settled.
People waiting: the third team, earliest 18 December 2026.

HAND-OVER: <system> <from> to <to>, <date>
Settled:
Must ship:
Must measure:
Must not change without an ADR:
People waiting:`,
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Design reviews come up in interviews: what would you not decide on paper?",
          text: "Answer first: anything that needs a running system. Name the design decisions you did settle, with their numbers. Then name what you left open on purpose, such as quota under real load or the infrastructure bill. Say who owns each item and what test would close it.",
        },
        {
          kind: "p",
          text: "The design is approved and the conditions have owners. How does AskPEP get from one pilot to the deployment this page describes? Course 7 starts there.",
        },
      ],
    },
  ],
  recap: [
    "The summary page joins seven requirements to the ADRs. Five pass, R6 is designed but unmeasured, and R7 has not held long enough.",
    "Answer-success reads 0.9525 over four days, and the condition asks for two working weeks.",
    "DESIGN-REVIEW-001 approves the design and keeps the third team out until at least 18 December 2026.",
    "Course 7 inherits the settled design, two things to ship and four things to measure.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. I can keep approving a design apart from admitting the people who will depend on it. I write down what is settled, who owns what is open and what only a running system can tell me.",
  interviewIds: ["architecture-q21", "architecture-q22"],
};

export default chapter;
