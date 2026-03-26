/**
 * Remove mismatched offer images from filaments.
 * 
 * Filaments that got their imageUrl set from an offer image (path contains /offers/)
 * often have the wrong color shown. This script clears those and lets the color
 * swatch preview take over.
 * 
 * Filaments with images from /filaments/ (canonical seed images) are kept.
 */

import { prisma } from "@/lib/prisma";

async function main() {
  // Clear offer-sourced images — these are frequently wrong color
  const result = await prisma.filament.updateMany({
    where: {
      imageUrl: { contains: "/offers/" },
    },
    data: {
      imageUrl: null,
    },
  });

  console.log(`Cleared ${result.count} offer-sourced images from filaments`);

  // Also clear obvious placeholder images
  const placeholders = await prisma.filament.updateMany({
    where: {
      OR: [
        { imageUrl: { contains: "default" } },
        { imageUrl: { contains: "placeholder" } },
        { imageUrl: { contains: "no-image" } },
      ],
    },
    data: {
      imageUrl: null,
    },
  });

  console.log(`Cleared ${placeholders.count} placeholder images`);

  // Stats
  const [total, withImage, withColor, withColorNoImage] = await Promise.all([
    prisma.filament.count(),
    prisma.filament.count({ where: { imageUrl: { not: null } } }),
    prisma.filament.count({ where: { colorHex: { not: null } } }),
    prisma.filament.count({
      where: {
        colorHex: { not: null },
        OR: [{ imageUrl: null }, { imageUrl: "" }],
      },
    }),
  ]);

  console.log(`\nCatalog stats:`);
  console.log(`  Total filaments: ${total}`);
  console.log(`  With canonical image: ${withImage}`);
  console.log(`  With color hex: ${withColor}`);
  console.log(`  Color swatch (hex, no image): ${withColorNoImage}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
