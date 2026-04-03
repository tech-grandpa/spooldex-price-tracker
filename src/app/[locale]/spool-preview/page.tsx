import { setRequestLocale } from "next-intl/server";
import { SiteShell } from "@/components/site-shell";
import { SpoolPreview } from "@/components/spool-preview";

export const dynamic = "force-dynamic";

const SAMPLES = [
  { colorHex: "#7A8B6F", brand: "ColorFabb", material: "PLA", colorName: "Green Grey", weight: "2000g" },
  { colorHex: "#FF69B4", brand: "Elegoo", material: "PETG Pro", colorName: "Pink", weight: "1000g" },
  { colorHex: "#1A1A1A", brand: "Bambu Lab", material: "PLA Basic", colorName: "Black", weight: "1000g" },
  { colorHex: "#FFFFFF", brand: "Prusament", material: "PETG", colorName: "Signal White", weight: "1000g" },
  { colorHex: "#DC2626", brand: "Polymaker", material: "ASA", colorName: "Red", weight: "1000g" },
  { colorHex: "#2563EB", brand: "3DJake", material: "PLA", colorName: "Blue", weight: "1000g" },
  { colorHex: "#F59E0B", brand: "FormFutura", material: "ABS", colorName: "Solar Yellow", weight: "750g" },
  { colorHex: "#7C3AED", brand: "Extrudr", material: "TPU", colorName: "Purple", weight: "500g" },
  { colorHex: "#92400E", brand: "ColorFabb", material: "WoodFill", colorName: "Wood", weight: "600g" },
  { colorHex: "#0ABAB5", brand: "Proto-Pasta", material: "HTPLA", colorName: "Mermaid Teal", weight: "500g" },
  { colorHex: "#C0C0C0", brand: "Bambu Lab", material: "PLA Silk", colorName: "Silver", weight: "1000g" },
  { colorHex: "#FF4500", brand: "Prusament", material: "PLA", colorName: "Prusa Orange", weight: "1000g" },
  // Multi-color samples
  { colorHex: "#E7C1D5", colorHexes: ["#E7C1D5", "#8EC9E9"], brand: "Bambu Lab", material: "Dual Color", colorName: "Cotton Candy Cloud", weight: "1000g" },
  { colorHex: "#E6B4BB", colorHexes: ["#E6B4BB", "#64CFE0", "#D4A69C"], brand: "Ambrosia", material: "PLA", colorName: "Easter Egg", weight: "1000g" },
  { colorHex: "#9D322A", colorHexes: ["#9D322A", "#DD6B42", "#427A8F"], brand: "Ambrosia", material: "PLA", colorName: "Rainbow Rush", weight: "1000g" },
  { colorHex: "#F26C65", colorHexes: ["#F26C65", "#8C7C9C", "#A0B574"], brand: "Ambrosia", material: "Silk Rainbow", colorName: "Silk Rainbow", weight: "1000g" },
  { colorHex: "#6FCAEF", colorHexes: ["#6FCAEF", "#8573DD"], brand: "Bambu Lab", material: "Dual Color", colorName: "Blueberry Bubblegum", weight: "1000g" },
  { colorHex: "#B46BB4", colorHexes: ["#B46BB4", "#8F69B8", "#5692C6"], brand: "Ambrosia", material: "PLA", colorName: "Stardust", weight: "1000g" },
];

export default async function SpoolPreviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <SiteShell>
      <section className="overflow-hidden rounded-xl border border-border bg-card px-6 py-7 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Component Preview</p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">Spool Preview Component</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          SVG-based spool visualization with realistic lighting. Used as fallback when no product image is available.
        </p>
      </section>

      <section className="mt-6 grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {SAMPLES.map((sample) => (
          <div key={sample.colorHex + sample.brand} className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex h-64 items-center justify-center bg-secondary p-4">
              <SpoolPreview
                colorHex={sample.colorHex}
                colorHexes={"colorHexes" in sample ? (sample as any).colorHexes : undefined}
                brand={sample.brand}
                material={sample.material}
                colorName={sample.colorName}
                weight={sample.weight}
                className="h-full w-auto"
              />
            </div>
            <div className="border-t border-border px-4 py-3">
              <p className="text-sm font-semibold">{sample.brand}</p>
              <p className="text-xs text-muted-foreground">{sample.material} · {sample.colorName} · {sample.weight}</p>
              <div className="mt-1 flex items-center gap-2">
                {"colorHexes" in sample ? (
                  <div className="flex -space-x-1">
                    {((sample as any).colorHexes as string[]).map((c: string, i: number) => (
                      <div key={i} className="h-4 w-4 rounded-full border border-border" style={{ background: c }} />
                    ))}
                  </div>
                ) : (
                  <div className="h-4 w-4 rounded-full border border-border" style={{ background: sample.colorHex }} />
                )}
                <code className="text-xs text-muted-foreground">{sample.colorHex}</code>
              </div>
            </div>
          </div>
        ))}
      </section>
    </SiteShell>
  );
}
