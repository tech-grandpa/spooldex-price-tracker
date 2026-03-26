"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

const REGION_FLAGS: Record<string, string> = {
  eu: "🇪🇺",
  gb: "🇬🇧",
  us: "🇺🇸",
  ca: "🇨🇦",
};

const REGION_IDS = ["eu", "gb", "us", "ca"] as const;

export function RegionFilter({ activeRegion }: { activeRegion: string | null }) {
  const t = useTranslations("regions");
  const router = useRouter();
  const searchParams = useSearchParams();

  function setRegion(region: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (region) {
      params.set("region", region);
    } else {
      params.delete("region");
    }
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground">{t("label")}:</span>
      <button
        onClick={() => setRegion(null)}
        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
          !activeRegion
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
        }`}
      >
        {t("all")}
      </button>
      {REGION_IDS.map((id) => (
        <button
          key={id}
          onClick={() => setRegion(id)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            activeRegion === id
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          }`}
        >
          {REGION_FLAGS[id]} {t(id)}
        </button>
      ))}
    </div>
  );
}
