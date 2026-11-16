import "server-only";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { AppError, RateLimitError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { assertSameOrigin } from "@/lib/security/request";

type RouteContext<P> = { params: Promise<P> };
type Handler<P> = (req: Request, ctx: RouteContext<P>) => Promise<Response>;

interface ApiOptions {
  /** Desative SOMENTE para webhooks/cron autenticados por assinatura/segredo. */
  csrf?: boolean;
}

const MAX_JSON_BYTES = 64 * 1024;

/**
 * Envolve um Route Handler com:
 * - verificação de origem (CSRF) para métodos que alteram estado;
 * - tratamento centralizado de erros (mensagens seguras, sem stack trace);
 * - cabeçalhos anti-cache para respostas de API.
 */
export function apiHandler<P = Record<string, string>>(handler: Handler<P>, options: ApiOptions = {}): Handler<P> {
  return async (req, ctx) => {
    try {
      if (options.csrf !== false) assertSameOrigin(req);
      const res = await handler(req, ctx);
      if (!res.headers.has("Cache-Control")) res.headers.set("Cache-Control", "no-store");
      return res;
    } catch (error) {
      return errorResponse(error, req);
    }
  };
}

export function errorResponse(error: unknown, req?: Request): NextResponse {
  if (error instanceof AppError) {
    if (error.status >= 500) logger.error("api.app_error", { path: req ? new URL(req.url).pathname : undefined, code: error.code, error });
    const res = NextResponse.json({ error: { code: error.code, message: error.message, ...(error.details ?? {}) } }, { status: error.status });
    if (error instanceof RateLimitError) res.headers.set("Retry-After", String(error.retryAfterSeconds));
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return NextResponse.json({ error: { code: "CONFLICT", message: "Registro duplicado." } }, { status: 409 });
  }
  logger.error("api.unhandled_error", { path: req ? new URL(req.url).pathname : undefined, error });
  return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Ocorreu um erro inesperado. Tente novamente." } }, { status: 500 });
}

/** Lê e valida o corpo JSON com limite de tamanho (anti-DoS) e schema Zod estrito. */
export async function parseJson<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T>> {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) throw new ValidationError("Content-Type deve ser application/json.");
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_JSON_BYTES) throw new ValidationError("Corpo da requisição muito grande.");

  const text = await req.text();
  if (text.length > MAX_JSON_BYTES) throw new ValidationError("Corpo da requisição muito grande.");

  let raw: unknown;
  try {
    raw = text ? JSON.parse(text) : {};
  } catch {
    throw new ValidationError("JSON inválido.");
  }
  return parseWith(schema, raw);
}

export function parseWith<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join(".") || "_";
      (fieldErrors[key] ??= []).push(issue.message);
    }
    throw new ValidationError("Verifique os dados informados.", fieldErrors);
  }
  return result.data;
}

export function parseSearchParams<T extends z.ZodType>(req: Request, schema: T): z.infer<T> {
  const params = Object.fromEntries(new URL(req.url).searchParams.entries());
  return parseWith(schema, params);
}

export const ok = <T>(data: T, init?: ResponseInit) => NextResponse.json({ data }, init);
