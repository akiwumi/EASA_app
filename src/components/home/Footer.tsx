import Image from "next/image";
import Link from "next/link";

export default function Footer({
  className = "",
  innerClassName = "",
}: {
  className?: string;
  innerClassName?: string;
}) {
  return (
    <footer
      id="contact"
      className={className}
      style={{ background: "var(--mkt-ink)", color: "var(--mkt-cream)" }}
    >
      <div
        className={`mx-auto max-w-7xl px-6 py-14 ${innerClassName}`.trim()}
      >
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">

          {/* Brand */}
          <Link
            href="/"
            className="flex items-center gap-4 transition-opacity hover:opacity-80"
            style={{ color: "var(--mkt-cream)" }}
          >
            <Image
              alt="Flight Lyceum logo"
              className="object-contain"
              height={48}
              src="/images/flight-lyceum-logo.png"
              style={{ width: 88, height: 48, filter: "brightness(0) invert(1)" }}
              width={88}
            />
            <div>
              <p
                style={{
                  fontFamily: "var(--font-instrument-serif,Georgia,serif)",
                  fontWeight: 400,
                  fontSize: 20,
                  letterSpacing: "-0.01em",
                  color: "var(--mkt-cream)",
                }}
              >
                Flight Lyceum
              </p>
              <p style={{ fontSize: 12, opacity: 0.55, marginTop: 2, fontFamily: "var(--font-jb-mono,monospace)", letterSpacing: "0.08em" }}>
                Compliance and training for ATOs.
              </p>
            </div>
          </Link>

          {/* Nav columns */}
          <nav className="flex flex-wrap gap-x-12 gap-y-6 text-sm" style={{ color: "var(--mkt-cream)" }}>
            <div className="flex flex-col gap-2">
              <span style={{ fontFamily: "var(--font-jb-mono,monospace)", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.45 }}>
                Product
              </span>
              <Link href="/#features" className="opacity-65 transition-opacity hover:opacity-100">Features</Link>
              <Link href="/pricing" className="opacity-65 transition-opacity hover:opacity-100">Pricing</Link>
              <Link href="/how-it-works" className="opacity-65 transition-opacity hover:opacity-100">How it works</Link>
              <Link href="/book-demo" className="opacity-65 transition-opacity hover:opacity-100">Book a demo</Link>
            </div>
            <div className="flex flex-col gap-2">
              <span style={{ fontFamily: "var(--font-jb-mono,monospace)", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.45 }}>
                Support
              </span>
              <Link href="/help" className="opacity-65 transition-opacity hover:opacity-100">Help Center</Link>
              <Link href="/faq" className="opacity-65 transition-opacity hover:opacity-100">FAQ</Link>
              <Link href="/contact" className="opacity-65 transition-opacity hover:opacity-100">Contact</Link>
            </div>
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 border-t pt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "rgba(243,238,226,0.12)" }}>
          <p style={{ fontSize: 12, opacity: 0.4, fontFamily: "var(--font-jb-mono,monospace)", letterSpacing: "0.06em" }}>
            © 2026 Flight Lyceum. All rights reserved.
          </p>
          <p style={{ fontSize: 12, opacity: 0.3, fontFamily: "var(--font-jb-mono,monospace)", letterSpacing: "0.06em" }}>
            Built for EASA ATOs across Europe.
          </p>
        </div>
      </div>
    </footer>
  );
}
