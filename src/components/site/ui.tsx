import type { ReactNode } from "react";

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Banner({
  tone,
  children,
}: {
  tone: "ok" | "bad" | "warn";
  children: ReactNode;
}) {
  const cls =
    tone === "ok" ? "bg-ok-soft text-ok" : tone === "bad" ? "bg-bad-soft text-bad" : "bg-warn-soft text-warn";
  return <p className={`rounded-xl px-3 py-2 text-sm font-semibold ${cls}`}>{children}</p>;
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="card px-5 py-10 text-center">
      <h2 className="font-display text-2xl">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{body}</p>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-line ${className}`} />;
}

export function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-ink/50 p-4 sm:place-items-center" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="dialog-title" className="card w-full max-w-lg p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 id="dialog-title" className="font-display text-2xl">{title}</h2>
          <button type="button" className="btn btn-ghost px-3" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Badge({ children, tone = "soft" }: { children: ReactNode; tone?: "soft" | "ok" | "bad" | "warn" }) {
  const cls =
    tone === "ok"
      ? "bg-ok-soft text-ok"
      : tone === "bad"
        ? "bg-bad-soft text-bad"
        : tone === "warn"
          ? "bg-warn-soft text-warn"
          : "bg-accent-soft text-accent";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${cls}`}>{children}</span>;
}
