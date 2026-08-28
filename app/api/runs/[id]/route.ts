import { NextResponse } from "next/server";
import { getRun } from "@/lib/db";
import { STAGE_LABEL } from "@/lib/report-types";

/**
 * Poll a run.
 *
 * Returns one of three shapes — running, failed, or complete — and never a
 * fourth ambiguous one. A run whose worker died is reported as failed here,
 * inferred from a stale heartbeat, so the page never shows a spinner for work
 * that stopped.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Not a valid run id." }, { status: 400 });
  }

  let run;
  try {
    run = await getRun(id);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not load the run." },
      { status: 500 },
    );
  }

  if (!run) return NextResponse.json({ error: "No run with that id." }, { status: 404 });

  if (run.stalled) {
    return NextResponse.json({
      status: "failed",
      errorCode: "worker_stopped",
      errorMessage: `Scoring stopped after ${run.scoredCount} of ${run.dimensionCount} dimensions and has not reported progress since ${new Date(
        run.heartbeatAt!,
      ).toLocaleTimeString()}. The worker was most likely killed by the platform's function timeout.`,
      stage: run.stage,
      scored: run.scoredCount,
      total: run.dimensionCount,
    });
  }

  if (run.status === "failed") {
    return NextResponse.json({
      status: "failed",
      errorCode: run.errorCode,
      errorMessage: run.errorMessage,
      stage: run.stage,
      scored: run.scoredCount,
      total: run.dimensionCount,
    });
  }

  if (run.status === "complete" && run.report) {
    return NextResponse.json({ status: "complete", report: run.report });
  }

  return NextResponse.json({
    status: run.status,
    stage: run.stage,
    stageLabel: STAGE_LABEL[run.stage],
    scored: run.scoredCount,
    total: run.dimensionCount,
  });
}
