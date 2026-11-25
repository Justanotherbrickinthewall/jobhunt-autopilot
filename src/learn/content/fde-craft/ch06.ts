import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "fde-craft-architecture",
  course: "fde-craft",
  number: 6,
  title: "Architecture",
  tagline: "What shape should the system take? Harbour's constraints answer most of it, and one short record holds the rest.",
  minutes: 10,
  objectives: [
    "Turn each constraint into a list of designs it rules out.",
    "Set the remaining options side by side and say how each one fails.",
    "Write an architecture decision record that names what you give up and when to revisit.",
    "Draw the flow in numbered steps and size it against the month-end peak.",
    "Run the five questions again for a new customer, with a blank record in hand.",
  ],
  sections: [
    {
      id: "arch-context",
      title: "Harbour's constraints have already removed most of the choices",
      goal: "Which designs do the constraints rule out before you compare anything?",
      blocks: [
        {
          kind: "p",
          text: "Chapter five ended on the baseline sheet, whose last line reads: zero wrong amounts approved. Chapter one's constraints note says what Harbour cannot change. The next question is what shape the system should take. The **architecture** is that shape: the parts of the system and how they connect. List the constraints first. Each one rules something out.",
        },
        {
          kind: "list",
          items: [
            "Security review takes three weeks in ServiceNow, so any design that needs a public endpoint waits three weeks more.",
            "Data stays in the UK or EU inside Harbour's Google Cloud project, so a tool that ships invoices to a vendor's own cloud is out.",
            "A new vendor takes about ten weeks, while the existing Google Cloud contract needs none. Google Cloud is the default home.",
            "Anything that touches the ledger goes out in the monthly release window, so the first version cannot post to it.",
            "The accounts payable lead decides exceptions today, so a person stays in that loop.",
          ],
        },
        {
          kind: "p",
          text: "What remains is a design on Google Cloud, with no public endpoint, that stops short of the ledger. Three options fit that space. They fail in different ways.",
        },
      ],
    },
    {
      id: "arch-options",
      title: "Three options remain, and each fails in a different way",
      goal: "What are the options, and how does each one fail at Harbour?",
      blocks: [
        {
          kind: "p",
          text: "An **option** is one complete design that could meet the constraints. Name each one in a line and say how it fails. If you can't say how an option fails, you haven't understood it yet.",
        },
        {
          kind: "compare",
          caption: "Three options for Harbour, and the way each one fails.",
          columns: ["Option", "What it is", "How it fails"],
          rows: [
            ["A", "A packaged accounts payable product.", "Ten weeks of procurement uses most of the twelve-week date, and Harbour's rules need customising anyway."],
            ["B", "An inbox agent that decides its own steps.", "Code can't decide the route, and the confidence score, the model's own rating of how sure it is, can't attach to one step."],
            ["C", "A fixed pipeline with one model step.", "Scans have no path, and Harbour's IT team owns the maintenance."],
          ],
        },
        {
          kind: "p",
          text: "Option A fails on time. Option B fails on control, because a wrong amount approved is a hard stop and an agent picks its own route to it. Option C fails on upkeep, which is a cost Harbour can plan for. That makes C the one to record.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Why would you pick a fixed pipeline over an agent?",
          text: "This topic comes up in interviews. Answer with the stakes first: a wrong amount approved is a hard stop. Then say that code decides the route, and that the confidence score attaches to one step. Close with what the fixed pipeline gives up.",
        },
        {
          kind: "quiz",
          id: "fde-craft-arch-q1",
          question: "Why does Harbour not use an inbox agent for intake?",
          options: [
            "Agents can't read PDFs.",
            "Code must decide the route because a wrong amount is a hard stop, and the confidence score must attach to one step.",
            "Agents cost more per invoice than a pipeline.",
            "The sponsor dislikes agents.",
          ],
          answer: 1,
          explain: "A wrong amount approved is a hard stop, so a fixed route in code is safer than a route the model picks. One model step also gives one place to attach a confidence score. An agent that chooses its own steps gives neither.",
        },
        {
          kind: "p",
          text: "The choice is made, but a choice nobody wrote down gets reopened. The next section records it.",
        },
      ],
    },
    {
      id: "arch-decision",
      title: "ADR-001 records the choice, what it gives up and when to revisit",
      goal: "How do you record a decision so nobody has to remember it?",
      blocks: [
        {
          kind: "p",
          text: "An **architecture decision record**, or **ADR**, is a one-page record of one choice. It holds the context, the options, the decision, why each option lost, what is given up and when to revisit. The FDE writes it with the IT lead, and the sponsor is told.",
        },
        {
          kind: "p",
          text: "Harbour's took one meeting in week two. The IT lead pointed at ten weeks of procurement. The FDE pointed at the hard stop on a wrong amount. Three options became one, and each loser got a reason.",
        },
        {
          kind: "code",
          lang: "text",
          code: `ADR-001: Read invoices with a fixed pipeline and one model step
Status    Accepted, week 2. The FDE and the IT lead. Sponsor informed.
Context   4,000 born-digital invoices a month. UK or EU, inside Harbour's
          Google Cloud project. A new vendor takes ten weeks. A wrong amount
          approved is a hard stop, so each step needs a check we can point to.
Options   A. A packaged accounts payable product.
          B. An inbox agent that decides its own steps.
          C. A fixed pipeline with one model step.
Decision  C.
Not A     Ten weeks of procurement uses most of the twelve-week date, and
          Harbour's rules would need customising anyway.
Not B     Code must decide the route, because a wrong amount is a hard stop.
          The confidence score must attach to one step. An agent chooses its
          own steps, so neither holds.
Given up  A vendor's support, its ready-made supplier templates and a path for
          scans. Harbour's IT team owns the maintenance.
Revisit   If scans pass 10 percent of volume, or if Harbour's rules stop being
          what makes its process different.`,
          caption: "ADR-001 for Harbour Intake, whole.",
        },
        {
          kind: "p",
          text: "Read it in three parts. The decision is C, and each of the other two has its own reason. The given-up line is the honest part: a vendor's support and templates, and a path for scans. The revisit line names two triggers, so the record says when it expires.",
        },
        {
          kind: "p",
          text: "Four small decisions sit beneath the record.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "The intake job uses **Microsoft Graph polling**: it asks Microsoft 365 for new mail every 5 minutes. A **webhook**, where the mailbox calls you, needs a public endpoint and three more weeks of security review.",
            "Status lives in Postgres, and the **Pub/Sub** message carries only the document id. Pub/Sub is Google Cloud's message queue.",
            "The review page is a small service on **Cloud Run**, with Microsoft 365 sign-in. ServiceNow would put every change through monthly change control.",
            "The model runs through **Vertex AI** in Harbour's project. Confirm the model's region first, because availability varies.",
          ],
        },
        {
          kind: "quiz",
          id: "fde-craft-arch-q2",
          question: "Besides the decision itself, what must an ADR hold?",
          options: [
            "The full source code.",
            "What the choice gives up, and when to revisit it.",
            "A list of every meeting held.",
            "The sponsor's signature.",
          ],
          answer: 1,
          explain: "A decision record that holds only the decision can't be challenged fairly later. The given-up line says what the choice costs. The revisit line says what would change the answer.",
        },
        {
          kind: "p",
          text: "The record fixes the choice. Next comes the flow it produces, and a check that it is big enough.",
        },
      ],
    },
    {
      id: "arch-components",
      title: "One reader handles Harbour's peak, so the queue is for retries",
      goal: "What does the flow look like, and is it big enough?",
      blocks: [
        {
          kind: "p",
          text: "The flow is the decision drawn as numbered steps, one per line. Table and status names wait for chapter seven.",
        },
        {
          kind: "code",
          lang: "text",
          code: `The flow
1. A supplier's PDF lands in the shared Outlook inbox.
2. The intake job polls Microsoft Graph every 5 minutes.
3. It stores the PDF in Cloud Storage and writes a record of the file.
4. It puts the document id on a Pub/Sub topic.
5. The reader service on Cloud Run checks the PDF is born-digital.
6. The extractor reads the fields through Vertex AI.
7. The rules check the fields.
8. The invoice is approved or sent for review.
9. A person clears the review page.
10. A person posts to the ledger. A posting worker replaces them in milestone 5.`,
          caption: "The flow for Harbour Intake, whole.",
        },
        {
          kind: "p",
          text: "Steps one to four fetch and store. **Cloud Storage** holds the PDF itself, and the record of the file points to it. Steps five to eight decide, and only step six calls the model. Steps nine and ten are people, until the posting worker arrives in milestone five.",
        },
        {
          kind: "p",
          text: "**Sizing** is the arithmetic that checks a design is big enough. Harbour gets 4,000 invoices over 21 working days, about 190 a day. A month-end at three times that is about 570 a day, or about 71 an hour over an eight-hour day. That eight-hour day is an assumption.",
        },
        {
          kind: "p",
          text: "One reader at 15 seconds per invoice handles 240 an hour. That is more than three times the peak. The queue is there for retries and doesn't exist for throughput.",
        },
        {
          kind: "quiz",
          id: "fde-craft-arch-q3",
          question: "The peak is about 71 invoices an hour and one reader handles 240 an hour. What is the queue for?",
          options: [
            "Throughput, because the peak is high.",
            "Retries, because one reader already handles the peak.",
            "Storing PDFs.",
            "Showing the review page.",
          ],
          answer: 1,
          explain: "One reader has more than three times the capacity the peak needs, so throughput is no reason for a queue. The queue lets a failed step be tried again without losing the document id.",
        },
        {
          kind: "p",
          text: "The flow now exists. The same five questions will produce one for your next customer.",
        },
      ],
    },
    {
      id: "arch-repeat",
      title: "Five questions give you the architecture for your next customer",
      goal: "How do you repeat this for a customer who isn't Harbour?",
      blocks: [
        {
          kind: "list",
          ordered: true,
          items: [
            "What do the constraints rule out?",
            "Which options remain, and how does each one fail?",
            "Which failure can the customer live with, and what does the choice give up?",
            "What would make you revisit it?",
            "Does one worker handle the month-end peak?",
          ],
        },
        {
          kind: "code",
          lang: "text",
          code: `ADR-___: ______ (the choice, in one line)
Status    ______ (week, who decided, who was told)
Context   ______ (volume, where data may live, the deadline, the cost of a wrong answer)
Options   A. ______   B. ______   C. ______
Decision  ______
Not ___   ______ (one reason for each option that lost)
Given up  ______ (what the customer loses, and who maintains it)
Revisit   ______ (one trigger you can measure)

Sizing    ______ per day, ______ at the peak, ______ per hour; one worker handles ______`,
          caption: "For your next customer: an ADR and its sizing line, with the fields blank.",
        },
        {
          kind: "p",
          text: "One of the four small decisions in the record says Postgres holds the status of each invoice. That leaves the larger question open: what exactly does the system store? Chapter seven answers it.",
        },
      ],
    },
  ],
  recap: [
    "Each constraint rules out a set of designs, so list the constraints before the options.",
    "Name each option and say how it fails. Harbour's three fail on time, on control and on upkeep.",
    "An ADR holds the context, the options, the decision, the reasons, what is given up and when to revisit.",
    "The flow is ten numbered steps. Only one calls the model, and two are people.",
    "Sizing shows one reader handles the month-end peak, so the queue exists for retries.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In architecture I learned that constraints rule out most designs before any comparison, and that an ADR records what a choice gives up and when to revisit it. So I size the flow against the peak and write the decision down. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["fde-craft-q21"],
};

export default chapter;
