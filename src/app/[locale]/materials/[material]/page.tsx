import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteShell } from "@/components/site-shell";
import { FilamentCard } from "@/components/filament-card";
import { getMaterialPageData } from "@/lib/data";

export const dynamic = "force-dynamic";

interface MaterialPageProps {
  params: Promise<{ locale: string; material: string }>;
}

export async function generateMetadata({ params }: MaterialPageProps): Promise<Metadata> {
  const { locale, material } = await params;
  const data = await getMaterialPageData(material);
  if (!data) return {};
  const t = await getTranslations({ locale, namespace: "materialDetail" });

  return {
    title: t("metaTitle", { material: data.material }),
    description: t("metaDescription", { material: data.material }),
  };
}

export default async function MaterialPage({ params }: MaterialPageProps) {
  const { locale, material } = await params;
  setRequestLocale(locale);
  const data = await getMaterialPageData(material);
  if (!data) notFound();
  const t = await getTranslations("materialDetail");

  return (
    <SiteShell activeHref="/materials">
      <section className="rounded-xl border border-border bg-card rounded-[30px] px-6 py-7">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("pageLabel")}</p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">{data.material}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          {t("description", { material: data.material })}
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {data.materials.map((entry) => (
            <a
              key={entry.slug}
              href={`/materials/${entry.slug}`}
              className={`rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
                entry.name === data.material
                  ? "bg-[var(--foreground)] text-[#fffaf0]"
                  : "bg-background text-muted-foreground hover:bg-white hover:text-[var(--foreground)]"
              }`}
            >
              {entry.name}
            </a>
          ))}
        </div>
      </section>
      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.filaments.map((filament) => (
          <FilamentCard key={filament.id} filament={filament} />
        ))}
      </section>
    </SiteShell>
  );
}
