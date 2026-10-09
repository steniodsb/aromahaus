import { getPage, getFaq } from "@/lib/pages";
import { PAGE_DEFAULTS } from "@/lib/pages-defaults";
import { PageEditor } from "@/components/admin/page-editor";
import { FaqEditor } from "@/components/admin/faq-editor";

const SLUGS = ["termos-de-uso", "trocas-e-devolucoes", "politica-de-privacidade"];

export default async function AdminPagesPage() {
  const [paginas, faq] = await Promise.all([
    Promise.all(SLUGS.map((s) => getPage(s))),
    getFaq(),
  ]);

  return (
    <div>
      <h1 className="mb-2 font-display text-3xl text-ink">Páginas</h1>
      <p className="mb-6 max-w-2xl text-sm text-linen-600">
        Textos institucionais da loja. Editar aqui publica na hora, sem deploy.
        As páginas <strong>Quem somos</strong> e <strong>Contato</strong> não
        estão aqui porque são layout, não texto corrido — os dados que aparecem
        nelas saem de Configurações.
      </p>

      <div className="space-y-6">
        <FaqEditor initial={faq} />

        {paginas.map((p, i) =>
          p ? <PageEditor key={p.slug} page={p} /> : (
            <p key={SLUGS[i]} className="text-sm text-linen-600">
              Não consegui carregar {PAGE_DEFAULTS[SLUGS[i]]?.title ?? SLUGS[i]}.
            </p>
          ),
        )}
      </div>
    </div>
  );
}
