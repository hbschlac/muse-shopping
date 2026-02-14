/**
 * Admin Email Management - Client-Side JavaScript
 */

// Configuration
const API_BASE = '/api/v1';
let adminToken = localStorage.getItem('adminToken');
let adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');

// Check authentication
if (!adminToken) {
  window.location.href = '/api/v1/admin/email-ui/login';
}

// Set user name
document.getElementById('userName').textContent = adminUser.full_name || adminUser.email || 'Admin';

// Logout function
function logout() {
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminUser');
  window.location.href = '/api/v1/admin/email-ui/login';
}

// API helper
async function apiCall(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
      ...options.headers
    }
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      logout();
    }
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

// Tab switching - DO NOT redefine, use the inline version from HTML

// Update send type fields visibility based on selected radio button
function updateSendTypeFields() {
  const sendType = document.querySelector('input[name="sendType"]:checked')?.value;

  const singleUserFields = document.getElementById('singleUserFields');
  const bulkUserFields = document.getElementById('bulkUserFields');
  const criteriaFields = document.getElementById('criteriaFields');

  if (singleUserFields) singleUserFields.style.display = sendType === 'single' ? 'block' : 'none';
  if (bulkUserFields) bulkUserFields.style.display = sendType === 'bulk' ? 'block' : 'none';
  if (criteriaFields) criteriaFields.style.display = sendType === 'criteria' ? 'block' : 'none';
}

// Attach event listeners to radio buttons
function attachRadioListeners() {
  document.querySelectorAll('input[name="sendType"]').forEach(radio => {
    radio.addEventListener('change', updateSendTypeFields);
  });
}

// Attach event listeners to tab buttons
function attachTabListeners() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const button = e.currentTarget;
      const tabName = button.textContent.trim().toLowerCase().replace(' ', '-');

      // Map button text to tab names
      const tabMap = {
        'compose-email': 'compose',
        'email-history': 'history',
        'campaigns': 'campaigns'
      };

      const targetTab = tabMap[tabName] || tabName;

      // Use the inline switchTab function
      if (typeof switchTab === 'function') {
        switchTab(targetTab);
      }
    });
  });
}

// Attach event listener to account dropdown button
function attachAccountMenuListener() {
  const accountBtn = document.querySelector('.account-btn');
  if (accountBtn) {
    accountBtn.onclick = null; // Remove inline handler
    accountBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof toggleAccountMenu === 'function') {
        toggleAccountMenu();
      }
    });
  }
}

// Show alert
function showAlert(message, type = 'success') {
  const alertDiv = document.getElementById('composeAlert');
  alertDiv.className = `alert alert-${type}`;
  alertDiv.textContent = message;
  alertDiv.style.display = 'block';

  setTimeout(() => {
    alertDiv.style.display = 'none';
  }, 5000);
}

