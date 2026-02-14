'use client';

import { useState } from 'react';
import { ChevronLeft, Send } from 'lucide-react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';

export default function ContactStorePage() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('general');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would send to an API
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setSubject('');
      setMessage('');
      setCategory('general');
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-[var(--color-ecru)] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 pt-3 pb-4 px-4">
        <div className="flex items-center gap-4">
          <Link href="/profile" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-900" />
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">Contact Support</h1>
        </div>
      </header>

      {/* Content */}
      <div className="px-4 pt-6">
        {submitted ? (
          <div className="bg-green-50 border border-green-200 rounded-[16px] p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-green-900 mb-2">Message Sent!</h2>
            <p className="text-green-700">
              We'll get back to you within 24 hours.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-[12px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                <option value="general">General Question</option>
                <option value="order">Order Issue</option>
                <option value="account">Account Support</option>
                <option value="technical">Technical Issue</option>
                <option value="feedback">Feedback</option>
              </select>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief description of your issue"
                required
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-[12px] text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Provide details about your issue or question..."
                required
                rows={6}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-[12px] text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full px-6 py-4 bg-gradient-to-br from-[var(--color-peach)] to-[var(--color-blue)] text-white font-semibold rounded-[12px] hover:shadow-lg hover:scale-105 transition-all duration-150 active:scale-95 flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              Send Message
            </button>
          </form>
        )}

        {/* Additional Contact Info */}
        {!submitted && (
          <div className="mt-8 bg-gray-50 rounded-[16px] p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Other Ways to Reach Us</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>Email:</strong> support@muse.com</p>
              <p><strong>Response time:</strong> Within 24 hours</p>
              <p><strong>Hours:</strong> Monday-Friday, 9am-6pm EST</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
