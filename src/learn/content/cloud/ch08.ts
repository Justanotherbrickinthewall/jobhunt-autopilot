import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "cloud-08-operate",
  course: "cloud",
  number: 8,
  title: "A service isn't ready until you can switch it off safely",
  tagline: "Four days of drills prove the spend alert, the kill switch, the sign-in and the restore, and one drill changes the plan.",
  minutes: 60,
  objectives: [
    "Say what a billing budget does and doesn't do.",
    "Patch `KILL_SWITCH` on the live service and undo it.",
    "Put IAP in front of the UI and name what it locks out.",
    "Prove a backup with a restore.",
    "Price a month of traces against a budget.",
    "Write a readiness record with a Not proved line for each drill.",
  ],
  sections: [
    {
      id: "s1-a-budget-alerts",
      title: "A budget alert tells you about spend after it has happened, and stops nothing",
      goal: "What can a billing budget do and not do, and how do you write one in Terraform?",
      blocks: [
        {
          kind: "p",
          text: "You only know you can stop, sign in and restore AskPEP after you have done each one. It is Monday 4 January 2027, and four days are set aside for it. This chapter covers what an operator needs once real people use the service. There are five parts, in the order in which trouble arrives.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "A budget tells you that the spend is climbing.",
            "The kill switch stops the service.",
            "IAP limits who can reach it.",
            "A backup gets the data back after a bad write.",
            "A monthly review checks the bill against the traces.",
          ],
        },
        {
          kind: "p",
          text: "Google renames products often. This chapter checked the names Cloud Billing, Identity-Aware Proxy, Cloud Run and Cloud SQL against Google's documentation on 22 October 2026.",
        },
        {
          kind: "p",
          text: "A **billing budget** is an amount you set for a project's monthly spend. It carries rules, and each rule sends an alert when the spend crosses a line. The money belongs to a billing account, and the project is billed to it.",
        },
        {
          kind: "p",
          text: "Chapter 1 gave you `audit_budget`. It checks a budget's amount, its thresholds, its forecast rule and its notification. This chapter writes the budget that the audit is happy with.",
        },
        {
          kind: "callout",
          tone: "analogy",
          title: "A budget is a smoke alarm",
          text: "It tells you about the fire and doesn't put it out. Google's budget page says an alerts-only budget does not cap usage or spend. The sprinkler is the kill switch in section 2.",
        },
        // CHECK: the notification delay and the cost delay come from Google's budgets page, read on 22 October 2026. Confirm the wording on the current page before you quote the hours.
        {
          kind: "p",
          text: "The alert is also late. Google's page says the first notification can take several hours to arrive after you create a budget. It also says costs reach billing with a delay. So a budget is a slow safety net.",
        },
        {
          kind: "p",
          text: "The budget in `budget.tf` has four threshold rules. Three fire at 50, 90 and 100 percent of the **actual spend**, the cost accrued so far this month. The fourth fires when the **forecast** reaches 100 percent. The forecast is Google's estimate of where the month will end at the current rate.",
        },
        {
          kind: "compare",
          caption: "The four rules in `budget.tf`. In Terraform the threshold is a fraction, so 0.5 means 50 percent.",
          columns: ["Rule", "Spend basis", "Threshold", "What it tells you"],
          rows: [
            ["Halfway", "Actual spend", "0.5", "Half the budget is gone. Look at the traces."],
            ["Close", "Actual spend", "0.9", "Little is left. Decide whether to stop."],
            ["Gone", "Actual spend", "1.0", "The budget is spent."],
            ["Early warning", "Forecast spend", "1.0", "The month will end over at this rate."],
          ],
        },
        {
          kind: "p",
          text: "The forecast rule can fire first. Say the traffic triples on day 8. Actual spend is still low, but the forecast has already risen. That is why `audit_budget` reports a missing forecast rule as the finding `forecast`.",
        },
        {
          kind: "quiz",
          id: "cloud08-q1",
          question: "Spend on day 10 is 18 dollars against a 50 dollar budget. Traffic has tripled since day 8. Which rule can fire first?",
          options: [
            "The rule at 0.5 of actual spend, because it has the lowest threshold.",
            "The rule at 1.0 of actual spend, because it is the last line.",
            "The rule at 1.0 of forecast spend, because it looks at where the month will end.",
            "None of them, because a budget only reads the bill after the month closes.",
          ],
          answer: 2,
          explain: "Actual spend is 18 dollars, which is 36 percent of the budget, so no actual rule has fired. The forecast projects the new traffic to the end of the month. It can pass 1.0 while the money spent so far is still low.",
        },
        // CHECK: where the alert goes when a budget has no notification channel. The audit code says only billing admins are emailed. Confirm on Google's budgets page.
        {
          kind: "p",
          text: "Each rule sends its alert through the budget's `all_updates_rule`. That names a notification channel, a Cloud Monitoring object that holds an address. Here it is an email channel that sends to `alert_email`, the variable from chapter 2.",
        },
        {
          kind: "p",
          text: "Without a channel, only the billing account's admins are emailed. `audit_budget` reports that as the finding `no_notification`, because the person who runs the service is rarely a billing admin.",
        },
        {
          kind: "code",
          lang: "hcl",
          code: `threshold_rules {
  threshold_percent = 1.0
  spend_basis       = "FORECASTED_SPEND"
}

all_updates_rule {
  monitoring_notification_channels = [google_monitoring_notification_channel.email.id]
}`,
          caption: "The forecast rule and the notification rule from the capstone's `budget.tf`. Lab step 1 writes the whole file.",
        },
        // CHECK: the billing roles. The plan account's missing role is `roles/billing.viewer` on the billing account, which is the likely fix and is not confirmed. Google's budgets page names Billing Account Costs Manager and Billing Account Administrator for creating a budget, and Billing Account Viewer for viewing one. Read the 403 for the exact permission.
        {
          kind: "callout",
          tone: "warn",
          title: "The plan can't read the budget until someone grants a billing role",
          text: "`terraform plan` runs as `askpep-plan`, which holds no role on the billing account. That role is not a project role, so no Terraform here grants it. The plan fails with a 403 that names the permission. The likely fix is `roles/billing.viewer` on the billing account, granted once with `gcloud billing accounts add-iam-policy-binding`.",
        },
        {
          kind: "p",
          text: "Never grant that role on the project. Also remember that the apply which creates the budget runs as you. Google's page says creating a budget needs Billing Account Costs Manager or Billing Account Administrator on the billing account.",
        },
        // CHECK: the provider block in versions.tf sets billing_project and user_project_override, from the google_billing_budget page in the provider's source docs, read on 22 October 2026. That page says user credentials need both. Nothing here has run against a live project. With the override on, the account that applies needs serviceusage.services.use on the project, and no CI account of this course holds a role that carries it.
        {
          kind: "fold",
          tone: "trouble",
          title: "The apply may fail with a 403 from the Billing Budget API",
          text: "The provider's page for `google_billing_budget` says user credentials need `billing_project` and `user_project_override = true` in the provider block. Chapter 2 had you write both in `versions.tf`. If the apply fails with a 403 that names the Billing Budget API, check both lines first. If the 403 names `serviceusage.services.use`, the account that applies needs `roles/serviceusage.serviceUsageConsumer` on the project.",
        },
        // CHECK: no charge for a billing budget or a notification channel was confirmed. Read the Cloud Billing and Cloud Monitoring pricing pages.
        {
          kind: "step",
          id: "cloud08-s01",
          title: "Plan and apply the budget",
          text: "Do this after lab step 1. Chapter 1 had you make a budget by hand, named `askpep-by-hand`, and a channel for its alerts. Delete both first with the two teardown commands from chapter 1, or you will get two of each. Then put your billing account and budget in `terraform.tfvars`, and plan and apply as chapter 2 taught.",
          lang: "bash",
          code: `terraform -chdir=infra/terraform plan
terraform -chdir=infra/terraform apply
gcloud billing budgets list --billing-account=YOUR_BILLING_ACCOUNT`,
          expect: `Described from the code, not recorded.
plan: adds the channel AskPEP budget alerts
plan: adds the budget askpep
list: one budget named askpep`,
        },
        {
          kind: "p",
          text: "This chapter couldn't confirm that a budget or a channel is free. Read the Cloud Billing and Cloud Monitoring pricing pages before you apply. To tear them down, run `terraform destroy` with `-target=google_billing_budget.askpep` and `-target=google_monitoring_notification_channel.email`.",
        },
        {
          kind: "p",
          text: "You can't make an alert fire on demand. The first proof is an email, and it arrives only when the spend crosses a line. A small project may never reach the first one.",
        },
        {
          kind: "p",
          text: "The alert tells you about the spend and stops nothing. What stops it?",
        },
      ],
    },
    {
      id: "s2-kill-switch",
      title: "A kill switch is one variable, so stopping the service should be one patch",
      goal: "How do you change `KILL_SWITCH` on the live service, and what undoes it?",
      blocks: [
        {
          kind: "p",
          text: "The guardrails course built the kill switch in chapter 8 of course 3. It is the variable `KILL_SWITCH`. Its three values do three different things.",
        },
        {
          kind: "compare",
          caption: "The three values of `KILL_SWITCH` and what each does to AskPEP.",
          columns: ["Value", "`/health`", "Every other route", "A call to `open_ticket` inside a run"],
          rows: [
            ["Empty", "Answers", "Answers as usual", "Runs"],
            ["`actions`", "Answers", "Answers as usual", "Is refused, and the run says the tool is switched off"],
            ["`all`", "Answers", "Answers 503 with the text The desk is switched off", "Never starts, because the 503 comes first"],
          ],
        },
        {
          kind: "p",
          text: "The service reads the variable once, when the process starts. So a change means a new revision, the same frozen copy of the service that chapters 3, 6 and 7 deployed. A new revision with one changed variable needs no image build and no pipeline.",
        },
        {
          kind: "p",
          text: "There are two ways to get that revision. The slow way is Terraform. You set the variable `kill_switch`, plan, review and apply. The fast way is `python -m askpep.killswitch`, which patches the live service in one call. In an emergency, use the fast way.",
        },
        {
          kind: "p",
          text: "The patch goes through `CloudRunClient`, which ships complete in `runapi.py`. It has three methods. `get_service` returns the service as JSON. `get_revision` returns one revision by its name. `patch_service` takes part of the service JSON and an update mask, the list of fields the patch may change. The rollout code from chapter 7 uses `get_service` and `patch_service`.",
        },
        {
          kind: "p",
          text: "Step 2 writes `service_with_env`. It returns a copy of the service JSON with one variable set on the first container. An existing entry is replaced where it stands. A missing one is added at the end.",
        },
        {
          kind: "p",
          text: "It never merges with the old entry. An old entry may read a secret through `valueSource`, and an entry can't hold both a value and a source. So the new entry is exactly a name and a value.",
        },
        {
          kind: "p",
          text: "Step 3 writes `set_kill_switch`. It checks the mode and reads the service. If the mode is already set, it returns at once, because every patch makes a new revision. Otherwise it patches the template and the traffic, with the update mask `template,traffic`. It returns the old mode, so the caller can print the change.",
        },
        {
          kind: "p",
          text: "The traffic is part of the patch because of chapter 7. A rollout pins traffic to named revisions, and a pinned service sends a new revision nothing. A patch of the template alone would make a revision that serves nobody, and the desk would stay on.",
        },
        // CHECK: set_kill_switch sends one traffic entry of type TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST at 100 percent, with the mask `template,traffic`, and reads the image from the revision resource. Whether a traffic list with no tags removes the tags is also unchecked. capstone/src/askpep/killswitch.py carries the same CHECK. Google's rollouts page (read on 22 October 2026) says latest-revision routing stops once traffic is assigned to a named revision. Nobody has run the patch against a live project.
        {
          kind: "p",
          text: "So the patch sends one traffic entry of the latest type, which the constant `TRAFFIC_LATEST` names, at 100 percent. That sends all traffic to the new revision. Google's Cloud Run page says latest-revision routing stops once traffic is assigned to a previous revision, and this entry asks for it back.",
        },
        {
          kind: "p",
          text: "The image needs care too. The template holds the newest image, even one that has had no traffic yet. During a canary, that is the candidate's image.",
        },
        {
          kind: "p",
          text: "A patch that reused it would put the candidate live. So `set_kill_switch` finds the **serving revision**, the one with the largest share of traffic, and copies that revision's image into the first container.",
        },
        {
          kind: "p",
          text: "`serving_revision` ships complete and returns a revision's name. `get_revision` reads that revision, and its first container holds the image. A revision with no image raises `ValueError` before anything is patched.",
        },
        {
          kind: "code",
          lang: "python",
          code: `template = {key: value for key, value in changed["template"].items() if key != "revision"}
serving = serving_revision(service)
if serving:
    containers = client.get_revision(serving).get("containers") or []
    if not containers or not containers[0].get("image"):
        raise ValueError(f"the serving revision {serving} reports no image")
    template["containers"][0]["image"] = containers[0]["image"]
client.patch_service(
    {"template": template, "traffic": [{"type": TRAFFIC_LATEST, "percent": 100}]}, "template,traffic"
)`,
          caption: "The end of `set_kill_switch` in the capstone. The first line drops the key `revision`. The next lines set the image, and the last call patches the template and the traffic together.",
        },
        {
          kind: "p",
          text: "That first line needs a reason. The service JSON reports the name of its live revision in `template.revision`. A patch that sends the key asks Cloud Run for a new revision with the old name, and Cloud Run refuses a duplicate name. Leave the key out, and Cloud Run names the new revision itself.",
        },
        // CHECK: the cause of the duplicate-name refusal. capstone/src/askpep/killswitch.py carries the same CHECK. Nobody has run the patch with the key left in, so read the error on a live service.
        {
          kind: "callout",
          tone: "warn",
          title: "That reason is the code's assumption",
          text: "The capstone marks the line with a `CHECK:`. Nobody has run the patch against a live project. If it fails, read the error text before you trust the explanation above.",
        },
        // CHECK: the roles that CloudRunClient needs to patch a template. They come from the docstring in capstone/src/askpep/runapi.py. Confirm them against the Cloud Run IAM page.
        {
          kind: "p",
          text: "The caller needs permission to patch. `CloudRunClient` needs `roles/run.developer` on the service. It also needs `roles/iam.serviceAccountUser` on the service's own account, `askpep-run`, because a template change deploys a revision that runs as that account.",
        },
        {
          kind: "widget",
          id: "cloud08-kill-switch-drill",
          intro: "Four incidents follow. For each, choose the smallest setting that stops the harm. Watch for the incident where `all` is too much, and the one where the right choice is to leave the switch alone.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "The next terraform apply undoes an emergency patch",
          text: "Terraform owns the service's environment. An apply sets `KILL_SWITCH` from the variable `kill_switch`, which is empty by default. After you patch the live service, set the variable to the same value in `terraform.tfvars`. Otherwise the next apply, for any reason, switches the desk back on.",
        },
        {
          kind: "quiz",
          id: "cloud08-q2",
          question: "During an incident you run `python -m askpep.killswitch all`. Two days later a colleague applies an unrelated Terraform change. What happens to the switch?",
          options: [
            "It stays on, because Terraform never reads environment variables.",
            "The apply sets it back to the empty value of `kill_switch`, and the desk runs again.",
            "The apply fails, because the live service differs from the state.",
            "The apply keeps `all`, because the live value is newer than the code.",
          ],
          answer: 1,
          explain: "Terraform owns the environment and writes the value of its variable on the next apply. Nothing compares ages. The fix is to set `kill_switch` to `all` in your tfvars when you patch, and to set it back when the incident ends.",
        },
        {
          kind: "quiz",
          id: "cloud08-q3",
          question: "Why does `set_kill_switch` drop the key `revision` from the template before it patches?",
          options: [
            "A patch that carries the live revision's name asks for a second revision with the same name, and Cloud Run refuses it.",
            "The key holds a secret that must never leave the service.",
            "Cloud Run ignores every key the caller sends, so dropping it saves bytes.",
            "The key would reset the traffic split to zero.",
          ],
          answer: 0,
          explain: "The service JSON reports its live revision's name in the template. Sending it back asks for a duplicate name, and Cloud Run names the new revision itself when the key is missing. The capstone marks this reason with a CHECK, because nobody has confirmed it on a live service.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "The patch ends a canary, because all traffic goes to one new revision",
          text: "During a canary, the stable revision holds most of the traffic. The patch runs its image and sends it 100 percent, so the candidate gets none. That is right in an incident. Start the next rollout from chapter 7 afterwards, and read the split before you trust the switch.",
        },
        // CHECK: patching the live service makes a revision, and the Cloud Run price for a short drill was not checked. Read the Cloud Run pricing page.
        {
          kind: "step",
          id: "cloud08-s02",
          title: "Switch the live desk off and on",
          text: "Do this after lab step 3, and before you turn IAP on in section 3. The kill switch command uses your application default credentials, the ones `gcloud auth application-default login` sets. Each patch makes one new revision. The last command undoes the drill. If a command fails halfway, run it with `off` yourself.",
          lang: "bash",
          code: `export BASE=$(gcloud run services describe askpep --region europe-west3 --format='value(status.url)')
uv run python -m askpep.killswitch all --project YOUR_PROJECT
curl -s -o /dev/null -w "%{http_code}\\n" -X POST "$BASE/ask" -H "X-API-Key: YOUR_API_KEY" -H "Content-Type: application/json" -d '{"question": "What does PEP 8 say about line length?"}'
uv run python -m askpep.killswitch off --project YOUR_PROJECT`,
          expect: `KILL_SWITCH off -> all
503
KILL_SWITCH all -> off`,
        },
        {
          kind: "p",
          text: "The expected lines come from the code, and nobody recorded them. A 200 where the second line says 503 can mean the new revision isn't ready yet, so wait and run the `curl` again. If it stays 200, read the split under `status.traffic` in the output of `gcloud run services describe askpep --region europe-west3 --format=json`.",
        },
        {
          kind: "p",
          text: "The drill leaves all traffic on the latest revision with no tags, and the next rollout from chapter 7 sets the split again. A short drill should cost little, because Cloud Run bills by use, but this chapter didn't check the price.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Stopping a climbing bill comes up in interviews",
          text: "Stopping a runaway bill comes up in interviews. Answer first: flip the kill switch, which needs no build and no deploy. Say which scope you pick, because `actions` leaves answers running and `all` does not. Name the trap: Terraform puts the old value back on the next apply. Then say what follows: find the cause, and roll back.",
        },
        {
          kind: "p",
          text: "You can stop the service. Who should be able to reach it while it runs?",
        },
      ],
    },
    {
      id: "s3-iap",
      title: "IAP keeps the public out of the UI, and the service still checks its token",
      goal: "How do you put a Google sign-in in front of AskPEP, and what does it lock out?",
      blocks: [
        {
          kind: "p",
          text: "Today AskPEP is public. The grant of `roles/run.invoker` to `allUsers` in `run.tf` lets anyone reach the URL. The service serves the UI at `/`, so anyone can load the page. The API routes refuse a request with no valid `X-API-Key`, but the page itself is open.",
        },
        {
          kind: "p",
          text: "Identity-Aware Proxy, or IAP, puts a Google sign-in in front of the service. A person who is not on your list never reaches the container. When IAP lets a request in, it adds the header `X-Goog-IAP-JWT-Assertion`. The header holds a **JWT**, a signed token with claims about the person, such as their email.",
        },
        {
          kind: "p",
          text: "The service must not trust that header on its own. A caller who reaches the container another way could send any header. So the service checks the token's signature and expiry. It also checks the **audience**, which names the one service the token was made for.",
        },
        {
          kind: "p",
          text: "Then it checks the **issuer**, which must be `https://cloud.google.com/iap`. Only then does it read the `email` claim. Google's page on signed headers lists the header name, the issuer, the key address and the audience form. All four were checked on 22 October 2026.",
        },
        // CHECK: the IAP audience for Cloud Run. The form below was checked on Google's signed headers page on 22 October 2026. The capstone's CHECK still says to read the value from the Cloud Run IAP settings in the console before you rely on it.
        {
          kind: "p",
          text: "For a Cloud Run service the audience is `/projects/PROJECT_NUMBER/locations/REGION/services/SERVICE_NAME`. The Terraform builds it as `local.iap_audience` and passes it to the service as `IAP_AUDIENCE`.",
        },
        {
          kind: "p",
          text: "Step 4 writes `verify_iap_jwt` as five checks, in this order.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "An empty audience raises `ValueError`, because a service with no audience can't check anything and must not pass a token for that reason.",
            "An empty token raises `ValueError`.",
            "`decode(token, audience)` checks the signature, the expiry and the audience, and its errors pass through.",
            "The claim `iss` must equal `IAP_ISSUER`.",
            "The claim `email` must be a non-empty string, and the function returns the claims as a dict.",
          ],
        },
        {
          kind: "p",
          text: "`decode` is a parameter, and `default_decode` is its default. The default fetches Google's public keys. A test passes its own function, so no test needs the network. `create_app` takes `iap_verifier` for the same reason.",
        },
        {
          kind: "p",
          text: "The other half of step 4 is in your own files. `config.py` gets the setting `iap_audience`, read from `IAP_AUDIENCE`. `create_app` gets the keyword `iap_verifier`. An HTTP **middleware** named `iap` goes in after the kill switch one. A middleware is a function that sees every request before the route does.",
        },
        {
          kind: "p",
          text: "With `IAP_AUDIENCE` empty, the middleware does nothing, so courses 1 to 6 behave as before. With it set, every route except `/health` and `/internal/tasks/agent` needs the header. No header gives a 401. A token the verifier rejects gives a 403.",
        },
        {
          kind: "p",
          text: "`/health` stays open because the startup probe in `run.tf` calls it. The task route stays open because it has its own check, which verifies the token that Cloud Tasks sends.",
        },
        {
          kind: "p",
          text: "Registration order matters. A middleware added later wraps the ones before it, so IAP runs before the kill switch. A caller that IAP hasn't let in can't learn whether the desk is switched off.",
        },
        {
          kind: "widget",
          id: "cloud08-iap-request",
          intro: "Seven requests follow. Each one has reached the container, and you predict what the service's own check does with it. Watch the kill switch case, where the IAP check answers before the switch does. The Cloud Tasks card adds one warning.",
        },
        {
          kind: "step",
          id: "cloud08-s03",
          title: "Put the check in front of the routes",
          text: "This is the second half of lab step 4. Do it after `verify_iap_jwt` passes. Make the edits in this order, and run the step 4 tests after each one. The tests pass their own verifier, so no Google key is fetched.",
          lang: "python",
          file: "src/askpep/config.py and src/askpep/api.py",
          code: `# src/askpep/config.py: in Settings, next to kill_switch
iap_audience: str = ""  # read from IAP_AUDIENCE

# src/askpep/api.py: at the top of the file
from askpep.iap import IAP_HEADER, verify_iap_jwt

# src/askpep/api.py: in create_app
# 1. Add the keyword iap_verifier to the arguments, with the default None.
# 2. Add an inner verify_iap(token). It calls iap_verifier when one was given,
#    and verify_iap_jwt with settings.iap_audience otherwise.
# 3. After the kill_switch middleware, add @app.middleware("http") async def iap(request, call_next).
#    Pass the request on when iap_audience is empty, or the path is /health or /internal/tasks/agent.
#    No IAP_HEADER gives JSONResponse with status_code=401.
#    Run verify_iap with run_in_threadpool. A ValueError gives status_code=403.`,
          expect: `Each edit turns more of the
step 4 tests green.`,
        },
        {
          kind: "callout",
          tone: "warn",
          title: "IAP covers the whole URL, so it also locks out /mcp and every API key client",
          text: "IAP guards the service URL and not single routes. The MCP endpoint at `/mcp`, which lets other tools call AskPEP, sits behind it. So does every script that sends an `X-API-Key`. Neither can sign in through a browser, so both stop working when IAP goes on. This chapter doesn't build a path for them.",
        },
        // CHECK: whether IAP accepts the OIDC token that Cloud Tasks sends. ops.tf carries the same CHECK. Google's Cloud Run IAP page warns that services which use their own authentication, such as Pub/Sub, might fail. Send one async job after IAP is on.
        {
          kind: "callout",
          tone: "warn",
          title: "Cloud Tasks may be refused before the service sees its token",
          text: "The middleware lets `/internal/tasks/agent` through, and the route verifies the Cloud Tasks token itself. But IAP sits in front of the container and may refuse that token first. Google's Cloud Run page warns that services with their own authentication, such as Pub/Sub, might fail. After IAP is on, send one async job and read the queue.",
        },
        {
          kind: "p",
          text: "`ops.tf` gives `askpep-tasks` the same IAP role that people get, and marks the grant with a `CHECK:`. IAP may want an audience that is its own OAuth client, and a task carries the service URL. If IAP refuses the task, the queue's calls fail with 401. The fix is a separate internal path, which this chapter doesn't build.",
        },
        {
          kind: "p",
          text: "In Terraform, the variable `iap_members` lists who may open the UI, such as `user:you@example.com`. An empty list leaves IAP off. A validation rejects `allUsers` and `allAuthenticatedUsers`, because IAP exists to keep the public out. The local `iap_enabled` is true when the list has a member, and it changes five things.",
        },
        // CHECK: the IAP resource names. ops.tf says the provider's page for IAP and Cloud Run is the source, and that the resources sat in the beta provider when the file was written.
        {
          kind: "list",
          items: [
            "`run.tf` sets `iap_enabled` on the service, and the grant to `allUsers` disappears.",
            "`iap_invoker` gives `roles/run.invoker` to the IAP service agent, `service-PROJECT_NUMBER@gcp-sa-iap.iam.gserviceaccount.com`. Google's page says IAP needs it to call the service.",
            "`people` gives each member `roles/iap.httpsResourceAccessor`, the role that lets a person through IAP.",
            "`tasks` gives the same role to `askpep-tasks`, with the CHECK above.",
            "`ops_env` gains `IAP_AUDIENCE`, so the service starts checking tokens.",
          ],
        },
        // CHECK: the launch stage of direct IAP on Cloud Run. run.tf sets launch_stage to BETA. A Google blog post dated 13 March 2026 describes direct IAP integration as generally available, and the Cloud Run IAP page gives no stage. Read the release notes.
        {
          kind: "fold",
          tone: "industry",
          title: "The launch stage of direct IAP on Cloud Run is unconfirmed",
          text: "`run.tf` sets `launch_stage` to `BETA`, and the IAP resources sat in the beta provider when the file was written. Google's Cloud Run release notes record direct IAP on Cloud Run as generally available on 13 March 2026. Whether the Terraform field still needs `BETA` wasn't confirmed on 9 November 2026. The capstone keeps `BETA` and marks it with a `CHECK:`.",
        },
        // CHECK: whether direct IAP on Cloud Run needs an OAuth consent screen first. Google's Cloud Run IAP page, read on 22 October 2026, did not say.
        {
          kind: "fold",
          tone: "trouble",
          title: "The first apply fails on the IAP service agent",
          text: "`ops.tf` carries a `CHECK:` that the agent may not exist before IAP has been on once. If the apply fails on `iap_invoker`, apply again. If it fails on something else, such as an OAuth consent screen, read the error. This chapter didn't confirm whether direct IAP needs one.",
        },
        // CHECK: the annotation name run.googleapis.com/iap-enabled. capstone/.github/workflows/deploy.yml carries the same CHECK. Read it in `gcloud run services describe askpep --format=json` once IAP is on.
        {
          kind: "p",
          text: "The deploy workflow from chapter 6 has a smoke test. It reads the service annotation `run.googleapis.com/iap-enabled`. When it is `true`, the step prints that the test is skipped and exits 0, because curl can't sign in. So a green deploy job no longer proves that the revision answers.",
        },
        {
          kind: "p",
          text: "Your own smoke check becomes a person. Open the tagged revision's URL in a browser, and sign in as one of the `iap_members`. Then load `/health`. A healthy revision answers with the status ok.",
        },
        {
          kind: "p",
          text: "The tagged URL is under `status.traffic` in the output of `gcloud run services describe askpep --region europe-west3 --format=json`. It sits next to the tag, as the deploy workflow reads it.",
        },
        {
          kind: "quiz",
          id: "cloud08-q4",
          question: "IAP is on. A script sends a valid `X-API-Key` and no IAP header to `POST /ask`. What does the service's middleware answer?",
          options: [
            "200, because the key is valid.",
            "401, because the middleware looks for the IAP header first and finds none.",
            "403, because the key is not an IAP token.",
            "503, because the kill switch runs first.",
          ],
          answer: 1,
          explain: "With `IAP_AUDIENCE` set, every route except two needs the header, and the key is never read. No header is a 401. A 403 means a header arrived and the verifier rejected the token. The kill switch runs after IAP, not before it.",
        },
        {
          kind: "quiz",
          id: "cloud08-q5",
          question: "IAP already signed the token. Why does `verify_iap_jwt` also check the audience?",
          options: [
            "To count how many people use the service.",
            "To confirm the email belongs to your company.",
            "Because IAP signs tokens for every service behind it, and the audience says which one this token was made for.",
            "Because the signature check can't run without it.",
          ],
          answer: 2,
          explain: "A token that IAP made for another service carries a good signature. Without the audience check, this service would accept it. The audience ties the token to one service.",
        },
        {
          kind: "p",
          text: "Put your own address in the variable file before the next step. The line below turns IAP on for you and for nobody else.",
        },
        {
          kind: "code",
          lang: "hcl",
          code: `iap_members = ["user:you@example.com"]`,
          caption: "One line in `terraform.tfvars`. An empty list turns IAP off again.",
        },
        // CHECK: no IAP charge for a Cloud Run service was confirmed. Read the IAP pricing page.
        {
          kind: "step",
          id: "cloud08-s04",
          title: "Turn IAP on, and check it in a browser",
          text: "Do this after lab step 5. Add the line above to `terraform.tfvars`, then plan and apply. After the apply, open the tagged revision's URL in a browser, sign in, and load `/health`. To tear it down, set `iap_members` back to an empty list and apply.",
          lang: "bash",
          code: `terraform -chdir=infra/terraform plan
terraform -chdir=infra/terraform apply`,
          expect: `Described from the code, not recorded.
plan: removes the allUsers invoker grant
plan: adds the IAP grants and IAP_AUDIENCE
browser: a Google sign-in, then {"status":"ok"}
curl with no sign-in: turned away`,
        },
        {
          kind: "p",
          text: "No IAP charge was confirmed for this chapter, so read the IAP pricing page before you apply. If the first apply fails on the IAP service agent, apply again. The agent may only exist once IAP has been on.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Internal sign-in comes up in interviews",
          text: "Putting an internal UI behind a sign-in comes up in interviews. Answer first: use IAP on the service, with a list of people and groups, and no public invoker. Then name the cost. Scripts and API key clients can't sign in, so they need another path. Say that the service still verifies the token and its audience, because a request that reaches the container another way carries no proof.",
        },
        {
          kind: "p",
          text: "Sign-in keeps the wrong people out. What gets the data back after the right people break it?",
        },
      ],
    },
    {
      id: "s4-backups",
      title: "A backup is a promise until you have restored one",
      goal: "What does the Cloud SQL backup cover, and how do you prove it with a restore?",
      blocks: [
        {
          kind: "p",
          text: "The database is the one part of AskPEP that Terraform can't rebuild. Terraform recreates the instance and its settings, but not the rows.",
        },
        {
          kind: "p",
          text: "The `tickets`, `audit` and `feedback` tables and the saved checkpoints exist only in Postgres. The PEP chunks can be rebuilt by running the ingest job again, at the cost of the embeddings.",
        },
        {
          kind: "p",
          text: "Chapter 4 turned on a daily backup and point-in-time recovery, or PITR, in `backup_configuration`. PITR keeps the **write-ahead log**, the record Postgres writes before it changes a page. With it you can restore to a chosen moment between snapshots.",
        },
        // CHECK: point-in-time recovery on a shared-core tier. sql.tf carries the same CHECK, and Google's PITR page, read on 22 October 2026, did not say.
        {
          kind: "p",
          text: "`db-f1-micro`, the default tier, is a shared-core machine. Whether PITR is allowed on a shared-core tier wasn't confirmed, and `sql.tf` carries a `CHECK:` on it. If the API refuses, turn PITR off in `sql.tf` and write that in your runbook, the short page of incident steps.",
        },
        {
          kind: "p",
          text: "A restore never happens in place. Google's page says a point-in-time recovery always creates a new instance, and that you can't restore into an existing one. You pick a timestamp inside the recovery window. The command `gcloud sql instances get-latest-recovery-time` shows the latest moment you can pick.",
        },
        {
          kind: "p",
          text: "The new instance has a new address. The service reads the address from the secret `askpep-database-url`. So a real restore ends with a change to that secret and a new revision. Google's clone page says a clone doesn't copy backups, so the new instance also needs its own backup settings.",
        },
        {
          kind: "p",
          text: "The two deletion locks from chapter 4 already guard the instance. They help with accidents. A bad write, such as a migration that deletes rows, needs a backup.",
        },
        {
          kind: "compare",
          caption: "Three ways the data goes wrong, and what helps with each.",
          columns: ["What goes wrong", "What helps"],
          rows: [
            ["Someone runs `terraform destroy` or deletes the instance.", "Deletion protection stops it."],
            ["A migration deletes rows, and you notice half an hour later.", "PITR restores to the minute before. A daily snapshot alone loses everything written since it was taken."],
            ["Nobody has ever tried the restore.", "Nothing helps. The restore drill is how you find out."],
          ],
        },
        {
          kind: "quiz",
          id: "cloud08-q6",
          question: "A bad migration deletes rows from `tickets` at 14:10, and you find out at 14:40. What does a point-in-time recovery to 14:09 do?",
          options: [
            "It rewinds `askpep-pg` in place to 14:09.",
            "It creates a new instance as it was at 14:09, and you point the service at it.",
            "It restores the last nightly snapshot over the live instance.",
            "It does nothing, because deletion protection is on.",
          ],
          answer: 1,
          explain: "A point-in-time recovery always creates a new instance. The live one is left as it is. Deletion protection stops the instance from being deleted and has no say over rows.",
        },
        // CHECK: the clone's price, whether it inherits deletion protection, and the flag --no-deletion-protection on `gcloud sql instances patch`. The clone and get-latest-recovery-time flags were read on Google's gcloud reference on 22 October 2026. Nothing here was run against a live project.
        {
          kind: "step",
          id: "cloud08-s05",
          title: "Restore a clone of the database",
          text: "This step is optional, and it makes a second Cloud SQL instance. Replace TIMESTAMP with a moment inside the recovery window, in RFC 3339 and UTC, in the form 2026-10-21T09:30:00Z. The last command deletes the clone, so run it when you finish.",
          lang: "bash",
          code: `gcloud sql instances get-latest-recovery-time askpep-pg
gcloud sql instances clone askpep-pg askpep-pg-drill --point-in-time 'TIMESTAMP'
gcloud sql instances describe askpep-pg-drill --format='value(state)'
gcloud sql instances delete askpep-pg-drill`,
          expect: `Described from the docs, not recorded.
1: the latest recovery time
2: the clone is created
3: RUNNABLE once the clone is ready
4: the clone is deleted`,
        },
        {
          kind: "p",
          text: "Cloud SQL bills an instance while it exists, and this chapter didn't check the price. The clone takes several minutes. The drill proves that a restore completes. Reading rows needs a path into your private network, which this chapter doesn't build.",
        },
        {
          kind: "p",
          text: "If the delete is refused because of deletion protection, run `gcloud sql instances patch askpep-pg-drill --no-deletion-protection`, then delete again. Nothing in this step has run against a live project.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Backups come up in interviews",
          text: "Backup and restore comes up in interviews. Answer first: you restore one and read rows from it. A backup that has never been restored is a hope. Say what the drill proves, which is that the restore completes, the data is there and you know how long it took. Then say what it can't prove, such as whether the application works against the new instance.",
        },
        {
          kind: "p",
          text: "The data can come back. What did the month cost, and who caused the spend?",
        },
      ],
    },
    {
      id: "s5-review",
      title: "A monthly review ties the bill to the requests that caused it",
      goal: "How do you price a month of traces against a budget and read the verdict?",
      blocks: [
        {
          kind: "p",
          text: "A billing budget sees the bill. It can't see which question, agent or model made the spend. The trace rows can, because each one carries the tokens and the cost of its stages. A **monthly review** reads a month of rows, prices them with `pricing.json`, and sets the total beside a budget.",
        },
        {
          kind: "p",
          text: "You have met every part of it. `request_rows`, `stage_costs` and `cost_per_successful_task` come from chapter 4 of course 5. `Scenario` and `project` come from the cost model in chapter 2 of course 6. Step 6 writes `monthly_review`, which calls all five and returns a frozen `MonthlyReview`.",
        },
        {
          kind: "compare",
          caption: "The fields of `MonthlyReview`, in order.",
          columns: ["Field", "What it holds"],
          rows: [
            ["`requests`", "The request rows reviewed."],
            ["`spend_usd`", "What those requests cost, in dollars."],
            ["`per_task_usd`", "The spend divided by the requests that succeeded, or None when none did."],
            ["`budget_usd` and `budget_used`", "The budget, and the spend as a share of it, so 0.5 is half."],
            ["`top_stage` and `top_share`", "The dearest stage and its share of the spend."],
            ["`projected_usd`", "The next 30 days at the same daily rate."],
            ["`verdict`", "`ok`, `watch` or `over`."],
          ],
        },
        {
          kind: "p",
          text: "The verdict has three values. It is `over` when the spend is above the budget. It is `watch` when the spend has reached 80 percent of the budget. Otherwise it is `ok`. The 80 percent is the constant `WATCH_AT`.",
        },
        {
          kind: "p",
          text: "The verdict reads the spend so far and ignores the projection. That is a choice. A projection is a guess from one month's daily rate, and one busy week can swing it. The review prints it on its own line, so a person reads both.",
        },
        {
          kind: "widget",
          id: "cloud08-review-verdict",
          intro: "Seven months follow, each with a budget in dollars. Predict the verdict for each. Watch the month with a high projection and the month that sits exactly on a line.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "The review prices model tokens only, so its spend is part of the bill",
          text: "Trace rows hold model tokens. They hold no Cloud Run or Cloud SQL cost, and the `embed` and `rerank` calls show as zero, as in `askpep cost`. So the review's spend is part of the bill. Pass `--budget` the share of your budget that you set aside for model calls.",
        },
        // CHECK: the placeholder prices in capstone/pricing.json, which chapter 4 of course 5 told you to replace with the price on the provider's page. The budget currency check is in capstone/src/askpep/review.py.
        {
          kind: "callout",
          tone: "warn",
          title: "Two inputs decide whether the dollars mean anything",
          text: "The prices in `pricing.json` are placeholders until you replace them with the price on the provider's page, as chapter 4 of course 5 said. The budget is in US dollars, because the prices are. The `budget_amount` from chapter 2 is in the billing account's currency, so convert it first if the two differ.",
        },
        {
          kind: "p",
          text: "The command `python -m askpep.review --budget 50` prints the review for the last 30 days. It exits 1 when the verdict is `over`, so a script can act on it. It exits 2 when it can't read the traces. It needs `STORE=pg`, because the traces live in Postgres.",
        },
        {
          kind: "quiz",
          id: "cloud08-q7",
          question: "The monthly review exists. Why keep the billing budget?",
          options: [
            "The budget stops spend and the review doesn't.",
            "The review prices only the model tokens in your traces, and the budget sees the whole bill, Cloud Run and Cloud SQL included.",
            "The budget is cheaper to run than the review.",
            "The review can't read a month of rows.",
          ],
          answer: 1,
          explain: "A budget alerts and never stops anything, so the first option is wrong. The review sees only what a trace row prices, which is model tokens. The bill has more in it, and only the budget watches all of it.",
        },
        {
          kind: "step",
          id: "cloud08-s06",
          title: "Run the review on your traces",
          text: "Do this after lab step 6. Point `DATABASE_URL` at the Postgres that holds your traces. The one from the capstone's `docker-compose.yml` is the easy choice. Cloud SQL works only from a machine inside your private network, because its address is private. The review reads rows and writes none.",
          lang: "bash",
          code: `export STORE=pg
export DATABASE_URL=postgresql://askpep@localhost:5432/askpep
uv run python -m askpep.review --budget 50`,
          expect: `requests            COUNT
spend               $SPEND of $BUDGET (PERCENT)
per successful task $COST
dearest stage       STAGE (SHARE)
next 30 days        $COST
verdict             ok, watch or over`,
        },
        {
          kind: "p",
          text: "That is the shape of the six lines, with the values left out. The exit status is 1 only when the verdict is `over`. With no request rows, the review shows 0 requests and the verdict `ok`. The block below is sample output from invented rows, not a run on your traces.",
        },
        {
          kind: "code",
          lang: "text",
          code: `requests            1100
spend               $40.46 of $50.00 (81%)
per successful task $0.0382
dearest stage       generate (98%)
next 30 days        $40.83
verdict             watch`,
          caption: "Sample output. The rows are 1,100 invented requests, priced with the placeholder prices in `pricing.json`. Yours will differ.",
        },
        {
          kind: "p",
          text: "Here the spend is 81 percent of the budget, so the verdict is `watch` and the command exits 0. The `generate` stage takes 98 percent of the spend, so that is where to look first. A cheaper model or a shorter prompt there changes the total far more than any change to the other stages.",
        },
        {
          kind: "p",
          text: "You have the five tools. What happened when AskPEP's team drilled each one?",
        },
      ],
    },
    {
      id: "s6-readiness",
      title: "AskPEP's drills passed, except that sign-in would have stopped the build tool",
      goal: "What goes in a readiness record, and what do you do when a drill finds a real conflict?",
      blocks: [
        {
          kind: "p",
          text: "A readiness record lists each drill, what it proved and what it did not prove. A drill that finds a conflict has done its job, so write the conflict down with an owner and a date.",
        },
        {
          kind: "p",
          text: "Here is how AskPEP's four days went. Every date, time and amount below is invented.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "On Monday you set `budget_amount` to 900 dollars. The design allows 600 for the model and the judges, and you allowed 300 for infrastructure. The product owner asked, \"Who gets the email?\" You named the on-call address.",
            "On Tuesday at 07:10 you ran the kill switch on production, before the second team started work. You ran `actions`, then `all`, then `off`. The `503` arrived 38 seconds after the command.",
            "The security reviewer asked, \"Who can run that at three in the morning?\" You limited `roles/run.developer` on the service to the on-call group. The runbook now says a real incident sets the Terraform variable too.",
            "On Wednesday you turned IAP on in staging. Your browser sign-in worked. The build tool's call, with a valid key, was turned away before it reached the service.",
            "The third team's lead said, \"That's 480 runs a day. A build can't open a browser.\" You kept IAP off on production. The API routes still refuse a call with no valid key, and the page shows nothing without one.",
            "The security reviewer said, \"Write the exception, with an owner and a date.\" That became ADR 0009, and it gets reviewed on 1 March 2027.",
            "On Thursday you restored a clone of `askpep-pg` to 06:00. It took 27 minutes. A one-off job inside the VPC counted the rows, the counts matched a count taken at 06:00, and you deleted the clone.",
            "The product owner asked, \"Is the bill the number I approved?\" The first 14 days cost 84 dollars in infrastructure. That is the pilot's traffic only, so the answer waits for the third team.",
          ],
        },
        {
          kind: "code",
          lang: "text",
          code: `# OPS-READINESS-001  Thursday 7 January 2027
Production commit: 5d2e9a1. Traffic: second team only.

Budget        900 usd a month. Alerts at 50, 90 and 100 percent, and on forecast.
              Goes to the on-call address.
              Not proved: no alert has fired yet.

Kill switch   actions, all, off, on production at 07:10 on 5 January.
              503 after 38 seconds. Restored after 41 seconds.
              Runbook: set the Terraform variable in a real incident.

Sign-in       IAP worked on staging for people.
              It turned away the build tool, 480 desk runs a day.
              Decision: IAP off on production. ADR 0009.
              Exception owner: engineering. Review: 1 March 2027.
              Accepted risk: the page is open, and the API routes need a key.

Restore       Clone to 06:00 on 7 January. 27 minutes. Row counts matched.
              Not proved: the service running against the clone.

First bill    18 to 31 December, 14 days.
              Cloud Run 28.00, Cloud SQL 42.00, network 10.50, other 3.50.
              Total 84.00 usd, or 180.00 for 30 days at this rate.
              Model and judges 31.40 usd, 5.2 percent of the 600 ceiling. Verdict ok.
              Not proved: the bill at 1,000 requests a day.

For the launch review: all drills run. One exception, ADR 0009.`,
          caption: "The readiness record. Every value is invented, and no drill was run for this course.",
        },
        {
          kind: "p",
          text: "Read the sign-in entry first. IAP worked as designed, and it would still have stopped the third team on its first day. A drill in staging found that for the cost of an afternoon.",
        },
        {
          kind: "p",
          text: "Then read each `Not proved` line. The bill is the one that matters on Friday, because it comes from a fifth of the design's traffic.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# OPS-READINESS-<number>  <date>
Production commit:
Traffic during the drills:

Budget:
Not proved:

Kill switch, with timings:
Not proved:

Sign-in, and who it would stop:
Decision and owner:

Restore, with timing:
Not proved:

First bill, by service:
Not proved:

For the launch review:`,
          caption: "For your next launch: one entry for each tool, and a Not proved line under each.",
        },
        {
          kind: "p",
          text: "One request arrived during the drills. A group that runs on Azure asked what AskPEP would take there. What would you tell them?",
        },
      ],
    },
  ],
  lab: {
    title: "Write the budget, the kill switch, the IAP check and the review",
    goal: "Write `budget.tf` and `ops.tf`, and fill in the stubs in `killswitch.py`, `iap.py` and `review.py`. Step 4 also edits your own `config.py` and `api.py`. The tests run offline against fakes, and nothing calls Google. One test in step 5 is live, and you run it with `-m live`.",
    minutes: 90,
    files: [
      "infra/terraform/budget.tf",
      "src/askpep/killswitch.py",
      "src/askpep/iap.py",
      "src/askpep/config.py",
      "src/askpep/api.py",
      "infra/terraform/ops.tf",
      "src/askpep/review.py",
      "tests/cloud/test_cloud08_operate.py",
    ],
    steps: [
      {
        title: "Write a budget that alerts",
        text: "Write `budget.tf`. Add the variable `billing_account`, an email channel that sends to `var.alert_email`, and a `google_billing_budget`. The budget has four rules and an `all_updates_rule` that names the channel. The test turns your file into the Billing Budget API's JSON and runs `audit_budget` on it. It also checks that the provider block from chapter 2 sets `billing_project` and `user_project_override`.",
        code: `# infra/terraform/budget.tf
variable "billing_account" {
  # your turn: a string with no default.
}

resource "google_monitoring_notification_channel" "email" {
  # your turn: type "email", the display name "AskPEP budget alerts",
  # and the label email_address set from var.alert_email.
}

# CHECK: terraform plan reads this budget as askpep-plan, which holds no role on the billing account.
# roles/billing.viewer on the billing account is the likely fix. It is not a project role.
resource "google_billing_budget" "askpep" {
  # your turn: the billing account, the display name askpep, a filter on this project's number
  # (data.google_project.this.number), and the amount from var.budget_amount.
  # Rules at 0.5, 0.9 and 1.0 of actual spend, and one at 1.0 of FORECASTED_SPEND.
  # An all_updates_rule that names the email channel.
}`,
        test: "uv run pytest tests/cloud -k cloud08_s1",
      },
      {
        title: "Set one variable on a copy of the service",
        text: "Replace `service_with_env`, which raises `cloud-08 step 2`. Return a deep copy of the service with the variable set on the first container. Replace an existing entry where it stands, or add one at the end. The new entry is exactly a name and a value. A service with no containers raises `ValueError`. Add `import copy` to your imports.",
        code: `# src/askpep/killswitch.py
import copy  # your stub leaves this out, and service_with_env needs it


def service_with_env(service: dict[str, Any], name: str, value: str) -> dict[str, Any]:
    # your turn:
    # 1. Deep-copy the service. Nothing in the argument may change.
    # 2. Take the containers from the template, or raise ValueError when there are none.
    # 3. Replace the entry for name where it stands, or append a new one.
    #    The entry is exactly {"name": name, "value": value}, so an old valueSource is dropped.
    ...`,
        test: "uv run pytest tests/cloud -k cloud08_s2",
      },
      {
        title: "Switch the desk off with one patch",
        text: "Replace `set_kill_switch`, which raises `cloud-08 step 3`. Check the mode, read the service and return the old mode at once when nothing changes. Otherwise patch the template from `service_with_env` and send all traffic to the latest revision, with the update mask `template,traffic`. Drop the key `revision`, and run the serving revision's image. The tests need step 2 first.",
        code: `# src/askpep/killswitch.py
def set_kill_switch(client: RunApi, mode: str) -> str:
    # your turn:
    # 1. Strip and lower-case the mode. Raise ValueError that names KILL_MODES when it isn't one of them.
    # 2. Read the service. The previous mode is mode_of(service).
    # 3. Return the previous mode and patch nothing when the mode is unchanged.
    # 4. Otherwise build the changed service with service_with_env. Take its template without the
    #    key "revision".
    # 5. serving_revision(service) names the revision that serves. When it gives one, read it with
    #    client.get_revision and put the image of its first container into the first container of the
    #    template. A revision with no image raises ValueError before any patch.
    # 6. Patch {"template": template, "traffic": [{"type": TRAFFIC_LATEST, "percent": 100}]}
    #    with the update mask "template,traffic". Your stub already has TRAFFIC_LATEST.
    # 7. Return the previous mode.
    ...`,
        test: "uv run pytest tests/cloud -k cloud08_s3",
      },
      {
        title: "Check the IAP token",
        text: "Replace `verify_iap_jwt`, which raises `cloud-08 step 4`. Run the five checks in order. Do the function first. Then edit your own files, as the body step in section 3 shows. Import `IAP_HEADER` and `verify_iap_jwt` from `askpep.iap` in `api.py`. Add the setting `iap_audience`, the keyword `iap_verifier` and the `iap` middleware.",
        code: `# src/askpep/iap.py
def verify_iap_jwt(
    token: str, audience: str, *, decode: Callable[[str, str], Mapping[str, Any]] = default_decode
) -> dict[str, Any]:
    # your turn, in this order:
    # 1. An empty audience raises ValueError that names IAP_AUDIENCE.
    # 2. An empty token raises ValueError.
    # 3. claims = decode(token, audience). Let its ValueError through.
    # 4. The claim iss must equal IAP_ISSUER, or ValueError.
    # 5. The claim email must be a non-empty string, or ValueError. Return dict(claims).
    ...`,
        test: "uv run pytest tests/cloud -k cloud08_s4",
      },
      {
        title: "Put IAP and the switch into Terraform",
        text: "Write `ops.tf`. Add the variables `kill_switch` and `iap_members` with their validations, and the locals `iap_enabled`, `iap_audience` and `ops_env`. Add the member grants for IAP and the invoker grant for the IAP service agent. `run.tf` already reads `iap_enabled` and `ops_env`, so replace the stub's two placeholders.",
        code: `# infra/terraform/ops.tf
variable "kill_switch" {
  # your turn: a string, default "", validated to "", "actions" or "all".
}

variable "iap_members" {
  # your turn: a list of strings, default [], that never holds allUsers or allAuthenticatedUsers.
}

locals {
  # your turn:
  # iap_enabled: true when iap_members has a member.
  # CHECK: the audience form. Read it from the IAP settings of the service in the console before you rely on it.
  # iap_audience: the form from section 3, built from the project number, var.region and the service name askpep.
  # ops_env: KILL_SWITCH from the variable, and IAP_AUDIENCE as well while iap_enabled is true.
}

# your turn: a google_iap_web_cloud_run_service_iam_member named "people", with for_each over
# toset(var.iap_members), giving each member roles/iap.httpsResourceAccessor on the service.

# your turn: a google_cloud_run_v2_service_iam_member named "iap_invoker", with count 1 while IAP is on
# and 0 otherwise, giving the IAP service agent roles/run.invoker.
# The agent may not exist before IAP has been on once, so a first apply can fail here. Apply again.`,
        test: "uv run pytest tests/cloud -k cloud08_s5",
      },
      {
        title: "Review a month against the budget",
        text: "Replace `monthly_review`, which raises `cloud-08 step 6`. Reject a budget of 0 or less, or `days` below 1. Price the request rows only with `stage_costs`, divide by the budget, and project 30 days. Return a `MonthlyReview` with the verdict `over`, `watch` or `ok`. Add the missing imports by extending your stub's two import lines, so ruff accepts the order.",
        code: `# src/askpep/review.py
# Make the import block read like this. Your stub has the cost and records lines without the extra names.
from askpep.costmodel import Scenario, project
from askpep.telemetry.cost import Price, cost_per_successful_task, stage_costs
from askpep.telemetry.records import Row, request_rows


def monthly_review(
    rows: Sequence[Row], prices: Mapping[str, Price], budget_usd: float, *, days: int = 30
) -> MonthlyReview:
    # your turn:
    # 1. Raise ValueError for a budget of 0 or less, or days below 1.
    # 2. counted = request_rows(rows). With none, return a review with 0 requests, 0.0 spend, no per-task cost,
    #    no top stage, a projection of 0.0 and the verdict "ok".
    # 3. costs = stage_costs(counted, prices). The spend is the sum of their cost_usd. The dearest stage is costs[0].
    # 4. Project the next 30 days: project(counted, prices, Scenario(requests_per_day=round(len(counted) / days), days=30)).
    # 5. The verdict is "over" above the budget, "watch" at WATCH_AT of it or more, and "ok" otherwise.
    ...`,
        test: "uv run pytest tests/cloud -k cloud08_s6",
      },
    ],
    verify: "uv run pytest tests/cloud -k cloud08",
  },
  recap: [
    "A billing budget alerts and never stops spend, so its forecast rule warns early and the kill switch is the brake.",
    "The kill switch is one patch that runs the serving image and sends it all traffic, so it also ends a canary.",
    "The next `terraform apply` restores the variable `kill_switch`, so a real incident sets that variable too.",
    "IAP guards the whole URL, so it also locks out `/mcp` and every API key client, and the service still verifies the token.",
    "A backup is proved by a restore, which always makes a new instance.",
    "The monthly review prices model tokens only, so it is part of the bill.",
    "AskPEP's drill showed IAP would stop the build tool, so production keeps IAP off under ADR 0009, with an owner and a date.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. I can run the drills a live AI service needs, and write down what each one did not prove.",
  interviewIds: ["cloud-q34", "cloud-q35", "cloud-q36", "cloud-q09"],
};

export default chapter;
