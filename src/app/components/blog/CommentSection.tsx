"use client";

import { useEffect, useId, useRef, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import ShareButtons from "./ShareButtons";

interface CommentSectionProps {
  slug: string;
  share?: { title: string; url: string };
}

type Comment = {
  id: string;
  author_name: string;
  author_email: string;
  content: string;
  created_at: string;
};

export default function CommentSection({ slug, share }: CommentSectionProps) {
  const { data: session, status } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const composerId = useId();
  const commentButtonRef = useRef<HTMLButtonElement | null>(null);
  const draftRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (composerOpen && session) draftRef.current?.focus();
  }, [composerOpen, session]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/comments?slug=${encodeURIComponent(slug)}`);
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load comments");
        }
        const data = await response.json();
        if (!cancelled) setComments(data.comments ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load comments");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    let cancelled = false;

    const loadRole = async () => {
      if (!session?.user?.email) return;
      try {
        const response = await fetch("/api/profile");
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled) {
          setIsAdmin(data?.profile?.role === "admin");
        }
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
    };

    loadRole();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.email]);

  const submitComment = async () => {
    if (!draft.trim()) return;
    setPosting(true);
    setError(null);
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, content: draft.trim() }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to post comment");
      }

      const data = await response.json();
      setComments((prev) => [data.comment, ...prev]);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setPosting(false);
    }
  };

  const deleteComment = async (id: string) => {
    if (!confirm("Delete this comment?")) return;
    setDeletingId(id);
    setError(null);
    try {
      const response = await fetch("/api/comments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete comment");
      }
      setComments((prev) => prev.filter((comment) => comment.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete comment");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section aria-label="Comments">
      <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
        {share && <ShareButtons title={share.title} url={share.url} />}
        <button
          ref={commentButtonRef}
          type="button"
          onClick={() => setComposerOpen((open) => !open)}
          aria-expanded={composerOpen}
          aria-controls={composerId}
          className="inline-flex items-center gap-2 py-1 text-sm text-gray-500 transition-colors hover:text-orange-700 dark:text-gray-400 dark:hover:text-orange-300"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Leave a comment
        </button>
      </div>
      <div hidden={!composerOpen} id={composerId} className="mt-4" onKeyDown={(event) => {
        if (event.key === "Escape") {
          setComposerOpen(false);
          commentButtonRef.current?.focus();
        }
      }}>
        {status === "loading" ? (
          <p className="text-sm text-gray-500 dark:text-gray-400" role="status">Loading sign-in...</p>
        ) : session ? (
          <div className="space-y-3">
            <textarea
              ref={draftRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Write a comment..."
              aria-label="Write a comment"
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-gray-800 dark:text-gray-200"
              rows={4}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Signed in as {session.user?.name || session.user?.email}
              </span>
              <button
                type="button"
                onClick={submitComment}
                disabled={posting || !draft.trim()}
                className="px-4 py-2 rounded-md bg-orange-500 text-white text-sm hover:bg-orange-600 disabled:opacity-50"
              >
                {posting ? "Posting..." : "Post comment"}
              </button>
            </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => signIn("google")}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 transition-colors hover:border-orange-400 hover:text-orange-700 dark:border-slate-700 dark:text-gray-300 dark:hover:text-orange-300"
            >
              Sign in to comment
            </button>
          )}
      </div>

      {loading && <p className="mt-3 text-sm text-gray-500 dark:text-gray-400" role="status">Loading comments...</p>}
      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
      {comments.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
            Comments <span className="ml-1 text-sm font-normal text-gray-500 dark:text-gray-400">{comments.length}</span>
          </h2>
          <div className="divide-y divide-gray-200 dark:divide-slate-800">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="py-4 first:pt-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {comment.author_name || "Anonymous"}
                  </div>
                  {(isAdmin ||
                    (session?.user?.email &&
                      comment.author_email === session.user.email)) && (
                    <button
                      type="button"
                      onClick={() => deleteComment(comment.id)}
                      disabled={deletingId === comment.id}
                      className="text-xs text-gray-500 hover:text-red-600 disabled:opacity-50"
                    >
                      {deletingId === comment.id ? "Deleting..." : "Delete"}
                    </button>
                  )}
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {new Date(comment.created_at).toLocaleString()}
                </div>
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                  {comment.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
