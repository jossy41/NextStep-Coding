import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CertificateSheet } from "@/components/certificate/sheet";
import { useI18n } from "@/lib/i18n";
import { verifyCertificate } from "@/server/api";

export const Route = createFileRoute("/verify/$id")({
  loader: ({ params }) => verifyCertificate({ data: { code: params.id } }),
  component: VerifyPage,
});

function VerifyPage() {
  const result = Route.useLoaderData();
  const { t } = useI18n();
  const [code, setCode] = useState("");
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      {result.status === "not_found" ? (
        <div className="card p-8 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-bad">{t("Not found", "አልተገኘም")}</p>
          <h1 className="mt-2 font-display text-4xl">{t("No certificate matches that ID", "ከዚህ መለያ ጋር የሚዛመድ ምስክር ወረቀት የለም")}</h1>
          <p className="mt-2 text-ink-soft">{t("Check the characters and try again. A link by itself is not proof.", "ፊደሎቹን ይመልከቱ እና እንደገና ይሞክሩ። አገናኝ ብቻውን ማስረጃ አይደለም።")}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          <div className={`no-print rounded-2xl px-4 py-3 font-bold ${result.status === "verified" ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad"}`}>
            {result.status === "verified" ? t("VERIFIED", "ተረጋግጧል") : t("REVOKED", "ተሰርዟል")}
            {result.status === "revoked" && result.certificate.revokedReason ? ` — ${result.certificate.revokedReason}` : ""}
          </div>
          <CertificateSheet
            certificate={result.certificate}
            verifyUrl={`${origin}/verify/${result.certificate.code}`}
            stamped={result.status === "revoked" ? "REVOKED" : null}
          />
          <div className="no-print flex justify-center">
            <button type="button" className="btn btn-secondary" onClick={() => window.print()}>{t("Print or save PDF", "አትም ወይም PDF አስቀምጥ")}</button>
          </div>
        </div>
      )}
      <form
        className="no-print mx-auto mt-8 flex max-w-xl gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const next = code.trim();
          if (next) window.location.assign(`/verify/${encodeURIComponent(next)}`);
        }}
      >
        <input className="input" value={code} onChange={(event) => setCode(event.target.value)} placeholder="NSC-2026-XXXXXXXX" aria-label={t("Certificate ID", "የምስክር መለያ")} />
        <button className="btn btn-primary" type="submit">{t("Check", "ፈትሽ")}</button>
      </form>
      <p className="no-print mt-4 text-center text-sm"><Link to="/verify" className="font-semibold text-accent">{t("Verification help", "የማረጋገጫ እገዛ")}</Link></p>
    </div>
  );
}
