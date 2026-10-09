import Link from "next/link";
import { MessageCircle, Mail } from "lucide-react";
import { InstagramIcon } from "@/components/site/icons";
import { PaymentBadges } from "@/components/site/payment-badges";
import { BrandLockup, BRAND_SIGNATURE } from "@/components/site/brand";
import { COLECOES, AJUDA, LEGAL } from "@/components/site/nav-data";
import { whatsappLink } from "@/lib/utils";
import { getTopCategories } from "@/lib/queries";
import { getStoreInfo } from "@/lib/store";

export async function Footer() {
  const [categories, store] = await Promise.all([
    getTopCategories(),
    getStoreInfo().catch(() => null),
  ]);

  const link = "text-sm text-linen-400 transition-colors hover:text-champagne-300";
  const heading = "mb-4 text-[0.625rem] uppercase tracking-[0.2em] text-champagne-400";

  return (
    <footer className="surface-ink text-linen-300">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-5">
          <BrandLockup tone="light" showSignature={false} />
          <p className="max-w-xs text-sm leading-relaxed text-linen-400">
            Perfumaria de ambiente feita em pequenos lotes: difusores de varetas,
            home sprays, sabonetes líquidos e refis em fragrâncias autorais.
          </p>
          <p className="text-[0.625rem] uppercase tracking-[0.18em] text-linen-500">
            {BRAND_SIGNATURE}
          </p>

          <div className="flex gap-3 pt-1">
            <a
              href={whatsappLink("Olá! Vim pelo site da Aroma Haus.")}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="border border-white/15 p-2.5 text-linen-300 transition-colors hover:border-champagne-500 hover:text-champagne-300"
            >
              <MessageCircle className="h-4 w-4" strokeWidth={1.4} />
            </a>
            <a
              href="https://instagram.com/aromahaus"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="border border-white/15 p-2.5 text-linen-300 transition-colors hover:border-champagne-500 hover:text-champagne-300"
            >
              <InstagramIcon className="h-4 w-4" />
            </a>
            {store?.email ? (
              <a
                href={`mailto:${store.email}`}
                aria-label="E-mail"
                className="border border-white/15 p-2.5 text-linen-300 transition-colors hover:border-champagne-500 hover:text-champagne-300"
              >
                <Mail className="h-4 w-4" strokeWidth={1.4} />
              </a>
            ) : null}
          </div>
        </div>

        <div>
          <h3 className={heading}>Comprar</h3>
          <ul className="space-y-2.5">
            {COLECOES.map((c) => (
              <li key={c.href}>
                <Link href={c.href} className={link}>
                  {c.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/produtos" className={link}>
                Todas as fragrâncias
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className={heading}>Formatos</h3>
          <ul className="space-y-2.5">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/categoria/${c.slug}`} className={link}>
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className={heading}>Ajuda</h3>
          <ul className="space-y-2.5">
            {AJUDA.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={link}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 py-7">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-5 px-6">
          <PaymentBadges className="justify-center" />
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-[0.6875rem] text-linen-500">
            {LEGAL.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-champagne-300">
                {l.label}
              </Link>
            ))}
          </div>
          <p className="text-center text-[0.6875rem] text-linen-600">
            © {new Date().getFullYear()} Aroma Haus
            {store?.cnpj ? ` · CNPJ ${store.cnpj}` : ""}. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
