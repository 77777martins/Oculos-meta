import { vi } from "vitest";

/**
 * Simulador da API do Melhor Envio para testes: intercepta `fetch` e responde
 * no formato da documentação oficial (docs.melhorenvio.com.br). Requisições a
 * outros hosts falham explicitamente — nenhum teste acessa a internet.
 */
export interface FakeLabel {
  id: string;
  protocol: string;
  status: string;
  tracking: string | null;
  posted_at: string | null;
  delivered_at: string | null;
}

export class FakeMelhorEnvio {
  requests: Array<{ method: string; path: string; body: unknown; headers: Record<string, string> }> = [];
  validTokens = new Set<string>(["access-token-1"]);
  tokenCounter = 1;
  quote: unknown[] = [
    { id: 1, name: "PAC", price: "37.79", custom_price: "35.50", currency: "R$", delivery_time: 9, custom_delivery_time: 8, delivery_range: { min: 8, max: 9 }, custom_delivery_range: { min: 7, max: 8 }, company: { id: 1, name: "Correios" } },
    { id: 2, name: "SEDEX", price: "61.20", custom_price: "61.20", delivery_time: 3, custom_delivery_time: 3, delivery_range: { min: 2, max: 3 }, custom_delivery_range: { min: 2, max: 3 }, company: { id: 1, name: "Correios" } },
    { id: 3, name: ".Package", error: "Serviço indisponível para o trecho.", company: { id: 2, name: "Jadlog" } },
  ];
  labels = new Map<string, FakeLabel>();
  failCalculate = false;

  install() {
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request, init?: RequestInit) => this.handle(String(input instanceof Request ? input.url : input), init)));
    return this;
  }

  private json(status: number, body: unknown) {
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  }

  private async handle(url: string, init?: RequestInit): Promise<Response> {
    const u = new URL(url);
    if (u.host !== "sandbox.melhorenvio.com.br") throw new Error(`Rede bloqueada nos testes: ${u.host}`);
    const headers = Object.fromEntries(new Headers(init?.headers).entries());
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    this.requests.push({ method: init?.method ?? "GET", path: u.pathname + u.search, body, headers });

    if (u.pathname === "/oauth/token") {
      if (body.client_id !== 4242 || body.client_secret !== "test-me-secret") return this.json(401, { error: "invalid_client" });
      if (body.grant_type === "authorization_code" && body.code !== "good-code") return this.json(400, { error: "invalid_grant" });
      const n = ++this.tokenCounter;
      this.validTokens.add(`access-token-${n}`);
      return this.json(200, { token_type: "Bearer", expires_in: 2592000, access_token: `access-token-${n}`, refresh_token: `refresh-token-${n}` });
    }

    const token = headers.authorization?.replace("Bearer ", "");
    if (!token || !this.validTokens.has(token)) return this.json(401, { message: "Unauthenticated." });

    if (u.pathname === "/api/v2/me/shipment/calculate") {
      if (this.failCalculate) return this.json(500, { message: "erro interno" });
      return this.json(200, this.quote);
    }
    if (u.pathname === "/api/v2/me/orders/search") {
      const q = u.searchParams.get("q");
      return this.json(200, [...this.labels.values()].filter((l) => l.tracking === q || l.id === q));
    }
    if (u.pathname === "/api/v2/me/shipment/tracking") {
      const out: Record<string, FakeLabel> = {};
      for (const id of body.orders as string[]) {
        const l = this.labels.get(id);
        if (l) out[id] = l;
      }
      return this.json(200, out);
    }
    return this.json(404, { message: "not found" });
  }
}
