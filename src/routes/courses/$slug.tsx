import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CourseCover, levelLabel } from "@/components/courses/cards";
import { Banner, Skeleton } from "@/components/site/ui";
import { useI18n } from "@/lib/i18n";
import type { CourseDetail } from "@/lib/learning-types";
import { pick } from "@/lib/text";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { enroll, getCourse } from "@/server/api";

export const Route = createFileRoute("/courses/$slug")({
  component: CoursePage,
});

function CoursePage() {
  const { slug } = Route.useParams();
  const { lang, t } = useI18n();
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    void getCourse({ data: { slug } })
      .then((result) => {
        if (!live) return;
        if ("ok" in result && result.ok === false) {
          setCourse(null);
          setError(t("This course is not available.", "ይህ ኮርስ አይገኝም።"));
        } else if (!("ok" in result)) {
          setCourse(result);
          setError("");
        }
      })
      .catch(() => {
        if (live) setError(t("Could not load the course.", "ኮርሱን መጫን አልተቻለም።"));
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [slug, user?.id, t]);

  async function onEnroll() {
    if (!course) return;
    if (!user) {
      await navigate({ to: "/login", search: { mode: "login", redirect: `/courses/${course.slug}` } });
      return;
    }
    const result = await enroll({ data: { courseId: course.id } });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMessage(t("You are enrolled.", "ተመዝግበዋል።"));
    const first = course.modules[0]?.lessons[0]?.id;
    if (first) {
      await navigate({ to: "/learn/$slug/$lessonId", params: { slug: course.slug, lessonId: first } });
    }
  }

  if (loading) {
    return (
      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-10">
        <Skeleton className="h-48" />
        <Skeleton className="h-24" />
      </div>
    );
  }
  if (!course) return <div className="mx-auto max-w-3xl px-4 py-16"><Banner tone="bad">{error}</Banner></div>;

  const title = pick(lang, course.title, course.titleAm);
  const progress = course.lessonCount ? Math.round((course.completedLessons / course.lessonCount) * 100) : 0;
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div>
          <div className="card h-48 overflow-hidden"><CourseCover course={course} /></div>
          <p className="mt-4 text-xs font-bold uppercase tracking-wide text-muted">
            {levelLabel(course.level, t)} · {course.category} · {course.language === "am" ? "አማርኛ" : "English"}
          </p>
          <h1 className="mt-2 font-display text-4xl">{title}</h1>
          {course.status !== "published" ? <p className="mt-2"><Banner tone="warn">{t("Preview. Students cannot see this until it is published.", "ቅድመ እይታ። እስኪታተም ድረስ ተማሪዎች አያዩትም።")}</Banner></p> : null}
          <p className="mt-4 text-ink-soft">{pick(lang, course.description, course.descriptionAm)}</p>
          <h2 className="mt-8 font-display text-2xl">{t("What you will practice", "የሚለማመዱት")}</h2>
          <ul className="mt-3 grid gap-2">
            {pick(lang, course.objectives.join("\n"), course.objectivesAm.join("\n")).split("\n").filter(Boolean).map((item) => (
              <li key={item} className="card px-3 py-2 text-sm">{item}</li>
            ))}
          </ul>
        </div>
        <aside className="card h-fit p-5">
          <p className="text-sm text-muted">{course.durationHours} {t("hours", "ሰዓታት")} · {course.lessonCount} {t("lessons", "ትምህርቶች")}</p>
          {course.enrolled ? (
            <>
              <p className="mt-3 text-sm font-semibold">{progress}% {t("complete", "ተጠናቋል")}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full bg-accent" style={{ width: `${progress}%` }} /></div>
              <Link
                to="/learn/$slug/$lessonId"
                params={{ slug: course.slug, lessonId: course.modules[0]?.lessons[0]?.id ?? "start" }}
                className="btn btn-primary mt-4 w-full"
              >
                {t("Continue learning", "መማር ይቀጥሉ")}
              </Link>
            </>
          ) : (
            <button type="button" className="btn btn-primary mt-4 w-full" disabled={isPending || course.status !== "published"} onClick={() => void onEnroll()}>
              {course.status === "published" ? t("Enroll", "ተመዝገብ") : t("Not open yet", "ገና አልተከፈተም")}
            </button>
          )}
          {message ? <p className="mt-3"><Banner tone="ok">{message}</Banner></p> : null}
          {error ? <p className="mt-3"><Banner tone="bad">{error}</Banner></p> : null}
          <p className="mt-4 text-sm text-muted">
            {t("Certificate requires every lesson, quizzes at", "ምስክር ወረቀት ሁሉንም ትምህርቶች እና ፈተናዎችን ይፈልጋል በ")} {course.minQuizScore}%
            {course.requireProject ? t(", plus an approved project.", "፣ እና የጸደቀ ፕሮጀክት።") : "."}
          </p>
        </aside>
      </div>
      <h2 className="mt-10 font-display text-2xl">{t("Lessons", "ትምህርቶች")}</h2>
      <div className="mt-4 grid gap-3">
        {course.modules.map((mod) => (
          <section key={mod.id} className="card p-4">
            <h3 className="font-display text-xl">{pick(lang, mod.title, mod.titleAm)}</h3>
            {mod.description ? <p className="text-sm text-muted">{mod.description}</p> : null}
            <ol className="mt-3 grid gap-2">
              {mod.lessons.map((lesson) => (
                <li key={lesson.id}>
                  {course.enrolled || course.canPreview ? (
                    <Link to="/learn/$slug/$lessonId" params={{ slug: course.slug, lessonId: lesson.id }} className="flex justify-between gap-3 rounded-lg px-2 py-2 hover:bg-paper">
                      <span>{pick(lang, lesson.title, lesson.titleAm)}</span>
                      <span className="text-sm text-muted">{lesson.durationMinutes} {t("min", "ደቂቃ")}</span>
                    </Link>
                  ) : (
                    <div className="flex justify-between gap-3 px-2 py-2 text-ink-soft">
                      <span>{pick(lang, lesson.title, lesson.titleAm)}</span>
                      <span className="text-sm">{lesson.durationMinutes} {t("min", "ደቂቃ")}</span>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
      <section className="card mt-6 p-5">
        <h2 className="font-display text-2xl">{t("Final project", "የመጨረሻ ፕሮጀክት")}</h2>
        <p className="mt-2 font-semibold">{pick(lang, course.projectTitle, course.projectTitleAm)}</p>
        <p className="mt-2 text-ink-soft">{pick(lang, course.projectBrief, course.projectBriefAm)}</p>
        <ul className="mt-3 list-disc pl-5 text-sm text-ink-soft">
          {(lang === "am" && course.projectRequirementsAm.length ? course.projectRequirementsAm : course.projectRequirements).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
