"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, AlertTriangle } from "lucide-react";
import { atualizarDadosPedido } from "@/app/admin/(panel)/pedidos/actions";
import { formatCPF } from "@/lib/utils";

interface Endereco {
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  district?: string;
  city?: string;
  state?: string;
}

/**
 * Correção de contato e endereço de um pedido.
 *
 * Fica fechado por padrão: o caso comum é conferir o pedido, não editar. E
 * campo editável sempre aberto convida a alterar sem querer o que já foi
 * despachado.
 */
export function OrderEdit({
  orderId,
  nome,
  email,
  telefone,
  documento,
  endereco,
  temEtiqueta,
}: {
  orderId: string;
  nome: string;
  email: string;
  telefone: string;
  /** CPF do cliente — é o que vai na etiqueta do Melhor Envio. */
  documento: string;
  endereco: Endereco;
  /** Etiqueta já comprada — o endereço dela não muda por edição aqui. */
  temEtiqueta: boolean;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [addr, setAddr] = useState<Endereco>(endereco ?? {});
  const [cpf, setCpf] = useState(formatCPF(documento ?? ""));

  const input =
    "w-full rounded border border-linen-300 bg-linen-50 px-3 py-2 text-sm outline-none focus:border-champagne-600";
  const label = "mb-1.5 block text-[0.6875rem] uppercase tracking-[0.14em] text-linen-700";

  async function buscarCep(valor: string) {
    const limpo = valor.replace(/\D/g, "");
    if (limpo.length !== 8) return;
    setBuscandoCep(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
      const j = await r.json();
      if (!j.erro) {
        setAddr((a) => ({
          ...a,
          street: j.logradouro || a.street,
          district: j.bairro || a.district,
          city: j.localidade || a.city,
          state: j.uf || a.state,
        }));
      }
    } catch {
      // ViaCEP fora do ar não impede correção manual.
    } finally {
      setBuscandoCep(false);
    }
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-1 text-xs text-linen-600 hover:text-champagne-700"
      >
        <Pencil className="h-3 w-3" /> Corrigir dados
      </button>
    );
  }

  return (
    <form
      action={async (fd) => {
        setSaving(true);
        setError(null);
        const res = await atualizarDadosPedido(fd);
        if (res?.error) setError(res.error);
        else {
          setAberto(false);
          router.refresh();
        }
        setSaving(false);
      }}
      className="mt-3 rounded border border-linen-200 bg-linen-100 p-3"
    >
      <input type="hidden" name="id" value={orderId} />

      {temEtiqueta && (
        <p className="mb-3 flex items-start gap-1.5 rounded bg-warning/10 px-2 py-1.5 text-xs text-warning">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          A etiqueta já foi comprada com o endereço antigo. Corrigir aqui não
          reemite a etiqueta.
        </p>
      )}

      <div className="mb-3 grid gap-2 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={label}>Nome</label>
          <input name="customer_name" defaultValue={nome} required className={input} />
        </div>
        <div>
          <label className={label}>E-mail</label>
          <input name="customer_email" type="email" defaultValue={email} className={input} />
        </div>
        <div>
          <label className={label}>Telefone</label>
          <input name="customer_phone" defaultValue={telefone} className={input} />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>CPF do cliente</label>
          <input
            name="customer_document"
            value={cpf}
            onChange={(e) => setCpf(formatCPF(e.target.value))}
            placeholder="000.000.000-00"
            className={input}
          />
          <p className="mt-1 text-xs text-linen-600">
            Vai na etiqueta do Melhor Envio, que exige em produção. Sem ele a
            etiqueta é recusada.
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-6">
        <div className="sm:col-span-2">
          <label className={label}>CEP {buscandoCep && <span className="normal-case tracking-normal text-linen-500">buscando…</span>}</label>
          <input
            name="cep"
            value={addr.cep ?? ""}
            onChange={(e) => setAddr({ ...addr, cep: e.target.value })}
            onBlur={(e) => buscarCep(e.target.value)}
            className={input}
          />
        </div>
        <div className="sm:col-span-4">
          <label className={label}>Rua</label>
          <input
            name="street"
            value={addr.street ?? ""}
            onChange={(e) => setAddr({ ...addr, street: e.target.value })}
            className={input}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Número</label>
          <input
            name="number"
            value={addr.number ?? ""}
            onChange={(e) => setAddr({ ...addr, number: e.target.value })}
            className={input}
          />
        </div>
        <div className="sm:col-span-4">
          <label className={label}>Complemento</label>
          <input
            name="complement"
            value={addr.complement ?? ""}
            onChange={(e) => setAddr({ ...addr, complement: e.target.value })}
            className={input}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Bairro</label>
          <input
            name="district"
            value={addr.district ?? ""}
            onChange={(e) => setAddr({ ...addr, district: e.target.value })}
            className={input}
          />
        </div>
        <div className="sm:col-span-3">
          <label className={label}>Cidade</label>
          <input
            name="city"
            value={addr.city ?? ""}
            onChange={(e) => setAddr({ ...addr, city: e.target.value })}
            className={input}
          />
        </div>
        <div className="sm:col-span-1">
          <label className={label}>UF</label>
          <input
            name="state"
            maxLength={2}
            value={addr.state ?? ""}
            onChange={(e) => setAddr({ ...addr, state: e.target.value })}
            className={input}
          />
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-linen-900 text-linen-50 text-xs uppercase tracking-[0.12em] transition-colors px-4 py-2 hover:bg-champagne-700 disabled:opacity-60"
        >
          {saving ? "Salvando…" : "Salvar correção"}
        </button>
        <button
          type="button"
          onClick={() => {
            setAberto(false);
            setError(null);
            setAddr(endereco ?? {});
          }}
          className="rounded border border-linen-300 px-4 py-2 text-xs text-linen-700 transition-colors hover:border-linen-900 hover:text-ink"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
