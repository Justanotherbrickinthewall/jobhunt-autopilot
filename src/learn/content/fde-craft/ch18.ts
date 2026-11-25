import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "fde-craft-discovery-workbook",
  course: "fde-craft",
  number: 18,
  title: "The discovery workbook",
  tagline: "Calder's brief is tagged at minute 5. What goes on the page in the next ten minutes, and how do you fill it while the interviewer watches?",
  minutes: 15,
  objectives: [
    "Use a page of blank rows as your list of questions.",
    "Write a charter with a process, an owner and a baseline.",
    "Give every step a mechanism letter and a reason.",
    "Ask the seven standard exceptions.",
    "Fill the data table and read Claude's map of the code.",
    "Keep every gap as an open question with an owner.",
    "Read Calder's filled workbook and reuse its template.",
    "Fill the workbook live, in the order of the clock.",
  ],
  sections: [
    {
      id: "uc-workbook-page",
      title: "A workbook is one page whose blank rows are your next questions",
      goal: "What is the workbook, and why does it have blank rows?",
      blocks: [
        {
          kind: "p",
          text: "The **workbook** is one Markdown file, `workbook.md`, that you fill during Discover. It has seven sections: brief, charter, steps, exceptions, data, the existing system and open questions. You wrote the brief in Listen.",
        },
        {
          kind: "p",
          text: "Every blank row is the next question to ask. Under pressure you never wonder what to ask, because the page tells you. You find the first empty cell and ask about it.",
        },
        {
          kind: "p",
          text: "Ten minutes cannot fill every row, and that is expected. A blank you name aloud scores better than a row filled with a guess.",
        },
        {
          kind: "p",
          text: "The charter comes first, because it decides what the rest is about.",
        },
      ],
    },
    {
      id: "uc-charter",
      title: "The charter fixes the process, its owner and a baseline in five lines",
      goal: "What do I ask first, and what counts as success?",
      blocks: [
        {
          kind: "p",
          text: "The **charter** is five lines that say what you are changing and how anyone will know it worked. Name a business process, never a technology. Name the owner, who answers for the process, and the users, who touch it every day.",
        },
        {
          kind: "p",
          text: "Then list what is in scope and what is out, with a reason for each thing left out. Last comes success: a measure, a **baseline**, a target and who confirms it. A baseline is a number that existed before today.",
        },
        {
          kind: "p",
          text: "For Calder you ask who owns this process. The interviewer says the billing operations manager. You ask how many calls come in, and hear about 900 a month, by the contact centre's own count. Nobody has set a target, so the target is written as GAP.",
        },
        {
          kind: "p",
          text: "The process is changing the day a direct debit is collected. That names work people do today. Changing the amount is out of scope, because it is a different process with its own rules.",
        },
        {
          kind: "p",
          text: "With the charter set, you lay out the steps.",
        },
      ],
    },
    {
      id: "uc-mechanisms",
      title: "Every step gets a mechanism letter and a reason, and AI is not the default",
      goal: "How do I decide which steps need a model?",
      blocks: [
        {
          kind: "p",
          text: "The steps table lists what happens, in order, and what each step decides. Each step then gets one **mechanism letter**, which names the kind of thing that does the step.",
        },
        {
          kind: "list",
          items: [
            "D means rules in code.",
            "AI means a model reads or writes language.",
            "A means an agent picks its own tools.",
            "H means a person decides.",
            "X means the step is removed.",
          ],
        },
        {
          kind: "p",
          text: "AI is not the default. Every letter carries a reason. A step that pays out money or changes state is D, with H beside it. The **shape** is the letters in order, and it is the design in one line.",
        },
        {
          kind: "p",
          text: "Calder has six steps. The model reads the request, because free text comes in. Code checks the rules, because they are written down. Code works out the next collection, because that is date arithmetic. The model explains the result. The customer confirms. Code writes the new day.",
        },
        {
          kind: "p",
          text: "So Calder's shape is AI D D AI H D. Two of the six steps use a model, and neither one decides anything.",
        },
        {
          kind: "quiz",
          id: "fde-craft-uc18-q1",
          question: "Calder's rule says a date may move once in twelve months. Which mechanism letter checks it?",
          options: [
            "AI, because the model can read the account and judge.",
            "D, because the rule is written down and code can check a date.",
            "A, because an agent can choose which tool to call.",
            "H, because a person should check every request.",
          ],
          answer: 1,
          explain: "A written rule on a date is code. A model can misread a date, and the same code gives the same answer every time. A person checking every request would bring back the phone call the brief wants gone.",
        },
        {
          kind: "p",
          text: "The steps show the happy path. The exceptions show the rest.",
        },
      ],
    },
    {
      id: "uc-exceptions",
      title: "Seven standard exceptions turn an empty table into seven questions",
      goal: "How do I find the cases the happy path misses?",
      blocks: [
        {
          kind: "p",
          text: "An **exception** is a case the happy path does not cover. The workbook lists seven, the same for every case, so you never have to think them up under pressure.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Data is missing.",
            "The request is invalid.",
            "Two systems disagree.",
            "A system is down.",
            "A person disagrees with the output.",
            "The answer is ambiguous.",
            "A value is outside the normal range.",
          ],
        },
        {
          kind: "p",
          text: "For each one, ask what happens today, how often, and what the new system should do. Ask at least three. That is the cut line, and line five of the scoring sheet.",
        },
        {
          kind: "p",
          text: "At Calder, the invalid request brings out three rules: arrears, a move inside twelve months, and a collection too close. The out-of-range value brings out the fourth rule, days 1 to 28 only.",
        },
        {
          kind: "p",
          text: "Two systems disagree as well. The back-office screen refuses a bad date, and the billing API accepts any date. That one answer tells you where the rules must live.",
        },
        {
          kind: "p",
          text: "Next come the data and the code.",
        },
      ],
    },
    {
      id: "uc-data-system",
      title: "The data table and Claude's map show where the facts and the change live",
      goal: "Which data do I need, and where in the code does the change go?",
      blocks: [
        {
          kind: "p",
          text: "The data section lists each field the solution needs, with its **authoritative source**, the system that wins when two disagree. It also names the owner, and whether access is proven. Proven means you have seen it work, here in the repository.",
        },
        {
          kind: "p",
          text: "While you ask questions, Claude maps the code without changing anything. You start the map at minute 5, so it runs while you talk. Chapter thirteen taught entry points and seams, and the map finds both.",
        },
        {
          kind: "step",
          id: "fdecraft18-s1",
          title: "Start Claude's map at minute 5",
          text: "Paste this prompt into the working session with your one-sentence brief filled in. Then go back to the interviewer while it reads.",
          lang: "text",
          code: `P2  Map the existing system (minute 5, runs while you ask questions)
Read this repository. Change nothing. Report in under 30 lines:
1. The entry point for one request, and the path of that request file by file.
2. Where the outside systems are called, and what stands in for them here.
3. The tests: how to run them, how many pass and fail, what they cover.
4. The seam where a change for "<the brief in one sentence>" would go, and why there.
5. Anything in the code that contradicts the brief.
Quote file names and line numbers. Write GAP where you could not tell.`,
          file: "workbook.md",
          expect: "Five numbered answers in under 30 lines, with file names and line numbers. The entry point, the outside systems and their stand-ins, the test count, one seam with a reason, and anything that contradicts the brief. GAP where Claude could not tell.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "Claude's map of Calder's repository, from P2.",
          code: `Map of the existing system (P2), read-only

1. Entry point: Agent.handle in calder/agent.py:40. One customer message goes in and one Turn
   comes out. The path: agent.py:47 asks the model, tools.py:38 finds the tool in the registry,
   the tool calls billing.py:13 get_account, and agent.py:62 records the reply.
2. Outside systems: billing.py stands in for the billing API, with get_account (line 13) and
   set_payment_day (line 17). fake_model.py stands in for the model and replays
   data/fixtures.json. No network call anywhere.
3. Tests: uv run pytest. 16 pass, 0 fail. They cover billing, the registry and the agent loop,
   including the fallback when the model replies with something that is not JSON.
   No test covers a write.
4. Seam: default_registry() in tools.py:59, because a new tool is how this agent gains an
   ability. The write itself should stay outside the model loop, at the top of handle.
5. Contradicts the brief: set_payment_day (billing.py:17) is never called, and it accepts any
   day for any account. Nothing in the code knows the date-change rules.
   The Agent takes today in its constructor (agent.py:37), so date rules can be tested.

GAP: whether the real billing API takes the same arguments as the fake one.
Not checked: data/accounts.json beyond the six rows the tests use.`,
        },
        {
          kind: "p",
          text: "You read the map, then open the two files it names to check it. The entry point is `Agent.handle`. The seam is the tool registry, so the change is a new tool. Sixteen tests pass, and none of them covers a write.",
        },
        {
          kind: "p",
          text: "The surprise is in `billing.py`. The write call, `set_payment_day`, accepts any day for any account. The brief never said so, and the code did. Every rule must live in your code.",
        },
        {
          kind: "p",
          text: "What you still cannot answer goes in the last section.",
        },
      ],
    },
    {
      id: "uc-open-questions",
      title: "Open questions hold every gap with the person who can close it",
      goal: "What do I do with the things nobody in the room knows?",
      blocks: [
        {
          kind: "p",
          text: "The last section is a table of **open questions**. Each row is a gap or an assumption, what it blocks, who can answer it, and its status. An assumption is a choice you made so you could carry on, written down so someone can overrule it.",
        },
        {
          kind: "p",
          text: "Calder ends Discover with six rows. Bank holidays block the five-day rule, and only billing operations knows. The first collection on the new day blocks the confirmation text. Billing being down is cut from the slice.",
        },
        {
          kind: "p",
          text: "One row is an assumption: twelve months run from the date of the last change, to the day. Each row is something you will say in the close. None of them is a value you made up.",
        },
        {
          kind: "step",
          id: "fdecraft18-s2",
          title: "Ask Claude for the gaps at minute 13",
          text: "Paste the whole workbook into this prompt. Claude fills nothing, and ranks the blanks by what a wrong guess would cost.",
          lang: "text",
          code: `P3  Find the gaps in my workbook (minute 13)
Here is my workbook. Do not fill any blank. List the blank rows, then the three
blanks with the highest consequence if I guess wrong, with the question I should
ask for each.
<paste workbook.md>`,
          file: "workbook.md",
          expect: "A list of the blank rows, then three blanks with the highest consequence, each with one question. For Calder, the bank-holiday rule and the first collection on the new day should be near the top. Nothing filled in.",
        },
        {
          kind: "p",
          text: "Here is the whole page at minute 15.",
        },
      ],
    },
    {
      id: "uc-calder-workbook",
      title: "Calder's workbook fits on one page at minute 15",
      goal: "What does a finished workbook look like?",
      blocks: [
        {
          kind: "code",
          lang: "text",
          caption: "Calder's workbook at minute 15, every section filled or marked as a gap.",
          code: `# Workbook: Calder Energy, 2 March 2026

## 1 Brief
Tag every line: pain, constraint, fact, idea or question.
- [fact] Customers ask the chat agent to move their direct debit date.
- [pain] The agent tells them to phone, so every request becomes a call.
- [idea] Make the agent move the date itself.
- [question] Which rules decide whether a date may move?
- [question] How many of these calls come in today?
Restated in one sentence: A customer who asks the chat agent to move their direct debit date gets it moved there, within the rules, or is told why not and offered a person.

## 2 Charter
Process in scope: Changing the day of the month a customer's direct debit is collected.
Owner: Billing operations manager      Users: Customers in the chat, and contact-centre colleagues
In scope:      1 A customer moves their own payment day in the chat
               2 A customer who may not is told why and offered a person
Out of scope:  1 Changing the amount of the direct debit  because it is a different process with its own rules
               2 Setting up or cancelling a direct debit  because the brief is about the date only
Success: Date-change calls a month | baseline about 900, the contact centre's own count | target GAP (OQ-2) | confirmed by: contact centre manager

## 3 Steps
| # | Step | Decision made | Data needed | System | Mechanism | Reason |
|---|------|---------------|-------------|--------|-----------|--------|
| 1 | Read the request | Is it a date change, and to which day? | The customer's message | Chat agent | AI | Free text in, one day out |
| 2 | Check the rules | May this account move now? | Arrears, last change, the day asked | Billing API, rules in our code | D | The rules are written down, and the API checks none of them |
| 3 | Work out the next collection | Is it more than five working days away? | Payment day, today | Billing API | D | Date arithmetic |
| 4 | Explain the result | What does the customer hear? | The check result and its reason | Chat agent | AI | Wording only, no decision |
| 5 | Confirm | Does the customer want this day? | The customer's YES | Chat agent | H | The customer decides, and code reads only YES |
| 6 | Write the new day | None | Account, new day | Billing API | D | A change of state, run only after step 5 |
Mechanism: D rules in code. AI a model reads or writes language. A an agent picks its tools.
           H a person decides. X remove the step.
Shape: AI D D AI H D

## 4 Exceptions
| # | Exception | What happens today | How often | What the system does |
|---|-----------|--------------------|-----------|----------------------|
| E1 | Data is missing | The customer names no day, and the colleague asks for one | GAP, contact centre | Asks for a day from 1 to 28 |
| E2 | The request is invalid | Arrears, a move inside twelve months, or a collection five working days away or less | GAP, contact centre | Refuses with the reason, and offers a person. Arrears goes straight to a person |
| E3 | Two systems disagree | The billing API accepts any date, and the back-office screen refuses | Every request | Our code applies the screen's rules before any write |
| E4 | A system is down | The colleague asks the customer to call back | GAP, billing operations | Cut from the first slice (OQ-5) |
| E5 | A person disagrees with the output | The customer argues with a refusal | GAP, contact centre | Offers a person |
| E6 | The answer is ambiguous | "The end of the month", "after payday" | GAP, contact centre | Asks for a number from 1 to 28 |
| E7 | A value is outside the normal range | The customer asks for the 29th, 30th or 31st | GAP, contact centre | Refuses, and asks for a day from 1 to 28 |

## 5 Data
| Field the solution needs | Authoritative source | Owner | Access proven? |
|--------------------------|----------------------|-------|----------------|
| Payment day | Billing API, \`get_account\` | Billing operations | Yes, in the repo |
| Arrears | Billing API, \`get_account\` | Billing operations | Yes, in the repo |
| Date of the last change | Billing API, \`day_changed_on\` | Billing operations | Yes, in the repo |
| The move rules | Back-office screen, as billing operations stated them | Billing operations | No, stated aloud only |
| Bank holidays | GAP (OQ-3) | Billing operations | No |
When two sources disagree, this one wins: the billing API holds the record, and the back-office rules decide whether a move is allowed.   Decided by: billing operations manager
How fresh must it be: read at the moment of the request, and the API is live.
May real data be used here, and what may be sent to the model: no real data, only the sample accounts. The payment day and the check result may go to the model.

## 6 The existing system
Entry point for one request: \`Agent.handle(conversation_id, account_id, text)\` in \`calder/agent.py\`
The path of that request, file by file: \`agent.py\` asks the model, \`tools.py\` looks up the tool in the registry and runs it, \`billing.py\` answers \`get_account\`, and \`agent.py\` returns the reply.
Seam where the change goes: a new tool in \`default_registry()\` in \`tools.py\`, and a check for YES at the top of \`handle\` in \`agent.py\`. The write stays outside the model loop.
Tests today: 16 passing, 0 failing. They cover billing, the registry and the agent loop. None covers a write.
Found in the code: \`set_payment_day\` in \`billing.py\` accepts any day for any account, so every rule must be ours.

## 7 Open questions and assumptions
| ID | Question or assumption | Blocks | Who can answer | Status |
|----|------------------------|--------|----------------|--------|
| OQ-1 | The customer confirms by typing YES | AC-1, AC-2 | Interviewer, for the chat product | Assumed, and confirmed by the interviewer |
| OQ-2 | What is the target for date-change calls? | Success line | Contact centre manager | Open |
| OQ-3 | Do bank holidays count as working days? | The five-day rule | Billing operations | Open. The slice counts Monday to Friday |
| OQ-4 | When does the first collection on the new day fall? | The confirmation text | Billing operations | Open |
| OQ-5 | What does the agent do when billing is down? | E4 | Billing operations | Open. Cut from the slice |
| OQ-6 | Twelve months run from the date of the last change, to the day | The once-a-year rule | Billing operations | Assumed |`,
        },
        {
          kind: "p",
          text: "Read it top to bottom. The charter names the process and its owner, with a baseline of about 900 calls a month and the target as a gap. The shape is AI D D AI H D. Six of the seven exceptions have an answer, and the outage is cut.",
        },
        {
          kind: "p",
          text: "The data table has five fields, and two are not proven. The existing system names the entry point, the seam and the write that checks nothing. Six open questions close the page, each with who can answer it.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next round. The workbook template, blank.",
          code: `# Workbook: <customer>, <date>

## 1 Brief
Tag every line: pain, constraint, fact, idea or question.
- [pain] ...
Restated in one sentence: ...

## 2 Charter
Process in scope: <one sentence naming a business process, not a technology>
Owner: <who answers for this process>      Users: <who touches it each day>
In scope:      1 ...
Out of scope:  1 ...  because ...
Success: <measure> | baseline <a number that existed before today> | target | confirmed by: ...

## 3 Steps
| # | Step | Decision made | Data needed | System | Mechanism | Reason |
|---|------|---------------|-------------|--------|-----------|--------|
Mechanism: D rules in code. AI a model reads or writes language. A an agent picks its tools.
           H a person decides. X remove the step.
Shape: <the letters in order>

## 4 Exceptions
| # | Exception | What happens today | How often | What the system does |
|---|-----------|--------------------|-----------|----------------------|
| E1 | Data is missing | | | |
| E2 | The request is invalid | | | |
| E3 | Two systems disagree | | | |
| E4 | A system is down | | | |
| E5 | A person disagrees with the output | | | |
| E6 | The answer is ambiguous | | | |
| E7 | A value is outside the normal range | | | |

## 5 Data
| Field the solution needs | Authoritative source | Owner | Access proven? |
|--------------------------|----------------------|-------|----------------|
When two sources disagree, this one wins: ...   Decided by: ...
How fresh must it be: ...
May real data be used here, and what may be sent to the model: ...

## 6 The existing system
Entry point for one request: ...
The path of that request, file by file: ...
Seam where the change goes: ...
Tests today: <count passing, count failing, what they cover>

## 7 Open questions and assumptions
| ID | Question or assumption | Blocks | Who can answer | Status |
|----|------------------------|--------|----------------|--------|`,
        },
        {
          kind: "p",
          text: "A page is one thing. Filling it in ten minutes, aloud, is another.",
        },
      ],
    },
    {
      id: "uc-workbook-live",
      title: "Live, you fill the workbook in the order of the clock, out loud",
      goal: "How do I fill the workbook in ten minutes with someone watching?",
      blocks: [
        {
          kind: "p",
          text: "In the room, the workbook is your script for ten minutes. This order fits the clock.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Minute 5. Start the map, so Claude reads the code while you talk.",
            "Minutes 5 to 8. Ask for the process, the owner, the users, the baseline and the target.",
            "Minutes 8 to 11. Say each step aloud with its letter and reason, and ask whether one is missing.",
            "Minutes 11 to 13. Ask at least three exceptions, starting with the one that would hurt most.",
            "Minute 13. Read the map, name the seam, and ask Claude for the gaps.",
            "Minutes 13 to 15. Ask the one or two gaps ranked highest, and write the rest as open questions.",
          ],
        },
        {
          kind: "p",
          text: "Type into the file as you talk, so the interviewer sees the page grow. Say each gap aloud as you write it.",
        },
        {
          kind: "quiz",
          id: "fde-craft-uc18-q2",
          question: "At minute 13, Claude ranks bank holidays as the riskiest gap. The interviewer does not know the rule. What goes in the workbook?",
          options: [
            "Claude's list of UK bank holidays, to save time.",
            "An open question with billing operations as owner, and a note that the slice counts Monday to Friday.",
            "Nothing, because it is too small to matter.",
            "A reminder to look it up after the round.",
          ],
          answer: 1,
          explain: "A gap stays a gap, with who can close it. Saying what the slice does meanwhile keeps the build moving. Claude's list would be a value nobody at Calder confirmed.",
        },
        {
          kind: "quiz",
          id: "fde-craft-uc18-q3",
          question: "Claude's map says the billing write call accepts any day for any account. What does that change?",
          options: [
            "Nothing, because the API is the customer's concern.",
            "Every rule must be checked in your code before the write.",
            "The model should be told the rules in its prompt.",
            "The write call should be removed from the slice.",
          ],
          answer: 1,
          explain: "The API trusts whoever calls it, so your code is the only place the rules can hold. Rules in a prompt are advice to a model, and a model can ignore them.",
        },
        {
          kind: "p",
          text: "At minute 15 the page is full enough to decide on. The next ten minutes turn it into one page someone could build from. What goes in that spec, and what does Claude get wrong when it drafts one?",
        },
      ],
    },
  ],
  recap: [
    "The workbook is one page, and each blank row is your next question.",
    "The charter names a process, an owner, a baseline and a target, or the gap.",
    "Every step gets a letter and a reason, and AI is not the default.",
    "Ask at least three of the seven standard exceptions.",
    "List each field's source, and read Claude's map before you trust it.",
    "Every gap becomes an open question with who can answer it.",
    "Calder's shape is AI D D AI H D, and its write call checks nothing.",
    "Fill the page aloud in the order of the clock.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In discovery I learned to treat each blank row as my next question, to give every step a mechanism letter with a reason, and to write every unknown as an open question with an owner. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["fde-craft-q28"],
};

export default chapter;
