insert into organizations (id, name)
values ('00000000-0000-4000-8000-000000000001', 'Demo Flight School')
on conflict (id) do nothing;

-- Remove old dead URLs (EASA restructured their site)
delete from sources where url in (
  'https://www.easa.europa.eu/en/rss/news',
  'https://www.easa.europa.eu/en/rss/consultations',
  'https://www.easa.europa.eu/en/rss/publications'
);

-- Insert current working EASA feeds
insert into sources (organization_id, url, type, active)
values
  ('00000000-0000-4000-8000-000000000001', 'https://www.easa.europa.eu/en/newsroom-and-events/news/feed.xml', 'rss', true),
  ('00000000-0000-4000-8000-000000000001', 'https://www.easa.europa.eu/en/newsroom-and-events/press-releases/feed.xml', 'rss', true),
  ('00000000-0000-4000-8000-000000000001', 'https://www.easa.europa.eu/en/document-library/notices-of-proposed-amendment/feed.xml', 'rss', true),
  ('00000000-0000-4000-8000-000000000001', 'https://www.easa.europa.eu/en/document-library/opinions/feed.xml', 'rss', true),
  ('00000000-0000-4000-8000-000000000001', 'https://www.easa.europa.eu/en/document-library/easy-access-rules/feed.xml', 'rss', true),
  ('00000000-0000-4000-8000-000000000001', 'https://www.easa.europa.eu/en/document-library/acceptable-means-of-compliance-and-guidance-material/feed.xml', 'rss', true)
on conflict (url) do nothing;
