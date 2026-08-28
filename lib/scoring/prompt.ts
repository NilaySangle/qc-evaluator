import type { Cap, Dimension, Rubric } from "../rubric";
import { isRangeBucket } from "../rubric";

/**
 * Prompt construction.
 *
 * The design decision worth stating: dimensions are split across calls, the
 * transcript never is. Each call receives the entire numbered transcript and
 * only its own slice of rubric text.
 *
 * Splitting the transcript instead would be the reflex on a 65k-character
 * input, and it would be wrong twice over. It fits — 65k characters is roughly
 * 16k tokens. And several dimensions are defined over the whole call ("no
 * connection to long-term vision at any point", "no follow-up questions
 * anywhere"), so a model shown one slice would report absence it cannot know.
 * Splitting the rubric keeps every call's attention on three dimensions'
 * criteria while leaving the evidence complete.
 */

/** Dimensions per scoring call. Four groups of three across twelve dimensions. */
export const GROUP_SIZE = 3;

export interface ScoringGroup {
  index: number;
  dimensions: Dimension[];
  caps: Cap[];
}

export function buildGroups(rubric: Rubric): ScoringGroup[] {
  const groups: ScoringGroup[] = [];
  for (let i = 0; i < rubric.dimensions.length; i += GROUP_SIZE) {
    const dimensions = rubric.dimensions.slice(i, i + GROUP_SIZE);
    const ids = new Set(dimensions.map((d) => d.id));
    groups.push({
      index: groups.length,
      dimensions,
      caps: rubric.caps.filter((c) => c.detection === "model" && c.owner && ids.has(c.owner)),
    });
  }
  return groups;
}

/** Every model-detected cap must be owned by exactly one group, or it never gets judged. */
export function unassignedCaps(rubric: Rubric): Cap[] {
  const owned = new Set(buildGroups(rubric).flatMap((g) => g.caps.map((c) => c.id)));
  return rubric.caps.filter((c) => c.detection === "model" && !owned.has(c.id));
}

export const SYSTEM_PROMPT = [
  "You are a quality-control reviewer for a coaching business. You grade recorded calls against the client's own scoring rubric.",
  "",
  "You are reading a transcript. That is all you have. There is no audio, no video, no tone, no facial expression, and no record of anything that happened before or after the call.",
  "",
  "Rules that override everything else:",
  "",
  "1. Evidence or nothing. Every score rests on lines you can point to. Each line is labelled L001, L002 and so on. Cite the label and copy the words. Your quotes are checked against the transcript afterwards and anything that cannot be found is thrown away, taking the credibility of that score with it.",
  "2. Absence is not failure. If a behaviour never appears, set behaviour_present to false and say so plainly. Do not infer that it probably happened off-transcript, and do not assume the coach did it badly. A missing behaviour and a botched one are different findings.",
  "3. Do not read the mood. 'The call felt warm' is not evidence. 'The client said \"that makes so much sense\"' is. Never score from atmosphere, vibe, or how a call seems to be going overall.",
  "4. Score the transcript, not the coach. You are not judging whether someone is a good coach. You are judging what this rubric says about these words.",
  "5. Stay inside the legal scores. Each dimension tells you exactly which values it accepts. Do not invent an intermediate value to hedge.",
].join("\n");

function bucketLines(d: Dimension): string {
  return d.buckets
    .map((b) => {
      const range = isRangeBucket(b)
        ? b.min === b.max
          ? `${b.min}`
          : `${b.min}-${b.max}`
        : `${b.value}`;
      return `  - ${b.label} (${range}/${d.max}): ${b.criteria}`;
    })
    .join("\n");
}

function legalScoreLine(d: Dimension): string {
  if (d.scoring === "discrete") {
    const vals = d.buckets.map((b) => (isRangeBucket(b) ? b.max : b.value));
    return `  LEGAL SCORES: exactly one of ${vals.join(", ")}. No other value is accepted. Do not interpolate.`;
  }
  const step = d.max <= 5 ? "0.5" : "1";
  const spans = d.buckets
    .map((b) => (isRangeBucket(b) ? (b.min === b.max ? `${b.min}` : `${b.min}-${b.max}`) : ""))
    .filter(Boolean)
    .join(", ");
  return `  LEGAL SCORES: any value inside one of these bands — ${spans} — in steps of ${step}. Values between bands are not accepted.`;
}

