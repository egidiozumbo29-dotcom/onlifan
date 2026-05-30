import Link from 'next/link';
import { type CreatorCardProps } from '@/components/CreatorCard';
import { CreatorSearch } from '@/components/CreatorSearch';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type CreatorListItem = {
  id: string;
  username: string;
  displayName: string;
  bio?: string | null;
  bannerUrl?: string | null;
  subscriptionPriceCents: number;
  currency: string;
};

async function getCreators(): Promise<CreatorListItem[]> {
  try {
    const res = await fetch(`${API_URL}/creators`, { cache: 'no-store', signal: AbortSignal.timeout(3000) });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data ?? []) as CreatorListItem[];
  } catch {
    return [];
  }
}

const fallbackCreators: CreatorCardProps[] = [
  { username: 'luna', displayName: 'Luna Stella', bio: 'Fitness coach & lifestyle.', subscriptionPriceCents: 999, avatarHue: 320 },
];

export default async function Home() {
  const creators = await getCreators();
  const showCreators: CreatorCardProps[] = creators.length
    ? creators.map((c, idx) => ({
        username: c.username,
        displayName: c.displayName,
        bio: c.bio,
        subscriptionPriceCents: c.subscriptionPriceCents,
        currency: c.currency,
        avatarHue: (320 + idx * 50) % 360,
      }))
    : fallbackCreators;

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 pt-16 pb-24 md:pt-24 md:pb-32 text-center">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border border-[var(--border)] bg-white/5 text-pink-300">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse" /> Beta privata
          </span>
          <h1 className="mt-6 text-4xl md:text-6xl font-bold tracking-tight leading-tight">
            Monetizza la tua <span className="gradient-text">passione</span>
            <br /> con i fan che ti amano.
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-zinc-400">
            DollyFans è la piattaforma creator per pubblicare contenuti esclusivi,
            ricevere abbonamenti mensili e gestire payout in modo sicuro con Stripe Connect.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link href="/register" className="btn-primary">Diventa creator</Link>
            <Link href="#creators" className="btn-ghost">Esplora creator</Link>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-6">
        {[
          { icon: '💎', title: 'Contenuti esclusivi', desc: 'Pubblica post pubblici, per abbonati o singoli post a pagamento.' },
          { icon: '💳', title: 'Pagamenti sicuri', desc: 'Stripe Checkout e Connect. Carte, wallet e fatturazione automatica.' },
          { icon: '🚀', title: 'Payout veloci', desc: 'Ledger trasparente. Ricevi i guadagni direttamente sul tuo conto.' },
        ].map((f) => (
          <div key={f.title} className="card p-6">
            <div className="text-3xl mb-3">{f.icon}</div>
            <h3 className="font-semibold text-lg">{f.title}</h3>
            <p className="mt-1 text-sm text-zinc-400">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* CREATORS */}
      <section id="creators" className="max-w-6xl mx-auto px-6 mt-24">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold">Creator in evidenza</h2>
            <p className="text-zinc-400 mt-2">
              {creators.length
                ? `${creators.length} creator attivi sulla piattaforma`
                : 'Nessun creator attivo (esegui `npx prisma db seed` per dati demo)'}
            </p>
          </div>
        </div>
        <CreatorSearch creators={showCreators} />
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 mt-24">
        <div className="card p-10 text-center">
          <h2 className="text-3xl font-bold">Pronto a iniziare?</h2>
          <p className="mt-3 text-zinc-400">Registrati gratuitamente, applica come creator e inizia a guadagnare.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/register" className="btn-primary">Crea account</Link>
            <Link href="/login" className="btn-ghost">Accedi</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
