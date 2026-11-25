import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "evals-02-graders",
  course: "evals",
  number: 2,
  title: "Grade with code wherever code can decide",
  tagline: "Which checks of a desk run can code decide, with no model and no bill?",
  minutes: 50,
  objectives: [
    "Sort the checks of a desk run into those code can decide and those that need a judge.",
    "Write a grader as a function from a golden item and a desk result to a `Score`.",
    "Grade citations, routes and refusals from the fields of the result, and say why a refusal grader must fail both ways.",
    "Match tool arguments partially with `args_match`, and say what it accepts.",
    "Run one slice with `askpep eval run`, and read the JSON it prints.",
    "Build a grader map from reported failures, and say which rows need a judge.",
  ],
  sections: [
    {
      id: "s1-code-or-judge",
      title: "Code can decide any check that has one answer you can look up",
      goal: "Which checks can code decide, and which need a judge?",
      blocks: [
        {
          kind: "p",
          text: "Chapter 1 split the golden set into five slices: retrieval, routing, answer, action and attack. This chapter grades runs of the PEP desk on those items. A **grader** is a check that looks at one run and says how well it went.",
        },
        {
          kind: "p",
          text: "A **code grader** is a plain function. It reads fields of the run, so it uses no model and costs nothing. It gives the same score every time, and a unit test can run it.",
        },
        {
          kind: "p",
          text: "A **judge** is a model that reads text and scores it. You met one in course 1, where the `--judge` flag scored faithfulness. That asks whether every claim in an answer follows from the passages it cites. Chapter 3 builds a judge and checks it against human labels.",
        },
        {
          kind: "p",
          text: "Pick the grader by asking where the answer lives. If a field of the result holds it, and one comparison decides it, use code. If it lives in the meaning of the prose, use a judge. A judge costs money and can be wrong, so give it only the checks that need it.",
        },
        {
          kind: "p",
          text: "The desk's result is a `DeskResult`, which you built in the agents course. Four of its fields settle most checks.",
        },
        {
          kind: "list",
          items: [
            "`citations` lists the sources the answer cited. Each one has a `doc_id`, which is its PEP number.",
            "`route` is the agent that triage chose, such as `researcher` or `refuse`.",
            "`trajectory` lists the tool calls, handoffs and answer of the run. A tool step records the tool's name and the arguments it ran with.",
            "`refused` is true when the desk declined to answer.",
          ],
        },
        {
          kind: "p",
          text: "An answer-slice item also carries a `reference_answer`, the short text a careful reader would accept. Code can compare that text with the desk's answer only as strings.",
        },
        {
          kind: "widget",
          id: "evals02-grader-picker",
          intro:
            "Eight checks on runs of the PEP desk follow. For each, predict whether code can decide it or whether it needs a judge. Look for the field of the result that would hold the answer. Two of the eight look like code checks and are not. You get two tries on each, then the answer and the reason appear.",
        },
        {
          kind: "callout",
          tone: "analogy",
          title: "A spell-checker and an editor",
          text: "A spell-checker looks each word up in a dictionary. It is free and it never changes its mind. An editor decides whether a sentence confuses the reader. Nobody hands the editor's job to the spell-checker, and nobody pays an editor to check spelling.",
        },
        {
          kind: "quiz",
          id: "evals02-q1",
          question: "Which of these checks should be a code grader?",
          options: [
            "The answer explains the walrus operator clearly.",
            "The answer cites at least one of the PEPs the item expects.",
            "The answer says what the reference answer says.",
            "The answer has a polite tone.",
          ],
          answer: 1,
          explain:
            "The citations are a field of the result, and a comparison of two sets decides the check. Clarity, agreement with a reference and tone live in the prose, so they need a judge.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Which of your checks did you refuse to give to a model",
          text: "Answer first: the ones with one answer you can look up. Name the fields, such as the cited PEP numbers and the route. Then name the price of the alternative. A judge adds cost and delay, and it makes errors of its own. An error in the grader looks like an error in the system.",
        },
        {
          kind: "p",
          text: "Code takes the first share of the work, so the next section looks at what a code grader is.",
        },
      ],
    },
    {
      id: "s2-a-grader-is-a-function",
      title: "A grader is a plain function from an item and a result to a score",
      goal: "What does a grader take, and what does it return?",
      blocks: [
        {
          kind: "p",
          text: "Every grader in this chapter has one shape. It takes a `GoldenItem` and a `DeskResult`, and it returns a `Score`. The item says what should have happened. The result says what did. The score is the verdict.",
        },
        {
          kind: "p",
          text: "The item holds what the graders compare against: `expected_docs`, `answerable`, `expected_route`, `expected_tools` and `expected_args`. Course 1 and chapter 1 gave you those fields.",
        },
        {
          kind: "p",
          text: "You have seen a grader before. In the agents course, `item_passed` folded the citation and refusal checks into one true or false. A score keeps each check apart, and it says why a run failed.",
        },
        {
          kind: "p",
          text: "`Score` ships complete in your stub, in `askpep/evals/graders.py`. It is a frozen dataclass with four fields.",
        },
        {
          kind: "code",
          lang: "python",
          code: `# src/askpep/evals/graders.py
@dataclass(frozen=True)
class Score:
    """One grader's verdict on one run. \`value\` runs from 0 to 1, and \`passed\` is the decision."""

    name: str
    value: float
    passed: bool
    reason: str = ""`,
          caption: "The verdict of one grader on one run.",
        },
        {
          kind: "p",
          text: "`name` says which grader scored. `value` is a number from 0 to 1. `passed` is the decision. `reason` says why a failed score failed, and it is empty on a clean pass.",
        },
        {
          kind: "p",
          text: "`value` and `passed` are separate on purpose. A score can have a value below 1 and still pass. Section 3 has an example. The value shows how far a run was from perfect, and `passed` decides whether it counts.",
        },
        {
          kind: "p",
          text: "Two tables ship with it. `GRADERS` maps each grader's name to its function. `SLICE_GRADERS` says which graders each slice uses, as the table below shows.",
        },
        {
          kind: "compare",
          caption: "The four graders you build in this chapter",
          columns: ["Grader", "Slice", "Reads", "Passes when"],
          rows: [
            ["`citations`", "answer", "`result.citations`", "An answerable item: at least one expected PEP is cited. An unanswerable item: nothing is cited."],
            ["`route`", "routing", "`result.route`", "Triage chose the item's `expected_route`."],
            ["`tool_args`", "action", "`result.trajectory`", "Every tool in the item's `expected_args` ran with matching arguments."],
            ["`refusal`", "answer", "`result.refused`", "The desk refused an unanswerable item, or answered an answerable one."],
          ],
        },
        {
          kind: "p",
          text: "The retrieval and attack slices have no desk graders. Section 6 says why.",
        },
        {
          kind: "p",
          text: "The first graders only need to read two fields of the result.",
        },
      ],
    },
    {
      id: "s3-read-the-fields",
      title: "A grader reads the fields of the result and never its prose",
      goal: "What are the pass rules for citations and routes?",
      blocks: [
        {
          kind: "p",
          text: "`grade_citations` asks whether the desk cited the right PEPs. It reads `result.citations` and never the answer text. The desk builds that list from the `[n]` markers in the answer, each one resolved against the run's sources. An answer that names PEP 8 in words but carries no marker has no citation.",
        },
        {
          kind: "p",
          text: "For an answerable item, the grader takes the set of cited `doc_id` values and the item's `expected_docs`. The run passes when the two share at least one PEP. The value is the share of the expected PEPs that were cited.",
        },
        {
          kind: "p",
          text: "One is enough because any expected PEP can answer the question. This is the rule `item_passed` used. The value keeps the gap visible, so a drop from 1.0 to 0.5 shows in your results even though the item still passes.",
        },
        {
          kind: "p",
          text: "For an unanswerable item, the run passes only when it cites nothing. A desk that cites a PEP for an unanswerable question has claimed support that does not exist. The citation is the proof.",
        },
        {
          kind: "compare",
          caption: "Four runs of `grade_citations`",
          columns: ["Item", "The run cites", "Score"],
          rows: [
            ["Answerable, expects PEP 8", "PEP 8", "Value 1.0, passed, no reason"],
            ["Answerable, expects PEP 8 and PEP 20", "PEP 8", "Value 0.5, passed, reason `misses PEP 20`"],
            ["Answerable, expects PEP 8", "PEP 484", "Value 0.0, failed, reason `cites none of PEP 8`"],
            ["Unanswerable", "PEP 8", "Value 0.0, failed, reason `cites PEP 8, but the question has no answer`"],
          ],
        },
        {
          kind: "p",
          text: "Course 1 measured recall at 6, which asks whether the retriever found the expected documents. Citations ask a different question: did the answer rely on them? A desk can retrieve PEP 8 and never cite it.",
        },
        {
          kind: "quiz",
          id: "evals02-q2",
          question:
            "An answer reads PEP 8 sets the limit at 79 characters, with no `[n]` marker, so `result.citations` is empty. The item is answerable and expects PEP 8. What does `grade_citations` give?",
          options: [
            "Value 1.0 and passed, because the answer names PEP 8.",
            "Value 0.0 and failed, with the reason `cites none of PEP 8`.",
            "Value 0.5 and passed, because the answer is half right.",
            "It raises an error, because the list of citations is empty.",
          ],
          answer: 1,
          explain:
            "The grader reads `result.citations` and never the text. A mention with no marker is invisible to it. An empty list cites none of the expected PEPs, so the value is 0.0 and the run fails.",
        },
        {
          kind: "quiz",
          id: "evals02-q3",
          question: "An answerable item expects PEP 8 and PEP 20. The run cites PEP 8 only. What is the score?",
          options: [
            "Value 0.5, passed, reason `misses PEP 20`.",
            "Value 0.5, failed, because PEP 20 is missing.",
            "Value 1.0, passed, because PEP 8 is enough.",
            "Value 0.0, failed, because the set is incomplete.",
          ],
          answer: 0,
          explain:
            "One of the two expected PEPs was cited, so the value is 0.5. One is enough to pass, and the reason records the PEP that was missed.",
        },
        {
          kind: "p",
          text: "`grade_route` is shorter. The item's `expected_route` is one of `researcher`, `code_advisor`, `writer` or `refuse`. The grader compares it with `result.route`, which holds triage's choice. Equal routes pass with 1.0. Anything else fails with 0.0, and the reason names both routes.",
        },
        {
          kind: "p",
          text: "Item r08 of the routing slice asks which Python version added the match statement. It expects `code_advisor`. A desk that routed it to `researcher` fails with the reason `routed to researcher, expected code_advisor`.",
        },
        {
          kind: "p",
          text: "Two edge cases fail on purpose. An item with no `expected_route` fails, because a grader with nothing to compare must not pass. A run where triage never ran, such as an input a guard blocked in course 3, has no route. It fails with the reason `routed to None`.",
        },
        {
          kind: "callout",
          tone: "insight",
          title: "When a grader cannot tell, it fails",
          text: "Both edge cases follow the fail closed rule from the guardrails course. A grader that passed a run it could not read would make the desk look better than it is. A failure costs you one look at the item. A false pass costs you a bug you never find.",
        },
        {
          kind: "p",
          text: "Tool arguments are harder, because a correct call can carry a harmless extra.",
        },
      ],
    },
    {
      id: "s4-partial-match",
      title: "A partial match stops a correct tool call failing on a harmless extra",
      goal: "What exactly should a partial match accept?",
      blocks: [
        {
          kind: "p",
          text: "The action slice checks what the desk did, and not what it said. Chapter 1 gave each action item an `expected_tools` list. Some items also have `expected_args`, which maps a tool's name to the arguments it must have run with.",
        },
        {
          kind: "p",
          text: "Take item t02 of the action slice: show me the Indentation section of PEP 8. Its `expected_args` is `{\"read_pep_section\": {\"pep\": 8}}`. The desk calls `read_pep_section` with `{\"pep\": 8, \"section\": \"Indentation\"}`. An equality check would fail that call. The call is right, and the item left out `section` because a model can word it many ways.",
        },
        {
          kind: "p",
          text: "A **partial match** needs every expected key and ignores extra ones. `args_match(expected, actual)` ships complete in your stub. It applies five rules.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "A dict matches when every key of `expected` is in `actual` and its value matches. Extra keys are fine.",
            "A list matches when every expected element is in the actual list, in any order. Extra elements are fine.",
            "Text matches when the two strings are equal, ignoring case and spaces at either end. A substring does not match.",
            "A number matches an equal number. The text `\"634\"` does not match the number `634`.",
            "A bool matches only the same bool.",
          ],
        },
        {
          kind: "p",
          text: "`grade_tool_args` applies the rules tool by tool. For each tool in `expected_args`, it looks in `result.trajectory` for steps of kind `tool` with that name. The tool is met when any one of those calls matches. A desk that searched twice, and got the second query right, meets the tool.",
        },
        {
          kind: "p",
          text: "The value is the share of expected tools that were met, and the score passes when all were. The reason names each miss in one of two phrases. `python_feature_version never ran` means the desk chose another tool. `python_feature_version ran with other arguments` means it chose the tool and filled it wrongly.",
        },
        {
          kind: "p",
          text: "The two phrases point at different fixes. The first is a tool-choice problem, and the second is an argument problem.",
        },
        {
          kind: "widget",
          id: "evals02-args-match",
          intro:
            "Six tool calls follow. For each, you see the arguments the item expects and the arguments the desk ran. Predict whether the `tool_args` score passes. Two of the six come from made-up items, and they say so. Apply the five rules one key at a time.",
        },
        {
          kind: "fold",
          tone: "hood",
          title: "Why a bool gets its own rule",
          text: "In Python, `True == 1` and `False == 0` are both true. A plain `==` would pass a desk that sent `true` where the item expects the number 1. `args_match` checks for a bool first. If either side is a bool, both must be the same bool.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "An item with no expected arguments passes with 1.0",
          text: "`grade_tool_args` checks only the tools in `expected_args`. Item t01 of the action slice lists `search_peps` in `expected_tools` and has no `expected_args`. It passes with 1.0 even when no tool ran. Whether the right tools ran is the trajectory check, which chapter 6 builds.",
        },
        {
          kind: "quiz",
          id: "evals02-q4",
          question:
            "An item expects `search_peps` with `{\"query\": \"walrus\"}`. The desk calls it with `{\"query\": \"walrus operator\", \"k\": 3}`. What does the score say?",
          options: [
            "It passes. The extra key is ignored, and the query contains walrus.",
            "It fails with `search_peps ran with other arguments`, because the query is a different string.",
            "It fails with `search_peps never ran`.",
            "It passes with a value of 0.5.",
          ],
          answer: 1,
          explain:
            "Extra keys are fine, but text must match as a whole. The string `walrus operator` is not `walrus`, and a substring is not a match. The tool did run, so the reason is about its arguments.",
        },
        {
          kind: "p",
          text: "Citations, routes and arguments check what the desk did. A refusal checks whether it should have acted at all.",
        },
      ],
    },
    {
      id: "s5-refusal-both-ways",
      title: "A refusal grader must fail in both directions",
      goal: "How do you stop a desk that refuses everything from scoring well?",
      blocks: [
        {
          kind: "p",
          text: "An item is unanswerable when the corpus holds nothing that answers it. The desk should refuse those. For every other item, a refusal is a failure, because the desk had an answer to give.",
        },
        {
          kind: "p",
          text: "`grade_refusal` reads one field of the result, `refused`, and one field of the item, `answerable`. An unanswerable item passes when the desk refused. An answerable item passes when it did not. Each failure has its own reason: `answered a question that has no answer`, or `refused a question that has an answer`.",
        },
        {
          kind: "p",
          text: "The second direction matters most. A grader that checked only that unanswerable items were refused would reward a desk that refuses everything. That desk would score 100 percent and be useless.",
        },
        {
          kind: "p",
          text: "Try it on the answer slice, which has 14 items. Four are unanswerable and 10 are answerable. A desk that refuses every question passes the four and fails the 10.",
        },
        {
          kind: "p",
          text: "The answer slice uses two graders, `citations` and `refusal`, and an item passes only when both pass. Neither is enough alone. An unanswerable question that the desk answers with no `[n]` marker passes `citations` and fails `refusal`. An answerable question that the desk refuses fails both.",
        },
        {
          kind: "p",
          text: "The `refused` flag is strict. It is true when the stop reason is `refused`, or when the answer is exactly the fixed `REFUSAL` text from course 1.",
        },
        {
          kind: "p",
          text: "A model that declines in its own words sets no flag. The grader reads that as an answer, and it fails an unanswerable item. That is the right result, because the desk is meant to use the fixed text.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Your desk refuses 95 percent of the questions it should. Is that good",
          text: "Answer first: you can't tell yet. Ask the second question, which is how often it refuses a question it should have answered. A desk that refuses everything scores 100 percent on the first number alone. Report both rates together, and name the slice each comes from.",
        },
        {
          kind: "quiz",
          id: "evals02-q5",
          question: "A desk refuses every question. On the answer slice, 4 of the 14 items are unanswerable. How many items does `grade_refusal` pass?",
          options: ["4 of 14", "10 of 14", "14 of 14", "0 of 14"],
          answer: 0,
          explain:
            "A refusal is right only when the item has no answer. The grader passes the four unanswerable items and fails the ten answerable ones. Refusing everything scores 4 of 14, which is the point of grading both ways.",
        },
        {
          kind: "p",
          text: "Four graders now exist, and something has to run the right ones for each slice.",
        },
      ],
    },
    {
      id: "s6-grade-item",
      title: "A grader that crashes must stop the run, so nothing catches its error",
      goal: "How do the graders of one slice combine into a pass?",
      blocks: [
        {
          kind: "p",
          text: "`grade_item(item, result)` ties the graders together. It looks up the item's slice in `SLICE_GRADERS`, calls each named grader from `GRADERS` and returns the scores in order. The routing slice gives one score, the answer slice gives two and the action slice gives one.",
        },
        {
          kind: "p",
          text: "The retrieval and attack slices have no entry. `SLICE_GRADERS.get(item.slice, ())` gives an empty tuple, so `grade_item` returns an empty list. Neither slice grades a desk run.",
        },
        {
          kind: "p",
          text: "The retrieval slice scores a ranked list of documents, and the attack slice plays an attack against the guards. The runner scores both. That is the code that sends each item through the system, and section 7 covers it.",
        },
        {
          kind: "p",
          text: "Later chapters add to the lists. Chapter 3 adds a judge score to answerable answer items, and chapter 6 adds a `trajectory` score to action items. The runner adds both. `grade_item` stays as you write it here.",
        },
        {
          kind: "p",
          text: "Nothing in `grade_item` catches an exception. A grader that raises, for example on a missing field, stops the run with a traceback. That is the intent. A grader that swallowed its own error and returned a pass would hide the bug, and the desk would look better than it is.",
        },
        {
          kind: "p",
          text: "The runner applies one more rule when it turns scores into a verdict. `all_passed(scores)` is true only when there is at least one score and every score passed. A run with no scores never passes. Without that rule, a slice that someone left out of `SLICE_GRADERS` would pass every item.",
        },
        {
          kind: "quiz",
          id: "evals02-q6",
          question: "A bug makes `grade_tool_args` raise `KeyError` on one action item. What happens in `grade_item`?",
          options: [
            "The item scores 0.0 and the run carries on.",
            "The item is skipped, and the rate is worked out over the rest.",
            "The error stops the run, so the bug is seen.",
            "The item passes, because no score failed.",
          ],
          answer: 2,
          explain:
            "`grade_item` catches nothing. A grader that fails to run must never look like a pass or a quiet zero. The command in the next section reports a `KeyError` as a message and exit code 2.",
        },
        {
          kind: "p",
          text: "One item can now be graded, so the last step is a command that grades a whole slice.",
        },
      ],
    },
    {
      id: "s7-eval-run",
      title: "One command scores a whole slice and prints each failure with its reason",
      goal: "What does one command tell you about a whole slice?",
      blocks: [
        {
          kind: "p",
          text: "The runner, `run_slice` in `askpep/evals/runner.py`, ships complete. It loads a slice's dataset, sends each item through the system, grades each run and collects the results. You don't edit it. You call it from the new command.",
        },
        {
          kind: "p",
          text: "The system under test arrives as a **backend**, a plain function the runner calls. `Backends` holds three, and a test passes fakes in their place.",
        },
        {
          kind: "list",
          items: [
            "`ranker(question)` returns ranked document numbers. The retrieval slice uses it.",
            "`desk(item)` returns a `DeskResult`. The routing, answer and action slices use it.",
            "`play(attack)` plays one attack and returns the outcome. The attack slice uses it, and it defaults to the offline `Arena` from course 3.",
          ],
        },
        {
          kind: "p",
          text: "`live_backends(svc, graph)` builds the real ones from your services. `graph` names the desk design, which is `handoffs`, `supervisor` or `baseline`, the three from the agents course.",
        },
        {
          kind: "p",
          text: "`run_slice` returns a `SliceRun`, and its `to_json()` gives the result as a dictionary. Below is a routing run in which a scripted desk misroutes two items, r14 and r15. The output is cut to one item.",
        },
        {
          kind: "code",
          lang: "json",
          code: `{
  "slice": "routing",
  "version": "v1",
  "n": 16,
  "rate": 0.875,
  "items": {
    "r14": [
      {
        "passed": false,
        "reasons": ["route: routed to researcher, expected refuse"]
      }
    ]
  }
}`,
          caption: "A routing run from a scripted desk, cut to one item. The real output lists all 16 items.",
        },
        {
          kind: "p",
          text: "Each item maps to a list with one entry for each run. An entry holds `passed` and `reasons`. There is one reason for each failed score, written as the grader's name, a colon and its reason. To fix a failure, read the reason and open the item by its id in the dataset.",
        },
        {
          kind: "p",
          text: "What `rate` means depends on the slice. On the retrieval slice, it is the share of items with full recall at 6. The runner scores only the 20 answerable items of the 22, because an unanswerable item has no expected document to find. On the routing, answer and action slices, it is the share of items whose every score passed.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "On the attack slice, a lower rate is better",
          text: "The attack slice's `rate` is the attack success rate from course 3, the share of attacks that got through. In the items, `passed` is true when the attack was blocked. A rate of 0.0 is the best result, so don't read it as nothing passing.",
        },
        {
          kind: "p",
          text: "`askpep eval run` wraps the runner. It takes four options.",
        },
        {
          kind: "list",
          items: [
            "`--slice` is required. It names one of the five slices.",
            "`--version` picks a released version of the dataset. The default is the current one.",
            "`--out` also writes the JSON to a file.",
            "`--graph` picks the desk design. The default is `handoffs`.",
          ],
        },
        {
          kind: "p",
          text: "The command prints the JSON and exits 0, even when items failed. The eval gate of chapter 8, which decides whether a change ships, is the command that exits 1.",
        },
        {
          kind: "p",
          text: "A bad input exits 2 with a message on standard error. That covers an unknown slice, a missing dataset or version, an invalid item, and a slice whose backend is missing.",
        },
        {
          kind: "p",
          text: "The capstone's `eval run` has two more options, `--runs` and `--judge`. They arrive in chapters 6 and 3 as the aliases `RunsOption` and `JudgeOption`, so leave them out for now.",
        },
        {
          kind: "p",
          text: "Course 1 gave you `askpep eval` as a single command with `--min-recall`. The new `eval run` sits beside it, so `eval` becomes a command group. Your old command turns into the group's callback. It runs when no subcommand is given, and it returns early when one is. `askpep eval` scores retrieval as before.",
        },
        {
          kind: "p",
          text: "The helper `open_eval` builds the backends and opens the services. A run of only the attack slice opens none, because the attack plays offline.",
        },
        // CHECK: these six lines are the real output of the capstone's offline attack run on 21 October 2026. A learner's own course 3 guards and attack set should also give n of 25 and a rate of 0.0, but no one has run this chapter's command in a learner's workspace. the learner should run it once there.
        {
          kind: "step",
          id: "evals02-s01",
          title: "Run the attack slice offline",
          text: "Do this after lab step 6. The attack slice plays course 3's attacks against your guards without a model, so the run needs no key. Run it from your AskPEP workspace root. The log lines go to standard error. The command drops them and keeps the first six lines of the result.",
          lang: "bash",
          code: `uv run askpep eval run --slice attack 2>/dev/null | head -6`,
          expect: `{
  "slice": "attack",
  "version": "v1",
  "n": 25,
  "rate": 0.0,
  "items": {`,
        },
        {
          kind: "quiz",
          id: "evals02-q7",
          question: "The retrieval slice has 22 items, and 20 are answerable. A run gives a `rate` of 0.75. What does that mean?",
          options: [
            "15 of the 20 answerable items had full recall at 6.",
            "75 percent of the expected documents were found in the top 6.",
            "15 of the 22 items passed.",
            "The desk answered 75 percent of the questions correctly.",
          ],
          answer: 0,
          explain:
            "The runner scores the 20 answerable items, and an item passes only with full recall at 6. A rate of 0.75 is 15 of 20. It is a share of items and not of documents, and it says nothing about answers.",
        },
        {
          kind: "p",
          text: "The command now exists. The lead's reports still need sorting into graders, and the plan still says none yet.",
        },
      ],
    },
    {
      id: "s8-grader-map",
      title: "A grader map turns each reported failure into a check with a named decider",
      goal: "How do real reports become graders?",
      blocks: [
        {
          kind: "p",
          text: "A **grader map** lists each thing that can go wrong and the check that would catch it. You build it from real reports, so each row has a reason to exist. It shows where the answer to each check lives, which is what decides who or what can grade it.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Take the failures people have reported.",
            "Find where the correct answer lives for each one.",
            "If a field holds it, name a code grader.",
            "If only reading the text can settle it, name the judge.",
            "State the failure message the check gives, and update the plan.",
          ],
        },
        {
          kind: "p",
          text: "The second team's lead sent three reports from the first week of the pilot. The first was the one you already know: a ticket request reached the researcher. The route is a field, so `grade_route` decides it. The run now fails with this reason: routed to researcher, expected writer.",
        },
        {
          kind: "p",
          text: "The second report said the desk cited the wrong PEP for a question about the walrus operator. Expected PEPs are in the item and citations are in the result, so `grade_citations` decides that one too.",
        },
        {
          kind: "p",
          text: "The third said an answer gave a line limit of 120 characters while citing PEP 8. The citation was right and the sentence was wrong. No field holds that, so it needs the judge.",
        },
        {
          kind: "p",
          text: "The lead asked why the third report wasn't on the same command. You told them the truth. A code grader can't read a sentence, and the judge has to be measured before anyone trusts it. That's the next chapter.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# GRADER-MAP.md
Reported by: second team's lead, first week of the pilot

Check                       Where the answer lives                  Decided by  Grader            Slice    Fails when
Goes to the right worker    result.route, item.expected_route       code        grade_route       routing  routes differ
Cites a PEP it should       result.citations, item.expected_docs    code        grade_citations   answer   no expected PEP is cited
Refuses only when it must   result.refused, item.answerable         code        grade_refusal     answer   refuses a valid question, or answers one it must refuse
Calls tools correctly       result.trajectory, item.expected_args   code        grade_tool_args   action   a tool or an argument is missing
Sentence matches its source only in the text                        judge       chapter 3         answer   a claim goes beyond the cited passage (T10)

## Eval plan rows changed
S2  routing  Grader: grade_route
S3  answer   Grader: grade_citations, grade_refusal, judge not yet measured
S4  action   Grader: grade_tool_args`,
          caption: "GRADER-MAP.md, built from the lead's three reports.",
        },
        {
          kind: "p",
          text: "Read the map by its third column. Four rows are decided by code, so they cost nothing and give the same answer every time. The fifth is the row the reviewer accepted as T10, and it stays open. Slices S1 and S5 aren't on the map because neither one grades a desk run.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# GRADER-MAP.md
Reported by:

Check (from a real report)  Where the answer lives  Decided by (code or judge)  Grader  Slice  Fails when

## Eval plan rows changed`,
          caption: "For your next system: the map with the values left blank.",
        },
        {
          kind: "p",
          text: "Code can't read an answer. So who checks that a sentence matches the passage it cites? The next chapter builds that reader and measures it.",
        },
      ],
    },
  ],
  lab: {
    title: "Build the code graders and the eval run command",
    goal: "Write the four graders and `grade_item` in `graders.py`, then add the `eval` group and `eval run` to `cli.py`. Steps 1 to 5 start from stubs that raise `NotImplementedError(\"evals-02 step N\")`. Step 6 edits your own `cli.py`. The tests build their own results, so nothing calls Gemini. Run them from your AskPEP workspace root. Then compare your files with `capstone/src/askpep/evals/`.",
    minutes: 70,
    files: [
      "src/askpep/evals/graders.py",
      "src/askpep/cli.py",
      "tests/evals/test_evals02_graders.py",
    ],
    steps: [
      {
        title: "Grade the citations",
        text: "Write `grade_citations` in `graders.py`. It reads the cited PEP numbers from `result.citations`. An answerable item passes when one expected PEP is cited, and its value is the share cited. An unanswerable item passes when nothing is cited. The stub raises `evals-02 step 1`.",
        code: `# src/askpep/evals/graders.py
def grade_citations(item: GoldenItem, result: "DeskResult") -> Score:
    """Did the answer cite the right PEPs? The score's name is "citations"."""
    # your turn:
    # 1. cited = the set of citation.doc_id over result.citations.
    # 2. Unanswerable item: pass with 1.0 when cited is empty. Otherwise fail with 0.0 and a reason that
    #    names the PEPs it cited and says the question has no answer.
    # 3. Answerable item: expected = set(item.expected_docs) and found = cited & expected.
    #    value = len(found) / len(expected), or 0.0 when expected is empty.
    # 4. Nothing found: fail, with a reason like "cites none of PEP 8" that names the expected PEPs.
    # 5. Otherwise pass. When some expected PEPs are missing, the reason reads like "misses PEP 20".
    ...`,
        test: "uv run pytest tests/evals -k evals02_s1",
      },
      {
        title: "Grade the route",
        text: "Write `grade_route` in `graders.py`. It compares `result.route` with `item.expected_route`. Equal routes pass with 1.0. Anything else fails with 0.0 and a reason that names both routes. An item with no `expected_route` fails. The stub raises `evals-02 step 2`.",
        code: `# src/askpep/evals/graders.py
def grade_route(item: GoldenItem, result: "DeskResult") -> Score:
    """Did triage send the question to the expected route? The score's name is "route"."""
    # your turn:
    # 1. No expected_route: fail with 0.0 and the reason "the item has no expected_route".
    # 2. Equal to result.route: pass with 1.0.
    # 3. Otherwise fail with 0.0 and the reason "routed to <route>, expected <expected>".
    ...`,
        test: "uv run pytest tests/evals -k evals02_s2",
      },
      {
        title: "Grade the tool arguments",
        text: "Write `grade_tool_args` in `graders.py`. For each tool in `item.expected_args`, look for a tool step of that name in the trajectory whose arguments pass `args_match`. The value is the share of tools met. Name each miss in the reason. The stub raises `evals-02 step 3`.",
        code: `# src/askpep/evals/graders.py
def grade_tool_args(item: GoldenItem, result: "DeskResult") -> Score:
    """Did each tool run with the right arguments? The score's name is "tool_args"."""
    # your turn:
    # 1. No expected_args: pass with 1.0.
    # 2. For each tool and its expected arguments, calls = the steps of result.trajectory
    #    whose kind is "tool" and whose name is that tool.
    # 3. No calls: record "<tool> never ran". Calls, but none passes args_match(expected, call.args):
    #    record "<tool> ran with other arguments".
    # 4. value = tools met over tools expected. The score passes when nothing was missed.
    #    The reason joins the misses with "; ".
    ...`,
        test: "uv run pytest tests/evals -k evals02_s3",
      },
      {
        title: "Grade a refusal",
        text: "Write `grade_refusal` in `graders.py`. It reads `result.refused` and `item.answerable` and nothing else. It fails an answerable item that was refused, and an unanswerable item that was not, each with its own reason. A correct run scores 1.0. The stub raises `evals-02 step 4`.",
        code: `# src/askpep/evals/graders.py
def grade_refusal(item: GoldenItem, result: "DeskResult") -> Score:
    """Did the desk refuse when it should, and answer when it should? The score's name is "refusal"."""
    # your turn:
    # 1. Answerable and refused: fail with 0.0 and the reason "refused a question that has an answer".
    # 2. Unanswerable and not refused: fail with 0.0 and the reason "answered a question that has no answer".
    # 3. Otherwise pass with 1.0.
    ...`,
        test: "uv run pytest tests/evals -k evals02_s4",
      },
      {
        title: "Run every grader for one item",
        text: "Write `grade_item` in `graders.py`. It looks up the slice in `SLICE_GRADERS` and calls each named grader from `GRADERS`. A slice with no entry gives an empty list. Catch nothing, so a bug in a grader stops the run. The stub raises `evals-02 step 5`.",
        code: `# src/askpep/evals/graders.py
def grade_item(item: GoldenItem, result: "DeskResult") -> list[Score]:
    """Run every grader of the item's slice, and return their scores in order."""
    # your turn: names = SLICE_GRADERS.get(item.slice, ()). Return GRADERS[name](item, result) for each name.
    # Do not wrap the calls in try or except.
    ...`,
        test: "uv run pytest tests/evals -k evals02_s5",
      },
      {
        title: "Add the eval command",
        text: "Edit your own `cli.py`, so this step has no stub. Turn your course 1 `eval` command into a group, add the two helpers, then write `eval run`. It scores one slice and prints the result as JSON. The test raises `evals-02 step 6` until the command exists.",
        code: `# src/askpep/cli.py
# 1. Make the group. Swap your @app.command(name="eval") line for the callback decorator,
#    add ctx as the first parameter, and return early when a subcommand was given.
eval_app = typer.Typer(help="Score AskPEP. With no subcommand, it scores retrieval on evals/golden.jsonl.")
app.add_typer(eval_app, name="eval")


@eval_app.callback(invoke_without_command=True)
def run_eval_command(
    ctx: typer.Context,
    judge: Annotated[bool, typer.Option("--judge", help="Also score faithfulness with the LLM.")] = False,
    min_recall: float = 0.8,
    min_mrr: float = 0.5,
    min_faithfulness: float = 0.8,
) -> None:
    """Score retrieval against evals/golden.jsonl. Exits 1 when a score is under its threshold."""
    import json
    from dataclasses import asdict

    from askpep.evals import load_golden, run_eval

    if ctx.invoked_subcommand is not None:
        return
    # the rest of your body stays as it is


# 2. Add these two helpers. They ship complete. The judge lines stay off until chapter 3.
GraphOption = Annotated[str, typer.Option("--graph", help="handoffs, supervisor or baseline.")]


def open_eval(slices: list[str], graph: str, with_judge: bool):
    """What a run of these slices needs: the backends, the answer judge if asked for, and the services to
    close afterwards. The attack slice plays offline, so a run of only that slice opens no services."""
    from askpep.evals.judge import RubricJudge
    from askpep.evals.runner import Backends, live_backends

    if all(name == "attack" for name in slices):
        return Backends(), None, None
    svc = open_services()
    judge = RubricJudge(svc.chat("judge")) if with_judge else None
    return live_backends(svc, check_graph(graph)), judge, svc


def close_eval(svc) -> None:
    from askpep.db import close_langgraph

    if svc is not None:
        close_langgraph(svc.checkpointer, svc.memory)


# 3. Write the command.
@eval_app.command("run")
def eval_run(
    slice: Annotated[str, typer.Option("--slice", help="retrieval, routing, answer, action or attack.")],
    version: Annotated[
        str, typer.Option("--version", help="A dataset version. Default: the current one.")
    ] = "",
    out: Annotated[str, typer.Option("--out", help="Also write the result to this JSON file.")] = "",
    graph: GraphOption = "handoffs",
) -> None:
    """Run one slice of the datasets, and print its pass rate and what failed."""
    # your turn:
    # 1. Import json and Path, SLICES from askpep.evals.datasets, run_slice from askpep.evals.runner,
    #    and ProviderError from askpep.providers.
    # 2. A slice outside SLICES raises typer.BadParameter(f"{slice!r} is not one of: {', '.join(SLICES)}",
    #    param_hint="--slice").
    # 3. svc = None. In a try, call open_eval([slice], graph, False) to get backends, answer_judge and svc.
    #    Then run = run_slice(slice, backends, version=version). The answer_judge is None until chapter 3.
    # 4. Catch OSError, ValueError, KeyError and ProviderError. Echo the message to standard error
    #    and raise typer.Exit(code=2) from the error. In a finally block, call close_eval(svc).
    # 5. Echo json.dumps(run.to_json(), indent=2). When out is set, create its parent folders
    #    and write the same JSON to it, with a newline at the end.
    ...`,
        test: "uv run pytest tests/evals -k evals02_s6",
      },
    ],
    verify: "uv run pytest tests/evals -k evals02",
  },
  recap: [
    "Use a code grader when a field of the result holds the answer, and a judge when the answer lives in the prose.",
    "A grader is a function from an item and a result to a `Score` with a name, a value, a pass decision and a reason.",
    "Grade citations, routes and refusals from `citations`, `route` and `refused`, and never from the answer text.",
    "`args_match` ignores extra keys, accepts any order in a list and compares text whole, ignoring case.",
    "A refusal grader fails in both directions, so a desk that refuses everything scores badly.",
    "`grade_item` catches no error, and `eval run` prints each failed item with its reason.",
    "A grader map lists each reported failure, where its answer lives and whether code or a judge decides it.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In graders I learned to use code wherever a field of the result holds the answer. A refusal grader must fail both ways, or refusing everything scores well. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["evals-q03", "evals-q04", "evals-q19"],
};

export default chapter;
