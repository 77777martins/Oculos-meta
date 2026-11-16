"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/providers/toast";
import { apiFetch } from "@/lib/http/client";
import { settingsSchema } from "@/lib/validation/admin";
import { Panel } from "./ui";

type Values = z.input<typeof settingsSchema>;

export function SettingsForm({ initial }: { initial: Values }) {
  const toast = useToast();
  const router = useRouter();
  const form = useForm<Values>({ resolver: zodResolver(settingsSchema), defaultValues: initial });
  const e = form.formState.errors;
  const r = form.register;
  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await apiFetch("/api/admin/settings", { method: "PUT", body: values });
      toast.success("Configurações salvas");
      router.refresh();
    } catch (err) {
      toast.error("Não foi possível salvar", (err as Error).message);
    }
  });
  const policyHint = 'Formato: "## Título" para seções, "- item" para listas, linhas em branco separam parágrafos.';
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <Panel title="Loja e contato">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Nome da loja" {...r("storeName")} error={e.storeName?.message} />
          <Input label="Razão social" {...r("legalName")} />
          <Input label="CNPJ" {...r("cnpj")} />
          <Input label="E-mail de contato" type="email" {...r("contactEmail")} error={e.contactEmail?.message} />
          <Input label="Telefone" {...r("contactPhone")} />
          <Input label="WhatsApp" {...r("whatsapp")} />
          <Input label="Horário de atendimento" {...r("businessHours")} />
          <Input label="Instagram (URL)" {...r("instagramUrl")} error={e.instagramUrl?.message} />
          <Input className="sm:col-span-2" label="Endereço" {...r("address")} />
        </div>
      </Panel>
      <Panel title="Checkout">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Validade do PIX e da reserva de estoque (minutos)" type="number" {...r("pixExpirationMinutes", { valueAsNumber: true })} error={e.pixExpirationMinutes?.message} hint="Entre 10 e 1440." />
          <Input label="Parcelamento máximo no cartão" type="number" {...r("maxInstallments", { valueAsNumber: true })} error={e.maxInstallments?.message} hint="Também limitado pelas condições da sua conta Mercado Pago." />
          <Checkbox className="self-end" label="Aceitar boleto bancário" {...r("boletoEnabled")} />
          <Input
            label="Vencimento do boleto (dias corridos)"
            type="number"
            {...r("boletoDueDays", { valueAsNumber: true })}
            error={e.boletoDueDays?.message}
            hint="Entre 1 e 5. O estoque fica reservado até o vencimento + 3 dias (prazo de compensação bancária)."
          />
        </div>
      </Panel>
      <Panel title="Textos institucionais e políticas">
        <p className="mb-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Revise os textos com assessoria jurídica. Enquanto vazios, a loja exibe modelos genéricos identificados como tal.</p>
        <div className="space-y-4">
          <Textarea label="Sobre a loja" rows={5} {...r("aboutText")} hint={policyHint} />
          <Textarea label="Política de privacidade" rows={10} {...r("privacyPolicy")} hint={policyHint} />
          <Textarea label="Termos de uso" rows={10} {...r("termsOfUse")} hint={policyHint} />
          <Textarea label="Política de trocas e devoluções" rows={10} {...r("returnPolicy")} hint={policyHint} />
        </div>
      </Panel>
      <Button type="submit" size="lg" loading={form.formState.isSubmitting}>
        Salvar configurações
      </Button>
    </form>
  );
}
