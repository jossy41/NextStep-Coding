import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { I18nProvider } from "@/lib/i18n";
import { SiteShell } from "@/components/site/shell";
import { bootCatalog } from "@/server/api";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  beforeLoad: async () => {
    await bootCatalog();
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "NextStep Coding — Your Next Step Starts Here" },
      {
        name: "description",
        content:
          "Learn web development through guided lessons, quizzes, and practical projects. Study in English or Amharic and build your coding skills with NextStep Coding.",
      },
      { name: "theme-color", content: "#122033" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "canonical", href: "https://next-step-coding.vercel.app/" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,560;9..144,640&family=Noto+Sans+Ethiopic:wght@400;600;700&family=Source+Sans+3:wght@400;600;700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
});

function RootComponent() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <AuthProvider>
          <I18nProvider>
            <SiteShell>
              <Outlet />
            </SiteShell>
          </I18nProvider>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}

function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="font-display text-4xl">Page not found</h1>
      <p className="mt-2 text-ink-soft">That address is not part of NextStep Coding.</p>
    </div>
  );
}
