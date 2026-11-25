import type { Chapter } from "../types";

const chapter: Chapter = {
  id: "design-04-an-enterprise-copilot",
  course: "design",
  number: 4,
  title: "An enterprise copilot is only as safe as its index record",
  tagline: "How do 1,200 staff search three systems when each may see something different? The index record carries the permission, the query enforces it, and a sync plan keeps it true.",
  minutes: 50,
  objectives: [
    "Sketch the components of a copilot over three enterprise sources and say where each one fails.",
    "Design an index record that carries the tenant, the allowed principals and a link back to the source.",
    "Place permission trimming inside the query and add a source check on the top results.",
    "Plan sync for each source from a freshness budget, with deletes and lost notifications covered.",
    "Choose a rollout order and the evidence that lets each department go live.",
    "Fill in the design sheet for the copilot and add two rows to the ledger.",
  ],
  sections: [
    {
      id: "s1-requirements",
      title: "Four requirements decide this design: tenants, sources, permissions and freshness",
      goal: "Which questions fork this design, and which part is really hard?",
      blocks: [
        {
          kind: "p",
          text: "How do 1,200 staff search three systems when each may see something different? A copilot over company data is a retrieval system with two extra constraints. Every answer must respect who is asking. Every source keeps changing while you watch.",
        },
        {
          kind: "p",
          text: "Chapter ten of the RAG course covers freshness and access control for retrieval. This chapter designs the whole system, the way you would on a whiteboard, using the seven steps from chapter one.",
        },
        {
          kind: "p",
          text: "Harbour Supplies has 1,200 staff and wants one assistant over three systems. SharePoint holds price lists, supplier contracts and procedures. Teams holds the operations channels where problems get solved. ServiceNow holds incident tickets and the knowledge base. The assistant should also raise a ticket when the user asks.",
        },
        {
          kind: "p",
          text: "The copilot itself runs on Google Cloud, like the rest of Harbour's software. The three sources do not. SharePoint and Teams live in Harbour's Microsoft 365 tenant, the company's own account with its own users and groups. ServiceNow is a separate hosted service. The copilot must reach all three from outside and prove who is asking.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "How many tenants are there? Harbour has one Microsoft 365 tenant. Its Irish subsidiary has a second, with its own users and its own data rules.",
            "Which sources, and who owns each? Three here. Each one has a different idea of who may read an item.",
            "What is the freshness budget for each source? A price list can lag. A support channel cannot.",
            "What does a leaked document cost? For contracts and HR files, it costs more than a wrong answer ever will.",
          ],
        },
        {
          kind: "p",
          text: "When the interviewer shrugs, state your assumptions aloud. Say that you assume one tenant for the pilot and a second for the Irish subsidiary later. Say that the copilot may read everything and write only a ticket, and only after the user confirms. Stated assumptions are a strength. Silent ones are the trap.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "Sizing with stated assumptions. Every figure is illustrative.",
          code: `USERS     1,200 staff x 40% active          = 480 users a day
          480 x 6 questions                 = 2,880 questions a day
LOAD      2,880 / 28,800 s (8 h)            = 0.1 per second average
          peak at 10x                       = about 1 per second

CHUNKS    SharePoint 150,000 files x 12     = 1,800,000
          Teams 400,000 threads x 1         =   400,000
          ServiceNow 120,000 tickets x 2    =   240,000
          total                             = 2,440,000

VECTORS   2,440,000 x 4,096 B (1,024 dims)  = about 10 GB

TOKENS    6 chunks x 500 + 1,000 prompt     = 4,000 per question
          2,880 x 4,000                     = 11,520,000 a day`,
        },
        {
          kind: "p",
          text: "Say what the numbers mean. One query per second at peak and 10 gigabytes of vectors fit one modest node. Scale is not the hard part. The hard parts are permissions and freshness, so that is where the next forty minutes go.",
        },
        {
          kind: "quiz",
          id: "design04-q1",
          question: "Sizing shows a peak of one query per second and 10 gigabytes of vectors. What do you conclude?",
          options: [
            "Scale is small, so spend the design time on permissions and freshness.",
            "Split the index across several nodes to be safe.",
            "Skip permissions in the first release, because the load is low.",
            "Use a larger model, since the traffic is light.",
          ],
          answer: 0,
          explain: "The numbers rule out a scaling problem. They say nothing that lets you relax on access control, which is the risk that matters.",
        },
        { kind: "p", text: "The hard part is who may read what. The next section designs the one record that has to carry that answer." },
      ],
    },
    {
      id: "s2-components",
      title: "The copilot is six components, and the index record is where the enterprise constraints live",
      goal: "Which six parts are there, and what must the index record hold?",
      blocks: [
        {
          kind: "compare",
          caption: "Six components, each with its own way to fail. The first three are specific to an enterprise copilot.",
          columns: ["Component", "Its job", "How it fails"],
          rows: [
            ["Connectors", "Read SharePoint, Teams and ServiceNow and write chunks with their permissions", "Miss a change, or never see a delete"],
            ["Identity resolver", "Turn the sign-in token into a user id, a tenant and a group set", "Return a stale or partial group list"],
            ["Permission-trimmed index", "Store chunks with tenant and allowed principals, and filter on them", "Hold a permission that is no longer true"],
            ["Retrieval and rerank", "Return the best permitted chunks for the question", "Starve a user with a narrow view"],
            ["Answer with citations", "Write the answer from those chunks and link each claim to its source", "Cite something the user cannot open"],
            ["Ticket action", "Raise a ServiceNow ticket after the user confirms", "Act twice, or act as the wrong person"],
          ],
        },
        {
          kind: "p",
          text: "The connectors call **Microsoft Graph**, which is Microsoft's API for SharePoint and Teams. They use application permissions, which means the connector acts as the app itself and sees every item in the tenant. That is why the index must enforce access.",
        },
        {
          kind: "p",
          text: "The source never gets a chance to refuse, because the copilot has already copied the text. This course does not teach the Graph calls. The design needs only that consequence.",
        },
        {
          kind: "code",
          lang: "ts",
          caption: "The index record. Each field exists because a later decision needs it.",
          code: `type ChunkRecord = {
  id: string;
  tenantId: string;      // set by the connector, never by the client
  source: "sharepoint" | "teams" | "servicenow";
  sourceItemId: string;  // for the live check and for deletes
  url: string;           // for the citation
  allow: string[];       // user and group ids, not expanded
  coarse: string;        // library, channel or assignment group
  deleted: boolean;      // tombstone
  sourceVersion: string; // etag from the source
  syncedAt: string;
  text: string;
  vector: number[];
};`,
        },
        {
          kind: "p",
          text: "Look at the fields that are not about text. The tenant keeps two companies apart. The allow list answers who may read. The item id and URL let you ask the source again and cite it. The tombstone, from course one, hides a deleted item before the slow cleanup runs.",
        },
        {
          kind: "p",
          text: "Citations and actions come from the same record. A citation links to the URL, so the user can open the source and check the claim. If the source refuses them, the citation fails visibly and the copilot has hidden nothing. The ticket action runs as the signed-in user, so ServiceNow records who asked.",
        },
        {
          kind: "quiz",
          id: "design04-q2",
          question: "The connectors read with application permissions. What follows for the design?",
          options: [
            "The source will refuse unauthorised reads, so the index needs no access control.",
            "The index holds text the source would hide from some users, so the index must enforce access itself.",
            "Users must be given application permissions too.",
            "The copilot can only answer for administrators.",
          ],
          answer: 1,
          explain: "An application identity sees everything. Once the text is copied into the index, the source is no longer in the path, so the index record has to carry the permission.",
        },
        { kind: "p", text: "The record now carries the permission. The next section decides where that permission is enforced." },
      ],
    },
    {
      id: "s3-trim",
      title: "Permission trimming belongs inside the query, with a source check on the top results",
      goal: "Where does the permission check sit, so that nothing can bypass it?",
      blocks: [
        {
          kind: "p",
          text: "Store the principals exactly as the source lists them: user ids and group ids, unexpanded. At query time, resolve the caller's own set. A user in 60 groups produces a filter of 61 ids, the user id plus the groups. Chunks match when their allow list overlaps that set.",
        },
        {
          kind: "p",
          text: "This choice has a payoff. When someone joins or leaves a group, you re-index nothing, because the group set is resolved fresh on every request. Only a change to an item's own permissions touches its chunks. Expanding groups into users at index time would turn every membership change into a mass rewrite.",
        },
        {
          kind: "code",
          lang: "text",
          caption: "The filter every query carries. The tenant and the principals come from the verified token, never from the request body.",
          code: `tenantId == caller.tenantId
AND deleted == false
AND allow overlaps [caller.userId, ...caller.groupIds]`,
        },
        // CHECKED 17 Oct 2026: https://learn.microsoft.com/en-us/security/zero-trust/develop/configure-tokens-group-claims-app-roles
        {
          kind: "p",
          text: "A token cannot always carry the group list. Entra is Microsoft's identity service, and it issues the signed sign-in tokens. It puts at most 200 groups in a JWT and 150 in a SAML token, which are two token formats.",
        },
        {
          kind: "p",
          text: "Above that it sends an overage marker and no list, so the resolver must call Microsoft Graph for the user's memberships.",
        },
        {
          kind: "p",
          text: "Three permission shapes do not fit a list of principals. Sharing links open an item to anyone holding the link. Deny rules remove access from a group that otherwise has it. ServiceNow access rules can be scripts. For these, index a coarse field such as the library or assignment group and let the source check decide.",
        },
        {
          kind: "widget",
          id: "design-permission-trim",
          intro: "Four cases. In each, choose where the permission check sits and read what reached the model. Watch for the cases where the index itself is wrong, because filtering against a stale index still leaks.",
        },
        {
          kind: "p",
          text: "The widget shows two layers. The filter inside the query is cheap and keeps results full. The source check on the top results closes the gap while the index catches up. Together they cost one batched call per question, which is the price of being right during the sync window.",
        },
        {
          kind: "p",
          text: "Caches repeat the same risk. An answer cache keyed on the question alone serves one user's answer to the next. Key it on the question plus a hash of the caller's principals, or do not cache answers at all. Cache retrieval results with the same key.",
        },
        {
          kind: "callout",
          tone: "interview",
          title: "How do you stop the copilot quoting a document the user cannot open?",
          text: "Open with the answer. The filter sits inside the retrieval query and is built from the verified token. The top results are checked against the source before the model reads them. Then name the failures. Interviewers push on stale permissions, narrow users who get empty answers, and caches keyed without the caller's scope.",
        },
        {
          kind: "quiz",
          id: "design04-q3",
          question: "Why store group ids on a chunk instead of expanding each group into its members?",
          options: [
            "Group ids take less space than user ids, and space is the only concern.",
            "Sources do not publish group members.",
            "Expanded lists cannot be filtered in a vector index.",
            "A membership change then needs no re-index, because the caller's groups are resolved on every request.",
          ],
          answer: 3,
          explain: "Membership churns more often than documents change. Resolving the caller's groups at query time keeps that churn off the index.",
        },
        { kind: "p", text: "Enforcement is only as good as the record it reads. The next section keeps the record true." },
      ],
    },
    {
      id: "s4-freshness",
      title: "Freshness is a budget per source, and the sync plan is the cheapest one that meets it",
      goal: "How do you turn a freshness budget into a sync plan?",
      blocks: [
        {
          kind: "p",
          text: "Staleness is the sum of every delay between a change and its being searchable. Take SharePoint polled every 15 minutes. Add 3 minutes in the embedding queue and 1 minute for the index to refresh. The worst case is 19 minutes. Against a 30 minute budget, that passes.",
        },
        {
          kind: "p",
          text: "Set the budget per source, because the cost of a stale answer differs. A price list can lag half an hour. A Teams thread about a depot closure cannot. Then pick the cheapest mechanism that meets the budget. Webhooks are faster, and they are also more to run.",
        },
        {
          kind: "list",
          items: [
            "Microsoft Graph's `delta` function returns only what changed since the last token. This course calls that a change query. It also reports deletions, which a crawl cannot see cheaply.",
            "A drive item notification tells you that something changed. It carries no content, so you follow it with a change read.",
            "A notification can be lost. Run a full reconcile on a schedule to repair what it missed.",
            "A deleted item gets a tombstone the moment you learn of it. The hard delete follows later.",
          ],
        },
        // CHECKED 17 Oct 2026: https://learn.microsoft.com/en-us/graph/api/resources/subscription (lifetimes), https://learn.microsoft.com/en-us/graph/teams-changenotifications-chatmessage (tenant-wide channel messages), https://learn.microsoft.com/en-us/graph/metered-api-list (Teams APIs not metered since 25 Aug 2025)
        {
          kind: "p",
          text: "You only need the shape of the Graph calls behind these rules: a signal, a read, and a repair loop. Subscriptions expire, so renew them. A drive item subscription lasts under 30 days.",
        },
        {
          kind: "p",
          text: "A Teams message subscription lasts 3 days, and needs a second address, called a lifecycle URL, to hear about removal. Teams message notifications can carry the message, encrypted.",
        },
        {
          kind: "p",
          text: "The reconcile has a price too. Reading every Teams thread nightly means 400,000 threads in pages of 100, which is 4,000 requests. That is small beside polling 300 Teams channels every 2 minutes, which costs 216,000 requests a day. The reconcile is what makes a signal-driven plan safe.",
        },
        {
          kind: "widget",
          id: "design-connector-plan",
          intro: "Plan the sync for SharePoint, Teams and ServiceNow in turn. Each has a freshness budget and a size. Pick the cheapest plan that meets the budget and cannot drift, and check the request count against the alternatives.",
        },
        {
          kind: "callout",
          tone: "warn",
          title: "A plan that meets the freshness budget can still leak",
          text: "In the widget, the 5 minute polling plan for ServiceNow met its budget. It still left deleted tickets searchable. Freshness covers edits. Deletes and permission changes need their own path, with a tombstone and a source check.",
        },
        {
          kind: "quiz",
          id: "design04-q4",
          question: "Teams has a 5 minute budget over 300 channels. Why do notifications beat a 2 minute change poll?",
          options: [
            "Notifications are always more accurate than a poll.",
            "The poll costs about 216,000 requests a day just to ask, and notifications do work only when a message arrives.",
            "A poll cannot read Teams at all.",
            "Notifications remove the need for any reconcile.",
          ],
          answer: 1,
          explain: "300 channels polled 720 times a day is 216,000 requests, most of them empty. Notifications trigger the read on demand. A nightly reconcile still repairs lost ones.",
        },
        {
          kind: "quiz",
          id: "design04-q5",
          question: "A notification arrives for a changed file. What should the connector do?",
          options: [
            "Index the notification body as the new text.",
            "Ignore it until the nightly crawl.",
            "Run a change read to fetch what changed, and rely on a scheduled reconcile for anything missed.",
            "Delete the file from the index.",
          ],
          answer: 2,
          explain: "A notification is a signal with no content. The change read fetches the change, and the reconcile covers the notifications that never arrive.",
        },
        { kind: "p", text: "You have permissions and a sync plan. The next section names what still goes wrong, and uses it to set the rollout." },
      ],
    },
    {
      id: "s5-failures",
      title: "Four failure modes set the rollout: leaks, stale answers, tenant bleed and wide queries",
      goal: "Which failures set the rollout, and in what order do departments join?",
      blocks: [
        {
          kind: "compare",
          caption: "Each failure has a control that prevents it and a measure that proves the control works.",
          columns: ["Failure", "How it happens", "Control", "Measure"],
          rows: [
            ["Permission leak", "Stale allow list, or a filter that is skipped", "Query filter plus a source check on the top results", "Leaks on a permission test set, target zero"],
            ["Stale answer", "Sync lag, a lost notification or a missed delete", "Per-source budget, reconcile, tombstones", "Median and worst staleness per source"],
            ["Cross-tenant bleed", "Tenant read from the request, or a shared 'everyone' principal", "Tenant from the token, or one index per tenant", "Cross-tenant tests, target zero"],
            ["Cost on wide queries", "A broad question pulls dozens of chunks", "Cap on chunks and tokens per question, budget per user", "Tokens per question, 95th percentile"],
          ],
        },
        {
          kind: "p",
          text: "Wide queries are the quiet one. A user asks for everything about a customer, and the retriever returns 40 chunks. At 500 tokens each, that is 20,000 tokens plus the 1,000 token prompt, or 21,000. The normal question costs 4,000. One wide question costs more than five normal ones.",
        },
        {
          kind: "p",
          text: "Cap the chunks per question. Offer a summary pass for broad requests instead of stuffing the window. Count tokens per user per day and stop at a budget.",
        },
        {
          kind: "p",
          text: "Roll out by department, and let evidence open each gate. Phase one is Procurement, 60 people, with SharePoint only. Phase two adds Operations and Teams. Phase three adds ServiceNow and ticket actions across the company. Ticket actions come last because they are the only part that writes.",
        },
        {
          kind: "list",
          items: [
            "Build a permission test set: 300 user and document pairs, with the expected allow or deny for each. Any leak blocks the phase.",
            "Measure citation precision on a golden set. Every cited chunk must support its claim.",
            "Track staleness per source against its budget during the phase.",
            "Run a cross-tenant test before the Irish users join. One leak stops the launch.",
          ],
        },
        {
          kind: "callout",
          tone: "interview",
          title: "What would you show the security team before launch?",
          text: "Open with the answer: a permission test set with zero leaks, the tenant boundary tested from both sides, and the source check described in plain words. Interviewers then ask what happens when the source check is down. Say you fail closed and show fewer results.",
        },
        {
          kind: "quiz",
          id: "design04-q6",
          question: "Which order of phases is best for Harbour?",
          options: [
            "Everyone at once, with ticket actions, to get feedback fast.",
            "Procurement with SharePoint only, then Operations with Teams, then everyone with ServiceNow and ticket actions.",
            "Ticket actions first, because they save the most time.",
            "The Irish tenant first, because it is smallest.",
          ],
          answer: 1,
          explain: "Each phase adds one source or one risk, and each gate is a measured result. Writing comes last because a bad write is harder to undo than a bad answer.",
        },
        { kind: "p", text: "Every step now has an answer. The last section puts the design on one page." },
      ],
    },
    {
      id: "s6-design-sheet",
      title: "The copilot design fits on one page and adds two ledger rows",
      goal: "What does the finished copilot design look like?",
      blocks: [
        { kind: "p", text: "This sheet has a line the others lack, which is the freshness budget per source. The index record stays in its own block above, because a reader needs its fields in full. Two decisions go into the ledger, since this design buys safety twice." },
        { kind: "code", lang: "text", caption: "The finished copilot design, read with the index record from the components section.", code: "DESIGN SHEET: enterprise copilot for the Harbour group\nPrompt              One assistant over SharePoint, Teams and ServiceNow\n\n1 Users and volumes 1,200 staff, 480 active a day, 2,880 questions a day\n                    About 1 question a second at peak\n                    2,440,000 chunks, about 10 GB of vectors\n2 Non-functionals   Zero permission leaks. Zero cross-tenant leaks\n                    Freshness: SharePoint 30 min, Teams 5 min, ServiceNow 10 min\n                    Writes only a ticket, after the user confirms\n3 Components        Connectors, identity resolver, permission-trimmed index\n                    Retrieval and rerank, answer with citations, ticket action\n4 Data flow         Token gives user, tenant and groups\n                    Query filters on tenant, deleted and allow list\n                    Source check on the top results. Answer with citations\nSync                SharePoint: change query every 15 minutes\n                    Teams: notification, then change read, nightly reconcile\n                    ServiceNow: poll every 5 minutes, read the deletion log\nCost                4,000 tokens a question, 11,520,000 tokens a day\n5 Failure modes     Permission leak: query filter plus source check\n                    Stale answer: budgets, reconcile, tombstones\n                    Tenant bleed: tenant from the token, one index per tenant\n                    Wide query: cap chunks and tokens, budget per user\n6 Evals             300 user and document pairs, target zero leaks\n                    Citation precision on a golden set\n                    Worst staleness per source against its budget\n7 Rollout           Phase one: Procurement, SharePoint only\n                    Phase two: Operations and Teams\n                    Phase three: ServiceNow and ticket actions, company-wide\n                    Cross-tenant test before the Irish users join\n\nLedger, new rows\nDecision                        Gave up                        Revisit when\nTrim permissions at query time  Latency: one lookup per query  95th percentile latency\n                                                               passes 3 seconds\nIndex per tenant                Cost: storage and sync         Tenants pass 20\n                                multiply by tenants" },
        { kind: "p", text: "Read it out like this. Scale is small, at about one question a second, so the design spends its effort on permissions and freshness. Every chunk carries its tenant and its allow list, and the filter sits inside the query, built from the verified token." },
        { kind: "p", text: "Then close the gaps. A source check on the top results covers the time before sync catches up. If that check is down, I fail closed and show fewer results. Each source has a freshness budget, and tickets join last because they are the only write." },
        { kind: "code", lang: "text", caption: "For your next copilot. One block per source, then the record.", code: "Source             ____  (system, owner and item count)\nWho may read       ____  (how the source lists it, and any shape a list can't hold)\nFreshness budget   ____  (minutes, set by the cost of a stale answer)\nSync mechanism     ____  (poll, notification or both)\nDeletes            ____  (how you learn, and when the tombstone lands)\nRepair             ____  (the reconcile, and how often)\nRecord fields      ____  (tenant, allow list, source id, URL, tombstone, version)" },
        { kind: "p", text: "The copilot returns passages of text, and a person reads them. Chapter five changes the output. What changes when the answer is a number computed from tables?" },
      ],
    },
  ],
  recap: [
    "Sizing shows scale is small, so permissions and freshness carry the design.",
    "The index record holds the tenant, the unexpanded allow list, a link to the source and a tombstone.",
    "The permission filter sits inside the query, and the top results are checked against the source.",
    "Freshness is a budget per source, and the cheapest plan that meets it and cannot drift wins.",
    "Leaks, stale answers, tenant bleed and wide queries each get a control and a measure, and evidence opens each department.",
    "The finished sheet adds a freshness budget per source, and the ledger gains two rows on trimming and tenants.",
  ],
  reinforcement:
    "I am becoming a forward-deployed AI engineer. In the enterprise copilot I learned that the index record carries the permission, the query enforces it, and a source check closes the sync gap. When this shows up in our work, add one line starting TIL that names the idea and how it applied.",
  interviewIds: ["design-q07", "design-q08"],
};

export default chapter;
