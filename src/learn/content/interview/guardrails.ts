import type { InterviewQuestion } from "../types";

const questions: InterviewQuestion[] = [
  // real Q3
  {
    id: "guardrails-q01",
    course: "guardrails",
    category: "guardrails",
    level: "core",
    chapterId: "guardrails-01-layers-on-askpep",
    source: "asked",
    question: "What kinds of guardrails have you used? Walk me through them in depth.",
    idealAnswer:
      "I think in four stages, because no single check catches everything. In AskPEP, the PEP desk I built in this course, each stage has its own guard. On input, an injection guard reads the question before any model runs. On retrieved text, the desk screens every passage a tool returns and marks it as data. On tool calls, one function checks the caller's role and screens the arguments before a tool runs. Opening a ticket needs the staff role and then a person's approval. On output, a validator checks that every citation points at a retrieved source, and a redactor removes secrets and card numbers. Around those sit an audit row for every verdict and a kill switch for the actions. All of it is code outside the model, and it fails closed. I test each guard on labelled data and measure both error types, because a check that blocks good requests has a real cost. The trade-off is latency and friction against risk. Guardrails reduce hallucination risk but do not remove it. The fallback when a check fails is a safe refusal or a route to a human reviewer. I would say which parts I built myself and which my team owned.",
    keywords: ["four stages", "input guard", "retrieved text", "tool call check", "output validation", "fail closed", "audit event", "false positives", "safe refusal"],
    followUps: [
      "Which layer catches the most real problems, and how would you know?",
      "Where would you not use an LLM as a guardrail?",
      "How do you test a guardrail before you ship it?",
    ],
  },
  {
    id: "guardrails-q02",
    course: "guardrails",
    category: "guardrails",
    level: "core",
    chapterId: "guardrails-04-model-armor-and-classifiers",
    question: "Your guardrail blocks too many legitimate requests. What do you do?",
    idealAnswer:
      "First I measure, because complaints are not a rate. I take a labelled sample of blocked requests and count how many were legitimate. That gives me the false positive rate, and I compare it with the miss rate on real attacks, since the two trade against each other. Then I find which rule or classifier produced the blocks and read a slice of them. Often one rule causes most of the damage. For example, a keyword rule blocks every question with the word ignore, even one about a type checker comment. I fix the cause before I touch the threshold. Options in order are narrowing the rule and adding context such as the user's role. Next is moving a hard block to a soft one that routes to review. Only then do I move the classifier threshold. Every change goes against the labelled set, including the attack cases, so I do not fix the false positives by opening a hole. The trade-off is user friction against exposure, and it depends on the cost of each error. My fallback for a borderline score is human review rather than silent blocking. Finally, I add the wrongly blocked cases to the regression set.",
    keywords: ["false positive rate", "labelled sample", "threshold", "root cause rule", "soft block", "human review", "regression set", "miss rate"],
    followUps: [
      "How do you choose an acceptable false positive rate?",
      "What if the blocked users are your most valuable customers?",
      "How would you monitor this after you change the threshold?",
    ],
  },
  // real Q37
  {
    id: "guardrails-q03",
    course: "guardrails",
    category: "injection",
    level: "deep",
    chapterId: "guardrails-03-prompt-injection",
    source: "practice",
    question: "How do you defend against prompt injection in retrieved documents or tool output?",
    idealAnswer:
      "I start from one assumption: the model cannot reliably tell data from instructions, so retrieved text and tool output are untrusted. Telling the model to ignore malicious instructions is not protection, because a rephrased attack can defeat it. The real defence is limiting what an injected instruction could do. Tools use allowlists and typed arguments, so a planted sentence cannot invent a recipient or an amount. Credentials are least privilege. Authorisation is enforced in code outside the model. I avoid putting private data, untrusted input and an outbound channel in one agent, because that combination is how data leaks. Consequential actions, such as an email to a supplier, need human approval showing the exact arguments. I also separate instructions from evidence with clear delimiters and validate outputs. For example, I reject an answer that contains a URL or an address that was not in the approved set. Then I test it the way an attacker would, with direct and indirect injection cases in the golden set, and rerun them on every release. The trade-off is capability against safety. The fallback is to disable the risky tool and keep read-only answers.",
    keywords: ["untrusted data", "indirect injection", "least privilege", "typed arguments", "authorisation outside the model", "approval", "output validation", "red team cases"],
    followUps: [
      "Why is a delimiter not enough on its own?",
      "What is the lethal combination in an agent's design?",
      "How would you test for injection continuously?",
    ],
  },
  {
    id: "guardrails-q04",
    course: "guardrails",
    category: "injection",
    level: "senior",
    chapterId: "guardrails-03-prompt-injection",
    question: "An agent reads email and can send email. What worries you?",
    idealAnswer:
      "That is the classic lethal combination: untrusted input, access to private data and an outbound channel in one agent. Anyone who can email the agent can plant an instruction in a message. The agent may follow it, for example by forwarding invoices or bank details to an outside address. The attacker never needs to log in. So my first answer is to break the combination. The reading agent gets no send tool, or the sending tool is limited to a fixed allowlist of recipients and a template. If it must send, the recipient and body are typed arguments checked in code, and the send needs human approval that shows the exact message. I would also look at the sender identity, and whether the agent can read mailboxes it should not. Logging matters: every send is in the audit record with the run id and the message that triggered it. The metrics I watch are blocked sends, approval rejections and sends to new domains. The trade-off is that approval slows down legitimate sends. The fallback is a per-tool kill switch that turns off outbound mail while read access continues.",
    keywords: ["lethal combination", "untrusted input", "outbound channel", "recipient allowlist", "approval", "typed arguments", "data exfiltration", "kill switch"],
    followUps: [
      "Could you still make this agent useful if it had no send tool?",
      "How would an attacker try to bypass the recipient allowlist?",
      "What do you log to investigate a suspected leak?",
    ],
  },
  // real Q38
  {
    id: "guardrails-q05",
    course: "guardrails",
    category: "privacy",
    level: "deep",
    chapterId: "guardrails-05-authorisation-and-pii",
    source: "practice",
    question: "How do you protect PII and enforce authorisation in a RAG system?",
    idealAnswer:
      "Authorisation first, because it is the one the model must never decide. In AskPEP the role comes from the API key. A table maps each key to a user and a role, and nothing in the request body can change it. One function that every tool call passes through looks up the lowest role each tool needs and writes an audit row for the decision. A tool missing from the table is denied to everyone, so a mistake fails closed. I test it with a scripted model that asks for a forbidden tool. The AskPEP corpus is public. A system with several tenants would also need document permissions inside the retrieval query, so forbidden chunks never reach the model. For PII, I redact before anything is stored or shown. A rule-based redactor finds secrets, card numbers that pass the Luhn check, emails and phone numbers. It runs as an output guard and on the audit row. The trade-off is that rules miss names and addresses, and they over-match some numbers, so I measure both on a labelled sample. The fallback for an uncertain case is to drop the field.",
    keywords: ["role from the API key", "policy table", "fails closed", "audit row", "redaction", "Luhn check", "retrieval filter", "labelled sample"],
    followUps: [
      "Where exactly in the pipeline does the permission filter sit, and why?",
      "How do you handle a deletion request for one person's data?",
      "What happens to PII that the user types into the question?",
    ],
  },
  // real Q36
  {
    id: "guardrails-q06",
    course: "guardrails",
    category: "privacy",
    level: "deep",
    chapterId: "guardrails-05-authorisation-and-pii",
    source: "practice",
    question: "How do you monitor quality without storing sensitive prompts or documents?",
    idealAnswer:
      "I minimise what I collect, then monitor on metadata. The AskPEP audit row is my model. It stores who asked, which guard ran, at which stage, the verdict, the reason and the length of the text. It never stores the text. Any free text that does reach a row goes through a redactor first. I would be honest about the gaps. A hash of a phone number protects little, because a phone number has few possible values and an attacker can hash them all. So I drop the value, or use a keyed hash. In AskPEP the traces table still stores each question as typed. Only an admin can read it, and passing the query through the redactor before the insert would close the gap. When I need raw examples to debug, I use approved sampling. That means a small, access-controlled sample with a reason recorded and a short retention. Quality comes from aggregates, such as the rate of modify and block verdicts over time, and from reviewer outcomes. The trade-off is slower debugging when the text is missing. The fallback is a break-glass access path with an audit trail.",
    keywords: ["data minimisation", "metadata", "text length", "redaction", "keyed hash", "verdict rate", "approved sampling", "break-glass"],
    followUps: [
      "How do you debug a retrieval failure if you cannot see the query?",
      "Is hashing a customer name safe?",
      "Who is allowed to see a sampled raw trace?",
    ],
  },
  // real Q5
  {
    id: "guardrails-q07",
    course: "guardrails",
    category: "human-review",
    level: "deep",
    chapterId: "guardrails-06-human-approval",
    source: "asked",
    question: "When do you bring a human into the loop, and at what metric level?",
    idealAnswer:
      "I use risk-based gates, not one confidence number. A case goes to a person when confidence is low or poorly calibrated, or when evidence conflicts. It also goes when a required field is missing, validation fails, the input is out of domain or retries are exhausted. It goes too when the action is sensitive or irreversible. High-impact actions, such as a payment hold or an external email, need approval whatever the confidence. For the metric level, I set thresholds from labelled validation data and business risk. I measure the false accept rate, which is the share of wrong items the system auto-approves. I measure the false reject rate, which is the share of correct items sent to review, and the review rate overall. Suppose wrong invoices cost far more than review time. Then I set a false accept limit first, find the lowest threshold that meets it, and check the review rate against reviewer capacity. If it does not fit, I improve the model or add risk triggers, rather than loosen the limit. I log the reason for every routing and every reviewer decision, and I learn from the outcomes. The trade-off is cost against risk, and I recalibrate regularly.",
    keywords: ["risk-based gates", "false accept rate", "false reject rate", "review rate", "calibration", "labelled validation data", "irreversible actions", "reviewer capacity"],
    followUps: [
      "Why is a confidence score alone a weak gate?",
      "What do you do when the false accept limit and reviewer capacity conflict?",
      "How often do you recalibrate the threshold?",
    ],
  },
  {
    id: "guardrails-q08",
    course: "guardrails",
    category: "human-review",
    level: "senior",
    chapterId: "guardrails-06-human-approval",
    question: "Your reviewers approve almost everything. Is that a good sign?",
    idealAnswer:
      "Not by itself. It has two readings. Either the model is excellent and I am wasting reviewer time, or the reviewers are rubber-stamping, which is automation bias. Both are plausible, so I measure rather than guess. I seed the queue with known-bad items, wrong totals and planted errors, and see how many reviewers catch. I check review time per item, because a two-second approval is a warning. I compare reviewer decisions with a later audit sample and with downstream corrections. If the catch rate is low, the review step is giving false comfort, and I redesign it. That means smaller queues, showing the evidence and the model's reasoning beside the field, asking for a reason on approvals, and rotating reviewers. If the catch rate is high and the approval rate really is high, the threshold is too conservative. I raise the auto-approve share to cut review volume, as long as the false accept limit holds. The trade-off is reviewer load against the chance of a silent error. The fallback if I cannot trust the reviews is to treat the stage as unaudited and tighten the earlier gates.",
    keywords: ["automation bias", "rubber-stamping", "seeded errors", "catch rate", "review time", "audit sample", "queue size", "false accept limit"],
    followUps: [
      "How would you design the review screen to reduce rubber-stamping?",
      "Would you tell reviewers about the seeded items?",
      "When would you remove a review step entirely?",
    ],
  },
  // real Q39
  {
    id: "guardrails-q09",
    course: "guardrails",
    category: "audit",
    level: "deep",
    chapterId: "guardrails-08-incidents-and-evidence",
    source: "practice",
    question: "How do you audit agent actions and control high-impact tools?",
    idealAnswer:
      "Every tool call writes an audit record with fixed fields. These are the actor, the run id, the tool, the validated arguments, the policy decision, any approval, the timestamp, the result and the failure state. With those I can say who did what, with which arguments and why it was allowed. Records are append-only and stored away from the agent's own write path. To control high-impact tools, I give each tool its own identity and scoped credentials, so a payment hold tool cannot read the whole ledger. Tool arguments are validated in code, and calls carry an idempotency key so a retry cannot repeat the effect. Irreversible actions, such as emailing a supplier, need explicit approval bound to the exact arguments, with an expiry. I keep a kill switch at three levels: global, per tool and per tenant, and I test it before I need it. I track metrics such as blocked calls, approval rejections and actions per run. The trade-off is friction and storage cost. The fallback is to disable the tool and let the agent continue read-only.",
    keywords: ["audit record", "run id", "validated arguments", "policy decision", "least privilege", "idempotency", "approval", "kill switch"],
    followUps: [
      "Which audit field would you miss most in an incident?",
      "How do you stop the agent editing its own audit log?",
      "What does a per-tenant kill switch cost to build?",
    ],
  },
  {
    id: "guardrails-q10",
    course: "guardrails",
    category: "audit",
    level: "senior",
    chapterId: "guardrails-08-incidents-and-evidence",
    question: "An agent did something harmful overnight. What do you need in place to respond?",
    idealAnswer:
      "Before the incident, I need four things. First, a kill switch narrow enough to stop the harm without taking everything down. That means a per-tool or per-tenant switch, and someone who is allowed to flip it. Second, an audit log that answers who, what, with which arguments, under which approval and what happened. Without validated arguments or a run id, I cannot reconstruct the night. Third, a recovery path. That is a way to reverse the action, such as releasing a payment hold or sending a correction. It also needs a list of affected records, found by querying the audit log. Fourth, a communication process for the affected supplier or customer, and for internal owners. During the incident, the order is contain, assess, recover, then investigate. I stop the harm first. Then I size it from the audit log and reverse what I can. Last I find the root cause by comparing a bad trace with a good one. Afterwards I run a blameless review, add a regression case and add the missing control. The trade-off is that these controls cost effort up front. The fallback is to run the agent read-only until the gap is closed.",
    keywords: ["kill switch", "audit log", "run id", "containment", "reversal", "affected records", "notification", "post-incident review", "regression case"],
    followUps: [
      "How do you decide between a global and a per-tool switch?",
      "What if the action cannot be reversed?",
      "Who owns the decision to turn the agent back on?",
    ],
  },
  // real Q4
  {
    id: "guardrails-q11",
    course: "guardrails",
    category: "incidents",
    level: "deep",
    chapterId: "guardrails-02-guardrails-ai-output",
    source: "asked",
    question: "An agent starts hallucinating in production. Where do you investigate first?",
    idealAnswer:
      "I do not assume the model is the cause. I pick a failing request and a similar known-good one and compare their traces side by side, to find the first stage that differs. I walk the stages in order. Did the input change? Did retrieval return relevant, current and authorised evidence? Did parsing, chunking, filters or reranking change? Did the prompt, the context budget, the model version or the decoding settings change? Did a tool return bad output, or did structured parsing fail? I check the deployment history, evaluation results and error slices by tenant, document type and release. Once I know the first failing stage, I mitigate before I fix. I might roll back the release, disable a tool, or tighten a gate such as a grounding check. Then I fix the cause and add the incident as a regression case in the golden set. The metrics I watch are the groundedness rate, the refusal rate and the user correction rate. The trade-off is that a rollback is fast but may hide the cause, so I keep a snapshot of the bad trace. The fallback is routing affected requests to a human.",
    keywords: ["trace comparison", "known-good request", "first failing stage", "retrieval", "model version", "rollback", "regression case", "error slices"],
    followUps: [
      "What if the failing and the good request are both in the same trace store but nothing differs?",
      "How do you decide between rolling back and a forward fix?",
      "How would you know the problem is a model change by the provider?",
    ],
  },
  {
    id: "guardrails-q12",
    course: "guardrails",
    category: "incidents",
    level: "senior",
    chapterId: "guardrails-02-guardrails-ai-output",
    question: "How do you stop the same hallucination incident happening twice?",
    idealAnswer:
      "Every incident ends as a regression case. I take the failing input, the evidence the system retrieved and the expected behaviour, and add them to the golden set. The case runs in the evaluation gate on every release, so the same failure cannot ship quietly again. But one case only protects against one phrasing, so I also ask what class of failure it was. If it was stale retrieval, I add similar cases across document types and a freshness check. If a grounding check missed it, I add that failure to the guardrail's labelled data and retune it. If a prompt change caused it, I add a prompt diff review step. After that, I check the monitoring: why did we find out late, and what alert would have caught it earlier? I add that alert. I also review the mitigation we used, and whether the kill switch or rollback worked as planned. The trade-off is a growing evaluation set, which costs time and money to run. So I tag cases by risk and run the full set before release and a core set on every change. The fallback while a fix is pending is a stricter gate or routing that class to review.",
    keywords: ["regression case", "golden set", "evaluation gate", "failure class", "monitoring gap", "alert", "post-incident review", "risk tagging"],
    followUps: [
      "How do you keep the golden set from growing without limit?",
      "What if the incident cannot be reproduced?",
      "Who decides when an incident is closed?",
    ],
  },
  // real Q75
  {
    id: "guardrails-q13",
    course: "guardrails",
    category: "red-teaming",
    level: "deep",
    chapterId: "guardrails-07-red-teaming-gate",
    source: "practice",
    question: "How would you red-team an AI agent before launch, and how do you keep doing it afterwards?",
    idealAnswer:
      "I treat red-teaming as a tracked metric that runs on every change. For AskPEP I stored 25 attacks in a versioned file, in five kinds: direct injection, jailbreak, indirect injection, PII exfiltration and unauthorised action. I map each kind onto the tools the desk holds, because the one tool that writes, opening a ticket, is what an attacker wants. I wrote the first set by hand, because I know the desk's rules. Each attack asserts on the tool calls and on a canary, a made-up string that must not appear. It never asserts on the wording of a refusal. The result is an attack success rate against a pass mark of 5 percent. The command exits 1 above it, so CI blocks the merge. That offline gate runs on every commit. Live attack tools, such as promptfoo or garak, run weekly because they call paid models and vary between runs. Each hole they find becomes a new version of the set. The trade-off is that the gate is a regression test. It shows that nothing which held has reopened, not that the desk is safe. The fallback for a critical finding is to block the release and disable the tool.",
    keywords: ["attack set", "attack success rate", "canary", "tool calls", "CI gate", "offline gate", "live tools weekly", "versioned set", "regression"],
    followUps: [
      "How many attacks are enough?",
      "How do you stop generated attacks from being near-duplicates?",
      "Who signs off severity on a client engagement?",
    ],
  },
  // real Q76
  {
    id: "guardrails-q14",
    course: "guardrails",
    category: "red-teaming",
    level: "senior",
    chapterId: "guardrails-07-red-teaming-gate",
    source: "practice",
    question: "Your attack success rate fell from 10 percent to 5 percent. Can you ship?",
    idealAnswer:
      "Not on that number alone. I look at four things. First, did the attack set change size? On a set of 25 attacks, one attack moves the rate by 4 points. So a fall from 10 to 5 percent is about one attack. If attacks were added between the runs, the totals are not comparable, so I compare the original slice with the original slice. Second, which attacks succeeded? A low rate can hide one critical leak among harmless ones. Third, did any critical attack succeed? My gate says zero, whatever the overall rate. Fourth, did an attack that was fixed come back? A prompt or model change often reopens an old hole, and that is a regression even if the rate looks fine. So the gate has three rules: a ceiling on the rate, no critical hits, and no fixed attack that succeeds again. If any rule fails, I hold the release, find the change that caused it, fix it in code where I can, and rerun. The trade-off is a slower release. The fallback, if the business insists, is to ship with the affected tool disabled.",
    keywords: ["attack success rate", "denominator", "original slice", "critical hit", "regression", "release gate", "pass mark", "ceiling"],
    followUps: [
      "What if the business says the critical attack is unrealistic?",
      "How many runs per attack do you need?",
      "What would make you raise the ceiling?",
    ],
  },
  // real Q77
  {
    id: "guardrails-q15",
    course: "guardrails",
    category: "compliance",
    level: "core",
    chapterId: "guardrails-08-incidents-and-evidence",
    source: "practice",
    question: "A customer sends a security questionnaire about your AI feature. How do you answer it?",
    idealAnswer:
      "I treat the questionnaire as a request for evidence, so I answer from a system card, not from memory. The card is a typed record in the repository. It holds the intended use, the tools, the data flows, the controls, the latest attack success rate with its date, and the owner. Five items come straight from it: region, retention, human oversight, the audit trail and injection testing. The rest need the provider's terms, a company certificate or legal. I split the form that way on day one. I answer the engineering items in one sentence each, with a number or a document. I draft the items that legal signs, such as the EU AI Act tier and the automated-decision question, as facts and not as legal conclusions. Where the answer is no, I say no and say what I do instead. I never claim a certificate we do not hold. Each answer goes into a library with an evidence link and a check date, so the next form starts mostly filled.",
    keywords: ["system card", "evidence", "data terms", "retention", "subprocessors", "DPIA", "EU AI Act", "over-claim", "answer library"],
    followUps: [
      "Which items can you not answer yourself?",
      "What do you do when the honest answer is no?",
      "How do you keep the answers from going stale?",
    ],
  },
  // real Q78
  {
    id: "guardrails-q16",
    course: "guardrails",
    category: "compliance",
    level: "deep",
    chapterId: "guardrails-08-incidents-and-evidence",
    source: "practice",
    question: "How would you get this agent through our security review?",
    idealAnswer:
      "I would make approval the easy decision. At the start I ask for the questionnaire and the review date. Before the questions arrive I send a system card and a data-flow diagram. I answer each item in one sentence with a number or a document attached. The evidence comes from controls I built: an append-only audit record, approval bound to exact arguments, scoped tool identities, and a weekly attack set with a release gate on the success rate. I record the data terms in one place: region, no training on customer data, retention at the provider and in our traces, and the subprocessors. I send the legal items, such as the DPIA and the AI Act tier, to legal on day one with the facts drafted. I name every gap with a closing date, for example a certificate we do not hold. I offer a call with the buyer's security lead for anything open. The trade-off is time spent on documents before any code ships. The fallback, if the review stalls, is a narrower first release with read-only tools.",
    keywords: ["system card", "data-flow diagram", "audit record", "least privilege", "attack success rate", "data terms", "DPIA", "gap with a date", "read-only release"],
    followUps: [
      "Who signs the DPIA, and what do you give them?",
      "Would you ever claim a certificate you do not hold?",
      "What is your fallback if the review stalls?",
    ],
  },
  {
    id: "guardrails-q17",
    course: "guardrails",
    category: "guardrails",
    level: "core",
    chapterId: "guardrails-01-layers-on-askpep",
    question: "Where does untrusted text enter your agent, and how do you find every place?",
    idealAnswer:
      "I list every place where outside text reaches the model, because a check on three doors is no use if the attacker uses the fourth. In AskPEP there are four. The user's input is the first. Retrieved text is the second, such as a PEP passage a tool returns. The arguments the model writes for a tool are the third. The model's output is the fourth. Tool arguments and answers count as untrusted because the model wrote them after reading untrusted text. The system prompt is the one trusted text, because I wrote it. I find the doors by tracing one request from the user and back to the user. I write down each place a string crosses a boundary. Then each stage gets a check in code, outside the model. The checks fail closed, so a crash blocks the text. Every verdict writes an audit row. The trade-off is added latency and some false positives at each stage. The fallback for a stage I cannot cover is to remove the tool or route the case to a person.",
    keywords: ["four stages", "user input", "retrieved text", "tool arguments", "model output", "system prompt", "fail closed", "audit row"],
    followUps: [
      "Why is a tool's argument untrusted when the model wrote it?",
      "How would you find a door you missed?",
      "What do you do for a stage you cannot check?",
    ],
  },
  {
    id: "guardrails-q18",
    course: "guardrails",
    category: "guardrails",
    level: "deep",
    chapterId: "guardrails-02-guardrails-ai-output",
    question: "A model's answer cites a source the system never retrieved. Where do you stop it, and what do you do when you catch it?",
    idealAnswer:
      "I stop it at the output stage, in code, after the model finishes. The check reads every citation marker in the answer, such as [4], and compares each number with the sources the run retrieved. A number with no source fails. Then I choose between three actions by cost and risk. Reask sends the answer back to the model with the list of sources it may cite. It costs a model call and some seconds. Fix strips the bad marker. It is cheap, but it leaves a claim that now looks uncited, so it can hide a made-up fact. Refuse blocks the answer. It costs the answer, and it is the safe choice when the claim matters. I would say plainly what a pass proves. It proves only that every number is in range. An uncited answer, or a real source that does not support the sentence, needs an evaluation with a grader. Streaming changes the design. The check needs the whole answer, so the desk holds the tokens until it ends, and time to first token rises. The guard fails closed, and every verdict writes an audit event.",
    keywords: ["output stage", "validator", "reask", "fix", "refuse", "fail closed", "held streaming", "time to first token", "audit event"],
    followUps: [
      "Why can a fix hide a made-up claim?",
      "What can the check not catch?",
      "What does streaming do to the check?",
    ],
  },
  {
    id: "guardrails-q19",
    course: "guardrails",
    category: "guardrails",
    level: "core",
    chapterId: "guardrails-04-model-armor-and-classifiers",
    question: "Your safety classifier's API goes down at night. What does the system do?",
    idealAnswer:
      "It does what I decided in advance, and I can name the choice. Failing closed blocks every request at that stage, which takes the feature down. Failing open lets attacks through unscreened. Neither is right everywhere, so I choose stage by stage. On the input of an agent that can act, I fail closed. On a stage where a missed attack costs less than an outage, I might fail open. A person with authority makes the choice and records it. In AskPEP, the Model Armor guard fails closed by default. A timeout returns a block with the reason model armor unavailable, and a flag called fail_open turns the other behaviour on. A managed integration that skips screening without an error fails open, so I would not rely on it alone. Every outage shows in the audit trail, because each result carries a reason and a latency. An alert on a jump in unavailable reasons tells me the classifier is down. The trade-off is availability against exposure. The fallback is a safe refusal, or a human reviewer for the cases that matter.",
    keywords: ["fail closed", "fail open", "audit trail", "alert", "decision owner", "safe refusal", "stage by stage"],
    followUps: [
      "Which stage would you let fail open, and why?",
      "How would you know the classifier was down?",
      "What does a block cost you per hour of outage?",
    ],
  },
  {
    id: "guardrails-q20",
    course: "guardrails",
    category: "human-review",
    level: "deep",
    chapterId: "guardrails-06-human-approval",
    question: "A paused agent run resumes, and the model proposes a different ticket. What gets filed?",
    idealAnswer:
      "The draft the approver saw. A resume runs the paused node again from its first line. A supervisor's worker keeps no checkpoint of its own, so its model runs again and may change its mind. If the desk filed whatever the model proposed second, the person would approve one ticket and the desk would file another. So the decision carries the approved draft. On an approve, the request's draft is copied into the decision. The ticket tool files that draft, under the request's idempotency key, which the decision carries too, and the second proposal is dropped. A retry then cannot file twice. I would name the limit. When the approver edits the draft, the tool files the edited draft but keeps the key of the draft the model first proposed. The trade-off is a more careful tool and more state to carry through the pause. The fallback, if I cannot trust the resume, is to reject the request and ask again. I test it with a scripted model that proposes a different ticket on the second pass.",
    keywords: ["resume", "approved draft", "idempotency key", "interrupt", "node reruns", "supervisor worker", "edit", "scripted model"],
    followUps: [
      "Why does the supervisor's worker change its mind?",
      "What key does an edited draft get?",
      "How would you test this without a live model?",
    ],
  },
  {
    id: "guardrails-q21",
    course: "guardrails",
    category: "human-review",
    level: "deep",
    chapterId: "guardrails-06-human-approval",
    question: "Why does your MCP server have no approval tool?",
    idealAnswer:
      "Because the MCP client is a model. If the server offered an approve tool, the model that asked for the ticket could approve it itself. A hostile passage in a PEP could tell the model to do the same. Then the approval would be only as safe as the model's judgement. So the server returns a status, awaiting_approval, with the request attached. A person decides through a separate door, an API route or a command line. That door checks the caller's role from the API key. It writes the approver's identity from the credential, never from the request body. A reader cannot approve, and a body that names another approver is ignored. The trade-off is friction. The agent cannot finish the task alone, and a person has to come back to it. The fallback is a timeout, so a request nobody answers ends as a timeout and files nothing. I would also say plainly that a staff user may approve their own request. If the policy needs two people, I would add that check.",
    keywords: ["MCP client is a model", "approval tool", "awaiting_approval", "separate channel", "role check", "approver from the credential", "self-approval", "timeout"],
    followUps: [
      "Who is recorded as the approver when the body names someone else?",
      "What stops a staff user approving their own request?",
      "How does the agent learn the outcome?",
    ],
  },
  {
    id: "guardrails-q22",
    course: "guardrails",
    category: "human-review",
    level: "deep",
    chapterId: "guardrails-06-human-approval",
    question: "How do you stop a pending approval waiting forever?",
    idealAnswer:
      "Every request carries an expiry time, set when I build it. Two things act on it. A decision that arrives late becomes a timeout, whatever the person chose, so a stale approval cannot file a ticket. And a request nobody answers needs a job. A scheduled job reads the audit trail for requests whose newest approval row is still requested and whose expiry has passed. It resumes each one as a system principal with a timeout, so the run ends cleanly and files nothing. I read the audit trail and not the checkpoint, because a checkpoint does not say how old a pause is. I would name the limit. The AskPEP job reads only the most recent 1000 audit rows, so a request older than that is missed. A busy desk should run the job often. The trade-off is that the user waits for the full timeout before the run ends, which is one hour by default. The fallback is an alert before the deadline, so a person can still decide.",
    keywords: ["expires_at", "timeout decision", "scheduled job", "audit trail", "system principal", "checkpoint", "1000 rows"],
    followUps: [
      "Why read the audit trail and not the checkpoint?",
      "What happens to a decision that arrives at the exact minute of expiry?",
      "How often would you run the job?",
    ],
  },
  {
    id: "guardrails-q23",
    course: "guardrails",
    category: "operations",
    level: "deep",
    chapterId: "guardrails-08-incidents-and-evidence",
    question: "Your agent starts doing something wrong in production. What can you switch off, and how do you know it is off?",
    idealAnswer:
      "I switch off the narrowest thing first. AskPEP has two scopes, set by one setting called KILL_SWITCH. The value actions stops the tools that change something, which today is the ticket tool. Searching and reading carry on. The value all stops that tool too, and every route except /health answers 503. The health route stays up, so a platform does not restart a desk that is off on purpose. The switch is the first check in the function every tool call passes through. It runs before authorisation and before any approval pause, so a paused request cannot slip past it. I know it is off from the audit table. Every stopped call writes a kill_switch row. The cost is that the service reads the setting once, at start, so a change takes a restart. I would say so, and I would rehearse the restart before I need it. The fallback is to run read-only until a person finds the cause and fixes it.",
    keywords: ["kill switch", "KILL_SWITCH", "actions scope", "all scope", "503", "/health", "audit row", "restart", "narrowest switch first"],
    followUps: [
      "Why is the switch the first check in the tool function?",
      "Why does a change need a restart, and what does that cost?",
      "How do you rebuild one run from the audit table?",
    ],
  },
  {
    id: "guardrails-q24",
    course: "guardrails",
    category: "operations",
    level: "deep",
    chapterId: "guardrails-09-security-review",
    question: "You have a launch date, and two security risks are still open. What do you do?",
    idealAnswer:
      "I narrow the launch until every open risk is one a named person will carry. I work from the threat model, where each row is closed or accepted. A row closes only when its evidence names a test, a gate result or an audit row. In AskPEP, the frozen attack set scored zero on input and retrieved text. But attacks written after the guards were fixed still got through. So I would not call those rows closed. I would write them as accepted, with the remaining risk and the person who accepts it. The reason they can be accepted is the next control along. A reworded order can reach the model, and it can only cause a ticket, and a ticket waits for a person. Then I write a launch decision with the scope, the conditions and the events that stop it. For AskPEP that meant a pilot for one team. Raw text in the stores had to be fixed before any outside user, with a date. The cost is a smaller launch and a dated action, and I would rather say that early.",
    keywords: ["threat model", "closed or accepted", "named owner", "residual risk", "launch decision", "pilot scope", "dated action"],
    followUps: [
      "Who should be allowed to accept a security risk?",
      "What would make you stop the pilot?",
      "How do you stop an accepted risk from being forgotten?",
    ],
  },
  {
    id: "guardrails-q25",
    course: "guardrails",
    category: "operations",
    level: "deep",
    chapterId: "guardrails-09-security-review",
    question: "Every action in your agent needs a person's approval, and approvers click yes without reading. Is the control working?",
    idealAnswer:
      "No. The approval step is running, and the control has stopped working. A person approving an action is only a check when that person reads it. I found this in an incident drill on AskPEP. A reworded order in a passage led to a ticket request, and the approver said yes without reading the title. Every row on the trail looked correct. So the audit table can prove that approval happened, and it can't prove that anyone thought about it. I would do three things in order of cost. First, I cut the volume, because people stop reading when most requests are routine. Second, I put the risky fields at the top of the approval card, such as the title and the target. Third, I add a second reader for high-risk actions, such as anything about credentials. I also watch the numbers, like time to approve and the share rejected. An approver who has rejected nothing in a month is a warning. I would report this result to the reviewer plainly, because it will come up anyway.",
    keywords: ["approval fatigue", "human in the loop", "incident drill", "audit row limits", "second reader", "time to approve", "rejection rate"],
    followUps: [
      "How would you measure whether approvers are reading?",
      "When would you remove a person from the loop?",
      "What does the audit trail fail to show here?",
    ],
  },
];

export default questions;
