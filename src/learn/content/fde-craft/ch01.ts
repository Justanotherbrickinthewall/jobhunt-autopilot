import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "fde-craft-01-the-job-and-discovery",
  course: "fde-craft",
  number: 1,
  title: "The job, and the first call at Harbour",
  tagline: "What does this job involve, and how do you find the real problem? A forward-deployed engineer (FDE) ships a working system into a customer's environment, and the first call at Harbour Supplies shows how it starts.",
  minutes: 30,
  objectives: [
    "Describe the five stages of an FDE engagement and what each one produces.",
    "Run a first call that finds the workflow, the data and the decision.",
    "Record a first call as questions and answers, with every estimate marked as an estimate.",
    "Reframe a stated request into the underlying problem without arguing.",
    "Ask about the six constraints in week one, and write them into a constraints note.",
    "Write a one-page problem statement that the customer can correct.",
  ],
  sections: [
    {
      id: "s1-the-job",
      title: "The job runs from discovery to handover, and engineering is only the middle",
      goal: "What does an FDE engagement involve, and where does the code fit?",
      blocks: [
        {
          kind: "p",
          text: "This chapter answers one question. What does this job involve, and how do you find the real problem? A **forward-deployed engineer (FDE)** is an engineer who works inside a customer's problem and ships a working system into their environment. You don't sell a licence or hand over a slide deck.",
        },
        {
          kind: "p",
          text: "The job has five stages, and code appears mostly in the middle three. **Discovery** is learning the real problem. **Scoping** is agreeing what to build and how to judge it. **Demos** show the work to the customer. **Delivery** builds and ships it. **Handover** leaves the customer able to run it without you. Weak FDEs skip discovery and handover.",
        },
        {
          kind: "p",
          text: "The examples in this course follow one customer, **Harbour Supplies**. It is a fictional UK distributor. It buys stock from suppliers, and each supplier bills it with an invoice. Harbour handles about 4,000 invoices a month, which is about 1,000 a week. You are the engineer sent to build its first AI system. The engagement is called **Harbour Intake**.",
        },
        {
          kind: "p",
          text: "The same customer carries you through all twenty-five chapters. Each chapter produces one document or one piece of evidence, and each feeds the next.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "The twenty-five chapters, in the order you meet them. Harbour is the customer for the first sixteen.",
          code: `1   The job, and the first call
2   Agreeing one small first project
3   Planning and estimating the work
4   The business case and the contract
5   The first week on site
6   The architecture
7   The data structure
8   The technical specification
9   A prototype on messy data
10  Using AI tools to build safely
11  Running the first project and showing it
12  Delivery and handover
13  Adding an agent to a running system
14  Telling the project as a story
15  The scoping interview round
16  The live coding interview round
17  The one-hour use-case round
18  The discovery workbook
19  The one-page spec and the first slice
20  Building the slice with Claude while watched
21  Building your own kit from a blank page
22  Case one: the claims inbox
23  Case two: the wrong delivery answer
24  Case three: operations questions
25  Case four: refunds`,
        },
        {
          kind: "p",
          text: "Harbour's **invoice pipeline** is the system you will build. A model reads each invoice and returns its fields as JSON. That model step is the **extractor**. Invoices that pass the checks go on to the finance system. Doubtful ones go to a person.",
        },
        {
          kind: "p",
          text: "Harbour runs its own software on Google Cloud. Its staff work in Microsoft 365, including Outlook and SharePoint. Its own account there is a **tenant**. IT tickets go through ServiceNow.",
        },
        {
          kind: "p",
          text: "The people at Harbour are roles, and none of them gets a name. The finance director is the **sponsor**, the senior person who owns the budget for this work. The finance side has an accounts payable lead, the clerks, and a finance manager who approves payment. The IT side has an IT lead and a two-person team that will run the system.",
        },
        {
          kind: "p",
          text: "Harbour's finance team has its own vocabulary, and every later chapter borrows it.",
        },
        {
          kind: "list",
          items: [
            "An invoice shows the supplier, an invoice number, the invoice date and a **due date**, the day payment is owed.",
            "Each **line item** is one product, with a quantity and an amount. The amounts add up to the **net amount**, the total before tax. **VAT**, the UK sales tax, is added on top.",
            "A **purchase order**, or PO, is Harbour's own record of an order it placed. The supplier copies the **PO number** onto its invoice, so the two can be matched.",
            "A **credit note** is an invoice in reverse, sent to cut what Harbour owes.",
            "**Accounts payable** is the finance team that pays suppliers. Its **clerks** check doubtful invoices by hand from a **review queue**. A **payment hold** stops an invoice being paid until a question is settled.",
            "A good invoice is **posted**, meaning entered into the **ledger**. The ledger is Harbour's accounting record of what it owes and has paid. A **ledger code** is the category a line is filed under.",
            "**OCR**, optical character recognition, is software that reads text out of a scanned image.",
          ],
        },
        {
          kind: "compare",
          caption: "The five stages, with Harbour Supplies as the customer.",
          columns: ["Stage", "What you produce", "Who you mostly talk to", "How it fails"],
          rows: [
            ["Discovery", "A written picture of the problem", "The people who do the work", "You solve the stated request"],
            ["Scoping", "One workflow, one measure of success", "The sponsor", "No way to fail clearly"],
            ["Demos", "Trust, on their own documents", "Sceptical users", "A polished demo hides errors"],
            ["Delivery", "Working software and a list of risks", "The day-to-day team", "Surprises in the last week"],
            ["Handover", "Written run steps and a named owner", "The team that will run it", "The system dies when you leave"],
          ],
        },
        {
          kind: "p",
          text: "Look at the last column. Every failure in it is about people, not models. A model that is 95 percent accurate on the wrong task earns you nothing.",
        },
        {
          kind: "callout",
          tone: "insight",
          title: "You are measured on the customer's outcome",
          text: "Your own code is an input. The outcome is that Harbour Supplies' finance team finishes each month's accounts faster and trusts the numbers.",
        },
        {
          kind: "quiz",
          id: "fde-craft01-q1",
          question: "Which stage is most often skipped by engineers who prefer to build?",
          options: [
            "Delivery, because the code is the real work.",
            "Discovery and handover, because they are conversations and documents.",
            "Demos, because customers do not need them.",
            "Scoping, because the customer scopes it themselves.",
          ],
          answer: 1,
          explain: "The two end stages involve little code, so builders under-invest in them. Both decide whether the build matters.",
        },
        {
          kind: "p",
          text: "Discovery comes first, so the next section looks at what a first call must establish.",
        },
      ],
    },
    {
      id: "s2-discovery",
      title: "Discovery finds the workflow, the data and the decision",
      goal: "What must a first call establish, and which questions establish it?",
      blocks: [
        {
          kind: "p",
          text: "Three things must be clear after discovery. The **workflow** is who does the work today, in what order, and with which tools. The **data** is what goes in, where it lives, who can release it and what condition it is in. The **decision** is what someone chooses at the end, and what a wrong choice costs.",
        },
        {
          kind: "p",
          text: "Five questions get you all three. Put them to the people who do the work, and write down their answers word for word.",
        },
        {
          kind: "list",
          items: [
            "Take me through one real item from the moment it arrives. This gives you the workflow.",
            "Show me the last five that went wrong. This gives you the failure modes and the exceptions, the odd cases that break the normal path.",
            "How many do you handle in a week, and how long does each take? This gives you volume and today's figure.",
            "Who decides at the end, and what happens if they are wrong? This gives you the cost of an error.",
            "Who can give me a sample, and what do I need to sign first? This gives you data access.",
          ],
        },
        {
          kind: "p",
          text: "Ask to watch the work, not only to hear about it. People describe the process they believe in, but they show you the one they follow. The spreadsheet at the side of the screen is often the real system.",
        },
        {
          kind: "widget",
          id: "fde-craft-discovery-questions",
          intro: "Plan the first call with Harbour Supplies. Pick five questions and see which hidden constraints your call exposed.",
        },
        {
          kind: "p",
          text: "How you run a first call comes up in interviews, and a clear structure is what the interviewer listens for.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "How an interviewer tests discovery",
          text: "They ask: how do you run the first call? A strong answer names the three things you must learn. It says you ask to see the work, and that you ask about approvals as well as technology. A weak answer starts with the model.",
        },
        {
          kind: "quiz",
          id: "fde-craft01-q2",
          question: "A customer says processing is slow. Which first question gives you the most?",
          options: [
            "Which model do you want to use?",
            "Can you show me the last five invoices that took longest, and where each one waited?",
            "How large is your engineering team?",
            "What is your cloud budget?",
          ],
          answer: 1,
          explain: "Real cases show where the time goes. The other questions are about solutions or about resources, and none of them locates the delay.",
        },
        {
          kind: "p",
          text: "Those questions are easy to list and harder to run. The next section shows them put to Harbour, with the answers it gave.",
        },
      ],
    },
    {
      id: "first-call",
      title: "The first call gets Harbour's workflow, data and decision",
      goal: "What does a first call look like when it works, and what does it leave in your notes?",
      blocks: [
        {
          kind: "p",
          text: "Harbour's first call lasted 45 minutes. Three people were on it. They were the FDE, the accounts payable lead and the finance director. The FDE put the five questions in order and typed the answers as they came. This is the whole note.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "Harbour's first call note, whole.",
          code: `First call, 45 minutes. The FDE, the accounts payable lead and the finance director.

Q  Take me through one real invoice, from the moment it arrives.
A  A supplier emails a PDF to the shared Outlook inbox. A clerk finds the
   purchase order. The clerk keys the supplier, number, date and amounts
   into the ledger. Then the clerk adds a line to "the register", a
   spreadsheet on SharePoint.

Q  Show me the last five that went wrong.
A  A slash date read month first. An invoice keyed twice after a resend in
   different capitals. A mistyped total. A credit note posted as an invoice.
   A supplier name that didn't match the ledger.

Q  How many, and how long does each one take?
A  About 1,000 a week. About six minutes each. (Their estimate. Nobody has
   timed it.)

Q  Who makes the final decision, and what does a wrong one cost?
A  The finance manager pays or holds. A wrong entry means an overpayment,
   a double payment or a late month-end.

Q  Can I see some real ones?
A  The accounts payable lead will export 200 invoices from last quarter
   once an NDA is signed.`,
        },
        {
          kind: "p",
          text: "Read the note by what it gives you. The workflow is four steps. A supplier emails a PDF to the shared inbox. A clerk finds the order, keys the fields into the ledger and logs the invoice in **the register**, a spreadsheet on SharePoint. The five failures are the exceptions, and a check could catch each one.",
        },
        {
          kind: "p",
          text: "The volume is 1,000 a week at six minutes each, which would be about 100 hours of keying a week. But the six minutes is the customer's estimate, and the note says nobody has timed it. Keep that bracket.",
        },
        {
          kind: "p",
          text: "The decision belongs to the finance manager, who pays or holds. A wrong entry costs an overpayment, a double payment or a late month-end. The data is 200 invoices, released after a non-disclosure agreement, or NDA, is signed.",
        },
        {
          kind: "quiz",
          id: "fde-craft-first-call-q1",
          question: "The customer says each invoice takes about six minutes. How does that go in your note?",
          options: [
            "As a fact, because the accounts payable lead said it.",
            "As their estimate, marked as not yet timed, to be measured later.",
            "It stays out of the note until you have timed it yourself.",
            "As six minutes, rounded to ten to be safe.",
          ],
          answer: 1,
          explain: "The note records what was said and how sure it is. An estimate marked as an estimate can be replaced by a measurement later. A figure that looks measured cannot.",
        },
        {
          kind: "p",
          text: "Here is the same note with the values blanked, ready for your next customer.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next customer. The first call note, blank.",
          code: `First call, ___ minutes. Who was there: ___

Q  Take me through one real item, from the moment it arrives.
A  ___ (who does what, in which tool)

Q  Show me the last five that went wrong.
A  ___ (their words, one line each)

Q  How many, and how long does each one take?
A  ___ (mark it "their estimate" until someone times it)

Q  Who makes the final decision, and what does a wrong one cost?
A  ___ (a name or a role, and a cost)

Q  Can I see some real ones?
A  ___ (who exports them, and what must be signed first)`,
        },
        {
          kind: "p",
          text: "The note holds how the work runs. It leaves out what Harbour asked for first, and that was a chatbot.",
        },
      ],
    },
    {
      id: "s3-reframe",
      title: "The stated problem is rarely the real one, so reframe without arguing",
      goal: "How do you turn a request into a problem you can measure, and keep the customer on your side?",
      blocks: [
        {
          kind: "p",
          text: "Customers describe solutions because that is what they have seen, such as a chatbot or better OCR. Behind each is a problem with a cost. Your job is to find the problem, because only a problem has a number you can measure and design against.",
        },
        {
          kind: "p",
          text: "Do not say that is not what you need. That makes you the person who contradicts. Ask what they hope it will change. Ask for the last time the problem cost them something. Write the answer back in their words and check you have it right. This is a **reframe**.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "A reframe in turns. Harbour Supplies, a fictional customer.",
          code: `Customer: We want a chatbot for invoices.
You:      What would the chatbot do for you on a Tuesday?
Customer: Staff keep asking where a particular invoice is.
You:      How often, and how long does each lookup take?
Customer: About twenty a day, five minutes each. That's our guess.
You:      Why can't they find it?
Customer: It hasn't been keyed into the ledger yet. It's still in the inbox.
You:      So the lookups are a symptom. The invoices sit unkeyed.
          Keying is the problem to fix first.`,
        },
        {
          kind: "p",
          text: "The dialogue ended on keying because the customer's own answer led there. Twenty lookups a day at five minutes is about 35 hours a month. That figure is unmeasured, so it stays out of any sums you show the sponsor. The chatbot comes back in chapter thirteen.",
        },
        {
          kind: "widget",
          id: "fde-craft-problem-reframe",
          intro: "Five requests from the Harbour Supplies team. For each, pick the underlying problem that is most likely behind it.",
        },
        {
          kind: "fold",
          tone: "plain",
          title: "When the stated problem is the real one",
          text: "Sometimes the customer has already done the work. If they say lookups take ten minutes and they can show a log, take them at their word. A reframe is a check, not a ritual.",
        },
        {
          kind: "quiz",
          id: "fde-craft01-q3",
          question: "The customer insists on a chatbot. What is the best next step?",
          options: [
            "Explain that a chatbot is the wrong tool.",
            "Build the chatbot and measure it later.",
            "Ask what the chatbot would change on an ordinary day, and what that change is worth.",
            "Ask them to write a specification.",
          ],
          answer: 2,
          explain: "The question finds the problem without a fight, and it gives you a number to design against.",
        },
        {
          kind: "p",
          text: "One kind of risk is left, and it has nothing to do with the model. The next section covers the constraints that surface late.",
        },
      ],
    },
    {
      id: "s4-constraints",
      title: "Constraints surface late unless you ask early",
      goal: "Which six constraints cause the most delay, and what do you ask about each in the first week?",
      blocks: [
        {
          kind: "p",
          text: "In my judgement, technical risk is usually smaller than organisational risk. That is experience, not a measured result. The delay comes from data nobody can release, or a review nobody booked. Six constraints recur, each easy to ask about and expensive to find late.",
        },
        {
          kind: "list",
          items: [
            "Data access is whether anyone can release real samples. Ask who can export it, and which approval comes first.",
            "Security review is the customer's check that a new system is safe to connect. Ask who reviews it, and how long the wait is.",
            "**Residency** means the rules on where data may be stored or processed. Ask whether data may leave a region or a tenant.",
            "Procurement is how the customer buys new vendors and cloud services. Ask whether they need a purchase order.",
            "**Change control** is how the customer approves what reaches production. Ask when anything may go live, such as a monthly release window.",
            "Exception handling is how the odd items get fixed today. Ask who fixes them, and how fast.",
          ],
        },
        {
          kind: "p",
          text: "Write each answer down with a name and a date. Then send a one-page **constraints note** to the sponsor after the first call. It lists what you learned, what you assumed and what you still need.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "Harbour's constraints note, whole.",
          code: `Constraints note: Harbour Intake
Data access     The accounts payable lead exports 200 invoices after an NDA.
Security        Any new system goes through security review in ServiceNow.
                The queue takes three weeks.
Residency       Data stays in the UK or EU, inside Harbour's Google Cloud project.
Procurement     A new vendor takes about ten weeks. The existing Google Cloud
                contract needs none.
Change control  Anything that touches the ledger goes out in the monthly
                release window.
Exceptions      Clerks fix the odd items today. The accounts payable lead decides.`,
        },
        {
          kind: "p",
          text: "Read the note by its consequences. Samples wait for the NDA. Security review takes three weeks, so book it in week one. A new vendor takes about ten weeks, so use the Google Cloud contract Harbour already has. Anything that touches the ledger goes out in the monthly release window, and you tell the sponsor that in week one.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next customer. The constraints note, blank.",
          code: `Constraints note: ___
Data access     ___ (who exports, what must be signed first)
Security        ___ (which review, how long the wait is)
Residency       ___ (where data may be stored)
Procurement     ___ (what a new vendor or service needs)
Change control  ___ (when changes may go out)
Exceptions      ___ (who fixes the odd items today)`,
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Do not promise a date before you know the window",
          text: "The commonest early mistake is quoting a date from build effort alone. Add the approval lead times first. If you do not yet know them, say so and give a range with your assumptions.",
        },
        {
          kind: "quiz",
          id: "fde-craft01-q4",
          question: "Week one of a pilot. Which note to the sponsor is most useful?",
          options: [
            "A model comparison with benchmark scores.",
            "A one-page list of what you learned, what you assumed and which approvals and data you still need.",
            "A slide deck on AI strategy.",
            "A request for a larger budget.",
          ],
          answer: 1,
          explain: "It converts the call into commitments and exposes the gaps while they are still cheap to close.",
        },
        {
          kind: "p",
          text: "You now hold the call, the reframe and the constraints. One page remains, and it ties them together.",
        },
      ],
    },
    {
      id: "problem-statement",
      title: "One page the customer can correct is the first artefact",
      goal: "How do you turn the call, the reframe and the constraints into one page the customer can correct?",
      blocks: [
        {
          kind: "p",
          text: "A **problem statement** is one page that says what the customer has, what it costs and what you will fix. You draft it after the first call. The customer's job is to correct it. A wrong line corrected now costs a minute.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "Harbour's problem statement, whole.",
          code: `Problem statement: Harbour Supplies, invoice intake
Owner: finance director. Drafted by the FDE after the first call. For correction.

Today    About 4,000 supplier invoices a month arrive as PDFs in one shared
         inbox. A clerk keys each one into the ledger and adds a line to the
         register. About six minutes each, by Harbour's estimate.
Failures A slash date read month first. An invoice keyed twice after a
         resend. A mistyped total. A credit note posted as an invoice. A
         supplier name that didn't match the ledger.
Cost     The finance manager pays or holds on what was keyed. A wrong entry
         means an overpayment, a double payment or a late month-end.
Request  "A chatbot for invoices."
Problem  Staff look up status because invoices sit unkeyed. Keying is the
         problem. The lookups are a symptom.
Goal     Read supplier invoices automatically, and send anything doubtful to
         a person with the reason attached.
Unknown  Today's error rate. The 200-invoice sample will measure it.`,
        },
        {
          kind: "p",
          text: "Read the page line by line. Today and Failures come straight from the call. Cost names the decision. Request keeps the customer's own words, so they see you listened. Problem is the reframe. Goal says what the system does, and says doubtful invoices go to a person.",
        },
        {
          kind: "p",
          text: "The last line is the most honest. Unknown says the error rate is not known yet, and that the 200 invoices will measure it. A statement that admits what it doesn't know is easier to trust than one that doesn't.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next customer. The problem statement, blank.",
          code: `Problem statement: ___
Owner: ___ . Drafted by the FDE after the first call. For correction.

Today    ___ (volume, who does it, in which tool, their estimate of the time)
Failures ___ (the last five, in their words)
Cost     ___ (who decides, and what a wrong one costs)
Request  "___" (their words, exactly)
Problem  ___ (the reframe, in one or two sentences)
Goal     ___ (what the system does, and where doubt goes)
Unknown  ___ (what you cannot know yet, and what will measure it)`,
        },
        {
          kind: "p",
          text: "You now have a problem the customer has agreed is theirs. The next question is the one chapter two answers. What exactly will you build first, and how will you know it worked?",
        },
      ],
    },
  ],
  recap: [
    "An FDE engagement has five stages, and engineering sits in the middle three.",
    "Discovery must establish the workflow, the data and the decision.",
    "Ask for the last five failures, and mark every estimate as an estimate.",
    "Reframe by asking what a request would change on an ordinary day.",
    "Ask about the six constraints in week one.",
    "Draft a one-page problem statement, and let the customer correct it.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In discovery I learned that the stated request is a solution. The real work is finding the problem, the data and the decision behind it, and writing it on one page the customer can correct. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["fde-craft-q01", "fde-craft-q02"],
};

export default chapter;
