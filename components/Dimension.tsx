"use client";

import { useState } from "react";
import type { ReportDimension } from "@/lib/report-types";
import { formatScore, scoreTone, TONE } from "@/lib/ui";
import { CiteLink } from "./TranscriptPanel";

/**
 * One dimension, as a row.
 *
 * Rows rather than cards: a reviewer scans twelve of these looking for the two
 * that went wrong, and a card grid makes twelve equal-weight objects out of
 * what is really a ranked list. The inline bar is the scanning affordance; the
 * disclosure is for the one or two they stop on.
 *
 * Three states share this row and must never look alike: scored normally,
 * scored but capped, and not applicable. The last one is not a zero.
 */
export function Dimension({ d }: { d: ReportDimension }) {
  const [open, setOpen] = useState(false);

  const tone = TONE[d.disabled ? "none" : scoreTone(d.score, d.ceiling)];
  const capped = d.ceiling < d.max;
  const pct = d.max > 0 ? (d.score / d.max) * 100 : 0;
  const ceilingPct = d.max > 0 ? (d.ceiling / d.max) * 100 : 100;

  return (
    <details
      className="group border-b border-line-2 last:border-b-0"
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="focus-ring grid cursor-pointer list-none grid-cols-[1.5rem_1fr_auto_auto] items-center gap-x-3 py-2.5 transition-colors hover:bg-sunk/70 sm:grid-cols-[1.5rem_1fr_7rem_auto_auto] [&::-webkit-details-marker]:hidden">
        <span className="tnum text-right font-mono text-[length:var(--text-micro)] text-ink-3">
          {d.n}
        </span>

        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[length:var(--text-body)] font-medium text-ink">{d.name}</span>
            {capped && !d.disabled && <Flag tone="fail">capped</Flag>}
            {!d.behaviourPresent && !d.disabled && <Flag tone="mute">not in transcript</Flag>}
            {d.disabled && <Flag tone="mute">not applicable</Flag>}
            {d.integrity === "unsupported" && !d.disabled && <Flag tone="fail">unsupported</Flag>}
          </span>
          {!open && (
            <span className="mt-0.5 block truncate text-[length:var(--text-meta)] text-ink-3">
              {d.disabled ? d.disabledReason : d.rationale}
            </span>
          )}
        </span>

        {/* Scan affordance. Hidden on narrow screens where the number is enough. */}
        <span className="relative hidden h-1.5 overflow-hidden rounded-full bg-line-2 sm:block">
          {capped && (
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-line"
              style={{ width: `${ceilingPct}%` }}
              aria-hidden
            />
          )}
          <span
            className="bar-grow absolute inset-y-0 left-0 rounded-full"
            style={{ width: `${pct}%`, background: tone.solid }}
            aria-hidden
          />
        </span>

        <span
          className="tnum rounded-[var(--radius-sm)] px-2 py-0.5 text-right font-mono text-[length:var(--text-meta)] font-medium"
          style={{ color: tone.fg, background: tone.wash }}
        >
          {d.disabled ? "N/A" : `${formatScore(d.score)}/${d.max}`}
        </span>

        <svg
          className="size-3.5 text-ink-3 transition-transform duration-200 group-open:rotate-180"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </summary>

      <div className="rise space-y-3 pb-4 pl-[2.25rem] text-[length:var(--text-dense)] leading-relaxed">
        {d.disabled ? (
          <p className="max-w-[68ch] text-ink-2">{d.disabledReason}</p>
        ) : (
          <>
            <p className="max-w-[68ch] text-ink-2">
              <span className="mr-2 font-mono text-[length:var(--text-micro)] font-medium text-ink-3">
                {d.bucketLabel}
              </span>
              {d.rationale}
            </p>

            {capped && (
              <p className="max-w-[68ch] rounded-[var(--radius-md)] border border-fail/20 bg-fail/5 px-3 py-2 text-[length:var(--text-meta)] text-fail">
                Ceiling {formatScore(d.ceiling)}/{d.max}. {d.capNotes.join(" ")}
              </p>
            )}

            {d.snapNote && (
              <p className="max-w-[68ch] rounded-[var(--radius-md)] bg-sunk px-3 py-2 font-mono text-[length:var(--text-micro)] text-ink-3">
                {d.snapNote}
              </p>
            )}

            {d.evidence.length > 0 ? (
              <ul className="space-y-1.5">
                {d.evidence.map((e, i) => (
                  <li key={`${e.line}-${i}`} className="flex gap-2.5">
                    <CiteLink line={e.line} label={e.label} className="pt-0.5" />
                    <span className="min-w-0 max-w-[62ch]">
                      <span className="text-ink">&ldquo;{e.quote}&rdquo;</span>
                      {e.speaker && (
                        <span className="ml-1.5 font-mono text-[length:var(--text-micro)] text-ink-3">
                          {e.speaker}
                        </span>
                      )}
                      {e.corrected && (
                        <span
                          className="ml-1.5 font-mono text-[length:var(--text-micro)] text-inconsistent"
                          title={`The model cited ${e.claimedLabel}; the quote was found at ${e.label}.`}
                        >
                          line corrected
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="max-w-[68ch] text-[length:var(--text-meta)] text-ink-3">
                {d.behaviourPresent
                  ? "No verifiable transcript lines were returned for this score."
                  : "This behaviour does not appear in the transcript, so there is nothing to quote."}
              </p>
            )}

            {d.integrityNote && (
              <p
                className={`max-w-[68ch] rounded-[var(--radius-md)] px-3 py-2 text-[length:var(--text-meta)] ${
                  d.integrity === "unsupported"
                    ? "border border-fail/20 bg-fail/5 text-fail"
                    : "bg-sunk text-ink-2"
                }`}
              >
                {d.integrityNote}
              </p>
            )}

            {d.quickFix && (
              <p className="max-w-[68ch] rounded-[var(--radius-md)] border border-accent/15 bg-accent-wash px-3 py-2.5 text-ink">
                <span className="mr-2 font-mono text-[length:var(--text-micro)] font-medium text-accent-ink">
                  FIX
                </span>
                {d.quickFix}
              </p>
            )}
          </>
        )}
      </div>
    </details>
  );
}

function Flag({ children, tone }: { children: React.ReactNode; tone: "fail" | "mute" }) {
  return (
    <span
      className={`rounded-[var(--radius-xs)] px-1.5 py-px font-mono text-[length:var(--text-micro)] ${
        tone === "fail" ? "bg-fail/10 text-fail" : "bg-sunk text-ink-3"
      }`}
    >
      {children}
    </span>
  );
}
