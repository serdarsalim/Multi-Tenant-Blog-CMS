// src/lib/youtube.ts
// A YouTube link alone in its paragraph becomes a click-to-play video. Until the
// reader clicks, the page shows only the thumbnail: no player, no YouTube scripts.
// A link inside a sentence stays a link.

const ID = /^[A-Za-z0-9_-]{11}$/;

/** Video id and start second from any common YouTube URL, or null. */
export function parseYouTube(raw: string): { id: string; start: number } | null {
  let url: URL;
  try { url = new URL(raw.replace(/&amp;/g, "&")); } catch { return null; }
  const host = url.hostname.replace(/^(www|m|music)\./, "");
  let id = "";
  if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const [, kind, value] = url.pathname.split("/");
    id = kind === "watch" ? url.searchParams.get("v") || "" : ["embed", "shorts", "live", "v"].includes(kind) ? value || "" : "";
  }
  if (!ID.test(id)) return null;
  return { id, start: seconds(url.searchParams.get("t") || url.searchParams.get("start") || "") };
}

/** "90", "90s", "1m30s", "1h2m3s" → seconds. */
function seconds(t: string): number {
  if (/^\d+s?$/.test(t)) return parseInt(t, 10);
  const m = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  return m ? (+(m[1] || 0)) * 3600 + (+(m[2] || 0)) * 60 + (+(m[3] || 0)) : 0;
}

const isUrl = (text: string) => /^https?:\/\//i.test(text.trim());

function embed(id: string, start: number, label: string): string {
  const watch = `https://www.youtube.com/watch?v=${id}${start ? `&amp;t=${start}s` : ""}`;
  const caption = label && !isUrl(label) ? label : "Watch on YouTube";
  return `<figure class="yt-embed">` +
    `<button type="button" class="yt-play" data-yt="${id}" data-start="${start}" aria-label="Play video">` +
    `<img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy" decoding="async">` +
    `<span class="yt-icon" aria-hidden="true"></span></button>` +
    `<figcaption><a href="${watch}" target="_blank" rel="noopener noreferrer">${caption}</a></figcaption></figure>`;
}

/** Replace each paragraph that holds nothing but one YouTube link. */
export function embedYouTube(html: string): string {
  return html.replace(
    /<p\b[^>]*>\s*(?:<a\b[^>]*\bhref="([^"]+)"[^>]*>([\s\S]*?)<\/a>|(https?:\/\/[^\s<]+))\s*(?:<br\s*\/?>\s*)?<\/p>/gi,
    (match, href: string | undefined, text: string | undefined, bare: string | undefined) => {
      const video = parseYouTube(href || bare || "");
      if (!video) return match;
      return embed(video.id, video.start, (text || "").replace(/<[^>]*>/g, "").trim());
    },
  );
}

/** Swap a clicked thumbnail for the player (reduced-cookie, same-channel suggestions). */
export function playYouTube(button: HTMLElement): void {
  const id = button.dataset.yt || "";
  if (!ID.test(id)) return;
  const start = parseInt(button.dataset.start || "0", 10) || 0;
  const frame = document.createElement("iframe");
  frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0${start ? `&start=${start}` : ""}`;
  frame.title = "YouTube video";
  frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
  frame.allowFullscreen = true;
  frame.className = "yt-frame";
  button.replaceWith(frame);
}
