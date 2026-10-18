// src/lib/publish.ts
// Shared logic behind /api/publish: validation, slugging, upsert, revalidation.
import { revalidatePath, revalidateTag } from 'next/cache';
import { getServiceRoleClient } from './supabase-admin';
import { POST_ID_PATTERN, postIdForOldSlug } from './slug-redirects';

export const SITE_URL = 'https://blog.serdarsalim.com';
export const AUTHOR = { name: 'Serdar Salim', handle: 'slm' };

export type PostType = 'article' | 'link';

export type PublishInput = {
  id?: string;
  slug?: string;
  title: string;
  html: string;
  excerpt?: string;
  categories?: string[] | string;
  featuredImage?: string;
  post_type?: PostType;
  source_url?: string;
  published?: boolean;
  featured?: boolean;
  date?: string;
  comment?: boolean;
  socmed?: boolean;
};

export class PublishError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

export function normalizeCategories(input: unknown): string[] {
  const list = Array.isArray(input)
    ? input
    : typeof input === 'string'
      ? input.split(',')
      : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    if (typeof raw !== 'string') continue;
    const value = raw.trim();
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

const ENTITIES: Record<string, string> = { '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&#39;': "'", '&lt;': '<', '&gt;': '>' };

function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:nbsp|amp|quot|#39|lt|gt);/g, (entity) => ENTITIES[entity])
    .replace(/\s+/g, ' ')
    .trim();
}

// Paragraphs that carry the article's own words. Headings never count, and a
// paragraph with no text outside italics and links is a caption, location
// line, photo credit or image, so it is skipped too.
function proseParagraphs(html: string): string[] {
  const prose: string[] = [];
  for (const [, inner] of html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const ownWords = plainText(inner.replace(/<(em|i|a)\b[^>]*>[\s\S]*?<\/\1>/gi, ' '));
    if (/\p{L}/u.test(ownWords)) prose.push(plainText(inner));
  }
  return prose;
}

