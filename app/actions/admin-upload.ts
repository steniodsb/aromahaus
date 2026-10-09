"use server";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_MB,
  FORMATOS_ACEITOS,
  FORMATOS_LABEL,
} from "@/lib/image-specs";

export interface UploadResult {
  ok: boolean;
  url?: string;
  error?: string;
}

/** Pastas permitidas no bucket. Lista fechada para o cliente não escolher o caminho. */
const PASTAS = ["banner", "blog", "categories", "produtos"] as const;
export type UploadFolder = (typeof PASTAS)[number];

/**
 * Sobe uma imagem para o Storage e devolve a URL pública.
 *
 * Compartilhada por banners, blog e categorias — antes cada tela tinha (ou não
 * tinha) o seu próprio upload, e o blog só aceitava colar URL na mão.
 */
export async function uploadAdminImage(formData: FormData): Promise<UploadResult> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Selecione uma imagem." };
  }
  // Mesmas constantes do cliente: o navegador já barra antes de subir, mas
  // quem chamar a action direto não passa por aquela checagem. Vindo do mesmo
  // módulo, os dois limites não têm como divergir com o tempo.
  if (!FORMATOS_ACEITOS.includes(file.type)) {
    return { ok: false, error: `Formato não aceito. Use ${FORMATOS_LABEL}.` };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return { ok: false, error: `A imagem tem ${mb} MB e o limite é ${MAX_UPLOAD_MB} MB.` };
  }

  // Nunca confia na pasta que veio do formulário: sem a lista fechada, um
  // valor como "../" escaparia do prefixo pretendido dentro do bucket.
  const pedida = String(formData.get("folder") ?? "banner");
  const folder: UploadFolder = (PASTAS as readonly string[]).includes(pedida)
    ? (pedida as UploadFolder)
    : "banner";

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext || "jpg"}`;

  const admin = createAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await admin.storage
    .from("products")
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (error) return { ok: false, error: error.message };

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return { ok: true, url: `${base}/storage/v1/object/public/products/${path}` };
}

/**
 * Imagens já cadastradas nos produtos, para reaproveitar sem subir de novo
 * nem caçar a URL na mão.
 */
export async function listProductImages(): Promise<{ name: string; images: string[] }[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("name, images")
    .not("images", "eq", "{}")
    .order("name");

  return ((data as { name: string; images: string[] }[]) ?? [])
    .filter((p) => p.images?.length)
    .map((p) => ({ name: p.name, images: p.images }));
}
