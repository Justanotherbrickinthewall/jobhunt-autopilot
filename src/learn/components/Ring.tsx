export function Ring({ value, size = 56, colour = "var(--accent)", label }: { value: number; size?: number; colour?: string; label?: string }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <svg className="ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label ?? `${Math.round(v * 100)} percent complete`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={5} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colour} strokeWidth={5} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - v)} transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central">{Math.round(v * 100)}%</text>
    </svg>
  );
}
