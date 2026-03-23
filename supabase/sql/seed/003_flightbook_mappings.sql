-- Link flight book sections to EASA refs after sections exist (MASTER_BUILD §8)
-- Safe to re-run: skips when section numbers are missing

insert into flightbook_mappings (
  organization_id,
  flightbook_section_id,
  easa_section_ref,
  confidence,
  match_type
)
select
  fs.organization_id,
  fs.id,
  m.easa_ref,
  m.confidence,
  m.match_type
from flightbook_sections fs
join (
  values
    ('010.01', 'Part-FCL + ICAO Annex 2 / SERA', 'high', 'manual'),
    ('010.04.02', 'Part-FCL Reg (EU) 1178/2011 Annex I', 'high', 'manual'),
    ('010.04.03', 'Part-MED Reg (EU) 1178/2011 Annex IV', 'high', 'manual'),
    ('010.06', 'Part-CAT, Part-NCC, Part-NCO', 'medium', 'manual')
) as m(section_number, easa_ref, confidence, match_type)
  on m.section_number = fs.section_number
where fs.organization_id = '00000000-0000-4000-8000-000000000001'
  and not exists (
    select 1 from flightbook_mappings fm
    where fm.flightbook_section_id = fs.id
      and fm.easa_section_ref = m.easa_ref
  );
