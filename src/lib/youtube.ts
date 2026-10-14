const YOUTUBE_ID = /^[a-zA-Z0-9_-]{11}$/;

/** Extract a YouTube video id from a raw id or a common watch / share / shorts URL. */
export function parseYouTubeId(input: string): string | null {
  const raw = input.trim();
  if (!raw || raw.length > 400) return null;
  if (YOUTUBE_ID.test(raw)) return raw;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    return YOUTUBE_ID.test(id) ? id : null;
  }

  const youtubeHosts = new Set([
    "youtube.com",
    "m.youtube.com",
    "music.youtube.com",
    "youtube-nocookie.com",
  ]);
  if (!youtubeHosts.has(host)) return null;

  if (url.pathname === "/watch") {
    const id = url.searchParams.get("v") ?? "";
    return YOUTUBE_ID.test(id) ? id : null;
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (
    parts[0] === "shorts" ||
    parts[0] === "embed" ||
    parts[0] === "live" ||
    parts[0] === "v"
  ) {
    const id = parts[1] ?? "";
    return YOUTUBE_ID.test(id) ? id : null;
  }
  return null;
}

export function youtubeThumbnail(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export function youtubeEmbed(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}`;
}
