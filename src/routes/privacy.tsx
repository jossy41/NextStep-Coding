import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/privacy")({
  component: function Privacy() {
    const { t } = useI18n();
    return (
      <article className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-display text-4xl">{t("Privacy", "ግላዊነት")}</h1>
        <div className="mt-4 grid gap-3 text-ink-soft">
          <p>{t("NextStep Coding stores your name, email, course progress, quiz attempts, project submissions, and certificates so the school can teach and verify completion.", "NextStep Coding ስምዎን፣ ኢሜይልዎን፣ የኮርስ ሂደትዎን፣ የፈተና ሙከራዎችን፣ የፕሮጀክት ማቅረቢያዎችን እና ምስክር ወረቀቶችን ያስቀምጣል።")}</p>
          <p>{t("Public pages show only published courses, videos, and posts. Certificate verification shows the holder name, achievement, date, and status. It does not show your email.", "የህዝብ ገጾች የታተሙ ኮርሶችን፣ ቪዲዮዎችን እና ጽሁፎችን ብቻ ያሳያሉ። የምስክር ማረጋገጫ ስም፣ ስኬት፣ ቀን እና ሁኔታን ያሳያል። ኢሜይል አያሳይም።")}</p>
          <p>{t("Project reviews are visible to you and to reviewers. Other students cannot open your submission.", "የፕሮጀክት ግምገማ ለእርስዎ እና ለገምጋሚዎች ይታያል። ሌሎች ተማሪዎች ማቅረቢያዎን መክፈት አይችሉም።")}</p>
        </div>
      </article>
    );
  },
});
