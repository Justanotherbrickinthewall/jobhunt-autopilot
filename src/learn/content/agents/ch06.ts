import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "agents-06-budgets-and-stopping",
  course: "agents",
  number: 6,
  title: "Every tool loop needs a budget the model can't argue past",
  tagline: "What stops an agent that keeps calling tools and never finishes? Your code does, and the stop says why.",
  minutes: 45,
  objectives: [
    "Explain why code, and not the model, must end a run, and name the counters the desk already keeps.",
    "Build `Budget` from settings, and defend each default from measured runs.",
    "Write `detect_loop` to catch a repeated call, and say what it can't catch.",
    "Write `check_budget`, and explain why it tests the limits in a fixed order.",
    "Add `BudgetMiddleware` to every desk agent, so a stopped run returns a reason and a plain answer.",
    "Set the recursion limit above the step budget, and map `GraphRecursionError` to the stop reason `recursion_limit`.",
  ],
  sections: [
    {
      id: "s1-code-ends-the-run",
      title: "The model will not always stop, so code has to end the run",
      goal: "Why can't the model be trusted to stop, and what does the desk already count?",
      blocks: [
        {
          kind: "p",
          text: "Chapter 5 ended on a question. What stops an agent that keeps calling tools and never finishes? Every agent in the desk runs the tool loop from chapter 1. The model picks a tool, the tool runs, and the model reads the result and picks again. The loop ends only when the model answers in plain text.",
        },
        {
          kind: "p",
          text: "The model can fail to take that exit. Suppose the researcher searches for the walrus operator, finds nothing new, and searches again with one word changed. It can do that all day. A prompt line such as \"stop after five searches\" is a request, and the model is free to ignore it.",
        },
        {
          kind: "p",
          text: "A run that never ends costs money and time. It costs more than it looks, because each model call resends the whole history. The history grows with every step, so the tenth call can send ten times what the first one sent.",
        },
        {
          kind: "fold",
          tone: "hood",
          title: "Why ten calls cost far more than ten times one call",
          text: "Say each step adds 500 tokens to the history. Call one sends 500 tokens, call two sends 1,000, and call ten sends 5,000. Added up, ten calls send 27,500 tokens. Doubling the number of steps roughly quadruples the bill. These figures are illustrative, and the shape is real.",
        },
        {
          kind: "p",
          text: "A **budget** is a limit that code checks before every model call. The model doesn't choose it and can't argue with it. When the run reaches a limit, the code ends the run, whatever the model wanted to do next. A prompt rule has no such property.",
        },
        {
          kind: "p",
          text: "A step, from chapter 1, is one model call. The desk state from chapter 3 already keeps the numbers a budget needs.",
        },
        {
          kind: "list",
          items: [
            "`steps` counts model calls across the whole desk, triage included.",
            "`tokens_in` and `tokens_out` count the tokens sent to the model and the tokens it wrote.",
            "`started_at` holds the time the question arrived.",
          ],
        },
        {
          kind: "p",
          text: "When a run stops early, the state's `stop_reason` says why. Each reason also has its own one-sentence message for the user.",
        },
        {
          kind: "list",
          items: [
            "A `step_budget` stop means the run used all its model calls.",
            "A `token_budget` stop means it used all its tokens.",
            "A `time_budget` stop means it ran out of time.",
            "A `loop` stop means it repeated the same tool call.",
            "A `recursion_limit` stop means LangGraph's own safety cap ended the run. Section 6 explains it.",
          ],
        },
        {
          kind: "quiz",
          id: "agents06-q1",
          question: "The researcher's prompt says to stop after five searches. A run makes nine. What is the right fix?",
          options: [
            "Rewrite the prompt with stronger wording and capital letters.",
            "Count steps in code, and end the run when the count reaches the limit.",
            "Lower the model's temperature so it follows instructions.",
            "Switch to a larger model that follows instructions better.",
          ],
          answer: 1,
          explain: "A prompt is more input for the same model, so it can be ignored. A counter in code is not input to the model at all. The model has no way to argue past it, and that is what makes it a budget.",
        },
        {
          kind: "p",
          text: "A run that ends normally has the reason `done`, or `refused` when the desk declined to answer. This chapter adds the five above. The first four are limits you set, so the next question is what numbers to give them.",
        },
      ],
    },
    {
      id: "s2-budget-object",
      title: "Four numbers in one frozen object keep every limit in plain sight",
      goal: "Where do the four limits live, and how do you choose their numbers?",
      blocks: [
        {
          kind: "p",
          text: "`Budget` is a **frozen dataclass**: a dataclass whose fields can't change after it's built. So a run can't loosen its own limits. The four fields are `max_steps`, `max_tokens`, `max_seconds` and `loop_repeats`.",
        },
        {
          kind: "p",
          text: "The numbers come from `Settings`, so an environment variable changes a limit with no code change. The class method `from_settings` reads four settings and builds the object. Lab step 1 writes it.",
        },
        {
          kind: "compare",
          caption: "The four limits with their settings and defaults. The last column says what each one protects.",
          columns: ["Limit", "Setting", "Default", "What it protects"],
          rows: [
            ["`max_steps`", "`DESK_MAX_STEPS`", "12", "Cost and patience, against an agent that wanders."],
            ["`max_tokens`", "`DESK_MAX_TOKENS`", "20,000", "The bill, which grows as the history grows."],
            ["`max_seconds`", "`DESK_MAX_SECONDS`", "60", "The user's wait."],
            ["`loop_repeats`", "`DESK_LOOP_REPEATS`", "3", "A run that repeats one tool call."],
          ],
        },
        {
          kind: "p",
          text: "The first three are the step budget, the token budget and the time budget. The fourth belongs to the check in section 3.",
        },
        {
          kind: "p",
          text: "Why 12 steps? The shortest desk run uses three model calls: triage, one search and the answer. Twelve leaves room for a hard question with several searches, and it stops a wandering one early. Treat it as a starting point and not as a result.",
        },
        {
          kind: "p",
          text: "Tune each number from data. Run the golden set through the desk and read the 95th percentile of steps, tokens and seconds, with the `percentile` function from chapter 5. Set the limit a little above it. A limit below the 95th percentile cuts off about one good run in twenty.",
        },
        {
          kind: "p",
          text: "That is the trade-off. A tight budget cuts off hard but legitimate questions. A loose one lets a stuck run spend more before it stops. Watch the share of runs that end on a budget. A rising share means a limit is wrong or something upstream has regressed.",
        },
        {
          kind: "p",
          text: "Steps, tokens and time are plain counts. The fourth limit needs more care, because code has to recognise a run that is stuck.",
        },
      ],
    },
    {
      id: "s3-loop-detection",
      title: "A repeated-call check compares tool calls, and only the current question counts",
      goal: "How can code tell that a run is stuck, and what can't it tell?",
      blocks: [
        {
          kind: "p",
          text: "A **repeated call** is the same tool called with the same arguments again and again. The tool returns the same result each time, so nothing changes. The model asks again anyway.",
        },
        {
          kind: "p",
          text: "`detect_loop(messages, repeats)` is the repeated-call check. It returns True when the last `repeats` tool calls are identical, and the desk uses three. It never reads the model's text. It reads only the tool calls on the AI messages. The code keeps the word loop in the function's name and in the stop reason.",
        },
        {
          kind: "p",
          text: "To compare two calls, it turns each into a pair: the tool name, and the arguments as JSON with sorted keys. Sorting means `search_peps(query=\"walrus\", k=5)` and `search_peps(k=5, query=\"walrus\")` match.",
        },
        {
          kind: "p",
          text: "Three rules keep it from firing wrongly.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Only messages after the last human message count. Asking the same question twice in one thread isn't a repeated call.",
            "A message can hold several tool calls, because a model may ask for tools in parallel. Each call counts.",
            "A `repeats` below 1 turns the check off, and it returns False.",
          ],
        },
        {
          kind: "widget",
          id: "agents06-loop-spotter",
          intro: "Each card shows the tool calls the model made while answering one question, in order. Decide whether `detect_loop` returns True with `repeats` set to 3. Then read which calls it compared. The highlighted calls are the last three that count.",
        },
        {
          kind: "p",
          text: "The check matches exact calls only. A model that searches for walrus, then walrus operator, then walrus operator PEP makes three different calls, and the check stays quiet. The step budget catches that run, because it counts calls whatever they say. That is why the desk has both.",
        },
        {
          kind: "quiz",
          id: "agents06-q2",
          question: "The researcher searches \"walrus\", then \"walrus operator\", then \"walrus operator PEP\", and keeps going. With `loop_repeats` at 3, what stops it?",
          options: [
            "The repeated-call check, because the three queries are similar.",
            "The step budget, because it counts model calls whatever they say.",
            "Nothing, because the model is making progress.",
            "The token budget, because it always trips first.",
          ],
          answer: 1,
          explain: "The repeated-call check compares exact calls, and these three differ. The step budget counts every model call, so it ends the run at 12 steps. A token or time budget could also end it, but nothing says which would come first.",
        },
        {
          kind: "p",
          text: "The desk now has four limits, and a run can reach two of them at once. So which one does the user hear about?",
        },
      ],
    },
    {
      id: "s4-check-budget",
      title: "One function checks every limit in a fixed order and names the first one reached",
      goal: "When a run reaches several limits at once, which reason does it report?",
      blocks: [
        {
          kind: "p",
          text: "`check_budget(state, budget, now)` is a plain function. It reads the counters in the state and returns a stop reason, or `None` when the run may go on. It changes nothing, so a test can call it with a dict.",
        },
        {
          kind: "p",
          text: "Several limits can be reached at once, so the order decides what the user reads. The order is steps, then tokens, then time, then repeated calls. The first three compare a number the state already holds. The repeated-call check scans the messages, so it goes last.",
        },
        {
          kind: "p",
          text: "Steps and tokens stop at the limit and not past it. At 12 steps used, the run has made 12 calls and may not make a 13th. Tokens are `tokens_in` plus `tokens_out`.",
        },
        {
          kind: "p",
          text: "Time runs only when `started_at` is set. With no start time there is no time limit, which keeps a test from needing a clock. The current time arrives as the `now` argument, so the function never reads a clock itself.",
        },
        {
          kind: "widget",
          id: "agents06-budget-check",
          intro: "Each card is one run with its counters, set against the default budget. Predict what `check_budget` returns. Some runs reach two limits at once, so the order matters. After you answer, the card marks which limits were reached and which one the function returned.",
        },
        {
          kind: "p",
          text: "This topic comes up in interviews, usually as a question about agents that never stop.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "How do you stop agents repeating searches or running forever",
          text: "Interviewers want two layers, both enforced in code. The first is budgets for steps, tokens and time. The second is a check for repeated calls. Say what the user gets when a limit trips. Name the metric you watch, the share of runs that end on a budget. Add the trade-off: tight limits cut off hard questions.",
        },
        {
          kind: "quiz",
          id: "agents06-q3",
          question: "A run has used 21,500 tokens and 72 seconds, and its time limit is 60 seconds. It is inside its step limit. What does `check_budget` return?",
          options: ["`step_budget`", "`token_budget`", "`time_budget`", "`loop`"],
          answer: 1,
          explain: "Both the token and time limits are reached. Tokens are tested before time, so the function returns `token_budget`. The order is a design choice, and the tests pin it so it never changes by accident.",
        },
        {
          kind: "p",
          text: "`check_budget` only returns a reason. Something has to call it before each model call and act on the answer.",
        },
      ],
    },
    {
      id: "s5-middleware",
      title: "Middleware stops the run before the model call that would break the budget",
      goal: "How does the budget stop a desk agent, and what does the user get back?",
      blocks: [
        {
          kind: "p",
          text: "Middleware, from chapter 1, is code that runs around an agent's model calls. `UsageMiddleware` is the one the desk already has. Middleware runs at fixed points inside the agent's tool loop, and each point is a hook.",
        },
        {
          kind: "p",
          text: "`before_model` runs before every model call, and `after_model` runs after it. `before_agent` and `after_agent` run once, at the start and the end of the agent's run. A hook receives the agent's state. It may return a dict of changes to that state, or `None` to change nothing.",
        },
        {
          kind: "p",
          text: "Every desk agent gets its middleware from `desk_middleware`, a function in `factory.py`. It returns a list, and your stub's list holds one item, `UsageMiddleware`.",
        },
        {
          kind: "p",
          text: "`UsageMiddleware` ships complete, and it fills the counters. Its `after_model` hook adds one to `steps` and adds the token counts from the reply's usage data. The counters use the adding reducer from chapter 3, so a hook returns the amount to add and not a new total.",
        },
        {
          kind: "p",
          text: "Chapter 4 showed one wrinkle. A subgraph starts with the parent's counters, so `before_agent` records them under `entry` and `after_agent` returns their negative. The parent then receives only what the agent added.",
        },
        {
          kind: "quiz",
          id: "agents06-q4",
          question: "Why does `UsageMiddleware.after_agent` return the negative of the counters it recorded on entry?",
          options: [
            "To reset the counters to zero for the next question.",
            "A subgraph starts with the parent's counters, and the parent adds what it gets back, so the entry values must be taken off.",
            "To charge the agent a penalty for finishing late.",
            "To free memory before the checkpointer saves the state.",
          ],
          answer: 1,
          explain: "The adding reducer sums what each agent returns. Without the subtraction, the parent's own counts would come back inside the total and be counted a second time. The next question resets the counters elsewhere, in the run's input.",
        },
        {
          kind: "p",
          text: "`BudgetMiddleware` has one hook, `before_model`. It calls `check_budget` with the state and a clock. If the answer is `None`, the hook returns `None` and the model call goes ahead.",
        },
        {
          kind: "p",
          text: "If the answer is a reason, the hook does three things. It logs a `budget_stop` warning. It returns `jump_to` set to `\"end\"`, which ends the agent's tool loop at once. And it returns the `stop_reason` and one AI message, which holds the text for that reason from the `STOP_TEXT` table. The model is never called.",
        },
        {
          kind: "p",
          text: "A hook may jump only where it says it can. The decorator `@hook_config(can_jump_to=[\"end\"])` on `before_model` declares that this hook may jump to the end.",
        },
        {
          kind: "p",
          text: "The stop message is the run's answer. It names the reason in plain words, such as: I stopped before finishing, because I used all the steps this run is allowed. The reason also sits in `stop_reason`, so a caller can branch on it without parsing text.",
        },
        {
          kind: "p",
          text: "`run_desk` marks any run whose reason is not `done` or `refused` as `stopped`. A stopped run has no citations, because the stop message cites nothing.",
        },
        {
          kind: "p",
          text: "A budget covers one question and not the whole thread. Chapter 4's `_turn_input` resets `steps`, `tokens_in` and `tokens_out` for each question through `Overwrite`. That LangGraph wrapper replaces a reducer's total instead of adding to it. `_turn_input` also sets `started_at` again.",
        },
        {
          kind: "fold",
          tone: "trouble",
          title: "A budget checks between calls, so it has two gaps",
          text: "The check runs before a model call starts. It cannot interrupt a call already running, so one call that hangs for two minutes passes a 60 second budget unseen. Tokens have a smaller gap. Usage is counted after a call, so a run can end one call past its limit. Add a timeout to every call too.",
        },
        {
          kind: "fold",
          tone: "industry",
          title: "Some teams let the model write one last answer",
          text: "The desk's stop message is a fixed sentence, so it cannot misreport what the run found. A richer design keeps one last model call back, with tools turned off, to write a short account of the findings. It reads better. The price is one more call to budget for, and a model that may claim more than it found.",
        },
        {
          kind: "p",
          text: "The budget runs inside each agent, before its model calls. A run that never calls a model slips past it, so the graph needs a cap of its own.",
        },
      ],
    },
    {
      id: "s6-recursion-limit",
      title: "The recursion limit is a backstop under the budget, and it needs its own clean stop",
      goal: "What stops a run the budget can't see, and how does that stop stay clean?",
      blocks: [
        {
          kind: "p",
          text: "Recall from chapter 3 that LangGraph runs a graph in rounds. A **graph step** is one round. Inside a desk agent the nodes run one at a time, so there a graph step is one node run.",
        },
        {
          kind: "p",
          text: "The **recursion limit** is LangGraph's cap on graph steps in one run, which raises an error when it's hit. The error is `GraphRecursionError`.",
        },
        {
          kind: "p",
          text: "The cap exists for graphs of every kind. A routing bug can send two nodes back and forth forever, and neither node calls a model. The budget hook never runs in that case. Only the recursion limit can stop it.",
        },
        {
          kind: "p",
          text: "A graph step is not a model call. Every middleware hook is a node of its own. One tool-calling cycle in a desk agent runs four nodes: the budget hook, the model, the usage hook and the tools. Twelve model calls need about 50 graph steps.",
        },
        {
          kind: "p",
          text: "So the desk sets `DESK_RECURSION_LIMIT` to 100. The step budget reaches its limit first, and the user reads a clear reason. Lower the limit to 30 and LangGraph's error fires first, after seven model calls, with a vaguer message. Each middleware you add later puts more nodes in every cycle, which raises the count.",
        },
        {
          kind: "widget",
          id: "agents06-limit-race",
          intro: "Each card sets a step budget and a recursion limit for a run that never finishes. Assume one model call costs four graph steps. Predict which limit ends the run. After you answer, the card shows both limits as bars and the message the user reads.",
        },
        {
          kind: "p",
          text: "`run_desk` needs its own stop for the case where LangGraph's error wins. It catches `GraphRecursionError`. It then reads the last saved state with `_checkpoint_values`, sets `stop_reason` to `recursion_limit` and builds the result as usual. When the state holds no answer, `result_from_state` fills one in from `RECURSION_TEXT`.",
        },
        {
          kind: "p",
          text: "A graph with no checkpointer saves no state, and `_checkpoint_values` then returns an empty one. The run still ends cleanly with the recursion message. Chapter 7 covers checkpointers in full.",
        },
        {
          kind: "p",
          text: "The saved state is the parent graph's last one. A researcher that hits the limit mid-run is a single node in the parent, so the parent saved none of its work. The counters in the result can read as low as triage's one step. The route is still right, because triage saved it.",
        },
        {
          kind: "compare",
          caption: "The five early stops in one place. The first four come from the budget middleware, and the last comes from `run_desk`.",
          columns: ["Stop reason", "Who ends the run", "It fires when", "What the user reads"],
          rows: [
            ["`step_budget`", "`BudgetMiddleware`, before a model call", "Model calls used reach 12.", "That the run used all its steps."],
            ["`token_budget`", "`BudgetMiddleware`, before a model call", "Tokens in and out reach 20,000, possibly by one call over.", "That the run used all its tokens."],
            ["`time_budget`", "`BudgetMiddleware`, before a model call", "60 seconds have passed since the question arrived.", "That the run took too long."],
            ["`loop`", "`BudgetMiddleware`, before a model call", "The last three tool calls are identical.", "That the run repeated one tool call."],
            ["`recursion_limit`", "`run_desk`, after LangGraph raises an error", "The run reaches 100 graph steps.", "That the run went through too many graph steps."],
          ],
        },
        // CHECK: the expect is real output of this command, run on 8 November 2026 in a scratch copy of the reference code, after the fixture store was built from tests/fixtures as in chapter 5's story step.
        {
          kind: "step",
          id: "agents06-s01",
          title: "Run the desk offline with a two-step budget",
          text: "Do this after lab step 5, in your own workspace. Build the fixture store first, as in chapter 5's story step that loads the five fixture PEPs. The desk runs on the fake desk model from chapter 5's lab step 6. The command gives it a budget of two steps. Your thread id and milliseconds will differ.",
          lang: "bash",
          code: `PROVIDERS=fake EMBED_DIM=64 STORE=local LOCAL_STORE_PATH=data/fixture-store.json CHECKPOINTER=memory DESK_MAX_STEPS=2 uv run askpep desk ask "Why was the walrus operator controversial?" 2>/dev/null`,
          expect: "I stopped before finishing, because I used all the steps this run is allowed.\n\nthread 6e3f4f7239064f4287fb1389b7f602d3  status stopped  stop step_budget  route researcher\nsteps 2  tokens 353+2  25 ms\ntrajectory: researcher:search_peps, researcher:answer",
        },
        {
          kind: "p",
          text: "Triage made one model call, and the researcher made one more, which asked for a search. Before the researcher's next call, the budget hook saw two steps used and ended the run. The stop message became the answer, so the trajectory ends with it.",
        },
        {
          kind: "p",
          text: "Interviewers often ask what the user gets when a budget trips halfway through.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Your agent hits its budget halfway through. What does the user get",
          text: "Answer first: the run ends cleanly. The user gets a plain message that says why, and the caller gets a typed reason. Say what you log, which is the reason and the counters at that moment. Then name the trade-off. A fixed message is safe but thin, and a model-written closing answer is richer but can overclaim.",
        },
        {
          kind: "quiz",
          id: "agents06-q5",
          question: "You set `DESK_RECURSION_LIMIT` to 30 and leave `DESK_MAX_STEPS` at 12. A researcher searches a different query every time and never answers. What happens?",
          options: [
            "The step budget ends the run at 12 steps with `step_budget`.",
            "The repeated-call check fires after three searches.",
            "LangGraph raises `GraphRecursionError` first, and `run_desk` returns `recursion_limit`.",
            "The run continues until the time budget ends it.",
          ],
          answer: 2,
          explain: "Thirty graph steps allow about seven model calls, and the budget needs 12. The limit runs out first. The repeated-call check stays quiet because every query differs. The user still gets a clean stop, but with the vaguer message and low counters.",
        },
        {
          kind: "p",
          text: "Every stop in this chapter ends a run cleanly, and nothing the run did needs undoing. That holds only while every tool just reads. Chapter 7 gives the writer a tool that files a ticket. If a run stops after doing something real, what happens on the retry? Chapter 7 answers that.",
        },
      ],
    },
  ],
  lab: {
    title: "Build the budget and wire it into the desk",
    goal: "Write the budget in `src/askpep/agents/budget.py`, add it to `desk_middleware` in `factory.py`, and teach `run_desk` in `graph.py` to stop on the recursion limit. Lab steps 1 to 4 start from stubs that raise `NotImplementedError(\"agents-06 step N\")`. Lab step 5 edits `desk_middleware`, which ships with one item. Lab step 6 edits the `run_desk` you wrote in chapter 4. The tests script the models and use fakes, so nothing touches the network. They also need your code from chapters 1 to 4. A failure that names another chapter's step means that step is not done yet.",
    minutes: 50,
    files: [
      "src/askpep/agents/budget.py",
      "src/askpep/agents/factory.py",
      "src/askpep/agents/graph.py",
      "tests/agents/test_agents06_budgets_and_stopping.py",
    ],
    steps: [
      {
        title: "Build the budget from settings",
        text: "Replace `Budget.from_settings`, which raises `agents-06 step 1`. The dataclass and the `STOP_TEXT` table are already in your stub. Read the four limits from `desk_max_steps`, `desk_max_tokens`, `desk_max_seconds` and `desk_loop_repeats`, in the order of the fields. With the default settings the result equals `Budget(12, 20000, 60, 3)`.",
        code: `# src/askpep/agents/budget.py
@dataclass(frozen=True)
class Budget:
    max_steps: int
    max_tokens: int
    max_seconds: float
    loop_repeats: int

    @classmethod
    def from_settings(cls, s: Settings) -> "Budget":
        # your turn: return cls(...) with the four desk_* settings, in the order of the fields above.
        ...`,
        test: "uv run pytest tests/agents -k agents06_s1",
      },
      {
        title: "Detect a repeated call",
        text: "Replace `detect_loop`, which raises `agents-06 step 2`. Find the last `HumanMessage` and look only at the messages after it. Collect every tool call on the `AIMessage` objects there. Compare each call as the pair of its name and `json.dumps(args, sort_keys=True)`. Return True when there are at least `repeats` calls and the last `repeats` of them are one pair. A `repeats` below 1 returns False. Add the imports your stub lacks: `json`, `AIMessage` and `HumanMessage`.",
        code: `# src/askpep/agents/budget.py
def detect_loop(messages: Sequence[AnyMessage], repeats: int) -> bool:
    # your turn:
    # 1. Return False at once when repeats is below 1.
    # 2. Find the index of the last HumanMessage, or -1 when there is none. Keep the messages after it.
    # 3. For each AIMessage there, add (call["name"], json.dumps(call["args"], sort_keys=True))
    #    to a list, for every call in message.tool_calls.
    # 4. True when the list has at least repeats pairs and its last repeats pairs are all the same.
    ...`,
        test: "uv run pytest tests/agents -k agents06_s2",
      },
      {
        title: "Check the budget in order",
        text: "Replace `check_budget`, which raises `agents-06 step 3`. Test the limits in this order and return the first reason that applies: steps, then tokens, then time, then repeated calls. Steps and tokens apply when the count reaches the limit. Time applies only when `started_at` is in the state. Use `state.get` with a default, because an empty dict is a valid state and returns `None`.",
        code: `# src/askpep/agents/budget.py
def check_budget(state: DeskState, budget: Budget, now: float) -> StopReason | None:
    # your turn, in this order. Return the first that applies:
    # 1. "step_budget" when state steps reach budget.max_steps.
    # 2. "token_budget" when tokens_in plus tokens_out reach budget.max_tokens.
    # 3. "time_budget" when started_at is set and now minus started_at reaches budget.max_seconds.
    # 4. "loop" when detect_loop says so for state messages and budget.loop_repeats.
    # Otherwise return None.
    ...`,
        test: "uv run pytest tests/agents -k agents06_s3",
      },
      {
        title: "Stop before the model call",
        text: "Replace `BudgetMiddleware.__init__` and `before_model`, which raise `agents-06 step 4`. Keep the two arguments as `self.budget` and `self.clock`. The clock defaults to `time.time`, so a test can pass its own. In `before_model`, call `check_budget` with the state, the budget and the clock reading. Return `None` when it gives `None`. Otherwise log a `budget_stop` warning with the reason and the steps. Return `jump_to`, `stop_reason` and one `AIMessage`. The message holds the reason's `STOP_TEXT`. Name it for the agent in the state's `active_agent` key, or for triage when that key is unset. Add `AIMessage` to your imports.",
        code: `# src/askpep/agents/budget.py
class BudgetMiddleware(AgentMiddleware):
    state_schema = DeskAgentState

    def __init__(self, budget: Budget, clock: Callable[[], float] = time.time):
        # your turn: call super().__init__(), then keep both arguments as self.budget and self.clock.
        ...

    @hook_config(can_jump_to=["end"])
    def before_model(self, state: Any, runtime: Any) -> dict[str, Any] | None:
        # your turn:
        # 1. reason = check_budget(state, self.budget, self.clock()). Return None when it is None.
        # 2. log.warning("budget_stop", extra={"stop_reason": reason, "steps": state.get("steps", 0)})
        # 3. Build an AIMessage with content STOP_TEXT[reason] and name state.get("active_agent", "triage").
        # 4. Return {"jump_to": "end", "stop_reason": reason, "messages": [that message]}.
        ...`,
        test: "uv run pytest tests/agents -k agents06_s4",
      },
      {
        title: "Give every agent the budget",
        text: "Edit `desk_middleware` in `factory.py`. It returns `[UsageMiddleware()]` today. Add `BudgetMiddleware(Budget.from_settings(svc.settings))` after it, and import `Budget` and `BudgetMiddleware` from `askpep.agents.budget`. Keep the usage middleware first. These tests run whole desk graphs, so they use your chapter 4 graph. When they pass, run the offline check at the end of section 6.",
        code: `# src/askpep/agents/factory.py
from askpep.agents.budget import Budget, BudgetMiddleware


def desk_middleware(svc: Services) -> list[AgentMiddleware]:
    # your turn: return the usage middleware first, then a BudgetMiddleware built from svc.settings.
    # Later chapters add more items after these two.
    ...`,
        test: "uv run pytest tests/agents -k agents06_s5",
      },
      {
        title: "Stop on the recursion limit",
        text: "Open your `run_desk` in `graph.py`. Wrap the call to `graph.invoke` in `try`, and catch `GraphRecursionError` from `langgraph.errors`. In the handler, take the saved state from `_checkpoint_values(graph, config)` and set `stop_reason` to `\"recursion_limit\"`. Build the result with `result_from_state` on both paths. The reference code moves the invoke into a helper named `_run`, because chapter 7 needs the same handling in a second function. You may do the same.",
        code: `# src/askpep/agents/graph.py
from langgraph.errors import GraphRecursionError


def run_desk(
    graph, question: str, *, svc: Services, thread_id: str | None = None, principal: Principal | None = None
) -> DeskResult:
    # your turn: keep what you wrote in chapter 4, and change one thing.
    # 1. Run graph.invoke inside try, and keep the final state as a dict.
    # 2. except GraphRecursionError: state = {**_checkpoint_values(graph, config), "stop_reason": "recursion_limit"}
    # 3. Return result_from_state(state, ...) from both paths, with the same thread id and latency.
    ...`,
        test: "uv run pytest tests/agents -k agents06_s6",
      },
    ],
    verify: "uv run pytest tests/agents -k agents06",
  },
  recap: [
    "A model can't be trusted to end its own tool loop, so code counts steps, tokens and time and ends the run.",
    "`Budget` is a frozen dataclass built from settings, and its limits come from percentiles of real runs.",
    "`detect_loop` catches a repeated call, and the step budget catches a run that rewords its query each time.",
    "`check_budget` tests steps, tokens, time and repeated calls in that order and returns the first reason it finds.",
    "`BudgetMiddleware` runs before each model call and jumps to the end with a reason and a plain answer.",
    "The recursion limit sits above the step budget as a backstop, and `run_desk` maps its error to `recursion_limit`.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In budgets and stopping I learned that code, and never the model, decides when an agent run ends. So every desk agent carries step, token and time budgets and a repeated-call check, and a stopped run returns a reason a caller can read. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["agents-q05", "agents-q06"],
};

export default chapter;
