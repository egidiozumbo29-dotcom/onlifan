'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function ApplyCreatorPage() {
  const { user, loading, refreshMe } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [priceCents, setPriceCents] = useState(999);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (user) setDisplayName((d) => d || user.displayName);
  }, [loading, user, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post(
        '/creators/apply',
        { username, displayName, bio, subscriptionPriceCents: Number(priceCents) },
        true,
      );
      await refreshMe();
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return <div className="max-w-md mx-auto px-6 py-20 text-center text-zinc-400">Caricamento…</div>;
  }

  return (
    <div className="max-w-md mx-auto px-6 py-12">
      <div className="card p-8">
        <h1 className="text-2xl font-bold">Diventa creator</h1>
        <p className="text-sm text-zinc-400 mt-1">Compila il profilo per iniziare a pubblicare contenuti.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Username pubblico</label>
            <input
              required
              minLength={3}
              pattern="[a-z0-9._-]+"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              className="input"
              placeholder="il_tuo_username"
            />
            <p className="text-xs text-zinc-500 mt-1">Solo minuscole, numeri, . _ -</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Nome visualizzato</label>
            <input
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="input min-h-24"
              placeholder="Racconta cosa fai e cosa offri ai tuoi fan."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Prezzo abbonamento mensile (€)</label>
            <input
              type="number"
              min={1}
              step={0.5}
              required
              value={priceCents / 100}
              onChange={(e) => setPriceCents(Math.round(Number(e.target.value) * 100))}
              className="input"
            />
          </div>
          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              {error}
            </p>
          )}
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Invio…' : 'Applica come creator'}
          </button>
        </form>
      </div>
    </div>
  );
}
