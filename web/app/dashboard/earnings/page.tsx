'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type Earning = {
  id: string;
  amountCents: number;
  currency: string;
  status: string;
  createdAt: string;
  availableAt?: string | null;
  paidAt?: string | null;
  payment?: { id: string; amountCents: number; status: string } | null;
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  AVAILABLE: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  PAID: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  HELD: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
  REVERSED: 'bg-red-500/15 text-red-300 border-red-500/30',
};

export default function EarningsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const isCreator = user?.roles.some((r) => r.role === 'CREATOR');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user && !isCreator) router.push('/creators/apply');
  }, [loading, user, isCreator, router]);

  useEffect(() => {
    if (!isCreator) return;
    api
      .get<Earning[]>('/payments/creator/earnings', true)
      .then(setEarnings)
      .catch(() => setEarnings([]))
      .finally(() => setLoadingData(false));
  }, [isCreator]);

  if (loading || !user || !isCreator) {
    return <div className="max-w-3xl mx-auto px-6 py-20 text-center text-zinc-400">Caricamento…</div>;
  }

  const totals = earnings.reduce(
    (acc, e) => {
      const amt = e.amountCents;
      if (e.status === 'PAID') acc.paid += amt;
      else if (e.status === 'AVAILABLE') acc.available += amt;
      else if (e.status === 'PENDING') acc.pending += amt;
      return acc;
    },
    { paid: 0, available: 0, pending: 0 },
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-white">← Torna alla dashboard</Link>
      <h1 className="text-3xl font-bold mt-4">I miei guadagni</h1>
      <p className="text-zinc-400 mt-1">Earnings del creator dalla piattaforma</p>

      <div className="grid sm:grid-cols-3 gap-4 mt-6">
        <div className="card p-5">
          <p className="text-xs text-zinc-400 uppercase tracking-wide">Disponibili</p>
          <p className="text-3xl font-bold gradient-text mt-2">€{(totals.available / 100).toFixed(2)}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-zinc-400 uppercase tracking-wide">In attesa</p>
          <p className="text-3xl font-bold text-amber-300 mt-2">€{(totals.pending / 100).toFixed(2)}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-zinc-400 uppercase tracking-wide">Già pagati</p>
          <p className="text-3xl font-bold text-blue-300 mt-2">€{(totals.paid / 100).toFixed(2)}</p>
        </div>
      </div>

      <div className="card p-6 mt-6">
        <h2 className="text-xl font-semibold">Storico transazioni</h2>
        {loadingData ? (
          <p className="mt-4 text-zinc-400">Caricamento…</p>
        ) : earnings.length === 0 ? (
          <div className="mt-6 text-center py-8 text-zinc-400">
            <p className="text-4xl">💸</p>
            <p className="mt-2">Nessuna transazione ancora.</p>
            <p className="text-xs text-zinc-500 mt-1">
              I guadagni appariranno qui dopo le prime iscrizioni a pagamento (servono chiavi Stripe vere).
            </p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-zinc-400 border-b border-[var(--border)]">
                <tr>
                  <th className="text-left py-2 px-2">Data</th>
                  <th className="text-left py-2 px-2">Importo</th>
                  <th className="text-left py-2 px-2">Stato</th>
                  <th className="text-left py-2 px-2">Pagamento</th>
                </tr>
              </thead>
              <tbody>
                {earnings.map((e) => {
                  const cls = statusColors[e.status] ?? statusColors.PENDING;
                  return (
                    <tr key={e.id} className="border-b border-[var(--border)]/50">
                      <td className="py-2 px-2">{new Date(e.createdAt).toLocaleDateString('it-IT')}</td>
                      <td className="py-2 px-2 font-medium">
                        €{(e.amountCents / 100).toFixed(2)} {e.currency.toUpperCase()}
                      </td>
                      <td className="py-2 px-2">
                        <span className={`text-xs px-2 py-1 rounded-full border ${cls}`}>{e.status}</span>
                      </td>
                      <td className="py-2 px-2 text-zinc-500 text-xs">
                        {e.payment ? e.payment.id.slice(0, 8) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
