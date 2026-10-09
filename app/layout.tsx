import type { Metadata } from "next";
import { Jost } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/lib/cart/cart-context";

/**
 * Jost em tudo: interface e títulos.
 *
 * A marca é um logotipo tipográfico — "AROMA HAUS" em geométrica leve, caixa
 * alta e muito espaçada. Uma serifada nos títulos criava duas vozes na mesma
 * página e a do logo perdia. Com uma família só, todo título é a assinatura
 * da casa repetida; o peso e o espaçamento é que separam hierarquia.
 */
const jost = Jost({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.aromahaus.com.br";

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
  // O ícone é o app/icon.svg; o Next monta o <link> sozinho.
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      className={`${jost.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-ink">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
