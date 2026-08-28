import Link from "next/link";
import { getTeamAggregate, type CoachGroup, type DimensionLeak } from "@/lib/aggregate";
import { bandForScore, bandStyle } from "@/lib/ui";
import { TopNav } from "@/components/TopNav";

/**
 * The coach view.
 *
 * One call is QC. Twelve dimensions across every coach is the business problem:
 * where the team is leaking points, and who needs coaching on what. This is a
 * GROUP BY over the same rows the report writes, which is the reason dimensions
 * are stored as rows rather than a JSON blob.
 *
 * Ranked lists, not a card grid. The reviewer is looking for the worst two
 * numbers, and equal-weight cards hide exactly that.
 */
export const dynamic = "force-dynamic";

const CALL_LABEL: Record<string, string> = { kickoff: "Kick-off", coaching: "Coaching" };

export default async function CoachesPage() {
  let data;
  try {
    data = await getTeamAggregate();
  } catch (err) {
    return (
      <Shell>
        <p className="rounded-[var(--radius-md)] border border-fail/25 bg-fail/5 px-4 py-3 text-[length:var(--text-dense)] text-fail">
          {err instanceof Error ? err.message : "Could not load coach data."}
        </p>
      </Shell>
    );
  }

  if (data.groups.length === 0) {
    return (
      <Shell>
        <div className="rounded-[var(--radius-lg)] border border-dashed border-line px-6 py-14 text-center">
          <p className="text-[length:var(--text-body)] font-medium text-ink">No scored calls yet</p>
          <p className="mx-auto mt-1.5 max-w-[48ch] text-[length:var(--text-dense)] leading-relaxed text-ink-2">
            Score a few calls and this fills in: each coach&apos;s average, and the dimensions the
            team loses the most points on.
          </p>
          <Link
            href="/"
            className="focus-ring mt-5 inline-flex rounded-[var(--radius-md)] bg-accent px-4 py-2 text-[length:var(--text-dense)] font-medium text-white transition-opacity hover:opacity-90"
          >
            Score a call
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell
      meta={`${data.totalRuns} run${data.totalRuns === 1 ? "" : "s"} · ${data.coachCount} coach${
        data.coachCount === 1 ? "" : "es"
      }`}
    >
      <p className="max-w-[72ch] text-[length:var(--text-dense)] leading-relaxed text-ink-2">
        Averages across each coach&apos;s calls of that type. A dimension that did not apply on a
        call is excluded rather than counted as zero. Points lost is how far below the maximum a
        dimension sits on average: the leak to coach against first.
      </p>

      {data.teamLeaks.length > 0 && (
        <section className="mt-8">
          <h2 className="text-[length:var(--text-h3)] font-semibold text-ink">
            Where the team leaks most
          </h2>
          <ol className="mt-3 divide-y divide-line-2 rounded-[var(--radius-lg)] border border-line">
            {data.teamLeaks.slice(0, 6).map((t, i) => (
              <li
                key={`${t.callType}-${t.dimensionId}`}
                className="grid grid-cols-[1.25rem_1fr_auto] items-center gap-x-3 px-4 py-2.5 sm:grid-cols-[1.25rem_1fr_9rem_auto_auto]"
              >
                <span className="tnum text-right font-mono text-[length:var(--text-micro)] text-ink-3">
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[length:var(--text-body)] font-medium text-ink">
                    {t.name}
                  </span>
                  <span className="font-mono text-[length:var(--text-micro)] text-ink-3">
                    {CALL_LABEL[t.callType]} · {t.dimensionId} · {t.calls} call
                    {t.calls === 1 ? "" : "s"} · {t.coaches} coach{t.coaches === 1 ? "" : "es"}
                  </span>
                </span>
                <Bar score={t.avgScore} max={t.max} />
                <span className="tnum font-mono text-[length:var(--text-meta)] text-ink-2">
                  {t.avgScore}/{t.max}
                </span>
                <span className="tnum w-12 text-right font-mono text-[length:var(--text-meta)] font-semibold text-fail">
                  &minus;{t.avgLost}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="mt-9">
        <h2 className="text-[length:var(--text-h3)] font-semibold text-ink">By coach</h2>
        <div className="mt-3 space-y-3">
          {data.groups.map((g) => (
            <CoachCard key={`${g.coach}-${g.callType}`} group={g} />
          ))}
        </div>
      </section>
    </Shell>
  );
}

function CoachCard({ group }: { group: CoachGroup }) {
  const band = bandStyle(bandForScore(group.avgScore));
  const worst = group.leaks.filter((l) => l.avgLost > 0).slice(0, 3);
  const bands = Object.entries(group.bandMix).sort((a, b) => b[1] - a[1]);

  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-raised px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-[length:var(--text-body)] font-semibold text-ink">{group.coach}</h3>
          <p className="font-mono text-[length:var(--text-micro)] text-ink-3">
            {CALL_LABEL[group.callType]} · {group.calls} call{group.calls === 1 ? "" : "s"}
            {bands.length > 0 && ` · ${bands.map(([b, n]) => `${n} ${b.toLowerCase()}`).join(", ")}`}
          </p>
        </div>
        <span
          className="tnum rounded-[var(--radius-sm)] px-2.5 py-1 font-mono text-[length:var(--text-meta)] font-semibold"
          style={{ color: band.fg, background: band.wash }}
        >
          avg {group.avgScore}/100
        </span>
      </div>

      {worst.length > 0 ? (
        <ul className="mt-3.5 space-y-2 border-t border-line-2 pt-3">
          {worst.map((l) => (
            <LeakRow key={l.dimensionId} leak={l} />
          ))}
        </ul>
      ) : (
        <p className="mt-3 border-t border-line-2 pt-3 text-[length:var(--text-meta)] text-ink-2">
          No consistent leak. This coach sits at or near the ceiling across dimensions.
        </p>
      )}
    </div>
  );
}

function LeakRow({ leak }: { leak: DimensionLeak }) {
  return (
    <li className="grid grid-cols-[2rem_1fr_auto] items-center gap-x-3 sm:grid-cols-[2rem_1fr_9rem_auto_auto]">
      <span className="tnum font-mono text-[length:var(--text-micro)] text-ink-3">
        {leak.dimensionId}
      </span>
      <span className="min-w-0 truncate text-[length:var(--text-dense)] text-ink">{leak.name}</span>
      <Bar score={leak.avgScore} max={leak.max} />
      <span className="tnum font-mono text-[length:var(--text-meta)] text-ink-2">
        {leak.avgScore}/{leak.max}
      </span>
      <span className="tnum w-12 text-right font-mono text-[length:var(--text-meta)] font-medium text-fail">
        &minus;{leak.avgLost}
      </span>
    </li>
  );
}

function Bar({ score, max }: { score: number; max: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (score / max) * 100)) : 0;
  const fill =
    pct >= 90 ? "var(--elite)" : pct >= 50 ? "var(--inconsistent)" : "var(--fail)";
  return (
    <span className="hidden h-1.5 overflow-hidden rounded-full bg-line-2 sm:block" aria-hidden>
      <span
        className="bar-grow block h-full rounded-full"
        style={{ width: `${pct}%`, background: fill }}
      />
    </span>
  );
}

function Shell({ children, meta }: { children: React.ReactNode; meta?: string }) {
  return (
    <>
      <TopNav active="coaches" />
      <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8">
        <header className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-[length:var(--text-h1)] font-semibold text-ink">Coaches</h1>
          {meta && <span className="font-mono text-[length:var(--text-meta)] text-ink-3">{meta}</span>}
        </header>
        {children}
      </main>
    </>
  );
}
