import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/components/home/home-page";
import { getHomeFeed } from "@/server/api";

export const Route = createFileRoute("/")({
  loader: () => getHomeFeed(),
  component: function Index() {
    const data = Route.useLoaderData();
    return <HomePage courses={data.courses} videos={data.videos} posts={data.posts} />;
  },
});
