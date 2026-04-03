"use client";

import { useState } from "react";
import { SpoolPreview } from "@/components/spool-preview";

interface ProductGalleryProps {
  images: string[];
  alt: string;
  colorHex?: string | null;
  brand?: string;
  material?: string;
  colorName?: string | null;
  weight?: string;
}

type GalleryItem =
  | { type: "image"; src: string }
  | { type: "spool" }
  | { type: "swatch" };

/**
 * Build the gallery items list:
 *   1. Real product images (first one is default)
 *   2. Spool preview (always present if colorHex exists)
 *   3. Color swatch (always present if colorHex exists)
 *   4. Remaining real images
 *
 * If no real images: spool preview is default.
 */
function buildGalleryItems(images: string[], hasColor: boolean): GalleryItem[] {
  const items: GalleryItem[] = [];

  if (images.length > 0) {
    // First real image
    items.push({ type: "image", src: images[0] });
  }

  // Spool preview + swatch always present when we have a color
  if (hasColor) {
    items.push({ type: "spool" });
    items.push({ type: "swatch" });
  }

  // Remaining real images
  for (let i = 1; i < images.length; i++) {
    items.push({ type: "image", src: images[i] });
  }

  return items;
}

export function ProductGallery({ images, alt, colorHex, brand, material, colorName, weight }: ProductGalleryProps) {
  const hasColor = !!colorHex;
  const items = buildGalleryItems(images, hasColor);
  const [activeIndex, setActiveIndex] = useState(0);

  // No items at all (no images, no color)
  if (items.length === 0) {
    return (
      <div className="flex h-full min-h-[360px] items-center justify-center bg-gradient-to-br from-secondary to-muted/30">
        <span className="text-lg font-medium text-muted-foreground">No preview</span>
      </div>
    );
  }

  const active = items[activeIndex] ?? items[0];

  function renderMain(item: GalleryItem) {
    switch (item.type) {
      case "image":
        return (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={item.src}
            alt={alt}
            className="max-h-[330px] w-auto max-w-full rounded-lg object-contain transition-opacity duration-200"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        );
      case "spool":
        return (
          <SpoolPreview
            colorHex={colorHex!}
            brand={brand}
            material={material}
            colorName={colorName ?? undefined}
            weight={weight}
            className="h-[300px] w-auto"
          />
        );
      case "swatch":
        return (
          <div className="flex flex-col items-center gap-3">
            <div
              className="h-44 w-44 rounded-2xl border border-border shadow-sm"
              style={{ backgroundColor: colorHex! }}
            />
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">{colorName ?? "Color"}</p>
              <p className="font-mono text-xs text-muted-foreground">{colorHex}</p>
            </div>
          </div>
        );
    }
  }

  function renderThumb(item: GalleryItem, i: number) {
    const isActive = i === activeIndex;
    const cls = `relative h-16 flex-1 overflow-hidden rounded-md border-2 transition-all ${
      isActive
        ? "border-primary ring-1 ring-primary/30"
        : "border-transparent opacity-60 hover:opacity-100"
    }`;

    switch (item.type) {
      case "image":
        return (
          <button key={i} onClick={() => setActiveIndex(i)} className={cls}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.src}
              alt={`${alt} thumbnail ${i + 1}`}
              className="h-full w-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </button>
        );
      case "spool":
        return (
          <button key={`spool-${i}`} onClick={() => setActiveIndex(i)} className={cls}>
            <div className="flex h-full w-full items-center justify-center bg-secondary">
              <SpoolPreview
                colorHex={colorHex!}
                brand={brand}
                material={material}
                className="h-14 w-auto"
              />
            </div>
          </button>
        );
      case "swatch":
        return (
          <button key={`swatch-${i}`} onClick={() => setActiveIndex(i)} className={cls}>
            <div className="flex h-full w-full items-center justify-center" style={{ backgroundColor: colorHex! }}>
              <span className="font-mono text-[8px] font-semibold text-white mix-blend-difference">
                {colorHex}
              </span>
            </div>
          </button>
        );
    }
  }

  // Single item — no thumbnails needed
  if (items.length === 1) {
    return (
      <div className="flex h-[360px] items-center justify-center bg-secondary p-4">
        {renderMain(active)}
      </div>
    );
  }

  // Multiple items — gallery with thumbnails
  return (
    <div className="flex h-full min-h-[360px] flex-col">
      {/* Main display — fixed height to prevent layout jumps */}
      <div className="relative flex h-[360px] shrink-0 items-center justify-center bg-secondary p-4">
        {renderMain(active)}

        {/* Navigation arrows */}
        <button
          onClick={() => setActiveIndex((activeIndex - 1 + items.length) % items.length)}
          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-card/80 p-1.5 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-card hover:text-foreground"
          aria-label="Previous"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <button
          onClick={() => setActiveIndex((activeIndex + 1) % items.length)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-card/80 p-1.5 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-card hover:text-foreground"
          aria-label="Next"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>

        {/* Counter */}
        <span className="absolute bottom-2 right-2 rounded-full bg-foreground/60 px-2 py-0.5 text-xs font-medium text-primary-foreground backdrop-blur-sm">
          {activeIndex + 1} / {items.length}
        </span>
      </div>

      {/* Thumbnail strip */}
      <div className="flex gap-1 border-t border-border bg-card p-2">
        {items.map((item, i) => renderThumb(item, i))}
      </div>
    </div>
  );
}
