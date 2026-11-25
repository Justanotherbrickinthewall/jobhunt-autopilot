import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Agents19StaleWrite.css";

type Who = "A" | "B";
type Seen = Record<Who, number | null>;

export default function Agents19StaleWrite({ onComplete }: WidgetProps) {
  const [version, setVersion] = useState(0);
  const [draft, setDraft] = useState("(empty)");
  const [seen, setSeen] = useState<Seen>({ A: null, B: null });
  const [log, setLog] = useState<string[]>([]);
  const [rejected, setRejected] = useState<Who | null>(null);
  const [recovered, setRecovered] = useState(false);
  const complete = useComplete(onComplete);

  function read(w: Who) {
    setSeen({ ...seen, [w]: version });
    setLog([...log, `${w} reads the board at v${version}.`]);
  }
  function write(w: Who) {
    const s = seen[w];
    if (s === null) return;
    if (s !== version) {
      setLog([...log, `${w} writes the draft. Rejected: ${w} read v${s}, the board is at v${version}.`]);
      setRejected(w);
      return;
    }
    const n = version + 1;
    setVersion(n);
    setDraft(`Draft from ${w}`);
    setSeen({ ...seen, [w]: n });
    setLog([...log, `${w} writes the draft. Accepted, the board is now v${n}.`]);
    if (rejected === w && !recovered) {
      setRecovered(true);
      complete(`${w} was rejected, re-read and wrote on the new version`);
    }
  }
  function reset() {
    setVersion(0); setDraft("(empty)"); setSeen({ A: null, B: null }); setLog([]); setRejected(null); setRecovered(false);
  }

  return (
    <div className="w-panel agents19-stale-write">
      <p className="agents19-stale-write-note">Two writers share the draft section. Both read, then both write. Make the second write fail, then let that writer recover.</p>
      <p className="agents19-stale-write-board" aria-live="polite">Board v{version}, draft: {draft}</p>
      <div className="agents19-stale-write-grid">
        {(["A", "B"] as Who[]).map((w) => (
          <div key={w} className="agents19-stale-write-col">
            <p className="agents19-stale-write-who">Writer {w} {seen[w] === null ? "has not read yet" : `holds v${seen[w]}`}</p>
            <div className="w-row">
              <button type="button" className="w-btn" onClick={() => read(w)}>{w} reads</button>
              <button type="button" className="w-btn primary" disabled={seen[w] === null} onClick={() => write(w)}>{w} writes</button>
            </div>
          </div>
        ))}
      </div>
      <ol className="agents19-stale-write-log" aria-label="What happened">
        {log.map((l, i) => <li key={i}>{l}</li>)}
      </ol>
      {rejected && !recovered && (
        <p className="w-verdict bad" role="status">Writer {rejected} was rejected. Its copy of the board is old. Let {rejected} read again, then write.</p>
      )}
      {recovered && (
        <p className="w-verdict good" role="status">Writer {rejected} read the new board, saw the other draft and chose to write over it. The version check turned a silent overwrite into a visible rejection, so the overwrite is now a choice made after reading.</p>
      )}
      <div className="w-row">
        <button type="button" className="w-btn ghost" onClick={reset}>Start again</button>
      </div>
    </div>
  );
}
