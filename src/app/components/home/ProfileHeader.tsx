import Image from "next/image";
import type { PrimaryAuthorProfile } from "@/lib/data";
import { SITE } from "@/lib/site";

type Props = {
  profile: PrimaryAuthorProfile | null;
  postCount: number;
};

export default function ProfileHeader({ profile }: Props) {
  const name = profile?.name?.trim() || SITE.name;
  const bio = profile?.bio?.trim() || "Essays and notes on automation, building products, faith and family.";
  const avatar = profile?.avatar_url?.trim();
  const initial = name.charAt(0).toUpperCase() || "S";

  return (
    <section className="mx-auto max-w-3xl px-4 pt-2 sm:px-6">
      <div className="relative h-28 overflow-hidden rounded-xl sm:h-40">
        <Image
          src="/header.jpeg"
          alt=""
          fill
          sizes="(min-width: 768px) 768px, 100vw"
          className="object-cover saturate-[0.65]"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" aria-hidden="true" />
      </div>

      <div className="relative -mt-10 flex items-end gap-4 px-2 sm:-mt-12 sm:px-4">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-white shadow-md ring-4 ring-white dark:bg-slate-900 dark:ring-slate-900 sm:h-28 sm:w-28">
          {avatar ? (
            <Image src={avatar} alt={name} fill sizes="112px" className="object-cover" priority />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-500 to-amber-500 text-3xl font-semibold text-white">
              {initial}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 px-2 sm:px-4">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{name}</h1>
        <p className="mt-2 max-w-2xl whitespace-pre-line text-[17px] leading-relaxed text-gray-700 dark:text-gray-300">
          {bio}
        </p>
      </div>
    </section>
  );
}
