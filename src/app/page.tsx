import CompetitiveSection from "@/components/home/CompetitiveSection";
import CtaSection from "@/components/home/CtaSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import Footer from "@/components/home/Footer";
import HeroSection from "@/components/home/HeroSection";
import Nav from "@/components/home/Nav";
import PersonasSection from "@/components/home/PersonasSection";
import ProblemSection from "@/components/home/ProblemSection";
import WorkflowSection from "@/components/home/WorkflowSection";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <HeroSection />
        <ProblemSection />
        <FeaturesSection />
        <WorkflowSection />
        <PersonasSection />
        <CompetitiveSection />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
