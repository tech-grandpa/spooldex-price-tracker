import { clsx } from "clsx";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/language-switcher";

export async function SiteShell({
  children,
  activeHref,
}: {
  children: React.ReactNode;
  activeHref?: string;
}) {
  const t = await getTranslations("nav");
  const tFooter = await getTranslations("footer");

  const navItems = [
    { href: "/", label: t("overview") },
    { href: "/shops", label: t("shops") },
    { href: "/materials", label: t("materials") },
  ];

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
          <div className="flex items-center gap-4">
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
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>{tFooter("tagline")}</p>
          <p className="text-xs uppercase tracking-widest">{tFooter("market")}</p>
        </div>
      </footer>
    </div>
  );
}
