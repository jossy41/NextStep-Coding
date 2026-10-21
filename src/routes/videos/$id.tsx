import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Banner, Skeleton } from "@/components/site/ui";
import { useI18n } from "@/lib/i18n";
import type { VideoItem } from "@/lib/learning-types";
import { youtubeEmbed } from "@/lib/youtube";
import { enroll, getVideo } from "@/server/api";

export const Route = createFileRoute("/videos/$id")({
  component: VideoPage,
});

function VideoPage() {
  const { id } = Route.useParams();
  const { t } = useI18n();
  const [video, setVideo] = useState<VideoItem | null>(null);
  const [missing, setMissing] = useState(false);
  const [gate, setGate] = useState<"auth" | "enroll" | "">("");
  const [courseId, setCourseId] = useState("");
  const [courseSlug, setCourseSlug] = useState("");
  const [courseTitle, setCourseTitle] = useState("");
  const [error, setError] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let live = true;
    setVideo(null);
    setMissing(false);
    setGate("");
    void getVideo({ data: { id } }).then((result) => {
      if (!live) return;
      if (!result.ok) {
        if (result.error === "auth" || result.error === "enroll") {
          setGate(result.error);
          setCourseId(result.courseId ?? "");
          setCourseSlug(result.courseSlug ?? "");
          setCourseTitle(result.courseTitle ?? "");
          return;
        }
        setMissing(true);
        return;
      }
      if (!result.video.youtubeId) {
        setMissing(true);
        return;
      }
      setVideo(result.video);
    });
    return () => {
      live = false;
    };
  }, [id, reload]);

  async function onEnroll() {
    if (!courseId) return;
    setEnrolling(true);
    setError("");
    try {
      const result = await enroll({ data: { courseId } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setReload((value) => value + 1);
    } finally {
      setEnrolling(false);
    }
  }

  if (missing) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="font-display text-3xl">{t("Video not found", "ቪዲዮው አልተገኘም")}</h1>
        <Link to="/videos" className="btn btn-primary mt-4">{t("Back to videos", "ወደ ቪዲዮዎች")}</Link>
      </div>
    );
  }
  if (gate) {
    const back = `/videos/${id}`;
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="font-display text-3xl">
          {gate === "auth"
            ? t("Sign in to watch this video", "ይህን ቪዲዮ ለመመልከት ይግቡ")
            : t("Enroll to watch this video", "ይህን ቪዲዮ ለመመልከት ይመዝገቡ")}
        </h1>
        <p className="mt-3 text-ink-soft">
          {courseTitle
            ? t(
                `This video is part of ${courseTitle}. Register or sign in, then enroll in that course. Another course does not unlock it.`,
                `ይህ ቪዲዮ የ${courseTitle} አካል ነው። ይመዝገቡ ወይም ይግቡ፣ ከዚያ በዚያ ኮርስ ይመዝገቡ። ሌላ ኮርስ አይከፍተውም።`,
              )
            : t(
                "This course video stays locked until you register, sign in, and enroll in that specific course.",
                "ይህ የኮርስ ቪዲዮ እስኪመዘገቡ፣ እስኪገቡ እና በዚያ ኮርስ እስኪመዘገቡ ድረስ ተቆልፎ ይቆያል።",
              )}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {gate === "auth" ? (
            <>
              <Link to="/login" search={{ mode: "register", redirect: back }} className="btn btn-primary">
                {t("Create an account", "መለያ ይክፈቱ")}
              </Link>
              <Link to="/login" search={{ mode: "login", redirect: back }} className="btn btn-secondary">
                {t("Sign in", "ይግቡ")}
              </Link>
            </>
          ) : (
            <button type="button" className="btn btn-primary" disabled={enrolling || !courseId} onClick={() => void onEnroll()}>
              {t("Enroll in this course", "በዚህ ኮርስ ይመዝገቡ")}
            </button>
          )}
          {courseSlug ? (
            <Link to="/courses/$slug" params={{ slug: courseSlug }} className="btn btn-ghost">
              {t("View course", "ኮርሱን ይመልከቱ")}
            </Link>
          ) : (
            <Link to="/videos" className="btn btn-ghost">{t("Back to videos", "ወደ ቪዲዮዎች")}</Link>
          )}
        </div>
        {error ? <p className="mt-4"><Banner tone="bad">{error}</Banner></p> : null}
      </div>
    );
  }
  if (!video?.youtubeId) return <div className="mx-auto max-w-4xl px-4 py-10"><Skeleton className="aspect-video" /></div>;
  return (
    <article className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-xs font-bold uppercase tracking-wide text-muted">{video.category} · {video.language === "am" ? "አማርኛ" : "English"}</p>
      <h1 className="mt-2 font-display text-4xl">{video.title}</h1>
      {video.status !== "published" ? <p className="mt-3"><Banner tone="warn">{t("Draft preview", "የረቂቅ ቅድመ እይታ")}</Banner></p> : null}
      <div className="card mt-4 overflow-hidden">
        <iframe title={video.title} src={youtubeEmbed(video.youtubeId)} className="aspect-video w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
      </div>
      {video.description ? <p className="mt-4 whitespace-pre-wrap text-ink-soft">{video.description}</p> : null}
    </article>
  );
}
