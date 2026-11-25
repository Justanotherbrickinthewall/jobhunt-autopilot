import type { WidgetProps } from "../types";
import Rounds, { type Round } from "./Rounds";

const rotate = <T,>(a: T[], k: number) => a.map((_, i) => a[(i + k) % a.length]);

const mk = (id: string, prompt: string, right: string, rightFb: string, w1: string, w1Fb: string, w2: string, w2Fb: string): Round => ({
  id,
  prompt,
  options: rotate(
    [
      { label: w1, delta: 0, feedback: w1Fb },
      { label: right, delta: 1, feedback: rightFb },
      { label: w2, delta: 0, feedback: w2Fb },
    ],
    Number(id.slice(1)),
  ),
});

const ROUNDS: Round[] = [
  mk("r1", "The finance director says: we want a chatbot for invoices.", "Invoices sit unkeyed, so staff keep chasing their status.", "Right. The lookups are a symptom. Keying is the problem. Ask how many lookups happen a day, and why.", "They want a modern interface for the finance team.", "Possible, but nobody pays for an interface. Ask what the interface would save.", "They need a model that understands invoices.", "That is a solution, not a problem. The model is a means."),
  mk("r2", "The accounts payable manager says: our OCR is bad, we need a better OCR.", "Wrong totals reach the finance system because nothing checks them.", "Right. A better reader helps, but the missing check is the real gap.", "They need a more accurate text reader.", "It may be true. Measure first, since many bad totals come from the checks that are missing.", "They need to replace the whole pipeline.", "A rebuild is a guess until you know where the errors enter."),
  mk("r3", "The CFO says: we need it to be 99 percent accurate.", "A wrong payment is costly and a slow review queue is cheap, so route doubt to people.", "Right. Accuracy is a price list. Decide the cost of each wrong outcome, then set thresholds.", "They want the best model available.", "A bigger model does not give you a number. It gives you a different error pattern.", "They want a guarantee in the contract.", "A number in a contract with no figure for today is a trap for you."),
  mk("r4", "The head of operations says: we need to process invoices faster.", "Invoices wait days in a queue before anyone opens them, so the delay is the queue.", "Right. Extraction takes seconds. Find where the time goes before you speed anything up.", "The extraction step takes too long.", "Check that first. It is rarely where days go.", "They need more staff in accounts payable.", "That may be so, but it is a staffing answer. Measure waiting time first."),
  mk("r5", "The IT lead says: we need the data to stay in our tenant.", "A residency or policy rule limits which services you may use, so ask for the rule itself.", "Right. Ask for the written policy. It decides your model and storage options.", "They do not trust the vendor.", "Perhaps, but guessing at motives wastes the call. Ask for the rule.", "They want to run every model themselves.", "That is a jump. The rule may allow a hosted endpoint in their region."),
];

export default function C01ProblemReframe(props: WidgetProps) {
  return (
    <Rounds
      {...props}
      className="fde-craft-problem-reframe"
      lede="Five things the Harbour Supplies team said on the first call. For each, pick the underlying problem most likely to be behind it."
      rounds={ROUNDS}
      meterLabel="Reframes found"
      start={0}
      passAt={4}
      goodText="You asked what is behind the request before accepting it. That is the habit that saves a pilot."
      badText="You took requests at face value. In each miss, the follow-up question was about cost, volume or a rule."
      foot="Illustrative scenario. Harbour Supplies is a fictional customer, and the likely cause in each case is a judgement."
      noun="reframes found"
    />
  );
}
