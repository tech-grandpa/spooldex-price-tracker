"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { routing } from "@/i18n/routing";

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function switchLocale(newLocale: string) {
    router.replace(pathname, { locale: newLocale });
  }

  return (
    <div className="flex items-center gap-1 text-sm font-medium">
      {routing.locales.map((l, i) => (
        <span key={l} className="flex items-center gap-1">
          {i > 0 && <span className="text-muted-foreground">|</span>}
          <button
            onClick={() => switchLocale(l)}
            className={
              l === locale
                ? "font-bold text-foreground"
                : "text-muted-foreground hover:text-foreground transition-colors"
            }
          >
            {l.toUpperCase()}
          </button>
        </span>
      ))}
    </div>
  );
}
