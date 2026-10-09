import Link from "next/link";
import Image from "next/image";
import { DEFAULT_MINI_BANNERS, type MiniBanner } from "@/lib/store-defaults";

export function TypeBanners({ banners }: { banners?: MiniBanner[] | null }) {
  const items = (banners?.length ? banners : DEFAULT_MINI_BANNERS).filter(
    (b) => b.label?.trim() && b.href?.trim(),
  );
  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="mb-10">
        <p className="eyebrow">Atalhos</p>
        <h2 className="font-display mt-3 text-3xl text-ink">Vá direto ao ponto</h2>
      </div>
      <div className="grid gap-6 sm:grid-cols-3">
        {items.map((b) => (
          <Link key={b.href} href={b.href} className="group block">
            <div className="relative aspect-[3/4] overflow-hidden rounded-sm bg-linen-100">
              {b.image && (
                <Image
                  src={b.image}
                  alt={b.label}
                  fill
                  sizes="(max-width:640px) 100vw, 33vw"
                  className="object-cover transition-transform duration-[900ms] group-hover:scale-[1.05]"
                />
              )}
            </div>
            <h3 className="font-display mt-5 flex items-baseline justify-between gap-3 border-b border-line pb-3 text-xl text-ink transition-colors group-hover:border-champagne-500">
              {b.label}
              <span className="text-[0.625rem] uppercase tracking-[0.16em] text-linen-500">
                Ver
              </span>
            </h3>
          </Link>
        ))}
      </div>
    </section>
  );
}
