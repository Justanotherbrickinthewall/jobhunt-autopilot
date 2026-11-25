import { useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents02ErrorReplay.css";

type FaultId = "wrong-section" | "db-down" | "control-c";
type DesignId = "escape" | "bare" | "hint" | "catch-all";
type Who = "model" | "tool" | "run";
type Line = { who: Who; text: string };
type Outcome = { tone: "good" | "bad"; short: string; calls: string; lines: Line[]; why: string };

const WHO_LABEL: Record<Who, string> = { model: "Model", tool: "Tool", run: "Run" };

const FAULTS: { id: FaultId; label: string; setup: string }[] = [
  { id: "wrong-section", label: "A section that does not exist", setup: 'The model asks for the section "Motivation". PEP 572 has no such section.' },
  { id: "db-down", label: "The database is down", setup: 'The model asks for the section "Rationale", which exists. The database refuses the connection.' },
  { id: "control-c", label: "Control C during the call", setup: 'The model asks for the section "Rationale". The call hangs, and the operator presses Control C.' },
];

const DESIGNS: { id: DesignId; letter: string; name: string; what: string }[] = [
  { id: "escape", letter: "A", name: "Let the error escape", what: "The tool has no handler." },
  { id: "bare", letter: "B", name: "Return the word Error", what: "The tool catches ordinary exceptions and returns that one word." },
  { id: "hint", letter: "C", name: "Return an error and a hint", what: "The tool catches ordinary exceptions and returns what went wrong and what to try next." },
  { id: "catch-all", letter: "D", name: "Catch everything", what: "The tool catches every exception, including Control C." },
];

const call = (section: string): Line => ({ who: "model", text: `read_pep_section(572, "${section}")` });
const again: Line = { who: "model", text: "Makes the same call again." };
const word: Line = { who: "tool", text: "Error" };

const wrongSectionFixed: Line[] = [
  call("Motivation"),
  { who: "tool", text: `{"error": "PEP 572 has no section called 'Motivation'.", "hint": "Its sections are: Abstract; Rationale; Syntax and semantics."}` },
  call("Rationale"),
  { who: "tool", text: "The text of the Rationale section." },
  { who: "model", text: "Answers, and cites the section." },
];

const dbDownHonest: Line[] = [
  call("Rationale"),
  {
    who: "tool",
    text: `{"error": "read_pep_section failed with OperationalError: connection refused", "hint": "This is a fault in the tool, not your arguments. Try once more, or answer without it."}`,
  },
  { who: "model", text: "Tries once more." },
  { who: "tool", text: "The same error comes back." },
  { who: "model", text: "Tells the user the PEP could not be read just now." },
];

const hang: Line = { who: "tool", text: "The call hangs. The operator presses Control C." };
const stops = (why: string): Line[] => [call("Rationale"), hang, { who: "run", text: why }, { who: "run", text: "The run stops at once." }];

// A scripted replay for every fault and tool design. These are teaching scripts, not measurements.
const OUTCOMES: Record<FaultId, Record<DesignId, Outcome>> = {
  "wrong-section": {
    escape: {
      tone: "bad",
      short: "Crashed",
      calls: "1",
      lines: [call("Motivation"), { who: "tool", text: "The function raises an error. Nothing catches it." }, { who: "run", text: "The run ends. The user sees a server error." }],
      why: "The model never learned that the section name was wrong. One bad argument ended the whole run.",
    },
    bare: {
      tone: "bad",
      short: "Wasted calls",
      calls: "4",
      lines: [call("Motivation"), word, again, word, call("Introduction"), word, { who: "model", text: "Gives up and answers from memory, with no citation." }],
      why: "The word Error names nothing. The model can only guess, and each guess costs a call. The answer ends up with no source.",
    },
    hint: {
      tone: "good",
      short: "Fixed in one step",
      calls: "3",
      lines: wrongSectionFixed,
      why: "The hint listed real section names, so the model corrected itself on the next call.",
    },
    "catch-all": {
      tone: "good",
      short: "Fixed in one step",
      calls: "3",
      lines: wrongSectionFixed,
      why: "The same result as design C. This fault is an ordinary error, so catching more changes nothing yet.",
    },
  },
  "db-down": {
    escape: {
      tone: "bad",
      short: "Crashed",
      calls: "1",
      lines: [call("Rationale"), { who: "tool", text: "The database refuses the connection. The error escapes." }, { who: "run", text: "The run ends. The user sees a server error." }],
      why: "A passing outage ended the whole run. The model could have told the user, or answered without the tool.",
    },
    bare: {
      tone: "bad",
      short: "Blind retries",
      calls: "4",
      lines: [call("Rationale"), word, again, word, again, word, { who: "model", text: "Answers from memory, with no citation." }],
      why: "The word Error does not say whether the tool or the argument is at fault. The model repeats the call and gets the same word.",
    },
    hint: {
      tone: "good",
      short: "Honest answer",
      calls: "3",
      lines: dbDownHonest,
      why: "The hint separates a fault in the tool from a bad argument. The model retried once, then said what happened.",
    },
    "catch-all": {
      tone: "good",
      short: "Honest answer",
      calls: "3",
      lines: dbDownHonest,
      why: "The same result as design C. A database fault is an ordinary exception.",
    },
  },
  "control-c": {
    escape: {
      tone: "good",
      short: "Stops",
      calls: "1",
      lines: stops("Python raises KeyboardInterrupt. Nothing catches it."),
      why: "A crash should crash. The operator asked for a stop and got one.",
    },
    bare: {
      tone: "good",
      short: "Stops",
      calls: "1",
      lines: stops("Python raises KeyboardInterrupt. The handler catches ordinary exceptions only, so it passes through."),
      why: "Control C is not an ordinary exception, so this handler lets it through. Design B fails the first two faults, not this one.",
    },
    hint: {
      tone: "good",
      short: "Stops",
      calls: "1",
      lines: stops("Python raises KeyboardInterrupt. The handler catches ordinary exceptions only, so it passes through."),
      why: "This is the shape of safely. It returns a hint for an ordinary exception and lets Control C through.",
    },
    "catch-all": {
      tone: "bad",
      short: "Cannot stop",
      calls: "2 and counting",
      lines: [
        call("Rationale"),
        hang,
        { who: "tool", text: `{"error": "read_pep_section failed with KeyboardInterrupt", "hint": "Try once more, or answer without it."}` },
        { who: "model", text: "Takes the hint and calls the tool again." },
        { who: "run", text: "The operator presses Control C again. The same thing happens." },
        { who: "run", text: "The only way out is to kill the process." },
      ],
      why: "The handler turned a stop request into a tool result, and the model carried on. Nobody can end the run from the keyboard.",
    },
  },
};

const NEEDED = 6;

const PICK_VERDICT: Record<DesignId, string> = {
  escape: "Design A crashed on two of the three faults. A tool that raises gives the model nothing to act on, and it ends the run.",
  bare: "Design B never gives the model a reason. It retried blind and answered without a source.",
  hint: "Design C is the only one that gives the model something to act on for both ordinary faults and still lets Control C stop the run. That is the shape of safely, which you write in lab step 2.",
  "catch-all": "Design D handled the first two faults. Look at its Control C cell. It swallowed the stop, so nobody can end the run from the keyboard.",
};

export default function Agents02ErrorReplay({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [active, setActive] = useState<{ fault: FaultId; design: DesignId } | null>(null);
  const [seen, setSeen] = useState<Set<string>>(() => new Set());
  const [pick, setPick] = useState<DesignId | null>(null);
  const [attempts, setAttempts] = useState(0);

  const open = (fault: FaultId, design: DesignId) => {
    setActive({ fault, design });
    setSeen((s) => new Set(s).add(`${fault}:${design}`));
  };
  const choose = (design: DesignId) => {
    const n = attempts + 1;
    setAttempts(n);
    setPick(design);
    if (design === "hint") complete("Chose the error-and-hint design for tool failures");
    else if (n >= 2) complete("Needed the replay to see why the hint design wins");
  };

  const shown = active ? OUTCOMES[active.fault][active.design] : null;
  const ready = seen.size >= NEEDED;
  const right = pick === "hint";

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel agents02-error-replay">
        <p className="agents02-error-replay-note">
          A scripted replay, not a measurement. The user asked why PEP 572 added the walrus operator. The model reads one section of the PEP, and something goes wrong.
        </p>

        <dl className="agents02-error-replay-designs">
          {DESIGNS.map((d) => (
            <div key={d.id} className="agents02-error-replay-design">
              <dt>
                <span className="w-chip">{d.letter}</span> {d.name}
              </dt>
              <dd>{d.what}</dd>
            </div>
          ))}
        </dl>

        <div className="agents02-error-replay-faults">
          {FAULTS.map((f) => (
            <div key={f.id} className="agents02-error-replay-fault">
              <span className="w-label">{f.label}</span>
              <div className="agents02-error-replay-cells" role="group" aria-label={`Replay ${f.label}`}>
                {DESIGNS.map((d) => {
                  const done = seen.has(`${f.id}:${d.id}`);
                  const isActive = active?.fault === f.id && active.design === d.id;
                  const o = OUTCOMES[f.id][d.id];
                  const cls = ["agents02-error-replay-cell"];
                  if (done) cls.push(o.tone === "good" ? "is-good" : "is-bad");
                  if (isActive) cls.push("is-active");
                  return (
                    <button
                      key={d.id}
                      type="button"
                      className={cls.join(" ")}
                      aria-pressed={isActive}
                      aria-label={`Design ${d.letter}, ${d.name}${done ? `, seen: ${o.short}` : ""}`}
                      onClick={() => open(f.id, d.id)}
                    >
                      <strong>{d.letter}</strong>
                      <span>{done ? o.short : "Replay"}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {shown && active && (
          <motion.div key={`${active.fault}:${active.design}`} className="agents02-error-replay-run w-inset" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <p className="agents02-error-replay-setup">{FAULTS.find((f) => f.id === active.fault)!.setup}</p>
            <ol className="agents02-error-replay-lines">
              {shown.lines.map((l, i) => (
                <li key={i}>
                  <span className="agents02-error-replay-who">{WHO_LABEL[l.who]}</span>
                  <span className="w-mono">{l.text}</span>
                </li>
              ))}
            </ol>
            <div className={`w-verdict ${shown.tone}`} role="status">
              <strong>{shown.short}.</strong> Model calls: {shown.calls}. {shown.why}
            </div>
          </motion.div>
        )}

        <p className="agents02-error-replay-progress">
          Replayed {seen.size} of {FAULTS.length * DESIGNS.length}.
        </p>

        {ready && (
          <fieldset className="agents02-error-replay-pick">
            <legend className="w-label">Which design would you ship?</legend>
            <div className="agents02-error-replay-chips">
              {DESIGNS.map((d) => (
                <button key={d.id} type="button" className={`w-chip${pick === d.id ? " is-on" : ""}`} aria-pressed={pick === d.id} onClick={() => choose(d.id)}>
                  {d.letter}. {d.name}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {ready && pick && (
          <div className={`w-verdict ${right ? "good" : "bad"}`} role="status">
            <strong>{right ? "Right." : "Not that one."}</strong> {PICK_VERDICT[pick]}
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
