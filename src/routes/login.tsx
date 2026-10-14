import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Wordmark } from "@/components/site/logo";
import { Banner } from "@/components/site/ui";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useI18n } from "@/lib/i18n";

function safeRedirect(value: unknown) {
  if (typeof value !== "string") return "/dashboard";
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/login")) return "/dashboard";
  return value;
}

type Mode = "login" | "register" | "forgot";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode:
      search.mode === "register"
        ? "register"
        : search.mode === "forgot"
          ? "forgot"
          : "login",
    redirect: safeRedirect(search.redirect),
  }),
  component: LoginPage,
});

function LoginPage() {
  const { mode, redirect } = Route.useSearch();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);
  const register = mode === "register";
  const forgot = mode === "forgot";

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!email.includes("@")) {
      setError(t("Enter a valid email.", "ትክክለኛ ኢሜይል ያስገቡ።"));
      return;
    }

    if (forgot) {
      setPending(true);
      const result = await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setPending(false);
      if (result.error) {
        setError(
          result.error.message ??
            t("Could not send reset link.", "የይለፍ ቃል ማስተካከያ አገናኝ መላክ አልተቻለም።"),
        );
        return;
      }
      setSuccess(
        t(
          "If an account exists for that email, a password-reset link has been sent. Check your inbox (and server logs in development).",
          "ለዚያ ኢሜይል መለያ ካለ፣ የይለፍ ቃል ማስተካከያ አገናኝ ተልኳል። የገቢ ሳጥንዎን ይመልከቱ (በልማት ላይ የሰርቨር ሎጎችንም)።",
        ),
      );
      return;
    }

    if (password.length < 8) {
      setError(t("Use at least 8 characters.", "ቢያንስ 8 ፊደላት ይጠቀሙ።"));
      return;
    }
    if (register && password !== confirm) {
      setError(t("Passwords do not match.", "የይለፍ ቃሎች አይዛመዱም።"));
      return;
    }
    if (register && name.trim().length < 2) {
      setError(t("Enter your full name.", "ሙሉ ስምዎን ያስገቡ።"));
      return;
    }
    setPending(true);
    const result = register
      ? await authClient.signUp.email({
          email,
          password,
          name: name.trim(),
          callbackURL: redirect,
        })
      : await authClient.signIn.email({
          email,
          password,
          callbackURL: redirect,
        });
    setPending(false);
    if (result.error) {
      setError(
        result.error.message ?? t("Could not sign in.", "መግባት አልተቻለም።"),
      );
      return;
    }
    window.location.assign(redirect);
  }

  function setMode(next: Mode) {
    void navigate({ to: "/login", search: { mode: next, redirect } });
  }

  const title = forgot
    ? t("Forgot password", "የይለፍ ቃል ረሱ")
    : register
      ? t("Create account", "መለያ ይክፈቱ")
      : t("Log in", "ግባ");

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4 py-12">
      <div className="card w-full p-6">
        <Wordmark />
        <h1 className="mt-6 font-display text-3xl">{title}</h1>
        {forgot ? (
          <p className="mt-2 text-sm text-ink-soft">
            {t(
              "Enter the email you registered with. We will send a link to set a new password.",
              "የተመዘገቡበትን ኢሜይል ያስገቡ። አዲስ የይለፍ ቃል ለማዘጋጀት አገናኝ እንልካለን።",
            )}
          </p>
        ) : null}
        {!authEnabled ? (
          <p className="mt-3">
            <Banner tone="warn">
              {t("Sign-in is not enabled.", "መግቢያ አልበራም።")}
            </Banner>
          </p>
        ) : null}
        <form
          className="mt-4 grid gap-3"
          onSubmit={(event) => void onSubmit(event)}
        >
          {register ? (
            <label className="field">
              <span>{t("Full name", "ሙሉ ስም")}</span>
              <input
                className="input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
              />
            </label>
          ) : null}
          <label className="field">
            <span>{t("Email", "ኢሜይል")}</span>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </label>
          {!forgot ? (
            <label className="field">
              <span>{t("Password", "የይለፍ ቃል")}</span>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={register ? "new-password" : "current-password"}
              />
            </label>
          ) : null}
          {register ? (
            <label className="field">
              <span>{t("Confirm password", "የይለፍ ቃል ያረጋግጡ")}</span>
              <input
                className="input"
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                autoComplete="new-password"
              />
            </label>
          ) : null}
          {error ? <Banner tone="bad">{error}</Banner> : null}
          {success ? <Banner tone="ok">{success}</Banner> : null}
          <button
            className="btn btn-primary"
            type="submit"
            disabled={pending || !authEnabled}
          >
            {forgot
              ? t("Send reset link", "የማስተካከያ አገናኝ ላክ")
              : register
                ? t("Create account", "መለያ ይክፈቱ")
                : t("Log in", "ግባ")}
          </button>
        </form>

        {!forgot && !register ? (
          <p className="mt-3 text-sm">
            <button
              type="button"
              className="font-bold text-accent"
              onClick={() => setMode("forgot")}
            >
              {t("Forgot password?", "የይለፍ ቃል ረሱ?")}
            </button>
          </p>
        ) : null}

        {!forgot ? (
          <div className="mt-4 grid gap-2">
            {GROK_PROVIDERS.map((provider) => (
              <button
                key={provider.providerId}
                type="button"
                className="btn btn-secondary"
                onClick={() =>
                  void signIn(provider.providerId, { callbackURL: redirect })
                }
              >
                {t("Continue with", "ቀጥል በ")} {provider.label}
              </button>
            ))}
          </div>
        ) : null}

        <p className="mt-4 text-sm">
          {forgot ? (
            <>
              {t("Remember your password?", "የይለፍ ቃልዎን ያስታውሳሉ?")}{" "}
              <button
                type="button"
                className="font-bold text-accent"
                onClick={() => setMode("login")}
              >
                {t("Log in", "ግባ")}
              </button>
            </>
          ) : register ? (
            <>
              {t("Already have an account?", "መለያ አለዎት?")}{" "}
              <button
                type="button"
                className="font-bold text-accent"
                onClick={() => setMode("login")}
              >
                {t("Log in", "ግባ")}
              </button>
            </>
          ) : (
            <>
              {t("New here?", "አዲስ ነዎት?")}{" "}
              <button
                type="button"
                className="font-bold text-accent"
                onClick={() => setMode("register")}
              >
                {t("Create account", "መለያ ይክፈቱ")}
              </button>
            </>
          )}
        </p>
        <p className="mt-3 text-sm">
          <Link to="/" className="text-muted">
            {t("Back home", "ወደ መነሻ")}
          </Link>
        </p>
      </div>
    </div>
  );
}
