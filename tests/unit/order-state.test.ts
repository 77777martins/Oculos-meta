import { describe, expect, it } from "vitest";
import { canTransition, canTransitionManually, mapMercadoPagoStatus } from "@/server/services/order-state";

describe("máquina de estados do pedido", () => {
  it("não permite enviar pedido não pago", () => {
    expect(canTransition("PENDING_PAYMENT", "SHIPPED")).toBe(false);
    expect(canTransitionManually("PENDING_PAYMENT", "SHIPPED")).toBe(false);
  });
  it("equipe NÃO pode marcar pedido como pago manualmente", () => {
    expect(canTransitionManually("PENDING_PAYMENT", "PAID")).toBe(false);
  });
  it("fluxo normal é permitido", () => {
    expect(canTransition("PENDING_PAYMENT", "PAID")).toBe(true);
    expect(canTransitionManually("PAID", "PROCESSING")).toBe(true);
    expect(canTransitionManually("PROCESSING", "SHIPPED")).toBe(true);
    expect(canTransitionManually("SHIPPED", "DELIVERED")).toBe(true);
  });
  it("reembolsado é estado final", () => {
    expect(canTransition("REFUNDED", "PAID")).toBe(false);
  });
});

describe("mapMercadoPagoStatus", () => {
  it.each([
    ["approved", "APPROVED"],
    ["pending", "PENDING"],
    ["in_process", "IN_PROCESS"],
    ["authorized", "IN_PROCESS"],
    ["rejected", "REJECTED"],
    ["cancelled", "CANCELLED"],
    ["refunded", "REFUNDED"],
    ["charged_back", "CHARGED_BACK"],
    ["valor-desconhecido", "PENDING"],
  ])("%s → %s", (mp, expected) => expect(mapMercadoPagoStatus(mp)).toBe(expected));
});
