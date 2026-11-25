import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "llm-05-choosing-a-model",
  course: "llm",
  number: 5,
  title: "The cheapest model that clears your bar on your data wins",
  tagline: "Which model should Harbour's extract job use? Pick the cheapest one that clears the bar on Harbour's own invoices, and keep the top of the leaderboard as a shortlist.",
  minutes: 40,
  objectives: [
    "Say what a public leaderboard measures and why it can only shortlist candidates.",
    "Compare models on your own eval set across correctness, output validity, tool calling and groundedness, sliced by case type.",
    "Filter candidates on latency, context, throughput, privacy and deployment before you score quality.",
    "Compute cost per successful task and pick the cheapest model that clears your bar.",
    "Choose between a better prompt, a bigger model and fine-tuning from the failure pattern.",
    "Write a model decision record that a colleague can check and reopen.",
  ],
  sections: [
    {
      id: "s1-leaderboards",
      title: "Public leaderboards measure someone else's task, so they can only shortlist",
      goal: "What can a public leaderboard tell you about your workload?",
      blocks: [
        { kind: "p", text: "Chapter four left two blanks in Harbour's policy, the primary model and the fallback. This chapter fills them with evidence." },
        {
          kind: "p",
          text: "A leaderboard ranks models on tasks that someone else chose. The tasks might be exam questions, coding puzzles or chat preferences. None of them is a scanned invoice from a small supplier. A high rank says a model is strong in general. It says little about Harbour Supplies.",
        },
        {
          kind: "p",
          text: "Three things go wrong when you treat a ranking as a decision. First, the task mix differs. The score is an average over work you may never do. Second, the setup differs. Your prompt, your schema and your documents are not in the test.",
        },
        {
          kind: "p",
          text: "Third, the questions may be known. Public test sets can leak into training data, so a score can partly measure memory. Use a leaderboard for one job only. It helps you pick three or four candidates to test. After that, stop trusting it.",
        },
        { kind: "p", text: "One idea is needed before the widget. A slice, from course 4, is one kind of case in your data, such as scanned invoices. A model can win overall and lose on a slice." },
        {
          kind: "widget",
          id: "llm-benchmark-trap",
          intro: "A leaderboard ranks three fictional models. Beside it sit hidden results on three kinds of Harbour invoice. Predict which model wins on your data, then reveal the score for each kind. Afterwards, change the invoice mix and watch the winner move.",
        },
        {
          kind: "callout",
          tone: "insight",
          title: "An average hides the slice you care about",
          text: "Model Q loses on the clean slice and still wins overall, because scans and foreign currency are half of Harbour's volume. Always ask what mix of cases produced a score. A model can top every average and still fail your hardest group of documents.",
        },
        {
          kind: "quiz",
          id: "llm05-q1",
          question: "A model ranks first on a public leaderboard. What does that justify for your invoice pipeline?",
          options: [
            "Using it in production, because the ranking is independent.",
            "Adding it to the shortlist you test on your own eval set.",
            "Skipping your own tests, because the leaderboard covers extraction.",
            "Ruling out every model that ranks lower.",
          ],
          answer: 1,
          explain: "A ranking tells you who to test. It does not tell you who wins on your documents, your prompt and your mix of cases.",
        },
        { kind: "p", text: "A leaderboard gives you names to test. Your own eval set does the testing." },
      ],
    },
    {
      id: "s2-your-eval-set",
      title: "Your eval set decides, and you read it slice by slice",
      goal: "How do you compare candidates fairly on your own cases?",
      blocks: [
        {
          kind: "p",
          text: "Your own eval set is a golden set of real invoices with known correct answers. Course 4 taught how to build one. For model choice you only need it to be real, representative and tagged by case type. Run every candidate over the same cases with the same harness.",
        },
        {
          kind: "p",
          text: "Score four things. Which ones matter depends on the task, so drop any that do not apply.",
        },
        {
          kind: "list",
          items: [
            "Correctness: the share of fields or tasks the model gets right against the known answer.",
            "Structured-output validity: the share of responses that pass your schema and business rules with no repair.",
            "Tool-calling reliability: how often the model picks the right tool with the right arguments, which matters if the model drives an agent that processes payments. Course 2 taught the tool loop, so here you only score it.",
            "Groundedness: how often an answer stays inside the supplied text, which matters wherever retrieval feeds the model.",
          ],
        },
        {
          kind: "p",
          text: "Then split every score by slice. Slices for Harbour are clean digital, scanned, multi-currency and multi-page invoices. A model that wins on average can lose on the slice that costs you the most. Report the per-slice table.",
        },
        {
          kind: "p",
          text: "Be fair to each candidate. A prompt tuned for one model and pasted into another biases the test. Give every model the same modest tuning effort. Also repeat runs on a sample. If two models differ by less than the run-to-run noise, call it a tie and decide on cost.",
        },
        {
          kind: "p",
          text: "Here is the noise in numbers. Run Model X five times over the same 100 cases and the scores come out at 92, 94, 93, 96 and 95. The spread is four points. Model Y averages two points lower, which sits inside that spread. Treat the pair as a tie and choose on cost.",
        },
        {
          kind: "p",
          text: "The size of the eval set sets the same limit. Take a model that is right 90 times in 100. Its standard error is the square root of 0.9 times 0.1 divided by 100, which is 3 points.",
        },
        {
          kind: "p",
          text: "With 400 cases the error is 1.5 points. So 100 cases cannot separate models two points apart, and 400 can only begin to.",
        },
        {
          kind: "quiz",
          id: "llm05-q2",
          question: "Model X scores 95 percent overall. Model Y scores 93 percent overall but wins every scanned-invoice case. What should you do?",
          options: [
            "Pick X, because the overall score is higher.",
            "Pick Y, because scans always matter most.",
            "Weight the slices by your real traffic mix, then decide.",
            "Average the two scores and choose a third model.",
          ],
          answer: 2,
          explain: "Slice scores only become a decision once you weight them by how often each case type occurs in your traffic.",
        },
        { kind: "p", text: "Scoring is slow, so don't score a model you can't ship. The next section removes those first." },
      ],
    },
    {
      id: "s3-hard-constraints",
      title: "Latency, context limits and throughput are hard constraints, so filter before you score",
      goal: "Which limits remove a model before you score it?",
      blocks: [
        {
          kind: "p",
          text: "A constraint is pass or fail. Quality is a score. Apply the constraints first and rank only the survivors. If you do it the other way round, you fall for a model you cannot ship.",
        },
        {
          kind: "list",
          items: [
            "Latency. Harbour's portal answers while the supplier waits. Measure the tail latency, meaning the time the slowest one in twenty requests takes, at your real input size. The average hides the requests that time out. Course 5 taught latency budgets.",
            "Context. The window must hold the prompt, the examples, the invoice text and the output, with headroom. Chapter one has the mechanics.",
            "Throughput. Check the requests and tokens per minute your account allows. Suppliers send most invoices at month-end, so test against that peak and not the average day.",
          ],
        },
        {
          kind: "p",
          text: "Constraints can also move. A model that is too slow for the portal may be fine for an overnight batch job. Decide per path whether a limit is real, and note which constraint knocked each model out.",
        },
        {
          kind: "quiz",
          id: "llm05-q3",
          question: "The most accurate candidate has a tail latency of 7 seconds. Harbour's portal times out at 5 seconds. What do you do?",
          options: [
            "Average its latency over all requests and keep it if the mean is under 5 seconds.",
            "Filter it out for the portal, and consider it for the overnight batch.",
            "Raise the timeout to 8 seconds without asking.",
            "Score quality first, then ignore latency.",
          ],
          answer: 1,
          explain: "Tail latency is a hard limit on a synchronous path. The same model may still suit a batch path that has no timeout.",
        },
        { kind: "p", text: "Speed and size are one kind of limit. Rules about where data may go are the other, and they often cut harder." },
      ],
    },
    {
      id: "s4-privacy-and-deployment",
      title: "Privacy, residency and deployment rule models out early",
      goal: "How do data and hosting rules cut the candidate list?",
      blocks: [
        {
          kind: "p",
          text: "Ask these questions before you run a single test. A model you may not use is not a candidate. Where may invoice data go? In which region must it be processed and stored? Who operates the model, and what do the provider's terms say about retention?",
        },
        {
          kind: "p",
          text: "The answers pick one of three deployment shapes. Each puts cost and responsibility in a different place.",
        },
        // CHECKED 21 Oct 2026: https://docs.cloud.google.com/gemini-enterprise-agent-platform/release-notes
        {
          kind: "list",
          items: [
            "Hosted. You call the provider's own API. It is the fastest to start. Your data leaves your network under the provider's terms.",
            "Cloud-hosted inside your own project. The cloud you already use serves the model. Harbour runs on Google Cloud, so it calls Gemini on Vertex AI from its own project. The security team often asks for this shape first.",
            "Self-hosted open weights. You run an open-weight model on your own machines with a server such as vLLM or Ollama. Data never leaves, and you carry the operations.",
          ],
        },
        // CHECKED 9 Nov 2026: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/data-residency (UK endpoint europe-west2 lists Gemini 4 Argon and Gemini 3.5 Flash; eu excludes the UK; global gives no guarantee)
        {
          kind: "p",
          text: "With the cloud-hosted shape, the endpoint you call sets where processing happens. A global endpoint may process a request in any region, so it gives no residency guarantee. A regional or multi-region endpoint keeps processing inside that area. The `eu` area excludes the United Kingdom.",
        },
        {
          kind: "p",
          text: "Google's residency page lists the models for each country. On 9 November 2026, `europe-west2` in the UK listed Gemini 4 Argon and Gemini 3.5 Flash.",
        },
        {
          kind: "p",
          text: "Self-hosting has its own bill. You remove the per-token fee and add graphics hardware, patching, scaling and an on-call rota. Compare that total with the hosted price per successful task, which is the next section.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Read the terms for your tier",
          text: "Retention and training terms differ between providers and between plans. Never assume a consumer plan's terms apply to the API, or the reverse. Read the terms for the exact plan you will use, and write the answer next to the model in your decision record.",
        },
        {
          kind: "quiz",
          id: "llm05-q4",
          question: "Harbour's contract says invoice data must stay in the United Kingdom. How does that change your model comparison?",
          options: [
            "It changes nothing until you measure quality.",
            "It removes any model you cannot run in a compliant region before you test it.",
            "It only affects the price, not the shortlist.",
            "It means you must fine-tune your own model.",
          ],
          answer: 1,
          explain: "Residency is a hard constraint. Models or deployments that cannot meet it are out before quality is scored.",
        },
        { kind: "p", text: "After the constraints and the bar, more than one model may be left. The next section chooses between them on price." },
      ],
    },
    {
      id: "s5-cost-per-success",
      title: "Cost per successful task is the number that ranks the survivors",
      goal: "How do you rank the models that survive?",
      blocks: [
        {
          kind: "p",
          text: "Price per token is the sticker. What you pay is the cost of every attempt, including the ones that fail. A cheap model that fails often can cost more than a dearer model that rarely does.",
        },
        {
          kind: "p",
          text: "The definition fits in one line. **Cost per successful task** is the total spend on a workload divided by the number of tasks that ended correct. Course 5 owns retries, review time and the wider cost model.",
        },
        {
          kind: "p",
          text: "A worked example, with illustrative figures. Model A costs 0.5 pence a call and gets 88 in 100 right. Divide 0.5 by 0.88 and you pay about 0.57 pence per success. Model B costs 1.8 pence and gets 94 in 100 right. That is about 1.91 pence per success.",
        },
        {
          kind: "widget",
          id: "llm-model-scorecard",
          intro: "Three fictional models, with illustrative results on Harbour's invoice eval set. Set your quality bar, your tail latency limit and your longest input. The table filters out what fails and shows cost per success for the rest. Then lock in the model you would ship.",
        },
        {
          kind: "p",
          text: "Notice the order of work. You filtered on the hard limits, checked the quality bar, and only then compared cost. Cost never rescues a model that fails the bar. It only chooses among the ones that pass.",
        },
        {
          kind: "quiz",
          id: "llm05-q5",
          question: "Model X costs 3 pence a call and gets 50 in 100 right. Model Y costs 4 pence a call and gets 80 in 100 right. Which is cheaper per successful task?",
          options: [
            "X, at 3 pence per success.",
            "Y, at 5 pence per success against 6 for X.",
            "They cost the same.",
            "You cannot tell without token counts.",
          ],
          answer: 1,
          explain: "X costs 3 divided by 0.5, which is 6 pence per success. Y costs 4 divided by 0.8, which is 5 pence. The dearer call is the cheaper result.",
        },
        { kind: "p", text: "Sometimes no model clears the bar. Then you need to know which fix to try first." },
      ],
    },
    {
      id: "s6-three-fixes",
      title: "Prompting, a bigger model and fine-tuning are three different fixes",
      goal: "When quality falls short, which fix do you try first?",
      blocks: [
        {
          kind: "p",
          text: "When quality is below the bar, read the failures before you pick a fix. The pattern of errors tells you which lever to pull. Start with the cheapest and most reversible.",
        },
        {
          kind: "p",
          text: "Change the prompt when the model has the ability but misreads the task. The signs are wrong output format, an ignored rule, or field names that wander between runs. A prompt edit costs minutes and you can undo it. Chapter two covers prompt writing.",
        },
        {
          kind: "p",
          text: "Move to a bigger model when failures survive a clear prompt. The signs are hard reading cases, such as odd scanned layouts, or multi-step reasoning that small models drop. It costs more per call and runs slower, so recheck your constraints.",
        },
        // CHECKED 17 Oct 2026: https://developers.openai.com/api/docs/deprecations
        // CHECK: confirm which Gemini models support supervised tuning today https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/tuning/supervised-tuning
        {
          kind: "p",
          text: "Fine-tune when the task is stable, you have enough labelled examples, and you want consistent format or style at a lower cost per call. Check the provider first. Vertex AI offers supervised tuning for some Gemini models, so check the current list. OpenAI is closing fine-tuning to new users.",
        },
        {
          kind: "p",
          text: "Fine-tuning is a poor way to add facts. It also freezes behaviour, so a new base model means training again. Keep training cases out of your eval set, as course 4 explained. Chapter nine has the decision order, the data you need and the sums for tuning.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Quality is not good enough. What do you change?",
          text: "Answer first: you diagnose before you change anything. Read the failures by slice, then try the cheapest fix that matches the pattern. Prompt first. A bigger model if errors survive a clear prompt. Fine-tuning only for a stable task with enough labelled data. Re-run the eval after every step, and price each option per successful task.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "How do you choose between models for a task?",
          text: "Open with the order of operations. Shortlist from public benchmarks, filter on latency, context, throughput, privacy and deployment, then score the survivors on your own eval set by slice. Rank the ones that clear your bar by cost per successful task. Close with the fallback: record the decision, and re-run the comparison when a provider releases a new model.",
        },
        {
          kind: "quiz",
          id: "llm05-q6",
          question: "A model keeps returning dates as 'March 3rd' when your schema wants ISO dates. What is the first fix to try?",
          options: [
            "Fine-tune a new model on date formats.",
            "Switch to the largest available model.",
            "Tighten the prompt and the output contract, then re-run the eval.",
            "Lower the quality bar.",
          ],
          answer: 2,
          explain: "A format miss is a misread task. A clearer contract is the cheapest and most reversible fix, so try it before spending on a bigger model or training.",
        },
        { kind: "p", text: "Harbour's eval has run. The last section records what it found, and the answer is two models." },
      ],
    },
    {
      id: "s7-decision-record",
      title: "Harbour routes scans to Gemini 4 Argon and everything else to Gemini 3.5 Flash",
      goal: "What does a model decision look like when it is written down?",
      blocks: [
        { kind: "p", text: "The method follows this chapter's order. Apply the hard limits, score the survivors by slice on your own eval set, and price each slice with its failures included." },
        { kind: "p", text: "Region does most of the work. Harbour's contract keeps data in the UK, and two current Gemini models are listed for `europe-west2`, so both are the shortlist. Both meet the 5 second portal limit at real input size. Then Harbour runs its golden set of 400 documents." },
        { kind: "p", text: "With 400 cases the standard error is about 1.5 points, so one point is a tie. On every slice except scans, the two models are within one point. On scans the gap is 12 points, which is well outside the noise." },
        { kind: "p", text: "Price needs one more number. A document that ends in review costs a clerk's time, which Harbour puts at 150 pence. On scans, Flash costs 0.5 pence a call and fails 20 in 100, so 0.5 plus 30 is 30.5 pence. Argon costs 1.8 plus 12, which is 13.8 pence." },
        { kind: "p", text: "On text invoices the gap in failures is nothing, so the price decides. Flash costs 5 pence a document and Argon 6.3. So Harbour routes by slice. Each model is the other's fallback, which fills the two blanks in chapter four's policy." },
        { kind: "p", text: "One detail follows from the latency row. Argon's 3.1 seconds leaves no room for a retry inside the portal's 5, so a scan uploaded there skips the wait. The supplier sees that it's received, and the scan goes down the inbox route." },
        { kind: "code", lang: "text", caption: "Harbour's model decision record for the extract job. Scores, prices and latency are invented. Regions were read from Google's page on 9 November 2026.", code: "MODEL DECISION RECORD: extract job\nOwner: Harbour platform team    Status: accepted\n\nHARD LIMITS                       Flash            Argon\nUK region (europe-west2)          listed           listed\nPortal limit 5 s, tail latency    1.2 s  pass      3.1 s  pass\nLongest call 17,200 tokens        pass             pass\nMonth-end throughput              pass             pass\n\nQUALITY (golden-v12, 400 documents, pass after repair, standard error about 1.5)\nSLICE               SHARE   Flash   Argon   READING\nText, one currency   55%      97      97    tie\nMulti-currency       15%      95      96    tie\nMulti-page           10%      94      95    tie\nScans                20%      80      92    real gap\n\nPRICE\nCost per call                 0.5p     1.8p\nA document in review          150p (assumption, clerk time)\n\nCOST PER DOCUMENT             Flash    Argon\nText                          5.0p     6.3p\nScans                         30.5p    13.8p\n\nDECISION\ntext invoices   primary gemini-3.5-flash   fallback gemini-4-argon\nscans           primary gemini-4-argon     fallback gemini-3.5-flash\nscans on portal not waited for: shown as received, sent down the inbox route\n\nREOPEN WHEN\nGoogle publishes a new model for europe-west2\nA retirement date is within 90 days\n  gemini-3.5-flash: 19 May 2027 or later\n  gemini-4-argon: 13 October 2027 or later\nThe scan share changes by 10 points" },
        { kind: "p", text: "A cheap model isn't the answer, and neither is a good one. The answer depends on the slice, because a review costs about 80 times a scan call. The ties are recorded as ties, so nobody later claims Argon won them. The reopen conditions make this a record someone can act on." },
        { kind: "code", lang: "text", caption: "For your next customer: copy this and fill it in.", code: "MODEL DECISION RECORD: [job name]\nOwner:                Status:\n\nHARD LIMITS           (one row per limit, pass or fail per model)\nRegion:\nTail latency limit:\nLongest call:\nThroughput at peak:\n\nQUALITY\nEval set and size:    (and its standard error)\nSLICE   SHARE   [Model A]   [Model B]   READING (tie or real gap)\n\nPRICE\nCost per call:\nCost of one failure:  (say whose time, and mark it as an assumption)\n\nCOST PER DOCUMENT     (call cost + failure rate x failure cost)\n\nDECISION              (one primary and one fallback per route)\n\nREOPEN WHEN           (new model, retirement date, mix change)" },
        { kind: "p", text: "The record names two models. Chapter six makes sure those names mean the same thing next month." },
      ],
    },
  ],
  recap: [
    "A leaderboard shortlists candidates. Your own eval set, sliced by case type and weighted by your real traffic, decides.",
    "Score correctness, output validity, tool-calling reliability and groundedness, and drop the ones your task does not use.",
    "Apply latency, context, throughput, privacy and deployment limits as filters before you compare quality.",
    "Cost per successful task is spend divided by correct results. Rank only the models that clear your bar by that number.",
    "Fix a prompt misread with a prompt, a reasoning gap with a bigger model, and a stable high-volume task with fine-tuning.",
    "A decision record shows the limits, the slice scores with their noise, the price of failure and when to reopen it.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In choosing a model I learned to filter on hard constraints and test on my own sliced eval set. I rank by cost per successful task, never by leaderboard position. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["llm-q09", "llm-q10"],
};

export default chapter;
