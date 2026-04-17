"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { EventCard } from "./event-card";

interface EventRow {
  event: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    startsAt: string;
    endsAt: string | null;
    timezone: string;
    category: string;
    eventType: string;
    size: string | null;
    isFree: boolean;
    isOnline: boolean;
    websiteUrl: string | null;
    imageUrl: string | null;
  };
  city: { name: string; slug: string } | null;
  country: { name: string; code: string } | null;
}

interface InitialData {
  events: EventRow[];
  nextCursor: string | null;
}

export function InfiniteEventGrid({ initial }: { initial: InitialData }) {
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<EventRow[]>(initial.events);
  const [cursor, setCursor] = useState<string | null>(initial.nextCursor);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset when filters change (URL params change)
  const filterKey = searchParams.toString();
  const prevFilterKey = useRef(filterKey);
  useEffect(() => {
    if (filterKey !== prevFilterKey.current) {
      prevFilterKey.current = filterKey;
      setEvents(initial.events);
      setCursor(initial.nextCursor);
    }
  }, [filterKey, initial]);

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const params = new URLSearchParams(searchParams.toString());
      params.set("cursor", cursor);
      params.set("limit", "30");
      const res = await fetch(`/api/events?${params.toString()}`);
      const data = await res.json();
      setEvents((prev) => [...prev, ...(data.events ?? [])]);
      setCursor(data.nextCursor ?? null);
    } catch (err) {
      console.error("Failed to load more events:", err);
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, searchParams]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !cursor) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "400px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [cursor, loadMore]);

  if (events.length === 0) {
    return (
      <div className="col-span-full rounded-lg border border-dashed border-border py-16 text-center">
        <p className="text-lg text-muted-foreground">
          No events match your filters.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Try adjusting your filters or{" "}
          <Link href="/events" className="text-primary hover:underline">
            clear all
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((row) => (
          <EventCard
            key={row.event.id}
            event={{
              ...row.event,
              startsAt: new Date(row.event.startsAt),
              endsAt: row.event.endsAt ? new Date(row.event.endsAt) : null,
            }}
            city={row.city}
            country={row.country}
          />
        ))}
      </div>

      {/* Scroll sentinel */}
      {cursor && (
        <div ref={sentinelRef} className="mt-8 flex justify-center">
          {loading && (
            <p className="text-sm text-muted-foreground">Loading more...</p>
          )}
        </div>
      )}
    </>
  );
}
