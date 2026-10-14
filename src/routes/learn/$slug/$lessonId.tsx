import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RichText } from "@/components/content/rich";
import { Banner, Skeleton } from "@/components/site/ui";
import { useI18n } from "@/lib/i18n";
import type { LessonPayload } from "@/lib/learning-types";
import { parseResources } from "@/lib/resources";
import { pick } from "@/lib/text";
import { youtubeEmbed } from "@/lib/youtube";
import { completeLesson, getLesson, submitProject, submitQuiz } from "@/server/api";

export const Route = createFileRoute("/learn/$slug/$lessonId")({
  component: LearnPage,
});

function LearnPage() {
  const { slug, lessonId } = Route.useParams();
  const { lang, t } = useI18n();
  const [payload, setPayload] = useState<LessonPayload | null>(null);
  const [gate, setGate] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<number[]>([]);
  const [review, setReview] = useState<Array<{ id: string; correct: boolean; explanation: string; correctIndex: number }>>([]);
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    let live = true;
    setLoading(true);
    setReview([]);
    setNote("");
    void getLesson({ data: { slug, lessonId } })
      .then((result) => {
        if (!live) return;
        if (!result.ok) {
          setPayload(null);
          setGate(result.error);
          return;
        }
        setPayload(result.lesson);
        setGate("");
        setAnswers(result.lesson.questions.map(() => -1));
        setUrl(result.lesson.project.url);
        setDescription(result.lesson.project.description);
      })
      .catch(() => {
        if (live) setGate("error");
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [slug, lessonId]);

  async function refresh() {
    const result = await getLesson({ data: { slug, lessonId } });
    if (result.ok) setPayload(result.lesson);
  }

  if (loading) return <div className="mx-auto max-w-6xl px-4 py-10"><Skeleton className="h-80" /></div>;
  if (!payload) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="font-display text-3xl">
          {gate === "enroll" ? t("Enroll to open lessons", "ትምህርቶችን ለመክፈት ይመዝገቡ") : t("Lesson unavailable", "ትምህርቱ አይገኝም")}
        </h1>
        <Link to="/courses/$slug" params={{ slug }} className="btn btn-primary mt-4">{t("Back to course", "ወደ ኮርሱ")}</Link>
      </div>
    );
  }

  const lesson = payload.lesson;
  const resources = parseResources(lesson.resources);
  const exercises = lang === "am" && lesson.exercisesAm.length ? lesson.exercisesAm : lesson.exercises;
  const isLast = !payload.nextId;

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[16rem_1fr]">
      <aside className="card h-fit p-3 lg:sticky lg:top-24">
        <p className="px-2 text-xs font-bold uppercase tracking-wide text-muted">{pick(lang, payload.courseTitle, payload.courseTitleAm)}</p>
        <div className="mt-2 grid gap-3">
          {payload.modules.map((mod) => (
            <div key={mod.id}>
              <p className="px-2 text-sm font-bold">{pick(lang, mod.title, mod.titleAm)}</p>
              {mod.lessons.map((item) => (
                <Link
                  key={item.id}
                  to="/learn/$slug/$lessonId"
                  params={{ slug, lessonId: item.id }}
                  className={`block rounded-lg px-2 py-1.5 text-sm ${item.id === lesson.id ? "bg-accent-soft font-bold" : "hover:bg-paper"}`}
                >
                  {pick(lang, item.title, item.titleAm)}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </aside>
      <article className="grid gap-5">
        <header>
          <h1 className="font-display text-4xl">{pick(lang, lesson.title, lesson.titleAm)}</h1>
          <p className="text-sm text-muted">{lesson.durationMinutes} {t("min", "ደቂቃ")}</p>
        </header>
        {payload.video ? (
          <div className="card overflow-hidden">
            {payload.video.status !== "published" ? <p className="px-4 pt-3 text-xs font-bold text-warn">{t("Draft video", "ረቂቅ ቪዲዮ")}</p> : null}
            <iframe
              title={payload.video.title}
              src={youtubeEmbed(payload.video.youtubeId)}
              className="aspect-video w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : null}
        <RichText text={pick(lang, lesson.content, lesson.contentAm)} />
        {exercises.length ? (
          <section>
            <h2 className="font-display text-2xl">{t("Practice", "ልምምድ")}</h2>
            <ul className="mt-2 list-disc pl-5 text-ink-soft">{exercises.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
        ) : null}
        {resources.length ? (
          <section>
            <h2 className="font-display text-2xl">{t("Resources", "መርጃዎች")}</h2>
            <ul className="mt-2 grid gap-1">{resources.map((item) => <li key={item.href}><a className="font-semibold text-accent" href={item.href} target="_blank" rel="noreferrer">{item.label}</a></li>)}</ul>
          </section>
        ) : null}
        {payload.questions.length ? (
          <section className="card p-4">
            <h2 className="font-display text-2xl">{t("Quiz", "ፈተና")}</h2>
            <p className="text-sm text-muted">{t("Pass mark", "የማለፊያ ነጥብ")} {payload.minQuizScore}%</p>
            <div className="mt-3 grid gap-4">
              {payload.questions.map((question, index) => (
                <fieldset key={question.id}>
                  <legend className="font-semibold">{question.question}</legend>
                  <div className="mt-2 grid gap-1">
                    {question.options.map((option, optionIndex) => (
                      <label key={option} className="flex items-start gap-2 text-sm">
                        <input
                          type="radio"
                          name={question.id}
                          checked={answers[index] === optionIndex}
                          onChange={() => setAnswers((current) => current.map((value, i) => (i === index ? optionIndex : value)))}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                  {review.find((item) => item.id === question.id) ? (
                    <p className={`mt-1 text-sm ${review.find((item) => item.id === question.id)?.correct ? "text-ok" : "text-bad"}`}>
                      {review.find((item) => item.id === question.id)?.explanation}
                    </p>
                  ) : null}
                </fieldset>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-primary mt-4"
              onClick={() => {
                if (answers.some((answer) => answer < 0)) {
                  setError(t("Answer every question.", "ሁሉንም ጥያቄዎች ይመልሱ።"));
                  return;
                }
                void submitQuiz({ data: { lessonId: lesson.id, answers } }).then(async (result) => {
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  setReview(result.review);
                  setNote(result.passed ? t("Passed. Lesson marked complete.", "አልፈዋል። ትምህርቱ ተጠናቋል።") : t("Not passed yet. You can retry.", "ገና አላለፉም። እንደገና መሞከር ይችላሉ።"));
                  setError("");
                  await refresh();
                });
              }}
            >
              {t("Submit quiz", "ፈተናውን አስገባ")}
            </button>
            {payload.latestQuiz ? <p className="mt-2 text-sm text-muted">{t("Latest score", "የመጨረሻ ውጤት")} {payload.latestQuiz.score}%</p> : null}
          </section>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {!payload.completed ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                void completeLesson({ data: { lessonId: lesson.id } }).then(async (result) => {
                  if (!result.ok) setError(result.error);
                  else {
                    setNote(t("Lesson marked complete.", "ትምህርቱ እንደተጠናቀቀ ተመዝግቧል።"));
                    await refresh();
                  }
                });
              }}
            >
              {t("Mark complete", "እንደተጠናቀቀ ምልክት አድርግ")}
            </button>
          ) : (
            <Banner tone="ok">{t("Completed", "ተጠናቋል")}</Banner>
          )}
          {payload.prevId ? <Link className="btn btn-ghost" to="/learn/$slug/$lessonId" params={{ slug, lessonId: payload.prevId }}>{t("Previous", "ቀዳሚ")}</Link> : null}
          {payload.nextId ? <Link className="btn btn-primary" to="/learn/$slug/$lessonId" params={{ slug, lessonId: payload.nextId }}>{t("Next", "ቀጣይ")}</Link> : null}
        </div>
        {isLast ? (
          <section className="card p-4">
            <h2 className="font-display text-2xl">{t("Submit your project", "ፕሮጀክትዎን ያስገቡ")}</h2>
            <p className="mt-1 font-semibold">{pick(lang, payload.project.title, payload.project.titleAm)}</p>
            <p className="mt-2 text-sm text-ink-soft">{pick(lang, payload.project.brief, payload.project.briefAm)}</p>
            <ul className="mt-2 list-disc pl-5 text-sm">
              {(lang === "am" && payload.project.requirementsAm.length ? payload.project.requirementsAm : payload.project.requirements).map((item) => <li key={item}>{item}</li>)}
            </ul>
            {payload.project.status ? <p className="mt-3 text-sm font-bold">{t("Status", "ሁኔታ")}: {payload.project.status.replaceAll("_", " ")}</p> : null}
            {payload.project.feedback ? <p className="mt-2 text-sm">{payload.project.feedback}</p> : null}
            <div className="mt-3 grid gap-3">
              <label className="field"><span>{t("Public project URL", "የፕሮጀክት አድራሻ")}</span><input className="input" value={url} onChange={(event) => setUrl(event.target.value)} /></label>
              <label className="field"><span>{t("Notes for the reviewer", "ለገምጋሚው ማስታወሻ")}</span><textarea className="area" value={description} onChange={(event) => setDescription(event.target.value)} /></label>
              <button
                type="button"
                className="btn btn-primary"
                disabled={payload.project.status === "approved"}
                onClick={() => {
                  void submitProject({ data: { courseId: payload.courseId, url, description } }).then(async (result) => {
                    if (!result.ok) setError(result.error);
                    else {
                      setNote(t("Project submitted.", "ፕሮጀክቱ ገብቷል።"));
                      setError("");
                      await refresh();
                    }
                  });
                }}
              >
                {t("Submit project", "ፕሮጀክቱን አስገባ")}
              </button>
            </div>
          </section>
        ) : null}
        {note ? <Banner tone="ok">{note}</Banner> : null}
        {error ? <Banner tone="bad">{error}</Banner> : null}
      </article>
    </div>
  );
}
