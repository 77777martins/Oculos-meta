/**
 * Parâmetros Argon2id (OWASP: m=19 MiB, t=2, p=1). Módulo sem "server-only"
 * para ser compartilhado com scripts de linha de comando (criação de admin).
 */
export const ARGON2_OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1, outputLen: 32 } as const;
