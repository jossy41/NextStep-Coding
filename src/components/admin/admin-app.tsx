import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useI18n } from "@/lib/i18n";
import type { CourseCard, Me, PostItem, ReasonCode, VideoItem } from "@/lib/learning-types";
import { Banner, Empty, Modal, Skeleton } from "@/components/site/ui";
import { claimAdmin, getMe } from "@/server/api";
import {
  adminCertificateQueue,
  adminDeleteCourse,
  adminDeleteLesson,
  adminDeleteModule,
  adminDeletePost,
  adminDeleteVideo,
  adminEligibility,
  adminGetCourse,
  adminGetSettings,
  adminIssueCertificate,
  adminListCourses,
  adminListPosts,
  adminListSubmissions,
  adminListUsers,
  adminListVideos,
  adminMoveLesson,
  adminMoveModule,
  adminMoveVideo,
  adminOverview,
  adminReviewSubmission,
  adminRevokeCertificate,
  adminSaveCourse,
  adminSaveLesson,
  adminSaveModule,
  adminSavePost,
  adminSaveSettings,
  adminSaveVideo,
  adminSetCourseStatus,
  adminSetRole,
} from "@/server/admin";

const TABS = ["overview", "courses", "content", "posts", "videos", "projects", "certificates", "students", "settings"] as const;
export type AdminTab = (typeof TABS)[number];

const emptyCourse = {
  id: "",
  slug: "",
  title: "",
  titleAm: "",
  description: "",
  descriptionAm: "",
  language: "en",
  level: "beginner",
  category: "Web development",
  status: "draft",
  durationHours: 8,
  thumbnailUrl: "",
  prerequisites: "",
  prerequisitesAm: "",
  objectives: "",
  objectivesAm: "",
  minQuizScore: 70,
  requireProject: true,
  projectTitle: "",
  projectTitleAm: "",
  projectBrief: "",
  projectBriefAm: "",
  projectRequirements: "",
  projectRequirementsAm: "",
  sortOrder: 0,
};

function reasonText(code: ReasonCode, t: (en: string, am: string) => string) {
  if (code === "not_enrolled") return t("Not enrolled", "አልተመዘገቡም");
  if (code === "lessons") return t("Lessons incomplete", "ትምህርቶች አልተጠናቀቁም");
  if (code === "quizzes") return t("Quiz below the pass mark", "ፈተና ከማለፊያ በታች");
  if (code === "project") return t("Project not approved", "ፕሮጀክት አልጸደቀም");
  if (code === "name") return t("Student name missing", "የተማሪ ስም የለም");
  return t("Active certificate already exists", "ንቁ ምስክር ወረቀት አለ");
}

