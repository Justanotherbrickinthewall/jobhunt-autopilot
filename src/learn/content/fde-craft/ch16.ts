import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "fde-craft-live-coding-round",
  course: "fde-craft",
  number: 16,
  title: "The live-coding round",
  tagline: "What do you do at a keyboard with the clock running? You work in time-boxes, name your cuts and talk.",
  minutes: 15,
  objectives: [
    "Describe the two formats of a live-coding round and what the interviewer scores.",
    "Name the tools a file round expects, and the order in which you use them.",
    "Plan 45 minutes in time-boxes with cut lines, and price the full run from calls and tokens.",
    "Talk through your choices while you work, then run both labs against a timer.",
  ],
  sections: [
    {
      id: "s1-format",
      title: "The round scores your order of work, and a small working result beats a large unfinished one",
      goal: "What does a live-coding round give you, and what does the interviewer score?",
      blocks: [
        {
          kind: "p",
          text: "Chapter fifteen ended on a question: what do you do at a keyboard with the clock running? Someone watches you work on a fixed task. It comes up in interviews for this role.",
        },
        {
          kind: "p",
          text: "A live-coding round has two common formats. Companies differ, so ask which one you have.",
        },
        {
          kind: "list",
          items: [
            "A file and 45 minutes. You get a CSV or a JSON dump and a laptop. You write Python. Nobody gives you tests or says which columns matter.",
            "An existing repository, with any LLM tool allowed. You change or extend a system you have never seen. Chapter ten covered how to work with an assistant while someone watches.",
          ],
        },
        {
          kind: "p",
          text: "In both formats the interviewer scores your order of work. They want you to look before you change anything. They want one narrow task, a check that the output is sane, and numbers at the end.",
        },
        {
          kind: "p",
          text: "You have practised both formats. The lab from chapter nine is the file round, on 60 invoice rows. The lab from chapter thirteen is the existing-system round, on code you did not write.",
        },
        {
          kind: "quiz",
          id: "fde-craft08-q1",
          question: "What is the interviewer mainly scoring in a 45-minute live-coding round?",
          options: [
            "Whether you finish the most advanced model pipeline.",
            "Your order of work: read the data, pick a narrow task, check the output, report numbers.",
            "How few lines of code you write.",
            "Whether you avoid asking any questions.",
          ],
          answer: 1,
          explain: "The round tests judgement under time pressure. A small result that you checked and can explain beats a large one that you cannot.",
        },
        {
          kind: "p",
          text: "Both formats need the same few tools. The next section names them.",
        },
      ],
    },
    {
      id: "round-tools",
      title: "Pandas and one real SDK call are what the round expects",
      goal: "Which tools will a file round expect, and in what order do I use them?",
      blocks: [
        {
          kind: "p",
          text: "In a file round you will probably write Python with pandas, its table library, and one call through the model vendor's SDK, its software kit. The order of work is the same as in chapter nine.",
        },
        {
          kind: "p",
          text: "Read the file as text, so pandas does not turn your codes into numbers or dates by itself. Write one date function with a list of formats, and return nothing when none fit. A row you cannot read goes to a person.",
        },
        {
          kind: "code",
          lang: "python",
          caption: "Minutes 0 to 20 with pandas. Read as strings, profile the shapes, then parse dates with a list of formats.",
          // CHECKED 17 Oct 2026: https://pandas.pydata.org/docs/reference/api/pandas.read_csv.html (keep_default_na=False with no na_values parses no string as NaN, so blanks stay empty strings; value_counts on a string Series is standard).
          code: "import re\nfrom datetime import datetime\nimport pandas as pd\n\ndf = pd.read_csv(\"invoices.csv\", dtype=str, keep_default_na=False)\n\ndef shape(s):\n    return re.sub(r\"[A-Za-z]\", \"a\", re.sub(r\"\\d\", \"9\", s.strip()))\n\nprint(len(df), \"rows\")\nprint((df[\"supplier\"].str.strip() == \"\").sum(), \"blank suppliers\")\nprint(df[\"invoice_date\"].map(shape).value_counts())\nprint(df[\"total\"].map(shape).value_counts())\n\nFORMATS = [\"%Y-%m-%d\", \"%d/%m/%Y\", \"%d %b %Y\", \"%b %d, %Y\"]\n\ndef parse_date(s):\n    for f in FORMATS:\n        try:\n            return datetime.strptime(s.strip(), f).date().isoformat()\n        except ValueError:\n            pass\n    return None  # unreadable: send the row to a person\n\ndf[\"date\"] = df[\"invoice_date\"].map(parse_date)",
        },
        {
          kind: "p",
          text: "The model call is one function, and the validation sits outside it. You can then test the function without the model. The call asks for a closed list of categories, and on a retry it feeds the errors back.",
        },
        {
          kind: "code",
          lang: "python",
          caption: "Minutes 30 to 40 with an SDK call. One call, a closed category list, and the errors fed back on a retry.",
          // CHECKED 9 Nov 2026: google-genai 3.0.0. Its docs use enterprise=True, and the Client docstring calls vertexai the "Legacy flag for enterprise". Both are accepted.
          code: "from google import genai\nfrom google.genai import types\n\nclient = genai.Client(enterprise=True, project=\"...\", location=\"global\")\nMODEL = \"...\"  # the model name the interviewer gives you\nCATEGORIES = [\"packaging\", \"freight\", \"pallets\", \"cleaning\", \"safety\", \"equipment_hire\", \"office\", \"other\"]\n\ndef extract(supplier, description, errors=None):\n    prompt = (\n        \"Return only JSON with keys category, supplier and confidence. \"\n        f\"category must be one of {CATEGORIES}. confidence is a number from 0 to 1.\\n\"\n        f\"Supplier: {supplier}\\nLine: {description}\"\n    )\n    if errors:\n        prompt += f\"\\nYour last reply failed these checks: {errors}\"\n    reply = client.models.generate_content(\n        model=MODEL,\n        contents=prompt,\n        config=types.GenerateContentConfig(max_output_tokens=200),\n    )\n    return reply.text",
        },
        {
          kind: "p",
          text: "Send the model only the rows that can use it. Check every reply against the reply schema, retry once, and count the failures and the low confidence rows. Then read ten rows by hand before you trust any number.",
        },
        {
          kind: "p",
          text: "Four pitfalls still cost marks, and a plan prevents them.",
        },
      ],
    },
    {
      id: "s4-pitfalls",
      title: "Four pitfalls cost more marks than any bug, and a time-box with cut lines avoids them",
      goal: "How do candidates lose the round, and how do I plan 45 minutes that survive a slow start?",
      blocks: [
        {
          kind: "list",
          ordered: true,
          items: [
            "No sampling. Ten rows read by hand beat a 55-call run that you never looked at.",
            "Over-engineering. A loop with one retry is enough.",
            "Not reading the data. You write a parser for the format on row one. The Harbour file has four date formats, and row one is the tidy one.",
            "No cost estimate. The interviewer asks what the full run costs, and you have no answer.",
          ],
        },
        {
          kind: "p",
          text: "Cost comes up in interviews, so have the arithmetic ready. Suppose each call uses 400 tokens in and 60 out, at 1 pound and 5 pounds per million tokens. These prices are invented. The real ones come from the provider's pricing page.",
        },
        {
          kind: "p",
          text: "The 55 lab calls cost about 4 pence, retries included. Now price a year of invoices. Harbour gets about 48,000 a year, and at the lab's rate that is about 55,000 calls. That is 22 million tokens in and 3.3 million out, about 38.50 pounds.",
        },
        {
          kind: "p",
          text: "These are short calls on text rows. Chapter four's token line prices whole invoices, so it is higher.",
        },
        {
          kind: "p",
          text: "The defence against the other pitfalls is a time-box with cut lines. A **time-box** is a fixed slice of the clock for one block of work. A **cut line** is a feature you decide in advance to drop if the block runs over. Name each one before you need it.",
        },
        {
          kind: "widget",
          id: "fde-craft-timebox-planner",
          intro: "Spread the 45 minutes across five blocks. Watch for the block that bloats first when you start with a plan that looks busy.",
        },
        {
          kind: "compare",
          caption: "The lab splits the 45 minutes into five time-boxes, and every block has a cut line you can take and name aloud.",
          columns: ["Minutes", "Work", "Cut line"],
          rows: [
            ["0 to 10", "Read the data: shapes and a profile", "Print three rows by hand. Never skip reading the data."],
            ["10 to 20", "Parse the CSV, dates and amounts", "Support the three formats you saw most and return nothing for the rest."],
            ["20 to 30", "Clean: names, duplicates, issues, triage", "Drop the sum check and count it as unchecked in the report."],
            ["30 to 40", "Extract with a reply schema, then reconcile", "One attempt only, report the failures, and reconcile on exact keys."],
            ["40 to 45", "Report and run the whole pipeline", "Print the summary object and say what the paragraph would hold."],
          ],
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Your extraction has run over the whole file. How do you know it is good enough?",
          text: "Open with the answer: check it three ways. Validate every reply against the reply schema and count the failures. Read ten rows by hand. Reconcile against the ledger. Then price a year of invoices from calls and tokens, and say your assumptions. Interviewers push on sample size and on dropping the retry.",
        },
        {
          kind: "quiz",
          id: "fde-craft08-q4",
          question: "It is minute 20. Your date parser handles three of the four formats and the cleaning has not started. What do you do?",
          options: [
            "Keep going until all four formats work, then clean.",
            "Take the cut: return nothing for the fourth format, say so aloud, and start cleaning.",
            "Restart with a library that parses everything.",
            "Skip cleaning and go straight to the model.",
          ],
          answer: 1,
          explain: "A cut line is a decision. The unreadable rows go to a person and the report counts them. The interviewer scores that judgement.",
        },
        {
          kind: "p",
          text: "A plan on paper still needs a voice. The last section is what you say while you follow it.",
        },
      ],
    },
    {
      id: "s5-talk-track",
      title: "Talk through your choices while you code, because silence reads as being stuck",
      goal: "What do I say at each stage, and how do I run both labs against the clock?",
      blocks: [
        {
          kind: "p",
          text: "The interviewer cannot see your reasoning, only your cursor. A **talk-track** is one spoken sentence for each stage of your work. It turns your choices into evidence.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "At minute one: I will read the data for ten minutes before I write any code.",
            "In an existing system: I will run one real case and keep the output first.",
            "After the profile: there are four date formats, and I read a slash date as day first because the supplier is in the UK.",
            "Before the model call: only 48 rows are worth a call. Duplicates and unreadable rows go to the review queue.",
            "On a failed reply: I retry once with the errors attached, then count it as failed so the report stays honest.",
            "At the end: here are the counts, here is what I cut, and here is what I would do with another hour.",
          ],
        },
        {
          kind: "p",
          text: "State assumptions as assumptions. Day-first dates and 0.6 as the low confidence line are choices. An assumption you name is a decision, and one you hide is a bug.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "The whole run sheet for the file round: each time-box, its cut line and what you say.",
          code: `Run sheet: Harbour file round, 45 minutes
Minutes   Work                                  Cut line                               Say
0 to 10   Read the data                         Print three rows by hand               I will read the data for ten minutes first.
10 to 20  Parse dates and amounts               Three formats, None for the rest       Slash dates are day first, because the supplier is in the UK.
20 to 30  Clean, dedupe, triage                 Drop the sum check, count it unchecked Unreadable rows go to the review queue.
30 to 40  Extract and reconcile                 One attempt, exact keys only           I retry once with the errors, then count a failure.
40 to 45  Report and run everything             Print the summary object               Here are the counts, here is what I cut.
Report    60 rows, 6 duplicates, 6 to review, 48 reconciled: 38 match, 4 differ, 6 missing.
          55 model calls: 46 passed, 2 failed, 3 low confidence.`,
        },
        {
          kind: "p",
          text: "The sheet has five time-boxes, each with one cut line and one spoken sentence. The report line carries every count. Say a cut aloud with its reason, and the interviewer sees a decision and not a stall.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next round: a blank run sheet to fill in before the clock starts.",
          code: `For your next round
Format     file or existing repository
Clock      ___ minutes
Block 1    ___ to ___   Work: ___   Cut line: ___ (hint: the thing you can state as unchecked)
           Say: ___
Block 2    ___ to ___   Work: ___   Cut line: ___
           Say: ___
Block 3    ___ to ___   Work: ___   Cut line: ___
           Say: ___
Report     counts: ___   assumptions: ___   what I cut: ___   what I would do with another hour: ___`,
        },
        {
          kind: "callout",
          tone: "interview",
          title: "You get a messy CSV and 45 minutes. How do you spend them?",
          text: "Open with the answer: read the data first, then build one narrow task and report numbers. Give the blocks, such as ten minutes on the data and twenty on parsing and cleaning. Name your cut lines and say you check a sample. Interviewers push on falling behind and on cost.",
        },
        {
          kind: "quiz",
          id: "fde-craft08-q5",
          question: "Which spoken line helps you most when you take a cut at minute 28?",
          options: [
            "Sorry, I am running out of time.",
            "I am dropping the sum check and counting it as unchecked, because reconciling matters more.",
            "I will fix it all after the call.",
            "Nothing. Keep typing quietly.",
          ],
          answer: 1,
          explain: "A named cut with a reason shows judgement. Apologising or going silent shows nothing, and the interviewer has to guess what you chose.",
        },
        {
          kind: "p",
          text: "Now run both labs against a timer. In chapter nine's lab, start a 45-minute timer and run the tests. All 38 fail at first. Work the five blocks in order, and open the solutions only after the timer ends.",
        },
        {
          kind: "p",
          text: "Then take the other format. Copy the lab as chapter thirteen says, set a 30-minute timer and find where the new rule belongs. Say aloud what you left alone.",
        },
        {
          kind: "p",
          text: "Some employers run a longer form, one hour on a customer problem in an existing codebase. Chapter seventeen, the one-hour use-case round, teaches it.",
        },
      ],
    },
  ],
  recap: [
    "A live-coding round is a file and 45 minutes, or an existing repository with any LLM tool allowed. The interviewer scores your order of work.",
    "In a file round, read the file as text with pandas, and make one SDK call with the validation outside it.",
    "Plan 45 minutes in time-boxes with cut lines, and say each cut aloud with its reason.",
    "Price the full run from calls and tokens, count retries, and say your assumptions.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In live coding I learned that the round scores my order of work. On a messy file I read the data first, build one narrow task and check a sample. I plan time-boxes with cut lines, take named cuts and report counts. I talk through my choices as I work. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["fde-craft-q15"],
};

export default chapter;
