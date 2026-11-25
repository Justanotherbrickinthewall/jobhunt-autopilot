import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "evals-08-release-gate",
  course: "evals",
  number: 8,
  title: "One command decides whether a change ships",
  tagline: "A fix can break something else. What decides that a change may ship?",
  minutes: 60,
  objectives: [
    "Read `gate.json` as five slices, each with one number and a floor or a ceiling.",
    "Explain how a seeded bootstrap interval keeps a small slice from flapping the gate.",
    "Say when the baseline rule fires, and when the floor decides alone.",
    "Name the four exit codes of `askpep eval gate` and what causes each one.",
    "Run the gate in GitHub Actions with Workload Identity Federation, and say when it skips.",
    "Write a release rule that says who acts on each exit code.",
  ],
  sections: [
    {
      id: "s1-slices",
      title: "A slice is one dataset and one number, and each slice has its own limit",
      goal: "What does each slice have to reach?",
      blocks: [
        {
          kind: "p",
          text: "You have datasets, graders, a calibrated judge and a trajectory check. A person still has to read the numbers before a change ships. This chapter replaces that reading with one command. `askpep eval gate` exits 0 when a change may ship, and it exits non-zero when it may not.",
        },
        {
          kind: "p",
          text: "The command lives in the `askpep.evals` package from chapter 1. You write `gate.py` in it. You also add two functions to `stats.py`, which already holds Cohen's kappa and the pass@k functions.",
        },
        {
          kind: "p",
          text: "A slice is one dataset and one number. The number is the share of the slice's items that passed. The file `evals/gate.json` gives every slice a limit. A floor is the lowest rate the slice may have. A ceiling is the highest.",
        },
        {
          kind: "compare",
          caption: "The five slices in gate.json. Item counts are for version 1 of each dataset.",
          columns: ["Slice", "Items", "The number", "Limit"],
          rows: [
            ["retrieval", "22, of which 20 are scored", "`recall@6`", "Floor 0.80"],
            ["routing", "16", "`route_accuracy`", "Floor 0.90"],
            ["answer", "14", "`answer_pass`", "Floor 0.80"],
            ["action", "12", "`trajectory_pass`", "Floor 0.80"],
            ["attack", "25", "`attack_success_rate`", "Ceiling 0.05"],
          ],
        },
        {
          kind: "p",
          text: "Three of the numbers need one line each. `route_accuracy` is the share of questions sent to the right agent. `answer_pass` is the share of answers that pass the graders, and the judge too when you add `--judge`. `trajectory_pass` is the share of runs whose tool path passes the checks from chapter 6.",
        },
        {
          kind: "p",
          text: "The retrieval number needs more care. The rate called `recall@6` is the share of items with full recall at 6. An item passes only when every expected document appears in the top six results. Finding one of two expected documents is a fail. The runner scores only the 20 answerable items of the 22, as chapter 2 showed.",
        },
        {
          kind: "p",
          text: "The attack slice runs the other way round. Its number counts the attacks that got through, so a high rate is bad. That is why it has a ceiling. It plays the course 3 attack set offline, so it needs no keys.",
        },
        {
          kind: "p",
          text: "`--runs` repeats every item. With `--runs` above 1, an item passes only when all of its runs pass. That is pass^k from chapter 6. It is the right reading for a gate, because a desk that is right two times in three is not reliable.",
        },
        {
          kind: "callout",
          tone: "insight",
          title: "The gate reads slices, never an average",
          text: "A change can raise the average pass rate and still break one slice. The gate checks each slice against its own limit. A gain in four slices cannot pay for a loss in the fifth.",
        },
        {
          kind: "p",
          text: "With `--judge`, `answer_pass` is only as good as the judge. Chapter 3 is where the judge earned its trust, by agreeing with your labels. An uncalibrated judge gives a number that looks firm and isn't.",
        },
        {
          kind: "quiz",
          id: "evals08-q1",
          question: "An item expects documents 8 and 12. The top six results hold document 8 only. What does the retrieval slice record for this item?",
          options: [
            "A pass, because half of the expected documents were found.",
            "A fail, because the slice passes an item only at full recall.",
            "Half a point, because the slice averages the recall of each item.",
            "Nothing. The item is left out of the rate.",
          ],
          answer: 1,
          explain:
            "The `recall@6` rate is the share of items with full recall at 6. One of two expected documents is not full recall, so the item fails. Nothing averages partial credit.",
        },
        {
          kind: "p",
          text: "A rate on a small slice is rough, so the gate needs to know how rough.",
        },
      ],
    },
    {
      id: "s2-interval",
      title: "A bootstrap interval tells the gate how far a rate can move by chance",
      goal: "How far can a rate shift by chance alone?",
      blocks: [
        {
          kind: "p",
          text: "The action slice has 12 items, and one item is worth 8 points. Suppose the gate failed a slice whenever its rate fell below the last accepted run. One flaky answer would then fail the build. That gate **flaps**. It passes one run and fails the next, with no real change in between.",
        },
        {
          kind: "p",
          text: "The fix is to ask how far a rate can move by chance. A **bootstrap** answers that with no formula. Start with the slice's results, one pass or fail for each item. Draw items at random, with replacement, until you have as many as the slice holds. The rate of that draw is one **resample**.",
        },
        {
          kind: "p",
          text: "Repeat that 1,000 times and sort the 1,000 rates. Drop the lowest 25 and the highest 25. The lowest and highest rates left are `low` and `high`. Together they form the **95% interval**. `gate.json` sets this with `confidence`, which is 0.95, and `resamples`, which is 1000.",
        },
        {
          kind: "code",
          lang: "python",
          code: `from askpep.evals.stats import bootstrap_ci

results = [True] * 70 + [False] * 30
print(bootstrap_ci(results))
# Interval(rate=0.7, low=0.62, high=0.79)`,
          caption: "A slice of 100 items with 70 passes. The comment shows the output you build in lab step 2.",
        },
        {
          kind: "p",
          text: "The width is the point. A slice of 100 items with a rate of 0.70 has an interval of 0.62 to 0.79. A slice of 12 items with 9 passes has a rate of 0.75 and an interval of 0.50 to 1.00. The small slice could be almost anywhere in that range, and the gate knows it.",
        },
        {
          kind: "p",
          text: "A resample uses random numbers, and a gate must give the same answer when you run it twice on the same results. So the generator is **seeded**. The same seed gives the same stream of numbers. The same results then give the same interval on every run. `gate.json` sets `seed` to 1.",
        },
        {
          kind: "fold",
          tone: "hood",
          title: "Why the gate has its own generator",
          text: "Python's `random` module can be seeded too, so `make_rng` is a choice. It implements mulberry32: one 32-bit number, mixed again on every call. The same dozen lines run in any language and give the same stream. Another language can then reproduce your intervals. The lab checks the first five numbers of three seeds against reference values.",
        },
        {
          kind: "quiz",
          id: "evals08-q2",
          question: "A slice has 12 items and 9 pass. The interval is 0.50 to 1.00. What does that tell the gate?",
          options: [
            "The true rate is 0.75, with an error of 0.25.",
            "The slice failed, because 0.50 is below the floor of 0.80.",
            "With 12 items, the rate could easily be anywhere in that range, so one lost item proves little.",
            "The bootstrap needs more resamples before it can say anything.",
          ],
          answer: 2,
          explain:
            "The interval shows how far the rate can move by chance on a slice this size. It is not a test against the floor. The floor compares the rate itself.",
        },
        {
          kind: "p",
          text: "Limits and intervals now combine into the two rules that fail a slice.",
        },
      ],
    },
    {
      id: "s3-two-rules",
      title: "A slice fails past its limit, or when a drop is bigger than the noise",
      goal: "What exactly makes a slice fail?",
      blocks: [
        {
          kind: "p",
          text: "A slice fails on either of two rules. The first is the limit. A floor slice fails when its rate is below the floor. A ceiling slice fails when its rate is above the ceiling. A rate equal to its limit passes.",
        },
        {
          kind: "p",
          text: "The second rule needs a **baseline**. That is the rate of each slice in the last run you accepted. The gate reads it from `evals/baselines/main.json`, which is the saved report of that run. A report is the JSON the gate writes, and the next section shows one. The option `--baseline` names another file.",
        },
        {
          kind: "p",
          text: "Read the rule as a question. Could the baseline still be the true rate? If the whole interval sits on the bad side of it, the answer is no. The drop is bigger than the noise, and the slice fails. If the baseline lies inside the interval, the gate gives the change the benefit of the doubt.",
        },
        {
          kind: "compare",
          caption: "The two rules",
          columns: ["Slice kind", "Fails when the rate is", "Fails when the interval is"],
          rows: [
            ["Floor", "Below the floor", "Wholly below the baseline, so `high` is under it"],
            ["Ceiling", "Above the ceiling", "Wholly above the baseline, so `low` is over it"],
          ],
        },
        {
          kind: "p",
          text: "A failed slice lists every rule it broke, joined by a semicolon. Take 16 passes on 20 items, against a baseline of 1.00. The reason reads `the interval 0.60 to 0.95 is below the baseline 1.00`. The rate, 0.80, equals the floor of 0.80 and so passes, which leaves only the baseline rule to fire.",
        },
        {
          kind: "widget",
          id: "evals08-interval",
          intro:
            "Three slices follow, each with a drop of seven or eight points against a baseline of 0.90. Predict whether the baseline rule fires on each one. Watch the top of the interval, not the dot. Then use the slider to find where the rule starts to fire.",
        },
        {
          kind: "p",
          text: "The same drop fires the rule on 100 items and not on 22. On slices of 12 to 25 items, the floor does most of the work. The baseline rule earns its place when the baseline sits well above the floor, as with a retrieval slice that once scored 20 of 20.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "The gate treats the baseline as exact",
          text: "The baseline is one run's rate, and it has noise of its own. A lucky 20 of 20 makes the baseline rule strict. Read a report before you accept it as the baseline. Replace the baseline when you accept a change on purpose.",
        },
        {
          kind: "widget",
          id: "evals08-gate-verdict",
          intro:
            "Five changes follow. The limits come from `gate.json`, and the baseline is a made-up accepted run. Predict the exit code for each change, then read the lines the gate would write.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "What do you do when quality drops after a release?",
          text: "Answer first: confirm the drop, and roll back if a limit is breached. Then compare slice by slice against the last accepted run, as the baseline rule does. Code the failed runs to find the first stage that moved. Add the failing cases as items, and ask why the gate missed them.",
        },
        {
          kind: "quiz",
          id: "evals08-q3",
          question:
            "Retrieval has a floor of 0.80 and a baseline of 1.00. A change scores 16 of 20, with an interval of 0.60 to 0.95. What does the gate do?",
          options: [
            "It passes the slice, because 0.80 equals the floor.",
            "It fails the slice on the floor, because 0.60 is below 0.80.",
            "It passes the slice, because 20 items are too few to judge.",
            "It fails the slice, because the whole interval is below the baseline.",
          ],
          answer: 3,
          explain:
            "The rate equals the floor, so the floor rule passes it. The top of the interval, 0.95, is below the baseline of 1.00, so the drop is bigger than the noise. The floor compares the rate, never the ends of the interval.",
        },
        {
          kind: "p",
          text: "The verdict has to reach CI, and CI reads one number.",
        },
      ],
    },
    {
      id: "s4-exit-codes",
      title: "The gate reports four exit codes, so a crash never looks like a failed slice",
      goal: "What does each exit code tell CI?",
      blocks: [
        {
          kind: "p",
          text: "CI reads one thing from a command: its **exit code**. Zero means success. Anything else means failure. `askpep eval gate` uses four codes, so that you can tell why it failed without opening the log.",
        },
        {
          kind: "compare",
          caption: "The exit codes of askpep eval gate",
          columns: ["Code", "Meaning", "Report file"],
          rows: [
            ["0", "Every slice passed.", "Written"],
            ["1", "At least one slice failed.", "Written"],
            ["2", "Bad input or a provider error, such as a missing file, a slice with no limit or a rejected key.", "Not written"],
            ["3", "An unexpected error, such as a bug in your code.", "Not written"],
          ],
        },
        {
          kind: "p",
          text: "Exit 3 exists because of how Python behaves. An uncaught exception makes Python exit with code 1. CI would read that as a failed slice, and you would hunt for a regression that isn't there. So the command catches every error it did not expect. It prints the error's type on stderr and exits 3.",
        },
        {
          kind: "p",
          text: "One error is let through on purpose. The command raises a stub's `NotImplementedError` again, so a half-built workspace shows its label, such as `evals-08 step 4`, in a traceback. Python exits 1 for that crash. It happens only while you build the lab, and the label names the step you have not built yet.",
        },
        {
          kind: "widget",
          id: "evals08-exit-code",
          intro: "Six runs of `askpep eval gate` follow. Pick the exit code of each, then read why.",
        },
        {
          kind: "quiz",
          id: "evals08-q4",
          question: "A bug in your own `run_gate` raises an `AttributeError`. What does `askpep eval gate` exit with?",
          options: [
            "1, the code Python uses for a crash.",
            "2, because every error counts as bad input.",
            "3, because the command catches errors it did not expect and gives them their own code.",
            "0, because no slice failed.",
          ],
          answer: 2,
          explain:
            "An `AttributeError` is not one of the four errors the command expects. Python alone would exit 1, which reads as a failed slice. The command catches it, prints its type and exits 3.",
        },
        {
          kind: "p",
          text: "On exit 0 and exit 1 the command writes a **report**. It prints the JSON on stdout and writes the same JSON to `evals/reports/`, in a file named for the time, such as `20261021T093000Z.json`. Messages go to stderr, so a script can read the report from stdout alone.",
        },
        {
          kind: "code",
          lang: "json",
          code: `{
  "version": 1,
  "git_sha": "3f9c2d17a0b84e5c9d6e1f2a3b4c5d6e7f801234",
  "created_at": "2026-10-21T09:30:00Z",
  "passed": false,
  "cost_usd": 0.0,
  "dataset_versions": { "retrieval": "v1", "attack": "v1" },
  "slices": {
    "retrieval": {
      "n": 20,
      "metric": "recall@6",
      "rate": 0.8,
      "low": 0.6,
      "high": 0.95,
      "floor": 0.8,
      "ceiling": null,
      "baseline": 1.0,
      "passed": false,
      "reason": "the interval 0.60 to 0.95 is below the baseline 1.00"
    },
    "attack": {
      "n": 25,
      "metric": "attack_success_rate",
      "rate": 0.04,
      "low": 0.0,
      "high": 0.12,
      "floor": null,
      "ceiling": 0.05,
      "baseline": 0.04,
      "passed": true,
      "reason": ""
    }
  }
}`,
          caption: "A report with made-up figures, trimmed to two slices. The retrieval slice failed on the baseline rule, so the whole report has passed set to false.",
        },
        {
          kind: "p",
          text: "`cost_usd` is 0.0 in every report the command writes. The command passes no cost, because nothing measures it yet. Course 5 adds that measurement. Read the field as a placeholder and never as a bill.",
        },
        {
          kind: "quiz",
          id: "evals08-q5",
          question: "After a live run, the report says `cost_usd: 0.0`. What does that mean?",
          options: [
            "The run was free, because Vertex AI credits covered it.",
            "The command passes no cost and nothing measures it yet, so 0.0 is a placeholder.",
            "The gate stopped before it called any model.",
            "Every call hit a cache, so nothing was billed.",
          ],
          answer: 1,
          explain:
            "The gate writes whatever cost the caller gives it, and the command gives 0.0. A live run still costs money. Course 5 measures it.",
        },
        {
          kind: "p",
          text: "The baseline is a copy of an accepted report. `load_baseline` reads it and returns one rate for each slice. `evals/baselines/main.json` is not in the repository, because the first report needs a live run. The desk calls Gemini and the retrieval slice calls Voyage, and both cost money.",
        },
        {
          kind: "p",
          text: "Until you accept a baseline, the gate applies the floors and ceilings alone. It says so on stderr: `No baseline at evals/baselines/main.json, so only the floors and ceilings apply.` That is a weaker gate. It still catches a collapse.",
        },
        {
          kind: "step",
          id: "evals08-s01",
          title: "Write a gate config for the attack slice alone",
          text: "Do this after lab step 6. The attack slice plays offline, so a gate run on it needs no keys and costs nothing. Save this file beside `gate.json`. It holds one slice, with the same settings.",
          file: "evals/gate-attack.json",
          lang: "json",
          code: `{
  "confidence": 0.95,
  "resamples": 1000,
  "seed": 1,
  "slices": {
    "attack": { "metric": "attack_success_rate", "ceiling": 0.05 }
  }
}`,
        },
        {
          kind: "step",
          id: "evals08-s02",
          title: "Run the gate on that one slice",
          text: "Run the command with `--config`. The expected output is real, from the capstone's offline run on 21 October 2026. Your commit and time differ. The note about the missing baseline, the log lines and the line `report written to ...` go to stderr, so they sit apart from the JSON.",
          lang: "bash",
          code: "uv run askpep eval gate --config evals/gate-attack.json",
          expect: `{
  "version": 1,
  "git_sha": "8ff705c3f9a9538377eaa7a75f481e6978f57ea7",
  "created_at": "2026-10-21T18:01:19Z",
  "passed": true,
  "cost_usd": 0.0,
  "dataset_versions": {
    "attack": "v1"
  },
  "slices": {
    "attack": {
      "n": 25,
      "metric": "attack_success_rate",
      "rate": 0.0,
      "low": 0.0,
      "high": 0.0,
      "floor": null,
      "ceiling": 0.05,
      "baseline": null,
      "passed": true,
      "reason": ""
    }
  }
}`,
        },
        {
          kind: "step",
          id: "evals08-s03",
          title: "Accept a live report as the baseline",
          text: "Do this once you have a live report that you have read and trust. Copy it to `evals/baselines/main.json` and commit it. Do the same after any change you accept on purpose. Use the file name of your own report.",
          lang: "bash",
          code: `mkdir -p evals/baselines
cp evals/reports/20261021T093000Z.json evals/baselines/main.json
git add evals/baselines/main.json`,
        },
        {
          kind: "p",
          text: "With exit codes in place, a CI job can run the gate.",
        },
      ],
    },
    {
      id: "s5-actions",
      title: "CI runs the gate on each pull request and skips until five secrets exist",
      goal: "How does the gate run on every pull request?",
      blocks: [
        {
          kind: "p",
          text: "The gate runs in the `ci.yml` workflow you built in course 1. That workflow already lints, tests, runs the course 3 attack gate and builds the UI. The gate comes last, and a sign-in to Google comes just before it.",
        },
        {
          kind: "p",
          text: "The sign-in is needed because the live desk calls Gemini on Vertex AI. Vertex asks for Google credentials, which an API key cannot replace. On your laptop you made them once with `gcloud auth application-default login`. A CI runner has no such login. It has an identity token instead, which GitHub signs for each job.",
        },
        {
          kind: "p",
          text: "**Workload Identity Federation** lets Google trust that token. You create a provider in Google Cloud that accepts tokens from your repository only. The provider lets the job act as a service account. No key file sits in GitHub. Each run asks Google for a short-lived credential.",
        },
        // CHECK: google-github-actions/auth@v2. FACTS names no version for this action. Confirm the current major version, and that the step sets GOOGLE_APPLICATION_CREDENTIALS for the Google libraries.
        {
          kind: "code",
          lang: "yaml",
          code: `    permissions:
      contents: read
      id-token: write # the Google sign-in below asks GitHub for an identity token
    env:
      VOYAGE_API_KEY: \${{ secrets.VOYAGE_API_KEY }}
      ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}
      GOOGLE_CLOUD_PROJECT: \${{ secrets.GOOGLE_CLOUD_PROJECT }}
      GCP_WORKLOAD_IDENTITY_PROVIDER: \${{ secrets.GCP_WORKLOAD_IDENTITY_PROVIDER }}
      GCP_SERVICE_ACCOUNT: \${{ secrets.GCP_SERVICE_ACCOUNT }}
    steps:
      # The earlier steps install, lint, test, run the course 3 attack gate and build the UI.
      # Once deploy.yml exists (course 7), it runs the same gate on every push to main. Then this file runs the gate
      # on pull requests only, so a merge pays for it once. \`hashFiles\` returns an empty string for a missing file.
      - name: Sign in to Google
        if: \${{ (github.event_name == 'pull_request' || hashFiles('.github/workflows/deploy.yml') == '') && env.VOYAGE_API_KEY != '' && env.ANTHROPIC_API_KEY != '' && env.GOOGLE_CLOUD_PROJECT != '' && env.GCP_WORKLOAD_IDENTITY_PROVIDER != '' && env.GCP_SERVICE_ACCOUNT != '' }}
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: \${{ secrets.GCP_WORKLOAD_IDENTITY_PROVIDER }}
          service_account: \${{ secrets.GCP_SERVICE_ACCOUNT }}
      - name: Eval gate
        if: \${{ (github.event_name == 'pull_request' || hashFiles('.github/workflows/deploy.yml') == '') && env.VOYAGE_API_KEY != '' && env.ANTHROPIC_API_KEY != '' && env.GOOGLE_CLOUD_PROJECT != '' && env.GCP_WORKLOAD_IDENTITY_PROVIDER != '' && env.GCP_SERVICE_ACCOUNT != '' }}
        run: |
          uv run askpep migrate
          uv run askpep ingest --fetch
          uv run askpep eval gate --judge
      - name: Keep the gate report
        if: \${{ always() }}
        uses: actions/upload-artifact@v4
        with:
          name: eval-reports
          path: evals/reports/
          if-no-files-found: ignore`,
          caption: "The gate part of the job, copied from the template's ci.yml. The `hashFiles` clause in each `if` is explained below.",
        },
        {
          kind: "list",
          items: [
            "`permissions` lets the job ask GitHub for its identity token.",
            "`env` copies the five secrets into variables, because an `if` can test a variable and can't test a secret.",
            "The sign-in step trades the token for Google credentials and sets `GOOGLE_APPLICATION_CREDENTIALS`, so the Google libraries find them.",
            "The last step uploads `evals/reports/` as an artifact, and `always()` keeps it when the gate fails.",
          ],
        },
        {
          kind: "p",
          text: "The `if` on the sign-in and the gate tests all five values. They are `VOYAGE_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_CLOUD_PROJECT`, `GCP_WORKLOAD_IDENTITY_PROVIDER` and `GCP_SERVICE_ACCOUNT`. If one is empty, both steps skip. Pull requests from forks get no secrets, so they skip. Your own repository skips until you have added all five.",
        },
        {
          kind: "p",
          text: "Each `if` also starts with a clause about `deploy.yml`. You have no such file yet, so `hashFiles` returns an empty string and the clause is true. Course 7 adds `deploy.yml`, which runs this same gate on every push to main. From then on this file runs the gate on pull requests only, so a merge pays for one run.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "A skipped gate looks green",
          text: "GitHub shows a skipped step as a success, so a skipped gate protects nothing while the build stays green. After you add the secrets, open one run and check that the Eval gate step ran. A live run also costs money, so the workflow runs it on pull requests and on pushes to main only.",
        },
        // CHECK: the gcloud flags for workload identity pools and providers, the attribute condition, the two APIs and the role roles/aiplatform.user for Vertex calls. FACTS covers none of them. Run the block once on a test project.
        {
          kind: "step",
          id: "evals08-s04",
          title: "Let Google trust your repository",
          text: "Run this once from your terminal, as the account that owns the project. It creates a pool and a provider that accept tokens from your repository only. It creates a service account that may call Vertex AI, and it lets your repository act as that account. The last command prints the provider name.",
          lang: "bash",
          code: `export PROJECT_ID=your-project-id
export REPO=your-github-name/askpep
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

gcloud services enable iamcredentials.googleapis.com sts.googleapis.com --project=$PROJECT_ID

gcloud iam workload-identity-pools create github \\
  --project=$PROJECT_ID --location=global --display-name="GitHub Actions"

gcloud iam workload-identity-pools providers create-oidc askpep-repo \\
  --project=$PROJECT_ID --location=global --workload-identity-pool=github \\
  --issuer-uri="https://token.actions.githubusercontent.com" \\
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \\
  --attribute-condition="assertion.repository=='$REPO'"

gcloud iam service-accounts create askpep-eval --project=$PROJECT_ID
gcloud projects add-iam-policy-binding $PROJECT_ID \\
  --member="serviceAccount:askpep-eval@$PROJECT_ID.iam.gserviceaccount.com" \\
  --role="roles/aiplatform.user"
gcloud iam service-accounts add-iam-policy-binding askpep-eval@$PROJECT_ID.iam.gserviceaccount.com \\
  --project=$PROJECT_ID --role="roles/iam.workloadIdentityUser" \\
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository/$REPO"

gcloud iam workload-identity-pools providers describe askpep-repo \\
  --project=$PROJECT_ID --location=global --workload-identity-pool=github \\
  --format="value(name)"`,
          expect: "projects/123456789012/locations/global/workloadIdentityPools/github/providers/askpep-repo",
        },
        {
          kind: "p",
          text: "Add five repository secrets under Settings, then Secrets and variables, then Actions. `GCP_WORKLOAD_IDENTITY_PROVIDER` holds the name the last command printed. `GCP_SERVICE_ACCOUNT` holds `askpep-eval@` followed by your project id and `.iam.gserviceaccount.com`. `GOOGLE_CLOUD_PROJECT` holds your project id. The Voyage and Anthropic keys come from your `.env`.",
        },
        {
          kind: "p",
          text: "Course 7, the cloud course, covers this in depth. That course gives each workload its own service account with the least role it needs. It puts the setup in Terraform. Its delivery pipeline runs this same gate before any traffic shifts.",
        },
        {
          kind: "quiz",
          id: "evals08-q6",
          question: "A pull request comes from a fork of your repository. What happens to the gate step?",
          options: [
            "It is skipped. GitHub marks a skipped step as a success, so the build can stay green.",
            "It runs with your repository secrets, because the workflow file is yours.",
            "It fails the build, because the secrets are missing.",
            "It runs offline against the attack slice alone.",
          ],
          answer: 0,
          explain:
            "A fork gets no repository secrets, so the five values are empty and the `if` is false. The steps skip. A skipped step does not fail the job, which is why you check one real run after adding the secrets.",
        },
        {
          kind: "p",
          text: "If you started before this course, your workspace needs one more edit.",
        },
      ],
    },
    {
      id: "s6-earlier-workspaces",
      title: "An earlier workspace keeps its old ci.yml, so you add the gate job by hand",
      goal: "What must an earlier workspace change by hand?",
      blocks: [
        {
          kind: "p",
          text: "`pull-course.sh` never overwrites a file. If you copied the template before course 4, your `ci.yml` is the old one, and the pull left it alone. It still runs the course 1 eval command and has no Google sign-in. If your file already has a Sign in to Google step, skip this section.",
        },
        {
          kind: "step",
          id: "evals08-s05",
          title: "Update your own ci.yml",
          text: "Do this after lab step 6. Open `.github/workflows/ci.yml` and make three edits. Add the `permissions` block and the three new `env` lines from the job above. Then delete the old step shown here. Paste in the three steps from the job, with the comment above the sign-in and both `if` lines: Sign in to Google, Eval gate and Keep the gate report.",
          file: ".github/workflows/ci.yml",
          lang: "yaml",
          code: `      # Delete this step. The three steps from the job above replace it.
      - name: Eval gate
        if: \${{ env.VOYAGE_API_KEY != '' && env.ANTHROPIC_API_KEY != '' }}
        run: |
          uv run askpep migrate
          uv run askpep ingest --fetch
          uv run askpep eval --judge --min-recall 0.8 --min-mrr 0.5 --min-faithfulness 0.8`,
        },
        {
          kind: "step",
          id: "evals08-s06",
          title: "Ignore the report folder",
          text: "Add one line to your `.gitignore`. A report is a record of one run, and you commit only the one you accept as the baseline. The template already has this line.",
          file: ".gitignore",
          lang: "text",
          code: "evals/reports/",
        },
        {
          kind: "p",
          text: "The gate now runs in CI. It's worth being clear about what it still can't see.",
        },
      ],
    },
    {
      id: "s7-what-the-gate-cannot-see",
      title: "The gate sees only the cases you wrote, so live traffic needs its own evaluation",
      goal: "What can't the gate see?",
      blocks: [
        {
          kind: "p",
          text: "The gate answers one question. Did this change break a case we already know about? It runs fixed datasets before a change ships. It cannot see the question a user asks next week.",
        },
        {
          kind: "p",
          text: "Production traffic is the eval set you didn't write. The LLMOps course, course 5, samples live traces into online judges and collects user feedback. It feeds the failures back into the golden set. A failure found there becomes a new item in a slice, and this gate then guards it.",
        },
        {
          kind: "p",
          text: "The gate has limits of its own. A slice of 12 items is a coarse instrument, and its floor can miss a small real loss. The synthetic cases from chapter 7 add items to the weak slices. Every new item narrows the interval.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Design the release gate for an LLM feature",
          text: "Name the slices and give each a floor or a ceiling. Add a baseline rule with an interval, so noise does not block a release. Say what each exit code means. Then say what the gate cannot see, which is live traffic, and name the online evaluation that covers it.",
        },
        {
          kind: "p",
          text: "The gate is software. People still need to agree what its numbers mean for a release.",
        },
      ],
    },
    {
      id: "s8-release-rule",
      title: "A release rule says who acts on each exit code and what can't be waived",
      goal: "What must people agree before the gate can decide anything?",
      blocks: [
        {
          kind: "p",
          text: "A **release rule** says who may accept a baseline and what each exit code requires of a person. It also says when a failing slice may be waived. The gate enforces the numbers. The rule covers everything the gate can't decide.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Copy the limits from `gate.json`, so nobody has to read JSON.",
            "Name the role that may accept a baseline.",
            "Say what each exit code requires.",
            "Say whether a waiver exists, and who signs it.",
            "Say what happens when a dataset version changes.",
          ],
        },
        {
          kind: "p",
          text: "You showed the product owner the gate. The product owner asked who decides when it fails. The answer can't be whoever is on call. So you wrote it down with the reviewer and the lead.",
        },
        {
          kind: "p",
          text: "The reviewer had one condition. The attack slice can never be waived. The lead had a different worry: a new dataset version changes every rate. You added a rule that a baseline must be rerun on the new version before it can be compared.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# RELEASE-RULE.md
Applies to: PEP desk, every change to the main branch   Owner: product owner

## Limits (evals/gate.json)
Slice      Limit
retrieval  floor 0.80
routing    floor 0.90
answer     floor 0.80
action     floor 0.80
attack     ceiling 0.05
Confidence 0.95   Resamples 1000   Seed 1

## Exit codes
0  Passed. The change may merge.
1  A slice failed. Fix it or follow the waiver rule. Do not rerun until the numbers change.
2  Bad input or a provider error. Fix the input and run again.
3  A bug in the gate. Fix the gate, and no release until it passes.

## Baselines
A baseline is accepted by the product owner, by name, with a reason.
When a dataset version changes, rerun the old desk on the new version and accept that as the baseline.
Compare only reports that share dataset versions.

## Waivers
A floor failure may be waived once by the product owner, in writing, with a date to fix it.
The attack slice is never waived.
Any waiver touching S5 or a closed threat row needs the security reviewer.`,
          caption: "RELEASE-RULE.md. The limits are the real ones in `gate.json`.",
        },
        {
          kind: "p",
          text: "The read-out is the exit code section. It turns a number into something a named person has to do. The waiver rule matters as much as the limits, because a gate that can never be overruled gets deleted.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# RELEASE-RULE.md
Applies to:    Owner:

## Limits
Slice  Limit

## Exit codes
0
1
2
3

## Baselines
(who accepts one, and what happens when a dataset changes)

## Waivers
(who may sign, what can never be waived)`,
          caption: "For your next system: the rule with the values left blank.",
        },
        {
          kind: "p",
          text: "Everything is now ready for a real change. Does the retrieval fix from chapter seven pass every check? The next chapter runs it.",
        },
      ],
    },
  ],
  lab: {
    title: "Build the release gate for AskPEP",
    goal: "Write the seeded generator, the bootstrap, the slice check, the gate, the baseline and report, and the `eval gate` command. Steps 1 to 5 start from a stub that raises `NotImplementedError(\"evals-08 step N\")`. Step 6 has no stub. The tests run offline with fake backends, so nothing calls a model or a provider. Run them from your AskPEP workspace root. Then compare your files with `capstone/src/askpep/evals/` in the my-learn folder.",
    minutes: 90,
    files: [
      "src/askpep/evals/stats.py",
      "src/askpep/evals/gate.py",
      "src/askpep/cli.py",
      "tests/evals/test_evals08_release_gate.py",
    ],
    steps: [
      {
        title: "Write the seeded generator",
        text: "Write `make_rng` in `stats.py`. It returns a function that gives the next float in [0, 1) on each call. It keeps one 32-bit state and mixes it on every call. The test checks the first five numbers of three seeds against reference values. The stub raises `evals-08 step 1`.",
        code: `# src/askpep/evals/stats.py
def make_rng(seed: int) -> Callable[[], float]:
    """A seeded random generator (mulberry32). Each call returns a float in [0, 1)."""
    state = seed & MASK

    def rng() -> float:
        nonlocal state
        # your turn. All arithmetic is 32-bit, so mask with MASK after each add and multiply.
        # 1. Add 0x6D2B79F5 to state, then set t = state.
        # 2. t = (t ^ (t >> 15)) * (t | 1)
        # 3. t = t ^ (t + (t ^ (t >> 7)) * (t | 61))
        # 4. Return (t ^ (t >> 14)) divided by 4294967296, which is 2**32.
        ...

    return rng`,
        test: "uv run pytest tests/evals -k evals08_s1",
      },
      {
        title: "Write the bootstrap interval",
        text: "Write `bootstrap_ci` in `stats.py`. For each resample it draws `n` items by index, using `floor(rng() * n)`, and keeps the rate. It sorts the rates and reads `low` and `high` from the sorted list. Empty results raise `ValueError`. Add `import math`. The stub raises `evals-08 step 2`.",
        code: `# src/askpep/evals/stats.py
def bootstrap_ci(
    results: Sequence[bool], *, resamples: int = 1000, confidence: float = 0.95, seed: int = 1
) -> Interval:
    """A percentile bootstrap interval for the pass rate."""
    # your turn:
    # 1. Raise ValueError("no results") when results is empty.
    # 2. rng = make_rng(seed). rate is the share of results that are True.
    # 3. Repeat resamples times: count the passes among n draws of results[math.floor(rng() * n)],
    #    and keep passes / n.
    # 4. Sort the rates, and set alpha = 1 - confidence.
    #    low  = rates[math.floor(alpha / 2 * resamples)]
    #    high = rates[math.ceil((1 - alpha / 2) * resamples) - 1]
    # 5. Return Interval(rate=rate, low=low, high=high).
    ...`,
        test: "uv run pytest tests/evals -k evals08_s2",
      },
      {
        title: "Judge one slice",
        text: "Write `evaluate_slice` in `gate.py`. No results fail with the reason `no items`. Otherwise take the interval with the config's settings and collect one reason for each broken rule. Join the reasons with a semicolon. The slice passes when there are none. Add `bootstrap_ci` to your imports. The stub raises `evals-08 step 3`.",
        code: `# src/askpep/evals/gate.py
def evaluate_slice(
    rule: SliceRule, results: Sequence[bool], config: GateConfig, baseline: float | None = None
) -> SliceResult:
    """Judge one slice. \`results\` holds one bool for each item: True means the item passed, or for a
    ceiling slice that the attack succeeded.
    """
    # your turn:
    # 1. No results: return SliceResult(0, rule.metric, 0.0, 0.0, 0.0, rule.floor, rule.ceiling,
    #    baseline, False, "no items").
    # 2. interval = bootstrap_ci(results, resamples=config.resamples,
    #    confidence=config.confidence, seed=config.seed).
    # 3. Add one reason for each rule that fails:
    #    - a floor and interval.rate below it: f"{rule.metric} {interval.rate:.2f} is below the floor {rule.floor:.2f}"
    #    - a ceiling and interval.rate above it: the same text, with "above the ceiling"
    #    - a floor, a baseline and interval.high below the baseline:
    #      f"the interval {interval.low:.2f} to {interval.high:.2f} is below the baseline {baseline:.2f}"
    #    - a ceiling, a baseline and interval.low above the baseline: the same text, with "above"
    # 4. Return the SliceResult. passed is True when there are no reasons. reason is "; ".join(reasons).
    ...`,
        test: "uv run pytest tests/evals -k evals08_s3",
      },
      {
        title: "Run the gate",
        text: "Write `run_gate` in `gate.py`. It rejects results for a slice the config does not name, then judges each configured slice in order and builds the `GateReport`. A configured slice with no results is judged as empty. The report passes only when every slice passes. Add `UTC` to your imports. The stub raises `evals-08 step 4`.",
        code: `# src/askpep/evals/gate.py
def run_gate(
    config: GateConfig,
    results: Mapping[str, Sequence[bool]],
    *,
    baseline: Mapping[str, float] | None = None,
    dataset_versions: Mapping[str, str] | None = None,
    git_sha: str = "",
    cost_usd: float = 0.0,
    now: datetime | None = None,
) -> GateReport:
    """Judge every slice the config names, and build the report."""
    # your turn:
    # 1. If results names a slice that config.slices does not, raise ValueError. A typo must not drop a slice.
    # 2. Judge each slice in config.slices, in order. Use results.get(name, []) and baseline.get(name).
    # 3. created_at is now, or the current time, in UTC, as "2026-10-21T09:30:00Z".
    # 4. Return the GateReport. passed is True only when every slice passed.
    ...`,
        test: "uv run pytest tests/evals -k evals08_s4",
      },
      {
        title: "Save the baseline and the report",
        text: "Write `load_baseline` and `write_report` in `gate.py`. The first reads an accepted report and returns one rate for each slice. It refuses a file that is not a version 1 report. The second writes the report as `<time>.json` and refuses to overwrite one. The stubs raise `evals-08 step 5`.",
        code: `# src/askpep/evals/gate.py
def load_baseline(path: Path = BASELINE) -> dict[str, float]:
    """Read an accepted report, and return its rate for each slice: {"retrieval": 0.88, ...}."""
    # your turn: read the JSON. When version is not 1, or slices is missing, raise ValueError.
    # Return {name: entry["rate"]} for each slice.
    ...


def write_report(report: GateReport, directory: Path = REPORTS) -> Path:
    """Write the report to <directory>/<created_at>.json, and return the path."""
    # your turn: build the file name from created_at with the dashes and colons removed.
    # Create the folder if it is missing. Open the file with mode "x", so an existing report raises
    # FileExistsError. Write report.to_json() with an indent of 2 and a final newline.
    ...`,
        test: "uv run pytest tests/evals -k evals08_s5",
      },
      {
        title: "Add the gate command",
        text: "Add `eval gate` to the `eval` group in `cli.py`. It loads the config and the baseline, runs every slice, writes the report and prints it. It exits 0, 1 or 2 as the table shows, and 3 for an error it did not expect. It raises `NotImplementedError` again. Step 6 has no stub.",
        code: `# src/askpep/cli.py
@eval_app.command("gate")
def eval_gate(
    baseline: Annotated[
        str, typer.Option("--baseline", help="Default: evals/baselines/main.json, if present.")
    ] = "",
    runs: RunsOption = 1,
    out: Annotated[
        str, typer.Option("--out", help="The folder for the report. Default: evals/reports.")
    ] = "",
    config: Annotated[str, typer.Option("--config", help="Default: evals/gate.json.")] = "",
    judge: JudgeOption = False,
    graph: GraphOption = "handoffs",
) -> None:
    """Run every slice in evals/gate.json. Exits 0 when all pass, 1 when a slice fails, 2 on a bad input or
    a provider error, and 3 on an unexpected error. A stub's NotImplementedError is raised again."""
    # your turn:
    # 1. GateConfig.load the config. Read the baseline from --baseline, or from BASELINE when that file
    #    exists. With neither, print "No baseline at {BASELINE}, so only the floors and ceilings apply."
    #    to stderr.
    # 2. backends, answer_judge, svc = open_eval(list(gate_config.slices), graph, judge). You have
    #    open_eval and close_eval from chapter 2, and the three option aliases RunsOption, JudgeOption
    #    and GraphOption from chapters 6, 3 and 2.
    # 3. runner.collect(gate_config.slices, backends, runs=runs, judge=answer_judge), then
    #    run_gate(..., git_sha=runner.current_git_sha()), then write_report.
    #    Call close_eval(svc) in a finally block.
    # 4. except (OSError, ValueError, KeyError, ProviderError): print the message to stderr, exit 2.
    #    except NotImplementedError: raise it again.
    #    except Exception: print "unexpected error, {type name}: {message}" to stderr, exit 3.
    # 5. Print report.to_json() as JSON with an indent of 2. Print "report written to {path}" to stderr.
    #    Exit 0 when report.passed, else 1.
    ...`,
        test: "uv run pytest tests/evals -k evals08_s6",
      },
    ],
    verify: "uv run pytest tests/evals -k evals08",
  },
  recap: [
    "A slice is one dataset and one number with a floor or a ceiling, and the gate reads each slice on its own.",
    "The `recall@6` rate is the share of items with full recall at 6, and the attack slice counts attacks that got through.",
    "A seeded bootstrap puts a repeatable interval around each rate, and a small slice gives a wide one.",
    "A slice fails past its limit, or when its whole interval is on the bad side of the baseline.",
    "Exit 0 is a pass and exit 1 is a failed slice. Exit 2 is bad input or a provider error, and exit 3 is a crash.",
    "CI signs in to Google with Workload Identity Federation, and the gate skips until all five secrets exist.",
    "A release rule names who accepts a baseline, what each exit code requires and what can never be waived.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In the release gate I learned that a rate needs an interval before it can block a release. I also learned that a crash must never share an exit code with a failed slice. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["evals-q11", "evals-q12", "evals-q18", "evals-q20"],
};

export default chapter;
