import { z } from "zod";

/**
 * The shapes the model is allowed to return.
 *
 * Structured output is obtained with a forced tool call rather than by asking
 * for JSON in prose: the tool schema is enforced by the API, and what comes
 * back is then re-validated here with Zod. The model can still be wrong about
 * the call — it cannot be wrong about the shape, and if it is, the run fails
 * loudly instead of half-parsing.
 */

export const evidenceItemSchema = z.object({
  /** Line label from the numbered transcript, e.g. "L047". */
  line: z.string(),
  /**
   * The words being relied on, copied from that line.
   *
   * Verified against the real line downstream. This is the field that makes a
   * guess detectable: a model inventing support for a score has to invent a
   * quote, and an invented quote will not be found.
   */
  quote: z.string(),
});

export const dimensionResultSchema = z.object({
  dimension_id: z.string(),
  /**
   * Whether the behaviour this dimension measures appears in the transcript at
   * all.
   *
   * Separated from the score so "the coach did this badly" and "there is no
   * evidence either way" stop being the same number. When false, the rubric's
   * instruction to score conservatively applies and the report says the
   * behaviour is not present rather than implying it was observed and judged.
   */
  behaviour_present: z.boolean(),
  score: z.number(),
  bucket_label: z.string(),
  /** Quote-first, per both rubrics' scoring principles. */
  rationale: z.string(),
  evidence: z.array(evidenceItemSchema),
  /** What the coach had to do to reach full marks on this dimension. */
  quick_fix: z.string(),
});

export const capJudgementSchema = z.object({
  cap_id: z.string(),
  /** True means the condition holds and the cap fires. */
  fired: z.boolean(),
  reason: z.string(),
  evidence: z.array(evidenceItemSchema).optional(),
});

/** What one scoring call returns: its slice of dimensions plus any caps it owns. */
export const scoringGroupResultSchema = z.object({
  dimensions: z.array(dimensionResultSchema),
  caps: z.array(capJudgementSchema).optional(),
});

/** The cheap first pass: who is who, and what the call was about. */
export const identifyResultSchema = z.object({
  coach_name: z.string(),
  client_name: z.string(),
  /** One line of context for the report header. */
  call_summary: z.string(),
  /**
   * Whether live movement coaching occurred. Drives the coaching D4 optional
   * rule, so it is asked explicitly rather than inferred from a score.
   */
  movement_coaching_present: z.boolean().optional(),
  movement_coaching_note: z.string().optional(),
  /**
   * Whether a diagnostics/movement review took place. Drives the coaching D2
   * optional rule — a non-milestone call has no diagnostics to review, and the
   * rubric forbids penalising the coach for it.
   */
  diagnostics_reviewed: z.boolean().optional(),
  diagnostics_note: z.string().optional(),
});

export const redFlagSchema = z.object({
  title: z.string(),
  /** Why this puts the client at risk of leaving. */
  detail: z.string(),
  severity: z.enum(["high", "medium"]),
  evidence: z.array(evidenceItemSchema).optional(),
});

/**
 * The narrative pass.
 *
 * Runs after scoring and receives the final, capped, verified numbers as input.
 * The brief therefore cannot contradict the total it is describing, which is
 * the failure mode when a single call is asked to produce prose and scores
 * together.
 *
 * `one_thing_dimension` names a dimension and `one_thing_target_score` a score
 * within it; the projected total is then recomputed arithmetically rather than
 * predicted by the model.
 */
export const narrativeResultSchema = z.object({
  one_thing: z.string(),
  one_thing_dimension: z.string(),
  one_thing_target_score: z.number(),
  brief: z.string(),
  red_flags: z.array(redFlagSchema),
});

export type EvidenceItem = z.infer<typeof evidenceItemSchema>;
export type DimensionResult = z.infer<typeof dimensionResultSchema>;
export type CapJudgement = z.infer<typeof capJudgementSchema>;
export type ScoringGroupResult = z.infer<typeof scoringGroupResultSchema>;
export type IdentifyResult = z.infer<typeof identifyResultSchema>;
export type RedFlag = z.infer<typeof redFlagSchema>;
export type NarrativeResult = z.infer<typeof narrativeResultSchema>;

/* ------------------------------------------------------------------ *
 * JSON Schema for the Anthropic tool definitions.
 *
 * Hand-written rather than generated so the descriptions can carry the
 * instructions that matter most — particularly that evidence must be copied
 * from the transcript, never composed.
 * ------------------------------------------------------------------ */

const evidenceJsonSchema = {
  type: "array" as const,
  description:
    "Verbatim support for the score. Each item points at one numbered line and quotes the words being relied on. Quotes are checked against the transcript after you answer: anything that cannot be found is discarded. Copy, never paraphrase, and never cite a line you have not read.",
  items: {
    type: "object" as const,
    properties: {
      line: { type: "string", description: 'Line label exactly as shown, e.g. "L047".' },
      quote: {
        type: "string",
        description:
          "A contiguous run of words copied character-for-character from that line. Do not stitch together words from different places.",
      },
    },
    required: ["line", "quote"],
    additionalProperties: false,
  },
};

