import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Keep-alive do Supabase.
 *
 * O plano free pausa o projeto após ~7 dias sem nenhuma atividade no banco.
 * O cron do Vercel (ver `vercel.json`) chama esta rota a cada 2 dias e faz uma
 * leitura trivial, o que basta para o projeto continuar contando como ativo.
 */

// Nunca cachear: uma resposta servida do cache não toca o banco e o
// keep-alive deixaria de cumprir a única função que tem.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  // O Vercel Cron envia `Authorization: Bearer $CRON_SECRET` quando a env
  // existe. Sem a env a rota fica aberta — é só um SELECT count, sem dado.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
  }

  const admin = createAdminClient();
  const { count, error } = await admin
    .from("products")
    .select("id", { count: "exact", head: true });

  if (error) {
    console.error("[keepalive] falhou:", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    products: count ?? 0,
    at: new Date().toISOString(),
  });
}
