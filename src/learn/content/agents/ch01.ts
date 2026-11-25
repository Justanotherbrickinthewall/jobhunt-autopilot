import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "agents-01-tool-loop",
  course: "agents",
  number: 1,
  title: "An agent is a loop your code runs, and the model only picks the next tool",
  tagline: "What is an agent in code, and what does the model actually decide?",
  minutes: 60,
  objectives: [
    "Trace the tool loop move by move, and say what the model decides and what your code runs.",
    "Choose between a workflow and an agent by asking whether you can list the steps before the run.",
    "Name the PEP desk's four agents and five tools, and the part this chapter builds.",
    "Write a tool the model can read, which returns its failures as data with a hint.",
    "Build the researcher with `create_agent`, and say where its model and step count come from.",
    "Test an agent offline by scripting the model's replies, tool calls included.",
    "Set up your repo, then run the researcher on a scripted chat model and read each step.",
  ],
  sections: [
    {
      id: "s1-loop",
      title: "Your code runs the loop, and the model only proposes the next call",
      goal: "What is an agent in code, and which part of it does the model decide?",
      blocks: [
        {
          kind: "p",
          text: "Course 1 built AskPEP, which answers questions about Python PEPs. It runs one fixed pipeline: it searches, reranks and writes a cited answer. Every question takes the same path. This chapter asks one question. What is an agent in code, and what does the model actually decide?",
        },
        {
          kind: "p",
          text: "Some questions need a different path. Which PEP added the walrus operator, the `:=` syntax, needs one search. Why people objected to it needs a search and then a closer read. Whether a snippet follows PEP 8, the Python style guide, needs a code check as well. A fixed pipeline can't choose between those paths.",
        },
        {
          kind: "p",
          text: "From course 1, an agent is an LLM that chooses its next action in a loop. That loop is ordinary code, and this section writes it out.",
        },
        {
          kind: "p",
          text: "A **chat model** is the object your code calls to get the model's next message. You send it the **messages** so far, and it sends one message back. A message is the user's question, a model reply or a tool result.",
        },
        {
          kind: "p",
          text: "The list of messages so far is the **history**, and the model rereads it on every call. The model keeps nothing between calls, so your code sends the whole history each time.",
        },
        {
          kind: "p",
          text: "From course 1, a tool is a named function with a description and an input schema. The model can't run a tool. It can only ask for one, by replying with a **tool call**. A tool call is a message in which the model asks your code to run one named tool with arguments.",
        },
        {
          kind: "p",
          text: "Your code runs the function and adds the result to the history. A tool's result, sent back to the model as a message, is an **observation**. Those pieces make four moves.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Propose. The model reads the history and replies with a tool call or a final answer.",
            "Execute. Your code finds the named tool and runs it with the model's arguments.",
            "Observe. Your code adds the tool's result to the history as a new message.",
            "Decide. Your code calls the model again with the longer history, and the model proposes another call or answers.",
          ],
        },
        {
          kind: "p",
          text: "The loop ends when a reply holds no tool call. That reply is the answer. Nothing else stops the loop, so one with no limit can run for ever. Chapter 6 adds the limits. For now, the model's own judgement is the only brake.",
        },
        {
          kind: "code",
          lang: "python",
          caption: "The whole loop in plain Python. The names are neutral, because each provider spells them differently.",
          code: `def run_agent(question, tools, call_model):
    history = [{"role": "user", "content": question}]
    while True:
        reply = call_model(history)                 # propose
        history.append(reply)
        if not reply.tool_calls:
            return reply.content                    # no tool call: this is the answer
        for call in reply.tool_calls:
            result = tools[call.name](**call.args)  # execute
            history.append(                         # observe
                {"role": "tool", "id": call.id, "content": result}
            )`,
        },
        {
          kind: "p",
          text: "Take the walrus question. The model replies with a call to `search_peps`, AskPEP's search offered as a tool. Your code runs the search and adds the passages to the history. The model reads them and writes the answer.",
        },
        {
          kind: "p",
          text: "A **step** in this course is one **model call**, one request to the language model. The walrus run takes two steps: one call proposes the search and one writes the answer. Running the tool is not a step. Count steps, because every step costs time and money.",
        },
        {
          kind: "widget",
          id: "agents01-loop-stepper",
          intro: "Walk one agent through a harder question, which needs two searches. Before each message appears, predict what the model sends next. Watch who runs each tool. Then check how many messages the model receives on its last call.",
        },
        {
          kind: "quiz",
          id: "agents01-q1",
          question: "In the tool loop, which part of the system runs `search_peps`?",
          options: [
            "The model, because it chose the call.",
            "Your application code, which runs it and adds the result to the history.",
            "The model provider, on its own servers.",
            "The database, which watches the conversation.",
          ],
          answer: 1,
          explain: "The model only emits a request that names the tool and its arguments. Your code looks the tool up and runs it. That is why checks on a call belong in your code.",
        },
        {
          kind: "fold",
          tone: "plain",
          title: "A reply can hold more than one tool call",
          text: "A model can ask for two independent lookups in one reply. Your code runs both and adds both results before the next model call. The loop is the same, with two tool calls in one step. The researcher in this chapter makes one call at a time.",
        },
        {
          kind: "p",
          text: "So the model decides one thing on each call: the next tool call, or the answer. Your code does everything else. It runs every call, so your code is where every check goes. Chapter 22 limits which tools each agent may call.",
        },
        {
          kind: "p",
          text: "Not every task needs a loop like this. The next section shows how to tell when one does.",
        },
      ],
    },
    {
      id: "s2-workflow-or-agent",
      title: "Use an agent only when the path depends on what the tools return",
      goal: "When should the model choose the steps, and when should your code fix them?",
      blocks: [
        {
          kind: "p",
          text: "An agent is not always the right design. A **workflow** is code that fixes the steps and their order, with a model inside some steps. In course 1 the word meant a CI file. An agent lets the model choose the steps instead.",
        },
        {
          kind: "p",
          text: "The test is simple. If you can list the steps before the run, write a workflow. A model inside a fixed step doesn't make a workflow an agent. AskPEP in course 1 was a workflow. It searched, reranked and wrote, in that order, for every question.",
        },
        {
          kind: "p",
          text: "Autonomy has a price. It adds model calls, and the number of calls changes from run to run. Latency becomes uneven and cost is harder to predict. Tests get harder too, because the path depends on the model's choices. Pay the price only when the task needs it.",
        },
        {
          kind: "widget",
          id: "agents01-workflow-or-agent",
          intro: "Sort six AskPEP tasks into a workflow or an agent. Decide each one with a single question: can you list the steps before the run? Then compare the model calls that each design needs. Look for the tasks where you gave a loop to a job that never needed one.",
        },
        {
          kind: "quiz",
          id: "agents01-q5",
          question: "A fixed search runs, and then a model writes the answer from the passages. Is that an agent?",
          options: [
            "Yes, because a model is involved.",
            "Yes, because it uses a search tool.",
            "No. Code fixes the steps, so it is a workflow with a model inside one step.",
            "No, because it does not stream its answer.",
          ],
          answer: 2,
          explain: "An agent chooses its own steps. Here the code chooses the order every time, and the model only writes once. That is a workflow, and it is often the better design.",
        },
        {
          kind: "p",
          text: "AskPEP's open questions pass the test. Why a PEP was contested needs a search, then a choice about what to look up next. You can't list those steps before the run, so open questions need an agent.",
        },
        {
          kind: "p",
          text: "Interviewers often ask when you would not build an agent.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "When not to use an agent",
          text: "Expect to be asked when you would not build an agent. Answer first: when you can list the steps before the run. Then name the price of autonomy, which is more model calls, uneven latency and harder tests. Add that most production systems are workflows with a model inside one step.",
        },
        {
          kind: "p",
          text: "Course 2 builds a team of agents for them, which the next section meets.",
        },
      ],
    },
    {
      id: "s3-desk",
      title: "The PEP desk splits AskPEP's work among four agents, and this chapter builds one",
      goal: "Who works on the PEP desk, and which part of it does this chapter build?",
      blocks: [
        {
          kind: "p",
          text: "Course 2 turns AskPEP into the **PEP desk**, the course's running app: agents that answer Python questions from the PEPs and can file a ticket. Every later chapter builds on it, so keep this picture of it.",
        },
        {
          kind: "p",
          text: "The desk has four members. The **triage router** is the agent that reads a question and picks which specialist answers it. The specialists are the **researcher**, the **code advisor** and the **writer**. One searches the PEPs, one checks code, and one writes the reply.",
        },
        {
          kind: "p",
          text: "The code advisor also looks up which Python version shipped a feature, and the writer files tickets. The table lists the desk's five tools.",
        },
        {
          kind: "compare",
          caption: "The desk's five tools. This chapter builds search_peps.",
          columns: ["Tool", "What it does", "Used by"],
          rows: [
            ["`search_peps`", "Finds the best passages for a query, by meaning and by keyword.", "Researcher and code advisor"],
            ["`read_pep_section`", "Returns one whole section of one PEP.", "Researcher"],
            ["`lint_snippet`", "Checks a Python snippet with ruff, a code checker.", "Code advisor"],
            ["`python_feature_version`", "Gives the Python version a PEP shipped in.", "Code advisor"],
            ["`open_ticket`", "Files a ticket on the desk's tracker.", "Writer"],
          ],
        },
        {
          kind: "p",
          text: "Chapter 2 adds the other tools. Chapter 3 adds the triage router, and chapter 4 joins the members into one desk. `open_ticket` is a stub until chapter 7 writes it and makes filing safe to repeat. Chapter 5 asks when a team of agents beats one agent.",
        },
        {
          kind: "p",
          text: "This chapter builds only the researcher, over `search_peps`. The next section looks at that tool the way the model sees it.",
        },
      ],
    },
    {
      id: "s4-tool",
      title: "A tool is a function plus a description, and the model reads only the description",
      goal: "What does the model see of a tool, and what does the tool send back?",
      blocks: [
        {
          kind: "p",
          text: "The model picks a tool by reading its name, its description and its argument types. It never sees the code inside. So the description works as a prompt, and a vague one produces confident wrong calls. Chapter 2 is about writing them well. This chapter needs only the shape.",
        },
        {
          kind: "p",
          text: "Each of the desk's tools is a plain Python function. It takes the desk's `Services` first, under the name `svc`. `Services` is the course 1 object that holds the settings, the embedder, the store and the other outside services. A test can call the function directly. A wrapper, built by `make_tools`, then offers it to the model.",
        },
        {
          kind: "p",
          text: "`search_peps(svc, query, k)` is the first tool. It runs course 1's hybrid search and returns one record per passage. Each record is a `PepHit`, a dictionary with seven keys: `pep`, `title`, `section`, `text`, `score`, `chunk_id` and `url`. The `section` is the heading path without the PEP's title.",
        },
        {
          kind: "p",
          text: "A tool never raises an exception into the loop. When the model passes a bad argument, the function returns a `ToolError`. That is a dictionary with two keys. The `error` says what went wrong, and the `hint` says what to try next. The model reads it as an observation and corrects itself.",
        },
        {
          kind: "code",
          lang: "python",
          caption: "What the model is offered for search_peps. The wrapper sits inside make_tools, so svc is captured and stays out of the schema.",
          code: `@tool("search_peps", parse_docstring=True)
def search_peps_tool(query: str, k: int = 6) -> str:
    """Search the PEP corpus and return the best passages.

    Use this first for any question about what a PEP says. It matches meaning and keywords together.
    If the passages do not answer the question, search again with different words.

    Args:
        query: What to look for, in plain words, such as "walrus operator in comprehensions".
        k: How many passages to return, from 1 to 20. The default is 6.
    """
    return json.dumps(search_peps(svc, query, k), ensure_ascii=False)`,
        },
        {
          kind: "p",
          text: "Read the wrapper as the model would. It sees a tool called `search_peps` with two arguments, `query` and `k`. The `@tool` decorator comes from **LangChain**, the library that wraps models and tools. It turns the function into a tool, and the docstring becomes the description.",
        },
        {
          kind: "p",
          text: "`parse_docstring=True` reads each argument's description from the `Args` section. The model never sees `svc`. The wrapper returns a JSON string, because a tool result in the history is text. A list of records and a `ToolError` both become JSON the model can read.",
        },
        {
          kind: "p",
          text: "Interviewers often ask you to design a tool that an agent will call.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Designing a tool for a model",
          text: "Expect to be asked to design a tool an agent will call. Say that the name and description are the model's only guide, and that arguments need types and ranges. Say that failures come back as data with a hint. Add that the tool hides what the model must not control.",
        },
        {
          kind: "quiz",
          id: "agents01-q2",
          question: "Which parts of `search_peps` does the model read when it decides to call it?",
          options: [
            "Its Python source.",
            "Its name, its description and its argument types.",
            "The `Services` object it receives.",
            "The text of every PEP in the corpus.",
          ],
          answer: 1,
          explain: "The model sees the tool's schema. That holds the name, the description from the docstring and the typed arguments. It never sees the code or `svc`, so a vague description leads to wrong calls.",
        },
        {
          kind: "p",
          text: "A tool on its own runs nothing. The next section hands it to a library that runs the loop.",
        },
      ],
    },
    {
      id: "s5-create-agent",
      title: "create_agent runs the loop, and every agent gets its model from one factory",
      goal: "What does create_agent build, and what does the desk add around it?",
      blocks: [
        {
          kind: "p",
          text: "You could write the loop from section 1 yourself, but the desk doesn't. LangChain's `create_agent` runs the four moves for you. You give it a chat model, a list of tools and a system prompt, from course 1. Then you call the agent it returns with the starting messages.",
        },
        {
          kind: "code",
          lang: "python",
          caption: "The smallest create_agent call. Calling invoke takes the starting messages, here a HumanMessage that holds the user's question, and returns the final state.",
          code: `from langchain.agents import create_agent

agent = create_agent(
    model=svc.chat("researcher"),
    tools=[search_peps_tool],
    system_prompt="Answer from the passages search_peps returns, and name the PEP you used.",
)
result = agent.invoke({"messages": [HumanMessage("Which PEP added the walrus operator?")]})`,
        },
        {
          kind: "p",
          text: "Beneath `create_agent` runs **LangGraph**, which runs an agent as a graph with saved state. You don't need the graph yet, and chapter 3 teaches it. The result is the agent's final state, and its `messages` key holds the whole history.",
        },
        {
          kind: "p",
          text: "Agents never build a model themselves. Each one calls `svc.chat(role)`, where `role` is a name such as `researcher`. The field `svc.chat` holds a **factory**, a function that builds an object from settings, so a test can swap in a fake. `make_chat_model` is the real factory.",
        },
        {
          kind: "quiz",
          id: "agents01-q3",
          question: "Why does an agent call `svc.chat(role)` instead of building its own chat model?",
          options: [
            "A Gemini client can only be built once for each process.",
            "A test can swap in a scripted model, and a change of provider touches one function.",
            "The role decides which tools the agent may use.",
            "It removes the need for credentials.",
          ],
          answer: 1,
          explain: "The agent asks for a model by role and never knows the provider. Tests pass a factory that returns scripted models, and a change of model or provider is one edit in `make_chat_model`.",
        },
        {
          kind: "p",
          text: "The desk wraps the call in one function, `create_desk_agent`, so every agent starts from the same setup. It takes its model from `svc.chat`, with the role defaulting to the agent's name. It passes four extra arguments to `create_agent`.",
        },
        {
          kind: "list",
          items: [
            "`name` signs every message the agent writes, so you can tell the researcher's messages from the writer's later.",
            "`state_schema` is `DeskAgentState`, a class that ships complete. It lists what the run keeps besides messages, such as the counters.",
            "`middleware` takes the desk's **middleware**: code that runs around an agent's model calls. In course 1 the word meant code that wraps HTTP requests.",
            "`checkpointer` stays empty in this chapter. Chapter 3 explains it.",
          ],
        },
        {
          kind: "p",
          text: "The desk's `UsageMiddleware` ships complete, and the step count comes from it. After each model call it adds one to the run's `steps` and records the tokens. So the walrus run ends with `steps` at 2.",
        },
        {
          kind: "p",
          text: "If `svc.chat` is empty, `create_desk_agent` raises an error at once. A missing factory then fails when you build the agent, and not in the middle of a run.",
        },
        {
          kind: "quiz",
          id: "agents01-q4",
          question: "The researcher calls `search_peps` once and then answers. What does `steps` read at the end?",
          options: ["1", "2", "3", "4"],
          answer: 1,
          explain: "A step is one model call. The first call proposed the search and the second wrote the answer. Running the tool in your code is not a model call, so it adds no step.",
        },
        {
          kind: "fold",
          tone: "hood",
          title: "What create_agent builds",
          text: "Under the hood, `create_agent` builds a small LangGraph graph with two parts. One calls the model, and the other runs the tools the model asked for. After a model call, the run moves to the tools when the reply holds tool calls, and ends when it holds none. After the tools, it goes back to the model. Those are the four moves. Chapter 3 names the parts.",
        },
        {
          kind: "p",
          text: "A real model can reply differently on every run, so a test can't depend on it. The next section puts a script in its place.",
        },
      ],
    },
    {
      id: "s6-scripted",
      title: "A scripted model lets you test an agent with no network and no randomness",
      goal: "How do you test an agent when a real model's replies change from run to run?",
      blocks: [
        {
          kind: "p",
          text: "A **scripted chat model** is a fake chat model that returns a fixed list of replies, so a run needs no API key. Course 1 had `FakeLLM` for the same reason. This fake is a chat model, so it can also send tool calls.",
        },
        {
          kind: "p",
          text: "A tool call is an `AIMessage`, LangChain's class for a model reply, with a `tool_calls` list. Each entry holds the tool's `name`, its `args` and an `id`. The id ties the call to its result. A test writes the replies the model would send, and the agent loop does the rest.",
        },
        {
          kind: "code",
          lang: "python",
          caption: "A script of two replies. The first asks for a search, and the second is the answer. Build a new model for each run, because the messages are an iterator.",
          code: `script = iter([
    AIMessage(content="", tool_calls=[{"name": "search_peps", "args": {"query": "walrus operator"}, "id": "call-1"}]),
    AIMessage(content="PEP 572 added the walrus operator in Python 3.8."),
])
model = ScriptedChatModel(messages=script)`,
        },
        {
          kind: "p",
          text: "`ScriptedChatModel` extends `GenericFakeChatModel`, a LangChain fake that already replays messages. No stock fake works with tools inside `create_agent`, so two changes are needed. An agent calls `bind_tools` to tell the model which tools exist. The scripted model returns itself, because its script already holds the calls.",
        },
        {
          kind: "p",
          text: "The second change is `_stream`. LangGraph can stream a model's reply in pieces, and a streamed tool call arrives as one piece. The parent class drops tool calls when it streams, so the scripted model replays them itself.",
        },
        {
          kind: "p",
          text: "Running the researcher on a script needs the course 2 setup and the lab. The last section covers both.",
        },
      ],
    },
    {
      id: "s7-setup-and-run",
      title: "Your repo needs one setup pass before the lab builds the researcher",
      goal: "What does your repo need before the lab, and how do you run the finished researcher?",
      blocks: [
        {
          kind: "p",
          text: "You build the desk inside your AskPEP repo from course 1. Do these steps once, in order, from the root of your repo.",
        },
        {
          kind: "p",
          text: "The desk's agents run on **Gemini**, Google's model family. Google serves it from **Vertex AI**, its hosted model platform. Some settings below name them, and the paragraphs after the steps explain both.",
        },
        {
          kind: "step",
          id: "agents01-s01",
          title: "Pull the course 2 starter files",
          text: "Run `pull-course.sh` from the root of your repo, with the course name. It copies the stubs, the tests and a test plugin, and it never overwrites a file. Each stub raises `NotImplementedError` until you write it, as in course 1's labs. Commit the result before you write any code.",
          lang: "bash",
          code: `my-learn/labs/askpep/template/scripts/pull-course.sh agents
git add -A
git commit -m "Add the course 2 starter files"`,
          expect: "One added line for each file, such as added src/askpep/agents/tools.py. Then a count of added and kept files. Then the two uv lines from the next step. The script calls them the first lab step, and here they are the next step.",
        },
        {
          kind: "list",
          items: [
            "`langchain` holds `create_agent`. Its `mcp` extra loads tools from MCP servers, which chapter 2 uses.",
            "`langgraph` is the runtime beneath `create_agent`, which chapter 3 teaches.",
            "`langchain-google-genai` is the chat client for Gemini.",
            "`langchain-anthropic` is the chat client for Claude, kept for the `judge` role.",
            "`langgraph-checkpoint-postgres` saves a run in Postgres, for chapter 7.",
            "`langsmith` is a trace viewer, which you switch on in chapter 3.",
          ],
        },
        {
          kind: "step",
          id: "agents01-s02",
          title: "Install the course 2 packages",
          text: "The script printed the lines from `deps.txt` and ran none of them. Run both lines now. The first moves `ruff`, which checks Python code, into your main dependencies, because the desk runs it as a tool in chapter 2. The second adds the packages in the list above.",
          lang: "bash",
          code: `uv remove --dev ruff
uv add "ruff>=0.17.1" "langchain[mcp]>=1.4.6" "langchain-anthropic>=1.7.6" "langchain-google-genai>=4.4.2" "langgraph>=1.2.16" "langgraph-checkpoint-postgres>=3.2.0" "langsmith>=0.14.11"`,
          expect: "uv installs the packages and exits without an error. Your pyproject.toml and uv.lock change.",
        },
        {
          kind: "step",
          id: "agents01-s03",
          title: "Check that LangChain imports",
          text: "This one line proves the install worked and shows which LangChain you have. The desk's code needs version 1.4.6 or later, because `create_agent` arrived in the 1.x line.",
          lang: "bash",
          code: `uv run python -c "import langchain; print(langchain.__version__)"`,
          expect: "A version number of 1.4.6 or later.",
        },
        {
          kind: "step",
          id: "agents01-s04",
          title: "Add the course 2 settings to your .env",
          text: "Course 1 copied `.env.example` into your repo once, so your `.env` lacks the new settings. Open `labs/askpep/template/.env.example` in the my-learn folder. Copy the block that starts at the line `# Course 2:`. Paste it at the bottom of your `.env`. Leave the `CHECKPOINTER` and `LANGSMITH` lines alone, because chapters 7 and 3 explain them.",
          lang: "text",
          file: ".env",
          code: `# Course 2: the desk runs Gemini on Vertex AI. Live mode needs the project id.
GOOGLE_CLOUD_PROJECT=
VERTEX_LOCATION=global
DESK_MODEL=gemini-3.8-flash
STRONG_MODEL=gemini-4-argon
STRONG_LOCATION=global

# "postgres" keeps desk threads across restarts. "memory" forgets them.
CHECKPOINTER=postgres

# LangSmith is a trace viewer only, until course 5.
LANGSMITH_TRACING=false
LANGSMITH_API_KEY=
LANGSMITH_PROJECT=askpep`,
          expect: "Your .env ends with the line LANGSMITH_PROJECT=askpep. GOOGLE_CLOUD_PROJECT can stay empty until the optional live call later in this section.",
        },
        {
          kind: "step",
          id: "agents01-s05",
          title: "See the starting point",
          text: "Run this chapter's tests before you write anything. All 28 fail. Each failure raises `NotImplementedError` and names the lab step that fixes it, such as `agents-01 step 1`. A lab step is done when its tests pass. Nothing here is broken, because the failures are the to-do list.",
          lang: "bash",
          code: `uv run pytest tests/agents/test_agents01_tool_loop.py -q`,
          expect: "A summary line that reads 28 failed. Each failure raises NotImplementedError and names a step, such as agents-01 step 1.",
        },
        {
          kind: "p",
          text: "A chat client reaches Gemini on Vertex AI with a Google Cloud project, a region and credentials. One `gcloud` login creates Application Default Credentials, so no API key goes in `.env`.",
        },
        {
          kind: "p",
          text: "Vendors rename models often, so model names live in `.env` and never in code. The settings name three kinds of role.",
        },
        {
          kind: "compare",
          caption: "The three kinds of role, and where each one runs.",
          columns: ["Role", "Model", "Where it runs"],
          rows: [
            ["Desk roles, such as `researcher`", "Gemini, named in `DESK_MODEL`", "Vertex AI, in `VERTEX_LOCATION`"],
            ["`strong`", "The strongest Gemini, named in `STRONG_MODEL`", "Vertex AI, in `STRONG_LOCATION`"],
            ["`judge`", "Claude, named in `JUDGE_MODEL`", "Anthropic's own API"],
          ],
        },
        {
          kind: "p",
          text: "The `strong` role has its own region, so it can move alone. The `judge` role stays on Claude, as in course 1, so Gemini never grades its own work.",
        },
        {
          kind: "p",
          text: "Lab step 2 writes `make_chat_model`, which builds the Gemini client, `ChatGoogleGenerativeAI`, or the Claude client, `ChatAnthropic`. It adds fields to `Settings` and `Services` from the blocks below. The first five name the Gemini models and their regions.",
        },
        {
          kind: "code",
          lang: "python",
          caption: "Add these five fields to Settings in config.py. A field you set in .env wins over its default.",
          code: `    google_cloud_project: str = ""  # needed for live Gemini
    vertex_location: str = "global"  # the desk roles' location
    desk_model: str = "gemini-3.8-flash"
    strong_model: str = "gemini-4-argon"
    strong_location: str = "global"  # gemini-4-argon serves only global, us and eu`,
        },
        {
          kind: "p",
          text: "Nine more fields go beside them. They hold the limits that chapters 2, 6 and 8 explain, and the `checkpointer` choice from chapter 7. The tests read them, so you add them now and edit `Settings` once.",
        },
        {
          kind: "code",
          lang: "python",
          caption: "Add these nine fields to Settings too. Later chapters explain each one.",
          code: `    desk_max_steps: int = 12
    desk_max_tokens: int = 20000
    desk_max_seconds: float = 60
    desk_recursion_limit: int = 100
    desk_loop_repeats: int = 3
    desk_context_tokens: int = 6000
    checkpointer: str = "postgres"  # "postgres" or "memory"
    lint_timeout_seconds: float = 5
    lint_max_chars: int = 20000`,
        },
        {
          kind: "p",
          text: "`Services` gains three fields: `chat` for the factory, and `checkpointer` and `memory`, which stay empty until chapter 7. Every field has a default, so your course 1 code keeps working.",
        },
        {
          kind: "code",
          lang: "python",
          caption: "Add ChatFactory to your import from askpep.providers, and the two imports under TYPE_CHECKING. Then add the three fields at the end of Services.",
          code: `# under "if TYPE_CHECKING:" in services.py
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.store.base import BaseStore

# at the end of the Services fields
    chat: ChatFactory | None = None  # course 2: svc.chat(role) builds the chat model for a desk role
    checkpointer: "BaseCheckpointSaver | None" = None  # course 2
    memory: "BaseStore | None" = None  # course 2: the LangGraph Store`,
        },
        {
          kind: "step",
          id: "agents01-s06",
          title: "Optional: make one live call to Gemini",
          text: "Do this after lab step 2. It sends a few tokens to Gemini, billed to your Google Cloud project, which needs billing on. You also need the `gcloud` command line tool. Log in once, enable the Vertex AI API, and put your project id in `.env` as `GOOGLE_CLOUD_PROJECT`. Then run the one-line script.",
          lang: "bash",
          // CHECK: aiplatform.googleapis.com is the API name for Vertex AI, and these commands were not run while writing the chapter. Confirm both against the current Gemini Enterprise Agent Platform docs before relying on them.
          // CHECK: a live Gemini call with location="global" has not been made. The model ids and regions come from setup/revision5/FACTS.md (20 October 2026), not from a live call.
          code: `gcloud auth application-default login
gcloud services enable aiplatform.googleapis.com
uv run python -c "from askpep.config import Settings; from askpep.providers import make_chat_model; print(make_chat_model(Settings(), 'researcher').invoke('Say hello in five words.').text)"`,
          expect: "A short greeting from Gemini. An error that names a missing project or a permission means the project id in .env or the login is wrong.",
        },
        {
          kind: "fold",
          tone: "dyk",
          title: "Vertex AI has a new name",
          text: "On 22 April 2026 Google renamed Vertex AI to Gemini Enterprise Agent Platform. Google's documentation uses the new name, and the Python code still imports `vertexai`. This chapter checked the names on 21 October 2026. Check them against Google's current documentation before you rely on them.",
        },
        {
          kind: "fold",
          tone: "trouble",
          title: "Older tutorials use ChatVertexAI",
          text: "Many tutorials import `ChatVertexAI` from `langchain-google-vertexai`. That class is deprecated. The current route is `ChatGoogleGenerativeAI` from `langchain-google-genai`, with `vertexai=True`. Don't install `langchain-google-vertexai` in this repo. Its version limits clash with the other packages AskPEP pins.",
        },
        {
          kind: "p",
          text: "Now do the lab. When all 28 tests pass, come back and run the researcher offline.",
        },
        {
          kind: "step",
          id: "agents01-s07",
          title: "Run the researcher offline",
          text: "Do this after lab step 5. First build a local store with the fake embedder, so the search needs no keys. Then save the script as `try_researcher.py` in your repo root and run it.",
          lang: "python",
          file: "try_researcher.py",
          code: `# First, once, in your shell:
#   PROVIDERS=fake LOCAL_STORE_PATH=data/fake-store.json uv run askpep ingest --store local
# Then: uv run python try_researcher.py
from langchain_core.messages import AIMessage, HumanMessage

from askpep.agents.factory import create_desk_agent
from askpep.agents.tools import make_tools
from askpep.config import Settings
from askpep.fakes import ScriptedChatModel
from askpep.services import build_services

svc = build_services(Settings(providers="fake", store="local", local_store_path="data/fake-store.json"))
ask = {"name": "search_peps", "args": {"query": "walrus operator"}, "id": "call-1"}
script = iter(
    [
        AIMessage(content="", tool_calls=[ask]),
        AIMessage(content="PEP 572 added the walrus operator in Python 3.8."),
    ]
)
svc.chat = lambda role: ScriptedChatModel(messages=script)
researcher = create_desk_agent(
    svc,
    "researcher",
    "Answer from the passages search_peps returns, and name the PEP you used.",
    [make_tools(svc)["search_peps"]],
)
result = researcher.invoke({"messages": [HumanMessage("Which PEP added the walrus operator?")]})
for message in result["messages"]:
    shown = [c["name"] for c in getattr(message, "tool_calls", [])] or str(message.content)[:60]
    print(f"{type(message).__name__:13} {message.name or '-':13} {shown}")
print("steps:", result["steps"])`,
          expect: "Four message lines and then steps: 2. The first is the HumanMessage with your question. Next is an AIMessage signed researcher that calls search_peps. Then a ToolMessage from search_peps holding the passages. The last is the researcher's answer.",
        },
        {
          kind: "p",
          text: "Each printed line is one message in the history. The two AIMessage lines are the two steps, and the ToolMessage between them is the observation.",
        },
        {
          kind: "p",
          text: "The researcher called `search_peps` because its script said so. A real model has only the tool's name, description and schema to go on. So how does the model know what a tool does, and when to call it? Chapter 2 answers that.",
        },
      ],
    },
  ],

  lab: {
    title: "Build the research agent",
    goal: "Build the PEP desk's researcher in your AskPEP repo. Do the setup in section 7 first. Steps 1 and 2 edit files you wrote in course 1. Steps 3 to 5 replace stubs that raise `NotImplementedError(\"agents-01 step N\")`. Every test is offline, so you need no key and no network.",
    minutes: 60,
    files: [
      "src/askpep/fakes.py",
      "src/askpep/config.py",
      "src/askpep/providers.py",
      "src/askpep/services.py",
      "src/askpep/agents/tools.py",
      "src/askpep/agents/factory.py",
      "tests/agents/test_agents01_tool_loop.py",
    ],
    steps: [
      {
        title: "A model that follows a script",
        text: "Add `ScriptedChatModel` to your `fakes.py`. Add the imports first. Paste `_stream_message` as it is. It replays one finished message as chunks, the pieces a streaming model sends. Then write the class. `bind_tools` returns the model itself. `_stream` calls `self._generate`, then hands the message it made to `_stream_message`.",
        code: `# src/askpep/fakes.py
# Add these imports. Your course 1 file already has re and Iterator.
import json

from langchain_core.callbacks import CallbackManagerForLLMRun
from langchain_core.language_models.fake_chat_models import GenericFakeChatModel
from langchain_core.messages import AIMessage, AIMessageChunk
from langchain_core.messages.tool import ToolCallChunk
from langchain_core.outputs import ChatGenerationChunk


def _stream_message(
    message: AIMessage, run_manager: CallbackManagerForLLMRun | None
) -> Iterator[ChatGenerationChunk]:
    """Replay one finished message as chunks. A tool call goes out in one chunk, so streaming keeps it.
    Words go out one by one, and the usage rides on the last chunk."""
    if message.tool_calls:
        calls = [
            ToolCallChunk(name=call["name"], args=json.dumps(call["args"]), id=call["id"], index=i)
            for i, call in enumerate(message.tool_calls)
        ]
        pieces = [AIMessageChunk(content=message.content, tool_call_chunks=calls)]
    else:
        text = message.content if isinstance(message.content, str) else ""
        pieces = [AIMessageChunk(content=part) for part in re.split(r"(\\s)", text) if part]
        pieces = pieces or [AIMessageChunk(content="")]
    pieces[-1].usage_metadata = message.usage_metadata
    pieces[-1].chunk_position = "last"
    for piece in pieces:
        piece.id = message.id
        chunk = ChatGenerationChunk(message=piece)
        if run_manager:
            run_manager.on_llm_new_token(str(piece.content), chunk=chunk)
        yield chunk


class ScriptedChatModel(GenericFakeChatModel):
    """A chat model that replays the messages you give it, one per call."""

    def bind_tools(self, tools, **kwargs):
        # your turn: return the model itself. The script already holds the tool calls.
        ...

    def _stream(self, messages, stop=None, run_manager=None, **kwargs):
        # your turn:
        # 1. result = self._generate(messages, stop=stop, run_manager=run_manager, **kwargs)
        #    The parent class replays the next scripted message there.
        # 2. result.generations[0].message is that message. Pass it and run_manager to
        #    _stream_message, and yield from what it returns.
        ...`,
        test: "uv run pytest tests/agents/test_agents01_tool_loop.py -k agents01_s1",
      },
      {
        title: "Settings, the chat factory and Services",
        text: "Make three edits. Add the fourteen fields to `Settings` in `config.py`, and the three fields to `Services` in `services.py`, from the blocks in section 7. Then write `make_chat_model` in `providers.py`. The tests swap both chat classes for recorders, so no real client is built.",
        code: `# src/askpep/providers.py
# Add TYPE_CHECKING to your typing import. Your collections.abc import already has Callable.
# Add this import beside your askpep.types import, and the TYPE_CHECKING block under your imports.
from askpep.config import Settings

if TYPE_CHECKING:
    from langchain_core.language_models import BaseChatModel

# supervisor, baseline and summariser belong to chapters 5 and 8. List them now.
ModelRole = Literal[
    "triage",
    "researcher",
    "code_advisor",
    "writer",
    "supervisor",
    "baseline",
    "summariser",
    "judge",
    "strong",
]
ChatFactory = Callable[[ModelRole], "BaseChatModel"]


def make_chat_model(settings: Settings, role: ModelRole) -> "BaseChatModel":
    """One chat model per role. The desk roles share a Gemini model, \`judge\` is Claude, \`strong\` is
    the strongest Gemini on its own location. Agents never build a model themselves."""
    # your turn:
    # 1. For the judge role, import ChatAnthropic from langchain_anthropic inside the function and
    #    return ChatAnthropic(model=settings.judge_model, api_key=settings.anthropic_api_key).
    # 2. For every other role, import ChatGoogleGenerativeAI from langchain_google_genai inside the
    #    function. Importing here keeps providers.py importable without the Google client.
    # 3. Return ChatGoogleGenerativeAI(model=..., vertexai=True, project=settings.google_cloud_project,
    #    location=...). The strong role uses strong_model and strong_location.
    #    Every other role uses desk_model and vertex_location.
    ...`,
        test: "uv run pytest tests/agents/test_agents01_tool_loop.py -k agents01_s2",
      },
      {
        title: "The search tool",
        text: "Replace the `raise` in `search_peps` and keep the stub's docstring. `ToolError` and `PepHit` already exist in the file. A bad `k` or an empty query returns a `ToolError` and never raises. Otherwise each hit becomes one `PepHit`. The tests check the keys, the `section` text and the PEP's `url`.",
        code: `# src/askpep/agents/tools.py
def search_peps(
    svc: Services, query: str, k: int = 6, *, route: str = "agent.search"
) -> list[PepHit] | ToolError:
    # your turn:
    # 1. If k is outside 1 to 20, return ToolError(error=..., hint=...). The hint says which k to pass.
    # 2. If the query is empty once stripped, return a ToolError. Its hint shows an example query.
    # 3. hits = retrieval.search(svc, query, k, route=route). It returns a list of Hit.
    # 4. Return one PepHit for each hit: pep is chunk.doc_id, and title is chunk.title.
    #    section is section_name(chunk.heading_path), and text is chunk.text.
    #    score is the hit's score, chunk_id is chunk.chunk_id and url is chunk.source.
    raise NotImplementedError("agents-01 step 3")`,
        test: "uv run pytest tests/agents/test_agents01_tool_loop.py -k agents01_s3",
      },
      {
        title: "The tool set",
        text: "Replace the `raise` in `make_tools`. Change your import to `from langchain.tools import ToolRuntime, tool`. The stub already imports `ToolRuntime`. Write one `@tool` function for each desk tool, inside `make_tools`, so each captures `svc`. Each returns `json.dumps(result, ensure_ascii=False)`. The `parse_docstring` option needs an `Args` section that names every argument the model sees. Chapter 2 improves these descriptions.",
        code: `# src/askpep/agents/tools.py
def make_tools(svc: Services) -> dict[str, BaseTool]:
    # your turn: write the five wrappers. section 4 shows the first one.
    #
    # tool                     arguments the model sees   the plain function it calls
    # search_peps              query, k=6                 search_peps(svc, query, k)
    # read_pep_section         pep, section               read_pep_section(svc, pep, section)
    # lint_snippet             code                       lint_snippet(code, settings=svc.settings)
    # python_feature_version   pep                        python_feature_version(svc, pep)
    # open_ticket              title, body, peps          open_ticket(svc, title, body, peps,
    #                                                         thread_id="", principal=OWNER)
    #
    # Name each one with @tool("name", parse_docstring=True). Give it a docstring with a summary
    # line, a line on when to use it, and an Args section.
    #
    # Then collect the five into a list and return {t.name: t for t in tools}.
    raise NotImplementedError("agents-01 step 4")`,
        test: "uv run pytest tests/agents/test_agents01_tool_loop.py -k agents01_s4",
      },
      {
        title: "The agent",
        text: "Replace the `raise` in `create_desk_agent` and keep the stub's docstring. Add `from langchain.agents import create_agent` to your imports, and `DeskAgentState` to your import from `askpep.agents.state`. When the tests pass, run the offline try-it from section 7. The desk's first agent will answer a question with a scripted model.",
        code: `# src/askpep/agents/factory.py
def create_desk_agent(
    svc: Services,
    name: str,
    prompt: str,
    tools: list[BaseTool],
    *,
    role: "ModelRole | None" = None,
    checkpointer: Any = None,
):
    # your turn:
    # 1. If svc.chat is None, raise RuntimeError("Services has no chat factory. Set svc.chat, for example
    #    to partial(make_chat_model, settings).")
    # 2. Return create_agent with these keyword arguments:
    #      model=svc.chat(role or name)
    #      tools=tools
    #      system_prompt=prompt
    #      state_schema=DeskAgentState
    #      middleware=desk_middleware(svc)
    #      checkpointer=checkpointer
    #      name=name
    raise NotImplementedError("agents-01 step 5")`,
        test: "uv run pytest tests/agents/test_agents01_tool_loop.py -k agents01_s5",
      },
    ],
    verify: "uv run pytest tests/agents/test_agents01_tool_loop.py -k agents01",
  },
  recap: [
    "An agent is a loop your code runs. The model proposes a tool call or an answer, and your code runs the tool and adds the observation to the history.",
    "The loop ends when a reply holds no tool call. A step is one model call, and running a tool is not a step.",
    "Use an agent only when the path depends on what the tools return. Otherwise a workflow is cheaper and easier to test.",
    "The model reads a tool's name, description and argument types, never its code. A failure comes back as a ToolError with a hint.",
    "create_agent runs the loop, and every desk agent gets its model from svc.chat, so a test can swap in a scripted chat model.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In the tool loop I learned that an agent is a loop my code runs. The model only proposes the next tool call, and my code executes it. So every tool needs a clear description, and every failure must come back as data. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["agents-q01"],
};

export default chapter;
