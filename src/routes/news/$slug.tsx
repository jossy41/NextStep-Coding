import { createFileRoute, Link } from "@tanstack/react-router";
import { RichText } from "@/components/content/rich";
import { useI18n } from "@/lib/i18n";
import { formatWhen } from "@/lib/text";
import { getPost } from "@/server/api";

export const Route = createFileRoute("/news/$slug")({
  loader: ({ params }) => getPost({ data: { slug: params.slug } }),
  component: PostPage,
});

function PostPage() {
  const result = Route.useLoaderData();
  const { lang, t } = useI18n();
  if (!result.ok) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="font-display text-3xl">{t("Post not found", "ጽሁፉ አልተገኘም")}</h1>
        <Link to="/news" className="btn btn-primary mt-4">{t("Back to news", "ወደ ዜና")}</Link>
      </div>
    );
  }
  const post = result.post;
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-xs font-bold uppercase tracking-wide text-muted">{formatWhen(post.publishedAt, lang)} · {post.category}</p>
      <h1 className="mt-2 font-display text-4xl">{post.title}</h1>
      {post.summary ? <p className="mt-3 text-lg text-ink-soft">{post.summary}</p> : null}
      {post.coverUrl ? <img src={post.coverUrl} alt="" className="mt-5 max-h-80 w-full rounded-2xl object-cover" /> : null}
      <div className="mt-6"><RichText text={post.body} /></div>
    </article>
  );
}
