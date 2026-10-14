import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CourseCardView } from "@/components/courses/cards";
import { Empty } from "@/components/site/ui";
import { useI18n } from "@/lib/i18n";
import { listCourses } from "@/server/api";

export const Route = createFileRoute("/courses/")({
  loader: () => listCourses({ data: {} }),
  component: CoursesPage,
});

function CoursesPage() {
  const courses = Route.useLoaderData();
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [level, setLevel] = useState("all");
  const [language, setLanguage] = useState("all");
  const visible = useMemo(
    () =>
      courses.filter((course) => {
        const hay = `${course.title} ${course.titleAm} ${course.description} ${course.category}`.toLowerCase();
        if (q && !hay.includes(q.toLowerCase())) return false;
        if (level !== "all" && course.level !== level) return false;
        if (language !== "all" && course.language !== language) return false;
        return true;
      }),
    [courses, q, level, language],
  );
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-4xl">{t("Courses", "ኮርሶች")}</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">
        {t("Published paths you can enroll in. Drafts stay in the admin dashboard.", "መመዝገብ የሚችሉባቸው የታተሙ መንገዶች። ረቂቆች በአስተዳዳሪ ዳሽቦርድ ይቆያሉ።")}
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <label className="field">
          <span>{t("Search", "ፈልግ")}</span>
          <input className="input" value={q} onChange={(event) => setQ(event.target.value)} />
        </label>
        <label className="field">
          <span>{t("Level", "ደረጃ")}</span>
          <select className="select" value={level} onChange={(event) => setLevel(event.target.value)}>
            <option value="all">{t("All levels", "ሁሉም ደረጃዎች")}</option>
            <option value="beginner">{t("Beginner", "ጀማሪ")}</option>
            <option value="intermediate">{t("Intermediate", "መካከለኛ")}</option>
            <option value="advanced">{t("Advanced", "ከፍተኛ")}</option>
          </select>
        </label>
        <label className="field">
          <span>{t("Language", "ቋንቋ")}</span>
          <select className="select" value={language} onChange={(event) => setLanguage(event.target.value)}>
            <option value="all">{t("All languages", "ሁሉም ቋንቋዎች")}</option>
            <option value="en">English</option>
            <option value="am">አማርኛ</option>
          </select>
        </label>
      </div>
      {visible.length ? (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {visible.map((course) => <CourseCardView key={course.id} course={course} />)}
        </div>
      ) : (
        <div className="mt-6">
          <Empty title={t("No courses match", "የሚዛመድ ኮርስ የለም")} body={t("Try a different search or filter.", "ሌላ ፍለጋ ወይም ማጣሪያ ይሞክሩ።")} />
        </div>
      )}
    </div>
  );
}
