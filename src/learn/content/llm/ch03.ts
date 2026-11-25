import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "llm-03-structured-output",
  course: "llm",
  number: 3,
  title: "A schema guarantees shape, so validation and review guarantee the rest",
  tagline: "How do you get an answer your finance system can trust? Ask for a schema, validate in layers, repair within a limit, and never guess a missing value.",
  minutes: 60,
  objectives: [
    "Say what JSON mode and schema-constrained output each guarantee, and what neither does.",
    "Define the invoice as a typed model and validate against it.",
    "Run three validation layers in order, and treat refusal and truncation as their own cases.",
    "Bound a repair loop, feed back only the errors, and send what cannot be repaired to review.",
    "Build and test the validator and repair loop in the lab.",
    "Write the policy and result shape that decide what reaches the ledger.",
  ],
  sections: [
    {
      id: "s1-provider-structured-output",
      title: "Provider structured output removes most syntax errors",
      goal: "What do JSON mode and schema-constrained output guarantee, and what do they leave to you?",
      blocks: [
        {
          kind: "p",
          text: "Chapter two's prompt asks for JSON. Course 2 used structured output for its triage router, and this chapter goes further. Asking for JSON in the prompt works most of the time. That isn't good enough for a pipeline that posts to a finance system, so providers offer features that tighten it.",
        },
        {
          kind: "p",
          text: "**JSON mode** promises that the output parses as JSON. It says nothing about which keys appear or what types they have. **Schema-constrained output** goes further. You give a JSON Schema, and the decoder is restricted so the output matches it. Keys, types and required fields hold by construction.",
        },
        // CHECKED 17 Oct 2026: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
        {
          kind: "list",
          items: [
            "Constrained output can still contain wrong values. A well-typed total can be the wrong number.",
            "A refusal or a truncation can still break the shape, so you still check the stop reason.",
            "Only a subset of JSON Schema is usually supported. Check the keywords you rely on.",
            "Constraints cannot express rules across fields, such as lines adding up to net.",
          ],
        },
        {
          kind: "p",
          text: "So the feature removes one layer of failure, the syntax layer, and shrinks the schema layer. It does not remove the need to validate. Use it as the first line of defence and keep your own checks behind it.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Do not say the schema guarantees correctness",
          text: "When asked how to get reliable JSON, start with provider structured output, then say it guarantees shape and not truth. A strong answer continues with typed validation, business rules, handling of refusal and truncation, and a bounded repair loop. That ordering shows you have run this in production.",
        },
        {
          kind: "quiz",
          id: "llm03-q1",
          question: "What does schema-constrained output guarantee?",
          options: [
            "Every value is factually correct.",
            "The output matches the schema's keys and types.",
            "Line items always add up to the net amount.",
            "The model never refuses.",
          ],
          answer: 1,
          explain: "The decoder restricts the shape. Correct values, cross-field rules and refusals remain your job.",
        },
        { kind: "p", text: "The provider can check shape. Your code needs the same contract, and the next section gives you one definition for both." },
      ],
    },
    {
      id: "s2-pydantic",
      title: "Pydantic turns a schema into code you validate against",
      goal: "How does one typed model feed both the provider schema and your checks?",
      blocks: [
        {
          kind: "p",
          text: "A JSON Schema is a contract for the model. A typed model is the same contract for your code. In Python, **Pydantic** lets you write the invoice once, then generate the schema for the provider and validate the reply against it. One definition feeds both sides, so they cannot drift.",
        },
        {
          kind: "code",
          lang: "python",
          caption: "The invoice as a Pydantic model. The schema sent to the provider comes from this class.",
          code: "from datetime import date\nfrom typing import Literal\nfrom pydantic import BaseModel, field_validator, model_validator\n\nclass LineItem(BaseModel):\n    description: str\n    quantity: float\n    unit_price: float\n    amount: float\n\nclass Invoice(BaseModel):\n    supplier: str\n    invoice_number: str\n    invoice_date: date\n    due_date: date\n    currency: Literal[\"GBP\", \"EUR\", \"USD\"]\n    lines: list[LineItem]\n    net: float\n    vat: float\n    total: float\n\n    @field_validator(\"lines\")\n    @classmethod\n    def has_lines(cls, v):\n        if not v:\n            raise ValueError(\"lines must not be empty\")\n        return v\n\n    @model_validator(mode=\"after\")\n    def totals_add_up(self):\n        if abs(sum(l.amount for l in self.lines) - self.net) > 0.005:\n            raise ValueError(\"line amounts do not add up to net\")\n        if abs(self.net + self.vat - self.total) > 0.005:\n            raise ValueError(\"net plus vat is not total\")\n        return self",
        },
        {
          kind: "p",
          text: "The class gives you three things. Types are checked, and a string where a number belongs is rejected. A literal limits currency to three values. Validators hold rules the type cannot, such as the totals. Calling `Invoice.model_validate_json(text)` does parsing and checking in one step and raises an error that lists every problem.",
        },
        {
          kind: "p",
          text: "Pydantic can also report the schema through `Invoice.model_json_schema()`. That is the schema you pass to the provider. In TypeScript the equivalent is Zod, which the alternatives section covers. This course's lab is Python with no libraries, so you write the checks by hand and see what Pydantic does for you.",
        },
        {
          kind: "quiz",
          id: "llm03-q2",
          question: "Why generate the provider schema from the same class you validate with?",
          options: [
            "It is faster to type.",
            "One definition feeds both sides, so the contract the model sees and the contract you enforce cannot drift apart.",
            "Pydantic makes the model more accurate.",
            "Providers refuse hand-written schemas.",
          ],
          answer: 1,
          explain: "Two copies of a contract drift. A single source keeps what you ask for and what you accept identical.",
        },
        { kind: "p", text: "A typed model is one check among several. The next section puts every check in order." },
      ],
    },
    {
      id: "s3-three-layers",
      title: "Validation has three layers: syntax, schema and business rules",
      goal: "What are the three validation layers, and in what order do they run?",
      blocks: [
        {
          kind: "p",
          text: "A model answer can be wrong in three different ways, and each needs its own check. Run them in order and stop at the first layer that fails. A failure at a lower layer makes the higher layers meaningless.",
        },
        {
          kind: "list",
          items: [
            "Syntax. Does the text parse as JSON? Prose around the object, a trailing comma or an unquoted key fails here.",
            "Schema. Do the keys, types and enums match? A missing due date, a string total or a currency of GBPP fails here.",
            "Business rules. Do the values make sense together? Lines must add up to net. Net plus VAT must equal the total. The due date cannot precede the invoice date.",
          ],
        },
        {
          kind: "p",
          text: "Two cases sit before the ladder. A **refusal** means the model declined, and the text is not an invoice at all. A **truncation** means the output hit its token limit and the JSON is cut off. Check the stop reason first, because parsing a cut-off object only gives a misleading syntax error.",
        },
        {
          kind: "widget",
          id: "llm-validation-ladder",
          intro: "Seven malformed model outputs arrive one at a time with their stop reasons. Decide which layer rejects each one first. Watch for the two that look like syntax errors but are not.",
        },
        {
          kind: "p",
          text: "Business rules need tolerance. Prices rounded to two decimals can drift by a fraction of a penny, so compare with a small epsilon instead of exact equality. Keep the rules in code that a finance colleague can read. When a rule changes, you change one function.",
        },
        {
          kind: "quiz",
          id: "llm03-q3",
          question: "A response parses and every field has the right type, but net plus VAT does not equal the total. Which layer catches it?",
          options: [
            "Syntax.",
            "Schema.",
            "Business rules.",
            "Refusal handling.",
          ],
          answer: 2,
          explain: "Types alone cannot see that the numbers disagree. A cross-field rule does.",
        },
        {
          kind: "quiz",
          id: "llm03-q4",
          question: "Why check the stop reason before parsing?",
          options: [
            "Parsing is slow.",
            "A truncated or refused response would otherwise be misreported as a syntax error and retried pointlessly.",
            "The stop reason holds the invoice total.",
            "Providers require it.",
          ],
          answer: 1,
          explain: "The stop reason says why the text ended. Truncation and refusal need different handling from malformed JSON.",
        },
        { kind: "p", text: "The layers tell you what is wrong. Some of those failures can be fixed by asking again, and the next section sets the limits." },
      ],
    },
    {
      id: "s4-repair-loop",
      title: "A repair loop is bounded and feeds back only the errors",
      goal: "What keeps a repair loop safe?",
      blocks: [
        {
          kind: "p",
          text: "Some failures are recoverable. A model that wrapped the JSON in prose will usually fix it when told. A **repair loop** retries with the validation errors and checks again. It needs three limits to be safe.",
        },
        {
          kind: "list",
          items: [
            "Cap the attempts. Three is a common default. Each retry costs money and time, and the third failure is rarely followed by a success.",
            "Send the original prompt plus the error messages. Do not append the bad output or the whole history, because that grows the prompt and can anchor the model on its mistake.",
            "Treat refusal and truncation separately. A refusal goes to review. A truncation will repeat unless the request changes, so fix the token limit or split the input.",
          ],
        },
        {
          kind: "p",
          text: "Write error messages for the model. Net plus VAT is 240.00 but total is 250.00 is far more useful than validation failed. Name the field, say what is wrong, and keep it to one sentence.",
        },
        {
          kind: "widget",
          id: "llm-repair-loop",
          intro: "Five scripted cases show what the model returns on each attempt. Set the attempt cap, predict how each case ends, and run the loop. One case changes outcome when the cap goes from three to four.",
        },
        {
          kind: "p",
          text: "Retries of the call itself, for timeouts and rate limits, are a different loop, and chapter four covers them. A repair retry changes the input to fix the content. A transport retry sends the same request again.",
        },
        {
          kind: "quiz",
          id: "llm03-q5",
          question: "What should a repair retry send to the model?",
          options: [
            "Only the validation errors.",
            "The original prompt plus the error messages.",
            "The entire conversation including every bad answer.",
            "The previous bad output with the word fix.",
          ],
          answer: 1,
          explain: "The model needs the task and the specific complaints. Replaying bad output grows the prompt and can anchor the model on the mistake.",
        },
        {
          kind: "quiz",
          id: "llm03-q6",
          question: "The model's JSON is cut off at the token limit. What does the loop do?",
          options: [
            "Retry the same request up to three times.",
            "Fail at once and fix the limit or split the input, because the same request would be cut off again.",
            "Fill in the missing fields with defaults.",
            "Lower the temperature and retry.",
          ],
          answer: 1,
          explain: "A truncation is a configuration problem. Repeating the request repeats the cut.",
        },
        { kind: "p", text: "Some answers stay wrong after every attempt. The next section says what the pipeline does then." },
      ],
    },
    {
      id: "s5-review-not-guess",
      title: "When repair fails, the document goes to review and nobody guesses",
      goal: "What happens when repair fails?",
      blocks: [
        {
          kind: "p",
          text: "When attempts run out, the pipeline must not invent a value to keep moving. A made-up due date or total passes quietly into the finance system and surfaces weeks later. The only safe outputs are a validated invoice or a controlled error that sends the document to the review queue.",
        },
        {
          kind: "p",
          text: "Return a result with a status, the attempt count and the errors. The caller then decides. Status ok posts the invoice. Status review queues it with the errors beside the document so a person sees what failed. Status failed raises an alert, because it points at configuration.",
        },
        {
          kind: "list",
          items: [
            "Count failures by type: syntax, schema, business rule, refusal and truncated. A rising schema rate points at the prompt. A rising truncation rate points at invoice length or the limit.",
            "Track attempts per document. Many second attempts mean the first prompt is weak.",
            "Add every failed document to the golden set, so the same failure can't return unnoticed.",
          ],
        },
        {
          kind: "callout",
          tone: "warn",
          title: "A default value is a guess in disguise",
          text: "Filling a missing currency with GBP because most invoices use it will be right nine times and wrong on the tenth. Missing means unknown, and unknown goes to review. The same applies to a zero for a missing VAT amount.",
        },
        {
          kind: "quiz",
          id: "llm03-q7",
          question: "After three attempts the due date is still missing. What does the pipeline do?",
          options: [
            "Set it to thirty days after the invoice date.",
            "Return status review with the errors and queue the document for a person.",
            "Post the invoice without a due date.",
            "Retry until it appears.",
          ],
          answer: 1,
          explain: "A missing value is unknown. A person decides, and the document joins the test set.",
        },
        { kind: "p", text: "You've seen the whole path by hand. Several libraries offer to run parts of it for you." },
      ],
    },
    {
      id: "s6-alternatives",
      title: "Alternatives: Instructor, Outlines and provider SDKs solve parts of this",
      goal: "Which libraries take over part of this job, and when?",
      blocks: [
        {
          kind: "p",
          text: "The default in this course is a typed model, such as Pydantic, with the provider's structured output feature and your own business rules. It uses few moving parts and works with any provider that offers a schema feature. The alternatives each take over one piece of the job.",
        },
        // CHECKED 17 Oct 2026: https://docs.vllm.ai/en/latest/features/structured_outputs.html
        {
          kind: "compare",
          caption: "Ways to get typed output. Check current documentation, because these libraries change quickly.",
          columns: ["Tool", "Best at", "When you switch to it", "What it costs you"],
          rows: [
            ["Pydantic with provider structured output", "A typed model, a provider-enforced schema and your own business rules", "This is the default", "You write the repair loop and the business rules"],
            ["Instructor", "Wrapping provider calls so they return validated typed objects with built-in retries", "You want the repair loop and typing in one library", "Another dependency, and you must still add business rules and review routing"],
            ["Outlines", "Constraining generation of open models to a schema or grammar", "You self-host a model without a built-in schema feature", "On hosted APIs it relies on the provider's own feature, so the gain is mainly for models you run"],
            ["Guided decoding in vLLM", "Schema-constrained output from open models you serve", "You already serve open models with vLLM", "Constraint support varies by version, and the old guided_json fields were replaced by structured_outputs in v0.12.0"],
            ["Zod in TypeScript", "The same typed validation in a TypeScript service", "Your pipeline code is TypeScript", "No automatic link to a Python model, so keep one schema as the source"],
          ],
        },
        {
          kind: "p",
          text: "None of these removes the need for business rules, the refusal path or the review queue. A library can run your retries for you. It cannot decide what your finance team will accept. That decision stays in your code.",
        },
        {
          kind: "quiz",
          id: "llm03-q8",
          question: "You serve an open model yourself and need schema-constrained output. Which option fits best?",
          options: [
            "Zod only.",
            "Guided decoding in vLLM or Outlines.",
            "A longer prompt.",
            "Instructor with no schema.",
          ],
          answer: 1,
          explain: "Constraining the decoder is what both do for models you run. Hosted APIs offer the same thing as a provider feature.",
        },
        { kind: "p", text: "Harbour keeps Pydantic and writes its own rules. The last section writes those decisions down as one policy." },
      ],
    },
    {
      id: "s7-extract-contract",
      title: "Harbour's extract job returns one of three results, and only one reaches the ledger",
      goal: "How do you write down what the pipeline does with every answer?",
      blocks: [
        { kind: "p", text: "The method is to name every way an answer can end, give each one a route, and fix the limits in a file." },
        { kind: "p", text: "Harbour takes the stop reason first. A refusal goes to review at once. A truncation is status failed and raises an alert, because the output limit from chapter one needs changing. Then the three layers run on everything else." },
        { kind: "p", text: "Take an invoice whose first answer reads net 200.00, VAT 40.00 and total 250.00. The business rule fails and writes one sentence for the model. The second attempt reads the total again as 240.00 and passes. Status is ok, with two attempts on the record." },
        { kind: "p", text: "Now take example four from the prompt, with no due date printed. The model returns null, and the schema layer rejects it three times. Status is review, and a clerk sees the errors beside the document." },
        { kind: "code", lang: "yaml", caption: "Harbour's policy for the extract job, and the three results it can return. Worked example.", code: "# config/extract_policy.yaml\njob: extract\nschema: harbour_llm.schemas.Invoice\n\nstop_reason:          # checked before parsing\n  refusal: review     # at once, with no repair\n  max_tokens: failed  # at once, and alert: fix the limit or split the input\n\nlayers: [syntax, schema, business_rules]   # stop at the first that fails\n\nbusiness_rules:\n  - lines_add_up_to_net\n  - net_plus_vat_is_total\n  - due_date_not_before_invoice_date\nmoney_tolerance: 0.005\n\nrepair:\n  max_attempts: 3\n  send: original_prompt_plus_error_messages\n  never_send: previous_output\non_attempts_exhausted: review\ndefault_for_missing_value: none   # a default is a guess\n\ncount_per_document: [status, attempts, failure_layer]\nadd_failed_documents_to: golden_set\n\n# ---------- the three results ----------\n\n# status ok: the only result that posts to the ledger\n{\"status\": \"ok\", \"attempts\": 2, \"errors\": [],\n \"invoice\": {\"supplier\": \"Brightpack Ltd\", \"invoice_number\": \"BP-2240\", \"...\": \"...\"}}\n\n# status review: a person decides, and no invoice is returned\n{\"status\": \"review\", \"attempts\": 3, \"invoice\": null,\n \"errors\": [{\"layer\": \"schema\", \"field\": \"due_date\",\n             \"message\": \"due_date is null and is required\"}]}\n\n# status failed: configuration is wrong, so alert\n{\"status\": \"failed\", \"attempts\": 1, \"invoice\": null,\n \"errors\": [{\"layer\": \"stop_reason\", \"field\": null,\n             \"message\": \"output hit max_output_tokens at 4000\"}]}" },
        { kind: "p", text: "Only status ok posts, and no invoice travels with the other two. A null that is truly absent wastes at most two extra calls, about 1.74 pence at the uncached rate. Harbour accepts that, because a wrong due date costs far more. Failed means the configuration needs a person, so it pages someone." },
        { kind: "code", lang: "text", caption: "For your next customer: copy this and fill it in.", code: "# config/[job]_policy.yaml\njob:\nschema:                    (the typed model, one definition)\nstop_reason:\n  refusal:                 (review, or failed)\n  max_tokens:              (usually failed)\nlayers: [syntax, schema, business_rules]\nbusiness_rules:            (each one a function a colleague can read)\nmoney_tolerance:\nrepair:\n  max_attempts:\n  send:                    (prompt plus error messages)\non_attempts_exhausted:     (review)\ndefault_for_missing_value: none\ncount_per_document:\nadd_failed_documents_to:" },
        { kind: "p", text: "All of this assumes the call came back. Chapter four asks what to do when it doesn't." },
      ],
    },
  ],
  lab: {
    title: "Validate and repair invoice JSON",
    goal: "Write validate.py and repair.py so a fake model's bad answers end in ok, review or failed, and no missing field is ever filled.",
    minutes: 40,
    files: ["labs/llm/src/llm_lab/validate.py", "labs/llm/src/llm_lab/repair.py", "labs/llm/tests/test_validate.py", "labs/llm/tests/test_repair.py"],
    steps: [
      {
        title: "Check the stop reason, then parse",
        text: "Run `uv sync` in `labs/llm` first. The given `types.py` holds the dataclasses. Write `validate(response)` in `validate.py`. If the stop reason is refusal, return one refusal error. If it is max_tokens, return one truncated error. Otherwise call `json.loads`, and on failure return one syntax error. Valid JSON that is not an object is a schema error.",
        code: "def validate(response: ModelResponse) -> ValidationResult:\n    if response.stop_reason == \"refusal\":\n        ...  # return one refusal error\n    if response.stop_reason == \"max_tokens\":\n        ...  # return one truncated error\n    # json.loads inside try/except ValueError, and a failure is one syntax error",
        test: "cd labs/llm && uv run pytest tests/test_validate.py -k ch03_s1",
      },
      {
        title: "Check the schema",
        text: "Check every field's type and report all problems, each with `field` set. Field names are snake_case, as in the Pydantic model in section 2. Dates must look like YYYY-MM-DD. Currency must be GBP, EUR or USD. Line item problems use a path such as `lines.0.quantity`. A boolean is not a number, though `True` is an `int` in Python.",
        test: "cd labs/llm && uv run pytest tests/test_validate.py -k ch03_s2",
      },
      {
        title: "Check the business rules",
        text: "Only when the schema passes, check three rules. Line amounts add up to net. Net plus VAT equals the total. The due date is not before the invoice date. Compare money with a tolerance of half a penny.",
        test: "cd labs/llm && uv run pytest tests/test_validate.py -k ch03_s3",
      },
      {
        title: "Loop with a cap",
        text: "Write `repair(model, prompt, max_attempts=3)` in `repair.py`. Call the model, validate, and return status ok with the invoice on success. Count every model call in `attempts`.",
        test: "cd labs/llm && uv run pytest tests/test_repair.py -k ch03_s4",
      },
      {
        title: "Feed back only the errors",
        text: "On a recoverable failure, build the next prompt from the original prompt plus one line per error message. Never include the bad output, and never build on the previous retry prompt.",
        code: "def feedback(prompt: str, errors: list[ValidationError]) -> str:\n    lines = [f\"- {e.field}: {e.message}\" if e.field else f\"- {e.message}\" for e in errors]\n    return (\n        f\"{prompt}\\n\\nYour previous answer failed validation:\\n\"\n        + \"\\n\".join(lines)\n        + \"\\nReturn the corrected JSON object only.\"\n    )",
        test: "cd labs/llm && uv run pytest tests/test_repair.py -k ch03_s5",
      },
      {
        title: "Route refusal, truncation and exhaustion",
        text: "A refusal returns status review at once. A truncation returns status failed at once. When attempts run out on recoverable errors, return status review with the last errors. Never fill in a missing field, and return no invoice unless the status is ok.",
        test: "cd labs/llm && uv run pytest tests/test_repair.py -k ch03_s6",
      },
    ],
    verify: "cd labs/llm && uv sync && uv run pytest",
  },
  recap: [
    "Provider structured output guarantees shape, not truth, so you still validate.",
    "Define the invoice once as a typed model and use it for both the schema and the checks.",
    "Check the stop reason, then syntax, then schema, then business rules.",
    "A repair loop sends the prompt plus the errors, caps the attempts and routes refusal and truncation separately.",
    "When repair fails, send the document to review, count the failure type and add it to the test set.",
    "One policy file names every ending, and only status ok reaches the ledger.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In structured output I learned that a schema guarantees shape and not truth. I validate in layers and repair with a bounded loop. I send what fails to review instead of guessing a value. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["llm-q05", "llm-q06"],
};

export default chapter;
