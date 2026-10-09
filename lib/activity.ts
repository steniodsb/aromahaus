import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Registro de atividade do painel.
 *
 * Nunca lança e nunca bloqueia: se o log falhar, a ação que o admin pediu já
 * aconteceu, e derrubar a operação por causa da auditoria trocaria um problema
 * pequeno por um grande. O erro vai para o console.
 *
 * Por isso as chamadas usam `void log(...)` — o registro não precisa terminar
 * antes de responder ao admin.
 */
export async function log(args: {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  entityLabel?: string | null;
  meta?: Record<string, unknown>;
}) {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("activity_log").insert({
      actor_id: args.actorId ?? null,
      actor_email: args.actorEmail ?? null,
      action: args.action,
      entity: args.entity,
      entity_id: args.entityId ?? null,
      entity_label: args.entityLabel ?? null,
      meta: args.meta ?? null,
    });
    if (error) console.error("[log] não registrei a atividade:", error.message);
  } catch (err) {
    console.error("[log] falha inesperada:", err);
  }
}
