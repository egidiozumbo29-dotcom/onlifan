'use client';

import { useMemo, useState } from 'react';
import { CreatorCard, type CreatorCardProps } from './CreatorCard';

export function CreatorSearch({ creators }: { creators: CreatorCardProps[] }) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return creators;
    return creators.filter((c) => {
      return (
        c.username.toLowerCase().includes(term) ||
        c.displayName.toLowerCase().includes(term) ||
        (c.bio?.toLowerCase().includes(term) ?? false)
      );
    });
  }, [q, creators]);

  return (
    <>
      <div className="mb-6">
        <div className="relative max-w-md">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">🔍</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca creator per nome, username o bio…"
            className="input pl-11"
          />
        </div>
        {q && (
          <p className="text-xs text-zinc-500 mt-2">
            {filtered.length} risultat{filtered.length === 1 ? 'o' : 'i'} per &ldquo;{q}&rdquo;
          </p>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="card p-10 text-center text-zinc-400">
          <p className="text-4xl">🌵</p>
          <p className="mt-2">Nessun creator trovato.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filtered.map((c) => (
            <CreatorCard key={c.username} {...c} />
          ))}
        </div>
      )}
    </>
  );
}
