/**
 * Backfill missing colorHex values for filaments.
 *
 * Strategy:
 *   1. RAL color codes → standard RAL-to-hex lookup
 *   2. Named colors → keyword-based mapping
 *   3. Remaining → skip (log for manual review)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── RAL Classic color table (standard hex values) ──
const RAL: Record<string, string> = {
  "1000": "#BEBD7F", "1001": "#C2B078", "1002": "#C6A961", "1003": "#E5BE01",
  "1004": "#CDA434", "1005": "#A98307", "1006": "#E4A010", "1007": "#DC9D00",
  "1011": "#8A6642", "1012": "#C7B446", "1013": "#EAE6CA", "1014": "#E1CC4F",
  "1015": "#E6D690", "1016": "#EDFF21", "1017": "#F5D033", "1018": "#F8F32B",
  "1019": "#9E9764", "1020": "#999950", "1021": "#F3DA0B", "1023": "#FAD201",
  "1024": "#AEA04B", "1026": "#FFFF00", "1027": "#9D9101", "1028": "#F4A900",
  "1032": "#D6AE01", "1033": "#F3A505", "1034": "#EFA94A", "1035": "#6A5D4D",
  "1036": "#705335", "1037": "#F39F18",
  "2000": "#ED760E", "2001": "#C93C20", "2002": "#CB2821", "2003": "#FF7514",
  "2004": "#F44611", "2005": "#FF2301", "2008": "#F75E25", "2009": "#F54021",
  "2010": "#D84B20", "2011": "#EC7C26", "2012": "#E55137",
  "3000": "#AF2B1E", "3001": "#A52019", "3002": "#A2231D", "3003": "#9B111E",
  "3004": "#75151E", "3005": "#5E2129", "3007": "#412227", "3009": "#642424",
  "3011": "#781F19", "3012": "#C1876B", "3013": "#A12312", "3014": "#D36E70",
  "3015": "#EA899A", "3016": "#B32821", "3017": "#E63244", "3018": "#D53032",
  "3020": "#CC0605", "3022": "#D95030", "3024": "#F80000", "3026": "#FE0000",
  "3027": "#C51D34", "3028": "#CB3234", "3031": "#B32428",
  "4001": "#6D3461", "4002": "#922B3E", "4003": "#DE4C8A", "4004": "#641C34",
  "4005": "#6C4675", "4006": "#A03472", "4007": "#4A192C", "4008": "#924E7D",
  "4009": "#A18594", "4010": "#CF3476", "4011": "#8673A1", "4012": "#6C6874",
  "5000": "#354D73", "5001": "#1F3438", "5002": "#20214F", "5003": "#1D1E33",
  "5004": "#18171C", "5005": "#1E2460", "5007": "#3E5F8A", "5008": "#26252D",
  "5009": "#025669", "5010": "#0E294B", "5011": "#231A24", "5012": "#3B83BD",
  "5013": "#1E213D", "5014": "#606E8C", "5015": "#2271B3", "5017": "#063971",
  "5018": "#3F888F", "5019": "#1B5583", "5020": "#1D334A", "5021": "#256D7B",
  "5022": "#252850", "5023": "#49678D", "5024": "#5D9B9B",
  "6000": "#316650", "6001": "#287233", "6002": "#2D572C", "6003": "#424632",
  "6004": "#1F3A3D", "6005": "#2F4538", "6006": "#3E3B32", "6007": "#343B29",
  "6008": "#39352A", "6009": "#31372B", "6010": "#35682D", "6011": "#587246",
  "6012": "#343E40", "6013": "#6C7156", "6014": "#47402E", "6015": "#3B3C36",
  "6016": "#1E5945", "6017": "#4C9141", "6018": "#57A639", "6019": "#BDECB6",
  "6020": "#2E3A23", "6021": "#89AC76", "6022": "#25221B", "6024": "#308446",
  "6025": "#3D642D", "6026": "#015D52", "6027": "#84C3BE", "6028": "#2C5545",
  "6029": "#20603D", "6032": "#317F43", "6033": "#497E76", "6034": "#7FB5B5",
  "6035": "#1C542D", "6036": "#193737", "6037": "#008F39", "6038": "#00BB2D",
  "7000": "#78858B", "7001": "#8A9597", "7002": "#7E7B52", "7003": "#6C7059",
  "7004": "#969992", "7005": "#646B63", "7006": "#6D6552", "7008": "#6A5F31",
  "7009": "#4D5645", "7010": "#4C514A", "7011": "#434B4D", "7012": "#4E5754",
  "7013": "#464531", "7015": "#434750", "7016": "#293133", "7021": "#23282B",
  "7022": "#332F2C", "7023": "#686C5E", "7024": "#474A51", "7026": "#2F353B",
  "7030": "#8B8C7A", "7031": "#474B4E", "7032": "#B8B799", "7033": "#7D8471",
  "7034": "#8F8B66", "7035": "#D7D7D7", "7036": "#7F7679", "7037": "#7D7F7D",
  "7038": "#B5B8B1", "7039": "#6C6960", "7040": "#9DA1AA", "7042": "#8D948D",
  "7043": "#4E5452", "7044": "#CAC4B0", "7045": "#909090", "7046": "#82898F",
  "7047": "#D0D0D0", "7048": "#898176",
  "8000": "#826C34", "8001": "#955F20", "8002": "#6C3B2A", "8003": "#734222",
  "8004": "#8E402A", "8007": "#59351F", "8008": "#6F4F28", "8011": "#5B3A29",
  "8012": "#592321", "8014": "#382C1E", "8015": "#633A34", "8016": "#4C2F27",
  "8017": "#45322E", "8019": "#403A3A", "8022": "#212121", "8023": "#A65E2E",
  "8024": "#79553D", "8025": "#755C48", "8028": "#4E3B31",
  "9001": "#FDF4E3", "9002": "#E7EBDA", "9003": "#F4F4F4", "9004": "#282828",
  "9005": "#0A0A0A", "9006": "#A5A5A5", "9007": "#8F8F8F", "9010": "#FFFFFF",
  "9011": "#1C1C1C", "9016": "#F6F6F6", "9017": "#1A1A1A", "9018": "#D7D7D7",
};

// ── Named color keywords → hex mapping ──
// Matches against colorName (case-insensitive). First match wins.
const NAMED_COLORS: Array<[RegExp, string]> = [
  // Blacks & grays
  [/\bblack\b/i, "#1A1A1A"],
  [/\bdark\s*gr[ae]y\b/i, "#4A4A4A"],
  [/\bgr[ae]y\b|gr[ae]y/i, "#808080"],
  [/\bsilver\b/i, "#C0C0C0"],
  [/\bcharcoal\b/i, "#36454F"],

  // Whites & creams
  [/\bwhite\b/i, "#FFFFFF"],
  [/\bcream\b/i, "#FFFDD0"],
  [/\bivory\b/i, "#FFFFF0"],
  [/\bbeige\b/i, "#C8AD7F"],
  [/\bchampagne\b/i, "#F7E7CE"],
  [/\bbone\b/i, "#E3DAC9"],

  // Reds
  [/\bcrimson\b/i, "#DC143C"],
  [/\bmaroon\b/i, "#800000"],
  [/\bburgundy\b/i, "#800020"],
  [/\bwine\b/i, "#722F37"],
  [/\braspberry\b/i, "#E30B5C"],
  [/\bcherry\b/i, "#DE3163"],
  [/\bbrick\s*red\b/i, "#CB4154"],
  [/\bscarlet\b/i, "#FF2400"],
  [/\bred\b/i, "#E03030"],

  // Oranges
  [/\btangerine\b/i, "#FF9966"],
  [/\bsalmon\b/i, "#FA8072"],
  [/\bcoral\b/i, "#FF7F50"],
  [/\bpeach\b/i, "#FFCBA4"],
  [/\borange\b/i, "#FF8C00"],

  // Yellows
  [/\bgold\b/i, "#FFD700"],
  [/\bamber\b/i, "#FFBF00"],
  [/\blemon\b/i, "#FFF44F"],
  [/\byellow\b/i, "#FFD700"],

  // Greens
  [/\bolive\b/i, "#808000"],
  [/\blime\b/i, "#32CD32"],
  [/\bforest\s*green\b/i, "#228B22"],
  [/\bsage\b/i, "#BCB88A"],
  [/\bmint\b/i, "#98FB98"],
  [/\bteal\b/i, "#008080"],
  [/\bturquoise\b/i, "#40E0D0"],
  [/\bmatcha\b/i, "#7B8B3A"],
  [/\bmalachite\b/i, "#0BDA51"],
  [/\bcandy\s*green\b/i, "#00CC66"],
  [/\bbright\s*green\b/i, "#66FF00"],
  [/\bbambu\s*green\b/i, "#00AE42"],
  [/\bgreen\b/i, "#2E8B57"],

  // Blues
  [/\bnavy\b/i, "#000080"],
  [/\bcobalt\b/i, "#0047AB"],
  [/\broyal\s*blue\b/i, "#4169E1"],
  [/\bsky\s*blue\b/i, "#87CEEB"],
  [/\bbaby\s*blue\b/i, "#89CFF0"],
  [/\bazure\b/i, "#0080FF"],
  [/\bindigo\b/i, "#4B0082"],
  [/\bcyan\b/i, "#00BFFF"],
  [/\bjeans\b/i, "#5B7DB1"],
  [/\bblue\b/i, "#3366CC"],

  // Purples & pinks
  [/\blavender\b/i, "#B57EDC"],
  [/\bviolet\b/i, "#7F00FF"],
  [/\bplum\b/i, "#8E4585"],
  [/\bmagenta\b/i, "#FF00FF"],
  [/\bfuchsia\b/i, "#FF00FF"],
  [/\bpurple\b/i, "#800080"],
  [/\blilac\b/i, "#C8A2C8"],
  [/\biris\b/i, "#5A4FCF"],
  [/\brose\b/i, "#FF007F"],
  [/\bhot\s*pink\b/i, "#FF69B4"],
  [/\bpink\b/i, "#FF69B4"],

  // Browns
  [/\bwalnut\b/i, "#5C4033"],
  [/\bcocoa\b/i, "#3F2512"],
  [/\bchocolate\b/i, "#7B3F00"],
  [/\bclay\b/i, "#B66A50"],
  [/\bcopper\b/i, "#B87333"],
  [/\bbronze\b/i, "#CD7F32"],
  [/\brust\b/i, "#B7410E"],
  [/\bbirch\b/i, "#D2B48C"],
  [/\btan\b/i, "#D2B48C"],
  [/\bbrown\b/i, "#8B4513"],

  // Special
  [/\bclear\b|transparent/i, "#E8E8E8"],
  [/\bfrozen\b/i, "#D6EAF8"],
  [/\bneon\b/i, "#39FF14"],
  [/\bblaze\b/i, "#FF6600"],
];

function extractRalCode(colorName: string): string | null {
  const match = colorName.match(/\bral\s*(\d{4})\b/i);
  return match ? match[1] : null;
}

function matchNamedColor(colorName: string): string | null {
  for (const [pattern, hex] of NAMED_COLORS) {
    if (pattern.test(colorName)) return hex;
  }
  return null;
}

async function main() {
  const filaments = await prisma.filament.findMany({
    where: {
      OR: [
        { colorHex: null },
        { colorHex: "" },
      ],
    },
    select: { id: true, brand: true, colorName: true, material: true },
  });

  console.log(`Found ${filaments.length} filaments missing colorHex\n`);

  let ralMatches = 0;
  let namedMatches = 0;
  let noMatch = 0;
  const unmatched: Array<{ brand: string; colorName: string | null }> = [];
  const updates: Array<{ id: string; colorHex: string; method: string }> = [];

  for (const f of filaments) {
    const name = f.colorName ?? "";

    // Try RAL code first
    const ralCode = extractRalCode(name);
    if (ralCode && RAL[ralCode]) {
      updates.push({ id: f.id, colorHex: RAL[ralCode], method: `RAL ${ralCode}` });
      ralMatches++;
      continue;
    }

    // Try named color matching
    const namedHex = matchNamedColor(name);
    if (namedHex) {
      updates.push({ id: f.id, colorHex: namedHex, method: `named: ${name}` });
      namedMatches++;
      continue;
    }

    unmatched.push({ brand: f.brand, colorName: f.colorName });
    noMatch++;
  }

  console.log(`RAL matches:   ${ralMatches}`);
  console.log(`Named matches: ${namedMatches}`);
  console.log(`No match:      ${noMatch}\n`);

  // Apply updates in batches
  const BATCH = 100;
  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);
    await prisma.$transaction(
      batch.map((u) =>
        prisma.filament.update({
          where: { id: u.id },
          data: { colorHex: u.colorHex },
        })
      )
    );
    console.log(`Updated ${Math.min(i + BATCH, updates.length)} / ${updates.length}`);
  }

  if (unmatched.length > 0) {
    console.log(`\nUnmatched samples (${unmatched.length} total):`);
    const unique = [...new Set(unmatched.map((u) => `${u.brand}: ${u.colorName}`))];
    unique.slice(0, 40).forEach((u) => console.log(`  - ${u}`));
    if (unique.length > 40) console.log(`  ... and ${unique.length - 40} more`);
  }

  console.log("\nDone!");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
