/**
 * Auditoria de dependências de produção com exceções temporárias e documentadas.
 * Falha (código 1) se houver alerta HIGH ou CRITICAL que não esteja em audit-exceptions.json,
 * ou se alguma exceção estiver vencida. Uso: node scripts/audit-check.mjs
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const BLOCKING = new Set(["high", "critical"]);
const today = new Date().toISOString().slice(0, 10);

const { exceptions } = JSON.parse(readFileSync(new URL("../audit-exceptions.json", import.meta.url), "utf8"));
const expired = exceptions.filter((e) => e.expires < today);
const allowed = new Map(exceptions.filter((e) => e.expires >= today).map((e) => [e.advisory, e]));

let raw;
try {
  raw = execFileSync("npm", ["audit", "--omit=dev", "--json"], { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });
} catch (error) {
  // npm audit sai com código != 0 quando encontra alertas; o JSON continua em stdout.
  raw = error.stdout;
  if (!raw) throw error;
}
const report = JSON.parse(raw);

// Alertas de origem (objetos em "via"); pacotes que só dependem deles aparecem como texto e herdam o alerta.
const advisories = new Map();
for (const vuln of Object.values(report.vulnerabilities ?? {})) {
  for (const via of vuln.via) {
    if (typeof via !== "object" || !BLOCKING.has(via.severity)) continue;
    const id = String(via.url ?? "").split("/").pop() || String(via.source);
    advisories.set(id, { id, title: via.title, severity: via.severity, package: via.name });
  }
}

const blocking = [...advisories.values()].filter((a) => !allowed.has(a.id));
const tolerated = [...advisories.values()].filter((a) => allowed.has(a.id));

for (const a of tolerated) console.log(`EXCEÇÃO (vence ${allowed.get(a.id).expires}): ${a.id} ${a.package} [${a.severity}] ${a.title}`);
for (const e of expired) console.error(`EXCEÇÃO VENCIDA em ${e.expires}: ${e.advisory} (${e.package}). Atualize a dependência ou renove a exceção com nova justificativa.`);
for (const a of blocking) console.error(`BLOQUEANTE: ${a.id} ${a.package} [${a.severity}] ${a.title}`);

if (blocking.length > 0 || expired.length > 0) process.exit(1);
console.log(`Auditoria OK: nenhum alerta alto/crítico fora das exceções (${tolerated.length} exceção(ões) ativa(s)).`);
