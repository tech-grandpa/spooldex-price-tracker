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
 * 3/4 perspective SVG spool — built from stacked tilted ellipses.
 *
 * Think of it as slicing a spool into layers from back to front:
 *   1. Back flange (ellipse, partially hidden)
 *   2. Filament edge band (crescent between back & front filament ellipses)
 *   3. Front filament face (ellipse, donut shape with core hole)
 *   4. Front flange (ellipse, with label and cutout windows)
 *
 * All layers share the same ellipse shape (rx, ry) just offset by `depth` in X
 * to simulate the 3/4 viewing angle. Back-to-front ordering + clipping ensures
 * only physically visible surfaces render.
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

  const labelText = light ? "#1a1a1a" : "#ffffff";
  const labelSub = light ? "#4a4a4a" : "#cccccc";

  // ── Geometry ──
  // All circles are tilted ~20° so they appear as ellipses.
  // Depth offset simulates the cylinder wall between front and back.
  const cx = 150;        // center X (all ellipses aligned)
  const cy = 140;        // center Y
  const rx = 95;         // horizontal radius
  const ry = 105;        // vertical radius (slightly > rx for tilt look)
  const depth = 32;      // horizontal offset back→front (spool width)

  // Back ellipse center
  const bx = cx - depth; // back flange shifted left

  // Filament sits inward from flange
  const filRx = rx - 8;  // filament outer radius
  const filRy = ry - 9;
  const coreRx = 24;     // core hole
  const coreRy = 26;

  const uid = `spr-${colorHex.replace("#", "")}`;

  // ── Helpers ──
  const trunc = (s: string, max: number) => (s.length > max ? s.slice(0, max - 1) + "…" : s);

  // SVG arc path for a bottom-half crescent (right side visible edge).
  // Draws from top of front ellipse → around bottom → to top again,
  // then back around the back ellipse. This forms the visible cylinder wall.
  function crescentPath(
    fCx: number, bCx: number, sharedCy: number,
    arcRx: number, arcRy: number,
  ): string {
    // Front ellipse: right side from top to bottom
    // Back ellipse: right side from bottom to top
    // Together they form the visible crescent on the right
    const fTop = { x: fCx, y: sharedCy - arcRy };
    const fBot = { x: fCx, y: sharedCy + arcRy };
    const bTop = { x: bCx, y: sharedCy - arcRy };
    const bBot = { x: bCx, y: sharedCy + arcRy };

    return [
      // Start at front-top, arc right to front-bottom
      `M ${fTop.x} ${fTop.y}`,
      `A ${arcRx} ${arcRy} 0 0 1 ${fBot.x} ${fBot.y}`,
      // Line to back-bottom
      `L ${bBot.x} ${bBot.y}`,
      // Arc right (sweep=0 → counter-clockwise = going up on right side) to back-top
      `A ${arcRx} ${arcRy} 0 0 0 ${bTop.x} ${bTop.y}`,
      `Z`,
    ].join(" ");
  }

  const flangeEdge = crescentPath(cx, bx, cy, rx, ry);
  const filamentEdge = crescentPath(cx, bx, cy, filRx, filRy);

  return (
    <svg
      viewBox="0 0 300 310"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={`Spool preview: ${brand ?? ""} ${material ?? ""} ${colorName ?? ""}`}
    >
      <defs>
        {/* Filament edge gradient — left-to-right lighting on cylinder wall */}
        <linearGradient id={`${uid}-fil-edge`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={darkEdge} />
          <stop offset="30%" stopColor={colorHex} />
          <stop offset="55%" stopColor={highlight} />
          <stop offset="80%" stopColor={colorHex} />
          <stop offset="100%" stopColor={darkEdge} />
        </linearGradient>

        {/* Flange edge gradient (cardboard cylinder wall) */}
        <linearGradient id={`${uid}-flange-edge`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#8a7048" />
          <stop offset="35%" stopColor="#c4a574" />
          <stop offset="60%" stopColor="#d4b896" />
          <stop offset="100%" stopColor="#a68b5b" />
        </linearGradient>

        {/* Front flange face gradient */}
        <linearGradient id={`${uid}-flange-face`} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#d8c4a0" />
          <stop offset="40%" stopColor="#c4a574" />
          <stop offset="100%" stopColor="#b09060" />
        </linearGradient>

        {/* Back flange face */}
        <linearGradient id={`${uid}-flange-back`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#b8996a" />
          <stop offset="100%" stopColor="#8a7048" />
        </linearGradient>

        {/* Core hole */}
        <radialGradient id={`${uid}-core`} cx="0.4" cy="0.4" r="0.6">
          <stop offset="0%" stopColor="#2a2a2a" />
          <stop offset="100%" stopColor="#111" />
        </radialGradient>

        {/* Shadow */}
        <radialGradient id={`${uid}-shd`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#000" stopOpacity="0.2" />
          <stop offset="70%" stopColor="#000" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>

        {/* Label background */}
        <linearGradient id={`${uid}-lbl`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={darken(colorHex, 0.35)} />
          <stop offset="100%" stopColor={darken(colorHex, 0.45)} />
        </linearGradient>

        {/* Clip front flange — everything inside the front flange ellipse */}
        <clipPath id={`${uid}-fc`}>
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} />
        </clipPath>

        {/* Strand texture */}
        <pattern id={`${uid}-str`} width="100%" height="3" patternUnits="userSpaceOnUse">
          <line x1="0" y1="1.5" x2="300" y2="1.5" stroke={light ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)"} strokeWidth="1" />
        </pattern>
      </defs>

      {/* ════ Layer 1: Drop shadow ════ */}
      <ellipse cx={cx - 5} cy="290" rx="85" ry="12" fill={`url(#${uid}-shd)`} />

      {/* ════ Layer 2: Back flange face (partially visible above/below filament) ════ */}
      <ellipse cx={bx} cy={cy} rx={rx} ry={ry} fill={`url(#${uid}-flange-back)`} />
      <ellipse cx={bx} cy={cy} rx={rx} ry={ry} fill="none" stroke="#8a7048" strokeWidth="0.8" />

      {/* ════ Layer 3: Flange edge (crescent between back & front flange) ════ */}
      <path d={flangeEdge} fill={`url(#${uid}-flange-edge)`} />
      <path d={flangeEdge} fill="none" stroke="#a68b5b" strokeWidth="0.5" opacity="0.6" />

      {/* ════ Layer 4: Filament edge (crescent between back & front filament circle) ════ */}
      <path d={filamentEdge} fill={`url(#${uid}-fil-edge)`} />
      {/* Strand texture on filament edge */}
      <path d={filamentEdge} fill={`url(#${uid}-str)`} />
      {/* Subtle top/bottom edge separation */}
      <line x1={bx} y1={cy - filRy} x2={cx} y2={cy - filRy}
        stroke={light ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"} strokeWidth="0.5" />
      <line x1={bx} y1={cy + filRy} x2={cx} y2={cy + filRy}
        stroke="rgba(0,0,0,0.1)" strokeWidth="0.5" />

      {/* ════ Layer 5: Front flange face ════ */}
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${uid}-flange-face)`} />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke="#a68b5b" strokeWidth="1" />

      {/* Cardboard texture rings */}
      <ellipse cx={cx} cy={cy} rx={rx - 12} ry={ry - 13} fill="none" stroke="#b8996a" strokeWidth="0.3" opacity="0.35" />
      <ellipse cx={cx} cy={cy} rx={rx - 28} ry={ry - 31} fill="none" stroke="#b8996a" strokeWidth="0.3" opacity="0.25" />

      {/* ════ Filament visible through front flange (donut between core and flange inner wall) ════ */}
      {/* Show filament color in a ring on the front face */}
      <g clipPath={`url(#${uid}-fc)`}>
        {/* Outer filament ring */}
        <ellipse cx={cx} cy={cy} rx={filRx} ry={filRy} fill={colorHex} opacity="0.45" />
        {/* Core cuts out the center */}
        <ellipse cx={cx} cy={cy} rx={coreRx + 10} ry={coreRy + 11} fill={`url(#${uid}-flange-face)`} />
      </g>

      {/* Filament viewing windows (cutouts showing filament inside) */}
      {/* Window top-right */}
      <ellipse cx={cx + 32} cy={cy - 58} rx="16" ry="12" fill={colorHex} opacity="0.6" />
      <ellipse cx={cx + 32} cy={cy - 58} rx="16" ry="12" fill="none" stroke="#a68b5b" strokeWidth="0.7" />
      {/* Window right */}
      <ellipse cx={cx + 48} cy={cy + 5} rx="12" ry="16" fill={colorHex} opacity="0.55" />
      <ellipse cx={cx + 48} cy={cy + 5} rx="12" ry="16" fill="none" stroke="#a68b5b" strokeWidth="0.7" />
      {/* Window bottom-right */}
      <ellipse cx={cx + 30} cy={cy + 62} rx="16" ry="12" fill={darken(colorHex, 0.06)} opacity="0.55" />
      <ellipse cx={cx + 30} cy={cy + 62} rx="16" ry="12" fill="none" stroke="#a68b5b" strokeWidth="0.7" />

      {/* ════ Core hole ════ */}
      <ellipse cx={cx} cy={cy} rx={coreRx} ry={coreRy} fill={`url(#${uid}-core)`} />
      <ellipse cx={cx} cy={cy} rx={coreRx} ry={coreRy} fill="none" stroke="#333" strokeWidth="0.8" />

      {/* ════ Label on front flange (left half, avoiding windows/core) ════ */}
      <g clipPath={`url(#${uid}-fc)`}>
        <rect x={cx - 82} y={cy - 42} width="74" height="62" rx="5" fill={`url(#${uid}-lbl)`} opacity="0.85" />

        <text x={cx - 45} y={cy - 24} fontSize="11" fontWeight="700" fill={labelText}
          textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" opacity="0.95">
          {trunc(brand ?? "Filament", 12)}
        </text>
        <text x={cx - 45} y={cy - 10} fontSize="9" fontWeight="600" fill={labelSub}
          textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" opacity="0.9">
          {trunc(material ?? "", 14)}
        </text>
        {colorName && (
          <text x={cx - 45} y={cy + 3} fontSize="8" fill={labelSub}
            textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" opacity="0.85">
            {trunc(colorName, 16)}
          </text>
        )}
        {weight && (
          <text x={cx - 45} y={cy + 14} fontSize="7.5" fontWeight="500" fill={labelSub}
            textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" opacity="0.8">
            {weight}
          </text>
        )}
      </g>

      {/* ════ Front flange highlight (subtle light reflection top-left) ════ */}
      <ellipse cx={cx - 20} cy={cy - 30} rx="40" ry="35" fill="white" opacity="0.05" />

      {/* ════ "Generated preview" badge ════ */}
      <rect x={cx - 50} y="268" width="100" height="16" rx="8" fill="#e8e8e8" opacity="0.8" />
      <text x={cx} y="279.5" fontSize="8" fill="#888" textAnchor="middle"
        fontFamily="system-ui, -apple-system, sans-serif" fontWeight="500">
        Generated preview
      </text>
    </svg>
  );
}
