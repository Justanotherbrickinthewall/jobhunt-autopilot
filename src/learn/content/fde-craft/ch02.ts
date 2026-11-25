import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "fde-craft-02-scoping-and-demos",
  course: "fde-craft",
  number: 2,
  title: "Breaking it down and agreeing the pilot",
  tagline: "What exactly will you build first, and how will you know it worked?",
  minutes: 15,
  objectives: [
    "Break a vague problem into workflows, decisions and actors, label each step and pick one workflow.",
    "Write a pilot charter with one workflow, one metric, a baseline and exit criteria, then read it out.",
    "Cut a wish list by value and risk, and say what each cut costs.",
  ],
  sections: [
    {
      id: "problem-breakdown",
      title: "Break the problem into workflows, decisions and actors before you plan the work",
      goal: "A customer gives me a vague problem, so how do I break it down?",
      blocks: [
        {
          kind: "p",
          text: "Chapter one ended with a problem statement the customer could correct. It gives this chapter the workflow and the goal. Chapter one's constraints note gives the 200-invoice sample and the release window that makes posting risky. What exactly will you build first, and how will you know it worked?",
        },
        {
          kind: "p",
          text: "Two breakdowns exist, and the order matters. The **problem breakdown** splits the customer's problem into workflows, decisions and actors. The plan, which chapter three covers, says in what order you build. The problem breakdown comes first, because it says what is going on in the business.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Start with the **value chain**, the ordered steps by which a business turns what it buys into what it sells. Find the step that hurts most.",
            "List the workflows in that step.",
            "For each workflow, list the decisions that someone takes. Beside each decision, name the **actor**, which is the person or system that does the step.",
            "Label every step, then rank the workflows and pick one.",
          ],
        },
        {
          kind: "p",
          text: "Every step gets one of four labels.",
        },
        {
          kind: "list",
          ordered: false,
          items: [
            "A rule fits logic you can write down, such as matching an invoice total to a purchase order.",
            "A model fits messy input with an output of fixed shape, such as the extractor that reads an invoice.",
            "An agent, from course 2, is a model that chooses its next step. It fits work where the next step depends on what it finds.",
            "A person fits a decision where a wrong answer is costly and rare.",
          ],
        },
        {
          kind: "p",
          text: "At Harbour the step that hurts is accounts payable, where the first call found the failures. It has six steps. The table gives each one a decision, an actor and a label.",
        },
        {
          kind: "compare",
          caption: "The problem breakdown of Harbour's accounts payable. Each step has a decision, an actor and one label.",
          columns: ["Step", "Decision", "Actor", "Label"],
          rows: [
            ["Receive the invoice", "Which supplier, and what do the headers say?", "Clerk", "Model"],
            ["Match to the PO", "Do the PO and the amount agree?", "Clerk", "Rule"],
            ["Code the lines", "Which ledger code per line?", "Clerk", "Model"],
            ["Approve", "Pay it, or hold it?", "Finance manager", "Person"],
            ["Pay", "When is it due?", "Payment system", "Rule"],
            ["Answer supplier enquiries", "When will I be paid?", "Clerk", "Agent"],
          ],
        },
        {
          kind: "p",
          text: "The six steps form three workflows: entering invoices, approving and paying, and answering enquiries. Rank them by volume, the cost of a wrong answer and how ready the data is.",
        },
        {
          kind: "p",
          text: "Harbour picks entering invoices. It has the highest volume, a wrong field can be caught, and the invoices already sit in one inbox. The finance manager keeps approving and paying. The enquiries desk waits, because it needs ledger access agreed first.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next customer. One row for each step of the step that hurts, then the ranking.",
          code: `Step that hurts:   (the one the first call pointed at)

Workflow:          (one workflow)
Step:              (what happens)
Decision:          (who decides what)
Actor:             (a person or a system)
Label:             (rule, model, agent or person)

Rank:              Volume. Cost of a wrong answer. Data ready.
Picked:            (one workflow, and why)
Later:             (the others, each with its reason)`,
        },
        {
          kind: "quiz",
          id: "fde-craft06-q7",
          question: "A step reads a supplier's question, looks the invoice up in the ledger and then decides whether to reply or ask for more. Which label fits?",
          options: [
            "Rule, because the answer is always the same.",
            "Model, because the input is messy.",
            "Agent, because the next step depends on what it finds.",
            "Person, because every wrong answer is costly.",
          ],
          answer: 2,
          explain: "The path is not fixed in advance. The step looks something up and then chooses.",
        },
        {
          kind: "p",
          text: "You now have one workflow. Next, you agree what the pilot must prove.",
        },
      ],
    },
    {
      id: "s1-pilot-scope",
      title: "A pilot is one workflow with one metric that can succeed or fail clearly",
      goal: "How do I agree a pilot that can succeed or fail clearly?",
      blocks: [
        {
          kind: "p",
          text: "A **pilot** is a first live run of one workflow, with one metric, that can succeed or fail clearly. If you cannot say what yes looks like before you start, the result will be an argument.",
        },
        {
          kind: "p",
          text: "The pilot charter has four parts. The workflow is one process with a clear start and end. The **metric** is one number the customer already cares about. The **baseline** is the metric's value today, measured before you build. The **exit criteria** say which result means go, which means extend and which means stop.",
        },
        {
          kind: "p",
          text: "Harbour's metric is the share of invoices entered with every header field correct first time. The nine **header fields** are the invoice-level values, from supplier to currency. The suppliers send **born-digital** invoices, which are PDFs made by software, not scans.",
        },
        {
          kind: "p",
          text: "Counting only what clerks corrected later would be a mistake. A clerk can only fix an error somebody notices. Errors nobody noticed would count as correct, and the baseline would look near perfect.",
        },
        {
          kind: "p",
          text: "So the charter measures from the PDFs themselves, on 200 invoices from last quarter. Chapter five does that in the first week on site. Until then the baseline is unknown, so the charter sets go and stop relative to it.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "The pilot charter for Harbour Intake, whole. In the pilot the system reads an invoice up to the ledger's approval and a person posts it. Points means percentage points.",
          code: `Pilot charter: Harbour Intake
Sponsor       Finance director
Workflow      Reading born-digital supplier invoices up to the ledger's approval
Suppliers     Tideway Packaging and Northgate Pallets
In scope      The nine header fields. A person clears doubtful invoices. A person posts.
Out of scope  Scans. Credit notes. Other suppliers. Automated posting. The chatbot.
Metric        Share entered with every header field correct first time
Measured on   200 invoices from last quarter, re-checked against the PDFs
Baseline      Measured in the first week on site
Go            Baseline plus 20 points or more
Extend        Baseline plus 10 to 20 points, once, for up to two weeks
Stop          Less than baseline plus 10 points
Hard stop     Any wrong amount approved, at any score
Decision      The finance director decides at the end of the pilot`,
        },
        {
          kind: "p",
          text: "Read out, the charter makes six points. It covers one workflow for two named suppliers. It uses one metric, checked against the PDFs on 200 invoices. Go is 20 points above baseline. Extend is 10 to 20, once. Stop is below 10. Any wrong amount approved stops the pilot at any score, and the finance director decides.",
        },
        {
          kind: "quiz",
          id: "fde-craft02-q1",
          question: "Why measure the baseline before building?",
          options: [
            "It gives the customer something to read in week one.",
            "It lets you show a result is real, and stops anyone choosing the comparison after the fact.",
            "It proves the model is accurate.",
            "It lets you skip the exit criteria.",
          ],
          answer: 1,
          explain: "A result only means something against a number measured the same way, agreed before the work started.",
        },
        {
          kind: "p",
          text: "Customers bring more than a pilot can hold. What goes?",
        },
      ],
    },
    {
      id: "s2-cutting-scope",
      title: "Cut scope by value and risk, because ease says nothing about either",
      goal: "What do I leave out of a pilot, and how do I defend the cuts?",
      blocks: [
        {
          kind: "p",
          text: "Engineers are tempted to cut a wish list by effort, which keeps the easy things. That is backwards. Value says why something matters to the customer. Risk says how likely it is to sink the pilot. Score each wish on value and risk, and ignore effort.",
        },
        {
          kind: "p",
          text: "Keep what is high in value, what proves the metric, and the review queue that catches doubtful results. Cut what is high in risk and low in value, even if it is easy.",
        },
        {
          kind: "p",
          text: "Posting to the ledger is the usual example. The ledger is the **system of record**, the system whose data the business treats as the truth. Posting is valuable but risky, so a person posts.",
        },
        {
          kind: "p",
          text: "That is why the charter's out of scope line names scans, credit notes, other suppliers, automated posting and the chatbot. Each has a reason in writing, so the customer sees a plan and not a refusal.",
        },
        {
          kind: "widget",
          id: "fde-craft-scope-cutter",
          intro: "Eight wishes, four slots. Choose the pilot and see what each cut costs and each kept item risks.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next customer. The pilot charter with its values blank.",
          code: `Pilot charter: (customer and project)
Sponsor       (who decides at the end)
Workflow      (one process, start to end)
Suppliers     (the named sources of input)
In scope      (what the pilot does, and who clears the doubtful)
Out of scope  (what waits, each with its reason)
Metric        (one number the customer already cares about)
Measured on   (the sample, and what it is checked against)
Baseline      (when it is measured)
Go            (baseline plus how much)
Extend        (the band, how often, for how long)
Stop          (below what)
Hard stop     (the outcome that ends the pilot at any score)
Decision      (who, and when)`,
        },
        {
          kind: "p",
          text: "Scoping comes up in interviews, because the answer shows whether you can say no with reasons.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "How an interviewer tests scoping",
          text: "They ask: how do you scope a pilot so it can succeed or fail clearly? A strong answer names the metric, the baseline and the exit criteria, then explains one cut and why. A weak answer lists features.",
        },
        {
          kind: "quiz",
          id: "fde-craft02-q2",
          question: "A feature is easy to build, low in value and risky for the customer's data. What do you do?",
          options: [
            "Build it, since it is easy.",
            "Leave it out of the pilot and record it for a later phase with the reason.",
            "Build it quietly and not mention it.",
            "Ask the customer to decide without advice.",
          ],
          answer: 1,
          explain: "Ease is not a reason. Low value and real risk mean it earns no place in a pilot, and a recorded reason keeps trust.",
        },
        {
          kind: "p",
          text: "The charter says what you will build first and how you will know it worked. The next question is how long it will take, and in what order.",
        },
      ],
    },
  ],
  recap: [
    "Break the problem into workflows, decisions and actors, label each step and pick one workflow.",
    "Scope a pilot to one workflow, one metric, a baseline and exit criteria.",
    "Keep the charter relative, and measure the baseline from the PDFs, not from what clerks corrected later.",
    "Name a hard stop for an outcome that matters more than the average.",
    "Cut by value and risk. Easy and risky is still a cut.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In breaking down the problem and agreeing the pilot I learned to split a vague request into workflows, decisions and actors, then write a charter with one metric, a baseline measured from the source documents and exit criteria agreed first. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["fde-craft-q03", "fde-craft-q17"],
};

export default chapter;
