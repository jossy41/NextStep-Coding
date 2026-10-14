export function parseResources(text: string): Array<{ label: string; href: string }> {
  const items: Array<{ label: string; href: string }> = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split("|").map((part) => part.trim());
    const href = parts.length > 1 ? parts[1] ?? "" : parts[0] ?? "";
    const label = parts.length > 1 ? parts[0] ?? href : href;
    try {
      const url = new URL(href);
      if (url.protocol === "https:" || url.protocol === "http:") {
        items.push({ label: label || url.toString(), href: url.toString() });
      }
    } catch {
      continue;
    }
  }
  return items;
}
