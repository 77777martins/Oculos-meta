import { describe, expect, it } from "vitest";
import { registerSchema, passwordSchema } from "@/lib/validation/auth";
import { checkoutSchema, cardPaymentSchema } from "@/lib/validation/checkout";
import { isValidCpf, safeUrlSchema } from "@/lib/validation/common";
import { productSchema } from "@/lib/validation/catalog";
import { safeRedirectPath } from "@/lib/utils";

describe("CPF", () => {
  it("valida dígitos verificadores", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("529.982.247-24")).toBe(false);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("123")).toBe(false);
  });
});

describe("senha", () => {
  it("exige comprimento e complexidade", () => {
    expect(passwordSchema.safeParse("curta1A").success).toBe(false);
    expect(passwordSchema.safeParse("semnumeroaqui").success).toBe(false);
    expect(passwordSchema.safeParse("SenhaForte123").success).toBe(true);
  });
});

describe("prevenção de mass assignment (schemas estritos)", () => {
  it("cadastro rejeita campo role", () => {
    const r = registerSchema.safeParse({ name: "Ana", email: "ana@ex.com", password: "SenhaForte123", acceptTerms: true, role: "ADMIN" });
    expect(r.success).toBe(false);
  });
  it("checkout rejeita preço enviado pelo cliente", () => {
    const r = checkoutSchema.safeParse({
      items: [{ variantId: "cl0000000000000000000000", quantity: 1, priceCents: 1 }],
      addressId: "cl0000000000000000000000",
      shippingOptionId: "zone_cl0000000000000000000000",
      customerDocument: "52998224725",
      customerPhone: "11999999999",
    });
    expect(r.success).toBe(false);
  });
  it("cadastro exige aceite dos termos", () => {
    expect(registerSchema.safeParse({ name: "Ana", email: "ana@ex.com", password: "SenhaForte123", acceptTerms: false }).success).toBe(false);
  });
});

describe("checkout", () => {
  const base = { items: [{ variantId: "cl0000000000000000000000", quantity: 1 }], shippingOptionId: "zone_cl0000000000000000000000", customerDocument: "52998224725", customerPhone: "(11) 99999-9999" };
  it("exige exatamente um tipo de endereço", () => {
    expect(checkoutSchema.safeParse(base).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, addressId: "cl0000000000000000000000" }).success).toBe(true);
  });
  it("limita quantidade por item", () => {
    expect(checkoutSchema.safeParse({ ...base, addressId: "cl0000000000000000000000", items: [{ variantId: "cl0000000000000000000000", quantity: 999 }] }).success).toBe(false);
  });
  it("pagamento com cartão exige attemptId UUID (idempotência)", () => {
    expect(cardPaymentSchema.safeParse({ method: "card", attemptId: "x", token: "abcdefghijk", paymentMethodId: "visa", installments: 1, payerEmail: "a@b.com" }).success).toBe(false);
  });
});

describe("URLs seguras (anti-XSS / open redirect)", () => {
  it("rejeita javascript: e data:", () => {
    expect(safeUrlSchema.safeParse("javascript:alert(1)").success).toBe(false);
    expect(safeUrlSchema.safeParse("data:text/html,<script>").success).toBe(false);
    expect(safeUrlSchema.safeParse("//evil.com").success).toBe(false);
    expect(safeUrlSchema.safeParse("https://cdn.exemplo.com/a.jpg").success).toBe(true);
    expect(safeUrlSchema.safeParse("/produtos").success).toBe(true);
  });
  it("safeRedirectPath só permite caminhos internos", () => {
    expect(safeRedirectPath("https://evil.com")).toBe("/conta");
    expect(safeRedirectPath("//evil.com")).toBe("/conta");
    expect(safeRedirectPath("/\\evil.com")).toBe("/conta");
    expect(safeRedirectPath("/checkout")).toBe("/checkout");
  });
});

describe("produto", () => {
  it("preço promocional deve ser menor que o normal", () => {
    const r = productSchema.safeParse({
      name: "Produto",
      slug: "produto",
      brand: "Meta",
      model: "X",
      description: "Descrição longa o suficiente",
      specs: [],
      status: "DRAFT",
      isFeatured: false,
      images: [],
      variants: [{ sku: "SKU-1", name: "A", priceCents: 1000, salePriceCents: 2000, weightGrams: 100, isActive: true }],
    });
    expect(r.success).toBe(false);
  });
});
