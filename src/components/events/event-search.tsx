"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useCallback, useRef, useEffect } from "react";
import { Search, X, ArrowRight, MapPin, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_LABELS, CATEGORY_COLORS, countryFlag } from "@/lib/utils";

interface Suggestion {
  id: string;
  title: string;
  slug: string;
  category: string;
  startsAt: string;
  cityName: string | null;
  countryCode: string | null;
}

export function EventSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(q)}&autocomplete=1`
      );
      if (res.ok) {
        const data = await res.json();
        const results = (data.suggestions ?? []).slice(0, 6);
        setSuggestions(results);
        setShowDropdown(true);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const clearQuery = useCallback(() => {
    // If we're on /events with a q param, remove it
    if (pathname === "/events" && searchParams.has("q")) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("q");
      params.delete("cursor");
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    }
  }, [router, pathname, searchParams]);

  const handleChange = (value: string) => {
    setQuery(value);
    clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      clearQuery();
      return;
    }
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 250);
  };

  const goToEvents = (q: string) => {
    setShowDropdown(false);
    // Preserve existing filters when on /events
    if (pathname === "/events") {
      const params = new URLSearchParams(searchParams.toString());
      params.set("q", q);
      params.delete("cursor");
      router.push(`${pathname}?${params.toString()}`);
    } else {
      router.push(`/events?q=${encodeURIComponent(q)}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) goToEvents(query.trim());
  };

  const handleClear = () => {
    setQuery("");
    setSuggestions([]);
    setShowDropdown(false);
    clearQuery();
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  return (
    <div ref={wrapperRef} className="relative">
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search events..."
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
          className="pl-10 pr-10"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </form>

      {/* Results dropdown */}
      {showDropdown && query.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-background shadow-lg">
          {suggestions.length > 0 ? (
            <>
              <div className="divide-y">
                {suggestions.map((s) => {
                  const catColor = CATEGORY_COLORS[s.category] ?? "bg-gray-100 text-gray-800";
                  const catLabel = CATEGORY_LABELS[s.category] ?? s.category;
                  return (
                    <button
                      key={s.id}
                      className="flex w-full flex-col gap-1 px-4 py-3 text-left hover:bg-accent transition-colors"
                      onClick={() => {
                        router.push(`/events/${s.slug}`);
                        setShowDropdown(false);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Badge className={`${catColor} text-[10px] px-1.5 py-0`}>{catLabel}</Badge>
                        <span className="font-medium text-sm truncate">{s.title}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(s.startsAt)}
                        </span>
                        {(s.cityName || s.countryCode) && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {s.cityName}
                            {s.countryCode && ` ${countryFlag(s.countryCode)}`}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              <button
                className="flex w-full items-center justify-center gap-2 border-t px-4 py-2.5 text-sm font-medium text-primary hover:bg-accent transition-colors rounded-b-lg"
                onClick={() => goToEvents(query)}
              >
                See all results
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </>
          ) : loading ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Searching...
            </div>
          ) : (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No events found for &ldquo;{query}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  );
}
