import type { Metadata } from "next";
import { whatsappLink } from "@/lib/utils";
import { getFaq } from "@/lib/pages";

export const metadata: Metadata = {
  title: "Perguntas Frequentes (FAQ)",
  description:
    "Tire suas dúvidas sobre as peças, kits de coding e retrofit, compatibilidade, pagamento e prazos da Aroma Haus.",
};

export default async function FaqPage() {
  const faq = await getFaq();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold text-ink">
        Perguntas Frequentes
      </h1>

      <div className="space-y-3">
        {faq.map((item) => (
          <details
            key={item.question}
            className="group border border-linen-200 bg-linen-50 p-4"
          >
            <summary className="cursor-pointer list-none font-semibold text-ink marker:hidden">
              {item.question}
            </summary>
            <p className="mt-3 leading-relaxed text-linen-600">{item.answer}</p>
          </details>
        ))}
      </div>

      <p className="mt-8 text-center text-linen-600">
        Não encontrou sua dúvida?{" "}
        <a
          href={whatsappLink("Olá! Tenho uma dúvida.")}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-champagne-700 hover:underline"
        >
          Fale conosco no WhatsApp
        </a>
      </p>
    </div>
  );
}
