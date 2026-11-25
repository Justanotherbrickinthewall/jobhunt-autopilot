import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "cloud-06-delivery-pipeline",
  course: "cloud",
  number: 6,
  title: "The eval gate runs before any traffic shifts",
  tagline: "One workflow tests, grades, builds and deploys a revision that takes no traffic.",
  minutes: 63,
  objectives: [
    "Name the four jobs and what each one waits for.",
    "Read the header and the test job of `deploy.yml`.",
    "Explain why the gate sets the model and the region itself.",
    "Say which account each job uses and what lets Google trust it.",
    "Follow an image to a tagged revision that takes no traffic.",
    "Run the pipeline once and know how to stop the spend.",
    "Record what stopped a first run as well as what passed.",
  ],
  sections: [
    {
      id: "s1-four-jobs",
      title: "The pipeline is four jobs, and the order decides what a red job protects",
      goal: "What are the four jobs, and what does each one wait for?",
      blocks: [
        {
          kind: "p",
          text: "The next change reaches production through one workflow, so nobody types a deploy command again. It is Tuesday 22 December. Until now you have deployed by hand. In chapter 14 of course 1 you built an image on your laptop and pushed it yourself. This chapter hands that work to a **workflow**.",
        },
        {
          kind: "p",
          text: "A workflow is one YAML file under `.github/workflows` that GitHub Actions runs when something happens, such as a push to `main`.",
        },
        {
          kind: "p",
          text: "A workflow holds **jobs**. Each job runs on its own fresh machine, called a **runner**, with a clean Linux system on it. A job lists steps, and the steps run in order. Jobs run side by side unless one says `needs` another. Then it waits, and it starts only if that job passed.",
        },
        {
          kind: "p",
          text: "The AskPEP pipeline has four jobs. `test` runs the offline checks. `eval-gate` scores the live desk. `build` makes the container image and pushes it to Artifact Registry, where chapter 14 of course 1 put yours. `deploy` puts a new revision on Cloud Run. A revision is one frozen copy of the service, with its image and its settings.",
        },
        {
          kind: "compare",
          caption: "The four jobs of `deploy.yml`, with what each one waits for and what its failure stops.",
          columns: ["Job", "Waits for", "What a red job stops"],
          rows: [
            ["`test`", "Nothing", "The other three jobs. None of them starts."],
            ["`eval-gate`", "`test`", "The migration and the deploy. The build still runs."],
            ["`build`", "`test`", "The deploy, because there is no image to ship."],
            ["`deploy`", "`build` and `eval-gate`", "Nothing. It is the last job."],
          ],
        },
        {
          kind: "code",
          lang: "yaml",
          code: `jobs:
  test:
    runs-on: ubuntu-latest
  eval-gate:
    needs: test
  build:
    needs: test
  deploy:
    needs: [build, eval-gate]`,
          caption: "Only the `needs` lines are shown. The other keys come later in the chapter.",
        },
        {
          kind: "p",
          text: "Look at the `needs` lines. `eval-gate` and `build` both wait for `test`, so they run side by side. The build doesn't wait for the gate. An image that nobody deploys is harmless, and running both at once saves time.",
        },
        {
          kind: "p",
          text: "`deploy` waits for both jobs. Its first act is a **migration**, which changes the tables of the production database. Deleting an image can't undo that. So the gate must pass before `deploy` begins. That is the point of this chapter. The gate sits before the migration, and so before any traffic.",
        },
        {
          kind: "quiz",
          id: "cloud06-q1",
          question: "The `eval-gate` job fails while `build` passes. What state is the project in?",
          options: [
            "A new revision serves traffic with the old image, because the build finished first.",
            "Nothing reached the project at all, because a red job cancels the whole run.",
            "An image sits in the registry that nothing uses, and production is unchanged.",
            "The migration ran, and the old revision still serves, because the build job finished.",
          ],
          answer: 2,
          explain:
            "The build runs beside the gate, so it pushed its image. The deploy needs both jobs, so neither the migration nor the revision started. The unused image is harmless, and you can delete it later.",
        },
        {
          kind: "p",
          text: "You know the jobs and their order. What decides who can start this workflow at all?",
        },
      ],
    },
    {
      id: "s2-header-and-tests",
      title: "The workflow starts on main, reads only code and runs one deploy at a time",
      goal: "Who can start a deploy, and what may the workflow touch?",
      blocks: [
        {
          kind: "p",
          text: "The top of the file decides who can start a deploy and what the workflow may touch. It has four parts. Here is the whole header, as the capstone has it.",
        },
        // CHECK: every action version in this chapter (checkout v4, setup-uv v6, auth v2, setup-gcloud v2, upload-artifact v4) comes from the capstone's workflow comments. FACTS.md names none of them. Confirm the current major version of each.
        {
          kind: "code",
          lang: "yaml",
          code: `name: deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: deploy
  cancel-in-progress: false

env:
  REGION: europe-west3
  SERVICE: askpep
  REPOSITORY: askpep`,
          caption: "The header of `deploy.yml`.",
        },
        {
          kind: "p",
          text: "The `on` block lists the triggers. A push to `main` starts the workflow. So does a person pressing the run button, which GitHub calls `workflow_dispatch`. A pull request starts nothing, because this workflow can change production.",
        },
        // CHECK: a pull_request run uses the workflow file from the merge of the pull request, so a branch can edit the file that runs it. Confirm this in the GitHub Actions events documentation.
        {
          kind: "callout",
          tone: "warn",
          title: "A pull request runs its own copy of the workflow",
          text: "A pull request run reads the workflow file from the pull request itself. Anyone who can open one can edit that file. So `deploy.yml` has no pull request trigger. A lab test checks for it, because a deploy trigger there would let a stranger's edit ask for your identity token.",
        },
        {
          kind: "p",
          text: "`permissions` sets what GitHub's built-in token may do. The value `contents: read` lets a job read the code and nothing more. A job that needs more asks for it inside the job. The gate and the build do that later, to ask GitHub for an identity token.",
        },
        {
          kind: "p",
          text: "`concurrency` puts every run into one group named `deploy`. A second run waits for the first. The line `cancel-in-progress: false` means a newer push never cancels a run that is already going. That matters, because a deploy has a migration in the middle.",
        },
        {
          kind: "p",
          text: "Cancel a run after the migration and before the deploy. The database is then ahead of the code that serves. Waiting costs time. A half-finished deploy costs more. So the pipeline waits.",
        },
        // CHECK: GitHub keeps at most one running and one pending run per concurrency group, and a newer pending run replaces an older one. Confirm in the workflow concurrency documentation.
        {
          kind: "fold",
          tone: "dyk",
          title: "What happens when three pushes arrive together",
          text: "The first push runs. The second waits in the group. A third push replaces the second, so the second never runs. Because every push runs the latest code, the third push covers the second one's changes.",
        },
        {
          kind: "p",
          text: "The last block, `env`, sets three names that every job can read. `REGION`, `SERVICE` and `REPOSITORY` hold `europe-west3`, `askpep` and `askpep`. They must match the Terraform from chapter 2, because the workflow deploys into what Terraform made. A lab test reads both files and fails when they disagree.",
        },
        {
          kind: "p",
          text: "The first job is `test`. It checks out the code, installs the Python packages with `uv sync`, and checks the style with `ruff check` and `ruff format --check`. Then it runs `pytest`, and last the attack gate from chapter 7 of course 3, `askpep redteam --max-asr 0.05`. That gate fails when more than 5 percent of attacks get through.",
        },
        {
          kind: "p",
          text: "The job also starts a Postgres container beside the runner, from an image that includes pgvector. The migrations create the `vector` extension, so plain Postgres would fail. The container is throwaway. It exists for this run and then vanishes, so it has no password and no data worth keeping.",
        },
        {
          kind: "code",
          lang: "yaml",
          code: `  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg17
        env:
          POSTGRES_USER: askpep
          POSTGRES_DB: askpep
          POSTGRES_HOST_AUTH_METHOD: trust
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U askpep"
          --health-interval 3s
          --health-timeout 3s
          --health-retries 20
    env:
      DATABASE_URL: postgresql://askpep@localhost:5432/askpep
      TEST_DATABASE_URL: postgresql://askpep@localhost:5432/askpep
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v6
      - run: uv sync
      - run: uv run ruff check .
      - run: uv run ruff format --check .
      - run: uv run pytest
      - run: uv run askpep redteam --max-asr 0.05`,
          caption: "The test job. It has no secret and no Google sign-in.",
        },
        {
          kind: "p",
          text: "Look at what the job lacks. It holds no secret and no Google identity, because the offline suite runs on fakes. A job with no access can leak none. The health options make the runner wait until Postgres answers. Without them the first test could fail for no reason.",
        },
        {
          kind: "quiz",
          id: "cloud06-q2",
          question: "Why does `deploy.yml` set `cancel-in-progress: false`?",
          options: [
            "It lets two deploys run at once, so a busy day finishes sooner.",
            "It stops a pull request from starting a deploy, because the trigger is checked first.",
            "It lets the eval gate skip itself when the tests pass, which saves paid model calls.",
            "A cancelled run can stop between the migration and the deploy, which leaves the database ahead of the code.",
          ],
          answer: 3,
          explain:
            "A deploy has a migration in the middle. Cancelling there leaves the new schema in place while the old code serves. Letting the older run finish costs waiting time. The `on` block keeps pull requests out, and `concurrency` has no say in that.",
        },
        {
          kind: "p",
          text: "The test job has no access at all. What does the next job need, and what must it grade?",
        },
      ],
    },
    {
      id: "s3-gate-grades-production",
      title: "The gate must grade the model that production runs",
      goal: "Why must the gate set the model and the region itself?",
      blocks: [
        {
          kind: "p",
          text: "The `eval-gate` job runs the gate you built in chapter 8 of course 4, `askpep eval gate --judge`. It scores the live desk against the golden set. The desk calls Gemini on Vertex AI, so the job needs a Google identity. Section 4 covers how it gets one.",
        },
        {
          kind: "p",
          text: "The job also starts a throwaway Postgres, as `test` does. That database is not your Cloud SQL instance. It starts empty, so every run migrates it first.",
        },
        {
          kind: "p",
          text: "Then `askpep ingest --fetch` loads your lab's 18 PEPs again, and only then does the gate run. AskPEP's live store holds 23, so the story's gate loads those. The order is fixed, and a lab test checks it.",
        },
        // CHECK: gemini-3.5-flash in europe-west3. vertex.tf notes that the model page lists Standard PayGo for global, us and eu only, and that nobody has called it from europe-west3 on this account. Make one call there before you rely on this paragraph.
        {
          kind: "p",
          text: "Now the key point. `config.py` sets a default model and a default location for the desk. They are `gemini-3.8-flash` and `global`. Production runs something else. In chapter 5 you set `vertex_env` in Terraform to `gemini-3.5-flash` in `europe-west3`. A gate that set nothing would grade a model that production never serves.",
        },
        {
          kind: "p",
          text: "So the gate job sets two environment variables itself. `DESK_MODEL` is `gemini-3.5-flash`, and `VERTEX_LOCATION` is `europe-west3`. Production gets the same two values from `vertex_env`. The values are written twice, once in Terraform and once in the workflow. Two copies can drift apart.",
        },
        {
          kind: "p",
          text: "The region matters as much as the model. Each region serves its own list of models, and each has its own quota and its own guards, as chapter 5 showed. A pass in `global` says little about `europe-west3`. A gate that grades the wrong place gives you a green tick and no evidence.",
        },
        {
          kind: "p",
          text: "`vertex_env` holds more than the model and the region. It also holds the retry limits for a 429 answer and the Model Armor template, both from chapter 5. The gate copies neither, so it grades the desk without them. A lab test compares the model and the region in `vertex_env` with the gate's settings, and it fails when they differ.",
        },
        {
          kind: "widget",
          id: "cloud06-gate-grades",
          intro:
            "Four versions of the gate job follow. For each one, say whether the gate grades what production runs. Watch the last case. Nothing fails there, and the gate keeps passing on a model that nobody uses.",
        },
        {
          kind: "p",
          text: "The gate has one more neighbour. In chapter 8 of course 4 you put the live gate into `ci.yml`. Each live run calls three paid services, which are Gemini, Voyage and Anthropic, so a merge must not pay for two runs.",
        },
        {
          kind: "p",
          text: "The `if` of both live steps in `ci.yml` already carries a `hashFiles` clause from chapter 8 of course 4. A pull request runs the gate, and a push runs it only while `deploy.yml` is missing. Lab step 3 checks that both lines still carry the clause.",
        },
        // CHECK: GitHub treats a skipped step as a success. Confirm in the Actions documentation on conditions and job status.
        // CHECK: google-github-actions/auth fails the step when an input is empty. Confirm that a missing secret fails the run in deploy.yml and does not skip it.
        {
          kind: "callout",
          tone: "warn",
          title: "A skipped step looks green",
          text: "GitHub counts a skipped step as a success. In `ci.yml` the live steps skip when a secret is missing. Copy that `if` into `eval-gate` and a missing secret turns the gate into a green tick that proves nothing. So `eval-gate` has no `if` at all, and a missing secret fails the run.",
        },
        {
          kind: "quiz",
          id: "cloud06-q3",
          question: "`deploy.yml` exists, and someone deletes the `hashFiles` clause from both live steps in `ci.yml`. What happens on the next push to `main`?",
          options: [
            "Both workflows run the live gate, so one merge pays for two runs.",
            "Only `deploy.yml` runs the live gate, because it is the newer file.",
            "Neither workflow runs the gate, because each one waits for the other.",
            "The push fails, because two workflows can't sign in as `askpep-eval`.",
          ],
          answer: 0,
          explain:
            "Each workflow starts on its own for a push to `main`, and nothing links them. The clause is what makes `ci.yml` skip its live steps once `deploy.yml` exists. Without it, both run. Both runs could sign in as `askpep-eval` at once, so that is no obstacle.",
        },
        {
          kind: "p",
          text: "The gate needs a Google identity, and so do the build and the deploy. Which account does each one take?",
        },
      ],
    },
    {
      id: "s4-identity",
      title: "Each job signs in as its own account, and the environment name is locked",
      goal: "Which account does each job take, and what lets Google trust it?",
      blocks: [
        {
          kind: "p",
          text: "No job holds a key file. Each job hands GitHub's identity token to `google-github-actions/auth`. Google checks it against the pool `github` and the provider `askpep-repo`, then returns a short-lived credential. Chapters 1 and 2 built that lock. This section shows which account each job takes.",
        },
        {
          kind: "p",
          text: "Three accounts face GitHub. `askpep-eval` can call Vertex AI and nothing else. `askpep-plan` can only read, and it runs the Terraform plan. `askpep-deploy` pushes images and deploys to Cloud Run. It may also act as `askpep-run`, `askpep-job` and `askpep-canary`, because a deploy names the account its revision runs as.",
        },
        {
          kind: "compare",
          caption: "The account behind each job, and the GitHub secret that holds the account's name.",
          columns: ["Job", "Signs in as", "Secret with the account name", "What the account may do"],
          rows: [
            ["`test`", "Nobody", "None", "Nothing"],
            ["`eval-gate`", "`askpep-eval`", "`GCP_SERVICE_ACCOUNT`", "Call Vertex AI"],
            ["`build`", "`askpep-deploy`", "`GCP_DEPLOY_SERVICE_ACCOUNT`", "Push images to Artifact Registry"],
            ["`deploy`", "`askpep-deploy`", "`GCP_DEPLOY_SERVICE_ACCOUNT`", "Update Cloud Run and act as the runtime accounts"],
          ],
        },
        {
          kind: "p",
          text: "Chapter 2 bound `askpep-deploy` to two subjects, the main branch and the `production` environment. The `build` job runs with no environment, so it presents the branch. The `deploy` job names the environment, so it presents the environment and drops the branch. A job on a branch called `try-it` presents neither, so `askpep-deploy` refuses it.",
        },
        // CHECK: required reviewers on an environment depend on the repository plan and visibility, and the deployment-branch restriction is a setting on the environment. Confirm both in the GitHub documentation for deployment environments.
        {
          kind: "p",
          text: "That leaves a gap. The environment subject has no branch in it. A job on any branch that names `production` presents the same subject, and Google accepts it. So the branch limit has to live on the environment. In GitHub, restrict `production` to deploy from `main`, and add a required reviewer if your plan allows one.",
        },
        {
          kind: "p",
          text: "`askpep-eval` and `askpep-plan` work differently. Both trust every job in the repository, so each holds a role that can't change anything. The gate in `ci.yml` runs for pull requests and signs in as `askpep-eval`. If that account could deploy, any branch could deploy through it.",
        },
        {
          kind: "quiz",
          id: "cloud06-q4",
          question: "A teammate adds `environment: production` to the `build` job, so a reviewer approves builds too. What happens when the job asks for `askpep-deploy`?",
          options: [
            "Google refuses, because a job with an environment presents no branch and so matches no rule.",
            "Google accepts it, and the job waits for the reviewer, because the subject now names the environment.",
            "Google refuses, because `askpep-deploy` trusts only the job that is called deploy.",
            "Google accepts it, and the reviewer step is skipped because the build job runs first.",
          ],
          answer: 1,
          explain:
            "The account trusts any job whose subject is the production environment, whatever the job is called. The build now presents that subject, so Google accepts it. The environment's rules then apply, so a reviewer must approve before the build starts.",
        },
        {
          kind: "p",
          text: "Each job has its account. How does an image become a revision that serves nobody yet?",
        },
      ],
    },
    {
      id: "s5-no-traffic",
      title: "The image is named by its commit, and the new revision takes no traffic",
      goal: "How does an image become a tagged revision that takes no traffic?",
      blocks: [
        {
          kind: "p",
          text: "The `build` job names the image by the commit. It takes the first seven characters of the commit hash. The image is `askpep` with that short hash as its tag, in the Artifact Registry repository `askpep`. The revision tag is `sha-` followed by the same seven characters. Nothing is ever tagged `latest`.",
        },
        {
          kind: "p",
          text: "A tag that names a commit tells you what runs, and it stays on that commit. `latest` changes on every push. A rollback to `latest` goes back to whatever was pushed last. Chapter 14 of course 1 gave the same rule for the manual deploy. The rollout in chapter 7 also looks revisions up by their `sha-` tag.",
        },
        // CHECK: the ubuntu-latest runner is amd64 and has docker, jq and a curl that supports --retry-all-errors. Confirm in the runner image documentation.
        {
          kind: "p",
          text: "The image is built for amd64, because Cloud Run runs amd64 and an arm64 image fails at start. Chapter 14 of course 1 explained that. The hosted runner is amd64 anyway. The flag keeps the build correct if the runner type ever changes.",
        },
        {
          kind: "p",
          text: "The build hands the image path and the tag to the jobs after it, through its `outputs`. One step writes both into a file that GitHub provides. The job lists them, and `deploy` reads them from the build job.",
        },
        {
          kind: "code",
          lang: "yaml",
          code: `  build:
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    env:
      PROJECT_ID: \${{ secrets.GOOGLE_CLOUD_PROJECT }}
    outputs:
      image: \${{ steps.name.outputs.image }}
      tag: \${{ steps.name.outputs.tag }}
    steps:
      - uses: actions/checkout@v4
      - id: name
        run: |
          short="\${GITHUB_SHA::7}"
          echo "tag=sha-\${short}" >> "$GITHUB_OUTPUT"
          echo "image=\${REGION}-docker.pkg.dev/\${PROJECT_ID}/\${REPOSITORY}/askpep:\${short}" >> "$GITHUB_OUTPUT"
      - uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: \${{ secrets.GCP_WORKLOAD_IDENTITY_PROVIDER }}
          service_account: \${{ secrets.GCP_DEPLOY_SERVICE_ACCOUNT }}
      - uses: google-github-actions/setup-gcloud@v2
      - run: gcloud auth configure-docker "\${REGION}-docker.pkg.dev" --quiet
      - run: docker build --platform linux/amd64 -t "\${{ steps.name.outputs.image }}" .
      - run: docker push "\${{ steps.name.outputs.image }}"`,
          caption: "The build job. It builds and pushes. It never calls `gcloud run`, and a lab test checks that.",
        },
        {
          kind: "p",
          text: "Look at how `PROJECT_ID` reaches the script. The secret goes into `env`, and the script reads a variable. GitHub expands an expression in double curly braces into the script text before the shell starts. Whatever the value holds then becomes shell code.",
        },
        {
          kind: "p",
          text: "A value in `env` arrives as plain data. So a lab test checks that no script holds a secret or an event field. The `terraform.yml` workflow from chapter 2 passes the project the same way.",
        },
        {
          kind: "p",
          text: "The `deploy` job runs in the `production` environment. If that environment has a required reviewer, the job pauses until a person approves. The tests, the gate and the build have all finished by then. The reviewer approves something that already passed.",
        },
        {
          kind: "p",
          text: "Then the job does three things in order. First it points the Cloud Run job `askpep-ingest` at the new image. Second it runs that job and waits for it to end. The job runs `askpep migrate` and then `askpep ingest --fetch`, and both are safe to repeat. Third it deploys the new revision.",
        },
        // CHECK: gcloud run jobs execute --wait returns a non-zero exit code when the execution fails. Confirm, because the deploy relies on it to stop after a failed migration.
        {
          kind: "p",
          text: "The order has a reason. The new image carries the new migrations, so the job takes that image first. The stable revision still serves while the job runs. The migration must therefore leave the old code working.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "A migration runs while the old revision serves",
          text: "The job migrates the production database before the new revision exists. The old revision keeps serving on the new schema. So every migration in this pipeline must work for both versions of the code. Add a column and let the new code use it. Split a rename across two releases.",
        },
        // CHECK: gcloud run deploy --no-traffic creates the revision without moving traffic, and --tag gives it a URL with the tag in the host name. The capstone workflow carries the same note. Read the traffic split after the first deploy.
        {
          kind: "p",
          text: "The deploy command is `gcloud run deploy` with two flags. `--no-traffic` tells Cloud Run to create the revision and send it no requests. `--tag` gives the revision its own URL, with the tag in the host name. The old revision keeps all the traffic.",
        },
        {
          kind: "p",
          text: "Last comes the **smoke test**. It sends one request to `/health` on the tagged URL, with `curl --fail`. Without `--fail`, curl exits cleanly on a 500 answer, and the step would pass for a broken revision. The test retries a few times, because a new revision needs a moment to start.",
        },
        {
          kind: "p",
          text: "The step finds the tagged URL with `jq`, a command line tool that picks fields out of JSON. The hosted runner has it. On your own machine, `brew install jq` adds it. The checks in this chapter and in chapter 7 use it there too.",
        },
        // CHECK: the annotation name run.googleapis.com/iap-enabled and the field names metadata.annotations and status.traffic in the service JSON. Read them from gcloud run services describe askpep --format=json on your own project.
        {
          kind: "p",
          text: "The smoke test has one blind spot. **IAP** is Identity-Aware Proxy, Google's sign-in wall in front of a service, and chapter 8 turns it on for the UI. Curl can't sign in, so `/health` would answer 401 for a good revision. IAP is off until then. When it is on, the step prints why it skipped and exits zero.",
        },
        {
          kind: "p",
          text: "A skip proves nothing about the revision. The message says so in words. When you see it, open the tagged URL in a browser yourself. That check is yours to make.",
        },
        {
          kind: "code",
          lang: "yaml",
          code: `  deploy:
    needs: [build, eval-gate]
    runs-on: ubuntu-latest
    environment: production
    permissions:
      contents: read
      id-token: write
    env:
      IMAGE: \${{ needs.build.outputs.image }}
      TAG: \${{ needs.build.outputs.tag }}
    steps:
      - uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: \${{ secrets.GCP_WORKLOAD_IDENTITY_PROVIDER }}
          service_account: \${{ secrets.GCP_DEPLOY_SERVICE_ACCOUNT }}
      - uses: google-github-actions/setup-gcloud@v2
      - name: Point the ingest job at the new image
        run: gcloud run jobs update askpep-ingest --image "$IMAGE" --region "$REGION"
      - name: Run the migrations
        run: gcloud run jobs execute askpep-ingest --region "$REGION" --wait
      - name: Deploy a revision that takes no traffic
        run: gcloud run deploy "$SERVICE" --image "$IMAGE" --region "$REGION" --no-traffic --tag "$TAG"
      - name: Smoke test the tagged revision
        run: |
          json=$(gcloud run services describe "$SERVICE" --region "$REGION" --format=json)
          iap=$(jq -r '.metadata.annotations["run.googleapis.com/iap-enabled"] // "false"' <<< "$json")
          if [ "$iap" = "true" ]; then
            echo "Smoke test skipped: IAP is on, so curl cannot reach /health. Open the tagged URL in a browser."
            exit 0
          fi
          url=$(jq -r --arg tag "$TAG" '.status.traffic[] | select(.tag == $tag) | .url' <<< "$json")
          test -n "$url"
          curl --fail --silent --show-error --retry 5 --retry-delay 5 --retry-all-errors "$url/health"
      - name: Say what to do next
        run: echo "Revision $TAG has no traffic. Run the rollout workflow with this tag." >> "$GITHUB_STEP_SUMMARY"`,
          caption: "The deploy job, as the capstone has it. The last step writes one line to the run summary.",
        },
        {
          kind: "p",
          text: "The **run summary** is a page that GitHub shows under a finished workflow run. A step writes to it by appending text to the file named in `GITHUB_STEP_SUMMARY`. The last step names the tag and says to run the rollout workflow. Chapter 7 starts from that line.",
        },
        {
          kind: "p",
          text: "The `deploy` job leaves one thing alone. The Cloud Run job `askpep-rollout` judges a **canary**, which is a revision that takes a small share of real traffic. It must judge the new revision from the old code, so a candidate never grades itself. `deploy` doesn't touch it. The rollout workflow in chapter 7 updates it after a promotion.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Deploy pipelines come up in interviews",
          text: "Deploy pipelines come up in interviews. Answer first: tests, then a gate on the live model in the production region, then a build, then a deploy that takes no traffic. Say the gate runs before the migration. Name the account for each job, and say no key file exists. Then admit the limit. The gate samples a fixed dataset, so a canary confirms it.",
        },
        {
          kind: "widget",
          id: "cloud06-pipeline-failures",
          intro:
            "Five runs follow. For each one, predict which jobs ran and what state the project is left in. Keep the order of the jobs in mind. In the last case, someone has copied the clause from `ci.yml` into the gate. Think about what a skipped step does to the run.",
        },
        {
          kind: "quiz",
          id: "cloud06-q5",
          question: "IAP is on, and the smoke test step ends green with the message that it skipped. What should you do next?",
          options: [
            "Nothing more. The green tick means the revision is healthy.",
            "Re-run the job until the message goes away and the test really runs.",
            "Open the tagged URL in a browser and check the revision yourself.",
            "Turn IAP off for the run, so that curl can reach `/health`.",
          ],
          answer: 2,
          explain:
            "A skip exits with zero by design, so the tick says only that the step finished. The revision has had no check. Turning IAP off to satisfy a script removes the protection you added on purpose.",
        },
        {
          kind: "p",
          text: "The workflow is written. What did its first real run do?",
        },
      ],
    },
    {
      id: "s6-first-run",
      title: "One real run proves the pipeline, and you can stop the spend at any point",
      goal: "What does one real run prove, and how do you stop the spend?",
      blocks: [
        {
          kind: "p",
          text: "Nobody has run this pipeline on a live project. The capstone's `deploy.yml` passes its lab tests, and that is all anyone has seen. You will run it first, so read each result yourself. Where this chapter shows output, it is sample output.",
        },
        // CHECK: costs and free allowances. Read the current pricing pages for GitHub Actions minutes on a private repository, Artifact Registry storage, Cloud Run with zero minimum instances, and the model calls of the gate. This chapter gives no price.
        {
          kind: "p",
          text: "A run costs money in four places. The gate calls Gemini, Voyage and Anthropic, and it embeds the corpus on every run. GitHub bills Actions minutes past the free allowance on a private repository. Artifact Registry charges for stored images. A revision with no traffic and no minimum instances has nothing running.",
        },
        // CHECK: the names in the repository settings, Environments, and the branch rule and required reviewer options. The screens change, so read what your own settings page offers.
        {
          kind: "step",
          id: "cloud06-s01",
          title: "Create the production environment",
          text: "Do this after lab step 5. In your repository settings, open Environments and create one named production. Limit deployments to the main branch. Add yourself as a required reviewer if your plan allows one. It costs nothing, and you can delete the environment later.",
          expect: "The environment appears in the settings with a branch rule, and with a reviewer if your plan allowed one.",
        },
        // CHECK: the gh command line. Confirm the flags of gh secret list and gh secret set, and the Homebrew install of gh. Earlier chapters never introduced gh.
        {
          kind: "step",
          id: "cloud06-s02",
          title: "Set the deploy account secret and check that all seven exist",
          text: "`GCP_DEPLOY_SERVICE_ACCOUNT` is new in this chapter, so set it from a Terraform output with `gh`, the GitHub command line. Then list the secrets of your repository, or read the list in your repository settings. You need seven names. Five came from chapter 8 of course 4, and `GCP_PLAN_SERVICE_ACCOUNT` came from chapter 2. The values never print.",
          lang: "bash",
          code: `# If gh is missing: brew install gh, then gh auth login
gh secret set GCP_DEPLOY_SERVICE_ACCOUNT --body "$(terraform -chdir=infra/terraform output -raw deploy_service_account)"
gh secret list`,
          expect: "All seven names appear: ANTHROPIC_API_KEY, GCP_DEPLOY_SERVICE_ACCOUNT, GCP_PLAN_SERVICE_ACCOUNT, GCP_SERVICE_ACCOUNT, GCP_WORKLOAD_IDENTITY_PROVIDER, GOOGLE_CLOUD_PROJECT and VOYAGE_API_KEY.",
        },
        // CHECK: how to install actionlint. The comment below assumes Homebrew on macOS. Use the install section of the actionlint repository for any other system.
        {
          kind: "step",
          id: "cloud06-s03",
          title: "Lint every workflow",
          text: "Run `actionlint` over the workflows, then the one live lab test that runs it for you. It is a linter for workflow files. It reads files and calls nothing, so it costs nothing. Install it first if the command is missing.",
          lang: "bash",
          code: `# brew install actionlint
actionlint
uv run pytest tests/cloud -m live -k cloud06_s5`,
          expect: "The command prints nothing and exits with zero, and the test reports one passed. Without the command on your path, the test reports a skip.",
        },
        // CHECK: gh run watch and gh run list flags. The run may not exist for a few seconds after the push, so wait before the watch.
        // CHECK: gh workflow disable stops a workflow from starting. Confirm that it does not cancel a run that is already going.
        {
          kind: "step",
          id: "cloud06-s04",
          title: "Push once and watch the run",
          text: "Do this only after the chapter 4 lab, because the deploy needs the ingest job and the database. Commit the two workflow files and push to main. Wait a few seconds, then watch the run. The push also starts `ci.yml`, whose live steps now skip.",
          lang: "bash",
          code: `git add .github/workflows/deploy.yml .github/workflows/ci.yml
git commit -m "Add the delivery pipeline"
git push origin main
gh run watch --exit-status $(gh run list --workflow deploy.yml --limit 1 --json databaseId --jq '.[0].databaseId')
# To stop any further runs, and any further spend:
# gh workflow disable deploy.yml`,
          expect: "This is by design a sample, because no real run is recorded in this course. The tests, the gate and the build go green. The deploy waits for your approval if the environment has a reviewer, then goes green. The old revision still serves.",
        },
        // CHECK: teardown commands. Confirm the flags of gcloud run revisions delete and gcloud artifacts docker images delete, and that you cannot delete a revision that holds traffic.
        {
          kind: "step",
          id: "cloud06-s05",
          title: "Read the traffic split, then decide what to keep",
          text: "Check that the new revision has a tag and no traffic. Keep the revision until chapter 7, which uses it. To undo the run, delete the revision and then the image. Deleting the revision removes it from Cloud Run. Deleting the image frees the registry storage.",
          lang: "bash",
          code: `gcloud run services describe askpep --region europe-west3 --format=json | jq '.status.traffic'
# Optional clean-up. Replace REVISION, PROJECT_ID and SHORT_SHA.
# gcloud run revisions delete REVISION --region europe-west3
# gcloud artifacts docker images delete europe-west3-docker.pkg.dev/PROJECT_ID/askpep/askpep:SHORT_SHA --delete-tags`,
          expect: "Sample, not recorded: one entry carries your sha tag and a url and no percent, and the entry for the old revision shows 100 percent.",
        },
        {
          kind: "fold",
          tone: "trouble",
          title: "The first run is red at the sign-in step",
          text: "Two causes cover most cases. A secret is missing or misspelled, so the sign-in receives an empty value. Or the job's subject doesn't match what `askpep-deploy` trusts. The environment name may differ, or the repository name in the trust rule may be wrong. Compare the job's subject with the rule from section 4.",
        },
        {
          kind: "p",
          text: "You can run it yourself now. What did AskPEP's first run find?",
        },
      ],
    },
    {
      id: "s7-first-run-record",
      title: "AskPEP's first pipeline run failed on a value written twice",
      goal: "What do you record about a pipeline's first run?",
      blocks: [
        {
          kind: "p",
          text: "The first run of a pipeline tells you whether the checks have teeth. Record what stopped it, not only that it passed. A green run with no red run before it shows nothing about the checks.",
        },
        {
          kind: "p",
          text: "Here is how AskPEP's first runs went on Tuesday 22 December. The commit hashes, gate scores and times are invented.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "You pushed `deploy.yml` to `main`. The `test` job failed, because the workflow set `VERTEX_LOCATION` to `europe-west3` and Terraform now says `eu`.",
            "The value was written twice, and it had drifted on the first day ADR 0008 applied. You changed the workflow, and the lab test passed.",
            "The security reviewer is the required reviewer on `production`. They said, \"I'll approve the deploy after the gate has passed, and I want to see the gate's numbers.\"",
            "The gate ran against `eu`, the location production now uses. It scored the same as it did on staging commit `3c91e2b` on 104 questions.",
            "The security reviewer approved the deploy. The migrations ran and the revision `sha-5d2e9a1` came up with no traffic. The smoke test passed.",
            "The second team's lead asked, \"Did anything change for us?\" Nothing had changed. The stable revision still held all the traffic.",
          ],
        },
        {
          kind: "code",
          lang: "text",
          code: `# PIPELINE-RUN-001  Tuesday 22 December 2026
Commit: 5d2e9a1. Workflow: deploy.yml. Approver: security reviewer.

First attempt
test job failed. VERTEX_LOCATION was europe-west3 in the workflow, eu in Terraform.
Fixed in the workflow. Nothing reached the gate.

Second attempt
test        passed
eval-gate   passed, location eu, 104 questions
            answer 21/23, retrieval 26/28, routing 15/16, action 10/12, attack 0/25
build       passed, image 5d2e9a1
deploy      passed, migrations applied, revision tag sha-5d2e9a1
smoke test  /health answered 200

Traffic after the run
stable revision   100%
sha-5d2e9a1       0%

Shipped in this image: T11 retention and redaction, ADR 0007 route label, ADR 0008.
Next: canary on the tagged revision, Wednesday 23 December.`,
          caption: "The record of AskPEP's first pipeline run. Every value is invented, except the gate scores from course 6.",
        },
        {
          kind: "p",
          text: "Start with the first attempt. It shows the check caught a real fault on its first day. Then read the traffic lines, because they are the point of this chapter. A whole release is built and migrated, and no user has met it.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# PIPELINE-RUN-<number>  <date>
Commit:
Approver:

First attempt, and what stopped it:

Second attempt, job by job:
Gate scores:

Traffic after the run:
Shipped in this image:
Next:`,
          caption: "For your next pipeline: keep one of these for the first run, and for any run that fails.",
        },
        {
          kind: "p",
          text: "A release is waiting at 0 per cent. How does it reach real users without betting all of them on it at once?",
        },
      ],
    },
  ],
  lab: {
    title: "Write the delivery pipeline as one workflow",
    goal: "Write `deploy.yml` in five steps: the header, the test job, the eval gate, the build job and the deploy job. Step 3 also edits `ci.yml`. The tests read the workflow files as data, so nothing calls Google or GitHub. Run them from your AskPEP workspace root. Then compare your files with `capstone/.github/workflows/` in the my-learn folder.",
    minutes: 70,
    files: [
      ".github/workflows/deploy.yml",
      ".github/workflows/ci.yml",
      "tests/cloud/test_cloud06_pipeline.py",
    ],
    steps: [
      {
        title: "The header",
        text: "Replace the top of the stub `deploy.yml`. Name the workflow `deploy`. Start it on a push to `main` and on `workflow_dispatch`, and on nothing else. Give the token `contents: read`. Add the concurrency group `deploy` that never cancels, and the three `env` names. Keep the stub's `todo` job for now.",
        code: `# .github/workflows/deploy.yml
name: deploy

# your turn: the triggers. A push to main, and a person. No pull request.
on:
  ...

# your turn: the token may read the repository and nothing more.
permissions:
  ...

# your turn: one run at a time. A running deploy is never cancelled.
concurrency:
  ...

# your turn: REGION, SERVICE and REPOSITORY. They must match the Terraform.
env:
  ...

# Keep the stub's todo job below until step 5 deletes it.
jobs:
  todo:
    runs-on: ubuntu-latest
    steps:
      - run: echo "cloud-06 is not written yet" >&2 && exit 1`,
        test: "uv run pytest tests/cloud -k cloud06_s1",
      },
      {
        title: "The test job",
        text: "Add the job `test` to `deploy.yml`. It runs on `ubuntu-latest` with a pgvector Postgres service and a health check. Point `DATABASE_URL` and `TEST_DATABASE_URL` at it. Check out the code, install `uv`, sync, then run the style checks, `pytest` and the attack gate. Give it no secret and no identity token.",
        code: `# .github/workflows/deploy.yml, under jobs:
  test:
    runs-on: ubuntu-latest
    # your turn: a postgres service from a pinned pgvector image, with port 5432 and a --health-cmd option.
    services:
      ...
    # your turn: DATABASE_URL and TEST_DATABASE_URL, both postgresql:// URLs on localhost:5432.
    env:
      ...
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v6
      # your turn: uv sync, ruff check, ruff format --check, pytest, then askpep redteam with --max-asr 0.05.
      - run: ...`,
        test: "uv run pytest tests/cloud -k cloud06_s2",
      },
      {
        title: "The eval gate",
        text: "Add the job `eval-gate`. It needs `test`, may ask for an identity token, and signs in as the eval account. It migrates, ingests and runs the gate with `--judge`. Set `DESK_MODEL` and `VERTEX_LOCATION` from `vertex_env`. Then check that both live steps in `ci.yml` carry the `hashFiles` clause, and add it to an older file.",
        code: `# .github/workflows/deploy.yml, under jobs:
  eval-gate:
    needs: test
    # your turn: contents: read and id-token: write.
    permissions:
      ...
    # your turn: the same pgvector postgres service as the test job.
    services:
      ...
    env:
      DATABASE_URL: postgresql://askpep@localhost:5432/askpep
      # your turn: VOYAGE_API_KEY, ANTHROPIC_API_KEY and GOOGLE_CLOUD_PROJECT, each read from the secret of the same name.
      # your turn: DESK_MODEL and VERTEX_LOCATION. Copy the model and the region from vertex_env in vertex.tf.
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v6
      - run: uv sync
      # your turn: sign in with google-github-actions/auth. The account comes from the secret GCP_SERVICE_ACCOUNT.
      # your turn: askpep migrate, askpep ingest --fetch, then askpep eval gate --judge, in that order.
      # your turn: upload evals/reports/ with if: \${{ always() }}, so a failed run keeps its report.

# .github/workflows/ci.yml, in the steps "Sign in to Google" and "Eval gate":
#   check: both if lines must start like this, and the template already has them.
#   if: \${{ (github.event_name == 'pull_request' || hashFiles('.github/workflows/deploy.yml') == '') && env.VOYAGE_API_KEY != '' && ...`,
        test: "uv run pytest tests/cloud -k cloud06_s3",
      },
      {
        title: "The build job",
        text: "Add the job `build`. It needs `test` and signs in as the deploy account. Name the image from the first seven characters of the commit, and write the tag as `sha-` plus those characters. Build for amd64, push, and hand `image` and `tag` on as job outputs. Never use `latest`, and never call `gcloud run`.",
        code: `# .github/workflows/deploy.yml, under jobs:
  build:
    needs: test
    runs-on: ubuntu-latest
    # your turn: contents: read and id-token: write.
    permissions:
      ...
    env:
      PROJECT_ID: \${{ secrets.GOOGLE_CLOUD_PROJECT }}
    # your turn: the outputs image and tag. Each reads a step output of the step with id: name.
    outputs:
      ...
    steps:
      - uses: actions/checkout@v4
      - id: name
        run: |
          short="\${GITHUB_SHA::7}"
          # your turn: write tag=sha-<short> and the image path to "$GITHUB_OUTPUT".
          # The image path is REGION-docker.pkg.dev/PROJECT_ID/REPOSITORY/askpep:<short>, built from env.
      # your turn: sign in as the secret GCP_DEPLOY_SERVICE_ACCOUNT and set up gcloud. Then run
      #   gcloud auth configure-docker, docker build with --platform linux/amd64, and docker push.`,
        test: "uv run pytest tests/cloud -k cloud06_s4",
      },
      {
        title: "The deploy job",
        text: "Add the job `deploy` and delete the stub's `todo` job. It needs `build` and `eval-gate` and runs in `production` as the deploy account. Update the ingest job, run it with `--wait`, then deploy with `--no-traffic --tag`. Smoke test, or skip it with a message when IAP is on. End by writing the next move to the run summary.",
        code: `# .github/workflows/deploy.yml, under jobs:
  deploy:
    # your turn: needs both build and eval-gate, written as a list.
    needs: ...
    runs-on: ubuntu-latest
    environment: production
    permissions:
      contents: read
      id-token: write
    # your turn: IMAGE and TAG, read from the outputs of the build job.
    env:
      ...
    steps:
      # your turn: sign in as the deploy account, then google-github-actions/setup-gcloud.
      # your turn, in this order, each in its own step:
      #   gcloud run jobs update askpep-ingest --image "$IMAGE" --region "$REGION"
      #   gcloud run jobs execute askpep-ingest --region "$REGION" --wait
      #   gcloud run deploy "$SERVICE" ... --no-traffic --tag "$TAG"
      # your turn: the smoke test. Read the service with gcloud run services describe --format=json.
      #   When the annotation run.googleapis.com/iap-enabled is "true", print why and exit 0.
      #   Otherwise curl --fail the url of the revision tagged $TAG, at /health.
      # your turn: a last step called "Say what to do next". Append this line to "$GITHUB_STEP_SUMMARY":
      #   Revision $TAG has no traffic. Run the rollout workflow with this tag.
      # Leave askpep-rollout alone, and call no terraform command.
      - run: ...`,
        test: "uv run pytest tests/cloud -k cloud06_s5",
      },
    ],
    verify: "uv run pytest tests/cloud -k cloud06",
  },
  recap: [
    "The pipeline is four jobs, and the gate sits before the migration, so a failed gate stops the deploy.",
    "The gate grades the model and the region that production runs, so its settings must match `vertex_env`.",
    "A skipped step shows green, so `eval-gate` has no `if` that can skip it.",
    "Each job holds the least access it needs, and the test job holds none.",
    "The environment subject carries no branch, so the production environment must limit its own branches.",
    "A tagged revision with no traffic can be tested at its own URL before anyone shifts traffic.",
    "AskPEP's first run failed on a location written in two places, and the test caught it.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. I can put a real eval gate in front of a deploy, and explain why a pipeline's first red run is good news.",
  interviewIds: ["cloud-q15", "cloud-q32", "cloud-q33"],
};

export default chapter;
