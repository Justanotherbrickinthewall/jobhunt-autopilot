import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "evals-05-braintrust-experiments",
  course: "evals",
  number: 5,
  title: "An experiment compares two versions on the same data and scorers",
  tagline: "The second team wants shorter answers. How would you show that a prompt change helped?",
  minutes: 55,
  objectives: [
    "Define an experiment, and name what must stay frozen when you compare two versions of the desk.",
    "Read a Braintrust `Eval` call, and say what `data`, `task` and `scores` each hold.",
    "Turn a code grader into a Braintrust scorer, and say why the task keeps each `DeskResult`.",
    "Find a scorer error in `metadata[\"scorer_errors\"]`, and say why `run_experiment` raises `RuntimeError` for it.",
    "Read a difference against its noise band before you act on it.",
    "Compare Braintrust with LangSmith `evaluate`, Vertex AI evaluation and Arize Phoenix.",
    "Write an experiment record whose rule comes before the run.",
  ],
  sections: [
    {
      id: "s1-experiment",
      title: "An experiment compares two desk versions on the same questions with the same scorers",
      goal: "What must stay frozen for a comparison to mean anything?",
      blocks: [
        {
          kind: "p",
          text: "Course 4 has built the parts of a verdict so far. You have versioned datasets, code graders and a calibrated judge. This chapter uses them to answer one question. Is version B of the desk better than version A?",
        },
        {
          kind: "p",
          text: "An **experiment** is one run of a task over a dataset, scored by a list of scorers. Run two versions of the desk through the same questions and the same scorers. The difference between the two experiments is then the effect of your change. Nothing else moved, so nothing else can explain it.",
        },
        {
          kind: "p",
          text: "A **version** is whatever you change. Two kinds matter here. A prompt version changes the words the agent reads. A model version swaps the model behind the agent.",
        },
        {
          kind: "p",
          text: "Take the baseline desk from course 2. It is one agent that holds all five tools, and its prompt is `BASELINE_PROMPT`. The prompt variant adds one rule to that text. The model comparison runs the same prompt on `gemini-3.8-flash`, the desk's default, and then on `gemini-3.5-flash`.",
        },
        {
          kind: "p",
          text: "Both versions run over the answer slice from chapter 1. It holds 14 items. Items `a01` to `a10` have an answer in the PEPs. Items `a11` to `a14` have none, such as 'What does PEP 9999 propose?' The desk should refuse those four.",
        },
        {
          kind: "p",
          text: "Everything else stays frozen. That means the dataset version, the scorers, the model, the settings and the retry policy. Change one thing at a time. If a pull request swaps the prompt and the model together, you can't credit the gain to either. The two effects could even cancel.",
        },
        {
          kind: "p",
          text: "Chapter 2 gave you `askpep eval run`. It scores one version and prints its pass rates. Two runs of it leave two blocks of numbers to compare by eye. An experiment tool keeps each run's outputs and scores together, so you can open the cases that changed.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Don't tune on the items you score",
          text: "If you paste a golden item into the prompt as an example, that item becomes easy and the score rises for the wrong reason. Keep prompt examples and evaluation items apart.",
        },
        {
          kind: "quiz",
          id: "evals05-q1",
          question: "A pull request changes the desk's prompt and its model together. The pass rate on the answer slice rises. What can you conclude?",
          options: [
            "The new prompt is better.",
            "The new model is better.",
            "The new pair beats the old pair, and you can't credit either change.",
            "The experiment is invalid, because an experiment can't compare models.",
          ],
          answer: 2,
          explain:
            "Two things changed, so either one could have earned the gain, and they could have worked against each other. Run the new prompt on the old model, and the old prompt on the new model, to separate them.",
        },
        {
          kind: "p",
          text: "Braintrust runs that comparison for you, so you start with one of its calls.",
        },
      ],
    },
    {
      id: "s2-eval",
      title: "Braintrust's Eval runs a task over cases and scores every output",
      goal: "What does a Braintrust `Eval` call do?",
      blocks: [
        {
          kind: "p",
          text: "**Braintrust** is a service for running and comparing experiments. Its Python library has one entry point, `Eval`. You give it a name, the cases, a task and a list of scorers. It runs the task on each case, calls each scorer, and returns the results with a summary.",
        },
        {
          kind: "p",
          text: "In Braintrust, a case is a dict. Its `input` goes to the task. Its `expected` value goes to the scorers. Its `metadata` is yours to keep. The **task** is a function from one case's input to an output. A **scorer** takes the input, the output and the expected value, and returns a number from 0 to 1.",
        },
        {
          kind: "code",
          lang: "python",
          code: `from autoevals import Levenshtein
from braintrust import Eval

cases = [{"input": "PEP 8", "expected": "Style Guide for Python Code"}]
result = Eval(
    "askpep-demo",
    data=lambda: cases,
    task=lambda input: "Style Guide for Python Code",
    scores=[Levenshtein],
    no_send_logs=True,
)
print(result.results[0].scores)  # {'Levenshtein': 1.0}`,
          caption: "The smallest Eval. This task ignores its input and returns a fixed answer.",
        },
        {
          kind: "p",
          text: "The first argument is the name of a Braintrust project. Braintrust names each experiment inside it for itself. `no_send_logs=True` keeps the run on your machine, so the call needs no account and no key. Drop it, set a key, and `Eval` creates an experiment in that project.",
        },
        {
          // CHECK: Braintrust 0.48.0 Eval docstring says `name` corresponds to a project name and `no_send_logs=True` builds a local summary instead of creating an experiment. Read in the installed package on 21 October 2026, not yet against the docs site.
          kind: "p",
          text: "`Eval` returns the results and a summary. `result.results` holds one entry for each case. Each entry has the `input`, the `output`, the `scores` and an `error`. The summary prints the mean of each scorer.",
        },
        {
          kind: "p",
          text: "**autoevals** is Braintrust's library of ready-made scorers. `Levenshtein` is the simplest. It counts the single-character edits that turn the output into the expected text, and scales the count to a score from 0 to 1. It needs no model, so it runs offline.",
        },
        {
          kind: "p",
          text: "Its weakness is wording. Take the reference 'Four spaces per indentation level.' The answer 'Four spaces.' is right, and `Levenshtein` scores it 0.35. The scorers that matter for AskPEP read citations and refusals, so you wrap your own graders in lab step 2.",
        },
        {
          // CHECK: the LLM-based autoevals scorers need a model and a key. Which model they call by default, and which key they read, was not confirmed against the docs of autoevals 0.4.1, the version capstone/uv.lock installs. FACTS names only the floor, 0.4.0.
          kind: "p",
          text: "Other autoevals scorers ask a language model to judge the answer. They need a model and a key, and every case costs tokens. Chapter 3's rubric judge already does that job, with a rubric you calibrated against your labels. This chapter keeps `Levenshtein` as one cheap extra scorer.",
        },
        {
          kind: "quiz",
          id: "evals05-q2",
          question: "The desk answers 'Four spaces.' and the reference is 'Four spaces per indentation level.' `Levenshtein` gives a low score. What does that tell you?",
          options: [
            "The answer is wrong.",
            "The wording differs from the reference. The answer may still be right.",
            "The desk skipped retrieval.",
            "The scorer crashed.",
          ],
          answer: 1,
          explain:
            "`Levenshtein` measures how far the text is from the reference, character by character. A short correct answer sits far from a long reference. Use it as a cheap signal, and let a grader or a judge decide.",
        },
        {
          kind: "p",
          text: "The call can run with no account at all, which decides how you start.",
        },
      ],
    },
    {
      id: "s3-account",
      title: "A Braintrust account is optional, and the free plan covers this chapter",
      goal: "Do you need a Braintrust account?",
      blocks: [
        {
          kind: "p",
          text: "The lab needs no account. `run_experiment` sends nothing out unless you ask it to. An account adds the web app. There you see two experiments side by side, with every case's output, score and reason.",
        },
        {
          // CHECK: Braintrust Starter plan figures ($0, no card, 1 GB, 10,000 scores, 14-day retention, unlimited users, $10 of model credits) come from setup/revision5/FACTS.md L41, checked 20 October 2026 against braintrust.dev/pricing. Plans change, so re-check before release. How the pricing page defines a score was not checked.
          kind: "p",
          text: "The Starter plan costs $0 and asks for no card. On 20 October 2026 it included 1 GB of data, 10,000 scores, 14 days of retention, unlimited users and $10 of model credits. Two small experiments on 14 items sit far below those limits. Plans change, so read the pricing page first.",
        },
        {
          // CHECK: confirm where Braintrust keeps API keys and the sign-up flow in its current web app. Only the learner can do this step, because it creates an account.
          kind: "step",
          id: "evals05-s01",
          title: "Make an account and an API key",
          text: "Optional. Sign up for the Starter plan at braintrust.dev, and create an API key in the app's settings. Copy the key before you leave the page. Never commit a key to git.",
        },
        {
          kind: "p",
          text: "Braintrust reads its key from the process environment. Your `.env` file doesn't reach the process by itself. The desk's `Settings` reads `.env` for its own fields and exports nothing. So start Python with `uv run --env-file .env`, as you did for LangSmith.",
        },
        {
          // CHECK: confirm with a live Braintrust key that BRAINTRUST_API_KEY set through `uv run --env-file .env` is picked up by Eval. Settings ignores it and does not export it (checked offline on 21 October 2026).
          kind: "step",
          id: "evals05-s02",
          title: "Put the key in your .env",
          text: "A new workspace's `.env.example` already has the line `BRAINTRUST_API_KEY=`. If you started the course earlier, add that line to `.env.example` and to `.env` by hand. Then paste your key after the equals sign in `.env`.",
          lang: "bash",
          code: `# in .env
BRAINTRUST_API_KEY=paste-your-key-here`,
        },
        {
          // CHECK: confirm that the Braintrust web app lists two experiments of one project side by side. The behaviour is from the Eval docstring (name is a project name) and not from the app itself.
          kind: "p",
          text: "One naming rule matters. `Eval`'s first argument is the project. Run both versions under the same name, and Braintrust lists them as two experiments in one project. Use `metadata` to say which is which. Two different names make two projects, and the app has nothing to put side by side.",
        },
        {
          kind: "p",
          text: "The scorers are next, and yours need more than the answer text.",
        },
      ],
    },
    {
      id: "s4-grader-scorer",
      title: "A grader becomes a scorer through a wrapper that looks up the desk's stored run",
      goal: "How does a scorer reach the desk's whole result?",
      blocks: [
        {
          kind: "p",
          text: "Chapter 2 built the code graders. A grader takes a `GoldenItem` and a `DeskResult`, and returns a `Score`. The dict `GRADERS` maps a name to a grader. `citations` checks that the answer cites the right PEPs, and for an item with no answer it passes when the desk cites nothing. `refusal` checks that the desk refused only when it should.",
        },
        {
          kind: "p",
          text: "Braintrust can't call a grader as it stands. It calls a scorer with `input`, `output` and `expected`. The `output` is the answer text, and that text holds no citations, route or trajectory. A grader needs the whole `DeskResult`.",
        },
        {
          kind: "p",
          text: "So the task keeps what the scorers need. `make_task` returns two things. One is the task, which runs the desk and returns the answer text. The other is a dict called `runs`, which the task fills as it goes. It maps each item id to the whole `DeskResult`.",
        },
        {
          kind: "p",
          text: "The case's `input` carries the item id, so a scorer can find the run. `braintrust_cases` already ships in your stub. It builds each case with the id and the question as the input, the reference answer as `expected`, and the id and slice as `metadata`.",
        },
        {
          kind: "code",
          lang: "python",
          code: `task, runs = make_task(desk, items)
scorers = [grader_scorer(GRADERS[name], items, runs) for name in ("citations", "refusal")]
# Eval runs the task on a case, then calls each scorer with the same case.
# By then runs["a01"] holds the DeskResult that the scorers need.`,
          caption: "How the pieces fit. The task fills runs, and each scorer reads from it.",
        },
        {
          kind: "p",
          text: "`grader_scorer` wraps one grader. The scorer it returns finds the item and its stored run by `input[\"id\"]`, and calls the grader. It returns a Braintrust `Score` with the grader's name and value. The grader's `reason` goes in the score's `metadata`, so the app shows why a case failed beside the number.",
        },
        {
          kind: "quiz",
          id: "evals05-q3",
          question: "Why does `make_task` return a `runs` dict as well as the task?",
          options: [
            "Braintrust requires every task to return a dict.",
            "A scorer is given only the answer text, and the graders need the whole `DeskResult`.",
            "It caches the desk, so a second experiment runs faster.",
            "It lets two experiments share one set of results.",
          ],
          answer: 1,
          explain:
            "The task's return value is the answer text. A grader reads citations, the route and the trajectory, which the text doesn't hold. The task stores each `DeskResult` in `runs`, and the scorer looks it up by item id.",
        },
        {
          kind: "p",
          text: "The wrapper can fail, and Braintrust's handling of that failure is the next problem.",
        },
      ],
    },
    {
      id: "s5-scorer-errors",
      title: "A scorer that crashes drops its case, so the experiment looks better than it is",
      goal: "What happens to the mean when a scorer crashes?",
      blocks: [
        {
          kind: "p",
          text: "Braintrust catches errors, and it treats the two kinds differently. A task that raises sets the case's `.error`. A scorer that raises sets nothing there.",
        },
        {
          kind: "p",
          text: "For a failed scorer the case gets no score. The traceback goes into `case.metadata[\"scorer_errors\"]`, a dict from scorer name to text. A message goes to stderr, and the run carries on with the next case.",
        },
        {
          // CHECK: scorer-error handling is read from braintrust 0.48.0, framework.py, and shown by the run below on 21 October 2026. A later release may change it. Re-run the demo before release.
          kind: "step",
          id: "evals05-s03",
          title: "Watch a scorer crash and the summary stay at 100 percent",
          text: "This scorer divides by the number of expected documents. Case `a11` expects none. The three cases are made up, and nothing calls a model. Save the code as `scorer_crash.py` in your workspace root, and run `uv run python scorer_crash.py`.",
          lang: "python",
          code: `from braintrust import Eval


def share_found(input, output, expected):
    return len(set(output) & set(expected)) / len(expected)


cases = [
    {"input": "a01", "expected": [8]},
    {"input": "a02", "expected": [8]},
    {"input": "a11", "expected": []},
]

result = Eval("demo", data=lambda: cases, task=lambda input: [8], scores=[share_found], no_send_logs=True)
for case in result.results:
    print(case.input, case.scores, case.error, list((case.metadata or {}).get("scorer_errors", {})))`,
          expect:
            "Found exceptions for the following scorers: share_found [ZeroDivisionError('division by zero')]\na01 {'share_found': 1.0} None []\na02 {'share_found': 1.0} None []\na11 {} None ['share_found']\nThe summary box above them says 100.00% 'share_found' score. Progress bars and the box differ a little by version.",
        },
        {
          kind: "p",
          text: "Read that output. Case `a11` has an empty `scores` dict and a `scorer_errors` entry. Its `.error` is `None`. The summary says `share_found` scores 100 percent, though one case in three has no score. The summary averages the cases that scored.",
        },
        {
          kind: "p",
          text: "That is how a broken scorer flatters a result. The cases that crash are not random. A scorer that fails on an empty expected list fails on every item with no answer, and those are the hard ones for the desk. Drop them from the mean and the mean rises.",
        },
        {
          kind: "widget",
          id: "evals05-silent-scorer",
          intro:
            "Take the answer slice. Items a01 to a10 have an answer in the PEPs, and a11 to a14 have none. A citations scorer has a bug and crashes on every item with no answer. The numbers are illustrative, not from a real run. Predict what the summary mean shows. Then see where Braintrust records the crash, and what run_experiment does.",
        },
        {
          kind: "p",
          text: "`run_experiment` closes that gap. After `Eval` returns, it checks every case. A case with an `.error` raises `RuntimeError`. A case with `scorer_errors` raises `RuntimeError` too, and the message names the case and the scorer and carries the traceback. A bug stops the run, and a missing score never passes for a result.",
        },
        {
          kind: "p",
          text: "An unfinished lab step shows up the same way. The stub's `NotImplementedError` is raised inside a task or a scorer, and `run_experiment` turns it into a `RuntimeError` that names the step. You see the step to do next, and you never see a score of zero.",
        },
        {
          kind: "quiz",
          id: "evals05-q4",
          question: "A scorer crashes on one case. Which of these shows it?",
          options: [
            "`case.error` is set to the exception.",
            "`case.scores` holds 0 for that scorer.",
            "`case.metadata[\"scorer_errors\"]` names the scorer, and `case.scores` has no entry for it.",
            "The summary's mean drops.",
          ],
          answer: 2,
          explain:
            "A task error sets `.error`. A scorer error sets no `.error` and no zero. The score is missing, the traceback is in `scorer_errors`, and the mean covers only the cases that scored. That is why `run_experiment` checks `scorer_errors` itself.",
        },
        {
          kind: "p",
          text: "With every case scored, two experiments can be compared.",
        },
      ],
    },
    {
      id: "s6-compare",
      title: "A gap between two experiments counts only when it clears the noise band",
      goal: "How big must a gap be before you act on it?",
      blocks: [
        {
          kind: "p",
          text: "`run_experiment` returns an `ExperimentResult`. It holds the name, the number of cases, the mean of each scorer, and the `runs` dict. `compare_experiments(a, b)` takes two of them.",
        },
        {
          kind: "p",
          text: "It returns one `ScoreDelta` for each scorer name that both experiments have. A `ScoreDelta` holds the name, the two means and `diff`. The `diff` is the mean for `b` minus the mean for `a`, so a positive number means `b` is better. The list is sorted by the size of the difference, largest first.",
        },
        {
          kind: "code",
          lang: "text",
          code: `refusal    0.79 to 0.93  (+0.14)
citations  0.64 to 0.71  (+0.07)`,
          caption: "Illustrative differences for the baseline prompt and a one-sentence variant, on the 14 answer items.",
        },
        {
          kind: "p",
          text: "A difference says what changed. It doesn't say whether the change is real. Run the same version twice and the scores can differ, because sampling varies the answers. A small set of questions adds noise of its own.",
        },
        {
          kind: "p",
          text: "Treat a score as a pass rate p on N items. Its standard error is about the square root of p times one minus p, divided by N. The gap between two scores has a standard error about 1.4 times larger. Call two of those the **noise band**. A gap smaller than the band is inside the noise.",
        },
        {
          kind: "code",
          lang: "text",
          code: `p = 0.80 on N = 14 items
one score's standard error:  sqrt(0.80 * 0.20 / 14) = 0.107, about 11 points
standard error of a gap:     1.4 * 0.107 = 0.151, about 15 points
noise band, two of those:    about 30 points

N = 56:   the band is about 15 points
N = 224:  the band is about 8 points`,
          caption: "Illustrative. Four times the items halve the band.",
        },
        {
          kind: "p",
          text: "On 14 items a gap under about 30 points is inside the noise. The honest verdict is then 'not yet', and it is often the right one. A slice this small can't settle a seven point gap, whatever the tool shows. Chapter 6 repeats each run to measure the spread, and chapter 8 replaces this rule with bootstrap intervals.",
        },
        {
          kind: "widget",
          id: "evals05-delta-reader",
          intro:
            "Two experiments ran on the answer slice. One used the baseline prompt, and one used the variant that answers in one sentence. compare_experiments returned the two differences you see. The numbers are illustrative. Predict first, at 14 items. Then raise the item count and watch the noise band shrink.",
        },
        {
          kind: "p",
          text: "Quality is one column. Course 2 added up tokens when it compared designs, and the same sum works here. `ExperimentResult.runs` keeps every `DeskResult`, and each one carries `tokens_in` and `tokens_out`. Add them up, then divide the total by the items that passed. A prompt that adds two points and doubles the tokens may not pay.",
        },
        {
          kind: "p",
          text: "Prompt strategies fit the same tool. A zero-shot prompt gives instructions only. A few-shot prompt adds worked examples. A reasoning prompt asks the model to think before it answers. Each is one version, so each is one experiment on the same items. Write the decision rule before you look at any numbers.",
        },
        {
          kind: "p",
          text: "A rule might read like this. Ship the variant if it gains at least five points on the answer slice and clears the noise band. It must also cost under 20 percent more tokens for each passing question. The numbers are yours to choose. Choosing them after the result lets the result choose for you.",
        },
        {
          // CHECK: the live prompt comparison below has not run against a real desk. The script is built from the capstone's own functions, but 28 live desk runs and the Braintrust upload were not made while writing. Only the learner can run it, because it needs Gemini and, for the upload, a Braintrust key.
          kind: "p",
          text: "Now run it for real. Build the lab first, because the script needs `run_experiment` and `compare_experiments`. It runs the answer slice twice, which is 28 desk runs. It needs what `askpep desk ask` needs: Postgres and your Google sign-in from course 2.",
        },
        {
          kind: "step",
          id: "evals05-s04",
          title: "Run two prompts through the real desk",
          text: "Save this as `compare_prompts.py` in your workspace root, and run `uv run --env-file .env python compare_prompts.py`. Without a Braintrust key the runs stay on your machine. With one, both land in the project `askpep-answer`, and you can open them side by side.",
          lang: "python",
          code: `import os

from askpep.agents.baseline import BASELINE_PROMPT
from askpep.agents.factory import create_desk_agent, single_agent_graph
from askpep.agents.graph import run_desk
from askpep.agents.tools import make_tools
from askpep.cli import open_services
from askpep.evals.datasets import load_dataset
from askpep.evals.experiments import compare_experiments, run_experiment

SHORT_PROMPT = BASELINE_PROMPT + "\\n7. Answer in one sentence."

svc = open_services()
items = load_dataset("answer")
tools = make_tools(svc)
send = bool(os.environ.get("BRAINTRUST_API_KEY"))


def desk_with(prompt: str):
    agent = create_desk_agent(svc, "baseline", prompt, [tools[name] for name in sorted(tools)])
    graph = single_agent_graph(svc, "baseline", agent)
    return lambda item: run_desk(graph, item.question, svc=svc)


a = run_experiment("askpep-answer", items, desk_with(BASELINE_PROMPT), metadata={"prompt": "baseline"}, send_logs=send)
b = run_experiment("askpep-answer", items, desk_with(SHORT_PROMPT), metadata={"prompt": "one sentence"}, send_logs=send)
for delta in compare_experiments(a, b):
    print(f"{delta.name}: {delta.a:.2f} to {delta.b:.2f} ({delta.diff:+.2f})")`,
          expect:
            "Braintrust's summary prints once for each experiment. Then one line for each scorer, largest change first, such as refusal: 0.79 to 0.93 (+0.14). Your numbers differ, because the desk calls a live model.",
        },
        {
          kind: "p",
          text: "Everything here scores questions you saved in advance. Scoring live traffic is online evaluation. The LLMOps course covers it, so this chapter stops at saved questions.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Interviews test whether you respect the noise",
          text: "One prompt scores two points higher. Is it really better? A strong answer asks how many items there are, and works out the noise on a gap of that size. It checks that only one variable changed, reads the slices, and sets cost beside quality. If the data can't tell yet, it says so and adds items.",
        },
        {
          kind: "quiz",
          id: "evals05-q5",
          question: "The variant prompt passes 13 of 14 refusal items. The baseline passes 11 of 14. Nothing else differs. What do you do?",
          options: [
            "Ship the variant, because two more items passed.",
            "Treat it as unproven. On 14 items a gap of two sits inside the noise, so add items or repeat the runs.",
            "Keep the baseline, because a variant needs 30 items to count.",
            "Average the two experiments.",
          ],
          answer: 1,
          explain:
            "Two items on 14 is a 14 point gap, and the noise band on 14 items is wider than that. The result might be real. The data can't show it yet. Add items, repeat the runs, or decline to decide.",
        },
        {
          kind: "p",
          text: "Braintrust is one choice, and three other tools can run the same experiment.",
        },
      ],
    },
    {
      id: "s7-alternatives",
      title: "Other tools run the same experiment, and each trades off differently",
      goal: "What do the other experiment tools trade off?",
      blocks: [
        {
          kind: "p",
          text: "Braintrust is one choice. Three others do the same job: LangSmith's `evaluate`, Vertex AI evaluation and Arize Phoenix. Each runs a task over a dataset, scores it and keeps the experiments for comparison. They differ in where the data lives, what you write and what it costs.",
        },
        {
          kind: "compare",
          caption: "Four experiment tools. Plan figures were checked on 20 October 2026.",
          columns: ["Tool", "Where the experiments live", "What you write", "Cost to start", "Pick it when"],
          rows: [
            [
              "Braintrust `Eval`",
              "Braintrust's app, or nowhere with `no_send_logs=True`.",
              "A task and scorers in Python, with `autoevals` for ready-made ones.",
              "Starter plan: $0, no card, 1 GB, 10,000 scores, 14 days.",
              "You want experiments side by side and an offline mode for tests.",
            ],
            [
              "LangSmith `evaluate`",
              "LangSmith, against a dataset, or nowhere with `upload_results=False`.",
              "A target function and evaluators in Python.",
              "Developer plan: $0, 1 seat, 5,000 base traces a month, 14 days.",
              "Your traces already live in LangSmith.",
            ],
            [
              "Vertex AI evaluation",
              "Your Google Cloud project.",
              "A table of prompts, and prebuilt metrics such as `GENERAL_QUALITY`.",
              "It bills the Vertex models it calls. The client is in Preview.",
              "The model and the data should stay inside Google Cloud.",
            ],
            [
              "Arize Phoenix",
              "A Phoenix server you run, or Arize's hosted service.",
              "Tasks and evaluators in Python, against a Phoenix dataset.",
              "Free to run yourself.",
              "You want an open source tool that you host.",
            ],
          ],
        },
        {
          // CHECK: LangSmith evaluate signature (target, data, evaluators, experiment_prefix, num_repetitions, upload_results) was read from the installed langsmith 0.14.11 with inspect.signature on 21 October 2026. The `upload_results=False` mode is marked beta in that package.
          kind: "p",
          text: "LangSmith's `evaluate` takes a target function, a dataset, a list of evaluators and an `experiment_prefix`. It stores each experiment against the dataset, and the app compares them side by side. You turned LangSmith tracing on in chapter 3 of the agents course. Course 5 teaches it properly.",
        },
        {
          // CHECK: that LangSmith logs an evaluator error, records it in the feedback comment, and carries on was read in langsmith 0.14.11 (evaluation/_runner.py) on 21 October 2026. Re-read it against the version you install.
          kind: "p",
          text: "Check what each tool does when a scorer raises. In langsmith 0.14.11, `evaluate` logs 'Error running evaluator', stores the error in the feedback comment, and carries on. The run doesn't stop. The lesson of the last section applies to every tool you adopt.",
        },
        {
          // CHECK: the GenAI Client is Preview and Google recommends it over EvalTask, per FACTS.md L339 (checked 20 October 2026). Names used: `from vertexai import Client, types`, `client.evals.run_inference`, `client.evals.evaluate`, `types.RubricMetric.GENERAL_QUALITY`. Under google-cloud-aiplatform 2.x the package behind it is `agentplatform`.
          kind: "p",
          text: "Vertex AI evaluation lives in your Google Cloud project, so it uses the same sign-in as the desk. Google recommends its GenAI Client, which was in Preview on 20 October 2026. The older `EvalTask` interface stays for compatibility and gets no new work. This course uses the client.",
        },
        {
          kind: "p",
          text: "It works in two calls. `run_inference` sends each prompt in a table to a model. `evaluate` scores the responses with prebuilt metrics. `GENERAL_QUALITY` writes rubrics for each prompt and scores the answer against them, so it needs no reference. That is a model's answer in isolation, with no desk around it.",
        },
        {
          kind: "p",
          text: "Your workspace already holds `src/askpep/evals/vertex.py`, so the lab has no step for it. Its function `run_vertex_eval` sends the 14 answer questions to one Gemini model and returns the mean of each metric. The ten tests of `vertex.py` sit under `evals05_s4`. Three pass on day one. The other seven pass once chapter 1's first step is done.",
        },
        {
          // CHECK: a live call to Vertex AI evaluation has not been made. `gemini-3.5-flash` in `europe-west3` is the capstone default, and FACTS.md open question 2 asks whether it accepts pay-as-you-go calls there. The model page listed Standard PayGo for global, us and eu only (20 October 2026). Whether `vertexai.Client` takes location="global" for evaluation is also unconfirmed. Only the learner can run this step.
          kind: "step",
          id: "evals05-s05",
          title: "Score one model's answers on Vertex",
          text: "This calls Vertex AI and bills your project, so it needs your project id and the sign-in from course 2. Save it as `vertex_eval.py`, and run `uv run --env-file .env python vertex_eval.py`. If `europe-west3` refuses the call, add `location=\"global\"` to `run_vertex_eval`.",
          lang: "python",
          code: `from askpep.config import get_settings
from askpep.evals.datasets import load_dataset
from askpep.evals.vertex import run_vertex_eval

scores = run_vertex_eval(load_dataset("answer"), project=get_settings().google_cloud_project)
print(scores)`,
          expect: "One dict with one entry for the metric, such as {'general_quality_v1': 0.8}. Your number differs.",
        },
        {
          // CHECK: Arize Phoenix claims here (open source, built on OpenTelemetry and OpenInference, datasets and experiments that compare versions on the same inputs, self-hostable, Arize's hosted service) come from arize.com/docs/phoenix read on 21 October 2026. The docs page did not state the licence, the install command or any hosted pricing. Confirm before release.
          kind: "p",
          text: "Arize Phoenix is open source and built on OpenTelemetry and OpenInference. It keeps datasets and runs experiments that compare versions of an application on the same inputs. You can host it yourself, which suits data that must stay on your network. The llmops course compares it with Langfuse and Datadog as a tracing tool.",
        },
        {
          kind: "quiz",
          id: "evals05-q6",
          question: "`run_vertex_eval(items)` returns a score. What did it score?",
          options: [
            "The desk, including triage, tools and citations.",
            "One Gemini model's direct answers to the questions, with no desk around it.",
            "The retrieval ranking for each question.",
            "The attack slice.",
          ],
          answer: 1,
          explain:
            "It sends each question to a model and scores the response with a rubric metric. No retrieval, no tools and no citations are involved. It can't stand in for an experiment on the desk, which is what `run_experiment` runs.",
        },
        {
          kind: "p",
          text: "You can run an experiment. The second team's request now needs one, and the rule has to come first.",
        },
      ],
    },
    {
      id: "s8-experiment-record",
      title: "An experiment record states the rule first, so not yet can be the answer",
      goal: "What should an experiment leave behind?",
      blocks: [
        {
          kind: "p",
          text: "An **experiment record** states the decision rule before the run, then the result against that rule. Writing the rule first stops you choosing a success story after you've seen the numbers. It's the same habit as writing your labels before you see the judge.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Write the question, and freeze the dataset and the scorers.",
            "Write the rule: the gain, the noise band and the cost limit.",
            "Run both versions.",
            "Compare the gain with the band.",
            "State the decision, including not yet.",
          ],
        },
        {
          kind: "p",
          text: "The second team's lead asked for shorter answers. You drafted a variant that answers in one sentence and wrote the rule first. The gain on the answer slice must be at least five points and must clear the noise band. Tokens per passing question must not rise by more than 20 percent.",
        },
        {
          kind: "p",
          text: "Then you ran both versions on the 14 answer items. Nine passed both graders on the baseline, and that is stricter than last week's check in chapter one. Refusal went from 11 to 13 passes, a gain of 14 points. Citations went from nine to 10, a gain of seven. Items passing both went from nine to 10.",
        },
        {
          kind: "p",
          text: "The lead read the table and said the numbers went up. They did. At 14 items the noise band is about 30 points, and neither gain clears it. Token cost fell, so the third part of the rule holds. The decision is not yet: add items to the answer slice and run it again.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# EXPERIMENT-001.md
Question: does a one-sentence answer help the second team?
Requested by: second team's lead
Dataset: answer/v1 (14 items)   Scorers: grade_citations, grade_refusal   Frozen: yes
A: baseline prompt   B: one-sentence prompt

## Rule, written before the run
Gain at least 5 points on items passing both scorers.
Gain clears the noise band.
Tokens per passing question rise by less than 20%.

## Result
Score       A            B             Gain
refusal     11/14 0.79   13/14 0.93    +14 points
citations   9/14  0.64   10/14 0.71    +7 points
both pass   9/14  0.64   10/14 0.71    +7 points
Tokens      58,800       52,500
Tokens per passing question  6,533   5,250
Noise band at 14 items: about 30 points

## Decision
Gain of at least 5: yes. Clears the noise band: no. Tokens within limit: yes.
Not yet. Add answer items until the band is below the gain, then run again.`,
          caption: "EXPERIMENT-001.md. The figures belong to the story.",
        },
        {
          kind: "p",
          text: "Read the rule, then the decision line. A gain inside the noise band isn't evidence for the variant or against it. Writing not yet is the discipline. The lead did get a useful result: token cost fell, and the next step has a size.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# EXPERIMENT-NNN.md
Question:
Requested by:
Dataset:    Scorers:    Frozen:
A:    B:

## Rule, written before the run
(gain required, noise band, cost limit)

## Result
Score  A  B  Gain
Noise band at this size:

## Decision
(each part of the rule, then ship, drop or not yet)`,
          caption: "For your next system: the record with the values left blank.",
        },
        {
          kind: "p",
          text: "Everything so far grades the answer. A prompt can pass the whole answer slice and still reach it by the wrong path. The next chapter grades the path.",
        },
      ],
    },
  ],
  lab: {
    title: "Build the Braintrust experiment functions",
    goal: "Write the four functions of `experiments.py`. Each step starts from a stub that raises `NotImplementedError(\"evals-05 step N\")`. The tests run Braintrust's `Eval` for real with logging off and a fake desk, so nothing calls Gemini or Braintrust. Run them from your AskPEP workspace root. Then compare your file with `capstone/src/askpep/evals/experiments.py` in the my-learn folder.",
    minutes: 50,
    files: ["src/askpep/evals/experiments.py", "tests/evals/test_evals05_braintrust.py"],
    steps: [
      {
        title: "A task for the experiment",
        text: "Write `make_task` in `experiments.py`. It returns the task Braintrust calls for each case, and a dict that fills with results. The task finds the item by the id in its input and runs the desk. It stores the whole `DeskResult` under that id and returns the answer text. The stub raises `evals-05 step 1`.",
        code: `# src/askpep/evals/experiments.py
def make_task(
    desk: "Callable[[GoldenItem], DeskResult]", items: Sequence[GoldenItem]
) -> "tuple[Callable[[dict], str], dict[str, DeskResult]]":
    """The task Braintrust runs for each case, and a dict that fills with the desk's results."""
    # your turn: index the items by id.
    by_id = ...
    runs: dict[str, DeskResult] = {}

    def task(input: dict) -> str:
        # your turn:
        # 1. Find the item with input["id"]. An id that is not in items is a KeyError.
        # 2. Run the desk on it, and store the whole DeskResult in runs under the item's id.
        # 3. Return the answer text.
        ...

    return task, runs`,
        test: "uv run pytest tests/evals -k evals05_s1",
      },
      {
        title: "A scorer from a grader",
        text: "Write `grader_scorer`. It wraps one grader as a Braintrust scorer. The scorer finds the item and its stored result by `input[\"id\"]` and calls the grader. It returns a `BraintrustScore` with the grader's name and value, and the reason in `metadata`. Name the scorer after the grader. The stub raises `evals-05 step 2`.",
        code: `# src/askpep/evals/experiments.py
def grader_scorer(
    grader: "Callable[[GoldenItem, DeskResult], Score]",
    items: Sequence[GoldenItem],
    runs: "Mapping[str, DeskResult]",
) -> Callable[..., BraintrustScore]:
    by_id = {item.id: item for item in items}

    def scorer(input: dict, output: Any = None, expected: Any = None, **kwargs: Any) -> BraintrustScore:
        # your turn: grade the item with input["id"] against the result stored in runs.
        # Return BraintrustScore(name=..., score=..., metadata={"reason": ...}) from the grader's Score.
        ...

    # your turn: set scorer.__name__ from grader.__name__, so Braintrust's table has a name for it.
    return scorer`,
        test: "uv run pytest tests/evals -k evals05_s2",
      },
      {
        title: "Running an experiment",
        text: "Write `run_experiment`. It calls Braintrust's `Eval` with logging off, and averages each score. It raises `RuntimeError` for a failed case and for a failed scorer, with the case id in the message. Add `from braintrust import Eval` and `GRADERS` to your imports. The stub raises `evals-05 step 3`.",
        code: `# src/askpep/evals/experiments.py
# Imports to add: from braintrust import Eval, and GRADERS beside Score in the graders import.
def run_experiment(
    name: str,
    items: Sequence[GoldenItem],
    desk: "Callable[[GoldenItem], DeskResult]",
    *,
    graders: Sequence[str] = ("citations", "refusal"),
    extra_scores: Sequence[Callable[..., Any]] = (),
    metadata: Mapping[str, Any] | None = None,
    send_logs: bool = False,
) -> ExperimentResult:
    # your turn:
    # 1. Build the task and runs with make_task. Build one scorer for each name in graders with
    #    grader_scorer over GRADERS[name], then add extra_scores after them.
    # 2. Call Eval(name, data=..., task=..., scores=..., metadata=..., no_send_logs=not send_logs).
    #    data is a function that returns braintrust_cases(items).
    # 3. For each case in result.results: raise RuntimeError if case.error is set. Raise it too if
    #    (case.metadata or {}).get("scorer_errors") holds anything. Name the case id. For a scorer,
    #    name the scorer and add its traceback text.
    # 4. Average each score name over the cases that have a number for it.
    # 5. Return an ExperimentResult with the name, the case count, the means and runs.
    ...`,
        test: "uv run pytest tests/evals -k evals05_s3",
      },
      {
        title: "Comparing two experiments",
        text: "Write `compare_experiments`. It returns one `ScoreDelta` for each score name that both experiments have. The `diff` is `b` minus `a`. Sort by the size of the difference, largest first, and by name when two are equal. The stub raises `evals-05 step 4`. This step's tests also run the ten tests of `vertex.py`.",
        code: `# src/askpep/evals/experiments.py
def compare_experiments(a: ExperimentResult, b: ExperimentResult) -> list[ScoreDelta]:
    # your turn:
    # 1. The score names both experiments have: the shared keys of a.scores and b.scores.
    # 2. One ScoreDelta(name, a's mean, b's mean, diff) for each, with diff = b - a.
    # 3. Sort by -abs(diff), then by name.
    ...`,
        test: "uv run pytest tests/evals -k evals05_s4",
      },
    ],
    verify: "uv run pytest tests/evals -k evals05",
  },
  recap: [
    "An experiment runs one task over one dataset with a list of scorers. Two versions give two experiments, and the difference between them is the effect of your change.",
    "Freeze the dataset, the scorers, the model, the settings and the retries, and change one thing.",
    "Braintrust's `Eval` takes a project name, the cases, a task and scorers. `no_send_logs=True` keeps the run on your machine.",
    "`grader_scorer` turns a grader into a scorer. The task stores each `DeskResult` in `runs`, because a grader needs more than the answer text.",
    "A scorer that crashes leaves no score and fills `metadata[\"scorer_errors\"]`. The mean covers the cases that scored, so it rises. `run_experiment` raises `RuntimeError` for it.",
    "A difference counts only when it clears the noise band. Four times the items halve the band.",
    "LangSmith `evaluate`, Vertex AI evaluation and Arize Phoenix run the same kind of experiment. Check how each one treats a failed scorer.",
    "An experiment record writes the rule before the run. A gain inside the noise band gives the decision not yet.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In Braintrust experiments I learned that a scorer error never shows as a failure. The case drops out of the mean, so the experiment looks better than it is. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["evals-q09", "evals-q10"],
};

export default chapter;
