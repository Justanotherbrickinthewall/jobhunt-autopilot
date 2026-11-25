import { useState } from "react";
import type { WidgetProps } from "../types";
import { useComplete } from "../learn/useComplete";
import "./Cloud03InstanceSizer.css";

// The service in run.tf starts at a concurrency of 20 with a cap of 3 instances. The scenarios are invented.
const CONCURRENCY = [1, 5, 10, 20, 40, 80];
const CAPS = [1, 2, 3, 5, 10];

type Setting = { rate: number; seconds: number; concurrency: number; cap: number };
type Preset = { id: string; label: string; note: string; setting: Setting };

const PRESETS: Preset[] = [
  {
    id: "quiet",
    label: "Quiet morning on /ask",
    note: "30 questions a minute, each answer streaming for about 10 seconds.",
    setting: { rate: 30, seconds: 10, concurrency: 20, cap: 3 },
  },
  {
    id: "busy",
    label: "Busy hour on /ask",
    note: "180 questions a minute, each streaming for about 10 seconds.",
    setting: { rate: 180, seconds: 10, concurrency: 20, cap: 3 },
  },
  {
    id: "desk",
    label: "Desk runs on /agent",
    note: "90 desk runs a minute, each open for up to 60 seconds.",
    setting: { rate: 90, seconds: 60, concurrency: 20, cap: 3 },
  },
];

function work(s: Setting) {
  const open = (s.rate * s.seconds) / 60;
  const needed = Math.max(1, Math.ceil(open / s.concurrency));
  const slots = s.concurrency * s.cap;
  return { open, needed, slots, fits: open <= slots };
}

const n = (x: number) => Number(x.toFixed(1));

export default function Cloud03InstanceSizer({ onComplete }: WidgetProps) {
  const complete = useComplete(onComplete);
  const [s, setS] = useState<Setting>(PRESETS[1].setting);
  const [preset, setPreset] = useState<string | null>("busy");
  const [seen, setSeen] = useState({ fit: false, over: false });

  const apply = (next: Setting, presetId: string | null) => {
    setS(next);
    setPreset(presetId);
    const fits = work(next).fits;
    const nextSeen = { fit: seen.fit || fits, over: seen.over || !fits };
    setSeen(nextSeen);
    if (nextSeen.fit && nextSeen.over) complete("Saw a setting that fits the cap and one that overflows it");
  };
  const change = (patch: Partial<Setting>) => apply({ ...s, ...patch }, null);

  const w = work(s);
  const boxes = Math.max(w.needed, s.cap);
  const activePreset = PRESETS.find((p) => p.id === preset);

  return (
    <div className="w-panel cloud03-instance-sizer">
      <p className="cloud03-instance-sizer-note">Illustrative figures, not measured. Pick a scenario or move the controls.</p>

      <div className="cloud03-instance-sizer-presets" role="group" aria-label="Scenarios">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`w-chip${preset === p.id ? " is-on" : ""}`}
            aria-pressed={preset === p.id}
            onClick={() => apply(p.setting, p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>
      {activePreset && <p className="cloud03-instance-sizer-scenario">{activePreset.note}</p>}

      <div className="cloud03-instance-sizer-controls">
        <label className="cloud03-instance-sizer-field">
          <span className="w-label">Requests a minute: {s.rate}</span>
          <input
            type="range"
            min={10}
            max={300}
            step={10}
            value={s.rate}
            onChange={(e) => change({ rate: Number(e.target.value) })}
          />
        </label>
        <label className="cloud03-instance-sizer-field">
          <span className="w-label">Seconds each stream stays open: {s.seconds}</span>
          <input
            type="range"
            min={2}
            max={120}
            step={2}
            value={s.seconds}
            onChange={(e) => change({ seconds: Number(e.target.value) })}
          />
        </label>
        <div className="cloud03-instance-sizer-field">
          <span className="w-label">Concurrency of one instance</span>
          <div className="cloud03-instance-sizer-chips" role="group" aria-label="Concurrency">
            {CONCURRENCY.map((c) => (
              <button
                key={c}
                type="button"
                className={`w-chip${s.concurrency === c ? " is-on" : ""}`}
                aria-pressed={s.concurrency === c}
                onClick={() => change({ concurrency: c })}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="cloud03-instance-sizer-field">
          <span className="w-label">Maximum instances</span>
          <div className="cloud03-instance-sizer-chips" role="group" aria-label="Maximum instances">
            {CAPS.map((c) => (
              <button
                key={c}
                type="button"
                className={`w-chip${s.cap === c ? " is-on" : ""}`}
                aria-pressed={s.cap === c}
                onClick={() => change({ cap: c })}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        className="cloud03-instance-sizer-row"
        role="img"
        aria-label={`${w.needed} instances needed. The cap is ${s.cap}. ${w.fits ? "The streams fit." : "The streams overflow the cap."}`}
      >
        {Array.from({ length: boxes }, (_, i) => {
          const used = i < w.needed;
          const beyond = i >= s.cap;
          return (
            <span
              key={i}
              className={`cloud03-instance-sizer-box${used ? " used" : ""}${beyond ? " beyond" : ""}`}
              title={beyond ? "Beyond the cap, so Cloud Run would not start it" : used ? "In use" : "Spare"}
            >
              {i + 1}
            </span>
          );
        })}
      </div>

      <ul className="cloud03-instance-sizer-sums">
        <li>
          Streams open at once: {s.rate} times {s.seconds} divided by 60 is {n(w.open)}.
        </li>
        <li>
          Instances needed: {n(w.open)} divided by {s.concurrency}, rounded up, is {w.needed}.
        </li>
        <li>
          Slots under the cap: {s.concurrency} times {s.cap} is {w.slots}.
        </li>
      </ul>

      <div className={`w-verdict ${w.fits ? "good" : "bad"}`} role="status">
        {w.fits ? (
          <>
            The cap holds it. {n(w.open)} streams use {w.needed} of {s.cap} instances, and {n(w.slots - w.open)} slots are spare.
          </>
        ) : (
          <>
            Over the cap by {n(w.open - w.slots)} streams. You need {w.needed} instances and the cap is {s.cap}. Cloud Run starts no
            instance beyond the cap. Raise the concurrency, raise the cap, or shorten the streams.
          </>
        )}
      </div>
      <p className="cloud03-instance-sizer-note">
        This is a lower bound from averages. Cloud Run also watches CPU use, so it may start instances sooner.
      </p>
    </div>
  );
}
