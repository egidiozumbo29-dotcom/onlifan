'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type FeedItem = {
  id: string;
  title?: string | null;
  body?: string | null;
  publishedAt?: string | null;
  creator?: { username: string; displayName: string };
};

type FeedResponse = { items: FeedItem[]; total?: number };

export default function FeedPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<FeedResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      api.get<FeedResponse>('/posts/feed/subscribed', true)
        .then(setData)
        .catch((e) => setError(e instanceof Error ? e.message : 'Errore'))
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return <div className="max-w-3xl mx-auto px-6 py-20 text-center text-zinc-400">Caricamento feed…</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold">Il tuo feed</h1>
      <p className="text-zinc-400 mt-1">Post dei creator a cui sei iscritto.</p>

      {error && (
        <div className="mt-6 card p-6 border-red-500/30">
          <p className="text-red-400">Errore: {error}</p>
        </div>
      )}

      {!error && data && data.items.length === 0 && (
        <div className="mt-8 card p-10 text-center">
          <p className="text-5xl">📭</p>
          <p className="mt-3 text-zinc-300">Nessun post nel tuo feed.</p>
          <p className="text-sm text-zinc-500 mt-1">Iscriviti a un creator per vedere i suoi contenuti.</p>
        </div>
      )}

      {!error && data && data.items.length > 0 && (
        <div className="mt-8 space-y-4">
          {data.items.map((item) => (
            <article key={item.id} className="card p-6">
              {item.creator && (
                <div className="text-sm text-zinc-400 mb-2">
                  <span className="font-medium text-zinc-200">{item.creator.displayName}</span>{' '}
                  <span>· @{item.creator.username}</span>
                </div>
              )}
              {item.title && <h3 className="text-xl font-semibold">{item.title}</h3>}
              {item.body && <p className="mt-2 text-zinc-300">{item.body}</p>}
              {item.publishedAt && (
                <p className="mt-3 text-xs text-zinc-500">
                  {new Date(item.publishedAt).toLocaleString('it-IT')}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
