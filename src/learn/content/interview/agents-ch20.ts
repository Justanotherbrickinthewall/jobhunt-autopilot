import type { InterviewQuestion } from "../types";

// Chapter 20 questions. Ids are agents-cNN-qNN.
const questions: InterviewQuestion[] = [
  {
    "id": "agents-c20-q01",
    "course": "agents",
    "category": "orchestration",
    "level": "core",
    "chapterId": "agents-20-event-driven",
    "question": "Why put a topic between a scheduled job and the agents that do the work?",
    "idealAnswer": "A topic absorbs the burst and decouples the pace. A schedule fires at one moment and writes every task at once, say a few hundred changed items at 02:00. If it called the agents directly, they would take the whole burst, and callers would see timeouts or refusals. With a topic, the schedule writes its events and finishes. Consumers pull the events one at a time, at their own speed. If a consumer is slow or down, the events wait in the topic and nothing is lost. I watch lag, the count of events not yet handled, to see if consumers keep up. There is also a practical reason. A platform often runs topics already, so one more adds nothing new to operate, secure or pay for. That is a legitimate reason to choose it, and I would say so. The cost is a new failure to design for: delivery is at-least-once, so the handler must be safe to repeat.",
    "keywords": [
      "burst",
      "absorb",
      "decouple",
      "lag",
      "consumers pull",
      "at their own pace",
      "reuse the platform's topics",
      "at-least-once"
    ],
    "followUps": [
      "What would you alert on?",
      "What happens if the consumers are down for an hour?",
      "When would you skip the topic?"
    ]
  },
  {
    "id": "agents-c20-q02",
    "course": "agents",
    "category": "orchestration",
    "level": "deep",
    "chapterId": "agents-20-event-driven",
    "question": "What is the difference between pull and push, and how is that different from point-to-point and publish-subscribe?",
    "idealAnswer": "They are two separate axes. Pull or push says who starts the exchange. In pull, the worker asks for work when it's ready. In push, the sender delivers work as it arrives. Point-to-point or publish-subscribe says who gets a copy. In point-to-point, each event goes to one worker. In publish-subscribe, every subscriber or group gets its own copy. A log-based stream shows why they differ. Every consumer group pulls from its own offset, so every group sees every event, which is publish-subscribe. Inside one group the workers share the events, which is point-to-point. All of it is pull. A managed message queue is pull and point-to-point. A webhook is push, and it can go to one URL or to many. Pull suits agents because a model call is slow and uneven. A free consumer takes one event, so a burst can't overload it. With push, the sender sets the pace, and the agent must refuse or buffer.",
    "keywords": [
      "pull",
      "push",
      "who starts the exchange",
      "point-to-point",
      "publish-subscribe",
      "consumer group",
      "offset",
      "webhook",
      "backpressure"
    ],
    "followUps": [
      "Which does a webhook use?",
      "Can push be publish-subscribe?",
      "How do partitions limit parallelism?"
    ]
  },
  {
    "id": "agents-c20-q03",
    "course": "agents",
    "category": "production",
    "level": "deep",
    "chapterId": "agents-20-event-driven",
    "question": "A consumer crashes after doing the work but before it commits. What happens, and how do you make it safe?",
    "idealAnswer": "The event is delivered again, and the work runs a second time unless I prevent it. The offset only moves on commit, so a crash before the commit leaves the event at the head of the topic. This is at-least-once delivery. No event is lost, and some arrive twice. I make the handler idempotent. Every event carries a key that is the same on every delivery, such as the item ID and the day. The handler records the keys it has finished and does nothing when it sees one again. The repeat then costs no model call and sends no second mail. A crash between the effect and the key write would still repeat the work. So I store the key and the side effect in one transaction, or pass the key to the downstream service. The alternative is to commit first. That gives at-most-once delivery, and a crash then loses the event. For money or mail, I would take the duplicate over the loss.",
    "keywords": [
      "offset",
      "commit",
      "at-least-once",
      "at-most-once",
      "redelivered",
      "idempotency key",
      "same key on every delivery",
      "transaction"
    ],
    "followUps": [
      "Why not commit before the work?",
      "What counts as a good idempotency key?",
      "Is exactly-once possible?"
    ]
  },
  {
    "id": "agents-c20-q04",
    "course": "agents",
    "category": "production",
    "level": "senior",
    "chapterId": "agents-20-event-driven",
    "question": "How do you handle an event that keeps failing?",
    "idealAnswer": "I cap the retries and move the event aside. Without a cap, one bad event blocks everything behind it, because the group retries the same event for ever. I count failures per event key. Below the cap, the consumer does not commit, so the event comes round again. At the cap, the event goes to a dead-letter list with its reason, and the consumer commits so the group moves on. A person reads that list, fixes the data or the code, and replays the event. A crash is not a failure. If the process dies, the event deserves a fresh try, so only exceptions from the work count. I also watch the dead-letter count and the lag, because a rising count usually means a bug or an upstream change. The agents' wasted effort matters too. A permanent failure, like a PEP that doesn't exist, should fail fast and not spend model calls on each try. A temporary failure, such as a timeout, is worth a retry with a delay.",
    "keywords": [
      "retry cap",
      "dead-letter list",
      "poison event",
      "commit and move on",
      "crash is not a failure",
      "replay",
      "lag alert",
      "permanent versus temporary failure"
    ],
    "followUps": [
      "Would you back off between retries?",
      "How do you replay a dead letter?",
      "Who owns the dead-letter list?"
    ]
  }
];

export default questions;
