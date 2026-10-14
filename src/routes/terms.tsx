import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/terms")({
  component: function Terms() {
    const { t } = useI18n();
    return (
      <article className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-display text-4xl">{t("Terms", "ውሎች")}</h1>
        <div className="mt-4 grid gap-3 text-ink-soft">
          <p>{t("NextStep Coding offers learning material, practice, and certificates of completion. A certificate is not an accredited diploma or a job guarantee.", "NextStep Coding የመማሪያ ይዘት፣ ልምምድ እና የማጠናቀቂያ ምስክር ወረቀት ያቀርባል። ምስክር ወረቀቱ እውቅና ያለው ዲፕሎማ ወይም የስራ ዋስትና አይደለም።")}</p>
          <p>{t("You keep the rights to projects you submit. Share a link reviewers can open. Do not submit someone else's work as your own.", "የሚያቀርቧቸው ፕሮጀክቶች መብት የእርስዎ ነው። ገምጋሚዎች ሊከፍቱት የሚችሉ አገናኝ ያጋሩ። የሌላ ሰው ስራ እንደራስዎ አያቅርቡ።")}</p>
          <p>{t("Administrators may unpublish content or revoke a certificate when it was issued in error. Revoked certificates stay visible as revoked.", "አስተዳዳሪዎች ይዘትን ማውረድ ወይም በስህተት የተሰጠ ምስክር ወረቀት መሰረዝ ይችላሉ። የተሰረዘ ምስክር ወረቀት እንደተሰረዘ ይታያል።")}</p>
        </div>
      </article>
    );
  },
});
