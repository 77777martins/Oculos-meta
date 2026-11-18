import "server-only";
import { env, isProduction } from "@/lib/env";
import { logger } from "@/lib/logger";

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** Escapa conteúdo dinâmico inserido em HTML de e-mail (anti-XSS/HTML injection). */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/**
 * Envio via API HTTP da Resend (sem SDK adicional).
 * Em desenvolvimento, sem RESEND_API_KEY, o conteúdo é exibido no console
 * — identificado claramente como DEV. Em produção, sem chave, o envio falha.
 */
export async function sendMail(message: MailMessage): Promise<boolean> {
  const { RESEND_API_KEY, EMAIL_FROM } = env();
  if (!RESEND_API_KEY) {
    if (isProduction()) {
      logger.error("mail.not_configured", { subject: message.subject });
      return false;
    }
    console.info(`\n[DEV — e-mail NÃO enviado] Para: ${message.to}\nAssunto: ${message.subject}\n${message.text}\n`);
    return true;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: EMAIL_FROM, to: [message.to], subject: message.subject, html: message.html, text: message.text }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      logger.error("mail.send_failed", { status: res.status, subject: message.subject });
      return false;
    }
    return true;
  } catch (error) {
    logger.error("mail.send_error", { error, subject: message.subject });
    return false;
  }
}

function layout(title: string, body: string): string {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="background:#0b1f4d;padding:24px 32px;color:#fff;font-size:18px;font-weight:bold">${escapeHtml(title)}</td></tr>
<tr><td style="padding:32px;font-size:15px;line-height:1.6">${body}</td></tr>
<tr><td style="padding:16px 32px;background:#f8fafc;font-size:12px;color:#64748b">Este é um e-mail automático. Não responda.</td></tr>
</table></td></tr></table></body></html>`;
}

export function passwordResetEmail(name: string, link: string): Omit<MailMessage, "to"> {
  return {
    subject: "Redefinição de senha",
    text: `Olá, ${name}.\n\nRecebemos uma solicitação para redefinir sua senha. Acesse o link abaixo (válido por 30 minutos):\n${link}\n\nSe você não solicitou, ignore este e-mail — sua senha continua a mesma.`,
    html: layout(
      "Redefinição de senha",
      `<p>Olá, ${escapeHtml(name)}.</p><p>Recebemos uma solicitação para redefinir sua senha. O link é válido por <strong>30 minutos</strong>.</p>
<p style="text-align:center;margin:32px 0"><a href="${escapeHtml(link)}" style="background:#1d4ed8;color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:bold">Redefinir senha</a></p>
<p style="color:#64748b;font-size:13px">Se você não solicitou, ignore este e-mail — sua senha continua a mesma.</p>`,
    ),
  };
}

function button(link: string, label: string): string {
  return `<p style="text-align:center;margin:32px 0"><a href="${escapeHtml(link)}" style="background:#1d4ed8;color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:bold">${escapeHtml(label)}</a></p>`;
}

export function orderCreatedEmail(name: string, orderNumber: number, total: string, payLink: string, expiresAt: string | null): Omit<MailMessage, "to"> {
  const deadline = expiresAt ? ` até ${expiresAt}` : "";
  return {
    subject: `Recebemos seu pedido #${orderNumber}`,
    text: `Olá, ${name}.\n\nRecebemos o pedido #${orderNumber} (total ${total}). Conclua o pagamento${deadline} para garantir os itens: ${payLink}`,
    html: layout(
      `Pedido #${orderNumber} recebido`,
      `<p>Olá, ${escapeHtml(name)}.</p><p>Recebemos seu pedido <strong>#${orderNumber}</strong> no valor de <strong>${escapeHtml(total)}</strong>. Os itens estão reservados para você — conclua o pagamento${escapeHtml(deadline)}.</p>${button(payLink, "Pagar agora")}`,
    ),
  };
}

