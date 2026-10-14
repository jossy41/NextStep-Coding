import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Wordmark } from "@/components/site/logo";
import { Banner } from "@/components/site/ui";
import { authClient, authEnabled } from "@/lib/auth/client";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  const invalidToken = !token;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (invalidToken) {
      setError(
        t(
          "This reset link is missing or invalid. Request a new one from the login page.",
          "ይህ የማስተካከያ አገናኝ ጠፍቷል ወይም ልክ አይደለም። ከመግቢያ ገጽ አዲስ ይጠይቁ።",
        ),
      );
      return;
    }
    if (password.length < 8) {
      setError(t("Use at least 8 characters.", "ቢያንስ 8 ፊደላት ይጠቀሙ።"));
      return;
    }
    if (password !== confirm) {
      setError(t("Passwords do not match.", "የይለፍ ቃሎች አይዛመዱም።"));
      return;
    }
    setPending(true);
    const result = await authClient.resetPassword({
      newPassword: password,
      token,
    });
    setPending(false);
    if (result.error) {
      setError(
        result.error.message ??
          t(
            "This reset link is invalid or has expired. Please request a new one.",
            "ይህ የማስተካከያ አገናኝ ልክ አይደለም ወይም ጊዜው አልፏል። አዲስ ይጠይቁ።",
          ),
      );
      return;
    }
    setSuccess(true);
  }

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4 py-12">
      <div className="card w-full p-6">
        <Wordmark />
        <h1 className="mt-6 font-display text-3xl">
          {t("Set a new password", "አዲስ የይለፍ ቃል ያዘጋጁ")}
        </h1>
        {!authEnabled ? (
          <p className="mt-3">
            <Banner tone="warn">
              {t("Sign-in is not enabled.", "መግቢያ አልበራም።")}
            </Banner>
          </p>
        ) : null}

        {success ? (
          <div className="mt-4 grid gap-3">
            <Banner tone="ok">
              {t(
                "Your password has been updated. You can log in with the new password.",
                "የይለፍ ቃልዎ ተዘምኗል። በአዲሱ የይለፍ ቃል መግባት ይችላሉ።",
              )}
            </Banner>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() =>
                void navigate({
                  to: "/login",
                  search: { mode: "login", redirect: "/dashboard" },
                })
              }
            >
              {t("Go to log in", "ወደ መግቢያ ይሂዱ")}
            </button>
          </div>
        ) : (
          <form
            className="mt-4 grid gap-3"
            onSubmit={(event) => void onSubmit(event)}
          >
            {invalidToken ? (
              <Banner tone="bad">
                {t(
                  "This reset link is missing or invalid. Request a new one from the login page.",
                  "ይህ የማስተካከያ አገናኝ ጠፍቷል ወይም ልክ አይደለም። ከመግቢያ ገጽ አዲስ ይጠይቁ።",
                )}
              </Banner>
            ) : null}
            <label className="field">
              <span>{t("New password", "አዲስ የይለፍ ቃል")}</span>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                disabled={invalidToken}
              />
            </label>
            <label className="field">
              <span>{t("Confirm new password", "አዲሱን የይለፍ ቃል ያረጋግጡ")}</span>
              <input
                className="input"
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                autoComplete="new-password"
                disabled={invalidToken}
              />
            </label>
            {error ? <Banner tone="bad">{error}</Banner> : null}
            <button
              className="btn btn-primary"
              type="submit"
              disabled={pending || !authEnabled || invalidToken}
            >
              {t("Update password", "የይለፍ ቃል ያዘምኑ")}
            </button>
          </form>
        )}

        <p className="mt-4 text-sm">
          <button
            type="button"
            className="font-bold text-accent"
            onClick={() =>
              void navigate({
                to: "/login",
                search: { mode: "forgot", redirect: "/dashboard" },
              })
            }
          >
            {t("Request a new reset link", "አዲስ የማስተካከያ አገናኝ ይጠይቁ")}
          </button>
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
