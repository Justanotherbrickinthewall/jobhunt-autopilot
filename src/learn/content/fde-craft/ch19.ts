import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "fde-craft-one-page-spec",
  course: "fde-craft",
  number: 19,
  title: "The one-page spec and the first slice",
  tagline: "Calder's workbook is full at minute 15. How do you turn it into one page someone could build from, in ten minutes?",
  minutes: 10,
  objectives: [
    "Turn the workbook's shape into a two-sentence decision.",
    "Write the rejected alternative, the human in control and the evaluation.",
    "Choose a first slice that runs from end to end, and the scenarios to walk.",
    "Write acceptance criteria with a trigger and an exact outcome.",
    "Read Calder's spec and reuse its template.",
    "Have Claude draft the spec, and correct the line it gets wrong.",
  ],
  sections: [
    {
      id: "uc-shape-to-decision",
      title: "The spec turns the shape into a decision you can defend in two sentences",
      goal: "What does the spec say first?",
      blocks: [
        {
          kind: "p",
          text: "The **spec** is one page, `spec.md`, written in Specify, minutes 15 to 25. It is chapter eight's specification, cut to what ten minutes allows, plus the first slice. It opens with the workbook's shape, written as one sentence.",
        },
        {
          kind: "p",
          text: "Then comes the decision: what you will build, in two sentences. The shape says which kind of thing does each step. The decision says which code does it.",
        },
        {
          kind: "p",
          text: "Calder's shape, AI D D AI H D, becomes a sentence. The model reads the request, code checks the rules and the next collection, the model explains, the customer confirms, and code writes.",
        },
        {
          kind: "p",
          text: "The decision is a new tool, `check_payment_day`, that applies every rule in code and writes nothing. The write happens only when the customer's next message is YES.",
        },
        {
          kind: "p",
          text: "Three short lines follow the decision.",
        },
      ],
    },
    {
      id: "uc-three-lines",
      title: "Three lines show your judgement: what you rejected, who stays in control, and how you will know",
      goal: "What do the rejected, human and evaluation lines hold?",
      blocks: [
        {
          kind: "p",
          text: "Each of the three lines answers a question an interviewer is likely to ask.",
        },
        {
          kind: "list",
          items: [
            "Rejected names the obvious alternative and why you turned it down. It shows you saw more than one design.",
            "Human in control names the step that holds a person, what they see, and what happens when they say no.",
            "Evaluation names the cases, who labelled them and the pass bar. It says how you will know the slice works.",
          ],
        },
        {
          kind: "p",
          text: "Calder rejects a write tool that the model calls itself, because the billing API accepts any date. The customer is in control at the confirm step. They see the new day, and any reply but YES writes nothing.",
        },
        {
          kind: "p",
          text: "The evaluation is twelve cases on five sample accounts, labelled by you from the rules billing operations stated. All twelve must pass.",
        },
        {
          kind: "p",
          text: "Next you choose what to build first.",
        },
      ],
    },
    {
      id: "uc-slice-walk",
      title: "The first slice is the thinnest path from request to result, with the checkpoint inside it",
      goal: "What do I build first, and how will I show it works?",
      blocks: [
        {
          kind: "p",
          text: "The **slice** is what you build in the next 25 minutes. It is a **walking skeleton**: the thinnest path through the whole system, with the human checkpoint and the output. It is never one layer alone, such as only the rules or only the prompt.",
        },
        {
          kind: "p",
          text: "The spec's title states the slice as a claim. Calder's says a customer in good standing changes their payment date and sees it confirmed. A customer who may not is told why and offered a person.",
        },
        {
          kind: "p",
          text: "**Walk this** is the spec's list of scenarios to run at minute 50, as a user would. Calder has three. The third is a case you are unsure of: a customer asks for the day they already have.",
        },
        {
          kind: "quiz",
          id: "fde-craft-uc19-q1",
          question: "Which first slice is a walking skeleton for Calder?",
          options: [
            "All four rules in payment_day.py, fully tested, with no change to the agent.",
            "One customer asks, the rules pass, the customer says YES and the day is written, plus one refusal.",
            "A better system prompt, so the model explains the rules well.",
            "The confirm step only, with the rules left for later.",
          ],
          answer: 1,
          explain: "A walking skeleton runs from the request to the write, through the checkpoint. The rules alone are one layer, and so is the prompt. Neither shows the slice works from end to end.",
        },
        {
          kind: "p",
          text: "The criteria say exactly what working means.",
        },
      ],
    },
    {
      id: "uc-acceptance",
      title: "Each acceptance criterion names a trigger and an exact outcome",
      goal: "How do I write acceptance criteria in ten minutes?",
      blocks: [
        {
          kind: "p",
          text: "Acceptance criteria, from chapter eight, are checks a stranger could run. In ten minutes, each one is a single line: a trigger, then the exact outcome. The cut line is three of them.",
        },
        {
          kind: "p",
          text: "Exact means a value you can compare. \"Handles arrears well\" cannot be checked. \"Account C-1005 gives a transfer to a person and no write\" can.",
        },
        {
          kind: "p",
          text: "Calder has four. AC-1 is the happy path, with the exact write. AC-2 says any reply but YES writes nothing. AC-3 lists the refusals and the case six working days out, which is allowed. AC-4 sends arrears to a person.",
        },
        {
          kind: "quiz",
          id: "fde-craft-uc19-q2",
          question: "Which line is an acceptance criterion a stranger could check?",
          options: [
            "The agent handles date changes correctly.",
            "Customers are happier with the chat.",
            "C-1003, whose next collection is five working days away, gives the reason too_close_to_collection and no write.",
            "The rules are applied in line with policy.",
          ],
          answer: 2,
          explain: "It names the account, the trigger and the exact result, so anyone can run it and compare. The others need someone to judge what correct or happier means.",
        },
        {
          kind: "p",
          text: "Here is the whole page.",
        },
      ],
    },
    {
      id: "uc-calder-spec",
      title: "Calder's spec fits on one page and carries four open questions",
      goal: "What does a finished one-page spec look like?",
      blocks: [
        {
          kind: "code",
          lang: "text",
          caption: "Calder's spec at minute 25.",
          code: `# Spec: A customer in good standing moves their payment date and sees it confirmed, and a customer who may not is told why and offered a person

Shape: The model reads the request, code checks the rules and the next collection, the model explains, the customer confirms, and code writes.
Decision: Add a \`check_payment_day\` tool that applies every rule in code and writes nothing. The write happens in \`agent.py\` only when the customer's next message is YES.
Rejected: a \`set_payment_day\` tool that the model calls itself because the billing API accepts any date, so one wrong model call would write a date the rules forbid.
Human in control: The customer, at step 5. They see the new day and reply YES, and any other reply writes nothing. An account in arrears goes to a contact-centre colleague.
Evaluation: Twelve cases on five sample accounts, labelled by me from the rules billing operations stated. The bar is all twelve pass, and no write happens without YES.

In scope:      1 Moving the payment day for the logged-in account, under the four rules
               2 Refusal with the reason, and the offer of a person
               3 Arrears goes to a person
Out of scope:  1 Bank holidays (OQ-3)
               2 Billing being down (OQ-5)
               3 Changing the amount

Reply schema: {"tool": "check_payment_day", "args": {"new_day": <integer>}} or {"reply": "<text>"}. It is the agent's existing schema with one new tool.

Acceptance criteria
AC-1 C-1001 asks for the 20th and replies YES gives one write, ("C-1001", 20, 2 March 2026), and a reply that says day 20
AC-2 Any reply but YES, or no reply yet, gives no write
AC-3 Day 0 or 31 (C-1001), a change inside twelve months (C-1002), or five working days or fewer to the next collection (C-1003) gives no write and the reason day_out_of_range, changed_recently or too_close_to_collection. Six working days (C-1004) is allowed
AC-4 An account in arrears (C-1005) gives a transfer to a person and no write

Walk this
1. C-1001 asks to move to the 20th, and replies YES.
2. C-1003 asks to move to the 20th.
3. C-1001 asks to move to the 1st, the day it already has, and replies YES.

Open questions carried: OQ-3, OQ-4, OQ-5, OQ-6`,
        },
        {
          kind: "p",
          text: "Read it top to bottom. The title is the slice. The decision puts every rule in a new tool and the write behind YES. The rejected line explains why the model never holds the write.",
        },
        {
          kind: "p",
          text: "The scope leaves out bank holidays, an outage and the amount. The reply schema is the agent's existing one, with one new tool. Four criteria and three scenarios to walk follow, and four open questions carry over from the workbook.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next round. The spec template, blank.",
          code: `# Spec: <the slice as a claim, such as "A customer in good standing moves their payment date">

Shape: <the letters from the workbook, as one sentence>
Decision: <what we build, in two sentences>
Rejected: <the alternative> because <the reason>
Human in control: <which step holds a person, what they see, what happens when they say no>
Evaluation: <the cases, who labelled them, the pass bar>

In scope:      1 ...
Out of scope:  1 ...

Reply schema: <the JSON a model call must return, if there is one>

Acceptance criteria
AC-1 <trigger> gives <exact outcome>
AC-2 ...
AC-3 ...

Walk this
1. ...
2. ...

Open questions carried: OQ-...`,
        },
        {
          kind: "p",
          text: "You did not type that page from nothing. Claude drafted it, and one line of the draft was wrong.",
        },
      ],
    },
    {
      id: "uc-claude-draft",
      title: "Claude drafts the spec in a minute, and you correct the line it got wrong",
      goal: "How do I use Claude to draft the spec without letting it choose the design?",
      blocks: [
        {
          kind: "p",
          text: "At minute 15 you give Claude the workbook and the template with prompt P4. It drafts in about a minute. You spend the rest of the block reading and correcting.",
        },
        {
          kind: "step",
          id: "fdecraft19-s1",
          title: "Ask Claude to draft the spec",
          text: "Paste the spec template, then the whole workbook, into this prompt. Read the draft line by line against your workbook before you keep any of it.",
          lang: "text",
          code: `P4  Draft the spec from the workbook (minute 15)
Draft spec.md from this workbook, using this template. Use only what the workbook
says. Where the template needs something the workbook lacks, write GAP. Do not
choose the mechanism for any step. I have chosen them.
<paste the spec template, then workbook.md>`,
          file: "spec.md",
          expect: "A spec in the template's order, using only the workbook. GAP wherever the workbook has nothing, such as the evaluation. No mechanism chosen for any step, so the decision must match the workbook's letters.",
        },
        {
          kind: "p",
          text: "Claude's draft of Calder's spec was mostly right. It wrote GAP for the rejected line and the evaluation, because the workbook held neither. It got one line wrong.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "The top of Claude's first draft. The decision line is the wrong one.",
          code: `Claude's first draft of spec.md, from P4, the first five lines

Shape: The model reads the request, code checks the rules and the next collection, the model explains, the customer confirms, and code writes.
Decision: Add a set_payment_day tool to the registry. The model checks the four rules against the account before it calls the tool, and asks the customer to confirm first.
Rejected: GAP. The workbook names no alternative.
Human in control: The customer confirms the new day before the model calls set_payment_day.
Evaluation: GAP. The workbook names no cases and no pass bar.`,
        },
        {
          kind: "p",
          text: "Read the decision against the shape above it. The shape says code checks the rules. The decision says the model checks them, then calls a tool that writes. Claude chose a mechanism, which P4 told it not to do.",
        },
        {
          kind: "p",
          text: "You say it aloud. \"The decision is wrong. My workbook makes the rule check D, and the billing API accepts any date. If the model misjudges one rule, we write a date the rules forbid. Code checks the rules, and the write waits for YES.\"",
        },
        {
          kind: "p",
          text: "Then you keep Claude's design as the rejected line. A wrong draft is often the obvious alternative, and naming it shows you weighed it.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Claude builds around the code it has already seen",
          text: "The map found `set_payment_day`, so the draft built around it. Read every decision line against your own shape before you accept it.",
        },
        {
          kind: "quiz",
          id: "fde-craft-uc19-q3",
          question: "Claude's draft says the model checks the four rules, then calls set_payment_day. What is the main problem?",
          options: [
            "The draft is too short.",
            "The model would need a longer prompt.",
            "It makes a written rule a model's judgement, in front of a write that checks nothing.",
            "set_payment_day has the wrong name.",
          ],
          answer: 2,
          explain: "The workbook gave the rule check the letter D. The billing API accepts any date, so one misjudged rule becomes a bad write. Code must check the rules before anything is written.",
        },
        {
          kind: "p",
          text: "At minute 25 the spec holds four criteria and three scenarios to walk. The next 25 minutes build the slice while Claude types. How do you keep the build yours?",
        },
      ],
    },
  ],
  recap: [
    "The spec opens with the shape as a sentence and a two-sentence decision.",
    "Rejected, human in control and evaluation each answer a likely question.",
    "The first slice is a walking skeleton, with scenarios to walk at minute 50.",
    "Each acceptance criterion is a trigger and an exact outcome.",
    "Calder's spec puts every rule in code and the write behind YES.",
    "Claude drafts the spec, and you read each line against your own shape.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In the spec I learned to turn the shape into a two-sentence decision, to name what I rejected and who stays in control, and to write criteria a stranger can check. When Claude drafts, I read the decision against my own shape. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["fde-craft-q29"],
};

export default chapter;
