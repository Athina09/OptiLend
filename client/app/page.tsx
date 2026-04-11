import { HeroBackdrop } from '@/components/landing/HeroBackdrop';
import { HeroSection } from '@/components/landing/HeroSection';
import { HeroPhoneMockup } from '@/components/landing/HeroPhoneMockup';
import { SecurityBadges } from '@/components/SecurityBadges';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { LandingNav } from '@/components/landing/LandingNav';

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <LandingNav />
      <HeroBackdrop />
      <div className="relative z-20 mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-24 lg:py-28">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-12">
          <div className="order-2 flex flex-col items-center lg:order-1 lg:items-start">
            <HeroSection className="lg:text-left [&_h1]:lg:text-left" />
          </div>
          <div className="order-1 flex justify-center lg:order-2 lg:justify-end lg:pr-4">
            <HeroPhoneMockup />
          </div>
        </div>
        <div className="mx-auto mt-16 w-full max-w-2xl lg:col-span-2">
          <SecurityBadges />
        </div>
      </div>
      <FeaturesSection />
    </main>
  );
}
