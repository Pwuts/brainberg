import { AdminAuthProvider } from "@/components/admin/admin-auth-provider";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export const metadata = {
  title: "Admin | Brainberg",
  robots: "noindex",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthProvider>
      <div className="flex h-[calc(100vh-4rem)]">
        <AdminSidebar />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </AdminAuthProvider>
  );
}
