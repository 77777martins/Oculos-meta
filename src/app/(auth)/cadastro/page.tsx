import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { safeRedirectPath } from "@/lib/utils";
import { RegisterForm } from "@/components/account/auth-forms";

export const metadata: Metadata = { title: "Criar conta", robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect(safeRedirectPath(next));
  return (
    <>
      <h1 className="text-3xl font-semibold">Criar conta</h1>
      <p className="mt-2 text-slate-600">Leva menos de um minuto. Coletamos apenas o necessário.</p>
      <div className="mt-8">
        <RegisterForm next={next} />
      </div>
      <p className="mt-8 text-center text-sm text-slate-600">
        Já tem conta?{" "}
        <Link href="/entrar" className="font-semibold text-brand-700 hover:underline">
          Entrar
        </Link>
      </p>
    </>
  );
}
