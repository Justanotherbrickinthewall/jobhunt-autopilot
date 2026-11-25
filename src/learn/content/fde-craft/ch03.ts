import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "fde-craft-plan-and-estimate",
  course: "fde-craft",
  number: 3,
  title: "The plan and its estimate",
  tagline: "How long will it take, and in what order? Split the work into milestones, give each a range in weeks, and name the first thing you would cut.",
  minutes: 10,
  objectives: [
    "Split a chosen workflow into milestones that each end in a demo, with the pilot first.",
    "Give a range in weeks per milestone, find the critical path and name the first cut.",
    "Write a milestone plan for a new customer from a blank template.",
  ],
  sections: [
    {
      id: "s2-decomposition",
      title: "Milestones that each end in a demo let the customer stop or go early",
      goal: "In what order do you build, so that each slice proves something to the customer?",
      blocks: [
        {
          kind: "p",
          text: "How long will it take, and in what order? Order comes first. A length belongs to a piece of work, so the pieces must exist before you can size them.",
        },
        {
          kind: "p",
          text: "A **milestone** is a slice of work that ends with something the customer can see and judge. A half-built pipeline is a delay with a name.",
        },
        {
          kind: "p",
          text: "Chapter two defined the pilot as one workflow with one metric, where a person posts. Here the pilot is the opening milestones. Put it first, because it tests the riskiest assumption.",
        },
        {
          kind: "p",
          text: "At Harbour Supplies, the riskiest assumption is that invoices can be read well enough to post without a clerk. So the early demos show real invoices read correctly. Here are six milestones.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Data access and baseline. The demo is fifty real invoices, with today's error rate and handling time.",
            "Extract born-digital invoices. The demo is the same fifty read by the system, with every wrong field shown.",
            "Eval set and report. The eval set is a fixed set of real invoices with known right answers. The demo is a score the customer can rerun.",
            "Review queue. The demo is a doubtful invoice reaching a clerk with the reason attached.",
            "Post approved invoices. The demo is one approved invoice appearing in the ledger.",
            "Handover and runbook. The runbook is the short guide that tells the customer's engineers how to run and fix the system.",
          ],
        },
        {
          kind: "p",
          text: "Milestones one to four are the pilot. After the fourth, the customer reads the report and chooses go, extend or stop. The fifty invoices are the demo set. The 200 invoices in the charter are the baseline sample and the eval set.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "A plan with one demo at the end is a single large bet",
          text: "It hides every risk until the last week.",
        },
        {
          kind: "quiz",
          id: "fde-craft06-q2",
          question: "Which opening milestone best fits a pilot-first plan for the invoice brief?",
          options: [
            "Choose a vector database and set up the cloud account.",
            "Build the posting step so that value reaches the ledger as early as possible.",
            "Read fifty real born-digital invoices, show every wrong field, and compare with today's error rate.",
            "Write the full architecture document and get it signed.",
          ],
          answer: 2,
          explain: "It tests the riskiest assumption on the customer's own data and ends in a demo. The other options end in setup, a risky write to the ledger, or a document.",
        },
        {
          kind: "p",
          text: "Milestones need a length. That is the estimate.",
        },
      ],
    },
    {
      id: "s4-estimate",
      title: "An estimate is a range per milestone, plus the first thing you would cut",
      goal: "How long will it take, and what do you cut when the date is fixed?",
      blocks: [
        {
          kind: "p",
          text: "Give every milestone a low and a high number of weeks. The low is a clean run. The high allows for late data and rework after a demo.",
        },
        {
          kind: "p",
          text: "Then find the **critical path**. It is the longest chain of milestones that depend on each other. Work off it can slip without moving the end date.",
        },
        {
          kind: "p",
          text: "At Harbour, data access takes 1 to 2 weeks and extraction 2 to 4. The review queue takes 2 to 3, posting 3 to 6 and handover 1 to 2. Those five sit in one chain. The eval set runs beside it.",
        },
        {
          kind: "p",
          text: "The lows add to 9 weeks and the highs to 17. The **band** is that range, nine to seventeen weeks, with the middle at thirteen. Say the band, then how sure you are.",
        },
        {
          kind: "p",
          text: "Now the sponsor says: we need it live in twelve weeks. Do not squeeze the weeks. Cut scope. Posting has the widest range, sits on the critical path and writes to the ledger. Without it the chain runs 6 to 11 weeks, and a clerk posts by hand.",
        },
        {
          kind: "p",
          text: "Name the **first cut** before you are asked. It is the milestone you would drop first if the date is fixed. Cut by value and risk.",
        },
        {
          kind: "widget",
          id: "fde-craft-estimate-ladder",
          intro: "Put six milestones in a valid start order, then read the critical path off the ladder. Choose the cut that brings the top of the range to twelve weeks.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Summing the lows and the highs gives the widest honest band",
          text: "Every milestone hitting its high end is unlikely, so the band is cautious. Offer to narrow it once the first two milestones have run.",
        },
        {
          kind: "quiz",
          id: "fde-craft06-q5",
          question: "Three milestones form one chain: 3 to 5 weeks, 2 to 3 weeks and 4 to 6 weeks. What band do you state?",
          options: [
            "Four weeks, the average of the three milestones.",
            "9 to 11 weeks, from the shortest chain of two.",
            "9 to 14 weeks, from the sum of the lows and the sum of the highs.",
            "14 weeks, because you always quote the high end.",
          ],
          answer: 2,
          explain: "Lows sum to 3 plus 2 plus 4, which is 9. Highs sum to 5 plus 3 plus 6, which is 14. A band shows the uncertainty. A single number hides it.",
        },
        {
          kind: "p",
          text: "Now put the plan on one page, as Harbour's customer saw it.",
        },
      ],
    },
    {
      id: "harbour-plan",
      title: "Harbour's plan lands at sixteen weeks, with posting as the first cut",
      goal: "What does the finished milestone plan look like, and how do you write one for the next customer?",
      blocks: [
        {
          kind: "p",
          text: "A milestone plan lists each milestone with its weeks and its demo, and marks the decision points.",
        },
        {
          kind: "p",
          text: "The sponsor wanted it live in twelve weeks. Posting was the first cut from that date, so a person posts until the release window. Live in week 10 is inside twelve. The plan itself lands at 16 weeks, above the middle of the band, because it holds one extension and one week of staff testing.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "Harbour's milestone plan, whole.",
          code: `Milestone plan: Harbour Intake (weeks from signing)
M1  Data access and baseline   weeks 1-2    Demo: fifty real invoices, with today's
                                            error rate and handling time
M2  Extract born-digital       weeks 3-5    Demo: the same fifty read by the system,
                                            with every wrong field shown
M3  Eval set and report        weeks 4-5    Demo: a held-back set and a score the
                                            customer can rerun
M4  Review queue               weeks 6-8    Demo: a doubtful invoice reaches a clerk
                                            with the reason attached
    Go or stop decision        week 8
    Staff test it              week 9
    Live, with a person posting  week 10    Tideway Packaging first
    Other born-digital formats   weeks 10-13
M5  Post approved invoices     weeks 10-13  Demo: one approved invoice in the ledger.
                                            Goes out in the release window, end of week 13.
M6  Handover and runbook       weeks 14-16  Demo: a customer engineer reruns the
                                            eval set unaided`,
        },
        {
          kind: "p",
          text: "Read it out like this. Milestones one to four are the pilot, and the go or stop decision falls at week eight. Staff test the system in week nine. Tideway Packaging goes live in week ten with a person posting. Posting goes out in the release window at the end of week thirteen, and handover ends at week sixteen.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next customer.",
          code: `Milestone plan: <customer> (weeks from signing)
M1  <name>   weeks _-_   Demo: <what the customer sees>
M2  <name>   weeks _-_   Demo:
M3  <name>   weeks _-_   Demo:
M4  <name>   weeks _-_   Demo:
    Go or stop decision   week _
    Staff test it         week _
    Live, with a person posting   week _   <first supplier>
M5  <name>   weeks _-_   Demo:  <release window>
M6  Handover and runbook   weeks _-_   Demo: <what they rerun unaided>`,
        },
        {
          kind: "p",
          text: "The plan has a cost. How do you show it is worth paying for? Chapter four takes that next.",
        },
      ],
    },
  ],
  recap: [
    "A milestone ends in a demo the customer can judge, and the pilot comes first.",
    "Give each milestone a range in weeks, add the lows and the highs along the critical path, and say how sure you are.",
    "When the date is fixed, cut scope rather than squeezing weeks, and name the first cut before you are asked.",
    "Harbour's plan lands at sixteen weeks, with posting as the first cut and a person posting until the release window.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In the plan and its estimate I learned to split the work into milestones that each end in a demo, give a range in weeks along the critical path, and name the first cut. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["fde-craft-q12"],
};

export default chapter;
