import Link from "next/link";
import type { Metadata } from "next";
import { SiteShell } from "@/components/site-shell";
import { getShopsIndexPageData } from "@/lib/data";
import { formatCurrency, packTypeLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tracked filament shops in Germany",
  description: "See which filament retailers are currently covered by Spooldex Tracker, how many live offers each shop contributes, and when they were last checked.",
};

export default async function ShopsPage() {
  const data = await getShopsIndexPageData();

  return (
    <SiteShell activeHref="/shops">
      <section className="panel overflow-hidden rounded-[32px] px-6 py-7 sm:px-8">
        <p className="eyebrow">Shop coverage</p>
        <div className="mt-4 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h1 className="font-serif text-5xl font-black leading-[0.94] tracking-[-0.06em]">
              All shops currently tracked for Germany.
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--muted)]">
              This index shows every live retailer in the current crawl set, including how broad the coverage is and whether pack offers are present.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Tracked shops", value: data.shops.length },
              { label: "Live offers", value: data.shops.reduce((sum, shop) => sum + shop.offerCount, 0) },
              { label: "Pack offers", value: data.shops.reduce((sum, shop) => sum + shop.packOfferCount, 0) },
            ].map((item) => (
              <div key={item.label} className="rounded-[24px] border border-[var(--line)] bg-white/70 px-4 py-4">
                <p className="eyebrow">{item.label}</p>
                <p className="mt-3 text-4xl font-black tracking-[-0.06em]">{item.value}</p>
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
            className="panel group rounded-[28px] px-5 py-5 transition-transform duration-200 hover:-translate-y-1"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">{shop.market.toUpperCase()} retailer</p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.05em]">{shop.name}</h2>
              </div>
              <span className="accent-chip rounded-full px-3 py-2 text-xs font-semibold">
                {shop.freshnessLabel}
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-[var(--line)] bg-white/70 px-3 py-3">
                <p className="eyebrow">Offers</p>
                <p className="mt-2 text-2xl font-black tracking-[-0.04em]">{shop.offerCount}</p>
              </div>
              <div className="rounded-[22px] border border-[var(--line)] bg-white/70 px-3 py-3">
                <p className="eyebrow">Filaments</p>
                <p className="mt-2 text-2xl font-black tracking-[-0.04em]">{shop.filamentCount}</p>
              </div>
              <div className="rounded-[22px] border border-[var(--line)] bg-white/70 px-3 py-3">
                <p className="eyebrow">Pack offers</p>
                <p className="mt-2 text-2xl font-black tracking-[-0.04em]">{shop.packOfferCount}</p>
              </div>
            </div>

            {shop.cheapestOffer ? (
              <div className="mt-5 rounded-[22px] border border-[var(--line)] bg-[rgba(31,34,29,0.04)] px-4 py-4">
                <p className="text-sm text-[var(--muted)]">Best visible price</p>
                <p className="mt-1 text-lg font-black tracking-[-0.03em]">
                  {formatCurrency(shop.cheapestOffer.latestPriceCents, shop.cheapestOffer.latestCurrency)}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {packTypeLabel(shop.cheapestOffer.packType)}
                  {shop.cheapestOffer.spoolCount > 1 ? ` · ${shop.cheapestOffer.spoolCount} spools` : ""}
                </p>
              </div>
            ) : (
              <div className="mt-5 rounded-[22px] border border-dashed border-[var(--line)] px-4 py-4 text-sm text-[var(--muted)]">
                No priced offers published yet for this shop.
              </div>
            )}
          </Link>
        ))}
      </section>

      <section className="mt-6 panel rounded-[28px] px-5 py-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow">Latest crawl results</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.05em]">Recently refreshed offers</h2>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.recentOffers.map((offer) => (
            <Link
              key={offer.id}
              href={`/filaments/${offer.items[0]?.filament.slug ?? ""}`}
              className="rounded-[22px] border border-[var(--line)] bg-white/70 px-4 py-4 transition-colors hover:bg-white"
            >
              <p className="text-sm text-[var(--muted)]">{offer.shop.name}</p>
              <p className="mt-1 font-bold tracking-[-0.02em]">{offer.title}</p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {offer.freshnessLabel}
                {offer.packType !== "single" ? ` · ${packTypeLabel(offer.packType)}` : ""}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
