'use client';

import { useState, useRef, useEffect } from 'react';

const CHAT_API_URL = process.env.NEXT_PUBLIC_CHAT_API_URL || 'http://localhost:5000';

type Message = { role: 'user' | 'bot'; text: string };

function formatBotMessage(text: string) {
  if (!text) return '';
  let html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<strong>$1</strong>');
  html = html.split('\n\n').map(p => `<p class="mb-2 last:mb-0">${p.replace(/\n/g, '<br/>')}</p>`).join('');
  return html;
}

export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: "Hello! I'm Optilend AI — your MSME financial assistant. Ask about credit, cash flow, or recommendations." },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, loading]);

  const send = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', text: msg }]);
    setLoading(true);
    try {
      const res = await fetch(`${CHAT_API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      setMessages(m => [...m, { role: 'bot', text: data.reply || 'No response.' }]);
    } catch {
      setMessages(m => [...m, { role: 'bot', text: `Unable to connect to the assistant. Start the chat server: in the Pranatheesh folder run "node server.js" (should listen on ${CHAT_API_URL}).` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {open && (
        <div className="glass-strong mb-3 flex h-[420px] w-[380px] max-w-[calc(100vw-3rem)] flex-col rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-fade-in-up">
          <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
            <div className="h-9 w-9 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <svg className="h-5 w-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Optilend AI</p>
              <p className="text-xs text-slate-600">MSME financial assistant</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="ml-auto rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              aria-label="Close chat"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                    m.role === 'user'
                      ? 'bg-cyan-500/20 text-slate-900 border border-cyan-500/40'
                      : 'bg-slate-100 text-slate-800 border border-slate-200'
                  }`}
                >
                  {m.role === 'bot' ? (
                    <div className="text-sm prose prose-p:my-0 prose-strong:text-cyan-600" dangerouslySetInnerHTML={{ __html: formatBotMessage(m.text) }} />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{m.text}</p>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2.5">
                  <span className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-cyan-500 animate-bounce [animation-delay:0ms]" />
                    <span className="h-2 w-2 rounded-full bg-cyan-500 animate-bounce [animation-delay:150ms]" />
                    <span className="h-2 w-2 rounded-full bg-cyan-500 animate-bounce [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="border-t border-slate-200 p-3">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Ask about credit, cash flow..."
                rows={1}
                className="min-h-[40px] max-h-24 w-full resize-none rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
              />
              <button
                type="button"
                onClick={send}
                disabled={!input.trim() || loading}
                className="shrink-0 h-10 w-10 rounded-xl bg-cyan-500 text-white hover:bg-cyan-600 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95"
                aria-label="Send"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            </div>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500 text-white shadow-lg shadow-cyan-500/30 hover:bg-cyan-600 transition-all duration-300 hover:scale-110 active:scale-95"
        aria-label={open ? 'Close chat' : 'Open chat'}
      >
        {open ? (
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        ) : (
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
        )}
      </button>
    </div>
  );
}
