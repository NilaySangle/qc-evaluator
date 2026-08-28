import { describe, expect, it } from "vitest";
import { coachingRubric, kickoffRubric } from "../lib/rubric";
import { isLegalScore, snapToLegalScore } from "../lib/rubric";
import { computeTotal, projectTotal, normaliseScore } from "../lib/scoring/total";
import type { Rubric } from "../lib/rubric";

/**
 * The deterministic layer, pinned.
 *
 * "Scores the same call the same way twice" is a requirement. On Sonnet 5 the
 * per-dimension judgement cannot be forced to temperature 0, so reproducibility
 * lives here instead: given the same judgements, every number below is a pure
 * function with no model in the loop. These tests are the proof of that, and
 * they lock in the two rubric quirks a careless build gets wrong — coaching's
 * 105-point total and its no-interpolation rule.
 */

function dims(r: Rubric, f: (max: number) => number) {
  return r.dimensions.map((d) => ({
    dimensionId: d.id,
    score: f(d.max),
    bucketLabel: "x",
    rationale: "r",
    quickFix: "q",
    behaviourPresent: true,
  }));
}

const perfect = (r: Rubric) => dims(r, (m) => m);

describe("normalisation over active maxima", () => {
  it("scores a flawless kick-off call at 100/100", () => {
    const { total } = computeTotal({
      rubric: kickoffRubric,
      dimensions: perfect(kickoffRubric),
      capJudgements: [],
      coachTalkShare: 0.5,
    });
    expect(total.raw).toBe(100);
    expect(total.activeMax).toBe(100);
    expect(total.score).toBe(100);
    expect(total.band).toBe("ELITE");
  });

  it("normalises coaching's 105 raw points onto the 100 scale", () => {
    // The document claims 100 points; its dimensions sum to 105. A perfect call
    // is still 100/100 — never 105 — because the score is raw/activeMax.
    const { total } = computeTotal({
      rubric: coachingRubric,
      dimensions: perfect(coachingRubric),
      capJudgements: [],
      coachTalkShare: 0.5,
      applicability: { movement_coaching: true, diagnostics_review: true },
    });
    expect(total.raw).toBe(105);
    expect(total.activeMax).toBe(105);
    expect(total.score).toBe(100);
  });

  it("re-bases the denominator when an optional dimension is switched off", () => {
    // D4 disabled → out of 90, still 100/100 for a perfect remainder.
    const { total } = computeTotal({
      rubric: coachingRubric,
      dimensions: perfect(coachingRubric),
      capJudgements: [],
      coachTalkShare: 0.5,
      applicability: { movement_coaching: false, diagnostics_review: true },
    });
    expect(total.disabledDimensions).toContain("D4");
    expect(total.activeMax).toBe(90);
    expect(total.score).toBe(100);
  });

  it("switches off diagnostics review on a non-milestone call", () => {
    const { dimensions } = computeTotal({
      rubric: coachingRubric,
      dimensions: perfect(coachingRubric),
      capJudgements: [],
      coachTalkShare: 0.5,
      applicability: { movement_coaching: true, diagnostics_review: false },
    });
    const d2 = dimensions.find((d) => d.dimension.id === "D2")!;
    expect(d2.disabled).toBe(true);
    expect(d2.score).toBe(0);
  });
});

describe("deterministic caps are measured, never asked", () => {
  it("caps a kick-off total at 80 when the coach speaks over 70%", () => {
    const { total } = computeTotal({
      rubric: kickoffRubric,
      dimensions: perfect(kickoffRubric),
      capJudgements: [],
      coachTalkShare: 0.734, // the measured share of the planted transcript
    });
    expect(total.cappedFrom).toBe(100);
    expect(total.score).toBe(80);
    expect(total.capsFired.map((c) => c.cap.id)).toContain("coach_talk_over_70");
  });

  it("does not fire the cap at exactly the threshold", () => {
    const { total } = computeTotal({
      rubric: kickoffRubric,
      dimensions: perfect(kickoffRubric),
      capJudgements: [],
      coachTalkShare: 0.7, // strictly greater-than, so 0.70 is safe
    });
    expect(total.score).toBe(100);
  });

  it("skips the talk cap entirely when roles were unresolved", () => {
    const { total } = computeTotal({
      rubric: coachingRubric,
      dimensions: perfect(coachingRubric),
      capJudgements: [],
      coachTalkShare: null,
      applicability: { movement_coaching: true, diagnostics_review: true },
    });
    expect(total.capsFired).toHaveLength(0);
    expect(total.score).toBe(100);
  });
});

