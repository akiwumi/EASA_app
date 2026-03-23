-- HTML regulation landing pages for pipeline (MASTER_BUILD §8 seed 002)
-- Uses demo org from 001_easa_sources.sql

insert into sources (organization_id, url, type, active)
values
  ('00000000-0000-4000-8000-000000000001', 'https://www.easa.europa.eu/en/document-library/regulations/easy-access-rules/easy-access-rules-aircrew-regulation-eu-no-11782011-part-fcl', 'html', true),
  ('00000000-0000-4000-8000-000000000001', 'https://www.easa.europa.eu/en/document-library/regulations/easy-access-rules/easy-access-rules-aircrew-regulation-eu-no-11782011-part-med', 'html', true),
  ('00000000-0000-4000-8000-000000000001', 'https://www.easa.europa.eu/en/document-library/regulations/easy-access-rules/easy-access-rules-part-ora', 'html', true),
  ('00000000-0000-4000-8000-000000000001', 'https://www.easa.europa.eu/en/document-library/regulations/easy-access-rules/easy-access-rules-part-dto', 'html', true),
  ('00000000-0000-4000-8000-000000000001', 'https://www.easa.europa.eu/en/document-library/regulations/easy-access-rules/easy-access-rules-part-oro', 'html', true),
  ('00000000-0000-4000-8000-000000000001', 'https://www.easa.europa.eu/en/document-library/regulations/easy-access-rules/easy-access-rules-part-cat', 'html', true),
  ('00000000-0000-4000-8000-000000000001', 'https://www.easa.europa.eu/en/document-library/regulations/easy-access-rules/easy-access-rules-part-ncc', 'html', true),
  ('00000000-0000-4000-8000-000000000001', 'https://www.easa.europa.eu/en/document-library/regulations/easy-access-rules/easy-access-rules-part-nco', 'html', true),
  ('00000000-0000-4000-8000-000000000001', 'https://www.easa.europa.eu/en/document-library/regulations/easy-access-rules/easy-access-rules-part-spa', 'html', true),
  ('00000000-0000-4000-8000-000000000001', 'https://www.easa.europa.eu/en/document-library/certification-specifications/cs-fstda-aeroplanes-issue-2-amendment-1', 'html', true),
  ('00000000-0000-4000-8000-000000000001', 'https://www.easa.europa.eu/en/document-library/certification-specifications/cs-ftl1-issue-1-amendment-1', 'html', true)
on conflict (url) do nothing;
