import { Link } from "@tanstack/react-router";
import type { CourseCard, PostItem, VideoItem } from "@/lib/learning-types";
import { useI18n } from "@/lib/i18n";
import { formatWhen, pick } from "@/lib/text";
import { CourseCardView } from "@/components/courses/cards";
import { youtubeThumbnail } from "@/lib/youtube";

const HOW_STEPS = [
  {
    n: "1",
    titleEn: "Choose a course",
    titleAm: "ኮርስ ይምረጡ",
    bodyEn: "Browse published courses and enroll in the path that matches your level.",
    bodyAm: "ታትመው ያሉ ኮርሶችን ይመልከቱ እና ከደረጃዎ ጋር የሚስማማውን ይመዝገቡ።",
  },
  {
    n: "2",
    titleEn: "Learn with lessons and videos",
    titleAm: "በትምህርቶች እና ቪዲዮዎች ይማሩ",
    bodyEn: "Work through guided modules, lessons, and video content in English or Amharic.",
    bodyAm: "በተመሩ ሞጁሎች፣ ትምህርቶች እና የቪዲዮ ይዘት በእንግሊዝኛ ወይም በአማርኛ ይማሩ።",
  },
  {
    n: "3",
    titleEn: "Practice with quizzes and projects",
    titleAm: "በፈተናዎች እና ፕሮጀክቶች ይለማመዱ",
    bodyEn: "Check understanding with quizzes, then build a course project and submit it for review.",
    bodyAm: "በፈተናዎች ግንዛቤዎን ያረጋግጡ፣ ከዚያ የኮርስ ፕሮጀክት ይገንቡ እና ለግምገማ ያስገቡ።",
  },
  {
    n: "4",
    titleEn: "Earn a verifiable certificate",
    titleAm: "ሊረጋገጥ የሚችል ምስክር ወረቀት ያግኙ",
    bodyEn: "When lessons, quizzes, and your project meet the requirements, you can receive a certificate you can verify.",
    bodyAm: "ትምህርቶች፣ ፈተናዎች እና ፕሮጀክትዎ መስፈርቶችን ሲያሟሉ፣ ሊረጋገጥ የሚችል ምስክር ወረቀት ማግኘት ይችላሉ።",
  },
] as const;

const WHY_ITEMS = [
  {
    titleEn: "Guided, structured learning",
    titleAm: "የተመራ እና የተደራጀ ትምህርት",
    bodyEn: "Courses are organized into modules and lessons so you always know what comes next.",
    bodyAm: "ኮርሶች በሞጁሎች እና ትምህርቶች የተደራጁ ናቸው፣ ስለዚህ ቀጣዩ ምን እንደሆነ ሁልጊዜ ያውቃሉ።",
  },
  {
    titleEn: "English and Amharic support",
    titleAm: "የእንግሊዝኛ እና አማርኛ ድጋፍ",
    bodyEn: "Study in the language that works best for you. Switch the site language at any time.",
    bodyAm: "ለእርስዎ የሚሻለውን ቋንቋ ይጠቀሙ። የጣቢያውን ቋንቋ በማንኛውም ጊዜ ይቀይሩ።",
  },
  {
    titleEn: "Practical coding exercises",
    titleAm: "ተግባራዊ የኮድ ልምምዶች",
    bodyEn: "Lessons include practice work and quizzes so you apply concepts instead of only reading them.",
    bodyAm: "ትምህርቶች ልምምድ እና ፈተናዎችን ያካትታሉ፣ ስለዚህ ጽንሰ-ሐሳቦችን ብቻ ሳይሆን በተግባር ይተገብራሉ።",
  },
  {
    titleEn: "Project-based learning",
    titleAm: "በፕሮጀክት ላይ የተመሰረተ ትምህርት",
    bodyEn: "Each course ends with a project you submit for review against a clear brief and requirements.",
    bodyAm: "እያንዳንዱ ኮርስ በግልጽ አጭር መግለጫ እና መስፈርቶች ላይ ለግምገማ በሚያስገቡት ፕሮጀክት ያበቃል።",
  },
  {
    titleEn: "Progress you can track",
    titleAm: "መከታተል የሚችሉት ሂደት",
    bodyEn: "Your dashboard shows enrollment, lesson completion, quiz results, and project status.",
    bodyAm: "ዳሽቦርድዎ ምዝገባ፣ የትምህርት ማጠናቀቅ፣ የፈተና ውጤቶች እና የፕሮጀክት ሁኔታን ያሳያል።",
  },
  {
    titleEn: "Verifiable certificates",
    titleAm: "ሊረጋገጡ የሚችሉ ምስክር ወረቀቶች",
    bodyEn: "Certificates can be issued when you meet course requirements and verified publicly by ID.",
    bodyAm: "የኮርስ መስፈርቶችን ሲያሟሉ ምስክር ወረቀቶች ሊሰጡ እና በመለያ በይፋ ሊረጋገጡ ይችላሉ።",
  },
] as const;

