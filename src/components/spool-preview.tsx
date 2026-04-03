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
 * Viewing angle: slightly from the right, so the LEFT edge
 * of the spool is visible. Structure back→front:
 *   1. Back flange disc (offset left, mostly hidden)
 *   2. Filament band visible on the LEFT between the two discs
 *   3. Front flange disc (the main face we see)
 *   4. Core hole in center of front face
 */
export function SpoolPreview({
  colorHex,
  brand,
  material,
  colorName,
  weight,
  className,
}: SpoolPreviewProps) {
  const shadow = darken(colorHex, 0.25);
  const darkEdge = darken(colorHex, 0.15);
  const highlight = lighten(colorHex, 0.12);
  const light = isLightColor(colorHex);

  // ── Geometry ──
  const cy = 148;           // shared center Y
  const flangeRx = 100;     // flange ellipse horizontal radius
  const flangeRy = 112;     // flange ellipse vertical radius
  const depth = 38;         // total spool width (offset between front & back)

  // Front flange is to the right, back flange offset to the left
  const frontX = 165;
  const backX = frontX - depth;

  // Filament is slightly narrower than flanges (sits inside the rims)
  const filRx = flangeRx - 8;
  const filRy = flangeRy - 9;

  // Core hole
  const coreRx = 24;
  const coreRy = 27;

  const uid = `spr-${colorHex.replace("#", "")}`;

  /**
   * Left-side crescent: the visible band on the LEFT edge
   * between a front ellipse and a back ellipse.
   *
   * Draws: front-top → LEFT arc to front-bottom →
   *        line to back-bottom → LEFT arc back to back-top → close
   */
  function leftCrescent(
    fCx: number, bCx: number,
    arcRx: number, arcRy: number,
  ): string {
    return [
      // Start at top of front ellipse
      `M ${fCx} ${cy - arcRy}`,
      // Arc counter-clockwise (left side) to bottom of front ellipse
      `A ${arcRx} ${arcRy} 0 0 0 ${fCx} ${cy + arcRy}`,
      // Line across to bottom of back ellipse
      `L ${bCx} ${cy + arcRy}`,
      // Arc clockwise (left side, going up) to top of back ellipse
      `A ${arcRx} ${arcRy} 0 0 1 ${bCx} ${cy - arcRy}`,
      `Z`,
    ].join(" ");
  }

  const filamentBand = leftCrescent(frontX, backX, filRx, filRy);
  const flangeGap = leftCrescent(frontX, backX, flangeRx, flangeRy);

  return (
    <svg
      viewBox="0 0 320 320"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={`Spool preview: ${brand ?? ""} ${material ?? ""} ${colorName ?? ""}`}
    >
      <defs>
        {/* Filament band gradient (cylinder lighting, light from right) */}
        <linearGradient id={`${uid}-fil`} x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%" stopColor={darkEdge} />
          <stop offset="20%" stopColor={colorHex} />
          <stop offset="45%" stopColor={highlight} />
          <stop offset="70%" stopColor={colorHex} />
          <stop offset="100%" stopColor={shadow} />
        </linearGradient>

        {/* Cardboard edge */}
        <linearGradient id={`${uid}-ce`} x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%" stopColor="#a68b5b" />
          <stop offset="30%" stopColor="#c4a574" />
          <stop offset="60%" stopColor="#b8996a" />
          <stop offset="100%" stopColor="#8a7048" />
        </linearGradient>

        {/* Front flange face */}
        <radialGradient id={`${uid}-ff`} cx="0.42" cy="0.42" r="0.6">
          <stop offset="0%" stopColor="#dcc8a4" />
          <stop offset="50%" stopColor="#c4a574" />
          <stop offset="100%" stopColor="#a68b5b" />
        </radialGradient>

        {/* Back flange face */}
        <linearGradient id={`${uid}-bf`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#b09060" />
          <stop offset="100%" stopColor="#8a7048" />
        </linearGradient>

        {/* Dark gap (shadow where flange meets filament) */}
        <linearGradient id={`${uid}-gap`} x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%" stopColor="#4a3d28" />
          <stop offset="50%" stopColor="#2a2018" />
          <stop offset="100%" stopColor="#1a1510" />
        </linearGradient>

        {/* Core hole */}
        <radialGradient id={`${uid}-core`} cx="0.4" cy="0.4" r="0.6">
          <stop offset="0%" stopColor="#2a2a2a" />
          <stop offset="100%" stopColor="#111" />
        </radialGradient>

        {/* Drop shadow */}
        <radialGradient id={`${uid}-shd`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#000" stopOpacity="0.18" />
          <stop offset="70%" stopColor="#000" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>

        {/* Strand texture */}
        <pattern id={`${uid}-str`} width="320" height="3.5" patternUnits="userSpaceOnUse">
          <line x1="0" y1="1.75" x2="320" y2="1.75"
            stroke={light ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)"} strokeWidth="1" />
        </pattern>
      </defs>

      {/* ═══════ Drop shadow ═══════ */}
      <ellipse cx={frontX - 8} cy="298" rx="85" ry="12" fill={`url(#${uid}-shd)`} />

      {/* ═══════ 1. Back flange face ═══════ */}
      <ellipse cx={backX} cy={cy} rx={flangeRx} ry={flangeRy} fill={`url(#${uid}-bf)`} />
      <ellipse cx={backX} cy={cy} rx={flangeRx} ry={flangeRy}
        fill="none" stroke="#7a6040" strokeWidth="0.8" />

      {/* ═══════ 2. Dark gap (full flange width, visible at top & bottom) ═══════ */}
      <path d={flangeGap} fill={`url(#${uid}-gap)`} />

      {/* ═══════ 3. FILAMENT BAND — the main colored area! ═══════ */}
      <path d={filamentBand} fill={`url(#${uid}-fil)`} />
      <path d={filamentBand} fill={`url(#${uid}-str)`} />

      {/* ═══════ 4. Front flange face ═══════ */}
      <ellipse cx={frontX} cy={cy} rx={flangeRx} ry={flangeRy} fill={`url(#${uid}-ff)`} />
      <ellipse cx={frontX} cy={cy} rx={flangeRx} ry={flangeRy}
        fill="none" stroke="#a68b5b" strokeWidth="1" />

      {/* Subtle cardboard texture on front face */}
      <ellipse cx={frontX} cy={cy} rx={flangeRx - 15} ry={flangeRy - 17}
        fill="none" stroke="#b8996a" strokeWidth="0.3" opacity="0.25" />

      {/* ═══════ 5. Filament ring visible through front face ═══════ */}
      {/* (the donut of filament visible between core hole and inner flange wall) */}
      <ellipse cx={frontX} cy={cy} rx={filRx} ry={filRy}
        fill={colorHex} opacity="0.35" />
      {/* Cover center with flange color (the inner hub area) */}
      <ellipse cx={frontX} cy={cy} rx={coreRx + 14} ry={coreRy + 16}
        fill={`url(#${uid}-ff)`} />

      {/* ═══════ 6. Core hole ═══════ */}
      <ellipse cx={frontX} cy={cy} rx={coreRx} ry={coreRy} fill={`url(#${uid}-core)`} />
      <ellipse cx={frontX} cy={cy} rx={coreRx} ry={coreRy}
        fill="none" stroke="#333" strokeWidth="0.8" />

      {/* ═══════ 7. Light highlight on front face ═══════ */}
      <ellipse cx={frontX - 15} cy={cy - 25} rx="40" ry="35"
        fill="white" opacity="0.045" />

      {/* ═══════ "Generated preview" badge ═══════ */}
      <rect x={frontX - 53} y="276" width="106" height="16" rx="8" fill="#e8e8e8" opacity="0.8" />
      <text x={frontX} y="287.5" fontSize="8" fill="#888" textAnchor="middle"
        fontFamily="system-ui, -apple-system, sans-serif" fontWeight="500">
        Generated preview
      </text>
    </svg>
  );
}
