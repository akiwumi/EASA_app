export default function ProblemSection() {
  return (
    <section className="py-[20px]">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2
          className="text-4xl font-normal leading-tight tracking-tight text-foreground md:text-5xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Most flight schools still manage critical updates across PDFs, Word
          files, email, and memory.
        </h2>
        <p className="mt-6 text-lg leading-7 text-muted-foreground">
          That makes training inconsistent, acknowledgements impossible to
          verify, and audits more stressful than they need to be. When an EASA
          change lands, there&apos;s no single system that connects the
          regulation, the manual, the instructor, and the student. EASA_app is
          that system.
        </p>
      </div>
    </section>
  );
}
