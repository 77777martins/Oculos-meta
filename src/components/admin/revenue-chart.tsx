"use client";

import { useState } from "react";
import { formatBRL } from "@/lib/money";

/**
 * Faturamento diário — série única: barras finas em um só tom da marca
 * (validado: contraste ≥ 3:1), cantos de 4px na ponta, 2px de espaço entre
 * barras, grade recessiva, tooltip por barra e tabela alternativa acessível.
 */
export function RevenueChart({ data }: { data: Array<{ day: string; cents: number }> }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720;
  const H = 220;
  const pad = { top: 12, right: 8, bottom: 24, left: 8 };
  const max = Math.max(1, ...data.map((d) => d.cents));
  const slot = (W - pad.left - pad.right) / data.length;
  const barW = Math.max(2, slot - 2);
  const plotH = H - pad.top - pad.bottom;
  const label = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}`;
  const hovered = hover !== null ? data[hover] : null;
  const empty = data.every((d) => d.cents === 0);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-56 w-full" role="img" aria-label="Faturamento diário dos últimos 30 dias" onMouseLeave={() => setHover(null)}>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={pad.left} x2={W - pad.right} y1={pad.top + plotH * (1 - f)} y2={pad.top + plotH * (1 - f)} stroke="#e2e8f0" strokeWidth={1} strokeDasharray="2 4" />
        ))}
        <line x1={pad.left} x2={W - pad.right} y1={pad.top + plotH} y2={pad.top + plotH} stroke="#cbd5e1" strokeWidth={1} />
        {data.map((d, i) => {
          const h = d.cents > 0 ? Math.max(3, (d.cents / max) * plotH) : 0;
          const x = pad.left + i * slot + 1;
          const y = pad.top + plotH - h;
          const r = Math.min(4, barW / 2, h);
          return (
            <g key={d.day} onMouseEnter={() => setHover(i)}>
              {/* área de toque maior que a barra */}
              <rect x={x - 1} y={pad.top} width={slot} height={plotH} fill="transparent" />
              {h > 0 && (
                <path
                  d={`M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + barW - r} Q${x + barW},${y} ${x + barW},${y + r} V${y + h} Z`}
                  fill="#2547ea"
                  opacity={hover === null || hover === i ? 1 : 0.45}
                />
              )}
            </g>
          );
        })}
        {[0, Math.floor(data.length / 2), data.length - 1].map((i) =>
          data[i] ? (
            <text key={i} x={pad.left + i * slot + slot / 2} y={H - 6} textAnchor="middle" fontSize="11" fill="#64748b">
              {label(data[i]!.day)}
            </text>
          ) : null,
        )}
      </svg>
      {empty && (
        <p className="pointer-events-none absolute inset-x-0 top-20 text-center text-sm text-slate-500">Nenhuma venda aprovada nos últimos 30 dias.</p>
      )}
      {hovered && hover !== null && (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-xl bg-ink px-3 py-2 text-xs text-white shadow-lift"
          style={{ left: `${((pad.left + hover * slot + slot / 2) / W) * 100}%` }}
          role="status"
        >
          <p className="text-slate-300">{label(hovered.day)}</p>
          <p className="font-semibold">{formatBRL(hovered.cents)}</p>
        </div>
      )}
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-ink">Ver como tabela</summary>
        <table className="mt-2 w-full text-left text-xs">
          <thead>
            <tr className="text-slate-500">
              <th className="py-1">Dia</th>
              <th className="py-1 text-right">Faturamento</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.day} className="border-t border-slate-100">
                <td className="py-1">{label(d.day)}</td>
                <td className="py-1 text-right tabular-nums">{formatBRL(d.cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
