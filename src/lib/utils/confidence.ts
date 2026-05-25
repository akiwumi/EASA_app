export type ConfidenceLevel = "high" | "medium" | "low";

export function getConfidenceLevel(score: number | null | undefined, label?: string | null): ConfidenceLevel {
  if (label) {
    const normalized = label.toLowerCase();
    if (normalized === "high") return "high";
    if (normalized === "low") return "low";
    if (normalized === "medium") return "medium";
  }

  if (score == null) return "low";
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export const confidenceConfig: Record<ConfidenceLevel, { label: string; badgeClass: string; borderClass: string }> = {
  high: { label: "High confidence", badgeClass: "easa-badge is-green", borderClass: "" },
  medium: { label: "Medium confidence", badgeClass: "easa-badge is-orange", borderClass: "" },
  low: {
    label: "Low confidence",
    badgeClass: "easa-badge is-pink",
    borderClass: "border-2 border-[var(--easa-color-accent-pink)]",
  },
};
