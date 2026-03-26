import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SiteShell } from "@/components/site-shell";
import { FilamentCard } from "@/components/filament-card";
import { getHomePageData } from "@/lib/data";

export const dynamic = "force-dynamic";

interface HomePageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}

export default async function HomePage({ params, searchParams }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { q = "" } = await searchParams;
  const data = await getHomePageData(q);
  const t = await getTranslations("home");

  return (
    <SiteShell activeHref="/">
      <section className="grid overflow-hidden rounded-xl border border-border bg-card lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6 px-6 py-8 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("badge")}
          </p>
          <div className="max-w-3xl space-y-4">
            <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              {t("title")}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground">
              {t("description")}
            </p>
          </div>

          <form className="flex flex-col gap-3 sm:flex-row">
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder={t("searchPlaceholder")}
              className="h-11 flex-1 rounded-lg border border-border bg-background px-4 text-sm outline-none ring-0 placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-ring"
            />
            <button
              type="submit"
              className="h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              {t("searchButton")}
            </button>
          </form>
        </div>

        <div className="border-t border-border bg-secondary/30 px-6 py-8 lg:border-l lg:border-t-0">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: t("trackedFilaments"), value: data.stats.filamentCount },
              { label: t("filamentsWithPrices"), value: data.stats.pricedFilamentCount },
              { label: t("activeShops"), value: data.stats.shopCount },
              { label: t("liveOffers"), value: data.stats.offerCount },
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
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("filamentIndex")}</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight">
                {q ? t("searchResults", { q }) : t("freshPages")}
              </h2>
            </div>
            {!q && (
              <Link href="/materials" className="text-sm font-semibold text-primary hover:text-primary-hover">
                {t("browseMaterials")}
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
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("activeRetailers")}</p>
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
              {t("openShopCoverage")}
            </Link>
          </section>

          <section className="rounded-xl border border-border bg-card px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("popularMaterials")}</p>
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
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("recentlyRefreshed")}</p>
            <div className="mt-4 space-y-2">
              {data.recentOffers.map((offer) => (
                <Link
                  key={offer.id}
                  href={`/filaments/${offer.items[0]?.filament.slug ?? ""}`}
                  className="block rounded-lg border border-border bg-background px-4 py-3 transition-colors hover:bg-accent/50"
                >
                  <p className="text-xs font-medium text-muted-foreground">{offer.shop.name}</p>
                  <p className="font-semibold tracking-tight">{offer.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{offer.freshnessLabel}</p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </section>
    </SiteShell>
  );
}
