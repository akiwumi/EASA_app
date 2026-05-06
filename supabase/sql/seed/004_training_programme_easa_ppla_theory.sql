insert into organizations (id, name)
values ('00000000-0000-4000-8000-000000000001', 'Demo Flight School')
on conflict (id) do nothing;

with target_org as (
  select id
  from organizations
  where id = '00000000-0000-4000-8000-000000000001'
),
programme_insert as (
  insert into training_programmes (
    organization_id,
    code,
    name,
    description,
    active
  )
  select
    o.id,
    'EASA-PPLA-THEORY',
    'EASA PPL(A) Theory',
    'Starter theory training programme based on the repository PPL appendix materials. Intended for flight-school onboarding, assignments, acknowledgements, and sign-offs.',
    true
  from target_org o
  where not exists (
    select 1
    from training_programmes p
    where p.organization_id = o.id
      and p.code = 'EASA-PPLA-THEORY'
  )
  returning id, organization_id
),
programme_target as (
  select id, organization_id
  from programme_insert
  union all
  select p.id, p.organization_id
  from training_programmes p
  join target_org o on o.id = p.organization_id
  where p.code = 'EASA-PPLA-THEORY'
),
phase_seed as (
  select *
  from (
    values
      (10, 'Regulatory and Technical Foundations', 'Air law, aircraft knowledge, instrumentation, and human performance.'),
      (20, 'Planning, Performance, and Operating Environment', 'Mass and balance, performance, planning, navigation, weather, and operational procedures.'),
      (30, 'Flight Principles and Communications', 'Principles of flight, VFR communications, and final theory consolidation.')
  ) as v(sort_order, title, description)
)
insert into training_phases (
  organization_id,
  programme_id,
  title,
  description,
  sort_order,
  active
)
select
  pt.organization_id,
  pt.id,
  ps.title,
  ps.description,
  ps.sort_order,
  true
from programme_target pt
cross join phase_seed ps
where not exists (
  select 1
  from training_phases ph
  where ph.programme_id = pt.id
    and ph.title = ps.title
);