function renderDimension(d: Dimension): string {
  const parts = [
    `### ${d.id} — ${d.name} (${d.max} points)`,
    d.pillar ? `Pillar: ${d.pillar}` : "",
    ``,
    `What to look for: ${d.whatToLookFor}`,
    ``,
    `Scoring buckets:`,
    bucketLines(d),
    legalScoreLine(d),
    ``,
    `Positive signals: ${d.positiveSignals.join(" / ")}`,
    `Negative signals: ${d.negativeSignals.join(" / ")}`,
  ];

  if (d.absentDefault) {
    parts.push(
      ``,
      `IF ABSENT: ${d.absentDefault.when} → score ${d.absentDefault.score}. ${d.absentDefault.reason} Set behaviour_present to false and say in the rationale that the situation did not arise.`,
    );
  }

  if (d.optional) {
    parts.push(
      ``,
      `OPTIONAL DIMENSION. ${d.optional.guidance}`,
      `All of the following must be absent before it may be switched off:`,
      ...d.optional.presenceTests.map((t, i) => `  ${i + 1}. ${t}`),
    );
  }

  if (d.notes?.length) {
    parts.push(``, `Calibration notes:`, ...d.notes.map((n) => `  - ${n}`));
  }

  return parts.filter((p) => p !== "").join("\n");
}

/** The whole transcript, sent identically on every call so it caches. */
export function buildCachedPrefix(numberedTranscript: string): string {
  return [
    "Here is the full transcript of the call, with every speaking turn numbered.",
    "",
    "<transcript>",
    numberedTranscript,
    "</transcript>",
  ].join("\n");
}

export function buildIdentifyInstructions(rubric: Rubric): string {
  const parts = [
    `This is a ${rubric.title.toLowerCase()}.`,
    "",
    "Identify the two participants. The coach is the practitioner running the call; the client is the person being coached. Use the speaker names exactly as they appear in the transcript labels — do not reformat, shorten, or correct them.",
    "",
    "Then write one sentence describing what this call was about.",
  ];

  // Each optional dimension turns on a matching applicability flag. Both are
  // asked here, once, rather than inferred later from a score — a dimension
  // that had no opportunity to occur must be switched off, not scored zero.
  const SIGNAL_FIELD: Record<string, string> = {
    movement_coaching: "movement_coaching_present",
    diagnostics_review: "diagnostics_reviewed",
  };
  for (const d of rubric.dimensions) {
    if (!d.optional) continue;
    const field = SIGNAL_FIELD[d.optional.signal];
    parts.push(
      "",
      `Decide whether ${d.name} (${d.id}) applies to this call. Set ${field} to true if ANY of the following happened:`,
      ...d.optional.presenceTests.map((t, i) => `  ${i + 1}. ${t}`),
      `All must be absent for false. ${d.optional.guidance} If false, add one short note explaining why.`,
    );
  }

  return parts.join("\n");
}

