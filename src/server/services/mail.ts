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
