import { NextResponse } from "next/server";
import { listShops } from "@/lib/data";

export async function GET() {
  const data = await listShops();
  return NextResponse.json({ data });
}
