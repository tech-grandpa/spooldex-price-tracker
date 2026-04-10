import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { buildAbsoluteUrl } from "@/lib/utils";

interface RouteProps {
  params: Promise<{ idOrSlug: string }>;
}

export async function GET(_request: Request, { params }: RouteProps) {
  const { idOrSlug } = await params;

  const filament = await prisma.filament.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    select: { slug: true },
  });

  if (!filament) {
    return new Response("Not found", { status: 404 });
  }

  const url = buildAbsoluteUrl(`/filaments/${filament.slug}`);
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, width: 256 });

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
