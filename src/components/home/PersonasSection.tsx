import { BarChart3, ClipboardList, BookOpen, Smartphone } from "lucide-react";

const personas = [
  {
    num: "01",
    title: "Head of Training",
    body: "See pending reads, critical regulation changes, and training impact across the entire school from one dashboard.",
    Icon: BarChart3,
  },
  {
    num: "02",
    title: "Compliance Managers",
    body: "Track approvals, regulation mappings, version history, and audit trails, without spreadsheet workarounds.",
    Icon: ClipboardList,
  },
  {
    num: "03",
    title: "Instructors",
    body: "Fast access to current procedures, lesson-linked documents, and pending sign-offs from wherever you are.",
    Icon: BookOpen,
  },
  {
    num: "04",
    title: "Students",
    body: "Read assigned material on mobile, understand what changed, and acknowledge updates in seconds.",
    Icon: Smartphone,
  },
];

export default function PersonasSection() {
  return (
    <section id="who-it-s-for" aria-label="Who it's for" className="py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid items-start gap-12 md:grid-cols-2">
          <div>
            <p className="easa-eyebrow mb-3">Who it&apos;s for</p>
            <h2
              className="text-4xl font-normal leading-tight tracking-tight text-foreground md:text-5xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              One platform for compliance teams,
              <br />
              instructors, and students.
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              The same approved source of truth serves different roles without
              forcing everyone into the same workflow.
            </p>
          </div>

          <div className="easa-mobile-carousel grid gap-4 md:grid-cols-2">
            {personas.map(({ num, title, body, Icon }) => (
              <div
                key={num}
                className="h-full rounded-2xl border border-border bg-card p-5"
              >
                <div className="mb-3 flex items-center justify-between">
                  <p
                    className="text-3xl leading-none text-muted-foreground/40"
                    style={{ fontFamily: "var(--font-display)" }}
                    aria-hidden="true"
                  >
                    {num}
                  </p>
                  <Icon
                    size={18}
                    strokeWidth={1.8}
                    className="text-[var(--easa-color-brand-primary)] opacity-70"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="text-base font-semibold text-foreground">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
