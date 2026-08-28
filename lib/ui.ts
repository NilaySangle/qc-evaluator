/**
 * Presentation helpers shared by the web report and the PDF.
 *
 * The five bands are a data scale, not decoration. Every one is paired with its
 * name wherever it appears, so a reader who cannot separate the hues still gets
 * the state from the label.
 */

export type BandName = "ELITE" | "STRONG" | "INCONSISTENT" | "AT RISK" | "FAIL";

interface BandStyle {
  /** Foreground, contrast-checked against both surface and wash. */
  fg: string;
  /** Tint for chips and row backgrounds. */
  wash: string;
  /** Solid fill for bars and the score arc. */
  solid: string;
}

const BANDS: Record<string, BandStyle> = {
  ELITE: {
    fg: "oklch(38% 0.11 162)",
    wash: "oklch(96.5% 0.025 162)",
    solid: "oklch(48% 0.13 162)",
  },
  STRONG: {
    fg: "oklch(38% 0.12 232)",
    wash: "oklch(96.5% 0.025 232)",
    solid: "oklch(48% 0.14 232)",
  },
  INCONSISTENT: {
    fg: "oklch(42% 0.11 75)",
    wash: "oklch(96.5% 0.035 75)",
    solid: "oklch(56% 0.13 75)",
  },
  "AT RISK": {
    fg: "oklch(42% 0.14 45)",
    wash: "oklch(96.5% 0.032 45)",
    solid: "oklch(54% 0.16 45)",
  },
  FAIL: {
    fg: "oklch(40% 0.16 25)",
    wash: "oklch(96.5% 0.03 25)",
    solid: "oklch(50% 0.19 25)",
  },
};

const NEUTRAL: BandStyle = {
  fg: "oklch(42% 0.012 262)",
  wash: "oklch(97.2% 0.003 250)",
  solid: "oklch(60% 0.01 262)",
};

export function bandStyle(band: string | null | undefined): BandStyle {
  if (!band) return NEUTRAL;
  return BANDS[band.toUpperCase()] ?? NEUTRAL;
}

export function bandColor(band: string): string {
  return bandStyle(band).fg;
}

export function bandTint(band: string): string {
  return bandStyle(band).wash;
}

export function bandSolid(band: string): string {
  return bandStyle(band).solid;
}

/** Band for an already-normalised 0-100 score. Mirrors the rubric thresholds. */
export function bandForScore(score: number): BandName {
  if (score >= 90) return "ELITE";
  if (score >= 80) return "STRONG";
  if (score >= 70) return "INCONSISTENT";
  if (score >= 60) return "AT RISK";
  return "FAIL";
}

/**
 * How a dimension's own score reads, measured against its ceiling rather than
 * its max: a dimension capped at 10/15 that scored 10 did everything still
 * available to it, and colouring that amber would blame the coach twice for one
 * cap.
 */
export type Tone = "good" | "mid" | "poor" | "none";

export function scoreTone(score: number, ceiling: number): Tone {
  if (ceiling <= 0) return "none";
  const pct = score / ceiling;
  if (pct >= 0.9) return "good";
  if (pct >= 0.5) return "mid";
  return "poor";
}

export const TONE: Record<Tone, BandStyle> = {
  good: BANDS.ELITE,
  mid: BANDS.INCONSISTENT,
  poor: BANDS.FAIL,
  none: NEUTRAL,
};

export function formatScore(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${Math.round(s - m * 60)}s`;
}

export function formatCost(usd: number): string {
  return usd < 0.01 ? `$${usd.toFixed(4)}` : `$${usd.toFixed(3)}`;
}
