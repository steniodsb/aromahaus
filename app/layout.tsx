import type { Metadata } from "next";
import { Lexend, Marcellus } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/lib/cart/cart-context";

/**
 * Lexend: interface, navegação, botões, preços e textos.
 *
 * É a tipografia de apoio do manual da marca — a mesma do descritivo
 * "Perfumaria por Galvão Amorim" na assinatura e dos rótulos.
 */
const lexend = Lexend({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500"],
  display: "swap",
});

/**
 * Marcellus: títulos.
 *
 * O logotipo usa a Assassin's, que é comercial e não tem licença web; ele
 * entra como vetor (public/brand) e os títulos usam a Marcellus, a serifada
 * livre mais próxima dela — capitais de inscrição com o remate abrindo em
 * leque. Tem um peso só e NÃO tem itálico: por
 * isso `font-synthesis: none` no CSS, senão o navegador inventa um negrito e
 * um oblíquo falsos, que é exatamente o que faz uma fonte bonita parecer
 * estranha na tela.
 */
const marcellus = Marcellus({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aromahaus.steniowebdesigner.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Aroma Haus | Perfumaria de ambiente por Galvão Amorim",
    template: "%s | Aroma Haus",
  },
  description:
    "Difusores de varetas, home sprays, sabonetes líquidos e refis em fragrâncias autorais. Perfumaria de ambiente feita à mão por Galvão Amorim, com envio para todo o Brasil.",
  keywords: [
    "difusor de ambiente",
    "home spray",
    "sabonete líquido",
    "refil de difusor",
    "perfumaria de ambiente",
    "aromatizador",
    "Aroma Haus",
    "Galvão Amorim",
  ],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Aroma Haus",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
  },
  // Ícone e imagem de compartilhamento são convenções de arquivo: o Next lê
  // `app/icon.svg`, `app/opengraph-image.png` e `app/twitter-image.png` e
  // monta as tags sozinho. Sem a imagem, link colado no WhatsApp, Instagram
  // ou Facebook aparecia como um retângulo vazio.
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      className={`${lexend.variable} ${marcellus.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-ink">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