// Preview email
function previewEmail() {
  const heading = document.getElementById('heading').value;
  const body = document.getElementById('body').value;
  const buttonText = document.getElementById('buttonText').value;
  const buttonUrl = document.getElementById('buttonUrl').value;

  if (!heading || !body) {
    showAlert('Please fill in heading and body to preview', 'error');
    return;
  }

  const previewContent = document.getElementById('previewContent');
  let html = `
    <h2 style="color: var(--muse-dark); margin-top: 0;">${heading}</h2>
    <p>Hi {User Name},</p>
    ${body}
  `;

  if (buttonText && buttonUrl) {
    html += `
      <div style="text-align: center;">
        <a href="${buttonUrl}" class="btn-preview">${buttonText}</a>
      </div>
    `;
  }

  html += `
    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid var(--muse-taupe); font-size: 14px; color: var(--muse-brown);">
      <p>Shop all your favorites in one place,<br>The Muse Team</p>
    </div>
  `;

  previewContent.innerHTML = html;
  document.getElementById('previewContainer').style.display = 'block';

  // Scroll to preview
  document.getElementById('previewContainer').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Send email
async function sendEmail() {
  const sendType = document.querySelector('input[name="sendType"]:checked').value;
  const subject = document.getElementById('subject').value.trim();
  const heading = document.getElementById('heading').value.trim();
  const body = document.getElementById('body').value.trim();
  const emailType = document.getElementById('emailType').value;
  const buttonText = document.getElementById('buttonText').value.trim();
  const buttonUrl = document.getElementById('buttonUrl').value.trim();
  const preheader = document.getElementById('preheader').value.trim();

  // Validation
  if (!subject || !heading || !body) {
    showAlert('Please fill in all required fields', 'error');
    return;
  }

  let endpoint;
  let payload = {
    subject,
    heading,
    body,
    emailType,
    buttonText: buttonText || undefined,
    buttonUrl: buttonUrl || undefined,
    preheader: preheader || undefined
  };

  if (sendType === 'single') {
    const userId = document.getElementById('userId').value;
    if (!userId) {
      showAlert('Please enter a user ID', 'error');
      return;
    }
    endpoint = '/admin/emails/send';
    payload.userId = parseInt(userId);
  } else if (sendType === 'bulk') {
    const userIdsStr = document.getElementById('userIds').value.trim();
    if (!userIdsStr) {
      showAlert('Please enter user IDs', 'error');
      return;
    }
    const userIds = userIdsStr.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    if (userIds.length === 0) {
      showAlert('Please enter valid user IDs', 'error');
      return;
    }
    endpoint = '/admin/emails/send/bulk';
    payload.userIds = userIds;
  } else if (sendType === 'criteria') {
    const criteria = {};
    const minOrderValue = document.getElementById('minOrderValue').value;
    const maxOrderValue = document.getElementById('maxOrderValue').value;
    const signupAfter = document.getElementById('signupAfter').value;
    const signupBefore = document.getElementById('signupBefore').value;
    const brandIds = document.getElementById('brandIds').value.trim();

    if (minOrderValue) criteria.minOrderValue = parseFloat(minOrderValue);
    if (maxOrderValue) criteria.maxOrderValue = parseFloat(maxOrderValue);
    if (signupAfter) criteria.signupAfter = signupAfter;
    if (signupBefore) criteria.signupBefore = signupBefore;
    if (brandIds) {
      criteria.brandIds = brandIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    }

    if (Object.keys(criteria).length === 0) {
      showAlert('Please specify at least one targeting criterion', 'error');
      return;
    }

    endpoint = '/admin/emails/send/criteria';
    payload.criteria = criteria;
  }

  // Show loading
  const sendBtn = document.getElementById('sendBtn');
  const originalText = sendBtn.textContent;
  sendBtn.disabled = true;
  sendBtn.textContent = 'Sending...';
  document.getElementById('loadingOverlay').classList.add('show');

  try {
    const result = await apiCall(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    document.getElementById('loadingOverlay').classList.remove('show');
    sendBtn.disabled = false;
    sendBtn.textContent = originalText;

    if (result.success) {
      const data = result.data;
      let message = '';

      if (sendType === 'single') {
        message = `Email sent successfully to ${data.email}!`;
      } else {
        message = `Campaign sent! ${data.sent || 0} emails sent successfully`;
        if (data.failed > 0) {
          message += `, ${data.failed} failed`;
        }
      }

      showAlert(message, 'success');

      // Clear form
      if (confirm('Email sent! Do you want to clear the form?')) {
        clearForm();
      }
    }
  } catch (error) {
    document.getElementById('loadingOverlay').classList.remove('show');
    sendBtn.disabled = false;
    sendBtn.textContent = originalText;
    showAlert(error.message, 'error');
  }
}

// Clear form
function clearForm() {
  document.getElementById('userId').value = '';
  document.getElementById('userIds').value = '';
  document.getElementById('subject').value = '';
  document.getElementById('preheader').value = '';
  document.getElementById('heading').value = '';
  document.getElementById('body').value = '';
  document.getElementById('buttonText').value = '';
  document.getElementById('buttonUrl').value = '';
  document.getElementById('minOrderValue').value = '';
  document.getElementById('maxOrderValue').value = '';
  document.getElementById('signupAfter').value = '';
  document.getElementById('signupBefore').value = '';
  document.getElementById('brandIds').value = '';
  document.getElementById('previewContainer').style.display = 'none';
}

// Load email history
async function loadHistory() {
  const status = document.getElementById('statusFilter').value;
  const tbody = document.getElementById('historyTable');
  tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Loading...</td></tr>';

  try {
    const params = new URLSearchParams({ limit: 50 });
    if (status) params.append('status', status);

    const result = await apiCall(`/admin/emails/history?${params.toString()}`);
    const history = result.data || [];

    if (history.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--muse-brown);">No emails found</td></tr>';
      return;
    }

    tbody.innerHTML = history.map(email => `
      <tr>
        <td>${new Date(email.sent_at).toLocaleString()}</td>
        <td>
          ${email.email || 'N/A'}<br>
          <small style="color: var(--muse-brown);">User ID: ${email.user_id}</small>
        </td>
        <td>${email.subject}</td>
        <td><span class="badge badge-${email.email_type}">${email.email_type}</span></td>
        <td><span class="badge badge-${email.status === 'sent' ? 'success' : 'error'}">${email.status}</span></td>
      </tr>
    `).join('');

    // Update stats
    const totalSent = history.length;
    const totalSuccess = history.filter(e => e.status === 'sent').length;
    const totalFailed = history.filter(e => e.status === 'failed').length;

    document.getElementById('totalSent').textContent = totalSent;
    document.getElementById('totalSuccess').textContent = totalSuccess;
    document.getElementById('totalFailed').textContent = totalFailed;
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--danger);">Error: ${error.message}</td></tr>`;
  }
}

