import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { FilamentCard } from "@/components/filament-card";
import { getHomePageData } from "@/lib/data";

export const dynamic = "force-dynamic";

interface HomePageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { q = "" } = await searchParams;
  const data = await getHomePageData(q);

  return (
    <SiteShell activeHref="/">
      <section className="grid overflow-hidden rounded-xl border border-border bg-card lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6 px-6 py-8 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Public crawlable catalog · DE market first
          </p>
          <div className="max-w-3xl space-y-4">
            <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              Compare filament offers without waiting for marketplaces to approve you first.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground">
              Spooldex Tracker starts with open shop coverage, freshness timestamps, and public landing pages that can rank. Phase 1 is about discovery and trust, not gated affiliate APIs.
            </p>
          </div>

          <form className="flex flex-col gap-3 sm:flex-row">
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search Bambu PLA Basic, Prusament PETG..."
              className="h-11 flex-1 rounded-lg border border-border bg-background px-4 text-sm outline-none ring-0 placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-ring"
            />
            <button
              type="submit"
              className="h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              Search live catalog
            </button>
          </form>
        </div>

        <div className="border-t border-border bg-secondary/30 px-6 py-8 lg:border-l lg:border-t-0">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "Tracked filaments", value: data.stats.filamentCount },
              { label: "Filaments with prices", value: data.stats.pricedFilamentCount },
              { label: "Active shops", value: data.stats.shopCount },
              { label: "Live offers", value: data.stats.offerCount },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-border bg-card px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{item.label}</p>
                <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_0.9fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Filament index</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight">
                {q ? `Search results for "${q}"` : "Fresh canonical pages"}
              </h2>
            </div>
            {!q && (
              <Link href="/materials" className="text-sm font-semibold text-primary hover:text-primary-hover">
                Browse materials
              </Link>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {data.filaments.map((filament) => (
              <FilamentCard key={filament.id} filament={filament} />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-card px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active retailers</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {data.shops.map((shop) => (
                <Link
                  key={shop.id}
                  href={`/shops/${shop.id}`}
                  className="rounded-full border border-primary/20 bg-primary-light px-3 py-1.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-primary/10"
                >
                  {shop.name} · {shop.offerCount}
                </Link>
              ))}
            </div>
            <Link href="/shops" className="mt-4 inline-flex text-sm font-semibold text-primary hover:text-primary-hover">
              Open shop coverage
            </Link>
          </section>

          <section className="rounded-xl border border-border bg-card px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Popular materials</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {data.materials.slice(0, 12).map((material) => (
                <Link
                  key={material.slug}
                  href={`/materials/${material.slug}`}
                  className="rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
                >
                  {material.name}
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recently refreshed offers</p>
            <div className="mt-4 space-y-2">
              {data.recentOffers.map((offer) => (
                <a
                  key={offer.id}
                  href={`/filaments/${offer.items[0]?.filament.slug ?? ""}`}
                  className="block rounded-lg border border-border bg-background px-4 py-3 transition-colors hover:bg-accent/50"
                >
                  <p className="text-xs font-medium text-muted-foreground">{offer.shop.name}</p>
                  <p className="font-semibold tracking-tight">{offer.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{offer.freshnessLabel}</p>
                </a>
              ))}
            </div>
          </section>
        </div>
      </section>
    </SiteShell>
  );
}
