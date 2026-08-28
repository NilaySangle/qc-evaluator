import type { ApplicabilitySignal, Cap, Dimension, Rubric } from "../rubric";
import { bandFor, bucketLabelFor, isLegalScore, snapToLegalScore } from "../rubric";

/**
 * The arithmetic. No model participates in anything below this line.
 *
 * Everything here is a pure function of the model's per-dimension judgements
 * plus measurements taken from the transcript, which is what makes a run
 * reproducible: the same judgements always produce the same total, and a
 * reviewer can check the total by hand.
 */

export interface ScoredDimension {
  dimension: Dimension;
  /** What the model returned, before any correction. */
  proposedScore: number;
  /** After legality snapping and caps. */
  score: number;
  bucketLabel: string;
  rationale: string;
  quickFix: string;
  behaviourPresent: boolean;
  disabled: boolean;
  disabledReason?: string;
  /** Set when the model returned a value the rubric does not permit. */
  snapNote?: string;
  /** Caps that touched this dimension. */
  capNotes: string[];
  /** Points still available on this dimension, given its ceiling after caps. */
  recoverable: number;
  /** Ceiling after caps, when lower than the dimension max. */
  ceiling: number;
}

export interface FiredCap {
  cap: Cap;
  reason: string;
  /** Deterministic caps carry the measurement that fired them. */
  measurement?: string;
}

export interface TotalResult {
  /** Sum of active dimension scores. */
  raw: number;
  /** Sum of active dimension maxima — 105 for a full coaching call. */
  activeMax: number;
  /** raw/activeMax on the 100 scale, before total caps. */
  normalised: number;
  /** Final reported score after total caps. */
  score: number;
  band: string;
  bandDescription: string;
  capsFired: FiredCap[];
  /** Set when a total cap lowered the score. */
  cappedFrom: number | null;
  disabledDimensions: string[];
  /** Human-readable note on how the total was derived. */
  method: string;
}

export interface CapInput {
  capId: string;
  fired: boolean;
  reason: string;
}

/**
 * Bring a model score into the rubric's legal value set.
 *
 * Coaching forbids interpolation outright, so an 8/10 on a dimension whose
 * buckets are 10/7/3/0 means the model hedged into a value that does not exist.
 * Rather than discard the judgement we snap to the nearest legal value and
 * record that we did, so the correction is visible instead of silent.
 */
export function normaliseScore(d: Dimension, proposed: number): { score: number; note?: string } {
  if (isLegalScore(d, proposed)) return { score: proposed };
  const snapped = snapToLegalScore(d, proposed);
  return {
    score: snapped,
    note: `Model returned ${proposed}/${d.max}, which is not a legal score for this dimension (${
      d.scoring === "discrete" ? "discrete buckets only, no interpolation" : "must fall inside a band"
    }). Snapped to ${snapped}.`,
  };
}

export interface ComputeInput {
  rubric: Rubric;
  dimensions: Array<{
    dimensionId: string;
    score: number;
    bucketLabel: string;
    rationale: string;
    quickFix: string;
    behaviourPresent: boolean;
  }>;
  /** Model-judged caps. */
  capJudgements: CapInput[];
  /** Measured share of words spoken by the coach, or null if roles were unresolved. */
  coachTalkShare: number | null;
  /**
   * Per-signal applicability from the identify pass. An optional dimension is
   * disabled when its `signal` maps to `false` here. Missing or `true` keeps it
   * scored, so a kick-off call — which has no optional dimensions — passes an
   * empty map and nothing switches off.
   */
  applicability?: Partial<Record<ApplicabilitySignal, boolean>>;
  /** Short note explaining why an optional dimension was switched off, by signal. */
  applicabilityNotes?: Partial<Record<ApplicabilitySignal, string>>;
}

export interface ComputeResult {
  dimensions: ScoredDimension[];
  total: TotalResult;
}

