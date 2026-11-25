import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "evals-07-error-analysis-and-synthetic-data",
  course: "evals",
  number: 7,
  title: "Read the failures before you invent a metric",
  tagline: "Failures are piling up in four slices. Which one do you fix first?",
  minutes: 45,
  objectives: [
    "Read a batch of failed runs and write one plain note for each before you choose a metric.",
    "Give each failed run one code, from the first failed check, and count the codes.",
    "Choose a fix from the counts, the effort and the harm, and write its test items first.",
    "Find the slices with the least headroom against their floor or ceiling.",
    "Generate synthetic cases that inherit their labels, drop the cheap failures in code, and read the rest.",
    "Write an error review, choose the first fix and write the failing test before it.",
  ],
  sections: [
    {
      id: "s1-read-first",
      title: "A pass rate counts failures, and only the failed runs say why",
      goal: "Why read the failed runs before adding a metric?",
      blocks: [
        {
          kind: "p",
          text: "Chapters 2 to 6 gave the desk scores. A grader looks at one run and returns a `Score`. Each score has a name, and a failed one has a reason. A run fails when any of its scores fails. A pass rate counts how many runs fail. It says nothing about their cause.",
        },
        {
          kind: "p",
          text: "Here is a made-up run. The retrieval, routing, answer and action slices give 62 runs, and 17 fail. The pass rate is 73 percent. That says the desk is weak. It doesn't say where, so any fix you pick is a guess.",
        },
        {
          kind: "p",
          text: "The run counts in this chapter are made up to show the method. Your own run will give different ones.",
        },
        {
          kind: "p",
          text: "You met the same gap in course 3. Its output guard checks that each `[n]` in an answer points at a retrieved source. It can't see a wrong source or a missing citation. When bad answers get past it, someone has to read the runs. That is the other half of hallucination triage, and it is this chapter.",
        },
        {
          kind: "p",
          text: "So read first. For each failed run, look at the question, the answer, and every failed score with its reason. Then write one note in plain words about what went wrong. Write the note before any category exists.",
        },
        {
          kind: "code",
          lang: "json",
          caption: "One note on a failed retrieval run. It is plain words, and it says what happened.",
          code: `{
  "item_id": "q02",
  "note": "The question says 'the Python style guide' and never names PEP 8. The search missed it."
}`,
        },
        {
          kind: "p",
          text: "For a retrieval failure, run the question through `askpep search`. It prints the first six results with their headings. For an answer failure, `askpep ask` prints the answer and its sources.",
        },
        {
          kind: "p",
          text: "How many runs should you read? On a golden set, read every failure. Real user questions are different. Draw 50 to 100 at random and read them all.",
        },
        {
          kind: "p",
          text: "The size matters. A failure that hits 5 percent of runs escapes 50 reads about 8 times in 100. It escapes 100 reads fewer than once in 100.",
        },
        {
          kind: "quiz",
          id: "evals07-q1",
          question: "One failure hits 5 percent of real user runs. You read 50 random ones. How likely are you to see it at least once?",
          options: ["About 25 percent", "About 50 percent", "About 92 percent", "Exactly 100 percent"],
          answer: 2,
          explain: "The chance of missing it in all 50 reads is 0.95 to the power 50, which is about 8 percent. So you see it about 92 percent of the time. At 100 reads you see it more than 99 percent of the time.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "An AI feature fails sometimes and has no metrics. Where do you start?",
          text: "Open with the answer: read 50 to 100 real runs by hand before you choose any metric. Write one plain note for each, group the notes into failure codes, and count them. Interviewers ask why you don't start with a judge score. Say that a score measures a guess, and the counts show what to fix first.",
        },
        {
          kind: "p",
          text: "Reading a run gives you a note. Counting needs a code.",
        },
      ],
    },
    {
      id: "s2-codes",
      title: "Each failed run gets one code, named for the first check that failed",
      goal: "How do you give each failed run one code?",
      blocks: [
        {
          kind: "p",
          text: "Notes are hard to count, so group them. A failure code names a group. The set of codes is the failure taxonomy. A good code names the stage that failed, because the stage points at the fix. The code 'wrong answer' names a symptom with many possible causes.",
        },
        {
          kind: "p",
          text: "AskPEP uses ten codes. Each failed score gives one of them. The table lists the pairs.",
        },
        {
          kind: "compare",
          caption: "Chapter 2 built `route`, `refusal`, `citations` and `tool_args`. Chapter 3 built `judge`, and chapter 6 built `trajectory`. `recall@6` is the retrieval check from course 1, and `attack` is the attack slice from course 3.",
          columns: ["Failed score", "Code", "What went wrong"],
          rows: [
            ["`route`", "`wrong_route`", "Triage sent the question to the wrong agent."],
            ["`refusal`", "`wrongly_refused`", "The desk refused a question that has an answer."],
            ["`refusal`", "`wrongly_answered`", "The desk answered a question that has no answer."],
            ["`recall@6`", "`missed_retrieval`", "The search left an expected PEP out of its first six results."],
            ["`citations`", "`missed_source`", "The answer cites none of the expected PEPs."],
            ["`citations`", "`wrongly_answered`", "The answer cites a PEP for a question that has no answer."],
            ["`tool_args`", "`wrong_args`", "A tool ran with other arguments, or never ran."],
            ["`trajectory`", "`wrong_path`", "The tools ran in the wrong order, took too many steps or stopped early."],
            ["`judge`", "`unsupported_answer`", "The judge found the answer wrong, or not supported by its sources."],
            ["`attack`", "`attack_succeeded`", "An attack from the attack slice got through."],
          ],
        },
        {
          kind: "p",
          text: "The tenth code is `other`. It catches a failed score with a name the table doesn't list. Keep it small. When it grows, the table needs a new row.",
        },
        {
          kind: "p",
          text: "One cause can fail several checks. Say triage sends an ordinary question to the `refuse` route. The desk refuses, so it cites nothing. The `route`, `refusal` and `citations` scores all fail. There is one cause.",
        },
        {
          kind: "p",
          text: "So a run gets one code. `code_failure` reads `PRIORITY` in order, a fixed list of score names. The list runs roughly in the order the desk does its work. The first score in it that failed sets the code. In the example above, that is `route`.",
        },
        {
          kind: "code",
          lang: "python",
          caption: "The order that decides the code. It ships in your stub of `analysis.py`.",
          code: `PRIORITY = ("route", "refusal", "recall@6", "citations", "tool_args", "trajectory", "judge", "attack")`,
        },
        {
          kind: "p",
          text: "A run whose scores all passed gets no code. It stays out of the count. Two codes for one run would count it twice, and the table would add up to more than the failures.",
        },
        {
          kind: "widget",
          id: "evals07-failure-coder",
          intro: "Eight failed runs follow. The questions come from the golden set, and the scores are made up. For each run, pick the code that `code_failure` gives. Three runs fail two scores, so mind the order.",
        },
        {
          kind: "quiz",
          id: "evals07-q2",
          question: "An answerable question fails `route`, `refusal` and `citations`. Triage chose the `refuse` route. Which code does `code_failure` give?",
          options: ["`wrongly_refused`", "`wrong_route`", "`missed_source`", "`other`"],
          answer: 1,
          explain: "`route` is first in `PRIORITY`, and it failed. The desk refused and cited nothing because triage sent the question to the refuse route. One cause gets one code, and the earliest failed check names it.",
        },
        {
          kind: "p",
          text: "Once every failed run has a code, you can count them.",
        },
      ],
    },
    {
      id: "s3-count",
      title: "Count the codes and fix the biggest cause first, unless a smaller one harms more",
      goal: "Which failure do you fix first, and what test comes before the fix?",
      blocks: [
        {
          kind: "p",
          text: "Now count. Of the 17 failed runs, six have the code `missed_retrieval` and three have `wrongly_refused`. Three codes have two runs each, and two have one. `failure_table` returns these rows.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "A failure table on made-up counts. Each row is a code, its count and its share of the 17 failures.",
          code: `code                count  share
missed_retrieval        6    35%
wrongly_refused         3    18%
wrong_args              2    12%
wrong_path              2    12%
wrong_route             2    12%
missed_source           1     6%
unsupported_answer      1     6%`,
        },
        {
          kind: "p",
          text: "The most common code comes first. Codes with the same count sit in alphabetical order. The same failures always give the same table, so you can compare one week with the next.",
        },
        {
          kind: "p",
          text: "The top row is the first candidate for a fix. Six of 17 is 35 percent. Fixing it alone lifts the pass rate from 45 of 62 to 51 of 62, which is 73 percent to 82 percent.",
        },
        {
          kind: "p",
          text: "Count is not the only input. A fix that takes an hour can beat one that takes a week. A rare failure can do more harm. A `wrongly_answered` run shows the user an answer the PEPs can't support. A `missed_retrieval` run in the retrieval slice produces no answer at all. Weigh the count, the effort and the harm together.",
        },
        {
          kind: "p",
          text: "Small counts are rough. Six against two is a real gap. Two against one is not. Chapter 8 puts intervals on rates. Until then, don't rank codes that differ by one.",
        },
        {
          kind: "p",
          text: "A code says where the desk failed. It doesn't say why. So read inside the biggest code before you fix anything. Suppose you read the six `missed_retrieval` runs and write these notes.",
        },
        {
          kind: "list",
          items: [
            "q02: the question says 'the Python style guide' and never names PEP 8.",
            "q04: the question describes a docstring rule and never names PEP 257.",
            "q06: the question names `Any` and `Union` and gives no PEP number.",
          ],
        },
        {
          kind: "p",
          text: "Suppose five of the six notes say the same thing: the question never names its PEP. That is the cause. The fix belongs in the search, not in the writer. The cause is also a new group of test cases.",
        },
        {
          kind: "p",
          text: "Write the check before the fix. Add six to ten retrieval items whose questions describe a PEP without naming it. Release them as a new dataset version, as in chapter 1. Run them and watch them fail. Fix the search, then watch them pass. A fix with no failing check beforehand proves nothing.",
        },
        {
          kind: "step",
          id: "evals07-s01",
          title: "Code the failures of one slice of your own desk",
          text: "Do this after lab step 2. Save this script as `scratch/error_analysis.py` in your AskPEP repo. It runs one slice on the live desk, then prints each failed run with its code, and a failure table. It calls the models, so it costs a little. It needs the database and keys that `askpep eval run` uses.",
          lang: "python",
          code: `# scratch/error_analysis.py
# Run it with: uv run python scratch/error_analysis.py answer
# The slice is retrieval, routing, answer or action.
import sys

from askpep.cli import open_services
from askpep.db import close_langgraph
from askpep.evals.analysis import failure_table, failures_of
from askpep.evals.datasets import load_dataset
from askpep.evals.runner import live_backends, run_slice

name = sys.argv[1] if len(sys.argv) > 1 else "answer"
svc = open_services()
try:
    run = run_slice(name, live_backends(svc))
finally:
    close_langgraph(svc.checkpointer, svc.memory)
failures = failures_of(run, load_dataset(name))
print(f"{name}: {len(failures)} failed of {len(run.records)} items")
for f in failures:
    print(f"{f.item_id}  {f.code}  {f.question}")
    print(f"    {f.reason}")
for code, count, share in failure_table(failures):
    print(f"{code:<20}{count:>3}{share:>6.0%}")`,
          expect: "A first line with the slice name and its counts. Then two lines for each failed run, with its item id, code and question, and the reasons. Last, one row for each code. Your counts will differ from this chapter's.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Do not tune the desk on the runs you read",
          text: "After you read 17 failures, you know them by heart. A fix that makes exactly those 17 pass may fix their wording and nothing else. A rule that maps 'style guide' to PEP 8 passes q02 and no other question. Fix the cause, and score the fix on new items.",
        },
        {
          kind: "quiz",
          id: "evals07-q3",
          question: "`missed_retrieval` has 3 failures, and its fix takes a week. `wrongly_answered` has 2 failures that each show the user an unsupported answer. Its fix takes an hour. Which do you fix first?",
          options: [
            "`missed_retrieval`, because 3 is more than 2.",
            "Neither, until you have 100 failures to count.",
            "Whichever comes first alphabetically.",
            "`wrongly_answered`, because it does more harm and costs far less.",
          ],
          answer: 3,
          explain: "Count is one input. A cheap fix for a harmful failure beats a slow fix for a mild one. The counts 3 and 2 are too close to rank on their own, so harm and effort decide.",
        },
        {
          kind: "quiz",
          id: "evals07-q4",
          question: "You fix the search until all six `missed_retrieval` runs pass. What does that show?",
          options: [
            "The fix works on those six questions. New items show whether it holds.",
            "The cause is fixed for every question.",
            "The retrieval slice will now pass its floor.",
            "Nothing, because passing runs can't be trusted.",
          ],
          answer: 0,
          explain: "You read those six runs, so they are no longer a fair test. The new items about the cause are the test. They were written before the fix and the fix never saw them.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "You found six failure categories. What do you fix first, and how do you stop them returning?",
          text: "Rank the categories by failures removed for the effort, weighted by harm, and fix the top one. Then turn each cause into test items written before the fix, so a regression fails a test. Interviewers push on small counts. Say you don't rank categories that differ by one, and you score the fix on a fresh sample.",
        },
        {
          kind: "p",
          text: "The count says where failures are. A slice can also be at risk with few failures, because of its limit.",
        },
      ],
    },
    {
      id: "s4-weak-slices",
      title: "A slice with little headroom needs new test cases first",
      goal: "Which slice has the least room for error?",
      blocks: [
        {
          kind: "p",
          text: "Some slices have more room for error than others. Each slice has a limit in `evals/gate.json`. Four slices have a **floor**, which is the lowest rate that passes. The attack slice has a **ceiling**, which is the highest attack success rate that passes. Chapter 8 builds the command that enforces them.",
        },
        {
          kind: "compare",
          caption: "The limits in `evals/gate.json`. The retrieval rate, `recall@6`, is the share of items with full recall at 6, which means every expected PEP is among the first six results.",
          columns: ["Slice", "Rate", "Pass mark"],
          rows: [
            ["retrieval", "`recall@6`", "floor 80 percent"],
            ["routing", "`route_accuracy`", "floor 90 percent"],
            ["answer", "`answer_pass`", "floor 80 percent"],
            ["action", "`trajectory_pass`", "floor 80 percent"],
            ["attack", "`attack_success_rate`", "ceiling 5 percent"],
          ],
        },
        {
          kind: "p",
          text: "A `SliceResult` in `gate.py` holds one slice's result. `weak_slices` reads three of its fields: `rate`, `floor` and `ceiling`. A slice with no floor or no ceiling holds `None` there. Chapter 8 explains the other fields.",
        },
        {
          kind: "p",
          text: "Headroom is how far a slice is from failing. With a floor, it is the rate minus the floor. With a ceiling, it is the ceiling minus the rate. A slice with both takes the smaller.",
        },
        {
          kind: "p",
          text: "Rates are fractions between 0 and 1, so the default margin of 0.05 is 5 points. A slice with less headroom than the margin is weak.",
        },
        {
          kind: "p",
          text: "A slice that already fails has negative headroom, so it comes first. Slices with the same headroom come in alphabetical order. A slice with neither a floor nor a ceiling has no headroom and is left out.",
        },
        {
          kind: "compare",
          caption: "An invented run on made-up pass counts, with the real limits. It isn't the pilot's run. At the default margin, `weak_slices` returns routing, attack and action, in that order.",
          columns: ["Slice", "Result", "Rate", "Pass mark", "Headroom"],
          rows: [
            ["retrieval", "18 of 20 pass", "90.0%", "floor 80%", "10.0 points"],
            ["routing", "14 of 16 pass", "87.5%", "floor 90%", "-2.5 points"],
            ["answer", "12 of 14 pass", "85.7%", "floor 80%", "5.7 points"],
            ["action", "10 of 12 pass", "83.3%", "floor 80%", "3.3 points"],
            ["attack", "1 of 25 got through", "4.0%", "ceiling 5%", "1.0 point"],
          ],
        },
        {
          kind: "p",
          text: "Answer has 5.7 points, which is just above the margin. Action needs watching. It has 12 items, so one more failure takes it from 83.3 to 75 percent. That is under its floor. A small slice has little headroom even when its rate looks fine.",
        },
        {
          kind: "widget",
          id: "evals07-weak-slices",
          intro: "The five slices from the table come back with a margin you choose. Three margins follow. For each one, tick the slices you think `weak_slices` returns, then check. Headroom is in points of rate.",
        },
        {
          kind: "quiz",
          id: "evals07-q5",
          question: "A slice has a floor of 0.8 and a rate of 0.78. What does `weak_slices` do with it at the default margin?",
          options: [
            "Leaves it out, because it already failed.",
            "Lists it last, because it is furthest from 1.",
            "Lists it, with negative headroom, ahead of slices that still pass.",
            "Raises an error.",
          ],
          answer: 2,
          explain: "Headroom is 0.78 minus 0.8, which is -0.02. That is below the margin, so the slice is weak. Negative headroom sorts before every positive headroom, so a failing slice comes first.",
        },
        {
          kind: "p",
          text: "A weak slice needs more items, and more items take time to write.",
        },
      ],
    },
    {
      id: "s5-synthetic",
      title: "A reworded question inherits its label for free, so check that it kept the meaning",
      goal: "How do you grow a weak slice cheaply and still trust it?",
      blocks: [
        {
          kind: "p",
          text: "A weak slice has few items, so one failure shifts its rate a long way. More items would help. Writing labels by hand is slow. A rewording is cheaper. Ask a model to put an existing question in other words, and give the new item the old item's labels.",
        },
        {
          kind: "p",
          text: "Take item `a01` of the answer dataset. It asks for the maximum line length PEP 8 recommends for code. Its labels name PEP 8, and its reference answer is `79 characters.` The question `How long may a line of code be under PEP 8?` has the same answer, so it needs no new labels.",
        },
        {
          kind: "p",
          text: "`synthesise_cases` builds the new item with `replace`, which copies an item and changes some fields. It changes three. The `id` becomes `a01-s1`, the `question` becomes the rewording, and `source` becomes `synthetic`. You met `source` in chapter 1. It lets you score synthetic items apart from human ones.",
        },
        {
          kind: "p",
          text: "The model replies with a JSON list of strings. It can send junk, so the function drops what code can catch.",
        },
        {
          kind: "list",
          items: [
            "An entry that isn't text, or is blank.",
            "An entry that matches the item's own question, or a question you pass in `existing`, ignoring case and spaces.",
            "An entry that repeats an earlier entry.",
            "An item that fails `validate_item`, the labelling rules from chapter 1.",
          ],
        },
        {
          kind: "p",
          text: "A reply that isn't a JSON list gives no items. The function fails closed. It numbers the ids by the entries it kept, and keeps at most `n` of them. The default `n` is 3.",
        },
        {
          kind: "p",
          text: "Code can't catch the worst mistake. A model may change the meaning. 'What is the maximum line length PEP 8 recommends for docstrings?' looks like a rewording of `a01`. Its answer is 72 characters, and the inherited label says 79. It passes every filter and carries a wrong label.",
        },
        {
          kind: "widget",
          id: "evals07-synthetic-filter",
          intro: "A model was asked for five rewordings of `a01` and sent eight entries. Choose keep or drop for each one, then check. The widget shows what the code filters did, and what a careful reader would do.",
        },
        {
          kind: "p",
          text: "So a person reads what the code keeps. Read all of it while the set is small. When it grows, read a random 50. Count the bad ones. If more than a few are bad, tighten the instruction and generate again.",
        },
        {
          kind: "p",
          text: "Use a model from a different family than the desk. The desk runs on Gemini, and the `judge` role is Claude. A desk graded on questions its own family wrote may find them easier than real users' questions.",
        },
        {
          kind: "p",
          text: "Synthetic items add less than they seem. Three rewordings of 14 items are 42 new questions about the same 14 facts. They test whether a fix holds when the wording changes. They don't test topics you never wrote.",
        },
        {
          kind: "p",
          text: "Score them apart from the human items, by `source`. Never let them lift a slice's rate on their own.",
        },
        {
          kind: "step",
          id: "evals07-s02",
          title: "Reword three items of a slice and read the result",
          text: "Do this after lab step 4. Save this script as `scratch/synthesise.py`. It asks the `judge` model for three rewordings of each of the first three items in a slice, and prints them under the original. It calls Claude three times, so it costs a little, and it needs your Anthropic key. Read every line yourself.",
          lang: "python",
          code: `# scratch/synthesise.py
# Run it with: uv run python scratch/synthesise.py answer
import sys

from askpep.config import Settings
from askpep.evals.analysis import synthesise_cases
from askpep.evals.datasets import load_dataset
from askpep.providers import make_chat_model

name = sys.argv[1] if len(sys.argv) > 1 else "answer"
items = load_dataset(name)
model = make_chat_model(Settings(), "judge")
seen = [item.question for item in items]
for item in items[:3]:
    print(f"\\n{item.id}  {item.question}")
    for made in synthesise_cases(model, item, n=3, existing=seen):
        print(f"  {made.id}  {made.question}")
        seen.append(made.question)`,
          expect: "Three blocks. Each starts with an original item and lists up to three rewordings, with ids such as a01-s1. Check that each rewording has the same answer as its original. Your rewordings will differ from run to run.",
        },
        {
          kind: "p",
          text: "Make the whole thing a loop, because a taxonomy goes stale when the desk changes. Each week, repeat these steps.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Run the slices and code the failures.",
            "Count the codes, and read inside the biggest one.",
            "Write the test items for its cause, then fix it.",
            "Run `weak_slices`, and write synthetic cases for the slices it lists.",
            "Release the new items as a new dataset version.",
          ],
        },
        {
          kind: "p",
          text: "Questions from real users join this loop later. They come from online evaluation, which the LLMOps course covers. The `source` field already has a value for them, `production`.",
        },
        {
          kind: "fold",
          tone: "plain",
          title: "Can a model write the notes for you?",
          text: "It can draft them. Treat the draft like a judge. Read 20 failed runs yourself, compare, and measure agreement as in chapter 3. Keep reading the runs too. The notes are how you learn what the desk gets wrong.",
        },
        {
          kind: "quiz",
          id: "evals07-q6",
          question: "A model rewords `a01` as 'What is the maximum line length PEP 8 recommends for docstrings?' What does `synthesise_cases` do with that entry?",
          options: [
            "Keeps it, because no filter can see that the meaning changed.",
            "Drops it, because it changes the meaning.",
            "Drops it, because it differs from the original.",
            "Keeps it, and gives it a new reference answer.",
          ],
          answer: 0,
          explain: "Code checks form. The entry is text, it isn't blank, it isn't a repeat, and the item is valid. Only a reader sees that the answer is now 72 characters. That is why a person reads what the code keeps.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "How do you use synthetic data in an eval set without fooling yourself?",
          text: "Say that you treat each generated case as a claim to check. Tag it as synthetic, drop duplicates and invalid items in code, and read a sample by hand. Report its score apart from the human-written core set. Generate with a model from another family than the system under test.",
        },
        {
          kind: "p",
          text: "You now have a method for reading runs. The pilot's failures are waiting for it.",
        },
      ],
    },
    {
      id: "s6-error-review",
      title: "The error review finds one cause behind six failures and writes the test first",
      goal: "What did reading all 17 failures show?",
      blocks: [
        {
          kind: "p",
          text: "An **error review** is the written result of reading every failed run once. It holds one row per failure with its code and a note, the counts, the decision and the test that comes first. Anyone can check the decision against the rows.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Run all four graded slices once.",
            "Read each failed run and write a code and a note.",
            "Count by code and by slice.",
            "Choose the fix, weighted by harm.",
            "Write the failing test before you touch the search.",
          ],
        },
        {
          kind: "p",
          text: "You ran the four graded slices once more with every grader on. The result was 45 of 62, which is 17 failures. The counts are lower than chapter one's. Those came from the checks you had that week, which were looser than the graders you've built since.",
        },
        {
          kind: "p",
          text: "You read all 17 runs. Six were missed retrievals, and in five of those six the question never named its PEP. So the second team's people ask about a topic, and the search hunts for a number it never gets. That one cause is more than a third of the failures.",
        },
        {
          kind: "p",
          text: "Fixing it would take the pass count from 45 to 51 of 62, or from 73 percent to 82. The product owner asked whether the wrong-route items should come first, because the lead had complained. There are two of them, against six, and neither gives a wrong answer. So you chose retrieval, and you wrote the test first.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# ERROR-REVIEW-001.md
Run: all four graded slices once, with every grader on   Passes: 45 of 62   Failures: 17

Item  Slice      Code                Note
q02   retrieval  missed_retrieval    question names no PEP
q04   retrieval  missed_retrieval    question names no PEP
q06   retrieval  missed_retrieval    expected PEP ranked seventh
q09   retrieval  missed_retrieval    question names no PEP
q13   retrieval  missed_retrieval    question names no PEP
q17   retrieval  missed_retrieval    question names no PEP
r08   routing    wrong_route         ticket request went to the researcher
r14   routing    wrong_route         ticket request went to the researcher
a02   answer     wrongly_refused     relevant passages were present
a05   answer     wrongly_refused     relevant passages were present
a09   answer     wrongly_refused     relevant passages were present
a07   answer     missed_source       answered from one of two expected PEPs
a03   answer     unsupported_answer  one claim goes beyond its source
t08   action     wrong_args          ticket opened with the wrong PEP number
t11   action     wrong_args          ticket opened with no severity
t03   action     wrong_path          one step over the limit
t10   action     wrong_path          one step over the limit

Code                Count
missed_retrieval    6
wrong_route         2
wrongly_refused     3
missed_source       1
unsupported_answer  1
wrong_args          2
wrong_path          2
Total               17

Slice      Failures  Passes
retrieval  6         14 of 20
routing    2         14 of 16
answer     5         9 of 14
action     4         8 of 12
Total      17        45 of 62

## Decision
Fix missed_retrieval first. Six failures, and five share one cause.
If fixed: 51 of 62, from 73% to 82%.

## Test first
Release retrieval/v2 with 8 new items whose questions describe a PEP without naming it.
Items: 30.   Scored: 28.   Watch them fail before changing the search.`,
          caption: "ERROR-REVIEW-001.md. The item ids are real. The failures belong to the story.",
        },
        {
          kind: "p",
          text: "Read the counts, then the notes. The code says six retrievals missed. The note says why, and that is what suggests a fix. Without the notes you'd have tuned the search for a problem the questions caused.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# ERROR-REVIEW-NNN.md
Run:    Passes:    Failures:

Item  Slice  Code  Note (what you read in the run)

Code  Count
Slice  Failures  Passes

## Decision
(the fix, its reason, and the pass count if it works)

## Test first
(the items that must fail before you change anything)`,
          caption: "For your next system: the review with the values left blank.",
        },
        {
          kind: "p",
          text: "The retrieval fix is coming, and a fix can break something else. The next chapter builds the check that decides whether any change may ship.",
        },
      ],
    },
  ],
  lab: {
    title: "Build the error analysis of the PEP desk",
    goal: "Write the four functions of `src/askpep/evals/analysis.py`. Each step starts from a stub that raises `NotImplementedError(\"evals-07 step N\")`. The tests script the models, so nothing calls Gemini or Claude. One live test in step 4 is deselected. Run them from your AskPEP workspace root. Then compare your file with `capstone/src/askpep/evals/analysis.py` in the my-learn folder.",
    minutes: 60,
    files: [
      "src/askpep/evals/analysis.py",
      "tests/evals/test_evals07_error_analysis.py",
    ],
    steps: [
      {
        title: "Give a failed run its code",
        text: "Write `code_failure`. It takes the first failed score in `PRIORITY` order and returns that score's code. Scores that all passed give `None`. A failed score with an unlisted name gives `other`. Read `item.answerable` for the two scores that split in two. The stub raises `evals-07 step 1`.",
        code: `# src/askpep/evals/analysis.py
# PRIORITY and Failure ship complete. A Failure is one failed run with its code.
PRIORITY = ("route", "refusal", "recall@6", "citations", "tool_args", "trajectory", "judge", "attack")


@dataclass(frozen=True)
class Failure:
    item_id: str
    slice: str
    code: str
    question: str
    reason: str = ""


def code_failure(item: GoldenItem, scores: Sequence[Score]) -> str | None:
    """The one code for a run, or None when every score passed.

    Take the first failed score in \`PRIORITY\` order, and map its name to a code.

    1. \`route\` gives "wrong_route".
    2. \`refusal\` gives "wrongly_refused" for an answerable item, else "wrongly_answered".
    3. \`recall@6\` gives "missed_retrieval".
    4. \`citations\` gives "missed_source" for an answerable item, else "wrongly_answered".
    5. \`tool_args\` gives "wrong_args".
    6. \`trajectory\` gives "wrong_path".
    7. \`judge\` gives "unsupported_answer".
    8. \`attack\` gives "attack_succeeded".

    A failed score with any other name gives "other".
    """
    # your turn:
    # 1. failed = the names of the scores that did not pass. With none, return None.
    # 2. Walk PRIORITY. At the first name that is in failed, return that name's code.
    #    Read item.answerable for "refusal" and "citations".
    # 3. When no name in PRIORITY failed, the failed score has another name. Return "other".
    ...`,
        test: "uv run pytest tests/evals -k evals07_s1",
      },
      {
        title: "Count the failures by code",
        text: "Write `failure_table`. It counts the failures by code and returns one row for each: the code, its count and its share of all failures. The biggest count comes first, and ties go in alphabetical order. No failures give an empty list. The stub raises `evals-07 step 2`.",
        code: `# src/askpep/evals/analysis.py
def failure_table(failures: Iterable[Failure]) -> list[tuple[str, int, float]]:
    """Count the failures by code. Each row is (code, count, share of all failures), with the most common code
    first and ties in alphabetical order. No failures give []."""
    # your turn:
    # 1. Count the failures by failure.code in a dict. Read the failures once, because they may be a generator.
    # 2. total = the sum of the counts.
    # 3. Sort the (code, count) pairs by count, biggest first, then by code.
    #    One key does both: key=lambda pair: (-pair[1], pair[0]).
    # 4. Return (code, count, count / total) for each pair. No failures give [].
    ...`,
        test: "uv run pytest tests/evals -k evals07_s2",
      },
      {
        title: "Find the slices with little headroom",
        text: "Write `weak_slices`. Headroom is `rate - floor` for a floor, `ceiling - rate` for a ceiling, and the smaller when a slice has both. Return the slices whose headroom is under `margin`, the thinnest first. `SliceResult` ships in `gate.py`. The stub raises `evals-07 step 3`.",
        code: `# src/askpep/evals/analysis.py
# SliceResult ships complete in gate.py. weak_slices reads its rate, floor and ceiling.
def weak_slices(slices: "Mapping[str, SliceResult]", margin: float = 0.05) -> list[str]:
    """The slices with less than \`margin\` of headroom, the thinnest first.

    Headroom is how far the rate is from failing. For a slice with a floor it is \`rate - floor\`. For a slice
    with a ceiling it is \`ceiling - rate\`. A slice with both takes the smaller. A slice with neither has
    none, so leave it out. A slice that already fails has negative headroom, and comes first. Headroom
    equal to the margin is not weak.
    """
    # your turn:
    # 1. For each (name, result) pair, collect rate - floor when floor is not None,
    #    and ceiling - rate when ceiling is not None. The slice's headroom is the smaller of them.
    # 2. Keep the slice only when it has a headroom and that headroom is below margin.
    # 3. Return the names sorted by (headroom, name).
    ...`,
        test: "uv run pytest tests/evals -k evals07_s3",
      },
      {
        title: "Write synthetic cases from a labelled item",
        text: "Write `synthesise_cases`. Add `import json`, `replace` beside `dataclass`, and `validate_item` from `askpep.evals.datasets`. Call the model once with `SYNTH_SYSTEM`, read the JSON list, and keep only the rewordings that survive the filters. Each keeps the original's labels. The stub raises `evals-07 step 4`.",
        code: `# src/askpep/evals/analysis.py
# Add these imports at the top. The stub leaves them out.
#   import json
#   from dataclasses import dataclass, replace
#   from askpep.evals.datasets import validate_item
SYNTH_SYSTEM = (
    "Rewrite the question in {n} different ways. Keep its meaning, so that the same answer is correct. "
    "Reply with a JSON list of {n} strings and nothing else."
)


def synthesise_cases(
    model: "BaseChatModel", item: GoldenItem, n: int = 3, existing: Collection[str] = ()
) -> list[GoldenItem]:
    """Ask a chat model for \`n\` rewordings of an item's question, and return them as new items.

    Each new item copies every label of \`item\` and changes three fields: \`id\` is \`<id>-s1\`, \`<id>-s2\` and so
    on, \`question\` is the rewording, and \`source\` is "synthetic". Send one \`invoke\` call with a system message
    that holds \`SYNTH_SYSTEM.format(n=n)\` and a human message with the question. Read the JSON list from the
    first "[" to the last "]" in \`reply.text\`.

    Fail closed. A reply that is not a JSON list gives []. Drop an entry that is not text, is blank, matches
    the item's own question or a question in \`existing\` ignoring case and spaces, repeats an earlier entry,
    or fails \`validate_item\`. Number the ids by the entries that were kept, and keep at most \`n\`.
    """
    # your turn:
    # 1. Import HumanMessage and SystemMessage from langchain_core.messages. Call model.invoke once, with
    #    a SystemMessage that holds SYNTH_SYSTEM.format(n=n) and a HumanMessage that holds item.question.
    # 2. text = str(reply.text). Cut it from the first "[" to the last "]". With no bracket pair, return [].
    # 3. json.loads that slice. A ValueError, or a result that is not a list, gives [].
    # 4. seen = the item's question and every question in existing, each stripped and casefolded.
    # 5. For each candidate: skip it when it is not a str, is blank, or its stripped, casefolded text is in seen.
    # 6. made = replace(item, id=f"{item.id}-s{len(kept) + 1}", question=candidate.strip(), source="synthetic").
    #    Skip it when validate_item(made) returns a non-empty list. Otherwise add its text to seen and made to kept.
    # 7. Stop when kept holds n items. Return kept.
    ...`,
        test: "uv run pytest tests/evals -k evals07_s4",
      },
    ],
    verify: "uv run pytest tests/evals -k evals07",
  },
  recap: [
    "A pass rate says how often the desk fails. Only the failed runs say why.",
    "Give each failed run one code, from the first failed score in `PRIORITY`, and read the notes inside the biggest code.",
    "Count the codes with `failure_table`. Fix the biggest cause first, unless a smaller one does more harm or costs far less.",
    "Write the test items for a cause before the fix, and never score a fix on the runs you read.",
    "`weak_slices` lists the slices with less headroom than the margin. They get new cases first.",
    "`synthesise_cases` rewords an item and keeps its labels. Code drops the cheap failures, and a person reads the rest.",
    "An error review holds one row per failed run with a code and a note, then the decision and the test that comes first.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In error analysis I learned to read failed runs, give each one code and count the codes. I fix the biggest cause first and write synthetic cases for the weakest slices. When this shows up in our work, add one line starting TIL that names the idea.",
  interviewIds: ["evals-q13", "evals-q14", "evals-q17"],
};

export default chapter;
