import fs from "fs";
import path from "path";

const root = process.cwd();
const envPath = [".env.local", ".env"]
  .map((file) => path.join(root, file))
  .find((file) => fs.existsSync(file));

if (!envPath) {
  throw new Error("No .env.local or .env file found.");
}

function readEnv(filePath) {
  const env = {};
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const env = readEnv(envPath);
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase URL or service role key in env file.");
}

const organizationId = "00000000-0000-4000-8000-000000000001";
const programmeCode = "EASA-PPLA-THEORY";

const phases = [
  {
    sort_order: 10,
    title: "Regulatory and Technical Foundations",
    description:
      "Air law, aircraft knowledge, instrumentation, and human performance.",
  },
  {
    sort_order: 20,
    title: "Planning, Performance, and Operating Environment",
    description:
      "Mass and balance, performance, planning, navigation, weather, and operational procedures.",
  },
  {
    sort_order: 30,
    title: "Flight Principles and Communications",
    description:
      "Principles of flight, VFR communications, and final theory consolidation.",
  },
];

const lessons = [
  ["Regulatory and Technical Foundations", 10, "ALW-01", "Air Law and ATC Procedures - Lesson 1", "3 planned hours. International law, ICAO, Annex 8, Annex 7, Annex 1, and licensing foundations."],
  ["Regulatory and Technical Foundations", 20, "ALW-02", "Air Law and ATC Procedures - Lesson 2", "3 planned hours. Rules of the air, PANS-OPS basics, altimeter setting, transponders, and phraseology."],
  ["Regulatory and Technical Foundations", 30, "ALW-03", "Air Law and ATC Procedures - Lesson 3", "3 planned hours. ATS services, airspace, VFR operations, and ATC procedures."],
  ["Regulatory and Technical Foundations", 40, "ALW-04", "Air Law and ATC Procedures - Lesson 4", "3 planned hours. National procedures, operational application, and exam preparation."],
  ["Regulatory and Technical Foundations", 50, "AGK-01", "Aircraft General Knowledge - Lesson 1", "3 planned hours. Airframe, engines, systems, and aircraft technical fundamentals."],
  ["Regulatory and Technical Foundations", 60, "AGK-02", "Aircraft General Knowledge - Lesson 2", "3 planned hours. Powerplant operation, systems use, and operational limitations."],
  ["Regulatory and Technical Foundations", 70, "AGKI-01", "Aircraft General Knowledge Instrumentation - Lesson 1", "4 planned hours. Core flight instruments, pitot-static concepts, gyros, and instrumentation interpretation."],
  ["Regulatory and Technical Foundations", 80, "HPL-01", "Human Performance and Limitations - Lesson 1", "3 planned hours. Physiology, perception, workload, and human factors basics."],
  ["Regulatory and Technical Foundations", 90, "HPL-02", "Human Performance and Limitations - Lesson 2", "3 planned hours. Decision-making, stress, fatigue, TEM awareness, and fitness to fly."],
  ["Planning, Performance, and Operating Environment", 100, "MB-01", "Mass and Balance - Lesson 1", "4 planned hours. Weight terminology, centre of gravity, loading, and practical calculations."],
  ["Planning, Performance, and Operating Environment", 110, "PER-01", "Flight Performance - Lesson 1", "4 planned hours. Performance terminology, runway effects, climb, and cruise considerations."],
  ["Planning, Performance, and Operating Environment", 120, "PER-02", "Flight Performance - Lesson 2", "4 planned hours. Performance planning, charts, limitations, and operational application."],
  ["Planning, Performance, and Operating Environment", 130, "FPL-01", "Flight Planning - Lesson 1", "4 planned hours. Navigation logs, charts, fuel planning, and flight preparation fundamentals."],
  ["Planning, Performance, and Operating Environment", 140, "FPL-02", "Flight Planning - Lesson 2", "4 planned hours. Diversion planning, operational planning workflow, and practical exercises."],
  ["Planning, Performance, and Operating Environment", 150, "MET-01", "Meteorology - Lesson 1", "4 planned hours. Atmosphere structure, temperature, pressure, and wind basics."],
  ["Planning, Performance, and Operating Environment", 160, "MET-02", "Meteorology - Lesson 2", "4 planned hours. Moisture, clouds, precipitation, fronts, and weather systems."],
  ["Planning, Performance, and Operating Environment", 170, "MET-03", "Meteorology - Lesson 3", "4 planned hours. Local weather, hazards, icing, turbulence, and operational interpretation."],
  ["Planning, Performance, and Operating Environment", 180, "MET-04", "Meteorology - Lesson 4", "4 planned hours. Aviation weather products, briefing use, and exam review."],
  ["Planning, Performance, and Operating Environment", 190, "GNAV-01", "General Navigation - Lesson 1", "4 planned hours. Earth model, charts, tracks, bearings, time, and distance."],
  ["Planning, Performance, and Operating Environment", 200, "GNAV-02", "General Navigation - Lesson 2", "4 planned hours. Dead reckoning, wind correction, practical navigation planning, and calculation drills."],
  ["Planning, Performance, and Operating Environment", 210, "RNAV-01", "Radio Navigation - Lesson 1", "3 planned hours. Radio aid principles, frequencies, and basic radio navigation concepts."],
  ["Planning, Performance, and Operating Environment", 220, "RNAV-02", "Radio Navigation - Lesson 2", "3 planned hours. VOR, ADF, GNSS awareness, and operational interpretation."],
  ["Planning, Performance, and Operating Environment", 230, "OPP-01", "Operational Procedures - Lesson 1", "3 planned hours. Operational procedures, emergency concepts, and safety-oriented procedures."],
  ["Planning, Performance, and Operating Environment", 240, "OPP-02", "Operational Procedures - Lesson 2", "3 planned hours. Operational documentation, abnormal operations, and compliance-oriented practice."],
  ["Flight Principles and Communications", 250, "POF-01", "Principles of Flight - Lesson 1", "3 planned hours. Basic aerodynamics, forces, and lift generation."],
  ["Flight Principles and Communications", 260, "POF-02", "Principles of Flight - Lesson 2", "3 planned hours. Stability, control, drag, and aircraft handling concepts."],
  ["Flight Principles and Communications", 270, "POF-03", "Principles of Flight - Lesson 3", "3 planned hours. Flight phases, manoeuvre effects, and aerodynamic limitations."],
  ["Flight Principles and Communications", 280, "POF-04", "Principles of Flight - Lesson 4", "4 planned hours. Applied flight principles, performance links, and theory consolidation."],
  ["Flight Principles and Communications", 290, "COM-01", "VFR Communications - Lesson 1", "3 planned hours. Standard VFR phraseology, readback, and radio communication practice."],
];

