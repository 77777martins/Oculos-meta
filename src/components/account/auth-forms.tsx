"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Input } from "@/components/ui/field";
import { apiFetch, ApiClientError } from "@/lib/http/client";
import { safeRedirectPath } from "@/lib/utils";
import { forgotPasswordSchema, loginSchema, passwordSchema, registerSchema } from "@/lib/validation/auth";

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
      {message}
    </p>
  );
}

function PasswordInput(props: React.ComponentProps<typeof Input>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={show ? "text" : "password"} />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-[34px] rounded-full p-1.5 text-slate-500 hover:bg-slate-100" aria-label={show ? "Ocultar senha" : "Mostrar senha"}>
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

/** Aplica erros de campo vindos do servidor no formulário. */
function applyServerErrors(err: unknown, setError: (name: never, e: { message: string }) => void): string {
  if (err instanceof ApiClientError && err.fieldErrors) {
    for (const [field, msgs] of Object.entries(err.fieldErrors)) setError(field as never, { message: msgs[0] ?? "Inválido" });
  }
  return (err as Error).message;
}

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.input<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const res = await apiFetch<{ isStaff: boolean }>("/api/auth/login", { body: values });
      router.replace(safeRedirectPath(next, res.isStaff ? "/admin" : "/conta"));
      router.refresh();
    } catch (e) {
      setError(applyServerErrors(e, form.setError as never));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormError message={error} />
      <Input label="E-mail" type="email" autoComplete="email" {...form.register("email")} error={form.formState.errors.email?.message} />
      <PasswordInput label="Senha" autoComplete="current-password" {...form.register("password")} error={form.formState.errors.password?.message} />
      <div className="flex justify-end">
        <Link href="/recuperar-senha" className="text-sm font-medium text-brand-700 hover:underline">
          Esqueci minha senha
        </Link>
      </div>
      <Button type="submit" size="lg" className="w-full" loading={form.formState.isSubmitting}>
        Entrar
      </Button>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.input<typeof registerSchema>>({ resolver: zodResolver(registerSchema), defaultValues: { marketingOptIn: false } });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await apiFetch("/api/auth/register", { body: values });
      router.replace(safeRedirectPath(next, "/conta"));
      router.refresh();
    } catch (e) {
      setError(applyServerErrors(e, form.setError as never));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormError message={error} />
      <Input label="Nome completo" autoComplete="name" {...form.register("name")} error={form.formState.errors.name?.message} />
      <Input label="E-mail" type="email" autoComplete="email" {...form.register("email")} error={form.formState.errors.email?.message} />
      <PasswordInput
        label="Senha"
        autoComplete="new-password"
        hint="Mínimo de 10 caracteres, com maiúsculas, minúsculas e números."
        {...form.register("password")}
        error={form.formState.errors.password?.message}
      />
      <Checkbox
        label={
          <>
            Li e aceito os{" "}
            <Link href="/termos-de-uso" target="_blank" className="font-semibold text-brand-700 underline">
              Termos de Uso
            </Link>{" "}
            e a{" "}
            <Link href="/politica-de-privacidade" target="_blank" className="font-semibold text-brand-700 underline">
              Política de Privacidade
            </Link>
            .
          </>
        }
        {...form.register("acceptTerms")}
        error={form.formState.errors.acceptTerms?.message}
      />
      <Checkbox label="Quero receber novidades e ofertas por e-mail (opcional)." {...form.register("marketingOptIn")} />
      <Button type="submit" size="lg" className="w-full" loading={form.formState.isSubmitting}>
        Criar conta
      </Button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.input<typeof forgotPasswordSchema>>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const res = await apiFetch<{ message: string }>("/api/auth/forgot-password", { body: values });
      setSent(res.message);
    } catch (e) {
      setError((e as Error).message);
    }
  });

  if (sent) {
    return (
      <div className="rounded-3xl bg-brand-50 p-6 text-center">
        <MailCheck className="mx-auto size-10 text-brand-600" aria-hidden />
        <p className="mt-4 text-sm text-slate-700" role="status">
          {sent}
        </p>
        <p className="mt-2 text-xs text-slate-500">Não recebeu? Verifique a caixa de spam.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormError message={error} />
      <Input label="E-mail cadastrado" type="email" autoComplete="email" {...form.register("email")} error={form.formState.errors.email?.message} />
      <Button type="submit" size="lg" className="w-full" loading={form.formState.isSubmitting}>
        Enviar link de redefinição
      </Button>
    </form>
  );
}

const resetFormSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "As senhas não coincidem.", path: ["confirm"] });

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const form = useForm<z.input<typeof resetFormSchema>>({ resolver: zodResolver(resetFormSchema) });

  const onSubmit = form.handleSubmit(async ({ password }) => {
    setError(null);
    try {
      await apiFetch("/api/auth/reset-password", { body: { token, password } });
      setDone(true);
      setTimeout(() => router.replace("/entrar"), 2500);
    } catch (e) {
      setError((e as Error).message);
    }
  });

  if (done) {
    return (
      <p role="status" className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">
        Senha redefinida com sucesso! Por segurança, encerramos suas outras sessões. Redirecionando para o login…
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormError message={error} />
      <PasswordInput label="Nova senha" autoComplete="new-password" hint="Mínimo de 10 caracteres, com maiúsculas, minúsculas e números." {...form.register("password")} error={form.formState.errors.password?.message} />
      <PasswordInput label="Confirmar nova senha" autoComplete="new-password" {...form.register("confirm")} error={form.formState.errors.confirm?.message} />
      <Button type="submit" size="lg" className="w-full" loading={form.formState.isSubmitting}>
        Redefinir senha
      </Button>
    </form>
  );
}
