import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "rag-09-evaluation",
  course: "rag",
  number: 9,
  title: "Evaluation",
  tagline: "How do you know whether AskPEP is good, and which stage to fix when it is not?",
  minutes: 45,
  objectives: [
    "Build a golden set that labels documents, survives re-chunking and tests refusal.",
    "Compute recall, precision and hit rate at k, MRR and nDCG by hand, and say which question each answers.",
    "Score an answer for faithfulness, answer relevance and context quality, and tell them apart from correctness.",
    "Grade claims with an LLM judge, and control its position, verbosity and self-preference biases.",
    "Read failed answers, find the first stage that broke, and fix the biggest bucket first.",
    "Say why AskPEP evaluates with pytest and a small harness, and when a tool such as Ragas fits better.",
    "Build AskPEP's evaluation file, and make it pass its tests.",
  ],
  sections: [
    {
      id: "s1-golden",
      title: "A small golden set you trust beats five hundred questions you never read",
      goal: "What do you measure AskPEP against?",
      blocks: [
        {
          kind: "p",
          text: "Every section of this chapter answers part of one question. How do you know whether AskPEP is good, and which stage to fix when it is not? Chapter eight's checks judge one answer at a time, so they cannot tell you.",
        },
        {
          kind: "p",
          text: "You need fixed questions first. Chapter three called this a golden set, a list of questions with known good answers that every change is tested against. Without one, every change to chunk size, embedding model or prompt is a guess.",
        },
        {
          kind: "p",
          text: "Each record in AskPEP's set holds a question, the PEPs that answer it, and a flag for whether the PEPs can answer it. A **relevant document** is one the record lists for its question. How to merge two dictionaries lists PEP 584.",
        },
        {
          kind: "p",
          text: "Some sets also store a **reference answer**, a good answer written by a person. Section three uses it. AskPEP's set leaves it out.",
        },
        {
          kind: "p",
          text: "Label documents, not chunks. Chunk ids change every time you change the chunker, and then every label is stale. A document id survives re-chunking, so one set can compare chunk sizes fairly.",
        },
        {
          kind: "p",
          text: "Include questions the PEPs cannot answer, such as who maintains pip, Python's package installer. They test chapter eight's refusal. They have no relevant document, so they stay out of the retrieval metrics and test the answer instead.",
        },
        {
          kind: "list",
          items: [
            "Real user questions from logs are the best source, once you have users.",
            "Subject experts write the hard questions that users have not asked yet.",
            "A model can draft questions from chunks quickly, but they echo the chunk's wording and run easy. Read every one, and delete the weak ones.",
          ],
        },
        {
          kind: "p",
          text: "Then split the set. Tune on most of it, the **dev split**. Hold back about a quarter as the **held-out split**, and never tune against it. Otherwise you **overfit**, which means your settings fit these questions better than real ones.",
        },
        {
          kind: "quiz",
          id: "rag-09-q1",
          question: "Why does AskPEP's golden set label relevant documents instead of chunk ids?",
          options: [
            "Documents are shorter.",
            "Chunk ids change when you re-chunk, which would invalidate the labels. Document ids survive.",
            "The vector store only stores document ids.",
            "Chunk labels cannot be scored.",
          ],
          answer: 1,
          explain: "Evaluation should let you change the chunker freely. Document-level labels keep the test fixed while the thing under test changes.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "A set this small finds bugs, but it cannot settle close calls",
          text: "With about twenty questions, one question moves any metric by about five points. Use a small set to find bugs and to compare big differences. Never claim a two-point gain from it. For decisions that matter, grow the set, and read which questions changed, not only the average.",
        },
        {
          kind: "p",
          text: "With the questions fixed, the next section scores the retriever against them.",
        },
      ],
    },
    {
      id: "s2-retrieval-metrics",
      title: "Recall, MRR and nDCG each answer a different question about the ranking",
      goal: "How do you score the retriever, and which metric suits which stage?",
      blocks: [
        {
          kind: "p",
          text: "Retrieval comes first, because the model cannot use evidence it never sees. Each metric below scores the top k results for one question, then averages over the golden set.",
        },
        {
          kind: "p",
          text: "**Recall at k** is the share of a question's relevant documents that appear in the top k. It asks whether the evidence reached the candidates at all. It is the metric for the first search, because a reranker cannot rescue a document that is missing.",
        },
        {
          kind: "p",
          text: "Chapter three measured recall at k with one right chunk per question. There it equals the share of questions answered in the top k. That share has its own name, **hit rate at k**: the share of questions with at least one relevant document in the top k. It equals recall when every question has one relevant document. A question that needs two PEPs pulls them apart.",
        },
        {
          kind: "p",
          text: "**Precision at k** is the share of the top k that is relevant. It asks how much noise reaches the prompt.",
        },
        {
          kind: "p",
          text: "Chapter seven's MRR, or mean reciprocal rank, takes the rank of the first relevant document for each question, inverts it and averages. That one-over-rank value is the **reciprocal rank**. Rank one scores 1, rank two scores one half, and rank four one quarter. MRR rewards getting one good document to the top.",
        },
        {
          kind: "p",
          text: "**nDCG**, short for normalised discounted cumulative gain, credits every relevant document and discounts each by its rank. It then divides by the score of the **ideal ranking**, with every relevant document on top, so the result runs from 0 to 1. Use it when several documents matter and their order matters.",
        },
        {
          kind: "code",
          lang: "text",
          code: "relevant = {A, B}   ranking = X, A, Y, B\n\nrecall@2     = 1/2 = 0.50      (A found, B not yet)\nrecall@4     = 2/2 = 1.00\nprecision@4  = 2/4 = 0.50\nhit@2        = 1\nRR           = 1/2 = 0.50      (first relevant at rank 2)\nDCG@4        = 1/log2(3) + 1/log2(5) = 0.631 + 0.431 = 1.062\nIDCG@4       = 1/log2(2) + 1/log2(3) = 1.000 + 0.631 = 1.631\nnDCG@4       = 1.062 / 1.631 = 0.65",
          caption: "One ranking, five metrics. The discount for rank r is one over log base 2 of r plus 1.",
        },
        {
          kind: "compare",
          caption: "Which metric answers which question.",
          columns: ["Metric", "It asks", "It ignores", "Use it for"],
          rows: [
            ["Recall at k", "Is the evidence among the candidates?", "Order inside the top k", "The first search"],
            ["Precision at k", "How much noise reaches the prompt?", "Whether every relevant document was found", "The final context"],
            ["Hit rate at k", "Did any relevant document appear?", "Whether all of them appeared", "Questions with one answer"],
            ["MRR", "How high is the first relevant document?", "Everything after it", "Rerankers and single-answer lookups"],
            ["nDCG at k", "Are all relevant documents high up?", "Partial relevance, without graded labels", "Ranking several documents"],
          ],
        },
        {
          kind: "widget",
          id: "c09-metrics-lab",
          intro: "A ranked list of eight PEPs answers one question: how to add type hints to a decorator, a function that wraps another function. Two of the PEPs are relevant. First predict the reciprocal rank. Then reorder the list to meet the challenge, and watch which bars move when one relevant document climbs a place.",
        },
        {
          kind: "quiz",
          id: "rag-09-q2",
          question: "A reranker leaves recall at 50 unchanged but improves MRR. What happened?",
          options: [
            "Nothing, because recall did not change.",
            "The same documents are in the list, but the first relevant one now sits higher.",
            "The reranker found new documents.",
            "The embeddings improved.",
          ],
          answer: 1,
          explain: "A reranker reorders the same candidates. Recall at the fetch size cannot change, and rank-sensitive metrics like MRR can.",
        },
        {
          kind: "quiz",
          id: "rag-09-q3",
          question: "Two questions have their first relevant document at ranks 1 and 4. What is the MRR?",
          options: ["0.25", "0.5", "0.625", "2.5"],
          answer: 2,
          explain: "The reciprocal ranks are 1 and 0.25. Their mean is 0.625.",
        },
        {
          kind: "fold",
          tone: "hood",
          title: "Graded relevance in nDCG",
          text: "AskPEP treats relevance as yes or no. nDCG also supports grades, such as 3 for a perfect source, 1 for related and 0 for irrelevant. The gain becomes the grade, or two to the power of the grade minus one in a common variant. Graded labels cost more. Use them when documents are partly relevant and the difference matters.",
        },
        {
          kind: "p",
          text: "Interviewers often ask how you would evaluate a retriever.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Metrics in interviews",
          text: "Expect: how would you evaluate a retriever? Answer with the golden set, document-level labels, recall at k for the first search and MRR or nDCG for the final ranking. Then say how you would check the labels. Interviewers listen for whether you know that recall caps what a reranker can achieve.",
        },
        {
          kind: "p",
          text: "Good retrieval is not yet a good answer. The next section scores the answer itself.",
        },
      ],
    },
    {
      id: "s3-generation-metrics",
      title: "Good retrieval can still produce a bad answer, so generation needs its own metrics",
      goal: "How do you score the answer itself, apart from retrieval?",
      blocks: [
        {
          kind: "p",
          text: "Chapter eight previewed **faithfulness**. It asks whether every claim in the answer is supported by the sources. It is the metric for chapter one's grounded answer. It does not ask whether a claim is true in the world. An answer can be true and unfaithful, as chapter eight's citation checker showed.",
        },
        {
          kind: "p",
          text: "**Answer relevance** asks whether the answer addresses the question that was asked. A faithful answer about PEP 8 indentation is useless for a question on line length. The two metrics are independent, so you need both.",
        },
        {
          kind: "p",
          text: "Two more metrics judge what retrieval handed over. **Context precision** asks how much of the context was useful, and whether the useful sources came first. **Context recall** asks whether the context held everything the reference answer needs. The Ragas library popularised these names, and a model usually does the grading.",
        },
        {
          kind: "p",
          text: "**Correctness** compares the answer with the reference answer. It is a separate check, because an answer can be faithful to a wrong document.",
        },
        {
          kind: "list",
          items: [
            "Faithfulness low and context good: the model ignored or embellished the sources. Fix the prompt, the model or the temperature.",
            "Context recall low: the evidence never arrived. Fix retrieval, chunking or query transformation.",
            "Answer relevance low: the model answered a different question. Check query handling and the prompt.",
            "Every metric high but the answer wrong: the document is wrong, or the index missed an update. Fix the source or the indexing, because no retrieval or prompt change will help.",
          ],
        },
        {
          kind: "p",
          text: "So run two kinds of test. A **component evaluation** scores one stage alone, such as retrieval against the golden set. An **end-to-end evaluation** scores the final answer. Component tests locate a bug. End-to-end tests detect that one exists.",
        },
        {
          kind: "quiz",
          id: "rag-09-q4",
          question: "An answer states a correct fact that appears in none of its sources. How does faithfulness score it?",
          options: [
            "High, because the fact is correct.",
            "Low, because the claim is not supported by the sources.",
            "Not applicable.",
            "High, as long as it is relevant.",
          ],
          answer: 1,
          explain: "Faithfulness measures support from the sources. A correct claim from memory is exactly what a grounded system should not produce, because you cannot audit it.",
        },
        {
          kind: "p",
          text: "Faithfulness needs someone to read every claim against its sources. Across a thousand answers that someone is a model, and the next section asks when to trust it.",
        },
      ],
    },
    {
      id: "s4-judge",
      title: "An LLM judge is a noisy instrument, so calibrate it before you trust it",
      goal: "Can a model grade the answers, and when can you trust its grades?",
      blocks: [
        {
          kind: "p",
          text: "Chapter eight called a model that grades answers a judge. Using one at scale is called **LLM-as-judge**. The judge grades another model's output against a **rubric**, the written grading rules. It scales, but it is biased in known ways, and an unchecked judge gives confident wrong numbers.",
        },
        {
          kind: "p",
          text: "Zheng and colleagues measured three biases in 2023. **Position bias** prefers an answer for where it appears, often first. **Verbosity bias** prefers longer answers. **Self-preference bias** prefers answers the judge model wrote itself. Their paper called it self-enhancement bias.",
        },
        {
          kind: "compare",
          caption: "Four ways a judge goes wrong, and the fix for each.",
          columns: ["Problem", "Symptom", "Fix"],
          rows: [
            ["Position bias", "Swapping the order of two answers flips the verdict", "Run both orders and count only agreements"],
            ["Verbosity bias", "Longer answers score higher with no extra facts", "Grade claim by claim, and give length no credit"],
            ["Self-preference bias", "The judge rates its own answers higher", "Judge with a model from a different family"],
            ["Vague rubric", "Scores cluster at 4 out of 5 for everything", "Use yes or no checks with a fixed output format"],
          ],
        },
        {
          kind: "p",
          text: "The best defence is a smaller job. Do not ask for a score out of ten for the whole answer. Split the answer into claims, chapter eight's single statements. For each claim, ask one yes or no question: do these sources support it? Narrow questions are harder to game and easier to audit.",
        },
        {
          kind: "p",
          text: "If the judge's reply cannot be read, count the claim as unsupported. That rule is called **failing closed**, and it stops a broken judge from raising your score.",
        },
        {
          kind: "code",
          lang: "python",
          code: "# One claim, one judgement, fixed JSON out\n# numbered holds the sources as [1], [2] lines. claim is one sentence of the answer.\nprompt = (\n    f\"Sources:\\n{numbered}\\n\\nClaim: {claim}\\n\\n\"\n    \"Is the claim fully supported by the sources? \"\n    'Reply with JSON only: {\"supported\": true or false, \"reason\": \"one sentence\"}'\n)\n\n# If the reply does not parse, count the claim as unsupported (fail closed).",
          caption: "A claim-level faithfulness check. Unparseable output fails closed, so a broken judge never inflates your score.",
        },
        {
          kind: "p",
          text: "Then **calibrate** the judge, which means comparing its verdicts with a person's. Label about thirty outputs by hand, run the judge on the same ones, and measure how often you agree. If it disagrees with you on one in four, do not use it to claim small gains. Check again whenever you change the judge model or the rubric.",
        },
        {
          kind: "quiz",
          id: "rag-09-q5",
          question: "Your judge scores long answers higher even when they add no facts. What is the best fix?",
          options: [
            "Ask the answerer for longer outputs.",
            "Grade claim by claim against the sources, so length cannot earn points.",
            "Increase the judge's temperature.",
            "Use the same model as the answerer.",
          ],
          answer: 1,
          explain: "Claim-level yes or no checks leave no room for length to matter. Using the same model would add self-preference bias on top.",
        },
        {
          kind: "fold",
          tone: "hood",
          title: "Measuring judge agreement",
          text: "Raw agreement flatters a judge when most labels are the same class, because chance alone produces matches. Cohen's kappa corrects for that. It compares observed agreement with the agreement you would expect by chance. Compute it on your hand-labelled sample and report it next to any judge-based number you publish internally.",
        },
        {
          kind: "p",
          text: "Interviewers often ask how you know your judge is right.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Judge questions",
          text: "A common question is: how do you know your LLM judge is right? Name the three biases. Say you swap positions, judge claim by claim, use a different model family and calibrate against human labels. Admit it stays noisy, and say you track agreement over time.",
        },
        {
          kind: "p",
          text: "The retrieval metrics and a calibrated judge tell you how good AskPEP is. They do not yet tell you what to fix, and the next section does.",
        },
      ],
    },
    {
      id: "s5-error-analysis",
      title: "Error analysis beats dashboards: read the failures, bucket them, fix the biggest bucket",
      goal: "Which stage do you fix first?",
      blocks: [
        {
          kind: "p",
          text: "An average tells you that you have a problem, never which one. **Error analysis** is the habit of reading failed examples, giving each a cause and counting the causes. A group of failures with one cause is a **bucket**. Fifty failures sorted into five buckets give you a priority list that no dashboard will.",
        },
        {
          kind: "p",
          text: "Sort each failure by its **first failing stage**, the earliest stage whose output was wrong. Was the relevant document retrieved at all? If so, did it rank high enough to reach the prompt? If so, was the answer faithful to it? The first no names the bucket. Later stages can look guilty too, because they inherit the damage.",
        },
        {
          kind: "p",
          text: "The evidence comes from a trace, the record of one request's path through the system. It shows what each stage received and returned. Chapter ten builds tracing.",
        },
        {
          kind: "widget",
          id: "c09-failure-triage",
          intro: "Six failed AskPEP questions arrive with the evidence a log review would show. Sort each into the stage that broke first. Watch for cases where retrieval worked and the model did not. One case should have been a refusal.",
        },
        {
          kind: "widget",
          id: "rag-first-failing-stage",
          intro: "Six wrong answers come with a full trace, stage by stage. Five come from an invented software company's help pages and contracts, and one from PEP 8. Click the first stage that broke, not the one that looks worst. Notice how often the answer is faithful to bad evidence.",
        },
        {
          kind: "list",
          items: [
            "Tune on the dev split, and report on the held-out split.",
            "Run the evaluation in **continuous integration**, or CI, the checks that run on every change. Fail the build on a **regression**, a metric that drops below its last good value.",
            "Add the questions users mark as wrong in production to the golden set. That is how the set stays alive.",
            "Never average away a bucket. A hit rate of 90 percent can hide that every unanswerable question gets a confident answer.",
          ],
        },
        {
          kind: "quiz",
          id: "rag-09-q6",
          question: "Faithfulness is high and recall at 5 is high, but users say answers are wrong. What should you check next?",
          options: [
            "Chunk overlap.",
            "Whether the source documents themselves are stale, wrong or contradictory.",
            "The reranker.",
            "The token budget.",
          ],
          answer: 1,
          explain: "If the system faithfully reports what the retrieved sources say, and the sources are good matches, the fault may be in the corpus. No pipeline setting corrects a wrong document.",
        },
        {
          kind: "callout",
          tone: "insight",
          title: "Evaluate before you optimise",
          text: "This course builds the **harness**, the code that runs the golden set and computes the metrics, before the cleverness. With a harness, should we add HyDE becomes an experiment with a result. Without one it is an argument.",
        },
        {
          kind: "p",
          text: "You now know what to measure and how to read the failures. The next section asks which tool should run the measuring.",
        },
      ],
    },
    {
      id: "s-alternatives",
      title: "A pytest harness is the default until you need dashboards, large judge runs or shared tooling",
      goal: "Which tool should run AskPEP's evaluation?",
      blocks: [
        {
          kind: "p",
          text: "AskPEP evaluates with pytest and a small hand-written harness over the golden set. It computes this chapter's retrieval metrics and fails the build when they drop. That is enough to learn what the numbers mean, and it runs in CI.",
        },
        {
          kind: "p",
          text: "Ragas packages RAG metrics such as faithfulness, answer relevance and the two context metrics, many of them graded by a model. DeepEval gives you pytest-style tests with a library of metrics. TruLens checks context relevance, groundedness and answer relevance together, which it calls the **RAG triad**. Its checks are called **feedback functions**.",
        },
        {
          kind: "p",
          text: "promptfoo is a command-line tool driven by a configuration file. It compares prompts and models side by side, and it runs well in CI. Arize Phoenix pairs evaluation with tracing, so you can open the failing request in the same place.",
        },
        {
          kind: "p",
          text: "Every judge-based metric inherits section four's biases, and no tool calibrates the judge for you. Check a sample of verdicts by hand. The capstone in chapters twelve to fourteen keeps the pytest harness. Chapter eleven teaches how to choose a stack.",
        },
        {
          kind: "compare",
          caption: "Six ways to run the evaluation. Every one still needs your golden set.",
          columns: ["Tool", "Good at", "Choose it when", "Cost"],
          rows: [
            ["A pytest harness", "Full control and cheap build gates", "You want to own every metric", "You maintain every metric"],
            ["Ragas", "Ready-made RAG metrics", "You want the standard names quickly", "Judge calls, and definitions that change between versions"],
            ["DeepEval", "Unit-test-style evals with many metrics", "Your team thinks in tests", "Judge calls add cost and flakiness"],
            ["promptfoo", "Config-driven comparisons of prompts and models", "You compare variants often", "Little depth on retrieval metrics"],
            ["TruLens", "Feedback functions for the RAG triad", "You want a triad dashboard", "Another tool to run and learn"],
            ["Arize Phoenix", "Evals joined to traces", "You want a bad score's trace", "A service to run or pay for"],
          ],
        },
        {
          kind: "quiz",
          id: "rag-09-alt-q1",
          question: "A team adopts a library with model-graded faithfulness. What should they still do?",
          options: [
            "Nothing, the score is objective.",
            "Compare a sample of judge verdicts against human labels to calibrate the judge.",
            "Remove the golden set.",
            "Switch off retrieval metrics.",
          ],
          answer: 1,
          explain: "Judges are biased and noisy. A sample of human-labelled cases tells you whether the number can be trusted.",
        },
        {
          kind: "fold",
          tone: "industry",
          title: "Golden sets outlive tools",
          text: "Tools come and go, and a good golden set moves between them. Keep your questions and relevant documents in plain files, so changing the harness never costs you the data.",
        },
        {
          kind: "p",
          text: "The last section maps this chapter onto AskPEP's own evaluation file.",
        },
      ],
    },
    {
      id: "s7-askpep-evals",
      title: "AskPEP scores itself in one file, with the judge passed in",
      goal: "How is AskPEP's evaluation code laid out, and how do you build it?",
      blocks: [
        {
          kind: "p",
          text: "This chapter's ideas become one AskPEP file, `evals.py`, plus the golden set in `evals/golden.jsonl`.",
        },
        {
          kind: "list",
          items: [
            "`load_golden` reads section one's golden set. `ranked_doc_ids` collapses chunks into documents, and each document takes the rank of its best chunk.",
            "`recall_at_k`, `precision_at_k`, `hit_at_k`, `reciprocal_rank` and `ndcg_at_k` are section two's metrics. `evaluate_retriever` averages them over the golden set.",
            "`split_claims`, `parse_verdict` and `check_faithfulness` are section four's claim-level judge. `llm_judge` wraps chapter eight's `LLM` as a judge.",
            "`run_eval` ships complete, because the `askpep eval` command calls it in chapter fourteen. Its judge is a Claude model, the answerer's own family, so check a sample of its verdicts by hand.",
          ],
        },
        {
          kind: "p",
          text: "A `Judge` is a plain function from prompt to text, so the tests pass a fake and cost nothing. Only the last lab step calls Voyage. It runs dense, sparse, hybrid and reranked search with your own code, so finish the labs of chapters two to seven first.",
        },
        {
          kind: "p",
          text: "You can now measure AskPEP on about twenty fixed questions, on your own machine. Real users will ask thousands of new ones while the PEPs change underneath. Chapter ten takes AskPEP from this harness to production.",
        },
      ],
    },
  ],
  lab: {
    title: "Score the retriever and check faithfulness",
    goal: "Write `src/askpep/evals.py`: retrieval metrics over a golden set, and a claim-level faithfulness check with a judge that you pass in. Each unfinished function raises `NotImplementedError(\"rag-09 step N\")`. In each test command, `-k` runs only the tests whose names contain that text. Run pytest from the project root, because the golden set lives at `evals/golden.jsonl`. Step 6 is optional. It needs `VOYAGE_API_KEY` in `.env`, and it runs your code from the labs of chapters two to seven.",
    minutes: 45,
    files: ["src/askpep/evals.py", "evals/golden.jsonl", "tests/rag/test_evals.py"],
    steps: [
      {
        title: "Read the golden set",
        text: "`evals/golden.jsonl` ships in your workspace, one JSON record per line. Each has an `id`, a `question`, `expected_docs` and `answerable`. The `expected_docs` field holds the relevant documents as PEP numbers, such as 8 for PEP 8. It is empty when the PEPs cannot answer. The stub of `load_golden(path)` raises `rag-09 step 1`. Make it return one `GoldenItem` per line and skip blank lines. `GoldenItem` is already in your stub.",
        code: `# src/askpep/evals.py
from dataclasses import dataclass, field
from pathlib import Path

GOLDEN = Path("evals/golden.jsonl")


# A frozen dataclass is a class declared by its typed fields. It cannot change after creation.
@dataclass(frozen=True)
class GoldenItem:
    id: str
    question: str
    expected_docs: list[int] = field(default_factory=list)
    answerable: bool = True


def load_golden(path: Path = GOLDEN) -> list[GoldenItem]:
    # The test checks: at least 18 records, unique ids, answerable == bool(expected_docs),
    # at least one unanswerable record, and every doc id is in PEP_IDS, the 18 PEP numbers from chapter 2.
    # your turn: read one JSON record per line, skip blank lines, build a GoldenItem for each
    ...`,
        test: "uv run pytest tests/rag/test_evals.py -k ch09_s1",
      },
      {
        title: "Collapse chunks to documents",
        text: "Retrieval returns chunks, and the golden set labels documents. Write `ranked_doc_ids(hits)`, which returns the `doc_id` of each hit's chunk once, in order of first appearance. A document then takes the rank of its best chunk. Its stub raises `rag-09 step 2`.",
        test: "uv run pytest tests/rag/test_evals.py -k ch09_s2",
      },
      {
        title: "Write the metrics",
        text: "Write `recall_at_k`, `precision_at_k`, `hit_at_k`, `reciprocal_rank` and `ndcg_at_k`. Each is a pure function, which computes only from its arguments. Each takes a ranked list of document numbers and the expected list of relevant ones. All five stubs raise `rag-09 step 3`. Use yes or no relevance and a log base 2 discount. Work the chapter example by hand first and compare. The code comments say what each returns.",
        code: `# src/askpep/evals.py
# recall_at_k(ranked, expected, k): share of expected docs in the top k, and 0 when expected is empty
# precision_at_k(ranked, expected, k): share of the top k that is expected
# hit_at_k(ranked, expected, k): 1 when any expected doc is in the top k, else 0
# reciprocal_rank(ranked, expected): 1 / rank of the first expected doc, and 0 when none appears


def ndcg_at_k(ranked: list[int], expected: list[int], k: int) -> float:
    # your turn: import math, then
    # 1. DCG: sum 1 / log2(rank + 1) for each expected doc in the top k, counting ranks from 1
    # 2. IDCG: the same sum for the best possible ordering
    # 3. return DCG / IDCG, or 0.0 when IDCG is 0
    # The test wants 1 for the ideal order and less when an expected doc sits lower.
    ...`,
        test: "uv run pytest tests/rag/test_evals.py -k ch09_s3",
      },
      {
        title: "Evaluate a retriever",
        text: "Write `evaluate_retriever`, which raises `rag-09 step 4`. It takes the golden items, a `retrieve` function from a question and a count to hits, and the cut-offs `ks`. Count and skip unanswerable items. Fetch three times the largest k in chunks, since chunks collapse into documents. Return a `RetrievalReport`, already in your stub, with one result per scored question. Averages over no questions are 0.0.",
        test: "uv run pytest tests/rag/test_evals.py -k ch09_s4",
      },
      {
        title: "Faithfulness with an injected judge",
        text: "Write `split_claims`, `parse_verdict`, `check_faithfulness(answer, sources, judge)` and `llm_judge(llm)`, which raise `rag-09 step 5`. `split_claims` treats each sentence as a claim. A `Judge` is a function from prompt to text, so tests pass a fake. Ask it one question per claim, with numbered sources, and require JSON. `parse_verdict` fails closed: an unparsable reply counts as unsupported. The score is the supported share, or 0 for no claims. `llm_judge` joins the text pieces of chapter eight's `llm.stream` and ignores the final `Usage`.",
        test: "uv run pytest tests/rag/test_evals.py -k ch09_s5",
      },
      {
        title: "Run the ablation",
        text: "An ablation changes one stage at a time. The test compares dense, sparse, hybrid and hybrid plus rerank over the whole corpus. It prints recall at 5, hit rate at 5 and MRR for each. `-m live` selects the tests that call a paid API, and `-s` lets the table print. It needs `VOYAGE_API_KEY` in your `.env` and the PEPs in `data/raw`, and it caches the store in `data/store.json`. Then read the three worst questions and bucket each by its first failing stage.",
        test: "uv run pytest tests/rag/test_evals.py -m live -k ch09_s6 -s",
      },
    ],
    verify: "uv run pytest tests/rag/test_evals.py",
  },
  recap: [
    "A golden set labels relevant documents, not chunks, includes unanswerable questions and keeps a held-out split.",
    "Recall at k asks whether the evidence reached the candidates. MRR and nDCG ask how high the relevant documents sit.",
    "Faithfulness checks support from the sources, and answer relevance checks the question was addressed. Correctness against a reference answer is a separate check.",
    "Position, verbosity and self-preference bias make an LLM judge noisy. Grade claim by claim, fail closed and calibrate against human labels.",
    "Error analysis buckets failures by their first failing stage, and the biggest bucket sets your next week.",
    "A pytest harness is enough until you need dashboards or shared tooling, and no tool calibrates the judge for you.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In RAG evaluation I learned that retrieval and generation must be measured separately on a golden set. I also learned that an LLM judge is a biased instrument to calibrate against human labels. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["rag-q22", "rag-q23", "rag-q24", "rag-q25", "rag-q26", "rag-q46"],
};

export default chapter;
