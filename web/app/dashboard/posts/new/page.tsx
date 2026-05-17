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
  const [uploads, setUploads] = useState<Array<{ id: string; preview: string; uploading: boolean }>>([]);

  const isCreator = user?.roles.some((r) => r.role === 'CREATOR');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user && !isCreator) router.push('/creators/apply');
  }, [loading, user, isCreator, router]);

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      const tmpId = `tmp-${Date.now()}-${Math.random()}`;
      const preview = URL.createObjectURL(file);
      setUploads((u) => [...u, { id: tmpId, preview, uploading: true }]);
      try {
        const { mediaId } = await api.uploadImage(file);
        setUploads((u) => u.map((x) => (x.id === tmpId ? { ...x, id: mediaId, uploading: false } : x)));
      } catch (err) {
        setUploads((u) => u.filter((x) => x.id !== tmpId));
        setError(err instanceof Error ? err.message : 'Upload fallito');
      }
    }
  };

  const removeUpload = (id: string) => {
    setUploads((u) => u.filter((x) => x.id !== id));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const mediaIds = uploads.filter((u) => !u.uploading && !u.id.startsWith('tmp-')).map((u) => u.id);
      const payload: Record<string, unknown> = { title, body, visibility, mediaIds };
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
            <label className="block text-sm font-medium mb-2">Immagini</label>
            <label className="block cursor-pointer p-6 rounded-lg border-2 border-dashed border-[var(--border)] hover:border-pink-500/60 transition text-center">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => onFiles(e.target.files)}
                className="hidden"
              />
              <span className="text-3xl">📸</span>
              <p className="text-sm text-zinc-300 mt-1">Click per selezionare immagini</p>
              <p className="text-xs text-zinc-500">JPG, PNG, GIF — vengono caricate direttamente su MinIO/S3</p>
            </label>
            {uploads.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {uploads.map((u) => (
                  <div key={u.id} className="relative group rounded-lg overflow-hidden border border-[var(--border)] aspect-square">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u.preview} alt="" className="w-full h-full object-cover" />
                    {u.uploading && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-xs text-white">Upload…</span>
                      </div>
                    )}
                    {!u.uploading && (
                      <button
                        type="button"
                        onClick={() => removeUpload(u.id)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white text-xs hover:bg-red-500"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
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
