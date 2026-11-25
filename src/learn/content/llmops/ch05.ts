import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "llmops-05-online-evaluation-and-feedback",
  course: "llmops",
  number: 5,
  title: "Production traffic is the eval set you didn't write",
  tagline: "The gate can't see a question nobody wrote. Judge a sample of live traces, collect thumbs, and turn the failures into new items.",
  minutes: 60,
  objectives: [
    "Name the four steps of online evaluation, and say what each one adds to the offline gate.",
    "Sample traces by hashing the trace id, and say why a hash beats a random draw.",
    "Store judge verdicts and user thumbs in one table, and say what makes a trace a failure.",
    "Turn failed traces into unlabelled golden candidates, and say why a person must label them.",
    "Work out how many human labels a review job needs, with the arithmetic shown.",
    "Say why sampling hashes the trace id.",
    "Name what the online judge can't see.",
    "Turn failed traces into labelled items, and count the labelling time.",
    "Write an online review that says what the judge did not read.",
  ],
  sections: [
    {
      id: "s1-the-gap",
      title: "Production asks the questions your golden set never thought of",
      goal: "What does online evaluation add to the offline gate, and what are its four steps?",
      blocks: [
        {
          kind: "p",
          text: "The gate can't see a question nobody wrote. In course 4 the product owner accepted that risk in one line: questions outside the datasets are not measured until course 5.",
        },
        {
          kind: "p",
          text: "The second team's lead has already said the desk refuses packaging questions. No item in the gate asks one. Real users ask other things. They phrase a question oddly, or ask about a PEP you never tested.",
        },
        {
          kind: "p",
          text: "Your golden set holds the questions you thought of. You wrote them before the desk met a user.",
        },
        {
          kind: "p",
          text: "The gate from the evals course is **offline evaluation**. It runs a fixed set before a change ships, and it catches regressions. It can't see a question nobody wrote.",
        },
        {
          kind: "p",
          text: "**Online evaluation** scores the answers the desk gives real users, after release. It watches for drift, the slow change in what users ask and in how well the desk answers. People sit between the two. They label a sample of traffic, and they use those labels to calibrate the judge.",
        },
        {
          kind: "p",
          text: "Every request the desk serves leaves one row in the `traces` table. Each row has a trace id, a 32 character code for that one request. The `done` event that ends every `/ask` stream carries it. A user's thumb finds its trace through that id.",
        },
        {
          kind: "p",
          text: "Online evaluation is a loop of four steps.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Sample a share of recent traces, because judging every one costs too much.",
            "Judge each sampled answer with the judge you calibrated in the evals course.",
            "Collect the judge's scores, and the thumbs that users send, in one table keyed by trace id.",
            "Feed the failures back as candidates, which are new golden items without labels. Then label them, and release a new dataset version.",
          ],
        },
        {
          kind: "p",
          text: "A person closes the loop, and the gate guards what comes out of it. One command, `askpep eval online`, runs the first three steps and writes the candidates. It reads the traces of a recent window, one hour by default. You build it in the lab, one function at a time.",
        },
        {
          kind: "callout",
          tone: "analogy",
          title: "A kitchen tastes its own menu",
          text: "A kitchen tests its dishes before opening night. The tests prove the recipes work. They can't say what a guest will send back. Online evaluation reads the plates that come back, and the golden set learns which recipe to test next.",
        },
        {
          kind: "quiz",
          id: "llmops05-q1",
          question:
            "A change passes the gate. A week later a user asks a question no golden item covers, and the desk answers it badly. Which part of the loop can catch that?",
          options: [
            "The gate, because it ran on the latest dataset version.",
            "Online evaluation, because it scores answers to questions real users asked.",
            "Calibration, because it fixes the thresholds of the judge.",
            "Nothing can, because the desk already passed the gate.",
          ],
          answer: 1,
          explain:
            "The gate runs a fixed set, and this question is not in it. Online evaluation scores a sample of live traces, and a thumbs-down can flag the answer the sample misses.",
        },
        {
          kind: "p",
          text: "The loop needs somewhere to keep what it hears. One table does that.",
        },
      ],
    },
    {
      id: "s2-feedback-row",
      title: "One table holds every verdict, and one key stops duplicates",
      goal: "What does a `Feedback` row hold, and what does its unique key do?",
      blocks: [
        {
          kind: "p",
          text: "The `feedback` table holds every verdict. A **verdict** is one opinion about one trace, from a judge or from a user. The `Feedback` dataclass in `telemetry/feedback.py` holds one, and `record_feedback` stores it.",
        },
        {
          kind: "p",
          text: "The table comes from migration 006. Chapter 1 of this course had you run `askpep migrate`, which applies it.",
        },
        {
          kind: "code",
          lang: "python",
          code: `@dataclass(frozen=True)
class Feedback:
    trace_id: str
    source: str  # "user" or "judge"
    name: str  # "thumbs" for a user, the judge's name otherwise
    score: float
    label: str = ""  # "pass" or "fail" for a judge
    comment: str = ""
    principal_id: str = "owner"`,
          caption: "One verdict. The class rejects a score outside 0 to 1 and an empty trace id.",
        },
        {
          kind: "p",
          text: "The `source` is `user` or `judge`. A user's `name` is `thumbs`. A judge's `name` is the name it runs under, such as `grounded`. The `label` is `pass` or `fail` for a judge.",
        },
        {
          kind: "p",
          text: "The `score` always runs from 0 to 1, so a thumb and a judge share one scale. A thumb is 0 or 1. A judge's score of 1 to 5 maps onto it by subtracting 1 and dividing by 4. So a 4 becomes 0.75.",
        },
        {
          kind: "p",
          text: "The unique key is the trace id, the source, the name and the principal id. A principal, from the guardrails course, is the caller that your API key stands for. The default is `owner`. Saying the same verdict again replaces the old one and returns the same row id.",
        },
        {
          kind: "p",
          text: "A write that inserts or replaces like this is an **upsert**. So a user who changes their mind keeps one row. Two users on one trace get two rows. A judge that runs twice on a trace keeps its latest verdict.",
        },
        {
          kind: "p",
          text: "A user types the `comment`, so `record_feedback` passes it through `redact_pii` before it stores it. You wrote that function in the guardrails course. It masks secrets, card numbers, emails and phone numbers. It doesn't find names.",
        },
        {
          kind: "quiz",
          id: "llmops05-q2",
          question:
            "A user sends a thumbs-down on a trace, then changes their mind and sends a thumbs-up on the same trace. How many rows does `feedback` hold for that user and trace?",
          options: [
            "Two rows, one for each thumb.",
            "One row that still holds the thumbs-down, because the first thumb wins.",
            "One row that now holds the thumbs-up.",
            "No rows, because a changed thumb deletes the earlier one.",
          ],
          answer: 2,
          explain:
            "The trace id, source, name and principal id match, so the insert hits the unique key. It replaces the score, label and comment of the old row, and keeps its id.",
        },
        {
          kind: "p",
          text: "The table can hold a verdict for any trace. Judging every trace costs too much, so the loop takes a sample.",
        },
      ],
    },
    {
      id: "s3-sampling",
      title: "Hashing the trace id gives a sample you can repeat",
      goal: "Why does `sample_traces` hash instead of drawing at random?",
      blocks: [
        {
          kind: "p",
          text: "The desk serves more requests than you can judge. Each judge call costs tokens and takes seconds. So the judges score a **sample**, a fixed share of recent traces. That share is the **sample rate**. At a rate of 0.1, the judges score about one trace in ten.",
        },
        {
          kind: "p",
          text: "Not every row in `traces` is user traffic. Each row has a `route`, which says where the request came from. The routes `ask` and `search` are the HTTP endpoints, and `agent` is a desk run. The routes `cli.ask`, `cli.search`, `mcp.ask` and `mcp.search` come from the command line and the MCP tools.",
        },
        {
          kind: "p",
          text: "Desk runs that eval commands start carry the route `eval`. Chapter 1 of this course set that up. The function `load_rows` reads recent rows from `traces`, and it returns only the request routes. A run the gate started is never judged as if a user had asked it.",
        },
        {
          kind: "p",
          text: "A random draw would give a sample, but you couldn't repeat it. Run the command twice and you would judge different traces. So `sample_traces` hashes the trace id. It takes the sha256 hash of the salt plus the trace id, and reads the first eight hex digits as a number.",
        },
        {
          kind: "p",
          text: "It divides that number by the largest value eight hex digits can hold. The result is the trace's **bucket**, a fixed number between 0 and 1. A trace is in the sample when its bucket is below the rate.",
        },
        {
          kind: "code",
          lang: "python",
          code: `bucket = int(hashlib.sha256(f"{salt}{trace_id}".encode()).hexdigest()[:8], 16) / 0xFFFFFFFF
in_sample = rate >= 1.0 or bucket < rate`,
          caption: "The bucket of a trace. The salt is empty unless you pass one.",
        },
        {
          kind: "p",
          text: "A bucket depends only on the salt and the trace id, so it never changes. That gives the sample four properties.",
        },
        {
          kind: "list",
          items: [
            "The same traces give the same sample every time you run the command.",
            "The sample is nested. Raising the rate from 0.1 to 0.2 keeps every trace of the first sample and adds more.",
            "A different salt gives a different sample at the same rate.",
            "A row with no trace id is never chosen, because no verdict could join back to it.",
          ],
        },
        {
          kind: "widget",
          id: "llmops05-trace-sampler",
          intro:
            "Twelve illustrative traces sit on a line, each at its bucket. Predict what happens at two rates, then drag the rate and watch the sample. Look for the rows that never get in, at any rate.",
        },
        {
          kind: "quiz",
          id: "llmops05-q3",
          question:
            "You run the sampler at a rate of 0.1, then again at 0.2 with the same salt. How do the two samples relate?",
          options: [
            "The 0.2 sample holds every trace of the 0.1 sample, plus more.",
            "The two samples share no traces.",
            "The two samples share about one trace in ten.",
            "The 0.2 sample drops the first sample and draws again.",
          ],
          answer: 0,
          explain:
            "A bucket never changes. A trace is in when its bucket is below the rate, so a higher rate can only add traces.",
        },
        {
          kind: "p",
          text: "The sample is fixed and repeatable. Next the judge reads it.",
        },
      ],
    },
    {
      id: "s4-online-judge",
      title: "The judge reads only what the desk retrieved, so it can't see a miss",
      goal: "What can the calibrated judge see on a live trace, and what can't it see?",
      blocks: [
        {
          kind: "p",
          text: "The judge is the one you built in the evals course. `RubricJudge` reads a question, an answer and the source passages. It returns a score from 1 to 5, a pass flag and a rationale. A score of 4 or more passes. `online_judges` runs it under the name `grounded`, on the `judge` model.",
        },
        {
          kind: "p",
          text: "That judge can run online because it needs no answer key. A metric like recall at 6 needs `expected_docs`, and a live question has none. The judge needs only the question, the answer and the sources. So it grades real traffic with the same rubric it used offline.",
        },
        {
          kind: "p",
          text: "Calibrate it first. The evals course set a rule on 24 labelled cases. Cohen's kappa must be at least 0.6, and false passes at most 10 percent of the judge's passes. A judge that fails the rule gives numbers that look like measurements and aren't. Online, nobody checks each verdict, so the calibration is all you have.",
        },
        {
          kind: "p",
          text: "Your `JUDGE-CARD` from course 4 records a kappa of 0.83 and one false pass in 14. It also says it reopens if the model or the rubric changes. So the judge you run here is the one that card describes.",
        },
        {
          kind: "p",
          text: "`run_online_judges` leaves out a row with no answer, a row with an error, and a run that paused for approval. A request that a guard blocked has no answer, so the judge never sees it. A refusal does have an answer, the fixed refusal text, so the judge scores it.",
        },
        {
          kind: "p",
          text: "It also leaves out a row whose sources load empty. A judge with no passages fails the answer for want of evidence. That says nothing about the answer. A cache hit has no retrieved ids. Neither has a desk run, because its searches write their own traces.",
        },
        {
          kind: "p",
          text: "`load_sources` fetches the passages that each trace retrieved, by chunk id. For each row and each judge, `run_online_judges` returns one `Feedback`. Its score is the judge's 1 to 5 mapped onto 0 to 1, and its comment is the rationale.",
        },
        {
          kind: "p",
          text: "Each verdict also writes a trace, on the route `eval.judge`, so the judge's tokens count towards the cost. That route is not a request route, so no SLO, no online sample and no cost per task counts it. `askpep cost` prints the spend on a line of its own.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "The judge can't see what retrieval missed",
          text: "The judge sees only the chunks the trace retrieved. Suppose retrieval returned chunks that don't help, and the desk refused. The rubric says a refusal is correct when the sources lack the answer, so the judge passes it. A user who knows the answer exists may press thumbs-down. That is why the loop collects thumbs too.",
        },
        {
          kind: "p",
          text: "A judge error isn't caught. One failed model call stops the run, and `askpep eval online` exits with code 2. Nothing from that run is stored.",
        },
        {
          kind: "fold",
          tone: "trouble",
          title: "The judge gets the question as the user typed it",
          text: "`run_online_judges` passes the query exactly as the `traces` table stores it. Chapter 5 of the guardrails course warned that this column holds questions as typed. A question with an email in it reaches the judge model unredacted. Redaction happens only when a question becomes a candidate. If that matters in your deployment, redact the query before judging.",
        },
        {
          kind: "quiz",
          id: "llmops05-q4",
          question:
            "Retrieval found nothing useful for a question, so the desk returned its fixed refusal. The answer exists in the corpus. What does the `grounded` judge usually do with that trace?",
          options: [
            "Fails it, because a refusal has no citations.",
            "Skips it, because a refusal has no answer.",
            "Raises an error, because there is nothing to score.",
            "Passes it, because the sources hold no answer and a refusal is then correct.",
          ],
          answer: 3,
          explain:
            "A refusal has an answer, the refusal text, so the judge scores it. It sees only the chunks that were retrieved. Those lacked the answer, so the rubric calls the refusal correct. Only a thumb can catch the miss.",
        },
        {
          kind: "p",
          text: "The judge misses what retrieval missed. A person pressing a thumb can catch that.",
        },
      ],
    },
    {
      id: "s5-thumbs",
      title: "A thumbs-down is rare and specific, and it catches what the judge misses",
      goal: "What does `POST /feedback` take, and what does it check?",
      blocks: [
        {
          kind: "p",
          text: "Users rate few answers. The ones who do are often annoyed or delighted, and rarely neutral. Chapter 10 of the RAG course made the same point. So a thumbs-up rate says little. A thumbs-down says one specific thing: one person thinks this trace failed.",
        },
        {
          kind: "p",
          text: "The desk takes a thumb at `POST /feedback`. The body holds the `trace_id` from the answer's `done` event, a `score` of 0 or 1, and an optional `label` and `comment`. The `X-API-Key` header says who is rating. The route stores a `Feedback` with source `user` and name `thumbs`.",
        },
        {
          kind: "code",
          lang: "python",
          code: `class FeedbackRequest(BaseModel):
    """A thumb on one answer. \`trace_id\` is the one the answer's \`done\` event carried."""

    trace_id: str = Field(min_length=1, max_length=64, pattern=r"^[A-Za-z0-9_.:-]+$")
    score: Literal[0, 1]  # 0 is a thumbs down, 1 is a thumbs up
    label: str = Field(default="", max_length=40)
    comment: str = Field(default="", max_length=1000)`,
          caption: "The body of a thumb. A trace id has 1 to 64 characters from letters, digits, underscore, dot, colon and hyphen. A score other than 0 or 1 is rejected.",
        },
        {
          kind: "list",
          items: [
            "A good call returns the id of the stored row, such as `{\"id\": 12}`.",
            "A bad API key returns 401.",
            "A bad score or trace id returns 422, and nothing is stored.",
            "With no database the route returns 503, because local mode keeps no trace table.",
          ],
        },
        {
          kind: "p",
          text: "The principal comes from the key, and never from the body. The `API_KEY` in your `.env` is the admin key, so it rates as `owner`. A second key rates as its own principal, with its own row on the same trace.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "The route doesn't check that the trace exists",
          text: "A thumb for an unknown trace id is stored anyway. `golden_candidates` joins thumbs to traces, so it ignores the orphan. A client bug that sends the wrong id loses its thumbs without an error.",
        },
        {
          kind: "step",
          id: "llmops05-s01",
          title: "Send one thumbs-down for a real trace",
          text: "Do this after lab step 5. Start the API, ask one question with curl, and copy the `trace_id` from the `done` event. Post a thumbs-down for it, then post the same body again to see the same id come back. Paste your key from `API_KEY` in `.env` into the command. Don't export it.",
          lang: "bash",
          code: `# Terminal 1.
STORE=pg uv run askpep serve

# Terminal 2. Replace YOUR_API_KEY with the API_KEY value from .env.
curl -N -X POST http://localhost:8000/ask \\
  -H "X-API-Key: YOUR_API_KEY" -H "Content-Type: application/json" \\
  -d '{"question": "Which PEP added f-strings?"}'

# Copy the trace_id from the last event, then post the thumb.
curl -X POST http://localhost:8000/feedback \\
  -H "X-API-Key: YOUR_API_KEY" -H "Content-Type: application/json" \\
  -d '{"trace_id": "PASTE_TRACE_ID", "score": 0, "label": "wrong-pep", "comment": "It never named PEP 498."}'`,
          expect: `event: done
data: {"answer": "...", "citations": [...], "refused": false, "trace_id": "9f2c41d07ab3e5c1d86f0a3b7e21c4d5"}

{"id": 1}`,
        },
        {
          kind: "quiz",
          id: "llmops05-q5",
          question: "A client posts a `score` of 2 to `/feedback`. What comes back?",
          options: [
            "A 200 response, with the score stored as 1.",
            "A 422 response, and nothing is stored.",
            "A 401 response, because the key can't rate.",
            "A 503 response, because the score needs the database.",
          ],
          answer: 1,
          explain:
            "`score` is typed `Literal[0, 1]`, so the request body fails validation before the route runs. FastAPI returns 422, and no row is stored.",
        },
        {
          kind: "p",
          text: "Judges and thumbs both name failures. The next section turns those failures into candidates.",
        },
      ],
    },
    {
      id: "s6-candidates",
      title: "A failed trace becomes a golden candidate, and a person decides if it stays",
      goal: "Which traces become candidates, and why does each one need a human label?",
      blocks: [
        {
          kind: "p",
          text: "A trace **failed** when any verdict on it has the label `fail`, or comes from a user with a score of 0. One failing signal is enough, even when another verdict passed.",
        },
        {
          kind: "p",
          text: "`golden_candidates` turns each failed trace into a `GoldenItem`, the item type of the golden sets from the evals course. The id is `prod-` plus the first 12 characters of the trace id. The question is the trace's query, redacted. The `expected_docs` list is empty, and `source` is `production`.",
        },
        {
          kind: "p",
          text: "The evals course reserved that `source` value. The field says where an item came from, and it can be `golden-v1`, `human`, `synthetic` or `production`. Until now nothing wrote `production`. Once a person labels these items, they join the error-analysis loop from the evals course.",
        },
        {
          kind: "code",
          lang: "json",
          code: `{"id": "prod-9f2c41d07ab3", "question": "Which PEP added f-strings?", "expected_docs": [], "answerable": true, "slice": "answer", "expected_route": null, "reference_answer": null, "expected_tools": [], "expected_args": {}, "max_steps": null, "attack": null, "expected_outcome": null, "source": "production"}`,
          caption: "One line of the file `evals/candidates/production.jsonl`. The trace id is made up. A person still has to fill in the expected docs and the reference answer.",
        },
        {
          kind: "p",
          text: "A candidate has a real question and no answer key. The verdict says the answer was bad. It doesn't say which PEP holds the right one. A person must read the question and write `expected_docs`. Without it, `validate_item`, the labelling check from the evals course, rejects the item. Then `release_version` refuses the file.",
        },
        {
          kind: "p",
          text: "Don't ask a model to fill the labels in. The model that got the question wrong would mark its own work, and the golden set would keep the mistake.",
        },
        {
          kind: "p",
          text: "Duplicates drop out. `golden_candidates` takes a list of `known` questions, the ones the golden set already holds. It skips a question in `known`, and a question that an earlier candidate has. Both checks ignore case and extra spaces, and they run on the redacted text. The match is exact, so a paraphrase gets through.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Two things the candidate file does not check",
          text: "First, `eval online` passes the questions of `evals/golden.jsonl` and `evals/datasets/answer/v1.jsonl` as `known`. A question in either file is dropped, but a reworded one is not. Read each candidate for a paraphrase of an item you hold. Second, `redact_pii` can't find names. Remove names before you release a version, because the version is committed.",
        },
        {
          kind: "widget",
          id: "llmops05-candidate-triage",
          intro:
            "Eight illustrative traces from one hour of traffic. Decide for each one whether `golden_candidates` returns it, then read why. Watch what the judge and the thumb each add, and what still keeps a trace out.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Explain how you would improve an eval set from production",
          text: "Describe the loop. Sample live traces, score them with a calibrated judge, and collect user thumbs. Turn the failures into candidates, and have a person label them. Release a new dataset version and let the gate guard it. Add two cautions: redact the questions, and drop duplicates.",
        },
        {
          kind: "quiz",
          id: "llmops05-q6",
          question:
            "A candidate still has an empty `expected_docs`. What does `release_version` do with a file that holds it?",
          options: [
            "It releases the file and flags the item for later.",
            "It releases the file without that item.",
            "It raises `ValueError` that names the item and the rule, and releases nothing.",
            "It asks the judge model to fill in the labels.",
          ],
          answer: 2,
          explain:
            "`release_version` reads the file with `check_items`, which applies `validate_item` to every item. An answerable item with no `expected_docs` breaks a rule, so the error names it and nothing is released.",
        },
        {
          kind: "p",
          text: "Each candidate needs a person, so it helps to count what that costs.",
        },
      ],
    },
    {
      id: "s7-labels",
      title: "A person can't audit the rate by hand, so labels go to candidates and calibration",
      goal: "How many human labels do three review jobs need, and where do labels pay off?",
      blocks: [
        {
          kind: "p",
          text: "Someone has to read production traffic. How many traces must a person label? The answer depends on the question you ask. Three jobs give three very different numbers.",
        },
        {
          kind: "p",
          text: "The first job is to measure the rate. Say you want the judge's false-pass rate within 3 points, at 95 percent confidence. The formula needs the rate itself, so guess it. At a guess of 10 percent, a person must label 385 of the judge's passes. Call that a rate audit.",
        },
        {
          kind: "code",
          lang: "text",
          code: `N = 1.96² × p × (1 − p) / margin²

p = 0.10, margin = 0.03:  N = 3.84 × 0.10 × 0.90 / 0.0009 = 384.2, so 385 labels
p = 0.10, margin = 0.05:  N = 138.3, so 139 labels
p = 0.50, margin = 0.05:  N = 384.2, so 385 labels`,
          caption: "Labels to measure a rate within a margin, at 95 percent confidence.",
        },
        {
          kind: "p",
          text: "Halving the margin quadruples the labels. Near a rate of one half, the margin is about 1 over the square root of N. So 100 labels give a margin of 10 points, and 400 labels give 5.",
        },
        {
          kind: "p",
          text: "The second job is to see one failure at all. A failure that happens 2 percent of the time escapes one label with chance 0.98. It escapes all N labels with chance 0.98 to the power N.",
        },
        {
          kind: "p",
          text: "For a 95 percent chance of seeing it at least once, you need 149 labels. A quick rule is 3 divided by the rate, which gives 150.",
        },
        {
          kind: "code",
          lang: "text",
          code: `0.05 = 0.98^N
N = ln(0.05) / ln(0.98) = 148.3, so 149 labels`,
          caption: "Labels to see a 2 percent failure at least once, with 95 percent chance.",
        },
        {
          kind: "p",
          text: "The third job is to see a rise between two windows. Say the failure rate goes from 10 to 15 percent. The evals course set the noise band at two standard errors of the gap, about 2.8 of one rate. A 5 point gap must clear it. At the midpoint rate of 12.5 percent, each window needs 343 labels.",
        },
        {
          kind: "code",
          lang: "text",
          code: `N per window = 2.8² × p × (1 − p) / gap²

p = 0.125, gap = 0.05:  N = 7.84 × 0.109 / 0.0025 = 343 labels
two windows:            686 labels, about 34 hours at 3 minutes each`,
          caption: "Labels to see a rise of 5 points. The 3 minutes a label is an assumption.",
        },
        {
          kind: "widget",
          id: "llmops05-label-budget",
          intro:
            "Predict first how many labels the rate audit needs. Then move the sliders to cost each job in labels and hours. Watch which jobs grow fastest as you shrink the margin or the rise.",
        },
        {
          kind: "p",
          text: "Nobody labels 686 traces to compare one week with the last. So people don't watch the rate. The judge does. People spend their labels where the judge can't help.",
        },
        {
          kind: "list",
          items: [
            "They calibrate the judge on a labelled set, then check it each month on a small pool of its passes.",
            "They relabel candidates, because only a person can say which PEP answers a failed question.",
          ],
        },
        {
          kind: "p",
          text: "Here is a worked example. Its numbers are assumptions, not measurements. The desk serves 2,000 requests a day, and the sample rate is 0.1. The judge scores 200 answers. If 10 percent fail, that is 20 failures.",
        },
        {
          kind: "code",
          lang: "text",
          code: `2,000 requests a day × 0.10 sample rate  = 200 judged answers
200 × 0.10 failure rate                   = 20 judge failures
20 + 5 thumbs-down                        = about 25 candidates a day, before duplicates
25 × 3 minutes                            = 75 minutes a day`,
          caption: "A worked example of the daily labelling queue.",
        },
        {
          kind: "p",
          text: "The sample rate is a labour setting as well as a cost setting. Double it and the judge's share of the queue doubles. If nobody has 75 minutes a day, lower the rate and label what the thumbs send.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "How many human labels does a team need?",
          text: "Say it depends on the question. Measuring a failure rate near 10 percent within 3 points needs about 385 labels. Seeing a rise from 10 to 15 percent between two windows needs about 690. Then say a team shouldn't label the rate by hand. It should calibrate a judge and label the candidates.",
        },
        {
          kind: "quiz",
          id: "llmops05-q7",
          question:
            "A team wants to see a failure rate rise from 10 to 15 percent between two windows. About how many labels does that take in all?",
          options: [
            "About 690, from 343 in each window.",
            "About 385, the same as one rate audit.",
            "About 150, three divided by the rate.",
            "About 25, one day of candidates.",
          ],
          answer: 0,
          explain:
            "A gap is noisier than a single rate, so the noise band is two standard errors of the gap, about 2.8 of one rate. With the rate at 12.5 percent, each window needs 343 labels. Two windows need 686.",
        },
        {
          kind: "p",
          text: "You know what the loop needs. One command runs it.",
        },
      ],
    },
    {
      id: "s8-the-command",
      title: "One command runs the loop, and a person closes it",
      goal: "What does `askpep eval online` report, and how do candidates get released?",
      blocks: [
        {
          kind: "p",
          text: "`askpep eval online` runs the loop. It reads the `traces` table, so it needs `STORE=pg`. Without it the command prints a message and exits with code 1. The option `--sample-rate` sets the rate. The setting `online_eval_sample_rate` supplies it by default, and it is 0.1.",
        },
        {
          kind: "p",
          text: "The environment variable `ONLINE_EVAL_SAMPLE_RATE` changes that setting. The option `--since` sets the window, and the default is one hour. It takes a number followed by m, h or d, for minutes, hours or days.",
        },
        {
          kind: "code",
          lang: "bash",
          code: `STORE=pg uv run askpep eval online --sample-rate 0.2 --since 1h`,
          caption: "Judge about one trace in five from the last hour.",
        },
        {
          kind: "p",
          text: "In order, the command loads the rows of the window and samples them. It judges the sample and stores each verdict. It then reads every user thumb in the window, whether that trace was sampled or not.",
        },
        {
          kind: "p",
          text: "It passes the verdicts and the thumbs to `golden_candidates`. Then `write_candidates` appends the result to `evals/candidates/production.jsonl`, and skips any id the file already holds.",
        },
        {
          kind: "p",
          text: "A model error, an unreadable file or a bad value exits with code 2. The command closes the services it opened in every case, with `close_eval` from the evals course. Then it prints a report.",
        },
        {
          kind: "code",
          lang: "json",
          code: `{
  "traces": 212,
  "sampled": 23,
  "no_sources": 2,
  "verdicts": 21,
  "failed": 3,
  "candidates": 4,
  "candidates_file": "evals/candidates/production.jsonl"
}`,
          caption: "An illustrative report. Your numbers will differ.",
        },
        {
          kind: "compare",
          caption: "The seven keys of the report.",
          columns: ["Key", "What it counts"],
          rows: [
            ["traces", "Rows from the request routes in the window."],
            ["sampled", "Rows that `sample_traces` chose."],
            ["no_sources", "Sampled rows the judge left out, because their sources were empty."],
            ["verdicts", "Judge verdicts stored. A skipped row gives none."],
            ["failed", "Verdicts with the label `fail`."],
            ["candidates", "New items written to the file, after duplicates drop out."],
            ["candidates_file", "The path of the file."],
          ],
        },
        {
          kind: "fold",
          tone: "hood",
          title: "A busy window loses its oldest rows",
          text: "`load_rows` returns the newest 5,000 rows of the window, oldest first. A busy window loses its oldest rows without a warning. At 2,000 requests a day, a window of seven days holds 14,000 rows, and the command sees only the newest 5,000. Keep the window short enough to fit.",
        },
        {
          kind: "p",
          text: "Run the command again on the same window and it judges the same traces again, which costs model calls again. The upsert replaces each earlier verdict, so the `feedback` table does not grow. The `traces` table does, because each verdict writes a judge trace.",
        },
        {
          kind: "p",
          text: "Desk runs from the gate carry the route `eval`, so running the gate first adds no candidates.",
        },
        {
          kind: "step",
          id: "llmops05-s02",
          title: "Run the loop on your own traces",
          text: "Do this after lab step 6. Run `askpep eval online` over the last hour, with a rate of 1 so that it judges every trace. That costs one judge call for each trace with sources, so ask only a few questions first. Then read the candidates file, and look for names in each question.",
          lang: "bash",
          code: `STORE=pg uv run askpep eval online --sample-rate 1 --since 1h
cat evals/candidates/production.jsonl`,
          expect: `{
  "traces": 4,
  "sampled": 4,
  "no_sources": 0,
  "verdicts": 4,
  "failed": 1,
  "candidates": 2,
  "candidates_file": "evals/candidates/production.jsonl"
}
{"id": "prod-9f2c41d07ab3", "question": "Which PEP added f-strings?", "expected_docs": [], ...}`,
        },
        {
          kind: "p",
          text: "A person closes the loop. Read each candidate, and fill in `expected_docs` and a `reference_answer` for the ones worth keeping. Delete the rest. `release_version` copies one file as the next version, so the new file must hold the current items plus your labelled ones.",
        },
        {
          kind: "step",
          id: "llmops05-s03",
          title: "Label the candidates and release a new answer version",
          text: "Do this once the candidates file has entries. Copy the candidates worth keeping into `evals/candidates/labelled.jsonl`, and fill in `expected_docs` and `reference_answer` for each one. Save this script as `scratch/release_candidates.py` and run it. It writes a draft of the current answer items plus yours, and releases the draft as the next version.",
          lang: "python",
          code: `# scratch/release_candidates.py
# Run it with: uv run python scratch/release_candidates.py
# Then check it with: uv run python -m askpep.evals.datasets versions
import json
from dataclasses import asdict
from pathlib import Path

from askpep.evals.datasets import load_dataset, release_version
from askpep.evals.retrieval import load_golden

LABELLED = Path("evals/candidates/labelled.jsonl")
DRAFT = Path("evals/candidates/answer-next.jsonl")

current = load_dataset("answer")
labelled = load_golden(LABELLED)
lines = [json.dumps(asdict(item)) for item in [*current, *labelled]]
DRAFT.write_text("\\n".join(lines) + "\\n", encoding="utf-8")
print(release_version("answer", DRAFT))`,
          expect: `v2`,
        },
        {
          kind: "p",
          text: "The command `versions` now lists the answer slice at v2, and the other slices stay at v1. The next `askpep eval gate` run scores the new version, so `answer_pass` must stay above its floor on your production questions too.",
        },
        {
          kind: "p",
          text: "The eval plan from course 4 adds one rule here. A new dataset version needs a new baseline, or later reports have nothing to compare with. The cloud course later uses online evaluation to judge a canary release, which sends a small share of traffic to a new version first.",
        },
        {
          kind: "p",
          text: "The loop is built. On Thursday evening it reads the pilot for the first time.",
        },
      ],
    },
    {
      id: "s9-online-review",
      title: "The judge saw a third of the pilot, and thumbs found the packaging gap",
      goal: "What did the first online review find, and what changed because of it?",
      blocks: [
        {
          kind: "p",
          text: "The judge saw a third of the pilot, and the thumbs found what it missed. A first online review needs a note that says what was read, what was not and what changed. This chapter's note covers the pilot's first three days.",
        },
        {
          kind: "p",
          text: "At six o'clock on Thursday 26 November you run the loop over all three days, with half the traces sampled.",
        },
        {
          kind: "code",
          lang: "bash",
          code: `STORE=pg uv run askpep eval online --sample-rate 0.5 --since 3d`,
          caption: "Thursday's run, over Tuesday to Thursday.",
        },
        {
          kind: "code",
          lang: "text",
          code: `{
  "traces": 600,
  "sampled": 297,
  "no_sources": 201,
  "verdicts": 90,
  "failed": 11,
  "candidates": 12,
  "candidates_file": "evals/candidates/production.jsonl"
}`,
          caption: "The report. The figures belong to the story.",
        },
        {
          kind: "p",
          text: "Read `no_sources` first. Of 297 sampled traces, 201 had no retrieved ids. Those are desk runs, because their searches write their own rows. So the judge reads only `/ask`, which is 96 of the sample. Six of those had no answer or an error, which leaves 90 verdicts.",
        },
        {
          kind: "p",
          text: "Desk runs are 68% of the pilot's traffic. On those, thumbs are the only signal of quality. The product owner should hear that before reading any pass rate.",
        },
        {
          kind: "p",
          text: "The judge failed 11 of 90, which is 12%. Users sent five thumbs-down, and two of those were on answers the judge had also failed. That makes 11 plus 5 minus 2, or 14 failed traces. Two were repeats of a question already seen, so the file holds 12 candidates.",
        },
        {
          kind: "p",
          text: "Twelve candidates at three minutes each is 36 minutes of labelling. You do it that evening, and you start with the thumbs.",
        },
        {
          kind: "p",
          text: "Three of the five thumbs-down were packaging questions the desk refused. One was on `/ask`, and the judge had passed the refusal because the sources lacked the answer. Two were desk runs, which the judge never read. Among the judge's own failures, one more packaging answer had guessed. That makes four.",
        },
        {
          kind: "p",
          text: "So the lead's sentence from Wednesday now has a count. The corpus holds 18 PEPs, and none of them covers building or publishing a package. The desk was right to refuse, and the corpus is what falls short.",
        },
        {
          kind: "p",
          text: "You keep nine candidates: the four on packaging and five others. You drop three. One was a rewording of an item the gate already holds. One held a colleague's name, and one was not about PEPs. Each kept item carries its source, as rule 3 of the eval plan says.",
        },
        {
          kind: "p",
          text: "The answer slice goes from 14 items to 23, as `answer/v2`. Rule 5 says a new version needs a new baseline, so you run the gate on the unchanged desk. The old items score 12 of 14, and the new ones score 5 of 9. That is 17 of 23, or 0.74.",
        },
        {
          kind: "p",
          text: "The interval runs from 0.57 to 0.91, and the floor is 0.80, so the gate exits 1. The four packaging items fail, because the corpus lacks the answer. The product owner accepts this report by name as the baseline, as course 4 did for `retrieval/v2`. The floor stays, so the next release must clear it.",
        },
        {
          kind: "p",
          text: "Nine new items also touch an open experiment. `EXPERIMENT-001` needs a gain that clears a noise band, and the band was about 30 points on 14 items. On 23 items it is about 30 times the square root of 14 over 23, or 23 points.",
        },
        {
          kind: "p",
          text: "The gain was 7, so the answer stays not yet. Clearing it would take about 257 items.",
        },
        {
          kind: "p",
          text: "The fix is to add the packaging PEPs to the corpus. Five real ones cover it: PEP 517, 518, 621, 660 and 508. You plan the re-ingest for Friday.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# ONLINE-REVIEW-001.md
Date: 26 November 2026   Window: Tuesday 24 to Thursday 26 November
Sample rate: 0.5   Traces: 600   Sampled: 297

## What the judge read
/ask only: 96 sampled, 6 with no answer or an error, 90 verdicts.
Failed: 11 of 90, 12%.
Judge: the calibrated rubric judge, JUDGE-CARD kappa 0.83.

## What the judge did not read
Desk runs: 201 sampled, no retrieved ids. They are 68% of traffic.
On desk runs, thumbs are the only signal.

## What people said
5 thumbs-down. 3 were packaging questions the desk refused.

## Candidates
Failed traces 14 (11 + 5 - 2). Repeats 2. Candidates 12. Labelling 36 minutes.
Kept 9: 4 packaging, 5 others.
Dropped 3: 1 rewording of a held item, 1 held a colleague's name, 1 not about PEPs.

## Dataset
answer/v2: 23 items. Baseline on the unchanged desk: 17/23 = 0.74.
Interval 0.57 to 0.91. Floor 0.80. Exit 1. Accepted by the product owner as the baseline.

## Finding
The corpus holds no packaging PEP. The refusals were correct, and the corpus falls short.

## Decision
Add PEP 517, 518, 621, 660 and 508 on Friday.
EXPERIMENT-001 stays not yet: band about 23 points on 23 items, gain 7.`,
          caption: "ONLINE-REVIEW-001.md, whole.",
        },
        {
          kind: "p",
          text: "Read the second section before the first. A 12% failure rate sounds like a measure of the desk, and it is a measure of `/ask`. The finding also changed the question. Wednesday's complaint sounded like a broken desk, and the count shows a missing shelf in the library. The operations plan's O3 now has a command behind it.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# ONLINE-REVIEW-(number).md
Date:   Window:
Sample rate:   Traces:   Sampled:

## What the judge read

## What the judge did not read

## What people said

## Candidates
Failed traces:   Repeats:   Candidates:   Labelling time:
Kept:
Dropped, with reasons:

## Dataset
New version:   Baseline:

## Finding

## Decision`,
          caption: "For your next online review: the note, values left blank.",
        },
        {
          kind: "p",
          text: "Nobody runs these commands at three in the morning. How does the desk tell you? Chapter 6 starts there.",
        },
      ],
    },
  ],
  lab: {
    title: "Build the online evaluation loop for AskPEP",
    goal: "Write four functions, one route and one command. Steps 1 to 4 start from stubs that raise `NotImplementedError(\"llmops-05 step N\")`. Steps 5 and 6 edit files you own. The judges are scripted, so nothing calls a model. Steps 1, 5 and 6 need Postgres. If no test collects, repeat the setup from chapter 1. Then compare your files with `capstone/src/askpep/telemetry/feedback.py`.",
    minutes: 90,
    files: [
      "src/askpep/telemetry/feedback.py",
      "src/askpep/api.py",
      "src/askpep/cli.py",
      "src/askpep/config.py",
      "tests/llmops/test_llmops05_online_eval.py",
    ],
    steps: [
      {
        title: "Store one verdict",
        text: "Write `record_feedback` in `feedback.py`. It redacts the comment, then runs one `INSERT` that updates the existing row when the same trace, source, name and principal come again. It returns the row id. The tests need Postgres. The stub raises `llmops-05 step 1`.",
        code: `# src/askpep/telemetry/feedback.py
# The stub leaves these imports out until a step uses them. Add them as you reach each step.
#   import hashlib                                          (step 2)
#   from askpep.guards.pii import redact_pii                (steps 1 and 4)
#   from askpep.telemetry.records import Row, is_finished   (add is_finished, step 3)


def record_feedback(pool, feedback: Feedback) -> int:
    # your turn:
    # 1. Redact the comment. redact_pii returns a tuple, so keep its first item.
    # 2. Open a connection with pool.connection(), as Trace.write does.
    # 3. Run one INSERT INTO feedback (trace_id, source, name, score, label, comment, principal_id).
    #    Add ON CONFLICT (trace_id, source, name, principal_id) DO UPDATE, and set the score, the label
    #    and the comment from EXCLUDED, and ts = now(). End the statement with RETURNING id.
    # 4. Return the id of the row that fetchone() gives.
    ...`,
        test: "uv run pytest tests/llmops -k llmops05_s1",
      },
      {
        title: "Sample traces by hash",
        text: "Write `sample_traces` in `feedback.py`. It rejects a rate outside 0 to 1 and skips a row with no trace id. It keeps a row when its bucket is below the rate, in the input order. Add `import hashlib`. The stub raises `llmops-05 step 2`.",
        code: `# src/askpep/telemetry/feedback.py
def sample_traces(rows: Sequence[Row], rate: float, salt: str = "") -> list[Row]:
    # your turn:
    # 1. A rate below 0 or above 1 raises ValueError.
    # 2. Skip a row whose trace_id is missing or empty.
    # 3. Compute the bucket as section 3 shows. Keep the row when rate >= 1.0 or bucket < rate.
    # 4. Return the kept rows in the order they came.
    ...`,
        test: "uv run pytest tests/llmops -k llmops05_s2",
      },
      {
        title: "Judge each finished answer",
        text: "Write `run_online_judges` in `feedback.py`. It skips a row with no answer, an error, an unfinished run or empty sources, and it adds the last kind to `skipped`. Each judge gives one `Feedback`. With `svc`, each verdict also writes a trace on `JUDGE_ROUTE`. Import `is_finished` and `reporting_to`. The stub raises `llmops-05 step 3`.",
        code: `# src/askpep/telemetry/feedback.py
# Add to the imports: from askpep.guards.protocol import reporting_to
# and: from askpep.telemetry.records import is_finished
def run_online_judges(
    rows: Sequence[Row],
    judges: Mapping[str, AnswerJudge],
    sources_for: Callable[[Row], Sequence[str]],
    svc: "Services | None" = None,
    skipped: list[Row] | None = None,
) -> list[Feedback]:
    # your turn:
    # 1. Skip a row with no answer, a row with an error, and a row that is not is_finished.
    # 2. Get the sources with sources_for(row). The question is row["query"].
    #    A row whose sources are empty is skipped too, and goes onto skipped when it is given.
    # 3. For each judge, in the order of the mapping, call judge(question, answer, sources).
    # 4. Build Feedback(row["trace_id"], "judge", name, (verdict.score - 1) / 4,
    #    "pass" if verdict.passed else "fail", verdict.rationale).
    # 5. Order the result by row, then by judge. Do not catch an error from a judge.
    # 6. With svc, import Trace from askpep.tracing inside the function. Make a
    #    Trace(JUDGE_ROUTE, f"{name} judge of {trace_id}", tracer=svc.tracer) for each verdict, and set
    #    its model to svc.settings.judge_model and its stop_reason to "done". Call the judge inside
    #    "with reporting_to(trace):". Write the trace with trace.write(svc) in a finally block, so a
    #    judge error still leaves a trace. When the judge raised, set trace.error and the stop_reason
    #    "error" first, and raise again.
    ...`,
        test: "uv run pytest tests/llmops -k llmops05_s3",
      },
      {
        title: "Turn failures into candidates",
        text: "Write `golden_candidates` in `feedback.py`. A trace failed on a `fail` label or a user score of 0. Each failed trace in `rows` becomes an unlabelled `GoldenItem` with `source=\"production\"`. Drop a known or repeated question, ignoring case and spaces. Import `redact_pii`. The stub raises `llmops-05 step 4`.",
        code: `# src/askpep/telemetry/feedback.py
def golden_candidates(
    rows: Sequence[Row], feedback: Sequence[Feedback], known: Sequence[str] = ()
) -> list[GoldenItem]:
    # your turn:
    # 1. failed = the trace ids with a "fail" label, or from a "user" with a score of 0.
    # 2. seen = the questions in known, passed through _normal, which ships in your stub.
    # 3. For each row in order whose trace_id is in failed, redact the query with redact_pii.
    #    Skip it when _normal(question) is in seen. Otherwise add it to seen.
    # 4. Make GoldenItem(id=f"prod-{trace_id[:12]}", question=question, expected_docs=[],
    #    answerable=True, slice="answer", source="production").
    ...`,
        test: "uv run pytest tests/llmops -k llmops05_s4",
      },
      {
        title: "Take thumbs on a feedback route",
        text: "Add `FeedbackRequest` and the `/feedback` route to `api.py`. The route stores a user verdict named `thumbs` for the caller's principal and returns the row id. With no pool it raises a 503. Import `Feedback` and `record_feedback`. The test raises `llmops-05 step 5` until the route exists.",
        code: `# src/askpep/api.py
# Add to the imports: from askpep.telemetry.feedback import Feedback, record_feedback
# Add Literal to your typing import if it is not there.


class FeedbackRequest(BaseModel):
    """A thumb on one answer. \`trace_id\` is the one the answer's \`done\` event carried."""

    # your turn: four fields.
    # trace_id: a str of 1 to 64 characters that match ^[A-Za-z0-9_.:-]+$
    # score: Literal[0, 1], where 0 is a thumbs down
    # label: a str, default "", at most 40 characters
    # comment: a str, default "", at most 1000 characters


# Inside create_app, beside the other routes:
    @app.post("/feedback")
    def feedback_route(body: FeedbackRequest, who: Annotated[Principal, Depends(require_key)]) -> dict:
        """Store a thumb from the caller for one trace. Sending it again replaces the earlier thumb."""
        # your turn:
        # 1. With no pool, svc.pool is None. Raise HTTPException(status_code=503,
        #    detail="Feedback needs the database.").
        # 2. Build Feedback(body.trace_id, "user", "thumbs", float(body.score), body.label,
        #    body.comment, who["user_id"]).
        # 3. Return {"id": record_feedback(svc.pool, thumb)}.
        ...`,
        test: "uv run pytest tests/llmops -k llmops05_s5",
      },
      {
        title: "Add askpep eval online",
        text: "Add the `online_eval_sample_rate` setting to `config.py`, then the `eval online` command to `cli.py`. It samples, judges, stores the verdicts, adds every recent thumb, and writes the candidates. It needs the Postgres store. The test raises `llmops-05 step 6` until the command exists. Then add the judge line to `askpep cost`.",
        code: `# src/askpep/cli.py
# First add one setting to Settings in src/askpep/config.py, beside trace_redact:
#     online_eval_sample_rate: float = 0.1  # the share of traces the online judges score
#
# Import inside the function: json, GOLDEN and load_golden from askpep.evals,
# DATASETS from askpep.evals.datasets, ProviderError from askpep.providers,
# the module askpep.telemetry.feedback as fb, and load_rows and parse_since from
# askpep.telemetry.records.


@eval_app.command("online")
def eval_online(
    sample_rate: Annotated[
        float | None, typer.Option("--sample-rate", help="Default: ONLINE_EVAL_SAMPLE_RATE.")
    ] = None,
    since: Annotated[
        str, typer.Option("--since", help="How far back to look, such as 30m, 1h or 7d.")
    ] = "1h",
) -> None:
    """Judge a sample of recent traces and store the verdicts. A failed verdict, and a thumbs-down from a
    user on any recent trace, becomes a golden candidate."""
    # your turn:
    # 1. svc = open_services(). Call close_eval(svc) in a finally block.
    # 2. With no svc.pool, print "Online evaluation reads the traces table. Set STORE=pg." to stderr
    #    and exit with code 1.
    # 3. rate = the option, or svc.settings.online_eval_sample_rate when the option is None.
    # 4. window = parse_since(since). rows = load_rows(svc.pool, window). chosen = fb.sample_traces(rows, rate).
    # 5. no_sources = an empty list. verdicts = fb.run_online_judges(chosen, fb.online_judges(svc),
    #    a lambda that returns fb.load_sources(svc.pool, row.get("retrieved_ids") or []), svc, no_sources).
    #    Store each verdict with fb.record_feedback.
    # 6. thumbs = the user verdicts from fb.load_feedback(svc.pool, window). Every recent thumb counts,
    #    whether or not that trace was sampled.
    # 7. known = the questions of load_golden(path) for GOLDEN and for DATASETS / "answer" / "v1.jsonl",
    #    with DATASETS from askpep.evals.datasets. Treat an OSError on one file as no questions from it.
    #    written = fb.write_candidates(fb.golden_candidates(rows, [*verdicts, *thumbs], known)).
    # 8. OSError, ValueError, KeyError and ProviderError print the message to stderr and exit with code 2.
    # 9. Print a JSON report with indent=2 and exactly these keys: traces, sampled, no_sources
    #    (len(no_sources)), verdicts, failed, candidates and candidates_file.
    ...


# Then edit cost in the same cli.py, so askpep cost shows the judges on a line of their own.
# 10. Import JUDGE_ROUTE from askpep.telemetry.feedback, and row_usage and usage_cost from
#     askpep.telemetry.cost. Both functions ship complete in the stub.
# 11. In the try, after per_task, read the judge traces:
#     judged = load_rows(svc.pool, parse_since(since), routes=[JUDGE_ROUTE]).
#     judge_usd = the sum of usage_cost(prices, row_usage(r)) over judged.
# 12. Last, when judged is not empty, print
#     f"online judges: {len(judged)} verdicts, {judge_usd:.4f} usd, not in the figures above".`,
        test: "uv run pytest tests/llmops -k llmops05_s6",
      },
    ],
    verify: "uv run pytest tests/llmops -k llmops05",
  },
  recap: [
    "Online evaluation scores live traffic after release, while the offline gate runs a fixed set before it.",
    "A verdict from a judge or a user is one row keyed by trace id, source, name and principal, so a repeat replaces it.",
    "`sample_traces` hashes the trace id, so the sample is repeatable and only grows as the rate rises.",
    "The judge sees only what the desk retrieved, so a thumbs-down catches the misses it can't.",
    "A failed trace becomes an unlabelled candidate with `source` production, and a person labels it before `release_version` accepts it.",
    "About 385 labels measure a rate near 10 percent within 3 points. So people calibrate the judge and relabel candidates, and the judge watches the rate.",
    "`ONLINE-REVIEW-001.md` shows the judge read only `/ask`, and thumbs found that the corpus holds no packaging PEP. `answer/v2` has 23 items and a baseline of 0.74.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In online evaluation I learned to sample live traces into a calibrated judge, collect thumbs, and turn failures into golden candidates that a person labels. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["llmops-q19", "llmops-q20", "llmops-q21"],
};

export default chapter;
