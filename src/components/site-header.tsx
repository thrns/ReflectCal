import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-rule/70">
      <div className="mx-auto flex min-h-[72px] max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="group flex items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-field">
          <span className="grid size-9 place-items-center border border-field/40 font-display text-sm font-semibold text-field">R</span>
          <span className="leading-tight">
            <span className="block font-semibold tracking-[-0.03em] text-ink">ReflectCal</span>
            <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.13em] text-muted">Research interface</span>
          </span>
        </Link>
        <nav aria-label="Main navigation" className="flex items-center gap-2 text-sm sm:gap-6">
          <Link href="/experiment" className="min-h-11 content-center px-2 text-copy transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-field">Experiment</Link>
          <Link href="/methodology" className="min-h-11 content-center px-2 text-copy transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-field">Methodology</Link>
        </nav>
      </div>
    </header>
  );
}
