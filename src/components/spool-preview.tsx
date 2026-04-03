import { darken, lighten, isLightColor } from "@/lib/color-utils";

interface SpoolPreviewProps {
  /** Primary filament color hex (e.g. "#7A8B6F") */
  colorHex: string;
  /** Brand name */
  brand?: string;
  /** Material type (e.g. "PLA", "PETG") */
  material?: string;
  /** Color name (e.g. "Green Grey") */
  colorName?: string;
  /** Spool weight label (e.g. "1000g") */
  weight?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * 3/4 perspective SVG spool preview — mimics a real product photo.
 * Shows a standing spool at a slight angle with wound filament,
 * cardboard flanges, label, and realistic lighting/shadows.
 */
export function SpoolPreview({
  colorHex,
  brand,
  material,
  colorName,
  weight,
  className,
}: SpoolPreviewProps) {
  const shadow = darken(colorHex, 0.22);
  const darkEdge = darken(colorHex, 0.12);
  const highlight = lighten(colorHex, 0.15);
  const lightColor = isLightColor(colorHex);

  // Label text contrast
  const labelTextColor = lightColor ? "#1a1a1a" : "#ffffff";
  const labelSubColor = lightColor ? "#4a4a4a" : "#cccccc";

  const uid = `sp3d-${colorHex.replace("#", "")}`;

  // Label content
  const line1 = brand ?? "Filament";
  const line2 = material ?? "";
  const line3 = colorName ?? "";
  const line4 = weight ?? "";

  // Truncate helper
  const trunc = (s: string, max: number) => (s.length > max ? s.slice(0, max - 1) + "…" : s);

  return (
    <svg
      viewBox="0 0 280 320"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={`Spool preview: ${brand ?? ""} ${material ?? ""} ${colorName ?? ""}`}
    >
      <defs>
        {/* ── Filament side gradient (wound strands visible on edge) ── */}
        <linearGradient id={`${uid}-fil-side`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={shadow} />
          <stop offset="15%" stopColor={darkEdge} />
          <stop offset="40%" stopColor={colorHex} />
          <stop offset="55%" stopColor={highlight} />
          <stop offset="70%" stopColor={colorHex} />
          <stop offset="90%" stopColor={darkEdge} />
          <stop offset="100%" stopColor={shadow} />
        </linearGradient>

        {/* ── Filament face gradient (front-facing wound layers) ── */}
        <radialGradient id={`${uid}-fil-face`} cx="0.45" cy="0.45" r="0.55">
          <stop offset="0%" stopColor={highlight} stopOpacity="0.3" />
          <stop offset="50%" stopColor={colorHex} stopOpacity="0.15" />
          <stop offset="100%" stopColor={shadow} stopOpacity="0.3" />
        </radialGradient>

        {/* ── Cardboard flange gradient ── */}
        <linearGradient id={`${uid}-flange`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#d4b896" />
          <stop offset="40%" stopColor="#c4a574" />
          <stop offset="100%" stopColor="#a68b5b" />
        </linearGradient>

        {/* ── Flange back (darker, in shadow) ── */}
        <linearGradient id={`${uid}-flange-back`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#b8996a" />
          <stop offset="100%" stopColor="#8a7048" />
        </linearGradient>

        {/* ── Core hole ── */}
        <radialGradient id={`${uid}-core`} cx="0.42" cy="0.42" r="0.6">
          <stop offset="0%" stopColor="#2a2a2a" />
          <stop offset="100%" stopColor="#1a1a1a" />
        </radialGradient>

        {/* ── Shadow beneath spool ── */}
        <radialGradient id={`${uid}-shadow`} cx="0.5" cy="0.5" rx="0.5" ry="0.5">
          <stop offset="0%" stopColor="#000" stopOpacity="0.18" />
          <stop offset="70%" stopColor="#000" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>

        {/* ── Strand texture pattern ── */}
        <pattern id={`${uid}-strands`} x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
          <line x1="0" y1="2" x2="4" y2="2" stroke={lightColor ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)"} strokeWidth="1" />
        </pattern>

        {/* ── Label background on front flange ── */}
        <linearGradient id={`${uid}-label-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={darken(colorHex, 0.35)} />
          <stop offset="100%" stopColor={darken(colorHex, 0.45)} />
        </linearGradient>

        {/* Clip for the front flange label area */}
        <clipPath id={`${uid}-flange-clip`}>
          <ellipse cx="148" cy="145" rx="100" ry="108" />
        </clipPath>
      </defs>

      {/* ══════════ Drop shadow ══════════ */}
      <ellipse cx="145" cy="296" rx="90" ry="14" fill={`url(#${uid}-shadow)`} />

      {/* ══════════ Back flange (partially visible) ══════════ */}
      <ellipse cx="120" cy="145" rx="100" ry="108" fill={`url(#${uid}-flange-back)`} />
      {/* Back flange rim */}
      <ellipse cx="120" cy="145" rx="100" ry="108" fill="none" stroke="#8a7048" strokeWidth="1" opacity="0.5" />

      {/* ══════════ Filament band (the side/edge of wound filament) ══════════ */}
      {/* This connects the two flanges — the cylindrical edge showing wound strands */}
      <path
        d={`
          M 220 145
          Q 230 145, 248 145
          L 248 145
          Q 248 253, 148 253
          Q 48 253, 48 145
          Q 48 37, 148 37
          Q 248 37, 248 145
          L 220 145
          Q 220 53, 148 53
          Q 76 53, 76 145
          Q 76 237, 148 237
          Q 220 237, 220 145
          Z
        `}
        fill={`url(#${uid}-fil-side)`}
      />

      {/* Strand texture overlay on filament band */}
      <path
        d={`
          M 220 145
          Q 230 145, 248 145
          L 248 145
          Q 248 253, 148 253
          Q 48 253, 48 145
          Q 48 37, 148 37
          Q 248 37, 248 145
          L 220 145
          Q 220 53, 148 53
          Q 76 53, 76 145
          Q 76 237, 148 237
          Q 220 237, 220 145
          Z
        `}
        fill={`url(#${uid}-strands)`}
      />

      {/* Horizontal strand lines on the visible edge */}
      {Array.from({ length: 22 }, (_, i) => {
        const y = 50 + i * 9;
        if (y > 240) return null;
        // Calculate the x positions based on the elliptical shape
        const t = (y - 145) / 108;
        if (Math.abs(t) > 1) return null;
        const xOffset = Math.sqrt(1 - t * t) * 100;
        const xLeft = Math.max(148 - xOffset, 48);
        const xRight = 248;
        const leftInner = Math.max(148 - xOffset * 0.72, 76);
        return (
          <line
            key={i}
            x1={xRight}
            y1={y}
            x2={xRight - 28}
            y2={y}
            stroke={lightColor ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)"}
            strokeWidth="0.8"
          />
        );
      })}

      {/* Light reflection band on filament edge */}
      <path
        d={`
          M 236 145
          Q 236 60, 148 50
          L 148 44
          Q 245 44, 245 145
          Q 245 246, 148 252
          L 148 246
          Q 236 240, 236 145
          Z
        `}
        fill="white"
        opacity="0.06"
      />

      {/* ══════════ Front flange ══════════ */}
      <ellipse cx="148" cy="145" rx="100" ry="108" fill={`url(#${uid}-flange)`} />
      {/* Subtle cardboard texture — concentric rings */}
      <ellipse cx="148" cy="145" rx="85" ry="92" fill="none" stroke="#b8996a" strokeWidth="0.3" opacity="0.4" />
      <ellipse cx="148" cy="145" rx="70" ry="76" fill="none" stroke="#b8996a" strokeWidth="0.3" opacity="0.3" />
      {/* Flange rim */}
      <ellipse cx="148" cy="145" rx="100" ry="108" fill="none" stroke="#a68b5b" strokeWidth="1.2" />

      {/* ══════════ Filament visible through windows (cutouts) ══════════ */}
      {/* Window 1 — top right */}
      <ellipse cx="180" cy="80" rx="18" ry="14" fill={colorHex} opacity="0.7" />
      <ellipse cx="180" cy="80" rx="18" ry="14" fill="none" stroke="#a68b5b" strokeWidth="0.8" />
      {/* Window 2 — right */}
      <ellipse cx="205" cy="140" rx="14" ry="18" fill={colorHex} opacity="0.65" />
      <ellipse cx="205" cy="140" rx="14" ry="18" fill="none" stroke="#a68b5b" strokeWidth="0.8" />
      {/* Window 3 — bottom right */}
      <ellipse cx="185" cy="208" rx="18" ry="14" fill={darken(colorHex, 0.08)} opacity="0.65" />
      <ellipse cx="185" cy="208" rx="18" ry="14" fill="none" stroke="#a68b5b" strokeWidth="0.8" />

      {/* ══════════ Center core hole ══════════ */}
      <ellipse cx="148" cy="145" rx="26" ry="28" fill={`url(#${uid}-core)`} />
      <ellipse cx="148" cy="145" rx="26" ry="28" fill="none" stroke="#3a3a3a" strokeWidth="1" />
      {/* Inner core ring */}
      <ellipse cx="148" cy="145" rx="22" ry="24" fill="none" stroke="#444" strokeWidth="0.5" opacity="0.5" />

      {/* ══════════ Label on front flange ══════════ */}
      <g clipPath={`url(#${uid}-flange-clip)`}>
        {/* Label background — rounded rect on the flange */}
        <rect x="68" cy="80" y="80" width="96" height="72" rx="5" fill={`url(#${uid}-label-bg)`} opacity="0.88" />

        {/* Brand */}
        <text x="116" y="97" fontSize="12" fontWeight="700" fill={labelTextColor} textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" opacity="0.95">
          {trunc(line1, 14)}
        </text>

        {/* Material */}
        <text x="116" y="113" fontSize="10" fontWeight="600" fill={labelSubColor} textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" opacity="0.9">
          {trunc(line2, 16)}
        </text>

        {/* Color name */}
        {line3 && (
          <text x="116" y="128" fontSize="8.5" fontWeight="400" fill={labelSubColor} textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" opacity="0.85">
            {trunc(line3, 18)}
          </text>
        )}

        {/* Weight */}
        {line4 && (
          <text x="116" y="143" fontSize="8" fontWeight="500" fill={labelSubColor} textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" opacity="0.8">
            {line4}
          </text>
        )}
      </g>

      {/* ══════════ Light reflection on front flange ══════════ */}
      <ellipse cx="125" cy="110" rx="45" ry="40" fill="white" opacity="0.06" />

      {/* ══════════ "Preview" indicator ══════════ */}
      <rect x="95" y="262" width="106" height="16" rx="8" fill="#e8e8e8" opacity="0.85" />
      <text x="148" y="274" fontSize="8.5" fill="#888" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="500">
        Generated preview
      </text>
    </svg>
  );
}
