'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type Sub = {
  id: string;
  status: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  creator: {
    id: string;
    username: string;
    displayName: string;
    subscriptionPriceCents: number;
    currency: string;
  };
};

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  TRIALING: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  PAST_DUE: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  CANCELED: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
  EXPIRED: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
  PAUSED: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  INCOMPLETE: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  UNPAID: 'bg-red-500/15 text-red-300 border-red-500/30',
};

export default function MySubscriptionsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
    if (user) {
      api
        .get<Sub[]>('/subscriptions/me', true)
        .then(setSubs)
        .catch(() => setSubs([]))
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  const onCancel = async (id: string) => {
    if (!confirm('Confermare cancellazione iscrizione?')) return;
    setBusyId(id);
    try {
      const updated = await api.post<Sub>(`/subscriptions/${id}/cancel`, {}, true);
      setSubs((s) => s.map((x) => (x.id === id ? { ...x, ...updated } : x)));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Errore');
    } finally {
      setBusyId(null);
    }
  };

  if (authLoading || loading) {
    return <div className="max-w-3xl mx-auto px-6 py-20 text-center text-zinc-400">Caricamento…</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-white">← Torna alla dashboard</Link>
      <h1 className="text-3xl font-bold mt-4">Le mie iscrizioni</h1>
      <p className="text-zinc-400 mt-1">{subs.length} iscrizioni totali</p>

      {subs.length === 0 ? (
        <div className="card p-10 text-center mt-8">
          <p className="text-5xl">📭</p>
          <p className="mt-3 text-zinc-300">Non sei iscritto a nessun creator.</p>
          <Link href="/" className="btn-primary mt-4 inline-block text-sm">Esplora creator</Link>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {subs.map((s) => {
            const colorCls = statusColors[s.status] ?? statusColors.CANCELED;
            const isActive = s.status === 'ACTIVE' || s.status === 'TRIALING';
            const price = (s.creator.subscriptionPriceCents / 100).toFixed(2);
            return (
              <article key={s.id} className="card p-5 flex flex-wrap items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-600 flex items-center justify-center text-xl font-bold flex-shrink-0">
                  {s.creator.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/creators/${s.creator.username}`} className="font-semibold hover:text-pink-300">
                    {s.creator.displayName}
                  </Link>
                  <div className="text-sm text-zinc-400">
                    €{price}/mese · scadenza {new Date(s.currentPeriodEnd).toLocaleDateString('it-IT')}
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full border ${colorCls}`}>{s.status}</span>
                {isActive && (
                  <button
                    onClick={() => onCancel(s.id)}
                    disabled={busyId === s.id}
                    className="btn-ghost text-sm"
                  >
                    {busyId === s.id ? 'Cancellazione…' : 'Cancella'}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