async function request(method, resource, { query = {}, body } = {}) {
  const url = new URL(`/rest/v1/${resource}`, supabaseUrl);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    method,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: body ? "return=representation" : "return=minimal",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(`${method} ${resource} failed: ${response.status} ${text}`);
  }

  return data;
}

async function ensureOrganization() {
  const existing = await request("GET", "organizations", {
    query: {
      select: "id",
      id: `eq.${organizationId}`,
      limit: "1",
    },
  });

  if (existing.length) return existing[0];

  const inserted = await request("POST", "organizations", {
    body: [{ id: organizationId, name: "Demo Flight School" }],
  });

  return inserted[0];
}

async function ensureProgramme() {
  const existing = await request("GET", "training_programmes", {
    query: {
      select: "id,organization_id,code,name",
      organization_id: `eq.${organizationId}`,
      code: `eq.${programmeCode}`,
      limit: "1",
    },
  });

  if (existing.length) return { record: existing[0], created: false };

  const inserted = await request("POST", "training_programmes", {
    body: [
      {
        organization_id: organizationId,
        code: programmeCode,
        name: "EASA PPL(A) Theory",
        description:
          "Starter theory training programme based on the repository PPL appendix materials. Intended for flight-school onboarding, assignments, acknowledgements, and sign-offs.",
        active: true,
      },
    ],
  });

  return { record: inserted[0], created: true };
}

async function ensurePhases(programmeId) {
  const existing = await request("GET", "training_phases", {
    query: {
      select: "id,title,sort_order",
      programme_id: `eq.${programmeId}`,
      order: "sort_order.asc",
    },
  });

  const byTitle = new Map(existing.map((row) => [row.title, row]));
  const created = [];

  for (const phase of phases) {
    if (byTitle.has(phase.title)) continue;

    const inserted = await request("POST", "training_phases", {
      body: [
        {
          organization_id: organizationId,
          programme_id: programmeId,
          title: phase.title,
          description: phase.description,
          sort_order: phase.sort_order,
          active: true,
        },
      ],
    });

    byTitle.set(phase.title, inserted[0]);
    created.push(phase.title);
  }

  return {
    byTitle,
    existingCount: existing.length,
    created,
  };
}

async function ensureLessons(programmeId, phaseMap) {
  const existing = await request("GET", "training_lessons", {
    query: {
      select: "id,lesson_code",
      programme_id: `eq.${programmeId}`,
    },
  });

  const existingCodes = new Set(existing.map((row) => row.lesson_code));
  let created = 0;

  for (const [phaseTitle, sortOrder, lessonCode, title, description] of lessons) {
    if (existingCodes.has(lessonCode)) continue;

    const phase = phaseMap.get(phaseTitle);
    if (!phase) {
      throw new Error(`Missing phase for lesson ${lessonCode}: ${phaseTitle}`);
    }

    await request("POST", "training_lessons", {
      body: [
        {
          organization_id: organizationId,
          programme_id: programmeId,
          phase_id: phase.id,
          lesson_code: lessonCode,
          title,
          description,
          lesson_type: "ground",
          sort_order: sortOrder,
          active: true,
        },
      ],
    });

    created += 1;
    existingCodes.add(lessonCode);
  }

  return {
    existingCount: existing.length,
    created,
  };
}

async function main() {
  await ensureOrganization();
  const programme = await ensureProgramme();
  const phaseResult = await ensurePhases(programme.record.id);
  const lessonResult = await ensureLessons(programme.record.id, phaseResult.byTitle);

  console.log(
    JSON.stringify(
      {
        project: supabaseUrl,
        organization_id: organizationId,
        programme_id: programme.record.id,
        programme_code: programme.record.code,
        programme_created: programme.created,
        phases_created: phaseResult.created.length,
        lessons_created: lessonResult.created,
        total_phases_now: phaseResult.byTitle.size,
        total_lessons_now: lessonResult.existingCount + lessonResult.created,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
