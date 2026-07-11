export default function WeekPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col px-5 pb-28 pt-8">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wide text-paper/40">This week</p>
        <h1 className="font-display text-2xl font-medium">Week</h1>
      </header>
      <div className="rounded-xl2 border border-dashed border-white/10 p-8 text-center text-sm text-paper/40">
        Seven-day cards with per-day completion are coming in phase 4.
      </div>
    </main>
  );
}