export function computeTotal(input: ComputeInput): ComputeResult {
  const { rubric } = input;
  const byId = new Map(input.dimensions.map((d) => [d.dimensionId, d]));
  const firedCaps: FiredCap[] = [];

  // ---- 1. Which caps fired? ------------------------------------------------
  for (const cap of rubric.caps) {
    if (cap.detection === "deterministic") {
      // Measured here, never asked of the model.
      if (cap.threshold?.metric === "coach_talk_share") {
        const share = input.coachTalkShare;
        if (share !== null && share > cap.threshold.gt) {
          firedCaps.push({
            cap,
            reason: cap.condition,
            measurement: `Coach spoke ${(share * 100).toFixed(1)}% of the words in the transcript, above the ${(
              cap.threshold.gt * 100
            ).toFixed(0)}% threshold.`,
          });
        }
      }
      continue;
    }
    const j = input.capJudgements.find((c) => c.capId === cap.id);
    if (j?.fired) firedCaps.push({ cap, reason: j.reason || cap.condition });
  }

  // ---- 2. Score each dimension, applying dimension-level caps --------------
  const scored: ScoredDimension[] = [];
  const disabledIds: string[] = [];

  for (const d of rubric.dimensions) {
    const raw = byId.get(d.id);

    // An optional dimension switches off rather than scoring zero when its
    // governing signal is false. A call with no movement coaching is not a call
    // that coached movement badly; a non-milestone call has no diagnostics to
    // review. Either way the model's returned score for it is discarded.
    const signal = d.optional?.signal;
    if (signal && input.applicability?.[signal] === false) {
      disabledIds.push(d.id);
      const note = input.applicabilityNotes?.[signal];
      scored.push({
        dimension: d,
        proposedScore: 0,
        score: 0,
        bucketLabel: "N/A",
        rationale: note ?? `${d.name} did not apply on this call, so it is not scored.`,
        quickFix: "",
        behaviourPresent: false,
        disabled: true,
        disabledReason: note ?? `${d.name} did not apply on this call.`,
        capNotes: [],
        recoverable: 0,
        ceiling: d.max,
      });
      continue;
    }

    if (!raw) {
      // A dimension the model failed to return. Recorded as unscored rather
      // than quietly counted as zero, which would corrupt the total.
      scored.push({
        dimension: d,
        proposedScore: 0,
        score: 0,
        bucketLabel: "—",
        rationale: "No result was returned for this dimension.",
        quickFix: "",
        behaviourPresent: false,
        disabled: false,
        capNotes: ["Scored 0 because the model returned no result for this dimension."],
        recoverable: d.max,
        ceiling: d.max,
      });
      continue;
    }

    const { score: legal, note } = normaliseScore(d, raw.score);
    let score = legal;
    let ceiling = d.max;
    const capNotes: string[] = [];

    for (const { cap } of firedCaps) {
      if (cap.effect.kind === "dimension_fixed" && cap.effect.target === d.id) {
        if (score !== cap.effect.value) {
          capNotes.push(
            `${cap.condition} → set to ${cap.effect.value}/${d.max}${cap.nonRecoverable ? " (non-recoverable)" : ""}.`,
          );
        }
        score = cap.effect.value;
        ceiling = Math.min(ceiling, cap.effect.value);
      } else if (cap.effect.kind === "dimension_max" && cap.effect.target === d.id) {
        ceiling = Math.min(ceiling, cap.effect.value);
        if (score > cap.effect.value) {
          capNotes.push(`${cap.condition} → capped at ${cap.effect.value}/${d.max}.`);
          score = cap.effect.value;
        }
      }
    }

    scored.push({
      dimension: d,
      proposedScore: raw.score,
      score,
      bucketLabel: bucketLabelFor(d, score) !== "—" ? bucketLabelFor(d, score) : raw.bucketLabel,
      rationale: raw.rationale,
      quickFix: raw.quickFix,
      behaviourPresent: raw.behaviourPresent,
      disabled: false,
      snapNote: note,
      capNotes,
      recoverable: Math.max(0, ceiling - score),
      ceiling,
    });
  }

  // ---- 3. Sum and normalise ------------------------------------------------
  const active = scored.filter((s) => !s.disabled);
  const raw = active.reduce((sum, s) => sum + s.score, 0);
  const activeMax = active.reduce((sum, s) => sum + s.dimension.max, 0);
  const normalised = activeMax > 0 ? Math.round((raw / activeMax) * 100) : 0;

  // ---- 4. Total caps, applied to the normalised score ----------------------
  let score = normalised;
  let cappedFrom: number | null = null;
  for (const { cap } of firedCaps) {
    if (cap.effect.kind === "total_max" && score > cap.effect.value) {
      if (cappedFrom === null) cappedFrom = score;
      score = cap.effect.value;
    }
  }

  const band = bandFor(rubric, score);

  const method =
    activeMax === rubric.statedTotal
      ? `${raw}/${activeMax} reported directly.`
      : `${raw}/${activeMax} normalised to the 100 scale (${normalised}/100)${
          disabledIds.length ? ` with ${disabledIds.join(", ")} switched off` : ""
        }${cappedFrom !== null ? `, then capped to ${score}` : ""}.`;

  return {
    dimensions: scored,
    total: {
      raw,
      activeMax,
      normalised,
      score,
      band: band.name,
      bandDescription: band.description,
      capsFired: firedCaps,
      cappedFrom,
      disabledDimensions: disabledIds,
      method,
    },
  };
}

/**
 * What the call would have scored had one dimension landed higher.
 *
 * The brief asks for "what the call would have scored with it", and this is
 * arithmetic, so it is computed rather than predicted. The model picks which
 * dimension and how high; the number comes from here, through the same
 * normalisation and the same caps as the real total. A model asked to state the
 * projected total directly would produce something plausible that does not
 * reconcile with the scores printed beside it.
 */
export function projectTotal(
  rubric: Rubric,
  dimensions: ScoredDimension[],
  total: TotalResult,
  targetDimensionId: string,
  targetScore: number,
): { score: number; band: string; delta: number; appliedScore: number } | null {
  const target = dimensions.find((d) => d.dimension.id === targetDimensionId);
  if (!target || target.disabled) return null;

  // Respect both the rubric's legal values and any cap ceiling already in force.
  const legal = isLegalScore(target.dimension, targetScore)
    ? targetScore
    : snapToLegalScore(target.dimension, targetScore);
  const applied = Math.min(legal, target.ceiling);
  if (applied <= target.score) return null;

  const active = dimensions.filter((d) => !d.disabled);
  const raw = active.reduce(
    (sum, d) => sum + (d.dimension.id === targetDimensionId ? applied : d.score),
    0,
  );
  const activeMax = active.reduce((sum, d) => sum + d.dimension.max, 0);
  let score = activeMax > 0 ? Math.round((raw / activeMax) * 100) : 0;

  for (const { cap } of total.capsFired) {
    if (cap.effect.kind === "total_max" && score > cap.effect.value) score = cap.effect.value;
  }

  return {
    score,
    band: bandFor(rubric, score).name,
    delta: score - total.score,
    appliedScore: applied,
  };
}
