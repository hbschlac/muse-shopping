(() => {
  const apiBase = document.body.dataset.apiBase || '/api/v1';
  const chatBody = document.getElementById('chatBody');
  const composerInput = document.getElementById('composerInput');
  const sendBtn = document.getElementById('sendBtn');
  const quickReplies = document.getElementById('quickReplies');
  const typingRow = document.getElementById('typingRow');
  const carouselCard = document.getElementById('carouselCard');
  const carouselTrack = document.getElementById('carouselTrack');
  const carouselTitle = document.getElementById('carouselTitle');
  const toneButtons = Array.from(document.querySelectorAll('.tone-btn'));
  const profileAvatar = document.getElementById('profileAvatar');
  const profileMeta = document.getElementById('profileMeta');
  const profileTags = document.getElementById('profileTags');

  const defaultProfile = {
    initials: 'HS',
    summary: 'Soft neutrals · Feminine classics · Under $150',
    tags: ['size M', 'warm palette', 'weekend/casual']
  };

  const uuid =
    (window.crypto && window.crypto.randomUUID && window.crypto.randomUUID()) ||
    `shopper_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

  const state = {
    tone: localStorage.getItem('muse.chat.tone') || 'editorial',
    shopperId: localStorage.getItem('muse.chat.shopperId') || uuid,
    profile: loadProfile(),
    history: [],
    sessionId: null
  };

  localStorage.setItem('muse.chat.shopperId', state.shopperId);

  function loadProfile() {
    const stored = localStorage.getItem('muse.chat.profile');
    if (!stored) {
      localStorage.setItem('muse.chat.profile', JSON.stringify(defaultProfile));
      return defaultProfile;
    }
    try {
      return JSON.parse(stored);
    } catch (error) {
      return defaultProfile;
    }
  }

  function renderProfile() {
    profileAvatar.textContent = state.profile.initials || 'MU';
    profileMeta.textContent = state.profile.summary || defaultProfile.summary;
    profileTags.innerHTML = '';
    (state.profile.tags || defaultProfile.tags).forEach((tag) => {
      const span = document.createElement('span');
      span.className = 'tag';
      span.textContent = tag;
      profileTags.appendChild(span);
    });
  }

  function setTone(tone) {
    state.tone = tone;
    localStorage.setItem('muse.chat.tone', tone);
    toneButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tone === tone);
      btn.setAttribute('aria-selected', btn.dataset.tone === tone ? 'true' : 'false');
    });
  }

  function appendMessage(role, text) {
    const row = document.createElement('section');
    row.className = `message-row${role === 'user' ? ' user' : ''}`;

    if (role !== 'user') {
      const avatar = document.createElement('div');
      avatar.className = 'avatar';
      avatar.textContent = 'm';
      row.appendChild(avatar);
    }

    const bubble = document.createElement('div');
    bubble.className = `bubble ${role === 'user' ? 'user' : 'assistant'}`;
    bubble.textContent = text;
    row.appendChild(bubble);

    if (role === 'user') {
      const chevron = document.createElement('span');
      chevron.className = 'chevron';
      chevron.textContent = '›';
      bubble.appendChild(chevron);
    }

    chatBody.insertBefore(row, typingRow);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function renderFollowups(followups = []) {
    if (!quickReplies) return;
    quickReplies.innerHTML = '';
    if (followups.length === 0) {
      quickReplies.classList.add('is-hidden');
      return;
    }
    quickReplies.classList.remove('is-hidden');
    followups.slice(0, 2).forEach((text) => {
      const btn = document.createElement('button');
      btn.className = 'chip';
      btn.type = 'button';
      btn.textContent = text;
      btn.addEventListener('click', () => sendMessage(text));
      quickReplies.appendChild(btn);
    });
  }

  function renderItems(items = []) {
    if (!carouselCard || !carouselTrack) return;
    if (items.length === 0) {
      carouselCard.classList.add('is-hidden');
      return;
    }
    carouselCard.classList.remove('is-hidden');
    carouselTrack.innerHTML = '';
    items.slice(0, 3).forEach((item) => {
      const card = document.createElement('article');
      card.className = 'product-card';

      const photo = document.createElement('div');
      photo.className = 'product-photo';
      if (item.primary_image_url || item.image_url) {
        photo.style.backgroundImage = `url(${item.primary_image_url || item.image_url})`;
        photo.style.backgroundSize = 'cover';
        photo.style.backgroundPosition = 'center';
      }

      const heart = document.createElement('button');
      heart.className = 'heart';
      heart.type = 'button';
      heart.textContent = '♡';

      const name = document.createElement('div');
      name.className = 'product-name';
      name.textContent = item.canonical_name || item.name || 'Recommended item';

      const price = document.createElement('div');
      price.className = 'price';
      const rawPrice = item.sale_price || item.min_price || item.price_cents || item.price;
      price.textContent = formatPrice(rawPrice);

      card.appendChild(photo);
      card.appendChild(heart);
      card.appendChild(name);
      card.appendChild(price);
      carouselTrack.appendChild(card);
    });
  }

  function formatPrice(value) {
    if (!value || Number.isNaN(Number(value))) return '$—';
    const number = Number(value);
    const dollars = number > 1000 ? Math.round(number / 100) : Math.round(number);
    return `$${dollars}`;
  }

  function showTyping(show) {
    if (!typingRow) return;
    typingRow.classList.toggle('is-hidden', !show);
  }

  async function sendMessage(messageText) {
    const trimmed = String(messageText || '').trim();
    if (!trimmed) return;

    appendMessage('user', trimmed);
    composerInput.value = '';
    showTyping(true);

    state.history.push({ role: 'user', content: trimmed });

    try {
      const response = await fetch(`${apiBase}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: state.history.slice(-8),
          session_id: state.sessionId,
          context: {
            tone: state.tone,
            shopper_id: state.shopperId,
            shopper_profile: state.profile,
            recommendation_mode: 'personalized'
          }
        })
      });

      const payload = await response.json();
      const data = payload.data || payload;

      showTyping(false);

      if (!response.ok || !data.message) {
        appendMessage('assistant', 'I hit a snag. Want to try that again?');
        return;
      }

      state.sessionId = data.session_id || state.sessionId;
      state.history.push({ role: 'assistant', content: data.message });

      appendMessage('assistant', data.message);
      renderFollowups(data.followups || []);
      renderItems(data.items || []);
    } catch (error) {
      showTyping(false);
      appendMessage('assistant', 'I hit a network issue. Want to try that again?');
    }
  }

  toneButtons.forEach((btn) => {
    btn.addEventListener('click', () => setTone(btn.dataset.tone));
  });

  if (quickReplies) {
    quickReplies.querySelectorAll('.chip').forEach((chip) => {
      chip.addEventListener('click', () => sendMessage(chip.textContent));
    });
  }

  sendBtn.addEventListener('click', () => sendMessage(composerInput.value));
  composerInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      sendMessage(composerInput.value);
    }
  });

  setTone(state.tone);
  renderProfile();
  showTyping(false);
})();
