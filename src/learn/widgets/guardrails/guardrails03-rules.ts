// A port of RULES, spotlight, scan_injection, neutralise and InjectionGuard.check from
// capstone/src/askpep/guards/injection.py. The patterns are the same text as the Python ones.
// The lab tests pin the Python. This file only has to agree with it, so the rule tester shows what
// the real guard would do. It has no imports, so a script can load it without a bundler.

export type Stage = "input" | "retrieved" | "tool_call";
export type Rule = { name: string; pattern: RegExp; stages: Stage[] };
export type Verdict = {
  action: "allow" | "modify" | "block";
  hits: string[];
  total: number;
  score: number;
  text: string;
  reason: string;
};

export const REMOVED = "[removed: text that tried to give instructions]";

const ALL: Stage[] = ["input", "retrieved", "tool_call"];
const DATA: Stage[] = ["retrieved", "tool_call"];

export const RULES: Rule[] = [
  {
    name: "ignore_instructions",
    pattern:
      /\b(?:ignore|disregard|forget|override)\b[^.\n]{0,40}\b(?:previous|prior|above|earlier|all|any|your)\b[^.\n]{0,40}\b(?:instructions?|rules?|prompts?|guidelines?)\b/i,
    stages: ALL,
  },
  {
    name: "reveal_prompt",
    pattern: /\b(?:reveal|show|print|repeat|output|leak)\b[^.\n]{0,40}\b(?:system|developer|hidden)\s+(?:prompt|message|instructions?)\b/i,
    stages: ALL,
  },
  {
    name: "role_override",
    pattern: /\byou are now (?:a|an|the|in)\b|\bpretend (?:to be|you are)\b|\bfrom now on,? (?:you|ignore|respond|act)\b/i,
    stages: ALL,
  },
  {
    name: "jailbreak",
    pattern: /\bdeveloper mode\b|\bdo anything now\b|\bjailbreak(?:ed)?\b/i,
    stages: ["input"],
  },
  {
    name: "tool_directive",
    pattern:
      /\b(?:call|invoke|run|use|execute)\b[^.\n]{0,30}\b(?:open_ticket|transfer_to_\w+|lint_snippet)\b|\b(?:open|file|create|raise)\b[^.\n]{0,20}\bticket\b/i,
    stages: ["retrieved"],
  },
  {
    name: "exfil_link",
    pattern: /!?\[[^\]]*\]\(https?:\/\/[^)\s]*\?[^)\s]*\)/i,
    stages: DATA,
  },
  {
    name: "delimiter_spoof",
    pattern: /<\/?untrusted\b/i,
    stages: ["input", "retrieved"],
  },
];

export function spotlight(text: string, source = "", marker = "7f3a9c21"): string {
  const safe = text.replace(/<(\/?untrusted)/gi, "&lt;$1");
  const label = source.replace(/"/g, "'");
  return `<untrusted id="${marker}" source="${label}">\n${safe}\n</untrusted id="${marker}">`;
}

export function scan(text: string, stage: Stage): string[] {
  return RULES.filter((r) => r.stages.includes(stage) && r.pattern.test(text)).map((r) => r.name);
}

export function neutralise(text: string, stage: Stage): string {
  let out = text;
  for (const rule of RULES) {
    if (!rule.stages.includes(stage)) continue;
    const sentence = new RegExp(`[^.!?\\n]*(?:${rule.pattern.source})[^.!?\\n]*[.!?]?`, "gi");
    out = out.replace(sentence, REMOVED);
  }
  return out;
}

export function check(text: string, stage: Stage): Verdict {
  const hits = scan(text, stage);
  const total = RULES.filter((r) => r.stages.includes(stage)).length;
  if (hits.length === 0) return { action: "allow", hits, total, score: 0, text, reason: "" };
  const reason = "possible prompt injection: " + hits.join(", ");
  const score = hits.length / total;
  if (stage === "retrieved") return { action: "modify", hits, total, score, text: neutralise(text, stage), reason };
  return { action: "block", hits, total, score, text, reason };
}
