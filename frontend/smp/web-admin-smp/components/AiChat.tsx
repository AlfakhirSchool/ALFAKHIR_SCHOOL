'use client';

import { useState, useRef, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import api from '@/lib/api';

const QUICK_CHIPS = [
  'Berapa total siswa aktif hari ini?',
  'Siapa guru yang belum submit jurnal?',
  'Rekap absensi hari ini',
  'Kelas mana yang perlu perhatian?',
  'Apa yang bisa kamu bantu?',
];

interface Message {
  role: 'user' | 'model';
  content: string;
}

export default function AiChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: 'model', content: 'Halo! Saya Asisten AI Al Fakhir School 🎓\nTanya apa saja seputar data siswa, absensi, jadwal, atau operasional sekolah.' }]);
    }
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || loading) return;
    setInput('');

    const newMessages: Message[] = [...messages, { role: 'user', content: msg }];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Kirim history (kecuali greeting awal)
      const history = newMessages.slice(messages.length === 1 && messages[0].role === 'model' ? 1 : 0, -1);
      const { data } = await api.post('/ai/chat', { message: msg, history });
      setMessages(prev => [...prev, { role: 'model', content: data.data.reply }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'model', content: 'Maaf, terjadi kesalahan. Coba lagi.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#1B8B87] text-white shadow-lg hover:bg-[#156f6c] transition-all flex items-center justify-center text-2xl"
        title="Asisten AI Al Fakhir"
      >
        {open ? <span className="text-xl font-light">×</span> : <Sparkles size={22} />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] max-h-[520px] flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-[#1B8B87] text-white flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center"><Sparkles size={18} /></div>
            <div>
              <p className="font-semibold text-sm leading-tight">Asisten AI Al Fakhir</p>
              <p className="text-xs text-white/70">Pendidikan · Online</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-[#1B8B87] text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-500 px-3 py-2 rounded-2xl rounded-bl-sm text-sm flex gap-1 items-center">
                  <span className="animate-bounce">●</span>
                  <span className="animate-bounce" style={{ animationDelay: '0.15s' }}>●</span>
                  <span className="animate-bounce" style={{ animationDelay: '0.3s' }}>●</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick chips — hanya tampil saat awal */}
          {messages.length <= 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {QUICK_CHIPS.map(chip => (
                <button key={chip} onClick={() => send(chip)}
                  className="text-xs px-3 py-1.5 bg-teal-50 text-[#1B8B87] border border-[#1B8B87]/30 rounded-full hover:bg-teal-100 transition-colors">
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-100 flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
              placeholder="Tanya sesuatu..."
              className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]"
              disabled={loading}
            />
            <button onClick={() => send(input)} disabled={loading || !input.trim()}
              className="w-9 h-9 bg-[#1B8B87] text-white rounded-xl flex items-center justify-center hover:bg-[#156f6c] disabled:opacity-40 transition-colors">
              ▶
            </button>
          </div>
        </div>
      )}
    </>
  );
}
