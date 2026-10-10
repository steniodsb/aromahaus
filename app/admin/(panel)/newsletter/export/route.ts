import { createClient } from "@/lib/supabase/server";

/**
 * CSV dos inscritos, para importar em Resend/Mailchimp/planilha.
 *
 * É uma rota (e não server action) porque o navegador precisa de uma resposta
 * com `Content-Disposition` para baixar arquivo — server action devolve dado,
 * não download.
 */
export async function GET() {
  // Checagem própria: `requireAdmin()` redireciona, o que não faz sentido num
  // download. Aqui um 403 seco é a resposta certa.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Não autorizado", { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) return new Response("Não autorizado", { status: 403 });

  const { data, error } = await supabase
    .from("newsletter_subscribers")
    .select("email, status, source, created_at, unsubscribed_at")
    .order("created_at", { ascending: false });

  if (error) return new Response(error.message, { status: 500 });

  /**
   * Escapa para CSV. Um e-mail não costuma ter vírgula, mas `source` é texto
   * livre — e um campo com vírgula sem aspas desloca todas as colunas
   * seguintes na planilha.
   */
  const cell = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const linhas = [
    ["email", "status", "origem", "inscrito_em", "descadastrado_em"].join(","),
    ...(data ?? []).map((r) =>
      [r.email, r.status, r.source, r.created_at, r.unsubscribed_at].map(cell).join(","),
    ),
  ];

  // BOM para o Excel abrir acentuação corretamente.
  const csv = "﻿" + linhas.join("\r\n");
  const hoje = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="newsletter-aromahaus-${hoje}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
