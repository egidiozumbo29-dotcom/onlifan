'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export function Header() {
  const { user, loading, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-black/30 border-b border-[var(--border)]">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-2xl">💖</span>
          <span className="text-xl font-bold gradient-text tracking-tight">DollyFans</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/" className="text-zinc-300 hover:text-white transition">Esplora</Link>
          {user && (
            <Link href="/feed" className="text-zinc-300 hover:text-white transition">Feed</Link>
          )}
          {loading ? (
            <div className="w-20 h-9 rounded-full bg-white/5 animate-pulse" />
          ) : user ? (
            <>
              <Link href="/dashboard" className="btn-ghost text-sm">
                {user.displayName}
              </Link>
              <button onClick={logout} className="btn-ghost text-sm">Esci</button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost text-sm">Accedi</Link>
              <Link href="/register" className="btn-primary text-sm">Registrati</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
