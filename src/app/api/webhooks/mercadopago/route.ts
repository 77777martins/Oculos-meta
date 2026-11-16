import { NextResponse } from "next/server";
import { InvalidWebhookSignatureError, WebhookSignatureValidator } from "mercadopago";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";
import { recordPaymentEvent, syncProviderPayment } from "@/server/payments/service";

/**
 * Webhook do Mercado Pago.
 *
 * Segurança:
 * 1. Assinatura HMAC (x-signature) validada com o segredo do painel — sem
 *    segredo configurado, TODAS as notificações são recusadas (fail-closed).
 * 2. O corpo é tratado apenas como "aviso": o status real é sempre buscado
 *    na API do Mercado Pago com o Access Token (impossível forjar aprovação).
 * 3. Idempotência: eventos são deduplicados por chave única; o processamento
 *    é idempotente (transições de status não se repetem).
 * 4. Sem CSRF/origem: autenticação é a assinatura. Respostas não vazam detalhes.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY = 32 * 1024;

export async function POST(req: Request) {
  const secret = env().MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    logger.error("webhook.mercadopago.secret_missing");
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const url = new URL(req.url);
  const text = await req.text();
  if (text.length > MAX_BODY) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });

  let body: { type?: string; action?: string; id?: string | number; data?: { id?: string | number } } = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const type = url.searchParams.get("type") ?? body.type ?? url.searchParams.get("topic");
  // O manifesto assinado usa o data.id da QUERY STRING (documentação oficial).
  const dataId = url.searchParams.get("data.id") ?? (body.data?.id !== undefined ? String(body.data.id) : null);
  const requestId = req.headers.get("x-request-id");

  try {
    WebhookSignatureValidator.validate({
      xSignature: req.headers.get("x-signature"),
      xRequestId: requestId,
      dataId,
      secret,
    });
  } catch (error) {
    const reason = error instanceof InvalidWebhookSignatureError ? error.reason : "unknown";
    logger.warn("webhook.mercadopago.invalid_signature", { reason });
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  // Somente notificações de pagamento são processadas; demais são reconhecidas.
  if (type !== "payment" || !dataId || !/^\d{1,20}$/.test(dataId)) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const eventKey = `webhook:${body.id ?? requestId ?? dataId}:${body.action ?? "payment"}`;
  const already = await db.paymentEvent.findUnique({
    where: { provider_eventKey: { provider: "MERCADO_PAGO", eventKey: eventKey.slice(0, 128) } },
    select: { processedAt: true },
  });
  if (already?.processedAt) return NextResponse.json({ received: true, duplicate: true });

  try {
    await syncProviderPayment(dataId, { source: "webhook", eventKey, signatureValid: true, action: body.action ?? null });
    return NextResponse.json({ received: true });
  } catch (error) {
    const status = (error as { status?: number }).status;
    // Pagamento desconhecido (ex.: de outra integração na mesma conta): reconhece para não gerar reenvios infinitos.
    if (status === 404) return NextResponse.json({ received: true, unknown: true });
    logger.error("webhook.mercadopago.processing_failed", { error, dataId });
    await recordPaymentEvent({ eventKey, source: "webhook", type: "payment.error", providerPaymentId: dataId, signatureValid: true, error: (error as Error).message, processed: false }).catch(
      () => undefined,
    );
    // 500 → o Mercado Pago reenviará a notificação posteriormente.
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}
