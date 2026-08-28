import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CallType } from "./rubric";
import type { Report, ReportDimension, RunProgress, RunStatus } from "./report-types";

/**
 * Persistence.
 *
 * Server-only. Uses the service role key, so nothing here may ever be imported
 * into a client component — the anon key is deliberately never wired up,
 * because a transcript of a real client conversation should not be one guessed
 * UUID away from being readable by anyone.
 */

let cached: SupabaseClient | null = null;

export function getDb(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. Runs cannot be persisted without them.",
    );
  }
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}

/**
 * How long a `running` run may go without a heartbeat before it is presumed dead.
 *
 * The requirement is that a failed run says why rather than spinning forever.
 * A worker killed mid-flight cannot write its own epitaph, so the read path
 * infers it: the last heartbeat is the last moment we know work was happening.
 */
export const HEARTBEAT_TIMEOUT_MS = 3 * 60 * 1000;

export interface RunRow {
  id: string;
  callType: CallType;
  status: RunStatus;
  stage: RunProgress["stage"];
  scoredCount: number;
  dimensionCount: number;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  heartbeatAt: string | null;
  /** Present only once the run is complete. */
  report: Report | null;
  /** True when status is `running` but the heartbeat has gone stale. */
  stalled: boolean;
}

export async function createRun(
  callType: CallType,
  transcript: string,
  stats: { chars: number; turns: number; words: number },
): Promise<string> {
  const db = getDb();
  const { data, error } = await db
    .from("runs")
    .insert({ call_type: callType, status: "queued", stage: "identify" })
    .select("id")
    .single();
  if (error) throw new Error(`Could not create run: ${error.message}`);

  const { error: tErr } = await db.from("transcripts").insert({
    run_id: data.id,
    raw_text: transcript,
    char_count: stats.chars,
    turn_count: stats.turns,
    word_count: stats.words,
  });
  if (tErr) {
    // A run without its transcript can never be re-scored or audited, so don't
    // leave a half-created row behind.
    await db.from("runs").delete().eq("id", data.id);
    throw new Error(`Could not store transcript: ${tErr.message}`);
  }

  return data.id as string;
}

export async function getTranscript(runId: string): Promise<string | null> {
  const { data, error } = await getDb()
    .from("transcripts")
    .select("raw_text")
    .eq("run_id", runId)
    .maybeSingle();
  if (error || !data) return null;
  return data.raw_text as string;
}

export async function markRunning(runId: string): Promise<void> {
  await getDb()
    .from("runs")
    .update({
      status: "running",
      started_at: new Date().toISOString(),
      heartbeat_at: new Date().toISOString(),
    })
    .eq("id", runId);
}

export async function updateProgress(runId: string, p: RunProgress): Promise<void> {
  await getDb()
    .from("runs")
    .update({
      stage: p.stage,
      scored_count: p.scored,
      dimension_count: p.total,
      heartbeat_at: new Date().toISOString(),
    })
    .eq("id", runId);
}

export async function failRun(runId: string, code: string, message: string): Promise<void> {
  await getDb()
    .from("runs")
    .update({
      status: "failed",
      error_code: code,
      error_message: message,
      finished_at: new Date().toISOString(),
      heartbeat_at: new Date().toISOString(),
    })
    .eq("id", runId);
}

export async function completeRun(runId: string, report: Report): Promise<void> {
  const db = getDb();

  const { error } = await db
    .from("runs")
    .update({
      status: "complete",
      stage: "done",
      scored_count: report.dimensions.length,
      finished_at: new Date().toISOString(),
      heartbeat_at: new Date().toISOString(),
      model: report.meta.model,
      rubric_version: report.meta.rubricVersion,
      coach_name: report.coach,
      client_name: report.client,
      call_summary: report.callSummary,
      brief: report.brief,
      one_thing: report.oneThing,
      red_flags: report.redFlags,
      caps_fired: report.capsFired,
      totals: report.totals,
      meta: report.meta,
    })
    .eq("id", runId);
  if (error) throw new Error(`Could not save run: ${error.message}`);

  // Replace rather than append, so a re-run of the same id is idempotent.
  await db.from("run_dimensions").delete().eq("run_id", runId);
  await db.from("run_evidence").delete().eq("run_id", runId);

  const { error: dErr } = await db.from("run_dimensions").insert(
    report.dimensions.map((d) => ({
      run_id: runId,
      dimension_id: d.id,
      ordinal: d.n,
      name: d.name,
      pillar: d.pillar ?? null,
      score: d.score,
      max_score: d.max,
      ceiling: d.ceiling,
      bucket_label: d.bucketLabel,
      rationale: d.rationale,
      quick_fix: d.quickFix,
      behaviour_present: d.behaviourPresent,
      disabled: d.disabled,
      disabled_reason: d.disabledReason ?? null,
      integrity: d.integrity,
      integrity_note: d.integrityNote,
      cap_notes: d.capNotes,
      snap_note: d.snapNote ?? null,
    })),
  );
  if (dErr) throw new Error(`Could not save dimensions: ${dErr.message}`);

  const evidenceRows = [
    ...report.dimensions.flatMap((d) =>
      d.evidence.map((e) => ({
        run_id: runId,
        dimension_id: d.id,
        red_flag_idx: null as number | null,
        line_no: e.line,
        line_label: e.label,
        speaker: e.speaker,
        quote: e.quote,
        corrected: Boolean(e.corrected),
        claimed_label: e.claimedLabel ?? null,
      })),
    ),
    ...report.redFlags.flatMap((f, i) =>
      f.evidence.map((e) => ({
        run_id: runId,
        dimension_id: null as string | null,
        red_flag_idx: i,
        line_no: e.line,
        line_label: e.label,
        speaker: e.speaker,
        quote: e.quote,
        corrected: Boolean(e.corrected),
        claimed_label: e.claimedLabel ?? null,
      })),
    ),
  ];

  if (evidenceRows.length > 0) {
    const { error: eErr } = await db.from("run_evidence").insert(evidenceRows);
    if (eErr) throw new Error(`Could not save evidence: ${eErr.message}`);
  }
}

