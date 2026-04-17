"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Calendar, Bot, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/events", label: "Events", icon: Calendar },
  { href: "/admin/scrapers", label: "Scrapers", icon: Bot },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r bg-background">
      <div className="flex h-16 items-center gap-2 border-b px-4">
        <Zap className="h-5 w-5 text-primary" />
        <span className="font-semibold">Admin</span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
