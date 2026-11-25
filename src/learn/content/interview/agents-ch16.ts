import type { InterviewQuestion } from "../types";

// Chapter 16 questions. Ids are agents-cNN-qNN.
const questions: InterviewQuestion[] = [
  {
    id: "agents-c16-q01",
    course: "agents",
    category: "multi-agent",
    level: "core",
    chapterId: "agents-16-voting-and-debate",
    question: "What is self-consistency, and when would you spend the extra calls on it?",
    idealAnswer:
      "Self-consistency means asking the same question several times, normalising the answers and taking the majority. I use it when the answer is short and comparable, such as a version number, a category or a yes or no. One call must also be wrong often enough to matter. It costs n times the calls and about n times the tokens, so it needs a reason. The votes must also differ, which means sampling with some temperature. Ties need a written rule, for example the answer seen first, or one more vote. The main limit is correlation. If every copy of one model shares the same blind spot, five votes agree on the same wrong answer. Then I have paid five times for the same mistake. I would not use it for open prose, because no two answers are equal. For that I use a critic. On a PEP desk I would vote on the version a feature landed in. I would measure the gain against a single call before I shipped it.",
    keywords: ["self-consistency", "majority vote", "normalise", "tie-break", "temperature", "correlated errors", "cost multiplier", "short answer"],
    followUps: [
      "How do you choose n?",
      "What do you do when the vote ends in a tie?",
      "How would you measure whether voting helped?",
    ],
  },
  {
    id: "agents-c16-q02",
    course: "agents",
    category: "multi-agent",
    level: "deep",
    chapterId: "agents-16-voting-and-debate",
    question: "How does a debate between agents work, and where does it fail?",
    idealAnswer:
      "In a debate, two agents are each given an opposite answer to defend. They argue for a set number of rounds, and each sees the transcript so far. Then a debate judge reads the whole transcript and returns a verdict and a reason. Code owns the rounds, the transcript and the check that the verdict names one of the sides. It fails in three ways. The debate judge can be swayed by length or confidence, so the longest argument wins whatever it says. The debate can converge on the louder side, because a model tends to agree with a confident opponent. And the cost grows fast, since every round re-sends the transcript. A two-round debate is five calls, but it can use around four times the tokens of five votes. I would use it when answers are too long to count and a check against a source matters. I would make the debate judge cite evidence, and I would shuffle which side speaks first.",
    keywords: ["debate", "debate judge", "transcript", "rounds", "verdict", "length bias", "confidence", "token cost", "position bias"],
    followUps: [
      "How would you test that the debate judge is not biased toward length?",
      "Why not let the debaters decide between themselves?",
      "When is a critic loop better than a debate?",
    ],
  },
  {
    id: "agents-c16-q03",
    course: "agents",
    category: "orchestration",
    level: "senior",
    chapterId: "agents-16-voting-and-debate",
    question: "Compare voting, reflection and fan-out. Which would you pick to make an answer more accurate?",
    idealAnswer:
      "They answer different questions. Reflection is one writer and one critic in a loop, so it improves a draft over time and needs a written standard to check against. Voting asks many voices at once and lets a rule pick, so it suits short answers that can be counted. Fan-out is the plumbing underneath: it splits work, runs it at the same time and merges it. Voting uses fan-out to run its votes in parallel, which keeps latency near one call while cost stays at n calls. For accuracy I start with the cheapest fix, a better prompt or a better retrieval step. If the answer is short and I can measure the error, I try votes. If the output is prose with a standard, I try a critic. I try debate last, because it costs the most and the debate judge adds its own bias. In every case I measure accuracy against a single call, and I keep the extra calls only if the gain pays for them.",
    keywords: ["reflection", "critic", "voting", "fan-out", "parallel", "latency", "cost", "short answer", "measure against a single call"],
    followUps: [
      "Can you combine two of these? How?",
      "What does the eval for this look like?",
      "How do you cap the cost of a vote in production?",
    ],
  },
];

export default questions;
