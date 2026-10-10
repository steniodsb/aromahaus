import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, Mail, HelpCircle } from "lucide-react";
import { InstagramIcon } from "@/components/site/icons";
import { whatsappLink } from "@/lib/utils";
import { getStoreInfo } from "@/lib/store";

export const metadata: Metadata = {
  title: "Contato",
  description:
    "Fale com a Aroma Haus: indicação de fragrância, dúvidas sobre pedido, presente e envio para todo o Brasil.",
};

export default async function ContatoPage() {
  const store = await getStoreInfo().catch(() => null);
  const email = store?.email?.trim() || null;
  const phone = store?.whatsapp
    ? store.whatsapp.replace(/^55/, "").replace(/(\d{2})(\d{4,5})(\d{4})/, "($1) $2-$3")
    : null;

  const card =
    "flex items-start gap-4 border border-line p-6 transition-colors hover:border-champagne-500";

  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <p className="eyebrow">Atendimento</p>
      <h1 className="font-display-xl rule mt-4 text-[clamp(2rem,4.5vw,3rem)] leading-tight text-ink">
        Fale com a gente
      </h1>
      <p className="mt-7 max-w-xl text-[0.9375rem] leading-relaxed text-linen-700">
        Para indicação de fragrância, conte onde você vai usar e que tipo de
        cheiro costuma gostar — respondemos com uma sugestão, não com o catálogo
        inteiro. Para dúvida de pedido, tenha o número em mãos.
      </p>

      <div className="mt-10 space-y-4">
        <a
          href={whatsappLink("Olá! Vim pelo site da Aroma Haus.")}
          target="_blank"
          rel="noopener noreferrer"
          className={card}
        >
          <MessageCircle
            className="mt-0.5 h-5 w-5 shrink-0 text-champagne-600"
            strokeWidth={1.4}
          />
          <span>
            <span className="block text-ink">WhatsApp</span>
            <span className="mt-1 block text-sm text-linen-600">
              {phone ?? "O caminho mais rápido — respondemos em horário comercial."}
            </span>
          </span>
        </a>

        {/* Sem e-mail configurado em Admin -> Configuracoes, o cartao nao
            aparece. Publicar um endereco que nao existe e pior do que nao
            oferecer o canal. */}
        {email ? (
          <a href={`mailto:${email}`} className={card}>
            <Mail
              className="mt-0.5 h-5 w-5 shrink-0 text-champagne-600"
              strokeWidth={1.4}
            />
            <span>
              <span className="block text-ink">E-mail</span>
              <span className="mt-1 block text-sm text-linen-600">{email}</span>
            </span>
          </a>
        ) : null}

        <a
          href="https://instagram.com/aromahaus"
          target="_blank"
          rel="noopener noreferrer"
          className={card}
        >
          <InstagramIcon className="mt-0.5 h-5 w-5 shrink-0 text-champagne-600" />
          <span>
            <span className="block text-ink">Instagram</span>
            <span className="mt-1 block text-sm text-linen-600">@aromahaus</span>
          </span>
        </a>

        <Link href="/faq" className={card}>
          <HelpCircle
            className="mt-0.5 h-5 w-5 shrink-0 text-champagne-600"
            strokeWidth={1.4}
          />
          <span>
            <span className="block text-ink">Perguntas frequentes</span>
            <span className="mt-1 block text-sm text-linen-600">
              Duração do difusor, número de varetas, refil, presente e troca.
            </span>
          </span>
        </Link>
      </div>
    </div>
  );
}
