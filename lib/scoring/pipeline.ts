import { getRubric, type CallType } from "../rubric";
import {
  parseTranscript,
  renderForModel,
  resolveRoles,
  coachTalkShare,
  validateTranscript,
} from "../transcript";
import type { Report, ReportDimension, ReportEvidence, RunProgress } from "../report-types";
import {
  addUsage,
  callTool,
  estimateCostUsd,
  ModelError,
  ZERO_USAGE,
  type Usage,
} from "./client";
import {
  identifyResultSchema,
  identifyTool,
  narrativeResultSchema,
  narrativeTool,
  scoreDimensionsTool,
  scoringGroupResultSchema,
  type CapJudgement,
  type DimensionResult,
} from "./schema";
import {
  buildCachedPrefix,
  buildGroups,
  buildIdentifyInstructions,
  buildNarrativeInstructions,
  buildScoringInstructions,
  SYSTEM_PROMPT,
  type NarrativeInput,
} from "./prompt";
import { assessIntegrity, summarise, usableEvidence, verifyEvidence } from "./verify";
import { computeTotal, projectTotal, type CapInput } from "./total";

/**
 * The four stages, in order.
 *
 *   identify   one small call. Names the participants, decides whether the
 *              optional dimension applies, and — usefully — writes the
 *              transcript into the prompt cache that the next four calls read.
 *
 *   score      four calls in parallel, three dimensions each, every one holding
 *              the complete transcript.
 *
 *   verify     no model. Citations are checked against the transcript, caps are
 *              applied, the total is computed.
 *
 *   narrate    one call, given the finished numbers. It describes them; it
 *              cannot change them, which is why the brief can never contradict
 *              the score printed beside it.
 */

export interface RunOptions {
  callType: CallType;
  transcript: string;
  /** Called as work completes so a run can be written to the database incrementally. */
  onProgress?: (p: RunProgress) => void | Promise<void>;
}

export class PipelineError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly detail?: string,
  ) {
    super(message);
    this.name = "PipelineError";
  }
}

function toReportEvidence(items: ReturnType<typeof verifyEvidence>): ReportEvidence[] {
  return usableEvidence(items).map((e) => ({
    label: e.label,
    line: e.line!,
    speaker: e.speaker,
    quote: e.quote,
    corrected: e.status === "relocated",
    claimedLabel: e.claimedLabel,
  }));
}

