import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "agents-28-system-design",
  course: "agents",
  number: 28,
  title: "A multi-agent design answer starts from who picks the next step",
  tagline: "When an interviewer asks you to design a multi-agent system, where do you start?",
  minutes: 45,
  objectives: [
    "Say the seven stages of a design answer in order, and the chapter behind each one.",
    "Ask the questions that change a design, and pick the architecture by who picks the next step.",
    "Name the state, its key and its owner, and say which code enforces each rule.",
    "Cover evals, recovery and cost with numbers from the course's own runs.",
    "Walk the seven stages for the PEP desk, and say why it comes out as one tool loop.",
    "Walk them for PayDesk, and say why it comes out as a deterministic workflow.",
    "Name the six traps interviewers set, and the sentence that closes each one.",
    "Design an expense-approval desk on paper, and score your own answer.",
    "Give the whole answer in 60 seconds, and cut depth before you cut a stage.",
  ],
  sections: [
    {
      id: "s1-order",
      title: "A design answer runs through seven stages, and the order matters more than the detail",
      goal: "What does a design answer cover, and in what order?",
      blocks: [
        {
          kind: "p",
          text: "Chapter 27 ended on a question. How do you explain a design like this when nothing is built yet? A design interview asks exactly that. You get a brief, a whiteboard and about 40 minutes, with no code to run. So where do you start?",
        },
        {
          kind: "p",
          text: "You have built both kinds of system. The PEP desk answers questions for a person who is waiting. PayDesk moves money with nobody watching. This chapter turns what you built into a method you can run on a third system.",
        },
        {
          kind: "p",
          text: "Candidates fail this question in one of two ways. They start with a pattern name and defend it for 30 minutes. Or they list every part they know and never choose. A fixed order fixes both. You decide first, then you defend, and the interviewer can follow each stage.",
        },
        {
          kind: "compare",
          caption: "The seven stages, the question each one answers and the chapters behind it",
          columns: ["Stage", "The question you answer", "Where you learned it"],
          rows: [
            ["1. Clarify", "What is the task, who are the users, and what is the worst thing that can go wrong?", "Chapters 1 and 24"],
            ["2. Pick the architecture", "Who picks the next step, code or the model?", "Chapter 10, then 11 to 19"],
            ["3. Decide state and its owner", "What is saved, when, under which key, and who may write it?", "Chapters 3, 7, 10, 18 and 19"],
            ["4. Design tools and guardrails", "What may the model touch, read and send, and where is each rule enforced?", "Chapters 2, 22 and 23"],
            ["5. Plan evals and the regression gate", "How do you know it works, and what stops a bad change shipping?", "Chapters 21 and 26"],
            ["6. Choose how it runs and recovers", "What starts a run, and what happens on a repeated event or a stuck run?", "Chapters 7, 20, 25 and 27"],
            ["7. Account for cost and latency", "How many model calls per task, how long, and how much a month?", "Chapters 5, 11, 16 and 17"],
          ],
        },
        {
          kind: "p",
          text: "Interviewers listen for this order, so say it out loud before you design anything.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Say the order in the first minute",
          text: "Start with: I'll clarify, pick the architecture by who picks the next step, then cover state, guardrails, evals, how it runs and what it costs. The interviewer now knows your plan. They can steer you, and you can't get lost.",
        },
        {
          kind: "quiz",
          id: "agents28-q1",
          question: "Why does the order put the architecture before the guardrails?",
          options: [
            "Guardrails are optional in a first answer.",
            "The guardrails depend on what the model is allowed to decide, and the architecture settles that.",
            "Interviewers always ask about architecture first.",
            "A framework chooses the guardrails for you.",
          ],
          answer: 1,
          explain:
            "In a deterministic workflow the model picks from a fixed set, so the guard checks one choice. In a tool loop the model picks any tool, so the guard must cover every tool. You can't design the guard until you know the model's seat.",
        },
        {
          kind: "p",
          text: "The first two stages decide most of the design. The next section shows how the answer to the first one often picks the second.",
        },
      ],
    },
    {
      id: "s2-clarify-pick",
      title: "Clarify the risk first, because it picks the architecture for you",
      goal: "Which questions change the design, and how do their answers pick the architecture?",
      blocks: [
        {
          kind: "p",
          text: "Ask only the questions whose answers would change the design. Four do most of the work. What starts a run, a person or an event? Can you write the steps down? Can any action not be taken back? How long may a task take? State your assumption for anything else, and move on.",
        },
        {
          kind: "p",
          text: "Then name the two axes, as chapter 10 taught. Ask who picks the next step. If you can write the steps down, build a workflow and let the model fill blanks. If the parts don't need each other's results, fan them out, as chapter 15 did.",
        },
        {
          kind: "p",
          text: "If the path is open, give one model a tool loop. Add a supervisor only when the work needs several specialities. Chapter 10 called this picking the least autonomy that does the job.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "The least autonomy that does the job",
          text: "Each gain in autonomy costs model calls, makes evals harder and adds ways to fail. If you choose a supervisor, say what a workflow couldn't do. If you can't say it, choose the workflow.",
        },
        {
          kind: "widget",
          id: "agents28-arch-picker",
          intro:
            "Answer five questions about a task and read the architecture the rules give, with its reason. Load the PEP desk and PayDesk first, and see how one changed answer moves the result. Then try a task of your own and argue with the output.",
        },
        {
          kind: "quiz",
          id: "agents28-q2",
          question: "A task has a known list of steps, but one step needs the model to read a messy email. Which design fits?",
          options: [
            "A supervisor with a worker for the email.",
            "A workflow where one node calls the model on the email and code owns every other step.",
            "A swarm, so the agents can hand off the email.",
            "A tool loop with the email as the first message.",
          ],
          answer: 1,
          explain:
            "The steps are known, so code routes. The model does one narrow job inside one node. This is chapter 12's deterministic workflow, and it's the cheapest design that works.",
        },
        {
          kind: "p",
          text: "Once the architecture is picked, you know the model's seat. The next question is where the state lives and what the model may touch.",
        },
      ],
    },
    {
      id: "s3-state-guards",
      title: "State needs one owner, and every rule that matters lives in code",
      goal: "Where does the state live, and where does each rule sit?",
      blocks: [
        {
          kind: "p",
          text: "For state, name four things. Say what is saved, such as messages, a plan or a draft. Say when it is saved, ideally after every node, as a checkpointer does. Give the key, which is the task ID. Then name the owner of each part.",
        },
        {
          kind: "p",
          text: "Chapter 10 gave four owners: the loop, the controller, the baton and the board. Pick one and say why. Two writers on one key is the bug you should say you avoided.",
        },
        {
          kind: "p",
          text: "For tools, sort each one into chapter 23's risk classes: read-only, reversible or irreversible. Then say where each rule is enforced. An allow-list covers each agent and a schema covers each tool. Redaction covers what the model sees, and an action guard covers what leaves the system.",
        },
        {
          kind: "list",
          items: [
            "The model sees only derived facts. PayDesk's model sees signals, such as the sign of a difference, and never an amount.",
            "An allow-list and a schema refuse a bad tool call before it runs. The refusal goes back to the model as an observation.",
            "An action's risk class decides its guard. An irreversible action carries an idempotency key, and waits for approval when the risk needs it.",
            "Tool output is untrusted data. Scan it for injection, and give each agent least privilege.",
          ],
        },
        {
          kind: "quiz",
          id: "agents28-q3",
          question: "An interviewer asks how you stop the agent refunding more than the order total. Which answer is strongest?",
          options: [
            "The system prompt says never to refund more than the total.",
            "A second model reviews every refund.",
            "The refund function checks the amount against the order and refuses, and the model can't call anything else that moves money.",
            "A person reads the logs each morning.",
          ],
          answer: 2,
          explain:
            "A prompt can be ignored and a reviewing model can be fooled. A limit in the function that issues the refund holds whatever the model says. A log read the next day finds the loss after it happens.",
        },
        {
          kind: "fold",
          tone: "industry",
          title: "Interviewers listen for where the rule lives",
          text: "Many candidates say the agent is told not to do the risky thing. A senior answer says which line of code refuses it, and what the system does next. Name the function, the check and the fallback, such as chapter 12's review queue.",
        },
        {
          kind: "p",
          text: "The first four stages take about 10 minutes. The last three are the ones candidates skip, so they get a section of their own.",
        },
      ],
    },
    {
      id: "s4-evals-run-cost",
      title: "Evals, recovery and cost are the stages candidates skip, so protect ten minutes for them",
      goal: "How do you cover evals, recovery and cost with numbers?",
      blocks: [
        {
          kind: "p",
          text: "For evals, say four things. Name a golden set where each case has a known good answer and a label, the expected path. Pick metrics that score the path as well as the answer. Use an LLM judge with a rubric, checked against cases a person graded. Add a regression gate with a threshold for each metric.",
        },
        {
          kind: "p",
          text: "For running and recovering, answer two questions aloud. What happens when the same event arrives twice? What happens when a run never finishes? PayDesk's answers came from three chapters. Chapter 7 defined the key, chapter 25 keyed each effect, and chapter 27 added the force-close and the sweep.",
        },
        {
          kind: "p",
          text: "For cost, count model calls and multiply. In chapter 11's clean run, one tool loop answered the version question in 3 model calls and 389 rough tokens. Chapter 17's flat team answered a harder form of that question in 10 model calls in all.",
        },
        {
          kind: "p",
          text: "The supervisor's model alone made 4 of those 10 calls and used 796 rough tokens. That is about twice the whole tool loop, before you count the workers. If a call takes 2 seconds, which is an assumption, that is 6 seconds against 20.",
        },
        {
          kind: "quiz",
          id: "agents28-q4",
          question: "You propose a supervisor with three workers. The interviewer asks what it costs. Which reply is best?",
          options: [
            "It costs a little more, but it is more flexible.",
            "About four supervisor calls plus the calls inside each worker, so around 10 per task here. At an assumed 2 seconds a call, that is about 20 seconds, so I would check it beats one agent on the evals.",
            "Cost does not matter in a first version.",
            "I would use a cheaper model and the cost would disappear.",
          ],
          answer: 1,
          explain:
            "The strong answer counts calls, states its latency assumption and ties the choice to a measurement. Chapter 17's trace counted the supervisor's 4 calls, and its last line counted all 10.",
        },
        {
          kind: "fold",
          tone: "hood",
          title: "Where the ten minutes go",
          text: "In a 40-minute interview, spend about 4 on clarifying and the pick, 6 on state and guardrails, 10 on the deep dive where the risk is, and 10 on evals, recovery and cost. Keep 5 for the interviewer's questions and 5 for a summary. Candidates who run out of time lose the last three stages.",
        },
        {
          kind: "p",
          text: "Stages in the abstract are easy to agree with. The next two sections run all seven on designs you built, starting with the PEP desk.",
        },
      ],
    },
    {
      id: "s5-pep-desk",
      title: "The PEP desk is one tool loop, because a person waits and the path is open",
      goal: "What do the seven stages give for a user-facing assistant?",
      blocks: [
        {
          kind: "p",
          text: "Here is the brief. Build an assistant that answers engineers' questions about Python's design documents, and files a ticket when asked. The user waits, so latency matters. The worst failure is a confident answer that cites the wrong PEP.",
        },
        {
          kind: "compare",
          caption: "The PEP desk design, stage by stage",
          columns: ["Stage", "The choice", "Why"],
          rows: [
            ["1. Clarify", "Users are engineers who wait a few seconds. The risk is a wrong citation. The one write is a ticket, which a person can close.", "Nothing is irreversible, so there is no approval step."],
            ["2. Architecture", "One agent holds the desk's five tools in a tool loop, with a step budget of 6.", "The path is open, but one set of tools covers it. A team must beat this baseline on the golden set, as chapter 5 said."],
            ["3. State", "One message list per thread, saved by the checkpointer under the thread id.", "A follow-up question needs the earlier turns."],
            ["4. Tools and guards", "Four tools are read-only, and open_ticket is reversible. An allow-list, a schema on each tool and tool text treated as untrusted.", "The harms are a wrong answer, an injected instruction or a duplicate ticket. Chapter 7's key stops the duplicate."],
            ["5. Evals", "A golden set with a label for each case. A code check that each cited PEP is one the desk holds. A regression gate on answer, path and budget.", "In chapter 14 a model critic waved through a PEP the desk doesn't hold, and a code check caught it."],
            ["6. Runs and recovery", "A request and a response, with no topic. The step budget ends a runaway run, and a fallback answer says what it couldn't find.", "Nothing runs unattended, so there is nothing to sweep."],
            ["7. Cost and latency", "About 3 model calls a question, as in chapter 11's clean run. At an assumed 2 seconds a call, about 6 seconds.", "Chapter 17's team made 10 calls on a harder form of the question, so it isn't worth it here."],
          ],
        },
        {
          kind: "p",
          text: "Notice what the design leaves out. There is no topic, no approval and no supervisor. Say so in the interview. Naming the parts you chose not to build, with the reason, shows the judgement the question tests.",
        },
        {
          kind: "p",
          text: "Interviewers often ask for the design in one breath, so keep a one-line version ready.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "The one-line version",
          text: "One tool-loop agent with the desk's five tools and a step budget. Every tool sits behind an allow-list and a schema, and the ticket write carries a key. A golden set checks the citations, and a question costs about three model calls. I'd add fan-out only if users asked to compare many PEPs at once.",
        },
        {
          kind: "p",
          text: "The PEP desk came out as a tool loop. Run the same seven stages on PayDesk, and watch the answer change.",
        },
      ],
    },
    {
      id: "s6-paydesk",
      title: "PayDesk is a deterministic workflow, because it moves money and its steps are known",
      goal: "What do the same stages give for a desk that moves money, and why does the answer change?",
      blocks: [
        {
          kind: "p",
          text: "Here is the brief. A travel operator sells itineraries paid in instalments. Build a desk that chases late payments, refunds overpayments and re-spreads the plan after an add-on. Nobody waits. A wrong action moves real money or mails a customer.",
        },
        {
          kind: "compare",
          caption: "The PayDesk design, stage by stage",
          columns: ["Stage", "The choice", "Why"],
          rows: [
            ["1. Clarify", "A schedule starts the runs, with no user present. Refunds and mail can't be taken back. Cases outside the rules need a person.", "The risk is money and customer trust. Latency hardly matters."],
            ["2. Architecture", "A deterministic workflow. Code routes, and the model picks one step from five.", "The five steps are known, so an autonomous agent would only add risk."],
            ["3. State", "One state per instalment ID, saved after every node. Statuses run from initialized to closed, or to handed to sales.", "A handoff passes the instalment ID and that shared state."],
            ["4. Tools and guards", "Four guardrail layers: signals only in the prompt, allowed steps checked in code, the mail check and the sales queue. Code fills the amounts.", "The model never sees an amount or a name."],
            ["5. Evals", "Task success, action accuracy, trajectory match, mail pass rate and pass^3, plus zero unsafe actions and zero prompt leaks. These seven thresholds make the release gate.", "In one run the guard blocked 37 of 55 seeded errors, and the evals caught the other 18."],
            ["6. Runs and recovery", "At 09:00 the due job puts one event on the topic for each instalment due that day. Consumers pull and commit after the work. Chapter 25's keys, a 5-minute force-close and a nightly recovery sweep.", "Delivery is at least once, and a hung run can't rescue itself."],
            ["7. Cost and latency", "One decide call per run, and one draft when it mails. 41 of 1,468 first drafts failed the mail check and got one redraft.", "Cost is a small, known number per instalment, and latency doesn't matter overnight."],
          ],
        },
        {
          kind: "p",
          text: "The same seven stages gave a tool loop for the PEP desk and a deterministic workflow for PayDesk. The difference was stage 1. A waiting user with an open path gave the first. An unattended run with irreversible actions and known steps gave the second.",
        },
        {
          kind: "quiz",
          id: "agents28-q5",
          question: "Which single fact about PayDesk most strongly pushes the design to a deterministic workflow?",
          options: [
            "It reads events from a topic.",
            "Its steps are known and its actions can't be taken back.",
            "It has a nightly job.",
            "It uses a database.",
          ],
          answer: 1,
          explain:
            "Known steps mean code can route. Irreversible actions mean you want the smallest seat for the model. A topic and a nightly job decide how it runs. They don't decide who picks the next step.",
        },
        {
          kind: "fold",
          tone: "industry",
          title: "Say what the model doesn't see",
          text: "For a money desk, state it as a fact in your design. The model sees signals, such as the sign of a difference or a count of days. Code reads the amounts and fills them into the mail after the model has written it. Interviewers remember a design that keeps the numbers away from the model.",
        },
        {
          kind: "p",
          text: "Knowing the stages isn't enough, because interviewers probe the weak points on purpose. The next section lists the traps they set.",
        },
      ],
    },
    {
      id: "s7-traps",
      title: "Six traps catch most candidates, and each has a one-sentence defence",
      goal: "Which weak points do interviewers probe, and how do you close each one?",
      blocks: [
        {
          kind: "p",
          text: "Interviewers have a short list of weak points. They test each one with a question that sounds friendly. If you know the list, you can close each point before it's asked.",
        },
        {
          kind: "compare",
          caption: "The six traps and the sentence that closes each",
          columns: ["The trap", "What the interviewer hears", "The sentence that closes it"],
          rows: [
            ["An autonomous agent where a workflow would do", "The candidate didn't ask whether the steps could be written down.", "I can write the steps down, so code routes and the model picks from a fixed set."],
            ["A supervisor where code could route", "A model call is spent on a decision the data already makes.", "The ticket has a category field, so an if statement routes it and no model call is needed."],
            ["No evals", "There is no way to know it works or to stop a regression.", "A golden set scores the answer and the path, and a regression gate fails the build below the thresholds."],
            ["Guardrails only in the prompt", "The rule holds only while the model obeys.", "The limit sits in the function that acts, so the model can't get past it."],
            ["No answer for redelivery or a stuck run", "The candidate assumed each event arrives once.", "Every effect has an idempotency key, a force-close hands a hung run to a person and a nightly sweep runs it again."],
            ["No cost numbers", "The candidate hasn't counted the calls.", "It's about 3 calls a task, so about 6 seconds at an assumed 2 seconds a call."],
          ],
        },
        {
          kind: "widget",
          id: "agents28-trap-spotter",
          intro:
            "Six shaky design sentences follow. For each, name the trap an interviewer would test. Predict before you read the reason, and watch which two traps you miss most.",
        },
        {
          kind: "fold",
          tone: "trouble",
          title: "When you hit a trap mid-answer",
          text: "If you notice you skipped a stage, say so and fix it. Say that you forgot to cover failure handling, and then cover it. Interviewers score recovery well, and a quiet gap scores badly.",
        },
        {
          kind: "quiz",
          id: "agents28-q6",
          question: "A candidate says: the topic guarantees delivery, so each event runs once. What should they have said?",
          options: [
            "Nothing, because that is correct.",
            "Delivery is at least once, so an event can repeat, and every effect needs an idempotency key.",
            "Delivery is at most once, so they need a retry.",
            "Topics aren't suitable for agents.",
          ],
          answer: 1,
          explain:
            "A consumer that crashes before it commits gets the event again. Chapter 7 defined the key, chapter 25 keyed each effect, and chapter 27 added the force-close and the sweep. So the repeat changes nothing.",
        },
        {
          kind: "p",
          text: "You've seen the stages, two worked designs and the traps. Now run all seven alone, on a brief you haven't seen.",
        },
      ],
    },
    {
      id: "s8-exercise",
      title: "Design an expense-approval desk on paper, then score yourself against the seven stages",
      goal: "Can you run all seven stages alone on a fresh brief?",
      blocks: [
        {
          kind: "p",
          text: "Here is the brief. A company with 2,000 staff wants an agent desk for expense claims. Staff upload a receipt and a claim form. The desk reads them and checks them against the policy. It approves small claims, sends large ones to a manager and books approved claims into the weekly payout.",
        },
        {
          kind: "p",
          text: "Time yourself. Spend 30 minutes with a pen and a blank page. Don't open the model answer until you have a page.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Write four clarifying questions, and mark the two that change the design most. Write your assumptions for the rest.",
            "Say who picks the next step. Name the architecture you chose and the one you rejected.",
            "Name what is saved, the key and the owner of each part.",
            "List the tools by risk class, and say where each rule is enforced.",
            "Give the golden set's source, the metrics and the thresholds in the regression gate.",
            "Say what starts a run, what happens on a repeated event and what happens to a stuck run.",
            "State your volume, count the model calls per claim and give a monthly figure.",
          ],
        },
        {
          kind: "fold",
          tone: "plain",
          title: "A model answer, to open after you have tried",
          text: "I'd ask what claim size needs a manager, how a duplicate receipt is found and who pays out. I assume 6,000 claims a month, nobody waiting on a reply, and payouts that can't be taken back. The architecture is a deterministic workflow, because the steps are known. The model does two narrow jobs. It reads the receipt into fields, and at a decision point it picks one of approve, query the employee, escalate or reject. I reject a supervisor, because a policy table routes by category and amount. State is one record per claim ID, saved after each node and owned by code. Reading the receipt and looking up the policy are read-only. Booking a payout is irreversible, so it carries an idempotency key, and above the limit it waits for a manager's approval. Code checks the amount against the receipt, and the model never sees bank details. For evals, a golden set of past claims has a known outcome for each. It's scored on the end state, action accuracy and the path, plus a check that no bank detail reached a prompt. The regression gate fails the build on any unsafe payout. Claims arrive as events on a topic. Delivery is at least once, so a repeated claim ID changes nothing. A run open more than 5 minutes is force-closed to finance, and a nightly sweep runs it again. That's two model calls per claim, so 12,000 a month on my assumed volume. At 2 seconds a call, a claim takes about 4 seconds of model time, which is fine for a batch.",
        },
        {
          kind: "widget",
          id: "agents28-answer-scorer",
          intro:
            "Say your answer aloud, then tick only what you really said. The scorer lists the stages you missed and the chapters to revise. Aim for 6 of 7 on the first try.",
        },
        {
          kind: "quiz",
          id: "agents28-q7",
          question: "In the model answer, why is booking a payout the action that needs an approval above a limit?",
          options: [
            "Because it is the slowest action.",
            "Because it is irreversible, and the risk class decides which guards apply.",
            "Because the model can't call it.",
            "Because managers prefer to approve things.",
          ],
          answer: 1,
          explain:
            "Reading a receipt and looking up a policy can be repeated or ignored. Money paid out can't be taken back, so it gets the strongest guards: a key, a code check and an approval above the limit.",
        },
        {
          kind: "p",
          text: "A page of notes isn't yet an interview answer. The last section turns it into one you can say aloud, and shows what to cut when time runs short.",
        },
      ],
    },
    {
      id: "s9-interview",
      title: "In an interview, run the seven stages and finish on a number",
      goal: "How do you say the whole answer in a minute, and what do you cut when time is short?",
      blocks: [
        {
          kind: "p",
          text: "If time is short, cut depth and keep every stage. A one-line answer for each of the seven beats five minutes on the architecture and nothing on recovery.",
        },
        {
          kind: "p",
          text: "Interviewers sometimes ask for the method itself, in a minute. Keep this version ready.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "The 60-second answer",
          text: "I clarify the task, the users and the worst failure. I choose the architecture by who picks the next step, and I take the least autonomy that works. I name the state and its owner, keyed by task ID. I put the rules in code on tools, data and actions. I plan a golden set and a regression gate. I key every effect so a repeat changes nothing, and give stuck runs a force-close and a sweep. I finish with calls per task, latency and a monthly cost.",
        },
        {
          kind: "p",
          text: "End with the comparison that proves you chose. Say that the same order gave a tool loop for a user-facing assistant and a deterministic workflow for a desk that moves money. Then name the change that would move each design one place along chapter 10's map.",
        },
        {
          kind: "p",
          text: "That closes the course. Chapter 1 started with one agent calling one tool. You finished with a desk that moves money and survives a crash. Every row of the seven-stage table points back to a chapter where you wrote the code. So each claim in your answer has a run behind it.",
        },
      ],
    },
  ],
  recap: [
    "Run seven stages in order: clarify, pick the architecture, decide state, guard the tools, plan evals, plan recovery and count the cost.",
    "Pick the architecture by who picks the next step, and take the least autonomy that does the job.",
    "Put every rule that matters in code: an allow-list, a schema, a risk class, a key and an approval.",
    "The same order gave a tool loop for the PEP desk and a deterministic workflow for PayDesk, because the risk and the known steps differ.",
    "Interviewers test six traps: too much autonomy, a needless supervisor, no evals, prompt-only guards, no recovery and no cost numbers.",
    "Count model calls, state your latency assumption and finish on a number.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In multi-agent system design I learned to run clarify, architecture by who picks the next step, state, guardrails in code, evals with a regression gate, recovery and cost, always in that order. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["agents-c28-q01", "agents-c28-q02", "agents-c28-q03", "agents-c28-q04"],
};

export default chapter;
