import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { WebhookSignatureValidator } from "mercadopago";
import { hasPermission, isStaff } from "@/lib/auth/rbac";
import { redact } from "@/lib/logger";
import { detectImageType } from "@/server/services/storage";
import { toMercadoPagoDate } from "@/server/payments/mercadopago";

describe("RBAC", () => {
  it("cliente não acessa o painel", () => {
    expect(isStaff("CUSTOMER")).toBe(false);
    expect(hasPermission("CUSTOMER", "orders:read")).toBe(false);
  });
  it("atendimento não altera catálogo nem reembolsa", () => {
    expect(hasPermission("SUPPORT", "orders:update")).toBe(true);
    expect(hasPermission("SUPPORT", "products:write")).toBe(false);
    expect(hasPermission("SUPPORT", "payments:refund")).toBe(false);
  });
  it("gerente não gerencia equipe nem reembolsa", () => {
    expect(hasPermission("MANAGER", "products:write")).toBe(true);
    expect(hasPermission("MANAGER", "staff:manage")).toBe(false);
    expect(hasPermission("MANAGER", "payments:refund")).toBe(false);
  });
  it("admin tem acesso total", () => {
    expect(hasPermission("ADMIN", "payments:refund")).toBe(true);
    expect(hasPermission("ADMIN", "staff:manage")).toBe(true);
  });
});

describe("assinatura de webhook do Mercado Pago", () => {
  const secret = "segredo-de-teste";
  const sign = (dataId: string, requestId: string, ts: string, key = secret) =>
    createHmac("sha256", key).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest("hex");

  it("aceita assinatura válida", () => {
    const ts = String(Math.floor(Date.now() / 1000));
    expect(() => WebhookSignatureValidator.validate({ xSignature: `ts=${ts},v1=${sign("123", "req-1", ts)}`, xRequestId: "req-1", dataId: "123", secret })).not.toThrow();
  });
  it("rejeita assinatura com segredo errado, dados alterados ou ausente", () => {
    const ts = String(Math.floor(Date.now() / 1000));
    expect(() => WebhookSignatureValidator.validate({ xSignature: `ts=${ts},v1=${sign("123", "req-1", ts, "outro")}`, xRequestId: "req-1", dataId: "123", secret })).toThrow();
    expect(() => WebhookSignatureValidator.validate({ xSignature: `ts=${ts},v1=${sign("123", "req-1", ts)}`, xRequestId: "req-1", dataId: "999", secret })).toThrow();
    expect(() => WebhookSignatureValidator.validate({ xSignature: null, xRequestId: "req-1", dataId: "123", secret })).toThrow();
  });
});

describe("logs seguros", () => {
  it("redige campos sensíveis em qualquer nível", () => {
    const out = redact({ email: "a@b.com", password: "x", nested: { accessToken: "t", cpf: "1", ok: 1 } }) as Record<string, Record<string, unknown>>;
    expect(out.password).toBe("[REDACTED]");
    expect(out.nested!.accessToken).toBe("[REDACTED]");
    expect(out.nested!.cpf).toBe("[REDACTED]");
    expect(out.nested!.ok).toBe(1);
  });
});

describe("upload de imagens", () => {
  it("detecta tipo real pelos bytes e rejeita SVG/HTML disfarçado", () => {
    expect(detectImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))?.mime).toBe("image/jpeg");
    expect(detectImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]))?.mime).toBe("image/png");
    expect(detectImageType(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
    expect(detectImageType(new TextEncoder().encode("<html><script>"))).toBeNull();
  });
});

describe("datas do Mercado Pago", () => {
  it("formata no fuso de Brasília", () => {
    expect(toMercadoPagoDate(new Date("2026-01-31T15:00:00.000Z"))).toBe("2026-01-31T12:00:00.000-03:00");
  });
});

describe("boleto", () => {
  it("vencimento às 23:59:59 de Brasília do N-ésimo dia", async () => {
    const { boletoDueDate } = await import("@/server/payments/service");
    // 16/11 às 01:00 UTC = 15/11 22:00 em Brasília → +2 dias = 17/11 23:59:59 BRT = 18/11 02:59:59 UTC
    expect(boletoDueDate(2, new Date("2026-11-16T01:00:00Z")).toISOString()).toBe("2026-11-18T02:59:59.000Z");
  });
  it("links do provedor só são aceitos em https", async () => {
    const { safeHttpsUrl } = await import("@/server/payments/mercadopago");
    expect(safeHttpsUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpsUrl("http://x.com")).toBeNull();
    expect(safeHttpsUrl("https://www.mercadopago.com.br/x")).toBe("https://www.mercadopago.com.br/x");
  });
});
