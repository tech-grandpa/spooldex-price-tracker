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
    weightG: url.searchParams.get("weightG") || undefined,
  });

  const data = await lookupOffers(params);
  if (!data) {
    return NextResponse.json({ data: null }, { status: 404 });
  }

  return NextResponse.json({ data });
}
