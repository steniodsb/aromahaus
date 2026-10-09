import { requireAdmin } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/sidebar";

export const metadata = {
  title: "Admin",
  robots: { index: false },
};

export default async function AdminPanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { profile } = await requireAdmin();

  return (
    <div className="min-h-screen bg-linen-100 lg:flex">
      <AdminSidebar adminName={profile?.full_name} />
      <div className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-6xl p-4 sm:p-7">{children}</div>
      </div>
    </div>
  );
}
