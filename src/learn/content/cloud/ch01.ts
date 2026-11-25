import type { Chapter } from "../types";

// This chapter has a lab: four audit functions in src/askpep/identity.py, tested offline on JSON fixtures.
// Nothing here creates a billable resource. The two things the learner makes by hand, a notification channel
// and a budget, are free. The course 7 code has never run against a live project, and terraform was not
// installed when it was built, so this chapter claims no live result. Sample output says it is sample output.
// CHECK: product, role and command names come from the course 7 code, FACTS.md and the earlier chapters.
// Re-read the console and gcloud names against current Google pages before relying on them. Last compared on 22 October 2026.

const chapter: Chapter = {
  id: "cloud-01-project-and-identity",
  course: "cloud",
  number: 1,
  title: "Give each workload its own service account with the least role it needs",
  tagline: "The third team's date won't hold, so count the work and start with who may do what.",
  minutes: 100,
  objectives: [
    "Say why the third team's date fails and why identity comes first.",
    "Pull the course 7 files and install Terraform.",
    "Read a project's APIs and accounts without changing them.",
    "Name the seven AskPEP service accounts and the roles each may hold.",
    "Name the four pieces of the GitHub trust.",
    "Explain why the deploy account has a narrower trust than the other two.",
    "Build a budget with four rules and a notification channel.",
    "Run the four audits against real `gcloud` output.",
    "Say what the chapter cost and how to remove it.",
    "Write a gap list that sets a date with its condition.",
  ],
  sections: [
    {
      id: "s1-production",
      title: "The third team can't join on 18 December, and identity comes first",
      goal: "Why does the 18 December date fail, and why is identity the first job?",
      blocks: [
        {
          kind: "p",
          text: "AskPEP gets from one pilot to the approved deployment by rebuilding every piece in files. That work starts with who may do what. It is Monday 14 December 2026, and the design was approved on Friday. The review said the third team could join on 18 December at the earliest.",
        },
        {
          kind: "p",
          text: "That date won't hold. Three of the four conditions are open, but the larger reason is simpler. The deployment the design describes doesn't exist yet. The pilot is one hand-built Cloud Run service, it has no queue and it has no release pipeline.",
        },
        {
          kind: "p",
          text: "So you count the work today and tell the third team's lead today. By the end of this course, every piece sits in a file and one command rebuilds it. A release passes the eval gate before any user sees it, and a bad release rolls back.",
        },
        {
          kind: "p",
          text: "This is the last course on AskPEP. It ends when the third team is live and the four measurements the review left open have real numbers. Every date after 11 December, every figure, every role and every price in this story is invented.",
        },
        {
          kind: "p",
          text: "The commands in this course are real, and the lab's tests run offline. No Terraform in this course has been applied to a live project, and the course says so wherever it matters.",
        },
        {
          kind: "p",
          text: "**Terraform** is a tool that creates cloud resources from text files that describe them. Chapter 2 teaches it. The table shows what each chapter of the course adds.",
        },
        {
          kind: "compare",
          caption: "Course 7, chapter by chapter. This chapter is the first row.",
          columns: ["Chapter", "What it adds"],
          rows: [
            ["Chapter 1", "Service accounts, access rules and a billing budget."],
            ["Chapter 2", "The setup in Terraform, with a plan in CI."],
            ["Chapter 3", "The container, Cloud Run settings for streaming and an ingest job."],
            ["Chapter 4", "Cloud SQL on a private network, and secrets by reference."],
            ["Chapter 5", "Model quotas, regions and data residency."],
            ["Chapter 6", "A delivery pipeline that runs the eval gate before any deploy."],
            ["Chapter 7", "Releases that reach a few users first, and rollback."],
            ["Chapter 8", "Budget alerts, a switch that turns the service off, a sign-in gate and backups."],
            ["Chapter 9", "The same design on Azure and AWS."],
            ["Chapter 10", "The launch review, the third team joining and the last hand-over."],
          ],
        },
        {
          kind: "p",
          text: "You made a first deployment by hand in chapter 14 of course 1. You turned on APIs, made a registry and a database, stored four secrets and ran the service on Cloud Run. You also made two service accounts, `askpep-run` and `askpep-job`. A first deployment can be loose. Production can't.",
        },
        {
          kind: "p",
          text: "This chapter settles one question first. Who may do what in this project? A **project** is the Google Cloud container for your resources, your billing link and your access rules. An **API** is a Google Cloud feature that stays off in a project until you switch it on.",
        },
        {
          kind: "p",
          text: "The chapter has five jobs.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Set up the tools and the starter files.",
            "Look at your project and what is already in it.",
            "Give each workload its own service account, and write an audit that checks the roles.",
            "Let GitHub deploy without a stored key, with a trust that is narrow, and add a budget that warns you early.",
            "Write down the gap between the pilot and the design, and set a date you can keep.",
          ],
        },
        {
          kind: "callout",
          tone: "insight",
          title: "Identity comes first because everything later runs as an account",
          text: "A service, a job, a pipeline and a queue each act as an account. If the accounts come last, they get broad roles to make things work, and nobody narrows them. Decide the accounts and their roles first, and every later chapter has a rule to check against.",
        },
        {
          kind: "p",
          text: "The reason is clear and the first job is named. What must be on your machine before any of it can run?",
        },
      ],
    },
    {
      id: "s2-setup",
      title: "Course 7 setup pulls the starter files and needs two tools",
      goal: "What do you need on your machine before course 7 can start?",
      blocks: [
        {
          kind: "p",
          text: "You build on your AskPEP repo once more. Work from its root, and do the five setup steps in order. None of them costs money.",
        },
        {
          kind: "step",
          id: "cloud01-s01",
          title: "Pull the course 7 starter files",
          text: "Run `pull-course.sh` from the root of your repo, with the course name `cloud`. It copies the starter files and never overwrites a file. Commit the result before you write anything.",
          lang: "bash",
          code: `my-learn/labs/askpep/template/scripts/pull-course.sh cloud
git add -A
git commit -m "Add the course 7 starter files"`,
          expect:
            "One added line for each new file, then a count such as 43 added, 0 kept. A kept file is one you already had. The script prints no uv add line, because course 7 adds no Python package.",
        },
        {
          kind: "p",
          text: "The pull added four things.",
        },
        {
          kind: "list",
          items: [
            "`infra/terraform/` holds sixteen `.tf` files, a script `bootstrap.sh`, an example settings file and a `.gitignore`. Terraform reads the `.tf` files. You write them across the course, and chapter 2 starts.",
            "`.github/workflows/` holds three workflow files, `terraform.yml`, `deploy.yml` and `rollout.yml`. Later chapters write them.",
            "`src/askpep/` gains eight modules: `identity.py`, `quota.py`, `residency.py`, `runapi.py`, `rollout.py`, `killswitch.py`, `iap.py` and `review.py`. This chapter writes `identity.py`.",
            "`tests/cloud/` holds the course's tests, a file `STEPS.md` that lists every lab step, and a test plugin.",
          ],
        },
        {
          kind: "step",
          id: "cloud01-s02",
          title: "Sync the environment",
          text: "Run `uv sync` once, so that the environment matches the lock file. Course 7 adds no package, so nothing new installs.",
          lang: "bash",
          code: `uv sync`,
          expect: "uv exits without an error. It installs nothing new.",
        },
        {
          kind: "step",
          id: "cloud01-s03",
          title: "See the starting point",
          text: "Run the course's tests before you write anything. Every test fails, and each failure names the lab step that fixes it, such as `cloud-01 step 1`. The failures are your to-do list. No test needs Postgres, a network or a cloud account.",
          lang: "bash",
          code: `uv run pytest tests/cloud -q`,
          expect: "A summary line that reads 680 failed. Each failure names a step, such as cloud-01 step 1. No test passes and none is skipped.",
        },
        {
          kind: "p",
          text: "Two programs do the work in this course. You installed the `gcloud` command in chapter 14 of course 1. Terraform is the second. The file `versions.tf` in chapter 2 asks for version 1.9 or later.",
        },
        // CHECK: the HashiCorp Homebrew tap, the formula name hashicorp/tap/terraform and the claim that the core
        // Homebrew formula stays on an old release. FACTS.md names no Terraform version. Read the current install page
        // on developer.hashicorp.com, and use its steps if you are not on macOS.
        {
          kind: "step",
          id: "cloud01-s04",
          title: "Install Terraform and check both tools",
          text: "Install Terraform from HashiCorp's Homebrew tap, because the core Homebrew formula is frozen at an old release. Then print both versions. On another system, use the steps on HashiCorp's install page.",
          lang: "bash",
          code: `brew tap hashicorp/tap
brew install hashicorp/tap/terraform
terraform version
gcloud version`,
          expect: "A line that starts Terraform v, followed by 1.9 or a later number. Then a list of Google Cloud SDK components with their versions.",
        },
        {
          kind: "step",
          id: "cloud01-s05",
          title: "Name your project and your repository",
          text: "Set three variables and point `gcloud` at your project. The tests read `GOOGLE_CLOUD_PROJECT` and `ASKPEP_GITHUB_REPO`. Use the project from chapter 14 of course 1, and the GitHub repository that holds AskPEP. A new terminal needs the exports again.",
          lang: "bash",
          code: `export PROJECT_ID=your-project-id
export GOOGLE_CLOUD_PROJECT=$PROJECT_ID
export ASKPEP_GITHUB_REPO=your-github-name/askpep
gcloud config set project $PROJECT_ID`,
          expect: "Updated property [core/project].",
        },
        {
          kind: "p",
          text: "The tools are ready. What is actually in the project you are about to change?",
        },
      ],
    },
    {
      id: "s3-project",
      title: "A project holds the resources, the billing link and the access rules",
      goal: "What does the project hold today, and how do you read it without changing anything?",
      blocks: [
        {
          kind: "p",
          text: "Your project holds three things that matter here. Its **resources** are the registry, the database, the secrets and the service. Its **billing account** is the payment method it spends against. Its **access rules** say who may do what to the resources.",
        },
        {
          kind: "p",
          text: "A project has three names. The **project id**, such as `askpep-123456`, is what you type in commands. The project name is a label for people. The **project number** is a long integer that Google puts inside some identifiers. You need it in section 6.",
        },
        // CHECK: the format string value(config.name) for gcloud services list. Run the command once and read the output.
        {
          kind: "step",
          id: "cloud01-s06",
          title: "Read the project number and the enabled APIs",
          text: "Run both commands. They only read, so they cost nothing. The first prints the project number. The second lists every API that is on in the project.",
          lang: "bash",
          code: `gcloud projects describe $PROJECT_ID --format="value(projectNumber)"
gcloud services list --enabled --format="value(config.name)"`,
          expect:
            "A number such as 123456789012, which is sample output. Then one API a line. Expect run.googleapis.com, sqladmin.googleapis.com, artifactregistry.googleapis.com and secretmanager.googleapis.com, which you turned on in chapter 14 of course 1.",
        },
        {
          kind: "p",
          text: "An API is off until you enable it, and enabling one costs nothing. It matters because a resource can't exist until its API is on. `run.googleapis.com` is the Cloud Run API, for example. Chapter 2 lists 19 APIs in Terraform and keeps them on.",
        },
        {
          kind: "p",
          text: "Terraform needs three APIs on before it can read your project. The audits in this chapter use them too. Switch them on now.",
        },
        {
          kind: "list",
          items: [
            "`cloudresourcemanager.googleapis.com` reads a project's access rules.",
            "`serviceusage.googleapis.com` lists and enables the other APIs.",
            "`iam.googleapis.com` reads and makes service accounts.",
          ],
        },
        {
          kind: "step",
          id: "cloud01-s07",
          title: "Turn on the three APIs",
          text: "Enable the three APIs in one command. If they are already on, nothing changes. Chapter 2 runs the same command from `bootstrap.sh`, so doing it now does no harm.",
          lang: "bash",
          code: `gcloud services enable cloudresourcemanager.googleapis.com \\
  serviceusage.googleapis.com iam.googleapis.com --project=$PROJECT_ID`,
          expect: "A line that says an operation finished successfully, or no output when the APIs were already on.",
        },
        {
          kind: "p",
          text: "Now list the service accounts that your project already has.",
        },
        {
          kind: "step",
          id: "cloud01-s08",
          title: "List the service accounts",
          text: "Print the email, the display name and the disabled flag of every service account in the project. The command only reads.",
          lang: "bash",
          code: `gcloud iam service-accounts list --format="table(email,displayName,disabled)"`,
          expect:
            "At least askpep-run and askpep-job, from chapter 14 of course 1. Add askpep-eval if you did the Workload Identity step in chapter 8 of course 4. You may also see an account that ends -compute@developer.gserviceaccount.com. Google made that one.",
        },
        {
          kind: "p",
          text: "You can read the project now. Which identity should each piece of AskPEP run as?",
        },
      ],
    },
    {
      id: "s4-service-accounts",
      title: "A service account for each workload keeps a leak small",
      goal: "Which seven accounts does AskPEP need, and which roles may each one hold?",
      blocks: [
        {
          kind: "p",
          text: "A **workload** is a program that runs in the cloud and calls other services. AskPEP has several: the API, the ingest job, the caller from the task queue, the pipeline and the judge of a canary release. A **service account** is the identity of a workload. A Google account is the identity of a person.",
        },
        {
          kind: "p",
          text: "Every call a workload makes to Google carries its service account. Google checks that account against the project's access rules before it answers. That check is **IAM**, short for identity and access management.",
        },
        {
          kind: "p",
          text: "Four words describe those rules. A **role** is a named bundle of permissions. A **member** is an identity that can hold a role, such as a service account. A **binding** gives one role to one member. A project's **policy** is the list of all its bindings.",
        },
        {
          kind: "p",
          text: "Roles come in two kinds that matter here. A **primitive** role, such as `roles/editor`, covers almost every service at once. A **predefined** role, such as `roles/cloudsql.client`, covers one job in one service. Give a service account predefined roles only.",
        },
        {
          kind: "p",
          text: "Separate accounts keep a leak small. If the ingest job and the API share an account, a leak from either gives an attacker the roles of both. With one account each, a leak reaches only what that workload could already do. You did this in chapter 14 of course 1, when you made two accounts.",
        },
        {
          kind: "p",
          text: "A grant can also sit on one resource instead of the project. In chapter 14 you gave `roles/secretmanager.secretAccessor` on each secret, and never on the project. That is narrower. A project-wide grant covers every secret in the project, including the ones you make later.",
        },
        {
          kind: "p",
          text: "AskPEP ends the course with seven service accounts.",
        },
        {
          kind: "compare",
          caption: "The seven AskPEP service accounts, and the project roles each may hold. These are the entries of ACCESS in identity.py.",
          columns: ["Account", "What runs as it", "Project roles it may hold"],
          rows: [
            ["`askpep-run`", "The Cloud Run service, which serves the API and the PEP desk.", "`roles/aiplatform.user`, `roles/cloudsql.client`, `roles/cloudtrace.agent`, `roles/logging.logWriter`, `roles/modelarmor.user`"],
            ["`askpep-job`", "The ingest job from chapter 14 of course 1.", "`roles/cloudsql.client`, `roles/logging.logWriter`"],
            ["`askpep-tasks`", "Cloud Tasks, when it calls the service from the queue that ADR 0004 chose.", "None. Its one grant sits on the service."],
            ["`askpep-deploy`", "The pipeline's build and deploy jobs, from chapter 6.", "`roles/artifactregistry.writer`, `roles/run.developer`"],
            ["`askpep-eval`", "The eval gate from course 4.", "`roles/aiplatform.user`"],
            ["`askpep-canary`", "The judge of a canary release, from chapter 7.", "`roles/cloudsql.client`, `roles/logging.viewer`"],
            ["`askpep-plan`", "The `terraform plan` job in CI, from chapter 2.", "Ten roles, each a viewer or reader of one service."],
          ],
        },
        {
          kind: "p",
          text: "Each role matches something the workload does. `askpep-run` calls Gemini, connects to Cloud SQL, sends traces, writes logs and calls Model Armor, the guard service from course 3.",
        },
        {
          kind: "p",
          text: "You made three of these accounts by hand: `askpep-run`, `askpep-job` and `askpep-eval`. Chapter 2 makes the other four in Terraform, and brings the first three under its control. Don't make the other four now. Terraform would find them already there, and the first apply would fail.",
        },
        {
          kind: "p",
          text: "The module `identity.py` keeps the table as a dictionary named `ACCESS`. It maps each account id to the project roles that account may hold. A role outside its entry is a finding. Chapter 2 writes the same table into Terraform as `project_roles`.",
        },
        {
          kind: "p",
          text: "Three grants sit on one resource, so `ACCESS` leaves them out. `askpep-run` enqueues on the queue `askpep-agent`. `askpep-canary` holds `roles/run.developer` on the service `askpep` only. `askpep-plan` reads the bucket that holds Terraform's state. A project-wide grant of any of them is a finding.",
        },
        {
          kind: "p",
          text: "The first audit is `audit_policy`. It reads a project's policy and returns findings. A **finding** is a small record with a `code` that names the rule, a `where` that names the grant or field, and a message.",
        },
        {
          kind: "p",
          text: "The audits call no Google API. They read the JSON that `gcloud` prints. A test can run one on a fixture, and CI can run one on real output.",
        },
        {
          kind: "p",
          text: "`audit_policy` reads every pair of role and member. It reports a pair once, under the first rule that matches.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "`public_member`: the member is `allUsers`, which means anyone on the internet, or `allAuthenticatedUsers`, which means anyone signed in to any Google account. Any role counts.",
            "`primitive_role`: a service account holds `roles/owner`, `roles/editor` or `roles/viewer`.",
            "`unknown_account`: a service account of this project holds a role, and its id is not a key of `ACCESS`.",
            "`outside_allow_list`: a known account holds a role that is not in its entry.",
          ],
        },
        {
          kind: "p",
          text: "A person who owns the project is not a finding. The audit looks at service accounts and public members. Here is a trimmed policy, as `gcloud projects get-iam-policy` prints it. It is sample output.",
        },
        {
          kind: "code",
          lang: "json",
          caption: "Sample output, trimmed. Each binding has a role and a list of members.",
          code: `{
  "bindings": [
    {
      "role": "roles/cloudsql.client",
      "members": [
        "serviceAccount:askpep-job@PROJECT_ID.iam.gserviceaccount.com",
        "serviceAccount:askpep-run@PROJECT_ID.iam.gserviceaccount.com"
      ]
    },
    { "role": "roles/owner", "members": ["user:you@example.com"] }
  ],
  "etag": "BwYxxxxxxxx=",
  "version": 1
}`,
        },
        {
          kind: "widget",
          id: "cloud01-role-audit",
          intro:
            "Ten grants from a made-up policy. PROJECT_ID stands for your project id. Read each grant against the allow-list at the top, and name the finding it gets, or no finding.",
        },
        {
          kind: "step",
          id: "cloud01-s09",
          title: "Read the policy of your own project",
          text: "Print your project's policy and read it with the four rules in mind. Look for `roles/editor`, `roles/owner` and any `allUsers`. Change nothing yet. Lab step 1 writes the audit that does this reading for you.",
          lang: "bash",
          code: `gcloud projects get-iam-policy $PROJECT_ID --format=json`,
          expect:
            "JSON with a bindings list. Expect roles/owner for you, and roles for the accounts that Google made, such as service-NUMBER@... agents. Your own accounts should hold only roles from the table.",
        },
        {
          kind: "quiz",
          id: "cloud01-q1",
          question: "The API and the ingest job each have a service account. What does that buy you?",
          options: [
            "Cloud Run requires a different account for each workload.",
            "Google bills each account separately, so costs are easier to read.",
            "A leak from one workload reaches only the roles of that workload.",
            "A role can be held by only one account at a time.",
          ],
          answer: 2,
          explain:
            "One shared account would give an attacker the roles of both workloads after a leak from either. Cloud Run doesn't require separate accounts, billing ignores them, and a role can be held by many accounts.",
        },
        {
          kind: "quiz",
          id: "cloud01-q2",
          question: "`askpep-canary` must update the Cloud Run service `askpep`, and no other service. Where should `roles/run.developer` be granted?",
          options: [
            "On the project, because roles are always granted there.",
            "On the service `askpep`.",
            "On the billing account.",
            "To `allAuthenticatedUsers`, so the canary can always sign in.",
          ],
          answer: 1,
          explain:
            "A grant on the service covers that service only. On the project the same role would cover every Cloud Run service in it, and `ACCESS` would report it as outside the list. The last option is a public member.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Least privilege comes up in interviews",
          text: "Least privilege comes up in interviews. How would you set up access for an AI service on Google Cloud, they ask. A strong answer gives each workload its own service account. It grants predefined roles at the narrowest resource that works. It keeps the allowed roles in a file, and a CI audit fails on a primitive role or a public member.",
        },
        {
          kind: "p",
          text: "Those roles cover workloads inside Google Cloud. How does a GitHub job outside it prove who it is?",
        },
      ],
    },
    {
      id: "s5-federation",
      title: "GitHub proves who it is with a short-lived token, so no key is stored",
      goal: "What are the four pieces of the GitHub trust, and what does the audit check?",
      blocks: [
        {
          kind: "p",
          text: "In chapter 8 of course 4 you let GitHub Actions sign in to Google without a key file. That setup is **Workload Identity Federation**. This section names its parts, because the next audit checks them.",
        },
        {
          kind: "p",
          text: "A GitHub Actions job can ask GitHub for an **OIDC token**. OIDC is OpenID Connect, a standard for signed identity tokens. GitHub signs the token. It carries **claims**, which are facts about the job, such as the repository and the branch. The claim `sub`, the **subject**, sums up who the job is.",
        },
        {
          kind: "p",
          text: "Google holds a **workload identity pool**, which is a container for identities from outside Google. A **provider** in the pool says which issuer to trust. Yours are the pool `github` and the provider `askpep-repo`.",
        },
        {
          kind: "p",
          text: "A job then trades its token for a short-lived Google credential, and acts as a service account. Acting as an account is called **impersonation**. The account must allow it, with a binding of `roles/iam.workloadIdentityUser` on the account itself. The table lists the four pieces and what each decides.",
        },
        {
          kind: "compare",
          caption: "The four pieces of the GitHub trust. The first three sit on the provider. The fourth sits on each service account.",
          columns: ["Piece", "What it decides", "Your value"],
          rows: [
            ["Issuer", "Which token authority Google trusts.", "`https://token.actions.githubusercontent.com`"],
            ["Attribute condition", "Which tokens the provider accepts at all.", "`assertion.repository == 'owner/askpep'`"],
            ["Attribute mapping", "Which claims a binding can name.", "`google.subject` from `assertion.sub`, and `attribute.repository` from `assertion.repository`"],
            ["`workloadIdentityUser` binding", "Which accepted identities may act as one account.", "A principal set or a single principal, in section 6"],
          ],
        },
        {
          kind: "p",
          text: "The condition is the only check that runs before any account is involved. Without one, a token from any GitHub repository passes the provider, and only the bindings stand between that token and your accounts. So the condition must name your repository.",
        },
        {
          kind: "p",
          text: "`audit_wif` reads the provider's JSON and reports five faults. `where` is the field name.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "`issuer`: `oidc.issuerUri` is not exactly GitHub's issuer.",
            "`no_condition`: `attributeCondition` is missing or blank.",
            "`wrong_repo`: the condition doesn't pin `assertion.repository` to your repository. A condition that names only the owner fails here.",
            "`broad_condition`: the condition uses `||`. An OR can let in a repository that the first clause refused, such as every repository of the owner.",
            "`mapping`: there is no `attribute.repository` entry that maps to `assertion.repository`. Without it, a binding can't name the repository.",
          ],
        },
        {
          kind: "code",
          lang: "json",
          caption: "Sample output, trimmed. The provider as `gcloud iam workload-identity-pools providers describe` prints it.",
          code: `{
  "attributeCondition": "assertion.repository == 'owner/askpep'",
  "attributeMapping": {
    "attribute.repository": "assertion.repository",
    "google.subject": "assertion.sub"
  },
  "name": "projects/123456789012/locations/global/workloadIdentityPools/github/providers/askpep-repo",
  "oidc": { "issuerUri": "https://token.actions.githubusercontent.com" },
  "state": "ACTIVE"
}`,
        },
        // CHECK: the describe command and its flags come from the evals-08 chapter and the identity.py docstring. Run it once on your project.
        {
          kind: "step",
          id: "cloud01-s10",
          title: "Read your provider",
          text: "Print the provider that you made in chapter 8 of course 4. Compare its issuer, its condition and its mapping with the table. Lab step 2 writes the audit that makes this comparison.",
          lang: "bash",
          code: `gcloud iam workload-identity-pools providers describe askpep-repo \\
  --workload-identity-pool=github --location=global \\
  --project=$PROJECT_ID --format=json`,
          expect:
            "JSON with an attributeCondition that names your repository, an attributeMapping with attribute.repository, and an oidc.issuerUri of https://token.actions.githubusercontent.com.",
        },
        // CHECK: a token's default lifetime is about an hour. Read the Workload Identity Federation page before stating it as a figure.
        {
          kind: "fold",
          tone: "industry",
          title: "Many teams still keep a key file in GitHub",
          text: "A service account key works from anywhere, until someone deletes it. A federated token works only from a job that passes the condition, and it expires within hours. A leaked key is a standing problem. A leaked token is gone by the time anyone finds it.",
        },
        {
          kind: "quiz",
          id: "cloud01-q3",
          question: "A provider has no attribute condition. What stands between a token from any GitHub repository and your service accounts?",
          options: [
            "The provider rejects every token that has no condition.",
            "GitHub refuses to issue tokens for repositories that are not yours.",
            "The service account's own password.",
            "Only the `roles/iam.workloadIdentityUser` bindings on each account.",
          ],
          answer: 3,
          explain:
            "A token from any repository passes a provider with no condition. After that, only the bindings on each service account decide who may act as it. That is why `audit_wif` reports `no_condition`, and why the condition must name your repository.",
        },
        {
          kind: "p",
          text: "The provider accepts your repository. Should every job in that repository be able to deploy?",
        },
      ],
    },
    {
      id: "s6-deploy-narrow",
      title: "The deploy account trusts two single identities, and the other two trust the repository",
      goal: "Why is `askpep-deploy` bound more narrowly than `askpep-eval` and `askpep-plan`?",
      blocks: [
        {
          kind: "p",
          text: "A binding can name its members in two widths. A **principal set** names every identity that shares an attribute. A **principal** names one identity, by its exact subject. Both start with the number of your project. Replace PROJECT_NUMBER with the number from section 3.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "The wide form. Any workflow in the repository, on any branch or pull request.",
          code: `principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository/owner/askpep`,
        },
        {
          kind: "p",
          text: "The narrow forms name an **environment**. An environment is a named target in your GitHub repository settings, such as `production`. It can hold rules, such as a required reviewer or a limit on which branches may deploy to it. Chapter 6 creates it.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "The narrow forms. One subject each: the main branch, and the production environment.",
          code: `principal://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github/subject/repo:owner/askpep:ref:refs/heads/main
principal://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github/subject/repo:owner/askpep:environment:production`,
        },
        // CHECK: GitHub's default subject forms for a branch, an environment and a pull request, and the rule that a job in
        // an environment presents the environment and not the branch. Read the sub claim of a real token before relying on them.
        {
          kind: "p",
          text: "GitHub builds the subject from the job. A job on a branch, with no environment, presents `repo:owner/askpep:ref:refs/heads/BRANCH`. A pull request job presents `repo:owner/askpep:pull_request`. A job that declares an environment presents `repo:owner/askpep:environment:NAME`. The branch isn't in that last form.",
        },
        {
          kind: "p",
          text: "AskPEP needs three trusts, and it picks a width for each by the damage the account can do.",
        },
        {
          kind: "compare",
          caption: "Three accounts, three trusts.",
          columns: ["Account", "Trust", "Why"],
          rows: [
            ["`askpep-eval`", "The whole repository.", "The eval gate runs on pull requests and calls Gemini. A wrong call costs a little money."],
            ["`askpep-plan`", "The whole repository.", "`terraform plan` runs on pull requests and only reads. Its roles are read-only."],
            ["`askpep-deploy`", "Two single identities: the main branch and the production environment.", "It pushes images and changes the live service. Only merged code should do that, and a branch rule on the environment is what enforces it."],
          ],
        },
        {
          kind: "p",
          text: "The deploy trust has two subjects because the pipeline has two kinds of job. The build job runs on `main` and declares no environment, so it presents the branch subject. The deploy and rollout jobs declare the `production` environment, so they present the environment subject.",
        },
        {
          kind: "p",
          text: "The second subject has a catch. It names the environment and not the branch, and a job from any branch can ask for `environment: production`. So the environment must refuse. In GitHub, limit the environment's deployment branches to `main`. Then a job from another branch never starts.",
        },
        {
          kind: "widget",
          id: "cloud01-trust-subject",
          intro:
            "Seven jobs in a made-up repository, owner/askpep. Assume every job asks GitHub for a token. For each one, say which of the three accounts it can act as. Eval trusts the repository, plan trusts the repository, and deploy trusts the two single identities.",
        },
        {
          kind: "p",
          text: "`audit_impersonation` reads the policy of one service account. It looks at each member of `roles/iam.workloadIdentityUser`. Three members pass: the repository's principal set, and the two single identities for `main` and `production`. It reports the rest.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "`public_member`: `allUsers` or `allAuthenticatedUsers`, with any role.",
            "`pool_wide`: a principal set for the whole pool, with `/*` or no attribute. Every identity in the pool could then act as the account.",
            "`wrong_scope`: any other member of `workloadIdentityUser`, such as another repository, an owner-wide attribute or a plain user.",
          ],
        },
        {
          kind: "step",
          id: "cloud01-s11",
          title: "Read who may act as askpep-eval",
          text: "Print the policy of the eval account. It should show one binding of `roles/iam.workloadIdentityUser`, with the wide form from this section. `askpep-deploy` doesn't exist yet. Chapter 2 makes it with its two single identities.",
          lang: "bash",
          code: `gcloud iam service-accounts get-iam-policy \\
  askpep-eval@$PROJECT_ID.iam.gserviceaccount.com \\
  --project=$PROJECT_ID --format=json`,
          expect:
            "A binding of roles/iam.workloadIdentityUser. Its member starts principalSet://iam.googleapis.com/projects/ and ends /attribute.repository/ followed by your repository.",
        },
        {
          kind: "quiz",
          id: "cloud01-q4",
          question: "Why does `askpep-eval` keep the repository-wide trust, when `askpep-deploy` does not?",
          options: [
            "The eval gate runs on pull requests, whose subject is neither `main` nor the environment, and the account can only call a model.",
            "Eval is a newer account, so it is trusted more.",
            "A single identity can't be used for an account that calls Vertex AI.",
            "The repository-wide form is faster for Google to check.",
          ],
          answer: 0,
          explain:
            "Pull requests present `repo:owner/askpep:pull_request`, which neither single identity matches, so a narrow eval account would stop the gate. The damage is also small: a wrong call to Gemini costs money, and a wrong deploy changes what users see.",
        },
        {
          kind: "quiz",
          id: "cloud01-q5",
          question: "A deploy job declares `environment: production`. Which subject does its token carry?",
          options: [
            "`repo:owner/askpep:ref:refs/heads/main`",
            "`repo:owner/askpep:environment:production`",
            "`repo:owner/askpep:pull_request`",
            "`repo:owner/askpep`",
          ],
          answer: 1,
          explain:
            "A job in an environment presents the environment and not the branch. That is why the deploy account trusts a second single identity for the environment, and why the environment needs its own branch rule.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Keyless deploys come up in interviews",
          text: "Keyless deploys come up in interviews. How does a CI pipeline deploy to your cloud with no stored key, they ask. A strong answer says the job gets a signed token, and the cloud trades it for a short-lived credential. A condition pins the provider to one repository. The deploy account then trusts only the main branch and the production environment.",
        },
        {
          kind: "p",
          text: "Identity limits what an account can reach. What limits what the project can spend?",
        },
      ],
    },
    {
      id: "s7-budget",
      title: "A budget warns early, and a forecast rule warns before the money is gone",
      goal: "What are the four parts of a budget, and what can a budget not do?",
      blocks: [
        {
          kind: "p",
          text: "A project spends money while its resources run. The Cloud SQL instance from chapter 14 of course 1 bills for every hour it is up. A **budget** is a rule on the billing account. It emails you when spend reaches a level you chose.",
        },
        {
          kind: "p",
          text: "A budget never stops spend. It only tells you. In chapter 4 of course 5 you tracked the cost of each task. The budget is the outer net for everything else in the project. Chapter 8 adds a **kill switch**, which turns parts of the service off. This chapter adds the warning.",
        },
        {
          kind: "p",
          text: "AskPEP's budget has four parts.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "An amount you set. A budget that follows last month's spend rises with the spend it should limit.",
            "Three rules on actual spend, at 0.5, 0.9 and 1.0 of the amount.",
            "One rule on the forecast, at 1.0. The forecast is Google's estimate of the month's total, so this rule can fire while there is still time to act.",
            "A **notification channel**, which is a Cloud Monitoring destination such as an email address. Without one, only the billing admins get the email.",
          ],
        },
        {
          kind: "p",
          text: "`audit_budget` checks all four. It reports `amount`, one `threshold` for each missing percent, `forecast` and `no_notification`. The next widget shows why the forecast rule matters.",
        },
        {
          kind: "widget",
          id: "cloud01-budget-alerts",
          intro:
            "Three invented months against a budget of 50 units. A unit is one unit of your billing currency. Work out the day each rule fires, and name the earliest. The forecast here is a straight line, so the real day will differ.",
        },
        // CHECK: how late a budget email can arrive. Google documents a delay between spend and the data that budgets read.
        // Read the Cloud Billing budget page for the current wording before giving a figure.
        {
          kind: "p",
          text: "Billing data arrives late, so an email can trail the spend. Treat a 90% email as a warning that may already be old.",
        },
        // CHECK: the roles that let a person create a budget. Likely Billing Account Costs Manager or Billing Account Administrator,
        // on the billing account. Read the Cloud Billing access control page.
        {
          kind: "callout",
          tone: "warn",
          title: "You may not be allowed to make a budget",
          text: "A budget belongs to the billing account, not to the project. A role on the billing account, such as Billing Account Costs Manager, lets you make one. On a company account, ask the billing admin. Chapter 8 writes the same budget in Terraform. Delete this hand-made one then, or two sets of emails arrive.",
        },
        {
          kind: "step",
          id: "cloud01-s12",
          title: "Find the billing account of your project",
          text: "Print the billing account that your project spends against, and keep the id in a variable. The command only reads. The Cloud Billing Budget API must be on before a budget can exist, so enable it here.",
          lang: "bash",
          code: `gcloud billing projects describe $PROJECT_ID --format="value(billingAccountName)"
export BILLING_ACCOUNT=000000-000000-000000
gcloud services enable billingbudgets.googleapis.com --project=$PROJECT_ID`,
          expect:
            "A line such as billingAccounts/000000-000000-000000, which is sample output. Put the part after the slash in BILLING_ACCOUNT before you run the third command.",
        },
        // CHECK: the command gcloud beta monitoring channels create, and its flags --display-name, --type and --channel-labels.
        // Run it with --help first. Notification channels are free at this scale, which FACTS.md does not confirm.
        {
          kind: "step",
          id: "cloud01-s13",
          title: "Make the notification channel",
          text: "Make an email channel that the budget will write to. Use an address you read. The command prints the channel's full name, which you need in the next step.",
          lang: "bash",
          code: `gcloud beta monitoring channels create \\
  --display-name="askpep budget" --type=email \\
  --channel-labels=email_address=you@example.com \\
  --project=$PROJECT_ID`,
          expect: "A line such as Created notification channel [projects/PROJECT_ID/notificationChannels/1234567890]. The name is sample output.",
        },
        // CHECK: every flag of gcloud billing budgets create: --budget-amount (and whether it wants a currency code such as 50USD),
        // --filter-projects, --threshold-rule with percent and basis, and --notifications-rule-monitoring-notification-channels.
        // capstone/DEPLOY.md says its own version was written from memory. Run the command with --help first.
        // The display name is askpep-by-hand so that the budget chapter 8 makes with Terraform, named askpep, is easy to tell apart.
        {
          kind: "step",
          id: "cloud01-s14",
          title: "Create the budget",
          text: "Create the budget with an amount you would be unhappy to lose in a month. Fifty is a placeholder, in the currency of your billing account. It has rules at 0.5, 0.9 and 1.0 of actual spend, and one at 1.0 of the forecast. It writes to your channel. A budget costs nothing.",
          lang: "bash",
          code: `export CHANNEL=projects/$PROJECT_ID/notificationChannels/1234567890

gcloud billing budgets create \\
  --billing-account=$BILLING_ACCOUNT --display-name=askpep-by-hand \\
  --budget-amount=50 --filter-projects=projects/$PROJECT_ID \\
  --threshold-rule=percent=0.5 --threshold-rule=percent=0.9 \\
  --threshold-rule=percent=1.0 \\
  --threshold-rule=percent=1.0,basis=forecasted-spend \\
  --notifications-rule-monitoring-notification-channels=$CHANNEL`,
          expect: "A line such as Created budget [billingAccounts/000000-000000-000000/budgets/abcd-1234], which is sample output.",
        },
        // CHECK: the format string name.basename() for gcloud billing budgets list. Run the command once and read the output.
        {
          kind: "step",
          id: "cloud01-s15",
          title: "Keep the budget id for the live test",
          text: "List the budgets on the account and copy the id of `askpep-by-hand`. Export it, with the billing account, so that the live test for lab step 4 can find it.",
          lang: "bash",
          code: `gcloud billing budgets list --billing-account=$BILLING_ACCOUNT \\
  --format="value(name.basename(),displayName)"
export GCP_BILLING_ACCOUNT=$BILLING_ACCOUNT
export GCP_BUDGET_ID=abcd-1234`,
          expect: "One line for each budget on the account, with the id first and the display name second. The line for askpep-by-hand holds the id to export.",
        },
        {
          kind: "quiz",
          id: "cloud01-q6",
          question: "Spend passes 100% of the budget. What does the budget do?",
          options: [
            "It stops new spend on the project.",
            "It turns billing off for the project.",
            "It emails the channel and nothing else.",
            "It scales the Cloud Run service to zero.",
          ],
          answer: 2,
          explain:
            "A budget only notifies. Stopping spend takes something else, such as the kill switch in chapter 8. That is why the forecast rule matters, because it is the only rule that can fire while there is still time to act.",
        },
        {
          kind: "p",
          text: "Four audits and a budget now exist on paper. What do they find on your real project?",
        },
      ],
    },
    {
      id: "s8-live",
      title: "Running the audits on your own project finds what a fixture can't",
      goal: "What do the four audits find when they read your real project?",
      blocks: [
        {
          kind: "p",
          text: "The lab below has one step for each audit. Each test runs your function on a JSON fixture, so it needs no cloud account. Do the four lab steps now. Then come back to the two steps here, which use the real project.",
        },
        {
          kind: "step",
          id: "cloud01-s16",
          title: "Run the chapter's offline tests",
          text: "Do this after lab step 4. The offline tests of chapter 1 should all pass. The four live tests are not part of this run.",
          lang: "bash",
          code: `uv run pytest tests/cloud -k cloud01 -q`,
          expect: "86 passed. The deselected count includes the four live tests, which carry the live marker, and the tests of the other chapters.",
        },
        {
          kind: "p",
          text: "Four more tests carry the `live` marker, one for each audit. They run `gcloud` and read your real project. They only read. Each skips with a message when `gcloud` or one of the settings is missing.",
        },
        {
          kind: "step",
          id: "cloud01-s17",
          title: "Run three of the live audits",
          text: "Run the live tests for steps 1, 2 and 4. Step 3 waits, because it reads `askpep-deploy`, which chapter 2 creates. A test passes when its audit finds nothing. A failure prints the findings.",
          lang: "bash",
          code: `uv run pytest tests/cloud -m live -k "cloud01_s1 or cloud01_s2 or cloud01_s4" -q`,
          expect:
            "Each test passes, or fails with a list of findings, such as primitive_role roles/editor followed by a member. If one skips, the message names the missing setting.",
        },
        // CHECK: that the default Compute Engine account may hold roles/editor in an older project, and that the Google APIs service
        // agent (NUMBER@cloudservices.gserviceaccount.com) holds roles/editor by default and is managed by Google. Read the IAM docs on
        // service agents and the org policy that stops the automatic Editor grant. audit_policy skips the agent on that claim. If the
        // claim is wrong for a project, the skip hides a real grant, so confirm it before you rely on a clean live step 1.
        {
          kind: "fold",
          tone: "trouble",
          title: "A live audit may list an account that Google made",
          text: "Read each finding by its member. A finding on an `askpep-` account is yours to fix. The default Compute Engine account, which ends `-compute@developer.gserviceaccount.com`, may hold Editor in an older project, and the audit reports it.",
        },
        {
          kind: "p",
          text: "Note it, and check whether any of your workloads still runs as that account before you change the grant. The Google APIs service agent, which ends `@cloudservices.gserviceaccount.com`, holds Editor by default and Google manages it. `audit_policy` skips it, so it never appears.",
        },
        {
          kind: "code",
          lang: "bash",
          caption: "To remove a grant on one of your own accounts. Use the role and member from your own finding.",
          code: `gcloud projects remove-iam-policy-binding $PROJECT_ID \\
  --member="serviceAccount:askpep-job@$PROJECT_ID.iam.gserviceaccount.com" \\
  --role="roles/editor"`,
        },
        {
          kind: "p",
          text: "Chapter 2 puts the same table into Terraform, and its plan reads these same grants. A project that passes the audit now makes that first plan quiet.",
        },
        {
          kind: "p",
          text: "The audits have read the project. What did this chapter cost, and how do you undo it?",
        },
      ],
    },
    {
      id: "s9-cost",
      title: "Nothing in this chapter bills, and each change has an undo",
      goal: "What did you create, what does it cost, and how do you remove it?",
      blocks: [
        {
          kind: "p",
          text: "Reading a policy, listing accounts and running the live tests cost nothing. Enabling the four APIs costs nothing either. A notification channel and a budget are free at this scale.",
        },
        {
          kind: "p",
          text: "Leave the three APIs on, because chapter 2 needs them. If you want to remove the budget and the channel, run these two commands with your own ids. Chapter 8 makes a second budget, so you will delete this one then anyway.",
        },
        // CHECK: the delete commands gcloud billing budgets delete and gcloud beta monitoring channels delete. Run each with --help first.
        {
          kind: "code",
          lang: "bash",
          caption: "Teardown. The ids are the ones from your own steps 13 and 15.",
          code: `gcloud billing budgets delete abcd-1234 --billing-account=$BILLING_ACCOUNT
gcloud beta monitoring channels delete 1234567890 --project=$PROJECT_ID`,
        },
        {
          kind: "p",
          text: "You can audit one project. What does that audit say about the date you owe the third team?",
        },
      ],
    },
    {
      id: "s10-gap-list",
      title: "The gap list replaces 18 December with 11 January",
      goal: "How do you turn an audit and a design into a date someone can hold you to?",
      blocks: [
        {
          kind: "p",
          text: "A gap list compares what runs today with what the design says, one piece at a time. Each gap gets a size in working days and an owner. The sum is your date, and you say it before anyone asks twice.",
        },
        {
          kind: "p",
          text: "Here is how AskPEP's list was made on Monday 14 December.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "You ran the four audits against the pilot project. `audit_policy` found `roles/editor` on `askpep-run`, granted during the pilot to get past a permission error.",
            "The security reviewer read that finding and said, \"I want that gone today.\" You removed the grant, and the audit passed.",
            "You listed each piece of the design against the pilot. Four of the seven accounts don't exist, and neither does any Terraform, queue or pipeline.",
            "You sized the work at seven working days, ending on Wednesday 23 December. T11 was due today and isn't shipped, so it joins the list for Friday.",
            "The product owner said, \"Nothing ships between 24 December and 3 January. Nobody is here to roll it back.\" That rule added the holiday to the plan.",
            "The third team's lead said, \"We planned January around you. Give me one date and I'll hold my people to it.\" You gave Monday 11 January 2027.",
          ],
        },
        {
          kind: "code",
          lang: "text",
          code: `# ACCESS-AND-GAPS  Monday 14 December 2026
Owner: engineering.
Read by: product owner, security reviewer, third team's lead.

Audit of the pilot project
audit_policy         1 finding, fixed today   roles/editor on askpep-run
audit_wif            0 findings
audit_impersonation  waits for askpep-deploy, chapter 2
audit_budget         no budget existed, one made today

Accounts
Exist today:  askpep-run, askpep-job, askpep-eval
Still needed: askpep-tasks, askpep-deploy, askpep-canary, askpep-plan

Work against the approved design
Piece                                 Days  Done by
Terraform import and first plan       2     Wed 16 Dec
Cloud Run settings, queue, ADR 0007   1     Thu 17 Dec
Cloud SQL private, secrets, T11       1     Fri 18 Dec
Quotas, region, Model Armor run live  1     Mon 21 Dec
Delivery pipeline                     1     Tue 22 Dec
First canary release                  1     Wed 23 Dec
Total working days                    7

No release:        24 December to 3 January (product owner)
Operations drills: 4 to 7 January
Launch review:     Friday 8 January 2027
Third team joins:  Monday 11 January 2027, if the review passes

Old date: 18 December 2026.
Why it changed: the deployment the conditions describe does not exist yet.`,
          caption: "The gap list for AskPEP on 14 December. Every figure in it is invented.",
        },
        {
          kind: "p",
          text: "Read the file from the bottom. The old date is written down next to its reason, so nobody has to ask why it changed. The seven days add up, and each row names the chapter's work. The third team's date depends on one review, and the file says so.",
        },
        {
          kind: "p",
          text: "The honest part is the phrase \"if the review passes\". A date without that phrase promises an outcome you don't control.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# ACCESS-AND-GAPS  <date>
Owner:
Read by:

Audit results:

Accounts that exist:
Accounts still needed:

Piece    Days    Done by

Total working days:
No release between:
Review date:
Date promised, and what it depends on:
Old date, and why it changed:`,
          caption: "For your next deployment: copy this, fill in every blank and send it the day you find the gap.",
        },
        {
          kind: "p",
          text: "The access plan and the date are on paper. How do the missing pieces come to exist in a form you can rebuild twice?",
        },
      ],
    },
  ],
  lab: {
    title: "Audit the access of AskPEP offline",
    goal: "Write the four audit functions in `src/askpep/identity.py`. Each starts from a stub that raises `NotImplementedError(\"cloud-01 step N\")`. The tests run on JSON fixtures, so no step needs a cloud account. Run them from your AskPEP workspace root. Then compare your file with `capstone/src/askpep/identity.py` in the my-learn folder.",
    minutes: 60,
    files: ["src/askpep/identity.py"],
    steps: [
      {
        title: "Write audit_policy",
        text: "Write `audit_policy`. Walk every role and member pair in the policy, and report each pair once under the first rule that matches: `public_member`, `primitive_role`, `unknown_account` or `outside_allow_list`. Skip the Google APIs service agent, a member that ends `@cloudservices.gserviceaccount.com`. `_bindings` already yields the pairs. The stub raises `cloud-01 step 1`.",
        code: `# src/askpep/identity.py
# _bindings, ACCESS, Finding, PRIMITIVE_ROLES and PUBLIC_MEMBERS ship in your stub.
def audit_policy(
    policy: Mapping[str, Any], project_id: str, access: Mapping[str, Collection[str]] = ACCESS
) -> list[Finding]:
    suffix = f"@{project_id}.iam.gserviceaccount.com"
    google_agent = "@cloudservices.gserviceaccount.com"
    found: list[Finding] = []
    for role, member in _bindings(policy):
        where = f"{role} {member}"
        # your turn: first skip a member that starts "serviceAccount:" and ends with google_agent.
        # Google makes that account and grants it Editor, so it is never a finding.
        # Then report the pair once, under the first rule that matches.
        # 1. member is in PUBLIC_MEMBERS: Finding("public_member", where, ...)
        # 2. member starts "serviceAccount:" and role is in PRIMITIVE_ROLES: "primitive_role"
        # 3. member starts "serviceAccount:" and ends with suffix, and the id between them
        #    is not a key of access: "unknown_account"
        # 4. the id is known and role is not in access[id]: "outside_allow_list"
        ...
    return found`,
        test: "uv run pytest tests/cloud -k cloud01_s1",
      },
      {
        title: "Write audit_wif",
        text: "Write `audit_wif`. It checks five things on the provider's JSON. The issuer must be GitHub's. A condition must exist, pin your repository and have no `||`. The `attribute.repository` mapping must be present. Add `import re` first. The stub raises `cloud-01 step 2`.",
        code: `# src/askpep/identity.py
# Add \`import re\` at the top of the file. GITHUB_ISSUER ships in your stub.
def audit_wif(provider: Mapping[str, Any], repo: str) -> list[Finding]:
    found: list[Finding] = []
    # your turn:
    # 1. oidc.issuerUri is not exactly GITHUB_ISSUER: Finding("issuer", "oidc.issuerUri", ...)
    # 2. attributeCondition is missing or blank: "no_condition". Otherwise run checks 3 and 4.
    # 3. the condition lacks assertion.repository == '<repo>', in single or double quotes.
    #    Build the pattern with re.escape(repo): "wrong_repo"
    # 4. the condition contains "||": "broad_condition"
    # 5. attributeMapping["attribute.repository"] is not "assertion.repository": "mapping"
    # where is the field name, such as "attributeCondition".
    return found`,
        test: "uv run pytest tests/cloud -k cloud01_s2",
      },
      {
        title: "Write audit_impersonation",
        text: "Write `audit_impersonation`. For each member of `roles/iam.workloadIdentityUser`, three identities pass: the repository's principal set, and the single identities for `main` and `production`. Report `public_member`, `pool_wide` and `wrong_scope`. The stub raises `cloud-01 step 3`.",
        code: `# src/askpep/identity.py
# WORKLOAD_IDENTITY_USER ships in your stub.
def audit_impersonation(policy: Mapping[str, Any], repo: str, pool: str = "github") -> list[Finding]:
    set_prefix = "principalSet://iam.googleapis.com/projects/"
    one_prefix = "principal://iam.googleapis.com/projects/"
    pool_part = f"/locations/global/workloadIdentityPools/{pool}"
    # your turn: write the three passing (prefix, ending) pairs.
    #   set_prefix, with f"{pool_part}/attribute.repository/{repo}"
    #   one_prefix, with f"{pool_part}/subject/repo:{repo}:ref:refs/heads/main"
    #   one_prefix, with f"{pool_part}/subject/repo:{repo}:environment:production"
    found: list[Finding] = []
    for role, member in _bindings(policy):
        where = f"{role} {member}"
        # your turn, in this order:
        # 1. member is in PUBLIC_MEMBERS, with any role: Finding("public_member", where, ...)
        # 2. role is not WORKLOAD_IDENTITY_USER: skip the pair
        # 3. member is a principal set that ends with the pool, or with the pool and /*: "pool_wide"
        # 4. member matches none of the three pairs: "wrong_scope"
        ...
    return found`,
        test: "uv run pytest tests/cloud -k cloud01_s3",
      },
      {
        title: "Write audit_budget",
        text: "Write `audit_budget`. Check the amount you set, rules at 0.5, 0.9 and 1.0 of actual spend, a forecast rule at 1.0 or more, and a notification channel. Report `amount`, `threshold`, `forecast` and `no_notification`. The stub raises `cloud-01 step 4`.",
        code: `# src/askpep/identity.py
def audit_budget(budget: Mapping[str, Any]) -> list[Finding]:
    found: list[Finding] = []
    # your turn:
    # 1. amount.specifiedAmount is missing, or its units plus nanos are not above zero: "amount"
    # 2. a rule in thresholdRules is on actual spend when its spendBasis is missing or CURRENT_SPEND.
    #    Report one "threshold" finding for each of 0.5, 0.9 and 1.0 with no such rule.
    #    The percent, as text, is where.
    # 3. no FORECASTED_SPEND rule at 1.0 or more: "forecast"
    # 4. notificationsRule has no monitoringNotificationChannels and no pubsubTopic: "no_notification"
    return found`,
        test: "uv run pytest tests/cloud -k cloud01_s4",
      },
    ],
    verify: "uv run pytest tests/cloud -k cloud01",
  },
  recap: [
    "The 18 December date failed because the deployment did not exist yet. The gap list set 11 January, if the review passes.",
    "Each workload gets its own service account, and `ACCESS` lists the project roles each may hold.",
    "`audit_policy` reports public members, primitive roles, unknown accounts and roles outside the list.",
    "A GitHub provider needs GitHub's issuer, a condition that pins your repository and a mapping for `attribute.repository`.",
    "`askpep-deploy` trusts the main branch and the production environment. `askpep-eval` and `askpep-plan` trust the whole repository.",
    "A budget needs an amount, four rules and a notification channel. It warns and never stops spend.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. I can read a project's access without changing it, write the allowed roles down, and turn the gap to a design into a date I can defend.",
  interviewIds: ["cloud-q25", "cloud-q26"],
};

export default chapter;
