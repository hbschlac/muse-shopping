'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Image as ImageIcon, X, MessageSquare } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import PageHeader from '@/components/PageHeader';
import { useAuth } from '@/lib/hooks/useAuth';
import { sendChatMessage } from '@/lib/api/chat';
import type { ChatMessage } from '@/lib/types/api';

export default function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Set initial welcome messages when page loads
  useEffect(() => {
    if (!initialized) {
      const firstName = user?.first_name ? `${user.first_name}, ` : '';
      const welcomeMessages: ChatMessage[] = [
        {
          id: '1',
          role: 'assistant',
          content: `Hi ${firstName}I can personalize your outfit picks based on your style profile and what you ask me.`,
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          role: 'assistant',
          content: 'What are you shopping for today?',
          created_at: new Date().toISOString(),
        },
      ];

      // Show messages with a slight delay for natural feel
      setMessages([welcomeMessages[0]]);
      setTimeout(() => {
        setMessages(welcomeMessages);
      }, 800);

      setInitialized(true);
    }
  }, [initialized, user?.first_name]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setUploadedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleQuickAction = (action: string) => {
    setInput(action);
    setShowQuickActions(false);
    // Auto-send after a brief moment
    setTimeout(() => handleSend(action), 100);
  };

  const handleFeedback = () => {
    // Open feedback form or send feedback message
    setInput("I'd like to submit feedback");
    setShowQuickActions(false);
    setTimeout(() => handleSend("I'd like to submit feedback"), 100);
  };

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if ((!textToSend.trim() && !uploadedImage) || isLoading) return;

    // Hide quick actions after first user message
    setShowQuickActions(false);

    const messageContent = uploadedImage
      ? `${textToSend.trim() || 'Help me style this item'}`
      : textToSend;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    const imageToSend = uploadedImage;
    setUploadedImage(null);
    setIsLoading(true);

    try {
      const chatContext: Record<string, any> = {
        recommendation_mode: 'personalized',
        tone: 'concierge',
        shopper_id: user?.id || undefined,
        shopper_profile: user
          ? {
              first_name: user.first_name,
              last_name: user.last_name,
              onboarding_completed: user.onboarding_completed,
            }
          : undefined,
      };
      if (imageToSend) chatContext.image = imageToSend;

      const response = await sendChatMessage({
        message: messageContent,
        history: [...messages, userMessage],
        session_id: sessionId || undefined,
        context: chatContext,
      });

      // Update session ID if provided
      if (response.session_id && !sessionId) {
        setSessionId(response.session_id);
      }

      const museMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, museMessage]);
    } catch (error: any) {
      console.error('Failed to send message:', error);

      const status = error?.status;
      const apiCode = error?.data?.error?.code;
      const apiMessage = error?.data?.error?.message || error?.message;

      const isValidationError = status === 400;
      const isConfigError = apiCode === 'OPENAI_CONFIG_ERROR';

      const errorContent = isConfigError
        ? 'Muse is running in demo fallback right now. Please ask again, or configure OPENAI_API_KEY for full AI responses.'
        : isValidationError
          ? (apiMessage || "I'm sorry, but I can't process that image. Please share fashion-related images only.")
          : (apiMessage || "I'm sorry, I'm having trouble connecting right now. Please try again.");

      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorContent,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-ecru)] pb-24 flex flex-col">
      {/* Header */}
      <PageHeader
        rightContent={
          <>
            {/* Feedback Button */}
            <button
              onClick={handleFeedback}
              className="px-4 py-2 bg-[#E8DFD4] hover:bg-[#DED0C0] text-gray-900 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
              aria-label="Submit Feedback"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Feedback</span>
            </button>

            {/* Cart Icon */}
            <a
              href="/cart"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
              aria-label="Shopping Cart"
            >
              <svg
                className="w-6 h-6 text-gray-900"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
            </a>

            {/* Profile Icon */}
            <a
              href="/profile"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Profile"
            >
              <svg
                className="w-6 h-6 text-gray-900"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </a>
          </>
        }
      />

      {/* Messages Container */}
      <div className="flex-1 px-4 py-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Muse Logo and Title (shown at top) */}
          {messages.length <= 2 && (
            <div className="flex flex-col items-center mb-8 pt-8">
              <div className="w-20 h-20 rounded-full bg-[#C9B5A0] flex items-center justify-center mb-4">
                <span className="text-white text-3xl font-serif">M</span>
              </div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-1">Muse</h1>
              <p className="text-sm text-gray-600">Curated fashion, intelligently shopped.</p>
            </div>
          )}

          {/* Messages */}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] px-4 py-3 rounded-[20px] ${
                  message.role === 'user'
                    ? 'gradient-primary text-white'
                    : 'bg-white text-gray-900 shadow-sm'
                }`}
              >
                <p className="text-base whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}

          {/* Quick Actions - Shown only on initial load */}
          {false && showQuickActions && messages.length <= 2 && !isLoading && (
            <div className="flex flex-col gap-3 mt-6">
              <button
                onClick={() => handleQuickAction("Tell me how it works")}
                className="w-full py-3 px-5 bg-[#E8DFD4] text-gray-900 rounded-[20px] text-base font-medium hover:bg-[#DED0C0] transition-colors text-left flex items-center justify-between"
              >
                <span>Tell me how it works</span>
                <span className="text-gray-500">→</span>
              </button>
              <button
                onClick={() => handleQuickAction("Learn about the waitlist")}
                className="w-full py-3 px-5 bg-[#E8DFD4] text-gray-900 rounded-[20px] text-base font-medium hover:bg-[#DED0C0] transition-colors text-left flex items-center justify-between"
              >
                <span>Learn about the waitlist</span>
                <span className="text-gray-500">→</span>
              </button>
              <button
                onClick={() => handleQuickAction("Talk to support (24/7)")}
                className="w-full py-3 px-5 bg-[#E8DFD4] text-gray-900 rounded-[20px] text-base font-medium hover:bg-[#DED0C0] transition-colors text-left flex items-center justify-between"
              >
                <span>Talk to support (24/7)</span>
                <span className="text-gray-500">→</span>
              </button>
            </div>
          )}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[75%] px-4 py-3 rounded-[20px] bg-white text-gray-900 shadow-sm">
                <p className="text-base text-gray-400">Thinking...</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Composer */}
      <div className="flex-shrink-0 bg-[var(--color-ecru)] p-4 border-t border-gray-200">
        <div className="max-w-2xl mx-auto">
          {/* Image Preview */}
          {uploadedImage && (
            <div className="mb-3 relative inline-block">
              <img
                src={uploadedImage}
                alt="Upload preview"
                className="h-20 w-20 object-cover rounded-lg"
              />
              <button
                onClick={handleRemoveImage}
                className="absolute -top-2 -right-2 w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors"
                aria-label="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-3 bg-white rounded-[24px] px-4 py-3 shadow-sm">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              className="hidden"
              aria-label="Upload image"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Add image"
            >
              <ImageIcon className="w-5 h-5 text-gray-600" />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={uploadedImage ? "Describe what you need help with..." : "Type a message..."}
              className="flex-1 bg-transparent border-none outline-none text-base text-gray-900 placeholder:text-gray-400"
            />
            <button
              onClick={() => handleSend()}
              disabled={isLoading || (!input.trim() && !uploadedImage)}
              className="w-9 h-9 rounded-full bg-[#C9B5A0] flex items-center justify-center transition-all duration-150 hover:bg-[#B8A490] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#C9B5A0]"
              aria-label="Send message"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
