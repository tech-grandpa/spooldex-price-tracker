import { darken, lighten, isLightColor } from "@/lib/color-utils";

interface SpoolPreviewProps {
  colorHex: string;
  brand?: string;
  material?: string;
  colorName?: string;
  weight?: string;
  className?: string;
}

/**
 * 3/4 perspective SVG spool — stacked tilted ellipses.
 *
 * Viewed from slightly right: front flange faces viewer,
 * filament band visible on left edge between two thin flanges.
 * Front face shows large ring of wound filament (the color!)
 * between the core hub and the flange rim.
 */
export function SpoolPreview({
  colorHex,
  brand,
  material,
  colorName,
  weight,
  className,
}: SpoolPreviewProps) {
  const shadow = darken(colorHex, 0.28);
  const darkEdge = darken(colorHex, 0.16);
  const midDark = darken(colorHex, 0.06);
  const highlight = lighten(colorHex, 0.14);
  const light = isLightColor(colorHex);

  // ── Geometry ──
  // More tilt (~15° more towards viewer) = wider depth = more filament visible
  const cy = 148;
  const flangeRx = 105;
  const flangeRy = 116;
  const depth = 56;

  const frontX = 178;
  const backX = frontX - depth;

  // Filament outer edge — noticeably inside the flange so cardboard rim is visible
  const filOuterRx = flangeRx - 14;
  const filOuterRy = flangeRy - 16;

  // Core hub on front face (the inner plastic piece that holds the filament)
  const hubRx = 30;
  const hubRy = 33;

  // Core hole (the actual center hole)
  const coreRx = 20;
  const coreRy = 22;

  const uid = `spr-${colorHex.replace("#", "")}`;

  function leftCrescent(
    fCx: number, bCx: number,
    arcRx: number, arcRy: number,
  ): string {
    // Pure arcs, no straight lines. The crescent is the area between
    // the left halves of two ellipses with different centers.
    //
    // Path: front-left-bottom → front-left-top (left half of front ellipse)
    //       → back-left-top → back-left-bottom (left half of back ellipse, reversed)
    //
    // Using the leftmost points of each ellipse as intermediaries creates
    // smooth meeting points with no visible straight segments.
    const fLeft = fCx - arcRx;
    const bLeft = bCx - arcRx;

    return [
      // Start at bottom of front ellipse
      `M ${fCx} ${cy + arcRy}`,
      // Left half of front ellipse: bottom → left → top
      `A ${arcRx} ${arcRy} 0 0 1 ${fLeft} ${cy}`,
      `A ${arcRx} ${arcRy} 0 0 1 ${fCx} ${cy - arcRy}`,
      // Connect to back ellipse top (short arc instead of line)
      `A ${arcRx} ${arcRy} 0 0 1 ${bCx} ${cy - arcRy}`,
      // Left half of back ellipse: top → left → bottom
      `A ${arcRx} ${arcRy} 0 0 0 ${bLeft} ${cy}`,
      `A ${arcRx} ${arcRy} 0 0 0 ${bCx} ${cy + arcRy}`,
      // Connect back to front bottom (short arc instead of line)
      `A ${arcRx} ${arcRy} 0 0 1 ${fCx} ${cy + arcRy}`,
      `Z`,
    ].join(" ");
  }

  const filamentBand = leftCrescent(frontX, backX, filOuterRx, filOuterRy);
  const flangeRim = leftCrescent(frontX, backX, flangeRx, flangeRy);

  return (
    <svg
      viewBox="0 0 340 320"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={`Spool preview: ${brand ?? ""} ${material ?? ""} ${colorName ?? ""}`}
    >
      <defs>
        {/* ── Filament edge band gradient — vertical: dark top/bottom, bright middle ── */}
        <linearGradient id={`${uid}-fil`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={shadow} />
          <stop offset="15%" stopColor={darkEdge} />
          <stop offset="35%" stopColor={colorHex} />
          <stop offset="48%" stopColor={highlight} />
          <stop offset="55%" stopColor={highlight} />
          <stop offset="68%" stopColor={colorHex} />
          <stop offset="85%" stopColor={darkEdge} />
          <stop offset="100%" stopColor={shadow} />
        </linearGradient>

        {/* ── Filament front face (wound layers — radial shading) ── */}
        <radialGradient id={`${uid}-filf`} cx="0.44" cy="0.44" r="0.56">
          <stop offset="0%" stopColor={highlight} stopOpacity="0.4" />
          <stop offset="40%" stopColor={colorHex} />
          <stop offset="75%" stopColor={midDark} />
          <stop offset="100%" stopColor={darkEdge} />
        </radialGradient>

        {/* ── Wound strand rings on front face ── */}
        <radialGradient id={`${uid}-rings`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor={light ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)"} />
          <stop offset="50%" stopColor="transparent" />
          <stop offset="51%" stopColor={light ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)"} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>

        {/* ── Cardboard flange rim (edge strip) ── */}
        <linearGradient id={`${uid}-ce`} x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%" stopColor="#b09060" />
          <stop offset="30%" stopColor="#c8aa78" />
          <stop offset="60%" stopColor="#bfa06a" />
          <stop offset="100%" stopColor="#8a7048" />
        </linearGradient>

        {/* ── Front flange face (thin rim ring, mostly filament visible) ── */}
        <radialGradient id={`${uid}-ff`} cx="0.44" cy="0.44" r="0.58">
          <stop offset="0%" stopColor="#dcc8a4" />
          <stop offset="50%" stopColor="#c4a574" />
          <stop offset="100%" stopColor="#a68b5b" />
        </radialGradient>

        {/* ── Back flange face ── */}
        <linearGradient id={`${uid}-bf`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#b09060" />
          <stop offset="100%" stopColor="#7a6040" />
        </linearGradient>

        {/* ── Gap between flange and filament (same cardboard tone, slightly darker) ── */}
        <linearGradient id={`${uid}-gap`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8a7048" />
          <stop offset="50%" stopColor="#9a8058" />
          <stop offset="100%" stopColor="#8a7048" />
        </linearGradient>

        {/* ── Hub (inner plastic piece) ── */}
        <radialGradient id={`${uid}-hub`} cx="0.42" cy="0.42" r="0.6">
          <stop offset="0%" stopColor="#d0d0d0" />
          <stop offset="60%" stopColor="#b0b0b0" />
          <stop offset="100%" stopColor="#909090" />
        </radialGradient>

        {/* ── Core hole ── */}
        <radialGradient id={`${uid}-core`} cx="0.38" cy="0.38" r="0.65">
          <stop offset="0%" stopColor="#2a2a2a" />
          <stop offset="100%" stopColor="#0a0a0a" />
        </radialGradient>

        {/* ── Drop shadow ── */}
        <radialGradient id={`${uid}-shd`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#000" stopOpacity="0.16" />
          <stop offset="60%" stopColor="#000" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>

        {/* ── Strand texture (horizontal lines on edge band) ── */}
        <pattern id={`${uid}-str`} width="340" height="3" patternUnits="userSpaceOnUse">
          <line x1="0" y1="1.5" x2="340" y2="1.5"
            stroke={light ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)"} strokeWidth="0.8" />
        </pattern>

        {/* ── Clip paths ── */}
        <clipPath id={`${uid}-front-clip`}>
          <ellipse cx={frontX} cy={cy} rx={flangeRx} ry={flangeRy} />
        </clipPath>

        {/* Filament donut clip: outer filament ring minus hub */}
        <clipPath id={`${uid}-fil-ring`}>
          <path d={`
            M ${frontX - filOuterRx} ${cy}
            A ${filOuterRx} ${filOuterRy} 0 1 1 ${frontX + filOuterRx} ${cy}
            A ${filOuterRx} ${filOuterRy} 0 1 1 ${frontX - filOuterRx} ${cy}
            Z
            M ${frontX - hubRx} ${cy}
            A ${hubRx} ${hubRy} 0 1 0 ${frontX + hubRx} ${cy}
            A ${hubRx} ${hubRy} 0 1 0 ${frontX - hubRx} ${cy}
            Z
          `} fillRule="evenodd" />
        </clipPath>
      </defs>

      {/* ═══════ Drop shadow ═══════ */}
      <ellipse cx={frontX - 6} cy="300" rx="90" ry="10" fill={`url(#${uid}-shd)`} />

      {/* ═══════ 1. Back flange face ═══════ */}
      <ellipse cx={backX} cy={cy} rx={flangeRx} ry={flangeRy} fill={`url(#${uid}-bf)`} />
      <ellipse cx={backX} cy={cy} rx={flangeRx} ry={flangeRy}
        fill="none" stroke="#6a5438" strokeWidth="0.6" />

      {/* ═══════ 2. Dark gap (flange overhang visible at top & bottom) ═══════ */}
      <path d={flangeRim} fill={`url(#${uid}-gap)`} />

      {/* ═══════ 3. FILAMENT EDGE BAND ═══════ */}
      <path d={filamentBand} fill={`url(#${uid}-fil)`} />
      <path d={filamentBand} fill={`url(#${uid}-str)`} />
      {/* Soft edge highlights */}
      <line x1={frontX} y1={cy - filOuterRy} x2={backX} y2={cy - filOuterRy}
        stroke={light ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)"} strokeWidth="0.5" />
      <line x1={frontX} y1={cy + filOuterRy} x2={backX} y2={cy + filOuterRy}
        stroke="rgba(0,0,0,0.08)" strokeWidth="0.5" />

      {/* ═══════ 4. Front flange — thin cardboard rim ring ═══════ */}
      {/* Outer flange face */}
      <ellipse cx={frontX} cy={cy} rx={flangeRx} ry={flangeRy} fill={`url(#${uid}-ff)`} />
      <ellipse cx={frontX} cy={cy} rx={flangeRx} ry={flangeRy}
        fill="none" stroke="#a08860" strokeWidth="0.8" />

      {/* ═══════ 5. FILAMENT FACE — the big colored ring on the front ═══════ */}
      {/* This is the main visual: wound filament visible between rim and hub */}
      <g clipPath={`url(#${uid}-fil-ring)`}>
        <ellipse cx={frontX} cy={cy} rx={filOuterRx} ry={filOuterRy}
          fill={`url(#${uid}-filf)`} />
        {/* Concentric wound rings */}
        <ellipse cx={frontX} cy={cy} rx={filOuterRx - 10} ry={filOuterRy - 11}
          fill="none" stroke={light ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)"}
          strokeWidth="0.6" />
        <ellipse cx={frontX} cy={cy} rx={filOuterRx - 22} ry={filOuterRy - 24}
          fill="none" stroke={light ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)"}
          strokeWidth="0.6" />
        <ellipse cx={frontX} cy={cy} rx={filOuterRx - 35} ry={filOuterRy - 38}
          fill="none" stroke={light ? "rgba(0,0,0,0.025)" : "rgba(255,255,255,0.025)"}
          strokeWidth="0.6" />
        <ellipse cx={frontX} cy={cy} rx={filOuterRx - 48} ry={filOuterRy - 52}
          fill="none" stroke={light ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)"}
          strokeWidth="0.6" />
        {/* Highlight arc (light reflection across wound layers) */}
        <ellipse cx={frontX - 12} cy={cy - 14} rx={filOuterRx - 20} ry={filOuterRy - 22}
          fill="white" opacity="0.04" />
      </g>

      {/* ═══════ 6. Flange rim line (inner edge of the cardboard) ═══════ */}
      <ellipse cx={frontX} cy={cy} rx={filOuterRx} ry={filOuterRy}
        fill="none" stroke="#b8996a" strokeWidth="0.6" opacity="0.5" />

      {/* ═══════ 7. Hub (inner plastic piece) ═══════ */}
      <ellipse cx={frontX} cy={cy} rx={hubRx} ry={hubRy} fill={`url(#${uid}-hub)`} />
      <ellipse cx={frontX} cy={cy} rx={hubRx} ry={hubRy}
        fill="none" stroke="#888" strokeWidth="0.5" />

      {/* ═══════ 8. Core hole ═══════ */}
      <ellipse cx={frontX} cy={cy} rx={coreRx} ry={coreRy} fill={`url(#${uid}-core)`} />
      <ellipse cx={frontX} cy={cy} rx={coreRx} ry={coreRy}
        fill="none" stroke="#333" strokeWidth="0.6" />

      {/* ═══════ 9. Overall light highlight ═══════ */}
      <ellipse cx={frontX - 20} cy={cy - 30} rx="50" ry="44"
        fill="white" opacity="0.03" />

      {/* ═══════ Disclaimer badge ═══════ */}
      <rect x={frontX - 80} y="278" width="160" height="16" rx="8" fill="#e8e8e8" opacity="0.75" />
      <text x={frontX} y="289.5" fontSize="7.5" fill="#888" textAnchor="middle"
        fontFamily="system-ui, -apple-system, sans-serif" fontWeight="500">
        Preview – Real Filament Color may differ.
      </text>
    </svg>
  );
}
