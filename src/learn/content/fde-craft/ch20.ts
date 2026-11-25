import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "fde-craft-build-watched",
  course: "fde-craft",
  number: 20,
  title: "Building the slice with Claude while watched",
  tagline: "Calder's spec is on the page at minute 25. How do you build the slice in 25 minutes while Claude types and the interviewer watches?",
  minutes: 15,
  objectives: [
    "Have Claude plan the slice, and approve the plan before any code.",
    "Give Claude your cases and expected values, and watch the tests fail first.",
    "Run the plan one step at a time, and read each diff aloud.",
    "Spot a wrong change in a diff whose tests pass, and say what to do.",
    "Walk the scenarios at minute 50 and list findings without fixing them.",
    "Say the close in four lines: works, cut, open and next.",
    "Use the whole prompt library, each prompt at its minute.",
  ],
  sections: [
    {
      id: "uc-plan-first",
      title: "Claude plans the slice in at most six steps, and you approve the plan before any code",
      goal: "What happens at minute 25, before any code is written?",
      blocks: [
        {
          kind: "p",
          text: "Build is minutes 25 to 50, the longest block. It starts with a plan and no code. Prompt P5 asks Claude for at most six steps. Each step names the files it touches, the check that proves it and the criterion it serves.",
        },
        {
          kind: "step",
          id: "fdecraft20-s1",
          title: "Ask Claude for the plan",
          text: "Paste the whole spec into this prompt. Read the plan aloud, change what you disagree with, and only then say go.",
          lang: "text",
          code: `P5  Plan the slice (minute 25)
Plan the build of this slice in at most six steps. For each step give the files
touched, the check that proves it, and the acceptance criterion it serves.
Write no code. Stop after the plan.
<paste spec.md>`,
          file: "plan.md",
          expect: "At most six numbered steps. Each has its files, a check you can run and an acceptance criterion. No code at all.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "Claude's plan for Calder's slice.",
          code: `Plan: the payment-day slice, in five steps

1. Add the rules. Files: calder/payment_day.py, tests/test_payment_day.py.
   Check: the six AC-3 rule tests pass. Serves AC-3.
2. Register check_payment_day, and hand off when the account is in arrears.
   Update the two old tests that list the tools.
   Files: calder/tools.py, tests/test_tools.py, tests/test_agent.py.
   Check: the AC-4 test and the AC-3 agent test pass, and the 16 old tests pass.
   Serves AC-3 and AC-4.
3. Store the pending day in the tool, and write it in agent.py when the next message is YES.
   Files: calder/tools.py, calder/agent.py. Check: the AC-1 test passes. Serves AC-1.
4. Prove that any other reply, or no reply yet, writes nothing. Files: tests/test_payment_day.py.
   Check: the AC-2 tests pass. Serves AC-2.
5. Tell the model about the tool in SYSTEM, and add walk.py for the walk.
   Files: calder/agent.py, walk.py. Check: the whole suite passes, and walk.py runs. Serves Walk this.

Not checked: whether the real billing API takes the same arguments as the fake one.`,
        },
        {
          kind: "p",
          text: "The plan has five steps. The rules come first, then the tool, then the write behind YES. Step 4 proves nothing else writes, and step 5 adds the prompt line and the walk. Step 2 warns that two old tests list the tools and must change.",
        },
        {
          kind: "p",
          text: "You read the plan aloud and keep it. Now each step gets its tests before its code.",
        },
      ],
    },
    {
      id: "uc-tests-first",
      title: "Tests come from your cases and your expected values, and you watch them fail first",
      goal: "Who decides what the tests expect?",
      blocks: [
        {
          kind: "p",
          text: "Before each step, prompt P6 has Claude write that step's tests. You give the cases and the expected values. Claude never works out an expected value, because a test that copies the code's answer proves nothing.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "The cases you gave P6, one prompt for each criterion.",
          code: `P6  Tests first (minute 28)
Write the tests for AC-3 only. Use these cases and these expected values.
Do not write the implementation. Run the tests and show them failing.
Cases: C-1001 day 31, day_out_of_range. C-1001 day 0, day_out_of_range.
       C-1002 day 20, changed_recently. C-1003 day 20, too_close_to_collection.
       C-1004 day 20, allowed, next collection 10 March 2026.
       C-1001 day 20, next collection 1 April 2026.
       C-1002 day 20 through the agent, no write, and the reply offers a colleague.

P6  Tests first, for AC-4
Cases: C-1005 day 20 through the agent, a transfer to a person and no write.

P6  Tests first, for AC-1
Cases: C-1001 day 20, then YES. One write, ("C-1001", 20, 2 March 2026),
       payment day 20, and the reply says "day 20".

P6  Tests first, for AC-2
Cases: C-1001 day 20, then "no". No write, payment day still 1.
       C-1001 day 20, then "Actually, leave it on the 1st". No write, payment day still 1.
       C-1001 day 20, and no reply yet. No write.`,
        },
        {
          kind: "p",
          text: "Run the tests first and watch them fail. At step 1 they fail because `payment_day.py` does not exist yet. A test you never saw fail might not be testing anything.",
        },
        {
          kind: "code",
          lang: "python",
          caption: "The tests for the slice, as Claude wrote them from your cases.",
          code: `"""Tests for the slice. The cases and the expected values are mine, from AC-1 to AC-4 in spec.md.

Today is Monday 2 March 2026 in every test (see conftest.py).
"""

import json
from datetime import date

import pytest

from calder.payment_day import check_move
from conftest import TODAY


def check(new_day: int) -> str:
    return json.dumps({"tool": "check_payment_day", "args": {"new_day": new_day}})


def reply(text: str) -> str:
    return json.dumps({"reply": text})


ASK_YES = reply("I can move your direct debit to day 20 of each month. Reply YES to confirm.")


# AC-1: a customer in good standing asks for the 20th and replies YES. One write, and the reply says day 20.
def test_ac1_good_standing_and_yes_moves_the_date(make_agent, billing):
    agent = make_agent({"c1": [check(20), ASK_YES]})
    agent.handle("c1", "C-1001", "Can I move my direct debit to the 20th?")
    turn = agent.handle("c1", "C-1001", "YES")
    assert billing.get_account("C-1001").payment_day == 20
    assert billing.writes == [("C-1001", 20, date(2026, 3, 2))]
    assert "day 20" in turn.text


# AC-2: any reply but YES writes nothing.
@pytest.mark.parametrize("answer", ["no", "Actually, leave it on the 1st"])
def test_ac2_any_reply_but_yes_writes_nothing(make_agent, billing, answer):
    agent = make_agent({"c2": [check(20), ASK_YES, reply("No problem, I've left it as it is.")]})
    agent.handle("c2", "C-1001", "Can I move my direct debit to the 20th?")
    agent.handle("c2", "C-1001", answer)
    assert billing.writes == []
    assert billing.get_account("C-1001").payment_day == 1


# AC-2: nothing is written before the customer replies at all.
def test_ac2_nothing_is_written_before_the_reply(make_agent, billing):
    agent = make_agent({"c2b": [check(20), ASK_YES]})
    agent.handle("c2b", "C-1001", "Can I move my direct debit to the 20th?")
    assert billing.writes == []


# AC-3: a move that breaks a rule is refused with its reason, and nothing is written.
@pytest.mark.parametrize(
    "account_id, new_day, reason",
    [
        ("C-1001", 31, "day_out_of_range"),
        ("C-1001", 0, "day_out_of_range"),
        ("C-1002", 20, "changed_recently"),  # changed 10 June 2025
        ("C-1003", 20, "too_close_to_collection"),  # collects Monday 9 March, five working days away
    ],
)
def test_ac3_a_move_that_breaks_a_rule_is_refused_with_its_reason(billing, account_id, new_day, reason):
    result = check_move(billing.get_account(account_id), new_day, TODAY)
    assert (result.ok, result.reason) == (False, reason)


def test_ac3_six_working_days_before_the_collection_is_allowed(billing):
    result = check_move(billing.get_account("C-1004"), 20, TODAY)  # collects Tuesday 10 March
    assert (result.ok, result.next_collection) == (True, date(2026, 3, 10))


def test_ac3_the_next_collection_rolls_into_next_month(billing):
    assert check_move(billing.get_account("C-1001"), 20, TODAY).next_collection == date(2026, 4, 1)


def test_ac3_a_refused_move_writes_nothing_and_the_reply_offers_a_person(make_agent, billing):
    explain = reply(
        "You changed your payment date in June 2025, and it can change once in twelve months. "
        "Would you like me to pass you to a colleague?"
    )
    agent = make_agent({"c3": [check(20), explain]})
    turn = agent.handle("c3", "C-1002", "Can I move my direct debit to the 20th?")
    assert agent.model.log[-1].messages[-1]["result"]["reason"] == "changed_recently"
    assert billing.writes == []
    assert "colleague" in turn.text


# AC-4: an account in arrears goes to a person, and nothing is written.
def test_ac4_an_account_in_arrears_goes_to_a_person(make_agent, billing):
    agent = make_agent({"c4": [check(20)]})
    turn = agent.handle("c4", "C-1005", "Can I move my direct debit to the 20th?")
    assert turn.handoff is True
    assert billing.writes == []`,
        },
        {
          kind: "p",
          text: "There are twelve tests, grouped by criterion. Every expected value is one you said: the four reasons, the dates 10 March and 1 April, and the single write on 2 March 2026. Today is fixed at Monday 2 March, so every date can be worked out by hand.",
        },
        {
          kind: "p",
          text: "With the tests in place, Claude writes code one step at a time.",
        },
      ],
    },
    {
      id: "uc-one-step",
      title: "Claude does one step and stops, and you read the diff aloud before you keep it",
      goal: "How do I run the plan without losing control of the code?",
      blocks: [
        {
          kind: "p",
          text: "Prompt P7 runs one step of the plan. Claude does the step, runs the tests, shows the diff and stops. You read the diff aloud before you keep it.",
        },
        {
          kind: "step",
          id: "fdecraft20-s2",
          title: "Run one step",
          text: "Send this once for each step of the plan. Read the diff aloud, then say keep or change.",
          lang: "text",
          code: `P7  One step (minutes 30 to 50, repeated)
Do step <n> of the plan and nothing else. Run the tests. Show the diff and stop.`,
          expect: "One step's change only, the test run with its counts, and the diff. Then Claude stops and waits.",
        },
        {
          kind: "p",
          text: "Reading aloud means saying three things: what changed, why it matches the step, and what it leaves alone. For step 1 you say that the rules sit in a new file, nothing else changed, and six rule tests pass.",
        },
        {
          kind: "p",
          text: "Step 2 breaks two old tests. They list the registry's tools, and the registry now has three. As in chapter thirteen, you ask which one is wrong. The tool list changed on purpose, so the tests change.",
        },
        {
          kind: "p",
          text: "Step 3 is where Claude gets it wrong.",
        },
      ],
    },
    {
      id: "uc-claude-wrong",
      title: "When Claude is wrong, the tests can pass while the diff shows the mistake",
      goal: "How do I catch a mistake that the tests miss?",
      blocks: [
        {
          kind: "p",
          text: "Step 3 adds the write behind YES. Claude's first try passed the AC-1 test. Here is its diff.",
        },
        {
          kind: "code",
          lang: "diff",
          caption: "Claude's first try at step 3. The AC-1 test passes.",
          code: `--- a/calder/tools.py
+++ b/calder/tools.py
@@ -66,6 +66,9 @@
     check = check_move(ctx.billing.get_account(ctx.account_id), new_day, ctx.today)
     if check.reason == "arrears":
         ctx.handoff = True  # an account in arrears always goes to a person
+    if check.ok:
+        ctx.billing.set_payment_day(ctx.account_id, new_day, ctx.today)
+        ctx.state["pending_day"] = new_day
     return {
         "ok": check.ok,
         "reason": check.reason,
--- a/calder/agent.py
+++ b/calder/agent.py
@@ -12,6 +12,7 @@
 If you cannot help, tell the customer to phone 01632 960 123."""
 
 FALLBACK = "Sorry, I can't help with that here. Please phone us on 01632 960 123."
+CONFIRMED = "Done. Your direct debit will now be taken on day {day} of each month."
 HANDOFF = "I'm passing you to a colleague now. They can see this conversation."
 MAX_STEPS = 4
 
@@ -40,6 +41,9 @@
     def handle(self, conversation_id: str, account_id: str, text: str) -> Turn:
         session = self.sessions.setdefault(conversation_id, {"messages": [], "state": {}})
         session["messages"].append({"role": "customer", "text": text})
+        pending = session["state"].pop("pending_day", None)
+        if pending is not None and text.strip().upper() == "YES":
+            return self._end(session, Turn(CONFIRMED.format(day=pending)))
         ctx = Context(self.billing, account_id, self.today, session["state"])
         called: list[str] = []
         for _ in range(MAX_STEPS):`,
        },
        {
          kind: "p",
          text: "Read the tools file first. The new lines call `set_payment_day` inside the check tool, as soon as the rules pass. So the write happens before the customer has said anything. The agent file then answers YES with a confirmation and writes nothing.",
        },
        {
          kind: "p",
          text: "The AC-1 test still passes, because it checks only the end state. One write with the right day happened, one turn too early.",
        },
        {
          kind: "p",
          text: "You stop and say it aloud. \"That writes before the customer confirms. The spec says nothing is written without YES. Keep the check tool read-only, and move the write into the YES branch in agent.py.\"",
        },
        {
          kind: "code",
          lang: "diff",
          caption: "Step 3 as kept. The tool stores the day, and the agent writes it on YES.",
          code: `--- a/calder/tools.py
+++ b/calder/tools.py
@@ -66,6 +66,8 @@
     check = check_move(ctx.billing.get_account(ctx.account_id), new_day, ctx.today)
     if check.reason == "arrears":
         ctx.handoff = True  # an account in arrears always goes to a person
+    if check.ok:
+        ctx.state["pending_day"] = new_day
     return {
         "ok": check.ok,
         "reason": check.reason,
--- a/calder/agent.py
+++ b/calder/agent.py
@@ -12,6 +12,7 @@
 If you cannot help, tell the customer to phone 01632 960 123."""
 
 FALLBACK = "Sorry, I can't help with that here. Please phone us on 01632 960 123."
+CONFIRMED = "Done. Your direct debit will now be taken on day {day} of each month."
 HANDOFF = "I'm passing you to a colleague now. They can see this conversation."
 MAX_STEPS = 4
 
@@ -40,6 +41,10 @@
     def handle(self, conversation_id: str, account_id: str, text: str) -> Turn:
         session = self.sessions.setdefault(conversation_id, {"messages": [], "state": {}})
         session["messages"].append({"role": "customer", "text": text})
+        pending = session["state"].pop("pending_day", None)
+        if pending is not None and text.strip().upper() == "YES":
+            self.billing.set_payment_day(account_id, pending, self.today)
+            return self._end(session, Turn(CONFIRMED.format(day=pending)))
         ctx = Context(self.billing, account_id, self.today, session["state"])
         called: list[str] = []
         for _ in range(MAX_STEPS):`,
        },
        {
          kind: "p",
          text: "Now the tool only stores the pending day. The write sits at the top of `handle`, and runs only when a day is pending and the message is YES. Any other reply drops the pending day. In step 4, the three AC-2 tests pass on this version and fail on the first try.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Passing tests are not the review",
          text: "Your tests check what you thought of. The diff shows what Claude did. Read both, every step.",
        },
        {
          kind: "quiz",
          id: "fde-craft-uc20-q1",
          question: "Every test passes, but the diff calls the billing write inside the check tool. What do you do?",
          options: [
            "Keep it, because the tests pass.",
            "Say aloud that it writes before YES, have it moved to the YES branch, and check the AC-2 tests catch it.",
            "Delete the AC-1 test, because it missed the mistake.",
            "Ask Claude whether the change is safe.",
          ],
          answer: 1,
          explain: "The spec says nothing is written without YES, and the diff breaks that. You name the fault, say where the write belongs, and make sure a test fails if it comes back. Asking Claude hands the judgement back to the tool.",
        },
        {
          kind: "p",
          text: "Step 5 adds the prompt line and the walk script. By minute 50 the suite shows 28 passed.",
        },
      ],
    },
    {
      id: "uc-walk",
      title: "At minute 50 Claude runs the scenarios, and you read the results and fix nothing",
      goal: "What do I do in the Walk block?",
      blocks: [
        {
          kind: "p",
          text: "Walk is minutes 50 to 57. Prompt P8 runs each scenario from the spec's Walk this, from the entry point, as a customer would. Claude reports what was expected and what happened, and fixes nothing. A fix at minute 55 would put untested code in the slice.",
        },
        {
          kind: "step",
          id: "fdecraft20-s3",
          title: "Walk the scenarios",
          text: "Paste the spec's Walk this into this prompt. For Calder, Claude runs `walk.py`, which sends the three scenarios through `Agent.handle` with scripted model replies.",
          lang: "text",
          code: `P8  Walk it (minute 50)
Run this scenario from the entry point, as a user would. For each numbered step
report what was expected and what happened. Fix nothing. List findings as:
what happens, where, what should happen.
<paste "Walk this" from spec.md>`,
          file: "findings.md",
          expect: "For each numbered scenario, what was expected and what happened. A findings list of what happens, where, and what should happen. No change to any file.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "The walk and its findings.",
          code: `Walk: three scenarios from spec.md, run with walk.py on Monday 2 March 2026

1. C-1001 to the 20th, then YES.
   Expected: one write, and a confirmation that says day 20. Happened: as expected.
2. C-1003 to the 20th.
   Expected: a refusal with the reason, the offer of a person, and no write. Happened: as expected.
3. C-1001 to the 1st, the day it already has, then YES.
   Expected: told it is already the 1st, and no write.
   Happened: accepted and written, and the last-change date is now 2 March 2026.

Findings
F1 A move to the day the account already has is accepted and written, which spends the
   customer's one change for the year. Where: check_move in calder/payment_day.py.
   Should: refuse with a reason such as same_day, and write nothing.
F2 The confirmation does not say when the first collection on the new day falls.
   Where: CONFIRMED in calder/agent.py. Should: say the date, once OQ-4 is answered.`,
        },
        {
          kind: "p",
          text: "The first two scenarios behave as the spec says. The third does not. A customer who asks for the day they already have gets a change, and it uses up their one change for the year. That is finding F1. Finding F2 is that the confirmation never says when the first collection on the new day falls.",
        },
        {
          kind: "quiz",
          id: "fde-craft-uc20-q2",
          question: "It is minute 53. The walk shows a move to the same day is accepted. What do you do?",
          options: [
            "Fix it now, because there are seven minutes left.",
            "Write it as a finding with where and what should happen, and name it in the close.",
            "Leave it out, so the demo looks clean.",
            "Ask Claude to fix it without tests.",
          ],
          answer: 1,
          explain: "The walk finds and fixes nothing. A fix at minute 53 has no test and no review. A finding named in the close shows the walk did its job.",
        },
        {
          kind: "p",
          text: "Three minutes remain, and they are for the close.",
        },
      ],
    },
    {
      id: "uc-close",
      title: "The close is four lines you say yourself: works, cut, open and next",
      goal: "What do I say in the last three minutes?",
      blocks: [
        {
          kind: "p",
          text: "Close is minutes 57 to 60, and it is never cut. At minute 56, prompt P9 lists the four lines from your files. You say them yourself, in your own words.",
        },
        {
          kind: "step",
          id: "fdecraft20-s4",
          title: "Draft the close",
          text: "Send this at minute 56, then put the draft away and say the close aloud.",
          lang: "text",
          code: `P9  Draft the close (minute 56)
From the workbook, the spec and the diff, list four things in one line each:
what works now, what I cut and why, what is still open and who can answer it,
and what I would do with another hour. I will say it myself.`,
          file: "close.md",
          expect: "Four lines: what works with the test count, what was cut and why, what is open and who can answer it, and the next hour's first job.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "Calder's close.",
          code: `Works   A customer in good standing moves their direct debit day in the chat and sees it confirmed.
        A customer who may not is told why and offered a person, and arrears go straight to a person.
        28 tests pass, and the 12 new ones come from my cases.
Cut     Bank holidays and a billing outage, because nobody here could answer them,
        and the slice runs without them.
Open    Bank holidays and the first collection on the new day, for billing operations.
        The target for date-change calls, for the contact centre manager.
Next    Refuse a move to the day the account already has, which the walk found.
        Then the outage path, and the real model run against the twelve cases.`,
        },
        {
          kind: "p",
          text: "Works is the slice and the test count. Cut is bank holidays and the outage, with the reason. Open names who can answer each gap. Next starts with F1, the fault the walk found, because a fault you found and named counts in your favour.",
        },
        {
          kind: "p",
          text: "That is the hour, once through. Here are all ten prompts on one page.",
        },
      ],
    },
    {
      id: "uc-prompt-library",
      title: "The ten prompts fit on one page, and each one belongs to a minute of the hour",
      goal: "Which prompt do I use, and when?",
      blocks: [
        {
          kind: "p",
          text: "P0 is a standing file, `CLAUDE.md`, which Claude Code reads at the start of every session in that folder. The other nine are pasted at the minute in their title.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "The prompt library, P0 to P9.",
          code: `P0  CLAUDE.md, the standing rules
I drive this session, and you type.
1. Never guess. If you do not know, write GAP and say who could know.
2. Never invent a value, a field, a file or an API. Check the code first.
3. Plan before code. Show the plan and stop.
4. One step at a time. After each step, run the tests, show the diff and stop.
5. Tests come from my cases, with my expected values. Never compute an expected value.
6. No new dependency, no network call and no file outside this repository unless I say so.
7. End every reply with what you did not check.

P1  Check my breakdown (minute 5)
Here are my notes from the brief, tagged, and my one-sentence restatement.
Do not solve anything. Tell me which lines I tagged wrongly, and which three
questions I have not asked that would change the scope most. One line each.
<paste section 1 of the workbook>

P2  Map the existing system (minute 5, runs while you ask questions)
Read this repository. Change nothing. Report in under 30 lines:
1. The entry point for one request, and the path of that request file by file.
2. Where the outside systems are called, and what stands in for them here.
3. The tests: how to run them, how many pass and fail, what they cover.
4. The seam where a change for "<the brief in one sentence>" would go, and why there.
5. Anything in the code that contradicts the brief.
Quote file names and line numbers. Write GAP where you could not tell.

P3  Find the gaps in my workbook (minute 13)
Here is my workbook. Do not fill any blank. List the blank rows, then the three
blanks with the highest consequence if I guess wrong, with the question I should
ask for each.
<paste workbook.md>

P4  Draft the spec from the workbook (minute 15)
Draft spec.md from this workbook, using this template. Use only what the workbook
says. Where the template needs something the workbook lacks, write GAP. Do not
choose the mechanism for any step. I have chosen them.
<paste the spec template, then workbook.md>

P5  Plan the slice (minute 25)
Plan the build of this slice in at most six steps. For each step give the files
touched, the check that proves it, and the acceptance criterion it serves.
Write no code. Stop after the plan.
<paste spec.md>

P6  Tests first (minute 28)
Write the tests for <AC-n> only. Use these cases and these expected values.
Do not write the implementation. Run the tests and show them failing.
Cases: <case, expected value> ...

P7  One step (minutes 30 to 50, repeated)
Do step <n> of the plan and nothing else. Run the tests. Show the diff and stop.

P8  Walk it (minute 50)
Run this scenario from the entry point, as a user would. For each numbered step
report what was expected and what happened. Fix nothing. List findings as:
what happens, where, what should happen.
<paste "Walk this" from spec.md>

P9  Draft the close (minute 56)
From the workbook, the spec and the diff, list four things in one line each:
what works now, what I cut and why, what is still open and who can answer it,
and what I would do with another hour. I will say it myself.`,
        },
        {
          kind: "p",
          text: "P0 holds seven standing rules. Claude never guesses or invents, plans before code and does one step at a time. It uses your cases, stays inside the repository and ends each reply with what it did not check.",
        },
        {
          kind: "p",
          text: "P1 to P3 belong to Listen and Discover, and P4 to Specify. P5 to P7 belong to Build, P8 to Walk and P9 to Close.",
        },
        {
          kind: "quiz",
          id: "fde-craft-uc20-q3",
          question: "Which prompt runs while you are still asking the interviewer questions?",
          options: [
            "P1, the breakdown check.",
            "P2, the map of the existing system.",
            "P4, the spec draft.",
            "P5, the plan.",
          ],
          answer: 1,
          explain: "P2 starts at minute 5 and reads the code without changing anything, so its map is ready at minute 13. The others need what you write first.",
        },
        {
          kind: "p",
          text: "The lab runs the whole hour on Calder, with a second Claude session as the interviewer. You have now seen the hour once, on a case you know. Can you rebuild the kit from a blank page, with the book closed?",
        },
      ],
    },
  ],
  lab: {
    title: "Follow along on case 0: Calder Energy",
    goal: "Run the hour on Calder with two Claude sessions, one playing the interviewer from facts.md and one working in the repository. Then score yourself and compare with the reference.",
    minutes: 60,
    files: [
      "labs/usecase-round/case-0/README.md",
      "labs/usecase-round/case-0/repo/calder/agent.py",
      "labs/usecase-round/case-0/repo/calder/tools.py",
      "labs/usecase-round/case-0/repo/calder/billing.py",
      "labs/usecase-round/case-0/interviewer/facts.md",
      "labs/usecase-round/case-0/interviewer/rubric.md",
      "labs/usecase-round/case-0/reference/spec.md",
    ],
    steps: [
      {
        title: "Listen, minutes 0 to 5",
        text: "Copy the repository and prove it runs: expect 16 passed. Open one Claude session in interviewer/ and tell it to play the interviewer from facts.md. Open the other in the copy, with your CLAUDE.md. Ask the three questions, start the clock, then tag the brief, restate it and run P1.",
        code: "cp -R labs/usecase-round/case-0/repo /tmp/calder-case-0\ncd /tmp/calder-case-0\nuv sync\nuv run pytest",
        test: "cd /tmp/calder-case-0 && uv run pytest",
      },
      {
        title: "Discover, minutes 5 to 15",
        text: "Start P2 in the working session. Ask the interviewer for the charter, the steps and at least three exceptions while it reads. Read the map, name the seam, and run P3 at minute 13. If you run short, keep three exceptions.",
      },
      {
        title: "Specify, minutes 15 to 25",
        text: "Run P4 with the template and your workbook. Read the decision line against your shape and correct it. Write the criteria with exact outcomes and the scenarios to walk. If you run short, keep three criteria.",
      },
      {
        title: "Build, minutes 25 to 50",
        text: "Run P5 and approve the plan aloud. Before each step, give P6 your cases and expected values and watch the tests fail. Run P7 one step at a time and read each diff aloud. If you run short, finish one path from start to finish.",
        test: "cd /tmp/calder-case-0 && uv run pytest",
      },
      {
        title: "Walk, minutes 50 to 57",
        text: "Run P8 with the spec's scenarios. Read each result, list the findings and fix nothing. If you run short, walk one scenario.",
      },
      {
        title: "Close, minutes 57 to 60",
        text: "Run P9 at minute 56, then say the close aloud: works, cut, open and next. Ask the interviewer session to score you on rubric.md, then compare your files with reference/.",
        code: "ls labs/usecase-round/case-0/reference",
      },
    ],
    verify: "cd /tmp/calder-case-0 && uv run pytest",
  },
  recap: [
    "Claude plans the slice in at most six steps, and you approve it before any code.",
    "Tests come from your cases and expected values, and you watch them fail first.",
    "Claude does one step and stops, and you read each diff aloud.",
    "A diff can be wrong while its tests pass, so read both.",
    "The walk runs the scenarios and lists findings, and fixes nothing.",
    "The close is works, cut, open and next, in your own words.",
    "Ten prompts cover the hour, each at its own minute.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. Building with Claude while watched, I learned to approve a plan before any code, to give my own expected values, and to read every diff aloud even when the tests pass. I walk the scenarios without fixing and close on works, cut, open and next. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["fde-craft-q30"],
};

export default chapter;
