import type { InterviewQuestion } from "../types";

const questions: InterviewQuestion[] = [
  // real Q28
  {
    id: "evals-q01",
    course: "evals",
    category: "datasets",
    level: "core",
    chapterId: "evals-01-golden-sets-for-a-system",
    source: "practice",
    question: "How would you evaluate a RAG or agent system?",
    idealAnswer:
      "I would start with a versioned golden set, cut into slices, and measure each part of the system on its own. For the PEP desk I keep five slices: retrieval, routing, answer, action and attack. Each holds 12 to 25 items. Retrieval is scored by recall at 6, which tells me whether the evidence reached the model. Routing checks that triage sent the question to the right agent. The answer slice checks the cited PEPs and whether the desk refuses what it cannot answer, and a calibrated judge scores faithfulness. For an agent the unit is the task, not the answer. The action slice grades the tool calls, their arguments and the step count. The attack slice counts the attacks that got through. I use code graders wherever one answer can be looked up. I add a judge only for open criteria, and I send ambiguous cases to people. The trade-off is cost against coverage. A small, sliced set I trust beats a large set nobody reads. Where a slice is thin, I say so and grow it from real failures.",
    keywords: ["golden set", "slices", "recall at 6", "routing", "faithfulness", "task completion", "tool arguments", "code graders", "human review"],
    followUps: [
      "How do you separate a retrieval failure from a generation failure?",
      "How would you score an agent that finishes the task by a different route than your reference?",
      "What do you do when a slice holds only twelve items?",
    ],
  },
  {
    id: "evals-q02",
    course: "evals",
    category: "datasets",
    level: "core",
    chapterId: "evals-01-golden-sets-for-a-system",
    question: "How do you build a golden set, and how big does it need to be?",
    idealAnswer:
      "Build it from real cases, cut it into slices, and size each slice by the decision it has to support. For the PEP desk I started with the 22 retrieval questions from the RAG course. Then I added routing, answer, action and attack items, 89 in all. Each item is a record with a slice, a source and the labels its graders need, such as expected PEPs or expected tools. A validator rejects an item that breaks the rules of its slice. Released files are versioned and never edited. A manifest records each file's item count and sha256, so a changed file fails to load. New items come from real failures. Size depends on the slice, not the total. In a slice of 12 items, one item shifts the rate by 8.3 points, so a floor on it is coarse. I grow the slices that gate a release first. I keep the items out of the prompts, because a pasted example inflates its own score. When a PEP changes, I fix the item in a new version. The trade-off is labelling effort against resolution.",
    keywords: ["slices", "validator", "versioned files", "manifest sha256", "real failures", "item resolution", "leakage", "staleness"],
    followUps: [
      "How do you stop the golden set leaking into your prompts?",
      "Who labels it, and how do you know the labels are right?",
      "When would you retire an item?",
    ],
  },
  {
    id: "evals-q03",
    course: "evals",
    category: "graders",
    level: "core",
    chapterId: "evals-02-graders",
    question: "When do you use an exact check, a partial match or a model grader?",
    idealAnswer:
      "I use the cheapest grader that is right, and that is usually code. Exact match fits the route. The item names one of four routes, and the desk either chose it or did not. Citations are a set comparison on the PEP numbers the desk cited. The grader reads the result's citation list, not the answer text. Tool arguments need a partial match. The helper `args_match` needs every expected key, ignores extra keys, accepts a list in any order and compares text whole, ignoring case. Refusal reads one flag on the result. A model grader is for criteria no rule can express, such as whether every claim follows from the cited passage. Model graders cost money, add noise and need calibration against human labels, so they come last. Humans handle the ambiguous and the high-stakes cases. The trade-off is precision against coverage. Code is exact and narrow, and a judge is broad and fuzzy. I also unit-test the graders with known-good and known-bad runs, because a grader is code and has bugs.",
    keywords: ["exact match", "set comparison", "partial match", "args_match", "refusal flag", "model grader", "calibration", "grader tests"],
    followUps: [
      "How do you decide what a partial match may ignore?",
      "How do you test a grader?",
      "What would make you replace a code grader with a model grader?",
    ],
  },
  {
    id: "evals-q04",
    course: "evals",
    category: "graders",
    level: "deep",
    chapterId: "evals-02-graders",
    question: "How do you grade the arguments an agent passes to a tool?",
    idealAnswer:
      "I grade the arguments key by key against what the item expects. I decide what counts as a match before I run anything. For the PEP desk, an item lists the arguments one tool must receive, such as the PEP number for a ticket. I use a partial match. Every expected key must be present, and extra keys are fine, because the desk may add harmless ones. A list matches in any order. Text matches whole, ignoring case, so a substring does not count. A number matches only an equal number, so the string '634' does not match 634. A bool matches only the same bool, because Python treats true as 1. A tool is met when any one call of that name matches, so a retry with the right query passes. The score is the share of tools met, and the reason names each miss, such as a tool that never ran. I keep this grader apart from the path check. An item with no expected arguments passes it even when no tool ran, so the trajectory check has to catch that. The trade-off is strictness against usefulness.",
    keywords: ["partial match", "expected keys", "extra keys", "bool check", "any call matches", "share of tools met", "reason names the miss", "path check"],
    followUps: [
      "Why does the grader ignore extra keys?",
      "A desk searched twice and got the second query right. Does it pass?",
      "Which grader catches a tool that never ran?",
    ],
  },
  {
    id: "evals-q19",
    course: "evals",
    category: "graders",
    level: "core",
    chapterId: "evals-02-graders",
    question: "Your desk refuses 95 percent of the questions it should refuse. Is that good?",
    idealAnswer:
      "I can't tell yet, because one number can't be judged alone. A desk that refuses every question scores 100 percent on the questions it should refuse. So I ask for the second rate, which is how often it refuses a question it should have answered. I report both rates together, with the slice each comes from. On the answer slice, 4 of the 14 items have no answer in the PEPs. A desk that refuses everything passes those 4 and fails the other 10. The grader reads two fields, the item's answerable flag and the result's refused flag. It fails an answerable item that was refused. It also fails an unanswerable item that was not. Each failure has its own reason. A model that declines in its own words sets no flag. The grader reads that as an answer. That is the right result, because the desk is meant to use the fixed refusal text. I pair the refusal check with the citation check on the same slice. Together they say whether the desk answered when it should, and cited the right PEP.",
    keywords: ["refusal rate", "answerable and unanswerable items", "both directions", "refuses everything", "refused flag", "per slice", "citations"],
    followUps: [
      "Why does the answer slice need citations and refusal together?",
      "What does a model that declines in its own words do to the grader?",
      "How would you add a third number?",
    ],
  },
  // real Q30
  {
    id: "evals-q05",
    course: "evals",
    category: "judges",
    level: "core",
    chapterId: "evals-03-judges-and-calibration",
    source: "practice",
    question: "How do you use RAGAS, DeepEval or an LLM as a judge?",
    idealAnswer:
      "I use them to run chosen metrics repeatably, not to decide what quality means. First I write the rubric and label a sample myself. For the PEP desk that was 24 labelled answers. Then I run the judge on the same cases and compare. I report Cohen's kappa and the false pass rate, because raw agreement hides chance. RAGAS and DeepEval ship ready-made metrics such as faithfulness and answer relevance. Each metric is a judge prompt underneath, so I check it against my labels like any other judge. I know the biases. I can measure position bias by swapping the order of the sources, and length bias by padding the answer. I control self-preference by judging with another model family. The desk runs on Gemini and the judge is Claude. I pin the judge model and the rubric, and I keep the labelled set frozen. A change to either means a new calibration. Where a code check works, I use that instead. The trade-off is scale against trust, so I report a judge score with its measured kappa.",
    keywords: ["rubric", "labelled sample", "Cohen's kappa", "false pass rate", "position bias", "length bias", "self-preference", "pinned judge", "frozen set"],
    followUps: [
      "How many labelled examples do you need to calibrate a judge?",
      "Would you let a judge gate a release on its own?",
      "What do ready-made metrics hide from you?",
    ],
  },
  {
    id: "evals-q06",
    course: "evals",
    category: "judges",
    level: "deep",
    chapterId: "evals-03-judges-and-calibration",
    question: "Your LLM judge disagrees with your reviewers. What do you do?",
    idealAnswer:
      "I treat the disagreement as data and read the cases before I change anything. First I measure it. I build a grid of judge verdict against human label for the 24 labelled cases, and I compute agreement and Cohen's kappa. An agreement of 80 percent can be a kappa of only 0.53, because chance explains much of it. Then I read a sample from each off-diagonal cell. The false pass is the costly one, where the judge passes an answer a reviewer failed. If the judge is too lenient, the rubric is usually vague, or the judge rewards long answers. If it is too strict, the rubric may ask for something the reviewers never cared about. Sometimes the labels are wrong, and then the label needs fixing, not the judge. I sharpen the rubric, rerun on a held-out set and recompute kappa. Under 0.4 the judge is not yet a measuring tool. At 0.6 or more, with few false passes, it can gate a release. The trade-off is judge cost against reviewer time.",
    keywords: ["confusion grid", "agreement", "Cohen's kappa", "false pass", "rubric", "off-diagonal cases", "held-out set", "human arbitration"],
    followUps: [
      "What if two of your reviewers disagree with each other?",
      "How do you avoid overfitting the rubric to the cases you read?",
      "What kappa would you accept before the judge gates a release?",
    ],
  },
  // real Q29
  {
    id: "evals-q07",
    course: "evals",
    category: "methods",
    level: "core",
    chapterId: "evals-04-deepeval-in-pytest",
    source: "practice",
    question: "Compare offline evaluation, online monitoring and human evaluation.",
    idealAnswer:
      "They answer different questions, so I use all three. Offline evaluation runs a fixed dataset before release. For AskPEP that is the 89 golden items and the DeepEval tests in pytest. It is repeatable and cheap per run, and it catches regressions. Its weakness is that the dataset is a snapshot, so it cannot see a question nobody wrote. A passing offline test can also prove only the wiring, not the quality. Online evaluation grades a sample of live traffic after release. It uses sampled judges, user feedback, latency and cost. It sees reality, but most requests have no ground truth, so quality is an estimate. Human evaluation handles ambiguous and high-stakes cases, and it calibrates the judges. People label a sample, and the judge is checked against those labels with kappa. It is the most trusted and the slowest and most expensive. So offline gates the release, online watches for drift, and humans audit a sample and settle disputes. I send online failures back into the golden set as new items. The trade-off is cost against confidence, and I spend human time where the risk is highest.",
    keywords: ["offline regression", "online sampling", "human review", "ground truth", "drift", "user feedback", "calibration", "golden set feedback"],
    followUps: [
      "Which metric would tell you quality dropped online without ground truth?",
      "Where would you spend human review time once a judge is calibrated?",
      "How do online findings flow back into the offline set?",
    ],
  },
  {
    id: "evals-q08",
    course: "evals",
    category: "methods",
    level: "senior",
    chapterId: "evals-04-deepeval-in-pytest",
    question: "Which eval tool would you pick for a new project, and why?",
    idealAnswer:
      "I would start with the team's test runner and a small hand-written harness. I adopt a tool only when a specific need justifies it. For AskPEP that was pytest, code graders and a versioned golden set. It gives me full control, runs in CI and adds no dependency. I switch when the pain is real. DeepEval fits when a failing judge metric must fail the build, because it writes metrics as pytest tests. RAGAS fits when I want standard RAG numbers fast, in a script or a notebook. promptfoo fits comparing prompts and models from a config file, and running red-team checks. If I need hosted experiment history and shared dashboards, I would look at Braintrust, LangSmith or Phoenix. The choice depends on the language stack and on whether data may leave the customer's environment. It also depends on who reads the results. The costs are lock-in and hidden judge prompts that I cannot inspect. Metric names also sound precise while they hide a rubric. Whatever I pick, I calibrate its judges against my own labels. I keep the golden set in my repository, so I can change tools.",
    keywords: ["pytest harness", "RAGAS", "DeepEval", "promptfoo", "Braintrust", "LangSmith", "Phoenix", "data residency", "lock-in"],
    followUps: [
      "What would make you build your own judge instead of using a built-in metric?",
      "How do you keep your golden set portable between tools?",
      "The customer cannot send data to a hosted service. What changes?",
    ],
  },
  // real Q31
  {
    id: "evals-q09",
    course: "evals",
    category: "experiments",
    level: "deep",
    chapterId: "evals-05-braintrust-experiments",
    source: "practice",
    question: "How would you compare zero-shot, few-shot and reasoning prompts for the PEP desk?",
    idealAnswer:
      "I would run each prompt as one experiment on the same 14 answer items. The model, settings and graders stay fixed, so only the prompt changes. A zero-shot prompt gives instructions only. A few-shot prompt adds worked examples. A reasoning prompt asks the model to think first. I write the decision rule before I see a number. For example, ship the variant if it gains five points and clears the noise band. It must also cost under 20 percent more tokens per passing question. I measure the refusal and citation pass rates. I also add up tokens in and out, then divide by the items that passed. Quality alone is not the answer. A reasoning prompt can gain a point and cost three times as much. Outputs vary between runs, so I repeat each prompt and compare the spread, not one score. Few-shot examples must not come from the answer slice, or leakage inflates the score. On 14 items the noise band is about 30 points, so I usually add items before I decide.",
    keywords: ["one variable", "same items", "decision rule first", "tokens per passing question", "noise band", "repeat runs", "leakage", "slices"],
    followUps: [
      "How many repeat runs would you do, and why?",
      "How do you choose few-shot examples without leaking?",
      "When would a reasoning prompt be worth the extra cost?",
    ],
  },
  {
    id: "evals-q10",
    course: "evals",
    category: "experiments",
    level: "senior",
    chapterId: "evals-05-braintrust-experiments",
    question: "One prompt scores two points higher. Is it really better?",
    idealAnswer:
      "Not until I know how big the noise is. First, how many items are there? Treat the score as a pass rate p on N items. Its standard error is about the square root of p times one minus p, over N. At 0.80 on 14 items that is about 11 points. The gap between two scores has a standard error about 1.4 times larger. I call two of those the noise band, which is about 30 points here. A two-point gap sits far inside it. Four times the items halve the band, so 56 items give about 15 points and 224 give about 8. Second, how much does one prompt vary between runs? If I rerun the same prompt and the score moves, the gap tells me nothing. So I repeat the runs. Third, I look at slices. A gain on easy questions and a loss on refusals is not a win. Fourth, I set tokens beside quality. If the evidence is still thin, I add items or I decline to decide. A bootstrap interval is the sharper tool, and the release gate uses one. Saying that the data cannot yet tell is a valid answer.",
    keywords: ["standard error", "sample size", "run-to-run variance", "noise band", "slices", "tokens", "bootstrap interval", "decline to decide"],
    followUps: [
      "How would you test the difference formally?",
      "Why does a small slice need an interval?",
      "How many more items would you need to detect a two-point gain?",
    ],
  },
  // real Q32
  {
    id: "evals-q11",
    course: "evals",
    category: "regression",
    level: "senior",
    chapterId: "evals-08-release-gate",
    source: "practice",
    question: "What do you do when quality drops after a release?",
    idealAnswer:
      "I confirm the drop, contain it, find the first changed stage, then fix it and lock it in as a test. First I check that the drop is real, and not a labelling or traffic shift. If it is real and a limit is breached, I roll back, because users matter more than the diagnosis. Then I compare versions. I run the five slices on both and read the gate's report. It names each slice whose interval sits below the last accepted run. The failed runs show the first score that failed, so I code them and count the codes. The cause is often not the model. It can be a prompt edit, a re-ingested PEP or a changed tool description. Once I find it, I ship a measured fix and add the failing cases as items, so the same regression cannot return. Afterwards I ask why the gate missed it. The gate sees only the cases we wrote, so the answer is often a missing slice or too few items. Live traffic then feeds new items back into the set.",
    keywords: ["rollback", "slice comparison", "baseline report", "first failed score", "failure codes", "regression item", "release gate", "containment"],
    followUps: [
      "How do you tell a real drop from a traffic shift?",
      "Why roll back before you understand the cause?",
      "Which slice would you have wanted in the release gate?",
    ],
  },
  // real Q56
  {
    id: "evals-q12",
    course: "evals",
    category: "regression",
    level: "senior",
    chapterId: "evals-08-release-gate",
    source: "practice",
    question: "How do you know whether a fallback or an optimisation harmed quality?",
    idealAnswer:
      "I compare the old and new versions slice by slice, and I never trust the aggregate alone. Take a change meant to save tokens. One example is running the single-agent baseline design instead of the handoffs design. I run both through the same five slices with the same graders. I record each slice's pass rate with a bootstrap interval, and the tokens per passing item. I read quality and cost together. A saving that costs accuracy on one slice is not a saving. The aggregate can hide the harm. Suppose the change breaks only the action slice, which has 12 items. The overall rate barely shifts while that slice falls. So the gate's baseline rule asks, slice by slice, whether the whole interval sits below the last accepted run. For live traffic I tag each request with its design and prompt version. Then I grade a sample from each cohort. I release in stages, with rollback limits set first. The trade-off is the sample a stable reading needs against the speed of the rollout.",
    keywords: ["slice by slice", "baseline rule", "bootstrap interval", "tokens per passing item", "request tags", "cohort sample", "staged release", "rollback limits"],
    followUps: [
      "The fallback only fires on five percent of traffic. How do you get a reliable reading?",
      "What would you tag on every request, and why?",
      "How do you set a rollback limit before you have data?",
    ],
  },
  // real Q63 (derived from postings P9 Trainline and P7 Culture Amp in setup/revision4/market-2026.md)
  {
    id: "evals-q13",
    course: "evals",
    category: "error-analysis",
    level: "core",
    chapterId: "evals-07-error-analysis-and-synthetic-data",
    source: "practice",
    question: "An AI feature fails sometimes and has no metrics. Where do you start?",
    idealAnswer:
      "I start by reading real runs, before I choose any metric. I draw 50 to 100 runs at random and read each one by hand. For every failed run I write one note in plain words about what went wrong. A random draw gives me the failure rate and the mix of failures together. Then I group the notes into codes. Each code names a cause, such as a question that never names its PEP, not a symptom, such as a wrong answer. Take a made-up example of 62 desk runs, where 17 fail and six of those share one code, `missed_retrieval`. No metric picked in advance would have shown that. After that I turn each code into a check. Rules become code graders, and judgement calls become golden items. The trade-off is time, because a hundred runs takes hours. I accept that, since a score picked blind only measures what I guessed would go wrong. Sample size matters. A failure that hits 5 percent of runs escapes 50 reads about 8 times in 100. I repeat the read every week on a fresh sample.",
    keywords: ["failed runs", "open coding", "failure codes", "random sample", "counts", "causes not symptoms", "grader", "golden item"],
    followUps: [
      "Why not start with an LLM judge score?",
      "How many runs do you read, and how do you know that is enough?",
      "How do you check that two people code the same failure the same way?",
    ],
  },
  // real Q64 (derived from postings P9 Trainline and P8 9th Direction in setup/revision4/market-2026.md)
  {
    id: "evals-q14",
    course: "evals",
    category: "error-analysis",
    level: "deep",
    chapterId: "evals-07-error-analysis-and-synthetic-data",
    source: "practice",
    question: "You found six failure categories in your traces. What do you fix first, and how do you stop them returning?",
    idealAnswer:
      "I fix the category that removes the most failures for the least effort, weighted by harm. I count the codes and sort them. In a made-up table of 17 failed desk runs, `missed_retrieval` has six, which is 35 percent. Fixing it alone lifts the pass rate from 73 percent to 82 percent. Then I ask what each fix costs in days. A one-day fix for six failures goes before a five-day fix for five. I also check harm. A rare `wrongly_answered` run shows the user an answer the PEPs cannot support. That can outrank a common failure that only gives no answer. Small counts are rough. Six against two is a real gap, but two against one is not, so I do not rank codes that differ by one. To stop a category returning, I write the check before the fix. I add test items for the cause, watch them fail, fix the search and watch them pass. I score the fix on a fresh sample, not on the runs I read. Then I repeat the sample every week.",
    keywords: ["failure table", "failures per day of effort", "harm", "small counts", "check before fix", "test items", "fresh sample", "weekly sample"],
    followUps: [
      "Two categories have counts of five and four. How do you order them?",
      "How do you avoid overfitting the fix to the runs you read?",
      "When do you stop adding failure codes?",
    ],
  },
  // real Q65 (market-2026 P9 (Trainline, agentic and eval heavy), P8 (9th Direction), I4 (PracHub, agents and evals))
  {
    id: "evals-q15",
    course: "evals",
    category: "agents",
    level: "deep",
    chapterId: "evals-06-trajectory-evals",
    source: "practice",
    question: "How do you grade an agent run when more than one path reaches the right answer?",
    idealAnswer:
      "I grade constraints, not one fixed sequence. Take item t10, where the user asks the desk to look up PEP 20 and open a ticket. The item lists `search_peps` and then `open_ticket` as the expected tools. The check is an ordered subsequence. The desk must call both in that order, and steps between them are fine. A better route, such as reading a section first, still passes. The second check is a step limit. The item allows 9 model calls, and a run that loops past that fails. The third check is completion. A run that the loop guard or a spent budget stopped fails. A run that paused for approval passes, because it did everything up to the pause. The score is the share of the three checks that pass, and the reason names each failure. Tool names alone miss a wrong argument, so a separate grader compares the arguments. I list only the tools that carry the policy. A strict sequence check punishes a better route and teaches the team to tune to the grader.",
    keywords: ["ordered subsequence", "expected tools", "step limit", "completion", "approval pause", "argument grader", "constraints not sequence", "partial score"],
    followUps: [
      "Two runs reach the same end with different tools. How do you decide which is better?",
      "Who judges whether a path is acceptable, and how do you check the judge?",
      "How do you stop the grader from becoming the thing the team optimises for?",
    ],
  },
  // real Q66 (market-2026 P9 (Trainline, agentic and eval heavy), I4 (PracHub, agents and evals))
  {
    id: "evals-q16",
    course: "evals",
    category: "reliability",
    level: "senior",
    chapterId: "evals-06-trajectory-evals",
    source: "practice",
    question: "Your agent passes 90 percent of runs. Is it ready to run unattended?",
    idealAnswer:
      "Not on that number alone. I need to know how it is used and how long a run is. A plain pass rate is pass at one. For unattended work I want pass^k, the chance that all k runs pass, because nobody picks the best run. Take item t10 run five times, with three passes. Pass@2 is 0.9, while pass^2 is 0.3. The two numbers describe different deployments. Then I check the run length, because step failures compound. If 90 percent is per step, an 8-step run succeeds about 43 percent of the time. At 95 percent per step it is 66 percent, and at 99 percent it is 92 percent. Steps share one context, so independence is only an approximation. I measure the real rate by repeating each item with `--runs 3` and reading pass^k. Repeats cost real model calls, so I choose k with the bill in mind. If the number falls short, I shorten the run, add an approval pause, or keep a person in the loop.",
    keywords: ["pass^k", "pass@k", "compounding", "per-step rate", "unattended", "repeat runs", "approval pause", "run length"],
    followUps: [
      "How many runs per item would you pay for, and why?",
      "How would you raise an 8-step run from 43 percent to 66 percent without a better model?",
      "When is pass@k the right number to report instead?",
    ],
  },
  // real Q67  (market-2026 topic 2 "Evals": P7 Culture Amp posting, eval datasets and human labelling; P9 Trainline posting, eval sets as a core discipline)
  {
    id: "evals-q17",
    course: "evals",
    category: "datasets",
    level: "deep",
    chapterId: "evals-07-error-analysis-and-synthetic-data",
    source: "practice",
    question: "How do you use synthetic data in an eval set without fooling yourself?",
    idealAnswer:
      "I treat every generated case as a claim to check, and I never grade a model on questions it wrote. Take item a01, which asks for the maximum line length PEP 8 recommends. The answer is 79 characters. A model rewords it, and the new item inherits the labels. Each generated item carries the source `synthetic`, so I can score it apart and delete a bad batch. Code drops the cheap failures: blank entries, repeats of the original, duplicates and items that fail the validator. Code cannot catch a change of meaning. A rewording that asks about docstrings has the answer 72 characters, yet it inherits the label 79. It passes every filter. So a person reads what the code keeps, all of it while the set is small and a random 50 when it grows. I generate with a model from another family than the desk. Rewordings test whether a fix holds when the wording changes. Three rewordings of 14 items are 42 questions about the same 14 facts. The trade-off is volume against trust.",
    keywords: ["synthetic source tag", "inherited label", "validator filters", "meaning change", "human read", "different model family", "score separately", "rewordings"],
    followUps: [
      "Why do rewordings of 14 items not widen your topic coverage?",
      "The generator and the system under test are the same model. What goes wrong?",
      "How do you decide which slice to generate for next?",
    ],
  },
  // real Q68  (market-2026 topic 2 "Evals" and the guardrails topic: P8 9th Direction posting, prompt injection; P7 Culture Amp posting, guardrails and eval datasets)
  {
    id: "evals-q18",
    course: "evals",
    category: "adversarial",
    level: "deep",
    chapterId: "evals-08-release-gate",
    source: "practice",
    question: "How would you test an AI system against adversarial inputs?",
    idealAnswer:
      "I write attacks against each rule the system promises to keep, and I report the attack success rate. An attack names the rule it tests, the input, and the outcome that counts as a success. The PEP desk has 25 attacks. One kind succeeds when the desk opens a ticket it should not have. Another kind succeeds when a planted phrase appears in the answer. The grader checks that state or text, not a reference sentence. I play the set against the guarded desk and against an unguarded one. In the offline run, 23 of 25 attacks succeed against the unguarded desk and none against the guarded one. That zero is in-sample, because I wrote the attacks with the guards in view. So I read it as a regression test, not as proof of safety. The set is versioned. When I add attacks, I report them apart from the original 25. The release gate gives the slice a ceiling of 5 percent. At 25 attacks one success is 4 points, so the gate allows exactly one. People find new kinds of attack, and tools add volume.",
    keywords: ["stated rule", "success outcome", "attack success rate", "guarded and unguarded", "in-sample", "versioned set", "ceiling", "regression test"],
    followUps: [
      "Who writes the attacks, and why?",
      "Why is a score of 0 of 25 weak evidence?",
      "How does this connect to a red-team programme?",
    ],
  },
  {
    id: "evals-q20",
    course: "evals",
    category: "release",
    level: "senior",
    chapterId: "evals-08-release-gate",
    question: "How would you gate a release on evals in CI?",
    idealAnswer:
      "I split the golden set into slices and give each slice one number and a limit. Retrieval, routing, answers and actions get a floor. The attack set gets a ceiling, because a high rate there is bad. Each rate gets a bootstrap interval, so one unlucky item on a small slice does not flap the gate. A slice fails past its limit. It also fails when the whole interval sits on the wrong side of the last accepted run. Then the drop is bigger than the noise. The gate is one command with exit codes I can read in CI. Zero means ship. One means a slice failed. Two means bad input or a provider error. Three means a crash in the gate itself, so nobody hunts for a regression that isn't there. Each run writes a JSON report, and CI keeps it as an artefact. The job signs in to the cloud with workload identity federation, so no key file sits in the repository. The gate sees only the cases I wrote, so I feed production failures back into the slices.",
    keywords: ["slices", "floor and ceiling", "bootstrap interval", "baseline", "exit codes", "report artefact", "workload identity federation", "flapping"],
    followUps: [
      "Why does a small slice need an interval?",
      "What does the gate do on a pull request from a fork?",
      "Why give a crash its own exit code?",
    ],
  },
  {
    id: "evals-q21",
    course: "evals",
    category: "release",
    level: "senior",
    chapterId: "evals-09-first-release",
    question: "A change raised the overall eval score, but the release gate failed it. What do you do?",
    idealAnswer:
      "I read the failing slice before I look at the headline. An overall score adds slices together, so a big gain in one can cover a real loss in another. Say retrieval rose by eleven items and the action slice fell by two. The total went up by nine, and the gate still failed the action slice on its floor. I check which rule fired. A floor and a baseline rule mean different things. Then I read the failed runs and find the cause. In that case the fix added a graph step, so two action items went over their step limits. I'd narrow the fix so that it runs only where it helps. I rerun the gate and confirm the first gain held. I don't lower the floor to get the release out. If the business needs a waiver, a named owner signs it with a date to fix it. Attack limits are never waived. Finally I accept the passing report as the new baseline, so the next change has an honest comparison.",
    keywords: ["read the failing slice", "pooled score hides loss", "floor versus baseline rule", "narrow the fix", "rerun the gate", "waiver has an owner", "new baseline"],
    followUps: [
      "What if the failing slice has only 12 items?",
      "When would you accept a waiver?",
      "How do you stop people rerunning until it passes?",
    ],
  },
  {
    id: "evals-q22",
    course: "evals",
    category: "release",
    level: "core",
    chapterId: "evals-09-first-release",
    question: "When is an eval result good enough to ship?",
    idealAnswer:
      "It's good enough when it answers a decision someone has written down, and when the limits were set before the run. I want one number per slice, each with a limit and an interval. I want a baseline on the same dataset version, because comparing across versions means nothing. Code graders should carry everything they can. If a judge decides anything, I need its calibration: kappa against human labels, false passes and an expiry for when the model changes. I look at the interval too. Twelve items passing at 83 percent can still mean 58 percent. So I ship on a slice that clears its floor, and I record the width as an accepted risk with a name on it. For a security row, I want the control measured on every release, not once. Then I write what wasn't released and why, and what would reverse the decision. A passing gate only covers the cases you wrote. Live traffic needs its own evaluation, so I'd say what isn't measured yet.",
    keywords: ["decision written first", "limits set before the run", "same dataset version", "calibrated judge with expiry", "interval as accepted risk", "what was not released", "reversal condition", "live traffic not covered"],
    followUps: [
      "Who should sign the release?",
      "What would you do with a judge whose kappa is 0.55?",
      "How many items would you want in a slice?",
    ],
  },
];

export default questions;