export function AdminApp({ tab }: { tab: string }) {
  const { user, isPending } = useCurrentUserState();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [me, setMe] = useState<Me | null>(null);
  const [bootError, setBootError] = useState("");
  const active = (TABS as readonly string[]).includes(tab) ? (tab as AdminTab) : "overview";

  useEffect(() => {
    if (!user) return;
    let live = true;
    void getMe()
      .then((next) => {
        if (live) setMe(next);
      })
      .catch(() => {
        if (live) setBootError(t("Could not load your account.", "መለያዎን መጫን አልተቻለም።"));
      });
    return () => {
      live = false;
    };
  }, [user?.id]);

  if (isPending || (user && !me && !bootError)) return <div className="p-6"><Skeleton className="h-24" /></div>;
  if (!user) return <RedirectToSignIn />;
  if (!me || (me.role !== "admin" && me.role !== "reviewer")) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <h1 className="font-display text-3xl">{t("Administrator setup", "የአስተዳዳሪ ማዋቀር")}</h1>
        <p className="mt-2 text-ink-soft">{t("The first signed-in person can claim the administrator role. After that, only an administrator can grant access.", "የመጀመሪያው የገባ ሰው የአስተዳዳሪ ሚና ሊወስድ ይችላል። ከዚያ በኋላ አስተዳዳሪ ብቻ መዳረሻ ይሰጣል።")}</p>
        {bootError ? <p className="mt-3"><Banner tone="bad">{bootError}</Banner></p> : null}
        <button
          type="button"
          className="btn btn-primary mt-4"
          onClick={() => {
            void claimAdmin().then((result) => {
              if (!result.ok) setBootError(result.error);
              else window.location.assign("/admin");
            });
          }}
        >
          {t("Become the first administrator", "የመጀመሪያ አስተዳዳሪ ሁን")}
        </button>
      </div>
    );
  }

  const reviewer = me.role === "reviewer";
  const items: Array<{ id: AdminTab; label: string }> = reviewer
    ? [{ id: "projects", label: t("Projects", "ፕሮጀክቶች") }]
    : [
        { id: "overview", label: t("Overview", "አጠቃላይ") },
        { id: "courses", label: t("Courses", "ኮርሶች") },
        { id: "content", label: t("Learning content", "የመማሪያ ይዘት") },
        { id: "posts", label: t("Posts", "ጽሁፎች") },
        { id: "videos", label: t("Videos", "ቪዲዮዎች") },
        { id: "projects", label: t("Projects", "ፕሮጀክቶች") },
        { id: "certificates", label: t("Certificates", "ምስክር ወረቀቶች") },
        { id: "students", label: t("Students", "ተማሪዎች") },
        { id: "settings", label: t("Settings", "ቅንብሮች") },
      ];
  const shown = reviewer ? "projects" : active;
  const go = (next: AdminTab) => void navigate({ to: "/admin", search: { tab: next } });

  return (
    <div className="mx-auto grid max-w-6xl gap-4 px-4 py-6 lg:grid-cols-[13rem_1fr]">
      <aside className="no-print">
        <label className="field lg:hidden">
          <span>{t("Section", "ክፍል")}</span>
          <select className="select" value={shown} onChange={(event) => go(event.target.value as AdminTab)}>
            {items.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <nav className="hidden gap-1 lg:grid" aria-label="Admin">
          {items.map((item) => (
            <button key={item.id} type="button" className={`rounded-lg px-3 py-2 text-left text-sm font-semibold ${shown === item.id ? "bg-ink text-paper" : "hover:bg-card"}`} onClick={() => go(item.id)}>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>
      <section className="min-w-0">
        {shown === "overview" ? <Overview /> : null}
        {shown === "courses" ? <Courses /> : null}
        {shown === "content" ? <Content /> : null}
        {shown === "posts" ? <Posts /> : null}
        {shown === "videos" ? <Videos /> : null}
        {shown === "projects" ? <Projects /> : null}
        {shown === "certificates" ? <Certificates /> : null}
        {shown === "students" ? <Students /> : null}
        {shown === "settings" ? <Settings /> : null}
      </section>
    </div>
  );
}

function Overview() {
  const { t } = useI18n();
  const [error, setError] = useState("");
  const [data, setData] = useState<Awaited<ReturnType<typeof adminOverview>> | null>(null);
  useEffect(() => {
    void adminOverview().then((result) => {
      if (!result.ok) setError(result.error);
      else setData(result);
    });
  }, []);
  if (error) return <Banner tone="bad">{error}</Banner>;
  if (!data || !data.ok) return <Skeleton className="h-40" />;
  const stats = [
    [t("Published courses", "የታተሙ ኮርሶች"), data.stats.publishedCourses],
    [t("Draft courses", "ረቂቅ ኮርሶች"), data.stats.draftCourses],
    [t("Students", "ተማሪዎች"), data.stats.students],
    [t("Projects waiting", "በመጠባበቅ ላይ ያሉ ፕሮጀክቶች"), data.stats.pendingProjects],
    [t("Active certificates", "ንቁ ምስክር ወረቀቶች"), data.stats.activeCertificates],
    [t("Published posts", "የታተሙ ጽሁፎች"), data.stats.publishedPosts],
    [t("Published videos", "የታተሙ ቪዲዮዎች"), data.stats.publishedVideos],
  ] as const;
  return (
    <div className="grid gap-4">
      <h1 className="font-display text-3xl">{t("Overview", "አጠቃላይ")}</h1>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map(([label, value]) => (
          <article key={label} className="card p-4">
            <p className="text-sm text-muted">{label}</p>
            <p className="font-display text-3xl">{value}</p>
          </article>
        ))}
      </div>
      <h2 className="font-display text-2xl">{t("Projects waiting for review", "ግምገማ የሚጠብቁ ፕሮጀክቶች")}</h2>
      {data.pending.length ? data.pending.map((item) => (
        <p key={item.id} className="text-sm">{item.student} · {item.course}</p>
      )) : <p className="text-sm text-muted">{t("None right now.", "አሁን የለም።")}</p>}
    </div>
  );
}

function Courses() {
  const { t } = useI18n();
  const [courses, setCourses] = useState<CourseCard[]>([]);
  const [form, setForm] = useState(emptyCourse);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [level, setLevel] = useState("all");
  const [language, setLanguage] = useState("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirmId, setConfirmId] = useState("");

  async function load() {
    const result = await adminListCourses({ data: { q, status, level, language } });
    if (!result.ok) setError(result.error);
    else setCourses(result.courses);
  }
  useEffect(() => { void load(); }, [q, status, level, language]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="grid gap-4">
      <h1 className="font-display text-3xl">{t("Courses", "ኮርሶች")}</h1>
      {message ? <Banner tone="ok">{message}</Banner> : null}
      {error ? <Banner tone="bad">{error}</Banner> : null}
      <div className="grid gap-2 sm:grid-cols-4">
        <input className="input" value={q} placeholder={t("Search", "ፈልግ")} onChange={(event) => setQ(event.target.value)} />
        <select className="select" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">{t("All statuses", "ሁሉም ሁኔታዎች")}</option>
          <option value="draft">{t("Draft", "ረቂቅ")}</option>
          <option value="published">{t("Published", "የታተመ")}</option>
          <option value="archived">{t("Archived", "በማህደር")}</option>
        </select>
        <select className="select" value={level} onChange={(event) => setLevel(event.target.value)}>
          <option value="all">{t("All levels", "ሁሉም ደረጃዎች")}</option>
          <option value="beginner">{t("Beginner", "ጀማሪ")}</option>
          <option value="intermediate">{t("Intermediate", "መካከለኛ")}</option>
          <option value="advanced">{t("Advanced", "ከፍተኛ")}</option>
        </select>
        <select className="select" value={language} onChange={(event) => setLanguage(event.target.value)}>
          <option value="all">{t("All languages", "ሁሉም ቋንቋዎች")}</option>
          <option value="en">English</option>
          <option value="am">አማርኛ</option>
        </select>
      </div>
      <div className="grid gap-2">
        {courses.map((course) => (
          <article key={course.id} className="card flex flex-wrap items-center justify-between gap-2 p-3">
            <div>
              <p className="font-semibold">{course.title}</p>
              <p className="text-xs text-muted">{course.status} · {course.level} · {course.language}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/courses/$slug" params={{ slug: course.slug }} className="btn btn-ghost">{t("Preview", "ቅድመ እይታ")}</Link>
              <button type="button" className="btn btn-secondary" onClick={() => {
                void adminGetCourse({ data: { id: course.id } }).then((result) => {
                  if (!result.ok) setError(result.error);
                  else {
                    const next = result.course;
                    setForm({
                      ...emptyCourse,
                      id: next.id,
                      slug: next.slug,
                      title: next.title,
                      titleAm: next.titleAm,
                      description: next.description,
                      descriptionAm: next.descriptionAm,
                      language: next.language,
                      level: next.level,
                      category: next.category,
                      status: next.status,
                      durationHours: next.durationHours,
                      thumbnailUrl: next.thumbnailUrl ?? "",
                      prerequisites: next.prerequisites,
                      prerequisitesAm: next.prerequisitesAm,
                      objectives: next.objectives,
                      objectivesAm: next.objectivesAm,
                      minQuizScore: next.minQuizScore,
                      requireProject: next.requireProject,
                      projectTitle: next.projectTitle,
                      projectTitleAm: next.projectTitleAm,
                      projectBrief: next.projectBrief,
                      projectBriefAm: next.projectBriefAm,
                      projectRequirements: next.projectRequirements,
                      projectRequirementsAm: next.projectRequirementsAm,
                      sortOrder: next.sortOrder,
                    });
                    setMessage("");
                  }
                });
              }}>{t("Edit", "አርም")}</button>
              {course.status !== "published" ? <button type="button" className="btn btn-primary" onClick={() => void adminSetCourseStatus({ data: { id: course.id, status: "published" } }).then(load)}>{t("Publish", "አትም")}</button> : <button type="button" className="btn btn-secondary" onClick={() => void adminSetCourseStatus({ data: { id: course.id, status: "draft" } }).then(load)}>{t("Unpublish", "አውርድ")}</button>}
              <button type="button" className="btn btn-ghost" onClick={() => void adminSetCourseStatus({ data: { id: course.id, status: "archived" } }).then(load)}>{t("Archive", "አስቀምጥ")}</button>
              <button type="button" className="btn btn-ghost text-bad" onClick={() => setConfirmId(course.id)}>{t("Delete", "ሰርዝ")}</button>
            </div>
          </article>
        ))}
        {!courses.length ? <Empty title={t("No courses", "ኮርስ የለም")} body={t("Create one with the form below.", "ከታች ባለው ቅጽ ይፍጠሩ።")} /> : null}
      </div>
      <form
        className="card grid gap-3 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          void adminSaveCourse({ data: form }).then((result) => {
            if (!result.ok) setError(result.error);
            else {
              setMessage(t("Course saved.", "ኮርሱ ተቀምጧል።"));
              setError("");
              setForm({ ...emptyCourse, id: result.id });
              void load();
            }
          });
        }}
      >
        <h2 className="font-display text-2xl">{form.id ? t("Edit course", "ኮርስ አርም") : t("New course", "አዲስ ኮርስ")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="field"><span>{t("Title", "ርዕስ")}</span><input className="input" value={form.title} onChange={(event) => set("title", event.target.value)} required /></label>
          <label className="field"><span>{t("Title in Amharic", "የአማርኛ ርዕስ")}</span><input className="input" value={form.titleAm} onChange={(event) => set("titleAm", event.target.value)} /></label>
          <label className="field sm:col-span-2"><span>{t("Description", "መግለጫ")}</span><textarea className="area" value={form.description} onChange={(event) => set("description", event.target.value)} required /></label>
          <label className="field sm:col-span-2"><span>{t("Description in Amharic", "የአማርኛ መግለጫ")}</span><textarea className="area" value={form.descriptionAm} onChange={(event) => set("descriptionAm", event.target.value)} /></label>
          <label className="field"><span>{t("Slug", "አጭር አድራሻ")}</span><input className="input" value={form.slug} onChange={(event) => set("slug", event.target.value)} /></label>
          <label className="field"><span>{t("Category", "ምድብ")}</span><input className="input" value={form.category} onChange={(event) => set("category", event.target.value)} /></label>
          <label className="field"><span>{t("Language", "ቋንቋ")}</span><select className="select" value={form.language} onChange={(event) => set("language", event.target.value)}><option value="en">English</option><option value="am">አማርኛ</option></select></label>
          <label className="field"><span>{t("Level", "ደረጃ")}</span><select className="select" value={form.level} onChange={(event) => set("level", event.target.value)}><option value="beginner">{t("Beginner", "ጀማሪ")}</option><option value="intermediate">{t("Intermediate", "መካከለኛ")}</option><option value="advanced">{t("Advanced", "ከፍተኛ")}</option></select></label>
          <label className="field"><span>{t("Status", "ሁኔታ")}</span><select className="select" value={form.status} onChange={(event) => set("status", event.target.value)}><option value="draft">{t("Draft", "ረቂቅ")}</option><option value="published">{t("Published", "የታተመ")}</option><option value="archived">{t("Archived", "በማህደር")}</option></select></label>
          <label className="field"><span>{t("Hours", "ሰዓታት")}</span><input className="input" type="number" value={form.durationHours} onChange={(event) => set("durationHours", Number(event.target.value))} /></label>
          <label className="field sm:col-span-2"><span>{t("Thumbnail URL", "የምስል አድራሻ")}</span><input className="input" value={form.thumbnailUrl} onChange={(event) => set("thumbnailUrl", event.target.value)} /></label>
          <label className="field"><span>{t("Quiz pass mark", "የፈተና ማለፊያ")}</span><input className="input" type="number" value={form.minQuizScore} onChange={(event) => set("minQuizScore", Number(event.target.value))} /></label>
          <label className="field"><span>{t("Order", "ቅደም ተከተል")}</span><input className="input" type="number" value={form.sortOrder} onChange={(event) => set("sortOrder", Number(event.target.value))} /></label>
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.requireProject} onChange={(event) => set("requireProject", event.target.checked)} />{t("Require an approved project", "የጸደቀ ፕሮጀክት ጠይቅ")}</label>
          <label className="field sm:col-span-2"><span>{t("Objectives, one per line", "ግቦች፣ በየመስመሩ")}</span><textarea className="area" value={form.objectives} onChange={(event) => set("objectives", event.target.value)} /></label>
          <label className="field"><span>{t("Project title", "የፕሮጀክት ርዕስ")}</span><input className="input" value={form.projectTitle} onChange={(event) => set("projectTitle", event.target.value)} /></label>
          <label className="field"><span>{t("Project title in Amharic", "የአማርኛ የፕሮጀክት ርዕስ")}</span><input className="input" value={form.projectTitleAm} onChange={(event) => set("projectTitleAm", event.target.value)} /></label>
          <label className="field sm:col-span-2"><span>{t("Project brief", "የፕሮጀክት ማብራሪያ")}</span><textarea className="area" value={form.projectBrief} onChange={(event) => set("projectBrief", event.target.value)} /></label>
          <label className="field sm:col-span-2"><span>{t("Requirements, one per line", "መስፈርቶች፣ በየመስመሩ")}</span><textarea className="area" value={form.projectRequirements} onChange={(event) => set("projectRequirements", event.target.value)} /></label>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary" type="submit">{t("Save course", "ኮርሱን አስቀምጥ")}</button>
          <button className="btn btn-ghost" type="button" onClick={() => setForm(emptyCourse)}>{t("Clear", "አጽዳ")}</button>
        </div>
      </form>
      <Modal open={!!confirmId} title={t("Delete this course?", "ይህ ኮርስ ይሰረዝ?")} onClose={() => setConfirmId("")}>
        <p className="text-sm text-ink-soft">{t("Lessons and enrollments for this course will be removed. Courses with certificates cannot be deleted.", "የዚህ ኮርስ ትምህርቶች እና ምዝገባዎች ይወገዳሉ። ምስክር ወረቀት ያለው ኮርስ አይሰረዝም።")}</p>
        <div className="mt-4 flex gap-2">
          <button type="button" className="btn btn-danger" onClick={() => {
            void adminDeleteCourse({ data: { id: confirmId } }).then((result) => {
              if (!result.ok) setError(result.error);
              else { setMessage(t("Course deleted.", "ኮርሱ ተሰርዟል።")); void load(); }
              setConfirmId("");
            });
          }}>{t("Delete", "ሰርዝ")}</button>
          <button type="button" className="btn btn-secondary" onClick={() => setConfirmId("")}>{t("Cancel", "ተወው")}</button>
        </div>
      </Modal>
    </div>
  );
}