const FAQ_ITEMS = [
  {
    qEn: "Who can use NextStep Coding?",
    qAm: "NextStep Codingን ማን መጠቀም ይችላል?",
    aEn: "Anyone interested in learning web development. Create a free account to enroll in published courses, track progress, and submit projects.",
    aAm: "የድረ-ገጽ ልማት ለመማር ፍላጎት ያለው ማንኛውም ሰው። በታተሙ ኮርሶች ለመመዝገብ፣ ሂደትን ለመከታተል እና ፕሮጀክቶችን ለማስገባት ነፃ መለያ ይክፈቱ።",
  },
  {
    qEn: "Can I learn in English or Amharic?",
    qAm: "በእንግሊዝኛ ወይም በአማርኛ መማር እችላለሁ?",
    aEn: "Yes. The site supports both languages. Use the EN / አማ switch in the header or footer. Course and lesson content is available in the language provided for each item.",
    aAm: "አዎ። ጣቢያው ሁለቱንም ቋንቋዎች ይደግፋል። በራስጌ ወይም በጫፍ ላይ ያለውን EN / አማ መቀያየሪያ ይጠቀሙ። የኮርስ እና ትምህርት ይዘት ለእያንዳንዱ ንጥል በቀረበው ቋንቋ ይገኛል።",
  },
  {
    qEn: "How do I start a course?",
    qAm: "ኮርስ እንዴት እጀምራለሁ?",
    aEn: "Open Courses, choose a published course, then log in or create an account to enroll. After enrollment you can open lessons from your dashboard or the course page.",
    aAm: "ኮርሶችን ይክፈቱ፣ የታተመ ኮርስ ይምረጡ፣ ከዚያ ለመመዝገብ ይግቡ ወይም መለያ ይክፈቱ። ከተመዘገቡ በኋላ ትምህርቶችን ከዳሽቦርድዎ ወይም ከኮርስ ገጽ መክፈት ይችላሉ።",
  },
  {
    qEn: "How do projects and certificates work?",
    qAm: "ፕሮጀክቶች እና ምስክር ወረቀቶች እንዴት ይሰራሉ?",
    aEn: "Complete the lessons and any required quizzes, then submit a public link to your project for review. When requirements are met, an administrator can issue a certificate. Anyone can verify a certificate by ID on the Verify page.",
    aAm: "ትምህርቶችን እና አስፈላጊ ፈተናዎችን ያጠናቅቁ፣ ከዚያ የፕሮጀክትዎን የህዝብ አገናኝ ለግምገማ ያስገቡ። መስፈርቶች ሲሟሉ አስተዳዳሪ ምስክር ወረቀት ሊሰጥ ይችላል። ማንኛውም ሰው ምስክር ወረቀት በመለያ በማረጋገጫ ገጽ ላይ ማረጋገጥ ይችላል።",
  },
  {
    qEn: "How do I contact the platform?",
    qAm: "ከመድረኩ ጋር እንዴት እገናኛለሁ?",
    aEn: "Use the contact email shown in the site footer when the school has configured it. You can also reach administrators through your account after signing in.",
    aAm: "ትምህርት ቤቱ ካዋቀረው በጣቢያው ጫፍ ላይ የሚታየውን የእውቂያ ኢሜይል ይጠቀሙ። ከገቡ በኋላ በመለያዎ በኩልም አስተዳዳሪዎችን ማግኘት ይችላሉ።",
  },
] as const;

