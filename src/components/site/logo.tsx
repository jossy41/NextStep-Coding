import { Link } from "@tanstack/react-router";

export function Wordmark({ tone = "ink" }: { tone?: "ink" | "paper" }) {
  const name = tone === "paper" ? "text-paper" : "text-ink";
  const sub = tone === "paper" ? "text-accent-soft" : "text-muted";
  return (
    <span className="inline-flex min-w-0 items-center gap-2.5">
      <span
        aria-hidden
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent font-display text-lg text-accent-ink"
      >
        N
      </span>
      <span className="min-w-0 leading-none">
        <span className={`block truncate font-display text-xl ${name}`}>NextStep</span>
        <span className={`mt-1 block text-xs font-semibold uppercase tracking-wide ${sub}`}>Coding</span>
      </span>
    </span>
  );
}

export function BrandLink({ tone = "ink" }: { tone?: "ink" | "paper" }) {
  return (
    <Link to="/" className="min-w-0 rounded-lg" aria-label="NextStep Coding">
      <Wordmark tone={tone} />
    </Link>
  );
}
