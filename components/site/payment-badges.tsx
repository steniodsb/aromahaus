import { Lock } from "lucide-react";

const METHODS = ["Pix", "Visa", "Master", "Elo", "Amex", "Boleto"];

export function PaymentBadges({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {METHODS.map((m) => (
        <span
          key={m}
          className="rounded border border-white/15 bg-linen-50/10 px-2 py-1 text-[11px] font-semibold text-white/80"
        >
          {m}
        </span>
      ))}
      <span className="ml-1 inline-flex items-center gap-1 text-[11px] text-white/60">
        <Lock className="h-3 w-3" /> Site seguro
      </span>
    </div>
  );
}
