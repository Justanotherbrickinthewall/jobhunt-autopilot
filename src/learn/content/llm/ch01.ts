import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "llm-01-how-models-behave",
  course: "llm",
  number: 1,
  title: "A model call is a bill you can work out before you send it",
  tagline: "What does one model call cost, what can cut it short, and which part can you reuse? Harbour's extraction call answers all three.",
  minutes: 45,
  objectives: [
    "Explain why token counts, not characters or words, set both your bill and your limits.",
    "Predict which completions a given temperature and top-p allow, and say why temperature zero is still not fully deterministic.",
    "Treat the context window as a budget with a separate output limit.",
    "Order a prompt so that a prefix cache hits, and name what breaks a hit.",
    "Map the same controls across the main providers, and know when each option fits.",
    "Fill in a one-page budget sheet for one model call.",
  ],
  sections: [
    {
      id: "s1-tokens",
      title: "Text becomes tokens, and tokens are the unit of cost and limit",
      goal: "What is a token, and why does the same invoice cost different amounts in different formats?",
      blocks: [
        {
          kind: "callout",
          tone: "insight",
          title: "The project in this course is Harbour's model layer",
          text: "Harbour Supplies, the fictional UK distributor, comes from the FDE craft course, along with finance words such as ledger and review queue.",
        },
        { kind: "p", text: "This course sets Harbour one year after that engagement. The invoice extractor worked, so other jobs now want a model too. Scans passed the 10 percent line the team agreed to watch, and suppliers got an upload page." },
        { kind: "p", text: "Harbour's engineers don't want five teams calling a model five ways. They are building a **model layer**, the one module and config that every job goes through to reach a model. The sheet below holds the facts this course shares." },
        { kind: "code", lang: "text", caption: "Harbour's model layer: the shared facts. Worked example, invented figures.", code: "HARBOUR MODEL LAYER: shared facts\n\nSetting    One year after the FDE craft engagement\nPlatform   Gemini on Vertex AI, in Harbour's Google Cloud project\nRegion     UK only, by customer contract (europe-west2)\nRule       Nothing reaches the ledger unless it passes validation.\n           Anything unknown goes to the review queue.\n\nJOB        WHAT IT DOES                            VOLUME\nextract    Reads an invoice into typed fields      10,000 invoices a month, about 10 lines each\nlookup     Finds a supplier id during extract      about 2,000 calls a month\nreconcile  Matches a supplier statement to ledger  2,000 statements a month\ncode       Picks one of 40 ledger codes per line   100,000 lines a month\nchat       Answers clerks' questions on screen     about 300 questions a working day\nbackfill   Reads archived invoices, once           40,000 pages\n\nROUTES INTO EXTRACT\ninbox      PDFs from the shared inbox, as before. Nobody is waiting.\nportal     Supplier upload page. The supplier waits, 5 second limit.\nscans      About 20 percent of invoices, on either route." },
        { kind: "p", text: "Each chapter adds one finished artefact to the model layer. Chapter ten assembles them and follows one invoice through the lot. This chapter starts with the first question any model call raises, which is what it costs." },
        {
          kind: "p",
          text: "A model never sees your text. It sees a list of integers. A **tokeniser** cuts the text into pieces from a fixed vocabulary, and each piece becomes one token, from course 1. Common words are often one token. Rare words, names and numbers split into several.",
        },
        {
          kind: "p",
          text: "Every provider bills and limits in tokens. Input tokens are what you send. Output tokens are what the model writes. Output usually costs more per token than input, because each output token needs its own forward pass. That is the first way you pay for a token. Section three names the second.",
        },
        {
          kind: "p",
          text: "Token counts vary with the text. English prose is cheap. A supplier name in another script can cost several times more tokens than the same number of English characters. So can a serial number such as NP-20417-B, or a table flattened from a scan.",
        },
        {
          kind: "p",
          text: "Different model families also use different tokenisers. The same invoice has different counts on different models.",
        },
        {
          kind: "list",
          items: [
            "Count with the provider's own token counter, not with a word count or a rule of thumb.",
            "Measure tokens on your real invoices, including the scans. Clean sample text lies about cost.",
            "Budget output separately. A long JSON answer with line items can cost more than the invoice you sent in.",
          ],
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Interviewers ask what the bill is made of",
          text: "A strong answer names input tokens, output tokens, and any cached input at a lower rate. It adds that you measure tokens on real traffic, because language, formatting and tables change the count. It ends by saying output is the lever you control most, through a tighter schema and a shorter answer.",
        },
        {
          kind: "quiz",
          id: "llm01-q1",
          question: "Harbour Supplies switches from clean typed invoices to scanned ones in several languages. The character count per invoice stays the same. What most likely happens to cost?",
          options: [
            "Nothing, because cost follows characters.",
            "It rises, because rare words, names and numbers split into more tokens.",
            "It falls, because scans are shorter.",
            "It only changes for output tokens.",
          ],
          answer: 1,
          explain: "Providers bill in tokens. Unusual text splits into more tokens per character, so the same character count can cost more.",
        },
        { kind: "p", text: "Tokens set the size of the bill. The next question is how the model picks each token, because that decides how much the answer can vary." },
      ],
    },
    {
      id: "s2-sampling",
      title: "Sampling turns a probability distribution into one answer",
      goal: "Which tokens do temperature and top-p allow, and why does temperature zero still vary?",
      blocks: [
        {
          kind: "p",
          text: "At each step the model produces a score for every token in its vocabulary. A **softmax** turns those scores into probabilities. Then a sampler picks one token, appends it, and the model runs again. The answer is a chain of those picks.",
        },
        {
          kind: "p",
          text: "**Temperature** divides the scores before the softmax. Below one, the gap between the leader and the rest widens, so the leader wins more often. Above one, the gap narrows and unlikely tokens get real chances. Near zero, the sampler simply takes the top token.",
        },
        {
          kind: "p",
          text: "**Top-p**, also called nucleus sampling, cuts the tail. It keeps the smallest set of top tokens whose probabilities add up to p, drops the rest, and renormalises. The two controls stack. Temperature reshapes the curve, then top-p trims it.",
        },
        {
          kind: "widget",
          id: "llm-sampling-dial",
          intro: "A fixed set of six candidate words follows the text Invoice status. Predict how many words survive at temperature 0.5 and top-p 0.9, then check. After that, drag the dials and watch which words become possible.",
        },
        {
          kind: "p",
          text: "Temperature zero is not fully deterministic. Greedy decoding picks the top token, but two tokens can have scores that differ by a rounding error. Floating point sums depend on the order of operations, and that order shifts with batching, hardware and kernel choices on the provider's side. A tie flips, and the rest of the answer follows the flip.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Do not build logic that needs identical text",
          text: "Pinning temperature to zero makes outputs steadier and still leaves them able to differ. If a downstream step compares strings or a test asserts exact wording, you have a flaky test waiting. Validate structure and meaning instead, as chapter three shows.",
        },
        // CHECKED 17 Oct 2026: https://platform.claude.com/docs/en/api/messages
        {
          kind: "p",
          text: "A **seed** is the obvious next idea, and it helps less than you would hope. Where a provider offers one, it fixes the random draw in the sampler. It cannot fix the numerical noise from batching. So a seed makes two runs more alike, and it still does not promise identical text.",
        },
        {
          kind: "quiz",
          id: "llm01-q2",
          question: "A teammate says temperature zero makes the extractor fully deterministic, so a regression test can compare raw text. What is the best reply?",
          options: [
            "Correct, zero removes all randomness.",
            "It reduces variation, but ties, batching and floating point order can still change output, so compare parsed fields.",
            "Use temperature two for stability.",
            "Set top-p to zero instead.",
          ],
          answer: 1,
          explain: "Greedy decoding removes the sampling step, not the numerical noise in the scores. Compare structure and values, not raw strings.",
        },
        {
          kind: "quiz",
          id: "llm01-q3",
          question: "You raise temperature from 0.5 to 1.5 and leave top-p at 1. What changes?",
          options: [
            "The leading token becomes more dominant.",
            "The distribution flattens, so unlikely tokens get a larger share.",
            "The model reads more of the context.",
            "Output length is capped.",
          ],
          answer: 1,
          explain: "Dividing scores by a larger temperature shrinks the gaps between them, which raises the probability of the tail.",
        },
        { kind: "p", text: "Sampling explains how one call behaves. The window decides what a call is allowed to hold, and that comes next." },
      ],
    },
    {
      id: "s3-context",
      title: "The context window is a budget that every call spends from scratch",
      goal: "What must fit inside the window, and what limits the answer separately?",
      blocks: [
        {
          kind: "p",
          text: "The context window, from course 1, is the most tokens a model can handle in one call. It covers the system prompt, the examples, the documents you paste, the conversation so far, and the answer. You spend that budget again on every call.",
        },
        {
          kind: "p",
          text: "A model has no memory between calls. If a fact is not in this call's window, the model does not have it. Chat products feel like memory because they resend the history every turn. That is the second way you pay. Each answer is billed as output, then again as input on every later turn.",
        },
        {
          kind: "p",
          text: "Providers also set a separate **output limit**, usually far below the window. If the answer hits it, generation stops mid-sentence. For an invoice with sixty line items, a cut-off JSON object is a real failure, and chapter three handles it as its own error type.",
        },
        {
          kind: "list",
          items: [
            "Input plus output must fit in the window. A huge input leaves less room for the answer.",
            "Attention does not stay even across a long input. Facts in the middle of a very long prompt are often used less reliably than facts at the start or end.",
            "A bigger window does not make a prompt cheaper. You pay for every token you send, on every call.",
          ],
        },
        {
          kind: "p",
          text: "Retrieval exists because of that last point. Sending only the passages that matter is cheaper and gives the model less to ignore. Course 1 covered it in full.",
        },
        {
          kind: "quiz",
          id: "llm01-q4",
          question: "A 60-line invoice extraction keeps ending in broken JSON, although the input is well inside the window. What should you check first?",
          options: [
            "The output token limit and the stop reason on the response.",
            "The temperature.",
            "The tokeniser version.",
            "Whether the system prompt is polite.",
          ],
          answer: 0,
          explain: "A cut-off object is the signature of hitting the output limit. The stop reason says whether generation ended naturally or ran out of tokens.",
        },
        { kind: "p", text: "You pay for every token you send on every call. Part of the input repeats on every call, and the next section shows how to stop paying full price for it." },
      ],
    },
    {
      id: "s4-caching",
      title: "Prompt caching rewards a stable prefix",
      goal: "How should a prompt be ordered so repeated requests reuse work?",
      blocks: [
        {
          kind: "p",
          text: "Before it writes anything, the model processes your whole input. Prompt caching, from course 1, lets a provider keep that work for a prefix of the input and reuse it on the next request. Cached input tokens are billed at a lower rate and usually return faster.",
        },
        {
          kind: "p",
          text: "The rule is simple. A cache matches from the very first token and stops at the first difference. Everything before that point can be reused. Everything after it is processed again. So the order of your prompt decides your savings.",
        },
        {
          kind: "list",
          items: [
            "Put what never changes first: system rules, the invoice schema, worked examples and tool definitions. A tool, from course 2, is a function the model may ask your code to run.",
            "Put what changes last: the invoice text, the user question, today's date.",
            "Do not put a timestamp, a request id or a user name at the top. One changed character early wipes out the rest.",
            "Keep the stable block byte-identical. Reordering examples or changing whitespace counts as a change.",
          ],
        },
        {
          kind: "widget",
          id: "llm-cache-prefix",
          intro: "Five parts make up the prompt, and the date sits first. Predict how many tokens request two can take from the cache. Then reorder the parts until the stable ones come first and watch the cost drop.",
        },
        // CHECKED 17 Oct 2026: https://platform.claude.com/docs/en/build-with-claude/prompt-caching
        {
          kind: "p",
          text: "Providers differ on the details. Some cache automatically. Some ask you to mark where the cached prefix ends.",
        },
        {
          kind: "p",
          text: "Entries expire after a short time, so a cache only helps if requests arrive while it is warm. Most providers also set a minimum length, and a shorter prefix simply isn't cached. Check the current documentation before you design around any of this.",
        },
        {
          kind: "p",
          text: "Write and read are priced differently, and the ratio is what matters. Say a normal input token costs 1 unit. A cache write might cost 1.25 units and a cache read 0.1 units. A 2,400 token prefix then costs 3,000 units to write once and 240 units to read. One read repays the write premium.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Say what breaks a hit",
          text: "Interviewers like the follow-up question about why caching did not help. Strong candidates go through the causes in order. Something volatile sits early in the prompt. The stable block is not byte-identical. The prefix is below the minimum length. Or traffic is too sparse and the entry expired. They log cached tokens per request to prove it.",
        },
        {
          kind: "quiz",
          id: "llm01-q5",
          question: "Which change is most likely to wreck a prefix cache hit rate?",
          options: [
            "Appending the invoice text after the schema.",
            "Putting the current timestamp in the first line of the system prompt.",
            "Keeping worked examples in a fixed order.",
            "Using the same tool definitions on every call.",
          ],
          answer: 1,
          explain: "A value that changes on every request, placed at the start, makes every prefix different from the first token on.",
        },
        {
          kind: "quiz",
          id: "llm01-q6",
          question: "Your cache hit rate is zero although the stable block is in front. Which cause is worth checking?",
          options: [
            "The prefix is shorter than the provider's minimum cacheable length.",
            "The model has too many parameters.",
            "Temperature is above zero.",
            "The answer is too long.",
          ],
          answer: 0,
          explain: "Providers set a minimum prefix length for caching. A short prefix is processed fresh every time, however stable it is.",
        },
        { kind: "p", text: "Tokens, sampling, the window and the cache exist on every serious platform. The names differ, so the next section maps them." },
      ],
    },
    {
      id: "s5-alternatives",
      title: "Alternatives: providers expose the same knobs under different names",
      goal: "How do the main hosted and open options map to the same controls?",
      blocks: [
        {
          kind: "p",
          text: "The mechanics in this chapter are the same everywhere. Tokens, sampling, a window and a prefix cache exist on every serious platform. What changes is the names, the defaults and which knobs you are allowed to touch.",
        },
        {
          kind: "p",
          text: "Harbour runs on Google Cloud, so the tables lead with Gemini on Vertex AI, the default in this course. The others are real alternatives.",
        },
        // CHECKED 21 Oct 2026: https://docs.cloud.google.com/gemini-enterprise-agent-platform/release-notes (22 April 2026 rename; the code still imports vertexai)
        {
          kind: "p",
          text: "Google renamed the platform that hosts these models to Gemini Enterprise Agent Platform in April 2026. The code still imports `vertexai`, so this course keeps saying Vertex AI.",
        },
        // CHECKED 17 Oct 2026: https://developers.openai.com/api/docs/guides/prompt-caching
        // CHECKED 9 Nov 2026: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/data-residency (eu multi-region excludes the United Kingdom)
        {
          kind: "compare",
          caption: "The same four controls across the main options. Verify details against current documentation.",
          columns: ["Tool", "Best at", "When you switch to it", "What it costs you"],
          rows: [
            ["Gemini on Vertex AI", "Models inside your Google Cloud project, with IAM, `us` and `eu` multi-region endpoints, very long inputs and multimodal files", "Your software and data already run on Google Cloud, as Harbour's do", "Quotas per region and model, and model ids that retire on a published date"],
            ["Anthropic API", "Long, careful instruction following and explicit cache control", "A customer already uses it, or your golden set shows it follows your instructions better", "You depend on one vendor, and some sampling controls may be limited on newer models"],
            ["OpenAI API", "Broad tooling and a large ecosystem", "A customer already standardises on it, or you need a feature only it has", "Different parameter names and caching behaviour, so prompts need retesting"],
            ["Open models served by vLLM", "Control over the stack, data residency and unit cost at volume", "Data must stay inside your own network, or you have steady high volume", "You run the GPUs, the scaling and the upgrades"],
            ["Open models on Ollama", "Fast local trials on a laptop", "Prototyping offline or testing a small model", "Not built for production load, and quality depends on the small model you pick"],
          ],
        },
        // CHECKED 17 Oct 2026: https://platform.claude.com/docs/en/api/messages
        // CHECK: the Gemini on Vertex AI column was not confirmed against the current generateContent reference (the page text could not be read on 21 Oct 2026). Confirm the field names, and whether Google now advises leaving temperature at its default on Gemini 3 models.
        {
          kind: "compare",
          caption: "The same four controls carry different parameter names on each API. Verify against current documentation.",
          columns: ["Control", "Gemini on Vertex AI", "Anthropic Messages", "OpenAI Responses"],
          rows: [
            ["Temperature", "temperature, in the generation config", "temperature, rejected if non-default on Claude 4.7 and later", "temperature, dropped on reasoning models"],
            ["Output limit", "max_output_tokens, in the generation config", "max_tokens, which is required", "max_output_tokens"],
            ["Top-p", "top_p, in the generation config", "top_p, rejected if non-default on Claude 4.7 and later", "top_p, dropped on reasoning models"],
            ["Stop reason", "finishReason on the candidate", "stop_reason", "status and incomplete_details"],
          ],
        },
        {
          kind: "p",
          text: "Switching providers is never only a config change. Tokenisers differ, so counts and costs change. Defaults differ, so behaviour changes. Treat a provider swap as a model change, and run your golden set before and after.",
        },
        {
          kind: "p",
          text: "A golden set, from course 1, is a fixed collection of real cases with known correct answers. Chapter five covers how to compare models fairly.",
        },
        // CHECKED 9 Nov 2026: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/data-residency (gemini-3.5-flash has single-region endpoints, including europe-west2)
        {
          kind: "quiz",
          id: "llm01-q7",
          question: "A customer insists invoice data never leaves their own network, and they will not call any hosted model API. Which option on this list fits that constraint most directly?",
          options: [
            "Calling a public hosted API from your own laptop.",
            "Serving an open model with vLLM inside their network.",
            "Running Ollama on a developer machine in production.",
            "Using whichever provider has the longest window.",
          ],
          answer: 1,
          explain: "Self-hosting open weights inside their network keeps data in place. A customer who accepts a cloud provider but needs a region can use the `eu` or `us` endpoint. They can also use a single region on the few models that offer one, such as `gemini-3.5-flash`. Chapter five and the cloud course cover that route.",
        },
        { kind: "p", text: "You now have every part of a model call. The last section prices Harbour's real one." },
      ],
    },
    {
      id: "s6-budget-sheet",
      title: "Harbour's extraction call fits on a one-page budget sheet, and the cache only just qualifies",
      goal: "How do you work out a call's cost and limits before you send it?",
      blocks: [
        { kind: "p", text: "The method has four steps. Count each part of the call. Multiply by the rates. Check the limits, including the cache minimum. Scale the result to a month." },
        { kind: "p", text: "Harbour's stable prefix has rules of 500 tokens, a schema of 700 and six examples of 3,000. That makes 4,200 tokens. A ten-line invoice adds 1,500 input tokens, about 150 a line. Its JSON answer takes 600 output tokens, which is 100 for the header and 50 a line." },
        { kind: "p", text: "The rates here are invented for this course. Input costs one pound per million tokens. A cached read costs ten pence per million. Output costs five pounds per million. Nothing else on the sheet depends on a real price list." },
        { kind: "p", text: "With no cache hit, the 5,700 input tokens cost 0.57 pence and the output costs 0.30 pence. The call costs 0.87 pence. With a hit, the prefix costs 0.042 pence, the invoice 0.15 and the output 0.30. That call costs 0.492 pence." },
        { kind: "p", text: "Scans arrive as images, so this sheet covers the 8,000 text invoices a month. Harbour assumes nine calls in ten hit the cache, and it will measure that. So 7,200 calls at 0.492 pence and 800 at 0.87 pence come to 42.38 pounds. With no caching, 8,000 calls cost 69.60 pounds. The cache saves 27.22 pounds." },
        { kind: "p", text: "Next come the limits. A 60-line invoice is the longest Harbour expects, at 9,000 input tokens. Its answer needs 100 plus 60 times 50, which is 3,100 output tokens. Harbour sets the output limit to 4,000 for headroom. The whole call is 17,200 tokens, far inside the window." },
        { kind: "code", lang: "text", caption: "Harbour's budget sheet for the extract job. Worked example, invented rates and counts.", code: "BUDGET SHEET: extract job\nModel            chosen in chapter five; the rates below are invented\nRates (invented) input 1.00 pounds/M, cached read 0.10 pounds/M, output 5.00 pounds/M\n\nPART                TOKENS   TYPE     CHANGES?\nRules                  500   input    never\nSchema                 700   input    never\nSix examples         3,000   input    rarely\nStable prefix        4,200            order fixed, byte-identical\nInvoice, 10 lines    1,500   input    every call\nAnswer, 10 lines       600   output   every call\n\nCOST PER CALL        input    output   total\nNo cache hit         0.570p   0.300p   0.870p\nCache hit            0.192p   0.300p   0.492p\n\nMONTH (8,000 text invoices, 90 percent hits assumed)\nWith cache           42.38 pounds\nNo cache             69.60 pounds\nSaving               27.22 pounds\n\nLIMITS\nLongest invoice      60 lines, 9,000 input tokens\nLongest answer       3,100 output tokens\nOutput limit set     4,000\nTotal for one call   17,200 tokens\nCache minimum        4,096 tokens on this model family\nPrefix margin        104 tokens\nLog per request      input, cached and output tokens, and stop reason\n\nNOT ON THIS SHEET    The 2,000 scans a month, which arrive as images. Chapter seven prices those." },
        { kind: "p", text: "The output limit is the number a long invoice hits, and the window plays no part. The cache is real money and small money, so nobody should redesign for it. The prefix clears the minimum by only 104 tokens. If someone trims a rule, caching can switch off with no error, so Harbour logs cached tokens per request." },
        { kind: "code", lang: "text", caption: "For your next customer: copy this and fill it in.", code: "BUDGET SHEET: [job name]\nModel and region:\nRates: input, cached read, output (per million)\n\nStable prefix tokens:    (rules + schema + examples)\nVariable input tokens:   (measure on real documents)\nOutput tokens:           (fixed part + part per item)\n\nCost per call, no hit:\nCost per call, hit:\nCalls a month:\nAssumed hit share:       (measure it, then replace this)\nMonthly cost:\n\nLongest input tokens:\nLongest output tokens:\nOutput limit set:\nCache minimum for model: (from the provider's current docs)\nPrefix margin:\nLogged per request:" },
        { kind: "p", text: "The sheet prices a prompt of 4,200 tokens that nobody has seen yet. Chapter two writes it, and asks what makes a prompt something you can test." },
      ],
    },
  ],
  recap: [
    "Tokens, not characters, set cost and limits, and counts differ by text and by model.",
    "Temperature reshapes the probability curve and top-p trims its tail.",
    "Temperature zero reduces variation but does not guarantee identical output.",
    "The context window is a budget that covers input and output, with a separate output limit.",
    "A prefix cache matches from the first token, so put stable content first and volatile content last.",
    "The budget sheet prices one call, checks its limits and scales to a month before anything ships.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In how models behave I learned that a model samples one token at a time. Tokens are the unit of cost and limit. A stable prompt prefix is what makes caching pay. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["llm-q01", "llm-q02"],
};

export default chapter;
