"use client";

import { useEffect, useRef, useState } from "react";
import { Share2, Copy, Check, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShareEventProps {
  url: string;
  title: string;
  /** Short context to add to the share text (e.g. "Thu 15 May · Amsterdam"). */
  subtitle?: string;
}

/**
 * Share button for event detail pages. On devices with the Web Share API
 * (most mobile browsers) it hands off to the native share sheet. Otherwise
 * it opens a small popover with per-destination share URLs.
 */
export function ShareEvent({ url, title, subtitle }: ShareEventProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hasWebShare, setHasWebShare] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHasWebShare(
      typeof navigator !== "undefined" && typeof navigator.share === "function",
    );
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const shareText = subtitle ? `${title} — ${subtitle}` : title;

  const handlePrimaryClick = async () => {
    if (hasWebShare) {
      try {
        await navigator.share({ title, text: shareText, url });
        return;
      } catch {
        // Either dismissed or unsupported in this context — fall through
        // to the popover.
      }
    }
    setOpen((v) => !v);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard API unavailable — no-op; user can still use other destinations.
    }
  };

  const encoded = {
    url: encodeURIComponent(url),
    text: encodeURIComponent(shareText),
    title: encodeURIComponent(title),
    textWithUrl: encodeURIComponent(`${shareText} ${url}`),
  };

  const destinations: Array<{
    label: string;
    href: string;
    icon: React.ReactNode;
  }> = [
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${encoded.textWithUrl}`,
      icon: <WhatsAppIcon />,
    },
    {
      label: "X (Twitter)",
      href: `https://twitter.com/intent/tweet?text=${encoded.text}&url=${encoded.url}`,
      icon: <XIcon />,
    },
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded.url}`,
      icon: <LinkedInIcon />,
    },
    {
      label: "Bluesky",
      href: `https://bsky.app/intent/compose?text=${encoded.textWithUrl}`,
      icon: <BlueskyIcon />,
    },
    {
      label: "Email",
      href: `mailto:?subject=${encoded.title}&body=${encoded.textWithUrl}`,
      icon: <Mail className="h-4 w-4" />,
    },
  ];

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="outline"
        onClick={handlePrimaryClick}
        aria-label="Share event"
        aria-expanded={open}
      >
        <Share2 className="mr-2 h-4 w-4" />
        Share
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-border bg-background p-1 shadow-lg"
        >
          <button
            type="button"
            onClick={copyLink}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            <span>{copied ? "Copied!" : "Copy link"}</span>
          </button>
          <div className="my-1 border-t border-border" />
          {destinations.map((d) => (
            <a
              key={d.label}
              href={d.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
            >
              <span className="flex h-4 w-4 items-center justify-center">
                {d.icon}
              </span>
              <span>{d.label}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Inline SVG icons for services lucide-react doesn't cover
// ============================================================

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function BlueskyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.911.58-7.386 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.739-7.078a8.741 8.741 0 01-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8z" />
    </svg>
  );
}
