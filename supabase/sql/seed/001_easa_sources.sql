insert into organizations (id, name)
values ('00000000-0000-4000-8000-000000000001', 'Demo Flight School')
on conflict (id) do nothing;

-- Remove old dead URLs (EASA restructured their site)
delete from sources where url in (
  'https://www.easa.europa.eu/en/rss/news',
  'https://www.easa.europa.eu/en/rss/consultations',
  'https://www.easa.europa.eu/en/rss/publications',
  'https://www.easa.europa.eu/en/newsroom-and-events/news/feed.xml',
  'https://www.easa.europa.eu/en/newsroom-and-events/press-releases/feed.xml',
  'https://www.easa.europa.eu/en/document-library/notices-of-proposed-amendment/feed.xml',
  'https://www.easa.europa.eu/en/document-library/opinions/feed.xml',
  'https://www.easa.europa.eu/en/document-library/easy-access-rules/feed.xml',
  'https://www.easa.europa.eu/en/document-library/acceptable-means-of-compliance-and-guidance-material/feed.xml'
);

-- Insert current working EASA feeds (canonical URLs, no /en/ prefix)
insert into sources (organization_id, url, type, active)
values
  (null, 'https://www.easa.europa.eu/document-library/easy-access-rules/feed.xml', 'rss', true),
  (null, 'https://www.easa.europa.eu/document-library/regulations/feed.xml', 'rss', true),
  (null, 'https://www.easa.europa.eu/document-library/acceptable-means-of-compliance-and-guidance-materials/feed.xml', 'rss', true),
  (null, 'https://www.easa.europa.eu/document-library/agency-decisions/feed.xml', 'rss', true),
  (null, 'https://www.easa.europa.eu/newsroom-and-events/news/feed.xml', 'rss', true),
  (null, 'https://www.easa.europa.eu/newsroom-and-events/press-releases/feed.xml', 'rss', true),
  (null, 'https://www.easa.europa.eu/document-library/opinions/feed.xml', 'rss', true),
  (null, 'https://www.easa.europa.eu/document-library/notices-of-proposed-amendment/feed.xml', 'rss', true)
on conflict (url) do nothing;
