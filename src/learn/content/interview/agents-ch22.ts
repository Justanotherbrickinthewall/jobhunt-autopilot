import type { InterviewQuestion } from "../types";

// Chapter 22 questions. Ids are agents-cNN-qNN.
const questions: InterviewQuestion[] = [
  {
    id: "agents-c22-q01",
    course: "agents",
    category: "guardrails",
    level: "core",
    chapterId: "agents-22-guardrails-tools-and-data",
    question: "What is least privilege for an agent, and how do you enforce it?",
    idealAnswer:
      "Least privilege means each agent gets the tools its job needs and nothing else. I enforce it in code, not in the prompt. Every agent has an allow-list of tool names. The wrapper around tool calls checks the list first, and a call to any other tool is refused before it runs. The refusal goes back to the model as an observation, so the loop carries on. On the PEP desk, the researcher gets read-only tools and handoffs, and no email tool. Suppose a planted line in a PEP section tells the model to send an email. The call is refused, because that tool does not exist for that agent. I prefer this to filtering text because it does not depend on recognising the attack. A filter has to guess what an injection looks like. An allow-list only has to know what the agent needs. I also keep the check fail-closed, so a new tool is refused until someone adds it to a list and writes its schema. I review the lists like permissions in any other system.",
    keywords: ["least privilege", "allow-list", "enforced in code", "refused before it runs", "fail closed", "read-only tools", "observation", "per-agent tools"],
    followUps: [
      "What if one agent genuinely needs a risky tool?",
      "How do you keep the lists from growing by copy and paste?",
      "Where does the check sit in the loop?",
    ],
  },
  {
    id: "agents-c22-q02",
    course: "agents",
    category: "guardrails",
    level: "deep",
    chapterId: "agents-22-guardrails-tools-and-data",
    question: "A tool result contains an instruction planted by an attacker. Walk me through what your design does.",
    idealAnswer:
      "I assume the filters will miss some attacks, so I use layers, and the strongest layer does not read the text. First, tool output is untrusted data. I wrap it in data tags and tell the model that tagged text is never an order. That is a request, so a model can still obey it. Second, I scan the output for phrases that read like instructions and withhold it on a match. That catches crude attacks and misses a polite, reworded one. Third, and most important, the agent has an allow-list. If the planted text asks for a tool the agent does not have, the call is refused before it runs. A reworded attack changes nothing, because the allow-list never reads it. Fourth, budgets cap the calls and the tokens, so a hijacked run cannot spend without limit. One risk remains: the planted text can change the answer without calling a tool. That needs checks on the output, which is the other half of guardrails. I would say plainly that no filter catches every injection.",
    keywords: ["untrusted data", "data tags", "injection scan", "allow-list", "layered defence", "budgets", "reworded attack", "output checks"],
    followUps: [
      "Why not just use a classifier model to detect injections?",
      "What can an injection still do after all four layers?",
      "How would you test these layers?",
    ],
  },
  {
    id: "agents-c22-q03",
    course: "agents",
    category: "guardrails",
    level: "deep",
    chapterId: "agents-22-guardrails-tools-and-data",
    question: "How do you keep personal data out of the model's prompts, and how do you prove it?",
    idealAnswer:
      "I work in order of strength. First, do not fetch the value if the task does not need it. Second, pass a derived fact in place of the record, such as whether a contact is on file. Then the name and address never leave the tool. Third, redact what I cannot avoid sending, using a wrapper around the model that cleans every message just before the call. Redaction is last because it only finds shapes I thought of. An email pattern misses a spelled-out address and a name. To prove it, I keep a list of protected values for the run. After the run I read the messages the model actually received, which a recording model keeps. I check that no listed value appears in any of them. An empty result is the pass. I put that check in the evals, so a regression gate fails the build when a secret leaks. I am clear about its limit. It proves one run against one list. It says nothing about logs, traces or values I did not list.",
    keywords: ["derived facts", "redaction", "wrapper around the model", "recorded calls", "protected values", "pattern limits", "leak check", "regression gate"],
    followUps: [
      "Where else can the data leak besides the prompt?",
      "How do you build the list of protected values?",
      "What would you do about names?",
    ],
  },
  {
    id: "agents-c22-q04",
    course: "agents",
    category: "guardrails",
    level: "senior",
    chapterId: "agents-22-guardrails-tools-and-data",
    question: "In what order do you run guards around a tool call, and why does the order matter?",
    idealAnswer:
      "I run cheap, certain checks before the tool and checks on the result after it. Before the tool: the allow-list, then the argument schema, then the call budget. The allow-list is first because it needs no parsing. The schema comes next, so a malformed call is refused with a clear message. The budget is last of the three, because a call refused earlier never runs and should not spend an allowance. After the tool: the injection scan first, because it should read the raw text. Then redaction, then the token budget, so it counts what the model will read. Then the data tag last, so the tags are never scanned or counted. The order also decides which guard fires, which I log, so I can see which layer caught what. Each guard misses something. The allow-list cannot stop misuse of an allowed tool. The scan misses reworded text, and redaction misses shapes it does not know. The stack works because the faults differ. In a framework I would put this in middleware around tool execution and a hook before each model call.",
    keywords: ["order of guards", "allow-list", "schema", "call budget", "injection scan", "redaction", "token budget", "middleware", "fail closed"],
    followUps: [
      "What would break if the budget ran first?",
      "How do you know a guard is too strict?",
      "How would you add a new tool safely?",
    ],
  },
];

export default questions;
