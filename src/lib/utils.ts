export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

export function normalizeComparable(input: string | null | undefined) {
  return (input ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildAbsoluteUrl(pathname: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";
  return `${base}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

export function formatCurrency(cents: number | null | undefined, currency = "EUR", locale = "de-DE") {
  if (cents == null) return "—";
  return new Intl.NumberFormat(locale === "de" ? "de-DE" : locale === "en" ? "en-GB" : locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatDateTime(value: Date | string, locale = "de") {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatDateShort(value: Date | string, locale = "de") {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    day: "numeric",
    month: "short",
  }).format(date);
}

export function formatFreshness(value: Date | string | null | undefined) {
  if (!value) return "not checked yet";
  const date = value instanceof Date ? value : new Date(value);
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60 * 1000) return "just now";
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

export function parseNumberish(value: string | null) {
  if (!value) return null;
  const normalized = value.replace(/[^\d.,]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toPriceCents(value: number | null | undefined) {
  if (value == null) return null;
  return Math.round(value * 100);
}

export function packTypeLabel(packType: string) {
  switch (packType) {
    case "bulk":
      return "Bulk pack";
    case "variety":
      return "Variety pack";
    case "sampler":
      return "Sampler";
    case "mixed":
      return "Mixed materials";
    default:
      return "Single spool";
  }
}

export function computePricePerKgCents(priceCents: number | null, totalWeightG: number | null | undefined) {
  if (priceCents == null || totalWeightG == null || totalWeightG <= 0) return null;
  return Math.round((priceCents / totalWeightG) * 1000);
}
