import { HeroBackdrop } from '@/components/landing/HeroBackdrop';
import { HeroSection } from '@/components/landing/HeroSection';
import { SecurityBadges } from '@/components/SecurityBadges';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { LandingNav } from '@/components/landing/LandingNav';

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <LandingNav />
      <HeroBackdrop />
      <div className="relative z-20 flex min-h-screen flex-col items-center justify-center px-6 py-24">
        <HeroSection />
        <div className="mt-16 w-full max-w-2xl">
          <SecurityBadges />
        </div>
      </div>
      <FeaturesSection />
    </main>
  );
}
