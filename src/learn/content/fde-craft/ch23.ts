import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "fde-craft-case-wrong-delivery",
  course: "fde-craft",
  number: 23,
  title: "Case two: the wrong delivery answer",
  tagline: "What do you do when the brief says fix it, and the fault is not where the brief points? Fennel Retail is a solved diagnosis case.",
  minutes: 10,
  objectives: [
    "Set up the diagnosis case and ask the three questions before minute zero.",
    "Run the hour so the fault is reproduced in a failing test before anything changes.",
    "Read the filled workbook and spec for Fennel Retail.",
    "Score a run, and name the two mistakes this case invites.",
  ],
  sections: [
    {
      id: "uc-delivery-brief",
      title: "The brief says fix it, and the fault is in the data and not the model",
      goal: "What is the case, and what is set up before the hour starts?",
      blocks: [
        { kind: "p", text: "Case two is a diagnosis. Fennel Retail is a fictional online shop. Its chat agent answers where-is-my-order questions, and it told 40 customers that a parcel was delivered when it was not." },
        { kind: "p", text: "The interviewer says the brief in two sentences. Our agent told 40 customers their parcel was delivered when it was not. Fix it." },
        { kind: "p", text: "Before minute zero, ask the three questions from chapter seventeen. Order ids and statuses may go to the model, and names and addresses may not. Your own prompt files are allowed. The code is supplied." },
        { kind: "p", text: "The set-up is the lab folder for case two. One Claude session plays the interviewer, and another works in the repo. The repo holds an agent, two tools, an order system, a courier feed and 17 passing tests." },
        { kind: "p", text: "This hour bends in one place. In the Build block you reproduce the fault in a failing test before you change a line. The other blocks keep the shape from chapter seventeen." },
        { kind: "quiz", id: "fde-craft-uc23-q1", question: "The agent says delivered for a parcel the courier has not delivered. The order system says delivered, and the 17 starting tests pass. What is the first thing to do in the Build block?", options: ["Add a line to the prompt telling the model to doubt the order system.", "Write a test that shows the wrong answer, and watch it fail.", "Rewrite the status tool to read the courier feed.", "Delete the tests that pass, because they missed the fault."], answer: 1, explain: "A failing test shows the fault is real and gives the fix something to turn green. The starting tests pass because they only cover orders where both systems agree, so they stay as they are." },
      ],
    },
    {
      id: "uc-delivery-hour",
      title: "The hour keeps its six blocks, and the fault is reproduced before the fix",
      goal: "What do you say and run in each block of this hour?",
      blocks: [
        { kind: "p", text: "Here is the hour for Fennel, block by block." },
        { kind: "list", ordered: true, items: ["Listen, minutes 0 to 5. Tag the brief and say one sentence: the agent says delivered for parcels the courier has not delivered. Run P1 to check your tags.", "Discover, minutes 5 to 15. Run P2 so Claude maps the repository while you ask questions. Ask for the owner, the baseline, the sources and the exceptions. At minute 13 run P3 to find the blanks.", "Specify, minutes 15 to 25. Run P4 to draft the spec, then correct it aloud. You choose the mechanism: a rule in code decides the status.", "Build, minutes 25 to 50. Run P5 for a plan of at most six steps. Use P6 for the first test, and make it the fault. Watch it fail, then run P7 one step at a time, reading every diff aloud.", "Walk, minutes 50 to 57. Run P8 with the walk list from the spec. Write down what happens, where, and what should happen.", "Close, minutes 57 to 60. Run P9 for the four lines, then say them yourself. This block is never cut."] },
        { kind: "p", text: "The failing test comes first. Ask for a test on order F1005 that expects any answer except delivered. On the starting code the agent says delivered, so the test fails, and the fault is reproduced. Then change the status tool, and only that tool." },
        { kind: "quiz", id: "fde-craft-uc23-q2", question: "At minute 14 the interviewer says the courier feed is authoritative for delivery and can lag four hours. Where does that go?", options: ["Into the prompt, as a warning to the model.", "Into the workbook as the winning source, and into the spec as a rule and a stale flag.", "Into the close only, because it is a detail.", "Nowhere, because the order system is the system of record."], answer: 1, explain: "Which source wins and how fresh it must be are two lines in the data section of the workbook. The spec then turns them into a rule in code and an acceptance criterion." },
      ],
    },
    {
      id: "uc-delivery-reference",
      title: "The reference puts the fix in the status tool, as a rule in code",
      goal: "What does a good workbook and spec look like for this case?",
      blocks: [
        { kind: "p", text: "Here are the two files a strong run leaves behind. Read them against your own." },
        { kind: "code", lang: "text", caption: "The filled workbook for Fennel Retail.", code: `# Workbook: Fennel Retail, 10 November 2026

## 1 Brief
Tag every line: pain, constraint, fact, idea or question.
- [pain] The agent told 40 customers their parcel was delivered when it was not.
- [fact] The 40 come from the complaints log over the past 14 days, out of about 4,200 status chats.
- [idea] "Fix it" names no mechanism. The fix may not be in the model at all.
- [constraint] No names, addresses or phone numbers go to the model.
- [question] Does the agent ever see the courier feed?
Restated in one sentence: The status agent says delivered for parcels the courier has not delivered, and it must say so only when it knows.

## 2 Charter
Process in scope: Telling a customer where their parcel is, when they ask on the web chat.
Owner: The head of customer service      Users: Customers on the chat, and the customer service staff who take a handover.
In scope:      1 The status answer for an existing order, and who decides that a parcel is delivered.
Out of scope:  1 Changing, cancelling or refunding an order, because the agent has no tool for it and none is wanted.
               2 Changing the courier feed, because logistics owns it.
               3 Changing how the order system closes an order, because order management owns it.
Success: Wrong "delivered" answers per 4,200 status chats | baseline 40 in the past 14 days | target 0 | confirmed by: the head of customer service, from the complaints log.

## 3 Steps
| # | Step | Decision made | Data needed | System | Mechanism | Reason |
|---|------|---------------|-------------|--------|-----------|--------|
| 1 | Read the question and pick the order | Which order, which tool | The customer's words | Chat | AI | Free text needs a model to read it |
| 2 | Look up the order | None | Order id | Order system | D | A lookup by key |
| 3 | Look up the parcel | None | Tracking id | Courier feed | D | A lookup by key |
| 4 | Decide the status | Delivered, in progress or not known | Order status, courier status, feed age | Status tool | D | The courier is authoritative for delivery, so a rule decides |
| 5 | Write the reply | The wording | The status | Chat | AI | Language for a customer, from a fixed status |
| 6 | Offer a person when the status is not known | Whether to hand over | The status | Chat | H | A person decides what to tell the customer |
Mechanism: D rules in code. AI a model reads or writes language. A an agent picks its tools.
           H a person decides. X remove the step.
Shape: AI D D D AI H

## 4 Exceptions
| # | Exception | What happens today | How often | What the system does |
|---|-----------|--------------------|-----------|----------------------|
| E1 | Data is missing | The courier has no record, the order system says delivered, and the agent says delivered | Main cause of the 40; the count is GAP, logistics could count | Status is unknown, the agent says it does not know yet and offers a person |
| E2 | The request is invalid | "I can't find that order" | GAP, customer service | No change |
| E3 | Two systems disagree | The order system wins | Part of the 40; the count is GAP, logistics | The courier wins, and its status is reported |
| E4 | A system is down | Not handled, the agent reads the order system only | GAP, logistics | A feed older than four hours is flagged stale, and the status is unknown |
| E5 | A person disagrees with the output | The customer is passed to a person | GAP, customer service | No change, and the agent does not argue |
| E6 | The answer is ambiguous | GAP | GAP | Out of this slice |
| E7 | A value is outside the normal range | GAP | Never seen | Out of this slice |

## 5 Data
| Field the solution needs | Authoritative source | Owner | Access proven? |
|--------------------------|----------------------|-------|----------------|
| Delivered or not | Courier feed | Logistics | Yes, in the repository's stand-in file |
| Order status before delivery | Order system | Order management | Yes, the status tool reads it |
| Tracking id | Order system | Order management | Yes |
| Age of the feed | Courier feed, its as_of time | Logistics | Yes |
When two sources disagree, this one wins: the courier feed, for delivery.   Decided by: the head of customer service.
How fresh must it be: The feed can lag up to four hours, so older than four hours is stale.
May real data be used here, and what may be sent to the model: No real data. The model may see order ids and statuses, and never a name, address or phone number.

## 6 The existing system
Entry point for one request: \`answer()\` in \`fennel/agent.py\`.
The path of that request, file by file: \`agent.py\` asks the model which tool to use, \`tools.py\` runs \`get_order_status\`, \`orders.py\` reads the order, then \`agent.py\` asks the model for the reply. \`courier.py\` exists and nothing calls it.
Seam where the change goes: \`get_order_status\` in \`fennel/tools.py\`, the one place that decides a status.
Tests today: 17 passing, 0 failing. They cover the tools, the courier lookups and the agent, only for orders where the two systems agree.

## 7 Open questions and assumptions
| ID | Question or assumption | Blocks | Who can answer | Status |
|----|------------------------|--------|----------------|--------|
| OQ-1 | How many of the 40 had no courier record, and how many had a courier status that disagreed? | The mix of tests, not the fix | Logistics | Open |
| OQ-2 | Is the live courier feed a file or an interface? | How the tool reads it in production | Logistics | Open |
| A-1 | The agent says "I can't confirm yet" and offers a person when it does not know | The reply wording | The head of customer service | Answered |` },
        { kind: "p", text: "Read the workbook for three things. Step four is a rule in code, letter D, because the courier is authoritative for delivery. Exception one is the fault itself. The seam is the status tool, and nothing calls the courier module." },
        { kind: "code", lang: "text", caption: "The filled spec for Fennel Retail.", code: `# Spec: A customer hears "delivered" only when the courier has confirmed it

Shape: AI reads the question, D looks up the order, D looks up the parcel, D decides the status, AI writes the reply, and H takes over when the status is not known.
Decision: Change the status tool so the courier feed decides whether a parcel is delivered, and flag a feed older than four hours as stale. When the courier has not confirmed delivery, the tool returns the status unknown, and the agent says it does not know yet and offers a person.
Rejected: Telling the model in its prompt to doubt the order system, because the model never sees the courier feed and the fault is in the data the tool returns.
Human in control: Step 6. When the status is unknown, the customer sees that the agent cannot confirm yet and is offered a person. If they say no, the agent states nothing about delivery.
Evaluation: The eight orders in the repository plus one stale case, with the expected status of each worked by hand from the facts and checked by the head of customer service. The pass bar is every case right and no "delivered" reply without a courier confirmation.

In scope:      1 The status tool decides delivery from the courier feed.
               2 The tool flags a stale feed.
               3 The agent says it does not know yet and offers a person.
Out of scope:  1 Changing the courier feed, because logistics owns it.
               2 Changing how the order system closes an order, because order management owns it.
               3 Contacting the 40 customers, because that is a service decision.

Reply schema: None for the model, which returns plain text. The tool returns {"order_id", "status", "source", "stale"}.

Acceptance criteria
AC-1 Order system says delivered and the courier has no record gives the status unknown, and a reply that does not say delivered and offers a person.
AC-2 Order system says delivered and a fresh courier feed says out_for_delivery or failed_attempt gives that courier status.
AC-3 Courier says delivered gives delivered, even when the order system still says shipped.
AC-4 A feed more than four hours old gives stale true, and the status unknown where the order system says delivered.

Walk this
1. Ask "Where is my order F1005?" and expect the cannot-confirm reply with an offer of a person.
2. Ask "Where is my order F1004?" and expect that it is out for delivery.
3. Ask "Where is my order F1001?" and expect delivered.
4. Ask "Can I speak to a person?" and expect a handover.

Open questions carried: OQ-1, OQ-2` },
        { kind: "p", text: "The spec decision takes two sentences. The rejected alternative is a prompt change, and the reason is that the model never sees the courier feed. Four acceptance criteria is one over the cut line, so drop the stale case if the clock runs short." },
      ],
    },
    {
      id: "uc-delivery-debrief",
      title: "Two mistakes cost the most marks, and both skip the order of the hour",
      goal: "How do you score the run, and what goes wrong in this case?",
      blocks: [
        { kind: "p", text: "Score yourself on the nine lines of the scoring sheet, out of 18. The workbook earns lines one to five, the map of the repository line six, and the spec line seven. The failing test and the close earn lines eight and nine." },
        { kind: "p", text: "This case invites two mistakes." },
        { kind: "list", ordered: true, items: ["Changing the prompt when the fault is in the data source. The model repeats what the tool returns, so a better prompt cannot fix a wrong status.", "Fixing before reproducing. Without a failing test you cannot show the fault was real, or that your change touched it."] },
        { kind: "p", text: "The first mistake costs lines four and six. The second costs line eight. Case three is blind, so you will see only the brief." },
      ],
    },
  ],
  lab: {
    title: "Fennel Retail: the wrong delivery answer",
    goal: "Rehearse case two against a timer. Reproduce the fault in a failing test, then fix the status tool and watch every test pass.",
    minutes: 60,
    files: ["labs/usecase-round/case-2/README.md", "labs/usecase-round/case-2/repo/fennel/tools.py", "labs/usecase-round/case-2/reference/solution/tests/test_wrong_delivery.py"],
    steps: [
      { title: "Listen, minutes 0 to 5", text: "Copy the repo to a scratch folder and run its tests: expect 17 passed. Open the interviewer session, hear the brief, tag it and say your one sentence.", code: "cp -R labs/usecase-round/case-2/repo /tmp/fennel-case-2\ncd /tmp/fennel-case-2\nuv sync\nuv run pytest", test: "cd /tmp/fennel-case-2 && uv run pytest" },
      { title: "Discover, minutes 5 to 15", text: "Fill the workbook while Claude maps the repository with P2. Ask the interviewer for the owner, the baseline, the sources and the exceptions." },
      { title: "Specify, minutes 15 to 25", text: "Draft the spec with P4 and correct it aloud. Name three acceptance criteria." },
      { title: "Build, minutes 25 to 50", text: "Write a test that reproduces the fault and run it: it must fail. Then fix get_order_status in fennel/tools.py and add the three missing reply fixtures to data/fixtures.json. Run the tests in the scratch folder.", code: "cd /tmp/fennel-case-2\nuv run pytest", test: "cd /tmp/fennel-case-2 && uv run pytest" },
      { title: "Walk, minutes 50 to 57", text: "Run the four scenarios in Walk this with P8 and list what you find." },
      { title: "Close, minutes 57 to 60", text: "Say the close: what works, what you cut, what is open and what you would do next. Ask the interviewer session to score you, then compare with the reference folder." },
    ],
    verify: "cd /tmp/fennel-case-2 && uv run pytest",
  },
  recap: [
    "The brief says fix it, and the fault is in the data the tool returns.",
    "The hour keeps its six blocks, and the Build block starts with a failing test.",
    "The reference puts the fix in the status tool as a rule in code, with the courier winning for delivery.",
    "Changing the prompt and fixing before reproducing are the two mistakes to avoid.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In the use-case round I reproduce a fault in a failing test before I change anything, and I look for it in the data a tool returns before I touch a prompt. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: [],
};

export default chapter;
