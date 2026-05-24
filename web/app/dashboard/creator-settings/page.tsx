'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
};

export default function CreatorSettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [price, setPrice] = useState(9.99);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const isCreator = user?.roles.some((r) => r.role === 'CREATOR');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user && !isCreator) router.push('/creators/apply');
  }, [loading, user, isCreator, router]);

  useEffect(() => {
    if (!isCreator) return;
    api
      .get<CreatorProfile>('/creators/me', true)
      .then((p) => {
        setProfile(p);
        setDisplayName(p.displayName);
        setBio(p.bio ?? '');
        setBannerUrl(p.bannerUrl ?? '');
        setPrice(p.subscriptionPriceCents / 100);
      })
      .catch(() => null);
  }, [isCreator]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);
    try {
      await api.patch(
        '/creators/me',
        {
          displayName,
          bio,
          bannerUrl: bannerUrl || undefined,
          subscriptionPriceCents: Math.round(price * 100),
        },
        true,
      );
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user || !isCreator) {
    return <div className="max-w-md mx-auto px-6 py-20 text-center text-zinc-400">Caricamento…</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-white">← Torna alla dashboard</Link>
      <div className="card p-8 mt-4">
        <h1 className="text-2xl font-bold">Profilo creator</h1>
        <p className="text-sm text-zinc-400 mt-1">
          {profile && (
            <>
              Username: <span className="text-pink-300">@{profile.username}</span> (non modificabile)
            </>
          )}
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {bannerUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bannerUrl} alt="" className="w-full h-32 rounded-lg object-cover border border-[var(--border)]" />
          )}
          <div>
            <label className="block text-sm font-medium mb-1.5">URL banner</label>
            <input
              type="url"
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
              className="input"
              placeholder="https://…/banner.jpg"
            />
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
              className="input min-h-32"
              maxLength={2000}
            />
            <p className="text-xs text-zinc-500 mt-1">{bio.length}/2000</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Prezzo abbonamento mensile (€)</label>
            <input
              type="number"
              min={1}
              step={0.5}
              required
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="input"
            />
          </div>
          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">{error}</p>
          )}
          {success && (
            <p className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
              ✅ Profilo aggiornato.
            </p>
          )}
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Salvataggio…' : 'Salva profilo creator'}
          </button>
        </form>
      </div>
    </div>
  );
}
