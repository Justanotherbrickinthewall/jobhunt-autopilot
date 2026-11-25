import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "fde-craft-case-ops-questions",
  course: "fde-craft",
  number: 24,
  title: "Case three: operations questions",
  tagline: "What does a case with no worked answer ask of you? Kestrel Freight gives you the brief and the clock, and nothing else.",
  minutes: 5,
  objectives: [
    "Set up a blind case with two Claude sessions.",
    "Run the hour as six blocks.",
    "Score the run on the nine-line scoring sheet.",
  ],
  sections: [
    {
      id: "uc-ops-brief",
      title: "In a blind case you get one spoken brief, and the facts that matter stay held back",
      goal: "What do I know at minute zero of a case with no worked answer?",
      blocks: [
        {
          kind: "p",
          text: "Chapters twenty-two and twenty-three showed the whole reference. This chapter shows none of it.",
        },
        {
          kind: "p",
          text: "Kestrel Freight is a fictional haulage firm. Its dispatchers use a chat bot that answers a few fixed questions, such as how to book a collection.",
        },
        {
          kind: "p",
          text: "The interviewer says: \"Dispatchers want to ask the bot real questions, like which loads are at risk today. It can't answer them. Make the bot answer real operational questions.\"",
        },
        {
          kind: "p",
          text: "That is all you get. Everything else is held back until you ask. The three questions before minute zero and the seven exceptions bring it out.",
        },
        {
          kind: "p",
          text: "Open two Claude sessions. One plays the interviewer from the lab's facts file. The other opens in the repo folder and is your working tool, and it never sees the facts file. Twelve tests pass at the start. Start the clock.",
        },
      ],
    },
    {
      id: "uc-ops-hour",
      title: "Run the hour as the same six blocks, with the three rules open beside you",
      goal: "What do I do in each block of the hour?",
      blocks: [
        {
          kind: "list",
          ordered: true,
          items: [
            "Listen, minutes 0 to 5. Tag the brief, restate it.",
            "Discover, minutes 5 to 15. Fill the workbook while Claude maps the code.",
            "Specify, minutes 15 to 25. Write the spec with three acceptance criteria.",
            "Build, minutes 25 to 50. Get one path running, with tests from your cases.",
            "Walk, minutes 50 to 57. Run one scenario and list findings.",
            "Close, minutes 57 to 60. Say what works, what you cut, what is open and what is next.",
          ],
        },
        {
          kind: "p",
          text: "The three rules run under every block. Say it first and check it second. Claude types and you decide. A gap stays a gap.",
        },
        {
          kind: "quiz",
          id: "fde-craft-uc24-q1",
          question: "It is minute 57 and your build is not finished. What do you do?",
          options: [
            "Keep building until the last test passes.",
            "Give the spoken close: what works, what you cut, what is open and what comes next.",
            "Rewrite the spec so it matches what you built.",
            "Ask the interviewer for ten more minutes.",
          ],
          answer: 1,
          explain: "The close is the one block that is never cut. A clear account of an unfinished build scores. Silence does not.",
        },
      ],
    },
    {
      id: "uc-ops-score",
      title: "Score the run line by line, then set your files beside the reference",
      goal: "How do I judge my own run, and what do I compare afterwards?",
      blocks: [
        {
          kind: "p",
          text: "When the hour ends, ask the interviewer session to score you. Each line scores 0, 1 or 2, out of 18, with a minute mark or a quoted sentence as evidence.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Restated the brief in one sentence before solving anything.",
            "Named the process, its owner and a baseline, or wrote the baseline as a gap.",
            "Said what is out of scope, with a reason.",
            "Gave every step a mechanism letter with a reason, and did not default to AI.",
            "Asked at least three of the seven exceptions.",
            "Read the existing system before changing it, and named the seam.",
            "Wrote acceptance criteria a stranger can check, and named where a person stays in control.",
            "Had one path running from start to finish by minute 50, with tests from their own cases.",
            "Drove the tool: said it first, read each diff aloud, and closed with works, cut, open and next.",
          ],
        },
        {
          kind: "p",
          text: "Then set your workbook, spec and close beside the three files in the reference. Check where your mechanism letters differ, and whether each had a reason. Start the next case on your lowest line.",
        },
        {
          kind: "fold",
          tone: "plain",
          title: "The reference is in the lab, for after the run",
          text: "The lab's reference folder holds the filled workbook, the spec, the spoken close and a working solution with its tests. Open it only after you have scored yourself. Before you do, ask yourself one question: did this case earn an agent, and why.",
        },
      ],
    },
  ],
  lab: {
    title: "Case three in sixty minutes",
    goal: "Run the one-hour use-case round on Kestrel Freight's dispatch bot, with a second Claude session as the interviewer.",
    minutes: 60,
    files: [
      "labs/usecase-round/case-3/README.md",
      "labs/usecase-round/case-3/repo/kestrel/bot.py",
      "labs/usecase-round/case-3/repo/kestrel/tools.py",
      "labs/usecase-round/case-3/repo/kestrel/clients.py",
      "labs/usecase-round/case-3/repo/kestrel/fake_model.py",
      "labs/usecase-round/case-3/repo/kestrel/fixtures.json",
      "labs/usecase-round/case-3/repo/tests/test_bot.py",
      "labs/usecase-round/case-3/interviewer/facts.md",
      "labs/usecase-round/case-3/interviewer/rubric.md",
    ],
    steps: [
      {
        title: "Set up the two sessions and see the tests pass",
        text: "Open one Claude session in the interviewer folder and tell it to play the interviewer from facts.md. Copy the repository to a scratch folder, open a second session there as your working tool, and run uv sync and the tests. Twelve pass. Start a 60-minute timer.",
        code: "cp -R labs/usecase-round/case-3/repo /tmp/kestrel-case-3\ncd /tmp/kestrel-case-3\nuv sync\nuv run pytest",
        test: "cd /tmp/kestrel-case-3 && uv run pytest",
      },
      {
        title: "Minutes 0 to 5: Listen",
        text: "Ask the three questions before minute zero. Hear the brief, tag every line and write one sentence that restates it. Claude does nothing in this block.",
      },
      {
        title: "Minutes 5 to 15: Discover",
        text: "Start the repository map in the working session while you ask the interviewer questions. Fill the workbook. If you run short: keep three exceptions and drop the rest.",
      },
      {
        title: "Minutes 15 to 25: Specify",
        text: "Draft the one-page spec from your workbook, correct it, and keep three acceptance criteria. Name the first slice as a claim.",
      },
      {
        title: "Minutes 25 to 50: Build",
        text: "Plan before code. Write tests from your own cases with your own expected values, then build in small steps and read each diff aloud. If you run short: one path from start to finish.",
        test: "cd /tmp/kestrel-case-3 && uv run pytest",
      },
      {
        title: "Minutes 50 to 57: Walk",
        text: "Run one scenario from the entry point, as a dispatcher would. Report what was expected and what happened, and list findings without fixing them.",
      },
      {
        title: "Minutes 57 to 60: Close",
        text: "Say what works, what you cut, what is open and who can answer it, and what you would do with another hour. Then ask the interviewer session to score you on the nine-line scoring sheet.",
      },
    ],
    verify: "cd /tmp/kestrel-case-3 && uv run pytest",
  },
  recap: [
    "A blind case gives you one spoken brief, and you ask for every other fact.",
    "One Claude session plays the interviewer and one is your working tool.",
    "Score nine lines 0, 1 or 2, with evidence, then open the reference.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In a blind case I ask for the facts, run the six blocks against the clock and score myself on the nine-line scoring sheet with evidence. I open the reference only afterwards. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: [],
};

export default chapter;
