import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "cloud-04-cloud-sql-and-secrets",
  course: "cloud",
  number: 4,
  title: "Secrets live in Secret Manager and reach the service as references",
  tagline: "Put the database on a private address, give the service its keys as references, and cut over without losing the second team.",
  minutes: 73,
  objectives: [
    "Name the four stops of the private path.",
    "Say what each instance setting protects.",
    "Follow a key from Secret Manager into the service.",
    "Explain why each migration must be additive.",
    "Order the apply in three passes.",
    "Write a cutover note that records what affected people agreed.",
  ],
  sections: [
    {
      id: "s1-private-path",
      title: "A private address keeps the database off the internet, and the service needs a subnet",
      goal: "What are the four stops of the private path, and what does each one do?",
      blocks: [
        {
          kind: "p",
          text: "The service reaches Cloud SQL through a subnet and a private address, and it never holds a key in a file. It is Friday 18 December. You built the pilot's instance by hand in course 1, with a public address and a Unix socket that Cloud Run mounts at `/cloudsql`. Chapter 3 wrote `run.tf` with no such mount.",
        },
        // CHECK: that a revision whose startup probe fails never becomes ready and takes no traffic. The probe path
        // /health is set in run.tf, and /health runs SELECT 1 in api.py.
        {
          kind: "callout",
          tone: "warn",
          title: "Do not deploy the new service before the private IP exists",
          text: "Chapter 3 told you to wait. The new revision has no socket, and its startup probe runs a query through `/health`. With no path to the database, the probe fails and the revision never takes traffic. The private IP and the new `DATABASE_URL` in this chapter unblock the deploy. Apply them first, in the order of the last section.",
        },
        {
          kind: "p",
          text: "A private path has four stops. The first is a network for the service. A **VPC** is a private network inside your project. A **subnet** is a block of addresses in one region of it. With **Direct VPC egress**, a Cloud Run instance takes one address from a subnet and sends its traffic from there.",
        },
        {
          kind: "p",
          text: "The second stop is Google's side. Cloud SQL doesn't run inside your VPC. Google runs it in a network of its own. **Private services access** joins the two. You reserve a range of private addresses that Google may use. Then you make a **peering connection**, which lets two networks reach each other's private addresses.",
        },
        {
          kind: "p",
          text: "The third stop is the instance. Name your network in its `ip_configuration` block, and Cloud SQL gives the instance an address from the reserved range. That is its **private IP**, and only machines on your network can reach it. Setting `ipv4_enabled = false` removes the public address.",
        },
        {
          kind: "p",
          text: "The fourth stop is the URL. The service reads `DATABASE_URL` from a secret named `askpep-database-url`, which a later section covers. The host in that URL must be the private address. A URL that still names the socket points at a file that no longer exists.",
        },
        // CHECK: that a Cloud SQL instance can take a private address only when private services access exists on the
        // network, and that Terraform needs the peering connection built before the instance. The depends_on line is
        // the capstone's own choice in sql.tf.
        {
          kind: "code",
          lang: "hcl",
          code: `# In the instance block of sql.tf, inside settings
ip_configuration {
  ipv4_enabled    = false
  private_network = google_compute_network.askpep.id
}

# At the top level of the same instance block
depends_on = [google_service_networking_connection.private_services]`,
          caption: "The instance's part of the path. The depends_on line makes Terraform build the peering connection first.",
        },
        // CHECK: that a Direct VPC egress setting of PRIVATE_RANGES_ONLY sends only traffic to private ranges through
        // the subnet, and that the range reserved for private services counts as a private range.
        {
          kind: "p",
          text: "You won't edit `run.tf` or `job.tf`. Both read a local value named `vpc`, and while it is null they add no network. Step 1 of the lab fills it. The service and the job then join the subnet. Their setting `PRIVATE_RANGES_ONLY` sends only private traffic through it, so calls to public addresses go out as before.",
        },
        {
          kind: "widget",
          id: "cloud04-private-path",
          intro: "Each card describes one setup of the private path. Predict the first stop that fails, or say that the connection works. After you answer, the card marks all four stops and says what you would see.",
        },
        {
          kind: "quiz",
          id: "cloud04-q1",
          question: "`google_service_networking_connection` is in the Terraform, and the instance has a private IP. What does the connection do?",
          options: [
            "It lets the Cloud Run service open a connection to the instance.",
            "It joins your network to Google's network for managed services, using the reserved range, so the instance can take a private address.",
            "It encrypts the traffic between the service and the instance.",
            "It opens the instance to the internet through its private address.",
          ],
          answer: 1,
          explain:
            "Cloud SQL runs in a network that Google owns. The peering connection joins it to yours, and the reserved range supplies the addresses. The subnet is what lets the service onto your side. The connection adds no encryption and no public access.",
        },
        {
          kind: "p",
          text: "The path to the instance is drawn. What must the instance itself protect?",
        },
      ],
    },
    {
      id: "s2-instance",
      title: "The instance needs two deletion locks, point-in-time recovery and no user in Terraform",
      goal: "Which settings protect the instance, and why does Terraform make no database user?",
      blocks: [
        {
          kind: "p",
          text: "`sql.tf` adopts the instance `askpep-pg` and the database `askpep` from chapter 14 of course 1. Both keep their names, and `import` blocks pull them into Terraform without a rebuild. Chapter 2 showed how an import works. The instance runs PostgreSQL 17 on the Enterprise edition. Its machine tier comes from the variable `db_tier`.",
        },
        // CHECK: that POSTGRES_17, the ENTERPRISE edition and db-f1-micro work together. DEPLOY.md and sql.tf carry the same CHECK.
        // CHECK: that Cloud SQL for PostgreSQL supports pgvector, and that the shared-core tiers are outside the Cloud SQL
        // service level agreement.
        {
          kind: "p",
          text: "pgvector needs no setting. Migration 001 runs `CREATE EXTENSION IF NOT EXISTS vector`, and Cloud SQL supports the extension. The default tier is `db-f1-micro`, the smallest shared-core tier. It sits outside the Cloud SQL service level agreement, so treat it as a learning size.",
        },
        // CHECK: FACTS.md open question 4. Nobody has built the HNSW index of migration 002 on db-f1-micro. The fallback
        // tier db-g1-small is the capstone's own choice in variables.tf. Confirm that tier exists and fits the build.
        {
          kind: "p",
          text: "No one has built the HNSW index of migration 002 on that tier. The corpus is small, so it should work, but that is a guess. If the build fails, set `db_tier` to `db-g1-small` and apply again.",
        },
        {
          kind: "p",
          text: "The instance has two deletion locks. They are separate settings, and you need both.",
        },
        {
          kind: "compare",
          caption: "The two deletion locks. Each one blocks a different way in.",
          columns: ["Setting", "Where it sits", "What it blocks"],
          rows: [
            ["`deletion_protection = true`", "On the Terraform resource.", "`terraform destroy`, and any apply that would delete the instance."],
            ["`deletion_protection_enabled = true`", "In the `settings` block, so Cloud SQL holds it.", "A delete through the API, the console or `gcloud`."],
          ],
        },
        {
          kind: "p",
          text: "Terraform's lock never reaches someone working in the console. Cloud SQL's lock lives in the instance, so it holds against anyone who calls the API. To delete the instance on purpose, turn both locks off, apply, and then delete.",
        },
        // CHECK: point-in-time recovery on a shared-core tier, and that start_time is in UTC. sql.tf carries the same CHECK.
        {
          kind: "p",
          text: "The `backup_configuration` block turns on a daily backup at 02:00 and point-in-time recovery. Recovery keeps the database's change log, so you can restore to a chosen minute. A backup alone restores only to its own time. A restore rolls back every table, including LangGraph's checkpoints, as chapter 4 of course 6 said. Chapter 8 comes back to backups.",
        },
        {
          kind: "p",
          text: "Terraform makes the instance and the database. It makes no database user. A user needs a password, and anything Terraform writes ends up in the state file that chapter 2 keeps in a Cloud Storage bucket. Anyone who can read that bucket can read the password.",
        },
        {
          kind: "p",
          text: "So the user `askpep` stays as chapter 14 of course 1 made it. Its password goes only into the secret `askpep-database-url`.",
        },
        {
          kind: "quiz",
          id: "cloud04-q2",
          question: "A teammate adds a `google_sql_user` resource with a password to `sql.tf`. What is wrong with that?",
          options: [
            "Cloud SQL doesn't let Terraform make users.",
            "A user can't connect to an instance that has a private address.",
            "Terraform replaces the password on every plan.",
            "The password lands in the Terraform state file, and anyone who can read the state bucket can read it.",
          ],
          answer: 3,
          explain:
            "Terraform stores every attribute it manages in the state file, a password included. A user made by hand, with the password kept in Secret Manager, keeps it out. The other three options describe limits that don't exist.",
        },
        {
          kind: "p",
          text: "Terraform has no password. How does the service get one, and its other five keys?",
        },
      ],
    },
    {
      id: "s3-secret-references",
      title: "A secret reaches the service as a reference, so nothing stores the value",
      goal: "How does one key get from Secret Manager into the running service?",
      blocks: [
        {
          kind: "p",
          text: "Chapter 14 of course 1 stored four keys in Secret Manager and made the grants by hand. This section brings them into Terraform. A secret has **versions**, and each version holds one value that never changes. To rotate a key, you add a version. The name `latest` points at the newest one.",
        },
        // CHECK: that Cloud Run reads a secret reference with the service's own account, and does so when an instance starts.
        // CHECK: that the version name latest points at the newest enabled version of a secret.
        {
          kind: "p",
          text: "Cloud Run takes a secret as a **reference**, which is a secret name and a version. The Terraform writes `secret_key_ref` with a `secret` and a `version`. The plan shows a name and no value. Cloud Run reads the value with the service's own account when an instance starts, and sets it as an environment variable.",
        },
        {
          kind: "p",
          text: "So the value never enters your repository, your state file or your image. The Terraform names the secret, and Secret Manager holds what is in it.",
        },
        {
          kind: "compare",
          caption: "Six secrets, and who reads them. The service reads all six. The ingest job embeds and never generates, so it reads two.",
          columns: ["Variable", "Secret", "Service", "Job"],
          rows: [
            ["`API_KEY`", "`askpep-api-key`", "yes", "no"],
            ["`PRINCIPALS`", "`askpep-principals`", "yes", "no"],
            ["`DATABASE_URL`", "`askpep-database-url`", "yes", "yes"],
            ["`VOYAGE_API_KEY`", "`voyage-api-key`", "yes", "yes"],
            ["`ANTHROPIC_API_KEY`", "`anthropic-api-key`", "yes", "no"],
            ["`LANGSMITH_API_KEY`", "`langsmith-api-key`", "yes", "no"],
          ],
        },
        {
          kind: "p",
          text: "The table comes from two locals in `secrets.tf`. `secret_env` maps each variable to a secret, and `job_secret_env` does the same for the job. One resource with `for_each` makes all six secrets from the values of `secret_env`.",
        },
        {
          kind: "p",
          text: "Naming a secret doesn't let the service read it. The grants are the ones from chapter 14 of course 1, `roles/secretmanager.secretAccessor` on each secret. Terraform writes them in a loop. `askpep-run` gets six and `askpep-job` gets two.",
        },
        {
          kind: "p",
          text: "The accounts that deploy, plan, run the eval gate or enqueue tasks get none. A grant on the whole project would let an account read every secret, now and later. Step 3 of the lab rejects it.",
        },
        {
          kind: "p",
          text: "Terraform creates the six secrets and no versions. You add each value by hand, once, with `gcloud secrets versions add`. A revision whose secret has no version fails, so every value must exist before the first apply that starts a revision.",
        },
        // CHECK: that Terraform stores secret_data of a google_secret_manager_secret_version in state even when the value is
        // marked sensitive, and that a disabled version stops access. The widget header carries the same CHECK.
        {
          kind: "p",
          text: "Terraform can write a version too. The resource `google_secret_manager_secret_version` takes the value in an attribute named `secret_data`. Marking that value sensitive hides it from the plan output, and the state file still holds it. You can also disable a version, which stops anyone reading it. The next card tests these facts.",
        },
        {
          kind: "widget",
          id: "cloud04-secret-reference",
          intro: "Each card is one change to the way the service gets its keys. Predict what happens. After you answer, the card marks the cells that went wrong.",
        },
        {
          kind: "p",
          text: "Every secret has a replication policy. It says where Google keeps the copies of the value. The two new secrets use `user_managed`, with one replica in `var.region`. chapter 14 of course 1 made the other four with automatic replication, so Google chooses the places.",
        },
        // CHECK: that the replication policy of a Secret Manager secret can't change after creation, so the Google provider
        // plans to destroy and recreate a secret whose policy differs. STEPS.md note 17 and secrets.tf make the same claim.
        {
          kind: "p",
          text: "Replication can't change on an existing secret. If the Terraform says `user_managed` and the real secret says automatic, the provider plans to destroy the secret and make a new one. The value goes with it.",
        },
        {
          kind: "p",
          text: "The block `lifecycle { ignore_changes = [replication] }` stops that. It sits on all six secrets, which does no harm to the two new ones. The `import` blocks adopt the four old secrets, and `ignore_changes` keeps them as they are.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "The four old secrets are not in your region",
          text: "The block protects the values and leaves four secrets with automatic replication. If a client needs the data kept in the EU, those four are a gap. Chapter 5 explains the fix, which is new secrets and a copy of each value.",
        },
        {
          kind: "p",
          text: "The live check for step 3 reads the region of the two new secrets only, so it passes while the four stay as they are. A pass says nothing about the four.",
        },
        {
          kind: "quiz",
          id: "cloud04-q4",
          question: "`voyage-api-key` exists with automatic replication, and `secrets.tf` says `user_managed`. What stops the first apply from destroying it?",
          options: [
            "`lifecycle { ignore_changes = [replication] }` on the secret.",
            "The `import` block, which keeps the secret as it is.",
            "The `secretAccessor` grant on the secret.",
            "Nothing. Secret Manager changes replication in place.",
          ],
          answer: 0,
          explain:
            "The import only brings the secret under Terraform's care. The next plan still compares replication and wants a change. `ignore_changes` tells Terraform to leave that field alone. Without it, the change destroys the secret and its values.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Rotating a leaked key comes up in interviews",
          text: "Rotating a leaked key comes up in interviews. Answer first: rotate it and keep the service up. Add a new secret version, start a new revision so every instance reads it, then disable the old version. Check the logs for use you don't recognise. Then change the design. Keys live in Secret Manager as references, and only the accounts that need a secret can read it.",
        },
        {
          kind: "p",
          text: "The keys have a safe route. How does the schema change while the old code keeps serving?",
        },
      ],
    },
    {
      id: "s4-migrations-job",
      title: "The migrations job must leave the running revision working",
      goal: "What does the job run, and why must each migration be additive?",
      blocks: [
        {
          kind: "p",
          text: "Chapter 3 wrote the job `askpep-ingest`. It runs `askpep migrate && askpep ingest --fetch`. This chapter gives it what it lacked: a subnet to reach the private IP, and two secrets, `DATABASE_URL` and `VOYAGE_API_KEY`. Its account, `askpep-job`, reads those two and no others.",
        },
        {
          kind: "p",
          text: "`askpep migrate` does two things. It applies each SQL file in `migrations/` that the table `schema_migrations` doesn't list, with one transaction for each file. Then it calls LangGraph's `setup`, which creates the checkpoint and store tables. Run it again and it prints `up to date`.",
        },
        {
          kind: "p",
          text: "Your cloud database was last migrated in chapter 14 of course 1, so it lacks the later migrations. The first run of the job applies them and creates LangGraph's tables. The job can do this because it already has the network path and the secrets.",
        },
        // CHECK: that a user made with gcloud sql users create joins cloudsqlsuperuser. DEPLOY.md and sql.tf carry the same
        // CHECK. Migration 001 needs the role for CREATE EXTENSION on a fresh instance.
        {
          kind: "fold",
          tone: "trouble",
          title: "A fresh instance may refuse migration 001",
          text: "Your database already has the vector extension from chapter 14 of course 1, so you won't hit this. On a brand new instance, migration 001 runs `CREATE EXTENSION`, which needs the role `cloudsqlsuperuser`. Nobody has confirmed that a user made with `gcloud` has it. On a permission error, grant the role to `askpep` from a `postgres` session.",
        },
        {
          kind: "p",
          text: "A migration runs while the old revision still serves. The pipeline in chapter 6 runs the job before each deploy, so for a while the new schema meets the old code. A migration is safe only if the old code keeps working on the new schema.",
        },
        {
          kind: "p",
          text: "Migration 006 shows the safe shape. It adds columns to `traces`, and each column is nullable or has a default. The old revision's insert into `traces` names none of them, and Postgres fills them in. Nothing breaks.",
        },
        {
          kind: "p",
          text: "Two shapes break the old code. A rename makes the old name vanish. A dropped column removes data the old code reads. Split such a change over two releases. Add the new thing first, and remove the old thing in a later release.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "The service can still change an audit row, so the promised grant is not built here",
          text: "Chapter 6 of course 6 and migration 005 promise that the service gets only insert and read on `audit`. This chapter does not build that. The service connects as `askpep`, which owns every table, so it can still change an audit row. A narrower user would need its own secret and a grant made by hand.",
        },
        {
          kind: "quiz",
          id: "cloud04-q5",
          question: "A migration renames `chunks.text` to `chunks.body` while the old revision is still serving. What happens to its next search?",
          options: [
            "Nothing, because Postgres keeps both names.",
            "Its queries that name `text` fail until the new revision takes over.",
            "The migration waits until the old revision stops.",
            "Postgres rewrites the old queries to use `body`.",
          ],
          answer: 1,
          explain:
            "A rename removes the old name at once, and the old revision still uses it. The additive version adds `body`, copies the data, and drops `text` in a later release, after no revision reads it.",
        },
        {
          kind: "p",
          text: "Each piece is now safe on its own. In what order can they be applied?",
        },
      ],
    },
    {
      id: "s5-three-passes",
      title: "The apply runs in three passes, because two hand steps sit inside it",
      goal: "In which order does the apply run, so that nothing deploys before its database exists?",
      blocks: [
        {
          kind: "p",
          text: "Terraform can't pause for a hand step, and two hand steps matter here. Two secrets need values before a revision starts. The database URL needs an address that exists only after the instance does. So you apply in three passes, and the service comes last.",
        },
        // CHECK: that Cloud Run reaches an instance with only a private address through VPC egress alone, so the RAG
        // chapter 14 service, which has no subnet, loses the database once the public address goes. CHECK: that removing
        // the public address, or adding the private network, may restart the instance.
        {
          kind: "callout",
          tone: "warn",
          title: "The move cuts the old service off",
          text: "The first change to the instance removes its public address, and Cloud SQL may restart it. The service from chapter 14 of course 1 has no subnet, so from that moment it can't reach the database. Plan a gap. On a learning project with no users, the gap costs nothing. The new revision in pass 3 ends it.",
        },
        // CHECK: the price of db-f1-micro in europe-west3, and the prices of the network pieces and of Secret Manager. FACTS.md
        // holds none, so the chapter quotes none. CHECK: that the provider's activation_policy defaults to ALWAYS, which would
        // start a stopped instance on the next apply. CHECK: the gcloud flag --activation-policy, and that a stopped
        // instance stops instance charges while storage charges continue.
        {
          kind: "callout",
          tone: "insight",
          title: "The instance is the cost, and a stop does not last",
          text: "A `db-f1-micro` instance bills while it runs. This chapter quotes no price, so check the Cloud SQL pricing page for `europe-west3`. Check the network pieces and Secret Manager there too. To pause, run `gcloud sql instances patch askpep-pg --activation-policy=NEVER`. A stopped instance stops instance charges, and storage charges carry on. The next `terraform apply` may start it again.",
        },
        {
          kind: "callout",
          tone: "insight",
          title: "Tearing the instance down takes four steps",
          text: "Turn both locks off in `sql.tf`, and apply. Then run `terraform destroy` with the flag `-target=google_sql_database_instance.askpep`. Without the target, the command removes everything Terraform manages. Secrets stay until you delete them with `gcloud secrets delete`.",
        },
        // CHECK: the gcloud and terraform commands in the steps below, against the current references: secrets versions add,
        // sql instances describe with the value format, run jobs execute with --wait, and terraform apply with -target.
        {
          kind: "step",
          id: "cloud04-s01",
          title: "Read the plan before you apply anything",
          text: "Do this after lab step 3. Run a plan on `infra/terraform` and read it. Imports show as will be imported. No secret, no instance and no database should say destroy or must be replaced. If one does, stop and read why.",
          lang: "bash",
          code: "terraform -chdir=infra/terraform plan",
          expect: "A plan with no destroy and no replace on a secret, the instance or the database. This describes what to look for. It is not recorded output.",
        },
        {
          kind: "step",
          id: "cloud04-s02",
          title: "Pass 1: make the secrets and their grants",
          text: "Target the two grant resources. Terraform builds what they depend on, which is the secrets and the accounts, and nothing more. The target flag is for exceptions, and a hand step inside one plan is one. Terraform warns that the apply may be incomplete. That warning is expected.",
          lang: "bash",
          code: "terraform -chdir=infra/terraform apply -target=google_secret_manager_secret_iam_member.run -target=google_secret_manager_secret_iam_member.job",
          expect: "Terraform asks you to type yes, and then ends with Apply complete. This describes the output. It is not recorded output.",
        },
        {
          kind: "step",
          id: "cloud04-s03",
          title: "Add the two values that don't exist yet",
          text: "The four older secrets already hold values from chapter 14 of course 1. Add a first version to the two new ones. Take both values from your `.env` file, and set them as shell variables first. If you don't trace with LangSmith, store the word unused, because tracing stays off unless `LANGSMITH_TRACING` is true.",
          lang: "bash",
          code: `printf %s "$PRINCIPALS" | gcloud secrets versions add askpep-principals --data-file=-
printf %s "$LANGSMITH_API_KEY" | gcloud secrets versions add langsmith-api-key --data-file=-`,
          expect: "Each command prints a line that starts Created version. This is sample output, not a recorded run.",
        },
        {
          kind: "step",
          id: "cloud04-s04",
          title: "Pass 2: build the network and move the instance",
          text: "Target the database. Terraform builds what it depends on: the instance, the peering connection, the reserved range and the network. The subnet waits for pass 3. This pass removes the public address and may restart the instance. Your RAG service loses the database now. Wait for the apply to finish.",
          lang: "bash",
          code: "terraform -chdir=infra/terraform apply -target=google_sql_database.askpep",
          expect: "Terraform ends with Apply complete. This describes the output. It is not recorded output.",
        },
        {
          kind: "step",
          id: "cloud04-s05",
          title: "Point the database URL at the private address",
          text: "Read the instance's private address, and add a new version of `askpep-database-url` with it as the host. The first line copies the password out of the current version, because a fresh shell has no `DB_PASSWORD`. It keeps the password as stored, so a password that chapter 14 of course 1 percent-encoded stays encoded.",
          lang: "bash",
          code: `DB_PASSWORD="$(gcloud secrets versions access latest --secret=askpep-database-url | sed -E 's|^postgresql://askpep:([^@]*)@.*|\\1|')"
PRIVATE_IP="$(gcloud sql instances describe askpep-pg --format='value(ipAddresses[0].ipAddress)')"
printf %s "postgresql://askpep:\${DB_PASSWORD}@\${PRIVATE_IP}:5432/askpep" | gcloud secrets versions add askpep-database-url --data-file=-`,
          expect: "The second command prints a line that starts Created version. This is sample output, not a recorded run.",
        },
        // CHECK: the default SSL mode of a Cloud SQL instance, and that a private connection can carry sslmode=require without
        // a client certificate.
        {
          kind: "fold",
          tone: "hood",
          title: "A private address does not encrypt the connection",
          text: "Traffic on a private IP stays off the internet. The instance may still accept unencrypted connections, because its SSL mode decides that. To ask for encryption, add `?sslmode=require` to the URL. Check the SSL mode of your instance before you rely on either.",
        },
        {
          kind: "step",
          id: "cloud04-s06",
          title: "Pass 3: deploy the service and the job, then run the migrations",
          text: "Apply everything. The service and the job get their subnet and their secrets, and the new revision reads the new URL. This is the deploy that chapter 3 told you to wait for. Then run the job. The first run applies your missing migrations, and its log prints `applied:` with their names. A second run prints `up to date`.",
          lang: "bash",
          code: `terraform -chdir=infra/terraform apply
gcloud run jobs execute askpep-ingest --region europe-west3 --wait`,
          expect: "On the first run the job log shows applied: and the migration names. On the second it shows up to date. Both strings come from the migrate command. This is not a recorded run.",
        },
        {
          kind: "step",
          id: "cloud04-s07",
          title: "Check that the service reaches the database",
          text: "Call `/health`. It runs one query against the database, so an answer of ok proves the whole path. A revision that can't reach the database fails the same call as its startup probe and never takes traffic. If that happened, go back to the first card.",
          lang: "bash",
          code: `curl -s "$(terraform -chdir=infra/terraform output -raw service_url)/health"`,
          expect: "Sample output: {\"status\":\"ok\"}. This is the body that the code returns when the query works. It is not a recorded run.",
        },
        {
          kind: "fold",
          tone: "trouble",
          title: "The new revision fails its startup probe after pass 3",
          text: "The probe calls `/health`, so the database is unreachable. Check four things in this order. First, that `latest` of `askpep-database-url` is the new version. Second, that the password in it is percent-encoded. Third, that `local.vpc` is set, so the service has a subnet. Fourth, that the instance shows a private address and no public one.",
        },
        {
          kind: "p",
          text: "You know the three passes. What did they look like on the day AskPEP had real users?",
        },
      ],
    },
    {
      id: "s6-cutover",
      title: "The cutover cost the second team 24 minutes and closed two conditions",
      goal: "What do you write down when a change cuts off real users, and what else closed that day?",
      blocks: [
        {
          kind: "p",
          text: "A cutover note says what you agreed with the people affected, and when each hand step happened. It is short, and it is written while the apply runs. The second team was still on the pilot, so the database gap was theirs. The review kept their documents and routes unchanged, and this cutover keeps that promise.",
        },
        {
          kind: "p",
          text: "Here is how the Friday went. The times, counts and test results are invented.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "The second team's lead said, \"Not in our morning. Do it after 18:00 Frankfurt, once my people have gone.\" You agreed the window on Wednesday.",
            "You ran the three passes. The public address went at 18:09, and the service had the database back at 18:33.",
            "Engineering shipped T11 to staging the same day. That is four days after the date the review set. Retention deletes rows by age, and redaction runs at write.",
            "The security reviewer ran the retention job on staging and checked one old row was gone. They said, \"That's T11 closed, on staging only. Production gets it with the pipeline.\"",
            "The answer-success window closed at the end of the day. From 11 to 18 December there were 1,000 requests and 46 failures.",
            "You added that to the first four days. That makes 84 failures in 1,800 requests, which is 0.9533, and the target allows 90 failures.",
          ],
        },
        {
          kind: "code",
          lang: "text",
          code: `# CUTOVER-NOTE  Friday 18 December 2026
Window agreed with: second team's lead, after 18:00 Frankfurt.
Applied by: engineering. Watching: security reviewer.

Pass 1, secrets and grants                 18:04
Hand step, two secret values added         18:07
Pass 2, instance to private address        18:21  (public address gone 18:09)
Hand step, new database URL version        18:23
Pass 3, service, job, migrations           18:33
/health answered ok                        18:33

Gap for the second team: 18:09 to 18:33, 24 minutes. No users in the window.
Documents, chunks and routes: unchanged. Live store still 488 chunks.

Conditions at close of Friday 18 December
T11 retention and redaction on staging   closed 18 December, 4 days late
Answer-success at 0.95 for two weeks     closed
  7 to 10 December    800 requests   38 failed
  11 to 18 December   1,000 requests 46 failed
  Total               1,800          84 failed = 0.9533 (allows 90)
ADR 0007 in code                         closed 17 December
Model Armor run live, classifier note    open, Monday 21 December

18 December was the earliest date. It is gone, and the third team knew on Monday.`,
          caption: "The cutover note and the conditions on 18 December. Every time and count is invented.",
        },
        {
          kind: "p",
          text: "Read the gap line first, because it is what the second team will ask about. Then read the conditions as a table of what's still open. Three of four are closed, and the file shows each date. The T11 row says four days late, and writing that down costs nothing.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "T11 exists only in the story",
          text: "The capstone has redaction helpers for logs and traces, and it has no retention job. It doesn't redact at write either. Your lab database keeps every row for ever. If your own project promises a retention period, you still have to build the job that keeps the promise.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# CUTOVER-NOTE  <date>
Window agreed with:
Applied by:      Watching:

Each pass and hand step, with its time:

Gap for users:
What stayed unchanged:

Conditions at close of day:
Condition   Status   Date   Evidence`,
          caption: "For your next cutover: write this during the apply, while the times are still true.",
        },
        {
          kind: "p",
          text: "One condition remains open, and three things in the review were never measured. Can the model run where the contract says, with quota enough for 1,000 requests a day?",
        },
      ],
    },
  ],
  lab: {
    title: "Build the private network, the instance and the secrets",
    goal: "Write three Terraform files for the network, the instance and the six secrets. Chapter 1 pulled the stubs and installed Terraform and `gcloud`. The tests read your files as data, so nothing calls Google. Run them from your AskPEP workspace root, then compare with `capstone/infra/terraform/`. Two live checks, `cloud04_s2` and `cloud04_s3`, run only with `-m live`.",
    minutes: 75,
    files: [
      "infra/terraform/network.tf",
      "infra/terraform/sql.tf",
      "infra/terraform/secrets.tf",
      "tests/cloud/test_cloud04_sql_and_secrets.py",
    ],
    steps: [
      {
        title: "Build a private network",
        text: "Write `network.tf`. It holds the network `askpep`, the subnet `askpep-run`, a reserved range for private services, the peering connection that uses it, and the local value `vpc`. The subnet is a `/26` or larger and lets instances without public addresses reach Google APIs. The stub sets `vpc = null`.",
        // CHECK: that Direct VPC egress asks for a subnet of /26 or larger. The test and network.tf carry the same CHECK.
        code: `# infra/terraform/network.tf
resource "google_compute_network" "askpep" {
  project = var.project_id
  name    = "askpep"
  # your turn: a custom network, so auto_create_subnetworks is false, and it waits for the APIs
}

resource "google_compute_subnetwork" "run" {
  # your turn: name askpep-run, the region from var.region, on the network above,
  # a private range of /26 or larger, and private_ip_google_access on
}

resource "google_compute_global_address" "private_services" {
  # your turn: name askpep-private-services, purpose VPC_PEERING, address_type INTERNAL,
  # a prefix_length of 16, on the network above
}

resource "google_service_networking_connection" "private_services" {
  # your turn: the network above, the service servicenetworking.googleapis.com,
  # and reserved_peering_ranges set to the name of the range
}

locals {
  # your turn: replace the stub's null with an object that has a network and a subnetwork
  vpc = null
}`,
        test: "uv run pytest tests/cloud -k cloud04_s1",
      },
      {
        title: "Move Cloud SQL to a private IP",
        text: "Write `sql.tf`. Adopt the instance `askpep-pg` and the database `askpep` with `import` blocks. The instance has a private address and no public one, both deletion locks, and daily backups with point-in-time recovery. It waits for the peering. Add the two outputs. Make no user and set no password.",
        // CHECK: that POSTGRES_17, the ENTERPRISE edition and db-f1-micro work together, and point-in-time recovery on a shared-core tier.
        code: `# infra/terraform/sql.tf
resource "google_sql_database_instance" "askpep" {
  project = var.project_id
  name    = "askpep-pg"
  region  = var.region
  # your turn: database_version POSTGRES_17, and the Terraform lock deletion_protection on

  settings {
    # your turn: tier from var.db_tier, edition ENTERPRISE, availability_type ZONAL, disk_size 10,
    # and the Cloud SQL lock deletion_protection_enabled on
    ip_configuration {
      # your turn: no public address, and the private network from network.tf
    }
    backup_configuration {
      # your turn: backups enabled, point-in-time recovery on, and a start_time such as "02:00"
    }
  }
  # your turn: depends_on the peering connection
}

resource "google_sql_database" "askpep" {
  # your turn: the database askpep, on the instance above
}

# your turn: the outputs instance_connection_name and database_private_ip, and two import blocks.
# The id of the instance is projects/<project>/instances/askpep-pg.
# The id of the database adds /databases/askpep to that.
# Add no google_sql_user, no random_password and no password of any kind.`,
        test: "uv run pytest tests/cloud -k cloud04_s2",
      },
      {
        title: "Mount six secrets by reference",
        text: "Write `secrets.tf`. Fill `secret_env` with six variables and `job_secret_env` with two. One `for_each` resource makes the secrets in your region and ignores replication changes. Grant `secretAccessor` per secret, six for `askpep-run` and two for `askpep-job`. Import the four secrets from chapter 14 of course 1. Write no value.",
        code: `# infra/terraform/secrets.tf
locals {
  # your turn: secret_env maps API_KEY, PRINCIPALS, DATABASE_URL, VOYAGE_API_KEY,
  # ANTHROPIC_API_KEY and LANGSMITH_API_KEY to askpep-api-key, askpep-principals,
  # askpep-database-url, voyage-api-key, anthropic-api-key and langsmith-api-key.
  secret_env = {}

  # your turn: job_secret_env holds DATABASE_URL and VOYAGE_API_KEY, with the same secret names.
  job_secret_env = {}
}

resource "google_secret_manager_secret" "askpep" {
  # your turn: for_each over toset(values(local.secret_env)) and secret_id = each.value.
  # Replication is user_managed with one replica in var.region.
  # A lifecycle block ignores changes to replication, and the secret waits for the APIs.
}

resource "google_secret_manager_secret_iam_member" "run" {
  # your turn: for_each over the six ids. The role is roles/secretmanager.secretAccessor.
  # The member is the service account askpep-run, from identity.tf.
}

resource "google_secret_manager_secret_iam_member" "job" {
  # your turn: the same for the two ids of job_secret_env, for the account askpep-job.
}

# your turn: four import blocks, one for each secret that chapter 14 of course 1 made:
# askpep-api-key, askpep-database-url, voyage-api-key and anthropic-api-key.
# The id of each is projects/<project>/secrets/<name>.`,
        test: "uv run pytest tests/cloud -k cloud04_s3",
      },
    ],
    verify: "uv run pytest tests/cloud -k cloud04",
  },
  recap: [
    "A private path has four stops. The service needs a subnet, the network needs a peering connection, the instance needs a private IP, and the URL needs to name it.",
    "The instance carries two deletion locks and point-in-time recovery. Terraform makes no database user, because the state file would hold the password.",
    "A secret reaches Cloud Run as a name and a version, so the value never enters your repository, state file or image.",
    "Each account gets `secretAccessor` on the secrets it reads and on no others.",
    "`ignore_changes` on replication keeps the four old secrets and their values, and leaves them outside your region.",
    "Apply in three passes: the secrets, then the instance, then the service.",
    "AskPEP's cutover cost the second team 24 minutes. T11 and answer-success closed the same day, and T11's jobs exist only in the story.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. I can move a live database behind a private address, and agree the outage with the people it affects before I start.",
  interviewIds: ["cloud-q02", "cloud-q10", "cloud-q31"],
};

export default chapter;
