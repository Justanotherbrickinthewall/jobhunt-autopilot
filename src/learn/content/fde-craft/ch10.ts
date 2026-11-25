import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "fde-craft-04-ai-in-the-lifecycle",
  course: "fde-craft",
  number: 10,
  title: "Building it with an assistant",
  tagline: "How do you build the real thing quickly and still own it?",
  minutes: 20,
  objectives: [
    "Write the requirement and the test cases for a change before an assistant writes any code.",
    "Order the six gates a change passes and name what each one catches.",
    "Recognise the five failure patterns of AI-written code and the check for each.",
    "Review a diff line by line, write down what the assistant got wrong, and say why you own the result.",
    "Work with any assistant while someone watches, and keep the judgement for yourself.",
  ],
  sections: [
    {
      id: "s1-requirements-first",
      title: "Requirements and acceptance criteria come before any generated code",
      goal: "What do you give an assistant before it writes anything?",
      blocks: [
        {
          kind: "p",
          text: "Spec version 0.2 is settled, and the prototype has closed its three open questions. Now comes the real build. Most of its code will be drafted by an assistant. So how do you build quickly and still own what ships?",
        },
        {
          kind: "p",
          text: "An **assistant** is an AI tool that suggests or writes code from a prompt. It is fast, and it has no judgement about Harbour's business. It will produce something plausible for almost any prompt. You can only tell whether it is right when you have written down what right means.",
        },
        {
          kind: "p",
          text: "So start from the requirement, in your own words. This chapter builds AC-05, one of the acceptance criteria from chapter eight. The lines of an invoice must sum to its net amount. If they do not, the invoice gets the reason `lines_mismatch` and goes to the review queue. The criterion lists four cases, so it is testable.",
        },
        {
          kind: "list",
          items: [
            "Give the assistant the requirement, the interfaces it must use and the constraints it must keep.",
            "Give it the existing code style and the names of modules it may call.",
            "Ask it to write the tests from your cases first, and read those before the implementation.",
            "Supply the expected values yourself, and tell it to ask when anything is unclear.",
          ],
        },
        {
          kind: "p",
          text: "Any current assistant does better on a precise brief. The fourth section of this chapter shows the exact task for AC-05. It is a ticket for a colleague, with one difference. An assistant will often guess rather than ask, so the brief must tell it to ask.",
        },
        {
          kind: "quiz",
          id: "fde-craft04-q1",
          question: "Why write acceptance criteria before asking for code?",
          options: [
            "Assistants refuse to work without them.",
            "You need a target to judge the output against, and plausible code is easy to mistake for correct code.",
            "It makes the code shorter.",
            "It avoids the need for tests.",
          ],
          answer: 1,
          explain: "The assistant will produce something plausible regardless. The criteria are your check.",
        },
        {
          kind: "p",
          text: "Next: what must a change pass before it ships?",
        },
      ],
    },
    {
      id: "s2-same-gates",
      title: "AI-written code passes the same six gates as human code",
      goal: "Which gates does a change pass, in what order, and what does each one catch?",
      blocks: [
        {
          kind: "p",
          text: "The origin of a change does not change the standard. A change from an assistant, a colleague or a contractor passes the same gates. A **gate** is a check that a change must pass before it goes further. Interviewers often ask how you validate code.",
        },
        {
          kind: "list",
          items: [
            "Formatting and linting. A linter flags style slips and unused code.",
            "Type checks and static analysis. These tools read the code without running it, and find calls that cannot work.",
            "Unit tests, which test one function at a time.",
            "Secret and dependency scans. They look for keys in source and for packages with known flaws.",
            "Integration tests, which test two parts working together.",
            "Human review of the diff. A **diff** is the list of lines a change adds and removes.",
          ],
        },
        {
          kind: "p",
          text: "**Continuous integration** (CI) is the server that runs the automatic gates on every change. It is not a seventh gate. It is where the first five run.",
        },
        {
          kind: "p",
          text: "Order the gates by cost. Cheap automatic checks run first, because they reject most bad changes in seconds. The human review comes last, because a person's attention is the scarcest resource in the process. A reviewer should never see a diff that does not compile.",
        },
        {
          kind: "p",
          text: "Each gate catches a different class of problem. A unit test finds a rounding slip. A secret scan finds a key. Only a person finds that the change solves the wrong problem.",
        },
        {
          kind: "widget",
          id: "fde-craft-gate-order",
          intro: "Six gates in the wrong order. Put them in the order that finds problems soonest, then read what each one catches.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "How an interviewer tests the lifecycle",
          text: "They ask: how do you validate code and use AI in the development cycle? A strong answer says AI is an assistant and not the approver, and lists the gates in order. It adds that you review the diff and own the change. A weak answer says you just check it looks right.",
        },
        {
          kind: "quiz",
          id: "fde-craft04-q2",
          question: "Where does human review sit in the gate order, and why?",
          options: [
            "First, to catch everything early.",
            "Last, because automatic checks remove cheap problems and a reviewer's time is scarce.",
            "Nowhere, if the tests pass.",
            "Only for AI-written code.",
          ],
          answer: 1,
          explain: "Automatic gates are fast and cheap, so they come first. People review what is left.",
        },
        {
          kind: "p",
          text: "Next: how do assistants fail?",
        },
      ],
    },
    {
      id: "s3-failure-patterns",
      title: "AI code fails in five known ways, so look for them",
      goal: "What are the five failure patterns, and what is the check for each?",
      blocks: [
        {
          kind: "p",
          text: "Assistants fail in patterns, and patterns can be checked. Look for these five in any generated diff.",
        },
        {
          kind: "list",
          items: [
            "A hallucinated API: a call to a function or option that the model made up and the module does not have. The check is the type checker and a real run against the real module.",
            "An unsafe or invented dependency: a package that does not exist, or a real one with known flaws. The check is a dependency scan and a look at who maintains it.",
            "A leaked secret: a key or password placed in source. The check is a secret scan and a rule that secrets come from a store.",
            "Missing authorisation: code that does the action but never checks who is allowed to do it. The check is a person reading the code that changes state.",
            "Tests that mirror the implementation: a test that repeats the code, so it can only agree. The check is hand-worked expected values.",
          ],
        },
        {
          kind: "p",
          text: "The last pattern is the sneakiest. If you ask an assistant to write tests for code it just wrote, it will often copy the logic into the assertion. The test passes, coverage rises and nothing is checked. Write the expected value by hand for at least one case.",
        },
        {
          kind: "p",
          // CHECKED 17 Oct 2026: "We Have a Package for You!", USENIX Security 2025 ( 16 models, 576,000 samples, hallucinated packages in every model).
          text: "A study at USENIX Security 2025 tested code-generating models and found that they recommended packages that do not exist. Someone can then publish a package under that name. Always check that a new dependency is real, maintained and wanted.",
        },
        {
          kind: "quiz",
          id: "fde-craft04-q3",
          question: "An assistant writes both the function and its test. The test computes the expected value with the same formula. What is wrong?",
          options: [
            "Nothing, since both pass.",
            "The test mirrors the implementation, so it cannot fail when the formula is wrong.",
            "The function is too short.",
            "The test runs too fast.",
          ],
          answer: 1,
          explain: "A test that reuses the logic only checks that the code equals itself. Use a hand-worked expected value.",
        },
        {
          kind: "p",
          text: "Next: how do you review a diff?",
        },
      ],
    },
    {
      id: "s4-review-and-own",
      title: "You review the diff and you own it",
      goal: "How do you read generated code, and why does it become yours?",
      blocks: [
        {
          kind: "p",
          text: "Whoever merges owns the change. If it pays a wrong invoice, nobody will ask which tool wrote it. Review generated code as you would a new colleague's first **pull request**, which is a proposed change for someone else to check before it merges.",
        },
        {
          kind: "p",
          text: "Read every line that touches money, secrets, permissions or external calls. Check the edges, such as an empty list or a negative amount. Generated code often skips them.",
        },
        {
          kind: "p",
          text: "Here is how Harbour's AC-05 change went.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "The FDE wrote the task below, and worked the expected values for the four cases by hand.",
            "The assistant wrote the four tests first. The FDE read them before reading any implementation.",
            "The assistant's first diff looked finished. The FDE spotted that it compared the totals as floats with a tolerance.",
            "The off-by-0.01 case is exactly where that tolerance fails, so the FDE replaced the comparison with exact `Decimal` arithmetic.",
            "All four tests passed, and the FDE wrote the notes below before merging.",
          ],
        },
        {
          kind: "code",
          lang: "text",
          caption: "The reviewed change for AC-05: the task given to the assistant, its first diff, the four tests and the review notes.",
          code: `TASK
Task: add the lines check to validate_invoice in harbour/validate.py. This is AC-05.
Requirement: if the line net amounts do not sum to net_amount, add the reason
lines_mismatch. An invoice with that reason is never approved.
Use only harbour.models.Invoice. Add no new dependencies.
Acceptance: write the tests first. Cases: sums match, off by 0.01, empty line
list, negative line.
I will supply the expected values. Do not compute them in the test.
If anything is unclear, ask me before you write code.

THE ASSISTANT'S FIRST DIFF
--- a/harbour/validate.py
+++ b/harbour/validate.py
@@ def validate_invoice(inv: Invoice) -> list[str]:
     reasons: list[str] = []
     # ... the existing checks ...
+    line_total = sum(float(line.net_amount) for line in inv.lines)
+    if (not inv.lines
+            or abs(line_total - float(inv.net_amount)) > 0.01
+            or any(float(line.net_amount) < 0 for line in inv.lines)):
+        reasons.append("lines_mismatch")
     return reasons

THE FOUR TESTS (expected values worked by hand)
def test_sums_match():
    # 100.00 + 50.00 = 150.00
    assert validate_invoice(invoice(net="150.00", lines=["100.00", "50.00"])) == []

def test_off_by_one_penny():
    # 100.00 + 49.99 = 149.99, which is not 150.00
    assert validate_invoice(invoice(net="150.00", lines=["100.00", "49.99"])) == ["lines_mismatch"]

def test_empty_line_list():
    assert validate_invoice(invoice(net="150.00", lines=[])) == ["lines_mismatch"]

def test_negative_line():
    # 100.00 - 20.00 = 80.00 matches the net, but a credit line must reach a person
    assert validate_invoice(invoice(net="80.00", lines=["100.00", "-20.00"])) == ["lines_mismatch"]

REVIEW NOTES
1. The assistant compared floats with a tolerance of 0.01. Money has no tolerance.
   Whether the penny case failed depended on float rounding noise.
2. Fix: parse each amount with Decimal and compare for exact equality.
       line_nets = [Decimal(line.net_amount) for line in inv.lines]
       if (not line_nets
               or sum(line_nets) != Decimal(inv.net_amount)
               or any(n < 0 for n in line_nets)):
           reasons.append("lines_mismatch")
3. Checked: no new import, no new package, no secret, no call outside harbour.models.
4. Checked: the tests use my expected values, not the function's own formula.
5. Result: four tests passed. A negative line sends a credit note to a person.`,
        },
        {
          kind: "p",
          text: "Read the artefact in four points. The task names the criterion, the allowed module and the four cases, and tells the assistant to ask. The diff adds one check. The tests carry hand-worked values, and the negative line sums correctly but still fails, so a credit note reaches a person. The review found one flaw, the float tolerance, and replaced it with `Decimal`.",
        },
        {
          kind: "widget",
          id: "fde-craft-diff-review",
          intro: "An assistant wrote this change and the tests pass. Click each line you would not approve. There is one flaw from each of the five patterns.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "A teammate's AI pull request passes CI. Do you approve it?",
          text: "A strong answer says not yet. You read the diff, check what the tests actually assert, run a scan for secrets and new packages, and test the edges that matter. You approve when you can explain every changed line. Say that you own it once you merge it.",
        },
        {
          kind: "quiz",
          id: "fde-craft04-q4",
          question: "CI is green on a generated change. What does that prove?",
          options: [
            "That the change is correct.",
            "That the checks which exist passed, and nothing about the checks that are missing.",
            "That the assistant was accurate.",
            "That no review is needed.",
          ],
          answer: 1,
          explain: "A green build is a floor. The ceiling is whether you could defend each line.",
        },
        {
          kind: "p",
          text: "Next: what changes when someone watches you work?",
        },
      ],
    },
    {
      id: "tool-with-audience",
      title: "With a tool and an audience, keep the judgement and let it type",
      goal: "If I may use any LLM tool while someone watches, what should they see?",
      blocks: [
        {
          kind: "p",
          text: "Interviews and customer sessions sometimes let you use any assistant while someone watches. Everyone has the same tool, so the watcher judges you.",
        },
        {
          kind: "list",
          items: [
            "Before the first prompt, say the task and how you will check it.",
            "Give the tool context. On code you do not know, ask for a plan first and read it.",
            "Work in small steps, and run the code after each one.",
            "Read each diff aloud, and say what you accept and what you reject.",
            "Check anything it names against the real code. That means a function, a package or a flag.",
            "Keep one thing for yourself, which is the design of the check. Work at least one expected value by hand.",
          ],
        },
        {
          kind: "p",
          text: "Never keep code you cannot explain. \"The tool wrote it\" is not an answer. Deleting a line you cannot explain shows better judgement than keeping it.",
        },
        {
          kind: "p",
          text: "On a real customer's code, the first check is policy. Ask which tools the customer allows, and what code or data may be sent to them.",
        },
        {
          kind: "p",
          text: "Here is the AC-05 task again with the values blanked, plus the review notes.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next customer: the task and review notes for one assisted change.",
          code: `For your next customer

TASK
Task: change <function> in <file>. This is <criterion id>.        (one function per task)
Requirement: <the rule, in one sentence>
Use only: <the modules the assistant may call>
Acceptance: write the tests first. Cases: <the cases the criterion lists>
Expected values: <you supply them, worked by hand>
If anything is unclear: <tell it to ask before it writes code>

REVIEW NOTES
Got wrong: <what the assistant's first diff did wrong>
Fix: <the replacement lines>
Checked: <new imports, packages, secrets, outside calls>
Checked: <the tests use your values, not the function's formula>
Result: <tests passed, and the edge each one covers>`,
        },
        {
          kind: "p",
          text: "Next: the build exists, but does it work on Harbour's invoices, and who decides? Chapter eleven answers that.",
        },
      ],
    },
  ],
  recap: [
    "Write the requirement and the test cases before generating code, and supply the expected values yourself.",
    "AI code passes the same six gates as human code, cheapest first and human last. CI runs the automatic ones.",
    "Look for hallucinated APIs, unsafe dependencies, leaked secrets, missing authorisation and mirrored tests.",
    "Green CI is a floor. You own what you merge.",
    "With an audience, say the check first, take small steps and read every diff.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In Building it with an assistant I learned that an assistant drafts and suggests. Its code passes the same gates as any other. I review the diff and own it, and I never keep code I cannot explain. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["fde-craft-q07", "fde-craft-q08", "fde-craft-q19"],
};

export default chapter;
