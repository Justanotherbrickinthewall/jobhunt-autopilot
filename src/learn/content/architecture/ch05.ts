import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "architecture-05-serving-shape",
  course: "architecture",
  number: 5,
  title: "Long work goes behind a queue, and repeated work behind a cache",
  tagline: "AskPEP's serving shape, from its own numbers. The queue earns its place, and the cache stays off.",
  minutes: 80,
  objectives: [
    "Tell a request that repeats from a request that runs long, and name the fix for each.",
    "Say what a cache key must hold, and what AskPEP's leaves out.",
    "Read `InMemoryCache`, and say what each limit and each counter is for.",
    "Follow a request through `cached_stream`, and list how a stored answer stops being served.",
    "Follow a desk job from `POST /jobs/agent` to its answer.",
    "Say what protects a job from running twice, and where that protection stops.",
    "Decide from your own traces, then write the serving ADR and the request flow.",
    "Read AskPEP's own serving decision and reuse its shape.",
  ],
  sections: [
    {
      id: "s1-two-problems",
      title: "A repeated question and a slow question need different fixes",
      goal: "Which requests repeat, which run long, and what fixes each?",
      blocks: [
        {
          kind: "p",
          text: "A caller should wait only for work that is short. Today every request runs the same way. The caller waits while the service retrieves, reranks and asks a model. Two things go wrong with that. Some requests repeat, and some run longer than the caller will wait.",
        },
        {
          kind: "p",
          text: "A repeat is a question that was asked before. The answer is the same, yet you pay for retrieval and a model call each time. A **cache** keeps an answer under a key, so the next request skips that work. When the cache answers, nobody calls the model, so that repeat costs nothing.",
        },
        {
          kind: "p",
          text: "A slow request is one that outlasts the caller's patience. A desk run may take up to 60 seconds, because `max_seconds` is 60 in the budget from course 2. A caller that gives up after 30 seconds never sees that answer. A **queue** takes the job, answers at once with a receipt, and lets a worker run it later.",
        },
        {
          kind: "p",
          text: "The third team's lead brings one new fact. About 60% of their 800 requests a day would come from a build tool that runs overnight and can check back later. Nobody is waiting at a screen for those. That is 480 requests a day that need not hold a connection open.",
        },
        {
          kind: "p",
          text: "The two fixes solve different problems. A cache helps only when questions repeat. A queue helps only when the caller can come back for the answer. The wrong one adds code and gains nothing.",
        },
        {
          kind: "callout",
          tone: "analogy",
          title: "A canteen and a tailor",
          text: "A canteen cooks the dish of the day once and serves it to a hundred people. That is a cache. A tailor takes your measurements, hands you a ticket and says to collect the suit on Friday. That is a queue. A canteen can't take a suit order, and a tailor can't serve lunch.",
        },
        {
          kind: "p",
          text: "You will write the **serving shape** into `docs/design.md`, the file you started in chapter 1. That is how a request reaches the desk, what it can skip and where slow work waits. You fill the Serving shape row of section 3 and the request flow of section 4. You also write one ADR, from the template in that chapter.",
        },
        {
          kind: "p",
          text: "Section 9 of that file lists what the code already does with a cache and a queue. This chapter points to it and doesn't repeat it. The stubs for `cache.py` and `queue.py` arrived with the course 6 starter files.",
        },
        {
          kind: "quiz",
          id: "architecture05-q1",
          question: "A client gives up after 30 seconds. A desk run takes 45 seconds. No question ever repeats. What do you add?",
          options: [
            "A cache. It makes the run faster.",
            "A queue. It takes the job, answers at once and runs the work later.",
            "Both. Every slow system needs a cache and a queue.",
            "Neither. Raise `max_seconds` so the run finishes sooner.",
          ],
          answer: 1,
          explain:
            "A cache helps only when a question repeats, and these never do. A queue answers inside the client's 30 seconds and lets the run take its 45. `max_seconds` is a limit on the run, so raising it lets a long run get longer.",
        },
        {
          kind: "p",
          text: "Start with the cache. What has to go into the key so that a stored answer is never wrong?",
        },
      ],
    },
    {
      id: "s2-cache-key",
      title: "A cache key must hold everything that can change the answer",
      goal: "What must a cache key hold, and what does AskPEP's leave out?",
      blocks: [
        {
          kind: "p",
          text: "A cache stores an answer under a **key**. A lookup asks for a key and gets the answer or nothing. A found answer is a **hit**, and a missing one is a **miss**. The design question is what goes into the key.",
        },
        {
          kind: "p",
          text: "A key that holds too little returns wrong answers. Say the key is the question alone. The corpus changes, and the old answer still matches. A key that holds too much never matches. A wrong hit is worse than a miss, because nobody sees it.",
        },
        {
          kind: "p",
          text: "`cache_key` hashes four things together. Each one answers a different worry.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "The question, with its case folded and its white space collapsed. `What is  PEP 8?` and `what is pep 8?` share one key.",
            "The corpus version, a 12 character fingerprint of the corpus text. It changes when any document's text changes.",
            "The scope, a string for a tenant or a role that must not share answers. AskPEP passes none, so every caller shares.",
            "The value of each of the 17 settings in `KEY_SETTINGS` that can change an answer, such as `answer_model` and `guard_stages`.",
          ],
        },
        {
          kind: "p",
          text: "The key is the prefix `askpep:ask:v1:` followed by the SHA-256 of a JSON document that holds those four things. The question text never appears in the key, because keys reach logs and metrics.",
        },
        {
          kind: "code",
          lang: "python",
          code: `# src/askpep/cache.py
def cache_key(question: str, version: str, settings: Settings, scope: str = "") -> str:
    document = {
        "question": " ".join(question.lower().split()),
        "version": version,
        "scope": scope,
        "settings": {name: getattr(settings, name, None) for name in KEY_SETTINGS},
    }
    encoded = json.dumps(document, sort_keys=True, separators=(",", ":"), default=str).encode("utf-8")
    return KEY_PREFIX + hashlib.sha256(encoded).hexdigest()`,
          caption: "The key. Sorted keys mean the order of the fields never changes the hash.",
        },
        {
          kind: "p",
          text: "`getattr(settings, name, None)` is deliberate. A setting that your `Settings` lacks counts as `None`. That keeps the key working before the optional lab in chapter 3 adds `embed_provider` and `rerank_provider`.",
        },
        {
          kind: "p",
          text: "`corpus_version` tells the cache that the corpus changed. With a `LocalStore` it hashes every chunk's text. With a Postgres pool it runs one SQL query that takes an md5 over each document's id and content hash. Both return 12 hex characters.",
        },
        {
          kind: "p",
          text: "Every request calls `corpus_version`, so speed matters. A `LocalStore` is built once, so AskPEP keeps its fingerprint in a `WeakKeyDictionary`. It works the fingerprint out again only when `store.entries` is a new list or has a new length.",
        },
        {
          kind: "p",
          text: "The dictionary holds each store weakly, so Python can still free a store that nothing else uses. Postgres is different. AskPEP runs the query on every request, so an ingest shows at once.",
        },
        {
          kind: "quiz",
          id: "architecture05-q2",
          question: "An ingest adds one new PEP to a corpus of hundreds. What happens to the stored answers?",
          options: [
            "Each one is deleted at once.",
            "They stay valid, because only one PEP changed.",
            "They stay in memory, but none can be found, because the key now holds a new corpus version.",
            "Only the answers that cite the new PEP are dropped.",
          ],
          answer: 2,
          explain:
            "The corpus version is one fingerprint of the whole corpus. Any change gives a new version and so a new key for every question. The old entries are never looked up again. They sit in memory until a limit removes them.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "The key holds no prompt version",
          text: "Edit the answer prompt and the key stays the same, so an old answer still hits. In memory the gap hides itself, because a prompt change ships in a deploy that empties the cache. A cache that survives deploys would serve answers written by the old prompt. Add a prompt version to the key first.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "How interviewers test a semantic cache",
          text: "Should we add a semantic cache, they ask. It matches a new question to the nearest stored one by embedding. Start with the exact cache and its key. Then name the risk. A changed name or ticket number barely shifts an embedding, yet it changes the right answer. Measure wrong answers on labelled pairs first.",
        },
        {
          kind: "p",
          text: "The key decides what counts as a repeat. What stops the store behind it growing for ever?",
        },
      ],
    },
    {
      id: "s3-in-memory-cache",
      title: "A small cache needs a size limit, a time limit and counters",
      goal: "What does each limit and counter of `InMemoryCache` do?",
      blocks: [
        {
          kind: "p",
          text: "A cache that never forgets runs out of memory. A cache that never expires serves old answers for ever. `InMemoryCache` has two limits to stop both. It keeps at most `max_entries` answers, which is 1000 by default. It drops any answer older than `ttl_seconds`, which is 3600 by default.",
        },
        {
          kind: "p",
          text: "The size limit needs a rule for which answer goes when the cache is full. `InMemoryCache` drops the least recently used one, a policy called **LRU**. A hit counts as use, so a popular answer goes to the safe end of an `OrderedDict`. The oldest untouched answer sits at the other end, and `put` removes it first.",
        },
        {
          kind: "p",
          text: "The time limit is the **time to live**, or TTL. Each answer is stamped with the clock when it is stored. A hit changes the answer's place in the LRU order and leaves its stamp alone. So a popular answer still expires at `ttl_seconds`. That bounds how stale any answer can get.",
        },
        {
          kind: "code",
          lang: "python",
          code: `# src/askpep/cache.py
class InMemoryCache:
    def get(self, key: str) -> CachedAnswer | None:
        with self._lock:
            found = self._entries.get(key)
            if found is None or self.clock() - found[0] >= self.ttl_seconds:
                self._entries.pop(key, None)
                self._misses += 1
                return None
            self._entries.move_to_end(key)
            self._hits += 1
            return found[1]`,
          caption: "A hit changes the entry's place in the order. It doesn't restart the time, because found[0] is never rewritten.",
        },
        {
          kind: "quiz",
          id: "architecture05-q3",
          question:
            "An answer was stored 59 minutes ago and was hit one minute ago. The time limit is 60 minutes. Is it still in the cache at minute 61?",
          options: [
            "Yes. The hit restarted its time.",
            "Yes. A popular answer is never removed.",
            "No. A hit deletes the entry.",
            "No. A hit moves the entry in the LRU order but leaves the stored time alone, so it expired at minute 60.",
          ],
          answer: 3,
          explain:
            "`get` calls `move_to_end`, which changes the LRU order. It never rewrites the stamp. The entry's age reaches `ttl_seconds` at minute 60 whatever happened in between. Only `put` for the same key restarts the time.",
        },
        {
          kind: "p",
          text: "The cache counts `hits`, `misses` and `evictions`, and it reports `size`. An **eviction** is an answer pushed out to make room. An answer that expired is not an eviction. `hit_rate` is hits divided by hits plus misses, or zero when nothing has been asked.",
        },
        {
          kind: "p",
          text: "One lock covers every method, because FastAPI runs a plain route on a thread. Two threads that touch the same counter or the same dictionary without a lock can lose a count or corrupt the order. The clock is a parameter, so a test passes its own and never sleeps.",
        },
        // CHECK: that Memorystore is a managed Redis compatible cache on Google Cloud that every Cloud Run instance can share, and what it costs. FACTS.md holds nothing on it.
        {
          kind: "p",
          text: "This cache lives in one process. Behind several Cloud Run instances, each one has its own cache, and `clear` on one does nothing to the others. A shared store such as Memorystore would give every instance the same cache. It adds a network call to each lookup, and a service to pay for and run.",
        },
        {
          kind: "p",
          text: "The cache works alone. What does a request do with it inside the service?",
        },
      ],
    },
    {
      id: "s4-cache-in-the-service",
      title: "A cache hit skips the model but not the input guards",
      goal: "What runs on a cache hit, and what stops a stored answer being served?",
      blocks: [
        {
          kind: "p",
          text: "`cached_stream` wraps `guarded_ask_stream`, the guarded answer stream from course 3. With no cache it is that same stream. With a cache it looks the key up first. A request then takes one of two paths.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Build the key from the question, the corpus version and the settings.",
            "Look it up. A cache or fingerprint error counts as a miss and is logged, because a broken cache must never break an answer.",
            "On a hit, run the input guards. They still write their audit event and can still block the question.",
            "On a hit that passes, stream the stored answer as one token and a done event. Write a trace with `stop_reason` set to `done`, no usage and no cost.",
            "On a miss, run `guarded_ask_stream`. Store the answer only when it cites at least one source and isn't a refusal.",
          ],
        },
        {
          kind: "p",
          text: "A hit skips the output guards. That is safe only because the key holds `guard_stages` and `model_armor_template`, and an answer is stored only after it passed the output guards once. Section 9 of `docs/design.md` lists this as the first behaviour the code has.",
        },
        {
          kind: "p",
          text: "Only a cited answer that isn't a refusal is stored. A refusal or an error that sat in the cache for an hour would replay one bad moment to every caller.",
        },
        {
          kind: "quiz",
          id: "architecture05-q4",
          question:
            "You tighten an input guard. A question that already has a stored answer now matches the new policy. What happens on the next request?",
          options: [
            "The stored answer is returned, because the cache is checked first.",
            "The cache entry is deleted and the model answers again.",
            "The route fails with a 500.",
            "The input guards still run on a hit, so the question is blocked and the stored answer isn't sent.",
          ],
          answer: 3,
          explain:
            "A hit runs `guard_input` before it streams anything. The audit event is written and a block still blocks. The stored answer is never sent for a question the policy refuses now.",
        },
        {
          kind: "p",
          text: "The cache is off by default. Set `CACHE_ENABLED=true` to turn it on, and set it back to `false` to turn it off. `CACHE_TTL_SECONDS` and `CACHE_MAX_ENTRIES` set the two limits.",
        },
        {
          kind: "p",
          text: "A stored answer stops being served in four ways. The corpus changes, and the new version gives a new key. The time limit passes. A setting in the key changes. The process restarts, and the memory is gone. Two changes are missing from that list. A prompt edit changes no key. Neither does the caller's identity.",
        },
        {
          kind: "widget",
          id: "architecture05-cache-key",
          intro:
            "The cache holds the answer to What is PEP 8, with the defaults: 1000 entries and a 3600 second time limit. Assume stored answers survive a deploy, unless a case names the in-memory cache. Eight things happen in turn. Predict whether the next request is a hit or a miss. Watch for a hit that returns a wrong answer.",
        },
        {
          kind: "p",
          text: "`GET /admin/cache` returns the counters of a running server. It needs the admin key, and it answers 404 when the cache is off. The body holds `hits`, `misses`, `size`, `evictions` and `hit_rate`.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "askpep cache stats always shows an empty cache",
          text: "The command starts its own process, so it reads a cache that no request ever touched. Use `GET /admin/cache` for a running server. `askpep cache clear` has the same limit. It empties the cache of its own process and no other.",
        },
        {
          kind: "step",
          id: "architecture05-s01",
          title: "Read the counters of a running cache",
          text: "Do this after lab step 3. Start the API with the cache on. Ask one question twice, once in lower case with extra spaces. Then read the counters. The first request misses and stores the answer. The second hits. Paste your key from `API_KEY` into the commands. Don't export it.",
          lang: "bash",
          code: `# Terminal 1. Setting CACHE_ENABLED back to false turns the cache off again.
CACHE_ENABLED=true uv run askpep serve

# Terminal 2. Replace YOUR_API_KEY with the API_KEY value from .env.
curl -N -X POST http://localhost:8000/ask \\
  -H "X-API-Key: YOUR_API_KEY" -H "Content-Type: application/json" \\
  -d '{"question": "Which PEP added f-strings?"}'
curl -N -X POST http://localhost:8000/ask \\
  -H "X-API-Key: YOUR_API_KEY" -H "Content-Type: application/json" \\
  -d '{"question": "which pep  added f-strings?"}'

curl http://localhost:8000/admin/cache -H "X-API-Key: YOUR_API_KEY"`,
          expect: `{"hits":1,"misses":1,"size":1,"evictions":0,"hit_rate":0.5}`,
        },
        {
          kind: "p",
          text: "A cache can't help a caller who can't wait. What takes the slow work out of the request?",
        },
      ],
    },
    {
      id: "s5-queue",
      title: "A queue takes the job now, and a worker runs it later",
      goal: "How does a desk job get from `POST /jobs/agent` to its answer?",
      blocks: [
        {
          kind: "p",
          text: "`POST /jobs/agent` doesn't run the desk. It puts the question on a queue and answers `202` with a `thread_id`. A worker runs the desk later. The caller then **polls**. It asks `GET /agent/{thread_id}` again and again until the status says `done`. Only the caller who started the thread, or an admin, may poll it.",
        },
        {
          kind: "p",
          text: "A 202 means accepted. It promises that the job is on the queue. It promises nothing about the answer.",
        },
        {
          kind: "p",
          text: "The route makes four decisions, in this order.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "No queue is set up, so it answers 503.",
            "The request names a `thread_id` that already has a run, or whose question an input guard blocked, so it answers 409. A second question is never dropped without a word.",
            "The queue or its credentials refuse the job, so it answers 502.",
            "Otherwise it queues the job and answers 202 with the thread id.",
          ],
        },
        {
          kind: "code",
          lang: "python",
          code: `# src/askpep/api.py, inside create_app
    def jobs_agent(body: AgentRequest, who: Annotated[Principal, Depends(require_key)]) -> dict:
        if svc.queue is None:
            raise HTTPException(status_code=503, detail="No queue is configured.")
        thread_id = body.thread_id or uuid.uuid4().hex
        started = bool(body.thread_id) and desk_status(desk_graph(body.graph), thread_id) is not None
        if started:
            require_thread_owner(desk_graph(body.graph), thread_id, who)  # a stranger gets a 404
        if started or (body.thread_id and input_blocked(thread_id)):
            raise HTTPException(status_code=409, detail="That thread already has a run. Use a new thread id.")
        job = {"question": body.question, "thread_id": thread_id, "graph": body.graph, "principal": dict(who)}
        try:
            svc.queue.enqueue(job, task_id=agent_task_id(thread_id))
        except (ProviderError, OSError, GoogleAuthError) as exc:
            log.exception("job_enqueue_failed")
            raise HTTPException(status_code=502, detail="The queue did not take the job.") from exc
        return {"thread_id": thread_id}`,
          caption: "The caller goes into the job, because the worker holds no API key.",
        },
        {
          kind: "p",
          text: "A caller who did not start the thread gets a 404 instead, as on `GET /agent/{thread_id}`.",
        },
        {
          kind: "p",
          text: "The second check is new, and it needs a reason. A job that an input guard blocks leaves no checkpoint, so `desk_status` calls the thread unknown. A repeat post would then queue the same task name. Cloud Tasks would answer 409, and `enqueue` counts that as success. The caller would get a 202 for a job that never runs.",
        },
        {
          kind: "p",
          text: "`input_blocked` reads the audit trail instead. Every guard verdict is an audit row, and a block at the `input` stage carries the thread id. With Postgres the table is shared, so every instance sees the block. With no pool, the in-memory audit sink holds the same events for the one process.",
        },
        {
          kind: "code",
          lang: "python",
          code: `# src/askpep/api.py, inside create_app
    def input_blocked(thread_id: str) -> bool:
        if svc.pool is not None:
            with svc.pool.connection() as conn:
                found = conn.execute(
                    "SELECT 1 AS blocked FROM audit WHERE thread_id = %s AND event = 'guard' "
                    "AND stage = 'input' AND action = 'block' LIMIT 1",
                    (thread_id,),
                ).fetchone()
            return found is not None
        return any(
            e.thread_id == thread_id and e.event == "guard" and e.stage == "input" and e.action == "block"
            for e in getattr(svc.audit, "events", ())
        )`,
          caption: "The audit table already has an index on thread_id, so the lookup is cheap.",
        },
        {
          kind: "p",
          text: "The thread id does two jobs. It names the run in the checkpoint, so the caller can poll. It also makes the task name, the label the queue gives a job.",
        },
        // CHECK: that a Cloud Tasks task name may hold only letters, numbers, hyphens and underscores, and that a second create with the same name fails with HTTP 409. FACTS.md holds nothing on Cloud Tasks.
        {
          kind: "p",
          text: "`agent_task_id` turns it into `agent-` and the first 32 hex digits of its SHA-256. Cloud Tasks, the production queue below, allows only letters, numbers, hyphens and underscores in a name. A thread id may hold dots and colons.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "A retry dedupes only when it sends its own thread id",
          text: "A caller that sends no `thread_id` gets a new random one on every call. A retry then makes a second job. If a caller might retry, have it build its own thread id from the request and send it each time.",
        },
        {
          kind: "quiz",
          id: "architecture05-q5",
          question: "A client posts `/jobs/agent` with no `thread_id`, times out, and posts the same body again. What happens?",
          options: [
            "Two jobs run, because each call gets a new random thread id and so a new task name.",
            "One job runs, because the task name stops a repeat.",
            "The second call answers 409.",
            "The second call answers 502.",
          ],
          answer: 0,
          explain:
            "The task name comes from the thread id. Two random thread ids give two names, so the queue sees two different jobs. The 409 needs a thread id that already has a run, and the client sent none.",
        },
        // CHECK: that Cloud Tasks queues HTTP calls to a target URL, that the queue's service account can sign an OIDC token for that call, and the roles roles/cloudtasks.enqueuer and roles/iam.serviceAccountUser. FACTS.md holds nothing on Cloud Tasks. Source: the Cloud Tasks overview and the Cloud Tasks authentication pages.
        {
          kind: "p",
          text: "In production the queue is **Cloud Tasks**, Google's queue for HTTP calls. Setting `ASYNC_MODE=cloud_tasks` selects it. Cloud Tasks calls `POST /internal/tasks/agent` on the AskPEP service itself, with the job as its JSON body. That route is the worker, so there is one service and no second one to deploy.",
        },
        // CHECK: the Cloud Tasks REST create call. The httpRequest body is base64, oidcToken takes serviceAccountEmail and audience, and the endpoint is the queue's tasks collection. FACTS.md holds nothing on Cloud Tasks.
        {
          kind: "p",
          text: "`CloudTasksQueue.enqueue` calls the Cloud Tasks REST API through `httpx`. The call creates a task. The task holds the URL to call, the job as a base64 body, and a service account. Cloud Tasks attaches an **OIDC token** for that account. The token is a signed statement from Google that says which account is calling.",
        },
        {
          kind: "p",
          text: "The task also gets a name, made from the thread id. A second create with the same name fails with a 409. `enqueue` treats that 409 as success, because it is what a repeat delivery looks like.",
        },
        // CHECK: that a Google signed OIDC token carries the email and email_verified claims, and that the audience must equal the target URL for Cloud Run to accept the call. FACTS.md holds nothing on Cloud Tasks tokens.
        {
          kind: "p",
          text: "The worker route must check that token, or anyone could post a job. `POST /internal/tasks/agent` answers 401 when the call has no **bearer token**, the token that an Authorization header carries. It answers 403 when the token fails or is for another account.",
        },
        {
          kind: "p",
          text: "The checks cover the signature, the expiry and the audience, which is the route's own URL. The route answers 503 when the account or the URL is unset.",
        },
        {
          kind: "p",
          text: "Two roles make this work. The account that runs AskPEP needs `roles/cloudtasks.enqueuer` on the queue, so it can create tasks. It also needs `roles/iam.serviceAccountUser` on the account that Cloud Tasks signs the token with. The cloud course creates the queue, that account and both roles. This chapter only reads them from settings.",
        },
        // CHECK: that Cloud Tasks queues can be created in europe-west3, the region GCP_REGION defaults to. FACTS.md holds nothing on Cloud Tasks locations. Check the Cloud Tasks locations page before the cloud course creates the queue.
        {
          kind: "compare",
          caption: "The queue settings. The queue is named askpep-agent, and it sits in the region GCP_REGION, which is europe-west3.",
          columns: ["Setting", "Value", "What it does"],
          rows: [
            ["`ASYNC_MODE`", "`inline` or `cloud_tasks`", "Picks the queue. The default is `inline`."],
            ["`TASKS_QUEUE`", "`askpep-agent`", "The name of the Cloud Tasks queue."],
            ["`TASKS_TARGET_URL`", "The full URL of `/internal/tasks/agent`", "Where Cloud Tasks calls. It is also the audience of the token."],
            ["`TASKS_SERVICE_ACCOUNT`", "A service account email", "The account whose token the route accepts."],
          ],
        },
        {
          kind: "p",
          text: "`InlineQueue` is the same queue inside one process, and `inline` is the default. `enqueue` records the job and runs the handler on a background thread, so the route still answers 202 at once. Tests and local work use it. It lives in `fakes.py`, because production never uses it.",
        },
        {
          kind: "step",
          id: "architecture05-s02",
          title: "Queue one desk run in your own process",
          text: "Do this after lab step 6. Start the API with the default queue. Post a job with your own thread id, then poll. Poll again if you see 404 or a status of `stopped`. Both appear while the job is starting and running. Paste your key from `API_KEY` into the commands.",
          lang: "bash",
          code: `# Terminal 1. ASYNC_MODE is inline by default, so the queue runs in this process.
uv run askpep serve

# Terminal 2. Replace YOUR_API_KEY with the API_KEY value from .env.
curl -X POST http://localhost:8000/jobs/agent \\
  -H "X-API-Key: YOUR_API_KEY" -H "Content-Type: application/json" \\
  -d '{"question": "Which Python version added the walrus operator?", "thread_id": "walrus-1"}'

# Wait a few seconds, then poll.
curl http://localhost:8000/agent/walrus-1 -H "X-API-Key: YOUR_API_KEY"`,
          expect: `{"thread_id":"walrus-1"}
{"thread_id":"walrus-1","status":"done","answer":"...","stop_reason":"done"}`,
        },
        // CHECK: every cell of this table for Cloud Tasks and Pub/Sub: what each one is, who receives a message, and how a repeat is stopped. FACTS.md holds nothing on either. Source: the Cloud Tasks and Pub/Sub overview pages.
        {
          kind: "compare",
          caption: "Cloud Tasks or Pub/Sub for a desk job",
          columns: ["Question", "Cloud Tasks", "Pub/Sub"],
          rows: [
            ["What is it?", "A queue of HTTP calls. You create one task for each job.", "A topic that publishers write to. Subscriptions deliver each message."],
            ["Who receives it?", "One endpoint, named in the task.", "Every subscription of the topic, so many consumers can get one message."],
            ["How is a repeat stopped?", "A task name. A second task with the same name fails.", "The producer can't name a message, so the handler has to cope with repeats."],
            ["When does it fit?", "One job for one worker, such as a desk run.", "One event for several consumers, such as an ingest that three services react to."],
          ],
        },
        {
          kind: "p",
          text: "AskPEP uses Cloud Tasks, because each job has one consumer, the service itself. The task name stops a duplicate before it is queued. Pub/Sub fits when many consumers need the same event. Write that reasoning into your ADR. These product names were checked on 22 October 2026.",
        },
        {
          kind: "p",
          text: "The queue took the job once. What happens when it delivers the job twice?",
        },
      ],
    },
    {
      id: "s6-redelivery",
      title: "A queue delivers at least once, so the job must survive a repeat",
      goal: "What protects a job from running twice, and where does that stop?",
      blocks: [
        // CHECK: that Cloud Tasks delivers a task at least once and sends it again when the target answers with an error or does not answer in time, and the default and maximum dispatch deadline for an HTTP task. FACTS.md holds nothing on Cloud Tasks.
        {
          kind: "p",
          text: "Cloud Tasks delivers a task **at least once**. Usually that means once. When a worker times out, crashes or answers with an error, the queue sends the task again. So a job can run twice, and your code has to expect it.",
        },
        {
          kind: "p",
          text: "Four things protect AskPEP. The task name stops one thread being queued twice. The route answers 409 for a thread that already has a run, or whose question a guard blocked. `run_job`, the handler, takes a lock on the thread. And it reads the thread's status before it does anything.",
        },
        {
          kind: "compare",
          caption: "What run_job does for each situation",
          columns: ["Situation", "What run_job does", "Why"],
          rows: [
            ["Another worker holds the thread's lock", "Runs nothing and returns `running`. The route answers 503.", "The first run is still going, and the queue retries later."],
            ["No checkpoint yet", "Runs the desk from the start.", "This is a new job."],
            ["`done`", "Leaves the thread alone.", "A repeat delivery finds the answer already there."],
            ["`awaiting_approval`", "Leaves the thread alone.", "A person has to decide first, and a repeat must not skip that."],
            ["`stopped`", "Carries on from the checkpoint with `continue_desk`.", "A worker died part-way, so the work so far is kept."],
          ],
        },
        {
          kind: "p",
          text: "A repeat after the job finished is harmless. The second delivery finds `done` and returns. A repeat after a crash is useful. It finishes the job from its last checkpoint, and the steps that finished are not paid for again.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "A status check can't tell a run in progress from a crash, so a lock decides",
          text: "A run in progress reads as `stopped` with `stop_reason` set to `error`. A second delivery that arrives mid-run would carry on from the checkpoint, and two workers would run one thread. You would pay for the model twice. So `run_job` first takes a Postgres advisory lock on the thread. A poll in that window still reads `stopped`, which looks like a failure and isn't.",
        },
        // CHECK: that pg_try_advisory_lock takes one bigint, answers at once with true or false, and keeps the lock until pg_advisory_unlock or until the session ends, and that a pooled connection keeps it after commit. Source: the PostgreSQL advisory lock functions page, not read for this chapter.
        {
          kind: "p",
          text: "The lock key is a number, and every instance must derive the same one. `thread_lock_key` takes eight bytes of a SHA-256 of the thread id. Python's own `hash` changes with each process, so it cannot serve. `pg_try_advisory_lock` answers at once, true or false, and never waits.",
        },
        {
          kind: "p",
          text: "A second delivery that finds the lock held runs nothing and returns `running`. The route turns that into a 503, and Cloud Tasks retries any answer but a 200. By then the first run has finished and the retry leaves it alone.",
        },
        {
          kind: "p",
          text: "If the first worker died instead, its session ended and took the lock with it. The retry finds a `stopped` thread and carries on from the checkpoint.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "The lock holds one pool connection for the whole run",
          text: "A lock belongs to a database session, so the run keeps one connection from the pool until it ends. The pool holds 10. Ten runs at once leave none for the trace and audit writes, and those then wait and fail. Keep the queue's maximum concurrent dispatches below 10 for each instance. With no pool there is one process, and `run_job` takes no lock.",
        },
        {
          kind: "p",
          text: "A longer dispatch deadline still helps. It is how long Cloud Tasks waits for a reply before it resends, and a deadline longer than your longest run means fewer resends. The desk's one write, `open_ticket`, is safe either way, because course 2 gave it an idempotency key.",
        },
        {
          kind: "p",
          text: "Two more edges matter when you poll. Before the first checkpoint exists, a poll answers 404 `Unknown thread`. A job that an input guard blocks leaves no checkpoint at all, so its poll answers 404 for ever. Section 9 of `docs/design.md` says so. A repeat post of that thread answers 409, from the audit row.",
        },
        {
          kind: "widget",
          id: "architecture05-redelivery",
          intro:
            "A desk job is on the queue. Six situations follow, each with a repeat. For each, read the state of the thread first, because `run_job` reads it too. Predict what AskPEP does, then check. Notice which situation the lock decides.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "How interviewers test long-running AI work",
          text: "How do you keep quick API work apart from long AI jobs, they ask. Queue the job and return a job id with a 202. A key from the caller makes a retry return the same job. Callers poll, and workers cope with repeats. Say what it costs. AskPEP locks each running thread, and the lock holds one database connection until the run ends.",
        },
        {
          kind: "quiz",
          id: "architecture05-q6",
          question: "Cloud Tasks resends a task 40 seconds in, while the first run is still going. What does AskPEP do?",
          options: [
            "It skips the task, because the thread already has a checkpoint.",
            "It answers 409 to the queue, so the queue drops the task.",
            "It carries on from the checkpoint, so two workers run the thread and the model is paid for twice.",
            "It runs nothing and answers 503, so the queue sends the task again later.",
          ],
          answer: 3,
          explain:
            "A run in progress reads as `stopped`, and a status check alone would resume it. So `run_job` tries the thread's lock first. The first worker holds it, the second runs nothing, and the route answers 503. Cloud Tasks retries anything but a 200, so the retry finds the thread finished.",
        },
        {
          kind: "p",
          text: "Both features now exist in code. Which of them does AskPEP actually need?",
        },
      ],
    },
    {
      id: "s7-decide",
      title: "Measure the repeat rate and the run time before you add either",
      goal: "Which numbers decide between a cache and a queue, and what gets written down?",
      blocks: [
        {
          kind: "p",
          text: "Both features cost code and add a way to fail, so add one only when a number says it pays. Two numbers decide. The repeat rate says what a cache can save. The run time, set against the caller's wait, says whether you need a queue.",
        },
        {
          kind: "p",
          text: "The repeat rate is the share of answered requests whose question was asked before. Your `traces` table holds each question in `query`. Count the requests and the distinct questions, after the same case and white space folding as the key.",
        },
        {
          kind: "step",
          id: "architecture05-s03",
          title: "Measure your repeat rate",
          text: "Run this against the traces you kept in course 5. It counts answered `/ask` requests in the last 30 days, and the distinct questions among them. Your own numbers will differ from the ones shown. Keep the output, because the ADR cites it.",
          lang: "bash",
          code: `docker compose exec -T db psql -U askpep -d askpep -c "
SELECT count(*) AS requests,
       count(DISTINCT trim(regexp_replace(lower(query), '\\s+', ' ', 'g'))) AS distinct_questions,
       round(100 * (1 - count(DISTINCT trim(regexp_replace(lower(query), '\\s+', ' ', 'g')))::numeric / count(*)), 1) AS repeat_pct
FROM traces
WHERE route = 'ask' AND stop_reason = 'done' AND ts > now() - interval '30 days';"`,
          expect: `-- Illustrative figures. Yours will differ.
 requests | distinct_questions | repeat_pct
----------+--------------------+------------
        5 |                  3 |       40.0
(1 row)`,
        },
        {
          kind: "p",
          text: "Say your traces show a repeat rate of 40 percent. Take 30,000 requests a month at 0.01275 USD each, the placeholder price per request from course 5. That is 382.50 USD. A cache that answers 40 percent of them leaves 60 percent to pay for, which is 229.50 USD.",
        },
        {
          kind: "p",
          text: "This is a worked example, because the prices in `pricing.json` are placeholders. `askpep cost-model --cache-hit-rate 0.4`, from chapter 2, prices the same change on your own traces. A hit costs nothing and counts as a success, so it also lowers your cost per successful task.",
        },
        {
          kind: "p",
          text: "The repeat rate is an upper bound on the hit rate. Four things push the real rate lower.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Your window is 30 days and the time limit is one hour. A question repeated next week misses.",
            "A restart empties the cache.",
            "An ingest changes the corpus version, so every stored answer misses.",
            "More than `max_entries` distinct questions push old entries out.",
          ],
        },
        {
          kind: "quiz",
          id: "architecture05-q7",
          question: "Your traces show 40 percent repeated questions, and the cache has a one hour time limit. What is the most the cache can save?",
          options: [
            "40 percent of the model spend, and probably less.",
            "Exactly 40 percent of the model spend.",
            "60 percent of the model spend.",
            "Nothing, until you add a queue.",
          ],
          answer: 0,
          explain:
            "The repeat rate counts every repeat in the window. The cache serves only repeats that arrive inside the time limit, after the last restart or ingest, and while the entry is still in memory. So 40 percent is a ceiling. Read the real hit rate from `GET /admin/cache`.",
        },
        {
          kind: "p",
          text: "Your desk's p95 comes from `askpep desk compare`, which you ran in course 2. The caller's wait is whatever its client allows. The `total-latency` objective gives requests 10 seconds for 95 percent of them, and a desk run may take up to 60 seconds. When your p95 is above the caller's wait, that caller needs the queue.",
        },
        {
          kind: "widget",
          id: "architecture05-cache-or-queue",
          intro:
            "Five requests reach AskPEP. For each, pick the fix that pays, which may be neither. Decide from two things. Does the question repeat, and can the caller wait for the run? The figures are illustrative.",
        },
        {
          kind: "p",
          text: "Now write the decision down. The ADR cites each number with the chapter it came from. It also weighs a shared cache, because the in-memory cache is one process only. The file is 0004, because chapters 2 to 4 wrote 0001 to 0003.",
        },
        {
          kind: "step",
          id: "architecture05-s04",
          title: "Write the serving shape ADR",
          text: "Copy `docs/adr/0000-template.md` to `docs/adr/0004-serving-shape.md`. Fill each section from your numbers. Name the source of every number. Write the decision as one sentence that starts We will. Add the row to section 10 of `docs/design.md`.",
          lang: "markdown",
          file: "docs/adr/0004-serving-shape.md",
          code: `# 0004. Your decision, written as a sentence

- Status: proposed
- Date: the day you decide, such as 22 October 2026

## Context
Your repeat rate and the query you ran. The p95 of a desk run from course 2, and the longest wait a caller allows. The requirement in section 1 that these serve.

## Options
Do nothing. A cache only. A queue only. Both. A shared cache such as Memorystore. For each: cost, latency, main risk, and what leaving it would take.

## Decision
We will ... Then one or two reasons, each one a number with its source chapter.

## Consequences
What gets easier and what gets harder. The hit rate, or the count of doubled runs, that would show the decision was wrong.

## Evidence
The repeat-rate query, the output of GET /admin/cache, the cost-model run and the commit.`,
        },
        {
          kind: "step",
          id: "architecture05-s05",
          title: "Fill the serving shape row and the request flow",
          text: "In `docs/design.md`, fill the Serving shape row of section 3 from your ADR. Then write section 4. List the path of `/ask`, `/agent` and `/jobs/agent`, from the caller to the answer. Mark each step with its latency budget and its cost, from your traces.",
          lang: "markdown",
          file: "docs/design.md",
          code: `| Serving shape | Your choice, in a few words | adr/0004-serving-shape.md | The options you rejected |

## 4. Request flow

/ask, on a hit
  1. The input guards run on the question.
  2. The cache returns the stored answer. No retrieval, no rerank, no model call.

/ask, on a miss
  1. The input guards. 2. Retrieval. 3. Rerank. 4. The answer model. 5. The output guards.
  6. The cache stores the answer when it cites a source.

/jobs/agent
  1. The route answers 202 with a thread id.
  2. The queue calls POST /internal/tasks/agent.
  3. The worker runs the desk. The input guards run inside it.
  4. The caller polls GET /agent/{thread_id}.`,
        },
        {
          kind: "p",
          text: "Those are your numbers. What did AskPEP's say at 1,000 requests a day?",
        },
      ],
    },
    {
      id: "s8-serving-adr",
      title: "AskPEP adds the queue for the build tool and leaves the cache off",
      goal: "What did AskPEP decide about serving, and what does its request flow look like?",
      blocks: [
        {
          kind: "p",
          text: "The queue pays and the cache doesn't, yet. The method is the one you just ran, on the pilot's own traces. Of 264 answered `/ask` requests last week, 224 were distinct, so the repeat rate is 15%. Only 18 of them repeated within the hour, which is 6.8%, and an hour is all the cache keeps.",
        },
        {
          kind: "p",
          text: "At 320 `/ask` calls a day and 0.0123 dollars each, the cache could save about eight dollars a month. It would also add a way to serve a wrong answer. So doing nothing wins for now. The product owner asks about the third team's repeats, and nobody has measured them, so the ADR says that.",
        },
        {
          kind: "p",
          text: "The queue is a different sum. Four hundred and eighty requests a day need not hold a connection. Putting them behind `POST /jobs/agent` also resolves chapter 1's contradiction. The security reviewer asks that R3's new wording be written down, because the objective is changing shape. It is, in both files.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# 0004. We will queue the build tool's desk runs and leave the cache off

- Status: accepted
- Date: 7 December 2026

## Context
R3 needs 95% within 10 seconds, reads 0.962, and has under two points of margin.
R6 lets a desk run take 60 seconds.
Design traffic 1,000 a day. The third team's build tool sends 480 and can poll.
Repeat rate on /ask, week of 24 to 27 November: 40 of 264, 15%.
Repeat within the cache's one hour: 18 of 264, 6.8%.
At 320 /ask calls a day and 0.0123 usd, a 6.8% hit rate saves about 8 usd a month.

## Options
1. Do nothing. 1,000 synchronous requests, and R3's margin is spent.
2. A cache only. About 8 usd a month. Doesn't touch slow desk runs.
3. A queue only. 480 requests leave the synchronous path. Adds polling.
4. Both. Saves 8 usd, and adds the risk of a wrong hit.
5. A shared cache such as Memorystore. A new service, for the same 8 usd.

## Decision
We will set ASYNC_MODE=cloud_tasks for the build tool's desk runs on POST /jobs/agent,
and leave CACHE_ENABLED=false.
R3 now reads: 95% of /ask and /agent requests finish within 10 seconds.
A queued run answers to R6, and POST /jobs/agent answers 202 within 1 second.

## Consequences
Easier: the build tool can't hold a connection, and R3 measures people waiting.
Harder: one pool connection per running job. Maximum concurrent dispatches stays at 5.
Dispatch deadline 120 seconds, twice R6.
Not measured: the third team's repeat rate and desk share.
Wrong if: a queued job runs twice and opens two tickets, or the hour repeat rate
passes 20% on the third team's traffic.
Then: read the lock logic first. At 20%, turn the cache on and read the gate.

## Evidence
Repeat-rate query on traces, 7 December. askpep cost for 25 November.
The third team's lead's estimate, 1 December, unmeasured.

## 4. Request flow (docs/design.md)

Route           Who waits      Budget                    Path                                  Today
/ask            a person       R3, 10 seconds            guards, retrieve, rerank, generate    5.4 s sum of p95s, 0.0123 usd
POST /agent     a person       R3, 10 seconds            guards, desk, stream                  0.0091 usd
POST /jobs/agent nobody        202 within 1 second       queue, /internal/tasks/agent, desk    R6, 60 seconds for the run
GET /agent/{id} the build tool none                      reads the checkpoint                  no model call`,
          caption: "ADR 0004 and section 4 of the design, whole. The figures belong to the story.",
        },
        {
          kind: "p",
          text: "Read options 2 and 3 side by side. Each has one number, and the numbers answer different problems. Then read the R3 line in the decision. This ADR changes a requirement, so section 1 changes with it. A design that quietly drops a hard case from a requirement is the error this line prevents.",
        },
        {
          kind: "p",
          text: "Reuse the shape for any serving decision. Measure the repeat rate inside the cache's own window, because a monthly repeat rate flatters it. Say who is waiting on each route.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# NNNN. We will <queue this> and <cache that, or leave it off>

- Status:
- Date:

## Context
Requirement and its margin:
Design traffic:         (and which callers can come back later)
Repeat rate:            (over the window)
Repeat within the TTL:
Saving per month:

## Options
1. Do nothing.
2. A cache only.
3. A queue only.
4. Both.

## Decision
We will

## Consequences
Easier:
Harder:
Not measured:
Wrong if:
Then:

## Request flow
Route   Who waits   Budget   Path   Today`,
          caption: "For your next serving decision, the same ADR with blank values.",
        },
        {
          kind: "p",
          text: "The serving shape is decided. Every queued run also writes rows, and T11 is about the text in those rows. Where does every copy of a question live, and how does T11 close? Chapter 6 starts there.",
        },
      ],
    },
  ],
  lab: {
    title: "Build the cache and the job queue",
    goal: "Write the cache key, the in-memory cache and its wiring, then the Cloud Tasks call, the in-process queue and the two job routes. No test calls Google. Run the tests from your AskPEP workspace root, then compare your files with `capstone/src/askpep/`.",
    minutes: 105,
    files: [
      "src/askpep/cache.py",
      "src/askpep/queue.py",
      "src/askpep/config.py",
      "src/askpep/services.py",
      "src/askpep/fakes.py",
      "src/askpep/api.py",
      "src/askpep/cli.py",
      "tests/architecture/test_architecture05_cache_queue.py",
    ],
    steps: [
      {
        title: "The cache key",
        text: "Replace `cache_key` and `corpus_version` in `cache.py`. Both raise `architecture-05 step 1`. The key hashes the folded question, the corpus version, the scope and the 17 settings. The version is 12 hex digits. Add the imports and `_LOCAL_VERSIONS` that the comments list.",
        code: `# src/askpep/cache.py
# Add these imports: hashlib, json and weakref, and LocalStore from askpep.local_store.
# Add this beside VERSION_SQL:
#   _LOCAL_VERSIONS: weakref.WeakKeyDictionary[LocalStore, tuple[list, int, str]] = weakref.WeakKeyDictionary()
# Its three values are the entries list, the length it had when you hashed it, and the version.


def cache_key(question: str, version: str, settings: Settings, scope: str = "") -> str:
    # your turn:
    # 1. Fold the question: " ".join(question.lower().split()).
    # 2. Build a document with the keys question, version, scope and settings. The settings value maps each
    #    name in KEY_SETTINGS to getattr(settings, name, None).
    # 3. json.dumps(document, sort_keys=True, separators=(",", ":"), default=str), encoded as UTF-8.
    # 4. Return KEY_PREFIX plus the SHA-256 hex digest.
    raise NotImplementedError("architecture-05 step 1")


def corpus_version(svc: Services) -> str:
    # your turn:
    # 1. A LocalStore: when _LOCAL_VERSIONS holds the same entries list at the same length, return its version.
    #    Otherwise hash each entry's doc_id, idx and text in (doc_id, idx) order. Put a separator between the
    #    fields and after each entry, as the capstone does with \\x1f and \\x1e. Keep 12 hex digits, store
    #    (entries, len(entries), version) and return it. The fields are entry.chunk.doc_id, .idx and .text.
    # 2. A Postgres pool: run VERSION_SQL and return the first 12 characters of the version column.
    #    Do not keep this one, because an ingest must show at once.
    # 3. Anything else: raise RuntimeError. A cache that can't tell the corpus changed would serve stale answers.
    raise NotImplementedError("architecture-05 step 1")`,
        test: "uv run pytest tests/architecture -k architecture05_s1",
      },
      {
        title: "An in-memory cache",
        text: "Replace `get`, `put`, `clear` and `stats` in `InMemoryCache`. Each raises `architecture-05 step 2`. `__init__` and `_drop_expired` ship complete. A hit puts the entry at the safe end and doesn't restart its time. `put` evicts the oldest while the cache is over `max_entries`. Hold `self._lock` in every method.",
        code: `# src/askpep/cache.py
class InMemoryCache:
    # __init__ gives you self._entries, an OrderedDict of key -> (time stored, value), plus self._lock,
    # self._hits, self._misses and self._evictions. _drop_expired removes every entry that is too old.

    def get(self, key: str) -> CachedAnswer | None:
        # your turn: under the lock, a missing key or an entry whose age is at least ttl_seconds is a miss.
        # Remove an expired entry and count the miss. A live entry moves to the end, counts a hit, and is returned.
        raise NotImplementedError("architecture-05 step 2")

    def put(self, key: str, value: CachedAnswer) -> None:
        # your turn: store (self.clock(), value) under key and move it to the end. While len(self._entries)
        # is above max_entries, pop the oldest with popitem(last=False) and count an eviction.
        raise NotImplementedError("architecture-05 step 2")

    def clear(self) -> int:
        # your turn: empty the entries and return how many there were. The counters keep their values.
        raise NotImplementedError("architecture-05 step 2")

    def stats(self) -> CacheStats:
        # your turn: call _drop_expired first, then return CacheStats(hits, misses, len(entries), evictions).
        raise NotImplementedError("architecture-05 step 2")`,
        test: "uv run pytest tests/architecture -k architecture05_s2",
      },
      {
        title: "The cache in the service",
        text: "Add the three cache settings, `Services.cache` and `build_cache`. Pass the cache to `Services` in `build_services`. In `/ask`, call `cached_stream` in place of `guarded_ask_stream`. Add `GET /admin/cache` for admins, and the `cache stats` and `cache clear` commands. They close the LangGraph pools with `close_eval`.",
        code: `# src/askpep/services.py
# In Services, add:  cache: "ResponseCache | None" = None
# In the TYPE_CHECKING block, add:  from askpep.cache import ResponseCache
def build_cache(settings: Settings) -> "ResponseCache | None":
    """The response cache, or None when CACHE_ENABLED is false."""
    # your turn: return None when settings.cache_enabled is false. Otherwise import InMemoryCache from
    # askpep.cache inside the function, and return InMemoryCache(settings.cache_max_entries, settings.cache_ttl_seconds).
    ...


# In build_services, pass cache=build_cache(settings) to Services in both branches.
# The local branch passes its arguments by position, and the cache comes after the tracer.
#
# src/askpep/config.py
#   cache_enabled: bool = False
#   cache_ttl_seconds: int = 3600
#   cache_max_entries: int = 1000
#
# src/askpep/api.py
#   from askpep.cache import cached_stream. In ask_route, replace guarded_ask_stream(svc, body.question, who)
#   with cached_stream(svc, body.question, who). Inside create_app, add a route:
#     @app.get("/admin/cache", dependencies=[Depends(require_admin)])
#     It answers 404 with "The cache is off." when svc.cache is None. Otherwise it returns
#     {**asdict(stats), "hit_rate": stats.hit_rate}, where stats = svc.cache.stats().
#
# src/askpep/cli.py
#   cache_app = typer.Typer(no_args_is_help=True, help="Read or empty the response cache in this process.")
#   app.add_typer(cache_app, name="cache")
#   Two commands, "stats" and "clear". Each calls open_services(). With svc.cache None, it prints
#   "The cache is off. Set CACHE_ENABLED=true." to stderr and exits with code 1. Each calls close_eval(svc)
#   in a finally block.
#   stats prints:  hits 3  misses 1  hit rate 75%  entries 1  evictions 0
#   clear prints:  cleared 1 answers`,
        test: "uv run pytest tests/architecture -k architecture05_s3",
      },
      {
        title: "Creating a Cloud Task",
        text: "Replace `CloudTasksQueue.enqueue`, which raises `architecture-05 step 4`. It posts a task to the Cloud Tasks REST API. The task carries an OIDC token and a name made from the task id. A 409 for a name that exists counts as success. The tests use a mock transport. The one live test is skipped by default.",
        code: `# src/askpep/queue.py
# Add these imports: base64 and json, and ProviderError and post_with_retry from askpep.providers.
class CloudTasksQueue:
    def enqueue(self, payload: Mapping[str, Any], *, task_id: str | None = None) -> str:
        # your turn:
        # 1. name = f"{self.parent}/tasks/{task_id}" when there is a task_id, else None.
        # 2. The task is {"httpRequest": {...}}. url is self.target_url, httpMethod is "POST", headers holds
        #    Content-Type: application/json, and body is the base64 of json.dumps(payload, separators=(",", ":")).
        #    oidcToken holds serviceAccountEmail (self.service_account) and audience (self.target_url).
        #    With a name, set task["name"] = name.
        # 3. Set self.client.headers["Authorization"] = f"Bearer {self.token()}". Ask for the token on every call.
        # 4. Send it: post_with_retry(self.client, f"{CLOUD_TASKS_URL}/{self.parent}/tasks", {"task": task},
        #    attempts=self.attempts, sleep=self.sleep).
        # 5. A ProviderError with status 409 and a name means the task exists. Return name. Raise any other error.
        # 6. Return str(reply.get("name") or name or "").
        raise NotImplementedError("architecture-05 step 4")`,
        test: "uv run pytest tests/architecture -k architecture05_s4",
      },
      {
        title: "A queue for tests and for one process",
        text: "Add `InlineQueue` to `fakes.py`, the four queue settings, `Services.queue` and `build_queue`. `InlineQueue` keeps each payload and skips a task id it has seen. It runs the handler on a daemon thread when `background` is true, and a handler that raises goes to `errors`. `build_queue` raises `ValueError` for any other mode.",
        code: `# src/askpep/fakes.py
# Add these imports if they are missing: threading, Callable and Mapping, and Any.
class InlineQueue:
    def __init__(self, handler: Callable[[dict], Any] | None = None, *, background: bool = False) -> None:
        # your turn: keep handler and background. Add tasks, results and errors as empty lists, a set of the
        # task ids seen, a list of threads and a lock.
        ...

    def enqueue(self, payload: Mapping[str, Any], *, task_id: str | None = None) -> str:
        # your turn: under the lock, name = task_id or f"inline-{len(self.tasks) + 1}". A task_id already seen
        # returns name and queues nothing. Otherwise record the id and a copy of the payload. With no handler,
        # return name. With background, start a daemon thread on self._run. Otherwise call self._run at once.
        ...

    def _run(self, payload: dict) -> None:
        # your turn: append handler(payload) to results. An exception goes to errors, and is logged.
        ...

    def join(self, timeout: float = 5.0) -> None:
        # your turn: wait for each background thread, for at most timeout seconds each.
        ...


# src/askpep/config.py
#   async_mode: str = "inline"  # "inline" or "cloud_tasks"
#   tasks_queue: str = ""
#   tasks_target_url: str = ""
#   tasks_service_account: str = ""
#
# src/askpep/services.py
#   In Services, add:  queue: "TaskQueue | None" = None
#   In the TYPE_CHECKING block, add:  from askpep.queue import TaskQueue
#   build_queue(settings) returns InlineQueue(background=True) for "inline". For "cloud_tasks" it returns
#   CloudTasksQueue(settings.google_cloud_project, settings.gcp_region, settings.tasks_queue,
#   settings.tasks_target_url, settings.tasks_service_account). Import each class inside its branch.
#   Any other mode raises ValueError. In build_services, pass queue=build_queue(settings) after the cache.`,
        test: "uv run pytest tests/architecture -k architecture05_s5",
      },
      {
        title: "The job routes",
        text: "Add `POST /jobs/agent` and `POST /internal/tasks/agent`, their request models, `thread_lock_key`, `input_blocked`, `run_job` and `verify_task`. The first queues a desk run and answers 202. The second is the queue's call. It verifies the token, runs the job under a lock on the thread, and answers 503 when another worker holds it. The tests pass a fake `task_verifier`.",
        code: `# src/askpep/api.py
# Add imports: hashlib, uuid, Header, GoogleAuthError, Mapping, InlineQueue, ProviderError, agent_task_id and
# verify_task_token. Check that continue_desk and desk_status are imported from askpep.agents.graph.
# create_app gains a keyword argument:  task_verifier: Callable[[str], Mapping[str, Any]] | None = None


def thread_lock_key(thread_id: str) -> int:
    # your turn: the SHA-256 digest of f"desk:{thread_id}".encode(). Return int.from_bytes of its first
    # 8 bytes, "big" and signed=True. Python's own hash() changes with each process, so it cannot be the key.
    ...


class JobPrincipal(BaseModel):
    user_id: str = Field(min_length=1, max_length=100)
    role: Role


class JobRequest(BaseModel):
    # your turn: question (1 to 2000 characters), thread_id (required, with the same pattern as AgentRequest),
    # graph (GraphName, default "handoffs") and principal (a JobPrincipal).
    ...


# Inside create_app, after desk_graph:
    def desk_job(job: Mapping[str, Any]) -> dict[str, str]:
        # your turn: graph = desk_graph(job["graph"]) and status = desk_status(graph, job["thread_id"]).
        # No status: run_desk(graph, job["question"], svc=svc, thread_id=..., principal=job["principal"]),
        # and return {"status": result.status}. A status of "stopped": return
        # {"status": continue_desk(graph, thread_id, svc=svc).status}. Otherwise return that status.
        ...

    def run_job(job: Mapping[str, Any]) -> dict[str, str]:
        # your turn: with svc.pool None there is one process, so return desk_job(job). Otherwise take
        # key = thread_lock_key(job["thread_id"]) and open "with svc.pool.connection() as conn". Run
        # "SELECT pg_try_advisory_lock(%s) AS locked" with (key,). A false answer returns {"status": "running"}.
        # Then conn.commit(), because the lock belongs to the session and outlives the transaction.
        # try: return desk_job(job). finally: conn.execute("SELECT pg_advisory_unlock(%s)", (key,)).
        ...

    def input_blocked(thread_id: str) -> bool:
        # your turn: the code from the queue section.
        ...

    # When svc.queue is an InlineQueue with no handler, set its handler to run_job.

    def verify_task(token: str) -> Mapping[str, Any]:
        # your turn: use task_verifier when one was given. Otherwise verify_task_token(token, settings.tasks_target_url).
        ...

    # Then the two routes, beside /agent. The first is the code from the queue section:
    #   @app.post("/jobs/agent", status_code=202) def jobs_agent(...)
    #   @app.post("/internal/tasks/agent") def tasks_agent(body: JobRequest, authorization: Header)
    # tasks_agent answers 503 when tasks_service_account or tasks_target_url is empty. Then it splits the
    # header into a scheme and a token. No bearer token is a 401. A verify_task that raises is a 403.
    # A token whose email is not tasks_service_account, or whose email_verified is false, is a 403.
    # Otherwise result = run_job(body.model_dump()). A status of "running" raises a 503 with the detail
    # "Another worker is running that thread. Try again." The queue retries anything but a 200. Return result.`,
        test: "uv run pytest tests/architecture -k architecture05_s6",
      },
    ],
    verify: "uv run pytest tests/architecture -k architecture05",
  },
  recap: [
    "A cache helps only when questions repeat, and a queue helps only when the caller can come back later.",
    "A cache key holds the folded question, the corpus version, the scope and every setting that can change an answer. AskPEP's key holds no prompt version.",
    "`InMemoryCache` has a size limit with LRU eviction, a time limit that a hit doesn't restart, and counters. It lives in one process.",
    "A hit runs the input guards and skips the output guards. Read the counters from `GET /admin/cache`.",
    "`POST /jobs/agent` answers 202 with a thread id. Cloud Tasks calls `POST /internal/tasks/agent` with an OIDC token.",
    "A queue delivers at least once. A Postgres lock on the thread stops two deliveries that overlap, and it holds one pool connection for the whole run.",
    "AskPEP queued the build tool's 480 runs a day. It left the cache off, because a 6.8% hourly repeat saves about eight dollars a month.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In the serving shape I learned that a cache needs repeats and a queue needs a caller who can come back. A key holds everything that can change an answer, and a queue delivers at least once. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["architecture-q03", "architecture-q04", "architecture-q10", "architecture-q11"],
};

export default chapter;
