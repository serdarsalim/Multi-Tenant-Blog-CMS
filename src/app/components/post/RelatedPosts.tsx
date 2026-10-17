import Link from "next/link";
import type { BlogPost } from "@/app/types/blogpost";
import { formatDate, hostOf, readingMinutes, stripHtml, summarize } from "@/lib/site";

export default function RelatedPosts({ posts }: { posts: BlogPost[] }) {
  if (posts.length === 0) return null;

  return (
    <aside className="mx-auto mt-10 max-w-[42rem]" aria-labelledby="read-next">
      <h2 id="read-next" className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Read next
      </h2>
      <ul className="mt-2 divide-y divide-gray-200 dark:divide-slate-800">
        {posts.map((post) => {
          const isLink = post.post_type === "link" && !!post.source_url;
          return (
            <li key={post.slug} className="py-4">
              <Link href={`/posts/${post.slug}`} className="group block">
                {isLink && (
                  <span className="mb-0.5 block text-xs text-orange-700 dark:text-orange-300">↗ {hostOf(post.source_url)}</span>
                )}
                <span className="block text-xl font-semibold leading-tight tracking-tight text-gray-900 group-hover:text-orange-700 dark:text-gray-100 dark:group-hover:text-orange-300">
                  {post.title}
                </span>
                <span className="mt-2 line-clamp-2 block text-sm text-gray-600 dark:text-gray-400">
                  {post.excerpt?.trim() || summarize(stripHtml(post.content), 140)}
                </span>
                <span className="mt-2 block text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(post.date, { month: "short" })}
                  {!isLink && ` · ${readingMinutes(post.content)} min read`}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
