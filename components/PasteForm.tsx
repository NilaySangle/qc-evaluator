"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { CallType } from "@/lib/rubric";

const SAMPLES: { file: string; label: string; callType: CallType; note: string }[] = [
  { file: "kickoff-01", label: "kickoff-01", callType: "kickoff", note: "35 kB" },
  { file: "kickoff-02", label: "kickoff-02", callType: "kickoff", note: "15 kB" },
  { file: "coaching-01", label: "coaching-01", callType: "coaching", note: "36 kB" },
  { file: "coaching-02", label: "coaching-02", callType: "coaching", note: "65 kB" },
];

export function PasteForm() {
  const router = useRouter();
  const [callType, setCallType] = useState<CallType>("coaching");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [loadingSample, setLoadingSample] = useState<string | null>(null);

  const chars = transcript.length;
  const turns = transcript.split("\n").filter((l) => /^\s*\[[^\]]+\]\s*:/.test(l)).length;

  async function loadSample(s: (typeof SAMPLES)[number]) {
    setLoadingSample(s.file);
    setError(null);
    try {
      const res = await fetch(`/samples/${s.file}.txt`);
      if (!res.ok) throw new Error("Could not load that sample.");
      setTranscript(await res.text());
      setCallType(s.callType);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load that sample.");
    } finally {
      setLoadingSample(null);
    }
  }

  /**
   * Catch the one failure mode that produces a confidently wrong report: the
   * right transcript scored against the wrong rubric. This happens whenever the
   * pasted text doesn't drive the radio itself — load a sample, then paste over
   * it by hand, or load one sample and then another without noticing the type
   * flipped back. The check is a prefix match against the four known fixtures,
   * so it costs nothing and never touches the model.
   */
  async function mismatchedSample(): Promise<string | null> {
    const head = transcript.trim().slice(0, 300);
    if (!head) return null;
    for (const s of SAMPLES) {
      if (s.callType === callType) continue;
      try {
        const res = await fetch(`/samples/${s.file}.txt`);
        if (!res.ok) continue;
        const sampleHead = (await res.text()).trim().slice(0, 300);
        if (sampleHead && head === sampleHead) {
          return `This looks like ${s.label}, which is a ${s.callType} call — but "${
            callType === "coaching" ? "Coaching call" : "Kick-off call"
          }" is selected. Switch the call type above, or confirm this is intentional.`;
        }
      } catch {
        // Best-effort only — never block a real submission on a failed fetch.
      }
    }
    return null;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const mismatch = await mismatchedSample();
      if (mismatch) {
        setError(mismatch);
        return;
      }
      try {
        const res = await fetch("/api/runs", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ callType, transcript }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Could not start the run.");
          return;
        }
        // Straight to the run URL. Scoring continues server-side whether or not
        // this tab stays open.
        router.push(data.url);
      } catch {
        setError("Could not reach the server. Check your connection and try again.");
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <fieldset>
        <legend className="text-[length:var(--text-dense)] font-medium text-ink">Call type</legend>
        <div className="mt-2 inline-flex rounded-[var(--radius-md)] border border-line bg-sunk p-0.5">
          {(["coaching", "kickoff"] as const).map((t) => (
            <label
              key={t}
              className={`focus-ring cursor-pointer rounded-[var(--radius-sm)] px-3.5 py-1.5 text-[length:var(--text-dense)] font-medium transition-colors ${
                callType === t
                  ? "bg-raised text-ink shadow-sm"
                  : "text-ink-2 hover:text-ink"
              }`}
            >
              <input
                type="radio"
                name="callType"
                value={t}
                checked={callType === t}
                onChange={() => setCallType(t)}
                className="sr-only"
              />
              {t === "coaching" ? "Coaching call" : "Kick-off call"}
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-[length:var(--text-meta)] text-ink-2">
          Each type has its own twelve-dimension rubric. They score differently, so this changes the
          result.
        </p>
      </fieldset>

      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <label htmlFor="transcript" className="text-[length:var(--text-dense)] font-medium text-ink">
            Transcript
          </label>
          <span className="tnum font-mono text-[length:var(--text-micro)] text-ink-3">
            {chars.toLocaleString()} chars · {turns} turns
          </span>
        </div>

        <textarea
          id="transcript"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          spellCheck={false}
          rows={12}
          placeholder={"[Coach Name]: Hey, can you hear me okay?\n[Client Name]: Yeah, I've got you."}
          className="focus-ring mt-2 w-full resize-y rounded-[var(--radius-md)] border border-line bg-raised px-3.5 py-3 font-mono text-[length:var(--text-micro)] leading-relaxed text-ink placeholder:text-ink-3"
        />
        <p className="mt-1.5 text-[length:var(--text-meta)] text-ink-2">
          One speaking turn per line, as{" "}
          <code className="font-mono text-[length:var(--text-micro)] text-ink">
            [Speaker Name]: what they said
          </code>
        </p>
      </div>

      <div>
        <span className="text-[length:var(--text-dense)] font-medium text-ink">
          Or load a supplied call
        </span>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SAMPLES.map((s) => (
            <button
              key={s.file}
              type="button"
              onClick={() => loadSample(s)}
              disabled={loadingSample !== null}
              className="focus-ring rounded-[var(--radius-sm)] border border-line bg-raised px-2.5 py-1.5 font-mono text-[length:var(--text-micro)] text-ink-2 transition-colors hover:border-accent/40 hover:text-ink disabled:opacity-50"
            >
              {loadingSample === s.file ? "loading…" : s.label}
              <span className="ml-1.5 text-ink-3">{s.note}</span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-[var(--radius-md)] border border-fail/25 bg-fail/5 px-3.5 py-2.5 text-[length:var(--text-dense)] text-fail"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || transcript.trim().length === 0}
        className="focus-ring inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-accent px-4 py-2.5 text-[length:var(--text-body)] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? "Starting…" : "Score this call"}
      </button>
    </form>
  );
}
