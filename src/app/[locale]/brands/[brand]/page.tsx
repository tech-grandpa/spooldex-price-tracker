import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteShell } from "@/components/site-shell";
import { FilamentCard } from "@/components/filament-card";
import { getBrandPageData } from "@/lib/data";

export const dynamic = "force-dynamic";

interface BrandPageProps {
  params: Promise<{ locale: string; brand: string }>;
}

export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
  const { locale, brand } = await params;
  const data = await getBrandPageData(brand);
  if (!data) return {};
  const t = await getTranslations({ locale, namespace: "brand" });

  return {
    title: t("metaTitle", { brand: data.brand }),
    description: t("metaDescription", { brand: data.brand }),
  };
}

export default async function BrandPage({ params }: BrandPageProps) {
  const { locale, brand } = await params;
  setRequestLocale(locale);
  const data = await getBrandPageData(brand);
  if (!data) notFound();
  const t = await getTranslations("brand");

  return (
    <SiteShell>
      <section className="rounded-xl border border-border bg-card rounded-[30px] px-6 py-7">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("pageLabel")}</p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">{data.brand}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          {t("description", { brand: data.brand })}
        </p>
      </section>
      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.filaments.map((filament) => (
          <FilamentCard key={filament.id} filament={filament} />
        ))}
      </section>
    </SiteShell>
  );
}
