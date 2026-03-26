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
      <div className="rounded-xl border border-border bg-card px-5 py-6 text-sm text-muted-foreground">
        No tracked offers yet for this filament.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="grid grid-cols-[1.5fr_0.8fr_1fr] gap-3 border-b border-border bg-secondary/50 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <span>Offer</span>
        <span>Price</span>
        <span>{mode === "detail-first" ? "Freshness & links" : "Freshness & shop"}</span>
      </div>
      <div className="divide-y divide-border">
        {offers.map((offer) => (
          <div
            key={offer.id}
            className="grid grid-cols-[1.5fr_0.8fr_1fr] gap-3 px-5 py-4 transition-colors hover:bg-accent/50"
          >
            <div>
              <p className="text-sm text-muted-foreground">{offer.shop.name}</p>
              {mode === "detail-first" && offer.detailHref ? (
                <Link href={offer.detailHref} className="font-semibold tracking-tight hover:text-primary">
                  {offer.title}
                </Link>
              ) : (
                <p className="font-semibold tracking-tight">{offer.title}</p>
              )}
              <p className="mt-1 text-sm text-muted-foreground">
                {packTypeLabel(offer.packType)}
                {offer.spoolCount > 1 ? ` · ${offer.spoolCount} spools` : ""}
                {offer.latestInStock === false ? " · currently out of stock" : ""}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold tabular-nums">
                {formatCurrency(offer.latestPriceCents, offer.latestCurrency || "EUR")}
              </p>
              <p className="text-sm text-muted-foreground">
                {offer.latestPricePerKgCents != null
                  ? `${formatCurrency(offer.latestPricePerKgCents, offer.latestCurrency || "EUR")}/kg`
                  : "per-kg pending"}
              </p>
            </div>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>{offer.freshnessLabel}</p>
              <div className="flex flex-wrap gap-2">
                {mode === "detail-first" && offer.detailHref && (
                  <Link
                    href={offer.detailHref}
                    className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
                  >
                    Details
                  </Link>
                )}
                <a
                  href={offer.affiliateUrl}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="rounded-lg border border-primary/20 bg-primary-light px-3 py-1.5 text-xs font-semibold text-accent-foreground transition-colors hover:bg-primary/10"
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
