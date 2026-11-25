import type { Chapter } from "../types";

// This chapter has no lab. The learner writes sections 1 and 2 of docs/design.md as follow-along steps,
// and meets the ADR template. Every figure below comes from a file or a chapter that is on main.
// Course 5's prices are placeholders, so a cost figure is a worked example and says so.

const chapter: Chapter = {
  id: "architecture-01-the-method",
  course: "architecture",
  number: 1,
  title: "Design starts from requirements and numbers, then picks components",
  tagline: "AskPEP's design starts with what the third team would demand: seven requirements with numbers, four constraints and a format for every decision.",
  minutes: 60,
  objectives: [
    "Say why the third team's request forces a written design, and name the four steps of the method.",
    "Pull the course 6 starter files and see the failing tests that form the to-do list.",
    "Name the ten sections of `docs/design.md` and the chapter that writes each one.",
    "Write a requirement as a sentence that a test could fail, with one number and the command that measures it.",
    "Read AskPEP's seven requirements and say which of them a bench score can't answer.",
    "Record each target beside the figure you measured, or say you have none.",
    "Tell a constraint from a requirement, and say what breaking a constraint takes.",
    "Use a sum to find where two requirements contradict each other on the pilot's traffic.",
    "Say what each part of an ADR holds, and why doing nothing is always an option.",
    "Read AskPEP's own sections 1 and 2 and reuse their shape on your next design.",
  ],
  sections: [
    {
      id: "s1-method",
      title: "A design choice is only as good as the number it answers to",
      goal: "What must a design answer to, before anyone names a component?",
      blocks: [
        {
          kind: "p",
          text: "The design has to answer to numbers before it answers to anyone's preference. On Monday 30 November 2026 the first operations review kept the third team out. Three conditions stand in the way. T11 is open, `answer-success` is missed at 0.8715, and Model Armor hasn't run live.",
        },
        {
          kind: "p",
          text: "On Tuesday 1 December the third team's lead sends an estimate. Their people would send about 800 requests a day. The desk handles about 200 a day now, so design traffic is 1,000 a day.",
        },
        {
          kind: "p",
          text: "The product owner asks what must change to carry that. The security reviewer asks why each part is built the way it is. They want one written design, and a review on Friday 11 December. Every pilot figure and this traffic estimate are invented for this course, and the roles are fictional.",
        },
        {
          kind: "p",
          text: "This course writes that design. AskPEP answers questions about PEPs with citations, through `/ask` and a desk of agents. Guards watch it, a gate checks each change and objectives track it live. Each of those parts now has to justify itself.",
        },
        {
          kind: "p",
          text: "Take one choice, the chat model for the desk. A team that picks the newest model has made a guess. A team that knows three numbers can test each candidate against them. The numbers are the speed limit, the cost limit and the eval floor. That team can also say later when it chose wrongly.",
        },
        {
          kind: "p",
          text: "The method in this course has four steps.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Write the requirements. Each one is a sentence that a test could fail, and it carries a number.",
            "Write the constraints. Each one is something the design may not do.",
            "List the options for a component and test each against the numbers. Doing nothing is always an option.",
            "Decide, and write the decision down with the event that would show it wrong.",
          ],
        },
        {
          kind: "p",
          text: "The written record of a decision is an architecture decision record, or ADR. It is a short file, and the last section of this chapter shows its format. The chapters after this one record their decisions as ADRs. Chapter 8 tests them against their own numbers, and chapter 9 takes them to the review.",
        },
        {
          kind: "p",
          text: "The first two steps come first for a reason. Without a number, every option looks fine. A cheaper model looks fine until you ask how much quality you may lose. A faster store looks fine until you ask how fast is fast enough. A requirement turns an opinion into a test.",
        },
        {
          kind: "quiz",
          id: "architecture01-q1",
          question:
            "A team picks the newest chat model for the desk because it tops a public leaderboard. What is missing from the decision?",
          options: [
            "The requirements the model must meet, as numbers the team can measure on AskPEP.",
            "A larger eval set.",
            "A second leaderboard to compare with.",
            "Nothing. A leaderboard score is a number, so the decision already has one.",
          ],
          answer: 0,
          explain:
            "A leaderboard score measures other people's tasks. It says nothing about AskPEP's speed limit, cost limit or eval floor. Those requirements are the first move of the method. A larger eval set or a second leaderboard helps only after the requirements exist.",
        },
        {
          kind: "p",
          text: "The method needs somewhere to work. What does the repo give you, and what state is it in?",
        },
      ],
    },
    {
      id: "s2-setup",
      title: "Course 6 setup adds five starter modules, the tests and two documents",
      goal: "What does the course 6 starter add, and what state is it in?",
      blocks: [
        {
          kind: "p",
          text: "You build on your AskPEP repo once more. Work from its root, and do the setup steps in order. Course 6 adds less code than the others. Three chapters have a coding lab: chapter 2, chapter 3 and chapter 5. The lab in chapter 3 is optional. The other chapters have you write a document.",
        },
        {
          kind: "step",
          id: "architecture01-s01",
          title: "Pull the course 6 starter files",
          text: "Run `pull-course.sh` from the root of your repo, with the course name `architecture`. It copies the starter files and never overwrites a file. Commit the result before you write anything.",
          lang: "bash",
          code: `my-learn/labs/askpep/template/scripts/pull-course.sh architecture
git add -A
git commit -m "Add the course 6 starter files"`,
          expect:
            "One added line for each new file, and a count such as 14 added, 0 kept. A kept file is one you already had. Then a note with the uv add line that the next step runs.",
        },
        {
          kind: "p",
          text: "The pull did three things.",
        },
        {
          kind: "list",
          items: [
            "It adds five modules to `src/askpep/`. `routing.py` and `costmodel.py` belong to chapter 2, `stack.py` to chapter 3, and `cache.py` and `queue.py` to chapter 5. Each is a stub, and a few parts of each ship complete.",
            "It adds two documents. `docs/design.md` is the design of AskPEP, and the next section explains it. `docs/adr/0000-template.md` is the template for an ADR.",
            "It adds the course's tests in `tests/architecture/`, a file `STEPS.md` that lists every lab step, and a test plugin.",
          ],
        },
        {
          kind: "p",
          text: "The pull also printed one `uv add` line and ran nothing. The package is `google-auth`. Later chapters use it to get a Google token. Another package has already installed it, so the line only makes it a direct dependency of your repo.",
        },
        {
          kind: "step",
          id: "architecture01-s02",
          title: "Install the course 6 package",
          text: "Run the line the pull printed, from your repo root. Then run `uv sync` once, so that the environment matches the lock file.",
          lang: "bash",
          code: `uv add "google-auth>=2.62.0"
uv sync`,
          expect:
            "uv exits without an error. Your pyproject.toml gains the line google-auth>=2.62.0 under dependencies, and uv.lock may change.",
        },
        {
          kind: "step",
          id: "architecture01-s03",
          title: "See the starting point",
          text: "Run the course's tests before you write anything. Every test fails, and each failure names the lab step that fixes it, such as `architecture-02 step 1`, which is the label in the stub. Start Postgres first, as in earlier courses. If it is down, 5 tests skip instead. Nothing is broken, because the failures are the to-do list.",
          lang: "bash",
          code: `uv run pytest tests/architecture -q`,
          expect:
            "A summary line that reads 360 failed. Each failure names a step, such as architecture-02 step 1.",
        },
        {
          kind: "p",
          text: "Two of those files are documents. What does the design document hold, and who writes each part?",
        },
      ],
    },
    {
      id: "s3-design-document",
      title: "The design document has ten sections, and each chapter writes its own",
      goal: "What are the ten sections of `docs/design.md`, and which chapter writes each one?",
      blocks: [
        {
          kind: "p",
          text: "`docs/design.md` is the design of AskPEP, written as one document. It starts as a skeleton with ten numbered sections. You fill it in across this course.",
        },
        {
          kind: "p",
          text: "Every section opens with a claim that a reviewer could disagree with. The numbers that support the claim follow it, and each number says where it was measured. A section with no number is a guess.",
        },
        {
          kind: "compare",
          caption:
            "The ten sections of `docs/design.md`. Each has one chapter that writes it. Section 9 ships written, and chapter 8 adds a review line under each of its four decisions.",
          columns: ["Section", "It holds", "Written in"],
          rows: [
            ["1. Requirements", "What AskPEP must do, as numbers.", "This chapter."],
            ["2. Constraints", "What the design may not do.", "This chapter."],
            [
              "3. Components",
              "One row each for the chat models, the retrieval stack, the agent runtime and the serving shape.",
              "Chapters 2 to 5, one row each. Chapter 8 writes the opening claim.",
            ],
            [
              "4. Request flow",
              "The path of each route from caller to answer, with a latency budget and a cost for each step.",
              "Chapter 5.",
            ],
            [
              "5. State and data",
              "Which store owns each kind of state, with its retention period and region.",
              "Chapter 6.",
            ],
            [
              "6. Safety and quality in the request path",
              "Where each guard and each eval runs, and what it adds in latency and cost.",
              "Chapter 7.",
            ],
            [
              "7. Cost model",
              "Cost per request, cost per successful task and the monthly total.",
              "Chapter 8.",
            ],
            [
              "8. Failure scenarios",
              "Five failures, and what the caller, the operator and the recovery look like for each.",
              "Chapter 8.",
            ],
            [
              "9. Behaviours the code already has",
              "Four decisions that the reference code made for you.",
              "It ships written. Chapter 8 adds a review line under each decision, checked against your requirements.",
            ],
            [
              "10. Decisions",
              "The list of your ADRs, newest last.",
              "Each chapter that records an ADR adds its row.",
            ],
          ],
        },
        {
          kind: "p",
          text: "Section 9 of the design is already written. It holds four decisions about the cache, the queue and a blocked run. Read it once now. You will meet each decision in the chapters that follow.",
        },
        {
          kind: "p",
          text: "Section 10 is the index of your ADRs. Each ADR adds one row, with its number, its decision and its status. When a later chapter writes section and a number, it means this file. A chapter names its own sections by title. Chapter 9 writes no section. It reads the finished document in the review.",
        },
        {
          kind: "quiz",
          id: "architecture01-q2",
          question:
            "You want to record which store owns the tickets that the desk opens. Which section of the design holds it, and which chapter writes it?",
          options: [
            "Section 5, state and data, in chapter 6.",
            "Section 3, components, in chapter 2.",
            "Section 9, behaviours the code already has, in this chapter.",
            "Section 4, request flow, in chapter 5.",
          ],
          answer: 0,
          explain:
            "Section 5 holds which store owns each kind of state: checkpoints, memory, tickets, traces and audit rows. Chapter 6 writes it. Section 3 is about components, section 9 ships written, and section 4 is about the path of a request.",
        },
        {
          kind: "p",
          text: "Section 1 comes first, and it holds requirements. What makes a sentence a requirement?",
        },
      ],
    },
    {
      id: "s4-requirement",
      title: "A requirement is a sentence that a test could fail",
      goal: "What makes a sentence a requirement?",
      blocks: [
        {
          kind: "p",
          text: "A requirement says what AskPEP must do, in a sentence that a test could fail. If no measurement could ever contradict the sentence, it is not a requirement. It is a hope.",
        },
        {
          kind: "p",
          text: "A good requirement carries a number, such as a rate, a time, a cost or a size. It also names where the number comes from: a command, a trace or an eval run. \"AskPEP answers quickly\" can never fail. \"95% of requests finish within 10 seconds, measured by `askpep slo`\" can.",
        },
        {
          kind: "p",
          text: "A requirement holds one idea. A sentence that joins two numbers with \"and\" is two requirements. When the sentence fails, nobody knows which half to fix.",
        },
        {
          kind: "p",
          text: "A requirement also names a need and not a choice. \"The desk uses one chat model\" is a choice. The need behind it might be a cost limit or an eval floor. Write the need, and let the options compete to meet it.",
        },
        {
          kind: "widget",
          id: "architecture01-requirement-check",
          intro:
            "Five draft requirements follow. For each one, say what is wrong with it, or that nothing is. After a wrong answer you get a hint and one more try.",
        },
        {
          kind: "quiz",
          id: "architecture01-q3",
          question: "Which of these is a requirement?",
          options: [
            "The retrieval step uses hybrid search with a reranker.",
            "AskPEP is reliable and cheap to run.",
            "The attack success rate stays at or below 5%, measured by the attack slice of `askpep eval gate`.",
            "Answers are good, and 95% of requests finish quickly.",
          ],
          answer: 2,
          explain:
            "The third has one number, one idea and a command that measures it. The first names a choice. The second has no number. The fourth joins a vague quality claim to a vague speed claim.",
        },
        {
          kind: "p",
          text: "The test is simple to state. Which sentences pass it for AskPEP?",
        },
      ],
    },
    {
      id: "s5-six-requirements",
      title: "Seven requirements, each with a number from an earlier course, say what AskPEP must do",
      goal: "Which seven requirements does AskPEP have, and where did each number begin?",
      blocks: [
        {
          kind: "p",
          text: "Section 1 of the design holds the requirements. The design has seven, called R1 to R7. Each takes its number from a limit that you set in an earlier course. The last column names where the number began, so a reviewer can find it.",
        },
        {
          kind: "compare",
          caption:
            "The seven requirements of AskPEP. Every number is a target, which is a limit you chose. Cost uses the placeholder prices from course 5.",
          columns: ["Id", "Requirement", "Number", "Where the number came from"],
          rows: [
            [
              "R1",
              "At least 80% of the answer items pass the graders.",
              "0.80",
              "The answer slice of `askpep eval gate`, from the gate chapter of course 4.",
            ],
            [
              "R2",
              "The right PEPs appear in the top six results for at least 80% of the retrieval items.",
              "0.80",
              "The retrieval slice, recall at 6, from the same gate.",
            ],
            [
              "R3",
              "95% of requests finish within 10 seconds.",
              "0.95 within 10 seconds",
              "The `total-latency` objective, from the first chapter of course 5.",
            ],
            [
              "R4",
              "Spend per successful task stays at or below 2 cents.",
              "0.02 dollars",
              "The `cost-per-success` objective and `askpep cost`, from course 5.",
            ],
            [
              "R5",
              "At most 5% of the attacks in the attack set get through.",
              "0.05",
              "The attack slice of the gate, which plays the attack set from course 3.",
            ],
            [
              "R6",
              "A desk run ends within 60 seconds, whatever the model does.",
              "60 seconds",
              "The time budget of the desk, from course 2.",
            ],
            ["R7", "At least 95% of requests end in a successful answer.", "0.95", "The `answer-success` objective, from the first chapter of course 5."],
          ],
        },
        {
          kind: "p",
          text: "A floor, from course 4, is the lowest rate that passes, and a ceiling is the highest. R1 and R2 are floors. R5 is a ceiling, because a high attack rate is bad.",
        },
        {
          kind: "p",
          text: "R1 and R7 look alike and answer different questions. R1 scores 23 fixed items on the bench. R7 counts what happened to real requests. Last week R1 passed at 0.83, and R7 missed at 0.8715. The first design drafts had no R7, and the third team is blocked on exactly that number.",
        },
        {
          kind: "p",
          text: "Every number in the table is a target, a limit you chose. A target is not a measurement. A measurement is a figure from your own system, such as the share of requests that `askpep slo` found within 10 seconds. The design needs both side by side. A target with no measurement is a hope.",
        },
        {
          kind: "p",
          text: "Where you have no measurement, write not yet measured. Never fill the gap with a number you hope is true. A reviewer who finds one invented figure stops trusting the rest.",
        },
        {
          kind: "quiz",
          id: "architecture01-q4",
          question:
            "Your last live gate run scored 0.86 on the answer slice. What goes in the Number column for R1?",
          options: [
            "The target 0.80, with your measurement 0.86 beside it.",
            "0.86 alone, because it is the real figure.",
            "0.80 alone, because the measurement will change.",
            "Nothing, until the gate has passed three times.",
          ],
          answer: 0,
          explain:
            "The target is what the design promises, and the measurement is how close the system is today. A reviewer needs both. Dropping the target hides the promise. Dropping the measurement hides the evidence.",
        },
        {
          kind: "p",
          text: "A target says nothing about the system until a measurement sits beside it. Where do your measurements come from?",
        },
      ],
    },
    {
      id: "s6-write-requirements",
      title: "Section 1 records each target beside the figure you measured, or says you have none",
      goal: "Where do your own figures come from, and what do you write when you have none?",
      blocks: [
        {
          kind: "p",
          text: "Three steps give you your own figures. The first reads the `traces` table. It spends nothing, but Postgres must be running. A short table gives few requests for each objective, so treat the figures as small samples.",
        },
        {
          kind: "step",
          id: "architecture01-s04",
          title: "Read your latency and cost",
          text: "The first command prints one line for each objective. It exits 1 when an objective is missed, and that is not an error here. The second prints the cost table. Note the share on the `total-latency` line for R3, the `answer-success` line for R7 and the cost line for R4.",
          lang: "bash",
          code: `uv run askpep slo
uv run askpep cost`,
          expect:
            "Six lines from the first command, each starting with met or MISSED. Then a cost table that ends with a line such as cost per successful task: 0.0130 usd. Your figures differ.",
        },
        {
          kind: "step",
          id: "architecture01-s05",
          title: "Find your last full gate report",
          text: "R1 and R2 come from the gate you built in course 4. The gate writes each report to `evals/reports/`. List the newest five, and open the newest one that has all five slices. If you have none, you never made a live run. Do not make one now, because it spends money. Write not yet measured for R1 and R2.",
          lang: "bash",
          code: `ls -t evals/reports | head -5`,
          expect:
            "File names such as 20261021T093000Z.json, newest first. In a full report, the slices object gives a rate for retrieval, routing, answer, action and attack.",
        },
        {
          kind: "step",
          id: "architecture01-s06",
          title: "Run the offline attack gate",
          text: "R5 needs no live run. The attack slice plays its 25 attacks offline. Run it with the config you saved in course 4. The report goes to the screen, and a copy goes to `evals/reports/`. If you never saved that config, write R5's measurement as not yet measured.",
          lang: "bash",
          code: `uv run askpep eval gate --config evals/gate-attack.json`,
          expect:
            "A JSON report with one slice, attack. Its rate is the share of attacks that got through. The capstone's offline run on 21 October 2026 gave 0.0. The command exits 0 when the slice passes.",
        },
        {
          kind: "p",
          text: "Now write the section. Each row gets the target and the measurement. Where you have no measurement, the row says not yet measured.",
        },
        {
          kind: "step",
          id: "architecture01-s07",
          title: "Write section 1 of the design",
          text: "Open `docs/design.md`. Replace the whole of section 1, heading included, with the text below. Change the claim if it is untrue for you. Wherever you found a figure in the last three steps, replace not yet measured with it. Keep the target in front of it.",
          lang: "markdown",
          file: "docs/design.md",
          code: `## 1. Requirements

AskPEP must answer PEP questions correctly, quickly and cheaply, and stay safe. The seven numbers below say how far each of those goes. Each one is a target, with my measurement after it.

| Id | Requirement | Number | Measured by |
|----|-------------|--------|-------------|
| R1 | At least 80% of the answer items pass the graders. | target 0.80; measurement: not yet measured | \`askpep eval gate\`, answer slice (course 4) |
| R2 | The right PEPs appear in the top six results for at least 80% of the retrieval items. | target 0.80; measurement: not yet measured | \`askpep eval gate\`, retrieval slice, recall at 6 (course 4) |
| R3 | 95% of requests finish within 10 seconds. | target 0.95 within 10 seconds; measurement: not yet measured | \`askpep slo\`, total-latency (course 5) |
| R4 | Spend per successful task stays at or below 2 cents. | target 0.02 dollars; measurement: not yet measured | \`askpep slo\`, cost-per-success, and \`askpep cost\` (course 5). The prices are placeholders. |
| R5 | At most 5% of the attacks in the attack set get through. | target 0.05; measurement: not yet measured | \`askpep eval gate --config evals/gate-attack.json\` (course 4) |
| R6 | A desk run ends within 60 seconds, whatever the model does. | target 60 seconds; measurement: not yet measured | The time_budget stop reason of a desk run (course 2) |
| R7 | At least 95% of requests end in a successful answer. | target 0.95; measurement: not yet measured | \`askpep slo\`, answer-success (course 5) |`,
          expect:
            "Section 1 holds a short claim and a table of seven rows. Each Number cell has a target and a measurement, or the words not yet measured.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "How would you start designing an LLM system for a client?",
          text: "I would start from requirements, written as numbers, before I name any component. Examples are an eval floor, a latency limit, a cost per successful task and a ceiling on attacks. Then I would write the constraints, such as allowed providers and who runs the system. Only then would I compare options.",
        },
        {
          kind: "p",
          text: "Numbers say how well AskPEP must perform. What says what it may not do at all?",
        },
      ],
    },
    {
      id: "s7-constraints",
      title: "A constraint rules options out before any number is compared",
      goal: "What is a constraint, and how is it different from a requirement?",
      blocks: [
        {
          kind: "p",
          text: "A constraint is something the design may not do. A requirement is a number to reach, and a constraint is a line to stay inside. A requirement says how well AskPEP must perform. A constraint says what is allowed at all.",
        },
        {
          kind: "p",
          text: "Constraints come from outside the design. A contract, a law, a budget or the team that runs the service can each set one. They shrink the list of options before any number is compared. A cheaper provider that your client has not approved is not a close call. It is not an option.",
        },
        {
          kind: "p",
          text: "A constraint can change, but only through a recorded decision. So each constraint in the design says what breaking it takes. In AskPEP's design, breaking one takes an ADR.",
        },
        {
          kind: "p",
          text: "Section 2 covers four things: where data is stored, which providers may receive text, the budget and who operates the service. The budget is the one that comes from a requirement. R4 allows 2 cents for each successful task. At 1,000 successful requests a day, that is 20 dollars a day, or 600 dollars a month.",
        },
        {
          kind: "step",
          id: "architecture01-s08",
          title: "Write section 2 of the design",
          text: "Replace the whole of section 2, heading included, with the text below. These four lines are the reference design's constraints. Change any that is untrue for you, such as the providers or the operator. The traffic of 1,000 requests a day is AskPEP's design traffic, and also the default of `askpep cost-model`, which chapter 2 adds. Use your own traffic if you know it.",
          lang: "markdown",
          file: "docs/design.md",
          code: `## 2. Constraints

AskPEP may not break these four rules. Breaking one takes an ADR.

1. Providers. Question text goes only to Anthropic, Google and Voyage, and to LangSmith after redaction. Adding a provider needs an ADR.
2. Stored data. AskPEP keeps its data in one Postgres database that the operator runs. Adding a second store needs an ADR.
3. Budget. At 1,000 successful requests a day, R4 allows 20 dollars a day, which is 600 dollars a month. A design that needs more breaks R4.
4. Operator. One engineer operates AskPEP, with no on-call rota. A component that needs a team to run it needs an ADR.`,
          expect:
            "Section 2 holds a short claim and four numbered constraints. Each one says what breaking it takes.",
        },
        {
          kind: "step",
          id: "architecture01-s09",
          title: "Commit sections 1 and 2",
          text: "Commit the design before the next chapter edits it. Later chapters add rows and sections, and a commit for each one gives you a history of the design.",
          lang: "bash",
          code: `git add docs/design.md
git commit -m "Write the requirements and constraints of AskPEP"`,
          expect: "One commit that changes docs/design.md.",
        },
        {
          kind: "quiz",
          id: "architecture01-q5",
          question: "Which line is a constraint?",
          options: [
            "95% of requests finish within 10 seconds.",
            "Question text goes only to providers on the client's approved list.",
            "At least 80% of answers pass the graders.",
            "A desk run ends within 60 seconds.",
          ],
          answer: 1,
          explain:
            "The approved list rules providers out before any number is compared. The other three are numbers to reach, so they are requirements.",
        },
        {
          kind: "p",
          text: "Each requirement looks reasonable alone. What happens when two of them meet the same request?",
        },
      ],
    },
    {
      id: "s8-contradiction",
      title: "Two requirements can contradict each other, and only the numbers show where",
      goal: "Where do R3 and R6 contradict each other, and how does a sum show it?",
      blocks: [
        {
          kind: "p",
          text: "Read R3 and R6 side by side. R3 says 95% of requests finish within 10 seconds. R6 says a desk run may take up to 60 seconds. You set both limits on purpose, so neither is a mistake.",
        },
        {
          kind: "p",
          text: "They can still contradict each other. In course 5 you saw that a desk run counts as a request for the `total-latency` objective. A desk run that takes 30 seconds is a bad request for R3, and R6 allows it.",
        },
        {
          kind: "p",
          text: "How bad is it? Two shares decide. The first is the share of requests that are desk runs. The second is the share of desk runs that take longer than 10 seconds. Multiply them to get the bad share. R3 allows 5% of requests to be bad. To keep the sum simple, assume every `ask` request finishes in time.",
        },
        {
          kind: "p",
          text: "A ratio objective is met when its attainment is at or above its target, as course 5 showed. So a bad share of exactly 5% still meets R3. The widget below uses made-up shares and no real traffic.",
        },
        {
          kind: "widget",
          id: "architecture01-number-meets",
          intro:
            "Three traffic mixes follow. In each, every ask request finishes in time. Predict whether R3 is met, then read the sum. When you finish, you can try your own mix.",
        },
        {
          kind: "p",
          text: "Now use AskPEP's own numbers. On Wednesday desk runs were 136 of 200 requests, which is 68%. R3 allows 5% of requests to run long, so at most 7.35% of desk runs may. Last week `total-latency` read 0.962, so 3.8% ran long. If every one was a desk run, that is 5.6% of them. The margin is under two points.",
        },
        {
          kind: "p",
          text: "A contradiction like this one is the first thing a design review looks for. There are three ways out. You can loosen R3 for desk runs, tighten R6, or change how AskPEP serves long work. Whichever you choose is a decision, so it gets an ADR.",
        },
        {
          kind: "p",
          text: "Chapter 5 takes the third way. It puts long desk runs behind a queue, so a caller does not wait on one request. Section 4 of the design gives each route its own latency budget, and that is where the fix is written down.",
        },
        {
          kind: "quiz",
          id: "architecture01-q6",
          question:
            "Desk runs are 20% of requests, and every ask request finishes in time. What is the largest share of desk runs that may take over 10 seconds before R3 is missed?",
          options: ["5%", "20%", "25%", "50%"],
          answer: 2,
          explain:
            "R3 allows 5% of all requests to be bad. Desk runs are 20% of requests, so the bad desk runs may be 5 out of every 20 desk runs. That is 25%. At exactly 25% the bad share is 5% and R3 is just met.",
        },
        {
          kind: "p",
          text: "Whichever way out you pick is a decision that someone will question. What should its record hold?",
        },
      ],
    },
    {
      id: "s9-adr",
      title: "An ADR records one decision, the options it beat and what would prove it wrong",
      goal: "What does an ADR hold, and why does it list doing nothing?",
      blocks: [
        {
          kind: "p",
          text: "An ADR is a short file about one decision. You write it when you decide. A reviewer reads it later to learn why the design is the way it is, and what would change your mind.",
        },
        {
          kind: "p",
          text: "AskPEP's template is `docs/adr/0000-template.md`. For each decision you copy it to a new file named `NNNN-short-name.md`, where NNNN is the next number after your last ADR. Chapter 2 writes the first ADR, so it is 0001. Then you add a row to section 10 of the design. The template has two header lines and five parts.",
        },
        {
          kind: "list",
          items: [
            "Status and date. The status is proposed, accepted, or superseded by a later ADR. The date is the day you decided.",
            "Context. It says what forced the decision. It names the requirement the decision serves and the numbers that matter, each with its source.",
            "Options. Each option is a short paragraph with its cost, its latency, its main risk and what it would take to leave it later. Doing nothing is always an option.",
            "Decision. One sentence that starts with We will, then the one or two reasons that decided it.",
            "Consequences. What gets easier and what gets harder. It also names the number or the event that would show the decision was wrong, and what you would do then.",
            "Evidence. The commands, traces, eval runs and commits behind the numbers, so a reviewer can run them again.",
          ],
        },
        {
          kind: "p",
          text: "Two parts do most of the work. Doing nothing sets the baseline. If it meets every requirement, the cheapest decision is to change nothing. The event that would show you wrong gives a reviewer something to watch. A decision with no stated way to be wrong cannot be reviewed.",
        },
        {
          kind: "p",
          text: "The example below records a decision that course 5 already made. It is written here for practice, so its number is left as NNNN and you do not create it. Its prices are the placeholders from course 5, so every cost in it is a worked example.",
        },
        {
          kind: "code",
          lang: "markdown",
          code: `# NNNN. We will measure cost per successful task, not cost per request

- Status: accepted
- Date: 22 October 2026

## Context

Requirement R4 limits spend per successful task to 2 cents. In the worked example from course 5, a request costs 0.5 cents and 96% of requests succeed. A change cuts the spend to 0.4 cents per request, and the success rate falls to 80%. Both figures are illustrative.

## Options

Cost per request. It is the simplest figure and needs no success count. Its risk is that it rewards a change that fails more often. In the example it shows a 20% saving.

Cost per token. It is what the provider bills. It says nothing about whether the tokens produced an answer.

Cost per successful task. It divides all the spend, failed requests included, by the number of successes. It needs the stop reason of every request, which AskPEP's traces record. In the example it shows a 4% saving.

Do nothing. Keep reading the bill. R4 then has no figure that a test could fail.

## Decision

We will measure cost per successful task, with failed requests counted in the spend. It shows the saving in the example as 4%, and not 20%, because the extra failures eat most of it.

## Consequences

One figure now covers price and failure. It can still look healthy while quality falls: 0.52 cents became 0.50 cents while the success rate fell 16 points. So we read it beside the answer-success objective, and never alone. The decision is wrong if a change takes answer-success below 0.95 while cost-per-success stays under 2 cents and no alert fires. Then we would add an alert on answer-success.

## Evidence

\`uv run askpep cost\`, the last line. \`uv run askpep slo\`, the answer-success and cost-per-success lines. The worked example from course 5.`,
          caption:
            "An example ADR, shortened. A real ADR gives each option its cost, its latency, its main risk and its exit. The sums: 0.5 divided by 0.96 is 0.52 cents, and 0.4 divided by 0.80 is 0.50 cents.",
        },
        {
          kind: "p",
          text: "Read the Decision again. Two figures sit behind it. The per-request figure fell by 20%. The per-task figure fell by 4%. The second one is nearer the truth, because the change bought its saving with failures. That is why the ADR picks it, and why its Consequences still say to read it beside the success objective.",
        },
        {
          kind: "widget",
          id: "architecture01-adr-sorter",
          intro:
            "Six lines from a different ADR follow. Each belongs to one part of the template. Sort each line into its part. After a wrong answer you get a hint and one more try.",
        },
        {
          kind: "step",
          id: "architecture01-s10",
          title: "Read the template in your repo",
          text: "Print the template and read it once. It holds an instruction line under each heading. You delete those lines when you copy the file for a real decision.",
          lang: "bash",
          code: `cat docs/adr/0000-template.md`,
          expect:
            "The title NNNN. The decision, written as a sentence. A Status line and a Date line. Then the headings Context, Options, Decision, Consequences and Evidence, each with instructions beneath it.",
        },
        {
          kind: "quiz",
          id: "architecture01-q7",
          question: "Why does every ADR list doing nothing as an option?",
          options: [
            "It sets the baseline. If doing nothing meets every requirement, the cheapest decision is no change.",
            "It makes the document longer, so it looks thorough.",
            "It lets the author avoid choosing between the real options.",
            "A reviewer cannot approve an ADR that has fewer than four options.",
          ],
          answer: 0,
          explain:
            "Doing nothing has a cost and a risk like any other option. Writing them down shows what the change must beat. Sometimes the honest finding is that no change is needed.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "What goes in an architecture decision record?",
          text: "It records one decision and why it won. The context gives the requirement and the numbers behind it. The options include doing nothing, each with its cost and its risk. The decision is one sentence. The consequences say what gets harder, and which event would show the decision was wrong. The evidence lets a reviewer run the numbers again.",
        },
        {
          kind: "p",
          text: "The format is ready for its first real use. What do sections 1 and 2 of AskPEP's own design actually say?",
        },
      ],
    },
    {
      id: "s10-design-draft",
      title: "AskPEP's first draft shows five requirements met, one missed and one unmeasured",
      goal: "What do sections 1 and 2 of AskPEP's design say on 1 December?",
      blocks: [
        {
          kind: "p",
          text: "The draft shows that speed, cost and attacks are not what blocks the third team. On Tuesday afternoon you fill in the two sections from last week's readings. The method is simple. Put each target beside its measurement, and write down what the measurement rests on.",
        },
        {
          kind: "p",
          text: "The product owner reads the first version and asks you to drop the interval on R1, because 0.83 passes. The security reviewer asks you to keep it. The interval stays, and R4 gains the words one day, placeholder prices. The third team's lead asks what the 1,000 means, so the traffic line now says who estimated it.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# AskPEP design. Draft for the review on 11 December 2026
Date: 1 December 2026   Author: engineering
Readers: product owner, security reviewer, third team's lead
Scope: all figures come from the pilot, week of 24 to 27 November

## Design traffic
Second team, measured   about 200 requests a day
Third team, estimated   about 800 requests a day (their lead's figure)
Design traffic          1,000 requests a day

## 1. Requirements
Five of seven are met on pilot traffic. R7 is missed. R6 has no measurement.

Id  Requirement                                 Target   Measured       State
R1  Answer items that pass the graders          0.80     0.83 (19/23)   met, interval 0.65 to 0.96
R2  Right PEPs in the top six                   0.80     0.89 (25/28)   met
R3  Requests within 10 seconds                  0.95     0.962          met
R4  Spend per successful task, usd              0.02     0.0110         met, one day, placeholder prices
R5  Attacks that get through                    0.05     0.00 (0/25)    met
R6  Desk run ends within, seconds               60       not measured   one traced run took 38.4
R7  Requests that end in a successful answer    0.95     0.8715         MISSED

## 2. Constraints
Breaking one takes an ADR.

C1 Providers  Question text goes only to Anthropic, Google and Voyage,
              and to LangSmith after redaction.
C2 Stores     One Postgres database, run by the operator.
C3 Budget     At 1,000 successful requests a day, R4 allows 20 usd a day, 600 usd a month.
              Measured rate at that traffic: 11 usd a day, 330 usd a month, placeholder prices.
C4 Operator   One engineer, with no on-call rota.

## Conditions the design does not lift
T11, raw text in the query column, checkpoints and ticket bodies. Due 14 December 2026.
Model Armor run live, and CLASSIFIER-NOTE.md finished.
R7 at or above target for two working weeks.`,
          caption: "AskPEP's draft of sections 1 and 2 on 1 December, whole. The figures belong to the story.",
        },
        {
          kind: "p",
          text: "Read the State column from the bottom. The missed line is the one the third team waits on, and it is a live number. The bench score above it passes, with an interval so wide that the floor sits inside it. The last section is there so nobody reads a finished design as permission.",
        },
        {
          kind: "p",
          text: "The same shape works for any system you design. Keep the field names and the order. Fill it before you compare a single component.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# <system> design. Draft for the review on <date>
Date:          Author:
Readers:
Scope:         (where the figures come from, and for which window)

## Design traffic
Measured
Estimated      (name who estimated it)
Design traffic

## 1. Requirements
(one sentence: how many are met, and which is not)

Id  Requirement   Target   Measured   State

## 2. Constraints
Breaking one takes an ADR.

C1 Providers
C2 Stores
C3 Budget      (limit, then the measured rate at design traffic)
C4 Operator

## Conditions the design does not lift`,
          caption: "For your next design, the same two sections with blank values.",
        },
        {
          kind: "p",
          text: "The requirements are written, and the first component choice is the model behind each desk role. Which model should each role use at 1,000 requests a day? Chapter 2 starts there.",
        },
      ],
    },
  ],
  recap: [
    "A design answers to numbers. AskPEP's has four steps: requirements, constraints, options tested against the numbers, and a recorded decision.",
    "The third team would add about 800 requests a day, so design traffic is 1,000. The figures are invented for the course.",
    "A requirement is a sentence that a test could fail, with one number and a named source. AskPEP has seven, R1 to R7.",
    "R1 is a bench score and R7 is live traffic. R1 passed at 0.83 while R7 missed at 0.8715.",
    "A constraint is something the design may not do. Breaking one takes a recorded decision.",
    "R3 and R6 can contradict each other. With desk runs at 68%, at most 7.35% of them may run long.",
    "`docs/design.md` has ten sections. This chapter writes sections 1 and 2, and section 9 ships written.",
    "An ADR has a status and date, a context, options, a decision, consequences and evidence. The options include doing nothing.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In the method I learned that a design choice answers to a number. A requirement is a sentence a test could fail. An ADR names the event that would show the choice wrong. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["architecture-q05", "architecture-q06"],
};

export default chapter;
