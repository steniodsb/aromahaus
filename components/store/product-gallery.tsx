"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProductGallery({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const list = images.length ? images : ["/brand/placeholder.svg"];
  const [active, setActive] = useState(0);
  const many = list.length > 1;

  const go = (dir: number) =>
    setActive((i) => (i + dir + list.length) % list.length);

  return (
    <div>
      {/* Imagem principal */}
      <div className="group relative aspect-[4/5] overflow-hidden bg-linen-100">
        <Image
          src={list[active]}
          alt={alt}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
        />
        {many && (
          <>
            <button
              aria-label="Imagem anterior"
              onClick={() => go(-1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-linen-50/90 p-2.5 text-ink backdrop-blur-sm transition-opacity hover:bg-linen-50 sm:opacity-0 sm:group-hover:opacity-100"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.4} />
            </button>
            <button
              aria-label="Próxima imagem"
              onClick={() => go(1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-linen-50/90 p-2.5 text-ink backdrop-blur-sm transition-opacity hover:bg-linen-50 sm:opacity-0 sm:group-hover:opacity-100"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={1.4} />
            </button>
            <span className="absolute bottom-3 right-3 bg-linen-900/70 px-2.5 py-1 text-[0.625rem] tracking-[0.1em] text-linen-50">
              {active + 1}/{list.length}
            </span>
          </>
        )}
      </div>

      {/* Carrossel de miniaturas */}
      {many && (
        <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1">
          {list.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`Imagem ${i + 1}`}
              className={cn(
                "relative h-24 w-20 shrink-0 overflow-hidden border bg-linen-100 transition-colors",
                i === active ? "border-champagne-600" : "border-line hover:border-linen-400",
              )}
            >
              <Image src={img} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
