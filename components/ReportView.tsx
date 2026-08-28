import Link from "next/link";
import type { Report } from "@/lib/report-types";
import { bandStyle, formatCost, formatDuration, formatScore } from "@/lib/ui";
import { Gauge } from "./Gauge";
import { Dimension } from "./Dimension";
import { TopNav } from "./TopNav";
import { CiteLink, TranscriptProvider } from "./TranscriptPanel";

/**
 * The report.
 *
 * Ordered the way it is used, not the way it was computed: the change worth
 * making, the score it would reach, how the call went, what puts the client at
 * risk, then twelve rows for anyone checking the working.
 *
 * The previous version put a tracked uppercase label above every block, which
 * gives twelve sections the same voice and leaves the reader no hierarchy. Here
 * the section name is a real heading, and the eyebrow treatment is spent only
 * where it earns something: the mono line references a reviewer clicks.
 */
export function ReportView({ report, runId }: { report: Report; runId: string }) {
  const band = bandStyle(report.totals.band);
  const { oneThing, totals, meta } = report;
  const projected = oneThing.projectedScore != null ? bandStyle(oneThing.projectedBand) : null;

  return (
    <TranscriptProvider runId={runId} coach={report.coach}>
      <TopNav />

      {/* Identity bar. Stays put so the reviewer always knows whose call this is. */}
      <div
        className="sticky top-0 border-b border-line bg-surface/95 backdrop-blur"
        style={{ zIndex: "var(--z-sticky)" }}
      >
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-5 py-2.5 sm:px-8">
          <h1 className="text-[length:var(--text-body)] font-semibold text-ink">
            {report.client ?? "Unnamed client"}
          </h1>
          <span className="text-[length:var(--text-meta)] text-ink-3">
            {report.rubricTitle}
            {report.coach ? ` · ${report.coach}` : ""}
          </span>
          <span
            className="tnum ml-auto rounded-[var(--radius-sm)] px-2 py-0.5 font-mono text-[length:var(--text-meta)] font-semibold"
            style={{ color: band.fg, background: band.wash }}
          >
            {totals.score}/100 {totals.band}
          </span>
          <a
            href={`/api/runs/${runId}/pdf`}
            className="focus-ring no-print inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-ink px-2.5 py-1.5 text-[length:var(--text-meta)] font-medium text-surface transition-opacity hover:opacity-85"
          >
            <svg className="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M8 2v8m0 0L5 7m3 3l3-3M3 12v1.5h10V12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            PDF
          </a>
        </div>
      </div>

      <article className="mx-auto w-full max-w-5xl px-5 pb-20 sm:px-8">
        {report.callSummary && (
          <p className="max-w-[70ch] pt-7 text-[length:var(--text-read)] leading-relaxed text-ink-2">
            {report.callSummary}
          </p>
        )}

        {/* ---- the change worth making, and the score ---- */}
        <section className="grid gap-8 border-b border-line py-8 md:grid-cols-[1fr_auto] md:items-start">
          <div className="min-w-0">
            <h2 className="text-[length:var(--text-h3)] font-semibold text-ink">
              Fix this first
            </h2>
            <p className="mt-2.5 max-w-[62ch] text-[length:var(--text-lead)] leading-[1.45] text-ink">
              {oneThing.text}
            </p>

            {oneThing.projectedScore != null && (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-[length:var(--text-meta)] text-ink-2">
                <span className="font-medium text-ink">{oneThing.dimensionName}</span>
                <span className="tnum font-mono text-ink-3">
                  {formatScore(oneThing.currentScore)}/{oneThing.max}
                </span>
                <Arrow />
                <span className="tnum font-mono text-ink">
                  {formatScore(oneThing.targetScore)}/{oneThing.max}
                </span>
                <span className="text-ink-3">takes the call to</span>
                <span
                  className="tnum rounded-[var(--radius-sm)] px-2 py-0.5 font-mono font-semibold"
                  style={{ color: projected?.fg, background: projected?.wash }}
                >
                  {oneThing.projectedScore} {oneThing.projectedBand}
                </span>
                {oneThing.delta != null && oneThing.delta > 0 && (
                  <span className="tnum font-mono font-medium text-elite">+{oneThing.delta}</span>
                )}
              </div>
            )}

            <div className="mt-7">
              <h2 className="text-[length:var(--text-h3)] font-semibold text-ink">How it went</h2>
              <p className="mt-2 max-w-[70ch] text-[length:var(--text-read)] leading-relaxed text-ink-2">
                {report.brief}
              </p>
            </div>
          </div>

          <div className="flex justify-center md:justify-end">
            <Gauge score={totals.score} band={totals.band} cappedFrom={totals.cappedFrom} />
          </div>
        </section>

        {/* ---- caps ---- */}
        {report.capsFired.length > 0 && (
          <section className="border-b border-line py-7">
            <h2 className="text-[length:var(--text-h3)] font-semibold text-ink">
              Automatic caps
              <span className="ml-2 font-mono text-[length:var(--text-meta)] font-normal text-ink-3">
                {report.capsFired.filter((c) => c.binding).length} of {report.capsFired.length}{" "}
                removed points
              </span>
            </h2>
            <ul className="mt-3 space-y-2">
              {report.capsFired.map((c) => (
                <li
                  key={c.id}
                  className={`rounded-[var(--radius-md)] border px-3.5 py-2.5 ${
                    c.binding ? "border-fail/20 bg-fail/[0.04]" : "border-line bg-sunk"
                  }`}
                >
                  <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <span
                      className={`font-mono text-[length:var(--text-micro)] font-semibold tracking-[0.06em] ${
                        c.binding ? "text-fail" : "text-ink-2"
                      }`}
                    >
                      {c.effect.toUpperCase()}
                    </span>
                    {c.nonRecoverable && c.binding && (
                      <span className="rounded-[var(--radius-xs)] bg-fail/10 px-1.5 py-px font-mono text-[length:var(--text-micro)] text-fail">
                        non-recoverable
                      </span>
                    )}
                  </div>
                  <p className="mt-1 max-w-[70ch] text-[length:var(--text-dense)] text-ink">
                    {c.condition}
                  </p>
                  {c.measurement && (
                    <p className="mt-1 max-w-[70ch] font-mono text-[length:var(--text-micro)] text-ink-2">
                      {c.measurement}
                    </p>
                  )}
                  {!c.binding && (
                    <p className="mt-1 max-w-[70ch] text-[length:var(--text-meta)] text-ink-2">
                      The condition holds and is worth noting, but the call already scored below this
                      ceiling, so no points were removed.
                    </p>
                  )}
                  {c.binding && !c.measurement && c.reason && c.reason !== c.condition && (
                    <p className="mt-1 max-w-[70ch] text-[length:var(--text-meta)] text-ink-2">
                      {c.reason}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ---- red flags ---- */}
        <section className="border-b border-line py-7">
          <h2 className="text-[length:var(--text-h3)] font-semibold text-ink">
            Retention risk
            {report.redFlags.length > 0 && (
              <span className="ml-2 font-mono text-[length:var(--text-meta)] font-normal text-ink-3">
                {report.redFlags.length}
              </span>
            )}
          </h2>

          {report.redFlags.length === 0 ? (
            <p className="mt-2 max-w-[70ch] text-[length:var(--text-dense)] text-ink-2">
              Nothing in this transcript reads as a reason this client would leave.
            </p>
          ) : (
            <ul className="mt-3 space-y-4">
              {report.redFlags.map((f, i) => (
                <li key={i} className="flex gap-3">
                  <span
                    className="mt-[0.45rem] size-1.5 shrink-0 rounded-full"
                    style={{ background: f.severity === "high" ? "var(--fail)" : "var(--inconsistent)" }}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <h3 className="text-[length:var(--text-body)] font-medium text-ink">
                      {f.title}
                      <span className="ml-2 font-mono text-[length:var(--text-micro)] font-normal text-ink-3">
                        {f.severity}
                      </span>
                    </h3>
                    <p className="mt-0.5 max-w-[70ch] text-[length:var(--text-dense)] leading-relaxed text-ink-2">
                      {f.detail}
                    </p>
                    {f.evidence.length > 0 && (
                      <ul className="mt-2 space-y-1.5">
                        {f.evidence.map((e, j) => (
                          <li key={j} className="flex gap-2.5">
                            <CiteLink line={e.line} label={e.label} className="pt-0.5" />
                            <span className="max-w-[62ch] text-[length:var(--text-dense)] text-ink-2">
                              &ldquo;{e.quote}&rdquo;
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ---- dimensions ---- */}
        <section className="py-7">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[length:var(--text-h3)] font-semibold text-ink">
              Twelve dimensions
            </h2>
            <span className="tnum font-mono text-[length:var(--text-meta)] text-ink-3">
              {totals.raw}/{totals.activeMax} raw
              {totals.activeMax !== 100 && ` · ${totals.normalised}/100 normalised`}
            </span>
          </div>

          <div className="mt-1">
            {report.dimensions.map((d) => (
              <Dimension key={d.id} d={d} />
            ))}
          </div>
        </section>

        {/* ---- audit trail ---- */}
        <section className="rounded-[var(--radius-lg)] border border-line bg-sunk px-5 py-5">
          <h2 className="text-[length:var(--text-body)] font-semibold text-ink">
            How this score was produced
          </h2>
          <p className="mt-1.5 max-w-[70ch] text-[length:var(--text-dense)] leading-relaxed text-ink-2">
            {totals.method}
          </p>

          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            <Stat
              label="Citations kept"
              value={`${meta.evidence.verified + meta.evidence.relocated}/${meta.evidence.total}`}
              note={meta.evidence.dropped > 0 ? `${meta.evidence.dropped} dropped` : "all verified"}
            />
            <Stat
              label="Coach talk share"
              value={meta.coachTalkShare != null ? `${(meta.coachTalkShare * 100).toFixed(1)}%` : "—"}
              note="counted, not estimated"
            />
            <Stat
              label="Transcript"
              value={`${meta.transcriptTurns} turns`}
              note={`${meta.transcriptChars.toLocaleString()} chars`}
            />
            <Stat label="Run" value={formatDuration(meta.durationMs)} note={formatCost(meta.costUsd)} />
          </dl>

          <p className="mt-4 border-t border-line pt-3 font-mono text-[length:var(--text-micro)] text-ink-3">
            {meta.model} · rubric {meta.rubricVersion} · cache{" "}
            {meta.usage.cacheReadTokens.toLocaleString()} read /{" "}
            {meta.usage.cacheCreationTokens.toLocaleString()} written
          </p>

          {meta.notes.length > 0 && (
            <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
              {meta.notes.map((n, i) => (
                <li key={i} className="max-w-[75ch] text-[length:var(--text-meta)] leading-relaxed text-ink-2">
                  {n}
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="no-print mt-6 flex items-center justify-between text-[length:var(--text-meta)]">
          <Link href="/coaches" className="focus-ring text-ink-2 underline-offset-4 hover:underline">
            See how this coach compares across calls
          </Link>
          <span className="font-mono text-[length:var(--text-micro)] text-ink-3">
            run {runId.slice(0, 8)}
          </span>
        </footer>
      </article>
    </TranscriptProvider>
  );
}

function Arrow() {
  return (
    <svg className="size-3 text-ink-3" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M2 6h8m0 0L7 3m3 3L7 9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div>
      <dt className="text-[length:var(--text-meta)] text-ink-3">{label}</dt>
      <dd className="tnum mt-0.5 text-[length:var(--text-body)] font-semibold text-ink">{value}</dd>
      {note && <dd className="font-mono text-[length:var(--text-micro)] text-ink-3">{note}</dd>}
    </div>
  );
}
