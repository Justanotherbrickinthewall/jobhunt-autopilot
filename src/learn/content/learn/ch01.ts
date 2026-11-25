import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "learn-01-mental-models",
  course: "learn",
  number: 1,
  title: "Expertise is a set of mental models you can run",
  tagline: "What should you do before you read a chapter? Predict what it will say, in writing.",
  minutes: 30,
  objectives: [
    "Define a mental model as a simulation you can run to predict behaviour.",
    "Fill in a prediction sheet for a chapter before you read it.",
    "Break a small system on purpose, predicting each result first.",
  ],
  sections: [
    {
      id: "experts-predict",
      title: "Experts predict while novices recall",
      goal: "Why does a pile of facts not make you good at anything?",
      blocks: [
        {
          kind: "p",
          text: "This course answers one question: how do you learn hard technical material quickly and keep it? The first part of the answer is that expertise is a set of **mental models** you can run. A large store of facts is a smaller part of it.",
        },
        {
          kind: "p",
          text: "A mental model is a small simulation in your head. You feed it a situation, and it tells you what happens next. A senior engineer reads a stack trace and already suspects which service is lying. That is a model running.",
        },
        {
          kind: "p",
          text: "Facts answer the question what. Models answer the question what if. Incidents, design reviews and customer calls are almost all what if questions. What if the cache is stale? What if the user pastes a table? Recall alone has nothing to say.",
        },
        {
          kind: "callout",
          tone: "analogy",
          title: "A flight simulator teaches what a manual can't",
          text: "A pilot who has memorised the manual can name every switch. A pilot with a model can still fly when an engine fails and the manual has no page for it. You want to be the second pilot, and practice at simulating gets you there.",
        },
        {
          kind: "fold",
          tone: "dyk",
          title: "What chess masters remember",
          text: "In 1973, William Chase and Herbert Simon showed chess players real game positions for a few seconds. Masters rebuilt them far better than novices. When the pieces were placed at random, the masters' advantage largely vanished. They were seeing meaningful patterns, which is what a model is made of.",
        },
        {
          kind: "quiz",
          id: "learn-01-q1",
          question: "A colleague can recite the definition of every caching term but freezes when asked what happens if the cache lifetime is halved. What is missing?",
          options: [
            "More facts about caching",
            "A mental model they can run to predict the effect",
            "A faster reading speed",
            "A better set of flashcards",
          ],
          answer: 1,
          explain: "Reciting definitions is recall. Predicting the effect of a change means running a model, and that is the skill incidents and customers test.",
        },
        {
          kind: "p",
          text: "This course follows one learner, so each method is shown on real work. Sam is a fictional senior backend engineer who is new to AI systems. Sam will study one real chapter of this app: chapter three of the next course, on chunking.",
        },
        {
          kind: "p",
          text: "You don't need that course yet, and neither does Sam. The next course teaches retrieval-augmented generation, or RAG. A RAG system finds passages in your documents and hands them to a model when a question arrives. Chunking is how you cut the documents into those passages.",
        },
        {
          kind: "p",
          text: "A passage cut this way is a chunk. Everything else Sam needs is explained as it comes up. So how does Sam start on a chapter with no knowledge of its subject? Sam guesses, on purpose and in writing.",
        },
      ],
    },
    {
      id: "predict-loop",
      title: "Predicting before you check is how a model gets built",
      goal: "How do you turn a chapter you haven't read into a set of predictions?",
      blocks: [
        {
          kind: "p",
          text: "A model improves when it is wrong in a way you can see. You make a prediction, you see the result, and the gap between them is a precise error signal. It tells you which rule your model lacks. Reading the answer first throws that signal away.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Predict the outcome before you look.",
            "Commit to a confidence level, sure or guess.",
            "Check the real result.",
            "Explain the gap in one sentence, naming the rule you were missing.",
            "Run the same kind of prediction again soon.",
          ],
        },
        {
          kind: "p",
          text: "Step two matters more than it looks. If you only think a prediction, hindsight will quietly rewrite it. After the reveal you'll feel that you knew all along. Writing it down closes that loophole.",
        },
        {
          kind: "p",
          text: "Here is the loop applied to a chapter. Sam opens chapter three of the RAG course and reads only its tagline and section titles. The tagline asks where to cut a document, and what each chunk must carry. Sam turns what the titles promise into five what if questions.",
        },
        {
          kind: "p",
          text: "Sam needs four terms to write them. A token is the unit a model counts text in, about four characters of English. An embedding is a list of numbers that stands for a passage's meaning. Precision is the share of what came back that was actually needed. Overlap repeats the end of one chunk at the start of the next.",
        },
        {
          kind: "p",
          text: "Sam writes a prediction and a confidence for each question, then reads the chapter. The result and the rule are filled in only after the chapter has settled the question. This is the whole sheet.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "Sam's prediction sheet for chapter three of the RAG course, complete.",
          code: `Chapter:     RAG chapter 3, Chunking
Filled in:   predictions before reading, results and rules after

1. If a chunk grows from 200 to 1,000 tokens, what happens to precision?
   Prediction:  It rises, because each hit holds more of the answer.
   Confidence:  sure
   Result:      wrong. Precision falls.
   Rule:        A bigger chunk carries more text the question did not need.

2. With 400-token chunks and 50 tokens of overlap, how much more do we store?
   Prediction:  12.5 percent, which is 50 over 400.
   Confidence:  sure
   Result:      wrong. About 14 percent.
   Rule:        Each chunk stores 400 tokens but advances only 350. The ratio is 400 over 350.

3. Why not embed a whole document as one chunk?
   Prediction:  It would cost too much.
   Confidence:  guess
   Result:      wrong.
   Rule:        One vector cannot point at many topics. Text past the model's input limit is also lost.

4. Does cutting where the meaning changes beat cutting at the document's structure?
   Prediction:  Yes, clearly.
   Confidence:  sure
   Result:      wrong. Gains are inconsistent, and it adds cost and a threshold to tune.
   Rule:        Start with the structural baseline. A cleverer method has to beat it on my own questions.

5. Where should a chunker cut a Python file?
   Prediction:  At functions and classes.
   Confidence:  guess
   Result:      right.
   Rule:        A signature must stay with its body and docstring.

Tally:       1 right, 4 wrong. Sure: 3, all wrong. Guess: 2, one right.`,
        },
        {
          kind: "p",
          text: "Read the tally first. Sam got one of five right, and that is a good result, because each miss now has a named rule. All three sure answers were wrong. Those are the ones to look at hardest, because Sam's model was confidently broken in exactly those places.",
        },
        {
          kind: "p",
          text: "Look at the second row too. Sam's arithmetic was fine, and the model of overlap was wrong. Each chunk advances by 350 tokens, so 400 over 350 gives about 1.14, or 14 percent more. A sheet catches that kind of error. A second reading doesn't.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next chapter: a blank prediction sheet with one hint per field.",
          code: `Chapter:
Filled in:   predictions before reading, results and rules after

1. (a what if question built from one section title)
   Prediction:  (one sentence)
   Confidence:  (sure or guess)
   Result:      (right, wrong or partly)
   Rule:        (written after checking, in one sentence)

Tally:       (right and wrong, then how the sure answers did)`,
        },
        {
          kind: "widget",
          id: "learn-predict-cache",
          intro: "Here is a tiny cache and three sequences of requests. Predict the final contents before anything changes, then say how sure you are. Watch which wrong answer tempts you most, because each one maps to a flaw in your model.",
        },
        {
          kind: "fold",
          tone: "dyk",
          title: "Why confident errors are gold",
          text: "Brady Butterfield and Janet Metcalfe reported the hypercorrection effect in 2001. When people are confident and wrong, they are more likely to fix the error after feedback than when they were unsure. Separately, Lindsey Richland and colleagues found in 2009 that a failed attempt to answer can help the later learning. Guessing wrong costs you very little.",
        },
        {
          kind: "quiz",
          id: "learn-01-q2",
          question: "Why does the loop ask you to commit to a confidence level before the reveal?",
          options: [
            "It makes the widget feel more like a game",
            "Hindsight bias will otherwise convince you that you knew the answer",
            "It lets the app grade you more strictly",
            "Confidence levels are required to unlock the next chapter",
          ],
          answer: 1,
          explain: "Without a recorded commitment, the brain rewrites history after the reveal. Committing keeps the error signal honest.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "It depends is only the start of an answer",
          text: "This habit comes up in technical interviews, where what if questions test whether you have a runnable model. If you say it depends, name what it depends on and say which way it pushes. That is a model speaking. A bare it depends is recall giving up.",
        },
        {
          kind: "p",
          text: "A sheet tests your model against a page. The next section tests it against a running system, which can't be argued with.",
        },
      ],
    },
    {
      id: "break-it",
      title: "Break a system on purpose to learn how it works",
      goal: "How does controlled breakage build a model faster than reading does?",
      blocks: [
        {
          kind: "p",
          text: "Reading documentation top to bottom builds a map of the words. Breaking the system builds a map of the behaviour. Change one thing, predict the effect, then run it. Each surprise is a rule you didn't have yet.",
        },
        {
          kind: "p",
          text: "Engineers call removing a component to see what fails an **ablation**. The RAG course does this later, when it turns off a reranker, a step that reorders search results, and watches which answers get worse. The method needs no large system. Sam tries it on thirteen lines of Python.",
        },
        {
          kind: "p",
          text: "Sam's sheet missed the overlap sum, so Sam builds the smallest chunker that has overlap. It cuts a fixed window of words, and it runs on two sentences from Python's style guide, PEP 8. The sentences give two line limits, 79 and 72. A real chunker counts tokens and respects headings, but this one is enough to break.",
        },
        {
          kind: "code",
          lang: "python",
          caption: "The smallest chunker with overlap, which Sam runs twice.",
          code: `TEXT = ("Limit all lines to a maximum of 79 characters. For flowing long blocks of text "
        "with fewer structural restrictions (docstrings or comments), the line length "
        "should be limited to 72 characters.")

def chunk(words, size, overlap):
    step = size - overlap
    return [words[i:i + size] for i in range(0, len(words), step)]

words = TEXT.split()
for size, overlap in [(12, 0), (12, 4)]:
    chunks = chunk(words, size, overlap)
    stored = sum(len(c) for c in chunks)
    print(f"size={size} overlap={overlap} chunks={len(chunks)} stored={stored} of {len(words)}")
    for n, c in enumerate(chunks):
        print(f"  {n}: {' '.join(c)}")`,
        },
        {
          kind: "p",
          text: "Before running it, Sam writes down two predictions for the second run. Adding four words of overlap will keep three chunks and store 39 words, because two cuts each repeat four. And overlap will put both limits, 79 and 72, in one chunk at last. Sam is sure of the first and guessing at the second.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "What the script printed.",
          code: `size=12 overlap=0 chunks=3 stored=31 of 31
  0: Limit all lines to a maximum of 79 characters. For flowing long
  1: blocks of text with fewer structural restrictions (docstrings or comments), the line
  2: length should be limited to 72 characters.
size=12 overlap=4 chunks=4 stored=43 of 31
  0: Limit all lines to a maximum of 79 characters. For flowing long
  1: characters. For flowing long blocks of text with fewer structural restrictions (docstrings
  2: fewer structural restrictions (docstrings or comments), the line length should be limited
  3: length should be limited to 72 characters.`,
        },
        {
          kind: "code",
          lang: "text",
          caption: "Sam's record of the experiment, complete.",
          code: `System:      13-line word-window chunker on two sentences of PEP 8
Changed:     overlap from 0 to 4 words, size held at 12

Prediction 1 (sure):   3 chunks, 39 words stored.
Result:                wrong. 4 chunks, 43 words stored.
Rule:                  The window advances by size minus overlap, here 8 words. 31 over 8 rounds up to 4 chunks.

Prediction 2 (guess):  One chunk now holds both 79 and 72.
Result:                wrong. No chunk holds both.
Rule:                  Overlap rescues an idea that crosses one cut. It can't join two facts further apart than a window.

Next change to try:    size 24, overlap 4.`,
        },
        {
          kind: "p",
          text: "The first prediction failed for the same reason as the sheet. Sam counted the repeated words and forgot that overlap shortens every step. Four words of overlap on a twelve word window means steps of eight, and that creates a fourth chunk of seven words. Twelve, twelve, twelve and seven make 43.",
        },
        {
          kind: "p",
          text: "The second prediction taught something the chapter says in a sentence. Overlap only patches a bad cut. It took Sam five minutes to see that happen, and a rule that you saw fail is harder to lose than one you read.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next system: a blank experiment record.",
          code: `System:      (the smallest working version you can run)
Changed:     (one setting only, and what you held still)

Prediction 1 (sure or guess):
Result:
Rule:        (the rule the result gave you, in one sentence)

Next change to try:`,
        },
        {
          kind: "compare",
          caption: "Novices and experts treat a new system very differently, and the difference shows up in the first ten minutes.",
          columns: ["Moment", "Novice", "Expert"],
          rows: [
            ["Meeting a new system", "Reads the documentation from the top", "Guesses how it works, then tests the guess"],
            ["Getting stuck", "Searches for the answer", "Works out which part of the model is wrong"],
            ["After a failure", "Fixes the symptom", "Updates the model and predicts the next failure"],
          ],
        },
        {
          kind: "widget",
          id: "learn-habit-sorter",
          intro: "Eight study habits are about to appear one at a time. Sort each into novice or expert and read the reason. At the end, be honest about which novice habit is yours, and take the swap on offer.",
        },
        {
          kind: "quiz",
          id: "learn-01-q3",
          question: "You are handed an unfamiliar vector database, a store that searches by similarity. Which first step builds a model fastest?",
          options: [
            "Read the full documentation before touching anything",
            "Watch a conference talk at double speed",
            "Predict what a query returns, run it, then change one setting and predict again",
            "Copy a tutorial's code and hope it works",
          ],
          answer: 2,
          explain: "Predict, run and perturb gives you an error signal on every step. The other options give you familiarity, which is a different thing from a model.",
        },
        {
          kind: "quiz",
          id: "learn-01-q4",
          question: "In the sorter, which habit is an expert habit?",
          options: [
            "Highlighting the key lines of a chapter",
            "Rereading a chapter the night before",
            "Predicting what code prints, then running it",
            "Reading a finished solution and moving on",
          ],
          answer: 2,
          explain: "Prediction forces the model to run. The other three produce familiarity without testing anything.",
        },
        {
          kind: "p",
          text: "Sam has now read the chapter once and has a sheet of rules. Most people stop here, or read the chapter again. So how do you make what you just read still be there next month? Chapter two answers that.",
        },
      ],
    },
  ],
  recap: [
    "A mental model is a simulation that predicts behaviour, and experts have more of them than facts.",
    "Facts answer what. Models answer what if, and that is what incidents and customers bring.",
    "The loop is predict, commit, check, explain the gap, repeat.",
    "A prediction sheet applies the loop to a chapter before you read it, and each miss becomes a named rule.",
    "Breaking a small system on purpose, one setting at a time, gives you rules you have seen fail.",
  ],
  reinforcement:
    "I am learning to build AI systems well. In learning mental models I learned that expertise is a simulation I can run. I build it by predicting an outcome and committing to it before I check. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
};

export default chapter;
