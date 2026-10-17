"use client";

import { useEffect, useId, useRef, useState } from "react";

type Props = { title: string; url: string };

const actionClass =
  "inline-flex items-center gap-2 py-1 text-sm text-gray-500 transition-colors hover:text-orange-700 dark:text-gray-400 dark:hover:text-orange-300";

export default function ShareButtons({ title, url }: Props) {
  const [copyStatus, setCopyStatus] = useState("Copy link");
  const [shareOpen, setShareOpen] = useState(false);
  const shareButtonRef = useRef<HTMLButtonElement | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const optionsId = useId();

  useEffect(() => () => {
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
  }, []);

  const copy = async () => {
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    try {
      await navigator.clipboard.writeText(url);
      setCopyStatus("Copied");
    } catch {
      setCopyStatus("Couldn't copy");
    }
    copyTimeoutRef.current = setTimeout(() => setCopyStatus("Copy link"), 2000);
  };

  const share = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
      }
    }
    setShareOpen((open) => !open);
  };

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const destinations = [
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
    { label: "X", href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}` },
    { label: "WhatsApp", href: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}` },
  ];

  return (
    <div onKeyDown={(event) => {
      if (event.key === "Escape" && shareOpen) {
        setShareOpen(false);
        shareButtonRef.current?.focus();
      }
    }}>
      <div className="flex items-center gap-6">
        <button ref={shareButtonRef} type="button" onClick={share} className={actionClass} aria-expanded={shareOpen} aria-controls={optionsId}>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 16V3m-4 4 4-4 4 4M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
          </svg>
          Share
        </button>
        <button type="button" onClick={copy} className={actionClass} aria-live="polite">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="8" y="8" width="12" height="12" rx="2" />
            <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
          </svg>
          {copyStatus}
        </button>
      </div>
      {shareOpen && (
        <nav id={optionsId} aria-label="Share this post" className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          {destinations.map(({ label, href }) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer" onClick={() => setShareOpen(false)} className={actionClass}>
              {label}
            </a>
          ))}
        </nav>
      )}
    </div>
  );
}
