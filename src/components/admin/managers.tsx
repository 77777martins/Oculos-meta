"use client";

/**
 * Configurações por entidade para o EntityManager (precisam ser Client
 * Components porque incluem funções de renderização/transformação).
 */
import { Badge } from "@/components/ui/badge";
import { formatBRL } from "@/lib/money";
import { formatDateTime, formatZip } from "@/lib/utils";
import { EntityManager } from "./entity-manager";

type Row = { id: string } & Record<string, unknown>;

export function CategoryManager({ rows }: { rows: Row[] }) {
  return (
    <EntityManager
      title="Categoria"
      endpoint="/api/admin/categories"
      rows={rows}
      defaults={{ name: "", slug: "", description: "", imageUrl: "", isActive: true, sortOrder: "0" }}
      fields={[
        { name: "name", label: "Nome", type: "text" },
        { name: "slug", label: "Slug", type: "slug", slugFrom: "name" },
        { name: "description", label: "Descrição", type: "textarea", optional: true },
        { name: "imageUrl", label: "Imagem (opcional)", type: "image", optional: true },
        { name: "sortOrder", label: "Ordem", type: "number" },
        { name: "isActive", label: "Ativa", type: "checkbox" },
      ]}
      columns={[
        { header: "Nome", cell: (r) => <span className="font-medium">{String(r.name)}</span> },
        { header: "Slug", cell: (r) => <span className="font-mono text-xs">{String(r.slug)}</span> },
        { header: "Produtos", cell: (r) => String(r.productCount ?? 0) },
        { header: "Status", cell: (r) => <Badge tone={r.isActive ? "success" : "neutral"}>{r.isActive ? "Ativa" : "Inativa"}</Badge> },
      ]}
    />
  );
}

const COUPON_TYPES = [
  { value: "PERCENT", label: "Percentual (%)" },
  { value: "FIXED", label: "Valor fixo (R$)" },
  { value: "FREE_SHIPPING", label: "Frete grátis" },
];

export function CouponManager({ rows }: { rows: Row[] }) {
  return (
    <EntityManager
      title="Cupom"
      endpoint="/api/admin/coupons"
      rows={rows}
      deleteLabel="Desativar cupom"
      defaults={{ code: "", description: "", type: "PERCENT", value: "", minSubtotalCents: "0", maxDiscountCents: "", startsAt: "", endsAt: "", maxRedemptions: "", maxPerUser: "1", isActive: true }}
      fields={[
        { name: "code", label: "Código", type: "text", hint: "Letras maiúsculas, números, - e _" },
        { name: "type", label: "Tipo", type: "select", options: COUPON_TYPES },
        { name: "value", label: "Valor", type: "text", hint: "Percentual: ex. 10 ou 7,5 · Fixo: em reais, ex. 50,00 · Frete grátis: deixe vazio" },
        { name: "description", label: "Descrição interna", type: "text", optional: true },
        { name: "minSubtotalCents", label: "Subtotal mínimo (R$)", type: "money" },
        { name: "maxDiscountCents", label: "Desconto máximo (R$)", type: "money", optional: true },
        { name: "startsAt", label: "Início", type: "datetime", optional: true },
        { name: "endsAt", label: "Fim", type: "datetime", optional: true },
        { name: "maxRedemptions", label: "Limite total de usos", type: "number", optional: true },
        { name: "maxPerUser", label: "Limite por cliente", type: "number", optional: true },
        { name: "isActive", label: "Ativo", type: "checkbox" },
      ]}
      // "value" é digitado em % ou R$; o banco guarda pontos-base ou centavos.
      transform={(p) => {
        const raw = String(p.value ?? "").replace(",", ".");
        const num = Number(raw || 0);
        return { ...p, code: String(p.code).toUpperCase(), value: p.type === "FREE_SHIPPING" ? 0 : Math.round(num * 100) };
      }}
      toForm={(row, v) => ({ ...v, value: row.type === "FREE_SHIPPING" ? "" : (Number(row.value) / 100).toString().replace(".", ",") })}
      columns={[
        { header: "Código", cell: (r) => <span className="font-mono font-semibold">{String(r.code)}</span> },
        { header: "Desconto", cell: (r) => (r.type === "PERCENT" ? `${Number(r.value) / 100}%` : r.type === "FIXED" ? formatBRL(Number(r.value)) : "Frete grátis") },
        { header: "Usos", cell: (r) => `${r.redemptionCount ?? 0}${r.maxRedemptions ? ` / ${r.maxRedemptions}` : ""}` },
        { header: "Validade", cell: (r) => (r.endsAt ? `até ${formatDateTime(String(r.endsAt))}` : "Sem prazo") },
        { header: "Status", cell: (r) => <Badge tone={r.isActive ? "success" : "neutral"}>{r.isActive ? "Ativo" : "Inativo"}</Badge> },
      ]}
    />
  );
}

