import type { CoworkerCard } from "@/lib/coworker/response-types";

export type ExtractedCoworkerCard<T extends CoworkerCard["type"]> = Extract<CoworkerCard, { type: T }>;
