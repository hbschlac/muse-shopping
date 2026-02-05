const API_BASE = '/api/v1';

const state = {
  itemId: null
};

function getQueryParam(key) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key);
}

function formatPrice(value, currency = 'USD') {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(Number(value));
}

function safeText(value, fallback = '—') {
  return value && String(value).trim().length > 0 ? value : fallback;
}

function setStatus(message) {
  document.getElementById('status').textContent = message;
}

function renderPdp(data) {
  const { item, similar_items: similarItems } = data;

  document.getElementById('itemTitle').textContent = safeText(item.canonical_name);
  document.getElementById('itemDesc').textContent = safeText(item.description, 'No description yet.');

  const bestPrice = item.best_price || {};
  document.getElementById('price').textContent = formatPrice(bestPrice.price);
  const stockStatus = document.getElementById('stockStatus');
  stockStatus.textContent = bestPrice.price ? 'In Stock' : 'Limited';

  const hero = document.getElementById('heroImage');
  hero.src = item.primary_image_url || '/muse-icon.png';
  hero.alt = item.canonical_name || 'Item image';

  const thumbs = document.getElementById('thumbs');
  thumbs.innerHTML = '';
  const additional = Array.isArray(item.additional_images) ? item.additional_images.slice(0, 3) : [];
  additional.forEach((url) => {
    const img = document.createElement('img');
    img.src = url;
    img.alt = 'Additional product view';
    thumbs.appendChild(img);
  });

  const listingContainer = document.getElementById('listings');
  listingContainer.innerHTML = '';
  (item.listings || []).forEach((listing) => {
    const row = document.createElement('div');
    row.className = 'listing-row';

    const left = document.createElement('div');
    left.innerHTML = `
      <div><strong>${safeText(listing.retailer_name)}</strong></div>
      <div class="listing-meta">Sizes: ${safeText(listing.sizes_available, 'Varies')}</div>
      <div class="listing-meta">Colors: ${safeText(listing.colors_available, 'Varies')}</div>
    `;

    const right = document.createElement('div');
    const displayPrice = listing.sale_price || listing.price;
    right.innerHTML = `
      <div><strong>${formatPrice(displayPrice, listing.currency || 'USD')}</strong></div>
      <div class="listing-meta">${listing.in_stock ? 'In stock' : 'Out of stock'}</div>
    `;

    row.appendChild(left);
    row.appendChild(right);
    listingContainer.appendChild(row);
  });

  const similarContainer = document.getElementById('similarItems');
  similarContainer.innerHTML = '';
  (similarItems || []).forEach((similar) => {
    const card = document.createElement('div');
    card.className = 'similar-card';

    const img = document.createElement('img');
    img.src = similar.primary_image_url || '/muse-icon.png';
    img.alt = similar.canonical_name || 'Similar item';

    const info = document.createElement('div');
    info.innerHTML = `
      <div><strong>${safeText(similar.canonical_name)}</strong></div>
      <div class="listing-meta">${safeText(similar.brand_name)}</div>
      <div class="listing-meta">${formatPrice(similar.min_price || similar.price)}</div>
    `;

    card.appendChild(img);
    card.appendChild(info);
    similarContainer.appendChild(card);
  });

  const infoGrid = document.getElementById('productInfoGrid');
  if (infoGrid) {
    infoGrid.innerHTML = '';
    (similarItems || []).slice(0, 4).forEach((similar) => {
      const card = document.createElement('div');
      card.className = 'info-card-item';

      const img = document.createElement('img');
      img.src = similar.primary_image_url || '/muse-icon.png';
      img.alt = similar.canonical_name || 'Product image';

      const name = document.createElement('div');
      name.innerHTML = `<strong>${safeText(similar.canonical_name)}</strong>`;

      const price = document.createElement('div');
      price.textContent = formatPrice(similar.min_price || similar.price);

      card.appendChild(img);
      card.appendChild(name);
      card.appendChild(price);
      infoGrid.appendChild(card);
    });
  }
}

