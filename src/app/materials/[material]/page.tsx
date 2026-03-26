import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { FilamentCard } from "@/components/filament-card";
import { getMaterialPageData } from "@/lib/data";

export const dynamic = "force-dynamic";

interface MaterialPageProps {
  params: Promise<{ material: string }>;
}

export async function generateMetadata({ params }: MaterialPageProps): Promise<Metadata> {
  const { material } = await params;
  const data = await getMaterialPageData(material);
  if (!data) return {};

  return {
    title: `${data.material} filament prices`,
    description: `Tracked ${data.material} filament offers for Germany.`,
  };
}

export default async function MaterialPage({ params }: MaterialPageProps) {
  const { material } = await params;
  const data = await getMaterialPageData(material);
  if (!data) notFound();

  return (
    <SiteShell activeHref="/materials">
      <section className="rounded-xl border border-border bg-card rounded-[30px] px-6 py-7">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Material page</p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">{data.material}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Public comparison pages for {data.material} offers, designed to rank and to help users understand current single-spool and pack pricing.
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
