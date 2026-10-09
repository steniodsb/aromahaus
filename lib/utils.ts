import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes with conditional logic (shadcn-style helper). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number as Brazilian Real currency. */
export function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/** Format a CPF as 000.000.000-00 while the user types. */
export function formatCPF(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

/**
 * Validate a CPF using the official check-digit algorithm.
 * Used on both sides: the browser blocks typos early, the server never trusts it.
 */
export function isValidCPF(value: string) {
  const cpf = value.replace(/\D/g, "");
  if (cpf.length !== 11) return false;
  // Rejeita sequências repetidas (000.000.000-00, 111.111.111-11, …)
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digit = (upTo: number) => {
    let sum = 0;
    for (let i = 0; i < upTo; i++) {
      sum += Number(cpf[i]) * (upTo + 1 - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

/**
 * Regra única de frete grátis, usada pela vitrine E pelo servidor.
 *
 * Fica aqui — e não em cada tela — porque quando carrinho e checkout tinham
 * cada um a sua cópia, eles divergiram: o carrinho anunciava frete grátis que o
 * checkout não dava. Quem decide se vale é sempre `createCheckout`; a vitrine só
 * pode mostrar o mesmo resultado.
 */
export function qualifiesForFreeShipping(subtotal: number, threshold: number) {
  return threshold > 0 && subtotal >= threshold;
}

/** Build a wa.me link with an optional pre-filled message. */
export function whatsappLink(message?: string) {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "5511948636615";
  const base = `https://wa.me/${number}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

// ── Datas ───────────────────────────────────────────────────────────────────

/**
 * Fuso da loja.
 *
 * Precisa ser explícito em TODA formatação de data. As telas do admin são
 * server components, e na Vercel o processo roda em UTC — sem este parâmetro,
 * `toLocaleString("pt-BR")` imprime o horário em UTC e tudo aparece 3 horas
 * adiantado. Um pedido feito 10:49 saía como 13:49.
 */
export const TZ_LOJA = "America/Sao_Paulo";

/** "05/08/2026" no fuso da loja. */
export function dataBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("pt-BR", { timeZone: TZ_LOJA });
}

/** "05/08/2026, 10:49" no fuso da loja. */
export function dataHoraBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("pt-BR", {
        timeZone: TZ_LOJA,
        dateStyle: "short",
        timeStyle: "short",
      });
}

/** "10:49" no fuso da loja. */
export function horaBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleTimeString("pt-BR", {
        timeZone: TZ_LOJA,
        hour: "2-digit",
        minute: "2-digit",
      });
}
