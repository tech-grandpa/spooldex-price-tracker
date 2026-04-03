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
 * Pure SVG spool preview component.
 * Renders a front-facing filament spool with realistic lighting,
 * wound filament texture, and a label section.
 * SSR-compatible, scales to any container size.
 */
export function SpoolPreview({
  colorHex,
  brand,
  material,
  colorName,
  weight,
  className,
}: SpoolPreviewProps) {
  // Derive color variants for realistic shading
  const shadow = darken(colorHex, 0.25);
  const darkEdge = darken(colorHex, 0.15);
  const highlight = lighten(colorHex, 0.18);
  const lightColor = isLightColor(colorHex);

  // Flange (spool rim) colors
  const flangeBase = "#3a3a3c";
  const flangeDark = "#2a2a2c";
  const flangeLight = "#525254";
  const flangeHighlight = "#6a6a6c";

  // Label text
  const labelLine1 = brand ?? "Filament";
  const labelLine2 = [material, colorName].filter(Boolean).join(" · ");
  const labelLine3 = weight ?? "";

  // Unique ID prefix for gradients (avoid collisions if multiple on page)
  const uid = `sp-${colorHex.replace("#", "")}`;

  return (
    <svg
      viewBox="0 0 200 280"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={`Spool preview: ${brand ?? ""} ${material ?? ""} ${colorName ?? ""}`}
    >
      <defs>
        {/* Flange gradient — subtle bevel */}
        <linearGradient id={`${uid}-flange`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={flangeHighlight} />
          <stop offset="30%" stopColor={flangeBase} />
          <stop offset="100%" stopColor={flangeDark} />
        </linearGradient>

        {/* Filament body — vertical gradient for wound-spool depth */}
        <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={shadow} />
          <stop offset="12%" stopColor={darkEdge} />
          <stop offset="35%" stopColor={colorHex} />
          <stop offset="48%" stopColor={highlight} />
          <stop offset="55%" stopColor={highlight} />
          <stop offset="70%" stopColor={colorHex} />
          <stop offset="88%" stopColor={darkEdge} />
          <stop offset="100%" stopColor={shadow} />
        </linearGradient>

        {/* Horizontal light falloff overlay */}
        <radialGradient id={`${uid}-sheen`} cx="0.45" cy="0.45" r="0.6">
          <stop offset="0%" stopColor="white" stopOpacity="0.1" />
          <stop offset="100%" stopColor="black" stopOpacity="0.12" />
        </radialGradient>

        {/* Spool core hole gradient */}
        <radialGradient id={`${uid}-core`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#1a1a1c" />
          <stop offset="70%" stopColor="#2a2a2c" />
          <stop offset="100%" stopColor={flangeBase} />
        </radialGradient>

        {/* Label background */}
        <linearGradient id={`${uid}-label`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5f5f5" />
          <stop offset="100%" stopColor="#e8e8e8" />
        </linearGradient>
      </defs>

      {/* ── Top flange ── */}
      <rect x="20" y="18" width="160" height="20" rx="4" fill={`url(#${uid}-flange)`} />
      {/* Flange edge highlight */}
      <rect x="20" y="18" width="160" height="2" rx="1" fill={flangeHighlight} opacity="0.5" />

      {/* ── Filament body (wound section) ── */}
      <rect x="28" y="38" width="144" height="130" rx="2" fill={`url(#${uid}-body)`} />

      {/* Wound filament texture lines */}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
        <line
          key={i}
          x1="28"
          y1={48 + i * 10}
          x2="172"
          y2={48 + i * 10}
          stroke={lightColor ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)"}
          strokeWidth="1"
        />
      ))}

      {/* Horizontal light sheen overlay */}
      <rect x="28" y="38" width="144" height="130" rx="2" fill={`url(#${uid}-sheen)`} />

      {/* Spool core hole */}
      <ellipse cx="100" cy="103" rx="22" ry="22" fill={`url(#${uid}-core)`} />
      {/* Core inner ring */}
      <ellipse cx="100" cy="103" rx="18" ry="18" fill="none" stroke={flangeLight} strokeWidth="0.5" opacity="0.4" />

      {/* ── Bottom flange ── */}
      <rect x="20" y="168" width="160" height="20" rx="4" fill={`url(#${uid}-flange)`} />
      {/* Flange bottom edge shadow */}
      <rect x="20" y="186" width="160" height="2" rx="1" fill={flangeDark} opacity="0.5" />

      {/* ── Label area ── */}
      <rect x="30" y="196" width="140" height="64" rx="6" fill={`url(#${uid}-label)`} />
      {/* Label border */}
      <rect x="30" y="196" width="140" height="64" rx="6" fill="none" stroke="#d4d4d4" strokeWidth="0.5" />

      {/* Color dot on label */}
      <circle cx="46" cy="216" r="6" fill={colorHex} stroke="#d4d4d4" strokeWidth="0.5" />

      {/* Label text */}
      <text x="58" y="219" fontSize="11" fontWeight="700" fill="#1a1a1a" fontFamily="system-ui, -apple-system, sans-serif">
        {labelLine1.length > 18 ? labelLine1.slice(0, 17) + "…" : labelLine1}
      </text>
      <text x="46" y="237" fontSize="9" fontWeight="500" fill="#4a4a4a" fontFamily="system-ui, -apple-system, sans-serif">
        {labelLine2.length > 24 ? labelLine2.slice(0, 23) + "…" : labelLine2}
      </text>
      {labelLine3 && (
        <text x="46" y="251" fontSize="8" fontWeight="400" fill="#6a6a6a" fontFamily="system-ui, -apple-system, sans-serif">
          {labelLine3}
        </text>
      )}

      {/* "Generated preview" badge */}
      <rect x="98" y="244" width="66" height="12" rx="3" fill="#e0e0e0" />
      <text x="131" y="253" fontSize="7" fill="#888" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif">
        Preview only
      </text>
    </svg>
  );
}
