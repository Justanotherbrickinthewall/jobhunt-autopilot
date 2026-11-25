import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "evals-06-trajectory-evals",
  course: "evals",
  number: 6,
  title: "Grade the path the desk took as well as its answer",
  tagline: "The answer was right. Did the desk get there the way it should have?",
  minutes: 55,
  objectives: [
    "Explain what a trajectory grader catches that an answer grader misses.",
    "State the three checks of `grade_trajectory`, and score a run against them.",
    "Compute pass@k and pass^k from recorded runs, and say which one fits a deployment.",
    "Summarise repeated runs of a slice with `reliability` and the `--runs` option.",
    "Work out how per-step success compounds over a long run.",
    "Write an autonomy note, and say why pass^k decides it.",
  ],
  sections: [
    {
      id: "s1-answer-and-path",
      title: "A right answer can hide a wrong path, so grade the path as well",
      goal: "What can a right answer hide?",
      blocks: [
        {
          kind: "p",
          text: "Chapter 2 gave you four code graders for the desk: `grade_citations`, `grade_route`, `grade_tool_args` and `grade_refusal`. They score what the desk cited, which route it took, what each tool received and whether it refused. None of them asks how the desk got to its answer. This chapter adds that question.",
        },
        {
          kind: "p",
          text: "Item t10 sits in the action slice of your datasets. The user asks the desk to look up PEP 20 and open a ticket about it. Three fields describe the path the desk should take.",
        },
        {
          kind: "code",
          lang: "json",
          code: `{
  "id": "t10",
  "question": "Look up PEP 20 and open a ticket saying the Zen needs a translation note.",
  "slice": "action",
  "expected_tools": ["search_peps", "open_ticket"],
  "expected_args": { "open_ticket": { "peps": [20] } },
  "max_steps": 9
}`,
          caption: "Item t10, with its source field left out. The three path fields are expected_tools, expected_args and max_steps.",
        },
        {
          kind: "p",
          text: "`expected_tools` lists the tools the desk should call, in order. `expected_args` gives the arguments one of them must receive. `max_steps` is the most model calls the run may use.",
        },
        {
          kind: "p",
          text: "Now suppose the desk opens that ticket without searching first. The ticket has the right arguments, and the answer reads well. A grader that checks the answer and the arguments passes the run. The desk never read PEP 20, so the ticket text may be invented.",
        },
        {
          kind: "p",
          text: "The multi-agent course turned a run into a trajectory: the tool calls, the handoffs and the final answer, in order. A **trajectory grader** scores that list, and this chapter's `grade_trajectory` is one. It checks the tools, the step count and whether the run finished.",
        },
        {
          kind: "callout",
          tone: "analogy",
          title: "A driving test",
          text: "An examiner who only checks that you reached the car park would pass a driver who ran two red lights. The route is part of the test. Grade the desk the same way.",
        },
        {
          kind: "quiz",
          id: "evals06-q1",
          question: "The desk opens a ticket for PEP 20 with the right arguments but never calls `search_peps`. Which grader catches it?",
          options: [
            "`grade_tool_args`, because the arguments are wrong.",
            "`grade_trajectory`, because `search_peps` is missing from the tool steps.",
            "`grade_citations`, because the ticket carries no citation.",
            "None. The run reached the right end, so no grader objects.",
          ],
          answer: 1,
          explain:
            "The arguments match, so the argument grader passes. The path has no `search_peps` step, so the tool check of the trajectory grader fails. Only a grader of the path sees a missing lookup.",
        },
        {
          kind: "p",
          text: "A path needs rules before anything can grade it.",
        },
      ],
    },
    {
      id: "s2-three-checks",
      title: "Three checks grade a path: tool order, step count and completion",
      goal: "What are the rules for grading a path?",
      blocks: [
        {
          kind: "p",
          text: "`grade_trajectory` makes three checks on a run and scores the share that pass. You build it in this chapter's lab.",
        },
        {
          kind: "p",
          text: "Each step of a trajectory has an `agent`, a `kind`, a `name`, its `args` and an `ok` flag. The `kind` is `tool`, `handoff` or `answer`. A handoff such as `transfer_to_writer` is a step, but it is not a tool.",
        },
        {
          kind: "p",
          text: "The first check is tool choice. Take the names of the steps whose `kind` is `tool`. The item's `expected_tools` must appear among them, in order. Other steps may sit between them, so an extra `read_pep_section` does not fail the run.",
        },
        {
          kind: "p",
          text: "A step counts whether or not its `ok` is true. Course 3 made `open_ticket` pause for a person, so its step has `ok` false. It was still the right call.",
        },
        {
          kind: "code",
          lang: "python",
          code: `names = ["search_peps", "read_pep_section", "open_ticket"]

remaining = iter(names)
all(tool in remaining for tool in ["search_peps", "open_ticket"])  # True

remaining = iter(names)
all(tool in remaining for tool in ["open_ticket", "search_peps"])  # False`,
          caption: "The order test. The word in on an iterator uses it up to the match, so each tool has to come after the one before it.",
        },
        {
          kind: "p",
          text: "The second check is the step count. `steps` counts model calls, and triage's call is one of them. It must be at most `max_steps`. An item with no `max_steps` skips this check.",
        },
        {
          kind: "p",
          text: "The desk already stops any run at 12 steps, which the multi-agent course set. The action items allow 6 to 9. A run can finish inside the desk's budget and still fail this check.",
        },
        {
          kind: "p",
          text: "The third check is completion. A run ends with a `status` of `done`, `awaiting_approval` or `stopped`, and `stop_reason` says why. A `stopped` run, ended by the loop detector or a spent budget, fails. An `awaiting_approval` run passes, because it did everything up to the pause.",
        },
        {
          kind: "p",
          text: "The `value` of the score is the share of the three checks that passed. The score passes only when all three do. The `reason` names each check that failed, and it is empty when none did.",
        },
        {
          kind: "p",
          text: "Arguments have their own grader. `grade_tool_args` from chapter 2 checks what each tool received. `grade_run` in `runner.py` scores each run. For an action item it calls `grade_tool_args` first and `grade_trajectory` second, and the run passes only when both scores pass.",
        },
        {
          kind: "p",
          text: "`grade_run` ships complete and already calls `grade_trajectory`. Once lab step 3 works, the action slice grades the path with no other change.",
        },
        {
          kind: "compare",
          caption: "Each defect trips one check, and the reason says which.",
          columns: ["Defect in the run", "Caught by", "The reason reads"],
          rows: [
            ["A ticket on PEP 8 when the item asked about PEP 20", "`tool_args`", "`open_ticket ran with other arguments`"],
            ["A ticket with no search before it", "`trajectory`, tool order", "`tools [...] do not contain [...] in order`"],
            ["The right tools, but 10 steps against a limit of 9", "`trajectory`, step count", "`took 10 steps, the limit is 9`"],
            ["A run ended by the loop detector", "`trajectory`, completion", "`the run ended stopped (loop)`"],
          ],
        },
        {
          kind: "widget",
          id: "evals06-path-grader",
          intro:
            "Four scripted runs answer item t10. For each run, mark the tool order, the step count and the completion as passing or failing. Then grade the run, and read the score and the reason the grader gives.",
        },
        {
          kind: "quiz",
          id: "evals06-q2",
          question:
            "A run searches, hands over to the writer and asks to open the ticket. The `open_ticket` step has `ok` false, the `status` is `awaiting_approval` and `steps` is 4 against a `max_steps` of 9. What does `grade_trajectory` give?",
          options: [
            "1.0 and a pass.",
            "0.67, because the ticket step has `ok` false.",
            "0.67, because the `status` is not `done`.",
            "0.0, because the ticket was never created.",
          ],
          answer: 0,
          explain:
            "The tool check counts a step whether or not `ok` is true, and `awaiting_approval` counts as finished. The run is in order and inside its steps, so all three checks pass.",
        },
        {
          kind: "quiz",
          id: "evals06-q3",
          question: "A run calls the right tools in order and ends `done`, but it takes 11 steps against a `max_steps` of 8. What does `grade_trajectory` give?",
          options: ["1.0 and a pass, because the answer is right.", "0.67 and a fail.", "0.33 and a fail.", "0.0 and a fail."],
          answer: 1,
          explain: "Two of the three checks pass, so the value is 2 divided by 3. The score passes only when all three checks do.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "A strict path check punishes a good run",
          text: "An exact-sequence check scores a better route as a failure. That is why `expected_tools` is an ordered subsequence. List the tools that carry the policy, such as a search before a ticket. Do not copy every call from one good run.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Two runs reach the right answer by different paths. How do you grade them?",
          text: "Answer first: grade constraints, not one sequence. Name the three checks: expected tools as an ordered subsequence, a step limit and completion. Say that harmless extra steps pass. Add that a separate grader compares the arguments.",
        },
        {
          kind: "p",
          text: "One run of a path is one sample, so the next question is how many runs you need.",
        },
      ],
    },
    {
      id: "s3-pass-at-k",
      title: "Pass@k and pass^k answer opposite questions about the same runs",
      goal: "Which number fits a desk that must work every time?",
      blocks: [
        {
          kind: "p",
          text: "One run of the desk is one sample. A live model can take a different path on the same question. The multi-agent course suggested running each design several times and looking at the spread. This section puts numbers on that spread.",
        },
        {
          kind: "p",
          text: "Record n runs of one item, and say c of them passed. Draw k of the n runs at random. **Pass@k** is the chance that at least one of the k passed. **Pass^k** is the chance that all k passed. The code spells pass^k as `pass_pow_k`, for power.",
        },
        {
          kind: "p",
          text: "Write C(a, b) for the number of ways to choose b runs from a. Counting the draws gives both numbers directly.",
        },
        {
          kind: "code",
          lang: "text",
          code: `pass@k = 1 - C(n - c, k) / C(n, k)
pass^k = C(c, k) / C(n, k)`,
          caption: "The two numbers. n is the number of recorded runs and c is the number that passed.",
        },
        {
          kind: "p",
          text: "Run item t10 five times, and say three runs pass. There are 10 ways to draw 2 runs from 5. In 1 of them both runs failed, so pass@2 is 1 minus 1 over 10, which is 0.9. In 3 of them both passed, so pass^2 is 3 over 10, which is 0.3.",
        },
        {
          kind: "compare",
          caption: "Item t10 run 5 times with 3 passes. The two columns move in opposite directions.",
          columns: ["k", "pass@k", "pass^k"],
          rows: [
            ["1", "0.6", "0.6"],
            ["2", "0.9", "0.3"],
            ["3", "1.0", "0.1"],
            ["4", "1.0", "0.0"],
          ],
        },
        {
          kind: "p",
          text: "Pass@k never falls as k grows, and pass^k never rises. At k of 1 they are the same number, the share of runs that passed. That is why the plain pass rate hides the difference.",
        },
        {
          kind: "list",
          items: [
            "Quote pass@k when a retry is cheap and something picks the good run. A user who asks for three drafts is one case.",
            "Quote pass^k when every run must be right. A desk whose answers nobody checks is one case, and so is a release gate.",
          ],
        },
        {
          kind: "p",
          text: "`run_slice`, the function behind `eval run`, already counts an item as passed only when all its runs passed. That is pass^k, with k equal to the number of runs. The strict reading suits a gate, because a desk that is right two times in three is not reliable.",
        },
        {
          kind: "fold",
          tone: "hood",
          title: "Why not (c / n) to the power k?",
          text: "The shortcut treats every draw as a fresh coin flip with the same odds. With 3 passes in 5 runs it gives 0.36 for pass^2, against 0.30 from the count. The count draws without replacement from the runs you recorded, and a small record has no run to draw twice.",
        },
        {
          kind: "widget",
          id: "evals06-pass-k",
          intro:
            "Five recorded runs of one item, each a pass or a fail. Flip runs, and watch the pass@k and pass^k columns. Then meet the challenge under the table.",
        },
        {
          kind: "quiz",
          id: "evals06-q4",
          question: "An action item ran 5 times and passed 2 of them. What is pass^2?",
          options: ["0.4", "0.7", "0.1", "0.9"],
          answer: 2,
          explain: "Pass^2 is C(2, 2) over C(5, 2), which is 1 over 10, or 0.1. Only one pair of runs out of ten has both runs passing.",
        },
        {
          kind: "quiz",
          id: "evals06-q5",
          question: "The same record, 2 passes in 5 runs. What is pass@3?",
          options: ["0.4", "0.6", "0.9", "1.0"],
          answer: 2,
          explain: "Only one group of three runs holds no pass, the three runs that failed. So pass@3 is 1 minus 1 over 10, which is 0.9.",
        },
        {
          // CHECK: the tau-bench attribution of pass^k (arXiv 2406.12045) comes from the old evals-08 chapter, which carried CHECKED 17 Oct 2026. Confirm it against the paper.
          kind: "p",
          text: "The tau-bench paper for tool-using agents introduced pass^k. It reported that strong agents were inconsistent across repeated trials.",
        },
        {
          kind: "p",
          text: "Those numbers describe one item. A slice needs them across every item.",
        },
      ],
    },
    {
      id: "s4-reliability-over-a-slice",
      title: "Reliability is the mean over items, and per-step failure compounds across a run",
      goal: "Why do long runs fail more often than the step rates suggest?",
      blocks: [
        {
          kind: "p",
          text: "A slice has many items. `reliability` takes a mapping from each item id to the pass or fail of each of its runs. The `item_runs` method of the run that `run_slice` returns gives that mapping. `reliability` computes pass@k and pass^k for every item, and averages each. Every item weighs the same, whatever its number of runs.",
        },
        {
          kind: "p",
          text: "`askpep eval run --slice action --runs 3` repeats each item three times. Its JSON gains a `reliability` block with `k`, `pass_at_k` and `pass_pow_k`. With `--runs` at 1 there is no block. A value below 1 exits with code 2 and runs nothing.",
        },
        {
          kind: "p",
          text: "On the routing, answer and action slices, the `rate` in that JSON equals `pass_pow_k` when k is the number of runs. The `pass_at_k` beside it is the generous reading of the same runs.",
        },
        {
          kind: "p",
          text: "The expected output in the next step came from the capstone's fake desk, which only ever calls the search tool. Its rate is low, and yours will be higher. The shape is the same.",
        },
        {
          kind: "step",
          id: "evals06-s01",
          title: "Repeat the action slice three times",
          text: "Run this in your AskPEP workspace, with the live desk from course 2 set up. It makes 36 desk runs, 12 items three times each, so it costs real model calls.",
          lang: "bash",
          code: "uv run askpep eval run --slice action --runs 3",
          // CHECK: the expect text is real output from the capstone's offline run with fake providers on 21 October 2026, trimmed to one item and the reliability block. The fake desk passes 2 of 12 items. No one has run this command on the live desk. the learner should run it once there and compare the shape and the pass_pow_k against rate.
          expect: `{
  "slice": "action",
  "version": "v1",
  "n": 12,
  "rate": 0.16666666666666666,
  "items": {
    "t01": [
      {
        "passed": true,
        "reasons": []
      },
      ... two more runs for t01, then t02 to t12, each with three runs ...
    ]
  },
  "reliability": {
    "k": 3,
    "pass_at_k": 0.16666666666666666,
    "pass_pow_k": 0.16666666666666666
  }
}`,
        },
        {
          kind: "p",
          text: "Failure also compounds along a run. Say each step succeeds with a fixed chance, and steps fail independently. An 8-step run then succeeds with that chance to the power 8. The longest action items allow 8 or 9 steps.",
        },
        {
          kind: "compare",
          caption: "The chance that all 8 steps of a run succeed, if steps fail independently.",
          columns: ["Success per step", "8-step run succeeds"],
          rows: [
            ["90%", "43%"],
            ["95%", "66%"],
            ["99%", "92%"],
          ],
        },
        {
          kind: "p",
          text: "Independence is a simplification. Steps share one context, so a bad search result can spoil every step after it. Use the sum for the order of magnitude, and measure the real rate with repeated runs.",
        },
        {
          kind: "p",
          text: "Repeats cost money, because `--runs 3` triples the calls. Chapter 8 puts an interval round a rate, so you can say how many runs are enough. The LLMOps course covers online evaluation, which grades live traffic and not a fixed set.",
        },
        {
          kind: "quiz",
          id: "evals06-q6",
          question: "Each step of an 8-step run succeeds 95 times in 100, and steps fail independently. About what share of runs succeeds?",
          options: ["95%", "85%", "66%", "40%"],
          answer: 2,
          explain: "Steps multiply. 0.95 to the power 8 is about 0.66. A small failure rate at each step grows over a long run.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Your agent passes 90 per cent of runs. Is it ready to run unattended?",
          text: "Answer first: not on that number alone. Ask how it is used. Unattended work needs pass^k, because nobody picks the best run. If 90 per cent is per step, an 8-step run succeeds 43 per cent of the time.",
        },
        {
          kind: "p",
          text: "The second team's lead has now asked for something that depends on these numbers.",
        },
      ],
    },
    {
      id: "s5-autonomy-note",
      title: "An autonomy note decides from pass^k, so approval stays until the figure is earned",
      goal: "How much freedom has the desk earned?",
      blocks: [
        {
          kind: "p",
          text: "An **autonomy note** records a decision to give an agent more freedom or to withhold it, with the reliability figures behind it. The number that matters is pass^k, because a desk acting on real tickets has to get it right every time.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "State the freedom being requested.",
            "Run the action slice several times.",
            "Compute run rate, pass^k and pass@k.",
            "Read the items that failed some runs.",
            "Decide, and name the figure that would change the decision.",
          ],
        },
        {
          kind: "p",
          text: "The second team's lead asked you to drop the approval step on low-risk tickets. It slows their people down. You ran the action slice three times with `--runs 3`, which made 36 runs of 12 items.",
        },
        {
          kind: "p",
          text: "Thirty of the 36 runs passed, so the run rate was 83 percent. It sounded close. Then you looked at items. Eight of the 12 passed all three runs, which gives pass^3 of 0.67. Eleven passed at least once, which gives pass@3 of 0.92. A team reading the second figure would think the desk was reliable.",
        },
        {
          kind: "p",
          text: "Items t03 and t10 failed one run each, by taking one step too many. Item t08 failed one run on its arguments. Item t11 failed all three, and that is a real bug in how the desk builds the ticket.",
        },
        {
          kind: "p",
          text: "So approval stays, and it's the control that catches these runs. The security reviewer agreed, because approval is the control behind T7.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# AUTONOMY-NOTE-001.md
Request: drop human approval on low-risk tickets
Requested by: second team's lead   Decided by: security reviewer, product owner
Dataset: action/v1 (12 items)   Runs per item: 3   Total runs: 36

Item                                 Passes of 3
t01 t02 t04 t05 t06 t07 t09 t12      3 of 3 each
t03                                  2 of 3   took 7 steps, the limit is 6
t08                                  2 of 3   open_ticket ran with other arguments
t10                                  2 of 3   took 10 steps, the limit is 9
t11                                  0 of 3   open_ticket ran with other arguments

Run rate   30 of 36  = 83.3%
pass^3     8 of 12   = 0.67   the item passed every run
pass@3     11 of 12  = 0.92   the item passed at least once

## Decision
Approval stays. It is the control behind threat row T7.
Review when pass^3 is at least 0.95 on at least 40 items.

## Eval plan rows changed
S4  action  Grader: grade_tool_args, grade_trajectory`,
          caption: "AUTONOMY-NOTE-001.md. The items are the real action slice. The run results belong to the story.",
        },
        {
          kind: "p",
          text: "The read-out is the gap between 0.92 and 0.67. The first figure says the desk can do this. The second says how often it will. Approval is a decision about the second figure, and the note says what would reopen it.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# AUTONOMY-NOTE-NNN.md
Request:
Requested by:    Decided by:
Dataset:    Runs per item:    Total runs:

Item  Passes of k  Failure reason

Run rate:
pass^k:
pass@k:

## Decision
(what stays, and what would change it)

## Eval plan rows changed`,
          caption: "For your next system: the note with the values left blank.",
        },
        {
          kind: "p",
          text: "Failures are now piling up in several slices, each with a reason attached. Which one should you fix first? The next chapter reads them.",
        },
      ],
    },
  ],
  lab: {
    title: "Grade the path and repeat the run",
    goal: "Write pass@k and pass^k, the trajectory grader and the reliability summary, then add `--runs` to `eval run`. Steps 1 to 4 start from stubs that raise `NotImplementedError(\"evals-06 step N\")`. Step 5 edits `cli.py`, which you already have. The tests script the desk, so nothing calls Gemini. Run them from your AskPEP workspace root. Then compare your files with `capstone/src/askpep/evals/` in the my-learn folder.",
    minutes: 60,
    files: [
      "src/askpep/evals/stats.py",
      "src/askpep/evals/trajectory.py",
      "src/askpep/cli.py",
      "tests/evals/test_evals06_trajectory.py",
    ],
    steps: [
      {
        title: "Write pass@k",
        text: "Write `pass_at_k` in `stats.py`. It returns the chance that at least one of k runs, drawn from the n you recorded, passed. The helper `_runs` ships complete and raises `ValueError` for no runs or a bad k. The stub raises `evals-06 step 1`.",
        code: `# src/askpep/evals/stats.py
def pass_at_k(runs: Sequence[bool], k: int) -> float:
    """The chance that at least one of k runs, drawn from these n, passed: 1 - C(n-c, k) / C(n, k)."""
    # your turn:
    # 1. n, c = _runs(runs, k). It ships complete. n is the number of runs and c the number that passed.
    # 2. When fewer than k runs failed (n - c < k), every draw of k holds a pass. Return 1.0.
    # 3. Otherwise start miss = 1.0 and, for i from n - c + 1 to n, multiply miss by 1 - k / i.
    #    That product is C(n-c, k) / C(n, k) without large factorials.
    # 4. Return 1 - miss.
    ...`,
        test: "uv run pytest tests/evals -k evals06_s1",
      },
      {
        title: "Write pass^k",
        text: "Write `pass_pow_k` in `stats.py`. It returns the chance that all k runs, drawn from the n you recorded, passed. It is 0 when fewer than k runs passed. The stub raises `evals-06 step 2`.",
        code: `# src/askpep/evals/stats.py
def pass_pow_k(runs: Sequence[bool], k: int) -> float:
    """The chance that all k runs, drawn from these n, passed: C(c, k) / C(n, k)."""
    # your turn:
    # 1. n, c = _runs(runs, k).
    # 2. When fewer than k runs passed (c < k), return 0.0.
    # 3. Otherwise start every = 1.0 and, for i from 0 to k - 1, multiply every by (c - i) / (n - i).
    # 4. Return every.
    ...`,
        test: "uv run pytest tests/evals -k evals06_s2",
      },
      {
        title: "Grade the path",
        text: "Write `grade_trajectory` in `trajectory.py`. It makes the three checks of section 2 and returns a `Score` named `trajectory`. The value is the share of checks that passed, and the reason names each failed check. The stub raises `evals-06 step 3`.",
        code: `# src/askpep/evals/trajectory.py
def grade_trajectory(item: GoldenItem, result: "DeskResult") -> Score:
    """Grade the path of a run with three checks: the tools, the step count and the completion."""
    # your turn:
    # 1. names = the name of each step in result.trajectory whose kind is "tool".
    # 2. Tool check: remaining = iter(names), then all(tool in remaining for tool in item.expected_tools).
    # 3. Step check: item.max_steps is None, or result.steps <= item.max_steps.
    # 4. Completion check: result.status is in COMPLETED. COMPLETED ships complete.
    # 5. Keep a list of messages, one for each check that failed. Name the check in each message.
    # 6. Return Score("trajectory", (3 - len(failed)) / 3, not failed, "; ".join(failed)).
    ...`,
        test: "uv run pytest tests/evals -k evals06_s3",
      },
      {
        title: "Summarise the runs",
        text: "Write `reliability` in `trajectory.py`. It takes a mapping from item id to that item's run results, and returns the mean pass@k and pass^k as a `Reliability`. Add the two functions to your imports from `stats.py`. The stub raises `evals-06 step 4`.",
        code: `# src/askpep/evals/trajectory.py
# Add this import beside the others:
#   from askpep.evals.stats import pass_at_k, pass_pow_k
def reliability(runs: Mapping[str, Sequence[bool]], k: int) -> Reliability:
    """The mean pass@k and pass^k over items. \`runs\` maps an item id to the pass or fail of each of its runs."""
    # your turn:
    # 1. An empty mapping raises ValueError("no items").
    # 2. For each item's runs, call pass_at_k(item_runs, k) and pass_pow_k(item_runs, k).
    #    An item with fewer than k runs raises the ValueError that those functions raise.
    # 3. Return Reliability(k, the number of items, the mean of the first list, the mean of the second).
    ...`,
        test: "uv run pytest tests/evals -k evals06_s4",
      },
      {
        title: "Repeat a run",
        text: "Add `--runs` to `eval run` in `cli.py`. Pass it to `run_slice` as `runs`. Above 1, add a `reliability` key to the printed JSON. A value below 1 must exit with code 2. This step has no stub, so its test raises `evals-06 step 5` until the option exists.",
        code: `# src/askpep/cli.py
# Add the alias beside GraphOption and JudgeOption.
RunsOption = Annotated[int, typer.Option("--runs", help="Run each item this often. All runs must pass.")]


@eval_app.command("run")
def eval_run(
    # your turn: add runs: RunsOption = 1, beside your other options.
    ...
) -> None:
    ...
    # your turn: pass runs=runs to run_slice. It raises ValueError for runs below 1.
    # Your chapter 2 command already catches ValueError and exits 2, so the check needs no new code.
    body = run.to_json()
    # your turn: when runs > 1, import reliability from askpep.evals.trajectory and call it with
    # run.item_runs() and runs. Set body["reliability"] to a dict with the keys k, pass_at_k and pass_pow_k.
    typer.echo(json.dumps(body, indent=2))`,
        test: "uv run pytest tests/evals -k evals06_s5",
      },
    ],
    verify: "uv run pytest tests/evals -k evals06",
  },
  recap: [
    "A right answer can come from a wrong path, so an action item is graded on its path as well as its answer.",
    "`grade_trajectory` checks tool order, step count and completion, and scores the share that pass.",
    "`expected_tools` is an ordered subsequence of the tool steps. A run waiting for approval counts as finished.",
    "Pass@k is the chance that at least one of k runs passes. Pass^k is the chance that all k runs pass.",
    "Pass@k rises with k and pass^k falls, so quote the one that fits how the desk is used.",
    "Per-step success compounds. At 95 per cent a step, an 8-step run succeeds 66 per cent of the time.",
    "An autonomy note decides from pass^k and names the figure that would reopen the decision.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In trajectory evals I learned that a right answer can hide a wrong path. I grade tool order, step count and completion, and I repeat runs because one run is one sample. Pass@k rewards a retry and pass^k punishes inconsistency. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["evals-q15", "evals-q16"],
};

export default chapter;
