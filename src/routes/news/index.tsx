import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Empty } from "@/components/site/ui";
import { useI18n } from "@/lib/i18n";
import { formatWhen } from "@/lib/text";
import { listPosts } from "@/server/api";

export const Route = createFileRoute("/news/")({
  loader: () => listPosts({ data: {} }),
  component: NewsPage,
});

function NewsPage() {
  const posts = Route.useLoaderData();
  const { lang, t } = useI18n();
  const [q, setQ] = useState("");
  const [language, setLanguage] = useState("all");
  const visible = posts.filter((post) => {
    if (language !== "all" && post.language !== language) return false;
    if (q && !`${post.title} ${post.summary}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-4xl">{t("News", "ዜና")}</h1>
      <p className="mt-2 text-ink-soft">{t("Announcements from NextStep Coding.", "ከNextStep Coding ማስታወቂያዎች።")}</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <label className="field"><span>{t("Search", "ፈልግ")}</span><input className="input" value={q} onChange={(event) => setQ(event.target.value)} /></label>
        <label className="field">
          <span>{t("Language", "ቋንቋ")}</span>
          <select className="select" value={language} onChange={(event) => setLanguage(event.target.value)}>
            <option value="all">{t("All", "ሁሉም")}</option>
            <option value="en">English</option>
            <option value="am">አማርኛ</option>
          </select>
        </label>
      </div>
      {visible.length ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {visible.map((post) => (
            <Link key={post.id} to="/news/$slug" params={{ slug: post.slug }} className="card p-5">
              {post.pinned ? <p className="text-xs font-bold uppercase tracking-wide text-accent">{t("Pinned", "የተሰካ")}</p> : null}
              <p className="text-xs font-bold uppercase tracking-wide text-muted">{formatWhen(post.publishedAt, lang)} · {post.category}</p>
              <h2 className="mt-2 font-display text-2xl">{post.title}</h2>
              <p className="mt-2 text-sm text-ink-soft">{post.summary}</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-6"><Empty title={t("No announcements yet", "ማስታወቂያ ገና የለም")} body={t("Published posts will appear here.", "የታተሙ ጽሁፎች እዚህ ይታያሉ።")} /></div>
      )}
    </div>
  );
}
