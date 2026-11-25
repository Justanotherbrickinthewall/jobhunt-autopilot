import type { Chapter } from "../types";

const chapter: Chapter = {
  "id": "rag-14-capstone-ship",
  "course": "rag",
  "number": 14,
  "title": "Capstone part 3: evals, traces and shipping",
  "tagline": "How do you prove AskPEP stays good as it changes, and ship it where others can use it?",
  "minutes": 90,
  "objectives": [
    "Wire the eval harness to an exit code, and prove the gate fails when a score drops.",
    "Run lint, tests and a conditional eval gate in GitHub Actions, and spot a gate that skipped.",
    "Read the traces table to find slow stages, rising refusals and the most retrieved chunks.",
    "Rebuild the same retrieval in LlamaIndex, score it on the golden set, and say what you gained and lost.",
    "Deploy AskPEP to Cloud Run with Cloud SQL, check it live, and name the steps nobody verified."
  ],
  "sections": [
    {
      "id": "s1-golden-gate",
      "title": "A golden set and a pass-fail gate turn retrieval quality into a build failure",
      "goal": "How do you turn retrieval quality into an exit code that can fail a build?",
      "blocks": [
        {
          "kind": "p",
          "text": "Part 2 ended with AskPEP working end to end on your machine. Two things were missing: proof that it stays good, and a place to run it. This chapter answers one question. How do you prove AskPEP stays good as it changes, and ship it where others can use it?"
        },
        {
          "kind": "p",
          "text": "The golden set ties the five sections together. Section one turns it into a gate, and section two runs that gate on every change. Section three reads the traces, which show what the gate cannot. Section four uses the golden set to judge a framework against your code. Section five deploys the service to Google Cloud."
        },
        {
          "kind": "p",
          "text": "In chapter 9 you wrote the metric functions in the lab, and the starter shipped a golden set. This section makes them decide whether a change can merge. A **gate** is a check that exits non-zero when a score drops under a threshold. Continuous integration treats that exit code as a failed build."
        },
        {
          "kind": "p",
          "text": "The capstone golden set has 22 questions. Twenty have known source PEPs. Two cannot be answered from the corpus, one about the capital of France and one about a PEP that is not in the set. They test refusal, as chapter 9 advised. Labels are PEP numbers, not chunk ids, so you can change the chunker freely."
        },
        {
          "kind": "step",
          "id": "c14-s01",
          "title": "The golden set is twenty-two questions with PEP labels",
          "text": "The starter ships this file, so compare yours with it. Each line is one question, with its PEP numbers in expected_docs. An empty list marks a question the corpus cannot answer, and so does the answerable flag. The loader from chapter 9 reads both fields. The questions use only facts from those PEPs. Add questions as you find failures.",
          "file": "evals/golden.jsonl",
          "lang": "json",
          "code": `{"id": "q01", "question": "What is the maximum line length PEP 8 recommends for code?", "expected_docs": [8], "answerable": true}
{"id": "q02", "question": "How many spaces per indentation level does the Python style guide recommend?", "expected_docs": [8], "answerable": true}
{"id": "q03", "question": "Which Zen of Python aphorism says explicit is better than implicit?", "expected_docs": [20], "answerable": true}
{"id": "q04", "question": "How should the summary line of a multi-line docstring be written?", "expected_docs": [257], "answerable": true}
{"id": "q05", "question": "What do __enter__ and __exit__ do in the with statement protocol?", "expected_docs": [343], "answerable": true}
{"id": "q06", "question": "Which module holds the standard typing constructs like Any and Union for type hints?", "expected_docs": [484], "answerable": true}
{"id": "q07", "question": "What are f-strings and how do you write one?", "expected_docs": [498], "answerable": true}
{"id": "q08", "question": "What is the syntax for annotating a variable with a type?", "expected_docs": [526], "answerable": true}
{"id": "q09", "question": "Which operator does the assignment expression proposal add?", "expected_docs": [572], "answerable": true}
{"id": "q10", "question": "Which operators does the dict merge proposal add to dict?", "expected_docs": [584], "answerable": true}
{"id": "q11", "question": "How do you write a union of two types with the vertical bar operator?", "expected_docs": [604], "answerable": true}
{"id": "q12", "question": "What problem does ParamSpec solve for decorators?", "expected_docs": [612], "answerable": true}
{"id": "q13", "question": "What is the specification of the match statement and its case patterns?", "expected_docs": [634, 636], "answerable": true}
{"id": "q14", "question": "How does the tutorial explain matching on a class pattern?", "expected_docs": [636], "answerable": true}
{"id": "q15", "question": "How do you declare a generic class without calling TypeVar, and what does the type statement do?", "expected_docs": [695], "answerable": true}
{"id": "q16", "question": "What does the proposal change about the grammar of f-strings?", "expected_docs": [701, 498], "answerable": true}
{"id": "q17", "question": "How would making the global interpreter lock optional work, and what is biased reference counting?", "expected_docs": [703], "answerable": true}
{"id": "q18", "question": "How is inline script metadata declared at the top of a single-file script?", "expected_docs": [723], "answerable": true}
{"id": "q19", "question": "What are the types of PEP and what does a PEP champion do?", "expected_docs": [1], "answerable": true}
{"id": "q20", "question": "Which dunder methods does the dict update operator call?", "expected_docs": [584], "answerable": true}
{"id": "q21", "question": "What is the capital of France?", "expected_docs": [], "answerable": false}
{"id": "q22", "question": "What does PEP 3333 say about the WSGI environ dictionary?", "expected_docs": [], "answerable": false}`
        },
        {
          "kind": "p",
          "text": "Now the harness. It retrieves for each answerable question and reports three numbers from chapter 9: recall at k, mean reciprocal rank and hit rate at k. Here k covers every PEP among the six hits that retrieval returns."
        },
        {
          "kind": "p",
          "text": "The harness scores PEPs, not chunks. The function `ranked_doc_ids` turns the hits into a list of PEP numbers, and a PEP takes the rank of its best chunk. The function `reciprocal_rank` then finds the first expected PEP in that list. It also reports the share of unanswerable questions refused. Nothing gates on that rate."
        },
        {
          "kind": "step",
          "id": "c14-s02",
          "title": "run_eval scores retrieval, and optionally faithfulness, in one function",
          "text": "Compare your evals module with the reference. Here a judge is any function from a prompt to text. The `llm_judge` function puts the model named in JUDGE_MODEL behind it. If the reply is not valid JSON, `parse_verdict` returns false. So the judge fails closed, and a broken judge blocks the build.",
          "file": "src/askpep/evals.py",
          "lang": "python",
          "code": `"""Score retrieval against a golden set, and check an answer's claims against its sources."""

import json
import math
import re
from collections.abc import Callable, Sequence
from dataclasses import dataclass, field
from pathlib import Path

from askpep.config import Settings
from askpep.generation import ask, build_context
from askpep.providers import LLM, ClaudeLLM
from askpep.retrieval import is_thin, retrieve
from askpep.services import Services
from askpep.tracing import Trace
from askpep.types import Hit

GOLDEN = Path("evals/golden.jsonl")

# A judge takes a prompt and returns text. Wrap any model behind it, and tests pass a plain function.
Judge = Callable[[str], str]

JUDGE_SYSTEM = (
    "You check whether a claim is supported by its sources. Reply with JSON only, with no other text."
)


@dataclass(frozen=True)
class GoldenItem:
    id: str
    question: str
    expected_docs: list[int] = field(default_factory=list)  # empty when the PEPs cannot answer
    answerable: bool = True


def load_golden(path: Path = GOLDEN) -> list[GoldenItem]:
    """Read one JSON record per line. Blank lines are skipped."""
    items: list[GoldenItem] = []
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        record = json.loads(line)
        expected = [int(doc) for doc in record.get("expected_docs", [])]
        items.append(
            GoldenItem(record["id"], record["question"], expected, record.get("answerable", bool(expected)))
        )
    return items


def ranked_doc_ids(hits: Sequence[Hit]) -> list[int]:
    """Chunk hits to a ranked list of document numbers. A document takes the rank of its best chunk."""
    ranked: list[int] = []
    for hit in hits:
        if hit.chunk.doc_id not in ranked:
            ranked.append(hit.chunk.doc_id)
    return ranked


def recall_at_k(ranked: list[int], expected: list[int], k: int) -> float:
    """The share of the expected documents found in the top k. Zero when nothing is expected."""
    wanted = set(expected)
    if not wanted:
        return 0.0
    return len(wanted & set(ranked[:k])) / len(wanted)


def precision_at_k(ranked: list[int], expected: list[int], k: int) -> float:
    """The share of the top k that is expected."""
    if k <= 0:
        return 0.0
    return len(set(expected) & set(ranked[:k])) / k


def hit_at_k(ranked: list[int], expected: list[int], k: int) -> float:
    """1 when any expected document is in the top k, else 0."""
    return 1.0 if set(expected) & set(ranked[:k]) else 0.0


def reciprocal_rank(ranked: list[int], expected: list[int]) -> float:
    """1 over the rank of the first expected document, and 0 when none appears."""
    wanted = set(expected)
    for rank, doc_id in enumerate(ranked, start=1):
        if doc_id in wanted:
            return 1 / rank
    return 0.0


def ndcg_at_k(ranked: list[int], expected: list[int], k: int) -> float:
    """Yes or no relevance, with a log base 2 discount. 1 for the ideal order, 0 when nothing is found."""
    wanted = set(expected)
    dcg = sum(1 / math.log2(rank + 1) for rank, doc_id in enumerate(ranked[:k], start=1) if doc_id in wanted)
    ideal = sum(1 / math.log2(rank + 1) for rank in range(1, min(len(wanted), k) + 1))
    return 0.0 if ideal == 0 else dcg / ideal


@dataclass(frozen=True)
class QuestionResult:
    id: str
    ranked: list[int]
    recall: dict[int, float]
    hit: dict[int, float]
    rr: float
    ndcg: dict[int, float]


@dataclass(frozen=True)
class RetrievalReport:
    questions: int  # answerable questions scored
    skipped: int  # unanswerable questions, left out of the retrieval metrics
    mrr: float
    recall_at_k: dict[int, float]
    hit_rate_at_k: dict[int, float]
    per_question: list[QuestionResult]
    ndcg_at_k: dict[int, float] = field(default_factory=dict)


def evaluate_retriever(
    golden: Sequence[GoldenItem],
    retrieve: Callable[[str, int], list[Hit]],
    *,
    ks: Sequence[int] = (1, 3, 5, 10),
    fetch_k: int | None = None,
) -> RetrievalReport:
    """Run every answerable question through \`retrieve(question, k)\` and average the metrics.

    Chunks collapse into documents, so it fetches \`fetch_k\` chunks (three times the largest k by
    default) to still fill k documents.
    """
    fetch = fetch_k if fetch_k is not None else max(ks) * 3
    scored = [g for g in golden if g.answerable and g.expected_docs]
    results: list[QuestionResult] = []
    for g in scored:
        ranked = ranked_doc_ids(retrieve(g.question, fetch))
        results.append(
            QuestionResult(
                id=g.id,
                ranked=ranked,
                recall={k: recall_at_k(ranked, g.expected_docs, k) for k in ks},
                hit={k: hit_at_k(ranked, g.expected_docs, k) for k in ks},
                rr=reciprocal_rank(ranked, g.expected_docs),
                ndcg={k: ndcg_at_k(ranked, g.expected_docs, k) for k in ks},
            )
        )

    def mean(values: Sequence[float]) -> float:
        return sum(values) / len(values) if values else 0.0

    return RetrievalReport(
        questions=len(scored),
        skipped=len(golden) - len(scored),
        mrr=mean([r.rr for r in results]),
        recall_at_k={k: mean([r.recall[k] for r in results]) for k in ks},
        hit_rate_at_k={k: mean([r.hit[k] for r in results]) for k in ks},
        per_question=results,
        ndcg_at_k={k: mean([r.ndcg[k] for r in results]) for k in ks},
    )


def split_claims(answer: str) -> list[str]:
    """Split an answer into sentences, which stand in for claims."""
    return [part.strip() for part in re.split(r"(?<=[.!?])\\s+", answer) if part.strip()]


def parse_verdict(text: str) -> bool:
    """Read {"supported": true} out of a judge's reply. Anything else counts as unsupported, so a
    broken judge can never raise the score."""
    match = re.search(r"\\{.*\\}", text, re.DOTALL)
    if not match:
        return False
    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError:
        return False
    return isinstance(data, dict) and data.get("supported") is True


def check_faithfulness(answer: str, sources: Sequence[str], judge: Judge) -> float:
    """The share of the answer's claims that the sources support. It asks the judge one question per
    claim, which avoids the position and length effects of judging a whole answer at once.
    An answer with no claims scores 0."""
    numbered = "\\n\\n".join(f"[{i}] {source}" for i, source in enumerate(sources, start=1))
    verdicts = []
    for claim in split_claims(answer):
        prompt = (
            f"Sources:\\n{numbered}\\n\\nClaim: {claim}\\n\\n"
            "Is the claim fully supported by the sources, using only what they say? "
            'Reply with JSON only: {"supported": true or false, "reason": "one sentence"}'
        )
        verdicts.append(parse_verdict(judge(prompt)))
    return sum(verdicts) / len(verdicts) if verdicts else 0.0


def llm_judge(llm: LLM) -> Judge:
    """A judge backed by an LLM. Use a different model family from the answerer if you can."""

    def judge(prompt: str) -> str:
        return "".join(item for item in llm.stream(JUDGE_SYSTEM, prompt) if isinstance(item, str))

    return judge


@dataclass
class EvalReport:
    questions: int = 0
    recall: float = 0.0
    mrr: float = 0.0
    hit_rate: float = 0.0
    refusal_rate_unanswerable: float | None = None
    faithfulness: float | None = None
    misses: list[str] = field(default_factory=list)


def _judge_llm(settings: Settings, fallback: LLM) -> LLM:
    """The judge runs on JUDGE_MODEL. Offline fakes have no model, so they judge for themselves."""
    if settings.providers == "fake":
        return fallback
    return ClaudeLLM(settings.anthropic_api_key, settings.judge_model, max_tokens=200)


def run_eval(
    svc: Services, golden: Sequence[GoldenItem], with_judge: bool = False, judge: Judge | None = None
) -> EvalReport:
    """The \`askpep eval\` numbers: recall, MRR and hit rate over the answerable questions, the refusal
    rate on the unanswerable ones, and with a judge the mean faithfulness of the answers."""
    report = EvalReport(questions=len(golden))
    answerable = [g for g in golden if g.answerable and g.expected_docs]
    unanswerable = [g for g in golden if not g.answerable]
    recalls: list[float] = []
    reciprocal: list[float] = []
    found = 0
    scores: list[float] = []
    if with_judge and judge is None:
        judge = llm_judge(_judge_llm(svc.settings, svc.llm))

    for item in answerable:
        hits = retrieve(svc, item.question, Trace("eval", item.question))
        ranked = ranked_doc_ids(hits)
        recalls.append(recall_at_k(ranked, item.expected_docs, len(ranked)))
        reciprocal.append(reciprocal_rank(ranked, item.expected_docs))
        if hit_at_k(ranked, item.expected_docs, len(ranked)):
            found += 1
        else:
            report.misses.append(item.id)
        if judge is not None:
            done = ask(svc, item.question, route="eval")
            if not done.refused:
                packed = build_context(hits, budget_tokens=svc.settings.context_budget_tokens)
                sources = [s.hit.chunk.embedding_text for s in packed.sources]
                scores.append(check_faithfulness(done.answer, sources, judge))

    n = len(answerable) or 1
    report.recall = sum(recalls) / n
    report.mrr = sum(reciprocal) / n
    report.hit_rate = found / n
    if unanswerable:
        refused = sum(
            is_thin(svc, retrieve(svc, item.question, Trace("eval", item.question))) for item in unanswerable
        )
        report.refusal_rate_unanswerable = refused / len(unanswerable)
    if scores:
        report.faithfulness = sum(scores) / len(scores)
    return report`
        },
        {
          "kind": "callout",
          "tone": "insight",
          "title": "The judge shares your blind spots",
          "text": "In the reference settings, the judge and the answerer are the same Claude model. Chapter 9 named the risk: self-preference bias, which prefers answers the judge model wrote itself. In production, use a different model family as judge, and spot-check a sample of its verdicts by hand. A judge you never audit is a second thing to debug."
        },
        {
          "kind": "step",
          "id": "c14-s03",
          "title": "A command line flag turns scores into an exit code",
          "text": "Add the eval command to the end of the command line module. It prints the report as JSON, then exits with code one if recall or MRR is under its threshold. With the judge flag, it also checks faithfulness. The defaults of 0.8, 0.5 and 0.8 are first guesses. Nobody has tuned them against live providers.",
          "file": "src/askpep/cli.py",
          "lang": "python",
          "code": "@app.command(name=\"eval\")\ndef run_eval_command(\n    judge: Annotated[bool, typer.Option(\"--judge\", help=\"Also score faithfulness with the LLM.\")] = False,\n    min_recall: float = 0.8,\n    min_mrr: float = 0.5,\n    min_faithfulness: float = 0.8,\n) -> None:\n    \"\"\"Score retrieval against evals/golden.jsonl. Exits 1 when a score is under its threshold.\"\"\"\n    import json\n    from dataclasses import asdict\n\n    from askpep.evals import load_golden, run_eval\n\n    report = run_eval(open_services(), load_golden(), with_judge=judge)\n    typer.echo(json.dumps(asdict(report), indent=2))\n    failed = report.recall < min_recall or report.mrr < min_mrr\n    if report.faithfulness is not None:\n        failed = failed or report.faithfulness < min_faithfulness\n    raise typer.Exit(code=1 if failed else 0)"
        },
        {
          "kind": "step",
          "id": "c14-s04",
          "title": "A run on the fake providers proves the gate wiring, not the quality",
          "text": "Run the eval with the fake providers. The fakes are crude, so these numbers only prove the plumbing works. They also come from the local store, and Postgres may rank a little differently. Nobody checked real Voyage and Claude behaviour for the reference build. Expect your live numbers to differ, and retune the thresholds once you have seen them.",
          "lang": "bash",
          "code": "uv run askpep eval; echo \"exit code: $?\"",
          // CHECK: these numbers came from the local store with the fake providers, because no Postgres with pgvector was available. Postgres ranks the sparse leg with ts_rank_cd, so recall and MRR may differ. Re-run against the compose database and confirm.
          "expect": "{\n  \"questions\": 22,\n  \"recall\": 0.925,\n  \"mrr\": 0.8208333333333334,\n  \"hit_rate\": 0.95,\n  \"refusal_rate_unanswerable\": 0.0,\n  \"faithfulness\": null,\n  \"misses\": [\n    \"q11\"\n  ]\n}\nexit code: 0"
        },
        {
          "kind": "step",
          "id": "c14-s05",
          "title": "Raising the bar proves the gate can fail",
          "text": "A gate you have never seen fail is a gate you cannot trust. Raise the recall threshold above what the system scores. The command should exit with code one. That exit code is exactly what stops a merge in the pipeline.",
          "lang": "bash",
          "code": "uv run askpep eval --min-recall 0.99; echo \"exit code: $?\"",
          "expect": "exit code: 1"
        },
        {
          "kind": "step",
          "id": "c14-s06",
          "title": "The judge flag exposes a fake model that never returns JSON",
          "text": "Run with the judge on. The fake model never returns JSON, so the judge fails closed. It scores every answer as unfaithful, and the gate fails, which is correct for a broken judge. The command also writes 20 trace lines to standard error, which the output leaves out. A real model should give a score between zero and one.",
          "lang": "bash",
          "code": "uv run askpep eval --judge; echo \"exit code: $?\"",
          // CHECK: these numbers came from the local store with the fake providers, because no Postgres with pgvector was available. Postgres ranks the sparse leg with ts_rank_cd, so recall and MRR may differ. Re-run against the compose database and confirm.
          "expect": "{\n  \"questions\": 22,\n  \"recall\": 0.925,\n  \"mrr\": 0.8208333333333334,\n  \"hit_rate\": 0.95,\n  \"refusal_rate_unanswerable\": 0.0,\n  \"faithfulness\": 0.0,\n  \"misses\": [\n    \"q11\"\n  ]\n}\nexit code: 1"
        },
        {
          "kind": "quiz",
          "id": "c14-q1",
          "question": "The golden set has 20 answerable questions. Recall drops from 0.85 to 0.80 after a change. What happened, and does the 0.8 gate catch it?",
          "options": [
            "Five questions lost their expected PEP, and the gate passes because 0.80 is not under 0.8.",
            "One question lost its expected PEP, and the gate passes because 0.80 is not under 0.8.",
            "One question lost its expected PEP, and the gate fails.",
            "Five questions lost their expected PEP, and the gate fails."
          ],
          "answer": 1,
          "explain": "Each question is worth 0.05 of recall, so a drop of 0.05 is one question losing its only expected PEP. The check is a strict less-than, so exactly 0.80 passes. This is why thresholds on a small set are blunt, and why chapter 9 says to read which questions changed."
        },
        {
          "kind": "widget",
          "id": "c14-eval-gate",
          "intro": "Set the recall and MRR a pull request produces, predict whether the gate passes, then run it. Watch how close a single dropped question brings you to the line."
        },
        {
          "kind": "p",
          "text": "Two limits matter. First, the gate guards retrieval well and answers weakly, because a faithfulness score from an LLM judge is noisy on 20 answers. Second, the unanswerable questions are reported but not gated. A change that stops the system refusing would still merge. Add that threshold when you trust the number."
        },
        {
          "kind": "quiz",
          "id": "c14-q2",
          "question": "The harness prints refusal_rate_unanswerable but the command never exits non-zero because of it. What is the risk?",
          "options": [
            "None, because refusal is not a retrieval metric.",
            "A change that makes the system answer questions it should refuse still merges.",
            "The golden set becomes invalid.",
            "The judge flag stops working."
          ],
          "answer": 1,
          "explain": "Only recall, MRR and faithfulness gate the build. A regression in refusal would show in the printed report and pass CI. If refusing matters to you, gate on it too."
        },
        {
          "kind": "p",
          "text": "Interviewers often ask how you stop quality regressing silently."
        },
        {
          "kind": "callout",
          "tone": "interview",
          "title": "Interviewers ask how you stop quality regressing silently",
          "text": "A strong answer names a labelled golden set at document level, retrieval metrics as a gate, and a separate generation check. Then say the limits yourself: a small set, a biased judge and thresholds that need tuning on real numbers. The interview questions at the end of this chapter cover this ground."
        },
        {
          "kind": "p",
          "text": "In production you might swap the hand-written harness for Ragas, DeepEval or promptfoo. They give you more metrics and dashboards. They also add a dependency and a vocabulary. The hand-written version is 262 lines, docstrings included. You can read it in one sitting, and it is good enough until you outgrow it."
        },
        {
          "kind": "p",
          "text": "The gate now works, but only when someone remembers to run it. Section two makes the machine run it on every change."
        }
      ]
    },
    {
      "id": "s2-ci",
      "title": "CI runs the cheap checks on every change and the paid gate only with keys",
      "goal": "How do you run the gate on every change without breaking forks or wasting money?",
      "blocks": [
        {
          "kind": "p",
          "text": "**GitHub Actions** is GitHub's CI service. A **workflow** is a YAML file that tells it what to run. A **job** is one run of steps on a fresh machine, and AskPEP's workflow has one."
        },
        {
          "kind": "p",
          "text": "That job starts a pgvector Postgres as a **service container**, a container that runs beside the job. So the tests run against the same database engine as production. Then the job runs the linter, the formatter check, the tests and the UI build. The eval gate comes last."
        },
        {
          "kind": "p",
          "text": "The gate needs real Voyage and Anthropic keys, and it spends money. It ingests the corpus into a fresh database and calls the model for each question."
        },
        {
          "kind": "p",
          "text": "**Repository secrets** are encrypted values that GitHub hands to a workflow, such as those two keys. A pull request from a **fork**, someone's copy of your repository, gets no secrets. So the gate step runs only when both keys exist, and otherwise skips instead of failing."
        },
        {
          "kind": "step",
          "id": "c14-s07",
          "title": "One workflow file lints, tests, builds and gates",
          "text": "Create the workflow file. Read the last step carefully: its condition checks that both keys are non-empty. Check the first run on GitHub yourself. The reference build ran these commands locally, not the workflow itself, so treat the file as untested on GitHub.",
          "file": ".github/workflows/ci.yml",
          "lang": "yaml",
          "code": `name: ci

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg17
        env:
          POSTGRES_USER: askpep
          POSTGRES_DB: askpep
          POSTGRES_HOST_AUTH_METHOD: trust
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U askpep"
          --health-interval 3s
          --health-timeout 3s
          --health-retries 20
    env:
      DATABASE_URL: postgresql://askpep@localhost:5432/askpep
      TEST_DATABASE_URL: postgresql://askpep@localhost:5432/askpep
      VOYAGE_API_KEY: \${{ secrets.VOYAGE_API_KEY }}
      ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v6
      - run: uv sync
      - run: uv run ruff check .
      - run: uv run ruff format --check .
      - run: uv run pytest
      - name: Build the UI
        working-directory: ui
        run: npm ci && npm run build

      # The eval gate needs real keys. Pull requests from forks do not get secrets, so it skips.
      - name: Eval gate
        if: \${{ env.VOYAGE_API_KEY != '' && env.ANTHROPIC_API_KEY != '' }}
        run: |
          uv run askpep migrate
          uv run askpep ingest --fetch
          uv run askpep eval --judge --min-recall 0.8 --min-mrr 0.5 --min-faithfulness 0.8`
        },
        {
          "kind": "step",
          "id": "c14-s08",
          "title": "Lint passes before anything else runs",
          "text": "Run Ruff, the Python linter, before you push. A clean lint is the cheapest check, and it should fail first in the pipeline.",
          "lang": "bash",
          "code": "uv run ruff check .",
          "expect": "All checks passed!"
        },
        {
          "kind": "step",
          "id": "c14-s09",
          "title": "The format check keeps diffs about behaviour",
          "text": "Run the format check. The reference project holds 23 files, so that is the count shown. Your workspace also holds the lab tests, so expect a higher number.",
          "lang": "bash",
          "code": "uv run ruff format --check .",
          "expect": "23 files already formatted"
        },
        {
          "kind": "step",
          "id": "c14-s10",
          "title": "The test suite passes against the pgvector database",
          "text": "Run the whole suite. It includes the lab tests from earlier chapters. The database tests need the Postgres from the Docker Compose file. With the database running, expect 329 passed and 4 deselected. The 4 are the live tests, which call paid APIs and stay off. The count is typical, not a target.",
          "lang": "bash",
          "code": "uv run pytest -q",
          // CHECK: 329 passed is the 321 that passed in the reference run plus the 8 database tests that skipped there, because that run had no Postgres. The time of 1.76s comes from that run too, so a run with the database takes longer. Re-run against the compose database and confirm both.
          "expect": "........................................................................ [ 21%]\n........................................................................ [ 43%]\n........................................................................ [ 65%]\n........................................................................ [ 87%]\n.........................................                                [100%]\n329 passed, 4 deselected in 1.76s"
        },
        {
          "kind": "p",
          "text": "To turn the gate on, add VOYAGE_API_KEY and ANTHROPIC_API_KEY under Settings, Secrets and variables, Actions in your repository. Until you do, CI is green and the gate silently skips. That is a real trap. A skipped gate looks the same as a passing one, so check the job log."
        },
        {
          "kind": "quiz",
          "id": "c14-q3",
          "question": "Why does the eval gate step run only when both API keys are set?",
          "options": [
            "Forks get no secrets and would fail, and the step spends money, so it skips without keys.",
            "The linter needs the keys.",
            "pytest cannot run without keys.",
            "GitHub forbids Postgres service containers without keys."
          ],
          "answer": 0,
          "explain": "Pull requests from forks get no repository secrets. Skipping avoids a red build nobody can fix, and it avoids paid calls from untrusted code. The cost is that a skipped gate looks green."
        },
        {
          "kind": "p",
          "text": "What would you change at scale? Run the gate only when files under the source or evals folders change. Cache the ingested index between runs, keyed on the chunker and embedding model, so you do not re-embed 18 PEPs on every pull request. Store each run's scores so you can chart drift, not only pass or fail."
        },
        {
          "kind": "callout",
          "tone": "insight",
          "title": "A gate that never skips is better than one that sometimes does",
          "text": "The skip rule is a compromise for a tutorial. A team with a private repository should keep keys in the pipeline and fail the build when they are missing. Silent skips are how a gate rots."
        },
        {
          "kind": "p",
          "text": "The gate now guards every merge. It says nothing about the running service, such as how slow it is or how often it refuses. Section three reads that from the traces."
        }
      ]
    },
    {
      "id": "s3-observability",
      "title": "One traces table shows where time goes, how often AskPEP refuses and what it retrieves",
      "goal": "Once AskPEP runs, how do you see where time goes, how often it refuses and what it retrieves?",
      "blocks": [
        {
          "kind": "p",
          "text": "Chapter 10 told you to measure each stage, with a trace per request and a span per stage. The starter shipped AskPEP's tracing module in chapter 12."
        },
        {
          "kind": "p",
          "text": "AskPEP's version is one small class. Each request creates a trace, and each stage runs inside a timer. At the end the trace writes one JSON log line and one row in the traces table. Writing never raises, because tracing must not break a request."
        },
        {
          "kind": "p",
          "text": "The row holds the route, the query and the timings per stage. It also holds the retrieved chunk ids, the model and the token counts. Last come the refusal flag, the total latency and any error. That is enough to answer the three questions a RAG service gets asked in its first month."
        },
        {
          "kind": "step",
          "id": "c14-s11",
          "title": "Every request logs one JSON line with its stage timings",
          "text": "Run a search and keep only the last line of the log. You should see the route, the total latency, a timings object and a refused flag. The route is cli.search, because the search came from the command line. The numbers use fake providers and will differ from live ones.",
          "lang": "bash",
          "code": "uv run askpep search \"walrus operator\" 2>&1 >/dev/null | tail -n 1",
          "expect": "{\"ts\": \"2026-10-21T16:06:09+0530\", \"level\": \"INFO\", \"logger\": \"askpep.trace\", \"msg\": \"trace\", \"route\": \"cli.search\", \"latency_ms\": 81.7, \"timings\": {\"embed\": 0.1, \"dense\": 78.9, \"sparse\": 1.6, \"fuse\": 0.1, \"rerank\": 0.9}, \"refused\": false, \"error\": null}"
        },
        {
          "kind": "step",
          "id": "c14-s12",
          "title": "The 95th percentile per stage shows where the time goes",
          "text": "The first query needs the compose database, holding traces from a few searches and asks. The local store keeps no traces table. The query reports the p95 latency of each stage over the last day, because users feel the slow tail. Generation shows 0.2 milliseconds only because the fake model answers instantly.",
          "lang": "bash",
          "code": "docker compose exec -T db psql -U askpep <<'EOF'\nSELECT stage,\n       count(*) AS n,\n       round(percentile_cont(0.95) WITHIN GROUP (ORDER BY ms)::numeric, 1) AS p95_ms\nFROM traces, jsonb_each_text(timings) AS t(stage, ms_text), LATERAL (SELECT ms_text::float AS ms) AS m\nWHERE ts > now() - interval '24 hours'\nGROUP BY stage\nORDER BY p95_ms DESC;\nEOF",
          // CHECK: this output comes from a Postgres run on 16 October 2026, before the chunker changed. The counts, timings and chunk ids will differ in yours. A local store keeps no trace table, so only a Postgres run fills it. Re-capture it against the compose database after a few searches and asks.
          "expect": "  stage   | n  | p95_ms \n----------+----+--------\n dense    | 28 |   27.5\n sparse   | 28 |   12.8\n rerank   | 28 |    2.2\n embed    | 28 |    0.2\n fuse     | 28 |    0.2\n generate | 22 |    0.2\n(6 rows)"
        },
        {
          "kind": "widget",
          "id": "c14-trace-waterfall",
          "intro": "Pick a made-up trace row and guess the slowest stage. Then read the waterfall and try running the dense and sparse searches in parallel. Watch how little that saves when generation dominates."
        },
        {
          "kind": "quiz",
          "id": "c14-q4",
          "question": "Why does the stage latency query report the 95th percentile instead of the average?",
          "options": [
            "Percentiles are faster to compute in Postgres.",
            "The average hides the slow requests that users actually complain about.",
            "The average cannot be computed over JSON.",
            "The 95th percentile is always lower than the average."
          ],
          "answer": 1,
          "explain": "A mean smooths a few very slow requests into an unremarkable number. The 95th percentile tells you how bad one request in twenty feels. Chapter 10 covers latency budgets the same way."
        },
        {
          "kind": "step",
          "id": "c14-s13",
          "title": "A rising refusal rate means a stale index or a bad threshold",
          "text": "Run the second query. It groups asks from the API and from agents by day, and reports the share that refused. A sudden rise usually means the index is empty or out of date. It can also mean the rerank score threshold is too high for your reranker.",
          "lang": "bash",
          "code": "docker compose exec -T db psql -U askpep <<'EOF'\nSELECT date_trunc('day', ts) AS day,\n       count(*) AS asks,\n       round(avg(refused::int)::numeric, 3) AS refusal_rate\nFROM traces\nWHERE route IN ('ask', 'mcp.ask')\nGROUP BY 1\nORDER BY 1 DESC;\nEOF",
          // CHECK: this output comes from a Postgres run on 16 October 2026, before the chunker changed. The counts, timings and chunk ids will differ in yours. A local store keeps no trace table, so only a Postgres run fills it. Re-capture it against the compose database after a few searches and asks.
          "expect": "            day            | asks | refusal_rate \n---------------------------+------+--------------\n 2026-10-16 00:00:00+05:30 |    1 |        0.000\n(1 row)"
        },
        {
          "kind": "step",
          "id": "c14-s14",
          "title": "The most retrieved chunks are your best content or a stuck retriever",
          "text": "Run the third query. It counts how often each chunk came back from the API's ask and search routes. Chunks at the top are either the heart of your corpus or a stuck retriever, one that lands on them whatever the question. The sample holds one trace, so every count is one.",
          "lang": "bash",
          "code": "docker compose exec -T db psql -U askpep <<'EOF'\nSELECT c.id, d.title, c.heading_path[2:] AS section, count(*) AS times_retrieved\nFROM traces t, unnest(t.retrieved_ids) AS r(chunk_id)\nJOIN chunks c ON c.id = r.chunk_id\nJOIN documents d ON d.id = c.doc_id\nWHERE t.route IN ('ask', 'search')\nGROUP BY c.id, d.title, c.heading_path\nORDER BY times_retrieved DESC\nLIMIT 5;\nEOF",
          // CHECK: this output comes from a Postgres run on 16 October 2026, before the chunker changed. The counts, timings and chunk ids will differ in yours. A local store keeps no trace table, so only a Postgres run fills it. Re-capture it against the compose database after a few searches and asks.
          "expect": " id |               title                |                  section                   | times_retrieved \n----+------------------------------------+--------------------------------------------+-----------------\n 10 | PEP 1 – PEP Purpose and Guidelines | {\"PEP Workflow\",\"Submitting a PEP\"}        |               1\n 15 | PEP 1 – PEP Purpose and Guidelines | {\"PEP Workflow\",\"Discussing a PEP\"}        |               1\n 26 | PEP 1 – PEP Purpose and Guidelines | {\"What belongs in a successful PEP?\"}      |               1\n 30 | PEP 1 – PEP Purpose and Guidelines | {\"PEP Header Preamble\"}                    |               1\n 34 | PEP 1 – PEP Purpose and Guidelines | {\"PEP Editor Responsibilities & Workflow\"} |               1\n(5 rows)"
        },
        {
          "kind": "p",
          "text": "The table also stores the raw query text. For a public service that is personal data, so decide a retention period and who can read it before you launch."
        },
        {
          "kind": "p",
          "text": "In production you might swap this table for Langfuse, Arize Phoenix or LangSmith. You could also emit OpenTelemetry spans to any backend, since OpenTelemetry is the open standard for traces. You gain trace trees, prompt versions and a UI. You give up the plainness of a table in a database you already run."
        },
        {
          "kind": "step",
          "id": "c14-s15",
          "title": "Copy the README so the three queries live with the code",
          "text": "Copy the README from the reference project. It is prose. It holds these three queries, the API examples and the MCP setup, so you do not have to find them again."
        },
        {
          "kind": "p",
          "text": "You now measure quality before a merge and behaviour after it. The same golden set can judge a bigger change: swapping your own retrieval for a framework. Section four tries it."
        }
      ]
    },
    {
      "id": "s4-llamaindex",
      "title": "LlamaIndex builds the same retrieval in far fewer lines and hides what you tuned",
      "goal": "Does a framework build the same retrieval better, and how would you know?",
      "blocks": [
        {
          "kind": "p",
          "text": "You wrote chunking, ingestion and hybrid search by hand. Chapter 11 said that for RAG, the question is what the framework hides. Here you answer it on your own data. **LlamaIndex** is a Python framework for RAG. The same 18 PEPs go into a separate table in the same Postgres, through PGVectorStore, its pgvector adapter."
        },
        {
          "kind": "step",
          "id": "c14-s16",
          "title": "The comparison lives in its own dependency group",
          "text": "Add LlamaIndex as a **dependency group**, a named set of extra packages that a plain install leaves out, so the main install stays light. The output shows the tail of a long install. Package versions will differ on your machine.",
          "lang": "bash",
          "code": "uv add --group compare llama-index-core llama-index-vector-stores-postgres llama-index-embeddings-voyageai",
          "expect": " + xxhash==4.0.1\n + yarl==1.25.1\n + zstandard==0.25.0"
        },
        {
          "kind": "step",
          "id": "c14-s17",
          "title": "The whole LlamaIndex pipeline fits in one script",
          "text": "Create the comparison script. Read build, retrieve and evaluate. Building is eight lines, plus the fetch, and retrieval is five. SentenceSplitter, LlamaIndex's default splitter, cuts text into pieces of about 450 tokens and prefers sentence ends. The fake embedding class is only a shim, so the script runs without a Voyage key.",
          "file": "llamaindex_compare/compare.py",
          "lang": "python",
          "code": `"""The same retrieval built with LlamaIndex, in its own table in the same Postgres.

uv run --group compare python llamaindex_compare/compare.py --build
uv run --group compare python llamaindex_compare/compare.py "What does PEP 572 add?"
uv run --group compare python llamaindex_compare/compare.py --eval
"""

import argparse
import json
from pathlib import Path

from llama_index.core import Document, Settings, StorageContext, VectorStoreIndex
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.vector_stores.types import VectorStoreQueryMode
from llama_index.embeddings.voyageai import VoyageEmbedding
from llama_index.vector_stores.postgres import PGVectorStore

from askpep.config import get_settings
from askpep.ingest import PEP_IDS, fetch_pep, parse_header

s = get_settings()
sqlalchemy_url = s.database_url.replace("postgresql://", "postgresql+psycopg2://", 1)

if s.providers == "fake":  # offline stand-in, so the script runs without a Voyage key
    from llama_index.core.embeddings import BaseEmbedding

    from askpep.fakes import FakeEmbedder

    class FakeEmbedding(BaseEmbedding):
        def _get_text_embedding(self, text: str) -> list[float]:
            return FakeEmbedder(s.embed_dim).embed([text], "document")[0]

        _get_query_embedding = _get_text_embedding

        async def _aget_query_embedding(self, query: str) -> list[float]:
            return self._get_query_embedding(query)

    Settings.embed_model = FakeEmbedding()
else:
    Settings.embed_model = VoyageEmbedding(
        model_name=s.embed_model, voyage_api_key=s.voyage_api_key, output_dimension=s.embed_dim
    )

store = PGVectorStore.from_params(
    connection_string=sqlalchemy_url,
    async_connection_string=sqlalchemy_url.replace("psycopg2", "asyncpg"),
    table_name="llamaindex_peps",  # LlamaIndex prefixes it: the real table is data_llamaindex_peps
    embed_dim=s.embed_dim,
    hybrid_search=True,
    hnsw_kwargs={
        "hnsw_m": 16,
        "hnsw_ef_construction": 64,
        "hnsw_ef_search": 40,
        "hnsw_dist_method": "vector_cosine_ops",
    },
)
index = VectorStoreIndex.from_vector_store(store)


def build() -> None:
    documents = []
    for pep_id in PEP_IDS:
        fields, body = parse_header(fetch_pep(pep_id))
        documents.append(Document(text=body, metadata={"pep": pep_id, "title": fields["Title"]}))
    splitter = SentenceSplitter(chunk_size=450, chunk_overlap=50)
    VectorStoreIndex.from_documents(
        documents,
        storage_context=StorageContext.from_defaults(vector_store=store),
        transformations=[splitter],
    )


def retrieve(question: str, k: int = 6):
    retriever = index.as_retriever(
        vector_store_query_mode=VectorStoreQueryMode.HYBRID, similarity_top_k=k, sparse_top_k=k
    )
    # Hybrid mode returns up to k dense hits plus k sparse hits, so cut back to k.
    return retriever.retrieve(question)[:k]


def evaluate() -> None:
    golden = [json.loads(line) for line in Path("evals/golden.jsonl").read_text().splitlines()]
    answerable = [q for q in golden if q["expected_docs"]]
    recalls, reciprocal = [], []
    for q in answerable:
        expected = set(q["expected_docs"])
        docs = [n.metadata["pep"] for n in retrieve(q["question"])]
        recalls.append(len(expected & set(docs)) / len(expected))
        rank = next((r for r, d in enumerate(docs, 1) if d in expected), None)
        reciprocal.append(1 / rank if rank else 0.0)
    print(
        json.dumps(
            {"recall": sum(recalls) / len(recalls), "mrr": sum(reciprocal) / len(reciprocal)}, indent=2
        )
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("question", nargs="?")
    parser.add_argument("--build", action="store_true")
    parser.add_argument("--eval", action="store_true")
    args = parser.parse_args()
    if args.build:
        build()
    if args.eval:
        evaluate()
    if args.question:
        for node in retrieve(args.question):
            print(f"[{node.score:.3f}] PEP {node.metadata['pep']}: {node.text[:120]!r}")`
        },
        {
          "kind": "p",
          "text": "Copy llamaindex_compare/README.md from the reference as well. It holds the line counts and the findings you are about to reproduce. The table below uses its numbers, which count physical lines including blanks and docstrings."
        },
        {
          "kind": "step",
          "id": "c14-s18",
          "title": "Build the index once and score it on the golden set",
          "text": "Build and evaluate in one run. Do not run the build twice. LlamaIndex inserts again on every run, and the table doubles. The scores below come from the fake embedder, so they only show the plumbing works. They say nothing about LlamaIndex versus your code.",
          "lang": "bash",
          "code": "uv run --group compare python llamaindex_compare/compare.py --build --eval",
          // CHECK: this output comes from the original LlamaIndex run on 16 October 2026. The compare script needs Postgres and the compare dependency group, and neither was available for a re-run after the golden set and the chunker changed. Re-run it and confirm.
          "expect": "{\n  \"recall\": 0.875,\n  \"mrr\": 0.7791666666666667\n}"
        },
        {
          "kind": "step",
          "id": "c14-s19",
          "title": "A single question shows what the framework returns",
          "text": "Ask one question. The first three results are shown, and live providers will differ. Look at the chunk text. It starts mid-section and carries no heading path, because the sentence splitter knows nothing about the structure of a PEP.",
          "lang": "bash",
          "code": "uv run --group compare python llamaindex_compare/compare.py \"What does PEP 572 add?\"",
          // CHECK: this output comes from the original LlamaIndex run on 16 October 2026. The compare script needs Postgres and the compare dependency group, and neither was available for a re-run after the golden set and the chunker changed. Re-run it and confirm.
          "expect": "[0.334] PEP 634: '.. canonical-doc:: :external+python:ref:`match`\\n\\nAbstract\\n========\\n\\nThis PEP provides the technical specification for th'\n[0.252] PEP 1: 'The section\\n    can be used to recognise contributors to the work who are not co-authors.\\n\\n13. Footnotes -- A collection'\n[0.251] PEP 1: 'Python\\'s Core Developers\\n------------------------\\n\\nThere are several references in this PEP to \"core developers\". This r'"
        },
        {
          "kind": "compare",
          "caption": "Where the lines went, from the reference README.",
          "columns": [
            "Stage",
            "AskPEP by hand",
            "LlamaIndex"
          ],
          "rows": [
            [
              "Chunking",
              "chunking.py, 276 lines",
              "One line, a SentenceSplitter"
            ],
            [
              "Ingestion",
              "ingest.py, 169 lines",
              "build, 8 lines, plus the fetch"
            ],
            [
              "Retrieval",
              "retrieval.py, 184 lines, with traces",
              "retrieve, 5 lines"
            ],
            [
              "Whole script",
              "about 630 lines across 3 files",
              "110 lines, about 25 of them shim and eval loop"
            ]
          ]
        },
        {
          "kind": "p",
          "text": "That comparison flatters LlamaIndex a little. The hand-written files also hold trace timing, the idempotency check and the refusal logic, which compare.py does not have. Count only the core logic and the gap is wide. Count the features and the gap narrows."
        },
        {
          "kind": "compare",
          "caption": "What you gain and what you lose with the framework.",
          "columns": [
            "Question",
            "What happened"
          ],
          "rows": [
            [
              "What did it hide?",
              "The schema, the HNSW index, the tsvector column, query and document embedding modes, batching, and the fusion step."
            ],
            [
              "What was harder to control?",
              "Structure-aware chunking, the fusion rule and its score, and the sparse query."
            ],
            [
              "What was missing?",
              // CHECK: the 418 to 836 row counts come from the original LlamaIndex run on 16 October 2026. The compare script needs Postgres and the compare dependency group, and neither was available for a re-run after the golden set and the chunker changed. Re-run compare.py --build twice and confirm both counts.
              "Idempotency: running the build twice doubled the rows from 418 to 836 in the reference test. Also per-stage timing."
            ],
            [
              "What did it add?",
              "SQLAlchemy, psycopg2 and asyncpg beside psycopg 3."
            ]
          ]
        },
        {
          "kind": "p",
          "text": "Be plain about the verdict. LlamaIndex wins when you want a working prototype in an hour and its defaults match your data. Hand-rolling wins when evals force you to see and tune each stage. Neither is a moral choice. The golden set is what lets you tell them apart on your data."
        },
        {
          "kind": "quiz",
          "id": "c14-q5",
          "question": "You run the LlamaIndex build twice by mistake. What happens, and why does AskPEP not have the same problem?",
          "options": [
            "Nothing, because LlamaIndex deduplicates by content.",
            "The table doubles, because from_documents inserts again. AskPEP hashes content and skips unchanged documents.",
            "The second run fails with a primary key error.",
            "The index is rebuilt from scratch and replaces the first."
          ],
          "answer": 1,
          // CHECK: the 418 to 836 row counts come from the original LlamaIndex run on 16 October 2026. The compare script needs Postgres and the compare dependency group, and neither was available for a re-run after the golden set and the chunker changed. Re-run compare.py --build twice and confirm both counts.
          "explain": "In the reference test the row count went from 418 to 836. AskPEP's ingestion compares a content hash, replaces changed documents and deletes removed ones. A framework can do the same, but you have to ask for it."
        },
        {
          "kind": "p",
          "text": "When you would use a framework is a common interview question."
        },
        {
          "kind": "callout",
          "tone": "interview",
          "title": "Interviewers ask when you would use a framework",
          "text": "A good answer is neither hype nor snobbery. Name what the framework gave you, here the schema and fusion in a few lines. Name what it hid, here chunk structure, scores and idempotency. Then say you decide by measuring both on your golden set. Chapter 11 covers how to choose."
        },
        {
          "kind": "p",
          "text": "For a different shape of problem, say agents with many tools and branching control flow, LangGraph or Haystack may fit better. This build covers one framework on one task. Do not generalise from it to claims about the others."
        },
        {
          "kind": "p",
          "text": "The hand-written build stays. The last step is to run it where other people can reach it. Section five deploys it to Google Cloud."
        }
      ]
    },
    {
      "id": "s5-cloud-run",
      "title": "Cloud Run and Cloud SQL put AskPEP live, but nobody has run these steps",
      "goal": "How do you put AskPEP on Google Cloud, and prove the live service works and is locked?",
      "blocks": [
        {
          "kind": "callout",
          "tone": "warn",
          "title": "Read this before you deploy",
          "text": "Nobody has run the Docker build, or these steps on Google Cloud. The pgvector index on the smallest Cloud SQL tier is untested. So are the database user's right to create the extension, the shell command that runs the ingest, and the command flags. Check the Google Cloud docs. DEPLOY.md in the capstone marks each doubt with CHECK."
        },
        {
          "kind": "p",
          "text": "**Cloud Run** is Google's service that runs a container on demand and scales it to zero when idle. **Cloud SQL** is Google's managed Postgres."
        },
        {
          "kind": "p",
          "text": "The deploy has four parts. You build an image, then create the database and its secrets. A **Cloud Run job**, a container that runs to completion and stops, runs the migrations and the ingest once. Last, you deploy the service and check it."
        },
        {
          "kind": "p",
          "text": "The Dockerfile is a **multi-stage** build, with two stages. Stage one builds the chat UI with Node. Stage two installs the Python dependencies with uv, copies the source and the built UI, and starts uvicorn. Docker builds an image in **layers**, one per instruction, and reuses a layer until its inputs change."
        },
        {
          "kind": "p",
          "text": "So the dependencies are copied and installed before the source. A code change then reuses the cached dependency layer, and nothing reinstalls."
        },
        {
          "kind": "step",
          "id": "c14-s20",
          "title": "A multi-stage Dockerfile builds the UI and runs uvicorn",
          "text": "Create the Dockerfile. The second line of stage two copies uv from its official image. The frozen sync fails if the lock file is out of date, which is what you want in a build. The start command reads the PORT variable. Cloud Run sets it to 8080, and the command falls back to 8000 on your laptop.",
          "file": "Dockerfile",
          "lang": "dockerfile",
          "code": "# Stage 1: build the chat UI.\nFROM node:22-slim AS ui\nWORKDIR /ui\nCOPY ui/package.json ui/package-lock.json ./\nRUN npm ci\nCOPY ui/ ./\nRUN npm run build\n\n# Stage 2: the API, with the built UI beside it.\nFROM python:3.12-slim\nCOPY --from=ghcr.io/astral-sh/uv:0.11 /uv /usr/local/bin/uv\nENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy PYTHONUNBUFFERED=1\nWORKDIR /app\n\n# Dependencies first, so this layer is cached until pyproject.toml or uv.lock change.\nCOPY pyproject.toml uv.lock README.md ./\nRUN uv sync --frozen --no-dev --no-install-project\n\nCOPY src ./src\nCOPY evals ./evals\nRUN uv sync --frozen --no-dev\nCOPY --from=ui /ui/dist ./ui/dist\n\nENV PATH=\"/app/.venv/bin:$PATH\"\nEXPOSE 8000\nCMD [\"sh\", \"-c\", \"uvicorn askpep.api:create_app --factory --host 0.0.0.0 --port ${PORT:-8000}\"]"
        },
        {
          "kind": "step",
          "id": "c14-s21",
          "title": "The dockerignore keeps secrets and caches out of the image",
          "text": "Create the ignore file. It excludes the virtual environment, git history, your env file and local build output. Leaving the env file out matters most, because an image is easy to push somewhere public by accident.",
          "file": ".dockerignore",
          "lang": "text",
          "code": ".venv\n.git\n.env\n**/__pycache__\n.pytest_cache\n.ruff_cache\nui/node_modules\nui/dist"
        },
        {
          "kind": "quiz",
          "id": "c14-q6",
          "question": "Why does the Dockerfile copy pyproject.toml and uv.lock and run uv sync before copying the source?",
          "options": [
            "Docker requires lock files first.",
            "The dependency layer is cached until the lock changes, so code edits rebuild in seconds.",
            "uv cannot read source files.",
            "It makes the image smaller than any other order."
          ],
          "answer": 1,
          "explain": "Docker caches layers in order. Putting rarely changing inputs first means a source edit only invalidates the layers after it. The frozen flag also makes the build fail if the lock is stale."
        },
        {
          "kind": "step",
          "id": "c14-s22",
          "title": "Set the project and region, enable the APIs and create the registry",
          "text": "You drive every step with gcloud, the Google Cloud command line. Cloud Run, Cloud SQL, Artifact Registry and Secret Manager each need their API switched on. Artifact Registry stores images and Secret Manager stores keys. Set your project and the region europe-west3, enable the APIs and create the registry askpep. Keep these names, because later courses reuse them.",
          "lang": "bash",
          "code": "export PROJECT_ID=your-project-id\nexport REGION=europe-west3\ngcloud config set project $PROJECT_ID\ngcloud config set run/region $REGION\n\ngcloud services enable run.googleapis.com sqladmin.googleapis.com \\\n  artifactregistry.googleapis.com secretmanager.googleapis.com\n\ngcloud artifacts repositories create askpep \\\n  --repository-format=docker --location=$REGION\ngcloud auth configure-docker $REGION-docker.pkg.dev"
        },
        {
          "kind": "step",
          "id": "c14-s23",
          "title": "Build the image for Cloud Run and push it with a commit tag",
          "text": "Tag the image with the git commit, never with latest, so you can trace what runs. Build for amd64, because Cloud Run runs amd64 and an arm64 image from an Apple Silicon Mac fails at start. Nobody ran this build, so the output is typical. If it fails, read the first error. It is usually a stale lock file.",
          "lang": "bash",
          "code": "export IMAGE=$REGION-docker.pkg.dev/$PROJECT_ID/askpep/askpep:$(git rev-parse --short HEAD)\ndocker build --platform linux/amd64 -t $IMAGE .\ndocker push $IMAGE",
          "expect": "...\n => exporting to image\n => => naming to europe-west3-docker.pkg.dev/your-project-id/askpep/askpep:<short commit>"
        },
        {
          "kind": "p",
          "text": "Cloud SQL for PostgreSQL supports pgvector, but only members of the cloudsqlsuperuser role can create an extension. AskPEP's first migration runs CREATE EXTENSION for vector, so you never enable it by hand. The user that runs it must hold that role, and DEPLOY.md marks one doubt about that."
        },
        {
          "kind": "step",
          "id": "c14-s24",
          "title": "Create the Cloud SQL instance, the database and the user",
          "text": "Create a Postgres 17 instance named askpep-pg on the smallest tier, db-f1-micro. Then create a database and a user, both called askpep. The password is a random hex string, so it needs no escaping in a URL. Creating the instance takes several minutes, and it bills while it runs. Stop it between sessions, though storage still bills.",
          "lang": "bash",
          // CHECK: nobody created an instance. Confirm that db-f1-micro, POSTGRES_17 and the enterprise edition work together, that a user made with gcloud sql users create joins cloudsqlsuperuser, and that migration 002 can build its HNSW index on db-f1-micro. If the index fails, move to db-g1-small.
          "code": "export DB_PASSWORD=$(openssl rand -hex 24)\n\ngcloud sql instances create askpep-pg \\\n  --database-version=POSTGRES_17 --edition=enterprise \\\n  --tier=db-f1-micro --region=$REGION\ngcloud sql databases create askpep --instance=askpep-pg\ngcloud sql users create askpep --instance=askpep-pg --password=\"$DB_PASSWORD\""
        },
        {
          "kind": "step",
          "id": "c14-s25",
          "title": "Secrets live in Secret Manager and each workload gets its own service account",
          "text": "Store the four secrets in Secret Manager, never in the repo. The database URL points at a socket that Cloud Run mounts when you attach the instance. Then create two **service accounts**, the identities the service and the job run as. The service reads all four secrets. The job reads only the database URL and the Voyage key.",
          "lang": "bash",
          "code": "export VOYAGE_API_KEY=your-voyage-key\nexport ANTHROPIC_API_KEY=your-anthropic-key\n\nexport API_KEY=$(openssl rand -hex 32)\nexport CONNECTION=$PROJECT_ID:$REGION:askpep-pg\nexport DATABASE_URL=\"postgresql://askpep:$DB_PASSWORD@/askpep?host=/cloudsql/$CONNECTION\"\n\nprintf %s \"$API_KEY\"           | gcloud secrets create askpep-api-key      --data-file=-\nprintf %s \"$DATABASE_URL\"      | gcloud secrets create askpep-database-url --data-file=-\nprintf %s \"$VOYAGE_API_KEY\"    | gcloud secrets create voyage-api-key      --data-file=-\nprintf %s \"$ANTHROPIC_API_KEY\" | gcloud secrets create anthropic-api-key   --data-file=-\n\ngcloud iam service-accounts create askpep-run --display-name=\"AskPEP service\"\ngcloud iam service-accounts create askpep-job --display-name=\"AskPEP ingest job\"\n\nRUN_SA=askpep-run@$PROJECT_ID.iam.gserviceaccount.com\nJOB_SA=askpep-job@$PROJECT_ID.iam.gserviceaccount.com\n\nfor SA in $RUN_SA $JOB_SA; do\n  gcloud projects add-iam-policy-binding $PROJECT_ID \\\n    --member=serviceAccount:$SA --role=roles/cloudsql.client\ndone\n\nfor SECRET in askpep-api-key askpep-database-url voyage-api-key anthropic-api-key; do\n  gcloud secrets add-iam-policy-binding $SECRET \\\n    --member=serviceAccount:$RUN_SA --role=roles/secretmanager.secretAccessor\ndone\nfor SECRET in askpep-database-url voyage-api-key; do\n  gcloud secrets add-iam-policy-binding $SECRET \\\n    --member=serviceAccount:$JOB_SA --role=roles/secretmanager.secretAccessor\ndone"
        },
        {
          "kind": "step",
          "id": "c14-s26",
          "title": "Run the migrations and the ingest once as a Cloud Run job",
          "text": "The job runs the migrations and then the ingest inside Google Cloud. The fetch flag downloads the 18 PEPs inside the job, so the image holds no corpus. Both commands are safe to repeat. Use the same shell as the earlier steps. The wait flag prints a link to the logs, whose last line shows the counts.",
          "lang": "bash",
          // CHECK: the gcloud run jobs create reference takes --args as a comma-separated list and gives no example of running a shell. If the sh -c form fails, create the job through the console, or split the work into two jobs.
          "code": "gcloud run jobs create askpep-ingest \\\n  --image=$IMAGE --service-account=$JOB_SA \\\n  --set-cloudsql-instances=$CONNECTION \\\n  --set-secrets=DATABASE_URL=askpep-database-url:latest,VOYAGE_API_KEY=voyage-api-key:latest \\\n  --command=sh --args=\"-c,askpep migrate && askpep ingest --fetch\" \\\n  --max-retries=0 --task-timeout=15m\n\ngcloud run jobs execute askpep-ingest --wait",
          "expect": "added 18, updated 0, skipped 0, deleted 0"
        },
        {
          "kind": "step",
          "id": "c14-s27",
          "title": "Deploy the service and check the health route",
          "text": "Deploy the service from the same image. Cloud Run mounts the Cloud SQL socket and fills the environment variables from the secrets. The deploy prints the service URL. The script sets BASE to it and calls the health route, which runs a trivial query, so a 200 proves the socket works. The output is typical, not captured.",
          "lang": "bash",
          // CHECK: an organisation policy can block --allow-unauthenticated, and the deploy then fails with a permission error on the IAM policy. Ask the project owner to allow allUsers for this service.
          "code": "gcloud run deploy askpep \\\n  --image=$IMAGE --service-account=$RUN_SA \\\n  --add-cloudsql-instances=$CONNECTION \\\n  --set-secrets=API_KEY=askpep-api-key:latest,DATABASE_URL=askpep-database-url:latest,VOYAGE_API_KEY=voyage-api-key:latest,ANTHROPIC_API_KEY=anthropic-api-key:latest \\\n  --allow-unauthenticated --min-instances=0 --max-instances=3\n\nexport BASE=$(gcloud run services describe askpep --format='value(status.url)')\ncurl $BASE/health",
          "expect": "{\"status\":\"ok\"}"
        },
        {
          "kind": "step",
          "id": "c14-s28",
          "title": "A request without the key gets a 401",
          "text": "Call the search route with no key. You should be refused. If you get a 200, your API key check is off, and anyone can spend your Voyage and Anthropic credit.",
          "lang": "bash",
          "code": "curl -s -o /dev/null -w \"%{http_code}\\n\" -X POST $BASE/search -H 'Content-Type: application/json' -d '{\"query\": \"x\"}'",
          "expect": "401"
        },
        {
          "kind": "step",
          "id": "c14-s29",
          "title": "A request with the key returns hits",
          "text": "Repeat the call with your key in the header and a real query. Your key is the API_KEY value from the secrets step. You should see a hits array. The output is cut to 200 characters.",
          "lang": "bash",
          "code": "curl -s -X POST $BASE/search -H 'X-API-Key: YOUR_API_KEY' -H 'Content-Type: application/json' -d '{\"query\": \"walrus operator\", \"k\": 2}' | head -c 200",
          "expect": "{\"hits\":[{\"chunk_id\":..."
        },
        {
          "kind": "quiz",
          "id": "c14-q7",
          "question": "The deployed /ask answers every question with the refusal text. What do you check first?",
          "options": [
            "The Dockerfile base image.",
            "Whether the index is empty because the ingest step was skipped, then whether the rerank threshold is too high.",
            "The pytest count.",
            "The GitHub Actions cache."
          ],
          "answer": 1,
          "explain": "DEPLOY.md lists these two causes. An empty index returns nothing, so every answer refuses. Run the eval against the deployed database to tell the cases apart."
        },
        {
          "kind": "step",
          "id": "c14-s30",
          "title": "Claude Code connects to the deployed MCP server over HTTP",
          "text": "Register the server with Claude Code, then list servers. The app serves MCP over streamable HTTP at the mcp path, and checks the same key header. Neither command ran in the reference build, which had no live deployment. The listing is typical output. Check the current Claude Code docs for the flag names.",
          "lang": "bash",
          "code": "claude mcp add --transport http askpep $BASE/mcp --header \"X-API-Key: YOUR_API_KEY\"\nclaude mcp list",
          "expect": "askpep: https://YOUR-SERVICE.run.app/mcp (HTTP) - Connected"
        },
        {
          "kind": "step",
          "id": "c14-s31",
          "title": "Codex reads the key from an environment variable",
          "text": "For Codex, add this block to its config file under your home directory and export ASKPEP_API_KEY. The header value comes from that variable. This was not run either.",
          "lang": "toml",
          "code": "[mcp_servers.askpep_remote]\nurl = \"https://YOUR-SERVICE.run.app/mcp\"\nenv_http_headers = { \"X-API-Key\" = \"ASKPEP_API_KEY\" }"
        },
        {
          "kind": "p",
          "text": "What would you swap in production? The API key is one shared secret, and it is the only check in front of paid calls. A real service would use per-user keys or OAuth, rate limits and spend caps. You would also define the infrastructure as code and run the ingest from a deploy pipeline, not by hand."
        },
        {
          "kind": "p",
          "text": "You might move to Google Kubernetes Engine or AWS ECS when you need more control than Cloud Run gives. Chapter 10 covers the operational list."
        },
        {
          "kind": "p",
          "text": "Interviewers often ask you to walk a RAG system from code to production."
        },
        {
          "kind": "callout",
          "tone": "interview",
          "title": "Interviewers ask you to walk a RAG system from code to production",
          "text": "Describe the path you just took. A golden set gates changes, and traces show time and refusals. The container caches layers, a Cloud Run job runs the migrations and the ingest, and secrets live in Secret Manager. Then say what you did not verify, and why. That beats claiming everything worked."
        },
        {
          "kind": "p",
          "text": "AskPEP is now built, gated, traced and deployed. Chapter 15 moves on to advanced patterns such as agentic retrieval and GraphRAG. Each one fixes a named failure, and your golden set is how you find that failure first."
        }
      ]
    }
  ],
  "recap": [
    "A gate is an eval command that exits with code one when recall or MRR drops under a threshold.",
    "The thresholds of 0.8 and 0.5 are first guesses, and on 20 questions one miss moves recall by 0.05.",
    "Run cheap checks always and the paid eval gate only when keys exist, and remember a skipped gate looks green.",
    "One traces table answers where time goes, how often you refuse and which chunks you retrieve most.",
    "LlamaIndex shrinks the code and hides chunk structure, fusion scores and idempotency.",
    "Docker, the Cloud SQL pgvector index on db-f1-micro, the gcloud commands and live Voyage and Claude behaviour were not verified, so check the docs."
  ],
  "reinforcement": "I am becoming a forward-deployed AI engineer. In shipping a RAG system I learned that a labelled golden set gates every change. Traces show where time and refusals go, and anything I did not run myself gets said plainly. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  "interviewIds": [
    "rag-q22",
    "rag-q24",
    "rag-q25",
    "rag-q26",
    "rag-q27",
    "rag-q40"
  ]
};

export default chapter;
