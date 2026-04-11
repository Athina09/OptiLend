import { redirect } from 'next/navigation';

/** Short alias — same flow as `/msme/account-aggregator-consent`. */
export default function AAConsentShortLinkPage() {
  redirect('/msme/account-aggregator-consent');
}
