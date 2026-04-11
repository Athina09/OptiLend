import { redirect } from 'next/navigation';

/** Hosts or bookmarks often use /dash; primary product dashboard is MSME (bank: /bank/dashboard). */
export default function DashPage() {
  redirect('/msme/dashboard');
}
