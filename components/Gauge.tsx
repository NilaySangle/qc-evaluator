import { bandStyle } from "@/lib/ui";

/**
 * The total.
 *
 * An arc, drawn once, sized so the number reads before anything else on the
 * page. The band name sits inside it because colour alone must never carry the
 * state, and the capped-from line sits underneath because a score that was
 * lowered by a cap is a different fact from one that was earned.
 */
export function Gauge({
  score,
  band,
  cappedFrom,
  size = 168,
}: {
  score: number;
  band: string;
  cappedFrom?: number | null;
  size?: number;
}) {
  const stroke = 10;
  const r = (size - stroke) / 2 - 2;
  const cx = size / 2;
  const cy = size / 2;

  const START = 135;
  const SWEEP = 270;
  const circumference = 2 * Math.PI * r;
  const arcLength = (SWEEP / 360) * circumference;
  const pct = Math.max(0, Math.min(100, score)) / 100;

  const { fg, solid } = bandStyle(band);

  const point = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)] as const;
  };
  const [sx, sy] = point(START);
  const [ex, ey] = point(START + SWEEP);
  const track = `M ${sx} ${sy} A ${r} ${r} 0 1 1 ${ex} ${ey}`;

  return (
    <figure className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${score} out of 100, ${band}`}
      >
        <path d={track} fill="none" stroke="var(--line)" strokeWidth={stroke} strokeLinecap="round" />
        <path
          d={track}
          fill="none"
          stroke={solid}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${arcLength * pct} ${circumference}`}
          style={{ transition: "stroke-dasharray 0.7s var(--ease-out-quint)" }}
        />
      </svg>

      <figcaption className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="tnum font-semibold leading-none tracking-[-0.03em]"
          style={{ fontSize: "var(--text-score)", color: fg }}
        >
          {score}
        </span>
        <span className="mt-1 font-mono text-[length:var(--text-micro)] text-ink-3">out of 100</span>
        <span
          className="mt-2 font-mono text-[length:var(--text-micro)] font-semibold tracking-[0.08em]"
          style={{ color: fg }}
        >
          {band}
        </span>
        {cappedFrom != null && (
          <span className="mt-1 font-mono text-[length:var(--text-micro)] text-ink-3">
            capped from {cappedFrom}
          </span>
        )}
      </figcaption>
    </figure>
  );
}
