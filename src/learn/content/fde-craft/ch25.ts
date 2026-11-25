import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "fde-craft-case-refund-rules",
  course: "fde-craft",
  number: 25,
  title: "Case four: refunds",
  tagline: "A blind run. You get the brief and the scoring sheet, and the reference stays shut until the hour is over.",
  minutes: 5,
  objectives: [
    "Set up a blind run and hold to the hour without the reference.",
    "Score your own run line by line from your own words.",
    "Compare your run with the reference for the right reasons.",
    "Prepare the machine, the kit and yourself for a real round.",
  ],
  sections: [
    {
      id: "uc-refund-brief",
      title: "Case four gives you the brief and nothing else",
      goal: "What do I get in a blind run?",
      blocks: [
        {
          kind: "p",
          text: "Cases one and two showed the reference on the page. Case four shows only the brief. Brook Mutual is a fictional insurer.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "The brief as the interviewer speaks it at minute 0.",
          code: `"We are Brook Mutual, a mutual insurer. Customers ask for small refunds all the time: a fee taken twice, a policy cancelled inside the cooling-off period. A person approves every one. We want to use an agent to approve the small ones automatically. The code is the refund desk. You can use any tool you like."`,
        },
        {
          kind: "p",
          text: "Copy the repository to a scratch folder, open your working session there and one more in `interviewer/`, and run the starting tests. The working session never reads `interviewer/`.",
        },
      ],
    },
    {
      id: "uc-refund-hour",
      title: "Run the hour as six blocks and take the cut line when you are behind",
      goal: "How do I spend the hour?",
      blocks: [
        {
          kind: "p",
          text: "You know the blocks from chapter seventeen. Start the timer.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Listen, 5 minutes. Tag the brief and restate it in one sentence.",
            "Discover, 10 minutes. Fill the workbook while Claude maps the code.",
            "Specify, 10 minutes. Write the spec with three acceptance criteria.",
            "Build, 25 minutes. Run one path with tests from your own cases.",
            "Walk, 7 minutes. Run one scenario and list findings.",
            "Close, 3 minutes. Say what works, what you cut, what is open and what is next.",
          ],
        },
      ],
    },
    {
      id: "uc-refund-score",
      title: "Score the run from your own words, one line at a time",
      goal: "How do I score a run honestly?",
      blocks: [
        {
          kind: "p",
          text: "Use the nine-line scoring sheet, `rubric.md` in the interviewer folder. Each line scores 0, 1 or 2, so the top mark is 18.",
        },
        {
          kind: "p",
          text: "For every line below 2, find the sentence you said that earned it. If you cannot find one, the line is a 0. Score what you said aloud, because the round cannot hear what you only thought.",
        },
      ],
    },
    {
      id: "uc-refund-compare",
      title: "Compare your run with the reference, and judge the reasons",
      goal: "What do I compare afterwards?",
      blocks: [
        {
          kind: "p",
          text: "Open the `reference/` folder only now. Read the workbook, the spec, the close and the solution. A different answer is not wrong if your reason holds.",
        },
        {
          kind: "list",
          items: [
            "Compare your mechanism letter for each step. Where you chose differently, read both reasons.",
            "Check what you found in the existing code, and when you found it.",
            "Check where a person stayed in control, and what they saw.",
          ],
        },
        {
          kind: "fold",
          tone: "plain",
          title: "Where the reference is",
          text: "The filled workbook, the spec, the spoken close and the solution that passes the added tests are in the lab's reference folder. They are for after the run. Reading them first turns the run into a copy exercise and scores nothing.",
        },
        {
          kind: "quiz",
          id: "fde-craft-uc25-q1",
          question: "Your run ended at minute 60 with the build half done. How do you score line eight?",
          options: [
            "Give yourself a 1 because you were close.",
            "Score what was running at minute 50 with your own tests, and note the gap.",
            "Skip it, because the hour was short.",
            "Re-run the build with no timer, then score it.",
          ],
          answer: 1,
          explain: "The line asks for one path running from start to finish by minute 50, with tests from your own cases. Score the state at minute 50 and write the gap down. A rerun with no timer measures a different skill.",
        },
      ],
    },
    {
      id: "uc-days-before",
      title: "In the days before a real round, rehearse, set up the machine and say it aloud",
      goal: "What do I do before a real round?",
      blocks: [
        {
          kind: "p",
          text: "This is the last section of the course. A real round scores how you drive the tool, so the days before it are practice and set-up.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Do one full timed run a day, and use a different case each time.",
            "Rebuild the kit from memory once more, with the page closed.",
            "Set up the machine the day before. Check the editor, the terminal, Claude Code signed in, and uv and pytest working. Try the screen share, turn notifications off and keep the kit folder to hand.",
            "Ask three questions before minute 0. What may be sent to the model? May you use your own prompt files? Is the code supplied, or yours to start?",
            "Say aloud what you are doing, because the interviewer cannot see your thinking.",
          ],
        },
        {
          kind: "p",
          text: "That is the whole course. Start the timer on the first case you have not yet run.",
        },
      ],
    },
  ],
  lab: {
    title: "Brook Mutual: the blind run",
    goal: "Run the one-hour round on case four with two Claude sessions, then score it and compare with the reference.",
    minutes: 60,
    files: [
      "labs/usecase-round/case-4/README.md",
      "labs/usecase-round/case-4/repo/refunds/queue.py",
      "labs/usecase-round/case-4/interviewer/rubric.md",
    ],
    steps: [
      {
        title: "Listen, minutes 0 to 5",
        text: "Copy the repository to a scratch folder and prove the 13 starting tests pass. Open the interviewer session in `interviewer/` and ask the three questions before minute 0. Tag the brief and restate it in one sentence.",
        code: "cp -R labs/usecase-round/case-4/repo /tmp/brook-case-4\ncd /tmp/brook-case-4\nuv sync\nuv run pytest",
        test: "cd /tmp/brook-case-4 && uv run pytest",
      },
      {
        title: "Discover, minutes 5 to 15",
        text: "Fill the workbook from your template while the working session in the scratch copy maps the code, read-only. Ask the interviewer your questions. Write every unknown as a GAP.",
      },
      {
        title: "Specify, minutes 15 to 25",
        text: "Draft the spec from your workbook and correct it. Keep three acceptance criteria.",
      },
      {
        title: "Build, minutes 25 to 50",
        text: "Plan, write tests from your cases, then build one path in small steps. Read every diff aloud before you keep it.",
        test: "cd /tmp/brook-case-4 && uv run pytest",
      },
      {
        title: "Walk, minutes 50 to 57",
        text: "Run one scenario from the entry point and list the findings: what happens, where, what should happen.",
      },
      {
        title: "Close, minutes 57 to 60",
        text: "Say what works, what you cut, what is open and what you would do with another hour. Then score the run with the scoring sheet.",
      },
    ],
    verify: "cd /tmp/brook-case-4 && uv run pytest",
  },
  recap: [
    "Case four gives you the brief, and the reference waits until the hour is over.",
    "The hour is six blocks, and you take the cut line when you are behind.",
    "Score each line from the words you said aloud.",
    "Compare your reasons with the reference, not only your answers.",
    "Before a real round, run daily, rebuild the kit, set up the machine and speak aloud.",
  ],
  reinforcement: "I am becoming a forward-deployed AI engineer. In case four I learned to run a blind hour, score it from my own words and prepare for a real round. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: [],
};

export default chapter;