// Load bulk campaigns
async function loadCampaigns() {
  const tbody = document.getElementById('campaignsTable');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Loading...</td></tr>';

  try {
    const result = await apiCall('/admin/emails/history/bulk?limit=50');
    const campaigns = result.data || [];

    if (campaigns.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--muse-brown);">No campaigns found</td></tr>';
      return;
    }

    tbody.innerHTML = campaigns.map(campaign => {
      const completed = campaign.completed_at;
      const status = completed ? 'Completed' : 'In Progress';

      return `
        <tr>
          <td>${new Date(campaign.created_at).toLocaleString()}</td>
          <td>${campaign.subject}</td>
          <td>${campaign.total_recipients}</td>
          <td>${campaign.emails_sent || 0}</td>
          <td>${campaign.emails_failed || 0}</td>
          <td><span class="badge badge-${completed ? 'success' : 'marketing'}">${status}</span></td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--danger);">Error: ${error.message}</td></tr>`;
  }
}

// Confirmation Modal Functions
function confirmSendEmail() {
  // Gather email info for confirmation
  const sendType = document.querySelector('input[name="sendType"]:checked').value;
  const subject = document.getElementById('subject').value.trim();
  const scheduledFor = document.getElementById('scheduledFor').value;

  // Validation
  if (!subject || !document.getElementById('heading').value.trim() || !document.getElementById('body').value.trim()) {
    showAlert('Please fill in all required fields', 'error');
    return;
  }

  let recipientInfo = '';
  if (sendType === 'single') {
    const userId = document.getElementById('userId').value;
    if (!userId) {
      showAlert('Please enter a user ID', 'error');
      return;
    }
    recipientInfo = `<strong>Recipient:</strong> User ID ${userId}`;
  } else if (sendType === 'bulk') {
    const userIdsStr = document.getElementById('userIds').value.trim();
    if (!userIdsStr) {
      showAlert('Please enter user IDs', 'error');
      return;
    }
    const userIds = userIdsStr.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    if (userIds.length === 0) {
      showAlert('Please enter valid user IDs', 'error');
      return;
    }
    recipientInfo = `<strong>Recipients:</strong> ${userIds.length} users`;
  } else if (sendType === 'criteria') {
    const criteria = {};
    const minOrderValue = document.getElementById('minOrderValue').value;
    const maxOrderValue = document.getElementById('maxOrderValue').value;
    const signupAfter = document.getElementById('signupAfter').value;
    const signupBefore = document.getElementById('signupBefore').value;
    const brandIds = document.getElementById('brandIds').value.trim();

    if (minOrderValue) criteria.minOrderValue = parseFloat(minOrderValue);
    if (maxOrderValue) criteria.maxOrderValue = parseFloat(maxOrderValue);
    if (signupAfter) criteria.signupAfter = signupAfter;
    if (signupBefore) criteria.signupBefore = signupBefore;
    if (brandIds) {
      criteria.brandIds = brandIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    }

    if (Object.keys(criteria).length === 0) {
      showAlert('Please specify at least one targeting criterion', 'error');
      return;
    }

    const criteriaList = [];
    if (criteria.minOrderValue) criteriaList.push(`Min spent: $${criteria.minOrderValue}`);
    if (criteria.maxOrderValue) criteriaList.push(`Max spent: $${criteria.maxOrderValue}`);
    if (criteria.signupAfter) criteriaList.push(`Signed up after: ${criteria.signupAfter}`);
    if (criteria.signupBefore) criteriaList.push(`Signed up before: ${criteria.signupBefore}`);
    if (criteria.brandIds) criteriaList.push(`Brand IDs: ${criteria.brandIds.join(', ')}`);

    recipientInfo = `<strong>Target Criteria:</strong><br>${criteriaList.join('<br>')}`;
  }

  // Build confirmation message
  const schedulingInfo = scheduledFor
    ? `<br><br><strong>⏰ Scheduled for:</strong> ${new Date(scheduledFor).toLocaleString()}`
    : `<br><br><strong>⏰ Send timing:</strong> Immediately`;

  const confirmMessage = `
    <p><strong>Subject:</strong> ${subject}</p>
    <p>${recipientInfo}</p>
    ${schedulingInfo}
    <br>
    <p style="color: var(--muse-brown); font-size: 14px;">Are you sure you want to ${scheduledFor ? 'schedule' : 'send'} this email?</p>
  `;

  document.getElementById('confirmMessage').innerHTML = confirmMessage;
  document.getElementById('confirmModal').style.display = 'flex';
}

function closeConfirmModal() {
  document.getElementById('confirmModal').style.display = 'none';
}

async function executeEmailSend() {
  // Close modal and call sendEmail
  closeConfirmModal();
  await sendEmail();
}

// Update sendEmail to include scheduling
async function sendEmail() {
  const sendType = document.querySelector('input[name="sendType"]:checked').value;
  const subject = document.getElementById('subject').value.trim();
  const heading = document.getElementById('heading').value.trim();
  const body = document.getElementById('body').value.trim();
  const emailType = document.getElementById('emailType').value;
  const buttonText = document.getElementById('buttonText').value.trim();
  const buttonUrl = document.getElementById('buttonUrl').value.trim();
  const preheader = document.getElementById('preheader').value.trim();
  const scheduledFor = document.getElementById('scheduledFor').value;

  // Validation
  if (!subject || !heading || !body) {
    showAlert('Please fill in all required fields', 'error');
    return;
  }

  let endpoint;
  let payload = {
    subject,
    heading,
    body,
    emailType,
    buttonText: buttonText || undefined,
    buttonUrl: buttonUrl || undefined,
    preheader: preheader || undefined,
    scheduledFor: scheduledFor || undefined
  };

  if (sendType === 'single') {
    const userId = document.getElementById('userId').value;
    if (!userId) {
      showAlert('Please enter a user ID', 'error');
      return;
    }
    endpoint = '/admin/emails/send';
    payload.userId = parseInt(userId);
  } else if (sendType === 'bulk') {
    const userIdsStr = document.getElementById('userIds').value.trim();
    if (!userIdsStr) {
      showAlert('Please enter user IDs', 'error');
      return;
    }
    const userIds = userIdsStr.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    if (userIds.length === 0) {
      showAlert('Please enter valid user IDs', 'error');
      return;
    }
    endpoint = '/admin/emails/send/bulk';
    payload.userIds = userIds;
  } else if (sendType === 'criteria') {
    const criteria = {};
    const minOrderValue = document.getElementById('minOrderValue').value;
    const maxOrderValue = document.getElementById('maxOrderValue').value;
    const signupAfter = document.getElementById('signupAfter').value;
    const signupBefore = document.getElementById('signupBefore').value;
    const brandIds = document.getElementById('brandIds').value.trim();

    if (minOrderValue) criteria.minOrderValue = parseFloat(minOrderValue);
    if (maxOrderValue) criteria.maxOrderValue = parseFloat(maxOrderValue);
    if (signupAfter) criteria.signupAfter = signupAfter;
    if (signupBefore) criteria.signupBefore = signupBefore;
    if (brandIds) {
      criteria.brandIds = brandIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    }

    if (Object.keys(criteria).length === 0) {
      showAlert('Please specify at least one targeting criterion', 'error');
      return;
    }

    endpoint = '/admin/emails/send/criteria';
    payload.criteria = criteria;
  }

  // Show loading
  const sendBtn = document.getElementById('sendBtn');
  const originalText = sendBtn.textContent;
  sendBtn.disabled = true;
  sendBtn.textContent = scheduledFor ? 'Scheduling...' : 'Sending...';
  document.getElementById('loadingOverlay').classList.add('show');

  try {
    const result = await apiCall(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    document.getElementById('loadingOverlay').classList.remove('show');
    sendBtn.disabled = false;
    sendBtn.textContent = originalText;

    if (result.success) {
      const data = result.data;
      let message = '';

      if (scheduledFor) {
        message = `Email scheduled successfully for ${new Date(scheduledFor).toLocaleString()}!`;
      } else if (sendType === 'single') {
        message = `Email sent successfully to ${data.email}!`;
      } else {
        message = `Campaign sent! ${data.sent || 0} emails sent successfully`;
        if (data.failed > 0) {
          message += `, ${data.failed} failed`;
        }
      }

      showAlert(message, 'success');

      // Clear form
      document.getElementById('subject').value = '';
      document.getElementById('heading').value = '';
      document.getElementById('body').value = '';
      document.getElementById('buttonText').value = '';
      document.getElementById('buttonUrl').value = '';
      document.getElementById('preheader').value = '';
      document.getElementById('scheduledFor').value = '';

      // Reload history
      loadHistory();
    }
  } catch (error) {
    document.getElementById('loadingOverlay').classList.remove('show');
    sendBtn.disabled = false;
    sendBtn.textContent = originalText;
    showAlert(error.message || 'Failed to send email', 'error');
  }
}

// Initialize function
function initializeApp() {
  // Attach all event listeners
  attachRadioListeners();
  attachTabListeners();
  attachAccountMenuListener();

  // Attach button event listeners
  const previewBtn = document.getElementById('previewBtn');
  if (previewBtn) {
    previewBtn.addEventListener('click', previewEmail);
  }

  const sendBtn = document.getElementById('sendBtn');
  if (sendBtn) {
    sendBtn.addEventListener('click', confirmSendEmail);
  }

  // Load initial data
  loadHistory();
}

// Initialize - handle both cases: DOM already loaded or still loading
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  // DOM already loaded (script loaded late)
  initializeApp();
}
