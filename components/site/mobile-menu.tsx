"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X, User, Heart, ChevronRight } from "lucide-react";
import { BrandLockup } from "@/components/site/brand";
import {
  COLECOES,
  AJUDA,
  agruparPorFamilia,
  corDaFamilia,
} from "@/components/site/nav-data";

type Cat = { id: string; name: string; slug: string };
type Fragrance = { name: string; family: string | null };

export function MobileMenu({
  categories,
  fragrances = [],
}: {
  categories: Cat[];
  fragrances?: Fragrance[];
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const familias = agruparPorFamilia(fragrances);

  // Esc fecha + trava o scroll do fundo.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const secao = "px-5 pb-2 pt-6 text-[0.625rem] uppercase tracking-[0.2em] text-linen-500";
  const linha =
    "flex items-center justify-between gap-3 px-5 py-3 text-[0.875rem] text-linen-800 transition-colors hover:bg-linen-100";

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
        aria-expanded={open}
        className="flex items-center p-1.5 text-linen-200 transition-colors hover:text-champagne-300"
      >
        <Menu className="h-6 w-6" strokeWidth={1.4} />
      </button>

      {open && (
        <div className="fixed inset-0 z-[60]" onClick={close}>
          <div className="absolute inset-0 bg-linen-900/50 backdrop-blur-[2px]" />
          <nav
            className="absolute left-0 top-0 flex h-full w-[22rem] max-w-[90%] flex-col bg-linen-50 shadow-[0_0_60px_-10px_rgba(43,39,34,0.5)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="surface-ink flex items-center justify-between px-4 py-4">
              <BrandLockup tone="light" showSignature={false} />
              <button
                onClick={close}
                aria-label="Fechar menu"
                className="p-1.5 text-linen-300 transition-colors hover:text-champagne-300"
              >
                <X className="h-5 w-5" strokeWidth={1.4} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pb-6" onClick={close}>
              {/* Coleções primeiro: é o que vende. */}
              <p className={secao}>Comprar</p>
              {COLECOES.map((c) => (
                <Link key={c.href} href={c.href} className={linha}>
                  <span>
                    <span className={c.accent ? "text-champagne-700" : undefined}>
                      {c.label}
                    </span>
                    {c.note ? (
                      <span className="mt-0.5 block text-xs text-linen-600">
                        {c.note}
                      </span>
                    ) : null}
                  </span>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-linen-400"
                    strokeWidth={1.4}
                  />
                </Link>
              ))}

              {categories.length > 0 && (
                <>
                  <p className={secao}>Formatos</p>
                  {categories.map((c) => (
                    <Link key={c.id} href={`/categoria/${c.slug}`} className={linha}>
                      {c.name}
                      <ChevronRight
                        className="h-4 w-4 shrink-0 text-linen-400"
                        strokeWidth={1.4}
                      />
                    </Link>
                  ))}
                </>
              )}

              {familias.length > 0 && (
                <>
                  <p className={secao}>Fragrâncias</p>
                  {familias.map((g) => (
                    <div key={g.family} className="px-5 py-2.5">
                      <p className="mb-2 flex items-center gap-2 text-[0.625rem] uppercase tracking-[0.14em] text-linen-500">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${corDaFamilia(g.family)}`}
                        />
                        {g.family}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {g.names.map((name) => (
                          <Link
                            key={name}
                            href={`/produtos?fragrancia=${encodeURIComponent(name)}`}
                            className="border border-line px-3 py-1.5 text-sm text-linen-800 transition-colors hover:border-champagne-500"
                          >
                            {name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}

              <p className={secao}>Ajuda</p>
              {AJUDA.map((item) => (
                <Link key={item.href} href={item.href} className={linha}>
                  {item.label}
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-linen-400"
                    strokeWidth={1.4}
                  />
                </Link>
              ))}
            </div>

            <div className="border-t border-line bg-linen-100 p-3" onClick={close}>
              <Link
                href="/conta"
                className="flex items-center gap-2.5 px-3 py-2.5 text-[0.8125rem] text-linen-800 transition-colors hover:text-ink"
              >
                <User className="h-4 w-4" strokeWidth={1.4} /> Minha conta
              </Link>
              <Link
                href="/conta/favoritos"
                className="flex items-center gap-2.5 px-3 py-2.5 text-[0.8125rem] text-linen-800 transition-colors hover:text-ink"
              >
                <Heart className="h-4 w-4" strokeWidth={1.4} /> Lista de desejos
              </Link>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
