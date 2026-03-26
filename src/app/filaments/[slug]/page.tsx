import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { OfferList } from "@/components/offer-list";
import { FilamentCard } from "@/components/filament-card";
import { SafeImage } from "@/components/safe-image";
import { getFilamentDetail } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface FilamentPageProps {
  params: Promise<{ slug: string }>;
}

type FilamentDetailData = NonNullable<Awaited<ReturnType<typeof getFilamentDetail>>>;
type FilamentOffer = FilamentDetailData["offers"][number];

function formatDateTime(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function summarizeOfferHistory(offer: FilamentOffer) {
  const snapshots = [...offer.snapshots].sort((a, b) => a.scrapedAt.getTime() - b.scrapedAt.getTime());
  const first = snapshots[0] ?? null;
  const latest = snapshots[snapshots.length - 1] ?? null;
  const distinctPrices = [...new Set(snapshots.map((snapshot) => snapshot.priceCents))];
  const changeCents =
    first && latest && first.priceCents != null && latest.priceCents != null
      ? latest.priceCents - first.priceCents
      : null;

  return { first, latest, distinctPrices, changeCents };
}

function buildTimelinePoints(priceHistory: Array<{ priceCents: number; scrapedAt: Date }>) {
  const dailyLowest = new Map<string, { label: string; priceCents: number; scrapedAt: Date }>();

  for (const entry of priceHistory) {
    const key = entry.scrapedAt.toISOString().slice(0, 10);
    const existing = dailyLowest.get(key);
    if (!existing || entry.priceCents < existing.priceCents) {
      dailyLowest.set(key, {
        label: new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "short" }).format(entry.scrapedAt),
        priceCents: entry.priceCents,
        scrapedAt: entry.scrapedAt,
      });
    }
  }

  return [...dailyLowest.values()].sort((a, b) => a.scrapedAt.getTime() - b.scrapedAt.getTime());
}

