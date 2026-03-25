import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { OfferList } from "@/components/offer-list";
import { getShopPageData } from "@/lib/data";

export const dynamic = "force-dynamic";

interface ShopPageProps {
  params: Promise<{ shop: string }>;
}

export async function generateMetadata({ params }: ShopPageProps): Promise<Metadata> {
  const { shop } = await params;
  const data = await getShopPageData(shop);
  if (!data) return {};

  return {
    title: `${data.shop.name} filament offers`,
    description: `Tracked offers currently visible on ${data.shop.name} for the German market.`,
  };
}

export default async function ShopPage({ params }: ShopPageProps) {
  const { shop } = await params;
  const data = await getShopPageData(shop);
  if (!data) notFound();
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
      <section className="panel rounded-[30px] px-6 py-7">
        <p className="eyebrow">Retailer page</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.05em]">{data.shop.name}</h1>
        <p className="mt-2 max-w-2xl text-[var(--muted)]">
          Offer freshness and landing pages from {data.shop.name}, refreshed by the tracker worker and surfaced for public discovery.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          {[
            { label: "Live offers", value: data.stats.offerCount },
            { label: "Tracked filaments", value: data.stats.filamentCount },
            { label: "Pack offers", value: data.stats.packOfferCount },
            { label: "Freshness", value: data.stats.freshnessLabel },
          ].map((item) => (
            <div key={item.label} className="rounded-[22px] border border-[var(--line)] bg-white/70 px-4 py-4">
              <p className="eyebrow">{item.label}</p>
              <p className="mt-3 text-2xl font-black tracking-[-0.05em]">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 space-y-6">
        <div>
          <p className="eyebrow">Single spool offers</p>
          <h2 className="mt-2 text-3xl font-black tracking-[-0.05em]">Details first, shop second</h2>
          <div className="mt-4">
            <OfferList offers={singleOffers} mode="detail-first" />
          </div>
        </div>

        <div>
          <p className="eyebrow">Pack offers</p>
          <h2 className="mt-2 text-3xl font-black tracking-[-0.05em]">Multipacks, sampler sets, and bundles</h2>
          <div className="mt-4">
            <OfferList offers={packOffers} mode="detail-first" />
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
