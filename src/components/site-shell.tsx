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
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
              ST
            </span>
            <span className="text-base font-semibold tracking-tight">Spooldex Tracker</span>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  activeHref && (activeHref === item.href || (item.href !== "/" && activeHref.startsWith(item.href)))
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>Built for public discovery first, Spooldex integration second.</p>
          <p className="text-xs uppercase tracking-widest">Market: DE</p>
        </div>
      </footer>
    </div>
  );
}
