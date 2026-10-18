import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import LabBlock from "@/components/LabBlock";
import Offers from "@/components/Offers";
import Projects from "@/components/Projects";
import InsightsPreview from "@/components/InsightsPreview";
import HowItWorks from "@/components/HowItWorks";
import About from "@/components/About";
import Footer from "@/components/Footer";

/** Live Lab counters in the hero and the Lab tiles. */
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <>
      <Navigation />
      <main>
        <Hero />
        <LabBlock />
        <Offers />
        <Projects />
        <InsightsPreview />
        <HowItWorks />
        <About />
      </main>
      <Footer />
    </>
  );
}
