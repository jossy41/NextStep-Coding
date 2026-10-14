import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Empty } from "@/components/site/ui";
import { useI18n } from "@/lib/i18n";
import { listVideos } from "@/server/api";
import { youtubeThumbnail } from "@/lib/youtube";

export const Route = createFileRoute("/videos/")({
  loader: () => listVideos({ data: {} }),
  component: VideosPage,
});

function VideosPage() {
  const data = Route.useLoaderData();
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [language, setLanguage] = useState("all");
  const categories = useMemo(() => [...new Set(data.videos.map((video) => video.category))].sort(), [data.videos]);
  const videos = data.videos.filter((video) => {
    if (category !== "all" && video.category !== category) return false;
    if (language !== "all" && video.language !== language) return false;
    if (q && !`${video.title} ${video.description}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-4xl">{t("Videos", "ቪዲዮዎች")}</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">{t("Published lessons from YouTube. Drafts stay in the admin library.", "ከYouTube የታተሙ ትምህርቶች። ረቂቆች በአስተዳዳሪ ቤተ-መጽሐፍት ይቆያሉ።")}</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <label className="field"><span>{t("Search", "ፈልግ")}</span><input className="input" value={q} onChange={(event) => setQ(event.target.value)} /></label>
        <label className="field">
          <span>{t("Category", "ምድብ")}</span>
          <select className="select" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">{t("All", "ሁሉም")}</option>
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="field">
          <span>{t("Language", "ቋንቋ")}</span>
          <select className="select" value={language} onChange={(event) => setLanguage(event.target.value)}>
            <option value="all">{t("All", "ሁሉም")}</option>
            <option value="en">English</option>
            <option value="am">አማርኛ</option>
          </select>
        </label>
      </div>
      {videos.length ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <Link key={video.id} to="/videos/$id" params={{ id: video.id }} className="card overflow-hidden">
              <img src={video.thumbnailUrl || youtubeThumbnail(video.youtubeId)} alt="" className="aspect-video w-full object-cover" />
              <div className="p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-muted">{video.category}</p>
                <h2 className="mt-1 font-display text-xl">{video.title}</h2>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-6">
          <Empty title={t("No published videos yet", "የታተመ ቪዲዮ ገና የለም")} body={t("When an administrator publishes a YouTube lesson, it will show up here.", "አስተዳዳሪ የYouTube ትምህርት ሲያትም እዚህ ይታያል።")} />
        </div>
      )}
    </div>
  );
}
