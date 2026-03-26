import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

interface FilamentCardProps {
  filament: {
    slug: string;
    brand: string;
    series: string | null;
    material: string;
    colorName: string | null;
    colorHex: string | null;
    imageUrl: string | null;
    weightG: number;
    bestOffer?: {
      imageUrl?: string | null;
      latestPriceCents: number | null;
      latestCurrency: string | null;
      freshnessLabel: string;
      packType: string;
      spoolCount: number;
      shop: {
        name: string;
      };
    } | null;
  };
}

export function FilamentCard({ filament }: FilamentCardProps) {
  const imageUrl = filament.imageUrl || filament.bestOffer?.imageUrl || null;

  return (
    <Link
      href={`/filaments/${filament.slug}`}
      className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow duration-200 hover:shadow-md"
    >
      <div className="relative h-44 overflow-hidden border-b border-border bg-secondary">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={`${filament.brand} ${filament.series ?? filament.material} ${filament.colorName ?? ""}`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className="h-full w-full"
            style={{
              background:
                filament.colorHex
                  ? `linear-gradient(140deg, ${filament.colorHex}, rgba(255,255,255,0.75))`
                  : "linear-gradient(140deg, rgba(12,133,122,0.15), rgba(250,250,250,0.95))",
            }}
          />
        )}
        <div className="absolute left-3 top-3">
          <span className="rounded-full border border-primary/20 bg-primary-light px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
            {filament.material}
          </span>
        </div>
      </div>
      <div className="space-y-3 px-4 py-4">
        <div>
          <p className="text-sm text-muted-foreground">{filament.brand}</p>
          <h3 className="text-base font-semibold tracking-tight">
            {filament.series ?? filament.material}
          </h3>
          <p className="text-sm text-muted-foreground">
            {filament.colorName ?? "Color pending"} · {filament.weightG}g
          </p>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {filament.bestOffer
              ? filament.bestOffer.packType === "single"
                ? `${filament.bestOffer.shop.name} · ${filament.bestOffer.freshnessLabel}`
                : `${filament.bestOffer.spoolCount}x pack · ${filament.bestOffer.shop.name}`
              : "Live tracker page"}
          </span>
          <span className="font-semibold tabular-nums">
            {filament.bestOffer?.latestPriceCents != null
              ? formatCurrency(filament.bestOffer.latestPriceCents, filament.bestOffer.latestCurrency || "EUR")
              : "—"}
          </span>
        </div>
      </div>
    </Link>
  );
}
