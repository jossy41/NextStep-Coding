import { Link } from "@tanstack/react-router";
import type { CourseCard } from "@/lib/learning-types";
import { useI18n } from "@/lib/i18n";
import { pick } from "@/lib/text";

export function levelLabel(level: string, t: (en: string, am: string) => string) {
  if (level === "intermediate") return t("Intermediate", "መካከለኛ");
  if (level === "advanced") return t("Advanced", "ከፍተኛ");
  return t("Beginner", "ጀማሪ");
}

export function CourseCover({ course }: { course: CourseCard }) {
  if (course.thumbnailUrl) {
    return <img src={course.thumbnailUrl} alt="" className="h-full w-full object-cover" />;
  }
  const mark = course.slug.split("-")[0]?.slice(0, 4).toUpperCase() || "NS";
  return (
    <div className={`flex h-full items-end p-4 ${course.level === "advanced" ? "bg-ink-soft" : "bg-ink"}`}>
      <span className="font-display text-3xl text-accent-ink">{mark}</span>
    </div>
  );
}

export function CourseCardView({ course, progress }: { course: CourseCard; progress?: number }) {
  const { lang, t } = useI18n();
  return (
    <article className="card flex h-full flex-col overflow-hidden">
      <div className="h-36">
        <CourseCover course={course} />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wide text-muted">
          <span>{levelLabel(course.level, t)}</span>
          <span>·</span>
          <span>{course.language === "am" ? "አማርኛ" : "English"}</span>
          <span>·</span>
          <span>{course.durationHours} {t("hours", "ሰዓታት")}</span>
        </div>
        <h3 className="font-display text-2xl leading-tight">{pick(lang, course.title, course.titleAm)}</h3>
        <p className="line-clamp-3 text-sm text-ink-soft">{pick(lang, course.description, course.descriptionAm)}</p>
        {typeof progress === "number" ? (
          <div>
            <div className="mb-1 flex justify-between text-xs font-semibold text-muted">
              <span>{t("Progress", "ሂደት")}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-line">
              <div className="h-full bg-accent" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : null}
        <div className="mt-auto flex items-center justify-between pt-2 text-sm text-muted">
          <span>{course.lessonCount} {t("lessons", "ትምህርቶች")}</span>
          <Link to="/courses/$slug" params={{ slug: course.slug }} className="font-bold text-accent">
            {t("View course", "ኮርሱን ይመልከቱ")}
          </Link>
        </div>
      </div>
    </article>
  );
}