export async function runEvaluation(opts: RunOptions): Promise<Report> {
  const started = Date.now();
  const rubric = getRubric(opts.callType);
  const parsed = parseTranscript(opts.transcript);

  const problem = validateTranscript(parsed);
  if (problem) throw new PipelineError(problem.code, problem.message);

  const numbered = renderForModel(parsed);
  const cachedPrefix = buildCachedPrefix(numbered);
  const groups = buildGroups(rubric);
  let usage: Usage = ZERO_USAGE;

  const progress = async (stage: RunProgress["stage"], scored: number) => {
    await opts.onProgress?.({ stage, scored, total: rubric.dimensions.length });
  };

  // ---- 1. Identify ---------------------------------------------------------
  await progress("identify", 0);
  const identify = await callTool({
    system: SYSTEM_PROMPT,
    cachedPrefix,
    instructions: buildIdentifyInstructions(rubric),
    tool: identifyTool,
    schema: identifyResultSchema,
    maxTokens: 1000,
  });
  usage = addUsage(usage, identify.usage);

  // The model's names are only accepted if they match a speaker who actually
  // spoke; otherwise we fall back rather than print an invented name.
  const roles = resolveRoles(parsed, {
    coach: identify.value.coach_name,
    client: identify.value.client_name,
  });
  const talkShare = coachTalkShare(parsed, roles.coach);

  // ---- 2. Score, in parallel ----------------------------------------------
  await progress("scoring", 0);
  let completed = 0;

  const results = await Promise.all(
    groups.map(async (group) => {
      const r = await callTool({
        system: SYSTEM_PROMPT,
        cachedPrefix,
        instructions: buildScoringInstructions(rubric, group, roles),
        tool: scoreDimensionsTool,
        schema: scoringGroupResultSchema,
        maxTokens: 6000,
      });
      completed += group.dimensions.length;
      await progress("scoring", completed);
      return r;
    }),
  );

  for (const r of results) usage = addUsage(usage, r.usage);

  const dimensionResults: DimensionResult[] = results.flatMap((r) => r.value.dimensions);
  const capJudgements: CapJudgement[] = results.flatMap((r) => r.value.caps ?? []);

  // ---- 3. Verify and compute — no model past this point --------------------
  await progress("verifying", rubric.dimensions.length);

  const verifiedByDimension = new Map<string, ReturnType<typeof verifyEvidence>>();
  for (const d of dimensionResults) {
    verifiedByDimension.set(d.dimension_id, verifyEvidence(parsed, d.evidence));
  }

  const computed = computeTotal({
    rubric,
    dimensions: dimensionResults.map((d) => ({
      dimensionId: d.dimension_id,
      score: d.score,
      bucketLabel: d.bucket_label,
      rationale: d.rationale,
      quickFix: d.quick_fix,
      behaviourPresent: d.behaviour_present,
    })),
    capJudgements: capJudgements.map<CapInput>((c) => ({
      capId: c.cap_id,
      fired: c.fired,
      reason: c.reason,
    })),
    coachTalkShare: talkShare,
    applicability: {
      movement_coaching: identify.value.movement_coaching_present,
      diagnostics_review: identify.value.diagnostics_reviewed,
    },
    applicabilityNotes: {
      movement_coaching: identify.value.movement_coaching_note,
      diagnostics_review: identify.value.diagnostics_note,
    },
  });

  const dimensions: ReportDimension[] = computed.dimensions.map((s) => {
    const verified = verifiedByDimension.get(s.dimension.id) ?? [];
    const integrity = assessIntegrity(verified, s.behaviourPresent && !s.disabled);
    return {
      id: s.dimension.id,
      n: s.dimension.n,
      name: s.dimension.name,
      pillar: s.dimension.pillar,
      score: s.score,
      max: s.dimension.max,
      bucketLabel: s.bucketLabel,
      rationale: s.rationale,
      quickFix: s.quickFix,
      evidence: toReportEvidence(verified),
      behaviourPresent: s.behaviourPresent,
      disabled: s.disabled,
      disabledReason: s.disabledReason,
      ceiling: s.ceiling,
      capNotes: s.capNotes,
      snapNote: s.snapNote,
      integrity: integrity.level,
      integrityNote: integrity.message,
    };
  });

  const allEvidence = [...verifiedByDimension.values()].flat();
  const evidenceSummary = summarise(allEvidence);

  // ---- 4. Narrate, from the settled numbers --------------------------------
  await progress("narrating", rubric.dimensions.length);

  const narrativeRows: NarrativeInput[] = computed.dimensions
    .filter((d) => !d.disabled)
    .map((d) => ({
      dimensionId: d.dimension.id,
      name: d.dimension.name,
      score: d.score,
      max: d.dimension.max,
      bucketLabel: d.bucketLabel,
      rationale: d.rationale,
      recoverable: d.recoverable,
      ceilingNote:
        d.ceiling < d.dimension.max ? `capped at ${d.ceiling}/${d.dimension.max}` : undefined,
      behaviourPresent: d.behaviourPresent,
    }));

  const narrative = await callTool({
    system: SYSTEM_PROMPT,
    cachedPrefix,
    instructions: buildNarrativeInstructions(
      rubric,
      narrativeRows,
      {
        score: computed.total.score,
        band: computed.total.band,
        capsFired: computed.total.capsFired.map((c) => c.cap.condition),
      },
      roles,
    ),
    tool: narrativeTool,
    schema: narrativeResultSchema,
    maxTokens: 2500,
  });
  usage = addUsage(usage, narrative.usage);

  // The projected total is arithmetic through the same caps as the real one.
  const projection = projectTotal(
    rubric,
    computed.dimensions,
    computed.total,
    narrative.value.one_thing_dimension,
    narrative.value.one_thing_target_score,
  );
  const oneThingDim = dimensions.find((d) => d.id === narrative.value.one_thing_dimension);

  const notes: string[] = [];
  if (rubric.statedTotalNote) notes.push(rubric.statedTotalNote);
  if (!roles.fromModel) {
    notes.push(
      "Participant roles were resolved from the transcript order because the model's names did not match a speaker.",
    );
  }
  if (parsed.unparsedCount > 0) {
    notes.push(
      `${parsed.unparsedCount} line${parsed.unparsedCount === 1 ? "" : "s"} did not match the "[Speaker]: text" shape and were folded into the preceding turn.`,
    );
  }
  if (evidenceSummary.dropped > 0) {
    notes.push(
      `${evidenceSummary.dropped} of ${evidenceSummary.total} citations could not be found in the transcript and were removed before this report was rendered.`,
    );
  }

  await progress("done", rubric.dimensions.length);

  return {
    callType: opts.callType,
    rubricTitle: rubric.title,
    coach: roles.coach,
    client: roles.client,
    callSummary: identify.value.call_summary,
    brief: narrative.value.brief,
    oneThing: {
      text: narrative.value.one_thing,
      dimensionId: narrative.value.one_thing_dimension,
      dimensionName: oneThingDim?.name ?? narrative.value.one_thing_dimension,
      targetScore: projection?.appliedScore ?? narrative.value.one_thing_target_score,
      currentScore: oneThingDim?.score ?? 0,
      max: oneThingDim?.max ?? 0,
      projectedScore: projection?.score ?? null,
      projectedBand: projection?.band ?? null,
      delta: projection?.delta ?? null,
    },
    redFlags: narrative.value.red_flags.map((f) => ({
      title: f.title,
      detail: f.detail,
      severity: f.severity,
      evidence: toReportEvidence(verifyEvidence(parsed, f.evidence)),
    })),
    totals: {
      score: computed.total.score,
      band: computed.total.band,
      bandDescription: computed.total.bandDescription,
      raw: computed.total.raw,
      activeMax: computed.total.activeMax,
      normalised: computed.total.normalised,
      cappedFrom: computed.total.cappedFrom,
      method: computed.total.method,
    },
    capsFired: computed.total.capsFired.map((c) => {
      const effect = c.cap.effect;
      // A cap is binding only if it actually removed points. For a total cap
      // that means the score the call earned exceeded the ceiling; for a
      // dimension cap it means the targeted dimension carries a cap note (the
      // note is only written when the score was above the cap value).
      const binding =
        effect.kind === "total_max"
          ? computed.total.normalised > effect.value
          : (computed.dimensions.find((d) => d.dimension.id === effect.target)?.capNotes.length ??
              0) > 0;
      return {
        id: c.cap.id,
        condition: c.cap.condition,
        reason: c.reason,
        measurement: c.measurement,
        nonRecoverable: Boolean(c.cap.nonRecoverable),
        binding,
        effect:
          effect.kind === "total_max"
            ? binding
              ? `Total capped at ${effect.value}`
              : `Condition met, ceiling ${effect.value} (no points removed)`
            : effect.kind === "dimension_max"
              ? binding
                ? `${effect.target} capped at ${effect.value}`
                : `${effect.target} condition met (no points removed)`
              : `${effect.target} set to ${effect.value}`,
      };
    }),
    dimensions,
    meta: {
      model: narrative.model,
      rubricVersion: rubric.version,
      transcriptChars: parsed.totalChars,
      transcriptTurns: parsed.lines.length,
      transcriptWords: parsed.totalWords,
      coachTalkShare: talkShare,
      durationMs: Date.now() - started,
      costUsd: estimateCostUsd(usage),
      usage,
      evidence: evidenceSummary,
      notes,
    },
  };
}

/** Turn any pipeline failure into something a run page can explain. */
export function describeFailure(err: unknown): { code: string; message: string } {
  if (err instanceof PipelineError) return { code: err.code, message: err.message };
  if (err instanceof ModelError) return { code: err.code, message: err.message };
  return {
    code: "unknown",
    message: err instanceof Error ? err.message : "The run failed for an unknown reason.",
  };
}
