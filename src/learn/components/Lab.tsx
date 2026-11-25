import { useContext } from "react";
import type { Lab as LabT } from "../content/types.ts";
import { toggleLabStep, useChapterProgress } from "../engine/progress.ts";
import { CopyButton } from "./CopyButton.tsx";
import { InPanel } from "./Bookmark.tsx";
import { Inline } from "./Narration.tsx";

function Cmd({ label, text }: { label: string; text: string }) {
  return (
    <div className="cmd">
      <span className="label">{label}</span>
      <code>{text}</code>
      <CopyButton text={text} />
    </div>
  );
}

export function LabPanel({ lab, chapterId }: { lab: LabT; chapterId: string }) {
  const progress = useChapterProgress(chapterId);
  const inPanel = useContext(InPanel);
  return (
    <section className="lab" id={inPanel ? undefined : "lab"} aria-labelledby="lab-title">
      <div className="lab-head">
        <div className="eyebrow">Lab, about {lab.minutes} minutes</div>
        <h2 id="lab-title">{lab.title}</h2>
        <p style={{ margin: 0 }}><Inline text={lab.goal} /></p>
      </div>
      <div className="lab-body">
        {lab.files.length > 0 && (
          <>
            <div className="w-label">Files you will create or edit</div>
            <div className="file-list">{lab.files.map((f) => <span key={f} className="w-chip">{f}</span>)}</div>
          </>
        )}
        <ol className="lab-steps">
          {lab.steps.map((s, i) => {
            const done = progress.labDone.includes(i);
            return (
              <li key={i} className={`lab-step ${done ? "done" : ""}`}>
                <div className="num" aria-hidden>{done ? "✓" : i + 1}</div>
                <div>
                  <h4>
                    <span>{s.title}</span>
                    <label className="w-chip" style={{ cursor: "pointer", fontWeight: "var(--w-text)" }}>
                      <input type="checkbox" checked={done} onChange={() => toggleLabStep(chapterId, i)} style={{ accentColor: "var(--accent)" }} /> done
                    </label>
                  </h4>
                  <p><Inline text={s.text} /></p>
                  {s.code && (
                    <div className="code-wrap">
                      <div className="code-top"><span>code</span><CopyButton text={s.code} /></div>
                      <pre><code>{s.code}</code></pre>
                    </div>
                  )}
                  {s.test && <Cmd label="Test" text={s.test} />}
                </div>
              </li>
            );
          })}
        </ol>
        <hr />
        <Cmd label="Verify" text={lab.verify} />
      </div>
    </section>
  );
}
