import Link from 'next/link';

export type CreatorCardProps = {
  username: string;
  displayName: string;
  bio?: string | null;
  subscriptionPriceCents: number;
  currency?: string;
  avatarHue?: number;
};

export function CreatorCard({
  username,
  displayName,
  bio,
  subscriptionPriceCents,
  currency = 'eur',
  avatarHue = 320,
}: CreatorCardProps) {
  const price = (subscriptionPriceCents / 100).toFixed(2);
  return (
    <Link
      href={`/creators/${username}`}
      className="card overflow-hidden group hover:border-[var(--brand)] transition"
    >
      <div
        className="h-32 relative"
        style={{
          background: `linear-gradient(135deg, hsl(${avatarHue} 80% 55%), hsl(${(avatarHue + 60) % 360} 80% 60%))`,
        }}
      >
        <div className="absolute -bottom-8 left-4 w-16 h-16 rounded-full border-4 border-[var(--background)] bg-gradient-to-br from-pink-400 to-purple-600 flex items-center justify-center text-2xl font-bold">
          {displayName.charAt(0).toUpperCase()}
        </div>
      </div>
      <div className="p-4 pt-10">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-semibold text-lg truncate">{displayName}</h3>
          <span className="text-xs text-zinc-400">@{username}</span>
        </div>
        {bio && <p className="mt-1 text-sm text-zinc-400 line-clamp-2">{bio}</p>}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-zinc-300">
            <span className="gradient-text font-bold">€{price}</span>
            <span className="text-zinc-500"> /mese</span>
          </span>
          <span className="text-xs text-pink-400 group-hover:text-pink-300 transition">
            Vedi profilo →
          </span>
        </div>
      </div>
    </Link>
  );
}
