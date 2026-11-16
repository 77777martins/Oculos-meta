"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { useToast } from "@/components/providers/toast";
import { apiFetch } from "@/lib/http/client";
import { passwordSchema } from "@/lib/validation/auth";
import { cleanText } from "@/lib/validation/common";

const profileForm = z.object({ name: cleanText(120, 2), phone: z.string().max(20).optional() });

export function ProfileForm({ name, phone, email }: { name: string; phone: string | null; email: string }) {
  const toast = useToast();
  const router = useRouter();
  const form = useForm<z.input<typeof profileForm>>({ resolver: zodResolver(profileForm), defaultValues: { name, phone: phone ?? "" } });
  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await apiFetch("/api/account/profile", { method: "PATCH", body: values });
      toast.success("Dados atualizados");
      router.refresh();
    } catch (e) {
      toast.error("Não foi possível salvar", (e as Error).message);
    }
  });
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      <Input label="Nome completo" autoComplete="name" {...form.register("name")} error={form.formState.errors.name?.message} />
      <Input label="E-mail" value={email} disabled hint="Para alterar o e-mail, fale com o atendimento." readOnly />
      <Input label="Celular" type="tel" autoComplete="tel-national" {...form.register("phone")} error={form.formState.errors.phone?.message} />
      <div className="flex items-end">
        <Button type="submit" loading={form.formState.isSubmitting}>
          Salvar alterações
        </Button>
      </div>
    </form>
  );
}

const passwordForm = z
  .object({ currentPassword: z.string().min(1, "Informe a senha atual."), newPassword: passwordSchema, confirm: z.string() })
  .refine((v) => v.newPassword === v.confirm, { message: "As senhas não coincidem.", path: ["confirm"] });

export function ChangePasswordForm() {
  const toast = useToast();
  const form = useForm<z.input<typeof passwordForm>>({ resolver: zodResolver(passwordForm) });
  const onSubmit = form.handleSubmit(async ({ currentPassword, newPassword }) => {
    try {
      await apiFetch("/api/account/password", { body: { currentPassword, newPassword } });
      toast.success("Senha alterada", "Outras sessões foram encerradas por segurança.");
      form.reset();
    } catch (e) {
      toast.error("Não foi possível alterar a senha", (e as Error).message);
    }
  });
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-3">
      <Input label="Senha atual" type="password" autoComplete="current-password" {...form.register("currentPassword")} error={form.formState.errors.currentPassword?.message} />
      <Input label="Nova senha" type="password" autoComplete="new-password" {...form.register("newPassword")} error={form.formState.errors.newPassword?.message} />
      <Input label="Confirmar" type="password" autoComplete="new-password" {...form.register("confirm")} error={form.formState.errors.confirm?.message} />
      <div>
        <Button type="submit" variant="dark" loading={form.formState.isSubmitting}>
          Alterar senha
        </Button>
      </div>
    </form>
  );
}
