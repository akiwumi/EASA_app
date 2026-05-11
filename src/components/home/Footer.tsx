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

        <p className="text-sm text-muted-foreground">
          © 2026 Flight Lyceum. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
