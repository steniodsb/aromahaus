import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { ImportForm } from "@/components/admin/import-form";

export default function ImportarProdutosPage() {
  return (
    <div>
      <Link
        href="/admin/produtos"
        className="mb-4 inline-flex items-center gap-1 text-sm text-linen-600 hover:text-champagne-700"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <h1 className="mb-2 font-display text-3xl text-ink">Importar planilha</h1>
      <p className="mb-6 max-w-2xl text-sm text-linen-600">
        Atualiza preço, estoque e dimensões em lote. Cada linha acha o produto
        pela coluna <strong>sku</strong>. A importação só{" "}
        <strong>atualiza</strong> — nunca cria produto novo.
      </p>

      <div className="mb-6 rounded border border-linen-200 bg-linen-50 p-5">
        <h2 className="mb-2 font-semibold text-ink">Como montar a planilha</h2>
        <p className="mb-3 text-sm text-linen-600">
          O jeito mais seguro é{" "}
          <Link
            href="/admin/produtos/export"
            prefetch={false}
            className="inline-flex items-center gap-1 font-medium text-champagne-700 hover:underline"
          >
            <Download className="h-3.5 w-3.5" /> baixar o CSV do catálogo
          </Link>
          , editar no Excel e subir de volta — o cabeçalho já vem certo.
        </p>
        <ul className="space-y-1 text-sm text-linen-600">
          <li>
            <strong>sku</strong> é obrigatório. Linha com SKU que não existe é ignorada.
          </li>
          <li>
            <strong>Célula vazia não apaga nada</strong> — significa &ldquo;não mexer neste
            campo&rdquo;.
          </li>
          <li>
            Colunas aceitas: preco, preco_comparativo, custo, estoque,
            avisar_abaixo_de, peso_g, largura_cm, altura_cm, comprimento_cm,
            ativo, destaque, nome, descricao.
          </li>
          <li>
            <strong>slug e categoria não mudam por planilha</strong> — mudar slug quebra
            link já indexado no Google, então tem que ser decisão consciente.
          </li>
          <li>Aceita vírgula ou ponto no decimal, e &ldquo;sim/não&rdquo; nos campos de sim ou não.</li>
        </ul>
      </div>

      <ImportForm />
    </div>
  );
}
