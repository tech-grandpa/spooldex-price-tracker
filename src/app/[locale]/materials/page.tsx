import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SiteShell } from "@/components/site-shell";
import { FilamentCard } from "@/components/filament-card";
import { getMaterialsIndexPageData } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "materialsIndex" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function MaterialsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const data = await getMaterialsIndexPageData();
  const t = await getTranslations("materialsIndex");

  return (
    <SiteShell activeHref="/materials">
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
          <div className="grid gap-3 sm:grid-cols-2">
            {data.materials.slice(0, 4).map((material) => (
              <Link
                key={material.href}
                href={material.href}
                className="rounded-lg border border-border bg-background px-4 py-4 transition-colors hover:bg-white"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("materialLabel")}</p>
                <p className="mt-3 text-2xl font-bold tracking-tight">{material.name}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("pricedPages", { pricedCount: material.pricedCount, totalCount: material.totalCount })}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.materials.map((material) => (
          <div key={material.href} className="space-y-3">
            <FilamentCard filament={material} />
            <div className="rounded-lg border border-border bg-background px-4 py-4 text-sm text-muted-foreground">
              <p className="font-semibold text-[var(--foreground)]">{material.name}</p>
              <p className="mt-1">{t("livePages", { count: material.pricedCount })}</p>
              <p>{t("totalTracked", { count: material.totalCount })}</p>
            </div>
          </div>
        ))}
      </section>
    </SiteShell>
  );
}
