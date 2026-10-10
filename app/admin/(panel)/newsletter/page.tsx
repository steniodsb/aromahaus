import Link from "next/link";
import { Download, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { NewsletterSubscriber } from "@/lib/types";
import { SubscriberRowActions } from "@/components/admin/subscriber-row-actions";
import { dataBR } from "@/lib/utils";

export default async function AdminNewsletterPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("newsletter_subscribers")
    .select("*")
    .order("created_at", { ascending: false });

  const inscritos = (data as NewsletterSubscriber[]) ?? [];
  const ativos = inscritos.filter((s) => s.status === "subscribed").length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
        <h1 className="font-display text-3xl text-ink">
          Newsletter{" "}
          <span className="numeral text-base text-linen-500">
            ({ativos} {ativos === 1 ? "ativo" : "ativos"}
            {inscritos.length !== ativos && ` · ${inscritos.length - ativos} saíram`})
          </span>
        </h1>
        <p className="mt-1 text-sm text-linen-600">
          Quem aceitou receber novidades e lançamentos. Baixe o CSV para enviar campanhas na sua ferramenta de e-mail.
        </p>
        </div>
        {inscritos.length > 0 && (
          <Link
            href="/admin/newsletter/export"
            prefetch={false}
            className="inline-flex items-center gap-2 rounded bg-linen-900 px-4 py-2 text-xs uppercase tracking-[0.12em] text-linen-50 transition-colors hover:bg-champagne-700"
          >
            <Download className="h-4 w-4" /> Baixar CSV
          </Link>
        )}
      </div>

      <div className="overflow-x-auto rounded border border-linen-200 bg-linen-50">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-linen-200 bg-linen-100 text-left text-[0.6875rem] uppercase tracking-[0.12em] text-linen-600">
            <tr>
              <th className="p-3">E-mail</th>
              <th className="p-3">Origem</th>
              <th className="p-3">Inscrito em</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linen-200">
            {inscritos.map((s) => (
              <tr key={s.id} className="hover:bg-linen-100">
                <td className="p-3 text-ink">{s.email}</td>
                <td className="p-3 text-xs text-linen-600">{s.source ?? "—"}</td>
                <td className="numeral p-3 text-linen-600">{dataBR(s.created_at)}</td>
                <td className="p-3">
                  {s.status === "subscribed" ? (
                    <span className="rounded bg-success/15 px-2 py-0.5 text-[0.625rem] uppercase tracking-[0.1em] text-success">
                      Inscrito
                    </span>
                  ) : (
                    <span className="rounded bg-linen-200 px-2 py-0.5 text-[0.625rem] uppercase tracking-[0.1em] text-linen-600">
                      Saiu em <span className="numeral">{dataBR(s.unsubscribed_at)}</span>
                    </span>
                  )}
                </td>
                <td className="p-3">
                  <SubscriberRowActions id={s.id} status={s.status} />
                </td>
              </tr>
            ))}
            {inscritos.length === 0 && (
              <tr>
                <td colSpan={5} className="p-10 text-center text-sm text-linen-600">
                  <Mail className="mx-auto mb-3 h-8 w-8 text-linen-300" />
                  Ninguém inscrito ainda. O formulário fica no rodapé da loja — divulgue um cupom de boas-vindas para atrair os primeiros e-mails.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
