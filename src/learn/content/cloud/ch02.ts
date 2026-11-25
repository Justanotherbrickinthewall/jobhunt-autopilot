import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "cloud-02-terraform",
  course: "cloud",
  number: 2,
  title: "If it isn't in Terraform, nobody can rebuild it",
  tagline: "Bring the pilot's hand-made pieces under Terraform, and read the first plan before anyone applies it.",
  minutes: 63,
  objectives: [
    "Name what you built by hand and the five ideas Terraform adds.",
    "Say why the state bucket comes before Terraform.",
    "Write inputs that refuse bad values and a list of APIs.",
    "Write identity as code and match each job to its account.",
    "Read a plan for tildes, replaces and destroys.",
    "Run a plan in CI that reads and never writes.",
    "Write the record of a first plan.",
  ],
  sections: [
    {
      id: "s1-by-hand",
      title: "The missing pieces become files, and the hand-made ones are imported",
      goal: "What did you build by hand, and which ideas does Terraform add?",
      blocks: [
        {
          kind: "p",
          text: "The missing pieces come to exist as Terraform files, and the hand-made pieces are imported into those files. That is the work of Tuesday 15 and Wednesday 16 December, the first two days on the gap list.",
        },
        {
          kind: "p",
          text: "Count what exists today. In chapter 14 of course 1 you made a registry repository, two service accounts and four secrets. You also made a database instance, an ingest job and the Cloud Run service. In chapter 8 of course 4 you made a Workload Identity Federation pool and provider, and the account `askpep-eval`.",
        },
        {
          kind: "p",
          text: "Suppose someone deletes the project tomorrow. Your record of how it was built is a shell history, if you kept it. A teammate can't review that history, and a pipeline can't read it. A setup that isn't in Terraform can't be rebuilt, reviewed or compared with the live project.",
        },
        {
          kind: "p",
          text: "Terraform reads files that describe the resources you want, and makes the project match them. A **resource** is one cloud object, such as a service account. A **Terraform provider** is the plugin that talks to one cloud's API. The `google` provider talks to Google Cloud.",
        },
        {
          kind: "p",
          text: "Terraform keeps a **state**, which records the real object that each resource in your files stands for. A **plan** compares your files, the state and the live project, and lists every change it would make. An **apply** makes those changes. You read the plan before every apply.",
        },
        {
          kind: "p",
          text: "Your hand-made objects aren't in the state yet. Written as new resources, they would fail on their names. An **import** tells Terraform that a resource in your files already exists, and gives its real id. The next plan then shows only the differences.",
        },
        {
          kind: "quiz",
          id: "cloud02-q1",
          question:
            "A teammate deletes the account `askpep-run` in the console. You haven't changed any Terraform file. What does your next plan show?",
          options: [
            "No changes, because your files haven't changed.",
            "A create for `askpep-run`, because the files still describe it and the live project no longer has it.",
            "An error, because the state is out of date.",
            "A destroy for `askpep-run`, because it is missing from the live project.",
          ],
          answer: 1,
          explain:
            "A plan compares three things: your files, the state and the live project. The files say the account should exist, and the live project says it doesn't. The plan lists a create to close that gap.",
        },
        {
          kind: "p",
          text: "Terraform needs its state before it can do anything. Where does that state live, and who creates that place?",
        },
      ],
    },
    {
      id: "s2-state",
      title: "The state lives in a bucket that a script creates first",
      goal: "Where does the state live, and what creates that place before Terraform runs?",
      blocks: [
        {
          kind: "p",
          text: "By default Terraform writes its state to a file on your disk. A file on one laptop is no use to a pipeline or a teammate. So the state goes to a **backend**, which is a shared store. This course uses a Cloud Storage bucket.",
        },
        {
          kind: "p",
          text: "The bucket's name is your project id followed by `-tfstate`. Terraform can't create it, because Terraform needs the state before it can do anything. So `bootstrap.sh` creates it once, by hand. The script came with the files from chapter 1.",
        },
        {
          kind: "p",
          text: "The script first enables three APIs that Terraform needs to read the project. It then creates the bucket with public access prevention, so nobody can open the state to the internet. Last, it turns on versioning. An older copy of the state then survives a bad apply.",
        },
        // CHECK: FACTS.md holds no Cloud Storage facts. The flags --uniform-bucket-level-access, --public-access-prevention and --versioning come from bootstrap.sh on main, which nobody has run against a live project. Read `gcloud storage buckets create --help`.
        {
          kind: "code",
          lang: "bash",
          code: `gcloud storage buckets create "gs://\${BUCKET}" \\
  --project "\${PROJECT_ID}" \\
  --location "\${REGION}" \\
  --uniform-bucket-level-access \\
  --public-access-prevention

gcloud storage buckets update "gs://\${BUCKET}" --versioning`,
          caption: "The core of bootstrap.sh. The script sets BUCKET to your project id plus -tfstate.",
        },
        {
          kind: "p",
          text: "State can hold secret values in plain text, so treat the bucket as private. The Terraform in this course writes no secret value. Your next project's might.",
        },
        {
          kind: "p",
          text: "The backend block names a prefix, `askpep`, and leaves the bucket out. A backend block can't read a variable, so `terraform init` supplies the bucket with the flag `-backend-config`. The Cloud Storage backend also locks the state. A second apply then stops with a lock error, so it can't write over the first.",
        },
        // CHECK: FACTS.md names no Terraform or google provider version. Read the current releases on registry.terraform.io and pin the major version you tested. The capstone pins "~> 7.0". Import blocks need Terraform 1.5 or later.
        {
          kind: "p",
          text: "`versions.tf` also pins the tools. It requires Terraform 1.9 or later, because import blocks need 1.5 at least. It pins the `google` provider with `~>`, which allows minor updates and blocks the next major version. An unpinned provider can change behaviour between two plans.",
        },
        // CHECK: the google_billing_budget page of the provider says user credentials need billing_project and user_project_override = true. Nothing here has run against a live project. With the override on, the account that applies also needs serviceusage.services.use on the project, which roles/serviceusage.serviceUsageConsumer holds. Read the provider's page on the quota project and confirm it.
        {
          kind: "p",
          text: "The provider block sets two more lines. `billing_project` names the project that Google charges an API call to. `user_project_override = true` tells the provider to send that name with every call. Chapter 8 makes a billing budget. The provider's page says that its API needs both lines for a call that comes from your own login.",
        },
        {
          kind: "p",
          text: "With `user_project_override` on, the CI plan as `askpep-plan` may fail with a 403. That account then needs `serviceusage.services.use` on the project, which chapter 1 does not grant.",
        },
        // CHECK: the cost of a Cloud Storage bucket holding a few kilobytes, and the delete command with --all-versions. Read the Cloud Storage pricing page and `gcloud storage rm --help`.
        {
          kind: "step",
          id: "cloud02-s01",
          title: "Create the state bucket",
          text: "Do this before lab step 1. Run the script once, as the account that owns the project. It enables three APIs and creates one Cloud Storage bucket. The bucket costs almost nothing for a file of a few kilobytes. The teardown is below, and it comes last.",
          lang: "bash",
          code: "PROJECT_ID=your-project-id bash infra/terraform/bootstrap.sh",
          expect: "The last line reads `State bucket: gs://your-project-id-tfstate`, with your own project id. The gcloud commands before it print their own progress.",
        },
        {
          kind: "fold",
          tone: "trouble",
          title: "Teardown for the state bucket",
          text: "Delete the bucket only after Terraform manages nothing in the project, because the state is its only memory. Then run `gcloud storage rm --recursive --all-versions gs://your-project-id-tfstate`. Delete it earlier and Terraform forgets what it owns, and the next apply tries to create everything again. Leave the three APIs on, because Terraform keeps them on.",
        },
        {
          kind: "quiz",
          id: "cloud02-q2",
          question: "Why does the backend block leave the bucket name out?",
          options: [
            "Terraform forbids naming a bucket in code.",
            "So that Terraform can create the bucket on the first apply.",
            "The bucket name has to stay secret.",
            "A backend block can't read a variable, and the name carries your project id, so `terraform init` supplies it.",
          ],
          answer: 3,
          explain:
            "The bucket is named after the project id, which lives in a variable. Backend blocks are read before variables exist, so the name comes from `-backend-config` at `init`. Terraform can't create the bucket, because it needs the state first.",
        },
        {
          kind: "p",
          text: "The state has a home. What do the first files have to say?",
        },
      ],
    },
    {
      id: "s3-inputs-and-apis",
      title: "The inputs refuse bad values, and one resource enables every API",
      goal: "Which inputs must refuse bad values, and how do you turn on every API at once?",
      blocks: [
        {
          kind: "p",
          text: "Every other file reads the **variables**, so the inputs come first. `variables.tf` declares seven. Your project, repository, email and monthly budget have no default, because they are yours to choose. The region defaults to `europe-west3`, where the course runs. You set the values in `terraform.tfvars`, which git ignores.",
        },
        {
          kind: "p",
          text: "Chapter 3 uses the image and chapter 4 uses the database tier. Both have defaults, so that the first plan runs. Until those chapters, they do nothing.",
        },
        {
          kind: "p",
          text: "Two inputs get a validation, because they reach a bill or a lock. `budget_amount` must be above 0. `github_repo` must look like an owner and a name, with letters, digits, dots, dashes and underscores only.",
        },
        {
          kind: "p",
          text: "The second check matters most. The repository goes into the provider's condition, which is a string with quotes in it. A value that holds a quote can rewrite that condition. Take `owner/askpep' || true || '`. The condition then accepts every repository on GitHub.",
        },
        {
          kind: "code",
          lang: "text",
          code: `assertion.repository == 'owner/askpep' || true || ''`,
          caption: "What the provider's condition becomes with no validation on github_repo.",
        },
        {
          kind: "p",
          text: "Wrap the pattern in `can(regex(...))`. A value that fails the pattern then fails the check, with your error message. A bare `regex` would raise a raw error instead.",
        },
        {
          kind: "quiz",
          id: "cloud02-q3",
          question:
            "A teammate sets `github_repo` to `owner/askpep' || true || '`, and the file has no validation. What does the provider's condition become?",
          options: [
            "Terraform stops with a syntax error.",
            "A condition that rejects every token, including yours.",
            "A condition that accepts a token from every repository.",
            "The same condition, because Terraform escapes quotes.",
          ],
          answer: 2,
          explain:
            "The value is pasted into a string, so its quotes close the string early. What follows, `|| true`, makes the whole condition true. The validation refuses any value with a quote before the provider sees it.",
        },
        {
          kind: "p",
          text: "A new project has most APIs off. A resource whose API is off fails with an error that names the API. `apis.tf` lists all 19 APIs the course uses, so no later chapter meets that error. Three are already on, from `bootstrap.sh`. They are in the list too.",
        },
        {
          kind: "p",
          text: "One `google_project_service` resource covers the whole list. A `for_each` makes one copy of a resource for each item in a list or map. Each API gets its own entry in the state. Set `disable_on_destroy = false`. The default turns the API off when Terraform destroys the entry, and that would break every resource that uses it.",
        },
        // CHECK: that disable_on_destroy defaults to true, and that applying google_project_service over an API that is already enabled changes nothing. Read the resource page on registry.terraform.io.
        {
          kind: "p",
          text: "Applying over an API that is already on changes nothing in the project. The plan lists it as a create, and the apply finds it enabled.",
        },
        {
          kind: "p",
          text: "`registry.tf` describes the repository `askpep` from chapter 14 of course 1. It has `depends_on` the API resource, so Terraform enables the API first. Then an `import` block gives the real id, which holds the project, the location and the repository name.",
        },
        // CHECK: the import id format for google_artifact_registry_repository, and the others in this chapter, come from each resource's page on registry.terraform.io.
        {
          kind: "code",
          lang: "hcl",
          code: `import {
  to = google_artifact_registry_repository.askpep
  id = "projects/\${var.project_id}/locations/\${var.region}/repositories/askpep"
}`,
          caption: "The import block in registry.tf. It adopts the repository you made by hand in course 1.",
        },
        {
          kind: "p",
          text: "The APIs and the registry are described. How does the access table from chapter 1 become code?",
        },
      ],
    },
    {
      id: "s4-identity",
      title: "One provider serves three accounts, and each binding names a subject",
      goal: "How does the access table become Terraform, and which job may act as which account?",
      blocks: [
        {
          kind: "p",
          text: "`identity.tf` is the longest file. It holds seven service accounts, one Workload Identity Federation provider and every grant between them. You met the allow-list in chapter 1 as `ACCESS` in `identity.py`. The file says the same thing in Terraform, and a test compares the two.",
        },
        {
          kind: "compare",
          caption: "The seven accounts. Roles are shown without the roles/ prefix.",
          columns: ["Account", "Who uses it", "Project roles"],
          rows: [
            ["askpep-run", "The Cloud Run service", "aiplatform.user, cloudsql.client, cloudtrace.agent, logging.logWriter, modelarmor.user"],
            ["askpep-job", "The ingest job", "cloudsql.client, logging.logWriter"],
            ["askpep-tasks", "Cloud Tasks, when it calls the service", "none"],
            ["askpep-deploy", "The pipeline of chapter 6", "artifactregistry.writer, run.developer"],
            ["askpep-eval", "The eval gate", "aiplatform.user"],
            ["askpep-canary", "The rollout judge of chapter 7", "cloudsql.client, logging.viewer"],
            ["askpep-plan", "The plan in CI", "ten read-only roles, and the state bucket"],
          ],
        },
        {
          kind: "p",
          text: "Two resources do most of the work. One `google_service_account` loops over a map of account ids to display names. The file keeps that map in a **local**, which is a named value that any file in the folder can read.",
        },
        {
          kind: "p",
          text: "The other is `google_project_iam_member`. It loops over every pair of account and role. Use that one. It adds a single grant and leaves every other grant alone.",
        },
        {
          kind: "p",
          text: "Never use `google_project_iam_policy` or `google_project_iam_binding` here. They replace the grants they cover. One mistake in either can remove every person's access to the project. The tests refuse these two and three more like them.",
        },
        {
          kind: "p",
          text: "In chapter 8 of course 4 you made the pool `github` and the provider `askpep-repo` by hand. Terraform now owns them, so the file imports both. The provider holds the lock, which is its condition. The token's repository must equal yours. A token from any other repository gets no further.",
        },
        {
          kind: "p",
          text: "The condition is an expression over the token, written in CEL, Google's expression language. In it, `assertion` is the token, so `assertion.repository` is the repository claim. A condition that is too wide lets in repositories that aren't yours. One that is too narrow turns away your own jobs.",
        },
        {
          kind: "widget",
          id: "cloud02-subject-match",
          intro:
            "Five conditions follow, each the way a teammate might write the provider's lock. The first is the one in `identity.tf`, with owner slash askpep standing for your repository. For each one, predict who gets a token. Then read what the provider does with each sample job.",
        },
        // CHECK: these are the default subject forms in GitHub's OIDC reference. A repository that customises its subject template presents other strings. Read the sub claim of a real token before you trust a binding.
        {
          kind: "p",
          text: "Chapter 1 showed how a token's subject names the job. A branch job presents `repo:owner/askpep:ref:refs/heads/main`. A job in an environment presents `repo:owner/askpep:environment:production`, with no branch. The provider copies the subject into `google.subject` and the repository into `attribute.repository`. The grants match on those two.",
        },
        {
          kind: "p",
          text: "A grant of `roles/iam.workloadIdentityUser` lets an identity act as the account. As in chapter 1, a principal set covers every token from your repository, and a principal names one subject.",
        },
        {
          kind: "p",
          text: "The eval and plan accounts only read, so each takes a principal set for the whole repository. The deploy account changes the project, so it takes two principals and no set. One is the main branch, for the build job, which sets no environment. The other is the `production` environment, for the deploy and rollout jobs.",
        },
        {
          kind: "code",
          lang: "hcl",
          code: `# The member of the two single bindings of askpep-deploy.
member = "principal://iam.googleapis.com/\${google_iam_workload_identity_pool.github.name}/subject/repo:\${var.github_repo}:ref:refs/heads/main"
member = "principal://iam.googleapis.com/\${google_iam_workload_identity_pool.github.name}/subject/repo:\${var.github_repo}:environment:production"

# The member of the one binding shared by askpep-eval and askpep-plan.
member = "principalSet://iam.googleapis.com/\${google_iam_workload_identity_pool.github.name}/attribute.repository/\${var.github_repo}"`,
          caption: "The two forms of member. The first two lines each belong to their own resource.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "A job in an environment drops its branch",
          text: "The deploy job runs on main, yet its token names the environment and not the branch. Bind only the branch and the job is refused. Bind both forms, and no principal set. The environment form still names no branch, so a rule on the GitHub environment must limit it to main. Chapter 6 sets that rule.",
        },
        {
          kind: "p",
          text: "Two more grants finish the file. The deploy account starts revisions and jobs as other accounts. It needs `roles/iam.serviceAccountUser` on `askpep-run`, `askpep-job` and `askpep-canary`, and on no other account. The plan account holds `roles/storage.objectViewer` on the state bucket, and that grant sits on the bucket, not the project.",
        },
        // CHECK: that roles/storage.objectViewer is enough for `terraform init` and a plan with -lock=false, and that the ten read roles let a plan refresh every resource in the course. A 403 in the first CI plan names any missing permission. The budget read needs roles/billing.viewer on the billing account, which no project grant can give. Chapter 8 adds the budget and that one grant.
        {
          kind: "p",
          text: "The plan account also needs to read a budget in chapter 8. A budget lives on the billing account, and a project role can't reach it. That chapter adds the budget and the one grant that the plan account needs to read it.",
        },
        {
          kind: "p",
          text: "Five imports adopt what you made by hand: the accounts `askpep-run`, `askpep-job` and `askpep-eval`, the pool and the provider. Nothing imports `askpep-tasks`. No earlier chapter made it, so Terraform creates it, and an import for it would fail the first plan.",
        },
        {
          kind: "p",
          text: "The files now describe the whole access plan. How do you know what they will do before they do it?",
        },
      ],
    },
    {
      id: "s5-plan",
      title: "A replace line deletes a real object, so read before you apply",
      goal: "How do you read a plan, and which line must stop you?",
      blocks: [
        {
          kind: "p",
          text: "`outputs.tf` is short. It prints five values: the provider name, the emails of the deploy, eval and plan accounts, and the registry path for images. Each of the first four becomes a GitHub secret. Write it now, and then you can run a real plan.",
        },
        {
          kind: "p",
          text: "First learn to read a plan. Each resource in it has a mark. A plus sign means create. A tilde means update in place. A minus sign means destroy. Both together mean replace, which is a destroy and then a create. The summary line counts all four.",
        },
        {
          kind: "p",
          text: "Terraform replaces a resource when you change an attribute that the API can't change on a live object. The plan says `must be replaced`, and tags the attribute with `forces replacement`. Replacing a service account breaks every grant it holds. Replacing a secret deletes its value.",
        },
        {
          kind: "p",
          text: "An imported resource often shows an update in place. Your file sets a description or a display name that your hand-made object lacks. Read each tilde line. A new description is harmless. A changed condition on the provider needs a second look.",
        },
        // CHECK: that a secret's replication can't change in place, so changing it forces replacement, and that `gcloud secrets create` defaults to automatic replication. Read the google_secret_manager_secret page and `gcloud secrets create --help`.
        {
          kind: "p",
          text: "Here is the case that matters most. The four secrets from chapter 14 of course 1 use automatic replication, which is what `gcloud secrets create` gives by default. In chapter 4, `secrets.tf` will ask for replication in one region. A live secret can't change its replication. The plan would replace each one, and the apply would delete its value.",
        },
        {
          kind: "p",
          text: "The fix is a `lifecycle` block with `ignore_changes = [replication]`. It tells Terraform to leave that field alone on a resource that already exists. The four old secrets keep their automatic replication, and the two new secrets get the region. You need the rule now, because it decides how safe an import is.",
        },
        {
          kind: "code",
          lang: "hcl",
          code: `resource "google_secret_manager_secret" "askpep" {
  # ...
  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }

  lifecycle {
    ignore_changes = [replication]
  }
}`,
          caption: "From the capstone's secrets.tf, which chapter 4 writes. You don't write it yet.",
        },
        {
          kind: "widget",
          id: "cloud02-plan-reader",
          intro:
            "Four sample plans follow. They are hand-written to show the shape, and none comes from a real run. For each one, decide whether to apply, stop, or fix a file first. Look for a tilde, a replace line or an error before you choose.",
        },
        {
          kind: "p",
          text: "Three commands come before the plan. `terraform init` downloads the provider and connects the backend. `terraform fmt` rewrites your files to the standard layout. `terraform validate` checks the syntax and the references without calling Google.",
        },
        // CHECK: the plan wording in the widget above and in the step below, the summary counts, and the claim that an apply over a grant that already exists adds nothing. The counts of 6 to import, 53 to add and 3 to change were worked out by hand from the capstone's files, and nobody has run this plan. Also check that an entry in terraform.tfvars for a variable no file declares only warns, that an imported resource shows a new display name, description or condition as an in-place update, that `gcloud auth application-default login` is the login the provider reads, and that `terraform output -raw` prints a bare string.
        {
          kind: "step",
          id: "cloud02-s02",
          title: "Run the first plan",
          text: "Do this after lab step 5. Copy the tfvars example, and fill in your project, repository, email and budget. Terraform may warn about three variables that later chapters declare. Log in once with application default credentials. Then initialise and plan. A plan creates nothing. The flag `-chdir=infra/terraform` keeps you in your workspace root.",
          lang: "bash",
          code: `cp infra/terraform/terraform.tfvars.example infra/terraform/terraform.tfvars
gcloud auth application-default login
terraform -chdir=infra/terraform init -backend-config="bucket=your-project-id-tfstate"
terraform -chdir=infra/terraform fmt -recursive
terraform -chdir=infra/terraform validate
terraform -chdir=infra/terraform plan`,
          expect:
            "Sample output, counted by hand from the capstone's files and not from a run. The summary reads: Plan: 6 to import, 53 to add, 3 to change, 0 to destroy. Your counts may differ. Read every tilde line, and look for 0 to destroy.",
        },
        {
          kind: "p",
          text: "An import block works once. After the first apply has put the object in the state, the block has nothing left to do. The capstone's comment in `registry.tf` says to delete the block then, in a separate commit.",
        },
        {
          kind: "p",
          text: "Keep the blocks while you do this lab, because the tests read them. The four secret imports in chapter 4 stay longer, until the cutover in chapter 5.",
        },
        // CHECK: that creating the accounts, grants and API entries costs nothing, and that the apply leaves an existing project grant alone. FACTS.md holds neither. Read the IAM and Service Usage pricing pages.
        {
          kind: "step",
          id: "cloud02-s03",
          title: "Apply once",
          text: "Do this only when the plan shows 0 to destroy and you can explain each line. The apply creates accounts, grants and API entries, and adopts the six objects you imported. None of that costs money. If the plan lists a destroy, stop and read why. Type yes only when you are sure.",
          lang: "bash",
          code: `terraform -chdir=infra/terraform apply
terraform -chdir=infra/terraform output`,
          expect:
            "Sample output, not from a run: Apply complete! Resources: 6 imported, 53 added, 3 changed, 0 destroyed. The outputs follow, with your own project id in each value.",
        },
        {
          kind: "fold",
          tone: "trouble",
          title: "Do not run terraform destroy on this project",
          text: "The command `terraform destroy` removes everything Terraform manages. After these imports, that includes the registry with its images, and the accounts your live service runs as. To make Terraform forget a resource and leave the real object, run `terraform state rm` with the resource's address.",
        },
        {
          kind: "quiz",
          id: "cloud02-q5",
          question:
            "You import the four secrets from course 1, and your file asks for replication in one region. The plan says `must be replaced`. What do you do?",
          options: [
            "Apply. A replace keeps the secret's value.",
            "Apply, then delete the import blocks.",
            "Stop. Add `ignore_changes = [replication]` to the resource, and plan again.",
            "Stop. Delete the four secrets by hand, then apply.",
          ],
          answer: 2,
          explain:
            "A replace destroys the secret and creates a new, empty one, so the value is lost. Ignoring the replication field keeps each live secret as it is. Deleting them yourself would lose the values just the same.",
        },
        {
          kind: "p",
          text: "You can read a plan on your own machine. How does a reviewer read one on a pull request?",
        },
      ],
    },
    {
      id: "s6-plan-in-ci",
      title: "A plan in CI reads and never writes, so a person applies",
      goal: "How does a plan run in CI without any way to write?",
      blocks: [
        {
          kind: "p",
          text: "`terraform.yml` runs when a pull request changes `infra/terraform`. The `check` job runs `terraform fmt -check`, then `init` with no backend, then `validate`. It needs no cloud credentials, because it never reads the state. The `plan` job starts only when `check` passes.",
        },
        {
          kind: "p",
          text: "The capstone's copy also runs on a push to main, so the log shows the plan for what merged. The lab needs only the pull request.",
        },
        // CHECK: action versions. The capstone uses actions/checkout@v4, hashicorp/setup-terraform@v3 and google-github-actions/auth@v2. Confirm the current major version of each.
        {
          kind: "p",
          text: "The `plan` job signs in as `askpep-plan` with the action `google-github-actions/auth`. It is the only job that may ask GitHub for an identity token, so it alone has `id-token: write`. The default token of every job can only read the repository.",
        },
        // CHECK: that -lock=false is right for a plan account that holds only roles/storage.objectViewer on the bucket. Read what `terraform plan` needs from the backend.
        {
          kind: "p",
          text: "It then runs `terraform init` with the bucket name built from `TF_VAR_project_id`. After that comes `terraform plan -input=false -lock=false`. The first flag stops Terraform asking a question that nobody can answer in CI. The second skips the state lock, because `askpep-plan` may read the bucket and may not write to it.",
        },
        {
          kind: "p",
          text: "A plan writes no state, so two plans at once are harmless. An apply does write, so it keeps the lock.",
        },
        {
          kind: "p",
          text: "The project reaches the script through the job's `env`, and the shell reads it. Never write a GitHub expression inside a `run` script. GitHub pastes the value into the script before the shell starts, so a value with a quote in it can run as a command. The tests fail any `run` text that holds one.",
        },
        {
          kind: "p",
          text: "A pull request from a fork gets no secrets and no identity token. So the plan job skips it, with an `if` that compares the head repository with this one. A skipped plan is not a clean plan. Tell the reviewer when it happens.",
        },
        {
          kind: "p",
          text: "There is no apply job, on purpose. `askpep-plan` can only read, and no workflow in this repository holds the rights to create accounts and grants. A person applies from their own machine, after reading the plan on the pull request. The one dangerous step then has a person in front of it.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "A green plan job can still list a destroy",
          text: "A plan exits with success even when it would delete things, so the check turns green either way. The reviewer has to open the log and read the summary line. Look for 0 to destroy, as you did on your own machine.",
        },
        {
          kind: "step",
          id: "cloud02-s04",
          title: "Give the plan job its inputs",
          text: "Do this after lab step 6. Print the plan account's email, and add it as the secret `GCP_PLAN_SERVICE_ACCOUNT`. The secrets `GCP_WORKLOAD_IDENTITY_PROVIDER` and `GOOGLE_CLOUD_PROJECT` came from chapter 8 of course 4, and the provider's name hasn't changed. Add two repository variables, `ALERT_EMAIL` and `BUDGET_AMOUNT`. Variables sit beside secrets in the repository settings.",
          lang: "bash",
          code: "terraform -chdir=infra/terraform output -raw plan_service_account",
          expect: "An email that starts with askpep-plan@ and ends with your project id and .iam.gserviceaccount.com.",
        },
        // CHECK: that GitHub passes a missing variable as an empty string, and that Terraform ignores a TF_VAR environment variable for a variable no file declares. The workflow already sets three TF_VAR entries for variables that chapter 8 declares.
        {
          kind: "step",
          id: "cloud02-s05",
          title: "Watch the plan job on a pull request",
          text: "Do this after the secrets and variables are set. Add one comment line to `infra/terraform/variables.tf`, push the branch and open a pull request. The plan job reads the state as `askpep-plan` and creates nothing in Google Cloud. If it fails with a 403, the message names the permission that the account lacks.",
          lang: "bash",
          code: `git switch -c plan-in-ci
git add infra/terraform/variables.tf
git commit -m "Trigger the plan job"
git push -u origin plan-in-ci`,
          expect:
            "Sample result, not from a run: the check job passes, and the plan job ends with No changes. Your infrastructure matches the configuration, because you applied first.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Bringing a console-built setup under Terraform comes up in interviews",
          text: "Bringing a console-built setup under Terraform comes up in interviews. Answer first: import before you change anything. Write each resource as it exists, import it, and read the plan until it shows nothing to destroy. Say where the state lives, which is a remote, locked, private bucket. Then name the hazards: a field that forces replacement, and a plan that nobody read.",
        },
        {
          kind: "quiz",
          id: "cloud02-q6",
          question: "Why does the plan job run with `-lock=false`?",
          options: [
            "The Cloud Storage backend has no locking.",
            "A lock would make the apply wait for the plan.",
            "Two plans on one state always corrupt it.",
            "The plan account can read the state bucket but not write to it, and a plan writes no state.",
          ],
          answer: 3,
          explain:
            "Taking a lock means writing an object to the bucket, and `askpep-plan` holds only a read role there. A plan changes no state, so skipping the lock costs nothing. An apply keeps the lock.",
        },
        {
          kind: "p",
          text: "The pipeline can plan, and a person applies. What did AskPEP's own first plan say?",
        },
      ],
    },
    {
      id: "s7-first-plan",
      title: "AskPEP's first plan listed one destroy, and a person caught it",
      goal: "What does a first plan look like, and what do you record about it?",
      blocks: [
        {
          kind: "p",
          text: "A first plan is a review, and the record says who read it and what they found. A plan proves nothing about the live project until a person has read every tilde line and every destroy. Write that reading down, because the next person will trust it.",
        },
        {
          kind: "p",
          text: "Here is how AskPEP's first plan went. The plan counts in this story are invented, and the lab's own 6, 53, 3 and 0 were counted by hand from the files.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "On Tuesday you imported the six hand-made objects. You ran the plan on the pilot project, and it read 6 to import, 54 to add, 3 to change and 1 to destroy.",
            "You opened the one destroy. It was the registry, because the file had `repository_id` set to `askpep-images`, and the real name is `askpep`.",
            "The security reviewer read the line and said, \"That deletes every image the pilot runs. Who approved that?\" Nobody had, because nobody had applied it.",
            "You corrected the file and planned again on Wednesday. It read 6 to import, 53 to add, 3 to change and 0 to destroy.",
            "You read the three tilde lines. Two were display names on accounts and one was a description on the provider. The condition on the provider didn't change.",
            "You applied from your own machine. The four new accounts now exist, and `audit_impersonation` ran for the first time and found nothing.",
          ],
        },
        {
          kind: "code",
          lang: "text",
          code: `# FIRST-PLAN  Wednesday 16 December 2026
Applied by: engineering, from a laptop. Read by: security reviewer.

First run, Tuesday:  6 to import, 54 to add, 3 to change, 1 to destroy
Cause: registry repository_id said askpep-images. The real name is askpep.
Fixed in the file. Nothing was applied on Tuesday.

Second run, Wednesday: 6 to import, 53 to add, 3 to change, 0 to destroy

To import (6)
  askpep-run  askpep-job  askpep-eval  pool github
  provider askpep-repo  registry askpep

To change (3)
  askpep-run display name             label only
  askpep-job display name             label only
  provider askpep-repo description    label only, condition unchanged

Added: 4 accounts, 19 API entries, all grants between them.

After apply
  audit_impersonation on askpep-deploy   0 findings
  Terraform destroy has not been run on this project.

Not yet in Terraform: the service, the queue, the database, the secrets.
Those come in the next two days.`,
          caption: "The record of AskPEP's first plan. Every figure in it is invented.",
        },
        {
          kind: "p",
          text: "Read the two summary lines first, because their difference is the whole story. One destroy became zero, and the cause sits underneath. The change list shows that each tilde is a label, and it names the one attribute that would have mattered. The last line says what the plan doesn't cover yet.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# FIRST-PLAN  <date>
Applied by:
Read by:

First run:
Cause of any destroy or replace:
Final run:

To import:
To change, and why each is harmless:
Added:

After apply, audit results:
Not yet in Terraform:`,
          caption: "For your next import: fill this in before anyone applies the plan.",
        },
        {
          kind: "p",
          text: "The access and the registry are in Terraform. Where does the service itself run, and with which settings?",
        },
      ],
    },
  ],
  lab: {
    title: "Write the Terraform base of AskPEP",
    goal: "Write six pieces of Terraform, each from a stub of comments. Until you write one, its tests fail with `NotImplementedError: cloud-02 step N`. The tests read your files as data, so they need no Terraform or Google account. Run them from your workspace root, then compare with `capstone/infra/terraform/`. The live test (`-m live`) needs `terraform` on your PATH.",
    minutes: 120,
    files: [
      "infra/terraform/versions.tf",
      "infra/terraform/variables.tf",
      "infra/terraform/apis.tf",
      "infra/terraform/registry.tf",
      "infra/terraform/identity.tf",
      "infra/terraform/outputs.tf",
      ".github/workflows/terraform.yml",
      "tests/cloud/test_cloud02_terraform.py",
    ],
    steps: [
      {
        title: "Pin the tools and point the state at the bucket",
        text: "Write `versions.tf`. Require Terraform 1.9 or later, and pin the google provider below its next major version. Set the Cloud Storage backend with the prefix `askpep` and no bucket. Point the provider at `var.project_id` and `var.region`, with no credentials. Add `billing_project` and `user_project_override = true` as well. The stub holds only comments.",
        code: `# infra/terraform/versions.tf
terraform {
  required_version = ">= 1.9"

  required_providers {
    google = {
      source = "hashicorp/google"
      # your turn: pin the major version with ~>, such as "~> 7.0". Read the current release on
      # registry.terraform.io, and say so in a CHECK comment.
      version = "..."
    }
  }

  backend "gcs" {
    # your turn: set the prefix to "askpep". Leave the bucket out, because init supplies it.
  }
}

provider "google" {
  # your turn: take the project and the region from the two variables. Put no credentials here.
  # Set billing_project to var.project_id, and set user_project_override to true.
}`,
        test: "uv run pytest tests/cloud -k cloud02_s1",
      },
      {
        title: "Write the inputs",
        text: "Write `variables.tf` with seven variables, each with a type and a description. Your project, repository, email and budget have no default. Validate `budget_amount` above zero. Validate `github_repo` with `can(regex(...))`, so that a quote can't widen the lock. The tests try values that must fail.",
        code: `# infra/terraform/variables.tf
variable "project_id" {
  type        = string
  description = "The Google Cloud project that holds every AskPEP resource."
}

# your turn: write region, image, db_tier, budget_amount, github_repo and alert_email.
# Give each a type and a description. Defaults: region is europe-west3, image is
# "us-docker.pkg.dev/cloudrun/container/hello", and db_tier starts with "db-". The rest have none.
#
# budget_amount: a validation block whose condition is var.budget_amount > 0.
# github_repo: a validation block whose condition is can(regex("...", var.github_repo)). The pattern
# accepts owner/name, with letters, digits, dots, dashes and underscores on each side of one slash.
# Both validations need an error_message.`,
        test: "uv run pytest tests/cloud -k cloud02_s2",
      },
      {
        title: "Enable the APIs and adopt the registry",
        text: "Write `apis.tf` and `registry.tf`. One `google_project_service` loops over all 19 APIs and never turns one off. The repository `askpep` waits for that resource, and an `import` block adopts the one you made in course 1. Keep the import block, because a test reads it.",
        code: `# infra/terraform/apis.tf
locals {
  services = [
    "cloudresourcemanager.googleapis.com",
    "serviceusage.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "sts.googleapis.com",
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "sqladmin.googleapis.com",
    "compute.googleapis.com",
    "servicenetworking.googleapis.com",
    "cloudtasks.googleapis.com",
    "aiplatform.googleapis.com",
    "modelarmor.googleapis.com",
    "billingbudgets.googleapis.com",
    "monitoring.googleapis.com",
    "logging.googleapis.com",
    "cloudtrace.googleapis.com",
    "iap.googleapis.com",
  ]
}

# your turn: resource "google_project_service" "enabled", with for_each = toset(local.services).
# Set project, service = each.value, and disable_on_destroy = false.


# infra/terraform/registry.tf
# your turn: resource "google_artifact_registry_repository" "askpep". It is a DOCKER repository with
# repository_id "askpep", in var.project_id and var.region, and it depends_on the API resource.
# Then the import block from the chapter, to adopt the repository.`,
        test: "uv run pytest tests/cloud -k cloud02_s3",
      },
      {
        title: "Write identity as code",
        text: "Write `identity.tf`: seven accounts with their roles, the pool and provider with a lock on your repository, and the grants for GitHub. Eval and plan take the whole repository. Deploy takes two single subjects. Add the plan account's read of the state bucket, and imports for what you built by hand.",
        code: `# infra/terraform/identity.tf
locals {
  accounts = {
    askpep-run    = "AskPEP service"
    askpep-job    = "AskPEP ingest job"
    askpep-tasks  = "AskPEP Cloud Tasks caller"
    askpep-deploy = "AskPEP deploys from GitHub"
    askpep-eval   = "AskPEP eval gate from GitHub"
    askpep-canary = "AskPEP canary judge"
    askpep-plan   = "AskPEP terraform plan from GitHub"
  }

  # your turn: project_roles maps each account id to its list of roles. Copy it from ACCESS in
  # src/askpep/identity.py. A test compares the two.
  project_roles = {}
}

# your turn, in this order:
# 1. google_service_account "askpep": for_each over local.accounts, account_id = each.key, and
#    depends_on the API resource.
# 2. google_project_iam_member "grants": one entry for each pair of account and role. Flatten
#    project_roles into a list of objects, then build a map for for_each.
# 3. google_iam_workload_identity_pool "github", and the provider "askpep_repo": the GitHub issuer
#    https://token.actions.githubusercontent.com, the two attribute mappings, and a condition that
#    pins var.github_repo.
# 4. google_service_account_iam_member for askpep-eval and askpep-plan: a principalSet for the
#    whole repository.
# 5. Two more for askpep-deploy: a principal for the main branch, and one for the production
#    environment. Never a principalSet.
# 6. google_service_account_iam_member: askpep-deploy holds roles/iam.serviceAccountUser on
#    askpep-run, askpep-job and askpep-canary.
# 7. google_storage_bucket_iam_member: askpep-plan holds roles/storage.objectViewer on the bucket
#    named for var.project_id plus -tfstate.
# 8. Five import blocks: the accounts askpep-run, askpep-job and askpep-eval, the pool and the provider.`,
        test: "uv run pytest tests/cloud -k cloud02_s4",
      },
      {
        title: "Name the values you copy out",
        text: "Write `outputs.tf` with five outputs: the provider name, the three account emails and the image repository path. Give each a description that says where the value goes. An output may name only resources that your files declare, and a test checks that. With `-m live`, a test also runs `terraform fmt` and `validate`.",
        code: `# infra/terraform/outputs.tf
output "workload_identity_provider" {
  description = "Set as the GitHub secret GCP_WORKLOAD_IDENTITY_PROVIDER."
  value       = google_iam_workload_identity_pool_provider.askpep_repo.name
}

# your turn: write deploy_service_account, eval_service_account and plan_service_account. Each is
# the email of one account from the google_service_account resource.
#
# Then image_repository: REGION-docker.pkg.dev/PROJECT/askpep/askpep, built from the registry
# resource's location and repository_id and from var.project_id.`,
        test: "uv run pytest tests/cloud -k cloud02_s5",
      },
      {
        title: "Plan in CI and apply nowhere",
        text: "Write `.github/workflows/terraform.yml`. A check job runs `fmt`, `init -backend=false` and `validate`. A plan job signs in as `askpep-plan` and plans. Nothing applies. Give only the plan job `id-token: write`, skip forks, and keep every GitHub expression out of `run` scripts.",
        code: `# .github/workflows/terraform.yml
name: terraform

on:
  pull_request:
    paths:
      - infra/terraform/**
      - .github/workflows/terraform.yml

permissions:
  contents: read

jobs:
  check:
    # your turn: ubuntu-latest, with infra/terraform as the default working directory. Steps:
    # checkout, hashicorp/setup-terraform, then fmt -check -recursive, init -backend=false, validate.

  plan:
    needs: check
    # your turn: if skips a pull request whose head repository is not this one. Add permissions of
    # contents: read and id-token: write. Pin every action to a version.
    env:
      TF_VAR_project_id: \${{ secrets.GOOGLE_CLOUD_PROJECT }}
      TF_VAR_github_repo: \${{ github.repository }}
      TF_VAR_alert_email: \${{ vars.ALERT_EMAIL }}
      TF_VAR_budget_amount: \${{ vars.BUDGET_AMOUNT }}
      # These three feed variables that chapter 8 declares. Until then Terraform ignores them.
      TF_VAR_billing_account: \${{ vars.BILLING_ACCOUNT }}
      TF_VAR_iap_members: \${{ vars.IAP_MEMBERS || '[]' }}
      TF_VAR_kill_switch: \${{ vars.KILL_SWITCH }}
    # your turn, in steps: checkout, google-github-actions/auth with the secrets
    # GCP_WORKLOAD_IDENTITY_PROVIDER and GCP_PLAN_SERVICE_ACCOUNT, setup-terraform, then
    #   terraform init -input=false -backend-config="bucket=\${TF_VAR_project_id}-tfstate"
    #   terraform plan -input=false -lock=false`,
        test: "uv run pytest tests/cloud -k cloud02_s6",
      },
    ],
    verify: "uv run pytest tests/cloud -k cloud02",
  },
  recap: [
    "State records the real object behind each resource, so it lives in a private, versioned bucket that a script creates first.",
    "A backend block can't read a variable, so `terraform init` supplies the bucket with `-backend-config`.",
    "An import block adopts an object you made by hand, and the first plan shows what Terraform would still change.",
    "A replace line means destroy and then create, so stop on it. `ignore_changes = [replication]` keeps the four hand-made secrets alive.",
    "A job in an environment presents the environment subject, so `askpep-deploy` binds to two subjects. A rule on the GitHub environment limits the second one to main.",
    "The plan in CI runs as a read-only account with no lock and no apply job, and a person applies after reading it.",
    "AskPEP's first plan listed one destroy. A person caught it, and the record says so.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. I can bring a hand-built cloud project under Terraform, and read a plan well enough to stop a destroy before it runs.",
  interviewIds: ["cloud-q14", "cloud-q27", "cloud-q28"],
};

export default chapter;
