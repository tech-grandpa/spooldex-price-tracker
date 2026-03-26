import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SiteShell } from "@/components/site-shell";
import { getShopsIndexPageData } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";
import { getLocale } from "next-intl/server";

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
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const data = await getShopsIndexPageData();
  const t = await getTranslations("shopsIndex");
  const tPack = await getTranslations("packType");

  return (
    <SiteShell activeHref="/shops">
      <section className="rounded-xl border border-border bg-card overflow-hidden rounded-xl px-6 py-7 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("pageLabel")}</p>
        <div className="mt-4 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h1 className="text-2xl font-bold leading-[0.94] tracking-tight">
              {t("title")}
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
              {t("description")}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: t("trackedShops"), value: data.shops.length },
              { label: t("liveOffers"), value: data.shops.reduce((sum, shop) => sum + shop.offerCount, 0) },
              { label: t("packOffers"), value: data.shops.reduce((sum, shop) => sum + shop.packOfferCount, 0) },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-border bg-background px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{item.label}</p>
                <p className="mt-3 text-2xl font-bold tracking-tight">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-3">
        {data.shops.map((shop) => (
          <Link
            key={shop.id}
            href={`/shops/${shop.id}`}
            className="rounded-xl border border-border bg-card group rounded-xl px-5 py-5 transition-transform duration-200 hover:-translate-y-1"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("retailer", { market: shop.market.toUpperCase() })}</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight">{shop.name}</h2>
              </div>
              <span className="rounded-full border border-primary/20 bg-primary-light text-accent-foreground rounded-full px-3 py-2 text-xs font-semibold">
                {shop.freshnessLabel}
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-background px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("offers")}</p>
                <p className="mt-2 text-2xl font-bold tracking-tight">{shop.offerCount}</p>
              </div>
              <div className="rounded-lg border border-border bg-background px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("filaments")}</p>
                <p className="mt-2 text-2xl font-bold tracking-tight">{shop.filamentCount}</p>
              </div>
              <div className="rounded-lg border border-border bg-background px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("packOffers")}</p>
                <p className="mt-2 text-2xl font-bold tracking-tight">{shop.packOfferCount}</p>
              </div>
            </div>

            {shop.cheapestOffer ? (
              <div className="mt-5 rounded-lg border border-border bg-[rgba(31,34,29,0.04)] px-4 py-4">
                <p className="text-sm text-muted-foreground">{t("bestPrice")}</p>
                <p className="mt-1 text-lg font-bold tracking-tight">
                  {formatCurrency(shop.cheapestOffer.latestPriceCents, shop.cheapestOffer.latestCurrency, locale)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {tPack(shop.cheapestOffer.packType as "bulk" | "variety" | "sampler" | "mixed" | "single")}
                  {shop.cheapestOffer.spoolCount > 1 ? ` · ${shop.cheapestOffer.spoolCount} spools` : ""}
                </p>
              </div>
            ) : (
              <div className="mt-5 rounded-lg border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
                {t("noOffers")}
              </div>
            )}
          </Link>
        ))}
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card rounded-xl px-5 py-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("latestCrawl")}</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">{t("recentlyRefreshed")}</h2>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.recentOffers.map((offer) => (
            <Link
              key={offer.id}
              href={`/filaments/${offer.items[0]?.filament.slug ?? ""}`}
              className="rounded-lg border border-border bg-background px-4 py-4 transition-colors hover:bg-white"
            >
              <p className="text-sm text-muted-foreground">{offer.shop.name}</p>
              <p className="mt-1 font-bold tracking-tight">{offer.title}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {offer.freshnessLabel}
                {offer.packType !== "single" ? ` · ${tPack(offer.packType as "bulk" | "variety" | "sampler" | "mixed")}` : ""}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
