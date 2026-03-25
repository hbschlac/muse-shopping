'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';

export default function FeedbackPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    category: '',
    subject: '',
    message: '',
    email: '',
    fullName: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ticketNumber, setTicketNumber] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const categories = [
    { value: 'bug', label: 'Bug Report', icon: '🐛' },
    { value: 'feature_request', label: 'Feature Request', icon: '💡' },
    { value: 'tech_help', label: 'Tech Help', icon: '🛠️' },
    { value: 'complaint', label: 'Complaint', icon: '😔' },
    { value: 'question', label: 'Question', icon: '❓' },
    { value: 'other', label: 'Other', icon: '💬' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      const response = await fetch(`${API_BASE_URL}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit feedback');
      }

      setTicketNumber(data.data.ticketNumber);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#FEFDFB]">
        <PageHeader title="Feedback Submitted" showBack onBack={() => router.push('/home')} />

        <div className="px-4 py-8 max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-[#E9E5DF] p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h2 className="text-2xl font-semibold text-[#333333] mb-3">
                Thank You for Your Feedback!
              </h2>

              <p className="text-[#6B625C] mb-6">
                We've received your feedback and created a ticket for tracking.
              </p>

              <div className="bg-[#F4EFE7] border-2 border-dashed border-[#F4C4B0] rounded-xl p-6 mb-6">
                <div className="text-sm text-[#6B625C] mb-2">Your Ticket Number</div>
                <div className="text-2xl font-mono font-semibold text-[#333333]">
                  {ticketNumber}
                </div>
                <div className="text-xs text-[#6B625C] mt-2">Save this for your records</div>
              </div>

              <div className="text-sm text-[#6B625C] mb-8">
                We typically respond to feedback within 2-3 business days. A confirmation email has been sent to{' '}
                <span className="font-medium text-[#333333]">{formData.email}</span>.
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setFormData({
                      category: '',
                      subject: '',
                      message: '',
                      email: '',
                      fullName: ''
                    });
                    setTicketNumber('');
                  }}
                  className="w-full px-6 py-3 bg-white border border-[#E9E5DF] text-[#333333] rounded-xl font-medium hover:bg-[#F4EFE7] transition-colors"
                >
                  Submit Another
                </button>

                <button
                  onClick={() => router.push('/home')}
                  className="w-full px-6 py-3 bg-[#F4C4B0] text-[#333333] rounded-xl font-medium hover:bg-[#F4B69A] transition-colors"
                >
                  Back to Home
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FEFDFB]">
      <PageHeader title="Send Feedback" showBack onBack={() => router.push('/home')} />

      <div className="px-4 py-6 max-w-2xl mx-auto pb-24">
        <div className="bg-white rounded-2xl shadow-sm border border-[#E9E5DF] p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-[#333333] mb-2">
              We'd Love to Hear from You
            </h2>
            <p className="text-sm text-[#6B625C]">
              Share your thoughts, report bugs, or suggest new features. We read every submission.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Category Selection */}
            <div>
              <label className="block text-sm font-medium text-[#333333] mb-3">
                What type of feedback is this? *
              </label>
              <div className="grid grid-cols-1 gap-2">
                {categories.map((cat) => (
                  <label
                    key={cat.value}
                    className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      formData.category === cat.value
                        ? 'border-[#F4C4B0] bg-[#FFF9F5]'
                        : 'border-[#E9E5DF] hover:border-[#F4C4B0] hover:bg-[#FEFDFB]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="category"
                      value={cat.value}
                      checked={formData.category === cat.value}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <span className="text-2xl mr-3">{cat.icon}</span>
                    <span className="font-medium text-[#333333]">{cat.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-[#333333] mb-2">
                Subject *
              </label>
              <input
                type="text"
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                placeholder="Brief summary of your feedback"
                required
                minLength={5}
                maxLength={255}
                className="w-full px-4 py-3 border border-[#E9E5DF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F4C4B0] focus:border-transparent text-[#333333]"
              />
            </div>

            {/* Message */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-[#333333] mb-2">
                Message *
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Tell us more about your feedback..."
                required
                minLength={20}
                maxLength={5000}
                rows={6}
                className="w-full px-4 py-3 border border-[#E9E5DF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F4C4B0] focus:border-transparent text-[#333333] resize-none"
              />
              <div className="text-xs text-[#6B625C] mt-1 text-right">
                {formData.message.length} / 5000
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#333333] mb-2">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your.email@example.com"
                required
                className="w-full px-4 py-3 border border-[#E9E5DF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F4C4B0] focus:border-transparent text-[#333333]"
              />
              <div className="text-xs text-[#6B625C] mt-1">
                We'll send a confirmation and updates to this email
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-[#333333] mb-2">
                Full Name (Optional)
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Your name"
                maxLength={255}
                className="w-full px-4 py-3 border border-[#E9E5DF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F4C4B0] focus:border-transparent text-[#333333]"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !formData.category || !formData.subject || !formData.message || !formData.email}
              className="w-full px-6 py-4 bg-[#F4C4B0] text-[#333333] rounded-xl font-semibold hover:bg-[#F4B69A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </form>
        </div>

        {/* Contact Info */}
        <div className="mt-6 text-center">
          <p className="text-sm text-[#6B625C] mb-2">
            Need immediate assistance?
          </p>
          <a
            href="mailto:support@muse.shopping"
            className="text-sm font-medium text-[#F4C4B0] hover:underline"
          >
            support@muse.shopping
          </a>
        </div>
      </div>
    </div>
  );
}
