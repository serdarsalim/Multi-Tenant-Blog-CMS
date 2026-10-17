// src/lib/supabase-admin.ts
// Service-role Supabase client. Bypasses RLS: server-side only, never import from a client component.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

export function getServiceRoleClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // SUPABASE_SERVICE_ROLE_KEY is the canonical name. SUPABASE_SERVICE_KEY is the old one
  // and is only read so an un-renamed Vercel env keeps working.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  cached = createClient(url, key, { auth: { persistSession: false }, global: { fetch: (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    // Uncached article reads verify publishing without changing public profile caching.
    return fetch(input, new URL(url).pathname === '/rest/v1/posts' ? { ...init, cache: 'no-store' } : init);
  } } });
  return cached;
}
