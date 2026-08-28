"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A one-time welcome, addressed to the people reading the submission.
 *
 * A splash screen on every load is an anti-pattern for a tool you use daily, so
 * this is gated: it fires once per browser (localStorage) and never again. A
 * `?intro=1` query param forces it back for a live demo. Reduced-motion viewers
 * get the same screen with the animation removed, not a different one.
 *
 * The mark is the product's own score bars, not a fabricated company logo. It
 * is a candidate's greeting, framed as exactly that.
 */

const SEEN_KEY = "qc-intro-seen-v1";

// A score profile that reads like a real report: some elite, some failing.
const BARS: { h: number; band: string }[] = [
  { h: 0.55, band: "var(--inconsistent)" },
  { h: 0.9, band: "var(--elite)" },
  { h: 0.42, band: "var(--fail)" },
  { h: 0.72, band: "var(--strong)" },
  { h: 1, band: "var(--elite)" },
  { h: 0.6, band: "var(--inconsistent)" },
  { h: 0.85, band: "var(--strong)" },
  { h: 0.5, band: "var(--atrisk)" },
  { h: 0.95, band: "var(--elite)" },
  { h: 0.68, band: "var(--inconsistent)" },
  { h: 0.38, band: "var(--fail)" },
  { h: 0.8, band: "var(--strong)" },
];

export function IntroScreen() {
  // null = undecided (server + first paint). Avoids a hydration mismatch and a
  // flash of the overlay for viewers who have already seen it.
  const [show, setShow] = useState<boolean | null>(null);
  const [leaving, setLeaving] = useState(false);
  const enterRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let forced = false;
    try {
      forced = new URLSearchParams(window.location.search).has("intro");
    } catch {
      /* ignore */
    }
    let seen = false;
    try {
      seen = localStorage.getItem(SEEN_KEY) === "1";
    } catch {
      /* private mode etc. — treat as unseen */
    }
    setShow(forced || !seen);
  }, []);

  useEffect(() => {
    if (show !== true) return;
    enterRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") dismiss();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  function dismiss() {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
    setLeaving(true);
    window.setTimeout(() => setShow(false), 430);
  }

  if (show !== true) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome"
      className={`fixed inset-0 flex items-center justify-center px-6 ${
        leaving ? "intro-out" : "intro-backdrop"
      }`}
      style={{
        zIndex: 100,
        background:
          "radial-gradient(120% 120% at 50% 30%, oklch(26% 0.03 262) 0%, oklch(17% 0.02 262) 55%, oklch(13% 0.015 262) 100%)",
      }}
      onClick={dismiss}
    >
      <div
        className="w-full max-w-md text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* the mark */}
        <div className="mb-9 flex items-end justify-center gap-[3px]" aria-hidden>
          {BARS.map((b, i) => (
            <span
              key={i}
              className="intro-bar w-1.5 rounded-full sm:w-2"
              style={
                {
                  height: "56px",
                  background: b.band,
                  "--h": b.h,
                  animationDelay: `${120 + i * 55}ms`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>

        <p
          className="intro-rise font-mono text-[length:var(--text-micro)] font-semibold tracking-[0.28em] text-white/55 uppercase"
          style={{ animationDelay: "260ms" }}
        >
          BeaverMind AI
        </p>

        <h1
          className="intro-rise mt-3 text-[2.6rem] leading-none font-semibold tracking-[-0.02em] text-white"
          style={{ animationDelay: "340ms" }}
        >
          QC Evaluator
        </h1>

        <p
          className="intro-rise mx-auto mt-4 max-w-[36ch] text-[length:var(--text-read)] leading-relaxed text-white/70"
          style={{ animationDelay: "440ms" }}
        >
          Every call scored against your rubric, with the transcript line behind
          every number.
        </p>

        <p
          className="intro-rise mt-5 text-[length:var(--text-dense)] text-white/50"
          style={{ animationDelay: "540ms" }}
        >
          Built for Ruben and Luke.
        </p>

        <div
          className="intro-rise mt-9 flex flex-col items-center gap-3"
          style={{ animationDelay: "640ms" }}
        >
          <button
            ref={enterRef}
            type="button"
            onClick={dismiss}
            className="focus-ring rounded-[var(--radius-md)] bg-white px-6 py-2.5 text-[length:var(--text-body)] font-semibold text-ink transition-transform hover:scale-[1.03] active:scale-100"
            style={{ outlineColor: "white" }}
          >
            Enter
          </button>
          <span className="font-mono text-[length:var(--text-micro)] text-white/35">
            press Enter, or click anywhere
          </span>
        </div>
      </div>
    </div>
  );
}
