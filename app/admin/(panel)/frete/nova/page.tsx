import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ShippingRuleForm } from "@/components/admin/shipping-rule-form";

export default function NewShippingRulePage() {
  return (
    <div>
      <Link
        href="/admin/frete"
        className="mb-4 inline-flex items-center gap-1 text-sm text-linen-600 hover:text-champagne-700"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <h1 className="mb-6 font-display text-3xl text-ink">Nova regra de frete</h1>
      <ShippingRuleForm />
    </div>
  );
}
