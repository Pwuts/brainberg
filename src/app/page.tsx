import { Suspense } from "react";
import { db } from "@/lib/db";
import { events, cities } from "@/lib/db/schema";
import { eq, gte, lte, and, count, countDistinct } from "drizzle-orm";
import { getEventsByTimeGroup } from "@/lib/events";
import { EventList } from "@/components/events/event-list";
import { EventSearch } from "@/components/events/event-search";
import { CategoryBubbles } from "@/components/home/category-bubbles";
import { Button } from "@/components/ui/button";
import { Zap, ArrowRight, Globe, MapPin, Calendar } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const threeMonths = new Date();
  threeMonths.setMonth(threeMonths.getMonth() + 3);

  const [groups, [statsRow], [cityCountRow]] = await Promise.all([
    getEventsByTimeGroup(),
    db
      .select({ count: count() })
      .from(events)
      .where(
        and(
          eq(events.status, "approved"),
          gte(events.startsAt, new Date()),
          lte(events.startsAt, threeMonths),
        ),
      ),
    db
      .select({ count: countDistinct(cities.id) })
      .from(cities),
  ]);

  const eventsNext3m = statsRow?.count ?? 0;
  const cityCount = cityCountRow?.count ?? 0;

  // Cap to ~30 items (10 rows × 3 columns) across all groups
  const maxItems = 30;
  let remaining = maxItems;
  const today = groups.today.slice(0, remaining);
  remaining -= today.length;
  const thisWeek = groups.thisWeek.slice(0, remaining);
  remaining -= thisWeek.length;
  const upcoming = groups.upcoming.slice(0, remaining);
  const totalEvents = groups.today.length + groups.thisWeek.length + groups.upcoming.length;

  return (
    <div>
      {/* Hero */}
      <section className="relative border-b border-border bg-gradient-to-b from-primary/5 to-background overflow-hidden min-h-[600px] sm:min-h-[700px]">
        {/* Background bubbles — clickable, positioned around center content */}
        <div className="absolute inset-0">
          <Suspense>
            <CategoryBubbles />
          </Suspense>
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8 pointer-events-none">
          <div className="mx-auto max-w-2xl text-center *:pointer-events-auto">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              <Zap className="h-3.5 w-3.5" />
              {totalEvents} upcoming events across Europe
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Discover Tech Events
              <span className="block text-primary">Across Europe</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Find AI meetups, startup conferences, hackathons, and more. Filter
              by country, category, size, and date.
            </p>

            <div className="mx-auto mt-8 max-w-xl">
              <Suspense>
                <EventSearch />
              </Suspense>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link href="/events">
                <Button>
                  Browse All Events
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/map">
                <Button variant="outline">
                  <Globe className="mr-2 h-4 w-4" />
                  Map View
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-10 sm:grid-cols-3 sm:px-6 lg:px-8">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{eventsNext3m} events</h3>
              <p className="text-sm text-muted-foreground">
                in the next 3 months
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">In {cityCount} cities cross Europe</h3>
              <p className="text-sm text-muted-foreground">
                ... and counting
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Always Fresh</h3>
              <p className="text-sm text-muted-foreground">
                aggregated from multiple sources daily
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Event Listings */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-10">
          <EventList title="🔴 Today" events={today} />
          <EventList title="📅 This Week" events={thisWeek} />
          <EventList title="🚀 Upcoming" events={upcoming} />

          {totalEvents === 0 && (
            <div className="rounded-lg border border-dashed border-border py-16 text-center">
              <p className="text-lg text-muted-foreground">
                No upcoming events yet.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Be the first to{" "}
                <Link
                  href="/events/submit"
                  className="text-primary hover:underline"
                >
                  submit an event
                </Link>
                !
              </p>
            </div>
          )}
        </div>

        {totalEvents > 0 && (
          <div className="mt-10 text-center">
            <Link href="/events">
              <Button variant="outline" size="lg">
                View All Events
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
