import { createClient } from "@/lib/supabase/server";
import { BannerEditor } from "@/components/admin/banner-editor";
import { MiniBannerEditor } from "@/components/admin/mini-banner-editor";
import { PromoBannerEditor } from "@/components/admin/promo-banner-editor";
import type { BannerSlide } from "@/app/admin/(panel)/banners/actions";
import type { MiniBanner, PromoBanner } from "@/lib/store-defaults";

async function getValue<T>(key: string): Promise<T | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("value").eq("key", key).single();
  return (data?.value as T) ?? null;
}

export default async function AdminBannersPage() {
  const [banners, mini, promo] = await Promise.all([
    getValue<BannerSlide[]>("banners"),
    getValue<MiniBanner[]>("mini_banners"),
    getValue<PromoBanner>("promo_banner"),
  ]);

  return (
    <div className="space-y-12">
      <section>
        <h1 className="mb-1 font-display text-3xl text-ink">Banners da Home</h1>
        <p className="mb-6 text-sm text-linen-600">
          Slides do carrossel principal, o primeiro contato do cliente com a loja. Envie uma imagem do computador ou
          reaproveite uma já cadastrada em Produtos. Sem banners, a home usa o
          padrão da marca.
        </p>
        <BannerEditor initial={banners ?? []} />
      </section>

      <section>
        <h2 className="mb-1 font-display text-2xl text-ink">Mini banners — &ldquo;Navegue por formato&rdquo;</h2>
        <p className="mb-6 text-sm text-linen-600">
          Os cartões de categoria no meio da home. Sem nada cadastrado, a home usa
          os padrões da marca.
        </p>
        <MiniBannerEditor initial={mini} />
      </section>

      <section>
        <h2 className="mb-1 font-display text-2xl text-ink">Banner promocional (faixa larga)</h2>
        <p className="mb-6 text-sm text-linen-600">
          A faixa grande de destaque entre as seções de produtos. Desligue se não
          quiser exibir.
        </p>
        <PromoBannerEditor initial={promo} />
      </section>
    </div>
  );
}
