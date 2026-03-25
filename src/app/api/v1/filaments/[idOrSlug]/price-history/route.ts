import { NextResponse } from "next/server";
import { getPriceHistoryForApi } from "@/lib/data";

interface RouteProps {
  params: Promise<{ idOrSlug: string }>;
}

export async function GET(_request: Request, { params }: RouteProps) {
  const { idOrSlug } = await params;
  const data = await getPriceHistoryForApi(idOrSlug);

  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ data });
}
