import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/admin/settings-form";
import { AdminPasswordForm } from "@/components/admin/password-form";

export default async function AdminConfigPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("key,value");
  const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value])) as Record<string, Record<string, string | number>>;
  const store = map.store ?? {};
  const shipping = map.shipping ?? {};
  const checkout = map.checkout ?? {};

  const input = "w-full rounded-lg border border-linen-300 px-3 py-2 outline-none focus:border-champagne-600";
  const label = "mb-1 block text-sm font-medium text-linen-700";

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl text-ink">Configurações da loja</h1>

      <SettingsForm>
        <div className="rounded border border-linen-200 bg-linen-50 p-5">
          <h2 className="mb-4 font-semibold text-ink">Dados da loja</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>Nome</label>
              <input name="name" defaultValue={String(store.name ?? "Aroma Haus")} className={input} />
            </div>
            <div>
              <label className={label}>WhatsApp (só números, com DDI)</label>
              <input name="whatsapp" defaultValue={String(store.whatsapp ?? "")} placeholder="5511993549045" className={input} />
            </div>
            <div>
              <label className={label}>Instagram (usuário)</label>
              <input name="instagram" defaultValue={String(store.instagram ?? "")} placeholder="aromahaus" className={input} />
            </div>
            <div>
              <label className={label}>E-mail de contato</label>
              <input name="email" defaultValue={String(store.email ?? "")} className={input} />
            </div>
            <div>
              <label className={label}>Telefone</label>
              <input name="phone" defaultValue={String(store.phone ?? "")} placeholder="(11) 99999-9999" className={input} />
            </div>
            {/* Separado do e-mail de contato: um o cliente vê, o outro é a caixa
                que acompanha a operação. Confundir os dois manda aviso de
                estoque para quem só queria falar com a loja. */}
            <div className="sm:col-span-2">
              <label className={label}>E-mail para avisos da loja</label>
              <input
                name="notifications_email"
                defaultValue={String(store.notificationsEmail ?? "")}
                placeholder="pedidos@aromahaus.com.br"
                className={input}
              />
              <p className="mt-1 text-xs text-linen-600">
                Recebe <strong>novo pedido pago</strong> e <strong>estoque
                baixo</strong>. Não aparece para o cliente. Separe por vírgula
                para avisar mais de uma pessoa. Em branco, continua indo para o
                endereço configurado no servidor.
              </p>
            </div>
            <div>
              <label className={label}>CNPJ / CPF</label>
              <input name="document" defaultValue={String(store.document ?? "")} className={input} />
            </div>
          </div>
        </div>

        <div className="rounded border border-linen-200 bg-linen-50 p-5">
          <h2 className="mb-1 font-semibold text-ink">Checkout — parcelamento</h2>
          <p className="mb-4 text-xs text-linen-600">
            O teto de parcelas vale de verdade: o checkout não oferece mais que
            isso.{" "}
            <strong className="text-linen-700">
              Já o &quot;sem juros&quot; aqui é só o texto da vitrine.
            </strong>{" "}
            Quem decide se a parcela tem juro é a sua conta no Mercado Pago (Seu
            negócio → Custos → Parcelamento). Se os dois discordarem, o cliente
            vê o valor real no seletor de parcelas — a loja é que fica falando
            uma coisa e cobrando outra.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>Máximo de parcelas (1 a 12)</label>
              <input
                name="max_installments"
                type="number"
                min="1"
                max="12"
                step="1"
                defaultValue={String(checkout.max_installments ?? 12)}
                className={input}
              />
            </div>
            <div>
              <label className={label}>Anunciar &quot;sem juros&quot; até (0 desativa)</label>
              <input
                name="interest_free_installments"
                type="number"
                min="0"
                max="12"
                step="1"
                defaultValue={String(checkout.interest_free_installments ?? 2)}
                className={input}
              />
            </div>
          </div>
        </div>

        <div className="rounded border border-linen-200 bg-linen-50 p-5">
          <h2 className="mb-1 font-semibold text-ink">Frete & remetente</h2>
          <p className="mb-4 text-xs text-linen-600">
            O endereço abaixo é o remetente das etiquetas do Melhor Envio e a
            origem do cálculo de frete. Preencha para gerar etiquetas no painel.
          </p>
          <div className="grid gap-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <label className={label}>Frete grátis acima de (R$) — 0 desativa</label>
              <input name="free_shipping_threshold" type="number" step="0.01" defaultValue={String(shipping.free_shipping_threshold ?? shipping.free_above ?? 0)} className={input} />
            </div>
            <div className="sm:col-span-3">
              <label className={label}>CEP de origem</label>
              <input name="from_cep" defaultValue={String(shipping.from_cep ?? "")} placeholder="01001000" className={input} />
            </div>
            <div className="sm:col-span-3">
              <label className={label}>Nome / razão social (remetente)</label>
              <input name="from_name" defaultValue={String(shipping.from_name ?? store.name ?? "")} className={input} />
            </div>
            <div className="sm:col-span-3">
              <label className={label}>CNPJ / CPF do remetente *</label>
              <input name="from_document" defaultValue={String(shipping.from_document ?? "")} className={input} />
              <p className="mt-1 text-xs text-linen-600">
                Obrigatório para emitir etiqueta no Melhor Envio. Sem ele, o
                botão &ldquo;Gerar etiqueta&rdquo; no pedido não funciona.
              </p>
            </div>
            <div className="sm:col-span-3">
              <label className={label}>Telefone do remetente</label>
              <input name="from_phone" defaultValue={String(shipping.from_phone ?? "")} className={input} />
            </div>
            <div className="sm:col-span-3">
              <label className={label}>E-mail do remetente</label>
              <input name="from_email" defaultValue={String(shipping.from_email ?? store.email ?? "")} className={input} />
            </div>
            <div className="sm:col-span-4">
              <label className={label}>Endereço (rua)</label>
              <input name="from_address" defaultValue={String(shipping.from_address ?? "")} className={input} />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Número</label>
              <input name="from_number" defaultValue={String(shipping.from_number ?? "")} className={input} />
            </div>
            <div className="sm:col-span-3">
              <label className={label}>Complemento</label>
              <input name="from_complement" defaultValue={String(shipping.from_complement ?? "")} className={input} />
            </div>
            <div className="sm:col-span-3">
              <label className={label}>Bairro</label>
              <input name="from_district" defaultValue={String(shipping.from_district ?? "")} className={input} />
            </div>
            <div className="sm:col-span-4">
              <label className={label}>Cidade</label>
              <input name="from_city" defaultValue={String(shipping.from_city ?? "")} className={input} />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>UF</label>
              <input name="from_state" maxLength={2} defaultValue={String(shipping.from_state ?? "")} className={input} />
            </div>
          </div>
        </div>

      </SettingsForm>

      <div className="mt-10 max-w-2xl rounded border border-linen-200 bg-linen-50 p-5">
        <h2 className="mb-4 font-semibold text-ink">Segurança — alterar minha senha</h2>
        <AdminPasswordForm />
      </div>
    </div>
  );
}
