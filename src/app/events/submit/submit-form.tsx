"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { LocationPicker, type PickedLocation } from "@/components/admin/location-picker";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function SubmitForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ slug: string; status: string } | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [location, setLocation] = useState<PickedLocation | null>(null);
  const [venueName, setVenueName] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!isOnline && !location) {
      setError("Please pick a location for in-person events.");
      return;
    }

    setSubmitting(true);

    const form = new FormData(e.currentTarget);

    const body = {
      title: form.get("title") as string,
      description: form.get("description") as string,
      websiteUrl: form.get("websiteUrl") as string,
      startsAt: new Date(form.get("startsAt") as string).toISOString(),
      endsAt: form.get("endsAt")
        ? new Date(form.get("endsAt") as string).toISOString()
        : undefined,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      venueName: venueName || location?.venueName || undefined,
      venueAddress: location?.venueAddress,
      latitude: location?.latitude,
      longitude: location?.longitude,
      cityName: location?.cityName,
      countryCode: location?.countryCode,
      isOnline,
      organizerName: (form.get("organizerName") as string) || undefined,
      organizerEmail: (form.get("organizerEmail") as string) || undefined,
      turnstileToken: (form.get("cf-turnstile-response") as string) || undefined,
    };

    try {
      const res = await fetch("/api/events/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      setSuccess({ slug: data.slug, status: data.status });
    } catch {
      setError("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <Card className="mt-8">
        <CardContent className="flex flex-col items-center py-12">
          <CheckCircle className="h-12 w-12 text-green-500" />
          <h2 className="mt-4 text-xl font-semibold">Event submitted!</h2>
          <p className="mt-2 text-center text-muted-foreground">
            {success.status === "approved"
              ? "Your event has been approved and is now live."
              : "Your event is pending review. We'll publish it shortly."}
          </p>
          <div className="mt-6 flex gap-3">
            <Button onClick={() => router.push(`/events/${success.slug}`)}>
              View Event
            </Button>
            <Button variant="outline" onClick={() => { setSuccess(null); setError(null); }}>
              Submit Another
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Required fields */}
      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold">Event Details</legend>

        <div>
          <label htmlFor="title" className="mb-1 block text-sm font-medium">
            Event Title <span className="text-red-500">*</span>
          </label>
          <Input id="title" name="title" required maxLength={300} placeholder="e.g. Berlin AI Meetup #42" />
        </div>

        <div>
          <label htmlFor="websiteUrl" className="mb-1 block text-sm font-medium">
            Event Link <span className="text-red-500">*</span>
          </label>
          <Input id="websiteUrl" name="websiteUrl" type="url" required placeholder="https://..." />
          <p className="mt-1 text-xs text-muted-foreground">Link to the event page (Meetup, Eventbrite, Luma, or your own site)</p>
        </div>

        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            required
            minLength={10}
            maxLength={10000}
            rows={5}
            placeholder="What's this event about? Who is it for?"
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
      </fieldset>

      {/* Date & time */}
      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold">When</legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="startsAt" className="mb-1 block text-sm font-medium">
              Start Date & Time <span className="text-red-500">*</span>
            </label>
            <Input id="startsAt" name="startsAt" type="datetime-local" required />
          </div>
          <div>
            <label htmlFor="endsAt" className="mb-1 block text-sm font-medium">
              End Date & Time
            </label>
            <Input id="endsAt" name="endsAt" type="datetime-local" />
          </div>
        </div>
      </fieldset>

      {/* Location */}
      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold">Where</legend>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Address {!isOnline && <span className="text-red-500">*</span>}
          </label>
          <LocationPicker
            currentCity={location?.cityName ?? null}
            currentCountry={location ? { code: location.countryCode, name: "" } : null}
            currentAddress={location?.venueAddress ?? null}
            onPick={(picked) => {
              setLocation(picked);
              if (!venueName && picked.venueName) setVenueName(picked.venueName);
            }}
          />
          <p className="mt-1 text-xs text-muted-foreground">Start typing an address, venue, or city — we&apos;ll look it up.</p>
        </div>

        <div>
          <label htmlFor="venueName" className="mb-1 block text-sm font-medium">
            Venue Name
          </label>
          <Input
            id="venueName"
            name="venueName"
            value={venueName}
            onChange={(e) => setVenueName(e.target.value)}
            placeholder="e.g. Factory Berlin"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isOnline"
            checked={isOnline}
            onChange={(e) => setIsOnline(e.target.checked)}
          />
          This event is (also) online
        </label>
      </fieldset>

      {/* Organizer (optional) */}
      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold">Organizer <span className="text-sm font-normal text-muted-foreground">(optional)</span></legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="organizerName" className="mb-1 block text-sm font-medium">
              Name
            </label>
            <Input id="organizerName" name="organizerName" placeholder="Your name or org" />
          </div>
          <div>
            <label htmlFor="organizerEmail" className="mb-1 block text-sm font-medium">
              Email
            </label>
            <Input id="organizerEmail" name="organizerEmail" type="email" placeholder="contact@example.com" />
            <p className="mt-1 text-xs text-muted-foreground">Not displayed publicly — only used if we need to reach you</p>
          </div>
        </div>
      </fieldset>

      {TURNSTILE_SITE_KEY && (
        <>
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js"
            strategy="lazyOnload"
          />
          <div className="cf-turnstile" data-sitekey={TURNSTILE_SITE_KEY} />
        </>
      )}

      <Button type="submit" size="lg" disabled={submitting} className="w-full">
        {submitting ? "Submitting..." : "Submit Event"}
      </Button>
    </form>
  );
}
