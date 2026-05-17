'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return <div className="max-w-3xl mx-auto px-6 py-20 text-center text-zinc-400">Caricamento…</div>;
  }

  const isCreator = user.roles.some((r) => r.role === 'CREATOR');

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-6">
      <div className="card p-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-purple-600 flex items-center justify-center text-2xl font-bold">
            {user.displayName.charAt(0).toUpperCase()}
          </div>
          <div>
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
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-semibold text-lg">Esplora creator</h3>
          <p className="text-sm text-zinc-400 mt-1">Scopri profili e iscriviti.</p>
          <Link href="/" className="btn-ghost mt-4 inline-block text-sm">Vai a esplora</Link>
        </div>
        <div className="card p-6">
          <h3 className="font-semibold text-lg">Il tuo feed</h3>
          <p className="text-sm text-zinc-400 mt-1">Post degli abbonamenti attivi.</p>
          <Link href="/feed" className="btn-ghost mt-4 inline-block text-sm">Apri feed</Link>
        </div>
        {!isCreator && (
          <div className="card p-6 md:col-span-2 border-pink-500/30">
            <h3 className="font-semibold text-lg">Diventa creator</h3>
            <p className="text-sm text-zinc-400 mt-1">
              Pubblica contenuti, ricevi abbonamenti e payout. La funzione di applicazione richiede
              <code className="text-pink-300"> POST /creators/apply</code> sul backend.
            </p>
            <Link href="/creators/apply" className="btn-primary mt-4 inline-block text-sm">Applica come creator</Link>
          </div>
        )}
      </div>
    </div>
  );
}
