import { createFileRoute, redirect } from "@tanstack/react-router";
import { getCourse } from "@/server/api";

export const Route = createFileRoute("/learn/$slug/")({
  loader: async ({ params }) => {
    const course = await getCourse({ data: { slug: params.slug } });
    if ("ok" in course && course.ok === false) return;
    if (!("modules" in course)) return;
    const first = course.modules[0]?.lessons[0]?.id;
    if (first) {
      throw redirect({ to: "/learn/$slug/$lessonId", params: { slug: params.slug, lessonId: first } });
    }
  },
  component: function EmptyLearn() {
    return <p className="px-4 py-16 text-center text-muted">This course has no lessons yet.</p>;
  },
});
