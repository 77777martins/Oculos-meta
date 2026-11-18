import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FINAL_PRICES_CENTS, FINAL_STOCK_PER_VARIANT, MAX_TEST_PRICE_CENTS, VARIANT_UPDATES } from "../../prisma/variant-updates";

const seed = readFileSync("prisma/seed.ts", "utf8");
const seedSkus = [...seed.matchAll(/\{ sku: "([A-Z0-9-]+)", name: "[^"]*", color:/g)].map((m) => m[1]!);

describe("catálogo final de teste", () => {
  it("nenhum preço passa de R$ 299,90", () => {
    expect(MAX_TEST_PRICE_CENTS).toBe(299_90);
    for (const [sku, cents] of Object.entries(FINAL_PRICES_CENTS)) {
      expect(cents, sku).toBeGreaterThan(0);
      expect(cents, sku).toBeLessThanOrEqual(299_90);
    }
  });

  it("toda variante do seed tem preço final e 50 unidades, sem SKU duplicado", () => {
    expect(new Set(seedSkus).size).toBe(seedSkus.length);
    expect([...seedSkus].sort()).toEqual(Object.keys(FINAL_PRICES_CENTS).sort());
    expect(FINAL_STOCK_PER_VARIANT).toBe(50);
  });

  it("as cores da lista de 18/11 mantêm o preço informado pelo lojista", () => {
    for (const u of VARIANT_UPDATES) expect(FINAL_PRICES_CENTS[u.sku], u.sku).toBe(u.priceCents);
  });
});
