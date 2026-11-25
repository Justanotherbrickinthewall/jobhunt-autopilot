import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "agents-02-tools-for-models",
  course: "agents",
  number: 2,
  title: "A tool's name, description and schema are its whole interface",
  tagline: "How does the model know what a tool does and when to call it? It reads three things you write, and never your code.",
  minutes: 45,
  objectives: [
    "Say exactly what a model receives for a tool.",
    "Write a name and description that say what a tool does and when to call it.",
    "Type a schema that leaves nothing to invent, and enforce its limits in code.",
    "Shape a result with ids, a truncation flag and an honest null, and price its tokens.",
    "Return a failure as a ToolError with a hint, and let a real crash stop the run.",
    "Run a process from a tool with no shell, a clean environment, an empty folder and a time limit.",
    "Serve the tools over MCP, and load them back into the desk through a sync entry point.",
  ],
  sections: [
    {
      id: "s1-interface",
      title: "The model knows a tool only by its name, description and schema",
      goal: "What exactly does a model receive for a tool?",
      blocks: [
        {
          kind: "p",
          text: "Chapter 1 ended with a researcher that called `search_peps` because its script said so. A real model has no script. So how does the model know what a tool does, and when to call it? This chapter answers that for every tool on the desk.",
        },
        {
          kind: "p",
          text: "The model learns about a tool at three moments. Before a call, it reads the tool's definition. After a call, it reads the result. When a call fails, it reads the error. The first five sections take them in that order.",
        },
        {
          kind: "p",
          text: "A **tool definition** is the name, description and schema the model sees for one tool. A **schema** is the typed list of a tool's arguments, which the model must fill. From those three things alone, it decides what to call and what to pass.",
        },
        {
          kind: "p",
          text: "The desk has five tools. `search_peps` and `read_pep_section` fetch PEP text. `lint_snippet` and `python_feature_version` answer questions about code. The fifth, `open_ticket`, is a stub until chapter 7 writes it. This chapter writes `read_pep_section`, `lint_snippet` and `python_feature_version`, and makes every tool fail safely.",
        },
        {
          kind: "p",
          text: "Chapter 1 showed that `@tool` turns a function into a tool. The docstring becomes the description, and the type hints become the schema. Here is the wrapper for `read_pep_section`, with its body cut. It is the finished form, so its `runtime` argument and `Command` return arrive in chapter 3. The model sees neither.",
        },
        {
          kind: "code",
          lang: "python",
          code: `@tool("read_pep_section", parse_docstring=True)
def read_pep_section_tool(pep: int, section: str, runtime: ToolRuntime) -> Command | str:
    """Read one whole section of one PEP, such as the Rationale of PEP 572.

    Use this after a search found the right PEP and a passage is not enough. The section is a heading
    from the PEP, in any case. If the name is wrong, the error lists the real ones.

    Args:
        pep: The PEP number, such as 572.
        section: The heading, such as "Rationale". For a nested heading, join the levels with " > ".
    """
    ...  # calls read_pep_section(svc, pep, section) and hands the result back`,
          caption: "The wrapper for read_pep_section, with the body cut. The docstring and the type hints become what the model sees.",
        },
        {
          kind: "p",
          text: "The model receives this instead, as JSON. Providers wrap it a little differently, but the content is the same.",
        },
        {
          kind: "code",
          lang: "json",
          code: `{
  "name": "read_pep_section",
  "description": "Read one whole section of one PEP, such as the Rationale of PEP 572. Use this after a search found the right PEP and a passage is not enough. The section is a heading from the PEP, in any case. If the name is wrong, the error lists the real ones.",
  "parameters": {
    "type": "object",
    "properties": {
      "pep": { "type": "integer", "description": "The PEP number, such as 572." },
      "section": { "type": "string", "description": "The heading, such as \\"Rationale\\". For a nested heading, join the levels with \\" > \\"." }
    },
    "required": ["pep", "section"]
  }
}`,
          caption: "The same tool as the model receives it. Line breaks in the description are shown as spaces, and the title keys are left out.",
        },
        {
          kind: "p",
          text: "Everything the model knows about this tool is in that block. If the block is vague, the model guesses. A system prompt can patch a vague block, but you pay for the patch on every model call.",
        },
        {
          kind: "callout",
          tone: "analogy",
          title: "Labels on a toolbox",
          text: "Picture a toolbox where each tool carries only a label, and the user cannot ask what a label means. That user is the model, and a bad label sends it to the wrong tool every time.",
        },
        {
          kind: "quiz",
          id: "agents02-q1",
          question: "Which of these does the model see when it decides whether to call `read_pep_section`?",
          options: [
            "The function body and its unit tests.",
            "The name, the description and the argument schema.",
            "The `svc` object, with its database and models.",
            "The name only, because the rest is for people.",
          ],
          answer: 1,
          explain: "The model sees a tool definition and nothing else. It never sees the body, the tests or `svc`. So the name, the description and the schema must carry everything it needs.",
        },
        {
          kind: "p",
          text: "The next section shows how a name and a description tell the model what a tool does and when to call it.",
        },
      ],
    },
    {
      id: "s2-describe",
      title: "The description tells the model when to call a tool and what comes back",
      goal: "How do a name and a description tell the model what a tool does and when to call it?",
      blocks: [
        {
          kind: "p",
          text: "The name filters first. Use a verb and a noun, such as `search_peps` or `read_pep_section`. A name like `do_pep_thing` tells the model nothing.",
        },
        {
          kind: "p",
          text: "The description does the rest. A good one says four things.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "It says what the tool does, in one plain sentence.",
            "It says when to use the tool, and when another tool is the better choice.",
            "It says what comes back, including the odd cases, such as an empty result.",
            "It says what the tool never does, such as running the code it checks.",
          ],
        },
        {
          kind: "p",
          text: "Here are the desk's own descriptions beside weak ones. A **linter** is a program that flags error-prone code without running it. ruff is the one the code advisor runs, through `lint_snippet`. The walrus operator in the last row is the syntax that PEP 572 added, which assigns a value inside an expression.",
        },
        {
          kind: "compare",
          caption: "The desk's own descriptions, word for word, beside a weak draft of each.",
          columns: ["Tool", "A weak description", "The desk's description"],
          rows: [
            [
              "read_pep_section",
              "Gets a PEP.",
              "Read one whole section of one PEP, such as the Rationale of PEP 572. Use this after a search found the right PEP and a passage is not enough. The section is a heading from the PEP, in any case. If the name is wrong, the error lists the real ones.",
            ],
            [
              "lint_snippet",
              "Lints code.",
              "Check a Python snippet with ruff and list what it finds. Use this when the user pasted code and asks whether it is correct or follows the style guide. It finds syntax errors, undefined names and unused imports. It never runs the code.",
            ],
            [
              "python_feature_version",
              "Version info.",
              'Look up the Python version a PEP shipped in, and the PEP\'s status. Use this for questions such as "which Python added the walrus operator". The answer comes from the PEP\'s header. The version is null when the PEP has none, as an informational PEP does not.',
            ],
          ],
        },
        {
          kind: "p",
          text: "Give each tool one job. Two tools with near-identical descriptions force the model to guess. If you need a second search tool, say in each description when to use it instead of the other.",
        },
        {
          kind: "p",
          text: "The opposite mistake is one tool for everything. A **catch-all tool** is a vague tool the model picks for everything, which hides the tool it really needed. It often takes an action name and a pile of loose fields, so its schema fits no single call.",
        },
        {
          kind: "fold",
          tone: "hood",
          title: "How the wrapper builds the definition",
          text: "The `@tool` decorator takes the opening paragraphs of the docstring as the description. The `Args:` block describes each field, and the type hints type it. An argument with a default, such as `k: int = 6`, is optional. So the docstring is part of the interface, not a comment.",
        },
        {
          kind: "p",
          text: "Long tool lists come up in interviews.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Interview: an agent with too many tools",
          text: "Answer first: selection gets harder as the list grows, and every definition costs tokens on every model call. Measure which pairs of tools the model confuses. Merge near-duplicates by task, and say in each description which neighbour to use instead. Past about a dozen tools, group them or route between them.",
        },
        {
          kind: "quiz",
          id: "agents02-q2",
          question: "Which description best helps a model decide whether to call `lint_snippet`?",
          options: [
            "Lints code.",
            "A powerful tool for working with Python code in many ways.",
            "Check a Python snippet with ruff and list what it finds. Use it when the user pasted code. It never runs the code.",
            "lint_snippet(code: str) -> LintReport",
          ],
          answer: 2,
          explain: "The third option says what the tool does, when to use it and what it never does. The first two say too little to choose by. The fourth repeats the signature, which the model already has.",
        },
        {
          kind: "p",
          text: "The schema decides what the model may pass, and the next section tightens it.",
        },
      ],
    },
    {
      id: "s3-schema",
      title: "A schema should leave the model nothing to invent",
      goal: "How do types, enums and limits make the model's arguments come out right?",
      blocks: [
        {
          kind: "p",
          text: "The schema fixes what the model can put in each field. A field typed as text accepts anything. A field typed as an integer accepts a whole number. The tighter the type, the fewer wrong calls reach your code.",
        },
        {
          kind: "p",
          text: "`read_pep_section` takes the PEP as an integer, which the model copies from a search result. A string such as 'PEP 572' is rejected before your code runs. The `section` field is text, since headings are text. Its description says how to write a nested heading.",
        },
        {
          kind: "p",
          text: "When the values form a closed set, use an **enum**, a fixed set of allowed values for one argument. A tool that filtered PEPs by status would need one. A PEP's status is a small set of words, such as Draft, Accepted and Final. With an enum, a value like 'finished' is rejected too.",
        },
        {
          kind: "p",
          text: "A schema checks types, not sense. `search_peps` takes `k`, the number of passages to return. Its description says from 1 to 20, and the function checks the range itself. The description tells the model the rule. The code enforces it.",
        },
        {
          kind: "p",
          text: "Write each field's description as an instruction with an example value. 'The PEP number, such as 572' beats 'The PEP'. When a value comes from an earlier result, say so.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Free text invites invention",
          text: "A free-text field that expects an id will sometimes receive an id the model made up. Prefer a type, a pattern or an enum, and say where the value comes from.",
        },
        {
          kind: "quiz",
          id: "agents02-q3",
          question: "A tool filters PEPs by status. The field is free text, and models send 'done', 'final', 'Final' and 'finished'. What fixes it at the source?",
          options: [
            "Make the field an enum of the allowed statuses.",
            "Lowercase and trim the value inside the tool.",
            "Ask the model in the system prompt to use the exact word.",
            "Add a regular expression to the description.",
          ],
          answer: 0,
          explain: "An enum rejects every other value before your code runs, so the model has to pick a real status. Cleaning the value hides the drift. A prompt rule and a description can both be ignored, and neither rejects anything.",
        },
        {
          kind: "p",
          text: "What comes back is the next thing the model reads, and it costs more than it looks.",
        },
      ],
    },
    {
      id: "s4-results",
      title: "A result is resent on every later step, so keep it small and honest",
      goal: "What should a tool send back, and what does each extra token cost?",
      blocks: [
        {
          kind: "p",
          text: "A tool's result goes back to the model as an observation, here as JSON. It stays in the history, and each later model call sends the whole history again. A large result is paid for on every call after it arrives.",
        },
        {
          kind: "p",
          text: "Take some illustrative figures. A section of 8,000 characters is about 2,000 tokens. If the run makes six more model calls, that one result costs about 12,000 tokens. The model reads most of it once and never needs it again.",
        },
        {
          kind: "p",
          text: "So `read_pep_section` cuts a section at 8,000 characters, and it says so. The result carries `truncated`, which is true when text was cut. A cut with no sign makes the model treat part of a section as the whole. Truncate loudly, in every tool.",
        },
        {
          kind: "p",
          text: "Return what the next step needs and no more. A chunk, from course 1, is one passage of a PEP. The result holds the PEP number, the title, the section name, the text and the url. It also holds `chunk_ids`, the ids of the chunks the text came from, so a later answer can cite its source.",
        },
        {
          kind: "code",
          lang: "python",
          code: `class PepSection(TypedDict):
    pep: int
    title: str
    section: str
    text: str
    url: str
    chunk_ids: list[int]
    truncated: bool`,
          caption: "The shape of a read_pep_section result. A TypedDict is a dictionary with named, typed keys. This type ships complete in your stub.",
        },
        {
          kind: "p",
          text: "The same rule holds for lists. A tool that returns many rows should also say how many matched and how to get the rest. Without that, the model reports ten rows as the whole set.",
        },
        {
          kind: "p",
          text: "An honest result also says when a value is missing. `python_feature_version` answers version questions from the PEP's own header, so the model need not answer from memory. `Python-Version` names the release that shipped the change, such as 3.8 for PEP 572. `Status` says where the PEP stands, such as Final.",
        },
        {
          kind: "p",
          text: "PEP 8 and PEP 20 guide practice and change no feature, so they have no `Python-Version` header. For those the tool returns `None`, which becomes `null` in JSON. It does not guess, and it does not return an empty string. Its description tells the model that null means the PEP has no version.",
        },
        {
          kind: "p",
          text: "Result size is a common interview question.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Interview: a tool result floods the context",
          text: "Expect a question about a tool that returns thousands of tokens. Answer first: return only the fields the next step reads, and cap the size with a flag that says a cut happened. Then add a count and a way to fetch more. Say what the cap costs, which is a second call when the model needs the rest.",
        },
        {
          kind: "quiz",
          id: "agents02-q4",
          question: "`read_pep_section` cuts a very long section at 8,000 characters. What else must the result carry?",
          options: [
            "Nothing. A shorter text is enough.",
            "A longer description of the tool.",
            "A retry counter.",
            "A truncated flag that is true when text was cut.",
          ],
          answer: 3,
          explain: "Without the flag, the model cannot tell a short section from a cut one. With it, the model knows the text stops early and can ask for a narrower section.",
        },
        {
          kind: "quiz",
          id: "agents02-q7",
          question: "PEP 8 has no `Python-Version` header. What should `python_feature_version` return for its version?",
          options: [
            "None, which becomes null in the JSON.",
            "The newest Python version.",
            "An empty string.",
            "A ToolError saying the PEP is unknown.",
          ],
          answer: 0,
          explain: "The PEP exists, so a ToolError would be wrong. A guess or an empty string would look like data. None says there is no version, and the description tells the model what null means.",
        },
        {
          kind: "p",
          text: "A result tells the model what happened when the call worked. The next section covers the call that fails.",
        },
      ],
    },
    {
      id: "s5-errors",
      title: "A failure comes back as data the model can act on, unless it is a crash",
      goal: "What should the model read when a tool fails?",
      blocks: [
        {
          kind: "p",
          text: "Tools fail. The model asks for a section that does not exist, or a database drops its connection. What the model reads next decides whether it recovers.",
        },
        {
          kind: "p",
          text: "If a tool raises an error and nothing catches it, the run ends. The user sees a failure, and the model never learns why. By default, the agent returns schema validation errors to the model and raises anything else.",
        },
        {
          kind: "p",
          text: "If the tool returns only the word Error, the model has nothing to act on. It repeats the call or guesses. A **stack trace**, the printed list of calls behind an error, is no better. It costs tokens and shows your internals.",
        },
        {
          kind: "p",
          text: "Chapter 1's `ToolError` is the better pattern. Its `error` key says what went wrong, and its `hint` key says what to try next. The model reads both as an observation and can correct its next call.",
        },
        // CHECK: LangChain 1.x create_agent returns tool schema validation errors to the model and re-raises other exceptions. Read in the installed langgraph.prebuilt.tool_node, not yet against the docs page.
        {
          kind: "code",
          lang: "json",
          code: `{
  "error": "PEP 572 has no section called 'Motivation'.",
  "hint": "Its sections are: Abstract; Rationale; Syntax and semantics; Syntax and semantics > Examples."
}`,
          caption: "What the model reads when it asks for a section PEP 572 does not have. The real list of sections is longer.",
        },
        {
          kind: "p",
          text: "The hint is the useful half. It names real values the model can pass. A hint that says to check the input costs tokens and changes nothing.",
        },
        {
          kind: "p",
          text: "There are three kinds of failure, and each needs a different answer.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "A mistake by the model, such as a wrong section name. The tool returns its own error and lists the valid values.",
            "A fault in the tool, such as a database that is down. The error says so, and the hint tells the model to retry once or answer without the tool.",
            "A crash, such as the operator, the person running the desk, pressing Control C. Do not catch it. The run must stop.",
          ],
        },
        {
          kind: "p",
          text: "Only the tool knows the valid values, so it returns the first kind itself. The `safely` decorator handles the second kind for every tool. It calls the function, and if an ordinary exception comes out, it logs the exception and returns a `ToolError` with a general hint.",
        },
        {
          kind: "p",
          text: "Python's exceptions form a tree. `Exception` is the branch for ordinary errors. `BaseException` is the root above it, and it also holds `KeyboardInterrupt`, which Control C raises. `safely` catches `Exception` and nothing wider. A `KeyboardInterrupt` passes through, and the run stops. Chapter 7 relies on this to simulate a crash.",
        },
        {
          kind: "widget",
          id: "agents02-error-replay",
          intro: "Each cell replays one fault under one tool design. The faults are a missing section, a database that is down, and the operator pressing Control C. The designs are four ways to write a tool's failure path. Replay at least six cells, then choose the design you would ship. Watch which fault breaks each design you reject.",
        },
        {
          kind: "quiz",
          id: "agents02-q5",
          question: "Why does `safely` catch `Exception` and not `BaseException`?",
          options: [
            "Because BaseException is slower to catch.",
            "Because a KeyboardInterrupt must still stop the run, and only BaseException covers it.",
            "Because Exception also covers KeyboardInterrupt.",
            "Because Python cannot catch BaseException.",
          ],
          answer: 1,
          explain: "Control C raises KeyboardInterrupt, which sits under BaseException and not under Exception. Catching only Exception turns tool faults into hints and still lets an operator, or a test, stop the run.",
        },
        {
          kind: "p",
          text: "That completes the common flaws: a vague name, an open field, overlapping tools, a catch-all tool, a big result and a bare error. Each fix removes a choice the model could get wrong.",
        },
        {
          kind: "widget",
          id: "agents02-tool-doctor",
          intro: "Each card shows a first draft of a tool for the desk. Some drafts are tools the desk does not have. For each draft, pick the fix that removes a choice the model could get wrong. A wrong pick explains itself, and you can try again.",
        },
        {
          kind: "p",
          text: "So far every fix has been in what the model reads. The next tool starts a process, and there the code must keep the description's promise.",
        },
      ],
    },
    {
      id: "s6-sandbox",
      title: "A tool that runs a process must limit what the process can touch",
      goal: "How does lint_snippet keep its promise that it never runs the code?",
      blocks: [
        {
          kind: "p",
          text: "`lint_snippet` is the desk's first tool that starts a process. A user pastes Python code, the model passes it to the tool, and the tool runs ruff over it. Its description says it never runs the code. The model cannot check that, so the code must keep the promise.",
        },
        {
          kind: "p",
          text: "The snippet came from a user, through a model. Treat it as untrusted. You do not know what it says, how long it is or how slowly it checks. So the tool limits the process before it starts.",
        },
        {
          kind: "p",
          text: "Three terms help here. **Standard input**, or stdin, is the stream a process reads its input from. A **shell** is a program that interprets a command line, so it can run more than you meant. The **environment** is the set of variables a process inherits, and it often holds API keys.",
        },
        {
          kind: "compare",
          caption: "Each risk of running a process on a pasted snippet, and the control that answers it.",
          columns: ["Risk", "Control in lint_snippet"],
          rows: [
            ["The snippet runs as code.", "ruff reads the code from standard input and never executes it."],
            ["A shell reads the command and runs extra commands.", "The command is a list of arguments, with shell set to False."],
            ["The process reads files or settings near it.", "It runs in an empty temporary folder, and `--isolated` skips config files."],
            ["The process sees your secrets.", "The environment holds only a path, a home folder and a locale, so API keys are absent."],
            ["The check never finishes.", "A time limit of 5 seconds returns a ToolError."],
            ["The snippet is huge.", "The code is cut at 20,000 characters, and the report says it was cut."],
          ],
        },
        {
          kind: "p",
          text: "These limits cap the damage. They are not a security boundary that holds against a determined attacker. A stronger boundary needs a container or a separate service. The guardrails course threat-models the whole desk.",
        },
        {
          kind: "p",
          text: "ruff prints its findings as JSON, and the tool parses that data instead of scraping text. Each finding becomes a rule code, a message, a line and a column. A syntax error is also a finding, because the bug is in the user's snippet, not in your tool.",
        },
        {
          kind: "p",
          text: "ruff exits with 0 for a clean snippet and 1 when it found something. Both are results. Any other exit code means ruff itself failed, and that is a `ToolError`.",
        },
        {
          kind: "fold",
          tone: "dyk",
          title: "Why the stdin filename",
          text: "The flag `--stdin-filename snippet.py` names the input, so each finding carries a file name and nothing is written to disk. The code reaches ruff only through the pipe.",
        },
        {
          kind: "quiz",
          id: "agents02-q6",
          question: "Which control stops the snippet's process from reading the API keys in your environment?",
          options: [
            "Setting shell to False.",
            "The time limit.",
            "Passing a minimal environment to the process.",
            "The `--isolated` flag.",
          ],
          answer: 2,
          explain: "A process inherits the environment unless you replace it. The tool passes only a path, a home folder and a locale. Shell set to False stops command injection. The time limit stops a hang. The `--isolated` flag only stops ruff reading config files.",
        },
        {
          kind: "p",
          text: "Every tool so far serves one client, the desk's own agent. The last section offers the same definitions to any client.",
        },
      ],
    },
    {
      id: "s7-mcp",
      title: "MCP gives any client the same definitions, and the desk can be that client",
      goal: "How do the same tools reach a client that knows nothing about your code?",
      blocks: [
        {
          kind: "p",
          text: "In course 1 you put AskPEP behind an MCP server. MCP, the Model Context Protocol, is a standard way for an AI client to discover and call tools on a server. The client's model reads what your agent reads: a name, a description and a schema. Lab step 5 gives that server two changes.",
        },
        {
          kind: "p",
          text: "It adds `read_pep_section`, and it makes `search_peps` return the url and the chunk id. Both tools now declare an **output schema**, the typed shape of what a tool returns. The server builds it from the return type, so `PepHit`, the result type of `search_peps`, and `PepSection` replace a loose `dict`.",
        },
        {
          kind: "p",
          text: "So an outside client knows what comes back before it calls. A `ToolError` travels like any other result. It is data, not a protocol error, so an outside client sees the same error and hint your model sees. `open_ticket` stays off the server, and a test checks that the server never lists it.",
        },
        {
          kind: "p",
          text: "Now the other side. The desk can load the server's tools as if they were its own. The `langchain[mcp]` package extra provides `MCPAdapter`. You give it a transport, which holds the server's address and the API key header. It asks the server for its tools and builds one LangChain tool for each.",
        },
        // CHECK: langchain.mcp.MCPAdapter takes a fastmcp transport, and list_tools() is a coroutine. The offline tests pass against the installed langchain 1.4.6, which marks langchain.mcp as beta. FACTS.md shows only the config dictionary form. Confirm against the current LangChain MCP docs.
        {
          kind: "fold",
          tone: "trouble",
          title: "Do not install langchain-mcp-adapters",
          text: "Older guides use `langchain-mcp-adapters`. It is archived, and it needs `mcp` below version 2. AskPEP uses `mcp` 2.3 or later, so the two cannot share an environment. The module `langchain.mcp` is still in beta, so its interface may change.",
        },
        {
          kind: "p",
          text: "MCP tools are asynchronous only. The desk's agent calls its tools synchronously, so `load_mcp_tools` wraps each tool with a sync entry point. The helper `_sync_wrapper` ships in your stub. It runs the tool in a fresh **event loop**, the scheduler for async code. When a loop is already running, it uses a worker thread instead.",
        },
        {
          kind: "compare",
          caption: "The two ways the desk can reach a tool.",
          columns: ["Question", "In-process tool", "MCP tool"],
          rows: [
            ["What does a call cost?", "A function call.", "A network round trip."],
            ["Who can call it?", "This program.", "Any MCP client."],
            ["What does it receive?", "svc, and the whole program around it.", "JSON arguments only."],
            ["How is access controlled?", "No control is needed.", "An API key header."],
          ],
        },
        {
          kind: "p",
          text: "The desk loading its own server only proves a point: a client that knows nothing about your code can use the server. In production, a function call is faster and needs no key. The adapter earns its place when the tools belong to another team or another language.",
        },
        {
          kind: "quiz",
          id: "agents02-q8",
          question: "Why does `load_mcp_tools` wrap each loaded tool with `_sync_wrapper`?",
          options: [
            "The loaded tools are too slow without it.",
            "It hides the API key from the model.",
            "It converts each tool's result to JSON.",
            "The loaded tools are async only, and the desk's agent calls its tools synchronously.",
          ],
          answer: 3,
          explain: "The adapter builds async tools. A sync agent needs a function it can call directly, so the wrapper adds one. It also handles the case where a loop is already running, by using a worker thread.",
        },
        {
          kind: "p",
          text: "So the model knows a tool by its definition, and it learns what happened from the result or the error. Each of those lands in the history, and a run of several steps piles them up. Once a run has several steps, where does it keep what it knows? Chapter 3 answers that.",
        },
      ],
    },
  ],
  lab: {
    title: "Give the desk its tools",
    goal: "Write the desk's tools in `src/askpep/agents/tools.py`, then serve them over MCP and load them back. Steps 1 to 4 and 6 start from a stub that raises `NotImplementedError(\"agents-02 step N\")`. Step 5 edits your own course 1 file. The tests run offline. One step 4 test needs Postgres and skips when no database answers.",
    minutes: 90,
    files: ["src/askpep/agents/tools.py", "src/askpep/mcp_server.py", "tests/agents/test_agents02_tools_for_models.py"],
    steps: [
      {
        title: "Read one section of one PEP",
        text: "Write `read_pep_section`. The helpers `_doc_chunks`, `section_name`, `_normal` and `corpus_hint` ship complete. A name matches the headings after the title, joined by \" > \", or the last heading alone, ignoring case. A section holds its subsections. An unknown PEP or section is a `ToolError` with a useful hint. Cut the text at `SECTION_MAX_CHARS` and set `truncated`.",
        code: `# src/askpep/agents/tools.py
def read_pep_section(svc: Services, pep: int, section: str) -> PepSection | ToolError:
    # your turn:
    # 1. chunks = _doc_chunks(svc, pep). If it is empty, return
    #    ToolError(error=f"PEP {pep} is not in the corpus.", hint=corpus_hint()).
    # 2. want = _normal(section). Walk the chunks. A chunk's trail is heading_path[1:], the headings
    #    after the title. It matches when want equals _normal(" > ".join(trail)) or _normal(trail[-1]).
    #    An empty want matches a chunk with no trail, which is the text before the first heading.
    #    Keep the first match's heading_path as path.
    # 3. No match: list the real names, each section_name(c.heading_path), once each and in order,
    #    skipping the title-only path. Return a ToolError whose hint is "Its sections are: "
    #    followed by the names joined with "; ".
    # 4. members = the chunks whose heading_path starts with path. That keeps the subsections.
    #    When path is only the title, keep just the chunks directly under it.
    #    Join their text with a blank line, then cut it at SECTION_MAX_CHARS.
    # 5. chunk_ids holds the ids of the chunks that start before the cut. Skip a chunk_id of None.
    # 6. Return PepSection. title and url come from the first member, url being its source.
    ...`,
        test: "uv run pytest tests/agents -k agents02_s1",
      },
      {
        title: "Turn failures into data",
        text: "Write `safely`. It wraps a function, logs an ordinary exception and returns a `ToolError`. A `KeyboardInterrupt` must pass through. Then put `@safely` above `search_peps` and `read_pep_section`, the two tools you have already written. Steps 3 and 4 add it to their own tools, and chapter 7 adds it to `open_ticket`. Do not decorate a stub. `safely` would turn its `NotImplementedError` into a `ToolError`, and a missing step would look like a pass.",
        code: `# src/askpep/agents/tools.py
def safely[**P](fn: Callable[P, Any]) -> Callable[P, Any]:
    # your turn:
    # 1. Define wrapper(*args: P.args, **kwargs: P.kwargs) -> Any, and decorate it with
    #    functools.wraps(fn), so the name and the docstring survive. Import functools at the top.
    # 2. In wrapper, try to return fn(*args, **kwargs).
    # 3. except Exception as exc: call log.warning("tool_error", extra={"tool": fn.__name__, "error": repr(exc)}),
    #    then return a ToolError. Its error is f"{fn.__name__} failed with {type(exc).__name__}: {exc}".
    #    Its hint is "This is a fault in the tool, not your arguments. Try once more, or answer without it."
    # 4. Return wrapper.
    ...`,
        test: "uv run pytest tests/agents -k agents02_s2",
      },
      {
        title: "Lint a snippet with no shell",
        text: "Write `lint_snippet`, and put `@safely` above it. `settings` defaults to `get_settings()` and holds `lint_timeout_seconds` and `lint_max_chars` from chapter 1. Run ruff through `sys.executable`, with the code on stdin. Exit codes 0 and 1 are results. The tests spy on `subprocess.run`. They check the limits: no shell, a timeout, a clean environment and an empty working folder.",
        code: `# src/askpep/agents/tools.py
@safely
def lint_snippet(code: str, *, settings: Settings | None = None) -> LintReport | ToolError:
    # your turn:
    # 1. s = settings or get_settings(). Import subprocess, sys, tempfile and get_settings.
    # 2. A blank snippet returns ToolError(error="The snippet is empty.", hint="Pass the Python source you want checked.").
    # 3. truncated = len(code) > s.lint_max_chars. Then cut the code to that length.
    # 4. The command is a list: [sys.executable, "-m", "ruff", "check", "--isolated", "--no-cache",
    #    "--output-format", "json", "--stdin-filename", "snippet.py", "-"].
    # 5. Inside "with tempfile.TemporaryDirectory() as cwd:", call subprocess.run with input=code,
    #    capture_output=True, text=True, cwd=cwd, shell=False, timeout=s.lint_timeout_seconds
    #    and env={"PATH": "/usr/bin:/bin", "HOME": cwd, "LC_ALL": "C.UTF-8"}.
    #    Catch subprocess.TimeoutExpired and return a ToolError that says how long it waited.
    # 6. A return code other than 0 or 1 is a ToolError that quotes proc.stderr.
    # 7. Parse proc.stdout as JSON. Each item has code, message and location with row and column.
    #    A syntax error has no code, so use the rule name "syntax-error".
    #    Return LintReport(ok=not findings, findings=findings, truncated=truncated).
    ...`,
        test: "uv run pytest tests/agents -k agents02_s3",
      },
      {
        title: "Read the Python version from the header",
        text: "Write `python_feature_version`, and put `@safely` above it. With a pool, select the row from `documents`. Without one, parse `pep-NNNN.rst` from `svc.settings.corpus_dir` with `parse_pep` from `askpep.ingest`. A missing PEP is a `ToolError` with `corpus_hint()`. One test needs Postgres. It skips when no database answers.",
        code: `# src/askpep/agents/tools.py
@safely
def python_feature_version(svc: Services, pep: int) -> FeatureVersion | ToolError:
    # your turn:
    # 1. With svc.pool, run the SELECT inside "with svc.pool.connection() as conn:". Rows are dictionaries.
    #    Keep (title, source, headers) as found, or None when there is no row.
    # 2. Without a pool, path = Path(svc.settings.corpus_dir) / f"pep-{pep:04d}.rst". If the file exists,
    #    doc = parse_pep(pep, path.read_text(encoding="utf-8")) and found = (doc.title, doc.source, doc.headers).
    #    Import Path and parse_pep.
    # 3. If found is None, return ToolError(error=f"PEP {pep} is not in the corpus.", hint=corpus_hint()).
    # 4. Return FeatureVersion. python_version is headers.get("Python-Version") or None, so a blank
    #    header is None too. status is headers.get("Status", ""). url is the source.
    ...`,
        test: "uv run pytest tests/agents -k agents02_s4",
      },
      {
        title: "Serve the new tools over MCP",
        text: "Edit `build_mcp` in your own `src/askpep/mcp_server.py`. Make `search_peps` call the desk's function and return `list[PepHit] | ToolError`. Add `read_pep_section` the same way. Leave `ask_peps` alone. Do not add `open_ticket`, because a test fails if the server offers it. The typed returns give each tool an output schema.",
        code: `# src/askpep/mcp_server.py
from askpep.agents import tools as desk_tools
from askpep.agents.tools import PepHit, PepSection, ToolError


def build_mcp(svc: Services) -> MCPServer:
    # Keep your RAG course MCPServer line and your ask_peps tool as they are.

    @mcp.tool()
    def search_peps(query: str, k: int = 6) -> list[PepHit] | ToolError:
        """Hybrid search over the PEPs. Returns the top k chunks with their PEP number, heading and url."""
        # your turn: return desk_tools.search_peps(svc, query, k, route="mcp.search").
        # The desk's function already returns the url and the chunk id.
        ...

    @mcp.tool()
    def read_pep_section(pep: int, section: str) -> PepSection | ToolError:
        """Read one whole section of one PEP, such as the Rationale of PEP 572."""
        # your turn: return desk_tools.read_pep_section(svc, pep, section).
        ...`,
        test: "uv run pytest tests/agents -k agents02_s5",
      },
      {
        title: "Load the server's tools into the desk",
        text: "Write `load_mcp_tools`. `_sync_wrapper` ships complete. Import `StreamableHttpTransport` and `MCPAdapter` inside the function, so importing `tools.py` stays cheap. `list_tools()` is a coroutine, so run it with `asyncio.run`. The test starts your API on a free local port with the key `secret`. A wrong key must raise. Then compare your `tools.py` with `capstone/src/askpep/agents/tools.py`.",
        code: `# src/askpep/agents/tools.py
def load_mcp_tools(url: str, api_key: str) -> list[BaseTool]:
    # your turn:
    # 1. Import StreamableHttpTransport from fastmcp.client.transports, and MCPAdapter from langchain.mcp.
    # 2. transport = StreamableHttpTransport(url, headers={"X-API-Key": api_key}).
    # 3. adapter = MCPAdapter(transport).
    # 4. tools = asyncio.run(adapter.list_tools()). A bad key makes this raise, and it should.
    # 5. Return [_sync_wrapper(t) for t in tools].
    ...`,
        test: "uv run pytest tests/agents -k agents02_s6",
      },
    ],
    verify: "uv run pytest tests/agents -k agents02",
  },
  recap: [
    "A model knows a tool only by its tool definition: the name, the description and the schema.",
    "A description says what the tool does, when to call it, what comes back and what it never does.",
    "A schema should leave nothing to invent, and code enforces every limit the description states.",
    "A result is resent on every later step, so keep it small, flag any cut and return null for a missing value.",
    "A failure comes back as a ToolError with a hint. Catch Exception only, so a crash still stops the run.",
    "A tool that runs a process needs no shell, a clean environment, an empty folder, a time limit and a size cap.",
    "MCP serves the same definitions to any client, and the desk loads them back through a sync entry point.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In tools for models I learned that a model sees only a tool's name, description and schema. So I write those for a reader who cannot ask questions, return failures as data with a hint, and limit any process a tool starts. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["agents-q02", "agents-q15", "agents-q16"],
};

export default chapter;
