import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "cloud-09-the-other-clouds",
  course: "cloud",
  number: 9,
  title: "The design ports, and only three pieces need more than a new name",
  tagline: "A client who isn't on GCP gets the same AskPEP design. Most pieces need a rename, and three need more.",
  minutes: 47,
  objectives: [
    "State which pieces port by a rename and which three do not.",
    "Map the project, the identity, the deploy, the state and the budget.",
    "Map the service, the jobs, the revisions and the secrets.",
    "Map the database and the AI services, and name what is preview.",
    "Say what changes in the queue, the user gate and the kill switch.",
    "Answer a client's question about a cloud you haven't run.",
    "Write `docs/other-clouds.md`.",
    "Write a port map that names which results don't carry over.",
  ],
  sections: [
    {
      id: "s1-ports",
      title: "Most of the deploy ports by a rename, and three pieces do not",
      goal: "What ports, what are the three exceptions, and how old are the facts?",
      blocks: [
        {
          kind: "p",
          text: "You tell them the design ports, most pieces need a rename, three need more, and nobody has run it. It is Thursday 7 January 2027, and a group that runs on Azure has asked what AskPEP would take there.",
        },
        {
          kind: "p",
          text: "Sooner or later a client will tell you the same about Azure or AWS. The design travels. A private database, identity without stored keys, immutable revisions and traffic moved in steps are not Google ideas. They are decisions you can carry to any cloud.",
        },
        {
          kind: "p",
          text: "Azure is Microsoft's cloud and AWS is Amazon's. Both have their own words for the same ideas. A **counterpart** is the service on another cloud that does the same job. Most pieces of the deploy have one, and only the name changes. Three pieces need more than a rename.",
        },
        {
          kind: "p",
          text: "Those three are the queue that carries agent tasks, the user gate and the kill switch. The user gate checks who may open the UI. The kill switch turns parts of AskPEP off. This chapter maps every piece and marks each claim it has not checked. You write one file and run nothing in any cloud.",
        },
        // CHECK: the Vertex AI rename comes from setup/SPEC.md and was not re-read against Google's docs for this chapter. Every GCP product name in this chapter was copied from capstone/infra/terraform and capstone/docs/design.md. Azure and AWS pages were read on 22 October 2026 on learn.microsoft.com and docs.aws.amazon.com.
        {
          kind: "callout",
          tone: "warn",
          title: "Treat every cell as a lead to confirm",
          text: "The Azure and AWS facts come from Microsoft Learn and the AWS documentation, read on 22 October 2026. The GCP names come from this course's Terraform, checked the same day. Names, preview status and regions change. Vertex AI now sits under Gemini Enterprise Agent Platform, and code still imports `vertexai`. Confirm a name before you quote it.",
        },
        {
          kind: "p",
          text: "Start under the service. What holds everything, and who runs it?",
        },
      ],
    },
    {
      id: "s2-platform",
      title: "Identity, state and cost map one to one, with names you can look up",
      goal: "How do the project, the identity, the keyless deploy, the state, the images and the budget map?",
      blocks: [
        {
          kind: "p",
          text: "Start under the service. On GCP a project holds everything, and each workload has its own service account. Azure uses a subscription with a resource group. AWS uses an account. A workload identity is a managed identity on Azure and an IAM role on AWS. IAM stands for identity and access management.",
        },
        // CHECK: Read on 22 October 2026. Azure: federated identity credentials on an Entra app or a user-assigned managed identity, used with azure/login and a client id, tenant id and subscription id, with audience api://AzureADTokenExchange; the azurerm backend on Blob Storage with use_azuread_auth and use_oidc; Cost Management budgets, evaluated every 24 hours. AWS: an IAM OIDC identity provider at https://token.actions.githubusercontent.com with audience sts.amazonaws.com, a trust policy on the sub claim, and aws-actions/configure-aws-credentials with role-to-assume; the S3 backend with use_lockfile, where dynamodb_table locking is deprecated; AWS Budgets and budget actions. Not read: subscription and resource group scoping, the split between an ECS task role and a task execution role, Azure Container Registry, Amazon ECR.
        {
          kind: "compare",
          caption: "Where things live, who runs them, how CI gets in, where state sits and what a mistake costs.",
          columns: ["Piece", "GCP in course 7", "Azure", "AWS"],
          rows: [
            ["Where everything lives", "A project, with APIs turned on by google_project_service", "A subscription and a resource group", "An account"],
            ["Identity of the running service", "Service account askpep-run", "A managed identity", "An IAM role for the task"],
            [
              "Keyless deploy from GitHub",
              "Workload Identity Federation: pool github, provider askpep-repo",
              "A federated identity credential, used with azure/login",
              "An IAM OIDC identity provider, a role trust policy and aws-actions/configure-aws-credentials",
            ],
            ["Terraform state", "A Cloud Storage bucket", "Blob Storage through the azurerm backend, with use_oidc or use_azuread_auth", "An S3 bucket, with use_lockfile for locking"],
            ["Container images", "Artifact Registry repository askpep", "Azure Container Registry", "Amazon ECR"],
            ["Budget alerts", "A billing budget and a notification channel", "A Cost Management budget", "AWS Budgets, with optional budget actions"],
          ],
        },
        {
          kind: "callout",
          tone: "insight",
          title: "Keyless deploy is the same bargain on all three clouds",
          text: "GitHub signs a token. The cloud checks the issuer and the subject, then grants short-lived access. A policy that accepts any repository lets anyone's workflow deploy. On GCP you pinned the repository. On Azure you pin the subject in a federated credential. On AWS you pin it in the role trust policy.",
        },
        {
          kind: "fold",
          tone: "hood",
          title: "Each cloud expects its own audience",
          text: "Azure expects the audience api://AzureADTokenExchange in the GitHub token. AWS expects sts.amazonaws.com. A wrong audience makes the login fail, and the error rarely names the audience.",
        },
        // CHECK: Microsoft says resources aren't affected and consumption isn't stopped when a budget is exceeded. AWS says budget notifications can be delayed and costs can continue after one, and that a budget action can apply an IAM policy. Both read on 22 October 2026. The clause about GCP budgets comes from the chapter 8 plan row and was not re-read.
        {
          kind: "p",
          text: "Budgets match too, and they share one limit. No cloud's budget stops spend on its own. Microsoft says resources are not affected when a budget is exceeded. AWS says costs can continue after a notification, though a budget action can apply an IAM policy. GCP is the same, so chapter 8 added a kill switch next to the budget.",
        },
        {
          kind: "quiz",
          id: "cloud09-q1",
          question: "A client's Azure budget reaches 100 percent. What happens to the running app?",
          options: [
            "Nothing stops. The budget sends alerts only.",
            "Azure scales the app to zero.",
            "Azure blocks new revisions and keeps the old ones.",
            "Azure deletes the resource group.",
          ],
          answer: 0,
          explain:
            "Microsoft's page says resources aren't affected and consumption isn't stopped. A budget can trigger an automated response, and you build any stop yourself. AWS Budgets can apply an IAM policy through a budget action, but costs can continue after a notification.",
        },
        {
          kind: "p",
          text: "The platform maps. What about the service that runs on top of it?",
        },
      ],
    },
    {
      id: "s3-compute",
      title: "A container service, a job runner and a secret store exist on all three clouds",
      goal: "How do Cloud Run, jobs, revisions and secrets map, and why is the AWS answer not App Runner?",
      blocks: [
        // CHECK: Container Apps: scale to zero except for apps that scale on CPU or memory, and scale rules through KEDA. Read on 22 October 2026 on the Container Apps overview. The 0 to 3 instance range is course 7's own setting. Concurrency 20 has no counterpart cell here because the equivalent Container Apps and ECS settings were not read.
        {
          kind: "p",
          text: "The service is the piece a client asks about first. Cloud Run runs the AskPEP image and scales from 0 to 3 instances. Azure Container Apps does the same job and splits traffic across revisions. Its scale rules come from KEDA, an open source event-driven scaler. An app that scales on CPU or memory cannot scale to zero.",
        },
        // CHECK: AWS App Runner is closed to new customers, and AWS recommends Amazon ECS Express Mode. Read on 22 October 2026 on the App Runner and ECS Express Mode pages. AWS may reopen, rename or retire either, so reread before release.
        {
          kind: "p",
          text: "AWS needs a warning. App Runner was the usual match for Cloud Run, and AWS has closed it to new customers. AWS now recommends the Elastic Container Service in Express Mode, called ECS Express Mode. An older guide will send you to App Runner, and for a new client that answer is wrong.",
        },
        // CHECK: ECS Express Mode takes an image, a task execution role and an infrastructure role, and provisions a Fargate service, an Application Load Balancer and autoscaling, with no extra charge. Read on 22 October 2026. The one-line gloss of Fargate is general knowledge and was not read on a page.
        {
          kind: "p",
          text: "ECS Express Mode takes your image, a task execution role and an infrastructure role. It builds a Fargate service, a load balancer and autoscaling, at no extra charge. Fargate is how AWS runs containers without you managing servers.",
        },
        // CHECK: Read on 22 October 2026. Container Apps jobs: Manual, Schedule and Event triggers; event jobs scale through KEDA. Container Apps revisions, labels and az containerapp ingress traffic set with revision weights that total 100. ECS blue-green: lifecycle hooks and a bake time; traffic shift is managed for services with a load balancer, Service Connect or VPC Lattice. The ECS Express Mode migration guide's weighted Route 53 shifts of 10, 25, 50, 75 and 100. Key Vault references through a managed identity with the Key Vault Secrets User role, and an unversioned reference that re-polls within 30 minutes and restarts active revisions. ECS secrets with valueFrom, injected at task start and not refreshed, with force new deployment. Not read: ECS RunTask for one-off tasks, whether ECS offers canary or linear shifts, AWS Secrets Manager beyond the ECS page, minimum replica settings on Container Apps.
        {
          kind: "compare",
          caption: "The service, the job runner, the traffic steps and the secrets.",
          columns: ["Piece", "GCP in course 7", "Azure", "AWS"],
          rows: [
            [
              "API service",
              "Cloud Run service askpep: 1 vCPU, 1Gi, 0 to 3 instances, startup probe on /health",
              "Azure Container Apps, with scale rules from KEDA",
              "Amazon ECS Express Mode, which provisions a Fargate service, an Application Load Balancer and autoscaling. App Runner is closed to new customers.",
            ],
            ["Run-to-the-end work", "Cloud Run jobs askpep-ingest and askpep-rollout", "Container Apps jobs, with Manual, Schedule or Event triggers", "An ECS task started on demand with RunTask"],
            [
              "Tagged revisions and traffic steps",
              "Revisions tagged sha-<7 hex>, with traffic at 10, 50 and 100",
              "Container Apps revisions, labels and weights set with az containerapp ingress traffic set. The weights total 100.",
              "ECS blue-green with lifecycle hooks and a bake time, or weighted Route 53 DNS in steps such as 10, 25, 50, 75 and 100",
            ],
            [
              "Secrets",
              "Secret Manager. Six secrets reach the service as environment variables, and askpep-run holds the secret accessor role.",
              "A Key Vault secret reference through a managed identity that holds the Key Vault Secrets User role",
              "AWS Secrets Manager, named in the secrets block with valueFrom. The task execution role needs permission.",
            ],
            [
              "When a secret changes",
              "Covered in chapter 4",
              "A reference without a version re-polls within 30 minutes and restarts the active revisions",
              "The value is injected when a task starts and never refreshed. You force a new deployment.",
            ],
          ],
        },
        {
          kind: "p",
          text: "Traffic steps port too. On Cloud Run you tagged a revision and moved 10, 50 and then 100 percent. Container Apps sets a weight on each revision, and the weights must total 100.",
        },
        {
          kind: "p",
          text: "AWS has no single twin. ECS blue-green shifts traffic with lifecycle hooks and a bake time, which is a pause you set before the old version goes.",
        },
        // CHECK: The ECS Express Mode migration guide shows weighted Route 53 DNS shifts at 10, 25, 50, 75 and 100. Read on 22 October 2026. The guide's advice on when to use DNS shifts and when to use ECS blue-green was not read.
        {
          kind: "p",
          text: "The ECS Express Mode migration guide shifts weighted DNS in steps instead. Route 53 is the AWS DNS service, and the guide takes the share from 10 to 25, 50, 75 and then 100 percent.",
        },
        // CHECK: Key Vault references through a managed identity, and ECS secrets named with valueFrom and read by the task execution role. Read on 22 October 2026. AWS Secrets Manager itself was not read beyond the ECS page, and the ECS page also lists other secret sources that this chapter does not cover.
        {
          kind: "p",
          text: "Secrets follow the same pattern. Secret Manager has a counterpart called Key Vault on Azure and AWS Secrets Manager on AWS. Container Apps references a Key Vault secret through a managed identity. ECS names a Secrets Manager value in its task definition and reads it with the task execution role.",
        },
        {
          kind: "quiz",
          id: "cloud09-q2",
          question: "A new AWS client asks for the closest match to a Cloud Run service. What does AWS's own guidance point to?",
          options: ["AWS App Runner", "Amazon ECS Express Mode", "AWS Elastic Beanstalk", "A bare virtual machine behind a load balancer"],
          answer: 1,
          explain:
            "AWS has closed App Runner to new customers and recommends ECS Express Mode. From an image and two roles it builds a Fargate service behind a load balancer. This reflects pages read on 22 October 2026, so reread before you quote it.",
        },
        {
          kind: "quiz",
          id: "cloud09-q3",
          question: "On ECS you rotate a secret in AWS Secrets Manager, and the running tasks still use the old value. What do you do?",
          options: ["Wait 30 minutes for the next poll", "Force a new deployment", "Edit the role trust policy", "Raise the budget action limit"],
          answer: 1,
          explain:
            "ECS injects secret values when a task starts and does not refresh them, so a new deployment starts tasks with the new value. A Key Vault reference on Container Apps behaves differently. Without a version it re-polls within 30 minutes and restarts the active revisions.",
        },
        {
          kind: "p",
          text: "The compute ports by name. Do the database and the model port as easily?",
        },
      ],
    },
    {
      id: "s4-data-ai",
      title: "Postgres ports cleanly, and the AI services port with caveats on status and region",
      goal: "How do Cloud SQL, the model, the screen and the agent host map, and which parts are preview?",
      blocks: [
        {
          kind: "p",
          text: "The data layer ports with one extra step. Cloud SQL runs Postgres 17, and migration 001 creates the pgvector extension. Azure Database for PostgreSQL flexible server needs the extension on an allow-list first. You set `azure.extensions`, and then the same `CREATE EXTENSION` runs. Aurora PostgreSQL takes the statement as it is.",
        },
        {
          kind: "p",
          text: "The AI services map too, under new names. Vertex AI Gemini maps to Microsoft Foundry on Azure and Amazon Bedrock on AWS. Model Armor maps to Prompt Shields and to Bedrock Guardrails. Agent Runtime maps to Foundry Agent Service and to Bedrock AgentCore Runtime.",
        },
        // CHECK: Read on 22 October 2026. Azure Database for PostgreSQL flexible server: allow-list the extension in azure.extensions, then CREATE EXTENSION vector. Aurora PostgreSQL: CREATE EXTENSION IF NOT EXISTS vector, with pgvector 0.5.0 or higher for HNSW indexes, read on the Bedrock Knowledge Bases page and not on an Aurora page. Microsoft Foundry, formerly Azure AI Studio and Azure AI Foundry, where an Azure OpenAI resource can be upgraded to a Foundry resource. Foundry Agent Service with prompt agents and hosted agents. Prompt Shields for user prompt attacks and document attacks. Bedrock AgentCore Runtime with LangGraph and Google ADK. Bedrock Guardrails and its ApplyGuardrail API. Germany West Central as the Frankfurt region, from a search summary of the regions list. Not read: the code germanywestcentral and the code eu-central-1 on a page, which models each region offers on either cloud, RDS for PostgreSQL with pgvector, Azure Monitor and Application Insights, CloudWatch and X-Ray, private database access on a virtual network or a VPC. The Cloud Trace and Cloud Monitoring cells come from course 7 and were not re-read.
        {
          kind: "compare",
          caption: "The database, the network, the model, the screen, the agent host, the region and the traces.",
          columns: ["Piece", "GCP in course 7", "Azure", "AWS"],
          rows: [
            [
              "Relational store with pgvector",
              "Cloud SQL for PostgreSQL 17, private IP, vector extension",
              "Azure Database for PostgreSQL flexible server. Allow-list vector in azure.extensions, then CREATE EXTENSION vector.",
              "Aurora PostgreSQL with CREATE EXTENSION IF NOT EXISTS vector. pgvector 0.5.0 or higher for HNSW indexes.",
            ],
            ["Private network", "A VPC network and subnet with a private services connection", "A virtual network", "A VPC"],
            [
              "Hosted models",
              "Vertex AI Gemini, called in europe-west3",
              "Microsoft Foundry, formerly Azure AI Studio and Azure AI Foundry. An Azure OpenAI resource can be upgraded to a Foundry resource.",
              "Amazon Bedrock",
            ],
            [
              "Prompt and reply screening",
              "A Model Armor template",
              "Prompt Shields in Azure AI Content Safety, for user prompt attacks and document attacks",
              "Bedrock Guardrails, with content filters, denied topics, sensitive information filters and an ApplyGuardrail API that needs no model call",
            ],
            [
              "Hosted agent loop",
              "Agent Runtime",
              "Foundry Agent Service, with prompt agents and hosted agents that run your own container or a framework such as LangGraph",
              "Bedrock AgentCore Runtime, which works with LangGraph and Google ADK and with any model",
            ],
            ["Frankfurt", "europe-west3", "Germany West Central", "Europe (Frankfurt), eu-central-1"],
            ["Traces and dashboards", "Cloud Trace and Cloud Monitoring SLOs", "Azure Monitor and Application Insights", "CloudWatch and X-Ray"],
          ],
        },
        // CHECK: Preview status read on 22 October 2026. Some Foundry Agent Service capabilities are preview. The tool response intervention for agents in Prompt Shields is Preview, and so is spotlighting. The AgentCore page showed no preview label. Preview status changes often, so reread each page before release.
        {
          kind: "p",
          text: "Status needs care on the AI side. Some Foundry agent features are in preview, and so is the tool response check in Prompt Shields. The AgentCore page showed no preview label on 22 October 2026. Treat a preview feature as a risk to name, not a feature to promise.",
        },
        {
          kind: "p",
          text: "Region is a design input, as the region chapter of this course showed. Frankfurt is `europe-west3` on GCP, Germany West Central on Azure and `eu-central-1` on AWS. Each cloud keeps its own table of which models and guards each region offers. Read that table before you promise residency.",
        },
        {
          kind: "widget",
          id: "cloud09-service-matcher",
          intro:
            "Eight cards each name a GCP piece of the AskPEP deploy. Pick the counterpart on the cloud shown. The three tables above hold every answer, so use them if you need to. Watch for one AWS name that an older guide would get wrong.",
        },
        // CHECK: Microsoft Foundry was Azure AI Studio and then Azure AI Foundry, and Azure AI Services became Foundry Tools. Read on 22 October 2026 on the Foundry pages. Names may change again.
        {
          kind: "fold",
          tone: "industry",
          title: "One Azure product, three names in two years",
          text: "Microsoft Foundry was Azure AI Studio and then Azure AI Foundry. Azure AI Services became Foundry Tools. A client's engineers may still use an old name. Ask which product they mean before you compare features.",
        },
        {
          kind: "quiz",
          id: "cloud09-q4",
          question: "On Azure Database for PostgreSQL flexible server, what must happen before CREATE EXTENSION vector works?",
          options: [
            "Add vector to the azure.extensions allow-list",
            "Install the pgvector package on the server over SSH",
            "Create a private endpoint for the database",
            "Nothing. The extension is enabled by default.",
          ],
          answer: 0,
          explain:
            "The server only allows extensions on an allow-list that you set in the azure.extensions parameter. After that the same CREATE EXTENSION statement as migration 001 runs. A managed server gives you no shell, so you cannot install the package yourself.",
        },
        {
          kind: "p",
          text: "Everything so far has a counterpart. Which three pieces need more than one?",
        },
      ],
    },
    {
      id: "s5-shape",
      title: "The queue, the user gate and the kill switch need more than a rename",
      goal: "What changes in each of the three, and what would you test first on a client's cloud?",
      blocks: [
        // CHECK: Read on 22 October 2026: Container Apps event jobs start from a queue such as Service Bus or a Storage queue through KEDA. Not read: how Service Bus and Storage queues deliver and retry, and how Amazon SQS delivers and retries. The statement that a worker pulls from SQS is general knowledge. The Cloud Tasks figures of 3 attempts and a backoff from 10 to 300 seconds come from capstone/infra/terraform and were not re-read against Google's docs.
        {
          kind: "p",
          text: "The queue changes shape. On GCP, Cloud Tasks pushes an HTTP request at `POST /internal/tasks/agent` and signs it with an OpenID Connect token, called an OIDC token, from `askpep-tasks`. Azure queues, such as Service Bus, and Amazon SQS, the Simple Queue Service, hold messages until something pulls them.",
        },
        {
          kind: "p",
          text: "On Azure, a Container Apps event job can start from a queue through KEDA. On AWS, a worker you run polls the queue. Either way you rebuild the retries. Cloud Tasks gave you 3 attempts with a backoff from 10 to 300 seconds.",
        },
        // CHECK: Read on 22 October 2026. Azure built-in authentication, called Easy Auth: providers include Microsoft Entra ID and custom OpenID Connect, it runs as a sidecar, and by default any user in the Entra tenant can request a token unless the app is restricted. AWS: authenticate-oidc and authenticate-cognito on an Application Load Balancer work on HTTPS listeners only, and the app must verify the signature of the x-amzn-oidc-data header. Not read: the headers Easy Auth passes to your code. The iap.py and IAP_AUDIENCE details come from capstone/src/askpep.
        {
          kind: "p",
          text: "The user gate changes shape too. Identity-Aware Proxy, or IAP, checks a Google identity before a request reaches the UI. Your `iap.py` then verifies the token it passes on. Azure's built-in sign-in is called Easy Auth. It runs beside your container and signs users in through a provider such as Microsoft Entra ID.",
        },
        {
          kind: "p",
          text: "Entra is Microsoft's sign-in service, and a tenant is one company's directory of users in it. By default any user in the tenant can ask for a token unless you restrict the app. On AWS the load balancer can run `authenticate-oidc` or `authenticate-cognito`, on HTTPS listeners only. Your code must verify the signature of the `x-amzn-oidc-data` header.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "The default trust boundary is different",
          text: "On GCP the AskPEP Terraform refuses public members and asks you to name people or groups. On Azure the sign-in default is wide: anyone in the client's tenant. Ask the client who should reach AskPEP before you switch authentication on. Then restrict the app to those people.",
        },
        // CHECK: The kill switch commands on Azure and AWS were not read: no Azure CLI page for changing a container app environment variable and no ECS page for updating a service or task definition. The paragraph names the kind of change, not the exact command. The GCP side comes from capstone/src/askpep/killswitch.py and capstone/infra/terraform/ops.tf.
        {
          kind: "p",
          text: "The kill switch is a lever you rewrite. AskPEP reads `KILL_SWITCH` when the process starts. The command `python -m askpep.killswitch actions` patches the live Cloud Run service, so a new revision starts with the flag set. The design ports. The command does not.",
        },
        {
          kind: "p",
          text: "On Azure you would update the container app. On AWS you would update the ECS service or its task definition. Test that command on the client's cloud before you need it. Set the same value in their Terraform too, or the next apply puts the old value back.",
        },
        // CHECK: The Azure and AWS cells repeat the claims checked above: Container Apps event jobs through KEDA; Easy Auth and its tenant default; authenticate-oidc, authenticate-cognito and x-amzn-oidc-data. The kill switch cells name a kind of change and not a command, because the commands were not read.
        {
          kind: "compare",
          caption: "The queue, the user gate and the kill switch on each cloud.",
          columns: ["Duty", "GCP in course 7", "Azure", "AWS"],
          rows: [
            [
              "Queue for the agent task",
              "Cloud Tasks queue askpep-agent pushes HTTP, signed with an OIDC token from askpep-tasks",
              "Service Bus or a Storage queue. Container Apps event jobs scale on them through KEDA.",
              "Amazon SQS and a worker that pulls",
            ],
            [
              "User gate on the UI",
              "IAP with a Google identity. iap.py verifies the token against IAP_AUDIENCE.",
              "Easy Auth with Microsoft Entra ID or custom OpenID Connect. By default any tenant user can request a token.",
              "Load balancer authenticate-oidc or authenticate-cognito on an HTTPS listener. The app verifies x-amzn-oidc-data.",
            ],
            [
              "Kill switch",
              "KILL_SWITCH read at start, set by python -m askpep.killswitch through a Cloud Run patch, and by the kill_switch variable in Terraform",
              "A container app update. The command was not read.",
              "An ECS service or task definition update. The command was not read.",
            ],
          ],
        },
        {
          kind: "widget",
          id: "cloud09-port-sorter",
          intro:
            "Eight pieces of the AskPEP deploy are on the cards. For each one, decide whether a client on Azure or AWS gets it by a rename or needs more than that. Decide before you read the explanation, and notice which pieces you got wrong.",
        },
        {
          kind: "quiz",
          id: "cloud09-q5",
          question: "A client's Container Apps app uses Easy Auth with Microsoft Entra ID, and you restrict nothing. Who can get a token?",
          options: ["Only the people you named", "Any user in the Entra tenant", "Nobody until you assign a role", "Anyone on the internet"],
          answer: 1,
          explain:
            "By default any user in the tenant can request a token unless you restrict the app. That is wider than the course 7 IAP setup, where the Terraform makes you name people or groups. Ask who should have access, then restrict the app to them.",
        },
        {
          kind: "quiz",
          id: "cloud09-q6",
          question: "AskPEP's UI runs behind an AWS load balancer with authenticate-oidc. What must your code still do?",
          options: [
            "Verify the signature of the x-amzn-oidc-data header",
            "Exchange the token for a Google credential",
            "Poll the queue for the user's session",
            "Nothing. The load balancer is the whole gate.",
          ],
          answer: 0,
          explain:
            "The load balancer authenticates the user and passes claims in the x-amzn-oidc-data header, and the app must verify its signature. It is the job iap.py does on GCP. Without that check, a request that reaches the container by another route carries no proof.",
        },
        {
          kind: "p",
          text: "You have the map. How do you answer a client who asks whether you've done it?",
        },
      ],
    },
    {
      id: "s6-honest",
      title: "Say what you have run and what you have mapped, and clients trust the rest",
      goal: "How do you answer a client's cloud questions without claiming work you haven't done?",
      blocks: [
        {
          kind: "p",
          text: "A client will ask whether you have worked on their cloud. If your hands-on work is on GCP, say so. Then say what you have mapped, and how you would test it. That answer is stronger than a claim you cannot back. An engineer who has run the other cloud will find the gap in a minute.",
        },
        {
          kind: "p",
          text: "Use three short parts. Say what you have run, and name the project. Say what you have mapped, using the service names from this chapter. Say what you would test first on their cloud, such as one revision and one secret in a sandbox account.",
        },
        // CHECK: The ideal answer for cloud-q01 in the old bank says the code reads environment variables and Azure app settings fill them. That Azure Function App settings reach the process as environment variables was not read on a page. The Key Vault reference through a managed identity was read for Container Apps on 22 October 2026, not for Functions.
        {
          kind: "callout",
          tone: "interview",
          title: "Configuration across clouds comes up in interviews",
          text: "Configuration across environments comes up in interviews. Answer first: no. The code reads environment variables, and a `.env` file only fills them on a laptop. The platform fills the same variables in the cloud. A secret arrives as a Key Vault reference that a managed identity resolves. Name the settings you would change and the one test you would run.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "Experience on another cloud comes up in interviews",
          text: "Experience on another cloud comes up in interviews. Separate what you have run from what you have mapped. Say your deployed work is on GCP. Then map it: ECS Express Mode for Cloud Run, Secrets Manager for Secret Manager and an IAM OIDC provider for Workload Identity Federation. Say App Runner is closed to new customers. Offer to prove the map in a sandbox account.",
        },
        {
          kind: "p",
          text: "Those answers need a page behind them. What do you write down?",
        },
      ],
    },
    {
      id: "s7-write",
      title: "A one-page map and two honest answers are what you hand over",
      goal: "What goes in `docs/other-clouds.md`?",
      blocks: [
        {
          kind: "p",
          text: "You write one file, `docs/other-clouds.md`, in your own AskPEP workspace. It holds the component map, the three pieces that need more than a rename, and written answers to two interview questions. You run no cloud commands and create nothing in any cloud. This chapter has no lab and no tests.",
        },
        {
          kind: "step",
          id: "cloud09-s01",
          title: "Create the file and add the map",
          text: "Create `docs/other-clouds.md` and add the component map. Take every cell from the tables above. Write unchecked beside any cell you could not confirm.",
          lang: "markdown",
          file: "docs/other-clouds.md",
          code: `# AskPEP on Azure and AWS

Read on 22 October 2026. A cell marked unchecked was not confirmed on a page.

| Piece | GCP | Azure | AWS |
|---|---|---|---|
| Where it lives | project | subscription and resource group | account |
| Service identity | service account askpep-run | managed identity | IAM role |
| Keyless deploy | Workload Identity Federation | federated credential | IAM OIDC provider |
| Terraform state | Cloud Storage bucket | Blob Storage, azurerm backend | S3 bucket, use_lockfile |
| Images | Artifact Registry | Azure Container Registry (unchecked) | Amazon ECR (unchecked) |
| API service | Cloud Run service | Container Apps | ECS Express Mode |
| Run-to-the-end work | Cloud Run jobs | Container Apps jobs | ECS RunTask (unchecked) |
| Secrets | Secret Manager | Key Vault reference | Secrets Manager, valueFrom |
| Database | Cloud SQL, pgvector | PostgreSQL flexible server, azure.extensions | Aurora PostgreSQL |
| Models | Vertex AI Gemini | Microsoft Foundry | Amazon Bedrock |
| Screening | Model Armor | Prompt Shields | Bedrock Guardrails |
| Agent host | Agent Runtime | Foundry Agent Service | Bedrock AgentCore Runtime |
| Budgets | billing budget | Cost Management budget | AWS Budgets |
| Traces | Cloud Trace, Cloud Monitoring | Azure Monitor (unchecked) | CloudWatch (unchecked) |
`,
          expect: "The file has a header row, a divider row and one row for each of fourteen pieces.",
        },
        {
          kind: "step",
          id: "cloud09-s02",
          title: "Add the three pieces that need more than a rename",
          text: "Add one short section for the queue, the user gate and the kill switch. For each, say what GCP does, what the client's cloud does, and the first thing you would test.",
          lang: "markdown",
          file: "docs/other-clouds.md",
          code: `## Three pieces that need more than a rename

Queue. GCP: Cloud Tasks pushes HTTP to /internal/tasks/agent with an OIDC token. Azure: Service Bus or a Storage queue, with event jobs scaling on it through KEDA. AWS: SQS and a worker that pulls. First test: one task end to end, including a retry.

User gate. GCP: IAP, and iap.py verifies the token. Azure: Easy Auth, where any tenant user can get a token until I restrict the app. AWS: authenticate-oidc on the load balancer, and the app verifies x-amzn-oidc-data. First test: a user outside the allowed group is refused.

Kill switch. GCP: python -m askpep.killswitch patches Cloud Run, and the Terraform kill_switch variable must match. Azure and AWS: a container app update, or an ECS service or task definition update. The commands are unchecked. First test: set the flag in a sandbox and confirm that actions are refused.
`,
          expect: "Three short sections, each ending in a first test.",
        },
        {
          kind: "step",
          id: "cloud09-s03",
          title: "Answer the configuration question",
          text: "Write your answer to the question about a .env file locally and app settings in Azure. Start with the answer, which is no.",
          lang: "markdown",
          file: "docs/other-clouds.md",
          code: `## Does the code change between a .env file and Azure app settings?

No. AskPEP reads environment variables, and the .env file only fills them in locally. On Azure the platform fills the same variables, from app settings or from secrets. A secret becomes a Key Vault reference that a managed identity resolves, so the code never holds a key. I change the settings and leave the code alone. I would prove it with one deploy to a sandbox.
`,
          expect: "One answer of about seventy words that starts with no.",
        },
        {
          kind: "step",
          id: "cloud09-s04",
          title: "Answer the AWS question honestly",
          text: "Write your answer to the question about recent AWS work. Say what you have run, then what you have mapped.",
          lang: "markdown",
          file: "docs/other-clouds.md",
          code: `## Have you recently worked with AWS?

My deployed work is on GCP, and I haven't run production on AWS. I can map it. Cloud Run becomes ECS Express Mode, because App Runner is closed to new customers. Secret Manager becomes Secrets Manager. Workload Identity Federation becomes an IAM OIDC provider. I would prove that map in a sandbox account before I promised you anything.
`,
          expect: "One answer that separates what you ran from what you mapped.",
        },
        {
          kind: "step",
          id: "cloud09-s05",
          title: "Check the file against the tables",
          text: "Count the table rows in your file. Then read the file once against the tables above and confirm that every cell you could not confirm says unchecked.",
          lang: "bash",
          code: `grep -c "^|" docs/other-clouds.md`,
          expect: "16: one header row, one divider row and fourteen pieces.",
        },
        {
          kind: "p",
          text: "You have written the general map. What did AskPEP's team send the group on Azure?",
        },
      ],
    },
    {
      id: "s8-port-map",
      title: "AskPEP's port map promised nothing, because a new model needs a new gate",
      goal: "What goes in a port map for one real request, and which results don't carry over?",
      blocks: [
        {
          kind: "p",
          text: "A port map for one request names what changes, what was run, and which past results stop counting. The last part is the one people forget. A result depends on the model and the guard it was measured on.",
        },
        {
          kind: "p",
          text: "Here is what the team sent the group on Azure. The group, the date and every quoted remark are invented. The Azure names come from the tables above, read on 22 October 2026.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "You took the fourteen rows of `docs/other-clouds.md` and cut them to the nine that decide the cost of a port.",
            "The product owner said, \"Answer them, but promise nothing until the third team is live.\" So the map has no date in it.",
            "The security reviewer read the guard row and said, \"Prompt Shields isn't Model Armor. Our zero out of 25 doesn't travel.\" You added a line saying so.",
            "The gate result on commit `3c91e2b` was measured on Gemini. A port to Azure would use a model from Foundry, so the model changes and all 104 questions must run again.",
            "You marked ADR 0009 in the user gate row. Easy Auth would stop the build tool too, for the same reason IAP did.",
          ],
        },
        {
          kind: "code",
          lang: "text",
          code: `# PORT-MAP-001  Thursday 7 January 2027
For: a group on Azure, through the product owner.
Status: a map from documents. Nothing has run on Azure. No date is promised.

Piece          Here                 On Azure                  Work
Service        Cloud Run            Container Apps            rename
Database       Cloud SQL            PostgreSQL flexible       allow-list vector
Secrets        Secret Manager       Key Vault                 rename
Keyless CI     Workload Identity    Federated credential      rename
Model          Gemini, location eu  A Foundry model, unchosen new gate run
Guard          Model Armor          Prompt Shields            new attack run
Queue          Cloud Tasks          Service Bus, event job    rebuild retries
User gate      none on production   Easy Auth                 build tool needs a path
Kill switch    killswitch.py        container app update      rewrite and test

Results that do not carry over
Gate on 3c91e2b: 104 questions, measured on Gemini.
Attack set 0/25: measured on Model Armor.
Model Armor p95 1,140 ms and every latency figure.

First test on Azure: one revision, one secret and one queued job in a sandbox.`,
          caption: "The port map the team sent. The GCP column is the course's. The Azure column is read from documents and has not been run.",
        },
        {
          kind: "p",
          text: "Read the Work column first. Three rows say rename. The rows that cost real time are the model, the guard and the queue.",
        },
        {
          kind: "p",
          text: "Then read the results that do not carry over. They are why this map names no date. Anyone who quotes AskPEP's scores to that group would be quoting a different system.",
        },
        {
          kind: "code",
          lang: "text",
          code: `# PORT-MAP-<number>  <date>
For:
Status, and what has run:

Piece    Here    On their cloud    Work

Results that do not carry over:

First test on their cloud:`,
          caption: "For your next port request: fill in the Work column before anyone asks for a date.",
        },
        {
          kind: "p",
          text: "The map has gone out, and the drills are done. Tomorrow the launch review sits. Are all four conditions true, and does the third team join on Monday?",
        },
      ],
    },
  ],
  recap: [
    "The AskPEP design should port to Azure and AWS, but nobody has run the mapping.",
    "Most pieces need only a rename, such as Container Apps for Cloud Run and Key Vault for Secret Manager.",
    "AWS has closed App Runner to new customers, so ECS Express Mode is the AWS match for Cloud Run.",
    "Three pieces need more than a rename: the queue, the user gate and the kill switch.",
    "No cloud's budget stops spend by itself, so you build the stop yourself.",
    "Say what you have run and what you have only mapped, and offer to prove the map in a sandbox account.",
    "AskPEP's port map promised no date, because a new model and a new guard void the gate's results.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. I can map an AI deployment onto another cloud and say which of my results stop counting.",
  interviewIds: ["cloud-q01", "cloud-q11", "cloud-q12", "cloud-q37"],
};

export default chapter;
