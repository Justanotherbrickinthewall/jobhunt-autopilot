import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "evals-03-judges-and-calibration",
  course: "evals",
  number: 3,
  title: "Trust a judge only after it agrees with your labels",
  tagline: "Code can't read an answer. So how far can you trust a model that does?",
  minutes: 50,
  objectives: [
    "Say what `RubricJudge` sends to the model, how it reads the reply and why it fails closed.",
    "Compute Cohen's kappa by hand from a confusion grid, and say why raw agreement misleads.",
    "Measure position bias and length bias with `position_bias` and `length_bias`.",
    "Label the 24 shipped cases yourself, run the calibration command on your labels and read the report.",
    "Pin the judge and calibrate again whenever its model, rubric or settings change.",
    "Write a judge card from two calibration rounds, and say what the judge may do.",
  ],
  sections: [
    {
      id: "s1-reader",
      title: "Code graders cannot read an answer, so a judge has to",
      goal: "What does a judge add that code graders can't?",
      blocks: [
        {
          kind: "p",
          text: "In chapter 2 you graded desk runs with code. The graders in `askpep.evals`, the package that holds your datasets, check citations, routes, tool arguments and refusals. They are cheap and exact. None of them reads the text of the answer.",
        },
        {
          kind: "p",
          text: "Take this question: what is the maximum line length PEP 8 recommends? Suppose the desk answers 120 characters and cites PEP 8. Every code grader passes it, because the citation is right. The cited passage says 79.",
        },
        {
          kind: "p",
          text: "The judge from chapter 2 is a second model call that grades an answer. It reads the question, the answer and the **sources**, which are the passages the answer cites. One question, one answer and its sources make a **case**.",
        },
        {
          kind: "p",
          text: "You met this idea in the RAG course, where a judge checked an answer one claim at a time. This judge scores the whole answer on a scale from 1 to 5. You then check the judge itself against your own labels.",
        },
        {
          kind: "p",
          text: "A **rubric** tells the judge what each score means. Vague scales drift, because a seven out of ten means something different on every call. A rubric with five written levels usually stays steadier. Each written level is an **anchor**, a description the judge can match the answer against.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "The rubric your judge starts with. It ships in your stub as `GROUNDED_RUBRIC`.",
          code: `Grade whether the ANSWER to the QUESTION is correct and is supported by the SOURCES.

5: Every claim is in the sources, and the answer covers what the question asks.
4: Correct and supported, with a small gap in coverage.
3: Partly correct, or one claim goes beyond the sources.
2: Mostly wrong, or mostly unsupported.
1: Wrong, unsupported, or it does not answer the question.

A refusal is correct when the sources do not contain the answer.`,
        },
        {
          kind: "p",
          text: "The judge also needs a pass line. A score of 4 or 5 passes. That line is the **pass mark**, and it is a setting of the judge. A **verdict** records three things: whether the answer passed, the score from 1 to 5 and a one-sentence rationale.",
        },
        {
          kind: "p",
          text: "`RubricJudge` takes a chat model. You call it with a question, an answer and the sources. It sends two messages. The system message holds the rubric and a reply format that asks for one JSON object. The human message holds the question, the numbered sources and the answer. It calls the model once and reads the reply.",
        },
        {
          // CHECK: `claude-sonnet-5-5` is the default `judge_model` in the capstone's config.py. FACTS.md does not list it. Confirm it is the current Sonnet id at https://platform.claude.com/docs/en/about-claude/models/overview before you rely on it.
          kind: "p",
          text: "The judge model is Claude, and the desk runs on Gemini. A judge from another family than the answerer is the control for self-preference bias, the third bias from the RAG course. The `judge_model` setting in `config.py` names the model. Its default is `claude-sonnet-5-5`.",
        },
        {
          kind: "quiz",
          id: "evals03-q1",
          question: "The desk answers the line length question with 120 characters and cites PEP 8. Which of the four graders from chapter 2 fails it?",
          options: [
            "The citation grader, because the cited passage disagrees.",
            "The refusal grader, because the number is wrong.",
            "None of them, because none of them reads the text of the answer.",
            "The route grader, because the question was simple.",
          ],
          answer: 2,
          explain: "The chapter 2 graders check what the run did, such as which passages it cited and whether it refused. None of them compares the answer text with the passage. A judge reads both.",
        },
        {
          kind: "p",
          text: "The judge's reply is text from a model, and the desk has to do something with it.",
        },
      ],
    },
    {
      id: "s2-reply",
      title: "A judge's reply is untrusted text, so fail closed when you cannot read it",
      goal: "What happens when the judge's reply can't be read?",
      blocks: [
        {
          kind: "p",
          text: "You ask the judge for one JSON object with a whole-number `score` from 1 to 5 and a `rationale`. Models do not always comply. They wrap the JSON in a code fence, add a sentence around it, or send a score that makes no sense.",
        },
        {
          kind: "p",
          text: "`parse_rubric_reply` reads from the first opening brace to the last closing brace. A fence or a sentence around the JSON does no harm. It accepts 4.0 as 4. It rejects a missing score, a score of `true` and a score outside 1 to 5.",
        },
        {
          kind: "p",
          text: "When it cannot read a reply, it fails closed, the rule from course 3. A check that fails closed blocks when it is unsure. The parser returns a verdict that did not pass, with score 1 and a rationale that says what went wrong. It never raises, and it never passes a reply it could not read.",
        },
        {
          kind: "compare",
          caption: "What the parser returns for six replies, with the pass mark at 4.",
          columns: ["The reply", "The verdict", "Why"],
          rows: [
            ["JSON with score 5", "Passes, score 5", "A whole number at or above the pass mark."],
            ["JSON in a code fence, score 4.0", "Passes, score 4", "The parser reads from the first brace and accepts 4.0 as 4."],
            ["JSON with score 3 and a rationale", "Fails, score 3", "Below the pass mark. The rationale is kept."],
            ["JSON with score 7", "Fails, score 1", "The score is outside 1 to 5."],
            ["JSON with score true", "Fails, score 1", "A bool is not a number."],
            ["A sentence and no JSON", "Fails, score 1", "The reply has no JSON object."],
          ],
        },
        {
          kind: "p",
          text: "A real score of 1 and an unreadable reply look alike in the score. Only the rationale tells them apart. Read the rationale before you decide what went wrong.",
        },
        {
          kind: "p",
          text: "Tests cannot call Claude. Chapter 9 of the RAG course gave you `Judge`, a function from a prompt to text, and `check_faithfulness` took one. In the lab you add `ScriptedJudge` to `fakes.py`. It replays the replies you give it, in order, and records every prompt it was sent.",
        },
        {
          kind: "p",
          text: "When it runs out of replies, it raises `AssertionError`. A test that makes one call more than it scripted fails at once. It never passes quietly on a reply that is missing.",
        },
        {
          kind: "quiz",
          id: "evals03-q2",
          question: "A judge replies with the text \"Score: 4. Looks fine.\" and no JSON. What does `parse_rubric_reply` return?",
          options: [
            "A passing verdict with score 4, because 4 meets the pass mark.",
            "A failing verdict with score 1 and a rationale that says the reply has no JSON object.",
            "It raises `ValueError`, so the run stops.",
            "A passing verdict with score 1.",
          ],
          answer: 1,
          explain: "The parser looks for a JSON object and finds none. It fails closed with score 1 and says why. It does not guess a score from prose, and it does not raise.",
        },
        {
          kind: "p",
          text: "A verdict you can read still might be wrong, so you need to measure how often.",
        },
      ],
    },
    {
      id: "s3-kappa",
      title: "Agreement alone flatters a lenient judge, so measure kappa",
      goal: "How do you tell a good judge from a lenient one?",
      blocks: [
        {
          kind: "p",
          text: "A judge's score means little until you know how it relates to a person's verdict. Label a sample of answers yourself as pass or fail. Run the judge on the same answers. Then count where the two of you agree.",
        },
        {
          kind: "p",
          text: "Take 100 desk answers about the PEPs. You pass 65 of them. The judge passes 75. Put the counts in a two by two **confusion grid**. Both pass on 60 answers. Both fail on 20. The judge passes 15 that you failed, and it fails 5 that you passed.",
        },
        {
          kind: "compare",
          caption: "The grid for 100 answers. Illustrative figures.",
          columns: ["", "You pass", "You fail"],
          rows: [
            ["Judge passes", "60", "15"],
            ["Judge fails", "5", "20"],
          ],
        },
        {
          kind: "p",
          text: "Agreement is the share on the diagonal. That is 60 plus 20, so 80 percent. It sounds high. A **gate** is a check that blocks a change when it fails, and for a gate the 15 matter more. They are **false passes**, answers the judge passed and you failed. Of the 75 the judge passed, one in five was bad.",
        },
        {
          kind: "p",
          text: "Raw agreement flatters a lenient judge. If nearly every answer is good, a judge that always says pass still agrees most of the time. **Cohen's kappa** removes the agreement that chance alone would give.",
        },
        {
          kind: "p",
          text: "Work it out. Observed agreement, `po`, is 0.80. Chance agreement, `pe`, is the judge's pass rate times your pass rate, plus the two fail rates multiplied. That is 0.75 times 0.65, plus 0.25 times 0.35, which is 0.575.",
        },
        {
          kind: "p",
          text: "Kappa is `po` minus `pe`, divided by one minus `pe`. That is 0.225 divided by 0.425, which is about 0.53. The agreement was 80 percent, and kappa is only about 0.53. Chance explains much of the gap.",
        },
        {
          kind: "p",
          text: "Kappa is 1 for perfect agreement and 0 for no better than chance. It goes negative when the two agree less than chance would. When both raters use one label throughout, `pe` is 1 and the formula divides by zero. So `cohens_kappa` returns 1.0 in that case.",
        },
        {
          kind: "p",
          text: "The reverse error is a **false fail**, an answer you passed and the judge failed. One cause has nothing to do with the rubric. An unreadable reply fails closed, so an answer you passed counts as a false fail.",
        },
        {
          kind: "p",
          text: "If many false fails carry a rationale about missing JSON, fix the reply format first.",
        },
        {
          kind: "p",
          text: "Read kappa with this course's rule of thumb. Under 0.4, the judge is not yet a measuring tool. From 0.4 to 0.6, it shows trends and needs spot checks by a person. At 0.6 or more, with false passes at most 10 percent of the judge's passes, it can gate a release.",
        },
        {
          kind: "p",
          text: "No standard sets these cut-offs. They are this course's own rule, and you should move them if your risk is higher.",
        },
        {
          kind: "p",
          text: "The function `calibrate` in `judge.py` does this work for you. It runs a judge over your labelled cases and reports kappa, the false passes, the false fails and two bias checks. It ships complete in your stub. The next section explains the bias checks.",
        },
        {
          kind: "widget",
          id: "evals03-judge-grid",
          intro: "Three judges were each checked against your labels on their own set of 100 desk answers. Work out the agreement for each grid. Then decide what each judge may do. One judge has high agreement and still should not gate anything.",
        },
        {
          kind: "quiz",
          id: "evals03-q3",
          question: "A judge agrees with your labels on 90 percent of answers, but 95 percent of all answers are good. What should you do next?",
          options: [
            "Ship it, since 90 percent agreement is high.",
            "Compute kappa and count the false passes, because a judge that passes everything would agree 95 percent of the time.",
            "Raise the judge's temperature.",
            "Add more levels to the rubric.",
          ],
          answer: 1,
          explain: "When one label dominates, raw agreement hides a judge that never fails anything. Kappa and the false pass count show whether it catches the bad five percent.",
        },
        {
          kind: "p",
          text: "Kappa measures the judge as a whole. Two specific habits need their own checks.",
        },
      ],
    },
    {
      id: "s4-bias",
      title: "A verdict should not move when only the order or the length changes",
      goal: "What should never change a verdict?",
      blocks: [
        {
          kind: "p",
          text: "A judge has habits that have nothing to do with quality. The RAG course named three: position, verbosity and self-preference. You control self-preference by judging with another model family, as the desk does. The other two you can measure with code.",
        },
        {
          kind: "p",
          text: "Suppose the judge reads two sources, and one of them holds the answer. The other is a distractor. A fair judge gives the same verdict if you swap their order. **Position bias** means it does not.",
        },
        {
          kind: "p",
          text: "`position_bias` judges each case twice, once with the sources in order and once reversed. It returns the share of cases that flip. A **flip** is a change from pass to fail, or from fail to pass.",
        },
        {
          kind: "p",
          text: "A case with fewer than two sources cannot show the bias, so the check leaves it out. A change of score with the same verdict does not count.",
        },
        {
          kind: "p",
          text: "**Length bias** means longer answers score higher for no better reason. `length_bias` judges each answer twice. The second time it adds the padding below to the end, three times over. The padding says nothing new. The result is the mean change in score. Zero is good. A positive number means the judge rewards length.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "The padding in `judge.py`. It repeats a point and adds no fact.",
          code: `To put this another way, the answer is what has been said above. It bears repeating that this is the answer, stated once more for emphasis.`,
        },
        {
          kind: "p",
          text: "Only a **borderline** answer can flip. That is an answer that scores at the pass mark or one point away from it. A clear 5 or a clear 1 stays on its side of the line, even when the judge gains or loses a point. So a clean result on clear-cut cases proves little.",
        },
        {
          kind: "p",
          text: "`calibrate` runs both checks, but only on the first eight cases. Each check judges a case twice, so the limit keeps the number of calls down. With eight cases, one flip shifts the flip rate by 0.125. Treat both numbers as a warning light. They are too coarse to measure with.",
        },
        {
          kind: "widget",
          id: "evals03-bias-flip",
          intro: "This judge has two habits. When the source that holds the answer is shown second, it takes a point off the score. When the answer is padded, it adds a point. For each of five changes, predict whether the verdict flips. Then see the scores.",
        },
        {
          kind: "quiz",
          id: "evals03-q4",
          question: "A judge passes an answer when the source that holds it comes first, and fails the same answer when that source comes second. What does `position_bias` count?",
          options: [
            "A flip of the verdict, so this case adds one to the flip count.",
            "A one point change in score, even when both verdicts match.",
            "Nothing, because the answer text is the same.",
            "Only cases that have a single source.",
          ],
          answer: 0,
          explain: "The check counts a change of pass or fail between the two orders. A case with one source is left out, and a score change that keeps the verdict is not counted.",
        },
        {
          kind: "p",
          text: "Kappa and the bias checks both need your labels, so you write those next.",
        },
      ],
    },
    {
      id: "s5-labels",
      title: "Your own labels are the ruler, so write them before you see the judge",
      goal: "How do you run the calibration and read its report?",
      blocks: [
        {
          kind: "callout",
          tone: "warn",
          title: "The shipped labels are drafts",
          text: "The file `evals/labels/answer-judge-v1.jsonl` ships with draft labels that Claude wrote, so that the command runs before you have labelled anything. They are not your ruler. Do not read them first. If you do, you anchor on someone else's call, and your kappa measures agreement with Claude's guesses.",
        },
        {
          kind: "p",
          text: "The 24 cases sit in `evals/labels/answer-judge-v1.cases.jsonl`. Each has an id, a question, an answer and two sources. Some of the answers refuse, because the sources do not say. The pull you ran in chapter 1 copied the file into `evals/labels/` in your workspace. If the folder is missing, check that you ran it.",
        },
        {
          kind: "p",
          text: "The labels sit beside it in `answer-judge-v1.jsonl`, one line for each case. `calibrate` matches a label to a case by its id. A line holds the id, a `label` of `pass` or `fail`, who labelled it and when.",
        },
        {
          kind: "code",
          lang: "json",
          caption: "One line of the labels file.",
          code: `{"item_id": "a01-good", "label": "pass", "labeller": "your-name", "labelled_at": "2026-10-21"}`,
        },
        {
          kind: "p",
          text: "Use the rubric's own test. Pass an answer that is correct and supported by its sources. Fail one that is wrong, or that says more than the sources do. Pass a refusal when the sources do not hold the answer. Judge the answer you see, not the answer you would have written.",
        },
        {
          kind: "p",
          text: "Most ids end in `good` or `bad`. That suffix records what the drafter intended. Ignore it, and decide from the answer and its sources. A label that follows the suffix tells you nothing about your own judgement.",
        },
        {
          kind: "step",
          id: "evals03-s01",
          title: "Label the 24 cases yourself",
          text: "Open the cases file and read each case. Write your verdict in the labels file, in place of the draft line for that id. Set the labeller to your name. Do this before you run any judge, and before you read the draft labels. It takes about fifteen minutes.",
          lang: "bash",
          code: `uv run python -c "from pathlib import Path; from askpep.evals.judge import load_labels; print(len(load_labels(Path('evals/labels/answer-judge-v1.jsonl'))))"
grep -c '"draft"' evals/labels/answer-judge-v1.jsonl`,
          expect: "The first command prints 24, so every line parsed and no id appears twice. The second prints 0, so no draft line is left. Commit the file, so that a later change to your labels shows up in a diff.",
        },
        {
          kind: "p",
          text: "Your kappa will not match anyone else's, and no figure in this chapter is a result. There are three reasons.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "The labels are yours. Kappa measures agreement with you, so another careful reader would get a different number.",
            "The judge is a live model. Claude can reply differently to the same prompt on two runs, and the model behind `judge_model` can change.",
            "Twenty-four cases is a small sample. On a set this evenly split, a single disagreement shifts kappa by about 0.08.",
          ],
        },
        {
          kind: "p",
          text: "So every kappa in this chapter is an illustration. The 0.53 above came from a made-up grid. The chapter shows no kappa from the shipped cases, because their labels are drafts and yours will differ.",
        },
        {
          kind: "step",
          id: "evals03-s02",
          title: "Run the calibration on your labels",
          text: "Do this after lab step 6. Start the database, as in the earlier courses, then run the command. It needs `ANTHROPIC_API_KEY` in `.env`. It makes 56 calls to Claude: 24 verdicts, then 16 for the position check and 16 for the length check.",
          lang: "bash",
          code: `docker compose up -d db
uv run askpep eval calibrate --labels evals/labels/answer-judge-v1.jsonl`,
          expect: "A JSON report with the keys n, kappa, agreement, false_pass, false_fail, position_flip_rate and length_shift. The value of n is 24. Every other number depends on your labels and on that run of the judge.",
        },
        {
          kind: "p",
          text: "`false_pass` counts answers the judge passed and you failed. `false_fail` counts the reverse. False passes cost more, because they let a bad answer through a gate. The two bias numbers come from the first eight cases only, and most of the cases are clear-cut. A flip rate of zero on easy cases proves little.",
        },
        {
          kind: "p",
          text: "The report gives counts, not case ids. To read a disagreement, call the judge on one case in a Python session and print its verdict. The rationale tells you what the judge saw.",
        },
        {
          kind: "code",
          lang: "python",
          caption: "Judge one case and print the verdict. It makes one call to Claude and needs no database.",
          code: `from pathlib import Path

from askpep.config import Settings
from askpep.evals.judge import RubricJudge, load_cases
from askpep.providers import make_chat_model

cases = {c.item_id: c for c in load_cases(Path("evals/labels/answer-judge-v1.cases.jsonl"))}
judge = RubricJudge(make_chat_model(Settings(), "judge"))
case = cases["a08-bad"]
print(judge(case.question, case.answer, case.sources))`,
        },
        {
          kind: "p",
          text: "Put each disagreement into one bucket before you change anything.",
        },
        {
          kind: "list",
          items: [
            "The rubric is ambiguous, so reasonable readers score it differently. Fix the rubric.",
            "Your label is wrong or inconsistent. Fix the label.",
            "The judge misread a clear rubric. Add an anchor, or split the criterion in two.",
            "The case is truly borderline. Keep it as a hard example and do not force agreement.",
          ],
        },
        {
          kind: "p",
          text: "Change one thing, then run the calibration again. Watch for a trap. If you tune the rubric on these 24 cases, kappa rises because you fitted them. Label 24 new cases that you never look at while you tune, and quote kappa from those.",
        },
        {
          kind: "quiz",
          id: "evals03-q5",
          question: "You run the judge first, glance at its scores, and then label the cases. What goes wrong?",
          options: [
            "Nothing, because the labels still come from you.",
            "Your labels drift towards the judge's verdicts, so kappa rises without the judge being any better.",
            "The judge reads your labels and copies them.",
            "The cases file changes, so the ids no longer match.",
          ],
          answer: 1,
          explain: "A label you make after seeing the judge is no longer independent. You anchor on its verdict, and agreement rises for a reason that has nothing to do with the judge's quality.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Your judge disagrees with your reviewers",
          text: "Do not start by trusting either side. Say you would sample the disagreements, bucket them and look for a pattern. Who is right depends on the bucket: sometimes the rubric, sometimes the label. Finish by naming the held-out set you use to check that the fix generalises.",
        },
        {
          kind: "p",
          text: "A measured judge stays measured only while nothing about it changes.",
        },
      ],
    },
    {
      id: "s6-drift",
      title: "A judge drifts when its model, rubric or settings change, so calibrate again",
      goal: "What makes a judge's scores drift from one week to the next?",
      blocks: [
        {
          kind: "p",
          text: "A judge is a model, a rubric and some settings. Change any of the three and the scores move, even when the desk did not change. If a provider updates a model behind a moving name, your trend line shifts and you blame the wrong release.",
        },
        {
          kind: "p",
          text: "Pin the judge to one exact model id. Write the model id and a hash of the rubric next to every kappa and every score you save. The calibration report prints neither, so add them when you store it.",
        },
        {
          kind: "p",
          text: "Keep your 24 labelled cases frozen. When you change the judge model, the rubric or the settings, run the calibration again on the same cases. If kappa falls, stop and find out why before anything gates on the new judge.",
        },
        {
          kind: "p",
          text: "Scores from two judges do not compare. When you switch judges, rescore the baseline run with the new one. Then the old and new numbers share a ruler. Otherwise a four point rise may only be a more lenient judge.",
        },
        {
          kind: "p",
          text: "`eval run --judge` adds this judge's score to the answer slice. A judge on live traffic is a different job. The LLMOps course, course 5, runs a judge on sampled production traces. The same rule holds there. Calibrate it against your labels first.",
        },
        {
          kind: "p",
          text: "Chapter 4 wraps a judge like this one in DeepEval metrics. RAGAS, from the RAG course, ships judge-based metrics too. A library writes the judge prompt for you. It does not calibrate it.",
        },
        {
          kind: "quiz",
          id: "evals03-q6",
          question: "Your eval score jumps three points between two runs, and nobody changed the desk. What do you check first?",
          options: [
            "Whether the judge model, the rubric or the judge settings changed.",
            "Whether the golden set shrank by accident.",
            "Nothing, since a rise is good news.",
            "Whether the dashboard colours changed.",
          ],
          answer: 0,
          explain: "A score change with no change to the desk points at the measuring instrument. Check the judge first, then run the calibration again on the frozen cases to see whether kappa moved.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Using RAGAS, DeepEval or a judge in general",
          text: "Interviewers want to hear that the library is not the answer. Say you write the rubric and label a sample yourself. Then you report kappa and the false pass rate. Name the biases you control for, the pinned judge model and the frozen set. Say that these tools wrap judge prompts that you still have to calibrate.",
        },
        {
          kind: "p",
          text: "You have a method. The lead and the reviewer want to know what it found for this desk.",
        },
      ],
    },
    {
      id: "s7-judge-card",
      title: "A judge card says what the judge may do and shows why",
      goal: "What did the calibration find, and what may this judge now do?",
      blocks: [
        {
          kind: "p",
          text: "A **judge card** records what a judge may be used for and the evidence behind that. It names the model, the rubric's hash, the label set and the results. A judge without a current card gates nothing.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Label the cases before you see the judge.",
            "Run the calibration and fill the grid.",
            "Read each disagreement and put it in a bucket.",
            "Fix the cause, then measure again on cases the fix never saw.",
            "Write the card and state what the judge may do.",
          ],
        },
        {
          kind: "p",
          text: "You labelled the 24 cases and ran the judge. It agreed with you on 19, and kappa came to 0.57. It passed 15 answers, and three of those were ones you had failed. That is a false pass rate of 20 percent. By the course's rule, this judge shows trends and needs spot checks. It can't gate.",
        },
        {
          kind: "p",
          text: "You read the five disagreements. Two came from the rubric, where anchor 3 was unclear about a true claim that isn't in the sources. One came from your own label, and one was a real borderline answer. The judge misread one case.",
        },
        {
          kind: "p",
          text: "You fixed your label and changed anchor 3. A fix tested on the cases that exposed the problem proves nothing. So you labelled 24 new cases and ran the new rubric on those alone. Kappa came to 0.83. One false pass in 14 is 7.1 percent. Both numbers clear the bar.",
        },
        {
          kind: "p",
          text: "The reviewer read the card and allowed the judge to measure T10. The reviewer kept the row open, because a measuring tool isn't yet a gate that runs on every change. T10 stays accepted until the gate runs this judge, which is chapter nine.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# JUDGE-CARD.md
Judge: answer-judge   Model: claude-sonnet-5-5   Pass mark: 4   Scale: 1 to 5
Rubric v2 sha256: b7fbaebf3aca9149d1bf8fc16f895c6de3e792a99a62b40574d0916947511db2
Labelled by: engineering, before seeing any verdict

## Round 1  rubric v1  sha256: 9ac161b3a48939162af854e05389a101a0b1a08d69cf374f1a0668e8482071df
Cases: 24 (evals/labels/answer-judge-v1.jsonl)
                 You pass  You fail
Judge passes     12        3
Judge fails      2         7
Agreement 19/24 = 0.79   Kappa 0.57   False pass 3/15 = 20%
Allowed: trends and spot checks only

Disagreements (5)
  rubric    2  a true claim that is not in the sources
  label     1  corrected before round 2
  borderline 1 left as it was
  misread   1  left as it was

Change: anchor 3 now reads "3: Partly correct, or one claim goes beyond the sources, even when that claim is true."

## Round 2  rubric v2, on 24 new cases the change never saw
                 You pass  You fail
Judge passes     13        1
Judge fails      1         9
Agreement 22/24 = 0.92   Kappa 0.83   False pass 1/14 = 7.1%
position_flip_rate 0.125 (1 of 8)   length_shift +0.25 (warning lights only)

## Allowed use
May score S3 answers and may gate a release: kappa at least 0.6 and false pass at most 10%.
Measures T10. T10 stays accepted until the gate runs this judge.

## Calibrate again when
The model, the rubric, the pass mark or the temperature changes.

## Eval plan rows changed
S3  answer  Grader: grade_citations, grade_refusal, answer-judge (rubric v2)`,
          caption: "JUDGE-CARD.md, with every figure from the two rounds. The figures belong to the story.",
        },
        {
          kind: "p",
          text: "Read the card from the bottom. The allowed use and the recalibration triggers are what other people act on, and the rounds above them are the evidence. People often skip the second round on new cases. It's the reason you can trust the 0.83.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# JUDGE-CARD.md
Judge:    Model:    Pass mark:    Rubric sha256:
Labelled by:

## Round 1 (rubric version, case count)
Grid: judge pass/you pass, judge pass/you fail, judge fail/you pass, judge fail/you fail
Agreement:   Kappa:   False pass:   Allowed:

Disagreements by cause (rubric, label, borderline, misread)
Change:

## Round 2 (new cases only)
Grid, agreement, kappa, false pass, bias checks

## Allowed use
## Calibrate again when`,
          caption: "For your next system: the card with the values left blank.",
        },
        {
          kind: "p",
          text: "You built this judge by hand. A library ships similar metrics and runs them inside pytest. The next chapter asks whether you should trust them.",
        },
      ],
    },
  ],
  lab: {
    title: "Build the judge and measure it",
    goal: "Write the kappa function, the reply parser, the judge call, a scripted judge, the bias checks and `eval calibrate`. Steps 1, 2, 3 and 5 have stubs that raise `NotImplementedError`. Steps 4 and 6 are your own files, and their tests fail until the code exists. The tests script the models, so nothing calls Claude. Run them from the workspace root.",
    minutes: 90,
    files: [
      "src/askpep/evals/stats.py",
      "src/askpep/evals/judge.py",
      "src/askpep/fakes.py",
      "src/askpep/cli.py",
      "tests/evals/test_evals03_judges.py",
    ],
    steps: [
      {
        title: "Write Cohen's kappa",
        text: "Write `cohens_kappa` in `stats.py`. It takes two lists of labels. Work out `po`, the share of matching items, and `pe`, the chance agreement. Return `(po - pe) / (1 - pe)`. Raise `ValueError` for lists of different length or for no labels. The stub raises `evals-03 step 1`.",
        code: `# src/askpep/evals/stats.py
# Add this import at the top of the file: from collections import Counter
def cohens_kappa(a: Sequence[str], b: Sequence[str]) -> float:
    """Agreement between two raters, corrected for the agreement chance alone would give."""
    # your turn:
    # 1. Raise ValueError("label sets differ in length") when the lists differ in length.
    #    Raise ValueError("no labels") when they are empty.
    # 2. po = the share of positions where a and b hold the same label.
    # 3. pe = for each label in a, the share of a that uses it times the share of b that uses it,
    #    summed. Counter(a) and Counter(b) give the counts.
    # 4. When pe is 1, both raters used one label throughout. Return 1.0.
    # 5. Return (po - pe) / (1 - pe).
    ...`,
        test: "uv run pytest tests/evals -k evals03_s1",
      },
      {
        title: "Read the judge's reply",
        text: "Write `parse_rubric_reply` in `judge.py`. Read from the first opening brace to the last closing brace, and parse that as JSON. Accept a whole-number score from 1 to 5, including 4.0. The verdict passes at or above `pass_mark`. Any other reply fails closed with score 1. The stub raises `evals-03 step 2`.",
        code: `# src/askpep/evals/judge.py
def parse_rubric_reply(text: str, pass_mark: int = 4) -> JudgeVerdict:
    """Turn a judge's reply into a verdict, and fail closed."""
    # your turn:
    # 1. start = text.find("{") and end = text.rfind("}"). With no object, return
    #    JudgeVerdict(False, 1, "the reply has no JSON object").
    # 2. Parse text[start : end + 1] with json.loads. On ValueError, return
    #    JudgeVerdict(False, 1, "the reply is not valid JSON").
    # 3. score = data.get("score"), when data is a dict. A bool is not a number, so reject it with
    #    isinstance(score, bool). Reject a non-number, and a float that is not whole, with
    #    JudgeVerdict(False, 1, "the reply has no whole-number score").
    # 4. Reject a score outside 1 to 5 with JudgeVerdict(False, 1, f"the score {score} is outside 1 to 5").
    # 5. Return JudgeVerdict(score >= pass_mark, int(score), the rationale from the reply, stripped).
    #    A missing rationale gives an empty string.
    ...`,
        test: "uv run pytest tests/evals -k evals03_s2",
      },
      {
        title: "Write the rubric judge",
        text: "Write `RubricJudge.__call__` in `judge.py`. The class, its rubric and its pass mark ship in your stub. Send `judge_messages(...)` to the model with `invoke`, once. Parse the reply's text with `parse_rubric_reply` and this judge's pass mark. Do not catch a model error. A live test there runs only with `-m live`. The stub raises `evals-03 step 3`.",
        code: `# src/askpep/evals/judge.py
class RubricJudge:
    def __call__(self, question: str, answer: str, sources: Sequence[str]) -> JudgeVerdict:
        """Judge one answer against its sources."""
        # your turn:
        # 1. reply = self.model.invoke(judge_messages(self.rubric, question, answer, sources))
        # 2. Parse str(reply.text). A reply can arrive as content blocks, and .text joins their text.
        # 3. Pass self.pass_mark to parse_rubric_reply. Catch nothing, so a model error reaches the caller.
        ...`,
        test: "uv run pytest tests/evals -k evals03_s3",
      },
      {
        title: "Write a scripted judge",
        text: "Add `ScriptedJudge` to `fakes.py`. It copies the list of replies it is given. Each call records the prompt in `prompts` and returns the next reply. When the replies run out, it raises `AssertionError`. It is a `Judge` from the RAG course, so `check_faithfulness` can use it.",
        code: `# src/askpep/fakes.py
class ScriptedJudge:
    """A judge that replays the replies you give it, one for each call."""

    def __init__(self, replies: list[str]):
        # your turn: keep a copy of replies, not the same list, and start prompts as an empty list.
        ...

    def __call__(self, prompt: str) -> str:
        # your turn: record the prompt. When there have been more calls than replies, raise
        # AssertionError(f"ScriptedJudge ran out of replies at call {len(self.prompts)}").
        # Otherwise return the reply for this call.
        ...`,
        test: "uv run pytest tests/evals -k evals03_s4",
      },
      {
        title: "Measure position and length bias",
        text: "Write `position_bias` and `length_bias` in `judge.py`. The first returns the share of cases whose verdict flips when the sources are reversed, and skips cases with one source. The second returns the mean score gained when each answer is padded with `PADDING` three times. The stub raises `evals-03 step 5`.",
        code: `# src/askpep/evals/judge.py
def position_bias(judge: AnswerJudge, cases: Sequence[JudgeCase]) -> float:
    """The share of cases where reversing the order of the sources flips the verdict's passed."""
    # your turn:
    # 1. Skip a case with fewer than two sources, and count the cases you keep.
    # 2. Judge the case with case.sources, and again with list(reversed(case.sources)).
    # 3. Count a flip when the two verdicts differ in passed. A change in score alone is not a flip.
    # 4. Return the flips divided by the cases kept, or 0.0 when none are left.
    ...


def length_bias(judge: AnswerJudge, cases: Sequence[JudgeCase], repeat: int = 3) -> float:
    """The mean change in score when each answer is padded with filler that says nothing new."""
    # your turn:
    # 1. Return 0.0 for no cases.
    # 2. The padding is a newline, then PADDING repeated repeat times, joined by newlines.
    # 3. For each case, judge case.answer plus the padding, and judge case.answer alone, each with the
    #    case's question and sources. The shift is the padded score minus the plain score.
    # 4. Return the mean of the shifts. It can be negative.
    ...`,
        test: "uv run pytest tests/evals -k evals03_s5",
      },
      {
        title: "Calibrate from the command line",
        text: "Add `eval calibrate` to `cli.py`. It loads the cases and labels, builds a `RubricJudge` on the `judge` role, runs `calibrate` and prints the report as JSON. It exits 1 below `--min-kappa`. Add `--judge` to `eval run` too. The test raises `evals-03 step 6` until the command exists.",
        code: `# src/askpep/cli.py
@eval_app.command("calibrate")
def eval_calibrate(
    labels: Annotated[str, typer.Option("--labels", help="A labels file, such as evals/labels/x-v1.jsonl.")],
    cases: Annotated[
        str, typer.Option("--cases", help="Default: the .cases.jsonl file beside the labels.")
    ] = "",
    min_kappa: Annotated[float, typer.Option("--min-kappa", help="Exit 1 when kappa is below this.")] = 0.0,
) -> None:
    """Run the rubric judge over the labelled cases. Prints kappa, its errors and the two bias checks."""
    # your turn:
    # Imports: json, asdict from dataclasses, Path from pathlib, ProviderError from askpep.providers,
    # and RubricJudge, calibrate, default_cases_path, load_cases and load_labels from askpep.evals.judge.
    # 1. Read the cases with load_cases, from --cases or from default_cases_path(Path(labels)).
    #    Read the labels with load_labels.
    # 2. Open the services, as eval run does, and build RubricJudge(svc.chat("judge")).
    # 3. report = calibrate(judge, cases, label_map)
    # 4. On OSError, ValueError, KeyError or ProviderError, print the message to stderr and exit 2.
    #    Close what you opened in a finally block, as eval run does.
    # 5. Print json.dumps(asdict(report), indent=2). Exit 1 when report.kappa < min_kappa.
    ...


# The change to eval run. Add the alias beside GraphOption, then take it in eval_run as
# judge: JudgeOption = False.
JudgeOption = Annotated[bool, typer.Option("--judge", help="Also judge answers with the rubric judge.")]
# Then change two lines in eval_run. Pass judge to open_eval, in place of False. The helper builds
# RubricJudge(svc.chat("judge")) only when the flag is set, and returns it as answer_judge.
# Pass answer_judge to run_slice with judge=. The runner then adds a "judge" score to each answerable
# answer the desk did not refuse.`,
        test: "uv run pytest tests/evals -k evals03_s6",
      },
    ],
    verify: "uv run pytest tests/evals -k evals03",
  },
  recap: [
    "A rubric judge scores an answer from 1 to 5 against its sources, and the pass mark turns the score into pass or fail.",
    "The parser reads the first JSON object in the reply and fails closed on anything else, so an unreadable reply never passes.",
    "Cohen's kappa is agreement beyond chance, and a judge needs a high kappa and few false passes before it gates anything.",
    "`position_bias` counts verdict flips when the sources are reversed, and `length_bias` averages the score gained from padding.",
    "Your own labels are the ruler, so write them before you see the judge and expect your kappa to differ from anyone else's.",
    "Pin the judge, keep a frozen labelled set and calibrate again whenever the model, the rubric or the settings change.",
    "A judge card names the model, the rubric's hash, the rounds and the allowed use. The second round runs on cases the fix never saw.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In judges and calibration I learned that a judge is a model with habits of its own. Its scores mean something only after kappa against my own labels and checks for position and length bias. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["evals-q05", "evals-q06"],
};

export default chapter;
