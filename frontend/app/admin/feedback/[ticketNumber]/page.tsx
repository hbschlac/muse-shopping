'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import {
  getFeedbackByTicket,
  updateFeedback,
  addFeedbackResponse
} from '@/lib/api/feedback';

interface Feedback {
  id: number;
  ticket_number: string;
  email: string;
  full_name?: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  admin_notes?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  user_agent?: string;
}

interface FeedbackResponse {
  id: number;
  admin_name?: string;
  message: string;
  is_public: boolean;
  created_at: string;
}

export default function AdminTicketDetailPage() {
  const router = useRouter();
  const params = useParams();
  const ticketNumber = params.ticketNumber as string;

  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [responses, setResponses] = useState<FeedbackResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

  // Form states
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [responseMessage, setResponseMessage] = useState('');
  const [isPublicResponse, setIsPublicResponse] = useState(true);

  useEffect(() => {
    loadTicket();
  }, [ticketNumber]);

  const loadTicket = async () => {
    setLoading(true);
    try {
      const data = await getFeedbackByTicket(ticketNumber);
      setFeedback(data.feedback);
      setResponses(data.responses);
      setStatus(data.feedback.status);
      setPriority(data.feedback.priority);
      setAdminNotes(data.feedback.admin_notes || '');
      setResolutionNotes(data.feedback.resolution_notes || '');
    } catch (err: any) {
      setError(err.message || 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTicket = async () => {
    if (!feedback) return;

    setUpdating(true);
    try {
      await updateFeedback(ticketNumber, {
        status,
        priority,
        adminNotes,
        resolutionNotes
      });
      await loadTicket();
      alert('Ticket updated successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to update ticket');
    } finally {
      setUpdating(false);
    }
  };

  const handleAddResponse = async () => {
    if (!responseMessage.trim()) {
      alert('Please enter a response message');
      return;
    }

    setUpdating(true);
    try {
      await addFeedbackResponse(ticketNumber, {
        message: responseMessage,
        isPublic: isPublicResponse
      });
      setResponseMessage('');
      await loadTicket();
      alert('Response added successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to add response');
    } finally {
      setUpdating(false);
    }
  };

  const categoryIcons: { [key: string]: string } = {
    bug: '🐛',
    feature_request: '💡',
    tech_help: '🛠️',
    complaint: '😔',
    question: '❓',
    other: '💬'
  };

  const categoryLabels: { [key: string]: string } = {
    bug: 'Bug Report',
    feature_request: 'Feature Request',
    tech_help: 'Tech Help',
    complaint: 'Complaint',
    question: 'Question',
    other: 'Other'
  };

  const statusColors: { [key: string]: string } = {
    new: 'bg-blue-100 text-blue-800',
    in_review: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-purple-100 text-purple-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-800'
  };

  const priorityColors: { [key: string]: string } = {
    low: 'bg-gray-100 text-gray-700',
    medium: 'bg-blue-100 text-blue-700',
    high: 'bg-orange-100 text-orange-700',
    urgent: 'bg-red-100 text-red-700'
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FEFDFB] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#F4C4B0]"></div>
          <div className="text-[#6B625C] mt-2">Loading ticket...</div>
        </div>
      </div>
    );
  }

  if (error || !feedback) {
    return (
      <div className="min-h-screen bg-[#FEFDFB]">
        <PageHeader title="Ticket Not Found" showBack onBack={() => router.push('/admin/feedback')} />
        <div className="px-4 py-12 text-center">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl inline-block">
            {error || 'Ticket not found'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FEFDFB]">
      <PageHeader
        title={`Ticket ${ticketNumber}`}
        showBack
        onBack={() => router.push('/admin/feedback')}
      />

      <div className="px-4 py-6 max-w-4xl mx-auto pb-24 space-y-6">
        {/* Ticket Header */}
        <div className="bg-white rounded-xl p-6 border border-[#E9E5DF]">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{categoryIcons[feedback.category]}</span>
              <div>
                <div className="font-mono text-lg font-semibold text-[#333333]">
                  {feedback.ticket_number}
                </div>
                <div className="text-sm text-[#6B625C]">
                  {categoryLabels[feedback.category]}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <span className={`px-3 py-1 rounded-lg text-sm font-medium ${statusColors[feedback.status]}`}>
                {feedback.status.replace('_', ' ')}
              </span>
              <span className={`px-3 py-1 rounded-lg text-sm font-medium ${priorityColors[feedback.priority]}`}>
                {feedback.priority}
              </span>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-[#333333] mb-4">{feedback.subject}</h2>

          <div className="bg-[#FEFDFB] border border-[#E9E5DF] rounded-lg p-4 mb-4">
            <div className="whitespace-pre-wrap text-[#333333]">{feedback.message}</div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-[#6B625C] mb-1">From</div>
              <div className="font-medium text-[#333333]">
                {feedback.full_name || 'Anonymous'}
              </div>
              <div className="text-[#6B625C]">{feedback.email}</div>
            </div>
            <div>
              <div className="text-[#6B625C] mb-1">Submitted</div>
              <div className="font-medium text-[#333333]">
                {formatDate(feedback.created_at)}
              </div>
            </div>
          </div>

          {feedback.user_agent && (
            <div className="mt-4 pt-4 border-t border-[#E9E5DF]">
              <div className="text-xs text-[#6B625C]">User Agent</div>
              <div className="text-xs text-[#6B625C] font-mono">{feedback.user_agent}</div>
            </div>
          )}
        </div>

        {/* Update Ticket Status */}
        <div className="bg-white rounded-xl p-6 border border-[#E9E5DF]">
          <h3 className="font-semibold text-[#333333] mb-4">Update Ticket</h3>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-[#333333] mb-2">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-[#E9E5DF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F4C4B0] text-[#333333]"
              >
                <option value="new">New</option>
                <option value="in_review">In Review</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#333333] mb-2">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 border border-[#E9E5DF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F4C4B0] text-[#333333]"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-[#333333] mb-2">Admin Notes (Internal)</label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Internal notes visible only to admins..."
              rows={3}
              className="w-full px-3 py-2 border border-[#E9E5DF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F4C4B0] text-[#333333] resize-none"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-[#333333] mb-2">Resolution Notes</label>
            <textarea
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="How was this issue resolved..."
              rows={3}
              className="w-full px-3 py-2 border border-[#E9E5DF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F4C4B0] text-[#333333] resize-none"
            />
          </div>

          <button
            onClick={handleUpdateTicket}
            disabled={updating}
            className="w-full px-4 py-3 bg-[#F4C4B0] text-[#333333] rounded-lg font-semibold hover:bg-[#F4B69A] transition-colors disabled:opacity-50"
          >
            {updating ? 'Updating...' : 'Update Ticket'}
          </button>
        </div>

        {/* Add Response */}
        <div className="bg-white rounded-xl p-6 border border-[#E9E5DF]">
          <h3 className="font-semibold text-[#333333] mb-4">Add Response</h3>

          <textarea
            value={responseMessage}
            onChange={(e) => setResponseMessage(e.target.value)}
            placeholder="Write your response to the user..."
            rows={4}
            className="w-full px-3 py-2 border border-[#E9E5DF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F4C4B0] text-[#333333] resize-none mb-3"
          />

          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              id="isPublic"
              checked={isPublicResponse}
              onChange={(e) => setIsPublicResponse(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="isPublic" className="text-sm text-[#333333]">
              Make this response visible to the user
            </label>
          </div>

          <button
            onClick={handleAddResponse}
            disabled={updating || !responseMessage.trim()}
            className="w-full px-4 py-3 bg-[#F4C4B0] text-[#333333] rounded-lg font-semibold hover:bg-[#F4B69A] transition-colors disabled:opacity-50"
          >
            {updating ? 'Adding...' : 'Add Response'}
          </button>
        </div>

        {/* Responses List */}
        {responses.length > 0 && (
          <div className="bg-white rounded-xl p-6 border border-[#E9E5DF]">
            <h3 className="font-semibold text-[#333333] mb-4">
              Responses ({responses.length})
            </h3>

            <div className="space-y-4">
              {responses.map((response) => (
                <div
                  key={response.id}
                  className={`p-4 rounded-lg border ${
                    response.is_public
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-medium text-[#333333]">
                      {response.admin_name || 'Admin'}
                    </div>
                    <div className="flex items-center gap-2">
                      {response.is_public ? (
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                          Public
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                          Internal
                        </span>
                      )}
                      <span className="text-xs text-[#6B625C]">
                        {formatDate(response.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="whitespace-pre-wrap text-sm text-[#333333]">
                    {response.message}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
