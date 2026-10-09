import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Topo das páginas de coleção (mais vendidos, promoções, novidades…).
 *
 * As quatro coleções moram em páginas próprias, e não em `/produtos?ordenar=`,
 * porque são as que vão no menu e em campanha: precisam de endereço fixo,
 * título indexável e um texto que explique o recorte.
 */
export function CollectionHeader({
  eyebrow,
  title,
  text,
  tone = "linen",
}: {
  eyebrow: string;
  title: string;
  text: string;
  tone?: "linen" | "ink" | "champagne";
}) {
  const skin = {
    linen: "surface-linen text-ink",
    ink: "surface-ink text-linen-50",
    champagne: "bg-champagne-200/60 text-ink",
  }[tone];

  const eyebrowSkin =
    tone === "ink" ? "!text-champagne-300" : "!text-champagne-700";
  const textSkin = tone === "ink" ? "text-linen-300" : "text-linen-700";

  return (
    <header className={cn("border-b border-line", skin)}>
      <div className="mx-auto max-w-7xl px-6 py-14">
        <nav
          className={cn(
            "mb-6 text-[0.6875rem] uppercase tracking-[0.14em]",
            tone === "ink" ? "text-linen-400" : "text-linen-500",
          )}
        >
          <Link href="/" className="transition-colors hover:text-champagne-500">
            Início
          </Link>
          <span className="mx-2.5">/</span>
          <span className={tone === "ink" ? "text-linen-200" : "text-linen-700"}>
            {title}
          </span>
        </nav>

        <p className={cn("eyebrow", eyebrowSkin)}>{eyebrow}</p>
        <h1 className="font-display mt-4 text-[clamp(2rem,5vw,3.5rem)] leading-[1.05]">
          {title}
        </h1>
        <p className={cn("mt-5 max-w-xl text-[0.9375rem] leading-relaxed", textSkin)}>
          {text}
        </p>
      </div>
    </header>
  );
}

/** Mensagem de coleção vazia — a loja nunca mostra uma página em branco. */
export function CollectionEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-dashed border-linen-300 px-6 py-20 text-center">
      <p className="mx-auto max-w-sm text-sm leading-relaxed text-linen-700">
        {children}
      </p>
      <Link
        href="/produtos"
        className="mt-8 inline-block border border-linen-900 bg-linen-900 px-8 py-3.5 text-[0.6875rem] uppercase tracking-[0.2em] text-linen-50 transition-colors hover:bg-transparent hover:text-ink"
      >
        Ver o catálogo
      </Link>
    </div>
  );
}
