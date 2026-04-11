# Optilend

AI-Powered Alternative Credit Intelligence for MSMEs. Premium fintech frontend built with Next.js (App Router), GSAP, and Three.js.

## Features

- **Landing page**: Hero with 3D Three.js background (floating data nodes), GSAP headline/subtext/button animations, security badges (AES-256, RBI-Aligned, DPDP Compliant)
- **MSME Login**: Aadhaar/Business ID + OTP, glassmorphism card, animated focus
- **Bank Login**: Email, password, 2FA, institutional-style UI
- **MSME Dashboard**: OptilendScore circular meter (300–900), GST/UPI/Utility scores, cash flow chart, bank recommendations, animated counters
- **Bank Dashboard**: MSME list with filters (risk band, industry, turnover), detailed MSME view with SHAP explanation, cash flow trends, credit insights
- **UI**: Dark theme, electric blue + emerald accents, glassmorphism, loading screen with 3D-style logo, scroll-triggered animations

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- GSAP (animations, ScrollTrigger)
- Three.js (@react-three/fiber, @react-three/drei)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Routes

| Route | Description |
|-------|-------------|
| `/` | Landing (hero, 3D background, login buttons) |
| `/msme/login` | MSME login |
| `/msme/dashboard` | MSME dashboard (after login) |
| `/bank/login` | Bank / lender login |
| `/bank/dashboard` | Bank portfolio (MSME list, filters) |
| `/bank/msme/[id]` | MSME detail (OptilendScore, SHAP, cash flow, insights) |

## Project Structure

```
app/
  page.tsx              # Landing
  layout.tsx
  globals.css
  msme/login/
  msme/dashboard/
  bank/login/
  bank/dashboard/
  bank/msme/[id]/
components/
  landing/              # HeroSection, FeaturesSection
  dashboard/            # OptilendScoreMeter, AnimatedCounter
  ui/                    # GlassCard, Button, Input
  Scene3D.tsx            # Three.js background
  LoadingScreen.tsx
  SecurityBadges.tsx
  PageTransitionWrapper.tsx
  ClientLayout.tsx
lib/
  gsap.ts
```

## Build

```bash
npm run build
npm start
```
