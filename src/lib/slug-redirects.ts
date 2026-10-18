// src/lib/slug-redirects.ts
// Old post addresses keep working after a slug change. Each rename stores the
// previous slug; /posts/<old> then redirects to the post's current slug.
// Table: supabase/migrations/20261019000000_post_slug_redirects.sql. Until it
// has run, lookups miss and renames are not recorded; nothing else breaks.
import { getServiceRoleClient } from './supabase-admin';

const TABLE = 'post_slug_redirects';

export const POST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The post id an old slug points at, or null. */
export async function postIdForOldSlug(slug: string): Promise<string | null> {
  const { data, error } = await getServiceRoleClient()
    .from(TABLE)
    .select('post_id')
    .eq('old_slug', slug)
    .maybeSingle();
  if (error || !data) return null;
  return String(data.post_id);
}

/** The current slug for an old one, or null when the slug never moved. */
export async function currentSlugFor(oldSlug: string): Promise<string | null> {
  const postId = await postIdForOldSlug(oldSlug);
  if (!postId) return null;
  const { data } = await getServiceRoleClient()
    .from('posts')
    .select('slug')
    .eq('id', postId)
    .maybeSingle();
  return data?.slug && data.slug !== oldSlug ? String(data.slug) : null;
}

/** Record a rename. A slug that is live again stops redirecting. */
export async function rememberSlugChange(postId: string, oldSlug: string, newSlug: string): Promise<void> {
  if (!oldSlug || oldSlug === newSlug) return;
  const client = getServiceRoleClient();
  const { error } = await client
    .from(TABLE)
    .upsert({ old_slug: oldSlug, post_id: postId }, { onConflict: 'old_slug' });
  if (error) {
    console.warn(`Could not record the old slug "${oldSlug}"; run the post_slug_redirects migration:`, error.message);
    return;
  }
  await client.from(TABLE).delete().eq('old_slug', newSlug);
}
