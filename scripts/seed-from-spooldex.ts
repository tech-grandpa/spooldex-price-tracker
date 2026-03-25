import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { ensureDefaultShops } from "@/lib/data";
import { cacheRemoteImageToR2 } from "@/lib/r2";
import { slugify } from "@/lib/utils";

interface CatalogExportRow {
  vendorName: string;
  name: string;
  material: string;
  colorName: string | null;
  colorHex: string | null;
  colorHexes: string[];
  weight: number | null;
  diameter: number | null;
  ean: string | null;
  imageUrl: string | null;
  bambuProductCode: string | null;
}

async function loadCatalogExport(): Promise<CatalogExportRow[]> {
  const exportPath =
    process.env.SPOOLDEX_CATALOG_EXPORT_PATH ||
    path.join(process.env.SPOOLDEX_REPO_PATH || "../spooldex", "exports", "tracker-catalog.json");
  const raw = await readFile(exportPath, "utf8");
  return JSON.parse(raw) as CatalogExportRow[];
}

async function loadFallbackBambuExport() {
  const repoRoot = process.env.SPOOLDEX_REPO_PATH || "../spooldex";
  const exportDir = path.join(repoRoot, "imports", "bambu_db_export");
  const [vendorsRaw, filamentTypesRaw, variantsRaw, filamentsRaw] = await Promise.all([
    readFile(path.join(exportDir, "vendors.json"), "utf8"),
    readFile(path.join(exportDir, "filament_types.json"), "utf8"),
    readFile(path.join(exportDir, "filament_type_variants.json"), "utf8"),
    readFile(path.join(exportDir, "filaments.json"), "utf8"),
  ]);

  const vendors = JSON.parse(vendorsRaw) as Array<{ vendorId: string; name: string }>;
  const filamentTypes = JSON.parse(filamentTypesRaw) as Array<{ filamentTypeId: string; material: string }>;
  const variants = JSON.parse(variantsRaw) as Array<{ filamentTypeVariantId: string; variantName: string }>;
  const filaments = JSON.parse(filamentsRaw) as Array<{
    vendorId: string;
    filamentTypeId: string;
    filamentTypeVariantId: string | null;
    filamentName: string;
    colorHex: string[];
    bambuProductCode: string | null;
  }>;

  const vendorMap = new Map(vendors.map((entry) => [entry.vendorId, entry.name]));
  const typeMap = new Map(filamentTypes.map((entry) => [entry.filamentTypeId, entry.material]));
  const variantMap = new Map(variants.map((entry) => [entry.filamentTypeVariantId, entry.variantName]));

  return filaments.map((entry) => ({
    vendorName: vendorMap.get(entry.vendorId) || "Bambu Lab",
    name: entry.filamentTypeVariantId
      ? `${typeMap.get(entry.filamentTypeId) || "PLA"} ${variantMap.get(entry.filamentTypeVariantId) || ""}`.trim()
      : typeMap.get(entry.filamentTypeId) || "PLA",
    material: typeMap.get(entry.filamentTypeId) || "PLA",
    colorName: entry.filamentName,
    colorHex: entry.colorHex[0] ? `#${entry.colorHex[0]}` : null,
    colorHexes: entry.colorHex.map((value: string) => `#${value}`),
    weight: 1000,
    diameter: 1.75,
    ean: null,
    imageUrl: null,
    bambuProductCode: entry.bambuProductCode,
  }));
}

async function loadFallbackSpoolmanExport() {
  const repoRoot = process.env.SPOOLDEX_REPO_PATH || "../spooldex";
  const spoolmanPath = path.join(repoRoot, "imports", "spoolmandb", "filaments.json");
  const raw = await readFile(spoolmanPath, "utf8");
  const entries = JSON.parse(raw) as Array<{
    manufacturer: string;
    name: string;
    material: string;
    color_hex: string | null;
    color_hexes: string[] | null;
    weight: number | null;
    diameter: number | null;
  }>;

  return entries.map((entry) => ({
    vendorName: entry.manufacturer,
    name: entry.name,
    material: entry.material,
    colorName: entry.name,
    colorHex: entry.color_hex ? `#${entry.color_hex}` : null,
    colorHexes: entry.color_hexes?.map((value) => `#${value}`) ?? [],
    weight: entry.weight ? Math.round(entry.weight) : 1000,
    diameter: entry.diameter ?? 1.75,
    ean: null,
    imageUrl: null,
    bambuProductCode: null,
  }));
}

async function main() {
  await ensureDefaultShops();

  let rows: CatalogExportRow[];
  try {
    rows = await loadCatalogExport();
    console.log(`Loaded ${rows.length} catalog rows from Spooldex export.`);
  } catch {
    console.warn("Catalog export not available, falling back to SpoolmanDB + Bambu import assets.");
    const [spoolmanRows, bambuRows] = await Promise.all([
      loadFallbackSpoolmanExport(),
      loadFallbackBambuExport(),
    ]);
    rows = [...spoolmanRows, ...bambuRows];
  }

  const seen = new Set<string>();
  for (const row of rows) {
    const series = row.name?.trim() || row.material;
    const slug = slugify([row.vendorName, series, row.colorName || row.material, row.weight || 1000].join(" "));
    if (seen.has(slug)) continue;
    seen.add(slug);
    const cachedImageUrl = row.imageUrl
      ? await cacheRemoteImageToR2(
          row.imageUrl,
          `filaments/${slug}.jpg`,
        )
      : null;

    await prisma.filament.upsert({
      where: { slug },
      create: {
        slug,
        brand: row.vendorName,
        series,
        material: row.material,
        colorName: row.colorName,
        colorHex: row.colorHex,
        colorHexes: row.colorHexes ?? [],
        weightG: row.weight ?? 1000,
        diameterMm: row.diameter ?? 1.75,
        ean: row.ean,
        imageUrl: cachedImageUrl || row.imageUrl,
        bambuCode: row.bambuProductCode,
      },
      update: {
        brand: row.vendorName,
        series,
        material: row.material,
        colorName: row.colorName,
        colorHex: row.colorHex,
        colorHexes: row.colorHexes ?? [],
        weightG: row.weight ?? 1000,
        diameterMm: row.diameter ?? 1.75,
        ean: row.ean,
        imageUrl: cachedImageUrl || row.imageUrl,
        bambuCode: row.bambuProductCode,
      },
    });
  }

  console.log(`Seeded ${rows.length} canonical filaments.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