with target_org as (
  select id
  from organizations
  where id = '00000000-0000-4000-8000-000000000001'
),
programme_target as (
  select p.id, p.organization_id
  from training_programmes p
  join target_org o on o.id = p.organization_id
  where p.code = 'EASA-PPLA-THEORY'
),
phase_target as (
  select
    ph.id,
    ph.programme_id,
    ph.organization_id,
    ph.title
  from training_phases ph
  join programme_target pt on pt.id = ph.programme_id
),
lesson_seed as (
  select *
  from (
    values
      ('Regulatory and Technical Foundations', 10, 'ALW-01', 'Air Law and ATC Procedures - Lesson 1', '3 planned hours. International law, ICAO, Annex 8, Annex 7, Annex 1, and licensing foundations.', 'ground'),
      ('Regulatory and Technical Foundations', 20, 'ALW-02', 'Air Law and ATC Procedures - Lesson 2', '3 planned hours. Rules of the air, PANS-OPS basics, altimeter setting, transponders, and phraseology.', 'ground'),
      ('Regulatory and Technical Foundations', 30, 'ALW-03', 'Air Law and ATC Procedures - Lesson 3', '3 planned hours. ATS services, airspace, VFR operations, and ATC procedures.', 'ground'),
      ('Regulatory and Technical Foundations', 40, 'ALW-04', 'Air Law and ATC Procedures - Lesson 4', '3 planned hours. National procedures, operational application, and exam preparation.', 'ground'),
      ('Regulatory and Technical Foundations', 50, 'AGK-01', 'Aircraft General Knowledge - Lesson 1', '3 planned hours. Airframe, engines, systems, and aircraft technical fundamentals.', 'ground'),
      ('Regulatory and Technical Foundations', 60, 'AGK-02', 'Aircraft General Knowledge - Lesson 2', '3 planned hours. Powerplant operation, systems use, and operational limitations.', 'ground'),
      ('Regulatory and Technical Foundations', 70, 'AGKI-01', 'Aircraft General Knowledge Instrumentation - Lesson 1', '4 planned hours. Core flight instruments, pitot-static concepts, gyros, and instrumentation interpretation.', 'ground'),
      ('Regulatory and Technical Foundations', 80, 'HPL-01', 'Human Performance and Limitations - Lesson 1', '3 planned hours. Physiology, perception, workload, and human factors basics.', 'ground'),
      ('Regulatory and Technical Foundations', 90, 'HPL-02', 'Human Performance and Limitations - Lesson 2', '3 planned hours. Decision-making, stress, fatigue, TEM awareness, and fitness to fly.', 'ground'),
      ('Planning, Performance, and Operating Environment', 100, 'MB-01', 'Mass and Balance - Lesson 1', '4 planned hours. Weight terminology, centre of gravity, loading, and practical calculations.', 'ground'),
      ('Planning, Performance, and Operating Environment', 110, 'PER-01', 'Flight Performance - Lesson 1', '4 planned hours. Performance terminology, runway effects, climb, and cruise considerations.', 'ground'),
      ('Planning, Performance, and Operating Environment', 120, 'PER-02', 'Flight Performance - Lesson 2', '4 planned hours. Performance planning, charts, limitations, and operational application.', 'ground'),
      ('Planning, Performance, and Operating Environment', 130, 'FPL-01', 'Flight Planning - Lesson 1', '4 planned hours. Navigation logs, charts, fuel planning, and flight preparation fundamentals.', 'ground'),
      ('Planning, Performance, and Operating Environment', 140, 'FPL-02', 'Flight Planning - Lesson 2', '4 planned hours. Diversion planning, operational planning workflow, and practical exercises.', 'ground'),
      ('Planning, Performance, and Operating Environment', 150, 'MET-01', 'Meteorology - Lesson 1', '4 planned hours. Atmosphere structure, temperature, pressure, and wind basics.', 'ground'),
      ('Planning, Performance, and Operating Environment', 160, 'MET-02', 'Meteorology - Lesson 2', '4 planned hours. Moisture, clouds, precipitation, fronts, and weather systems.', 'ground'),
      ('Planning, Performance, and Operating Environment', 170, 'MET-03', 'Meteorology - Lesson 3', '4 planned hours. Local weather, hazards, icing, turbulence, and operational interpretation.', 'ground'),
      ('Planning, Performance, and Operating Environment', 180, 'MET-04', 'Meteorology - Lesson 4', '4 planned hours. Aviation weather products, briefing use, and exam review.', 'ground'),
      ('Planning, Performance, and Operating Environment', 190, 'GNAV-01', 'General Navigation - Lesson 1', '4 planned hours. Earth model, charts, tracks, bearings, time, and distance.', 'ground'),
      ('Planning, Performance, and Operating Environment', 200, 'GNAV-02', 'General Navigation - Lesson 2', '4 planned hours. Dead reckoning, wind correction, practical navigation planning, and calculation drills.', 'ground'),
      ('Planning, Performance, and Operating Environment', 210, 'RNAV-01', 'Radio Navigation - Lesson 1', '3 planned hours. Radio aid principles, frequencies, and basic radio navigation concepts.', 'ground'),
      ('Planning, Performance, and Operating Environment', 220, 'RNAV-02', 'Radio Navigation - Lesson 2', '3 planned hours. VOR, ADF, GNSS awareness, and operational interpretation.', 'ground'),
      ('Planning, Performance, and Operating Environment', 230, 'OPP-01', 'Operational Procedures - Lesson 1', '3 planned hours. Operational procedures, emergency concepts, and safety-oriented procedures.', 'ground'),
      ('Planning, Performance, and Operating Environment', 240, 'OPP-02', 'Operational Procedures - Lesson 2', '3 planned hours. Operational documentation, abnormal operations, and compliance-oriented practice.', 'ground'),
      ('Flight Principles and Communications', 250, 'POF-01', 'Principles of Flight - Lesson 1', '3 planned hours. Basic aerodynamics, forces, and lift generation.', 'ground'),
      ('Flight Principles and Communications', 260, 'POF-02', 'Principles of Flight - Lesson 2', '3 planned hours. Stability, control, drag, and aircraft handling concepts.', 'ground'),
      ('Flight Principles and Communications', 270, 'POF-03', 'Principles of Flight - Lesson 3', '3 planned hours. Flight phases, manoeuvre effects, and aerodynamic limitations.', 'ground'),
      ('Flight Principles and Communications', 280, 'POF-04', 'Principles of Flight - Lesson 4', '4 planned hours. Applied flight principles, performance links, and theory consolidation.', 'ground'),
      ('Flight Principles and Communications', 290, 'COM-01', 'VFR Communications - Lesson 1', '3 planned hours. Standard VFR phraseology, readback, and radio communication practice.', 'ground')
  ) as v(phase_title, sort_order, lesson_code, title, description, lesson_type)
)
insert into training_lessons (
  organization_id,
  programme_id,
  phase_id,
  lesson_code,
  title,
  description,
  lesson_type,
  sort_order,
  active
)
select
  pt.organization_id,
  pt.programme_id,
  pt.id,
  ls.lesson_code,
  ls.title,
  ls.description,
  ls.lesson_type,
  ls.sort_order,
  true
from phase_target pt
join lesson_seed ls on ls.phase_title = pt.title
where not exists (
  select 1
  from training_lessons tl
  where tl.programme_id = pt.programme_id
    and tl.lesson_code = ls.lesson_code
);
