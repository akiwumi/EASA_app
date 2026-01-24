insert into organizations (id, name)
values ('00000000-0000-4000-8000-000000000001', 'Demo Flight School')
on conflict (id) do nothing;

insert into sources (organization_id, url, type, active)
values
  ('00000000-0000-4000-8000-000000000001', 'https://www.easa.europa.eu/en/rss/news', 'rss', true),
  ('00000000-0000-4000-8000-000000000001', 'https://www.easa.europa.eu/en/rss/consultations', 'rss', true),
  ('00000000-0000-4000-8000-000000000001', 'https://www.easa.europa.eu/en/rss/publications', 'rss', true)
on conflict (url) do nothing;
