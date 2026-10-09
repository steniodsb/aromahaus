import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { ShippingRule } from "@/lib/types";
import { ShippingRuleForm } from "@/components/admin/shipping-rule-form";

export default async function EditShippingRulePage(
  props: PageProps<"/admin/frete/[id]">,
) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data: rule } = await supabase
    .from("shipping_rules")
    .select("*")
    .eq("id", id)
    .single();
  if (!rule) notFound();

  return (
    <div>
      <Link
        href="/admin/frete"
        className="mb-4 inline-flex items-center gap-1 text-sm text-linen-600 hover:text-champagne-700"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <h1 className="mb-6 font-display text-3xl text-ink">Editar regra de frete</h1>
      <ShippingRuleForm rule={rule as ShippingRule} />
    </div>
  );
}
