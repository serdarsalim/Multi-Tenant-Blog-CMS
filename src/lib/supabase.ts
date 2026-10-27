// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Types for our database tables
export type Post = {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt?: string;
  date: string;
  categories: string[];
  featured: boolean;
  author: string;
  featuredImage?: string;
  author_handle: string; // Add this line to match your BlogPost interface
  comment: boolean;
  socmed: boolean;
  published: boolean;
  position?: number | null;
  post_type?: 'article' | 'link' | null;
  source_url?: string | null;
  created_at: string;
  updated_at: string;
};

export type SitePreferences = {
  fontStyle: string;
  [key: string]: any;
};

// Get Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Check if credentials are available and log appropriately
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ Missing Supabase credentials in environment variables:');
  if (!supabaseUrl) console.error('- NEXT_PUBLIC_SUPABASE_URL is missing');
  if (!supabaseAnonKey) console.error('- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing');
}

// Create Supabase client
export const supabase = createClient(
  supabaseUrl || 'https://example.supabase.co', // Fallback to prevent crash
  supabaseAnonKey || 'placeholder-key', // Fallback to prevent crash
  { global: { fetch: (input, init) => {
    // These reads back every public view. Mutations invalidate the same tag.
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method || (input instanceof Request ? input.method : 'GET');
    if (method === 'GET' && new URL(url).pathname === '/rest/v1/posts') {
      const options = init as RequestInit & { next?: { tags?: string[]; revalidate?: number } };
      return fetch(input, { ...options, next: { ...options?.next, tags: [...new Set([...(options?.next?.tags || []), 'posts'])], revalidate: 60 } } as RequestInit);
    }
    return fetch(input, init);
  } } }
);

// Log initialization in development to help with debugging
//if (process.env.NODE_ENV === 'development') {
 // console.log(`🔌 Supabase client initialized with URL: ${supabaseUrl?.substring(0, 10)}...`);
//}
