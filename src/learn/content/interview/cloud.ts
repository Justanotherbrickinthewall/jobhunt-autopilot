import type { InterviewQuestion } from "../types";

// Revision 5 bank for course 7, AskPEP on GCP. Every question carries the id of the chapter that lists it.
// Retired ids are never reused. They asked about Azure products that the course no longer teaches:
// q03 and q04 (Azure Functions and Durable Functions, real Q47 and Q48), q05 and q06 (Azure AI Search and
// Foundry, real Q49 and Q52), q07 and q08 (Blob, Azure SQL, Cosmos DB and Redis, real Q50), and q19 and q20
// (SharePoint permissions and index freshness, real Q93 and Q94). The real questions stay in
// setup/real-interview-questions.md. Q09 asked about securing an Azure AI application (real Q51). It is not
// retired, because the topic is not Azure-only. It keeps its id, rewritten for GCP, and sits in cloud-08.
// Ids q21 to q24 came from llmops-q13 to llmops-q16, which the llmops swap parked for this course.
const questions: InterviewQuestion[] = [
  // real Q7
  // CHECK: cloud-q01 keeps the Azure wording of the asked question. That Function App settings reach the process as environment variables, and that a Key Vault reference resolves through a managed identity, were not re-read on a Microsoft page.
  {
    id: "cloud-q01",
    course: "cloud",
    category: "configuration",
    level: "core",
    chapterId: "cloud-09-the-other-clouds",
    source: "asked",
    question: "Locally your app reads a .env file, but in an Azure Function App the configuration comes from app settings. Does the code have to change?",
    idealAnswer:
      "Usually no, as long as the code reads environment variables. Locally, python-dotenv loads the .env file into the process environment. In an Azure Function App, application settings reach the process as environment variables. So both sources fill the same place, and the code only ever asks the environment. I keep the key names identical in both. I read them through one validated settings object, so a missing value fails at startup and not in the middle of a request. The .env file is never committed and never deployed. The same holds on GCP. In AskPEP, Terraform sets the environment of the Cloud Run service. A secret arrives as a Secret Manager reference that the service account askpep-run resolves, so the code still sees a plain variable. Locally, application default credentials stand in for that account. On Azure, a Key Vault reference and a managed identity do the same job. Only code that opens the .env file itself, or branches on an environment name, forces a change.",
    keywords: ["environment variables", "python-dotenv", "application settings", "same key names", "fail fast", "Key Vault reference", "Secret Manager reference", "managed identity", "application default credentials"],
    followUps: [
      "What happens if a setting is missing in production?",
      "Where would you put a database password for this app?",
      "How does DefaultAzureCredential behave locally compared with Azure?",
      "How does a secret reach a Cloud Run service?",
    ],
  },
  // real Q8
  {
    id: "cloud-q02",
    course: "cloud",
    category: "configuration",
    level: "core",
    chapterId: "cloud-04-cloud-sql-and-secrets",
    source: "practice",
    question: "How do you manage settings for local, staging and production?",
    idealAnswer:
      "I use the same keys in every environment, and only the values differ. The code reads them in one place, through a typed settings class, and validates them at startup. A missing or malformed value stops the process, so the failure shows up during deployment and not at three in the morning. I keep environment branches out of business logic, because an if production line makes production run a path that nobody tested. Values live in the platform. Locally that is a git-ignored .env file. On Cloud Run, Terraform sets the environment variables, so the folder is the record and a console edit is undone at the next apply. Secrets live in Secret Manager and arrive as references. Each service account can read only the secrets it needs. Every change goes through a pull request and a plan that someone reads. Staging copies production in shape, in its own project, so a settings mistake shows there first.",
    keywords: ["same keys", "environment-specific values", "validated at startup", "no environment branches", "Terraform", "Secret Manager", "per-secret access", "pull request", "separate projects"],
    followUps: [
      "How does a running service pick up a new secret value?",
      "How do you stop staging pointing at a production database?",
      "What goes in a plain variable and what goes in Secret Manager?",
    ],
  },
  // real Q51
  // was cloud-q09, which asked the Azure form of this question. This is the GCP rewrite under the same id.
  {
    id: "cloud-q09",
    course: "cloud",
    category: "security",
    level: "deep",
    chapterId: "cloud-08-operate",
    source: "practice",
    question: "How would you secure and monitor an AI application on Google Cloud?",
    idealAnswer:
      "I secure it in layers, and I watch it in layers. Each workload runs as its own service account. The service has one and the deploy pipeline has another, and each holds only the roles it needs. Secrets live in Secret Manager, and a grant sits on one secret and not on the project. For people, I put Identity-Aware Proxy in front, with a named list and no public invoker. The service still checks the signed header. For monitoring, the service writes one structured log line for each request, so Cloud Logging holds the evidence. A new revision takes traffic in steps, and a judge compares its requests with the SLOs before it takes all of it. A budget alert catches spend, and a monthly review ties the bill to requests. A kill switch stops the service with no deploy. Logs are a second copy of the data, so I keep personal data out of them.",
    keywords: ["service account per workload", "per-secret grant", "Secret Manager", "Identity-Aware Proxy", "signed header", "structured log line", "SLOs", "budget alert", "kill switch"],
    followUps: [
      "Why is a grant on the project worse than a grant on one secret?",
      "What does a budget alert not tell you?",
      "What do you never write to a log?",
    ],
  },
  {
    id: "cloud-q10",
    course: "cloud",
    category: "security",
    level: "senior",
    chapterId: "cloud-04-cloud-sql-and-secrets",
    question: "A key for a model provider leaked. What do you do now, and what do you change?",
    idealAnswer:
      "I act in two moves, and I keep the service up. First I contain it. I issue a new key at the provider and add it to Secret Manager as a new secret version. I start a new revision, because Cloud Run instances read a secret when they start. When the new revision serves traffic, I revoke the old key at the provider and disable the old version. If the key is being abused right now, I revoke first and accept a short outage. Then I investigate. I check the provider's usage and our logs for calls I don't recognise. I work out how it leaked, such as a public repository or a log line. I tell the client's security contact what I found. Afterwards I change the design. Keys live in Secret Manager as references. Only the accounts that need a secret can read it, with the grant on that secret and not on the project. I add secret scanning to the repository. A value that Terraform writes stays in the state file, so the state bucket stays private.",
    keywords: ["new key first", "secret version", "new revision", "revoke old key", "usage logs", "notify the client", "references", "per-secret grant", "secret scanning", "state file"],
    followUps: [
      "How do you rotate without downtime?",
      "How would you detect misuse of a key?",
      "Why is rotation alone not a fix?",
    ],
  },
  // real Q6
  // CHECK: cloud-q11 says AWS has closed App Runner to new customers and recommends ECS Express Mode, and that ECS injects a secret when a task starts and never refreshes it. Both come from AWS pages read on 22 October 2026 for cloud-09. Reread them before you quote either.
  {
    id: "cloud-q11",
    course: "cloud",
    category: "aws",
    level: "deep",
    chapterId: "cloud-09-the-other-clouds",
    source: "asked",
    question: "Have you recently worked with AWS?",
    idealAnswer:
      "I answer truthfully, and I separate what I have run from what I have mapped. First I name the AWS services I have used hands-on, what for and roughly when. If that list is short, I say so. My deployed work on this kind of system is on Google Cloud, so I say that too. Then I say what I know by mapping. For the container service I would use ECS Express Mode, because AWS has closed App Runner to new customers. Secrets Manager replaces Secret Manager. An IAM OIDC identity provider and a role trust policy replace Workload Identity Federation. SQS with a worker that pulls replaces Cloud Tasks, because the push model does not port. I say where I expect differences, such as how secret values refresh. Finally I say how I would prove the map. I would read the current documentation and quotas, build it in a sandbox account, and write down what I find. I never claim ownership that I did not have. An overclaim fails within two follow-up questions.",
    keywords: ["hands-on versus mapped", "name only services used", "ECS Express Mode", "Secrets Manager", "IAM OIDC provider", "SQS worker", "validate in a sandbox", "no overclaiming"],
    followUps: [
      "Which AWS service have you used most, and what went wrong with it?",
      "What would you check first on an ECS Express Mode service?",
      "How is IAM on AWS different from IAM on GCP?",
    ],
  },
  // CHECK: cloud-q12 repeats the Azure and AWS claims of cloud-09: Service Bus and SQS hold messages until something pulls them, Easy Auth lets any tenant user ask for a token by default, and an AWS load balancer passes x-amzn-oidc-data. Those pages were read on 22 October 2026 and not since.
  {
    id: "cloud-q12",
    course: "cloud",
    category: "aws",
    level: "senior",
    chapterId: "cloud-09-the-other-clouds",
    question: "A client runs on Azure or AWS. Which parts of your GCP design change, and which only change name?",
    idealAnswer:
      "Most of it only changes name, and three pieces need real work. The renames are the project, the workload identity, the keyless deploy and the Terraform state. The image registry, the budget, the container service, the job runner, the secrets and the Postgres service rename too. The design holds on every cloud. That means a private database, no stored keys, immutable revisions and traffic moved in steps. The three pieces are the queue, the user gate and the kill switch. Cloud Tasks pushes an HTTP request. Service Bus and SQS hold messages until something pulls them, so I rebuild the retries. IAP checks a named person. Azure's built-in sign-in lets any user in the tenant ask for a token by default, so I restrict the app first. The kill switch is a patch to Cloud Run, and I would test the matching command on their cloud before I need it. I also say which claims I have only mapped and which I have run.",
    keywords: ["rename", "private database", "keyless deploy", "queue", "user gate", "kill switch", "push versus pull", "tenant default", "mapped not run"],
    followUps: [
      "Which of the three would you build first on the client's cloud?",
      "How do you keep the code portable?",
      "What would you refuse to promise before a sandbox test?",
    ],
  },
  // real Q87
  {
    id: "cloud-q13",
    course: "cloud",
    category: "containers",
    level: "core",
    chapterId: "cloud-03-container-and-cloud-run",
    source: "practice",
    question: "How would you containerise and deploy an LLM API on Google Cloud, and when would you choose Cloud Run over GKE Autopilot?",
    idealAnswer:
      "I would build a slim Python image that installs dependencies before copying the source, so rebuilds stay fast. The container listens on the port Cloud Run gives it and answers a health route. I deploy it as a Cloud Run service under its own service account. That account holds roles on each service the API calls, so no key file exists. Concurrency sets the instance count. If one instance copes with 20 open streams and the peak is 90, I need five instances. I set the maximum as a cost cap. Each release is a revision, so a rollback is a traffic change. I keep one instance warm for interactive screens and let batch work scale to zero. I choose GKE Autopilot in two cases. The client's platform is Kubernetes and a rule says every workload runs there, or the work needs a Kubernetes feature that Cloud Run lacks. Otherwise Autopilot means I write and run manifests. Run-to-the-end work stays on a Cloud Run job.",
    keywords: ["slim image", "health route", "service account", "concurrency", "maximum instances", "revisions", "scale to zero", "GKE Autopilot", "named need"],
    followUps: [
      "What happens to the first request after the service has scaled to zero?",
      "How would you host an open-weight model on GPUs?",
      "What would make you move off Cloud Run?",
      "How do you roll back a bad release?",
    ],
  },
  // real Q88
  {
    id: "cloud-q14",
    course: "cloud",
    category: "infrastructure as code",
    level: "senior",
    chapterId: "cloud-02-terraform",
    source: "practice",
    question: "How do you manage a client's GCP infrastructure with Terraform, and where does the state live?",
    idealAnswer:
      "I use whatever the client already runs. If they have Terraform pipelines, modules and reviewers, I write Terraform. Either way I want a plan before every apply. I run it in the pipeline, so reviewers read the diff, and I look for destroys and for any field that forces a replacement. State is the part that needs care. It maps code to real resources, so it lives in a remote backend. On GCP that is a Cloud Storage bucket with versioning, uniform access and public access prevention, and the backend locks it during an apply. State can hold secret values in plain text. So I limit who can read the bucket, and I never commit the state. In AskPEP the plan account can read the state bucket and nothing else, and a person applies. If someone built resources by hand, I write each one as code and import it. Then I read the plan until it shows nothing to destroy, and the code owns the resource.",
    keywords: ["client standard", "plan before apply", "destroys", "remote state", "locking", "secrets in state", "private bucket", "import", "read-only plan account"],
    followUps: [
      "How would you detect drift between the code and the cloud?",
      "How do you import resources someone created by hand?",
      "What would make you refuse to apply a plan?",
    ],
  },
  // real Q89
  {
    id: "cloud-q15",
    course: "cloud",
    category: "delivery",
    level: "core",
    chapterId: "cloud-06-delivery-pipeline",
    source: "practice",
    question: "How do you deploy to Google Cloud from GitHub Actions without storing a secret?",
    idealAnswer:
      "I use Workload Identity Federation, so no key file exists. The job asks GitHub for a signed OpenID Connect token. In Google Cloud I make a workload identity pool, here named github, with a provider, here askpep-repo. The provider trusts GitHub's issuer, and its condition names one repository. Without that condition, a token from any repository would pass. Google trades the token for a short-lived credential, and the job acts as a service account, here askpep-deploy. That account trusts two exact subjects. One is the main branch. The other is the production environment, which is the form a deploy job presents. The risk is a subject that is too broad. The environment subject names no branch, so I limit the production environment to main and add a required reviewer. The account holds narrow roles only. The fallback, if the client blocks federation, is a key in a vault with a rotation alert, and I say plainly that it is weaker.",
    keywords: ["workload identity federation", "OpenID Connect token", "pool and provider", "repository condition", "subject", "short-lived credential", "environment branch rule", "required reviewer", "narrow roles"],
    followUps: [
      "What happens if the subject is set to the main branch only?",
      "Why does the deploy job present the environment and not the branch?",
      "Where do the pool and provider names live, and are they secret?",
    ],
  },
  // real Q90
  {
    id: "cloud-q16",
    course: "cloud",
    category: "delivery",
    level: "senior",
    chapterId: "cloud-07-rollouts",
    source: "practice",
    question: "A bad release is live. How do you roll back on Cloud Run, and what exactly do you roll back?",
    idealAnswer:
      "I shift traffic back to the previous revision first, and I investigate second. On Cloud Run the old revision still exists, so a rollback is one traffic patch. The canary goes to 0 percent and the stable revision to 100. Nothing is rebuilt. The canary keeps its tag, so I can open its URL and see what went wrong. In AskPEP the rollout job does this itself when a gate fails. Then I say what a release contains. The image carries the code and the prompt. The model name and region are settings on the revision. The eval set lives in the repository. A revision freezes the first two together, so going back restores both. Two traps remain. A migration must leave the old code working, so I add a column and never rename one in a single release. Tasks already in the queue may carry the new format. Afterwards I add the failing case to the golden set, so the eval gate catches it next time. The fallback is the kill switch.",
    keywords: ["traffic shift", "previous revision", "one patch", "tagged canary", "prompt in the image", "model setting", "backward compatible migration", "queued tasks", "golden set regression"],
    followUps: [
      "What if the bad release included a database migration?",
      "How do you decide between a rollback and a forward fix?",
      "How does this change when the model, not the code, caused the failure?",
    ],
  },
  // real Q91
  {
    id: "cloud-q17",
    course: "cloud",
    category: "ai-services",
    level: "core",
    chapterId: "cloud-05-vertex-quotas-regions-residency",
    source: "practice",
    question: "Your Vertex AI calls return 429 errors at month end. Where is the limit, and what do you change?",
    idealAnswer:
      "I start by finding which limit binds. On Vertex AI, quotas apply to the project, per model and per region, as rates per minute. I open the quotas page and read the unit of each row, requests or tokens. Then I compare it with demand. I answer a 429 in layers. The client retries with full jitter, honours a server wait hint and caps its attempts. AskPEP sets three retries, so the longest wait with no hint is 7 seconds, which fits the 60 second desk budget. Next I cap the calls in flight. Eight slots on each of three instances is 24 calls in flight. At 6 seconds a call, that is 240 calls a minute, and I size the slots to stay under the quota. A fallback model answers when Gemini returns a 429. Last I file a quota request days ahead, and I consider Provisioned Throughput at high volume. A pinned region has less headroom than the global endpoint, and I say so.",
    keywords: ["binding limit", "quotas page", "tokens or requests", "full jitter", "server wait hint", "calls in flight", "fallback model", "quota request", "Provisioned Throughput", "global endpoint"],
    followUps: [
      "Why does the retry wrapper sit outside the fallback model?",
      "How do you size the slots against a quota?",
      "What changes if the client forbids processing outside Frankfurt?",
      "How would you see the 429 rate before users complain?",
    ],
  },
  // real Q92
  {
    id: "cloud-q18",
    course: "cloud",
    category: "compliance",
    level: "senior",
    chapterId: "cloud-05-vertex-quotas-regions-residency",
    source: "practice",
    question: "A client says the data must stay in the EU. What do you configure on Google Cloud?",
    idealAnswer:
      "I split the clause into three questions, because clients treat them as one. Where is a prompt processed? That follows the model location. The eu multi-region keeps processing inside the EU. The europe-west3 region is Frankfurt, and Germany is a different clause, so I ask which one they mean. Where does data rest? That is the database region, and the secrets. Two AskPEP secrets use replication in the service region. Four older ones keep automatic replication, so moving them is a cutover to new secrets with copied values. Which hops leave? The judge, Voyage and tracing do. LangSmith sends traces to a US endpoint by default, and an EU endpoint exists. I run check_residency with the contract's list of places. It reads settings only, so it cannot see a hop that no setting names. Pinning a region also costs a model generation and brings more 429 errors. I get the clause confirmed in writing.",
    keywords: ["three questions", "model location", "eu multi-region", "Frankfurt versus EU", "database region", "secret replication", "hops that leave", "check_residency", "confirm in writing"],
    followUps: [
      "Does pinning a region change your 429 plan?",
      "What can check_residency not see?",
      "How do you move secrets that keep automatic replication?",
      "A client says Germany, not the EU. What changes?",
    ],
  },
  // was llmops-q13
  // real Q79
  {
    id: "cloud-q21",
    course: "cloud",
    category: "capacity",
    level: "deep",
    chapterId: "cloud-05-vertex-quotas-regions-residency",
    source: "practice",
    question: "Traffic doubles at month-end and your LLM feature starts returning 429 errors. How do you design for it?",
    idealAnswer:
      "I would start by finding which limit binds, because the fix depends on it. Tokens per minute usually bind before requests per minute. Say the limit is 120,000 tokens a minute and a request averages 4,000. That is 30 requests a minute, against a month-end demand of 48. Then I handle the 429 itself. Clients honour the server's wait hint, add jitter and cap their retries. Behind that I put a bounded queue. The bound is capacity times the wait a caller accepts, so 0.5 requests a second and 40 seconds gives 20. I rank the work, with desk questions first, ingest second and backfill last. When the queue is full, admission control drops the lowest rank, so backfill takes the loss and retries later. For more headroom I add spillover to a second model, with the same quality gate. Finally I load test with logged request sizes and a stopping rule, so I know the capacity before month end does.",
    keywords: ["binding limit", "tokens per minute", "wait hint", "jitter", "bounded queue", "admission control", "priority classes", "load shedding", "spillover", "load test"],
    followUps: [
      "How do you size the queue bound?",
      "What happens to the work you shed?",
      "How would you know the 429s were your own retries making things worse?",
    ],
  },
  // was llmops-q14
  // real Q80
  // CHECK: cloud-q22 names Provisioned Throughput on Vertex AI. The name comes from the navigation of the quotas page only, as in cloud-05. Every price and rate in the answer is illustrative, and none was read on a Google page.
  {
    id: "cloud-q22",
    course: "cloud",
    category: "capacity",
    level: "senior",
    chapterId: "cloud-05-vertex-quotas-regions-residency",
    source: "practice",
    question: "When would you choose provisioned throughput or self-hosting over pay as you go?",
    idealAnswer:
      "Only when the arithmetic or a hard requirement says so. Provisioned capacity bills every hour, so it wins when steady load passes a break-even. Take illustrative prices. A block at 30 dollars an hour bills 720 dollars a day and carries 2,400 requests an hour. At 3 cents a request, pay as you go costs the same for 24,000 requests, which is 10 full hours of the block. Below that, pay as you go wins. If my load fills the block for 4.8 hours, I stay on pay as you go. I would size a block for the steady level and spill the peak to pay as you go. I buy a block for latency only when a route needs a hard p95. Self-hosting is the same idea with the operations on me. I size GPUs by memory first, parameters times bytes, then by throughput from my own load test. I count on-call, upgrades, idle GPUs overnight and a golden set rerun for every model change. Data residency is more often the real reason than price.",
    keywords: ["break-even hours", "Provisioned Throughput", "pay as you go", "spillover", "idle hours", "GPU memory", "golden set", "data residency", "hard p95"],
    followUps: [
      "Your load is 9.6 full-capacity hours a day. What do you do?",
      "How do you size GPUs for a 70 billion parameter model?",
      "What would make you refuse to self-host?",
    ],
  },
  // was llmops-q15
  // real Q81
  {
    id: "cloud-q23",
    course: "cloud",
    category: "rollout",
    level: "core",
    chapterId: "cloud-07-rollouts",
    source: "practice",
    question: "How would you roll out a prompt or model change safely?",
    idealAnswer:
      "I would treat it as a rollout and not a plain deploy. First, the prompt and the model name are versioned. A prompt ships inside the image, and the model is a setting in Terraform, so a revision carries both. Second, the candidate runs on the golden set in the eval gate before the migration, and a failed gate leaves no revision. Third, the revision deploys with a tag and no traffic, so I can test it on the real database. Fourth, a canary takes 10 percent, then 50, then 100. The gates are written before it starts, and a judge's pass rate sits beside the SLOs. A failed gate shifts traffic back, and the kill switch works without a deploy. A shadow run is the extra step this course does not build. Users keep the old answer while I compare offline. At 10 percent of 8,000 requests a day and 3.6 cents a call, that costs $28.80 a day. I would add it for a risky model change.",
    keywords: ["versioned prompt", "model setting", "eval gate", "tagged revision", "canary", "traffic steps", "pass rate", "kill switch", "shadow traffic", "rollback"],
    followUps: [
      "What does shadow traffic cost, and what can it not tell you?",
      "How do you stop a shadowed candidate from writing to production systems?",
      "How long would you keep a canary running?",
    ],
  },
  // was llmops-q16
  // real Q82
  {
    id: "cloud-q24",
    course: "cloud",
    category: "rollout",
    level: "senior",
    chapterId: "cloud-07-rollouts",
    source: "practice",
    question: "What gates would you put on a canary, and when do you roll back automatically?",
    idealAnswer:
      "I split gates into hard and soft, and I write them before the canary starts. Hard gates are fast signals against an objective, such as success rate and latency. In AskPEP each unmet SLO rolls the canary back. The soft gate is a judge's pass rate, which needs volume. AskPEP rolls back when it falls below 0.8 over at least 5 judged answers. Both sit behind a floor. Fewer than 20 finished requests means wait, because three requests prove nothing. With 20 requests, one failure still meets a 0.95 target and two do not, so I know how coarse that is. The main trap is noise. At 94 percent success, 400 requests give a standard error near 1.2 points, so a gate at one point trips on luck. The steps are 10, 50 and 100 percent, with a soak at each. Six waits without a promotion roll back, and so does a judge that errors. If the sample is too small to decide, I hold and gather more.",
    keywords: ["hard gates", "soft gates", "SLOs", "judge pass rate", "floor of 20 requests", "standard error", "soak", "automatic rollback", "timeout"],
    followUps: [
      "How many requests do you need to see a 2 point drop?",
      "Which gate would you never automate, and why?",
      "A canary passes every gate, but a user complains. What do you do?",
    ],
  },
  {
    id: "cloud-q25",
    course: "cloud",
    category: "security",
    level: "core",
    chapterId: "cloud-01-project-and-identity",
    question: "How would you set up access for an AI service on Google Cloud?",
    idealAnswer:
      "I give each workload its own service account, and I grant predefined roles at the narrowest resource that works. AskPEP has seven accounts. The API, the ingest job, the task queue caller, the pipeline and the canary judge each have one. Separate accounts keep a leak small, because a leak reaches only what that workload could already do. I never use a primitive role such as Editor. A secret accessor role goes on each secret and not on the project, so a secret made later is not covered. I keep the allowed roles for each account in a file. A CI audit reads the project's policy. It fails on a primitive role, a public member such as allUsers, an unknown account, or a role outside the file. One caveat is that Google makes some accounts, such as the Google APIs service agent, which holds Editor by default. I note those and leave them alone.",
    keywords: ["service account per workload", "predefined roles", "narrowest resource", "no primitive roles", "per-secret grant", "allow list file", "CI audit", "public member"],
    followUps: [
      "Why not one shared account for everything?",
      "Where would a project-wide grant still be right?",
      "How would you catch a new grant added in the console?",
    ],
  },
  {
    id: "cloud-q26",
    course: "cloud",
    category: "security",
    level: "deep",
    chapterId: "cloud-01-project-and-identity",
    question: "Why would you refuse a CI pipeline a service account key, and what do you use instead?",
    idealAnswer:
      "A key works from anywhere until someone deletes it. It sits in a repository secret, in logs and on laptops, and a leak is a standing problem. So I give the pipeline a federated identity instead. The job asks GitHub for a signed token, and Google trades it for a short-lived credential. A leaked token has expired by the time anyone finds it. The risk moves to the trust rules, so I audit them. The provider must name GitHub as its issuer. It must carry a condition that pins one repository, and the condition must not use an or. Without a condition, a token from any repository passes the provider. The mapping must carry the repository attribute. Then each account's binding must name the repository's principal set or one exact subject. A wide binding on a powerful account lets any workflow use it. If a client insists on a key, I keep it in a vault with a rotation alert, and I say plainly that it is weaker.",
    keywords: ["standing credential", "federated token", "short-lived credential", "issuer", "repository condition", "attribute mapping", "principal set", "exact subject", "audit"],
    followUps: [
      "What are the faults a provider audit should catch?",
      "Where does the account's trust for the repository live?",
      "How would you answer a client who says a key is simpler?",
    ],
  },
  {
    id: "cloud-q27",
    course: "cloud",
    category: "infrastructure as code",
    level: "deep",
    chapterId: "cloud-02-terraform",
    question: "A client built everything in the console. How do you bring it under Terraform without an outage?",
    idealAnswer:
      "I import before I change anything. For each resource, I write the code to match what exists, and I import it into state. Then I read the plan until it shows nothing to destroy. Updates in place are normal on a first pass. A replacement is a stop sign. I look for any field that forces one, such as a name or a region, because a replaced database is an outage. The state lives in a remote bucket with versioning and locking, readable by few people, because it can hold secret values. I bring the project in slowly. Identity and the registry come first, then the network and the database. I never apply a plan that nobody read. In the pipeline I use a read-only plan account, so a person applies. Once the plan is quiet, I stop the console being the way to change things. An urgent console change still shows up in the next plan, and I write it into the code.",
    keywords: ["import first", "plan reads nothing to destroy", "replacement hazard", "remote state", "locking", "secrets in state", "small steps", "read-only plan account"],
    followUps: [
      "Which field would make you stop and ask?",
      "What do you do when the plan wants to change an imported resource?",
      "How do you stop people changing things in the console afterwards?",
    ],
  },
  {
    id: "cloud-q28",
    course: "cloud",
    category: "infrastructure as code",
    level: "senior",
    chapterId: "cloud-02-terraform",
    question: "Why does the deploy account have two single-subject bindings and no repository-wide one?",
    idealAnswer:
      "Because two kinds of job present different subjects. A job on a branch with no environment presents the branch, such as main. A job that declares an environment presents the environment and no branch. In AskPEP the build job runs on main with no environment, so it needs the main branch binding. The deploy and rollout jobs declare the production environment, so they need the production binding. A repository-wide binding would be simpler. It would also let any workflow, on any branch or pull request, act as the deploy account. So I bind two exact identities. The second one has a catch. It names no branch, so a job on any branch can ask for the production environment. The environment itself must refuse. I limit its deployment branches to main, and I add a required reviewer. The eval and plan accounts can use the wide form, because their roles cannot change anything.",
    keywords: ["branch subject", "environment subject", "single identity", "repository-wide binding", "environment branch rule", "required reviewer", "blast radius"],
    followUps: [
      "What does a job on a feature branch present when it names production?",
      "Why can the eval account use the wide form?",
      "What else could an attacker reach through a wide deploy binding?",
    ],
  },
  {
    id: "cloud-q29",
    course: "cloud",
    category: "containers",
    level: "deep",
    chapterId: "cloud-03-container-and-cloud-run",
    question: "How do you size a streaming API on Cloud Run?",
    idealAnswer:
      "I start with the open streams, which are the arrival rate times the seconds a stream stays open. Say 3 requests a second, each open for 12 seconds. That is 36 streams at once. I divide by the concurrency of one instance, which is how many requests it serves together. At 20, that rounds up to two instances. AskPEP sets a concurrency of 20 and a maximum of 3, so it holds 60 streams. Past that, requests wait and then fail, so the maximum is both a cost cap and a ceiling. A stream mostly waits on the model, so I check the p95 latency before I raise the concurrency. I also keep the request timeout above the app's own budget. The desk gets 60 seconds and the timeout is 300. The app then ends a run itself and gives the reason, instead of Cloud Run cutting it off in the middle of an answer.",
    keywords: ["open streams", "arrival rate times duration", "concurrency", "maximum instances", "Little's law", "p95 latency", "request timeout", "app budget"],
    followUps: [
      "What happens when every instance is full?",
      "Why not set the concurrency to 80?",
      "What does a stream cost while it waits on the model?",
    ],
  },
  // CHECK: cloud-q30 says Cloud Run answers 403 to a caller that lacks the invoker role before the container sees the request, and that a missing enqueuer or act-as grant fails the enqueue. Both come from cloud-03 and its CHECK 17, and no Google page was read for this bank.
  {
    id: "cloud-q30",
    course: "cloud",
    category: "containers",
    level: "deep",
    chapterId: "cloud-03-container-and-cloud-run",
    question: "A task callback never runs and the caller got a 202. What do you check?",
    idealAnswer:
      "I check the invoker grant first. The queue calls the service with a signed token from its own service account. That account needs the invoker role on the service. Without it, Cloud Run answers 403 before the request reaches my container, so the app logs show nothing. That silence is the clue. A 202 only means the API enqueued the task. Two other grants fail loudly instead. If the API's account lacks the enqueuer role on the queue, the enqueue fails. It fails too without the right to act as the queue's account. The caller then gets a 502. After the invoker role, I check the token audience, which must match the service URL. Then I read the queue. It dispatches 5 tasks at once. A task retries three times with a backoff from 10 to 300 seconds, so a failing task can look quiet for minutes.",
    keywords: ["invoker role", "403 before the container", "silent logs", "enqueuer role", "act-as grant", "token audience", "queue retries", "202 means enqueued"],
    followUps: [
      "Why do the app logs show nothing?",
      "Which missing grant gives the caller a 502?",
      "How would you test the callback without the queue?",
    ],
  },
  {
    id: "cloud-q31",
    course: "cloud",
    category: "networking",
    level: "deep",
    chapterId: "cloud-04-cloud-sql-and-secrets",
    question: "How does a Cloud Run service reach a database that has no public address?",
    idealAnswer:
      "It takes four stops, and the first missing one is where it breaks. First, a subnet for Direct VPC egress, so the service has a path into the network. Second, a peering connection through private services access, so the network can reach Google's database network. Third, a private IP on the database instance. Fourth, a connection URL that uses the private address. Calls to other services, such as Gemini, still leave by the usual route, because the setting sends only private ranges through the network. Terraform must build the peering before the instance, or the instance will not create. The design has one hazard, which is ordering. Removing the public address cuts off any service that has no subnet, such as an older revision. So I apply in passes, and I run the migrations job last. I also ask for SSL on the connection, even on a private path.",
    keywords: ["Direct VPC egress", "subnet", "private services access", "peering", "private IP", "connection URL", "private ranges only", "apply order"],
    followUps: [
      "What breaks if the peering is missing?",
      "Why does the order of the Terraform passes matter?",
      "How would you reach the database from your laptop?",
    ],
  },
  {
    id: "cloud-q32",
    course: "cloud",
    category: "delivery",
    level: "senior",
    chapterId: "cloud-06-delivery-pipeline",
    question: "Your eval gate passes, but production runs a different model from the one the gate graded. How did that happen, and how do you stop it?",
    idealAnswer:
      "The gate's settings are copies of the production settings, and copies drift. The gate job sets DESK_MODEL and VERTEX_LOCATION itself, because the code's defaults name a different model in a different place. Production gets the same two values from vertex_env in Terraform. Someone changes one file and not the other, and the gate grades a model that production never serves. A green tick then proves nothing. To stop it, I keep a test that reads both files and fails when the model or the region differ. AskPEP has that test. I also say what the gate still does not copy. The vertex_env block holds the retry limits and the Model Armor template, and the gate runs without them. A fuller fix is one source of truth that both files read. The canary then confirms the live pair, because the gate only samples a fixed dataset.",
    keywords: ["copies drift", "DESK_MODEL", "VERTEX_LOCATION", "vertex_env", "comparison test", "retry limits", "Model Armor template", "one source of truth"],
    followUps: [
      "Why does the region matter as much as the model?",
      "Which setting would you copy into the gate next?",
      "What does the canary catch that the gate cannot?",
    ],
  },
  {
    id: "cloud-q33",
    course: "cloud",
    category: "delivery",
    level: "deep",
    chapterId: "cloud-06-delivery-pipeline",
    question: "Where does the eval gate sit in a deploy pipeline, and what happens if it can be skipped?",
    idealAnswer:
      "It sits after the tests and before the migration. That position matters because a failed gate then leaves nothing behind. The deploy job waits for both the build and the gate, and the migration is the first thing the deploy job does. A red gate means no migration and no new revision. The build runs beside the gate, so an unused image may sit in the registry, which is harmless. The harder question is what happens if the gate can be skipped. GitHub counts a skipped step as a success. If the gate job had an if that skips when a secret is missing, a missing secret would give a green tick and prove nothing. So the gate job has no if at all, and a missing secret fails the run. The older CI file has a second trap. Its live gate would run twice after a merge, so one clause skips it once the deploy workflow exists. I also admit the limit. The gate samples a fixed dataset, so the canary confirms it.",
    keywords: ["before the migration", "needs build and gate", "no revision on failure", "skipped counts as success", "no if on the gate", "missing secret fails", "fixed dataset", "canary confirms"],
    followUps: [
      "Why does the build run beside the gate and not after it?",
      "How would you stop the live gate running twice?",
      "What would you do if the gate were flaky?",
    ],
  },
  {
    id: "cloud-q34",
    course: "cloud",
    category: "operations",
    level: "deep",
    chapterId: "cloud-08-operate",
    question: "The model bill is climbing at 3am. How do you stop it, and what undoes your stop?",
    idealAnswer:
      "I flip the kill switch. It needs no build and no deploy. I pick the scope by the harm. The actions scope disables the side effects, such as opening tickets, and answers keep flowing. The all scope answers 503 on every route except the health check, so it stops the model calls. At 3am the harm is the model bill, so I pick all. Two traps follow. The service reads the switch when the process starts, so the patch makes a new revision. After a rollout pinned traffic to named revisions, a plain patch would leave that revision with no traffic. So my patch also sends all traffic to the latest revision, and it runs the image that was serving, so a canary's image never goes live. That ends a canary, and I read the split afterwards. The second trap is Terraform. The next apply puts the old value back, so I set the same value in Terraform too. A budget only emails and never stops spend. Then I find the cause, and I roll back if a release did it.",
    keywords: ["kill switch", "no deploy", "actions scope", "all scope", "new revision", "traffic split", "Terraform puts it back", "budget alerts only"],
    followUps: [
      "When would you choose the actions scope over all?",
      "How do you check the switch took effect?",
      "Why does a budget not stop the spend?",
    ],
  },
  // CHECK: cloud-q35 says IAP on Cloud Run sends X-Goog-IAP-JWT-Assertion, with the issuer https://cloud.google.com/iap. Both were read on Google's signed headers page on 22 October 2026. The launch stage of IAP on Cloud Run is unconfirmed, as in cloud-08.
  {
    id: "cloud-q35",
    course: "cloud",
    category: "security",
    level: "deep",
    chapterId: "cloud-08-operate",
    question: "How would you put an internal web UI behind a company sign-in?",
    idealAnswer:
      "I turn on Identity-Aware Proxy for the service. I give the role that lets people through, roles/iap.httpsResourceAccessor, to named people and groups, and I remove the public invoker. IAP then checks a Google sign-in before a request reaches the container. The cost is that scripts and API key clients can no longer sign in. They need another path, so I ask who uses them first. In AskPEP that includes the MCP route. Next I keep verifying in the service. IAP passes a signed header with the request. The service checks its signature, its audience and its issuer. Without that check, a request that reaches the container another way carries no proof of who sent it. The health route and the queue callback skip the check, because neither carries a person. I also test with someone who is not on the list, because that is the case that matters.",
    keywords: ["Identity-Aware Proxy", "named people and groups", "no public invoker", "scripts cannot sign in", "signed header", "audience", "issuer", "test an outsider"],
    followUps: [
      "Who loses access when you turn IAP on?",
      "What does the service still have to verify?",
      "How would you let a script call the API?",
    ],
  },
  {
    id: "cloud-q36",
    course: "cloud",
    category: "operations",
    level: "core",
    chapterId: "cloud-08-operate",
    question: "How do you know your backups work?",
    idealAnswer:
      "I restore one and read rows from it. A backup that nobody has restored is a hope. On Cloud SQL, a point in time recovery always makes a new instance. I find the latest recovery time, clone the instance to that time, and query a table in the clone. The drill proves three things. The restore completes, the data is there, and I know how long it took. It cannot prove that the application works against the new instance. A real restore also gives the clone a new address, and it does not copy the backups. So a real restore ends with a change to the connection secret, and a new revision to read it. I write those steps into a runbook. I schedule the drill and repeat it, so the time I quote is a measured one.",
    keywords: ["restore drill", "read rows", "point in time recovery", "new instance", "restore time", "connection secret", "runbook", "scheduled drill"],
    followUps: [
      "What does the drill not prove?",
      "What changes in the application after a real restore?",
      "How often would you run the drill?",
    ],
  },
  // CHECK: cloud-q37 repeats the sign-in claims of cloud-09: Easy Auth lets any user in the tenant ask for a token by default, and an AWS load balancer passes the x-amzn-oidc-data header on HTTPS listeners. Both were read on 22 October 2026 and not since.
  {
    id: "cloud-q37",
    course: "cloud",
    category: "security",
    level: "senior",
    chapterId: "cloud-09-the-other-clouds",
    question: "How do you stop a managed sign-in from letting in someone you did not intend?",
    idealAnswer:
      "I decide who may reach the app before I switch the sign-in on, and I test with someone outside the list. The default boundary differs by cloud. On GCP, IAP checks a Google identity, and the course Terraform refuses public members and asks for named people or groups. On Azure, the built-in sign-in is Easy Auth. By default any user in the client's tenant can ask for a token, unless I restrict the app to the people the client names. On AWS, the load balancer can authenticate with OpenID Connect or Cognito, on HTTPS listeners only. The app must verify the signature of the x-amzn-oidc-data header. A request that reaches the container another way carries nothing. So on every cloud the app verifies what the gate passes on, and a missing header is a refusal. I say which of these I have run and which I have only read.",
    keywords: ["default trust boundary", "named members", "tenant default", "Easy Auth", "load balancer authentication", "verify the header", "refuse a missing header", "test an outsider"],
    followUps: [
      "Why is the Azure default wider than the GCP one?",
      "What does a request look like when it skips the load balancer?",
      "Who decides who should reach the app?",
    ],
  },
  {
    id: "cloud-q38",
    course: "cloud",
    category: "deployment",
    level: "senior",
    chapterId: "cloud-10-launch-decision",
    question: "How do you decide that an AI system is ready to launch, and what do you do about what you still can't measure?",
    idealAnswer:
      "I decide against written conditions, and each condition needs dated evidence from a real record. The person who set a condition reads that evidence. I don't ask the room for an opinion. Some things can't be measured before real traffic arrives, such as a new team's actual load. I list those by name and give each one a date. Then I write the stop rules before launch, because nobody agrees on a line during an incident. Each stop rule has one threshold, one action and one owner. For example, any attack that passes the guards turns off actions, and the security reviewer owns that rule. Accepted risks get an owner and a review date too. After the first real week, I set each design number beside the measured one and explain every gap. If two errors cancel out, I say that, because they may not cancel next month.",
    keywords: ["written conditions", "dated evidence", "stop rules", "one owner", "accepted risk", "review date", "first real week", "design against measured"],
    followUps: [
      "Who should own a stop rule, and why only one person?",
      "What would make you delay a launch with every condition closed?",
      "How do you tell a good first week from a lucky one?",
    ],
  },
  {
    id: "cloud-q39",
    course: "cloud",
    category: "deployment",
    level: "senior",
    chapterId: "cloud-10-launch-decision",
    question: "What do you leave behind when you hand a deployed AI system over to the team that will run it?",
    idealAnswer:
      "I leave a named owner, a drilled runbook and one page that says what is settled and what is open. The page has five parts. It says what is settled, what must still ship and what must still be measured. It says what can't change without a decision record, and who is waiting. Everything open carries an owner and a date. I also make sure the owner has run the kill switch and a restore themselves, because a runbook nobody has followed is only a guess. I hand over the eval gate as part of the service, so the next change has to pass it. I'm honest about what I did not prove. If a result came from test traffic, the page says so. I know the hand-over worked when the owner can run the service with nobody from the build in the room.",
    keywords: ["named owner", "drilled runbook", "settled and open", "decision record", "eval gate", "not proved", "owner runs the drill"],
    followUps: [
      "What do you do when the owner has never run a restore?",
      "How long should you stay available after a hand-over?",
      "Which decision records would you insist on keeping?",
    ],
  },
];

export default questions;
