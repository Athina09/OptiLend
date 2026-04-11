'use client';

/**
 * Root client wrapper. Global splash was removed — it repeatedly hung on some hosts
 * (timer throttling, hydration, GSAP) and blocked the real UI. Use page-level loaders if needed.
 */
export function ClientLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
