'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const VISIBILITIES = [
  { value: 'PUBLIC', label: '🌐 Pubblico', desc: 'Visibile a tutti, anche senza abbonamento' },
  { value: 'SUBSCRIBERS_ONLY', label: '🔒 Solo abbonati', desc: 'Solo chi ha un abbonamento attivo può leggerlo' },
  { value: 'PAID_POST', label: '💰 Post a pagamento', desc: 'Acquisto singolo, prezzo libero' },
] as const;

type Visibility = (typeof VISIBILITIES)[number]['value'];

export default function NewPostPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('SUBSCRIBERS_ONLY');
  const [price, setPrice] = useState(2.99);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isCreator = user?.roles.some((r) => r.role === 'CREATOR');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user && !isCreator) router.push('/creators/apply');
  }, [loading, user, isCreator, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = { title, body, visibility };
      if (visibility === 'PAID_POST') {
        payload.priceCents = Math.round(price * 100);
        payload.currency = 'eur';
      }
      await api.post('/posts', payload, true);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante la creazione');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user || !isCreator) {
    return <div className="max-w-md mx-auto px-6 py-20 text-center text-zinc-400">Caricamento…</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-white">← Torna alla dashboard</Link>
      <div className="card p-8 mt-4">
        <h1 className="text-2xl font-bold">Nuovo post</h1>
        <p className="text-sm text-zinc-400 mt-1">Pubblica un contenuto per la tua community.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5">Titolo</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              placeholder="Es. Dietro le quinte del nuovo brano"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Contenuto</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="input min-h-32"
              placeholder="Cosa vuoi raccontare?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Visibilità</label>
            <div className="space-y-2">
              {VISIBILITIES.map((v) => (
                <label
                  key={v.value}
                  className={`block cursor-pointer p-3 rounded-lg border transition ${
                    visibility === v.value
                      ? 'border-pink-500 bg-pink-500/10'
                      : 'border-[var(--border)] hover:border-pink-500/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="visibility"
                    checked={visibility === v.value}
                    onChange={() => setVisibility(v.value)}
                    className="hidden"
                  />
                  <div className="font-medium">{v.label}</div>
                  <div className="text-xs text-zinc-400 mt-0.5">{v.desc}</div>
                </label>
              ))}
            </div>
          </div>
          {visibility === 'PAID_POST' && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Prezzo (€)</label>
              <input
                type="number"
                min={0.5}
                step={0.5}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="input"
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              {error}
            </p>
          )}

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Pubblicazione…' : 'Pubblica post'}
          </button>
        </form>
      </div>
    </div>
  );
}
