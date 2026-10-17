"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Fuse from "fuse.js";
import type { FeedItem } from "@/app/types/feed";
import PostCard from "./PostCard";

const ALL = "all";
const CATEGORY_STORAGE_KEY = "blogCategoryFilter";

function titleCase(value: string): string {
  return value.replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function HomeFeed({ items }: { items: FeedItem[] }) {
  const [category, setCategory] = useState(ALL);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const searchButtonRef = useRef<HTMLButtonElement | null>(null);

  const categories = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();
    for (const item of items) {
      for (const raw of item.categories) {
        const key = raw.toLowerCase().trim();
        if (!key) continue;
        const entry = counts.get(key) || { label: titleCase(key), count: 0 };
        entry.count += 1;
        counts.set(key, entry);
      }
    }
    return [...counts.entries()]
      .map(([key, value]) => ({ key, ...value }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [items]);

  // Restore the last topic and honour ?search= after hydration, so the server HTML is deterministic.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CATEGORY_STORAGE_KEY)?.toLowerCase().trim();
      if (saved && categories.some((c) => c.key === saved)) setCategory(saved);
    } catch {}
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("search")?.trim();
    if (fromUrl) {
      setQuery(fromUrl);
      setSearchOpen(true);
    }
    const wantedCategory = params.get("category")?.toLowerCase().trim();
    if (wantedCategory && categories.some((c) => c.key === wantedCategory)) setCategory(wantedCategory);
  }, [categories]);

  useEffect(() => {
    try {
      localStorage.setItem(CATEGORY_STORAGE_KEY, category);
    } catch {}
  }, [category]);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  const fuse = useMemo(
    () =>
      new Fuse(items, {
        keys: [
          { name: "title", weight: 2 },
          { name: "excerpt", weight: 1 },
          { name: "categories", weight: 1.2 },
          { name: "sourceHost", weight: 0.8 },
        ],
        threshold: 0.3,
        ignoreLocation: true,
        minMatchCharLength: 2,
      }),
    [items]
  );

  const visible = useMemo(() => {
    const q = query.trim();
    if (q) return fuse.search(q).map((r) => r.item);
    const filtered =
      category === ALL
        ? items
        : items.filter((item) => item.categories.some((c) => c.toLowerCase().trim() === category));
    return [...filtered.filter((i) => i.featured), ...filtered.filter((i) => !i.featured)];
  }, [items, fuse, query, category]);

  const topicClass = (active: boolean) =>
    `shrink-0 border-b-2 pb-4 pt-3 text-[13px] transition-colors ${
      active
        ? "border-orange-600 font-medium text-orange-700 dark:border-orange-400 dark:text-orange-300"
        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-900 dark:text-gray-400 dark:hover:border-slate-600 dark:hover:text-white"
    }`;

  return (
    <section className="mx-auto max-w-3xl px-4 pb-8 pt-7 sm:px-6 sm:pt-8" id="posts">
      <div className="flex items-start gap-5 border-b border-gray-200 dark:border-slate-800">
        <div className="-mb-px flex min-w-0 flex-1 items-center gap-5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Filter posts by topic">
          <button
            type="button"
            onClick={() => {
              setCategory(ALL);
              setQuery("");
            }}
            aria-pressed={category === ALL && !query}
            className={topicClass(category === ALL && !query)}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => {
                setCategory(c.key);
                setQuery("");
              }}
              aria-pressed={category === c.key && !query}
              className={topicClass(category === c.key && !query)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <button
          ref={searchButtonRef}
          type="button"
          onClick={() => {
            setSearchOpen(!searchOpen);
            if (searchOpen) setQuery("");
          }}
          className="inline-flex shrink-0 items-center gap-2 py-3 text-[13px] text-gray-500 transition-colors hover:text-orange-700 dark:text-gray-400 dark:hover:text-orange-300"
          aria-label="Search posts"
          aria-expanded={searchOpen}
          aria-controls="post-search"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          Search
        </button>
      </div>

      {searchOpen && (
        <div className="mt-5" id="post-search">
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setQuery("");
                setSearchOpen(false);
                searchButtonRef.current?.focus();
              }
            }}
            placeholder="Search titles, topics, and notes…"
            aria-label="Search posts"
            className="h-11 w-full rounded-md border border-gray-300 bg-transparent px-3 text-sm text-gray-800 placeholder:text-gray-500 dark:border-slate-600 dark:text-gray-100 dark:placeholder:text-gray-400"
          />
        </div>
      )}

      {query.trim() && (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400" role="status">
          {visible.length} result{visible.length === 1 ? "" : "s"} for “{query.trim()}”.{" "}
          <button type="button" onClick={() => setQuery("")} className="font-medium text-orange-700 hover:underline dark:text-orange-300">
            Clear
          </button>
        </p>
      )}

      <div className="divide-y divide-gray-200/80 dark:divide-slate-800">
        {visible.length === 0 ? (
          <p className="py-12 text-center text-gray-500 dark:text-gray-400">Nothing here yet. Try another category or search.</p>
        ) : (
          visible.map((item, index) => (
            <PostCard key={item.slug} item={item} index={index} showCategory={category === ALL || !!query.trim()} />
          ))
        )}
      </div>
    </section>
  );
}
