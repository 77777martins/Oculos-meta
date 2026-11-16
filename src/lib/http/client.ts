/**
 * Cliente HTTP do navegador (sem dependências). Mesma origem, JSON e
 * erros padronizados vindos de `apiHandler`.
 */
export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export async function apiFetch<T = unknown>(url: string, options: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
      headers: options.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      credentials: "same-origin",
      cache: "no-store",
      signal: options.signal,
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new ApiClientError("Sem conexão. Verifique sua internet e tente novamente.", 0, "NETWORK_ERROR");
  }

  const json = (await res.json().catch(() => null)) as { data?: T; error?: { message?: string; code?: string; fieldErrors?: Record<string, string[]> } } | null;
  if (!res.ok) {
    throw new ApiClientError(json?.error?.message ?? "Ocorreu um erro. Tente novamente.", res.status, json?.error?.code ?? "ERROR", json?.error?.fieldErrors);
  }
  return json?.data as T;
}
