'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import { getAllFeedback, getFeedbackStats } from '@/lib/api/feedback';

interface FeedbackStats {
  total_submissions: number;
  new_count: number;
  in_review_count: number;
  in_progress_count: number;
  resolved_count: number;
  closed_count: number;
  bug_count: number;
  feature_request_count: number;
  tech_help_count: number;
  complaint_count: number;
  question_count: number;
  urgent_count: number;
  high_count: number;
  avg_resolution_hours: number;
}

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
  created_at: string;
  response_count?: number;
}

export default function AdminFeedbackDashboard() {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    priority: ''
  });

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [feedbackData, statsData] = await Promise.all([
        getAllFeedback(filters),
        getFeedbackStats()
      ]);
      setFeedback(feedbackData);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load feedback');
    } finally {
      setLoading(false);
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

  return (
    <div className="min-h-screen bg-[#FEFDFB]">
      <PageHeader
        title="Feedback Management"
        showBack
        onBack={() => router.push('/admin')}
      />

      <div className="px-4 py-6 max-w-7xl mx-auto pb-24">
        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 border border-[#E9E5DF]">
              <div className="text-2xl font-bold text-[#333333]">{stats.total_submissions}</div>
              <div className="text-sm text-[#6B625C]">Total Submissions</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <div className="text-2xl font-bold text-blue-900">{stats.new_count}</div>
              <div className="text-sm text-blue-700">New</div>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
              <div className="text-2xl font-bold text-purple-900">{stats.in_progress_count}</div>
              <div className="text-sm text-purple-700">In Progress</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <div className="text-2xl font-bold text-green-900">{stats.resolved_count}</div>
              <div className="text-sm text-green-700">Resolved</div>
            </div>
          </div>
        )}

        {/* Category Breakdown */}
        {stats && (
          <div className="bg-white rounded-xl p-5 border border-[#E9E5DF] mb-6">
            <h3 className="font-semibold text-[#333333] mb-4">Category Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div className="text-center">
                <div className="text-2xl mb-1">🐛</div>
                <div className="font-semibold text-[#333333]">{stats.bug_count}</div>
                <div className="text-xs text-[#6B625C]">Bugs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">💡</div>
                <div className="font-semibold text-[#333333]">{stats.feature_request_count}</div>
                <div className="text-xs text-[#6B625C]">Features</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">🛠️</div>
                <div className="font-semibold text-[#333333]">{stats.tech_help_count}</div>
                <div className="text-xs text-[#6B625C]">Tech Help</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">😔</div>
                <div className="font-semibold text-[#333333]">{stats.complaint_count}</div>
                <div className="text-xs text-[#6B625C]">Complaints</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">❓</div>
                <div className="font-semibold text-[#333333]">{stats.question_count}</div>
                <div className="text-xs text-[#6B625C]">Questions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">⚠️</div>
                <div className="font-semibold text-[#333333]">{stats.urgent_count + stats.high_count}</div>
                <div className="text-xs text-[#6B625C]">High Priority</div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 border border-[#E9E5DF] mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#333333] mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-[#E9E5DF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F4C4B0] text-[#333333]"
              >
                <option value="">All Statuses</option>
                <option value="new">New</option>
                <option value="in_review">In Review</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#333333] mb-1">Category</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="w-full px-3 py-2 border border-[#E9E5DF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F4C4B0] text-[#333333]"
              >
                <option value="">All Categories</option>
                <option value="bug">🐛 Bug Report</option>
                <option value="feature_request">💡 Feature Request</option>
                <option value="tech_help">🛠️ Tech Help</option>
                <option value="complaint">😔 Complaint</option>
                <option value="question">❓ Question</option>
                <option value="other">💬 Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#333333] mb-1">Priority</label>
              <select
                value={filters.priority}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                className="w-full px-3 py-2 border border-[#E9E5DF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F4C4B0] text-[#333333]"
              >
                <option value="">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
        </div>

        {/* Feedback List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#F4C4B0]"></div>
            <div className="text-[#6B625C] mt-2">Loading feedback...</div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
            {error}
          </div>
        ) : feedback.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-[#E9E5DF]">
            <div className="text-4xl mb-3">📭</div>
            <div className="text-[#6B625C]">No feedback submissions found</div>
          </div>
        ) : (
          <div className="space-y-3">
            {feedback.map((item) => (
              <div
                key={item.id}
                onClick={() => router.push(`/admin/feedback/${item.ticket_number}`)}
                className="bg-white rounded-xl p-5 border border-[#E9E5DF] hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{categoryIcons[item.category]}</span>
                    <div>
                      <div className="font-mono text-sm font-semibold text-[#333333]">
                        {item.ticket_number}
                      </div>
                      <div className="text-xs text-[#6B625C]">
                        {categoryLabels[item.category]}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${statusColors[item.status]}`}>
                      {item.status.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${priorityColors[item.priority]}`}>
                      {item.priority}
                    </span>
                  </div>
                </div>

                <h3 className="font-semibold text-[#333333] mb-2">{item.subject}</h3>

                <p className="text-sm text-[#6B625C] mb-3 line-clamp-2">{item.message}</p>

                <div className="flex items-center justify-between text-xs text-[#6B625C]">
                  <div>
                    From: <span className="font-medium text-[#333333]">{item.full_name || 'Anonymous'}</span>
                    {' '}({item.email})
                  </div>
                  <div className="flex items-center gap-3">
                    {item.response_count !== undefined && item.response_count > 0 && (
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        {item.response_count}
                      </span>
                    )}
                    <span>{formatDate(item.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
