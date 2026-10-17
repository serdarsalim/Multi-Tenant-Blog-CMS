"use client";

import { useEffect, useState } from "react";

const CLASSES =
  "article-body prose prose-lg max-w-none dark:prose-invert " +
  "prose-headings:font-sans prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-gray-900 dark:prose-headings:text-white " +
  "prose-h2:mt-10 prose-h2:mb-4 prose-h2:text-2xl prose-h3:mt-8 prose-h3:mb-3 prose-h3:text-xl prose-h4:text-lg " +
  "prose-p:my-4 prose-p:text-gray-800 dark:prose-p:text-gray-300 " +
  "prose-a:font-medium prose-a:text-orange-700 prose-a:no-underline hover:prose-a:underline dark:prose-a:text-orange-300 " +
  "prose-strong:text-gray-900 dark:prose-strong:text-white " +
  "prose-li:my-1.5 prose-li:text-gray-800 dark:prose-li:text-gray-300 prose-ul:pl-6 prose-ol:pl-6 " +
  "prose-blockquote:border-l-4 prose-blockquote:border-orange-400 prose-blockquote:pl-5 prose-blockquote:not-italic prose-blockquote:text-gray-700 dark:prose-blockquote:text-gray-300 " +
  "prose-code:rounded prose-code:bg-orange-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[0.9em] prose-code:font-normal prose-code:text-orange-800 prose-code:before:content-none prose-code:after:content-none dark:prose-code:bg-orange-950/40 dark:prose-code:text-orange-200 " +
  "prose-pre:rounded-lg prose-pre:bg-slate-900 prose-pre:text-sm dark:prose-pre:bg-slate-950 " +
  "prose-hr:my-10 prose-hr:border-gray-200 dark:prose-hr:border-slate-800 " +
  "prose-img:rounded-lg prose-th:p-3 prose-td:p-3 mt-8";

/**
 * The HTML is pre-rendered on the server. `dark` is only passed when the post carries inline
 * colours that need brightening; then we swap after mount. Most posts: no client work at all.
 */
export default function ArticleBody({ light, dark }: { light: string; dark: string | null }) {
  const [html, setHtml] = useState(light);

  useEffect(() => {
    if (!dark) return;
    const root = document.documentElement;
    const apply = () => setHtml(root.classList.contains("dark") ? dark : light);
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [light, dark]);

  return <div className={CLASSES} dangerouslySetInnerHTML={{ __html: html }} />;
}
