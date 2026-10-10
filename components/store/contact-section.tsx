import Link from "next/link";
import { MessageCircle, Mail } from "lucide-react";
import { InstagramIcon } from "@/components/site/icons";
import { whatsappLink } from "@/lib/utils";
import { getStoreInfo } from "@/lib/store";

export async function ContactSection() {
  const store = await getStoreInfo().catch(() => null);
  // Sem e-mail configurado, o canal some em vez de virar um endereço
  // inventado que ninguém lê do outro lado.
  const email = store?.email?.trim() || null;
  const whatsapp = whatsappLink(
    "Olá! Vim pelo site da Aroma Haus e queria ajuda para escolher uma fragrância.",
  );

  return (
    <section
      id="contato"
      className="surface-ink glow-champagne relative overflow-hidden py-20 text-linen-200"
    >
      <div className="mx-auto grid max-w-5xl items-end gap-10 px-6 sm:grid-cols-2">
        <div>
          <p className="eyebrow !text-champagne-400">Atendimento</p>
          <h2 className="font-display-xl mt-4 text-[clamp(1.875rem,4vw,3rem)] leading-tight text-linen-50">
            Não sabe qual escolher?
          </h2>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-linen-400">
            Conte onde vai usar e o tipo de cheiro de que você gosta. A gente
            indica a fragrância — e diz francamente quando nenhuma das nossas é
            o que você procura.
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:items-end">
          {/* Sem WhatsApp cadastrado, a chamada não some: vira a página de
              contato, que lista os canais que existem. */}
          {whatsapp ? (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2.5 border border-champagne-500 px-8 py-3.5 text-[0.6875rem] uppercase tracking-[0.2em] text-champagne-300 transition-colors hover:bg-champagne-500 hover:text-linen-900"
            >
              <MessageCircle className="h-4 w-4" strokeWidth={1.4} /> Falar no WhatsApp
            </a>
          ) : (
            <Link
              href="/contato"
              className="inline-flex items-center justify-center gap-2.5 border border-champagne-500 px-8 py-3.5 text-[0.6875rem] uppercase tracking-[0.2em] text-champagne-300 transition-colors hover:bg-champagne-500 hover:text-linen-900"
            >
              Falar com a gente
            </Link>
          )}
          {email ? (
            <a
              href={`mailto:${email}`}
              className="inline-flex items-center gap-2 text-sm text-linen-400 transition-colors hover:text-champagne-300"
            >
              <Mail className="h-4 w-4" strokeWidth={1.4} /> {email}
            </a>
          ) : null}
          <a
            href="https://instagram.com/aromahaus"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-linen-400 transition-colors hover:text-champagne-300"
          >
            <InstagramIcon className="h-4 w-4" /> @aromahaus
          </a>
        </div>
      </div>
    </section>
  );
}
