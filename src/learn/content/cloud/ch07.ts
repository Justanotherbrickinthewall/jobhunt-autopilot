import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "cloud-07-rollouts",
  course: "cloud",
  number: 7,
  title: "Ship to a tagged revision, then shift traffic in steps",
  tagline: "Give the new revision a tag, shift traffic in three steps, and let the online judges decide whether it stays.",
  minutes: 78,
  objectives: [
    "Define a revision, a tag and a tagged URL.",
    "Read and write the traffic list that sets a canary's share.",
    "Predict promote, wait or rollback from the numbers.",
    "Follow the loop and predict how it ends.",
    "Feed a quiet canary so it can be judged.",
    "Say what the judge job needs to run.",
    "Explain why the judge stays on the production image.",
    "Name the failure each part of the rollout workflow prevents.",
    "Run one rollout on your own project and tear it down.",
    "Record whose traffic judged a canary.",
  ],
  sections: [
    {
      id: "s1-tag",
      title: "A tag gives a revision its own URL while it serves no users",
      goal: "What are a revision, a tag and a tagged URL, and how is a tag named?",
      blocks: [
        {
          kind: "p",
          text: "A release reaches real users a share at a time, and a judge decides each next step. It is Wednesday 23 December. Yesterday's pipeline left a new version of AskPEP at 0 per cent. The new version under test is the canary, a word you met in chapter 6. The version serving users now is the **stable** one.",
        },
        {
          kind: "p",
          text: "Cloud Run keeps each version of a service as a revision. A revision is a frozen copy of the container image and its settings. Every deploy makes a new one. The service sends traffic to the revisions you name, and a revision can exist with no share of it at all.",
        },
        // CHECK: that a tagged revision with 0 per cent of the traffic is reachable at its own URL, which starts with the tag and three hyphens, and the tag rule: lower-case letters, digits and hyphens, starting with a letter. The Cloud Run tags page, read on 22 October 2026, says only "lowercase". FACTS.md holds nothing on Cloud Run tags.
        {
          kind: "p",
          text: "A **tag** is a label on one revision. It gives that revision its own URL, which starts with the tag and three hyphens.",
        },
        {
          kind: "p",
          text: "The service URL, the address of the service itself, follows the traffic shares. The tagged URL works even when the revision has 0 per cent of the traffic. So you can test the canary on the real database and secrets before a user sees it.",
        },
        {
          kind: "code",
          lang: "text",
          code: "https://sha-3c4d5e6---askpep-<hash>-<region>.a.run.app",
          caption: "The shape of a tagged URL. The middle part comes from your service URL.",
        },
        {
          kind: "callout",
          tone: "analogy",
          title: "A staff entrance",
          text: "A shop has a front door for customers and a staff door at the back. The service URL is the front door. A tagged URL is the staff door. You can walk through it and test the shop before you open the front door to anyone.",
        },
        {
          kind: "p",
          text: "The deploy workflow names each tag `sha-` plus the first seven characters of the commit's sha. The same commit always gives the same tag, so the git log finds the revision. In lab step 1 you write that rule in Python.",
        },
        {
          kind: "p",
          text: "The rule lower-cases the sha. It refuses a value with fewer than seven characters, or with any character outside 0 to 9 and a to f.",
        },
        {
          kind: "p",
          text: "The Cloud Run names and flags in this chapter were checked on 22 October 2026. Where a fact comes from reading the code and nobody has run it, the text says so.",
        },
        // CHECK: the field names of the JSON that gcloud prints for a service: `.status.traffic[]` with tag, revisionName, percent and url. FACTS.md holds nothing on the Cloud Run service JSON.
        {
          kind: "step",
          id: "cloud07-s01",
          title: "Read the traffic of your service",
          text: "Ask Cloud Run which revisions take traffic. The command only reads, so it costs nothing and changes nothing. You need a deployed service, so skip ahead to section 9 if you haven't deployed yet. Look for a row with a tag and 0 per cent.",
          lang: "bash",
          code: `gcloud run services describe askpep --region europe-west3 --format=json \\
  | jq -r '.status.traffic[] | [(.tag // "-"), .revisionName, (.percent // 0)] | @tsv'`,
          expect: "Sample output, invented. Yours will differ. The command needs jq, so install it with your package manager if it is missing.\n-\taskpep-00040-zpx\t100\nsha-3c4d5e6\taskpep-00042-mfr\t0",
        },
        {
          kind: "quiz",
          id: "cloud07-q1",
          question: "A revision has the tag sha-3c4d5e6 and 0 per cent of the traffic. What do you reach at the service URL, and at the tagged URL?",
          options: [
            "Neither reaches it until the revision gets a share.",
            "The service URL never reaches it, and the tagged URL does.",
            "Both reach it, because the tag marks it as the newest revision.",
            "The service URL reaches it once, and then the tag expires.",
          ],
          answer: 1,
          explain: "A tag gives the revision its own URL, and that URL works at 0 per cent. The service URL follows the traffic shares, and this revision has none.",
        },
        {
          kind: "p",
          text: "A tag lets you reach the canary. How do you give it a share of real traffic?",
        },
      ],
    },
    {
      id: "s2-traffic-plan",
      title: "A traffic list must name both revisions, and the loop remembers the stable one",
      goal: "How does a traffic list set a canary's share, and how can a patch delete a tag?",
      blocks: [
        {
          kind: "p",
          text: "The share each revision gets is the **traffic split**. A canary at 10 per cent sees one request in ten, so a bad canary spoils one request in ten. The loop is the function `run_rollout` in `rollout.py`. It widens the split in steps, 10, 50 and 100 per cent. Each step starts with a patch to the service.",
        },
        {
          kind: "p",
          text: "The service holds a `traffic` list. Each entry names a revision, its share and, if it has one, a tag. A patch does not edit one entry. It replaces the whole list, and whatever you leave out is gone.",
        },
        {
          kind: "p",
          text: "An **update mask** names the field a patch changes, and this patch names `traffic`. The function `traffic_plan` builds the list for each patch.",
        },
        // CHECK: the v2 field names `traffic` and `trafficStatuses` and the enum value TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION, against the Service and TrafficTarget pages of the Cloud Run Admin API v2 reference. FACTS.md holds nothing on them.
        {
          kind: "code",
          lang: "json",
          code: `[
  { "type": "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION", "revision": "askpep-00040-zpx", "percent": 90 },
  { "type": "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION", "revision": "askpep-00042-mfr", "percent": 10, "tag": "sha-3c4d5e6" }
]`,
          caption: "A traffic list at the first step. The revision names are invented.",
        },
        {
          kind: "p",
          text: "The service also reports `trafficStatuses`, which is read only. It shows where traffic goes now and holds the URL of each tag. The loop reads `trafficStatuses` to find the revision behind a tag. It writes `traffic`.",
        },
        // CHECK: that a patch of `traffic` replaces the whole list, drops an entry with no share and no tag, and deletes the tag of an entry that is left out, and that a revision with 0 per cent leaves `trafficStatuses`. The lab's fake Cloud Run behaves so. The Cloud Run docs only warn that a leftover tag on a deleted revision can cause traffic update errors. FACTS.md holds nothing on it.
        {
          kind: "callout",
          tone: "warn",
          title: "A patch deletes what it forgets",
          text: "Say an older revision still holds a tag from an earlier deploy, at 0 per cent. Leave it out of the new list and its tag goes, and so does its URL. An entry with no share and no tag disappears too. So `traffic_plan` keeps every tagged entry at 0.",
        },
        {
          kind: "p",
          text: "The loop must also remember the stable revision by name. After the step to 100, the old revision has no share, and Cloud Run drops it from `trafficStatuses`. A rollback at that step would find nothing to return to. So `run_rollout` reads the stable revision once, before the first step, and passes its name to every shift.",
        },
        {
          kind: "widget",
          id: "cloud07-traffic-plan",
          intro: "Four situations follow. In each, set the share of every revision, and say whether each tagged revision keeps its tag. The shares must add up to 100. You get a second try, then the answer. Watch what happens to a tag when its entry goes missing.",
        },
        {
          kind: "quiz",
          id: "cloud07-q2",
          question: "A rollback sets the canary to 0 per cent. What should the traffic list do with the canary's entry?",
          options: [
            "Drop it, because it takes no traffic.",
            "Keep it at 0 per cent with its tag, so the tagged URL still works.",
            "Move its tag to the stable revision.",
            "Keep it at 0 per cent, and remove its tag.",
          ],
          answer: 1,
          explain: "The tag stays on the canary, so its URL still works for a look at what went wrong. An entry with no share and no tag would be dropped, and the URL would go with it.",
        },
        {
          kind: "quiz",
          id: "cloud07-q3",
          question: "Why does `run_rollout` read the stable revision once, before the first step?",
          options: [
            "Reading the service is expensive.",
            "After a step to 100 the old revision may vanish from the statuses, so a later rollback could not find it.",
            "The stable revision changes at every step.",
            "The Cloud Run API allows one read for each rollout.",
          ],
          answer: 1,
          explain: "At 100 per cent the old revision has no share, so it leaves `trafficStatuses`. A rollback at that step has nothing to return to unless the loop kept the name.",
        },
        {
          kind: "p",
          text: "You can set the share. What decides whether the canary should get more?",
        },
      ],
    },
    {
      id: "s3-judge",
      title: "A canary is judged on 20 requests, then the SLOs, then the pass rate",
      goal: "What makes the judge answer promote, wait or rollback?",
      blocks: [
        {
          kind: "p",
          text: "After each step the loop waits, then asks one question. Should the canary carry on, wait for more traffic, or go back? `judge_canary` answers with a **decision**, which is `promote`, `wait` or `rollback`, and a list of reasons. It reads three things from earlier courses.",
        },
        {
          kind: "list",
          items: [
            "The request rows come from the `request_done` log line that chapter 6 of course 5 added. The function `rows_from_logs` turns each line into a row. A row counts as finished unless a desk run is waiting for a person to approve it.",
            "The verdicts are the pass or fail scores that the online judges of chapter 5 of course 5 give to a sample of answers. A scored answer is a judged answer, and the pass rate is the share of judged answers that pass.",
            "The SLOs are the objectives in `slos.json` from chapter 1 of course 5. The function `measure` says whether a set of rows meets one.",
          ],
        },
        {
          kind: "p",
          text: "The file holds six objectives, and each can roll a canary back. Four read the whole request: `answer-success`, `total-latency`, `guard-block-rate` and `cost-per-success`. Two read the time of one stage: `generate-latency` and `rerank-latency`.",
        },
        {
          kind: "p",
          text: "The rule runs in a fixed order. The 20 requests are a floor, and a canary below it is never judged.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "Count the finished requests. Fewer than 20 means wait, with the reason `requests`, and nothing else is read.",
            "Otherwise collect the reasons to roll back. Each unmet SLO adds `slo:` and its name, such as `slo:total-latency`.",
            "A pass rate below 0.8, with at least 5 judged answers, adds the reason `judge`.",
            "Any reason means rollback, with every reason listed.",
            "With no reason, fewer than 5 judged answers means wait, with the reason `verdicts`. Otherwise promote.",
          ],
        },
        {
          kind: "p",
          text: "Only verdicts from a judge count. A thumbs-down from a user has the source `user`, and the rule ignores it.",
        },
        {
          kind: "p",
          text: "The numbers are small, so know what they allow. With 20 requests, one failure still meets the `answer-success` target of 0.95, and two do not. A pass rate of exactly 0.8 promotes, because only a rate below 0.8 counts against the canary.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "A stage objective counts only the rows that carry that stage's time",
          text: "`rows_from_logs` copies the `stage_ms` of each log line into the row's `timings`. `measure` checks a stage objective only on rows that have that stage. A request with no `rerank` time adds nothing to `rerank-latency`. If no row has the stage, the objective is met, so a stage with no data can't roll a canary back.",
        },
        {
          kind: "widget",
          id: "cloud07-canary-verdict",
          intro: "Six canaries follow, each with its numbers. Say what `judge_canary` answers, and why. You get a second try on each. Watch which rule fires first.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Canary gates come up in interviews",
          text: "Canary gates come up in interviews. Interviewers ask which gates stop a canary. Separate the hard gates, error rate and latency against an objective, from the soft one, a judge's pass rate. Add a floor on traffic, since three requests prove nothing. AskPEP's floor is 20 requests, then the SLOs, then a pass rate of 0.8 over at least 5 judged answers.",
        },
        {
          kind: "p",
          text: "The judge gives one answer at one moment. Which loop asks the question, and when does it stop?",
        },
      ],
    },
    {
      id: "s4-loop",
      title: "The loop rolls back on a rollback decision, a timeout or a judge failure",
      goal: "How does the loop end, and what does it print?",
      blocks: [
        {
          kind: "p",
          text: "`run_rollout` goes through the steps 10, 50 and 100. At each step it shifts the traffic and then waits. That wait is the **soak**, 300 seconds by default. After each soak the loop asks the judge function for a decision.",
        },
        {
          kind: "p",
          text: "A `promote` decision ends the wait and starts the next step. A `rollback` decision sends all traffic back and ends the rollout. A `wait` decision goes round again, up to six times at each step. Six waits with no promote are a **timeout**, and a timeout rolls back.",
        },
        {
          kind: "p",
          text: "A rollback is a traffic patch like any other. It sets the canary to 0 per cent and the stable revision to 100. The canary keeps its tag, so you can open its URL and look at what went wrong.",
        },
        {
          kind: "p",
          text: "The time adds up. A step can wait six times for 300 seconds, which is 30 minutes. Three steps make 90 minutes, or 5400 seconds. A rollout that promotes at the first wait of every step takes 15 minutes. You meet the 5400 again in section 6.",
        },
        {
          kind: "p",
          text: "The judge can fail too. The log read can error, or the database can drop the connection. A rollout that can't tell how the canary is doing must not keep sending it traffic. So `run_rollout` rolls back first, and then raises the same error.",
        },
        {
          kind: "p",
          text: "The command `python -m askpep.rollout --tag sha-3c4d5e6` calls `main`, which runs the whole loop. On Cloud Run a job runs this command, as section 6 explains.",
        },
        {
          kind: "p",
          text: "After each judgement the loop prints one line, such as `sha-3c4d5e6 at 10%: wait ['requests'] (3 requests)`. At the end it prints one more line. It exits 0 when the canary is promoted and 1 when it is rolled back.",
        },
        {
          kind: "compare",
          caption: "The four ways a rollout ends. Read from the print statements in `main`. Nothing was run.",
          columns: ["How it ends", "The last line printed", "Exit code", "The canary afterwards"],
          rows: [
            ["Every step promotes", "promoted at 100% []", "0", "100 per cent, tag kept"],
            ["A rollback decision at 50 per cent", "rolled_back at 50% ['slo:answer-success']", "1", "0 per cent, tag kept"],
            ["Six waits at 10 per cent", "rolled_back at 10% ['timeout']", "1", "0 per cent, tag kept"],
            ["The judge raises an error", "A traceback, and no final line", "1", "0 per cent, tag kept"],
          ],
        },
        {
          kind: "quiz",
          id: "cloud07-q4",
          question: "At 50 per cent the judge raises a ConnectionError. Where does the canary end up?",
          options: [
            "Still at 50 per cent, because the loop stopped.",
            "At 0 per cent, and then the loop raises the error.",
            "At 100 per cent, because no decision means promote.",
            "At 0 per cent, and the error is swallowed.",
          ],
          answer: 1,
          explain: "A judge that raises makes the loop roll back first, and then raise the same exception. The job fails with a traceback, and the canary has no traffic.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Rolling out a model or prompt change comes up in interviews",
          text: "Rolling out a model or prompt change comes up in interviews. A good answer ships the change to a small share, with a way back. It names what decides the next step, which is online metrics. In AskPEP a prompt change ships inside the image, so it rides this same rollout. And the judge must run code that production already runs.",
        },
        {
          kind: "p",
          text: "The loop waits for 20 finished requests. What happens if they never come?",
        },
      ],
    },
    {
      id: "s5-quiet",
      title: "A quiet project times out unless you send the canary traffic",
      goal: "When does a rollout time out, and how do you feed a quiet canary?",
      blocks: [
        {
          kind: "p",
          text: "The floor of 20 requests has a cost. A project with no users never reaches it. Every wait answers `wait` for `requests`, the loop waits six times at 10 per cent, and then it rolls back with the reason `timeout`. The workflow goes red, and nothing was wrong with the canary.",
        },
        {
          kind: "p",
          text: "So you send the canary traffic yourself, while the rollout runs. Use the tagged URL. A request to the service URL reaches the canary only at its share, which is 10 per cent at the first step. Twenty questions to the service URL give the canary about two.",
        },
        {
          kind: "p",
          text: "Timing matters too. The job counts requests from one minute before it starts, and it never resets that window. Requests therefore count across all three steps. Questions sent ten minutes before the job starts are not counted. Twenty-five sent during the first soak still count at 50 and at 100 per cent.",
        },
        // CHECK: that request_done entries reach Cloud Logging soon enough for a wait of five minutes to read them. FACTS.md holds nothing on Cloud Logging delay.
        {
          kind: "p",
          text: "Start sending in the first minutes of the job. The log lines then have time to reach Cloud Logging before the first judgement.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Send only the answerable questions",
          text: "The lab's golden file, `evals/golden.jsonl`, has 22 questions. The story's gate uses 104. Two of the lab's have no answer on purpose, so AskPEP refuses them. The `answer-success` SLO counts a refusal as a failure. Twenty of 22 is 0.91, under the target of 0.95, so sending all 22 rolls the canary back. Send the 20 answerable ones.",
        },
        {
          kind: "widget",
          id: "cloud07-quiet-rollout",
          intro: "Five situations follow. Say how each rollout ends. Each reveal shows a sample log, so watch the request count at every wait.",
        },
        {
          kind: "p",
          text: "Section 9 has the commands that send the questions, and the order to run everything in.",
        },
        {
          kind: "quiz",
          id: "cloud07-q5",
          question: "You send 22 answerable questions to the tagged URL during the first soak. The rollout reaches 50 per cent. Do those 22 count again at that step?",
          options: [
            "No, the count resets at each step.",
            "Yes, the window never resets, so they still count.",
            "Only half of them count, because the share doubled.",
            "Only if you send them again.",
          ],
          answer: 1,
          explain: "The job reads the log from one minute before it started, and it never resets that start. The count is cumulative. At 50 per cent the 22 are already there, so the floor of 20 is met at once.",
        },
        {
          kind: "fold",
          tone: "trouble",
          title: "The rollout keeps waiting",
          text: "First check that your requests returned 200. Then check that you sent them after the job started. Then open the logs and check that the request_done lines carry the canary's revision name. A reason of verdicts means fewer than 5 answers were sampled, so send about 10 more.",
        },
        {
          kind: "p",
          text: "The loop can run for up to 90 minutes. Where can it run, given that the database has no public address?",
        },
      ],
    },
    {
      id: "s6-job",
      title: "The judge is a job in the VPC, with one grant on one service",
      goal: "Why does the judge run as a Cloud Run job, and what does it need?",
      blocks: [
        {
          kind: "p",
          text: "The loop needs somewhere to run for up to 90 minutes. It reads the `traces` table, and that database has a private IP address. A GitHub runner can't reach a private address. So the loop runs as a Cloud Run job inside your VPC, and the workflow only starts it.",
        },
        {
          kind: "p",
          text: "A job runs a container to the end and then stops. You met one in chapter 3, the ingest job. This one is named `askpep-rollout`. It runs `python -m askpep.rollout`, with the tag passed as an argument.",
        },
        // CHECK: that Direct VPC egress with PRIVATE_RANGES_ONLY sends only traffic for private address ranges through the VPC, and that Anthropic and the Google APIs are reached over the default route. FACTS.md holds nothing on Direct VPC egress.
        {
          kind: "p",
          text: "The job reaches the database through Direct VPC egress. The setting `PRIVATE_RANGES_ONLY` sends only calls to private addresses through the VPC. Calls to Anthropic and to Google's APIs leave by the usual route.",
        },
        {
          kind: "p",
          text: "The job runs as the service account `askpep-canary`, which `identity.tf` defines. It reads three secrets, the database URL, the Anthropic key and the Voyage key. `rollout.tf` lists them in one local, `rollout_secret_env`. A grant for each secret, made with `for_each`, lets the account read those three and no others.",
        },
        // CHECK: that a Cloud Run job task has a default timeout of 10 minutes and a maximum of 168 hours, as the task timeout page said when read on 22 October 2026, and how many retries a task gets when max_retries is not set. FACTS.md holds nothing on Cloud Run jobs.
        {
          kind: "p",
          text: "The job never retries, so `max_retries` is 0. A retry would start the loop again at 10 per cent, on a service that may already be at 50.",
        },
        {
          kind: "p",
          text: "The timeout is 5400 seconds, the sum from section 4. The default is much shorter, 10 minutes, so the job would die mid-rollout. A job killed by its timeout cannot roll back.",
        },
        // CHECK: that roles/run.developer on one service lets an account read the service and patch its traffic, that it also lets the account update the service, and whether a custom role with only the traffic permissions would be enough. FACTS.md holds nothing on Cloud Run roles.
        {
          kind: "callout",
          tone: "warn",
          title: "The grant is narrow, and still wide",
          text: "`roles/run.developer` sits on the service `askpep`, so the judge can't touch any other service or job. That is far narrower than a grant on the project. It is still wider than a traffic change, because the role also lets the account update the service. A custom role would be tighter, and its permissions need checking first.",
        },
        {
          kind: "quiz",
          id: "cloud07-q6",
          question: "Why is `max_retries` 0 on the rollout job?",
          options: [
            "Retries cost money.",
            "A retry would restart the loop at 10 per cent on a service that may be at 50.",
            "A job can't retry inside a VPC.",
            "The judge never fails.",
          ],
          answer: 1,
          explain: "The loop always starts at the first step. A retry after a failure at 50 per cent would shift the canary down to 10, and the soak and the judgement would start again.",
        },
        {
          kind: "p",
          text: "The judge runs in the VPC. Which code does it run?",
        },
      ],
    },
    {
      id: "s7-image",
      title: "The judge runs the production image, so a candidate never judges itself",
      goal: "Why does the judge stay on the production image until a promotion?",
      blocks: [
        {
          kind: "p",
          text: "The rollout judges new code. If the judge ran that same code, a bug in `judge_canary` could approve itself. Picture a change that makes the function always answer `promote`. It would wave through the very change that broke it.",
        },
        {
          kind: "p",
          text: "So the judge job runs the image that production already runs. The deploy workflow updates the service and the ingest job, and it leaves `askpep-rollout` alone. After the first apply, Terraform ignores the job's image. The last step of the workflow, in `rollout.yml`, updates the job to the new image, and only after a promotion.",
        },
        {
          kind: "p",
          text: "A rollback leaves the job where it was. The price is a delay of one release. A change to the judge is judged by the old judge, and the new judge starts work at the next rollout.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "The first rollout needs a hand-set image",
          text: "Terraform creates the job on a placeholder image, and only a promotion updates it. On a new project no promotion can come first, because the placeholder holds no rollout code. So you set the first image by hand, once. That is the one time a candidate judges itself. Do it only after lab steps 1 to 4 pass.",
        },
        {
          kind: "quiz",
          id: "cloud07-q7",
          question: "A pull request changes `judge_canary` so that it always answers promote. What judges the canary that carries that change?",
          options: [
            "The new `judge_canary`, so the canary is promoted.",
            "The `judge_canary` in the production image, which still has the real rule.",
            "Nothing, because the workflow skips the judge for code changes.",
            "The Terraform plan.",
          ],
          answer: 1,
          explain: "The job runs the image that production already runs, and it only changes to the new image after a promotion. The old judge reads the new canary, and its real rule decides.",
        },
        {
          kind: "p",
          text: "The judge is safe from its own candidate. What starts it, and what does each step of the workflow prevent?",
        },
      ],
    },
    {
      id: "s8-workflow",
      title: "The workflow checks the tag first, fails on a rollback and updates the judge last",
      goal: "Which failure does each part of `rollout.yml` prevent?",
      blocks: [
        {
          kind: "p",
          text: "The workflow is short, and each part prevents one failure. A person starts it by hand, with one input, the tag. Nothing else starts it. It runs in the `production` environment, where a reviewer rule can hold it. Two rollouts never run at once, and a running one is never cancelled.",
        },
        {
          kind: "p",
          text: "The tag is text a person typed. Chapter 6 showed why a typed value never goes into a script as an expression. So the tag goes into the environment variable `TAG`, and every script reads `$TAG` as data.",
        },
        {
          kind: "p",
          text: "A check on `$TAG` comes next. It accepts `sha-` and seven characters from 0 to 9 and a to f, and nothing else. It runs before the sign-in step, called `auth`, so a bad tag stops the run before Google gives the job an identity token.",
        },
        // CHECK: that gcloud run jobs execute with --wait exits non-zero when the execution fails, and the syntax of --args. The jobs execute page, read on 22 October 2026, does not say what exit code a failed execution gives. It does say that overriding arguments needs roles/run.developer on the job. FACTS.md holds nothing on it.
        {
          kind: "p",
          text: "The job step uses `--wait`, so the command waits for the job to end. The job exits 1 on a rollback, so the step fails and the workflow goes red. Nothing hides that failure. A red workflow is how a rollback tells you it happened.",
        },
        {
          kind: "p",
          text: "The last step points the judge at the promoted image. It has no `always` or `failure` condition, so it runs only when every earlier step passed. A rollback stops the workflow before it gets there.",
        },
        // CHECK: the current major versions of google-github-actions/auth and google-github-actions/setup-gcloud. The workflow uses v2. FACTS.md holds nothing on them.
        {
          kind: "p",
          text: "Every action names a version and never a branch. A branch such as `main` can change at any commit, and your pipeline would run code you never read.",
        },
        {
          kind: "quiz",
          id: "cloud07-q8",
          question: "Why does the tag check run before the `auth` step?",
          options: [
            "The auth step needs the tag as an input.",
            "A bad tag then stops the run before the job is given an identity token.",
            "The check is faster than the sign-in.",
            "GitHub requires every check to come first.",
          ],
          answer: 1,
          explain: "The check costs nothing and holds no credentials. A tag that fails it never gets as far as a sign-in, so nothing with a token reads it.",
        },
        {
          kind: "p",
          text: "The pieces are written. What does a real rollout take on your own project?",
        },
      ],
    },
    {
      id: "s9-live",
      title: "A first real rollout needs a hand-set image, traffic from you and a teardown",
      goal: "How do you run one rollout on your own project and then tear it down?",
      blocks: [
        {
          kind: "p",
          text: "This section is for your own project. Every command here changes something or costs something, so read the cost first. Do it after lab steps 1 to 6 pass. Sample output is marked as sample, and none of these commands were run when this chapter was written.",
        },
        // CHECK: the Cloud Run job price per vCPU second and per GiB second in europe-west3, whether an idle job bills, and whether a tagged revision with no traffic bills while idle. FACTS.md holds nothing on Cloud Run prices.
        {
          kind: "p",
          text: "The job bills for the minutes it runs, up to 90. Each question you send is a request on the canary, and each judged answer is a call to the Anthropic API.",
        },
        {
          kind: "p",
          text: "The rollout judges half the answers by default, with `--sample-rate 0.5`. That is separate from the online judges, which sample 0.1 in production. Multiply your questions by the cost per success from chapter 4 of course 5 for a rough bill.",
        },
        {
          kind: "step",
          id: "cloud07-s02",
          title: "Plan and apply the judge job",
          text: "Plan the new file first, and read what it creates. Expect about five resources, the job and four grants. Then apply. An idle job should not bill, and the last step of this section destroys it.",
          lang: "bash",
          code: `terraform -chdir=infra/terraform plan
terraform -chdir=infra/terraform apply`,
          expect: "A sample plan line, not output from a run: Plan: 5 to add, 0 to change, 0 to destroy.",
        },
        {
          kind: "step",
          id: "cloud07-s03",
          title: "Check that the image holds the SLO file",
          text: "The judge reads `infra/monitoring/slos.json` from its working directory. The current Dockerfile copies that file into the image. A workspace copied from the template before this chapter may lack the line. Check yours, and add the line below `COPY evals ./evals` if it is missing. The `[n]` makes the copy optional, so an image still builds without the file.",
          lang: "bash",
          code: `grep -n "slos" Dockerfile
# If nothing prints, add this line below COPY evals ./evals:
# COPY infra/monitoring/slos.jso[n] ./infra/monitoring/`,
          expect: "One line, with its line number first, that reads COPY infra/monitoring/slos.jso[n] ./infra/monitoring/. The next image build holds the SLO file under the working directory.",
        },
        {
          kind: "step",
          id: "cloud07-s04",
          title: "Push to main for a revision with a tag",
          text: "Push your work to main. The deploy workflow builds the image, runs the eval gate and deploys a revision with a tag and no traffic. The eval gate makes model calls, so it costs a little. The last line of its summary names the tag.",
          lang: "bash",
          code: "git push origin main",
          expect: "The summary ends with a line like this, with your own tag: Revision sha-abc1234 has no traffic. Run the rollout workflow with this tag.",
        },
        // CHECK: the gcloud field path of a job's image, spec.template.spec.template.spec.containers[0].image, and that `gcloud run jobs update --image` replaces it. FACTS.md holds nothing on it.
        {
          kind: "step",
          id: "cloud07-s05",
          title: "Set the judge's first image by hand",
          text: "A new project's judge job still holds the placeholder image. Point it at the image you just built, once. The image tag is the short sha, without the sha- prefix. This is the one time a candidate judges itself.",
          lang: "bash",
          code: `gcloud run jobs update askpep-rollout --region europe-west3 \\
  --image "$(terraform -chdir=infra/terraform output -raw image_repository):abc1234"`,
          expect: "gcloud reports that it updated the job. Step 8 shows you the image.",
        },
        {
          kind: "step",
          id: "cloud07-s06",
          title: "Start the rollout",
          text: "Run the rollout workflow with your tag, from the Actions tab or with the GitHub CLI. While it runs, find the tagged URL with the second command. It prints a URL in the shape from section 1.",
          lang: "bash",
          code: `gh workflow run rollout.yml -f tag=sha-abc1234
gcloud run services describe askpep --region europe-west3 --format=json \\
  | jq -r --arg tag sha-abc1234 '.status.traffic[] | select(.tag == $tag) | .url'`,
          expect: "The first command queues a workflow run. The second prints the tagged URL.",
        },
        {
          kind: "step",
          id: "cloud07-s07",
          title: "Send the canary its traffic",
          text: "Send the 20 answerable questions to the tagged URL, twice. Start within the first five minutes of the job. This assumes the service accepts calls without an identity token and guards the route with your API key. If you turned IAP on, add a token as well.",
          lang: "bash",
          code: `# url is the tagged URL from the last step. API_KEY is your AskPEP key.
for round in 1 2; do
  jq -r 'select(.answerable) | .question' evals/golden.jsonl | while read -r q; do
    curl -s -o /dev/null -w '%{http_code}\\n' --max-time 120 -X POST "$url/ask" \\
      -H "X-API-Key: $API_KEY" -H "Content-Type: application/json" \\
      --data "$(jq -n --arg q "$q" '{question: $q}')"
  done
done`,
          expect: "A column of 200 lines, 40 in all. A 401 means the key is wrong, and a 5xx means the canary is failing.",
        },
        {
          kind: "step",
          id: "cloud07-s08",
          title: "Read how it ended",
          text: "When the workflow ends, run the section 1 command again, then read the job's image. A promoted tag shows 100 per cent and the job holds the new image. A rolled back or timed out tag shows 0, and the job image has not changed.",
          lang: "bash",
          code: `gcloud run services describe askpep --region europe-west3 --format=json \\
  | jq -r '.status.traffic[] | [(.tag // "-"), .revisionName, (.percent // 0)] | @tsv'
gcloud run jobs describe askpep-rollout --region europe-west3 \\
  --format='value(spec.template.spec.template.spec.containers[0].image)'`,
          expect: "Two answers to read against the text of this step. If the workflow went red, open the job's log for the last line it printed.",
        },
        // CHECK: that `gcloud run services update-traffic --remove-tags` removes a tag and leaves the revision and its traffic alone. FACTS.md holds nothing on it.
        {
          kind: "step",
          id: "cloud07-s09",
          title: "Tear it down",
          text: "Look at the tagged URL first if the canary rolled back. Then remove the tag. If you are done with rollouts, move `rollout.tf` out of the folder, so the next plan destroys its five resources. Read that plan before you apply it. Skip the second half if you plan another rollout soon.",
          lang: "bash",
          code: `gcloud run services update-traffic askpep --region europe-west3 --remove-tags sha-abc1234
mv infra/terraform/rollout.tf ~/rollout.tf.bak
terraform -chdir=infra/terraform plan
terraform -chdir=infra/terraform apply`,
          expect: "A sample plan line, not output from a run: Plan: 0 to add, 0 to change, 5 to destroy. If the plan names anything else, stop and read it before you apply. Move the file back before you rerun the lab tests, because they read it.",
        },
        {
          kind: "p",
          text: "You can run a rollout now. What did AskPEP's first one do, on a service with almost no traffic?",
        },
      ],
    },
    {
      id: "s10-first-canary",
      title: "AskPEP's first canary timed out, then passed on traffic it was sent",
      goal: "What do you record about a canary, and what can a canary on test traffic not prove?",
      blocks: [
        {
          kind: "p",
          text: "A canary record states which traffic judged the release, and it says so even when that traffic was your own. AskPEP has about 200 requests a day, which is about 22 an hour, so a 10 per cent share sees about 2 an hour. The floor of 20 requests was never going to arrive by itself.",
        },
        {
          kind: "p",
          text: "Here is how the first canary went. Every time and count below is invented.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "You started the rollout of `sha-5d2e9a1` at 10:05. At 10 per cent it waited six times, and it rolled back with the reason `timeout` at 10:35.",
            "The second team's lead asked, \"Did my people see anything?\" Only one in ten requests had reached it, and those answers were fine. Nothing was wrong with the canary.",
            "You read section 5 again. A quiet project needs traffic you send yourself, so you planned 40 answerable questions to the tagged URL, sent during the first soak.",
            "You started again at 14:00. The judge promoted at 10, 50 and 100 per cent on the first wait of each step.",
            "The security reviewer said, \"Write down that it was your traffic. A pass on your own questions is a smaller claim than a pass on theirs.\"",
            "The product owner said, \"Good. Nothing ships now until 4 January.\" The new revision serves the second team over the holiday.",
          ],
        },
        {
          kind: "code",
          lang: "text",
          code: `# CANARY-001  Wednesday 23 December 2026
Revision: sha-5d2e9a1. Stable before: askpep-00040. Started by: engineering.

Attempt 1, 10:05
10%   waited six times, reason requests
Result: rolled back, reason timeout, at 10:35. Canary had done nothing wrong.

Attempt 2, 14:00
Traffic: 40 answerable questions sent to the tagged URL, in the first soak.
Step   Requests   Verdicts   Pass rate   SLOs     Decision
10%    40         20         0.90        all met  promote
50%    46         23         0.91        all met  promote
100%   51         25         0.92        all met  promote

Rollout job exit code: 0. Judge image updated to 5d2e9a1.

Limits of this result
The verdicts came from our questions, plus a few from real users.
The third team's traffic has not been seen.

No release: 24 December to 3 January (product owner).
Open for January: budget, kill switch drill, sign-in, restore drill, first bill.`,
          caption: "The record of AskPEP's first canary. Every value is invented.",
        },
        {
          kind: "p",
          text: "Read attempt 1 before attempt 2, because the timeout is the useful part. It proves the floor works and shows that AskPEP is a quiet project. Then read the limits. The result is real for the second team's questions and silent about the third team.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# CANARY-<number>  <date>
Revision:
Stable before:
Started by:

Attempts, each with its result and reason:

Traffic used, and whose it was:

Step    Requests    Verdicts    Pass rate    SLOs    Decision

Limits of this result:
Next:`,
          caption: "For your next rollout: say whose traffic judged it, every time.",
        },
        {
          kind: "p",
          text: "The release is live and the holiday begins. On 4 January, can you stop this service, sign people in and restore its data when something goes wrong?",
        },
      ],
    },
  ],
  lab: {
    title: "Build the rollout loop, the judge job and the workflow",
    goal: "Write the rollout loop in `rollout.py`, then the job that runs it in `rollout.tf`, then the workflow that starts it. The tests fake Cloud Run and read the Terraform and the workflow as text, so nothing touches a cloud. Run them from your AskPEP workspace root. Then compare your files with `capstone/` in the my-learn folder.",
    minutes: 110,
    files: [
      "src/askpep/rollout.py",
      "infra/terraform/rollout.tf",
      ".github/workflows/rollout.yml",
      "tests/cloud/test_cloud07_rollouts.py",
    ],
    steps: [
      {
        title: "Name the tag of a commit",
        text: "Write `revision_tag` in `rollout.py`. It strips and lower-cases the sha. Fewer than seven characters, or any character outside 0 to 9 and a to f, raises `ValueError`. Otherwise it returns `sha-` plus the first seven. Add `import re`. The stub raises `cloud-07 step 1`.",
        code: `# src/askpep/rollout.py
# Add this import at the top: import re
def revision_tag(sha: str) -> str:
    """The tag for a git commit: \`sha-\` and its first 7 characters, in lower case.

    Strip the argument and lower-case it. A value that has fewer than 7 characters, or that holds anything
    but the hex digits 0 to 9 and a to f, raises ValueError. A tag may hold only lower-case letters, digits
    and hyphens, and must start with a letter, so \`sha-\` comes first.
    """
    # your turn:
    # 1. digest = the stripped, lower-cased sha.
    # 2. Raise ValueError, with the sha in the message, when digest is shorter than 7 characters
    #    or when re.fullmatch(r"[0-9a-f]+", digest) finds no match.
    # 3. Return "sha-" and the first 7 characters of digest.
    ...`,
        test: "uv run pytest tests/cloud -k cloud07_s1",
      },
      {
        title: "Build the traffic list and apply it",
        text: "Write `traffic_plan` and `shift_traffic`. The plan gives the stable revision the rest and the tagged canary its share, and keeps every other tagged entry at 0. `shift_traffic` reads the service, builds the plan and patches `traffic` with that update mask. The stubs raise `cloud-07 step 2`.",
        code: `# src/askpep/rollout.py
# stable_revision, revision_of_tag and TRAFFIC_REVISION ship in your stub. Use them.
def traffic_plan(
    service: Mapping[str, Any], tag: str, percent: int, *, stable: str | None = None
) -> list[dict[str, Any]]:
    """The \`traffic\` list that gives the revision tagged \`tag\` \`percent\` per cent, and the rest to \`stable\`.

    \`service\` is the Cloud Run v2 JSON. Its \`trafficStatuses\` says which revision each tag points at.

    1. \`percent\` is a whole number from 0 to 100, or ValueError.
    2. No entry of \`trafficStatuses\` carries \`tag\`: ValueError that names the tag.
    3. \`stable\` defaults to \`stable_revision(service, tag)\`. When it is the canary's own revision, raise
       ValueError, because there is nothing to shift.
    4. The first entry is the stable revision, with \`100 - percent\`. The second is the canary revision, with
       \`percent\` and \`tag\`. Both have \`type\` \`TRAFFIC_REVISION\`. Both stay in the list when their share is 0,
       so a rollback keeps the tag and the revision it returns to.
    5. Every other tagged entry of \`trafficStatuses\`, whose tag is not \`tag\` and whose revision is not the
       canary's, stays as \`{"type", "revision", "percent": 0, "tag"}\`. Dropping it would delete that tag.
    6. The shares add up to 100.
    """
    # your turn:
    # 1. Check percent: an int that is not a bool, from 0 to 100.
    # 2. canary = revision_of_tag(service, tag). It raises the ValueError that names the tag.
    # 3. old = stable when it is given, else stable_revision(service, tag). Raise when old equals canary.
    # 4. Start the list with the stable entry and then the canary entry.
    # 5. Loop over service["trafficStatuses"] and add each other tagged entry at 0, with its tag.
    ...


def shift_traffic(
    client: RunApi, tag: str, percent: int, *, stable: str | None = None
) -> list[dict[str, Any]]:
    """Read the service, build \`traffic_plan\` for \`tag\` and \`percent\`, patch \`{"traffic": plan}\` with the
    update mask \`traffic\`, and return the plan. A plan that raises ValueError patches nothing."""
    # your turn: build the plan from client.get_service() first, then client.patch_service(...), then return it.
    ...`,
        test: "uv run pytest tests/cloud -k cloud07_s2",
      },
      {
        title: "Judge a canary",
        text: "Write `judge_canary`. Fewer than 20 finished requests wait. Otherwise each unmet SLO adds a reason, and a low pass rate over enough verdicts adds `judge`. Any reason rolls back, too few verdicts wait, and the rest promote. Add the imports the comments list. The stub raises `cloud-07 step 3`.",
        code: `# src/askpep/rollout.py
# Add these imports: is_finished and request_rows to the line that imports Row,
# and measure to the line that imports Slo.
def judge_canary(
    rows: Sequence[Row],
    verdicts: Sequence[Feedback],
    slos: Sequence[Slo],
    *,
    min_requests: int = 20,
    min_verdicts: int = 5,
    min_pass_rate: float = 0.8,
) -> CanaryVerdict:
    """Decide what a canary's numbers say. \`rows\` are the canary's requests, \`verdicts\` the online judges'
    scores for them, and \`slos\` the objectives that \`slo.measure\` checks.

    1. \`requests\` is the number of finished request rows (\`request_rows\` and \`is_finished\`). \`judged\` is the
       verdicts whose \`source\` is \`judge\`, and \`pass_rate\` is the share of them labelled \`pass\`, or None
       when there are none.
    2. Fewer than \`min_requests\`: \`wait\`, with the reason \`requests\`. A canary with three requests proves
       nothing, even when all three failed.
    3. Otherwise collect the reasons to roll back. Each SLO that \`measure\` says is not met adds
       \`slo:<name>\`. A \`pass_rate\` below \`min_pass_rate\`, with at least \`min_verdicts\` judged, adds \`judge\`.
    4. Any reason: \`rollback\`, with every reason.
    5. Fewer than \`min_verdicts\` judged: \`wait\`, with the reason \`verdicts\`.
    6. Otherwise \`promote\`, with no reasons.

    Every result carries \`requests\` and \`pass_rate\`.
    """
    # your turn:
    # 1. counted = the rows of request_rows(rows) for which is_finished(row) is true.
    #    judged = the verdicts whose source is "judge". Verdicts from users are ignored.
    #    rate = the share of judged labelled "pass", or None when judged is empty.
    # 2. Fewer than min_requests in counted: return CanaryVerdict("wait", ("requests",), len(counted), rate).
    # 3. reasons = one "slo:<name>" for each slo where measure(slo, counted).met is false.
    #    Add "judge" when rate is below min_pass_rate and at least min_verdicts were judged.
    # 4. Any reason: return a rollback with tuple(reasons).
    # 5. Fewer than min_verdicts judged: a wait with ("verdicts",). Otherwise a promote with ().
    ...`,
        test: "uv run pytest tests/cloud -k cloud07_s3",
      },
      {
        title: "Roll back, and run the loop",
        text: "Write `rollback` and `run_rollout`. Rollback shifts the canary to 0. The loop checks its steps, reads the stable revision once, then shifts, soaks and judges up to six times at each step. It rolls back on a rollback decision, on a timeout and when the judge raises. The stubs raise `cloud-07 step 4`.",
        code: `# src/askpep/rollout.py
def rollback(client: RunApi, tag: str, *, stable: str | None = None) -> list[dict[str, Any]]:
    """Send all traffic back to the stable revision: \`shift_traffic(client, tag, 0, stable=stable)\`. The tag
    stays on the canary, so its URL still works for a look at what went wrong."""
    # your turn: one call to shift_traffic, with percent 0.
    ...


def run_rollout(
    client: RunApi,
    tag: str,
    judge: Callable[[str, int], CanaryVerdict],
    *,
    steps: Sequence[int] = STEPS,
    soak_s: float = 300.0,
    max_waits: int = 6,
    sleep: Callable[[float], None] = time.sleep,
) -> RolloutResult:
    """Move traffic to the tagged revision step by step, and roll back on the first bad verdict.

    1. \`steps\` must be non-empty, strictly increasing, and end at 100, or ValueError before anything moves.
    2. Read the stable revision once, with \`stable_revision(client.get_service(), tag)\`, and pass it to every
       shift and to \`rollback\`. After a step to 100 the old revision may no longer show in the statuses.
    3. For each step, \`shift_traffic\` to it. Then up to \`max_waits\` times: \`sleep(soak_s)\`, then ask
       \`judge(tag, percent)\`.
    4. \`promote\` ends the wait and goes to the next step. \`rollback\` rolls back and returns
       \`RolloutResult("rolled_back", percent, reasons)\`. \`wait\` goes round again.
    5. \`max_waits\` waits with no promote roll back, with the reason \`timeout\`.
    6. A \`judge\` that raises rolls back, and then raises the same exception. A rollout that can't tell how
       the canary is doing must not keep sending it traffic.
    7. After the last step is promoted, return \`RolloutResult("promoted", steps[-1])\`.
    """
    # your turn:
    # 1. Validate steps before anything moves.
    # 2. stable = stable_revision(client.get_service(), tag). Pass it to every shift and to rollback.
    # 3. For each percent in steps: shift_traffic, then a for loop of max_waits rounds. A for loop with an
    #    else clause fits the timeout, because the else runs when the loop ends without a break.
    # 4. In a round: sleep(soak_s), then judge(tag, percent) inside a try. If it raises, rollback, then raise again.
    # 5. promote: break. rollback: roll back and return RolloutResult("rolled_back", percent, verdict.reasons).
    # 6. The else of the loop: roll back and return a rolled_back result with the reasons ("timeout",).
    # 7. After the last step: return RolloutResult("promoted", steps[-1]).
    ...`,
        test: "uv run pytest tests/cloud -k cloud07_s4",
      },
      {
        title: "Write the judge job",
        text: "Write `rollout.tf`. It defines the job `askpep-rollout` as `askpep-canary`, inside the VPC, with no retries and a timeout that covers the longest rollout. It reads three secrets through `rollout_secret_env`, with a grant for each. It gives the account `roles/run.developer` on the service `askpep` only.",
        code: `# infra/terraform/rollout.tf
# Your stub is comments only. Write the whole file. The ingest job in run.tf and the secret_env local
# in secrets.tf are your models.

locals {
  # your turn: rollout_secret_env maps DATABASE_URL, ANTHROPIC_API_KEY and VOYAGE_API_KEY to the same
  # secret ids that secret_env gives the service.
}

resource "google_cloud_run_v2_job" "rollout" {
  project  = var.project_id
  name     = "askpep-rollout"
  location = var.region

  template {
    template {
      # your turn:
      # service_account: the email of askpep-canary, from google_service_account.askpep.
      # max_retries: 0.
      # timeout: the longest rollout in seconds. Three steps, six waits, 300 seconds each. Show the sum in a comment.
      # A dynamic "vpc_access" over local.vpc, with egress "PRIVATE_RANGES_ONLY", the network and the subnetwork.

      containers {
        # your turn:
        # image: var.image. command: ["python", "-m", "askpep.rollout"].
        # env blocks: GOOGLE_CLOUD_PROJECT, GCP_REGION and STORE, which is "pg".
        # A dynamic "env" over local.rollout_secret_env that reads each secret by reference, at version "latest".
      }
    }
  }

  # your turn: a lifecycle block that ignores client, client_version and the container image,
  # and a depends_on for the APIs.
}

# your turn: google_secret_manager_secret_iam_member "canary". One grant for each secret, with for_each,
# role roles/secretmanager.secretAccessor, secret from google_secret_manager_secret.askpep[each.value].

# your turn: google_cloud_run_v2_service_iam_member "canary_moves_traffic". roles/run.developer on the
# service askpep, for askpep-canary. Never grant this role on the project.`,
        test: "uv run pytest tests/cloud -k cloud07_s5",
      },
      {
        title: "Write the rollout workflow",
        text: "Write `rollout.yml`. A person starts it with a tag. It checks the tag, signs in, runs the job with `--wait` and fails when the job rolls back. After a promotion, a last step points the job at the promoted image. The stub is one job that exits 1.",
        code: `# .github/workflows/rollout.yml
# Your stub is one job that exits 1. Replace it. deploy.yml is your model for the header and the sign-in.

name: rollout

# your turn:
# on: workflow_dispatch with one required string input, tag.
# permissions at the top: contents read.
# concurrency: group rollout, cancel-in-progress false.
# env: REGION is europe-west3 and SERVICE is askpep.
#
# One job, rollout, on ubuntu-latest. environment production. permissions contents read and id-token write.
# env TAG from the tag input. Steps, in order:
#   1. Check the tag. A bash case on $TAG that accepts sha- and seven lower-case hex digits and exits 1
#      on anything else. No expression is pasted into any script.
#   2. google-github-actions/auth@v2 with the secrets GCP_WORKLOAD_IDENTITY_PROVIDER and GCP_DEPLOY_SERVICE_ACCOUNT.
#   3. google-github-actions/setup-gcloud@v2.
#   4. gcloud run jobs execute askpep-rollout, with the region, --args="--tag,$TAG" and --wait. Hide nothing.
#   5. Read the revision behind $TAG from the service, read its image with gcloud run revisions describe,
#      then gcloud run jobs update askpep-rollout --image ... --region ... No if: condition on this step.`,
        test: "uv run pytest tests/cloud -k cloud07_s6",
      },
    ],
    verify: "uv run pytest tests/cloud -k cloud07",
  },
  recap: [
    "A tag gives a revision its own URL, and the URL works at 0 per cent.",
    "A traffic patch replaces the whole list, so every tagged revision must stay in it.",
    "`judge_canary` waits for 20 finished requests, then checks the SLOs and the pass rate of the judges.",
    "A quiet project times out, so send answerable questions to the tagged URL after the job starts.",
    "The judge is a job with one grant on one service, no retries and a timeout of 90 minutes.",
    "The job runs the production image, so a candidate never judges itself.",
    "AskPEP's first canary timed out for lack of traffic and passed on traffic it was sent, and the record says whose it was.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. I can roll a release out in steps, tell a quiet project from a bad release, and say exactly whose traffic judged it.",
  interviewIds: ["cloud-q16", "cloud-q23", "cloud-q24"],
};

export default chapter;
