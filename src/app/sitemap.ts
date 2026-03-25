import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/env";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [filaments, brands, materials, shops] = await Promise.all([
    prisma.filament.findMany({ select: { slug: true, updatedAt: true } }),
    prisma.filament.groupBy({ by: ["brand"] }),
    prisma.filament.groupBy({ by: ["material"] }),
    prisma.shop.findMany({ select: { id: true, createdAt: true } }),
  ]);

  return [
    { url: SITE_URL, lastModified: new Date() },
    ...filaments.map((entry) => ({
      url: `${SITE_URL}/filaments/${entry.slug}`,
      lastModified: entry.updatedAt,
    })),
    ...brands.map((entry) => ({
      url: `${SITE_URL}/brands/${slugify(entry.brand)}`,
      lastModified: new Date(),
    })),
    ...materials.map((entry) => ({
      url: `${SITE_URL}/materials/${slugify(entry.material)}`,
      lastModified: new Date(),
    })),
    ...shops.map((entry) => ({
      url: `${SITE_URL}/shops/${entry.id}`,
      lastModified: entry.createdAt,
    })),
  ];
}
