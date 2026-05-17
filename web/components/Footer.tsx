export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] py-8 mt-20">
      <div className="max-w-6xl mx-auto px-6 text-center text-sm text-zinc-500">
        <p>
          Built with <span className="gradient-text font-semibold">DollyFans API</span> + Next.js 16 + Tailwind v4
        </p>
        <p className="mt-2 text-xs text-zinc-600">
          Backend: <code className="text-zinc-400">localhost:4000</code> · Demo locale
        </p>
      </div>
    </footer>
  );
}
