// src/app/api/publish/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedPublisher, unauthorized } from '@/lib/publish-auth';
import { SITE_URL, revalidatePost } from '@/lib/publish';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { POST_ID_PATTERN } from '@/lib/slug-redirects';

export const dynamic = 'force-dynamic';

type Params = { params: { slug: string } };

// The segment is a slug or a post id; the Publisher uses ids so renames on the
// blog don't strand its copy.
const keyColumn = (key: string) => (POST_ID_PATTERN.test(key) ? 'id' : 'slug');

export async function GET(request: NextRequest, { params }: Params) {
  if (!isAuthorizedPublisher(request)) return unauthorized();

  const { data, error } = await getServiceRoleClient()
    .from('posts')
    .select('*')
    .eq(keyColumn(params.slug), params.slug)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ post: { ...data, url: `${SITE_URL}/posts/${data.slug}` } });
}

// Unpublish by default. ?permanent=1 deletes the row (for test posts).
export async function DELETE(request: NextRequest, { params }: Params) {
  if (!isAuthorizedPublisher(request)) return unauthorized();

  const client = getServiceRoleClient();
  const permanent = request.nextUrl.searchParams.get('permanent') === '1';

  const { data: existing } = await client
    .from('posts')
    .select('id, slug')
    .eq(keyColumn(params.slug), params.slug)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { error } = permanent
    ? await client.from('posts').delete().eq('id', existing.id)
    : await client
        .from('posts')
        .update({ published: false, updated_at: new Date().toISOString() })
        .eq('id', existing.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePost(existing.slug);
  return NextResponse.json({ slug: existing.slug, published: false, deleted: permanent });
}
