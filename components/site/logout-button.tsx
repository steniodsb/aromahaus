"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }
  return (
    <button
      onClick={logout}
      className="inline-flex items-center gap-2 border border-linen-300 px-4 py-2 text-sm font-medium text-linen-700 hover:border-champagne-500 hover:text-champagne-700"
    >
      <LogOut className="h-4 w-4" /> Sair
    </button>
  );
}
