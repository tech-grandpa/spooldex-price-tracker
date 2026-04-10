import { NextResponse } from "next/server";
import { z } from "zod";
import { lookupOffers } from "@/lib/data";
import { classifyScanCode } from "@/lib/scan-code";

const querySchema = z.object({
  ean: z.string().optional(),
  bambuCode: z.string().optional(),
  scanCode: z.string().optional(),
  brand: z.string().optional(),
  material: z.string().optional(),
  series: z.string().optional(),
  colorName: z.string().optional(),
  colorHex: z.string().optional(),
  colorHexes: z.string().optional(),
  weightG: z.string().optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = querySchema.parse({
    ean: url.searchParams.get("ean") || undefined,
    bambuCode: url.searchParams.get("bambuCode") || undefined,
    scanCode: url.searchParams.get("scanCode") || undefined,
    brand: url.searchParams.get("brand") || undefined,
    material: url.searchParams.get("material") || undefined,
    series: url.searchParams.get("series") || undefined,
    colorName: url.searchParams.get("colorName") || undefined,
    colorHex: url.searchParams.get("colorHex") || undefined,
    colorHexes: url.searchParams.get("colorHexes") || undefined,
    weightG: url.searchParams.get("weightG") || undefined,
  });

  // Expand scanCode into specific lookup params
  const scanOverrides = params.scanCode ? classifyScanCode(params.scanCode) : {};

  const data = await lookupOffers({
    ean: scanOverrides.ean || params.ean,
    bambuCode: scanOverrides.bambuCode || params.bambuCode,
    slug: scanOverrides.slug,
    brand: params.brand,
    material: params.material,
    series: params.series,
    colorName: params.colorName,
    colorHex: params.colorHex,
    colorHexes: params.colorHexes
      ? params.colorHexes.split(",").map((value) => value.trim()).filter(Boolean)
      : undefined,
    weightG: params.weightG,
  });
  if (!data) {
    return NextResponse.json({ data: null }, {
      status: 404,
      headers: {
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  return NextResponse.json({ data }, {
    headers: {
      "Cache-Control": "public, max-age=300",
    },
  });
}
