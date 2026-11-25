import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "llm-07-reasoning-models",
  course: "llm",
  number: 8,
  title: "Reasoning tokens pay only where one step depends on another",
  tagline: "Which of Harbour's jobs should think before answering? Reasoning buys accuracy on dependent steps, and you pay for it in tokens and seconds.",
  minutes: 50,
  objectives: [
    "Separate Harbour tasks that gain from reasoning from tasks that only get slower.",
    "Name the thinking budget field on each major provider and set a budget from an eval sweep.",
    "Predict the four ways reasoning breaks structured output and tool loops, and guard against each.",
    "Compare reasoning on and off on one eval set, including the cost of failures.",
    "Answer in under a minute when you would recommend a reasoning model.",
    "Write one reasoning setting per job, with the sweep that justifies it.",
  ],
  sections: [
    {
      id: "s1-when-it-pays",
      title: "Reasoning tokens buy accuracy on multi-step work and cost latency on everything else",
      goal: "Which Harbour jobs gain from reasoning, and which only get slower?",
      blocks: [
        { kind: "p", text: "Chapter seven left one setting open for reconcile. This chapter sets it for every job, and most of them turn out not to need it." },
        {
          kind: "p",
          text: "A reasoning model writes intermediate tokens before it answers. You pay for those tokens as output, and you wait for them. On a task with dependent steps, the extra work lets the model check itself. On a task with one step, there is nothing to check.",
        },
        {
          kind: "p",
          text: "Take a Harbour supplier statement, the supplier's own list of what it says Harbour owes. It lists 40 lines, 6 credit notes and 3 part payments. The model must match each line to the ledger and report the balance. This matching is called **reconciliation**. Each match changes what the next one means. That is multi-step work.",
        },
        {
          kind: "p",
          text: "Now take a supplier lookup. A supplier name comes in from an invoice, and the model returns the supplier ID from a short list. There is one step. The figures here are illustrative. A standard model gets 96 lookups in 100 right. A reasoning model gets 97, and the answer arrives four seconds later.",
        },
        {
          kind: "p",
          text: "On statements the picture changes. The standard model balances 52 in 100. With an eight thousand token thinking budget, it balances 93 in 100. The wait is worth it for a statement. A lookup happens during extract, where a supplier may be watching the portal.",
        },
        {
          kind: "callout",
          tone: "insight",
          title: "Reasoning helps where one step depends on the result of another",
          text: "Ask whether a later answer needs an earlier result. Reconciling, planning and checking several constraints at once do. Lookup, classification, rewriting and extraction from a clear layout usually do not. The test is the dependency between steps. How hard the task feels is a poor guide.",
        },
        {
          kind: "quiz",
          id: "llm07-q1",
          question: "Which Harbour task is most likely to gain from a reasoning model?",
          options: [
            "Mapping a supplier name on a typed header to its ID.",
            "Matching 40 statement lines to the ledger when credit notes and part payments change each balance.",
            "Rewriting the reason a payment is on hold, in a polite tone.",
            "Labelling an email as invoice or query.",
          ],
          answer: 1,
          explain: "The statement is the only task where each step depends on an earlier result. The other three are single-step work, where reasoning adds seconds and little accuracy.",
        },
        { kind: "p", text: "So reasoning is a setting per job. The next section finds that setting on each provider." },
      ],
    },
    {
      id: "s2-thinking-budget",
      title: "A thinking budget caps reasoning tokens, and each provider names the cap differently",
      goal: "Where is the setting on each provider, and how do you choose its value?",
      blocks: [
        {
          kind: "p",
          text: "A **thinking budget** says how many reasoning tokens a call may spend. On Anthropic models it's a target, and the output limit is the hard ceiling.",
        },
        {
          kind: "p",
          text: "A higher cap lets the model think longer on hard cases. It does not force the model to do so. On easy cases the model usually stops early, so the lookup above spends about 400 tokens whatever the cap.",
        },
        {
          kind: "p",
          text: "The knob takes one of two shapes. Some providers want a token count. Others want a level such as low, medium or high. Field names change between model generations. Read the current reference before you write the field.",
        },
        // CHECKED 9 Nov 2026: https://platform.claude.com/docs/en/build-with-claude/thinking and https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/thinking
        {
          kind: "compare",
          caption: "Each provider exposes the same idea through a different field, so pin the field in your config and test it.",
          columns: ["Provider", "Field", "Shape", "What to watch"],
          rows: [
            ["Gemini on Vertex AI", "`thinkingLevel` in `thinkingConfig`", "Level", "`thinkingBudget` is deprecated from Gemini 3 and returns an error on Gemini 4. Gemini 3.8 Flash and Gemini 4 Argon take `LOW`, `MEDIUM` or `HIGH`"],
            ["Anthropic Messages", "`thinking` set to adaptive, with `output_config.effort`. Older models use `budget_tokens`", "Level, or a token count on older models", "`budget_tokens` has a 1,024 minimum and stays below the maximum output tokens. Claude 4.7 and later return a 400 error for it"],
            ["OpenAI Responses", "`reasoning.effort`", "Level", "The level is coarse, and the maximum output tokens covers reasoning and answer together"],
          ],
        },
        {
          kind: "p",
          text: "Do not guess a budget. Run the eval set at four budgets and compare the pass rates. With a level knob, run each level instead. The curve rises, then flattens. Set the cap at the first point that clears your quality bar. Pin it in versioned config, as chapter six does for every input that changes behaviour.",
        },
        {
          kind: "widget",
          id: "llm-thinking-dial",
          intro: "Slide the thinking budget on a fixed set of 100 Harbour cases. Three paths each have a quality bar and a time limit. Pick the cheapest budget that meets both, then lock it in. Watch how cost per call follows the tokens used, not the cap.",
        },
        {
          kind: "p",
          text: "Two things show up in the dial. Cost follows the tokens the model actually spends, and the curve flattens at a different point for each task. So keep one budget per task type. A single budget for the whole system overpays for lookups or underpays for statements.",
        },
        {
          kind: "quiz",
          id: "llm07-q2",
          question: "A sweep gives 71, 86, 93 and 94 statements in 100 at budgets of 2,000, 4,000, 8,000 and 16,000. The bar is 90. Which budget do you set?",
          options: [
            "2,000, because it is the cheapest.",
            "4,000, because it is closest to the middle.",
            "8,000, because it is the first to clear the bar.",
            "16,000, because it has the highest pass rate.",
          ],
          answer: 2,
          explain: "Set the cap at the first budget that clears the bar. The step from 8,000 to 16,000 buys one point and costs far more tokens.",
        },
        // CHECKED 17 Oct 2026: https://platform.claude.com/docs/en/build-with-claude/extended-thinking
        {
          kind: "quiz",
          id: "llm07-q3",
          question: "A lookup call has a 16,000 token budget, and the model thinks for 400 tokens. What do you pay for thinking?",
          options: [
            "The full 16,000 tokens, because the cap is reserved.",
            "The 400 tokens used, at the output rate.",
            "Nothing, because thinking tokens are free.",
            "Only the input tokens.",
          ],
          answer: 1,
          explain: "Thinking tokens bill as output tokens, and you pay for those the model spends. The cap bounds the worst case. It does not set the usual cost.",
        },
        { kind: "p", text: "A sensible setting can still break a pipeline that worked before. The next section lists how." },
      ],
    },
    {
      id: "s3-structured-and-tools",
      title: "Reasoning breaks structured output and tool loops in four predictable places",
      goal: "Where does reasoning break a working pipeline?",
      blocks: [
        {
          kind: "p",
          text: "Reasoning changes the call as well as the answer. A pipeline that works with reasoning off can fail in four ways once you switch it on. Each has a fix you can write down before the incident.",
        },
        {
          kind: "p",
          text: "Two of the four involve the tool loop from chapter seven.",
        },
        // CHECK: confirm Gemini counts thinking tokens inside maxOutputTokens and bills them at the output rate; the thinking page says only that thinking tokens are billed https://cloud.google.com/vertex-ai/generative-ai/pricing
        {
          kind: "list",
          ordered: true,
          items: [
            "Truncation. Reasoning tokens share the output allowance. Set the maximum to 4,000 and let the model think for 3,800, and a 600 token JSON answer is cut off after 200. Set the maximum above the budget plus the answer plus headroom.",
            "Forced tool choice. Some providers allow only automatic or no tool choice while reasoning is on. A rule that says always call the tool that reads the ledger then fails or is ignored. Test every tool rule with reasoning on.",
            "Dropped reasoning in the tool loop. Some providers want the reasoning from the last turn sent back with the tool result. A wrapper that keeps only the visible text can lower quality or get the call rejected. Carry the whole assistant turn forward.",
            "Time-outs. A 63 second call breaks a 30 second client time-out and stalls a worker. Stream the reply, raise the limit for that path only, or move the work to a batch job, as in chapter seven.",
          ],
        },
        // CHECKED 17 Oct 2026: https://developers.openai.com/api/docs/guides/reasoning
        {
          kind: "code",
          lang: "python",
          caption: "The older form with an explicit budget, for Claude models before 4.7. Later models take a level instead. The maximum covers the thinking and the answer together.",
          code: "response = client.messages.create(\n    model=MODEL,  # pinned snapshot, as in chapter six\n    max_tokens=9000,  # budget 8000 + answer 600 + headroom\n    thinking={\"type\": \"enabled\", \"budget_tokens\": 8000},\n    messages=[{\"role\": \"user\", \"content\": statement_prompt}],\n)\nif response.stop_reason == \"max_tokens\":\n    route_to_review(response)  # truncated, never parse it",
        },
        {
          kind: "p",
          text: "Structured output itself combines safely with reasoning. The schema constrains the final answer, and the thinking stays free text. Validate the answer anyway, using the three layers from chapter three. A smarter model can still return totals that do not add up.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Sampling settings may be fixed on reasoning models",
          text: "Some reasoning models ignore or reject temperature and top-p. A regression test that assumed temperature zero then behaves differently. Check the model's own reference before you rely on the sampling lessons in chapter one.",
        },
        {
          kind: "quiz",
          id: "llm07-q4",
          question: "The maximum output is 5,000 tokens. The model thinks for 4,700 tokens, and the JSON answer needs 800. What happens?",
          options: [
            "The JSON is complete, because thinking tokens are free.",
            "The JSON is cut off after about 300 tokens and the stop reason says the limit was reached.",
            "The provider raises the maximum automatically.",
            "The model skips thinking to fit the answer.",
          ],
          answer: 1,
          explain: "Thinking and answer share the 5,000 tokens. Only 300 remain for the answer. Check the stop reason before you parse, and set the maximum above budget plus answer.",
        },
        {
          kind: "quiz",
          id: "llm07-q5",
          question: "Your tool loop works with reasoning off. With it on, quality drops after the first tool call. What do you check first?",
          options: [
            "Whether the wrapper sends the previous turn's reasoning back with the tool result.",
            "Whether the temperature is set to zero.",
            "Whether the prompt has enough examples.",
            "Whether the tool schema uses camel case.",
          ],
          answer: 0,
          explain: "A wrapper that keeps only visible text drops the reasoning the provider expects back. That fits a drop that starts after the first tool call.",
        },
        { kind: "p", text: "Those are the risks. The next section measures whether the gain is worth taking them." },
      ],
    },
    {
      id: "s4-measure-on-off",
      title: "Compare reasoning on and off on one eval set, and count the cost of failures",
      goal: "How do you compare reasoning on and off, failures included?",
      blocks: [
        {
          kind: "p",
          text: "Use one fixed eval set, the same prompt and the same slices. Score every run with the same graders, the checks that mark each answer.",
        },
        {
          kind: "p",
          text: "Change one thing, the reasoning setting. Run each setting on every slice. Chapter five of the evaluation course covers repeat-run noise and how to compare two settings fairly. Chapter six of the evaluation course covers the `--runs` option for repeated runs.",
        },
        {
          kind: "p",
          text: "Report four numbers per slice. They are the pass rate, the cost per call, the latency at the slow end and the cost per successful task. Then add the cost of failures, as chapter five's record did.",
        },
        {
          kind: "compare",
          caption: "On statements, reasoning lifts the pass rate by 41 points. On lookups it adds one point and four seconds. Illustrative figures.",
          columns: ["Slice", "Setting", "Pass rate of 100", "Cost per call", "Slow-end latency", "Cost per success"],
          rows: [
            ["Statements", "Reasoning off", "52", "0.35 pence", "1 second", "0.67 pence"],
            ["Statements", "Budget 8,000", "93", "3.45 pence", "63 seconds", "3.71 pence"],
            ["Lookups", "Reasoning off", "96", "0.35 pence", "1 second", "0.36 pence"],
            ["Lookups", "Budget 8,000", "97", "0.55 pence", "5 seconds", "0.57 pence"],
          ],
        },
        {
          kind: "p",
          text: "Cost per success alone says reasoning is dearer on statements. Add the failures. A failed statement goes to a clerk, and a fix costs 150 pence. Without reasoning, 48 in 100 fail, so a statement costs 0.35 plus 0.48 times 150. That is 72.35 pence.",
        },
        {
          kind: "p",
          text: "With the 8,000 budget, 7 in 100 fail. A statement costs 3.45 plus 0.07 times 150, which is 13.95 pence. Reasoning is nearly ten times dearer per call and about five times cheaper per statement. The gain comes from the failures it removes.",
        },
        {
          kind: "p",
          text: "Scale it to a month. Harbour receives 2,000 statements. With reasoning off, that is 2,000 times 72.35 pence, or 1,447 pounds. With the 8,000 budget, it is 2,000 times 13.95 pence, or 279 pounds. The saving is 1,168 pounds a month, before you count the clerks' time.",
        },
        {
          kind: "p",
          text: "Lookups give the opposite answer. Reasoning costs 57 percent more per call and adds four seconds for one extra point. So route by task type. A plain rule on task type is enough, with no model needed. Re-run the comparison when a provider ships a new model, because the curve changes.",
        },
        {
          kind: "quiz",
          id: "llm07-q6",
          question: "Reasoning lifts a task from 80 to 88 in 100. The call cost rises from 0.4 to 1.2 pence, and each failure costs 50 pence to fix. Does it pay?",
          options: [
            "Yes, at 7.2 pence per task against 10.4 pence.",
            "No, because the call costs three times as much.",
            "No, because only an 8 point gain is too small to count.",
            "Yes, but only if latency does not matter.",
          ],
          answer: 0,
          explain: "Off costs 0.4 plus 0.20 times 50, which is 10.4 pence. On costs 1.2 plus 0.12 times 50, which is 7.2 pence. Latency is a separate limit, so confirm it fits before you ship.",
        },
        { kind: "p", text: "The sums settle the case for one job. The next section turns them into a rule you can say aloud." },
      ],
    },
    {
      id: "s5-interview-answer",
      title: "Recommend a reasoning model only when four checks pass, and say so in under a minute",
      goal: "How do you decide in under a minute whether to recommend a reasoning model?",
      blocks: [
        {
          kind: "p",
          text: "Interviewers want a rule. Four checks make one. Say them in this order.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "The task has dependent steps.",
            "Failures survive a clear prompt and a good example set.",
            "The eval shows a gain that repays the cost of failures.",
            "The latency budget allows the extra seconds.",
          ],
        },
        {
          kind: "p",
          text: "If any check fails, stay on the standard model. Some tasks fail before the first check. Adding a column of line amounts is arithmetic, and code does it exactly. Do not buy thinking tokens for work a function can do.",
        },
        {
          kind: "widget",
          id: "llm-reason-or-not",
          intro: "Six Harbour tasks arrive one at a time. For each, choose a standard model, a reasoning model, or plain code. You get a second try if the first is wrong, and the reason appears when the task is settled.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "When would you recommend a reasoning model over a standard one?",
          text: "Open with the answer: only for multi-step tasks where a clear prompt still fails and the eval shows the gain repays the cost of failures. Then give the Harbour pair. Statements yes, lookups no. Interviewers push on latency and cost. Statements go from 52 to 93 in 100, and a call from 0.35 to 3.45 pence.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "How do you set a thinking budget?",
          text: "Open with the method: sweep the eval set at four budgets and take the first that clears the bar. Then name the guards. The output maximum sits above budget plus answer, there is one budget per task type, and the value lives in versioned config. On truncation and time-out, cite the stop reason check and the batch path.",
        },
        {
          kind: "quiz",
          id: "llm07-q7",
          question: "Reasoning lifts an email classifier from 94 to 95 in 100 and adds 5 seconds on the upload path. What do you recommend?",
          options: [
            "Switch on reasoning, because accuracy always wins.",
            "Stay on the standard model, because the gain is one point and the upload path cannot wait.",
            "Switch on reasoning, but only at night.",
            "Fine-tune the reasoning model instead.",
          ],
          answer: 1,
          explain: "The task has one step, the gain is small and the latency check fails. Any one failed check is enough to stay on the standard model.",
        },
        { kind: "p", text: "Harbour has run its sweep. The last section records one setting for each job." },
      ],
    },
    {
      id: "s6-reasoning-sheet",
      title: "Harbour turns reasoning up for reconcile and keeps it low everywhere else",
      goal: "What does a reasoning decision look like for a whole system?",
      blocks: [
        { kind: "p", text: "The method is to apply the four checks to each job, sweep only the jobs that pass them, and write down one setting per job." },
        { kind: "p", text: "Reconcile passes all four checks. Each match depends on the last, and failures survive a clear prompt. It saves 1,168 pounds a month, and nobody is waiting. Harbour's models take a level rather than a token count. In its sweep, `LOW` spent about 2,000 tokens, `MEDIUM` about 4,000 and `HIGH` about 8,000." },
        { kind: "p", text: "The pass rates were 71, 86 and 93 in 100, and the bar is 90, so reconcile takes `HIGH`. Its output limit is 9,000, which is 8,000 for thinking, 600 for the answer and 400 of headroom. Its slowest calls take 63 seconds, so reconcile gets a 120 second timeout on a worker." },
        { kind: "p", text: "The other jobs fail the first check. Harbour sets them to the lowest level each model allows. Google documents no way to switch thinking off on these two models, so off means lowest. Lookups stay low because the gain was one point and four seconds." },
        { kind: "code", lang: "yaml", caption: "Harbour's reasoning settings per job. Worked example, invented sweep figures. Level names read from Google's page on 9 November 2026.", code: "# config/reasoning.yaml\n# thinkingLevel values: gemini-3.5-flash takes MINIMAL, LOW, MEDIUM, HIGH\n#                       gemini-4-argon takes LOW, MEDIUM, HIGH\n\njobs:\n  extract_text:\n    model: gemini-3.5-flash\n    thinking_level: MINIMAL\n    checks_failed: [no dependent steps]\n  extract_scan:\n    model: gemini-4-argon\n    thinking_level: LOW         # lowest this model allows\n    checks_failed: [no dependent steps]\n  lookup:\n    model: gemini-3.5-flash\n    thinking_level: MINIMAL\n    checks_failed: [no dependent steps]\n    measured: {off: 96, on: 97, added_seconds: 4}\n  code:\n    model: gemini-4-argon\n    thinking_level: LOW\n    checks_failed: [no dependent steps]\n  chat:\n    model: gemini-3.5-flash\n    thinking_level: MINIMAL\n    checks_failed: [a clerk is waiting]\n  reconcile:\n    model: gemini-4-argon\n    thinking_level: HIGH\n    max_output_tokens: 9000      # thinking 8,000 + answer 600 + headroom 400\n    timeout_seconds: 120         # slowest calls take 63 seconds\n    route_on_max_tokens: review  # truncated, never parsed\n    sweep:                       # statements passing, of 100; bar 90\n      LOW: 71\n      MEDIUM: 86\n      HIGH: 93\n    money:\n      cost_of_one_failure: 150p (assumption)\n      per_statement_off: 72.35p\n      per_statement_on: 13.95p\n      monthly_saving_pounds: 1168   # 2,000 x (72.35p - 13.95p)\n\nrule_for_next_review: rerun the sweep when a pinned model changes" },
        { kind: "p", text: "One job in six turns reasoning up, and that job pays for it through failures it removes. The call costs ten times more and the statement costs five times less. Arithmetic stays in code, because a function adds a column exactly. The 9,000 assumes Gemini counts thinking inside the output limit, as Anthropic does, so Harbour's first run checks that." },
        { kind: "code", lang: "text", caption: "For your next customer: copy this and fill it in.", code: "# config/reasoning.yaml, for [customer]\njobs:\n  [job]:\n    model:\n    thinking_level:       (or budget, on models that take one)\n    checks_failed:        (which of the four, if any)\n  [job that passes all four]:\n    model:\n    thinking_level:\n    max_output_tokens:    (thinking + answer + headroom)\n    timeout_seconds:\n    route_on_max_tokens:  review\n    sweep:                (one pass rate per level)\n    money:\n      cost_of_one_failure:\n      per_task_off:\n      per_task_on:\nrule_for_next_review:" },
        { kind: "p", text: "Every setting so far was chosen on a model someone else trained. Chapter nine asks when Harbour should train its own." },
      ],
    },
  ],
  recap: [
    "Reasoning pays on tasks where one step depends on another, and it only adds seconds to single-step work.",
    "A thinking budget caps reasoning tokens. Providers name it differently, and you set it from the first point on an eval sweep that clears the bar.",
    "Set the output maximum above budget plus answer, check the stop reason, and test tool rules and tool loops with reasoning on.",
    "Compare reasoning on and off on one eval set and include the cost of failures, since a dearer call can make a cheaper task.",
    "Recommend reasoning only when the task has dependent steps, failures survive a clear prompt, the eval repays the cost and latency allows it.",
    "Set reasoning per job, and write the sweep and the money beside the setting.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In reasoning models I learned to spend thinking tokens only where steps depend on each other. I set the budget from an eval sweep that includes the cost of failures. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["llm-q13", "llm-q14"],
};

export default chapter;
