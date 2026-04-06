import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SiteShell } from "@/components/site-shell";
import { RegionFilter } from "@/components/region-filter";
import { getShopsIndexPageData, REGIONS } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "shopsIndex" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function ShopsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ region?: string }>;
}) {
  const { locale } = await params;
  const { region: regionParam } = await searchParams;
  setRequestLocale(locale);

  const activeRegion = REGIONS.some((r) => r.id === regionParam) ? regionParam! : null;
  const data = await getShopsIndexPageData(activeRegion);
  const t = await getTranslations("shopsIndex");
  const tRegion = await getTranslations("regions");

  const activeRegionLabel = activeRegion
    ? tRegion(activeRegion as "eu" | "gb" | "us" | "ca")
    : null;

  return (
    <SiteShell activeHref="/shops">
      <section className="overflow-hidden rounded-xl border border-border bg-card px-6 py-7 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("pageLabel")}</p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">
          {activeRegionLabel
            ? tRegion("shopsInRegion", { region: activeRegionLabel })
            : t("title")}
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t("description")}</p>

        <div className="mt-5">
          <RegionFilter activeRegion={activeRegion} />
        </div>
      </section>

      {data.shops.length > 0 ? (
        <section className="mt-6 grid gap-4 xl:grid-cols-3">
          {data.shops.map((shop) => {
            const regionFlags = shop.regions
              .map((r: string) => REGIONS.find((reg) => reg.id === r)?.flag)
              .filter(Boolean)
              .join(" ");

            return (
              <Link
                key={shop.id}
                href={`/shops/${shop.id}`}
                className="group overflow-hidden rounded-xl border border-border bg-card px-5 py-5 transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{regionFlags}</span>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {shop.regions.map((r: string) => tRegion(r as "eu" | "gb" | "us" | "ca")).join(", ")}
                      </p>
                    </div>
                    <h2 className="mt-1 text-xl font-bold tracking-tight">{shop.name}</h2>
                  </div>
                  {shop.offerCount > 0 ? (
                    <span className="rounded-full border border-primary/20 bg-primary-light px-2.5 py-1 text-xs font-semibold text-accent-foreground">
                      {shop.freshnessLabel}
                    </span>
                  ) : (
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                      {tRegion("comingSoon")}
                    </span>
                  )}
                </div>

                {shop.offerCount > 0 ? (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg border border-border bg-background px-3 py-2">
                      <p className="text-xs text-muted-foreground">{t("offers")}</p>
                      <p className="text-lg font-bold tabular-nums">{shop.offerCount}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-background px-3 py-2">
                      <p className="text-xs text-muted-foreground">{t("filaments")}</p>
                      <p className="text-lg font-bold tabular-nums">{shop.filamentCount}</p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">
                    {shop.baseUrl && (
                      <span className="text-xs">{new URL(shop.baseUrl).hostname}</span>
                    )}
                  </p>
                )}
              </Link>
            );
          })}
        </section>
      ) : (
        <section className="mt-6 rounded-xl border border-dashed border-border bg-card px-6 py-8 text-center">
          <p className="text-muted-foreground">{tRegion("noShopsYet")}</p>
        </section>
      )}

      {data.recentOffers.length > 0 && (
        <section className="mt-6 rounded-xl border border-border bg-card px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("latestCrawl")}</p>
          <h2 className="mt-1 text-xl font-bold tracking-tight">{t("recentlyRefreshed")}</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.recentOffers.map((offer) => (
              <Link
                key={offer.id}
                href={`/filaments/${offer.items[0]?.filament.slug ?? ""}`}
                className="rounded-lg border border-border bg-background px-4 py-3 transition-colors hover:bg-accent/50"
              >
                <p className="text-xs text-muted-foreground">{offer.shop.name}</p>
                <p className="mt-1 font-semibold tracking-tight">{offer.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{offer.freshnessLabel}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </SiteShell>
  );
}
