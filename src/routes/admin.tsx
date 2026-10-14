import { createFileRoute } from "@tanstack/react-router";
import { AdminApp, type AdminTab } from "@/components/admin/admin-app";

const TABS = ["overview", "courses", "content", "posts", "videos", "projects", "certificates", "students", "settings"] as const;

export const Route = createFileRoute("/admin")({
  validateSearch: (search: Record<string, unknown>): { tab: AdminTab } => {
    const value = typeof search.tab === "string" ? search.tab : "overview";
    const tab = (TABS as readonly string[]).includes(value) ? (value as AdminTab) : "overview";
    return { tab };
  },
  component: function AdminRoute() {
    const { tab } = Route.useSearch();
    return <AdminApp tab={tab} />;
  },
});
