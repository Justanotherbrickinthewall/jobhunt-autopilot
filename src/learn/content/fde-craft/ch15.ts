import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "fde-craft-06-the-scoping-round",
  course: "fde-craft",
  number: 15,
  title: "The scoping round",
  tagline: "You have told your own project as a story. What do you do when someone hands you a new vague problem? Replay chapters one to three in six minutes.",
  minutes: 15,
  objectives: [
    "Say what a scoping round tests and how to spend the time.",
    "Choose the five questions that change the scope, and say what each answer changes.",
    "Deliver the questions, the breakdown, the plan and the estimate as a spoken answer in six minutes.",
  ],
  sections: [
    {
      id: "s1-format",
      title: "A scoping round judges your questions, your breakdown, your risk sense and your estimate",
      goal: "What does a scoping round test, and how do you spend the time?",
      blocks: [
        {
          kind: "p",
          text: "A story looks back. A scoping round looks forward. Someone hands you a new vague problem, and you must turn it into a plan. What do you do then?",
        },
        {
          kind: "p",
          text: "A **scoping round** is an interview where the interviewer plays a customer. They say one sentence, such as: we want to stop keying invoices by hand. You then have 30 to 45 minutes to turn that sentence into a plan. The round comes up in interviews. Some companies call it a decomposition round.",
        },
        {
          kind: "p",
          text: "You have already done this work. Chapter one gave you the questions. Chapter two gave you the breakdown and the pilot. Chapter three gave you the milestones and the estimate. The round asks you to replay all three, out loud and against the clock.",
        },
        {
          kind: "p",
          text: "Formats differ, so ask at the start which kind of round it is. In a common format the plan and the estimate matter most. Other rounds ask for an architecture. Either way, architecture is a matter of order. Plan first, give the shape of the solution in one sentence per step, and go deeper only if the interviewer wants it.",
        },
        {
          kind: "p",
          text: "The round tests whether you could be sent to a customer alone. Four things are judged.",
        },
        {
          kind: "compare",
          caption: "The weak version is the default under pressure.",
          columns: ["Judged", "Strong", "Weak"],
          rows: [
            ["Questions", "Asks about volume, data access, review and the success bar first", "Asks which model to use, or starts designing"],
            ["Breakdown", "Splits the problem, then the work into milestones with demos", "One big build with a demo at the end"],
            ["Risk", "Names the two risks most likely to sink the plan", "Lists ten risks with no order"],
            ["Estimate", "A range in weeks per milestone, the critical path and the first cut", "One number, or no number at all"],
          ],
        },
        {
          kind: "callout",
          tone: "insight",
          title: "The interviewer holds facts back until you ask",
          text: "A fact you never ask about stays hidden, and silence counts as an assumption. If the customer has six suppliers rather than six hundred, the interviewer will say so late, and your plan will look careless.",
        },
        {
          kind: "quiz",
          id: "fde-craft06-q1",
          question: "Ten minutes in, you are drawing boxes for the extraction service. The interviewer has not asked for a design. What should you do?",
          options: [
            "Carry on. Technical depth is what a scoping round rewards most.",
            "Give the shape of the solution in one sentence per step, return to the questions and the plan, and offer more depth later.",
            "Skip to the estimate and leave the questions out.",
            "Ask the customer to draw the boxes.",
          ],
          answer: 1,
          explain: "Architecture is a matter of order. Boxes drawn first take time from the questions and the estimate. One sentence per step shows you have a design, and the interviewer can ask for more.",
        },
        {
          kind: "p",
          text: "Questions come first in the round, so they come first here.",
        },
      ],
    },
    {
      id: "s3-questions",
      title: "Five questions change the scope more than any others",
      goal: "Which questions change what you build, how long it takes or whether to build at all?",
      blocks: [
        {
          kind: "p",
          text: "You cannot ask everything in 15 minutes, so ask five questions that reliably change the plan.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Ask how many invoices arrive each month and from how many suppliers. The count sizes the prize and decides whether a manual queue is enough.",
            "Ask who can release fifty real invoices this week and what must be signed first. Data access fixes the date of the first demo.",
            "Ask who checks the doubtful invoices and how fast. The answer sets the size of the review queue.",
            "Ask what error rate would make the finance team trust the system. Without a bar, no demo can pass or fail.",
            "Ask who runs it after you leave. The answer changes the handover work and the tools you can pick.",
          ],
        },
        {
          kind: "p",
          text: "Take volume as the worked case. Harbour Supplies gets about 4,000 invoices a month, at six minutes each. That is 400 hours a month. If only 40 invoices arrived, no pipeline would pay for itself.",
        },
        {
          kind: "p",
          text: "Which model to use, or whether to add a dashboard, changes nothing yet. Ask those only after the five.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "A customer says they want to automate invoices. What do you ask first?",
          text: "Open with the answer: volume, data access, who reviews, what good looks like, and who owns it after. Then say what each answer changes. Interviewers push on what you do when the customer will not answer. Say that you state an assumption aloud, give it a number, and mark it as a risk.",
        },
        {
          kind: "quiz",
          id: "fde-craft06-q3",
          question: "The customer says: make invoice handling faster. Which question changes the plan most?",
          options: [
            "Which AI model do you prefer?",
            "Would you like a dashboard?",
            "Can we use our usual framework?",
            "How long does one invoice take today, and how many arrive each month?",
          ],
          answer: 3,
          explain: "Time per invoice and volume give the size of the prize and the baseline. The other questions are about solutions and change nothing in the scope.",
        },
        {
          kind: "quiz",
          id: "fde-craft06-q4",
          question: "The customer refuses to say who would review doubtful invoices. What do you do?",
          options: [
            "State an assumption, such as one clerk clearing the review queue within a day, cost it, and list it as an open risk.",
            "Drop the review queue from the plan.",
            "End the round and ask for another interview.",
            "Assume full automation, because nobody reviews.",
          ],
          answer: 0,
          explain: "A stated assumption keeps the plan moving and shows the customer what you are betting on. Dropping the review queue removes the safety net.",
        },
        {
          kind: "widget",
          id: "fde-craft-scope-drill",
          intro: "Read the brief, pick four of the five questions that change the plan, then choose the milestone plan. Watch which rubric rows each plan misses.",
        },
        {
          kind: "p",
          text: "The answers give you facts. The breakdown and the estimate turn them into a plan, and you must say that plan aloud in six minutes.",
        },
      ],
    },
    {
      id: "s5-spoken-answer",
      title: "The six-minute spoken answer follows a fixed order and ends on the cut and the risk",
      goal: "How do you deliver the whole plan aloud, so that nerves do not choose the structure?",
      blocks: [
        {
          kind: "p",
          text: "Sooner or later the interviewer says: give me your plan in six minutes. Under pressure, people spend four minutes on the first idea and none on the estimate. Have a fixed order ready.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "The six-minute order. Each block has one job.",
          code: "Minute 1     Restate the problem and say your assumptions.\nMinute 2     Name the questions you asked and what each one changed. Name the workflow you picked.\nMinutes 3-4  Go through the milestones. Give each one a demo.\nMinute 5     Give the band, the critical path and your confidence.\nMinute 6     Name the first cut and the top risk. Stop.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "The whole six minutes for Harbour Supplies, as you would say it.",
          code: "Minute 1\nYou want finance to stop keying about 4,000 invoices a month, which I put at 400 hours of work.\nI am assuming most are born-digital PDFs, and that a clerk will check the doubtful ones.\n\nMinute 2\nI asked about volume, data access, who reviews, what good looks like and who owns it after.\nData access sets the date of the first demo. Review sets the size of the review queue.\nI picked one workflow: reading supplier invoices up to the ledger's approval.\nA person posts to the ledger. The chatbot and scans are out of scope.\n\nMinutes 3 and 4\nThere are six milestones, and each one ends in a demo on your own invoices.\n1. Data access and baseline: fifty real invoices, with today's error rate.\n2. Extract born-digital invoices: the same fifty, with every wrong field shown.\n3. Eval set and report: a held-back set and a score you can rerun.\n4. Review queue: a doubtful invoice reaches a clerk with the reason attached.\n5. Post approved invoices: one approved invoice in the ledger.\n6. Handover and runbook: your engineer reruns the eval set unaided.\nThe first four are the pilot. You decide go, extend or stop after the fourth.\n\nMinute 5\nThe band is nine to seventeen weeks, with the middle at thirteen. The critical path\nruns through data access, extraction, review, posting and handover.\nI am about nine times in ten sure of the band.\nI can narrow it once the first two milestones have run.\n\nMinute 6\nIf you need it live in twelve weeks, I cut automated posting first.\nA clerk posts approved invoices by hand until the release window.\nThe top risk is late data, because no demo runs without real invoices.\nI would ask for fifty invoices in week one.",
        },
        {
          kind: "p",
          text: "Read the points aloud. Minute one gives the size of the prize and two assumptions. Minute two names the questions and the one workflow. Minutes three and four give six milestones with a demo each. Minute five gives the band and the critical path. Minute six names the first cut, the top risk and one request.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next customer. Fill each line before you speak.",
          code: "Minute 1     Problem in one sentence: ___ . Size of the prize: ___ . Assumptions: ___ and ___ .\nMinute 2     Questions asked: ___ , ___ , ___ . What each changed: ___ . Workflow picked: ___ .\nMinutes 3-4  Milestone 1 to N, one line each: ___ . Demo for each: ___ . Pilot ends at: ___ .\nMinute 5     Band: ___ to ___ weeks. Critical path: ___ . Confidence: ___ .\nMinute 6     First cut: ___ . Top risk: ___ . One request: ___ .",
        },
        {
          kind: "p",
          text: "If the interviewer asks how extraction works, give one sentence for each step of the solution. Then offer to go deeper. Go into depth when they ask for it, and only after the estimate is on the table. Drifting into architecture early costs you the minute you need for the estimate.",
        },
        {
          kind: "p",
          text: "Pick the top risk by asking what would sink the plan. For Harbour it is late data, because no demo runs without real invoices.",
        },
        {
          kind: "p",
          text: "End on a decision: the cut you would make and the risk you would watch. A closing list of worries leaves them with worry instead of a plan.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Plan this project for me in six minutes",
          text: "Open with the answer: a breakdown, then six milestones that each end in a demo, with the pilot first. Quote nine to seventeen weeks and name posting as the first cut. Interviewers push on what you did not ask, and why the band is that wide.",
        },
        {
          kind: "quiz",
          id: "fde-craft06-q6",
          question: "You are four minutes in and have only covered the first milestone. What do you do?",
          options: [
            "Keep the detail and skip the estimate.",
            "Ask the interviewer for more time.",
            "Restart from the questions.",
            "Cover the remaining milestones in one line each, then give the band, the cut and the risk.",
          ],
          answer: 3,
          explain: "The estimate and the cut are what the interviewer scores most. Compressing the later milestones protects them. A long account of the first milestone does not.",
        },
        {
          kind: "p",
          text: "A plan said aloud is half the test. What do you do at a keyboard with the clock running? Chapter sixteen takes that next.",
        },
      ],
    },
  ],
  recap: [
    "A scoping round replays chapters one to three aloud. It judges questions, breakdown, risk and the estimate.",
    "Five questions change the scope: volume, data access, who reviews, what good looks like, and who owns it after.",
    "The six-minute answer runs in a fixed order: problem, questions, milestones, band, then the first cut and the top risk.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In the scoping round I learned to ask the five questions that change the plan, replay the breakdown and the milestones, and say a plan in six minutes that ends on the first cut and the top risk. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["fde-craft-q11"],
};

export default chapter;
