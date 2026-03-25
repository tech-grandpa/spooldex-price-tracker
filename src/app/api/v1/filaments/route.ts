import { NextResponse } from "next/server";
import { z } from "zod";
import { listApiFilaments } from "@/lib/data";

const querySchema = z.object({
  brand: z.string().optional(),
  material: z.string().optional(),
  q: z.string().optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = querySchema.parse({
    brand: url.searchParams.get("brand") || undefined,
    material: url.searchParams.get("material") || undefined,
    q: url.searchParams.get("q") || undefined,
  });

  const data = await listApiFilaments(params);
  return NextResponse.json({ data });
}
