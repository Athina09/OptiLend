'use client';

import { motion, useAnimationControls } from 'framer-motion';
import { useEffect } from 'react';

type PlacedOrb = {
  label: string;
  title: string;
  side: 'left' | 'right';
  /** Vertical anchor on the phone frame (0% = top of container) */
  top: string;
};

/**
 * Many short labels — fan around the phone; “pop” reads as emerging from the device edge.
 */
const PHONE_ORBS: PlacedOrb[] = [
  { label: 'UPI', title: 'UPI transaction signals', side: 'left', top: '4%' },
  { label: 'GST', title: 'GST filings & compliance', side: 'left', top: '14%' },
  { label: 'AES', title: 'AES-256 encryption', side: 'left', top: '24%' },
  { label: 'IMPS', title: 'Instant payment rails', side: 'left', top: '34%' },
  { label: 'GSTR', title: 'GSTR-3B / returns', side: 'left', top: '44%' },
  { label: 'PAN', title: 'PAN / identity linkage', side: 'left', top: '54%' },
  { label: 'BANK', title: 'Bank statement signals', side: 'left', top: '64%' },
  { label: 'EMI', title: 'EMI / obligations', side: 'left', top: '74%' },

  { label: 'RBI', title: 'RBI-aligned architecture', side: 'right', top: '6%' },
  { label: 'AA', title: 'Account Aggregator framework', side: 'right', top: '16%' },
  { label: 'DPDP', title: 'DPDP-ready practices', side: 'right', top: '26%' },
  { label: 'KYC', title: 'KYC / verification', side: 'right', top: '36%' },
  { label: 'FIU', title: 'FIU-grade handling (demo)', side: 'right', top: '46%' },
  { label: 'NBFC', title: 'Lender ecosystem', side: 'right', top: '56%' },
  { label: 'TReDS', title: 'Trade receivables (TReDS)', side: 'right', top: '66%' },
  { label: 'IFSC', title: 'Banking identifiers', side: 'right', top: '76%' },
];

function orbClassName() {
  return [
    'flex h-8 w-8 cursor-default items-center justify-center rounded-full sm:h-9 sm:w-9',
    'border border-slate-200/90 bg-white/95 text-[8px] font-bold tracking-tight text-slate-600',
    'shadow-[0_4px_14px_rgba(15,23,42,0.08)] ring-1 ring-white/80',
    'backdrop-blur-sm md:h-9 md:w-9 md:text-[9px] lg:text-[10px]',
    'pointer-events-auto',
  ].join(' ');
}

function AnimatedOrb({
  orb,
  placedIndex,
  side,
  /** Start shifted toward phone center so motion reads as “out from phone” */
  xFromPhone,
}: {
  orb: PlacedOrb;
  placedIndex: number;
  side: 'left' | 'right';
  xFromPhone: number;
}) {
  const ctrl = useAnimationControls();
  const enterDelay = 0.05 + placedIndex * 0.055;
  const floatPeriod = 2.4 + (placedIndex % 7) * 0.28;
  const drift = side === 'left' ? 5 : -5;

  useEffect(() => {
    let cancelled = false;

    async function run() {
      await ctrl.start({
        opacity: 1,
        x: 0,
        scale: 1,
        transition: {
          delay: enterDelay,
          type: 'spring',
          stiffness: 440,
          damping: 17,
        },
      });
      if (cancelled) return;

      await ctrl.start({
        y: [0, -9, -3, -10, 0],
        x: [0, drift * 0.55, drift * 0.18, drift * 0.48, 0],
        scale: [1, 1.13, 1.04, 1.1, 1],
        transition: {
          duration: floatPeriod,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      });
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [ctrl, enterDelay, drift, floatPeriod]);

  return (
    <motion.span
      title={orb.title}
      className={orbClassName()}
      initial={{ opacity: 0, scale: 0.25, x: xFromPhone }}
      animate={ctrl}
    >
      {orb.label}
    </motion.span>
  );
}

/** Full-bleed overlay on the phone column — orbs sit just outside the device. */
export function PhoneSideComplianceOrbs() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 min-h-[min(420px,72vw)] sm:min-h-[440px]"
      aria-hidden
    >
      {PHONE_ORBS.map((orb, i) => {
        const xFromPhone = orb.side === 'left' ? 28 : -28;
        const isLeft = orb.side === 'left';
        return (
          <div
            key={`${orb.side}-${orb.label}`}
            className="absolute flex"
            style={{
              top: orb.top,
              ...(isLeft
                ? { left: 0, transform: 'translate(calc(-100% - 6px), -50%)' }
                : { right: 0, transform: 'translate(calc(100% + 6px), -50%)' }),
            }}
          >
            <AnimatedOrb orb={orb} placedIndex={i} side={orb.side} xFromPhone={xFromPhone} />
          </div>
        );
      })}
    </div>
  );
}
