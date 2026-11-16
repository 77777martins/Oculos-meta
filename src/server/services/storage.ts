import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import { env, isProduction } from "@/lib/env";
import { ServiceUnavailableError, ValidationError } from "@/lib/errors";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const SIGNATURES: Array<{ mime: string; ext: string; check: (b: Uint8Array) => boolean }> = [
  { mime: "image/jpeg", ext: "jpg", check: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png", ext: "png", check: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  {
    mime: "image/webp",
    ext: "webp",
    check: (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
  // AVIF: caixa "ftyp" + marca "avif"/"avis"
  { mime: "image/avif", ext: "avif", check: (b) => String.fromCharCode(...b.slice(4, 8)) === "ftyp" && ["avif", "avis"].includes(String.fromCharCode(...b.slice(8, 12))) },
];

/**
 * Detecta o tipo REAL pelos "magic bytes" — não confia na extensão nem no
 * Content-Type enviados. SVG é proibido (pode conter scripts → XSS).
 */
export function detectImageType(bytes: Uint8Array): { mime: string; ext: string } | null {
  const sig = SIGNATURES.find((s) => s.check(bytes));
  return sig ? { mime: sig.mime, ext: sig.ext } : null;
}

export async function storeImage(file: File, folder: "products" | "banners" | "categories" | "media"): Promise<{ url: string; pathname: string; mime: string; size: number }> {
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) throw new ValidationError("A imagem deve ter até 5 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectImageType(bytes);
  if (!type) throw new ValidationError("Formato não suportado. Envie JPG, PNG, WEBP ou AVIF.");

  // Nome gerado pelo servidor: impede path traversal e sobrescrita de arquivos.
  const pathname = `${folder}/${new Date().getUTCFullYear()}/${randomUUID()}.${type.ext}`;
  const token = env().BLOB_READ_WRITE_TOKEN;

  if (token) {
    const blob = await put(pathname, Buffer.from(bytes), { access: "public", contentType: type.mime, token, addRandomSuffix: false });
    return { url: blob.url, pathname, mime: type.mime, size: bytes.byteLength };
  }

  if (isProduction()) throw new ServiceUnavailableError("Armazenamento de imagens não configurado (BLOB_READ_WRITE_TOKEN).");

  // DESENVOLVIMENTO: grava em public/uploads (ignorado pelo Git).
  const root = path.join(process.cwd(), "public", "uploads");
  const target = path.join(root, pathname);
  if (!target.startsWith(root)) throw new ValidationError("Caminho inválido.");
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes);
  return { url: `/uploads/${pathname}`, pathname, mime: type.mime, size: bytes.byteLength };
}
