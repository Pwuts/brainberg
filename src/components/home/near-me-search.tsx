"use client";

import { useRouter } from "next/navigation";
import { LocationFilter } from "@/components/ui/location-filter";

interface Country {
  code: string;
  name: string;
}

interface NearMeSearchProps {
  countries: Country[];
}

/**
 * Location-first entry into /events: picking a country, city, or
 * geocoded place (with radius) routes the user to /events with the
 * right filter query string, rather than filtering in place.
 */
export function NearMeSearch({ countries }: NearMeSearchProps) {
  const router = useRouter();

  function go(params: Record<string, string>) {
    const usp = new URLSearchParams(params);
    router.push(`/events?${usp.toString()}`);
  }

  return (
    <LocationFilter
      countries={countries}
      country=""
      locationName=""
      latitude=""
      longitude=""
      radius=""
      isOnline={false}
      onCountry={(code) => go({ country: code })}
      onLocation={(loc) =>
        go({ loc: loc.name, lat: loc.lat, lng: loc.lng, radius: loc.radius })
      }
      onOnline={(on) => {
        if (on) go({ online: "1" });
      }}
      onClear={() => {}}
    />
  );
}
