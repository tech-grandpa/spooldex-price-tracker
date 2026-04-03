"use client";

import { useState } from "react";

interface ProductGalleryProps {
  images: string[];
  alt: string;
  colorHex?: string | null;
}

export function ProductGallery({ images, alt, colorHex }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  // No images — show color swatch or placeholder
  if (images.length === 0) {
    return (
      <div
        className={colorHex ? "flex h-full min-h-[360px] items-center justify-center" : "flex h-full min-h-[360px] items-center justify-center bg-gradient-to-br from-secondary to-muted/30"}
        style={colorHex ? { background: colorHex } : undefined}
      >
        {colorHex ? (
          <div className="h-32 w-32 rounded-full border-[14px] opacity-20"
            style={{ borderColor: "rgba(255,255,255,0.2)" }}
          />
        ) : (
          <span className="text-lg font-medium text-muted-foreground">No preview</span>
        )}
      </div>
    );
  }

  // Single image
  if (images.length === 1) {
    return (
      <div className="flex h-full min-h-[360px] items-center justify-center bg-secondary p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[0]}
          alt={alt}
          className="max-h-[340px] w-auto max-w-full rounded-lg object-contain"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      </div>
    );
  }

  // Multiple images — gallery with thumbnails
  return (
    <div className="flex h-full min-h-[360px] flex-col">
      {/* Main image */}
      <div className="relative flex flex-1 items-center justify-center bg-secondary p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[activeIndex]}
          alt={`${alt} — ${activeIndex + 1} of ${images.length}`}
          className="max-h-[280px] w-auto max-w-full rounded-lg object-contain transition-opacity duration-200"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />

        {/* Navigation arrows */}
        <button
          onClick={() => setActiveIndex((activeIndex - 1 + images.length) % images.length)}
          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-card/80 p-1.5 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-card hover:text-foreground"
          aria-label="Previous image"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <button
          onClick={() => setActiveIndex((activeIndex + 1) % images.length)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-card/80 p-1.5 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-card hover:text-foreground"
          aria-label="Next image"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>

        {/* Image counter */}
        <span className="absolute bottom-2 right-2 rounded-full bg-foreground/60 px-2 py-0.5 text-xs font-medium text-primary-foreground backdrop-blur-sm">
          {activeIndex + 1} / {images.length}
        </span>
      </div>

      {/* Thumbnail strip */}
      <div className="flex gap-1 border-t border-border bg-card p-2">
        {images.map((url, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={`relative h-16 flex-1 overflow-hidden rounded-md border-2 transition-all ${
              i === activeIndex
                ? "border-primary ring-1 ring-primary/30"
                : "border-transparent opacity-60 hover:opacity-100"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`${alt} thumbnail ${i + 1}`}
              className="h-full w-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
