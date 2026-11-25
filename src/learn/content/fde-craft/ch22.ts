import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "fde-craft-case-claims-inbox",
  course: "fde-craft",
  number: 22,
  title: "Case one: the claims inbox",
  tagline: "What does a clean hour look like? One solved case, block by block, with the files it leaves behind.",
  minutes: 10,
  objectives: [
    "Run the hour on a case you have not seen, and name the prompt each block uses.",
    "Read a finished workbook and spec, and say what each line is for.",
    "Score an hour against the nine-line scoring sheet.",
    "Spot the two mistakes this case invites.",
  ],
  sections: [
    {
      id: "uc-claims-brief",
      title: "The interviewer says one sentence, and the set-up decides what you may ask",
      goal: "What does the interviewer give me at minute zero?",
      blocks: [
        {
          kind: "p",
          text: "Chapter twenty-one left you with a kit. This chapter uses it on a solved case, so you can set your own hour beside a clean one. The customer is Marlow Insurance, which is fictional, like Calder.",
        },
        {
          kind: "p",
          text: "Marlow gets claims by email. A keyword router sends each one to one of five queues: motor, home, travel, liability and fraud. It gets many wrong. The interviewer says one sentence: \"Use AI to route our claims emails.\"",
        },
        {
          kind: "p",
          text: "Before minute 0 you ask the three set-up questions. What may be sent to the model? May you use your own prompt files? Is the code supplied? Here the answers are sample emails only, yes, and yes.",
        },
        {
          kind: "p",
          text: "The code is a small Python project with a keyword router, an inbox loop, 19 passing tests and a fake model that replays recorded replies.",
        },
      ],
    },
    {
      id: "uc-claims-hour",
      title: "Each of the six blocks ends in a file, and each uses one prompt",
      goal: "What do I say and run in each block of the hour?",
      blocks: [
        {
          kind: "list",
          ordered: true,
          items: [
            "Listen, minutes 0 to 5. Tag the brief. The wrong routing is a pain, the five queues are a fact, and AI is an idea. Say it back in one sentence, then run P1 on your notes.",
            "Discover, minutes 5 to 15. Run P2 in the repository while you question the interviewer. Volume is 1,200 emails a day, and 18 percent are re-routed by hand, which is 216. Asking how a person routes by hand brings out the policy number. Asking what must never happen brings out the fraud rule. Run P3 at minute 13.",
            "Specify, minutes 15 to 25. Choose the mechanism for each step yourself. A rule looks for the number, a model classifies the rest, a person reviews doubt, and a rule routes. Run P4, then correct the draft.",
            "Build, minutes 25 to 50. P5 gives a plan of at most six steps. P6 writes the tests for AC-1 first, from your cases, such as an email whose words say car and whose policy says home. P7 then does one step at a time, and you read each diff aloud.",
            "Walk, minutes 50 to 57. P8 runs the four scenarios in the spec. One goes home by policy and one goes home by the model. One goes to the triage desk. One is a fraud email that stays open.",
            "Close, minutes 57 to 60. P9 drafts four lines. You say them yourself: what works, what you cut, what is open and what the next hour would hold.",
          ],
        },
        {
          kind: "p",
          text: "The seam is the route function that the inbox loop takes as an argument. A new router goes in there, and the loop does not change.",
        },
        {
          kind: "quiz",
          id: "fde-craft-uc22-q1",
          question: "An email mentions a car, but it carries the policy number MI-310775, which the directory maps to home. Where does it go?",
          options: [
            "Motor, because the word car is a clear keyword.",
            "Home, because a known policy number decides the queue outright.",
            "The triage desk, because the two signals disagree.",
            "Wherever the model says, because it reads the whole email.",
          ],
          answer: 1,
          explain: "Marlow's head of claims operations ruled that the policy number wins. A known number is exact, so the model is never called.",
        },
      ],
    },
    {
      id: "uc-claims-reference",
      title: "The reference workbook and spec show what a clean hour leaves behind",
      goal: "What should my files look like at the end?",
      blocks: [
        {
          kind: "p",
          text: "Here is the workbook a clean Discover block leaves behind. Compare yours line by line.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "The reference workbook for Marlow Insurance.",
          code: `# Workbook: Marlow Insurance, 10 November 2026

## 1 Brief
Tag every line: pain, constraint, fact, idea or question.
- [pain] The keyword router sends many claims emails to the wrong queue.
- [fact] There are five queues.
- [idea] Use AI to route the emails.
- [question] How many emails come in, how many go wrong, and what does a wrong one cost?
Restated in one sentence: Marlow's keyword router puts too many claims emails in the wrong one of five queues, and Marlow wants better routing, possibly with AI.

## 2 Charter
Process in scope: Sending each incoming claims email to the queue whose team will handle it.
Owner: Head of claims operations      Users: The triage team and the five queue teams
In scope:      1 Choose the queue for each incoming claims email.
               2 Send an email to a person when the choice is doubtful.
Out of scope:  1 Replying to the customer, because the brief is about routing.
               2 Reading attachments, because the first slice works on the email text.
               3 Detecting fraud itself, because the fraud team owns that and we only route to it.
Success: Share of emails re-routed by hand | baseline 18 percent of about 1,200 a day, which is 216, from the re-route log | target under 10 percent, which is under 120 a day | confirmed by: head of claims operations, from the re-route log

## 3 Steps
| # | Step | Decision made | Data needed | System | Mechanism | Reason |
|---|------|---------------|-------------|--------|-----------|--------|
| 1 | Find a policy number | Does the email carry a known policy number, and which queue does it map to? | Email text, policy directory | Claims mailbox, policy admin system | D | A policy number decides the queue outright, so a rule is exact and free. |
| 2 | Classify the rest | Which queue, and how sure? | Email subject and body | Model, EU region | AI | Free text with no number has to be read. |
| 3 | Review doubt | Is the queue right when the model is unsure? | Email, queue, confidence | Triage desk | H | A wrong guess costs a re-route, and a person's minute costs less. |
| 4 | Route | Which queue receives it, and may it be closed? | The decision from steps 1 to 3 | Queue system | D | Moving an email changes state, so rules do it, and fraud is never closed automatically. |
Mechanism: D rules in code. AI a model reads or writes language. A an agent picks its tools.
           H a person decides. X remove the step.
Shape: D AI H D

## 4 Exceptions
| # | Exception | What happens today | How often | What the system does |
|---|-----------|--------------------|-----------|----------------------|
| E1 | Data is missing | Keywords decide, often wrongly | About 4 in 10 emails carry no policy number | The model classifies it |
| E2 | The request is invalid | A person deletes it | GAP, ask the triage lead | Out of the slice, the model may return low confidence and a person sees it |
| E3 | Two systems disagree | The email words say one queue and the policy says another | GAP | The policy number wins |
| E4 | A system is down | GAP | GAP | GAP, carried as OQ-3 |
| E5 | A person disagrees with the output | The queue team re-routes it by hand and logs it | 18 percent | The re-route log stays, and becomes the labelled set |
| E6 | The answer is ambiguous | A person reads it | GAP | Two policy numbers for different queues, or a model below 0.7, go to the triage desk |
| E7 | A value is outside the normal range | A number nobody knows is ignored | GAP | A policy number not in the directory is treated as no number |

## 5 Data
| Field the solution needs | Authoritative source | Owner | Access proven? |
|--------------------------|----------------------|-------|----------------|
| Queue for a policy | Policy directory, a nightly extract of the policy admin system | Policy admin team | Yes, data/policies.json |
| Email text | Claims mailbox | Claims operations | Yes, 12 sample emails |
| Right queue for a past email | Re-route log | Head of claims operations | No, GAP: ask for an export |
When two sources disagree, this one wins: the policy directory over the words in the email.   Decided by: head of claims operations
How fresh must it be: Nightly is enough.
May real data be used here, and what may be sent to the model: No real data here. In production personal data stays in the EU, so the model endpoint must be in an EU region.

## 6 The existing system
Entry point for one request: inbox.process(emails, route_fn) in marlow/inbox.py
The path of that request, file by file: inbox.process, router.route, policies.extract_policy_numbers, the keyword loop in router.py, then inbox.should_auto_close.
Seam where the change goes: the route_fn argument of process. A new router goes in there and process does not change. The auto-close rule changes in should_auto_close.
Tests today: 19 passing, 0 failing. They cover number extraction, the keyword router, the inbox loop, auto-close and the fake model. Two things contradict the brief: route extracts policy numbers and never uses them, and policies.load_directory exists and nothing calls it.

## 7 Open questions and assumptions
| ID | Question or assumption | Blocks | Who can answer | Status |
|----|------------------------|--------|----------------|--------|
| OQ-1 | What share of emails carry a known policy number? | The size of the saving | Head of claims operations | Answered: about 6 in 10 |
| OQ-2 | Which model endpoint is approved, and is it in the EU? | Going live | Data protection officer | Open |
| OQ-3 | What happens when the model call fails? | E4 | Platform team | Open |
| OQ-4 | Assumption: the confidence threshold is 0.7 until measured | Evaluation | Triage lead, from a labelled set | Assumed |`,
        },
        {
          kind: "p",
          text: "The shape is D, AI, H, D. Only one step belongs to the model. Five exceptions carry a GAP in the frequency column, because nobody knew the number yet. A GAP is better than a guess.",
        },
        {
          kind: "p",
          text: "The spec fits on one page, and its four criteria are checks a stranger can run.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "The reference spec for the first slice.",
          code: `# Spec: A claims email with a known policy number reaches that policy's queue, and every other email is classified or sent to a person

Shape: A rule looks for a policy number, a model classifies the rest with a confidence, a person reviews doubt, and a rule routes.
Decision: A known policy number decides the queue and the model is never called. Without one, the model returns a queue and a confidence, and anything below 0.7 goes to the triage desk.
Rejected: Sending every email to the model, because a policy number is exact and free, and the model is slower and sometimes wrong.
Human in control: The triage desk holds every doubtful email. They see the email and the reason it was held, and they choose the queue. If they disagree, they re-route it and the re-route log records it. A person closes every fraud email, and the inbox never does.
Evaluation: The 12 sample emails now, labelled by me from the brief. Before go-live, 200 emails labelled by the triage lead from the re-route log. Pass bar: 90 percent of model-routed emails in the right queue, and no fraud email auto-closed.

In scope:      1 Look up a policy number and route by it.
               2 Classify the rest with a model and a confidence.
               3 Send doubtful emails to the triage desk.
               4 Never auto-close a fraud email.
Out of scope:  1 Replying to the customer.
               2 Reading attachments.
               3 What happens when the model call fails (OQ-3).

Reply schema: {"queue": "motor | home | travel | liability | fraud", "confidence": 0 to 1}

Acceptance criteria
AC-1 An email with one known policy number gives that policy's queue, with the reason policy and no model call.
AC-2 An email with no known policy number and a model reply of 0.7 or more gives the model's queue, with the reason model.
AC-3 A model reply below 0.7, a reply that breaks the schema, or two policy numbers for different queues gives the triage desk.
AC-4 An email in the fraud queue is never auto-closed, whatever it says.

Walk this
1. Run E02, whose words say car and whose policy says home. Expect home, with the reason policy.
2. Run E03, which has no number. Expect home, with the reason model.
3. Run E08, where the model is unsure. Expect triage, with the reason low_confidence.
4. Run a fraud email whose body is only "Thanks, received." Expect it open.

Open questions carried: OQ-2, OQ-3, OQ-4`,
        },
        {
          kind: "fold",
          tone: "plain",
          title: "Where the code and the solution live",
          text: "The lab folder holds the repository, the interviewer's sheet, and these two files with the solution and its eight added tests. Run the starting tests, lay the solution over a copy, and 27 tests pass. The README in that folder gives the two-session rehearsal.",
        },
      ],
    },
    {
      id: "uc-claims-debrief",
      title: "The score shows the two mistakes this case invites",
      goal: "How do I score my hour, and what do I watch for?",
      blocks: [
        {
          kind: "p",
          text: "Score your hour against the nine-line scoring sheet. Give each line 0, 1 or 2. A line you only got after a prompt is a 1. Under 10 out of 18 is a miss.",
        },
        {
          kind: "p",
          text: "The first mistake is reaching for AI on every email. The brief says use AI, so the easy hour sends all 1,200 emails a day to the model. About six in ten carry a policy number that decides the queue outright. A rule is exact, free and instant. This costs you line four.",
        },
        {
          kind: "p",
          text: "The second mistake is skipping the fraud rule. The interviewer says it only if you ask what must never happen. The code hides it too: the inbox closes short thank-you messages from every queue, fraud included. AC-4 is the fix. Without it, line seven suffers.",
        },
        {
          kind: "quiz",
          id: "fde-craft-uc22-q2",
          question: "Your hour sends every email to the model, and you never ask what must never happen. Which two lines of the scoring sheet suffer most?",
          options: [
            "Lines one and two, the restated brief and the baseline.",
            "Lines four and seven, the mechanism reasons and the acceptance criteria with a person in control.",
            "Lines eight and nine, the running path and the close.",
            "Lines three and five, the out of scope list and the exceptions.",
          ],
          answer: 1,
          explain: "Sending every email to the model gives no real reason for a mechanism letter. Missing the fraud rule leaves out the one criterion where a wrong action does harm.",
        },
        {
          kind: "p",
          text: "Chapter twenty-three is a different shape. A fault is reported, and you must reproduce it in a test before you change anything.",
        },
      ],
    },
  ],
  lab: {
    title: "Run the claims inbox hour",
    goal: "Run the six blocks on the Marlow repository with two Claude sessions, then compare your files with the reference.",
    minutes: 60,
    files: [
      "labs/usecase-round/case-1/README.md",
      "labs/usecase-round/case-1/repo/marlow/router.py",
      "labs/usecase-round/case-1/repo/marlow/inbox.py",
      "labs/usecase-round/case-1/reference/workbook.md",
      "labs/usecase-round/case-1/reference/spec.md",
    ],
    steps: [
      {
        title: "Listen",
        text: "Copy the repository to a scratch folder and prove the 19 starting tests pass. Open one session in the interviewer folder, and do not read its sheet. Tag the brief and say it back in one sentence.",
        code: "cp -R labs/usecase-round/case-1/repo /tmp/marlow-case-1\ncd /tmp/marlow-case-1\nuv sync\nuv run pytest",
        test: "cd /tmp/marlow-case-1 && uv run pytest",
      },
      {
        title: "Discover",
        text: "Run P2 in the repository while you question the interviewer. Fill the workbook. Run P3 at minute 13.",
      },
      {
        title: "Specify",
        text: "Choose the four mechanisms yourself. Run P4 and correct the draft to one page with at least three acceptance criteria.",
      },
      {
        title: "Build",
        text: "Run P5, then P6 for AC-1, then P7 one step at a time. Read each diff aloud. Aim for one path from start to finish by minute 50.",
      },
      {
        title: "Walk",
        text: "Run P8 on the scenarios in your spec. Keep a findings list and fix nothing during the walk.",
        code: "uv run python -m marlow",
      },
      {
        title: "Close",
        text: "Run P9, then say the close aloud. Ask the interviewer session to score you, and only then open the reference folder.",
      },
    ],
    verify: "cd /tmp/marlow-case-1 && uv run pytest",
  },
  recap: [
    "The set-up questions decide what you may send to the model.",
    "Each block ends in a file and uses one prompt, from P1 to P9.",
    "A clean workbook gives each step a letter with a reason.",
    "Watch for AI on every email and for a missed fraud rule.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In the claims inbox case I learned that a known policy number routes an email with a rule, that the model only reads what has no number, and that the fraud queue is never closed automatically. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: [],
};

export default chapter;
