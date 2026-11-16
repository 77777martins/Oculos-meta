"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lock, MapPin, Truck } from "lucide-react";
import { cart, useCartItems } from "@/components/providers/cart-store";
import { useToast } from "@/components/providers/toast";
import { Button, ButtonLink } from "@/components/ui/button";
import { Checkbox, Input, Select } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { apiFetch, ApiClientError } from "@/lib/http/client";
import { formatBRL } from "@/lib/money";
import { cn, formatZip, onlyDigits } from "@/lib/utils";
import { BR_STATES, cpfSchema, phoneSchema } from "@/lib/validation/common";
import { addressSchema } from "@/lib/validation/address";
import { CHECKOUT_COUPON_KEY } from "./cart-view";
import { OrderSummary } from "./order-summary";
import { useCartQuote } from "./use-cart-quote";

interface SavedAddress {
  id: string;
  label: string | null;
  recipient: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string | null;
  district: string;
  city: string;
  state: string;
  isDefault: boolean;
}

const customerSchema = z.object({ customerDocument: cpfSchema, customerPhone: phoneSchema });
type CustomerForm = z.input<typeof customerSchema>;
type AddressForm = z.input<typeof addressSchema>;

export function CheckoutForm({ addresses, defaultName, defaultPhone }: { addresses: SavedAddress[]; defaultName: string; defaultPhone: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const items = useCartItems();
  const [addressId, setAddressId] = useState<string | "new">(addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? "new");
  const [newZip, setNewZip] = useState<string>();
  const [shippingOptionId, setShippingOptionId] = useState<string>();
  const [coupon, setCoupon] = useState<string | undefined>();
  const [saveAddress, setSaveAddress] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura única do sessionStorage após a hidratação
      setCoupon(sessionStorage.getItem(CHECKOUT_COUPON_KEY) ?? undefined);
    } catch {
      /* ignora */
    }
  }, []);

  const selected = addresses.find((a) => a.id === addressId);
  const zip = addressId === "new" ? newZip : selected?.zipCode;
  const { quote, loading } = useCartQuote(items, zip, coupon);

  const options = quote?.shippingOptions ?? [];
  const chosen = options.find((o) => o.id === shippingOptionId) ?? options[0];

  const customer = useForm<CustomerForm>({ resolver: zodResolver(customerSchema), defaultValues: { customerDocument: "", customerPhone: defaultPhone ?? "" } });
  const address = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
    defaultValues: { recipient: defaultName, zipCode: "", street: "", number: "", complement: "", district: "", city: "", state: undefined, phone: "", label: "" },
  });

  async function onZipBlur(raw: string) {
    const d = onlyDigits(raw);
    if (d.length !== 8) return;
    setNewZip(d);
    try {
      const r = await apiFetch<{ street: string; district: string; city: string; state: string }>(`/api/cep/${d}`);
      if (r.street) address.setValue("street", r.street);
      if (r.district) address.setValue("district", r.district);
      if (r.city) address.setValue("city", r.city);
      if (r.state) address.setValue("state", r.state as AddressForm["state"]);
      address.setFocus(r.street ? "number" : "street");
    } catch {
      /* preenchimento manual */
    }
  }

  async function submit() {
    const customerOk = await customer.trigger();
    const addressOk = addressId !== "new" || (await address.trigger());
    if (!customerOk || !addressOk) {
      toast.error("Verifique os dados", "Alguns campos precisam de atenção.");
      return;
    }
    if (!chosen) {
      toast.error("Frete indisponível", "Selecione uma opção de entrega para o CEP informado.");
      return;
    }
    setSubmitting(true);
    try {
      const c = customer.getValues();
      const result = await apiFetch<{ orderId: string }>("/api/checkout", {
        body: {
          items,
          ...(addressId === "new" ? { address: address.getValues(), saveAddress } : { addressId }),
          shippingOptionId: chosen.id,
          ...(quote?.coupon ? { couponCode: quote.coupon.code } : {}),
          customerDocument: c.customerDocument,
          customerPhone: c.customerPhone,
        },
      });
      cart.clear();
      try {
        sessionStorage.removeItem(CHECKOUT_COUPON_KEY);
      } catch {
        /* ignora */
      }
      router.push(`/checkout/pagamento/${result.orderId}`);
    } catch (e) {
      const err = e as ApiClientError;
      toast.error("Não foi possível criar o pedido", err.message);
      setSubmitting(false);
    }
  }

  if (items.length === 0 && !submitting) {
    return <EmptyState title="Seu carrinho está vazio" description="Adicione produtos para finalizar a compra." action={<ButtonLink href="/produtos">Ver modelos</ButtonLink>} />;
  }

  const hasIssues = quote?.lines.some((l) => l.issue) ?? false;

  return (
    <div className="grid gap-10 lg:grid-cols-3">
      <div className="space-y-8 lg:col-span-2">
        {/* 1. Dados */}
        <section className="rounded-3xl border border-slate-100 p-6" aria-labelledby="dados">
          <h2 id="dados" className="flex items-center gap-3 text-lg font-semibold">
            <Step n={1} /> Seus dados
          </h2>
          <p className="mt-1 text-sm text-slate-500">O CPF é exigido pelo processador de pagamentos (Mercado Pago) e pelas transportadoras.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Input label="CPF" inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" maxLength={14} {...customer.register("customerDocument")} error={customer.formState.errors.customerDocument?.message} />
            <Input label="Celular (com DDD)" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="(11) 90000-0000" maxLength={16} {...customer.register("customerPhone")} error={customer.formState.errors.customerPhone?.message} />
          </div>
        </section>

        {/* 2. Endereço */}
        <section className="rounded-3xl border border-slate-100 p-6" aria-labelledby="endereco">
          <h2 id="endereco" className="flex items-center gap-3 text-lg font-semibold">
            <Step n={2} /> Endereço de entrega
          </h2>
          <div className="mt-5 grid gap-3" role="radiogroup" aria-label="Endereços">
            {addresses.map((a) => (
              <label key={a.id} className={cn("flex cursor-pointer gap-3 rounded-2xl border p-4 transition-all", addressId === a.id ? "border-brand-600 bg-brand-50/50 ring-2 ring-brand-600/15" : "border-slate-200 hover:border-slate-300")}>
                <input type="radio" name="address" className="mt-1 accent-brand-600" checked={addressId === a.id} onChange={() => setAddressId(a.id)} />
                <span className="text-sm">
                  <span className="font-semibold">
                    {a.label ?? a.recipient} {a.isDefault && <span className="ml-1 text-xs font-normal text-brand-700">(padrão)</span>}
                  </span>
                  <span className="block text-slate-600">
                    {a.street}, {a.number}
                    {a.complement ? ` — ${a.complement}` : ""} · {a.district} · {a.city}/{a.state} · {formatZip(a.zipCode)}
                  </span>
                </span>
              </label>
            ))}
            <label className={cn("flex cursor-pointer items-center gap-3 rounded-2xl border p-4", addressId === "new" ? "border-brand-600 bg-brand-50/50 ring-2 ring-brand-600/15" : "border-slate-200 hover:border-slate-300")}>
              <input type="radio" name="address" className="accent-brand-600" checked={addressId === "new"} onChange={() => setAddressId("new")} />
              <MapPin className="size-4 text-brand-600" aria-hidden />
              <span className="text-sm font-semibold">Novo endereço</span>
            </label>
          </div>

          {addressId === "new" && (
            <div className="mt-5 grid animate-fade-up gap-4 sm:grid-cols-6">
              <Input className="sm:col-span-6" label="Destinatário" autoComplete="name" {...address.register("recipient")} error={address.formState.errors.recipient?.message} />
              <Input
                className="sm:col-span-2"
                label="CEP"
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder="00000-000"
                maxLength={9}
                {...address.register("zipCode", { onBlur: (e) => onZipBlur(e.target.value) })}
                error={address.formState.errors.zipCode?.message}
              />
              <Input className="sm:col-span-4" label="Rua" autoComplete="address-line1" {...address.register("street")} error={address.formState.errors.street?.message} />
              <Input className="sm:col-span-2" label="Número" {...address.register("number")} error={address.formState.errors.number?.message} />
              <Input className="sm:col-span-4" label="Complemento (opcional)" autoComplete="address-line2" {...address.register("complement")} />
              <Input className="sm:col-span-2" label="Bairro" {...address.register("district")} error={address.formState.errors.district?.message} />
              <Input className="sm:col-span-3" label="Cidade" autoComplete="address-level2" {...address.register("city")} error={address.formState.errors.city?.message} />
              <Select className="sm:col-span-1" label="UF" {...address.register("state")} error={address.formState.errors.state?.message}>
                <option value="">—</option>
                {BR_STATES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
              <Checkbox className="sm:col-span-6" label="Salvar este endereço na minha conta" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} />
            </div>
          )}
        </section>

        {/* 3. Frete */}
        <section className="rounded-3xl border border-slate-100 p-6" aria-labelledby="frete">
          <h2 id="frete" className="flex items-center gap-3 text-lg font-semibold">
            <Step n={3} /> Entrega
          </h2>
          {!zip ? (
            <p className="mt-4 text-sm text-slate-500">Informe o CEP para ver as opções de entrega.</p>
          ) : loading && !quote ? (
            <p className="mt-4 text-sm text-slate-500">Calculando frete…</p>
          ) : options.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">Ainda não entregamos neste CEP. Fale com nosso atendimento.</p>
          ) : (
            <div className="mt-5 grid gap-3" role="radiogroup" aria-label="Opções de frete">
              {options.map((o) => (
                <label key={o.id} className={cn("flex cursor-pointer items-center gap-3 rounded-2xl border p-4", chosen?.id === o.id ? "border-brand-600 bg-brand-50/50 ring-2 ring-brand-600/15" : "border-slate-200")}>
                  <input type="radio" name="shipping" className="accent-brand-600" checked={chosen?.id === o.id} onChange={() => setShippingOptionId(o.id)} />
                  <Truck className="size-4 text-brand-600" aria-hidden />
                  <span className="flex-1 text-sm">
                    <span className="font-semibold">
                      {o.carrier} — {o.serviceName}
                    </span>
                    <span className="block text-slate-600">
                      {o.minDays}–{o.maxDays} dias úteis após a confirmação do pagamento
                    </span>
                  </span>
                  <span className="text-sm font-semibold">{o.isFree ? "Grátis" : formatBRL(o.priceCents)}</span>
                </label>
              ))}
            </div>
          )}
        </section>
      </div>

      <OrderSummary
        totals={quote ? { ...quote.totals, shippingCents: quote.coupon?.type === "FREE_SHIPPING" ? 0 : (chosen?.priceCents ?? 0), totalCents: quote.totals.subtotalCents - quote.totals.discountCents + (quote.coupon?.type === "FREE_SHIPPING" ? 0 : (chosen?.priceCents ?? 0)), shippingCalculated: Boolean(chosen) } : null}
        loading={!quote}
        couponCode={quote?.coupon?.code}
      >
        {quote && (
          <ul className="mb-6 space-y-2 border-b border-slate-200 pb-6 text-sm">
            {quote.lines.map((l) => (
              <li key={l.variantId} className="flex justify-between gap-3">
                <span className="text-slate-600">
                  {l.quantity}× {l.productName} <span className="text-slate-400">({l.variantName})</span>
                </span>
                <span className="shrink-0 font-medium">{formatBRL(l.lineTotalCents)}</span>
              </li>
            ))}
          </ul>
        )}
        <Button size="lg" className="w-full" onClick={submit} loading={submitting} disabled={!chosen || hasIssues} icon={<Lock className="size-4" />}>
          Ir para o pagamento
        </Button>
        {hasIssues && <p className="mt-2 text-center text-xs text-amber-700">Há itens sem estoque. Volte ao carrinho para ajustar.</p>}
        <p className="mt-3 text-center text-xs text-slate-500">O estoque fica reservado enquanto você conclui o pagamento. Os valores finais são confirmados pelo servidor.</p>
      </OrderSummary>
    </div>
  );
}

function Step({ n }: { n: number }) {
  return <span className="flex size-7 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">{n}</span>;
}
