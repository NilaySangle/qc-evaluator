import type { CallType, Rubric, Dimension } from "./types";
import { isRangeBucket, nominalTotal } from "./types";
import { coachingRubric } from "./coaching";
import { kickoffRubric } from "./kickoff";

export * from "./types";
export { coachingRubric, kickoffRubric };

const RUBRICS: Record<CallType, Rubric> = {
  coaching: coachingRubric,
  kickoff: kickoffRubric,
};

export function getRubric(callType: CallType): Rubric {
  const r = RUBRICS[callType];
  if (!r) throw new Error(`Unknown call type: ${callType}`);
  return r;
}

export function isCallType(v: unknown): v is CallType {
  return v === "coaching" || v === "kickoff";
}

export function getDimension(rubric: Rubric, id: string): Dimension | undefined {
  return rubric.dimensions.find((d) => d.id === id);
}

/** Highest score a dimension can legally take. */
export function dimensionCeiling(d: Dimension): number {
  return Math.max(...d.buckets.map((b) => (isRangeBucket(b) ? b.max : b.value)));
}

/**
 * Is `score` a legal value for this dimension?
 *
 * This is the check that keeps the two rubrics honest about their own rules.
 * A coaching dimension rejects 8/10 outright — the document forbids
 * interpolation, so an 8 means the model invented a bucket. A kick-off range
 * dimension accepts any integer inside a band, plus half steps when the
 * dimension is worth 5 or less.
 */
export function isLegalScore(d: Dimension, score: number): boolean {
  if (!Number.isFinite(score) || score < 0) return false;

  if (d.scoring === "discrete") {
    return d.buckets.some((b) => !isRangeBucket(b) && b.value === score);
  }

  const inSomeBand = d.buckets.some((b) => isRangeBucket(b) && score >= b.min && score <= b.max);
  if (!inSomeBand) return false;

  const halfStepsAllowed = d.max <= 5;
  const step = halfStepsAllowed ? 0.5 : 1;
  // Guard against float dust from 4.5-style values.
  return Math.abs(score / step - Math.round(score / step)) < 1e-9;
}

/**
 * Snap an out-of-range model score to the nearest legal value.
 *
 * Used only after `isLegalScore` fails. We never discard the model's judgement
 * outright — the bucket it reasoned into is usually right and only the number
 * is malformed — but the transcript of what happened is recorded on the run so
 * a reviewer can see the correction rather than inherit it silently.
 */
export function snapToLegalScore(d: Dimension, score: number): number {
  const candidates: number[] = [];
  for (const b of d.buckets) {
    if (isRangeBucket(b)) {
      const step = d.max <= 5 ? 0.5 : 1;
      for (let v = b.min; v <= b.max + 1e-9; v += step) candidates.push(Number(v.toFixed(1)));
    } else {
      candidates.push(b.value);
    }
  }
  const clamped = Math.min(Math.max(score, 0), dimensionCeiling(d));
  return candidates.reduce((best, c) =>
    Math.abs(c - clamped) < Math.abs(best - clamped) ? c : best,
  );
}

/** The bucket label a legal score belongs to, e.g. "Elite". */
export function bucketLabelFor(d: Dimension, score: number): string {
  for (const b of d.buckets) {
    if (isRangeBucket(b)) {
      if (score >= b.min && score <= b.max) return b.label;
    } else if (b.value === score) {
      return b.label;
    }
  }
  return "—";
}

/**
 * Structural checks on the hand-transcribed rubric data.
 *
 * These files were typed out of a markdown document by a human, which is
 * exactly the kind of work that produces a silent off-by-one three weeks later.
 * The checks run as a test and in dev at import time, and they deliberately
 * report rather than throw on the 105-vs-100 coaching discrepancy, because that
 * one is a property of the source document and not a typo.
 */
export interface RubricIssue {
  rubric: CallType;
  level: "error" | "note";
  message: string;
}

export function auditRubric(rubric: Rubric): RubricIssue[] {
  const issues: RubricIssue[] = [];
  const err = (message: string) => issues.push({ rubric: rubric.callType, level: "error", message });
  const note = (message: string) => issues.push({ rubric: rubric.callType, level: "note", message });

  if (rubric.dimensions.length !== 12) {
    err(`expected 12 dimensions, found ${rubric.dimensions.length}`);
  }

  const ids = new Set<string>();
  for (const d of rubric.dimensions) {
    if (ids.has(d.id)) err(`duplicate dimension id ${d.id}`);
    ids.add(d.id);

    if (d.id !== `D${d.n}`) err(`${d.id} has n=${d.n}; id and ordinal disagree`);
    if (d.buckets.length === 0) err(`${d.id} has no buckets`);

    const ceiling = dimensionCeiling(d);
    if (ceiling !== d.max) {
      err(`${d.id} max is ${d.max} but its top bucket reaches ${ceiling}`);
    }

    const mixed =
      d.buckets.some((b) => isRangeBucket(b)) && d.buckets.some((b) => !isRangeBucket(b));
    if (mixed) err(`${d.id} mixes range and discrete buckets`);

    const declaredRange = d.scoring === "range";
    const actuallyRange = d.buckets.every((b) => isRangeBucket(b));
    if (declaredRange !== actuallyRange) {
      err(`${d.id} declares scoring="${d.scoring}" but its buckets say otherwise`);
    }

    // A dimension must be able to score 0, or the rubric has no failure state.
    if (!isLegalScore(d, 0)) err(`${d.id} cannot score 0`);

    if (d.absentDefault && !isLegalScore(d, d.absentDefault.score)) {
      err(`${d.id} absentDefault ${d.absentDefault.score} is not a legal score`);
    }
  }

  for (const cap of rubric.caps) {
    if (cap.effect.kind !== "total_max") {
      const target = getDimension(rubric, cap.effect.target);
      if (!target) {
        err(`cap "${cap.id}" targets ${cap.effect.target}, which does not exist`);
      } else if (!isLegalScore(target, cap.effect.value)) {
        err(`cap "${cap.id}" sets ${cap.effect.target} to ${cap.effect.value}, not a legal score`);
      }
    }
    if (cap.detection === "deterministic" && !cap.threshold) {
      err(`cap "${cap.id}" is deterministic but carries no threshold`);
    }
  }

  // Bands must tile 0-100 with no gap and no overlap.
  const sorted = [...rubric.bands].sort((a, b) => a.min - b.min);
  if (sorted[0].min !== 0) err(`bands start at ${sorted[0].min}, not 0`);
  if (sorted[sorted.length - 1].max !== 100) err(`bands end at ${sorted[sorted.length - 1].max}, not 100`);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].min !== sorted[i - 1].max + 1) {
      err(`band gap or overlap between ${sorted[i - 1].name} and ${sorted[i].name}`);
    }
  }

  const nominal = nominalTotal(rubric);
  if (nominal !== rubric.statedTotal) {
    note(
      `dimension maxima sum to ${nominal} but the document states ${rubric.statedTotal}. ` +
        `Totals are normalised over active maxima and reported on the 100 scale.`,
    );
  }

  return issues;
}

export function auditAllRubrics(): RubricIssue[] {
  return [...auditRubric(kickoffRubric), ...auditRubric(coachingRubric)];
}
