'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type CreatorProfile = {
  id: string;
  username: string;
  displayName: string;
  bio?: string | null;
  bannerUrl?: string | null;
  subscriptionPriceCents: number;
  currency: string;
  status: string;
};

export default function CreatorPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const { user } = useAuth();
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [posts, setPosts] = useState<Array<{ id: string; title?: string | null; body?: string | null; visibility: string; publishedAt?: string | null }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [subResult, setSubResult] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<CreatorProfile>(`/creators/${username}`),
      api.get<typeof posts>(`/creators/${username}/posts`).catch(() => []),
    ])
      .then(([p, ps]) => {
        setProfile(p);
        setPosts(ps);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Creator non trovato'))
      .finally(() => setLoading(false));
  }, [username]);

  const subscribe = async () => {
    if (!profile) return;
    setSubResult(null);
    setSubscribing(true);
    try {
      const res = await api.post<Record<string, unknown>>(
        `/subscriptions/${profile.id}/checkout`,
        {},
        true,
      );
      setSubResult(JSON.stringify(res, null, 2));
    } catch (e) {
      setSubResult(e instanceof Error ? e.message : 'Errore');
    } finally {
      setSubscribing(false);
    }
  };

  if (loading) {
    return <div className="max-w-3xl mx-auto px-6 py-20 text-center text-zinc-400">Caricamento profilo…</div>;
  }

  if (error || !profile) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h1 className="text-2xl font-bold">Creator non trovato</h1>
        <p className="text-zinc-400 mt-2">{error ?? `Nessun profilo per "@${username}"`}</p>
        <p className="text-sm text-zinc-500 mt-4">
          Suggerimento: questo è un creator demo. Per crearne uno reale, registra un account e usa <code className="text-pink-300">POST /creators/apply</code>.
        </p>
        <Link href="/" className="btn-ghost mt-6 inline-block">Torna alla home</Link>
      </div>
    );
  }

  const price = (profile.subscriptionPriceCents / 100).toFixed(2);

  return (
    <div className="max-w-3xl mx-auto">
      <div
        className="h-48 md:h-64 relative"
        style={{ background: 'linear-gradient(135deg, hsl(320 80% 55%), hsl(260 80% 60%))' }}
      >
        {profile.bannerUrl && (
          <img src={profile.bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
      </div>
      <div className="px-6 -mt-12">
        <div className="w-24 h-24 rounded-full border-4 border-[var(--background)] bg-gradient-to-br from-pink-400 to-purple-600 flex items-center justify-center text-4xl font-bold">
          {profile.displayName.charAt(0).toUpperCase()}
        </div>
        <div className="mt-4 flex flex-wrap items-baseline gap-2">
          <h1 className="text-3xl font-bold">{profile.displayName}</h1>
          <span className="text-zinc-400">@{profile.username}</span>
          <span className="text-xs px-2 py-1 rounded-full bg-white/5 border border-[var(--border)]">
            {profile.status}
          </span>
        </div>
        {profile.bio && <p className="mt-4 text-zinc-300">{profile.bio}</p>}

        <div className="mt-8 card p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm text-zinc-400">Iscrizione mensile</p>
              <p className="text-3xl font-bold gradient-text">€{price}<span className="text-base text-zinc-500"> /mese</span></p>
            </div>
            {user ? (
              <button onClick={subscribe} disabled={subscribing} className="btn-primary">
                {subscribing ? 'Creazione checkout…' : 'Iscriviti'}
              </button>
            ) : (
              <Link href="/login" className="btn-primary">Accedi per iscriverti</Link>
            )}
          </div>
          {subResult && (
            <pre className="mt-4 text-xs bg-black/40 p-4 rounded-lg border border-[var(--border)] overflow-x-auto">
              {subResult}
            </pre>
          )}
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Post recenti</h2>
          {posts.length === 0 ? (
            <div className="card p-8 text-center text-zinc-400">
              � Nessun post pubblicato ancora.
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((p) => {
                const locked = p.visibility !== 'PUBLIC';
                return (
                  <article key={p.id} className="card p-5">
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`px-2 py-1 rounded-full ${locked ? 'bg-pink-500/15 text-pink-300 border border-pink-500/30' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'}`}>
                        {locked ? '🔒 Solo abbonati' : '🌐 Pubblico'}
                      </span>
                      {p.publishedAt && (
                        <span className="text-zinc-500">{new Date(p.publishedAt).toLocaleDateString('it-IT')}</span>
                      )}
                    </div>
                    {p.title && <h3 className="mt-2 font-semibold text-lg">{p.title}</h3>}
                    {p.body && (
                      <p className={`mt-1 text-zinc-300 ${locked ? 'blur-sm select-none' : ''}`}>{p.body}</p>
                    )}
                    {locked && (
                      <p className="mt-3 text-sm text-pink-300">Iscriviti per leggere il contenuto completo.</p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
