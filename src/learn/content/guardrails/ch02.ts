import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "guardrails-02-guardrails-ai-output",
  course: "guardrails",
  number: 2,
  title: "Validate every answer before the user sees it",
  tagline: "How do you stop the desk from sending an answer its sources do not support?",
  minutes: 65,
  objectives: [
    "Tell the Guardrails AI `Guard` from the AskPEP `Guard` protocol.",
    "Say what a validator and an `on_fail` action are.",
    "Write `CitationsRetrieved`, and say what it catches and what it misses.",
    "Choose between reask, fix and refuse by what each one gives the user and what it costs.",
    "Turn a Guardrails AI outcome into allow, modify or block, so the chain needs no library types.",
    "Run the output guard in `run_desk`, save the guarded text to the thread, and hold the stream until the check ends.",
    "Say what the citation check misses, and where each gap gets covered.",
    "Decide an output policy from a replay of logged answers, and write the decision down.",
  ],
  sections: [
    {
      id: "s1-last-stop",
      title: "The output stage is the last place to stop a made-up citation",
      goal: "What can a finished answer get wrong, and which failure does this chapter check?",
      blocks: [
        {
          kind: "p",
          text: "Chapter 1 gave you a protocol for guards, a chain and a threat model with nine open rows. This chapter closes row T4 by building the first real guard, for the `output` stage. It runs after the model has written its answer and before the user reads it.",
        },
        {
          kind: "p",
          text: "Here is the case it protects. A user asks what PEP 572 says about the walrus operator, `:=`. The desk retrieves two passages and numbers them. Source 1 is the PEP's abstract, and source 2 is its rationale.",
        },
        {
          kind: "p",
          text: "An answer cites a passage as `[1]` or `[2]`. The user can open that passage and check the sentence against it.",
        },
        {
          kind: "p",
          text: "Now the model writes this answer: \"Assignment expressions bind a name inside an expression [1]. They use `:=` [4].\" There is no source 4. The sentence may even be true. The user can't check it, and the desk can't say where it came from.",
        },
        {
          kind: "p",
          text: "Course 1 already records the numbers that match no source, in `invalid_citations`. It only records them. The desk's result lists just the citations that match a source, but the answer text still says `[4]`. Nothing has stopped it yet.",
        },
        {
          kind: "p",
          text: "A finished answer can fail in three ways at this point.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "It cites a number with no source, such as `[4]` when two sources exist. Code can check this.",
            "It cites nothing. Code can see that no marker is there, but it can't tell whether the sentence needed one.",
            "It cites a real source that doesn't say what the sentence says. Only a reader of both the sentence and the passage can catch this.",
          ],
        },
        {
          kind: "callout",
          tone: "insight",
          title: "A prompt asks, and a check enforces",
          text: "The writer's prompt already tells the model to cite with the numbers of its sources. Models sometimes ignore a prompt. The output check runs in code, after the model has finished. A model that ignores its prompt still can't ship a citation the check rejects.",
        },
        {
          kind: "p",
          text: "Two things in this chapter are called `Guard`. The first is the AskPEP protocol from chapter 1. The second is a class in Guardrails AI, the library from chapter 1. The table gives each thing its own name, and the chapter keeps to those names.",
        },
        {
          kind: "compare",
          caption: "Three names for three things",
          columns: ["Name in this chapter", "What it is", "Where it lives", "What you call on it"],
          rows: [
            [
              "AskPEP guard",
              "Anything with a `name`, `stages` and `check`. The protocol is called `Guard`.",
              "`askpep.guards.protocol`",
              "`check(text, ctx)`, which returns a `GuardResult`",
            ],
            [
              "Guardrails guard",
              "The class `Guard` from the Guardrails AI library. It holds validators.",
              "The `guardrails` package",
              "`parse(text, metadata=...)`, which returns an outcome",
            ],
            [
              "Output guard",
              "`OutputGuard`, an AskPEP guard that holds one Guardrails guard.",
              "`askpep.guards.output`",
              "`check(text, ctx)`",
            ],
          ],
        },
        {
          kind: "p",
          text: "The chain only ever sees AskPEP guards. The Guardrails guard stays inside the output guard. The check you write covers the first failure only. Section 7 says where the other two get caught.",
        },
        {
          kind: "quiz",
          id: "guardrails02-q1",
          question: "Two passages were retrieved. Which answer fails in a way that code alone can check, with no model?",
          options: [
            "\"Assignment expressions are allowed in comprehensions [1].\" Source 1 says nothing about comprehensions.",
            "\"Assignment expressions use `:=` [3].\"",
            "\"Assignment expressions use `:=`.\"",
            "None of them. Code can't check citations.",
          ],
          answer: 1,
          explain:
            "Source 3 doesn't exist, and code can see that from the number alone. The first answer needs a reader who compares the sentence with source 1. The third has no marker, and code can't tell whether the sentence needed one.",
        },
        {
          kind: "p",
          text: "The check you write sits on top of Guardrails AI, so you need the library's parts first.",
        },
      ],
    },
    {
      id: "s2-guardrails-ai",
      title: "Guardrails AI runs validators over text, and each validator picks its own failure action",
      goal: "What are the library's parts, and how do you keep its telemetry off?",
      blocks: [
        {
          kind: "p",
          text: "Guardrails AI checks text with **validators**. A validator reads one value and says pass or fail. A Guardrails guard holds one or more validators and runs them.",
        },
        // CHECK: that `Guard.__call__` in Guardrails AI 0.11.0 calls a model for you, and `Guard.parse` only validates text you pass in.
        {
          kind: "p",
          text: "You call `guard.parse(text, metadata=...)` on text you already have. The library has a second entry point, `guard(...)`, which calls a model for you. The desk doesn't use it. The writer has already run, and its answer is a string.",
        },
        {
          kind: "p",
          text: "The `metadata` dict goes to every validator, so a validator can read facts that aren't in the text. Ours reads the retrieved sources. Section 5 opens the `ValidationOutcome` that `parse` returns.",
        },
        {
          kind: "p",
          text: "Each validator takes an `on_fail` action. It says what happens when that validator fails. The library offers several actions. AskPEP uses three, and names each one by what the user sees.",
        },
        {
          kind: "list",
          items: [
            "`reask` asks the model for a new answer. The library calls it `OnFailAction.REASK`.",
            "`fix` swaps in a repaired value that the validator supplies. The library calls it `OnFailAction.FIX`.",
            "`refuse` gives up and returns no output. The library calls it `OnFailAction.REFRAIN`.",
          ],
        },
        // CHECK: that Guardrails Hub installs ended on 25 August 2026 and that validators now ship as PyPI packages.
        {
          kind: "p",
          text: "Older tutorials install validators from the Guardrails Hub with `guardrails hub install`. The Hub stopped serving installs on 25 August 2026. Validators now ship as PyPI packages, or you write your own. This chapter writes one. A check against the desk's own source list has to read that list, so it is specific to AskPEP.",
        },
        {
          kind: "p",
          text: "You installed Guardrails AI in chapter 1, pinned at 0.11.0 or later.",
        },
        // CHECK: that Guardrails AI collects metrics and traces by default, and that these three settings turn that off: settings.disable_tracing, settings.rc.enable_metrics and guard.configure(allow_metrics_collection=False).
        {
          kind: "p",
          text: "One more setting matters before the first call. By default Guardrails AI collects metrics and traces. AskPEP sends questions and answers through it, so telemetry goes off. Building a Guardrails guard reloads the library's settings and can turn telemetry back on. So `new_guardrails_guard` switches it off twice.",
        },
        {
          kind: "code",
          lang: "python",
          code: `# src/askpep/guards/output.py
def new_guardrails_guard(on_fail: OnFail = "fix") -> Guard:
    settings.disable_tracing = True
    settings.rc.enable_metrics = False
    guard = Guard(name="askpep-output").use(CitationsRetrieved(on_fail=ON_FAIL[on_fail]))
    guard.configure(allow_metrics_collection=False)
    settings.rc.enable_metrics = False
    return guard`,
          caption: "The one place the desk builds a Guardrails guard. It ships complete in your stub.",
        },
        {
          kind: "p",
          text: "`Guard(name=...)` makes the Guardrails guard. `.use(...)` adds a validator and says which `on_fail` action it takes. `CitationsRetrieved` is the validator you write in the next section. `ON_FAIL` maps AskPEP's three words onto the library's actions. Section 4 shows that table.",
        },
        {
          kind: "p",
          text: "The one piece the desk has to supply is the validator.",
        },
      ],
    },
    {
      id: "s3-validator",
      title: "The citation validator compares each cited number with the sources the run retrieved",
      goal: "What exactly does the citation check pass and fail?",
      blocks: [
        {
          kind: "p",
          text: "The desk passes the retrieved passages as `metadata={\"sources\": [...]}`. The writer sees them numbered from 1, so source n sits at place n minus 1 in that list. The validator needs one number: how many sources exist.",
        },
        {
          kind: "p",
          text: "A citation is a number in square brackets. The regular expression `CITATION` finds one. `cited_numbers` lists the numbers an answer cites. Both ship complete.",
        },
        {
          kind: "code",
          lang: "python",
          code: `# src/askpep/guards/output.py
# A citation is [n]. A bracket straight after a word character or \`)\` is an index, as in \`rows[0]\`.
CITATION = re.compile(r"[ \\t]*(?<![\\w)])\\[(\\d+)\\]")

def cited_numbers(text: str) -> list[int]:
    return list(dict.fromkeys(int(m.group(1)) for m in CITATION.finditer(text)))`,
          caption: "Two details sit in the pattern. The next list explains them.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "The part `(?<![\\w)])` skips a bracket that follows a word character or a closing parenthesis. So `rows[0]` and `f(x)[3]` are indexes, and they stay.",
            "The part `[ \\t]*` takes the spaces and tabs before the marker. When the fix removes `[4]`, the space goes too, and no gap is left. A newline before a marker stays.",
          ],
        },
        {
          kind: "p",
          text: "`strip_bad_citations(text, count)` removes every `[n]` outside 1 to `count`. You write it in lab step 1. The validator uses it twice. It builds the fix value, and the same numbers go into the error message.",
        },
        {
          kind: "code",
          lang: "python",
          code: `# src/askpep/guards/output.py
@register_validator(name="askpep/citations-retrieved", data_type="string")
class CitationsRetrieved(Validator):
    def _validate(self, value: Any, metadata: dict[str, Any]) -> ValidationResult:
        count = len(metadata.get("sources") or [])
        bad = [n for n in cited_numbers(value) if not 1 <= n <= count]
        if not bad:
            return PassResult()
        ...
        return FailResult(
            error_message=f"The answer cites {named}, but {have}. Cite only those sources, or cite none.",
            fix_value=strip_bad_citations(value, count),
        )`,
          caption: "The shape of the validator. The dots hide two lines that build the words named and have. You write the whole method in lab step 2.",
        },
        {
          kind: "p",
          text: "`register_validator` files the class under the name `askpep/citations-retrieved`, for strings. `PassResult()` says all is well. `FailResult` carries two things. The `error_message` is what a reask shows the model. The `fix_value` is what a fix swaps in.",
        },
        {
          kind: "widget",
          id: "guardrails02-citation-check",
          intro:
            "Five answers follow. Two sources were retrieved. Source 1 is the abstract of PEP 572, and source 2 is its rationale. For each answer, predict whether `CitationsRetrieved` passes or fails it, then check. Two of the five will surprise you.",
        },
        {
          kind: "quiz",
          id: "guardrails02-q2",
          question:
            "Two sources exist. The answer says: \"Read `rows[7]` for the last row [2].\" What does `CitationsRetrieved` do?",
          options: [
            "It fails the answer, because `[7]` is out of range.",
            "It passes the answer. The `[7]` follows a word character, so it is an index, and `[2]` is in range.",
            "It fails the answer, because the sentence has two brackets.",
            "It raises an error, because `rows[7]` isn't a citation.",
          ],
          answer: 1,
          explain:
            "The pattern skips a bracket straight after a word character. That keeps code like `rows[7]` out of the check. Only `[2]` counts, and source 2 exists.",
        },
        {
          kind: "p",
          text: "A validator only says pass or fail. Something else decides what the user gets after a fail.",
        },
      ],
    },
    {
      id: "s4-reask-fix-refuse",
      title: "Reask costs a model call, fix costs fidelity and refuse costs the answer",
      goal: "Which failure action fits, given what each one gives the user and costs?",
      blocks: [
        {
          kind: "p",
          text: "Take the answer from section 1, with its made-up `[4]`. The validator has failed. The `on_fail` action now decides what the user gets. Each action gives something and takes something.",
        },
        {
          kind: "p",
          text: "**Reask** sends the validator's error message back to the model and asks for a new answer. The guard checks the new answer. It can repeat, up to a limit you set, called `max_reasks`. The model can repair the claim, and not only the marker. Each try costs one more model call and its delay.",
        },
        {
          kind: "p",
          text: "**Fix** swaps in the validator's `fix_value`. Here that is the answer with `[4]` stripped. It costs no model call and almost no time. The user gets the same answer, minus the marker.",
        },
        {
          kind: "p",
          text: "**Refuse** gives up. The guard blocks the answer, and the desk shows `BLOCKED_OUTPUT` in its place. That is a fixed message: \"I can't show that answer, because a safety check blocked it.\" Nothing that failed reaches the user. The user gets no answer either.",
        },
        // CHECK: that Guardrails AI applies the validator's fix value when the reasks run out and the answer still fails.
        {
          kind: "p",
          text: "A reask that keeps failing ends in a fix. When the library runs out of tries, it applies the fix value. So the worst case for `reask` is a fix, after one or more wasted model calls.",
        },
        {
          kind: "compare",
          caption: "What each action gives and costs",
          columns: ["Action", "The user gets", "Extra cost", "What it risks"],
          rows: [
            [
              "Reask",
              "A new answer that the model wrote after it saw the error",
              "One model call and its delay for each try",
              "The new answer can fail too, and then a fix is applied",
            ],
            [
              "Fix",
              "The same answer with the bad markers stripped",
              "Almost nothing",
              "A sentence that lost its marker may be the made-up one",
            ],
            [
              "Refuse",
              "The fixed block message and no answer",
              "No model call, and a lost answer",
              "Blocks answers that were mostly right",
            ],
          ],
        },
        {
          kind: "callout",
          tone: "warn",
          title: "A fix can hide a made-up claim",
          text: "Strip `[4]` and the sentence reads like an uncited claim. Nothing tells the user that the model invented its source. If the claim matters, prefer a reask, which lets the model drop it, or a refuse.",
        },
        {
          kind: "callout",
          tone: "analogy",
          title: "A copy editor with a wrong reference",
          text: "A copy editor finds a footnote that points nowhere. They can strike the footnote out, which is a fix. They can send the article back to the writer, which is a reask. Or they can pull the article, which is a refuse. Each choice costs a different thing.",
        },
        {
          kind: "widget",
          id: "guardrails02-action-chooser",
          intro:
            "Three situations follow. Each has a failed answer. Pick the action that fits, then read what each action would have done. Assume one model call takes 3 seconds, and the guard allows one reask. The numbers are examples, so judge by the shape of the cost.",
        },
        {
          kind: "p",
          text: "`ON_FAIL` maps AskPEP's words onto the library's actions. `make_output_guard` builds the output guard, and it ships complete. It refuses to build a `reask` guard that has no model function, or a `max_reasks` below 1.",
        },
        {
          kind: "code",
          lang: "python",
          code: `# src/askpep/guards/output.py
ON_FAIL: dict[str, OnFailAction] = {
    "reask": OnFailAction.REASK,
    "fix": OnFailAction.FIX,
    "refuse": OnFailAction.REFRAIN,
}

def make_output_guard(
    on_fail: OnFail = "reask", max_reasks: int = 1, reask: Reask | None = None
) -> OutputGuard:
    if on_fail == "reask" and (reask is None or max_reasks < 1):
        raise ValueError("on_fail='reask' needs a reask function and max_reasks of at least 1")
    return OutputGuard(new_guardrails_guard(on_fail), on_fail, max_reasks, reask)`,
          caption: "The mapping, and the builder that checks its own arguments.",
        },
        {
          kind: "p",
          text: "Chapter 4 builds the chain from settings. It reads `OUTPUT_MAX_REASKS`, which defaults to 1. With a model wired in and one retry or more, it builds a `reask` guard. Otherwise it builds a `fix` guard.",
        },
        {
          kind: "quiz",
          id: "guardrails02-q3",
          question:
            "The index returned no passages, and the model cited `[1]` and `[2]` anyway. The guard uses `fix`. What does the user see?",
          options: [
            "The fixed block message, `BLOCKED_OUTPUT`.",
            "The answer with both markers stripped. It reads like an uncited answer from the model's memory.",
            "A new answer, because `fix` asks the model again.",
            "An error, because there are no sources to fix against.",
          ],
          answer: 1,
          explain:
            "With no sources, every marker is out of range, so the fix strips them all. The answer then passes. Only `refuse` would have blocked it. Fix is cheap, and it ships whatever is left.",
        },
        {
          kind: "p",
          text: "All three actions come back as a library type, and the chain can't read that type.",
        },
      ],
    },
    {
      id: "s5-output-guard",
      title: "The output guard turns a library outcome into allow, modify or block, and fails closed",
      goal: "How does a library outcome become an AskPEP verdict?",
      blocks: [
        {
          kind: "p",
          text: "The chain knows nothing about Guardrails AI. It calls `check(text, ctx)` and reads a `GuardResult`. `OutputGuard` joins the two. It is an AskPEP guard, with a name, the stage `output` and a `check`. Inside, it holds one Guardrails guard.",
        },
        {
          kind: "p",
          text: "`ctx.sources` holds the passages the run retrieved. `check` hands them to `guard.parse` as metadata. `parse` returns a `ValidationOutcome`. Three of its parts matter here.",
        },
        // CHECK: the names and meaning of ValidationOutcome.validation_passed, validated_output and validation_summaries (each with failure_reason) in Guardrails AI 0.11.0.
        {
          kind: "list",
          items: [
            "`validation_passed` is true when the text passed, or when a fix or a reask repaired it.",
            "`validated_output` is the text to use. It is none when the guard refused.",
            "`validation_summaries` holds one record per validator, and each record has a `failure_reason`.",
          ],
        },
        {
          kind: "p",
          text: "`result_from_outcome` turns that into a `GuardResult`. You write it in lab step 3. The table is the whole rule.",
        },
        {
          kind: "compare",
          caption: "From a Guardrails outcome to a verdict",
          columns: ["The outcome", "The action", "The text in the result"],
          rows: [
            ["Passed, and the output equals the input", "`allow`", "The input"],
            ["Passed, and the output differs, from a fix or a reask that worked", "`modify`", "The new output"],
            ["Did not pass, which is what `refuse` gives", "`block`", "The input, which is never shown"],
          ],
        },
        {
          kind: "p",
          text: "`result_from_outcome` is the only function in AskPEP that reads a Guardrails AI type. A block keeps the original text. The desk, not the guard, decides what the user sees in its place.",
        },
        {
          kind: "fold",
          tone: "industry",
          title: "Keep the library behind one function",
          text: "In 2026 Guardrails AI had a malicious release, 0.10.1, and it closed its Hub. A library you depend on has a health record. If this one stalls, you replace `result_from_outcome` and the guard it wraps. The regular expression, the strip and the desk code stay as they are.",
        },
        {
          kind: "p",
          text: "On `reask` the library needs a model to call. `parse` takes an `llm_api` function and calls it with `messages=`, a list of dicts with a role and a content. `check` builds that function. It reads the system text and the user text, adds a numbered source list from `format_sources`, and calls the desk's `reask` function.",
        },
        {
          kind: "p",
          text: "The source list matters. The library's reask text carries the error message, such as \"only sources 1 to 2 exist\". It doesn't carry the sources. Without titles to choose from, the model could cite another wrong number.",
        },
        {
          kind: "code",
          lang: "python",
          code: `# src/askpep/guards/output.py
def format_sources(sources: Sequence[SourceRef]) -> str:
    if not sources:
        return "No sources were retrieved, so cite nothing."
    lines = [
        f"[{n}] {s['title']} > {' > '.join(s['heading_path'])}".rstrip(" >") for n, s in enumerate(sources, 1)
    ]
    return "Sources you may cite:\\n" + "\\n".join(lines)`,
          caption: "The list a reask shows the model. It ships complete.",
        },
        {
          kind: "callout",
          tone: "insight",
          title: "No try block, on purpose",
          text: "`check` has no `try` block. If Guardrails AI raises, the exception reaches `screen`, the function in `protocol.py` that runs the chain for the desk. `screen` turns a crash into a block. A broken output check blocks the answer. It never lets one through unchecked.",
        },
        {
          kind: "p",
          text: "`check` also times itself, and it sets `settings.rc.enable_metrics` to false before each `parse`. The reason in the result says how often the model was asked again. When a reask works, the library reports no failure, so the reason holds only that note.",
        },
        {
          kind: "step",
          id: "guardrails02-s01",
          title: "Write a script that tries the guard",
          text: "Do this after lab step 4 passes. The script runs the output guard three times on one answer, in the modes fix, refuse and reask. The reask mode uses a stand-in for the model, so nothing calls Gemini. Create the file in your repo root.",
          lang: "python",
          file: "scratch/try_output_guard.py",
          code: `# scratch/try_output_guard.py
from askpep.guards.output import make_output_guard
from askpep.guards.protocol import GuardContext

SOURCES = (
    {"chunk_id": None, "doc_id": 572, "title": "PEP 572", "heading_path": ["Abstract"], "text": "", "url": ""},
    {"chunk_id": None, "doc_id": 572, "title": "PEP 572", "heading_path": ["Rationale"], "text": "", "url": ""},
)
ANSWER = "Assignment expressions bind a name inside an expression [1]. They use \`:=\` [4]."
CTX = GuardContext("output", {"user_id": "me", "role": "admin"}, None, None, SOURCES)


def ask_again(system: str, user: str) -> str:
    return "Assignment expressions bind a name inside an expression [1]. They use \`:=\`."


for mode in ("fix", "refuse"):
    result = make_output_guard(mode).check(ANSWER, CTX)
    print(mode, "->", result.action, repr(result.text))
    print("  reason:", result.reason)

result = make_output_guard("reask", 1, ask_again).check(ANSWER, CTX)
print("reask ->", result.action, repr(result.text))
print("  reason:", result.reason)`,
        },
        {
          kind: "step",
          id: "guardrails02-s02",
          title: "Run the script",
          text: "Read the three actions in the output. Fix and reask both give `modify`, with the marker gone. Refuse gives `block`, and the text it returns is the original, which the desk never shows. The reask line pauses for a few seconds the first time.",
          lang: "bash",
          code: `uv run python scratch/try_output_guard.py`,
          expect: "Three result lines. The fix line says modify and shows the answer without [4]. The refuse line says block and shows the answer with [4]. The reask line says modify, and its reason says the model was asked again 1 time(s).",
        },
        // CHECK: that the first reask in a process takes seconds longer than later reasks. It took about 4.6 seconds against about 2 milliseconds on the test machine, and the cause is not confirmed.
        {
          kind: "fold",
          tone: "trouble",
          title: "The first reask pauses for a few seconds",
          text: "On the machine this chapter was tested on, the first reask in a process took about 4 seconds longer than the next ones. Expect a pause there. Later reasks added about 2 milliseconds, plus the model call itself.",
        },
        {
          kind: "quiz",
          id: "guardrails02-q4",
          question: "The guard uses `refuse`, and the answer fails. What does `result_from_outcome` return?",
          options: [
            "`allow`, with the original text.",
            "`modify`, with an empty text.",
            "`block`, with the original text and the reason.",
            "`block`, with the text of `BLOCKED_OUTPUT`.",
          ],
          answer: 2,
          explain:
            "The guard reports the failure and keeps the text it was given. The desk chooses `BLOCKED_OUTPUT`, and you write that choice in lab step 5. A guard that wrote the user's message would tie the check to the screen.",
        },
        {
          kind: "quiz",
          id: "guardrails02-q5",
          question: "`OutputGuard.__init__` takes a parameter named `guard`, typed `Guard`. Which `Guard` is that?",
          options: [
            "The AskPEP protocol from chapter 1.",
            "The class `Guard` from the `guardrails` package. The output guard wraps it.",
            "Either one, because the two are the same type.",
            "A subclass of both, defined in `output.py`.",
          ],
          answer: 1,
          explain:
            "`OutputGuard` is itself an AskPEP guard, so it never needs the protocol's name. It holds a Guardrails guard, which does the validating. The two share a word, and nothing else.",
        },
        {
          kind: "p",
          text: "You now have a guard that gives verdicts. The desk has to call it at the right moment.",
        },
      ],
    },
    {
      id: "s6-desk",
      title: "The desk checks the finished answer and holds the stream until the check ends",
      goal: "Where does the output check run, and what does it do to streaming?",
      blocks: [
        {
          kind: "p",
          text: "The check sits outside the graph. When the graph finishes, `guard_result` calls `guard_output` on the answer. `guard_output` ships in `askpep/guards/flow.py`. It asks the chain for a verdict at the `output` stage. It passes the answer, the sources, the principal, which is the user the run acts for, and the thread id.",
        },
        {
          kind: "p",
          text: "Because the check wraps the graph, every design gets it. The handoff desk, the supervisor and the one-agent baseline all end in the same `DeskResult`. One check covers all three.",
        },
        {
          kind: "p",
          text: "The wiring is ready, but the running desk has no chain yet. Chapter 4 builds the chain from settings. Until then the tests supply a chain themselves.",
        },
        {
          kind: "list",
          items: [
            "`allow` leaves the result alone.",
            "`modify` swaps in the new text and keeps the stop reason.",
            "`block` swaps in `BLOCKED_OUTPUT`, sets the stop reason to `guard_blocked` and sets the status to `stopped`.",
          ],
        },
        {
          kind: "p",
          text: "After a modify or a block, `_citations` works the citations out again from the new text. Otherwise the result would list a citation that the answer no longer holds. Two cases skip the check. A desk with no chain behaves as it did in course 2. A fixed refusal has nothing to validate.",
        },
        {
          kind: "p",
          text: "The thread must remember what the user saw. `_save_answer` writes the guarded text back to the checkpoint. It replaces the last answer message by its id. The `add_messages` reducer merges by id, as chapter 4 of course 2 showed. Without this, the next question would start from the made-up citation, and the model could repeat it.",
        },
        {
          kind: "p",
          text: "Streaming adds a problem. Tokens reach the user while the model is still writing, and the check needs the whole answer. `svc.guards.covers(\"output\")` is true when any guard in the chain handles the `output` stage. In that case `stream_desk` holds the model's tokens back.",
        },
        {
          kind: "p",
          text: "It still sends the tool and handoff events as they happen. After the run it calls the check. Then it sends one `token` event with the guarded text, and then `done`. A blocked answer streams only `BLOCKED_OUTPUT`.",
        },
        {
          kind: "p",
          text: "The cost is time to first token. Say triage and tools take 2 seconds, and the writer takes 4 with its first token 1 second in. Before the guard, the user saw the first token at 3 seconds. Now it arrives at about 6 seconds. A reask adds a whole model call. The check itself takes milliseconds.",
        },
        {
          kind: "widget",
          id: "guardrails02-held-stream",
          intro:
            "Four runs follow. Each uses the same timings: 2 seconds of triage and tools, then 4 seconds of writing with the first token 1 second in. One model call for a reask takes 3 seconds. Only the last run allows two reasks. For each run, predict when the first token reaches the user, then check.",
        },
        {
          kind: "fold",
          tone: "plain",
          title: "Why not stream first and take it back?",
          text: "A streamed token can't be recalled. The user may have read it already, or copied it. The point of this check is that an unchecked citation never reaches the user. AskPEP pays in waiting time to keep that promise.",
        },
        {
          kind: "quiz",
          id: "guardrails02-q6",
          question:
            "After you add the output guard, the first token arrives at 6 seconds in place of 3, and every answer passes. Why?",
          options: [
            "The guard slows every token by a fixed amount.",
            "The desk holds the model's tokens until the whole answer exists and the check has run, then sends them as one event.",
            "Guardrails AI makes a network call for every check.",
            "The check runs once for each token and the sum adds up.",
          ],
          answer: 1,
          explain:
            "The check needs the complete answer, so nothing can leave before the model finishes. The check itself takes milliseconds. The wait is the writing time that the stream used to hide.",
        },
        {
          kind: "p",
          text: "The desk now holds every answer until the check ends. That makes it worth asking what a pass really proves.",
        },
      ],
    },
    {
      id: "s7-limits",
      title: "The citation check catches a missing source and misses a source that doesn't support the sentence",
      goal: "What does the check not catch, and where does each gap get covered?",
      blocks: [
        {
          kind: "p",
          text: "A pass from `CitationsRetrieved` proves one thing. Every `[n]` in the answer points at a retrieved source. It doesn't prove that the answer is true.",
        },
        {
          kind: "compare",
          caption: "The three failures from section 1",
          columns: ["The failure", "Does the validator catch it?", "Where it gets caught"],
          rows: [
            ["A number with no source, such as `[4]` when two sources exist", "Yes", "Here, by the output guard"],
            [
              "No citation at all",
              "No. The answer passes.",
              "A second validator could require a marker. Measure what it wrongly blocks first.",
            ],
            [
              "A real source that doesn't say what the sentence says",
              "No. The number is in range.",
              "A grader that reads the sentence and the passage. Course 4 builds those graders.",
            ],
          ],
        },
        {
          kind: "p",
          text: "The second row is a policy choice. A rule that requires a citation in every answer would also block \"hello\", a refusal and \"I don't know\". Replay logged answers through the rule before you ship it. Count the good answers it blocks by mistake. Each one is a false positive.",
        },
        {
          kind: "p",
          text: "The chain from chapter 1 writes an audit event for each verdict. Watch the rate of modify and block verdicts over time. A rise means the prompt, the retrieval or the model changed. That is the guardrail half of hallucination triage. Course 4 teaches the other half.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "How an interviewer tests output validation",
          text: "An agent starts hallucinating in production. Where do you investigate first? Start with the output guard's verdict rate over time, with reasons. A jump in out-of-range citations points at a change in the prompt, retrieval or model. A flat rate with bad answers means the validator can't see the failure, such as a wrong source.",
        },
        {
          kind: "quiz",
          id: "guardrails02-q7",
          question: "A product owner asks you to block every answer with no citation. What do you do first?",
          options: [
            "Add the rule and ship it, because uncited answers are unsafe.",
            "Replay logged answers through the rule and count the good answers it would block.",
            "Switch the guard from `fix` to `reask`.",
            "Refuse to add a second validator.",
          ],
          answer: 1,
          explain:
            "The rule would also block greetings, refusals and honest \"I don't know\" answers. Measure that cost on real answers first. Then choose between reask, fix and refuse for the answers it does catch.",
        },
        {
          kind: "p",
          text: "The second row of that table is about to become a real decision, because the desk's product owner has a request.",
        },
      ],
    },
    {
      id: "s8-output-policy",
      title: "A replay of 200 answers rejects the product owner's rule and keeps a narrower one",
      goal: "Should the desk block every answer with no citation, and how do you decide?",
      blocks: [
        {
          kind: "p",
          text: "A policy change to a guard is decided on logged answers. Write the rule down, replay real answers through it, and label the ones it would block. Then compare the good answers it blocks against the bad ones it stops. The decision goes in a record, so the next person can see why.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "State the rule in one sentence.",
            "Pull a sample of logged answers.",
            "Label each answer by hand as fine or as needing a citation.",
            "Replay each candidate rule and count its blocks.",
            "Choose, and write down what you rejected.",
          ],
        },
        {
          kind: "p",
          text: "The product owner wrote to you: block every answer with no citation. The reviewer read it and replied that it sounded safe, and that they would like to see the numbers.",
        },
        {
          kind: "p",
          text: "You pulled 200 logged answers and labelled them by hand. These figures are an invented sample for the course, so learn the working and ignore the values. Of the 200 answers, 148 cited something and 52 cited nothing.",
        },
        {
          kind: "p",
          text: "You read the 52. Nine were greetings, 14 were refusals or honest \"I don't know\" answers, and eight were linter replies. Those 31 were fine with no citation. The other 21 made claims about a PEP and needed one. So the product owner's rule would stop 21 bad answers and 31 good ones.",
        },
        {
          kind: "p",
          text: "That result led to a narrower rule. It fires only when the run retrieved sources and the answer still cites none. Replayed, it fired on 24 answers. Twenty-one were the bad ones, and three were linter replies that had retrieved a passage. You took both rules back to the product owner, who agreed to the narrower one.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# DECISION-002: citation policy for the PEP desk
Status: accepted   Owner: desk product owner   Reviewer: security reviewer

## Question
Should the desk block every answer that has no citation?

## Sample
200 logged answers, labelled by hand. 148 cite something. 52 cite nothing.
Of the 52: 9 greetings, 14 refusals, 8 linter replies (31 fine), 21 needed a citation.
Good answers in the sample: 200 - 21 = 179. (Invented sample for this course.)

## Candidate rules
Rule                             Fires on  Correct  Good answers hit  False positive rate
A. No citation marker anywhere   52        21       31                31 / 179 = 17.3%
B. Sources retrieved, no marker  24        21       3                 3 / 179 = 1.7%

## Decision
1. Number with no source: reask once, then fix. Built in this chapter.
2. Rule A: rejected. It blocks 31 good answers to stop 21 bad ones.
3. Rule B: accepted as a reask, for a later release. Not built in this course's lab.
4. Cost of rule B: 24 / 200 = 12% of answers take one more model call.

## Review
Replay the sample again when the prompt, the retrieval or the model changes.`,
          caption: "DECISION-002, the citation policy as the team agreed it.",
        },
        {
          kind: "p",
          text: "Read the table's last column first. Rule A blocks 17.3 percent of good answers, and rule B blocks 1.7 percent, and both stop the same 21 bad answers. That is why the record exists. The decision also says what was not built, so nobody assumes rule B is running.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# Threat model changes
T4   output  Nobody needed  Answer cites a source nobody can check   Check the citations    2   -k guardrails02  closed
T10  output  Nobody needed  Real source doesn't support the sentence  Grader, built in course 4  -   none yet     accepted by reviewer until course 4`,
          caption: "THREAT-MODEL.md, the rows this chapter changes. Row T10 is new.",
        },
        {
          kind: "p",
          text: "Row T4 closes, because the tests name the evidence. Row T10 is new and honest. A number in range proves nothing about the sentence, so the reviewer accepted that gap by name until course 4 builds the graders.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# DECISION-NNN: (the policy in a few words)
Status:    Owner:    Reviewer:

## Question
(one sentence the decision answers)

## Sample
(how many, from where, who labelled them)

## Candidate rules
Rule    Fires on    Correct    Good answers hit    False positive rate

## Decision
(one line per rule: accepted, rejected or later, and whether it is built)

## Review
(what change makes you replay the sample)`,
          caption: "For your next output policy: the same record with the values left blank.",
        },
        {
          kind: "p",
          text: "The answer is now checked on its way out. A passage can still give the model orders before the answer is written. Chapter 3 answers the next question. What stops text in the corpus from steering the desk?",
        },
      ],
    },
  ],
  lab: {
    title: "Build the output guard of the PEP desk",
    goal: "Write the output guard in `output.py`, then wire it into `run_desk` and `stream_desk`. Steps 1 to 4 start from stubs that raise `NotImplementedError(\"guardrails-02 step N\")`. Steps 5 and 6 edit your own `graph.py`. One test in each passes before you write anything, because a desk with no output guard still behaves as in course 2. The tests use stand-in models, so nothing calls Gemini. Run them from your AskPEP workspace root. Then compare your files with `capstone/src/askpep/` in the my-learn folder.",
    minutes: 85,
    files: [
      "src/askpep/guards/output.py",
      "src/askpep/agents/graph.py",
      "tests/guardrails/test_guardrails02_output.py",
    ],
    steps: [
      {
        title: "Strip a citation the desk never retrieved",
        text: "Write `strip_bad_citations` in `output.py`. It removes every `[n]` whose number is not in 1 to `count`, with the space before it. A citation in range stays. Use `CITATION.sub` with a function. The stub raises `guardrails-02 step 1`.",
        code: `# src/askpep/guards/output.py
def strip_bad_citations(text: str, count: int) -> str:
    """Remove every citation [n] whose n is not in 1..count, with the space before it.

    A citation that is in range stays as it is. \`count\` is the number of sources the desk retrieved.
    "It says [1] and [7]." with a count of 1 becomes "It says [1] and."
    """
    # your turn: return CITATION.sub(some_function, text).
    # The function gets a match m. Give back m.group(0), the whole match, when int(m.group(1)) is in 1..count.
    # Else give back "", which removes the marker and the space before it.
    ...`,
        test: "uv run pytest tests/guardrails -k guardrails02_s1",
      },
      {
        title: "The citation validator",
        text: "Write `CitationsRetrieved._validate` in `output.py`. It reads the source count from `metadata`. It passes when every citation is in range. Otherwise it returns a `FailResult` that names the bad numbers, with a fix value. Add `FailResult` and `PassResult` to your import. The stub raises `guardrails-02 step 2`.",
        code: `# src/askpep/guards/output.py
# Add FailResult and PassResult to this import:
#   from guardrails.validators import FailResult, PassResult, ValidationResult
class CitationsRetrieved(Validator):
    def _validate(self, value: Any, metadata: dict[str, Any]) -> ValidationResult:
        """Pass when every citation names a retrieved source, else fail with a message and a fix."""
        # your turn:
        # 1. count = the number of sources in metadata["sources"]. A missing key counts as none.
        # 2. bad = the numbers from cited_numbers(value) that are not in 1..count.
        # 3. No bad numbers: return PassResult().
        # 4. Else return FailResult(error_message=..., fix_value=...).
        #    The message names the bad numbers only, such as "[4]". It says "only sources 1 to N exist",
        #    or "no sources were retrieved" when N is 0. It ends "Cite only those sources, or cite none."
        #    The fix value is strip_bad_citations(value, count).
        ...`,
        test: "uv run pytest tests/guardrails -k guardrails02_s2",
      },
      {
        title: "From an outcome to a verdict",
        text: "Write `result_from_outcome` in `output.py`. It turns a Guardrails AI outcome into a `GuardResult`. A pass with the same text is `allow`. A pass with new text is `modify`. A failure is `block`, with the original text. The reason joins the failure reasons without repeats. The stub raises `guardrails-02 step 3`.",
        code: `# src/askpep/guards/output.py
def result_from_outcome(name: str, text: str, outcome: Any, latency_ms: float = 0.0) -> GuardResult:
    """Turn a Guardrails \`ValidationOutcome\` into a \`GuardResult\`."""
    # your turn:
    # 1. reasons = the failure_reason of each item in outcome.validation_summaries, skipping empty
    #    ones and repeats. reason = "; ".join(reasons).
    # 2. output = outcome.validated_output.
    # 3. Not outcome.validation_passed, or output is not a str: return
    #    GuardResult(name, "block", text, reason or "output failed validation", 1.0, latency_ms).
    # 4. output == text: return GuardResult(name, "allow", text, "", 0.0, latency_ms).
    # 5. Else return GuardResult(name, "modify", output, reason, 1.0, latency_ms).
    ...`,
        test: "uv run pytest tests/guardrails -k guardrails02_s3",
      },
      {
        title: "The output guard",
        text: "Write `OutputGuard.check` in `output.py`. It calls `guard.parse` with the sources as metadata. On `reask`, it passes an `llm_api` function that calls the desk's `reask`. It times the call and returns `result_from_outcome`. Add the `time` and `replace` imports. The stub raises `guardrails-02 step 4`.",
        code: `# src/askpep/guards/output.py
# Add these imports:
#   import time
#   from dataclasses import replace
class OutputGuard:
    def check(self, text: str, ctx: GuardContext) -> GuardResult:
        """Run guard.parse on the answer, with {"sources": ctx.sources} as the metadata."""
        # your turn: start a timer with time.perf_counter().
        asked: list[str] = []  # the user texts sent to the model
        llm_api = None
        if self.on_fail == "reask" and self.reask is not None:
            reask, sources = self.reask, ctx.sources

            def llm_api(*, messages: list[dict[str, str]], **_: Any) -> str:
                # system = the content of the first message with role "system", or "".
                # user = the contents of the messages with role "user", joined with a blank line.
                # Append user to asked. Return reask(system, f"{user}\\n\\n{format_sources(sources)}").
                ...

        # your turn:
        # 1. Set settings.rc.enable_metrics = False, then call self.guard.parse(text, metadata=..., llm_api=...,
        #    num_reasks=...). num_reasks is self.max_reasks on reask and 0 on fix and refuse.
        # 2. Take the elapsed milliseconds and call result_from_outcome(self.name, text, outcome, latency).
        # 3. When asked is not empty and the action is not allow, add the note
        #    "asked the model again N time(s)" to the front of the reason, with replace(result, reason=...).
        ...`,
        test: "uv run pytest tests/guardrails -k guardrails02_s4",
      },
      {
        title: "The output guard in the desk",
        text: "Edit `graph.py`. Add `guard_result`, which runs the output guards on the finished answer and swaps in the verdict. Add `_finish`, and end `_run` with it. Save the guarded text to the checkpoint, and work the citations out again. Add the imports the comments list.",
        code: `# graph.py. Add these imports at the top:
#   from dataclasses import asdict, dataclass, replace      (add replace)
#   from askpep.guards.flow import BLOCKED_OUTPUT, guard_output
def _save_answer(graph, config: dict[str, Any], text: str, stop_reason: StopReason) -> None:
    """Write a guarded answer back to the checkpoint, so the thread's history holds what the user saw."""
    try:
        values = graph.get_state(config).values
        last = next(
            (m for m in reversed(values.get("messages", [])) if isinstance(m, AIMessage) and not m.tool_calls),
            None,
        )
        update: dict[str, Any] = {"answer": text, "stop_reason": stop_reason}
        if last is not None:
            update["messages"] = [AIMessage(content=text, id=last.id, name=last.name)]
        graph.update_state(config, update)
    except ValueError:  # no checkpointer, so there is no history to correct
        pass
    except Exception:
        log.warning("guarded_answer_not_saved", exc_info=True)


def guard_result(graph, svc: Services, result: DeskResult, who: Principal, config: dict[str, Any]) -> DeskResult:
    """Run the output guards on a finished answer."""
    # your turn:
    # 1. Return result unchanged when svc.guards is None, result.refused is true, or result.answer is empty.
    # 2. verdict = guard_output(svc, result.answer, result.sources, who, result.thread_id).
    #    An allow returns result unchanged.
    # 3. On a block, text = BLOCKED_OUTPUT and stop_reason = "guard_blocked". Else text = verdict.text
    #    and stop_reason stays result.stop_reason.
    # 4. Call _save_answer(graph, config, text, stop_reason).
    # 5. Return replace(result, answer=text, stop_reason=stop_reason,
    #    status="done" if stop_reason in FINISHED else "stopped",
    #    citations=_citations(text, result.sources)).
    ...


def _finish(graph, svc: Services, state: Mapping[str, Any], *, thread_id: str, latency_ms: float,
            config: dict[str, Any]) -> DeskResult:
    """The DeskResult for a run that ended, after the output guards."""
    # your turn: build the result with result_from_state(state, thread_id=..., latency_ms=...).
    # who = state.get("principal") or OWNER. Return guard_result(graph, svc, result, who, config).
    ...


# In _run, keep the timer and the invoke. Replace the last line, the one that returns result_from_state(...),
# with: return _finish(graph, svc, state, thread_id=thread_id, latency_ms=latency, config=config).
# Make latency a variable first: latency = (time.perf_counter() - started) * 1000.`,
        test: "uv run pytest tests/guardrails -k guardrails02_s5",
      },
      {
        title: "Tokens wait for the guard",
        text: "Edit `stream_desk` in `graph.py`. When the chain covers the `output` stage, hold back the model's tokens and the `token` events from the graph. After the run, call `_finish`, send one `token` event with the guarded text, then send `done`.",
        code: `# graph.py. These are the lines that change in stream_desk.
def stream_desk(graph, question: str, *, svc: Services, thread_id: str | None = None,
                principal: Principal | None = None) -> Iterator[DeskEvent]:
    thread_id = thread_id or uuid.uuid4().hex
    config = _config(svc, thread_id)
    started = time.perf_counter()
    # your turn: held = svc.guards is not None and svc.guards.covers("output")
    yield DeskEvent("start", {"thread_id": thread_id})
    state: dict[str, Any] = {}
    try:
        for namespace, mode, data in graph.stream(
            _turn_input(question, principal), config, stream_mode=["updates", "messages", "values"], subgraphs=True
        ):
            if mode == "values" and not namespace:
                state = dict(data)
            elif mode == "updates":
                # your turn: yield each event from _update_events(...), but skip a "token" event while held.
                yield from _update_events(namespace, data)
            elif mode == "messages":
                # your turn: do nothing here while held. Otherwise stream the model's text as before.
                ...
    except GraphRecursionError:
        state = {**(_checkpoint_values(graph, config) or state), "stop_reason": "recursion_limit"}
    except Exception:
        log.exception("desk_stream_failed")
        yield DeskEvent("error", {"message": "The desk run failed. Check the server logs."})
        return
    # your turn:
    # 1. latency = the elapsed milliseconds. result = _finish(graph, svc, state, thread_id=..., latency_ms=..., config=config).
    # 2. When held and result.answer is not empty, yield DeskEvent("token", {"text": result.answer}).
    # 3. yield DeskEvent("done", asdict(result)).`,
        test: "uv run pytest tests/guardrails -k guardrails02_s6",
      },
    ],
    verify: "uv run pytest tests/guardrails -k guardrails02",
  },
  recap: [
    "A Guardrails AI `Guard` holds validators, and `parse` runs them over text the desk already has.",
    "`CitationsRetrieved` fails an answer that cites a number with no source, and its fix strips the marker.",
    "Reask costs a model call, fix costs fidelity and refuse costs the answer.",
    "`result_from_outcome` maps a library outcome to allow, modify or block, so the chain needs no library types.",
    "The desk checks after the run, saves the guarded text to the thread, and holds the stream until the check ends.",
    "The validator misses an uncited claim and a source that doesn't support it, so those need other checks.",
    "Decide a guard's policy by replaying logged answers, and record what you rejected and why.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In output validation I learned that a check in code can stop a made-up citation after the model finishes. Reask, fix and refuse trade time, fidelity and safety. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["guardrails-q11", "guardrails-q12", "guardrails-q18"],
};

export default chapter;