export const scoreDimensionsTool = {
  name: "submit_scores",
  description: "Submit the score, reasoning, evidence and quick fix for each assigned dimension.",
  input_schema: {
    type: "object" as const,
    properties: {
      dimensions: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            dimension_id: { type: "string", description: 'e.g. "D3".' },
            behaviour_present: {
              type: "boolean",
              description:
                "Does the behaviour this dimension measures appear in the transcript at all? false means there is no evidence either way — not that it was done badly. Say so plainly in the rationale when false and score conservatively.",
            },
            score: {
              type: "number",
              description:
                "Must be a legal score for this dimension. Discrete dimensions accept only the listed bucket values, with no interpolation. Range dimensions accept any value inside a listed band.",
            },
            bucket_label: { type: "string", description: 'The band or bucket name, e.g. "Elite".' },
            rationale: {
              type: "string",
              description:
                "2-4 sentences opening with the specific moment in the call that drives the score, then why that lands in this bucket. No impressions, no reading the mood.",
            },
            evidence: evidenceJsonSchema,
            quick_fix: {
              type: "string",
              description:
                "One concrete sentence: what the coach had to do on this call to reach full marks. Specific to what actually happened, not generic advice.",
            },
          },
          required: [
            "dimension_id",
            "behaviour_present",
            "score",
            "bucket_label",
            "rationale",
            "evidence",
            "quick_fix",
          ],
          additionalProperties: false,
        },
      },
      caps: {
        type: "array" as const,
        description: "Judgements on the automatic caps assigned to you. Omit if you were assigned none.",
        items: {
          type: "object" as const,
          properties: {
            cap_id: { type: "string" },
            fired: { type: "boolean", description: "true means the condition holds and the cap applies." },
            reason: { type: "string", description: "One sentence justifying the verdict." },
            evidence: evidenceJsonSchema,
          },
          required: ["cap_id", "fired", "reason"],
          additionalProperties: false,
        },
      },
    },
    required: ["dimensions"],
    additionalProperties: false,
  },
};

export const identifyTool = {
  name: "submit_identification",
  description: "Identify the participants and the basic shape of the call.",
  input_schema: {
    type: "object" as const,
    properties: {
      coach_name: {
        type: "string",
        description:
          "Exact speaker name of the coach — the practitioner running the call. Must match a speaker label in the transcript character-for-character.",
      },
      client_name: {
        type: "string",
        description: "Exact speaker name of the client. Must match a speaker label in the transcript.",
      },
      call_summary: { type: "string", description: "One sentence on what this call was about." },
      movement_coaching_present: {
        type: "boolean",
        description:
          "Coaching calls only. True if ANY of these occurred: the client performed live movement; the coach gave setup/breathing/control cues in response to a movement; a recorded movement attempt was reviewed with real-time feedback; the coach gave real-time form correction while the client moved. All four must be absent for false.",
      },
      movement_coaching_note: {
        type: "string",
        description: "If movement_coaching_present is false, one short sentence saying what the call consisted of instead.",
      },
      diagnostics_reviewed: {
        type: "boolean",
        description:
          "Coaching calls only. True if a diagnostics/movement review actually took place: a screen-share of a movement, the coach walking through recorded footage, or the coach responding to video the client submitted. False for a routine non-milestone call where no diagnostics were due and none were reviewed. When false, the diagnostics dimension is treated as not-applicable rather than scored.",
      },
      diagnostics_note: {
        type: "string",
        description: "If diagnostics_reviewed is false, one short sentence noting that no diagnostics review was due or performed this cycle.",
      },
    },
    required: ["coach_name", "client_name", "call_summary"],
    additionalProperties: false,
  },
};

export const narrativeTool = {
  name: "submit_narrative",
  description: "Write the report narrative from the final scores.",
  input_schema: {
    type: "object" as const,
    properties: {
      one_thing: {
        type: "string",
        description:
          "The single change that would move the number most, written as a direct instruction to the coach in one sentence. Concrete and specific to this call.",
      },
      one_thing_dimension: {
        type: "string",
        description: 'Which dimension that change belongs to, e.g. "D3". Must be one of the dimensions listed.',
      },
      one_thing_target_score: {
        type: "number",
        description:
          "The score that dimension would realistically have reached had the coach made the change. Must be a legal score for that dimension and higher than the one awarded. The new total is recomputed from this, so do not state a total yourself.",
      },
      brief: {
        type: "string",
        description:
          "3-5 sentences to the coach on how the call went. Plain and specific — name what happened. Consistent with the scores you were given.",
      },
      red_flags: {
        type: "array" as const,
        description:
          "What puts this client at risk of leaving, and why. A good-looking score can still hide one. Empty array if there are genuinely none — do not invent one.",
        items: {
          type: "object" as const,
          properties: {
            title: { type: "string", description: "Short label, under 8 words." },
            detail: { type: "string", description: "1-2 sentences on the retention risk and what causes it." },
            severity: { type: "string", enum: ["high", "medium"] },
            evidence: evidenceJsonSchema,
          },
          required: ["title", "detail", "severity"],
          additionalProperties: false,
        },
      },
    },
    required: ["one_thing", "one_thing_dimension", "one_thing_target_score", "brief", "red_flags"],
    additionalProperties: false,
  },
};
