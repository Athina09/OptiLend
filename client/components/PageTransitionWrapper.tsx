'use client';

export function PageTransitionWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <div
        className="page-transition-overlay fixed inset-0 z-[9999] scale-y-0 origin-top pointer-events-none bg-white"
        aria-hidden
      />
    </>
  );
}
