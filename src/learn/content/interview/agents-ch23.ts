import type { InterviewQuestion } from "../types";

// Chapter 23 questions. Ids are agents-cNN-qNN.
const questions: InterviewQuestion[] = [
  {
    id: "agents-c23-q01",
    course: "agents",
    category: "safety",
    level: "core",
    chapterId: "agents-23-guardrails-actions",
    question: "How do you decide which actions an agent may take on its own, and which need a human?",
    idealAnswer:
      "I classify every action by whether the system can take it back, and the class decides the guards. Read-only actions change nothing, so they get a schema check and a policy check. Reversible actions, such as a post that someone can delete, also get a content check on the outgoing text. They get an idempotency key and a dry run too. Irreversible actions, such as an email or a correction other sites copy, get all of that plus a pause for a person. Every action writes to the audit log. The class is set in code, in an action table. The model never sets it, and it can't move its own action into a looser class. An action that isn't in the table goes to a review queue, so the system fails closed. I classify by the worst case. If a case is close, I choose the stricter class. Then I keep the irreversible class small, because a person who approves forty requests a minute stops reading them.",
    keywords: ["risk class", "read-only", "reversible", "irreversible", "worst case", "action table", "fails closed", "approval"],
    followUps: [
      "Who sets the class, and could the model change it?",
      "How do you stop approval fatigue?",
      "What happens to an action that isn't in the table?",
    ],
  },
  {
    id: "agents-c23-q02",
    course: "agents",
    category: "safety",
    level: "deep",
    chapterId: "agents-23-guardrails-actions",
    question: "Design the approval flow for an agent that emails customers. What do you save, and what happens on a retry?",
    idealAnswer:
      "The run pauses before the send and returns. It saves its whole state as JSON in a database, under the task ID, with the proposal and the status waiting. The check results go to the audit log. Nothing waits in memory, so the person can answer in an hour or tomorrow, and a restart loses nothing. A second call brings in the task ID and a decision. Approve sends as proposed. Edit replaces the text, and the new text goes through every check again. Reject ends the run with a reason. Every step writes an audit row with who decided. On resume I also re-run the policy check, because the state may have changed during the wait. For example, the customer may have unsubscribed. For retries, I build an idempotency key from the task, the action and the target. I leave the wording out, since a retry may reword the email. The key is checked before the pause, so a repeat never asks the person twice. In production the key sits behind a unique constraint, because two workers can race.",
    keywords: ["pause", "task ID", "saved state", "approve edit reject", "re-run checks", "idempotency key", "target", "audit row", "unique constraint"],
    followUps: [
      "Why leave the wording out of the key?",
      "What if the customer unsubscribes while the run waits?",
      "How do you show the same pattern in LangGraph?",
    ],
  },
  {
    id: "agents-c23-q03",
    course: "agents",
    category: "safety",
    level: "senior",
    chapterId: "agents-23-guardrails-actions",
    question: "The agent sent an email with a wrong release date. Which guard should have caught it, and how do you prevent a repeat?",
    idealAnswer:
      "The first guard is upstream of any check. The model should never have written the date. It should have drafted a placeholder, and code should have filled the date from a trusted source. A check can only reject a bad draft, and a placeholder stops the bad draft from existing. The second guard is a content check. It finds numbers and links in the outgoing text and rejects any that didn't come from the trusted facts. I'm honest about its limit. A date that happens to match another trusted value passes, and a wrong claim in plain words passes too. So the third guard is approval for the irreversible class, with the filled text shown to the person. After the incident I read the audit log to see which guard was missing. I add the case to the golden set, so the regression gate fails the build if it comes back. I also check whether the action was in the right risk class. If a model wrote a fact that code could have supplied, I move that fact into code.",
    keywords: ["placeholder", "trusted source", "content check", "limits", "approval", "audit log", "risk class", "regression gate"],
    followUps: [
      "What can the content check not catch?",
      "How would an eval catch this class of failure?",
      "Would a second model as a critic help here?",
    ],
  },
  {
    id: "agents-c23-q04",
    course: "agents",
    category: "safety",
    level: "deep",
    chapterId: "agents-23-guardrails-actions",
    question: "The model proposes an action none of your rules cover. What does the system do?",
    idealAnswer:
      "It hands the case to a review queue and does nothing else. It doesn't guess, and it doesn't pick the nearest action. In my design an action that isn't in the action table has no risk class. So it has no list of checks, and it never reaches the code that executes. That makes the system fail closed. Each row in the review queue holds the task ID and the reason, such as no rule covers delete_pep. I count what lands there, because a review queue nobody reads is a silent failure. A rising count for one action name tells me the model wants something real. Then a person can decide whether to add the action with a class and checks. The same applies to a policy gap. If the rules can't say whether an action is allowed in the current state, I would rather ask than allow. Guessing is only safe for read-only actions.",
    keywords: ["review queue", "fails closed", "action table", "risk class", "no guess", "reason", "monitor the review queue"],
    followUps: [
      "How do you stop the review queue filling with noise?",
      "When would you add the new action to the table?",
      "Is it ever right to guess?",
    ],
  },
];

export default questions;
