import { useState } from "react";
import { motion } from "motion/react";
import type { WidgetProps } from "../types";
import { useCompleteOnce } from "./c04-06-shared";
import "./Ch04.css";

const PRECISIONS = [
  { id: "f32", label: "float32", bytes: 4 },
  { id: "f16", label: "float16", bytes: 2 },
  { id: "i8", label: "int8", bytes: 1 },
  { id: "bin", label: "binary", bytes: 1 / 8 },
] as const;

function human(bytes: number) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = bytes;
  let i = 0;
  while (v >= 1000 && i < units.length - 1) {
    v /= 1000;
    i++;
  }
  return `${v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : v.toFixed(0)} ${units[i]}`;
}

export default function C04StorageCalc({ onComplete }: WidgetProps) {
  const complete = useCompleteOnce(onComplete);
  const [chunks, setChunks] = useState(1_000_000);
  const [dims, setDims] = useState(1024);
  const [tokens, setTokens] = useState(400);
  const [price, setPrice] = useState(0.1);
  const [prec, setPrec] = useState<(typeof PRECISIONS)[number]["id"]>("f32");
  const [guess, setGuess] = useState("");
  const [checked, setChecked] = useState(false);

  const bytesPer = PRECISIONS.find((p) => p.id === prec)!.bytes;
  const total = chunks * dims * bytesPer;
  const f32 = chunks * dims * 4;
  const tokensTotal = chunks * tokens;
  const embedCost = (tokensTotal / 1_000_000) * price;

  // The question is fixed: one million chunks, 1024 dimensions, float32.
  const truth = 1_000_000 * 1024 * 4; // 4.096e9 bytes
  const guessNum = Number(guess);
  const ratio = guessNum > 0 ? guessNum / (truth / 1e9) : 0;
  const near = ratio > 0.8 && ratio < 1.25;

  function check() {
    if (!guess) return;
    setChecked(true);
    complete(near ? "Estimated vector memory within 25 percent." : `Estimated ${guess} GB; the answer is about 4.1 GB.`);
  }

  return (
    <div className="w-panel">
      <p style={{ margin: "0 0 6px", fontSize: "0.95rem" }}>
        <strong>Predict first.</strong> One million chunks, 1024 dimensions, stored as float32. How many gigabytes do the
        raw vectors take, before any index overhead?
      </p>
      <div className="c04-storage-calc-guess">
        <input
          inputMode="decimal"
          aria-label="Your estimate in gigabytes"
          placeholder="GB"
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          disabled={checked}
        />
        <button className="w-btn primary" onClick={check} disabled={checked || !guess}>Check</button>
      </div>
      {checked && (
        <div className={`w-verdict ${near ? "good" : "bad"}`}>
          {near ? "Close enough. " : "Off. "}
          One million times 1024 times 4 bytes is 4.096 billion bytes, about 4.1 GB. The rule: chunks times dimensions
          times bytes per number. Now use the sliders to see what each decision costs.
        </div>
      )}

      <div className="c04-storage-calc-grid" style={{ marginTop: 14 }}>
        <label>
          <span>Chunks</span>
          <input type="range" min={3} max={8} step={0.05} value={Math.log10(chunks)}
            onChange={(e) => setChunks(Math.round(10 ** Number(e.target.value)))} aria-label="Number of chunks, logarithmic" />
          <span className="c04-storage-calc-val">{chunks.toLocaleString("en-GB")}</span>
        </label>
        <label>
          <span>Dimensions</span>
          <input type="range" min={0} max={5} step={1} value={[128, 256, 512, 1024, 1536, 3072].indexOf(dims)}
            onChange={(e) => setDims([128, 256, 512, 1024, 1536, 3072][Number(e.target.value)])} aria-label="Embedding dimensions" />
          <span className="c04-storage-calc-val">{dims}</span>
        </label>
        <label>
          <span>Tokens per chunk</span>
          <input type="range" min={50} max={1000} step={10} value={tokens}
            onChange={(e) => setTokens(Number(e.target.value))} aria-label="Average tokens per chunk" />
          <span className="c04-storage-calc-val">{tokens}</span>
        </label>
        <label>
          <span>Price per 1M tokens</span>
          <input type="number" min={0} step={0.01} value={price} onChange={(e) => setPrice(Math.max(0, Number(e.target.value)))}
            aria-label="Price in your currency per million tokens" />
          <span className="c04-storage-calc-val">yours</span>
        </label>
      </div>

      <div className="w-row" role="group" aria-label="Number precision" style={{ flexWrap: "wrap", gap: 6, marginTop: 10 }}>
        {PRECISIONS.map((p) => (
          <button key={p.id} className={`w-chip ${prec === p.id ? "primary" : ""}`}
            aria-pressed={prec === p.id} onClick={() => setPrec(p.id)}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="c04-storage-calc-bars">
        <div className="c04-storage-calc-bar">
          <span>Vectors</span>
          <div className="c04-storage-calc-track">
            <motion.div className="c04-storage-calc-fill" initial={false}
              animate={{ width: `${Math.max(1.5, (total / f32) * 100)}%` }} transition={{ duration: 0.25 }} />
          </div>
          <span className="c04-storage-calc-val">{human(total)}</span>
        </div>
        <div className="c04-storage-calc-bar">
          <span>Embed once</span>
          <div className="c04-storage-calc-track">
            <motion.div className="c04-storage-calc-fill" style={{ background: "var(--amber)" }} initial={false}
              animate={{ width: `${Math.min(100, Math.max(1.5, Math.log10(Math.max(1, tokensTotal)) / 10 * 100))}%` }}
              transition={{ duration: 0.25 }} />
          </div>
          <span className="c04-storage-calc-val">{(tokensTotal / 1e6).toLocaleString("en-GB", { maximumFractionDigits: 0 })}M tok</span>
        </div>
      </div>
      <p className="c04-embedding-map-note">
        Embedding the corpus once costs about {embedCost.toLocaleString("en-GB", { maximumFractionDigits: 2 })} at your price.
        Changing model means paying that again, because vectors from two models cannot be compared. Index overhead
        comes on top of the vector size, and it depends on the index type. Chapter five covers it. The price box starts
        at a placeholder of 0.1. Vendors change prices, so put in the current one.
      </p>
    </div>
  );
}
