import { createClient } from "@/lib/supabase/server";
import { saveMarketing } from "@/app/admin/(panel)/marketing/actions";
import { EMPTY_PIXELS, type Pixels } from "@/lib/store-defaults";

export default async function AdminMarketingPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "pixels")
    .single();
  const p: Pixels = { ...EMPTY_PIXELS, ...((data?.value as Pixels) ?? {}) };

  const input =
    "w-full rounded border border-linen-300 bg-linen-50 px-3 py-2 font-mono text-sm outline-none focus:border-champagne-600";
  const label = "mb-1.5 block text-[0.6875rem] uppercase tracking-[0.14em] text-linen-700";
  const hint = "mt-1 text-xs text-linen-600";

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl text-ink">Marketing — Pixels & Tags</h1>
      <p className="mb-6 max-w-2xl text-sm text-linen-600">
        Cole aqui os IDs das suas ferramentas. As tags são carregadas só nas
        páginas da loja (o painel admin nunca é rastreado). Deixe em branco para
        desativar uma integração.
      </p>

      <form action={saveMarketing} className="max-w-2xl space-y-6">
        <div className="rounded border border-linen-200 bg-linen-50 p-5">
          <h2 className="mb-4 font-display text-lg text-ink">Google</h2>
          <div className="space-y-4">
            <div>
              <label className={label}>Google Analytics 4 (Measurement ID)</label>
              <input name="ga4_id" defaultValue={p.ga4_id} placeholder="G-XXXXXXXXXX" className={input} />
              <p className={hint}>Encontra em Admin → Fluxos de dados, no GA4.</p>
            </div>
            <div>
              <label className={label}>Google Tag Manager (Container ID)</label>
              <input name="gtm_id" defaultValue={p.gtm_id} placeholder="GTM-XXXXXXX" className={input} />
              <p className={hint}>Use o GTM para gerenciar qualquer outra tag sem mexer no código.</p>
            </div>
            <div>
              <label className={label}>Google Ads (Conversion ID)</label>
              <input name="google_ads_id" defaultValue={p.google_ads_id} placeholder="AW-XXXXXXXXX" className={input} />
            </div>
          </div>
        </div>

        <div className="rounded border border-linen-200 bg-linen-50 p-5">
          <h2 className="mb-4 font-display text-lg text-ink">Meta (Facebook / Instagram)</h2>
          <div>
            <label className={label}>Meta Pixel ID</label>
            <input name="meta_pixel_id" defaultValue={p.meta_pixel_id} placeholder="123456789012345" className={input} />
            <p className={hint}>Dispara automaticamente o evento PageView em todas as páginas da loja.</p>
          </div>
        </div>

        <div className="rounded border border-linen-200 bg-linen-50 p-5">
          <h2 className="mb-1 font-display text-lg text-ink">Código adicional (avançado)</h2>
          <p className="mb-3 text-xs text-linen-600">
            JavaScript extra injetado em todas as páginas da loja. Use só se souber
            o que está fazendo.
          </p>
          <textarea
            name="head_html"
            rows={5}
            defaultValue={p.head_html}
            placeholder="// ex.: outro pixel, hotjar, etc."
            className={input}
          />
        </div>

        <button className="rounded bg-linen-900 text-linen-50 text-xs uppercase tracking-[0.12em] transition-colors px-4 py-2 hover:bg-champagne-700">
          Salvar
        </button>
      </form>
    </div>
  );
}
