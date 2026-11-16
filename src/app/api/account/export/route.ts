import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/http/api";
import { requireApiUser } from "@/lib/auth/guards";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/security/rate-limit";
import { exportUserData } from "@/server/services/privacy";

/** LGPD: download dos dados pessoais do titular em JSON. */
export const GET = apiHandler(async () => {
  const user = await requireApiUser();
  await enforceRateLimit(RATE_LIMITS.dataExport, user.id);
  const data = await exportUserData(user.id);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="meus-dados-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
});
