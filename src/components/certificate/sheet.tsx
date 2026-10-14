import { useEffect, useState } from "react";
import type { CertificatePublic } from "@/lib/learning-types";
import { formatWhen } from "@/lib/text";
import { useI18n } from "@/lib/i18n";
import { Wordmark } from "@/components/site/logo";

function Qr({ value }: { value: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let live = true;
    void import("qrcode").then(async (mod) => {
      const url = await mod.toDataURL(value, {
        margin: 1,
        width: 168,
        color: { dark: "#122033", light: "#fffcf8" },
      });
      if (live) setSrc(url);
    });
    return () => {
      live = false;
    };
  }, [value]);
  if (!src) return <div className="h-28 w-28 rounded bg-line" />;
  return <img src={src} alt="" width={112} height={112} className="h-28 w-28" />;
}

export function CertificateSheet({
  certificate,
  verifyUrl,
  stamped,
}: {
  certificate: CertificatePublic;
  verifyUrl: string;
  stamped?: "REVOKED" | null;
}) {
  const { lang, t } = useI18n();
  return (
    <article className="certificate-sheet relative mx-auto max-w-3xl bg-card px-6 py-8 text-ink shadow-sm sm:px-12 sm:py-12">
      <div className="pointer-events-none absolute inset-3 border border-ink/80" />
      <div className="pointer-events-none absolute inset-5 border border-accent/80" />
      {stamped ? (
        <p className="absolute top-16 right-10 rotate-12 border-4 border-bad px-3 py-1 font-display text-3xl text-bad">
          {t("REVOKED", "ተሰርዟል")}
        </p>
      ) : null}
      <div className="relative grid gap-6">
        <Wordmark />
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-accent">
            {certificate.orgName}
          </p>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl">{t("Certificate of completion", "የማጠናቀቂያ ምስክር ወረቀት")}</h1>
          <p className="mt-4 text-ink-soft">{t("This certifies that", "ይህ የሚያረጋግጠው")}</p>
          <p className="mt-1 font-display text-4xl text-ink">{certificate.studentName}</p>
          <p className="mt-4 text-ink-soft">{t("has completed", "አጠናቅቀዋል")}</p>
          <p className="mt-1 font-display text-2xl">{certificate.achievement}</p>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-6 border-t border-line pt-5">
          <div className="grid gap-1 text-sm">
            <p><span className="text-muted">{t("Certificate ID", "የምስክር መለያ")}</span> · {certificate.code}</p>
            <p><span className="text-muted">{t("Issued", "የተሰጠበት")}</span> · {formatWhen(certificate.issuedAt, lang)}</p>
            {certificate.issuerName ? (
              <p className="pt-3">
                <span className="block font-display text-xl">{certificate.issuerName}</span>
                <span className="text-muted">{certificate.issuerRole || t("Issuer", "አውጪ")}</span>
              </p>
            ) : (
              <p className="pt-3 text-muted">{t("Issued by NextStep Coding", "በNextStep Coding የተሰጠ")}</p>
            )}
          </div>
          <div className="grid justify-items-center gap-1">
            <Qr value={verifyUrl} />
            <p className="max-w-40 text-center text-xs break-all text-muted">{verifyUrl.replace(/^https?:\/\//, "")}</p>
          </div>
        </div>
        <p className="text-xs text-muted">
          {t(
            "A certificate of completion from NextStep Coding. It is not an accredited diploma. Confirm it on the public verification page.",
            "ይህ የNextStep Coding የማጠናቀቂያ ምስክር ወረቀት ነው። እውቅና ያለው ዲፕሎማ አይደለም። በይፋዊ ማረጋገጫ ገጽ ያረጋግጡ።",
          )}
        </p>
      </div>
    </article>
  );
}