describe("model-judged caps reshape the ceiling", () => {
  it("caps D3 at 10/15 when no vision connection is found", () => {
    const { dimensions } = computeTotal({
      rubric: coachingRubric,
      dimensions: perfect(coachingRubric),
      capJudgements: [{ capId: "no_vision_connection", fired: true, reason: "never referenced" }],
      coachTalkShare: 0.5,
      applicability: { movement_coaching: true, diagnostics_review: true },
    });
    const d3 = dimensions.find((d) => d.dimension.id === "D3")!;
    expect(d3.score).toBe(10);
    expect(d3.ceiling).toBe(10);
    expect(d3.recoverable).toBe(0);
    expect(d3.capNotes.join(" ")).toMatch(/capped at 10/);
  });

  it("forces D8 to 0 and marks it non-recoverable when struggle is ignored", () => {
    const { dimensions } = computeTotal({
      rubric: coachingRubric,
      dimensions: perfect(coachingRubric),
      capJudgements: [{ capId: "struggle_ignored", fired: true, reason: "coach went defensive" }],
      coachTalkShare: 0.5,
      applicability: { movement_coaching: true, diagnostics_review: true },
    });
    const d8 = dimensions.find((d) => d.dimension.id === "D8")!;
    expect(d8.score).toBe(0);
    expect(d8.capNotes.join(" ")).toMatch(/non-recoverable/);
  });
});

describe("illegal scores are snapped to the rubric's value set", () => {
  it("rejects interpolated values on coaching's discrete dimensions", () => {
    const d1 = coachingRubric.dimensions.find((d) => d.id === "D1")!; // buckets 10/7/3/0
    expect(isLegalScore(d1, 8)).toBe(false);
    expect(snapToLegalScore(d1, 8)).toBe(7);
    const { score, note } = normaliseScore(d1, 8);
    expect(score).toBe(7);
    expect(note).toMatch(/not a legal score/);
  });

  it("accepts any in-band integer on kick-off's range dimensions", () => {
    const d1 = kickoffRubric.dimensions.find((d) => d.id === "D1")!; // Strong band 6-8
    expect(isLegalScore(d1, 8)).toBe(true);
    expect(normaliseScore(d1, 8).note).toBeUndefined();
  });

  it("allows half steps only where the dimension max is 5 or less", () => {
    const d3 = kickoffRubric.dimensions.find((d) => d.id === "D3")!; // max 5, Elite 4.5-5
    expect(isLegalScore(d3, 4.5)).toBe(true);
    const d5 = kickoffRubric.dimensions.find((d) => d.id === "D5")!; // max 10
    expect(isLegalScore(d5, 7.5)).toBe(false);
  });
});

describe("projection recomputes through the same caps", () => {
  it("re-runs a raised dimension through normalisation and total caps", () => {
    const base = computeTotal({
      rubric: coachingRubric,
      dimensions: dims(coachingRubric, (m) => Math.floor(m * 0.5)),
      capJudgements: [],
      coachTalkShare: 0.5,
      applicability: { movement_coaching: true, diagnostics_review: true },
    });
    const proj = projectTotal(coachingRubric, base.dimensions, base.total, "D3", 15);
    expect(proj).not.toBeNull();
    expect(proj!.appliedScore).toBe(15);
    expect(proj!.score).toBeGreaterThan(base.total.score);
    expect(proj!.delta).toBe(proj!.score - base.total.score);
  });

  it("returns null when the target is already at or above the asked score", () => {
    const base = computeTotal({
      rubric: kickoffRubric,
      dimensions: perfect(kickoffRubric),
      capJudgements: [],
      coachTalkShare: 0.5,
    });
    expect(projectTotal(kickoffRubric, base.dimensions, base.total, "D1", 10)).toBeNull();
  });
});

describe("reproducibility", () => {
  it("produces byte-identical totals across repeated runs of the same judgements", () => {
    const makeInput = () => ({
      rubric: coachingRubric,
      dimensions: dims(coachingRubric, (m) => Math.ceil(m * 0.6)),
      capJudgements: [{ capId: "no_vision_connection", fired: true, reason: "x" }],
      coachTalkShare: 0.61,
      applicability: { movement_coaching: true, diagnostics_review: true },
    });

    const a = JSON.stringify(computeTotal(makeInput()).total);
    const b = JSON.stringify(computeTotal(makeInput()).total);
    expect(a).toBe(b);
  });
});
