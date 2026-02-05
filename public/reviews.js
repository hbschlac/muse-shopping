const API_BASE = '/api/v1';

const state = {
  itemId: null,
  offset: 0,
  limit: 6,
  hasMore: true,
  sortBy: 'newest'
};

function getQueryParam(key) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key);
}

function safeText(value, fallback = '—') {
  return value && String(value).trim().length > 0 ? value : fallback;
}

function formatRelative(date) {
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Today';
  if (days === 1) return '1d ago';
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

function formatRetailer(value) {
  if (!value) return '';
  return value.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
}

function renderSources(sources = []) {
  const wrap = document.getElementById('reviewSources');
  wrap.innerHTML = '';
  sources.forEach(source => {
    if (!source || source === 'muse') return;
    const badge = document.createElement('span');
    badge.className = 'source-badge';
    badge.textContent = formatRetailer(source);
    wrap.appendChild(badge);
  });
}

function renderReviews(items = []) {
  const list = document.getElementById('reviewList');
  items.forEach((review) => {
    const card = document.createElement('div');
    card.className = 'review-card';

    const initials = review.reviewer_name
      ? review.reviewer_name.split(' ').map(part => part[0]).join('').slice(0, 2)
      : 'MU';

    const createdAt = review.created_at ? new Date(review.created_at) : null;
    const relative = createdAt ? formatRelative(createdAt) : '';
    const sourceLabel = review.source_retailer && review.source_retailer !== 'muse'
      ? `${formatRetailer(review.source_retailer)}${review.verified_purchase ? ' · Verified' : ''}`
      : '';

    card.innerHTML = `
      <div class="review-header">
        <div class="avatar">${initials}</div>
        <div>
          <div class="reviewer">${safeText(review.reviewer_name)}</div>
          <div class="stars small">★★★★★</div>
        </div>
        <div class="review-time">${relative}</div>
      </div>
      <div class="review-title">${safeText(review.title)}</div>
      <p>${safeText(review.body)}</p>
      <div class="review-actions">
        <button class="chip" type="button" data-helpful="${review.id}">Helpful</button>
        <span class="helpful-count">${review.helpful_count || 0}</span>
        <span class="review-source">${sourceLabel ? `Source: ${sourceLabel}` : ''}</span>
        <button class="chip" type="button" data-report="${review.id}">Report</button>
      </div>
    `;

    list.appendChild(card);
  });

  list.querySelectorAll('[data-helpful]').forEach(button => {
    button.addEventListener('click', async (event) => {
      const reviewId = event.currentTarget.getAttribute('data-helpful');
      if (!state.itemId) return;
      try {
        const response = await fetch(`${API_BASE}/items/${state.itemId}/reviews/${reviewId}/helpful`, {
          method: 'POST'
        });
        if (!response.ok) return;
        const payload = await response.json();
        const countEl = event.currentTarget.parentElement.querySelector('.helpful-count');
        if (countEl && payload.data && payload.data.helpful_count !== undefined) {
          countEl.textContent = payload.data.helpful_count;
        }
      } catch (error) {
        return;
      }
    });
  });

  list.querySelectorAll('[data-report]').forEach(button => {
    button.addEventListener('click', async (event) => {
      const reviewId = event.currentTarget.getAttribute('data-report');
      if (!state.itemId) return;
      try {
        const response = await fetch(`${API_BASE}/items/${state.itemId}/reviews/${reviewId}/report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'inappropriate' })
        });
        if (response.ok) {
          event.currentTarget.textContent = 'Reported';
          event.currentTarget.disabled = true;
        }
      } catch (error) {
        return;
      }
    });
  });
}

async function loadReviews() {
  if (!state.hasMore) return;
  const response = await fetch(`${API_BASE}/items/${state.itemId}/reviews?limit=${state.limit}&offset=${state.offset}&sort_by=${state.sortBy}`);
  if (!response.ok) return;
  const payload = await response.json();
  const data = payload.data;
  renderSources(data.summary.sources || []);
  renderReviews(data.items || []);
  state.offset += data.items.length;
  state.hasMore = data.pagination.has_more;
  document.getElementById('loadMoreBtn').style.display = state.hasMore ? 'block' : 'none';
}

document.addEventListener('DOMContentLoaded', () => {
  state.itemId = getQueryParam('itemId');
  if (!state.itemId) return;
  loadReviews();
  document.getElementById('loadMoreBtn').addEventListener('click', loadReviews);
  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', (event) => {
      state.sortBy = event.target.value;
      state.offset = 0;
      state.hasMore = true;
      document.getElementById('reviewList').innerHTML = '';
      loadReviews();
    });
  }
});

const reviewModal = document.getElementById('reviewModal');
const openModalBtn = document.getElementById('openReviewModal');
const closeModalBtn = document.getElementById('closeReviewModal');
const reviewForm = document.getElementById('reviewForm');

if (openModalBtn && closeModalBtn && reviewModal) {
  openModalBtn.addEventListener('click', () => {
    reviewModal.classList.add('active');
    reviewModal.setAttribute('aria-hidden', 'false');
  });

  closeModalBtn.addEventListener('click', () => {
    reviewModal.classList.remove('active');
    reviewModal.setAttribute('aria-hidden', 'true');
  });

  reviewModal.addEventListener('click', (event) => {
    if (event.target === reviewModal) {
      reviewModal.classList.remove('active');
      reviewModal.setAttribute('aria-hidden', 'true');
    }
  });
}

if (reviewForm) {
  reviewForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!state.itemId) return;

    const formData = new FormData(reviewForm);
    const payload = {
      rating: formData.get('rating'),
      title: formData.get('title'),
      body: formData.get('body'),
      reviewer_name: formData.get('reviewer_name')
    };

    try {
      const response = await fetch(`${API_BASE}/items/${state.itemId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        return;
      }

      reviewModal.classList.remove('active');
      reviewModal.setAttribute('aria-hidden', 'true');
      reviewForm.reset();
      state.offset = 0;
      state.hasMore = true;
      document.getElementById('reviewList').innerHTML = '';
      loadReviews();
    } catch (error) {
      return;
    }
  });
}
