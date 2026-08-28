"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

/**
 * The transcript, beside the report.
 *
 * The whole system rests on the claim that every score points at real words in
 * the call. Printing a quote asserts that. Letting the reviewer land on the
 * exact turn, in context, with the lines either side of it, is what makes the
 * claim checkable, and checking is the reviewer's actual job.
 *
 * It is a slide-over rather than a route because the reviewer is mid-thought on
 * one dimension. Navigating away to a transcript page and back would lose the
 * report scroll position and the open dimension, which is the whole context
 * they were reasoning in.
 */

interface TranscriptLine {
  n: number;
  speaker: string;
  text: string;
}

interface TranscriptData {
  lines: TranscriptLine[];
  speakers: { speaker: string; turns: number; words: number; share: number }[];
  totalWords: number;
}

interface Ctx {
  /** Open the panel scrolled to a line. */
  open: (line: number) => void;
  /** True once the run has a transcript worth offering. */
  available: boolean;
}

const TranscriptCtx = createContext<Ctx | null>(null);

/** Cite links call this. Safe to use outside the provider (becomes a no-op). */
export function useTranscript(): Ctx {
  return useContext(TranscriptCtx) ?? { open: () => {}, available: false };
}

export function TranscriptProvider({
  runId,
  coach,
  children,
}: {
  runId: string;
  coach: string | null;
  children: React.ReactNode;
}) {
  const [isOpen, setOpen] = useState(false);
  const [target, setTarget] = useState<number | null>(null);
  const [data, setData] = useState<TranscriptData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const open = useCallback(
    (line: number) => {
      // Remember what to hand focus back to when the panel closes.
      returnFocusRef.current = document.activeElement as HTMLElement | null;
      setTarget(line);
      setOpen(true);

      if (data || loading) return;
      setLoading(true);
      fetch(`/api/runs/${runId}/transcript`)
        .then(async (r) => {
          const j = await r.json();
          if (!r.ok) throw new Error(j.error ?? "Could not load the transcript.");
          setData(j as TranscriptData);
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Could not load the transcript."))
        .finally(() => setLoading(false));
    },
    [runId, data, loading],
  );

  const close = useCallback(() => {
    setOpen(false);
    returnFocusRef.current?.focus?.();
  }, []);

  // Escape closes, and the page behind stops scrolling while the panel is up.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, close]);

  // Scroll the cited turn into the middle of the panel once it exists.
  useEffect(() => {
    if (!isOpen || target === null || !data) return;
    const id = requestAnimationFrame(() => {
      const el = scrollerRef.current?.querySelector<HTMLElement>(`[data-line="${target}"]`);
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    return () => cancelAnimationFrame(id);
  }, [isOpen, target, data]);

  return (
    <TranscriptCtx.Provider value={{ open, available: true }}>
      {children}

      {isOpen && (
        <div className="no-print fixed inset-0" style={{ zIndex: "var(--z-panel-backdrop)" }}>
          <button
            type="button"
            aria-label="Close transcript"
            onClick={close}
            className="fade-in absolute inset-0 h-full w-full cursor-default bg-ink/25"
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Call transcript"
            className="panel-in absolute inset-y-0 right-0 flex w-full max-w-[38rem] flex-col border-l border-line bg-raised shadow-2xl"
            style={{ zIndex: "var(--z-panel)" }}
          >
            <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-3.5">
              <div className="min-w-0">
                <h2 className="text-[length:var(--text-body)] font-semibold text-ink">Transcript</h2>
                <p className="mt-0.5 text-[length:var(--text-meta)] text-ink-3">
                  {data
                    ? `${data.lines.length} turns · ${data.totalWords.toLocaleString()} words`
                    : "Loading the call"}
                  {target !== null && data ? ` · showing L${String(target).padStart(3, "0")}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                className="focus-ring -m-1 shrink-0 rounded-[var(--radius-sm)] p-1 text-ink-3 transition-colors hover:bg-sunk hover:text-ink"
                aria-label="Close transcript"
              >
                <svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden>
                  <path
                    d="M4 4l8 8M12 4l-8 8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </header>

            <div ref={scrollerRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
              {loading && <TranscriptSkeleton />}

              {error && (
                <p className="rounded-[var(--radius-md)] border border-fail/25 bg-fail/5 px-3 py-2.5 text-[length:var(--text-body)] text-fail">
                  {error}
                </p>
              )}

              {data && (
                <ol className="space-y-2.5">
                  {data.lines.map((l) => {
                    const isTarget = l.n === target;
                    const isCoach = coach !== null && l.speaker === coach;
                    return (
                      <li
                        key={l.n}
                        data-line={l.n}
                        className={`scroll-mt-4 rounded-[var(--radius-sm)] px-2 py-1.5 ${
                          isTarget ? "cite-flash ring-1 ring-accent/40" : ""
                        }`}
                      >
                        <div className="flex items-baseline gap-2.5">
                          <span
                            className={`tnum shrink-0 font-mono text-[length:var(--text-micro)] ${
                              isTarget ? "font-semibold text-accent-ink" : "text-ink-3"
                            }`}
                          >
                            L{String(l.n).padStart(3, "0")}
                          </span>
                          <span
                            className={`truncate text-[length:var(--text-micro)] font-medium ${
                              isCoach ? "text-ink-2" : "text-accent-ink"
                            }`}
                          >
                            {l.speaker}
                          </span>
                        </div>
                        <p className="mt-0.5 pl-[3.4rem] text-[length:var(--text-dense)] leading-relaxed text-ink-2">
                          {l.text}
                        </p>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>

            <footer className="border-t border-line px-5 py-2.5">
              <p className="text-[length:var(--text-meta)] text-ink-3">
                Every quote in the report was checked against these lines before it was shown.
              </p>
            </footer>
          </aside>
        </div>
      )}
    </TranscriptCtx.Provider>
  );
}

function TranscriptSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <div className="h-2.5 w-24 rounded-full bg-sunk" />
          <div className="h-2.5 rounded-full bg-sunk" style={{ width: `${72 + ((i * 7) % 26)}%` }} />
          <div className="h-2.5 rounded-full bg-sunk" style={{ width: `${44 + ((i * 11) % 34)}%` }} />
        </div>
      ))}
    </div>
  );
}

/**
 * A clickable line reference.
 *
 * Used everywhere the report cites the transcript, so the affordance is
 * identical in a dimension, a red flag, and a cap.
 */
export function CiteLink({
  line,
  label,
  className = "",
}: {
  line: number;
  label: string;
  className?: string;
}) {
  const { open } = useTranscript();
  return (
    <button
      type="button"
      onClick={() => open(line)}
      title={`Open ${label} in the transcript`}
      className={`focus-ring tnum shrink-0 rounded-[var(--radius-xs)] font-mono text-[length:var(--text-micro)] text-accent-ink underline decoration-accent/30 underline-offset-2 transition-colors hover:decoration-accent ${className}`}
    >
      {label}
    </button>
  );
}
