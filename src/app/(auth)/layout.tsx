import Footer from "@/components/home/Footer";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="easa-quicken-app min-h-screen bg-[var(--easa-color-bg)]">
      {children}
      <Footer />
    </div>
  );
}
