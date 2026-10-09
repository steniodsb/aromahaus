import { MessageCircle } from "lucide-react";
import { whatsappLink } from "@/lib/utils";

/**
 * Botão flutuante de WhatsApp.
 *
 * Em tinta e dourado, não no verde do WhatsApp: o botão fica na tela o tempo
 * inteiro, sobre a vitrine, e o verde brigava com cada foto de produto. O
 * ícone já diz qual é o canal.
 */
export function WhatsAppFloat() {
  return (
    <a
      href={whatsappLink("Olá! Vim pela loja e tenho uma dúvida sobre um produto.")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Fale conosco no WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-full bg-linen-900 px-5 py-3.5 text-linen-50 shadow-[0_10px_30px_-10px_rgba(43,39,34,0.7)] transition-colors hover:bg-champagne-600 hover:text-linen-900"
    >
      <MessageCircle className="h-5 w-5" strokeWidth={1.5} />
      <span className="hidden text-[0.6875rem] uppercase tracking-[0.16em] sm:inline">
        Fale com a gente
      </span>
    </a>
  );
}
