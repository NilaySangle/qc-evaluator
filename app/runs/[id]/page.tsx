import { notFound } from "next/navigation";
import { getRun, HEARTBEAT_TIMEOUT_MS } from "@/lib/db";
import { STAGE_LABEL } from "@/lib/report-types";
import { RunLive } from "@/components/RunLive";

/**
 * A run, by URL.
 *
 * Server-rendered from the database on every request, so the link is
 * shareable and durable: a colleague opening it sees the same evaluation, and
 * opening it next week still works. The client component only takes over to
 * poll while a run is still moving.
 */
export const dynamic = "force-dynamic";

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await getRun(id);
  if (!run) notFound();

  if (run.status === "complete" && run.report) {
    return <RunLive runId={id} initial={{ status: "complete", report: run.report }} />;
  }

  if (run.status === "failed" || run.stalled) {
    return (
      <RunLive
        runId={id}
        initial={{
          status: "failed",
          errorCode: run.stalled ? "worker_stopped" : run.errorCode,
          errorMessage: run.stalled
            ? `Scoring stopped after ${run.scoredCount} of ${run.dimensionCount} dimensions and has reported no progress for over ${Math.round(
                HEARTBEAT_TIMEOUT_MS / 60000,
              )} minutes.`
            : run.errorMessage,
          stage: run.stage,
          scored: run.scoredCount,
          total: run.dimensionCount,
        }}
      />
    );
  }

  return (
    <RunLive
      runId={id}
      initial={{
        status: run.status as "queued" | "running",
        stage: run.stage,
        stageLabel: STAGE_LABEL[run.stage],
        scored: run.scoredCount,
        total: run.dimensionCount,
      }}
    />
  );
}
