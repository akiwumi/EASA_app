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
      className={`border-t border-border py-10 ${className}`.trim()}
    >
      <div
        className={`mx-auto flex max-w-7xl flex-col gap-5 px-6 md:flex-row md:items-center md:justify-between ${innerClassName}`.trim()}
      >
        <Link
          href="/"
          className="flex items-center gap-4 transition-opacity hover:opacity-85"
        >
          <Image
            alt="Flight Lyceum logo"
            className="object-contain"
            height={48}
            src="/images/flight-lyceum-logo.png"
            style={{ width: 88, height: 48 }}
            width={88}
          />
          <div>
            <p
              className="font-semibold text-foreground"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Flight Lyceum
            </p>
            <p className="text-sm text-muted-foreground">
              Compliance and training for ATOs.
            </p>
          </div>
        </Link>

        <nav className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-muted-foreground">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--easa-color-text-muted)]">Product</span>
            <Link href="/#features" className="hover:text-foreground hover:underline">Features</Link>
            <Link href="/pricing" className="hover:text-foreground hover:underline">Pricing</Link>
            <Link href="/how-it-works" className="hover:text-foreground hover:underline">How it works</Link>
            <Link href="/book-demo" className="hover:text-foreground hover:underline">Book a demo</Link>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--easa-color-text-muted)]">Support</span>
            <Link href="/help" className="hover:text-foreground hover:underline">Help Center</Link>
            <Link href="/faq" className="hover:text-foreground hover:underline">FAQ</Link>
            <Link href="/contact" className="hover:text-foreground hover:underline">Contact</Link>
          </div>
        </nav>

        <p className="text-sm text-muted-foreground">
          © 2026 Flight Lyceum. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
