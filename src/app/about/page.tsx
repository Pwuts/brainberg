import Link from "next/link";
import { Github } from "lucide-react";

export const metadata = {
  title: "About",
  description: "What Brainberg is and how to get your event agenda included.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight">About Brainberg</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Brainberg is an open-source event aggregator for the European tech scene:
        meetups, hackathons, conferences, workshops, maker events. We pull from a
        handful of mainstream platforms and community sites and merge them into one
        searchable, filterable event calendar and map.
      </p>

      <hr className="my-10 border-border" />

      <section id="why" className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Why does this exist?
          </h2>
          <p className="mt-2 text-muted-foreground">
            Having attended numerous conferences, meetups, and hackathons across Europe,
            I (Pwuts) noticed that I often had to find out about them through word of
            mouth or random Twitter posts. There were also many occasions where I found
            out about an event only after it had already happened, which left me wishing
            for a place on the internet with an up-to-date overview of all the events
            that I might be interested in.
          </p>
          <p className="mt-2 text-muted-foreground">
            As it turns out, this information vacuum is experienced by many. Not being
            aware of events near you that you&apos;d otherwise attend is a specific kind
            of unrealised/lost value. You miss out on new insights and networking
            opportunities, both of which I personally enjoy a lot.
            <br />
            To address this, I wanted to create something that makes it easier for
            people to discover tech events happening around them and across Europe,
            ensuring they&apos;ll never have to feel the pain of &quot;oh, I didn&apos;t
            know that was happening?&quot; again.
          </p>
          <p className="mt-2 text-muted-foreground">
            Now, a few days into the project, I am very excited and surprised to see how
            many events there are in the first place. I can personally see plenty of
            interesting meetups, workshops, and conferences that I wouldn&apos;t have
            known about if it wasn&apos;t for this project. I hope you have the same
            experience. :)
          </p>
        </div>
      </section>

      <hr className="my-10 border-border" />

      <section id="publish" className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Publish your events on Brainberg
          </h2>
          <p className="mt-2 text-muted-foreground">
            If your organisation or community runs a site listing events, we can pull
            them in automatically, as long as your site exposes the data in a
            machine-readable format. Any of the formats below works; pick the one that
            fits your stack.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Supported formats</h3>
          <p className="text-sm text-muted-foreground">
            We ingest from a single page per source, so whatever format you use, it has
            to surface multiple events in one place we can fetch. In decreasing order of
            preference:
          </p>
          <ol className="list-inside list-decimal space-y-3 text-sm">
            <li>
              <strong>Schema.org Microdata on a listing page.</strong> Mark each event
              card with <code className="rounded bg-muted px-1">itemscope</code> +{" "}
              <code className="rounded bg-muted px-1">
                itemtype=&quot;https://schema.org/Event&quot;
              </code>{" "}
              and add <code className="rounded bg-muted px-1">itemprop</code> on nested
              elements. Invisible{" "}
              <code className="rounded bg-muted px-1">&lt;meta content=...&gt;</code>{" "}
              tags are fine. This works well if your listing cards already render the
              data visually. Spec:{" "}
              <a
                href="https://schema.org/Event"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                schema.org/Event
              </a>
              .
            </li>
            <li>
              <strong>Schema.org JSON-LD, multiple events on one page.</strong> One or
              more{" "}
              <code className="rounded bg-muted px-1">
                &lt;script type=&quot;application/ld+json&quot;&gt;
              </code>{" "}
              blocks with <code className="rounded bg-muted px-1">@type: Event</code>{" "}
              (or a subtype like{" "}
              <code className="rounded bg-muted px-1">EducationEvent</code>) on a single
              listing or events page. Also earns your site Google event rich-result
              eligibility on any detail pages that carry the same block.
            </li>
            <li>
              <strong>Detail-page-only JSON-LD:</strong> individual event pages each
              carrying a JSON-LD block, but no listing aggregating them. This works too,
              but we&apos;ll need either a{" "}
              <code className="rounded bg-muted px-1">sitemap.xml</code>, an RSS feed,
              or a listing URL that links to each detail page so we can discover them.
              Mention what you have when you get in touch. For reference: this is the
              pattern{" "}
              <a
                href="https://dev.events"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                dev.events
              </a>{" "}
              uses.
            </li>
            <li>
              <strong>
                iCal feed (<code className="rounded bg-muted px-1">.ics</code>)
              </strong>{" "}
              at a stable URL (RFC 5545 standard). Same story: we&apos;ll configure it
              per-source when we add you.
            </li>
          </ol>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Fields we actually use</h3>
          <p className="text-sm text-muted-foreground">
            Per event, the more of these you expose the better:
          </p>
          <ul className="list-inside list-disc space-y-1 text-sm">
            <li>
              <code className="rounded bg-muted px-1">name</code> - event title
            </li>
            <li>
              <code className="rounded bg-muted px-1">description</code> - a plain-text
              or HTML description of the event
            </li>
            <li>
              <code className="rounded bg-muted px-1">startDate</code> /{" "}
              <code className="rounded bg-muted px-1">endDate</code> - ISO timestamps
              with timezone
            </li>
            <li>
              <code className="rounded bg-muted px-1">eventAttendanceMode</code> -
              online, offline, or mixed (
              <a
                href="https://schema.org/EventAttendanceModeEnumeration"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                enum reference
              </a>
              )
            </li>
            <li>
              <code className="rounded bg-muted px-1">location</code> - venue name and
              address, or <code className="rounded bg-muted px-1">geo</code> coords
            </li>
            <li>
              <code className="rounded bg-muted px-1">organizer</code> - name and URL
            </li>
            <li>
              <code className="rounded bg-muted px-1">image</code> - cover image URL
            </li>
            <li>
              <code className="rounded bg-muted px-1">url</code> - canonical detail page
            </li>
            <li>
              <code className="rounded bg-muted px-1">identifier</code> - a stable
              unique ID (UUID, database ID, slug). Helps us dedup against the same event
              from other sources.
            </li>
          </ul>
          <p className="text-sm text-muted-foreground">
            See{" "}
            <a
              href="https://schema.org/Event"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              schema.org/Event
            </a>{" "}
            for the full spec.
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Scope</h3>
          <p className="text-sm text-muted-foreground">
            Brainberg lists events for a European audience — either physically located
            in a European country or online events relevant to European attendees.
            Non-European in-person events are filtered out.
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold">How to get added</h3>
          <p className="text-sm text-muted-foreground">
            Open an issue on{" "}
            <a
              href="https://github.com/Pwuts/brainberg/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              GitHub
            </a>{" "}
            with the URL of your structured data (listing page, feed, or sample detail
            page) and we&apos;ll wire it up. If you need a hand adding JSON-LD to your
            pages, happy to help with a worked example.
          </p>
        </div>
      </section>

      <hr className="my-10 border-border" />

      <p className="text-sm text-muted-foreground">
        Source on GitHub:&ensp;
        <Link
          href="https://github.com/Pwuts/brainberg"
          className="text-primary hover:underline"
        >
          <Github className="mr-1 inline h-4 w-4 align-text-bottom" />
          Pwuts/brainberg
        </Link>
      </p>
    </div>
  );
}
