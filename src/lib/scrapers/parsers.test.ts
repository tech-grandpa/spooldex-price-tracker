import { describe, expect, it } from "vitest";
import { parseBambuProductPageVariants, parseBambuTierOffer } from "@/lib/scrapers/bambu-store";
import { prusaStoreScraper } from "@/lib/scrapers/prusa-store";
import { extractOdooVariantOffers } from "@/lib/scrapers/sitemap-shop";
import { threeDjakeScraper } from "@/lib/scrapers/three-djake";

describe("shop parsers", () => {
  it("extracts 3DJake offers from product cards", () => {
    const offers = threeDjakeScraper.extractOffers!(
      `
        <ul id="productList">
          <li class="productCard" data-json='{"id":"pla-galaxy-black-1"}'>
            <a class="productCard__img__link" href="/elegoo/pla-galaxy-black-1?sai=22772">
              <img src="https://3d.nice-cdn.com/elegoo.webp" alt="Elegoo PLA Galaxy Black" />
            </a>
            <div class="productCard__content">
              <h3 class="productCard__title">
                <a class="productCard__link" href="/elegoo/pla-galaxy-black-1?sai=22772">
                  <strong class="productCard__brand">Elegoo</strong>
                  PLA Galaxy Black, 1,75 mm / 1000 g
                </a>
              </h3>
            </div>
            <div class="productCard__footer">
              <div class="productCard__price">
                <span>18,99&nbsp;€</span>
              </div>
              <p class="productCard__stock">Zustellung bis 27. März</p>
            </div>
          </li>
        </ul>
      `,
      "https://www.3djake.de/search?keyword=galaxy+black",
    );

    expect(offers[0]?.title).toContain("Elegoo");
    expect(offers[0]?.priceCents).toBe(1899);
    expect(offers[0]?.externalId).toBe("pla-galaxy-black-1");
  });

  it("extracts Bambu variants from product-group JSON-LD", () => {
    const offers = parseBambuProductPageVariants(
      `
        <script type="application/ld+json">
          {
            "@context": "https://schema.org/",
            "@type": "ProductGroup",
            "url": "https://eu.store.bambulab.com/products/abs-filament",
            "hasVariant": [
              {
                "@type": "Product",
                "sku": "42917259051227",
                "image": "https://store.bblcdn.eu/abs-black.png",
                "name": "ABS - ABS Black (40101) / Refill / 1kg",
                "offers": {
                  "@type": "Offer",
                  "url": "https://eu.store.bambulab.com/products/abs-filament?id=42917259051227",
                  "priceCurrency": "EUR",
                  "price": 22.99,
                  "availability": "https://schema.org/InStock"
                }
              }
            ]
          }
        </script>
      `,
      "https://eu.store.bambulab.com/products/abs-filament",
    );

    expect(offers[0]?.productCode).toBe("40101");
    expect(offers[0]?.candidate.externalId).toBe("42917259051227");
    expect(offers[0]?.candidate.priceCents).toBe(2299);
    expect(offers[0]?.candidate.title).toContain("ABS Black");
  });

  it("extracts Bambu mix-and-match tier pricing from the product page", () => {
    const tier = parseBambuTierOffer(
      `
        <div class="bbl-title-2 font-bold text-bbl-product-orange">€11.50 EUR</div>
        <span class="bbl-body-3 text-bbl-grey-7">/roll (Lowest price for 10+ rolls)</span>
      `,
    );

    expect(tier).toEqual({
      minimumSpools: 10,
      pricePerSpoolCents: 1150,
      currency: "EUR",
    });
  });

  it("extracts Prusa offers from product anchors", () => {
    const offers = prusaStoreScraper.extractOffers!(
      `
        <a class="ProductItem__Wrapper-sc-ec13a511-8 NWDqC" href="/product/prusament-pla-prusa-galaxy-black-1kg-nfc/">
          <img src="/content/images/product/galaxy-black.jpg" alt="Prusament PLA Prusa Galaxy Black 1kg (NFC)" />
          Prusament PLA Prusa Galaxy Black 1kg (NFC)
          In stock
          €32.99 with VAT
        </a>
      `,
      "https://www.prusa3d.com/search/?q=prusament+pla+galaxy+black",
    );

    expect(offers[0]?.title).toContain("Prusament PLA");
    expect(offers[0]?.priceCents).toBe(3299);
    expect(offers[0]?.inStock).toBe(true);
  });

  it("extracts Odoo product variants for color-based product pages", () => {
    const offers = extractOdooVariantOffers(
      `
        <meta property="og:title" content="EasyFil PLA" />
        <meta property="og:image" content="https://www.formfutura.com/web/image/product.template/105/image_1024" />
        <span itemprop="priceCurrency">EUR</span>
        <span class="oe_price">€ <span class="oe_currency_value">14,85</span></span>
        <link itemprop="availability" href="https://schema.org/InStock" />
        <input type="hidden" class="product_id" value="11571" />
        <input
          type="radio"
          class="js_variant_change always"
          checked="checked"
          data-attribute_name="Color"
          data-value_name="Black"
        />
        <input
          type="radio"
          class="js_variant_change always"
          data-attribute_name="Color"
          data-value_name="White"
        />
        <input
          type="radio"
          class="js_variant_change always"
          checked="checked"
          data-attribute_name="Weight"
          data-value_name="750 gram"
        />
      `,
      "https://www.formfutura.com/easyfil-pla",
    );

    expect(offers).toHaveLength(2);
    expect(offers[0]?.priceCents).toBe(1485);
    expect(offers[0]?.title).toContain("Black");
    expect(offers[1]?.title).toContain("White");
    expect(offers[0]?.externalId).toContain("11571");
  });
});
