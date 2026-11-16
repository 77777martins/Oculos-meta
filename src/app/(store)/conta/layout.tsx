import type { Metadata } from "next";
import { requireUserPage } from "@/lib/auth/guards";
import { AccountNav } from "@/components/account/account-nav";

export const metadata: Metadata = { title: { default: "Minha conta", template: "%s | Minha conta" }, robots: { index: false } };

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUserPage("/conta");
  return (
    <div className="container-page py-10">
      <p className="text-sm text-slate-500">Olá,</p>
      <h1 className="text-3xl font-semibold">{user.name}</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside>
          <AccountNav />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
