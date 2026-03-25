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
      className="panel group overflow-hidden rounded-[24px] transition-transform duration-200 hover:-translate-y-0.5"
    >
      <div className="relative h-44 overflow-hidden border-b border-[var(--line)] bg-[var(--surface-strong)]">
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
                  : "linear-gradient(140deg, rgba(122,135,96,0.7), rgba(255,250,240,0.95))",
            }}
          />
        )}
        <div className="absolute left-3 top-3">
          <span className="accent-chip rounded-full px-3 py-1 text-xs font-semibold">
            {filament.material}
          </span>
        </div>
      </div>
      <div className="space-y-3 px-4 py-4">
        <div>
          <p className="text-sm text-[var(--muted)]">{filament.brand}</p>
          <h3 className="text-lg font-black tracking-[-0.03em]">
            {filament.series ?? filament.material}
          </h3>
          <p className="text-sm text-[var(--muted)]">
            {filament.colorName ?? "Color pending"} · {filament.weightG}g
          </p>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="rounded-full bg-[rgba(31,34,29,0.06)] px-3 py-1 font-medium text-[var(--muted)]">
            {filament.bestOffer
              ? filament.bestOffer.packType === "single"
                ? `${filament.bestOffer.shop.name} · ${filament.bestOffer.freshnessLabel}`
                : `${filament.bestOffer.spoolCount}x pack · ${filament.bestOffer.shop.name}`
              : "Live tracker page"}
          </span>
          <span className="font-black tracking-[-0.03em]">
            {filament.bestOffer?.latestPriceCents != null
              ? formatCurrency(filament.bestOffer.latestPriceCents, filament.bestOffer.latestCurrency || "EUR")
              : "No live offer"}
          </span>
        </div>
      </div>
    </Link>
  );
}
