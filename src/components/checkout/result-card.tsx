import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ResultCard({ tone, icon, title, children, actions }: { tone: "success" | "warning" | "danger"; icon: ReactNode; title: string; children: ReactNode; actions: ReactNode }) {
  const tones = { success: "bg-emerald-50 text-emerald-600", warning: "bg-amber-50 text-amber-600", danger: "bg-red-50 text-red-600" };
  return (
    <div className="container-page flex justify-center py-20">
      <div className="w-full max-w-xl animate-fade-up rounded-[2rem] border border-slate-100 bg-white p-8 text-center shadow-lift sm:p-12">
        <div className={cn("mx-auto flex size-16 items-center justify-center rounded-full", tones[tone])}>{icon}</div>
        <h1 className="mt-6 text-2xl font-semibold sm:text-3xl">{title}</h1>
        <div className="mt-4 text-slate-600">{children}</div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">{actions}</div>
      </div>
    </div>
  );
}
