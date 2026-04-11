import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export { gsap, ScrollTrigger };

export function fadeInUp(element: HTMLElement | string, delay = 0, duration = 0.8) {
  const el = typeof element === 'string' ? document.querySelector(element) : element;
  if (!el) return;
  gsap.fromTo(
    el,
    { opacity: 0, y: 40 },
    { opacity: 1, y: 0, duration, delay, ease: 'power3.out' }
  );
}

export function staggerChildren(container: HTMLElement | string, stagger = 0.1) {
  const el = typeof container === 'string' ? document.querySelector(container) : container;
  if (!el) return;
  const children = el.querySelectorAll('*');
  gsap.fromTo(
    children,
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.6, stagger, ease: 'power2.out' }
  );
}

export function pageTransitionOut(callback?: () => void) {
  return gsap.to('.page-transition-overlay', {
    scaleY: 1,
    duration: 0.5,
    ease: 'power2.inOut',
    transformOrigin: 'bottom',
    onComplete: callback,
  });
}

export function pageTransitionIn() {
  return gsap.fromTo(
    '.page-transition-overlay',
    { scaleY: 1 },
    {
      scaleY: 0,
      duration: 0.5,
      ease: 'power2.inOut',
      transformOrigin: 'top',
    }
  );
}
