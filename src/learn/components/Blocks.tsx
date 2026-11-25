import type { ReactNode } from "react";
import { optionOrder } from "../engine/optionOrder.ts";
import { clearQuiz, recordQuiz, setStepDone, useChapterProgress } from "../engine/progress.ts";
import type { Block } from "../content/types.ts";
import type { NarrUnit } from "../engine/text.ts";
import { Bookmarkable, blockText, ItemBookmark } from "./Bookmark.tsx";
import { CopyButton } from "./CopyButton.tsx";
import { Inline, NarratedBlock, useActiveWord } from "./Narration.tsx";
import { WidgetHost } from "./WidgetHost.tsx";

export const TONE_LABEL = { insight: "Insight", warn: "Watch out", interview: "In interviews", analogy: "Analogy" } as const;
export const FOLD_LABEL = { plain: "In plain words", hood: "Under the hood", industry: "In industry", dyk: "Did you know", trouble: "Troubleshooting" } as const;

function Quiz({ block, chapterId, sectionId, index }: { block: Extract<Block, { kind: "quiz" }>; chapterId: string; sectionId: string; index: number }) {
  const progress = useChapterProgress(chapterId);
  const given = progress.quiz[block.id];
  return (
    <div className="quiz" role="group" aria-label="Quick check">
      <div className="eyebrow">Check yourself</div>
      <p className="quiz-q"><Inline text={block.question} /></p>
      <div className="quiz-opts">
        {optionOrder(block).map((i, pos) => {
          const o = block.options[i];
          const state = given ? (i === block.answer ? "right" : i === given.choice ? "wrong" : "") : "";
          return (
            <button
              key={i}
              type="button"
              className={`quiz-opt ${state}`}
              disabled={!!given}
              onClick={() => recordQuiz(chapterId, block.id, i, i === block.answer)}
            >
              <span className="k">{String.fromCharCode(65 + pos)}</span>
              <span><Inline text={o} /></span>
            </button>
          );
        })}
      </div>
      {given && (
        <div className={`w-verdict explain bm-host inner ${given.correct ? "good" : "bad"}`}>
          <ItemBookmark sectionId={sectionId} index={index} kind="quiz" text={blockText(block)} what="this explanation" />
          <strong>{given.correct ? "Right. " : "Not quite. "}</strong>
          <Inline text={block.explain} />
          <div style={{ marginTop: "0.6rem" }}>
            <button type="button" className="btn ghost small" onClick={() => clearQuiz(chapterId, block.id)}>Try again</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Step({ block, unit, chapterId }: { block: Extract<Block, { kind: "step" }>; unit: NarrUnit | undefined; chapterId: string }) {
  const progress = useChapterProgress(chapterId);
  const done = !!progress.steps?.[block.id];
  const copyable = block.code ?? "";
  return (
    <div className={`step-card ${done ? "done" : ""}`} id={`step-${block.id}`}>
      <NarratedBlock unit={unit}>
        {(part) => (
          <>
            <div className="step-head">
              <label className="step-check">
                <input
                  type="checkbox"
                  checked={done}
                  onChange={(e) => setStepDone(chapterId, block.id, e.target.checked)}
                  aria-label={`Mark step done: ${block.title}`}
                />
              </label>
              <h4 className="step-title">{unit ? part(0) : <Inline text={block.title} />}</h4>
              {block.file && <span className="step-file">{block.file}</span>}
            </div>
            <p className="step-text">{unit ? part(1) : <Inline text={block.text} />}</p>
          </>
        )}
      </NarratedBlock>
      {block.code && (
        <div className="code-wrap">
          <div className="code-top"><span>{block.lang ?? "code"}</span><CopyButton text={copyable} /></div>
          <pre><code>{block.code}</code></pre>
        </div>
      )}
      {block.expect && (
        <div className="step-expect">
          <div className="step-expect-label">Expected output</div>
          <pre><code>{block.expect}</code></pre>
        </div>
      )}
    </div>
  );
}

// The row being read is the part whose character range holds the active token. Parts 0.. are the caption (if any), then one per row.
function Compare({ block, unit }: { block: Extract<Block, { kind: "compare" }>; unit: NarrUnit | undefined }) {
  const active = useActiveWord(unit?.key ?? "");
  const first = block.caption ? 1 : 0;
  const at = unit && active !== null ? unit.tokens[active]?.start ?? -1 : -1;
  const now = unit ? unit.parts.findIndex((p, i) => i >= first && p.length > 0 && at >= p.offset && at < p.offset + p.length) - first : -1;
  return (
    <NarratedBlock unit={unit}>
      {(part) => (
        <figure className="compare">
          <div className="compare-scroll">
            <table>
              <thead><tr>{block.columns.map((c, i) => <th key={i} scope="col"><Inline text={c} /></th>)}</tr></thead>
              <tbody>{block.rows.map((r, i) => <tr key={i} className={i === now ? "row-now" : undefined}>{r.map((c, j) => <td key={j}><Inline text={c} /></td>)}</tr>)}</tbody>
            </table>
          </div>
          {block.caption && <figcaption>{unit ? part(0) : <Inline text={block.caption} />}</figcaption>}
        </figure>
      )}
    </NarratedBlock>
  );
}

/** The label and title a side item shows on its marker and in the panel header. */
export function sideLabel(b: Block): { label: string; title: string } {
  switch (b.kind) {
    case "widget": return { label: "Try it", title: b.id.replace(/^.*[/.]/, "").replace(/[-_]+/g, " ").replace(/^./, (c) => c.toUpperCase()) };
    case "fold": return { label: FOLD_LABEL[b.tone], title: b.title };
    case "quiz": return { label: "Check yourself", title: b.question };
    case "callout": return { label: TONE_LABEL[b.tone], title: b.title };
    default: return { label: "", title: "" };
  }
}

export function BlockView({ block, unit, chapterId, sectionId, blockIndex, expanded }: { block: Block; unit: NarrUnit | undefined; chapterId: string; sectionId: string; blockIndex: number; expanded?: boolean }): ReactNode {
  const wrap = (children: ReactNode, opts: { wide?: boolean; what?: string; none?: boolean } = {}) => (
    <Bookmarkable sectionId={sectionId} index={blockIndex} kind={block.kind} text={opts.none ? "" : blockText(block)} wide={opts.wide} what={opts.what}>{children}</Bookmarkable>
  );
  switch (block.kind) {
    case "p":
      return wrap(<NarratedBlock unit={unit}>{(part) => <p>{unit ? part(0) : <Inline text={block.text} />}</p>}</NarratedBlock>, { what: "this paragraph" });
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return wrap(
        <NarratedBlock unit={unit}>
          {(part) => (
            <Tag>
              {block.items.map((it, i) => (
                <li key={i} className="bm-host">
                  {unit ? part(i) : <Inline text={it} />}
                  <ItemBookmark sectionId={sectionId} index={blockIndex} kind="list" text={it} what="this list item" />
                </li>
              ))}
            </Tag>
          )}
        </NarratedBlock>,
        { none: true },
      );
    }
    case "callout":
      return wrap(
        <NarratedBlock unit={unit} className="callout" tone={block.tone}>
          {(part) => (
            <>
              <div className="callout-title">
                <span className="tone-label">{TONE_LABEL[block.tone]}</span>
                <span>{unit ? part(0) : <Inline text={block.title} />}</span>
              </div>
              <p>{unit ? part(1) : <Inline text={block.text} />}</p>
            </>
          )}
        </NarratedBlock>,
        { what: "this callout" },
      );
    case "code":
      return wrap(
        <div className="codeblock">
          <figure>
            <div className="code-wrap">
              <div className="code-top"><span>{block.lang}</span><CopyButton text={block.code} /></div>
              <pre><code>{block.code}</code></pre>
            </div>
            {block.caption && (
              <figcaption>
                <NarratedBlock unit={unit}>{(part) => <>{unit ? part(0) : <Inline text={block.caption!} />}</>}</NarratedBlock>
              </figcaption>
            )}
          </figure>
        </div>,
        { wide: true, what: "this code block" },
      );
    case "widget":
      return (
        <div className="widget-block">
          <div className="widget-badge">Try it</div>
          <p style={{ marginBottom: 0 }}><Inline text={block.intro} /></p>
          <div className="widget-stage"><WidgetHost id={block.id} chapterId={chapterId} /></div>
        </div>
      );
    case "fold":
      return wrap(
        <details className="fold" data-tone={block.tone} open={expanded || undefined}>
          <summary><span>{block.title}</span><span className="fold-tone">{FOLD_LABEL[block.tone]}</span></summary>
          <div className="fold-body"><p><Inline text={block.text} /></p></div>
        </details>,
        { what: "this fold" },
      );
    case "step":
      return wrap(<Step block={block} unit={unit} chapterId={chapterId} />, { wide: true, what: "this step" });
    case "quiz":
      return wrap(<Quiz block={block} chapterId={chapterId} sectionId={sectionId} index={blockIndex} />, { none: true });
    case "compare":
      return wrap(<Compare block={block} unit={unit} />, { wide: true, what: "this table" });
  }
}
