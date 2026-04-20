import { Suspense } from "react";
import { AdminAuthProvider } from "@/components/admin/admin-auth-provider";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export const metadata = {
  title: "Admin",
  robots: "noindex",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthProvider>
      <div className="flex flex-col md:h-[calc(100vh-4rem)] md:flex-row">
        <AdminSidebar />
        <main className="flex-1 p-4 md:overflow-auto md:p-6">
          <Suspense>{children}</Suspense>
        </main>
      </div>
    </AdminAuthProvider>
  );
}
