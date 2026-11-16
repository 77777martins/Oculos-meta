import { db } from "@/lib/db";
import { requireUserPage } from "@/lib/auth/guards";
import { ChangePasswordForm, ProfileForm } from "@/components/account/profile-forms";

export const metadata = { title: "Meus dados" };

export default async function AccountPage() {
  const user = await requireUserPage("/conta");
  const profile = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { name: true, email: true, phone: true } });
  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-100 p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Meus dados</h2>
        <div className="mt-6">
          <ProfileForm name={profile.name} email={profile.email} phone={profile.phone} />
        </div>
      </section>
      <section className="rounded-3xl border border-slate-100 p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Segurança</h2>
        <p className="mt-1 text-sm text-slate-500">Ao alterar a senha, todas as outras sessões abertas são encerradas.</p>
        <div className="mt-6">
          <ChangePasswordForm />
        </div>
      </section>
    </div>
  );
}
