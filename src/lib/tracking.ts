/** Link de rastreio: o informado pela equipe ou o oficial dos Correios quando o código segue o padrão (AA123456789BR). */
export function trackingLink(code: string | null | undefined, explicit: string | null | undefined): string | null {
  if (explicit) return explicit;
  if (code && /^[A-Z]{2}\d{9}[A-Z]{2}$/.test(code)) return `https://rastreamento.correios.com.br/app/index.php?objeto=${code}`;
  return null;
}
