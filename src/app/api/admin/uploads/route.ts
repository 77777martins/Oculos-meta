import { apiHandler, ok } from "@/lib/http/api";
import { adminGuard } from "@/lib/http/admin-crud";
import { db } from "@/lib/db";
import { ValidationError } from "@/lib/errors";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/security/rate-limit";
import { MAX_IMAGE_BYTES, storeImage } from "@/server/services/storage";
import { audit } from "@/server/services/audit";

const FOLDERS = ["products", "banners", "categories", "media"] as const;

/** Upload de imagem (multipart). Tipo validado por assinatura binária; nome gerado pelo servidor. */
export const POST = apiHandler(async (req) => {
  const { user, ip } = await adminGuard("media:write");
  await enforceRateLimit(RATE_LIMITS.upload, user.id);
  if (Number(req.headers.get("content-length") ?? 0) > MAX_IMAGE_BYTES + 64 * 1024) throw new ValidationError("A imagem deve ter até 5 MB.");

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const folderRaw = String(form?.get("folder") ?? "media");
  const alt = String(form?.get("alt") ?? "").slice(0, 200) || null;
  if (!(file instanceof File)) throw new ValidationError("Envie um arquivo de imagem.");
  const folder = (FOLDERS as readonly string[]).includes(folderRaw) ? (folderRaw as (typeof FOLDERS)[number]) : "media";

  const stored = await storeImage(file, folder);
  const asset = await db.mediaAsset.create({ data: { url: stored.url, pathname: stored.pathname, mimeType: stored.mime, sizeBytes: stored.size, alt, uploadedById: user.id } });
  await audit({ actorId: user.id, action: "media.upload", entityType: "MediaAsset", entityId: asset.id, ip });
  return ok({ id: asset.id, url: asset.url }, { status: 201 });
});
