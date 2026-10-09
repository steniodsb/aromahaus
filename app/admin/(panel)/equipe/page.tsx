import { ShieldCheck, History } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminToggle } from "@/components/admin/admin-toggle";
import { dataHoraBR } from "@/lib/utils";

export default async function AdminEquipePage() {
  const { user } = await requireAdmin();

  // Service role: o e-mail vive em `auth.users`, que a policy de `profiles`
  // não alcança — e sem e-mail a lista não identifica ninguém.
  const admin = createAdminClient();

  const [{ data: perfis }, { data: authUsers }, { data: atividade }] = await Promise.all([
    admin.from("profiles").select("id, full_name, is_admin, created_at").order("created_at"),
    admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
    admin
      .from("activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(60),
  ]);

  const emailPorId = new Map(
    (authUsers?.users ?? []).map((u) => [u.id, u.email ?? ""]),
  );

  const pessoas = (perfis ?? []).map((p) => ({
    ...p,
    email: emailPorId.get(p.id) ?? "—",
  }));

  const admins = pessoas.filter((p) => p.is_admin);
  const clientes = pessoas.filter((p) => !p.is_admin);

  const card = "rounded border border-linen-200 bg-linen-50";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2 font-display text-3xl text-ink">Equipe e atividade</h1>
        <p className="max-w-2xl text-sm text-linen-600">
          Quem tem acesso ao painel e o que foi feito nele. Promover alguém
          exigia rodar SQL no banco até agora.
        </p>
      </div>

      <div className={card}>
        <div className="border-b border-linen-200 p-4">
          <h2 className="flex items-center gap-2 font-semibold text-ink">
            <ShieldCheck className="h-4 w-4" /> Administradores ({admins.length})
          </h2>
        </div>
        <div className="divide-y divide-linen-100">
          {admins.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-medium text-ink">{p.full_name ?? "sem nome"}</p>
                <p className="text-sm text-linen-600">{p.email}</p>
              </div>
              <AdminToggle userId={p.id} isAdmin ehVoce={p.id === user.id} />
            </div>
          ))}
        </div>
      </div>

      {clientes.length > 0 && (
        <div className={card}>
          <div className="border-b border-linen-200 p-4">
            <h2 className="font-semibold text-ink">
              Contas de cliente ({clientes.length})
            </h2>
            <p className="mt-1 text-xs text-linen-600">
              Quem criou conta na loja. Promova só quem precisa mexer no painel.
            </p>
          </div>
          <div className="divide-y divide-linen-100">
            {clientes.slice(0, 50).map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{p.full_name ?? "sem nome"}</p>
                  <p className="text-sm text-linen-600">{p.email}</p>
                </div>
                <AdminToggle userId={p.id} isAdmin={false} ehVoce={p.id === user.id} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={card}>
        <div className="border-b border-linen-200 p-4">
          <h2 className="flex items-center gap-2 font-semibold text-ink">
            <History className="h-4 w-4" /> Atividade recente
          </h2>
        </div>
        {(atividade ?? []).length === 0 ? (
          <p className="p-6 text-sm text-linen-600">
            Nada registrado ainda. A partir de agora, mudança de status de
            pedido, estorno e ajuste de estoque aparecem aqui com autor e hora.
          </p>
        ) : (
          <div className="divide-y divide-linen-100">
            {(atividade ?? []).map((a) => (
              <div key={a.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 p-3 text-sm">
                <span className="font-medium text-ink">{a.actor_email ?? "sistema"}</span>
                <span className="text-linen-600">{a.action}</span>
                <span className="text-linen-600">
                  {a.entity}
                  {a.entity_label && ` ${a.entity_label}`}
                </span>
                {a.meta != null && (
                  <span className="font-mono text-xs text-linen-500">
                    {Object.entries(a.meta as Record<string, unknown>)
                      .filter(([, v]) => v != null && v !== "")
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(" · ")}
                  </span>
                )}
                <span className="ml-auto shrink-0 text-xs text-linen-500">
                  {dataHoraBR(a.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
