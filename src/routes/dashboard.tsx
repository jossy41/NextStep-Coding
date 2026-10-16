import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useI18n } from "@/lib/i18n";
import type { DashboardData } from "@/lib/learning-types";
import { formatWhen, pick } from "@/lib/text";
import { Banner, Skeleton } from "@/components/site/ui";
import { myDashboard, updateProfile } from "@/server/api";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { user, isPending } = useCurrentUserState();
  const { lang, t } = useI18n();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    // Wait until the client session has finished resolving before the first
    // server-function call. Right after login the cookie is sometimes not yet
    // visible to myDashboard() even though useSession already has a user.
    if (isPending || !user) return;

    let live = true;
    let attempt = 0;
    const maxAttempts = 4;
    let retryTimer: number | undefined;

    const load = () => {
      void myDashboard()
        .then((dash) => {
          if (!live) return;
          setData(dash);
          setName(dash.me.name);
          setError("");
        })
        .catch((err: unknown) => {
          if (!live) return;
          attempt += 1;
          // Transient Unauthorized (and other short-lived failures) are common
          // on the first request after login. Retry a few times with backoff
          // instead of leaving an endless skeleton or forcing a full reload.
          if (attempt < maxAttempts) {
            retryTimer = window.setTimeout(load, 150 * attempt);
            return;
          }
          const message = err instanceof Error ? err.message : String(err ?? "");
          if (message === "Unauthorized" || message.includes("Unauthorized")) {
            // Session never became available to the server — clear message + retry
            // control, not an infinite skeleton.
            setError(
              t(
                "Could not load your dashboard. Try refreshing the page.",
                "ዳሽቦርድዎን መጫን አልተቻለም። ገጹን እንደገና ይሞክሩ።",
              ),
            );
            return;
          }
          setError(t("Could not load your dashboard.", "ዳሽቦርድዎን መጫን አልተቻለም።"));
        });
    };

    load();
    return () => {
      live = false;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
    };
  }, [user?.id, isPending, t]);

  if (isPending) return <div className="mx-auto max-w-5xl px-4 py-10"><Skeleton className="h-40" /></div>;
  if (!user) return <RedirectToSignIn />;
  if (!data) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        {error ? (
          <div className="grid gap-3">
            <Banner tone="bad">{error}</Banner>
            <button
              type="button"
              className="btn btn-secondary w-fit"
              onClick={() => {
                setError("");
                setData(null);
                void myDashboard()
                  .then((dash) => {
                    setData(dash);
                    setName(dash.me.name);
                    setError("");
                  })
                  .catch(() => {
                    setError(t("Could not load your dashboard.", "ዳሽቦርድዎን መጫን አልተቻለም።"));
                  });
              }}
            >
              {t("Try again", "እንደገና ይሞክሩ")}
            </button>
          </div>
        ) : (
          <Skeleton className="h-40" />
        )}
      </div>
    );
  }



  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-4xl">{t("Welcome back", "እንኳን ደህና መጡ")}</h1>
      <p className="text-ink-soft">{data.me.email}</p>
      <form
        className="card mt-4 grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          void updateProfile({ data: { name } }).then((result) => {
            setNote(result.ok ? t("Name saved.", "ስም ተቀምጧል።") : result.error);
          });
        }}
      >
        <label className="field">
          <span>{t("Name on your certificate", "በምስክር ወረቀትዎ ላይ የሚታየው ስም")}</span>
          <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <button className="btn btn-secondary" type="submit">{t("Save", "አስቀምጥ")}</button>
        {note ? <div className="sm:col-span-2"><Banner tone={note === t("Name saved.", "ስም ተቀምጧል።") ? "ok" : "bad"}>{note}</Banner></div> : null}
      </form>

      <h2 className="mt-8 font-display text-2xl">{t("Your courses", "ኮርሶችዎ")}</h2>
      {data.enrollments.length ? (
        <div className="mt-3 grid gap-3">
          {data.enrollments.map((item) => {
            const pct = item.total ? Math.round((item.completed / item.total) * 100) : 0;
            return (
              <article key={item.courseId} className="card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-display text-xl">{pick(lang, item.title, item.titleAm)}</h3>
                    <p className="text-sm text-muted">{item.completed}/{item.total} · {item.status.replaceAll("_", " ")}</p>
                  </div>
                  {item.nextLessonId ? (
                    <Link to="/learn/$slug/$lessonId" params={{ slug: item.slug, lessonId: item.nextLessonId }} className="btn btn-primary">
                      {t("Continue", "ቀጥል")}
                    </Link>
                  ) : null}
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full bg-accent" style={{ width: `${pct}%` }} /></div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-ink-soft">{t("You have not enrolled yet.", "ገና አልተመዘገቡም።")} <Link to="/courses" className="font-bold text-accent">{t("Browse courses", "ኮርሶችን ይመልከቱ")}</Link></p>
      )}

      <h2 className="mt-8 font-display text-2xl">{t("Projects", "ፕሮጀክቶች")}</h2>
      <div className="mt-3 grid gap-3">
        {data.projects.map((project) => (
          <article key={project.url + project.courseTitle} className="card p-4">
            <p className="font-semibold">{pick(lang, project.courseTitle, project.courseTitleAm)}</p>
            <p className="text-sm capitalize">{project.status.replaceAll("_", " ")}</p>
            {project.feedback ? <p className="mt-1 text-sm text-ink-soft">{project.feedback}</p> : null}
            <a className="text-sm font-bold text-accent" href={project.url} target="_blank" rel="noreferrer">{t("Open submission", "ማቅረቢያውን ክፈት")}</a>
          </article>
        ))}
        {!data.projects.length ? <p className="text-sm text-muted">{t("No project submitted yet.", "ገና ፕሮጀክት አልገባም።")}</p> : null}
      </div>

      <h2 className="mt-8 font-display text-2xl">{t("Certificates", "ምስክር ወረቀቶች")}</h2>
      <div className="mt-3 grid gap-3">
        {data.certificates.map((certificate) => (
          <article key={certificate.code} className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-semibold">{certificate.achievement}</p>
              <p className="text-sm text-muted">{certificate.code} · {formatWhen(certificate.issuedAt, lang)}</p>
            </div>
            <Link to="/verify/$id" params={{ id: certificate.code }} className="btn btn-secondary">
              {certificate.revokedAt ? t("Revoked", "ተሰርዟል") : t("View", "ይመልከቱ")}
            </Link>
          </article>
        ))}
        {!data.certificates.length ? <p className="text-sm text-muted">{t("Certificates appear here after an administrator issues them.", "አስተዳዳሪ ከሰጠ በኋላ ምስክር ወረቀቶች እዚህ ይታያሉ።")}</p> : null}
      </div>
    </div>
  );
}
