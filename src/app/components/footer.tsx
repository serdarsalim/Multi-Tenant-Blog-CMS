import Link from "next/link";
import SignInButton from "./SignInButton";
import { SITE } from "@/lib/site";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-gray-200 bg-gray-50 text-sm text-gray-600 dark:border-slate-800 dark:bg-slate-950 dark:text-gray-400">
      <div className="mx-auto max-w-5xl overflow-x-auto px-4 py-5 sm:px-6">
        <div className="flex min-w-max items-center justify-between gap-6 whitespace-nowrap">
          <p className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
            © {year} {SITE.fullName}.
          </p>
          <nav className="flex shrink-0 items-center gap-4" aria-label="Footer">
            <a href={SITE.website} target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 dark:hover:text-white">
              serdarsalim.com
            </a>
            <a href="/feed.xml" className="hover:text-gray-900 dark:hover:text-white">
              RSS
            </a>
            <Link href="/terms" className="hover:text-gray-900 dark:hover:text-white">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-gray-900 dark:hover:text-white">
              Privacy
            </Link>
            <div className="inline-flex items-center gap-4 [&>a]:px-0 [&>button]:px-0">
              <SignInButton />
            </div>
          </nav>
        </div>
      </div>
    </footer>
  );
}
