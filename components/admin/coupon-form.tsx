"use client";

import { useState } from "react";
import { saveCoupon } from "@/app/admin/(panel)/cupons/actions";
import type { Coupon, DiscountType } from "@/lib/types";

/** ISO → valor aceito por `<input type="datetime-local">`, no fuso local. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CouponForm({ coupon }: { coupon?: Coupon | null }) {
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<DiscountType>(coupon?.type ?? "percent");
  const [error, setError] = useState<string | null>(null);

  const input =
    "w-full rounded border border-linen-300 bg-linen-50 px-3 py-2 text-sm outline-none focus:border-champagne-600";
  const label = "mb-1.5 block text-[0.6875rem] uppercase tracking-[0.14em] text-linen-700";
  const hint = "mt-1 text-xs text-linen-600";

  return (
    <form
      action={async (fd) => {
        setSaving(true);
        setError(null);
        // Sem try/catch: em caso de sucesso a action redireciona, e um catch
        // aqui engoliria a navegação. Erro vem no retorno, não por exceção.
        const res = await saveCoupon(fd);
        if (res?.error) setError(res.error);
        setSaving(false);
      }}
      className="space-y-6"
    >
      {coupon?.id && <input type="hidden" name="id" value={coupon.id} />}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded border border-linen-200 bg-linen-50 p-5">
            <div className="mb-4">
              <label className={label}>Código *</label>
              <input
                name="code"
                required
                defaultValue={coupon?.code}
                placeholder="BEMVINDO10"
                className={`${input} font-mono uppercase`}
              />
              <p className={hint}>
                O cliente digita no checkout. Não diferencia maiúscula de minúscula.
              </p>
            </div>
            <div>
              <label className={label}>Descrição interna</label>
              <input
                name="description"
                defaultValue={coupon?.description ?? ""}
                placeholder="Campanha de lançamento no Instagram"
                className={input}
              />
            </div>
          </div>

          <div className="rounded border border-linen-200 bg-linen-50 p-5">
            <h3 className="mb-4 font-display text-lg text-ink">Desconto</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={label}>Tipo</label>
                <select
                  name="type"
                  value={type}
                  onChange={(e) => setType(e.target.value as DiscountType)}
                  className={input}
                >
                  <option value="percent">Percentual (%)</option>
                  <option value="fixed">Valor fixo (R$)</option>
                  <option value="free_shipping">Frete grátis</option>
                </select>
              </div>

              {type !== "free_shipping" && (
                <div>
                  <label className={label}>
                    {type === "percent" ? "Percentual *" : "Valor em R$ *"}
                  </label>
                  <input
                    name="value"
                    type="number"
                    step={type === "percent" ? "1" : "0.01"}
                    min="0"
                    max={type === "percent" ? "100" : undefined}
                    required
                    defaultValue={coupon?.value ? String(coupon.value) : ""}
                    className={`numeral ${input}`}
                  />
                </div>
              )}

              {type === "percent" && (
                <div>
                  <label className={label}>Teto de desconto (R$)</label>
                  <input
                    name="max_discount"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={coupon?.max_discount ?? ""}
                    className={input}
                  />
                  <p className={hint}>
                    Opcional. Ex.: 20% mas nunca mais que R$ 100.
                  </p>
                </div>
              )}
            </div>

            {type === "free_shipping" && (
              <p className={`${hint} mt-3`}>
                Zera o frete do pedido. O cliente precisa ter calculado o frete
                antes de aplicar.
              </p>
            )}
          </div>

          <div className="rounded border border-linen-200 bg-linen-50 p-5">
            <h3 className="mb-4 font-display text-lg text-ink">Condições</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={label}>Valor mínimo em produtos (R$)</label>
                <input
                  name="min_subtotal"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={coupon?.min_subtotal ? String(coupon.min_subtotal) : ""}
                  className={input}
                />
                <p className={hint}>Vazio ou 0 = sem mínimo.</p>
              </div>
              <div>
                <label className={label}>Limite total de usos</label>
                <input
                  name="max_uses"
                  type="number"
                  min="1"
                  defaultValue={coupon?.max_uses ?? ""}
                  className={input}
                />
                <p className={hint}>Vazio = ilimitado.</p>
              </div>
              <div>
                <label className={label}>Limite por cliente</label>
                <input
                  name="max_uses_per_customer"
                  type="number"
                  min="1"
                  defaultValue={coupon?.max_uses_per_customer ?? ""}
                  className={input}
                />
                <p className={hint}>Contado pelo e-mail do pedido.</p>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-linen-700">
                  <input
                    type="checkbox"
                    name="first_order_only"
                    defaultChecked={coupon?.first_order_only ?? false}
                  />
                  Só na primeira compra
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded border border-linen-200 bg-linen-50 p-5">
            <h3 className="mb-4 font-display text-lg text-ink">Validade</h3>
            <div className="mb-4">
              <label className={label}>Início</label>
              <input
                name="starts_at"
                type="datetime-local"
                defaultValue={toLocalInput(coupon?.starts_at ?? null)}
                className={input}
              />
            </div>
            <div>
              <label className={label}>Fim</label>
              <input
                name="ends_at"
                type="datetime-local"
                defaultValue={toLocalInput(coupon?.ends_at ?? null)}
                className={input}
              />
            </div>
            <p className={hint}>Vazio nos dois = vale sempre.</p>
          </div>

          <div className="rounded border border-linen-200 bg-linen-50 p-5">
            <label className="flex items-center gap-2 text-sm text-linen-700">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={coupon?.is_active ?? true}
              />
              Cupom ativo
            </label>
            {coupon && (
              <p className={`${hint} mt-3`}>
                Já usado <span className="numeral">{coupon.used_count}</span>{" "}
                {coupon.used_count === 1 ? "vez" : "vezes"}.
              </p>
            )}
          </div>

          {error && (
            <p className="rounded bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="rounded bg-linen-900 text-linen-50 text-xs uppercase tracking-[0.12em] transition-colors w-full px-4 py-2 hover:bg-champagne-700 disabled:opacity-60"
          >
            {saving ? "Salvando…" : "Salvar cupom"}
          </button>
        </div>
      </div>
    </form>
  );
}
