import "server-only";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getStoreSettings } from "./settings";

export interface ChecklistItem {
  label: string;
  done: boolean;
  /** O que falta e como resolver (texto para o lojista). */
  hint: string;
  href?: string;
  /** Itens opcionais não impedem a loja de vender. */
  optional?: boolean;
}

export interface ChecklistGroup {
  title: string;
  items: ChecklistItem[];
}

/**
 * Situação da loja para começar a vender de verdade. Lê apenas SE cada integração
 * está configurada — nunca devolve valores de chaves ou segredos.
 */
export async function getLaunchChecklist(): Promise<ChecklistGroup[]> {
  const e = env();
  const [settings, demoProducts, realProducts, withoutImages, withoutSpecs, demoZones, zones, demoCoupons, banners, testOrders] = await Promise.all([
    getStoreSettings(),
    db.product.count({ where: { deletedAt: null, OR: [{ slug: { startsWith: "demo-" } }, { name: { startsWith: "[DEMO]" } }] } }),
    db.product.count({ where: { deletedAt: null, status: "PUBLISHED", NOT: [{ slug: { startsWith: "demo-" } }, { name: { startsWith: "[DEMO]" } }] } }),
    db.product.count({ where: { deletedAt: null, status: "PUBLISHED", images: { none: {} } } }),
    db.product.count({ where: { deletedAt: null, status: "PUBLISHED", specs: { equals: [] } } }),
    db.shippingZone.count({ where: { name: { startsWith: "[DEMO]" } } }),
    db.shippingZone.count({ where: { isActive: true } }),
    db.coupon.count({ where: { code: { startsWith: "DEMO" } } }),
    db.banner.count({ where: { isActive: true } }),
    db.order.count(),
  ]);

  return [
    {
      title: "Catálogo",
      items: [
        { label: "Produtos reais cadastrados", done: realProducts > 0, hint: "Cadastre os produtos com nome, preço e estoque reais.", href: "/admin/produtos" },
        { label: "Sem produtos de demonstração", done: demoProducts === 0, hint: `${demoProducts} produto(s) ainda são de demonstração ("[DEMO]"), com preço e estoque fictícios.`, href: "/admin/produtos" },
        { label: "Todos os produtos publicados têm foto", done: withoutImages === 0, hint: `${withoutImages} produto(s) publicado(s) sem foto.`, href: "/admin/produtos" },
        { label: "Especificações técnicas preenchidas", done: withoutSpecs === 0, hint: `${withoutSpecs} produto(s) sem especificações (use somente dados oficiais).`, href: "/admin/produtos", optional: true },
        { label: "Banner principal ativo", done: banners > 0, hint: "Cadastre ao menos um banner para a página inicial.", href: "/admin/banners" },
      ],
    },
    {
      title: "Pagamentos",
      items: [
        { label: "Mercado Pago: chave de acesso", done: !!e.MERCADOPAGO_ACCESS_TOKEN, hint: "Defina MERCADOPAGO_ACCESS_TOKEN (credencial de produção) nas variáveis da Vercel." },
        { label: "Mercado Pago: chave pública (cartão)", done: !!e.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY, hint: "Defina NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY nas variáveis da Vercel." },
        { label: "Mercado Pago: assinatura do webhook", done: !!e.MERCADOPAGO_WEBHOOK_SECRET, hint: "Cadastre o webhook no Mercado Pago e defina MERCADOPAGO_WEBHOOK_SECRET. Sem isso, pagamentos não são confirmados." },
      ],
    },
    {
      title: "Entrega",
      items: [
        { label: "Tabela de frete real", done: zones > 0 && demoZones === 0, hint: demoZones > 0 ? "A tabela de frete ainda é a de demonstração: ajuste preços e prazos." : "Cadastre ao menos uma faixa de CEP.", href: "/admin/frete" },
        { label: "CEP de origem dos envios", done: !!settings.shippingOriginZip, hint: "Informe o CEP de onde os pedidos saem.", href: "/admin/configuracoes" },
        { label: "Melhor Envio (frete em tempo real)", done: settings.melhorEnvioEnabled, hint: "Opcional: conecte o Melhor Envio para cotar frete na hora.", href: "/admin/frete", optional: true },
      ],
    },
    {
      title: "Loja e atendimento",
      items: [
        { label: "E-mail de atendimento", done: !!settings.contactEmail, hint: "Aparece no rodapé e nos e-mails.", href: "/admin/configuracoes" },
        { label: "Telefone ou WhatsApp", done: !!(settings.contactPhone || settings.whatsapp), hint: "Informe um telefone de contato.", href: "/admin/configuracoes" },
        { label: "Política de privacidade revisada", done: !!settings.privacyPolicy, hint: "A loja usa um texto padrão: revise e salve o seu.", href: "/admin/configuracoes" },
        { label: "Termos de uso revisados", done: !!settings.termsOfUse, hint: "A loja usa um texto padrão: revise e salve o seu.", href: "/admin/configuracoes" },
        { label: "Política de trocas revisada", done: !!settings.returnPolicy, hint: "A loja usa um texto padrão: revise e salve o seu.", href: "/admin/configuracoes" },
      ],
    },
    {
      title: "Infraestrutura",
      items: [
        { label: "Envio de e-mails (Resend)", done: !!e.RESEND_API_KEY, hint: "Defina RESEND_API_KEY e EMAIL_FROM. Sem isso, o cliente não recebe confirmação de pedido nem recuperação de senha." },
        { label: "Upload de imagens (Vercel Blob)", done: !!e.BLOB_READ_WRITE_TOKEN, hint: "Defina BLOB_READ_WRITE_TOKEN para enviar fotos pelo painel." },
        { label: "Rotina automática protegida", done: !!e.CRON_SECRET, hint: "Defina CRON_SECRET (expira pedidos não pagos e sincroniza rastreio)." },
        { label: "Endereço da loja em HTTPS", done: e.APP_URL.startsWith("https://") && !e.APP_URL.includes("localhost"), hint: "Defina APP_URL com o domínio definitivo (https://...)." },
        { label: "Modo demonstração desligado", done: !e.DEMO_MODE, hint: "DEMO_MODE=true mostra a faixa amarela e bloqueia o Google. Desligue só quando todo o resto estiver pronto." },
        { label: "Sem pedidos e cupons de teste", done: testOrders === 0 && demoCoupons === 0, hint: `${testOrders} pedido(s) e ${demoCoupons} cupom(ns) de teste no banco. Antes de abrir a loja, rode "npm run launch:cleanup -- --confirm" (eu faço isso na virada).`, optional: true },
      ],
    },
  ];
}
