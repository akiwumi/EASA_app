const EASA_FEED_LABELS: Record<string, string> = {
  "https://www.easa.europa.eu/en/document-library/easy-access-rules/feed.xml": "Easy Access Rules",
  "https://www.easa.europa.eu/document-library/regulations/feed.xml": "Regulations",
  "https://www.easa.europa.eu/document-library/acceptable-means-of-compliance-and-guidance-materials/feed.xml": "AMC and GM",
  "https://www.easa.europa.eu/document-library/agency-decisions/feed.xml": "Agency Decisions",
  "https://www.easa.europa.eu/newsroom-and-events/news/feed.xml": "EASA News",
  "https://www.easa.europa.eu/newsroom-and-events/press-releases/feed.xml": "Press Releases",
  "https://www.easa.europa.eu/document-library/opinions/feed.xml": "Opinions",
  "https://www.easa.europa.eu/document-library/notices-of-proposed-amendment/feed.xml": "NPAs",
};

function titleCase(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

export function sourceDisplayName(url: string) {
  const known = EASA_FEED_LABELS[url];
  if (known) return known;

  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname
      .split("/")
      .filter(Boolean)
      .filter((part) => !["feed.xml", "rss", "feed"].includes(part.toLowerCase()));
    const lastMeaningfulPart = pathParts.at(-1);
    if (lastMeaningfulPart) return titleCase(lastMeaningfulPart);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
