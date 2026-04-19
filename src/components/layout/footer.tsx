"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap } from "lucide-react";

export function Footer() {
  const pathname = usePathname();
  // Map view is a full-viewport canvas; the footer would force page scroll
  // and reveal it under the bottom drawer.
  if (pathname === "/map") return null;

  return (
    <footer className="border-t border-border bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <span className="font-bold">Brainberg</span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              Discover AI &amp; tech events across Europe. Never miss the next
              big meetup, conference, or hackathon.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Explore</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link href="/events" className="hover:text-foreground">All Events</Link></li>
              <li><Link href="/map" className="hover:text-foreground">Map View</Link></li>
              <li><Link href="/calendar" className="hover:text-foreground">Calendar</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Categories</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link href="/events?category=ai_applied" className="hover:text-foreground">AI Integration & Application</Link></li>
              <li><Link href="/events?category=entrepreneurship" className="hover:text-foreground">Entrepreneurship</Link></li>
              <li><Link href="/events?category=design_ux" className="hover:text-foreground">Design & UX</Link></li>
              <li><Link href="/events?type=hackathon" className="hover:text-foreground">Hackathons</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Community</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link href="/events/submit" className="hover:text-foreground">Submit Event</Link></li>
              <li><Link href="https://github.com/Pwuts/brainberg" className="hover:text-foreground" target="_blank" rel="noopener noreferrer">GitHub</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Brainberg, by Reinier van der Leer (Pwuts). Open source under MIT.
        </div>
      </div>
    </footer>
  );
}
