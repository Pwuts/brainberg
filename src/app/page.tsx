import { Suspense } from "react";
import { getEventsByTimeGroup } from "@/lib/events";
import { EventList } from "@/components/events/event-list";
import { EventSearch } from "@/components/events/event-search";
import { Button } from "@/components/ui/button";
import { Zap, ArrowRight, Globe, Filter, Calendar } from "lucide-react";
import Link from "next/link";

export default async function HomePage() {
  const { today, thisWeek, upcoming } = await getEventsByTimeGroup();
  const totalEvents = today.length + thisWeek.length + upcoming.length;

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-b from-primary/5 to-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="text-center">
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

      {/* Features */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-10 sm:grid-cols-3 sm:px-6 lg:px-8">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">40+ Countries</h3>
              <p className="text-sm text-muted-foreground">
                Events from across all of Europe
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Filter className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Smart Filters</h3>
              <p className="text-sm text-muted-foreground">
                By category, type, size, date, and location
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
                Aggregated from multiple sources daily
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
