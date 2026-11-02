// Product feature switches. Flip a flag to bring a feature back; its code stays in place.

// Chat with Muse is turned off (Nov 2026). The backend /api/v1/chat routes and the
// chat UI in app/chat/ChatView.tsx are kept. Set to true to restore the nav tab,
// the home feed "Talk with Muse" bar, and the /chat page.
export const CHAT_ENABLED = false;
