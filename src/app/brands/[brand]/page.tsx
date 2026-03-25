import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { FilamentCard } from "@/components/filament-card";
import { getBrandPageData } from "@/lib/data";

export const dynamic = "force-dynamic";

interface BrandPageProps {
  params: Promise<{ brand: string }>;
}

export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
  const { brand } = await params;
  const data = await getBrandPageData(brand);
  if (!data) return {};

  return {
    title: `${data.brand} filament prices`,
    description: `Live offer tracking for ${data.brand} filament in Germany.`,
  };
}

export default async function BrandPage({ params }: BrandPageProps) {
  const { brand } = await params;
  const data = await getBrandPageData(brand);
  if (!data) notFound();

  return (
    <SiteShell>
      <section className="panel rounded-[30px] px-6 py-7">
        <p className="eyebrow">Brand page</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.05em]">{data.brand}</h1>
        <p className="mt-2 max-w-2xl text-[var(--muted)]">
          Crawlable offer pages for {data.brand}, grouped into one place so users can compare materials and colors without bouncing between shop search pages.
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
