/** MSME Account Aggregator + GST consent (client-side demo; not legal advice). */

export const MSME_AA_CONSENT_KEY = 'msme_aa_consent_v1';
export const MSME_BUSINESS_TOKEN_KEY = 'msme_business_token';

export type AAConsentScopes = {
  aaFinancial: boolean;
  gstFilings: boolean;
  bankWithGst: boolean;
};

export type AAConsentRecord = {
  version: 1;
  acceptedAt: number;
  scopes: AAConsentScopes;
  signerName: string;
};

export function parseAAConsent(): AAConsentRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(MSME_AA_CONSENT_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<AAConsentRecord>;
    if (p.version !== 1 || !p.scopes || !p.acceptedAt) return null;
    if (!p.scopes.aaFinancial || !p.scopes.gstFilings || !p.scopes.bankWithGst) return null;
    if (typeof p.signerName !== 'string' || !p.signerName.trim()) return null;
    return p as AAConsentRecord;
  } catch {
    return null;
  }
}

export function hasAAConsent(): boolean {
  return parseAAConsent() !== null;
}
