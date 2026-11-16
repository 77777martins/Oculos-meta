import { vi } from "vitest";

// Ambiente de teste — definido ANTES de qualquer import do Prisma.
const url = process.env.TEST_DATABASE_URL ?? "postgresql://oculos:oculos_dev@localhost:5432/oculos_meta_test?schema=public";
Object.assign(process.env, {
  DATABASE_URL: url,
  DIRECT_URL: url,
  APP_URL: "http://localhost:3000",
  AUTH_SECRET: "test-secret-with-at-least-32-characters-0123456789",
  CRON_SECRET: "test-cron-secret",
  MERCADOPAGO_WEBHOOK_SECRET: "test-webhook-secret",
  MERCADOPAGO_ACCESS_TOKEN: "TEST-fake-token-for-tests",
  RESEND_API_KEY: "",
  BLOB_READ_WRITE_TOKEN: "",
});

/** Estado de requisição simulado (cookies e cabeçalhos) usado pelo mock de next/headers. */
export const requestState = {
  cookies: new Map<string, string>(),
  headers: new Headers({ "x-forwarded-for": "203.0.113.10", "user-agent": "vitest" }),
};
(globalThis as Record<string, unknown>).__requestState = requestState;

vi.mock("next/headers", () => {
  const state = () => (globalThis as unknown as { __requestState: typeof requestState }).__requestState;
  return {
    cookies: async () => ({
      get: (name: string) => (state().cookies.has(name) ? { name, value: state().cookies.get(name)! } : undefined),
      has: (name: string) => state().cookies.has(name),
      set: (name: string, value: string) => void state().cookies.set(name, value),
      delete: (name: string) => void state().cookies.delete(name),
    }),
    headers: async () => state().headers,
  };
});

// Silencia o "e-mail de desenvolvimento" no console durante os testes.
vi.spyOn(console, "info").mockImplementation(() => undefined);