function buildSparklinePath(points: Array<{ priceCents: number }>) {
  if (points.length === 0) return "";
  if (points.length === 1) return "M 6 28 L 114 28";

  const prices = points.map((point) => point.priceCents);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = Math.max(1, max - min);

  return points
    .map((point, index) => {
      const x = 6 + (index * 108) / Math.max(1, points.length - 1);
      const y = 28 - ((point.priceCents - min) / span) * 20;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export async function generateMetadata({ params }: FilamentPageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getFilamentDetail(slug);
  if (!data) return {};

  const lowest = data.offers[0];

  return {
    title: `${data.filament.brand} ${data.filament.series ?? data.filament.material} ${data.filament.colorName ?? ""}`.trim(),
    description:
      lowest != null
        ? `Compare current ${data.filament.brand} offers starting at ${formatCurrency(lowest.latestPriceCents, lowest.latestCurrency || "EUR")}.`
        : `Tracked price page for ${data.filament.brand} ${data.filament.material}.`,
    alternates: {
      canonical: data.filament.canonicalUrl,
    },
  };
}

export default async function FilamentPage({ params }: FilamentPageProps) {
  const { slug } = await params;
  const data = await getFilamentDetail(slug);
  if (!data) notFound();

  const [singleOffers, packOffers] = [
    data.offers.filter((offer) => offer.packType === "single"),
    data.offers.filter((offer) => offer.packType !== "single"),
  ];

  const lowest = data.offers[0] ?? null;
  const timelinePoints = buildTimelinePoints(
    data.priceHistory.filter((entry) => entry.priceCents != null) as Array<{ priceCents: number; scrapedAt: Date }>,
  );
  const priceSparkline = buildSparklinePath(timelinePoints);
  const hasMeaningfulPriceMovement = new Set(timelinePoints.map((entry) => entry.priceCents)).size > 1;
  const offerHistorySummaries = data.offers.map((offer) => ({
    offer,
    ...summarizeOfferHistory(offer),
  }));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${data.filament.brand} ${data.filament.series ?? data.filament.material} ${data.filament.colorName ?? ""}`.trim(),
    brand: data.filament.brand,
    color: data.filament.colorName,
    category: data.filament.material,
    image: data.images.length > 0 ? data.images : undefined,
    sku: data.filament.bambuCode ?? data.filament.ean ?? undefined,
    offers: data.offers.slice(0, 8).map((offer) => ({
      "@type": "Offer",
      priceCurrency: offer.latestCurrency || "EUR",
      price: offer.latestPriceCents != null ? (offer.latestPriceCents / 100).toFixed(2) : undefined,
      availability: offer.latestInStock === false
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
      url: offer.affiliateUrl,
      seller: {
        "@type": "Organization",
        name: offer.shop.name,
      },
    })),
  };

  return (
    <SiteShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="overflow-hidden rounded-xl border border-border bg-card lg:grid lg:grid-cols-[0.95fr_1.05fr]">
        <div className="border-b border-border bg-secondary lg:border-b-0 lg:border-r">
          {data.images.length > 0 ? (
            <div className="flex flex-col">
              {/* Primary image */}
              <SafeImage
                src={data.images[0]}
                alt={`${data.filament.brand} ${data.filament.colorName ?? ""}`}
                className="h-[320px] w-full object-cover"
              />
              {/* Additional images — hide broken ones */}
              {data.images.length > 1 && (
                <div className="flex gap-px border-t border-border [&:empty]:hidden">
                  {data.images.slice(1, 4).map((url, i) => (
                    <SafeImage
                      key={i}
                      src={url}
                      alt={`${data.filament.brand} ${data.filament.colorName ?? ""} — image ${i + 2}`}
                      className="h-24 flex-1 object-cover border-r border-border last:border-r-0"
                    />
                  ))}
                </div>
              )}
            </div>
          ) : data.filament.colorHex ? (
            <div className="flex h-[320px] w-full items-center justify-center" style={{ background: data.filament.colorHex }}>
              <div
                className="h-36 w-36 rounded-full border-[16px] opacity-20"
                style={{ borderColor: "rgba(255,255,255,0.2)" }}
              />
            </div>
          ) : (
            <div className="flex h-[320px] w-full items-center justify-center bg-gradient-to-br from-secondary to-muted/30">
              <span className="text-lg font-medium text-muted-foreground">No preview</span>
            </div>
          )}
        </div>
        <div className="space-y-6 px-6 py-7 sm:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Canonical filament</p>
            <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              {data.filament.brand}
              <span className="block">
                {data.filament.series ?? data.filament.material}
              </span>
            </h1>
            <p className="mt-3 text-base text-muted-foreground">
              {data.filament.colorName ?? "Color pending"} · {data.filament.material} · {data.filament.weightG}g
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-background px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lowest current price</p>
              <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight">
                {lowest ? formatCurrency(lowest.latestPriceCents, lowest.latestCurrency || "EUR") : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tracked offers</p>
              <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight">{data.offers.length}</p>
            </div>
            <div className="rounded-lg border border-border bg-background px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Freshness</p>
              <p className="mt-2 text-2xl font-bold tracking-tight">
                {lowest?.freshnessLabel ?? "pending"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Single spool offers</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">Buy exactly this spool</h2>
          </div>
          <OfferList offers={singleOffers} />

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pack offers</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">Bulk, sampler, and mixed packs</h2>
          </div>
          <OfferList offers={packOffers} />
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-card px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Price history</p>
            <div className="mt-4 space-y-4">
              {timelinePoints.length > 0 && hasMeaningfulPriceMovement ? (
                <div className="rounded-lg border border-border bg-background px-4 py-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Lowest daily price · {formatDateTime(timelinePoints[0].scrapedAt)} – {formatDateTime(timelinePoints[timelinePoints.length - 1].scrapedAt)}
                  </p>
                  <div className="mt-3 flex gap-4">
                    {/* Y-axis labels */}
                    <div className="flex w-16 shrink-0 flex-col justify-between text-right text-xs tabular-nums text-muted-foreground">
                      <span>{formatCurrency(Math.max(...timelinePoints.map((p) => p.priceCents)), lowest?.latestCurrency || "EUR")}</span>
                      <span>{formatCurrency(Math.min(...timelinePoints.map((p) => p.priceCents)), lowest?.latestCurrency || "EUR")}</span>
                    </div>
                    {/* Chart */}
                    <div className="flex-1">
                      <svg viewBox="0 0 120 34" className="h-24 w-full" preserveAspectRatio="none">
                        <path
                          d={priceSparkline}
                          fill="none"
                          stroke="var(--primary)"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{timelinePoints[0]?.label}</span>
                        <span>{timelinePoints[timelinePoints.length - 1]?.label}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : timelinePoints.length > 0 ? (
                <div className="rounded-lg border border-border bg-background px-4 py-4">
                  <p className="text-sm text-muted-foreground">
                    No price change detected yet. Tracking since {formatDateTime(timelinePoints[0].scrapedAt)}.
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Current price: <span className="font-semibold tabular-nums text-foreground">{formatCurrency(timelinePoints[0].priceCents, lowest?.latestCurrency || "EUR")}</span>
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
                  No snapshots recorded yet for this page.
                </div>
              )}

              <div className="space-y-3">
                {offerHistorySummaries.map(({ offer, first, latest, distinctPrices, changeCents }) => (
                  <div key={offer.id} className="rounded-lg border border-border bg-background px-4 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">{offer.shop.name}</p>
                        <p className="font-semibold tracking-tight">{offer.title}</p>
                      </div>
                      <p className="text-lg font-semibold tabular-nums">
                        {formatCurrency(offer.latestPriceCents, offer.latestCurrency || "EUR")}
                      </p>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                      <p>
                        {latest ? `Last checked ${formatDateTime(latest.scrapedAt)}` : "Waiting for first snapshot"}
                      </p>
                      <p>
                        {first
                          ? distinctPrices.length > 1 && changeCents != null
                            ? `${changeCents < 0 ? "Down" : "Up"} ${formatCurrency(Math.abs(changeCents), offer.latestCurrency || "EUR")} since ${formatDateTime(first.scrapedAt)}`
                            : `Unchanged since ${formatDateTime(first.scrapedAt)}`
                          : "No history yet"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Related pages</p>
            <div className="mt-4 grid gap-4">
              {data.related.map((filament) => (
                <FilamentCard key={filament.id} filament={filament} />
              ))}
            </div>
          </section>
        </div>
      </section>
    </SiteShell>
  );
}
