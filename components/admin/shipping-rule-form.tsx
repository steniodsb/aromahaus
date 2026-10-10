"use client";

import { useState } from "react";
import { saveShippingRule } from "@/app/admin/(panel)/frete/actions";
import { UFS } from "@/lib/ufs";
import type { ShippingRule, ShippingRuleKind } from "@/lib/types";

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ShippingRuleForm({ rule }: { rule?: ShippingRule | null }) {
  const [saving, setSaving] = useState(false);
  const [kind, setKind] = useState<ShippingRuleKind>(rule?.kind ?? "free");
  const [error, setError] = useState<string | null>(null);

  const input =
    "w-full rounded border border-linen-300 bg-linen-50 px-3 py-2 text-sm outline-none focus:border-champagne-600";
  const label = "mb-1.5 block text-[0.6875rem] uppercase tracking-[0.14em] text-linen-700";
  const hint = "mt-1 text-xs text-linen-600";

  const selectedStates = new Set(rule?.states ?? []);

  return (
    <form
      action={async (fd) => {
        setSaving(true);
        setError(null);
        const res = await saveShippingRule(fd);
        if (res?.error) setError(res.error);
        setSaving(false);
      }}
      className="space-y-6"
    >
      {rule?.id && <input type="hidden" name="id" value={rule.id} />}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded border border-linen-200 bg-linen-50 p-5">
            <div className="mb-4">
              <label className={label}>Nome da regra *</label>
              <input
                name="name"
                required
                defaultValue={rule?.name}
                placeholder="Frete grátis Sudeste acima de R$ 300"
                className={input}
              />
              <p className={hint}>Só para você identificar no painel.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={label}>O que a regra faz</label>
                <select
                  name="kind"
                  value={kind}
                  onChange={(e) => setKind(e.target.value as ShippingRuleKind)}
                  className={input}
                >
                  <option value="free">Frete grátis</option>
                  <option value="fixed">Frete fixo (R$)</option>
                  <option value="percent_off">Desconto no frete (%)</option>
                </select>
              </div>

              {kind !== "free" && (
                <div>
                  <label className={label}>
                    {kind === "fixed" ? "Valor cobrado (R$) *" : "Desconto (%) *"}
                  </label>
                  <input
                    name="value"
                    type="number"
                    step={kind === "fixed" ? "0.01" : "1"}
                    min="0"
                    max={kind === "percent_off" ? "100" : undefined}
                    required
                    defaultValue={rule?.value ? String(rule.value) : ""}
                    className={input}
                  />
                  {kind === "fixed" && (
                    <p className={hint}>
                      Se o frete real sair mais barato que isso, o cliente paga o
                      mais barato — a regra nunca encarece.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="rounded border border-linen-200 bg-linen-50 p-5">
            <h3 className="mb-1 font-display text-lg text-ink">Quando aplicar</h3>
            <p className="mb-4 text-xs text-linen-600">
              Todas as condições preenchidas precisam bater ao mesmo tempo.
              Deixe em branco o que não quiser usar.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={label}>Valor mínimo em produtos (R$)</label>
                <input
                  name="min_subtotal"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={rule?.min_subtotal ? String(rule.min_subtotal) : ""}
                  className={input}
                />
              </div>
              <div>
                <label className={label}>Peso máximo (g)</label>
                <input
                  name="max_weight_g"
                  type="number"
                  min="1"
                  defaultValue={rule?.max_weight_g ?? ""}
                  className={input}
                />
                <p className={hint}>
                  Se algum produto do carrinho estiver sem peso cadastrado, a
                  regra não é aplicada.
                </p>
              </div>
            </div>

            <div className="mt-4">
              <label className={label}>Estados atendidos</label>
              <div className="flex flex-wrap gap-x-4 gap-y-2 rounded border border-linen-200 p-3">
                {UFS.map((uf) => (
                  <label key={uf} className="flex items-center gap-1.5 text-sm text-linen-700">
                    <input
                      type="checkbox"
                      name="states"
                      value={uf}
                      defaultChecked={selectedStates.has(uf)}
                    />
                    {uf}
                  </label>
                ))}
              </div>
              <p className={hint}>Nenhum marcado = vale para o Brasil todo.</p>
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
                defaultValue={toLocalInput(rule?.starts_at ?? null)}
                className={input}
              />
            </div>
            <div>
              <label className={label}>Fim</label>
              <input
                name="ends_at"
                type="datetime-local"
                defaultValue={toLocalInput(rule?.ends_at ?? null)}
                className={input}
              />
            </div>
          </div>

          <div className="rounded border border-linen-200 bg-linen-50 p-5">
            <label className={label}>Prioridade</label>
            <input
              name="priority"
              type="number"
              defaultValue={rule?.priority ?? 0}
              className={`numeral ${input}`}
            />
            <p className={hint}>
              Só uma regra é aplicada por pedido. Quando duas servem, ganha a de
              maior prioridade.
            </p>
          </div>

          <div className="rounded border border-linen-200 bg-linen-50 p-5">
            <label className="flex items-center gap-2 text-sm text-linen-700">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={rule?.is_active ?? true}
              />
              Regra ativa
            </label>
          </div>

          {error && (
            <p className="rounded bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="rounded bg-linen-900 text-linen-50 text-xs uppercase tracking-[0.12em] transition-colors w-full px-4 py-2 hover:bg-champagne-700 disabled:opacity-60"
          >
            {saving ? "Salvando…" : "Salvar regra"}
          </button>
        </div>
      </div>
    </form>
  );
}
