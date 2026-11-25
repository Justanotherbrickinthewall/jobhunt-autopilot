import type { WidgetProps } from "../types";
import Rounds, { type Round } from "./Rounds";

const CATS = ["I built it", "My team built it", "I would design it", "Unverified"] as const;

// CHECK: 21 Oct 2026: Cloud Run and Secret Manager match the product names in setup/revision5/PLAN.md section 4 (cloud-03-container-and-cloud-run and cloud-04-cloud-sql-and-secrets). Not re-read on Google's site.
// Each statement has one right category. Order of buttons is fixed, so the learner learns the four labels.
const STATEMENTS: { id: string; text: string; right: number; why: string }[] = [
  { id: "c1", text: "I wrote the validation layer that checks that line items add up to the net amount.", right: 0, why: "A first-person claim about your own code. Be ready to describe the code." },
  { id: "c2", text: "We built the ingestion service, and a colleague owned the queue handling.", right: 1, why: "A team claim with a named owner. Say which part you touched." },
  { id: "c3", text: "It cut processing time by 70 percent.", right: 3, why: "No source is given. If you cannot show where the number came from, do not say it." },
  { id: "c4", text: "If I did it again, I would park failed documents in a separate queue for a person to check.", right: 2, why: "A design opinion, labelled as one. This is honest and interviewers like it." },
  { id: "c5", text: "I tuned the prompts and ran the evaluation on 200 labelled invoices.", right: 0, why: "Specific and checkable. Fine if you did it and the set size is true." },
  { id: "c6", text: "The team deployed it on Cloud Run, with Secret Manager for the keys.", right: 1, why: "The team did it. You can describe it, but do not claim you set it up." },
  { id: "c7", text: "For a larger volume I would move extraction to a queue with workers and batch the model calls.", right: 2, why: "A forward design, said as one. Never present it as something that ran." },
  { id: "c8", text: "Users loved it.", right: 3, why: "There is no evidence in the sentence. Replace it with what you observed or measured." },
];

const ROUNDS: Round[] = STATEMENTS.map((s) => ({
  id: s.id,
  prompt: s.text,
  options: CATS.map((c, i) => ({
    label: c,
    delta: i === s.right ? 1 : 0,
    feedback: i === s.right ? `Right. ${s.why}` : `Best label: ${CATS[s.right]}. ${s.why}`,
  })),
}));

export default function C05ClaimSorter(props: WidgetProps) {
  return (
    <Rounds
      {...props}
      className="fde-craft-claim-sorter"
      lede="Eight statements from a sample project story by a fictional candidate. Sort each into the honest category."
      rounds={ROUNDS}
      meterLabel="Sorted correctly"
      start={0}
      passAt={7}
      goodText="You can tell a claim you can defend from one you cannot. That boundary is what interviewers test."
      badText="Read the misses. The usual error is giving a number or a team result the first-person voice."
      foot="Illustrative story. The candidate and the project are fictional."
      noun="sorted correctly"
    />
  );
}
