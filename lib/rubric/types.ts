/**
 * Rubric as data.
 *
 * The two rubrics ship as markdown written for human reviewers. Markdown is not
 * a contract: it cannot tell you that coaching forbids interpolation while
 * kick-off allows it, and it cannot be diffed when the client edits a band.
 * So the rubrics are transcribed once, by hand, into the structures below and
 * checked into the repo as a reviewed artifact. Nothing parses markdown at
 * runtime.
 *
 * Every field here traces back to a line in fixtures/rubrics/*.md.
 */

/** Which rubric a call is graded against. */
export type CallType = "kickoff" | "coaching";

/**
 * How a dimension's score is allowed to move.
 *
 * This is the single most consequential difference between the two documents
 * and it is easy to miss:
 *
 *   coaching-call-rubric.md — "Each dimension's score must be exactly one of
 *   the bucket values listed in its table. No interpolation."
 *
 *   kickoff-call-rubric.md — "Each dimension's score must fall inside one of
 *   the bands listed in its table. Within a band, any integer works (or a half
 *   step where the dimension's max is 5 or less)."
 *
 * Kick-off is not uniformly banded either. Seven of its twelve dimensions print
 * a `| Score | Criteria |` table with single values; five print
 * `| Band | Score | Criteria |` with ranges. We honour the table that was
 * actually written for each dimension rather than the blanket note in the
 * header.
 */
export type ScoringMode = "discrete" | "range";

/** One selectable score for a `discrete` dimension. */
export interface DiscreteBucket {
  label: string;
  value: number;
  criteria: string;
}

/** One selectable span for a `range` dimension. */
export interface RangeBucket {
  label: string;
  min: number;
  max: number;
  criteria: string;
}

export type Bucket = DiscreteBucket | RangeBucket;

export function isRangeBucket(b: Bucket): b is RangeBucket {
  return "min" in b;
}

/**
 * Which yes/no signal from the identify pass governs an optional dimension.
 *
 * Kept as a named union rather than a free string so a typo cannot silently
 * leave a dimension permanently enabled.
 */
export type ApplicabilitySignal = "movement_coaching" | "diagnostics_review";

/**
 * A dimension that switches off entirely rather than scoring zero.
 *
 * Two coaching dimensions qualify, for the same reason:
 *   D4 — a call with no live movement coaching is not a call that coached
 *        movement badly. Scoring 0/15 would be a lie the total carries forward.
 *   D2 — a non-milestone call has no diagnostics to review. The rubric is
 *        explicit: "score N/A — redistribute weight... Do not penalize the
 *        coach." Scoring 0/10 is the one thing it forbids.
 *
 * In both cases disabling the dimension and normalising over the remaining
 * active maxima *is* the redistribution the rubric asks for: the surviving
 * dimensions each carry a proportionally larger share of the 100.
 */
export interface OptionalRule {
  /** The identify-pass boolean that turns this dimension off when false. */
  signal: ApplicabilitySignal;
  /** All of these must be absent before the dimension may be disabled. */
  presenceTests: string[];
  guidance: string;
}

/**
 * A score to award when the behaviour had no opportunity to appear.
 *
 * Coaching D5: "If no adjustments are needed this cycle, score 7/10 by default."
 * Coaching D8: "If NO struggle is present in this call → score 5/5 by default."
 *
 * Distinct from `optional`: the dimension still counts toward the total, it
 * just cannot be held against the coach.
 */
export interface AbsentDefault {
  score: number;
  when: string;
  reason: string;
}

export interface Dimension {
  /** Stable key, e.g. "D3". Used as the primary key everywhere downstream. */
  id: string;
  /** Display order, 1-12. */
  n: number;
  name: string;
  /** Points available. */
  max: number;
  /** Coaching groups dimensions under pillars; kick-off does not. */
  pillar?: string;
  scoring: ScoringMode;
  buckets: Bucket[];
  whatToLookFor: string;
  positiveSignals: string[];
  negativeSignals: string[];
  /** Calibration notes, SOP language, scope caveats. Fed to the model verbatim. */
  notes?: string[];
  optional?: OptionalRule;
  absentDefault?: AbsentDefault;
}

/**
 * How a cap is detected.
 *
 * `deterministic` caps are computed in TypeScript from the transcript and are
 * never asked of the model. The talk-ratio caps are the clear case: "coach
 * speaks >75% of the call" is a word count, and a language model asked to
 * estimate a percentage will invent one.
 *
 * `model` caps require reading comprehension, so the model reports a boolean
 * with evidence and the arithmetic still happens here.
 */
export type CapDetection = "deterministic" | "model";

export type CapEffect =
  /** Ceiling on one dimension, e.g. "Max 10/15 on D3". */
  | { kind: "dimension_max"; target: string; value: number }
  /** Hard value on one dimension, e.g. "0/5 on D8". */
  | { kind: "dimension_fixed"; target: string; value: number }
  /** Ceiling on the reported total, e.g. "Max 75 total". */
  | { kind: "total_max"; value: number };

export interface Cap {
  id: string;
  /** The condition as the client wrote it. Shown in the report when fired. */
  condition: string;
  effect: CapEffect;
  detection: CapDetection;
  /**
   * Which dimension's scoring call is asked to judge this cap.
   *
   * Model-detected caps need a home. Rather than spending an extra round trip
   * on a "check the caps" pass, each cap is evaluated by the scoring call whose
   * dimensions already require reading that part of the call — every call sees
   * the whole transcript regardless, so nothing is lost by folding it in.
   * Unused for deterministic caps.
   */
  owner?: string;
  /** The yes/no question put to the model. Phrased so `true` means the cap fires. */
  question?: string;
  /**
   * Non-recoverable caps are stated as such in the rubric and are worth
   * surfacing differently in the UI: the coach cannot earn the points back by
   * doing something else well.
   */
  nonRecoverable?: boolean;
  /** For deterministic caps: the threshold the transcript is measured against. */
  threshold?: { metric: "coach_talk_share"; gt: number };
}

export interface Band {
  name: "ELITE" | "STRONG" | "INCONSISTENT" | "AT RISK" | "FAIL";
  min: number;
  max: number;
  description: string;
}

export interface Rubric {
  callType: CallType;
  title: string;
  /** Bumped whenever this file changes. Stamped onto every run for auditability. */
  version: string;
  /** The header note that governs interpolation, quoted. */
  scoringNote: string;
  intro: string;
  dimensions: Dimension[];
  caps: Cap[];
  bands: Band[];
  principles: string[];
  /**
   * The point total the document claims. Coaching says 100; its dimensions
   * actually sum to 105. See `statedTotalNote`.
   */
  statedTotal: number;
  statedTotalNote?: string;
}

/** Sum of every dimension max, including any that end up disabled. */
export function nominalTotal(rubric: Rubric): number {
  return rubric.dimensions.reduce((sum, d) => sum + d.max, 0);
}

/** Band for an already-normalised 0-100 score. */
export function bandFor(rubric: Rubric, score: number): Band {
  const hit = rubric.bands.find((b) => score >= b.min && score <= b.max);
  // Bands are exhaustive over 0-100, but never let a lookup miss silently.
  return hit ?? rubric.bands[rubric.bands.length - 1];
}
