import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

function safePath(value: string | null): string {
  // Só aceita caminhos internos (evita open-redirect).
  return value && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/conta";
}

/**
 * Destino dos links de e-mail do Supabase (recuperar senha, confirmar
 * cadastro). Troca o token do link por uma sessão em cookie e só então manda
 * o usuário para a página final — sem isso a página de nova senha abre
 * deslogada e o `updateUser` falha com "Auth session missing".
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const destination = request.nextUrl.clone();
  destination.search = "";
  destination.pathname = safePath(searchParams.get("next"));

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) return NextResponse.redirect(destination);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(destination);
  } else {
    // Fluxo implícito: o token vem no fragmento (#access_token), que nunca
    // chega ao servidor. Quem resolve é o client na página de destino.
    return NextResponse.redirect(destination);
  }

  const failure = request.nextUrl.clone();
  failure.search = "";
  failure.pathname = "/conta/recuperar";
  failure.searchParams.set("erro", "link");
  return NextResponse.redirect(failure);
}
