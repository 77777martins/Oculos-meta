import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/account/auth-forms";

export const metadata: Metadata = { title: "Redefinir senha", robots: { index: false }, referrer: "no-referrer" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const valid = typeof token === "string" && /^[A-Za-z0-9_-]{40,64}$/.test(token);
  return (
    <>
      <h1 className="text-3xl font-semibold">Definir nova senha</h1>
      {valid ? (
        <div className="mt-8">
          <ResetPasswordForm token={token} />
        </div>
      ) : (
        <p className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
          Link inválido ou incompleto.{" "}
          <Link href="/recuperar-senha" className="font-semibold underline">
            Solicite um novo
          </Link>
          .
        </p>
      )}
    </>
  );
}