export function orderShippedEmail(name: string, orderNumber: number, link: string, tracking: { code: string | null; url: string | null; carrier: string | null }): Omit<MailMessage, "to"> {
  const code = tracking.code ? `Código de rastreio: ${tracking.code}${tracking.carrier ? ` (${tracking.carrier})` : ""}` : "";
  return {
    subject: `Seu pedido #${orderNumber} foi enviado`,
    text: `Olá, ${name}.\n\nSeu pedido #${orderNumber} foi enviado. ${code}\n${tracking.url ?? link}`,
    html: layout(
      `Pedido #${orderNumber} a caminho`,
      `<p>Olá, ${escapeHtml(name)}.</p><p>Boa notícia: seu pedido <strong>#${orderNumber}</strong> foi enviado!</p>${code ? `<p style="font-family:monospace;background:#f1f5f9;padding:12px;border-radius:8px">${escapeHtml(code)}</p>` : ""}${button(tracking.url ?? link, "Acompanhar entrega")}`,
    ),
  };
}

export function orderDeliveredEmail(name: string, orderNumber: number, link: string): Omit<MailMessage, "to"> {
  return {
    subject: `Pedido #${orderNumber} entregue`,
    text: `Olá, ${name}.\n\nO pedido #${orderNumber} consta como entregue. Algum problema? Fale conosco: ${link}`,
    html: layout(
      `Pedido #${orderNumber} entregue`,
      `<p>Olá, ${escapeHtml(name)}.</p><p>Seu pedido <strong>#${orderNumber}</strong> consta como entregue. Esperamos que aproveite! Se algo não estiver certo, responda pela página do pedido.</p>${button(link, "Ver pedido")}`,
    ),
  };
}

export function orderClosedEmail(name: string, orderNumber: number, reason: "EXPIRED" | "CANCELLED", link: string): Omit<MailMessage, "to"> {
  const why = reason === "EXPIRED" ? "o prazo para pagamento terminou e a reserva dos itens foi liberada" : "ele foi cancelado";
  return {
    subject: `Pedido #${orderNumber} ${reason === "EXPIRED" ? "expirado" : "cancelado"}`,
    text: `Olá, ${name}.\n\nO pedido #${orderNumber} não foi concluído: ${why}. Nenhum valor foi cobrado. Se quiser, faça um novo pedido: ${link}`,
    html: layout(
      `Pedido #${orderNumber} não concluído`,
      `<p>Olá, ${escapeHtml(name)}.</p><p>O pedido <strong>#${orderNumber}</strong> não foi concluído: ${escapeHtml(why)}. Nenhum valor foi cobrado.</p>${button(link, "Ver produtos")}`,
    ),
  };
}

export function orderRefundedEmail(name: string, orderNumber: number, amount: string, link: string): Omit<MailMessage, "to"> {
  return {
    subject: `Reembolso do pedido #${orderNumber}`,
    text: `Olá, ${name}.\n\nProcessamos o reembolso de ${amount} do pedido #${orderNumber}. O prazo para aparecer depende do meio de pagamento (PIX: imediato; cartão: até 2 faturas). ${link}`,
    html: layout(
      `Reembolso do pedido #${orderNumber}`,
      `<p>Olá, ${escapeHtml(name)}.</p><p>Processamos o reembolso de <strong>${escapeHtml(amount)}</strong> referente ao pedido <strong>#${orderNumber}</strong>.</p><p style="color:#64748b;font-size:13px">O prazo para o valor aparecer depende do meio de pagamento: PIX costuma ser imediato; no cartão pode levar até 2 faturas.</p>${button(link, "Ver pedido")}`,
    ),
  };
}

export function orderPaidEmail(name: string, orderNumber: number, link: string): Omit<MailMessage, "to"> {
  return {
    subject: `Pagamento aprovado — pedido #${orderNumber}`,
    text: `Olá, ${name}.\n\nO pagamento do pedido #${orderNumber} foi aprovado. Acompanhe: ${link}`,
    html: layout(
      `Pedido #${orderNumber} confirmado`,
      `<p>Olá, ${escapeHtml(name)}.</p><p>O pagamento do seu pedido <strong>#${orderNumber}</strong> foi aprovado. Já estamos preparando o envio.</p>
<p style="text-align:center;margin:32px 0"><a href="${escapeHtml(link)}" style="background:#1d4ed8;color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:bold">Acompanhar pedido</a></p>`,
    ),
  };
}
