import { PasteForm } from "@/components/PasteForm";
import { TopNav } from "@/components/TopNav";

export default function Home() {
  return (
    <>
      <TopNav active="score" />
      <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-14">
          <div className="min-w-0">
            <h1 className="text-[length:var(--text-h1)] leading-[1.15] font-semibold text-ink">
              Score a call against the rubric it was written for.
            </h1>
            <p className="mt-3 max-w-[62ch] text-[length:var(--text-read)] leading-relaxed text-ink-2">
              Paste a transcript and pick the call type. You get the change worth making first, then
              the brief, the retention risks, and twelve dimensions each carrying the transcript lines
              its score rests on.
            </p>

            <div className="mt-7 rounded-[var(--radius-lg)] border border-line bg-raised px-5 py-6 sm:px-6">
              <PasteForm />
            </div>
          </div>

          {/* Side rail, not a card grid. Three claims the app has to keep. */}
          <aside className="lg:pt-1.5">
            <h2 className="text-[length:var(--text-meta)] font-semibold text-ink">
              What this does differently
            </h2>
            <dl className="mt-3 space-y-4">
              <Claim term="Evidence or nothing">
                Every quote is checked against the transcript before you see it. One that cannot be
                found is dropped, and the dimension says its score is unsupported.
              </Claim>
              <Claim term="No arithmetic by model">
                Caps, totals and bands are computed in code. Talk share is counted from the
                transcript, never estimated.
              </Claim>
              <Claim term="Absence is not failure">
                A behaviour that never happened reads differently from one done badly, and a
                dimension that did not apply is switched off rather than scored zero.
              </Claim>
            </dl>
          </aside>
        </div>
      </main>
    </>
  );
}

function Claim({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-line-2 pt-3">
      <dt className="text-[length:var(--text-dense)] font-medium text-ink">{term}</dt>
      <dd className="mt-1 text-[length:var(--text-meta)] leading-relaxed text-ink-2">{children}</dd>
    </div>
  );
}
