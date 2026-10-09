import { cn } from "@/lib/utils";

/**
 * Nota em estrelas.
 *
 * Desenhada com um clip em cima de duas camadas em vez de meia-estrela por
 * ícone: assim 4,3 aparece como 4,3 de verdade, e não arredondado para 4,5.
 */
export function Stars({
  value,
  count,
  size = "sm",
  className,
}: {
  value: number | null;
  /** Quantidade de avaliações. Omitido, mostra só as estrelas. */
  count?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const rating = Math.max(0, Math.min(5, value ?? 0));
  const pct = (rating / 5) * 100;
  const star = size === "md" ? "text-lg" : "text-[0.8125rem]";

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn("relative inline-block leading-none tracking-[0.12em]", star)}
        role="img"
        aria-label={
          value == null
            ? "Sem avaliações"
            : `Nota ${rating.toFixed(1).replace(".", ",")} de 5`
        }
      >
        <span className="text-linen-300">★★★★★</span>
        <span
          className="absolute inset-0 overflow-hidden text-champagne-500"
          style={{ width: `${pct}%` }}
          aria-hidden="true"
        >
          ★★★★★
        </span>
      </span>
      {count != null && count > 0 ? (
        <span className="text-[0.6875rem] text-linen-600">({count})</span>
      ) : null}
    </span>
  );
}
