import { NextResponse } from "next/server";
import { z } from "zod";
import { lookupOffers } from "@/lib/data";

const querySchema = z.object({
  ean: z.string().optional(),
  bambuCode: z.string().optional(),
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
    brand: url.searchParams.get("brand") || undefined,
    material: url.searchParams.get("material") || undefined,
    series: url.searchParams.get("series") || undefined,
    colorName: url.searchParams.get("colorName") || undefined,
    colorHex: url.searchParams.get("colorHex") || undefined,
    colorHexes: url.searchParams.get("colorHexes") || undefined,
    weightG: url.searchParams.get("weightG") || undefined,
  });

  const data = await lookupOffers({
    ...params,
    colorHexes: params.colorHexes
      ? params.colorHexes.split(",").map((value) => value.trim()).filter(Boolean)
      : undefined,
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