/** Reassemble the stored rows into the same Report shape the pipeline produced. */
export async function getRun(runId: string): Promise<RunRow | null> {
  const db = getDb();

  const { data: run, error } = await db.from("runs").select("*").eq("id", runId).maybeSingle();
  if (error || !run) return null;

  const heartbeat = run.heartbeat_at ? Date.parse(run.heartbeat_at) : null;
  const stalled =
    run.status === "running" && heartbeat !== null && Date.now() - heartbeat > HEARTBEAT_TIMEOUT_MS;

  const base: RunRow = {
    id: run.id,
    callType: run.call_type,
    status: run.status,
    stage: run.stage,
    scoredCount: run.scored_count ?? 0,
    dimensionCount: run.dimension_count ?? 12,
    errorCode: run.error_code,
    errorMessage: run.error_message,
    createdAt: run.created_at,
    startedAt: run.started_at,
    finishedAt: run.finished_at,
    heartbeatAt: run.heartbeat_at,
    report: null,
    stalled,
  };

  if (run.status !== "complete") return base;

  const [{ data: dims }, { data: evidence }] = await Promise.all([
    db.from("run_dimensions").select("*").eq("run_id", runId).order("ordinal"),
    db.from("run_evidence").select("*").eq("run_id", runId).order("line_no"),
  ]);

  const evByDim = new Map<string, ReportDimension["evidence"]>();
  const evByFlag = new Map<number, ReportDimension["evidence"]>();
  for (const e of evidence ?? []) {
    const item = {
      label: e.line_label,
      line: e.line_no,
      speaker: e.speaker,
      quote: e.quote,
      corrected: e.corrected,
      claimedLabel: e.claimed_label ?? undefined,
    };
    if (e.dimension_id) {
      const list = evByDim.get(e.dimension_id) ?? [];
      list.push(item);
      evByDim.set(e.dimension_id, list);
    } else if (e.red_flag_idx !== null) {
      const list = evByFlag.get(e.red_flag_idx) ?? [];
      list.push(item);
      evByFlag.set(e.red_flag_idx, list);
    }
  }

  const report: Report = {
    callType: run.call_type,
    rubricTitle: run.call_type === "coaching" ? "Coaching call" : "Kick-off call",
    coach: run.coach_name,
    client: run.client_name,
    callSummary: run.call_summary ?? "",
    brief: run.brief ?? "",
    oneThing: run.one_thing,
    redFlags: (run.red_flags ?? []).map(
      (f: Report["redFlags"][number], i: number) => ({ ...f, evidence: evByFlag.get(i) ?? [] }),
    ),
    totals: run.totals,
    // `binding` was added after some runs were stored; a legacy cap with no
    // flag is treated as binding, which is how those older reports rendered.
    capsFired: (run.caps_fired ?? []).map((c: Report["capsFired"][number]) => ({
      ...c,
      binding: c.binding ?? true,
    })),
    meta: run.meta,
    dimensions: (dims ?? []).map((d) => ({
      id: d.dimension_id,
      n: d.ordinal,
      name: d.name,
      pillar: d.pillar ?? undefined,
      score: Number(d.score),
      max: d.max_score,
      ceiling: Number(d.ceiling),
      bucketLabel: d.bucket_label,
      rationale: d.rationale,
      quickFix: d.quick_fix,
      evidence: evByDim.get(d.dimension_id) ?? [],
      behaviourPresent: d.behaviour_present,
      disabled: d.disabled,
      disabledReason: d.disabled_reason ?? undefined,
      capNotes: d.cap_notes ?? [],
      snapNote: d.snap_note ?? undefined,
      integrity: d.integrity,
      integrityNote: d.integrity_note,
    })),
  };

  return { ...base, report };
}
