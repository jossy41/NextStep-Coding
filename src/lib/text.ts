import type { Lang } from "@/lib/learning-types";

export function pick(lang: Lang, en: string, am: string): string {
  if (lang === "am" && am.trim()) return am;
  return en;
}

export function formatWhen(iso: string | null, lang: Lang): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(lang === "am" ? "am-ET" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
