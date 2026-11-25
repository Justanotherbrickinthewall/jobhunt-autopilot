import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "learn-02-retrieval-and-spacing",
  course: "learn",
  number: 2,
  title: "Memory grows when you pull answers out of it",
  tagline: "How do you make what you read still be there next month? Retrieve it, space it and mix it.",
  minutes: 35,
  objectives: [
    "Write a recall sheet for a chapter and mark it honestly.",
    "Spot the illusion of fluency by predicting your own score.",
    "Follow a card through the review deck and say when it returns.",
    "Build a mixed problem set that makes you choose the method.",
  ],
  sections: [
    {
      id: "retrieval",
      title: "Pulling an answer out of memory beats putting it in again",
      goal: "What should you do straight after reading a chapter?",
      blocks: [
        {
          kind: "p",
          text: "Chapter one left Sam, our fictional learner, with a chapter read once and a sheet of rules. The question now is how to keep it. The answer is to retrieve it. Each time you pull something out of memory, it gets easier to pull out next time.",
        },
        {
          kind: "p",
          text: "Researchers call this the **testing effect**, or **retrieval practice**. A test measures learning, and it also causes learning. Henry Roediger and Jeffrey Karpicke showed this in 2006. Students studied a passage. Some then reread it, and some took a recall test.",
        },
        {
          kind: "p",
          text: "Five minutes later, the rereaders did better. Two days and a week later, the tested group did better. Notice the trap. Right after studying, rereading looks like the winner. If you judge a method by how you feel tonight, you'll pick the weaker one.",
        },
        {
          kind: "callout",
          tone: "insight",
          title: "Failing a recall still helps",
          text: "A failed attempt followed by the correct answer tends to teach more than skipping the attempt. So don't wait until you feel ready to test yourself. Test yourself early, get it wrong, read the answer and keep going.",
        },
        {
          kind: "quiz",
          id: "learn-02-q1",
          question: "Five minutes after studying, rereaders outscored the tested group. A week later the result flipped. What should you conclude?",
          options: [
            "Rereading is better for short-term goals only, and testing wins for anything you must keep",
            "The experiment was flawed",
            "Testing only helps students who are already good",
            "Rereading wins when the material is difficult",
          ],
          answer: 0,
          explain: "Rereading boosts the short term and fades. Retrieval builds memory that lasts. Judge a method by retention after a delay, and ignore how it feels at the time.",
        },
        {
          kind: "p",
          text: "A recall sheet is the simplest form of this. You write questions with the chapter open, then close the chapter and answer them from memory. Sam does this an hour after finishing the chunking chapter. Before answering, Sam writes down the score they expect.",
        },
        {
          kind: "p",
          text: "Sam marks each answer against the page as right, partly or missed. Partly means the answer was correct and incomplete. Here is the sheet with Sam's closed-book answers.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "Sam's recall sheet for chapter three of the RAG course, complete.",
          code: `Chapter:          RAG chapter 3, Chunking
Written:          one hour after reading, answered with the page closed
Expected score:   6 of 6

1. Why can't one vector stand for a whole document?
   Answer:  It lands between its topics, so a specific question matches it weakly.
   Mark:    right

2. Define precision and recall.
   Answer:  Precision is the share of what came back that was relevant.
            Recall is the share of what I needed that came back.
   Mark:    right

3. What does overlap do, and what does it cost?
   Answer:  It repeats the end of a chunk at the start of the next, so an idea that crosses a cut survives.
   Mark:    partly. Forgot the cost, a bigger index.

4. What does each chunk carry besides its text?
   Answer:  Document id, title, source and heading path.
   Mark:    partly. Forgot its position, token count and start and end offsets.

5. Why store start and end offsets?
   Answer:  (blank)
   Mark:    missed. They map a hit back to the exact source passage,
            and they let a test check that nothing was lost.

6. Which splitting strategy is the default for prose, and how does it work?
   Answer:  Recursive splitting. It tries the biggest natural break and falls back
            to smaller ones only when a piece is still too big.
   Mark:    right

Score:            3 right, 2 partly, 1 missed
Reread:           only the overlap paragraph and the metadata section`,
        },
        {
          kind: "p",
          text: "Three things on that sheet matter. Sam's gaps are specific, so the second visit to the chapter is two short passages. Question five came back blank, and a blank is the clearest signal a sheet can give. And the last line replaces a full reread, which would have cost Sam about the whole 45 minutes the chapter lists.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next chapter: a blank recall sheet with one hint per field.",
          code: `Chapter:
Written:          (at least an hour after reading, page closed)
Expected score:   (write this before you answer)

1. (a question that needs a sentence, not a yes or no)
   Answer:  (from memory, leave it blank if nothing comes)
   Mark:    (right, partly or missed, checked against the page)

Score:
Reread:           (only the passages behind your gaps)`,
        },
        {
          kind: "p",
          text: "One field on that sheet needs its own section. Sam expected six out of six and got three. Why was Sam so sure?",
        },
      ],
    },
    {
      id: "fluency",
      title: "Rereading feels like learning and mostly is not",
      goal: "Why did Sam expect six out of six and score three?",
      blocks: [
        {
          kind: "p",
          text: "When text is familiar, you read it smoothly. That smoothness is **fluency**, and the brain reads it as knowing. So a second pass over a chapter feels wonderful, and you leave convinced that you have it.",
        },
        {
          kind: "p",
          text: "What you have is recognition, which is easy. You don't yet have recall, which is hard. In 2013, John Dunlosky and colleagues reviewed ten popular study techniques. Practice testing and spaced practice rated high. Highlighting and rereading rated low.",
        },
        {
          kind: "p",
          text: "Sam's expected score is fluency caught in the act. The chunking chapter read smoothly, so six out of six felt fair. The gap between six and three cost nothing to find, because Sam wrote the number down first. Do the same on every sheet. Over a few chapters, you learn how far your own confidence runs ahead of you.",
        },
        {
          kind: "widget",
          id: "learn-fluency-trap",
          intro: "Read a short passage on a topic you probably know less about. Predict your score on a five-question test, reread, and predict again. Then take the closed-book test. Watch what the rereading did to your confidence and what it did to your answers.",
        },
        {
          kind: "quiz",
          id: "learn-02-q2",
          question: "You reread a chapter and it all feels clear. What does that feeling tell you?",
          options: [
            "That you can now recall it without the page",
            "That the text is easy to process, which says little about your memory",
            "That you should move on to the next chapter",
            "That the chapter was badly written",
          ],
          answer: 1,
          explain: "Ease of reading is fluency. It is a poor predictor of whether you can produce the idea later. Test first, then decide.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Senior engineers fall for this easily",
          text: "You read fast and recognise patterns on sight. That makes a second pass feel especially smooth, and the smoothness is cheap to get. Make the check routine and quick, so your gut never gets the final say.",
        },
        {
          kind: "p",
          text: "So Sam has tested once and found the gaps. One test won't hold for long. The next question is when to test again.",
        },
      ],
    },
    {
      id: "spacing",
      title: "Spaced reviews win, and the forgetting curve says when",
      goal: "When should each review happen?",
      blocks: [
        {
          kind: "p",
          text: "In 1885, Hermann Ebbinghaus measured memory for nonsense syllables, with the researcher as the only subject. Forgetting proved steep at first and then flat. The working model of spaced review builds on that shape. Each successful retrieval makes the next decline slower.",
        },
        {
          kind: "p",
          text: "That is the **spacing effect**. Reviews spread over time beat the same hours packed into one session. Aim to review when recall is hard but still possible, because the effort of recall is what strengthens the memory.",
        },
        {
          kind: "p",
          text: "This app runs that schedule for you in the **review deck**. Every quiz you answer in a chapter becomes a card in one of five boxes. A card you got right starts in box two, and a card you got wrong starts in box one.",
        },
        {
          kind: "p",
          text: "Box one is due at once. Boxes two to five come back after one, three, seven and sixteen days. A right answer in a review lifts the card one box. A wrong answer drops it to box one. The Review page shows how many cards are due.",
        },
        {
          kind: "p",
          text: "Follow two of Sam's cards. Both come from quizzes in the chunking chapter. Sam gets the first one right every time. Sam gets the second wrong in the chapter, recovers, and then forgets it again on day four.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "Two of Sam's cards through the review deck, by day, complete.",
          code: `Card A: rag-03-q2, what happens to precision when chunks grow
Day 0    quiz     right   box 2   next due day 1
Day 1    review   right   box 3   next due day 4
Day 4    review   right   box 4   next due day 11
Day 11   review   right   box 5   next due day 27
Day 27   review   right   box 5   next due day 43

Card B: rag-03-q4, why chunks store offsets
Day 0    quiz     wrong   box 1   due at once
Day 0    review   right   box 2   next due day 1
Day 1    review   right   box 3   next due day 4
Day 4    review   wrong   box 1   due at once
Day 4    review   right   box 2   next due day 5
Day 5    review   right   box 3   next due day 8
Day 8    review   right   box 4   next due day 15
Day 15   review   right   box 5   next due day 31`,
        },
        {
          kind: "p",
          text: "The gaps are one, three, seven and sixteen days, so a card you keep getting right returns on days one, four, eleven and twenty-seven. After that, box five repeats every sixteen days. Card A shows the plain case.",
        },
        {
          kind: "p",
          text: "Card B shows what a miss costs. The lapse on day four sent it back to the start, and it reached box five on day fifteen instead of day eleven. Four days is a small price, and in return the deck showed Sam that card more often when it was weak.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "For a topic outside this app: a blank review record using the deck's gaps.",
          code: `Topic or card:
Box:          (start at 2 if right, 1 if wrong)
Reviewed on:
Result:       (right goes up one box, wrong goes to box 1)
Next due:     (add the gap for the new box: 0, 1, 3, 7 or 16 days)`,
        },
        {
          kind: "widget",
          id: "learn-forgetting-curve",
          intro: "Your goal is to hold a memory until an exam on day forty-five, using four reviews. Place them where you think they help most. Compare your result with the expanding schedule that this app's review deck uses.",
        },
        {
          kind: "callout",
          tone: "insight",
          title: "How the review deck reaches you",
          text: "You don't build the deck. Answer a quiz in a chapter and its card exists. Open the Review page once a day and clear what is due, which is usually a few minutes of work.",
        },
        {
          kind: "quiz",
          id: "learn-02-q3",
          question: "Which schedule do you expect to hold a memory longest?",
          options: [
            "Four reviews in the first hour",
            "One review per week at fixed intervals",
            "Reviews with gaps of one, three, seven and sixteen days",
            "No reviews, but one very long first session",
          ],
          answer: 2,
          explain: "Expanding gaps catch the memory as it fades, and each success lets the next gap stretch. Clumped reviews and one long session add little lasting stability.",
        },
        {
          kind: "quiz",
          id: "learn-02-q4",
          question: "In the simulator, a review placed when retention was already very low added little. Why does that match real learning?",
          options: [
            "The memory was effectively gone, so the review was close to learning it again",
            "Late reviews are always harmful",
            "The model punishes anyone who misses a deadline",
            "Retention does not matter after day thirty",
          ],
          answer: 0,
          explain: "Wait too long and recall fails, so you are relearning. The sweet spot is hard but still possible, which is why the deck's gaps grow gradually.",
        },
        {
          kind: "p",
          text: "Spacing tells Sam when to practise. It doesn't say what to mix together, and that turns out to matter as well.",
        },
      ],
    },
    {
      id: "interleaving",
      title: "Mixing topics feels worse and works better",
      goal: "Why should you practise different topics together?",
      blocks: [
        {
          kind: "p",
          text: "Blocked practice means doing one kind of problem many times in a row. **Interleaving** mixes the kinds. Doug Rohrer and Kelli Taylor studied mathematics practice. Mixed practice led to better scores on a later test, even though it felt harder at the time.",
        },
        {
          kind: "p",
          text: "The reason is simple. In a mixed set, you must work out which method applies before you can apply it. That choice is half the real skill. Blocked practice hands you the choice for free and hides the gap.",
        },
        {
          kind: "p",
          text: "Robert Bjork calls effort like this a **desirable difficulty**. It slows you down in the moment and helps later. The review deck gives you some of this, because cards from every chapter you have opened come back together, oldest due first.",
        },
        {
          kind: "p",
          text: "You can do it on purpose too. On a chapter's page, the chapter gives the topic away. So Sam writes six short problems across the first three RAG chapters and shuffles them. Each one needs a method named, and no problem says which chapter it belongs to.",
        },
        {
          kind: "p",
          text: "Two terms come from those earlier chapters. A stage is one step of the path a document takes on its way into the search index. A parser is the stage that turns a format such as PDF into clean text. Here is the set, with Sam's answers and marks.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "Sam's mixed problem set across the first three RAG chapters, complete.",
          code: `Rule: for each problem, name the method first, then check the source.

1. A user asks about a policy published last month, and the model's training ended last year.
   Method named:  Retrieve the policy at question time.         Source: chapter 1. Right.

2. The team wants every answer written in the house style.
   Method named:  Add retrieval of style guides.                Source: chapter 1. Wrong.
   Correct:       This is behaviour, so use the prompt or training.

3. Answers quote sentences that mix two columns of a PDF. Which stage is at fault?
   Method named:  The chunker.                                  Source: chapter 2. Wrong.
   Correct:       The parser. No later stage can repair the text it damaged.

4. The corpus is a set of Python source files.
   Method named:  Cut at functions and classes from the syntax tree. Source: chapter 3. Right.

5. The corpus is a support FAQ of short question and answer pairs.
   Method named:  One pair per chunk.                           Source: chapter 3. Right.

6. A user asks how many issues are open right now.
   Method named:  Call a tool.                                  Source: chapter 1. Right.

Score:   4 of 6. Both misses were choosing the wrong kind of fix.`,
        },
        {
          kind: "p",
          text: "Sam knew each of these facts on its own page. Both misses came from reaching for the method just studied. Sam had chunking in mind and blamed the chunker for a parsing fault. That is the error a blocked set can't show you, and a mixed set shows it in six lines.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next set of chapters: a blank mixed problem set.",
          code: `Rule: for each problem, name the method first, then check the source.

1. (a short situation that does not name the topic)
   Method named:
   Source:        (the chapter, added after you commit)
   Correct:       (only if you were wrong)

Score:
Pattern:       (what your wrong answers have in common)`,
        },
        {
          kind: "compare",
          caption: "Methods that feel easy tend to test poorly, and methods that feel slow tend to stick.",
          columns: ["Method", "How it feels", "What it does"],
          rows: [
            ["Rereading", "Smooth and satisfying", "Builds familiarity, little recall"],
            ["Highlighting", "Productive", "Little measured benefit on its own"],
            ["Retrieval practice", "Effortful, sometimes embarrassing", "Strong, lasting memory"],
            ["Spaced reviews", "Tedious at first", "Flatter forgetting curve"],
            ["Interleaving", "Messy and slow", "Better choice of method on new problems"],
          ],
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Interviews are retrieval under pressure",
          text: "Technical interviews test this directly. Nothing is on the page, and you must retrieve an idea fast, in your own words, while someone watches. Retrieval practice trains that skill. Rereading your notes trains recognition, which is a different skill.",
        },
        {
          kind: "quiz",
          id: "learn-02-q5",
          question: "Your review deck mixes cards from five chapters. Practice feels slower and more frustrating than doing one chapter at a time. What is the right reading?",
          options: [
            "The deck is badly designed and should be blocked by chapter",
            "That difficulty is likely doing useful work, so keep it mixed",
            "Interleaving only works for mathematics",
            "You should skip the deck until you know the material",
          ],
          answer: 1,
          explain: "Mixed practice forces you to pick the method and retrieve under uncertainty. It feels worse and tends to test better.",
        },
        {
          kind: "p",
          text: "Sam can now retrieve most of the chapter on demand. Remembering what a chunker should do is still different from being able to write one, or explain one. So how do you prove you know it? Chapter three answers that.",
        },
      ],
    },
  ],
  recap: [
    "Retrieving a memory strengthens it more than reading it again, and the gap shows up after a delay.",
    "A recall sheet finds your gaps, so you reread two passages and skip the rest of the chapter.",
    "Fluency is the feeling of ease. Writing down an expected score shows how poor a guide it is.",
    "The deck's gaps are one, three, seven and sixteen days, so a card you keep getting right returns on days one, four, eleven and twenty-seven.",
    "Interleaving makes you choose the method, and a mixed set shows which wrong fix you reach for.",
  ],
  reinforcement:
    "I am learning to build AI systems well. In retrieval practice and spacing I learned that memory is built by pulling answers out at growing intervals, and that rereading only feels like learning. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
};

export default chapter;
