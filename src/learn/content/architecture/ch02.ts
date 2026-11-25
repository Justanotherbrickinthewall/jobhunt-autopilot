import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "architecture-02-models-and-routing",
  course: "architecture",
  number: 2,
  title: "Each desk role gets the cheapest model that passes its eval, with Claude behind it",
  tagline: "AskPEP's routing decision, from the bill and the gate. The fallback earns its place, and the saving turns out small.",
  minutes: 75,
  objectives: [
    "Define routing, and name the calls it never touches.",
    "Write a `ROUTES` value, and read the four rules that `parse_routes` enforces.",
    "Pick the cheapest model that clears a floor, and say when a thin margin needs a repeat run.",
    "Say which errors fall back to Claude, and why the rest are raised.",
    "Read how `route_model` builds a model, and run a route through the eval.",
    "Project a month of spend with `askpep cost-model`, and name its three assumptions.",
    "Say when a shared gateway beats your own routing module.",
    "Fill the chat models row of the design, and write the routing ADR.",
    "Read AskPEP's own routing ADR and reuse its shape on your next model decision.",
  ],
  sections: [
    {
      id: "s1-why-route",
      title: "A role that a smaller model can pass should not pay for a bigger one",
      goal: "Should every desk role pay for the same model, and which calls can routing never reach?",
      blocks: [
        {
          kind: "p",
          text: "Each role should use the cheapest model that still passes its eval. Wednesday's bill from course 5 shows why the question is open. The researcher took 41% of 2.0181 dollars, `generate` took 39%, and triage took 4%. Every desk role runs on `gemini-3.8-flash`, so triage pays the writer's price per token just to pick a route.",
        },
        {
          kind: "p",
          text: "**Routing** sends each model call to a model chosen for its role. Run the eval for a role on a cheaper model. If the score still clears the floor, the role takes the cheaper model and the bill falls.",
        },
        {
          kind: "p",
          text: "A **role** is the name the desk gives a model call. In course 2, `make_chat_model` picked a model for each role. The roles are `triage`, `researcher`, `code_advisor`, `writer`, `supervisor`, `baseline`, `summariser`, `strong` and `judge`. Routing can move every one of them except the judge. The tuple `ROUTABLE_ROLES` holds the other eight.",
        },
        {
          kind: "p",
          text: "Three kinds of call stay where they are.",
        },
        {
          kind: "list",
          items: [
            "The `judge` role. A judge that changes model changes what every score means, so it stays on Claude.",
            "The `/ask` endpoint. It does not use the desk. It calls Claude directly through `ClaudeLLM`, so `ROUTES` cannot reach it.",
            "Every call, while `ROUTING_ENABLED` is false. That is the default.",
          ],
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Routing is off until you turn it on",
          text: "`ROUTING_ENABLED` is false by default, and `ROUTES` is an empty object. With both left alone, nothing changes. To turn routing off again, set `ROUTING_ENABLED=false` or delete the line. Then `ROUTES` is ignored, even if it holds a mistake.",
        },
        {
          kind: "p",
          text: "The lab adds `routing.py` and the cost model. Steps 1 to 5 build routing, and step 6 builds the model that prices it. Along the way you compare your own module with a gateway. At the end you record the decision in two places.",
        },
        {
          kind: "quiz",
          id: "architecture02-q1",
          question: "Routing is on, and `ROUTES` names a model for each role it may. Which of these calls can `ROUTES` change?",
          options: [
            "The judge's grading call.",
            "The answer that `/ask` writes with Claude.",
            "The writer's call inside the desk.",
            "None of them. Routing only changes the cost report.",
          ],
          answer: 2,
          explain:
            "The writer is a desk role, so `route_model` builds its model from `ROUTES`. The judge is excluded on purpose. `/ask` never goes through `route_model`, because it calls Claude directly.",
        },
        {
          kind: "p",
          text: "Routing needs a table of roles and models. What does that table look like, and what stops a bad one?",
        },
      ],
    },
    {
      id: "s2-reading-routes",
      title: "ROUTES is one JSON object, and a bad one stops startup",
      goal: "What does a `ROUTES` value look like, and what does `parse_routes` refuse?",
      blocks: [
        {
          kind: "p",
          text: "The setting `ROUTES` holds a JSON object. Each key is a role. Each value is the model for that role. A role you leave out keeps its desk model.",
        },
        {
          kind: "code",
          lang: "bash",
          code: `ROUTING_ENABLED=true
ROUTES='{"triage": "gemini-3.5-flash"}'`,
          caption: "Triage goes to gemini-3.5-flash. Every other role keeps its desk model. The single quotes keep the shell from eating the double quotes.",
        },
        {
          kind: "p",
          text: "The function `parse_routes` reads that text and returns a dict. It raises `ValueError` for four mistakes. The text is not JSON. The JSON is not an object. A key is not in `ROUTABLE_ROLES`. A value is not a string that starts `gemini-` or `claude-`.",
        },
        {
          kind: "p",
          text: "The message names the role, so the error says which rule broke. Empty text and `{}` both give an empty dict, which means no routes.",
        },
        // CHECK: that Vertex AI answers an unknown Gemini model name with a client error such as a 404 is not in FACTS.md. Call it once with a misspelt name and read the status before you rely on this.
        {
          kind: "p",
          text: "Why check the prefix and nothing more? Model names change often, and the function does not know which ones exist today. A misspelt name that passes the check fails on its first call, with a client error. The section 'Fall back to Claude when the provider fails, and raise everything else' raises that error and does not hide it.",
        },
        {
          kind: "p",
          text: "The services call `parse_routes` at startup when routing is on. A bad `ROUTES` therefore stops the app before it serves anything. You see the mistake at once, not on the first desk run.",
        },
        {
          kind: "quiz",
          id: "architecture02-q2",
          question: "Which of these values does `parse_routes` accept?",
          options: [
            "`{\"writer\": \"gemini-3.5-flash\"}`",
            "`{\"judge\": \"claude-sonnet-5-5\"}`",
            "`[\"triage\", \"gemini-3.5-flash\"]`",
            "`{\"triage\": \"flash\"}`",
          ],
          answer: 0,
          explain:
            "The writer is a routable role, and the model name starts `gemini-`. The judge is not routable. A list is not an object. The name `flash` does not start `gemini-` or `claude-`.",
        },
        {
          kind: "p",
          text: "The table can hold any valid model. How do you choose which one a role should get?",
        },
      ],
    },
    {
      id: "s3-cheapest-passing",
      title: "Pick the cheapest model that clears the floor, not the one that scores best",
      goal: "How do you choose a model for a role from its score and its price?",
      blocks: [
        {
          kind: "p",
          text: "Which model should a role get? The eval answers first, and the price breaks the tie. For one role, run its slice with each candidate model. Each run gives a score. A model **passes** when its score reaches the floor.",
        },
        {
          kind: "p",
          text: "Triage has a slice of its own. The `routing` slice scores `route_accuracy`, and the floor is 0.90 on 16 items. Both come from `gate.json`, which you wrote in course 4.",
        },
        {
          kind: "p",
          text: "The other roles have no slice. The `answer` slice and the `action` slice score the whole desk. Their floors are 0.80, on 23 and 12 items. A change to the researcher or the writer shows up in those two, so you read them together.",
        },
        {
          kind: "p",
          text: "Price comes from the `pricing.json` that you filled in during course 5. Its figures are placeholders, so every cost in this chapter is a worked example, never a bill. The function prices one typical call: 1,000 tokens in and 300 out.",
        },
        // CHECK: the prices below are the placeholders in pricing.json, with `_checked` set to "unchecked". Replace them with the provider's current prices before you rely on a cost figure.
        {
          kind: "compare",
          caption: "One typical call at the placeholder prices. Prices are in dollars per million tokens. Illustrative figures.",
          columns: ["Model", "Input price", "Output price", "One call"],
          rows: [
            ["`gemini-3.5-flash`", "0.30", "2.50", "0.00105 dollars"],
            ["`gemini-3.8-flash`", "0.50", "3.00", "0.0014 dollars"],
            ["`gemini-4-argon`", "2.00", "12.00", "0.0056 dollars"],
            ["`claude-sonnet-5-5`", "3.00", "15.00", "0.0075 dollars"],
          ],
        },
        {
          kind: "p",
          text: "The function `cheapest_passing` takes the scores, the prices and the floor. It returns the name of the cheapest model that passes. Ties go to the higher score, then to the name that sorts first.",
        },
        {
          kind: "p",
          text: "It has two ways to refuse. If no model reaches the floor, it raises `ValueError`. If a passing model has no price, it raises `KeyError`, because a guessed price would pick the wrong model.",
        },
        {
          kind: "widget",
          id: "architecture02-cheapest-passing",
          intro: "Four cases of `cheapest_passing` on illustrative triage scores. Predict each result, then check it. Watch for the two errors. One case adds `gemini-3.5-flash-lite`, which has no entry in `pricing.json`.",
        },
        {
          kind: "p",
          text: "A score from 16 items is coarse. One item is worth 6 points. A model that clears the floor by one item has proved very little. Course 2 showed the same effect, with a gap of two questions in 22.",
        },
        {
          kind: "p",
          text: "So repeat the slice before you trust a thin margin. The option `--runs 3` on `askpep eval run` runs it three times. Lab step 5 builds the part that lets a run use a route. The step 'Measure a route on the routing slice' has the command.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "How interviewers test routing",
          text: "How would you decide which model serves which task? A strong answer starts with plain rules and then measures. Score each candidate on a labelled set for that task. Set a floor. Pick the cheapest model that clears it. Then watch quality for each route in production, because a small set can hide a weak route.",
        },
        {
          kind: "quiz",
          id: "architecture02-q3",
          question: "gemini-3.5-flash scores 15 of 16 on the routing slice and clears the floor of 0.90 by one item. What should you do before you ship the route?",
          options: [
            "Ship it. A model that clears the floor is a passing model.",
            "Repeat the slice, because one item is 6 points on a slice this small.",
            "Lower the floor to 0.85, so that the margin looks bigger.",
            "Remove the floor, and pick the cheapest model.",
          ],
          answer: 1,
          explain:
            "A margin of one item on 16 items is inside the noise. Repeat the slice with `--runs`, and ship only if the model keeps clearing the floor. Moving the floor to widen a margin defeats the point of a floor.",
        },
        {
          kind: "p",
          text: "A cheap model that passes still has a second risk. What happens to the desk when its provider goes down?",
        },
      ],
    },
    {
      id: "s4-fallback",
      title: "Fall back to Claude when the provider fails, and raise everything else",
      goal: "Which errors should fall back to Claude, and which should be raised?",
      blocks: [
        {
          kind: "p",
          text: "A routed model has a second risk. If its provider has an outage, the desk stops. So each routed role gets a **fallback**, a second model that answers when the first one fails. Here the fallback is Claude, called with your Anthropic key, so it does not depend on Vertex AI.",
        },
        {
          kind: "p",
          text: "A fallback must not fire on every error. A **provider error** is a failure that is the provider's fault. That means a 429, which says you are sending too many requests. It means any 5xx, a status from 500 to 599, which says the server failed. It also means a timeout, or a dropped connection.",
        },
        {
          kind: "p",
          text: "Python and the SDKs name the last two. The classes are `TimeoutError`, `ConnectionError`, `httpx.TransportError` and `anthropic.APIConnectionError`. Any of them counts as a provider error.",
        },
        {
          kind: "p",
          text: "Everything else is raised. A 401 means our key is wrong. A 400 means our request is invalid. A fallback on those would hide a bug of ours, and the desk would pay Claude's prices for it.",
        },
        {
          kind: "p",
          text: "LangChain wraps the SDK's error inside an error of its own, so the status often sits one level down. Python keeps the earlier error in the `__cause__` attribute when code says `raise X from Y`. It uses `__context__` when there is no `from`.",
        },
        {
          kind: "p",
          text: "The function `is_provider_error` follows that chain, up to `CAUSE_DEPTH`, which is 5. The first error that carries a status decides. An error with no status and no cause is not blamed on the provider.",
        },
        {
          kind: "widget",
          id: "architecture02-fallback-trace",
          intro: "Seven failures of one desk call. Choose what the wrapper does for each one: fall back to Claude, or raise it.",
        },
        {
          kind: "p",
          text: "`FallbackChatModel` is a chat model that holds two others, `primary` and `fallback`. Its `invoke` asks the primary. If that raises a provider error, it logs a `model_fallback` warning and asks the fallback with the same arguments. Any other error is raised as it is.",
        },
        {
          kind: "p",
          text: "It does not stream. A streamed call becomes one `invoke`. That way a half-sent answer can never mix two models.",
        },
        {
          kind: "fold",
          tone: "hood",
          title: "Why `invoke` and not `_generate`",
          text: "The base class's `invoke` runs its own callbacks. The desk's span handler prices a call at the model name that the model reports, and a wrapper has no name of its own. Its callbacks would also count each call twice. So `FallbackChatModel.invoke` hands the call straight to one model, and a fallen-back call is priced as Claude's.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "A fallback costs more",
          text: "At the placeholder prices, one call costs 0.0075 dollars on `claude-sonnet-5-5` and 0.0014 on `gemini-3.8-flash`. That is about 5.4 times as much. In an outage the desk keeps answering, and the bill rises. Alert on the `model_fallback` warning, and check Claude against the same gate.",
        },
        {
          kind: "quiz",
          id: "architecture02-q4",
          question: "Gemini answers a routed desk call with status 401. What does `FallbackChatModel` do?",
          options: [
            "It falls back to Claude, so the user still gets an answer.",
            "It raises the error, because a 401 is our own mistake and a fallback would hide it.",
            "It retries Gemini until the key works.",
            "It returns an empty message and logs a warning.",
          ],
          answer: 1,
          explain:
            "A 401 means the credentials are wrong. That is a configuration bug, not a provider outage. A fallback would hide it and bill Claude's prices every day, so the error is raised.",
        },
        {
          kind: "quiz",
          id: "architecture02-q5",
          question: "Why does `FallbackChatModel` override `invoke` and not `_generate`?",
          options: [
            "`_generate` is private, and Python forbids overriding it.",
            "`invoke` is faster than `_generate`.",
            "The wrapper then has no streaming at all.",
            "So each call is counted once, and a fallen-back call is priced as Claude's.",
          ],
          answer: 3,
          explain:
            "A call through `_generate` would run the wrapper's callbacks as well as the model's own. The span handler would count it twice and price it at a name the wrapper does not have. `invoke` hands the call to one model, which reports it once.",
        },
        {
          kind: "p",
          text: "The rule is clear. Where does the code apply it, and how do you switch it on?",
        },
      ],
    },
    {
      id: "s5-services",
      title: "Routing is wired in one function, and the services use it only when you ask",
      goal: "How does `route_model` build a model, and what turns routing on?",
      blocks: [
        {
          kind: "p",
          text: "The function `route_model` builds the model for a role from the settings. It follows four rules in order.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "For the `judge`, or while routing is off, return what `make_chat_model` returns.",
            "Otherwise take the model name from `ROUTES`. A role that is not listed gets its desk model. That is `strong_model` for `strong` and `desk_model` for the rest.",
            "Build that model with `_model_named`. A name that starts `claude-` gives Claude. Any other name gives Gemini on Vertex AI.",
            "Put Claude behind it with `FallbackChatModel`. If the model already is the fallback model, return it alone.",
          ],
        },
        // CHECK: FACTS.md does not confirm `claude-sonnet-5-5`. It is the default of `FALLBACK_MODEL` and of the `/ask` answer model. Confirm the id on Anthropic's models page before you rely on it.
        {
          kind: "p",
          text: "Three settings drive it. `FALLBACK_MODEL` defaults to `claude-sonnet-5-5`. `ROUTING_ENABLED` defaults to false. `ROUTES` defaults to `{}`. The Gemini and Vertex AI product names were checked on 22 October 2026.",
        },
        {
          kind: "p",
          text: "The function `build_chat` in `services.py` returns the model factory that the desk uses. With fake providers it returns the echo model and ignores routing. With routing on, it calls `parse_routes` first, so a bad `ROUTES` stops startup. Then it returns `route_model`, bound to the settings.",
        },
        {
          kind: "code",
          lang: "bash",
          code: `# Off, the default. Nothing changes.
ROUTING_ENABLED=false

# On, with triage on a cheaper model.
ROUTING_ENABLED=true
ROUTES='{"triage": "gemini-3.5-flash"}'

# Off again. ROUTES is ignored while this is false.
ROUTING_ENABLED=false`,
          caption: "The three states of routing. To turn it off, set `ROUTING_ENABLED=false` or remove the line.",
        },
        {
          kind: "step",
          id: "architecture02-s01",
          title: "Measure a route on the routing slice",
          text: "Do this after lab step 5, and only if you have the keys. It makes real model calls, which the providers bill. Run the routing slice twice, once as it is and once with triage on `gemini-3.5-flash`. Then compare `route_accuracy` with the floor of 0.90.",
          lang: "bash",
          code: `uv run askpep eval run --slice routing --out evals/reports/routing-desk.json
ROUTING_ENABLED=true ROUTES='{"triage": "gemini-3.5-flash"}' uv run askpep eval run --slice routing --out evals/reports/routing-flash35.json`,
          expect:
            "Each run prints a JSON result with the slice's `rate`, `n` and the reasons for each failed item. Your rates are your own. With 16 items, a rate is a multiple of 0.0625, and the floor of 0.90 needs 15 of 16. Put both rates into the scores that you give `cheapest_passing`.",
        },
        {
          kind: "quiz",
          id: "architecture02-q6",
          question: "`ROUTING_ENABLED=false` and `ROUTES='not json'`. What happens at startup?",
          options: [
            "`parse_routes` raises `ValueError`, and the app stops.",
            "The app starts, and every call falls back to Claude.",
            "The app starts, and `ROUTES` is ignored because routing is off.",
            "The app starts, and the desk roles get empty models.",
          ],
          answer: 2,
          explain:
            "`build_chat` calls `parse_routes` only when routing is on. With routing off, the setting is never read, so a mistake in it waits until you turn routing on.",
        },
        {
          kind: "p",
          text: "A route that passes the eval still has a price. How do you know what a month would cost before you pay it?",
        },
      ],
    },
    {
      id: "s6-cost-model",
      title: "A cost model prices a month before you pay for it",
      goal: "How do you price a month before you pay for it, and what does the sum assume?",
      blocks: [
        {
          kind: "p",
          text: "Course 5 measured what the desk spent. The **cost model** prices what it could spend. You give it a volume, a cache hit rate and a model for a stage, and it projects a month. It reads the same trace rows as the `cost` command, so it starts from measured token counts.",
        },
        {
          kind: "p",
          text: "A **cache hit rate** is the share of requests that a response cache would answer without a model call. Chapter 5 builds the cache. Until then the rate is a number you try.",
        },
        {
          kind: "p",
          text: "The model applies two changes.",
        },
        {
          kind: "list",
          items: [
            "A cache hit costs nothing. A hit rate of 0.3 removes 30 percent of the model calls.",
            "A rerouted stage keeps its token counts and takes the new model's price.",
          ],
        },
        {
          kind: "p",
          text: "The function `project` does the arithmetic. It reroutes the rows, then keeps only request rows. The spend over those rows, divided by their count, is the cost of one request that misses the cache.",
        },
        {
          kind: "p",
          text: "A hit counts as a success and costs nothing. So the cost per successful task is the spend on misses, shared across every success, hits included. The next block gives the formula.",
        },
        {
          kind: "code",
          lang: "python",
          code: `per_task = (1 - hit) * per_request / (hit + (1 - hit) * success)
volume = requests_per_day * days * (1 - hit)
monthly = per_request * volume`,
          caption: "The arithmetic in `project`. The name `hit` is the cache hit rate, and `volume` counts the requests that reach a model.",
        },
        {
          kind: "step",
          id: "architecture02-s02",
          title: "Price a month from seeded rows",
          text: "This step is free and needs no keys. Do it after lab step 6. The command `incident seed` writes 240 made-up request rows, as in the incident chapter of course 5. Then `cost-model` prices them at 1,000 requests a day for 30 days. It reads your `pricing.json`, so the totals are a worked example.",
          lang: "bash",
          code: `uv run askpep incident seed --kind slow_rerank --out incident/rows.jsonl
uv run askpep cost-model --file incident/rows.jsonl --cache-hit-rate 0.3 --reroute generate=gemini-3.8-flash`,
          expect: `stage              now usd    with changes usd
generate            351.60               44.67
rerank                0.00                0.00
embed                 0.00                0.00
dense                 0.00                0.00
sparse                0.00                0.00
fuse                  0.00                0.00
240 request rows, 1000 requests a day for 30 days
total now: 351.60 usd. With the changes: 44.67 usd.
cost per successful task with the changes: 0.0015 usd

Your numbers match only while pricing.json still holds the placeholder prices.`,
        },
        {
          kind: "p",
          text: "Look at which stage changed. The seeded rows look like `/ask` traffic, and their one model stage, `generate`, runs on Claude. The cost model will reprice any stage you name, so it can answer a what if. Live routing cannot reach that stage, because `/ask` never goes through `route_model`.",
        },
        {
          kind: "p",
          text: "Desk traces name their stages after roles. On those you would write `--reroute triage=gemini-3.5-flash`. That is a change that `ROUTES` can make for real.",
        },
        {
          kind: "widget",
          id: "architecture02-month-projection",
          intro: "The same 240 rows, as a calculator. Predict the combined saving first, then change the inputs and read the three results.",
        },
        {
          kind: "p",
          text: "The projection rests on three assumptions.",
        },
        {
          kind: "list",
          items: [
            "The success rate stays at the measured value. A cheaper model that answers worse lowers it, and the model cannot see that.",
            "Token counts do not change with the model. A new model may write longer or shorter answers.",
            "The prices are the placeholders in `pricing.json`, so the totals are worked examples.",
          ],
        },
        {
          kind: "p",
          text: "So the eval gate comes first and the cost model second. A saving that fails the gate is not a saving.",
        },
        {
          kind: "quiz",
          id: "architecture02-q7",
          question: "A reroute cuts the cost of a request by 80 percent. The gate then shows `answer_pass` falling from 0.86 to 0.71. What does the cost model say about the change?",
          options: [
            "It reports the saving and says nothing about the fall. Only the gate sees it.",
            "It rejects the change, because the success rate fell under the floor.",
            "It lowers the saving to match the fall in `answer_pass`.",
            "It cannot run until the gate passes.",
          ],
          answer: 0,
          explain:
            "The cost model holds the measured success rate fixed. It prices the cheaper model and reports a saving. The floor of 0.80 is the gate's, and 0.71 breaks it, so the change fails there.",
        },
        {
          kind: "p",
          text: "Routing lives in one small file today. When is a shared gateway the better home for it?",
        },
      ],
    },
    {
      id: "s7-gateways",
      title: "Keep your own router until several teams share the models",
      goal: "When does a shared gateway beat your own routing module?",
      blocks: [
        {
          kind: "p",
          text: "The default for AskPEP is the module you just built. `routing.py` is one small file that you own. It routes by role and falls back to Claude. The third team would add traffic and no second service, so AskPEP still has one codebase, two providers and one operator.",
        },
        {
          kind: "p",
          text: "A **gateway** is a service between your code and the model providers. Your code calls the gateway, and the gateway calls the provider. It can hold the keys, route, retry, fall back and log in one place.",
        },
        {
          kind: "p",
          text: "A gateway pays off when several teams call models. It keeps keys and spend limits in one place. It also helps when providers change often, because the change happens once. It costs a hop, a new thing that can be down, and one more place that prompts pass through.",
        },
        // CHECK: none of the four products below was read in current documentation on 22 October 2026, and FACTS.md holds nothing on them. Confirm for each one what it does, whether it is open source or hosted, where it runs, what it logs and what it costs. The table describes each product in general terms from memory, so treat every cell as unchecked. The llmops interview bank carries the same CHECK on its gateway question.
        {
          kind: "compare",
          caption: "Five ways to route model calls. The first is what AskPEP runs. The other four are described in general terms, and every cell in their rows is unchecked.",
          columns: ["Tool", "Best at", "When you switch to it", "What it costs you"],
          rows: [
            [
              "`routing.py`, your own module",
              "One service with a few providers, routed by role.",
              "You rarely need to. Switch when a second team wants the same models.",
              "You write and test the retries, the fallback and the logging yourself.",
            ],
            [
              "LiteLLM",
              "One interface to many providers, run by you.",
              "Several services call models, and you want central keys and spend limits.",
              "You host it, upgrade it and watch it. Every prompt then passes through it.",
            ],
            [
              "Portkey",
              "A hosted gateway with logging and routing rules.",
              "You want a gateway and do not want to run one.",
              "Prompts leave your network for a third party. Check what it logs and where it runs.",
            ],
            [
              "OpenRouter",
              "One account and one API for many providers' models.",
              "You want to try many models quickly.",
              "The same third party path. Your own provider terms no longer apply directly.",
            ],
            [
              "Azure API Management, as an AI gateway",
              "A gateway inside an Azure estate.",
              "The company already runs Azure and wants one place for policy.",
              "It ties routing to a cloud that AskPEP does not run on.",
            ],
          ],
        },
        {
          kind: "p",
          text: "Read the table with one question. Who else needs this? The third team calls AskPEP and not the models, so a gateway would add a hop and nothing else yet.",
        },
        {
          kind: "p",
          text: "Running a gateway means deploying it, with its own service account and its own alerts. The cloud course covers that work. This chapter builds none of it.",
        },
        {
          kind: "p",
          text: "A gateway does not replace the eval gate. Quality for each route still needs a measured score, with or without a gateway. It puts the policy in one place and leaves the question of quality where it was.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Would you put an LLM gateway in front of your providers?",
          text: "It depends on how many teams and providers there are. For one service and a couple of providers, keep a router module. Add a gateway when several teams call models and need central keys and spend limits, or when providers change often. Then check what it logs and what happens when it is down.",
        },
        {
          kind: "quiz",
          id: "architecture02-q8",
          question: "AskPEP's one service calls Gemini and Claude. A second team wants to call the same models, with a spend limit of its own. What is the strongest reason to move to a gateway?",
          options: [
            "A gateway makes each token cheaper.",
            "A gateway replaces the eval gate.",
            "A gateway removes the need for a fallback.",
            "Two teams now need central keys and separate spend limits, which a gateway gives in one place.",
          ],
          answer: 3,
          explain:
            "Shared keys and per team limits are what a gateway is for. It does not change the price of a token, it does not measure quality, and it does not remove the need for a fallback.",
        },
        {
          kind: "p",
          text: "The options are on the table. Where does the decision get written down?",
        },
      ],
    },
    {
      id: "s8-adr",
      title: "Record the choice in design.md and one ADR that argues from numbers",
      goal: "Where does the routing decision go, and what numbers must it cite?",
      blocks: [
        {
          kind: "p",
          text: "Chapter 1 gave you `docs/design.md` and the ADR template.",
        },
        {
          kind: "p",
          text: "This chapter fills two places. The first is the chat models row in the component table of section 3. The second is one ADR for the routing decision, with its row in section 10. The other sections belong to other chapters, so leave them as they are.",
        },
        {
          kind: "p",
          text: "Argue from numbers, and say where each one came from. Use the floor and the item counts from your gate config. Use your own rates from the step 'Measure a route on the routing slice'. Take the cost model output from the step 'Price a month from seeded rows'. The prices are placeholders, so the ADR says so.",
        },
        {
          kind: "step",
          id: "architecture02-s03",
          title: "Fill the chat models row",
          text: "Open `docs/design.md`. In the component table of section 3, fill the chat models row. Name the model for each desk role, link the ADR you write next, and list the options you rejected. Replace each choice with the one your own scores support. If triage did not clear the floor, every role stays on `gemini-3.8-flash`.",
          lang: "markdown",
          code: `| Chat models | triage: gemini-3.5-flash. Other desk roles: gemini-3.8-flash. Fallback and judge: claude-sonnet-5-5. | \`adr/0001-route-triage-by-eval.md\` | One model for every role. A gateway in front of the providers. Routing every role. |`,
        },
        {
          kind: "step",
          id: "architecture02-s04",
          title: "Write the routing ADR",
          text: "Copy `docs/adr/0000-template.md` to `docs/adr/0001-route-triage-by-eval.md`. This is the first ADR of the course, so it is 0001. Fill each heading from your own numbers. The sketch shows where each number goes.",
          lang: "markdown",
          code: `# 0001. Route triage to a cheaper model, with Claude behind it

- Status: proposed
- Date: the day you decided, written as 22 October 2026.

## Context

Triage only picks a route. The routing slice scores it: route_accuracy, floor 0.90, 16 items (course 4).
At the placeholder prices, one call costs 0.0014 dollars on gemini-3.8-flash and 0.0075 on claude-sonnet-5-5.
Prices come from pricing.json, which is unchecked, so every cost here is a worked example.

## Options

1. Do nothing. Every role stays on gemini-3.8-flash.
2. Route triage to gemini-3.5-flash, with Claude behind it. One call costs 0.00105 dollars, 25 percent less.
3. Put a gateway such as LiteLLM in front of the providers. It adds a hop and a service to run, for one team.

## Decision

We will route triage to gemini-3.5-flash only if its route_accuracy reaches 0.90 on your repeated runs.
Then give the one or two reasons that decided it, from your own rates.

## Consequences

Easier: the triage cost falls. Harder: one more route to test, and a fallback that bills Claude's prices.
Wrong if: route_accuracy falls under 0.90, or the model_fallback warning appears often.
Then set ROUTING_ENABLED=false.

## Evidence

- The two eval runs from the step 'Measure a route on the routing slice'. Write your rate and item count for each.
- The cost-model run from the step 'Price a month from seeded rows', with its command line and totals.
- The commit that adds routing.py.`,
        },
        {
          kind: "step",
          id: "architecture02-s05",
          title: "Add the ADR to section 10",
          text: "In the decisions table of section 10, fill the empty 0001 row. Write the decision as a sentence and its status. Mark it accepted once your numbers support it.",
          lang: "markdown",
          code: `| 0001 | Route triage to gemini-3.5-flash, with Claude behind it | proposed |`,
        },
        {
          kind: "p",
          text: "Chapter 8 reviews every ADR against the numbers, so write this one to survive that review. What did AskPEP's own runs say when this method met the real bill?",
        },
      ],
    },
    {
      id: "s9-route-adr",
      title: "AskPEP's routing ADR keeps the fallback and admits the saving is small",
      goal: "What did the real runs say about routing, and what did AskPEP decide?",
      blocks: [
        {
          kind: "p",
          text: "The fallback is the part worth having, and the saving is about four dollars a month. On Wednesday 2 December you price two routes, then run the gate. The method is the one above. Read the bill, try the route, and let the gate overrule the sum.",
        },
        {
          kind: "p",
          text: "Triage passes. Three runs of the routing slice score 15, 15 and 16 of 16, and the answer and action slices don't change. Then you try the role that holds the money. With the researcher on `gemini-3.5-flash` the sum saves 14%, and the answer slice falls to 16 of 23.",
        },
        {
          kind: "p",
          text: "The security reviewer asks why anyone would carry a route that saves four dollars. You answer that the route is one setting, and the same gate run covers it. The product owner wants the fallback either way, because five times the traffic means five times the calls against one provider's quota.",
        },
        {
          kind: "p",
          text: "The third team's lead asks whether any of this lifts R7. It doesn't, and the ADR says so.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# 0001. Route triage to gemini-3.5-flash, with Claude behind every desk role

- Status: accepted
- Date: 2 December 2026

## Context
R1 needs 0.80 on the answer slice. R4 allows 0.02 usd per successful task.
Design traffic is 1,000 requests a day, five times the pilot.
Every desk role has one model, so one Gemini outage stops desk runs, which are 68% of traffic.
Wednesday 25 November spent 2.0181 usd: researcher 41%, generate 39%, writer 15%, triage 4%.
generate is /ask on Claude, and routing can't reach it.
Prices are placeholders from pricing.json, unchecked.

## Options
1. Do nothing. No saving and no fallback.
2. Routing on, no routes. Claude behind every desk role. No saving.
3. Option 2, and triage on gemini-3.5-flash.
   route_accuracy 15/16, 15/16, 16/16 over three runs, floor 0.90.
   Answer 19/23 and action 10/12, both unchanged.
   Triage 0.0734 to 0.0469 usd. Day 2.0181 to 1.9916 usd, 1.3% less.
4. Option 3, and the researcher on gemini-3.5-flash.
   Researcher 0.8248 to 0.5428 usd, 14% of the day.
   Answer 16/23 = 0.70. Action 9/12 = 0.75. Both under the floor of 0.80.
5. A gateway such as LiteLLM. A hop and a service to run, for one service and one operator.

## Decision
We will turn routing on, route triage to gemini-3.5-flash and keep the other
desk roles on gemini-3.8-flash, with claude-sonnet-5-5 behind them.
The fallback decided it. The route passed the gate, and it is one setting to remove.

## Consequences
Easier: a Gemini outage no longer stops the desk.
Harder: one more route to test at each model change.
A fallback call costs about 5.4 times a gemini-3.8-flash call.
Unchanged: R7. Nothing here explains 0.8715.
Not measured: provider quota at 1,000 requests a day.
Saving at design traffic: 302.72 to 298.74 usd for 30 days, placeholder prices.
Wrong if: route_accuracy falls under 0.90 across three runs, or model_fallback
appears on more than 1% of desk calls in a day.
Then: set ROUTES to an empty object and read the gate again.

## Evidence
askpep eval run --slice routing, three runs, 2 December.
askpep eval gate with each route, on staging.
askpep cost, 26 November report for Wednesday 25 November.`,
          caption: "ADR 0001, whole. The runs and figures belong to the story, and the 1% limit is a limit the team chose.",
        },
        {
          kind: "p",
          text: "Read option 4 first. It is the option the bill wanted, and the gate refused it. Then read the line starting Unchanged. An ADR that only lists benefits would let the product owner think the third team's blocker had moved. The sentence takes one line and saves a meeting.",
        },
        {
          kind: "p",
          text: "Reuse the shape for any choice of model. Keep the do-nothing option, and put the gate's refusal in the record, because it stops someone trying the same cut next quarter.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# NNNN. <the route, as a sentence>

- Status:
- Date:

## Context
Requirements this serves:
Design traffic:
Where the money goes today:   (stages and shares)
What routing can't reach:
Price source:                 (checked or unchecked)

## Options
1. Do nothing.
2.                            (score, items, floor, cost change for each)

## Decision
We will

## Consequences
Easier:
Harder:
Unchanged:                    (name the blocker this does not touch)
Not measured:
Wrong if:
Then:

## Evidence`,
          caption: "For your next model decision, the same ADR with blank values.",
        },
        {
          kind: "p",
          text: "The model choice leaves R7 where it was. Two of the four packaging items still fail on the gate. Is the retrieval stack the reason, and will it carry 1,000 requests a day? Chapter 3 starts there.",
        },
      ],
    },
  ],
  lab: {
    title: "Build model routing and the cost model for AskPEP",
    goal: "Write `parse_routes`, `cheapest_passing`, `is_provider_error`, `FallbackChatModel.invoke`, `route_model` and `project`, with the settings, `build_chat` and the `cost-model` command that go with them. Each stub raises `NotImplementedError(\"architecture-02 step N\")`. No test calls a model. Run the tests from your AskPEP workspace root. Then compare your files with `capstone/src/askpep/` in the my-learn folder.",
    minutes: 90,
    files: [
      "src/askpep/routing.py",
      "src/askpep/costmodel.py",
      "src/askpep/config.py",
      "src/askpep/services.py",
      "src/askpep/cli.py",
      "tests/architecture/test_architecture02_routing.py",
    ],
    steps: [
      {
        title: "Read the routes",
        text: "Write `parse_routes` in `routing.py`. It turns the `ROUTES` text into a dict from role to model. It raises `ValueError` in four cases. The text is not JSON, or the JSON is not an object. A role cannot be routed, or a model name does not start `gemini-` or `claude-`. The stub raises `architecture-02 step 1`.",
        code: `# src/askpep/routing.py
# Add \`import json\` to the imports. ROUTABLE_ROLES and MODEL_PREFIXES ship in your stub.
def parse_routes(text: str) -> dict[str, str]:
    """Read the \`ROUTES\` setting: a JSON object that maps a role to a model name."""
    # your turn:
    # 1. Blank text gives {}.
    # 2. json.loads the text. Raise ValueError("ROUTES is not valid JSON: ...") when it fails.
    # 3. Raise ValueError when the result is not a dict.
    # 4. For each role and model, raise a ValueError that names the role when the role is not in
    #    ROUTABLE_ROLES, or when the model is not a string that starts with MODEL_PREFIXES.
    # 5. Return the routes as a dict.
    ...`,
        test: "uv run pytest tests/architecture -k architecture02_s1",
      },
      {
        title: "Pick the cheapest model that passes",
        text: "Write `cheapest_passing` in `routing.py`. It keeps the models whose score reaches the floor and returns the cheapest by the cost of one typical call. Ties go to the higher score, then the name. It raises `ValueError` when none passes. The stub raises `architecture-02 step 2`.",
        code: `# src/askpep/routing.py
# Change the cost import to: from askpep.telemetry.cost import Price, cost_usd, price_of
def cheapest_passing(
    scores: Mapping[str, float],
    prices: Mapping[str, Price],
    floor: float,
    *,
    tokens_in: int = 1000,
    tokens_out: int = 300,
) -> str:
    # your turn:
    # 1. passing = the models whose score is at least floor, each with its score.
    # 2. Raise ValueError(f"no model scores {floor} or more") when passing is empty.
    # 3. Return min(passing, key=...). The key is a tuple of three things: the cost of one call,
    #    cost_usd(price_of(prices, model), tokens_in, tokens_out); then the negated score; then the name.
    #    Do not catch the KeyError that price_of raises for a model with no price.
    ...`,
        test: "uv run pytest tests/architecture -k architecture02_s2",
      },
      {
        title: "Tell a provider error from our own",
        text: "Write `is_provider_error` in `routing.py`. It is true for a 429, a 5xx, a timeout or a dropped connection, and false for anything else. It looks at the error and at its `__cause__` or `__context__`, up to `CAUSE_DEPTH` deep. The first error with a status decides. The stub raises `architecture-02 step 3`.",
        code: `# src/askpep/routing.py
# Add \`import anthropic\` and \`import httpx\` to the imports. _status ships in your stub.
def is_provider_error(exc: BaseException) -> bool:
    # your turn: look at up to CAUSE_DEPTH errors, starting with exc.
    # 1. Return False when there is no error left to look at.
    # 2. Return True for a TimeoutError, a ConnectionError, an httpx.TransportError
    #    or an anthropic.APIConnectionError.
    # 3. status = _status(current). When it is not None, return True for a 429 or a status of 500
    #    or more, and False for any other status.
    # 4. Move to current.__cause__, or to current.__context__ when there is no cause.
    # 5. After the loop, return False.
    ...`,
        test: "uv run pytest tests/architecture -k architecture02_s3",
      },
      {
        title: "Write the fallback to Claude",
        text: "Write `FallbackChatModel.invoke` in `routing.py`. It calls `primary.invoke`, and calls `fallback.invoke` only when the error is a provider error. It logs a `model_fallback` warning first. It passes `stop` on only when it is not None. The stub raises `architecture-02 step 4`.",
        code: `# src/askpep/routing.py
class FallbackChatModel(BaseChatModel):
    primary: Any
    fallback: Any

    def invoke(
        self,
        input: LanguageModelInput,
        config: RunnableConfig | None = None,
        *,
        stop: list[str] | None = None,
        **kwargs: Any,
    ) -> AIMessage:
        # your turn:
        # 1. extra = {} when stop is None, else {"stop": stop}.
        # 2. try: return self.primary.invoke(input, config, **extra, **kwargs)
        # 3. except Exception as exc: raise it again unless is_provider_error(exc) is true.
        # 4. Otherwise log.warning("model_fallback", extra={"error": type(exc).__name__})
        #    and return self.fallback.invoke(input, config, **extra, **kwargs).
        ...`,
        test: "uv run pytest tests/architecture -k architecture02_s4",
      },
      {
        title: "Route in the services",
        text: "Write `route_model` in `routing.py`. Then edit your own files. Add the three settings to `config.py`, and make `build_chat` in `services.py` return `route_model` when routing is on. Routing stays off by default, and the judge is never rerouted. The stub raises `architecture-02 step 5`.",
        code: `# src/askpep/routing.py
# Add make_chat_model to the import from askpep.providers.
def route_model(settings: Settings, role: ModelRole) -> BaseChatModel:
    # your turn:
    # 1. The judge, and any call while settings.routing_enabled is false, gets
    #    make_chat_model(settings, role).
    # 2. default = settings.strong_model for "strong", else settings.desk_model.
    #    name = parse_routes(settings.routes).get(role, default).
    # 3. primary = _model_named(settings, name). When name is settings.fallback_model, return primary alone.
    # 4. Otherwise return FallbackChatModel(primary=primary,
    #    fallback=_model_named(settings, settings.fallback_model)).
    ...


# Your own files. In config.py, add to Settings:
#     fallback_model: str = "claude-sonnet-5-5"
#     routing_enabled: bool = False
#     routes: str = "{}"
#
# In services.py, build_chat keeps its fake branch first. Then:
#     if settings.routing_enabled:
#         from askpep.routing import parse_routes, route_model
#
#         parse_routes(settings.routes)  # a bad ROUTES stops startup here
#         return partial(route_model, settings)
#     return partial(make_chat_model, settings)`,
        test: "uv run pytest tests/architecture -k architecture02_s5",
      },
      {
        title: "Price a month with the cost model",
        text: "Write `project` in `costmodel.py`, then add the `cost-model` command to `cli.py`. `project` reroutes the rows, prices them, and scales the cost to a volume and a cache hit rate. The command prints a table and two totals. The stub raises `architecture-02 step 6`.",
        code: `# src/askpep/costmodel.py
# Add to the imports:
#   from askpep.telemetry.cost import Price, row_usage, stage_costs
#   from askpep.telemetry.records import Row, request_rows
#   from askpep.telemetry.slo import is_success
def project(rows: Sequence[Row], prices: Mapping[str, Price], scenario: Scenario) -> Projection:
    # your turn:
    # 1. counted = request_rows(reroute_rows(rows, scenario.reroute)). Raise ValueError when it is empty.
    # 2. costs = stage_costs(counted, prices). per_request is the sum of their cost_usd over len(counted).
    # 3. success = the share of counted rows for which is_success(row) is true.
    #    hit = scenario.cache_hit_rate.
    #    per_task = (1 - hit) * per_request / (hit + (1 - hit) * success), or None when the divisor is 0.
    # 4. volume = scenario.requests_per_day * scenario.days * (1 - hit). monthly = per_request * volume.
    # 5. stage_monthly_usd maps each stage to its cost over the rows, divided by len(counted),
    #    times volume.
    ...


# Your own file, cli.py: the command \`askpep cost-model\`.
#   Options: --since, --file, --requests-per-day (default 1000), --days (default 30),
#   --cache-hit-rate, and --reroute STAGE=MODEL, which can repeat.
#   Price the rows twice: with no changes, then with the hit rate and the reroutes.
#   Print a table of each stage now and with the changes, the two totals, and the cost per successful task.
#   Close the LangGraph pools with close_eval. Exit with code 2 on a missing price or a bad file.`,
        test: "uv run pytest tests/architecture -k architecture02_s6",
      },
    ],
    verify: "uv run pytest tests/architecture -k architecture02",
  },
  recap: [
    "Routing sends each desk role to the cheapest model whose eval score clears a floor. It never touches the judge or `/ask`.",
    "`ROUTES` is a JSON object from role to model. `parse_routes` rejects a bad one at startup, and routing stays off until `ROUTING_ENABLED` is true.",
    "`cheapest_passing` picks by price among the models that pass. It raises when none passes, and it refuses to guess a price.",
    "A fallback to Claude fires on a 429, a 5xx, a timeout or a dropped connection, and on nothing else.",
    "`askpep cost-model` projects a month from trace rows. It assumes the success rate holds, so the eval gate comes first.",
    "A gateway pays off when several teams call the models. The third team calls AskPEP, so `routing.py` stays.",
    "AskPEP routed triage and kept the Claude fallback. The researcher route saved 14% and failed the gate, and neither route lifts R7.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In models and routing I learned that a role takes the cheapest model that passes its eval. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["architecture-q01", "architecture-q02"],
};

export default chapter;
