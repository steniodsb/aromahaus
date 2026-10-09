"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export interface SettingsState {
  ok: boolean;
  error?: string;
  /** Muda a cada gravação — é o que faz o "Salvo!" reaparecer em saves seguidos. */
  at: number;
}

/**
 * Salva as configurações da loja.
 *
 * Assinatura de `useActionState` (recebe o estado anterior): sem retornar
 * nada, o formulário salvava e a tela ficava IDÊNTICA — sem "salvando", sem
 * confirmação, sem erro. Parecia que o botão não funcionava, e o admin
 * clicava de novo achando que não tinha pego.
 */
export async function saveSettings(
  _anterior: SettingsState | null,
  formData: FormData,
): Promise<SettingsState> {
  await requireAdmin();
  const supabase = await createClient();

  const str = (k: string) => ((formData.get(k) as string) || "").trim();

  const store = {
    name: str("name") || "Aroma Haus",
    whatsapp: str("whatsapp"),
    instagram: str("instagram"),
    email: str("email"),
    notificationsEmail: str("notifications_email"),
    phone: str("phone"),
    document: str("document"),
  };

  const shipping = {
    free_shipping_threshold: Number(formData.get("free_shipping_threshold")) || 0,
    from_cep: str("from_cep"),
    from_name: str("from_name") || store.name,
    from_phone: str("from_phone"),
    from_email: str("from_email") || store.email,
    from_document: str("from_document"),
    from_address: str("from_address"),
    from_number: str("from_number"),
    from_complement: str("from_complement"),
    from_district: str("from_district"),
    from_city: str("from_city"),
    from_state: str("from_state").toUpperCase().slice(0, 2),
  };

  // Parcelamento. O teto é limitado a 12 (máximo que o MP devolve no Brasil) e
  // as "sem juros" nunca passam do teto, senão a vitrine prometeria uma parcela
  // que o checkout não oferece.
  const maxInstallments = Math.min(
    Math.max(Math.trunc(Number(formData.get("max_installments")) || 12), 1),
    12,
  );
  const checkout = {
    max_installments: maxInstallments,
    interest_free_installments: Math.min(
      Math.max(Math.trunc(Number(formData.get("interest_free_installments")) || 0), 0),
      maxInstallments,
    ),
  };

  const { error } = await supabase.from("settings").upsert([
    { key: "store", value: store },
    { key: "shipping", value: shipping },
    { key: "checkout", value: checkout },
  ]);

  if (error) return { ok: false, error: error.message, at: Date.now() };

  revalidatePath("/admin/config");
  revalidatePath("/", "layout");
  return { ok: true, at: Date.now() };
}
