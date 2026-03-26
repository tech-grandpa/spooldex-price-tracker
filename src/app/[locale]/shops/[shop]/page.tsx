import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteShell } from "@/components/site-shell";
import { OfferList } from "@/components/offer-list";
import { getShopPageData } from "@/lib/data";

export const dynamic = "force-dynamic";

interface ShopPageProps {
  params: Promise<{ locale: string; shop: string }>;
}

export async function generateMetadata({ params }: ShopPageProps): Promise<Metadata> {
  const { locale, shop } = await params;
  const data = await getShopPageData(shop);
  if (!data) return {};
  const t = await getTranslations({ locale, namespace: "shopDetail" });

  return {
    title: t("metaTitle", { shop: data.shop.name }),
    description: t("metaDescription", { shop: data.shop.name }),
  };
}

export default async function ShopPage({ params }: ShopPageProps) {
  const { locale, shop } = await params;
  setRequestLocale(locale);
  const data = await getShopPageData(shop);
  if (!data) notFound();
  const t = await getTranslations("shopDetail");

  const singleOffers = data.singleOffers.map((offer) => ({
    ...offer,
    detailHref: offer.items[0]?.filament.slug ? `/filaments/${offer.items[0].filament.slug}` : null,
  }));
  const packOffers = data.packOffers.map((offer) => ({
    ...offer,
    detailHref: offer.items[0]?.filament.slug ? `/filaments/${offer.items[0].filament.slug}` : null,
  }));

  return (
    <SiteShell activeHref="/shops">
      <section className="rounded-xl border border-border bg-card rounded-[30px] px-6 py-7">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("pageLabel")}</p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">{data.shop.name}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          {t("description", { shop: data.shop.name })}
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          {[
            { label: t("liveOffers"), value: data.stats.offerCount },
            { label: t("trackedFilaments"), value: data.stats.filamentCount },
            { label: t("packOffers"), value: data.stats.packOfferCount },
            { label: t("freshness"), value: data.stats.freshnessLabel },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-border bg-background px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{item.label}</p>
              <p className="mt-3 text-2xl font-bold tracking-tight">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("singleSpool")}</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight">{t("detailFirst")}</h2>
          <div className="mt-4">
            <OfferList offers={singleOffers} mode="detail-first" />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("packOffers")}</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight">{t("packDescription")}</h2>
          <div className="mt-4">
            <OfferList offers={packOffers} mode="detail-first" />
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
