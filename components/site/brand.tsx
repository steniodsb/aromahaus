/**
 * Identidade Aroma Haus.
 *
 * O símbolo é um arco — a porta da "Haus" — com uma flor de cinco pétalas
 * desenhada em fio fino, citando as flores de tecido das fotos da marca e as
 * varetas floridas do difusor. Tudo em traço, nunca preenchido: a marca vive
 * do vazio em volta.
 *
 * O logotipo é texto de verdade (Jost), não imagem: fica nítido em qualquer
 * tela, acompanha o tema e não exige um arquivo por tamanho.
 */

import Link from "next/link";
import { cn } from "@/lib/utils";

export const BRAND_NAME = "Aroma Haus";
export const BRAND_SIGNATURE = "Perfumaria por Galvão Amorim";

export function BrandMark({
  className,
  title,
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 48 56"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      className={cn("h-8 w-auto", className)}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}

      {/* Arco: a fachada da Haus */}
      <path d="M9 50V24a15 15 0 0 1 30 0v26" />

      {/* Haste ondulada, como os caules das flores de tecido */}
      <path d="M24 34c-2.4 5 2.4 7.5 0 12" strokeWidth="1.1" />

      {/* Flor de cinco pétalas */}
      <g strokeWidth="1.1">
        <ellipse cx="24" cy="17.8" rx="3.1" ry="6.2" />
        <ellipse cx="24" cy="17.8" rx="3.1" ry="6.2" transform="rotate(72 24 24)" />
        <ellipse cx="24" cy="17.8" rx="3.1" ry="6.2" transform="rotate(144 24 24)" />
        <ellipse cx="24" cy="17.8" rx="3.1" ry="6.2" transform="rotate(216 24 24)" />
        <ellipse cx="24" cy="17.8" rx="3.1" ry="6.2" transform="rotate(288 24 24)" />
        <circle cx="24" cy="24" r="1.4" />
      </g>
    </svg>
  );
}

/**
 * Assinatura completa: símbolo + logotipo + linha do perfumista.
 *
 * `tone` existe porque a marca aparece sobre o linho claro (cabeçalho) e sobre
 * o linho escuro (rodapé), e o dourado precisa clarear no escuro para não sumir.
 */
export function BrandLockup({
  tone = "dark",
  showSignature = true,
  className,
  markClassName,
}: {
  tone?: "dark" | "light";
  showSignature?: boolean;
  className?: string;
  markClassName?: string;
}) {
  const isLight = tone === "light";

  return (
    <span className={cn("flex items-center gap-3", className)}>
      <BrandMark
        className={cn(
          "h-10 w-auto shrink-0",
          isLight ? "text-champagne-400" : "text-champagne-600",
          markClassName,
        )}
      />
      <span className="flex flex-col">
        <span
          className={cn(
            "text-[1.05rem] font-light uppercase leading-none tracking-[0.3em]",
            isLight ? "text-linen-50" : "text-ink",
          )}
        >
          Aroma&nbsp;Haus
        </span>
        {showSignature ? (
          <span
            className={cn(
              "mt-1.5 text-[0.5rem] uppercase leading-none tracking-[0.18em]",
              isLight ? "text-linen-400" : "text-linen-600",
            )}
          >
            {BRAND_SIGNATURE}
          </span>
        ) : null}
      </span>
    </span>
  );
}

/** Assinatura clicável para o cabeçalho e o rodapé. */
export function BrandLink({
  tone = "dark",
  showSignature = true,
  className,
}: {
  tone?: "dark" | "light";
  showSignature?: boolean;
  className?: string;
}) {
  return (
    <Link
      href="/"
      aria-label={`${BRAND_NAME} — início`}
      className={cn("inline-flex transition-opacity hover:opacity-80", className)}
    >
      <BrandLockup tone={tone} showSignature={showSignature} />
    </Link>
  );
}