export function ShippingZoneManager({ rows }: { rows: Row[] }) {
  return (
    <EntityManager
      title="Faixa de frete"
      endpoint="/api/admin/shipping-zones"
      rows={rows}
      defaults={{ name: "", carrier: "Correios", serviceName: "PAC", zipStart: "", zipEnd: "", priceCents: "", freeAboveCents: "", minDays: "3", maxDays: "8", isActive: true }}
      fields={[
        { name: "name", label: "Nome da região", type: "text", hint: "Ex.: Capital SP" },
        { name: "carrier", label: "Transportadora", type: "text" },
        { name: "serviceName", label: "Serviço", type: "text" },
        { name: "zipStart", label: "CEP inicial (8 dígitos)", type: "text" },
        { name: "zipEnd", label: "CEP final (8 dígitos)", type: "text" },
        { name: "priceCents", label: "Preço (R$)", type: "money" },
        { name: "freeAboveCents", label: "Grátis acima de (R$)", type: "money", optional: true },
        { name: "minDays", label: "Prazo mínimo (dias úteis)", type: "number" },
        { name: "maxDays", label: "Prazo máximo (dias úteis)", type: "number" },
        { name: "isActive", label: "Ativa", type: "checkbox" },
      ]}
      toForm={(row, v) => ({ ...v, zipStart: String(row.zipStart).padStart(8, "0"), zipEnd: String(row.zipEnd).padStart(8, "0") })}
      columns={[
        { header: "Região", cell: (r) => <span className="font-medium">{String(r.name)}</span> },
        { header: "Serviço", cell: (r) => `${r.carrier} ${r.serviceName}` },
        { header: "CEPs", cell: (r) => `${formatZip(String(r.zipStart).padStart(8, "0"))} – ${formatZip(String(r.zipEnd).padStart(8, "0"))}` },
        { header: "Preço", cell: (r) => formatBRL(Number(r.priceCents)) },
        { header: "Prazo", cell: (r) => `${r.minDays}–${r.maxDays} dias` },
        { header: "Status", cell: (r) => <Badge tone={r.isActive ? "success" : "neutral"}>{r.isActive ? "Ativa" : "Inativa"}</Badge> },
      ]}
    />
  );
}

export function BannerManager({ rows }: { rows: Row[] }) {
  return (
    <EntityManager
      title="Banner"
      endpoint="/api/admin/banners"
      rows={rows}
      defaults={{ title: "", subtitle: "", imageUrl: "", linkUrl: "", ctaLabel: "", sortOrder: "0", isActive: true, startsAt: "", endsAt: "" }}
      fields={[
        { name: "title", label: "Título", type: "text", wide: true },
        { name: "subtitle", label: "Subtítulo", type: "textarea", optional: true },
        { name: "imageUrl", label: "Imagem", type: "image", optional: true },
        { name: "linkUrl", label: "Link (ex.: /produtos)", type: "text", optional: true },
        { name: "ctaLabel", label: "Texto do botão", type: "text", optional: true },
        { name: "sortOrder", label: "Ordem", type: "number" },
        { name: "startsAt", label: "Início", type: "datetime", optional: true },
        { name: "endsAt", label: "Fim", type: "datetime", optional: true },
        { name: "isActive", label: "Ativo", type: "checkbox" },
      ]}
      help={<p className="rounded-2xl bg-brand-50 p-4 text-sm text-brand-900">O primeiro banner ativo (menor ordem) é exibido no topo da página inicial.</p>}
      columns={[
        { header: "Título", cell: (r) => <span className="font-medium">{String(r.title)}</span> },
        { header: "Link", cell: (r) => String(r.linkUrl ?? "—") },
        { header: "Ordem", cell: (r) => String(r.sortOrder) },
        { header: "Status", cell: (r) => <Badge tone={r.isActive ? "success" : "neutral"}>{r.isActive ? "Ativo" : "Inativo"}</Badge> },
      ]}
    />
  );
}
