import "server-only";
import type { ShipmentStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { recordShipmentEvent } from "@/server/services/shipments";
import { getStoreSettings } from "@/server/services/settings";
import { findLabelByTracking, getConnectionStatus, isMelhorEnvioConfigured, trackLabels, type MelhorEnvioLabel } from "./melhor-envio";

/**
 * Rastreio automático via Melhor Envio.
 * A etiqueta é comprada pela loja no painel do Melhor Envio; aqui ela é
 * localizada pelo código de rastreio e seu status é consultado periodicamente
 * (o webhook oficial só cobre etiquetas criadas pelo próprio aplicativo).
 */

/** Status do Melhor Envio → status de entrega interno (null = ainda não postado / sem evento). */
export function mapMelhorEnvioStatus(status: string): { status: Exclude<ShipmentStatus, "PENDING">; description: string } | null {
  switch (status) {
    case "posted":
      return { status: "POSTED", description: "Objeto postado na transportadora" };
    case "received":
      return { status: "POSTED", description: "Objeto recebido no ponto de distribuição" };
    case "delivered":
      return { status: "DELIVERED", description: "Objeto entregue ao destinatário" };
    case "undelivered":
      return { status: "FAILED", description: "Não foi possível entregar o objeto" };
    case "paused":
      return { status: "FAILED", description: "Entrega interrompida — ação do destinatário necessária" };
    case "suspended":
      return { status: "FAILED", description: "Envio suspenso pela transportadora" };
    default:
      return null; // pending, released, generated, canceled, expired: sem movimentação física
  }
}

/** Datas do Melhor Envio: ISO com fuso, ou "AAAA-MM-DD HH:MM:SS" (tratada como horário de Brasília). */
export function parseProviderDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const iso = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value.replace(" ", "T")}-03:00`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function syncAvailable(): Promise<boolean> {
  if (!isMelhorEnvioConfigured()) return false;
  const settings = await getStoreSettings();
  return settings.melhorEnvioEnabled && (await getConnectionStatus()).connected;
}

async function applyLabel(shipmentId: string, orderId: string, label: MelhorEnvioLabel): Promise<boolean> {
  const shipment = await db.shipment.findUniqueOrThrow({ where: { id: shipmentId } });
  const changed = shipment.providerStatus !== label.status;
  await db.shipment.update({ where: { id: shipmentId }, data: { providerOrderId: label.id, providerStatus: label.status, lastSyncedAt: new Date() } });
  if (!changed) return false;

  const mapped = mapMelhorEnvioStatus(label.status);
  if (!mapped || mapped.status === shipment.status) return false;
  const occurredAt = (mapped.status === "DELIVERED" ? parseProviderDate(label.delivered_at) : parseProviderDate(label.posted_at)) ?? new Date();
  await recordShipmentEvent({ orderId, status: mapped.status, description: mapped.description, occurredAt, actorId: null, ip: null });
  return true;
}

/** Vincula o envio à etiqueta do Melhor Envio pelo código de rastreio e aplica o status atual. */
export async function linkAndSyncShipment(orderId: string): Promise<{ linked: boolean; status: string | null }> {
  if (!(await syncAvailable())) return { linked: false, status: null };
  const shipment = await db.shipment.findUnique({ where: { orderId } });
  if (!shipment?.trackingCode) return { linked: false, status: null };
  const label = await findLabelByTracking(shipment.trackingCode);
  if (!label) {
    await db.shipment.update({ where: { id: shipment.id }, data: { lastSyncedAt: new Date() } });
    return { linked: false, status: null };
  }
  await applyLabel(shipment.id, orderId, label);
  return { linked: true, status: label.status };
}

/** Executado pelo cron: atualiza envios em aberto (no máximo `limit` por execução). */
export async function syncOpenShipments(limit = 50): Promise<{ checked: number; updated: number }> {
  if (!(await syncAvailable())) return { checked: 0, updated: 0 };
  const staleBefore = new Date(Date.now() - 20 * 60_000);
  const shipments = await db.shipment.findMany({
    where: {
      trackingCode: { not: null },
      status: { notIn: ["DELIVERED", "RETURNED"] },
      OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: staleBefore } }],
    },
    orderBy: [{ lastSyncedAt: { sort: "asc", nulls: "first" } }],
    take: limit,
    select: { id: true, orderId: true, providerOrderId: true },
  });

  let updated = 0;
  // Ainda não vinculados: localiza pelo código de rastreio.
  for (const s of shipments.filter((x) => !x.providerOrderId)) {
    try {
      const r = await linkAndSyncShipment(s.orderId);
      if (r.linked) updated++;
    } catch (error) {
      logger.warn("tracking.link_failed", { orderId: s.orderId, error });
    }
  }
  // Vinculados: consulta em lote.
  const linked = shipments.filter((x): x is typeof x & { providerOrderId: string } => Boolean(x.providerOrderId));
  if (linked.length > 0) {
    try {
      const labels = await trackLabels(linked.map((s) => s.providerOrderId));
      for (const s of linked) {
        const label = labels.get(s.providerOrderId);
        if (label && (await applyLabel(s.id, s.orderId, label))) updated++;
        else if (!label) await db.shipment.update({ where: { id: s.id }, data: { lastSyncedAt: new Date() } });
      }
    } catch (error) {
      logger.warn("tracking.batch_failed", { error });
    }
  }
  return { checked: shipments.length, updated };
}