export function autoExcerpt(html: string, max = 200): string {
  const prose = proseParagraphs(html);
  const text = prose.length ? prose.join(' ') : plainText(html);
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' ') > 80 ? cut.lastIndexOf(' ') : max).trim()}…`;
}

export function validatePublishInput(body: unknown): Required<Pick<PublishInput, 'title' | 'html'>> & PublishInput {
  if (!body || typeof body !== 'object') throw new PublishError('Body must be a JSON object');
  const b = body as Record<string, unknown>;

  const title = typeof b.title === 'string' ? b.title.trim() : '';
  if (!title) throw new PublishError('title is required');
  if (title.length > 200) throw new PublishError('title must be 200 characters or fewer');

  const html = typeof b.html === 'string' ? b.html : typeof b.content === 'string' ? b.content : '';
  const post_type: PostType = b.post_type === 'link' ? 'link' : 'article';

  const source_url = typeof b.source_url === 'string' ? b.source_url.trim() : '';
  if (post_type === 'link') {
    if (!source_url) throw new PublishError('source_url is required for a link post');
    if (!isHttpUrl(source_url)) throw new PublishError('source_url must be an http(s) URL');
  } else if (source_url && !isHttpUrl(source_url)) {
    throw new PublishError('source_url must be an http(s) URL');
  }
  if (!html.trim() && post_type === 'article') throw new PublishError('html is required for an article');

  const id = typeof b.id === 'string' ? b.id.trim() : undefined;
  if (b.id !== undefined && b.id !== null && !(id && POST_ID_PATTERN.test(id))) throw new PublishError('id must be a post id');

  const slug = typeof b.slug === 'string' && b.slug.trim() ? slugify(b.slug) : undefined;
  if (typeof b.slug === 'string' && b.slug.trim() && !slug) throw new PublishError('slug has no usable characters');

  if (b.featuredImage !== undefined && typeof b.featuredImage !== 'string') throw new PublishError('featuredImage must be a URL or an empty string');
  const featuredImage = typeof b.featuredImage === 'string' ? b.featuredImage.trim() : undefined;
  if (featuredImage && !isHttpUrl(featuredImage)) throw new PublishError('featuredImage must be an http(s) URL');

  let date: string | undefined;
  if (b.date !== undefined && b.date !== null) {
    const parsed = new Date(String(b.date));
    if (Number.isNaN(parsed.getTime())) throw new PublishError('date is not a valid date');
    date = parsed.toISOString();
  }

  return {
    id: id || undefined,
    slug,
    title,
    html,
    excerpt: typeof b.excerpt === 'string' ? b.excerpt.trim() : undefined,
    categories: b.categories === undefined ? undefined : normalizeCategories(b.categories),
    featuredImage,
    post_type,
    source_url: source_url || undefined,
    published: b.published === undefined ? true : Boolean(b.published),
    featured: b.featured === undefined ? undefined : Boolean(b.featured),
    comment: b.comment === undefined ? undefined : Boolean(b.comment),
    socmed: b.socmed === undefined ? undefined : Boolean(b.socmed),
    date,
  };
}

// The post_type / source_url columns arrive with supabase/migrations/20261010120000_post_type.sql.
// Until that has run, publish still works for articles; link posts are refused with a clear message.
let linkColumnsPresent: boolean | null = null;
export async function hasLinkColumns(): Promise<boolean> {
  if (linkColumnsPresent !== null) return linkColumnsPresent;
  const { error } = await getServiceRoleClient().from('posts').select('post_type, source_url').limit(1);
  linkColumnsPresent = !error;
  if (error) console.warn('posts.post_type/source_url missing; run the post_type migration:', error.message);
  return linkColumnsPresent;
}

let authorId: string | null | undefined;
async function getAuthorId(): Promise<string | null> {
  if (authorId !== undefined) return authorId;
  const { data } = await getServiceRoleClient()
    .from('authors')
    .select('id')
    .eq('handle', AUTHOR.handle)
    .maybeSingle();
  authorId = data?.id ?? null;
  return authorId;
}

export function revalidatePost(slug: string) {
  revalidateTag('posts');
  revalidatePath('/', 'page');
  revalidatePath('/blog', 'page');
  revalidatePath(`/posts/${slug}`, 'page');
  revalidatePath(`/posts/${slug}/opengraph-image`);
  revalidatePath(`/posts/${slug}/twitter-image`);
  revalidatePath('/sitemap.xml');
  revalidatePath('/feed.xml');
}

export type PublishResult = {
  id: string;
  slug: string;
  url: string;
  published: boolean;
  post_type: PostType;
  created: boolean;
};

export async function upsertPost(input: ReturnType<typeof validatePublishInput>): Promise<PublishResult> {
  const client = getServiceRoleClient();
  const requestedSlug = input.slug || slugify(input.title);
  if (!requestedSlug) throw new PublishError('Could not derive a slug from the title');

  const linkColumns = await hasLinkColumns();
  if (input.post_type === 'link' && !linkColumns) {
    throw new PublishError('Link posts need the post_type migration (supabase/migrations/20261010120000_post_type.sql)', 503);
  }

  // Update the caller's post when it names one, so a slug renamed on the blog
  // never spawns a second copy. A stale slug that redirects counts as well.
  const fields = 'id, slug, date, excerpt, content';
  const findBy = async (column: 'id' | 'slug', value: string) => {
    const { data, error } = await client.from('posts').select(fields).eq(column, value).maybeSingle();
    if (error) throw new PublishError(`Lookup failed: ${error.message}`, 500);
    return data;
  };
  let existing = input.id ? await findBy('id', input.id) : null;
  if (!existing) existing = await findBy('slug', requestedSlug);
  if (!existing) {
    const movedTo = await postIdForOldSlug(requestedSlug);
    if (movedTo) existing = await findBy('id', movedTo);
  }
  // The blog owns the address once a post exists.
  const slug: string = existing?.slug || requestedSlug;

  const now = new Date().toISOString();
  const record: Record<string, unknown> = {
    slug,
    title: input.title,
    content: input.html,
    // A rewritten article needs a summary of its current content. Preserve a
    // custom summary on metadata-only updates; callers can still supply one.
    excerpt: input.excerpt ?? (existing?.content === input.html && existing.excerpt
      ? existing.excerpt : autoExcerpt(input.html)),
    published: input.published,
    author: AUTHOR.name,
    author_handle: AUTHOR.handle,
    updated_at: now,
  };
  const id = await getAuthorId();
  if (id) record.author_id = id;
  // Fields left out of a re-publish keep their stored value.
  if (input.categories !== undefined) record.categories = input.categories;
  if (input.featuredImage !== undefined) record.featuredImage = input.featuredImage;
  if (input.featured !== undefined) record.featured = input.featured;
  if (input.comment !== undefined) record.comment = input.comment;
  if (input.socmed !== undefined) record.socmed = input.socmed;
  if (input.date) record.date = input.date;
  if (linkColumns) {
    record.post_type = input.post_type;
    record.source_url = input.source_url ?? null;
  }

  let result: { id: string } | null = null;
  if (existing) {
    const { data, error } = await client
      .from('posts')
      .update(record)
      .eq('id', existing.id)
      .select('id')
      .single();
    if (error) throw new PublishError(`Update failed: ${error.message}`, 500);
    result = data;
  } else {
    const insert = {
      categories: [] as string[],
      featuredImage: '',
      ...record,
      date: input.date ?? now,
      featured: input.featured ?? false,
      comment: input.comment ?? true,
      socmed: input.socmed ?? true,
      created_at: now,
    };
    const { data, error } = await client.from('posts').insert(insert).select('id').single();
    if (error) throw new PublishError(`Insert failed: ${error.message}`, 500);
    result = data;
  }

  revalidatePost(slug);

  return {
    id: result!.id,
    slug,
    url: `${SITE_URL}/posts/${slug}`,
    published: input.published ?? true,
    post_type: input.post_type ?? 'article',
    created: !existing,
  };
}
