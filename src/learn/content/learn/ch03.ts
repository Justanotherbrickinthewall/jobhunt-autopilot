import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "learn-03-build-and-teach",
  course: "learn",
  number: 3,
  title: "You know it when you can build it and explain it",
  tagline: "How do you prove you know something? Make a failing test pass, then explain it with no notes.",
  minutes: 30,
  objectives: [
    "Run one lab step test-first and keep a build log.",
    "Run a teach-back with no notes, mark your stalls and fix them at the source.",
  ],
  sections: [
    {
      id: "build-first",
      title: "Building something that works proves more than reading about it",
      goal: "What does a test-first lab tell you that a recall sheet can't?",
      blocks: [
        {
          kind: "p",
          text: "Chapter two left Sam, our fictional learner, able to retrieve most of the chunking chapter. Sam still hasn't built anything. A working program is a test you can't talk your way through. It either returns the right answer or it doesn't. So eight chapters of the RAG course have a lab.",
        },
        {
          kind: "p",
          text: "Those labs are **test-first**, which means the check exists before your code does. You run it, watch it fail, and then make it pass. The failing test is your prediction made concrete, and it gives you feedback within seconds.",
        },
        {
          kind: "p",
          text: "Anders Ericsson and colleagues studied how experts improve, and in 1993 they named the method **deliberate practice**. Its conditions include a well-defined task at the right difficulty, informative feedback, and the chance to repeat the task and correct your errors. A test-first lab supplies all of these.",
        },
        {
          kind: "p",
          text: "Build in thin vertical slices. A thin vertical slice is a crude version that works from input to output, even if each stage is a stub. Then deepen one stage at a time. A working skeleton shows you where the real problems are before you have polished the wrong part.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Do the work before you read any solution",
          text: "Some later labs ship a solutions folder, which exists for checking afterwards. Reading it before you try is the same mistake as reading the answer before you predict. You'll feel that you understood, and you'll have trained recognition only.",
        },
        {
          kind: "quiz",
          id: "learn-03-q1",
          question: "Which feature of a test-first lab best matches the feedback part of deliberate practice?",
          options: [
            "The reference solutions folder",
            "A test that fails before your code exists and passes within seconds when it is right",
            "The minutes estimate at the top of the lab",
            "The recap at the end of the chapter",
          ],
          answer: 1,
          explain: "Immediate, specific feedback is the point. A failing then passing test tells you in seconds whether your model of the code was right.",
        },
        {
          kind: "p",
          text: "The chunking chapter's lab has seven steps. Each of its code stubs raises an error naming the step that fills it in. Sam starts on step one, which writes a token estimate and rejects bad options. Sam keeps the loop from chapter one and predicts before each run.",
        },
        {
          kind: "p",
          text: "Sam expects two failing tests, one for the estimate and one for the option checks. Then Sam runs the step's tests, writes the code, and runs them again. This is the whole log. The word deselected means tests that the filter skipped.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "Sam's build log for step one of the chunking lab, complete. The output is from a real run of the lab's tests.",
          code: `Lab:         RAG chapter 3, step 1 of 7, the token estimate and option checks
Prediction:  2 tests fail, one for the estimate and one for the options.

Run 1, before any code:
$ uv run pytest tests/rag/test_chunking.py -k ch03_s1
E       NotImplementedError: rag-03 step 1
FAILED tests/rag/test_chunking.py::test_ch03_s1_a_token_is_four_characters_rounded_up
FAILED tests/rag/test_chunking.py::test_ch03_s1_a_max_tokens_below_one_is_rejected
FAILED tests/rag/test_chunking.py::test_ch03_s1_an_overlap_that_is_not_below_max_tokens_is_rejected
FAILED tests/rag/test_chunking.py::test_ch03_s1_a_negative_overlap_is_rejected
4 failed, 47 deselected in 0.05s

Result:      wrong. 4 fail, because each bad option has its own test.
Rule:        A validation rule is three rules here: below one, not below the maximum, and negative.

Code written:
    def estimate_tokens(text: str) -> int:
        return (len(text) + 3) // 4

    # first lines of chunk_document
    if max_tokens < 1 or overlap_tokens < 0 or overlap_tokens >= max_tokens:
        raise ValueError("bad chunk options")

Run 2:
$ uv run pytest tests/rag/test_chunking.py -k ch03_s1
4 passed, 47 deselected in 0.03s

Run 3, the whole file:
$ uv run pytest tests/rag/test_chunking.py
47 failed, 4 passed in 0.21s

Next:        step 2, headings and the heading path.`,
        },
        {
          kind: "p",
          text: "The log holds three readings. The prediction was wrong, and the miss produced a real rule, because Sam had treated three different bad inputs as one. The second run took four tests from failing to passing, so step one is done.",
        },
        {
          kind: "p",
          text: "The third run looks alarming and isn't. The 47 failures are the later steps, each still raising its error. The lab's own notes say to expect this. A learner who didn't know that would stop and debug code that hasn't been written yet.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next lab step: a blank build log.",
          code: `Lab:         (chapter and step number)
Prediction:  (how many tests fail, and why)

Run 1, before any code:
Result:      (right or wrong)
Rule:        (what the wrong prediction taught you)

Code written:
Run 2:
Next:`,
        },
        {
          kind: "p",
          text: "A passing test shows the code works. It doesn't show that Sam could tell a colleague why. The next section tests that.",
        },
      ],
    },
    {
      id: "teach-back",
      title: "Explaining a concept from memory shows you what you only recognise",
      goal: "How do you find the gaps that a passing test leaves?",
      blocks: [
        {
          kind: "p",
          text: "The **Feynman technique** means picking a concept and explaining it in simple words, with no notes, to someone new. The name honours the physicist Richard Feynman, who was known for plain explanations. The steps were set out later by other writers. Wherever you stall, you have found a gap.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Pick one concept and say what it is in plain words, with no notes.",
            "Notice every stall, every borrowed jargon term and every hand wave.",
            "Go back to the source for exactly those gaps.",
            "Explain it again, shorter and with a concrete example.",
          ],
        },
        {
          kind: "p",
          text: "Michelene Chi and colleagues found in 1989 that students who explained worked examples to themselves tended to learn more than those who only read them. Explaining is retrieval with a built-in audit, because a stall can't hide behind a nod.",
        },
        {
          kind: "p",
          text: "Sam picks the idea from the chunking chapter that matters most, the trade made by chunk size. Sam records ninety seconds aloud, types it up, and marks each stall in square brackets. Then Sam goes back to the page for those gaps only and tries again the next day.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "Sam's teach-back on chunk size, both attempts, complete.",
          code: `Concept:   why chunk size is a trade-off
Audience:  a colleague who has never built a search system

Attempt 1, no notes:
"You split documents into chunks so search can find the right bit. If chunks are
small you get better precision. If they're big you get [stall: better what?] more
context, I think. The vector sort of [hand wave] captures the semantics [borrowed
term], so a big chunk's vector is blurrier. You want to pick a good size, [stall]
usually a few hundred tokens."

Marked:
  1. "better what?"          I could not name what a big chunk gains.
  2. "sort of"               I hedged at the key point.
  3. "captures the semantics"  I could not say what this means.
  4. "pick a good size"      I had no way to choose.

Back to the source, for those four only:
  A vector stands for one passage's meaning. A chunk with many topics gets a vector between them.
  Small chunks are precise and lose context. Large chunks keep context and match weakly.
  The way to choose is a golden set: questions with known answers, tested at each size.

Attempt 2, next day, no notes:
"A chunk is the most the model can learn from one search hit. A small chunk matches a
question closely, but it may lack the surrounding sentences the answer needs. A big
chunk has that context, but it holds several topics, and its one vector lands between
them, so a specific question matches it weakly. No size is right everywhere. So take
a list of real questions with known answers, try a few sizes, and keep the one that
finds the answers most often."

Stalls in attempt 2:  0`,
        },
        {
          kind: "p",
          text: "Compare the two attempts. The first used correct vocabulary and hid four holes, and only speaking aloud exposed them. The phrase about semantics is the classic sign, a sentence that sounds right and can't be unpacked.",
        },
        {
          kind: "p",
          text: "The second attempt has no jargon the colleague would need explained, and it ends in a method. It is also about the same length as the first. A good teach-back replaces vague words with mechanisms, and it doesn't need to run longer to do so.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "For your next concept: a blank teach-back record.",
          code: `Concept:   (one idea, small enough for ninety seconds)
Audience:  (someone who has not read this)

Attempt 1, no notes:
Marked:    (each stall, hedge and borrowed term, with what you could not say)

Back to the source, for those only:

Attempt 2, next day, no notes:
Stalls in attempt 2:`,
        },
        {
          kind: "widget",
          id: "learn-teach-back",
          intro: "Pick a concept from this course and explain it to an imaginary colleague in about ninety seconds, aloud if you can. Then grade yourself honestly against the parts a good explanation covers. Count your stalls, because they are the useful result.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "An interview is a teach-back with a stopwatch",
          text: "This method carries straight into technical interviews. The interviewer asks you to explain, and then pushes on the weak spot you just left. Doing teach-backs alone is the cheapest rehearsal for that. Chapter four shows the app's question bank, which adds a grader that pushes back.",
        },
        {
          kind: "quiz",
          id: "learn-03-q2",
          question: "During a teach-back on a later course, you say that an embedding captures the semantics. You cannot say what that means. What do you do?",
          options: [
            "Carry on, since the sentence sounded right",
            "Mark it as a stall, go to the source for that gap, and explain it again",
            "Memorise the sentence word for word",
            "Skip the concept until the lab",
          ],
          answer: 1,
          explain: "A borrowed phrase you cannot unpack is the classic signal of recognition without understanding. That stall is exactly where to spend your next ten minutes.",
        },
        {
          kind: "p",
          text: "Sam now has five papers on one chapter: a prediction sheet, a recall sheet, a deck that runs itself, a build log and a teach-back. Done by hand for every chapter, that would soon stop. So how do you make it routine? Chapter four answers that.",
        },
      ],
    },
  ],
  recap: [
    "A test-first lab step gives you a prediction, a failure and a pass that you can't talk your way through.",
    "Deliberate practice needs a well-defined task at the right difficulty, informative feedback and chances to repeat and correct errors.",
    "A build log records each prediction, so a wrong one becomes a rule.",
    "A teach-back with no notes shows exactly where you stall, and the stalls tell you what to study.",
  ],
  reinforcement:
    "I am learning to build AI systems well. In building and teaching back I learned that I know something when I can build it test-first and explain it from memory. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
};

export default chapter;
