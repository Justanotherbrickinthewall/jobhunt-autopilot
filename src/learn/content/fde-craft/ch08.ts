import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "fde-craft-technical-spec",
  course: "fde-craft",
  number: 8,
  title: "Technical specification",
  tagline: "What must the system do, and how will anyone know it's done? You write it down as rules and criteria that someone else can test.",
  minutes: 10,
  objectives: [
    "Say what goes in a technical specification and what stays out.",
    "Read a three-page spec section by section.",
    "Write an acceptance criterion that passes or fails.",
    "Name the open questions the build depends on.",
    "Reuse the nine headings on your next customer.",
  ],
  sections: [
    {
      id: "spec-shape",
      title: "A spec ends in checks a stranger can run",
      goal: "What goes in a spec, and what stays out?",
      blocks: [
        {
          kind: "p",
          text: "Chapter seven fixed what Harbour's system stores, and chapter two's charter fixed the scope and the metric. Now the question is what it must do with that data, and how anyone will know it is done. A **technical specification** answers both. It is a short document of rules that a person who was not in the room can check.",
        },
        {
          kind: "p",
          text: "It has nine parts, from the goal to the open questions. One part is the **acceptance criteria**. An acceptance criterion is one test, written so that the answer is pass or fail.",
        },
        {
          kind: "p",
          text: "It leaves out why you chose the design, which chapter six keeps. It leaves out dates, which chapter three holds, and cost, which chapter four holds.",
        },
        {
          kind: "p",
          text: "The test for every line is simple. Could a stranger run something and say pass or fail? \"Fast\" fails. \"Fifteen minutes from arrival to status\" passes. Next, Harbour's spec in full.",
        },
      ],
    },
    {
      id: "spec-document",
      title: "Harbour's spec fits on three pages",
      goal: "What does a finished spec look like for a real customer?",
      blocks: [
        {
          kind: "p",
          text: "The FDE wrote this in week two, and the IT lead and the accounts payable lead reviewed it. The IT lead asked that the rule on where data lives be written down, and that became a line in section seven. The accounts payable lead asked about credit notes, and that became a rule in section two.",
        },
        {
          kind: "code",
          lang: "text",
          code: `Technical specification: Harbour Intake, v0.1
Owner: the FDE. Reviewers: IT lead and accounts payable lead. Week 2.

1. Goal
Read every born-digital supplier invoice into approved or needs_review within
15 minutes of arrival. A person sees anything doubtful, with the reason.

2. Out of scope
Scans go to review with no model call. Credit notes go to review. Posting and
line coding wait for milestone 5. The chatbot waits for phase two.

3. Inputs
A PDF attached to an email in the shared Outlook inbox. The supplier list and
payment terms from the ledger.

4. Reply schema: the JSON the model must return
{
  "supplier":     "string or null, exactly as printed",
  "invoice_no":   "string or null",
  "invoice_date": "YYYY-MM-DD or null",
  "due_date":     "YYYY-MM-DD or null",
  "po_number":    "string or null",
  "net_amount":   "decimal string or null",
  "vat_amount":   "decimal string or null",
  "total_amount": "decimal string or null",
  "currency":     "GBP, EUR, USD or null",
  "lines": [{"description": "string", "quantity": "decimal string or null",
             "net_amount": "decimal string"}],
  "confidence":   "number from 0 to 1"
}

5. Rules, in order
Step 1  The same file by sha256 is one document.
Step 2  No text layer: review as scan_out_of_scope, with no model call.
Step 3  Extract. Check the reply against the schema. Retry once with the errors.
        Then review as extract_failed.
Step 4  Read dates and amounts into their real types.
Step 5  Sum check: net plus VAT equals total, and the lines sum to net.
Step 6  Ledger check: the supplier resolves through supplier_alias, and no
        live copy of this invoice exists.
Step 7  Low confidence: under 0.6 goes to review.
Step 8  Clean invoices become approved. Anything else becomes needs_review,
        with every reason listed.

6. Review reasons (closed list)
blank_supplier, bad_date, bad_total, total_mismatch, lines_mismatch,
unknown_supplier, extract_failed, low_confidence, scan_out_of_scope.

7. Non-functional requirements
15 minutes from arrival to status. Data stays inside Harbour's project in the UK
or EU. Microsoft 365 sign-in. Secrets in Secret Manager. Seven-year retention, by
Harbour's policy.

8. Acceptance criteria
AC-01  The same file sent twice creates one document (sha256).
AC-02  A PDF with no text layer goes to scan_out_of_scope and makes no model call.
AC-03  A reply that fails the schema is retried once with the errors, then goes
       to extract_failed.
AC-04  Net plus VAT must equal total exactly, or total_mismatch.
AC-05  The lines must sum to net, or lines_mismatch. Cases: sums match, off by
       0.01, empty list, negative line.
AC-06  An empty supplier goes to blank_supplier. A name with no alias goes to
       unknown_supplier.
AC-07  ISO dates are read as written. Slash dates are read day-first. Anything
       else goes to bad_date.
AC-08  GBP, EUR and USD are recognised. A bare total defaults to GBP. An unreadable
       total goes to bad_total.
AC-09  A second invoice with the same supplier, number, currency and total becomes
       duplicate. Number comparison ignores case.
AC-10  Confidence under 0.6 goes to low_confidence.
AC-11  An invoice that fails an amount check never reaches approved.
AC-12  The review page shows the reasons and the PDF. Every change writes a
       correction row.
AC-13  Every status change writes one audit_event in the same transaction.
AC-14  Posting the same invoice twice creates one ledger entry (milestone 5).
AC-15  The metric query reproduces the reported number.

9. Open questions
OQ-1  Do the register's supplier names match the ledger as typed?
OQ-2  Can slash dates be read safely?
OQ-3  How often does a model reply fail the schema?`,
          caption: "Technical specification, Harbour Intake, version 0.1. Sections one to three say what comes in and what is out. Sections four to six say what the system does. Sections seven to nine say how anyone checks it.",
        },
        {
          kind: "p",
          text: "The goal sets fifteen minutes and promises that a person sees anything doubtful, with the reason. Scans, credit notes, posting and the chatbot are out of scope.",
        },
        {
          kind: "p",
          text: "Section four is the **reply schema**, the JSON the model must return. In chapter seven, schema meant the tables. Here it means the reply.",
        },
        {
          kind: "p",
          text: "Three rules are checks. The **sum check** says net plus VAT equals the total, and the lines add up to the net amount. The **ledger check** matches the supplier and invoice number against Harbour's ledger. **Low confidence** means the model scored itself under 0.6.",
        },
        {
          kind: "p",
          text: "Section seven holds the **non-functional requirements**. These are limits on how the system behaves, such as speed and where data lives. Next, the criteria in section eight.",
        },
      ],
    },
    {
      id: "spec-acceptance",
      title: "Fifteen acceptance criteria decide when Harbour's system is done",
      goal: "How do you write a criterion that someone else can run?",
      blocks: [
        {
          kind: "p",
          text: "Each criterion has an identifier, a trigger and an exact outcome. Fifteen of them cover the rules. When all fifteen pass, the system is done.",
        },
        {
          kind: "list",
          items: [
            "AC-02 is the simplest. A PDF with no text layer goes to review as scan_out_of_scope, and the system makes no model call. A tester sends a scan and checks two things: the reason, and that the model log is empty.",
            "AC-04 is exact. Net plus VAT must equal the total to the penny, or the invoice gets total_mismatch. Exactness is why chapter seven stored amounts as numeric.",
            "AC-05 has four cases. The lines match the net. They are off by 0.01. The list is empty. One line is negative.",
          ],
        },
        {
          kind: "p",
          text: "AC-05 shows why cases matter. The first case passes. The off-by-0.01 case fails, because a rounding gap is still a wrong amount. An empty list fails because nothing adds up to the net.",
        },
        {
          kind: "p",
          text: "A negative line also fails, and that is deliberate. A negative line is a credit note, and a credit note must reach a person. This closes the credit-note failure from the first call.",
        },
        {
          kind: "p",
          text: "Criteria also link to each other. AC-11 says an invoice that fails an amount check never reaches approved. AC-15 says the query for the charter's metric reproduces the reported number. Now the questions the spec cannot answer yet.",
        },
      ],
    },
    {
      id: "spec-open-questions",
      title: "Three open questions decide what you test before you build",
      goal: "What do you write down when you do not know?",
      blocks: [
        {
          kind: "p",
          text: "An **open question** is anything the build depends on and nobody knows yet. Writing it down stops you guessing in silence. Harbour has three.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "OQ-1: Do the register's supplier names match the ledger as typed? If not, good invoices go to review.",
            "OQ-2: Can slash dates be read safely? AC-07 reads them day-first.",
            "OQ-3: How often does a model reply fail the schema? AC-03 retries once.",
          ],
        },
        {
          kind: "p",
          text: "Each question names a rule that breaks if the answer is bad. Spec questions come up in interviews, usually as: what goes in a spec, and how do you know it is done? Next, the template.",
        },
      ],
    },
    {
      id: "spec-repeat",
      title: "The same nine headings work for your next customer",
      goal: "What do you copy into your next customer's spec?",
      blocks: [
        {
          kind: "p",
          text: "Copy the headings and the field names. Fill every blank in week two. \"To be agreed\" is an open question, so it goes in section nine.",
        },
        {
          kind: "code",
          lang: "text",
          code: `Technical specification: <customer and system>, v0.1
Owner: <who writes it>. Reviewers: <the people who run it afterwards>. Week <n>.

1. Goal
<one sentence: what the system produces, how soon, and who sees doubtful cases>

2. Out of scope
<what waits for a later milestone, one line each>

3. Inputs
<where the data arrives, and what lookup data the rules need>

4. Reply schema: the JSON the model must return
{ <field>: "<type, or null>", ..., "confidence": "number from 0 to 1" }

5. Rules, in order
Step 1  <the cheapest check first, such as duplicates>
Step n  <clean items become approved, everything else goes to review with every reason>

6. Review reasons (closed list)
<one name for each way an item can fail>

7. Non-functional requirements
<time limit>, <where data lives>, <sign-in>, <secrets>, <retention>

8. Acceptance criteria
AC-01  <trigger and exact outcome, so a stranger can mark it pass or fail>

9. Open questions
OQ-1  <anything the build depends on and nobody knows yet>`,
          caption: "For your next customer: the nine headings with blank values and one hint for each.",
        },
        {
          kind: "p",
          text: "Review it with the people who will run the system, before you build.",
        },
        {
          kind: "quiz",
          id: "fde-craft-spec-q1",
          question: "Which of these is a testable acceptance criterion?",
          options: [
            "The system should be fast and reliable.",
            "A PDF with no text layer goes to review as scan_out_of_scope, and the model is not called.",
            "Finance will be happy with the review page.",
            "The extractor should handle most invoices well.",
          ],
          answer: 1,
          explain: "Only the second gives a trigger and an exact outcome that a stranger can check. The others have no pass or fail.",
        },
        {
          kind: "quiz",
          id: "fde-craft-spec-q2",
          question: "A line on an invoice is negative. What does AC-05 do, and why?",
          options: [
            "It accepts the invoice, because negative lines are normal.",
            "It sends the invoice to review as lines_mismatch, because a negative line is a credit note and a person must see it.",
            "It rounds the line to zero.",
            "It deletes the line and carries on.",
          ],
          answer: 1,
          explain: "A negative line means a credit note, and a credit note must reach a person. Failing the line sum guarantees that.",
        },
        {
          kind: "quiz",
          id: "fde-craft-spec-q3",
          question: "What belongs in a spec's open questions?",
          options: [
            "Anything the build depends on and nobody knows yet.",
            "Every feature the customer might want later.",
            "Complaints about the data.",
            "Questions the FDE can answer alone in a minute.",
          ],
          answer: 0,
          explain: "An open question names an unknown that could break a rule. Later wishes belong in out of scope. Quick answers should just be answered.",
        },
        {
          kind: "p",
          text: "The spec has three open questions. How do you answer them cheaply before you build?",
        },
      ],
    },
  ],
  recap: [
    "A technical specification states what the system must do in rules a stranger can check.",
    "It has nine sections, and no design reasoning, dates or cost.",
    "The sum check, the ledger check and low confidence are Harbour's three checks.",
    "An acceptance criterion gives a trigger and an exact outcome. An open question is an unknown the build depends on.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In writing a technical spec I learned to state rules a stranger can check, to end each one in a criterion that passes or fails, and to write down what nobody knows yet as open questions. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["fde-craft-q23"],
};

export default chapter;
