import type { InterviewQuestion } from "../types";

const questions: InterviewQuestion[] = [
  {
    id: "fde-craft-q01",
    course: "fde-craft",
    category: "discovery",
    level: "core",
    chapterId: "fde-craft-01-the-job-and-discovery",
    question: "You have a first call with a new customer next week. How do you run it?",
    idealAnswer:
      "I run it to learn three things: the workflow, the data and the decision. I ask them to take me through one real item from the moment it arrives. I also ask to see the last few that went wrong. That gives me the exceptions, which is where the cost usually sits. Then I ask for volume and handling time, so I have today's figure. I also ask who makes the final decision and what a wrong one costs. I also ask early about data access, security review, residency, procurement and release windows. Those cause delays that have nothing to do with the model. I do not talk about models at all in the first call. I send a one-page note afterwards listing what I learned, what I assumed and what I still need. I ask the sponsor to correct it. The trade-off is that a call like this feels slow to a customer who wants to see a demo. I tell them that the questions are what make the demo worth watching. If they cannot give me access to real examples, I record that as a risk with a date.",
    keywords: ["workflow", "data", "decision", "today's figure", "exceptions", "security review", "release window", "constraints note", "sponsor"],
    followUps: [
      "What if the customer only wants to talk about the solution?",
      "Whom do you insist on speaking to, and why?",
      "How do you handle a customer who cannot share any data?",
    ],
  },
  {
    id: "fde-craft-q02",
    course: "fde-craft",
    category: "discovery",
    level: "core",
    chapterId: "fde-craft-01-the-job-and-discovery",
    question: "The customer asks for a chatbot. How do you find out what they need?",
    idealAnswer:
      "I treat chatbot as a solution someone has seen, and I look for the problem behind it. I ask what the chatbot would do on an ordinary Tuesday, and when the problem last cost them something. I ask to see real examples of the questions staff would put to it. Often the answer is a narrow, repeated lookup, such as the status of an invoice. A simple search or a tool call beats a chat interface. I write the problem back in their words and check I have it right. I add a rough count of how often it happens and how long it takes. That gives me a number I can measure. I do not tell them a chatbot is wrong, because that sets me against them. If the evidence shows chat is the right shape, because the questions are varied and open, I build it. I add a measure of answer quality and a safe refusal path. The trade-off is time spent before building, which some customers resist. I answer that with one week of discovery, which is cheaper than a month of building the wrong thing. If they will not share examples, I flag that the project has no measurable number yet.",
    keywords: ["stated problem", "underlying problem", "ordinary day", "examples", "measurable number", "reframe", "lookup", "today's figure"],
    followUps: [
      "What if the sponsor insists on the chatbot anyway?",
      "How do you size the problem without data?",
      "When is a chat interface actually the right answer?",
    ],
  },
  {
    id: "fde-craft-q03",
    course: "fde-craft",
    category: "scoping",
    level: "deep",
    chapterId: "fde-craft-02-scoping-and-demos",
    question: "How do you scope a pilot so it can succeed or fail clearly?",
    idealAnswer:
      "I scope it to one workflow and one metric that the customer already cares about. I write the exit criteria before I write any code. For an invoice pipeline, the workflow is born-digital invoices from two suppliers. The metric is the share of invoices entered with every header field correct first time. In week one I measure the baseline on a sample from last quarter, using the same definition, so nobody can choose the comparison later. The criteria say what counts as go, extend and stop, with a number for each. I add a clause for outcomes that matter more than an average, such as a wrong amount approved, which stops the pilot. I cut scope by value and risk, not effort. So scans, extra languages and a chat window wait for phase two, and I write down why. I keep the safety net, which is the review queue for doubtful results. The trade-off is that a narrow pilot proves less, and the customer may feel it is small. I explain that a clear no is worth more than a vague yes. If the baseline cannot be measured, I treat that as the first thing to fix.",
    keywords: ["one workflow", "one metric", "baseline", "exit criteria", "go extend stop", "value and risk", "review queue", "phase two"],
    followUps: [
      "What do you do if the customer has no baseline?",
      "How do you set the threshold for go?",
      "What if the pilot lands in the extend zone?",
      "Who signs the exit criteria?",
    ],
  },
  {
    id: "fde-craft-q04",
    course: "fde-craft",
    category: "scoping",
    level: "senior",
    chapterId: "fde-craft-pilot-and-demo",
    question: "How do you demo a system that sometimes gets things wrong?",
    idealAnswer:
      "I demo it on the customer's own documents and I show the failures on purpose. A week ahead I ask for around ten real ones, including a scan, a credit note and the one the team dislikes. I run them all before the meeting so I know what will happen. In the room I show a case where the total does not reconcile. I show the validation rule that fires, and the invoice landing in the review queue with the reason attached. That answers the real worry, which is whether errors reach the finance system silently. I also say plainly that I do not yet have an accuracy figure on their data. The first week of the pilot produces one. If something fails live, I say what happened. I show how it was caught or admit that it was not, and add it to the cases the pilot tests. I never quote a borrowed number. The trade-off is that showing failures feels risky to some salespeople. A sceptical sponsor has seen polished demos before, and an error with a visible catch is the strongest evidence I have. If they cannot share documents, I use synthetic ones and label them on screen.",
    keywords: ["own data", "planned failure", "review queue", "validation", "no accuracy figure yet", "synthetic labelled", "sceptical sponsor", "trust"],
    followUps: [
      "What do you do if the demo fails completely?",
      "How do you prepare for a live model's variability?",
      "What if the sponsor asks for a guarantee on accuracy?",
    ],
  },
  {
    id: "fde-craft-q05",
    course: "fde-craft",
    category: "delivery",
    level: "deep",
    chapterId: "fde-craft-03-delivery-and-handover",
    question: "What does a good handover look like?",
    idealAnswer:
      "A good handover means the customer's team can run, change and evaluate the system on Monday without calling me. I test that by asking them to deploy and roll back from the documents while I watch. Every place they stop is a missing line. The package has the code with deploy steps and a runbook for the five likeliest failures. It has a labelled eval set with a command that runs it and a pass threshold. It has a named owner with an on-call route, and alert thresholds with a tried rollback. I also hand over a short list of known limits and the things we cut. That way the team is not blamed for gaps that were agreed. I treat the eval set as the most valuable item. It is how the new owners judge any later change to the prompt, the model or the code. I teach them to add every production error to it. The trade-off is time. Handover work looks like no progress, so I plan for it from the start of the project rather than the last week. If the owner is not named, I raise that as a risk, because a system without an owner decays.",
    keywords: ["runbook", "eval set", "owner", "alerts", "rollback", "deploy by the receiving team", "known limits", "Monday test"],
    followUps: [
      "What do you do if no one will own it?",
      "How do you train the team without a long course?",
      "How long after handover do you stay reachable?",
    ],
  },
  {
    id: "fde-craft-q06",
    course: "fde-craft",
    category: "delivery",
    level: "deep",
    chapterId: "fde-craft-first-week-on-site",
    question: "The customer keeps adding scope in the middle of the pilot. What do you do?",
    idealAnswer:
      "I price each request and offer a trade, rather than saying yes or no. When someone asks in a weekly demo whether it can also handle purchase orders, I say roughly what it would cost. I also say what it would displace: the date slips, or something already agreed goes to phase two. The sponsor chooses, and I record the choice in the decision log. That keeps the pilot's metric and exit criteria intact, which are what the pilot is for. I look at the pattern as well. A stream of additions often means the original scope did not match what they wanted, so I take that back to discovery with the sponsor. Some requests are different. If someone asks me to post payments with nobody reviewing them, I decline it as asked. I give one sentence of reason and offer a safer way to meet the need. I also put it in writing to the sponsor. If it persists, I take it to my manager and to the customer's security owner. The trade-off is that firm answers can feel unhelpful in the moment. A written trade is easier to defend later than a quiet yes that sinks the date. If the sponsor accepts a bigger scope, I ask for a new baseline and criteria.",
    keywords: ["price the request", "trade", "decision log", "exit criteria", "sponsor", "phase two", "unsafe request", "escalate"],
    followUps: [
      "What if the sponsor says yes to everything?",
      "How do you tell scope creep from a missed requirement?",
      "When do you escalate to your own manager?",
    ],
  },
  {
    id: "fde-craft-q20",
    course: "fde-craft",
    category: "delivery",
    level: "core",
    chapterId: "fde-craft-first-week-on-site",
    source: "practice",
    question: "Tell me how you work when you are placed at a customer's site.",
    idealAnswer:
      "Access comes first, because it takes the longest. Before day one I send an access list: laptop, network, test data and named contacts. In the first days I sit with the people who do the work and watch one real case from start to finish. I look for the person who knows the exceptions, and I ask what usually goes wrong. By the end of week one I show something working, however small, on their own machine. When someone stops me in the corridor with a request, I write it in the risk log and don't agree on the spot. I keep a decision log, and I run a weekly demo against the baseline. If I can't be on site, I say what I lose, which is the casual talk and the chance to watch the work. Then I make it up with a standing call and a screen share of one real case each week. The trade-off is that sitting and watching looks slow. It is what stops me building the wrong thing quickly.",
    keywords: ["access list", "watch the work", "person who knows the exceptions", "show something in week one", "risk log", "decision log", "weekly demo", "corridor request"],
    followUps: [
      "You cannot get access in week one. What do you do?",
      "The team is wary of you. How do you win them over?",
      "How do you work on site and still keep a written record?",
    ],
  },
  {
    // real Q1
    id: "fde-craft-q07",
    course: "fde-craft",
    category: "lifecycle",
    level: "core",
    chapterId: "fde-craft-04-ai-in-the-lifecycle",
    source: "asked",
    question: "How do you validate code, and how do you use AI in the development cycle?",
    idealAnswer:
      "I use AI as an assistant and never as the approver. I start with requirements and acceptance criteria in my own words, because that is what I judge the output against. Then I use the assistant to draft code, explain unfamiliar code and suggest tests, and I read the tests before the implementation. The change then passes the same gates as any human change. Formatting and linting run first, then type checks and static analysis, unit tests, a secret and dependency scan and integration tests. A CI server runs those automatic gates on every change. I put the cheap automatic checks first and a human review last. I review the diff myself, line by line where it touches money, permissions or secrets, and I test the edge cases. I watch for known patterns. These are calls to functions that do not exist, unsafe or invented packages, secrets in source, missing authorisation, and tests that mirror the implementation. I write at least one expected value by hand. I accept a change only when I can explain every line, and I own it once I merge it. The trade-off is speed. Reading everything costs time, so I spend the attention where the risk is. If a gate fails, I fix the cause and do not weaken the gate.",
    keywords: ["assistant not approver", "acceptance criteria", "linting", "static analysis", "unit and integration tests", "secret scan", "CI", "review the diff", "hallucinated APIs", "mirrored tests"],
    followUps: [
      "What do you do when a generated test always passes?",
      "How do you check a new dependency an assistant suggested?",
      "Would you let an assistant touch authentication code?",
      "How do you decide how much of a generated diff to read?",
    ],
  },
  {
    id: "fde-craft-q08",
    course: "fde-craft",
    category: "lifecycle",
    level: "senior",
    chapterId: "fde-craft-04-ai-in-the-lifecycle",
    question: "A teammate's AI-generated pull request passes CI. Do you approve it?",
    idealAnswer:
      "Not yet. Passing CI tells me the checks that exist passed. It says nothing about the checks that are missing. I read the diff first, as I would a new colleague's first pull request. I look at what the tests assert, because a test that repeats the implementation can only agree with it. I check any new import or package is real, maintained and wanted. I scan for secrets and for calls to functions that do not exist in our modules. I read every piece of code that changes state for missing authorisation. I run the edge cases that matter, such as an empty list, a negative amount, an unknown currency and a timeout. If the change touches money, I ask for a hand-worked expected value in at least one test. I approve when I can explain every changed line and the author can too. I would say in the review that the author owns the change whether or not an assistant wrote it. The trade-off is review time, which I spend by risk: boilerplate gets a skim and payment logic gets full attention. If something is wrong, I leave a specific comment and offer to pair on it.",
    keywords: ["green CI is a floor", "read the diff", "tests mirror the code", "new dependencies", "authorisation", "edge cases", "ownership", "hand-worked expected value"],
    followUps: [
      "What would make you reject the pull request outright?",
      "How do you raise this with a teammate without friction?",
      "Should the team require disclosure of AI use in pull requests?",
    ],
  },
  {
    id: "fde-craft-q19",
    course: "fde-craft",
    category: "lifecycle",
    level: "core",
    chapterId: "fde-craft-04-ai-in-the-lifecycle",
    source: "practice",
    question: "You may use any LLM tool in this exercise. How will you work?",
    idealAnswer:
      "I say the check before I write the first prompt. I state the task in a sentence, then say how I will know it works, for example the cases that must pass. The tool is the same for everyone, so what you see is my judgement. I give it context: the files, the constraints and the interfaces it may use. On code I do not know, I ask for a plan first and read it. Then I work in small steps and run the code after each one. I read every diff aloud and say what I accept and what I reject. I check anything it names, such as a function, a package or a flag, against the real code. I keep one thing for myself, which is the design of the check, with at least one expected value worked by hand. I never keep code I cannot explain. The trade-off is pace. Small steps with a run after each feel slower, but I never have to unpick a large wrong change. On a customer's code, I first check which tools they allow.",
    keywords: ["say the check first", "small steps", "run after each step", "read every diff", "verify what it names", "plan first", "design of the check", "explain every line"],
    followUps: [
      "The tool gives you a function you do not recognise. What do you do?",
      "Your generated test passes on the first run. Do you trust it?",
      "The customer bans AI tools on its code. How do you work?",
    ],
  },
  {
    id: "fde-craft-q09",
    course: "fde-craft",
    category: "storytelling",
    level: "senior",
    chapterId: "fde-craft-05-telling-project-stories",
    question: "Tell me about an AI system you built and the result it had.",
    idealAnswer:
      "I would open with a one-sentence answer that names the system, my role and the outcome. I would only name an outcome I can prove. Then I give the flow in execution order, from input to output, in about four steps. I describe the controls that were really there: schema validation, checks that the lines add up to the net amount, retries, idempotent writes and logging. I give the metrics with their source, for example an eval set, its size and the field-level result. If I did not measure something, I say so and say how I would measure it next time. I name one trade-off I chose, with its cost, and what happens when the system fails. I separate three things clearly. First comes what I built myself, which I can take you through in code. Next comes what my team built, which I credit by role. Last comes what I would design differently or at larger scale, which I describe as a plan and never as something that ran. I never claim a tool or a number I cannot back up. The trade-off in telling it this way is that the story sounds less polished. It also holds up under follow-ups, and that is what the interviewer is testing.",
    keywords: ["direct answer", "flow", "controls", "verified metrics", "trade-off", "fallback", "what I built", "what my team built", "what I would design"],
    followUps: [
      "How did you measure that result?",
      "What went wrong along the way?",
      "What would you change if you did it again?",
      "Where were you, and who else was on it?",
      "Where does the AI stop?",
    ],
  },
  {
    id: "fde-craft-q10",
    course: "fde-craft",
    category: "storytelling",
    level: "deep",
    chapterId: "fde-craft-05-telling-project-stories",
    question: "Which part of that did you build yourself?",
    idealAnswer:
      "I would name one specific component, say what was hard about it, and describe a decision I made and why. For instance, the validation step that reconciles line items with the net amount. I would explain what the rule is, what edge case broke the first version, and what I changed. I would be able to take you through the code and say what the tests assert. Then I would name what the team built, by role and without minimising it, such as ingestion, deployment and queue handling. I would say how much of it I understood and reviewed. If part of what I described was a design and never ran, I say that directly, using words like I would, rather than I did. I do not claim a number that someone else produced unless I say whose it was. The trade-off in answering this way is that my share may sound smaller than a vague we built it story. It sounds credible, and the interviewer can go as deep as they like without finding a gap. If I cannot answer in detail about a part, I do not claim it. I say what I saw of it and what I would need to read to explain it.",
    keywords: ["specific component", "decision and reason", "ownership boundary", "credit the team", "I would versus I did", "can explain the code", "no unverified claims"],
    followUps: [
      "What was the hardest bug in your part?",
      "Why did you make that choice and not the alternative?",
      "What did a teammate do that you could not have done?",
    ],
  },
  // real Q95
  {
    id: "fde-craft-q11",
    course: "fde-craft",
    category: "scoping",
    level: "deep",
    chapterId: "fde-craft-06-the-scoping-round",
    source: "practice",
    question: "A customer says they want to automate their invoices. You have thirty minutes. What do you ask, and what does each answer change?",
    idealAnswer:
      "I ask five questions, and I choose them because each answer changes the plan. First, volume: how many invoices a month and from how many suppliers. That sizes the prize. At 4,000 invoices and six minutes each, the work is 400 hours a month, and a small count would make a pipeline pointless. Second, data access: who can release fifty real invoices this week and what must be signed first. That fixes the date of my first demo. Third, who reviews the doubtful ones and how fast, which sets the size of the review queue. Fourth, what error rate would make finance trust it, because without a bar no demo can pass or fail. Fifth, who runs it after I leave, which changes the handover and the tools I pick. I skip questions about the model or a dashboard, since they change nothing in the scope. The trade-off is that five questions leave gaps. If the customer will not answer one, I state an assumption aloud, put a number on it and log it as a risk. If they cannot give any real invoices, I say the plan has no baseline yet.",
    keywords: ["volume", "data access", "who reviews", "success bar", "ownership", "assumption", "baseline", "review queue", "risk"],
    followUps: [
      "The customer cannot say what error rate they would accept. What do you do?",
      "Which of the five would you drop if you only had five minutes?",
      "How do you ask about data access without sounding like you are stalling?",
    ],
  },
  // real Q96
  {
    id: "fde-craft-q12",
    course: "fde-craft",
    category: "scoping",
    level: "senior",
    chapterId: "fde-craft-plan-and-estimate",
    source: "practice",
    question: "The customer wants this live in twelve weeks. How do you estimate the project, and what do you cut first?",
    idealAnswer:
      "I give a range per milestone, find the critical path, and name the cut before I am asked. I split the work into milestones that each end in a demo, with the pilot first. Each gets a low and a high in weeks. The low is a clean run and the high includes late data and rework. For an invoice pipeline the chain has five links. Data access is 1 to 2 weeks and extraction is 2 to 4. The review queue is 2 to 3, posting is 3 to 6, and handover is 1 to 2. The lows sum to 9 and the highs to 17, so I quote nine to seventeen weeks and say how sure I am. That does not fit twelve, so I cut scope instead of squeezing the weeks. Posting is on the critical path, has the widest range and writes to a system of record. Without it the chain is 6 to 11 weeks, and a clerk posts the approved export by hand. I keep the baseline and the review queue, because they are the safety net. The trade-off is that the customer gets less automation first. I offer posting as phase two. If the first two milestones run long, I re-quote at that point.",
    keywords: ["range", "critical path", "milestones", "demo", "confidence", "de-scope", "system of record", "safety net", "phase two"],
    followUps: [
      "Why add the lows and the highs instead of taking an average?",
      "The customer refuses to cut posting. What now?",
      "What would make you widen the band after the first milestone?",
      "How do you stop the estimate becoming a promise?",
    ],
  },
  {
    id: "fde-craft-q17",
    course: "fde-craft",
    category: "scoping",
    level: "core",
    chapterId: "fde-craft-02-scoping-and-demos",
    source: "practice",
    question: "A customer gives you a vague problem. How do you break it down?",
    idealAnswer:
      "I split the problem into workflows, decisions and actors before I plan any work. I start at the value chain. That is the ordered steps by which the business turns what it buys into what it sells. I find the step that hurts. For Harbour Supplies that is accounts payable. I list its workflows. For each one, I list the decisions and the actor who takes each, which is a person or a system. Then I label every step as a rule, a model, an agent or a person. A rule fits logic I can write down. A model fits messy input with an output of fixed shape. An agent fits work where the next step depends on what it finds. A person fits a decision where a wrong answer is costly and rare. Last, I rank the workflows by volume, the cost of a wrong answer and how ready the data is, and I pick one. The trade-off is that I spend ten minutes on structure before the customer sees a plan. Those ten minutes stop me building the wrong workflow. After that, I turn the chosen workflow into a plan.",
    keywords: ["value chain", "workflows", "decisions", "actors", "rule", "model", "agent", "person", "ranking"],
    followUps: [
      "Two workflows look equally good. How do you choose?",
      "When would you use an agent instead of a rule?",
      "How do you check your breakdown with the customer?",
    ],
  },
  // real Q97
  {
    id: "fde-craft-q13",
    course: "fde-craft",
    category: "business case",
    level: "deep",
    chapterId: "fde-craft-07-the-business-case",
    source: "practice",
    question: "How would you build the business case for an invoice-automation project, and what would make you walk away?",
    idealAnswer:
      "I build it from a measured cost baseline, then an itemised run cost, then payback with a worst case. The baseline comes first. I time a sample of the real work, say 200 invoices across both formats, and take error counts from the customer's correction log. A stated figure is only a guess. For Harbour that gives 12,040 pounds a month. Next, the run cost has five lines: tokens, infrastructure, review labour, maintenance and residual rework. Review labour is the largest at 57 percent and tokens are under 2 percent, so I do not let the model bill dominate the page. Then payback is the fee divided by the monthly saving. A build fee of 48,000 pounds over a saving of 9,067 is 5.3 months. I stress the least certain input, the review share, and show 5.8 months at 45 percent. I also test volume, because fixed costs do not shrink. Everything goes on one page, ending with the decision I need. I would walk away if volume sits far below break-even. At Harbour that is about 3,600 invoices a month. I would also walk away if nobody can measure the cost baseline.",
    keywords: ["baseline", "timed sample", "correction log", "run cost", "review labour", "payback", "worst case", "volume", "one page"],
    followUps: [
      "The finance director says the work takes six minutes an invoice. How do you respond?",
      "Which line of the run cost would you attack first, and why?",
      "The case only works at 4,000 invoices a month and the customer has 1,500. What do you propose?",
    ],
  },
  // real Q98
  {
    id: "fde-craft-q14",
    course: "fde-craft",
    category: "adoption",
    level: "deep",
    chapterId: "fde-craft-03-delivery-and-handover",
    source: "practice",
    question: "Three weeks after launch, usage of your AI tool is falling and the team says it works fine. What do you check?",
    idealAnswer:
      "I separate use from quality before touching the model. The tool can fail in two different ways, and the metrics tell them apart. I look at four weekly numbers: active users, task completion, override rate and training. If use is falling while completion and overrides are flat, it is an adoption problem. I talk to the people who stopped, and I look for a workflow friction or a training gap. If use is steady but the override rate is climbing, quality has dropped. So I read the overridden items and look for a new input format. If the override rate is falling towards zero, I do not celebrate. I audit a random sample of accepted results, because tired reviewers accept everything. Each pattern has a different owner: training, engineering, review design or the sponsor. I would put the numbers in the weekly status report and ask the sponsor for the decision that fits. The saving only exists if people use the tool, so low adoption stretches payback well past the 5.4 months in the case.",
    keywords: ["active users", "task completion", "override rate", "training", "audit sample", "rubber-stamping", "weekly status report", "payback"],
    followUps: [
      "Override rate has fallen to under 1 percent. How do you know that is good news?",
      "Half the clerks have stopped using it. What do you ask them?",
      "How would low adoption change the payback you promised?",
    ],
  },
  // real Q99
  {
    id: "fde-craft-q15",
    course: "fde-craft",
    category: "live-coding",
    level: "core",
    chapterId: "fde-craft-live-coding-round",
    source: "practice",
    question: "You get a messy CSV and 45 minutes to build something useful with an LLM. How do you spend the time?",
    idealAnswer:
      "I spend the first ten minutes reading the data, and I write no code until I have counted what is wrong. I print the row count, the blanks and the shape of each risky column. That shows me the date formats and the currency marks at once. Then I pick one narrow task, such as categorising each line, and I say it aloud. Next I clean. I parse dates with a stated assumption, parse amounts in one function and remove duplicates. Rows I cannot read go to a person, and I count them. I send only usable rows to the model, with a closed schema and a code check on every reply. I retry once with the errors attached. I read ten rows by hand before I trust any number. The last five minutes go on the counts and a short report. I name my cut lines before I need them, for example one attempt instead of two. If I fall behind, I take the cut and say so. The trade-off is that I ship less, but what I ship is checked and I can explain it.",
    keywords: ["read the data", "profile", "narrow task", "schema", "retry once", "sample check", "cut line", "counts", "assumptions"],
    followUps: [
      "It is minute 25 and the dates still do not parse. What do you do?",
      "How do you decide which rows go to a person?",
      "What would you add with another hour?",
    ],
  },
  // real Q100
  {
    id: "fde-craft-q16",
    course: "fde-craft",
    category: "live-coding",
    level: "deep",
    chapterId: "fde-craft-08-live-coding-on-messy-data",
    source: "practice",
    question: "Your extraction has run over the whole file. How do you know it is good enough, and what will a year of invoices cost?",
    idealAnswer:
      "I check it three ways. First, code. Every reply is validated against the schema, and I count failures and low-confidence answers instead of hiding them. On a practice file of 60 rows, 46 of the 48 extractions passed, 2 failed and 3 were low confidence. Second, a sample. I read ten rows by hand against the source and say what I found. Third, a second source. I reconcile against the ledger, where 38 of 48 matched. I look at the rest, because a sum check and a ledger check catch different errors. For cost, I work from calls and tokens and state my assumptions. That run made 55 calls for 48 rows, retries included. At Harbour's 48,000 invoices a year, that is about 55,000 calls. If a call is 400 tokens in and 60 out, that is 22 million tokens in and 3.3 million out. I apply the current prices from the provider's page, because I do not quote prices from memory. The trade-off is sample size. Ten rows catches a systematic fault but will miss a rare one. With more time I would add an eval set and track the error rate.",
    keywords: ["schema validation", "failure count", "low confidence", "sample check", "reconciliation", "calls and tokens", "retries", "assumptions", "eval set"],
    followUps: [
      "Ten rows looked fine, but you have 2,000. How do you size the sample?",
      "A teammate asks you to drop the retry to save money. What do you tell them?",
      "How do you present the cost to a finance director?",
    ],
  },
  {
    id: "fde-craft-q18",
    course: "fde-craft",
    category: "live-coding",
    level: "core",
    chapterId: "fde-craft-phase-two",
    source: "practice",
    question: "You are handed an existing system you have never seen. What do you do first?",
    idealAnswer:
      "I run it first and read it second. I put one real case through the system and keep the output. That output is today's behaviour, and it is my check that I broke nothing. Then I find the entry points, which are where work enters: a route, a job or a queue consumer. I trace one request from entry to exit and write the path down in five lines. That path shows me the seams. A seam is a place where I can change behaviour without editing the code around it, such as an API, a queue or a flag. I choose the smallest change at one seam. I leave refactoring alone, even if the code is ugly, and I keep the old path behind a flag so I can switch back. I say aloud what I did not touch and why. If I use an LLM tool, I ask it to map the code first. Then I open the files it names and check them myself. The trade-off is that the change looks small and a little untidy. But it is checkable, reversible and easy to explain.",
    keywords: ["run it first", "today's output", "entry points", "trace one request", "seams", "smallest change", "flag", "no refactoring", "verify the map"],
    followUps: [
      "The old path has no tests. How do you know you changed nothing else?",
      "The code you traced is badly structured. Do you fix it?",
      "The task is to add an agent to this system. What do you add first?",
    ],
  },
  {
    id: "fde-craft-q21",
    course: "fde-craft",
    category: "architecture",
    level: "deep",
    chapterId: "fde-craft-architecture",
    question: "Why would you pick a fixed pipeline over an agent for invoice intake?",
    idealAnswer:
      "I pick the fixed pipeline with one model step, because Harbour's constraints leave three options and this one fails in a way Harbour can afford. First I list what the constraints rule out. Security review takes three weeks. Data stays in Harbour's Google Cloud project. A new vendor takes about ten weeks, and the ledger changes only in the monthly release window. A packaged product fails on time. An inbox agent fails on control, because code cannot decide its route and the confidence score cannot attach to one step. A wrong amount approved is a hard stop, so I need steps I can test one at a time. The pipeline fails on upkeep, which Harbour's IT team can plan for. I record the choice in an ADR with what I give up, which is a vendor's support and a path for scans. It also names two triggers to revisit. I size it against the peak. Month-end is about 71 invoices an hour, and one reader handles 240. The trade-off is that Harbour owns the maintenance. If the work were open-ended, such as free-form enquiries, I would choose an agent.",
    keywords: ["constraints rule out options", "fixed pipeline", "one model step", "how each option fails", "hard stop", "ADR", "what is given up", "revisit triggers", "sizing against the peak"],
    followUps: [
      "The IT lead wants the packaged product. How do you respond?",
      "What would make you revisit the decision?",
      "Why is the queue there if one reader is enough?",
    ],
  },
  {
    id: "fde-craft-q22",
    course: "fde-craft",
    category: "data",
    level: "deep",
    chapterId: "fde-craft-data-structure",
    question: "Take me through the data model for an invoice intake system.",
    idealAnswer:
      "I keep nine tables, and I test them on five sample rows before any model runs. Six hold the work: supplier, supplier alias, document, invoice, invoice line and review item. Three hold the evidence: correction, audit event and posting. The invoice table stores the supplier name as printed, next to the supplier it resolved to, so nothing the model read is overwritten. Money is numeric(12,2), because a check that the lines add up needs exact pennies and a float drifts. A partial unique index stops a live duplicate. It excludes rejected and duplicate rows, so a resend is still stored and a rejected invoice may come back. Seven statuses route each invoice. The reason for review sits on the review item, from a closed list. Every change writes an audit event, and every fix a clerk makes writes a correction. The pilot metric is then one query over the corrections. The trade-off is more tables up front. I accept it, because without them nobody can prove what the system did. If the tables cannot hold a clean row, a duplicate, a review and a correction, the design is wrong.",
    keywords: ["nine tables", "printed beside resolved", "numeric not float", "partial unique index", "seven statuses", "closed list of reasons", "audit event", "correction", "pilot metric in one query", "sample rows first"],
    followUps: [
      "Why does the unique index leave out rejected and duplicate rows?",
      "How do you reproduce the reported pilot figure?",
      "Why keep the printed supplier name at all?",
    ],
  },
  {
    id: "fde-craft-q23",
    course: "fde-craft",
    category: "specification",
    level: "deep",
    chapterId: "fde-craft-technical-spec",
    question: "What goes in a technical spec for a system like this, and how do you know it's done?",
    idealAnswer:
      "A spec states what the system must do in rules a stranger can check, and it ends in acceptance criteria. Harbour's runs to three pages and nine sections. They go from the goal and scope, through the reply schema and the rules, to the acceptance criteria and the open questions. It leaves out why I chose the design, the dates and the cost, because other documents hold those. Each criterion has an identifier, a trigger and an exact outcome. AC-02 says a PDF with no text layer goes to review as scan_out_of_scope and makes no model call. AC-04 says net plus VAT must equal the total to the penny. I know it is done when all fifteen criteria pass. Anything the build depends on and nobody knows goes in the open questions. One example is whether slash dates can be read safely. The trade-off is that writing criteria takes time before there is anything to show. I review the spec with the people who will run the system. If a line cannot pass or fail, I rewrite it.",
    keywords: ["rules a stranger can check", "nine sections", "acceptance criteria", "trigger and exact outcome", "reply schema", "sum check", "ledger check", "open questions", "no design reasoning"],
    followUps: [
      "Which of these is a testable criterion: fast, or fifteen minutes from arrival to status?",
      "What does a negative line do, and why?",
      "What belongs in the open questions?",
    ],
  },
  {
    id: "fde-craft-q24",
    course: "fde-craft",
    category: "prototyping",
    level: "core",
    chapterId: "fde-craft-08-live-coding-on-messy-data",
    question: "What is a prototype for, and what can't it tell you?",
    idealAnswer:
      "A prototype is a throwaway build that answers named questions on real data before the build, and its only product is the answers. Harbour's spec had three open questions. A 60-row register export and a 45-entry ledger export answered them. Names did not match as typed, so the system normalises them. Slash dates read day first, and two rows go to review. Retries cost about 15 percent extra calls. I also say what it cannot tell me. It does not read a PDF, because the export is already text. So it says nothing about how a model reads a scan or a layout. Its model step returns a category, a supplier and a confidence, not the nine header fields. So its failure rate is an early reading and not a measurement. It also lets a total mismatch through and uses floats. The product sends that row to review and uses numeric. The trade-off is that a prototype is cheap and narrow. The pilot gives the real figure. If I cannot name the question, I do not build one.",
    keywords: ["throwaway", "named questions", "real data", "60-row export", "what it cannot show", "does not read a PDF", "early reading", "spec v0.2", "differences from the product"],
    followUps: [
      "Why not build the real thing first?",
      "How do you rank the problems in a messy file?",
      "What does the pilot confirm that the prototype could not?",
    ],
  },
  {
    id: "fde-craft-q25",
    course: "fde-craft",
    category: "evaluation",
    level: "senior",
    chapterId: "fde-craft-pilot-and-demo",
    question: "Your pilot lands between the go line and the stop line. What do you do?",
    idealAnswer:
      "I extend, because a result between the lines is neither a go nor a stop. At Harbour, run 1 scored 89 percent invoice accuracy, against a go line of 94 and a stop line of 84. I read the wrong fields before I touch the model. Of 34 wrong fields, 12 were invoice dates, because one supplier prints a tax point beside the invoice date. The fix was one labelling rule and one prompt change. I do not tune on the held-back set. I rerun and report both runs. Run 2 scored 95.5 percent, and no wrong amount was approved in either run. I also keep field accuracy apart from invoice accuracy. A field figure of 98.1 percent is only 89 percent of invoices, because one wrong field fails the invoice. The sponsor decides, not me. I put the evidence, the conditions and the limits in front of them in one record. The trade-off is time, since extending adds weeks. If a wrong amount had been approved, the stop rule would apply whatever the average said.",
    keywords: ["go extend stop", "invoice accuracy", "field accuracy", "read the wrong fields", "labelling rule", "held-back set", "hard zero on wrong amounts", "sponsor decides", "decision record"],
    followUps: [
      "Why is 98.1 percent of fields only 89 percent of invoices?",
      "What if the sponsor wants a go at 89?",
      "How do you stop the fix from overfitting?",
    ],
  },
  {
    id: "fde-craft-q26",
    course: "fde-craft",
    category: "agents",
    level: "senior",
    chapterId: "fde-craft-phase-two",
    question: "A customer wants an agent added to a system that's already running. How do you scope it?",
    idealAnswer:
      "I scope it as a change to a running system, with the agent added in two stages and its own rollback. First I run the system and leave it alone, because people rely on it every day. The agent gets a new service, its own flag and a narrow read-only API over the tables. Then I write the scope. An extractor can be wrong about a field. An agent can be wrong in the world, so the scope needs three more lines. Allowed actions are listed one by one, and anything else is refused. Transfers to a person have named triggers. The metric is the share resolved without a person, with a hard stop on any wrong action. At Harbour, stage one has three read-only tools, and replies are drafts that a person sends. Stage two adds send_reply last, because a wrong action reaches a supplier. The trade-off is that the agent arrives more slowly. A trusted first stage earns the second. If the count of wrong actions is not zero, stage two does not ship.",
    keywords: ["running system", "two stages", "read-only first", "send tool last", "allowed actions", "transfer to a person", "resolved without a person", "hard stop on wrong action", "own flag and rollback"],
    followUps: [
      "Why does the sending tool go on last?",
      "What triggers a transfer to a person?",
      "How does the agent avoid touching the running pipeline?",
    ],
  },
  {
    id: "fde-craft-q27",
    course: "fde-craft",
    category: "use-case",
    level: "senior",
    chapterId: "fde-craft-use-case-round",
    question: "You have one hour, a customer problem, an existing codebase and any AI tool you like. How do you spend the hour?",
    idealAnswer:
      "I split the hour into six blocks and say the minutes aloud. Listen takes 5 minutes, and I restate the brief in one sentence. Discover takes 10, Specify takes 10, Build takes 25, Walk takes 7 and Close takes 3. In Discover I fill a workbook while Claude maps the code, read-only. In Specify I write a one-page spec and keep three acceptance criteria. In Build I aim for one path from start to finish, not a whole feature. In Walk I run one scenario. Three rules run under every block. I say my judgement first and check it second. Claude types and I decide, so I read every diff aloud. A gap stays a gap, and nobody invents a value. The Close is never cut. I say what works, what I cut, what is open and what I would do next. The trade-off is that a thin slice looks small. If I am behind at minute 40, I cut to the thin path and say so.",
    keywords: ["six blocks", "5 10 10 25 7 3", "workbook", "one-page spec", "thin slice", "say it first", "read every diff", "a gap stays a gap", "close is never cut"],
    followUps: [
      "It is minute 40 and the slice does not run. What do you cut?",
      "Which block do you protect, and why?",
      "What do you ask before minute 0?"
    ],
  },
  {
    id: "fde-craft-q28",
    course: "fde-craft",
    category: "discovery",
    level: "core",
    chapterId: "fde-craft-discovery-workbook",
    question: "How do you decide which steps of a process get a model, an agent, plain code or a person?",
    idealAnswer:
      "I list the steps of the process first, then give each one a letter and a reason. D is rules in code. AI is a model reading or writing language. A is an agent that picks its own tools. H is a person deciding. X removes the step. AI is not the default, so every letter needs a reason written beside it. A step with fixed rules is D, because code is cheaper and testable. A step that reads free text is AI. An agent is justified only where the tools cannot be chosen in advance. Money and any change of state are D, with H beside them, so a person confirms before anything is written. The letters in order give the shape of the solution. At Calder the shape is AI reads the intent, D checks eligibility, the customer confirms and D writes. The trade-off is that the table takes minutes before any code. If I cannot give a reason for a letter, the step stays open.",
    keywords: ["five letters", "reason for each", "AI is not the default", "D rules in code", "agent only when tools cannot be fixed", "money is D with H", "state change", "shape"],
    followUps: [
      "When is an agent the right letter?",
      "Why does a refund get H beside D?",
      "What do you do when you cannot justify a letter?"
    ],
  },
  {
    id: "fde-craft-q29",
    course: "fde-craft",
    category: "specification",
    level: "core",
    chapterId: "fde-craft-one-page-spec",
    question: "What goes in a spec you have ten minutes to write?",
    idealAnswer:
      "A one-page spec states the slice as a claim in its title, then fills a fixed template. It holds the shape from the workbook, the decision in two sentences and one rejected alternative with its reason. It names the human in control, what they see and what happens when they say no. It states the evaluation, which is the cases, who labelled them and the pass bar. It lists scope in and out, and three acceptance criteria. Each criterion has a trigger and an exact outcome. It adds a walk, which is the numbered scenario I will run at minute 50. It ends with the open questions I carry. The slice is a thin path from start to finish, through the system, the human checkpoint and the output. It is never one horizontal layer. The trade-off is that three criteria leave edge cases out, and I say so. If Claude drafts it, I mark GAP where the workbook is silent and choose nothing for it.",
    keywords: ["slice as a claim", "decision", "rejected alternative", "human in control", "evaluation", "scope", "three acceptance criteria", "the walk", "open questions", "thin path"],
    followUps: [
      "Why three acceptance criteria and not ten?",
      "What is wrong with a slice that is one layer?",
      "What do you do when the workbook lacks something?"
    ],
  },
  {
    id: "fde-craft-q30",
    course: "fde-craft",
    category: "live-coding",
    level: "core",
    chapterId: "fde-craft-build-watched",
    question: "How do you use an AI coding tool so the work stays yours?",
    idealAnswer:
      "I drive and the tool types. I say my plan aloud first, then ask the tool what is missing, so it never produces the first version of a judgement. I ask for a plan before any code, in at most six steps, and I read it before I allow a step. Tests come from my own cases with my own expected values. The tool writes them and shows them failing, but it never computes an expected value. Then we go one step at a time. After each step I run the tests, read the diff aloud and decide whether to keep it. If the tool is wrong, I say where and why. A gap stays a gap. If the code does not tell us a fact, it is written as GAP with who could answer it. Nobody invents it. I end each reply by asking what was not checked. The trade-off is speed, since small steps feel slow. If I cannot explain a diff, I do not keep it.",
    keywords: ["say it first", "plan before code", "my own cases", "my expected values", "one step at a time", "read every diff aloud", "gap stays a gap", "what was not checked"],
    followUps: [
      "What do you do when the tool writes a confident wrong line?",
      "Why not let it write the tests as well?",
      "How do you show the interviewer you are in control?"
    ],
  },
  {
    id: "fde-craft-q31",
    course: "fde-craft",
    category: "use-case",
    level: "core",
    chapterId: "fde-craft-build-your-kit",
    question: "What do you bring to a live build session, and what do you ask before it starts?",
    idealAnswer:
      "I bring a small kit that I wrote from memory, so I can use it without reading it. It holds a run sheet with the six blocks and three rules, a workbook template and a one-page spec template. It also has a prompt library and a standing rules file for the tool. Five of the prompts can be skills, for the map, the gaps, the spec, the plan and the walk. Before the session starts I ask three questions. What may be sent to the model? May I use my own prompt files? Is the code supplied, or do I start it? If files are not allowed, I paste the prompts by hand and keep the templates on my own screen. I also keep my kit files out of any commit in someone else's repository. The trade-off is that a kit costs days to build. If the answers rule out files, the run sheet still works.",
    keywords: ["small kit", "from memory", "run sheet", "workbook template", "spec template", "prompt library", "standing rules", "five skills", "three questions", "what may be sent to the model"],
    followUps: [
      "Why build the kit instead of copying one?",
      "What if your own prompt files are not allowed?",
      "Which file would you rebuild first?"
    ],
  },
];

export default questions;
