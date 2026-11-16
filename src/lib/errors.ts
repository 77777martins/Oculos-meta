/**
 * Erros de domínio. A mensagem (`message`) é SEMPRE segura para exibir ao
 * usuário; detalhes internos vão apenas para o log (campo `cause`).
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly status: number = 400,
    public readonly code: string = "BAD_REQUEST",
    public readonly details?: Record<string, unknown>,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message = "Dados inválidos.", fieldErrors?: Record<string, string[]>) {
    super(message, 422, "VALIDATION_ERROR", fieldErrors ? { fieldErrors } : undefined);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Faça login para continuar.") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Você não tem permissão para esta ação.") {
    super(message, 403, "FORBIDDEN");
  }
}

/** Usado também para recursos de outro usuário (evita revelar que existem — anti-IDOR). */
export class NotFoundError extends AppError {
  constructor(message = "Recurso não encontrado.") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code = "CONFLICT", details?: Record<string, unknown>) {
    super(message, 409, code, details);
  }
}

export class RateLimitError extends AppError {
  constructor(public readonly retryAfterSeconds: number) {
    super("Muitas tentativas. Aguarde um pouco e tente novamente.", 429, "RATE_LIMITED", { retryAfterSeconds });
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = "Serviço temporariamente indisponível. Tente novamente em instantes.") {
    super(message, 503, "SERVICE_UNAVAILABLE");
  }
}
