import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";

const href = (phone: string) => renderToStaticMarkup(createElement(WhatsAppButton, { phone, storeName: "Loja <Teste>" })).match(/href="([^"]+)"/)?.[1];

describe("botão do WhatsApp", () => {
  it("adiciona o DDI 55 a números brasileiros", () => {
    expect(href("(11) 98765-4321")).toMatch(/^https:\/\/wa\.me\/5511987654321\?text=/);
  });
  it("mantém número que já tem DDI", () => {
    expect(href("+55 11 98765-4321")).toMatch(/^https:\/\/wa\.me\/5511987654321\?/);
  });
  it("não renderiza número inválido", () => {
    expect(href("1234")).toBeUndefined();
  });
  it("codifica o texto da mensagem (sem injeção na URL)", () => {
    expect(href("11987654321")).toContain(encodeURIComponent("Loja <Teste>").replace(/&/g, "&amp;"));
  });
});
