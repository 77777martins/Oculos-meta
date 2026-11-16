"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { apiFetch } from "@/lib/http/client";
import { contactSchema } from "@/lib/validation/admin";

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.input<typeof contactSchema>>({ resolver: zodResolver(contactSchema), defaultValues: { website: "" } });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await apiFetch("/api/contact", { body: values });
      setSent(true);
    } catch (e) {
      setError((e as Error).message);
    }
  });

  if (sent) {
    return (
      <div className="rounded-3xl bg-emerald-50 p-8 text-center" role="status">
        <CheckCircle2 className="mx-auto size-10 text-emerald-600" aria-hidden />
        <p className="mt-4 font-semibold">Mensagem enviada!</p>
        <p className="mt-1 text-sm text-slate-600">Responderemos no seu e-mail o mais breve possível.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      {error && (
        <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-700 sm:col-span-2">
          {error}
        </p>
      )}
      <Input label="Nome" autoComplete="name" {...form.register("name")} error={form.formState.errors.name?.message} />
      <Input label="E-mail" type="email" autoComplete="email" {...form.register("email")} error={form.formState.errors.email?.message} />
      <Input className="sm:col-span-2" label="Assunto" placeholder="Ex.: Dúvida sobre o pedido #1001" {...form.register("subject")} error={form.formState.errors.subject?.message} />
      <Textarea className="sm:col-span-2" label="Mensagem" rows={6} {...form.register("message")} error={form.formState.errors.message?.message} />
      {/* Honeypot: invisível para pessoas, preenchido por bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" {...form.register("website")} />
        </label>
      </div>
      <p className="text-xs text-slate-500 sm:col-span-2">Usaremos seus dados apenas para responder a esta mensagem.</p>
      <div>
        <Button type="submit" loading={form.formState.isSubmitting}>
          Enviar mensagem
        </Button>
      </div>
    </form>
  );
}
