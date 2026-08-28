import Link from "next/link";

/**
 * The three places in this app, always reachable.
 *
 * Thin by design: a reviewer is in a task. The motion here conveys state
 * (which page is active, what is hoverable), it is not decoration. The logo's
 * equalizer bars are the only idle motion, and they are small enough to read as
 * a live signal rather than a distraction.
 */
export function TopNav({ active }: { active?: "score" | "coaches" }) {
  return (
    <nav className="no-print border-b border-line-2">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-4 px-5 py-2.5 sm:px-8">
        <Link
          href="/"
          className="focus-ring group/logo flex items-center gap-2 font-mono text-[length:var(--text-meta)] font-semibold tracking-tight text-ink"
        >
          <span className="flex h-4 items-end gap-[2px]" aria-hidden>
            <span
              className="eq-bar w-[3px] rounded-full bg-accent"
              style={{ height: "16px", animationDelay: "0ms" }}
            />
            <span
              className="eq-bar w-[3px] rounded-full bg-elite"
              style={{ height: "16px", animationDelay: "220ms" }}
            />
            <span
              className="eq-bar w-[3px] rounded-full bg-inconsistent"
              style={{ height: "16px", animationDelay: "440ms" }}
            />
          </span>
          <span>
            QC<span className="text-accent">/</span>Evaluator
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-1">
          <NavLink href="/" current={active === "score"}>
            Score a call
          </NavLink>
          <NavLink href="/coaches" current={active === "coaches"}>
            Coaches
          </NavLink>
        </div>

        <span
          className="hidden items-center gap-1.5 border-l border-line-2 pl-4 font-mono text-[length:var(--text-micro)] text-ink-3 sm:flex"
          title="Built for BeaverMind AI"
        >
          for BeaverMind AI
        </span>
      </div>
    </nav>
  );
}

function NavLink({
  href,
  current,
  children,
}: {
  href: string;
  current: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`focus-ring relative rounded-[var(--radius-sm)] px-2.5 py-1 text-[length:var(--text-meta)] transition-colors ${
        current ? "font-medium text-ink" : "text-ink-2 hover:bg-sunk hover:text-ink"
      }`}
    >
      {children}
      {current && (
        <span
          className="underline-in absolute inset-x-2.5 -bottom-[7px] h-[2px] rounded-full bg-accent"
          aria-hidden
        />
      )}
    </Link>
  );
}
