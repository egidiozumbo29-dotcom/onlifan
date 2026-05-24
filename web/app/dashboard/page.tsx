'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type CreatorProfile = { id: string; username: string; displayName: string };
type MyPost = {
  id: string;
  title?: string | null;
  body?: string | null;
  visibility: string;
  status: string;
  publishedAt?: string | null;
};

const visibilityBadge: Record<string, { label: string; cls: string }> = {
  PUBLIC: { label: '🌐 Pubblico', cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  SUBSCRIBERS_ONLY: { label: '🔒 Abbonati', cls: 'bg-pink-500/15 text-pink-300 border-pink-500/30' },
  PAID_POST: { label: '💰 Pagamento', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  PRIVATE: { label: 'Privato', cls: 'bg-white/5 text-zinc-300 border-[var(--border)]' },
  ARCHIVED: { label: 'Archiviato', cls: 'bg-white/5 text-zinc-400 border-[var(--border)]' },
  REMOVED: { label: 'Rimosso', cls: 'bg-red-500/10 text-red-400 border-red-500/30' },
};

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const [myPosts, setMyPosts] = useState<MyPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  const isCreator = user?.roles.some((r) => r.role === 'CREATOR');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (!isCreator) return;
    setLoadingPosts(true);
    Promise.all([
      api.get<CreatorProfile>('/creators/me', true).catch(() => null),
      api.get<MyPost[]>('/creators/me/posts', true).catch(() => []),
    ])
      .then(([profile, posts]) => {
        setCreatorProfile(profile);
        setMyPosts(posts);
      })
      .finally(() => setLoadingPosts(false));
  }, [isCreator]);

  if (loading || !user) {
    return <div className="max-w-3xl mx-auto px-6 py-20 text-center text-zinc-400">Caricamento…</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-6">
      <div className="card p-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-purple-600 flex items-center justify-center text-2xl font-bold">
            {user.displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{user.displayName}</h1>
            <p className="text-sm text-zinc-400">{user.email}</p>
            <div className="mt-2 flex gap-2 flex-wrap">
              {user.roles.map((r) => (
                <span key={r.role} className="text-xs px-2 py-1 rounded-full bg-white/5 border border-[var(--border)]">
                  {r.role}
                </span>
              ))}
              <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                {user.status}
              </span>
            </div>
          </div>
          {isCreator && creatorProfile && (
            <Link href={`/creators/${creatorProfile.username}`} className="btn-ghost text-sm">
              Vedi profilo pubblico →
            </Link>
          )}
        </div>
      </div>

      {isCreator ? (
        <div className="card p-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-xl font-bold">I miei post</h2>
              <p className="text-sm text-zinc-400">{myPosts.length} post pubblicati</p>
            </div>
            <Link href="/dashboard/posts/new" className="btn-primary text-sm">+ Nuovo post</Link>
          </div>

          <div className="mt-6 space-y-3">
            {loadingPosts ? (
              <p className="text-zinc-400">Caricamento post…</p>
            ) : myPosts.length === 0 ? (
              <div className="text-center py-12 text-zinc-400">
                <p className="text-4xl mb-2">📝</p>
                <p>Non hai ancora pubblicato nulla.</p>
                <Link href="/dashboard/posts/new" className="btn-primary text-sm mt-4 inline-block">Pubblica il primo post</Link>
              </div>
            ) : (
              myPosts.map((p) => {
                const badge = visibilityBadge[p.visibility] ?? visibilityBadge.PRIVATE;
                return (
                  <article key={p.id} className="border border-[var(--border)] rounded-lg p-4 bg-white/[0.02]">
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`px-2 py-1 rounded-full border ${badge.cls}`}>
                        {badge.label}
                      </span>
                      <span className="px-2 py-1 rounded-full bg-white/5 border border-[var(--border)] text-zinc-300">
                        {p.status}
                      </span>
                      {p.publishedAt && (
                        <span className="text-zinc-500">{new Date(p.publishedAt).toLocaleString('it-IT')}</span>
                      )}
                    </div>
                    {p.title && <h3 className="mt-2 font-semibold">{p.title}</h3>}
                    {p.body && <p className="mt-1 text-sm text-zinc-400 line-clamp-2">{p.body}</p>}
                  </article>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div className="card p-6 border-pink-500/30">
          <h3 className="font-semibold text-lg">Diventa creator</h3>
          <p className="text-sm text-zinc-400 mt-1">
            Pubblica contenuti, ricevi abbonamenti mensili e gestisci payout in modo sicuro.
          </p>
          <Link href="/creators/apply" className="btn-primary mt-4 inline-block text-sm">Applica come creator</Link>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/dashboard/settings" className="card p-5 hover:border-pink-500/50 transition">
          <div className="text-2xl mb-2">⚙️</div>
          <h3 className="font-semibold">Impostazioni profilo</h3>
          <p className="text-xs text-zinc-400 mt-1">Nome, email, avatar</p>
        </Link>
        <Link href="/dashboard/subscriptions" className="card p-5 hover:border-pink-500/50 transition">
          <div className="text-2xl mb-2">💎</div>
          <h3 className="font-semibold">Le mie iscrizioni</h3>
          <p className="text-xs text-zinc-400 mt-1">Gestisci abbonamenti</p>
        </Link>
        <Link href="/feed" className="card p-5 hover:border-pink-500/50 transition">
          <div className="text-2xl mb-2">📰</div>
          <h3 className="font-semibold">Il tuo feed</h3>
          <p className="text-xs text-zinc-400 mt-1">Post degli abbonamenti</p>
        </Link>
        {isCreator && (
          <>
            <Link href="/dashboard/creator-settings" className="card p-5 hover:border-pink-500/50 transition">
              <div className="text-2xl mb-2">✨</div>
              <h3 className="font-semibold">Profilo creator</h3>
              <p className="text-xs text-zinc-400 mt-1">Bio, prezzo, banner</p>
            </Link>
            <Link href="/dashboard/earnings" className="card p-5 hover:border-pink-500/50 transition">
              <div className="text-2xl mb-2">💰</div>
              <h3 className="font-semibold">I miei guadagni</h3>
              <p className="text-xs text-zinc-400 mt-1">Earnings e payout</p>
            </Link>
          </>
        )}
        <Link href="/" className="card p-5 hover:border-pink-500/50 transition">
          <div className="text-2xl mb-2">🔍</div>
          <h3 className="font-semibold">Esplora creator</h3>
          <p className="text-xs text-zinc-400 mt-1">Scopri nuovi profili</p>
        </Link>
      </div>
    </div>
  );
}
