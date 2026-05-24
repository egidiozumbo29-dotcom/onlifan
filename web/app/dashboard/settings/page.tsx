'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function SettingsPage() {
  const { user, loading, refreshMe } = useAuth();
  const router = useRouter();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (user) {
      setDisplayName(user.displayName);
      setEmail(user.email);
      setAvatarUrl(user.avatarUrl ?? '');
    }
  }, [loading, user, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);
    try {
      await api.patch(
        '/users/me',
        {
          displayName,
          email,
          avatarUrl: avatarUrl || undefined,
        },
        true,
      );
      await refreshMe();
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
    return <div className="max-w-md mx-auto px-6 py-20 text-center text-zinc-400">Caricamento…</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-white">← Torna alla dashboard</Link>
      <div className="card p-8 mt-4">
        <h1 className="text-2xl font-bold">Impostazioni profilo</h1>
        <p className="text-sm text-zinc-400 mt-1">Modifica nome, email e avatar.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover border border-[var(--border)]" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-purple-600 flex items-center justify-center text-2xl font-bold">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1.5">URL avatar</label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="input"
                placeholder="https://…/photo.jpg"
              />
            </div>
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
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          </div>
          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">{error}</p>
          )}
          {success && (
            <p className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
              ✅ Modifiche salvate.
            </p>
          )}
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Salvataggio…' : 'Salva modifiche'}
          </button>
        </form>
      </div>
    </div>
  );
}
