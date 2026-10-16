import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useI18n } from "@/lib/i18n";
import { getMe, getPublicSettings } from "@/server/api";
import { BrandLink } from "@/components/site/logo";

function LangSwitch() {
  const { lang, setLang } = useI18n();
  return (
    <div className="flex rounded-lg border border-line bg-card p-0.5" role="group" aria-label="Language">
      {(["en", "am"] as const).map((code) => (
        <button
          key={code}
          type="button"
          className={`min-h-9 rounded-md px-2.5 text-sm font-bold ${lang === code ? "bg-ink text-paper" : "text-ink-soft"}`}
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
        >
          {code === "en" ? "EN" : "አማ"}
        </button>
      ))}
    </div>
  );
}

function AuthSlot({ admin }: { admin: boolean }) {
  const { t } = useI18n();
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <div className="h-9 w-20 animate-pulse rounded-lg bg-line" />;
  if (!user) {
    return (
      <Link to="/login" search={{ mode: "login", redirect: "/dashboard" }} className="btn btn-primary">
        {t("Log in", "ግባ")}
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Link to="/dashboard" className="btn btn-ghost px-2">
        {t("Dashboard", "ዳሽቦርድ")}
      </Link>
      {admin ? (
        <Link to="/admin" search={{ tab: "overview" }} className="btn btn-secondary">
          {t("Admin", "አስተዳዳሪ")}
        </Link>
      ) : null}
      <UserButton />
    </div>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { user, isPending } = useCurrentUserState();
  const userId = user?.id ?? null;
  const [open, setOpen] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const path = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => setOpen(false), [path]);

  // Load admin/reviewer role only after the session has finished resolving.
  // Retry transient getMe failures (common right after login when the cookie /
  // bearer is not yet visible to the server function). A single failed getMe
  // must not permanently hide the Admin button for the rest of the session.
  useEffect(() => {
    if (isPending) return;
    if (!userId) {
      setAdmin(false);
      return;
    }
    let live = true;
    let attempt = 0;
    const maxAttempts = 4;
    let retryTimer: number | undefined;

    const load = () => {
      void getMe()
        .then((me) => {
          if (!live) return;
          setAdmin(me.role === "admin" || me.role === "reviewer");
        })
        .catch(() => {
          if (!live) return;
          attempt += 1;
          if (attempt < maxAttempts) {
            retryTimer = window.setTimeout(load, 150 * attempt);
            return;
          }
          setAdmin(false);
        });
    };

    load();
    return () => {
      live = false;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
    };
  }, [userId, isPending]);

  useEffect(() => {
    let live = true;
    void getPublicSettings()
      .then((settings) => {
        if (live) setEmail(settings.contactEmail);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  const links = [
    { to: "/courses", label: t("Courses", "ኮርሶች") },
    { to: "/videos", label: t("Videos", "ቪዲዮዎች") },
    { to: "/news", label: t("News", "ዜና") },
    { to: "/verify", label: t("Verify", "ማረጋገጫ") },
  ] as const;

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-card focus:p-3">
        {t("Skip to content", "ወደ ይዘት ይሂዱ")}
      </a>
      <header className="no-print sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <BrandLink />
          <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Primary">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-ink-soft hover:bg-card hover:text-ink"
                activeProps={{ className: "rounded-lg px-3 py-2 text-sm font-semibold bg-card text-ink" }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <LangSwitch />
            <div className="hidden sm:block">
              <AuthSlot admin={admin} />
            </div>
            <button
              type="button"
              className="btn btn-secondary px-3 lg:hidden"
              aria-expanded={open}
              aria-controls="mobile-nav"
              onClick={() => setOpen((value) => !value)}
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
              <span className="sr-only">{t("Menu", "ምናሌ")}</span>
            </button>
          </div>
        </div>
        {open ? (
          <div id="mobile-nav" className="border-t border-line px-4 py-3 lg:hidden">
            <nav className="grid gap-1" aria-label="Mobile">
              {links.map((link) => (
                <Link key={link.to} to={link.to} className="rounded-lg px-3 py-3 font-semibold">
                  {link.label}
                </Link>
              ))}
              <div className="pt-2 sm:hidden">
                <AuthSlot admin={admin} />
              </div>
            </nav>
          </div>
        ) : null}
      </header>
      <main id="main" className="flex-1">{children}</main>
      <footer className="no-print mt-16 border-t border-line bg-ink text-paper">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <BrandLink tone="paper" />
            <p className="mt-4 max-w-sm text-sm text-accent-soft">
              {t(
                "Learn web development in English and Amharic. Practice, build a project, and earn a certificate you can verify.",
                "የድረ-ገጽ ልማትን በእንግሊዝኛ እና በአማርኛ ይማሩ። ይለማመዱ፣ ፕሮጀክት ይገንቡ፣ እና ማረጋገጥ የሚችሉትን ምስክር ወረቀት ያግኙ።",
              )}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-accent">{t("Explore", "ያስሱ")}</p>
            <div className="mt-3 grid gap-2 text-sm">
              {links.map((link) => (
                <Link key={link.to} to={link.to} className="text-paper/90 hover:text-paper">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-accent">{t("NextStep Coding", "NextStep Coding")}</p>
            <div className="mt-3 grid gap-2 text-sm">
              <Link to="/privacy" className="text-paper/90 hover:text-paper">{t("Privacy", "ግላዊነት")}</Link>
              <Link to="/terms" className="text-paper/90 hover:text-paper">{t("Terms", "ውሎች")}</Link>
              {email ? (
                <a className="text-paper/90 hover:text-paper" href={`mailto:${email}`}>{email}</a>
              ) : (
                <span className="text-paper/70">{t("Contact is set by the school.", "አድራሻውን ትምህርት ቤቱ ያስቀምጣል።")}</span>
              )}
              <LangSwitch />
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-paper/70">
          © {new Date().getFullYear()} NextStep Coding. {t("All rights reserved.", "መብቱ በህግ የተጠበቀ ነው።")}
        </div>
      </footer>
    </div>
  );
}