async function loadPdp() {
  const itemId = getQueryParam('itemId') || getQueryParam('id');
  if (!itemId) {
    setStatus('Add ?itemId= to the URL to load a product.');
    return;
  }

  state.itemId = itemId;
  setStatus('Loading item details…');

  try {
    const [pdpResponse, reviewsResponse] = await Promise.all([
      fetch(`${API_BASE}/items/${itemId}/pdp`),
      fetch(`${API_BASE}/items/${itemId}/reviews?limit=2&sort_by=helpful`)
    ]);

    if (!pdpResponse.ok) {
      throw new Error('Failed to load item');
    }

    const pdpPayload = await pdpResponse.json();
    renderPdp(pdpPayload.data);

    if (reviewsResponse.ok) {
      const reviewsPayload = await reviewsResponse.json();
      renderReviews(reviewsPayload.data);
    }

    setStatus('Updated just now');
  } catch (error) {
    setStatus('Unable to load this item right now.');
  }
}

function renderReviews(data) {
  if (!data || !data.summary) return;

  const summary = data.summary;
  document.getElementById('summaryRating').textContent = summary.rating.toFixed(1);
  document.getElementById('summaryCount').textContent = summary.total_reviews;
  document.getElementById('ratingValue').textContent = summary.rating.toFixed(1);
  document.getElementById('ratingCount').textContent = summary.total_reviews;

  const breakdown = summary.breakdown || {};
  const setBar = (id, value) => {
    const el = document.getElementById(id);
    if (el) {
      el.style.width = `${Math.round((value || 0) * 100)}%`;
    }
  };
  setBar('bar5', breakdown[5]);
  setBar('bar4', breakdown[4]);
  setBar('bar3', breakdown[3]);
  setBar('bar2', breakdown[2]);
  setBar('bar1', breakdown[1]);

  const sourceWrap = document.getElementById('reviewSources');
  sourceWrap.innerHTML = '';
  (summary.sources || []).forEach(source => {
    if (!source || source === 'muse') return;
    const badge = document.createElement('span');
    badge.className = 'source-badge';
    badge.textContent = formatRetailer(source);
    sourceWrap.appendChild(badge);
  });

  const list = document.getElementById('reviewList');
  list.innerHTML = '';
  (data.items || []).forEach((review, index) => {
    const card = document.createElement('div');
    card.className = 'review-card';

    const initials = review.reviewer_name
      ? review.reviewer_name.split(' ').map(part => part[0]).join('').slice(0, 2)
      : 'MU';

    const createdAt = review.created_at ? new Date(review.created_at) : null;
    const relative = createdAt ? formatRelative(createdAt) : safeText(review.created_at_relative, '');

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
      ${index === 0 ? `
        <div class="review-actions">
          <button class="chip" type="button" data-helpful="${review.id}">Helpful</button>
          <span class="helpful-count">${review.helpful_count || 0}</span>
          <span class="review-source">${sourceLabel ? `Source: ${sourceLabel}` : ''}</span>
          <a class="subtle-link" href="/reviews.html?itemId=${state.itemId}">See all reviews →</a>
          <button class="chip" type="button" data-report="${review.id}">Report</button>
        </div>
      ` : `
        <div class="review-source">${sourceLabel ? `Source: ${sourceLabel}` : ''}</div>
      `}
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
  return value
    .replace(/_/g, ' ')
    .replace(/^\w/, c => c.toUpperCase());
}

document.addEventListener('DOMContentLoaded', loadPdp);

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
        setStatus('Unable to submit review.');
        return;
      }

      reviewModal.classList.remove('active');
      reviewModal.setAttribute('aria-hidden', 'true');
      reviewForm.reset();
      loadPdp();
    } catch (error) {
      setStatus('Unable to submit review.');
    }
  });
}
