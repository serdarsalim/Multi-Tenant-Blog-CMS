import Link from "next/link";
import type { FeedItem } from "@/app/types/feed";
import { formatDate } from "@/lib/site";

const FALLBACK_THUMB = "/header.jpeg";
// Preserve the existing artwork with a local first frame, without motion in the feed.
const STATIC_THUMBNAILS: Record<string, string> = {
  "https://media.tenor.com/1vHNbYGgrVoAAAAM/awake.gif": "/blog-images/awake-still.webp",
};

function titleCase(value: string): string {
  return value.replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function PostCard({ item, index, showCategory }: { item: FeedItem; index: number; showCategory: boolean }) {
  const isLink = item.post_type === "link" && !!item.source_url;
  const href = `/posts/${item.slug}`;
  const category = item.categories[0];
  const thumb = STATIC_THUMBNAILS[item.featuredImage] ||
    (/\.(gif|apng)(?:[?#]|$)/i.test(item.featuredImage) ? FALLBACK_THUMB : item.featuredImage || FALLBACK_THUMB);

  return (
    <article
      className="rise group relative flex items-start gap-5 py-7 sm:gap-8 sm:py-8"
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      <div className="min-w-0 flex-1">
        {isLink && (
          <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-orange-700 dark:text-orange-300">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M7 17 17 7M9 7h8v8" />
            </svg>
            {item.sourceHost}
          </p>
        )}

        <h2 className="font-serif text-[22px] font-medium leading-tight tracking-[-0.02em] text-gray-900 transition group-hover:text-orange-700 dark:text-gray-100 dark:group-hover:text-orange-300 sm:text-[26px]">
          {isLink ? (
            <a href={item.source_url!} target="_blank" rel="noopener noreferrer" className="relative z-10">
              {item.title}
            </a>
          ) : (
            <Link href={href} prefetch={index < 3} className="after:absolute after:inset-0 after:content-['']">
              {item.title}
            </Link>
          )}
        </h2>

        {item.excerpt && (
          <p className="mt-2.5 line-clamp-2 text-[14px] leading-relaxed text-gray-600 dark:text-gray-400 sm:text-[15px]">
            {item.excerpt}
          </p>
        )}

        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
          <time dateTime={item.date}>{formatDate(item.date, { month: "short" })}</time>
          {!isLink && (
            <>
              <span aria-hidden="true">·</span>
              <span>{item.readingMinutes} min read</span>
            </>
          )}
          {showCategory && category && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-orange-700/90 dark:text-orange-300/90">{titleCase(category)}</span>
            </>
          )}
          {isLink && (
            <>
              <span aria-hidden="true">·</span>
              <Link href={href} className="relative z-10 font-medium text-gray-700 hover:text-orange-700 dark:text-gray-300 dark:hover:text-orange-300">
                My take →
              </Link>
            </>
          )}
        </p>
      </div>

      {!isLink && (
        <div className="relative mt-1 aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-md bg-gray-100 dark:bg-slate-800 sm:w-40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumb}
            alt=""
            loading={index < 3 ? "eager" : "lazy"}
            decoding="async"
            className="h-full w-full object-cover saturate-[0.85]"
          />
        </div>
      )}
    </article>
  );
}
