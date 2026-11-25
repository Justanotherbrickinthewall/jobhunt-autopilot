import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "llm-09-tools-images-batch-and-streaming",
  course: "llm",
  number: 7,
  title: "Tools, images, batch and streaming each have their own cost and failure",
  tagline: "How should each of Harbour's jobs reach the model? Tools, images, batch and streaming each answer that with a cost and a way to fail.",
  minutes: 55,
  objectives: [
    "Write the tool loop for Anthropic and OpenAI message shapes, and name where the two differ.",
    "Estimate the token and money cost of a page image before you send it.",
    "Decide for each Harbour job whether batch or live fits its deadline.",
    "Handle a streamed answer, including partial tool-call JSON and cancellation.",
    "Translate one request between Gemini on Vertex AI, Anthropic Messages and OpenAI Responses.",
    "Write one API plan that gives every job its tool, input type, mode and streaming choice.",
  ],
  sections: [
    {
      id: "s1-tool-loop",
      title: "The tool loop is one pattern with two spellings",
      goal: "What messages make up the tool loop, and which settings steer it?",
      blocks: [
        { kind: "p", text: "Chapter six's manifest named a tool, a page image and a token count. This chapter explains those parts of the API, and the ways of calling a model that change what you pay. It starts with the tool Harbour's extract job uses." },
        {
          kind: "p",
          text: "A tool call, from course 2, is a loop. You send the model a list of tools. Each has a name, a description and a JSON Schema for its input. The model answers with a request to call one. Your code runs it and sends back the result. The model then writes the final answer.",
        },
        {
          kind: "p",
          text: "At Harbour Supplies the tool is `lookup_supplier`. It takes a name and returns the supplier id and the payment terms. The model never runs it. The model only asks, and your code decides whether to run it and what to return. Course 2 taught this loop, so this section stays with the message formats.",
        },
        // CHECKED 17 Oct 2026: https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview
        {
          kind: "code",
          lang: "json",
          caption: "Anthropic Messages. The model's turn asks for the tool, and your reply carries the result.",
          code: "{\"role\": \"assistant\", \"content\": [{\"type\": \"tool_use\", \"id\": \"toolu_01\", \"name\": \"lookup_supplier\", \"input\": {\"name\": \"Northfield\"}}]}\n{\"role\": \"user\", \"content\": [{\"type\": \"tool_result\", \"tool_use_id\": \"toolu_01\", \"content\": \"{\\\"id\\\": \\\"S-114\\\", \\\"terms\\\": \\\"30 days\\\"}\"}]}",
        },
        // CHECKED 17 Oct 2026: https://developers.openai.com/api/docs/guides/function-calling
        {
          kind: "code",
          lang: "json",
          caption: "OpenAI Responses. The call and its output are separate items, matched by call_id.",
          code: "{\"type\": \"function_call\", \"call_id\": \"call_01\", \"name\": \"lookup_supplier\", \"arguments\": \"{\\\"name\\\": \\\"Northfield\\\"}\"}\n{\"type\": \"function_call_output\", \"call_id\": \"call_01\", \"output\": \"{\\\"id\\\": \\\"S-114\\\", \\\"terms\\\": \\\"30 days\\\"}\"}",
        },
        {
          kind: "p",
          text: "Two differences cause real bugs. Anthropic gives the input as an object. OpenAI gives the arguments as a string that you must parse yourself, and the parse can fail. Every result also carries the id of its call. A result with no matching id is an error.",
        },
        // CHECKED 17 Oct 2026: https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools and https://developers.openai.com/api/docs/guides/function-calling
        {
          kind: "p",
          text: "The `tool_choice` setting controls whether the model may skip tools. Auto lets it decide. Required forces some tool call, and Anthropic calls this any. Naming one tool forces that tool. None forbids tools. Forcing a tool rules out a plain-text answer.",
        },
        // CHECKED 17 Oct 2026: https://platform.claude.com/docs/en/agents-and-tools/tool-use/parallel-tool-use
        {
          kind: "p",
          text: "A model can ask for several tools in one turn. Three supplier lookups arrive as three calls. Run them together, then return every result in one reply, each matched by id. Dropping one result, or sending them one at a time, is the commonest bug in a first tool loop.",
        },
        {
          kind: "p",
          text: "Cap the number of rounds, as course 2 explained, because a model that keeps calling tools never finishes. That course also covered tool design, such as naming and error messages.",
        },
        {
          kind: "quiz",
          id: "llm09-q1",
          question: "The model asks for three supplier lookups in one turn. How do you reply?",
          options: [
            "Run the first call and reply, then wait for the model to ask again.",
            "Run all three and return every result together, each matched to its call id.",
            "Return one combined result with no ids.",
            "Ignore the calls and ask the model to answer in text.",
          ],
          answer: 1,
          explain: "The model expects one result per call, matched by id. A missing or unmatched result breaks the turn.",
        },
        {
          kind: "quiz",
          id: "llm09-q2",
          question: "An OpenAI tool call arrives with its arguments as text. What do you do first?",
          options: [
            "Pass the text straight to the tool.",
            "Parse it inside a try block, and treat a failure like a syntax error from chapter three.",
            "Assume the provider has already validated it.",
            "Ask the model to repeat the call without any arguments.",
          ],
          answer: 1,
          explain: "The arguments are generated text. They can be malformed or fail your schema, so parse and validate them before the tool runs.",
        },
        { kind: "p", text: "Tools add text to a call. Scans add something larger, which is an image of every page." },
      ],
    },
    {
      id: "s2-images",
      title: "A page image costs tokens by its size, so cost per page is arithmetic",
      goal: "What does a page image cost, and when should a document service take over?",
      blocks: [
        {
          kind: "p",
          text: "A model reads an image as tokens, like text. The count grows with the pixel area. Anthropic counts one token per 28 by 28 pixel patch, rounded up on each side. Providers also shrink images above a size limit, so a very large scan costs no more than the limit allows.",
        },
        // CHECKED 9 Nov 2026: https://platform.claude.com/docs/en/build-with-claude/vision (a 28 by 28 patch is one visual token, rounded up on each side)
        {
          kind: "p",
          text: "Take one of Harbour's scans rendered at 1,000 by 1,400 pixels. That is 36 by 50 patches, or 1,800 tokens. At an illustrative three pounds per million input tokens, one page costs just over half a penny. Harbour's archive of 40,000 pages costs about 216 pounds, before any output.",
        },
        {
          kind: "p",
          text: "Resolution is a dial. Halve each side and the pixels fall to a quarter, so the cost falls to a quarter. Small print on a scan may then become unreadable. Find the lowest resolution that still passes your golden set, and fix that setting.",
        },
        // CHECKED 17 Oct 2026: https://platform.claude.com/docs/en/build-with-claude/pdf-support
        {
          kind: "p",
          text: "A PDF goes in as pages. Providers usually extract the text and also render each page as an image, so a page costs text tokens plus image tokens. Check the page limit and the file size limit before you promise to read a 300 page contract.",
        },
        // CHECKED 21 Oct 2026: https://docs.cloud.google.com/document-ai/docs/handle-response
        // CHECK: confirm the Layout Parser output carries bounding boxes for its blocks, since the verified page covers OCR and form layouts https://docs.cloud.google.com/document-ai/docs/layout-parse-chunk
        {
          kind: "p",
          text: "A vision model reads a page well. It returns no coordinates and no confidence, and it can drop a table row without saying so.",
        },
        {
          kind: "p",
          text: "When you need field positions, table structure or an audit trail, a document service such as Document AI does the job. The Document AI course, later in this app, covers that choice and the cost per page.",
        },
        {
          kind: "quiz",
          id: "llm09-q3",
          question: "You halve both the width and the height of every page image. Roughly what happens to the image tokens?",
          options: [
            "They halve.",
            "They fall to a quarter.",
            "They stay the same.",
            "They double.",
          ],
          answer: 1,
          explain: "Tokens follow the pixel area. Half the width and half the height leaves a quarter of the pixels.",
        },
        {
          kind: "quiz",
          id: "llm09-q4",
          question: "Finance wants each extracted amount highlighted on the original page. What fits best?",
          options: [
            "A vision model, since it can see the page.",
            "A document service such as Document AI, which returns bounding boxes.",
            "A longer prompt asking for coordinates.",
            "A higher image resolution.",
          ],
          answer: 1,
          explain: "A vision model gives you values without reliable positions. A document service returns the location of every field.",
        },
        { kind: "p", text: "Pricing a page is one thing. Whether anybody is waiting for it decides how you should send it." },
      ],
    },
    {
      id: "s3-batch",
      title: "Batch halves the price for work nobody is waiting on",
      goal: "Which jobs qualify for batch, and how do you handle partial failure?",
      blocks: [
        {
          kind: "p",
          text: "A batch API, from course 9, takes a file of requests and returns the results later. The provider runs them when it has spare capacity. In return you get about half the live price, usually with a separate rate limit. You give up speed.",
        },
        // CHECKED 9 Nov 2026: https://platform.claude.com/docs/en/build-with-claude/batch-processing and https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/batch-prediction-gemini
        {
          kind: "p",
          text: "Results arrive within a completion window. Anthropic gives 24 hours. On Vertex AI a job can queue for up to 72 hours, then run for up to 24. Many batches finish sooner, but you can't count on that. A job qualifies only if nobody is waiting and its deadline is later than the window, with room for failed items.",
        },
        {
          kind: "list",
          items: [
            "Give each request your own custom id, because results come back in no fixed order.",
            "Expect some items to fail while the batch succeeds. Collect the failures and resubmit only those.",
            "Do not use batch for a user who is waiting, because it does not stream.",
          ],
        },
        {
          kind: "p",
          text: "Take Harbour's backfill of 40,000 archived invoices. At an illustrative live price of 320 pounds, batch costs about 160 pounds. The deadline is ten days away. On Vertex AI the worst case is 96 hours, which is four days. Both tests pass, so it goes to batch.",
        },
        {
          kind: "widget",
          id: "llm-batch-or-live",
          intro: "Ten Harbour jobs arrive with a deadline and an illustrative live cost. Route each to live or batch. Look for the jobs that seem to qualify and do not, and check what your choice saves or risks.",
        },
        {
          kind: "p",
          text: "This also answers the rate-limit question from chapter four. Bulk work leaves the live path, so a backfill stops competing with clerks for quota. Course 6 covered when slow work belongs on a queue.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Which of your jobs would you move to a batch API?",
          text: "Open with the test: nobody is waiting, and the deadline is longer than the completion window. Then give the saving and the catches, which are partial failures, no streaming and a separate quota. Interviewers push on the job that looks batchable but chains two stages, since two windows add up.",
        },
        {
          kind: "quiz",
          id: "llm09-q5",
          question: "A nightly job must finish 14 hours after it starts. The batch window is up to 24 hours. What do you do?",
          options: [
            "Use batch, because most batches finish early.",
            "Run it live, because the window can exceed the deadline.",
            "Use batch and email the team if it is late.",
            "Split it into two batches.",
          ],
          answer: 1,
          explain: "A window is a maximum. It promises nothing about speed. A deadline shorter than the window rules batch out.",
        },
        {
          kind: "quiz",
          id: "llm09-q6",
          question: "A batch of 10,000 requests finishes with 40 failed items. What do you resubmit?",
          options: [
            "The whole batch.",
            "Only the 40 failed items, matched by their custom ids.",
            "Nothing, since 99.6 percent succeeded.",
            "The 40 failures as live calls with no validation.",
          ],
          answer: 1,
          explain: "Custom ids let you find the failures. Resubmitting only those saves the cost of the other 9,960.",
        },
        { kind: "p", text: "Batch is for work nobody is watching. Streaming is for the opposite case." },
      ],
    },
    {
      id: "s4-streaming",
      title: "Streaming cuts the wait you feel and makes parsing harder",
      goal: "When does streaming help, and how do you handle partial JSON and cancellation?",
      blocks: [
        {
          kind: "p",
          text: "A streamed response arrives as small events while the model writes. The total time barely changes. What changes is the **time to first token**, the wait before anything appears. For a clerk reading an answer, that wait is what feels slow.",
        },
        {
          kind: "p",
          text: "Take a 400 token answer at 80 tokens per second. Without streaming, the clerk sees nothing for 5.6 seconds, which is 0.6 for the first token and 5 for the rest. With streaming, the first words appear at 0.6 seconds and the last at 5.6.",
        },
        {
          kind: "p",
          text: "Streaming helps only when a person reads the output as it arrives. A background extraction gains nothing, because the validator needs the whole object. Stream a chat answer that a clerk reads. Do not stream a nightly batch job.",
        },
        // CHECKED 17 Oct 2026: https://platform.claude.com/docs/en/build-with-claude/streaming
        {
          kind: "p",
          text: "Tool calls stream too. The arguments arrive as fragments of JSON text, and the text is valid only at the end. Do not parse each fragment. Join the fragments of one call, wait for the stop event, then parse once and validate as in chapter three. Parallel calls interleave, so join by index.",
        },
        {
          kind: "widget",
          id: "llm-stream-parser",
          intro: "Three streams end in different ways. Read the chunks, the joined text and the final event. Decide what to do with each buffer, and watch the stream where the naive join fails.",
        },
        {
          kind: "p",
          text: "Show a partial field only through a tolerant parser, and treat it as a draft. A half-read total of 24 is not 240. Never post a half-read value to the ledger.",
        },
        {
          kind: "p",
          text: "Plan for cancellation too. A user can close the tab, and closing the connection stops the output. Check your provider's billing for cancelled streams. Discard the partial object and post nothing. Retry only if someone still needs the answer.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "How do you stream an answer that contains a tool call or JSON?",
          text: "Open with the rule: stream text to people, and buffer structured output until the stop event. Then explain fragments, joining by index, and parsing once. Interviewers push on cancellation and on a stream that ends on the token limit. Say that a truncated buffer is rejected and never repaired by closing the braces.",
        },
        {
          kind: "quiz",
          id: "llm09-q7",
          question: "Clerks say the chat answer feels slow, though the total time is fine. What helps most?",
          options: [
            "A cheaper model.",
            "Streaming the answer, which cuts the time to first token the clerk sees.",
            "A larger context window.",
            "Batch mode.",
          ],
          answer: 1,
          explain: "The total time barely changes, but the first words appear sooner. That is the wait the clerk notices.",
        },
        {
          kind: "quiz",
          id: "llm09-q8",
          question: "When do you parse the arguments of a streamed tool call?",
          options: [
            "After each fragment, so errors appear early.",
            "After the stop event, once the fragments of that call are joined.",
            "Never, because partial JSON cannot be read.",
            "Before the first fragment arrives.",
          ],
          answer: 1,
          explain: "The text is valid JSON only when complete. Join first, wait for the stop event, then parse once and validate.",
        },
        { kind: "p", text: "Tools, images, batch and streaming all have different names on each provider. The next section keeps those names in one place." },
      ],
    },
    {
      id: "s5-provider-table",
      title: "Parameter names differ by provider, so keep a translation table",
      goal: "How do your request fields map to each provider?",
      blocks: [
        {
          kind: "p",
          text: "Teams switch providers or run two. The ideas match, but the names do not, and a wrong name can fail quietly. Keep one table in your repo that maps your own request fields to each provider's names.",
        },
        // CHECKED 21 Oct 2026: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/reference/rest/v1/projects.locations.publishers.models/generateContent
        // CHECKED 21 Oct 2026: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/function-calling
        // CHECKED 21 Oct 2026: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/control-generated-output
        // CHECKED 9 Nov 2026: the v1 GenerationConfig reference marks responseMimeType and responseSchema deprecated in favour of responseFormat. https://docs.cloud.google.com/vertex-ai/generative-ai/docs/reference/rest/v1/GenerationConfig
        // CHECK: confirm streamGenerateContent in the v1 reference; it was seen in the v1beta1 method index only https://docs.cloud.google.com/vertex-ai/generative-ai/docs/reference/rest/v1beta1/projects.locations.publishers.models
        // CHECKED 21 Oct 2026: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/batch-prediction-gemini
        // CHECKED 21 Oct 2026: https://platform.claude.com/docs/en/api/messages/create
        // CHECKED 21 Oct 2026: https://developers.openai.com/api/reference/resources/responses/methods/create
        {
          kind: "compare",
          caption: "The same request fields carry different names, and Vertex AI puts the project and location in the endpoint.",
          columns: ["Setting", "Gemini on Vertex AI", "Anthropic Messages", "OpenAI Responses"],
          rows: [
            ["Messages and system prompt", "`contents` and `systemInstruction`", "`messages` and `system`", "`input` and `instructions`"],
            ["Output limit", "`generationConfig.maxOutputTokens`", "`max_tokens`, required", "`max_output_tokens`"],
            ["Model", "A model id such as `gemini-3.8-flash`, next to your project and location in the endpoint. LangChain uses `ChatGoogleGenerativeAI(model=\"gemini-3.8-flash\", vertexai=True)`", "A model id", "A model id"],
            ["Tool definition", "`tools` holding `functionDeclarations`", "`tools`, each with an `input_schema`", "`tools`, each with type `function`"],
            ["Tool call and result", "`functionCall` and `functionResponse` parts, matched by name", "`tool_use` and `tool_result`, matched by id", "`function_call` and `function_call_output`, matched by `call_id`"],
            ["Tool choice", "`toolConfig.functionCallingConfig.mode`: AUTO, ANY, NONE", "`tool_choice`: auto, any, a named tool, none", "`tool_choice`: auto, required, a named function, none"],
            ["Structured output", "`generationConfig.responseFormat`. The older `responseMimeType` and `responseSchema` are deprecated", "`output_config.format` with a JSON schema", "`text.format` with a JSON schema"],
            ["Streaming", "A separate method, `streamGenerateContent`", "`stream` set to true", "`stream` set to true"],
            ["Batch", "A batch prediction job fed from Cloud Storage or BigQuery", "A message batches endpoint", "A batch endpoint fed by a file"],
          ],
        },
        // CHECKED 21 Oct 2026: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versions
        // CHECK: confirm that calling a retired Gemini model id on Vertex AI returns a not found error; the model versions page gives the retirement date only https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/api-errors
        {
          kind: "p",
          text: "On Vertex AI the endpoint holds a project, a location and a model id. All three must exist together. A model is not offered in every location, and Google retires old ids. It retired `gemini-2.5-flash` on 20 October 2026. That's why chapter six keeps retirement dates beside the model ids. Expect a not found error from a retired id.",
        },
        {
          kind: "p",
          text: "Do not hide these differences behind an abstraction too early. A thin adapter of one function per provider is enough. It keeps the names in one file, so a provider change is a one file change.",
        },
        {
          kind: "quiz",
          id: "llm09-q9",
          question: "Your code sends `gemini-2.5-flash` to Vertex AI and gets a not found error. What is the likely cause?",
          options: [
            "The model is too large.",
            "Google retired that model id on 20 October 2026, so nothing serves it now.",
            "Streaming is switched on.",
            "The token limit is too high.",
          ],
          answer: 1,
          explain: "Vertex AI routes by project, location and model id. A retired id has nothing behind it, so move to a current id and rerun your eval set.",
        },
        { kind: "p", text: "Harbour now has what it needs to decide. The last section gives every job its way of calling a model." },
      ],
    },
    {
      id: "s6-api-plan",
      title: "Harbour's API plan gives every job one tool policy, one input type and one mode",
      goal: "How do you decide per job how it reaches the model?",
      blocks: [
        { kind: "p", text: "The method is to take each job in turn and ask four questions. Does it need a tool? Does it send text or an image? Is anyone waiting? Will a person read the answer as it arrives?" },
        { kind: "p", text: "Extract needs `lookup_supplier` when a printed name isn't an exact match, capped at three rounds. A scan goes in as a page image at 1,000 by 1,400 pixels, which chapter five's Argon reads. At three pounds per million, one page is 0.54 pence of input, inside the 1.8 pence the record measured for a whole call." },
        { kind: "p", text: "Extract on the portal is live with no streaming, because the validator needs the whole object. The inbox route is live too, because invoices post the same day and a batch window could run past that. Only the backfill has a deadline longer than the worst batch window, so only the backfill goes to batch." },
        { kind: "p", text: "Chat is the one job a person reads as it arrives, so chat is the one job that streams. A clerk sees the first words at 0.6 seconds. The adapter is one small file for Vertex AI, because Harbour has one provider and nothing to abstract yet." },
        { kind: "code", lang: "yaml", caption: "Harbour's API plan. Worked example, invented costs. Field names read from Google's reference on 9 November 2026.", code: "# config/api_plan.yaml\ntools:\n  lookup_supplier:\n    description: >\n      Find a Harbour supplier by name. Use it when the printed\n      supplier name is not an exact match in the invoice text.\n      Returns the supplier id and payment terms, or found=false.\n    input_schema:\n      type: object\n      properties: {name: {type: string}}\n      required: [name]\n    returns: {found: boolean, id: string, terms: string}\n    max_rounds: 3\n    mode: AUTO              # the model may answer with no lookup\n\nimages:\n  scans:\n    render: {width: 1000, height: 1400}\n    tokens_per_page: 1800\n    input_cost_per_page: 0.54p   # at 3 pounds per million, invented\n    lowest_resolution_tested: chosen by golden-v12\n\njobs:                        # mode     stream   why\n  extract_portal:            {mode: live,  stream: false}  # validator needs the whole object\n  extract_inbox:             {mode: live,  stream: false}  # invoices post the same day\n  lookup:                    {mode: live,  stream: false}  # part of extract\n  reconcile:                 {mode: live,  stream: false}  # chapter eight sets its reasoning\n  code:                      {mode: live,  stream: false}  # lines post with the invoice\n  chat:                      {mode: live,  stream: true}   # a clerk reads it as it arrives\n  backfill:\n    mode: batch\n    deadline_days: 10\n    worst_case_hours: 96     # queue 72 + run 24 on Vertex AI\n    live_cost_pounds: 320\n    batch_cost_pounds: 160\n    custom_id: invoice_id    # results return in no fixed order\n    on_partial_failure: resubmit failed custom_ids only\n\nstreaming_rules:\n  structured_output: buffer until the stop event, parse once\n  tool_arguments: join fragments by index, parse once\n  truncated_buffer: reject, never close the braces\n  cancelled: discard, post nothing\n\n# harbour_llm/adapters/vertex.py owns these names and nothing else does\nadapter_map:\n  system_prompt:   systemInstruction\n  messages:        contents\n  output_limit:    generationConfig.maxOutputTokens\n  tool_definition: tools[].functionDeclarations\n  tool_mode:       toolConfig.functionCallingConfig.mode\n  json_schema:     generationConfig.responseFormat\n  stream:          streamGenerateContent method\n  batch:           batch prediction job from Cloud Storage" },
        { kind: "p", text: "Only one job streams and only one job batches, because few jobs meet those tests. The backfill is safe at ten days and wouldn't be at three, since the worst case is four. The adapter map is the whole abstraction. A second provider would add one file. The batch saving is 160 pounds, once." },
        { kind: "code", lang: "text", caption: "For your next customer: copy this and fill it in.", code: "# config/api_plan.yaml, for [customer]\ntools:\n  [tool name]:\n    description:         (when to use it, and what it returns)\n    input_schema:\n    max_rounds:\n    mode:\nimages:\n  [input type]:\n    render:              (lowest resolution that passes the eval)\n    tokens_per_page:\n    input_cost_per_page:\njobs:\n  [job]: {mode: , stream: }   (and one reason)\n  [batch job]:\n    deadline:\n    worst_case_hours:    (from this provider's current docs)\n    custom_id:\n    on_partial_failure:\nstreaming_rules:\nadapter_map:             (one file per provider)" },
        { kind: "p", text: "Reconcile is live and its streaming is off, and it has one setting still open. Chapter eight asks when a model should think before it answers." },
      ],
    },
  ],
  recap: [
    "A tool call is a loop: the model asks, your code runs the tool, and every result returns matched by id.",
    "A page image costs one token per 28 by 28 pixel patch, so halving each side roughly quarters the cost.",
    "Batch halves the price for jobs where nobody waits and the deadline is longer than the completion window.",
    "Streaming cuts the time to first token, but structured output is buffered, joined by index and parsed once at the stop event.",
    "Parameter names differ by provider, so keep one translation table and one adapter per provider.",
    "An API plan answers four questions per job, and most jobs need neither batch nor streaming.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In the API surface I learned that tool calls, images, batches and streams each have a cost shape and a failure shape. I choose batch only when nobody is waiting and the deadline is longer than the window. I parse streamed JSON once, at the end. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["llm-q17", "llm-q18"],
};

export default chapter;
