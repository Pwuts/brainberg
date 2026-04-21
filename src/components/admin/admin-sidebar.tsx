"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Calendar, Bot, MapPin, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/events", label: "Events", icon: Calendar },
  { href: "/admin/scrapers", label: "Scrapers", icon: Bot },
  { href: "/admin/cities", label: "Cities", icon: MapPin },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex shrink-0 flex-row border-b bg-background md:w-56 md:flex-col md:border-b-0 md:border-r">
      <div className="hidden h-16 items-center gap-2 border-b px-4 md:flex">
        <Zap className="h-5 w-5 text-primary" />
        <span className="font-semibold">Admin</span>
      </div>
      <nav className="flex flex-1 gap-1 overflow-x-auto p-2 md:flex-col md:space-y-1 md:gap-0 md:overflow-visible md:p-3">
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
                "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors md:gap-3",
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
