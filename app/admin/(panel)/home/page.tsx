import { createClient } from "@/lib/supabase/server";
import { HomeSectionsEditor } from "@/components/admin/home-sections-editor";
import { mergeHomeSections, type HomeSection } from "@/lib/store-defaults";

export default async function AdminHomePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "home_sections")
    .single();
  const sections = mergeHomeSections((data?.value as HomeSection[]) ?? null);

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl text-ink">Seções da Home</h1>
      <p className="mb-6 max-w-2xl text-sm text-linen-600">
        Escolha quais blocos de produtos aparecem na página inicial, em que ordem e
        com qual título. Cada bloco é alimentado automaticamente pelos produtos —
        veja a descrição abaixo de cada um.
      </p>
      <HomeSectionsEditor initial={sections} />
    </div>
  );
}
