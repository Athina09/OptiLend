/**
 * One-shot MSME assistant replies when the Express chatbot (`/chat`) is unreachable.
 * Keyword-light so arbitrary questions still get a useful default answer.
 */

export function localAssistantReply(userMessage: string): string {
  const raw = userMessage.trim();
  const t = raw.toLowerCase();

  if (!t) {
    return 'Ask a **single question** about credit, cash flow, loans, or GST — you will get one concise MSME-oriented answer (demo mode, no server required).';
  }

  if (/^(hi|hello|hey|namaste)\b|^good (morning|afternoon|evening)\b/.test(t)) {
    return 'Hi — I am **Optilend AI** in **demo mode**. Ask one clear question (for example: “How do I improve my credit profile?” or “What is working capital?”) and I will answer in one short paragraph.';
  }

  if (/credit|cibil|score|rating|optilend|underwrit|eligible|eligibility/.test(t)) {
    return '**Credit & OptilendScore:** Your score band (300–900) reflects cash-flow health, compliance signals, and digital payment behaviour. Improve it by documenting revenue, filing GST on time, keeping EMI stress low, and aligning bank inflows with declared turnover. Use **Run scoring** on this dashboard to refresh the estimate from your inputs.';
  }

  if (/cash|liquidity|working capital|runway|burn|inflow|outflow/.test(t)) {
    return '**Cash flow:** Lenders look for stable inflows, expense discipline, and a buffer for shocks. High **working capital** stress often shows up when receivables stretch or inventory spikes — match loan **tenor** to how fast you convert stock or invoices to cash.';
  }

  if (/loan|mudra|nbfc|lender|emi|interest|collateral|term loan/.test(t)) {
    return '**Loans:** Pick the product that matches your cycle — working capital for short gaps, term loans for equipment, invoice financing if you have dependable B2B receivables. Compare **rate, tenure, fees, and collateral**; the scheme cards here are **demo suggestions only**, not offers.';
  }

  if (/gst|filing|compliance|turnover|mismatch|gstr/.test(t)) {
    return '**GST:** On-time filing and turnover that **reconciles** with bank credits strengthen your story. Large gaps between declared turnover and observed inflows often trigger extra questions — reconcile before you apply.';
  }

  if (/recommend|what should|suggest|advice|help me|how do i/.test(t)) {
    return '**Practical next steps:** (1) Last 6–12 months of **clean** bank statements. (2) Timely **GST** where registered. (3) Separate **personal vs business** spends. (4) Choose loan **type** to match how you actually generate cash — avoid long-term debt for short-term gaps.';
  }

  if (/thank|thanks|ok|okay|bye|goodbye/.test(t)) {
    return 'You are welcome. If you need another **one-topic** answer, ask again — I stay in demo mode until the live chat service is connected.';
  }

  return (
    '**Demo automated answer:** For MSME finance, tie your question to **credit**, **cash flow**, **loans**, or **GST** — those are easiest to answer briefly. ' +
    'In general: document revenue, keep compliance current, and make sure bank activity matches what you declare to tax and lenders. ' +
    '(Connect the **chatbot** server later if you want richer, model-backed replies.)'
  );
}
