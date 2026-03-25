import Link from "next/link";
import { formatCurrency, packTypeLabel } from "@/lib/utils";

interface OfferListProps {
  mode?: "shop-first" | "detail-first";
  offers: Array<{
    id: string;
    title: string;
    affiliateUrl: string;
    detailHref?: string | null;
    packType: string;
    spoolCount: number;
    latestPriceCents: number | null;
    latestCurrency: string | null;
    latestPricePerKgCents: number | null;
    latestInStock: boolean | null;
    freshnessLabel: string;
    shop: {
      id: string;
      name: string;
    };
  }>;
}

export function OfferList({ offers, mode = "shop-first" }: OfferListProps) {
  if (offers.length === 0) {
    return (
      <div className="panel rounded-[24px] px-5 py-6 text-sm text-[var(--muted)]">
        No tracked offers yet for this filament.
      </div>
    );
  }

  return (
    <div className="panel overflow-hidden rounded-[24px]">
      <div className="grid grid-cols-[1.5fr_0.8fr_1fr] gap-3 border-b border-[var(--line)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        <span>Offer</span>
        <span>Price</span>
        <span>{mode === "detail-first" ? "Freshness & links" : "Freshness & shop"}</span>
      </div>
      <div className="divide-y divide-[var(--line)]">
        {offers.map((offer) => (
          <div
            key={offer.id}
            className="grid grid-cols-[1.5fr_0.8fr_1fr] gap-3 px-5 py-4 transition-colors hover:bg-white/60"
          >
            <div>
              <p className="text-sm text-[var(--muted)]">{offer.shop.name}</p>
              {mode === "detail-first" && offer.detailHref ? (
                <Link href={offer.detailHref} className="font-bold tracking-[-0.02em] hover:text-[var(--accent-strong)]">
                  {offer.title}
                </Link>
              ) : (
                <p className="font-bold tracking-[-0.02em]">{offer.title}</p>
              )}
              <p className="mt-1 text-sm text-[var(--muted)]">
                {packTypeLabel(offer.packType)}
                {offer.spoolCount > 1 ? ` · ${offer.spoolCount} spools` : ""}
                {offer.latestInStock === false ? " · currently out of stock" : ""}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-lg font-black tracking-[-0.04em]">
                {formatCurrency(offer.latestPriceCents, offer.latestCurrency || "EUR")}
              </p>
              <p className="text-sm text-[var(--muted)]">
                {offer.latestPricePerKgCents != null
                  ? `${formatCurrency(offer.latestPricePerKgCents, offer.latestCurrency || "EUR")}/kg`
                  : "per-kg pending"}
              </p>
            </div>
            <div className="space-y-3 text-sm text-[var(--muted)]">
              <p>{offer.freshnessLabel}</p>
              <div className="flex flex-wrap gap-2">
                {mode === "detail-first" && offer.detailHref && (
                  <Link
                    href={offer.detailHref}
                    className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface)]"
                  >
                    Details
                  </Link>
                )}
                <a
                  href={offer.affiliateUrl}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="rounded-full border border-[rgba(199,108,45,0.28)] bg-[rgba(199,108,45,0.08)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-strong)] transition-colors hover:bg-[rgba(199,108,45,0.14)]"
                >
                  Go to shop
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
