/**
 * Opções do Sentry compartilhadas por navegador, servidor e edge.
 * - Desligado automaticamente sem DSN (desenvolvimento, testes, CI).
 * - Coleta mínima (LGPD): sem IP/usuário, cookies, cabeçalhos, corpos HTTP,
 *   parâmetros de URL (links de redefinição de senha levam token), dados de
 *   consultas ao banco (CPF/endereço) nem variáveis locais de stack.
 * O DSN é público por design (só permite ENVIAR eventos ao projeto).
 */
import type * as Sentry from "@sentry/nextjs";

type InitOptions = NonNullable<Parameters<typeof Sentry.init>[0]>;

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || undefined;

export const sentryOptions: InitOptions = {
  dsn,
  enabled: Boolean(dsn) && process.env.NODE_ENV !== "test",
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
    databaseQueryData: false,
    stackFrameVariables: false,
  },
  beforeSend(event) {
    // Defesa em profundidade: remove qualquer resquício de dado pessoal.
    delete event.user;
    if (event.request) {
      delete event.request.query_string;
      delete event.request.cookies;
      delete event.request.headers;
      delete event.request.data;
    }
    return event;
  },
};