export function HomePage({
  courses,
  videos,
  posts,
}: {
  courses: CourseCard[];
  videos: VideoItem[];
  posts: PostItem[];
}) {
  const { lang, t } = useI18n();
  const featured = courses.slice(0, 3);
  const projectCourses = courses.filter((c) => c.projectTitle || c.projectTitleAm).slice(0, 4);

  return (
    <div>
      {/* Hero — preserved branding, student image, and code-editor illustration */}
      <section className="mesh border-b border-line">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-accent">
              {t("English and Amharic", "እንግሊዝኛ እና አማርኛ")}
            </p>
            <h1 className="mt-3 max-w-xl font-display text-5xl leading-tight sm:text-6xl">
              {t("Your next step starts here.", "ቀጣይ እርምጃዎ ከዚህ ይጀምራል።")}
            </h1>
            <p className="mt-4 max-w-xl text-lg text-ink-soft">
              {t(
                "Learn web development through guided lessons, practice quizzes, and a project for each course. Study in English or Amharic, then verify what you finished.",
                "የድረ-ገጽ ልማትን በተመራ ትምህርቶች፣ በልምምድ ፈተናዎች እና በእያንዳንዱ ኮርስ ፕሮጀክት ይማሩ። በእንግሊዝኛ ወይም በአማርኛ ያጠኑ፣ ያጠናቀቁትንም ያረጋግጡ።",
              )}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/courses" className="btn btn-primary">
                {t("Explore courses", "ኮርሶችን ይመልከቱ")}
              </Link>
              <Link to="/videos" className="btn btn-secondary">
                {t("Watch videos", "ቪዲዮዎችን ይመልከቱ")}
              </Link>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-lg pb-8 sm:pb-10">
            <div className="overflow-hidden rounded-3xl">
              <img
                src="/images/hero-student.jpg"
                alt={t("A student learning web development", "የድር ገጽ ልማትን እየተማረ ያለ ተማሪ")}
                className="aspect-[4/3] w-full object-cover object-center"
              />
            </div>

            <div
              className="card relative mx-auto -mt-10 w-[92%] overflow-hidden shadow-xl sm:-mt-14"
              aria-hidden="true"
            >
              <div className="flex items-center gap-2 border-b border-line bg-ink px-4 py-3">
                <span className="size-2.5 rounded-full bg-accent" />
                <span className="size-2.5 rounded-full bg-warn" />
                <span className="size-2.5 rounded-full bg-ok" />
                <span className="ml-2 text-xs text-paper/70">index.html</span>
              </div>
              <pre className="overflow-x-auto bg-ink p-4 text-xs leading-6 text-paper sm:p-5 sm:text-sm sm:leading-7">
                <span className="text-accent-soft">{"<!DOCTYPE html>"}</span>
                {"\n"}
                <span className="text-accent">{"<html "}</span>
                <span className="text-ok">lang</span>
                <span className="text-paper">="en"</span>
                <span className="text-accent">{">"}</span>
                {"\n"}
                {"  "}
                <span className="text-accent">{"<h1>"}</span>
                Hello, NextStep
                <span className="text-accent">{"</h1>"}</span>
                {"\n"}
                <span className="text-accent">{"</html>"}</span>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-line bg-card">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-display text-3xl">
            {t("How it works", "እንዴት ይሰራል")}
          </h2>
          <p className="mt-2 max-w-2xl text-ink-soft">
            {t(
              "A clear path from your first lesson to a certificate you can verify.",
              "ከመጀመሪያ ትምህርትዎ እስከ ሊረጋገጥ የሚችል ምስክር ወረቀት ድረስ ግልጽ መንገድ።",
            )}
          </p>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_STEPS.map((step) => (
              <li key={step.n} className="card p-5">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-accent text-sm font-bold text-accent-ink">
                  {step.n}
                </span>
                <h3 className="mt-3 font-display text-xl">
                  {t(step.titleEn, step.titleAm)}
                </h3>
                <p className="mt-2 text-sm text-ink-soft">
                  {t(step.bodyEn, step.bodyAm)}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Why learn with NextStep */}
      <section className="border-y border-line bg-accent-soft/40">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-accent">
                {t("Why NextStep", "ለምን NextStep")}
              </p>
              <h2 className="mt-1 font-display text-3xl">
                {t("Why learn with NextStep?", "ከ NextStep ጋር ለምን ይማራሉ?")}
              </h2>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-ink-soft">
            {t(
              "Built for learners who want structure, bilingual support, and real practice—not empty marketing claims.",
              "መዋቅር፣ የሁለት ቋንቋ ድጋፍ እና እውነተኛ ልምምድ ለሚፈልጉ ተማሪዎች የተሰራ—ባዶ የግብይት ማስታወቂያዎች አይደለም።",
            )}
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {WHY_ITEMS.map((item, i) => (
              <div
                key={item.titleEn}
                className="card border-accent/20 bg-card p-5 shadow-sm transition hover:border-accent hover:shadow-md"
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-accent text-sm font-bold text-accent-ink">
                  {i + 1}
                </span>
                <h3 className="mt-3 font-display text-lg">
                  {t(item.titleEn, item.titleAm)}
                </h3>
                <p className="mt-2 text-sm text-ink-soft">
                  {t(item.bodyEn, item.bodyAm)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured courses */}
      {featured.length ? (
        <section className="border-y border-line bg-card">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <div className="mb-6 flex items-end justify-between gap-4">
              <h2 className="font-display text-3xl">
                {t("Featured courses", "የተመረጡ ኮርሶች")}
              </h2>
              <Link to="/courses" className="text-sm font-bold text-accent">
                {t("All courses", "ሁሉም ኮርሶች")}
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {featured.map((course) => (
                <CourseCardView key={course.id} course={course} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Learning path */}
      {courses.length ? (
        <section id="path" className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-display text-3xl">
            {t("A path you can follow", "መከተል የሚችሉት መንገድ")}
          </h2>
          <p className="mt-2 max-w-2xl text-ink-soft">
            {t(
              "Start with the published courses below. Each one ends with a project your work can be reviewed against.",
              "ከታች ካሉ ታትመው ያሉ ኮርሶች ይጀምሩ። እያንዳንዱ በፕሮጀክት ያበቃል፣ ስራዎም በዚያ መሰረት ሊገመገም ይችላል።",
            )}
          </p>
          <ol className="mt-6 grid gap-3">
            {courses.map((course, index) => (
              <li key={course.id}>
                <Link
                  to="/courses/$slug"
                  params={{ slug: course.slug }}
                  className="card flex items-center gap-4 p-4 hover:border-accent"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-accent-ink font-bold">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-xl">
                      {pick(lang, course.title, course.titleAm)}
                    </span>
                    <span className="text-sm text-muted">
                      {pick(lang, course.projectTitle, course.projectTitleAm) ||
                        t("Course project", "የኮርስ ፕሮጀክት")}
                      {course.level ? ` · ${course.level}` : null}
                      {course.language
                        ? ` · ${course.language === "am" ? "አማርኛ" : "English"}`
                        : null}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {/* Video learning */}
      {videos.length ? (
        <section className="border-y border-line bg-card">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <div className="mb-6 flex items-end justify-between gap-4">
              <h2 className="font-display text-3xl">
                {t("Learn through videos", "በቪዲዮ ይማሩ")}
              </h2>
              <Link to="/videos" className="text-sm font-bold text-accent">
                {t("Video library", "የቪዲዮ ቤተ-መጽሐፍት")}
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {videos.map((video) => (
                <Link
                  key={video.id}
                  to="/videos/$id"
                  params={{ id: video.id }}
                  className="card overflow-hidden"
                >
                  <img
                    src={video.thumbnailUrl || youtubeThumbnail(video.youtubeId)}
                    alt=""
                    className="aspect-video w-full object-cover"
                  />
                  <div className="p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted">
                      {video.language === "am" ? "አማርኛ" : "English"}
                    </p>
                    <h3 className="mt-1 font-display text-xl">{video.title}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Project-based learning */}
      {projectCourses.length ? (
        <section className="border-y border-line bg-gradient-to-br from-accent-soft/50 via-card to-paper">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <p className="text-xs font-bold uppercase tracking-wider text-accent">
              {t("Hands-on", "በተግባር")}
            </p>
            <h2 className="mt-1 font-display text-3xl">
              {t("Projects and practical learning", "ፕሮጀክቶች እና ተግባራዊ ትምህርት")}
            </h2>
            <p className="mt-3 max-w-2xl text-ink-soft">
              {t(
                "Apply what you learn by building a project for each course. Submit a public link for review when you are ready.",
                "ለእያንዳንዱ ኮርስ ፕሮጀክት በመገንባት የተማሩትን ይተግብሩ። ዝግጁ ሲሆኑ የህዝብ አገናኝ ለግምገማ ያስገቡ።",
              )}
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {projectCourses.map((course) => (
                <Link
                  key={course.id}
                  to="/courses/$slug"
                  params={{ slug: course.slug }}
                  className="card group border-accent/15 bg-card p-5 shadow-sm transition hover:border-accent hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-sm font-bold text-accent-ink">
                      ✦
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold uppercase tracking-wide text-accent">
                        {pick(lang, course.title, course.titleAm)}
                      </p>
                      <h3 className="mt-1 font-display text-xl group-hover:text-accent">
                        {pick(lang, course.projectTitle, course.projectTitleAm)}
                      </h3>
                      <p className="mt-2 text-sm text-ink-soft line-clamp-2">
                        {pick(lang, course.description, course.descriptionAm)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-8">
              <Link to="/courses" className="btn btn-primary">
                {t("Browse courses with projects", "ፕሮጀክት ያላቸውን ኮርሶች ይመልከቱ")}
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {/* Latest news */}
      {posts.length ? (
        <section className="border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <div className="mb-6 flex items-end justify-between gap-4">
              <h2 className="font-display text-3xl">
                {t("Latest news", "የቅርብ ዜና")}
              </h2>
              <Link to="/news" className="text-sm font-bold text-accent">
                {t("All posts", "ሁሉም ጽሁፎች")}
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  to="/news/$slug"
                  params={{ slug: post.slug }}
                  className="card p-4"
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-muted">
                    {formatWhen(post.publishedAt, lang)}
                  </p>
                  <h3 className="mt-2 font-display text-xl">{post.title}</h3>
                  <p className="mt-2 text-sm text-ink-soft">{post.summary}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* FAQ */}
      <section className="border-t border-line bg-card">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-display text-3xl">
            {t("Frequently asked questions", "በተደጋጋሚ የሚጠየቁ ጥያቄዎች")}
          </h2>
          <div className="mt-8 grid gap-4">
            {FAQ_ITEMS.map((item) => (
              <details key={item.qEn} className="card group open:border-accent">
                <summary className="cursor-pointer list-none px-5 py-4 font-display text-lg marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-3">
                    {t(item.qEn, item.qAm)}
                    <span
                      className="shrink-0 text-muted transition group-open:rotate-45"
                      aria-hidden
                    >
                      +
                    </span>
                  </span>
                </summary>
                <p className="border-t border-line px-5 py-4 text-sm text-ink-soft">
                  {t(item.aEn, item.aAm)}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final call to action */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="card bg-ink px-6 py-10 text-paper sm:px-10">
          <h2 className="font-display text-4xl">
            {t(
              "Ready to take the next step?",
              "ቀጣዩን እርምጃ ለመውሰድ ዝግጁ ነዎት?",
            )}
          </h2>
          <p className="mt-2 max-w-xl text-accent-soft">
            {t(
              "Create an account, enroll in a course, and keep your progress with you.",
              "መለያ ይክፈቱ፣ በኮርስ ይመዝገቡ፣ ሂደትዎም ከእርስዎ ጋር ይቆይ።",
            )}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/login"
              search={{ mode: "login", redirect: "/dashboard" }}
              className="btn btn-primary"
            >
              {t("Create an account", "መለያ ይክፈቱ")}
            </Link>
            <Link to="/courses" className="btn btn-secondary">
              {t("Explore courses", "ኮርሶችን ይመልከቱ")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
