import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "learn-04-the-study-week",
  course: "learn",
  number: 4,
  title: "A fixed routine does the deciding for you",
  tagline: "How do you keep all of this up? Give each part of a chapter one job, and give each day one plan.",
  minutes: 30,
  objectives: [
    "Use every part of a chapter in this app on purpose.",
    "Drill with the question bank and read a score history sensibly.",
    "Write a weekly plan that spaces reviews and builds while ideas are fresh.",
  ],
  sections: [
    {
      id: "app-loop",
      title: "Every chapter in this app is built to force the habits above",
      goal: "What is each part of a chapter for, and in what order do you use it?",
      blocks: [
        {
          kind: "p",
          text: "Chapter three ended with Sam, our fictional learner, holding five papers on one chapter. Nobody keeps that up by hand for every chapter. The app does most of it for you, as long as you use each part for its job.",
        },
        {
          kind: "p",
          text: "A chapter has two lanes. The story runs down the page and can be read aloud. Widgets, quizzes, folds and interview notes are side items. Each one shows in the story as one grey line and opens in the side panel. The story makes sense with every side item closed, so a side item is always practice.",
        },
        {
          kind: "p",
          text: "Start with the read-along. The narration reads the story aloud and highlights the current word. Click any paragraph to start from there. Press the space bar to pause. Speed runs from eighty to a hundred and sixty percent. Side items are never read aloud, so open them yourself.",
        },
        {
          kind: "p",
          text: "A widget is a prediction, so predict before you reveal, commit to a confidence and check. A widget you only clicked through is a video. A quiz is a retrieval, so answer from memory and don't scroll up. Every quiz you answer becomes a card in the deck from chapter two, and a wrong answer brings it back sooner.",
        },
        {
          kind: "p",
          text: "Then comes the lab, run test-first as chapter three showed. After it, read the recap as a self-test. Cover it, say each point, then uncover it. The last piece is the paragraph at the end of every chapter, which you paste into the memory file that Claude Code reads.",
        },
        {
          kind: "p",
          text: "From then on, when the idea shows up in real work, Claude adds a short line starting with TIL, short for today I learned.",
        },
        {
          kind: "fold",
          tone: "plain",
          title: "Where the reinforcement paragraph goes",
          text: "Paste each chapter's paragraph into `~/.claude/CLAUDE.md`, under a heading such as Learning log. Keep earlier paragraphs there. The file then carries a growing list of ideas that Claude Code will try to connect to your real tasks.",
        },
        {
          kind: "callout",
          tone: "insight",
          title: "The TIL lines are a design bet",
          text: "We have no research result behind this one. The reasoning goes like this. Each TIL line makes you recall an idea in a new situation, tied to a real task. That is retrieval practice with variation, delivered at the moment the idea is useful.",
        },
        {
          kind: "quiz",
          id: "learn-03-q3",
          question: "A widget finishes loading and you feel tempted to click straight to the answer. What does the app expect from you?",
          options: [
            "Reveal at once, since the answer is the content",
            "Predict first, commit to a confidence, then reveal and explain the gap",
            "Skip the widget and rely on the narration",
            "Wait until the lab to try it",
          ],
          answer: 1,
          explain: "The prediction is the learning. Revealing first gives you an answer to recognise and no error signal to learn from.",
        },
        {
          kind: "quiz",
          id: "learn-03-q4",
          question: "You answered a quiz wrongly. What happens next in this app's design?",
          options: [
            "Nothing, since only the first attempt counts",
            "The card enters the review deck and returns sooner than a card you got right",
            "The chapter locks until you retake it",
            "The quiz is removed from the deck",
          ],
          answer: 1,
          explain: "Wrong answers go back to an early box, so the deck brings them back soon. A miss is information that sets your schedule.",
        },
        {
          kind: "p",
          text: "So Sam needs only a short routine for a chapter, and most of the papers from earlier chapters fold into it. Here it is for the chunking chapter, using that chapter's real parts. Its page lists 45 minutes of reading and 50 of lab work.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "Sam's routine for chapter three of the RAG course, complete.",
          code: `Chapter:    RAG chapter 3, Chunking
Parts:      3 widgets, 5 quizzes, 7 lab steps, 6 recap points

Before:     read tagline and section titles only     prediction sheet, 5 questions
Reading:    read-along, side items opened as I reach them
Widgets:    predict and commit on all 3              wrong guesses go on the sheet
Quizzes:    all 5 from memory                        5 cards enter the deck
Lab:        7 steps, test-first                      build log, one prediction per step
Recap:      cover it and say all 6 points            misses go on the recall sheet
Paragraph:  paste into the memory file
Next day:   clear the deck, then a recall sheet with the page closed
Later:      one teach-back, on the idea that stalled most`,
        },
        {
          kind: "p",
          text: "Each line is one habit from this course at the place the app makes room for it. The prediction sheet is the only part that happens outside a chapter's page. The deck needs nothing written at all, which is why Sam can drop the two-card table from chapter two.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next chapter: a blank routine.",
          code: `Chapter:
Parts:      (count the widgets, quizzes, lab steps and recap points)

Before:     (the tagline and section titles, then predictions)
Reading:
Widgets:
Quizzes:
Lab:
Recap:
Paragraph:
Next day:
Later:      (one teach-back on your weakest idea)`,
        },
        {
          kind: "p",
          text: "One habit from chapter three still has no place in that routine, and that is explaining aloud with someone pushing back.",
        },
      ],
    },
    {
      id: "interview-trainer",
      title: "The interview trainer grades your spoken answers like a tough interviewer",
      goal: "How do you use the question bank for practice under pressure, and read its scores?",
      blocks: [
        {
          kind: "p",
          text: "The question bank holds spoken questions for most courses, and it sits in the Interview prep tab. Practising aloud is useful whether or not an interview is part of your plans, because it is a teach-back with a grader. You can browse by category, or drill one random question.",
        },
        {
          kind: "p",
          text: "A mock interview gives you five random questions with a timer on each and a two-minute target. Use it once single drills stop surprising you.",
        },
        {
          kind: "p",
          text: "Each question hides its ideal answer, so try first. Press record and speak, and the browser transcribes you as you go, or type instead. You can edit the transcript before sending. Speaking is the closest rehearsal, because the skill you are building is spoken.",
        },
        {
          kind: "p",
          text: "When you send the answer, Claude grades it through your own subscription, which usually takes 20 to 60 seconds. It scores five dimensions out of ten. You also get the keywords you hit and missed, your strengths and your gaps. Then come a stronger answer and follow-up questions, which you can open as the next round.",
        },
        {
          kind: "list",
          items: [
            "Crispness asks whether you got to the point fast and stopped.",
            "Understanding asks whether your explanation is correct and shows the mechanism.",
            "Keywords asks whether you used the terms a specialist listens for.",
            "Structure asks whether the answer had a shape, such as answer first and then reasons.",
            "Depth asks whether you went beyond the textbook into trade-offs and failure modes.",
          ],
        },
        {
          kind: "callout",
          tone: "warn",
          title: "One score is noise, so read the trend",
          text: "A model grades the answer, and models are noisy. The same answer may score a point higher or lower on another day. Watch your history for each question and your weakest dimension over many attempts. Then fix the dimension.",
        },
        {
          kind: "p",
          text: "Here is how Sam reads a history. Sam drills one chunking question five times over two weeks, then changes one thing. These scores are illustrative, because Sam is fictional. The shape is what to look for.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "Sam's score history on one question, with the fix, complete.",
          code: `Question:  How do you choose a chunk size?

Attempt   Crispness   Understanding   Keywords   Structure   Depth
1         4           8               7          5           6
2         5           8               7          5           6
3         4           9               8          5           7
4         5           8               7          6           6
5         5           8               8          5           7

Reading:  Understanding holds at 8 or 9. Crispness stays at 4 or 5 on every attempt.
Cause:    The answer opens with background and reaches the method after a minute.
Fix:      First sentence is the method. Two reasons follow. Then stop.

6         7           8               8          7           6`,
        },
        {
          kind: "p",
          text: "No single row says much, because a one-point change is within the noise. Read down the columns instead. Understanding is steady and high, so more reading wouldn't help. Crispness never leaves four or five, so that is the problem. Sam changed the opening sentence and nothing else, and crispness rose two points.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next question: a blank score history.",
          code: `Question:

Attempt   Crispness   Understanding   Keywords   Structure   Depth
(at least three attempts, on different days)

Reading:  (which column stays lowest)
Cause:    (what your answers do that keeps it low)
Fix:      (one change only)`,
        },
        {
          kind: "quiz",
          id: "learn-03-q5",
          question: "Your crispness score is low across five attempts while understanding is high. What is the best fix?",
          options: [
            "Read more about the topic",
            "Lead with a one-sentence answer, give two reasons, and stop",
            "Speak more slowly to add detail",
            "Ignore it, since only the overall score matters",
          ],
          answer: 1,
          explain: "You understand the topic but bury the answer. The remedy is structural: answer first, support briefly, then stop.",
        },
        {
          kind: "p",
          text: "Sam now has a routine for each chapter and a way to practise aloud. What's left is deciding when each piece happens, and that decision shouldn't be made fresh every day.",
        },
      ],
    },
    {
      id: "weekly-rhythm",
      title: "A fixed weekly rhythm beats motivation",
      goal: "How do you plan a week that spaces reviews and builds while ideas are fresh?",
      blocks: [
        {
          kind: "p",
          text: "Willpower is a poor scheduler, so a fixed week removes the daily decision. Sam plans in five blocks: reading a chapter takes 40 minutes, a lab 75, the deck 15, a spoken drill 25 and a teach-back 15. These are planning averages, and a chapter's page gives its own estimate.",
        },
        {
          kind: "p",
          text: "Sam's full week covers two chapters, the chunking chapter and the one after it. This is the plan, with each day's minutes added up.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "Sam's full week and half week, with the minutes added up, complete.",
          code: `Full week: two chapters
Mon   read chapter 3 (40) + deck (15)              55
Tue   lab for chapter 3 (75) + deck (15)           90
Wed   deck (15) + drill (25) + teach-back (15)     55
Thu   read chapter 4 (40) + deck (15)              55
Fri   lab for chapter 4 (75) + deck (15)           90
Sat   deck (15) + drill (25) + teach-back (15)     55
Sun   rest                                          0
Total                                             400 minutes, which is 6 hours 40

Half week: one chapter
Mon   read chapter 3 (40) + deck (15)              55
Tue   lab for chapter 3 (75) + deck (15)           90
Thu   deck (15) + drill (25) + teach-back (15)     55
Sat   deck (15) + drill (25)                       40
Wed, Fri, Sun   rest                                0
Total                                             240 minutes, which is 4 hours`,
        },
        {
          kind: "p",
          text: "Look at what the full week does. The deck runs on six days, which gives you spacing. Each lab follows its chapter by a day. Drills and teach-backs come after a gap, so they test retrieval and short-term memory can't help. Sunday is empty on purpose, because rest is part of the plan.",
        },
        {
          kind: "p",
          text: "The half week keeps that shape at about three fifths of the time. It drops the second chapter and keeps the deck on four days. When time runs short, drop new material before you drop the deck. The deck takes fifteen minutes, and it carries the retention you have already paid for.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your own week: a blank plan with one hint per field.",
          code: `Hours I can give this week:
Mon
Tue
Wed
Thu
Fri
Sat
Sun   (leave one day empty)
Total   (add the minutes, and keep any one day to 120)

Checks: deck on 4 or more days; each read has a lab within two days;
        2 or more drills, never on a read day; a teach-back on a later day than the read.`,
        },
        {
          kind: "widget",
          id: "learn-week-plan",
          intro: "Build your own week from five kinds of block. Six checks mark your plan live against the principles you have just learned. Try to pass all six within your own hour budget, then judge the plan.",
        },
        {
          kind: "quiz",
          id: "learn-03-q6",
          question: "You must cut the week in half. Which cut is the most damaging?",
          options: [
            "Dropping the second chapter",
            "Dropping the review deck to save fifteen minutes a day",
            "Halving the number of interview drills",
            "Moving the rest day to Monday",
          ],
          answer: 1,
          explain: "The deck is the cheapest, most reliable carrier of long-term retention. Cut volume of new material first, and protect the short daily reviews.",
        },
        {
          kind: "p",
          text: "That is the whole method. Predict before you read, and retrieve instead of rereading. Let the deck space your reviews. Build test-first, explain with no notes, and put it all on a fixed week. Sam's chapter was chunking. Yours starts in the next course. Open chapter one, on why RAG exists, and read only the title before you guess.",
        },
      ],
    },
  ],
  recap: [
    "Each part of a chapter has one job: predict at widgets, retrieve at quizzes, build at labs and self-test at the recap.",
    "The question bank scores five dimensions, and the trend across attempts matters more than any one score.",
    "Read a score history down its columns, then change one thing.",
    "A fixed week with daily deck reviews, labs soon after reads and a rest day beats relying on motivation.",
    "When time is short, cut new material first and protect the deck.",
  ],
  reinforcement:
    "I am learning to build AI systems well. In the study week I learned that a fixed routine beats motivation, that each part of a chapter has one job, and that I should cut new material before I cut reviews. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
};

export default chapter;
