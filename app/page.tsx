import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import StatsDivider from "@/components/StatsDivider";
import ManifestoStrip from "@/components/ManifestoStrip";
import Services from "@/components/Services";
import IScale from "@/components/IScale";
import Projects from "@/components/Projects";
import InsightsPreview from "@/components/InsightsPreview";
import AntiPortfolio from "@/components/AntiPortfolio";
import TechStack from "@/components/TechStack";
import HowItWorks from "@/components/HowItWorks";
import About from "@/components/About";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navigation />
      <main>
        <Hero />
        <StatsDivider />
        <ManifestoStrip />
        <Services />
        <IScale />
        <Projects />
        <InsightsPreview />
        <AntiPortfolio />
        <TechStack />
        <HowItWorks />
        <About />
      </main>
      <Footer />
    </>
  );
}
