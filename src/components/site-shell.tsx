import Link from "next/link";
import { clsx } from "clsx";

const navItems = [
  { href: "/", label: "Overview" },
  { href: "/shops", label: "Shops" },
  { href: "/materials", label: "Materials" },
];

export function SiteShell({
  children,
  activeHref,
}: {
  children: React.ReactNode;
  activeHref?: string;
}) {
  return (
    <div className="min-h-screen pb-16">
      <header className="shell pt-6">
        <div className="panel grid-veil overflow-hidden rounded-[28px] px-5 py-4 sm:px-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link href="/" className="inline-flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--foreground)] text-sm font-black tracking-[0.18em] text-[var(--surface)]">
                  ST
                </span>
                <span>
                  <span className="block text-lg font-black tracking-[-0.04em]">Spooldex Tracker</span>
                  <span className="eyebrow">Open filament price signal for Germany</span>
                </span>
              </Link>
            </div>
            <nav className="flex flex-wrap items-center gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                    activeHref && (activeHref === item.href || (item.href !== "/" && activeHref.startsWith(item.href)))
                      ? "bg-[var(--foreground)] text-[#fffaf0]"
                      : "bg-white/60 text-[var(--muted)] hover:bg-white hover:text-[var(--foreground)]",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="shell mt-6">{children}</main>

      <footer className="shell mt-8">
        <div className="flex flex-col gap-3 border-t border-[var(--line)] pt-5 text-sm text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>Built for public discovery first, Spooldex integration second.</p>
          <p className="font-mono text-xs uppercase tracking-[0.2em]">Market: DE</p>
        </div>
      </footer>
    </div>
  );
}
