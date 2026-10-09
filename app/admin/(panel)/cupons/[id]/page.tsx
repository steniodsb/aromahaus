import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Coupon } from "@/lib/types";
import { CouponForm } from "@/components/admin/coupon-form";

export default async function EditCouponPage(props: PageProps<"/admin/cupons/[id]">) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data: coupon } = await supabase.from("coupons").select("*").eq("id", id).single();
  if (!coupon) notFound();

  return (
    <div>
      <Link
        href="/admin/cupons"
        className="mb-4 inline-flex items-center gap-1 text-sm text-linen-600 hover:text-champagne-700"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <h1 className="mb-6 font-display text-3xl text-ink">Editar cupom</h1>
      <CouponForm coupon={coupon as Coupon} />
    </div>
  );
}
