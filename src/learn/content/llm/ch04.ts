import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "llm-04-retries-and-fallbacks",
  course: "llm",
  number: 4,
  title: "Retry what was unlucky, fall back from what is broken and fail on what is wrong",
  tagline: "What does Harbour's pipeline do when the call itself fails? Sort the error first, because the class picks the reaction.",
  minutes: 45,
  objectives: [
    "Sort an error into transient, permanent or unknown, and pick retry, fall back, fail or review.",
    "Set base delay, cap and jitter so a crowd of clients does not retry in lockstep.",
    "Explain why a fallback changes the path and why its output needs the same validation.",
    "Count retries and fallbacks, and say why a rising rate is an alert.",
    "Write one error and fallback policy for a job with a deadline.",
  ],
  sections: [
    {
      id: "s1-error-classes",
      title: "Errors split into transient, permanent and unknown",
      goal: "Which class does an error belong to, and what does each class call for?",
      blocks: [
        { kind: "p", text: "Chapter three dealt with answers that came back wrong. This chapter deals with calls that don't come back well at all, and Harbour's portal gives it a deadline of 5 seconds." },
        {
          kind: "p",
          text: "Every failed model call belongs to one of three classes, and the class picks the reaction. A **transient** error may succeed if you try again soon. A **permanent** error will fail every time until someone changes something. An **unknown** error leaves you unsure whether the call ran.",
        },
        {
          kind: "list",
          items: [
            "Transient: rate limits, brief overload, a dropped connection. Wait, then retry.",
            "Permanent: a malformed request, an unknown model name, a rejected credential, a request over the size limit. Fix the cause. Do not retry.",
            "Unknown: a timeout with no response. The provider may have run the call and billed you. Retry only if repeating it is safe.",
          ],
        },
        {
          kind: "p",
          text: "Extraction is a read-like call, so repeating it is safe. An unknown outcome costs money and does no damage. That changes when a tool call can send an email or open a ticket. Course 2 covered idempotency and unknown outcomes for tools.",
        },
        {
          kind: "p",
          text: "A fourth outcome sits beside the three. The call succeeded but the content is wrong. It goes through the repair loop from chapter three, and then to review.",
        },
        {
          kind: "widget",
          id: "llm-error-classifier",
          intro: "Six error reports from the invoice extractor arrive one at a time. For each, decide whether to retry, fall back, fail or send to review. Each verdict is explained after you answer.",
        },
        {
          kind: "quiz",
          id: "llm04-q1",
          question: "The provider answers with a rejected API key. What should the pipeline do?",
          options: [
            "Retry with backoff.",
            "Fall back to another provider silently.",
            "Fail loudly and alert, because retrying cannot fix a credential.",
            "Send the invoice to review.",
          ],
          answer: 2,
          explain: "A permanent error repeats. A silent fallback would hide a broken credential until it hurts.",
        },
        { kind: "p", text: "The largest class in practice is the transient one. The next section shows how to retry it without making things worse." },
      ],
    },
    {
      id: "s2-backoff",
      title: "Exponential backoff with jitter stops a retry storm",
      goal: "How do base delay, cap and jitter stop retries bunching together?",
      blocks: [
        {
          kind: "p",
          text: "Course 1 used retries with backoff for embeddings, and a model call needs more care. If a provider drops a hundred of your requests, a naive loop retries all hundred a second later. It fails again and retries together again. Your own retries become the load that keeps the provider down. This is a **retry storm**.",
        },
        {
          kind: "p",
          text: "Exponential backoff doubles the wait after each failure. The delay is the base times two to the power of the attempt, up to a **cap**. That reduces total pressure. It does not stop clients that failed together from retrying together. For that you add jitter, a random spread inside each delay.",
        },
        {
          kind: "list",
          items: [
            "Base delay: the first wait. Too small gives the provider no time to recover.",
            "Cap: the longest wait. Without it, attempt ten waits for minutes.",
            "Full jitter: choose a random wait between zero and the current delay. It spreads clients across the window.",
            "Retry budget: a limit on attempts per call and on the share of traffic that may be retries. Three attempts is a common ceiling.",
          ],
        },
        // CHECKED 17 Oct 2026: https://platform.claude.com/docs/en/api/errors
        {
          kind: "p",
          text: "Providers often tell you how long to wait, usually in a retry-after header. Honour it. It is better information than your own guess. Many official SDKs also retry for you by default. Check before you add a second loop on top, or you will multiply attempts without meaning to.",
        },
        {
          kind: "widget",
          id: "llm-backoff-sim",
          intro: "Twenty clients fail at the same moment, and the provider recovers at once but accepts only five requests a second. Set the base delay, cap and jitter, predict whether the retries bunch or spread, and then simulate.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Name jitter before you are asked",
          text: "When an interviewer describes rate limits at peak, start with exponential backoff and jitter. Then honour the retry-after header, cap the attempts, and queue work that is not interactive. Put work that can wait on a batch API, which chapter seven covers. Add a client-side limiter, and ask for more quota as chapter five of the cloud course shows.",
        },
        {
          kind: "quiz",
          id: "llm04-q2",
          question: "Why add jitter to exponential backoff?",
          options: [
            "It shortens the delays.",
            "Clients that failed together would otherwise retry together, so jitter spreads them out.",
            "It removes the need for a cap.",
            "It makes errors transient.",
          ],
          answer: 1,
          explain: "Exponential delays alone are identical for identical clients. Randomness breaks that synchrony.",
        },
        {
          kind: "quiz",
          id: "llm04-q3",
          question: "A 429 response carries a retry-after header of 8 seconds. What is the best wait?",
          options: [
            "One second, to be quick.",
            "At least eight seconds, plus jitter.",
            "Zero, because rate limits reset instantly.",
            "Thirty minutes.",
          ],
          answer: 1,
          explain: "The header is the provider's own estimate. Retrying earlier wastes an attempt and may extend the limit.",
        },
        { kind: "p", text: "Retries assume the path works and only needs time. When it doesn't, you need a different path." },
      ],
    },
    {
      id: "s3-fallbacks",
      title: "A fallback changes the path, and a retry repeats it",
      goal: "How does a fallback differ from a retry, and what kinds exist?",
      blocks: [
        {
          kind: "p",
          text: "A **retry** repeats the same operation against the same target. A fallback, from course 6, switches to a different path because the primary is unavailable or unsuitable. Retrying a broken path wastes time. Falling back from a path that only had bad luck wastes money and quality.",
        },
        {
          kind: "list",
          items: [
            "Another model from the same provider, for example when the main one is overloaded.",
            "Another provider, for an outage that spans one vendor.",
            "Another extractor, such as an OCR and rules path when the language model path is down.",
            "A degraded answer, such as returning only the header fields, such as supplier, dates and total, and sending the line items to review.",
          ],
        },
        {
          kind: "p",
          text: "Decide the order in advance and write it down. A pipeline with three silent fallbacks is a pipeline where nobody knows which model produced a given invoice. Each fallback should be a deliberate decision with an owner, and each result should record which path was used.",
        },
        {
          kind: "p",
          text: "Routing a whole fleet of traffic across models, with circuit breakers that stop sending traffic to a failing provider, is a larger topic. Course 6 taught it. Here you only need the single-call idea.",
        },
        {
          kind: "quiz",
          id: "llm04-q4",
          question: "Which situation calls for a fallback rather than a retry?",
          options: [
            "One timeout during a normal afternoon.",
            "The primary model has returned errors on every attempt for twenty minutes.",
            "A single 429 with a short wait hint.",
            "A dropped connection that recovers on the second try.",
          ],
          answer: 1,
          explain: "A sustained failure means the path is broken. Waiting longer does not fix it, and switching path does.",
        },
        { kind: "p", text: "A fallback answer arrives looking just as valid as any other. The next section says what must happen to it." },
      ],
    },
    {
      id: "s4-fallback-validation",
      title: "Fallback output passes the same validation as the primary",
      goal: "How do you stop quality falling silently when another path takes over?",
      blocks: [
        {
          kind: "p",
          text: "A fallback model is usually smaller, older or a different family. It will make different mistakes. If it skips the checks that the primary goes through, the fallback is where quality drops without anyone noticing.",
        },
        {
          kind: "list",
          items: [
            "Run the same validation layers from chapter three on every fallback answer.",
            "Test the fallback prompt on the golden set before an outage, not during one. A prompt tuned for one model can underperform on another.",
            "Tag each result with the path that produced it, so you can compare accuracy by path later.",
            "Send more to review on the fallback path if its error rate is higher.",
          ],
        },
        {
          kind: "p",
          text: "The aim is that the fallback is slightly worse but still safe. A fallback that returns a plausible invoice with a wrong total is worse than an outage. An outage is visible and the wrong total is not.",
        },
        {
          kind: "quiz",
          id: "llm04-q5",
          question: "During an outage the pipeline switches to a cheaper model and skips the business-rule check to save time. What is the main risk?",
          options: [
            "Slower responses.",
            "Wrong values pass into the finance system unnoticed.",
            "Higher token prices.",
            "A longer context window.",
          ],
          answer: 1,
          explain: "The cheaper model errs differently, and without the check nobody sees it. Validation is not optional on any path.",
        },
        { kind: "p", text: "Retries and fallbacks keep the pipeline running, which also hides the trouble. Counting is how you see it." },
      ],
    },
    {
      id: "s5-count-everything",
      title: "Every retry and fallback is counted",
      goal: "What must you count, and when does a count become an alert?",
      blocks: [
        {
          kind: "p",
          text: "Retries and fallbacks hide trouble. A call that retries three times and then succeeds looks healthy on a success-rate chart. It still costs three times as much and takes three times as long. You only see that if you count.",
        },
        {
          kind: "list",
          items: [
            "Attempts per call, as a distribution. A rising average means the provider or your prompt is struggling.",
            "Fallback rate, split by reason. A jump means the primary path is unhealthy.",
            "Final outcome by path: ok, review and failed, for primary and fallback separately.",
            "Time spent in waits, because backoff adds latency users feel.",
          ],
        },
        {
          kind: "p",
          text: "Both rates are alerts. A fallback rate that climbs from near zero is an early warning of an outage, a quota problem or a deprecation. Alerting on it lets you act before quality or cost changes. Course 5 showed how to set them up.",
        },
        {
          kind: "quiz",
          id: "llm04-q6",
          question: "The success rate is steady at 99 percent, yet bills and latency are rising. What should you look at first?",
          options: [
            "Attempts per call and the fallback rate.",
            "The font used in the dashboard.",
            "Only the final success rate.",
            "The number of engineers on call.",
          ],
          answer: 0,
          explain: "Retries and fallbacks can turn failures into successes at a higher cost, so the final rate hides them.",
        },
        { kind: "p", text: "Each piece is now decided on its own. The last section writes Harbour's choices into one policy for the extract job." },
      ],
    },
    {
      id: "s6-error-policy",
      title: "Harbour's portal gets two short attempts, and its inbox route can afford to wait",
      goal: "How does a deadline turn into an error policy?",
      blocks: [
        { kind: "p", text: "The method is to start from the deadline, list each error class with its reaction, and check that the worst case still fits." },
        { kind: "p", text: "The portal must answer within 5 seconds. Each call gets 2 seconds, and a retry waits at most half a second. The worst case is 2, plus 0.5, plus 2, which is 4.5 seconds. Three attempts would break the limit, so the portal gets two." },
        { kind: "p", text: "If both attempts fail, the portal doesn't show an error. It says the invoice is received and sends it down the inbox route, where nobody is waiting. The inbox route gets three attempts of 30 seconds. Its waits are at most 1 and 2 seconds, so the worst case is 93 seconds." },
        { kind: "p", text: "Harbour turns off the SDK's own retries, because two loops multiply attempts. The fallback order names roles here, and chapter five fills in the models. Both models will sit in the same UK region, so a regional outage takes out both. The last step on that path is the review queue." },
        { kind: "code", lang: "yaml", caption: "Harbour's error and fallback policy for the extract job. Worked example, invented thresholds.", code: "# config/extract_errors.yaml\njob: extract\n\nsdk_retries: 0            # one retry loop only\n\nroutes:\n  portal:                 # the supplier is waiting\n    deadline_seconds: 5\n    call_timeout_seconds: 2\n    attempts: 2\n    backoff: {base_seconds: 0.5, factor: 2, cap_seconds: 0.5, jitter: full}\n    worst_case_seconds: 4.5   # 2 + 0.5 + 2\n    on_exhausted: move_to_inbox_route\n  inbox:                  # nobody is waiting\n    call_timeout_seconds: 30\n    attempts: 3\n    backoff: {base_seconds: 1, factor: 2, cap_seconds: 20, jitter: full}\n    worst_case_seconds: 93    # 30 + 1 + 30 + 2 + 30\n    on_exhausted: fall_back\n\nhonour_retry_after: true\n\nclasses:\n  transient: [429, 500, 503, dropped_connection]   # wait and retry\n  permanent: [400, 401, 403, 404, request_too_large]   # no retry: fail and alert\n  unknown:   [timeout]    # retry, because extraction is safe to repeat\ncontent_wrong: repair_loop   # chapter three's policy, then review\n\nfallback:\n  order: [primary_model, fallback_model, review_queue]\n  trigger: inbox attempts exhausted on a transient or unknown error\n  same_validation: true\n  tested_on_golden_set: before release, never during an outage\n  tag_every_result_with: path\n\nalerts:\n  fallback_rate_over_percent: 1     # over 15 minutes\n  average_attempts_over: 1.2        # over 15 minutes\n  any_permanent_error: page\ncount_per_call: [attempts, path, wait_seconds, final_status]" },
        { kind: "p", text: "The portal's limit fixed the attempts, and the sum proves it. A permanent error never retries, because a broken credential needs a person. Regional failure ends in the review queue, so the policy is honest about what it can't cover. Every result carries its path, so accuracy can be compared by path later." },
        { kind: "code", lang: "text", caption: "For your next customer: copy this and fill it in.", code: "# config/[job]_errors.yaml\njob:\nsdk_retries: 0\nroutes:\n  [route name]:\n    deadline_seconds:\n    call_timeout_seconds:\n    attempts:\n    backoff: {base_seconds:, factor:, cap_seconds:, jitter:}\n    worst_case_seconds:     (write out the sum)\n    on_exhausted:\nhonour_retry_after:\nclasses:\n  transient:\n  permanent:\n  unknown:                  (is the call safe to repeat?)\ncontent_wrong:\nfallback:\n  order:\n  trigger:\n  same_validation: true\n  tag_every_result_with: path\nalerts:\ncount_per_call:" },
        { kind: "p", text: "The policy names a primary model and a fallback model without saying which. Chapter five chooses them." },
      ],
    },
  ],
  recap: [
    "Classify an error as transient, permanent or unknown, and a successful call with bad content goes to repair and review.",
    "Exponential backoff needs a cap, jitter and a retry budget, and it should honour the provider's wait hint.",
    "A retry repeats the call and a fallback changes the path.",
    "Fallback output passes the same validation as the primary, and the pipeline tags which path produced it.",
    "Count attempts and fallbacks, and alert when either rate rises.",
    "Work out the worst case from the deadline, and write the attempts, classes and fallback order in one policy.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In retries and fallbacks I learned to retry what was unlucky, fall back from what is broken and fail on what is wrong. I use jitter, validation on every path and counts on both. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["llm-q07", "llm-q08"],
};

export default chapter;
