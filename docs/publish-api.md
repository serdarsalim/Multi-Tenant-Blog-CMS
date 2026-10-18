# Publish API (for Mana's Publisher)

Base URL: `https://blog.serdarsalim.com`. Every route needs `Authorization: Bearer <MANA_PUBLISH_TOKEN>`. The token is an env var on Vercel; the same value goes in Publisher settings. An unset token closes the API (401 with a message saying so).

Posts are stored as HTML. Publisher converts markdown to HTML before calling.

## POST /api/publish

Create or update a post. Send the post's `id` once you have one: the update then lands on that post even if its slug was renamed on the blog. Without `id`, the key is `slug` (omit it and the title is slugified), and a slug that was renamed away still finds its post. Once a post exists the blog owns its slug; the response always returns the current one, so callers should store it.

```json
{
  "id": "optional post id from an earlier response",
  "slug": "optional-explicit-slug",
  "title": "Required",
  "html": "<p>Required for articles. Serdar's take for link posts.</p>",
  "excerpt": "Optional. Derived from html when missing on new or rewritten content.",
  "categories": ["Automation", "Personal growth"],
  "featuredImage": "https://.../cover.webp",
  "post_type": "article",
  "source_url": "https://... (required when post_type is link)",
  "published": true,
  "featured": false,
  "date": "2026-10-10T08:00:00Z"
}
```

- `published` defaults to true. Send false to stage a draft on the blog.
- `date` is only needed to backdate; on update it is unchanged unless sent.
- Fields left out of an update keep their stored value (`categories`, `featuredImage`, `featured`).
- When `html` changes, omitting `excerpt` regenerates the summary from the new content. Send `excerpt` to override it. An unchanged body keeps its stored summary.
- Generated summaries read body paragraphs only: headings, images, and paragraphs that are all italics or links (captions, locations, photo credits) are skipped.
- `featuredImage` is separate from body images. Send an empty string to clear it; omit it to preserve it.
- Responses: `201` created, `200` updated, `400` validation (`{error}`), `401` token, `503` link post before the migration.

```json
{ "id": "uuid", "slug": "the-slug", "url": "https://blog.serdarsalim.com/posts/the-slug", "published": true, "post_type": "article", "created": true }
```

The route invalidates the `posts` data tag and revalidates `/`, `/blog`, `/posts/<slug>`, its social images, `/sitemap.xml` and `/feed.xml`. Public Supabase reads use the same tag; management reads bypass the data cache. Route regeneration happens on the next request, so an already-open browser page still needs a refresh. `/api/latest-posts` (what serdarsalim.com reads) refreshes within 60 seconds.

## GET /api/publish?limit=50

Inventory: `{ posts: [{id, slug, title, excerpt, date, categories, featuredImage, published, featured, updated_at, post_type, source_url, url}], migration_applied: bool }`.

## GET /api/publish/:slugOrId

Full row including `content` (HTML), plus `url`. Accepts the slug or the post id. 404 if unknown.

## DELETE /api/publish/:slugOrId

Unpublishes (row stays, `published=false`). `?permanent=1` deletes the row. Both revalidate.

## POST /api/publish/image

Two ways in:

- Raw bytes: `Content-Type: image/webp` (jpeg, png, webp, gif, avif, svg), body is the file, optional `X-Filename: cover.webp` or `?name=cover.webp`.
- Multipart: field `file`.

Max 10MB. Stored at Supabase Storage `images/slm/<timestamp>-<name>`. Response `201 { url, path, bytes }`. Put `url` in `featuredImage` or in an `<img>` inside `html`.

## Link posts

`post_type: "link"` + `source_url`. The blog renders Serdar's take (`html`) and a "Read the original" card with the source's domain. The migration `supabase/migrations/20261010120000_post_type.sql` must have run once (Supabase SQL editor); until then link posts return 503 and articles work as before.

## curl smoke test

```bash
curl -s -X POST https://blog.serdarsalim.com/api/publish \
  -H "Authorization: Bearer $MANA_PUBLISH_TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"Test from Mana","html":"<p>Hello</p>","published":false}'
```

Then `DELETE /api/publish/test-from-mana?permanent=1`.

## Regression checks

`npx ts-node --compiler-options '{"module":"CommonJS","moduleResolution":"node"}' tests/publishing.ts` verifies cache tags, uncached management reads and cover validation with mocked requests.

## YouTube videos

A paragraph holding nothing but one YouTube link (watch, youtu.be, Shorts, live) renders as a click-to-play video: the thumbnail and a play button until clicked, then the reduced-cookie player with same-channel suggestions. A `t=` on the link becomes the start time. A link inside a sentence stays a link. Rendering only (`src/lib/youtube.ts`); the stored HTML keeps the plain link.

## Renamed slugs

Renaming a slug in the admin editor records the old one (`post_slug_redirects`, migration `supabase/migrations/20261019000000_post_slug_redirects.sql`, run once in the SQL editor). `/posts/<old>` then answers with a permanent redirect to the current address. Saving rewritten content in the admin editor regenerates the summary unless the summary field itself was changed.
