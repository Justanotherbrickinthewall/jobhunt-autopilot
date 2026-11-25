import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "design-01-the-method",
  course: "design",
  number: 1,
  title: "Seven steps in a fixed order turn one sentence into a design",
  tagline: "How do you answer a prompt of one sentence in 45 minutes? Use the same seven steps every time, because the round scores shape, trade-offs and failure modes.",
  minutes: 45,
  objectives: [
    "Explain what a system design interviewer scores, and what they ignore.",
    "Run the seven-step template in order and say why the order holds.",
    "Choose the five opening questions whose answers change the diagram.",
    "Draw one diagram with the cost of every model call marked on it.",
    "Spend 45 minutes so that failure modes and the follow-up ladder both fit.",
    "Fill in a one-page design sheet and read it out in under a minute.",
  ],
  sections: [
    {
      id: "s1-what-is-graded",
      title: "A design interviewer scores your shape, your trade-offs and your failure modes",
      goal: "What does the round measure, and what earns nothing?",
      blocks: [
        {
          kind: "p",
          text: "A system design round has no single correct design. The interviewer watches how you think when the problem is vague and the clock is running.",
        },
        {
          kind: "p",
          text: "They score three things. The first is **shape**: do the parts fit into a system that works on a normal day? The second is **trade-offs**: can you say what each choice costs? The third is **failure modes**: do you know how it breaks, and what happens next?",
        },
        {
          kind: "p",
          text: "A product name earns nothing. Saying you would use a named vector database tells the interviewer which tool you have used. It does not show that you can design. Say what the component must do. Name a tool only if you are asked.",
        },
        {
          kind: "p",
          text: "Listen to how a weak answer begins. The candidate says they would build it with a vector store and a large model. A strong answer begins with a question about volume. The first sounds like a shopping list. The second sounds like someone who has run a system before.",
        },
        {
          kind: "compare",
          caption: "Each signal the interviewer scores has a habit that loses the points.",
          columns: ["Signal", "What the interviewer wants to hear", "What loses the points"],
          rows: [
            ["Shape", "A request followed from the user to the answer and back", "A list of tools with no arrows between them"],
            ["Trade-offs", "A choice, its cost, and the option you gave up", "Saying it depends and stopping there"],
            ["Failure modes", "What breaks first, what the user sees, what recovers it", "Describing only the happy path"],
          ],
        },
        {
          kind: "p",
          text: "Every prompt in this course is set at Harbour Supplies, the fictional UK distributor from the FDE craft course. It buys stock from suppliers and pays their invoices. Its ledger records each invoice and payment, and entering an invoice there is called posting it.",
        },
        {
          kind: "p",
          text: "The prompt for this chapter is one sentence: design an assistant that answers supplier questions about invoice status and payment. That sentence hides a dozen decisions. This chapter brings them out in order, and chapter eight answers the prompt in full.",
        },
        { kind: "p", text: "This course sets Harbour three years after that engagement. It has bought smaller distributors and runs them as one group. Its volumes are far larger than the 4,000 invoices a month you saw before, because a design needs numbers that can hurt. The sheet below holds the facts every prompt shares." },
        { kind: "code", lang: "text", caption: "Harbour's shared facts. Every figure in this course is invented for practice.", code: "HARBOUR GROUP: shared facts for every prompt\n\nBusiness    UK distributor, grown by buying smaller distributors\nPeople      1,200 staff. A clerk costs 18 pounds an hour\nSoftware    Own systems on Google Cloud. Staff on Microsoft 365\n            IT tickets in ServiceNow\nLedger      The finance system of record\n\nModel prices, in pounds per million tokens\n            Input    Output\nSmall       0.50     2\nMedium      2        8\nLarge       3        15\nBatch API   half of the prices above" },
        { kind: "p", text: "Chapters two to six are separate rounds, because each prompt needs a different shape of system. One product stretched across all five would hide that difference. Three things join them instead: this company, this sheet and two records you will start at the end of this chapter." },
        {
          kind: "callout",
          tone: "insight",
          title: "This course covers the designs that are not RAG",
          text: "Chapter sixteen of the RAG course already works through two RAG designs, a rescue and a timed exercise. This course works five other systems end to end. The method here sits under all of them, so learn it once and reuse it. It adapts the engineering method in chapter one of the AI systems design course to a 45-minute round.",
        },
        {
          kind: "quiz",
          id: "design01-q1",
          question: "Which answer to a design prompt earns the most credit?",
          options: [
            "A named stack of five products that you have used before.",
            "A request followed from the user to the answer, with each choice costed and each failure named.",
            "A long list of every feature the assistant could have.",
            "A promise to check the details once the build starts.",
          ],
          answer: 1,
          explain: "The interviewer scores shape, trade-offs and failure modes. Product names, feature lists and promises show none of the three.",
        },
        { kind: "p", text: "You now know what the interviewer is listening for. The next question is the order in which you earn it." },
      ],
    },
    {
      id: "s2-template",
      title: "Seven steps in a fixed order stop you forgetting the part that breaks",
      goal: "In what order do the seven steps run, and why?",
      blocks: [
        {
          kind: "p",
          text: "Use the same seven steps every time: users and volumes, non-functionals, components, data flow, failure modes, evals and rollout. The order is deliberate. Each step produces something the next step needs.",
        },
        {
          kind: "p",
          text: "Users and volumes come first because every later number depends on them. Non-functionals are the targets for latency, cost, accuracy and residency. Components only make sense once those targets exist. Data flow then joins the components together.",
        },
        {
          kind: "compare",
          caption: "Each step answers one question, shown here for the Harbour Supplies invoice assistant. A golden set is a fixed set of labelled test cases, from course four. Shadow mode means the system drafts replies that nobody sends.",
          columns: ["Step", "The question it answers", "Harbour Supplies example"],
          rows: [
            ["Users and volumes", "Who uses it, and how much?", "3,000 supplier emails a day, busiest at month end"],
            ["Non-functionals", "What targets must it meet?", "Reply in four hours, under 2 pence of model cost a reply, no wrong payment dates"],
            ["Components", "Which parts do the work?", "Inbox, classifier, lookup, drafter, review queue"],
            ["Data flow", "How does one request travel?", "Email to classifier, lookup, drafter, review, send"],
            ["Failure modes", "How does it break?", "Ledger down, wrong supplier matched, a draft that invents a date"],
            ["Evals", "How do you know it works?", "Date accuracy on a golden set, share of drafts sent unedited"],
            ["Rollout", "How does it reach users safely?", "Shadow mode, then 10 percent of suppliers, then all"],
          ],
        },
        {
          kind: "p",
          text: "Notice where failure modes sit. They come before evals and rollout. You measure the failures you named, and you release against that measure. A design with no failures described is a design for a demo.",
        },
        {
          kind: "widget",
          id: "design-sequencer",
          intro: "Put the seven steps in the order you would speak them. You get two tries, and the second try shows the reasoning behind each position.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Skipping failure modes is the quickest way to sound junior",
          text: "Candidates run out of time and drop the failure step because it feels optional. It is the step the interviewer most wants. Cut rollout to a sentence before you cut failures.",
        },
        {
          kind: "quiz",
          id: "design01-q2",
          question: "Why do non-functionals come before components?",
          options: [
            "Because interviewers dislike diagrams.",
            "Because the latency, cost and accuracy targets decide which components are allowed.",
            "Because components are easy to change later.",
            "Because non-functionals are shorter to explain.",
          ],
          answer: 1,
          explain: "A four-hour target allows a batch queue. A two-second target does not. Choosing components first means choosing without the targets that decide between them.",
        },
        { kind: "p", text: "The first of those steps needs facts, and the prompt gave you almost none. So what do you ask?" },
      ],
    },
    {
      id: "s3-first-five-minutes",
      title: "The first five minutes belong to questions whose answers change what you draw",
      goal: "Which questions belong in the first five minutes?",
      blocks: [
        {
          kind: "p",
          text: "The prompt is one sentence. Your first five minutes turn it into a problem you can size. A good question is one where a different answer would make you draw a different diagram.",
        },
        {
          kind: "p",
          text: "Apply one test to each question. If a high answer gives you box A and a low answer gives you box B, ask it. If you would draw the same thing either way, hold it back for later.",
        },
        {
          kind: "p",
          text: "At Harbour Supplies, five questions pass the test for the invoice assistant.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "How many questions arrive a day, and what is the busiest hour? Three thousand a day with a month-end peak needs a queue. Thirty a day needs a script.",
            "What does a wrong answer cost? A wrong payment date makes a supplier chase finance. A wrong bank detail sends money to the wrong place.",
            "Does any answer change a record, or does it only read one? A read needs no approval. A write needs a gate and an audit log.",
            "Which suppliers' data may each user see? Supplier A must never see supplier B's invoices, so permissions sit in the retrieval path.",
            "How quickly must a reply arrive? Two seconds means a live call. Four hours allows a batch queue.",
          ],
        },
        {
          kind: "p",
          text: "Ask for numbers, not adjectives. If the answer is a lot, ask for a count. If the answer is fast, ask for seconds. If nobody knows, say so and write down your assumption, such as 3,000 emails a day. The interviewer can correct a stated assumption in one sentence.",
        },
        {
          kind: "widget",
          id: "design-requirements-probe",
          intro: "There are twelve questions and five slots. Pick the five whose answers would change the diagram. A wrong pick shows why it would not.",
        },
        {
          kind: "p",
          text: "You will have more than five worth asking. Ask these first, and ask the rest as you draw. Say each question with its reason: I am asking about writes because they decide whether we need an approval step.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "What do you ask first when you are told to design an LLM system?",
          text: "Open with the answer: I ask five things that change the diagram. They are volume, the cost of a wrong answer, reads versus writes, who may see what, and the latency target. Interviewers push on why you did not ask about the model, and the answer is that the targets choose the model.",
        },
        {
          kind: "quiz",
          id: "design01-q3",
          question: "Which opening question passes the test of changing what you draw?",
          options: [
            "Which cloud provider do you like?",
            "What is the team's favourite framework?",
            "Does the assistant ever change a record, or does it only read?",
            "Is there a company style guide for the interface?",
          ],
          answer: 2,
          explain: "A write needs an approval gate and an audit log, and a read does not. That is two different diagrams. The other three change a label or a colour at most.",
        },
        { kind: "p", text: "The answers give you numbers. The next section puts those numbers on the drawing." },
      ],
    },
    {
      id: "s4-draw-and-cost",
      title: "One diagram with the cost on every model call shows the shape and the bill together",
      goal: "How does one drawing show the shape and the bill together?",
      blocks: [
        {
          kind: "p",
          text: "Draw a single diagram. One diagram keeps you and the interviewer looking at the same thing. Use boxes for components, arrows for data, and a label on each arrow that matters.",
        },
        {
          kind: "p",
          text: "Mark every model call with its cost. A model call is the box that costs money on each pass and takes seconds. It deserves a number. A diagram with costs shows that you think like an owner.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "The Harbour Supplies invoice assistant. The prices come from Harbour's sheet, with the small model on the classifier and the large model on the drafter.",
          code: "Supplier email\n   |\n   v\n[Classifier: small model]  600 in, 20 out, 0.00034 pounds\n   |\n   +-- status question: [Ledger lookup: no model]\n   |                             |\n   |                             v\n   |                        [Drafter: large model]  3,000 in, 400 out, 0.015 pounds\n   |                             |\n   |                             v\n   |                        [Review queue: human], then send\n   |\n   +-- anything else: [Human inbox]",
        },
        {
          kind: "p",
          text: "Now work the numbers. The classifier reads 600 tokens and writes 20. That is 600 times 0.50 over a million, which is 0.0003 pounds, plus 20 times 2 over a million, which is 0.00004. Call it 0.00034 pounds an email.",
        },
        {
          kind: "p",
          text: "The drafter reads 3,000 tokens and writes 400. The input costs 0.009 pounds and the output costs 0.006. That makes 0.015 pounds a draft.",
        },
        {
          kind: "p",
          text: "Mark latency on the same diagram. The classifier takes about half a second and the drafter about eight. Together with the lookup and review, that is well inside a four-hour target. If the target were two seconds, this diagram would be wrong, and you would say so.",
        },
        {
          kind: "compare",
          caption: "The draft step is about 95 percent of the model bill, so it is the first place to look when cost must fall.",
          columns: ["Box", "Calls a day", "Cost per call", "Cost per day"],
          rows: [
            ["Classifier, small model", "3,000", "0.00034 pounds", "1.02 pounds"],
            ["Drafter, large model", "1,200 (40 percent of emails)", "0.015 pounds", "18.00 pounds"],
            ["Total", "", "", "19.02 pounds"],
          ],
        },
        {
          kind: "p",
          text: "Over 22 working days that is about 418 pounds a month. The model bill is small. The finding is that the drafter carries 18 of the 19.02 pounds, so any saving starts there. The review queue, a human, is the cost the diagram does not price yet.",
        },
        {
          kind: "quiz",
          id: "design01-q4",
          question: "Cost must fall by half. Using the table, where do you look first?",
          options: [
            "The classifier, because it runs on every email.",
            "The ledger lookup, because it has no model.",
            "The drafter, because it is about 95 percent of the daily model bill.",
            "The review queue, because it is a person.",
          ],
          answer: 2,
          explain: "The drafter costs 18 pounds of 19.02 a day. Halving the classifier would save about 0.51 pounds. Fewer or shorter drafts save far more.",
        },
        { kind: "p", text: "A drawing with a bill on it is a good start. The round really begins when the interviewer starts to change it." },
      ],
    },
    {
      id: "s5-follow-ups-and-time",
      title: "Follow-ups climb a ladder, so the 45-minute budget keeps 12 minutes for them",
      goal: "How do you answer a follow-up, and how do you spend the 45 minutes?",
      blocks: [
        {
          kind: "p",
          text: "The interviewer rarely stops at your first design. They climb a ladder. Each rung changes one fact and asks what breaks. Volume grows tenfold. The provider is down for an hour. The budget halves. Accuracy drops after a model update.",
        },
        {
          kind: "p",
          text: "Answer every rung the same way. Name the part that breaks first. Give the change. State what it costs. At ten times the volume, the bill rises from 19.02 to 190.20 pounds a day, and the drafter is still 180 of it. So you would cache or batch drafts before anything else.",
        },
        {
          kind: "p",
          text: "Take the outage rung. The provider is down for an hour, and 125 emails arrive in that hour, since 3,000 over a 24-hour day is 125 an hour. The four-hour target survives. Emails wait in the queue and the drafter retries when the provider returns. Nothing is lost, and a supplier sees a reply late but correct.",
        },
        {
          kind: "compare",
          caption: "This 45-minute split is illustrative, and it leaves 12 minutes for the follow-ups.",
          columns: ["Step", "Minutes", "If you are short, cut it to"],
          rows: [
            ["Users and volumes", "2", "Two numbers: requests a day and the peak"],
            ["Non-functionals", "3", "Latency and accuracy only"],
            ["Components", "6", "The five boxes, one line each"],
            ["Data flow", "6", "One request, traced once"],
            ["Failure modes", "8", "Never cut this one below three failures"],
            ["Evals", "5", "One metric and one golden set"],
            ["Rollout", "3", "One sentence: shadow, then a slice, then all"],
            ["Follow-ups", "12", "Keep them. They are where you are scored"],
          ],
        },
        {
          kind: "p",
          text: "Say the plan in the first minute so the interviewer can steer you. If they dig into one step, let them, and take the time from rollout first and evals second. Failure modes stay.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "How do you structure a 45-minute design answer?",
          text: "Open with the answer: seven steps in a fixed order, which are users and volumes, non-functionals, components, data flow, failure modes, evals and rollout. Then give the time split. Interviewers push on what you would drop if time ran out, and the answer is rollout first, then evals, never failure modes.",
        },
        {
          kind: "p",
          text: "The next five chapters run this method on five designs, and chapter seven drills the follow-ups.",
        },
        {
          kind: "quiz",
          id: "design01-q5",
          question: "You have ten minutes left and have not covered failure modes, evals or rollout. What do you do?",
          options: [
            "Spend all ten minutes on rollout, since it comes last.",
            "Skip all three and ask the interviewer for questions.",
            "Give about five minutes to three failures, then one eval metric and one sentence on rollout.",
            "Redraw the diagram with more detail.",
          ],
          answer: 2,
          explain: "Failure modes are what the interviewer most wants, so they get the most time. One metric and one sentence on rollout still close the loop.",
        },
        { kind: "p", text: "That is the whole method. One thing is missing, which is a place to keep what it produces." },
      ],
    },
    {
      id: "s6-design-sheet",
      title: "One page holds the whole answer, and you can read it out in a minute",
      goal: "What should the finished answer look like on paper?",
      blocks: [
        { kind: "p", text: "Every worked design in this course ends the same way. The seven steps go on one page, in a line or two each. That page is the **design sheet**. It stops you losing a step, and it gives you something to read from when the interviewer asks for a summary." },
        { kind: "p", text: "A second record sits under the sheet. The **trade-off ledger** lists each decision, what it gave up and the number that would make you reopen it. Chapter two writes its first row. Chapter seven puts the whole ledger to work." },
        { kind: "p", text: "Here is the first sheet for the supplier assistant, filled from this chapter. Some lines are thin, because later chapters teach what fills them. The blank at the bottom is the honest part." },
        { kind: "code", lang: "text", caption: "The first pass at the supplier assistant, with every step filled from this chapter.", code: "DESIGN SHEET: supplier invoice assistant, first pass\nPrompt              Answer supplier questions about invoice status and payment\n\n1 Users and volumes 3,000 supplier emails a day, busiest at month end\n                    40 percent are status questions, so 1,200 drafts a day\n2 Non-functionals   Reply in four hours\n                    Under 2 pence of model cost a reply\n                    No wrong payment dates\n                    Supplier A never sees supplier B's invoices\n3 Components        Inbox. Classifier on the small model\n                    Ledger lookup with no model. Drafter on the large model\n                    Review queue, staffed by a person\n4 Data flow         Email, classifier, lookup, drafter, review, send\n                    Anything that is not a status question goes to the human inbox\nCost                Classifier 1.02 pounds a day. Drafter 18.00 pounds a day\n                    Total 19.02 pounds a day, about 418 pounds a month\n5 Failure modes     Ledger down. Wrong supplier matched. A draft invents a date\n6 Evals             Date accuracy on a golden set. Share of drafts sent unedited\n7 Rollout           Shadow mode, then 10 percent of suppliers, then all\n\nNot yet priced      The review queue" },
        { kind: "p", text: "Read it out in under a minute. Say that this is a queued assistant for 3,000 emails a day, replying within four hours. A small model sorts each email, code reads the ledger, a large model drafts and a person approves." },
        { kind: "p", text: "Then give the money and the risk. It costs about 19 pounds a day in model calls, and the drafter is 95 percent of that. The failure that worries you most is an invented date, so date accuracy gates the rollout." },
        { kind: "code", lang: "text", caption: "For your next prompt. Copy it and fill the blanks in the order shown.", code: "DESIGN SHEET: ____________________\nPrompt              ____  (copy the interviewer's sentence)\n\n1 Users and volumes ____  (a daily count and the busiest period)\n2 Non-functionals   ____  (latency, cost, accuracy, residency, as numbers)\n3 Components        ____  (one line each, with the model calls marked)\n4 Data flow         ____  (one request, traced once)\nCost                ____  (cost per call, per day, and the biggest line)\n5 Failure modes     ____  (at least three, each with its control)\n6 Evals             ____  (one metric per failure you named)\n7 Rollout           ____  (shadow, a slice, then all, with a stop number)\n\nLedger              ____  (decision, what it gave up, revisit when)" },
        { kind: "p", text: "The method is complete, but this assistant asks little of it, because 3,000 emails a day is a light load. Chapter two sets a harder test. How do you size a system that must absorb a daily peak?" },
      ],
    },
  ],
  recap: [
    "A design interviewer scores shape, trade-offs and failure modes, and ignores product names.",
    "Run seven steps in a fixed order: users and volumes, non-functionals, components, data flow, failure modes, evals, rollout.",
    "Ask only the opening questions whose answers would change what you draw.",
    "Draw one diagram and mark the cost of every model call on it.",
    "Budget 45 minutes with 12 kept for follow-ups, and cut rollout before failure modes.",
    "A design sheet holds the seven steps on one page, and the trade-off ledger records what each decision gave up.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In design method I learned to run seven steps in a fixed order, to ask only the questions that change the diagram, and to mark the cost on every model call. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["design-q01", "design-q02"],
};

export default chapter;
