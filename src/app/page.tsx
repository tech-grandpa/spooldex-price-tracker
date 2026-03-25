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
      <section className="panel grid overflow-hidden rounded-[32px] lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6 px-6 py-8 sm:px-8">
          <p className="eyebrow">Public crawlable catalog · DE market first</p>
          <div className="max-w-3xl space-y-4">
            <h1 className="font-serif text-5xl font-black leading-[0.92] tracking-[-0.06em] sm:text-6xl">
              Compare filament offers without waiting for marketplaces to approve you first.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-[var(--muted)]">
              Spooldex Tracker starts with open shop coverage, freshness timestamps, and public landing pages that can rank. Phase 1 is about discovery and trust, not gated affiliate APIs.
            </p>
          </div>

          <form className="flex flex-col gap-3 rounded-[28px] border border-[var(--line)] bg-white/70 p-4 sm:flex-row">
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search Bambu PLA Basic, Prusament PETG, eSUN white..."
              className="h-14 flex-1 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 text-base outline-none ring-0 placeholder:text-[var(--muted)]"
            />
            <button
              type="submit"
              className="h-14 rounded-2xl bg-[var(--foreground)] px-6 text-sm font-bold uppercase tracking-[0.16em] text-[var(--surface)]"
            >
              Search live catalog
            </button>
          </form>
        </div>

        <div className="border-t border-[var(--line)] bg-[rgba(31,34,29,0.04)] px-6 py-8 lg:border-l lg:border-t-0">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "Tracked filaments", value: data.stats.filamentCount },
              { label: "Filaments with prices", value: data.stats.pricedFilamentCount },
              { label: "Active shops", value: data.stats.shopCount },
              { label: "Live offers", value: data.stats.offerCount },
            ].map((item) => (
              <div key={item.label} className="rounded-[24px] border border-[var(--line)] bg-white/70 px-4 py-4">
                <p className="eyebrow">{item.label}</p>
                <p className="mt-3 text-4xl font-black tracking-[-0.06em]">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Filament index</p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.05em]">
                {q ? `Search results for “${q}”` : "Fresh canonical pages"}
              </h2>
            </div>
            {!q && (
              <Link href="/materials" className="text-sm font-semibold text-[var(--accent-strong)]">
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
          <section className="panel rounded-[28px] px-5 py-5">
            <p className="eyebrow">Active retailers</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {data.shops.map((shop) => (
                <Link
                  key={shop.id}
                  href={`/shops/${shop.id}`}
                  className="accent-chip rounded-full px-3 py-2 text-sm font-semibold"
                >
                  {shop.name} · {shop.offerCount}
                </Link>
              ))}
            </div>
            <Link href="/shops" className="mt-4 inline-flex text-sm font-semibold text-[var(--accent-strong)]">
              Open shop coverage
            </Link>
          </section>

          <section className="panel rounded-[28px] px-5 py-5">
            <p className="eyebrow">Popular materials</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {data.materials.slice(0, 12).map((material) => (
                <Link
                  key={material.slug}
                  href={`/materials/${material.slug}`}
                  className="rounded-full bg-white/70 px-3 py-2 text-sm font-semibold text-[var(--muted)]"
                >
                  {material.name}
                </Link>
              ))}
            </div>
          </section>

          <section className="panel rounded-[28px] px-5 py-5">
            <p className="eyebrow">Recently refreshed offers</p>
            <div className="mt-4 space-y-3">
              {data.recentOffers.map((offer) => (
                <a
                  key={offer.id}
                  href={`/filaments/${offer.items[0]?.filament.slug ?? ""}`}
                  className="block rounded-[22px] border border-[var(--line)] bg-white/70 px-4 py-3 transition-colors hover:bg-white"
                >
                  <p className="text-sm text-[var(--muted)]">{offer.shop.name}</p>
                  <p className="font-bold tracking-[-0.02em]">{offer.title}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">{offer.freshnessLabel}</p>
                </a>
              ))}
            </div>
          </section>
        </div>
      </section>
    </SiteShell>
  );
}
