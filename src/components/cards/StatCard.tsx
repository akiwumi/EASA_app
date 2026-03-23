type StatTone = "blue" | "orange" | "red" | "green";

export default function StatCard({
  label,
  value,
  trend,
  tone,
}: {
  label: string;
  value: string;
  trend: string;
  tone: StatTone;
}) {
  const toneClass =
    tone === "green"
      ? "is-green"
      : tone === "orange"
        ? "is-orange"
        : tone === "red"
          ? "is-red"
          : "is-blue";

  return (
    <div className="easa-card p-5">
      <p className="text-xs text-[var(--easa-color-text-muted)]">{label}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-2xl font-semibold">{value}</span>
        <span className={`easa-badge ${toneClass}`}>{trend}</span>
      </div>
    </div>
  );
}
