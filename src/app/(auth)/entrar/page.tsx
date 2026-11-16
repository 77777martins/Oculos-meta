import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { safeRedirectPath } from "@/lib/utils";
import { LoginForm } from "@/components/account/auth-forms";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect(safeRedirectPath(next));
  return (
    <>
      <h1 className="text-3xl font-semibold">Bem-vindo de volta</h1>
      <p className="mt-2 text-slate-600">Entre para acompanhar pedidos e finalizar compras.</p>
      <div className="mt-8">
        <LoginForm next={next} />
      </div>
      <p className="mt-8 text-center text-sm text-slate-600">
        Ainda não tem conta?{" "}
        <Link href={`/cadastro${next ? `?next=${encodeURIComponent(safeRedirectPath(next))}` : ""}`} className="font-semibold text-brand-700 hover:underline">
          Criar conta
        </Link>
      </p>
    </>
  );
}
