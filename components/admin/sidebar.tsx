"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  FolderTree,
  Newspaper,
  Images,
  Home,
  BarChart3,
  Settings,
  Ticket,
  Truck,
  Mail,
  Users,
  Boxes,
  Star,
  ShieldCheck,
  FileText,
  LogOut,
  ExternalLink,
  Menu,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BrandLockup } from "@/components/site/brand";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/produtos", label: "Produtos", icon: Package },
  { href: "/admin/estoque", label: "Estoque", icon: Boxes },
  { href: "/admin/pedidos", label: "Pedidos", icon: ShoppingBag },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/avaliacoes", label: "Avaliações", icon: Star },
  { href: "/admin/categorias", label: "Categorias", icon: FolderTree },
  { href: "/admin/cupons", label: "Cupons", icon: Ticket },
  { href: "/admin/frete", label: "Regras de frete", icon: Truck },
  { href: "/admin/blog", label: "Blog", icon: Newspaper },
  { href: "/admin/newsletter", label: "Newsletter", icon: Mail },
  { href: "/admin/paginas", label: "Páginas", icon: FileText },
  { href: "/admin/banners", label: "Banners", icon: Images },
  { href: "/admin/home", label: "Seções da Home", icon: Home },
  { href: "/admin/marketing", label: "Marketing", icon: BarChart3 },
  { href: "/admin/equipe", label: "Equipe e atividade", icon: ShieldCheck },
  { href: "/admin/config", label: "Configurações", icon: Settings },
];

export function AdminSidebar({ adminName }: { adminName?: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Trava o scroll do fundo enquanto o drawer mobile está aberto.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  const nav = (
    <>
      <div className="border-b border-white/10 p-5">
        <BrandLockup tone="light" showSignature={false} />
        <p className="mt-3 text-xs text-linen-500">Painel administrativo</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3" onClick={() => setOpen(false)}>
        {LINKS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                // Faixa dourada à esquerda em vez de bloco cheio: a lista tem
                // 17 itens e um bloco sólido brigava com o logo logo acima.
                "flex items-center gap-3 border-l-2 py-2 pl-3 pr-3 text-sm transition-colors",
                active
                  ? "border-champagne-500 bg-white/[0.07] text-champagne-300"
                  : "border-transparent text-linen-300 hover:bg-white/5 hover:text-linen-50",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-white/10 p-3">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-linen-300 hover:bg-white/5 hover:text-linen-50"
        >
          <ExternalLink className="h-4 w-4 shrink-0" />
          Ver loja
        </Link>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-linen-300 hover:bg-white/5 hover:text-linen-50"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sair {adminName ? `(${adminName})` : ""}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Top bar mobile */}
      <div className="surface-ink sticky top-0 z-40 flex items-center justify-between border-b border-white/10 px-4 py-3 text-linen-50 lg:hidden">
        <BrandLockup tone="light" showSignature={false} />
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          className="rounded-lg p-2 hover:bg-linen-50/10"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Drawer mobile */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <aside
            className="surface-ink absolute left-0 top-0 flex h-full w-64 max-w-[85%] flex-col text-linen-300"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              aria-label="Fechar menu"
              className="absolute right-3 top-3 rounded-lg p-1.5 text-linen-500 hover:bg-linen-50/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            {nav}
          </aside>
        </div>
      )}

      {/* Sidebar desktop */}
      <aside className="surface-ink hidden w-60 shrink-0 flex-col text-linen-300 lg:flex">
        {nav}
      </aside>
    </>
  );
}
