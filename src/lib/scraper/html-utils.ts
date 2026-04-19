import TurndownService from "turndown";

/** Strip HTML tags and decode common entities. */
export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

let turndown: TurndownService | null = null;

/** Convert HTML to Markdown. Output is compatible with the react-markdown
 *  renderer used for event descriptions (remark-breaks enabled). */
export function htmlToMarkdown(html: string): string {
  if (!turndown) {
    turndown = new TurndownService({
      headingStyle: "atx",
      bulletListMarker: "-",
      codeBlockStyle: "fenced",
      emDelimiter: "*",
    });
  }
  return turndown.turndown(html).replace(/\n{3,}/g, "\n\n").trim();
}

/** Truncate text to a maximum length, breaking at word boundaries. */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const ellipsis = "…";
  const budget = maxLength - ellipsis.length;
  const truncated = text.slice(0, budget);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > budget * 0.8 ? truncated.slice(0, lastSpace) : truncated) + ellipsis;
}
