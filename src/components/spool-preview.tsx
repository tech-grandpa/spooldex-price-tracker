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
 * 3/4 perspective SVG spool built from stacked tilted ellipses.
 *
 * Anatomy (back to front):
 *   1. Back flange — thin cardboard disc (wide)
 *   2. Filament body — thick colored cylinder (narrower than flanges)
 *   3. Front flange — thin cardboard disc (wide)
 *
 * From the 3/4 angle, the right-side crescent shows:
 *   - thin back flange edge (cardboard)
 *   - THICK filament band (the color!) between the two flanges
 *   - thin front flange edge (cardboard)
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
  // More angle = more depth visible = filament band clearly between flanges
  const cx = 155;         // front flange center X
  const cy = 140;         // shared center Y
  const flangeRx = 92;    // flange horizontal radius
  const flangeRy = 105;   // flange vertical radius

  const totalDepth = 44;  // total spool width (back flange face → front flange face)
  const flangeThick = 4;  // thickness of each cardboard flange

  // Derived positions (X centers for each layer)
  const backFaceX = cx - totalDepth;                    // back flange outer face
  const backInnerX = backFaceX + flangeThick;           // back flange inner face
  const frontInnerX = cx - flangeThick;                 // front flange inner face
  const frontFaceX = cx;                                // front flange outer face

  // Filament is narrower than flanges (sits inside the rims)
  const filRx = flangeRx - 10;
  const filRy = flangeRy - 11;

  // Core (center hole)
  const coreRx = 22;
  const coreRy = 25;

  const uid = `spr-${colorHex.replace("#", "")}`;

  // Build a crescent path (right-side visible edge between two coaxial ellipses)
  function crescent(
    frontCx: number, backCx: number,
    arcRx: number, arcRy: number,
  ): string {
    return [
      `M ${frontCx} ${cy - arcRy}`,
      `A ${arcRx} ${arcRy} 0 0 1 ${frontCx} ${cy + arcRy}`,
      `L ${backCx} ${cy + arcRy}`,
      `A ${arcRx} ${arcRy} 0 0 0 ${backCx} ${cy - arcRy}`,
      `Z`,
    ].join(" ");
  }

  // Crescents for each visible edge layer
  const backFlangeEdge = crescent(backInnerX, backFaceX, flangeRx, flangeRy);
  const filamentEdge = crescent(frontInnerX, backInnerX, filRx, filRy);
  const frontFlangeEdge = crescent(frontFaceX, frontInnerX, flangeRx, flangeRy);

  // Flange top/bottom rim crescents (flanges extend beyond filament)
  const flangeTopCrescent = crescent(frontInnerX, backInnerX, flangeRx, flangeRy);

  return (
    <svg
      viewBox="0 0 300 310"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={`Spool preview: ${brand ?? ""} ${material ?? ""} ${colorName ?? ""}`}
    >
      <defs>
        {/* Filament edge — horizontal gradient for cylinder lighting */}
        <linearGradient id={`${uid}-fil`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={darkEdge} />
          <stop offset="25%" stopColor={colorHex} />
          <stop offset="50%" stopColor={highlight} />
          <stop offset="75%" stopColor={colorHex} />
          <stop offset="100%" stopColor={darkEdge} />
        </linearGradient>

        {/* Filament face (front-facing wound layers visible through flange gap) */}
        <radialGradient id={`${uid}-filface`} cx="0.45" cy="0.45" r="0.55">
          <stop offset="30%" stopColor={colorHex} />
          <stop offset="100%" stopColor={darkEdge} />
        </radialGradient>

        {/* Cardboard edge gradient */}
        <linearGradient id={`${uid}-ce`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#8a7048" />
          <stop offset="40%" stopColor="#c4a574" />
          <stop offset="70%" stopColor="#d4b896" />
          <stop offset="100%" stopColor="#a68b5b" />
        </linearGradient>

        {/* Front flange face */}
        <linearGradient id={`${uid}-ff`} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#d8c4a0" />
          <stop offset="40%" stopColor="#c4a574" />
          <stop offset="100%" stopColor="#b09060" />
        </linearGradient>

        {/* Back flange face */}
        <linearGradient id={`${uid}-bf`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#b8996a" />
          <stop offset="100%" stopColor="#8a7048" />
        </linearGradient>

        {/* Inner gap between flange and filament — dark shadow */}
        <linearGradient id={`${uid}-gap`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3a3020" />
          <stop offset="50%" stopColor="#2a2018" />
          <stop offset="100%" stopColor="#3a3020" />
        </linearGradient>

        {/* Core hole */}
        <radialGradient id={`${uid}-core`} cx="0.4" cy="0.4" r="0.6">
          <stop offset="0%" stopColor="#2a2a2a" />
          <stop offset="100%" stopColor="#111" />
        </radialGradient>

        {/* Drop shadow */}
        <radialGradient id={`${uid}-shd`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#000" stopOpacity="0.2" />
          <stop offset="70%" stopColor="#000" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>

        {/* Strand texture (horizontal lines on filament edge) */}
        <pattern id={`${uid}-str`} width="300" height="3" patternUnits="userSpaceOnUse">
          <line x1="0" y1="1.5" x2="300" y2="1.5"
            stroke={light ? "rgba(0,0,0,0.045)" : "rgba(255,255,255,0.045)"} strokeWidth="1" />
        </pattern>
      </defs>

      {/* ═══════════════════════════════════════════ */}
      {/* Layer 1: Drop shadow                       */}
      {/* ═══════════════════════════════════════════ */}
      <ellipse cx={cx - 10} cy="292" rx="80" ry="11" fill={`url(#${uid}-shd)`} />

      {/* ═══════════════════════════════════════════ */}
      {/* Layer 2: Back flange face                  */}
      {/* ═══════════════════════════════════════════ */}
      <ellipse cx={backFaceX} cy={cy} rx={flangeRx} ry={flangeRy} fill={`url(#${uid}-bf)`} />
      <ellipse cx={backFaceX} cy={cy} rx={flangeRx} ry={flangeRy}
        fill="none" stroke="#8a7048" strokeWidth="0.8" />

      {/* ═══════════════════════════════════════════ */}
      {/* Layer 3: Back flange edge (thin cardboard) */}
      {/* ═══════════════════════════════════════════ */}
      <path d={backFlangeEdge} fill={`url(#${uid}-ce)`} />

      {/* ═══════════════════════════════════════════ */}
      {/* Layer 4: Gap shadow between back flange    */}
      {/*          inner wall and filament outer edge */}
      {/* (flanges are wider than filament → visible */}
      {/*  dark gap at top and bottom)               */}
      {/* ═══════════════════════════════════════════ */}
      <path d={flangeTopCrescent} fill={`url(#${uid}-gap)`} />

      {/* ═══════════════════════════════════════════ */}
      {/* Layer 5: FILAMENT — the main colored band! */}
      {/* This is the thick crescent between flanges */}
      {/* ═══════════════════════════════════════════ */}
      <path d={filamentEdge} fill={`url(#${uid}-fil)`} />
      {/* Strand texture overlay */}
      <path d={filamentEdge} fill={`url(#${uid}-str)`} />

      {/* ═══════════════════════════════════════════ */}
      {/* Layer 6: Front flange edge (thin cardboard)*/}
      {/* ═══════════════════════════════════════════ */}
      <path d={frontFlangeEdge} fill={`url(#${uid}-ce)`} />

      {/* ═══════════════════════════════════════════ */}
      {/* Layer 7: Front flange face                 */}
      {/* ═══════════════════════════════════════════ */}
      <ellipse cx={frontFaceX} cy={cy} rx={flangeRx} ry={flangeRy} fill={`url(#${uid}-ff)`} />
      <ellipse cx={frontFaceX} cy={cy} rx={flangeRx} ry={flangeRy}
        fill="none" stroke="#a68b5b" strokeWidth="1" />

      {/* Cardboard texture rings on front face */}
      <ellipse cx={frontFaceX} cy={cy} rx={flangeRx - 14} ry={flangeRy - 16}
        fill="none" stroke="#b8996a" strokeWidth="0.3" opacity="0.3" />

      {/* ═══════════════════════════════════════════ */}
      {/* Layer 8: Filament visible through front    */}
      {/* flange (the ring between core and inner    */}
      {/* flange wall on the front face)             */}
      {/* ═══════════════════════════════════════════ */}
      {/* Filament donut on front face */}
      <ellipse cx={frontFaceX} cy={cy} rx={filRx} ry={filRy}
        fill={`url(#${uid}-filface)`} opacity="0.6" />
      {/* Mask out center (will be covered by core) and outer ring (covered by flange face) */}
      {/* Actually: redraw flange face as a ring to reveal filament underneath */}
      {/* Simpler approach: draw filament ring, then cover with flange-colored inner ring */}
      <ellipse cx={frontFaceX} cy={cy} rx={coreRx + 12} ry={coreRy + 13}
        fill={`url(#${uid}-ff)`} />
      <ellipse cx={frontFaceX} cy={cy} rx={coreRx + 12} ry={coreRy + 13}
        fill="none" stroke="#b8996a" strokeWidth="0.3" opacity="0.2" />

      {/* ═══════════════════════════════════════════ */}
      {/* Layer 9: Core hole                         */}
      {/* ═══════════════════════════════════════════ */}
      <ellipse cx={frontFaceX} cy={cy} rx={coreRx} ry={coreRy} fill={`url(#${uid}-core)`} />
      <ellipse cx={frontFaceX} cy={cy} rx={coreRx} ry={coreRy}
        fill="none" stroke="#333" strokeWidth="0.8" />

      {/* ═══════════════════════════════════════════ */}
      {/* Layer 10: Subtle light highlights          */}
      {/* ═══════════════════════════════════════════ */}
      <ellipse cx={frontFaceX - 18} cy={cy - 28} rx="38" ry="32"
        fill="white" opacity="0.04" />

      {/* ═══════════════════════════════════════════ */}
      {/* "Generated preview" badge                  */}
      {/* ═══════════════════════════════════════════ */}
      <rect x={cx - 53} y="268" width="106" height="16" rx="8" fill="#e8e8e8" opacity="0.8" />
      <text x={cx} y="279.5" fontSize="8" fill="#888" textAnchor="middle"
        fontFamily="system-ui, -apple-system, sans-serif" fontWeight="500">
        Generated preview
      </text>
    </svg>
  );
}
