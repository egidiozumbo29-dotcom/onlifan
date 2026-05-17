'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function RegisterPage() {
  const router = useRouter();
  const { register, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifyToken, setVerifyToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await register(email, password, displayName);
      setVerifyToken(res.emailVerificationToken ?? null);
      // Tentativo auto-login per la demo locale (richiede stato ACTIVE)
      try {
        await login(email, password);
        router.push('/dashboard');
      } catch {
        // Email da verificare prima di poter accedere — mostriamo il token
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registrazione fallita');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <div className="card p-8">
        <h1 className="text-2xl font-bold">Crea il tuo account</h1>
        <p className="text-sm text-zinc-400 mt-1">Inizia a esplorare i creator o pubblica i tuoi contenuti.</p>

        {verifyToken ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
              ✅ Account creato! In produzione il token di verifica andrebbe via email.
              Per la demo locale, eccolo:
            </p>
            <code className="block break-all text-xs text-zinc-400 bg-black/30 p-3 rounded-lg border border-[var(--border)]">
              {verifyToken}
            </code>
            <p className="text-xs text-zinc-500">
              Esegui <code>POST /auth/verify-email</code> con questo token per attivare l&apos;account.
            </p>
            <Link href="/login" className="btn-primary inline-block">Vai al login</Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Nome visualizzato</label>
              <input
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input"
                placeholder="Il tuo nome"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="tu@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Password</label>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="Min. 8 caratteri"
              />
            </div>
            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                {error}
              </p>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Creazione…' : 'Crea account'}
            </button>
          </form>
        )}
        <p className="mt-6 text-center text-sm text-zinc-400">
          Hai già un account?{' '}
          <Link href="/login" className="text-pink-400 hover:text-pink-300">Accedi</Link>
        </p>
      </div>
    </div>
  );
}
