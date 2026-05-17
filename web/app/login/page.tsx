'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login fallito');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <div className="card p-8">
        <h1 className="text-2xl font-bold">Accedi</h1>
        <p className="text-sm text-zinc-400 mt-1">Bentornato su DollyFans 💖</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
            />
          </div>
          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              {error}
            </p>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Accesso in corso…' : 'Accedi'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-zinc-400">
          Non hai un account?{' '}
          <Link href="/register" className="text-pink-400 hover:text-pink-300">Registrati</Link>
        </p>
      </div>
    </div>
  );
}