export function buildScoringInstructions(
  rubric: Rubric,
  group: ScoringGroup,
  roles: { coach: string | null; client: string | null },
): string {
  const ids = group.dimensions.map((d) => d.id).join(", ");
  const parts = [
    `This is a ${rubric.title.toLowerCase()}. ${roles.coach ? `The coach is ${roles.coach}.` : ""} ${
      roles.client ? `The client is ${roles.client}.` : ""
    }`.trim(),
    "",
    `Rubric context: ${rubric.intro}`,
    "",
    `How this rubric handles scores: ${rubric.scoringNote}`,
    "",
    "Scoring principles for this rubric:",
    ...rubric.principles.map((p, i) => `  ${i + 1}. ${p}`),
    "",
    "---",
    "",
    `You are scoring ONLY these dimensions: ${ids}. Other dimensions are handled elsewhere — do not score them and do not mention them.`,
    "",
    ...group.dimensions.map(renderDimension),
  ];

  if (group.caps.length > 0) {
    parts.push(
      "",
      "---",
      "",
      "AUTOMATIC CAPS assigned to you.",
      "",
      "These are separate from the scores above. Each is a yes/no question about the call as a whole, and each reduces the final result when it fires, so answer conservatively: only report fired = true when the transcript clearly shows the condition holds. Cite evidence either way.",
      "",
      ...group.caps.map((c) => `- ${c.id}: ${c.question ?? c.condition}`),
    );
  }

  parts.push(
    "",
    "---",
    "",
    "Now submit your scores. For each dimension: the score, the bucket label, 2-4 sentences of rationale starting from the specific moment that drives it, the transcript lines it rests on, and one concrete quick fix naming what this coach had to do on this call to reach full marks.",
  );

  return parts.join("\n");
}

export interface NarrativeInput {
  dimensionId: string;
  name: string;
  score: number;
  max: number;
  bucketLabel: string;
  rationale: string;
  /** Points still on the table, after caps. Drives the "one thing" choice. */
  recoverable: number;
  ceilingNote?: string;
  behaviourPresent: boolean;
}

export function buildNarrativeInstructions(
  rubric: Rubric,
  rows: NarrativeInput[],
  total: { score: number; band: string; capsFired: string[] },
  roles: { coach: string | null; client: string | null },
): string {
  const table = rows
    .map(
      (r) =>
        `  ${r.dimensionId} ${r.name}: ${r.score}/${r.max} (${r.bucketLabel})` +
        `${r.behaviourPresent ? "" : " [behaviour not present in transcript]"}` +
        `${r.recoverable > 0 ? ` — up to ${r.recoverable} recoverable` : " — at maximum"}` +
        `${r.ceilingNote ? ` — ${r.ceilingNote}` : ""}\n      ${r.rationale}`,
    )
    .join("\n");

  const candidates = rows
    .filter((r) => r.recoverable > 0)
    .sort((a, b) => b.recoverable - a.recoverable)
    .slice(0, 5)
    .map((r) => `  ${r.dimensionId} (${r.name}): ${r.recoverable} points recoverable, currently ${r.score}/${r.max}`)
    .join("\n");

  return [
    `This is a ${rubric.title.toLowerCase()}. ${roles.coach ? `The coach is ${roles.coach}.` : ""} ${
      roles.client ? `The client is ${roles.client}.` : ""
    }`.trim(),
    "",
    "Scoring is finished. These are the final scores, already verified and with all automatic caps applied. They are settled — your job is to describe them, not to revisit them. Nothing you write may contradict a number below.",
    "",
    `FINAL TOTAL: ${total.score}/100 — ${total.band}`,
    total.capsFired.length ? `CAPS FIRED: ${total.capsFired.join("; ")}` : "CAPS FIRED: none",
    "",
    "DIMENSION SCORES:",
    table,
    "",
    "---",
    "",
    "Write three things.",
    "",
    "1. THE ONE THING. The single change that would move the number most. Pick the dimension where recoverable points and realistic coachability meet — the largest gap is usually right, but not when reaching it depended on something outside the coach's control on this call. Name the dimension, state the score it would realistically have reached, and write the change as one direct instruction to the coach. Do not state a new total; it is recomputed from the score you name.",
    "",
    "Dimensions with points still available:",
    candidates || "  none — every dimension is at maximum",
    "",
    "2. THE BRIEF. 3-5 sentences to the coach on how the call went. Specific and plain. Name what actually happened. It must sit consistently with the total above — do not write an upbeat brief over a failing score, or a grim one over a strong score.",
    "",
    "3. RED FLAGS. What puts this client at risk of leaving, and why. A good-looking score can still hide one — a booked next call with no accountability, or a warm rapport with no vision. Return an empty array if there are genuinely none. Do not manufacture a flag to fill the section.",
  ].join("\n");
}
