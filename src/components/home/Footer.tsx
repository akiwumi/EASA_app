export default function Footer() {
  return (
    <footer id="contact" className="border-t border-border py-12">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
        <span
          className="font-semibold text-foreground"
          style={{ fontFamily: "var(--font-display)" }}
        >
          EASA_app
        </span>

        <p className="text-sm text-muted-foreground">
          © 2026 EASA_app. Compliance and training for ATOs.
        </p>
      </div>
    </footer>
  );
}
