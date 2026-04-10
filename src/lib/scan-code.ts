/**
 * Classify a raw scan code value into a lookup type.
 *
 * Supports: URLs (custom QR), EAN-13, UPC-A, GTIN-14, EAN-8, Bambu codes.
 */
export function classifyScanCode(raw: string): { ean?: string; bambuCode?: string; slug?: string } {
  const trimmed = raw.trim();

  // URL — custom QR code pointing to a filament page
  if (trimmed.startsWith("http")) {
    try {
      const slugMatch = new URL(trimmed).pathname.match(/\/filaments\/([^/]+)/);
      if (slugMatch) return { slug: slugMatch[1] };
    } catch {
      // invalid URL, fall through
    }
    return {};
  }

  // 13-digit EAN-13
  if (/^\d{13}$/.test(trimmed)) return { ean: trimmed };

  // 12-digit UPC-A → normalize to EAN-13
  if (/^\d{12}$/.test(trimmed)) return { ean: `0${trimmed}` };

  // 14-digit GTIN-14
  if (/^\d{14}$/.test(trimmed)) return { ean: trimmed };

  // 8-digit EAN-8
  if (/^\d{8}$/.test(trimmed)) return { ean: trimmed };

  // Bambu Lab codes (e.g. "GFL99-01", "GFA00-02")
  if (/^[A-Z]{2,4}\d{2,3}-\d{2}$/i.test(trimmed)) return { bambuCode: trimmed.toUpperCase() };

  return {};
}

/** Normalize UPC-A (12 digits) to EAN-13 by prepending 0 */
export function normalizeToEan13(code: string): string {
  const cleaned = code.replace(/\s/g, "");
  if (/^\d{12}$/.test(cleaned)) return `0${cleaned}`;
  return cleaned;
}
