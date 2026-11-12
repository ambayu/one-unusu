import React from "react";
import { Topbar } from "../components/layout/Topbar";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { HeroSection } from "../components/home/HeroSection";
import { ProfileSection } from "../components/home/ProfileSection";
import { DigitalServicesSection } from "../components/home/DigitalServicesSection";
import { NonSsoServicesSection } from "../components/home/NonSsoServicesSection";
import { mainNavigation } from "../data/navigation";
import { externalUrls } from "../data/site";

export const Home: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white" data-testid="landing-page-root">
      <Topbar />
      <Navbar items={mainNavigation} registerUrl={externalUrls.pmb} />
      <main className="flex-1">
        <HeroSection />
        <ProfileSection />
        <DigitalServicesSection />
        <NonSsoServicesSection />
      </main>
      <Footer />
    </div>
  );
};
export default Home;
