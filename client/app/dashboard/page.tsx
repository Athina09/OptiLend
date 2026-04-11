import { redirect } from 'next/navigation';

/** Common bookmark/URL: /dashboard → MSME dashboard (bank uses /bank/dashboard). */
export default function DashboardAliasPage() {
  redirect('/msme/dashboard');
}
