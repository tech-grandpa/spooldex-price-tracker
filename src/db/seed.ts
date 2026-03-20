import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { shop, filament } from "./schema.js";

const BAMBU_FILAMENT_CODES: Record<string, { series: string; vendor: string; material: string }> = {
  GFA00: { series: "PLA Basic", vendor: "Bambu Lab", material: "PLA" },
  GFA01: { series: "PLA Matte", vendor: "Bambu Lab", material: "PLA" },
  GFA02: { series: "PLA Metal", vendor: "Bambu Lab", material: "PLA" },
  GFA03: { series: "PLA Silk", vendor: "Bambu Lab", material: "PLA" },
  GFA05: { series: "PLA Tough", vendor: "Bambu Lab", material: "PLA" },
  GFA06: { series: "PLA Marble", vendor: "Bambu Lab", material: "PLA" },
  GFA07: { series: "PLA Sparkle", vendor: "Bambu Lab", material: "PLA" },
  GFA08: { series: "PLA Glow", vendor: "Bambu Lab", material: "PLA" },
  GFA09: { series: "PLA Galaxy", vendor: "Bambu Lab", material: "PLA" },
  GFA10: { series: "PLA Gradient", vendor: "Bambu Lab", material: "PLA" },
  GFA50: { series: "PLA-CF", vendor: "Bambu Lab", material: "PLA-CF" },
  GFB00: { series: "ABS", vendor: "Bambu Lab", material: "ABS" },
  GFB98: { series: "ASA", vendor: "Bambu Lab", material: "ASA" },
  GFC00: { series: "PC", vendor: "Bambu Lab", material: "PC" },
  GFG00: { series: "PETG Basic", vendor: "Bambu Lab", material: "PETG" },
  GFG01: { series: "PETG Basic", vendor: "Bambu Lab", material: "PETG" },
  GFG02: { series: "PETG HF", vendor: "Bambu Lab", material: "PETG" },
  GFG50: { series: "PETG-CF", vendor: "Bambu Lab", material: "PETG-CF" },
  GFN03: { series: "PA-CF", vendor: "Bambu Lab", material: "PA-CF" },
  GFS00: { series: "Support W", vendor: "Bambu Lab", material: "PVA" },
  GFS01: { series: "Support G", vendor: "Bambu Lab", material: "PVA" },
  GFU01: { series: "TPU 95A", vendor: "Bambu Lab", material: "TPU" },
  GFA99: { series: "Generic PLA", vendor: "Generic", material: "PLA" },
  GFL98: { series: "Generic PLA-CF", vendor: "Generic", material: "PLA-CF" },
  GFL99: { series: "Generic PLA", vendor: "Generic", material: "PLA" },
  GFG99: { series: "Generic PETG", vendor: "Generic", material: "PETG" },
  GFB99: { series: "Generic ABS", vendor: "Generic", material: "ABS" },
  GFC99: { series: "Generic PC", vendor: "Generic", material: "PC" },
  GFN98: { series: "Generic PA-CF", vendor: "Generic", material: "PA-CF" },
  GFN99: { series: "Generic PA", vendor: "Generic", material: "PA" },
  GFS99: { series: "Generic PVA", vendor: "Generic", material: "PVA" },
  GFU99: { series: "Generic TPU", vendor: "Generic", material: "TPU" },
  GFL00: { series: "PolyLite PLA", vendor: "Polymaker", material: "PLA" },
  GFL01: { series: "PolyTerra PLA", vendor: "Polymaker", material: "PLA" },
  GFL02: { series: "PolyLite PLA Pro", vendor: "Polymaker", material: "PLA" },
};

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const client = postgres(connectionString);
  const db = drizzle(client);

  console.log("🌱 Seeding shops...");
  await db.insert(shop).values([
    {
      id: "amazon-de",
      name: "Amazon DE",
      market: "de",
      baseUrl: "https://www.amazon.de",
      scraperType: "amazon-paapi",
      enabled: true,
    },
    {
      id: "3djake",
      name: "3DJake",
      market: "de",
      baseUrl: "https://www.3djake.de",
      scraperType: "playwright",
      enabled: false,
    },
    {
      id: "bambu-store-eu",
      name: "Bambu Store EU",
      market: "de",
      baseUrl: "https://eu.store.bambulab.com",
      scraperType: "api",
      enabled: false,
    },
  ]).onConflictDoNothing();

  console.log("🌱 Seeding Bambu Lab filament codes...");
  const filamentRecords = Object.entries(BAMBU_FILAMENT_CODES).map(([code, info]) => ({
    brand: info.vendor,
    series: info.series,
    material: info.material,
    bambuCode: code,
  }));

  await db.insert(filament).values(filamentRecords).onConflictDoNothing();

  console.log(`✅ Seeded ${filamentRecords.length} filaments and 3 shops`);
  await client.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
