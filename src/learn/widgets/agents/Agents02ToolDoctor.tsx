import { useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents02ToolDoctor.css";

type Case = {
  title: string;
  definition: string;
  options: string[];
  answer: number;
  why: string;
};

// Hand-authored first drafts of tools for the PEP desk. Some are the desk's own tools, some are tools it does not have.
// Correct answers sit at varied positions.
const CASES: Case[] = [
  {
    title: "Draft 1 of 6",
    definition: `name: do_pep_thing
description: "Handles PEP stuff."
parameters: query (string)`,
    options: [
      "Rename it to pep_tool_v2 so the version is clear.",
      "Add a paragraph to the system prompt that explains what do_pep_thing does.",
      "Rename it search_peps. Say what it returns and its limit, and that it changes nothing.",
      "Add a required argument called mode, and list the allowed modes in the prompt.",
    ],
    answer: 2,
    why: "The name and description are the whole interface. A prompt paragraph pays for the same words on every model call and still leaves the tool list unreadable. A verb and a noun, a return shape and a limit let the model choose without help.",
  },
  {
    title: "Draft 2 of 6",
    definition: `name: read_pep_section
description: "Read a PEP."
parameters: pep (string) "The PEP", section (string) "The section"`,
    options: [
      "Make pep an integer. Describe it as the PEP number, such as 572, taken from a search result.",
      "Match the text loosely, so PEP 572, pep572 and 572 all work.",
      "Make pep optional, and default to the last PEP the model read.",
      "Add the words please be careful to the description.",
    ],
    answer: 0,
    why: "A free-text field invites the model to invent a value. Loose matching hides the mistake, and a default reads the wrong PEP without saying so. A number copied from an earlier result leaves nothing to invent.",
  },
  {
    title: "Draft 3 of 6",
    definition: `name: search_peps
description: "Finds PEP text."

name: find_peps
description: "Finds text in PEPs."

Logs of past runs show the model choosing between them at random.`,
    options: [
      "Add a line to the system prompt that says to prefer search_peps.",
      "Rename find_peps to search_peps_v2.",
      "Let the model call both, and compare the answers.",
      "Keep one search tool. If a second is needed, say in each description when to use it instead of the other.",
    ],
    answer: 3,
    why: "Two near-identical tools make the model guess. A prompt rule patches one case, a rename changes nothing the model can read, and calling both doubles the cost. Give each tool one job, and say in its description when the other one is the better choice.",
  },
  {
    title: "Draft 4 of 6",
    definition: `name: read_pep
parameters: pep (integer)
returns: the whole PEP, about 30,000 characters in this example`,
    options: [
      "Say in the description that the result may be long.",
      "Add a section argument. Cut the text at 8,000 characters, and set truncated to true when it cuts.",
      "Cut the text at 8,000 characters and say nothing else.",
      "Return only the title and the abstract.",
    ],
    answer: 1,
    why: "A warning does not shrink the result. A silent cut makes the model treat part of a section as the whole. The title and abstract hide the section the user asked about. A section argument, a limit and a truncated flag cut the cost and keep the model informed.",
  },
  {
    title: "Draft 5 of 6",
    definition: `name: read_pep_section
when the section name is wrong, returns:
{"error": "Not found"}`,
    options: [
      "Return the full stack trace, so the model can debug it.",
      "Return HTTP 500 and let the framework retry.",
      "Name the section it asked for, list the real section names, and say what to try next.",
      "Return the code 4012, and explain it in the system prompt.",
    ],
    answer: 2,
    why: "The model reads an error as text, and that text is all it knows. A trace costs tokens and exposes internals. A retry cannot fix a wrong name. The name it asked for and the real list let the model correct itself in one turn.",
  },
  {
    title: "Draft 6 of 6",
    definition: `name: pep_tool
parameters: action ("search" | "read_section" | "lint"), query, pep, section, code`,
    options: [
      "Split it into one tool per task. Each gets its own description and only the fields it needs.",
      "Keep it, and say in the description which fields each action uses.",
      "Make action free text, so the model can describe what it wants.",
      "Add a lint option to every other action, so one call can do more.",
    ],
    answer: 0,
    why: "A tool is one task. In a catch-all tool most fields do not apply to most calls, so the model fills them wrongly, and no description can cover every combination. Separate tools each get a clear description and a schema that fits.",
  },
];

export default function Agents02ToolDoctor({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<number[][]>(() => CASES.map(() => []));
  const [finished, setFinished] = useState(false);

  const current = CASES[index];
  const mine = picks[index];
  const resolved = mine.includes(current.answer) || mine.length >= 2;
  const lastRight = mine[mine.length - 1] === current.answer;
  const firstTry = picks.filter((p, i) => p[0] === CASES[i].answer).length;

  const choose = (opt: number) => {
    if (resolved || mine.includes(opt)) return;
    setPicks((all) => all.map((p, i) => (i === index ? [...p, opt] : p)));
  };
  const next = () => {
    if (index < CASES.length - 1) {
      setIndex(index + 1);
    } else {
      setFinished(true);
      complete(`${firstTry} of ${CASES.length} tool fixes right on the first try`);
    }
  };
  const restart = () => {
    setPicks(CASES.map(() => []));
    setIndex(0);
    setFinished(false);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-panel agents02-tool-doctor">
        <p className="agents02-tool-doctor-note">Illustrative first drafts of tools for the PEP desk. Each has one flaw. Choose the fix.</p>

        <svg
          className="agents02-tool-doctor-strip"
          viewBox={`0 0 ${CASES.length * 28} 16`}
          role="img"
          aria-label={`Progress: ${picks.filter((p, i) => p.includes(CASES[i].answer) || p.length >= 2).length} of ${CASES.length} done, ${firstTry} right on the first try`}
        >
          {CASES.map((c, i) => {
            const p = picks[i];
            const done = p.includes(c.answer) || p.length >= 2;
            const fill = !done ? (i === index && !finished ? "var(--accent)" : "var(--surface-2)") : p[0] === c.answer ? "var(--teal)" : "var(--rose)";
            return <circle key={i} cx={14 + i * 28} cy={8} r={6} fill={fill} />;
          })}
        </svg>

        {!finished && (
          <>
            <motion.div key={index} className="agents02-tool-doctor-card w-inset" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              <span className="w-label">{current.title}</span>
              <pre className="agents02-tool-doctor-def w-mono">{current.definition}</pre>
            </motion.div>

            <div className="agents02-tool-doctor-options" role="group" aria-label="Choose a fix">
              {current.options.map((text, i) => {
                const picked = mine.includes(i);
                const right = resolved && i === current.answer;
                const cls = ["agents02-tool-doctor-opt"];
                if (right) cls.push("is-right");
                if (picked && i !== current.answer) cls.push("is-wrong");
                return (
                  <button key={i} type="button" className={cls.join(" ")} aria-pressed={picked} disabled={resolved || picked} onClick={() => choose(i)}>
                    {text}
                  </button>
                );
              })}
            </div>

            {mine.length > 0 && (
              <div className={`w-verdict ${lastRight ? "good" : "bad"}`} role="status">
                <strong>{lastRight ? "Correct." : resolved ? "The right fix is marked above." : "Not quite. Pick again."}</strong> {current.why}
              </div>
            )}

            <div className="w-row">
              <button type="button" className="w-btn primary" disabled={!resolved} onClick={next}>
                {index < CASES.length - 1 ? "Next draft" : "See result"}
              </button>
            </div>
          </>
        )}

        {finished && (
          <>
            <div className={`w-verdict ${firstTry >= 5 ? "good" : "bad"}`} role="status">
              <strong>
                You fixed {firstTry} of {CASES.length} on the first try.
              </strong>{" "}
              Every fix did the same job. It removed a choice the model could get wrong, whether in a name, a field, a tool list, a result or an error.
            </div>
            <div className="w-row">
              <button type="button" className="w-btn ghost" onClick={restart}>
                Try again
              </button>
            </div>
          </>
        )}
      </div>
    </MotionConfig>
  );
}
