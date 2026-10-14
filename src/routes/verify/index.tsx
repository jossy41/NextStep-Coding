import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/verify/")({
  component: VerifyLookup,
});

function VerifyLookup() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="font-display text-4xl">{t("Verify a certificate", "ምስክር ወረቀት ያረጋግጡ")}</h1>
      <p className="mt-2 text-ink-soft">{t("Enter the certificate ID. No account is required.", "የምስክር መለያውን ያስገቡ። መለያ አያስፈልግም።")}</p>
      <form
        className="mt-6 grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const next = code.trim().toUpperCase();
          if (next) void navigate({ to: "/verify/$id", params: { id: next } });
        }}
      >
        <label className="field">
          <span>{t("Certificate ID", "የምስክር መለያ")}</span>
          <input className="input" value={code} onChange={(event) => setCode(event.target.value)} placeholder="NSC-2026-XXXXXXXX" />
        </label>
        <button className="btn btn-primary" type="submit">{t("Verify", "አረጋግጥ")}</button>
      </form>
    </div>
  );
}
