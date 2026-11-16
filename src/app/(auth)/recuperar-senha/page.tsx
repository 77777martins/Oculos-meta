import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/account/auth-forms";

export const metadata: Metadata = { title: "Recuperar senha", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-3xl font-semibold">Recuperar senha</h1>
      <p className="mt-2 text-slate-600">Informe seu e-mail e enviaremos um link seguro, válido por 30 minutos.</p>
      <div className="mt-8">
        <ForgotPasswordForm />
      </div>
      <p className="mt-8 text-center text-sm">
        <Link href="/entrar" className="font-semibold text-brand-700 hover:underline">
          Voltar para o login
        </Link>
      </p>
    </>
  );
}
