import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions, getServiceRoleClient } from '@/lib/auth-config';
import { autoExcerpt } from '@/lib/publish';
import { rememberSlugChange } from '@/lib/slug-redirects';

function normalizeCategories(input: unknown): string[] | undefined {
  if (input === undefined) return undefined;

  if (Array.isArray(input)) {
    return input
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
  }

  if (typeof input === 'string') {
    return input
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

async function ensureAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const client = getServiceRoleClient();
  const { data: author } = await client
    .from('authors')
    .select('id, role')
    .eq('email', session.user.email)
    .maybeSingle();

  if (!author || author.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { author };
}

async function triggerRevalidation(...slugs: (string | undefined)[]) {
  try {
    revalidateTag('posts');
    revalidatePath('/', 'page');
    revalidatePath('/blog', 'page');
    for (const slug of new Set(slugs.filter(Boolean))) {
      revalidatePath(`/posts/${slug}`, 'page');
    }
  } catch (error) {
    console.error('Error triggering revalidation:', error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const adminCheck = await ensureAdmin();
  if ('error' in adminCheck) return adminCheck.error;

  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    const fields = [
      'title',
      'slug',
      'content',
      'excerpt',
      'date',
      'featured',
      'author',
      'author_handle',
      'featuredImage',
      'comment',
      'socmed',
      'published',
    ] as const;

    fields.forEach((field) => {
      if (field in body) {
        updates[field] = body[field];
      }
    });

    const categories = normalizeCategories(body.categories);
    if (categories !== undefined) {
      updates.categories = categories;
    }

    const client = getServiceRoleClient();
    const { data: before } = await client
      .from('posts')
      .select('slug, content, excerpt')
      .eq('id', id)
      .maybeSingle();

    // Rewritten content gets a fresh summary unless the summary itself was edited.
    const contentChanged = typeof updates.content === 'string' && updates.content !== before?.content;
    const excerptEdited = 'excerpt' in updates && updates.excerpt !== before?.excerpt;
    if (contentChanged && !excerptEdited) {
      updates.excerpt = autoExcerpt(updates.content as string);
    }

    const { data, error } = await client
      .from('posts')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error || !data) {
      console.error('Failed to update post:', error);
      return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
    }

    if (before?.slug && before.slug !== data.slug) {
      await rememberSlugChange(id, before.slug, data.slug);
    }
    await triggerRevalidation(data.slug, before?.slug);

    return NextResponse.json({ post: data });
  } catch (error) {
    console.error('Unexpected error updating post:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const adminCheck = await ensureAdmin();
  if ('error' in adminCheck) return adminCheck.error;

  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
  }

  const { data: existing, error: fetchError } = await getServiceRoleClient()
    .from('posts')
    .select('slug')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) {
    console.error('Error locating post before delete:', fetchError);
  }

  const { error } = await getServiceRoleClient().from('posts').delete().eq('id', id);

  if (error) {
    console.error('Failed to delete post:', error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }

  await triggerRevalidation(existing?.slug);

  return NextResponse.json({ success: true });
}
