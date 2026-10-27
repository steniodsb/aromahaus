/**
 * Identidade Aroma Haus.
 *
 * O símbolo é o monograma "ah" do manual da marca: as iniciais desenhadas
 * como uma única composição, com a linha sinuosa que representa o caminho do
 * aroma no ar, dentro do octógono. O logotipo usa a Assassin's, que não tem
 * licença web — por isso tudo aqui é o vetor oficial (public/brand), extraído
 * do arquivo de produção, e não texto.
 *
 * Cada peça existe em cacau (sobre o marfim) e em marfim (sobre o cacau).
 */

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const BRAND_NAME = "Aroma Haus";
export const BRAND_SIGNATURE = "Perfumaria por Galvão Amorim";

type Tone = "dark" | "light";

/** `dark` = desenho cacau, para fundo claro; `light` = marfim, para fundo escuro. */
const cor = (tone: Tone) => (tone === "light" ? "marfim" : "cacau");

/** Proporções dos vetores (viewBox), para o navegador reservar o espaço certo. */
const LOCKUP = { w: 412.67, h: 107.19 };
const VERTICAL = { w: 403.06, h: 285.74 };

export function BrandMark({
  className,
  title,
  tone = "dark",
}: {
  className?: string;
  title?: string;
  tone?: Tone;
}) {
  return (
    <Image
      src={`/brand/aroma-haus-mark-${cor(tone)}.svg`}
      alt={title ?? ""}
      width={150}
      height={150}
      className={cn("h-8 w-auto", className)}
    />
  );
}

/**
 * Assinatura horizontal: monograma + "Aroma Haus" + "Perfumaria por Galvão
 * Amorim". Sem o descritivo (`showSignature={false}`) o nome fica centrado na
 * altura do monograma — é a versão para espaços apertados, como o celular.
 */
export function BrandLockup({
  tone = "dark",
  showSignature = true,
  className,
}: {
  tone?: Tone;
  showSignature?: boolean;
  className?: string;
}) {
  const arquivo = showSignature ? "lockup" : "lockup-compact";
  return (
    <Image
      src={`/brand/aroma-haus-${arquivo}-${cor(tone)}.svg`}
      alt={showSignature ? `${BRAND_NAME} — ${BRAND_SIGNATURE}` : BRAND_NAME}
      width={LOCKUP.w}
      height={LOCKUP.h}
      priority
      className={cn("h-11 w-auto", className)}
    />
  );
}

/** Assinatura completa empilhada, para rodapé e páginas institucionais. */
export function BrandLockupVertical({
  tone = "dark",
  className,
}: {
  tone?: Tone;
  className?: string;
}) {
  return (
    <Image
      src={`/brand/aroma-haus-lockup-vertical-${cor(tone)}.svg`}
      alt={`${BRAND_NAME} — ${BRAND_SIGNATURE}`}
      width={VERTICAL.w}
      height={VERTICAL.h}
      className={cn("h-28 w-auto", className)}
    />
  );
}

/** Assinatura clicável para o cabeçalho. */
export function BrandLink({
  tone = "dark",
  showSignature = true,
  className,
  lockupClassName,
}: {
  tone?: Tone;
  showSignature?: boolean;
  className?: string;
  lockupClassName?: string;
}) {
  return (
    <Link
      href="/"
      aria-label={`${BRAND_NAME} — início`}
      className={cn("inline-flex transition-opacity hover:opacity-80", className)}
    >
      <BrandLockup tone={tone} showSignature={showSignature} className={lockupClassName} />
    </Link>
  );
}
