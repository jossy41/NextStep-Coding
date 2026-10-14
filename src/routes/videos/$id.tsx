import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Banner, Skeleton } from "@/components/site/ui";
import { useI18n } from "@/lib/i18n";
import type { VideoItem } from "@/lib/learning-types";
import { youtubeEmbed } from "@/lib/youtube";
import { getVideo } from "@/server/api";

export const Route = createFileRoute("/videos/$id")({
  component: VideoPage,
});

function VideoPage() {
  const { id } = Route.useParams();
  const { t } = useI18n();
  const [video, setVideo] = useState<VideoItem | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let live = true;
    void getVideo({ data: { id } }).then((result) => {
      if (!live) return;
      if (!result.ok) setMissing(true);
      else setVideo(result.video);
    });
    return () => {
      live = false;
    };
  }, [id]);
  if (missing) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="font-display text-3xl">{t("Video not found", "ቪዲዮው አልተገኘም")}</h1>
        <Link to="/videos" className="btn btn-primary mt-4">{t("Back to videos", "ወደ ቪዲዮዎች")}</Link>
      </div>
    );
  }
  if (!video) return <div className="mx-auto max-w-4xl px-4 py-10"><Skeleton className="aspect-video" /></div>;
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
