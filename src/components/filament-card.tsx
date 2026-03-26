import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

function ColorSwatchPreview({ colorHex, colorName }: { colorHex: string | null; colorName: string | null }) {
  if (!colorHex) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary to-muted/30">
        <span className="text-sm font-medium text-muted-foreground">{colorName || "No preview"}</span>
      </div>
    );
  }

  // Parse hex to determine if color is light or dark for contrast
  const hex = colorHex.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16) || 128;
  const g = parseInt(hex.substring(2, 4), 16) || 128;
  const b = parseInt(hex.substring(4, 6), 16) || 128;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const textColor = luminance > 0.6 ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.6)";

  return (
    <div className="relative flex h-full w-full items-center justify-center" style={{ background: colorHex }}>
      {/* Spool ring visualization */}
      <div
        className="absolute h-28 w-28 rounded-full border-[12px] opacity-30"
        style={{ borderColor: luminance > 0.6 ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.15)" }}
      />
      <div
        className="absolute h-12 w-12 rounded-full opacity-25"
        style={{ background: luminance > 0.6 ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.1)" }}
      />
      {colorName && (
        <span className="relative z-10 text-xs font-semibold" style={{ color: textColor }}>
          {colorName}
        </span>
      )}
    </div>
  );
}

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
  // Only use the filament's canonical image — offer images are often wrong color
  const imageUrl = filament.imageUrl || null;

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
          <ColorSwatchPreview colorHex={filament.colorHex} colorName={filament.colorName} />
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
