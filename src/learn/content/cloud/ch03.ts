import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "cloud-03-container-and-cloud-run",
  course: "cloud",
  number: 3,
  title: "Cloud Run fits a stateless API that streams",
  tagline: "Size the service for streams, run the ingest as a job, and give the queue its three grants.",
  minutes: 88,
  objectives: [
    "Say why Cloud Run fits AskPEP and what would change that.",
    "Size a streaming route and set its timeout above the desk's budget.",
    "Decide on a minimum instance and read a startup probe.",
    "Say which settings Terraform keeps and which it leaves alone.",
    "Read the ingest job and say why it retries nothing.",
    "Give the queue its three grants.",
    "Say why the folder must not be applied yet.",
    "Write a sizing note and record ADR 0007.",
  ],
  sections: [
    {
      id: "s1-where-it-runs",
      title: "Cloud Run stays the home for AskPEP unless a rival meets a named need",
      goal: "Why does Cloud Run stay the home for AskPEP, and what would change that?",
      blocks: [
        {
          kind: "p",
          text: "The service runs on Cloud Run, as the pilot does, but with settings you now choose on purpose. It is Thursday 17 December. Yesterday the project moved into Terraform. Today the service, the ingest job and the task queue follow it. First you check that Cloud Run is still the right home, as ADR 0003 said it was.",
        },
        // CHECK: the Cloud Run basics in this section: that Cloud Run starts instances of a container when requests arrive and removes them afterwards, that a change to the image or the settings makes a new revision, that a service answers requests and a job runs a command to the end, and that Cloud Run sets PORT to 8080. FACTS.md holds nothing on Cloud Run. Source: the Cloud Run overview and container contract pages. Not checked against them.
        {
          kind: "p",
          text: "Cloud Run runs a container image for you. You give it the image and a few settings. It starts **instances** of the container when requests arrive and removes them when the requests stop. Each change to the image or the settings makes a new **revision**, which is one frozen version of both.",
        },
        {
          kind: "p",
          text: "Cloud Run has two shapes. A **service** answers HTTP requests and stays ready for more. A **job** runs a command to the end and stops. AskPEP uses both. The API is a service, and the migrations and the ingest are a job.",
        },
        {
          kind: "p",
          text: "The container has one duty. It must listen on the port in the `PORT` variable, which Cloud Run sets to 8080. The Dockerfile from chapter 14 of course 1 does that, because its start command passes `PORT` to `uvicorn`.",
        },
        {
          kind: "p",
          text: "AskPEP fits because the service keeps nothing between requests. The documents, the saved state of each desk thread and the feedback all live in Postgres. An instance holds only the requests it is serving. Cloud Run may stop an instance at any time, and nothing is lost. Software like this is **stateless**.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "The cache is the one piece of state, and production turns it off",
          text: "ADR 0004 set `CACHE_ENABLED=false`, so production holds no state in an instance. If you turned it on, the cache would live inside one instance, and every new instance would start empty. That costs speed and never correctness. When Cloud Run runs three instances, you have three caches, and each one fills on its own.",
        },
        {
          kind: "p",
          text: "Two other homes compete for this work. **Kubernetes** runs containers across a pool of machines, and you describe what to run in files called manifests. **GKE Autopilot** is Kubernetes where Google manages the machines for you.",
        },
        {
          kind: "p",
          text: "**Agent Runtime** is the third home. It is a Google service that hosts an agent you hand over. It was called Agent Engine until 22 April 2026, when Vertex AI became the Gemini Enterprise Agent Platform. The table below was checked on 22 October 2026.",
        },
        // CHECK: every cell of this table for GKE Autopilot and Agent Runtime, and the Cloud Run cells on what Google runs and on scaling. FACTS.md holds only the rename of Agent Engine to Agent Runtime on 22 April 2026. Source: the Cloud Run, GKE Autopilot and Agent Runtime overview pages. The Agent Runtime page is under gemini-enterprise-agent-platform/build/runtime on docs.cloud.google.com.
        {
          kind: "compare",
          caption: "Three homes for AskPEP, checked on 22 October 2026. The last row says why AskPEP is or is not there.",
          columns: ["Question", "Cloud Run", "GKE Autopilot", "Agent Runtime"],
          rows: [
            ["Name before 22 April 2026", "Cloud Run", "GKE Autopilot", "Agent Engine"],
            ["What you hand over", "A container image and a few settings.", "A container image and Kubernetes manifests.", "An agent built with a supported framework."],
            ["What Google runs", "The machines, the scaling and the front door.", "The machines. You still write and run the manifests.", "The machines and the agent host."],
            ["Scaling", "A service scales down to zero instances, and a setting keeps a minimum.", "You choose the capacity your workloads request, and you pay for it.", "Managed by the service."],
            ["Where it fits", "Stateless APIs, streams and jobs.", "A client whose platform is Kubernetes, or a workload that needs a Kubernetes feature.", "An agent that needs no routes of its own."],
            ["AskPEP here?", "Yes. It is a stateless API with streaming routes and one job.", "No. No client rule and no feature requires it.", "No. AskPEP has its own routes, its own token check and its own queue callback."],
          ],
        },
        {
          kind: "widget",
          id: "cloud03-workload-placer",
          intro:
            "Five workloads are listed, and each has four homes to choose from. Pick one for each. A wrong pick explains itself, so try the options you doubt. The third workload is the route that Cloud Tasks calls in chapter 5 of course 6 to run a queued desk. The last two are invented cases.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Cloud Run against Kubernetes comes up in interviews",
          text: "Cloud Run against Kubernetes comes up in interviews. Why not Kubernetes, they ask. Answer with the workload. AskPEP is a stateless API and one job, and Cloud Run runs both with no cluster to look after. Then name the need that would change your answer, such as a client rule that every workload runs in its own cluster.",
        },
        {
          kind: "quiz",
          id: "cloud03-q1",
          question: "A client's rule says every workload must run in the platform team's Kubernetes cluster. What does that change for AskPEP?",
          options: [
            "Nothing. Cloud Run is the best home in every case.",
            "AskPEP moves to GKE Autopilot, because a client rule is a named need.",
            "AskPEP moves to Agent Runtime, because it is managed by Google.",
            "AskPEP becomes a Cloud Run job, because a job needs no cluster.",
          ],
          answer: 1,
          explain:
            "Cloud Run is the default, and a default gives way to a named need. A client's rule is such a need. Agent Runtime is a Google service and not the client's cluster. A job runs a command to the end, so it can't serve an API.",
        },
        {
          kind: "p",
          text: "Cloud Run stays. What number decides how many instances a streaming answer needs?",
        },
      ],
    },
    {
      id: "s2-streams",
      title: "A stream holds a request open, so open streams set the number of instances",
      goal: "How many instances does a streaming route need, and how long may a request stay open?",
      blocks: [
        {
          kind: "p",
          text: "AskPEP streams its answers as **server-sent events**. The caller opens one request. The service writes small messages into it for as long as the answer takes. Both `/ask` and `/agent` work this way.",
        },
        {
          kind: "p",
          text: "Each route sends the header `X-Accel-Buffering: no`. It asks any proxy on the path to pass each message on at once. Without it, a proxy could hold the tokens back until the end.",
        },
        {
          kind: "p",
          text: "A stream keeps its request open the whole time. That changes how you size the service. A quick JSON route frees its place in milliseconds. A stream keeps its place for seconds.",
        },
        // CHECK: that Cloud Run counts a streamed request as one request for the whole time it is open, so a stream holds one concurrency slot until it ends, and that the default concurrency is 80. FACTS.md holds nothing on Cloud Run. Source: the Cloud Run concurrency and request timeout pages.
        {
          kind: "p",
          text: "**Concurrency** is the number of requests one instance serves at once. When every instance is full, Cloud Run starts another, up to the **maximum instances**. `run.tf` sets the concurrency to 20 and the maximum to 3. The service can hold 60 open streams.",
        },
        {
          kind: "callout",
          tone: "analogy",
          title: "A restaurant and its seats",
          text: "Concurrency is the number of seats. A stream is a guest who stays for the whole meal. A takeaway order is gone in a minute, so a few seats serve many people. A long meal fills the seats, and the next guest waits at the door.",
        },
        {
          kind: "p",
          text: "The number of open streams is a product. The arrivals a second, times the seconds each stream stays open, give the streams open at once. Divide that by the concurrency and round up to get the instances. This rule is **Little's law**.",
        },
        {
          kind: "p",
          text: "Take a busy hour. Three questions arrive a second, and each streams for 10 seconds. That keeps 30 streams open. At a concurrency of 20 you need 2 instances.",
        },
        {
          kind: "widget",
          id: "cloud03-instance-sizer",
          intro:
            "The widget starts on a busy hour of 180 questions a minute, with a concurrency of 20 and a cap of 3 instances. Move one control at a time, then try the desk scenario from chapter 6 of course 2. Find one setting that fits under the cap and one that overflows it. The scenarios are invented.",
        },
        // CHECK: what Cloud Run does with a request when every instance is full and the maximum is reached. The expected answer is a short wait and then an HTTP 429. Also that Cloud Run may start instances earlier than the concurrency sum says, because it watches CPU use. Source: the Cloud Run autoscaling and concurrency pages.
        {
          kind: "p",
          text: "The sum is a lower bound. It uses averages, and real arrivals come in bursts. Cloud Run also watches CPU use, so it may start instances sooner than the sum says. Past the cap a caller waits, and some callers are refused.",
        },
        // CHECK: that the request timeout is the time Cloud Run lets one request stay open and that Cloud Run ends the request when it passes, which stops a stream in the middle of an answer. The service sets 300 seconds. Source: the Cloud Run request timeout page.
        {
          kind: "p",
          text: "The **request timeout** is how long Cloud Run lets one request stay open. When it passes, Cloud Run ends the request, and a stream stops in the middle of an answer. The service sets 300 seconds.",
        },
        {
          kind: "p",
          text: "The desk has its own budget from chapter 6 of course 2, which is 60 seconds, 12 steps and 20,000 tokens. Keep the timeout above that budget. Then the desk ends a run and records the reason in `stop_reason`. If Cloud Run ends it first, the caller sees a broken stream and no reason.",
        },
        {
          kind: "quiz",
          id: "cloud03-q2",
          question: "A route gets 120 requests a minute. Each stream stays open for 15 seconds. One instance serves 10 at once. How many instances does it need?",
          options: ["2", "3", "12", "30"],
          answer: 1,
          explain:
            "120 a minute is 2 a second. Two a second for 15 seconds keeps 30 streams open. Thirty divided by 10 is 3 instances. The answer 30 is the open streams, and 12 divides the wrong way.",
        },
        {
          kind: "quiz",
          id: "cloud03-q3",
          question: "The desk budget is 60 seconds and the request timeout is 30 seconds. A run uses its whole budget. What does the caller see?",
          options: [
            "A stopped result with the reason, because the budget ends the run.",
            "A stream that breaks at 30 seconds with no reason, because Cloud Run ends the request first.",
            "A stream that goes on for 60 seconds, because the budget raises the timeout.",
            "An HTTP 429, because the run used its whole budget.",
          ],
          answer: 1,
          explain:
            "The timeout belongs to Cloud Run, and it cuts the request at 30 seconds. The budget never gets to act. Set the timeout above the longest run the budget allows, so the app ends the run and says why.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Streaming on a serverless platform comes up in interviews",
          text: "Streaming on a serverless platform comes up in interviews. How do you size a streaming API on Cloud Run, they ask. Start with the open streams, which are the arrival rate times the stream length. Divide by the concurrency of one instance. Then add that a stream mostly waits on the model. Say you would check the p95 latency before raising the concurrency.",
        },
        // CHECK: the field paths in the format string, and that a service made with gcloud run deploy and no concurrency flag shows containerConcurrency 80 and timeoutSeconds 300. The output below is a sample and nobody captured it. Source: the gcloud run services describe reference and the Cloud Run defaults.
        {
          kind: "step",
          id: "cloud03-s01",
          title: "Read the settings of the service you made by hand",
          text: "Run this against the service from chapter 14 of course 1. It only reads, and it costs nothing. Look for the concurrency and the timeout that Cloud Run chose for you. Skip the step if you tore that service down.",
          lang: "bash",
          code: `gcloud run services describe askpep --region europe-west3 \\
  --format="yaml(spec.template.spec.containerConcurrency,spec.template.spec.timeoutSeconds,spec.template.metadata.annotations)"`,
          expect: `# Sample output, not captured. Yours may show more annotations.
# chapter 14 of course 1 never set a concurrency, so 80 is a default that nobody chose.
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/maxScale: '3'
    spec:
      containerConcurrency: 80
      timeoutSeconds: 300`,
        },
        {
          kind: "p",
          text: "Open streams set the instances you need. What happens at the moment when none are running?",
        },
      ],
    },
    {
      id: "s3-instances",
      title: "A minimum instance buys a faster first answer and costs money while idle",
      goal: "Is a minimum instance worth its cost, and what do the startup probe and CPU setting do?",
      blocks: [
        // CHECK: that a service with a minimum of 0 instances is stopped when it has no requests and uses no compute, and what an idle minimum instance costs. FACTS.md holds nothing on Cloud Run pricing. Source: the Cloud Run pricing and minimum instances pages.
        {
          kind: "p",
          text: "The service has a minimum of 0 instances. After a quiet spell Cloud Run stops every instance, and the service uses no compute. This is **scale to zero**.",
        },
        {
          kind: "p",
          text: "The next request then waits for a new instance to start. That wait is a **cold start**. The caller sees a slow first token, because the instance must load Python, the app and its first database connection.",
        },
        {
          kind: "p",
          text: "A **minimum instance** keeps one instance running. The first request then meets a warm instance. You pay for that instance while it sits idle. For a desk that a few people use a day, the saving is not worth the cost.",
        },
        {
          kind: "p",
          text: "So start at 0 and measure. The traces from chapter 3 of course 5 show how long the first token takes. Raise the minimum only when someone waits too long, and only for the hours when they do.",
        },
        // CHECK: that the startup probe waits the initial delay and then calls the path every period, that it fails the start after the threshold of misses, and that Cloud Run sends no traffic to a revision that has not passed it. Source: the Cloud Run health checks page.
        {
          kind: "p",
          text: "Cloud Run sends no traffic to an instance until it is ready. The **startup probe** is how it finds out. After 5 seconds it calls `GET /health` every 5 seconds. Six misses in a row fail the start. An instance has about 35 seconds to come up.",
        },
        {
          kind: "p",
          text: "The route runs `SELECT 1` on the database, with a limit of 3 seconds, and answers 503 when it fails. A revision that can't reach its database never passes the probe. So it should never take traffic. That is a useful net, and section 7 shows why you can't lean on it.",
        },
        // CHECK: that startup_cpu_boost gives an instance extra CPU while it starts, and that with cpu_idle set to true the CPU is allocated only while a request is open, so a background thread such as a batch span exporter runs slowly or waits between requests. Source: the Cloud Run CPU allocation and startup CPU boost pages.
        {
          kind: "p",
          text: "Two more settings shape the start. `startup_cpu_boost` gives the instance extra CPU while it starts, which shortens a cold start. `cpu_idle` set to true gives the CPU to an instance only while a request is open.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "Request-only CPU can starve background work",
          text: "A stream is a request, so the CPU is on while it runs. A background thread runs slowly between requests. The span exporter from chapter 3 of course 5 is one. Spans from the last request of the day may reach Cloud Trace late. If traces go missing, look at this setting first.",
        },
        {
          kind: "quiz",
          id: "cloud03-q4",
          question: "The first answer after a quiet night takes 20 seconds longer than usual. The minimum instances are 0. What explains it, and what do you try first?",
          options: [
            "A cold start. Measure the start in the traces before you pay for a minimum instance.",
            "The cap of 3 instances. Raise the cap.",
            "The concurrency of 20. Lower it to 1.",
            "The timeout of 300 seconds. Lower it to 60.",
          ],
          answer: 0,
          explain:
            "With no instance running, the first request waits for one to start. Measure that start first, because a minimum instance costs money every hour. The cap, the concurrency and the timeout do not change how long a start takes.",
        },
        // CHECK: that docker build and docker run work with these flags, and the output below. In this lane I started the app with a test client, the default Postgres store and no reachable database, and GET /health answered 503 with the body {"detail":"database unreachable"} after about 3 seconds. Nobody built the image or ran Docker, so the output is a sample. Source: the Dockerfile in capstone/ and the health route in api.py.
        {
          kind: "step",
          id: "cloud03-s02",
          title: "Start the image with no database and watch the health route fail",
          text: "Build the image from your Dockerfile. Run it with `PORT` set to 8080 and the fake providers. The container has no database, so the health route should answer 503. That is what the startup probe sees on a revision with no database. Call it from a second terminal. It costs nothing. Stop the container with Control and C.",
          lang: "bash",
          code: `# Terminal 1, from your AskPEP workspace.
docker build -t askpep:local .
docker run --rm -p 8080:8080 -e PORT=8080 -e PROVIDERS=fake askpep:local

# Terminal 2.
curl -i http://localhost:8080/health`,
          expect: `Sample output, not captured. The call waits about 3 seconds.
HTTP/1.1 503 Service Unavailable
{"detail":"database unreachable"}

The app answered on port 8080, so the image honours PORT.`,
        },
        {
          kind: "p",
          text: "You have chosen the numbers. How do they get into the file that Terraform owns?",
        },
      ],
    },
    {
      id: "s4-run-tf",
      title: "Terraform owns the shape of the service, and the pipeline owns the image",
      goal: "Which settings does Terraform own, and which does it leave to the pipeline?",
      blocks: [
        {
          kind: "p",
          text: "`run.tf` describes the service you made by hand in chapter 14 of course 1. Terraform adopts it, which means it learns that the service exists and manages it in place. It does not build a second one. An **import block** is how you tell it.",
        },
        {
          kind: "p",
          text: "Other files fill some of its inputs. A local, as chapter 2 showed, is a named value that any file in the folder can read. `run.tf` and `job.tf` read seven locals that other files define. Your starter folder already defines each one as empty, so the folder stays valid until the file that fills it.",
        },
        {
          kind: "p",
          text: "Step 3 of this lab fills `tasks_env`. Later chapters fill the rest. One of them, `iap_enabled`, is a switch for **Identity-Aware Proxy**. That is a Google sign-in that chapter 8 puts in front of the service.",
        },
        {
          kind: "compare",
          caption: "The locals that run.tf and job.tf read. Each holds an empty value until its file fills it.",
          columns: ["Local", "Filled by", "Holds until then"],
          rows: [
            ["`vpc`", "`network.tf`, in chapter 4", "`null`, so the service has no private network."],
            ["`secret_env`", "`secrets.tf`, in chapter 4", "An empty map, so the service has no secrets."],
            ["`job_secret_env`", "`secrets.tf`, in chapter 4", "An empty map. The job reads it."],
            ["`vertex_env`", "`vertex.tf`, in chapter 5", "An empty map."],
            ["`tasks_env`", "`tasks.tf`, in step 3 of this lab", "An empty map."],
            ["`ops_env`", "`ops.tf`, in chapter 8", "An empty map."],
            ["`iap_enabled`", "`ops.tf`, in chapter 8", "`false`."],
          ],
        },
        {
          kind: "p",
          text: "The first block sets the service's name, its account and its limits. It runs as `askpep-run`, the account from chapter 2 that holds only what the service needs. The scaling block sets the minimum to 0 and the cap to 3.",
        },
        {
          kind: "code",
          lang: "hcl",
          code: `# infra/terraform/run.tf
resource "google_cloud_run_v2_service" "askpep" {
  project  = var.project_id
  name     = "askpep"
  location = var.region

  template {
    service_account = google_service_account.askpep["askpep-run"].email

    timeout                          = "300s"
    max_instance_request_concurrency = 20

    scaling {
      min_instance_count = 0
      max_instance_count = 3
    }

    # The containers block follows below.
  }
}`,
          caption: "The shape of the service. Every number here is one you met in sections 2 and 3.",
        },
        {
          kind: "p",
          text: "The container block holds the image, the limits and the probe. The image comes from `var.image`. Its default is Google's hello-world image, which Terraform uses only if it has to create the service. After that it ignores the image, because the pipeline deploys every later one.",
        },
        // CHECK: that Google's hello-world image answers GET /health with a success code. I expect it does not, in which case a service created fresh from the default image fails the startup probe. A service adopted by the import block keeps its own image, so the learner is not affected. Source: the default of var.image in variables.tf.
        {
          kind: "code",
          lang: "hcl",
          code: `containers {
  image = var.image

  resources {
    limits = {
      cpu    = "1"
      memory = "1Gi"
    }

    cpu_idle          = true
    startup_cpu_boost = true
  }

  startup_probe {
    initial_delay_seconds = 5
    period_seconds        = 5
    timeout_seconds       = 3
    failure_threshold     = 6

    http_get {
      path = "/health"
    }
  }
}`,
          caption: "The container, with the startup probe from section 3.",
        },
        {
          kind: "p",
          text: "The environment comes in two parts. The plain part is the local `env`, which merges `base_env` with `vertex_env`, `tasks_env` and `ops_env`. Every name in `base_env` is a setting that AskPEP reads. None of them is a secret.",
        },
        {
          kind: "p",
          text: "A **dynamic block** repeats a block once for each item in a collection. Two dynamic `env` blocks do the work. The first turns each entry of `env` into a plain variable. The second turns each entry of `secret_env` into a reference to a secret.",
        },
        // CHECK: that a secret reference with version "latest" is read when an instance starts, so a new secret version reaches the service only on a new instance, and that PRIVATE_RANGES_ONLY sends only traffic for private addresses through Direct VPC egress. FACTS.md holds nothing on either. Source: the Cloud Run secrets and Direct VPC egress pages.
        {
          kind: "code",
          lang: "hcl",
          code: `locals {
  base_env = {
    GOOGLE_CLOUD_PROJECT = var.project_id
    GCP_REGION           = var.region
    STORE                = "pg"
    PROVIDERS            = "live"
    OTEL_EXPORTER        = "gcp"
  }

  env = merge(local.base_env, local.vertex_env, local.tasks_env, local.ops_env)
}

# Inside containers { }:
dynamic "env" {
  for_each = local.env

  content {
    name  = env.key
    value = env.value
  }
}

dynamic "env" {
  for_each = local.secret_env

  content {
    name = env.key

    value_source {
      secret_key_ref {
        secret  = env.value
        version = "latest"
      }
    }
  }
}`,
          caption: "A secret goes in through value_source. It never goes in value, so Terraform never holds the secret's value.",
        },
        {
          kind: "p",
          text: "The network block is a dynamic block too. It loops over `local.vpc` as a list of one or none. While `vpc` is `null`, the list is empty and the block disappears. In chapter 4 the block gives the instance an address on your private network, so it can reach the database.",
        },
        {
          kind: "p",
          text: "Two writers touch this service. Terraform sets its shape. The pipeline from chapter 6 deploys each new image, and chapter 7 shifts traffic between revisions. If Terraform fought the pipeline, every apply would undo the last deploy.",
        },
        // CHECK: that the fields in ignore_changes are the ones a gcloud run deploy changes on a Cloud Run v2 service: client, client_version, traffic, the template revision, the template labels and the image. Source: the google_cloud_run_v2_service resource page in the Terraform provider docs.
        {
          kind: "p",
          text: "`ignore_changes` settles it. Terraform leaves the listed fields alone after it adopts the service. The list holds the image, the traffic split, the revision name, the template labels and the two client fields that `gcloud` stamps on a deploy.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "The environment is not on the list",
          text: "Terraform owns the environment, so an apply puts back any value changed by hand. The kill switch of chapter 8 is an environment variable. A switch thrown by hand is undone at the next apply, unless you set it in Terraform too.",
        },
        // CHECK: that an organisation policy can block a grant to allUsers, and that the first plan after an import shows the service as updated in place. FACTS.md holds nothing on either. Source: the Cloud Run authentication page and the Terraform import block page.
        {
          kind: "code",
          lang: "hcl",
          code: `lifecycle {
  ignore_changes = [
    client,
    client_version,
    traffic,
    template[0].revision,
    template[0].labels,
    template[0].containers[0].image,
  ]
}

resource "google_cloud_run_v2_service_iam_member" "public" {
  count = local.iap_enabled ? 0 : 1

  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.askpep.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

import {
  to = google_cloud_run_v2_service.askpep
  id = "projects/\${var.project_id}/locations/\${var.region}/services/askpep"
}`,
          caption: "The lifecycle block sits inside the service. The grant and the import block sit beside it.",
        },
        {
          kind: "p",
          text: "`roles/run.invoker` is the role that lets an account call a service. The grant to `allUsers` lets anyone reach the URL, as the `--allow-unauthenticated` flag did in chapter 14 of course 1. AskPEP's own key check then refuses every protected route that has no valid `X-API-Key`.",
        },
        {
          kind: "p",
          text: "The `count` turns that grant off once `iap_enabled` is true. Then only the people you name can reach the service. The same file also outputs the service URL as `service_url`, which the workflows read.",
        },
        {
          kind: "quiz",
          id: "cloud03-q5",
          question: "Someone changes an environment variable of the live service in the console. What does the next `terraform apply` do?",
          options: [
            "It keeps the change, because Terraform ignores the environment.",
            "It puts the Terraform value back, because the environment is not in `ignore_changes`.",
            "It fails with a conflict, because the console and Terraform disagree.",
            "It deletes the service and builds it again.",
          ],
          answer: 1,
          explain:
            "Terraform owns every field that `ignore_changes` leaves out, and the environment is one of them. An apply sets those fields to what the files say. That is the reason an emergency change must also go into Terraform.",
        },
        {
          kind: "p",
          text: "The service has a shape in code. What about the ingest, which runs and stops?",
        },
      ],
    },
    {
      id: "s5-job-tf",
      title: "The ingest job migrates first and stops if the migration fails",
      goal: "Why does the job join its commands with `&&` and retry nothing?",
      blocks: [
        {
          kind: "p",
          text: "The job runs the same image as the service with a different command. It runs `askpep migrate`, then `askpep ingest --fetch`. The migrations bring the database schema up to date. The ingest fetches the PEPs, splits them into chunks and stores their embeddings.",
        },
        {
          kind: "p",
          text: "`sh -c` runs one line of shell. `&&` runs the second command only if the first one succeeded. A failed migration then ends the run. The ingest never writes into a half-migrated schema.",
        },
        // CHECK: that the Terraform job resource nests one template inside another, with the outer one for the run and the inner one for each task, that max_retries of 0 means a failed task is not run again, and the default and maximum task timeout of a job. Source: the google_cloud_run_v2_job resource page and the Cloud Run jobs create page.
        {
          kind: "code",
          lang: "hcl",
          code: `# infra/terraform/job.tf
resource "google_cloud_run_v2_job" "ingest" {
  project  = var.project_id
  name     = "askpep-ingest"
  location = var.region

  template {
    template {
      service_account = google_service_account.askpep["askpep-job"].email
      max_retries     = 0
      timeout         = "900s"

      containers {
        image   = var.image
        command = ["sh", "-c", "askpep migrate && askpep ingest --fetch"]

        # Two more blocks sit here: a dynamic vpc_access block over local.vpc,
        # and a dynamic env block over local.job_secret_env.
      }
    }
  }

  lifecycle {
    ignore_changes = [
      client,
      client_version,
      template[0].template[0].containers[0].image,
    ]
  }
}

import {
  to = google_cloud_run_v2_job.ingest
  id = "projects/\${var.project_id}/locations/\${var.region}/jobs/askpep-ingest"
}`,
          caption: "The job. The two blocks in the comment copy the service's network block and its secret block.",
        },
        {
          kind: "p",
          text: "The resource nests one `template` inside another. The outer one describes a run. The inner one describes each task in it. The job runs as `askpep-job`, the second account from chapter 2, and it reads only the two secrets that an ingest needs.",
        },
        {
          kind: "p",
          text: "`max_retries = 0` means Cloud Run never runs a failed task again. A failed run should stop the pipeline and reach a person. A silent retry would delay that. The timeout of 900 seconds stops a task that runs on past 15 minutes.",
        },
        {
          kind: "callout",
          tone: "insight",
          title: "A migration must not break the revision that is serving",
          text: "The job runs before a new revision takes traffic. The old revision is still serving while it runs. A migration that drops a column the old code reads would break live requests. Add first, switch the code, and drop later.",
        },
        {
          kind: "quiz",
          id: "cloud03-q6",
          question: "The job command is `askpep migrate && askpep ingest --fetch`. What does the `&&` do?",
          options: [
            "It runs both commands at the same moment to save time.",
            "It runs the ingest only if the migration succeeded.",
            "It retries the migration until it succeeds.",
            "It runs the ingest even if the migration failed.",
          ],
          answer: 1,
          explain:
            "`&&` stops at the first failure. A failed migration then ends the job with an error, and the ingest never runs. Running both together or ignoring a failure would let the ingest write into a schema that is not ready.",
        },
        {
          kind: "p",
          text: "The service and the job are described. How does the queue reach the service safely?",
        },
      ],
    },
    {
      id: "s6-tasks",
      title: "The queue needs three grants, and a missing invoker fails without a sound",
      goal: "Which three grants does the queue need, and what fails if one is missing?",
      blocks: [
        {
          kind: "p",
          text: "In chapter 5 of course 6 the service learned to hand a desk run to a queue. That chapter only read the queue's name from settings. It said the cloud course creates the queue. `tasks.tf` does that now. Nothing in it is imported, because no earlier chapter made the queue.",
        },
        // CHECK: that Cloud Tasks can create a queue in europe-west3, and the meaning of the queue settings: max_concurrent_dispatches, max_dispatches_per_second, max_attempts, and a backoff that starts at min_backoff, doubles up to max_doublings times and never passes max_backoff. FACTS.md holds nothing on Cloud Tasks. Source: the Cloud Tasks locations page and the queue configuration page.
        {
          kind: "p",
          text: "The queue is a Cloud Tasks resource. `max_concurrent_dispatches = 5` lets 5 tasks run at once. `max_attempts = 3` gives up after 3 tries. The wait before a retry starts at 10 seconds, doubles up to 4 times, and never passes 300 seconds.",
        },
        {
          kind: "p",
          text: "The queue's limit and the service's slots fit together. Five desk runs at once hold 5 of the 60 streams the service can carry. The queue can never swamp the service.",
        },
        {
          kind: "p",
          text: "Two accounts take part. `askpep-run` is the service, and it creates tasks. `askpep-tasks` is the account whose token the queue signs. Chapter 2 created it and gave it no role. The service checks that token on `POST /internal/tasks/agent` and refuses any other account.",
        },
        {
          kind: "p",
          text: "That gives three grants, and each one is as narrow as it can be.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "`askpep-run` may create tasks. The role is `roles/cloudtasks.enqueuer`, granted on this one queue.",
            "`askpep-run` may act as `askpep-tasks`. The role is `roles/iam.serviceAccountUser`, granted on `askpep-tasks`.",
            "`askpep-tasks` may call the service. The role is `roles/run.invoker`, granted on the service `askpep`.",
          ],
        },
        {
          kind: "p",
          text: "The enqueuer role goes on the queue and never on the project. A project grant would let the service create tasks on every queue the project ever has. The act-as grant exists because a task carries a token for `askpep-tasks`. Google refuses to attach it for an account that can't act as that one.",
        },
        // CHECK: that Cloud Tasks accepts a task whose OIDC token names a service account that the caller may act as, that the token audience is the target URL, that the grants use these roles, and that Cloud Run itself answers 403 to a caller without roles/run.invoker, before the request reaches the container, so the app logs nothing for it. Whether the app's own logs show every request it does get depends on its logging setup, which I did not check. Source: the Cloud Tasks authentication page and the Cloud Run authentication page.
        {
          kind: "code",
          lang: "hcl",
          code: `# infra/terraform/tasks.tf
resource "google_cloud_tasks_queue" "agent" {
  project  = var.project_id
  name     = "askpep-agent"
  location = var.region

  rate_limits {
    max_concurrent_dispatches = 5
    max_dispatches_per_second = 5
  }

  retry_config {
    max_attempts  = 3
    min_backoff   = "10s"
    max_backoff   = "300s"
    max_doublings = 4
  }
}

resource "google_cloud_tasks_queue_iam_member" "run_enqueues" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_tasks_queue.agent.name
  role     = "roles/cloudtasks.enqueuer"
  member   = "serviceAccount:\${google_service_account.askpep["askpep-run"].email}"
}`,
          caption: "The queue and the first grant. The other two grants are a run.invoker member on the service and a serviceAccountUser member on askpep-tasks.",
        },
        // CHECK: that a Cloud Run service URL has the form https://SERVICE-PROJECT_NUMBER.REGION.run.app, so the target URL can be built from the project number. Confirm yours with gcloud run services describe askpep. Source: the Cloud Run service URL page.
        {
          kind: "p",
          text: "`tasks_env` sets four variables that the app reads. `ASYNC_MODE` sends desk jobs to the queue and stops the service running them itself. `TASKS_QUEUE` and `TASKS_SERVICE_ACCOUNT` name the queue and the account. `TASKS_TARGET_URL` is the address the queue calls, and it is also the audience, the address the token is made for.",
        },
        {
          kind: "p",
          text: "The service can't read its own address inside its own template, because Terraform would see a cycle. The local builds the URL from the project number instead. A data source called `google_project` supplies that number.",
        },
        {
          kind: "p",
          text: "The URL takes the form `https://askpep-<project number>.<region>.run.app/internal/tasks/agent`. Files in chapter 8 read the same data source.",
        },
        {
          kind: "widget",
          id: "cloud03-task-grants",
          intro:
            "The widget sets three grants and sends one job through the queue. The caller sends `POST /jobs/agent` from chapter 5 of course 6. Four hops follow, and a missing grant stops the job at one. Change one grant at a time. Find the case where the caller gets a 202 and the job never runs. Nobody ran this on a live project.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "A missing invoker looks like success to the caller",
          text: "With no invoker grant, the queue accepts the task and the caller gets 202 and a thread id. Cloud Run then refuses every call from the queue. The poll answers 404 for ever. Look for a 403 on that route in the request logs. If the app's own logs show no call, Cloud Run refused it.",
        },
        {
          kind: "quiz",
          id: "cloud03-q7",
          question: "A caller gets 202 and a thread id. The poll answers 404 for ever. The request logs show a 403 on `/internal/tasks/agent`, and the app's own logs show no call. Which grant is missing?",
          options: [
            "`roles/cloudtasks.enqueuer` for `askpep-run` on the queue.",
            "`roles/iam.serviceAccountUser` for `askpep-run` on `askpep-tasks`.",
            "`roles/run.invoker` for `askpep-tasks` on the service.",
            "No grant. AskPEP's own token check rejects every task.",
          ],
          answer: 2,
          explain:
            "A missing enqueuer or act-as grant fails the create call, and the caller sees a 502. The queue took this task, so both exist. A 403 that the app never logged came from Cloud Run itself. The account that made the call may not invoke the service. The app's own token check would have logged it.",
        },
        {
          kind: "p",
          text: "All three files are written. Can you apply them today?",
        },
      ],
    },
    {
      id: "s7-order",
      title: "Nothing is applied until chapter 4 gives the service its database",
      goal: "Why can't the new service be applied yet, and what do you do instead?",
      blocks: [
        {
          kind: "p",
          text: "`run.tf` describes a different service from the one you made in chapter 14 of course 1. Two differences matter now. Together they mean that you must not apply this folder yet.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "The `/cloudsql` volume is gone. Chapter 14 of course 1 attached the Cloud SQL instance with a flag, and the database URL pointed at the socket that flag made. `run.tf` has no such volume.",
            "`secret_env` is empty. The new service has no `DATABASE_URL`, no `API_KEY` and no model keys until chapter 4 fills it.",
          ],
        },
        {
          kind: "p",
          text: "An apply now would build a new revision with no database address. The app falls back to a database on `localhost`, which does not exist. The health route then answers 503, as it did in your local run.",
        },
        {
          kind: "p",
          text: "The startup probe should fail, and the apply would end with an error. Treat that as luck and not as a plan.",
        },
        {
          kind: "p",
          text: "The job fares no better. After an apply its command has no socket and no secrets. The next run of the job fails at its first database call.",
        },
        {
          kind: "p",
          text: "So the order is fixed. You write the three files and run their tests. You read a plan and stop. Chapter 4 then puts the database on a private address and points the secret at it. Only after that does anyone apply the folder.",
        },
        {
          kind: "p",
          text: "Your tests don't protect the live service. They read your files as data and never call Google. A green run shows that the files have the right shape. It doesn't show that an apply is safe.",
        },
        // CHECK: the plan output. Nobody ran terraform plan against a live project in this lane, and nobody ran terraform validate on this folder. The exact lines depend on the provider version. Source: the Terraform plan output and import block pages.
        {
          kind: "step",
          id: "cloud03-s03",
          title: "Read a plan and stop",
          text: "Run a plan on `infra/terraform`, with the backend and the `terraform.tfvars` you made in chapter 2. A plan only reads, and it costs nothing. Do not run `terraform apply`. Look at what the plan would change on the service and the job.",
          lang: "bash",
          code: "terraform -chdir=infra/terraform plan",
          expect: `A description of what to look for, not captured output.
- The service and the job are imported, then changed in place.
- On the service, lines with a minus remove the Cloud SQL volume
  and the secret variables. Those removals break the live service.
- A line with a plus sets the concurrency to 20.
- The queue, its grants and the project data source show as new.`,
        },
        // CHECK: that terraform destroy with -target removes the named resource and the resources that depend on it, such as the queue and its grant. Nobody ran it. Source: the Terraform resource targeting page.
        {
          kind: "callout",
          tone: "warn",
          title: "Cost and teardown",
          text: "These files create nothing until you apply them, so this chapter costs nothing. After an apply, Terraform owns the service. A plain `terraform destroy` removes everything it owns, including the live service. To remove one piece, name its address, such as `terraform destroy -target=google_cloud_tasks_queue.agent`.",
        },
        // CHECK: that gcloud tasks queues describe takes --location, and that an idle service with no minimum instances and request-only CPU costs nothing for compute. The test names come from labs/askpep/tests/cloud/STEPS.md. Source: the gcloud tasks queues describe reference.
        {
          kind: "step",
          id: "cloud03-s04",
          title: "After chapter 4 has applied this folder, run the two live tests",
          text: "Do this only once chapter 4 has applied the folder. The two tests read the live service and the live queue with `gcloud`. They only read. They are skipped by default, so name the marker. Set your project first.",
          lang: "bash",
          code: `export GOOGLE_CLOUD_PROJECT=your-project-id
uv run pytest tests/cloud -m live -k "cloud03_s1 or cloud03_s3"`,
          expect: `Sample output, not captured.
2 passed

The first test checks that the service runs as askpep-run with a
minimum of 0 instances. The second checks that the queue
askpep-agent is in the state RUNNING.`,
        },
        {
          kind: "quiz",
          id: "cloud03-q8",
          question: "Your three step tests pass. What have they shown?",
          options: [
            "That the service can be applied safely.",
            "That the files have the right shape, and nothing about the live project.",
            "That the queue exists in your project.",
            "That all three grants work.",
          ],
          answer: 1,
          explain:
            "The tests read your files as data and never call Google. They check names, limits and references. Only the two live tests, after an apply, touch the live service and queue. A green offline run is no reason to apply early.",
        },
        {
          kind: "p",
          text: "You can't apply today, but you can still answer the question the third team asked. Will this size hold their traffic?",
        },
      ],
    },
    {
      id: "s8-sizing",
      title: "AskPEP needs one instance, so the queue decides how long work waits",
      goal: "How do you record the sizing, and what does ADR 0007 change on the queue?",
      blocks: [
        {
          kind: "p",
          text: "A sizing note turns traffic into open requests, then into instances, and states what it didn't measure. It answers one question for the people waiting. Will this hold? The note also carries ADR 0007, because the queue can't go live without it.",
        },
        {
          kind: "p",
          text: "Here is how AskPEP's sizing went. The design traffic comes from course 6, and the third team's burst is invented.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "You took the design's 111 requests an hour at peak. At 10 seconds each, that is about 0.31 streams open at once.",
            "You added the queue. Five dispatches at 38.4 seconds each is 5 open requests at most, so about six are open in all.",
            "The third team's lead said, \"Our build tool posts 40 desk jobs at the end of a build. Does that break it?\" It doesn't, because the queue holds them.",
            "You did the sum for 40 jobs. Five at a time makes 8 rounds, and 8 rounds at 38.4 seconds is about 307 seconds.",
            "The lead said, \"Five minutes is fine at night.\" The second team's lead said, \"Keep our questions first.\" Queued jobs use 5 of 60 places.",
            "You wrote ADR 0007 into the service code. `desk_job` now passes `route=\"agent.queued\"`, and only R6 counts that route.",
          ],
        },
        {
          kind: "code",
          lang: "text",
          code: `# SERVICE-SIZING  Thursday 17 December 2026
Owner: engineering. Read by: third team's lead, second team's lead.

Traffic used
Design peak: 1,000 requests a day, 111 an hour.
Third team's burst: 40 desk jobs after a build (their estimate).

Open at once
Route          Arrivals       Time open     Open at once
/ask, /agent   111 an hour    10 s (R3)     0.31
queue          5 dispatches   38.4 s        5
Total                                        about 6

Capacity:   concurrency 20 x max 3 = 60 open requests.
Needed:     1 instance. Cap stays at 3.
Burst:      40 jobs / 5 at once = 8 rounds x 38.4 s = 307 s.

Settings
Concurrency 20. Max 3. Min 0. Timeout 300 s.
Desk budget 60 s. Queue deadline 120 s, twice R6 (ADR 0004).

ADR 0007, closed in the service code on 17 December
desk_job passes route=agent.queued. Only R6 counts that route.
R6 runs from the start of the run. Time spent in the queue is not in R6.

Not measured
Cold start at 09:00. The 38.4 s is a design figure from one trace.
Not applied yet: the service has no database until tomorrow.`,
          caption: "AskPEP's sizing note. Every figure except the design numbers is invented.",
        },
        {
          kind: "p",
          text: "Read the capacity line first. Six open requests against a capacity of 60 means the cap isn't the risk. The burst line is the one the third team cares about, and five minutes is an answer they can plan around. The last two lines say what the note doesn't know.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "The lab's desk_job still passes no route",
          text: "ADR 0007 is closed in the story, and it isn't closed in the lab. In the capstone's `api.py`, `desk_job` calls `run_desk` with no route, so a queued run traces as `agent` and counts under R3. The capstone also sets no dispatch deadline, so the 120 seconds is a story value. Treat both as work your own project would still owe.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# SERVICE-SIZING  <date>
Owner:
Read by:

Traffic used, and whose estimate it is:

Route    Arrivals    Time open    Open at once
Total:

Capacity (concurrency x max):
Instances needed:
Worst burst, and how long it takes to drain:

Settings:
Decisions closed today:
Not measured:`,
          caption: "For your next service: fill this in before you argue about the cap.",
        },
        {
          kind: "p",
          text: "The sizing holds, but the service has no database. How does it reach Cloud SQL without a public address?",
        },
      ],
    },
  ],
  lab: {
    title: "Write the service, the job and the queue as Terraform",
    goal: "Write `run.tf`, `job.tf` and `tasks.tf` in your AskPEP workspace. The tests read your files as data, call nothing and run no plan. Don't apply these files until chapter 4 says so, because the new service has no database yet. Then compare your files with `capstone/infra/terraform/`.",
    minutes: 75,
    files: [
      "infra/terraform/run.tf",
      "infra/terraform/job.tf",
      "infra/terraform/tasks.tf",
      "tests/cloud/test_cloud03_cloud_run.py",
    ],
    steps: [
      // CHECK: that iap_enabled on google_cloud_run_v2_service needs the launch stage BETA. The reference run.tf carries its own CHECK that IAP on Cloud Run was in preview when it was written, so the field and the stage may have changed. Source: the google_cloud_run_v2_service resource page.
      {
        title: "The service",
        text: "Replace `run.tf`. The tests raise `cloud-03 step 1` until the service exists. Write the service `askpep` as `askpep-run`. Give it scaling, a startup probe on `/health`, the merged environment and the secret references. Leave the image and the traffic to the pipeline with `ignore_changes`. Add the import block, the public grant and the output.",
        code: `# infra/terraform/run.tf
locals {
  base_env = {
    GOOGLE_CLOUD_PROJECT = var.project_id
    # your turn: GCP_REGION, STORE, PROVIDERS and OTEL_EXPORTER. Each one is a setting. None is a secret.
  }

  # your turn: merge base_env with local.vertex_env, local.tasks_env and local.ops_env
  env = {}
}

resource "google_cloud_run_v2_service" "askpep" {
  # your turn: project, name, location, a BETA launch stage, iap_enabled and depends_on the APIs

  template {
    # your turn: the askpep-run account, a timeout, a concurrency and scaling from 0 to a cap
    # your turn: a dynamic vpc_access block over local.vpc
    # your turn: containers with the image, limits, the startup probe and two dynamic env blocks
  }

  lifecycle {
    ignore_changes = [] # your turn: what the pipeline owns
  }
}

# your turn: allUsers as run.invoker with a count that is 0 while iap_enabled is true
# your turn: the service_url output and the import block`,
        test: "uv run pytest tests/cloud -k cloud03_s1",
      },
      {
        title: "The ingest job",
        text: "Replace `job.tf`. The tests raise `cloud-03 step 2`. Write the job `askpep-ingest` as `askpep-job`, in the same image as the service. It runs the migrations, then the ingest, and stops if a migration fails. Give it no retries, a timeout, the job secrets and the service's network. Add the import block.",
        code: `# infra/terraform/job.tf
resource "google_cloud_run_v2_job" "ingest" {
  # your turn: project, name, location and depends_on the APIs

  template {
    template {
      # your turn: the askpep-job account, no retries and a timeout in seconds
      # your turn: a dynamic vpc_access block over local.vpc

      containers {
        image = var.image
        # your turn: a command that runs askpep migrate and then askpep ingest --fetch
        # your turn: a dynamic env block over local.job_secret_env
      }
    }
  }

  lifecycle {
    ignore_changes = [] # your turn: the image, and the two client fields
  }
}

# your turn: the import block`,
        test: "uv run pytest tests/cloud -k cloud03_s2",
      },
      {
        title: "The task queue",
        text: "Replace `tasks.tf`. The tests raise `cloud-03 step 3`. Create the queue `askpep-agent` and import nothing. Add the project data source, the three grants and `tasks_env`. Build the target URL from the project number, because the service can't name itself. Grant the enqueuer on the queue and never on the project.",
        code: `# infra/terraform/tasks.tf
data "google_project" "this" {
  project_id = var.project_id
}

resource "google_cloud_tasks_queue" "agent" {
  # your turn: project, name, location, rate_limits, retry_config and depends_on the APIs
}

# your turn: askpep-run as the enqueuer on this queue
# your turn: askpep-tasks as run.invoker on the service
# your turn: askpep-run as serviceAccountUser on askpep-tasks

locals {
  tasks_env = {
    # your turn: ASYNC_MODE, TASKS_QUEUE, TASKS_SERVICE_ACCOUNT and TASKS_TARGET_URL
  }
}`,
        test: "uv run pytest tests/cloud -k cloud03_s3",
      },
    ],
    verify: "uv run pytest tests/cloud -k cloud03",
  },
  recap: [
    "Cloud Run is the default home for a stateless API that streams. GKE Autopilot wins on a client's Kubernetes rule, and Agent Runtime wins for an agent with no routes of its own.",
    "Open streams equal the arrivals a second times the seconds each stream stays open. Divide by the concurrency and round up. The sum is a lower bound.",
    "Keep the request timeout above the desk's budget, so the desk ends a run and gives a reason.",
    "Terraform owns the shape and the environment of the service. The pipeline owns the image and the traffic, so `ignore_changes` lists them.",
    "The ingest job runs `askpep migrate && askpep ingest --fetch` with no retries. The queue needs three narrow grants, and a missing invoker fails without a sound.",
    "Nothing is applied before chapter 4, because `run.tf` holds no database and no secrets yet.",
    "AskPEP needs one instance. ADR 0007 is closed in the story, and the lab's `desk_job` still passes no route.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. I can size a streaming service from arrivals and stream length, and say plainly what my sizing did not measure.",
  interviewIds: ["cloud-q13", "cloud-q29", "cloud-q30"],
};

export default chapter;