type Editor = Extract<Awaited<ReturnType<typeof adminGetCourse>>, { ok: true }>["course"];

function Content() {
  const { t } = useI18n();
  const [courses, setCourses] = useState<CourseCard[]>([]);
  const [courseId, setCourseId] = useState("");
  const [course, setCourse] = useState<Editor | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleTitleAm, setModuleTitleAm] = useState("");
  const [lesson, setLesson] = useState({ id: "", moduleId: "", title: "", titleAm: "", content: "", contentAm: "", exercises: "", exercisesAm: "", resources: "", durationMinutes: 15, videoId: "" });

  async function loadCourse(id: string) {
    if (!id) return;
    const result = await adminGetCourse({ data: { id } });
    if (!result.ok) setError(result.error);
    else setCourse(result.course);
  }
  useEffect(() => {
    void adminListCourses({ data: {} }).then((result) => { if (result.ok) setCourses(result.courses); });
    void adminListVideos().then((result) => { if (result.ok) setVideos(result.videos); });
  }, []);
  useEffect(() => { void loadCourse(courseId); }, [courseId]);

  return (
    <div className="grid gap-4">
      <h1 className="font-display text-3xl">{t("Learning content", "የመማሪያ ይዘት")}</h1>
      {note ? <Banner tone="ok">{note}</Banner> : null}
      {error ? <Banner tone="bad">{error}</Banner> : null}
      <label className="field"><span>{t("Course", "ኮርስ")}</span>
        <select className="select" value={courseId} onChange={(event) => setCourseId(event.target.value)}>
          <option value="">{t("Choose a course", "ኮርስ ይምረጡ")}</option>
          {courses.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
      </label>
      {course ? (
        <>
          <form className="card grid gap-2 p-4 sm:grid-cols-[1fr_1fr_auto]" onSubmit={(event) => {
            event.preventDefault();
            void adminSaveModule({ data: { courseId: course.id, title: moduleTitle, titleAm: moduleTitleAm } }).then((result) => {
              if (!result.ok) setError(result.error);
              else { setNote(t("Module added.", "ሞጁል ታክሏል።")); setModuleTitle(""); void loadCourse(course.id); }
            });
          }}>
            <input className="input" value={moduleTitle} placeholder={t("New module title", "አዲስ የሞጁል ርዕስ")} onChange={(event) => setModuleTitle(event.target.value)} />
            <input className="input" value={moduleTitleAm} placeholder={t("Amharic title", "የአማርኛ ርዕስ")} onChange={(event) => setModuleTitleAm(event.target.value)} />
            <button className="btn btn-primary" type="submit">{t("Add module", "ሞጁል ጨምር")}</button>
          </form>
          {course.modules.map((mod) => (
            <section key={mod.id} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-xl">{mod.title}</h2>
                <div className="flex gap-1">
                  <button type="button" className="btn btn-ghost" onClick={() => void adminMoveModule({ data: { id: mod.id, dir: -1 } }).then(() => loadCourse(course.id))}>{t("Up", "ወደ ላይ")}</button>
                  <button type="button" className="btn btn-ghost" onClick={() => void adminMoveModule({ data: { id: mod.id, dir: 1 } }).then(() => loadCourse(course.id))}>{t("Down", "ወደ ታች")}</button>
                  <button type="button" className="btn btn-ghost text-bad" onClick={() => void adminDeleteModule({ data: { id: mod.id } }).then(() => loadCourse(course.id))}>{t("Delete", "ሰርዝ")}</button>
                </div>
              </div>
              {mod.lessons.map((item) => (
                <div key={item.id} className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2">
                  <button type="button" className="text-left font-semibold" onClick={() => setLesson({ id: item.id, moduleId: mod.id, title: item.title, titleAm: item.titleAm, content: item.content, contentAm: item.contentAm, exercises: item.exercises, exercisesAm: item.exercisesAm, resources: item.resources, durationMinutes: item.durationMinutes, videoId: item.videoId ?? "" })}>{item.title}</button>
                  <div className="flex gap-1">
                    <button type="button" className="btn btn-ghost" onClick={() => void adminMoveLesson({ data: { id: item.id, dir: -1 } }).then(() => loadCourse(course.id))}>{t("Up", "ወደ ላይ")}</button>
                    <button type="button" className="btn btn-ghost" onClick={() => void adminMoveLesson({ data: { id: item.id, dir: 1 } }).then(() => loadCourse(course.id))}>{t("Down", "ወደ ታች")}</button>
                    <button type="button" className="btn btn-ghost text-bad" onClick={() => void adminDeleteLesson({ data: { id: item.id } }).then(() => loadCourse(course.id))}>{t("Delete", "ሰርዝ")}</button>
                  </div>
                </div>
              ))}
              <button type="button" className="btn btn-secondary mt-3" onClick={() => setLesson({ id: "", moduleId: mod.id, title: "", titleAm: "", content: "", contentAm: "", exercises: "", exercisesAm: "", resources: "", durationMinutes: 15, videoId: "" })}>{t("Add lesson", "ትምህርት ጨምር")}</button>
            </section>
          ))}
          {lesson.moduleId ? (
            <form className="card grid gap-3 p-4" onSubmit={(event) => {
              event.preventDefault();
              void adminSaveLesson({ data: { ...lesson, videoId: lesson.videoId || null } }).then((result) => {
                if (!result.ok) setError(result.error);
                else { setNote(t("Lesson saved.", "ትምህርቱ ተቀምጧል።")); setLesson((current) => ({ ...current, id: result.id })); void loadCourse(course.id); }
              });
            }}>
              <h2 className="font-display text-2xl">{lesson.id ? t("Edit lesson", "ትምህርት አርም") : t("New lesson", "አዲስ ትምህርት")}</h2>
              <label className="field"><span>{t("Title", "ርዕስ")}</span><input className="input" value={lesson.title} onChange={(event) => setLesson({ ...lesson, title: event.target.value })} required /></label>
              <label className="field"><span>{t("Title in Amharic", "የአማርኛ ርዕስ")}</span><input className="input" value={lesson.titleAm} onChange={(event) => setLesson({ ...lesson, titleAm: event.target.value })} /></label>
              <label className="field"><span>{t("Lesson text", "የትምህርት ጽሁፍ")}</span><textarea className="area" value={lesson.content} onChange={(event) => setLesson({ ...lesson, content: event.target.value })} /></label>
              <label className="field"><span>{t("Lesson text in Amharic", "የአማርኛ ጽሁፍ")}</span><textarea className="area" value={lesson.contentAm} onChange={(event) => setLesson({ ...lesson, contentAm: event.target.value })} /></label>
              <label className="field"><span>{t("Exercises, one per line", "ልምምዶች፣ በየመስመሩ")}</span><textarea className="area" value={lesson.exercises} onChange={(event) => setLesson({ ...lesson, exercises: event.target.value })} /></label>
              <label className="field"><span>{t("Resources, one link per line", "መርጃዎች፣ በየመስመሩ አገናኝ")}</span><textarea className="area" value={lesson.resources} onChange={(event) => setLesson({ ...lesson, resources: event.target.value })} /></label>
              <label className="field"><span>{t("Minutes", "ደቂቃዎች")}</span><input className="input" type="number" value={lesson.durationMinutes} onChange={(event) => setLesson({ ...lesson, durationMinutes: Number(event.target.value) })} /></label>
              <label className="field"><span>{t("YouTube video", "የYouTube ቪዲዮ")}</span>
                <select className="select" value={lesson.videoId} onChange={(event) => setLesson({ ...lesson, videoId: event.target.value })}>
                  <option value="">{t("None", "የለም")}</option>
                  {videos.map((video) => <option key={video.id} value={video.id}>{video.title}</option>)}
                </select>
              </label>
              <button className="btn btn-primary" type="submit">{t("Save lesson", "ትምህርቱን አስቀምጥ")}</button>
            </form>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function Posts() {
  const { t } = useI18n();
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [confirmId, setConfirmId] = useState("");
  const [form, setForm] = useState({ id: "", title: "", slug: "", summary: "", body: "", coverUrl: "", category: "Announcement", language: "en", status: "draft", pinned: false, publishedAt: "" });
  async function load() {
    const result = await adminListPosts({ data: { q, status } });
    if (!result.ok) setError(result.error);
    else setPosts(result.posts);
  }
  useEffect(() => { void load(); }, [q, status]);
  return (
    <div className="grid gap-4">
      <h1 className="font-display text-3xl">{t("Posts and announcements", "ጽሁፎች እና ማስታወቂያዎች")}</h1>
      {note ? <Banner tone="ok">{note}</Banner> : null}
      {error ? <Banner tone="bad">{error}</Banner> : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <input className="input" value={q} placeholder={t("Search", "ፈልግ")} onChange={(event) => setQ(event.target.value)} />
        <select className="select" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">{t("All", "ሁሉም")}</option>
          <option value="draft">{t("Drafts", "ረቂቆች")}</option>
          <option value="published">{t("Published", "የታተሙ")}</option>
        </select>
      </div>
      {posts.map((post) => (
        <article key={post.id} className="card flex flex-wrap items-center justify-between gap-2 p-3">
          <div>
            <p className="font-semibold">{post.title}</p>
            <p className="text-xs text-muted">{post.status}{post.scheduled ? ` · ${t("Scheduled", "የተቀጠረ")}` : ""}{post.pinned ? " · pinned" : ""}</p>
          </div>
          <div className="flex gap-2">
            {post.status === "published" && !post.scheduled ? <Link to="/news/$slug" params={{ slug: post.slug }} className="btn btn-ghost">{t("View", "ይመልከቱ")}</Link> : null}
            <button type="button" className="btn btn-secondary" onClick={() => setForm({ id: post.id, title: post.title, slug: post.slug, summary: post.summary, body: post.body, coverUrl: post.coverUrl ?? "", category: post.category, language: post.language, status: post.status, pinned: post.pinned, publishedAt: post.publishedAt ? post.publishedAt.slice(0, 16) : "" })}>{t("Edit", "አርም")}</button>
            <button type="button" className="btn btn-ghost text-bad" onClick={() => setConfirmId(post.id)}>{t("Delete", "ሰርዝ")}</button>
          </div>
        </article>
      ))}
      <form className="card grid gap-3 p-4" onSubmit={(event) => {
        event.preventDefault();
        const publishedAt = form.publishedAt ? new Date(form.publishedAt).toISOString() : "";
        void adminSavePost({ data: { ...form, publishedAt } }).then((result) => {
          if (!result.ok) setError(result.error);
          else { setNote(t("Post saved.", "ጽሁፉ ተቀምጧል።")); setError(""); void load(); }
        });
      }}>
        <h2 className="font-display text-2xl">{form.id ? t("Edit post", "ጽሁፍ አርም") : t("New post", "አዲስ ጽሁፍ")}</h2>
        <label className="field"><span>{t("Title", "ርዕስ")}</span><input className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></label>
        <label className="field"><span>{t("Summary", "ማጠቃለያ")}</span><textarea className="area" value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} /></label>
        <label className="field"><span>{t("Body", "ይዘት")}</span><textarea className="area" value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} required /></label>
        <label className="field"><span>{t("Cover image URL", "የሽፋን ምስል አድራሻ")}</span><input className="input" value={form.coverUrl} onChange={(event) => setForm({ ...form, coverUrl: event.target.value })} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="field"><span>{t("Category", "ምድብ")}</span><input className="input" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></label>
          <label className="field"><span>{t("Language", "ቋንቋ")}</span><select className="select" value={form.language} onChange={(event) => setForm({ ...form, language: event.target.value })}><option value="en">English</option><option value="am">አማርኛ</option></select></label>
          <label className="field"><span>{t("Status", "ሁኔታ")}</span><select className="select" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="draft">{t("Draft", "ረቂቅ")}</option><option value="published">{t("Published", "የታተመ")}</option></select></label>
          <label className="field"><span>{t("Visible from", "ከዚህ ጊዜ ጀምሮ ይታያል")}</span><input className="input" type="datetime-local" value={form.publishedAt} onChange={(event) => setForm({ ...form, publishedAt: event.target.value })} /></label>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.pinned} onChange={(event) => setForm({ ...form, pinned: event.target.checked })} />{t("Pin this announcement", "ይህን ማስታወቂያ ሰካ")}</label>
        <button className="btn btn-primary" type="submit">{t("Save post", "ጽሁፉን አስቀምጥ")}</button>
      </form>
      <Modal open={!!confirmId} title={t("Delete this post?", "ይህ ጽሁፍ ይሰረዝ?")} onClose={() => setConfirmId("")}>
        <div className="flex gap-2">
          <button type="button" className="btn btn-danger" onClick={() => void adminDeletePost({ data: { id: confirmId } }).then(() => { setConfirmId(""); void load(); })}>{t("Delete", "ሰርዝ")}</button>
          <button type="button" className="btn btn-secondary" onClick={() => setConfirmId("")}>{t("Cancel", "ተወው")}</button>
        </div>
      </Modal>
    </div>
  );
}

function Videos() {
  const { t } = useI18n();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [courses, setCourses] = useState<CourseCard[]>([]);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [confirmId, setConfirmId] = useState("");
  const [form, setForm] = useState({ id: "", source: "", title: "", description: "", category: "General", language: "en", courseId: "", lessonId: "", status: "draft", sortOrder: 0 });
  async function load() {
    const result = await adminListVideos();
    if (!result.ok) setError(result.error);
    else { setVideos(result.videos); setCourses(result.courses); }
  }
  useEffect(() => { void load(); }, []);
  return (
    <div className="grid gap-4">
      <h1 className="font-display text-3xl">{t("YouTube videos", "የYouTube ቪዲዮዎች")}</h1>
      <p className="text-sm text-ink-soft">{t("Paste a watch link, a youtu.be link, a Shorts link, or an 11-character video ID. The player uses YouTube's embed address. HTML embeds are not accepted.", "የwatch አገናኝ፣ የyoutu.be አገናኝ፣ የShorts አገናኝ ወይም ባለ 11 ፊደል መለያ ይለጥፉ። ማጫወቻው የYouTube embed አድራሻ ይጠቀማል። የHTML embed አይቀበልም።")}</p>
      {note ? <Banner tone="ok">{note}</Banner> : null}
      {error ? <Banner tone="bad">{error}</Banner> : null}
      {videos.map((video) => (
        <article key={video.id} className="card flex flex-wrap items-center gap-3 p-3">
          <img src={video.thumbnailUrl} alt="" className="h-16 w-28 rounded-lg object-cover" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{video.title}</p>
            <p className="text-xs text-muted">{video.status} · {video.category} · {video.youtubeId}</p>
          </div>
          <button type="button" className="btn btn-ghost" onClick={() => void adminMoveVideo({ data: { id: video.id, dir: -1 } }).then(load)}>{t("Up", "ወደ ላይ")}</button>
          <button type="button" className="btn btn-ghost" onClick={() => void adminMoveVideo({ data: { id: video.id, dir: 1 } }).then(load)}>{t("Down", "ወደ ታች")}</button>
          <button type="button" className="btn btn-secondary" onClick={() => setForm({ id: video.id, source: video.youtubeUrl || video.youtubeId, title: video.title, description: video.description, category: video.category, language: video.language, courseId: video.courseId ?? "", lessonId: video.lessonId ?? "", status: video.status, sortOrder: video.sortOrder })}>{t("Edit", "አርም")}</button>
          <Link to="/videos/$id" params={{ id: video.id }} className="btn btn-ghost">{t("Preview", "ቅድመ እይታ")}</Link>
          <button type="button" className="btn btn-ghost text-bad" onClick={() => setConfirmId(video.id)}>{t("Remove", "አስወግድ")}</button>
        </article>
      ))}
      {!videos.length ? <Empty title={t("No videos yet", "ቪዲዮ ገና የለም")} body={t("Add a real YouTube lesson below.", "ከታች እውነተኛ የYouTube ትምህርት ይጨምሩ።")} /> : null}
      <form className="card grid gap-3 p-4" onSubmit={(event) => {
        event.preventDefault();
        void adminSaveVideo({ data: { ...form, courseId: form.courseId || null, lessonId: form.lessonId || null } }).then((result) => {
          if (!result.ok) setError(result.error);
          else { setNote(t("Video saved.", "ቪዲዮው ተቀምጧል።")); setError(""); setForm({ ...form, id: result.id }); void load(); }
        });
      }}>
        <h2 className="font-display text-2xl">{form.id ? t("Edit video", "ቪዲዮ አርም") : t("Add video", "ቪዲዮ ጨምር")}</h2>
        <label className="field"><span>{t("YouTube URL or ID", "የYouTube አድራሻ ወይም መለያ")}</span><input className="input" value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })} required /></label>
        <label className="field"><span>{t("Title", "ርዕስ")}</span><input className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></label>
        <label className="field"><span>{t("Description", "መግለጫ")}</span><textarea className="area" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="field"><span>{t("Category", "ምድብ")}</span><input className="input" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></label>
          <label className="field"><span>{t("Language", "ቋንቋ")}</span><select className="select" value={form.language} onChange={(event) => setForm({ ...form, language: event.target.value })}><option value="en">English</option><option value="am">አማርኛ</option></select></label>
          <label className="field"><span>{t("Course", "ኮርስ")}</span><select className="select" value={form.courseId} onChange={(event) => setForm({ ...form, courseId: event.target.value })}><option value="">{t("None", "የለም")}</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label>
          <label className="field"><span>{t("Status", "ሁኔታ")}</span><select className="select" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="draft">{t("Draft", "ረቂቅ")}</option><option value="published">{t("Published", "የታተመ")}</option></select></label>
        </div>
        <button className="btn btn-primary" type="submit">{t("Save video", "ቪዲዮውን አስቀምጥ")}</button>
      </form>
      <Modal open={!!confirmId} title={t("Remove this video?", "ይህ ቪዲዮ ይወገድ?")} onClose={() => setConfirmId("")}>
        <div className="flex gap-2">
          <button type="button" className="btn btn-danger" onClick={() => void adminDeleteVideo({ data: { id: confirmId } }).then(() => { setConfirmId(""); void load(); })}>{t("Remove", "አስወግድ")}</button>
          <button type="button" className="btn btn-secondary" onClick={() => setConfirmId("")}>{t("Cancel", "ተወው")}</button>
        </div>
      </Modal>
    </div>
  );
}

function Projects() {
  const { t } = useI18n();
  const [rows, setRows] = useState<Array<{ id: string; student: string; email: string; course: string; url: string; description: string; status: string; feedback: string }>>([]);
  const [status, setStatus] = useState("pending");
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  async function load() {
    const result = await adminListSubmissions({ data: { status, q } });
    if (!result.ok) setError(result.error);
    else setRows(result.submissions);
  }
  useEffect(() => { void load(); }, [status, q]);
  return (
    <div className="grid gap-4">
      <h1 className="font-display text-3xl">{t("Projects and submissions", "ፕሮጀክቶች እና ማቅረቢያዎች")}</h1>
      {error ? <Banner tone="bad">{error}</Banner> : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <input className="input" value={q} placeholder={t("Search student or course", "ተማሪ ወይም ኮርስ ፈልግ")} onChange={(event) => setQ(event.target.value)} />
        <select className="select" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">{t("All", "ሁሉም")}</option>
          <option value="pending">{t("Pending", "በመጠባበቅ")}</option>
          <option value="revision_requested">{t("Revisions", "ማሻሻያ")}</option>
          <option value="approved">{t("Approved", "ጸድቋል")}</option>
          <option value="rejected">{t("Rejected", "ተቀባይነት አላገኘም")}</option>
        </select>
      </div>
      {rows.map((row) => (
        <article key={row.id} className="card grid gap-2 p-4">
          <p className="font-semibold">{row.student} · {row.course}</p>
          <p className="text-xs text-muted">{row.email} · {row.status.replaceAll("_", " ")}</p>
          <a className="text-sm font-bold text-accent" href={row.url} target="_blank" rel="noreferrer">{row.url}</a>
          {row.description ? <p className="text-sm text-ink-soft">{row.description}</p> : null}
          <label className="field"><span>{t("Feedback", "አስተያየት")}</span><textarea className="area" value={feedback[row.id] ?? row.feedback} onChange={(event) => setFeedback({ ...feedback, [row.id]: event.target.value })} /></label>
          <div className="flex flex-wrap gap-2">
            {(["approved", "revision_requested", "rejected"] as const).map((next) => (
              <button key={next} type="button" className="btn btn-secondary" onClick={() => {
                void adminReviewSubmission({ data: { id: row.id, status: next, feedback: feedback[row.id] ?? row.feedback } }).then((result) => {
                  if (!result.ok) setError(result.error);
                  else void load();
                });
              }}>{next === "approved" ? t("Approve", "አጽድቅ") : next === "rejected" ? t("Reject", "አትቀበል") : t("Request revision", "ማሻሻያ ጠይቅ")}</button>
            ))}
          </div>
        </article>
      ))}
      {!rows.length ? <Empty title={t("No submissions", "ማቅረቢያ የለም")} body={t("Student projects show up here after they submit a link.", "ተማሪዎች አገናኝ ካስገቡ በኋላ ፕሮጀክቶች እዚህ ይታያሉ።")} /> : null}
    </div>
  );
}

function Certificates() {
  const { t } = useI18n();
  const [courses, setCourses] = useState<CourseCard[]>([]);
  const [courseId, setCourseId] = useState("");
  const [q, setQ] = useState("");
  const [people, setPeople] = useState<Array<{ userId: string; name: string; email: string; eligible: boolean; reasons: ReasonCode[]; completed: number; total: number }>>([]);
  const [certs, setCerts] = useState<Array<{ id: string; code: string; studentName: string; achievement: string; issuedAt: string; revokedAt: string | null; revokedReason: string | null }>>([]);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState<Record<string, string>>({});
  async function loadCerts() {
    const result = await adminCertificateQueue({ data: { q } });
    if (!result.ok) setError(result.error);
    else { setCerts(result.certificates); setCourses(result.courses); }
  }
  useEffect(() => { void loadCerts(); }, [q]);
  return (
    <div className="grid gap-4">
      <h1 className="font-display text-3xl">{t("Certificates", "ምስክር ወረቀቶች")}</h1>
      {note ? <Banner tone="ok">{note}</Banner> : null}
      {error ? <Banner tone="bad">{error}</Banner> : null}
      <label className="field"><span>{t("Issue for a course", "ለኮርስ ስጥ")}</span>
        <select className="select" value={courseId} onChange={(event) => {
          const id = event.target.value;
          setCourseId(id);
          if (!id) return;
          void adminEligibility({ data: { courseId: id } }).then((result) => {
            if (!result.ok) setError(result.error);
            else setPeople(result.people);
          });
        }}>
          <option value="">{t("Choose a course", "ኮርስ ይምረጡ")}</option>
          {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
        </select>
      </label>
      {people.map((person) => (
        <article key={person.userId} className="card p-3">
          <p className="font-semibold">{person.name}</p>
          <p className="text-xs text-muted">{person.email} · {person.completed}/{person.total}</p>
          {person.eligible ? (
            <button type="button" className="btn btn-primary mt-2" onClick={() => void adminIssueCertificate({ data: { userId: person.userId, courseId } }).then((result) => {
              if (!result.ok) setError(result.error);
              else { setNote(`${t("Issued", "ተሰጥቷል")} ${result.code}`); void loadCerts(); }
            })}>{t("Issue certificate", "ምስክር ወረቀት ስጥ")}</button>
          ) : <p className="mt-1 text-sm text-muted">{person.reasons.map((item) => reasonText(item, t)).join(" · ")}</p>}
        </article>
      ))}
      <input className="input" value={q} placeholder={t("Search name, course, or ID", "ስም፣ ኮርስ ወይም መለያ ፈልግ")} onChange={(event) => setQ(event.target.value)} />
      {certs.map((cert) => (
        <article key={cert.id} className="card grid gap-2 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold">{cert.studentName} · {cert.achievement}</p>
              <p className="text-xs text-muted">{cert.code} · {cert.revokedAt ? t("Revoked", "ተሰርዟል") : t("Valid", "ትክክለኛ")}</p>
            </div>
            <Link to="/verify/$id" params={{ id: cert.code }} className="btn btn-secondary">{t("Open", "ክፈት")}</Link>
          </div>
          {!cert.revokedAt ? (
            <div className="flex flex-wrap gap-2">
              <input className="input max-w-md" value={reason[cert.id] ?? ""} placeholder={t("Reason for revocation", "የመሰረዝ ምክንያት")} onChange={(event) => setReason({ ...reason, [cert.id]: event.target.value })} />
              <button type="button" className="btn btn-danger" onClick={() => void adminRevokeCertificate({ data: { id: cert.id, reason: reason[cert.id] ?? "" } }).then((result) => {
                if (!result.ok) setError(result.error);
                else { setNote(t("Certificate revoked.", "ምስክር ወረቀቱ ተሰርዟል።")); void loadCerts(); }
              })}>{t("Revoke", "ሰርዝ")}</button>
            </div>
          ) : <p className="text-sm text-bad">{cert.revokedReason}</p>}
        </article>
      ))}
    </div>
  );
}

function Students() {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [users, setUsers] = useState<Array<{ id: string; email: string; name: string; role: string }>>([]);
  useEffect(() => {
    void adminListUsers({ data: { q } }).then((result) => {
      if (!result.ok) setError(result.error);
      else setUsers(result.users);
    });
  }, [q]);
  return (
    <div className="grid gap-3">
      <h1 className="font-display text-3xl">{t("Students and users", "ተማሪዎች እና ተጠቃሚዎች")}</h1>
      {error ? <Banner tone="bad">{error}</Banner> : null}
      <input className="input" value={q} placeholder={t("Search name or email", "ስም ወይም ኢሜይል ፈልግ")} onChange={(event) => setQ(event.target.value)} />
      {users.map((person) => (
        <article key={person.id} className="card flex flex-wrap items-center justify-between gap-2 p-3">
          <div>
            <p className="font-semibold">{person.name}</p>
            <p className="text-xs text-muted">{person.email}</p>
          </div>
          <select className="select max-w-40" value={person.role} onChange={(event) => void adminSetRole({ data: { userId: person.id, role: event.target.value } }).then((result) => {
            if (!result.ok) setError(result.error);
            else setUsers((current) => current.map((item) => item.id === person.id ? { ...item, role: event.target.value } : item));
          })}>
            <option value="student">{t("Student", "ተማሪ")}</option>
            <option value="reviewer">{t("Reviewer", "ገምጋሚ")}</option>
            <option value="admin">{t("Admin", "አስተዳዳሪ")}</option>
          </select>
        </article>
      ))}
    </div>
  );
}

function Settings() {
  const { t } = useI18n();
  const [form, setForm] = useState({ orgName: "", issuerName: "", issuerRole: "", contactEmail: "" });
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    void adminGetSettings().then((result) => {
      if (result.ok) {
        setForm({
          orgName: result.orgName,
          issuerName: result.issuerName,
          issuerRole: result.issuerRole,
          contactEmail: result.contactEmail,
        });
      }
    });
  }, []);
  return (
    <form className="grid max-w-xl gap-3" onSubmit={(event) => {
      event.preventDefault();
      void adminSaveSettings({ data: form }).then((result) => {
        if (!result.ok) setError(result.error);
        else { setNote(t("Settings saved.", "ቅንብሮች ተቀምጠዋል።")); setError(""); }
      });
    }}>
      <h1 className="font-display text-3xl">{t("Settings", "ቅንብሮች")}</h1>
      <p className="text-sm text-ink-soft">{t("The issuer name and role are printed on certificates. Leave them blank to show only NextStep Coding.", "የአውጪው ስም እና ሚና በምስክር ወረቀት ላይ ይታተማሉ። ባዶ ከተዉ NextStep Coding ብቻ ይታያል።")}</p>
      {note ? <Banner tone="ok">{note}</Banner> : null}
      {error ? <Banner tone="bad">{error}</Banner> : null}
      <label className="field"><span>{t("Organization name", "የድርጅት ስም")}</span><input className="input" value={form.orgName} onChange={(event) => setForm({ ...form, orgName: event.target.value })} /></label>
      <label className="field"><span>{t("Issuer name", "የአውጪ ስም")}</span><input className="input" value={form.issuerName} onChange={(event) => setForm({ ...form, issuerName: event.target.value })} /></label>
      <label className="field"><span>{t("Issuer role", "የአውጪ ሚና")}</span><input className="input" value={form.issuerRole} onChange={(event) => setForm({ ...form, issuerRole: event.target.value })} /></label>
      <label className="field"><span>{t("Public contact email", "የህዝብ ኢሜይል")}</span><input className="input" value={form.contactEmail} onChange={(event) => setForm({ ...form, contactEmail: event.target.value })} /></label>
      <button className="btn btn-primary" type="submit">{t("Save settings", "ቅንብሮችን አስቀምጥ")}</button>
    </form>
  );
}
