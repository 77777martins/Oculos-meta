import Link from "next/link";
import { CheckCircle2, Circle, CircleDashed } from "lucide-react";
import { requirePermissionPage } from "@/lib/auth/guards";
import { AdminHeader, Panel } from "@/components/admin/ui";
import { getLaunchChecklist } from "@/server/services/launch-checklist";

export const metadata = { title: "Pronto para vender" };

export default async function LaunchChecklistPage() {
  await requirePermissionPage("settings:write");
  const groups = await getLaunchChecklist();
  const required = groups.flatMap((g) => g.items).filter((i) => !i.optional);
  const done = required.filter((i) => i.done).length;
  const percent = Math.round((done / required.length) * 100);

  return (
    <>
      <AdminHeader title="Pronto para vender" description="O que falta para a loja operar de verdade. Itens opcionais não impedem a venda." />
      <Panel className="mb-6">
        <p className="text-sm font-semibold">
          {done} de {required.length} itens obrigatórios concluídos
        </p>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso do lançamento">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} />
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        {groups.map((g) => (
          <Panel key={g.title} title={g.title}>
            <ul className="space-y-4">
              {g.items.map((item) => {
                const Icon = item.done ? CheckCircle2 : item.optional ? CircleDashed : Circle;
                return (
                  <li key={item.label} className="flex gap-3">
                    <Icon className={`mt-0.5 size-5 shrink-0 ${item.done ? "text-emerald-600" : item.optional ? "text-slate-400" : "text-amber-500"}`} aria-hidden />
                    <div className="min-w-0 text-sm">
                      <p className="font-medium">
                        {item.label}
                        <span className="sr-only">{item.done ? " — concluído" : " — pendente"}</span>
                        {item.optional && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">opcional</span>}
                      </p>
                      {!item.done && (
                        <p className="mt-0.5 text-slate-600">
                          {item.hint}{" "}
                          {item.href && (
                            <Link href={item.href} className="font-medium text-brand-700 hover:underline">
                              Resolver
                            </Link>
                          )}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>
        ))}
      </div>
    </>
  );
}
