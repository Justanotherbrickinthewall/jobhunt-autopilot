import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./C08DataTriage.css";

// Rows are taken from labs/fde-craft/data/invoices.csv. Counts are for the whole 60-row file.
const SAMPLE = [
  { id: "R002", supplier: "Tideway Packaging", date: "08/01/2026", total: "3141.90" },
  { id: "R007", supplier: "TIDEWAY PACKAGING", date: "8 Jan 2026", total: "3141.90 GBP" },
  { id: "R009", supplier: "", date: "Jan 27, 2026", total: "GBP 3,722.24" },
  { id: "R014", supplier: "Brightwater Cleaning Services", date: "31/02/2026", total: "GBP 3,158.77" },
  { id: "R024", supplier: "Northgate Pallets Ltd", date: "2026-03-07", total: "€3.531,05" },
  { id: "R040", supplier: "Orchard Label Co", date: "Apr 20, 2026", total: "$354.41" },
  { id: "R057", supplier: "Northgate Pallets Ltd", date: "5 Jun 2026", total: "£3,287.60" },
];

type Problem = { id: string; name: string; rows: string; first: boolean; why: string };
const PROBLEMS: Problem[] = [
  {
    id: "dates",
    name: "Dates arrive in four formats",
    rows: "47 of 60 rows are not ISO, 17 use slashes",
    first: true,
    why: "It touches most of the file and it fails silently. A slash date read month first gives a wrong month with no error. Fix it early and write down that slash dates are day first.",
  },
  {
    id: "amounts",
    name: "Totals carry currency marks and decimal commas",
    rows: "Only 12 of 60 totals are bare numbers",
    first: true,
    why: "A total such as 3.531,05 read as 3.531 is off by a factor of a thousand, and every sum after it is wrong. Parse the mark and the separator once, in one function.",
  },
  {
    id: "duplicates",
    name: "The same invoice appears twice",
    rows: "6 rows, one tenth of the file",
    first: true,
    why: "Duplicates inflate every count and pay for model calls that add nothing. Drop them before the model sees the data.",
  },
  {
    id: "blank",
    name: "Suppliers are blank",
    rows: "3 rows",
    first: false,
    why: "A blank supplier is loud and rare. The row cannot be used, so it goes to the review queue. Count it and move on.",
  },
  {
    id: "unreadable",
    name: "A date or a total cannot be read at all",
    rows: "3 rows: two dates and one total",
    first: false,
    why: "Also loud and rare. Send the row to the review queue and report the count. Do not spend ten minutes guessing at TBC.",
  },
  {
    id: "mismatch",
    name: "Some totals differ from net amount plus VAT",
    rows: "4 rows",
    first: false,
    why: "Flag and count these, but do not fix them. Whether the invoice or the ledger is right is a question for the customer.",
  },
  {
    id: "quotes",
    name: "Descriptions hold commas, quotes and line breaks",
    rows: "46 rows",
    first: false,
    why: "A library CSV reader handles quoting in one call. It is a rule to follow, not a problem to solve, so it is not one of the first three.",
  },
];

export default function C08DataTriage({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [picked, setPicked] = useState<string[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [done, setDone] = useState(false);
  const [note, setNote] = useState("");

  function toggle(id: string) {
    if (done) return;
    setNote("");
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < 3 ? [...p, id] : p));
  }

  function check() {
    const right = picked.filter((id) => PROBLEMS.find((p) => p.id === id)?.first).length;
    const n = attempts + 1;
    setAttempts(n);
    if (right === 3) {
      setDone(true);
      complete("Dates, amounts and duplicates first");
    } else if (n >= 2) {
      setDone(true);
      complete(`${right} of 3 right after two tries`);
    } else {
      setNote(`${right} of your 3 are right. Ask two questions of each problem: how many rows does it touch, and does it change a number without any error? Then change your picks and check again.`);
    }
  }

  const right = picked.filter((id) => PROBLEMS.find((p) => p.id === id)?.first).length;

  return (
    <div className="w-panel fde-craft-data-triage">
      <p className="fde-craft-data-triage-lede">
        You have 10 minutes to read this file before you write any code. Here are 7 of its 60 rows. Pick the three problems to handle first. Counts come from the whole file.
      </p>
      <div className="fde-craft-data-triage-tablewrap">
        <table className="fde-craft-data-triage-table">
          <thead>
            <tr>
              <th>Row</th>
              <th>Supplier</th>
              <th>Date</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE.map((r) => (
              <tr key={r.id}>
                <td className="w-mono">{r.id}</td>
                <td>{r.supplier || <i>blank</i>}</td>
                <td className="w-mono">{r.date}</td>
                <td className="w-mono">{r.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="fde-craft-data-triage-count" role="status" aria-live="polite">
        {picked.length} of 3 chosen
      </div>
      <ul className="fde-craft-data-triage-list">
        {PROBLEMS.map((p) => {
          const on = picked.includes(p.id);
          const verdict = done ? (p.first ? "is-first" : "is-later") : "";
          return (
            <li key={p.id}>
              <button
                type="button"
                className={`fde-craft-data-triage-opt ${on ? "is-on" : ""} ${verdict}`}
                aria-pressed={on}
                onClick={() => toggle(p.id)}
                disabled={done}
              >
                <span className="fde-craft-data-triage-name">{p.name}</span>
                <span className="fde-craft-data-triage-rows w-mono">{p.rows}</span>
                {done && (
                  <span className="fde-craft-data-triage-why">
                    <b>{p.first ? "Handle first. " : "Handle later. "}</b>
                    {p.why}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {!done && (
        <button type="button" className="w-btn" onClick={check} disabled={picked.length !== 3}>
          Check my three
        </button>
      )}
      {note && !done && <p className="fde-craft-data-triage-note" role="status">{note}</p>}
      {done && (
        <div className={`w-verdict ${right === 3 ? "good" : "bad"}`} role="status">
          <strong>{right} of 3 right.</strong> The first three are the problems that touch many rows and change numbers silently: dates, amounts and duplicates. Loud, rare problems go to a person, and you say so aloud.
        </div>
      )}
      <p className="fde-craft-data-triage-foot">Counts are from the lab file, a fictional Harbour Supplies extract.</p>
    </div>
  );
}
