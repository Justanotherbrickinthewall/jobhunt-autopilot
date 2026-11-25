import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "evals-04-deepeval-in-pytest",
  course: "evals",
  number: 4,
  title: "Evals that run in pytest get run",
  tagline: "A library will score the desk's answers inside pytest. What does its threshold actually tell you?",
  minutes: 45,
  objectives: [
    "Build a DeepEval test case from a golden item and a desk run, and say what each of its four fields holds.",
    "Put the Claude judge behind DeepEval's model interface, and say why the wrapper catches no errors.",
    "Build a `GEval` grounding metric and the three RAG metrics, and say what each one needs and catches.",
    "Run the desk's quality test with `deepeval test run`, and say why the lab tests unregister DeepEval's plugin.",
    "Choose between your own pytest harness, DeepEval, Ragas and promptfoo for a given job.",
    "Write a threshold note from labelled items and one planted bad answer.",
  ],
  sections: [
    {
      id: "s1-test-case",
      title: "A DeepEval test is a pytest test whose assertion is a metric score",
      goal: "How does a metric become an ordinary pytest test?",
      blocks: [
        {
          kind: "p",
          text: "Chapters 1 to 3 gave AskPEP datasets, graders and a judge you calibrated. You ran them with `askpep eval run`. Someone has to type that command. A check that lives in pytest runs wherever pytest runs, so it runs on every push.",
        },
        {
          kind: "p",
          text: "Code graders suit questions with a checkable answer, such as whether a route is right. Some questions have no code check. Does this answer rest on the passages it cites? Only a judge can say. **DeepEval** is a Python library that packages judges as metrics and runs them from pytest tests.",
        },
        {
          kind: "p",
          text: "DeepEval came with the `evals` group you added in chapter 1. It ships three metrics for RAG systems. You met their ideas in course 1, chapter 9. There you defined faithfulness, answer relevance and context recall, and wrote a faithfulness check by hand. Ragas is a second library with similar RAG metrics. Section 7 compares the two.",
        },
        {
          kind: "p",
          text: "A **test case** is one run, written down. DeepEval's class for it is `LLMTestCase`. It has four fields that matter here. `input` is the question. `actual_output` is the answer the desk gave. `expected_output` is the golden item's `reference_answer`, which an item may lack. `retrieval_context` is the text of each passage the answer cites.",
        },
        {
          kind: "p",
          text: "A **metric** reads a test case and returns a score from 0 to 1, plus a reason. Each metric has a `threshold`. A score at or above the threshold passes. `assert_test` runs a list of metrics on one case. It raises an `AssertionError` that names every metric that failed.",
        },
        {
          kind: "code",
          lang: "python",
          code: `assert_test(case, [grounding, faithfulness])
# AssertionError: Metrics: Faithfulness (score: 0.5, threshold: 0.7, ...) failed.`,
          caption: "What a failing assert_test raises. The message holds the score, the threshold and the judge's reason. Illustrative figures.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "A metric is a judge's opinion with a number on it",
          text: "Every metric in this chapter is a judge call underneath. The warning from chapter 3 still holds. A score is a model's opinion, so check the judge against your own labels before a threshold gates anything. Section 6 returns to this.",
        },
        {
          kind: "quiz",
          id: "evals04-q1",
          question: "Where does the `retrieval_context` of a test case come from?",
          options: [
            "The six chunks the retriever ranked highest, whether the answer cites them or not.",
            "The text of each passage that the desk's answer cites, in citation order.",
            "The `expected_docs` of the golden item.",
            "The reference answer, split into sentences.",
          ],
          answer: 1,
          explain:
            "The context is what the answer claims to rest on. A passage that was retrieved and never cited isn't one the answer claims to rest on. A metric that checks support must see the cited passages.",
        },
        {
          kind: "p",
          text: "The metric needs a model to call, and yours is a LangChain chat model.",
        },
      ],
    },
    {
      id: "s2-judge-model",
      title: "DeepEval needs a model object, so AskPEP's Claude judge goes in a thin wrapper",
      goal: "Why does DeepEval need your judge in a wrapper?",
      blocks: [
        {
          kind: "p",
          text: "A metric is a set of prompts sent to a judge model. By default DeepEval uses an OpenAI model and reads its key from `OPENAI_API_KEY`. AskPEP has no such key. Its judge is Claude, the model behind the `RubricJudge` of chapter 3. Claude comes from a different model family than the Gemini desk.",
        },
        {
          kind: "p",
          text: "So every metric takes a `model=` argument. It must be a `DeepEvalBaseLLM`, which is DeepEval's model interface. The interface asks for `generate` and its async twin `a_generate`. It also asks for `load_model` and `get_model_name`. `ChatJudgeModel` is AskPEP's class. It holds a LangChain chat model and calls it.",
        },
        {
          kind: "p",
          text: "A metric rarely wants prose back. It wants a verdict it can count. So it calls `generate(prompt, schema)`. The **schema** is a pydantic class that describes the reply. LangChain's `with_structured_output(schema)` makes the chat model fill that class. With no schema, `generate` returns the text of the reply.",
        },
        {
          kind: "p",
          text: "`generate` catches no errors. A judge that fails must fail the test that called it. A wrapper that swallowed the error would hand the metric an empty reply, and a test could then pass on nothing.",
        },
        {
          kind: "p",
          text: "DeepEval can run the judge calls of one metric in parallel. That is its **async mode**. The metrics in this chapter turn it off with `async_mode=False`. Each call then happens inside the test, and a failure raises there. `a_generate` simply calls `generate`.",
        },
        {
          kind: "p",
          text: "With the wrapper in place, you can write the metric this desk needs most.",
        },
      ],
    },
    {
      id: "s3-geval",
      title: "GEval scores the steps you write, and AskPEP's Grounded metric has four",
      goal: "What should a custom metric check, and who writes the steps?",
      blocks: [
        // CHECK: GEval details come from the DeepEval 4.3.1 source, not its docs: the judge scores 0 to 10 by default, DeepEval rescales to 0 to 1, and with only `criteria` it asks the judge to generate the steps.
        {
          kind: "p",
          text: "**GEval** is DeepEval's metric for criteria you write. You say which fields of the test case the judge may read. You give it steps in plain language. The judge follows them and returns a whole-number score from 0 to 10. DeepEval divides that by 10, so the score lands between 0 and 1.",
        },
        {
          kind: "p",
          text: "Write the steps yourself. Give `GEval` only a one-sentence `criteria`, and DeepEval asks the judge to invent the steps first. Then the rubric is a model's output, and it can change between runs. Steps you wrote sit in your code, where a diff shows any change.",
        },
        {
          kind: "p",
          text: "AskPEP's `GEval` metric is named `Grounded`. Its steps are the list `GROUNDING_STEPS`, which ships in your stub. They say what a grounded answer is.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Every claim in the answer must be supported by the retrieval context.",
            "A claim the context doesn't support is penalised, even when it is true in general.",
            "The answer must address the question and not drift to another topic.",
            "A short answer that is fully supported beats a long answer with one unsupported claim.",
          ],
        },
        {
          kind: "p",
          text: "Step 2 matters most. A true fact that no cited passage mentions is still a fault, because a reader can't check it against a source. Course 1, chapter 9 gave the reason: a claim from memory can't be audited. The next section shows why plain faithfulness doesn't enforce this.",
        },
        {
          kind: "p",
          text: "`evaluation_params` names the fields the judge reads. `Grounded` reads the question, the answer and the cited passages. It doesn't read the reference answer, so an item without one still works.",
        },
        {
          kind: "p",
          text: "Your own steps cover grounding. The library's RAG metrics cover other failures.",
        },
      ],
    },
    {
      id: "s4-rag-metrics",
      title: "The RAG metrics split the job into claims, statements and reference sentences",
      goal: "What does each RAG metric catch, and where is it blind?",
      blocks: [
        {
          kind: "p",
          text: "The three RAG metrics each turn one big question into many small ones for the judge. Each reads different fields. So each catches a different fault.",
        },
        {
          kind: "p",
          text: "`FaithfulnessMetric` extracts the claims from the answer. It then asks the judge whether the retrieval context agrees with each claim. The score is the share of claims that pass. It reads the answer and the retrieval context. It needs no reference answer.",
        },
        // CHECK: the faithfulness default comes from the DeepEval 4.3.1 source. The verdict prompt says no only for a direct contradiction and borderline for a claim the context doesn't back up, and `penalize_ambiguous_claims=False` counts borderline as a pass. Confirm both against the current docs.
        {
          kind: "p",
          text: "The judge answers yes, no or borderline for each claim. It says no only when the context directly contradicts the claim. A claim the context never mentions gets borderline. By default borderline counts as a pass. So a true claim from memory can slip through. That is why `Grounded` sits beside it.",
        },
        {
          kind: "p",
          text: "`AnswerRelevancyMetric` splits the answer into statements. The judge decides whether each statement is relevant to the question. It reads only the question and the answer. It catches an answer that drifts, such as a history of PEP 484 when the question was about a return type.",
        },
        {
          kind: "p",
          text: "`ContextualRecallMetric` splits the reference answer into sentences. The judge checks whether each one can be traced to the retrieval context. It tells you whether retrieval brought the evidence. It needs `expected_output`. Without a reference answer it raises `MissingTestCaseParamsError`.",
        },
        {
          kind: "p",
          text: "Read the four scores together. Low recall means the evidence never arrived, so fix retrieval. Low faithfulness with good recall means the model strayed from good passages. Low relevancy means the answer drifted. Course 1, chapter 9 drew the same map by hand.",
        },
        // CHECK: the judge-call counts come from the DeepEval 4.3.1 source with async mode off. Faithfulness makes four calls, answer relevancy three, contextual recall two, and GEval with fixed steps one. Confirm against a real run.
        {
          kind: "p",
          text: "Count the cost before you run it. Faithfulness makes four judge calls: truths from the context, claims from the answer, a verdict for each claim, then a reason. Answer relevancy makes three. Contextual recall makes two. `Grounded` makes one. That is about ten calls for each item, so ten items cost about a hundred.",
        },
        {
          kind: "widget",
          id: "evals04-score-reader",
          intro:
            "Five desk runs come with the scores of the four metrics. For each run, predict where the fault lies: in what the desk retrieved, in the claims the writer made, in the writer's focus, or nowhere. Read the scores against the 0.7 threshold, check your pick, then read the reason. The runs and figures are illustrative.",
        },
        {
          kind: "quiz",
          id: "evals04-q2",
          question: "A run scores 0.9 on faithfulness, 0.9 on answer relevancy and 0.3 on contextual recall. Where do you look first?",
          options: [
            "The writer's prompt, because the answer holds an unsupported claim.",
            "The retriever, because the evidence the reference answer needs never reached the desk.",
            "The judge, because three scores should not disagree.",
            "Nowhere, because two of the three metrics pass.",
          ],
          answer: 1,
          explain:
            "The answer rests on what it was given and it answers the question. Low recall says the reference answer's content is missing from the context. Work stage by stage, as course 1, chapter 9 did, and fix retrieval first.",
        },
        {
          kind: "quiz",
          id: "evals04-q3",
          question:
            "The desk adds a true fact from memory that no cited passage mentions. How does DeepEval's faithfulness metric score that claim by default?",
          options: [
            "As a failure, because no passage supports it.",
            "As a pass, because the verdict is borderline and borderline counts as a pass by default.",
            "It raises an error, because the claim has no source.",
            "It ignores the claim and scores only the rest.",
          ],
          answer: 1,
          explain:
            "The judge says no only for a direct contradiction. A claim the context never mentions is borderline, and borderline passes unless you set `penalize_ambiguous_claims=True`. The `Grounded` metric penalises it instead.",
        },
        {
          kind: "p",
          text: "Now the metrics have to run, and every run costs judge calls.",
        },
      ],
    },
    {
      id: "s5-run-in-pytest",
      title: "The live test runs only on request, and only it keeps DeepEval's plugin",
      goal: "How do you run a live metric without paying on every test run?",
      blocks: [
        {
          kind: "p",
          text: "`assert_desk_case` is the glue. It builds the test case with `to_test_case` and calls `assert_test(case, metrics, run_async=False)`. A test that uses it is an ordinary pytest test. Nothing in it needs DeepEval's command line.",
        },
        {
          kind: "p",
          text: "The capstone's live test is `evals/test_desk_quality.py`. It takes each answerable item of the `answer` dataset that has a reference answer. It runs the real desk on the item. Then it asserts four metrics: `Grounded`, faithfulness, answer relevancy and contextual recall.",
        },
        {
          kind: "p",
          text: "A refusal has no passages and no reference answer, so the RAG metrics can't score it. The refusal grader from chapter 2 covers refusals. This test leaves those items out.",
        },
        {
          kind: "p",
          text: "The test collects the failure of each item and asserts at the end. One run then lists every item that failed, not only the first. A judge error is not an `AssertionError`. It stops the test at once, so a broken judge never looks like a quality failure.",
        },
        {
          kind: "p",
          text: "Every metric calls a paid judge, and the desk calls paid models. So the test carries `@pytest.mark.live`, as the live tests of course 1 did. The project sets `addopts = \"-m 'not live'\"`, so a plain `pytest` skips it. Your own `-m live` replaces that filter.",
        },
        {
          kind: "p",
          text: "DeepEval installs its own pytest plugin. It loads wherever DeepEval is installed, so a plain `pytest` loads it too. The plugin prints a line for every skipped test in the whole suite. It also reports usage data. It adds nothing to a test that uses a fake judge.",
        },
        {
          kind: "p",
          text: "So `tests/plugins/evals.py` unregisters the plugin in its `pytest_configure` hook, which pytest calls at start-up. That file belongs to `tests/conftest.py`, so it governs only the tests under `tests/`. The live test sits outside `tests/`, so the plugin stays on there. `deepeval test run` needs it to build the results table.",
        },
        {
          kind: "p",
          text: "DeepEval also writes a cache folder, `.deepeval`, and a file with a telemetry id into the folder where it runs. The lab tests use a temporary folder, through the `workdir` fixture, so those files never land in your repo. A real run does write them, so the next two steps deal with them.",
        },
        {
          kind: "step",
          id: "evals04-s01",
          title: "Keep DeepEval's files out of git",
          text: "Open `.gitignore` in your AskPEP repo. Add these two lines at the end if they are not there. If you started from the course 4 template, they already are.",
          lang: "text",
          code: `.deepeval/
.deepeval_telemetry.txt`,
        },
        {
          kind: "step",
          id: "evals04-s02",
          title: "Turn DeepEval's telemetry off",
          text: "DeepEval sends usage data unless you opt out. It reads `.env` from the folder where you run it. Add this line to `.env`, and to `.env.example` so that a clone of your repo does the same. The `deepeval_metrics` module also sets it before DeepEval loads.",
          lang: "text",
          code: `DEEPEVAL_TELEMETRY_OPT_OUT=YES`,
        },
        {
          kind: "step",
          id: "evals04-s03",
          title: "Run the live test",
          text: "Do this after lab step 5. It needs the keys the desk needs: `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY` and `GOOGLE_CLOUD_PROJECT`. The run calls paid models. DeepEval prints a results table at the end. Read the reason of each failed metric. With no keys, the test skips, and DeepEval prints `No test cases found`.",
          lang: "bash",
          code: `uv run deepeval test run evals/test_desk_quality.py -m live`,
        },
        {
          kind: "callout",
          tone: "warn",
          title: "A skipped live test is not a pass",
          text: "A live test that skips because a key is missing ends the run with no failure. The run looks green and measured nothing. After a run in CI, check that the test ran. Look for the results table, or for a count of tests that passed.",
        },
        {
          kind: "quiz",
          id: "evals04-q4",
          question: "Why does `tests/plugins/evals.py` unregister DeepEval's plugin, while `evals/test_desk_quality.py` keeps it?",
          options: [
            "The plugin breaks every pytest test that uses a fake judge.",
            "In the lab tests it prints a skip line for every skipped test, reports usage data and adds nothing. `deepeval test run` needs it for the results table.",
            "The live test runs first, so the plugin is already loaded when the lab tests start.",
            "DeepEval refuses to load a plugin twice.",
          ],
          answer: 1,
          explain:
            "The plugin loads wherever DeepEval is installed. Under `tests/` it is noise. The live test sits outside `tests/`, so the unregister file doesn't reach it. The command that runs it needs the plugin to build the table.",
        },
        {
          kind: "p",
          text: "The test passes or fails against a threshold. The threshold needs its own evidence.",
        },
      ],
    },
    {
      id: "s6-trust-the-score",
      title: "A passing metric proves little until you check the judge against your labels",
      goal: "What can you defend about a threshold?",
      blocks: [
        {
          kind: "p",
          text: "The lab tests prove one thing: the wiring. The `deepeval_model` fixture is a judge that says yes to everything. A metric built on it passes. So the test shows that your metric asks the judge what you meant it to ask. It can't show that a real judge scores well.",
        },
        {
          kind: "p",
          text: "The rule from chapter 3 covers every metric here. Before a threshold gates anything, compare the scores with answers you labelled by hand. Start at 0.7, as the lab does. Then move it to the point where answers you accepted pass and answers you rejected fail.",
        },
        {
          kind: "p",
          text: "Plant a bad answer as well. Take a good run and add one sentence that no PEP says. Score it. `Grounded` should fail it. If it passes, the steps or the judge are too soft to gate on.",
        },
        {
          kind: "p",
          text: "A live run also varies. The judge is a model, so the same case can score a little differently twice. Don't set a threshold so close to your usual score that noise decides the build.",
        },
        {
          kind: "p",
          text: "The same metrics can grade a sample of real traffic after release. That is online evaluation. The LLMOps course covers it.",
        },
        {
          kind: "quiz",
          id: "evals04-q5",
          question: "A teammate lowers the threshold to 0.3 so that the live test goes green. What did they do?",
          options: [
            "They fixed the desk, because the scores now pass.",
            "They made the check weaker. A threshold only means something when it separates answers you accept from answers you reject.",
            "They calibrated the judge.",
            "They made the metric deterministic.",
          ],
          answer: 1,
          explain:
            "The scores didn't change. The bar did. Set a threshold from labelled answers, so that it passes the ones you accepted and fails the ones you rejected.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Compare offline evaluation, online monitoring and human evaluation",
          text: "Say that they answer different questions. Offline tests, like these, run a fixed set before release and catch regressions. They can't see a question nobody wrote. Online evaluation grades a sample of live traffic, and the LLMOps course covers it. People label a sample and calibrate the judge. Offline gates the release, online watches for drift, and people settle disputes.",
        },
        {
          kind: "p",
          text: "DeepEval is one tool among several, and each has a job it does best.",
        },
      ],
    },
    {
      id: "s7-alternatives",
      title: "Your own pytest harness stays the default, and each library earns one job",
      goal: "Which tool fits which job?",
      blocks: [
        {
          kind: "p",
          text: "You have now used two ways to run a check. Chapter 2's graders are plain functions in your own pytest harness. This chapter used DeepEval. Two more tools come up in interviews: Ragas and promptfoo. The table gives each a job and a price.",
        },
        // CHECK: the Ragas and promptfoo rows come from the revision 4 chapter, checked on 17 October 2026 against docs.ragas.io and promptfoo.dev. They were not re-read for revision 5. Confirm that Ragas still offers test set generation and that promptfoo still runs evals and red-team plugins from a config file.
        {
          kind: "compare",
          caption: "Four ways to run an eval. Any tool that grades with a model inherits the calibration duties from chapter 3.",
          columns: ["Tool", "Best at", "When you switch to it", "What it costs you"],
          rows: [
            [
              "Your own pytest harness",
              "Code graders, slice thresholds and a gate you fully control.",
              "This is the default. Stay here until a gap below hurts.",
              "You write and maintain every grader and judge prompt yourself.",
            ],
            [
              "DeepEval",
              "Judge metrics, such as GEval and the RAG metrics, written as pytest tests.",
              "You need judge metrics, and a failing metric must fail the build.",
              "Each metric makes several judge calls, so a run costs money and time. The judge prompts are the library's, so check them against your labels.",
            ],
            [
              "Ragas",
              "Ready-made metrics for retrieval and answer quality, and a generator for test questions.",
              "You want standard RAG numbers fast, in a notebook or a script, and no test is needed.",
              "It scores. It doesn't fail a build by itself, so you wire the gate. Most metrics are model graded, so you pay for judge calls.",
            ],
            [
              "promptfoo",
              "Comparing prompts and models side by side from a config file, and red-team checks.",
              "A prompt author wants a quick comparison and writes no Python.",
              "It is a Node tool driven by a config file, so custom logic gets awkward. It sits outside your pytest run.",
            ],
          ],
        },
        {
          kind: "p",
          text: "DeepEval doesn't replace your graders. Use code wherever code can decide, as chapter 2 said. Add a DeepEval metric only where the question needs a judge, such as whether an answer rests on its passages.",
        },
        {
          kind: "p",
          text: "You met promptfoo as a red-team runner in the guardrails course. Chapter 5 adds Braintrust, and compares LangSmith, Vertex AI evaluation and Phoenix. None of them changes the rule: keep the golden set in your own repo, so you can change tools.",
        },
        {
          kind: "widget",
          id: "evals04-tool-picker",
          intro:
            "Four AskPEP jobs follow. For each one, pick the tool you would start with: your own pytest harness, DeepEval, Ragas or promptfoo. Check your picks, then read the reasons for every tool, including the ones you rejected. The jobs are illustrative.",
        },
        {
          kind: "quiz",
          id: "evals04-q6",
          question: "AskPEP must refuse a question about something outside the PEPs, and a test must fail when it doesn't. Which tool do you start with?",
          options: [
            "DeepEval, with a faithfulness metric.",
            "Ragas, for its answer metrics.",
            "Your own pytest harness, with the refusal grader from chapter 2.",
            "promptfoo, with a judge on every answer.",
          ],
          answer: 2,
          explain:
            "Whether the desk refused is a yes or no that code can check. A harness with a code grader does it with nothing to calibrate. A judge metric would add cost and doubt to a question that has a plain answer.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Which eval tool would you pick for a new project?",
          text: "Don't name a favourite. Say you start with a hand-written harness and code graders. You adopt a tool for a specific gap, such as judge metrics that fail the build, or a shared history of experiments. Add that a model-graded metric still needs calibrating against your own labels, and that the golden set stays in your repo.",
        },
        {
          kind: "p",
          text: "You chose a tool. The product owner now asks why the threshold in the test is the number it is.",
        },
      ],
    },
    {
      id: "s8-threshold-note",
      title: "A threshold note shows why the line sits at 0.8 and what it costs",
      goal: "What evidence should a threshold carry?",
      blocks: [
        {
          kind: "p",
          text: "A **threshold note** records a metric's pass line and the labelled items that justify it. You compare your labels with the scores at each candidate line. The note also records a planted bad answer that the metric must fail.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Label ten items before you read a score.",
            "Score them with the metric.",
            "At each candidate threshold, count false passes and false fails.",
            "Plant a bad answer and check that it fails.",
            "Choose the line, and say what it costs.",
          ],
        },
        {
          kind: "p",
          text: "The default threshold in the test was 0.7. The product owner asked what would break if it were 0.8. You labelled items a01 to a10 and ran `Grounded` over them. Then you counted.",
        },
        {
          kind: "p",
          text: "At 0.7, eight answers pass. One of them, a05, is an answer you failed, so that's one false pass in eight. At 0.8, six answers pass and none is bad. The cost is one false fail, on a04, which you'd passed. You chose 0.8, because a bad answer costs more here than a good one that gets a second look.",
        },
        {
          kind: "p",
          text: "Then you planted a bad answer. You took a good run and added one sentence that no PEP says. It scored 0.5, and `Grounded` failed it. The product owner asked whether this could run on every pull request. It can't. Ten items cost about 100 judge calls, so the live test runs nightly.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# THRESHOLD-NOTE.md
Metric: Grounded (GEval, chapter 4 steps)   Judge: answer-judge   Slice: answer   Items: a01 to a10

Item  Your label  Score
a01   pass        0.9
a02   pass        0.8
a03   pass        0.9
a04   pass        0.7
a05   fail        0.7
a06   pass        1.0
a07   fail        0.4
a08   pass        0.8
a09   fail        0.6
a10   pass        0.8

Threshold  Metric passes  False passes       False fails
0.7        8              1 of 8 (a05)       0
0.8        6              0 of 6             1 (a04)

Planted bad answer: a good run plus one invented sentence. Score 0.5. Failed.
Decision: 0.8. A false pass ships a wrong answer, and a false fail costs one more read.
Cost: about 100 judge calls for 10 items, so the live test runs nightly and never on a pull request.
Review when: the judge card changes or the answer slice grows.`,
          caption: "THRESHOLD-NOTE.md. The figures belong to the story.",
        },
        {
          kind: "p",
          text: "The read-out is one line. A threshold of 0.7 lets through one bad answer in eight, and 0.8 doesn't. The planted answer shows the metric can fail at all, which a passing suite never proves. Ten items are few, so the note says when to review it.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# THRESHOLD-NOTE.md
Metric:    Judge:    Slice:    Items:

Item  Your label (written first)  Score

Threshold  Metric passes  False passes  False fails

Planted bad answer:
Decision:
Cost:
Review when:`,
          caption: "For your next system: the note with the values left blank.",
        },
        {
          kind: "p",
          text: "The second team now wants shorter answers. You can change the prompt and watch the metric, but how would you show that the change helped? That needs an experiment.",
        },
      ],
    },
  ],
  lab: {
    title: "Wire DeepEval into the PEP desk's tests",
    goal: "Write the test case, the judge wrapper, the grounding metric, the RAG metrics and the assertion. Each step starts from a stub that raises `NotImplementedError(\"evals-04 step N\")`. The tests use a judge that says yes to everything, so nothing calls a paid model. Run them from your AskPEP workspace root. Then compare your file with `capstone/src/askpep/evals/deepeval_metrics.py` in the my-learn folder.",
    minutes: 60,
    files: [
      "src/askpep/evals/deepeval_metrics.py",
      "evals/test_desk_quality.py",
      "tests/evals/test_evals04_deepeval.py",
    ],
    steps: [
      {
        title: "A test case from a run",
        text: "Write `to_test_case` in `deepeval_metrics.py`. It turns a golden item and the desk's run of it into an `LLMTestCase`. The retrieval context is the text of each citation of the answer, in citation order. A missing reference answer stays `None`. The stub raises `evals-04 step 1`.",
        code: `# src/askpep/evals/deepeval_metrics.py
def to_test_case(item: GoldenItem, result: "DeskResult") -> LLMTestCase:
    """Turn one item and the desk's run of it into a DeepEval test case."""
    # your turn: return LLMTestCase(...) with four keyword arguments.
    # input: the question of the item.
    # actual_output: the answer of the result.
    # expected_output: the reference_answer of the item. It may be None.
    # retrieval_context: a list with the text of each citation of the result, in order.
    ...`,
        test: "uv run pytest tests/evals -k evals04_s1",
      },
      {
        title: "A DeepEval model on our chat model",
        text: "Write `ChatJudgeModel.generate`. With no schema, it asks the chat model once and returns the text of the reply as a string. With a schema, it asks for structured output in that schema and returns what comes back. Catch no errors. The stub raises `evals-04 step 2`.",
        code: `# src/askpep/evals/deepeval_metrics.py
class ChatJudgeModel(DeepEvalBaseLLM):
    # __init__, load_model, a_generate and get_model_name ship complete.
    def generate(self, prompt: str, schema: "type[BaseModel] | None" = None, **kwargs: Any) -> Any:
        """Ask the chat model. Errors are not caught."""
        # your turn:
        # 1. With no schema, invoke self.chat with the prompt. Return the text of the reply as a str.
        #    The reply's .text property gives it, even when the reply is made of content blocks.
        # 2. With a schema, ask for structured output in that schema, then invoke with the prompt.
        #    LangChain's with_structured_output does the first part. Return the result as it is.
        ...`,
        test: "uv run pytest tests/evals -k evals04_s2",
      },
      {
        title: "A grounding metric",
        text: "Write `grounding_metric`. It builds a `GEval` metric named `Grounded` from `GROUNDING_STEPS`. It reads the input, the actual output and the retrieval context, and it runs with async mode off. Add `SingleTurnParams` to your `deepeval.test_case` import. The stub raises `evals-04 step 3`.",
        code: `# src/askpep/evals/deepeval_metrics.py
def grounding_metric(model: DeepEvalBaseLLM, threshold: float = THRESHOLD) -> GEval:
    """A GEval metric named "Grounded" that scores whether the answer rests on the retrieved passages."""
    # your turn: return GEval(...) with these keyword arguments.
    # name: "Grounded"
    # evaluation_steps: GROUNDING_STEPS. Pass no criteria.
    # evaluation_params: a list of SingleTurnParams.INPUT, ACTUAL_OUTPUT and RETRIEVAL_CONTEXT.
    # threshold and model: the arguments you were given.
    # async_mode: False, so a failure inside the judge raises in the test that caused it.
    ...`,
        test: "uv run pytest tests/evals -k evals04_s3",
      },
      {
        title: "The RAG metrics",
        text: "Write `rag_metrics`. It returns faithfulness, answer relevancy and contextual recall, in that order. Each gets the threshold, the model and async mode off. Build new metrics on every call, because a metric keeps the score of its last run. Add the three classes to your `deepeval.metrics` import. The stub raises `evals-04 step 4`.",
        code: `# src/askpep/evals/deepeval_metrics.py
def rag_metrics(model: DeepEvalBaseLLM, threshold: float = THRESHOLD) -> list[BaseMetric]:
    """The three RAG metrics, in this order: faithfulness, answer relevancy and contextual recall."""
    # your turn: return a list of FaithfulnessMetric, AnswerRelevancyMetric and ContextualRecallMetric.
    # Give each one threshold=threshold, model=model and async_mode=False.
    ...`,
        test: "uv run pytest tests/evals -k evals04_s4",
      },
      {
        title: "An assertion for pytest",
        text: "Write `assert_desk_case`. It builds the test case and hands it, with the metrics, to DeepEval's `assert_test`, with `run_async=False`. DeepEval measures every metric, then raises one `AssertionError` that lists each failure. A judge error must not turn into an assertion failure. Add `from deepeval import assert_test`. The stub raises `evals-04 step 5`.",
        code: `# src/askpep/evals/deepeval_metrics.py
def assert_desk_case(item: GoldenItem, result: "DeskResult", metrics: list[BaseMetric]) -> None:
    """Fail when any metric scores the run under its threshold."""
    # your turn: build the test case with to_test_case, then call
    # assert_test(case, metrics, run_async=False). Return nothing.
    ...`,
        test: "uv run pytest tests/evals -k evals04_s5",
      },
    ],
    verify: "uv run pytest tests/evals -k evals04",
  },
  recap: [
    "A DeepEval test is a pytest test whose assertion is a metric score.",
    "A test case holds the question, the answer, the reference answer and the passages the answer cites.",
    "`ChatJudgeModel` puts the Claude judge behind DeepEval's model interface and lets every error through.",
    "`GEval` scores steps you write, and each RAG metric splits the job into small questions for the judge.",
    "Faithfulness passes a claim the context never mentions by default, so `Grounded` sits beside it.",
    "Only the live test needs DeepEval's plugin, so the lab tests unregister it and `deepeval test run` loads it.",
    "A threshold note compares your labels with the scores at each candidate line and plants one bad answer that must fail.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In DeepEval I learned that a check in pytest runs on every change. I also learned that a metric is a judge's opinion until I check it against my labels. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["evals-q07", "evals-q08"],
};

export default chapter;
