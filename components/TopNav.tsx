import Link from "next/link";

/**
 * The three places in this app, always reachable.
 *
 * Deliberately thin: a reviewer is in a task, and chrome that competes with the
 * report is chrome in the way.
 */
export function TopNav({ active }: { active?: "score" | "coaches" }) {
  return (
    <nav className="no-print border-b border-line-2">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-6 px-5 py-2.5 sm:px-8">
        <Link
          href="/"
          className="focus-ring font-mono text-[length:var(--text-meta)] font-semibold tracking-tight text-ink"
        >
          QC<span className="text-accent">/</span>Evaluator
        </Link>
        <div className="ml-auto flex items-center gap-1">
          <NavLink href="/" current={active === "score"}>
            Score a call
          </NavLink>
          <NavLink href="/coaches" current={active === "coaches"}>
            Coaches
          </NavLink>
        </div>
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
      className={`focus-ring rounded-[var(--radius-sm)] px-2.5 py-1 text-[length:var(--text-meta)] transition-colors ${
        current ? "bg-sunk font-medium text-ink" : "text-ink-2 hover:bg-sunk hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}
