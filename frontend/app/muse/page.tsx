'use client';

import { useState } from 'react';
import { Send, Settings } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

// Mock chat messages
const initialMessages = [
  {
    id: '1',
    type: 'muse',
    content: "Hi! I'm your personal stylist. What can I help you with today?",
  },
];

export default function MusePage() {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState<'stylist' | 'stores' | 'support'>('stylist');

  const handleSend = () => {
    if (!input.trim()) return;

    const newMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
    };

    setMessages([...messages, newMessage]);
    setInput('');

    // Simulate Muse response
    setTimeout(() => {
      const response = {
        id: (Date.now() + 1).toString(),
        type: 'muse',
        content: "I'm here to help! Let me find some great options for you.",
      };
      setMessages((prev) => [...prev, response]);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[var(--color-ecru)] pb-24 flex flex-col">
      {/* Header */}
      <div className="bg-[var(--color-ecru)] pt-12 pb-4 px-4 flex items-center justify-between flex-shrink-0">
        <h1 className="text-lg font-semibold text-gray-900">Muse</h1>
        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-150">
          <Settings className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-[var(--color-ecru)] px-4 pb-4 flex gap-2 flex-shrink-0">
        {(['stylist', 'stores', 'support'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-all duration-150 ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'bg-transparent text-gray-600 hover:bg-white/50'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 px-4 py-6 overflow-y-auto space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] px-4 py-3 rounded-[20px] ${
                message.type === 'user'
                  ? 'gradient-primary text-white'
                  : 'bg-white text-gray-900 shadow-sm'
              }`}
            >
              <p className="text-[15px]">{message.content}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Input Composer */}
      <div className="flex-shrink-0 bg-[var(--color-ecru)] p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 bg-white rounded-[24px] px-4 py-3 shadow-sm">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask Muse anything..."
            className="flex-1 bg-transparent border-none outline-none text-[15px] text-gray-900 placeholder:text-gray-400"
          />
          <button
            onClick={handleSend}
            className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center transition-transform duration-150 hover:scale-105 active:scale-95"
            aria-label="Send message"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
