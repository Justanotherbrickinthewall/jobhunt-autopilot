import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "llm-06-versioning-and-config",
  course: "llm",
  number: 6,
  title: "A prompt edit is a deploy, so every run records its versions",
  tagline: "Why did the same invoice give a different answer on Tuesday? You can only answer that if each run recorded what produced it.",
  minutes: 40,
  objectives: [
    "Name the six things that change model behaviour and say how each one is versioned.",
    "Pin model snapshots instead of moving aliases, and plan for deprecation.",
    "Design a run manifest that makes a bad answer reproducible, and use it to find an overnight change.",
    "Ship prompts through the same review and release pipeline as code.",
    "Decide when a prompt registry earns its place beside files in git.",
    "Write a versions file and a manifest that can replay any one answer.",
  ],
  sections: [
    {
      id: "s1-six-things",
      title: "Six things change behaviour, and all of them need versions",
      goal: "Which inputs can change an answer without any code changing?",
      blocks: [
        { kind: "p", text: "Chapter five chose two models, and earlier chapters fixed a prompt, a schema and a policy. This chapter keeps those choices from changing without anyone knowing." },
        {
          kind: "p",
          text: "Code is not the only thing that decides what Harbour's invoice pipeline does. Six other inputs do. If any of them changes without a record, you cannot explain why an answer changed. Version all six.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "The prompt: instructions, examples and the output contract.",
            "The model id: which model, and which snapshot of it.",
            "The sampling settings: temperature, top-p and the output limit.",
            "The tool schemas: names, descriptions and argument shapes.",
            "The retrieval config: chunking, embedding model, index contents and top-k.",
            "The eval dataset: the golden cases you score changes against.",
          ],
        },
        {
          kind: "p",
          text: "Most of these are text files, so git already versions them. The model id is a string you must pin on purpose. The retrieval index is data, so it needs a version label of its own. The eval dataset needs one so a score always names the cases behind it.",
        },
        {
          kind: "p",
          text: "Course 4 taught dataset versioning. Here the rule is simpler. Every run should be able to say which version of each of the six it used.",
        },
        {
          kind: "quiz",
          id: "llm06-q1",
          question: "A teammate changes the chunk size and the top-k setting for supplier lookups. Which of the six inputs changed?",
          options: [
            "The prompt.",
            "The retrieval config.",
            "The sampling settings.",
            "The eval dataset.",
          ],
          answer: 1,
          explain: "Chunk size and top-k belong to the retrieval config. They change what the model sees, even though no prompt text moved.",
        },
        { kind: "p", text: "Five of the six are your own files. The model id isn't, because the provider decides what stands behind the name." },
      ],
    },
    {
      id: "s2-pin-snapshots",
      title: "Pin a model snapshot, because an alias can move under you",
      goal: "How can a model change under you, and how do you stay in control?",
      blocks: [
        {
          kind: "p",
          text: "A **model alias** is a friendly name that points at the newest snapshot of a model. The provider changes the pointer when a new snapshot ships. Your code did not change, yet the model behind the name did. That is a **silent upgrade**.",
        },
        {
          kind: "p",
          text: "A **snapshot** is a fixed version of a model. Anthropic's model ids from the 4.6 generation on are dateless, and each one is already a pinned snapshot. Other providers still offer moving names, so check which you have.",
        },
        {
          kind: "p",
          text: "Pin the snapshot in config. Then the model changes only when you change the config, and that change goes through review and your eval set.",
        },
        // CHECKED 9 Nov 2026: https://platform.claude.com/docs/en/about-claude/models/overview
        // CHECKED 17 Oct 2026: https://platform.claude.com/docs/en/about-claude/model-deprecations
        {
          kind: "p",
          text: "Pinning has a price. Providers retire old snapshots on a published schedule. A pinned model works until its retirement date and then stops. Put the dates in your calendar, and treat each retirement as a planned migration with its own eval run.",
        },
        {
          kind: "p",
          text: "Pinning does not freeze everything. The provider can still change things around a snapshot, such as safety filters, serving infrastructure or default limits. Pinning removes the largest source of surprise. Some surprises remain, and the next paragraph shows how to catch them.",
        },
        {
          kind: "p",
          text: "A **canary eval** catches that drift. Run a small fixed set of golden cases, say 30, against production on a schedule, such as every night. If the pass rate falls from 29 of 30 to 25, something moved even though you deployed nothing. Alert on the drop. Course 5 taught how to set up that loop.",
        },
        {
          kind: "quiz",
          id: "llm06-q2",
          question: "Your config names a model alias. Answers shift on Monday and nobody deployed. What is the most likely cause?",
          options: [
            "The prompt file was edited by hand in production.",
            "The provider moved the alias to a newer snapshot.",
            "The temperature setting drifted by itself.",
            "The golden set was updated.",
          ],
          answer: 1,
          explain: "An alias is a pointer the provider controls. When it changes, you get a different model with no change on your side.",
        },
        { kind: "p", text: "Pinning limits the changes you get. The next section makes sure you can tell which one happened." },
      ],
    },
    {
      id: "s3-run-manifest",
      title: "Record a run manifest with every request, so any bad answer is reproducible",
      goal: "What should a manifest hold, and how does it find an overnight change?",
      blocks: [
        {
          kind: "p",
          text: "A **run manifest** is a small record written with every request. It lists the exact version of everything that could change the answer. With it, you can replay last Tuesday's bad answer as a bug.",
        },
        {
          kind: "code",
          lang: "json",
          caption: "A run manifest for one Harbour Supplies extraction. Names and values are illustrative.",
          code: "{\n  \"request_id\": \"req-001\",\n  \"input_ref\": \"sha256:ab12... in invoices/2026/10/\",\n  \"prompt\": \"prompts/extract_invoice.md@commit-7c1e\",\n  \"model_requested\": \"model-a-latest\",\n  \"model_returned\": \"model-a-snapshot-1\",\n  \"sampling\": { \"temperature\": 0, \"top_p\": 1, \"max_output_tokens\": 4000 },\n  \"tool_schemas\": \"tools/v3\",\n  \"retrieval\": { \"index\": \"suppliers-2026-10-03\", \"top_k\": 4 },\n  \"eval_set\": \"golden-v12\"\n}",
        },
        {
          kind: "p",
          text: "Two details matter. Store a reference to the input, such as a hash and a storage key, not the invoice text. Course 3 covered privacy handling. Also record the model the provider returned as well as the one you asked for. The returned name is the only proof of which snapshot answered.",
        },
        {
          kind: "p",
          text: "One question comes up often in interviews. Answers changed overnight and nobody deployed. Five things can do that, and the manifest tells them apart.",
        },
        {
          kind: "list",
          items: [
            "A moving alias resolved to a new snapshot. The returned model name differs from last week.",
            "The provider changed something around a pinned snapshot. The model name matches but outputs differ, so compare replays on a fixed set of inputs.",
            "The retrieval index was re-ingested. The index version label differs.",
            "Upstream data changed, such as the **supplier master**, Harbour's one record per supplier, or a supplier's invoice layout. The input reference or the looked-up record differs.",
            "Config drifted, such as a hand-edited setting. The sampling block or the prompt commit differs from the last good run.",
          ],
        },
        {
          kind: "p",
          text: "The method is the same each time. Take a good run and a bad run, diff their manifests, and follow the first field that differs. If the manifests match, replay both on the same input and look for provider-side change.",
        },
        {
          kind: "widget",
          id: "llm-run-manifest",
          intro: "Last Tuesday a Harbour invoice was posted with a due date 30 days early. Tick the fields your manifest records, then predict whether you can reproduce the answer. Replay the run to find out, and see which field exposes the cause.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Answers changed overnight and nobody deployed. What happened?",
          text: "Open by saying something outside your code changed. Name the suspects: a moving model alias, a provider-side change, a re-ingested index, changed upstream data or config drift. Then diff the manifest of a good run against a bad one and follow the first differing field. Close with the control: pin snapshots and alert when the returned model name changes.",
        },
        {
          kind: "quiz",
          id: "llm06-q3",
          question: "A manifest records the model name you requested but not the one the provider returned. Why is that a gap?",
          options: [
            "The requested name is never useful.",
            "An alias can resolve to a different snapshot, so the requested name cannot show a silent upgrade.",
            "The returned name is only used for billing.",
            "Providers return the same name every time.",
          ],
          answer: 1,
          explain: "Both names are worth keeping, but only the returned one shows which snapshot answered. Without it a moved alias is invisible.",
        },
        { kind: "p", text: "The manifest explains changes after the fact. The next section stops the bad ones before they ship." },
      ],
    },
    {
      id: "s4-prompts-ship-like-code",
      title: "Prompts live in the repo and ship through the same pipeline as code",
      goal: "How should a prompt edit reach production?",
      blocks: [
        {
          kind: "p",
          text: "Keep prompts as files in the repository, next to the code that uses them. A change then arrives as a pull request. A reviewer reads the diff. The golden set runs in the pipeline. The merge is a recorded release that you can roll back.",
        },
        {
          kind: "p",
          text: "Ship risky edits behind a feature flag. Send a small share of traffic to the new prompt, compare it with the old one, and widen the share only when the numbers hold. Rolling back then means switching a flag with no redeploy.",
        },
        {
          kind: "p",
          text: "Do not trust your eye on a small edit. A one-word change can alter behaviour for a whole class of cases. Course 4 taught the thresholds that block a release and how cohorts are compared.",
        },
        {
          kind: "widget",
          id: "llm-harmless-edit",
          intro: "A teammate swaps one word in the extraction prompt, from null to empty. Eight golden cases passed before the edit. Tick the cases you think will now fail, then run the golden set and compare your prediction with what happened.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "How do you manage prompt, model and configuration versions?",
          text: "Answer first: everything that changes behaviour lives in version control or carries a version label, and every run records it. Cover the six inputs, pinned snapshots, prompts in the repo behind review and a golden-set gate, and a manifest on every request. Name the trade-off, which is migration work when snapshots retire. The fallback is flipping a flag back.",
        },
        {
          kind: "quiz",
          id: "llm06-q4",
          question: "You change one word in a prompt and the diff looks harmless. What should happen before it ships?",
          options: [
            "Merge it, because small diffs are low risk.",
            "Run the golden set in the pipeline and review the result like any other change.",
            "Ask the provider whether the word is safe.",
            "Wait for a user complaint.",
          ],
          answer: 1,
          explain: "Diff size does not predict behaviour change. Only the golden set shows which cases moved, and it runs in seconds.",
        },
        { kind: "p", text: "Files in git work well while engineers edit the prompts. The next section looks at what changes when others want to." },
      ],
    },
    {
      id: "s5-alternatives",
      title: "Prompt registries help teams edit and review, but git files stay the default",
      goal: "What does a hosted prompt registry add, and when is it worth it?",
      blocks: [
        {
          kind: "p",
          text: "The default is plain files in git. You get review, history, blame and rollback with tools the team already runs. Several products offer a hosted prompt registry instead. They suit teams where people outside engineering edit prompts. None of them makes a prompt correct.",
        },
        // CHECKED 17 Oct 2026: https://langfuse.com/docs/prompt-management/overview
        {
          kind: "compare",
          caption: "Prompt versioning options. Product features change often, so check current documentation before you commit.",
          columns: ["Tool", "Best at", "When you switch to it", "What it costs you"],
          rows: [
            ["Git files, the default", "Review, diffs, tests in the pipeline and one release process with the code", "You stay here until non-engineers must edit prompts or you want prompt history linked to traces", "Editing needs a developer, and a prompt change needs a code release"],
            ["LangSmith Prompt Hub", "Versioned prompts that sit beside the same vendor's tracing and evals", "Your team already uses LangSmith and product staff want to iterate on prompts", "Another system holds production behaviour, and you depend on the vendor's platform"],
            ["Langfuse prompt management", "Versioned prompts with labels, linked to traces, with an option to host it yourself", "You want edits outside releases and prompt history tied to traces, with data on your side", "A runtime fetch dependency, and operations work if you host it"],
            ["PromptLayer", "A registry that non-engineers can edit, with version history and request logging", "A mixed team needs a shared editor and an audit trail of changes", "A hosted vendor dependency and a second place to look for what ran"],
          ],
        },
        {
          kind: "p",
          text: "Whichever you choose, the six-input rule still holds. A registry versions the prompt. It leaves out your model snapshot, your sampling settings or your index. Your run manifest must still record the prompt version the registry served. Course 5 covered tracing products.",
        },
        {
          kind: "p",
          text: "A registry adds a runtime dependency. If it is down, your requests can fail unless you cache the last good prompt. It can also move a change past your release gate. Edits made in a web page must still pass the golden set before they go live.",
        },
        {
          kind: "quiz",
          id: "llm06-q5",
          question: "A product manager wants to tweak extraction prompts without a code release. What is the sound response?",
          options: [
            "Give them write access to production prompts with no checks.",
            "Adopt a registry if needed, but keep the golden set gate and record the served prompt version in the manifest.",
            "Refuse, because registries cannot version prompts.",
            "Put the prompt into the model's training data.",
          ],
          answer: 1,
          explain: "A registry solves who can edit. It does not solve whether the edit is safe. Keep the gate and the manifest record whatever tool serves the prompt.",
        },
        { kind: "p", text: "Harbour stays with git. The last section shows its versions file and one real manifest." },
      ],
    },
    {
      id: "s6-versions-file",
      title: "Harbour's versions file pins all six inputs, and each manifest proves which ones ran",
      goal: "What does a complete version record look like for one job?",
      blocks: [
        { kind: "p", text: "The method is to give each of the six inputs one line in one file, then copy those lines into a manifest on every request." },
        { kind: "p", text: "Harbour's extract job has a prompt commit and two model ids from chapter five. Sampling is fixed, with the output limit of 4,000 from chapter one. Tool schemas carry a version label, and so does the supplier index. The eval set is `golden-v12`." },
        { kind: "p", text: "Each request then writes a manifest. It holds the versions, the slice, the path and the result. When a scan came back wrong on a Tuesday, Harbour compared that manifest with Monday's. Every version matched, and the replay matched too. The first differing field was `supplier_record`, because the supplier master had changed." },
        { kind: "code", lang: "yaml", caption: "Harbour's versions file for the extract job, and one manifest it produced. Worked example.", code: "# config/versions/extract.yaml\nprompt: prompts/extract_invoice.md@commit-7c1e\nmodels:\n  text:  {primary: gemini-3.5-flash, fallback: gemini-4-argon}\n  scans: {primary: gemini-4-argon, fallback: gemini-3.5-flash}\n  location: europe-west2\nsampling: {temperature: 0, top_p: 1, max_output_tokens: 4000}\ntools: tools/v3\nretrieval: {index: suppliers-2026-10-03, top_k: 4}\neval_set: golden-v12\npolicies: {validation: config/extract_policy.yaml@commit-7c1e,\n           errors: config/extract_errors.yaml@commit-7c1e}\nretirement_dates:   # from Google's model versions page, 9 November 2026\n  gemini-3.5-flash: 19 May 2027 or later\n  gemini-4-argon: 13 October 2027 or later\n\n# ---------- one run manifest, written with the request ----------\n{\n  \"request_id\": \"req-58213\",\n  \"input_ref\": \"sha256:9f3c... in invoices/2026/11/\",\n  \"slice\": \"scan\",\n  \"route\": \"inbox\",\n  \"prompt\": \"prompts/extract_invoice.md@commit-7c1e\",\n  \"path\": \"primary\",\n  \"model_requested\": \"gemini-4-argon\",\n  \"model_returned\": \"gemini-4-argon\",\n  \"location\": \"europe-west2\",\n  \"sampling\": {\"temperature\": 0, \"top_p\": 1, \"max_output_tokens\": 4000},\n  \"tool_schemas\": \"tools/v3\",\n  \"retrieval\": {\"index\": \"suppliers-2026-10-03\", \"top_k\": 4},\n  \"supplier_record\": \"S-114@2026-11-02\",\n  \"eval_set\": \"golden-v12\",\n  \"attempts\": 1,\n  \"status\": \"ok\",\n  \"tokens\": {\"input\": 6000, \"cached\": 4200, \"output\": 600}\n}" },
        { kind: "p", text: "The file is short, because it only holds names. The manifest copies them per request, so a replay needs nothing else. `supplier_record` was added after the Tuesday incident, because upstream data can change with every version identical. The retirement dates sit beside the ids, so a migration can be planned." },
        { kind: "code", lang: "text", caption: "For your next customer: copy this and fill it in.", code: "# config/versions/[job].yaml\nprompt:              (path and commit)\nmodels:              (primary and fallback per route, and location)\nsampling:\ntools:               (version label)\nretrieval:           (index label and top_k, or none)\neval_set:            (version label)\npolicies:            (paths and commits)\nretirement_dates:    (from the provider's page, with the date you read it)\n\n# one run manifest\nrequest_id:\ninput_ref:           (a hash and storage key, never the text)\nprompt:\npath:\nmodel_requested:\nmodel_returned:\nsampling:\ntool_schemas:\nretrieval:\nupstream_records:    (each looked-up record, with its version)\neval_set:\nattempts:\nstatus:\ntokens:              (input, cached, output)" },
        { kind: "p", text: "The manifest mentions a tool, images and tokens that the course hasn't yet explained in full. Chapter seven takes those parts of the API in turn." },
      ],
    },
  ],
  recap: [
    "Prompt, model id, sampling settings, tool schemas, retrieval config and eval dataset all change behaviour, so each one carries a version.",
    "Pin a model snapshot, not an alias, and treat each retirement date as a planned migration with an eval run.",
    "Write a run manifest with every request, including the model name the provider returned, so a bad answer can be replayed.",
    "To find an overnight change, diff the manifest of a good run against a bad one and follow the first differing field.",
    "Prompts live in the repository and pass the golden set before release. A registry helps editing, not correctness.",
    "One versions file pins the six inputs, and each manifest copies them with the path, the upstream records and the result.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In versioning prompts, models and config I learned that a prompt edit is a deploy. Every run should record the exact versions behind it. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["llm-q11", "llm-q12"],
};

export default chapter;
