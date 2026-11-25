import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "cloud-05-vertex-quotas-regions-residency",
  course: "cloud",
  number: 5,
  title: "The region decides which models and guards you get",
  tagline: "Answer a 429 with a random wait, find where the model can really run, and measure the last unknowns.",
  minutes: 53,
  objectives: [
    "Say what a 429 is and why a random wait beats an instant retry.",
    "Count attempts and keep the total wait inside the time the desk has.",
    "Cap the calls in flight and size the cap against the instances.",
    "Read which regions serve a model and Model Armor.",
    "Read the residency findings and say what the check can't see.",
    "Write a record of measured quota and residency.",
  ],
  sections: [
    {
      id: "s1-a-429-means-wait",
      title: "A 429 means the quota is spent, so wait a random time and try again",
      goal: "What does a 429 mean, and why does a random wait beat an instant retry?",
      blocks: [
        // CHECK: this section follows Google's 429 troubleshooting page and its quotas page. Both were read on 22 October 2026 through a summarising fetch, not as the pages themselves. Confirm the pay as you go message, the acceleration limits, and the claim that quotas apply to the project in rates per minute.
        {
          kind: "p",
          text: "The model can run where the quota and the contract agree, and this chapter finds out where that is. It is Monday 21 December. The desk calls Gemini on Vertex AI. In a busy month, Vertex starts to answer with a **429**, the HTTP status for too many requests. Its status name is `RESOURCE_EXHAUSTED`.",
        },
        {
          kind: "p",
          text: "A 429 means the project has asked for more than it is allowed in that place. Why does a quota run out?",
        },
        {
          kind: "p",
          text: "Google's page says a 429 comes when request volume goes over the capacity allocated to you. Quotas apply to the project, and they are rates per minute. A sharp jump in traffic can also bring a 429, because Google limits how fast usage may grow. It calls these acceleration limits.",
        },
        // CHECK: the page name Quotas and System Limits, its Edit quota and Submit request buttons, and the Vertex AI filter come from the quotas page as summarised on 22 October 2026. The console layout was not seen. Confirm the labels in your own console.
        {
          kind: "step",
          id: "cloud05-s01",
          title: "Find your Vertex AI quota in the console",
          text: "Do this once, on your own project from chapter 1. It costs nothing and creates nothing. Open the Quotas and System Limits page in the console. Filter for Vertex AI and your model name, then read the limit and the current use of each row. The Edit quota button starts a quota request.",
          expect: "A table of quota rows for the model, each with a limit and a usage figure. Write down the unit of each row, because section 3 needs it.",
        },
        {
          kind: "p",
          text: "Three layers of the desk already deal with a failing model call. Each does a different job when the answer is a 429. This chapter adds the third.",
        },
        {
          kind: "compare",
          caption: "Three layers, and what each one does on a 429",
          columns: ["Layer", "Where you met it", "What it does on a 429"],
          rows: [
            ["`post_with_retry`", "Chapter 4 of course 1", "Waits and retries an HTTP call, such as a call to Voyage."],
            ["`FallbackChatModel`", "Chapter 2 of course 6", "Hands the call to Claude when Gemini fails, with no wait."],
            ["`QuotaRetryChatModel`", "this chapter", "Waits and retries a chat model call, and limits how many run at once."],
          ],
        },
        {
          kind: "p",
          text: "Retrying at once is the worst reply. Say fifty desk runs get a 429 together, and each waits one second. They all come back together and fail together. The fix is a wait that differs for each caller.",
        },
        {
          kind: "p",
          text: "The wait has a ceiling that doubles on each retry. It starts at a base of 1 second and stops at a cap of 30. **Full jitter** picks a random number from 0 up to that ceiling. You met jitter in chapter 4 of course 1. Here it spreads fifty retries across the whole ceiling.",
        },
        {
          kind: "compare",
          caption: "The ceiling for each retry, with a base of 1 second and a cap of 30",
          columns: ["Retry", "Longest wait in seconds", "What the random draw can give"],
          rows: [
            ["1", "1", "Anything from 0 to 1."],
            ["2", "2", "Anything from 0 to 2."],
            ["3", "4", "Anything from 0 to 4."],
            ["4", "8", "Anything from 0 to 8."],
            ["5", "16", "Anything from 0 to 16."],
            ["6", "30", "Anything from 0 to 30. Doubling would give 32, and the cap stops it."],
          ],
        },
        // CHECK: the 429 page, read on 22 October 2026, mentions neither `retryDelay` nor `Retry-After`. The code reads both when an error carries one and falls back to jitter when it does not. Confirm in the current Vertex AI error documentation which of them a 429 carries, and the format of the duration.
        {
          kind: "p",
          text: "Sometimes the server says how long to wait, and the code calls that number the **hint**. Google can send it as a `retryDelay` such as `34s` in the error details, and some errors carry a `Retry-After` header. The code uses the hint, cut to the cap, with no jitter. Without a hint it falls back to full jitter.",
        },
        {
          kind: "p",
          text: "Which errors count as a quota error? A status of 429 does. So does the status name `RESOURCE_EXHAUSTED`, because an SDK may keep the number somewhere else. LangChain wraps the SDK's error, so the code also looks at `__cause__` and `__context__`, up to four levels down.",
        },
        {
          kind: "p",
          text: "The first error that carries a status decides. If that status is not 429, the search stops and the answer is False. A 500 is a provider error, and the fallback model handles it. Waiting would not help.",
        },
        {
          kind: "quiz",
          id: "cloud05-q1",
          question: "An error carries no status. Its `__cause__` carries status 503, and the cause of that error carries 429. What does `is_quota_error` return?",
          options: [
            "True, because a 429 sits somewhere in the chain",
            "False, because the first error that carries a status is the 503, and it decides",
            "True, because a 5xx is also a quota error",
            "It raises an error, because the chain holds two statuses",
          ],
          answer: 1,
          explain: "The search goes down the chain and stops at the first error that carries a status. That is the 503. A status other than 429 ends the search with False. The 429 further down is never read.",
        },
        {
          kind: "p",
          text: "A random wait spreads the callers out. How long can one call keep waiting?",
        },
      ],
    },
    {
      id: "s2-the-retry-loop",
      title: "A retry loop spends time, so count every call and cap the wait",
      goal: "How does the code count attempts, and how much time can a retry use?",
      blocks: [
        {
          kind: "p",
          text: "`call_with_quota_retry` takes a function and calls it. If the call works, you get the result. If it raises a quota error and calls are left, the loop logs a warning named `quota_retry`, sleeps and tries again. Any other error is raised at once, with no sleep.",
        },
        {
          kind: "p",
          text: "`attempts` counts every call, the first one included. The default is 4, so there are three retries. On the last call the quota error is raised as it is. A caller above the loop then sees the real error.",
        },
        {
          kind: "p",
          text: "Raising other errors at once matters. A 400 fails the same way on every try. Retrying a bug only makes the run slower and hides the bug.",
        },
        {
          kind: "p",
          text: "The service reads the retries from a setting named `VERTEX_MAX_RETRIES`. Production sets it to 3 in `vertex.tf`, so `attempts` is 4. With no server hint, the longest wait is 1 plus 2 plus 4, which is 7 seconds for one model call.",
        },
        // CHECK: the 300 second request timeout is the value in run.tf, which carries its own CHECK and calls it a guess. Cloud Run's documented limit for that setting was not read for this chapter. The 60 second desk time budget is the default from chapter 6 of course 2.
        {
          kind: "p",
          text: "Time is the real limit. The desk run has a time budget of 60 seconds by default, from chapter 6 of course 2. It measures from the moment the question arrived. Waiting for retries counts against it. Cloud Run also cuts a request off at the timeout in `run.tf`, which is 300 seconds.",
        },
        {
          kind: "widget",
          id: "cloud05-retry-clock",
          intro: "Five retry settings face a 429 on every try. Predict the longest total wait for each. Then compare it with the time budget and the request timeout.",
        },
        {
          kind: "p",
          text: "The retry wrapper, `QuotaRetryChatModel`, sits outside the fallback. With routing on, Gemini gets a 429 and the fallback model, Claude, answers the call. The retry loop sees an error only when both fail. You saw this in chapter 8 of course 6 as the 429 that falls back to Claude.",
        },
        {
          kind: "p",
          text: "With routing off, the desk model is the only model. The retry loop is then the only protection, and every wait comes out of the time budget.",
        },
        {
          kind: "quiz",
          id: "cloud05-q2",
          question: "`VERTEX_MAX_RETRIES` is 3, and every call gets a 429 with no server hint. How many times does the model call run?",
          options: ["Three times", "Four times", "Six times", "Seven times"],
          answer: 1,
          explain: "`attempts` is the retries plus one, because it counts the first call. Three retries means four calls. Seven is the longest total wait in seconds with no hint, and it is not a count of calls.",
        },
        {
          kind: "quiz",
          id: "cloud05-q3",
          question: "Routing is on, and Gemini returns a 429 for a routed role. What happens first?",
          options: [
            "The retry loop sleeps, then calls Gemini again",
            "The fallback model, Claude, answers the call, and the retry loop sees no error",
            "The desk run ends with a stop reason",
            "The gate raises `QuotaExceeded`",
          ],
          answer: 1,
          explain: "The retry wrapper surrounds the fallback model. The fallback fires on a 429 before any error reaches the retry loop. The loop sees an error only when Claude fails too.",
        },
        {
          kind: "p",
          text: "A retry reacts after the quota is spent. What stops the burst before it starts?",
        },
      ],
    },
    {
      id: "s3-the-gate",
      title: "A gate keeps one process under its share, so multiply by instances",
      goal: "How many calls may be in flight, and how do you size that against the instances?",
      blocks: [
        {
          kind: "p",
          text: "A retry reacts after the quota is spent. A **gate** stops the burst before it starts. `QuotaGate` is a counter with a fixed number of **slots**. A model call takes a slot and gives it back when it finishes.",
        },
        {
          kind: "p",
          text: "The calls that have started and not finished are **in flight**. The gate never lets more calls be in flight than it has slots. When every slot is taken, the next call waits.",
        },
        {
          kind: "p",
          text: "A call waits up to 30 seconds for a slot by default. If none frees in time, the gate raises `QuotaExceeded`. That error carries status 429, so the retry loop treats it like a provider's 429. It backs off and tries the gate again.",
        },
        {
          kind: "p",
          text: "The gate sits inside the retry wrapper, and a slot covers the whole model call. With routing on, that includes a fallback call to Claude. A slot stays taken while Gemini fails and Claude answers.",
        },
        {
          kind: "p",
          text: "A gate counts calls in one process. Cloud Run may run several instances, so the cap on the fleet is the instances times the slots. The capstone sets a setting named `VERTEX_MAX_CONCURRENT` to 8, and `run.tf` allows 3 instances through `max_instance_count`. That is at most 24 calls in flight.",
        },
        {
          kind: "p",
          text: "Each instance also accepts 20 requests at a time, set by `max_instance_request_concurrency` in `run.tf`. A request may need several model calls. With 8 slots, the extra calls wait at the gate.",
        },
        // CHECK: whether a Gemini quota on pay as you go counts requests or tokens, and whether it is per model or per project, was not read. The sum below is for requests. The 8 in vertex.tf carries its own CHECK to size it against the real quota.
        {
          kind: "p",
          text: "How many slots are safe? Use Little's law: the calls in flight equal the calls a second times the seconds a call takes. Turn it round. Calls a minute equal the calls in flight divided by the seconds a call takes, times 60. Illustrative figures: 24 calls in flight at 6 seconds each is 240 calls a minute.",
        },
        {
          kind: "p",
          text: "That sum counts calls. If your quota row counts tokens, you also need the average tokens in a call. Take your seconds a call and your tokens a call from chapter 4 of course 5, which measures both. Take the unit from the quota step in section 1.",
        },
        {
          kind: "widget",
          id: "cloud05-slot-budget",
          intro: "Five fleets, each with a different instance count and call time. Pick the largest number of slots that keeps the whole fleet under the illustrative capacity.",
        },
        {
          kind: "quiz",
          id: "cloud05-q4",
          question: "The service runs three instances, and `VERTEX_MAX_CONCURRENT` is 8. What is the most model calls in flight at once?",
          options: ["8", "20", "24", "60"],
          answer: 2,
          explain: "A gate counts calls in one process, so the fleet cap is 3 times 8, which is 24. The 20 is the number of requests one instance accepts, and a request is not a model call. Sixty is 3 times 20, which multiplies the instance count by the wrong number.",
        },
        {
          kind: "p",
          text: "The rate is under control. Is the model even available where you need it?",
        },
      ],
    },
    {
      id: "s4-model-and-guard-regions",
      title: "A model and a guard are offered in different regions, so check the pair",
      goal: "Which regions serve the model and Model Armor, and where do the two lists differ?",
      blocks: [
        // CHECK: the model table below is the FACTS.md table of 20 October 2026. The model page lists Standard PayGo for gemini-3.5-flash in global, us and eu only, while the table also names europe-west3. FACTS records this as an open question. Only a call settles it, and the step below makes it.
        {
          kind: "p",
          text: "Chapter 6 of course 6 went through seven hops of a desk request. It left one question open. Does Standard PayGo work for `gemini-3.5-flash` in `europe-west3`? Standard PayGo is the plain pay as you go way to call a model, with no commitment. Chapter 5 of course 4 raised the same question.",
        },
        {
          kind: "p",
          text: "A model is served from a list of locations, and the list differs for each model. `global` is one endpoint with no fixed place. `us` and `eu` are **multi-regions**, each an endpoint that spans many regions. `gemini-3.5-flash` reaches single regions, and the model page lists those only under Provisioned Throughput. The newest flash model is served from three locations.",
        },
        {
          kind: "compare",
          caption: "Where each model is served. The `gemini-3.5-flash` row was read on 9 November 2026 and the others on 20 October 2026.",
          columns: ["Model", "Served from"],
          rows: [
            ["`gemini-3.8-flash`", "global, us, eu"],
            ["`gemini-3.7-flash`", "global, us, eu"],
            ["`gemini-3.5-flash`", "Standard PayGo: global, us, eu. Provisioned Throughput: those three, europe-west2, europe-west3 and Asia Pacific regions."],
            ["`gemini-3.5-flash-lite`", "global, us, eu"],
            ["`gemini-4-argon`", "global, us, eu"],
          ],
        },
        // CHECK: the general availability date of 19 May 2026 and the retirement of 19 May 2027 or later for gemini-3.5-flash come from FACTS.md, checked on 20 October 2026. Confirm both on the current model page.
        {
          kind: "p",
          text: "So pinning to `europe-west3` costs a model generation. The desk runs `gemini-3.5-flash`, which reached general availability on 19 May 2026, because the newer models aren't listed for single regions at all. The pin also has a shelf life. Google lists the retirement as 19 May 2027 or later, so plan the move before then.",
        },
        // CHECK: the Model Armor regions are the FACTS.md list of 20 October 2026: 16 regions and the us and eu multi-regions, with europe-west2 limited. Confirm on the current Model Armor locations page.
        {
          kind: "p",
          text: "Model Armor has its own list of places. It is offered in 16 regions and in the `us` and `eu` multi-regions. The desk's `europe-west3` is on it, and `europe-west2` is too, with limited features.",
        },
        {
          kind: "compare",
          caption: "Where Model Armor is offered, as of 20 October 2026",
          columns: ["Area", "Regions"],
          rows: [
            ["Asia Pacific", "asia-northeast1, asia-northeast3, asia-south1, asia-southeast1, australia-southeast2"],
            ["Europe", "europe-southwest1, europe-west1, europe-west2 (limited), europe-west3, europe-west4, europe-west9"],
            ["The Americas", "northamerica-northeast2, us-central1, us-east1, us-east4, us-west1"],
            ["Multi-regions", "us, eu"],
          ],
        },
        {
          kind: "p",
          text: "Two settings hold the two places. `vertex_location` is where the model runs. `gcp_region` is where Model Armor, Cloud Tasks and Cloud Run sit. The production Terraform sets `vertex_location` to the service region, and `gcp_region` defaults to `europe-west3`.",
        },
        {
          kind: "p",
          text: "`check_residency` reads those settings and returns findings. A finding is an **error** when the settings cannot work, such as `model_not_served`, `armor_region` or `armor_missing`. It is a **note** when text leaves on purpose. The check reads settings only and calls no service, so CI can run it before a deploy.",
        },
        {
          kind: "p",
          text: "The two lists do not match. `gemini-3.5-flash` is served from `northamerica-northeast1` and `australia-southeast1`, and Model Armor is offered in neither. A service pinned there has a model and no working guard. The check reports that as the error `armor_region`.",
        },
        // CHECK: FACTS.md says floor settings do not apply to the us and eu multi-region Vertex endpoints. The description of a floor setting as a minimum screen that Model Armor applies to Vertex AI calls comes from chapter 4 of course 3 and was not re-read. Whether a floor setting covers the global endpoint is an open question there.
        {
          kind: "p",
          text: "One more rule gives the note `armor_floor`. A **floor setting** is a minimum screen that Model Armor can apply to Vertex AI calls in a project. Floor settings do not apply to the `us` and `eu` endpoints. Your template still works there, because the service calls it directly. A floor setting will not back it up.",
        },
        // CHECK: the 429 page, read on 22 October 2026 through a summarising fetch, recommended the global endpoint over a regional one for 429 errors. It gave no reason in what was read. That a region has less headroom is a reading of the advice, not a statement on the page.
        {
          kind: "p",
          text: "Google's advice on 429 errors pulls the other way. The page recommends the global endpoint over a regional one. A pinned region gives that advice up. Expect more 429 errors there, and treat the retry code as part of the residency decision.",
        },
        {
          kind: "p",
          text: "The check trusts its table, and the table comes from a page that may be out of date. A model that is missing from the table gives a note, `unknown_model`, for that reason. Only a real call proves the pair works.",
        },
        {
          kind: "p",
          text: "The lab's table treats `europe-west3` as serving the desk model. The model page, read on 9 November 2026, lists Standard PayGo for global, `us` and `eu` only. `europe-west3` appears under Provisioned Throughput. One call settles it, and nobody has made that call for this course.",
        },
        // CHECK: the request path and body below follow the Vertex AI REST form for generateContent as I know it. FACTS.md holds only the Python form, ChatGoogleGenerativeAI with vertexai=True and location="europe-west3". Confirm against the current REST reference. The cost is a few tokens at a price not read here, so check the Vertex AI pricing page. Nobody has made this call from europe-west3 on this account.
        {
          kind: "step",
          id: "cloud05-s02",
          title: "Make one test call to `gemini-3.5-flash` in `europe-west3`",
          text: "Run this on your own project from chapter 1, with `gcloud` signed in and `GOOGLE_CLOUD_PROJECT` set. It sends a short prompt and asks for a one word reply, so the cost is a few tokens. It creates no resource, so there is nothing to tear down. Nobody has run it for this chapter, so you are the first.",
          lang: "bash",
          code: `curl -s -X POST \\
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \\
  -H "Content-Type: application/json" \\
  "https://europe-west3-aiplatform.googleapis.com/v1/projects/$GOOGLE_CLOUD_PROJECT/locations/europe-west3/publishers/google/models/gemini-3.5-flash:generateContent" \\
  -d '{"contents":[{"role":"user","parts":[{"text":"Reply with the single word ready."}]}]}'`,
          expect: "A JSON body with a candidates list, whose text is the word ready. An error that names the model or the location means europe-west3 does not serve this model on pay as you go for your project. Do not change the lab. Read the next paragraph.",
        },
        {
          kind: "p",
          text: "If the call fails, you have two choices. Move the desk model to a multi-region endpoint, either `eu` or `global`, which gives up the pin for the model call. Or keep the pin and buy Provisioned Throughput. The first is a residency decision for whoever signed the contract, so don't take it alone.",
        },
        {
          kind: "quiz",
          id: "cloud05-q5",
          question: "Why does pinning the service to one region make the retry code matter more?",
          options: [
            "A region has no quota, so every call is refused",
            "Google's advice for 429 errors is to use the global endpoint, and a pinned region gives that advice up",
            "Retries are free in a region and cost money on the global endpoint",
            "Model Armor retries a 429 itself, so the code must not",
          ],
          answer: 1,
          explain: "The page recommends the global endpoint over a regional one when you meet 429 errors. Pinning a region for residency gives that up, so expect to see more 429 errors, and plan the wait and the gate for them.",
        },
        {
          kind: "quiz",
          id: "cloud05-q6",
          question: "Which pair of regions serves `gemini-3.5-flash` but is not a Model Armor region?",
          options: [
            "europe-west2 and europe-west3",
            "northamerica-northeast1 and australia-southeast1",
            "us-central1 and us-east1",
            "asia-south1 and asia-southeast1",
          ],
          answer: 1,
          explain: "The first and last pairs are on both lists. The `us-central1` and `us-east1` pair is on the Model Armor list only. Only `northamerica-northeast1` and `australia-southeast1` serve the model without Model Armor, so a template pinned there fails the `armor_region` rule.",
        },
        // CHECK: Provisioned Throughput, and the Standard, Priority and Flex pay as you go options, appear in the navigation of Google's quotas page, read on 22 October 2026 through a summarising fetch. Their terms, prices and the models they cover were not read. Product names Vertex AI, Model Armor, Secret Manager, Cloud Run, Cloud Tasks and Cloud SQL were checked in FACTS.md on 20 October 2026.
        {
          kind: "callout",
          tone: "interview",
          title: "429 errors at month end come up in interviews",
          text: "429 errors at month end come up in interviews. Answer first: find which limit binds, and smooth the load before you ask for more capacity. Say you retry with jitter, honour a server wait, and cap calls in flight. Then offer capacity: a quota increase request or a fallback model, and Provisioned Throughput at high volume. Add that a pinned region has less headroom than the global endpoint.",
        },
        {
          kind: "p",
          text: "You have checked the model and the guard. What about the rest of the request?",
        },
      ],
    },
    {
      id: "s5-residency-in-practice",
      title: "Residency covers every hop, and the check sees only the hops a setting names",
      goal: "What does the check report, what can't it see, and how would the secrets be replaced?",
      blocks: [
        {
          kind: "p",
          text: "Residency is a property of every hop in a request, and the model call is only one. The check reads settings, so it sees a hop only when a setting names it. The table lists the hops, and what the check says about each at production values.",
        },
        {
          kind: "compare",
          caption: "Hops of a desk request at production values",
          columns: ["Hop", "Where it runs", "What the check does"],
          rows: [
            ["Desk model, `desk_model`", "`vertex_location`, which is `europe-west3` at production values", "Error `model_not_served` when the model is not served there."],
            ["Strong role model, `strong_model`, when `routing_enabled` is on", "`strong_location`, which is `global` unless you set it", "Error `model_not_served`, and a note `leaves_region` when it runs elsewhere. With routing off, nothing: the role never runs."],
            ["Model Armor, Cloud Tasks and Cloud Run", "`gcp_region`, `europe-west3` by default", "Error `armor_region` when Model Armor is not offered there, and error `armor_missing` when `model_armor_template` is empty."],
            ["Judge model, `judge_model`", "Anthropic's API, when it is a Claude model", "Note `judge_outside`."],
            ["Embeddings and rerank, `embed_provider` and `rerank_provider`", "Voyage AI, by default", "Note `embeddings_outside` and note `rerank_outside`."],
            ["LangSmith traces", "The US endpoint, by default", "Nothing. No setting is read."],
            ["Cloud SQL and secrets", "The regions that Terraform sets", "Nothing. No setting is read."],
          ],
        },
        {
          kind: "p",
          text: "You can also pass `allowed`, the list of places the contract permits. Each of `vertex_location`, `strong_location` and `gcp_region` that is outside the list becomes an `outside_allowed` error. The strong role counts only when routing is on. A deploy with only notes passes. A note exists so that a person reads it against the contract.",
        },
        {
          kind: "step",
          id: "cloud05-s03",
          title: "Run the residency check on the production values",
          text: "Do this after lab step 4. Run the check in your own workspace with the desk model, the location and a Model Armor template of production, and with no `allowed` list. It reads settings only, makes no network call, and costs nothing, so there is nothing to tear down.",
          lang: "bash",
          code: `uv run python -c "from askpep.config import Settings; from askpep.residency import check_residency; [print(f.severity, f.code, f.where) for f in check_residency(Settings(desk_model='gemini-3.5-flash', vertex_location='europe-west3', model_armor_template='askpep'))]"`,
          expect: `Sample output, from the reference code. Yours may differ if your .env changes a setting.
note judge_outside judge_model
note embeddings_outside embed_provider
note rerank_outside rerank_provider`,
        },
        {
          kind: "p",
          text: "Routing is off by default in the capstone, so the check skips the strong role. ADR 0001 turned routing on in production, so treat the next line as the production case. Add `routing_enabled=True` to the call and one more note appears, `leaves_region`. The strong model, `gemini-4-argon`, runs in `global`, and the desk runs in `europe-west3`.",
        },
        {
          kind: "p",
          text: "Now add a clause. The contract says the data stays in Frankfurt, which is `europe-west3`. Pass `allowed=[\"europe-west3\"]` with routing on. The reference code adds one error, `outside_allowed` on `strong_location`. The strong model is served only from `global`, `us` and `eu`. The clause and the strong role cannot both hold.",
        },
        {
          kind: "p",
          text: "With routing off, the same clause passes, because the strong role never runs. Turning routing on later breaks it, so the check is only as current as the settings you give it. To satisfy a Frankfurt clause with routing on, point the strong role at `gemini-3.5-flash` in `europe-west3`. The desk then has no stronger model to escalate to.",
        },
        // CHECK: that the eu multi-region keeps processing inside the EU is Google's own definition of the name. It was not read for this chapter. Confirm it on the model page for each model you run there.
        {
          kind: "p",
          text: "Frankfurt and the EU are different clauses. The `eu` multi-region is Google's name for an endpoint that keeps processing inside the EU. Turn routing on, set `strong_location` to `eu`, and pass `allowed` as `europe-west3` and `eu`, and the reference code reports notes only. A clause that says Germany rules that out. Ask the client which one they mean.",
        },
        // CHECK: the LangSmith EU endpoint is marked CHECK in chapter 6 of course 6 and in config.py. Confirm it in the current LangSmith documentation before you rely on it.
        {
          kind: "p",
          text: "Two hops have no setting that the check reads: LangSmith traces and Cloud SQL. LangSmith sends traces to a US endpoint by default.",
        },
        {
          kind: "p",
          text: "Chapter 6 of course 6 noted an EU endpoint for LangSmith. The check also cannot see where a Gemini judge runs. A clean result says the settings agree with each other. It proves nothing about a hop the check cannot see.",
        },
        {
          kind: "p",
          text: "Nothing calls `check_residency` today. The service does not, and neither does CI. Run it by hand before a deploy, or add one line to your deploy workflow if the contract needs proof.",
        },
        {
          kind: "p",
          text: "An empty `model_armor_template` is an error, `armor_missing`. The variable defaults to an empty string, and an empty string turns ArmorGuard off. A deploy with no template has no guard. With no template there is nothing to place, so the check skips `armor_region` and `armor_floor`.",
        },
        {
          kind: "widget",
          id: "cloud05-region-fit",
          intro: "Eight sets of settings. Predict the worst finding that `check_residency` returns for each. Then read the findings it prints.",
        },
        // CHECK: Secret Manager automatic replication, where Google chooses the places of the copies, and the Secret Manager price per active version and per access, were not read for this chapter. The facts about secrets.tf come from the file and from STEPS.md note 17.
        {
          kind: "p",
          text: "Secrets are a hop too, though they hold keys and not question text. Whether they matter depends on the clause. In `secrets.tf`, two secrets, `askpep-principals` and `langsmith-api-key`, use `user_managed` replication in the service region. Four keep automatic replication, so Google chooses where the copies live.",
        },
        {
          kind: "p",
          text: "The four come from chapter 14 of course 1: `askpep-api-key`, `askpep-database-url`, `voyage-api-key` and `anthropic-api-key`. You cannot set them to the region by editing the file. Replication cannot change on an existing secret, so Terraform would destroy each one and create it again. That is why `secrets.tf` holds them with `ignore_changes` on `replication`.",
        },
        // CHECK: that `terraform state rm` leaves the secret and its grants in Google Cloud, and that `terraform apply -target` on the secret resource creates only the new secrets and what they depend on. Read the Terraform documentation for both commands, and run the cutover once on a test project.
        {
          kind: "p",
          text: "Moving them is a cutover. `secret_env` and `job_secret_env` live in `secrets.tf`, and `rollout_secret_env` lives in `rollout.tf`. The `for_each` of every secret and every grant reads them. Rename a secret in a map and Terraform destroys the old one. So the cutover first makes Terraform forget the old secrets. It takes seven steps.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Change all three maps to the new names.",
            "Delete the four `import` blocks for the old names in `secrets.tf`.",
            "Run `terraform state rm` for each old secret and for every grant on it. Terraform forgets them and leaves them in Google Cloud.",
            "Run `terraform apply -target=google_secret_manager_secret.askpep`. It creates the new secrets with `user_managed` replication in the service region.",
            "Copy each old value into its new secret as a new version.",
            "Run a full `terraform apply`. It creates the grants and deploys a revision that reads the new names.",
            "Delete the old secrets by hand once the new revision has served real traffic.",
          ],
        },
        {
          kind: "p",
          text: "This chapter does not ask you to run the cutover. The last step deletes data and cannot be undone, so take it in a change window. Secret Manager bills for each active secret version and each access. Check the price page before you plan the move.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "EU data residency comes up in interviews",
          text: "EU data residency comes up in interviews. Answer first: split the clause into three questions. Where is a prompt processed, where does data rest, and which hops leave. Name the model location, the Model Armor region and the database region. Say which hops leave and why: the judge, Voyage and tracing. Say what the check cannot see, and get the clause confirmed.",
        },
        {
          kind: "quiz",
          id: "cloud05-q7",
          question: "Why can't you pin the four secrets from chapter 14 of course 1 to the region by editing `secrets.tf`?",
          options: [
            "Replication cannot change on an existing secret, so Terraform would destroy and recreate each one",
            "Secret Manager does not support a regional secret",
            "The service account has no permission to edit a secret",
            "Terraform never manages a secret that was imported",
          ],
          answer: 0,
          explain: "The file holds the four with `ignore_changes` on `replication` for exactly this reason. Moving them means new secrets in the region and a copy of each value. You also make Terraform forget the old secrets before you change `secret_env`, or the next apply would destroy them.",
        },
        {
          kind: "p",
          text: "You can read every finding now. What did AskPEP's own numbers say on the day?",
        },
      ],
    },
    {
      id: "s6-record",
      title: "Monday's measurements closed the last condition and changed where the model runs",
      goal: "What do you measure and record before you trust a region and a quota?",
      blocks: [
        {
          kind: "p",
          text: "A quota and residency record states what you measured, against which limit, and what you changed because of it. It holds real numbers from your own project. A number taken from a course or a page is still a guess until you have run it.",
        },
        {
          kind: "p",
          text: "Here is how AskPEP's Monday went. Every value below is invented, including the test call result. The page reading of 9 November 2026 is real.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "You created the Model Armor template on staging and ran it on both ends for an hour. The p95 was 1,140 milliseconds, against the 760 the course assumed.",
            "You did the sum for `/ask`. 5,358 plus 26 plus 1,140 is 6,524 milliseconds, which is inside the 10 seconds of R3.",
            "ADR 0006 said to move Model Armor to input only if the p95 passed 2,000 milliseconds. It didn't, so ADR 0006 stands and both ends stay on.",
            "The security reviewer ran 40 names through it for the classifier note, and it caught 33. They said, \"Seven misses go on the record. Retention limits how long they last.\"",
            "You made the one test call to `europe-west3` on Standard PayGo, and it failed with a location error. The `eu` endpoint answered.",
            "The security reviewer read the contract clause and said, \"It says the EU. It doesn't say Frankfurt.\" You wrote ADR 0008, and `VERTEX_LOCATION` became `eu`.",
            "You read the Flash quota row. At peak, 111 requests an hour at 6 model calls each is 666 an hour, or about 11 a minute. The limit shown was 300.",
          ],
        },
        {
          kind: "code",
          lang: "text",
          code: `# QUOTA-AND-RESIDENCY  Monday 21 December 2026
Owner: engineering. Read by: security reviewer.

Model Armor, measured on staging, both ends
p95 1,140 ms. Course assumption was 760 ms. ADR 0006 line is 2,000 ms: stands.
/ask p95 sum: 5,358 + 26 + 1,140 = 6,524 ms. R3 target 10,000 ms.

Names test, classifier note
33 of 40 caught. 7 missed. Recorded and accepted by the security reviewer.
Condition "Model Armor run live and classifier note": closed 21 December.

Model location
europe-west3 on Standard PayGo   test call failed, location error
eu multi-region                  test call answered
Clause says: the EU. It does not name a city.
ADR 0008: VERTEX_LOCATION = eu. europe-west3 kept for everything else.

Flash quota for 1,000 requests a day
Peak 111 an hour x 6 model calls = 666 an hour, about 11 a minute.
Limit shown for the eu endpoint: 300 a minute. Room: about 27 times.
Fallback to Claude stays on for desk roles (ADR 0001).

Still outside the EU, as before: Claude, Voyage. LangSmith is set to its EU endpoint.
The promise is narrow. It covers the model location, the guard, the database.`,
          caption: "AskPEP's record for 21 December. Every value is invented.",
        },
        {
          kind: "p",
          text: "Read the first section's last line, because it closes the review's last condition. Then read the location block. The reviewer's sentence about the clause is the whole decision, and the record keeps it. The last two lines repeat the narrow promise from course 6, because the location change didn't widen it.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "The capstone still points at one region",
          text: "`vertex.tf` still sets `VERTEX_LOCATION` to `var.region`, and its comment still says to check the PayGo list. The story's change to `eu` isn't in the capstone. Nobody has made a real call for this course. If your own project uses that file, make the test call first.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# QUOTA-AND-RESIDENCY  <date>
Owner:
Read by:

Guard, measured:
Latency sum against the target:

Model location options and test results:
What the clause says, read by:
Decision and ADR:

Quota read from your own project:
Peak calls a minute, working shown:
Limit:

Hops still outside the promise:`,
          caption: "For your next region decision: fill this in with your own measurements.",
        },
        {
          kind: "p",
          text: "All four conditions are closed, and two of the review's unknowns have numbers. How does the next change reach production without anyone typing a deploy command?",
        },
      ],
    },
  ],
  lab: {
    title: "Retry a 429, cap the calls in flight, and check the region",
    goal: "Write `quota.py` and `residency.py`, fill `vertex.tf`, and wire the retry and the gate into `build_chat`. Do the steps in order. Steps 1 to 4 start from stubs that raise `NotImplementedError(\"cloud-05 step N\")`. Step 5 is Terraform. Step 6 edits your own `config.py` and `services.py`. The tests use fakes and read files, so nothing touches the network.",
    minutes: 60,
    files: [
      "src/askpep/quota.py",
      "src/askpep/residency.py",
      "infra/terraform/vertex.tf",
      "src/askpep/config.py",
      "src/askpep/services.py",
      "tests/cloud/test_cloud05_quotas_and_regions.py",
    ],
    steps: [
      {
        title: "Spot a spent quota and choose the wait",
        text: "Replace `is_quota_error` and `retry_delay`, which raise `cloud-05 step 1`. `retry_hint` already ships complete. A quota error is status 429 or the status name `RESOURCE_EXHAUSTED`, found on the error or down its cause chain. The wait is the server's hint cut to the cap, or full jitter.",
        code: `# src/askpep/quota.py
def is_quota_error(exc: BaseException) -> bool:
    # your turn: walk the chain, at most CAUSE_DEPTH errors deep.
    # 1. True when the error's status text, upper-cased, is "RESOURCE_EXHAUSTED".
    # 2. Otherwise read the number with _code(current). When there is one, return code == 429.
    # 3. Otherwise move to current.__cause__ or current.__context__, and stop at None.
    ...


def retry_delay(
    exc: BaseException,
    attempt: int,
    *,
    base: float = 1.0,
    cap: float = 30.0,
    rng: Callable[[], float] = random.random,
) -> float:
    # your turn:
    # 1. When retry_hint(exc) gives a number, return it, cut to cap.
    # 2. Otherwise return rng() times min(cap, base * 2 ** attempt). rng gives a float from 0 up to 1.
    ...`,
        test: "uv run pytest tests/cloud -k cloud05_s1",
      },
      {
        title: "Retry while the error is a quota error",
        text: "Replace `call_with_quota_retry`, which raises `cloud-05 step 2`. Call `fn` up to `attempts` times, the first call included. Raise at once any error that is not a quota error, and raise the quota error of the last call as it is. Between calls, log a warning named `quota_retry`, then sleep for the delay.",
        code: `# src/askpep/quota.py
def call_with_quota_retry[T](
    fn: Callable[[], T],
    *,
    attempts: int = 4,
    base: float = 1.0,
    cap: float = 30.0,
    sleep: Callable[[float], None] = time.sleep,
    rng: Callable[[], float] = random.random,
) -> T:
    # your turn: loop attempt from 0 up to attempts.
    # 1. Return fn() when it works.
    # 2. Raise at once an error that is_quota_error rejects, and the error of the last attempt.
    # 3. Otherwise work out delay = retry_delay(exc, attempt, base=base, cap=cap, rng=rng),
    #    call log.warning("quota_retry", extra={"attempt": attempt + 1, "delay_s": delay}),
    #    then sleep(delay) and go round again.
    ...`,
        test: "uv run pytest tests/cloud -k cloud05_s2",
      },
      {
        title: "Cap the calls in flight",
        text: "Replace the four methods of `QuotaGate`, which raise `cloud-05 step 3`. Add `import threading`, which your stub leaves out. A `BoundedSemaphore` holds the slots and a `Lock` guards the count. A failed enter raises `QuotaExceeded` and takes nothing. A leave gives the slot back, also after an error.",
        code: `# src/askpep/quota.py
# Add import threading at the top of the file. Your stub leaves it out.
class QuotaGate:
    def __init__(self, limit: int, *, wait_s: float = 30.0) -> None:
        # your turn: raise ValueError when limit is below 1. Keep a BoundedSemaphore of limit slots,
        # a Lock, a count of the slots taken, and wait_s.
        ...

    @property
    def in_flight(self) -> int:
        # your turn: the number of slots taken now.
        ...

    def __enter__(self) -> "QuotaGate":
        # your turn: take a slot and wait at most wait_s seconds for it. When none frees, raise
        # QuotaExceeded and hold nothing. Otherwise add one to the count under the lock, and return self.
        ...

    def __exit__(self, *exc_info: object) -> None:
        # your turn: take one off the count under the lock, then release the slot.
        ...`,
        test: "uv run pytest tests/cloud -k cloud05_s3",
      },
      {
        title: "Check where the requests go",
        text: "Replace `check_residency`, which raises `cloud-05 step 4`. The docstring lists eight rules, and the findings come back in that order. An error means the settings cannot work or break `allowed`. A note means text leaves the region. A missing or empty setting counts as not set, so a missing `routing_enabled` means routing is off. Read settings only.",
        code: `# src/askpep/residency.py
def check_residency(settings: Settings, allowed: Collection[str] | None = None) -> list[Finding]:
    # your turn: build a list called found and return it.
    # Finding(code, where, message) is an error. Add "note" as a fourth argument for a note.
    # Rules 1 and 2: the desk pair, and the strong pair only when settings.routing_enabled is true.
    #   An unknown model is an "unknown_model" note, and a model outside its locations is a
    #   "model_not_served" error.
    # Rules 3 and 4: an empty template is an "armor_missing" error. A set template gets
    #   armor_region, and armor_floor as a note.
    # Rule 5: outside_allowed, one per setting, only when allowed is given. Skip strong_location
    #   when routing is off.
    # Rules 6 to 8: the notes leaves_region (routing on only), judge_outside, embeddings_outside
    #   and rerank_outside.
    ...`,
        test: "uv run pytest tests/cloud -k cloud05_s4",
      },
      {
        title: "Say where the models run",
        text: "Write `vertex.tf`. Declare the variable `model_armor_template`, a string that defaults to empty. Fill `local.vertex_env` with five names. Take `VERTEX_LOCATION` from `var.region`, and set `DESK_MODEL` to `gemini-3.5-flash`. Use 3 retries and 8 slots, written as text, because an environment value is a string. Take the template from the variable.",
        code: `# infra/terraform/vertex.tf
# your turn: declare variable "model_armor_template" with type string, an empty default, and a
# description that says what an empty value does.

locals {
  vertex_env = {
    VERTEX_LOCATION = var.region

    # CHECK: the model page lists Standard PayGo for this model in global, us and eu only. Make one call
    # from europe-west3 before you rely on it. The chapter has the step.
    DESK_MODEL = "gemini-3.5-flash"

    # your turn: VERTEX_MAX_RETRIES, VERTEX_MAX_CONCURRENT and MODEL_ARMOR_TEMPLATE.
    # CHECK: size the slots against your project's real quota for this model and region.
  }
}`,
        test: "uv run pytest tests/cloud -k cloud05_s5",
      },
      {
        title: "Wire the retry and the gate into the service",
        text: "Add two settings to `config.py`, both integers that default to 0. Write `with_quota` in `services.py`: at 0 for both it returns the factory untouched. Otherwise it wraps each model in `QuotaRetryChatModel`. Then make `build_chat` wrap its routed and its plain factory. Fake providers stay unwrapped, as they are today.",
        code: `# src/askpep/services.py
# In src/askpep/config.py, add vertex_max_retries and vertex_max_concurrent to Settings.
# Both are int and default to 0. Terraform sets them as VERTEX_MAX_RETRIES and VERTEX_MAX_CONCURRENT.

def with_quota(factory: ChatFactory, settings: Settings) -> ChatFactory:
    # your turn:
    # 1. Return factory itself when both limits are below 1.
    # 2. Import QuotaGate and QuotaRetryChatModel here, inside the function, so that the module
    #    imports without the quota code until a limit is set.
    # 3. Build one QuotaGate(settings.vertex_max_concurrent), or None when that limit is below 1.
    # 4. Return a function of role that gives QuotaRetryChatModel(inner=factory(role), gate=gate,
    #    attempts=max(settings.vertex_max_retries, 0) + 1).
    ...


def build_chat(settings: Settings) -> ChatFactory:
    # your turn: wrap the routed factory and the plain factory with with_quota.
    # Leave the fake providers alone.
    ...`,
        test: "uv run pytest tests/cloud -k cloud05_s6",
      },
    ],
    verify: "uv run pytest tests/cloud -k cloud05",
  },
  recap: [
    "A 429 means the quota is spent, and the right reply is to wait a random time before trying again.",
    "`is_quota_error` reads a 429 or `RESOURCE_EXHAUSTED` from the error or its causes, and the first status found decides.",
    "`call_with_quota_retry` counts every call, raises other errors at once, and raises the last quota error as it is.",
    "`QuotaGate` caps the calls in flight for one process, so the fleet cap is instances times slots.",
    "A model and Model Armor are served from different lists of locations, so `check_residency` tests the pair and returns errors and notes.",
    "The four hand-made secrets reach a region only through a cutover to new secrets.",
    "The model page lists Standard PayGo for `global`, `us` and `eu` only. AskPEP's record changed the location to `eu` and closed the last condition.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. I can tell a quota problem from a region problem, measure the guard I was told to assume, and write down what the contract actually says.",
  interviewIds: ["cloud-q17", "cloud-q18", "cloud-q21", "cloud-q22"],
};

export default chapter;
