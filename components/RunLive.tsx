"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Report, RunProgress } from "@/lib/report-types";
import { STAGE_LABEL } from "@/lib/report-types";
import { ReportView } from "./ReportView";
import { TopNav } from "./TopNav";

/**
 * The run page while work is still happening.
 *
 * Polls rather than subscribes. Supabase Realtime would push, but it needs a
 * browser-side key and a channel subscription to watch a single row that
 * changes four or five times over a minute. A 1.5s poll on one endpoint is less
 * machinery for the same result, and it degrades to a page refresh.
 *
 * Three terminal states and no fourth: complete, failed, or stalled — where the
 * server infers death from a stale heartbeat. Nothing here can spin forever.
 */

type Poll =
  | { status: "queued" | "running"; stage: RunProgress["stage"]; stageLabel?: string; scored: number; total: number }
  | { status: "complete"; report: Report }
  | { status: "failed"; errorCode: string | null; errorMessage: string | null; stage?: string; scored?: number; total?: number };

const STAGES: RunProgress["stage"][] = ["identify", "scoring", "verifying", "narrating"];

export function RunLive({
  runId,
  initial,
}: {
  runId: string;
  initial: Poll;
}) {
  const [state, setState] = useState<Poll>(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (state.status === "complete" || state.status === "failed") return;

    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/runs/${runId}`, { cache: "no-store" });
        const data = (await res.json()) as Poll;
        if (!cancelled) setState(data);
      } catch {
        // A dropped poll is not a failed run. Keep trying; the heartbeat on the
        // server is what decides whether the work actually stopped.
      }
      if (!cancelled) timer.current = setTimeout(tick, 1500);
    };

    timer.current = setTimeout(tick, 1500);
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [runId, state.status]);

  if (state.status === "complete") {
    return <ReportView report={state.report} runId={runId} />;
  }

  if (state.status === "failed") {
    return <Failed runId={runId} state={state} />;
  }

  const currentIdx = STAGES.indexOf(state.stage);

  return (
    <>
      <TopNav />
      <main className="mx-auto w-full max-w-2xl px-5 py-16 sm:px-8">
        <h1 className="text-[length:var(--text-h2)] font-semibold text-ink">
          {state.stageLabel ?? STAGE_LABEL[state.stage]}
        </h1>
        <p className="mt-2 max-w-[64ch] text-[length:var(--text-read)] leading-relaxed text-ink-2">
          You can close this tab. Scoring runs on the server, and this URL will have the finished
          report whenever you come back to it.
        </p>

        <ol className="mt-8 space-y-2.5">
          {STAGES.map((s, i) => {
            const done = i < currentIdx;
            const active = i === currentIdx;
            return (
              <li key={s} className="flex items-center gap-3">
                <span
                  className={`grid size-5 shrink-0 place-items-center rounded-full border text-[length:var(--text-micro)] font-medium ${
                    done
                      ? "border-elite bg-elite text-white"
                      : active
                        ? "border-accent text-accent"
                        : "border-line text-ink-3"
                  }`}
                >
                  {done ? "\u2713" : i + 1}
                </span>
                <span
                  className={`text-[length:var(--text-body)] ${
                    active ? "font-medium text-ink" : done ? "text-ink-2" : "text-ink-3"
                  }`}
                >
                  {STAGE_LABEL[s]}
                </span>
                {active && s === "scoring" && state.total > 0 && (
                  <span className="tnum ml-auto font-mono text-[length:var(--text-meta)] text-ink-2">
                    {state.scored}/{state.total}
                  </span>
                )}
              </li>
            );
          })}
        </ol>

        <div className="indeterminate relative mt-8 h-1 overflow-hidden rounded-full bg-line-2" />

        <p className="mt-8 font-mono text-[length:var(--text-micro)] text-ink-3">run {runId}</p>
      </main>
    </>
  );
}

function Failed({
  runId,
  state,
}: {
  runId: string;
  state: Extract<Poll, { status: "failed" }>;
}) {
  return (
    <>
      <TopNav />
      <main className="mx-auto w-full max-w-2xl px-5 py-16 sm:px-8">
        <h1 className="text-[length:var(--text-h2)] font-semibold text-ink">
          {TITLES[state.errorCode ?? ""] ?? "This run did not finish."}
        </h1>

        <p className="mt-2.5 max-w-[64ch] text-[length:var(--text-read)] leading-relaxed text-ink-2">
          {state.errorMessage ?? "No further detail was recorded."}
        </p>

        {state.scored != null && state.total != null && state.scored > 0 && (
          <p className="tnum mt-2 font-mono text-[length:var(--text-meta)] text-ink-3">
            Reached {state.scored} of {state.total} dimensions before stopping.
          </p>
        )}

        {HINTS[state.errorCode ?? ""] && (
          <p className="mt-4 max-w-[68ch] rounded-[var(--radius-md)] border border-line bg-sunk px-3.5 py-3 text-[length:var(--text-dense)] leading-relaxed text-ink-2">
            {HINTS[state.errorCode ?? ""]}
          </p>
        )}

        <div className="mt-7 flex items-center gap-4">
          <Link
            href="/"
            className="focus-ring rounded-[var(--radius-md)] bg-accent px-4 py-2 text-[length:var(--text-body)] font-medium text-white transition-opacity hover:opacity-90"
          >
            Start another run
          </Link>
          <span className="font-mono text-[length:var(--text-micro)] text-ink-3">
            {state.errorCode ?? "unknown"} · run {runId.slice(0, 8)}
          </span>
        </div>
      </main>
    </>
  );
}

const TITLES: Record<string, string> = {
  worker_stopped: "Scoring stopped partway through.",
  missing_api_key: "No model key is configured.",
  credit_exhausted: "The model account is out of credit.",
  rate_limited: "The model API rate-limited this run.",
  overloaded: "The model API was overloaded.",
  context_too_long: "That transcript is too long for the model.",
  invalid_output: "The model returned a malformed result.",
  no_tool_call: "The model returned prose instead of scores.",
  unparsable: "That transcript could not be read.",
  too_short: "That transcript is too short to score.",
  single_speaker: "Only one speaker appears in that transcript.",
};

const HINTS: Record<string, string> = {
  worker_stopped:
    "Serverless functions are killed at a fixed time limit, and the largest transcripts can run past it. Re-running usually works. The durable fix is a job queue, which is the first thing I would add past this exercise.",
  missing_api_key: "Set ANTHROPIC_API_KEY in the environment and redeploy.",
  credit_exhausted: "Top up the Anthropic account, then run this transcript again.",
  rate_limited: "Wait a moment and start the run again.",
  overloaded: "This is transient on the API side. Starting the run again usually clears it.",
  unparsable:
    'Every line needs to look like "[Speaker Name]: what they said", one speaking turn per line.',
};
