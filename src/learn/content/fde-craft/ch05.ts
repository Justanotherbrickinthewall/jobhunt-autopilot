import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "fde-craft-first-week-on-site",
  course: "fde-craft",
  number: 5,
  title: "The first week on site",
  tagline: "What do you do in the first week on site? You get access, measure the real baseline and start two logs.",
  minutes: 15,
  objectives: [
    "Send an access list before day one, and use the week to watch the real work and find the person who knows the exceptions.",
    "Measure the baseline from the source documents instead of trusting a correction log.",
    "Keep a risk log and a decision log, and raise the risk that only the customer can clear.",
    "Price a scope change, decline an unsafe request in writing, and keep a week-one pack to reuse.",
  ],
  sections: [
    {
      id: "first-week-on-site",
      title: "On site, the first week buys access and trust",
      goal: "I am at the customer's office from Monday, so what do I do in the first week?",
      blocks: [
        {
          kind: "p",
          text: "Chapter four ended with a signed statement of work. In the first week you do three things: get access, learn how the work really runs, and put one measured result on the table.",
        },
        {
          kind: "p",
          text: "Send the **access list** before day one, because access takes longest to arrive. It names each item, who owns it, how it will reach you and the day you need it. The statement of work's assumptions become its lines: data by day five, two named reviewers and security review in three weeks.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "Harbour's access list at the end of week one. Two items are still in security review.",
          code: `Access list, end of week one
Item                    Owner        Route                       Needed   Status
200 sample invoices     AP lead      NDA, then export            Day 3    Received
Register export         AP lead      SharePoint export           Day 3    Received
Ledger export           IT lead      Read-only extract           Day 5    Received
Two named reviewers     AP lead      Named in the kick-off       Day 5    Named
Shared mailbox, read    IT lead      Security review, ServiceNow Week 3   In review
Google Cloud project    IT lead      Security review, ServiceNow Week 3   In review`,
        },
        {
          kind: "p",
          text: "Read it in two groups. Four items arrived by day five: the sample invoices, the register export, the ledger export and the two reviewers. The mailbox and the Google Cloud project wait in the three-week security review. The list shows the sponsor which delay is not yours.",
        },
        {
          kind: "p",
          text: "Then sit with the people who do the work, and watch one real invoice go from the inbox to the ledger. Find the **person who knows the exceptions**. At Harbour, that is the accounts payable lead. Ask what usually goes wrong, and write it down.",
        },
        {
          kind: "p",
          text: "Expect corridor requests, which are small favours asked in passing. Write each one down instead of agreeing to it. The next section turns the week's main task into a number.",
        },
        {
          kind: "callout",
          tone: "insight",
          title: "If you cannot be on site",
          text: "Say what you lose: the casual talk and the chance to watch the real work. Then say how you will make up for it. Book a regular call, and ask for a screen share of one real case each week.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "How an interviewer tests on-site work",
          text: "This topic comes up in interviews. They ask how you work when you are placed at a customer's site. A strong answer says access first, then watching the real work, then something visible in week one, then a written log. A weak answer says you would build quickly and show them later.",
        },
        {
          kind: "p",
          text: "So what number do you put on the table?",
        },
      ],
    },
    {
      id: "week-one-baseline",
      title: "Harbour's real baseline is 74 percent, and the correction log hid it",
      goal: "How do you measure the baseline the pilot will be judged against?",
      blocks: [
        {
          kind: "p",
          text: "The pilot charter says go at the baseline plus 20 points. So the baseline must be measured in week one. The easy source is the correction log, which lists the errors someone fixed later.",
        },
        {
          kind: "p",
          text: "Harbour's correction log held six errors in 200 invoices, which is 3 percent. That reads as 97 percent right, and a gain of 20 points is then impossible. But nobody corrects an error that nobody sees.",
        },
        {
          kind: "p",
          text: "So re-check the sample against the PDFs. Take the 200 invoices from last quarter. The two named reviewers compare all nine header fields on each one with the PDF. An invoice counts as right only if every field is right.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "Harbour's baseline sheet for week one.",
          code: `Baseline sheet, week one
Sample             200 invoices from last quarter, re-checked against the PDFs
Right first time   148 of 200, which is 74 percent
Wrong              52 had at least one wrong header field
Caught at the time 6 of those, the 3 percent in the correction log
Go                 94 percent or more
Extend             84 to 94 percent
Stop               Under 84 percent
Always             Zero wrong amounts approved`,
        },
        {
          kind: "p",
          text: "Here are the key points. 148 of 200 invoices were right first time, which is 74 percent. 52 had a wrong field, and only 6 of those were caught at the time. The thresholds follow from the charter: go at 94, extend from 84 to 94, stop under 84. A wrong amount approved stops the pilot at any score.",
        },
        {
          kind: "p",
          text: "The finance director agrees the number, and it goes into the decision log. Those logs are next.",
        },
      ],
    },
    {
      id: "s1-cadence",
      title: "Delivery runs on a short cadence with visible risks",
      goal: "How do I keep surprises small after week one?",
      blocks: [
        {
          kind: "p",
          text: "Customers fear two things during delivery: silence and surprise. A weekly demo of the working system, measured against the 74 percent baseline, removes both. If the number dips, show it. A dip you reveal is a conversation. A dip they discover is a problem.",
        },
        {
          kind: "p",
          text: "The **risk log** lists what could change the outcome, each with an owner and an action. A **decision log** records each choice, who made it and when. In month three, the answer to why is then one search away.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "Harbour's risk log and decision log for week one.",
          code: `Risk log, week one
R1  Security review takes three weeks and holds up the mailbox.
    Owner: IT lead. Action: ticket raised on day one.
R2  The sample is released late.
    Owner: AP lead. Action: NDA signed before the kick-off.
R3  Posting misses the monthly release window.
    Owner: FDE. Action: change request filed four weeks ahead.
R4  A supplier changes its PDF format.
    Owner: FDE. Action: watch the review share by supplier.

Decision log, week one
D1  Posting is the first cut from the twelve-week date. A person posts until
    the release window. Finance director, at signing.
D2  The baseline is 74 percent, from the PDF re-check. Finance director, week 1.`,
        },
        {
          kind: "p",
          text: "Two risks belong to the customer's IT and finance side, R1 and R2. The other two are the FDE's own. D1 records that posting was cut first from the twelve-week date. D2 records the baseline.",
        },
        {
          kind: "widget",
          id: "fde-craft-risk-register",
          intro: "Week three of the Harbour Supplies pilot. Rate six risks and pick the one to raise with the sponsor this week.",
        },
        {
          kind: "p",
          text: "Raise the highest-scoring risk that only the customer can clear. Fix the rest yourself.",
        },
        {
          kind: "quiz",
          id: "fde-craft03-q1",
          question: "Which risk should you raise with the sponsor this week?",
          options: [
            "The risk you can fix yourself in an afternoon.",
            "The highest-scoring risk that only the customer can clear.",
            "The risk that is most interesting technically.",
            "Every risk, in order.",
          ],
          answer: 1,
          explain: "Raise what you cannot fix alone and what is expensive if ignored. Fix the rest without a meeting.",
        },
        {
          kind: "p",
          text: "Meanwhile, the customer keeps asking for more.",
        },
      ],
    },
    {
      id: "s4-no-and-escalation",
      title: "Saying no and escalating are part of delivery",
      goal: "How do I handle scope creep and unsafe requests without losing trust?",
      blocks: [
        {
          kind: "p",
          text: "**Scope creep** is new work added to a pilot after the scope is agreed. It arrives as one small request in a weekly demo. Can it also handle purchase orders? Together such requests bury the pilot and its metric.",
        },
        {
          kind: "p",
          text: "Do not say no flatly. Say what it would cost, and offer a trade. The new item takes about a week, so the date slips or something goes to phase two. The sponsor chooses, and you write the choice in the decision log, as D1 shows.",
        },
        {
          kind: "p",
          text: "Some requests are safety matters. Someone may ask you to post payments with nobody reviewing them, or to copy supplier bank details into a test system. Do not negotiate those in the weekly call.",
        },
        {
          kind: "list",
          items: [
            "Say clearly that you cannot do it as asked, and why, in one sentence.",
            "Offer a safer way to meet the underlying need.",
            "Put the request and your answer in writing to the sponsor.",
            "If it persists, escalate it to your own manager and to the customer's security or compliance owner.",
          ],
        },
        {
          kind: "callout",
          tone: "interview",
          title: "How an interviewer tests scope creep",
          text: "This topic comes up in interviews. They ask: the customer keeps adding scope mid-pilot, what do you do? A strong answer prices each request, offers a trade against the agreed metric, records the decision and escalates only when the request is unsafe. A weak answer says you would just work harder.",
        },
        {
          kind: "quiz",
          id: "fde-craft03-q4",
          question: "A stakeholder asks for payments to post with nobody reviewing them, to save time. What do you do?",
          options: [
            "Add it, since they own the process.",
            "Decline as asked, explain the risk, offer a faster way to review, and put it in writing to the sponsor.",
            "Ignore the request.",
            "Ask your own engineers to decide.",
          ],
          answer: 1,
          explain: "A safety control is not yours to remove quietly. Decline, offer an alternative, and record it.",
        },
        {
          kind: "p",
          text: "Keep the week's four artefacts as one pack. Here is the blank version for your next customer.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next customer: the week-one pack, with blank values.",
          code: `Access list, end of week one
Item   Owner   Route (NDA, export, security review)   Needed (day)   Status

Baseline sheet, week one
Sample             (how many, from when, re-checked against what)
Right first time   ___ of ___, which is ___ percent
Wrong              ___ had at least one wrong header field
Caught at the time ___ of those
Go                 (baseline plus the charter's gain)
Extend             (baseline plus the charter's lower gain)
Stop               (below that)
Always             (the one hard stop)

Risk log, week one
R1  (what could change the outcome)
    Owner: ___. Action: ___.

Decision log, week one
D1  (the choice). Who decided: ___. When: ___.`,
        },
        {
          kind: "p",
          text: "The week is over and the number is agreed. What shape should the system take? Chapter six answers that.",
        },
      ],
    },
  ],
  recap: [
    "On site, send the access list first, watch the real work and find the person who knows the exceptions.",
    "Measure the baseline from the PDFs. Harbour's is 74 percent, not the 97 percent its correction log implied.",
    "Keep a risk log and a decision log, and raise the risk that only the customer can clear.",
    "Price scope changes and offer trades. Decline unsafe requests in writing and escalate if they persist.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In the first week on site I learned to get access first, measure the baseline from the source documents and write every risk and decision down. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["fde-craft-q06", "fde-craft-q20"],
};

export default chapter;
