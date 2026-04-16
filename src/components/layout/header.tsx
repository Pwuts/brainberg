import Link from "next/link";
import { Zap, Search, Menu } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Zap className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold tracking-tight">TechPulse</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/events"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Browse Events
          </Link>
          <Link
            href="/map"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Map
          </Link>
          <Link
            href="/calendar"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Calendar
          </Link>
          <Link
            href="/events/submit"
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Submit Event
          </Link>
        </nav>

        {/* Mobile menu button */}
        <button className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground md:hidden">
          <Menu className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
