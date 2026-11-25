import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "fde-craft-phase-two",
  course: "fde-craft",
  number: 13,
  title: "Phase two on the running system",
  tagline: "What happens when Harbour asks for more? Two requests arrive, and each one meets a system that is already running.",
  minutes: 10,
  objectives: [
    "Say what changes when a request lands on a running system.",
    "Trace a system to its seams and choose the smallest change.",
    "Write a change note, and decide whether a failing test or the change is wrong.",
    "Add three lines to an agent's scope.",
    "Scope an agent in two stages, with the writing tool last.",
  ],
  sections: [
    {
      id: "phase-two-request",
      title: "Harbour asks for two things, and each meets a running system",
      goal: "What happens when Harbour asks for more?",
      blocks: [
        {
          kind: "p",
          text: "The handover is done, and Harbour Intake is in use. Now the finance director comes back with two requests. The first is a rule: every invoice over 3,000 pounds goes to a person. The second is the chatbot from the first call, now wanted as an enquiries agent.",
        },
        {
          kind: "p",
          text: "Both requests meet a system that people rely on every day. The work is to change it without breaking it. The method comes first.",
        },
      ],
    },
    {
      id: "existing-system",
      title: "In an existing system, read the entry points and the seams before you change anything",
      goal: "What do I do first when I am handed a system I have never seen?",
      blocks: [
        {
          kind: "p",
          text: "Work on a system that already exists and is in use is **brownfield** work. It comes up in interviews as a hands-on case in an existing repository, often with an LLM tool allowed. The skill is the same as with the file: look before you change.",
        },
        {
          kind: "p",
          text: "Take Harbour's first request, a new rule on which invoices reach the review queue. Run the system first. Put one real invoice through and keep the output. That output is today's behaviour, and it is your check that you broke nothing.",
        },
        {
          kind: "p",
          text: "Next, find the **entry points**. An entry point is where work enters a system, such as a route, a job or a queue consumer. Trace one request from where it comes in to where it ends. Write the path down in five lines.",
        },
        {
          kind: "p",
          text: "That path shows you the **seams**. A seam is a place where you can change behaviour without editing the code around it, such as an API, a queue or a flag. Choose the smallest change at one seam.",
        },
        {
          kind: "list",
          items: [
            "Leave refactoring alone, even where the code is ugly. The task is the change.",
            "Keep the old path behind a **feature flag**, a setting that turns the new behaviour on or off without a release.",
            "Say aloud what you did not touch, and why.",
          ],
        },
        {
          kind: "p",
          text: "The old path may have no tests. Then today's output is the only test you have, so save it and compare after the change.",
        },
        {
          kind: "p",
          text: "An LLM tool can speed up the reading. Ask it to map the code, then open the files it names and check them yourself. Chapter ten's rule applies: check anything the tool names against the real code.",
        },
        {
          kind: "p",
          text: "Before you edit, write the change down in a **change note**. It says who asked, what changes, where, how it can be undone and what it costs. Harbour's note comes next.",
        },
        {
          kind: "quiz",
          id: "fde-craft08-q6",
          question: "You are handed a repository you have never seen and asked to add one rule. What do you do before you write the rule?",
          options: [
            "Refactor the untidy modules so the rule fits cleanly.",
            "Run one real case and keep the output, then trace its path and find the seam.",
            "Ask the assistant to rewrite the pipeline.",
            "Read every file from the top before you run anything.",
          ],
          answer: 1,
          explain: "Today's output is your check, and the traced path shows the smallest place to change. A refactor or a rewrite makes the change large before you have shown it is safe.",
        },
      ],
    },
    {
      id: "harbour-new-rule",
      title: "The high-value rule breaks two tests, and the tests are out of date",
      goal: "How do I add a rule to a running pipeline, and what do I do when a test fails?",
      blocks: [
        {
          kind: "p",
          text: "The finance director asked for the rule after an internal audit point. Tracing one invoice showed the place for it: `find_issues`, the one function that lists review reasons. The change is a single condition with the reason `high_value`, behind a flag.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "Harbour's change note for the high-value rule.",
          code: `Change note: high_value rule
Requested  Finance director, after an internal audit point
Change     Invoices over 3,000 pounds go to review with the reason high_value
Where      find_issues, the one place that lists review reasons
How        Behind a flag, so it can be turned off without a release
Effect     On the register export, 15 of 54 rows go to review that didn't before
Cost       At most about 1,100 more reviews a month, about 55 hours and
           1,540 pounds. Payback goes from 5.4 to about 6.6 months.
Decision   Finance director accepts the cost`,
        },
        {
          kind: "p",
          text: "The rule sends 15 of 54 register rows to review that did not go before. It costs at most 1,100 more reviews a month, so payback goes from 5.4 to about 6.6 months. The director accepted that. That upper bound ignores invoices that already go to review. The rule compares pound totals only.",
        },
        {
          kind: "code",
          lang: "python",
          caption: "The rule, added to find_issues in the scratch copy of the lab.",
          code: `if os.environ.get("HIGH_VALUE_RULE") == "1" and inv.total is not None and inv.currency == "GBP" and inv.total > 3000:
    issues.append("high_value")`,
        },
        {
          kind: "p",
          text: "With the flag off, 38 tests pass. With it on, two fail and 36 pass. Both failing tests count ready and review rows under the old policy. The change is right and the tests are out of date. They change only because the sponsor changed the policy.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "The two failing tests, and the summary the new rule produces.",
          code: `test_ch08_s4_triage_splits_the_real_file_48_and_6
test_ch08_s6_run_pipeline_runs_the_whole_file_and_gets_the_counts_right

needs_review 21, ready 33, total_mismatches 3, extracted 32, extract_failed 1,
low_confidence 3, model_calls 38, matched 25, amount_mismatch 4,
not_in_ledger 4, ledger_only 16`,
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next customer",
          code: `Change note: <name of the rule>
Requested  <who asked, and why>
Change     <the behaviour, in one sentence>
Where      <the one place in the code>
How        <flag, so it can be turned off without a release>
Effect     <rows or cases that change, measured on a real sample>
Cost       <extra work in hours and pounds, and the new payback>
Decision   <who accepted the cost>`,
        },
        {
          kind: "p",
          text: "The second request is an agent, and an agent needs a scope.",
        },
      ],
    },
    {
      id: "agent-scope",
      title: "An agent that talks to people needs three more lines in its scope",
      goal: "What changes in the scope when the system acts instead of extracts?",
      blocks: [
        {
          kind: "p",
          text: "Harbour's second request is the chatbot from the first call, which the reframe in chapter one set aside. Suppliers write to ask when they will be paid. An agent, from course 2, is a model that chooses its next step and calls tools. Here it reads the enquiry, looks up the invoice and replies.",
        },
        {
          kind: "p",
          text: "An extractor can be wrong about a field. An agent can be wrong in the world, for example by promising a payment date that does not exist. So the scope gains three lines.",
        },
        {
          kind: "list",
          items: [
            "Allowed actions are listed one by one, and anything else is refused.",
            "A **transfer to a person** is the agent passing the conversation to a human. Name the triggers in advance.",
            "The metric is the share **resolved without a person**, meaning the agent closed it alone. It carries a hard stop on any **wrong action**, meaning one the agent was not allowed to take, or took on the wrong record.",
          ],
        },
        {
          kind: "p",
          text: "The same lines fit chat, email or voice, because they say what the agent may do and when it hands over.",
        },
        {
          kind: "p",
          text: "Now Harbour's scope, with its tools in two stages.",
        },
      ],
    },
    {
      id: "agent-on-running-system",
      title: "The enquiries agent reads first and sends last",
      goal: "How do I add an agent to a running system without risking the system?",
      blocks: [
        {
          kind: "p",
          text: "A **tool list** names every tool the agent may call, and what each one can change. Harbour's agent starts with read-only tools and replies as drafts that a person sends. The tool that sends goes on last.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "Harbour's agent scope for the enquiries desk.",
          code: `Agent scope: Harbour enquiries
Job            Answer "where is my invoice?" and "when will I be paid?"
Not its job    Changing an invoice, a payment or a date. Handling a dispute.
Tools, stage 1 get_invoice_status, get_payment_date, transfer_to_person. Read-only.
               Replies are drafts that a person sends.
Tool, stage 2  send_reply, switched on only after the drafts pass review.
Wrong action   Giving a payment date for another supplier's invoice.
Metric         Share resolved without a person. Zero wrong actions.`,
        },
        {
          kind: "p",
          text: "The scope reads in four parts. The job is two questions and nothing else. Stage one has three tools and none of them writes. Stage two adds `send_reply`, because a wrong action reaches a supplier. The metric is the share resolved without a person, with zero wrong actions.",
        },
        {
          kind: "p",
          text: "The agent reads through a narrow read-only API over the tables and never touches them directly. It gets a new service, its own flag and its own rollback. The running pipeline does not change.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next customer",
          code: `Agent scope: <name of the desk>
Job            <the questions it answers>
Not its job    <what it must never change>
Tools, stage 1 <read-only tools, plus the transfer to a person>
Tool, stage 2  <the first tool that writes, and what switches it on>
Wrong action   <one concrete example>
Metric         <share resolved without a person, and the zero line>`,
        },
        {
          kind: "quiz",
          id: "fde-craft-phase2-q1",
          question: "A correct change makes two tests fail. What do you do?",
          options: [
            "Switch the tests off so the release can go ahead.",
            "Undo the change, because a passing suite matters most.",
            "Work out which is wrong, and change the test only if the policy changed.",
            "Edit the tests until they pass, then ship the change.",
          ],
          answer: 2,
          explain: "A failing test is a question. Here the tests encode the old policy and the sponsor changed it, so the tests change. If the policy had not changed, the change would be the bug.",
        },
        {
          kind: "quiz",
          id: "fde-craft-phase2-q2",
          question: "In the enquiries agent's two stages, which tool goes on last?",
          options: [
            "get_invoice_status, because everything else depends on it.",
            "transfer_to_person, because it ends the conversation.",
            "get_payment_date, because it reads the ledger.",
            "send_reply, because a wrong action reaches a supplier.",
          ],
          answer: 3,
          explain: "The reading tools can only produce a wrong draft, which a person catches. send_reply puts a wrong answer in front of a supplier, so it is switched on only after the drafts pass review.",
        },
        {
          kind: "p",
          text: "Harbour's story now runs from a chatbot request to a running system and its first change. The numbers are measured, so the story needs a shape. How do you tell the story so it survives follow-ups?",
        },
      ],
    },
  ],
  lab: {
    title: "Change a system you did not write",
    goal: "Treat the reference solution as a customer's running system. Trace one row, add the high-value rule behind a flag, and decide whether the two failing tests or the change is wrong.",
    minutes: 30,
    files: ["labs/fde-craft/solutions/clean.py", "labs/fde-craft/craft/types.py"],
    steps: [
      {
        title: "Copy the lab and prove it runs",
        text: "Copy the whole lab to a scratch folder, so the original stays as it is. Install, then run the tests against the reference solution. Expect 38 passed. That output is today's behaviour, and it is your check that you broke nothing.",
        code: "cp -R labs/fde-craft /tmp/harbour-phase-two\ncd /tmp/harbour-phase-two\nuv sync\nuv run pytest --solutions",
        test: "cd /tmp/harbour-phase-two && uv run pytest --solutions",
      },
      {
        title: "Trace one row and find the seam",
        text: "Follow one invoice from solutions/pipeline.py through triage to find_issues in solutions/clean.py. Write one line saying where the new rule belongs. Do not refactor anything on the way.",
      },
      {
        title: "Add the rule behind a flag",
        text: "In solutions/clean.py, add import os and the flagged rule inside find_issues. In craft/types.py, add \"high_value\" to the Issue literal, because the list of reasons is closed.",
        code: "if os.environ.get(\"HIGH_VALUE_RULE\") == \"1\" and inv.total is not None and inv.currency == \"GBP\" and inv.total > 3000:\n    issues.append(\"high_value\")",
      },
      {
        title: "Run it with the flag off and on",
        text: "With the flag off, 38 tests pass, so the old path is unchanged. With the flag on, 2 fail and 36 pass. Note the names of the two failing tests.",
        code: "uv run pytest --solutions\nHIGH_VALUE_RULE=1 uv run pytest --solutions",
        test: "cd /tmp/harbour-phase-two && HIGH_VALUE_RULE=1 uv run pytest --solutions",
      },
      {
        title: "Decide which is wrong and write the change note",
        text: "Read the two failing tests. Say whether the change or the test is wrong, and why. Then write the change note: who requested it, what changes, where, how it is switched off, its effect and its cost.",
      },
    ],
    verify: "cd /tmp/harbour-phase-two && HIGH_VALUE_RULE=1 uv run pytest --solutions",
  },
  recap: [
    "Run the system first, trace one request, find the seams and make the smallest change.",
    "Put the change behind a feature flag and write a change note with its cost.",
    "When a correct change fails a test, change the test only if the policy changed.",
    "An agent's scope names allowed actions, transfers to a person and a stop on any wrong action.",
    "Add the agent in two stages, and switch on the tool that sends last.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. On a running system I run it first, trace one request, change one seam behind a flag and write a change note with its cost. When a correct change fails a test, I find out whether the policy changed. An agent starts read-only, and the tool that sends goes on last. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["fde-craft-q18", "fde-craft-q26"],
};

export default chapter;
