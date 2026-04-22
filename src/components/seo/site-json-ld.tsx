import { SITE_NAME, SITE_URL } from "@/lib/metadata";

const GITHUB_URL = "https://github.com/Pwuts/brainberg";

const ORGANIZATION = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/apple-icon`,
  sameAs: [GITHUB_URL],
};

const WEBSITE = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/events?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export function SiteJsonLD() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE) }}
      />
    </>
  );
}
