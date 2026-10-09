import { NextResponse } from "next/server";
import { z } from "zod";
import { calculateShipping } from "@/lib/melhorenvio";
import { createClient } from "@/lib/supabase/server";
import { resolveSellables } from "@/lib/sellables";

const schema = z.object({
  cep: z.string().min(8),
  items: z.array(
    z.object({
      id: z.string(),
      variantId: z.string().nullish(),
      qty: z.number().int().positive(),
    }),
  ),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const { cep, items } = parsed.data;

  // Dimensões e peso reais — do produto ou da variante escolhida. O frasco de
  // 500 ml não cabe na mesma caixa do de 250 ml, e cotar os dois igual é
  // cobrar frete errado.
  const supabase = await createClient();
  const lines = await resolveSellables(items);
  const shippingItems = lines.map((it) => ({
    width_cm: it.width_cm,
    height_cm: it.height_cm,
    length_cm: it.length_cm,
    weight_g: it.weight_g ?? 600,
    price: it.unit_price,
    qty: it.qty,
  }));

  // CEP de origem: env ou settings
  let fromCep = process.env.MELHORENVIO_FROM_CEP;
  if (!fromCep) {
    const { data: s } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "shipping")
      .single();
    fromCep = (s?.value as { from_cep?: string })?.from_cep;
  }

  const quotes = await calculateShipping(cep, shippingItems, fromCep);
  return NextResponse.json({ quotes });
}
