/**
 * Seed colorFabb filaments by parsing their product sitemap.
 * 
 * Extracts product names from sitemap URLs and JSON-LD structured data.
 * Only seeds 1.75mm filaments (the standard for most consumer printers).
 */

import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

const SITEMAP_URL = "https://colorfabb.com/media/colorfabb_com/products.xml";
const USER_AGENT = "SpooldexTracker/0.1 (+https://spooldex-tracker.acgt.dev)";

interface ParsedProduct {
  name: string;
  series: string;
  material: string;
  colorName: string;
  weightG: number;
  diameterMm: number;
  url: string;
  ean: string | null;
  imageUrl: string | null;
  colorHex: string | null;
}

function parseProductUrl(url: string): ParsedProduct | null {
  const pathname = new URL(url).pathname.replace(/^\//, "");
  
  // Skip non-product pages and 2.85mm variants
  if (pathname.includes("2-85")) return null;
  if (!pathname.includes("1-75")) {
    // Allow "overview" pages like /standard-black (no diameter = overview)
    // but only if they don't have a weight indicator
    if (!pathname.match(/\d{3,}$/)) return null;
  }

  // Parse patterns like: pla-pha-standard-black-1-75-750
  const match = pathname.match(/^(.+?)-1-75-(\d+)$/);
  if (!match) return null;

  const [, namePart, weightStr] = match;
  const weightG = parseInt(weightStr, 10);
  if (!Number.isFinite(weightG) || weightG < 100) return null;

  // Extract series and color from the name
  const parts = namePart.split("-");
  
  // Common colorFabb series patterns
  const knownSeries: Record<string, string> = {
    "pla-pha": "PLA/PHA",
    "pla-economy": "PLA Economy",
    "ht": "HT",
    "ngen": "nGen",
    "ngen-flex": "nGen Flex",
    "ngen-lux": "nGen LUX",
    "xt": "XT",
    "xt-cf20": "XT-CF20",
    "steelfill": "steelFill",
    "copperfill": "copperFill",
    "bronzefill": "bronzeFill",
    "woodfill": "woodFill",
    "corkfill": "corkFill",
    "bamboo-fill": "bambooFill",
    "glowfill": "glowFill",
    "pa": "PA",
    "petg": "PETG",
    "petg-economy": "PETG Economy",
    "pla": "PLA",
    "tpu": "TPU",
    "varioshore-tpu": "varioShore TPU",
    "lw-pla": "LW-PLA",
    "lw-abs": "LW-ABS",
    "abs-economy": "ABS Economy",
  };

  let series = "";
  let colorName = "";
  let material = "PLA";

  // Try to match known series from the start of the name
  const nameStr = parts.join("-");
  let matched = false;
  for (const [key, value] of Object.entries(knownSeries).sort((a, b) => b[0].length - a[0].length)) {
    if (nameStr.startsWith(key + "-") || nameStr === key) {
      series = value;
      material = value.includes("PLA") ? "PLA" : value.includes("PET") ? "PETG" : value.includes("PA") ? "PA" : value.includes("TPU") ? "TPU" : value.includes("ABS") ? "ABS" : value;
      colorName = nameStr.slice(key.length + 1).split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      matched = true;
      break;
    }
  }

  if (!matched) {
    series = parts.slice(0, Math.min(2, parts.length - 1)).join(" ");
    colorName = parts.slice(Math.min(2, parts.length - 1)).join(" ");
    material = series.toUpperCase().includes("PLA") ? "PLA" : "Other";
  }

  if (!colorName) colorName = series;

  return {
    name: `${series} ${colorName}`.trim(),
    series: series || "PLA/PHA",
    material,
    colorName: colorName || "",
    weightG,
    diameterMm: 1.75,
    url,
    ean: null,
    imageUrl: null,
    colorHex: null,
  };
}

async function fetchJsonLdData(url: string): Promise<{ ean?: string; imageUrl?: string; colorHex?: string } | null> {
  try {
    const response = await fetch(url, {
      headers: { "user-agent": USER_AGENT },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return null;
    
    const html = await response.text();
    
    // Extract JSON-LD
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
    if (!jsonLdMatch) return null;
    
    const sanitized = jsonLdMatch[1].replace(/[\x00-\x1f]/g, (ch) => ch === "\n" || ch === "\r" || ch === "\t" ? " " : "");
    const data = JSON.parse(sanitized);
    const type = (data["@type"] || "").replace(/^https?:\/\/schema\.org\//, "");
    if (type !== "Product") return null;

    return {
      ean: data.gtin13 || data.sku || null,
      imageUrl: typeof data.image === "string" ? data.image : Array.isArray(data.image) ? data.image[0] : null,
    };
  } catch {
    return null;
  }
}

async function main() {
  console.log("Fetching colorFabb sitemap...");
  const response = await fetch(SITEMAP_URL, {
    headers: { "user-agent": USER_AGENT },
  });
  const xml = await response.text();
  
  const urls = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g))
    .map((m) => m[1]?.trim())
    .filter((u): u is string => Boolean(u));
  
  console.log(`Found ${urls.length} total URLs in sitemap`);

  const products: ParsedProduct[] = [];
  for (const url of urls) {
    const product = parseProductUrl(url);
    if (product) products.push(product);
  }

  console.log(`Parsed ${products.length} product variants (1.75mm only)`);

  // Deduplicate by slug
  const seen = new Set<string>();
  const unique: ParsedProduct[] = [];
  for (const product of products) {
    const slug = slugify(`colorfabb ${product.series} ${product.colorName} ${product.weightG}`);
    if (seen.has(slug)) continue;
    seen.add(slug);
    unique.push(product);
  }

  console.log(`${unique.length} unique filaments after dedup`);

  // Fetch JSON-LD for first 10 products to get images/EANs (sample)
  console.log("Fetching product details for sample (first 10)...");
  const sampleSize = Math.min(10, unique.length);
  for (let i = 0; i < sampleSize; i++) {
    const product = unique[i];
    const data = await fetchJsonLdData(product.url);
    if (data) {
      if (data.ean) product.ean = data.ean;
      if (data.imageUrl) product.imageUrl = data.imageUrl;
    }
    // Be polite
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Upsert into database
  let created = 0;
  let updated = 0;
  for (const product of unique) {
    const slug = slugify(`colorfabb ${product.series} ${product.colorName} ${product.weightG}`);
    
    const existing = await prisma.filament.findUnique({ where: { slug } });
    if (existing) {
      updated++;
    } else {
      created++;
    }

    await prisma.filament.upsert({
      where: { slug },
      create: {
        slug,
        brand: "colorFabb",
        series: product.series,
        material: product.material,
        colorName: product.colorName || null,
        colorHex: product.colorHex,
        colorHexes: [],
        weightG: product.weightG,
        diameterMm: product.diameterMm,
        ean: product.ean,
        imageUrl: product.imageUrl,
        bambuCode: null,
      },
      update: {
        brand: "colorFabb",
        series: product.series,
        material: product.material,
        colorName: product.colorName || null,
        weightG: product.weightG,
        ...(product.imageUrl ? { imageUrl: product.imageUrl } : {}),
        ...(product.ean ? { ean: product.ean } : {}),
      },
    });
  }

  console.log(`Done: ${created} created, ${updated} updated`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
