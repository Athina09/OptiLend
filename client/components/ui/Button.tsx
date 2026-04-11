'use client';

import Link from 'next/link';
import { forwardRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  href?: string;
  children: React.ReactNode;
  className?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-cyan-500 text-white hover:bg-cyan-600 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]',
  secondary:
    'glass border-slate-300 text-slate-700 hover:border-teal-500/60 hover:bg-teal-500/10 hover:-translate-y-0.5 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]',
  ghost:
    'text-slate-600 hover:text-cyan-600 hover:bg-slate-100 transition-colors duration-200',
  outline:
    'border-2 border-cyan-500 text-cyan-600 bg-transparent hover:bg-cyan-500/10 transition-all duration-300 hover:-translate-y-0.5',
};

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  (
    {
      variant = 'primary',
      href,
      children,
      className = '',
      leftIcon,
      rightIcon,
      ...props
    },
    ref
  ) => {
    const base =
      'inline-flex items-center justify-center gap-2 rounded-xl font-semibold px-6 py-3 disabled:opacity-50 disabled:pointer-events-none font-display';
    const styles = `${base} ${variantStyles[variant]} ${className}`;

    if (href) {
      return (
        <Link
          href={href}
          className={styles}
          ref={ref as React.Ref<HTMLAnchorElement>}
        >
          {leftIcon}
          {children}
          {rightIcon}
        </Link>
      );
    }

    return (
      <button ref={ref as React.Ref<HTMLButtonElement>} className={styles} {...props}>
        {leftIcon}
        {children}
        {rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
