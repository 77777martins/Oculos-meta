/** Concatena classes condicionalmente (substitui `clsx` sem dependência extra). */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
}

export function formatZip(zip: string): string {
  const d = onlyDigits(zip);
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : zip;
}

export function formatCpf(cpf: string): string {
  const d = onlyDigits(cpf);
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : cpf;
}

/** Exibe apenas os 3 primeiros e 2 últimos dígitos (proteção de dados pessoais). */
export function maskCpf(cpf: string): string {
  const d = onlyDigits(cpf);
  return d.length === 11 ? `${d.slice(0, 3)}.***.***-${d.slice(9)}` : "***";
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return "***";
  return `${user.slice(0, 2)}***@${domain}`;
}

const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
const dateOnly = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "America/Sao_Paulo" });

export function formatDateTime(date: Date | string): string {
  return dateTime.format(new Date(date));
}

export function formatDate(date: Date | string): string {
  return dateOnly.format(new Date(date));
}

/** Garante que um redirecionamento pós-login aponte apenas para caminhos internos (anti open-redirect). */
export function safeRedirectPath(path: string | null | undefined, fallback = "/conta"): string {
  if (!path || typeof path !== "string") return fallback;
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return fallback;
  return path;
}

export function clampPage(value: unknown, max = 10_000): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= max ? n : 1;
}
