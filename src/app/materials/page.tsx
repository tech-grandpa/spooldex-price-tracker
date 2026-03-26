import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { FilamentCard } from "@/components/filament-card";
import { getMaterialsIndexPageData } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Filament materials tracked in Germany",
  description: "Browse tracked filament materials first, then drill into live price pages for the exact material you want.",
};

export default async function MaterialsPage() {
  const data = await getMaterialsIndexPageData();

  return (
    <SiteShell activeHref="/materials">
      <section className="rounded-xl border border-border bg-card overflow-hidden rounded-xl px-6 py-7 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Material index</p>
        <div className="mt-4 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h1 className="text-2xl font-bold leading-[0.94] tracking-tight">
              Start with the material, then drill into the exact spool.
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
              This is the clean entry point the tracker was missing. Pick PLA, PETG, ABS, or a specialty blend first, then move into the live filament pages from there.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.materials.slice(0, 4).map((material) => (
              <Link
                key={material.href}
                href={material.href}
                className="rounded-lg border border-border bg-background px-4 py-4 transition-colors hover:bg-white"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Material</p>
                <p className="mt-3 text-2xl font-bold tracking-tight">{material.name}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {material.pricedCount} priced pages · {material.totalCount} tracked filaments
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
              <p className="mt-1">{material.pricedCount} live pages with prices</p>
              <p>{material.totalCount} total tracked pages</p>
            </div>
          </div>
        ))}
      </section>
    </SiteShell>
  );
}
