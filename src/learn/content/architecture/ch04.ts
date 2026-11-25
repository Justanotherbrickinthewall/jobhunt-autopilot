import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "architecture-04-orchestration",
  course: "architecture",
  number: 4,
  title: "Choose the agent runtime by who will operate it",
  tagline: "AskPEP keeps LangGraph on Cloud Run. The evidence that matters is who gets woken, and what nobody has measured.",
  minutes: 50,
  objectives: [
    "Name the six duties the desk asks of a runtime, and tell a framework from a host.",
    "List the jobs you already operate on Cloud Run.",
    "Say how three runtimes differ, and which facts about them are unchecked.",
    "Decide, job by job, who operates it under a managed runtime.",
    "Choose which figures an ADR cites, which need a caveat and which to leave out.",
    "Fill the agent runtime row and write the runtime ADR.",
    "Read AskPEP's own runtime ADR and reuse its shape on your next hosting decision.",
  ],
  sections: [
    {
      id: "s1-duties",
      title: "The desk asks six duties of any runtime, and you've built each one",
      goal: "What must any runtime do for the desk?",
      blocks: [
        {
          kind: "p",
          text: "Nobody else should run it yet, and the reason comes down to duties. On Friday 4 December the product owner asks the question directly. One engineer operates the desk, and the third team would make it five times busier.",
        },
        {
          kind: "p",
          text: "A managed runtime might take that weight. This chapter fills the agent runtime row and writes one ADR. It has no lab and no code to run.",
        },
        {
          kind: "p",
          text: "Two words need fixing before any comparison. A **framework** is the library the desk is written in. LangGraph is your framework, and ADK, Google's Agent Development Kit from course 2, is another. A **host** is the service that runs your code and answers requests. Cloud Run is your host.",
        },
        {
          kind: "p",
          text: "This chapter calls a framework on a host a **runtime**. Agent Runtime, always written with capitals, is a product. It is Google's managed host for agents.",
        },
        {
          kind: "p",
          text: "To **operate** a duty is to patch it, watch it and be woken when it breaks. Section 2 of `docs/design.md` says who operates the service. A runtime choice shifts duties between you and Google, so it changes that line.",
        },
        {
          kind: "p",
          text: "The PEP desk is the triage router, the three agents and the `refuse` node from the agents course. It asks six duties of whatever runs it.",
        },
        {
          kind: "compare",
          caption: "The six duties of the desk. The last column names the course each fact comes from.",
          columns: ["Duty", "What the desk needs", "Built in"],
          rows: [
            ["State", "A thread keeps its history between calls and survives a restart. `PostgresSaver` stores it, keyed by `thread_id`.", "Course 2"],
            ["Limits", "A run stops at 12 steps, 20,000 tokens, 60 seconds or 3 repeats of one tool call.", "Course 2, `Budget(12, 20000, 60, 3)`"],
            ["Side effects", "`open_ticket` writes one ticket, even when a call is retried.", "Course 2, an idempotency key"],
            ["Serving", "`POST /agent` streams eight events and checks an `X-API-Key` header. `GET /agent/{thread_id}` reads the checkpoint.", "Course 2"],
            ["Reach", "The service reaches Cloud SQL through a socket, reads secrets from Secret Manager and calls Gemini on Vertex. Chapter 2 added Claude as the fallback.", "Courses 1 and 2, and chapter 2 here"],
            ["Scale", "No instances when idle, and at most three when busy.", "Course 1, `--min-instances=0 --max-instances=3`"],
          ],
        },
        {
          kind: "p",
          text: "Look at what each duty needs from a host. State needs a database. Limits and side effects need nothing, because they are rules in your code. Serving needs an HTTP endpoint. Reach needs a network path and credentials. Scale needs a platform that adds and removes copies.",
        },
        {
          kind: "quiz",
          id: "architecture04-q1",
          question: "Cloud Run, Agent Runtime, LangGraph and ADK. Which two are hosts?",
          options: [
            "Cloud Run and Agent Runtime.",
            "LangGraph and ADK.",
            "Cloud Run and ADK.",
            "Agent Runtime and LangGraph.",
          ],
          answer: 0,
          explain:
            "A host runs your code and answers requests. Cloud Run and Agent Runtime do that. LangGraph and ADK are frameworks, the libraries the desk is written in. You can change one half of a runtime and keep the other.",
        },
        {
          kind: "p",
          text: "Six duties, and a host must carry some of them. Who carries them today?",
        },
      ],
    },
    {
      id: "s2-today",
      title: "On Cloud Run today you operate everything above the container",
      goal: "Which jobs do you operate on Cloud Run today?",
      blocks: [
        {
          kind: "p",
          text: "Cloud Run starts and stops your container and shares traffic between instances. Cloud SQL runs the database server. Google operates both. Everything on top of them is yours. Six jobs sit there today.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "The image and the deploy. You build the image and run `gcloud run deploy` (course 1).",
            "The schema. A Cloud Run job runs the migrations, and `setup()` creates the LangGraph tables when you deploy (courses 1 and 2).",
            "The connection pools. `make_checkpointer` builds one, and `close_langgraph` closes it when the app stops (course 2).",
            "The rules. `BudgetMiddleware` enforces the four limits before every model call (course 2).",
            "The serving contract. `POST /agent`, its API key and its eight events are your code (course 2).",
            "The secrets. You keep four in Secret Manager and decide when to change them (course 1).",
          ],
        },
        {
          kind: "p",
          text: "Each job is code or configuration that you wrote, tested and can read. That is the benefit of operating the runtime yourself. When a thread returns a 404, you can open the checkpoint tables and look.",
        },
        {
          kind: "p",
          text: "The cost is attention. Nobody has measured how many hours these six jobs take. So an ADR cannot claim a saving in hours. The evidence section shows how to say that honestly.",
        },
        {
          kind: "callout",
          tone: "insight",
          title: "Operating is the cost that no bill shows",
          text: "A managed runtime may cost more or less per request. Neither figure counts the hour you spend at night on a failed deploy. When two runtimes look close on price, ask who gets paged.",
        },
        {
          kind: "quiz",
          id: "architecture04-q2",
          question: "A database restore from an old backup rolls the checkpoint tables back. A user's thread has lost its last three turns. On Cloud Run today, who fixes it?",
          options: [
            "Google, because Cloud SQL is a managed service.",
            "You, because the checkpoint tables are in your database and the saver is your code.",
            "Nobody, because checkpoints are temporary.",
            "Cloud Run, which restores the container.",
          ],
          answer: 1,
          explain:
            "Google keeps the database server running. The tables, the schema from `setup()` and the saver are yours (course 2). A managed runtime could change this answer. The section on operating a managed runtime asks who would own it then.",
        },
        {
          kind: "p",
          text: "That is a real list of work. What would Google's managed products take off it?",
        },
      ],
    },
    {
      id: "s3-products",
      title: "Agent Runtime hosts agents for you, and ADK is one way to write them",
      goal: "What are Agent Runtime and ADK, and which facts about them are unchecked?",
      blocks: [
        {
          kind: "p",
          text: "Google renamed its agent products on 22 April 2026. Vertex AI became the Gemini Enterprise Agent Platform. Agent Engine became **Agent Runtime**. Memory Bank, the managed long-term memory, became Agent Platform Memory Bank. Python code still imports `vertexai`. The comparison below was read on 22 October 2026.",
        },
        // CHECK: every Agent Runtime and ADK claim in this section was read on 22 October 2026 from https://docs.cloud.google.com/agent-builder/agent-engine/overview and the Agent Runtime LangGraph guide at https://docs.cloud.google.com/gemini-enterprise-agent-platform/scale/runtime/use-a-langgraph-agent. FACTS.md holds only the renames. Pricing, billing units, regions, GA status and the ADK deploy command were not on those pages. Confirm each against current docs.
        // CHECK: the docs list ADK, A2A, LangChain, LangGraph, AG2, LlamaIndex Query Pipeline and custom agents as supported frameworks, and list Sessions and Memory Bank as managed features. Read on 22 October 2026 at the Agent Runtime overview page. The page carries no GA or preview label.
        {
          kind: "p",
          text: "Agent Runtime is a managed host for agents. You give it an agent, and Google runs it, scales it and exposes it through an endpoint. Its docs list ADK, LangGraph, LangChain and other frameworks as supported. It also offers managed sessions, which store the history of one conversation, and Memory Bank.",
        },
        // CHECK: the LanggraphAgent class is named on the Agent Runtime LangGraph guide, read on 22 October 2026. The page does not say whether a custom checkpointer such as PostgresSaver is accepted. Confirm that, and confirm which sessions and checkpoint store a LangGraph agent uses.
        {
          kind: "p",
          text: "A **session** does the job your `PostgresSaver` does, and Agent Runtime can hold it for you. ADK, the framework from course 2, can keep its sessions there. LangGraph agents run on Agent Runtime too, through a class named `LanggraphAgent`.",
        },
        // CHECK: agents-09 says ADK deploys to Cloud Run, GKE and Agent Runtime. The ADK docs at adk.dev describe a standard deploy through the Cloud Console and the ADK command line, and a separate Agents CLI deploy with CI/CD. The command name, its flags and any staging-bucket requirement were not read.
        {
          kind: "p",
          text: "ADK can also deploy to Cloud Run or to GKE, Google's managed Kubernetes, as course 2 said. So the framework and the host are two separate choices. That gives three runtimes to compare. You run the first today. The other two are new.",
        },
        // CHECK: billing in vCPU-hours and GiB-hours, a monthly free allowance, and any per-unit rate come from a search summary of Google's release notes, not from a pricing page. Agent Engine was reported GA on 4 March 2025, and a November 2025 notice listed europe-west3 among regions where runtime charges began. None of that was confirmed for Agent Runtime on 22 October 2026. The set-up page lists no regions.
        {
          kind: "p",
          text: "Two facts are missing, and the ADR must say so. The first is the bill. A release-note summary says Agent Runtime charges for compute in vCPU-hours and GiB-hours. No pricing page confirmed it, and this chapter quotes no rate. The second is the region. Check that Agent Runtime is offered in `europe-west3`, where course 1 put Cloud Run.",
        },
        {
          kind: "p",
          text: "The table needs one more term. Your callers send `X-API-Key` and read eight events. The platform's endpoint knows nothing of either. So a **front service** has to translate. It is a small service of yours that sits before the endpoint and keeps your contract. It runs on Cloud Run.",
        },
        {
          kind: "compare",
          caption: "Three runtimes for the desk, read on 22 October 2026. Every cell about Agent Runtime or ADK is unchecked against current docs. These are trade-offs for AskPEP and not a ranking.",
          columns: ["Question", "A. LangGraph on Cloud Run", "B. LangGraph on Agent Runtime", "C. ADK on Agent Runtime"],
          rows: [
            [
              "State",
              "Your Postgres and `PostgresSaver`. You run `setup()` and the pools (course 2).",
              "The `LanggraphAgent` class. Whether it accepts your `PostgresSaver` is unchecked.",
              "ADK sessions, which Agent Runtime can hold for you. Your reducers and checkpointer go.",
            ],
            [
              "Control",
              "Your graph, your `Command` handoffs and `BudgetMiddleware` (course 2).",
              "The same graph. Your code should not change.",
              "ADK agents and workflow agents. You rewrite handoffs and budgets.",
            ],
            [
              "Serving",
              "Your `POST /agent`, with its API key and eight events (course 2).",
              "The platform's own endpoint. A front service of yours keeps your contract.",
              "The same platform endpoint, and the same front service.",
            ],
            [
              "Who operates it",
              "You operate the image, schema, pools and routes. Google operates Cloud Run and Cloud SQL.",
              "Google operates the host and the scaling. You operate the agent code, Postgres and the front service.",
              "Google also operates the sessions. You operate the agent code, Postgres for tickets and PEPs, and the front service.",
            ],
            [
              "Bill",
              "Cloud Run and Cloud SQL, as in course 1. No new line.",
              "Agent Runtime compute, billed in vCPU-hours and GiB-hours, plus Cloud Run for the front service. The rate is unchecked.",
              "As B. Whether sessions bill apart is unchecked.",
            ],
            [
              "Leaving it",
              "Cheap. A container runs on any host that runs containers.",
              "Medium. The graph stays LangGraph, and only the host changes.",
              "Costly. You rewrite state, handoffs and budgets (course 2). The event contract and the golden set survive.",
            ],
          ],
        },
        {
          kind: "p",
          text: "Option A is doing nothing, and the ADR template asks you to weigh it. Option B changes the host and keeps the graph. Option C changes both halves. The three options differ most in the row that says who operates it.",
        },
        {
          kind: "quiz",
          id: "architecture04-q3",
          question: "The docs list LangGraph among the frameworks Agent Runtime supports. What does that change about the choice between options A and C?",
          options: [
            "Nothing. Agent Runtime needs ADK.",
            "It makes the framework and the host two separate decisions.",
            "It removes the need for a database.",
            "It makes the golden set unnecessary.",
          ],
          answer: 1,
          explain:
            "If LangGraph runs on Agent Runtime, option B exists. You can judge the host on its own, and judge a rewrite to ADK on its own. The claim comes from Google's docs, and this chapter marks it unchecked until you confirm it.",
        },
        {
          kind: "p",
          text: "The table compares products. What does the choice change, duty by duty?",
        },
      ],
    },
    {
      id: "s4-operate",
      title: "A managed runtime takes machines and the stored thread, and leaves the rules with you",
      goal: "Who operates each job under a managed runtime?",
      blocks: [
        {
          kind: "p",
          text: "Go back to the six duties. For each one, ask who would operate it if the desk ran as ADK on Agent Runtime.",
        },
        {
          kind: "widget",
          id: "architecture04-duty-owner",
          intro: "Each card is one job from the desk's six duties, or the fallback from chapter 2. Pick who operates it if the desk runs as ADK on Agent Runtime. Then check. The session answer is unchecked against current docs.",
        },
        {
          kind: "p",
          text: "Google takes the machines and the stored thread. You keep every rule: the limits, the idempotency key, the fallback and the contract. A managed runtime shrinks one half of your pager and leaves the other half as it was.",
        },
        {
          kind: "p",
          text: "The front service from the products section brings one Cloud Run service back, with an image, a deploy and secrets. So option C does not take Cloud Run off your pager. It takes away the checkpoint tables and the scaling of the desk itself. The ADR decides whether that is worth a rewrite.",
        },
        // CHECK: the Agent Runtime set-up page, read on 22 October 2026, describes a Private Service Connect interface to connect an agent to a VPC. It does not name the IAM roles, a staging bucket or the regions. Confirm each against the current docs before any rewrite. The cloud course only compares Agent Runtime with Cloud Run and GKE Autopilot.
        {
          kind: "p",
          text: "Reach needs one more look. The desk's tools read Cloud SQL, and Agent Runtime would have to reach it. The docs describe a Private Service Connect interface for connecting an agent to your network. The IAM roles, the staging bucket and the regions are not set out there.",
        },
        {
          kind: "p",
          text: "Settle those against the docs if the ADR picks option C. The cloud course, which is course 7, compares Agent Runtime with Cloud Run but does not set it up.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "What does a managed agent platform take off your pager?",
          text: "A strong answer says machines and stored state. The platform scales the host and can keep session history. It does not take your rules: the step limits, the idempotency key, the model fallback and the API contract. Those are code, so they stay yours. A front service often brings one deploy back.",
        },
        {
          kind: "quiz",
          id: "architecture04-q4",
          question: "You choose option C and callers must keep sending `X-API-Key`. Which service do you still deploy and watch?",
          options: [
            "None, because Agent Runtime serves your routes.",
            "A front service on Cloud Run that keeps the API key and the eight events.",
            "A Postgres checkpointer on Cloud SQL.",
            "A second copy of the golden set.",
          ],
          answer: 1,
          explain:
            "The platform's endpoint knows nothing of your key or your event contract. Something of yours must translate, and it runs on Cloud Run. So the pager keeps one Cloud Run service, though the checkpoint tables go.",
        },
        {
          kind: "p",
          text: "That is the argument in words. Which figures can the record actually cite?",
        },
      ],
    },
    {
      id: "s5-evidence",
      title: "An ADR for the runtime can cite only the figures your chapters set or measured",
      goal: "Which figures may the ADR cite, and which need a caveat?",
      blocks: [
        {
          kind: "p",
          text: "The ADR template asks for numbers and for where each came from. For this decision the numbers in hand are few. Nobody has run the desk on Agent Runtime, so no latency, cost or accuracy figure compares the options. What you hold are targets and baselines that every option must meet.",
        },
        {
          kind: "p",
          text: "Seven figures follow. Sort each into one of three piles. Cite it, cite it with its caveat, or leave it out. A **caveat** is the one sentence a reviewer needs to read the figure fairly.",
        },
        {
          kind: "widget",
          id: "architecture04-evidence-sorter",
          intro: "Each card is one figure that someone could put in the ADR. Choose what the ADR does with it, then check. Every cost figure in this course is a worked example, because course 5's prices are placeholders.",
        },
        {
          kind: "p",
          text: "The honest result is a short table of targets and baselines, plus a list of what nobody measured. The ADR names the missing measurement and says how to get it. Run the golden set live on the new runtime, then read the objectives from course 5 on that run.",
        },
        {
          kind: "quiz",
          id: "architecture04-q5",
          question: "A draft ADR says Agent Runtime would save about ten hours of operating work a month. What should a reviewer ask?",
          options: [
            "Which trace or log measured the ten hours.",
            "Whether ten is a round enough number.",
            "Whether Cloud Run can do the same.",
            "Nothing. Operating work is always a saving.",
          ],
          answer: 0,
          explain:
            "A figure needs a source: a command, a trace or an earlier chapter. Ten hours has none, so it is a guess. The ADR can say the saving is unmeasured and plan to log operating hours for a month.",
        },
        {
          kind: "p",
          text: "Few figures survive that sort. What does an honest record look like with so few?",
        },
      ],
    },
    {
      id: "s6-write",
      title: "Write the runtime row and the ADR so that a reviewer can disagree with them",
      goal: "What goes in the runtime row and the ADR?",
      blocks: [
        {
          kind: "p",
          text: "You now write two things in your own workspace. The first is one row of `docs/design.md`. The second is one ADR file. Our reading of the evidence is to keep LangGraph on Cloud Run. If your reading differs, write it down and defend it with the same figures.",
        },
        {
          kind: "step",
          id: "architecture04-s01",
          title: "Fill the agent runtime row in section 3",
          text: "Open `docs/design.md`. In the components table of section 3, fill the Agent runtime row. Name the choice, the ADR file and the options you rejected. Leave the other rows alone, because other chapters write them. This chapter numbers the ADR 0003, since chapters 2 and 3 wrote 0001 and 0002. Use the next free number if yours differs.",
          lang: "markdown",
          file: "docs/design.md",
          code: "| Agent runtime | LangGraph on Cloud Run | `adr/0003-agent-runtime.md` | LangGraph on Agent Runtime, ADK on Agent Runtime |",
        },
        {
          kind: "step",
          id: "architecture04-s02",
          title: "Write the ADR from the template",
          text: "Copy `docs/adr/0000-template.md` to `docs/adr/0003-agent-runtime.md`. Fill each section from the figures you sorted. Put doing nothing first among the options. Start the decision with 'We will'. Name what would prove you wrong. Delete every instruction line.",
          lang: "markdown",
          file: "docs/adr/0003-agent-runtime.md",
          code: `# 0003. We will ... as the agent runtime

- Status: proposed
- Date: the day you decided

## Context
The targets every option must meet, with the course each came from.
Who operates the service, from section 2 of the design. What nobody has run.

## Options
A. Keep LangGraph on Cloud Run. This is doing nothing.
B. Run the same graph on Agent Runtime. Say what the front service adds.
C. Port to ADK on Agent Runtime. Say what gets rewritten.

## Decision
We will ...

## Consequences
Easier: ... Harder: ... Unmeasured: ... We reopen this if ...

## Evidence
The commands behind your figures.`,
        },
        {
          kind: "step",
          id: "architecture04-s03",
          title: "Add the decision to section 10",
          text: "Add one row to the decisions table in section 10 of `docs/design.md`. Then search the file for the ADR number. You should see the row you wrote in step 1 and the row you write now. Chapter 8 checks the whole list.",
          lang: "bash",
          file: "docs/design.md",
          code: `| 0003 | We will keep LangGraph on Cloud Run as the agent runtime | accepted |

grep -n "0003" docs/design.md`,
          expect: "Two matches in `docs/design.md`: the Agent runtime row in section 3, and the 0003 row in section 10.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Which agent runtime would you choose, and why?",
          text: "A strong answer starts with who operates it. It names the duties: state, limits, side effects, serving, reach and scale. It says which ones a managed runtime takes and which stay with you. It prices the switch, in the rewrite and in leaving. It says what was measured and what was not.",
        },
        {
          kind: "p",
          text: "Yours is written. What did AskPEP's say, with the third team in view?",
        },
      ],
    },
    {
      id: "s7-runtime-adr",
      title: "AskPEP keeps LangGraph on Cloud Run because scale doesn't force a change",
      goal: "What did AskPEP decide about its runtime, and what would reopen it?",
      blocks: [
        {
          kind: "p",
          text: "The decision is to keep LangGraph on Cloud Run, because the load is small and the rewrite is large. You do one sum first, as the method says. On the pilot's busiest day, 225 requests came in over nine hours. At 1,000 a day and the same shape, that is about 111 an hour.",
        },
        {
          kind: "p",
          text: "Even if each request took the 38.4 seconds of the slowest traced run, about 1.2 would be in flight at once. Cloud Run's limit of three instances carries that. So scale gives no reason to change, and the operator question is what remains.",
        },
        {
          kind: "p",
          text: "The product owner asks whether a managed runtime would ease the one engineer's load. You can't answer in hours, because nobody logged them before 1 December. The security reviewer points out that INCIDENT-001 was a re-ingest on the live store, and no runtime would have stopped it. The ADR records both.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# 0003. We will keep LangGraph on Cloud Run as the agent runtime

- Status: accepted
- Date: 4 December 2026

## Context
R3 needs 95% of requests within 10 seconds, and reads 0.962.
R7 needs 0.95, and reads 0.8715. R4 allows 0.02 usd, and reads 0.0110 on placeholder prices.
C4 says one engineer operates AskPEP, with no rota.
Design traffic: 1,000 a day. Peak about 111 an hour, from the pilot's 225 over nine hours.
In flight at peak: about 1.2, even at the slowest traced run of 38.4 seconds.
Nobody has run the desk on Agent Runtime, so no figure compares the options.

## Options
A. Keep LangGraph on Cloud Run. Do nothing. No new bill, no rewrite.
   We keep the image, schema, pools and routes. Leaving later is cheap.
B. The same graph on Agent Runtime. Google runs the host and scaling.
   A front service stays on Cloud Run for X-API-Key and the eight events.
   Compute rate unread. Whether it accepts PostgresSaver is unchecked.
C. ADK on Agent Runtime. Google also runs sessions.
   We rewrite reducers, handoffs, the checkpointer and BudgetMiddleware.

## Decision
We will keep LangGraph on Cloud Run.
Scale doesn't require a change, and B and C both leave a Cloud Run service on our pager.

## Consequences
Easier: nothing changes, and the gate keeps its baseline.
Harder: we keep operating the schema and the pools.
Unchanged: R7, and the third team's three conditions.
Not measured: operator hours. The log started on 1 December.
Reopen if: an objective is missed because of a runtime fault, or the log passes
8 hours in any week without an incident. Try option B first, because only the host changes.

## Evidence
askpep slo, week of 24 to 27 November. Trace of 38,412 ms, 25 November.
INCIDENT-001, cause: a re-ingest on the live store.`,
          caption: "ADR 0003, whole. The figures belong to the story, and the 8 hours is a limit the team chose.",
        },
        {
          kind: "p",
          text: "Read the line that starts Not measured. An ADR that claimed saved hours would be easy to approve and impossible to check. This one starts the log and sets a level that reopens the decision. It also points at option B, so nobody has to rediscover which experiment comes first.",
        },
        {
          kind: "p",
          text: "Reuse this for any hosting choice. The sum of requests in flight takes one line and often ends the argument about scale.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# NNNN. We will <run this on that host>

- Status:
- Date:

## Context
Requirements this serves:
Who operates it:
Design traffic:
In flight at peak:  (requests an hour x seconds each / 3600)
What nobody has run:

## Options
A. Do nothing.
B.                  (who runs what, what the bill adds, cost of leaving)

## Decision
We will

## Consequences
Easier:
Harder:
Unchanged:
Not measured:
Reopen if:

## Evidence`,
          caption: "For your next hosting decision, the same ADR with blank values.",
        },
        {
          kind: "p",
          text: "Who runs the desk is settled. How it serves 1,000 requests a day isn't, and the margin on R3 is under two points. What should a caller wait for, and what should wait in line? Chapter 5 starts there.",
        },
      ],
    },
  ],
  recap: [
    "A runtime is a framework on a host. LangGraph and ADK are frameworks. Cloud Run and Agent Runtime are hosts.",
    "The desk asks six duties of a runtime: state, limits, side effects, serving, reach and scale.",
    "On Cloud Run you operate everything above the container. A managed runtime takes the machines and the stored thread, and leaves every rule with you.",
    "A front service that keeps your API key and your eight events brings a Cloud Run deploy back.",
    "An ADR can cite targets you set and baselines you measured, each with its caveat. It names the measurement it lacks.",
    "AskPEP keeps LangGraph on Cloud Run. At design traffic about 1.2 requests are in flight at peak, so scale doesn't force a change.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In choosing an agent runtime I learned that the deciding question is who operates it. A managed host takes the machines and the stored thread. It leaves every rule with me. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["architecture-q08", "architecture-q09"],
};

export default chapter;
